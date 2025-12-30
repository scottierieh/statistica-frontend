import { NextRequest, NextResponse } from 'next/server';

// Types
interface EOQInput {
    sku: string;
    sku_name?: string | null;
    annual_demand: number;
    ordering_cost: number;
    holding_cost: number | null;
    unit_cost: number;
    current_order_qty?: number | null;
    lead_time_days?: number | null;
    demand_std?: number | null;
}

interface Settings {
    service_level: number;
    holding_cost_type: 'percentage' | 'absolute';
    default_holding_pct: number;
}

// Z-score for service levels
const getZScore = (serviceLevel: number): number => {
    const zScores: Record<number, number> = {
        0.90: 1.28,
        0.91: 1.34,
        0.92: 1.41,
        0.93: 1.48,
        0.94: 1.55,
        0.95: 1.645,
        0.96: 1.75,
        0.97: 1.88,
        0.98: 2.05,
        0.99: 2.33,
        0.999: 3.09,
    };
    
    // Find closest match
    const levels = Object.keys(zScores).map(Number).sort((a, b) => a - b);
    let closest = levels[0];
    for (const level of levels) {
        if (Math.abs(level - serviceLevel) < Math.abs(closest - serviceLevel)) {
            closest = level;
        }
    }
    return zScores[closest] || 1.645;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { data, settings }: { data: EOQInput[]; settings: Settings } = body;

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'No data provided' }, { status: 400 });
        }

        const zScore = getZScore(settings.service_level);
        
        // Process each SKU
        const eoqResults = data.map(item => {
            // Calculate holding cost
            let holdingCost: number;
            if (item.holding_cost !== null && item.holding_cost !== undefined) {
                holdingCost = settings.holding_cost_type === 'percentage' 
                    ? item.holding_cost * item.unit_cost / 100
                    : item.holding_cost;
            } else {
                holdingCost = item.unit_cost * settings.default_holding_pct;
            }

            // EOQ Formula: sqrt(2 * D * S / H)
            const D = item.annual_demand;
            const S = item.ordering_cost;
            const H = holdingCost;

            if (D <= 0 || S <= 0 || H <= 0) {
                return null;
            }

            const eoq = Math.sqrt((2 * D * S) / H);
            const ordersPerYear = D / eoq;
            const orderCycleDays = 365 / ordersPerYear;

            // Cost calculations with EOQ
            const totalOrderingCost = ordersPerYear * S;
            const totalHoldingCost = (eoq / 2) * H;
            const totalCost = totalOrderingCost + totalHoldingCost;

            // Current cost if provided
            let currentTotalCost: number | undefined;
            let savings: number | undefined;
            let savingsPct: number | undefined;

            if (item.current_order_qty && item.current_order_qty > 0) {
                const currentOrdersPerYear = D / item.current_order_qty;
                const currentOrderingCost = currentOrdersPerYear * S;
                const currentHoldingCost = (item.current_order_qty / 2) * H;
                currentTotalCost = currentOrderingCost + currentHoldingCost;
                savings = currentTotalCost - totalCost;
                savingsPct = (savings / currentTotalCost) * 100;
            }

            return {
                sku: item.sku,
                sku_name: item.sku_name,
                annual_demand: D,
                ordering_cost: S,
                holding_cost: H,
                unit_cost: item.unit_cost,
                eoq: eoq,
                orders_per_year: ordersPerYear,
                order_cycle_days: orderCycleDays,
                total_ordering_cost: totalOrderingCost,
                total_holding_cost: totalHoldingCost,
                total_cost: totalCost,
                current_order_qty: item.current_order_qty,
                current_total_cost: currentTotalCost,
                savings: savings,
                savings_pct: savingsPct,
            };
        }).filter(r => r !== null);

        // Safety Stock calculations
        const safetyStockResults = data
            .filter(item => item.lead_time_days && item.lead_time_days > 0)
            .map(item => {
                const dailyDemand = item.annual_demand / 365;
                const demandStd = item.demand_std || dailyDemand * 0.2; // Default 20% CV
                const leadTime = item.lead_time_days!;
                
                // Safety Stock = Z * σ_d * √LT
                const safetyStock = zScore * demandStd * Math.sqrt(leadTime);
                const reorderPoint = (dailyDemand * leadTime) + safetyStock;

                return {
                    sku: item.sku,
                    avg_demand: dailyDemand,
                    std_demand: demandStd,
                    lead_time_days: leadTime,
                    service_level: settings.service_level * 100,
                    safety_stock: safetyStock,
                    reorder_point: reorderPoint,
                };
            });

        // ABC Classification
        const totalValue = data.reduce((sum, item) => sum + (item.annual_demand * item.unit_cost), 0);
        const sortedByValue = [...data]
            .map(item => ({
                sku: item.sku,
                sku_name: item.sku_name,
                annual_value: item.annual_demand * item.unit_cost,
            }))
            .sort((a, b) => b.annual_value - a.annual_value);

        let cumulative = 0;
        const abcClassification = sortedByValue.map(item => {
            cumulative += item.annual_value;
            const cumulativePct = (cumulative / totalValue) * 100;
            let abcClass: 'A' | 'B' | 'C';
            if (cumulativePct <= 80) {
                abcClass = 'A';
            } else if (cumulativePct <= 95) {
                abcClass = 'B';
            } else {
                abcClass = 'C';
            }
            return {
                ...item,
                cumulative_pct: cumulativePct,
                abc_class: abcClass,
            };
        });

        // Summary calculations
        const totalCurrentCost = eoqResults.reduce((sum, r) => sum + (r?.current_total_cost || r?.total_cost || 0), 0);
        const totalOptimalCost = eoqResults.reduce((sum, r) => sum + (r?.total_cost || 0), 0);
        const totalSavings = totalCurrentCost - totalOptimalCost;
        const avgOrderCycle = eoqResults.reduce((sum, r) => sum + (r?.order_cycle_days || 0), 0) / eoqResults.length;

        // Cost breakdown for chart
        const totalOrderingCurrent = eoqResults.reduce((sum, r) => {
            if (r?.current_order_qty && r?.annual_demand) {
                return sum + ((r.annual_demand / r.current_order_qty) * r.ordering_cost);
            }
            return sum + (r?.total_ordering_cost || 0);
        }, 0);
        
        const totalHoldingCurrent = eoqResults.reduce((sum, r) => {
            if (r?.current_order_qty) {
                return sum + ((r.current_order_qty / 2) * r.holding_cost);
            }
            return sum + (r?.total_holding_cost || 0);
        }, 0);

        const costBreakdown = [
            {
                category: 'Ordering Cost',
                current: totalOrderingCurrent,
                optimal: eoqResults.reduce((sum, r) => sum + (r?.total_ordering_cost || 0), 0),
            },
            {
                category: 'Holding Cost',
                current: totalHoldingCurrent,
                optimal: eoqResults.reduce((sum, r) => sum + (r?.total_holding_cost || 0), 0),
            },
        ];

        // Generate insights
        const insights: string[] = [];
        
        if (totalSavings > 0) {
            insights.push(`**Total potential savings**: ${formatCurrency(totalSavings)} (${((totalSavings / totalCurrentCost) * 100).toFixed(1)}% reduction) by adopting EOQ.`);
        }

        const topSavers = eoqResults
            .filter(r => r?.savings && r.savings > 0)
            .sort((a, b) => (b?.savings || 0) - (a?.savings || 0))
            .slice(0, 3);
        
        if (topSavers.length > 0) {
            insights.push(`**Top savings opportunities**: ${topSavers.map(r => `${r?.sku} (${formatCurrency(r?.savings || 0)})`).join(', ')}.`);
        }

        const classACounts = abcClassification.filter(i => i.abc_class === 'A').length;
        const classAValue = abcClassification.filter(i => i.abc_class === 'A').reduce((sum, i) => sum + i.annual_value, 0);
        insights.push(`**ABC Analysis**: ${classACounts} A-class items (${((classACounts / data.length) * 100).toFixed(0)}% of SKUs) represent ${((classAValue / totalValue) * 100).toFixed(0)}% of annual value.`);

        if (avgOrderCycle > 0) {
            insights.push(`**Average order cycle**: ${avgOrderCycle.toFixed(0)} days. Consider consolidating orders for items with similar cycles.`);
        }

        if (safetyStockResults.length > 0) {
            const avgSafetyStock = safetyStockResults.reduce((sum, r) => sum + r.safety_stock, 0) / safetyStockResults.length;
            insights.push(`**Safety stock**: Average of ${avgSafetyStock.toFixed(0)} units at ${(settings.service_level * 100).toFixed(0)}% service level.`);
        }

        const summary = {
            total_skus: eoqResults.length,
            total_annual_demand_value: totalValue,
            total_current_cost: totalCurrentCost,
            total_optimal_cost: totalOptimalCost,
            total_savings: totalSavings,
            total_savings_pct: totalCurrentCost > 0 ? (totalSavings / totalCurrentCost) * 100 : 0,
            avg_order_cycle: avgOrderCycle,
        };

        return NextResponse.json({
            success: true,
            results: {
                summary,
                eoq_results: eoqResults,
                safety_stock: safetyStockResults.length > 0 ? safetyStockResults : undefined,
                abc_classification: abcClassification,
                cost_breakdown: costBreakdown,
                insights,
            }
        });

    } catch (error: any) {
        console.error('EOQ Optimization error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

function formatCurrency(value: number): string {
    if (value >= 1000000000) return `₩${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `₩${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₩${(value / 1000).toFixed(1)}K`;
    return `₩${value.toFixed(0)}`;
}


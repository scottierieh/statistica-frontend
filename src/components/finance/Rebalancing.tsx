'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
    Scale, Info, TrendingUp, TrendingDown, ArrowRight, ArrowLeftRight,
    Target, Settings2, DollarSign, Percent, RefreshCw, Download,
    CheckCircle2, AlertTriangle, MinusCircle, PlusCircle
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, Cell, PieChart, Pie, ComposedChart, Line, ReferenceLine
} from 'recharts';
import type { FinanceConfig, FinanceResults, SectorAllocation, PortfolioHolding } from './FinanceLayout';

interface RebalancingProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPercent = (value: number, showSign: boolean = false): string => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
};

// Colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface TargetAllocation {
    sector: string;
    currentWeight: number;
    targetWeight: number;
    currentValue: number;
    targetValue: number;
    difference: number;
    differenceValue: number;
    action: 'buy' | 'sell' | 'hold';
}

interface TradeOrder {
    ticker: string;
    name: string;
    sector: string;
    action: 'buy' | 'sell';
    shares: number;
    value: number;
    currentShares: number;
    targetShares: number;
}

// Rebalancing Strategy Options
const strategies = [
    { id: 'equal', name: 'Equal Weight', description: 'Allocate equally across all sectors' },
    { id: 'market-cap', name: 'Market Cap Weight', description: 'Weight by current market value' },
    { id: 'custom', name: 'Custom', description: 'Set your own target weights' },
];

// Calculate Target Allocations
const calculateTargetAllocations = (
    sectorAllocation: SectorAllocation[], 
    totalValue: number, 
    strategy: string,
    customTargets: Record<string, number>
): TargetAllocation[] => {
    const numSectors = sectorAllocation.length;
    
    return sectorAllocation.map(sector => {
        let targetWeight: number;
        
        switch (strategy) {
            case 'equal':
                targetWeight = 100 / numSectors;
                break;
            case 'market-cap':
                targetWeight = sector.weight; // Keep current
                break;
            case 'custom':
                targetWeight = customTargets[sector.sector] ?? sector.weight;
                break;
            default:
                targetWeight = sector.weight;
        }
        
        const targetValue = (targetWeight / 100) * totalValue;
        const difference = targetWeight - sector.weight;
        const differenceValue = targetValue - sector.value;
        
        let action: 'buy' | 'sell' | 'hold' = 'hold';
        if (difference > 0.5) action = 'buy';
        else if (difference < -0.5) action = 'sell';
        
        return {
            sector: sector.sector,
            currentWeight: sector.weight,
            targetWeight,
            currentValue: sector.value,
            targetValue,
            difference,
            differenceValue,
            action,
        };
    });
};

// Generate Trade Orders
const generateTradeOrders = (
    holdings: PortfolioHolding[],
    targetAllocations: TargetAllocation[],
    totalValue: number
): TradeOrder[] => {
    const orders: TradeOrder[] = [];
    
    // Group holdings by sector
    const holdingsBySector: Record<string, PortfolioHolding[]> = {};
    holdings.forEach(h => {
        if (!holdingsBySector[h.sector]) holdingsBySector[h.sector] = [];
        holdingsBySector[h.sector].push(h);
    });
    
    targetAllocations.forEach(target => {
        if (target.action === 'hold') return;
        
        const sectorHoldings = holdingsBySector[target.sector] || [];
        const valueChange = target.differenceValue;
        
        // Distribute the change proportionally among holdings in the sector
        sectorHoldings.forEach(holding => {
            const holdingProportion = holding.marketValue / target.currentValue;
            const holdingValueChange = valueChange * holdingProportion;
            const shareChange = Math.round(holdingValueChange / holding.currentPrice);
            
            if (Math.abs(shareChange) > 0) {
                orders.push({
                    ticker: holding.ticker,
                    name: holding.name,
                    sector: holding.sector,
                    action: shareChange > 0 ? 'buy' : 'sell',
                    shares: Math.abs(shareChange),
                    value: Math.abs(shareChange * holding.currentPrice),
                    currentShares: holding.shares,
                    targetShares: holding.shares + shareChange,
                });
            }
        });
    });
    
    return orders.sort((a, b) => b.value - a.value);
};

// Allocation Comparison Chart
const AllocationComparisonChart = ({ data }: { data: TargetAllocation[] }) => {
    const chartData = data.map(d => ({
        sector: d.sector.length > 10 ? d.sector.substring(0, 10) + '...' : d.sector,
        current: d.currentWeight,
        target: d.targetWeight,
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} fontSize={10} />
                <YAxis type="category" dataKey="sector" fontSize={11} width={75} tick={{ fill: '#374151' }} />
                <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="current" name="Current" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" name="Target" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// Drift Chart
const DriftChart = ({ data }: { data: TargetAllocation[] }) => {
    const chartData = data
        .map(d => ({
            sector: d.sector.length > 8 ? d.sector.substring(0, 8) + '...' : d.sector,
            drift: d.difference,
        }))
        .sort((a, b) => b.drift - a.drift);

    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="sector" fontSize={10} tick={{ fill: '#6b7280' }} angle={-45} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`} fontSize={10} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                    formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, 'Drift']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="drift" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.drift >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Trade Orders Table
const TradeOrdersTable = ({ orders }: { orders: TradeOrder[] }) => {
    if (orders.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">Portfolio is balanced</p>
                <p className="text-sm">No trades required</p>
            </div>
        );
    }

    const totalBuys = orders.filter(o => o.action === 'buy').reduce((sum, o) => sum + o.value, 0);
    const totalSells = orders.filter(o => o.action === 'sell').reduce((sum, o) => sum + o.value, 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                        <PlusCircle className="h-5 w-5" />
                        <span className="font-semibold">Total Buys</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalBuys)}</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                        <MinusCircle className="h-5 w-5" />
                        <span className="font-semibold">Total Sells</span>
                    </div>
                    <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalSells)}</p>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-2 font-semibold text-gray-600">Action</th>
                            <th className="text-left py-3 px-2 font-semibold text-gray-600">Ticker</th>
                            <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                            <th className="text-left py-3 px-2 font-semibold text-gray-600">Sector</th>
                            <th className="text-right py-3 px-2 font-semibold text-gray-600">Shares</th>
                            <th className="text-right py-3 px-2 font-semibold text-gray-600">Value</th>
                            <th className="text-right py-3 px-2 font-semibold text-gray-600">Current → Target</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, idx) => (
                            <tr key={`${order.ticker}-${idx}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-3 px-2">
                                    <Badge variant={order.action === 'buy' ? 'default' : 'destructive'} className={order.action === 'buy' ? 'bg-green-600' : ''}>
                                        {order.action.toUpperCase()}
                                    </Badge>
                                </td>
                                <td className="py-3 px-2 font-medium">{order.ticker}</td>
                                <td className="py-3 px-2 text-gray-600 truncate max-w-[120px]">{order.name}</td>
                                <td className="py-3 px-2 text-gray-500">{order.sector}</td>
                                <td className="py-3 px-2 text-right font-medium">{order.shares}</td>
                                <td className="py-3 px-2 text-right font-medium">{formatCurrency(order.value)}</td>
                                <td className="py-3 px-2 text-right">
                                    <span className="text-gray-400">{order.currentShares}</span>
                                    <ArrowRight className="h-3 w-3 inline mx-1 text-gray-400" />
                                    <span className={order.action === 'buy' ? 'text-green-600' : 'text-red-600'}>{order.targetShares}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Custom Weight Editor
const CustomWeightEditor = ({ 
    sectors, 
    customTargets, 
    setCustomTargets 
}: { 
    sectors: SectorAllocation[]; 
    customTargets: Record<string, number>;
    setCustomTargets: (targets: Record<string, number>) => void;
}) => {
    const totalWeight = Object.values(customTargets).reduce((sum, w) => sum + w, 0);
    const isValid = Math.abs(totalWeight - 100) < 0.1;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Adjust target weights (must sum to 100%)</p>
                <Badge variant={isValid ? 'default' : 'destructive'}>
                    Total: {totalWeight.toFixed(1)}%
                </Badge>
            </div>
            <div className="space-y-3">
                {sectors.map(sector => (
                    <div key={sector.sector} className="flex items-center gap-4">
                        <span className="w-40 text-sm font-medium truncate">{sector.sector}</span>
                        <Slider
                            value={[customTargets[sector.sector] ?? sector.weight]}
                            onValueChange={(value) => setCustomTargets({ ...customTargets, [sector.sector]: value[0] })}
                            max={50}
                            step={0.5}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            value={customTargets[sector.sector]?.toFixed(1) ?? sector.weight.toFixed(1)}
                            onChange={(e) => setCustomTargets({ ...customTargets, [sector.sector]: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-right"
                            step={0.5}
                        />
                        <span className="text-sm text-gray-400">%</span>
                    </div>
                ))}
            </div>
            {!isValid && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Weights must sum to 100%. Current total: {totalWeight.toFixed(1)}%
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default function Rebalancing({ config, analysisResult }: RebalancingProps) {
    const [strategy, setStrategy] = useState('equal');
    const [customTargets, setCustomTargets] = useState<Record<string, number>>({});
    const [threshold, setThreshold] = useState(5); // Rebalance if drift > threshold

    // Initialize custom targets from current allocation
    useMemo(() => {
        if (analysisResult?.portfolio?.sectorAllocation) {
            const initial: Record<string, number> = {};
            analysisResult.portfolio.sectorAllocation.forEach(s => {
                initial[s.sector] = s.weight;
            });
            setCustomTargets(initial);
        }
    }, [analysisResult?.portfolio?.sectorAllocation]);

    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Rebalancing</h2>
                    <p className="text-gray-500 mt-1">Portfolio rebalancing recommendations and trade generation</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Portfolio Data</AlertTitle>
                    <AlertDescription>
                        Please load portfolio data and run analysis in the Data Settings page first.
                        Use the "Sample Portfolio Holdings" dataset to get started.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { holdings, summary, sectorAllocation } = analysisResult.portfolio;
    
    const targetAllocations = calculateTargetAllocations(
        sectorAllocation, 
        summary.totalValue, 
        strategy,
        customTargets
    );
    
    const tradeOrders = generateTradeOrders(holdings, targetAllocations, summary.totalValue);
    
    const maxDrift = Math.max(...targetAllocations.map(t => Math.abs(t.difference)));
    const needsRebalancing = maxDrift > threshold;
    const sectorsOutOfBalance = targetAllocations.filter(t => Math.abs(t.difference) > threshold).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Rebalancing</h2>
                    <p className="text-gray-500 mt-1">Portfolio rebalancing recommendations and trade generation</p>
                </div>
                <Badge variant={needsRebalancing ? 'destructive' : 'default'} className={!needsRebalancing ? 'bg-green-600' : ''}>
                    {needsRebalancing ? `${sectorsOutOfBalance} sectors need rebalancing` : 'Portfolio balanced'}
                </Badge>
            </div>

            {/* Strategy Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-gray-500" />
                        Rebalancing Strategy
                    </CardTitle>
                    <CardDescription>Select your target allocation strategy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        {strategies.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setStrategy(s.id)}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    strategy === s.id 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {strategy === s.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    <span className="font-semibold">{s.name}</span>
                                </div>
                                <p className="text-sm text-gray-500">{s.description}</p>
                            </button>
                        ))}
                    </div>

                    {strategy === 'custom' && (
                        <>
                            <Separator />
                            <CustomWeightEditor 
                                sectors={sectorAllocation}
                                customTargets={customTargets}
                                setCustomTargets={setCustomTargets}
                            />
                        </>
                    )}

                    <Separator />

                    <div className="flex items-center gap-4">
                        <Label className="whitespace-nowrap">Rebalance Threshold:</Label>
                        <Slider
                            value={[threshold]}
                            onValueChange={(value) => setThreshold(value[0])}
                            max={20}
                            min={1}
                            step={1}
                            className="flex-1 max-w-xs"
                        />
                        <span className="text-sm font-medium w-12">{threshold}%</span>
                        <p className="text-sm text-gray-500">Rebalance if sector drifts more than {threshold}%</p>
                    </div>
                </CardContent>
            </Card>

            {/* Current vs Target Allocation */}
            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5 text-gray-500" />
                            Current vs Target
                        </CardTitle>
                        <CardDescription>Comparison of current and target allocations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AllocationComparisonChart data={targetAllocations} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-gray-500" />
                            Allocation Drift
                        </CardTitle>
                        <CardDescription>Deviation from target weights</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DriftChart data={targetAllocations} />
                    </CardContent>
                </Card>
            </div>

            {/* Rebalancing Summary Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Rebalancing Summary</CardTitle>
                    <CardDescription>Required adjustments by sector</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Sector</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Current Wt</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Target Wt</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Drift</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Current Value</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Target Value</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Adjustment</th>
                                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targetAllocations.map((row, idx) => (
                                    <tr key={row.sector} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="py-3 px-2 font-medium">{row.sector}</td>
                                        <td className="py-3 px-2 text-right">{formatPercent(row.currentWeight)}</td>
                                        <td className="py-3 px-2 text-right">{formatPercent(row.targetWeight)}</td>
                                        <td className={`py-3 px-2 text-right font-medium ${
                                            Math.abs(row.difference) > threshold 
                                                ? row.difference > 0 ? 'text-green-600' : 'text-red-600'
                                                : 'text-gray-500'
                                        }`}>
                                            {formatPercent(row.difference, true)}
                                        </td>
                                        <td className="py-3 px-2 text-right">{formatCurrency(row.currentValue)}</td>
                                        <td className="py-3 px-2 text-right">{formatCurrency(row.targetValue)}</td>
                                        <td className={`py-3 px-2 text-right font-medium ${
                                            row.differenceValue > 0 ? 'text-green-600' : row.differenceValue < 0 ? 'text-red-600' : ''
                                        }`}>
                                            {formatCurrency(row.differenceValue)}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            {row.action === 'hold' ? (
                                                <Badge variant="secondary">Hold</Badge>
                                            ) : row.action === 'buy' ? (
                                                <Badge className="bg-green-600">Buy</Badge>
                                            ) : (
                                                <Badge variant="destructive">Sell</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Trade Orders */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-gray-500" />
                        Generated Trade Orders
                    </CardTitle>
                    <CardDescription>Specific trades to execute the rebalancing</CardDescription>
                </CardHeader>
                <CardContent>
                    <TradeOrdersTable orders={tradeOrders} />
                </CardContent>
            </Card>

            {/* Export Actions */}
            {tradeOrders.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold">Export Trade Orders</h4>
                                <p className="text-sm text-gray-500">Download trade list for execution</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                                <Button>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Execute Rebalance
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
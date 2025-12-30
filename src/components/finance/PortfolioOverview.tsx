'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    Briefcase, TrendingUp, TrendingDown, DollarSign, PieChart,
    BarChart3, AlertTriangle, ArrowUpRight, ArrowDownRight,
    ChevronDown, ChevronUp, Search, Filter, Download,
    Info, Target, Layers, Activity, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { cn } from "@/lib/utils";

// ============================================
// INTERFACES (matching Python backend)
// ============================================

interface PortfolioHolding {
    id: string;
    ticker: string;
    name: string;
    sector: string;
    asset_class: string;
    shares: number;
    avg_cost: number;
    current_price: number;
    market_value: number;
    cost_basis: number;
    unrealized_gain: number;
    unrealized_gain_pct: number;
    weight: number;
    daily_change: number;
    daily_change_pct: number;
}

interface PortfolioSummary {
    total_value: number;
    total_cost: number;
    total_gain: number;
    total_gain_pct: number;
    daily_change: number;
    daily_change_pct: number;
    num_holdings: number;
    num_sectors: number;
    top_holding: { ticker: string; weight: number };
    top_gainer: { ticker: string; gain_pct: number };
    top_loser: { ticker: string; gain_pct: number };
    avg_holding_size: number;
    largest_position: number;
    smallest_position: number;
}

interface SectorAllocation {
    sector: string;
    value: number;
    cost: number;
    weight: number;
    holding_count: number;
    gain: number;
    gain_pct: number;
    holdings: string[];
}

interface ConcentrationMetrics {
    herfindahl_index: number;
    top5_weight: number;
    top10_weight: number;
    effective_num_holdings: number;
    max_weight: number;
    min_weight: number;
    weight_std_dev: number;
}

interface GainLossBreakdown {
    total_gainers: number;
    total_losers: number;
    total_unchanged: number;
    gainers_value: number;
    losers_value: number;
    gainers_gain: number;
    losers_loss: number;
    avg_gainer_return: number;
    avg_loser_return: number;
    win_rate: number;
}

interface PortfolioOverviewResult {
    timestamp: string;
    data_points: number;
    holdings: PortfolioHolding[];
    summary: PortfolioSummary;
    sector_allocation: SectorAllocation[];
    concentration: ConcentrationMetrics;
    gain_loss: GainLossBreakdown;
    warnings: string[];
}

interface PortfolioOverviewProps {
    config: {
        data: any[];
        numericHeaders: string[];
        allHeaders: string[];
        dateColumn: string;
        priceColumn: string;
        volumeColumn: string;
        returnsColumn: string;
        benchmarkColumn: string;
        riskFreeRate: string;
        // Portfolio columns
        tickerColumn: string;
        nameColumn: string;
        sectorColumn: string;
        assetClassColumn: string;
        sharesColumn: string;
        avgCostColumn: string;
        currentPriceColumn: string;
        dailyChangeColumn: string;
    };
    analysisResult: any;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatPercent(value: number, decimals: number = 2): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

function formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortfolioOverview({ config, analysisResult }: PortfolioOverviewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<string>('weight');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedSector, setSelectedSector] = useState<string>('all');
    const [activeTab, setActiveTab] = useState('overview');
    const [portfolioData, setPortfolioData] = useState<PortfolioOverviewResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Call API to calculate portfolio overview
    useEffect(() => {
        if (!config.data || config.data.length === 0) {
            setPortfolioData(null);
            return;
        }

        // Check required columns are mapped
        if (!config.tickerColumn || !config.sharesColumn || !config.avgCostColumn || !config.currentPriceColumn) {
            setError('Please map required columns in Settings (Ticker, Shares, Avg Cost, Current Price)');
            return;
        }

        const calculatePortfolio = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/finance/portfolio-overview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: config.data,
                        columns: {
                            ticker: config.tickerColumn,
                            name: config.nameColumn,
                            sector: config.sectorColumn,
                            asset_class: config.assetClassColumn,
                            shares: config.sharesColumn,
                            avg_cost: config.avgCostColumn,
                            current_price: config.currentPriceColumn,
                            daily_change: config.dailyChangeColumn,
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to calculate portfolio overview');
                }

                const result = await response.json();
                setPortfolioData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        calculatePortfolio();
    }, [
        config.data, 
        config.tickerColumn,
        config.nameColumn,
        config.sectorColumn,
        config.assetClassColumn,
        config.sharesColumn,
        config.avgCostColumn,
        config.currentPriceColumn,
        config.dailyChangeColumn
    ]);

    // Filter and sort holdings
    const filteredHoldings = useMemo(() => {
        if (!portfolioData) return [];

        let filtered = [...portfolioData.holdings];

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(h =>
                h.ticker.toLowerCase().includes(term) ||
                h.name.toLowerCase().includes(term) ||
                h.sector.toLowerCase().includes(term)
            );
        }

        // Filter by sector
        if (selectedSector !== 'all') {
            filtered = filtered.filter(h => h.sector === selectedSector);
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortColumn) {
                case 'ticker':
                    comparison = a.ticker.localeCompare(b.ticker);
                    break;
                case 'weight':
                    comparison = a.weight - b.weight;
                    break;
                case 'value':
                    comparison = a.market_value - b.market_value;
                    break;
                case 'gain':
                    comparison = a.unrealized_gain - b.unrealized_gain;
                    break;
                case 'gain_pct':
                    comparison = a.unrealized_gain_pct - b.unrealized_gain_pct;
                    break;
                case 'daily_change':
                    comparison = a.daily_change_pct - b.daily_change_pct;
                    break;
                default:
                    comparison = 0;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });

        return filtered;
    }, [portfolioData, searchTerm, selectedSector, sortColumn, sortDirection]);

    // Handle sort
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    // No data state
    if (!config.data || config.data.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                        <p className="text-gray-500">Complete view of your portfolio holdings and performance</p>
                    </div>
                </div>

                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Data Available</AlertTitle>
                    <AlertDescription>
                        Please upload portfolio data in the Settings page and map the required columns:
                        Ticker/Symbol, Shares/Quantity, Average Cost, and Current Price.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Missing column mapping state
    if (!config.tickerColumn || !config.sharesColumn || !config.avgCostColumn || !config.currentPriceColumn) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                        <p className="text-gray-500">Complete view of your portfolio holdings and performance</p>
                    </div>
                </div>

                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Column Mapping Required</AlertTitle>
                    <AlertDescription>
                        Please go to Settings and map the required portfolio columns:
                        <ul className="list-disc list-inside mt-2">
                            <li className={config.tickerColumn ? "text-green-600" : ""}>
                                Ticker / Symbol {config.tickerColumn && "✓"}
                            </li>
                            <li className={config.sharesColumn ? "text-green-600" : ""}>
                                Shares / Quantity {config.sharesColumn && "✓"}
                            </li>
                            <li className={config.avgCostColumn ? "text-green-600" : ""}>
                                Average Cost {config.avgCostColumn && "✓"}
                            </li>
                            <li className={config.currentPriceColumn ? "text-green-600" : ""}>
                                Current Price {config.currentPriceColumn && "✓"}
                            </li>
                        </ul>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                        <p className="text-gray-500">Calculating portfolio metrics...</p>
                    </div>
                </div>
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    // Error state
    if (error || !portfolioData || portfolioData.holdings.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                        <p className="text-gray-500">Complete view of your portfolio holdings and performance</p>
                    </div>
                </div>

                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Unable to Parse Data</AlertTitle>
                    <AlertDescription>
                        {error || 'Could not detect required columns.'} Please ensure your data has columns for:
                        ticker/symbol, shares/quantity, average cost, and current price.
                        {portfolioData?.warnings.map((w, i) => (
                            <div key={i} className="mt-1 text-sm">{w}</div>
                        ))}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { summary, sector_allocation, concentration, gain_loss, warnings } = portfolioData;

    // Prepare chart data
    const sectorChartData = sector_allocation.map((s, i) => ({
        name: s.sector,
        value: s.value,
        weight: s.weight,
        color: COLORS[i % COLORS.length]
    }));

    const gainLossChartData = [
        { name: 'Gainers', value: gain_loss.total_gainers, amount: gain_loss.gainers_gain, color: '#10B981' },
        { name: 'Losers', value: gain_loss.total_losers, amount: Math.abs(gain_loss.losers_loss), color: '#EF4444' },
        { name: 'Unchanged', value: gain_loss.total_unchanged, amount: 0, color: '#9CA3AF' }
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                        <p className="text-gray-500">{summary.num_holdings} holdings across {summary.num_sectors} sectors</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warnings</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc list-inside">
                            {warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Value */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Value</p>
                                <p className="text-2xl font-bold">{formatCurrency(summary.total_value)}</p>
                                <div className={cn(
                                    "flex items-center text-sm mt-1",
                                    summary.daily_change_pct >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                    {summary.daily_change_pct >= 0 ? (
                                        <ArrowUpRight className="h-4 w-4" />
                                    ) : (
                                        <ArrowDownRight className="h-4 w-4" />
                                    )}
                                    <span>{formatPercent(summary.daily_change_pct)} today</span>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <DollarSign className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Gain/Loss */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Gain/Loss</p>
                                <p className={cn(
                                    "text-2xl font-bold",
                                    summary.total_gain >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                    {formatCurrency(summary.total_gain)}
                                </p>
                                <p className={cn(
                                    "text-sm mt-1",
                                    summary.total_gain_pct >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                    {formatPercent(summary.total_gain_pct)}
                                </p>
                            </div>
                            <div className={cn(
                                "p-3 rounded-full",
                                summary.total_gain >= 0 ? "bg-green-100" : "bg-red-100"
                            )}>
                                {summary.total_gain >= 0 ? (
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                ) : (
                                    <TrendingDown className="h-6 w-6 text-red-600" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Win Rate */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Win Rate</p>
                                <p className="text-2xl font-bold">{formatNumber(gain_loss.win_rate, 1)}%</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {gain_loss.total_gainers} of {summary.num_holdings} profitable
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Target className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Concentration */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Top 5 Concentration</p>
                                <p className="text-2xl font-bold">{formatNumber(concentration.top5_weight, 1)}%</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    HHI: {formatNumber(concentration.herfindahl_index, 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-amber-100 rounded-full">
                                <Layers className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top/Bottom Performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Briefcase className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Largest Holding</p>
                                <p className="font-semibold">{summary.top_holding.ticker}</p>
                                <p className="text-sm text-gray-500">{formatNumber(summary.top_holding.weight, 1)}% of portfolio</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Top Gainer</p>
                                <p className="font-semibold">{summary.top_gainer.ticker}</p>
                                <p className="text-sm text-green-600">{formatPercent(summary.top_gainer.gain_pct)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Top Loser</p>
                                <p className="font-semibold">{summary.top_loser.ticker}</p>
                                <p className="text-sm text-red-600">{formatPercent(summary.top_loser.gain_pct)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Holdings</TabsTrigger>
                    <TabsTrigger value="sectors">Sector Analysis</TabsTrigger>
                    <TabsTrigger value="gainloss">Gain/Loss Analysis</TabsTrigger>
                </TabsList>

                {/* Holdings Tab */}
                <TabsContent value="overview" className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search holdings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedSector} onValueChange={setSelectedSector}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by sector" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sectors</SelectItem>
                                {sector_allocation.map(s => (
                                    <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Holdings Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="cursor-pointer hover:bg-gray-50"
                                                onClick={() => handleSort('ticker')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Ticker
                                                    {sortColumn === 'ticker' && (
                                                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Sector</TableHead>
                                            <TableHead className="text-right">Shares</TableHead>
                                            <TableHead className="text-right">Avg Cost</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead
                                                className="text-right cursor-pointer hover:bg-gray-50"
                                                onClick={() => handleSort('value')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    Value
                                                    {sortColumn === 'value' && (
                                                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="text-right cursor-pointer hover:bg-gray-50"
                                                onClick={() => handleSort('gain')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    Gain/Loss
                                                    {sortColumn === 'gain' && (
                                                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="text-right cursor-pointer hover:bg-gray-50"
                                                onClick={() => handleSort('gain_pct')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    Return %
                                                    {sortColumn === 'gain_pct' && (
                                                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="text-right cursor-pointer hover:bg-gray-50"
                                                onClick={() => handleSort('weight')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    Weight
                                                    {sortColumn === 'weight' && (
                                                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHoldings.map((holding) => (
                                            <TableRow key={holding.ticker}>
                                                <TableCell className="font-medium">{holding.ticker}</TableCell>
                                                <TableCell className="max-w-[200px] truncate">{holding.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{holding.sector}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{formatNumber(holding.shares, 0)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(holding.avg_cost)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(holding.current_price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(holding.market_value)}</TableCell>
                                                <TableCell className={cn(
                                                    "text-right font-medium",
                                                    holding.unrealized_gain >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {formatCurrency(holding.unrealized_gain)}
                                                </TableCell>
                                                <TableCell className={cn(
                                                    "text-right font-medium",
                                                    holding.unrealized_gain_pct >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {formatPercent(holding.unrealized_gain_pct)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Progress
                                                            value={holding.weight}
                                                            className="w-16 h-2"
                                                        />
                                                        <span className="w-12 text-right">{formatNumber(holding.weight, 1)}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sector Analysis Tab */}
                <TabsContent value="sectors" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sector Pie Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Sector Allocation</CardTitle>
                                <CardDescription>Portfolio distribution by sector</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPie>
                                            <Pie
                                                data={sectorChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={({ name, weight }) => `${name} (${weight.toFixed(1)}%)`}
                                            >
                                                {sectorChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                        </RechartsPie>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sector Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Sector Details</CardTitle>
                                <CardDescription>Performance by sector</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sector</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                            <TableHead className="text-right">Weight</TableHead>
                                            <TableHead className="text-right">Gain/Loss</TableHead>
                                            <TableHead className="text-right">Holdings</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sector_allocation.map((sector, index) => (
                                            <TableRow key={sector.sector}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                        />
                                                        {sector.sector}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(sector.value)}</TableCell>
                                                <TableCell className="text-right">{formatNumber(sector.weight, 1)}%</TableCell>
                                                <TableCell className={cn(
                                                    "text-right",
                                                    sector.gain_pct >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {formatPercent(sector.gain_pct)}
                                                </TableCell>
                                                <TableCell className="text-right">{sector.holding_count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Gain/Loss Analysis Tab */}
                <TabsContent value="gainloss" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gain/Loss Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Gain/Loss Distribution</CardTitle>
                                <CardDescription>Holdings by profitability</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={gainLossChartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <RechartsTooltip />
                                            <Bar dataKey="value" name="Holdings">
                                                {gainLossChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Gain/Loss Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Gain/Loss Statistics</CardTitle>
                                <CardDescription>Detailed breakdown</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <p className="text-sm text-green-600">Gainers</p>
                                        <p className="text-2xl font-bold text-green-700">{gain_loss.total_gainers}</p>
                                        <p className="text-sm text-green-600 mt-1">
                                            Avg return: {formatPercent(gain_loss.avg_gainer_return)}
                                        </p>
                                        <p className="text-sm text-green-600">
                                            Total gain: {formatCurrency(gain_loss.gainers_gain)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-lg">
                                        <p className="text-sm text-red-600">Losers</p>
                                        <p className="text-2xl font-bold text-red-700">{gain_loss.total_losers}</p>
                                        <p className="text-sm text-red-600 mt-1">
                                            Avg return: {formatPercent(gain_loss.avg_loser_return)}
                                        </p>
                                        <p className="text-sm text-red-600">
                                            Total loss: {formatCurrency(gain_loss.losers_loss)}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Win Rate</span>
                                        <span className="font-semibold">{formatNumber(gain_loss.win_rate, 1)}%</span>
                                    </div>
                                    <Progress value={gain_loss.win_rate} className="h-3" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Value in Gainers</span>
                                        <span className="font-medium">{formatCurrency(gain_loss.gainers_value)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Value in Losers</span>
                                        <span className="font-medium">{formatCurrency(gain_loss.losers_value)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Net Gain/Loss</span>
                                        <span className={cn(
                                            "font-semibold",
                                            summary.total_gain >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {formatCurrency(summary.total_gain)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}


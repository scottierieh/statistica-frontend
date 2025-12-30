'use client';

import { useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, UploadCloud, Database, Settings2, Play, FileSpreadsheet, 
    CheckCircle2, DollarSign, Calendar, TrendingUp, BarChart3, Briefcase,
    Hash, Tag, PieChart, Layers, Package, Percent
} from 'lucide-react';
import Papa from 'papaparse';
import type { FinanceConfig, FinanceResults, PortfolioHolding, SectorAllocation } from './FinanceLayout';
import { financeExampleDatasets } from '@/lib/finance-example-datasets';

interface FinanceSettingsProps {
    config: FinanceConfig;
    updateConfig: (updates: Partial<FinanceConfig>) => void;
    analysisResult: FinanceResults | null;
    setAnalysisResult: (result: FinanceResults | null) => void;
    isAnalyzing: boolean;
    setIsAnalyzing: (analyzing: boolean) => void;
}

export default function FinanceSettings({ 
    config, 
    updateConfig, 
    analysisResult,
    setAnalysisResult,
    isAnalyzing,
    setIsAnalyzing
}: FinanceSettingsProps) {
    const { toast } = useToast();

    const processData = useCallback((dataToProcess: any[], fileName: string) => {
        if (dataToProcess.length > 0) {
            const firstRow = dataToProcess[0];
            const allHeaders = Object.keys(firstRow);
            const numeric = allHeaders.filter(h => typeof firstRow[h] === 'number');
            
            // Auto-detect common column names for time series
            const dateCol = allHeaders.find(h => 
                h.toLowerCase().includes('date') || h.toLowerCase().includes('time')
            ) || '';
            const priceCol = allHeaders.find(h => 
                h.toLowerCase().includes('close') || h.toLowerCase().includes('price')
            ) || numeric[0] || '';
            const volumeCol = allHeaders.find(h => 
                h.toLowerCase().includes('volume')
            ) || '';
            const returnsCol = allHeaders.find(h => 
                h.toLowerCase().includes('return')
            ) || '';
            
            // Auto-detect portfolio columns - exact match first, then partial match
            const findColumn = (headers: string[], exactMatches: string[], partialMatches: string[]): string => {
                // Try exact match first
                for (const exact of exactMatches) {
                    const found = headers.find(h => h.toLowerCase() === exact.toLowerCase());
                    if (found) return found;
                }
                // Then try partial match
                for (const partial of partialMatches) {
                    const found = headers.find(h => h.toLowerCase().includes(partial.toLowerCase()));
                    if (found) return found;
                }
                return '';
            };

            const tickerCol = findColumn(allHeaders, ['ticker', 'symbol'], ['ticker', 'symbol', 'stock', 'code']);
            const nameCol = findColumn(allHeaders, ['name', 'company'], ['name', 'company', 'description']);
            const sectorCol = findColumn(allHeaders, ['sector', 'industry'], ['sector', 'industry', 'category']);
            const assetClassCol = findColumn(allHeaders, ['asset_class', 'assetclass'], ['asset', 'class', 'type']);
            const sharesCol = findColumn(allHeaders, ['shares', 'quantity', 'qty'], ['shares', 'quantity', 'qty', 'units']);
            const avgCostCol = findColumn(allHeaders, ['avg_cost', 'avgcost', 'average_cost'], ['avg_cost', 'cost', 'purchase', 'basis']);
            const currentPriceCol = findColumn(allHeaders, ['current_price', 'currentprice', 'price'], ['current_price', 'current', 'market', 'last', 'close']);
            const dailyChangeCol = findColumn(allHeaders, ['daily_change_pct', 'daily_change'], ['daily_change', 'daily', 'change_pct']);
            
            updateConfig({
                data: dataToProcess,
                numericHeaders: numeric,
                allHeaders: allHeaders,
                // Time series
                dateColumn: dateCol,
                priceColumn: priceCol,
                volumeColumn: volumeCol,
                returnsColumn: returnsCol,
                // Portfolio
                tickerColumn: tickerCol,
                nameColumn: nameCol,
                sectorColumn: sectorCol,
                assetClassColumn: assetClassCol,
                sharesColumn: sharesCol,
                avgCostColumn: avgCostCol,
                currentPriceColumn: currentPriceCol,
                dailyChangeColumn: dailyChangeCol,
            });
            
            setAnalysisResult(null);
            toast({ title: "Data Loaded", description: `${fileName}: ${dataToProcess.length} records, ${allHeaders.length} columns` });
        }
    }, [updateConfig, setAnalysisResult, toast]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                processData(results.data as any[], file.name);
            },
            error: (error) => {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
            }
        });
    }, [processData, toast]);

    const loadSampleData = useCallback((datasetId: string) => {
        const dataset = financeExampleDatasets.find(d => d.id === datasetId);
        if (dataset) {
            const parsed = Papa.parse(dataset.data, { header: true, dynamicTyping: true });
            processData(parsed.data as any[], dataset.name);
        }
    }, [processData]);

    const runAnalysis = useCallback(async () => {
        if (config.data.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please load data first' });
            return;
        }
        
        setIsAnalyzing(true);
        try {
            // Call API with column mappings
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
                throw new Error('Failed to run analysis');
            }

            const result = await response.json();
            
            // Transform API result to match FinanceResults format
            setAnalysisResult({
                timestamp: result.timestamp,
                data_points: result.data_points,
                portfolio: {
                    holdings: result.holdings.map((h: any) => ({
                        ticker: h.ticker,
                        name: h.name,
                        sector: h.sector,
                        shares: h.shares,
                        avgCost: h.avg_cost,
                        currentPrice: h.current_price,
                        marketValue: h.market_value,
                        costBasis: h.cost_basis,
                        unrealizedGain: h.unrealized_gain,
                        unrealizedGainPct: h.unrealized_gain_pct,
                        weight: h.weight,
                        dailyChangePct: h.daily_change_pct,
                        ytdReturnPct: 0,
                    })),
                    summary: {
                        totalValue: result.summary.total_value,
                        totalCost: result.summary.total_cost,
                        totalGain: result.summary.total_gain,
                        totalGainPct: result.summary.total_gain_pct,
                        dailyChange: result.summary.daily_change,
                        dailyChangePct: result.summary.daily_change_pct,
                        ytdReturn: 0,
                        ytdReturnPct: 0,
                        numHoldings: result.summary.num_holdings,
                        topPerformer: { 
                            ticker: result.summary.top_gainer.ticker, 
                            returnPct: result.summary.top_gainer.gain_pct 
                        },
                        worstPerformer: { 
                            ticker: result.summary.top_loser.ticker, 
                            returnPct: result.summary.top_loser.gain_pct 
                        },
                    },
                    sectorAllocation: result.sector_allocation.map((s: any) => ({
                        sector: s.sector,
                        value: s.value,
                        weight: s.weight,
                        holdings: s.holding_count,
                    })),
                },
            });
            
            toast({ title: 'Analysis Complete', description: 'Financial analysis has been updated.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsAnalyzing(false);
        }
    }, [config, setAnalysisResult, setIsAnalyzing, toast]);

    const allHeaders = config.allHeaders || Object.keys(config.data[0] || {});

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Data Settings</h2>
                <p className="text-gray-500 mt-1">Configure your financial data source and column mappings</p>
            </div>

            {/* Data Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-gray-500" />
                        Data Source
                    </CardTitle>
                    <CardDescription>Upload your financial data or load sample dataset</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Upload CSV File</Label>
                            <div 
                                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add('border-primary', 'bg-primary/5');
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                                    const file = e.dataTransfer.files[0];
                                    if (file && file.name.endsWith('.csv')) {
                                        Papa.parse(file, {
                                            header: true,
                                            dynamicTyping: true,
                                            complete: (results) => {
                                                processData(results.data as any[], file.name);
                                            },
                                            error: (error) => {
                                                toast({ variant: 'destructive', title: 'Error', description: error.message });
                                            }
                                        });
                                    } else {
                                        toast({ variant: 'destructive', title: 'Error', description: 'Please upload a CSV file' });
                                    }
                                }}
                                onClick={() => document.getElementById('file-upload')?.click()}
                            >
                                <UploadCloud className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm font-medium text-gray-600">
                                    Drag & drop your CSV file here
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    or click to browse
                                </p>
                            </div>
                            <Input 
                                id="file-upload" 
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <p className="text-xs text-gray-400">
                                Supports: Stock prices, returns, portfolio data
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Or Use Sample Data</Label>
                            <div className="space-y-2">
                                {financeExampleDatasets.map(dataset => (
                                    <Button 
                                        key={dataset.id}
                                        onClick={() => loadSampleData(dataset.id)} 
                                        variant="outline" 
                                        className="w-full justify-start"
                                        size="sm"
                                    >
                                        <Briefcase className="mr-2 h-4 w-4" />
                                        <div className="text-left">
                                            <div className="font-medium">{dataset.name}</div>
                                            <div className="text-xs text-muted-foreground">{dataset.description}</div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {config.data.length > 0 && (
                        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="font-medium text-green-800">Data Loaded Successfully</p>
                                <p className="text-sm text-green-600">
                                    {config.data.length.toLocaleString()} records • {allHeaders.length} columns
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Portfolio Column Mapping */}
            {config.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-gray-500" />
                            Portfolio Column Mapping
                        </CardTitle>
                        <CardDescription>Map your data columns for portfolio analysis (required for Portfolio Overview)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Ticker Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-gray-400" />
                                    Ticker / Symbol *
                                </Label>
                                <Select 
                                    value={config.tickerColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ tickerColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Shares Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                    Shares / Quantity *
                                </Label>
                                <Select 
                                    value={config.sharesColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ sharesColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Avg Cost Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                    Average Cost *
                                </Label>
                                <Select 
                                    value={config.avgCostColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ avgCostColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Current Price Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-gray-400" />
                                    Current Price *
                                </Label>
                                <Select 
                                    value={config.currentPriceColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ currentPriceColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Name Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                                    Name (optional)
                                </Label>
                                <Select 
                                    value={config.nameColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ nameColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Sector Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <PieChart className="h-4 w-4 text-gray-400" />
                                    Sector (optional)
                                </Label>
                                <Select 
                                    value={config.sectorColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ sectorColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Asset Class Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-gray-400" />
                                    Asset Class (optional)
                                </Label>
                                <Select 
                                    value={config.assetClassColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ assetClassColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Daily Change Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Percent className="h-4 w-4 text-gray-400" />
                                    Daily Change % (optional)
                                </Label>
                                <Select 
                                    value={config.dailyChangeColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ dailyChangeColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {config.numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500">* Required columns for portfolio analysis</p>
                    </CardContent>
                </Card>
            )}

            {/* Time Series Column Configuration */}
            {config.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-gray-500" />
                            Time Series Column Mapping
                        </CardTitle>
                        <CardDescription>Map columns for time series analysis (optional)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Date Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    Date Column
                                </Label>
                                <Select 
                                    value={config.dateColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ dateColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {allHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Price Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                    Price Column
                                </Label>
                                <Select 
                                    value={config.priceColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ priceColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {config.numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Volume Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-gray-400" />
                                    Volume Column
                                </Label>
                                <Select 
                                    value={config.volumeColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ volumeColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {config.numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Returns Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-gray-400" />
                                    Returns Column
                                </Label>
                                <Select 
                                    value={config.returnsColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ returnsColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None (Calculate automatically)</SelectItem>
                                        {config.numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Benchmark Column */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-gray-400" />
                                    Benchmark Column
                                </Label>
                                <Select 
                                    value={config.benchmarkColumn || "__none__"} 
                                    onValueChange={(val) => updateConfig({ benchmarkColumn: val === "__none__" ? "" : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {config.numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Risk-Free Rate */}
                            <div className="space-y-2">
                                <Label>Risk-Free Rate (%)</Label>
                                <Input 
                                    type="number"
                                    step="0.01"
                                    placeholder="5.0"
                                    value={config.riskFreeRate}
                                    onChange={(e) => updateConfig({ riskFreeRate: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Run Analysis */}
            {config.data.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                {analysisResult && (
                                    <p className="text-sm text-gray-500">
                                        Last analysis: {new Date(analysisResult.timestamp).toLocaleString()}
                                    </p>
                                )}
                                {!config.tickerColumn || !config.sharesColumn || !config.avgCostColumn || !config.currentPriceColumn ? (
                                    <p className="text-sm text-amber-600">
                                        Please map required portfolio columns (Ticker, Shares, Avg Cost, Current Price)
                                    </p>
                                ) : null}
                            </div>
                            <Button 
                                onClick={runAnalysis} 
                                disabled={
                                    isAnalyzing || 
                                    config.data.length === 0 ||
                                    !config.tickerColumn ||
                                    !config.sharesColumn ||
                                    !config.avgCostColumn ||
                                    !config.currentPriceColumn
                                }
                                size="lg"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Running Analysis...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Run Analysis
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Available Variables Preview */}
            {config.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-gray-500" />
                            Available Variables
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {allHeaders.map(header => (
                                <Badge 
                                    key={header} 
                                    variant={
                                        header === config.tickerColumn ? "default" :
                                        header === config.sharesColumn ? "default" :
                                        header === config.avgCostColumn ? "default" :
                                        header === config.currentPriceColumn ? "default" :
                                        header === config.dateColumn ? "secondary" :
                                        config.numericHeaders.includes(header) ? "outline" : "outline"
                                    }
                                    className="text-xs"
                                >
                                    {header}
                                    {header === config.tickerColumn && " (Ticker)"}
                                    {header === config.sharesColumn && " (Shares)"}
                                    {header === config.avgCostColumn && " (Avg Cost)"}
                                    {header === config.currentPriceColumn && " (Price)"}
                                    {header === config.sectorColumn && " (Sector)"}
                                    {header === config.dateColumn && " (Date)"}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


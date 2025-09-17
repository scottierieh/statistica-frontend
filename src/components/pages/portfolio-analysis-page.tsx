
'use client';
import { useState, useCallback, useMemo } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, DollarSign, TrendingUp, ArrowDownRight, Zap } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { DatePickerWithRange } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subYears, format } from 'date-fns';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, Tooltip, Line, ResponsiveContainer, YAxis, Legend } from 'recharts';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';

interface SummaryStats {
    annual_return: number;
    cumulative_returns: number;
    annual_volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
}

interface CumulativeReturnData {
    date: string;
    cumulative_returns: number;
}

interface AnalysisResults {
    summary_stats: SummaryStats;
    cumulative_returns_data: CumulativeReturnData[];
    portfolio_weights: { [key: string]: number };
}

interface AnalysisResponse {
    results: AnalysisResults;
}

const StatCard = ({ title, value, unit, icon: Icon }: { title: string, value: number, unit?: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {value.toFixed(2)}{unit}
            </div>
        </CardContent>
    </Card>
);


interface PortfolioAnalysisPageProps {
  data: DataSet;
  onLoadExample: (example: ExampleDataSet) => void;
}


export default function PortfolioAnalysisPage({ data, onLoadExample }: PortfolioAnalysisPageProps) {
    const { toast } = useToast();
    const [tickers, setTickers] = useState('AAPL, MSFT, GOOGL, AMZN');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subYears(new Date(), 3),
        to: new Date(),
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
        if (tickerList.length === 0) {
            toast({ variant: 'destructive', title: 'Input Error', description: 'Please enter at least one stock ticker.' });
            return;
        }
        if (!dateRange || !dateRange.from) {
            toast({ variant: 'destructive', title: 'Input Error', description: 'Please select a date range.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/financial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tickers: tickerList,
                    startDate: format(dateRange.from, 'yyyy-MM-dd'),
                    endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Success', description: 'Portfolio analysis completed.' });

        } catch (e: any) {
            console.error('Portfolio analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [tickers, dateRange, toast]);

    const results = analysisResult?.results;
    
    const chartData = useMemo(() => {
        if (!results) return [];
        return results.cumulative_returns_data.map(d => ({
            date: new Date(d.date).getTime(),
            returns: (d as any).cumulative_returns * 100
        }));
    }, [results]);

    const chartConfig = {
      returns: {
        label: "Cumulative Returns",
        color: "hsl(var(--chart-1))",
      },
    };
    
    if (data.length > 0) {
        return (
            <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Portfolio Analysis</CardTitle>
                        <CardDescription>
                            This tool uses live market data via the yfinance API and does not require a data upload. Please clear any loaded data to use this feature.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><DollarSign /> Portfolio Performance Analysis</CardTitle>
                    <CardDescription>Enter stock tickers (comma-separated) and a date range to analyze an equally-weighted portfolio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tickers-input">Stock Tickers</Label>
                        <Input
                            id="tickers-input"
                            placeholder="e.g., AAPL, MSFT, GOOGL"
                            value={tickers}
                            onChange={(e) => setTickers(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Date Range</Label>
                        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Analyze Portfolio</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {results && (
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <StatCard title="Cumulative Returns" value={results.summary_stats.cumulative_returns * 100} unit="%" icon={TrendingUp} />
                            <StatCard title="Annualized Return" value={results.summary_stats.annual_return * 100} unit="%" icon={TrendingUp} />
                            <StatCard title="Annualized Volatility" value={results.summary_stats.annual_volatility * 100} unit="%" icon={ArrowDownRight} />
                            <StatCard title="Sharpe Ratio" value={results.summary_stats.sharpe_ratio} icon={Zap} />
                            <StatCard title="Max Drawdown" value={results.summary_stats.max_drawdown * 100} unit="%" icon={ArrowDownRight} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Portfolio Growth</CardTitle>
                            <CardDescription>Cumulative returns over the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[400px] w-full">
                                <ResponsiveContainer>
                                <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        dy={10}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `${value}%`}
                                    />
                                    <Tooltip
                                        content={<ChartTooltipContent 
                                        indicator="line" 
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                        formatter={(value) => `${(value as number).toFixed(2)}%`}
                                        />}
                                    />
                                    <Legend />
                                    <Line
                                        dataKey="returns"
                                        type="monotone"
                                        stroke="var(--color-returns)"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

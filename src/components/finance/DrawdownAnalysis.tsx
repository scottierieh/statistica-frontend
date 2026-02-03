'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
    TrendingDown, Info, Calendar, Clock, BarChart3, 
    AlertTriangle, ArrowDown, ArrowUp, Target, Activity, Loader2, RefreshCw
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, BarChart, Bar, Cell, ReferenceLine, ComposedChart, Line
} from 'recharts';
import type { FinanceConfig, FinanceResults } from './FinanceLayout';

interface DrawdownAnalysisProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

interface DrawdownResult {
    drawdown_series: number[];
    drawdown_periods: {
        start_idx: number;
        trough_idx: number;
        end_idx: number;
        start_date: string;
        trough_date: string;
        end_date: string;
        peak_value: number;
        trough_value: number;
        drawdown_pct: number;
        days_to_trough: number;
        days_to_recovery: number | null;
        total_days: number | null;
        recovered: boolean;
    }[];
    statistics: {
        max_drawdown: number;
        current_drawdown: number;
        avg_drawdown: number;
        num_drawdowns: number;
        avg_recovery_days: number;
        calmar_ratio: number;
        annual_return: number;
    };
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
};

// Generate synthetic portfolio values
const generatePortfolioValues = (totalValue: number, days: number = 504): { values: number[]; dates: string[] } => {
    const values: number[] = [];
    const dates: string[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days * 1.4);
    
    let value = totalValue * 0.7;
    const drawdowns = [
        { start: 60, duration: 40, depth: -0.15 },
        { start: 200, duration: 60, depth: -0.25 },
        { start: 400, duration: 30, depth: -0.12 },
    ];
    
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + Math.floor(i * 1.4));
        dates.push(date.toISOString().split('T')[0]);
        
        let dailyReturn = 0.0004 + (Math.random() - 0.5) * 0.015;
        
        for (const dd of drawdowns) {
            if (i >= dd.start && i < dd.start + dd.duration) {
                const progress = (i - dd.start) / dd.duration;
                dailyReturn = progress < 0.4 
                    ? dd.depth / (dd.duration * 0.4) + (Math.random() - 0.5) * 0.01
                    : Math.abs(dd.depth) / (dd.duration * 0.6) + (Math.random() - 0.5) * 0.01;
            }
        }
        
        value = value * (1 + dailyReturn);
        values.push(Math.round(value));
    }
    
    return { values, dates };
};

// Stat Card
const StatCard = ({ title, value, subtitle, icon: Icon, variant = 'default', isLoading = false }: { title: string; value: string; subtitle?: string; icon: any; variant?: 'default' | 'danger' | 'warning' | 'success'; isLoading?: boolean }) => {
    const styles = { default: 'bg-white', danger: 'bg-red-50 border-red-200', warning: 'bg-yellow-50 border-yellow-200', success: 'bg-green-50 border-green-200' };
    const textColors = { default: 'text-gray-900', danger: 'text-red-700', warning: 'text-yellow-700', success: 'text-green-700' };

    return (
        <Card className={styles[variant]}>
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                ) : (
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{title}</p>
                            <p className={`text-2xl font-bold mt-1 ${textColors[variant]}`}>{value}</p>
                            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                        </div>
                        <Icon className={`h-5 w-5 ${textColors[variant]}`} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Drawdown Chart
const DrawdownChart = ({ data }: { data: { date: string; drawdown: number }[] }) => (
    <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.substring(5, 10)} interval={Math.floor(data.length / 10)} />
            <YAxis tickFormatter={(v) => `${v}%`} fontSize={10} domain={['auto', 0]} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <ReferenceLine y={0} stroke="#9ca3af" />
            <ReferenceLine y={-5} stroke="#f97316" strokeDasharray="5 5" />
            <ReferenceLine y={-10} stroke="#ef4444" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="url(#ddGrad)" />
        </ComposedChart>
    </ResponsiveContainer>
);

// Drawdown Periods Chart
const DrawdownPeriodsChart = ({ periods }: { periods: DrawdownResult['drawdown_periods'] }) => {
    const data = periods.slice(0, 10).map((p, i) => ({ name: `DD ${i + 1}`, drawdown: p.drawdown_pct }));
    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis tickFormatter={(v) => `${v}%`} fontSize={10} domain={['auto', 0]} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="drawdown" radius={[4, 4, 0, 0]}>
                    {data.map((e, i) => <Cell key={i} fill={e.drawdown < -20 ? '#dc2626' : e.drawdown < -10 ? '#f97316' : '#facc15'} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default function DrawdownAnalysis({ config, analysisResult }: DrawdownAnalysisProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [drawdownResult, setDrawdownResult] = useState<DrawdownResult | null>(null);
    const [chartData, setChartData] = useState<{ date: string; drawdown: number }[]>([]);

    const analyzeDrawdowns = useCallback(async () => {
        if (!analysisResult?.portfolio) return;
        setIsLoading(true);
        setError(null);

        try {
            const { values, dates } = generatePortfolioValues(analysisResult.portfolio.summary.totalValue, 504);
            const response = await fetch('/api/finance/drawdown/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portfolio_values: values, dates })
            });

            if (!response.ok) throw new Error('API request failed');

            const result = await response.json();
            setDrawdownResult(result);
            setChartData(result.drawdown_series.map((dd: number, i: number) => ({ date: dates[i], drawdown: dd * 100 })));
        } catch (err: any) {
            setError(err.message || 'Failed to analyze drawdowns');
        } finally {
            setIsLoading(false);
        }
    }, [analysisResult]);

    useEffect(() => {
        if (analysisResult?.portfolio) analyzeDrawdowns();
    }, [analysisResult]);

    if (!analysisResult?.portfolio) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Drawdown Analysis</h2>
                <Alert><Info className="h-4 w-4" /><AlertTitle>No Portfolio Data</AlertTitle><AlertDescription>Please load portfolio data first.</AlertDescription></Alert>
            </div>
        );
    }

    const stats = drawdownResult?.statistics;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Drawdown Analysis</h2>
                    <p className="text-gray-500 mt-1">Historical drawdown patterns and recovery</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={analyzeDrawdowns} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Recalculate</span>
                    </Button>
                    <Badge variant={stats && stats.current_drawdown < -5 ? 'destructive' : 'default'} className="text-lg px-4 py-2">
                        Current: {stats ? formatPercent(stats.current_drawdown) : '...'}
                    </Badge>
                </div>
            </div>

            {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Maximum Drawdown" value={stats ? formatPercent(stats.max_drawdown) : '...'} subtitle="Worst peak-to-trough" icon={TrendingDown} variant="danger" isLoading={isLoading} />
                <StatCard title="Average Drawdown" value={stats ? formatPercent(stats.avg_drawdown) : '...'} subtitle={stats ? `${stats.num_drawdowns} periods` : ''} icon={BarChart3} variant="warning" isLoading={isLoading} />
                <StatCard title="Avg Recovery Time" value={stats ? `${stats.avg_recovery_days} days` : '...'} icon={Clock} isLoading={isLoading} />
                <StatCard title="Calmar Ratio" value={stats ? stats.calmar_ratio.toFixed(2) : '...'} subtitle="Return / Max DD" icon={Target} variant={stats && stats.calmar_ratio > 1 ? 'success' : 'default'} isLoading={isLoading} />
            </div>

            <Card>
                <CardHeader><CardTitle>Drawdown Over Time</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div> : <DrawdownChart data={chartData} />}
                </CardContent>
            </Card>

            {drawdownResult && drawdownResult.drawdown_periods.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Drawdown Periods</CardTitle></CardHeader>
                    <CardContent><DrawdownPeriodsChart periods={drawdownResult.drawdown_periods} /></CardContent>
                </Card>
            )}

            {drawdownResult && (
                <Card>
                    <CardHeader><CardTitle>Drawdown Details</CardTitle></CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2">Rank</th>
                                    <th className="text-left py-2 px-2">Start</th>
                                    <th className="text-left py-2 px-2">Trough</th>
                                    <th className="text-right py-2 px-2">Peak</th>
                                    <th className="text-right py-2 px-2">Trough Val</th>
                                    <th className="text-right py-2 px-2">Drawdown</th>
                                    <th className="text-right py-2 px-2">Days</th>
                                    <th className="text-center py-2 px-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drawdownResult.drawdown_periods.slice(0, 10).map((p, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="py-2 px-2"><Badge variant={i === 0 ? 'destructive' : 'secondary'}>#{i + 1}</Badge></td>
                                        <td className="py-2 px-2">{p.start_date}</td>
                                        <td className="py-2 px-2">{p.trough_date}</td>
                                        <td className="py-2 px-2 text-right">{formatCurrency(p.peak_value)}</td>
                                        <td className="py-2 px-2 text-right">{formatCurrency(p.trough_value)}</td>
                                        <td className="py-2 px-2 text-right font-bold text-red-600">{formatPercent(p.drawdown_pct)}</td>
                                        <td className="py-2 px-2 text-right">{p.days_to_trough}</td>
                                        <td className="py-2 px-2 text-center">
                                            <Badge className={p.recovered ? 'bg-green-600' : ''}>{p.recovered ? 'Recovered' : 'Ongoing'}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle>Understanding Drawdowns</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-2">Risk Ratios</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li><strong>Calmar Ratio:</strong> Return ÷ Max DD (&gt;1.0 good)</li>
                                <li><strong>Sterling Ratio:</strong> Return ÷ Avg DD</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold">Severity Scale</h4>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400" /><span className="text-sm">-5% to -10%: Normal</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500" /><span className="text-sm">-10% to -20%: Moderate</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-600" /><span className="text-sm">&gt;-20%: Severe</span></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
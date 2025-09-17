
'use client';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, DollarSign } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { DatePickerWithRange } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subYears, format } from 'date-fns';

interface AnalysisResponse {
    results: {
        summary: {
            annual_return: number;
            cumulative_returns: number;
            sharpe_ratio: number;
            max_drawdown: number;
        }
    };
    report_html: string; // base64 encoded html
}

export default function PortfolioAnalysisPage() {
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
    
    const reportHtml = useMemo(() => {
        if (!analysisResult) return null;
        try {
            return atob(analysisResult.report_html);
        } catch (e) {
            console.error("Failed to decode base64 report:", e);
            return "<p>Error displaying report.</p>";
        }
    }, [analysisResult]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><DollarSign /> Portfolio Performance Analysis</CardTitle>
                    <CardDescription>Enter stock tickers (comma-separated) and a date range to generate a performance tearsheet.</CardDescription>
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

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full" /></CardContent></Card>}

            {analysisResult && reportHtml && (
                 <Card>
                    <CardHeader><CardTitle>Pyfolio Performance Report</CardTitle></CardHeader>
                    <CardContent>
                        <iframe
                            srcDoc={reportHtml}
                            className="w-full h-[80vh] border-0"
                            title="Pyfolio Report"
                            sandbox="allow-scripts"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

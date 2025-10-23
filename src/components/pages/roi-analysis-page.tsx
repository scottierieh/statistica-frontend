
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign, Target, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface RoiResult {
    summary: {
        total_investment: number;
        total_return: number;
        net_return: number;
        overall_roi: number;
    };
    grouped_analysis: {
        group: string;
        total_investment: number;
        total_return: number;
        net_return: number;
        roi: number;
    }[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: RoiResult;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const roiExample = exampleDatasets.find(d => d.id === 'marketing-analysis');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <DollarSign size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">ROI Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Measure the profitability of your investments by calculating the Return on Investment.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use ROI Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            ROI analysis is a fundamental performance metric used to evaluate the efficiency of an investment. It helps you understand how much return you get for every dollar you invest, allowing you to compare the profitability of different projects, marketing campaigns, or business units.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {roiExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(roiExample)}>
                                <roiExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{roiExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{roiExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Investment Column:</strong> Select the numeric column representing the total cost or investment (e.g., 'ad_cost').</li>
                                <li><strong>Return Column:</strong> Select the numeric column representing the total revenue or profit generated (e.g., 'sales_revenue').</li>
                                <li><strong>Group By Column:</strong> Choose a categorical column to compare ROI across different groups (e.g., 'campaign_name', 'channel').</li>
                                <li><strong>Run Analysis:</strong> The tool will calculate the overall ROI and the ROI for each group.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>ROI (%):</strong> A positive ROI means the returns exceed the investment (profitable). A negative ROI indicates a loss.</li>
                                <li><strong>Net Return:</strong> The absolute profit or loss (Return - Investment).</li>
                                <li><strong>Bar Chart:</strong> Visually compare the ROI of different groups to quickly identify top and bottom performers.</li>
                                <li><strong>AI Interpretation:</strong> Provides a summary of findings and actionable recommendations based on the analysis.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


interface RoiAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RoiAnalysisPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: RoiAnalysisPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [investmentCol, setInvestmentCol] = useState<string | undefined>();
    const [returnCol, setReturnCol] = useState<string | undefined>();
    const [groupByCol, setGroupByCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setInvestmentCol(numericHeaders.find(h => h.toLowerCase().includes('cost') || h.toLowerCase().includes('spend')));
        setReturnCol(numericHeaders.find(h => h.toLowerCase().includes('revenue') || h.toLowerCase().includes('return')));
        setGroupByCol(categoricalHeaders.find(h => h.toLowerCase().includes('campaign') || h.toLowerCase().includes('channel')));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!investmentCol || !returnCol || !groupByCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select investment, return, and group-by columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/roi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, investment_col: investmentCol, return_col: returnCol, group_by_col: groupByCol })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('ROI Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, investmentCol, returnCol, groupByCol, toast]);

    const handleLoadExampleData = () => {
        const roiExample = exampleDatasets.find(ex => ex.id === 'marketing-analysis');
        if (roiExample) {
            onLoadExample(roiExample);
            setView('main');
        }
    };

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">ROI Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select columns for investment, return, and grouping to calculate ROI.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Investment Column</Label>
                            <Select value={investmentCol} onValueChange={setInvestmentCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Return Column</Label>
                            <Select value={returnCol} onValueChange={setReturnCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Group By Column</Label>
                            <Select value={groupByCol} onValueChange={setGroupByCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !investmentCol || !returnCol || !groupByCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Analysis Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <TrendingUp className="h-4 w-4" />
                                <AlertTitle>Key Insights</AlertTitle>
                                <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                            </Alert>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="font-headline">ROI by {groupByCol}</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="ROI Plot" width={800} height={600} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Detailed Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{groupByCol}</TableHead>
                                            <TableHead className="text-right">ROI (%)</TableHead>
                                            <TableHead className="text-right">Net Return</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.grouped_analysis.map((row) => (
                                            <TableRow key={row.group}>
                                                <TableCell>{row.group}</TableCell>
                                                <TableCell className={`text-right font-mono ${row.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>{row.roi.toFixed(2)}%</TableCell>
                                                <TableCell className={`text-right font-mono ${row.net_return > 0 ? 'text-green-600' : 'text-red-600'}`}>{row.net_return.toLocaleString(undefined, {style: 'currency', currency: 'USD'})}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

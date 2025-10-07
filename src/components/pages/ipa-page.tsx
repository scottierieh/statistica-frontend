
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, Settings, BarChart as BarChartIcon, HelpCircle, MoveRight, FileSearch, ShoppingCart, Award } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ipaExample = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Target size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Importance-Performance Analysis (IPA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A strategic tool to identify and prioritize areas for improvement by comparing customer satisfaction (Performance) with attribute importance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use IPA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Not all product or service attributes are created equal. Some are critical to customer satisfaction, while others are less impactful. IPA helps you focus your limited resources on what matters most to customers. By plotting attribute performance against their importance, you can instantly see which areas are strengths, which are weaknesses, and where you might be wasting effort.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {ipaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ipaExample)}>
                                <ShoppingCart className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ipaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ipaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Data Requirements</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Overall Satisfaction:</strong> Your dataset must contain a numeric column named exactly <strong>`Overall_Satisfaction`</strong> which represents the overall outcome metric.
                                </li>
                                <li>
                                    <strong>Attribute Performance:</strong> All other numeric columns in the dataset will be treated as performance attributes to be analyzed.
                                </li>
                            </ul>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Concentrate Here (High Importance, Low Performance):</strong> Your top priority. Improving these attributes will likely have the biggest impact on overall satisfaction.
                                </li>
                                <li>
                                    <strong>Keep Up the Good Work (High Importance, High Performance):</strong> Your key strengths. Maintain your performance in these areas.
                                </li>
                                <li>
                                    <strong>Low Priority (Low Importance, Low Performance):</strong> Don't worry too much about these. Resources are better spent elsewhere.
                                </li>
                                 <li>
                                    <strong>Possible Overkill (Low Importance, High Performance):</strong> You may be investing too many resources here for little return in satisfaction.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface IpaMatrixItem {
    attribute: string;
    importance: number;
    performance: number;
    quadrant: string;
    priority_score: number;
    gap: number;
    r_squared: number;
    relative_importance: number;
}
interface RegressionSummary {
    r2: number;
    adj_r2: number;
    f_stat: number;
    f_pvalue: number;
}
interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
    advanced_metrics: {
        sensitivity: { [key: string]: { r2_change: number; relative_importance: number; } };
        outliers: { standardized_residuals: number[]; cooks_distance: number[]; };
    };
}
interface FullAnalysisResponse {
    results: IpaResults;
    plot: string;
}

interface IpaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function IpaPage({ data, numericHeaders, onLoadExample }: IpaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => {
        if (!data || !numericHeaders) return false;
        const hasSatisfaction = numericHeaders.some(h => h.toLowerCase().includes('overall_satisfaction'));
        return data.length > 0 && numericHeaders.length >= 2 && hasSatisfaction;
    }, [data, numericHeaders]);
    
    useEffect(() => {
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const dependentVar = numericHeaders.find(h => h.toLowerCase() === 'overall_satisfaction');
            if (!dependentVar) {
                throw new Error("Dataset must contain a numeric column named 'Overall_Satisfaction'.");
            }
            const independentVars = numericHeaders.filter(h => h.toLowerCase() !== 'overall_satisfaction');

            const response = await fetch('/api/analysis/ipa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'IPA results generated successfully.' });

        } catch (e: any) {
            console.error('IPA Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, numericHeaders, toast]);
    
    useEffect(() => {
        if (view === 'main' && canRun && !analysisResult && !isLoading) {
            handleAnalysis();
        }
    }, [view, canRun, analysisResult, isLoading, handleAnalysis]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            {isLoading && (
                <Card>
                    <CardContent className="p-6 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="mt-4 text-muted-foreground">Running Importance-Performance Analysis...</p>
                    </CardContent>
                </Card>
            )}

            {results && analysisResult?.plot && (
                <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="dashboard">IPA Dashboard</TabsTrigger>
                        <TabsTrigger value="details">Detailed Tables</TabsTrigger>
                    </TabsList>
                    <TabsContent value="dashboard" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">IPA Dashboard</CardTitle>
                                <CardDescription>A comprehensive visual overview of the Importance-Performance Analysis.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="IPA Dashboard" width={1800} height={1200} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="details" className="mt-4">
                         <Card>
                            <CardHeader><CardTitle>Quadrant Summary & Detailed Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Attribute</TableHead>
                                            <TableHead>Quadrant</TableHead>
                                            <TableHead className="text-right">Importance (Corr.)</TableHead>
                                            <TableHead className="text-right">Performance (Mean)</TableHead>
                                            <TableHead className="text-right">Priority Score</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.ipa_matrix.map(item => (
                                            <TableRow key={item.attribute}>
                                                <TableCell className="font-semibold">{item.attribute}</TableCell>
                                                <TableCell>{item.quadrant}</TableCell>
                                                <TableCell className="text-right font-mono">{item.importance.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{item.performance.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{item.priority_score.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
             {!isLoading && !results && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Ready to Analyze</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Click the button below to run the analysis on the loaded data.</p>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleAnalysis} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2" />Run IPA</>}
                        </Button>
                    </CardFooter>
                </Card>
             )}
        </div>
    );
}

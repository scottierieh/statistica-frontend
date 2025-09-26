
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, BarChart as BarChartIcon } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

// Basic type definitions for the analysis results
interface CfaResults {
    model_name: string;
    fit_indices: { [key: string]: number };
    reliability: { [key: string]: { composite_reliability: number, average_variance_extracted: number } };
    interpretation: string;
}

interface FullAnalysisResponse {
    results: CfaResults;
    plot: string;
    qq_plot: string;
}


const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const cfaExample = exampleDatasets.find(d => d.id === 'cfa-psych-constructs');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <BrainCircuit size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Confirmatory Factor Analysis (CFA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Test how well a pre-specified factor structure fits your observed data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use CFA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            While EFA is for exploring potential underlying structures, CFA is a confirmatory technique used to test a specific hypothesis about the structure of a set of variables. It's a crucial step in scale validation and theory testing, allowing you to determine if your data aligns with a pre-defined model.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {cfaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(cfaExample)}>
                                <cfaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{cfaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{cfaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Define Latent Variables:</strong> Add the latent constructs (factors) you hypothesize (e.g., "Cognitive Ability", "Emotional Well-being").</li>
                                <li><strong>Assign Indicators:</strong> For each latent variable, drag and drop the observed variables (indicators or survey items) that you believe measure it.</li>
                                <li><strong>Run Analysis:</strong> The tool will fit the specified measurement model and provide fit indices and parameter estimates.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Model Fit Indices:</strong> Check if the model fits the data well. Look for CFI/TLI > .90, RMSEA < .08, and SRMR < .08.</li>
                                <li><strong>Factor Loadings:</strong> Standardized loadings should be high (e.g., > 0.5) and statistically significant, confirming that indicators reliably measure their intended latent variable.</li>
                                <li><strong>Reliability and Validity:</strong> Assess Composite Reliability (CR > 0.7) and Average Variance Extracted (AVE > 0.5) for convergent validity, and use the Fornell-Larcker criterion for discriminant validity.</li>
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

interface CfaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CfaPage({ data, numericHeaders, onLoadExample }: CfaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [modelSpec, setModelSpec] = useState<{[key: string]: string[]}>({
        'Latent1': [],
        'Latent2': [],
        'Latent3': []
    });
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data]);

    const handleRunAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch('/api/analysis/cfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, modelSpec })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, modelSpec, toast]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    if (!canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">CFA Model Specification</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Simplified UI for CFA model spec */}
                    <p>CFA model specification UI is complex and not yet implemented in this prototype. Please use the default or load a sample dataset with a pre-defined model.</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleRunAnalysis} disabled={isLoading}>Run Analysis</Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="w-full h-96" />}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>CFA Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Model: {results.model_name}</p>
                            <Image src={analysisResult?.plot || ''} alt="CFA Plot" width={1400} height={700} />
                            {analysisResult?.qq_plot && <Image src={analysisResult.qq_plot} alt="QQ Plot" width={700} height={600} />}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}


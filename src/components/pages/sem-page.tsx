
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BrainCircuit, Network, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';

// Placeholder types for the analysis results
interface SemResults {
    model_name: string;
    fit_indices: {
        chi_square: number;
        df: number;
        p_value: number;
        cfi: number;
        tli: number;
        rmsea: number;
        srmr: number;
    };
    effects: {
        direct_effects: any;
    };
    [key: string]: any;
}

interface FullAnalysisResponse {
    results: SemResults;
    plot: string;
}

interface SemPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    onLoadExample: (example: any) => void;
}

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Structural Equation Modeling (SEM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Test complex relationships between observed and latent variables simultaneously.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use SEM?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           Structural Equation Modeling is a powerful multivariate statistical technique that allows researchers to test and estimate causal relationships. It combines aspects of factor analysis and multiple regression to model complex networks of variables, both observed (directly measured) and latent (unobserved constructs).
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Define Measurement Model:</strong> Specify which observed variables (indicators) measure which latent variables (factors).</li>
                                <li><strong>Define Structural Model:</strong> Specify the hypothesized causal paths between the latent variables.</li>
                                <li><strong>Run Analysis:</strong> The tool will estimate all paths simultaneously and provide overall model fit indices.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Model Fit Indices:</strong> Check if the overall model fits your data. Look for CFI/TLI > .90 and RMSEA/SRMR < .08.</li>
                                <li><strong>Path Coefficients:</strong> Standardized path coefficients represent the strength of the relationships. Significant p-values indicate meaningful paths.</li>
                                <li><strong>Direct & Indirect Effects:</strong> SEM allows you to decompose the total effect of one variable on another into direct and indirect (mediated) paths.</li>
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


const SemSetup = ({ numericHeaders, onRun, isLoading }: { numericHeaders: string[], onRun: (spec: any) => void, isLoading: boolean }) => {
    const [measurementModel, setMeasurementModel] = useState<{[key: string]: string[]}>({ 'Latent1': [], 'Latent2': [] });
    const [structuralModel, setStructuralModel] = useState<{from: string, to: string}[]>([{from: 'Latent1', to: 'Latent2'}]);

    const handleRunClick = () => {
        const modelSpec = {
            measurement_model: measurementModel,
            structural_model: structuralModel.map(p => [p.from, p.to]),
        };
        onRun(modelSpec);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>SEM Setup</CardTitle>
                <CardDescription>Define your measurement and structural models.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Measurement Model (Latent Variables & Indicators)</Label>
                    <div className="space-y-2">
                        {Object.entries(measurementModel).map(([latentVar, indicators]) => (
                            <div key={latentVar} className="p-2 border rounded-md">
                                <Input value={latentVar} readOnly className="font-bold bg-muted" />
                                <ScrollArea className="h-24 mt-2">
                                <div className="grid grid-cols-2 gap-2 p-1">
                                    {numericHeaders.map(h => (
                                        <div key={h} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`${latentVar}-${h}`}
                                                checked={indicators.includes(h)}
                                                onCheckedChange={(checked) => {
                                                    const newModel = {...measurementModel};
                                                    if (checked) {
                                                        newModel[latentVar] = [...indicators, h];
                                                    } else {
                                                        newModel[latentVar] = indicators.filter(item => item !== h);
                                                    }
                                                    setMeasurementModel(newModel);
                                                }}
                                            />
                                            <Label htmlFor={`${latentVar}-${h}`}>{h}</Label>
                                        </div>
                                    ))}
                                </div>
                                </ScrollArea>
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <Label>Structural Model (Paths between Latent Variables)</Label>
                    <div className="space-y-2">
                         {structuralModel.map((path, index) => (
                            <div key={index} className="flex items-center gap-2">
                               <Input value={path.from} readOnly />
                               <span>-&gt;</span>
                               <Input value={path.to} readOnly />
                            </div>
                        ))}
                    </div>
                 </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleRunClick} disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <Sigma className="mr-2" />}
                    Run SEM
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function SemPage({ data, numericHeaders, onLoadExample }: SemPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

    useEffect(() => {
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data]);
    
    const handleAnalysis = async (modelSpec: any) => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch('/api/analysis/sem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, modelSpec })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Analysis failed");
            }
            const result = await response.json();
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ title: "Analysis Error", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const canRun = data.length > 0 && numericHeaders.length > 0;

    if (!canRun || view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }
    
    return (
        <div className="space-y-4">
            <SemSetup numericHeaders={numericHeaders} onRun={handleAnalysis} isLoading={isLoading} />
            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}
            {analysisResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>SEM Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {analysisResult.plot && <Image src={analysisResult.plot} alt="SEM Plot" width={1500} height={700} className="w-full rounded-md border"/>}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

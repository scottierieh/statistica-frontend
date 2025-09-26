
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
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

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

    if (!canRun) {
        return (
             <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Structural Equation Modeling (SEM)</CardTitle>
                        <CardDescription>
                           This complex analysis requires a dataset with multiple numeric variables.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
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

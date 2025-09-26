
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, BarChart as BarChartIcon } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

interface SemResults {
    model_name: string;
    fit_indices: { [key: string]: number };
    effects: { 
      direct_effects: {[key:string]: {estimate: number, p_value: number}},
      indirect_effects: {[key:string]: {estimate: number}},
      total_effects: {[key:string]: {estimate: number}},
      r_squared: {[key:string]: number}
    };
    interpretation?: string;
}

interface FullAnalysisResponse {
    results: SemResults;
    plot: string;
}

interface SemPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SemPage({ data, numericHeaders, onLoadExample }: SemPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('main'); // Start directly in main view
    const [modelSpec, setModelSpec] = useState<{ 
        measurement_model: { [key: string]: string[] },
        structural_model: [string, string][]
    }>({
        measurement_model: { 'Quality': ['sq1', 'sq2', 'sq3'], 'Satisfaction': ['sat1', 'sat2', 'sat3'], 'Trust': ['trust1', 'trust2'], 'Loyalty': ['loy1', 'loy2', 'loy3'] },
        structural_model: [['Quality', 'Satisfaction'], ['Satisfaction', 'Trust'], ['Trust', 'Loyalty']]
    });
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setAnalysisResult(null);
    }, [data, modelSpec]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch('/api/analysis/sem', {
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

    if (!canRun) {
        return (
             <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Structural Equation Modeling</CardTitle>
                        <CardDescription>Upload data to begin building and testing your structural model.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">SEM Model Specification</CardTitle>
                    <CardDescription>Define your measurement and structural models. This UI is a placeholder for a future graphical editor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(modelSpec, null, 2)}
                    </pre>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run SEM Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>SEM Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="SEM Plot" width={1500} height={700} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

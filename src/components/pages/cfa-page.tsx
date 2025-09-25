
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, CheckCircle2, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { produce } from 'immer';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Image from 'next/image';

interface LatentVariable {
    id: string;
    name: string;
    indicators: string[];
}

interface FullAnalysisResponse {
    results: any;
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
                           Unlike Exploratory Factor Analysis (EFA) which discovers underlying structures, CFA is a theory-driven method. You start with a hypothesis about which variables (indicators) belong to which latent factors, and then use CFA to test if your data supports this structure. It's a critical step in validating psychological scales, survey instruments, and theoretical models.
                        </p>
                    </div>
                    {cfaExample && (
                         <div className="flex justify-center">
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(cfaExample)}>
                                <cfaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{cfaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{cfaExample.description}</p>
                                </div>
                            </Card>
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Define Latent Variables:</strong> Specify the names of your unobserved constructs (e.g., 'Cognitive Ability', 'Emotional Stability').</li>
                                <li><strong>Assign Indicators:</strong> For each latent variable, select the observed variables (e.g., specific survey questions) that are supposed to measure it. Each factor must have at least 3 indicators.</li>
                                <li><strong>Run Analysis:</strong> The tool will estimate the model and provide fit indices to evaluate how well your hypothesized structure matches the data.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Model Fit Indices:</strong> These are crucial for evaluating your model. Look for CFI/TLI > .90 (ideally > .95), RMSEA < .08, and SRMR < .08 to indicate a good model fit.</li>
                                <li><strong>Factor Loadings:</strong> All indicators should have high, statistically significant loadings on their respective latent factor, confirming the measurement model.</li>
                                <li><strong>Reliability & Validity:</strong> Check Composite Reliability (CR > 0.7) and Average Variance Extracted (AVE > 0.5) for convergent validity, and the Fornell-Larcker criterion for discriminant validity.</li>
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
    const [latentVariables, setLatentVariables] = useState<LatentVariable[]>([
        { id: `lv-0`, name: 'LatentVar1', indicators: [] }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    useEffect(() => {
        if (canRun) {
            const numVars = numericHeaders.length;
            const numFactors = Math.max(1, Math.min(3, Math.floor(numVars / 3)));
            const itemsPerFactor = Math.floor(numVars / numFactors);

            const newLatentVars: LatentVariable[] = [];
            for (let i = 0; i < numFactors; i++) {
                const start = i * itemsPerFactor;
                const end = (i + 1) * itemsPerFactor;
                newLatentVars.push({
                    id: `lv-${i}`,
                    name: `Factor_${i+1}`,
                    indicators: numericHeaders.slice(start, end)
                });
            }
            if (numVars % numFactors !== 0 && newLatentVars.length > 0) {
                 newLatentVars[newLatentVars.length-1].indicators.push(...numericHeaders.slice(numFactors * itemsPerFactor));
            }
            setLatentVariables(newLatentVars);
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
    }, [data, numericHeaders, canRun]);
    
    // Handlers for Latent Variables
    const addLatentVariable = () => {
        const newId = `lv-${Date.now()}`;
        setLatentVariables(prev => [...prev, { id: newId, name: `LatentVar${prev.length + 1}`, indicators: [] }]);
    };
    const updateLatentVariableName = (id: string, name: string) => {
        setLatentVariables(prev => prev.map(lv => lv.id === id ? { ...lv, name } : lv));
    };
    const toggleIndicator = (lvId: string, indicator: string) => {
        setLatentVariables(produce(draft => {
            let foundLv = draft.find(lv => lv.id === lvId);
            if(foundLv) {
                const index = foundLv.indicators.indexOf(indicator);
                if (index > -1) {
                    foundLv.indicators.splice(index, 1);
                } else {
                    foundLv.indicators.push(indicator);
                }
            }
        }));
    };
    const removeLatentVariable = (id: string) => {
        setLatentVariables(prev => prev.filter(lv => lv.id !== id));
    };

    const handleAnalysis = useCallback(async () => {
        const modelSpec = latentVariables.reduce((acc, lv) => {
            if (lv.name && lv.indicators.length > 0) {
                acc[lv.name] = lv.indicators;
            }
            return acc;
        }, {} as { [key: string]: string[] });

        if (Object.keys(modelSpec).length === 0) {
            toast({ variant: 'destructive', title: 'Invalid Model', description: 'Please define at least one latent variable with indicators.' });
            return;
        }

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
    }, [data, latentVariables, toast]);

    const availableIndicators = numericHeaders;
    const results = analysisResult?.results;

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">CFA Model Builder</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Define your latent variables and assign their observed indicators.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {latentVariables.map((lv) => (
                            <Card key={lv.id}>
                                <CardHeader className="flex-row items-center justify-between pb-2">
                                    <Input value={lv.name} onChange={e => updateLatentVariableName(lv.id, e.target.value)} placeholder="Latent Variable Name" className="text-md font-bold"/>
                                    <Button variant="ghost" size="icon" onClick={() => removeLatentVariable(lv.id)}><Trash2 className="h-4 w-4 text-muted-foreground"/></Button>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-48 border rounded-md p-2">
                                        <div className="space-y-2">
                                            {availableIndicators.map(item => (
                                                <div key={`${lv.id}-${item}`} className="flex items-center space-x-2">
                                                    <Checkbox id={`${lv.id}-${item}`} checked={lv.indicators.includes(item)} onCheckedChange={() => toggleIndicator(lv.id, item)} />
                                                    <label htmlFor={`${lv.id}-${item}`} className="text-sm">{item}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addLatentVariable} className="mt-4"><Plus className="mr-2"/> Add Latent Variable</Button>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                 <div className="space-y-4">
                    {analysisResult?.plot && (
                        <Card>
                            <CardHeader><CardTitle className="font-headline">Analysis Visuals</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                     <Image src={analysisResult.plot} alt="CFA Results Plot" width={700} height={600} className="w-full rounded-md border"/>
                                     <Image src={analysisResult.qq_plot} alt="CFA QQ Plot" width={600} height={600} className="w-full rounded-md border"/>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                 </div>
            )}
        </div>
    );
}

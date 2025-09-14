'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, Plus, Trash2, Wand2, Link, Spline } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface LatentVariable {
    id: string;
    name: string;
    indicators: string[];
}

interface StructuralPath {
    id: string;
    from: string;
    to: string;
}

interface SemPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SemPage({ data, numericHeaders, onLoadExample }: SemPageProps) {
    const { toast } = useToast();
    const [latentVariables, setLatentVariables] = useState<LatentVariable[]>([
        { id: `lv-0`, name: 'LatentVar1', indicators: [] }
    ]);
    const [structuralPaths, setStructuralPaths] = useState<StructuralPath[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 2, [data, numericHeaders]);
    
    // Latent Variable Handlers
    const addLatentVariable = () => {
        const newId = `lv-${Date.now()}`;
        setLatentVariables(prev => [...prev, { id: newId, name: `LatentVar${prev.length + 1}`, indicators: [] }]);
    };

    const updateLatentVariableName = (id: string, name: string) => {
        setLatentVariables(prev => prev.map(lv => lv.id === id ? { ...lv, name } : lv));
    };

    const toggleIndicator = (lvId: string, indicator: string) => {
        setLatentVariables(prev => prev.map(lv => {
            if (lv.id === lvId) {
                const newIndicators = lv.indicators.includes(indicator)
                    ? lv.indicators.filter(i => i !== indicator)
                    : [...lv.indicators, indicator];
                return { ...lv, indicators: newIndicators };
            }
            return lv;
        }));
    };
    
    const removeLatentVariable = (id: string) => {
        const lvToRemove = latentVariables.find(lv => lv.id === id);
        if (!lvToRemove) return;
        setLatentVariables(prev => prev.filter(lv => lv.id !== id));
        // Also remove any structural paths associated with this latent variable
        setStructuralPaths(prev => prev.filter(p => p.from !== lvToRemove.name && p.to !== lvToRemove.name));
    };

    // Structural Path Handlers
    const addStructuralPath = () => {
        setStructuralPaths(prev => [...prev, { id: `sp-${Date.now()}`, from: '', to: '' }]);
    };
    
    const updateStructuralPath = (id: string, part: 'from' | 'to', value: string) => {
        setStructuralPaths(prev => prev.map(p => p.id === id ? { ...p, [part]: value } : p));
    };

    const removeStructuralPath = (id: string) => {
        setStructuralPaths(prev => prev.filter(p => p.id !== id));
    };
    
    const isModelValid = useMemo(() => {
        return latentVariables.every(lv => lv.name.trim() && lv.indicators.length >= 2) &&
               structuralPaths.every(p => p.from && p.to && p.from !== p.to);
    }, [latentVariables, structuralPaths]);

    const handleAnalysis = useCallback(async () => {
        if (!isModelValid) {
            toast({
                variant: 'destructive',
                title: 'Invalid Model Specification',
                description: 'Each latent variable must have a name and at least 2 indicators. All structural paths must be complete and not self-referencing.'
            });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const measurementModel = latentVariables.reduce((acc, lv) => {
            acc[lv.name] = lv.indicators;
            return acc;
        }, {} as { [key: string]: string[] });

        const structuralModel = structuralPaths.map(p => [p.from, p.to]);

        try {
            const response = await fetch('/api/analysis/sem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    modelSpec: {
                        measurement_model: measurementModel,
                        structural_model: structuralModel,
                    }
                })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "SEM analysis finished successfully." });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'SEM Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isModelValid, latentVariables, structuralPaths, data, toast]);


    if (!canRun) {
        const semExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('sem'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Structural Equation Modeling (SEM)</CardTitle>
                        <CardDescription>
                            To perform SEM, you need data with multiple numeric variables. Try an example dataset to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {semExamples.map((ex) => (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Network className="h-6 w-6 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                            Load this data
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const availableIndicators = numericHeaders;
    const latentVariableNames = latentVariables.map(lv => lv.name).filter(Boolean);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">SEM Model Builder</CardTitle>
                    <CardDescription>Define your measurement and structural models.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Measurement Model */}
                    <div>
                        <Label className="text-lg font-semibold flex items-center gap-2"><Spline/> Measurement Model</Label>
                        <p className="text-sm text-muted-foreground mb-4">Define latent variables and assign their indicators.</p>
                        <ScrollArea className="w-full h-[400px] p-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {latentVariables.map((lv) => (
                                    <Card key={lv.id}>
                                        <CardHeader className="flex-row items-center justify-between pb-2">
                                            <Input value={lv.name} onChange={e => updateLatentVariableName(lv.id, e.target.value)} placeholder="Latent Variable Name" className="text-md font-bold"/>
                                            <Button variant="ghost" size="icon" onClick={() => removeLatentVariable(lv.id)} disabled={latentVariables.length <= 1}>
                                                <Trash2 className="h-4 w-4 text-muted-foreground"/>
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-48 border rounded-md p-2">
                                                <div className="space-y-2">
                                                    {availableIndicators.map(item => (
                                                        <div key={`${lv.id}-${item}`} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`${lv.id}-${item}`}
                                                                checked={lv.indicators.includes(item)}
                                                                onCheckedChange={() => toggleIndicator(lv.id, item)}
                                                            />
                                                            <label htmlFor={`${lv.id}-${item}`} className="text-sm">{item}</label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                        <Button variant="outline" size="sm" onClick={addLatentVariable} className="mt-2"><Plus className="mr-2"/> Add Latent Variable</Button>
                    </div>
                     {/* Structural Model */}
                     <div>
                        <Label className="text-lg font-semibold flex items-center gap-2"><Link /> Structural Model</Label>
                        <p className="text-sm text-muted-foreground mb-4">Define the paths between your latent variables.</p>
                        <div className="space-y-2">
                             {structuralPaths.map((path) => (
                                <div key={path.id} className="flex items-center gap-2 p-2 border rounded-lg">
                                    <Select value={path.from} onValueChange={(v) => updateStructuralPath(path.id, 'from', v)}>
                                        <SelectTrigger><SelectValue placeholder="From"/></SelectTrigger>
                                        <SelectContent>{latentVariableNames.filter(n => n !== path.to).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <span className="font-bold">→</span>
                                     <Select value={path.to} onValueChange={(v) => updateStructuralPath(path.id, 'to', v)}>
                                        <SelectTrigger><SelectValue placeholder="To"/></SelectTrigger>
                                        <SelectContent>{latentVariableNames.filter(n => n !== path.from).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" onClick={() => removeStructuralPath(path.id)}>
                                        <Trash2 className="h-4 w-4 text-muted-foreground"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={addStructuralPath} className="mt-2"><Plus className="mr-2"/> Add Path</Button>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!isModelValid || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> <p>Running SEM...</p></CardContent></Card>}
            
            {analysisResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Analysis Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Analysis complete. Displaying detailed results is under development.</p>
                        <pre className="mt-4 p-4 bg-muted rounded-md text-xs overflow-auto h-96">
                            {JSON.stringify(analysisResult, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

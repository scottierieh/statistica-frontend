
'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, BrainCircuit, X, PlusCircle, HelpCircle, Trash2 } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { produce } from 'immer';

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
}

export default function SemPage({ data, numericHeaders }: SemPageProps) {
    const { toast } = useToast();
    const [latentVars, setLatentVars] = useState<LatentVariable[]>([
        { id: `lv-${Date.now()}`, name: 'LatentVar1', indicators: [] }
    ]);
    const [structuralPaths, setStructuralPaths] = useState<StructuralPath[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const addLatentVar = () => {
        setLatentVars(prev => [...prev, { id: `lv-${Date.now()}`, name: `LatentVar${prev.length + 1}`, indicators: [] }]);
    };

    const updateLatentVar = (id: string, name?: string, indicators?: string[]) => {
        setLatentVars(prev => prev.map(lv => {
            if (lv.id === id) {
                return {
                    ...lv,
                    name: name !== undefined ? name : lv.name,
                    indicators: indicators !== undefined ? indicators : lv.indicators,
                };
            }
            return lv;
        }));
    };
    
    const removeLatentVar = (id: string) => {
        setLatentVars(prev => prev.filter(lv => lv.id !== id));
        // Also remove any paths connected to this latent variable
        setStructuralPaths(prev => prev.filter(p => p.from !== id && p.to !== id));
    };

    const addPath = () => {
        if (latentVars.length >= 2) {
            setStructuralPaths(prev => [...prev, { id: `path-${Date.now()}`, from: latentVars[0].id, to: latentVars[1].id }]);
        } else {
            toast({ title: "Cannot Add Path", description: "You need at least two latent variables to create a structural path.", variant: "destructive" });
        }
    };
    
    const updatePath = (id: string, from?: string, to?: string) => {
        setStructuralPaths(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, from: from || p.from, to: to || p.to };
            }
            return p;
        }));
    };

    const removePath = (id: string) => {
        setStructuralPaths(prev => prev.filter(p => p.id !== id));
    };

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        // Basic validation
        if (latentVars.some(lv => lv.name.trim() === '' || lv.indicators.length === 0)) {
            toast({ title: 'Invalid Model', description: 'Each latent variable must have a name and at least one indicator.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        try {
            const modelSpec = {
                measurement_model: latentVars.map(lv => `${lv.name} =~ ${lv.indicators.join(' + ')}`).join('\n'),
                structural_model: structuralPaths.map(p => {
                    const fromName = latentVars.find(lv => lv.id === p.from)?.name;
                    const toName = latentVars.find(lv => lv.id === p.to)?.name;
                    return `${toName} ~ ${fromName}`;
                }).join('\n'),
            };

            const response = await fetch('/api/analysis/sem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, model_spec: modelSpec })
            });

            if (!response.ok) throw new Error('Analysis request failed');
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'SEM results are ready (placeholder).' });

        } catch (e: any) {
            toast({ title: 'Analysis Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [data, latentVars, structuralPaths, toast]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline flex items-center gap-2">
                            <BrainCircuit /> Structural Equation Modeling (SEM)
                        </CardTitle>
                        <Button variant="ghost" size="icon"><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Define your measurement and structural models to test complex relationships.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Measurement Model */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">1. Measurement Model</CardTitle>
                            <CardDescription>Define your latent variables and their indicators (observed variables).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {latentVars.map((lv) => (
                                <div key={lv.id} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex items-center gap-4">
                                        <Input
                                            placeholder="Latent Variable Name"
                                            value={lv.name}
                                            onChange={e => updateLatentVar(lv.id, e.target.value)}
                                            className="font-semibold"
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeLatentVar(lv.id)} disabled={latentVars.length <= 1}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-md">
                                        <Label className="text-xs">Indicators</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                            {numericHeaders.map(h => (
                                                <div key={h} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`${lv.id}-${h}`}
                                                        checked={lv.indicators.includes(h)}
                                                        onChange={(e) => updateLatentVar(lv.id, undefined, e.target.checked ? [...lv.indicators, h] : lv.indicators.filter(i => i !== h))}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <label htmlFor={`${lv.id}-${h}`} className="text-sm">{h}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addLatentVar}>
                                <PlusCircle className="w-4 h-4 mr-2" /> Add Latent Variable
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Structural Model */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">2. Structural Model</CardTitle>
                            <CardDescription>Define the regression paths between your latent variables.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {structuralPaths.map((path) => (
                                <div key={path.id} className="flex items-center gap-2 p-3 border rounded-lg">
                                    <Select value={path.from} onValueChange={(v) => updatePath(path.id, v, undefined)}>
                                        <SelectTrigger><SelectValue placeholder="From..."/></SelectTrigger>
                                        <SelectContent>{latentVars.map(lv => <SelectItem key={lv.id} value={lv.id}>{lv.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="font-bold">→</p>
                                    <Select value={path.to} onValueChange={(v) => updatePath(path.id, undefined, v)}>
                                        <SelectTrigger><SelectValue placeholder="To..."/></SelectTrigger>
                                        <SelectContent>{latentVars.map(lv => <SelectItem key={lv.id} value={lv.id}>{lv.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" onClick={() => removePath(path.id)}>
                                        <X className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addPath} disabled={latentVars.length < 2}>
                                <PlusCircle className="w-4 h-4 mr-2" /> Add Path
                            </Button>
                        </CardContent>
                    </Card>

                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running SEM...</> : <><Sigma className="mr-2"/>Run SEM Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                 <Card>
                    <CardHeader>
                        <CardTitle>SEM Results</CardTitle>
                        <CardDescription>{analysisResult.results.message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">This feature is under development. Full results will be displayed here soon.</p>
                    </CardContent>
                 </Card>
            )}
        </div>
    );
}

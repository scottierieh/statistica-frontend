
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, Plus, Trash2, Wand2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';


// CFA Results Types
interface CfaResults {
    fit_indices: {
        chi_square: number;
        df: number;
        p_value: number;
        cfi: number;
        tli: number;
        rmsea: number;
        srmr: number;
    };
    standardized_solution?: {
        loadings: number[][];
        factor_correlations: number[][];
        r_squared: number[];
    };
    reliability: {
        [key: string]: {
            composite_reliability: number;
            average_variance_extracted: number;
        }
    };
    model_spec: {
        factors: string[];
        indicators: string[];
    };
    convergence: boolean;
}

interface FullCfaResponse {
    results: CfaResults;
    plot: string | null;
}

const getFitInterpretation = (fit: CfaResults['fit_indices']) => {
    const cfiOk = fit.cfi >= 0.95;
    const tliOk = fit.tli >= 0.95;
    const rmseaOk = fit.rmsea <= 0.06;
    const srmrOk = fit.srmr <= 0.08;
    const count = [cfiOk, tliOk, rmseaOk, srmrOk].filter(Boolean).length;
    if (count >= 3) return { level: "Excellent", color: "bg-green-600" };
    if (fit.cfi >= 0.90 && fit.tli >= 0.90 && fit.rmsea <= 0.08 && fit.srmr <= 0.10) return { level: "Good", color: "bg-yellow-500" };
    return { level: "Poor", color: "bg-red-500" };
}

interface Factor {
    id: string;
    name: string;
    items: string[];
}

interface CfaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CfaPage({ data, numericHeaders, onLoadExample }: CfaPageProps) {
    const { toast } = useToast();
    const [factors, setFactors] = useState<Factor[]>([{id: `factor-0`, name: 'Factor 1', items: []}]);
    
    const [analysisResult, setAnalysisResult] = useState<FullCfaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        setFactors([{id: `factor-0`, name: 'Factor 1', items: []}]);
        setAnalysisResult(null);
    }, [numericHeaders, data]);
    
    const canRunAnalysis = useMemo(() => {
        return data.length > 0 && factors.length > 0 && factors.every(f => f.items.length > 0 && f.name.trim() !== '');
    }, [data, factors]);

    const handleAddFactor = () => {
        setFactors(prev => [...prev, { id: `factor-${prev.length}`, name: `Factor ${prev.length + 1}`, items: [] }]);
    };
    
    const handleRemoveFactor = (id: string) => {
        setFactors(prev => prev.filter(f => f.id !== id));
    };
    
    const handleFactorNameChange = (id: string, newName: string) => {
        setFactors(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    };
    
    const handleItemSelectionChange = (factorId: string, item: string, checked: boolean) => {
        setFactors(prev => prev.map(f => {
            if (f.id === factorId) {
                const newItems = checked ? [...f.items, item] : f.items.filter(i => i !== item);
                return { ...f, items: newItems };
            }
            return f;
        }));
    };
    
    const handleAutoSpec = () => {
        toast({ title: 'Automatic Specification', description: 'This feature (running EFA to suggest factors) is coming soon!' });
    };

    const handleAnalysis = useCallback(async () => {
        if (!canRunAnalysis) {
            toast({ variant: 'destructive', title: 'Model Specification Error', description: 'Please ensure every factor has a name and at least one item.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const modelSpec = factors.reduce((acc, factor) => {
            acc[factor.name] = factor.items;
            return acc;
        }, {} as { [key: string]: string[] });

        try {
            const response = await fetch('/api/analysis/cfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, modelSpec, modelName: 'cfa_model' })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullCfaResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'CFA Complete', description: result.results.convergence ? 'Model converged successfully.' : 'Model did not converge.' });

        } catch (e: any) {
            console.error('CFA Analysis error:', e);
            toast({ variant: 'destructive', title: 'CFA Analysis Error', description: e.message || 'An unexpected error occurred.' });
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, factors, canRunAnalysis, toast]);
    
    const canRunPage = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    if (!canRunPage) {
        const cfaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('cfa'));
        return (
             <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Confirmatory Factor Analysis (CFA)</CardTitle>
                        <CardDescription>
                           To perform CFA, you need data with at least 3 numeric variables. Try one of our example datasets.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cfaExamples.map((ex) => {
                                const Icon = ex.icon;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-6 w-6 text-secondary-foreground" />
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
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">CFA Model Specification</CardTitle>
                    <CardDescription>Define your measurement model by creating factors and assigning variables to them.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Label>Number of Factors</Label>
                        <div className='flex gap-2 items-center'>
                           <Input 
                                type="number" 
                                value={factors.length}
                                onChange={(e) => {
                                    const newCount = parseInt(e.target.value, 10);
                                    if (newCount > factors.length) {
                                        const toAdd = newCount - factors.length;
                                        const newFactors = Array.from({length: toAdd}, (_, i) => ({
                                            id: `factor-${factors.length + i}`,
                                            name: `Factor ${factors.length + i + 1}`,
                                            items: []
                                        }));
                                        setFactors(prev => [...prev, ...newFactors]);
                                    } else if (newCount < factors.length) {
                                        setFactors(prev => prev.slice(0, newCount));
                                    }
                                }}
                                min="1" 
                                className="w-24"
                           />
                           <Button variant="outline" size="icon" onClick={handleAddFactor}><Plus/></Button>
                        </div>
                    </div>

                    <ScrollArea className="w-full h-[400px] p-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {factors.map((factor, idx) => (
                                <Card key={factor.id}>
                                    <CardHeader className="flex-row items-center justify-between">
                                        <Input value={factor.name} onChange={(e) => handleFactorNameChange(factor.id, e.target.value)} className="text-lg font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"/>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFactor(factor.id)} disabled={factors.length <= 1}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground"/>
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-48 border rounded-md p-2">
                                            <div className="space-y-2">
                                                {numericHeaders.map(item => (
                                                    <div key={`${factor.id}-${item}`} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`${factor.id}-${item}`}
                                                            checked={factor.items.includes(item)}
                                                            onCheckedChange={(checked) => handleItemSelectionChange(factor.id, item, checked as boolean)}
                                                        />
                                                        <label htmlFor={`${factor.id}-${item}`} className="text-sm">{item}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={handleAutoSpec}><Wand2 className="mr-2" /> Auto-specify (EFA)</Button>
                        <Button onClick={handleAnalysis} disabled={!canRunAnalysis || isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            {isLoading && <Card><CardHeader><Skeleton className="h-96 w-full"/></CardHeader></Card>}

            {analysisResult && results && (
                <>
                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle className="font-headline">Model Fit Summary</CardTitle>
                                <CardDescription>Overall assessment of how well the specified model fits the data. <Badge className={`${getFitInterpretation(results.fit_indices).color} text-white`}>{getFitInterpretation(results.fit_indices).level}</Badge></CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">CFI</p>
                                        <p className="text-2xl font-bold">{results.fit_indices.cfi.toFixed(3)}</p>
                                    </div>
                                     <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">TLI</p>
                                        <p className="text-2xl font-bold">{results.fit_indices.tli?.toFixed(3) ?? 'N/A'}</p>
                                    </div>
                                     <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">RMSEA</p>
                                        <p className="text-2xl font-bold">{results.fit_indices.rmsea.toFixed(3)}</p>
                                    </div>
                                     <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">SRMR</p>
                                        <p className="text-2xl font-bold">{results.fit_indices.srmr.toFixed(3)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-4">
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Standardized Factor Loadings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead>Indicator</TableHead><TableHead className="text-right">Loading</TableHead><TableHead className="text-right">R²</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {results.model_spec.factors.map((factor, fIndex) => {
                                            const factorItems = factors.find(f=>f.name === factor)?.items || [];
                                            return factorItems.map((item, iIndex) => {
                                                const itemIndex = results.model_spec.indicators.indexOf(item);
                                                if(itemIndex === -1 || !results.standardized_solution) return null;
                                                const loading = results.standardized_solution.loadings[itemIndex]?.[fIndex] ?? 0;
                                                const rSquared = loading * loading;
                                                return (
                                                    <TableRow key={`${fIndex}-${iIndex}`}>
                                                        {iIndex === 0 && <TableCell rowSpan={factorItems.length} className="font-semibold align-top">{factor}</TableCell>}
                                                        <TableCell>{item}</TableCell>
                                                        <TableCell className="text-right font-mono">{loading.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{rSquared.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className="space-y-4">
                            {results.model_spec.factors.length > 1 && (
                                 <Card>
                                    <CardHeader><CardTitle className="font-headline">Factor Correlations</CardTitle></CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead></TableHead>
                                                    {results.model_spec.factors.map(f => <TableHead key={f} className="text-center">{f}</TableHead>)}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.model_spec.factors.map((f1, i) => (
                                                    <TableRow key={f1}>
                                                        <TableHead>{f1}</TableHead>
                                                        {results.model_spec.factors.map((f2, j) => (
                                                            <TableCell key={f2} className="text-center font-mono">
                                                                {i === j ? '1.00' : results.standardized_solution?.factor_correlations[i][j]?.toFixed(3) ?? '-'}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            <Card>
                                <CardHeader><CardTitle className="font-headline">Factor Reliability</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead className="text-right">Composite Reliability (CR)</TableHead><TableHead className="text-right">Avg. Variance Extracted (AVE)</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.reliability).map(([factor, rel]) => (
                                                <TableRow key={factor}>
                                                    <TableCell className="font-semibold">{factor}</TableCell>
                                                    <TableCell className="text-right font-mono">{rel.composite_reliability.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{rel.average_variance_extracted.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}

             {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <BrainCircuit className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Define your factors and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}

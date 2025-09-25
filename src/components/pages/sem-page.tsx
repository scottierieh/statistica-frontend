
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, Plus, Trash2, Link, Spline, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

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

// --- CFA/SEM Results Types ---
interface FitIndices {
    chi_square: number;
    df: number;
    p_value?: number; // Kept from CFA, might not exist in SEM py
    chi_square_p?: number; // From SEM py
    cfi: number;
    tli: number;
    rmsea: number;
    srmr: number;
}

interface ParameterEstimates {
    loadings: { [key: string]: number };
    structural_paths: { [key: string]: number };
    error_variances: { [key: string]: number };
    disturbances: { [key: string]: number };
    factor_variances: { [key: string]: number };
    factor_covariances: { [key: string]: number };
}

interface Effect {
    estimate: number;
    se?: number;
    z_value?: number;
    p_value?: number;
}

interface SemResults {
    model_name: string;
    model_spec: {
        name: string;
        measurement_model: { [key: string]: string[] };
        structural_model: [string, string][];
        observed_variables: string[];
        latent_variables: string[];
        n_observed: number;
        n_latent: number;
    };
    n_observations: number;
    parameter_estimates: ParameterEstimates;
    fit_indices: FitIndices;
    effects: {
        direct_effects: { [path: string]: Effect };
        indirect_effects: { [path: string]: Effect };
        total_effects: { [path: string]: Effect };
        r_squared: { [variable: string]: number };
    };
    reliability: {
        [key: string]: {
            composite_reliability: number;
            average_variance_extracted: number;
        }
    };
}


interface FullAnalysisResponse {
    results: SemResults;
    plot: string | null;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const semExample = exampleDatasets.find(d => d.id === 'sem-satisfaction');
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
                        A powerful multivariate statistical analysis technique that combines factor analysis and multiple regression to test complex theoretical models.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use SEM?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            SEM allows you to test an entire theory or model in a single analysis. It's used to examine the relationships between observed variables (indicators) and unobserved latent variables, as well as the causal relationships between the latent variables themselves. This makes it ideal for fields like psychology, sociology, and marketing where researchers want to test complex theoretical frameworks.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {semExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(semExample)}>
                                <semExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{semExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{semExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Measurement Model:</strong> Define your latent variables (constructs) and assign their observed indicators (the survey questions or measurements). Each latent variable should have at least 2-3 indicators.
                                </li>
                                <li>
                                    <strong>Structural Model:</strong> Specify the causal paths (hypothesized relationships) between your latent variables.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will estimate all the paths in your model and provide fit indices to assess how well your theoretical model fits the observed data.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Model Fit Indices:</strong> These are crucial. Look for CFI/TLI > 0.90 (ideally > 0.95), RMSEA < 0.08, and SRMR < 0.08 to indicate a good model fit.
                                </li>
                                <li>
                                    <strong>Path Coefficients (β):</strong> These are like regression coefficients. A significant, standardized coefficient shows the strength and direction of the relationship between two latent variables.
                                </li>
                                <li>
                                    <strong>Factor Loadings:</strong> Check that all indicators load significantly and strongly onto their respective latent variables, confirming your measurement model.
                                </li>
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

const getFitInterpretation = (fit: FitIndices | undefined) => {
    if (!fit) return { level: "Unknown", color: "bg-gray-400" };
    const cfiOk = fit.cfi >= 0.95;
    const tliOk = fit.tli >= 0.95;
    const rmseaOk = fit.rmsea <= 0.06;
    const srmrOk = fit.srmr <= 0.08;
    const count = [cfiOk, tliOk, rmseaOk, srmrOk].filter(Boolean).length;
    if (count >= 3) return { level: "Excellent", color: "bg-green-600" };
    if (fit.cfi >= 0.90 && fit.tli >= 0.90 && fit.rmsea <= 0.08 && fit.srmr <= 0.10) return { level: "Good", color: "bg-yellow-500" };
    return { level: "Poor", color: "bg-red-500" };
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

interface SemPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SemPage({ data, numericHeaders, onLoadExample }: SemPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [latentVariables, setLatentVariables] = useState<LatentVariable[]>([
        { id: `lv-0`, name: 'LatentVar1', indicators: [] }
    ]);
    const [structuralPaths, setStructuralPaths] = useState<StructuralPath[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

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

    const availableIndicators = numericHeaders;
    const latentVariableNames = latentVariables.map(lv => lv.name).filter(Boolean);
    const results = analysisResult?.results;

    const EffectsTable = ({ title, effects }: { title: string, effects: { [path: string]: Effect } }) => {
        if (!effects || Object.keys(effects).length === 0) return null;
        return (
            <Card>
                <CardHeader><CardTitle className="font-headline">{title}</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Path</TableHead><TableHead className="text-right">Estimate</TableHead><TableHead className="text-right">p-value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {Object.entries(effects).map(([path, effect]) => (
                                <TableRow key={path}>
                                    <TableCell>{path}</TableCell>
                                    <TableCell className="font-mono text-right">{effect.estimate.toFixed(3)}</TableCell>
                                    <TableCell className="font-mono text-right">{effect.p_value?.toFixed(4) ?? 'N/A'} {getSignificanceStars(effect.p_value)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    };
    
    useEffect(() => {
        if (data.length > 0) {
            setView('main');
        } else {
            setView('intro');
        }
    }, [data]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">SEM Model Builder</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Define your measurement and structural models.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Measurement Model */}
                    <div>
                        <Label className="text-lg font-semibold flex items-center gap-2"><Spline/> 1. Measurement Model (Latent Variables & Indicators)</Label>
                        <p className="text-sm text-muted-foreground mb-4">Define latent variables (unobserved constructs) and assign their observed indicators (your data columns).</p>
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
                        <Label className="text-lg font-semibold flex items-center gap-2"><Link /> 2. Structural Model (Paths between Latent Variables)</Label>
                        <p className="text-sm text-muted-foreground mb-4">Define the causal paths (parameters) between your latent variables.</p>
                        <div className="space-y-2">
                             {structuralPaths.map((path) => (
                                <div key={path.id} className="flex items-center gap-2 p-2 border rounded-lg">
                                    <Select value={path.from} onValueChange={(v) => updateStructuralPath(path.id, 'from', v)}>
                                        <SelectTrigger><SelectValue placeholder="From (Predictor)"/></SelectTrigger>
                                        <SelectContent>{latentVariableNames.filter(n => n !== path.to).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <span className="font-bold">→</span>
                                     <Select value={path.to} onValueChange={(v) => updateStructuralPath(path.id, 'to', v)}>
                                        <SelectTrigger><SelectValue placeholder="To (Outcome)"/></SelectTrigger>
                                        <SelectContent>{latentVariableNames.filter(n => n !== path.from).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" onClick={() => removeStructuralPath(path.id)}>
                                        <Trash2 className="h-4 w-4 text-muted-foreground"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={addStructuralPath} className="mt-2"><Plus className="mr-2"/> Add Path (Parameter)</Button>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!isModelValid || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> <p>Running SEM...</p></CardContent></Card>}
            
             {results ? (
                <div className="space-y-4">
                    {analysisResult?.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Analysis Summary Plot</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="SEM Results Plot" width={1500} height={700} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Fit Summary</CardTitle>
                            <CardDescription>
                                Overall assessment of how well the specified model fits the data. <Badge className={`${getFitInterpretation(results.fit_indices).color} text-white`}>{getFitInterpretation(results.fit_indices).level}</Badge>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">CFI</p><p className="text-2xl font-bold">{results.fit_indices.cfi.toFixed(3)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">TLI</p><p className="text-2xl font-bold">{results.fit_indices.tli?.toFixed(3) ?? 'N/A'}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">RMSEA</p><p className="text-2xl font-bold">{results.fit_indices.rmsea.toFixed(3)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">SRMR</p><p className="text-2xl font-bold">{results.fit_indices.srmr.toFixed(3)}</p></div>
                            </div>
                             <p className="text-xs text-muted-foreground mt-4 text-center">
                                χ²({results.fit_indices.df}) = {results.fit_indices.chi_square.toFixed(2)}, p = {(results.fit_indices.p_value ?? results.fit_indices.chi_square_p ?? 0).toFixed(3)}
                             </p>
                        </CardContent>
                    </Card>
                    
                    <div className="grid lg:grid-cols-3 gap-4">
                        <EffectsTable title="Direct Effects" effects={results.effects.direct_effects} />
                        <EffectsTable title="Indirect Effects" effects={results.effects.indirect_effects} />
                        <EffectsTable title="Total Effects" effects={results.effects.total_effects} />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="font-headline">Measurement Model (Loadings)</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Latent</TableHead><TableHead>Indicator</TableHead><TableHead className="text-right">Loading</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.entries(results.model_spec.measurement_model).map(([latent, indicators]) =>
                                            indicators.map((indicator, index) => (
                                                <TableRow key={`${latent}-${indicator}`}>
                                                    {index === 0 && <TableCell rowSpan={indicators.length} className="font-semibold align-top">{latent}</TableCell>}
                                                    <TableCell>{indicator}</TableCell>
                                                    <TableCell className="font-mono text-right">
                                                        {index === 0 ? '1.000 (Fixed)' : results.parameter_estimates.loadings[`${latent}_${indicator}`]?.toFixed(3) ?? 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        
                        {results.effects && Object.keys(results.effects.r_squared).length > 0 && (
                            <Card>
                                <CardHeader><CardTitle className="font-headline">Explained Variance (R²)</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Endogenous Variable</TableHead><TableHead className="text-right">R²</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.effects.r_squared).map(([variable, r2]) => (
                                                <TableRow key={variable}>
                                                    <TableCell>{variable}</TableCell>
                                                    <TableCell className="font-mono text-right">{r2.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                        
                    </div>
                </div>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <p>Build your model and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    )
}

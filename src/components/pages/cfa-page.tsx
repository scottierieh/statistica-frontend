

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, Plus, Trash2, Wand2, Check, X, Bot, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';


// CFA Results Types
interface FitIndices {
    chi_square: number;
    df: number;
    p_value: number;
    cfi: number;
    tli: number;
    rmsea: number;
    srmr: number;
}

interface StandardizedSolution {
    loadings: { [key: string]: number };
    factor_correlations: number[][];
    r_squared: { [key: string]: number };
}

interface ParameterEstimates {
    all_parameters: number[];
    converged: boolean;
    disturbances: { [key: string]: number };
    error_variances: { [key: string]: number };
    factor_covariances: { [key: string]: number };
    factor_variances: { [key: string]: number };
    loadings: { [key: string]: number };
    objective_value: number;
    structural_paths: { [key: string]: number };
}

interface CfaResults {
    model_name: string;
    model_spec: {
        factors: string[];
        indicators: string[];
    };
    n_observations: number;
    parameters: ParameterEstimates;
    standardized_solution?: StandardizedSolution;
    fit_indices: FitIndices;
    reliability: {
        [key: string]: {
            composite_reliability: number;
            average_variance_extracted: number;
        }
    };
    discriminant_validity: {
        fornell_larcker_criterion?: { [key: string]: { [key: string]: number } };
        message?: string;
    };
    convergence: boolean;
    interpretation?: string;
}

interface FullCfaResponse {
    results: CfaResults;
    plot: string | null;
    qq_plot: string | null;
}

interface Factor {
    id: string;
    name: string;
    items: string[];
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
                        Test and confirm a pre-specified theoretical model by evaluating how well it fits your observed data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use CFA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           Unlike EFA which is exploratory, CFA is a confirmatory technique used to test a hypothesis about the structure of latent variables. It is a crucial step in validating a measurement instrument (like a survey or test) by confirming that its items load onto their intended factors and that the overall model provides a good fit to the data.
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
                                <li>
                                    <strong>Define Factors:</strong> Create the latent variables (constructs) that you hypothesize exist in your data (e.g., 'Cognitive', 'Emotional').
                                </li>
                                <li>
                                    <strong>Assign Indicators:</strong> For each factor, select the observed variables (items from your dataset) that you believe measure that specific construct.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will estimate the model parameters and provide a range of fit indices to evaluate your model.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Model Fit Indices:</strong> Check values like CFI, TLI, RMSEA, and SRMR to assess overall model fit. Good fit (e.g., CFI > .95, RMSEA < .06) supports your hypothesized structure.
                                </li>
                                 <li>
                                    <strong>Factor Loadings:</strong> Verify that each indicator loads significantly and substantially onto its intended factor.
                                </li>
                                <li>
                                    <strong>Convergent & Discriminant Validity:</strong> Use Composite Reliability (CR), Average Variance Extracted (AVE), and the Fornell-Larcker criterion to ensure your factors are both reliable and distinct from one another.
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

const InterpretationDisplay = ({ results }: { results?: CfaResults }) => {
    if (!results?.interpretation) return null;
    
    const isFitGood = results.fit_indices.cfi > 0.9 && results.fit_indices.rmsea < 0.08 && results.fit_indices.srmr < 0.08;

    const formattedInterpretation = useMemo(() => {
        return results.interpretation
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>');
    }, [results.interpretation]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Bot /> Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant={isFitGood ? 'default' : 'destructive'}>
                    {isFitGood ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{isFitGood ? "Good Model Fit" : "Potential Model Fit Issues"}</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation || '' }} />
                </Alert>
            </CardContent>
        </Card>
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
    const [factors, setFactors] = useState<Factor[]>([{id: `factor-0`, name: 'Factor 1', items: []}]);
    
    const [analysisResult, setAnalysisResult] = useState<FullCfaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        setFactors([{id: `factor-0`, name: 'Factor 1', items: []}]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders, data]);
    
    const canRunAnalysis = useMemo(() => {
        return data.length > 0 && factors.length > 0 && factors.every(f => f.items.length >= 2 && f.name.trim() !== '');
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
            toast({ variant: 'destructive', title: 'Model Specification Error', description: 'Please ensure every factor has a name and at least two items.' });
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
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    const renderDiscriminantValidityTable = () => {
        if (!results?.discriminant_validity?.fornell_larcker_criterion) return null;
        const matrix = results.discriminant_validity.fornell_larcker_criterion;
        const factorsList = Object.keys(matrix).sort();
        
        return (
            <Table>
                <TableHeader><TableRow><TableHead></TableHead>{factorsList.map(f=><TableHead key={f} className="text-center">{f}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                    {factorsList.map((f1, i) => (
                        <TableRow key={f1}>
                            <TableHead>{f1}</TableHead>
                            {factorsList.map((f2, j) => {
                                const val = matrix[f1]?.[f2];
                                const isDiagonal = i === j;
                                const isBelowDiagonal = j < i;
                                const isDiscriminantValid = isBelowDiagonal && matrix[f1][f1] > Math.abs(val);
                                
                                return (
                                <TableCell key={f2} className="text-center font-mono">
                                    {isDiagonal ? (
                                        <span className="font-bold">({val?.toFixed(3)})</span>
                                    ) : isBelowDiagonal ? (
                                        <span className={isDiscriminantValid ? 'text-green-600' : 'text-destructive'}>{val?.toFixed(3)}</span>
                                    ) : (
                                        <span className="text-muted-foreground">{val?.toFixed(3)}</span>
                                    )}
                                </TableCell>
                            )})}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    const fitIndices = results?.fit_indices;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">CFA Model Specification</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
                                        <Input value={factor.name} onChange={(e) => handleFactorNameChange(factor.id, e.target.value)} placeholder="Latent Variable Name" className="text-lg font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"/>
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
                    <InterpretationDisplay results={results} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                       <Card>
                          <CardHeader><CardTitle>Model Fit & Diagnostics</CardTitle></CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <Table>
                                <TableHeader><TableRow><TableHead>Index</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Assessment</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>CFI</TableCell><TableCell className="text-right font-mono">{fitIndices?.cfi.toFixed(3)}</TableCell><TableCell><Badge variant={fitIndices && fitIndices.cfi > 0.9 ? 'default' : 'destructive'}>{fitIndices && fitIndices.cfi > 0.9 ? 'Good' : 'Poor'}</Badge></TableCell></TableRow>
                                    <TableRow><TableCell>TLI</TableCell><TableCell className="text-right font-mono">{fitIndices?.tli.toFixed(3)}</TableCell><TableCell><Badge variant={fitIndices && fitIndices.tli > 0.9 ? 'default' : 'destructive'}>{fitIndices && fitIndices.tli > 0.9 ? 'Good' : 'Poor'}</Badge></TableCell></TableRow>
                                    <TableRow><TableCell>RMSEA</TableCell><TableCell className="text-right font-mono">{fitIndices?.rmsea.toFixed(3)}</TableCell><TableCell><Badge variant={fitIndices && fitIndices.rmsea < 0.08 ? 'default' : 'destructive'}>{fitIndices && fitIndices.rmsea < 0.08 ? 'Good' : 'Poor'}</Badge></TableCell></TableRow>
                                    <TableRow><TableCell>SRMR</TableCell><TableCell className="text-right font-mono">{fitIndices?.srmr.toFixed(3)}</TableCell><TableCell><Badge variant={fitIndices && fitIndices.srmr < 0.08 ? 'default' : 'destructive'}>{fitIndices && fitIndices.srmr < 0.08 ? 'Good' : 'Poor'}</Badge></TableCell></TableRow>
                                    <TableRow><TableCell>χ²(df={fitIndices?.df})</TableCell><TableCell className="text-right font-mono">{fitIndices?.chi_square.toFixed(2)}</TableCell><TableCell><Badge variant={fitIndices && fitIndices.p_value > 0.05 ? 'default' : 'destructive'}>p {(fitIndices?.p_value || 0).toFixed(3)}</Badge></TableCell></TableRow>
                                </TableBody>
                            </Table>
                             {analysisResult.qq_plot && (
                                <div className="flex flex-col items-center">
                                    <Label className="mb-2">Q-Q Plot of Residuals</Label>
                                    <Image src={analysisResult.qq_plot} alt="Q-Q Plot" width={300} height={300} className="rounded-md border" />
                                </div>
                            )}
                          </CardContent>
                       </Card>

                        {analysisResult.plot && (
                           <Card>
                                <CardHeader><CardTitle>Analysis Visuals</CardTitle></CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plot} alt="CFA summary plot" width={700} height={300} className="w-full rounded-md border" />
                                </CardContent>
                           </Card>
                        )}
                    </div>
                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Reliability & Convergent Validity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead className="text-right">CR</TableHead><TableHead className="text-right">AVE</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.entries(results.reliability).map(([factor, rel]) => (
                                            <TableRow key={factor}>
                                                <TableCell className="font-semibold">{factor}</TableCell>
                                                <TableCell className="text-right font-mono flex justify-end items-center gap-2">
                                                    {rel.composite_reliability.toFixed(3)} {rel.composite_reliability >= 0.7 ? <Check className="w-4 h-4 text-green-600"/> : <X className="w-4 h-4 text-destructive"/>}
                                                </TableCell>
                                                <TableCell className="text-right font-mono flex justify-end items-center gap-2">
                                                    {rel.average_variance_extracted.toFixed(3)} {rel.average_variance_extracted >= 0.5 ? <Check className="w-4 h-4 text-green-600"/> : <X className="w-4 h-4 text-destructive"/>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <CardDescription className="text-xs mt-2">CR &gt; 0.7 and AVE &gt; 0.5 are generally acceptable.</CardDescription>
                            </CardContent>
                        </Card>
                         {results.discriminant_validity.fornell_larcker_criterion && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Discriminant Validity</CardTitle>
                                    <CardDescription>Fornell-Larcker: Diagonal (√AVE) should be &gt; off-diagonal correlations.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {renderDiscriminantValidityTable()}
                                </CardContent>
                            </Card>
                         )}
                    </div>
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Indicator Validity (Factor Loadings)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Latent Factor</TableHead>
                                        <TableHead>Indicator</TableHead>
                                        <TableHead className="text-right">Standardized Loading</TableHead>
                                        <TableHead className="text-right">SE</TableHead>
                                        <TableHead className="text-right">95% CI</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.model_spec.factors.map((factor) => {
                                        const factorItems = factors.find(f => f.name === factor)?.items || [];
                                        return factorItems.map((item, iIndex) => {
                                            const loading = results.standardized_solution?.loadings[`${factor}_${item}`] ?? (iIndex === 0 ? 1 : 0); // Fixed loadings are 1
                                            
                                            return (
                                                <TableRow key={`${factor}-${item}`}>
                                                    {iIndex === 0 && <TableCell rowSpan={factorItems.length} className="font-semibold align-top">{factor}</TableCell>}
                                                    <TableCell>{item}</TableCell>
                                                    <TableCell className="text-right font-mono">{loading.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground">N/A</TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground">N/A</TableCell>
                                                </TableRow>
                                            );
                                        });
                                    })}
                                </TableBody>
                            </Table>
                             <CardDescription className="text-xs mt-2">Note: Standard Errors and CIs for loadings are not available with this estimation method.</CardDescription>
                        </CardContent>
                    </Card>
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

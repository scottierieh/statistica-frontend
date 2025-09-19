

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, Plus, Trash2, Wand2, Check, X, Bot, AlertTriangle } from 'lucide-react';
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
    loadings: number[][];
    factor_correlations: number[][];
    r_squared: { [key: string]: number };
}

interface ParameterEstimates {
    loadings: { [key: string]: number };
    phi: { [key: string]: number };
    theta: { [key: string]: number };
}

interface CfaResults {
    fit_indices: FitIndices;
    standardized_solution?: StandardizedSolution;
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
    model_spec: {
        factors: string[];
        indicators: string[];
    };
    parameters: ParameterEstimates;
    convergence: boolean;
    interpretation?: string;
}

interface FullCfaResponse {
    results: CfaResults;
    plot: string | null;
}

interface Factor {
    id: string;
    name: string;
    items: string[];
}

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
    const [factors, setFactors] = useState<Factor[]>([{id: `factor-0`, name: 'Factor 1', items: []}]);
    
    const [analysisResult, setAnalysisResult] = useState<FullCfaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        setFactors([{id: `factor-0`, name: 'Factor 1', items: []}]);
        setAnalysisResult(null);
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
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                        <CardDescription className="text-xs">{ex.description}</CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                            <Icon className="mr-2 h-4 w-4" />
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

    const renderDiscriminantValidityTable = () => {
        if (!results?.discriminant_validity?.fornell_larcker_criterion) return null;
        const matrix = results.discriminant_validity.fornell_larcker_criterion;
        const factors = Object.keys(matrix).sort();
        
        return (
            <Table>
                <TableHeader><TableRow><TableHead></TableHead>{factors.map(f=><TableHead key={f} className="text-center">{f}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                    {factors.map((f1, i) => (
                        <TableRow key={f1}>
                            <TableHead>{f1}</TableHead>
                            {factors.map((f2, j) => {
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
                    {analysisResult.plot && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="CFA Results Plot" width={1400} height={1000} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                    <div className="grid lg:grid-cols-2 gap-4">
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Indicator Validity (Factor Loadings)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead>Indicator</TableHead><TableHead>Loading</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {results.model_spec.factors.map((factor, fIndex) => {
                                            const factorItems = factors.find(f=>f.name === factor)?.items || [];
                                            return factorItems.map((item, iIndex) => {
                                                const itemIndex = results.model_spec.indicators.indexOf(item);
                                                if(itemIndex === -1 || !results.standardized_solution) return null;
                                                
                                                const loading = results.standardized_solution.loadings[itemIndex]?.[fIndex] ?? 0;

                                                return (
                                                    <TableRow key={`${fIndex}-${iIndex}`}>
                                                        {iIndex === 0 && <TableCell rowSpan={factorItems.length} className="font-semibold align-top">{factor}</TableCell>}
                                                        <TableCell>{item}</TableCell>
                                                        <TableCell className="font-mono">{loading.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className="space-y-4">
                            <Card>
                                <CardHeader><CardTitle className="font-headline">Reliability & Convergent Validity</CardTitle></CardHeader>
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
                                    <CardDescription className="text-xs mt-2">CR > 0.7 and AVE > 0.5 are generally acceptable.</CardDescription>
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
                              {results.standardized_solution?.factor_correlations && (
                                <Card>
                                     <CardHeader><CardTitle className="font-headline">Latent Factor Correlations</CardTitle></CardHeader>
                                     <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead></TableHead>{results.model_spec.factors.map(f => <TableHead key={f} className="text-center">{f}</TableHead>)}</TableRow></TableHeader>
                                            <TableBody>
                                                {results.model_spec.factors.map((f1, i) => (
                                                    <TableRow key={f1}>
                                                        <TableHead>{f1}</TableHead>
                                                        {results.model_spec.factors.map((f2, j) => (
                                                            <TableCell key={f2} className="text-center font-mono">
                                                                {results.standardized_solution?.factor_correlations[i][j].toFixed(3)}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                     </CardContent>
                                </Card>
                              )}
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

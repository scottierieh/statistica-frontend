
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, AlertCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// Type definitions for the EFA results
interface EfaResults {
    adequacy: {
        kmo: number;
        kmo_interpretation: string;
        bartlett_statistic: number;
        bartlett_p_value: number;
        bartlett_significant: boolean;
    };
    eigenvalues: number[];
    factor_loadings: number[][];
    variance_explained: {
        per_factor: number[];
        cumulative: number[];
    };
    variables: string[];
    n_factors: number;
}


const AdequacyBadge = ({ level }: { level: string }) => {
    const variant = {
        'Excellent': 'default',
        'Good': 'default',
        'Acceptable': 'secondary',
        'Questionable': 'destructive',
        'Poor': 'destructive',
        'Unacceptable': 'destructive'
    }[level] || 'outline';

    return <Badge variant={variant as any}>{level}</Badge>
}

interface EfaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function EfaPage({ data, numericHeaders, onLoadExample }: EfaPageProps) {
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [nFactors, setNFactors] = useState<number>(3);
    const [analysisResult, setAnalysisResult] = useState<EfaResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
    }, [numericHeaders, data]);
    
    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length >= 3;
    }, [data, numericHeaders]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => 
            checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 3) {
            toast({variant: 'destructive', title: 'Selection Error', description: 'Please select at least 3 variables for EFA.'});
            return;
        }
        if (nFactors < 1 || nFactors >= selectedItems.length) {
            toast({variant: 'destructive', title: 'Factor Number Error', description: `Number of factors must be between 1 and ${selectedItems.length - 1}.`});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/efa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data,
                    items: selectedItems,
                    nFactors: nFactors,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.error) {
              throw new Error(result.error);
            }
            setAnalysisResult(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nFactors, toast]);

    if (!canRun) {
        const efaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('efa'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Exploratory Factor Analysis (EFA)</CardTitle>
                        <CardDescription>
                           To perform EFA, you need data with multiple numeric variables (e.g., survey items). Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {efaExamples.map((ex) => {
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
    
    const screeData = analysisResult?.eigenvalues.map((ev, i) => ({ name: `Factor ${i + 1}`, Eigenvalue: ev }));

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">EFA Setup</CardTitle>
                    <CardDescription>Select numeric variables for analysis and specify the number of factors to extract.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
                         <div>
                            <Label className="mb-2 block">Variables for Analysis</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {numericHeaders.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox
                                        id={`efa-${header}`}
                                        checked={selectedItems.includes(header)}
                                        onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                        />
                                        <label htmlFor={`efa-${header}`} className="text-sm font-medium leading-none">
                                        {header}
                                        </label>
                                    </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div>
                            <Label htmlFor="nFactors" className="mb-2 block">Number of Factors to Extract</Label>
                            <Input 
                                id="nFactors"
                                type="number"
                                value={nFactors}
                                onChange={e => setNFactors(parseInt(e.target.value, 10))}
                                min="1"
                                max={selectedItems.length - 1}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={selectedItems.length < 3 || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardContent>
            </Card>

            {isLoading && (
                 <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running Exploratory Factor Analysis...</p>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && (
                <>
                <div className="grid lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="font-headline">Data Adequacy</CardTitle>
                            <CardDescription>Tests to check if your data is suitable for factor analysis.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-4 text-sm">
                                <div className="flex justify-between items-start">
                                    <dt className="font-medium text-muted-foreground">KMO Measure</dt>
                                    <dd className="text-right">
                                        <div className="font-bold text-lg">{analysisResult.adequacy.kmo.toFixed(3)}</div>
                                        <AdequacyBadge level={analysisResult.adequacy.kmo_interpretation} />
                                    </dd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <dt className="font-medium text-muted-foreground">Bartlett's Test of Sphericity</dt>
                                    <dd>
                                        {analysisResult.adequacy.bartlett_significant ? (
                                            <Badge variant="default">Significant (p &lt; .05)</Badge>
                                        ) : (
                                            <Badge variant="destructive">Not Significant</Badge>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="font-headline">Scree Plot</CardTitle>
                            <CardDescription>Helps determine the number of factors by finding the "elbow" point.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{}} className="w-full h-48">
                                <LineChart data={screeData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}}/>
                                    <YAxis dataKey="Eigenvalue" domain={['auto', 'auto']} tick={{fontSize: 10}} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="Eigenvalue" stroke="hsl(var(--primary))" strokeWidth={2} />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Factor Loadings (Rotated)</CardTitle>
                        <CardDescription>Indicates how much each variable is associated with each factor. Loadings &gt; 0.4 are highlighted.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="w-full h-96">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        {Array.from({length: analysisResult.n_factors}, (_, i) => (
                                            <TableHead key={i} className="text-right">Factor {i+1}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.variables.map((variable, varIndex) => (
                                        <TableRow key={variable}>
                                            <TableCell className="font-medium">{variable}</TableCell>
                                            {analysisResult.factor_loadings[varIndex].map((loading, factorIndex) => (
                                                <TableCell 
                                                    key={factorIndex} 
                                                    className={`text-right font-mono ${Math.abs(loading) >= 0.4 ? 'font-bold text-primary' : ''}`}
                                                >
                                                    {loading.toFixed(3)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Variance Explained</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Factor</TableHead>
                                    <TableHead className="text-right">% of Variance</TableHead>
                                    <TableHead className="text-right">Cumulative %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysisResult.variance_explained.per_factor.map((variance, i) => (
                                     <TableRow key={i}>
                                        <TableCell>Factor {i+1}</TableCell>
                                        <TableCell className="text-right font-mono">{variance.toFixed(2)}%</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.variance_explained.cumulative[i].toFixed(2)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                </>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <BrainCircuit className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click 'Run Analysis' to see EFA results.</p>
                </div>
            )}
        </div>
    );
}


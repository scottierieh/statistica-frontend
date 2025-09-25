
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Component, Bot, CheckCircle2, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface PcaResults {
    eigenvalues: number[];
    explained_variance_ratio: number[];
    cumulative_variance_ratio: number[];
    loadings: number[][];
    n_components: number;
    variables: string[];
    interpretation: string;
}

interface FullPcaResponse {
    results: PcaResults;
    plot: string;
}


const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const pcaExample = exampleDatasets.find(d => d.id === 'cfa-psych-constructs');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Component size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Principal Component Analysis (PCA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        A dimensionality-reduction technique used to transform a large set of correlated variables into a smaller set of uncorrelated variables called principal components.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use PCA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           When dealing with datasets that have many variables, you often face issues with multicollinearity and the "curse of dimensionality." PCA helps solve this by identifying the underlying structure in the data, reducing redundancy, and summarizing the information into a few new variables (principal components) with minimal loss of information. It's essential for exploratory data analysis, visualization, and as a pre-processing step for machine learning.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {pcaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(pcaExample)}>
                                <pcaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{pcaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{pcaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variables:</strong> Choose two or more numeric variables that you want to reduce or summarize.</li>
                                <li><strong>Number of Components (Optional):</strong> You can specify the number of components to extract. If left blank, the tool will extract all components and you can use the Scree Plot to decide how many to retain.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform PCA, generating eigenvalues, loadings, and helpful visualizations.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Scree Plot:</strong> This plot helps determine the number of components to keep. Look for the "elbow"—the point where the line graph of eigenvalues flattens out. Components before the elbow are the most significant. The Kaiser rule suggests keeping components with eigenvalues greater than 1.
                                </li>
                                <li>
                                    <strong>Component Loadings:</strong> These are correlations between the original variables and the principal components. High absolute values indicate that a variable strongly contributes to a component, which helps you interpret what the component represents.
                                </li>
                                <li>
                                    <strong>Explained Variance:</strong> Shows how much of the total information (variance) from the original variables is captured by each component. The cumulative percentage tells you the total variance captured by the selected number of components.
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


const InterpretationDisplay = ({ results }: { results: PcaResults | undefined }) => {
    if (!results?.interpretation) return null;
    
    const nFactorsKaiser = results.eigenvalues.filter(ev => ev > 1).length;
    const cumulativeVariance = nFactorsKaiser > 0 ? results.cumulative_variance_ratio[nFactorsKaiser - 1] : 0;
    const isSignificant = cumulativeVariance > 0.6; 

    const formattedInterpretation = useMemo(() => {
        return results.interpretation
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }, [results.interpretation]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Bot /> Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant={isSignificant ? 'default' : 'secondary'}>
                    {isSignificant ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{isSignificant ? "Significant Structure Found" : "Potentially Weak Structure"}</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation }} />
                </Alert>
            </CardContent>
        </Card>
    );
}

interface PcaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function PcaPage({ data, numericHeaders, onLoadExample }: PcaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [nComponents, setNComponents] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullPcaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two variables for PCA.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/pca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    variables: selectedItems,
                    nComponents: nComponents ? Number(nComponents) : null
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('PCA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nComponents, toast]);
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">PCA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and optionally specify the number of components.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables for PCA</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`pca-${header}`}
                                  checked={selectedItems.includes(header)}
                                  onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`pca-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 items-end">
                         <div>
                            <Label>Number of Components (Optional)</Label>
                            <Input 
                                type="number" 
                                placeholder="Auto (based on eigenvalues)"
                                value={nComponents ?? ''}
                                onChange={e => setNComponents(e.target.value ? parseInt(e.target.value) : null)}
                                min="1"
                                max={selectedItems.length || 1}
                            />
                        </div>
                        <Button onClick={handleAnalysis} disabled={isLoading || selectedItems.length < 2}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                 <div className="space-y-4">
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Visual Summary</CardTitle>
                                <CardDescription>Scree plot to determine the number of components to retain and a loadings plot to interpret them.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="PCA Plots" width={1400} height={600} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                    <InterpretationDisplay results={results} />
                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Eigenvalues & Explained Variance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead className="text-right">Eigenvalue</TableHead>
                                            <TableHead className="text-right">% of Variance</TableHead>
                                            <TableHead className="text-right">Cumulative %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.eigenvalues.map((ev, i) => (
                                             <TableRow key={i}>
                                                <TableCell>PC{i + 1}</TableCell>
                                                <TableCell className="font-mono text-right">{ev.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{(results.explained_variance_ratio[i] * 100).toFixed(2)}%</TableCell>
                                                <TableCell className="font-mono text-right">{(results.cumulative_variance_ratio[i] * 100).toFixed(2)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Component Loadings</CardTitle>
                                <CardDescription>Shows how original variables contribute to each principal component.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            {Array.from({ length: results.n_components }).map((_, i) => (
                                                <TableHead key={i} className="text-right">PC{i + 1}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.variables.map((variable, varIndex) => (
                                            <TableRow key={variable}>
                                                <TableCell className="font-medium">{variable}</TableCell>
                                                {results.loadings[varIndex].map((loading, compIndex) => (
                                                    <TableCell 
                                                        key={compIndex} 
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
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}

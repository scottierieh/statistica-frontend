
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, AlertTriangle, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Settings, RotateCw, Replace, Bot, CheckCircle2, FileSearch, MoveRight, HelpCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

// Type definitions for the EFA results
interface EfaResults {
    eigenvalues: number[];
    factor_loadings: number[][];
    variance_explained: {
        per_factor: number[];
        cumulative: number[];
    };
    variables: string[];
    n_factors: number;
    plot?: string;
    communalities: number[];
    adequacy: {
        kmo: number;
        kmo_interpretation: string;
        bartlett_statistic: number;
        bartlett_p_value: number;
        bartlett_significant: boolean;
    };
    interpretation: { [key: string]: { variables: string[], loadings: number[] } };
    full_interpretation: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const efaExample = exampleDatasets.find(d => d.id === 'well-being-survey');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <BrainCircuit size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Exploratory Factor Analysis (EFA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Uncover the underlying structure of a set of variables and reduce a large number of variables into fewer, more manageable factors.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use EFA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           EFA is a powerful exploratory technique used in the early stages of research to identify the latent constructs (or factors) that underlie a set of observed variables. It's perfect for developing theories, simplifying complex datasets, and constructing new scales by grouping together variables that are highly correlated.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {efaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(efaExample)}>
                                <efaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{efaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{efaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Items:</strong> Choose all the numeric variables you believe may be related to one or more underlying factors (e.g., all items from a psychological scale).</li>
                                <li><strong>Number of Factors:</strong> Specify how many underlying factors you hypothesize. The Scree Plot and Kaiser criterion (eigenvalues > 1) can help you determine the optimal number to extract.</li>
                                <li><strong>Rotation Method:</strong> Choose a rotation to make the factor structure more interpretable. 'Varimax' is a common orthogonal rotation, while 'Promax' is an oblique rotation for correlated factors.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform the analysis and provide factor loadings and key metrics.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>KMO & Bartlett's Test:</strong> These tests assess if your data is suitable for factor analysis. Look for a KMO value > 0.6 and a significant p-value for Bartlett's test.</li>
                                <li><strong>Scree Plot:</strong> The 'elbow' in this plot suggests the optimal number of factors to retain.</li>
                                <li><strong>Factor Loadings:</strong> These are the correlations between each variable and the extracted factors. A high loading (e.g., > 0.4) indicates that the variable is strongly associated with that factor. Use these loadings to interpret and name your factors.</li>
                                <li><strong>Explained Variance:</strong> Shows how much of the total information (variance) from the original variables is captured by the extracted factors. The cumulative percentage tells you the total variance captured by the selected number of components.</li>
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

const InterpretationDisplay = ({ results }: { results: EfaResults | undefined }) => {
    if (!results?.full_interpretation) return null;
    
    const isSuitable = results.adequacy.kmo >= 0.6 && results.adequacy.bartlett_significant;

    const formattedInterpretation = useMemo(() => {
        return results.full_interpretation
            .replace(/\\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }, [results.full_interpretation]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Bot /> Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant={isSuitable ? 'default' : 'destructive'}>
                    {isSuitable ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{isSuitable ? "Data Suitable for Factor Analysis" : "Data May Not Be Suitable"}</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation }} />
                </Alert>
            </CardContent>
        </Card>
    );
}

const DualListBox = ({ allItems, selectedItems, setSelectedItems }: { allItems: string[], selectedItems: string[], setSelectedItems: (items: string[]) => void }) => {
    const [highlightedAvailable, setHighlightedAvailable] = useState<string[]>([]);
    const [highlightedSelected, setHighlightedSelected] = useState<string[]>([]);

    const availableItems = useMemo(() => allItems.filter(item => !selectedItems.includes(item)), [allItems, selectedItems]);
    
    const handleSelection = (item: string, list: 'available' | 'selected', e: React.MouseEvent) => {
        const currentHighlighted = list === 'available' ? highlightedAvailable : highlightedSelected;
        const setHighlighted = list === 'available' ? setHighlightedAvailable : setHighlightedSelected;
        const allListItems = list === 'available' ? availableItems : selectedItems;

        if (e.ctrlKey || e.metaKey) {
            if (currentHighlighted.includes(item)) {
                setHighlighted(currentHighlighted.filter(i => i !== item));
            } else {
                setHighlighted([...currentHighlighted, item]);
            }
        } else if (e.shiftKey && currentHighlighted.length > 0) {
            const lastSelectedItem = currentHighlighted[currentHighlighted.length - 1];
            const lastIndex = allListItems.indexOf(lastSelectedItem);
            const currentIndex = allListItems.indexOf(item);
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const newSelection = allListItems.slice(start, end + 1);
            setHighlighted([...new Set([...currentHighlighted, ...newSelection])]);
        } else {
            setHighlighted([item]);
        }
    };

    const moveSelected = () => {
        setSelectedItems([...new Set([...selectedItems, ...highlightedAvailable])]);
        setHighlightedAvailable([]);
    };

    const moveAll = () => {
        setSelectedItems([...allItems]);
        setHighlightedAvailable([]);
    };

    const removeSelected = () => {
        setSelectedItems(selectedItems.filter(item => !highlightedSelected.includes(item)));
        setHighlightedSelected([]);
    };

    const removeAll = () => {
        setSelectedItems([]);
        setHighlightedSelected([]);
    };

    const ListItem = ({ item, highlighted, onSelect }: { item: string, highlighted: boolean, onSelect: (e: React.MouseEvent) => void }) => (
        <div 
            onClick={onSelect}
            className={`px-2 py-1 cursor-pointer rounded ${highlighted ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
        >
            {item}
        </div>
    );

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            {/* Available Items */}
            <div className="flex flex-col gap-2">
                <Label>Available Items ({availableItems.length})</Label>
                <ScrollArea className="h-40 border rounded-md p-1">
                    {availableItems.map(item => (
                        <ListItem key={item} item={item} highlighted={highlightedAvailable.includes(item)} onSelect={(e) => handleSelection(item, 'available', e)} />
                    ))}
                </ScrollArea>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col gap-2">
                <Button variant="outline" size="icon" onClick={moveAll} aria-label="Move all to selected"><ChevronsRight /></Button>
                <Button variant="outline" size="icon" onClick={moveSelected} disabled={highlightedAvailable.length === 0} aria-label="Move selected to right"><ChevronRight /></Button>
                <Button variant="outline" size="icon" onClick={removeSelected} disabled={highlightedSelected.length === 0} aria-label="Move selected to left"><ChevronLeft /></Button>
                <Button variant="outline" size="icon" onClick={removeAll} aria-label="Move all to available"><ChevronsLeft /></Button>
            </div>

            {/* Selected Items */}
            <div className="flex flex-col gap-2">
                <Label>Selected for Analysis ({selectedItems.length})</Label>
                <ScrollArea className="h-40 border rounded-md p-1">
                     {selectedItems.map(item => (
                        <ListItem key={item} item={item} highlighted={highlightedSelected.includes(item)} onSelect={(e) => handleSelection(item, 'selected', e)} />
                    ))}
                </ScrollArea>
            </div>
        </div>
    );
};

interface EfaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function EfaPage({ data, numericHeaders, onLoadExample }: EfaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [nFactors, setNFactors] = useState<number>(3);
    const [rotationMethod, setRotationMethod] = useState('varimax');
    const [extractionMethod, setExtractionMethod] = useState('principal');
    
    const [analysisResult, setAnalysisResult] = useState<EfaResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [numericHeaders, data]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

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
                    data,
                    items: selectedItems,
                    nFactors,
                    rotation: rotationMethod,
                    method: extractionMethod,
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

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nFactors, rotationMethod, extractionMethod, toast]);
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">EFA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and specify analysis parameters.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <DualListBox allItems={numericHeaders} selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
                    
                    <Card>
                        <CardHeader className="pb-2">
                             <CardTitle className="text-base flex items-center gap-2"><Settings/> Analysis Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                            <div>
                                <Label htmlFor="nFactors" className="mb-2 block">Number of Factors</Label>
                                <Input 
                                    id="nFactors"
                                    type="number"
                                    value={nFactors}
                                    onChange={e => setNFactors(parseInt(e.target.value, 10))}
                                    min="1"
                                    max={selectedItems.length > 1 ? selectedItems.length - 1 : 1}
                                />
                            </div>
                             <div>
                                <Label htmlFor="rotationMethod" className="mb-2 block flex items-center gap-1"><RotateCw className="w-4 h-4"/> Rotation Method</Label>
                                <Select value={rotationMethod} onValueChange={setRotationMethod}>
                                    <SelectTrigger id="rotationMethod"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="varimax">Varimax (Orthogonal)</SelectItem>
                                        <SelectItem value="promax">Promax (Oblique)</SelectItem>
                                        <SelectItem value="quartimax">Quartimax (Orthogonal)</SelectItem>
                                        <SelectItem value="oblimin">Oblimin (Oblique)</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="extractionMethod" className="mb-2 block flex items-center gap-1"><Replace className="w-4 h-4"/> Extraction Method</Label>
                                <Select value={extractionMethod} onValueChange={setExtractionMethod}>
                                    <SelectTrigger id="extractionMethod"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="principal">Principal Axis Factoring</SelectItem>
                                        <SelectItem value="pca">Principal Component Analysis</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
                 <CardFooter className="flex justify-end">
                     <Button onClick={handleAnalysis} className="w-full md:w-auto" disabled={selectedItems.length < 3 || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardFooter>
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

            {results && (
                <>
                {results.plot && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Visual Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={results.plot} alt="EFA Visual Summary" width={1400} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                )}
                <InterpretationDisplay results={results} />
                <div className="grid lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="font-headline">Data Adequacy</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <dl className="space-y-4 text-sm">
                                <div>
                                    <dt className="font-medium">Kaiser-Meyer-Olkin (KMO) Test</dt>
                                    <dd className="font-mono text-lg">{results.adequacy.kmo.toFixed(3)} <Badge>{results.adequacy.kmo_interpretation}</Badge></dd>
                                </div>
                                <div>
                                    <dt className="font-medium">Bartlett's Test of Sphericity</dt>
                                    <dd>
                                        <span className="font-mono">
                                            χ² ≈ {results.adequacy.bartlett_statistic?.toFixed(2) ?? 'N/A'}, p {results.adequacy.bartlett_p_value < 0.001 ? '< .001' : results.adequacy.bartlett_p_value?.toFixed(3) ?? 'N/A'}
                                        </span>
                                        {results.adequacy.bartlett_significant ? <Badge>Significant</Badge> : <Badge variant="secondary">Not Significant</Badge>}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="font-headline">Total Variance Explained</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Factor</TableHead>
                                        <TableHead className="text-right">Eigenvalue</TableHead>
                                        <TableHead className="text-right">% of Variance</TableHead>
                                        <TableHead className="text-right">Cumulative %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.eigenvalues.slice(0, results.n_factors).map((ev, i) => (
                                         <TableRow key={i}>
                                            <TableCell>Factor {i+1}</TableCell>
                                            <TableCell className="text-right font-mono">{ev.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.variance_explained.per_factor[i].toFixed(2)}%</TableCell>
                                            <TableCell className="text-right font-mono">{results.variance_explained.cumulative[i].toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                 <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Factor Loadings (Rotated)</CardTitle>
                            <CardDescription>Indicates how much each variable is associated with each factor. Loadings &gt; 0.4 are highlighted.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            {Array.from({length: results.n_factors}, (_, i) => (
                                                <TableHead key={i} className="text-right">Factor {i+1}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.variables.map((variable, varIndex) => (
                                            <TableRow key={variable}>
                                                <TableCell className="font-medium">{variable}</TableCell>
                                                {results.factor_loadings[varIndex].map((loading, factorIndex) => (
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
                </>
            )}
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see EFA results.</p>
                </div>
            )}
        </div>
    );
}


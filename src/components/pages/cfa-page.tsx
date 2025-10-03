
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, FileSearch, MoveRight, Settings, HelpCircle, BrainCircuit, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface CfaResults {
    estimates: any[];
    fit_indices: { [key: string]: number };
}

interface IntroPageProps {
    onStart: () => void;
    onLoadExample: (example: ExampleDataSet) => void;
}

function IntroPage({ onStart, onLoadExample }: IntroPageProps) {
    const cfaExample = useMemo(() => exampleDatasets.find(d => d.id === 'well-being-survey'), []);
    const Icon = cfaExample?.icon;

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
                            Unlike Exploratory Factor Analysis (EFA) which discovers structure, CFA is used to test a specific hypothesis about the structure of latent variables. It is a cornerstone of Structural Equation Modeling (SEM) and is used to validate measurement models, ensuring that your scale items are reliably measuring the constructs they are intended to measure.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {cfaExample && Icon && (
                            <Card 
                                className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" 
                                onClick={() => onLoadExample(cfaExample)}
                            >
                                <Icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{cfaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{cfaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2">
                                <Settings className="text-primary"/> Setup Guide
                            </h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Define Model Specification:</strong> Using `semopy` syntax, define your measurement model. Each line represents a latent variable and its indicators (e.g., `Factor1 =~ X1 + X2 + X3`).</li>
                                <li><strong>Select Variables:</strong> Choose the numeric variables from your dataset that are included in your model specification.</li>
                                <li><strong>Run Analysis:</strong> The tool will fit the CFA model and provide detailed fit indices and parameter estimates.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2">
                                <FileSearch className="text-primary"/> Results Interpretation
                            </h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Fit Indices (CFI, TLI, RMSEA, SRMR):</strong> These are crucial for evaluating model fit. Look for CFI/TLI &gt; .90 (ideally &gt; .95), RMSEA &lt; .08, and SRMR &lt; .08 for acceptable fit.</li>
                                <li><strong>Factor Loadings:</strong> The &apos;Estimate&apos; column for `=~` relationships shows the factor loadings. Standardized loadings &gt; 0.5 are generally considered good.</li>
                                <li><strong>P-values:</strong> Significant p-values (&lt; .05) for loadings indicate that the item is a significant indicator of its latent factor.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>
                        Start New Analysis <MoveRight className="ml-2 w-5 h-5"/>
                    </Button>
                </CardFooter>
            </Card>
        </div>
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


interface CfaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CfaPage({ data, numericHeaders, onLoadExample }: CfaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [modelSpec, setModelSpec] = useState('Factor1 =~ X1 + X2 + X3\nFactor2 =~ Y1 + Y2 + Y3');
    
    const [analysisResult, setAnalysisResult] = useState<CfaResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 3) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least 3 variables for CFA.' });
            return;
        }
        if (!modelSpec.trim()) {
            toast({ variant: 'destructive', title: 'Model Error', description: 'Please provide a model specification.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/cfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: data.map(row => selectedItems.reduce((acc, item) => ({...acc, [item]: row[item]}), {})), model_spec: modelSpec })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result.results);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, modelSpec, toast]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Confirmatory Factor Analysis (CFA) Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label>Model Specification (semopy syntax)</Label>
                            <Textarea
                                className="font-mono h-40"
                                value={modelSpec}
                                onChange={e => setModelSpec(e.target.value)}
                                placeholder={'# Measurement Model\nFactor1 =~ item1 + item2 + item3\nFactor2 =~ item4 + item5 + item6'}
                            />
                        </div>
                        <div>
                             <DualListBox allItems={numericHeaders} selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedItems.length < 3}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            
            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Fit Indices</CardTitle>
                            <CardDescription>Key metrics to evaluate how well the model fits the data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(analysisResult.fit_indices).map(([key, value]) => {
                                    if (value === null) return null;
                                    
                                    let status: 'good' | 'acceptable' | 'poor' = 'good';
                                    let statusIcon = <CheckCircle2 className="w-4 h-4 text-green-600" />;
                                    
                                    if (key === 'CFI' || key === 'TLI') {
                                        if (value < 0.90) { status = 'poor'; statusIcon = <AlertTriangle className="w-4 h-4 text-red-600" />; }
                                        else if (value < 0.95) { status = 'acceptable'; statusIcon = <AlertTriangle className="w-4 h-4 text-yellow-600" />; }
                                    } else if (key === 'RMSEA') {
                                        if (value > 0.08) { status = 'poor'; statusIcon = <AlertTriangle className="w-4 h-4 text-red-600" />; }
                                        else if (value > 0.05) { status = 'acceptable'; statusIcon = <AlertTriangle className="w-4 h-4 text-yellow-600" />; }
                                    } else if (key === 'SRMR') {
                                        if (value > 0.10) { status = 'poor'; statusIcon = <AlertTriangle className="w-4 h-4 text-red-600" />; }
                                        else if (value > 0.08) { status = 'acceptable'; statusIcon = <AlertTriangle className="w-4 h-4 text-yellow-600" />; }
                                    }

                                    return (
                                        <Card key={key} className={`${
                                            status === 'poor' ? 'border-red-200 bg-red-50' : 
                                            status === 'acceptable' ? 'border-yellow-200 bg-yellow-50' : 
                                            'border-green-200 bg-green-50'
                                        }`}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2"><div className="font-semibold text-sm">{key}</div>{statusIcon}</div>
                                                <div className="text-2xl font-bold font-mono">
                                                    {typeof value === 'number' ? value.toFixed(3) : value}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {status === 'good' ? 'Good fit' : 
                                                     status === 'acceptable' ? 'Acceptable fit' : 
                                                     'Poor fit'}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                            
                            <Alert className="mt-4">
                                <FileSearch className="h-4 w-4" />
                                <AlertTitle>Model Fit Interpretation</AlertTitle>
                                <AlertDescription>
                                    {(() => {
                                        const cfi = analysisResult.fit_indices.CFI || 0;
                                        const rmsea = analysisResult.fit_indices.RMSEA || 1;
                                        const srmr = analysisResult.fit_indices.SRMR || 1;
                                        
                                        if (cfi > 0.95 && rmsea < 0.06 && srmr < 0.08) {
                                            return "Excellent model fit! All indices meet stringent criteria.";
                                        } else if (cfi > 0.90 && rmsea < 0.08 && srmr < 0.10) {
                                            return "Acceptable model fit. Consider reviewing modification indices for potential improvements.";
                                        } else {
                                            return "Poor model fit. Consider model respecification or examining residuals.";
                                        }
                                    })()}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Parameter Estimates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>lval</TableHead>
                                        <TableHead>op</TableHead>
                                        <TableHead>rval</TableHead>
                                        <TableHead className="text-right">Estimate</TableHead>
                                        <TableHead className="text-right">Std. Err</TableHead>
                                        <TableHead className="text-right">z-value</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.estimates.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.lval}</TableCell>
                                            <TableCell>{row.op}</TableCell>
                                            <TableCell>{row.rval}</TableCell>
                                            <TableCell className="text-right font-mono">{row.Estimate?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{row['Std. Err']?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{row['z-value']?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row['p-value'] < 0.001 ? '<.001' : row['p-value']?.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

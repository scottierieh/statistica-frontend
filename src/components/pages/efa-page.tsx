'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Settings, RotateCw, Replace, FileSearch, HelpCircle, Layers, Lightbulb, TrendingUp, CheckCircle, Target, Percent, Users, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
    full_interpretation?: string;
}

// Statistical Summary Cards Component for EFA
const StatisticalSummaryCards = ({ results }: { results: EfaResults }) => {
    const totalVarianceExplained = results.variance_explained.cumulative[results.n_factors - 1];
    const avgCommunality = results.communalities.reduce((a, b) => a + b, 0) / results.communalities.length;
    const strongLoadings = results.factor_loadings.flat().filter(l => Math.abs(l) > 0.4).length;
    const totalLoadings = results.factor_loadings.flat().length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">KMO Score</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.adequacy.kmo.toFixed(3)}</p>
                        <Badge className="text-xs">{results.adequacy.kmo_interpretation}</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Variance Explained</p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{totalVarianceExplained.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">
                            By {results.n_factors} factor{results.n_factors !== 1 ? 's' : ''}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Avg Communality</p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{avgCommunality.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">
                            {avgCommunality > 0.6 ? 'Good' : avgCommunality > 0.4 ? 'Moderate' : 'Low'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Strong Loadings</p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{strongLoadings}/{totalLoadings}</p>
                        <p className="text-xs text-muted-foreground">
                            {((strongLoadings/totalLoadings)*100).toFixed(0)}% &gt; 0.4
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const EfaOverview = ({ selectedItems, nFactors, rotationMethod, extractionMethod, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (selectedItems.length === 0) {
            overview.push('Select at least 3 variables for factor analysis');
        } else if (selectedItems.length < 3) {
            overview.push(`⚠ Only ${selectedItems.length} variables selected (minimum 3 required)`);
        } else if (selectedItems.length <= 5) {
            overview.push(`Analyzing ${selectedItems.length} variables (minimal for EFA)`);
        } else if (selectedItems.length <= 10) {
            overview.push(`Analyzing ${selectedItems.length} variables (good for EFA)`);
        } else {
            overview.push(`Analyzing ${selectedItems.length} variables (excellent for EFA)`);
        }

        const n = data.length;
        const ratio = n / selectedItems.length;
        if (n < 50) {
            overview.push(`Sample size: ${n} observations (⚠ Very small - results may be unstable)`);
        } else if (n < 100) {
            overview.push(`Sample size: ${n} observations (Small - interpret with caution)`);
        } else if (n < 300) {
            overview.push(`Sample size: ${n} observations (Adequate)`);
        } else {
            overview.push(`Sample size: ${n} observations (Good)`);
        }
        
        if (selectedItems.length >= 3) {
            if (ratio < 3) {
                overview.push(`⚠ Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Very low)`);
            } else if (ratio < 5) {
                overview.push(`Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Low)`);
            } else if (ratio < 10) {
                overview.push(`Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Adequate)`);
            } else {
                overview.push(`Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Good)`);
            }
        }

        overview.push(`Extracting ${nFactors} factor${nFactors !== 1 ? 's' : ''}`);
        
        if (rotationMethod === 'varimax') {
            overview.push('Varimax rotation: Orthogonal (uncorrelated factors)');
        } else if (rotationMethod === 'promax') {
            overview.push('Promax rotation: Oblique (allows correlated factors)');
        } else if (rotationMethod === 'none') {
            overview.push('No rotation applied');
        } else {
            overview.push(`${rotationMethod.charAt(0).toUpperCase() + rotationMethod.slice(1)} rotation`);
        }

        if (extractionMethod === 'principal') {
            overview.push('Principal Axis Factoring (true factor analysis)');
        } else {
            overview.push('Principal Component Analysis (variance maximization)');
        }

        return overview;
    }, [selectedItems, nFactors, rotationMethod, extractionMethod, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Analysis Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

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
            <div className="flex flex-col gap-2">
                <Label>Available Items ({availableItems.length})</Label>
                <ScrollArea className="h-40 border rounded-md p-1">
                    {availableItems.map(item => (
                        <ListItem key={item} item={item} highlighted={highlightedAvailable.includes(item)} onSelect={(e) => handleSelection(item, 'available', e)} />
                    ))}
                </ScrollArea>
            </div>
            
            <div className="flex flex-col gap-2">
                <Button variant="outline" size="icon" onClick={moveAll} aria-label="Move all to selected"><ChevronsRight /></Button>
                <Button variant="outline" size="icon" onClick={moveSelected} disabled={highlightedAvailable.length === 0} aria-label="Move selected to right"><ChevronRight /></Button>
                <Button variant="outline" size="icon" onClick={removeSelected} disabled={highlightedSelected.length === 0} aria-label="Move selected to left"><ChevronLeft /></Button>
                <Button variant="outline" size="icon" onClick={removeAll} aria-label="Move all to available"><ChevronsLeft /></Button>
            </div>

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const efaExample = exampleDatasets.find(d => d.id === 'well-being-survey');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BrainCircuit className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Exploratory Factor Analysis (EFA)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Uncover hidden patterns and reduce complexity in your data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Dimension Reduction</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Transform many variables into fewer meaningful factors
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Lightbulb className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Pattern Discovery</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify underlying constructs in your measurements
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Scale Development</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Build and validate measurement instruments
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use 
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use EFA when you want to explore relationships among variables without a predetermined 
                            structure. It&apos;s perfect for developing theories, understanding survey data, and identifying 
                            which items belong together in psychological scales or questionnaires.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variables:</strong> At least 3, ideally 10+ numeric items</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 5-10 cases per variable minimum</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>KMO:</strong> Should be &gt; 0.6 for adequacy</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Bartlett&apos;s test:</strong> Should be significant (p &lt; .05)</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <RotateCw className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Factor loadings:</strong> &gt; 0.4 indicates meaningful association</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Eigenvalues:</strong> &gt; 1 suggests factor retention (Kaiser criterion)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Scree plot:</strong> Look for the &quot;elbow&quot; point</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variance:</strong> Aim for 60%+ cumulative explained</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {efaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(efaExample)} size="lg">
                                <BrainCircuit className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
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
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [nFactors, setNFactors] = useState<number>(3);
    const [rotationMethod, setRotationMethod] = useState('varimax');
    const [extractionMethod, setExtractionMethod] = useState('principal');
    
    const [analysisResult, setAnalysisResult] = useState<EfaResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (numericHeaders.length > 0) {
            setSelectedItems(numericHeaders);
            const safeNFactors = Math.min(3, Math.max(1, Math.floor(numericHeaders.length / 2)));
            setNFactors(safeNFactors);
        } else {
            setSelectedItems([]);
            setNFactors(1);
        }
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [numericHeaders, data]);

    useEffect(() => {
        if (selectedItems.length > 0) {
            if (nFactors >= selectedItems.length) {
                const safeNFactors = Math.max(1, Math.floor(selectedItems.length / 2));
                setNFactors(safeNFactors);
            }
        }
    }, [selectedItems.length]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 3) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least 3 variables for EFA.' });
            return;
        }
        
        if (isNaN(nFactors) || nFactors < 1 || nFactors >= selectedItems.length) {
            toast({ variant: 'destructive', title: 'Factor Number Error', description: `Number of factors must be between 1 and ${selectedItems.length - 1}.` });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/efa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, nFactors, rotation: rotationMethod, method: extractionMethod })
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try { const errorResult = await response.json(); errorMessage = errorResult.error || errorMessage; } catch {}
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nFactors, rotationMethod, extractionMethod, toast]);

    const handleNFactorsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1) setNFactors(val);
        else if (e.target.value === '') setNFactors(1);
    };
    
    if (!canRun && view === 'main') return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    if (view === 'intro') return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;

    const results = analysisResult;
    const maxFactors = selectedItems.length > 0 ? selectedItems.length - 1 : 1;

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
                                <Input id="nFactors" type="number" value={nFactors} onChange={handleNFactorsChange} min="1" max={maxFactors} />
                                <p className="text-xs text-muted-foreground mt-1">Must be between 1 and {maxFactors}</p>
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
                    
                    <EfaOverview selectedItems={selectedItems} nFactors={nFactors} rotationMethod={rotationMethod} extractionMethod={extractionMethod} data={data} />
                </CardContent>
                 <CardFooter className="flex justify-end">
                     <Button onClick={handleAnalysis} className="w-full md:w-auto" disabled={selectedItems.length < 3 || isLoading || nFactors >= selectedItems.length}>
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
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />
                    
                    {/* Detailed Analysis - 3 Section Format with APA Content */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(() => {
                                const totalVariance = results.variance_explained.cumulative[results.n_factors - 1];
                                const avgCommunality = results.communalities.reduce((a, b) => a + b, 0) / results.communalities.length;
                                const strongLoadings = results.factor_loadings.flat().filter(l => Math.abs(l) > 0.4).length;
                                const totalLoadings = results.factor_loadings.flat().length;
                                const rotationName = rotationMethod === 'varimax' ? 'Varimax' : rotationMethod === 'promax' ? 'Promax' : rotationMethod === 'quartimax' ? 'Quartimax' : rotationMethod === 'oblimin' ? 'Direct Oblimin' : 'no';
                                const extractionName = extractionMethod === 'principal' ? 'Principal Axis Factoring (PAF)' : 'Principal Component Analysis (PCA)';
                                const isOrthogonal = ['varimax', 'quartimax', 'none'].includes(rotationMethod);
                                
                                // Get factor interpretations with loadings
                                const factorInterpretations = [];
                                for (let f = 0; f < results.n_factors; f++) {
                                    const loadingsForFactor = results.variables.map((v, i) => ({
                                        variable: v,
                                        loading: results.factor_loadings[i][f]
                                    })).filter(item => Math.abs(item.loading) >= 0.4)
                                      .sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading));
                                    
                                    factorInterpretations.push({
                                        factorNum: f + 1,
                                        eigenvalue: results.eigenvalues[f],
                                        variance: results.variance_explained.per_factor[f],
                                        items: loadingsForFactor
                                    });
                                }
                                
                                return (
                                    <>
                                        {/* Overall Summary - Primary Color */}
                                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-2 bg-primary/10 rounded-md">
                                                    <BrainCircuit className="h-4 w-4 text-primary" />
                                                </div>
                                                <h3 className="font-semibold text-base">Overall Summary</h3>
                                            </div>
                                            <div className="text-sm text-foreground/80 leading-relaxed space-y-3">
                                                <p>
                                                    An exploratory factor analysis (EFA) was conducted on {selectedItems.length} variables using <strong>{extractionName}</strong> with <strong>{rotationName} rotation</strong> ({isOrthogonal ? 'orthogonal' : 'oblique'}). 
                                                    {extractionMethod === 'principal' 
                                                        ? ' PAF focuses on shared variance among variables, making it suitable for identifying latent constructs.'
                                                        : ' PCA maximizes variance explained, treating all variance as common variance.'}
                                                </p>
                                                <p>
                                                    The analysis yielded a <strong>{results.n_factors}-factor solution</strong> explaining <strong>{totalVariance.toFixed(1)}%</strong> of total variance. 
                                                    Prior to extraction, data adequacy was confirmed: KMO = {results.adequacy.kmo.toFixed(3)} ({results.adequacy.kmo_interpretation.toLowerCase()}), 
                                                    Bartlett&apos;s test χ² = {results.adequacy.bartlett_statistic.toFixed(2)}, <em>p</em> {results.adequacy.bartlett_p_value < 0.001 ? '< .001' : `= ${results.adequacy.bartlett_p_value.toFixed(3)}`}.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Statistical Insights - Blue Color */}
                                        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-2 bg-blue-500/10 rounded-md">
                                                    <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <h3 className="font-semibold text-base">Statistical Insights</h3>
                                            </div>
                                            <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                                                {/* Factor Extraction Criteria */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                    <span>
                                                        <strong>Factor Extraction:</strong> {results.n_factors} factor{results.n_factors !== 1 ? 's were' : ' was'} retained based on Kaiser&apos;s criterion (eigenvalues {'>'} 1.0) and scree plot examination. 
                                                        Eigenvalues: {results.eigenvalues.slice(0, results.n_factors).map(e => e.toFixed(2)).join(', ')}.
                                                    </span>
                                                </div>
                                                
                                                {/* Variance Explained */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                    <span>
                                                        <strong>Variance Explained:</strong> {totalVariance.toFixed(1)}% cumulative variance
                                                        {totalVariance >= 60 ? ' (exceeds 60% threshold - good)' : totalVariance >= 50 ? ' (acceptable for exploratory research)' : ' (below recommended 60% threshold)'}.
                                                        {results.variance_explained.per_factor.map((v, i) => ` Factor ${i+1}: ${v.toFixed(1)}%`).join(';')}.
                                                    </span>
                                                </div>
                                                
                                                {/* Sampling Adequacy */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                    <span>
                                                        <strong>KMO ({results.adequacy.kmo.toFixed(3)}):</strong> {results.adequacy.kmo_interpretation}
                                                        {results.adequacy.kmo >= 0.8 ? ', exceeding the recommended .80 threshold' : 
                                                         results.adequacy.kmo >= 0.7 ? ', above the acceptable .70 threshold' :
                                                         results.adequacy.kmo >= 0.6 ? ', meeting the minimum .60 threshold' :
                                                         ', below the minimum .60 threshold'}.
                                                    </span>
                                                </div>
                                                
                                                {/* Bartlett's Test */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                    <span>
                                                        <strong>Bartlett&apos;s Test:</strong> χ²({selectedItems.length * (selectedItems.length - 1) / 2}) = {results.adequacy.bartlett_statistic.toFixed(2)}, 
                                                        <em> p</em> {results.adequacy.bartlett_p_value < 0.001 ? '< .001' : `= ${results.adequacy.bartlett_p_value.toFixed(3)}`} — 
                                                        {results.adequacy.bartlett_significant ? ' significant correlations exist among variables.' : ' correlations may be insufficient.'}
                                                    </span>
                                                </div>
                                                
                                                {/* Communalities */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                    <span>
                                                        <strong>Average Communality ({avgCommunality.toFixed(3)}):</strong>
                                                        {avgCommunality >= 0.6 ? ' Good shared variance — variables are well-represented by extracted factors.' :
                                                         avgCommunality >= 0.4 ? ' Moderate shared variance — most variables fit the factor structure adequately.' :
                                                         ' Low shared variance — some variables may not belong in this factor structure.'}
                                                    </span>
                                                </div>
                                                
                                                {/* Factor Loadings Summary */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                    <span>
                                                        <strong>Factor Loadings:</strong> {strongLoadings} of {totalLoadings} loadings ({((strongLoadings/totalLoadings)*100).toFixed(0)}%) exceed |.40| threshold, 
                                                        indicating {(strongLoadings/totalLoadings) >= 0.5 ? 'clear' : 'moderate'} factor-variable associations.
                                                    </span>
                                                </div>
                                                
                                                {/* Factor Interpretation */}
                                                <div className="mt-4 space-y-2">
                                                    <p className="font-medium text-blue-700 dark:text-blue-300">Factor Loadings by Factor (|loading| ≥ .40):</p>
                                                    {factorInterpretations.map((factor, idx) => (
                                                        <div key={idx} className="bg-white/50 dark:bg-gray-800/30 rounded-md p-3 border border-blue-200 dark:border-blue-800 ml-4">
                                                            <p className="font-medium mb-1">
                                                                Factor {factor.factorNum}: Eigenvalue = {factor.eigenvalue.toFixed(2)}, {factor.variance.toFixed(1)}% variance
                                                            </p>
                                                            {factor.items.length > 0 ? (
                                                                <p className="text-muted-foreground">
                                                                    {factor.items.map(item => `${item.variable} (${item.loading.toFixed(3)})`).join(', ')}
                                                                </p>
                                                            ) : (
                                                                <p className="text-muted-foreground italic">No loadings ≥ |.40|</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recommendations - Amber Color */}
                                        <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-2 bg-amber-500/10 rounded-md">
                                                    <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <h3 className="font-semibold text-base">Recommendations</h3>
                                            </div>
                                            <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                                                {/* Conditional recommendations based on results */}
                                                {totalVariance < 60 && (
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                        <span>Consider extracting additional factors or revising the variable set to improve variance explained (current: {totalVariance.toFixed(1)}%, target: ≥60%).</span>
                                                    </div>
                                                )}
                                                {results.adequacy.kmo < 0.7 && (
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                        <span>Review items with low individual KMO values and consider removal to improve sampling adequacy (current KMO: {results.adequacy.kmo.toFixed(3)}).</span>
                                                    </div>
                                                )}
                                                {avgCommunality < 0.5 && (
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                        <span>Variables with communalities below .40 may not share sufficient variance and could be candidates for removal.</span>
                                                    </div>
                                                )}
                                                
                                                {/* Standard recommendations */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                    <span><strong>Confirm factor structure:</strong> Use Confirmatory Factor Analysis (CFA) in an independent sample to validate the {results.n_factors}-factor solution.</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                    <span><strong>Assess reliability:</strong> Calculate Cronbach&apos;s α for items loading on each factor to evaluate internal consistency of subscales.</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                    <span><strong>Review cross-loadings:</strong> Items with loadings {'>'}.30 on multiple factors may be candidates for revision or removal to achieve simple structure.</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                    <span><strong>Name factors:</strong> Label each factor based on the theoretical meaning of its high-loading items to facilitate interpretation and communication.</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                    <span><strong>Report in APA format:</strong> Include extraction method, rotation, KMO, Bartlett&apos;s test, eigenvalues, variance explained, and factor loadings table in publications.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>
                
                    {/* Visual Summary */}
                    {results.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Visual Summary</CardTitle>
                                <CardDescription>Scree plot, factor loadings heatmap, and communalities</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={results.plot} alt="EFA Visual Summary" width={1400} height={600} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                
                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="font-headline">Data Adequacy</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <dl className="space-y-4 text-sm">
                                    <div>
                                        <dt className="font-medium mb-1">Kaiser-Meyer-Olkin (KMO) Test</dt>
                                        <dd className="flex items-center gap-2">
                                            <span className="font-mono text-lg">{results.adequacy.kmo.toFixed(3)}</span>
                                            <Badge>{results.adequacy.kmo_interpretation}</Badge>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium mb-1">Bartlett&apos;s Test of Sphericity</dt>
                                        <dd className="space-y-1">
                                            <div className="font-mono text-sm">χ² = {results.adequacy.bartlett_statistic?.toFixed(2) ?? 'N/A'}</div>
                                            <div className="font-mono text-sm">p {results.adequacy.bartlett_p_value < 0.001 ? '< .001' : `= ${results.adequacy.bartlett_p_value?.toFixed(3) ?? 'N/A'}`}</div>
                                            <div>{results.adequacy.bartlett_significant ? <Badge>Significant</Badge> : <Badge variant="secondary">Not Significant</Badge>}</div>
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
                                            <TableHead className="sticky left-0 bg-background">Variable</TableHead>
                                            {Array.from({length: results.n_factors}, (_, i) => (
                                                <TableHead key={i} className="text-right">Factor {i+1}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.variables.map((variable, varIndex) => (
                                            <TableRow key={variable}>
                                                <TableCell className="font-medium sticky left-0 bg-background">{variable}</TableCell>
                                                {results.factor_loadings[varIndex].map((loading, factorIndex) => (
                                                    <TableCell key={factorIndex} className={`text-right font-mono ${Math.abs(loading) >= 0.4 ? 'font-bold text-primary' : ''}`}>
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
                    <BrainCircuit className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to see EFA results.</p>
                </div>
            )}
        </div>
    );
}


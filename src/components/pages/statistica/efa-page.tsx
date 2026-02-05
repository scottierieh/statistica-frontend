'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
    Loader2, BrainCircuit, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, 
    Settings, HelpCircle, Layers, Lightbulb, TrendingUp, CheckCircle, Target, 
    Percent, BookOpen, Database, Settings2, Shield, FileText, BarChart3, 
    Check, ArrowRight, ChevronDown, FileCode, Download, FileSpreadsheet, 
    ImageIcon, AlertTriangle, CheckCircle2, Info, Code, Copy, RotateCw, Replace
} from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Papa from 'papaparse';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/efa_analysis.py?alt=media";

// ============ Types ============
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

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// ============ Glossary Definitions ============
const efaTermDefinitions: Record<string, string> = {
    kmo: "Kaiser-Meyer-Olkin (KMO) Measure: Tests sampling adequacy. Values range 0-1; >0.6 is acceptable, >0.8 is good.",
    bartlett: "Bartlett's Test of Sphericity: Tests if the correlation matrix is an identity matrix. Significant p-value (<0.05) means factor analysis is appropriate.",
    eigenvalue: "Eigenvalue: Represents the amount of variance explained by each factor. Values >1 typically indicate meaningful factors (Kaiser criterion).",
    factorLoading: "Factor Loading: Correlation between a variable and a factor. Values >0.4 are typically considered meaningful.",
    communality: "Communality: The proportion of variance in a variable explained by all factors combined. Higher values (>0.4) indicate better representation.",
    varianceExplained: "Variance Explained: The percentage of total variance in the data accounted for by the factors.",
    rotation: "Rotation: A method to make factor loadings more interpretable. Varimax maximizes variance of loadings; Promax allows correlated factors.",
    extraction: "Extraction Method: Principal Axis Factoring finds common factors; PCA finds components explaining maximum variance.",
    screeplot: "Scree Plot: A graph of eigenvalues that helps determine the optimal number of factors (look for the 'elbow').",
    crossLoading: "Cross-Loading: When a variable loads meaningfully (>0.3) on multiple factors, making interpretation complex."
};

// ============ Helper Functions ============
const getKmoLevel = (kmo: number) => {
    if (kmo >= 0.9) return { label: 'Marvelous', color: 'text-foreground' };
    if (kmo >= 0.8) return { label: 'Meritorious', color: 'text-foreground' };
    if (kmo >= 0.7) return { label: 'Middling', color: 'text-foreground' };
    if (kmo >= 0.6) return { label: 'Mediocre', color: 'text-amber-600' };
    if (kmo >= 0.5) return { label: 'Miserable', color: 'text-rose-600' };
    return { label: 'Unacceptable', color: 'text-rose-600' };
};

// ============ Components ============

// Statistical Summary Cards
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

// Dual List Box for variable selection
const DualListBox = ({ 
    allItems, 
    selectedItems, 
    setSelectedItems 
}: { 
    allItems: string[], 
    selectedItems: string[], 
    setSelectedItems: (items: string[]) => void 
}) => {
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
            className={`px-2 py-1 cursor-pointer rounded text-sm ${highlighted ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
        >
            {item}
        </div>
    );

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Available ({availableItems.length})</Label>
                <ScrollArea className="h-36 border rounded-xl p-2">
                    {availableItems.map(item => (
                        <ListItem 
                            key={item} 
                            item={item} 
                            highlighted={highlightedAvailable.includes(item)} 
                            onSelect={(e) => handleSelection(item, 'available', e)} 
                        />
                    ))}
                </ScrollArea>
            </div>
            
            <div className="flex flex-col gap-2">
                <Button variant="outline" size="icon" onClick={moveAll} className="h-8 w-8">
                    <ChevronsRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={moveSelected} disabled={highlightedAvailable.length === 0} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={removeSelected} disabled={highlightedSelected.length === 0} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={removeAll} className="h-8 w-8">
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Selected ({selectedItems.length})</Label>
                <ScrollArea className="h-36 border rounded-xl p-2">
                    {selectedItems.map(item => (
                        <ListItem 
                            key={item} 
                            item={item} 
                            highlighted={highlightedSelected.includes(item)} 
                            onSelect={(e) => handleSelection(item, 'selected', e)} 
                        />
                    ))}
                </ScrollArea>
            </div>
        </div>
    );
};

// Python Code Modal
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen, code]);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch code: ${response.status}`);
            }
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: 'Failed to load Python code' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'efa_analysis.py';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!', description: 'Python file saved' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        Python Code - Exploratory Factor Analysis
                    </DialogTitle>
                    <DialogDescription>
                        View, copy, or download the Python code used for this analysis.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex gap-2 py-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopy} 
                        disabled={isLoading || !!error}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload} 
                        disabled={isLoading || !!error}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download .py
                    </Button>
                    {error && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchCode}
                        >
                            <Loader2 className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    )}
                </div>
                
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-3 text-slate-300">Loading code...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center">
                            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                            <p className="text-slate-300 mb-2">Failed to load code</p>
                            <p className="text-slate-500 text-sm">{error}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950">
                            <pre className="p-4 text-sm text-slate-50 overflow-x-auto">
                                <code className="language-python">{code}</code>
                            </pre>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Glossary Modal
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const formatTermName = (term: string): string => {
        const names: Record<string, string> = {
            kmo: 'KMO (Kaiser-Meyer-Olkin)',
            bartlett: "Bartlett's Test",
            eigenvalue: 'Eigenvalue',
            factorLoading: 'Factor Loading',
            communality: 'Communality',
            varianceExplained: 'Variance Explained',
            rotation: 'Rotation Method',
            extraction: 'Extraction Method',
            screeplot: 'Scree Plot',
            crossLoading: 'Cross-Loading'
        };
        return names[term] || term;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        EFA Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in Exploratory Factor Analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(efaTermDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold">{formatTermName(term)}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};


const EFAGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Exploratory Factor Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is EFA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" />
                What is Exploratory Factor Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                EFA is a <strong>dimension reduction</strong> technique that uncovers hidden 
                patterns (latent factors) in a set of observed variables. It groups correlated 
                variables into factors representing underlying constructs.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Core Question:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    "What hidden themes or constructs explain the correlations among my variables?"
                    <br/><br/>
                    Example: 10 personality questions → 2 factors (Extraversion, Neuroticism)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                When to Use EFA
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Good Use Cases</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Developing new scales/questionnaires</li>
                    <li>• Discovering structure in survey data</li>
                    <li>• Reducing many variables to fewer factors</li>
                    <li>• Exploring relationships before theory</li>
                    <li>• Validating scale dimensionality</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-1">Not Appropriate For</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Confirming a predetermined structure (use CFA)</li>
                    <li>• Very small samples (n &lt; 50)</li>
                    <li>• Categorical/binary variables (use other methods)</li>
                    <li>• Variables with no theoretical relationship</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Data Adequacy */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Checking Data Adequacy
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">KMO (Kaiser-Meyer-Olkin)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures sampling adequacy — how well variables share common variance.
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">≥ 0.9</p>
                      <p className="text-muted-foreground">Marvelous</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">0.8-0.9</p>
                      <p className="text-muted-foreground">Meritorious</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">0.7-0.8</p>
                      <p className="text-muted-foreground">Middling</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">0.6-0.7</p>
                      <p className="text-muted-foreground">Mediocre</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">0.5-0.6</p>
                      <p className="text-muted-foreground">Miserable</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">&lt; 0.5</p>
                      <p className="text-muted-foreground">Unacceptable</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Bartlett&apos;s Test of Sphericity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if the correlation matrix is an identity matrix (no correlations).
                    <br/>• <strong>p &lt; 0.05:</strong> Variables are correlated — EFA is appropriate
                    <br/>• <strong>p ≥ 0.05:</strong> Variables may be independent — EFA inappropriate
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Extraction Methods */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Replace className="w-4 h-4" />
                Extraction Methods
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Principal Axis Factoring (PAF)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extracts <strong>common variance</strong> only.
                    <br/>• Better for finding latent constructs
                    <br/>• Accounts for measurement error
                    <br/>• Preferred for scale development
                    <br/>• More conservative factor loadings
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Principal Component Analysis (PCA)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extracts <strong>total variance</strong> (common + unique).
                    <br/>• Better for data reduction only
                    <br/>• Components, not factors
                    <br/>• Higher loadings (inflated)
                    <br/>• Simpler computation
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Recommendation:</strong> Use PAF when developing scales or looking for 
                  latent constructs. Use PCA when you just need to reduce variables for other analyses.
                </p>
              </div>
            </div>

            <Separator />

            {/* Rotation Methods */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                Rotation Methods
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Orthogonal Rotations (Uncorrelated Factors)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Varimax:</strong> Most common. Maximizes variance of loadings within factors.
                    <br/><strong>Quartimax:</strong> Minimizes factors a variable loads on.
                    <br/><br/>
                    Use when: Factors should be independent/uncorrelated.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Oblique Rotations (Correlated Factors)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Promax:</strong> Fast, good for large datasets.
                    <br/><strong>Oblimin:</strong> More flexible correlation control.
                    <br/><br/>
                    Use when: Factors might reasonably correlate (often true in psychology).
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Recommendation:</strong> Start with oblique rotation. If factor correlations 
                  are &lt; 0.32, orthogonal rotation is fine. For psychological constructs, oblique 
                  is usually more realistic.
                </p>
              </div>
            </div>

            <Separator />

            {/* Determining Number of Factors */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                How Many Factors to Extract?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Kaiser Criterion (Eigenvalue &gt; 1)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Retain factors with eigenvalue &gt; 1.
                    <br/>• Simple rule, but often <strong>overestimates</strong> factors
                    <br/>• Better for PCA than for PAF
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Scree Plot (Elbow Test)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plot eigenvalues; look for the "elbow" where curve flattens.
                    <br/>• Retain factors before the elbow
                    <br/>• Somewhat subjective but useful
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Parallel Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare eigenvalues to random data eigenvalues.
                    <br/>• Most accurate method
                    <br/>• Retain factors with eigenvalues above random
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cumulative Variance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aim for <strong>60-70%</strong> cumulative variance explained.
                    <br/>• Should be combined with other criteria
                    <br/>• Too few factors = underfactoring
                    <br/>• Too many factors = overfactoring
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting Factor Loadings
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Loading Thresholds</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">≥ 0.70</p>
                      <p className="text-muted-foreground">Excellent (50%+ variance)</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">0.55 - 0.69</p>
                      <p className="text-muted-foreground">Good</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">0.45 - 0.54</p>
                      <p className="text-muted-foreground">Fair</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">0.32 - 0.44</p>
                      <p className="text-muted-foreground">Poor (10% variance)</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Practical cutoff: <strong>|loading| ≥ 0.40</strong> for interpretation
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Cross-Loadings</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a variable loads ≥ 0.32 on multiple factors:
                    <br/>• Variable is complex or poorly defined
                    <br/>• Consider removing or revising the item
                    <br/>• May indicate too many or too few factors
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Communality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of variance explained by all factors combined.
                    <br/>• <strong>≥ 0.40:</strong> Variable well represented
                    <br/>• <strong>&lt; 0.40:</strong> Consider removing variable
                    <br/>• Very low values suggest item doesn&apos;t fit
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Do</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check KMO and Bartlett&apos;s test first</li>
                    <li>• Use multiple criteria for # of factors</li>
                    <li>• Try both orthogonal and oblique rotation</li>
                    <li>• Name factors based on high-loading items</li>
                    <li>• Cross-validate with different samples</li>
                    <li>• Follow up with CFA to confirm</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don&apos;t</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use EFA to confirm theory (use CFA)</li>
                    <li>• Rely solely on Kaiser criterion</li>
                    <li>• Ignore cross-loading items</li>
                    <li>• Force a specific number of factors</li>
                    <li>• Use with very small samples</li>
                    <li>• Over-interpret small differences</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Sample Size Guidelines</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Minimum:</strong> 50 observations</li>
                    <li>• <strong>Adequate:</strong> 100 observations</li>
                    <li>• <strong>Good:</strong> 200+ observations</li>
                    <li>• <strong>Ratio:</strong> 5-10 cases per variable</li>
                    <li>• Higher communalities → smaller n OK</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• KMO and Bartlett&apos;s test results</li>
                    <li>• Extraction and rotation methods</li>
                    <li>• Eigenvalues and variance explained</li>
                    <li>• Factor loading matrix (rotated)</li>
                    <li>• Communalities</li>
                    <li>• Factor correlation matrix (if oblique)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> EFA is <strong>exploratory</strong> — 
                it finds patterns in your specific data, not universal truths. The factor structure 
                should make theoretical sense and be replicated in new samples. Always follow EFA 
                with Confirmatory Factor Analysis (CFA) and reliability analysis (Cronbach&apos;s α) 
                to validate your findings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
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
                    <CardTitle className="font-headline text-3xl">Exploratory Factor Analysis</CardTitle>
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
                            <BookOpen className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use EFA when you want to explore relationships among variables without a predetermined 
                            structure. Perfect for developing theories and understanding survey data.
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
                                        <span><strong>Variables:</strong> At least 3, ideally 10+</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 5-10 cases per variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>KMO:</strong> Should be &gt; 0.6</span>
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
                                        <span><strong>Loadings:</strong> &gt; 0.4 is meaningful</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variance:</strong> Aim for 60%+ cumulative</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Eigenvalues:</strong> &gt; 1 for retention</span>
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

// ============ Main Component ============
interface EfaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    restoredState?: {
        params?: {
            selectedItems?: string[];
            nFactors?: number;
            rotationMethod?: string;
            extractionMethod?: string;
        };
        results?: EfaResults;
    };
}

export default function EfaPage({ data, numericHeaders, onLoadExample, restoredState }: EfaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    // View and step state
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Form state
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [nFactors, setNFactors] = useState<number>(3);
    const [rotationMethod, setRotationMethod] = useState('varimax');
    const [extractionMethod, setExtractionMethod] = useState('principal');
    
    // Results state
    const [analysisResult, setAnalysisResult] = useState<EfaResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal state
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    // Derived values
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);
    const maxFactors = useMemo(() => selectedItems.length > 0 ? selectedItems.length - 1 : 1, [selectedItems]);

    // Initialize when data changes
    useEffect(() => {
        if (numericHeaders.length > 0) {
            setSelectedItems(numericHeaders);
            const safeNFactors = Math.min(3, Math.max(1, Math.floor(numericHeaders.length / 2)));
            setNFactors(safeNFactors);
        }
    }, [numericHeaders]);

    // Adjust nFactors if selectedItems change
    useEffect(() => {
        if (selectedItems.length > 0 && nFactors >= selectedItems.length) {
            const safeNFactors = Math.max(1, Math.floor(selectedItems.length / 2));
            setNFactors(safeNFactors);
        }
    }, [selectedItems.length, nFactors]);

    // Handle restored state
    useEffect(() => {
        if (restoredState) {
            setSelectedItems(restoredState.params?.selectedItems || []);
            setNFactors(restoredState.params?.nFactors || 3);
            setRotationMethod(restoredState.params?.rotationMethod || 'varimax');
            setExtractionMethod(restoredState.params?.extractionMethod || 'principal');
            if (restoredState.results) {
                setAnalysisResult(restoredState.results);
            }
            setView('main');
            setCurrentStep(4);
            setMaxReachedStep(6);
        } else {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
        }
    }, [restoredState, canRun]);

    // Reset when data changes (without restored state)
    useEffect(() => {
        if (!restoredState) {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun, restoredState]);

    // Validation checks
    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({
            label: 'Minimum variables selected',
            passed: selectedItems.length >= 3,
            detail: selectedItems.length >= 3 
                ? `${selectedItems.length} variables selected` 
                : `Only ${selectedItems.length} variable(s) selected (minimum: 3)`
        });

        checks.push({
            label: 'Sufficient sample size',
            passed: data.length >= 50,
            detail: `n = ${data.length} observations (${data.length >= 100 ? 'Good' : data.length >= 50 ? 'Adequate' : 'Very small - unstable results'})`
        });

        if (selectedItems.length >= 3) {
            const ratio = data.length / selectedItems.length;
            checks.push({
                label: 'Subject-to-variable ratio',
                passed: ratio >= 5,
                detail: `${ratio.toFixed(1)}:1 ratio (${ratio >= 10 ? 'Good' : ratio >= 5 ? 'Adequate' : 'Low - unstable estimates'})`
            });
        }

        checks.push({
            label: 'Valid factor count',
            passed: nFactors >= 1 && nFactors < selectedItems.length,
            detail: nFactors >= 1 && nFactors < selectedItems.length 
                ? `Extracting ${nFactors} factor(s)` 
                : `Factors must be between 1 and ${selectedItems.length - 1}`
        });

        return checks;
    }, [data, selectedItems, nFactors]);

    const allValidationsPassed = dataValidation
        .filter(c => c.label === 'Minimum variables selected' || c.label === 'Valid factor count')
        .every(check => check.passed);

    // Navigation
    const goToStep = useCallback((step: Step) => {
        setCurrentStep(step);
        setMaxReachedStep(prev => Math.max(prev, step) as Step);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep === 3) {
            handleAnalysis();
        } else if (currentStep < 6) {
            goToStep((currentStep + 1) as Step);
        }
    }, [currentStep, goToStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 1) goToStep((currentStep - 1) as Step);
    }, [currentStep, goToStep]);

    // Handlers
    const handleNFactorsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1) setNFactors(val);
        else if (e.target.value === '') setNFactors(1);
    };

    // Analysis
    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 3) {
            toast({ variant: 'destructive', title: 'Please select at least 3 variables.' });
            return;
        }
        
        if (isNaN(nFactors) || nFactors < 1 || nFactors >= selectedItems.length) {
            toast({ 
                variant: 'destructive', 
                title: 'Factor Number Error', 
                description: `Number of factors must be between 1 and ${selectedItems.length - 1}.` 
            });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/efa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    items: selectedItems,
                    nFactors,
                    rotation: rotationMethod,
                    method: extractionMethod
                })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                // FastAPI returns error in 'detail' field
                const errorMessage = errorResult.detail || errorResult.error || `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: 'Factor analysis results are ready.' });
        } catch (e: unknown) {
            console.error('Analysis error:', e);
            const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
            toast({ variant: 'destructive', title: 'Analysis Error', description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nFactors, rotationMethod, extractionMethod, toast, goToStep]);

    // Downloads
    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) {
            toast({ variant: 'destructive', title: 'No results to download' });
            return;
        }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `EFA_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image;
            link.click();
            toast({ title: "Download complete" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Download failed" });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        
        const summaryData = [{
            n_factors: analysisResult.n_factors,
            n_variables: analysisResult.variables.length,
            kmo: analysisResult.adequacy.kmo,
            bartlett_chi_sq: analysisResult.adequacy.bartlett_statistic,
            bartlett_p: analysisResult.adequacy.bartlett_p_value,
            total_variance_explained: analysisResult.variance_explained.cumulative[analysisResult.n_factors - 1]
        }];
        
        const loadingsData: Record<string, string | number>[] = [];
        analysisResult.variables.forEach((variable, i) => {
            const row: Record<string, string | number> = { variable };
            analysisResult.factor_loadings[i].forEach((loading, f) => {
                row[`factor_${f + 1}`] = loading;
            });
            row.communality = analysisResult.communalities[i];
            loadingsData.push(row);
        });
        
        let csvContent = "EFA SUMMARY\n" + Papa.unparse(summaryData) + "\n\n";
        csvContent += "FACTOR LOADINGS\n" + Papa.unparse(loadingsData) + "\n";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `EFA_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word document..." });
        try {
            const response = await fetch('/api/export/efa-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult,
                    selectedItems,
                    nFactors,
                    rotationMethod,
                    extractionMethod,
                    sampleSize: data.length
                })
            });
            if (!response.ok) throw new Error('Failed to generate document');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `EFA_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to generate document" });
        }
    }, [analysisResult, selectedItems, nFactors, rotationMethod, extractionMethod, data.length, toast]);

    // Show intro page if not ready
    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;

    // Progress Bar Component
    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button 
                            key={step.id} 
                            onClick={() => isClickable && goToStep(step.id)} 
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${
                                isCurrent 
                                    ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' 
                                    : isCompleted 
                                        ? 'bg-primary/80 text-primary-foreground border-primary/80' 
                                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                            }`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <EFAGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Exploratory Factor Analysis</h1>
                    <p className="text-muted-foreground mt-1">Discover latent factors in your data</p>
                </div>
                {/* 👇 버튼 수정 */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
                        <HelpCircle className="w-5 h-5" />
                    </Button>
                </div>
            </div>
    
            <ProgressBar />
            

            <div className="min-h-[500px]">
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose variables for factor analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <DualListBox 
                                allItems={numericHeaders} 
                                selectedItems={selectedItems} 
                                setSelectedItems={setSelectedItems} 
                            />

                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations
                                    {selectedItems.length >= 3 && (
                                        <> • Ratio: <span className="font-semibold text-foreground">{(data.length / selectedItems.length).toFixed(1)}:1</span></>
                                    )}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedItems.length < 3}>
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Analysis Settings</CardTitle>
                                    <CardDescription>Configure extraction and rotation methods</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Number of Factors</Label>
                                    <Input 
                                        type="number" 
                                        value={nFactors} 
                                        onChange={handleNFactorsChange} 
                                        min="1" 
                                        max={maxFactors}
                                        className="h-11"
                                    />
                                    <p className="text-xs text-muted-foreground">Between 1 and {maxFactors}</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium flex items-center gap-1">
                                        <RotateCw className="w-4 h-4" /> Rotation Method
                                    </Label>
                                    <Select value={rotationMethod} onValueChange={setRotationMethod}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="varimax">Varimax (Orthogonal)</SelectItem>
                                            <SelectItem value="promax">Promax (Oblique)</SelectItem>
                                            <SelectItem value="quartimax">Quartimax (Orthogonal)</SelectItem>
                                            <SelectItem value="oblimin">Oblimin (Oblique)</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium flex items-center gap-1">
                                        <Replace className="w-4 h-4" /> Extraction Method
                                    </Label>
                                    <Select value={extractionMethod} onValueChange={setExtractionMethod}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="principal">Principal Axis Factoring</SelectItem>
                                            <SelectItem value="pca">Principal Component Analysis</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Analysis Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variables:</strong> {selectedItems.length} selected</p>
                                    <p>• <strong className="text-foreground">Factors:</strong> {nFactors} to extract</p>
                                    <p>• <strong className="text-foreground">Extraction:</strong> {extractionMethod === 'principal' ? 'Principal Axis Factoring' : 'PCA'}</p>
                                    <p>• <strong className="text-foreground">Rotation:</strong> {rotationMethod.charAt(0).toUpperCase() + rotationMethod.slice(1)}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking if your data is ready for analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                                            check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'
                                        }`}
                                    >
                                        {check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`font-medium text-sm ${
                                                check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'
                                            }`}>
                                                {check.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <BrainCircuit className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    KMO and Bartlett&apos;s test will verify if your data is suitable for factor analysis.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
                                ) : (
                                    <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (() => {
                    const totalVariance = results.variance_explained.cumulative[results.n_factors - 1];
                    const kmo = results.adequacy.kmo;
                    const isAdequate = kmo >= 0.6 && results.adequacy.bartlett_significant;
                    const isGoodVariance = totalVariance >= 60;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>Key patterns discovered in your data</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${
                                    isAdequate 
                                        ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                                        : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'
                                }`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Lightbulb className={`w-5 h-5 ${isAdequate ? 'text-primary' : 'text-rose-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isAdequate ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                Your {selectedItems.length} items can be grouped into <strong>{results.n_factors} main theme(s)</strong> — these are the underlying patterns in your data.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isAdequate ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                These themes explain <strong>{totalVariance.toFixed(0)}%</strong> of what makes responses different — {isGoodVariance ? "that's a good amount!" : 'some patterns may be missing.'}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isAdequate ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {isAdequate 
                                                    ? "Your data is suitable for finding patterns — items are related enough to each other." 
                                                    : "Your data may not be ideal for grouping — items might not relate well to each other."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${
                                    isAdequate && isGoodVariance 
                                        ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                                        : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {isAdequate && isGoodVariance ? (
                                            <CheckCircle2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">
                                                {isAdequate && isGoodVariance 
                                                    ? "Clear Groupings Found" 
                                                    : isAdequate 
                                                        ? "Groupings Found — Consider Refinement" 
                                                        : "Review Needed"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isAdequate && isGoodVariance 
                                                    ? "You can confidently use these groupings to understand and organize your items." 
                                                    : isAdequate 
                                                        ? "The groupings are usable, but consider adding items or revising weak ones for better results." 
                                                        : "The data may not support meaningful groupings. Check if items are truly related."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Data Fit</p>
                                                    <Target className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">
                                                    {kmo >= 0.8 ? 'Great' : kmo >= 0.7 ? 'Good' : kmo >= 0.6 ? 'OK' : 'Weak'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">For pattern finding</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Explained</p>
                                                    <Percent className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{totalVariance.toFixed(0)}%</p>
                                                <p className="text-xs text-muted-foreground">{isGoodVariance ? 'Good coverage' : 'Some missing'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Themes</p>
                                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.n_factors}</p>
                                                <p className="text-xs text-muted-foreground">Groups found</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Items</p>
                                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{selectedItems.length}</p>
                                                <p className="text-xs text-muted-foreground">Analyzed</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Solution Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-lg ${
                                            (kmo >= 0.8 && totalVariance >= 70 && star <= 5) || 
                                            (kmo >= 0.7 && totalVariance >= 60 && star <= 4) || 
                                            (kmo >= 0.6 && totalVariance >= 50 && star <= 3) || 
                                            (kmo >= 0.5 && star <= 2) || 
                                            star <= 1 
                                                ? 'text-amber-400' 
                                                : 'text-gray-300 dark:text-gray-600'
                                        }`}>★</span>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">
                                    Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (() => {
                    const totalVariance = results.variance_explained.cumulative[results.n_factors - 1];
                    const kmo = results.adequacy.kmo;
                    const isAdequate = kmo >= 0.6 && results.adequacy.bartlett_significant;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Lightbulb className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Why This Conclusion?</CardTitle>
                                        <CardDescription>Simple explanation of how we reached this result</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What We Did</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We looked at your <strong className="text-foreground">{selectedItems.length} items</strong> to find hidden patterns — 
                                                groups of items that tend to go together. Think of it like sorting books by genre.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Is Your Data Good for Grouping?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {isAdequate 
                                                    ? <>Yes! Your items are related enough to each other to form meaningful groups. The connections between items are <strong className="text-foreground">{kmo >= 0.8 ? 'excellent' : kmo >= 0.7 ? 'good' : 'acceptable'}</strong>.</>
                                                    : <>There may be an issue. Your items don&apos;t connect well enough with each other. They might be measuring very different things.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What Themes Emerged?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We found <strong className="text-foreground">{results.n_factors} distinct theme(s)</strong> in your data. 
                                                Together, these themes explain <strong className="text-foreground">{totalVariance.toFixed(0)}%</strong> of what makes responses vary.
                                                {totalVariance >= 60 ? " That's a good amount — we captured most of the important patterns." : " Some variation remains unexplained — there may be other themes we didn't capture."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What This Means for You</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {isAdequate 
                                                    ? `You can organize your ${selectedItems.length} items into ${results.n_factors} meaningful categories. Items within each theme measure the same underlying concept.` 
                                                    : "Before using these groupings, consider whether your items truly belong together. You may need to revise your questions."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${
                                    isAdequate 
                                        ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                                        : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'
                                }`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {isAdequate ? (
                                            <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Clear Themes Found</>
                                        ) : (
                                            <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: Groupings Need Review</>
                                        )}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isAdequate 
                                            ? `Your data supports ${results.n_factors} themes. You can name each theme based on what the items in it have in common.` 
                                            : "The groupings may not be reliable. Consider improving your items or checking if they truly measure related concepts."}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />Coverage Reference
                                    </h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">70%+</p>
                                            <p className="text-muted-foreground">Excellent</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">60%+</p>
                                            <p className="text-muted-foreground">Good</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">50%+</p>
                                            <p className="text-muted-foreground">Acceptable</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">&lt;50%</p>
                                            <p className="text-muted-foreground">Weak</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between">
                                <Button variant="ghost" onClick={prevStep}>
                                    <ChevronLeft className="mr-2 w-4 h-4" />Back
                                </Button>
                                <Button onClick={nextStep} size="lg">
                                    View Full Statistics<ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Statistical Details</h2>
                                <p className="text-sm text-muted-foreground">Full technical report</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                        PNG Image
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}>
                                        <FileText className="mr-2 h-4 w-4" />Word Document
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                        <Code className="mr-2 h-4 w-4" />Python Code
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                        <FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Exploratory Factor Analysis Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {results.n_factors} Factors | {selectedItems.length} Variables | {rotationMethod.charAt(0).toUpperCase() + rotationMethod.slice(1)} Rotation | {new Date().toLocaleDateString()}
                                </p>
                            </div>

                            <StatisticalSummaryCards results={results} />

                            {/* Detailed Analysis */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Detailed Analysis</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Overall Analysis */}
                                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            <h3 className="font-semibold">Overall Analysis</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            An exploratory factor analysis was conducted on {selectedItems.length} variables using{' '}
                                            <strong className="text-foreground">{extractionMethod === 'principal' ? 'Principal Axis Factoring' : 'PCA'}</strong> with{' '}
                                            <strong className="text-foreground">{rotationMethod.charAt(0).toUpperCase() + rotationMethod.slice(1)} rotation</strong>.
                                            The analysis yielded a <strong className="text-foreground">{results.n_factors}-factor solution</strong> explaining{' '}
                                            <strong className="text-foreground">{results.variance_explained.cumulative[results.n_factors - 1].toFixed(1)}%</strong> of total variance.
                                            Data adequacy was confirmed: KMO = {results.adequacy.kmo.toFixed(3)}, Bartlett&apos;s test χ² = {results.adequacy.bartlett_statistic.toFixed(2)},{' '}
                                            <em>p</em> {results.adequacy.bartlett_p_value < 0.001 ? '< .001' : `= ${results.adequacy.bartlett_p_value.toFixed(3)}`}.
                                        </p>
                                    </div>

                                    {/* Key Insights */}
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-semibold">Key Insights</h3>
                                        </div>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <p>• Eigenvalues: {results.eigenvalues.slice(0, results.n_factors).map(e => e.toFixed(2)).join(', ')}</p>
                                            <p>• Variance per factor: {results.variance_explained.per_factor.map((v, i) => `Factor ${i+1}: ${v.toFixed(1)}%`).join('; ')}</p>
                                            <p>• Average communality: {(results.communalities.reduce((a, b) => a + b, 0) / results.communalities.length).toFixed(3)}</p>
                                        </div>
                                    </div>

                                    {/* Recommendations */}
                                    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            <h3 className="font-semibold">Recommendations</h3>
                                        </div>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <p>• Confirm the factor structure with Confirmatory Factor Analysis (CFA)</p>
                                            <p>• Calculate Cronbach&apos;s α for items loading on each factor</p>
                                            <p>• Review items with cross-loadings &gt; .30 on multiple factors</p>
                                            <p>• Name factors based on high-loading items</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Visualization */}
                            {results.plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Visualization</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Image 
                                            src={results.plot} 
                                            alt="EFA Visual Summary" 
                                            width={1400} 
                                            height={600} 
                                            className="w-full rounded-md border" 
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Data Adequacy & Variance */}
                            <TooltipProvider>
                                <div className="grid lg:grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Data Adequacy</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell className="font-medium">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help border-b border-dashed border-muted-foreground">KMO</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs">{efaTermDefinitions.kmo}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="font-mono">{results.adequacy.kmo.toFixed(3)}</span>
                                                            <Badge className="ml-2">{results.adequacy.kmo_interpretation}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help border-b border-dashed border-muted-foreground">Bartlett&apos;s χ²</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs">{efaTermDefinitions.bartlett}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">{results.adequacy.bartlett_statistic.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Bartlett&apos;s p</TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {results.adequacy.bartlett_p_value < 0.001 ? '< .001' : results.adequacy.bartlett_p_value.toFixed(4)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>

                                    <Card className="lg:col-span-2">
                                        <CardHeader>
                                            <CardTitle>Variance Explained</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Factor</TableHead>
                                                        <TableHead className="text-right">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help border-b border-dashed border-muted-foreground">Eigenvalue</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs">{efaTermDefinitions.eigenvalue}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableHead>
                                                        <TableHead className="text-right">% Variance</TableHead>
                                                        <TableHead className="text-right">Cumulative %</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {results.eigenvalues.slice(0, results.n_factors).map((ev, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>Factor {i + 1}</TableCell>
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
                            </TooltipProvider>

                            {/* Factor Loadings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <Tooltip>
                                            <TooltipProvider>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help border-b border-dashed border-muted-foreground">Factor Loadings</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">{efaTermDefinitions.factorLoading}</p>
                                                </TooltipContent>
                                            </TooltipProvider>
                                        </Tooltip>
                                        {' '}(Rotated)
                                    </CardTitle>
                                    <CardDescription>Loadings &gt; 0.4 are highlighted</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-80">
                                        <TooltipProvider>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="sticky left-0 bg-background">Variable</TableHead>
                                                        {Array.from({ length: results.n_factors }, (_, i) => (
                                                            <TableHead key={i} className="text-right">Factor {i + 1}</TableHead>
                                                        ))}
                                                        <TableHead className="text-right">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help border-b border-dashed border-muted-foreground">Communality</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs">{efaTermDefinitions.communality}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {results.variables.map((variable, varIndex) => (
                                                        <TableRow key={variable}>
                                                            <TableCell className="font-medium sticky left-0 bg-background">{variable}</TableCell>
                                                            {results.factor_loadings[varIndex].map((loading, factorIndex) => (
                                                                <TableCell
                                                                    key={factorIndex}
                                                                    className={`text-right font-mono ${Math.abs(loading) >= 0.4 ? 'font-bold text-primary' : ''}`}
                                                                >
                                                                    {loading.toFixed(3)}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="text-right font-mono">{results.communalities[varIndex].toFixed(3)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TooltipProvider>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-4 flex justify-start">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
        </div>
    );
}

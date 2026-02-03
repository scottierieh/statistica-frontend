'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Component, Check, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, BarChart, Shrink, TrendingDown, Zap, Percent, Layers, Target, Lightbulb, BookOpen, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Info, ArrowRight, ChevronDown, FileText, Sparkles, FileType, FileCode, BarChart3, CheckCircle, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/principal_component_analysis.py?alt=media";

// PCA 관련 용어 정의
const pcaTermDefinitions: Record<string, string> = {
    "Principal Component Analysis (PCA)": "A dimensionality reduction technique that transforms correlated variables into a set of uncorrelated components, ordered by the amount of variance they explain.",
    "Principal Component (PC)": "A new variable created as a linear combination of original variables. Each component captures a different dimension of variance in the data.",
    "Eigenvalue": "The amount of variance explained by each principal component. Eigenvalues represent the variance of the data projected onto each component.",
    "Eigenvector": "The direction in the original variable space along which a principal component lies. Defines how original variables combine to form each component.",
    "Explained Variance Ratio": "The proportion of total variance captured by each principal component. Expressed as a percentage of total data variance.",
    "Cumulative Variance": "The running total of variance explained as components are added. Used to determine how many components to retain.",
    "Kaiser Criterion": "A rule for selecting components: retain only those with eigenvalues greater than 1. Components with eigenvalue > 1 explain more variance than a single original variable.",
    "Scree Plot": "A graph showing eigenvalues plotted against component numbers. The 'elbow' point suggests the optimal number of components to retain.",
    "Loading": "The correlation between an original variable and a principal component. Values range from -1 to 1; loadings > |0.4| are typically considered meaningful.",
    "Component Loading Matrix": "A table showing all loadings for all variables on all components. Used to interpret what each component represents.",
    "Standardization (Z-scoring)": "Transforming variables to have mean = 0 and standard deviation = 1. Essential for PCA when variables are measured on different scales.",
    "Variance": "A measure of how spread out data values are. PCA aims to capture maximum variance with minimum components.",
    "Covariance Matrix": "A matrix showing how each pair of variables varies together. PCA extracts components from this matrix (or correlation matrix).",
    "Correlation Matrix": "A standardized covariance matrix where all diagonal elements equal 1. Used in PCA when variables have different scales.",
    "Dimension Reduction": "The process of reducing the number of variables while retaining most of the information. PCA achieves this by creating fewer components that capture most variance.",
    "Orthogonal Components": "Components that are uncorrelated with each other (perpendicular in geometric terms). A key property of principal components.",
    "Rotation": "A transformation applied after PCA to improve interpretability. Common methods include Varimax and Promax.",
    "Subject-to-Variable Ratio": "The number of observations divided by number of variables. Ratios of 5:1 or higher are recommended for stable PCA solutions.",
    "Communality": "The proportion of a variable's variance explained by all retained components. Higher communality means the variable is well-represented.",
    "Component Scores": "The values of each observation on each principal component. Can be used in subsequent analyses like regression or clustering."
};

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

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// Python Code Modal Component
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
        link.download = 'principal_component_analysis.py';
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
                        Python Code - Principal Component Analysis
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

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        PCA Statistical Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in Principal Component Analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(pcaTermDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold">{term}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: PcaResults }) => {
    const kaiserComponents = results.eigenvalues.filter(ev => ev > 1).length;
    const totalVariance = results.cumulative_variance_ratio[results.n_components - 1] * 100;
    const firstComponentVariance = results.explained_variance_ratio[0] * 100;
    const strongLoadings = results.loadings.flat().filter(l => Math.abs(l) > 0.4).length;
    const totalLoadings = results.loadings.flat().length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Variance</p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{totalVariance.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">By {results.n_components} components</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Kaiser Criterion</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{kaiserComponents}</p>
                        <p className="text-xs text-muted-foreground">Eigenvalue &gt; 1</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">PC1 Variance</p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{firstComponentVariance.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">First component</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Strong Loadings</p>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{strongLoadings}/{totalLoadings}</p>
                        <p className="text-xs text-muted-foreground">{((strongLoadings/totalLoadings)*100).toFixed(0)}% &gt; 0.4</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};



const PCAGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Principal Component Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is PCA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Component className="w-4 h-4" />
                What is Principal Component Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                PCA is a <strong>dimension reduction</strong> technique that transforms correlated 
                variables into a smaller set of uncorrelated <strong>principal components</strong>. 
                Each component captures a different dimension of variance in your data.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Core Idea:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Many variables → Fewer components → Same (most) information
                    <br/><br/>
                    PCA finds new axes (components) that best explain the spread of your data, 
                    with the first component capturing the most variance, the second capturing 
                    the next most (orthogonal to the first), and so on.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* PCA vs Factor Analysis */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                PCA vs Factor Analysis
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Principal Component Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Extracts <strong>total variance</strong></li>
                    <li>• Creates <strong>components</strong> (linear combinations)</li>
                    <li>• Goal: Data reduction & visualization</li>
                    <li>• No underlying latent structure assumed</li>
                    <li>• Deterministic solution</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-1">Factor Analysis (EFA/CFA)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Extracts <strong>common variance</strong> only</li>
                    <li>• Identifies <strong>latent factors</strong></li>
                    <li>• Goal: Understand underlying structure</li>
                    <li>• Assumes latent constructs exist</li>
                    <li>• Requires rotation for interpretation</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>When to use PCA:</strong> Data reduction, removing multicollinearity, 
                  visualization. <strong>When to use FA:</strong> Finding latent constructs, scale development.
                </p>
              </div>
            </div>

            <Separator />

            {/* How Many Components */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                How Many Components to Keep?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Kaiser Criterion (Eigenvalue &gt; 1)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep components with eigenvalue &gt; 1. These explain more variance than 
                    a single original variable (which has eigenvalue = 1 when standardized).
                    <br/>• Simple rule, but tends to <strong>overfactor</strong> with many variables
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Scree Plot (Elbow Method)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plot eigenvalues and look for the "elbow" where the curve flattens.
                    <br/>• Retain components before the elbow
                    <br/>• Somewhat subjective but widely used
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cumulative Variance Threshold</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep enough components to explain a target variance:
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">&gt;85%</p>
                      <p className="text-muted-foreground">Excellent</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">70-85%</p>
                      <p className="text-muted-foreground">Good</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">60-70%</p>
                      <p className="text-muted-foreground">Fair</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">&lt;60%</p>
                      <p className="text-muted-foreground">Poor</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Parallel Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare eigenvalues to those from random data of same size.
                    <br/>• Most accurate method
                    <br/>• Retain components with eigenvalues above random
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Understanding PCA Output
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Eigenvalues</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The variance explained by each component.
                    <br/>• Sum of all eigenvalues = number of variables
                    <br/>• First PC has largest eigenvalue, then decreasing
                    <br/>• % Variance = Eigenvalue / Total × 100
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Component Loadings</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Correlation between original variables and components (-1 to 1).
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">|Loading| ≥ 0.70</p>
                      <p className="text-muted-foreground">Strong (50%+ variance)</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">|Loading| ≥ 0.40</p>
                      <p className="text-muted-foreground">Moderate (meaningful)</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Component Scores</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    New values for each observation on each component.
                    <br/>• Use as variables in subsequent analyses
                    <br/>• Standardized (mean = 0, SD = 1)
                    <br/>• Uncorrelated with each other
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Components */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Interpreting Components
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  Name each component based on variables with <strong>high loadings</strong> (|loading| ≥ 0.40):
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-background">
                    <p><strong>Step 1:</strong> Look at variables with highest |loadings| on that component</p>
                  </div>
                  <div className="p-2 rounded bg-background">
                    <p><strong>Step 2:</strong> Find what these variables have in common</p>
                  </div>
                  <div className="p-2 rounded bg-background">
                    <p><strong>Step 3:</strong> Name the component (e.g., "Academic Performance", "Social Skills")</p>
                  </div>
                  <div className="p-2 rounded bg-background">
                    <p><strong>Step 4:</strong> Note the sign — positive and negative loadings are opposites on that dimension</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Requirements & Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Requirements & Assumptions
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Requirements</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Variables:</strong> Continuous/numeric</li>
                    <li>• <strong>Sample size:</strong> n ≥ 50, ideally 100+</li>
                    <li>• <strong>Ratio:</strong> 5-10 observations per variable</li>
                    <li>• <strong>Correlations:</strong> Variables should correlate</li>
                    <li>• <strong>No outliers:</strong> PCA is sensitive to outliers</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Assumptions</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Linearity:</strong> Linear relationships among variables</li>
                    <li>• <strong>Large variance = important:</strong> May not be true</li>
                    <li>• <strong>Standardization:</strong> Use when scales differ</li>
                    <li>• <strong>No perfect multicollinearity</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Uses */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Common Applications
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Good Use Cases</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Reducing many variables for regression</li>
                    <li>• Removing multicollinearity</li>
                    <li>• Visualizing high-dimensional data (2D/3D)</li>
                    <li>• Preprocessing for clustering</li>
                    <li>• Image compression</li>
                    <li>• Feature extraction in ML</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-1">Limitations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Components may be hard to interpret</li>
                    <li>• Assumes linear relationships</li>
                    <li>• Sensitive to outliers</li>
                    <li>• Sensitive to variable scaling</li>
                    <li>• Maximum variance ≠ most meaningful</li>
                    <li>• Not for categorical data</li>
                  </ul>
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
                    <li>• Standardize variables with different scales</li>
                    <li>• Check for outliers first</li>
                    <li>• Use multiple criteria for # components</li>
                    <li>• Examine scree plot visually</li>
                    <li>• Interpret components substantively</li>
                    <li>• Report variance explained</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don&apos;t</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use with categorical variables</li>
                    <li>• Rely only on Kaiser criterion</li>
                    <li>• Ignore interpretability</li>
                    <li>• Expect latent constructs (use FA)</li>
                    <li>• Use with uncorrelated variables</li>
                    <li>• Forget about outlier influence</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Number of variables analyzed</li>
                    <li>• Sample size</li>
                    <li>• Criteria for # components</li>
                    <li>• Eigenvalues and variance explained</li>
                    <li>• Component loadings matrix</li>
                    <li>• Interpretation of components</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">After PCA</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use component scores in regression</li>
                    <li>• Use for clustering input</li>
                    <li>• Create visualizations (biplot)</li>
                    <li>• Consider rotation if interpreting</li>
                    <li>• Validate with new data if possible</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> PCA is a <strong>mathematical 
                transformation</strong>, not a statistical test. Components are defined to maximize 
                variance, not to be meaningful or interpretable. If you want to find underlying 
                latent constructs, consider Factor Analysis instead. PCA is most valuable for 
                data reduction and visualization, especially as preprocessing for other analyses.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const pcaExample = exampleDatasets.find(d => d.id === 'well-being-survey');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Component className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Principal Component Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Transform complex data into simpler, meaningful components
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Shrink className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Dimension Reduction</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reduce many variables to fewer components
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingDown className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Remove Redundancy</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Create uncorrelated components
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visualization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Enable 2D/3D data visualization
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
                            Use PCA when you have many correlated variables and want to reduce complexity while retaining most of the information.
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
                                        <span><strong>Variables:</strong> At least 2 numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 5-10 observations per variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Correlations:</strong> Variables should be correlated</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You'll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Kaiser rule:</strong> Components with eigenvalue &gt; 1</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variance:</strong> 70-90% explained is good</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Loadings:</strong> Variable-component relationships</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {pcaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(pcaExample)} size="lg">
                                <Component className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface PcaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function PcaPage({ data, numericHeaders, onLoadExample }: PcaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [nComponents, setNComponents] = useState<number | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<FullPcaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'Sufficient variables selected', 
            passed: selectedItems.length >= 2, 
            detail: selectedItems.length >= 2 ? `${selectedItems.length} variables selected` : 'Select at least 2 variables' 
        });
        
        checks.push({ 
            label: 'Adequate sample size', 
            passed: data.length >= selectedItems.length * 5, 
            detail: `n = ${data.length} (recommended: ${selectedItems.length * 5}+ for ${selectedItems.length} variables)` 
        });
        
        const ratio = data.length / (selectedItems.length || 1);
        checks.push({ 
            label: 'Subject-to-variable ratio', 
            passed: ratio >= 5, 
            detail: `${ratio.toFixed(1)}:1 ratio (recommended: 5:1 or higher)` 
        });
        
        if (nComponents) {
            checks.push({ 
                label: 'Components ≤ variables', 
                passed: nComponents <= selectedItems.length, 
                detail: nComponents <= selectedItems.length ? `Extracting ${nComponents} components` : `Cannot extract ${nComponents} from ${selectedItems.length} variables` 
            });
        }
        
        return checks;
    }, [data, selectedItems, nComponents]);

    const allValidationsPassed = useMemo(() => {
        return dataValidation.filter(c => c.label === 'Sufficient variables selected').every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0) {
            setView('intro');
        } else if (canRun) {
            setSelectedItems(numericHeaders);
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const goToStep = (step: Step) => { 
        setCurrentStep(step); 
        if (step > maxReachedStep) setMaxReachedStep(step); 
    };
    
    const nextStep = () => { 
        if (currentStep === 3) { 
            handleAnalysis(); 
        } else if (currentStep < 6) { 
            goToStep((currentStep + 1) as Step); 
        } 
    };
    
    const prevStep = () => { 
        if (currentStep > 1) goToStep((currentStep - 1) as Step); 
    };

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `PCA_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { 
            toast({ variant: 'destructive', title: "Download failed" }); 
        } finally { 
            setIsDownloading(false); 
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "PCA RESULTS\n";
        csvContent += `Variables: ${selectedItems.length}\nComponents: ${results.n_components}\n`;
        csvContent += `Total Variance: ${(results.cumulative_variance_ratio[results.n_components - 1] * 100).toFixed(1)}%\n\n`;
        csvContent += "EIGENVALUES\n";
        const eigenData = results.eigenvalues.map((ev, i) => ({
            Component: `PC${i + 1}`,
            Eigenvalue: ev.toFixed(4),
            Variance: (results.explained_variance_ratio[i] * 100).toFixed(2) + '%',
            Cumulative: (results.cumulative_variance_ratio[i] * 100).toFixed(2) + '%'
        }));
        csvContent += Papa.unparse(eigenData) + "\n\n";
        csvContent += "LOADINGS\n";
        const loadingsData = results.variables.map((variable, i) => {
            const row: any = { Variable: variable };
            results.loadings[i].forEach((l, j) => { row[`PC${j + 1}`] = l.toFixed(4); });
            return row;
        });
        csvContent += Papa.unparse(loadingsData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `PCA_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, selectedItems, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Select at least 2 variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/pca`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedItems, nComponents })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') {
                    errorMsg = errorResult.detail;
                } else if (Array.isArray(errorResult.detail)) {
                    errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                } else if (errorResult.error) {
                    errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                }
                throw new Error(errorMsg);
            }

            const result: FullPcaResponse = await response.json();
            if ((result as any).error) {
                const errMsg = typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error);
                throw new Error(errMsg);
            }
            
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'PCA Complete', description: 'Results are ready.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nComponents, toast]);


    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult?.results) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/pca-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult.results,
                selectedItems,
                nComponents,
                sampleSize: data.length
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `PCA_Report_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, selectedItems, nComponents, data.length, toast]);



    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!analysisResult);
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
                    return (
                        <button 
                            key={step.id} 
                            onClick={() => isClickable && goToStep(step.id as Step)} 
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 transition-all ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 
                                ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <PCAGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Principal Component Analysis</h1>
                    <p className="text-muted-foreground mt-1">Dimension reduction and data simplification</p>
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
                                    <CardDescription>Choose numeric variables for PCA</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Variables for PCA</Label>
                                <ScrollArea className="h-48 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.map(h => (
                                            <div key={h} className="flex items-center space-x-2">
                                                <Checkbox id={`pca-${h}`} checked={selectedItems.includes(h)} onCheckedChange={(c) => handleItemSelectionChange(h, !!c)} />
                                                <label htmlFor={`pca-${h}`} className="text-sm cursor-pointer">{h}</label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">{selectedItems.length} of {numericHeaders.length} variables selected</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Sample size: <span className="font-semibold text-foreground">{data.length}</span> | 
                                    Ratio: <span className="font-semibold text-foreground">{(data.length / (selectedItems.length || 1)).toFixed(1)}:1</span>
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Analysis Settings</CardTitle>
                                    <CardDescription>Configure PCA parameters</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Number of Components (Optional)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="Auto (based on eigenvalues > 1)" 
                                    value={nComponents ?? ''} 
                                    onChange={e => setNComponents(e.target.value ? parseInt(e.target.value) : null)} 
                                    min="1" 
                                    max={selectedItems.length || 1} 
                                    className="h-11" 
                                />
                                <p className="text-xs text-muted-foreground">Leave empty to auto-determine using Kaiser criterion (eigenvalue &gt; 1)</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variables:</strong> {selectedItems.length} selected</p>
                                    <p>• <strong className="text-foreground">Components:</strong> {nComponents || 'Auto (eigenvalue > 1)'}</p>
                                    <p>• <strong className="text-foreground">Method:</strong> Principal Component Analysis</p>
                                    <p>• <strong className="text-foreground">Standardization:</strong> Variables will be z-scored</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />
                                    Kaiser Rule
                                </h4>
                                <p className="text-sm text-muted-foreground">Components with eigenvalue &gt; 1 explain more variance than a single original variable, so they're worth retaining.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking if your data is ready for PCA</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Component className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">PCA will extract orthogonal components maximizing explained variance.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run PCA<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const totalVariance = results.cumulative_variance_ratio[results.n_components - 1] * 100;
                    const kaiserComponents = results.eigenvalues.filter(ev => ev > 1).length;
                    const isGood = totalVariance >= 70;
                    const pc1Variance = (results.explained_variance_ratio[0] * 100).toFixed(1);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>PCA dimension reduction results</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                Reduced <strong>{selectedItems.length} variables</strong> to <strong>{results.n_components} components</strong>. 
                                                {isGood ? ' Information loss is minimized.' : ' More components may be needed.'}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                Selected components retain <strong>{totalVariance.toFixed(1)}%</strong> of total information. 
                                                {totalVariance >= 80 ? ' (Excellent)' : totalVariance >= 70 ? ' (Good)' : ' (Needs improvement)'}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                The first component (PC1) alone explains <strong>{pc1Variance}%</strong> of variance.
                                                {parseFloat(pc1Variance) >= 50 ? ' Strong common pattern in data.' : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Effective Dimension Reduction!" : "Consider More Components"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? `Successfully reduced ${selectedItems.length} variables to ${results.n_components} while preserving information. Use these components for analysis.`
                                                    : "Less than 70% of information is retained. Consider increasing the number of components."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Cumulative Variance:</strong> {totalVariance.toFixed(1)}% — how much of original variation is explained. {totalVariance >= 80 ? '≥80% is excellent.' : totalVariance >= 70 ? '70-80% is good.' : '<70% indicates significant information loss.'}</p>
                                        <p>• <strong>Kaiser Criterion:</strong> {kaiserComponents} components — number with eigenvalue &gt; 1. These components explain more than a single variable.</p>
                                        <p>• <strong>Eigenvalues:</strong> {results.eigenvalues.slice(0, 3).map(e => e.toFixed(2)).join(', ')}{results.eigenvalues.length > 3 ? '...' : ''} — variance explained by each component. Values &gt; 1 indicate meaningful components.</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Reduction Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = totalVariance >= 90 ? 5 : totalVariance >= 80 ? 4 : totalVariance >= 70 ? 3 : totalVariance >= 60 ? 2 : 1;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (() => {
                    const topLoadings = results.loadings[0]
                        .map((l, i) => ({ variable: results.variables[i], loading: l }))
                        .sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading))
                        .slice(0, 3);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Lightbulb className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Why This Conclusion?</CardTitle>
                                        <CardDescription>Understanding PCA results</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What PCA Does</h4>
                                            <p className="text-sm text-muted-foreground">
                                                PCA transforms <strong className="text-foreground">{selectedItems.length} correlated variables</strong> into 
                                                <strong className="text-foreground"> {results.n_components} uncorrelated components</strong>, 
                                                each capturing a different dimension of variance in your data.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Eigenvalues & Kaiser Rule</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Eigenvalues show how much variance each component explains. Components with eigenvalue &gt; 1 
                                                explain more than a single original variable, so <strong className="text-foreground">{results.eigenvalues.filter(ev => ev > 1).length} components</strong> meet this criterion.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Interpreting PC1</h4>
                                            <p className="text-sm text-muted-foreground">
                                                The first component (PC1) captures {(results.explained_variance_ratio[0] * 100).toFixed(1)}% of variance. 
                                                It's most strongly defined by: 
                                                {topLoadings.map((l, i) => (
                                                    <span key={l.variable}><strong className="text-foreground"> {l.variable}</strong> ({l.loading > 0 ? '+' : ''}{l.loading.toFixed(2)}){i < topLoadings.length - 1 ? ',' : '.'}</span>
                                                ))}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Practical Use</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Use these {results.n_components} components instead of {selectedItems.length} original variables for:
                                                regression, clustering, or visualization, reducing complexity while retaining {(results.cumulative_variance_ratio[results.n_components - 1] * 100).toFixed(0)}% of information.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/30">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Successfully reduced {selectedItems.length} variables to {results.n_components} principal components, 
                                        capturing {(results.cumulative_variance_ratio[results.n_components - 1] * 100).toFixed(1)}% of total variance.
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><Info className="w-4 h-4" />Variance Explained Guide</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;60%</p><p className="text-muted-foreground">Poor</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">60-70%</p><p className="text-muted-foreground">Fair</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">70-85%</p><p className="text-muted-foreground">Good</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;85%</p><p className="text-muted-foreground">Excellent</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between">
                                <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                                <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && analysisResult && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Statistical Details</h2>
                            <p className="text-sm text-muted-foreground">Full technical report</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    CSV Spreadsheet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                    PNG Image
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}>
                                    <FileType className="mr-2 h-4 w-4" />
                                    Word Document
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                    <Code className="mr-2 h-4 w-4" />
                                    Python Code
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF Report
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Principal Component Analysis Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedItems.length} Variables | {results.n_components} Components | {(results.cumulative_variance_ratio[results.n_components - 1] * 100).toFixed(1)}% Variance | {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Detailed Analysis */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary</h3>
                                    </div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        Principal component analysis was conducted on {selectedItems.length} variables 
                                        with <em>N</em> = {data.length} observations. Components were extracted based on 
                                        {nComponents ? ` a specified ${nComponents} components` : ' the Kaiser criterion (eigenvalue > 1)'}.
                                    </p>
                                    
                                    <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                        The analysis yielded {results.n_components} components with eigenvalues greater than 1.0, 
                                        collectively explaining {(results.cumulative_variance_ratio[results.n_components - 1] * 100).toFixed(1)}% of the total variance. 
                                        The first component (PC1) explained {(results.explained_variance_ratio[0] * 100).toFixed(1)}% of variance 
                                        (<span className="font-mono">λ = {results.eigenvalues[0].toFixed(3)}</span>).
                                    </p>
                                    
                                    <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                        The subject-to-variable ratio was {(data.length / selectedItems.length).toFixed(1)}:1, 
                                        {data.length / selectedItems.length >= 5 ? ' meeting' : ' below'} the recommended minimum of 5:1 for stable PCA solutions.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Visual Summary</CardTitle>
                                    <CardDescription>Scree plot and loadings visualization</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={analysisResult.plot} alt="PCA Plots" width={1500} height={1200} className="w-3/4 rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid lg:grid-cols-2 gap-4">
                            {/* Eigenvalues Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Eigenvalues & Variance</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Component</TableHead>
                                                <TableHead className="text-right">Eigenvalue</TableHead>
                                                <TableHead className="text-right">% Variance</TableHead>
                                                <TableHead className="text-right">Cumulative %</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.eigenvalues.map((ev, i) => (
                                                <TableRow key={i} className={ev > 1 ? 'font-semibold' : ''}>
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

                            {/* Loadings Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Component Loadings</CardTitle>
                                    <CardDescription>How variables contribute to each component</CardDescription>
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
                                                            <TableCell key={compIndex} className={`text-right font-mono ${Math.abs(loading) >= 0.4 ? 'font-bold text-primary' : ''}`}>
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
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                )}
            </div>

            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />

            {/* Glossary Modal */}
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
        </div>
    );
}

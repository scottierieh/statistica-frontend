'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, Maximize2, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, FileCode, TrendingUp, Compass, ScatterChart, Shield, BarChart3, Activity, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/mds_analysis.py?alt=media";

// Statistical terms glossary for MDS analysis
const mdsTermDefinitions: Record<string, string> = {
    "Multidimensional Scaling (MDS)": "A technique for visualizing the level of similarity or dissimilarity between objects. MDS places each object in N-dimensional space such that distances between points reflect original (dis)similarities.",
    "Stress": "A measure of how well the MDS solution represents the original distances. Lower stress indicates better fit. Kruskal's stress formula is the most commonly used measure.",
    "Normalized Stress": "Stress value scaled between 0 and 1 for easier interpretation. Also known as Kruskal's stress-1 formula.",
    "Stress Quality Guidelines": "Kruskal's (1964) guidelines: <0.05 = Excellent, 0.05-0.10 = Good, 0.10-0.20 = Fair, >0.20 = Poor. These thresholds help interpret how well distances are preserved.",
    "Shepard Diagram": "A scatter plot of original dissimilarities vs. MDS distances. Points along the diagonal indicate perfect preservation. Used to diagnose the quality of the MDS solution.",
    "R-squared (R²)": "The proportion of variance in the original distances explained by the MDS distances. Higher values indicate better fit. Also called the coefficient of determination.",
    "Euclidean Distance": "Straight-line distance between two points. The most common distance metric, calculated as the square root of the sum of squared differences between coordinates.",
    "Manhattan Distance": "City-block distance, calculated as the sum of absolute differences between coordinates. Also called L1 norm or taxicab distance.",
    "Cosine Distance": "Measures the angle between two vectors rather than their magnitude. Useful when the direction of data points is more important than their absolute values.",
    "Correlation Distance": "1 minus the Pearson correlation coefficient. Measures similarity in patterns rather than absolute values. Useful for comparing profiles.",
    "Metric MDS": "Classical MDS that attempts to preserve the actual distances between objects. Assumes distances are on a ratio or interval scale.",
    "Non-metric MDS": "Ordinal MDS that preserves only the rank order of distances. More robust when the exact distances are uncertain but relative rankings are reliable.",
    "Dimensionality": "The number of dimensions in the MDS solution. 2D and 3D are common for visualization. Higher dimensions may reduce stress but are harder to interpret.",
    "Configuration": "The set of coordinates representing each object in the reduced-dimensional space. The final output of MDS analysis.",
    "Dissimilarity Matrix": "A symmetric matrix containing pairwise dissimilarities (or distances) between all objects. Input to the MDS algorithm.",
    "Eigenvalues": "In classical MDS, eigenvalues indicate the variance explained by each dimension. Larger eigenvalues correspond to more important dimensions.",
    "Scree Plot": "A plot showing stress values for different numbers of dimensions. Helps determine the optimal dimensionality—look for the 'elbow' where adding dimensions provides diminishing returns.",
    "Perceptual Map": "A visual representation of how consumers perceive brands, products, or concepts relative to each other. Often created using MDS from similarity ratings.",
    "Proximity": "In the MDS map, objects that are close together are more similar, while distant objects are more dissimilar. Only relative positions matter, not absolute coordinates.",
    "Rotation": "MDS solutions are rotation-invariant—the configuration can be rotated without changing the interpretation. Axes don't have inherent meaning unless interpreted post-hoc."
};

interface Coordinate { label: string; dim1: number; dim2: number; dim3?: number; }
interface FitStatistics { correlation: number; r_squared: number; stress_1: number; stress_2: number; }
interface KeyInsight { title: string; description: string; }
interface Interpretation { stress_quality: string; key_insights: KeyInsight[]; overall_fit: string; }
interface AnalysisResults { coordinates: Coordinate[]; stress: number; normalized_stress: number; stress_quality: string; fit_statistics: FitStatistics; distance_metric: string; n_dimensions: number; metric_mds: boolean; n_objects: number; n_variables: number; mds_plot: string | null; shepard_plot: string | null; distance_heatmap: string | null; stress_scree: string | null; interpretation: Interpretation; mds_type?: string; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const isGoodFit = results.normalized_stress <= 0.1;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Stress</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${results.normalized_stress <= 0.05 ? 'text-green-600' : results.normalized_stress <= 0.1 ? 'text-blue-600' : 'text-amber-600'}`}>{results.normalized_stress?.toFixed(4)}</p><p className="text-xs text-muted-foreground">{results.stress_quality}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">R²</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.fit_statistics.r_squared?.toFixed(3)}</p><p className="text-xs text-muted-foreground">Variance explained</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Objects</p><ScatterChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_objects}</p><p className="text-xs text-muted-foreground">in {results.n_dimensions}D space</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Correlation</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.fit_statistics.correlation?.toFixed(3)}</p><p className="text-xs text-muted-foreground">Shepard diagram</p></div></CardContent></Card>
        </div>
    );
};

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
        link.download = 'mds_analysis.py';
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
                        Python Code - Multidimensional Scaling
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
                        MDS Statistical Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical measures used in Multidimensional Scaling analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(mdsTermDefinitions).map(([term, definition]) => (
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
const MDSGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Multidimensional Scaling Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is MDS */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Maximize2 className="w-4 h-4" />
                What is Multidimensional Scaling?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                MDS is a <strong>visualization technique</strong> that creates a spatial map where 
                distances between points reflect the similarity (or dissimilarity) between objects. 
                Similar objects appear close together; dissimilar objects appear far apart.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Core Idea:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    High-dimensional distances → 2D/3D map → Visual understanding
                    <br/><br/>
                    MDS preserves the <em>relative</em> distances between objects, not their 
                    absolute positions. The resulting map can be rotated or flipped without 
                    changing its meaning.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Metric vs Non-Metric */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Compass className="w-4 h-4" />
                Metric vs Non-Metric MDS
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Metric MDS (Classical)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Preserves <strong>exact distances</strong></li>
                    <li>• Assumes interval/ratio scale data</li>
                    <li>• Linear relationship: d' = a + b×d</li>
                    <li>• Use when distances are precise</li>
                    <li>• More sensitive to outliers</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-1">Non-Metric MDS (Ordinal)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Preserves <strong>rank order</strong> only</li>
                    <li>• Works with ordinal data</li>
                    <li>• Monotonic relationship</li>
                    <li>• Use when only ordering is reliable</li>
                    <li>• More robust to noise</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>When to use which:</strong> Metric MDS for actual measurements (physical distance, 
                  time). Non-metric MDS for perceptual data (similarity ratings, preferences).
                </p>
              </div>
            </div>

            <Separator />

            {/* Distance Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Distance Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Euclidean (L2)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Straight-line distance. Most common choice.
                    <br/>• Good for: Continuous data on similar scales
                    <br/>• Formula: √Σ(xᵢ - yᵢ)²
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Manhattan (L1 / City-block)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sum of absolute differences. Like walking on a grid.
                    <br/>• Good for: Discrete attributes, sparse data
                    <br/>• Formula: Σ|xᵢ - yᵢ|
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cosine</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on angle between vectors, ignores magnitude.
                    <br/>• Good for: Text data, when direction matters more than size
                    <br/>• Range: 0 (identical) to 1 (opposite)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Correlation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    1 minus Pearson correlation. Measures pattern similarity.
                    <br/>• Good for: Comparing profiles/shapes regardless of scale
                    <br/>• Range: 0 (identical pattern) to 2 (opposite pattern)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Stress */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Understanding Stress
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Stress</strong> measures how well the MDS distances match the original 
                  distances. Lower stress = better fit. Think of it as the "error" in the map.
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-background text-center border border-green-200">
                    <p className="font-medium text-green-600">≤ 0.05</p>
                    <p className="text-muted-foreground">Excellent</p>
                  </div>
                  <div className="p-2 rounded bg-background text-center border border-blue-200">
                    <p className="font-medium text-blue-600">0.05-0.10</p>
                    <p className="text-muted-foreground">Good</p>
                  </div>
                  <div className="p-2 rounded bg-background text-center border border-amber-200">
                    <p className="font-medium text-amber-600">0.10-0.20</p>
                    <p className="text-muted-foreground">Fair</p>
                  </div>
                  <div className="p-2 rounded bg-background text-center border border-rose-200">
                    <p className="font-medium text-rose-600">&gt; 0.20</p>
                    <p className="text-muted-foreground">Poor</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  These are Kruskal's (1964) guidelines. Note that stress depends on the number 
                  of objects and dimensions — more objects or fewer dimensions typically mean higher stress.
                </p>
              </div>
            </div>

            <Separator />

            {/* Shepard Diagram */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <ScatterChart className="w-4 h-4" />
                Shepard Diagram
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">
                  A scatter plot of <strong>original distances</strong> (x-axis) vs 
                  <strong> MDS distances</strong> (y-axis). Used to diagnose fit quality.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-background">
                    <strong>Points on diagonal:</strong> Perfect preservation of that distance
                  </div>
                  <div className="p-2 rounded bg-background">
                    <strong>Points above diagonal:</strong> MDS overestimates distance (objects appear too far)
                  </div>
                  <div className="p-2 rounded bg-background">
                    <strong>Points below diagonal:</strong> MDS underestimates distance (objects appear too close)
                  </div>
                  <div className="p-2 rounded bg-background">
                    <strong>Scatter:</strong> High scatter indicates poor fit
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The correlation (r) between original and MDS distances indicates overall fit. 
                  R² tells you the proportion of distance variance preserved.
                </p>
              </div>
            </div>

            <Separator />

            {/* Dimensions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Maximize2 className="w-4 h-4" />
                How Many Dimensions?
              </h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                    <p className="font-medium text-sm text-primary mb-1">2D (Recommended)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Easy to visualize and interpret</li>
                      <li>• Sufficient for most applications</li>
                      <li>• Can be printed and shared</li>
                      <li>• Higher stress than 3D</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm mb-1">3D</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Lower stress (better fit)</li>
                      <li>• Harder to visualize/present</li>
                      <li>• Use when 2D stress is too high</li>
                      <li>• May capture more structure</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    <strong>Rule of thumb:</strong> Start with 2D. If stress &gt; 0.15, try 3D. 
                    Use scree plot to find the "elbow" where adding dimensions gives diminishing returns.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting the Map */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Interpreting the MDS Map
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">What to Look For</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Clusters:</strong> Groups of similar objects</li>
                    <li>• <strong>Outliers:</strong> Objects far from others (unique)</li>
                    <li>• <strong>Gradients:</strong> Smooth transitions along dimensions</li>
                    <li>• <strong>Gaps:</strong> Distinct separations between groups</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Important Notes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Axes have no inherent meaning</strong> — interpret post-hoc</li>
                    <li>• <strong>Rotation/reflection OK</strong> — only relative positions matter</li>
                    <li>• <strong>Scale is arbitrary</strong> — focus on relative distances</li>
                    <li>• <strong>Crowded areas</strong> may hide structure — zoom in</li>
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
                    <li>• Start with 2D, increase if needed</li>
                    <li>• Check stress and Shepard diagram</li>
                    <li>• Choose distance metric based on data</li>
                    <li>• Standardize variables if on different scales</li>
                    <li>• Label points for interpretation</li>
                    <li>• Try multiple random starts</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don&apos;t</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Over-interpret axis positions</li>
                    <li>• Use with too few objects (&lt;4)</li>
                    <li>• Ignore high stress values</li>
                    <li>• Assume clusters are "real"</li>
                    <li>• Compare maps from different analyses directly</li>
                    <li>• Forget to check for local minima</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Applications</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Perceptual mapping (brands, products)</li>
                    <li>• Similarity/preference visualization</li>
                    <li>• Ecological community structure</li>
                    <li>• Genetic distance visualization</li>
                    <li>• Sensory analysis (taste, smell)</li>
                    <li>• Text/document similarity</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Number of objects and variables</li>
                    <li>• Distance metric used</li>
                    <li>• Metric vs non-metric MDS</li>
                    <li>• Number of dimensions</li>
                    <li>• Stress value and quality</li>
                    <li>• MDS plot and Shepard diagram</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> MDS shows <strong>relative 
                similarity</strong>, not absolute positions. The map is a useful visualization 
                tool, but distances in the map are approximations of the original similarities. 
                Always check stress and the Shepard diagram to assess how much distortion was 
                introduced. Low stress (&lt;0.10) means you can trust the map's representation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const mdsExample = exampleDatasets.find(d => d.id === 'well-being-survey' || d.id === 'clustering');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Maximize2 className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Multidimensional Scaling (MDS)</CardTitle>
                    <CardDescription className="text-base mt-2">Visualize similarity/dissimilarity in low-dimensional space</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><ScatterChart className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Dimension Reduction</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Map high-dimensional data to 2D or 3D</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Compass className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Distance Preservation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Preserve pairwise distances between objects</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Perceptual Mapping</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Visualize brand positions, preferences</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use MDS</h3>
                        <p className="text-sm text-muted-foreground mb-4">MDS is ideal for visualizing relationships and similarities between objects when you have many variables.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Variables:</strong> 2+ numeric</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Objects:</strong> 4+ cases</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Labels:</strong> Optional column</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Coordinates:</strong> 2D/3D positions</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Stress:</strong> Fit quality measure</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Shepard:</strong> Diagnostic plot</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {mdsExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(mdsExample)} size="lg"><Maximize2 className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface MDSAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function MDSAnalysisPage({ data, allHeaders, onLoadExample }: MDSAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [labelCol, setLabelCol] = useState<string | undefined>();
    const [nDimensions, setNDimensions] = useState(2);
    const [metricMDS, setMetricMDS] = useState(true);
    const [distanceMetric, setDistanceMetric] = useState('euclidean');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length >= 4 && allHeaders.length >= 2, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const dataValidation = useMemo(() => [
        { label: 'Variables selected (≥2)', passed: selectedVars.length >= 2, detail: selectedVars.length >= 2 ? `${selectedVars.length} variables selected` : `Select at least 2 variables (${selectedVars.length} selected)` },
        { label: 'Sufficient objects (≥4)', passed: data.length >= 4, detail: data.length >= 10 ? `${data.length} objects (good)` : data.length >= 4 ? `${data.length} objects (minimum)` : `${data.length} objects (need 4+)` },
        { label: 'Valid dimensions (2D or 3D)', passed: nDimensions === 2 || nDimensions === 3, detail: `${nDimensions}D MDS` },
    ], [selectedVars, data.length, nDimensions]);

    const allValidationsPassed = dataValidation.slice(0, 2).every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        if (numericHeaders.length >= 2) setSelectedVars(numericHeaders.slice(0, Math.min(5, numericHeaders.length)));
        setLabelCol(allHeaders.find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('label') || h.toLowerCase().includes('id')));
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `MDS_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `MDS ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\n\nFIT STATISTICS\n`;
        csv += `Stress,${analysisResult.normalized_stress?.toFixed(4)}\nQuality,${analysisResult.stress_quality}\nR²,${analysisResult.fit_statistics.r_squared?.toFixed(3)}\n\n`;
        csv += `COORDINATES\n` + Papa.unparse(analysisResult.coordinates);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `MDS_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length < 2) { toast({ variant: 'destructive', title: 'Error', description: 'Select at least 2 variables.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/mds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, variables: selectedVars, label_col: labelCol, n_dimensions: nDimensions, metric: metricMDS, distance_metric: distanceMetric }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `Stress = ${result.normalized_stress?.toFixed(4)} (${result.stress_quality})` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedVars, labelCol, nDimensions, metricMDS, distanceMetric, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

    const ProgressBar = () => (
        <div className="mb-8"><div className="flex items-center justify-between w-full gap-2">
            {STEPS.map((step) => {
                const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                const isCurrent = currentStep === step.id;
                const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                return (
                    <button key={step.id} onClick={() => isAccessible && goToStep(step.id)} disabled={!isAccessible} className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                            {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                        </div>
                        <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                    </button>
                );
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <MDSGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Multidimensional Scaling</h1>
                    <p className="text-muted-foreground mt-1">Perceptual mapping & similarity analysis</p>
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
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose variables for distance calculation</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Numeric Variables (for distances)</Label>
                                <ScrollArea className="h-48 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {numericHeaders.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`var-${h}`} checked={selectedVars.includes(h)} onCheckedChange={(c) => setSelectedVars(prev => c ? [...prev, h] : prev.filter(x => x !== h))} /><label htmlFor={`var-${h}`} className="text-sm font-medium cursor-pointer">{h}</label></div>))}
                                    </div>
                                </ScrollArea>
                            </div>
                            <div className="space-y-3"><Label>Label Column (optional)</Label><Select value={labelCol || '_none_'} onValueChange={v => setLabelCol(v === '_none_' ? undefined : v)}><SelectTrigger className="h-11"><SelectValue placeholder="Select label column..." /></SelectTrigger><SelectContent><SelectItem value="_none_">None (use index)</SelectItem>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Selected: <strong>{selectedVars.length}</strong> variables | Objects: <strong>{data.length}</strong></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>MDS Settings</CardTitle><CardDescription>Configure analysis parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label>Dimensions</Label><Select value={nDimensions.toString()} onValueChange={v => setNDimensions(parseInt(v))}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2">2D (recommended)</SelectItem><SelectItem value="3">3D</SelectItem></SelectContent></Select></div>
                                <div className="space-y-3"><Label>Distance Metric</Label><Select value={distanceMetric} onValueChange={setDistanceMetric}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="euclidean">Euclidean</SelectItem><SelectItem value="manhattan">Manhattan</SelectItem><SelectItem value="cosine">Cosine</SelectItem><SelectItem value="correlation">Correlation</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"><div><Label>Metric MDS</Label><p className="text-xs text-muted-foreground mt-1">Preserve exact distances (vs rank order)</p></div><Switch checked={metricMDS} onCheckedChange={setMetricMDS} /></div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Euclidean: straight-line distance. Manhattan: city-block. Cosine: angle-based. Correlation: pattern similarity.</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}<div><p className={`font-medium text-sm ${check.passed ? '' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></div>))}
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Variables:</span> {selectedVars.length}</div><div><span className="text-muted-foreground">Objects:</span> {data.length}</div><div><span className="text-muted-foreground">Dimensions:</span> {nDimensions}D</div><div><span className="text-muted-foreground">Distance:</span> {distanceMetric}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Maximize2 className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">MDS will map {data.length} objects into {nDimensions}D space while preserving pairwise distances.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run MDS<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const isGoodFit = results.normalized_stress <= 0.1;
                    const isExcellentFit = results.normalized_stress <= 0.05;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{results.n_dimensions}D MDS of {results.n_objects} objects</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGoodFit ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Stress: <strong>{results.normalized_stress?.toFixed(4)}</strong> — {results.stress_quality} fit quality.</p>
                                        <p className="text-sm">• R²: <strong>{results.fit_statistics.r_squared?.toFixed(3)}</strong> — {((results.fit_statistics.r_squared || 0) * 100).toFixed(1)}% of distance variance preserved.</p>
                                        <p className="text-sm">• Shepard correlation: <strong>{results.fit_statistics.correlation?.toFixed(3)}</strong> — {results.fit_statistics.correlation >= 0.9 ? 'excellent' : results.fit_statistics.correlation >= 0.8 ? 'good' : 'moderate'} distance preservation.</p>
                                        <p className="text-sm">• Configuration: <strong>{results.n_objects}</strong> objects mapped to {results.n_dimensions}D using {results.distance_metric} distance.</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGoodFit ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGoodFit ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isExcellentFit ? "Excellent Fit!" : isGoodFit ? "Good Fit!" : "Moderate Fit"}</p><p className="text-sm text-muted-foreground mt-1">{isGoodFit ? 'The MDS configuration accurately represents the original distance structure.' : 'Consider adding dimensions or reviewing data quality for better representation.'}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Kruskal's stress: {results.normalized_stress?.toFixed(4)} ({results.stress_quality})</p><p>• Variance explained: {((results.fit_statistics.r_squared || 0) * 100).toFixed(1)}%</p><p>• Distance metric: {results.distance_metric}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (isExcellentFit ? 5 : isGoodFit ? 4 : results.normalized_stress <= 0.2 ? 3 : 2) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className={isExcellentFit ? 'border-green-200' : ''}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Stress</p><p className={`text-xl font-bold ${isExcellentFit ? 'text-green-600' : isGoodFit ? 'text-blue-600' : 'text-amber-600'}`}>{results.normalized_stress?.toFixed(4)}</p><p className="text-xs text-muted-foreground">{results.stress_quality}</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">R²</p><p className="text-xl font-bold">{results.fit_statistics.r_squared?.toFixed(3)}</p><p className="text-xs text-muted-foreground">Variance explained</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Objects</p><p className="text-xl font-bold">{results.n_objects}</p><p className="text-xs text-muted-foreground">in {results.n_dimensions}D space</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Variables</p><p className="text-xl font-bold">{results.n_variables}</p><p className="text-xs text-muted-foreground">{results.distance_metric}</p></CardContent></Card>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const isGoodFit = results.normalized_stress <= 0.1;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding MDS results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">What is MDS?</h4><p className="text-sm text-muted-foreground">Multidimensional Scaling creates a spatial representation where distances between points reflect similarity. Objects close together are similar; far apart are dissimilar. It reduces high-dimensional data to 2D or 3D for visualization.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Stress Measure</h4><p className="text-sm text-muted-foreground">Stress measures how well the MDS distances match the original distances. Your stress of {results.normalized_stress?.toFixed(4)} is {results.stress_quality}. Guidelines: &lt;0.05 excellent, 0.05-0.1 good, 0.1-0.2 fair, &gt;0.2 poor.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Shepard Diagram</h4><p className="text-sm text-muted-foreground">The Shepard plot shows original vs MDS distances. Points along the diagonal indicate perfect preservation. Your R² = {results.fit_statistics.r_squared?.toFixed(3)} means {((results.fit_statistics.r_squared || 0) * 100).toFixed(0)}% of distance variance is preserved in the configuration.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Interpreting the Map</h4><p className="text-sm text-muted-foreground">In the MDS map, proximity = similarity. Look for clusters of similar objects and outliers. The axes don&apos;t have inherent meaning—only relative positions matter. Rotate or flip the map if it helps interpretation.</p></div></div></div>
                                <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl p-5 border border-sky-300"><h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-sky-600" />Stress Interpretation Guide</h4><div className="grid grid-cols-4 gap-2 text-xs mt-3"><div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">≤ 0.05</p><p className="text-muted-foreground">Excellent</p></div><div className="text-center p-2 bg-background rounded-lg border-blue-200 border"><p className="font-medium text-blue-600">0.05-0.1</p><p className="text-muted-foreground">Good</p></div><div className="text-center p-2 bg-background rounded-lg border-amber-200 border"><p className="font-medium text-amber-600">0.1-0.2</p><p className="text-muted-foreground">Fair</p></div><div className="text-center p-2 bg-background rounded-lg border-red-200 border"><p className="font-medium text-red-600">&gt; 0.2</p><p className="text-muted-foreground">Poor</p></div></div></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (() => {
                    const isGoodFit = results.normalized_stress <= 0.1;
                    const handleDownloadWord = () => {
                        const content = `MDS Analysis Report\nGenerated: ${new Date().toLocaleString()}\n\nMODEL\nObjects: ${results.n_objects}\nDimensions: ${results.n_dimensions}\nDistance Metric: ${results.distance_metric}\n\nFIT STATISTICS\nStress: ${results.normalized_stress?.toFixed(4)}\nQuality: ${results.stress_quality}\nR²: ${results.fit_statistics.r_squared?.toFixed(3)}\nCorrelation: ${results.fit_statistics.correlation?.toFixed(3)}\n\nCOORDINATES\n${results.coordinates.map(c => `${c.label}: (${c.dim1.toFixed(3)}, ${c.dim2.toFixed(3)}${results.n_dimensions === 3 ? `, ${c.dim3?.toFixed(3)}` : ''})`).join('\n')}`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'mds_report.doc'; a.click();
                        URL.revokeObjectURL(url);
                    };
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadWord}><FileText className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">MDS Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.n_objects} objects | {results.n_dimensions}D | {results.distance_metric} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            {/* Detailed Analysis - APA Format */}
                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-semibold">Statistical Summary</h3>
                                        </div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                Multidimensional scaling (MDS) was conducted to visualize the similarity structure among <em>N</em> = {results.n_objects} objects based on {results.n_variables} variables. 
                                                A {results.n_dimensions}-dimensional solution was extracted using {results.distance_metric} distance metric and {results.metric_mds ? 'metric' : 'non-metric'} MDS.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Model fit was evaluated using Kruskal&apos;s stress formula. The normalized stress value was <span className="font-mono">{results.normalized_stress?.toFixed(4)}</span>, 
                                                which is considered {results.stress_quality?.toLowerCase()} according to Kruskal&apos;s (1964) guidelines (stress &lt; .05 = excellent, .05-.10 = good, .10-.20 = fair, &gt; .20 = poor). 
                                                The Shepard diagram correlation between original dissimilarities and MDS distances was <em>r</em> = <span className="font-mono">{results.fit_statistics.correlation?.toFixed(3)}</span>.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The {results.n_dimensions}-dimensional configuration accounted for <span className="font-mono">{((results.fit_statistics.r_squared || 0) * 100).toFixed(1)}%</span> of the variance in the original distance matrix 
                                                (<em>R</em>² = <span className="font-mono">{results.fit_statistics.r_squared?.toFixed(3)}</span>). 
                                                {results.n_dimensions === 2 ? ' The two-dimensional solution facilitates visualization while preserving the major structure of the data.' : ' The three-dimensional solution captures additional complexity in the similarity relationships.'}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Visual inspection of the MDS configuration reveals {results.coordinates.length > 10 ? 'distinct clusters of objects' : 'the spatial arrangement of objects'} in the reduced space. 
                                                Objects positioned closer together in the map are more similar based on the input variables, while distant objects are more dissimilar. 
                                                {isGoodFit ? ' The low stress value suggests that the spatial representation accurately reflects the original similarity structure.' : ' The moderate-to-high stress value indicates some distortion in the representation; interpretation should be made cautiously.'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="mds" className="w-full"><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="mds">MDS Map</TabsTrigger><TabsTrigger value="shepard">Shepard</TabsTrigger><TabsTrigger value="heatmap">Distances</TabsTrigger><TabsTrigger value="scree">Scree</TabsTrigger></TabsList><TabsContent value="mds" className="mt-4">{results.mds_plot ? <Image src={`data:image/png;base64,${results.mds_plot}`} alt="MDS Plot" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No plot</p>}</TabsContent><TabsContent value="shepard" className="mt-4">{results.shepard_plot ? <Image src={`data:image/png;base64,${results.shepard_plot}`} alt="Shepard Diagram" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No plot</p>}</TabsContent><TabsContent value="heatmap" className="mt-4">{results.distance_heatmap ? <Image src={`data:image/png;base64,${results.distance_heatmap}`} alt="Distance Heatmap" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No plot</p>}</TabsContent><TabsContent value="scree" className="mt-4">{results.stress_scree ? <Image src={`data:image/png;base64,${results.stress_scree}`} alt="Stress Scree Plot" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No plot</p>}</TabsContent></Tabs></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Fit Statistics</CardTitle><CardDescription>Model quality measures</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">{[{label: 'Stress', value: results.normalized_stress?.toFixed(4)}, {label: 'Quality', value: results.stress_quality}, {label: 'R²', value: results.fit_statistics.r_squared?.toFixed(3)}, {label: 'Correlation', value: results.fit_statistics.correlation?.toFixed(3)}].map((item, i) => (<div key={i} className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-lg font-semibold">{item.value}</p></div>))}</div></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>MDS Coordinates</CardTitle><CardDescription>Object positions in reduced space</CardDescription></CardHeader><CardContent><ScrollArea className="h-[300px]"><Table><TableHeader><TableRow><TableHead>Label</TableHead><TableHead className="text-right">Dim 1</TableHead><TableHead className="text-right">Dim 2</TableHead>{results.n_dimensions === 3 && <TableHead className="text-right">Dim 3</TableHead>}</TableRow></TableHeader><TableBody>{results.coordinates.map((coord, i) => (<TableRow key={i}><TableCell className="font-medium">{coord.label}</TableCell><TableCell className="text-right font-mono">{coord.dim1.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{coord.dim2.toFixed(3)}</TableCell>{results.n_dimensions === 3 && <TableCell className="text-right font-mono">{coord.dim3?.toFixed(3)}</TableCell>}</TableRow>))}</TableBody></Table></ScrollArea></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running MDS analysis...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
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
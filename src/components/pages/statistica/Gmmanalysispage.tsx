'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Blend, HelpCircle, Settings, FileSearch, BookOpen, GitBranch, Sparkles, Layers, Download, Hash, Users, TrendingUp, Target, CheckCircle, CheckCircle2, AlertTriangle, Lightbulb, ChevronRight, ChevronLeft, ArrowRight, Check, FileSpreadsheet, ImageIcon, FileText, FileType, FileCode, ChevronDown, Database, Settings2, Shield, Info, Activity, Code, Copy, Circle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

 
const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/gmm_clustering.py?alt=media";

// Statistical terms glossary for Gaussian Mixture Model
const gmmTermDefinitions: Record<string, string> = {
    "Gaussian Mixture Model (GMM)": "A probabilistic model that assumes data comes from a mixture of multiple Gaussian (normal) distributions. Each component represents a cluster with its own mean, covariance, and weight.",
    "Component": "A single Gaussian distribution within the mixture. Each component has parameters (mean, covariance) and a mixing weight representing its proportion in the overall mixture.",
    "Mean (μ)": "The center point of a Gaussian component, representing the average value of data points belonging to that component. Similar to centroids in K-Means but part of a probabilistic model.",
    "Covariance Matrix": "Describes the shape and orientation of each Gaussian component. Full covariance allows elliptical clusters of any orientation, while diagonal restricts to axis-aligned ellipses.",
    "Mixing Weight (π)": "The prior probability of each component, representing the proportion of data expected from each Gaussian. All weights sum to 1.",
    "Soft Assignment": "Unlike K-Means' hard assignment, GMM assigns each point a probability of belonging to each component. A point can partially belong to multiple clusters.",
    "Membership Probability": "The posterior probability that a data point belongs to a specific component, calculated using Bayes' theorem. Higher values indicate stronger cluster membership.",
    "Expectation-Maximization (EM)": "The algorithm used to fit GMM. E-step computes membership probabilities; M-step updates component parameters. Iterates until convergence.",
    "BIC (Bayesian Information Criterion)": "A model selection metric that balances fit and complexity. Lower BIC indicates better model. Penalizes models with more parameters to prevent overfitting.",
    "AIC (Akaike Information Criterion)": "Similar to BIC but with a different complexity penalty. Lower AIC indicates better model. Generally less conservative than BIC.",
    "Log-Likelihood": "Measures how well the model fits the data. Higher values indicate better fit. Used to compute BIC and AIC.",
    "Covariance Type - Full": "Each component has its own unrestricted covariance matrix. Most flexible, captures elliptical clusters of any orientation. Requires most parameters.",
    "Covariance Type - Tied": "All components share the same covariance matrix. Useful when clusters have similar shapes but different locations.",
    "Covariance Type - Diagonal": "Covariance matrices are diagonal (axis-aligned ellipses). Faster to compute, useful when features are independent within clusters.",
    "Covariance Type - Spherical": "Covariance is a single variance value times identity. All clusters are spherical. Fastest but most restrictive.",
    "Convergence": "When the log-likelihood stops improving significantly between iterations. GMM may converge to local optima, so multiple initializations help.",
    "Silhouette Score": "Measures cluster quality regardless of the algorithm used. Works for GMM by using hard assignments. Ranges from -1 to 1; higher is better.",
    "Calinski-Harabasz Index": "Ratio of between-cluster dispersion to within-cluster dispersion. Higher values indicate better-defined clusters.",
    "Davies-Bouldin Index": "Measures average similarity between clusters. Lower values indicate better separation between clusters.",
    "Standardization": "Scaling features to zero mean and unit variance. Important for GMM as it's sensitive to feature scales.",
    "Initialization": "GMM uses k-means++ style initialization by default. Multiple initializations (n_init) help avoid poor local optima.",
    "Outliers": "GMM handles outliers better than K-Means as they receive low membership probabilities for all components rather than forcing assignment.",
    "Cluster Shape": "GMM can model elliptical clusters of varying shapes and orientations, unlike K-Means which assumes spherical clusters.",
    "Number of Components": "The k parameter specifying how many Gaussian distributions to fit. Selected using BIC, AIC, or domain knowledge."
};

interface GMMResults {
    optimal_k?: { 
        k_range: number[]; 
        bic_scores: number[]; 
        aic_scores: number[]; 
        silhouette_scores: number[]; 
        recommended_k?: number; 
    };
    clustering_summary: { 
        n_components: number; 
        covariance_type: string;
        means: number[][]; 
        weights: number[];
        labels: number[]; 
        converged: boolean;
        n_iter: number;
    };
    profiles: { 
        [key: string]: { 
            size: number; 
            percentage: number; 
            mean: { [key: string]: number }; 
            weight: number;
            avg_probability: number;
        } 
    };
    final_metrics?: { 
        silhouette: number; 
        davies_bouldin: number; 
        calinski_harabasz: number; 
        bic: number;
        aic: number;
        log_likelihood: number;
    };
    interpretations: { 
        overall_quality: string; 
        cluster_profiles: string[]; 
        cluster_distribution: string; 
    };
    clustered_data?: DataSet;
}

interface FullGMMResponse { results: GMMResults; plot: string; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
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
        link.download = 'gmm_clustering.py';
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
                        Python Code - Gaussian Mixture Model
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
                        Gaussian Mixture Model Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in GMM cluster analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(gmmTermDefinitions).map(([term, definition]) => (
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

const StatisticalSummaryCards = ({ results }: { results: GMMResults }) => {
    const sil = results.final_metrics?.silhouette || 0;
    const bic = results.final_metrics?.bic || 0;
    const aic = results.final_metrics?.aic || 0;
    const getQuality = (s: number) => s >= 0.7 ? 'Excellent' : s >= 0.5 ? 'Good' : s >= 0.25 ? 'Fair' : 'Poor';
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Components (k)</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.clustering_summary.n_components}</p><p className="text-xs text-muted-foreground">Gaussian mixtures</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Silhouette</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{sil.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getQuality(sil)} separation</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">BIC</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{bic.toFixed(0)}</p><p className="text-xs text-muted-foreground">Lower is better</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">AIC</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{aic.toFixed(0)}</p><p className="text-xs text-muted-foreground">Lower is better</p></div></CardContent></Card>
        </div>
    );
};

const GMMGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Gaussian Mixture Model Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is GMM */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Blend className="w-4 h-4" />
                What is Gaussian Mixture Model?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                GMM is a <strong>probabilistic clustering model</strong> that assumes data comes from 
                a mixture of multiple Gaussian (normal) distributions. Each component has its own 
                mean, covariance, and mixing weight.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Advantages over K-Means:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Soft assignments: points have probability of belonging to each cluster<br/>
                    • Flexible shapes: elliptical clusters of any orientation<br/>
                    • Model selection: BIC/AIC for choosing optimal k<br/>
                    • Uncertainty quantification: know how confident assignments are<br/>
                    • Handles overlapping clusters naturally
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* How GMM Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                How GMM Works
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Expectation-Maximization (EM) Algorithm</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    GMM uses EM to iteratively fit the mixture model:
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p><strong>E-step:</strong> Calculate probability each point belongs to each component</p>
                    <p><strong>M-step:</strong> Update component means, covariances, and weights</p>
                    <p><strong>Repeat:</strong> Until convergence (log-likelihood stops improving)</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Component Parameters</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Mean (μ):</strong> Center of each Gaussian</li>
                    <li>• <strong>Covariance (Σ):</strong> Shape and orientation of each ellipse</li>
                    <li>• <strong>Weight (π):</strong> Proportion of data from each component</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Covariance Types */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Covariance Types
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Full</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each component has its own unrestricted covariance matrix.
                    <br/><strong>Clusters:</strong> Ellipses of any shape and orientation
                    <br/><strong>Most flexible</strong>, but most parameters
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Tied</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All components share the same covariance matrix.
                    <br/><strong>Clusters:</strong> Same shape, different locations
                    <br/>Good when clusters have similar spread
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Diagonal</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Covariance matrices are diagonal (axis-aligned).
                    <br/><strong>Clusters:</strong> Axis-aligned ellipses
                    <br/>Faster, assumes feature independence
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Spherical</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Single variance value per component.
                    <br/><strong>Clusters:</strong> Spheres (like K-Means)
                    <br/>Most restrictive, fastest
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Recommendation:</strong> Start with &quot;full&quot; for flexibility. Use simpler types 
                if you have limited data or want faster computation.
              </p>
            </div>

            <Separator />

            {/* Model Selection */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Model Selection: BIC vs AIC
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">BIC (Bayesian Information Criterion)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balances fit vs complexity with stronger penalty for parameters.
                    <br/><strong>Lower is better.</strong> More conservative — tends to prefer simpler models.
                    <br/>Use when you want to avoid overfitting.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">AIC (Akaike Information Criterion)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balances fit vs complexity with lighter penalty.
                    <br/><strong>Lower is better.</strong> Less conservative — may suggest more components.
                    <br/>Use when prediction accuracy matters more.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Choosing k</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Plot BIC/AIC vs k, look for the &quot;elbow&quot; or minimum</li>
                    <li>• BIC often recommends fewer components than AIC</li>
                    <li>• Also consider silhouette score for cluster quality</li>
                    <li>• Domain knowledge should guide final decision</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Soft Clustering */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Soft Clustering &amp; Membership Probabilities
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  Unlike K-Means (hard assignment), GMM assigns each point a <strong>probability 
                  of belonging to each component</strong>. A point might be 70% Component 1 and 30% Component 2.
                </p>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div className="p-1 rounded bg-green-100 dark:bg-green-900/30 text-center">
                    <p className="font-medium text-green-700 dark:text-green-400">≥0.90</p>
                    <p className="text-muted-foreground">Core member</p>
                  </div>
                  <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-center">
                    <p className="font-medium text-blue-700 dark:text-blue-400">0.70-0.89</p>
                    <p className="text-muted-foreground">Strong fit</p>
                  </div>
                  <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 text-center">
                    <p className="font-medium text-amber-700 dark:text-amber-400">0.50-0.69</p>
                    <p className="text-muted-foreground">Mixed</p>
                  </div>
                  <div className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-center">
                    <p className="font-medium text-red-700 dark:text-red-400">&lt;0.50</p>
                    <p className="text-muted-foreground">Overlapping</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Tip:</strong> Low max probability indicates points in overlapping regions — 
                  these may be transitional cases or edge cases worth examining.
                </p>
              </div>
            </div>

            <Separator />

            {/* GMM vs K-Means */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                GMM vs K-Means
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-2">GMM</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Soft assignments (probabilities)</li>
                    <li>✓ Elliptical clusters of any shape</li>
                    <li>✓ Model selection via BIC/AIC</li>
                    <li>✓ Handles overlapping clusters</li>
                    <li>✓ Probabilistic framework</li>
                    <li>✗ Slower than K-Means</li>
                    <li>✗ More parameters to estimate</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">K-Means</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Fast and scalable</li>
                    <li>✓ Simple to understand</li>
                    <li>✓ Works well for spherical clusters</li>
                    <li>✗ Hard assignments only</li>
                    <li>✗ Assumes spherical clusters</li>
                    <li>✗ No built-in model selection</li>
                    <li>✗ Sensitive to outliers</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-muted/30 border text-xs text-muted-foreground">
                <strong>Choose GMM when:</strong> You need probability-based assignments, 
                expect elliptical/overlapping clusters, or want uncertainty quantification.
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
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Standardize features</strong> (GMM is scale-sensitive)</li>
                    <li>• Handle missing values first</li>
                    <li>• Consider dimensionality reduction for 10+ features</li>
                    <li>• Check for extreme outliers</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Choosing Parameters</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with k = 2-5, compare BIC/AIC</li>
                    <li>• Use &quot;full&quot; covariance for flexibility</li>
                    <li>• Try &quot;tied&quot; or &quot;diag&quot; if limited data</li>
                    <li>• Multiple initializations (default: 1)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Examine component means (profiles)</li>
                    <li>• Check mixing weights (proportions)</li>
                    <li>• Review membership probabilities</li>
                    <li>• Identify overlapping points</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report k, covariance type, n</li>
                    <li>• Include BIC, AIC, silhouette</li>
                    <li>• Show component means and weights</li>
                    <li>• Note convergence (iterations)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> GMM provides a probabilistic 
                framework for clustering with soft assignments and flexible cluster shapes. Use 
                BIC/AIC to select the number of components, and leverage membership probabilities 
                for nuanced analysis. Points with low max probability are in overlapping regions 
                and may warrant special attention.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'customer-segments');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Blend className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Gaussian Mixture Model</CardTitle>
                    <CardDescription className="text-base mt-2">Probabilistic clustering with soft assignments and flexible cluster shapes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Circle className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Soft Clustering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Assigns probabilities instead of hard labels</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Sparkles className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Flexible Shapes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Models elliptical clusters of any orientation</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Layers className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Probabilistic</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Full probabilistic framework with BIC/AIC</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use GMM</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use GMM when you need probabilistic cluster assignments, expect elliptical or overlapping clusters, or want uncertainty quantification. Ideal for data that doesn't fit spherical K-Means assumptions.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Variables:</strong> 2+ numeric features</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Components:</strong> Number of Gaussians</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Sample size:</strong> 30+ per component</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>BIC/AIC:</strong> Model selection</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Silhouette:</strong> &gt;0.5 = good</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Probabilities:</strong> Soft assignments</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Users className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface GMMPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function GMMPage({ data, numericHeaders, onLoadExample }: GMMPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [nComponents, setNComponents] = useState<number>(3);
    const [covarianceType, setCovarianceType] = useState<string>('full');
    const [analysisResult, setAnalysisResult] = useState<FullGMMResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => { if (numericHeaders.length > 0) setSelectedItems(numericHeaders); }, [numericHeaders]);
    useEffect(() => { setView(canRun ? 'main' : 'intro'); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1); }, [data, numericHeaders, canRun]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Minimum variables', passed: selectedItems.length >= 2, detail: `${selectedItems.length} variables selected` });
        checks.push({ label: 'Sample size', passed: data.length >= 10, detail: `n = ${data.length}` });
        checks.push({ label: 'Valid k value', passed: nComponents >= 2 && nComponents <= data.length / 2, detail: `k = ${nComponents}` });
        const samplesPerComponent = Math.floor(data.length / nComponents);
        checks.push({ label: 'Samples per component', passed: samplesPerComponent >= 10, detail: `~${samplesPerComponent} per component` });
        return checks;
    }, [data, selectedItems, nComponents]);

    const allValidationsPassed = dataValidation.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    const handleItemSelectionChange = (header: string, checked: boolean) => { setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header)); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a'); link.download = `GMM_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results.clustered_data) { toast({ title: "No Data" }); return; }
        const csv = Papa.unparse(analysisResult.results.clustered_data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `GMM_Clustered_${new Date().toISOString().split('T')[0]}.csv`; link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/gmm-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedItems,
                    nComponents,
                    covarianceType,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `GMM_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedItems, nComponents, covarianceType, data.length, toast]);


    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) { toast({ variant: 'destructive', title: 'Select at least 2 variables.' }); return; }
        if (nComponents < 2) { toast({ variant: 'destructive', title: 'k must be at least 2.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/gmm`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, nComponents: Number(nComponents), covarianceType })
            });
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') errorMsg = errorResult.detail;
                else if (Array.isArray(errorResult.detail)) errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                else if (errorResult.error) errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                throw new Error(errorMsg);
            }
            const result: FullGMMResponse = await response.json();
            if ((result as any).error) throw new Error(typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error));
            const cleanData = data.filter(row => selectedItems.every(item => row[item] !== null && row[item] !== undefined && row[item] !== ''));
            const clusteredData = cleanData.map((row, index) => ({ ...row, 'Component': `Component ${result.results.clustering_summary.labels[index] + 1}` }));
            setAnalysisResult({ ...result, results: { ...result.results, clustered_data: clusteredData } });
            goToStep(4); toast({ title: 'GMM Complete' });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedItems, nComponents, covarianceType, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult?.results;
    const recommendedK = results?.optimal_k?.recommended_k;

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
            <GMMGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Gaussian Mixture Model</h1>
                    <p className="text-muted-foreground mt-1">Probabilistic clustering with soft assignments</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose numeric variables for clustering</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Variables for Clustering</Label>
                                <ScrollArea className="h-48 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.map(header => (<div key={header} className="flex items-center space-x-2"><Checkbox id={`gmm-${header}`} checked={selectedItems.includes(header)} onCheckedChange={(checked) => handleItemSelectionChange(header, !!checked)} /><label htmlFor={`gmm-${header}`} className="text-sm cursor-pointer">{header}</label></div>))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">{selectedItems.length} variables selected</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample size: <strong>{data.length}</strong> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>GMM Settings</CardTitle><CardDescription>Configure the Gaussian Mixture Model</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Number of Components (k){recommendedK && <Badge variant="outline" className="ml-2">Recommended: {recommendedK}</Badge>}</Label>
                                <Input type="number" placeholder="e.g., 3" value={nComponents} onChange={e => setNComponents(parseInt(e.target.value) || 2)} min="2" className="max-w-xs" />
                                <p className="text-xs text-muted-foreground">Start with 3-5 components, adjust based on BIC/AIC</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Covariance Type</Label>
                                <Select value={covarianceType} onValueChange={setCovarianceType}>
                                    <SelectTrigger className="max-w-xs">
                                        <SelectValue placeholder="Select covariance type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full">Full (flexible ellipses)</SelectItem>
                                        <SelectItem value="tied">Tied (shared covariance)</SelectItem>
                                        <SelectItem value="diag">Diagonal (axis-aligned)</SelectItem>
                                        <SelectItem value="spherical">Spherical (circular)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Full allows any ellipse shape; spherical is most restrictive</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration Summary</h4><p className="text-sm text-muted-foreground">{selectedItems.length} variables • k = {nComponents} components • {covarianceType} covariance • {data.length} observations</p></div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>GMM uses Expectation-Maximization with multiple initializations for robust fitting. Variables are auto-standardized.</span></p></div>
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
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Blend className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">GMM will fit {nComponents} Gaussian distributions to model the data probabilistically.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}
                {currentStep === 4 && results && (() => {
                    const sil = results.final_metrics?.silhouette || 0;
                    const isGood = sil >= 0.5;
                    const largest = Object.entries(results.profiles).sort((a, b) => b[1].size - a[1].size)[0];
                    const totalPoints = Object.values(results.profiles).reduce((sum, p) => sum + p.size, 0);
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings from GMM clustering</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Successfully modeled <strong>{totalPoints} data points</strong> with <strong>{results.clustering_summary.n_components} Gaussian components</strong>.</p>
                                        <p className="text-sm">• Largest component: <strong>{largest[0]}</strong> with {largest[1].size} members ({largest[1].percentage.toFixed(1)}%), weight: {largest[1].weight.toFixed(3)}.</p>
                                        <p className="text-sm">• Cluster quality: <strong>{(sil * 100).toFixed(0)}%</strong> — {sil >= 0.7 ? 'Excellent' : sil >= 0.5 ? 'Good' : sil >= 0.25 ? 'Moderate' : 'Weak'} separation.</p>
                                        <p className="text-sm">• Model converged in <strong>{results.clustering_summary.n_iter} iterations</strong> using <strong>{results.clustering_summary.covariance_type}</strong> covariance.</p>
                                        {recommendedK && recommendedK !== nComponents && <p className="text-sm">• 💡 BIC suggests trying <strong>k = {recommendedK}</strong> for comparison.</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Well-Defined Components Found!" : "Moderate Clustering Quality"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The Gaussian components are distinct and well-separated. Soft assignments provide nuanced membership." : "Some overlap between components. Consider adjusting k or covariance type."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Silhouette: {sil.toFixed(3)} — {sil >= 0.5 ? 'points are well-matched to their components' : 'some points may be near component boundaries'}</p><p>• BIC: {results.final_metrics?.bic?.toFixed(0)} — lower indicates better model fit with complexity penalty</p><p>• AIC: {results.final_metrics?.aic?.toFixed(0)} — lower indicates better fit</p><p>• Log-Likelihood: {results.final_metrics?.log_likelihood?.toFixed(2)}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (sil >= 0.7 ? 5 : sil >= 0.5 ? 4 : sil >= 0.35 ? 3 : sil >= 0.25 ? 2 : 1) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}
                {currentStep === 5 && results && (() => {
                    const sil = results.final_metrics?.silhouette || 0;
                    const isGood = sil >= 0.5;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding GMM results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How GMM Works</h4><p className="text-sm text-muted-foreground">GMM assumes data comes from a mixture of {nComponents} Gaussian distributions. The EM algorithm iteratively estimates each component's mean, covariance, and mixing weight until convergence ({results.clustering_summary.n_iter} iterations).</p></div></div></div>
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Soft vs Hard Clustering</h4><p className="text-sm text-muted-foreground">Unlike K-Means, GMM provides membership probabilities. A point might be 70% Component 1 and 30% Component 2. This captures uncertainty and overlapping clusters naturally. Average membership probabilities indicate assignment confidence.</p></div></div></div>
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Model Selection with BIC/AIC</h4><p className="text-sm text-muted-foreground">BIC ({results.final_metrics?.bic?.toFixed(0)}) and AIC ({results.final_metrics?.aic?.toFixed(0)}) balance model fit against complexity. Lower values indicate better models. {recommendedK ? `BIC suggests k=${recommendedK} as optimal.` : ''} Silhouette score ({sil.toFixed(3)}) validates cluster separation.</p></div></div></div>
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">Use these {results.clustering_summary.n_components} components for probabilistic segmentation. The mixing weights ({results.clustering_summary.weights.map(w => (w * 100).toFixed(1) + '%').join(', ')}) show expected population proportions. Soft assignments enable nuanced decision-making.</p></div></div></div>
                              <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Probabilistic Model</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Usable with Caveats</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your data is well-modeled by ${results.clustering_summary.n_components} Gaussian components. Use membership probabilities for nuanced analysis.` : `Found ${results.clustering_summary.n_components} components with some overlap. Try different k values or covariance types.`}</p></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}
                {currentStep === 6 && results && analysisResult && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Clustered)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Gaussian Mixture Model Report</h2><p className="text-sm text-muted-foreground">k = {results.clustering_summary.n_components} | {results.clustering_summary.covariance_type} covariance | {selectedItems.length} variables | {new Date().toLocaleDateString()}</p></div>
                            <StatisticalSummaryCards results={results} />
                            {/* Statistical Summary - APA Format */}
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
                                                A Gaussian Mixture Model analysis was performed to identify probabilistic groupings within the dataset. 
                                                The analysis included <em>N</em> = {data.length} observations across {selectedItems.length} variables 
                                                ({selectedItems.join(', ')}).
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The {results.clustering_summary.n_components}-component solution with {results.clustering_summary.covariance_type} covariance 
                                                yielded a silhouette coefficient of <span className="font-mono">{results.final_metrics?.silhouette?.toFixed(3)}</span>, 
                                                indicating {(results.final_metrics?.silhouette || 0) >= 0.7 ? 'excellent' : (results.final_metrics?.silhouette || 0) >= 0.5 ? 'good' : (results.final_metrics?.silhouette || 0) >= 0.25 ? 'fair' : 'poor'} cluster separation. 
                                                Model fit metrics included BIC = <span className="font-mono">{results.final_metrics?.bic?.toFixed(2)}</span>, 
                                                AIC = <span className="font-mono">{results.final_metrics?.aic?.toFixed(2)}</span>, and 
                                                Log-Likelihood = <span className="font-mono">{results.final_metrics?.log_likelihood?.toFixed(2)}</span>.
                                                The model converged in {results.clustering_summary.n_iter} iterations.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {(() => {
                                                    const sorted = Object.entries(results.profiles).sort((a, b) => b[1].size - a[1].size);
                                                    const largest = sorted[0];
                                                    const smallest = sorted[sorted.length - 1];
                                                    return `Component sizes ranged from ${smallest[1].size} (${smallest[1].percentage.toFixed(1)}%) to ${largest[1].size} (${largest[1].percentage.toFixed(1)}%). The largest component was ${largest[0]} with mixing weight ${largest[1].weight.toFixed(3)}, comprising ${largest[1].percentage.toFixed(1)}% of the sample.`;
                                                })()}
                                                {recommendedK && recommendedK !== nComponents && ` BIC analysis suggested k = ${recommendedK} as an alternative solution for consideration.`}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card><CardHeader><CardTitle>Visual Summary</CardTitle><CardDescription>BIC/AIC plot, Silhouette analysis, and component visualization</CardDescription></CardHeader><CardContent><Image src={analysisResult.plot} alt="GMM Plots" width={1200} height={1000} className="w-full rounded-md border" /></CardContent></Card>
                            <Card><CardHeader><CardTitle>Component Profiles (Means)</CardTitle><CardDescription>Mean values and weights defining each component</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Size (%)</TableHead><TableHead>Weight</TableHead><TableHead>Avg Prob</TableHead>{selectedItems.map(i => <TableHead key={i} className="text-right">{i}</TableHead>)}</TableRow></TableHeader><TableBody>{Object.entries(results.profiles).map(([name, p]) => <TableRow key={name}><TableCell className="font-semibold">{name}</TableCell><TableCell>{p.size} ({p.percentage.toFixed(1)}%)</TableCell><TableCell className="font-mono">{p.weight.toFixed(3)}</TableCell><TableCell className="font-mono">{(p.avg_probability * 100).toFixed(1)}%</TableCell>{selectedItems.map(i => <TableCell key={i} className="text-right font-mono">{p.mean[i]?.toFixed(3) || '—'}</TableCell>)}</TableRow>)}</TableBody></Table></div></CardContent></Card>
                            <Card><CardHeader><CardTitle>Validation Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Silhouette</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.silhouette?.toFixed(4)}</TableCell><TableCell className="text-muted-foreground">{(results.final_metrics?.silhouette || 0) >= 0.5 ? 'Good separation' : 'Some overlap'}</TableCell></TableRow><TableRow><TableCell>BIC</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.bic?.toFixed(2)}</TableCell><TableCell className="text-muted-foreground">Lower = better model</TableCell></TableRow><TableRow><TableCell>AIC</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.aic?.toFixed(2)}</TableCell><TableCell className="text-muted-foreground">Lower = better fit</TableCell></TableRow><TableRow><TableCell>Log-Likelihood</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.log_likelihood?.toFixed(2)}</TableCell><TableCell className="text-muted-foreground">Higher = better fit</TableCell></TableRow><TableRow><TableCell>Calinski-Harabasz</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.calinski_harabasz?.toFixed(2)}</TableCell><TableCell className="text-muted-foreground">Higher = better defined</TableCell></TableRow><TableRow><TableCell>Davies-Bouldin</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.davies_bouldin?.toFixed(4)}</TableCell><TableCell className="text-muted-foreground">{(results.final_metrics?.davies_bouldin || 0) < 1 ? 'Good' : 'Some overlap'}</TableCell></TableRow></TableBody></Table></CardContent></Card>
                            {results.interpretations.cluster_profiles.length > 0 && <Card><CardHeader><CardTitle>Component Interpretations</CardTitle><CardDescription>AI-generated descriptions</CardDescription></CardHeader><CardContent><div className="space-y-3">{results.interpretations.cluster_profiles.map((profile, idx) => <div key={idx} className="p-4 bg-muted/30 rounded-lg"><p className="font-semibold text-sm mb-1">Component {idx + 1}</p><p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: profile }} /></div>)}</div></CardContent></Card>}
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
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


'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, GitBranch, HelpCircle, Database, FileType, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, ChevronDown, Lightbulb, AlertTriangle, ArrowRight, Download, FileSpreadsheet, ImageIcon, Sparkles, Target, Layers, BarChart3, Bot, TreeDeciduous, Users, BookOpen, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/hca_clustering.py?alt=media";

// Statistical terms glossary for Hierarchical Cluster Analysis
const hcaTermDefinitions: Record<string, string> = {
    "Hierarchical Cluster Analysis (HCA)": "A clustering method that builds a hierarchy of clusters by iteratively merging (agglomerative) or splitting (divisive) groups based on similarity. Results in a tree-like structure called a dendrogram.",
    "Agglomerative Clustering": "A bottom-up approach where each observation starts as its own cluster, then pairs of clusters are merged iteratively based on a linkage criterion until all observations belong to one cluster.",
    "Dendrogram": "A tree diagram that shows the hierarchical relationship between clusters. The height of each merge represents the distance/dissimilarity between merged clusters. Cut the tree at different heights to get different numbers of clusters.",
    "Linkage Method": "The criterion used to determine which clusters to merge. Common methods include Ward's, Complete, Average, and Single linkage, each producing different cluster shapes.",
    "Ward's Linkage": "Minimizes the total within-cluster variance. At each step, merges the pair of clusters that leads to the minimum increase in total variance. Tends to create compact, spherical clusters of similar sizes.",
    "Complete Linkage": "Also called farthest neighbor. The distance between two clusters is the maximum distance between any two points in the clusters. Creates compact clusters but sensitive to outliers.",
    "Average Linkage (UPGMA)": "The distance between clusters is the average of all pairwise distances between points in the two clusters. Balances between single and complete linkage.",
    "Single Linkage": "Also called nearest neighbor. The distance between clusters is the minimum distance between any two points. Can create elongated, chain-like clusters (chaining effect).",
    "Distance Metric": "The measure used to calculate dissimilarity between observations. Common metrics include Euclidean (straight-line), Manhattan (city-block), Cosine (angle-based), and Correlation.",
    "Euclidean Distance": "The straight-line distance between two points in multidimensional space. Most common metric, works well when all variables have similar scales.",
    "Manhattan Distance": "Sum of absolute differences across dimensions. Also called city-block or L1 distance. More robust to outliers than Euclidean.",
    "Cosine Distance": "Measures the angle between two vectors, ignoring magnitude. Useful when the direction of data matters more than the absolute values.",
    "Correlation Distance": "Based on Pearson correlation; measures linear relationship patterns. Useful when shape of the profile matters more than magnitude.",
    "Cophenetic Correlation": "Measures how faithfully the dendrogram preserves pairwise distances. Values close to 1 indicate the dendrogram is a good representation of the original distances.",
    "Silhouette Score": "Measures how similar an object is to its own cluster vs other clusters. Ranges from -1 to 1; higher values indicate better-defined clusters. Score > 0.5 is generally good.",
    "Calinski-Harabasz Index": "Ratio of between-cluster dispersion to within-cluster dispersion. Higher values indicate better-defined, well-separated clusters.",
    "Davies-Bouldin Index": "Average similarity between each cluster and its most similar cluster. Lower values indicate better clustering with more distinct clusters.",
    "Cutting the Dendrogram": "The process of choosing a height (distance threshold) to cut the dendrogram, which determines the number of clusters. Can be done automatically or manually.",
    "Cluster Centroid": "The mean (average) of all observations in a cluster. In HCA, centroids are computed after clusters are formed to describe cluster characteristics.",
    "Within-Cluster Variance": "The sum of squared distances from each point to its cluster centroid. Lower values indicate tighter, more homogeneous clusters.",
    "Between-Cluster Variance": "The sum of squared distances between cluster centroids and the overall data centroid. Higher values indicate better separation between clusters.",
    "Optimal K": "The ideal number of clusters. Can be determined using methods like silhouette analysis, elbow method, gap statistic, or domain knowledge.",
    "Standardization": "Scaling variables to have zero mean and unit variance before clustering. Essential when variables have different scales, as distance metrics are scale-sensitive.",
    "Cluster Profile": "A description of a cluster based on its centroid values and distribution. Identifies what makes each cluster unique compared to others.",
    "Agglomeration Schedule": "A table showing the sequence of cluster merges, including which clusters were merged at each step and the distance at which they merged."
};

interface HcaResults {
    n_clusters: number;
    profiles: { [key: string]: { size: number; percentage: number; centroid: { [key: string]: number }; std: { [key: string]: number }; } };
    final_metrics?: { silhouette: number; calinski_harabasz: number; davies_bouldin: number; };
    optimal_k_recommendation?: { [key: string]: number; };
    stability?: { mean: number; std: number; };
    interpretations: { overall_quality: string; cluster_profiles: string[]; cluster_distribution: string; };
}
interface FullHcaResponse { results: HcaResults; plot: string; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [
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
        link.download = 'hca_clustering.py';
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
                        Python Code - Hierarchical Cluster Analysis
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
                        Hierarchical Clustering Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in hierarchical cluster analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(hcaTermDefinitions).map(([term, definition]) => (
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



// HCA Analysis Guide Component
const HCAGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Hierarchical Cluster Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is HCA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                What is Hierarchical Cluster Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                HCA is a clustering method that builds a <strong>hierarchy of clusters</strong> by 
                iteratively merging (agglomerative) or splitting (divisive) groups based on similarity. 
                The result is a <strong>dendrogram</strong> — a tree diagram showing nested grouping structure.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Advantages:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Visual hierarchy via dendrogram<br/>
                    • No need to pre-specify number of clusters<br/>
                    • Can cut tree at any height for different k<br/>
                    • Shows relationships between clusters at multiple scales<br/>
                    • Deterministic (same data → same result)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* How it Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TreeDeciduous className="w-4 h-4" />
                How Agglomerative Clustering Works
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Bottom-Up Approach</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p><strong>1. Start:</strong> Each observation is its own cluster (n clusters)</p>
                    <p><strong>2. Find:</strong> Identify the two most similar clusters</p>
                    <p><strong>3. Merge:</strong> Combine them into one cluster</p>
                    <p><strong>4. Repeat:</strong> Continue until all points are in one cluster</p>
                    <p><strong>5. Cut:</strong> Choose a height to get desired number of clusters</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Dendrogram Reading</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Height:</strong> Distance at which clusters merge (y-axis)</li>
                    <li>• <strong>Horizontal line:</strong> Cut here to get clusters below</li>
                    <li>• <strong>Longer branches:</strong> More distinct clusters</li>
                    <li>• <strong>Short branches:</strong> Similar/overlapping clusters</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Linkage Methods */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Linkage Methods
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Ward&apos;s (Recommended)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimizes within-cluster variance at each merge.
                    <br/><strong>Creates:</strong> Compact, spherical, similar-sized clusters
                    <br/><strong>Best for:</strong> Most general-purpose use
                    <br/><strong>Requires:</strong> Euclidean distance only
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Complete (Farthest)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Distance = max distance between any two points.
                    <br/><strong>Creates:</strong> Compact clusters
                    <br/><strong>Best for:</strong> When you want tight groups
                    <br/><strong>Weakness:</strong> Sensitive to outliers
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Average (UPGMA)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Distance = average of all pairwise distances.
                    <br/><strong>Creates:</strong> Balanced clusters
                    <br/><strong>Best for:</strong> General use, compromise approach
                    <br/><strong>Moderate:</strong> Outlier sensitivity
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Single (Nearest) ⚠️</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Distance = min distance between any two points.
                    <br/><strong>Creates:</strong> Elongated, chain-like clusters
                    <br/><strong>Warning:</strong> &quot;Chaining effect&quot; — may create one giant cluster
                    <br/><strong>Use only:</strong> When chains/elongated shapes expected
                  </p>
                </div>
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
                  <p className="font-medium text-sm text-primary">Euclidean (Default)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Straight-line distance in multidimensional space.
                    <br/><strong>Best for:</strong> Continuous variables on similar scales
                    <br/><strong>Required for:</strong> Ward&apos;s linkage
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-2">
                  <div className="p-2 rounded bg-background border text-xs">
                    <strong>Manhattan</strong>
                    <p className="text-muted-foreground">City-block distance. More robust to outliers.</p>
                  </div>
                  <div className="p-2 rounded bg-background border text-xs">
                    <strong>Cosine</strong>
                    <p className="text-muted-foreground">Angle-based. Good when direction matters more than magnitude.</p>
                  </div>
                  <div className="p-2 rounded bg-background border text-xs">
                    <strong>Correlation</strong>
                    <p className="text-muted-foreground">Profile shape similarity. Good for pattern matching.</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Evaluation Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Evaluation Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Silhouette Score</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how similar points are to their own cluster vs other clusters.
                    <br/>Range: -1 to 1. <strong>Higher is better.</strong>
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-green-100 dark:bg-green-900/30 text-center">
                      <p className="font-medium text-green-700 dark:text-green-400">0.7-1.0</p>
                      <p className="text-muted-foreground">Excellent</p>
                    </div>
                    <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-center">
                      <p className="font-medium text-blue-700 dark:text-blue-400">0.5-0.7</p>
                      <p className="text-muted-foreground">Good</p>
                    </div>
                    <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 text-center">
                      <p className="font-medium text-amber-700 dark:text-amber-400">0.25-0.5</p>
                      <p className="text-muted-foreground">Fair</p>
                    </div>
                    <div className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-center">
                      <p className="font-medium text-red-700 dark:text-red-400">&lt;0.25</p>
                      <p className="text-muted-foreground">Weak</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-background border text-xs">
                    <strong>Calinski-Harabasz Index</strong>
                    <p className="text-muted-foreground">Ratio of between/within cluster dispersion. <strong>Higher is better.</strong></p>
                  </div>
                  <div className="p-2 rounded bg-background border text-xs">
                    <strong>Davies-Bouldin Index</strong>
                    <p className="text-muted-foreground">Average similarity between clusters. <strong>Lower is better.</strong> Below 1 is good.</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Choosing K */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Choosing Number of Clusters
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• <strong>Visual inspection:</strong> Cut dendrogram where branches are longest</li>
                  <li>• <strong>Silhouette analysis:</strong> Try multiple k, choose highest average silhouette</li>
                  <li>• <strong>Elbow method:</strong> Plot within-cluster variance vs k, find the &quot;elbow&quot;</li>
                  <li>• <strong>Domain knowledge:</strong> What makes sense for your application?</li>
                  <li>• <strong>Auto-detection:</strong> Leave empty for algorithm to recommend</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Tip:</strong> HCA&apos;s advantage is you can try different k values quickly by 
                  cutting the same dendrogram at different heights — no need to re-run the algorithm.
                </p>
              </div>
            </div>

            <Separator />

            {/* HCA vs Other Methods */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                HCA vs Other Clustering Methods
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-2">HCA</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Visual hierarchy (dendrogram)</li>
                    <li>✓ No pre-specified k needed</li>
                    <li>✓ Deterministic results</li>
                    <li>✓ Shows multi-scale structure</li>
                    <li>✗ O(n²) memory, slow for large n</li>
                    <li>✗ Cannot undo merges</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">K-Means</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Fast and scalable</li>
                    <li>✓ Works well for spherical clusters</li>
                    <li>✗ Must specify k in advance</li>
                    <li>✗ No hierarchy</li>
                    <li>✗ Non-deterministic</li>
                    <li>✗ Sensitive to initialization</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-muted/30 border text-xs text-muted-foreground">
                <strong>Choose HCA when:</strong> You want to visualize hierarchical relationships, 
                explore different numbers of clusters easily, or have moderate-sized data (n &lt; 10,000).
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
                    <li>• <strong>Standardize variables</strong> (essential!)</li>
                    <li>• Handle missing values first</li>
                    <li>• Consider removing outliers</li>
                    <li>• Check for highly correlated variables</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Method Selection</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with Ward&apos;s linkage</li>
                    <li>• Use Euclidean for most cases</li>
                    <li>• Avoid Single linkage unless justified</li>
                    <li>• Compare multiple linkage methods</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Examine dendrogram structure</li>
                    <li>• Compare cluster profiles (centroids)</li>
                    <li>• Check cluster sizes for balance</li>
                    <li>• Validate with silhouette scores</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report linkage method and distance</li>
                    <li>• Include k, n, and variables used</li>
                    <li>• Show silhouette, CH, DB indices</li>
                    <li>• Include dendrogram visualization</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> HCA provides a visual hierarchy 
                of your data through the dendrogram. Start with Ward&apos;s linkage and Euclidean distance. 
                Standardize your data first! You can explore different numbers of clusters by cutting 
                the dendrogram at different heights without re-running the algorithm.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(ex => ex.analysisTypes.includes('hca'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <GitBranch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Hierarchical Cluster Analysis (HCA)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Group similar observations using agglomerative clustering
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TreeDeciduous className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Dendrogram</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Visualize hierarchical relationships
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Cluster Profiles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Understand cluster characteristics
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Optimal K</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Auto-recommend cluster count
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Layers className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            HCA builds a hierarchy of clusters by iteratively merging the most similar observations. The result is a dendrogram showing the nested grouping structure.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variables:</strong> At least 2 numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Data:</strong> Should be scaled/standardized</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-primary" />
                                    Key Parameters
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Linkage:</strong> Ward, Complete, Average, Single</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Distance:</strong> Euclidean, Manhattan, etc.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <GitBranch className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface HcaPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function HcaPage({ data, numericHeaders, onLoadExample }: HcaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [linkageMethod, setLinkageMethod] = useState('ward');
    const [distanceMetric, setDistanceMetric] = useState('euclidean');
    const [nClusters, setNClusters] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullHcaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Variables selected', passed: selectedItems.length >= 2, message: selectedItems.length >= 2 ? `${selectedItems.length} variables selected` : 'Select at least 2 variables' });
        checks.push({ label: 'Sufficient observations', passed: data.length >= 10, message: `${data.length} observations` });
        checks.push({ label: 'Linkage method configured', passed: !!linkageMethod, message: `Method: ${linkageMethod}` });
        checks.push({ label: 'Distance metric valid', passed: linkageMethod !== 'ward' || distanceMetric === 'euclidean', message: linkageMethod === 'ward' ? 'Ward requires Euclidean' : `Metric: ${distanceMetric}` });
        return checks;
    }, [selectedItems.length, data.length, linkageMethod, distanceMetric]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [data, numericHeaders, canRun]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `HCA_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const { results } = analysisResult;
        let csv = "HIERARCHICAL CLUSTER ANALYSIS REPORT\n\n";
        csv += "CLUSTER PROFILES\n";
        const profileData = Object.entries(results.profiles).map(([name, p]) => ({ Cluster: name, Size: p.size, Percentage: p.percentage.toFixed(1) + '%', ...p.centroid }));
        csv += Papa.unparse(profileData) + "\n\n";
        if (results.final_metrics) {
            csv += "VALIDATION METRICS\n";
            csv += Papa.unparse([results.final_metrics]) + "\n";
        }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `HCA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/hca-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedItems,
                    linkageMethod,
                    distanceMetric,
                    sampleSize: data.length,
                    plot: analysisResult.plot
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `HCA_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedItems, linkageMethod, distanceMetric, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Error', description: 'Select at least 2 variables.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/hca`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, linkageMethod, distanceMetric, nClusters: nClusters ? Number(nClusters) : null })
            });
            if (!response.ok) throw new Error((await response.json()).error || 'API error');
            const result = await response.json();
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: `Found ${result.results.n_clusters} clusters.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, linkageMethod, distanceMetric, nClusters, toast]);

    if (!canRun || view === 'intro') return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = step.id === currentStep;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button key={step.id} onClick={() => isAccessible && goToStep(step.id as Step)} disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <HCAGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Hierarchical Cluster Analysis</h1>
                    <p className="text-muted-foreground mt-1">Group similar observations</p>
                </div>
                {/* 👇 버튼 수정 */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
                        <HelpCircle className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
            <ProgressBar />

            
            <div className="min-h-[500px]">
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose numeric variables for clustering</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <ScrollArea className="h-48 border rounded-xl p-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {numericHeaders.map(header => (
                                        <div key={header} className="flex items-center space-x-2">
                                            <Checkbox id={`hca-${header}`} checked={selectedItems.includes(header)} onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)} />
                                            <label htmlFor={`hca-${header}`} className="text-sm font-medium leading-none cursor-pointer">{header}</label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground"><strong>{selectedItems.length}</strong> variables selected, <strong>{data.length}</strong> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedItems.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Clustering Parameters</CardTitle><CardDescription>Configure linkage and distance settings</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Linkage Method</Label><Select value={linkageMethod} onValueChange={setLinkageMethod}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ward">Ward (minimizes variance)</SelectItem><SelectItem value="complete">Complete (max distance)</SelectItem><SelectItem value="average">Average (mean distance)</SelectItem><SelectItem value="single">Single (min distance)</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Distance Metric</Label><Select value={distanceMetric} onValueChange={setDistanceMetric} disabled={linkageMethod === 'ward'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="euclidean">Euclidean</SelectItem><SelectItem value="manhattan">Manhattan</SelectItem><SelectItem value="cosine">Cosine</SelectItem><SelectItem value="correlation">Correlation</SelectItem></SelectContent></Select>{linkageMethod === 'ward' && <p className="text-xs text-muted-foreground">Ward requires Euclidean</p>}</div>
                                <div className="space-y-2"><Label>Number of Clusters (Optional)</Label><Input type="number" placeholder="Auto-detect" value={nClusters ?? ''} onChange={e => setNClusters(e.target.value ? parseInt(e.target.value) : null)} /><p className="text-xs text-muted-foreground">Leave empty for automatic</p></div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><span className="text-muted-foreground">Variables:</span> <span className="font-medium">{selectedItems.length}</span></div><div><span className="text-muted-foreground">Linkage:</span> <span className="font-medium">{linkageMethod}</span></div><div><span className="text-muted-foreground">Distance:</span> <span className="font-medium">{distanceMetric}</span></div><div><span className="text-muted-foreground">Clusters:</span> <span className="font-medium">{nClusters || 'Auto'}</span></div></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {validationChecks.map((check, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${check.passed ? 'bg-primary/5 border-primary/30' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                        <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}<div><p className="font-medium text-sm">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                                        <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? 'Pass' : 'Fail'}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Clustering Summary</CardTitle><CardDescription>{results.n_clusters} clusters identified</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className={`font-bold ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Identified <strong>{results.n_clusters} distinct clusters</strong> in the data</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Silhouette Score: <strong>{results.final_metrics?.silhouette.toFixed(3)}</strong> ({(results.final_metrics?.silhouette || 0) >= 0.7 ? 'Excellent' : (results.final_metrics?.silhouette || 0) >= 0.5 ? 'Good' : (results.final_metrics?.silhouette || 0) >= 0.25 ? 'Fair' : 'Weak'} separation)</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Largest cluster: <strong>{Object.entries(results.profiles).sort((a, b) => b[1].size - a[1].size)[0]?.[0]}</strong> ({Object.entries(results.profiles).sort((a, b) => b[1].size - a[1].size)[0]?.[1].percentage.toFixed(1)}%)</p></div>
                                </div>
                            </div>
                            <div className={`rounded-xl p-5 border ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <div className="flex items-start gap-3">{(results.final_metrics?.silhouette || 0) >= 0.5 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{(results.final_metrics?.silhouette || 0) >= 0.5 ? 'Good Cluster Quality ✓' : 'Moderate Cluster Quality'}</p><p className="text-sm text-muted-foreground mt-1">{(results.final_metrics?.silhouette || 0) >= 0.5 ? 'Clusters are well-separated and cohesive.' : 'Consider adjusting parameters or trying different number of clusters.'}</p></div></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Clusters</p><GitBranch className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_clusters}</p><p className="text-xs text-muted-foreground">Groups found</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Silhouette</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'text-green-600' : (results.final_metrics?.silhouette || 0) >= 0.25 ? 'text-amber-600' : 'text-red-600'}`}>{results.final_metrics?.silhouette.toFixed(3)}</p><p className="text-xs text-muted-foreground">-1 to 1, higher better</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Calinski-Harabasz</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.final_metrics?.calinski_harabasz.toFixed(1)}</p><p className="text-xs text-muted-foreground">Higher is better</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Davies-Bouldin</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.final_metrics?.davies_bouldin.toFixed(3)}</p><p className="text-xs text-muted-foreground">Lower is better</p></div></CardContent></Card>
                            </div>
                            <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(star => { const score = (results.final_metrics?.silhouette || 0) >= 0.7 ? 5 : (results.final_metrics?.silhouette || 0) >= 0.5 ? 4 : (results.final_metrics?.silhouette || 0) >= 0.35 ? 3 : (results.final_metrics?.silhouette || 0) >= 0.2 ? 2 : 1; return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;})}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Understanding hierarchical clustering</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">Agglomerative Clustering</h4><p className="text-sm text-muted-foreground">We used <strong className="text-foreground">{linkageMethod}</strong> linkage with <strong className="text-foreground">{distanceMetric}</strong> distance. Each observation starts as its own cluster, then pairs are merged iteratively based on similarity.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Silhouette Score</h4><p className="text-sm text-muted-foreground">Measures how similar an object is to its own cluster compared to other clusters. Score of <strong className="text-foreground">{results.final_metrics?.silhouette.toFixed(3)}</strong> indicates {(results.final_metrics?.silhouette || 0) >= 0.5 ? 'well-defined clusters' : 'overlapping or weak cluster structure'}.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Optimal K Selection</h4><p className="text-sm text-muted-foreground">{nClusters ? `You specified ${nClusters} clusters.` : `We automatically determined ${results.n_clusters} clusters using multiple criteria (silhouette, elbow method, gap statistic).`}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Cluster Profiles</h4><p className="text-sm text-muted-foreground">Each cluster's centroid (mean values) reveals its characteristics. Compare centroids to understand what makes each cluster unique.</p></div></div></div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4><p className="text-sm text-muted-foreground">{results.interpretations?.overall_quality ? <span dangerouslySetInnerHTML={{ __html: results.interpretations.overall_quality.replace(/\\n/g, ' ').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /> : `Found ${results.n_clusters} meaningful groups in your data with ${(results.final_metrics?.silhouette || 0) >= 0.5 ? 'good' : 'moderate'} separation.`}</p></div>
                            <div className="bg-muted/20 rounded-xl p-4"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Silhouette Score Reference</h4><div className="grid grid-cols-4 gap-2 text-xs"><div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">0.7-1.0</p><p className="text-muted-foreground">Excellent</p></div><div className="text-center p-2 bg-background rounded-lg border-blue-200 border"><p className="font-medium text-blue-600">0.5-0.7</p><p className="text-muted-foreground">Good</p></div><div className="text-center p-2 bg-background rounded-lg border-amber-200 border"><p className="font-medium text-amber-600">0.25-0.5</p><p className="text-muted-foreground">Fair</p></div><div className="text-center p-2 bg-background rounded-lg border-red-200 border"><p className="font-medium text-red-600">&lt;0.25</p><p className="text-muted-foreground">Weak</p></div></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && analysisResult && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full cluster analysis</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Hierarchical Cluster Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.n_clusters} clusters | {selectedItems.length} variables | {data.length} observations | {new Date().toLocaleDateString()}</p></div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Clusters</p><p className="text-lg font-bold">{results.n_clusters}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Silhouette</p><p className="text-lg font-bold">{results.final_metrics?.silhouette.toFixed(3)}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Calinski-Harabasz</p><p className="text-lg font-bold">{results.final_metrics?.calinski_harabasz.toFixed(1)}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Davies-Bouldin</p><p className="text-lg font-bold">{results.final_metrics?.davies_bouldin.toFixed(3)}</p></CardContent></Card>
                            </div>

                            {analysisResult.plot && (
                                <Card><CardHeader><CardTitle>Dendrogram & Visualizations</CardTitle></CardHeader><CardContent><Image src={analysisResult.plot} alt="HCA Plots" width={1500} height={1800} className="w-full rounded-md border"/></CardContent></Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Cluster Profiles</CardTitle><CardDescription>Mean values for each cluster</CardDescription></CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Cluster</TableHead><TableHead>Size</TableHead>{selectedItems.map(item => <TableHead key={item} className="text-right">{item}</TableHead>)}</TableRow></TableHeader>
                                            <TableBody>
                                                {Object.entries(results.profiles).map(([name, profile]) => (
                                                    <TableRow key={name}>
                                                        <TableCell className="font-semibold">{name}</TableCell>
                                                        <TableCell>{profile.size} <span className="text-muted-foreground">({profile.percentage.toFixed(1)}%)</span></TableCell>
                                                        {selectedItems.map(item => <TableCell key={item} className="text-right font-mono">{profile.centroid[item]?.toFixed(2)}</TableCell>)}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {results.optimal_k_recommendation && (
                                <Card><CardHeader><CardTitle>Optimal K Recommendations</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-4">{Object.entries(results.optimal_k_recommendation).map(([method, k]) => <Badge key={method} variant="outline" className="text-sm py-2 px-4">{method}: <strong className="ml-1">{k} clusters</strong></Badge>)}</div></CardContent></Card>
                            )}

                            {results.interpretations && (
                                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" />AI Interpretation</CardTitle></CardHeader><CardContent className="space-y-4">
                                    <div><strong>Overall Quality:</strong><p className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: results.interpretations.overall_quality.replace(/\\n/g, '<br />') }} /></div>
                                    <div><strong>Cluster Profiles:</strong><ul className="mt-2 space-y-2">{results.interpretations.cluster_profiles.map((p, i) => <li key={i} className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: '• ' + p }} />)}</ul></div>
                                    <div><strong>Distribution:</strong><p className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: results.interpretations.cluster_distribution }} /></div>
                                </CardContent></Card>
                            )}
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running hierarchical clustering...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>)}
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
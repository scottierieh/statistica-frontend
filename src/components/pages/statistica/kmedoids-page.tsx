'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Binary, Users, Settings, FileSearch, HelpCircle, BookOpen, Shield, Sparkles, Layers, Download, TrendingUp, FileType, BarChart3, Target, Hash, CheckCircle, Info, Lightbulb, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, FileSpreadsheet, ImageIcon, AlertTriangle, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/kmedoids_clustering.py?alt=media";

// Statistical terms glossary for K-Medoids Clustering
const kmedoidsTermDefinitions: Record<string, string> = {
    "K-Medoids Clustering": "A partitioning clustering algorithm similar to K-Means, but uses actual data points (medoids) as cluster centers instead of computed means. More robust to outliers and noise.",
    "Medoid": "The most centrally located data point in a cluster. Unlike a centroid (which is a computed mean), a medoid is always an actual observation from the dataset.",
    "PAM (Partitioning Around Medoids)": "The most common K-Medoids algorithm. It iteratively selects k representative objects and assigns each remaining object to the nearest medoid.",
    "Cluster": "A group of similar data points assigned to the same medoid. Each point belongs to the cluster with the nearest medoid.",
    "k (Number of Clusters)": "A hyperparameter specifying how many clusters to create. Each cluster will have exactly one medoid as its representative.",
    "Dissimilarity Matrix": "A matrix containing pairwise distances between all data points. K-Medoids can work with any distance metric, not just Euclidean.",
    "Total Cost (Inertia)": "The sum of distances from each point to its assigned medoid. K-Medoids minimizes this value during optimization.",
    "Silhouette Score": "Measures how similar a point is to its own cluster compared to other clusters. Ranges from -1 to 1; higher values indicate better clustering.",
    "Silhouette Coefficient": "The average silhouette score across all data points. A global measure of clustering quality.",
    "Calinski-Harabasz Index": "Ratio of between-cluster dispersion to within-cluster dispersion. Higher values indicate better-defined clusters.",
    "Davies-Bouldin Index": "Measures average similarity between clusters. Lower values indicate better separation between clusters.",
    "Swap Operation": "In PAM, the process of trying to improve clustering by swapping a current medoid with a non-medoid point to reduce total cost.",
    "Build Phase": "Initial phase in PAM where k initial medoids are selected to minimize total cost.",
    "Swap Phase": "Iterative phase in PAM where medoids are swapped with non-medoids if it reduces total cost.",
    "Outlier Robustness": "K-Medoids is more robust to outliers than K-Means because medoids use actual data points rather than computed means, which can be pulled by extreme values.",
    "Manhattan Distance": "Also called L1 distance or city-block distance. Sum of absolute differences. Often used with K-Medoids for non-Euclidean data.",
    "Euclidean Distance": "Standard straight-line distance between two points. The default distance metric in most implementations.",
    "CLARA (Clustering Large Applications)": "A sampling-based extension of PAM for large datasets. Applies PAM to random samples and selects the best result.",
    "CLARANS": "A hybrid between PAM and random search. More efficient for large datasets than standard PAM.",
    "Cluster Profile": "Summary statistics describing each cluster based on feature values. Helps interpret what makes each cluster unique.",
    "Exemplar": "Another term for medoid — the most representative data point of a cluster that can be examined directly.",
    "Convergence": "When the swap phase can no longer find any swap that reduces total cost. The algorithm terminates at this point.",
    "Interpretability": "K-Medoids provides better interpretability because each cluster center is a real data point that can be examined and understood directly.",
    "Computational Complexity": "PAM has O(k(n-k)²) complexity per iteration, making it slower than K-Means for large datasets. CLARA/CLARANS are faster alternatives."
};

interface KMedoidsResults {
    clustering_summary: { n_clusters: number; inertia: number; medoids: { [key: string]: number }[]; labels: number[]; };
    profiles: { [key: string]: { size: number; percentage: number; centroid: { [key: string]: number }; }; };
    final_metrics?: { silhouette: number; davies_bouldin: number; calinski_harabasz: number; };
    interpretations: { overall_quality: string; cluster_profiles: string[]; cluster_distribution: string; };
    clustered_data?: DataSet;
}
interface FullKMedoidsResponse { results: KMedoidsResults; plot: string; }

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
        link.download = 'kmedoids_clustering.py';
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
                        Python Code - K-Medoids Clustering (PAM)
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
                        K-Medoids Clustering Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in K-Medoids (PAM) cluster analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(kmedoidsTermDefinitions).map(([term, definition]) => (
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

// Statistical Summary Cards
const StatisticalSummaryCards = ({ results }: { results: KMedoidsResults }) => {
    const silhouette = results.final_metrics?.silhouette || 0;
    const calinski = results.final_metrics?.calinski_harabasz || 0;
    const daviesBouldin = results.final_metrics?.davies_bouldin || 0;
    const getSilhouette = (s: number) => s >= 0.7 ? 'Excellent' : s >= 0.5 ? 'Good' : s >= 0.25 ? 'Fair' : 'Poor';
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Clusters (k)</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.clustering_summary.n_clusters}</p><p className="text-xs text-muted-foreground">Medoid-based</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Silhouette</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{silhouette.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getSilhouette(silhouette)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Calinski-Harabasz</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{calinski.toFixed(0)}</p><p className="text-xs text-muted-foreground">Higher better</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Davies-Bouldin</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{daviesBouldin.toFixed(3)}</p><p className="text-xs text-muted-foreground">Lower better</p></div></CardContent></Card>
        </div>
    );
};

// K-Medoids Analysis Guide Component
const KMedoidsGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">K-Medoids Clustering Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is K-Medoids */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Binary className="w-4 h-4" />
                What is K-Medoids (PAM)?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                K-Medoids is a clustering algorithm similar to K-Means, but uses <strong>actual data 
                points (medoids)</strong> as cluster centers instead of computed means (centroids). 
                This makes it more robust to outliers and more interpretable.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>PAM Algorithm (Partitioning Around Medoids):</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. <strong>Build:</strong> Select k initial medoids<br/>
                    2. <strong>Assign:</strong> Assign each point to nearest medoid<br/>
                    3. <strong>Swap:</strong> Try swapping medoid with non-medoid to reduce cost<br/>
                    4. <strong>Repeat:</strong> Until no improvement possible
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* K-Medoids vs K-Means */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                K-Medoids vs K-Means
              </h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <p className="font-medium text-sm text-primary mb-2">K-Medoids</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Center = actual data point (medoid)</li>
                      <li>• <strong>Robust to outliers</strong></li>
                      <li>• Works with any distance metric</li>
                      <li>• Centers are interpretable examples</li>
                      <li>• Slower: O(k(n-k)²) per iteration</li>
                      <li>• Better for noisy data</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm mb-2">K-Means</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Center = computed mean (centroid)</li>
                      <li>• Sensitive to outliers</li>
                      <li>• Typically uses Euclidean distance</li>
                      <li>• Centers may not be real points</li>
                      <li>• Faster: O(nk) per iteration</li>
                      <li>• Better for large clean datasets</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>When to choose K-Medoids:</strong> Data contains outliers, you need 
                    interpretable cluster representatives, or you want to use non-Euclidean 
                    distances (e.g., Manhattan, categorical similarity).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Medoids as Exemplars */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Understanding Medoids
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  A <strong>medoid</strong> is the most centrally located data point in a cluster — 
                  the one that minimizes total distance to all other points in that cluster.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-background border">
                    <strong>Exemplar:</strong> Each medoid is a real observation from your dataset, 
                    making it a &quot;typical example&quot; of its cluster.
                  </div>
                  <div className="p-2 rounded bg-background border">
                    <strong>Interpretability:</strong> You can examine the medoid directly to 
                    understand what the cluster represents.
                  </div>
                  <div className="p-2 rounded bg-background border">
                    <strong>Customer Segmentation:</strong> The medoid is a &quot;prototype customer&quot; — 
                    a real person representing that segment.
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Evaluation Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Evaluation Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Silhouette Score</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How well points fit their cluster vs nearest other cluster.
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-green-100 dark:bg-green-900/30 text-center">
                      <p className="font-medium text-green-700 dark:text-green-400">≥0.70</p>
                      <p className="text-muted-foreground">Excellent</p>
                    </div>
                    <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-center">
                      <p className="font-medium text-blue-700 dark:text-blue-400">0.50-0.69</p>
                      <p className="text-muted-foreground">Good</p>
                    </div>
                    <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 text-center">
                      <p className="font-medium text-amber-700 dark:text-amber-400">0.25-0.49</p>
                      <p className="text-muted-foreground">Fair</p>
                    </div>
                    <div className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-center">
                      <p className="font-medium text-red-700 dark:text-red-400">&lt;0.25</p>
                      <p className="text-muted-foreground">Poor</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Calinski-Harabasz Index</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ratio of between-cluster to within-cluster variance.
                    <br/><strong>Higher is better</strong> — indicates well-defined clusters.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Davies-Bouldin Index</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average similarity between clusters.
                    <br/><strong>Lower is better</strong> — &lt;1 indicates good separation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Total Cost (Inertia)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sum of distances from each point to its medoid.
                    <br/><strong>Lower is better</strong>, but decreases with more k.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Choosing k */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Choosing the Number of Clusters (k)
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Same Methods as K-Means</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Elbow Method:</strong> Plot cost vs k, find the &quot;elbow&quot;</li>
                    <li>• <strong>Silhouette:</strong> Choose k that maximizes silhouette score</li>
                    <li>• <strong>Domain Knowledge:</strong> How many segments make business sense?</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Practical Guidelines</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Start with k = 3-5 and compare results</li>
                    <li>• Check cluster sizes — very unequal may indicate wrong k</li>
                    <li>• Examine medoids — do they represent meaningful types?</li>
                    <li>• Consider interpretability over statistical fit</li>
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
                  <p className="font-medium text-sm text-primary mb-1">When to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Data contains outliers</li>
                    <li>• Need interpretable exemplars</li>
                    <li>• Small-medium datasets (&lt;10,000)</li>
                    <li>• Non-Euclidean distance needed</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Standardize if scales differ</li>
                    <li>• Handle missing values first</li>
                    <li>• Consider feature selection</li>
                    <li>• Outliers OK (that&apos;s the point!)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Examine each medoid directly</li>
                    <li>• Compare medoids across clusters</li>
                    <li>• Name clusters based on medoid characteristics</li>
                    <li>• Use medoids as segment prototypes</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report k, n, and # variables</li>
                    <li>• Include silhouette score</li>
                    <li>• Show medoid characteristics</li>
                    <li>• Describe cluster sizes and profiles</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Limitations */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Limitations
              </h3>
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Slower than K-Means:</strong> O(k(n-k)²) vs O(nk) per iteration</li>
                  <li>• <strong>Not ideal for very large data:</strong> Use CLARA or CLARANS instead</li>
                  <li>• <strong>Still requires k specification:</strong> No automatic k selection</li>
                  <li>• <strong>Assumes spherical clusters:</strong> Like K-Means, struggles with non-convex shapes</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> K-Medoids trades computational 
                efficiency for robustness and interpretability. Each medoid is a real data point 
                you can examine and explain. Choose K-Medoids when you need outlier resistance 
                or when cluster representatives must be actual observations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'customer-segments');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Binary className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">K-Medoids Clustering (PAM)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Robust clustering using actual data points as centers
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Shield className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Outlier Resistant</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    More robust than K-Means
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Real Data Points</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Medoids are actual observations
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interpretable</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Centers represent real examples
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
                            Use when your data contains outliers. Medoids are actual data points, making cluster centers directly interpretable.
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
                                        <span><strong>Features:</strong> 2+ numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>K value:</strong> Specify number of clusters</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> Works with smaller datasets</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You&apos;ll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Medoid exemplars:</strong> Actual representative points</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Silhouette score:</strong> Cluster separation quality</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cluster profiles:</strong> Size and characteristics</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Users className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
interface KMedoidsPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function KMedoidsPage({ data, numericHeaders, onLoadExample }: KMedoidsPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [nClusters, setNClusters] = useState<number>(3);
    
    const [analysisResult, setAnalysisResult] = useState<FullKMedoidsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Variables selected', passed: selectedItems.length >= 2, detail: `${selectedItems.length} variable(s) (minimum: 2)` });
        checks.push({ label: 'Valid K value', passed: nClusters >= 2, detail: `k = ${nClusters} clusters` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= nClusters * 10, detail: `${Math.floor(data.length / nClusters)} samples per cluster` });
        checks.push({ label: 'K less than sample size', passed: nClusters < data.length, detail: `k = ${nClusters} < n = ${data.length}` });
        return checks;
    }, [selectedItems, nClusters, data]);

    const allValidationsPassed = useMemo(() => selectedItems.length >= 2 && nClusters >= 2 && nClusters < data.length, [selectedItems, nClusters, data]);

    useEffect(() => {
        setSelectedItems(numericHeaders.slice(0, Math.min(5, numericHeaders.length)));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [data, numericHeaders, canRun]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `KMedoids_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results.clustered_data) return;
        const csv = Papa.unparse(analysisResult.results.clustered_data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `KMedoids_clustered_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/kmedoids-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedItems,
                    nClusters,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `KMedoids_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedItems, nClusters, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2 || nClusters < 2) {
            toast({ variant: 'destructive', title: 'Please select at least 2 variables and k ≥ 2.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/kmedoids`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, nClusters: Number(nClusters) })
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Analysis failed');
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            const cleanData = data.filter(row => selectedItems.every(item => row[item] != null && row[item] !== ''));
            const dataWithClusters = cleanData.map((row, i) => ({ ...row, Cluster: `Cluster ${result.results.clustering_summary.labels[i] + 1}` }));
            
            setAnalysisResult({ ...result, results: { ...result.results, clustered_data: dataWithClusters } });
            goToStep(4);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nClusters, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
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
            <KMedoidsGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">K-Medoids Clustering (PAM)</h1>
                    <p className="text-muted-foreground mt-1">Robust clustering with actual data points as centers</p>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose numeric features for clustering</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Clustering Variables ({selectedItems.length} selected, min 2)</Label>
                                <ScrollArea className="h-48 p-4 border rounded-xl bg-muted/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.map(h => (
                                            <div key={h} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <Checkbox id={`var-${h}`} checked={selectedItems.includes(h)} onCheckedChange={(c) => handleItemSelectionChange(h, c as boolean)} />
                                                <Label htmlFor={`var-${h}`} className="text-sm font-normal cursor-pointer truncate">{h}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {selectedItems.length > 0 && <div className="flex flex-wrap gap-1">{selectedItems.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}</div>}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedItems.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Clustering Settings</CardTitle><CardDescription>Specify the number of clusters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="nClusters">Number of Clusters (k)</Label>
                                <Input id="nClusters" type="number" value={nClusters} onChange={e => setNClusters(parseInt(e.target.value) || 2)} min="2" max={Math.floor(data.length / 2)} className="h-12 max-w-xs" />
                                <p className="text-xs text-muted-foreground">Number of medoid-based groups to create (2 to {Math.floor(data.length / 2)})</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variables:</strong> {selectedItems.join(', ')}</p>
                                    <p>• <strong className="text-foreground">Clusters:</strong> k = {nClusters}</p>
                                    <p>• <strong className="text-foreground">Avg samples/cluster:</strong> {Math.floor(data.length / nClusters)}</p>
                                    <p>• <strong className="text-foreground">Algorithm:</strong> PAM (Partitioning Around Medoids)</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />K-Medoids vs K-Means</h4>
                                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div><strong className="text-foreground">K-Medoids:</strong> Uses actual data points as centers (medoids)</div>
                                    <div><strong className="text-foreground">K-Means:</strong> Uses computed centroids (may not be real points)</div>
                                    <div><strong className="text-foreground">Advantage:</strong> More robust to outliers</div>
                                    <div><strong className="text-foreground">Use case:</strong> Noisy data, interpretability needed</div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg" disabled={nClusters < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready</CardDescription></div></div></CardHeader>
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
                                <Binary className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will partition {data.length} points into {nClusters} clusters using {selectedItems.length} features.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run K-Medoids<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const silhouette = results.final_metrics?.silhouette || 0;
                    const daviesBouldin = results.final_metrics?.davies_bouldin || 0;
                    const isGood = silhouette >= 0.5;
                    const clusterSizes = Object.values(results.profiles).map(p => p.size);
                    const maxSize = Math.max(...clusterSizes);
                    const minSize = Math.min(...clusterSizes);
                    const isBalanced = maxSize / minSize < 3;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>K-Medoids Clustering: k = {nClusters}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Successfully partitioned data into <strong>{results.clustering_summary.n_clusters} groups</strong>. 
                                            {isGood ? ' Each group is clearly distinguished.' : ' Group boundaries are somewhat ambiguous.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isBalanced 
                                                ? `Group sizes are balanced (min ${minSize} ~ max ${maxSize}).`
                                                : `Large size difference between groups (min ${minSize} vs max ${maxSize}). Some groups may be too small or large.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Each cluster center (Medoid) is an actual data point. Use them as &quot;typical examples&quot; representing each group.
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Clustering Successful!" : "Consider Adjusting K"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? 'Groups are well-separated. Use for segment-based strategy development.' 
                                                    : 'Try increasing or decreasing K to find clearer group boundaries.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Silhouette Score:</strong> {silhouette.toFixed(3)} — Measures how well each data point fits its cluster. {silhouette >= 0.7 ? 'Above 0.7 is excellent.' : silhouette >= 0.5 ? 'Above 0.5 is good.' : silhouette >= 0.25 ? '0.25-0.5 is moderate.' : 'Below 0.25 indicates weak separation.'} (Range: -1 to 1, higher is better)</p>
                                        <p>• <strong>Davies-Bouldin Index:</strong> {daviesBouldin.toFixed(3)} — Measures cluster separation. {daviesBouldin < 1 ? 'Below 1 indicates good separation.' : 'Above 1 suggests some clusters may overlap.'} (Lower is better)</p>
                                        <p>• <strong>Cluster Distribution:</strong> {results.interpretations.cluster_distribution}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Cluster Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = silhouette >= 0.7 ? 5 : silhouette >= 0.5 ? 4 : silhouette >= 0.35 ? 3 : silhouette >= 0.2 ? 2 : 1;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">View Details<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding K-Medoids clustering</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What are Medoids?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Unlike K-Means centroids (which are computed averages), medoids are actual data points from your dataset. 
                                            They represent the most &quot;central&quot; observation in each cluster.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Silhouette Score ({(results.final_metrics?.silhouette || 0).toFixed(3)})</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Measures how similar each point is to its own cluster vs other clusters. 
                                            Range: -1 to 1. {(results.final_metrics?.silhouette || 0) >= 0.5 ? 'Your score indicates good cluster separation.' : 'Consider trying different k values.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Robustness to Outliers</h4>
                                        <p className="text-sm text-muted-foreground">
                                            K-Medoids is more robust than K-Means because medoids use actual data points rather than computed means. 
                                            Outliers have less influence on the final cluster centers.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Interpretability</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Each medoid is a real example from your data, making it easy to interpret. 
                                            For customer segmentation, each medoid is a &quot;prototype&quot; customer representing that segment.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line</h4>
                                <p className="text-sm text-muted-foreground">
                                    K-Medoids created {results.clustering_summary.n_clusters} clusters. The medoids table shows the actual data points 
                                    serving as cluster centers. {(results.final_metrics?.silhouette || 0) >= 0.5 ? 'Good cluster separation achieved.' : 'Consider trying different k values for better separation.'}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full clustering results and medoid profiles</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />Clustered Data (CSV)</DropdownMenuItem>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">K-Medoids Clustering Report</h2><p className="text-sm text-muted-foreground mt-1">k = {results.clustering_summary.n_clusters} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* APA-style Summary */}
                        <Card>
                            <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Summary</h3>
                                    </div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        K-Medoids clustering (PAM algorithm) was performed on {selectedItems.length} numeric features 
                                        (<em>N</em> = {data.length}) with <em>k</em> = {results.clustering_summary.n_clusters}. 
                                        The analysis yielded a silhouette score of {(results.final_metrics?.silhouette || 0).toFixed(3)}, 
                                        indicating {(results.final_metrics?.silhouette || 0) >= 0.5 ? 'good' : 'moderate'} cluster separation. 
                                        Medoids represent actual data points serving as cluster exemplars.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        <Card>
                            <CardHeader><CardTitle>Cluster Visualization</CardTitle><CardDescription>Medoids marked with &apos;X&apos;</CardDescription></CardHeader>
                            <CardContent>
                                <Image src={analysisResult?.plot || ''} alt="K-Medoids Plots" width={1500} height={600} className="w-3/4 mx-auto rounded-md border"/>
                            </CardContent>
                        </Card>

                        {/* Medoids and Profiles */}
                        <div className="grid lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>Cluster Medoids (Exemplars)</CardTitle><CardDescription>Actual data points as centers</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Cluster</TableHead>{selectedItems.map(item => <TableHead key={item} className="text-right">{item}</TableHead>)}</TableRow></TableHeader>
                                        <TableBody>
                                            {results.clustering_summary.medoids.map((medoid, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-semibold">Cluster {i + 1}</TableCell>
                                                    {selectedItems.map(item => <TableCell key={item} className="text-right font-mono">{medoid[item]?.toFixed(2)}</TableCell>)}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Cluster Profiles</CardTitle><CardDescription>Size and distribution</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Cluster</TableHead><TableHead className="text-right">Size</TableHead><TableHead className="text-right">Percentage</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.profiles).map(([name, profile]) => (
                                                <TableRow key={name}>
                                                    <TableCell className="font-semibold">{name}</TableCell>
                                                    <TableCell className="text-right">{profile.size}</TableCell>
                                                    <TableCell className="text-right"><Badge variant="secondary">{profile.percentage.toFixed(1)}%</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Cluster Interpretations */}
                        <Card>
                            <CardHeader><CardTitle>Cluster Interpretations</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {results.interpretations.cluster_profiles.map((profile, i) => (
                                        <Alert key={i}><Info className="h-4 w-4" /><AlertTitle>Cluster {i + 1}</AlertTitle><AlertDescription dangerouslySetInnerHTML={{ __html: profile }} /></Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
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

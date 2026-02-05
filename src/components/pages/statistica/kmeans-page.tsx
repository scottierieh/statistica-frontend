'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Binary, HelpCircle, Settings, FileSearch, BookOpen, GitBranch, Sparkles, Layers, Download, Hash, Users, TrendingUp, Target, CheckCircle, CheckCircle2, AlertTriangle, Lightbulb, ChevronRight, ChevronLeft, ArrowRight, Check, FileSpreadsheet, ImageIcon, FileText, FileType, FileCode, ChevronDown, Database, Settings2, Shield, Info, Activity, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/kmeans_clustering.py?alt=media";

// Statistical terms glossary for K-Means Clustering
const kmeansTermDefinitions: Record<string, string> = {
    "K-Means Clustering": "An unsupervised machine learning algorithm that partitions data into k distinct, non-overlapping clusters based on similarity. Each data point belongs to the cluster with the nearest centroid.",
    "Cluster": "A group of similar data points that are more similar to each other than to points in other clusters. K-Means creates exactly k clusters.",
    "Centroid": "The center point of a cluster, calculated as the mean of all points in that cluster. K-Means iteratively updates centroids to minimize within-cluster variance.",
    "k (Number of Clusters)": "A hyperparameter that specifies how many clusters to create. Choosing the right k is crucial and often determined using the elbow method or silhouette analysis.",
    "Initialization (K-Means++)": "A smart initialization method that spreads initial centroids apart, leading to faster convergence and better results than random initialization.",
    "Convergence": "The state when cluster assignments no longer change between iterations, or when centroid movement falls below a threshold. K-Means is guaranteed to converge.",
    "Inertia (WCSS)": "Within-Cluster Sum of Squares — the sum of squared distances from each point to its cluster centroid. Lower inertia indicates tighter clusters.",
    "Elbow Method": "A technique to find optimal k by plotting inertia vs. k and looking for the 'elbow' point where adding more clusters yields diminishing returns.",
    "Silhouette Score": "A measure of how similar a point is to its own cluster compared to other clusters. Ranges from -1 to 1; higher is better. Score > 0.5 indicates good clustering.",
    "Silhouette Coefficient": "The average silhouette score across all data points. Used to evaluate overall clustering quality and compare different k values.",
    "Calinski-Harabasz Index": "Also called Variance Ratio Criterion. Measures the ratio of between-cluster dispersion to within-cluster dispersion. Higher values indicate better-defined clusters.",
    "Davies-Bouldin Index": "Measures the average similarity between clusters, where similarity is the ratio of within-cluster distances to between-cluster distances. Lower values indicate better clustering.",
    "Standardization": "Scaling features to have zero mean and unit variance before clustering. Essential when features have different scales, as K-Means is distance-based.",
    "Feature Scaling": "Transforming numerical variables to a common scale. Without scaling, features with larger ranges dominate the distance calculations.",
    "Euclidean Distance": "The default distance metric in K-Means. Calculated as the straight-line distance between two points in multidimensional space.",
    "Cluster Assignment": "The process of assigning each data point to its nearest centroid based on distance. This step alternates with centroid update in the K-Means algorithm.",
    "Iteration": "One complete cycle of cluster assignment followed by centroid update. K-Means typically converges within 10-300 iterations.",
    "Local Minimum": "K-Means can converge to different solutions depending on initial centroids. Running multiple times with different initializations helps find better solutions.",
    "Cluster Profile": "A description of a cluster based on its centroid values. High/low values relative to other clusters reveal what makes each segment unique.",
    "Segmentation": "The practical application of clustering to divide a population into distinct groups for targeted analysis, marketing, or resource allocation.",
    "Cluster Size": "The number of data points assigned to a cluster. Highly imbalanced sizes may indicate suboptimal k or natural data structure.",
    "Cluster Separation": "How distinct clusters are from each other. Good separation means clusters don't overlap and have clear boundaries.",
    "Outliers": "Data points far from any cluster centroid. K-Means is sensitive to outliers, which can pull centroids away from the true cluster centers.",
    "Dimensionality": "The number of features used for clustering. High dimensionality can cause the 'curse of dimensionality' where distances become less meaningful."
};

interface KMeansResults {
    optimal_k?: { k_range: number[]; inertias: number[]; silhouette_scores: number[]; recommended_k?: number; };
    clustering_summary: { n_clusters: number; inertia: number; centroids: number[][]; labels: number[]; };
    profiles: { [key: string]: { size: number; percentage: number; centroid: { [key: string]: number }; } };
    final_metrics?: { silhouette: number; davies_bouldin: number; calinski_harabasz: number; };
    interpretations: { overall_quality: string; cluster_profiles: string[]; cluster_distribution: string; };
    clustered_data?: DataSet;
}

interface FullKMeansResponse { results: KMeansResults; plot: string; }

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
        link.download = 'kmeans_clustering.py';
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
                        Python Code - K-Means Clustering
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
                        K-Means Clustering Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in K-Means cluster analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(kmeansTermDefinitions).map(([term, definition]) => (
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

const StatisticalSummaryCards = ({ results }: { results: KMeansResults }) => {
    const sil = results.final_metrics?.silhouette || 0;
    const calinski = results.final_metrics?.calinski_harabasz || 0;
    const db = results.final_metrics?.davies_bouldin || 0;
    const getQuality = (s: number) => s >= 0.7 ? 'Excellent' : s >= 0.5 ? 'Good' : s >= 0.25 ? 'Fair' : 'Poor';
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Clusters (k)</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.clustering_summary.n_clusters}</p><p className="text-xs text-muted-foreground">Distinct groups</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Silhouette</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{sil.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getQuality(sil)} separation</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Calinski-Harabasz</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{calinski.toFixed(0)}</p><p className="text-xs text-muted-foreground">Higher is better</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Davies-Bouldin</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{db.toFixed(3)}</p><p className="text-xs text-muted-foreground">Lower is better</p></div></CardContent></Card>
        </div>
    );
};


// K-Means Analysis Guide Component
const KMeansGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">K-Means Clustering Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is K-Means */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Binary className="w-4 h-4" />
                What is K-Means Clustering?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                K-Means is an <strong>unsupervised machine learning algorithm</strong> that partitions 
                data into k distinct clusters based on similarity. Each data point belongs to the 
                cluster with the nearest centroid (center point).
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Algorithm:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Initialize k centroids (using K-Means++)<br/>
                    2. Assign each point to nearest centroid<br/>
                    3. Update centroids as mean of assigned points<br/>
                    4. Repeat until convergence
                  </span>
                </p>
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
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Elbow Method</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plot inertia (within-cluster sum of squares) vs k.
                    <br/>Look for the &quot;elbow&quot; where adding more clusters yields diminishing returns.
                    <br/>The elbow point suggests optimal k.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Silhouette Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how similar points are to their own cluster vs others.
                    <br/>Choose k that maximizes average silhouette score.
                    <br/>Scores range from -1 to 1; higher is better.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Domain Knowledge</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Consider what makes sense for your business context.
                    <br/>Too few = overgeneralization, too many = impractical.
                    <br/>Start with 3-5 clusters and adjust based on results.
                  </p>
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
                    How well points fit their cluster vs nearest cluster.
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
                    <br/><strong>Higher is better</strong> — indicates well-separated clusters.
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
                  <p className="font-medium text-sm">Inertia (WCSS)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Within-Cluster Sum of Squares — total distance from points to their centroids.
                    <br/><strong>Lower is better</strong>, but always decreases with more k.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Centroids */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Interpreting Cluster Profiles
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  Each cluster is characterized by its <strong>centroid</strong> — the mean value 
                  of all points in that cluster for each variable.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-background border">
                    <strong>High values:</strong> Above average for that variable → defining characteristic
                  </div>
                  <div className="p-2 rounded bg-background border">
                    <strong>Low values:</strong> Below average → opposite characteristic
                  </div>
                  <div className="p-2 rounded bg-background border">
                    <strong>Compare across clusters:</strong> What makes each segment unique?
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Tip:</strong> Name clusters based on their dominant characteristics 
                  (e.g., &quot;High Spenders&quot;, &quot;Budget Conscious&quot;, &quot;Premium Loyalists&quot;).
                </p>
              </div>
            </div>

            <Separator />

            {/* Requirements */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Requirements &amp; Assumptions
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Requirements</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Numeric variables only</strong></li>
                    <li>• At least 2 variables</li>
                    <li>• No missing values (or impute first)</li>
                    <li>• 30+ samples per expected cluster</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Key Assumptions</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Clusters are roughly spherical</li>
                    <li>• Clusters have similar sizes</li>
                    <li>• Features are on similar scales</li>
                    <li>• No extreme outliers</li>
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
                  <p className="font-medium text-sm text-primary mb-1">Before Clustering</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Standardize variables</strong> (this tool does it automatically)</li>
                    <li>• Remove or handle outliers</li>
                    <li>• Select relevant features</li>
                    <li>• Handle missing data</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Choosing k</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use elbow method as starting point</li>
                    <li>• Validate with silhouette score</li>
                    <li>• Consider practical interpretability</li>
                    <li>• Try multiple k values and compare</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Validation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check cluster sizes for balance</li>
                    <li>• Examine cluster profiles for meaning</li>
                    <li>• Silhouette ≥0.5 is good</li>
                    <li>• Run multiple times (different seeds)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report k, n, and # variables</li>
                    <li>• Include validation metrics</li>
                    <li>• Show cluster profiles (centroids)</li>
                    <li>• Provide business interpretation</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Applications */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Common Applications
              </h3>
              <div className="grid md:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/30 border">
                  <strong>Customer Segmentation:</strong> Group customers by behavior, preferences, or demographics
                </div>
                <div className="p-2 rounded bg-muted/30 border">
                  <strong>Market Research:</strong> Identify distinct market segments
                </div>
                <div className="p-2 rounded bg-muted/30 border">
                  <strong>Anomaly Detection:</strong> Find points far from all centroids
                </div>
                <div className="p-2 rounded bg-muted/30 border">
                  <strong>Image Compression:</strong> Reduce colors by clustering pixels
                </div>
                <div className="p-2 rounded bg-muted/30 border">
                  <strong>Document Clustering:</strong> Group similar documents/articles
                </div>
                <div className="p-2 rounded bg-muted/30 border">
                  <strong>Feature Engineering:</strong> Create cluster membership as new feature
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> K-Means finds clusters even in 
                random data! Always validate that clusters are meaningful and useful for your purpose. 
                The &quot;best&quot; k balances statistical quality (high silhouette) with practical 
                interpretability (can you explain and act on each segment?).
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Binary className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">K-Means Clustering</CardTitle>
                    <CardDescription className="text-base mt-2">Discover natural groups in your data through unsupervised learning</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><GitBranch className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Auto-Segmentation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Groups similar data points automatically</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Sparkles className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Pattern Discovery</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Find hidden structure without labels</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Layers className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Profile Analysis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Understand group characteristics</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use K-Means</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use K-Means when you need to identify natural groupings without predefined labels. Perfect for customer segmentation, market research, and organizing large datasets.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Variables:</strong> 2+ numeric features</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>K value:</strong> Number of clusters</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Sample size:</strong> 30+ per cluster</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Elbow plot:</strong> Find optimal k</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Silhouette:</strong> &gt;0.5 = good</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Centroids:</strong> Group profiles</span></li>
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

interface KMeansPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function KMeansPage({ data, numericHeaders, onLoadExample }: KMeansPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [nClusters, setNClusters] = useState<number>(3);
    const [analysisResult, setAnalysisResult] = useState<FullKMeansResponse | null>(null);
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
        checks.push({ label: 'Valid k value', passed: nClusters >= 2 && nClusters <= data.length / 2, detail: `k = ${nClusters}` });
        const samplesPerCluster = Math.floor(data.length / nClusters);
        checks.push({ label: 'Samples per cluster', passed: samplesPerCluster >= 10, detail: `~${samplesPerCluster} per cluster` });
        return checks;
    }, [data, selectedItems, nClusters]);

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
            const link = document.createElement('a'); link.download = `KMeans_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results.clustered_data) { toast({ title: "No Data" }); return; }
        const csv = Papa.unparse(analysisResult.results.clustered_data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `KMeans_Clustered_${new Date().toISOString().split('T')[0]}.csv`; link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/kmeans-docx', {
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
            link.download = `KMeans_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedItems, nClusters, data.length, toast]);


    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) { toast({ variant: 'destructive', title: 'Select at least 2 variables.' }); return; }
        if (nClusters < 2) { toast({ variant: 'destructive', title: 'k must be at least 2.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/kmeans`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, nClusters: Number(nClusters) })
            });
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') errorMsg = errorResult.detail;
                else if (Array.isArray(errorResult.detail)) errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                else if (errorResult.error) errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                throw new Error(errorMsg);
            }
            const result: FullKMeansResponse = await response.json();
            if ((result as any).error) throw new Error(typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error));
            const cleanData = data.filter(row => selectedItems.every(item => row[item] !== null && row[item] !== undefined && row[item] !== ''));
            const clusteredData = cleanData.map((row, index) => ({ ...row, 'Cluster': `Cluster ${result.results.clustering_summary.labels[index] + 1}` }));
            setAnalysisResult({ ...result, results: { ...result.results, clustered_data: clusteredData } });
            goToStep(4); toast({ title: 'K-Means Complete' });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedItems, nClusters, toast]);

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
            <KMeansGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">K-Means Clustering</h1>
                    <p className="text-muted-foreground mt-1">Discover natural groups in your data</p>
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
                                        {numericHeaders.map(header => (<div key={header} className="flex items-center space-x-2"><Checkbox id={`km-${header}`} checked={selectedItems.includes(header)} onCheckedChange={(checked) => handleItemSelectionChange(header, !!checked)} /><label htmlFor={`km-${header}`} className="text-sm cursor-pointer">{header}</label></div>))}
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Clustering Settings</CardTitle><CardDescription>Set the number of clusters (k)</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Number of Clusters (k){recommendedK && <Badge variant="outline" className="ml-2">Recommended: {recommendedK}</Badge>}</Label>
                                <Input type="number" placeholder="e.g., 3" value={nClusters} onChange={e => setNClusters(parseInt(e.target.value) || 2)} min="2" className="max-w-xs" />
                                <p className="text-xs text-muted-foreground">Start with 3-5 clusters, adjust based on elbow plot</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration Summary</h4><p className="text-sm text-muted-foreground">{selectedItems.length} variables • k = {nClusters} clusters • {data.length} observations</p></div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>K-Means uses K-Means++ initialization and auto-standardizes variables for optimal clustering.</span></p></div>
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
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Binary className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">K-Means will partition data into {nClusters} clusters by minimizing within-cluster variance.</p></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings from K-Means clustering</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Successfully segmented <strong>{totalPoints} data points</strong> into <strong>{results.clustering_summary.n_clusters} distinct groups</strong>.</p>
                                        <p className="text-sm">• Largest segment: <strong>{largest[0]}</strong> with {largest[1].size} members ({largest[1].percentage.toFixed(1)}%).</p>
                                        <p className="text-sm">• Cluster quality: <strong>{(sil * 100).toFixed(0)}%</strong> — {sil >= 0.7 ? 'Excellent' : sil >= 0.5 ? 'Good' : sil >= 0.25 ? 'Moderate' : 'Weak'} separation.</p>
                                        {recommendedK && recommendedK !== nClusters && <p className="text-sm">• 💡 Elbow method suggests trying <strong>k = {recommendedK}</strong> for comparison.</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Well-Defined Clusters Found!" : "Moderate Clustering Quality"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The clusters are distinct and well-separated. You can confidently use these segments." : "Some overlap between clusters. Consider adjusting k or reviewing the elbow plot."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Silhouette: {sil.toFixed(3)} — {sil >= 0.5 ? 'points are well-matched to their clusters' : 'some points may be near cluster boundaries'}</p><p>• Calinski-Harabasz: {results.final_metrics?.calinski_harabasz?.toFixed(0)} — higher indicates better-defined clusters</p><p>• Davies-Bouldin: {results.final_metrics?.davies_bouldin?.toFixed(3)} — {(results.final_metrics?.davies_bouldin || 0) < 1 ? 'good separation' : 'some overlap'}</p></div></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding K-Means results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How K-Means Works</h4><p className="text-sm text-muted-foreground">K-Means partitions {data.length} data points into {nClusters} clusters by minimizing within-cluster variance. It iteratively assigns points to the nearest centroid and updates centroids until convergence.</p></div></div></div>
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Measuring Quality</h4><p className="text-sm text-muted-foreground">Silhouette score ({sil.toFixed(3)}) measures how similar points are to their own cluster vs. other clusters. {isGood ? "≥0.5 means clusters are distinct." : "<0.5 suggests some overlap."} The elbow plot helps find optimal k where adding more clusters yields diminishing returns.</p></div></div></div>
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Interpreting Centroids</h4><p className="text-sm text-muted-foreground">Each cluster is defined by its centroid — the average value of all points in that cluster. High/low centroid values relative to other clusters reveal what makes each segment unique.</p></div></div></div>
                              <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">Use these {results.clustering_summary.n_clusters} segments for targeted marketing, resource allocation, or understanding customer behavior. Name each cluster based on its dominant characteristics for easier communication.</p></div></div></div>
                              <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Segmentation</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Usable with Caveats</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your data naturally forms ${results.clustering_summary.n_clusters} distinct segments. Use these for strategic decisions.` : `Found ${results.clustering_summary.n_clusters} segments with some overlap. Try different k values to find better separation.`}</p></div>
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
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">K-Means Clustering Report</h2><p className="text-sm text-muted-foreground">k = {results.clustering_summary.n_clusters} | {selectedItems.length} variables | {new Date().toLocaleDateString()}</p></div>
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
                                                A K-Means cluster analysis was performed to identify natural groupings within the dataset. 
                                                The analysis included <em>N</em> = {data.length} observations across {selectedItems.length} variables 
                                                ({selectedItems.join(', ')}).
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The {results.clustering_summary.n_clusters}-cluster solution yielded a silhouette coefficient of <span className="font-mono">{results.final_metrics?.silhouette?.toFixed(3)}</span>, 
                                                indicating {(results.final_metrics?.silhouette || 0) >= 0.7 ? 'excellent' : (results.final_metrics?.silhouette || 0) >= 0.5 ? 'good' : (results.final_metrics?.silhouette || 0) >= 0.25 ? 'fair' : 'poor'} cluster separation. 
                                                Additional validation metrics included Calinski-Harabasz index = <span className="font-mono">{results.final_metrics?.calinski_harabasz?.toFixed(2)}</span> and 
                                                Davies-Bouldin index = <span className="font-mono">{results.final_metrics?.davies_bouldin?.toFixed(3)}</span>.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {(() => {
                                                    const sorted = Object.entries(results.profiles).sort((a, b) => b[1].size - a[1].size);
                                                    const largest = sorted[0];
                                                    const smallest = sorted[sorted.length - 1];
                                                    return `Cluster sizes ranged from ${smallest[1].size} (${smallest[1].percentage.toFixed(1)}%) to ${largest[1].size} (${largest[1].percentage.toFixed(1)}%). The largest cluster was ${largest[0]}, comprising ${largest[1].percentage.toFixed(1)}% of the sample.`;
                                                })()}
                                                {recommendedK && recommendedK !== nClusters && ` The elbow method suggested k = ${recommendedK} as an alternative solution for consideration.`}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card><CardHeader><CardTitle>Visual Summary</CardTitle><CardDescription>Elbow plot, Silhouette analysis, and cluster visualization</CardDescription></CardHeader><CardContent><Image src={analysisResult.plot} alt="K-Means Plots" width={1200} height={1000} className="w-full rounded-md border" /></CardContent></Card>
                            <Card><CardHeader><CardTitle>Cluster Profiles (Centroids)</CardTitle><CardDescription>Mean values defining each cluster</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cluster</TableHead><TableHead>Size (%)</TableHead>{selectedItems.map(i => <TableHead key={i} className="text-right">{i}</TableHead>)}</TableRow></TableHeader><TableBody>{Object.entries(results.profiles).map(([name, p]) => <TableRow key={name}><TableCell className="font-semibold">{name}</TableCell><TableCell>{p.size} ({p.percentage.toFixed(1)}%)</TableCell>{selectedItems.map(i => <TableCell key={i} className="text-right font-mono">{p.centroid[i]?.toFixed(3) || '—'}</TableCell>)}</TableRow>)}</TableBody></Table></div></CardContent></Card>
                            <Card><CardHeader><CardTitle>Validation Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Silhouette</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.silhouette?.toFixed(4)}</TableCell><TableCell className="text-muted-foreground">{(results.final_metrics?.silhouette || 0) >= 0.5 ? 'Good separation' : 'Some overlap'}</TableCell></TableRow><TableRow><TableCell>Calinski-Harabasz</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.calinski_harabasz?.toFixed(2)}</TableCell><TableCell className="text-muted-foreground">Higher = better defined</TableCell></TableRow><TableRow><TableCell>Davies-Bouldin</TableCell><TableCell className="text-right font-mono">{results.final_metrics?.davies_bouldin?.toFixed(4)}</TableCell><TableCell className="text-muted-foreground">{(results.final_metrics?.davies_bouldin || 0) < 1 ? 'Good' : 'Some overlap'}</TableCell></TableRow><TableRow><TableCell>Inertia (WCSS)</TableCell><TableCell className="text-right font-mono">{results.clustering_summary.inertia?.toFixed(2)}</TableCell><TableCell className="text-muted-foreground">Within-cluster sum of squares</TableCell></TableRow></TableBody></Table></CardContent></Card>
                            {results.interpretations.cluster_profiles.length > 0 && <Card><CardHeader><CardTitle>Cluster Interpretations</CardTitle><CardDescription>AI-generated descriptions</CardDescription></CardHeader><CardContent><div className="space-y-3">{results.interpretations.cluster_profiles.map((profile, idx) => <div key={idx} className="p-4 bg-muted/30 rounded-lg"><p className="font-semibold text-sm mb-1">Cluster {idx + 1}</p><p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: profile }} /></div>)}</div></CardContent></Card>}
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


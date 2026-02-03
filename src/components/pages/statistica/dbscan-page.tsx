'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ScanSearch, Bot, HelpCircle, Settings, FileSearch, BookOpen, Network, FileType, Sparkles, AlertCircle, Download, Hash, Users, Activity, Info, CheckCircle, BarChart3, Lightbulb, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, FileSpreadsheet, ImageIcon, AlertTriangle, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';



const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/dbscan_clustering.py?alt=media";

// Statistical terms glossary for DBSCAN Clustering
const dbscanTermDefinitions: Record<string, string> = {
    "DBSCAN": "Density-Based Spatial Clustering of Applications with Noise. A clustering algorithm that groups together closely packed points and marks outliers as noise.",
    "Density-Based Clustering": "A clustering approach that defines clusters as areas of high density separated by areas of low density. Unlike K-Means, it can find arbitrarily shaped clusters.",
    "Epsilon (ε)": "The maximum distance between two points for them to be considered neighbors. Also called the 'neighborhood radius'. Smaller ε creates tighter, more numerous clusters.",
    "Min Samples (MinPts)": "The minimum number of points required within ε distance to form a dense region (core point). Higher values create stricter clusters with more noise points.",
    "Core Point": "A point that has at least MinPts neighbors within ε distance. Core points form the foundation of clusters.",
    "Border Point": "A point that is within ε of a core point but doesn't have MinPts neighbors itself. Border points belong to a cluster but don't expand it.",
    "Noise Point": "A point that is neither a core point nor within ε of any core point. Also called outliers. DBSCAN naturally identifies these.",
    "Directly Density-Reachable": "Point A is directly density-reachable from B if A is within ε of B and B is a core point.",
    "Density-Reachable": "Point A is density-reachable from B if there's a chain of core points connecting them, where each consecutive pair is directly density-reachable.",
    "Density-Connected": "Two points are density-connected if there exists a core point from which both are density-reachable. This defines cluster membership.",
    "Cluster": "A maximal set of density-connected points. All points in a cluster are density-reachable from any core point in the cluster.",
    "Noise Percentage": "The proportion of data points classified as noise. High noise (>30%) may indicate inappropriate parameter selection.",
    "Arbitrary Shape": "Unlike K-Means (which assumes spherical clusters), DBSCAN can find clusters of any shape: elongated, curved, or irregular.",
    "No K Required": "A key advantage of DBSCAN — you don't need to specify the number of clusters in advance. The algorithm discovers them automatically.",
    "Euclidean Distance": "The default distance metric in DBSCAN. The straight-line distance between two points in feature space.",
    "Manhattan Distance": "An alternative distance metric (L1 norm). The sum of absolute differences between coordinates. Useful for grid-like data.",
    "K-Distance Plot": "A diagnostic tool to help choose ε. Plot the distance to the k-th nearest neighbor for each point, sorted. The 'elbow' suggests a good ε value.",
    "OPTICS": "Ordering Points To Identify Clustering Structure. An extension of DBSCAN that doesn't require a fixed ε and produces a reachability plot.",
    "HDBSCAN": "Hierarchical DBSCAN. An extension that varies ε to find clusters of varying densities and provides cluster stability scores.",
    "Cluster Stability": "In HDBSCAN, a measure of how persistent a cluster is across different ε values. More stable clusters are more reliable.",
    "Reachability Distance": "In OPTICS, the minimum ε needed for a point to be density-reachable from another. Used to create a reachability plot.",
    "Standardization": "Scaling features before clustering. Important for DBSCAN since ε is a distance threshold — features on different scales affect results.",
    "Curse of Dimensionality": "In high dimensions, distance metrics become less meaningful. DBSCAN may struggle with many features; consider dimensionality reduction.",
    "Spatial Index": "Data structures (like R-trees or KD-trees) that speed up neighbor searches in DBSCAN. Essential for large datasets."
};

interface DbscanResults {
    n_clusters: number; n_noise: number; n_samples: number; eps: number; min_samples: number; labels: number[];
    profiles: { [key: string]: { size: number; percentage: number; centroid: { [key: string]: number }; }; };
    interpretations?: { overall_quality: string; cluster_profiles: string[]; cluster_distribution: string; };
    clustered_data?: DataSet;
}
interface FullAnalysisResponse { results: DbscanResults; plot: string; }

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
        link.download = 'dbscan_clustering.py';
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
                        Python Code - DBSCAN Clustering
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
                        DBSCAN Clustering Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in density-based clustering
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(dbscanTermDefinitions).map(([term, definition]) => (
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
const StatisticalSummaryCards = ({ results }: { results: DbscanResults }) => {
    const noisePercent = (results.n_noise / results.n_samples) * 100;
    const avgSize = Math.floor((results.n_samples - results.n_noise) / Math.max(results.n_clusters, 1));
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Clusters</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_clusters}</p><p className="text-xs text-muted-foreground">Auto-detected</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Noise Points</p><AlertCircle className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold text-amber-600">{results.n_noise}</p><p className="text-xs text-muted-foreground">{noisePercent.toFixed(1)}% of data</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Avg Size</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{avgSize}</p><p className="text-xs text-muted-foreground">Points per cluster</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Quality</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{noisePercent <= 15 ? 'High' : noisePercent <= 30 ? 'Medium' : 'Low'}</p><p className="text-xs text-muted-foreground">{noisePercent <= 5 ? 'Very clean' : noisePercent <= 15 ? 'Clean' : noisePercent <= 30 ? 'Moderate noise' : 'High noise'}</p></div></CardContent></Card>
        </div>
    );
};

// Generate interpretations
const generateDBSCANInterpretations = (results: DbscanResults) => {
    const noisePercent = (results.n_noise / results.n_samples) * 100;
    const profiles: string[] = [];
    
    let overall = '';
    if (results.n_clusters === 0) overall = 'No clusters found. Consider adjusting parameters.';
    else if (results.n_clusters === 1) overall = 'Single cluster detected. Consider decreasing eps.';
    else {
        overall = `${results.n_clusters} distinct clusters identified. `;
        overall += noisePercent < 5 ? 'Very low noise indicates well-defined clusters.' : noisePercent < 20 ? 'Moderate noise with clear boundaries.' : 'Significant noise - consider parameter tuning.';
    }
    
    Object.entries(results.profiles).forEach(([name, p]) => {
        if (name !== 'Noise') {
            let desc = `<strong>${name}</strong>: ${p.size} points (${p.percentage.toFixed(1)}%). `;
            const sorted = Object.entries(p.centroid).sort(([,a], [,b]) => Math.abs(b) - Math.abs(a)).slice(0, 2);
            if (sorted.length > 0) desc += `Key features: ${sorted.map(([k, v]) => `${k} (${v.toFixed(2)})`).join(', ')}.`;
            profiles.push(desc);
        }
    });
    
    let distribution = '';
    if (results.n_clusters > 0) {
        const sizes = Object.values(results.profiles).filter(p => p.size !== results.n_noise).map(p => p.size);
        if (sizes.length > 0) {
            const ratio = Math.max(...sizes) / Math.min(...sizes);
            distribution = ratio > 5 ? 'Highly imbalanced cluster sizes.' : ratio > 2 ? 'Moderately imbalanced.' : 'Balanced cluster sizes.';
        }
    }
    if (results.n_noise > 0) distribution += ` ${results.n_noise} noise points (${noisePercent.toFixed(1)}%).`;
    
    return { overall_quality: overall, cluster_profiles: profiles, cluster_distribution: distribution };
};



const DBSCANGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">DBSCAN Clustering Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is DBSCAN */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <ScanSearch className="w-4 h-4" />
                What is DBSCAN?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                DBSCAN (Density-Based Spatial Clustering of Applications with Noise) is a 
                <strong> density-based clustering algorithm</strong> that groups together closely 
                packed points and marks sparse-region points as outliers (noise).
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Advantages:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • No need to specify number of clusters (auto-discovery)<br/>
                    • Finds clusters of arbitrary shapes (not just spherical)<br/>
                    • Automatically identifies outliers/noise points<br/>
                    • Robust to cluster size variations
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Core Concepts */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Network className="w-4 h-4" />
                Core Concepts
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Core Point</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A point with at least <strong>min_samples</strong> neighbors within <strong>ε</strong> distance.
                    Core points form the foundation of clusters.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Border Point</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A point within ε of a core point but doesn&apos;t have min_samples neighbors itself.
                    Border points belong to a cluster but don&apos;t expand it.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Noise Point (Outlier)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A point that is neither a core point nor within ε of any core point.
                    DBSCAN naturally identifies these as anomalies.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Parameters */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Key Parameters
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Epsilon (ε)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum distance between two points for them to be neighbors (neighborhood radius).
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background border">
                      <strong>Small ε:</strong> More, tighter clusters; more noise
                    </div>
                    <div className="p-2 rounded bg-background border">
                      <strong>Large ε:</strong> Fewer, larger clusters; less noise
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Min Samples (MinPts)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum number of points required within ε distance to form a core point.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background border">
                      <strong>High value:</strong> Stricter clusters; more noise
                    </div>
                    <div className="p-2 rounded bg-background border">
                      <strong>Low value:</strong> More points become cores; less noise
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Parameter Selection Tips</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>ε:</strong> Use k-distance plot (elbow method) to find good ε</li>
                    <li>• <strong>min_samples:</strong> Rule of thumb: 2 × dimensions, minimum 3</li>
                    <li>• Start with defaults and adjust based on noise percentage</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Noise Percentage Guidelines</p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-green-100 dark:bg-green-900/30 text-center">
                      <p className="font-medium text-green-700 dark:text-green-400">&lt;5%</p>
                      <p className="text-muted-foreground">Very clean</p>
                    </div>
                    <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-center">
                      <p className="font-medium text-blue-700 dark:text-blue-400">5-15%</p>
                      <p className="text-muted-foreground">Clean</p>
                    </div>
                    <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 text-center">
                      <p className="font-medium text-amber-700 dark:text-amber-400">15-30%</p>
                      <p className="text-muted-foreground">Moderate</p>
                    </div>
                    <div className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-center">
                      <p className="font-medium text-red-700 dark:text-red-400">&gt;30%</p>
                      <p className="text-muted-foreground">High noise</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Common Issues & Solutions</p>
                  <div className="mt-2 space-y-2 text-xs">
                    <div className="p-2 rounded bg-background border">
                      <strong>No clusters found:</strong> Increase ε or decrease min_samples
                    </div>
                    <div className="p-2 rounded bg-background border">
                      <strong>Only 1 cluster:</strong> Decrease ε for finer granularity
                    </div>
                    <div className="p-2 rounded bg-background border">
                      <strong>Too much noise (&gt;30%):</strong> Increase ε or decrease min_samples
                    </div>
                    <div className="p-2 rounded bg-background border">
                      <strong>Too many clusters:</strong> Increase ε to merge nearby groups
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* DBSCAN vs K-Means */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                DBSCAN vs K-Means
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-2">DBSCAN</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Auto-discovers number of clusters</li>
                    <li>✓ Finds arbitrary shapes</li>
                    <li>✓ Identifies outliers naturally</li>
                    <li>✓ Handles varying cluster sizes</li>
                    <li>✗ Sensitive to ε parameter</li>
                    <li>✗ Struggles with varying densities</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">K-Means</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Fast and scalable</li>
                    <li>✓ Works well with spherical clusters</li>
                    <li>✓ Interpretable centroids</li>
                    <li>✗ Must specify k in advance</li>
                    <li>✗ Only spherical clusters</li>
                    <li>✗ No outlier detection</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-muted/30 border text-xs text-muted-foreground">
                <strong>Choose DBSCAN when:</strong> Unknown cluster count, arbitrary shapes expected, 
                outlier detection needed, or data may have noise.
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
                    <li>• <strong>Standardize features</strong> (ε is distance-based)</li>
                    <li>• Handle missing values first</li>
                    <li>• Consider dimensionality reduction for high-D</li>
                    <li>• Outliers are OK (that&apos;s a feature!)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Parameter Tuning</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with ε = 0.5, min_samples = 5</li>
                    <li>• Use k-distance plot to find ε</li>
                    <li>• min_samples ≥ dimensions + 1</li>
                    <li>• Iterate based on noise percentage</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Noise points may be valuable anomalies</li>
                    <li>• Cluster size variation is normal</li>
                    <li>• Examine cluster profiles (centroids)</li>
                    <li>• Visualize with PCA/t-SNE if high-D</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report ε, min_samples, and n</li>
                    <li>• Include cluster count and noise %</li>
                    <li>• Show cluster size distribution</li>
                    <li>• Visualize results (PCA scatter)</li>
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
                  <li>• <strong>Varying density:</strong> Struggles when clusters have different densities</li>
                  <li>• <strong>High dimensionality:</strong> Distance metrics become less meaningful</li>
                  <li>• <strong>Parameter sensitivity:</strong> Results depend heavily on ε choice</li>
                  <li>• <strong>Memory intensive:</strong> Stores pairwise distances for large datasets</li>
                </ul>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                  <strong>Consider HDBSCAN</strong> if clusters have varying densities — it automatically 
                  adapts ε across the dataset.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> DBSCAN excels at finding 
                arbitrarily-shaped clusters and identifying outliers without requiring you to 
                specify the number of clusters. However, parameter selection (especially ε) is 
                critical. Start with reasonable defaults and adjust based on the noise percentage 
                and cluster quality.
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
                            <ScanSearch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">DBSCAN Clustering</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Density-based clustering that finds arbitrary shapes and outliers
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Network className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Auto-Discovery</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    No need to specify cluster count
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Any Shape</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Finds non-spherical clusters
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <AlertCircle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Outlier Detection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identifies noise automatically
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
                            Use when you don&apos;t know the number of clusters and your data may contain outliers. Excellent for non-spherical clusters.
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
                                        <span><strong>Epsilon (ε):</strong> Neighborhood radius</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min samples:</strong> Core point threshold</span>
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
                                        <span><strong>Clusters:</strong> Auto-detected groupings</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Noise points:</strong> Identified outliers</span>
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

interface DbscanPageProps { 
    data: DataSet; 
    numericHeaders: string[]; 
    onLoadExample: (example: ExampleDataSet) => void; 
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void; 
  }

export default function DbscanPage({ data, numericHeaders, onLoadExample, onGenerateReport }: DbscanPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [eps, setEps] = useState<number>(0.5);
    const [minSamples, setMinSamples] = useState<number>(5);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
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
        checks.push({ label: 'Adequate sample size', passed: data.length >= 50, detail: `n = ${data.length} (recommended: 50+)` });
        checks.push({ label: 'Epsilon valid', passed: eps > 0, detail: `ε = ${eps}` });
        checks.push({ label: 'Min samples valid', passed: minSamples >= 1, detail: `min_samples = ${minSamples}` });
        return checks;
    }, [selectedItems, data, eps, minSamples]);

    const allValidationsPassed = useMemo(() => selectedItems.length >= 2 && eps > 0 && minSamples >= 1, [selectedItems, eps, minSamples]);

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
            link.download = `DBSCAN_${new Date().toISOString().split('T')[0]}.png`;
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
        link.download = `DBSCAN_clustered_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/dbscan-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedItems,
                    eps,
                    minSamples,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `DBSCAN_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedItems, eps, minSamples, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Please select at least 2 variables.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/dbscan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, eps, min_samples: minSamples })
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Analysis failed');
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            const cleanData = data.filter(row => selectedItems.every(item => row[item] != null && row[item] !== ''));
            const dataWithClusters = cleanData.map((row, i) => ({ ...row, Cluster: result.results.labels[i] === -1 ? 'Noise' : `Cluster ${result.results.labels[i] + 1}` }));
            const interpretations = generateDBSCANInterpretations(result.results);
            
            setAnalysisResult({ ...result, results: { ...result.results, interpretations, clustered_data: dataWithClusters } });
            goToStep(4);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, eps, minSamples, toast]);

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
            <DBSCANGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">DBSCAN Clustering</h1>
                    <p className="text-muted-foreground mt-1">Density-based clustering with outlier detection</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>DBSCAN Parameters</CardTitle><CardDescription>Configure epsilon and minimum samples</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="eps">Epsilon (ε)</Label>
                                    <Input id="eps" type="number" value={eps} onChange={e => setEps(parseFloat(e.target.value))} step="0.1" min="0.01" className="h-12" />
                                    <p className="text-xs text-muted-foreground">Maximum distance between two points for neighborhood</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="min_samples">Min Samples</Label>
                                    <Input id="min_samples" type="number" value={minSamples} onChange={e => setMinSamples(parseInt(e.target.value))} min="1" className="h-12" />
                                    <p className="text-xs text-muted-foreground">Minimum points required to form a core point</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Parameter Guide</h4>
                                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div><strong className="text-foreground">Small ε:</strong> More clusters, more noise points</div>
                                    <div><strong className="text-foreground">Large ε:</strong> Fewer clusters, points merge</div>
                                    <div><strong className="text-foreground">High min_samples:</strong> Stricter core points, more noise</div>
                                    <div><strong className="text-foreground">Low min_samples:</strong> More points become cores</div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
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
                                <ScanSearch className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will cluster {data.length} points using {selectedItems.length} features with ε={eps}, min_samples={minSamples}.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run DBSCAN<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const noisePercent = (results.n_noise / results.n_samples) * 100;
                    const isGood = results.n_clusters > 0 && noisePercent <= 30;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>DBSCAN Clustering: {selectedItems.length} variables, ε={eps}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Found <strong>{results.n_clusters}</strong> clusters automatically (no pre-specification needed).
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            <strong>{results.n_noise}</strong> points ({noisePercent.toFixed(1)}%) classified as noise/outliers.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {results.interpretations?.cluster_distribution}
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Clustering Successful!" : "Review Parameters"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{results.interpretations?.overall_quality}</p>
                                        </div>
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Data Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = noisePercent <= 5 ? 5 : noisePercent <= 15 ? 4 : noisePercent <= 30 ? 3 : noisePercent <= 50 ? 2 : 1;
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding DBSCAN clustering</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">How DBSCAN Works</h4>
                                        <p className="text-sm text-muted-foreground">
                                            DBSCAN groups points that are closely packed (within ε distance) and have at least {minSamples} neighbors. 
                                            Points that don&apos;t meet this criteria are marked as noise.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Parameter Effects</h4>
                                        <p className="text-sm text-muted-foreground">
                                            With ε = {eps} and min_samples = {minSamples}: 
                                            {eps < 0.3 ? ' Small ε creates many tight clusters.' : eps > 1 ? ' Large ε merges nearby groups.' : ' Moderate ε for balanced clustering.'}
                                            {minSamples > 10 ? ' High threshold creates stricter clusters.' : ' Lower threshold allows smaller clusters.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Noise Points</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {results.n_noise} points ({((results.n_noise / results.n_samples) * 100).toFixed(1)}%) are classified as noise. 
                                            These are potential outliers or points in sparse regions. They may warrant separate investigation.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">vs K-Means</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Unlike K-Means, DBSCAN doesn&apos;t require specifying the number of clusters, finds arbitrary shapes, 
                                            and identifies outliers. Use K-Means if clusters are spherical and you know the count.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line</h4>
                                <p className="text-sm text-muted-foreground">
                                    DBSCAN found {results.n_clusters} density-based clusters in your data. 
                                    {results.n_clusters === 0 ? ' Try increasing ε or decreasing min_samples.' : 
                                     results.n_clusters === 1 ? ' Consider decreasing ε for finer granularity.' : 
                                     ' The algorithm successfully identified distinct density regions.'}
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
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full clustering results and visualization</p></div>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">DBSCAN Clustering Report</h2><p className="text-sm text-muted-foreground mt-1">ε = {results.eps}, min_samples = {results.min_samples} | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                        
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
                                        DBSCAN clustering was performed on {selectedItems.length} numeric features 
                                        (<em>N</em> = {results.n_samples}) with parameters ε = {results.eps} and min_samples = {results.min_samples}. 
                                        The algorithm identified {results.n_clusters} cluster(s) and classified {results.n_noise} points 
                                        ({((results.n_noise / results.n_samples) * 100).toFixed(1)}%) as noise/outliers.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        <Card>
                            <CardHeader><CardTitle>Cluster Visualization</CardTitle><CardDescription>PCA projection with noise points marked as &apos;x&apos;</CardDescription></CardHeader>
                            <CardContent>
                                <Image src={analysisResult?.plot || ''} alt="DBSCAN Plots" width={1200} height={1000} className="w-3/4 mx-auto rounded-md border"/>
                            </CardContent>
                        </Card>

                        {/* Cluster Profiles Table */}
                        <Card>
                            <CardHeader><CardTitle>Cluster Profiles (Centroids)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cluster</TableHead>
                                                <TableHead>Size (%)</TableHead>
                                                {selectedItems.map(item => <TableHead key={item} className="text-right">{item}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.profiles).filter(([name]) => name !== 'Noise').map(([name, profile]) => (
                                                <TableRow key={name}>
                                                    <TableCell className="font-semibold">{name}</TableCell>
                                                    <TableCell>{profile.size} <span className="text-muted-foreground">({profile.percentage.toFixed(1)}%)</span></TableCell>
                                                    {selectedItems.map(item => <TableCell key={item} className="text-right font-mono">{profile.centroid[item]?.toFixed(2) || '—'}</TableCell>)}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cluster Interpretations */}
                        {results.interpretations?.cluster_profiles && results.interpretations.cluster_profiles.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Cluster Interpretations</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {results.interpretations.cluster_profiles.map((profile, i) => (
                                            <Alert key={i}><Info className="h-4 w-4" /><AlertDescription dangerouslySetInnerHTML={{ __html: profile }} /></Alert>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
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
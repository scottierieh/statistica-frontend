'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanSearch, HelpCircle, Settings, FileSearch, BookOpen, GitBranch, Sparkles, AlertCircle, Download, Hash, Users, TrendingUp, Zap, CheckCircle, CheckCircle2, AlertTriangle, Lightbulb, ChevronRight, ChevronLeft, ArrowRight, Check, FileSpreadsheet, ImageIcon, FileText, FileType, FileCode, ChevronDown, Database, Settings2, Shield, Info, Code, Copy } from 'lucide-react';
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


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/hdbscan_clustering.py?alt=media";

// Statistical terms glossary for HDBSCAN Clustering
const hdbscanTermDefinitions: Record<string, string> = {
    "HDBSCAN": "Hierarchical Density-Based Spatial Clustering of Applications with Noise. An extension of DBSCAN that creates a hierarchy of clusters and automatically selects the optimal flat clustering.",
    "Hierarchical Clustering": "A method that builds a tree-like structure (dendrogram) of clusters at multiple levels of granularity. HDBSCAN extracts the most stable clusters from this hierarchy.",
    "Min Cluster Size": "The smallest number of points that can form a cluster. Points in smaller groups are labeled as noise. This is the main parameter to tune in HDBSCAN.",
    "Min Samples": "Controls how conservative the clustering is. Higher values make clusters more strict. If not set, defaults to min_cluster_size.",
    "Cluster Stability": "A measure of how persistent a cluster is across different density thresholds. More stable clusters are more reliable and are preferred in the final extraction.",
    "Membership Probability": "A score between 0 and 1 indicating how confidently a point belongs to its assigned cluster. Lower probabilities indicate points near cluster boundaries.",
    "Soft Clustering": "HDBSCAN provides soft cluster assignments through probabilities, unlike hard clustering where each point belongs to exactly one cluster.",
    "Noise Points": "Points that don't belong to any cluster. They have a cluster label of -1 and a membership probability of 0.",
    "Core Distance": "For a point, the distance to its min_samples-th nearest neighbor. Used to measure local density.",
    "Mutual Reachability Distance": "The maximum of: core distance of point A, core distance of point B, and actual distance between A and B. Used to build the minimum spanning tree.",
    "Minimum Spanning Tree (MST)": "A tree connecting all points with minimum total edge weight. HDBSCAN uses mutual reachability distance as edge weights.",
    "Cluster Hierarchy": "The tree structure (dendrogram) built from the MST by removing edges in order of weight. Shows how clusters split and merge at different scales.",
    "Condensed Tree": "A simplified version of the cluster hierarchy that only keeps clusters larger than min_cluster_size. Used for final cluster extraction.",
    "Excess of Mass": "The metric used to measure cluster stability. Calculated as the total 'lambda' (inverse distance) accumulated by a cluster.",
    "Lambda (λ)": "The inverse of the distance threshold at a given level in the hierarchy. Higher lambda means higher density.",
    "Flat Clustering": "The final non-hierarchical cluster assignments extracted from the condensed tree based on stability.",
    "DBSCAN": "The simpler predecessor algorithm. HDBSCAN can be seen as DBSCAN over all epsilon values simultaneously.",
    "Epsilon (ε)": "In DBSCAN, the fixed neighborhood radius. HDBSCAN eliminates the need to choose this parameter by considering all epsilon values.",
    "Varying Densities": "A key advantage of HDBSCAN — it can find clusters of different densities, unlike DBSCAN which struggles when clusters have varying densities.",
    "Outlier Score": "Some HDBSCAN implementations provide an outlier score indicating how much of an outlier each point is, based on local density.",
    "Cluster Persistence": "How long a cluster survives in the hierarchy as density threshold changes. More persistent = more stable = more reliable.",
    "Leaf Clusters": "Clusters at the bottom of the hierarchy with no child clusters. Can be selected using the 'leaf' cluster selection method.",
    "EOM (Excess of Mass)": "The default cluster selection method. Selects clusters that maximize the total stability across all selected clusters.",
    "Leaf Selection": "Alternative cluster selection method that picks all leaf clusters regardless of stability. Gives more, smaller clusters."
};

interface HdbscanResults {
    n_clusters: number; n_noise: number; n_samples: number; min_cluster_size: number; min_samples: number | null;
    labels: number[]; probabilities: number[];
    profiles: { [key: string]: { size: number; percentage: number; centroid: { [key: string]: number }; } };
    interpretations?: { overall_quality: string; cluster_profiles: string[]; cluster_distribution: string; };
    clustered_data?: DataSet;
}

interface FullAnalysisResponse { results: HdbscanResults; plot: string; }

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
        link.download = 'hdbscan_clustering.py';
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
                        Python Code - HDBSCAN Clustering
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
                        HDBSCAN Clustering Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in hierarchical density-based clustering
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(hdbscanTermDefinitions).map(([term, definition]) => (
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

const generateInterpretations = (results: HdbscanResults, selectedItems: string[]) => {
    const noisePercent = (results.n_noise / results.n_samples) * 100;
    const avgProb = results.probabilities?.length > 0 ? results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
    const profiles: string[] = [];
    let overall = results.n_clusters === 0 ? 'No stable clusters found. All points are noise.' : results.n_clusters === 1 ? 'Single cluster detected.' : `${results.n_clusters} hierarchical clusters. ${avgProb > 0.8 ? 'High confidence.' : avgProb > 0.6 ? 'Moderate confidence.' : 'Low confidence.'}`;
    Object.entries(results.profiles).forEach(([name, p]) => {
        if (name !== 'Noise') {
            const top = Object.entries(p.centroid).sort(([,a], [,b]) => Math.abs(b as number) - Math.abs(a as number)).slice(0, 2);
            profiles.push(`<strong>${name}</strong>: ${p.size} points (${p.percentage.toFixed(1)}%). Key: ${top.map(([k, v]) => `${k} (${(v as number).toFixed(2)})`).join(', ')}.`);
        }
    });
    let distribution = results.n_clusters > 0 ? `Avg confidence: ${(avgProb * 100).toFixed(0)}%. ` : '';
    if (results.n_noise > 0) distribution += `${results.n_noise} noise points (${noisePercent.toFixed(1)}%).`;
    return { overall_quality: overall, cluster_profiles: profiles, cluster_distribution: distribution };
};

const StatisticalSummaryCards = ({ results }: { results: HdbscanResults }) => {
    const noisePercent = (results.n_noise / results.n_samples) * 100;
    const avgProb = results.probabilities?.length > 0 ? results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
    const getNoiseQuality = (p: number) => p <= 5 ? 'Very clean' : p <= 15 ? 'Clean' : p <= 30 ? 'Moderate' : 'High noise';
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Clusters</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_clusters}</p><p className="text-xs text-muted-foreground">Hierarchical groups</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Noise Points</p><AlertCircle className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_noise}</p><p className="text-xs text-muted-foreground">{noisePercent.toFixed(1)}% of data</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Avg. Confidence</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(avgProb * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">Membership probability</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Data Quality</p><Zap className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{100 - noisePercent < 70 ? 'Low' : 100 - noisePercent < 85 ? 'Medium' : 'High'}</p><p className="text-xs text-muted-foreground">{getNoiseQuality(noisePercent)}</p></div></CardContent></Card>
        </div>
    );
};

// HDBSCAN Analysis Guide Component
const HDBSCANGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">HDBSCAN Clustering Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is HDBSCAN */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <ScanSearch className="w-4 h-4" />
                What is HDBSCAN?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                HDBSCAN (Hierarchical DBSCAN) is an advanced density-based clustering algorithm 
                that extends DBSCAN by building a <strong>cluster hierarchy</strong> and automatically 
                selecting the most stable clusters. It handles <strong>varying density</strong> clusters 
                without needing an epsilon parameter.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Advantages over DBSCAN:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • No epsilon (ε) parameter needed — adapts automatically<br/>
                    • Finds clusters of varying densities<br/>
                    • Provides membership probabilities (soft clustering)<br/>
                    • More stable results across different runs<br/>
                    • Identifies the most persistent clusters
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* How it Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                How HDBSCAN Works
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">1. Build Mutual Reachability Graph</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compute distances between points that account for local density.
                    Points in dense regions have shorter effective distances.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Create Minimum Spanning Tree</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect all points with minimum total edge weight using mutual reachability distances.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Build Cluster Hierarchy</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove edges in order of weight to create a dendrogram showing how clusters 
                    form at different density levels.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">4. Condense &amp; Extract Clusters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep only clusters larger than min_cluster_size. Select the most stable 
                    clusters using the Excess of Mass (EOM) method.
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
                  <p className="font-medium text-sm text-primary">Min Cluster Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The smallest number of points that can form a cluster. 
                    <strong> This is the main parameter to tune.</strong>
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background border">
                      <strong>Smaller value:</strong> More, smaller clusters
                    </div>
                    <div className="p-2 rounded bg-background border">
                      <strong>Larger value:</strong> Fewer, larger clusters
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Rule of thumb:</strong> Start with 5-15 for small datasets, 
                    or 1-2% of data size for larger ones.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Min Samples (Optional)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls how conservative the clustering is. Higher = stricter core point requirements.
                    If not set, defaults to min_cluster_size.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Leave as &quot;auto&quot;</strong> unless you want finer control over noise sensitivity.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Membership Probabilities */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Membership Probabilities
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  Unlike hard clustering (K-Means, DBSCAN), HDBSCAN provides a 
                  <strong> probability score (0-1)</strong> for each point indicating 
                  how confidently it belongs to its assigned cluster.
                </p>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div className="p-1 rounded bg-green-100 dark:bg-green-900/30 text-center">
                    <p className="font-medium text-green-700 dark:text-green-400">≥0.80</p>
                    <p className="text-muted-foreground">Core member</p>
                  </div>
                  <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-center">
                    <p className="font-medium text-blue-700 dark:text-blue-400">0.60-0.79</p>
                    <p className="text-muted-foreground">Good fit</p>
                  </div>
                  <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 text-center">
                    <p className="font-medium text-amber-700 dark:text-amber-400">0.40-0.59</p>
                    <p className="text-muted-foreground">Borderline</p>
                  </div>
                  <div className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-center">
                    <p className="font-medium text-red-700 dark:text-red-400">&lt;0.40</p>
                    <p className="text-muted-foreground">Weak fit</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Noise points</strong> have probability = 0 and cluster label = -1.
                </p>
              </div>
            </div>

            <Separator />

            {/* HDBSCAN vs DBSCAN */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                HDBSCAN vs DBSCAN
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-2">HDBSCAN</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ No epsilon parameter needed</li>
                    <li>✓ Handles varying density clusters</li>
                    <li>✓ Provides membership probabilities</li>
                    <li>✓ Selects most stable clusters</li>
                    <li>✓ More robust results</li>
                    <li>✗ Slower for very large datasets</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">DBSCAN</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Faster computation</li>
                    <li>✓ Simpler to understand</li>
                    <li>✗ Requires epsilon tuning</li>
                    <li>✗ Struggles with varying densities</li>
                    <li>✗ Hard cluster assignments only</li>
                    <li>✗ Sensitive to parameter choice</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-muted/30 border text-xs text-muted-foreground">
                <strong>Choose HDBSCAN when:</strong> Clusters have different densities, 
                you want membership confidence, or DBSCAN&apos;s epsilon is hard to tune.
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
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
                  <p className="font-medium text-sm">Using Low-Probability Points</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Points with low probability are &quot;transitional&quot; — between clusters</li>
                    <li>• May represent emerging segments or edge cases</li>
                    <li>• Consider analyzing separately or flagging for review</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Using Noise Points</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Noise points don&apos;t fit any dense region</li>
                    <li>• Could be anomalies, outliers, or unique cases</li>
                    <li>• Investigate for fraud detection, error checking, or special segments</li>
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
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Standardize features (different scales affect distances)</li>
                    <li>• Handle missing values first</li>
                    <li>• Consider dimensionality reduction for 10+ features</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Parameter Tuning</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with min_cluster_size = 5-15</li>
                    <li>• Increase if too many small clusters</li>
                    <li>• Leave min_samples as &quot;auto&quot; initially</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Review cluster profiles (centroids)</li>
                    <li>• Examine low-probability points</li>
                    <li>• Investigate noise points for anomalies</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report min_cluster_size and n</li>
                    <li>• Include noise % and avg. probability</li>
                    <li>• Show cluster sizes and profiles</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> HDBSCAN automatically 
                adapts to different density levels and provides membership probabilities, 
                making it more flexible than DBSCAN. Focus on min_cluster_size as the main 
                tuning parameter. Low-probability points and noise are valuable signals, 
                not just garbage — they often represent edge cases worth investigating.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><ScanSearch className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">HDBSCAN Clustering</CardTitle>
                    <CardDescription className="text-base mt-2">Hierarchical density-based clustering with automatic parameter selection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><GitBranch className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Hierarchical</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Multi-scale cluster detection</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Sparkles className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Adaptive</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">No epsilon needed</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Zap className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Probabilities</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Membership confidence</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use HDBSCAN</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use HDBSCAN for advanced density-based clustering. Superior to DBSCAN for varying densities. No distance threshold required.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Variables:</strong> 2+ numeric</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Min size:</strong> Smallest cluster</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Probabilities:</strong> Confidence scores</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Noise:</strong> Auto-detected</span></li>
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

interface HdbscanPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function HdbscanPage({ data, numericHeaders, onLoadExample }: HdbscanPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [minClusterSize, setMinClusterSize] = useState<number>(5);
    const [minSamples, setMinSamples] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
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
        checks.push({ label: 'Minimum variables', passed: selectedItems.length >= 2, detail: `${selectedItems.length} selected` });
        checks.push({ label: 'Sample size', passed: data.length >= 20, detail: `n = ${data.length}` });
        checks.push({ label: 'Min cluster size valid', passed: minClusterSize >= 2 && minClusterSize <= data.length / 2, detail: `min_cluster_size = ${minClusterSize}` });
        return checks;
    }, [data, selectedItems, minClusterSize]);

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
            const link = document.createElement('a'); link.download = `HDBSCAN_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results.clustered_data) { toast({ title: "No Data" }); return; }
        const csv = Papa.unparse(analysisResult.results.clustered_data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `HDBSCAN_Clustered_${new Date().toISOString().split('T')[0]}.csv`; link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/hdbscan-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedItems,
                    sampleSize: data.length,
                    plot: analysisResult.plot
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `HDBSCAN_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedItems, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) { toast({ variant: 'destructive', title: 'Select at least 2 variables.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/hdbscan`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, min_cluster_size: minClusterSize, min_samples: minSamples })
            });
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') errorMsg = errorResult.detail;
                else if (Array.isArray(errorResult.detail)) errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                else if (errorResult.error) errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                throw new Error(errorMsg);
            }
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error(typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error));
            const cleanData = data.filter(row => selectedItems.every(item => row[item] !== null && row[item] !== undefined && row[item] !== ''));
            const clusteredData = cleanData.map((row, index) => ({ ...row, 'Cluster': result.results.labels[index] === -1 ? 'Noise' : `Cluster ${result.results.labels[index] + 1}`, 'Probability': result.results.probabilities[index].toFixed(3) }));
            const interpretations = generateInterpretations(result.results, selectedItems);
            setAnalysisResult({ ...result, results: { ...result.results, interpretations, clustered_data: clusteredData } });
            goToStep(4); toast({ title: 'HDBSCAN Complete' });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedItems, minClusterSize, minSamples, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult?.results;

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
            <HDBSCANGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">HDBSCAN Clustering</h1>
                    <p className="text-muted-foreground mt-1">Hierarchical density-based clustering</p>
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
                                        {numericHeaders.map(header => (<div key={header} className="flex items-center space-x-2"><Checkbox id={`hdb-${header}`} checked={selectedItems.includes(header)} onCheckedChange={(checked) => handleItemSelectionChange(header, !!checked)} /><label htmlFor={`hdb-${header}`} className="text-sm cursor-pointer">{header}</label></div>))}
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>HDBSCAN Settings</CardTitle><CardDescription>Configure clustering parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Min Cluster Size</Label><Input type="number" value={minClusterSize} onChange={e => setMinClusterSize(parseInt(e.target.value) || 5)} min="2" /><p className="text-xs text-muted-foreground">Smallest grouping to be considered a cluster</p></div>
                                <div className="space-y-2"><Label>Min Samples (Optional)</Label><Input type="number" placeholder="Auto" value={minSamples ?? ''} onChange={e => setMinSamples(e.target.value ? parseInt(e.target.value) : null)} min="1" /><p className="text-xs text-muted-foreground">Controls how conservative clustering is</p></div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration Summary</h4><p className="text-sm text-muted-foreground">{selectedItems.length} variables • min_cluster_size = {minClusterSize} • min_samples = {minSamples || 'auto'}</p></div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Unlike DBSCAN, HDBSCAN automatically adapts to varying densities without epsilon.</span></p></div>
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
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><ScanSearch className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">HDBSCAN builds a hierarchy of clusters at multiple scales with membership probabilities.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}
                {currentStep === 4 && results && (() => {
                    const noisePercent = (results.n_noise / results.n_samples) * 100;
                    const avgProb = results.probabilities?.length > 0 ? results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
                    const isGood = avgProb >= 0.6 && noisePercent <= 20;
                    const largest = Object.entries(results.profiles).filter(([n]) => n !== 'Noise').sort((a, b) => b[1].size - a[1].size)[0];
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings from HDBSCAN</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Discovered <strong>{results.n_clusters} hierarchical clusters</strong> from {results.n_samples} data points.</p>
                                        {largest && <p className="text-sm">• Largest cluster: <strong>{largest[0]}</strong> with {largest[1].size} members ({largest[1].percentage.toFixed(1)}%).</p>}
                                        <p className="text-sm">• Average membership confidence: <strong>{(avgProb * 100).toFixed(0)}%</strong> — {avgProb >= 0.8 ? 'High certainty' : avgProb >= 0.6 ? 'Good certainty' : 'Some uncertainty'}.</p>
                                        <p className="text-sm">• Noise/outliers: <strong>{results.n_noise} points</strong> ({noisePercent.toFixed(1)}%) — {noisePercent <= 10 ? 'Very clean data' : noisePercent <= 20 ? 'Clean data' : 'Significant noise'}.</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Hierarchical Structure!" : "Results Need Review"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "High confidence clusters with clear density patterns. Use these segments confidently." : "Consider adjusting min_cluster_size or reviewing noise points for additional patterns."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Membership Probability: {(avgProb * 100).toFixed(0)}% average — how confident each point belongs to its cluster</p><p>• Noise Detection: {results.n_noise} outliers auto-identified — points not fitting any dense region</p><p>• Cluster Distribution: {results.interpretations?.cluster_distribution}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (avgProb >= 0.8 && noisePercent <= 10 ? 5 : avgProb >= 0.6 && noisePercent <= 20 ? 4 : avgProb >= 0.5 ? 3 : 2) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}
                {currentStep === 5 && results && (() => {
                    const noisePercent = (results.n_noise / results.n_samples) * 100;
                    const avgProb = results.probabilities?.length > 0 ? results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
                    const isGood = avgProb >= 0.6 && noisePercent <= 20;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding HDBSCAN results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">How HDBSCAN Works</h4><p className="text-sm text-muted-foreground">HDBSCAN builds a hierarchy of clusters by varying the density threshold. Unlike DBSCAN, it doesn&apos;t need an epsilon parameter — it finds clusters at multiple scales and selects the most stable ones automatically.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Membership Probabilities</h4><p className="text-sm text-muted-foreground">Each point gets a probability score ({(avgProb * 100).toFixed(0)}% average) indicating how confidently it belongs to its cluster. {avgProb >= 0.7 ? "High probabilities mean clear cluster boundaries." : "Lower probabilities indicate points near cluster edges."}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Noise Detection</h4><p className="text-sm text-muted-foreground">{results.n_noise} points ({noisePercent.toFixed(1)}%) were classified as noise — outliers that don&apos;t belong to any dense region. {noisePercent <= 15 ? "Low noise indicates well-structured data." : "High noise may indicate scattered data or need for parameter tuning."}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Practical Use</h4><p className="text-sm text-muted-foreground">Use these {results.n_clusters} clusters for segmentation. Low-probability points may be transitional customers. Noise points could be anomalies worth investigating separately.</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Clustering</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Usable with Review</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Clear hierarchical structure with ${results.n_clusters} stable clusters.` : `Found ${results.n_clusters} clusters but with uncertainty. Review noise points and consider parameter adjustments.`}</p></div>
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
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV (with Probabilities)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">HDBSCAN Clustering Report</h2><p className="text-sm text-muted-foreground">{results.n_clusters} Clusters | {results.n_noise} Noise | min_cluster_size={results.min_cluster_size} | {new Date().toLocaleDateString()}</p></div>
                            <StatisticalSummaryCards results={results} />
                            <Card><CardHeader><CardTitle>Visual Summary</CardTitle><CardDescription>Cluster visualization with membership probabilities</CardDescription></CardHeader><CardContent><Image src={analysisResult.plot} alt="HDBSCAN Plots" width={1200} height={1000} className="w-full rounded-md border" /></CardContent></Card>
                            <Card><CardHeader><CardTitle>Cluster Profiles (Centroids)</CardTitle><CardDescription>Mean values for each cluster (excluding noise)</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cluster</TableHead><TableHead>Size (%)</TableHead>{selectedItems.map(i => <TableHead key={i} className="text-right">{i}</TableHead>)}</TableRow></TableHeader><TableBody>{Object.entries(results.profiles).filter(([n]) => n !== 'Noise').map(([name, p]) => <TableRow key={name}><TableCell className="font-semibold">{name}</TableCell><TableCell>{p.size} ({p.percentage.toFixed(1)}%)</TableCell>{selectedItems.map(i => <TableCell key={i} className="text-right font-mono">{p.centroid[i]?.toFixed(3) || '—'}</TableCell>)}</TableRow>)}</TableBody></Table></div><p className="text-xs text-muted-foreground mt-4">Noise points ({results.n_noise}) are not included in profiles.</p></CardContent></Card>
                            <Card><CardHeader><CardTitle>Algorithm Parameters</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Description</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>min_cluster_size</TableCell><TableCell className="text-right font-mono">{results.min_cluster_size}</TableCell><TableCell className="text-muted-foreground">Minimum cluster members</TableCell></TableRow><TableRow><TableCell>min_samples</TableCell><TableCell className="text-right font-mono">{results.min_samples || 'auto'}</TableCell><TableCell className="text-muted-foreground">Conservativeness parameter</TableCell></TableRow><TableRow><TableCell>Total Samples</TableCell><TableCell className="text-right font-mono">{results.n_samples}</TableCell><TableCell className="text-muted-foreground">Data points analyzed</TableCell></TableRow><TableRow><TableCell>Variables Used</TableCell><TableCell className="text-right font-mono">{selectedItems.length}</TableCell><TableCell className="text-muted-foreground">Features for clustering</TableCell></TableRow></TableBody></Table></CardContent></Card>
                            {results.interpretations?.cluster_profiles && results.interpretations.cluster_profiles.length > 0 && <Card><CardHeader><CardTitle>Cluster Interpretations</CardTitle></CardHeader><CardContent><div className="space-y-3">{results.interpretations.cluster_profiles.map((profile, idx) => <div key={idx} className="p-4 bg-muted/30 rounded-lg text-sm" dangerouslySetInnerHTML={{ __html: profile }} />)}</div></CardContent></Card>}
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
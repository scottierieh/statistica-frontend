'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Binary, Bot, Users, Settings, FileSearch, MoveRight, HelpCircle, BookOpen, Shield, Sparkles, Layers, Download, TrendingUp, BarChart3, Target, Hash, CheckCircle, Info, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Papa from 'papaparse';

interface KMedoidsResults {
    clustering_summary: {
        n_clusters: number;
        inertia: number;
        medoids: { [key: string]: number }[];
        labels: number[];
    };
    profiles: {
        [key: string]: {
            size: number;
            percentage: number;
            centroid: { [key: string]: number };
        }
    };
    final_metrics?: {
        silhouette: number;
        davies_bouldin: number;
        calinski_harabasz: number;
    };
    interpretations: {
        overall_quality: string;
        cluster_profiles: string[];
        cluster_distribution: string;
    };
    clustered_data?: DataSet;
}

interface FullKMedoidsResponse {
    results: KMedoidsResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: KMedoidsResults }) => {
    const silhouette = results.final_metrics?.silhouette || 0;
    const calinski = results.final_metrics?.calinski_harabasz || 0;
    const daviesBouldin = results.final_metrics?.davies_bouldin || 0;
    const nClusters = results.clustering_summary.n_clusters;
    
    const getSilhouetteInterpretation = (score: number) => {
        if (score >= 0.7) return 'Excellent';
        if (score >= 0.5) return 'Good';
        if (score >= 0.25) return 'Fair';
        return 'Poor';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Clusters Count Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Clusters (k)
                            </p>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {nClusters}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Medoid-based groups
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Silhouette Score Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Silhouette Score
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {silhouette.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getSilhouetteInterpretation(silhouette)} separation
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Calinski-Harabasz Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Calinski-Harabasz
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {calinski.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Higher is better
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Davies-Bouldin Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Davies-Bouldin
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {daviesBouldin.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Lower is better
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const KMedoidsOverview = ({ selectedItems, nClusters, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedItems.length === 0) {
            overview.push('Select at least 2 variables for clustering');
        } else if (selectedItems.length < 2) {
            overview.push(`⚠ Only ${selectedItems.length} variable selected (minimum 2 required)`);
        } else {
            overview.push(`Clustering on ${selectedItems.length} variables: ${selectedItems.slice(0,3).join(', ')}${selectedItems.length > 3 ? '...' : ''}`);
        }

        // Cluster count
        if (nClusters < 2) {
            overview.push('⚠ Number of clusters must be at least 2');
        } else {
            overview.push(`Creating ${nClusters} clusters with medoids`);
        }

        // Sample size considerations
        const samplesPerCluster = Math.floor(data.length / nClusters);
        if (samplesPerCluster < 10) {
            overview.push(`⚠ Only ${samplesPerCluster} samples per cluster on average (very small)`);
        } else if (samplesPerCluster < 30) {
            overview.push(`${samplesPerCluster} samples per cluster on average (adequate)`);
        } else {
            overview.push(`${samplesPerCluster} samples per cluster on average (good)`);
        }

        // Method info
        overview.push('Algorithm: PAM (Partitioning Around Medoids)');
        overview.push('More robust to outliers than K-Means');
        overview.push('Medoids are actual data points from dataset');
        overview.push('Minimizes sum of dissimilarities within clusters');
        overview.push('Best for: Noisy data or when interpretability matters');

        return overview;
    }, [selectedItems, nClusters, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
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

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const kmedoidsExample = exampleDatasets.find(d => d.id === 'customer-segments');
    
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
                                    More robust than K-Means against noise
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
                            When to Use K-Medoids
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use K-Medoids when your data contains outliers or noise that could skew K-Means results. 
                            It&apos;s ideal when you need cluster centers to be actual data points for interpretability, 
                            or when working with non-Euclidean distance metrics. Perfect for customer segmentation, 
                            document clustering, and any scenario where robustness matters more than speed.
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
                                        <span><strong>Variables:</strong> 2+ numeric features</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>K value:</strong> Number of medoids</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> Works with smaller datasets</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Robustness:</strong> Handles outliers well</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Medoids:</strong> Actual data exemplars</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Silhouette:</strong> Cluster quality score</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Profiles:</strong> Group characteristics</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Export:</strong> Download labeled data</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {kmedoidsExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(kmedoidsExample)} size="lg">
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

interface KMedoidsPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function KMedoidsPage({ data, numericHeaders, onLoadExample }: KMedoidsPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [nClusters, setNClusters] = useState<number>(3);
    const [analysisResult, setAnalysisResult] = useState<FullKMedoidsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two variables for clustering.' });
            return;
        }
        if (nClusters < 2) {
            toast({ variant: 'destructive', title: 'Parameter Error', description: 'Number of clusters must be at least 2.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/k-medoids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    items: selectedItems,
                    nClusters: Number(nClusters)
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Add cluster labels to data for export
            const cleanData = data.filter(row => selectedItems.every(item => row[item] !== null && row[item] !== undefined && row[item] !== ''));
            const dataWithClusters = cleanData.map((row, index) => ({
                ...row,
                'Cluster': `Cluster ${result.results.clustering_summary.labels[index] + 1}`
            }));
            
            setAnalysisResult({ ...result, results: { ...result.results, clustered_data: dataWithClusters } });

        } catch (e: any) {
            console.error('K-Medoids error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nClusters, toast]);
    
    const handleDownloadClusteredData = useCallback(() => {
        if (!analysisResult?.results.clustered_data) {
            toast({ title: "No Data to Download", description: "Clustered data is not available." });
            return;
        }
        
        const csv = Papa.unparse(analysisResult.results.clustered_data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'kmedoids_clustered_data.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Clustered data with medoid assignments is being downloaded." });
    }, [analysisResult, toast]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">K-Medoids Clustering Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and specify the number of clusters (k) for PAM algorithm.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables for Clustering</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`kmedoids-${header}`}
                                  checked={selectedItems.includes(header)}
                                  onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`kmedoids-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <Label htmlFor="nClusters">Number of Clusters (k)</Label>
                            <Input 
                                id="nClusters"
                                type="number"
                                placeholder={'e.g., 3'}
                                value={nClusters}
                                onChange={e => setNClusters(parseInt(e.target.value))}
                                min="2"
                            />
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <KMedoidsOverview 
                        selectedItems={selectedItems}
                        nClusters={nClusters}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <Button variant="outline" onClick={handleDownloadClusteredData}>
                                <Download className="mr-2 h-4 w-4" />
                                Export Clustered Data
                            </Button>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedItems.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running K-Medoids (PAM) Analysis...</p>
                        <Skeleton className="h-[600px] w-full"/>
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                 <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Detailed Analysis - 그래프 위에 배치 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Binary className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Summary - Primary Color */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <Binary className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Summary</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: `<strong>K-Medoids clustering completed with k=${results.clustering_summary.n_clusters} clusters using PAM algorithm.</strong> ${results.interpretations.overall_quality.replace(/\\n/g, ' ')}` }}
                                />
                            </div>

                            {/* Statistical Insights - Blue Color */}
                            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-blue-500/10 rounded-md">
                                        <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Statistical Insights</h3>
                                </div>
                                <div className="space-y-3">
                                    {(() => {
                                        const insights = [];
                                        const silhouette = results.final_metrics?.silhouette || 0;
                                        const calinski = results.final_metrics?.calinski_harabasz || 0;
                                        const daviesBouldin = results.final_metrics?.davies_bouldin || 0;
                                        
                                        // Silhouette interpretation
                                        const silhouetteQuality = silhouette >= 0.7 ? 'excellent' : silhouette >= 0.5 ? 'good' : silhouette >= 0.25 ? 'fair' : 'poor';
                                        insights.push(`<strong>Silhouette Score (${silhouette.toFixed(3)}):</strong> Indicates ${silhouetteQuality} cluster separation. ${silhouette >= 0.5 ? 'Clusters are well-defined and distinct.' : 'Consider adjusting k or checking for overlapping clusters.'}`);
                                        
                                        // Calinski-Harabasz
                                        insights.push(`<strong>Calinski-Harabasz Index (${calinski.toFixed(0)}):</strong> Measures between-cluster vs within-cluster variance. Higher values indicate denser, better-separated clusters.`);
                                        
                                        // Davies-Bouldin
                                        insights.push(`<strong>Davies-Bouldin Index (${daviesBouldin.toFixed(3)}):</strong> ${daviesBouldin < 1 ? 'Good separation - clusters are compact and well-separated.' : 'Moderate overlap between some clusters.'}`);
                                        
                                        // Medoids advantage
                                        insights.push(`<strong>Medoids Advantage:</strong> Unlike K-Means centroids, medoids are actual data points from your dataset, making cluster centers directly interpretable and robust to outliers.`);
                                        
                                        // Cluster distribution
                                        insights.push(`<strong>Cluster Distribution:</strong> ${results.interpretations.cluster_distribution}`);
                                        
                                        return insights.map((insight, idx) => (
                                            <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </div>
                                        ));
                                    })()}
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
                                <div className="space-y-3">
                                    {(() => {
                                        const recs = [];
                                        const silhouette = results.final_metrics?.silhouette || 0;
                                        
                                        // Silhouette-based recommendations
                                        if (silhouette < 0.25) {
                                            recs.push('Low silhouette score suggests trying different k values or checking for natural cluster structure in your data.');
                                        } else if (silhouette >= 0.5) {
                                            recs.push('Good silhouette score - the current clustering provides meaningful segmentation.');
                                        }
                                        
                                        // Medoid-specific recommendations
                                        recs.push('Examine the medoid data points in the table below - they represent the most "typical" member of each cluster.');
                                        recs.push('Compare K-Medoids results with K-Means if you have outliers - K-Medoids should be more stable.');
                                        
                                        // General recommendations
                                        recs.push('Use the "Export Clustered Data" feature to analyze cluster assignments in detail.');
                                        recs.push('Consider domain knowledge when interpreting clusters - medoids can serve as concrete examples for each group.');
                                        recs.push('For customer segmentation, each medoid represents a "prototype" customer for that segment.');
                                        
                                        return recs.map((rec, idx) => (
                                            <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                <span>{rec}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analysis Visualizations */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Visualizations</CardTitle>
                            <CardDescription>
                                Comprehensive overview of the K-Medoids clustering results. Medoids (cluster centers) are marked with an &apos;X&apos;.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Comprehensive K-Medoids Plots" width={1500} height={600} className="w-3/4 mx-auto rounded-md border"/>
                        </CardContent>
                    </Card>

                    {/* Cluster Medoids and Profiles */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Medoids (Exemplars)</CardTitle>
                                <CardDescription>The actual data points serving as the center of each cluster.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cluster</TableHead>
                                            {selectedItems.map(item => <TableHead key={item} className="text-right">{item}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.clustering_summary.medoids.map((medoid, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-semibold">Cluster {index + 1}</TableCell>
                                                {selectedItems.map(item => (
                                                    <TableCell key={item} className="text-right font-mono">
                                                        {medoid[item]?.toFixed(2)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Profiles</CardTitle>
                                <CardDescription>Size and distribution of each cluster.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cluster</TableHead>
                                            <TableHead className="text-right">Size</TableHead>
                                            <TableHead className="text-right">Percentage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.profiles).map(([clusterName, profile]) => (
                                            <TableRow key={clusterName}>
                                                <TableCell className="font-semibold">{clusterName}</TableCell>
                                                <TableCell className="text-right">{profile.size}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary">{profile.percentage.toFixed(1)}%</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cluster Interpretations */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Cluster Interpretations</CardTitle>
                            <CardDescription>AI-generated descriptions of each cluster based on their medoid profiles.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {results.interpretations.cluster_profiles.map((profile, index) => (
                                    <Alert key={index} variant="default">
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Cluster {index + 1}</AlertTitle>
                                        <AlertDescription dangerouslySetInnerHTML={{ __html: profile }} />
                                    </Alert>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Binary className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and set &apos;k&apos; to run K-Medoids analysis.</p>
                </div>
            )}
        </div>
    );
}


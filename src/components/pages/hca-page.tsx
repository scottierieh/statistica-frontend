'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, Bot, HelpCircle, MoveRight, Settings, FileSearch, BookOpen, Network, Sparkles, BarChart, Download, Hash, Users, TrendingUp, Activity, Info, CheckCircle, BarChart3, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface HcaResults {
    n_clusters: number;
    profiles: {
        [key: string]: {
            size: number;
            percentage: number;
            centroid: { [key: string]: number };
            std: { [key: string]: number };
        }
    };
    final_metrics?: {
        silhouette: number;
        calinski_harabasz: number;
        davies_bouldin: number;
    };
    optimal_k_recommendation?: {
        [key: string]: number;
    };
    stability?: {
        mean: number;
        std: number;
    };
    interpretations?: {
        overall_quality: string;
        cluster_profiles: string[];
        cluster_distribution: string;
    };
    labels?: number[];
    clustered_data?: DataSet;
}

interface FullHcaResponse {
    results: HcaResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: HcaResults }) => {
    const nClusters = results.n_clusters;
    const silhouetteScore = results.final_metrics?.silhouette || 0;
    const avgClusterSize = Math.floor(
        Object.values(results.profiles).reduce((sum, p) => sum + p.size, 0) / nClusters
    );
    const stability = results.stability?.mean || 0;
    
    const getQualityInterpretation = (score: number) => {
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
                                Clusters
                            </p>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {nClusters}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Hierarchical groups
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
                            {silhouetteScore.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getQualityInterpretation(silhouetteScore)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Average Cluster Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Avg. Size
                            </p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {avgClusterSize}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Points per cluster
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Stability Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Stability
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(stability * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Cluster consistency
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const HcaOverview = ({ selectedItems, linkageMethod, distanceMetric, nClusters, data }: any) => {
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

        // Parameters
        overview.push(`Linkage method: ${linkageMethod} - ${linkageMethod === 'ward' ? 'minimizes within-cluster variance' : 
                     linkageMethod === 'complete' ? 'maximum distance between clusters' :
                     linkageMethod === 'average' ? 'average distance between clusters' : 
                     'minimum distance between clusters'}`);
        overview.push(`Distance metric: ${distanceMetric}`);
        
        if (nClusters) {
            overview.push(`Number of clusters: ${nClusters} (user-specified)`);
        } else {
            overview.push('Number of clusters: Auto (will recommend optimal k)');
        }

        // Sample size considerations
        if (data.length < 50) {
            overview.push(`⚠ Small dataset (${data.length} points) - dendrogram may be sparse`);
        } else {
            overview.push(`Dataset size: ${data.length} points`);
        }

        // Method info
        overview.push('Algorithm: Agglomerative hierarchical clustering');
        overview.push('Creates dendrogram showing cluster hierarchy');
        overview.push('Can cut tree at any level for different granularity');
        overview.push('Best for: Understanding data taxonomy, small-medium datasets');

        return overview;
    }, [selectedItems, linkageMethod, distanceMetric, nClusters, data]);

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

// Generate interpretations based on HCA results
const generateHCAInterpretations = (results: HcaResults, selectedItems: string[]) => {
    const profiles: string[] = [];
    const silhouette = results.final_metrics?.silhouette || 0;
    
    // Overall quality assessment
    let overall = '';
    if (silhouette >= 0.7) {
        overall = `Excellent clustering with ${results.n_clusters} hierarchical groups. The dendrogram shows strong separation between clusters with silhouette score of ${silhouette.toFixed(3)}.`;
    } else if (silhouette >= 0.5) {
        overall = `Good clustering structure identified with ${results.n_clusters} groups. The hierarchical structure is well-defined with reasonable separation (silhouette: ${silhouette.toFixed(3)}).`;
    } else if (silhouette >= 0.25) {
        overall = `Moderate clustering with ${results.n_clusters} groups. The dendrogram suggests some structure but with overlapping clusters (silhouette: ${silhouette.toFixed(3)}).`;
    } else {
        overall = `Weak clustering structure with ${results.n_clusters} groups. The low silhouette score (${silhouette.toFixed(3)}) indicates unclear hierarchical boundaries.`;
    }
    
    // Add optimal k recommendation
    if (results.optimal_k_recommendation) {
        const recommendations = Object.entries(results.optimal_k_recommendation)
            .map(([method, k]) => `${method}: ${k}`)
            .join(', ');
        overall += ` Optimal cluster recommendations: ${recommendations}.`;
    }
    
    // Cluster profiles
    Object.entries(results.profiles).forEach(([clusterName, profile]) => {
        let description = `<strong>${clusterName}</strong>: ${profile.size} points (${profile.percentage.toFixed(1)}%). `;
        
        // Find dominant features
        const centroid = profile.centroid;
        const sortedFeatures = Object.entries(centroid)
            .sort(([,a], [,b]) => Math.abs(b as number) - Math.abs(a as number))
            .slice(0, 2);
        
        if (sortedFeatures.length > 0) {
            description += `Key features: ${sortedFeatures.map(([k, v]) => 
                `${k} (${(v as number).toFixed(2)})`).join(', ')}.`;
        }
        
        profiles.push(description);
    });
    
    // Distribution analysis
    let distribution = '';
    const sizes = Object.values(results.profiles).map(p => p.size);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    
    if (maxSize / minSize > 5) {
        distribution = 'Highly imbalanced cluster sizes in the hierarchy. The dendrogram likely shows early splits for outlier groups.';
    } else if (maxSize / minSize > 2) {
        distribution = 'Moderately imbalanced cluster distribution. The hierarchical structure shows varying group densities.';
    } else {
        distribution = 'Well-balanced cluster sizes. The dendrogram indicates uniform hierarchical divisions.';
    }
    
    if (results.stability) {
        distribution += ` Cluster stability: ${(results.stability.mean * 100).toFixed(0)}% (std: ${(results.stability.std * 100).toFixed(0)}%).`;
    }
    
    return {
        overall_quality: overall,
        cluster_profiles: profiles,
        cluster_distribution: distribution
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const hcaExample = exampleDatasets.find(d => d.id === 'customer-segments');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <GitBranch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Hierarchical Cluster Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Build a hierarchy of clusters to understand data structure at multiple levels
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Dendrogram</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Tree view of cluster hierarchy
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Network className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Flexible</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Cut tree at any level
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interpretable</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Visual cluster relationships
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use HCA
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Hierarchical Clustering when you want to understand the taxonomic relationships 
                            in your data. It&apos;s ideal for exploring how data points group together at different 
                            levels of similarity. Perfect for gene analysis, customer segmentation, document 
                            organization, and any scenario where understanding the hierarchy is as important 
                            as the final clusters.
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
                                        <span><strong>Linkage:</strong> Ward, Complete, Average, Single</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Distance:</strong> Euclidean, Manhattan, etc.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Clusters:</strong> Optional (auto-detect)</span>
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
                                        <span><strong>Dendrogram:</strong> Cluster tree structure</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Height:</strong> Distance between merges</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Validation:</strong> Silhouette analysis</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Export:</strong> Download with labels</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {hcaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(hcaExample)} size="lg">
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

interface HcaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function HcaPage({ data, numericHeaders, onLoadExample, onGenerateReport }: HcaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [linkageMethod, setLinkageMethod] = useState('ward');
    const [distanceMetric, setDistanceMetric] = useState('euclidean');
    const [nClusters, setNClusters] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullHcaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        
        // Ward linkage only works with Euclidean distance
        if (linkageMethod === 'ward' && distanceMetric !== 'euclidean') {
            setDistanceMetric('euclidean');
        }
    }, [data, numericHeaders, canRun, linkageMethod, distanceMetric]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two variables for clustering.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/hca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    items: selectedItems,
                    linkageMethod,
                    distanceMetric,
                    nClusters: nClusters ? Number(nClusters) : null
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateHCAInterpretations(result.results, selectedItems);
            
            // Add cluster labels to data for export if labels exist
            let clusteredData = null;
            if (result.results.labels) {
                const cleanData = data.filter(row => 
                    selectedItems.every(item => row[item] !== null && row[item] !== undefined && row[item] !== '')
                );
                clusteredData = cleanData.map((row, index) => ({
                    ...row,
                    'Cluster': `Cluster ${result.results.labels[index] + 1}`
                }));
            }
            
            setAnalysisResult({
                ...result,
                results: {
                    ...result.results,
                    interpretations,
                    clustered_data: clusteredData
                }
            });

        } catch (e: any) {
            console.error('HCA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, linkageMethod, distanceMetric, nClusters, toast]);
    
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
        link.download = 'hca_clustered_data.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "HCA clustered data is being downloaded." });
    }, [analysisResult, toast]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Hierarchical Clustering Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and clustering parameters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables for Clustering</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`hca-${header}`}
                                  checked={selectedItems.includes(header)}
                                  onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`hca-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Linkage Method</Label>
                            <Select value={linkageMethod} onValueChange={setLinkageMethod}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ward">Ward</SelectItem>
                                    <SelectItem value="complete">Complete</SelectItem>
                                    <SelectItem value="average">Average</SelectItem>
                                    <SelectItem value="single">Single</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label>Distance Metric</Label>
                            <Select value={distanceMetric} onValueChange={setDistanceMetric} disabled={linkageMethod === 'ward'}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="euclidean">Euclidean</SelectItem>
                                    <SelectItem value="manhattan">Manhattan</SelectItem>
                                    <SelectItem value="cosine">Cosine</SelectItem>
                                    <SelectItem value="correlation">Correlation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Number of Clusters (Optional)</Label>
                            <Input 
                                type="number" 
                                placeholder="Auto-detect optimal"
                                value={nClusters ?? ''}
                                onChange={e => setNClusters(e.target.value ? parseInt(e.target.value) : null)}
                                min="2"
                            />
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <HcaOverview 
                        selectedItems={selectedItems}
                        linkageMethod={linkageMethod}
                        distanceMetric={distanceMetric}
                        nClusters={nClusters}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(results, analysisResult?.plot || null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                {results.clustered_data && (
                                    <Button variant="outline" onClick={handleDownloadClusteredData}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Clustered Data
                                    </Button>
                                )}
                            </>
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
                        <p className="text-muted-foreground">Building cluster hierarchy...</p>
                        <Skeleton className="h-[600px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                 <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Detailed Analysis - 그래프 위에 배치 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <GitBranch className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Summary - Primary Color */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <GitBranch className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Summary</h3>
                                </div>
                                <div className="text-sm text-foreground/80 leading-relaxed">
                                    <strong>Hierarchical clustering completed with {results.n_clusters} clusters.</strong>{' '}
                                    {results.interpretations?.overall_quality}
                                </div>
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
                                        insights.push(`<strong>Silhouette Score (${silhouette.toFixed(3)}):</strong> Indicates ${silhouetteQuality} cluster separation in the hierarchy.`);
                                        
                                        // Calinski-Harabasz
                                        insights.push(`<strong>Calinski-Harabasz Index (${calinski.toFixed(0)}):</strong> Measures between-cluster vs within-cluster variance. Higher values indicate better-defined clusters.`);
                                        
                                        // Davies-Bouldin
                                        insights.push(`<strong>Davies-Bouldin Index (${daviesBouldin.toFixed(3)}):</strong> ${daviesBouldin < 1 ? 'Good separation - clusters are compact and distinct.' : 'Some overlap between hierarchical groups.'}`);
                                        
                                        // Stability
                                        if (results.stability) {
                                            insights.push(`<strong>Cluster Stability:</strong> ${(results.stability.mean * 100).toFixed(0)}% consistency (±${(results.stability.std * 100).toFixed(0)}%) across bootstrap samples.`);
                                        }
                                        
                                        // Distribution
                                        insights.push(`<strong>Distribution:</strong> ${results.interpretations?.cluster_distribution}`);
                                        
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
                                        
                                        // Optimal k recommendations
                                        if (results.optimal_k_recommendation && Object.keys(results.optimal_k_recommendation).length > 0) {
                                            const recValues = Object.values(results.optimal_k_recommendation);
                                            const avgRec = Math.round(recValues.reduce((a, b) => a + b, 0) / recValues.length);
                                            if (avgRec !== results.n_clusters) {
                                                recs.push(`Multiple methods suggest k=${avgRec} as optimal. Consider re-running with this value.`);
                                            }
                                        }
                                        
                                        // Silhouette-based recommendations
                                        if (silhouette < 0.25) {
                                            recs.push('Low silhouette score suggests trying different linkage methods or number of clusters.');
                                        } else if (silhouette >= 0.5) {
                                            recs.push('Good silhouette score - the hierarchical structure provides meaningful groupings.');
                                        }
                                        
                                        // General recommendations
                                        recs.push('Examine the dendrogram to understand how clusters merge at different similarity levels.');
                                        recs.push('The height at which clusters merge indicates their dissimilarity - taller branches mean more distinct groups.');
                                        recs.push('Use "Export Clustered Data" to analyze group assignments in your original data.');
                                        recs.push('For taxonomy analysis, consider cutting the dendrogram at different heights to explore subclusters.');
                                        
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

                    {/* Visual Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Visual Summary</CardTitle>
                            <CardDescription>
                                Comprehensive overview including dendrogram showing cluster hierarchy and validation metrics.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Comprehensive HCA Plots" width={1200} height={1000} className="w-3/4 mx-auto rounded-md border"/>
                        </CardContent>
                    </Card>

                    {/* Cluster Profiles Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Cluster Profiles (Centroids)</CardTitle>
                            <CardDescription>Mean values of each variable for the hierarchical clusters.</CardDescription>
                        </CardHeader>
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
                                        {Object.entries(results.profiles).map(([clusterName, profile]) => (
                                            <TableRow key={clusterName}>
                                                <TableCell className="font-semibold">{clusterName}</TableCell>
                                                <TableCell>
                                                    {profile.size}
                                                    <span className="text-muted-foreground ml-1">({profile.percentage.toFixed(1)}%)</span>
                                                </TableCell>
                                                {selectedItems.map(item => (
                                                    <TableCell key={item} className="text-right font-mono">
                                                        {profile.centroid[item]?.toFixed(2) || '—'}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                Compare centroid values across clusters to identify distinguishing features in the hierarchy.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cluster Interpretations */}
                    {results.interpretations?.cluster_profiles && results.interpretations.cluster_profiles.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Interpretations</CardTitle>
                                <CardDescription>Hierarchical cluster descriptions based on their centroid profiles.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {results.interpretations.cluster_profiles.map((profile, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: profile }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Optimal K Recommendations */}
                    {results.optimal_k_recommendation && Object.keys(results.optimal_k_recommendation).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Optimal Cluster Recommendations</CardTitle>
                                <CardDescription>Different methods suggest the following optimal number of clusters.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {Object.entries(results.optimal_k_recommendation).map(([method, k]) => (
                                        <div key={method} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                            <span className="text-sm font-medium capitalize">{method}:</span>
                                            <Badge variant="secondary">{k} Clusters</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <GitBranch className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to build cluster hierarchy.</p>
                </div>
            )}
        </div>
    );
}


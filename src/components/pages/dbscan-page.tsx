'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, ScanSearch, Bot, HelpCircle, MoveRight, Settings, FileSearch, BookOpen, Network, Sparkles, AlertCircle, Download, Hash, Users, TrendingUp, Activity, Info, CheckCircle, BarChart3, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface DbscanResults {
    n_clusters: number;
    n_noise: number;
    n_samples: number;
    eps: number;
    min_samples: number;
    labels: number[];
    profiles: {
        [key: string]: {
            size: number;
            percentage: number;
            centroid: { [key: string]: number };
        }
    };
    interpretations?: {
        overall_quality: string;
        cluster_profiles: string[];
        cluster_distribution: string;
    };
    clustered_data?: DataSet;
}

interface FullAnalysisResponse {
    results: DbscanResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: DbscanResults }) => {
    const nClusters = results.n_clusters;
    const nNoise = results.n_noise;
    const noisePercentage = (nNoise / results.n_samples) * 100;
    const avgClusterSize = Math.floor((results.n_samples - nNoise) / Math.max(nClusters, 1));
    
    const getNoiseInterpretation = (percent: number) => {
        if (percent <= 5) return 'Very clean';
        if (percent <= 15) return 'Clean';
        if (percent <= 30) return 'Moderate noise';
        return 'High noise';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Clusters Count Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Clusters Found
                            </p>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {nClusters}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Auto-detected groups
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Noise Points Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Noise Points
                            </p>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {nNoise}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {noisePercentage.toFixed(1)}% of data
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
                                Avg. Cluster Size
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

            {/* Data Quality Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Data Quality
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {100 - noisePercentage < 70 ? 'Low' : 100 - noisePercentage < 85 ? 'Medium' : 'High'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getNoiseInterpretation(noisePercentage)}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const DbscanOverview = ({ selectedItems, eps, minSamples, data }: any) => {
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
        overview.push(`Epsilon (ε): ${eps} - neighborhood radius`);
        overview.push(`Min samples: ${minSamples} - minimum points for core`);

        // Sample size considerations
        if (data.length < 50) {
            overview.push(`⚠ Small dataset (${data.length} points) - may not form dense clusters`);
        } else {
            overview.push(`Dataset size: ${data.length} points`);
        }

        // Method info
        overview.push('Algorithm: Density-Based Spatial Clustering');
        overview.push('Automatically determines number of clusters');
        overview.push('Identifies outliers as noise points');
        overview.push('Can find arbitrary-shaped clusters');
        overview.push('Best for: Non-spherical clusters, outlier detection');

        return overview;
    }, [selectedItems, eps, minSamples, data]);

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

// Generate interpretations based on DBSCAN results
const generateDBSCANInterpretations = (results: DbscanResults, selectedItems: string[]) => {
    const noisePercent = (results.n_noise / results.n_samples) * 100;
    const profiles: string[] = [];
    
    // Overall quality assessment
    let overall = '';
    if (results.n_clusters === 0) {
        overall = 'No clusters found. All points are classified as noise. Consider adjusting parameters (increase eps or decrease min_samples).';
    } else if (results.n_clusters === 1) {
        overall = 'Single cluster detected. The data forms one dense region. Consider decreasing eps for finer granularity.';
    } else {
        overall = `${results.n_clusters} distinct clusters identified. `;
        if (noisePercent < 5) {
            overall += 'Very low noise indicates well-defined, dense clusters.';
        } else if (noisePercent < 20) {
            overall += 'Moderate noise level suggests clear cluster boundaries with some outliers.';
        } else if (noisePercent < 40) {
            overall += 'Significant noise indicates sparse data or need for parameter tuning.';
        } else {
            overall += 'High noise level. Consider increasing eps or decreasing min_samples.';
        }
    }
    
    // Cluster profiles
    Object.entries(results.profiles).forEach(([clusterName, profile]) => {
        if (clusterName !== 'Noise') {
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
        }
    });
    
    // Distribution analysis
    let distribution = '';
    if (results.n_clusters > 0) {
        const sizes = Object.values(results.profiles)
            .filter(p => !Object.keys(p).includes('Noise'))
            .map(p => p.size);
        
        if (sizes.length > 0) {
            const maxSize = Math.max(...sizes);
            const minSize = Math.min(...sizes);
            
            if (maxSize / minSize > 5) {
                distribution = 'Highly imbalanced cluster sizes. The largest cluster is significantly bigger than the smallest.';
            } else if (maxSize / minSize > 2) {
                distribution = 'Moderately imbalanced cluster sizes. Some clusters are notably larger than others.';
            } else {
                distribution = 'Relatively balanced cluster sizes across all groups.';
            }
        }
    }
    
    if (results.n_noise > 0) {
        distribution += ` ${results.n_noise} points (${noisePercent.toFixed(1)}%) classified as noise/outliers.`;
    }
    
    return {
        overall_quality: overall,
        cluster_profiles: profiles,
        cluster_distribution: distribution
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const dbscanExample = exampleDatasets.find(d => d.id === 'customer-segments');
    
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
                                    Identifies noise points automatically
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use DBSCAN
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use DBSCAN when you don&apos;t know the number of clusters beforehand and your data may 
                            contain outliers or noise. It&apos;s excellent for datasets with clusters of varying densities 
                            and non-spherical shapes. Perfect for anomaly detection, spatial data analysis, and 
                            exploratory data analysis where traditional methods like K-Means fail.
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
                                        <span><strong>Epsilon (ε):</strong> Neighborhood radius</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min samples:</strong> Core point threshold</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Density:</strong> Works with varying densities</span>
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
                                        <span><strong>Clusters:</strong> Auto-detected groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Noise:</strong> Outliers marked as -1</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Profiles:</strong> Cluster characteristics</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Export:</strong> Download with labels</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {dbscanExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(dbscanExample)} size="lg">
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
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function DbscanPage({ data, numericHeaders, onLoadExample, onGenerateReport }: DbscanPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [eps, setEps] = useState<number>(0.5);
    const [minSamples, setMinSamples] = useState<number>(5);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

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
            const response = await fetch('/api/analysis/dbscan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    items: selectedItems,
                    eps,
                    min_samples: minSamples
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Add cluster labels to data for export
            const cleanData = data.filter(row => selectedItems.every(item => row[item] !== null && row[item] !== undefined && row[item] !== ''));
            const dataWithClusters = cleanData.map((row, index) => ({
                ...row,
                'Cluster': result.results.labels[index] === -1 ? 'Noise' : `Cluster ${result.results.labels[index] + 1}`
            }));
            
            // Generate interpretations
            const interpretations = generateDBSCANInterpretations(result.results, selectedItems);
            
            setAnalysisResult({ 
                ...result, 
                results: { 
                    ...result.results, 
                    interpretations,
                    clustered_data: dataWithClusters 
                } 
            });

        } catch (e: any) {
            console.error('DBSCAN error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, eps, minSamples, toast]);
    
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
        link.download = 'dbscan_clustered_data.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "DBSCAN clustered data is being downloaded." });
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
                        <CardTitle className="font-headline">DBSCAN Clustering Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and adjust the DBSCAN parameters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables for Clustering</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`dbscan-${header}`}
                                  checked={selectedItems.includes(header)}
                                  onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`dbscan-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="eps">Epsilon (eps)</Label>
                            <Input 
                                id="eps"
                                type="number" 
                                value={eps}
                                onChange={e => setEps(parseFloat(e.target.value))}
                                step="0.1"
                                min="0.1"
                            />
                             <p className="text-xs text-muted-foreground mt-1">Max distance between two samples for neighborhood.</p>
                        </div>
                        <div>
                            <Label htmlFor="min_samples">Min Samples</Label>
                            <Input 
                                id="min_samples"
                                type="number" 
                                value={minSamples}
                                onChange={e => setMinSamples(parseInt(e.target.value))}
                                min="1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Minimum points to form a core point.</p>
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <DbscanOverview 
                        selectedItems={selectedItems}
                        eps={eps}
                        minSamples={minSamples}
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
                                <Button variant="outline" onClick={handleDownloadClusteredData}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Clustered Data
                                </Button>
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
                        <p className="text-muted-foreground">Running DBSCAN Analysis...</p>
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
                                <ScanSearch className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Summary - Primary Color */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <ScanSearch className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Summary</h3>
                                </div>
                                <div className="text-sm text-foreground/80 leading-relaxed">
                                    <strong>DBSCAN clustering completed with ε={results.eps} and min_samples={results.min_samples}.</strong>{' '}
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
                                        const noisePercent = (results.n_noise / results.n_samples) * 100;
                                        const avgClusterSize = Math.floor((results.n_samples - results.n_noise) / Math.max(results.n_clusters, 1));
                                        
                                        // Cluster count insight
                                        insights.push(`<strong>Clusters Detected:</strong> ${results.n_clusters} distinct density-based clusters found automatically without pre-specifying k.`);
                                        
                                        // Noise insight
                                        const noiseQuality = noisePercent <= 5 ? 'excellent' : noisePercent <= 15 ? 'good' : noisePercent <= 30 ? 'moderate' : 'high';
                                        insights.push(`<strong>Noise Analysis:</strong> ${results.n_noise} points (${noisePercent.toFixed(1)}%) classified as noise/outliers - ${noiseQuality} data quality for clustering.`);
                                        
                                        // Cluster size insight
                                        insights.push(`<strong>Cluster Sizes:</strong> Average of ${avgClusterSize} points per cluster. ${results.interpretations?.cluster_distribution}`);
                                        
                                        // Parameter insight
                                        insights.push(`<strong>Parameters Used:</strong> ε=${results.eps} defines neighborhood radius, min_samples=${results.min_samples} sets core point threshold.`);
                                        
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
                                        const noisePercent = (results.n_noise / results.n_samples) * 100;
                                        
                                        // Noise-based recommendations
                                        if (noisePercent > 30) {
                                            recs.push('High noise percentage detected. Consider increasing ε (epsilon) or decreasing min_samples to include more points in clusters.');
                                        } else if (noisePercent < 5) {
                                            recs.push('Very low noise indicates well-defined clusters. Current parameters work well for this data.');
                                        }
                                        
                                        // Cluster count recommendations
                                        if (results.n_clusters === 0) {
                                            recs.push('No clusters found - all points classified as noise. Significantly increase ε or decrease min_samples.');
                                        } else if (results.n_clusters === 1) {
                                            recs.push('Only one cluster found. Try decreasing ε for finer granularity or verify if data naturally forms a single group.');
                                        } else if (results.n_clusters > 10) {
                                            recs.push('Many clusters detected. Consider increasing ε to merge nearby clusters if too fragmented.');
                                        }
                                        
                                        // General recommendations
                                        recs.push('Noise points may represent outliers or anomalies worth investigating separately.');
                                        recs.push('Use the "Export Clustered Data" feature to analyze cluster assignments and noise points in detail.');
                                        recs.push('Compare with K-Means results if clusters appear spherical - K-Means may be more appropriate.');
                                        recs.push('For spatial or geographic data, DBSCAN is particularly effective at finding natural density-based groupings.');
                                        
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
                                Comprehensive overview including cluster visualization using PCA projection. Noise points are marked with 'x'.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Comprehensive DBSCAN Plots" width={1200} height={1000} className="w-3/4 mx-auto rounded-md border"/>
                        </CardContent>
                    </Card>

                    {/* Cluster Profiles Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Cluster Profiles (Centroids)</CardTitle>
                            <CardDescription>Mean values of each variable for the identified clusters. Noise points are excluded from profiles.</CardDescription>
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
                                        {Object.entries(results.profiles)
                                            .filter(([name]) => name !== 'Noise')
                                            .map(([clusterName, profile]) => (
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
                                Compare centroid values across clusters to identify distinguishing features. Noise points ({results.n_noise}) are not included in profiles.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cluster Interpretations */}
                    {results.interpretations?.cluster_profiles && results.interpretations.cluster_profiles.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Interpretations</CardTitle>
                                <CardDescription>Descriptions of each cluster based on their centroid profiles.</CardDescription>
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
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <ScanSearch className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to perform DBSCAN clustering.</p>
                </div>
            )}
        </div>
    );
}




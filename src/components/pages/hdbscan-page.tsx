'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, ScanSearch, Bot, HelpCircle, MoveRight, Settings, FileSearch, BookOpen, GitBranch, Sparkles, AlertCircle, Download, Hash, Users, TrendingUp, Zap, Info, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface HdbscanResults {
    n_clusters: number;
    n_noise: number;
    n_samples: number;
    min_cluster_size: number;
    min_samples: number | null;
    labels: number[];
    probabilities: number[];
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
    results: HdbscanResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: HdbscanResults }) => {
    const nClusters = results.n_clusters;
    const nNoise = results.n_noise;
    const noisePercentage = (nNoise / results.n_samples) * 100;
    const avgClusterSize = Math.floor((results.n_samples - nNoise) / Math.max(nClusters, 1));
    const avgProbability = results.probabilities?.length > 0 ? 
        results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
    
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
                            Hierarchical groups
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

            {/* Average Probability Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Avg. Confidence
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(avgProbability * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Membership probability
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
                            <Zap className="h-4 w-4 text-muted-foreground" />
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
const HdbscanOverview = ({ selectedItems, minClusterSize, minSamples, data }: any) => {
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
        overview.push(`Min cluster size: ${minClusterSize} - smallest valid cluster`);
        if (minSamples) {
            overview.push(`Min samples: ${minSamples} - conservative parameter`);
        } else {
            overview.push('Min samples: Auto (same as min cluster size)');
        }

        // Sample size considerations
        if (data.length < 50) {
            overview.push(`⚠ Small dataset (${data.length} points) - may not form stable hierarchies`);
        } else {
            overview.push(`Dataset size: ${data.length} points`);
        }

        // Method info
        overview.push('Algorithm: Hierarchical DBSCAN');
        overview.push('Builds cluster hierarchy at multiple scales');
        overview.push('No epsilon parameter needed (unlike DBSCAN)');
        overview.push('Provides membership probabilities');
        overview.push('Best for: Varying densities, exploratory analysis');

        return overview;
    }, [selectedItems, minClusterSize, minSamples, data]);

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

// Generate interpretations based on HDBSCAN results
const generateHDBSCANInterpretations = (results: HdbscanResults, selectedItems: string[]) => {
    const noisePercent = (results.n_noise / results.n_samples) * 100;
    const avgProbability = results.probabilities?.length > 0 ? 
        results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
    
    const profiles: string[] = [];
    
    // Overall quality assessment
    let overall = '';
    if (results.n_clusters === 0) {
        overall = 'No stable clusters found. All points are classified as noise. This suggests the data lacks clear density patterns. Consider adjusting min_cluster_size to a smaller value.';
    } else if (results.n_clusters === 1) {
        overall = 'Single cluster detected. HDBSCAN found one stable hierarchical cluster. The data may be too homogeneous or min_cluster_size may be too large.';
    } else {
        overall = `${results.n_clusters} hierarchical clusters identified. `;
        if (avgProbability > 0.8) {
            overall += 'High average membership probability indicates well-separated, stable clusters.';
        } else if (avgProbability > 0.6) {
            overall += 'Moderate membership probabilities suggest some overlap between clusters.';
        } else {
            overall += 'Low membership probabilities indicate fuzzy cluster boundaries or transitional points.';
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
                distribution = 'Highly imbalanced cluster sizes with significant hierarchy. ';
            } else if (maxSize / minSize > 2) {
                distribution = 'Moderately imbalanced hierarchical structure. ';
            } else {
                distribution = 'Relatively balanced cluster sizes in the hierarchy. ';
            }
        }
    }
    
    distribution += `Average confidence: ${(avgProbability * 100).toFixed(0)}%. `;
    
    if (results.n_noise > 0) {
        distribution += `${results.n_noise} points (${noisePercent.toFixed(1)}%) classified as noise/outliers.`;
    }
    
    return {
        overall_quality: overall,
        cluster_profiles: profiles,
        cluster_distribution: distribution
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const hdbscanExample = exampleDatasets.find(d => d.id === 'customer-segments');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ScanSearch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">HDBSCAN Clustering</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Advanced hierarchical density-based clustering with automatic parameter selection
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Hierarchical</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Multi-scale cluster detection
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Adaptive</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    No epsilon parameter needed
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Probabilities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Membership confidence scores
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use HDBSCAN
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use HDBSCAN when you need the most advanced density-based clustering available. 
                            It&apos;s superior to DBSCAN for datasets with varying densities and doesn&apos;t require 
                            you to specify a distance threshold. Perfect for exploratory data analysis, 
                            complex pattern discovery, and when you need cluster membership probabilities.
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
                                        <span><strong>Min size:</strong> Smallest cluster allowed</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min samples:</strong> Optional conservativeness</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Automatic:</strong> Finds optimal clusters</span>
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
                                        <span><strong>Hierarchy:</strong> Multi-scale clusters</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Probabilities:</strong> Membership strength</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Noise:</strong> Auto-detected outliers</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Export:</strong> Download with labels</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {hdbscanExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(hdbscanExample)} size="lg">
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

interface HdbscanPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function HdbscanPage({ data, numericHeaders, onLoadExample, onGenerateReport }: HdbscanPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [minClusterSize, setMinClusterSize] = useState<number>(5);
    const [minSamples, setMinSamples] = useState<number | null>(null);
    
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
            const response = await fetch('/api/analysis/hdbscan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    items: selectedItems,
                    min_cluster_size: minClusterSize,
                    min_samples: minSamples,
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
                'Cluster': result.results.labels[index] === -1 ? 'Noise' : `Cluster ${result.results.labels[index] + 1}`,
                'Probability': result.results.probabilities[index].toFixed(3)
            }));
            
            // Generate interpretations
            const interpretations = generateHDBSCANInterpretations(result.results, selectedItems);
            
            setAnalysisResult({ 
                ...result, 
                results: { 
                    ...result.results, 
                    interpretations,
                    clustered_data: dataWithClusters 
                } 
            });

        } catch (e: any) {
            console.error('HDBSCAN error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, minClusterSize, minSamples, toast]);
    
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
        link.download = 'hdbscan_clustered_data.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "HDBSCAN clustered data with probabilities is being downloaded." });
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
                        <CardTitle className="font-headline">HDBSCAN Clustering Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and adjust the HDBSCAN parameters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables for Clustering</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`hdbscan-${header}`}
                                  checked={selectedItems.includes(header)}
                                  onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`hdbscan-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="min_cluster_size">Min Cluster Size</Label>
                            <Input 
                                id="min_cluster_size"
                                type="number" 
                                value={minClusterSize}
                                onChange={e => setMinClusterSize(parseInt(e.target.value))}
                                min="2"
                            />
                             <p className="text-xs text-muted-foreground mt-1">The smallest grouping to be considered a cluster.</p>
                        </div>
                        <div>
                            <Label htmlFor="min_samples">Min Samples (Optional)</Label>
                            <Input 
                                id="min_samples"
                                type="number"
                                placeholder="Auto (same as Min Cluster Size)"
                                value={minSamples ?? ''}
                                onChange={e => setMinSamples(e.target.value ? parseInt(e.target.value) : null)}
                                min="1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Controls how conservative clustering is.</p>
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <HdbscanOverview 
                        selectedItems={selectedItems}
                        minClusterSize={minClusterSize}
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
                        <p className="text-muted-foreground">Running HDBSCAN Analysis...</p>
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
                                    <strong>HDBSCAN hierarchical clustering completed with min_cluster_size={results.min_cluster_size}.</strong>{' '}
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
                                        const avgProbability = results.probabilities?.length > 0 ? 
                                            results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
                                        
                                        // Cluster count insight
                                        insights.push(`<strong>Hierarchical Clusters:</strong> ${results.n_clusters} stable clusters discovered through hierarchical density analysis at multiple scales.`);
                                        
                                        // Membership probability insight
                                        const probQuality = avgProbability > 0.8 ? 'excellent' : avgProbability > 0.6 ? 'good' : avgProbability > 0.4 ? 'moderate' : 'low';
                                        insights.push(`<strong>Membership Confidence:</strong> Average probability of ${(avgProbability * 100).toFixed(0)}% indicates ${probQuality} cluster assignment certainty.`);
                                        
                                        // Noise insight
                                        const noiseQuality = noisePercent <= 5 ? 'excellent' : noisePercent <= 15 ? 'good' : noisePercent <= 30 ? 'moderate' : 'high';
                                        insights.push(`<strong>Noise Analysis:</strong> ${results.n_noise} points (${noisePercent.toFixed(1)}%) classified as noise - ${noiseQuality} data quality.`);
                                        
                                        // Distribution insight
                                        insights.push(`<strong>Cluster Distribution:</strong> ${results.interpretations?.cluster_distribution}`);
                                        
                                        // HDBSCAN advantage
                                        insights.push(`<strong>Algorithm Advantage:</strong> Unlike DBSCAN, HDBSCAN automatically adapts to varying densities without requiring epsilon parameter.`);
                                        
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
                                        const avgProbability = results.probabilities?.length > 0 ? 
                                            results.probabilities.filter(p => p > 0).reduce((a, b) => a + b, 0) / results.probabilities.filter(p => p > 0).length : 0;
                                        
                                        // Cluster count recommendations
                                        if (results.n_clusters === 0) {
                                            recs.push('No clusters found - try decreasing min_cluster_size to allow smaller groups to form.');
                                        } else if (results.n_clusters === 1) {
                                            recs.push('Only one cluster found. Try decreasing min_cluster_size for finer granularity.');
                                        }
                                        
                                        // Probability-based recommendations
                                        if (avgProbability < 0.5) {
                                            recs.push('Low membership probabilities suggest fuzzy boundaries. Points near cluster edges may belong to multiple groups.');
                                        } else if (avgProbability > 0.8) {
                                            recs.push('High membership probabilities indicate well-separated clusters with clear boundaries.');
                                        }
                                        
                                        // Noise recommendations
                                        if (noisePercent > 30) {
                                            recs.push('High noise percentage - consider decreasing min_cluster_size or investigating if noise points represent a distinct pattern.');
                                        }
                                        
                                        // General recommendations
                                        recs.push('Use membership probabilities to identify borderline cases that may need manual review.');
                                        recs.push('Export clustered data includes probability scores for each point - use these for confidence-weighted analysis.');
                                        recs.push('Compare with DBSCAN or K-Means to validate cluster structure if needed.');
                                        recs.push('For customer segmentation, low-probability points may represent transitional or multi-segment customers.');
                                        
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
                                Hierarchical clustering visualization. Point size indicates membership probability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="HDBSCAN Clustering Plots" width={1200} height={1000} className="w-3/4 mx-auto rounded-md border"/>
                        </CardContent>
                    </Card>

                    {/* Cluster Profiles Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Cluster Profiles (Centroids)</CardTitle>
                            <CardDescription>Mean values of each variable for the identified clusters. Membership probabilities show cluster stability.</CardDescription>
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
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <ScanSearch className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to perform HDBSCAN clustering.</p>
                </div>
            )}
        </div>
    );
}
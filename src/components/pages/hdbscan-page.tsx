
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, ScanSearch, Bot, HelpCircle, MoveRight, Settings, FileSearch } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { getClusteringInterpretation } from '@/app/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

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
}

interface FullAnalysisResponse {
    results: HdbscanResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const hdbscanExample = exampleDatasets.find(d => d.id === 'customer-segments');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <ScanSearch size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">HDBSCAN Clustering</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        An advanced, density-based clustering algorithm that is robust to noise and can find clusters of varying shapes and densities without needing to specify the number of clusters.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use HDBSCAN?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise) improves upon DBSCAN by converting it into a hierarchical clustering algorithm. This eliminates the need to specify an 'epsilon' distance, making it more user-friendly and powerful. It's excellent for exploratory data analysis where you have little to no prior knowledge about the number or shape of clusters.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {hdbscanExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(hdbscanExample)}>
                                <hdbscanExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{hdbscanExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{hdbscanExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variables:</strong> Choose two or more numeric variables for clustering.</li>
                                <li><strong>Min Cluster Size:</strong> This is the primary parameter. It defines the smallest grouping of points that can be considered a cluster.</li>
                                <li><strong>Min Samples (Optional):</strong> Controls how conservative the clustering is. A larger value will result in more points being classified as noise. Leave blank to default to the 'Min Cluster Size'.</li>
                                <li><strong>Run Analysis:</strong> The algorithm automatically determines the optimal number of clusters based on data density.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Clusters & Noise:</strong> HDBSCAN automatically determines the number of clusters and identifies noise points (outliers) that do not belong to any cluster.</li>
                                <li><strong>Cluster Plot:</strong> Visualizes the clusters. The size of the points often represents the probability of that point belonging to its assigned cluster.</li>
                                <li><strong>Cluster Profiles:</strong> The mean values (centroids) for each cluster help you understand the defining characteristics of each segment.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


const InterpretationDisplay = ({ promise }: { promise: Promise<string | null> | null }) => {
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!promise) {
            setInterpretation(null);
            setLoading(false);
            return;
        };
        let isMounted = true;
        setLoading(true);
        promise.then((desc) => {
            if (isMounted && desc) {
                setInterpretation(desc);
            }
            if (isMounted) setLoading(false);
        });
        return () => { isMounted = false; };
    }, [promise]);

    if (loading) return <Skeleton className="h-24 w-full" />;
    if (!interpretation) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Bot /> AI Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: interpretation }} />
            </CardContent>
        </Card>
    );
};

interface HdbscanPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function HdbscanPage({ data, numericHeaders, onLoadExample }: HdbscanPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [minClusterSize, setMinClusterSize] = useState<number>(5);
    const [minSamples, setMinSamples] = useState<number | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [aiPromise, setAiPromise] = useState<Promise<string | null> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setAiPromise(null);
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
        setAiPromise(null);

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
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            
             const aiInterpretationPromise = getClusteringInterpretation({
                modelType: 'HDBSCAN',
                nClusters: result.results.n_clusters,
                nNoise: result.results.n_noise,
                totalSamples: result.results.n_samples,
                clusterProfiles: JSON.stringify(result.results.profiles),
            }).then(res => res.success ? res.interpretation : `AI Error: ${res.error}`);
            setAiPromise(aiInterpretationPromise);

        } catch (e: any) {
            console.error('HDBSCAN error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, minClusterSize, minSamples, toast]);
    
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
                            <Label htmlFor="min_samples">Min Samples</Label>
                            <Input 
                                id="min_samples"
                                type="number"
                                placeholder="Auto (same as Min Cluster Size)"
                                value={minSamples ?? ''}
                                onChange={e => setMinSamples(e.target.value ? parseInt(e.target.value) : null)}
                                min="1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Controls how conservative clustering is (more noise).</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedItems.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                 <div className="space-y-4">
                    <div className="grid lg:grid-cols-2 gap-4">
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">HDBSCAN Results</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Clusters Found</p><p className="text-2xl font-bold">{results.n_clusters}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Noise Points</p><p className="text-2xl font-bold">{results.n_noise} ({((results.n_noise / results.n_samples) * 100).toFixed(1)}%)</p></div>
                            </CardContent>
                        </Card>
                        <InterpretationDisplay promise={aiPromise} />
                    </div>
                    
                    <Tabs defaultValue="visuals" className="w-full">
                        <TabsList>
                            <TabsTrigger value="visuals">Visualizations</TabsTrigger>
                            <TabsTrigger value="data">Cluster Profiles</TabsTrigger>
                        </TabsList>
                        <TabsContent value="visuals">
                            {analysisResult.plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-headline">Cluster Visualization</CardTitle>
                                        <CardDescription>Clusters are visualized using the first two principal components. Point size indicates cluster membership probability.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Image src={analysisResult.plot} alt="HDBSCAN Cluster Plot" width={1500} height={1200} className="w-full rounded-md border"/>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                        <TabsContent value="data">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Cluster Profiles</CardTitle>
                                    <CardDescription>Mean values of each variable for the identified clusters.</CardDescription>
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
                                                                {profile.centroid[item].toFixed(2)}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to perform HDBSCAN clustering.</p>
                </div>
            )}
        </div>
    );
}


'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, ScanSearch, Bot } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { getClusteringInterpretation } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [minClusterSize, setMinClusterSize] = useState<number>(5);
    const [minSamples, setMinSamples] = useState<number | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [aiPromise, setAiPromise] = useState<Promise<string | null> | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setAiPromise(null);
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
    
    if (!canRun) {
        const dbscanExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('hdbscan'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">HDBSCAN Clustering</CardTitle>
                        <CardDescription>
                           To perform HDBSCAN, you need data with at least two numeric variables. Try an example dataset to get started.
                        </CardDescription>
                    </CardHeader>
                    {dbscanExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(dbscanExamples[0])} className="w-full" size="sm">
                                Load {dbscanExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">HDBSCAN Clustering Setup</CardTitle>
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
                             <p className="text-xs text-muted-foreground mt-1">The minimum size of clusters to be considered.</p>
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
                            <p className="text-xs text-muted-foreground mt-1">How conservative the clustering is. Higher values lead to more noise.</p>
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

                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Visualization</CardTitle>
                                <CardDescription>Clusters are visualized using the first two principal components. Point size indicates cluster membership probability.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="HDBSCAN Cluster Plot" width={1000} height={800} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Cluster Profiles</CardTitle>
                            <CardDescription>Mean values of each variable for the identified clusters.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>
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

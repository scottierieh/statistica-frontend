
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Binary, Bot } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { getKmeansInterpretation } from '@/app/actions';

interface KMeansResults {
    optimal_k?: {
        k_range: number[];
        inertias: number[];
        silhouette_scores: number[];
        recommended_k?: number;
    };
    clustering_summary: {
        n_clusters: number;
        inertia: number;
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
}

interface FullKMeansResponse {
    results: KMeansResults;
    plot: string;
}

interface KMeansPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const AIGeneratedInterpretation = ({ promise }: { promise: Promise<string | null> | null }) => {
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
        if (isMounted) {
            setInterpretation(desc);
            setLoading(false);
        }
    });
    return () => { isMounted = false; };
  }, [promise]);
  
  if (loading) return <Skeleton className="h-16 w-full" />;
  if (!interpretation) return null;

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Bot /> AI Interpretation</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{interpretation}</p>
    </div>
  );
};


export default function KMeansPage({ data, numericHeaders, onLoadExample }: KMeansPageProps) {
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [nClusters, setNClusters] = useState<number>(3);
    const [analysisResult, setAnalysisResult] = useState<FullKMeansResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiPromise, setAiPromise] = useState<Promise<string|null> | null>(null);

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
        if (nClusters < 2) {
            toast({ variant: 'destructive', title: 'Parameter Error', description: 'Number of clusters must be at least 2.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        setAiPromise(null);

        try {
            const response = await fetch('/api/analysis/kmeans', {
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

            const result: FullKMeansResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

            if (result.results.final_metrics) {
                const promise = getKmeansInterpretation({
                    silhouetteScore: result.results.final_metrics.silhouette,
                    calinskiHarabaszScore: result.results.final_metrics.calinski_harabasz,
                    daviesBouldinScore: result.results.final_metrics.davies_bouldin,
                }).then(res => res.success ? res.interpretation ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));
                setAiPromise(promise);
            }

        } catch (e: any) {
            console.error('K-Means error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nClusters, toast]);
    
    if (!canRun) {
        const kmeansExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('kmeans'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">K-Means Clustering</CardTitle>
                        <CardDescription>
                           To perform K-Means, you need data with at least two numeric variables. Try an example dataset to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {kmeansExamples.map((ex) => (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Binary className="h-6 w-6 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                            Load this data
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const results = analysisResult?.results;
    const recommendedK = results?.optimal_k?.recommended_k;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">K-Means Clustering Setup</CardTitle>
                    <CardDescription>Select variables and specify the number of clusters (k).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables for Clustering</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`kmeans-${header}`}
                                  checked={selectedItems.includes(header)}
                                  onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`kmeans-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 items-end">
                        <div>
                            <Label htmlFor="nClusters">Number of Clusters (k)</Label>
                            <Input 
                                id="nClusters"
                                type="number"
                                placeholder={recommendedK ? `Recommended: ${recommendedK}` : 'e.g., 3'}
                                value={nClusters}
                                onChange={e => setNClusters(parseInt(e.target.value))}
                                min="2"
                            />
                        </div>
                        <Button onClick={handleAnalysis} disabled={isLoading || selectedItems.length < 2}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full"/></CardContent></Card>}

            {analysisResult && results && (
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Visualizations</CardTitle>
                            <CardDescription>
                                A comprehensive overview of the clustering results, including methods for determining the optimal number of clusters.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Comprehensive K-Means Plots" width={1500} height={1200} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Profiles (Centroids)</CardTitle>
                                <CardDescription>Mean values of each variable for the identified clusters.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-72">
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
                                </ScrollArea>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Validation</CardTitle>
                                <CardDescription>Metrics to evaluate the quality of the clustering.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Silhouette Score</dt><dd className="text-lg font-bold font-mono">{results.final_metrics?.silhouette.toFixed(3)}</dd></div>
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Calinski-Harabasz</dt><dd className="text-lg font-bold font-mono">{results.final_metrics?.calinski_harabasz.toFixed(2)}</dd></div>
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Davies-Bouldin</dt><dd className="text-lg font-bold font-mono">{results.final_metrics?.davies_bouldin.toFixed(3)}</dd></div>
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Inertia (WCSS)</dt><dd className="text-lg font-bold font-mono">{results.clustering_summary?.inertia.toFixed(2)}</dd></div>
                                </dl>
                                <AIGeneratedInterpretation promise={aiPromise} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and set 'k' to run K-Means analysis.</p>
                </div>
            )}
        </div>
    );
}


'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Binary } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface KMedoidsResults {
    clustering_summary: {
        n_clusters: number;
        inertia: number;
        medoids: { [key: string]: number }[];
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

interface FullKMedoidsResponse {
    results: KMedoidsResults;
    plot: string;
}

interface KMedoidsPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function KMedoidsPage({ data, numericHeaders, onLoadExample }: KMedoidsPageProps) {
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [nClusters, setNClusters] = useState<number>(3);
    const [analysisResult, setAnalysisResult] = useState<FullKMedoidsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
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
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('K-Medoids error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nClusters, toast]);
    
    if (!canRun) {
        const kmedoidsExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('kmedoids'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">K-Medoids Clustering (PAM)</CardTitle>
                        <CardDescription>
                           To perform K-Medoids, you need data with at least two numeric variables. Try an example dataset to get started.
                        </CardDescription>
                    </CardHeader>
                    {kmedoidsExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(kmedoidsExamples[0])} className="w-full" size="sm">
                                Load {kmedoidsExamples[0].name}
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
                    <CardTitle className="font-headline">K-Medoids Clustering Setup</CardTitle>
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
                    <div className="grid md:grid-cols-2 gap-4 items-end">
                        <div>
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
                                A comprehensive overview of the K-Medoids clustering results.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Comprehensive K-Medoids Plots" width={1500} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Medoids</CardTitle>
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
                                <CardTitle className="font-headline">Cluster Validation</CardTitle>
                                <CardDescription>Metrics to evaluate the quality of the clustering.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Silhouette Score</dt><dd className="text-lg font-bold font-mono">{results.final_metrics?.silhouette.toFixed(3)}</dd></div>
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Calinski-Harabasz</dt><dd className="text-lg font-bold font-mono">{results.final_metrics?.calinski_harabasz.toFixed(2)}</dd></div>
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Davies-Bouldin</dt><dd className="text-lg font-bold font-mono">{results.final_metrics?.davies_bouldin.toFixed(3)}</dd></div>
                                    <div className="space-y-1"><dt className="text-sm font-medium text-muted-foreground">Inertia</dt><dd className="text-lg font-bold font-mono">{results.clustering_summary?.inertia.toFixed(2)}</dd></div>
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and set 'k' to run K-Medoids analysis.</p>
                </div>
            )}
        </div>
    );
}

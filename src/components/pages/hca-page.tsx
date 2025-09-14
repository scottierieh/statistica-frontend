'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Badge } from '../ui/badge';

interface HcaResults {
    n_clusters: number;
    profiles: {
        [key: string]: {
            size: number;
            percentage: number;
            centroid: { [key: string]: number };
        }
    };
    final_metrics?: {
        silhouette: number;
        calinski_harabasz: number;
        davies_bouldin: number;
    };
    optimal_k_recommendation?: number;
}

interface FullHcaResponse {
    results: HcaResults;
    plot: string;
}

interface HcaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function HcaPage({ data, numericHeaders, onLoadExample }: HcaPageProps) {
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [linkageMethod, setLinkageMethod] = useState('ward');
    const [distanceMetric, setDistanceMetric] = useState('euclidean');
    const [nClusters, setNClusters] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullHcaResponse | null>(null);
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
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('HCA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, linkageMethod, distanceMetric, nClusters, toast]);
    
    if (!canRun) {
        const hcaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('hca'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Hierarchical Cluster Analysis</CardTitle>
                        <CardDescription>
                           To perform HCA, you need data with at least two numeric variables. Try an example dataset to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {hcaExamples.map((ex) => (
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

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Hierarchical Clustering Setup</CardTitle>
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
                                placeholder={`Auto (Recommended: ${results?.optimal_k_recommendation || '...'})`}
                                value={nClusters ?? ''}
                                onChange={e => setNClusters(e.target.value ? parseInt(e.target.value) : null)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={isLoading || selectedItems.length < 2}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Dendrogram</CardTitle>
                            <CardDescription>
                                A tree diagram illustrating the arrangement of the clusters. The red dotted line indicates the cut for {results.n_clusters} clusters.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Dendrogram" width={800} height={400} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Profiles</CardTitle>
                                <CardDescription>Mean values of each variable for the clusters.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-72">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cluster</TableHead>
                                                <TableHead>Size</TableHead>
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
                                <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="space-y-1">
                                        <dt className="font-medium text-muted-foreground">Silhouette Score</dt>
                                        <dd className="text-xl font-bold font-mono">{results.final_metrics?.silhouette.toFixed(3)}</dd>
                                    </div>
                                    <div className="space-y-1">
                                        <dt className="font-medium text-muted-foreground">Calinski-Harabasz</dt>
                                        <dd className="text-xl font-bold font-mono">{results.final_metrics?.calinski_harabasz.toFixed(2)}</dd>
                                    </div>
                                    <div className="space-y-1">
                                        <dt className="font-medium text-muted-foreground">Davies-Bouldin</dt>
                                        <dd className="text-xl font-bold font-mono">{results.final_metrics?.davies_bouldin.toFixed(3)}</dd>
                                    </div>
                                </dl>
                                {results.optimal_k_recommendation && <Badge>Recommended clusters: {results.optimal_k_recommendation}</Badge>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}

    

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, ScanSearch } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';

interface DbscanResults {
    n_clusters: number;
    n_noise: number;
    n_samples: number;
    eps: number;
    min_samples: number;
    labels: number[];
}

interface FullAnalysisResponse {
    results: DbscanResults;
    plot: string;
}

interface DbscanPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DbscanPage({ data, numericHeaders, onLoadExample }: DbscanPageProps) {
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [eps, setEps] = useState<number>(0.5);
    const [minSamples, setMinSamples] = useState<number>(5);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
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

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('DBSCAN error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, eps, minSamples, toast]);
    
    if (!canRun) {
        const dbscanExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('dbscan'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">DBSCAN Clustering</CardTitle>
                        <CardDescription>
                           To perform DBSCAN, you need data with at least two numeric variables. Try an example dataset to get started.
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
                    <CardTitle className="font-headline">DBSCAN Clustering Setup</CardTitle>
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
                             <p className="text-xs text-muted-foreground mt-1">Max distance between two samples for one to be considered as in the neighborhood of the other.</p>
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
                            <p className="text-xs text-muted-foreground mt-1">The number of samples in a neighborhood for a point to be considered as a core point.</p>
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">DBSCAN Results</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Clusters Found</p><p className="text-2xl font-bold">{results.n_clusters}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Noise Points</p><p className="text-2xl font-bold">{results.n_noise}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Total Samples</p><p className="text-2xl font-bold">{results.n_samples}</p></div>
                        </CardContent>
                    </Card>

                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cluster Visualization</CardTitle>
                                <CardDescription>Clusters are visualized using the first two principal components.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="DBSCAN Cluster Plot" width={800} height={600} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to perform DBSCAN clustering.</p>
                </div>
            )}
        </div>
    );
}

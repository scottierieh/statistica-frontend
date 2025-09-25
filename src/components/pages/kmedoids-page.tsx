
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Binary, Bot, Users, Settings, FileSearch, MoveRight, HelpCircle } from 'lucide-react';
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
    interpretations: {
        overall_quality: string;
        cluster_profiles: string[];
        cluster_distribution: string;
    };
}

interface FullKMedoidsResponse {
    results: KMedoidsResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const kmedoidsExample = exampleDatasets.find(d => d.id === 'customer-segments');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Binary size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">K-Medoids Clustering (PAM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A robust alternative to K-Means that partitions data into clusters using actual data points as centers (medoids).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use K-Medoids?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           K-Medoids is less sensitive to outliers than K-Means because it uses medoids (the most centrally located data points within a cluster) as cluster centers instead of the mean. This makes it a more robust choice when your data contains noise or extreme values.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {kmedoidsExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(kmedoidsExample)}>
                                <Users className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{kmedoidsExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{kmedoidsExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variables:</strong> Choose two or more numeric variables to base the clustering on.</li>
                                <li><strong>Number of Clusters (K):</strong> Specify how many clusters you want to create.</li>
                                <li><strong>Run Analysis:</strong> The algorithm will partition your data into 'k' clusters, each represented by a medoid.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Medoids:</strong> Unlike K-Means, the cluster centers are actual data points from your dataset, making them directly interpretable.
                                </li>
                                <li>
                                    <strong>Silhouette Score:</strong> Measures how similar a data point is to its own cluster compared to others. Scores closer to +1 indicate well-defined, dense clusters.
                                </li>
                                 <li>
                                    <strong>Cluster Profiles:</strong> Examine the mean values for each cluster to understand its characteristics, even though the center is a medoid.
                                </li>
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

const InterpretationDisplay = ({ interpretations }: { interpretations: KMedoidsResults['interpretations'] | undefined }) => {
  if (!interpretations) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Bot /> Interpretation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
            <strong className="text-foreground">Overall Quality:</strong>
            <p dangerouslySetInnerHTML={{ __html: interpretations.overall_quality.replace(/\\n/g, '<br />') }} />
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-2">Cluster Profiles:</h4>
          <ul className="space-y-2 list-disc pl-5">
            {interpretations.cluster_profiles.map((profile, index) => (
              <li key={index} dangerouslySetInnerHTML={{ __html: profile }} />
            ))}
          </ul>
        </div>
        <div>
            <strong className="text-foreground">Distribution:</strong>
            <p dangerouslySetInnerHTML={{ __html: interpretations.cluster_distribution }} />
        </div>
      </CardContent>
    </Card>
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
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('K-Medoids error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nClusters, toast]);
    
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
                                A comprehensive overview of the K-Medoids clustering results. Medoids (cluster centers) are marked with an 'X'.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Comprehensive K-Medoids Plots" width={1500} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2">
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
                     <InterpretationDisplay interpretations={results.interpretations} />
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

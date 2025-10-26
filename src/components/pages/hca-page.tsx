
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, Bot, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
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
    interpretations: {
        overall_quality: string;
        cluster_profiles: string[];
        cluster_distribution: string;
    };
}

interface FullHcaResponse {
    results: HcaResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const hcaExample = exampleDatasets.find(d => d.id === 'customer-segments');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <GitBranch size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Hierarchical Cluster Analysis (HCA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        A clustering method that builds a hierarchy of clusters, either from the bottom up (agglomerative) or the top down (divisive).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use HCA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Hierarchical clustering is ideal for when you don't know the number of clusters in your data beforehand. It produces a dendrogram, a tree-like diagram that visualizes the cluster hierarchy, allowing you to understand how data points group together at different levels of similarity. This is particularly useful in fields like biology for gene analysis or in market research to understand customer taxonomies.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {hcaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(hcaExample)}>
                                <hcaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{hcaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{hcaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variables:</strong> Choose two or more numeric variables to base the clustering on.</li>
                                <li><strong>Linkage Method:</strong> Select how the distance between clusters is measured. 'Ward' is a popular default that minimizes variance within clusters.</li>
                                <li><strong>Distance Metric:</strong> Choose the metric to calculate distance between data points (e.g., 'Euclidean'). 'Ward' linkage only works with 'Euclidean'.</li>
                                <li><strong>Number of Clusters (Optional):</strong> You can specify the number of clusters to form. If left blank, the system will recommend an optimal number based on silhouette scores.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Dendrogram:</strong> The primary visualization for HCA. You can determine the number of clusters by "cutting" the tree at a certain height. The height of the links represents the distance between clusters.</li>
                                <li><strong>Silhouette Score Plot:</strong> Helps identify the optimal number of clusters. Look for the 'k' with the highest score.</li>
                                <li><strong>Cluster Profiles:</strong> Once clusters are formed, examine their mean values to understand their unique characteristics and assign meaningful labels.</li>
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


const InterpretationDisplay = ({ interpretations }: { interpretations: HcaResults['interpretations'] | undefined }) => {
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


interface HcaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function HcaPage({ data, numericHeaders, onLoadExample }: HcaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [linkageMethod, setLinkageMethod] = useState('ward');
    const [distanceMetric, setDistanceMetric] = useState('euclidean');
    const [nClusters, setNClusters] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullHcaResponse | null>(null);
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
                                placeholder={`Auto (e.g. ${results?.optimal_k_recommendation?.silhouette || '...'}`}
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
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Analysis Visualizations</CardTitle>
                                <CardDescription>
                                    A comprehensive overview of the clustering results, including the dendrogram, validation plots, and cluster distributions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="Comprehensive HCA Plots" width={1500} height={1800} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2">
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
                         <div className="space-y-4">
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
                                    </dl>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="font-headline">Optimal Cluster Recommendations</CardTitle></CardHeader>
                                <CardContent>
                                    <ul className="space-y-2 text-sm">
                                      {results.optimal_k_recommendation && Object.entries(results.optimal_k_recommendation).map(([method, k]) => (
                                        <li key={method} className="flex justify-between"><span>{method}:</span><Badge>{k} Clusters</Badge></li>
                                      ))}
                                    </ul>
                                </CardContent>
                            </Card>
                             {results.stability && (
                                <Card>
                                <CardHeader><CardTitle className="font-headline">Cluster Stability</CardTitle></CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <dt className="text-sm font-medium text-muted-foreground">Mean Stability</dt><dd className="text-base font-mono">{results.stability.mean.toFixed(3)}</dd>
                                        <dt className="text-sm font-medium text-muted-foreground">Std. Dev.</dt><dd className="text-base font-mono">{results.stability.std.toFixed(3)}</dd>
                                    </dl>
                                </CardContent>
                            </Card>
                            )}
                         </div>
                    </div>
                    <InterpretationDisplay interpretations={results.interpretations} />
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


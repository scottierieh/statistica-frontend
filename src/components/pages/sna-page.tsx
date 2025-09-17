
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SnaResults {
    metrics: {
        nodes: number;
        edges: number;
        density: number;
    };
    top_nodes: {
        degree: [string, number][];
        betweenness: [string, number][];
        closeness: [string, number][];
    };
    communities: string[][];
}

interface FullAnalysisResponse {
    results: SnaResults;
    plot: string;
}

interface SnaPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SnaPage({ data, allHeaders, onLoadExample }: SnaPageProps) {
    const { toast } = useToast();
    const [sourceCol, setSourceCol] = useState<string | undefined>();
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [weightCol, setWeightCol] = useState<string | undefined>();
    const [isDirected, setIsDirected] = useState(false);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    
    useEffect(() => {
        setSourceCol(allHeaders[0]);
        setTargetCol(allHeaders.length > 1 ? allHeaders[1] : undefined);
        setAnalysisResult(null);
    }, [data, allHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!sourceCol || !targetCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a source and a target column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/sna', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    sourceCol, 
                    targetCol,
                    weightCol: weightCol === 'none' ? undefined : weightCol,
                    isDirected
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('SNA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, sourceCol, targetCol, weightCol, isDirected, toast]);

    if (!canRun) {
        const snaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('sna'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Social Network Analysis (SNA)</CardTitle>
                        <CardDescription>
                           To analyze a network, you need data with at least two columns representing connections (source and target).
                        </CardDescription>
                    </CardHeader>
                     {snaExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(snaExamples[0])} className="w-full">
                                Load {snaExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    const renderTopNodesTable = (nodes: [string, number][], title: string) => (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Node</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {nodes.map(([node, score], i) => (
                            <TableRow key={i}><TableCell>{node}</TableCell><TableCell className="font-mono text-right">{score.toFixed(4)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Network Analysis Setup</CardTitle>
                    <CardDescription>Define the connections in your network.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div><Label>Source Column</Label><Select value={sourceCol} onValueChange={setSourceCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Target Column</Label><Select value={targetCol} onValueChange={setTargetCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h => h !== sourceCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Weight Column (Optional)</Label><Select value={weightCol} onValueChange={(v) => setWeightCol(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{allHeaders.filter(h => h !== sourceCol && h !== targetCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch id="is-directed" checked={isDirected} onCheckedChange={setIsDirected} />
                        <Label htmlFor="is-directed">Directed Graph (Arrows indicate direction)</Label>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !sourceCol || !targetCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Analyze Network</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Network Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Nodes</p><p className="text-2xl font-bold">{results.metrics.nodes}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Edges</p><p className="text-2xl font-bold">{results.metrics.edges}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Density</p><p className="text-2xl font-bold">{results.metrics.density.toFixed(4)}</p></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Network Graph</CardTitle>
                            <CardDescription>Node size and color correspond to degree centrality (number of connections).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Social Network Graph" width={1200} height={1200} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                   
                    <Tabs defaultValue="centrality">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="centrality">Centrality Measures</TabsTrigger>
                            <TabsTrigger value="communities">Community Detection</TabsTrigger>
                        </TabsList>
                        <TabsContent value="centrality" className="mt-4">
                             <div className="grid md:grid-cols-3 gap-4">
                                {renderTopNodesTable(results.top_nodes.degree, 'Top Nodes by Degree')}
                                {renderTopNodesTable(results.top_nodes.betweenness, 'Top Nodes by Betweenness')}
                                {renderTopNodesTable(results.top_nodes.closeness, 'Top Nodes by Closeness')}
                            </div>
                        </TabsContent>
                         <TabsContent value="communities" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Detected Communities (Louvain Method)</CardTitle></CardHeader>
                                <CardContent>
                                    {results.communities.length > 0 ? (
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {results.communities.map((community, i) => (
                                                <Card key={i}>
                                                    <CardHeader><CardTitle>Community {i + 1}</CardTitle><CardDescription>{community.length} members</CardDescription></CardHeader>
                                                    <CardContent className="text-sm">
                                                        <p>{community.join(', ')}</p>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>No communities detected or analysis was run on a directed graph.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}

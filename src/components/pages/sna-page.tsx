
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, Users, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[600px]" />,
});

interface SnaMetrics {
    nodes: number;
    edges: number;
    density: number;
    is_connected: boolean;
    components: number;
}
interface CentralityMeasures {
    degree: { [key: string]: number };
    betweenness: { [key: string]: number };
    closeness: { [key: string]: number };
    eigenvector: { [key: string]: number };
}
interface TopNode {
    0: string;
    1: number;
}
interface SnaResults {
    metrics: SnaMetrics;
    centrality: CentralityMeasures;
    top_nodes: {
        degree: TopNode[];
        betweenness: TopNode[];
        closeness: TopNode[];
        eigenvector: TopNode[];
    };
    communities: string[][];
}
interface FullAnalysisResponse {
    results: SnaResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const snaExample = exampleDatasets.find(d => d.id === 'sna-emails');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Social Network Analysis (SNA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Visualize and analyze relationships between entities to uncover key players, communities, and network structures.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Social Network Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            SNA provides a mathematical and visual way to understand complex relationships. It's used in sociology, business, and computer science to identify influential individuals (centrality), detect communities, and understand the flow of information or resources within a network.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {snaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(snaExample)}>
                                <snaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{snaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{snaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Data Format:</strong> Your data should be an "edge list" with at least a 'source' and 'target' column, where each row represents a connection. An optional 'weight' column can represent the strength of the connection.</li>
                                <li><strong>Source & Target:</strong> Select the columns that identify the starting and ending nodes of each relationship.</li>
                                <li><strong>Weight (Optional):</strong> Select a numeric column for the connection strength.</li>
                                <li><strong>Directed Graph:</strong> Choose if the relationship has a direction (e.g., A follows B is different from B follows A).</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Centrality Measures:</strong> Identify key nodes. High 'Degree' means many connections, high 'Betweenness' means the node is a bridge between others, and high 'Closeness' means the node can reach others quickly.</li>
                                <li><strong>Network Graph:</strong> Visualize the entire network. The size of the nodes corresponds to their degree centrality.</li>
                                <li><strong>Communities:</strong> The analysis automatically detects subgroups or communities within the network.</li>
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


interface SnaPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SnaPage({ data, allHeaders, onLoadExample }: SnaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [sourceCol, setSourceCol] = useState<string | undefined>();
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [weightCol, setWeightCol] = useState<string | undefined>();
    const [isDirected, setIsDirected] = useState(false);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    
    const { numericHeaders, categoricalHeaders } = useMemo(() => {
        if (!data || data.length === 0) return { numericHeaders: [], categoricalHeaders: [] };
        const numeric: string[] = [];
        const categorical: string[] = [];
        allHeaders.forEach(header => {
            if (data.every(row => typeof row[header] === 'number')) {
                numeric.push(header);
            } else {
                categorical.push(header);
            }
        });
        return { numericHeaders: numeric, categoricalHeaders: categorical };
    }, [data, allHeaders]);

    useEffect(() => {
        setSourceCol(allHeaders.find(h => h.toLowerCase().includes('source') || h.toLowerCase().includes('from')) || allHeaders[0]);
        setTargetCol(allHeaders.find(h => h.toLowerCase().includes('target') || h.toLowerCase().includes('to')) || allHeaders[1]);
        setWeightCol(numericHeaders.find(h => h.toLowerCase().includes('weight')));
        setView(canRun ? 'main' : 'intro');
        setAnalysisResult(null);
    }, [data, allHeaders, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!sourceCol || !targetCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a source and target column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/sna', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, sourceCol, targetCol, weightCol, isDirected })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'SNA Complete', description: 'Network has been analyzed.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, sourceCol, targetCol, weightCol, isDirected, toast]);

    const results = analysisResult?.results;

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Social Network Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                        <div><Label>Source Column</Label><Select value={sourceCol} onValueChange={setSourceCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Target Column</Label><Select value={targetCol} onValueChange={setTargetCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.filter(h => h !== sourceCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Weight Column (Optional)</Label><Select value={weightCol} onValueChange={v => setWeightCol(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="flex items-center space-x-2 pt-6"><Switch id="directed" checked={isDirected} onCheckedChange={setIsDirected} /><Label htmlFor="directed">Directed Graph</Label></div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !sourceCol || !targetCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Analyze Network</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Network Graph</CardTitle>
                            <CardDescription>An interactive visualization of the network. Node size is based on degree centrality.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Plot
                                data={JSON.parse(analysisResult.plot).data}
                                layout={JSON.parse(analysisResult.plot).layout}
                                useResizeHandler={true}
                                className="w-full h-[600px]"
                            />
                        </CardContent>
                    </Card>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                         <Card>
                            <CardHeader><CardTitle>Network Metrics</CardTitle></CardHeader>
                            <CardContent>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt>Nodes:</dt><dd className="font-mono">{results.metrics.nodes}</dd></div>
                                    <div className="flex justify-between"><dt>Edges:</dt><dd className="font-mono">{results.metrics.edges}</dd></div>
                                    <div className="flex justify-between"><dt>Density:</dt><dd className="font-mono">{results.metrics.density.toFixed(4)}</dd></div>
                                    <div className="flex justify-between"><dt>Connected:</dt><dd>{results.metrics.is_connected ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</dd></div>
                                    <div className="flex justify-between"><dt>Components:</dt><dd className="font-mono">{results.metrics.components}</dd></div>
                                </dl>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Top 5 Nodes by Degree</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Node</TableHead><TableHead className="text-right">Degree</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {results.top_nodes.degree.map(([node, value]) => <TableRow key={node}><TableCell>{node}</TableCell><TableCell className="text-right font-mono">{value.toFixed(3)}</TableCell></TableRow>)}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Top 5 Nodes by Betweenness</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Node</TableHead><TableHead className="text-right">Betweenness</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {results.top_nodes.betweenness.map(([node, value]) => <TableRow key={node}><TableCell>{node}</TableCell><TableCell className="text-right font-mono">{value.toFixed(3)}</TableCell></TableRow>)}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Detected Communities</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            {results.communities.length > 0 ? results.communities.map((community, i) => (
                                <Card key={i} className="flex-1 min-w-[200px]">
                                    <CardHeader className="pb-2"><CardTitle className="text-base">Community {i+1}</CardTitle></CardHeader>
                                    <CardContent><p className="text-sm text-muted-foreground">{community.join(', ')}</p></CardContent>
                                </Card>
                            )) : <p>No distinct communities were detected.</p>}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

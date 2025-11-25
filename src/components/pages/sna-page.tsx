'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, Users, HelpCircle, MoveRight, Settings, FileSearch, BarChart, BookOpen, GitMerge, Share2, Layers, Activity, Hash, Target, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';
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

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: SnaResults }) => {
    const density = results.metrics.density;
    const topDegreeNode = results.top_nodes.degree[0];
    const numCommunities = results.communities.length;
    
    const getDensityInterpretation = (d: number) => {
        if (d >= 0.5) return 'Very dense';
        if (d >= 0.3) return 'Dense';
        if (d >= 0.1) return 'Moderate';
        return 'Sparse';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Network Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Network Size
                            </p>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.metrics.nodes}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Nodes ({results.metrics.edges} edges)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Density Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Density
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(density * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getDensityInterpretation(density)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Most Central Node Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Hub Node
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-semibold truncate" title={topDegreeNode?.[0]}>
                            {topDegreeNode?.[0] || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Degree: {topDegreeNode?.[1]?.toFixed(0) || 0}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Communities Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Communities
                            </p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {numCommunities || 0}
                        </p>
                        <Badge variant={results.metrics.is_connected ? 'default' : 'secondary'}>
                            {results.metrics.is_connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const SnaOverview = ({ sourceCol, targetCol, weightCol, isDirected, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Column configuration
        if (sourceCol && targetCol) {
            overview.push(`Source: ${sourceCol} → Target: ${targetCol}`);
            if (weightCol) {
                overview.push(`Edge weights: ${weightCol}`);
            } else {
                overview.push('Unweighted network');
            }
            overview.push(isDirected ? 'Directed graph' : 'Undirected graph');
        } else {
            overview.push('Select source and target columns');
        }

        // Data size
        overview.push(`${data.length} edges in dataset`);
        
        // Graph type implications
        if (isDirected) {
            overview.push('Directed: A→B is different from B→A');
            overview.push('Centrality measures account for direction');
        } else {
            overview.push('Undirected: A—B is same as B—A');
            overview.push('Symmetric relationships');
        }
        
        // Analysis info
        overview.push('Community detection using Louvain method');
        overview.push('Four centrality measures calculated');
        overview.push('Interactive network visualization');

        return overview;
    }, [sourceCol, targetCol, weightCol, isDirected, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const snaExample = exampleDatasets.find(d => d.id === 'sna-emails');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Network className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Social Network Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Visualize relationships and identify key players in complex networks
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitMerge className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Network Structure</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reveal hidden patterns and connections
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Share2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Key Players</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find influential nodes and bridges
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Communities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Detect clusters and subgroups automatically
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use SNA
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Social Network Analysis to understand relationships and information flow in any system 
                            with connections - social media networks, organizational structures, communication patterns, 
                            collaboration networks, or disease transmission pathways. Perfect for identifying influencers, 
                            detecting communities, and understanding network resilience.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Data:</strong> Edge list format</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Source:</strong> Starting node column</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Target:</strong> Ending node column</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Weight:</strong> Optional edge strength</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Degree:</strong> Number of connections</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Betweenness:</strong> Bridge importance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Closeness:</strong> Network centrality</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Density:</strong> Connection saturation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {snaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(snaExample)} size="lg">
                                <Network className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
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

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, sourceCol, targetCol, weightCol, isDirected, toast]);

    const handleLoadExampleData = () => {
        const snaExample = exampleDatasets.find(ex => ex.id === 'sna-emails');
        if (snaExample) {
            onLoadExample(snaExample);
            setView('main');
        }
    };

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }

    const results = analysisResult?.results;
    const plotData = analysisResult ? JSON.parse(analysisResult.plot) : null;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Social Network Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Configure your network data structure and analysis parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                        <div>
                            <Label>Source Column</Label>
                            <Select value={sourceCol} onValueChange={setSourceCol}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Target Column</Label>
                            <Select value={targetCol} onValueChange={setTargetCol}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {allHeaders.filter(h => h !== sourceCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Weight Column (Optional)</Label>
                            <Select value={weightCol} onValueChange={v => setWeightCol(v === 'none' ? undefined : v)}>
                                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                            <Switch id="directed" checked={isDirected} onCheckedChange={setIsDirected} />
                            <Label htmlFor="directed">Directed Graph</Label>
                        </div>
                    </div>
                    
                    {/* Overview Component */}
                    <SnaOverview 
                        sourceCol={sourceCol}
                        targetCol={targetCol}
                        weightCol={weightCol}
                        isDirected={isDirected}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !sourceCol || !targetCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Analyze Network</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Analyzing network structure...</p>
                        <Skeleton className="h-[600px] w-full"/>
                    </CardContent>
                </Card>
            )}

            {results && analysisResult?.plot && (
                 <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Detailed Analysis - 그래프 위에 배치 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Network className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Summary - Primary Color */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <Network className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Summary</h3>
                                </div>
                                <div className="text-sm text-foreground/80 leading-relaxed">
                                    {(() => {
                                        const density = results.metrics.density;
                                        const densityDesc = density >= 0.5 ? 'very dense' : density >= 0.3 ? 'dense' : density >= 0.1 ? 'moderately connected' : 'sparse';
                                        const hubNode = results.top_nodes.degree[0]?.[0];
                                        const bridgeNode = results.top_nodes.betweenness[0]?.[0];
                                        
                                        return (
                                            <>
                                                <strong>Network analyzed with {results.metrics.nodes} nodes and {results.metrics.edges} edges.</strong> The network is {densityDesc} with a density of {(density * 100).toFixed(1)}%. 
                                                {results.metrics.is_connected 
                                                    ? ' All nodes are connected, forming a single component.' 
                                                    : ` The network has ${results.metrics.components} disconnected components.`}
                                                {hubNode && ` The most connected node is "${hubNode}".`}
                                                {bridgeNode && bridgeNode !== hubNode && ` The key bridge node is "${bridgeNode}".`}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Statistical Insights - Blue Color */}
                            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-blue-500/10 rounded-md">
                                        <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Statistical Insights</h3>
                                </div>
                                <div className="space-y-3">
                                    {(() => {
                                        const insights = [];
                                        const topDegree = results.top_nodes.degree[0];
                                        const topBetweenness = results.top_nodes.betweenness[0];
                                        const topCloseness = results.top_nodes.closeness[0];
                                        const topEigenvector = results.top_nodes.eigenvector[0];
                                        
                                        if (topDegree) {
                                            insights.push(`<strong>Degree Centrality:</strong> "${topDegree[0]}" has the most connections (${topDegree[1].toFixed(3)}), making it the most active node in the network.`);
                                        }
                                        if (topBetweenness) {
                                            insights.push(`<strong>Betweenness Centrality:</strong> "${topBetweenness[0]}" (${topBetweenness[1].toFixed(3)}) serves as a critical bridge, controlling information flow between different parts of the network.`);
                                        }
                                        if (topCloseness) {
                                            insights.push(`<strong>Closeness Centrality:</strong> "${topCloseness[0]}" (${topCloseness[1].toFixed(3)}) can reach all other nodes most efficiently, positioned at the network's center.`);
                                        }
                                        if (topEigenvector) {
                                            insights.push(`<strong>Eigenvector Centrality:</strong> "${topEigenvector[0]}" (${topEigenvector[1].toFixed(3)}) is connected to other highly connected nodes, indicating influence.`);
                                        }
                                        insights.push(`<strong>Community Structure:</strong> ${results.communities.length} distinct communities detected, suggesting ${results.communities.length <= 2 ? 'a relatively unified network' : results.communities.length <= 5 ? 'moderate clustering' : 'significant fragmentation'}.`);
                                        
                                        return insights.map((insight, idx) => (
                                            <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Recommendations - Amber Color */}
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-500/10 rounded-md">
                                        <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Recommendations</h3>
                                </div>
                                <div className="space-y-3">
                                    {(() => {
                                        const recs = [];
                                        const density = results.metrics.density;
                                        const hubNode = results.top_nodes.degree[0]?.[0];
                                        const bridgeNode = results.top_nodes.betweenness[0]?.[0];
                                        
                                        if (hubNode) {
                                            recs.push(`Monitor "${hubNode}" as a key hub - its removal would significantly impact network connectivity.`);
                                        }
                                        if (bridgeNode && bridgeNode !== hubNode) {
                                            recs.push(`"${bridgeNode}" acts as a critical bridge - strengthening alternative paths could improve network resilience.`);
                                        }
                                        if (density < 0.1) {
                                            recs.push('The network is sparse - consider strategies to increase connectivity between isolated groups.');
                                        } else if (density > 0.5) {
                                            recs.push('High density suggests strong interconnection - focus on maintaining key relationships rather than adding new ones.');
                                        }
                                        if (!results.metrics.is_connected) {
                                            recs.push(`The network has ${results.metrics.components} disconnected components - identify bridge opportunities to unify the network.`);
                                        }
                                        if (results.communities.length > 3) {
                                            recs.push('Multiple communities detected - consider cross-community initiatives to improve information sharing.');
                                        }
                                        recs.push('Use centrality rankings to identify potential leaders, influencers, or points of failure in the network.');
                                        
                                        return recs.map((rec, idx) => (
                                            <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                                <span>{rec}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Network Graph</CardTitle>
                            <CardDescription>Interactive visualization of the network. Node size represents degree centrality.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Plot
                                data={plotData.data}
                                layout={plotData.layout}
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
                        <CardHeader>
                            <CardTitle>Detected Communities</CardTitle>
                            <CardDescription>Automatically identified subgroups within the network</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            {results.communities.length > 0 ? results.communities.map((community, i) => (
                                <Card key={i} className="flex-1 min-w-[200px]">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Community {i+1}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{community.join(', ')}</p>
                                    </CardContent>
                                </Card>
                            )) : <p className="text-muted-foreground">No distinct communities were detected in this network.</p>}
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Network className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure your network data and click &apos;Analyze Network&apos; to see results.</p>
                </div>
            )}
        </div>
    );
}


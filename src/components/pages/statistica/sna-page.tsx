'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Network, HelpCircle, Settings, FileSearch, FileType, Database, Settings2, CheckCircle, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, ChevronDown, Lightbulb, AlertTriangle, ArrowRight, Download, FileSpreadsheet, ImageIcon, Sparkles, Users, Share2, Target, Code, Copy, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import { Separator } from '@/components/ui/separator';


const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => <Skeleton className="w-full h-[600px]" /> });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/sna_analysis.py?alt=media";

// Statistical terms glossary for Social Network Analysis
const snaTermDefinitions: Record<string, string> = {
    "Social Network Analysis (SNA)": "A methodology for investigating social structures through graph theory. It characterizes networked structures in terms of nodes (individual actors, people, or things) and the ties, edges, or links that connect them.",
    "Node (Vertex)": "An individual entity in the network. In social networks, nodes typically represent people, organizations, or other entities being studied.",
    "Edge (Tie/Link)": "A connection between two nodes representing a relationship. Can be directed (A→B) or undirected (A↔B), and may have weights.",
    "Directed Graph": "A network where edges have direction (A→B is different from B→A). Used for relationships like email sent, follows, or citations.",
    "Undirected Graph": "A network where edges have no direction (A↔B). Used for mutual relationships like friendships, collaborations, or co-occurrences.",
    "Weighted Edge": "An edge with a numerical value indicating strength, frequency, or intensity of the connection (e.g., number of emails exchanged).",
    "Network Density": "The ratio of actual connections to all possible connections. Density = 2E / (N × (N-1)) for undirected graphs, where E = edges and N = nodes.",
    "Connected Network": "A network where every node can reach every other node through some path. Disconnected networks have isolated components.",
    "Component": "A maximal connected subgraph. A network with multiple components has groups of nodes that cannot reach each other.",
    "Degree Centrality": "The number of direct connections a node has. High degree = hub or popular node. Normalized degree = degree / (N-1).",
    "In-Degree": "In directed networks, the number of incoming edges to a node. Indicates popularity or prestige.",
    "Out-Degree": "In directed networks, the number of outgoing edges from a node. Indicates activity or influence attempts.",
    "Betweenness Centrality": "Measures how often a node lies on the shortest path between other nodes. High betweenness = bridge, broker, or gatekeeper role.",
    "Closeness Centrality": "Measures how close a node is to all other nodes. High closeness = efficient access to the entire network, quick information spread.",
    "Eigenvector Centrality": "Measures influence based on connections to other influential nodes. High eigenvector = connected to other important nodes.",
    "PageRank": "A variant of eigenvector centrality used by Google. Considers both the number and quality of links to a node.",
    "Shortest Path": "The minimum number of edges needed to travel from one node to another. Used in calculating betweenness and closeness.",
    "Average Path Length": "The average shortest path between all pairs of nodes. Indicates how quickly information or disease spreads through the network.",
    "Diameter": "The longest shortest path in the network. Represents the maximum distance between any two nodes.",
    "Clustering Coefficient": "Measures the degree to which nodes tend to cluster together. High clustering = friends of friends are also friends.",
    "Community Detection": "Algorithms to identify groups of nodes more densely connected to each other than to the rest of the network.",
    "Louvain Algorithm": "A popular community detection algorithm that optimizes modularity. Fast and effective for large networks.",
    "Modularity": "A measure of how well a network divides into communities. Higher modularity = clearer community structure.",
    "Hub": "A node with many connections. Hubs are important for network connectivity and information dissemination.",
    "Bridge": "A node or edge whose removal would disconnect the network or significantly increase path lengths.",
    "Structural Hole": "A gap between two groups in a network. Nodes spanning structural holes have brokerage advantages.",
    "Homophily": "The tendency of similar nodes to be connected. 'Birds of a feather flock together.'",
    "Triadic Closure": "The tendency for two nodes with a common neighbor to become connected themselves. Drives clustering.",
    "Small World Network": "A network with high clustering and short average path length. Most real-world social networks exhibit this property."
};

interface SnaMetrics { nodes: number; edges: number; density: number; is_connected: boolean; components: number; }
interface CentralityMeasures { degree: { [key: string]: number }; betweenness: { [key: string]: number }; closeness: { [key: string]: number }; eigenvector: { [key: string]: number }; }
type TopNode = [string, number];
interface SnaResults { metrics: SnaMetrics; centrality: CentralityMeasures; top_nodes: { degree: TopNode[]; betweenness: TopNode[]; closeness: TopNode[]; eigenvector: TopNode[]; }; communities: string[][]; }
interface FullAnalysisResponse { results: SnaResults; plot: string; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen, code]);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch code: ${response.status}`);
            }
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: 'Failed to load Python code' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sna_analysis.py';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!', description: 'Python file saved' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        Python Code - Social Network Analysis
                    </DialogTitle>
                    <DialogDescription>
                        View, copy, or download the Python code used for this analysis.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex gap-2 py-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopy} 
                        disabled={isLoading || !!error}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload} 
                        disabled={isLoading || !!error}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download .py
                    </Button>
                    {error && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchCode}
                        >
                            <Loader2 className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    )}
                </div>
                
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-3 text-slate-300">Loading code...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center">
                            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                            <p className="text-slate-300 mb-2">Failed to load code</p>
                            <p className="text-slate-500 text-sm">{error}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950">
                            <pre className="p-4 text-sm text-slate-50 overflow-x-auto">
                                <code className="language-python">{code}</code>
                            </pre>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Social Network Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in social network analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(snaTermDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold">{term}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};


const SNAGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Social Network Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is SNA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Network className="w-4 h-4" />
                What is Social Network Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                SNA studies relationships and flows between people, groups, organizations, or other 
                entities. It uses <strong>graph theory</strong> to model networks as nodes (entities) 
                and edges (connections).
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Questions SNA Answers:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Who are the most influential/connected individuals?<br/>
                    • Who bridges different groups?<br/>
                    • Are there distinct communities or clusters?<br/>
                    • How quickly can information spread?
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Network Types */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Directed vs Undirected Networks
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Undirected</p>
                  <p className="text-xs text-muted-foreground">
                    Edges have no direction (A↔B).
                    <br/>• Friendships, collaborations
                    <br/>• Co-authorship, co-membership
                    <br/>• If A connects to B, B connects to A
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Directed</p>
                  <p className="text-xs text-muted-foreground">
                    Edges have direction (A→B ≠ B→A).
                    <br/>• Email sent, follows, citations
                    <br/>• Advice seeking, reporting lines
                    <br/>• In-degree vs out-degree matters
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Centrality Measures */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Centrality Measures
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Centrality identifies the most important nodes in a network. Different measures 
                capture different types of importance.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Degree Centrality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>What:</strong> Number of direct connections a node has.
                    <br/><strong>Meaning:</strong> Popularity, activity level, local influence.
                    <br/><strong>High degree =</strong> Hub, well-connected, lots of direct contacts.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Betweenness Centrality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>What:</strong> How often a node lies on shortest paths between others.
                    <br/><strong>Meaning:</strong> Brokerage, control over information flow, bridging role.
                    <br/><strong>High betweenness =</strong> Gatekeeper, broker, critical for connectivity.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Closeness Centrality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>What:</strong> Average distance from a node to all other nodes.
                    <br/><strong>Meaning:</strong> Efficiency, speed of reaching others, independence.
                    <br/><strong>High closeness =</strong> Can quickly interact with entire network.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Eigenvector Centrality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>What:</strong> Influence based on connections to other influential nodes.
                    <br/><strong>Meaning:</strong> Quality of connections matters, not just quantity.
                    <br/><strong>High eigenvector =</strong> Connected to other important nodes.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Network Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Network-Level Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Density</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ratio of actual connections to all possible connections.
                    <br/>• <strong>Dense network (&gt;30%):</strong> Tight-knit, high cohesion
                    <br/>• <strong>Sparse network (&lt;10%):</strong> Loosely connected, fragmented
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Connectedness</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Whether all nodes can reach all other nodes.
                    <br/>• <strong>Connected:</strong> Single component, everyone reachable
                    <br/>• <strong>Disconnected:</strong> Multiple isolated components
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Components</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of separate, disconnected subgraphs.
                    <br/>Multiple components = isolated groups that don&apos;t interact.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Community Detection */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Community Detection
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  Communities are groups of nodes more densely connected to each other than to 
                  the rest of the network. We use the <strong>Louvain algorithm</strong>.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-background border">
                    <strong>Louvain Algorithm:</strong> Optimizes modularity by iteratively 
                    moving nodes between communities until no improvement is possible. Fast 
                    and effective for large networks.
                  </div>
                  <div className="p-2 rounded bg-background border">
                    <strong>Modularity:</strong> Measures how well the network divides into 
                    communities. Higher modularity = clearer community structure.
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Interpreting Your Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">High Degree Node</p>
                  <p className="text-xs text-muted-foreground">
                    Hub or popular entity. Good for broadcasting information. 
                    Removing it may fragment local connections.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">High Betweenness Node</p>
                  <p className="text-xs text-muted-foreground">
                    Bridge or gatekeeper. Controls information flow between groups. 
                    Removing it may disconnect the network.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">High Closeness Node</p>
                  <p className="text-xs text-muted-foreground">
                    Central position. Can reach everyone quickly. 
                    Good for efficient information dissemination.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">High Eigenvector Node</p>
                  <p className="text-xs text-muted-foreground">
                    Influential through connections. Connected to other important nodes. 
                    Good for spreading influence.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ensure source/target columns are correct</li>
                    <li>• Remove self-loops if not meaningful</li>
                    <li>• Consider edge direction carefully</li>
                    <li>• Use weights if available and meaningful</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Multiple centrality measures capture different aspects</li>
                    <li>• High degree ≠ high influence always</li>
                    <li>• Consider network context and domain</li>
                    <li>• Communities may overlap in reality</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Applications</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Organizational communication patterns</li>
                    <li>• Identifying key stakeholders</li>
                    <li>• Information diffusion analysis</li>
                    <li>• Team structure optimization</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report N nodes, E edges, density</li>
                    <li>• Include network visualization</li>
                    <li>• List top nodes by each centrality</li>
                    <li>• Describe community structure</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> SNA reveals structural patterns 
                in relationships, but context matters. A high-centrality node might be important 
                for information flow but not for decision-making. Combine network metrics with 
                domain knowledge for meaningful insights.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'sna-emails');
    
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
                        Visualize and analyze relationships between entities
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Key Players</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify influential nodes using centrality
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Share2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Communities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Detect subgroups and clusters
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Network className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Network Structure</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Understand density and connectivity
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Analyze relationships, identify key players, detect communities, and understand information flow in your network data.
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
                                        <span><strong>Source column:</strong> From node (required)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Target column:</strong> To node (required)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Weight column:</strong> Connection strength (optional)</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You&apos;ll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Centrality:</strong> Degree, betweenness, closeness</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Structure:</strong> Density, connectivity, components</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Communities:</strong> Louvain algorithm clustering</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Network className="mr-2 h-5 w-5" />
                                Load Example Network Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


interface SnaPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function SnaPage({ data, allHeaders, onLoadExample }: SnaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [sourceCol, setSourceCol] = useState<string | undefined>();
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [weightCol, setWeightCol] = useState<string | undefined>();
    const [isDirected, setIsDirected] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    
    const numericHeaders = useMemo(() => {
        if (!data || data.length === 0) return [];
        return allHeaders.filter(header => data.every(row => typeof row[header] === 'number'));
    }, [data, allHeaders]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Source column selected', passed: !!sourceCol, message: sourceCol ? `Selected: ${sourceCol}` : 'Required field' });
        checks.push({ label: 'Target column selected', passed: !!targetCol, message: targetCol ? `Selected: ${targetCol}` : 'Required field' });
        checks.push({ label: 'Columns are different', passed: sourceCol !== targetCol, message: sourceCol !== targetCol ? 'Valid configuration' : 'Source and target must differ' });
        checks.push({ label: 'Sufficient edges', passed: data.length >= 3, message: `${data.length} edges in dataset` });
        return checks;
    }, [sourceCol, targetCol, data.length]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    useEffect(() => {
        setSourceCol(allHeaders.find(h => h.toLowerCase().includes('source') || h.toLowerCase().includes('from')) || allHeaders[0]);
        setTargetCol(allHeaders.find(h => h.toLowerCase().includes('target') || h.toLowerCase().includes('to')) || allHeaders[1]);
        setWeightCol(numericHeaders.find(h => h.toLowerCase().includes('weight')));
        setView(canRun ? 'main' : 'intro');
        setAnalysisResult(null);
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [data, allHeaders, numericHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `SNA_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const { results } = analysisResult;
        let csv = "SOCIAL NETWORK ANALYSIS REPORT\n\n";
        csv += "NETWORK METRICS\n";
        csv += Papa.unparse([results.metrics]) + "\n\n";
        csv += "TOP NODES BY DEGREE\n";
        csv += Papa.unparse(results.top_nodes.degree.map(([node, val]) => ({ node, degree: val }))) + "\n\n";
        csv += "TOP NODES BY BETWEENNESS\n";
        csv += Papa.unparse(results.top_nodes.betweenness.map(([node, val]) => ({ node, betweenness: val }))) + "\n\n";
        csv += "COMMUNITIES\n";
        results.communities.forEach((comm, i) => { csv += `Community ${i + 1}: ${comm.join(', ')}\n`; });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `SNA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/sna-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    sourceCol,
                    targetCol,
                    weightCol,
                    isDirected,
                    plot: null
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `SNA_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, sourceCol, targetCol, weightCol, isDirected, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!sourceCol || !targetCol) {
            toast({ variant: 'destructive', title: 'Error', description: 'Select source and target columns.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/sna`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, sourceCol, targetCol, weightCol, isDirected })
            });
            if (!response.ok) throw new Error((await response.json()).error || 'API error');
            const result: FullAnalysisResponse = await response.json();
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: 'Network has been analyzed.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, sourceCol, targetCol, weightCol, isDirected, toast]);

    if (!canRun || view === 'intro') return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = step.id === currentStep;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button key={step.id} onClick={() => isAccessible && goToStep(step.id as Step)} disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <SNAGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Social Network Analysis</h1>
                    <p className="text-muted-foreground mt-1">Analyze relationships and network structure</p>
                </div>
                {/* 👇 버튼 수정 */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
                        <HelpCircle className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
            <ProgressBar />
            
            <div className="min-h-[500px]">
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Edge Columns</CardTitle><CardDescription>Define source and target nodes</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Source Column (From)</Label><Select value={sourceCol} onValueChange={setSourceCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Target Column (To)</Label><Select value={targetCol} onValueChange={setTargetCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allHeaders.filter(h => h !== sourceCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground"><strong>{data.length}</strong> edges in dataset</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!sourceCol || !targetCol}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Network Settings</CardTitle><CardDescription>Configure analysis options</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Weight Column (Optional)</Label><Select value={weightCol || '_none'} onValueChange={v => setWeightCol(v === '_none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="_none">None</SelectItem>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Connection strength/frequency</p></div>
                                <div className="space-y-2 flex flex-col justify-center"><div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-xl"><Switch id="directed" checked={isDirected} onCheckedChange={setIsDirected} /><div><Label htmlFor="directed" className="cursor-pointer">Directed Graph</Label><p className="text-xs text-muted-foreground">A→B differs from B→A</p></div></div></div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-muted-foreground">Source:</span> <span className="font-medium">{sourceCol}</span></div><div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{targetCol}</span></div><div><span className="text-muted-foreground">Weight:</span> <span className="font-medium">{weightCol || 'None'}</span></div><div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{isDirected ? 'Directed' : 'Undirected'}</span></div></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            {validationChecks.map((check, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${check.passed ? 'bg-primary/5 border-primary/30' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                    <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}<div><p className="font-medium text-sm">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                                    <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? 'Pass' : 'Fail'}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                </Card>
            )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Network Summary</CardTitle><CardDescription>{results.metrics.nodes} nodes, {results.metrics.edges} edges</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${results.metrics.is_connected ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${results.metrics.is_connected ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className={`font-bold ${results.metrics.is_connected ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Network has <strong>{results.metrics.nodes} nodes</strong> and <strong>{results.metrics.edges} edges</strong></p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${results.metrics.is_connected ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Network density: <strong>{(results.metrics.density * 100).toFixed(1)}%</strong> of possible connections exist</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${results.metrics.is_connected ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Detected <strong>{results.communities.length} communities</strong> in the network</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${results.metrics.is_connected ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Most connected node: <strong>{results.top_nodes.degree[0]?.[0] || 'N/A'}</strong></p></div>
                                </div>
                            </div>
                            <div className={`rounded-xl p-5 border ${results.metrics.is_connected ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <div className="flex items-start gap-3">{results.metrics.is_connected ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{results.metrics.is_connected ? 'Connected Network ✓' : 'Fragmented Network'}</p><p className="text-sm text-muted-foreground mt-1">{results.metrics.is_connected ? 'All nodes can reach each other.' : `Network has ${results.metrics.components} disconnected components.`}</p></div></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Nodes</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.nodes}</p><p className="text-xs text-muted-foreground">Unique entities</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Edges</p><Share2 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.edges}</p><p className="text-xs text-muted-foreground">Connections</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Density</p><Network className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.density * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Connectedness</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Communities</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.communities.length}</p><p className="text-xs text-muted-foreground">Detected groups</p></div></CardContent></Card>
                            </div>
                            <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Network Cohesion:</span>{[1,2,3,4,5].map(star => { const score = results.metrics.density >= 0.5 ? 5 : results.metrics.density >= 0.3 ? 4 : results.metrics.density >= 0.15 ? 3 : results.metrics.density >= 0.05 ? 2 : 1; return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;})}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Understanding network analysis metrics</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">Degree Centrality</h4><p className="text-sm text-muted-foreground">Measures how many connections a node has. High degree = <strong className="text-foreground">hub or popular entity</strong>. Node &quot;{results.top_nodes.degree[0]?.[0]}&quot; has the highest degree.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Betweenness Centrality</h4><p className="text-sm text-muted-foreground">Measures how often a node lies on shortest paths between others. High betweenness = <strong className="text-foreground">bridge or gatekeeper</strong>. Node &quot;{results.top_nodes.betweenness[0]?.[0]}&quot; controls the most information flow.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Network Density</h4><p className="text-sm text-muted-foreground">The ratio of actual connections to possible connections. Your network is <strong className="text-foreground">{results.metrics.density < 0.1 ? 'sparse' : results.metrics.density < 0.3 ? 'moderately connected' : 'dense'}</strong> ({(results.metrics.density * 100).toFixed(1)}% density).</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Community Detection</h4><p className="text-sm text-muted-foreground">We used the Louvain algorithm to find groups of nodes that are more connected to each other than to the rest of the network. Found <strong className="text-foreground">{results.communities.length} communities</strong>.</p></div></div></div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4><p className="text-sm text-muted-foreground">Your network of {results.metrics.nodes} nodes with {results.communities?.length || 0} communities suggests {results.metrics.density < 0.1 ? 'a loosely connected structure with distinct clusters' : results.metrics.density < 0.3 ? 'moderate interconnection between entities' : 'a tightly-knit network with high collaboration'}.</p></div>
                            <div className="bg-muted/20 rounded-xl p-4"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Centrality Reference</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div className="text-center p-2 bg-background rounded-lg border"><p className="font-medium">Degree</p><p className="text-muted-foreground">Popularity</p></div><div className="text-center p-2 bg-background rounded-lg border"><p className="font-medium">Betweenness</p><p className="text-muted-foreground">Bridge</p></div><div className="text-center p-2 bg-background rounded-lg border"><p className="font-medium">Closeness</p><p className="text-muted-foreground">Efficiency</p></div><div className="text-center p-2 bg-background rounded-lg border"><p className="font-medium">Eigenvector</p><p className="text-muted-foreground">Influence</p></div></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && analysisResult?.plot && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full network analysis</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Social Network Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.metrics.nodes} nodes | {results.metrics.edges} edges | {results.communities.length} communities | {new Date().toLocaleDateString()}</p></div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Nodes</p><p className="text-lg font-bold">{results.metrics.nodes}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Edges</p><p className="text-lg font-bold">{results.metrics.edges}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Density</p><p className="text-lg font-bold">{(results.metrics.density * 100).toFixed(1)}%</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Connected</p><p className="text-lg font-bold">{results.metrics.is_connected ? 'Yes' : 'No'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Components</p><p className="text-lg font-bold">{results.metrics.components}</p></CardContent></Card>
                            </div>

                            {/* Statistical Summary - APA Format */}
                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <FileSearch className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-semibold">Statistical Summary</h3>
                                        </div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A social network analysis was conducted on an {isDirected ? 'directed' : 'undirected'} network consisting of <em>N</em> = {results.metrics.nodes} nodes 
                                                and <em>E</em> = {results.metrics.edges} edges. The edge list was derived from the {sourceCol} → {targetCol} relationship
                                                {weightCol ? `, weighted by ${weightCol}` : ''}.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Network density was <span className="font-mono">{results.metrics.density.toFixed(4)}</span> ({(results.metrics.density * 100).toFixed(1)}%), 
                                                indicating {results.metrics.density < 0.1 ? 'a sparse network with limited connectivity' : results.metrics.density < 0.3 ? 'moderate interconnection among nodes' : 'a dense network with high connectivity'}. 
                                                The network {results.metrics.is_connected ? 'was fully connected' : `comprised ${results.metrics.components} disconnected components`}.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Centrality analysis identified <strong>{results.top_nodes.degree[0]?.[0]}</strong> as the most connected node 
                                                (degree centrality = {results.top_nodes.degree[0]?.[1].toFixed(3)}), 
                                                while <strong>{results.top_nodes.betweenness[0]?.[0]}</strong> exhibited the highest betweenness centrality 
                                                ({results.top_nodes.betweenness[0]?.[1].toFixed(3)}), suggesting a key bridging role in information flow.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Community detection using the Louvain algorithm revealed <strong>{results.communities.length} distinct communities</strong>. 
                                                {results.communities.length > 0 && ` The largest community contained ${Math.max(...results.communities.map(c => c.length))} members, 
                                                while the smallest had ${Math.min(...results.communities.map(c => c.length))} members.`}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Network Visualization</CardTitle><CardDescription>Node size based on degree centrality</CardDescription></CardHeader>
                                <CardContent>
                                    <Plot data={JSON.parse(analysisResult.plot).data} layout={JSON.parse(analysisResult.plot).layout} useResizeHandler={true} className="w-full h-[600px]" />
                                </CardContent>
                            </Card>

                            <div className="grid md:grid-cols-2 gap-4">
                                <Card><CardHeader><CardTitle className="text-base">Top Nodes by Degree</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Node</TableHead><TableHead className="text-right">Degree</TableHead></TableRow></TableHeader><TableBody>{results.top_nodes.degree.map(([node, value]) => <TableRow key={node}><TableCell className="font-medium">{node}</TableCell><TableCell className="text-right font-mono">{value.toFixed(3)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                                <Card><CardHeader><CardTitle className="text-base">Top Nodes by Betweenness</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Node</TableHead><TableHead className="text-right">Betweenness</TableHead></TableRow></TableHeader><TableBody>{results.top_nodes.betweenness.map(([node, value]) => <TableRow key={node}><TableCell className="font-medium">{node}</TableCell><TableCell className="text-right font-mono">{value.toFixed(3)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <Card><CardHeader><CardTitle className="text-base">Top Nodes by Closeness</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Node</TableHead><TableHead className="text-right">Closeness</TableHead></TableRow></TableHeader><TableBody>{results.top_nodes.closeness.map(([node, value]) => <TableRow key={node}><TableCell className="font-medium">{node}</TableCell><TableCell className="text-right font-mono">{value.toFixed(3)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                                <Card><CardHeader><CardTitle className="text-base">Top Nodes by Eigenvector</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Node</TableHead><TableHead className="text-right">Eigenvector</TableHead></TableRow></TableHeader><TableBody>{results.top_nodes.eigenvector.map(([node, value]) => <TableRow key={node}><TableCell className="font-medium">{node}</TableCell><TableCell className="text-right font-mono">{value.toFixed(3)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                            </div>

                            <Card>
                                <CardHeader><CardTitle>Detected Communities ({results.communities.length})</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {results.communities.length > 0 ? results.communities.map((community, i) => (
                                            <Card key={i} className="bg-muted/30">
                                                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Badge>{community.length} members</Badge>Community {i + 1}</CardTitle></CardHeader>
                                                <CardContent><p className="text-sm text-muted-foreground">{community.slice(0, 10).join(', ')}{community.length > 10 ? `, +${community.length - 10} more` : ''}</p></CardContent>
                                            </Card>
                                        )) : <p className="text-muted-foreground">No distinct communities detected.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Analyzing network structure...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>)}
            </div>

            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />

            {/* Glossary Modal */}
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
        </div>
    );
}
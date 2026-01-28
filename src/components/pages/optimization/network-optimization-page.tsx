'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Navigation, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Trash2, Network } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { produce } from 'immer';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: 'City Roads - Shortest Path',
        problemType: 'shortest_path',
        sourceNode: 'A',
        targetNode: 'F',
        nodes: [
            { id: 'A', name: 'Downtown', x: 10, y: 80, nodeType: 'source' },
            { id: 'B', name: 'Mall', x: 40, y: 80, nodeType: 'regular' },
            { id: 'C', name: 'Park', x: 70, y: 80, nodeType: 'regular' },
            { id: 'D', name: 'School', x: 25, y: 50, nodeType: 'regular' },
            { id: 'E', name: 'Hospital', x: 55, y: 50, nodeType: 'regular' },
            { id: 'F', name: 'Airport', x: 85, y: 50, nodeType: 'sink' }
        ],
        edges: [
            { fromNode: 'A', toNode: 'B', distance: 30, capacity: 100, cost: 30 },
            { fromNode: 'A', toNode: 'D', distance: 35, capacity: 80, cost: 35 },
            { fromNode: 'B', toNode: 'C', distance: 25, capacity: 100, cost: 25 },
            { fromNode: 'B', toNode: 'E', distance: 20, capacity: 90, cost: 20 },
            { fromNode: 'C', toNode: 'F', distance: 30, capacity: 100, cost: 30 },
            { fromNode: 'D', toNode: 'E', distance: 25, capacity: 70, cost: 25 },
            { fromNode: 'E', toNode: 'F', distance: 35, capacity: 80, cost: 35 }
        ]
    },
    {
        name: 'Supply Network - Max Flow',
        problemType: 'max_flow',
        sourceNode: 'S',
        targetNode: 'T',
        nodes: [
            { id: 'S', name: 'Source', x: 10, y: 50, nodeType: 'source' },
            { id: 'A', name: 'Hub A', x: 40, y: 70, nodeType: 'regular' },
            { id: 'B', name: 'Hub B', x: 40, y: 30, nodeType: 'regular' },
            { id: 'C', name: 'Hub C', x: 70, y: 70, nodeType: 'regular' },
            { id: 'D', name: 'Hub D', x: 70, y: 30, nodeType: 'regular' },
            { id: 'T', name: 'Target', x: 90, y: 50, nodeType: 'sink' }
        ],
        edges: [
            { fromNode: 'S', toNode: 'A', distance: 10, capacity: 20, cost: 10 },
            { fromNode: 'S', toNode: 'B', distance: 10, capacity: 15, cost: 10 },
            { fromNode: 'A', toNode: 'C', distance: 10, capacity: 25, cost: 10 },
            { fromNode: 'A', toNode: 'D', distance: 15, capacity: 10, cost: 15 },
            { fromNode: 'B', toNode: 'D', distance: 10, capacity: 20, cost: 10 },
            { fromNode: 'C', toNode: 'T', distance: 10, capacity: 15, cost: 10 },
            { fromNode: 'D', toNode: 'T', distance: 10, capacity: 20, cost: 10 }
        ]
    },
    {
        name: 'Delivery Route - TSP',
        problemType: 'tsp',
        sourceNode: 'Depot',
        nodes: [
            { id: 'Depot', name: 'Depot', x: 50, y: 50, nodeType: 'facility' },
            { id: 'A', name: 'Customer A', x: 20, y: 80, nodeType: 'regular' },
            { id: 'B', name: 'Customer B', x: 80, y: 75, nodeType: 'regular' },
            { id: 'C', name: 'Customer C', x: 30, y: 30, nodeType: 'regular' },
            { id: 'D', name: 'Customer D', x: 70, y: 20, nodeType: 'regular' }
        ],
        edges: [
            { fromNode: 'Depot', toNode: 'A', distance: 35, capacity: 100, cost: 35 },
            { fromNode: 'Depot', toNode: 'B', distance: 37, capacity: 100, cost: 37 },
            { fromNode: 'Depot', toNode: 'C', distance: 28, capacity: 100, cost: 28 },
            { fromNode: 'Depot', toNode: 'D', distance: 32, capacity: 100, cost: 32 },
            { fromNode: 'A', toNode: 'B', distance: 60, capacity: 100, cost: 60 },
            { fromNode: 'A', toNode: 'C', distance: 52, capacity: 100, cost: 52 },
            { fromNode: 'A', toNode: 'D', distance: 72, capacity: 100, cost: 72 },
            { fromNode: 'B', toNode: 'C', distance: 72, capacity: 100, cost: 72 },
            { fromNode: 'B', toNode: 'D', distance: 56, capacity: 100, cost: 56 },
            { fromNode: 'C', toNode: 'D', distance: 42, capacity: 100, cost: 42 }
        ]
    }
];

interface NodeInput {
    id: string;
    name: string;
    x: string;
    y: string;
    nodeType: string;
}

interface EdgeInput {
    id: string;
    fromNode: string;
    toNode: string;
    distance: string;
    capacity: string;
    cost: string;
}

interface NetworkOptimizationResult {
    success: boolean;
    problem_type: string;
    solution: any;
    network_stats: {
        num_nodes: number;
        num_edges: number;
        avg_degree: number;
        is_connected: boolean;
        diameter: number | null;
    };
    plots: {
        network_graph?: string;
        statistics?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function NetworkOptimizationPage() {
    const { toast } = useToast();

    const [problemType, setProblemType] = useState<'shortest_path' | 'max_flow' | 'min_cost_flow' | 'tsp'>('shortest_path');
    const [sourceNode, setSourceNode] = useState('A');
    const [targetNode, setTargetNode] = useState('F');
    const [flowDemand, setFlowDemand] = useState('20');
    
    const [nodes, setNodes] = useState<NodeInput[]>([
        { id: 'A', name: 'Downtown', x: '10', y: '80', nodeType: 'source' },
        { id: 'B', name: 'Mall', x: '40', y: '80', nodeType: 'regular' },
        { id: 'C', name: 'Park', x: '70', y: '80', nodeType: 'regular' },
        { id: 'D', name: 'School', x: '25', y: '50', nodeType: 'regular' },
        { id: 'E', name: 'Hospital', x: '55', y: '50', nodeType: 'regular' },
        { id: 'F', name: 'Airport', x: '85', y: '50', nodeType: 'sink' }
    ]);

    const [edges, setEdges] = useState<EdgeInput[]>([
        { id: '1', fromNode: 'A', toNode: 'B', distance: '30', capacity: '100', cost: '30' },
        { id: '2', fromNode: 'A', toNode: 'D', distance: '35', capacity: '80', cost: '35' },
        { id: '3', fromNode: 'B', toNode: 'C', distance: '25', capacity: '100', cost: '25' },
        { id: '4', fromNode: 'B', toNode: 'E', distance: '20', capacity: '90', cost: '20' },
        { id: '5', fromNode: 'C', toNode: 'F', distance: '30', capacity: '100', cost: '30' },
        { id: '6', fromNode: 'D', toNode: 'E', distance: '25', capacity: '70', cost: '25' },
        { id: '7', fromNode: 'E', toNode: 'F', distance: '35', capacity: '80', cost: '35' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<NetworkOptimizationResult | null>(null);

    const addNode = () => {
        const newId = String.fromCharCode(65 + nodes.length); // A, B, C, ...
        setNodes(prev => [...prev, {
            id: newId,
            name: `Node ${newId}`,
            x: '',
            y: '',
            nodeType: 'regular'
        }]);
    };

    const removeNode = (id: string) => {
        if (nodes.length > 2) {
            setNodes(prev => prev.filter(node => node.id !== id));
            // Remove edges connected to this node
            setEdges(prev => prev.filter(edge => edge.fromNode !== id && edge.toNode !== id));
        }
    };

    const addEdge = () => {
        setEdges(prev => [...prev, {
            id: Date.now().toString(),
            fromNode: nodes[0]?.id || '',
            toNode: nodes[1]?.id || '',
            distance: '10',
            capacity: '100',
            cost: '10'
        }]);
    };

    const removeEdge = (id: string) => {
        if (edges.length > 1) {
            setEdges(prev => prev.filter(edge => edge.id !== id));
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setProblemType(example.problemType as any);
        setSourceNode(example.sourceNode);
        setTargetNode(example.targetNode || '');
        setNodes(example.nodes.map((node, i) => ({
            id: node.id,
            name: node.name,
            x: node.x.toString(),
            y: node.y.toString(),
            nodeType: node.nodeType
        })));
        setEdges(example.edges.map((edge, i) => ({
            id: (i + 1).toString(),
            fromNode: edge.fromNode,
            toNode: edge.toNode,
            distance: edge.distance.toString(),
            capacity: edge.capacity.toString(),
            cost: edge.cost.toString()
        })));
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedNodes = nodes
                .filter(node => node.x && node.y)
                .map(node => ({
                    id: node.id,
                    name: node.name,
                    x: parseFloat(node.x),
                    y: parseFloat(node.y),
                    node_type: node.nodeType
                }));

            const parsedEdges = edges
                .filter(edge => edge.distance)
                .map(edge => ({
                    from_node: edge.fromNode,
                    to_node: edge.toNode,
                    distance: parseFloat(edge.distance),
                    capacity: parseFloat(edge.capacity) || undefined,
                    cost: parseFloat(edge.cost) || undefined
                }));

            if (parsedNodes.length < 2) {
                throw new Error("Please provide at least 2 valid nodes.");
            }

            if (parsedEdges.length < 1) {
                throw new Error("Please provide at least 1 valid edge.");
            }

            const payload: any = {
                nodes: parsedNodes,
                edges: parsedEdges,
                problem_type: problemType
            };

            if (problemType !== 'tsp') {
                if (!sourceNode || !targetNode) {
                    throw new Error("Please specify source and target nodes.");
                }
                payload.source_node = sourceNode;
                payload.target_node = targetNode;
            } else {
                if (!sourceNode) {
                    throw new Error("Please specify starting node for TSP.");
                }
                payload.source_node = sourceNode;
            }

            if (problemType === 'min_cost_flow') {
                const demand = parseFloat(flowDemand);
                if (isNaN(demand) || demand <= 0) {
                    throw new Error("Please provide valid flow demand.");
                }
                payload.flow_demand = demand;
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/network-optimization`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: NetworkOptimizationResult = await response.json();
            setResult(res);

            toast({
                title: "Solution Found",
                description: `${problemType.replace('_', ' ')} optimized successfully`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Network className="w-6 h-6 text-primary" />
                    Network Optimization
                </h1>
                <p className="text-sm text-muted-foreground">
                    Road network flow and routing optimization
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Network Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Problem Type & Parameters */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Problem Type</Label>
                            <Select value={problemType} onValueChange={(v: any) => setProblemType(v)}>
                                <SelectTrigger className="w-44 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="shortest_path">Shortest Path</SelectItem>
                                    <SelectItem value="max_flow">Max Flow</SelectItem>
                                    <SelectItem value="min_cost_flow">Min Cost Flow</SelectItem>
                                    <SelectItem value="tsp">TSP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {problemType !== 'tsp' && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Source Node</Label>
                                    <Select value={sourceNode} onValueChange={setSourceNode}>
                                        <SelectTrigger className="w-32 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {nodes.map(node => (
                                                <SelectItem key={node.id} value={node.id}>{node.id}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Target Node</Label>
                                    <Select value={targetNode} onValueChange={setTargetNode}>
                                        <SelectTrigger className="w-32 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {nodes.map(node => (
                                                <SelectItem key={node.id} value={node.id}>{node.id}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {problemType === 'tsp' && (
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Start Node</Label>
                                <Select value={sourceNode} onValueChange={setSourceNode}>
                                    <SelectTrigger className="w-32 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {nodes.map(node => (
                                            <SelectItem key={node.id} value={node.id}>{node.id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {problemType === 'min_cost_flow' && (
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Flow Demand</Label>
                                <Input
                                    type="number"
                                    value={flowDemand}
                                    onChange={e => setFlowDemand(e.target.value)}
                                    className="w-28 h-9 font-mono"
                                    min="0"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Nodes: {nodes.length}</span>
                            <span>•</span>
                            <span>Edges: {edges.length}</span>
                        </div>

                        <div className="flex-1" />

                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_PROBLEMS.map(ex => (
                                <button
                                    key={ex.name}
                                    onClick={() => handleExampleSelect(ex)}
                                    className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors"
                                >
                                    {ex.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Nodes Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Nodes (Intersections)</Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={addNode}
                                disabled={nodes.length >= 15}
                                className="h-8"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add Node
                            </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">ID</TableHead>
                                        <TableHead className="w-[25%]">Name</TableHead>
                                        <TableHead className="w-20">X</TableHead>
                                        <TableHead className="w-20">Y</TableHead>
                                        <TableHead className="w-32">Type</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {nodes.map((node, index) => (
                                        <TableRow key={node.id}>
                                            <TableCell className="p-1 font-mono text-sm">{node.id}</TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={node.name}
                                                    onChange={e => setNodes(produce(draft => { draft[index].name = e.target.value }))}
                                                    className="h-8 text-sm"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={node.x}
                                                    onChange={e => setNodes(produce(draft => { draft[index].x = e.target.value }))}
                                                    className="h-8 w-full font-mono text-sm"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={node.y}
                                                    onChange={e => setNodes(produce(draft => { draft[index].y = e.target.value }))}
                                                    className="h-8 w-full font-mono text-sm"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Select 
                                                    value={node.nodeType} 
                                                    onValueChange={v => setNodes(produce(draft => { draft[index].nodeType = v }))}
                                                >
                                                    <SelectTrigger className="h-8 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="regular">Regular</SelectItem>
                                                        <SelectItem value="source">Source</SelectItem>
                                                        <SelectItem value="sink">Sink</SelectItem>
                                                        <SelectItem value="facility">Facility</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => removeNode(node.id)}
                                                    disabled={nodes.length <= 2}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Edges Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Edges (Road Segments)</Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={addEdge}
                                disabled={edges.length >= 30}
                                className="h-8"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add Edge
                            </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-24">From</TableHead>
                                        <TableHead className="w-24">To</TableHead>
                                        <TableHead className="w-24">Distance</TableHead>
                                        <TableHead className="w-24">Capacity</TableHead>
                                        <TableHead className="w-24">Cost</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {edges.map((edge, index) => (
                                        <TableRow key={edge.id}>
                                            <TableCell className="p-1">
                                                <Select 
                                                    value={edge.fromNode} 
                                                    onValueChange={v => setEdges(produce(draft => { draft[index].fromNode = v }))}
                                                >
                                                    <SelectTrigger className="h-8 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {nodes.map(node => (
                                                            <SelectItem key={node.id} value={node.id}>{node.id}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Select 
                                                    value={edge.toNode} 
                                                    onValueChange={v => setEdges(produce(draft => { draft[index].toNode = v }))}
                                                >
                                                    <SelectTrigger className="h-8 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {nodes.map(node => (
                                                            <SelectItem key={node.id} value={node.id}>{node.id}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={edge.distance}
                                                    onChange={e => setEdges(produce(draft => { draft[index].distance = e.target.value }))}
                                                    className="h-8 font-mono text-sm"
                                                    min="0"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={edge.capacity}
                                                    onChange={e => setEdges(produce(draft => { draft[index].capacity = e.target.value }))}
                                                    className="h-8 font-mono text-sm"
                                                    min="0"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={edge.cost}
                                                    onChange={e => setEdges(produce(draft => { draft[index].cost = e.target.value }))}
                                                    className="h-8 font-mono text-sm"
                                                    min="0"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => removeEdge(edge.id)}
                                                    disabled={edges.length <= 1}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Optimize Network</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Network Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Nodes</p>
                                        <p className="text-lg font-semibold">{result.network_stats.num_nodes}</p>
                                    </div>
                                    <Navigation className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Edges</p>
                                        <p className="text-lg font-semibold">{result.network_stats.num_edges}</p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Avg Degree</p>
                                        <p className="text-lg font-semibold">{result.network_stats.avg_degree.toFixed(1)}</p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Connected</p>
                                        <p className="text-lg font-semibold">
                                            {result.network_stats.is_connected ? '✓ Yes' : '✗ No'}
                                        </p>
                                    </div>
                                    <CheckCircle className={`w-4 h-4 ${result.network_stats.is_connected ? 'text-green-600' : 'text-red-600'}`} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Solution Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Solution: {result.problem_type.replace('_', ' ').toUpperCase()}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.problem_type === 'shortest_path' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                        <span className="text-sm font-medium">Path Length:</span>
                                        <span className="text-lg font-bold text-green-700">{result.solution.path_length.toFixed(2)}</span>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2">Optimal Path:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.solution.path.map((node: string, i: number) => (
                                                <React.Fragment key={i}>
                                                    <Badge variant="outline">{node}</Badge>
                                                    {i < result.solution.path.length - 1 && <span className="text-muted-foreground">→</span>}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {result.problem_type === 'max_flow' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                        <span className="text-sm font-medium">Maximum Flow:</span>
                                        <span className="text-lg font-bold text-blue-700">{result.solution.max_flow_value.toFixed(2)}</span>
                                    </div>
                                    {result.solution.bottleneck_edges.length > 0 && (
                                        <div className="p-3 bg-orange-50 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-2">Bottleneck Edges:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {result.solution.bottleneck_edges.map((edge: any, i: number) => (
                                                    <Badge key={i} variant="destructive">{edge.from} → {edge.to} ({edge.utilization.toFixed(0)}%)</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {result.problem_type === 'min_cost_flow' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                        <span className="text-sm font-medium">Total Cost:</span>
                                        <span className="text-lg font-bold text-purple-700">{result.solution.total_cost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <span className="text-sm">Avg Cost per Unit:</span>
                                        <span className="font-mono text-sm">{result.solution.avg_cost_per_unit.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {result.problem_type === 'tsp' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                                        <span className="text-sm font-medium">Tour Length:</span>
                                        <span className="text-lg font-bold text-indigo-700">{result.solution.tour_length.toFixed(2)}</span>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2">Tour:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.solution.tour.map((node: string, i: number) => (
                                                <React.Fragment key={i}>
                                                    <Badge variant="outline">{node}</Badge>
                                                    {i < result.solution.tour.length - 1 && <span className="text-muted-foreground">→</span>}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Analysis Insights */}
                    {result.interpretation && (
                        <Card className="border-primary/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Analysis Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {result.interpretation.key_insights.map((insight, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="mt-1">
                                            {insight.status === 'positive' ? (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            ) : insight.status === 'warning' ? (
                                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                                            ) : (
                                                <Info className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{insight.title}</p>
                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                                        </div>
                                    </div>
                                ))}

                                {result.interpretation.recommendations.length > 0 && (
                                    <>
                                        <Separator className="my-4" />
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                                            <ul className="space-y-1.5">
                                                {result.interpretation.recommendations.map((rec, idx) => (
                                                    <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                                                        <span className="text-primary">•</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Visualizations */}
                    {result.plots && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="graph" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.network_graph && (
                                            <TabsTrigger value="graph" className="text-xs">Network Graph</TabsTrigger>
                                        )}
                                        {result.plots.statistics && (
                                            <TabsTrigger value="stats" className="text-xs">Statistics</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.network_graph && (
                                        <TabsContent value="graph" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.network_graph}`}
                                                    alt="Network Graph"
                                                    width={1000}
                                                    height={700}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.statistics && (
                                        <TabsContent value="stats" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.statistics}`}
                                                    alt="Statistics"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
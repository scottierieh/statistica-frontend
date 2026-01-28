'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, MapPin, TrendingDown, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Trash2, Building2 } from 'lucide-react';
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
        name: 'Warehouse Network',
        nFacilities: 3,
        algorithm: 'kmeans',
        demandPoints: [
            { name: 'Store A', x: 15, y: 85, demand: 12 },
            { name: 'Store B', x: 35, y: 80, demand: 8 },
            { name: 'Store C', x: 55, y: 85, demand: 10 },
            { name: 'Store D', x: 75, y: 80, demand: 6 },
            { name: 'Store E', x: 20, y: 60, demand: 15 },
            { name: 'Store F', x: 50, y: 55, demand: 20 },
            { name: 'Store G', x: 80, y: 50, demand: 9 },
            { name: 'Store H', x: 25, y: 30, demand: 11 },
            { name: 'Store I', x: 55, y: 25, demand: 13 },
            { name: 'Store J', x: 75, y: 20, demand: 7 }
        ]
    },
    {
        name: 'Fire Stations',
        nFacilities: 4,
        algorithm: 'alternate',
        demandPoints: [
            { name: 'Area 1', x: 10, y: 90, demand: 5 },
            { name: 'Area 2', x: 30, y: 85, demand: 8 },
            { name: 'Area 3', x: 50, y: 90, demand: 6 },
            { name: 'Area 4', x: 70, y: 85, demand: 7 },
            { name: 'Area 5', x: 90, y: 80, demand: 4 },
            { name: 'Area 6', x: 20, y: 60, demand: 10 },
            { name: 'Area 7', x: 45, y: 65, demand: 12 },
            { name: 'Area 8', x: 75, y: 60, demand: 9 },
            { name: 'Area 9', x: 15, y: 35, demand: 8 },
            { name: 'Area 10', x: 40, y: 30, demand: 11 },
            { name: 'Area 11', x: 65, y: 35, demand: 7 },
            { name: 'Area 12', x: 85, y: 25, demand: 5 }
        ]
    },
    {
        name: 'Delivery Hubs',
        nFacilities: 2,
        algorithm: 'kmeans',
        demandPoints: [
            { name: 'Zone A', x: 20, y: 80, demand: 25 },
            { name: 'Zone B', x: 40, y: 75, demand: 18 },
            { name: 'Zone C', x: 30, y: 60, demand: 22 },
            { name: 'Zone D', x: 15, y: 45, demand: 16 },
            { name: 'Zone E', x: 70, y: 70, demand: 20 },
            { name: 'Zone F', x: 85, y: 55, demand: 14 },
            { name: 'Zone G', x: 75, y: 35, demand: 19 },
            { name: 'Zone H', x: 60, y: 20, demand: 12 }
        ]
    }
];

interface DemandPointInput {
    id: string;
    name: string;
    x: string;
    y: string;
    demand: string;
}

interface LocationAllocationResult {
    success: boolean;
    total_distance: number;
    avg_distance_per_demand: number;
    facilities: Array<{
        name: string;
        x: number;
        y: number;
        index: number;
    }>;
    assignments: Record<string, string>;
    facility_loads: Record<string, number>;
    facility_total_demand: Record<string, number>;
    iterations: number;
    converged: boolean;
    problem: {
        n_demand_points: number;
        n_facilities: number;
        total_demand: number;
        distance_type: string;
        algorithm: string;
        max_iterations: number;
    };
    plots: {
        location_map?: string;
        facility_analysis?: string;
        distance_analysis?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
    algorithm_info: {
        name: string;
        iterations: number;
        converged: boolean;
        method: string;
    };
}

export default function LocationAllocationPage() {
    const { toast } = useToast();

    const [nFacilities, setNFacilities] = useState('3');
    const [maxIterations, setMaxIterations] = useState('100');
    const [distanceType, setDistanceType] = useState<'euclidean' | 'manhattan'>('euclidean');
    const [algorithm, setAlgorithm] = useState<'kmeans' | 'alternate'>('kmeans');
    const [demandPoints, setDemandPoints] = useState<DemandPointInput[]>([
        { id: '1', name: 'Store A', x: '15', y: '85', demand: '12' },
        { id: '2', name: 'Store B', x: '35', y: '80', demand: '8' },
        { id: '3', name: 'Store C', x: '55', y: '85', demand: '10' },
        { id: '4', name: 'Store D', x: '75', y: '80', demand: '6' },
        { id: '5', name: 'Store E', x: '20', y: '60', demand: '15' },
        { id: '6', name: 'Store F', x: '50', y: '55', demand: '20' },
        { id: '7', name: 'Store G', x: '80', y: '50', demand: '9' },
        { id: '8', name: 'Store H', x: '25', y: '30', demand: '11' },
        { id: '9', name: 'Store I', x: '55', y: '25', demand: '13' },
        { id: '10', name: 'Store J', x: '75', y: '20', demand: '7' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<LocationAllocationResult | null>(null);

    const addDemandPoint = () => {
        setDemandPoints(prev => [...prev, {
            id: Date.now().toString(),
            name: `Point ${prev.length + 1}`,
            x: '',
            y: '',
            demand: '1'
        }]);
    };

    const removeDemandPoint = (id: string) => {
        if (demandPoints.length > 2) {
            setDemandPoints(prev => prev.filter(dp => dp.id !== id));
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setNFacilities(example.nFacilities.toString());
        setAlgorithm(example.algorithm);
        setDemandPoints(example.demandPoints.map((dp, i) => ({
            id: (i + 1).toString(),
            name: dp.name,
            x: dp.x.toString(),
            y: dp.y.toString(),
            demand: dp.demand.toString()
        })));
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedDemandPoints = demandPoints
                .filter(dp => dp.x && dp.y)
                .map(dp => ({
                    name: dp.name,
                    x: parseFloat(dp.x),
                    y: parseFloat(dp.y),
                    demand: parseFloat(dp.demand) || 1
                }));

            if (parsedDemandPoints.length < 2) {
                throw new Error("Please provide at least 2 valid demand points.");
            }

            const nFacValue = parseInt(nFacilities);
            const maxIterValue = parseInt(maxIterations);

            if (isNaN(nFacValue) || nFacValue <= 0) {
                throw new Error("Number of facilities must be a positive integer.");
            }

            if (isNaN(maxIterValue) || maxIterValue <= 0) {
                throw new Error("Max iterations must be a positive integer.");
            }

            if (nFacValue > parsedDemandPoints.length) {
                throw new Error(`Cannot create ${nFacValue} facilities for ${parsedDemandPoints.length} demand points.`);
            }

            const payload = {
                demand_points: parsedDemandPoints,
                n_facilities: nFacValue,
                max_iterations: maxIterValue,
                distance_type: distanceType,
                algorithm: algorithm
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/location-allocation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: LocationAllocationResult = await response.json();
            setResult(res);

            toast({
                title: "Solution Found",
                description: `${res.facilities.length} facilities located in ${res.iterations} iterations`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const totalDemand = demandPoints.reduce((sum, dp) => sum + (parseFloat(dp.demand) || 0), 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-primary" />
                    Location-Allocation Model
                </h1>
                <p className="text-sm text-muted-foreground">
                    Optimize facility locations and demand assignments to minimize total distance
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Parameters */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Number of Facilities</Label>
                            <Input
                                type="number"
                                value={nFacilities}
                                onChange={e => setNFacilities(e.target.value)}
                                className="w-32 h-9 font-mono"
                                min="1"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Algorithm</Label>
                            <Select value={algorithm} onValueChange={(v: 'kmeans' | 'alternate') => setAlgorithm(v)}>
                                <SelectTrigger className="w-40 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kmeans">K-Means (Fast)</SelectItem>
                                    <SelectItem value="alternate">Alternate (Optimal)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Distance Type</Label>
                            <Select value={distanceType} onValueChange={(v: 'euclidean' | 'manhattan') => setDistanceType(v)}>
                                <SelectTrigger className="w-36 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="euclidean">Euclidean</SelectItem>
                                    <SelectItem value="manhattan">Manhattan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Max Iterations</Label>
                            <Input
                                type="number"
                                value={maxIterations}
                                onChange={e => setMaxIterations(e.target.value)}
                                className="w-28 h-9 font-mono"
                                min="1"
                                max="500"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Points: {demandPoints.length}</span>
                            <span>•</span>
                            <span>Total Demand: {totalDemand.toFixed(1)}</span>
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

                    {/* Demand Points Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Demand Points</Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={addDemandPoint}
                                disabled={demandPoints.length >= 30}
                                className="h-8"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add Point
                            </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30%]">Name</TableHead>
                                        <TableHead>X</TableHead>
                                        <TableHead>Y</TableHead>
                                        <TableHead>Demand</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {demandPoints.map((dp, index) => (
                                        <TableRow key={dp.id}>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={dp.name}
                                                    onChange={e => setDemandPoints(produce(draft => { draft[index].name = e.target.value }))}
                                                    className="h-9"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={dp.x}
                                                    onChange={e => setDemandPoints(produce(draft => { draft[index].x = e.target.value }))}
                                                    className="h-9 w-20 font-mono"
                                                    step="0.1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={dp.y}
                                                    onChange={e => setDemandPoints(produce(draft => { draft[index].y = e.target.value }))}
                                                    className="h-9 w-20 font-mono"
                                                    step="0.1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={dp.demand}
                                                    onChange={e => setDemandPoints(produce(draft => { draft[index].demand = e.target.value }))}
                                                    className="h-9 w-20 font-mono"
                                                    min="0"
                                                    step="0.1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => removeDemandPoint(dp.id)}
                                                    disabled={demandPoints.length <= 2}
                                                >
                                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Algorithm will determine optimal facility locations to minimize weighted distance
                        </p>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Optimize Locations</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Distance</p>
                                        <p className="text-lg font-semibold font-mono">{result.total_distance.toFixed(2)}</p>
                                    </div>
                                    <TrendingDown className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Avg Distance</p>
                                        <p className="text-lg font-semibold font-mono">{result.avg_distance_per_demand.toFixed(2)}</p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Iterations</p>
                                        <p className="text-lg font-semibold">
                                            {result.iterations}
                                            {result.converged && <span className="text-green-600 ml-1">✓</span>}
                                        </p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Facilities</p>
                                        <p className="text-lg font-semibold">{result.problem.n_facilities}</p>
                                    </div>
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Solution Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Optimized Facility Locations</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.facilities.map(facility => (
                                        <Badge key={facility.name} variant="default" className="text-sm font-mono">
                                            <Building2 className="w-3 h-3 mr-1" />
                                            {facility.name}: ({facility.x.toFixed(1)}, {facility.y.toFixed(1)})
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Facility Loads</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {Object.entries(result.facility_loads).map(([facility, load]) => (
                                            <div key={facility} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{facility}</span>
                                                <span className="font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">
                                                    {load} points
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Total Demand Served</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {Object.entries(result.facility_total_demand).map(([facility, demand]) => (
                                            <div key={facility} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{facility}</span>
                                                <span className="font-mono text-xs bg-green-100 px-2 py-0.5 rounded">
                                                    {demand.toFixed(1)} units
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                <div>
                                    Algorithm: <span className="font-mono">{result.algorithm_info.name}</span>
                                    {' • '}
                                    Method: <span className="font-mono">{result.algorithm_info.method}</span>
                                </div>
                                <div>
                                    Distance: <span className="font-mono">{result.problem.distance_type}</span>
                                    {' • '}
                                    Converged: <span className="font-mono">{result.converged ? 'Yes' : 'No'}</span>
                                    {result.converged && (
                                        <Badge variant="outline" className="text-xs h-5 px-1.5 ml-2 bg-green-50">
                                            ✓ Optimal
                                        </Badge>
                                    )}
                                </div>
                            </div>
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
                                <Tabs defaultValue="map" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.location_map && (
                                            <TabsTrigger value="map" className="text-xs">Location Map</TabsTrigger>
                                        )}
                                        {result.plots.facility_analysis && (
                                            <TabsTrigger value="facility" className="text-xs">Facility Analysis</TabsTrigger>
                                        )}
                                        {result.plots.distance_analysis && (
                                            <TabsTrigger value="distance" className="text-xs">Distance Analysis</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.location_map && (
                                        <TabsContent value="map" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.location_map}`}
                                                    alt="Location Map"
                                                    width={800}
                                                    height={600}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                ⭐ Optimized facilities • 🔵 Demand points • Lines show assignments
                                            </p>
                                        </TabsContent>
                                    )}

                                    {result.plots.facility_analysis && (
                                        <TabsContent value="facility" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.facility_analysis}`}
                                                    alt="Facility Analysis"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.distance_analysis && (
                                        <TabsContent value="distance" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.distance_analysis}`}
                                                    alt="Distance Analysis"
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
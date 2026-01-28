'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, MapPin, TrendingDown, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Trash2, Map } from 'lucide-react';
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
        name: 'City Services',
        p: 3,
        distanceType: 'euclidean',
        locations: [
            { name: 'North District', x: 10, y: 80, demand: 5 },
            { name: 'South District', x: 15, y: 20, demand: 3 },
            { name: 'East District', x: 80, y: 50, demand: 4 },
            { name: 'West District', x: 20, y: 50, demand: 6 },
            { name: 'Central', x: 45, y: 45, demand: 8 },
            { name: 'Northeast', x: 70, y: 75, demand: 2 },
            { name: 'Southeast', x: 75, y: 25, demand: 3 },
            { name: 'Northwest', x: 25, y: 75, demand: 4 }
        ]
    },
    {
        name: 'Distribution Centers',
        p: 2,
        distanceType: 'manhattan',
        locations: [
            { name: 'Warehouse A', x: 20, y: 80, demand: 10 },
            { name: 'Warehouse B', x: 80, y: 80, demand: 8 },
            { name: 'Warehouse C', x: 20, y: 20, demand: 6 },
            { name: 'Warehouse D', x: 80, y: 20, demand: 7 },
            { name: 'Store 1', x: 50, y: 50, demand: 15 },
            { name: 'Store 2', x: 35, y: 65, demand: 5 }
        ]
    },
    {
        name: 'Emergency Services',
        p: 4,
        distanceType: 'euclidean',
        locations: [
            { name: 'Zone A1', x: 15, y: 85, demand: 3 },
            { name: 'Zone A2', x: 35, y: 90, demand: 2 },
            { name: 'Zone B1', x: 55, y: 80, demand: 4 },
            { name: 'Zone B2', x: 75, y: 85, demand: 3 },
            { name: 'Zone C1', x: 20, y: 60, demand: 5 },
            { name: 'Zone C2', x: 45, y: 55, demand: 6 },
            { name: 'Zone C3', x: 70, y: 60, demand: 4 },
            { name: 'Zone D1', x: 25, y: 30, demand: 3 },
            { name: 'Zone D2', x: 50, y: 25, demand: 4 },
            { name: 'Zone D3', x: 75, y: 35, demand: 2 }
        ]
    }
];

interface LocationInput {
    id: string;
    name: string;
    x: string;
    y: string;
    demand: string;
}

interface PMedianResult {
    success: boolean;
    total_distance: number;
    avg_distance: number;
    max_distance: number;
    selected_facilities: string[];
    facility_indices: number[];
    assignments: Record<string, string>;
    facility_loads: Record<string, number>;
    problem: {
        n_locations: number;
        n_facilities: number;
        distance_type: string;
        total_demand: number;
        input_crs?: string;
        target_crs?: string;
        projected?: boolean;
    };
    plots: {
        location_map?: string;
        distance_distribution?: string;
        facility_loads?: string;
        coverage_analysis?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
    solver_info?: {
        status: string;
        solver: string;
        method: string;
        library: string;
        crs_used?: string;
        projected?: boolean;
    };
}

export default function PMedianPage() {
    const { toast } = useToast();

    const [p, setP] = useState('3');
    const [distanceType, setDistanceType] = useState<'euclidean' | 'manhattan'>('euclidean');
    const [crs, setCrs] = useState<string>('none');
    const [locations, setLocations] = useState<LocationInput[]>([
        { id: '1', name: 'North District', x: '10', y: '80', demand: '5' },
        { id: '2', name: 'South District', x: '15', y: '20', demand: '3' },
        { id: '3', name: 'East District', x: '80', y: '50', demand: '4' },
        { id: '4', name: 'West District', x: '20', y: '50', demand: '6' },
        { id: '5', name: 'Central', x: '45', y: '45', demand: '8' },
        { id: '6', name: 'Northeast', x: '70', y: '75', demand: '2' },
        { id: '7', name: 'Southeast', x: '75', y: '25', demand: '3' },
        { id: '8', name: 'Northwest', x: '25', y: '75', demand: '4' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PMedianResult | null>(null);

    const addLocation = () => {
        setLocations(prev => [...prev, {
            id: Date.now().toString(),
            name: `Location ${prev.length + 1}`,
            x: '',
            y: '',
            demand: '1'
        }]);
    };

    const removeLocation = (id: string) => {
        if (locations.length > 2) {
            setLocations(prev => prev.filter(loc => loc.id !== id));
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setP(example.p.toString());
        setDistanceType(example.distanceType as 'euclidean' | 'manhattan');
        setLocations(example.locations.map((loc, i) => ({
            id: (i + 1).toString(),
            name: loc.name,
            x: loc.x.toString(),
            y: loc.y.toString(),
            demand: loc.demand.toString()
        })));
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedLocations = locations
                .filter(loc => loc.x && loc.y)
                .map(loc => ({
                    name: loc.name,
                    x: parseFloat(loc.x),
                    y: parseFloat(loc.y),
                    demand: parseFloat(loc.demand) || 1
                }));

            if (parsedLocations.length < 2) {
                throw new Error("Please provide at least 2 valid locations.");
            }

            const pValue = parseInt(p);
            if (isNaN(pValue) || pValue <= 0) {
                throw new Error("Number of facilities must be a positive integer.");
            }

            if (pValue > parsedLocations.length) {
                throw new Error(`Cannot select ${pValue} facilities from ${parsedLocations.length} locations.`);
            }

            const payload: any = {
                locations: parsedLocations,
                p: pValue,
                distance_type: distanceType
            };

            // Add CRS parameters if specified
            if (crs !== 'none') {
                payload.crs = crs;
                payload.input_crs = 'EPSG:4326';
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/p-median`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: PMedianResult = await response.json();
            setResult(res);

            toast({
                title: "Solution Found",
                description: `${res.selected_facilities.length} facilities selected with avg distance ${res.avg_distance.toFixed(2)}`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const totalDemand = locations.reduce((sum, loc) => sum + (parseFloat(loc.demand) || 0), 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Map className="w-6 h-6 text-primary" />
                    P-Median Problem
                </h1>
                <p className="text-sm text-muted-foreground">
                    Find optimal facility locations to minimize total distance to demand points
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Parameters & Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Number of Facilities (P)</Label>
                            <Input
                                type="number"
                                value={p}
                                onChange={e => setP(e.target.value)}
                                className="w-32 h-9 font-mono"
                                min="1"
                            />
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
                            <Label className="text-xs text-muted-foreground">
                                Coordinate System
                                <span className="ml-1 text-orange-500" title="For lat/lon coordinates, use projected CRS for accurate distances">⚠️</span>
                            </Label>
                            <Select value={crs} onValueChange={setCrs}>
                                <SelectTrigger className="w-44 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (XY coords)</SelectItem>
                                    <SelectItem value="EPSG:5179">🇰🇷 Korea (EPSG:5179)</SelectItem>
                                    <SelectItem value="EPSG:6668">🇯🇵 Japan (EPSG:6668)</SelectItem>
                                    <SelectItem value="EPSG:5070">🇺🇸 USA Albers (EPSG:5070)</SelectItem>
                                    <SelectItem value="EPSG:3035">🇪🇺 Europe LAEA (EPSG:3035)</SelectItem>
                                    <SelectItem value="EPSG:3857">🌐 Web Mercator (EPSG:3857)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Locations: {locations.length}</span>
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

                    {/* Locations Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Locations</Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={addLocation}
                                disabled={locations.length >= 20}
                                className="h-8"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add Location
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
                                    {locations.map((loc, index) => (
                                        <TableRow key={loc.id}>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={loc.name}
                                                    onChange={e => setLocations(produce(draft => { draft[index].name = e.target.value }))}
                                                    className="h-9"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={loc.x}
                                                    onChange={e => setLocations(produce(draft => { draft[index].x = e.target.value }))}
                                                    className="h-9 w-20 font-mono"
                                                    step="0.1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={loc.y}
                                                    onChange={e => setLocations(produce(draft => { draft[index].y = e.target.value }))}
                                                    className="h-9 w-20 font-mono"
                                                    step="0.1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={loc.demand}
                                                    onChange={e => setLocations(produce(draft => { draft[index].demand = e.target.value }))}
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
                                                    onClick={() => removeLocation(loc.id)}
                                                    disabled={locations.length <= 2}
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
                            Coordinates represent spatial positions. Demand weights the importance of each location.
                        </p>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Solving...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Find Optimal Locations</>
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
                                        <p className="text-lg font-semibold font-mono">{result.avg_distance.toFixed(2)}</p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Max Distance</p>
                                        <p className="text-lg font-semibold font-mono">{result.max_distance.toFixed(2)}</p>
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
                                        <p className="text-lg font-semibold">
                                            {result.problem.n_facilities} / {result.problem.n_locations}
                                        </p>
                                    </div>
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected Facilities */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Selected Facilities</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.selected_facilities.map(facility => (
                                        <Badge key={facility} variant="default" className="text-sm">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {facility}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Assignments</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {Object.entries(result.assignments).slice(0, 10).map(([point, facility]) => (
                                            <div key={point} className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">{point}</span>
                                                <span className="font-medium">→ {facility}</span>
                                            </div>
                                        ))}
                                        {Object.keys(result.assignments).length > 10 && (
                                            <p className="text-xs text-muted-foreground italic">
                                                +{Object.keys(result.assignments).length - 10} more...
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Facility Loads</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {Object.entries(result.facility_loads).map(([facility, load]) => (
                                            <div key={facility} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{facility}</span>
                                                <span className="font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">
                                                    {load} pts
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                <div>
                                    Method: <span className="font-mono">{result.solver_info?.method || 'N/A'}</span>
                                    {' • '}
                                    Distance: <span className="font-mono">{result.problem.distance_type}</span>
                                </div>
                                {result.solver_info?.crs_used && (
                                    <div className="flex items-center gap-1">
                                        <span>CRS: <span className="font-mono">{result.solver_info.crs_used}</span></span>
                                        {result.solver_info.projected && (
                                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                                                ✓ Projected
                                            </Badge>
                                        )}
                                    </div>
                                )}
                                {result.solver_info?.library && (
                                    <div>
                                        Solver: <span className="font-mono">{result.solver_info.library}</span>
                                        {' • '}
                                        Status: <span className="font-mono">{result.solver_info.status}</span>
                                    </div>
                                )}
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
                                        {result.plots.distance_distribution && (
                                            <TabsTrigger value="distance" className="text-xs">Distance Distribution</TabsTrigger>
                                        )}
                                        {result.plots.facility_loads && (
                                            <TabsTrigger value="loads" className="text-xs">Facility Loads</TabsTrigger>
                                        )}
                                        {result.plots.coverage_analysis && (
                                            <TabsTrigger value="coverage" className="text-xs">Coverage Analysis</TabsTrigger>
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
                                                ⭐ Stars indicate selected facilities • Lines show demand point assignments
                                            </p>
                                        </TabsContent>
                                    )}

                                    {result.plots.distance_distribution && (
                                        <TabsContent value="distance" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.distance_distribution}`}
                                                    alt="Distance Distribution"
                                                    width={800}
                                                    height={400}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.facility_loads && (
                                        <TabsContent value="loads" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.facility_loads}`}
                                                    alt="Facility Loads"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.coverage_analysis && (
                                        <TabsContent value="coverage" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.coverage_analysis}`}
                                                    alt="Coverage Analysis"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Shows percentage of demand covered within each distance threshold
                                            </p>
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
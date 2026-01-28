'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, MapPin, Target, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Trash2, Radio } from 'lucide-react';
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
        name: 'Emergency Services',
        p: 3,
        serviceRadius: 25,
        distanceType: 'euclidean',
        locations: [
            { name: 'Hospital A', x: 20, y: 80, demand: 8 },
            { name: 'Hospital B', x: 80, y: 75, demand: 6 },
            { name: 'Clinic C', x: 50, y: 50, demand: 10 },
            { name: 'Station D', x: 30, y: 30, demand: 7 },
            { name: 'Center E', x: 70, y: 20, demand: 5 },
            { name: 'Area F', x: 15, y: 50, demand: 9 },
            { name: 'Zone G', x: 85, y: 45, demand: 4 },
            { name: 'Point H', x: 45, y: 70, demand: 6 }
        ]
    },
    {
        name: 'Fire Stations',
        p: 4,
        serviceRadius: 30,
        distanceType: 'euclidean',
        locations: [
            { name: 'District 1', x: 15, y: 85, demand: 12 },
            { name: 'District 2', x: 45, y: 90, demand: 8 },
            { name: 'District 3', x: 75, y: 80, demand: 10 },
            { name: 'District 4', x: 25, y: 60, demand: 15 },
            { name: 'District 5', x: 55, y: 55, demand: 20 },
            { name: 'District 6', x: 85, y: 50, demand: 9 },
            { name: 'District 7', x: 20, y: 30, demand: 11 },
            { name: 'District 8', x: 50, y: 25, demand: 13 },
            { name: 'District 9', x: 80, y: 20, demand: 7 },
            { name: 'District 10', x: 60, y: 40, demand: 6 }
        ]
    },
    {
        name: 'Cell Towers',
        p: 5,
        serviceRadius: 20,
        distanceType: 'euclidean',
        locations: [
            { name: 'Tower A', x: 10, y: 90, demand: 5 },
            { name: 'Tower B', x: 30, y: 85, demand: 8 },
            { name: 'Tower C', x: 50, y: 90, demand: 6 },
            { name: 'Tower D', x: 70, y: 85, demand: 7 },
            { name: 'Tower E', x: 90, y: 80, demand: 4 },
            { name: 'Area F', x: 20, y: 60, demand: 10 },
            { name: 'Area G', x: 45, y: 65, demand: 12 },
            { name: 'Area H', x: 75, y: 60, demand: 9 },
            { name: 'Zone I', x: 15, y: 35, demand: 8 },
            { name: 'Zone J', x: 40, y: 30, demand: 11 },
            { name: 'Zone K', x: 65, y: 35, demand: 7 },
            { name: 'Zone L', x: 85, y: 25, demand: 5 }
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

interface MCLPResult {
    success: boolean;
    total_covered_demand: number;
    coverage_percentage: number;
    uncovered_demand: number;
    selected_facilities: string[];
    facility_indices: number[];
    covered_locations: string[];
    uncovered_locations: string[];
    facility_coverage: Record<string, number>;
    problem: {
        n_locations: number;
        n_facilities: number;
        service_radius: number;
        distance_type: string;
        total_demand: number;
        n_covered: number;
        n_uncovered: number;
        input_crs?: string;
        target_crs?: string;
        projected?: boolean;
    };
    plots: {
        coverage_map?: string;
        coverage_analysis?: string;
        demand_distribution?: string;
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

export default function MCLPPage() {
    const { toast } = useToast();

    const [p, setP] = useState('3');
    const [serviceRadius, setServiceRadius] = useState('25');
    const [distanceType, setDistanceType] = useState<'euclidean' | 'manhattan'>('euclidean');
    const [crs, setCrs] = useState<string>('none');
    const [locations, setLocations] = useState<LocationInput[]>([
        { id: '1', name: 'Hospital A', x: '20', y: '80', demand: '8' },
        { id: '2', name: 'Hospital B', x: '80', y: '75', demand: '6' },
        { id: '3', name: 'Clinic C', x: '50', y: '50', demand: '10' },
        { id: '4', name: 'Station D', x: '30', y: '30', demand: '7' },
        { id: '5', name: 'Center E', x: '70', y: '20', demand: '5' },
        { id: '6', name: 'Area F', x: '15', y: '50', demand: '9' },
        { id: '7', name: 'Zone G', x: '85', y: '45', demand: '4' },
        { id: '8', name: 'Point H', x: '45', y: '70', demand: '6' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<MCLPResult | null>(null);

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
        setServiceRadius(example.serviceRadius.toString());
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
            const radiusValue = parseFloat(serviceRadius);

            if (isNaN(pValue) || pValue <= 0) {
                throw new Error("Number of facilities must be a positive integer.");
            }

            if (isNaN(radiusValue) || radiusValue <= 0) {
                throw new Error("Service radius must be a positive number.");
            }

            if (pValue > parsedLocations.length) {
                throw new Error(`Cannot select ${pValue} facilities from ${parsedLocations.length} locations.`);
            }

            const payload: any = {
                locations: parsedLocations,
                p: pValue,
                service_radius: radiusValue,
                distance_type: distanceType
            };

            if (crs !== 'none') {
                payload.crs = crs;
                payload.input_crs = 'EPSG:4326';
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/mclp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: MCLPResult = await response.json();
            setResult(res);

            toast({
                title: "Solution Found",
                description: `Coverage: ${res.coverage_percentage.toFixed(1)}% with ${res.selected_facilities.length} facilities`
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
                    <Radio className="w-6 h-6 text-primary" />
                    Maximal Covering Location Problem (MCLP)
                </h1>
                <p className="text-sm text-muted-foreground">
                    Maximize demand coverage within service radius using limited facilities
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
                            <Label className="text-xs text-muted-foreground">Service Radius</Label>
                            <Input
                                type="number"
                                value={serviceRadius}
                                onChange={e => setServiceRadius(e.target.value)}
                                className="w-32 h-9 font-mono"
                                min="0"
                                step="0.1"
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
                                CRS
                                <span className="ml-1 text-orange-500" title="For lat/lon, use projected CRS">⚠️</span>
                            </Label>
                            <Select value={crs} onValueChange={setCrs}>
                                <SelectTrigger className="w-44 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (XY coords)</SelectItem>
                                    <SelectItem value="EPSG:5179">🇰🇷 Korea</SelectItem>
                                    <SelectItem value="EPSG:6668">🇯🇵 Japan</SelectItem>
                                    <SelectItem value="EPSG:5070">🇺🇸 USA Albers</SelectItem>
                                    <SelectItem value="EPSG:3035">🇪🇺 Europe LAEA</SelectItem>
                                    <SelectItem value="EPSG:3857">🌐 Web Mercator</SelectItem>
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
                            Points within service radius of selected facilities will be covered
                        </p>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Solving...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Maximize Coverage</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Coverage</p>
                                        <p className="text-lg font-semibold text-green-700">{result.coverage_percentage.toFixed(1)}%</p>
                                    </div>
                                    <Target className="w-4 h-4 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Covered Demand</p>
                                        <p className="text-lg font-semibold font-mono">{result.total_covered_demand.toFixed(1)}</p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Covered Points</p>
                                        <p className="text-lg font-semibold">
                                            {result.problem.n_covered} / {result.problem.n_locations}
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
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                        Covered Locations ({result.problem.n_covered})
                                    </p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.covered_locations.slice(0, 10).map(loc => (
                                            <div key={loc} className="text-sm text-green-700 font-medium">
                                                ✓ {loc}
                                            </div>
                                        ))}
                                        {result.covered_locations.length > 10 && (
                                            <p className="text-xs text-muted-foreground italic">
                                                +{result.covered_locations.length - 10} more...
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-red-600" />
                                        Uncovered Locations ({result.problem.n_uncovered})
                                    </p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.uncovered_locations.length > 0 ? (
                                            result.uncovered_locations.slice(0, 10).map(loc => (
                                                <div key={loc} className="text-sm text-red-700">
                                                    ✗ {loc}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-green-600 font-medium">All locations covered! 🎉</p>
                                        )}
                                        {result.uncovered_locations.length > 10 && (
                                            <p className="text-xs text-muted-foreground italic">
                                                +{result.uncovered_locations.length - 10} more...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                <div>
                                    Service Radius: <span className="font-mono">{result.problem.service_radius}</span>
                                    {' • '}
                                    Distance: <span className="font-mono">{result.problem.distance_type}</span>
                                </div>
                                {result.solver_info && (
                                    <div>
                                        Solver: <span className="font-mono">{result.solver_info.library}</span>
                                        {' • '}
                                        Status: <span className="font-mono">{result.solver_info.status}</span>
                                        {result.solver_info.projected && (
                                            <Badge variant="outline" className="text-xs h-5 px-1.5 ml-2">
                                                ✓ Projected ({result.solver_info.crs_used})
                                            </Badge>
                                        )}
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
                                        {result.plots.coverage_map && (
                                            <TabsTrigger value="map" className="text-xs">Coverage Map</TabsTrigger>
                                        )}
                                        {result.plots.coverage_analysis && (
                                            <TabsTrigger value="analysis" className="text-xs">Coverage Analysis</TabsTrigger>
                                        )}
                                        {result.plots.demand_distribution && (
                                            <TabsTrigger value="demand" className="text-xs">Demand Distribution</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.coverage_map && (
                                        <TabsContent value="map" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.coverage_map}`}
                                                    alt="Coverage Map"
                                                    width={800}
                                                    height={600}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                ⭐ Selected facilities • 🟢 Covered points • ⚪ Uncovered points • 🔵 Service radius
                                            </p>
                                        </TabsContent>
                                    )}

                                    {result.plots.coverage_analysis && (
                                        <TabsContent value="analysis" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.coverage_analysis}`}
                                                    alt="Coverage Analysis"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.demand_distribution && (
                                        <TabsContent value="demand" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.demand_distribution}`}
                                                    alt="Demand Distribution"
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


'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, Plus, Trash2, Map, Car } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { produce } from 'immer';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import type { DataSet } from '@/lib/stats';


interface Location {
    id: string;
    name: string;
    lat: string;
    lng: string;
    demand: string;
}

interface Truck {
    id: string;
    name: string;
    capacity: string;
}

interface Depot {
    id: string;
    name: string;
    lat: string;
    lng: string;
}

interface RouteResult {
    nodes: string[];
    distance: number;
}

interface AnalysisResponse {
    routes: RouteResult[];
    total_distance: number;
    plot: string;
}

export default function FleetOptimizationPage({ data, allHeaders, onLoadExample }: { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void }) {
    const { toast } = useToast();
    
    const [depot, setDepot] = useState<Depot>({ id: 'depot-0', name: 'Central Depot', lat: '37.5665', lng: '126.9780' });
    const [trucks, setTrucks] = useState<Truck[]>([
        { id: `truck-${Date.now()}`, name: 'Truck 1', capacity: '100' }
    ]);
    const [customers, setCustomers] = useState<Location[]>([
        { id: `loc-${Date.now()}-1`, name: 'Customer A', lat: '37.5760', lng: '126.9760', demand: '20' },
        { id: `loc-${Date.now()}-2`, name: 'Customer B', lat: '37.5650', lng: '126.9880', demand: '15' },
        { id: `loc-${Date.now()}-3`, name: 'Customer C', lat: '37.5560', lng: '126.9700', demand: '30' },
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const handleLoadExample = () => {
        const example = exampleDatasets.find(ex => ex.id === 'fleet-optimization');
        if (example && onLoadExample) {
            onLoadExample(example);
        }
    };
    
    useEffect(() => {
        if (data && data.length > 0) {
            const depotData = data.find(d => d.type === 'depot');
            if (depotData) {
                setDepot({ id: String(depotData.id), name: String(depotData.name), lat: String(depotData.lat), lng: String(depotData.lng) });
            }

            const truckData = data.filter(d => d.type === 'truck').map(d => ({
                id: String(d.id), name: String(d.name), capacity: String(d.capacity)
            }));
            if (truckData.length > 0) setTrucks(truckData);

            const customerData = data.filter(d => d.type === 'customer').map(d => ({
                id: String(d.id), name: String(d.name), lat: String(d.lat), lng: String(d.lng), demand: String(d.demand)
            }));
            if (customerData.length > 0) setCustomers(customerData);
        }
    }, [data]);

    const addTruck = () => setTrucks(prev => [...prev, { id: `truck-${Date.now()}`, name: `Truck ${prev.length + 1}`, capacity: '100' }]);
    const addCustomer = () => setCustomers(prev => [...prev, { id: `loc-${Date.now()}`, name: `Customer ${prev.length + 1}`, lat: '', lng: '', demand: '' }]);

    const handleAnalysis = useCallback(async () => {
        const parsedCustomers = customers.map(loc => ({
            name: loc.name,
            lat: parseFloat(loc.lat),
            lng: parseFloat(loc.lng),
            demand: parseInt(loc.demand)
        })).filter(loc => !isNaN(loc.lat) && !isNaN(loc.lng) && !isNaN(loc.demand));

        const parsedTrucks = trucks.map(t => ({
             name: t.name, capacity: parseInt(t.capacity)
        })).filter(t => !isNaN(t.capacity));
        
        const parsedDepot = { name: depot.name, lat: parseFloat(depot.lat), lng: parseFloat(depot.lng) };

        if (parsedCustomers.length < 1 || parsedTrucks.length < 1 || isNaN(parsedDepot.lat) || isNaN(parsedDepot.lng)) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please provide valid data for depot, customers and at least one truck.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/fleet-optimization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations: parsedCustomers, trucks: parsedTrucks, depot: parsedDepot })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to run analysis');
            }
            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Success', description: 'Optimal fleet routes have been calculated.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [customers, trucks, depot, toast]);

    const renderTableInput = (items: (Location[] | Truck[]), setter: React.Dispatch<React.SetStateAction<any>>, itemType: 'customer' | 'truck') => {
        const headers = itemType === 'customer' ? ['Name', 'Latitude', 'Longitude', 'Demand', ''] : ['Name', 'Capacity', ''];
        const fields = itemType === 'customer' ? ['name', 'lat', 'lng', 'demand'] : ['name', 'capacity'];
        
        return (
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[1fr,100px,100px,100px,auto] gap-2 items-center">
                        {fields.map(field => (
                            <Input
                                key={field}
                                value={(item as any)[field]}
                                onChange={e => {
                                    setter(produce((draft: any[]) => {
                                        draft[index][field] = e.target.value;
                                    }));
                                }}
                                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                type={field === 'name' ? 'text' : 'number'}
                            />
                        ))}
                        {fields.length < 4 && <div />}
                        <Button variant="ghost" size="icon" onClick={() => setter((prev: any[]) => prev.filter(p => p.id !== item.id))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Car className="w-6 h-6 text-primary" />
                        Fleet Routing Optimization
                    </CardTitle>
                    <CardDescription>Enter depot, truck, and customer data to find the most efficient delivery routes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Depot Location</CardTitle></CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-[1fr,120px,120px] gap-2">
                                <Input value={depot.name} onChange={e => setDepot(d => ({...d, name: e.target.value}))} placeholder="Depot Name"/>
                                <Input type="number" value={depot.lat} onChange={e => setDepot(d => ({...d, lat: e.target.value}))} placeholder="Latitude"/>
                                <Input type="number" value={depot.lng} onChange={e => setDepot(d => ({...d, lng: e.target.value}))} placeholder="Longitude"/>
                            </div>
                        </CardContent>
                    </Card>
                     <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Trucks</CardTitle></CardHeader>
                            <CardContent>{renderTableInput(trucks, setTrucks, 'truck')}<Button variant="outline" size="sm" className="mt-2" onClick={addTruck}><Plus className="mr-2"/> Add Truck</Button></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Customers</CardTitle></CardHeader>
                            <CardContent>{renderTableInput(customers, setCustomers, 'customer')}<Button variant="outline" size="sm" className="mt-2" onClick={addCustomer}><Plus className="mr-2"/> Add Customer</Button></CardContent>
                        </Card>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleLoadExample}>Load Example</Button>
                    <Button onClick={handleAnalysis} disabled={isLoading}><Play className="mr-2"/>Optimize Routes</Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full" />}
            
            {analysisResult && (
                <div className="grid lg:grid-cols-2 gap-4">
                     <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Route Visualization</CardTitle>
                            <CardDescription>Total Distance: <span className="font-bold text-primary">{analysisResult.total_distance.toFixed(2)} km</span></CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Fleet Optimization Route" width={1000} height={1000} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    {analysisResult.routes.map((route, i) => (
                         <Card key={i}>
                            <CardHeader>
                                <CardTitle>Truck {i+1} Route</CardTitle>
                                <CardDescription>Distance: {route.distance.toFixed(2)} km</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="list-decimal list-inside space-y-1">
                                    {route.nodes.map((node, j) => <li key={j} className={j === 0 || j === route.nodes.length -1 ? 'font-semibold' : ''}>{node}</li>)}
                                </ol>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}



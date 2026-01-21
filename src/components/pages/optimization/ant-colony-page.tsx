'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Plus, Trash2, Waypoints } from 'lucide-react';
import { produce } from 'immer';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

interface City {
    id: string;
    name: string;
    lat: string;
    lng: string;
}

interface AnalysisResult {
    best_path: string[];
    total_distance: number;
}

export default function AntColonyPage() {
    const { toast } = useToast();
    
    const [cities, setCities] = useState<City[]>([
        { id: 'c1', name: 'City A', lat: '40.7128', lng: '-74.0060' },
        { id: 'c2', name: 'City B', lat: '34.0522', lng: '-118.2437' },
        { id: 'c3', name: 'City C', lat: '41.8781', lng: '-87.6298' },
        { id: 'c4', name: 'City D', lat: '29.7604', lng: '-95.3698' },
        { id: 'c5', name: 'City E', lat: '39.9526', lng: '-75.1652' },
    ]);
    
    const [params, setParams] = useState({
        n_ants: '10',
        n_iterations: '100',
        alpha: '1.0',
        beta: '2.0',
        evaporation_rate: '0.5'
    });

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{results: AnalysisResult, plot: string} | null>(null);
    
    const addCity = () => {
        setCities(produce(draft => {
            draft.push({ id: `c${Date.now()}`, name: `City ${draft.length + 1}`, lat: '', lng: '' });
        }));
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                cities: cities.map(c => ({ name: c.name, lat: parseFloat(c.lat), lng: parseFloat(c.lng) })),
                params: {
                    n_ants: parseInt(params.n_ants),
                    n_iterations: parseInt(params.n_iterations),
                    alpha: parseFloat(params.alpha),
                    beta: parseFloat(params.beta),
                    evaporation_rate: parseFloat(params.evaporation_rate)
                }
            };
            
            if (payload.cities.some(c => isNaN(c.lat) || isNaN(c.lng))) {
                throw new Error("All city coordinates must be valid numbers.");
            }
            
            if (Object.values(payload.params).some(isNaN)) {
                throw new Error("All parameters must be valid numbers.");
            }

            const response = await fetch('/api/analysis/ant-colony', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                 const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to run analysis');
            }
            const res = await response.json();
            if (res.error) throw new Error(res.error);

            setResult(res);
            toast({ title: "Success", description: "ACO found an optimal path." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Waypoints /> Ant Colony Optimization (ACO)</CardTitle>
                    <CardDescription>Find the shortest path for a salesman to visit a set of cities, inspired by how ants find food.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-1"><Label>Ants</Label><Input value={params.n_ants} onChange={e => setParams(p => ({...p, n_ants: e.target.value}))}/></div>
                        <div className="space-y-1"><Label>Iterations</Label><Input value={params.n_iterations} onChange={e => setParams(p => ({...p, n_iterations: e.target.value}))}/></div>
                        <div className="space-y-1"><Label>&alpha; (Pheromone)</Label><Input value={params.alpha} onChange={e => setParams(p => ({...p, alpha: e.target.value}))}/></div>
                        <div className="space-y-1"><Label>&beta; (Heuristic)</Label><Input value={params.beta} onChange={e => setParams(p => ({...p, beta: e.target.value}))}/></div>
                        <div className="space-y-1"><Label>&rho; (Evaporation)</Label><Input value={params.evaporation_rate} onChange={e => setParams(p => ({...p, evaporation_rate: e.target.value}))}/></div>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-semibold">Cities (Nodes)</Label>
                        {cities.map((city, index) => (
                            <div key={city.id} className="grid grid-cols-[1fr,100px,100px,auto] gap-2 items-center">
                                <Input value={city.name} onChange={e => setCities(produce(draft => { draft[index].name = e.target.value; }))} placeholder="City Name" />
                                <Input type="number" value={city.lat} onChange={e => setCities(produce(draft => { draft[index].lat = e.target.value; }))} placeholder="Latitude" />
                                <Input type="number" value={city.lng} onChange={e => setCities(produce(draft => { draft[index].lng = e.target.value; }))} placeholder="Longitude" />
                                <Button variant="ghost" size="icon" onClick={() => setCities(produce(draft => { draft.splice(index, 1); }))}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addCity}><Plus className="mr-2"/>Add City</Button>
                    </div>
                    <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Find Path</Button>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-primary"/></div></CardContent></Card>}

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Optimization Results</CardTitle>
                        <CardDescription>The best path found by the ant colony.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div>
                            <p className="font-semibold">Total Distance</p>
                            <p className="text-3xl font-bold text-primary">{result.results.total_distance.toFixed(2)}</p>
                            <p className="font-semibold mt-4">Optimal Path</p>
                            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                                {result.results.best_path.map((city, index) => <li key={index}>{city}</li>)}
                                <li>{result.results.best_path[0]} (Return to start)</li>
                            </ol>
                        </div>
                        <div>
                            {result.plot ? 
                                <Image src={result.plot} alt="ACO Path" width={500} height={500} className="rounded-lg border"/>
                                : <Skeleton className="w-full h-[400px]"/>
                            }
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

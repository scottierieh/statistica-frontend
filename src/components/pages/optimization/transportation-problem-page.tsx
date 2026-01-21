'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TransportationProblemPage() {
    const { toast } = useToast();

    const [numSources, setNumSources] = useState(2);
    const [numDestinations, setNumDestinations] = useState(3);
    
    const [costs, setCosts] = useState<string[][]>([['4', '6', '9'], ['5', '2', '7']]);
    const [supplies, setSupplies] = useState<string[]>(['120', '150']);
    const [demands, setDemands] = useState<string[]>(['80', '90', '100']);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const updateDimensions = (newSources: number, newDests: number) => {
        setCosts(current => {
            const newMatrix = Array(newSources).fill(0).map(() => Array(newDests).fill('0'));
            for (let i = 0; i < Math.min(newSources, current.length); i++) {
                for (let j = 0; j < Math.min(newDests, current[i]?.length || 0); j++) {
                    newMatrix[i][j] = current[i][j];
                }
            }
            return newMatrix;
        });
        setSupplies(current => Array(newSources).fill('0').map((v, i) => current[i] || v));
        setDemands(current => Array(newDests).fill('0').map((v, i) => current[i] || v));
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                costs: costs.map(row => row.map(Number)),
                supply: supplies.map(Number),
                demand: demands.map(Number),
            };

            if (payload.costs.flat().some(isNaN) || payload.supply.some(isNaN) || payload.demand.some(isNaN)) {
                throw new Error("All inputs must be valid numbers.");
            }

            const response = await fetch('/api/analysis/transportation-problem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(await response.text());
            const res = await response.json();
            if (res.error) throw new Error(res.error);

            setResult(res);
            toast({ title: "Success", description: "Transportation problem solved." });
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
                    <CardTitle>Transportation Problem Solver</CardTitle>
                    <CardDescription>Find the minimum cost to transport goods from sources to destinations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Sources</Label><Input type="number" value={numSources} onChange={e => { const v = parseInt(e.target.value, 10); if(v > 0 && v <= 10) { setNumSources(v); updateDimensions(v, numDestinations); } }} min="1" max="10"/></div>
                        <div><Label>Destinations</Label><Input type="number" value={numDestinations} onChange={e => { const v = parseInt(e.target.value, 10); if(v > 0 && v <= 10) { setNumDestinations(v); updateDimensions(numSources, v); } }} min="1" max="10"/></div>
                    </div>
                    <div>
                        <Label>Cost Matrix, Supply, and Demand</Label>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Source</TableHead>
                                    {Array.from({length: numDestinations}).map((_, j) => <TableHead key={j}>Dest. {j+1}</TableHead>)}
                                    <TableHead>Supply</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {costs.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>Source {i+1}</TableCell>
                                        {row.map((cost, j) => (
                                            <TableCell key={j}>
                                                <Input value={cost} onChange={e => setCosts(produce(draft => { draft[i][j] = e.target.value; }))} />
                                            </TableCell>
                                        ))}
                                        <TableCell><Input value={supplies[i]} onChange={e => setSupplies(produce(draft => { draft[i] = e.target.value; }))} /></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell>Demand</TableCell>
                                    {demands.map((demand, j) => (
                                        <TableCell key={j}><Input value={demand} onChange={e => setDemands(produce(draft => { draft[j] = e.target.value; }))} /></TableCell>
                                    ))}
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Solve</Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                    <CardContent>
                        <p><strong>Total Cost:</strong> {result.total_cost?.toFixed(2)}</p>
                        <p className="mt-2"><strong>Optimal Shipments:</strong></p>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.shipments?.map((ship: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell>{ship.source}</TableCell>
                                        <TableCell>{ship.destination}</TableCell>
                                        <TableCell>{ship.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

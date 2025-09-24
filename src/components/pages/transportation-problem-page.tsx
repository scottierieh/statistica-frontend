
'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, Truck, Warehouse, MapPin, Building, Factory, Store, HelpCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TransportationResult {
    success: boolean;
    solution: number[][];
    total_cost: number;
}

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center justify-center gap-2"><Truck /> Transportation Problem</CardTitle>
                    <CardDescription className="text-base pt-2">
                        Find the most cost-effective way to ship goods from multiple sources (e.g., factories) to multiple destinations (e.g., warehouses).
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-left space-y-4">
                    <p>
                        The Transportation Problem is a classic optimization problem. It helps businesses minimize transportation costs by determining the optimal quantity of goods to ship from each supply point to each demand point, while respecting supply and demand constraints.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Sources:</strong> Locations with a limited supply of goods (e.g., factories, plants).</li>
                        <li><strong>Destinations:</strong> Locations with a specific demand for goods (e.g., warehouses, retail stores).</li>
                        <li><strong>Costs:</strong> The cost to transport one unit of a good from each source to each destination.</li>
                        <li><strong>Optimal Solution:</strong> The shipping plan that satisfies all demand without exceeding supply, at the lowest possible total cost.</li>
                    </ul>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={onStart}>Get Started</Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export default function TransportationProblemPage() {
    const { toast } = useToast();
    const [view, setView] = useState('main');
    const [numSources, setNumSources] = useState(3);
    const [numDestinations, setNumDestinations] = useState(4);
    
    const [supply, setSupply] = useState<number[]>([35, 50, 40]);
    const [demand, setDemand] = useState<number[]>([45, 20, 30, 30]);
    const [costs, setCosts] = useState<number[][]>([
        [8, 6, 10, 9],
        [9, 12, 13, 7],
        [14, 9, 16, 5]
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<TransportationResult | null>(null);

    const handleBoardCreation = () => {
        const sources = Math.max(1, numSources);
        const destinations = Math.max(1, numDestinations);
        setSupply(Array(sources).fill(10));
        setDemand(Array(destinations).fill(10));
        setCosts(Array(sources).fill(null).map(() => Array(destinations).fill(1)));
        setAnalysisResult(null);
    };

    const handleMatrixChange = (val: string, i: number, j: number, type: 'costs' | 'supply' | 'demand') => {
        const numVal = parseFloat(val) || 0;
        if (type === 'costs') {
            const newCosts = [...costs];
            newCosts[i][j] = numVal;
            setCosts(newCosts);
        } else if (type === 'supply') {
            const newSupply = [...supply];
            newSupply[i] = numVal;
            setSupply(newSupply);
        } else if (type === 'demand') {
            const newDemand = [...demand];
            newDemand[j] = numVal;
            setDemand(newDemand);
        }
    };
    
    const handleAnalysis = useCallback(async () => {
        const total_supply = supply.reduce((a, b) => a + b, 0);
        const total_demand = demand.reduce((a, b) => a + b, 0);
        if (total_supply < total_demand) {
            toast({ title: 'Imbalanced Problem', description: 'Total supply must be greater than or equal to total demand.', variant: 'destructive'});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/transportation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ costs, supply, demand })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: TransportationResult = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [costs, supply, demand, toast]);

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Transportation Problem</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Define your supply, demand, and costs to find the optimal shipping plan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                           <Label htmlFor="num-sources">Sources:</Label>
                           <Input id="num-sources" type="number" value={numSources} onChange={e => setNumSources(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="num-destinations">Destinations:</Label>
                            <Input id="num-destinations" type="number" value={numDestinations} onChange={e => setNumDestinations(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <Button onClick={handleBoardCreation}>Create Board</Button>
                    </div>
                    
                    <div className="space-y-6 pt-4 overflow-x-auto">
                        <h3 className="font-semibold">Cost Matrix, Supply, and Demand</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]"><Warehouse className="w-5 h-5"/></TableHead>
                                    {Array.from({ length: numDestinations }).map((_, j) => (
                                        <TableHead key={j}>Destination {j + 1}</TableHead>
                                    ))}
                                    <TableHead className="w-[120px] bg-secondary">Supply</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: numSources }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableHead>Source {i + 1}</TableHead>
                                        {Array.from({ length: numDestinations }).map((_, j) => (
                                            <TableCell key={j}>
                                                <Input type="number" value={costs[i]?.[j] || 0} onChange={e => handleMatrixChange(e.target.value, i, j, 'costs')} className="w-24"/>
                                            </TableCell>
                                        ))}
                                        <TableCell className="bg-secondary">
                                            <Input type="number" value={supply[i] || 0} onChange={e => handleMatrixChange(e.target.value, i, 0, 'supply')} className="w-24 bg-secondary-foreground/10" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-secondary">
                                    <TableHead>Demand</TableHead>
                                    {Array.from({ length: numDestinations }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Input type="number" value={demand[j] || 0} onChange={e => handleMatrixChange(e.target.value, 0, j, 'demand')} className="w-24 bg-secondary-foreground/10"/>
                                        </TableCell>
                                    ))}
                                    <TableCell className="bg-secondary text-right font-mono">
                                        ΣS: {supply.reduce((a,b)=>a+b,0)}
                                        <br/>
                                        ΣD: {demand.reduce((a,b)=>a+b,0)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Calculating...</> : <><Play className="mr-2"/>Solve</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Optimal Shipping Plan</CardTitle>
                        <CardDescription>The most cost-effective distribution of goods.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="p-4 bg-muted rounded-lg text-center mb-4">
                            <p className="text-muted-foreground">Minimum Total Cost</p>
                            <p className="text-3xl font-bold text-primary">${analysisResult.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]"></TableHead>
                                    {Array.from({ length: numDestinations }).map((_, j) => (
                                        <TableHead key={j}>Destination {j + 1}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysisResult.solution.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableHead>Source {i + 1}</TableHead>
                                        {row.map((val, j) => (
                                            <TableCell key={j}>
                                                <div className={`p-2 rounded text-center font-mono ${val > 0 ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}>
                                                    {val.toFixed(2)}
                                                </div>
                                            </TableCell>
                                        ))}
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

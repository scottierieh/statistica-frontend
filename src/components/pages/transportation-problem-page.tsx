'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle, Truck, MoveRight, Package, MapPin, DollarSign, CheckCircle, BookOpen, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface TransportationResult {
    initial_solution: number[][];
    initial_cost: number;
    initial_method: string;
    optimal_solution?: number[][];
    optimal_cost?: number;
    optimization_method?: string;
    steps?: any[];
    message?: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Truck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Transportation Problem</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Find the most cost-effective way to ship goods from multiple sources to multiple destinations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Package className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Supply & Demand</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Balance goods from multiple supply points to satisfy demand at various destinations
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <DollarSign className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Cost Optimization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Minimize total transportation costs while meeting all supply and demand constraints
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <MapPin className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Optimal Routes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Determine the best shipping plan from each source to each destination
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            How It Works
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            The Transportation Problem is a classic optimization problem that helps businesses minimize 
                            transportation costs by determining the optimal quantity of goods to ship from each supply 
                            point to each demand point, while respecting supply and demand constraints.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Problem Components
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sources:</strong> Locations with limited supply (factories, plants)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Destinations:</strong> Locations with demand (warehouses, stores)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Costs:</strong> Transport cost per unit from each source to destination</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    Solution Methods
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Initial Solution:</strong> North-West Corner, Least Cost, or VAM</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Optimization:</strong> MODI method for finding optimal solution</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Result:</strong> Shipping plan with minimum total cost</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-2">
                        <Button variant="outline" onClick={onLoadExample} size="lg">
                            <FileJson className="mr-2 h-5 w-5" />
                            Load Example
                        </Button>
                        <Button onClick={onStart} size="lg">
                            <Truck className="mr-2 h-5 w-5" />
                            Start New Analysis
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


export default function TransportationProblemPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [numSources, setNumSources] = useState(3);
    const [numDestinations, setNumDestinations] = useState(4);
    
    const [supply, setSupply] = useState<number[]>([35, 50, 40]);
    const [demand, setDemand] = useState<number[]>([45, 20, 30, 30]);
    const [costs, setCosts] = useState<number[][]>([
        [8, 6, 10, 9],
        [9, 12, 13, 7],
        [14, 9, 16, 5]
    ]);
    
    const [initialMethod, setInitialMethod] = useState('least_cost');
    const [optimizationMethod, setOptimizationMethod] = useState('modi');

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

    const handleLoadExample = () => {
        setNumSources(3);
        setNumDestinations(4);
        setSupply([35, 50, 40]);
        setDemand([45, 20, 30, 30]);
        setCosts([[8, 6, 10, 9], [9, 12, 13, 7], [14, 9, 16, 5]]);
        setAnalysisResult(null);
        setView('main');
        toast({ title: "Sample Data Loaded", description: "Example transportation problem has been set up." });
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
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/transportation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    costs, 
                    supply, 
                    demand,
                    initial_method: initialMethod,
                    optimization_method: optimizationMethod
                })
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
    }, [costs, supply, demand, initialMethod, optimizationMethod, toast]);

    const renderSolutionTable = (solution: number[][], title: string, cost: number) => (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{title}</CardTitle>
                <CardDescription>Total Cost: <span className="font-bold text-primary">${cost.toFixed(2)}</span></CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead />
                            {Array.from({ length: solution[0].length }).map((_, j) => (
                                <TableHead key={j} className="text-center">Destination {j + 1}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {solution.map((row, i) => (
                            <TableRow key={i}>
                                <TableHead>Source {i + 1}</TableHead>
                                {row.map((val, j) => (
                                    <TableCell key={j} className="text-center">
                                        <div className={`p-2 rounded font-mono ${val > 0 ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}>
                                            {val.toFixed(0)}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Transportation Problem Solver</CardTitle>
                            <CardDescription>
                                Define your supply, demand, and costs to find the optimal shipping plan
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
                        <Button onClick={handleBoardCreation}>
                            <Asterisk className="mr-2 h-4 w-4" />Create Board
                        </Button>
                        <Button variant="outline" onClick={handleLoadExample}>
                           <FileJson className="mr-2 h-4 w-4" /> Load Example
                        </Button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Initial Solution Method</Label>
                            <Select value={initialMethod} onValueChange={(v) => setInitialMethod(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="north_west">North-West Corner</SelectItem>
                                    <SelectItem value="least_cost">Least Cost</SelectItem>
                                    <SelectItem value="vam">Vogel's Approximation (VAM)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Optimization Method</Label>
                             <Select value={optimizationMethod} onValueChange={(v) => setOptimizationMethod(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="modi">MODI Method</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="space-y-6 pt-4 overflow-x-auto">
                        <h3 className="font-semibold">Cost Matrix, Supply, and Demand</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]"/>
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
                                        ΣS: {supply.reduce((a,b)=>a+b,0)}<br/>
                                        ΣD: {demand.reduce((a,b)=>a+b,0)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading} size="lg">
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Calculating...</> : <><Play className="mr-2"/>Solve</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                <div className="space-y-4">
                    {analysisResult.optimal_solution && (
                        renderSolutionTable(analysisResult.optimal_solution, `Optimal Solution`, analysisResult.optimal_cost!)
                    )}
                </div>
            )}
        </div>
    );
}

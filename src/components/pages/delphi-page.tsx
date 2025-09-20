

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, Plus, Trash2, HelpCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface Round {
    name: string;
    items: string[];
}

interface DelphiItemResult {
    mean: number;
    std: number;
    median: number;
    q1: number;
    q3: number;
    cvr: number;
    consensus: number;
    convergence: number;
    cv: number; // Coefficient of Variation
    positive_responses: number;
    stability: number; // New stability calculation
}

interface DelphiRoundResult {
    [itemName: string]: DelphiItemResult;
}

interface DelphiResults {
    [roundName: string]: {
        items: DelphiRoundResult;
        cronbach_alpha: number;
    };
}


interface FullAnalysisResponse {
    results: DelphiResults;
}

interface DelphiPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DelphiPage({ data, numericHeaders, onLoadExample }: DelphiPageProps) {
    const { toast } = useToast();
    const [rounds, setRounds] = useState<Round[]>([{ name: 'Round 1', items: numericHeaders }]);
    const [scaleMax, setScaleMax] = useState(5);
    const [cvrThreshold, setCvrThreshold] = useState(4);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    useEffect(() => {
        setRounds([{ name: 'Round 1', items: numericHeaders }]);
        setAnalysisResult(null);
    }, [data, numericHeaders])

    const handleAddRound = () => {
        setRounds(prev => [...prev, { name: `Round ${prev.length + 1}`, items: [] }]);
    };
    
    const handleItemSelectionChange = (roundIndex: number, item: string, checked: boolean) => {
        setRounds(prev => {
            const newRounds = [...prev];
            const currentItems = newRounds[roundIndex].items;
            newRounds[roundIndex].items = checked
                ? [...currentItems, item]
                : currentItems.filter(i => i !== item);
            return newRounds;
        });
    };

    const handleAnalysis = useCallback(async () => {
        if (rounds.some(r => r.items.length === 0)) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Each round must have at least one item selected.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/delphi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, rounds, scaleMax, cvrThreshold })
            });
            if (!response.ok) {
                 const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
             const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "Delphi analysis metrics have been calculated." });
        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, rounds, scaleMax, cvrThreshold, toast]);

    if (!canRun) {
        const delphiExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('delphi'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Delphi Analysis</CardTitle>
                        <CardDescription>To perform a Delphi analysis, you need survey data with numeric responses. Try an example dataset.</CardDescription>
                    </CardHeader>
                    {delphiExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(delphiExamples[0])} className="w-full">
                                <Users className="mr-2 h-4 w-4" />
                                Load {delphiExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    return (
        <TooltipProvider>
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Delphi Analysis Setup</CardTitle>
                        <CardDescription>Configure the rounds and items for your Delphi study.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label>Likert Scale Maximum</Label>
                                <Input type="number" value={scaleMax} onChange={e => setScaleMax(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label>CVR "Essential" Threshold</Label>
                                <Input type="number" value={cvrThreshold} onChange={e => setCvrThreshold(Number(e.target.value))} />
                            </div>
                        </div>
                        {rounds.map((round, index) => (
                            <Card key={index}>
                                <CardHeader><CardTitle>Round {index + 1}</CardTitle></CardHeader>
                                <CardContent>
                                    <Label>Items for Round {index + 1}</Label>
                                    <ScrollArea className="h-40 border rounded-md p-2">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {numericHeaders.map(h => (
                                                <div key={h} className="flex items-center space-x-2">
                                                    <Checkbox id={`r${index}-${h}`} checked={round.items.includes(h)} onCheckedChange={c => handleItemSelectionChange(index, h, c as boolean)} />
                                                    <Label htmlFor={`r${index}-${h}`}>{h}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        ))}
                        <Button variant="outline" onClick={handleAddRound}><Plus className="mr-2" /> Add Round</Button>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </CardFooter>
                </Card>

                {isLoading && <Skeleton className="h-96 w-full" />}
                
                {analysisResult && (
                    <Card>
                        <CardHeader><CardTitle>Analysis Results</CardTitle></CardHeader>
                        <CardContent>
                            <Tabs defaultValue={rounds[0].name}>
                                <TabsList>
                                    {rounds.map(r => <TabsTrigger key={r.name} value={r.name}>{r.name}</TabsTrigger>)}
                                </TabsList>
                                {rounds.map(r => (
                                    <TabsContent key={r.name} value={r.name} className="mt-4">
                                        <div className="mb-4">
                                            <Badge>Cronbach's α: {analysisResult.results[r.name]?.cronbach_alpha?.toFixed(3) ?? 'N/A'}</Badge>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead className="text-right">Mean</TableHead>
                                                    <TableHead className="text-right">SD</TableHead>
                                                    <TableHead className="text-right">Ne</TableHead>
                                                     <TableHead className="text-right">
                                                        <Tooltip><TooltipTrigger>CV <HelpCircle className="inline h-3 w-3" /></TooltipTrigger><TooltipContent>Coefficient of Variation ≤ 0.5</TooltipContent></Tooltip>
                                                    </TableHead>
                                                    <TableHead className="text-right">Q1</TableHead>
                                                    <TableHead className="text-right">Median</TableHead>
                                                    <TableHead className="text-right">Q3</TableHead>
                                                    <TableHead className="text-right">
                                                        <Tooltip><TooltipTrigger>Consensus <HelpCircle className="inline h-3 w-3" /></TooltipTrigger><TooltipContent>Consensus ≥ 0.75</TooltipContent></Tooltip>
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        <Tooltip><TooltipTrigger>Convergence <HelpCircle className="inline h-3 w-3" /></TooltipTrigger><TooltipContent>Convergence (Median - Q1) ≤ 1.0</TooltipContent></Tooltip>
                                                    </TableHead>
                                                     <TableHead className="text-right">
                                                        <Tooltip><TooltipTrigger>Stability <HelpCircle className="inline h-3 w-3" /></TooltipTrigger><TooltipContent>Stability between rounds</TooltipContent></Tooltip>
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        <Tooltip><TooltipTrigger>CVR <HelpCircle className="inline h-3 w-3" /></TooltipTrigger><TooltipContent>Content Validity Ratio > 0</TooltipContent></Tooltip>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(analysisResult.results[r.name]?.items || {}).map(([item, stats]) => (
                                                    <TableRow key={item}>
                                                        <TableCell>{item}</TableCell>
                                                        <TableCell className="text-right font-mono">{stats.mean.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{stats.std.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{stats.positive_responses}</TableCell>
                                                        <TableCell className="text-right"><Badge variant={stats.cv <= 0.5 ? 'default' : 'secondary'}>{stats.cv.toFixed(3)}</Badge></TableCell>
                                                        <TableCell className="text-right font-mono">{stats.q1.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{stats.median.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{stats.q3.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right"><Badge variant={stats.consensus >= 0.75 ? 'default' : 'secondary'}>{stats.consensus.toFixed(3)}</Badge></TableCell>
                                                        <TableCell className="text-right"><Badge variant={stats.convergence <= 1.0 ? 'default' : 'secondary'}>{stats.convergence.toFixed(3)}</Badge></TableCell>
                                                        <TableCell className="text-right"><Badge variant={!isNaN(stats.stability) && stats.stability <= 0.5 ? 'default' : 'secondary'}>{isNaN(stats.stability) ? 'N/A' : stats.stability.toFixed(3)}</Badge></TableCell>
                                                        <TableCell className="text-right"><Badge variant={stats.cvr > 0 ? 'default' : 'secondary'}>{stats.cvr.toFixed(3)}</Badge></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
            </div>
        </TooltipProvider>
    );
}


'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, Plus, Trash2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';


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
    stability: number;
    convergence?: number;
}

interface DelphiResults {
    [roundName: string]: {
        [itemName: string]: DelphiItemResult;
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
                                Load {delphiExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    return (
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
                                <TabsContent key={r.name} value={r.name}>
                                    <Table>
                                        <TableHeader><TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Std</TableHead>
                                            <TableHead className="text-right">CVR</TableHead>
                                            <TableHead className="text-right">Consensus (IQR)</TableHead>
                                            <TableHead className="text-right">Stability (CV)</TableHead>
                                            <TableHead className="text-right">Convergence</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(analysisResult.results[r.name] || {}).map(([item, stats]) => (
                                                <TableRow key={item}>
                                                    <TableCell>{item}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right"><Badge variant={stats.cvr > 0 ? 'default' : 'secondary'}>{stats.cvr.toFixed(3)}</Badge></TableCell>
                                                    <TableCell className="text-right"><Badge variant={stats.consensus <= 1 ? 'default' : 'secondary'}>{stats.consensus.toFixed(3)}</Badge></TableCell>
                                                    <TableCell className="text-right"><Badge variant={stats.stability <= 0.5 ? 'default' : 'secondary'}>{stats.stability.toFixed(3)}</Badge></TableCell>
                                                    <TableCell className="text-right font-mono">{stats.convergence?.toFixed(3) ?? 'N/A'}</TableCell>
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
    );
}

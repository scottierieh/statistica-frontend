
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DtResults {
    accuracy: number;
    confusion_matrix: number[][];
    class_names: string[];
}

interface FullAnalysisResponse {
    results: DtResults;
    plot: string;
}

interface DecisionTreePageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DecisionTreePage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DecisionTreePageProps) {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [randomState, setRandomState] = useState<number>(42);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setTarget(categoricalHeaders.find(h => new Set(data.map(row => row[h])).size > 1) || categoricalHeaders[0]);
    }, [data, categoricalHeaders]);

    useEffect(() => {
        if(target) {
            setFeatures(allHeaders.filter(h => h !== target));
        } else {
            setFeatures([]);
        }
        setAnalysisResult(null);
    }, [target, allHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/decision-tree-classifier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    target, 
                    features,
                    random_state: randomState,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, randomState, toast]);
    
    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== target), [allHeaders, target]);

    if (!canRun) {
        const dtExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('decision-tree-classifier'));
        return (
            <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Decision Tree Classifier</CardTitle>
                        <CardDescription>
                           Upload data with features and a categorical target variable.
                        </CardDescription>
                    </CardHeader>
                    {dtExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(dtExamples[0])} className="w-full">
                                <GitBranch className="mr-2 h-4 w-4" /> Load {dtExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Decision Tree Classifier Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Features</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                               {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    <div>
                        <Label>Random State</Label>
                        <Input type="number" value={randomState} onChange={e => setRandomState(Number(e.target.value))} />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Training...</> : <><Sigma className="mr-2"/>Train Model</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Performance</CardTitle>
                        </CardHeader>
                         <CardContent className="grid md:grid-cols-2 gap-4">
                             <div>
                                <h3 className="font-semibold">Accuracy</h3>
                                <p className="text-3xl font-bold">{(results.accuracy * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                                <h3 className="font-semibold">Confusion Matrix</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead></TableHead>
                                            {results.class_names.map(name => <TableHead key={name} className="text-center">Predicted {name}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.class_names.map((name, i) => (
                                            <TableRow key={name}>
                                                <TableHead>Actual {name}</TableHead>
                                                {results.confusion_matrix[i].map((val, j) => (
                                                    <TableCell key={j} className="text-center font-mono">{val}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Decision Tree Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Image src={analysisResult.plot} alt="Decision Tree Plot" width={1200} height={800} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

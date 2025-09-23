
'use client';
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, BarChart } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface AnalysisResponse {
    results: {
        scores: { [classifier: string]: number };
    };
    plot: string;
}

export default function ClassifierComparisonPage() {
    const { toast } = useToast();
    const [dataset, setDataset] = useState('moons');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/classifier-comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataset }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to run analysis');
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Success', description: 'Classifier comparison is complete.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [dataset, toast]);
    
    const scores = analysisResult?.results.scores;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Classifier Model Comparison</CardTitle>
                    <CardDescription>Compare various classification algorithms on different synthetic datasets.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-center gap-4">
                        <Select value={dataset} onValueChange={setDataset}>
                            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="moons">Moons</SelectItem>
                                <SelectItem value="circles">Circles</SelectItem>
                                <SelectItem value="linear">Linearly Separable</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={handleAnalysis} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" />Running...</> : <><Play className="mr-2" />Run Comparison</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[200px] w-full" /></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Decision Boundary Visualization</CardTitle>
                            <CardDescription>
                                This chart shows the input data and the decision boundaries learned by each classifier. The number in the bottom right of each plot is the test set accuracy.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Classifier Comparison Plot" width={2700} height={900} className="rounded-md border" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Model Accuracy Scores</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Classifier</TableHead>
                                        <TableHead className="text-right">Accuracy Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {scores && Object.entries(scores).sort(([,a], [,b]) => b - a).map(([name, score]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name}</TableCell>
                                            <TableCell className="font-mono text-right">{score.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

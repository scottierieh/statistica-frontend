
'use client';
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, BarChart, Settings, SlidersHorizontal } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface AnalysisResponse {
    results: {
        scores: { [classifier: string]: number };
    };
    plot: string;
}

const defaultParams = {
    "Nearest Neighbors": { n_neighbors: 3 },
    "Linear SVM": { C: 0.025 },
    "RBF SVM": { gamma: 2, C: 1 },
    "Gaussian Process": { length_scale: 1.0 },
    "Decision Tree": { max_depth: 5 },
    "Random Forest": { max_depth: 5, n_estimators: 10, max_features: 1 },
    "Neural Net": { alpha: 1 },
    "AdaBoost": {},
    "Naive Bayes": {},
    "QDA": {},
};

export default function ClassifierComparisonPage() {
    const { toast } = useToast();
    const [dataset, setDataset] = useState('moons');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [params, setParams] = useState<any>(defaultParams);
    
    const handleParamChange = (classifier: string, param: string, value: string) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            setParams((prev: any) => ({
                ...prev,
                [classifier]: {
                    ...prev[classifier],
                    [param]: numValue
                }
            }));
        }
    };


    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/classifier-comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataset, params }),
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
    }, [dataset, params, toast]);
    
    const scores = analysisResult?.results.scores;

    const renderParamInputs = (classifier: string) => {
        const classifierParams = params[classifier];
        if (!classifierParams || Object.keys(classifierParams).length === 0) return <p className="text-xs text-muted-foreground">No parameters to configure.</p>;

        return Object.entries(classifierParams).map(([param, value]) => (
            <div key={param} className="grid grid-cols-2 items-center gap-2">
                <Label htmlFor={`${classifier}-${param}`} className="text-xs">{param.replace(/_/g, ' ')}</Label>
                <Input
                    id={`${classifier}-${param}`}
                    type="number"
                    value={value as any}
                    onChange={(e) => handleParamChange(classifier, param, e.target.value)}
                    className="h-8"
                />
            </div>
        ));
    };

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
                         <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>
                                    <Button variant="outline"><SlidersHorizontal className="mr-2"/>Advanced Settings</Button>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 border rounded-lg mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                                        {Object.keys(params).map(classifier => (
                                            <div key={classifier}>
                                                <h4 className="font-semibold mb-2 text-sm">{classifier}</h4>
                                                <div className="space-y-2">
                                                    {renderParamInputs(classifier)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Running...</> : <><Play className="mr-2" />Run Comparison</>}
                    </Button>
                </CardFooter>
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
                        <CardContent className="flex justify-center overflow-x-auto">
                            <Image src={analysisResult.plot} alt="Classifier Comparison Plot" width={1000} height={3000} className="rounded-md border" />
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

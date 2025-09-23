
'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, SlidersHorizontal } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import DataUploader from '../data-uploader';
import { DataSet } from '@/lib/stats';
import { ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';

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

export default function ClassifierComparisonPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample, onFileSelected }: { data: DataSet, allHeaders: string[], numericHeaders: string[], categoricalHeaders: string[], onLoadExample: (example: ExampleDataSet) => void, onFileSelected?: (file: File) => void }) {
    const { toast } = useToast();
    const [datasetType, setDatasetType] = useState<'synthetic' | 'custom'>(data.length > 0 ? 'custom' : 'synthetic');
    const [syntheticDataset, setSyntheticDataset] = useState('moons');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [params, setParams] = useState<any>(defaultParams);
    
    // For custom data
    const [targetVar, setTargetVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [features, setFeatures] = useState<string[]>(numericHeaders);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setTargetVar(categoricalHeaders[0]);
        setFeatures(numericHeaders);
    }, [data, numericHeaders, categoricalHeaders]);


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
    
    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => {
            const newFeatures = checked ? [...prev, header] : prev.filter(f => f !== header);
            return newFeatures;
        });
    };


    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        let body: any = { params };
        if (datasetType === 'custom') {
            if (!data || !targetVar || features.length < 2) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select a target and at least two feature variables for custom data.' });
                setIsLoading(false);
                return;
            }
            body = { ...body, data, target_col: targetVar, feature_cols: features };
        } else {
            body = { ...body, dataset: syntheticDataset };
        }


        try {
            const response = await fetch('/api/analysis/classifier-comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
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
    }, [datasetType, syntheticDataset, params, toast, data, targetVar, features]);
    
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

    const classifierExample = exampleDatasets.find(ex => ex.id === 'loan-approval');
    
     if (data.length === 0 && datasetType === 'custom') {
        return (
             <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Classifier Model Comparison</CardTitle>
                        <CardDescription>Upload your data to compare classifiers or switch to synthetic datasets.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {onFileSelected && <DataUploader onFileSelected={onFileSelected} loading={isUploading} />}
                        {classifierExample && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                                </div>
                                 <Button variant="secondary" className="w-full" onClick={() => onLoadExample(classifierExample)}>
                                    <classifierExample.icon className="mr-2"/>
                                    {classifierExample.name}
                                </Button>
                            </>
                        )}
                        <Button variant="link" onClick={() => setDatasetType('synthetic')}>Use Synthetic Datasets</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Classifier Model Comparison</CardTitle>
                    <CardDescription>Compare various classification algorithms on different datasets.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <Select value={datasetType} onValueChange={(v) => setDatasetType(v as any)}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="synthetic">Synthetic Dataset</SelectItem>
                                <SelectItem value="custom">Uploaded Data</SelectItem>
                            </SelectContent>
                        </Select>

                        {datasetType === 'synthetic' && (
                             <Select value={syntheticDataset} onValueChange={setSyntheticDataset}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="moons">Moons</SelectItem>
                                    <SelectItem value="circles">Circles</SelectItem>
                                    <SelectItem value="linear">Linearly Separable</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {datasetType === 'custom' && (
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <Label>Target Variable</Label>
                                <Select value={targetVar} onValueChange={setTargetVar}>
                                    <SelectTrigger><SelectValue placeholder="Select Target"/></SelectTrigger>
                                    <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="lg:col-span-1">
                                <Label>Feature Variables (select at least 2)</Label>
                                <ScrollArea className="h-24 p-2 border rounded-md">
                                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                                        {numericHeaders.filter(h => h !== targetVar).map(h => (
                                            <div key={h} className="flex items-center space-x-2">
                                                <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                                <Label htmlFor={`feat-${h}`} className="text-sm font-normal">{h}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <Button variant="outline"><SlidersHorizontal className="mr-2"/>Advanced Settings</Button>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 border rounded-lg mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
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
                            <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="Classifier Comparison Plot" width={1800} height={1200} className="rounded-md border" />
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

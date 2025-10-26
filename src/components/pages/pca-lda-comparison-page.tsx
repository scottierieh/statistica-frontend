
'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import DataUploader from '../data-uploader';
import type { DataSet } from '@/lib/stats';
import { ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';


interface AnalysisResponse {
    results: {
        pca_explained_variance: number[];
    };
    plots: {
        pca: string;
        lda: string;
    };
}

export default function PcaLdaComparisonPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample, onFileSelected }: { data?: DataSet, allHeaders?: string[], numericHeaders?: string[], categoricalHeaders?: string[], onLoadExample?: (example: ExampleDataSet) => void, onFileSelected?: (file: File) => void }) {
    const { toast } = useToast();
    const [datasetType, setDatasetType] = useState<'default' | 'custom'>(data && data.length > 0 ? 'custom' : 'default');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // For custom data
    const [targetVar, setTargetVar] = useState<string | undefined>(categoricalHeaders?.[0]);
    const [features, setFeatures] = useState<string[]>(numericHeaders || []);

    useEffect(() => {
        setDatasetType(data && data.length > 0 ? 'custom' : 'default');
        setTargetVar(categoricalHeaders?.[0]);
        setFeatures(numericHeaders || []);
    }, [data, numericHeaders, categoricalHeaders]);
    
    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => {
            const newFeatures = checked ? [...prev, header] : prev.filter(f => f !== header);
            return newFeatures;
        });
    };

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        let body: any = { };
        if (datasetType === 'custom') {
             if (!data || !targetVar || !features || features.length < 2) {
                toast({ variant: 'destructive', title: 'Error', description: 'For custom data, please select a target and at least two feature variables.' });
                setIsLoading(false);
                return;
            }
            body = { data, target_col: targetVar, feature_cols: features };
        } else {
             // Default uses Iris dataset in the backend, no body needed
        }

        try {
            const response = await fetch('/api/analysis/pca-lda-comparison', {
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
            toast({ title: 'Success', description: 'PCA vs. LDA comparison is complete.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [datasetType, toast, data, targetVar, features]);
    
     const irisExample = exampleDatasets.find(ex => ex.id === 'iris');

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">PCA vs. LDA Comparison Setup</CardTitle>
                    <CardDescription>Compare Principal Component Analysis (unsupervised) and Linear Discriminant Analysis (supervised) for dimensionality reduction.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <Select value={datasetType} onValueChange={(v) => setDatasetType(v as any)}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Default Iris Dataset</SelectItem>
                                <SelectItem value="custom">Uploaded Data</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {datasetType === 'custom' && (
                        <div className="space-y-4">
                             {(!data || data.length === 0) ? (
                                onFileSelected && <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                            ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Target Variable (Group)</Label>
                                    <Select value={targetVar} onValueChange={setTargetVar}>
                                        <SelectTrigger><SelectValue placeholder="Select Target"/></SelectTrigger>
                                        <SelectContent>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="lg:col-span-1">
                                    <Label>Feature Variables (select at least 2)</Label>
                                    <ScrollArea className="h-24 p-2 border rounded-md">
                                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                                            {(numericHeaders || []).filter(h => h !== targetVar).map(h => (
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
                            {irisExample && onLoadExample && (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                                    </div>
                                    <Button variant="secondary" className="w-full" onClick={() => onLoadExample(irisExample)}>
                                        <irisExample.icon className="mr-2"/>
                                        Load Iris Dataset
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Running...</> : <><Play className="mr-2" />Run Comparison</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full" /></CardContent></Card>}

            {analysisResult && (
                 <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>PCA Results</CardTitle>
                            <CardDescription>
                                Total Explained Variance by 2 components: {(analysisResult.results.pca_explained_variance.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Image src={`data:image/png;base64,${analysisResult.plots.pca}`} alt="PCA Plot" width={800} height={600} className="rounded-md border" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>LDA Results</CardTitle>
                            <CardDescription>LDA maximizes the separation between classes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Image src={`data:image/png;base64,${analysisResult.plots.lda}`} alt="LDA Plot" width={800} height={600} className="rounded-md border" />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}


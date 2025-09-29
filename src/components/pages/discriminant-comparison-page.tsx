
'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import DataUploader from '../data-uploader';
import type { DataSet } from '@/lib/stats';
import type { ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';

interface AnalysisResponse {
    plot: string;
}

export default function DiscriminantComparisonPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample, onFileSelected }: { data?: DataSet, allHeaders?: string[], numericHeaders?: string[], categoricalHeaders?: string[], onLoadExample?: (example: ExampleDataSet) => void, onFileSelected?: (file: File) => void }) {
    const { toast } = useToast();
    const [datasetType, setDatasetType] = useState<'synthetic' | 'custom'>(data && data.length > 0 ? 'custom' : 'synthetic');
    const [syntheticDataset, setSyntheticDataset] = useState('isotropic');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // For custom data
    const [targetVar, setTargetVar] = useState<string | undefined>(categoricalHeaders?.[0]);
    const [features, setFeatures] = useState<string[]>(numericHeaders?.slice(0, 2) || []);

     useEffect(() => {
        setDatasetType(data && data.length > 0 ? 'custom' : 'synthetic');
        setTargetVar(categoricalHeaders?.find(h => new Set(data?.map(r => r[h])).size === 2) || categoricalHeaders?.[0]);
        setFeatures(numericHeaders?.slice(0, 2) || []);
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
            if (!data || !targetVar || features.length !== 2) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select a binary target and exactly two feature variables for custom data plotting.' });
                setIsLoading(false);
                return;
            }
            body = { data, target_col: targetVar, feature_cols: features };
        } else {
            body = { dataset: syntheticDataset };
        }

        try {
            const response = await fetch('/api/analysis/discriminant-comparison', {
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
            toast({ title: 'Success', description: 'Discriminant analysis comparison is complete.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [datasetType, syntheticDataset, toast, data, targetVar, features]);
    
    const binaryCategoricalHeaders = useMemo(() => {
        if (!data || !categoricalHeaders) return [];
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h])).size === 2);
    }, [data, categoricalHeaders]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">LDA vs QDA Comparison</CardTitle>
                    <CardDescription>Compare Linear and Quadratic Discriminant Analysis on different datasets to understand their behavior.</CardDescription>
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
                                    <SelectItem value="isotropic">Isotropic Covariance</SelectItem>
                                    <SelectItem value="shared">Shared Covariance</SelectItem>
                                    <SelectItem value="different">Different Covariances</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {datasetType === 'custom' && (
                        <div className="space-y-4">
                             {(!data || data.length === 0) ? (
                                onFileSelected && <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                            ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Target Variable (Binary)</Label>
                                    <Select value={targetVar} onValueChange={setTargetVar}>
                                        <SelectTrigger><SelectValue placeholder="Select Target"/></SelectTrigger>
                                        <SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="lg:col-span-1">
                                    <Label>Feature Variables (Select 2)</Label>
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
                <Card>
                    <CardHeader>
                        <CardTitle>LDA vs QDA Decision Boundaries</CardTitle>
                        <CardDescription>
                            This chart shows the decision boundaries learned by each classifier on the selected dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center overflow-x-auto">
                        <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="Discriminant Analysis Comparison Plot" width={800} height={1200} className="rounded-md border" />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

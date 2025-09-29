
'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Users, Component, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Label } from '../ui/label';
import DataUploader from '../data-uploader';
import type { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const comparisonExample = exampleDatasets.find(d => d.id === 'iris');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Component size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">PCA vs. LDA Comparison</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Visually compare two key dimensionality reduction techniques: Principal Component Analysis (unsupervised) and Linear Discriminant Analysis (supervised).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Compare PCA and LDA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Both PCA and LDA reduce the number of variables in your dataset, but they do so with different goals. PCA finds the directions (principal components) that maximize the variance in the data, without considering any class labels. In contrast, LDA finds the directions (linear discriminants) that best separate the different classes. This comparison helps you understand which method is more effective for visualizing and separating your specific groups.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {comparisonExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(comparisonExample)}>
                                <comparisonExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{comparisonExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{comparisonExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Default Data:</strong> The tool defaults to the classic Iris dataset, which is excellent for this comparison.
                                </li>
                                 <li>
                                    <strong>Custom Data:</strong> Upload your own data. You'll need to select a categorical 'Target Variable' (the groups you want to separate) and at least two numeric 'Feature Variables'.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will generate two plots showing how your data looks when reduced to two dimensions by each method.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>PCA Plot:</strong> This plot shows the data projected onto the two components that capture the most variance. It may or may not show good separation between your groups.
                                </li>
                                <li>
                                    <strong>LDA Plot:</strong> This plot shows the data projected onto the two components that are specifically calculated to maximize the separation between the groups. If the clusters are more distinct in this plot, it means LDA is more effective for classifying your data.
                                </li>
                                 <li>
                                    <strong>Explained Variance (PCA):</strong> This value tells you how much information from the original features is retained in the PCA plot. Higher is better.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function PcaLdaComparisonPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample, onFileSelected }: { data?: DataSet, allHeaders?: string[], numericHeaders?: string[], categoricalHeaders?: string[], onLoadExample?: (example: ExampleDataSet) => void, onFileSelected?: (file: File) => void }) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [datasetType, setDatasetType] = useState<'default' | 'custom'>(data && data.length > 0 ? 'custom' : 'default');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // For custom data
    const [targetVar, setTargetVar] = useState<string | undefined>(categoricalHeaders?.[0]);
    const [features, setFeatures] = useState<string[]>(numericHeaders || []);

     useEffect(() => {
        const canRunCustom = data && data.length > 0 && numericHeaders && numericHeaders.length > 0 && categoricalHeaders && categoricalHeaders.length > 0;
        setDatasetType(canRunCustom ? 'custom' : 'default');
        setTargetVar(categoricalHeaders?.[0]);
        setFeatures(numericHeaders || []);
        setView(canRunCustom ? 'main' : 'intro');
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
            // Default uses Iris dataset in the backend
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
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample!} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">PCA vs. LDA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Compare dimensionality reduction techniques on different datasets.</CardDescription>
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
                                    <Label>Target Variable (Categorical)</Label>
                                    <Select value={targetVar} onValueChange={setTargetVar}>
                                        <SelectTrigger><SelectValue placeholder="Select Target"/></SelectTrigger>
                                        <SelectContent>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="lg:col-span-1">
                                    <Label>Feature Variables (select 2+)</Label>
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
                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>PCA Results</CardTitle>
                            <CardDescription>
                                Explained variance: {(analysisResult.results.pca_explained_variance.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
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

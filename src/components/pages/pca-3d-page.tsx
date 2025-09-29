
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Play } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[500px]" />,
});

interface AnalysisResponse {
    plot: string;
}

interface Pca3dPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function Pca3dPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: Pca3dPageProps) {
    const { toast } = useToast();
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    useEffect(() => {
        const defaultTarget = categoricalHeaders[0];
        setTargetCol(defaultTarget);
        setFeatureCols(numericHeaders);
        setAnalysisResult(null);
    }, [data, numericHeaders, categoricalHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatureCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!targetCol || featureCols.length < 3) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target variable and at least three feature variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/pca-3d', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, targetCol, featureCols, toast]);
    
    if (!canRun) {
        const irisExample = exampleDatasets.find(ex => ex.id === 'iris');
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">3D PCA Plot</CardTitle>
                        <CardDescription>
                           This analysis requires at least 3 numeric features and 1 categorical target variable. Please upload suitable data or use our example dataset.
                        </CardDescription>
                    </CardHeader>
                    {irisExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(irisExample)}>Load Iris Dataset</Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const plotData = analysisResult ? JSON.parse(analysisResult.plot) : null;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">3D PCA Plot Setup</CardTitle>
                    <CardDescription>Select variables to visualize in three principal components.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (for coloring)</Label>
                            <Select value={targetCol} onValueChange={setTargetCol}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Feature Variables (select at least 3)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                {numericHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={featureCols.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !targetCol || featureCols.length < 3}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Plotting...</> : <><Play className="mr-2"/>Generate Plot</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full"/></CardContent></Card>}

            {plotData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Interactive 3D PCA Plot</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Plot
                            data={plotData.data}
                            layout={plotData.layout}
                            useResizeHandler={true}
                            className="w-full h-[600px]"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

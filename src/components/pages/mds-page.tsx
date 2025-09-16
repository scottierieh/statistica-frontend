
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Map } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Switch } from '../ui/switch';

interface MdsResults {
    coordinates: number[][];
    stress: number;
    n_components: number;
    metric: boolean;
    distance_metric: string;
    n_observations: number;
}

interface FullAnalysisResponse {
    results: MdsResults;
    plot: string;
}

interface MdsPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MdsPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: MdsPageProps) {
    const { toast } = useToast();
    const [selectedVars, setSelectedVars] = useState<string[]>(numericHeaders);
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [isMetric, setIsMetric] = useState(true);
    const [distanceMetric, setDistanceMetric] = useState('euclidean');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        setSelectedVars(numericHeaders);
        setGroupVar(undefined);
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    const handleVarChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/mds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    variables: selectedVars,
                    metric: isMetric,
                    distanceMetric,
                    groupVar: groupVar,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "MDS plot generated successfully." });

        } catch (e: any) {
            console.error('MDS error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, isMetric, distanceMetric, groupVar, toast]);

    if (!canRun) {
        const mdsExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('mds'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Multidimensional Scaling (MDS)</CardTitle>
                        <CardDescription>
                           To perform MDS, you need data with at least two numeric variables. Try an example dataset to get started.
                        </CardDescription>
                    </CardHeader>
                    {mdsExamples.length > 0 && (
                        <CardContent>
                             <Button onClick={() => onLoadExample(mdsExamples[0])} className="w-full" size="sm">
                                Load {mdsExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">MDS Setup</CardTitle>
                    <CardDescription>Configure the parameters for the analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label>Variables for Distance Calculation</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`mds-${header}`}
                                  checked={selectedVars.includes(header)}
                                  onCheckedChange={(checked) => handleVarChange(header, checked as boolean)}
                                />
                                <label htmlFor={`mds-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                     <div className="grid md:grid-cols-3 gap-4 items-center">
                        <div>
                            <Label>Distance Metric</Label>
                            <Select value={distanceMetric} onValueChange={setDistanceMetric}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="euclidean">Euclidean</SelectItem>
                                    <SelectItem value="cityblock">Manhattan (City Block)</SelectItem>
                                    <SelectItem value="cosine">Cosine</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                           <Label>Group by (Color)</Label>
                           <Select value={groupVar} onValueChange={(v) => setGroupVar(v === 'none' ? undefined : v)}>
                             <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="none">None</SelectItem>
                               {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                             </SelectContent>
                           </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                           <Switch id="metric-switch" checked={isMetric} onCheckedChange={setIsMetric}/>
                           <Label htmlFor="metric-switch">Use Metric MDS</Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">MDS Results</CardTitle>
                        <CardDescription>
                            A 2D spatial map of your data. Stress: <span className="font-bold font-mono">{results.stress.toFixed(4)}</span> (lower is better).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <Image src={analysisResult.plot} alt="MDS Plot" width={800} height={800} className="w-full mx-auto rounded-md border"/>
                        <Image src={(analysisResult as any).shepard_plot} alt="Shepard Diagram" width={800} height={800} className="w-full mx-auto rounded-md border"/>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

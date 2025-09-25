
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Map, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
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
    shepard_plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const mdsExample = exampleDatasets.find(d => d.id === 'customer-segments');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Map size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Multidimensional Scaling (MDS)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        A visualization technique to map the similarity or dissimilarity between items into a low-dimensional space.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use MDS?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            MDS creates a "perceptual map" that visualizes the relative positions of different items (like brands, products, or survey respondents). Items that are perceived as being more similar to each other are placed closer together on the map. This is incredibly useful for understanding market positioning, identifying competitive landscapes, and exploring the underlying dimensions of customer perception.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {mdsExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(mdsExample)}>
                                <mdsExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{mdsExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{mdsExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variables:</strong> Choose two or more numeric variables that describe your items. The analysis will calculate the distances between items based on these variables.</li>
                                <li><strong>Distance Metric:</strong> 'Euclidean' is the most common and represents the straight-line distance between points.</li>
                                <li><strong>Group By (Optional):</strong> Select a categorical variable to color-code the points on the map, helping to identify group-based patterns.</li>
                                <li><strong>Metric vs. Non-Metric:</strong> Use Metric MDS if your input data represents actual distances. Use Non-Metric if it represents ranks or similarities (more flexible).</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>MDS Plot:</strong> This is the main output. The closer two points are on the map, the more similar they are based on the original data. The axes represent abstract dimensions and are used for positioning.
                                </li>
                                <li>
                                    <strong>Stress Value:</strong> A measure of "badness-of-fit." Lower values are better. A stress value under 0.1 is considered good, while values over 0.2 may indicate a poor representation.
                                </li>
                                <li>
                                    <strong>Shepard Diagram:</strong> A scatterplot comparing the original distances to the distances on the generated map. A good fit is indicated by points falling close to a straight line.
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

interface MdsPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MdsPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: MdsPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
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
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

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

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">MDS Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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

            {results && analysisResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">MDS Results</CardTitle>
                        <CardDescription>
                            A 2D spatial map of your data. Stress: <span className="font-bold font-mono">{results.stress.toFixed(4)}</span> (lower is better).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <Image src={analysisResult.plot} alt="MDS Plot" width={800} height={800} className="w-full mx-auto rounded-md border"/>
                        <Image src={analysisResult.shepard_plot} alt="Shepard Diagram" width={800} height={800} className="w-full mx-auto rounded-md border"/>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}



'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Map, HelpCircle, MoveRight, Settings, FileSearch } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';

interface SarResults {
    coefficients: { [key: string]: number };
    sigma2: number;
    log_likelihood: number;
    aic: number;
    bic: number;
    n_obs: number;
}

interface FullAnalysisResponse {
    results: SarResults;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold">Spatial Autoregressive (SAR) Model</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">
                        Account for spatial dependence where the value of a variable in one location is influenced by its neighbors.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-muted-foreground">
                        SAR models, also known as spatial lag models, extend linear regression by including a spatially lagged dependent variable. This helps to avoid biased estimates when observations are not independent across space.
                    </p>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><Settings className="mr-2 h-5 w-5 text-primary" /> Setup Guide</h3>
                             <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                <li><strong>Dependent Variable (Y):</strong> The outcome variable.</li>
                                <li><strong>Independent Variables (X):</strong> Your predictors.</li>
                                <li><strong>Latitude & Longitude:</strong> Columns containing the coordinates for each observation. These are used to automatically generate the spatial weights matrix (W).</li>
                            </ol>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><FileSearch className="mr-2 h-5 w-5 text-primary" /> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>rho (ρ):</strong> The spatial autoregressive coefficient. A significant positive rho indicates that high values in one location are associated with high values in neighboring locations (positive spatial autocorrelation).</li>
                                <li><strong>beta (β):</strong> Interpreted similarly to OLS coefficients, but after accounting for spatial effects.</li>
                                <li><strong>AIC/BIC:</strong> Model fit criteria, useful for comparing different spatial models.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export default function SpatialAutoregressiveModelPage({ data, numericHeaders, onLoadExample }: { data: DataSet; numericHeaders: string[]; onLoadExample: (e: any) => void }) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [yCol, setYCol] = useState<string | undefined>();
    const [xCols, setXCols] = useState<string[]>([]);
    const [latCol, setLatCol] = useState<string | undefined>();
    const [lonCol, setLonCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 4, [data, numericHeaders]);

    const availableFeatures = useMemo(() => {
        const excluded = new Set([yCol, latCol, lonCol]);
        return numericHeaders.filter(h => !excluded.has(h));
    }, [numericHeaders, yCol, latCol, lonCol]);

    useEffect(() => {
        if (canRun) {
            setYCol(numericHeaders.find(h => h.toLowerCase().includes('y')));
            setLatCol(numericHeaders.find(h => h.toLowerCase().includes('lat')));
            setLonCol(numericHeaders.find(h => h.toLowerCase().includes('lon')));
            setXCols(numericHeaders.filter(h => !['y','lat','lon'].some(k => h.toLowerCase().includes(k))));
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
    }, [canRun, numericHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setXCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!yCol || xCols.length === 0 || !latCol || !lonCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required variables.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/spatial-autoregressive-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, y_col: yCol, x_cols: xCols, lat_col: latCol, lon_col: lonCol })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, yCol, xCols, latCol, lonCol, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">SAR Model Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <Label>Dependent (Y)</Label>
                        <Select value={yCol} onValueChange={v => setYCol(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Latitude</Label>
                         <Select value={latCol} onValueChange={v => setLatCol(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Longitude</Label>
                         <Select value={lonCol} onValueChange={v => setLonCol(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Independent (X)</Label>
                        <ScrollArea className="h-24 border rounded-md p-2">
                            {availableFeatures.map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                    <Checkbox id={`x-${h}`} checked={xCols.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                    <Label htmlFor={`x-${h}`}>{h}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-64 w-full" />}
            {results && (
                <Card>
                    <CardHeader><CardTitle>SAR Model Results</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead className="text-right">Estimate</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {Object.entries(results.coefficients).map(([param, value]) => (
                                    <TableRow key={param}>
                                        <TableCell>{param}</TableCell>
                                        <TableCell className="text-right font-mono">{value.toFixed(6)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}



'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sigma, Loader2, Map, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface SemResults {
    coefficients: { [key: string]: number };
    sigma2: number;
    log_likelihood: number;
    aic: number;
    bic: number;
    n_obs: number;
    converged: boolean;
    diagnostics: {
        morans_i_ols_residuals: number;
        spatial_weights_method: string;
        k_neighbors?: number;
        distance_threshold?: number;
    };
}

interface FullAnalysisResponse {
    results: SemResults;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const sarExample = exampleDatasets.find(d => d.id === 'spatial-autoregressive-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Map size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Spatial Error Model (SEM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Model spatial autocorrelation in the regression residuals, addressing spatially correlated omitted variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use an SEM?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            The Spatial Error Model is used when you suspect that unmeasured variables that are spatially correlated are influencing your outcome. It assumes that the error terms of neighboring locations are correlated. By modeling this structure, SEM provides more efficient and unbiased estimates than standard OLS regression.
                        </p>
                    </div>
                    
                    {sarExample && (
                        <div className="flex justify-center">
                            <Card 
                                className="p-6 bg-muted/50 rounded-lg space-y-3 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-lg hover:bg-muted/70 transition-all w-full max-w-md" 
                                onClick={() => onLoadExample(sarExample)}
                            >
                                <sarExample.icon className="mx-auto h-10 w-10 text-primary"/>
                                <div>
                                    <h4 className="font-semibold text-lg">{sarExample.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{sarExample.description}</p>
                                </div>
                                <Button variant="outline" size="sm" className="mt-2">
                                    Load Example Dataset
                                </Button>
                            </Card>
                        </div>
                    )}
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2">
                                <Settings className="text-primary"/> Setup Guide
                            </h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Dependent (Y) & Independent (X) Variables:</strong> Select your outcome and predictor variables.</li>
                                <li><strong>Latitude & Longitude:</strong> Provide geographic coordinates to define spatial relationships.</li>
                                <li><strong>Spatial Weights Method:</strong> Choose how to define "neighbors" (e.g., K-Nearest, Distance Threshold).</li>
                                <li><strong>Run Analysis:</strong> The tool fits the SEM and provides key spatial diagnostics.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2">
                                <FileSearch className="text-primary"/> Results Interpretation
                            </h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>lambda (λ):</strong> The spatial error coefficient. A significant, positive lambda indicates that errors in neighboring regions are positively correlated.</li>
                                <li><strong>beta (β):</strong> Regression coefficients adjusted for spatial error autocorrelation.</li>
                                <li><strong>Moran's I on OLS Residuals:</strong> A diagnostic to check if spatial modeling is needed. A significant Moran's I suggests OLS is inappropriate.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>
                        Start New Analysis <MoveRight className="ml-2 w-5 h-5"/>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function SpatialErrorModelPage({ 
    data, 
    numericHeaders, 
    onLoadExample 
}: { 
    data: DataSet; 
    numericHeaders: string[]; 
    onLoadExample: (e: any) => void 
}) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    
    // Model configuration
    const [yCol, setYCol] = useState<string | undefined>();
    const [xCols, setXCols] = useState<string[]>([]);
    const [latCol, setLatCol] = useState<string | undefined>();
    const [lonCol, setLonCol] = useState<string | undefined>();
    
    // Spatial weights configuration
    const [wMethod, setWMethod] = useState<'knn' | 'distance' | 'threshold'>('knn');
    const [kNeighbors, setKNeighbors] = useState(5);
    const [distanceThreshold, setDistanceThreshold] = useState(50);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length >= 10 && numericHeaders.length >= 4, [data, numericHeaders]);

    const availableFeatures = useMemo(() => {
        const excluded = new Set([yCol, latCol, lonCol]);
        return numericHeaders.filter(h => !excluded.has(h));
    }, [numericHeaders, yCol, latCol, lonCol]);

    // Auto-detect columns on data change
    useEffect(() => {
        if (canRun) {
            setYCol(
                numericHeaders.find(h => h.toLowerCase().includes('crime') || h.toLowerCase().includes('rate')) ||
                numericHeaders[0]
            );
            setLatCol(
                numericHeaders.find(h => h.toLowerCase().includes('lat')) ||
                numericHeaders.find(h => h.toLowerCase().includes('y') && !h.toLowerCase().includes('year'))
            );
            setLonCol(
                numericHeaders.find(h => h.toLowerCase().includes('lon') || h.toLowerCase().includes('lng')) ||
                numericHeaders.find(h => h.toLowerCase().includes('x') && !h.toLowerCase().includes('max'))
            );
            
            const autoXCols = numericHeaders.filter(h => 
                !['crime', 'rate', 'lat', 'lon', 'lng', 'latitude', 'longitude'].some(k => 
                    h.toLowerCase().includes(k)
                )
            );
            setXCols(autoXCols.slice(0, 3));
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
        if (data.length < 10) {
            toast({ variant: 'destructive', title: 'Insufficient Data', description: 'SAR models require at least 10 observations.' });
            return;
        }
        
        // Validate coordinate ranges
        const latValues = data.map(row => row[latCol]);
        const lonValues = data.map(row => row[lonCol]);
        
        if (latValues.some(v => typeof v !== 'number' || v < -90 || v > 90)) {
            toast({ variant: 'destructive', title: 'Invalid Latitude', description: 'Latitude must be between -90 and 90.' });
            return;
        }
        if (lonValues.some(v => typeof v !== 'number' || v < -180 || v > 180)) {
            toast({ variant: 'destructive', title: 'Invalid Longitude', description: 'Longitude must be between -180 and 180.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/spatial-error-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    y_col: yCol, 
                    x_cols: xCols, 
                    lat_col: latCol, 
                    lon_col: lonCol,
                    w_method: wMethod,
                    k_neighbors: kNeighbors,
                    distance_threshold: distanceThreshold
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'SEM model has been fitted successfully.' });
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, yCol, xCols, latCol, lonCol, wMethod, kNeighbors, distanceThreshold, toast]);

    const handleLoadExampleData = () => {
        const sarExample = exampleDatasets.find(ex => ex.id === 'spatial-autoregressive-data');
        if (sarExample) {
            onLoadExample(sarExample);
            setView('main');
        }
    };

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            {/* Configuration Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">SEM Configuration</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Variable Selection */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><Label>Dependent (Y)</Label><Select value={yCol} onValueChange={v => setYCol(v)}><SelectTrigger><SelectValue placeholder="Select Y"/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Latitude</Label><Select value={latCol} onValueChange={v => setLatCol(v)}><SelectTrigger><SelectValue placeholder="Select Latitude"/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Longitude</Label><Select value={lonCol} onValueChange={v => setLonCol(v)}><SelectTrigger><SelectValue placeholder="Select Longitude"/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div>
                            <Label>Independent (X)</Label>
                            <ScrollArea className="h-24 border rounded-md p-2 bg-background"><div className="space-y-1">{availableFeatures.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`x-${h}`} checked={xCols.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} /><Label htmlFor={`x-${h}`} className="text-sm cursor-pointer">{h}</Label></div>))}</div></ScrollArea>
                        </div>
                    </div>
                    
                    {/* Spatial Weights Configuration */}
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary"/>Spatial Weights Matrix</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div><Label>Method</Label><Select value={wMethod} onValueChange={(v) => setWMethod(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="knn">K-Nearest Neighbors</SelectItem><SelectItem value="distance">Inverse Distance</SelectItem><SelectItem value="threshold">Distance Threshold</SelectItem></SelectContent></Select></div>
                            {wMethod === 'knn' && <div><Label>Neighbors (k)</Label><Input type="number" value={kNeighbors} onChange={(e) => setKNeighbors(Math.max(1, Math.min(20, +e.target.value)))} min={1} max={20}/></div>}
                            {wMethod === 'threshold' && <div><Label>Threshold (km)</Label><Input type="number" value={distanceThreshold} onChange={(e) => setDistanceThreshold(Math.max(1, +e.target.value))} min={1}/></div>}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading} size="lg">
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run SEM</>}
                    </Button>
                </CardFooter>
            </Card>

            {/* Loading State */}
            {isLoading && <Skeleton className="h-96 w-full" />}
            
            {results && (
                <>
                    {!results.converged && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Convergence Warning</AlertTitle><AlertDescription>The model did not converge. Results may be unreliable.</AlertDescription></Alert>}
                    
                    <Card><CardHeader><CardTitle>Spatial Diagnostics</CardTitle></CardHeader><CardContent><div className="flex justify-between items-center"><span className="text-sm font-medium">Moran's I on OLS Residuals:</span><Badge variant={Math.abs(results.diagnostics.morans_i_ols_residuals) > 0.1 ? 'default' : 'secondary'}>{results.diagnostics.morans_i_ols_residuals.toFixed(4)}</Badge></div></CardContent></Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Model Coefficients</CardTitle><CardDescription>Spatial error (λ) and regression coefficients (β)</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Parameter</TableHead>
                                        <TableHead className="text-right">Estimate</TableHead>
                                        <TableHead className="text-right">Interpretation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.coefficients).map(([param, value]) => (
                                        <TableRow key={param}>
                                            <TableCell className="font-medium">
                                                {param === 'lambda' ? 'λ (lambda)' : param}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {value.toFixed(6)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {param === 'lambda' 
                                                    ? value > 0 
                                                        ? 'Positive spatial error correlation' 
                                                        : 'Negative spatial error correlation'
                                                    : value > 0 
                                                        ? 'Positive effect' 
                                                        : 'Negative effect'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    <Card><CardHeader><CardTitle>Model Fit Statistics</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-4 gap-4 text-center"><div><p className="text-sm text-muted-foreground">AIC</p><p className="text-2xl font-bold">{results.aic.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">BIC</p><p className="text-2xl font-bold">{results.bic.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Log-Likelihood</p><p className="text-2xl font-bold">{results.log_likelihood.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">σ²</p><p className="text-2xl font-bold">{results.sigma2.toFixed(4)}</p></div></div></CardContent></Card>
                </>
            )}
        </div>
    );
}

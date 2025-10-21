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

interface SarResults {
    coefficients: { [key: string]: number };
    sigma2: number;
    log_likelihood: number;
    aic: number;
    bic: number;
    n_obs: number;
    converged: boolean;
    diagnostics: {
        morans_i: number;
        spatial_weights_method: string;
        k_neighbors?: number;
        distance_threshold?: number;
    };
}

interface FullAnalysisResponse {
    results: SarResults;
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
                    <CardTitle className="font-headline text-4xl font-bold">Spatial Autoregressive (SAR) Model</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Account for spatial dependence where the value of a variable in one location is influenced by its neighbors.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use SAR Models?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Standard regression models assume observations are independent, but spatial data often violates this assumption. 
                            The SAR model, or <strong>spatial lag model</strong>, explicitly includes a spatially lagged dependent variable 
                            to account for this interdependence, preventing biased and inefficient estimates.
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
                                <li><strong>Dependent Variable (Y):</strong> The outcome variable you are modeling (e.g., crime rate, housing price).</li>
                                <li><strong>Independent Variables (X):</strong> Your predictor variables (e.g., income, unemployment rate).</li>
                                <li><strong>Latitude & Longitude:</strong> Geographic coordinates to construct the spatial weights matrix (W).</li>
                                <li><strong>Spatial Weights Method:</strong> Choose how to define neighbors (K-nearest, distance-based, or threshold).</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2">
                                <FileSearch className="text-primary"/> Results Interpretation
                            </h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>rho (ρ):</strong> Spatial autoregressive coefficient. Positive ρ indicates positive spatial autocorrelation (similar values cluster together).</li>
                                <li><strong>beta (β):</strong> Regression coefficients for independent variables, adjusted for spatial effects.</li>
                                <li><strong>Moran's I:</strong> Diagnostic measure of spatial autocorrelation in the dependent variable (range: -1 to 1).</li>
                                <li><strong>AIC/BIC:</strong> Model fit criteria for comparing different spatial models (lower is better).</li>
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

export default function SpatialAutoregressiveModelPage({ 
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
    
    // Analysis state
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
            setXCols(autoXCols.slice(0, 3)); // Auto-select first 3 features
            
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
    }, [canRun, numericHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setXCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const validateInputs = useCallback(() => {
        if (!yCol) {
            toast({ variant: 'destructive', title: 'Missing Dependent Variable', description: 'Please select a Y variable.' });
            return false;
        }
        if (xCols.length === 0) {
            toast({ variant: 'destructive', title: 'Missing Independent Variables', description: 'Please select at least one X variable.' });
            return false;
        }
        if (!latCol || !lonCol) {
            toast({ variant: 'destructive', title: 'Missing Coordinates', description: 'Please select both latitude and longitude columns.' });
            return false;
        }
        if (data.length < 10) {
            toast({ variant: 'destructive', title: 'Insufficient Data', description: 'SAR models require at least 10 observations.' });
            return false;
        }
        
        // Validate coordinate ranges
        const latValues = data.map(row => row[latCol]);
        const lonValues = data.map(row => row[lonCol]);
        
        if (latValues.some(v => typeof v !== 'number' || v < -90 || v > 90)) {
            toast({ variant: 'destructive', title: 'Invalid Latitude', description: 'Latitude must be between -90 and 90.' });
            return false;
        }
        if (lonValues.some(v => typeof v !== 'number' || v < -180 || v > 180)) {
            toast({ variant: 'destructive', title: 'Invalid Longitude', description: 'Longitude must be between -180 and 180.' });
            return false;
        }
        
        return true;
    }, [data, yCol, xCols, latCol, lonCol, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!validateInputs()) return;
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/spatial-autoregressive-model', {
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
            toast({ title: 'Analysis Complete', description: 'SAR model has been fitted successfully.' });
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, yCol, xCols, latCol, lonCol, wMethod, kNeighbors, distanceThreshold, validateInputs, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            {/* Configuration Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">SAR Model Configuration</CardTitle>
                            <CardDescription className="mt-1">
                                Configure variables and spatial weights matrix
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Variable Selection */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label>Dependent Variable (Y)</Label>
                            <Select value={yCol} onValueChange={v => setYCol(v)}>
                                <SelectTrigger><SelectValue placeholder="Select Y"/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Latitude</Label>
                            <Select value={latCol} onValueChange={v => setLatCol(v)}>
                                <SelectTrigger><SelectValue placeholder="Select Latitude"/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Longitude</Label>
                            <Select value={lonCol} onValueChange={v => setLonCol(v)}>
                                <SelectTrigger><SelectValue placeholder="Select Longitude"/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Independent Variables (X)</Label>
                            <ScrollArea className="h-24 border rounded-md p-2 bg-background">
                                {availableFeatures.length > 0 ? (
                                    availableFeatures.map(h => (
                                        <div key={h} className="flex items-center space-x-2 py-1">
                                            <Checkbox 
                                                id={`x-${h}`} 
                                                checked={xCols.includes(h)} 
                                                onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} 
                                            />
                                            <Label htmlFor={`x-${h}`} className="text-sm cursor-pointer">{h}</Label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground">No features available</p>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                    
                    {/* Spatial Weights Configuration */}
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary"/>
                            Spatial Weights Matrix Configuration
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <Label>Method</Label>
                                <Select value={wMethod} onValueChange={(v) => setWMethod(v as any)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="knn">K-Nearest Neighbors</SelectItem>
                                        <SelectItem value="distance">Inverse Distance</SelectItem>
                                        <SelectItem value="threshold">Distance Threshold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {wMethod === 'knn' && (
                                <div>
                                    <Label>Number of Neighbors (k)</Label>
                                    <Input 
                                        type="number" 
                                        value={kNeighbors} 
                                        onChange={(e) => setKNeighbors(Math.max(1, Math.min(20, +e.target.value)))} 
                                        min={1} 
                                        max={20}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Typical: 4-8 neighbors</p>
                                </div>
                            )}
                            
                            {wMethod === 'threshold' && (
                                <div>
                                    <Label>Distance Threshold (km)</Label>
                                    <Input 
                                        type="number" 
                                        value={distanceThreshold} 
                                        onChange={(e) => setDistanceThreshold(Math.max(1, +e.target.value))} 
                                        min={1}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Points within this distance are neighbors</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading} size="lg">
                        {isLoading ? (
                            <><Loader2 className="mr-2 animate-spin"/> Running Analysis...</>
                        ) : (
                            <><Sigma className="mr-2"/>Run SAR Model</>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {/* Loading State */}
            {isLoading && <Skeleton className="h-96 w-full" />}
            
            {/* Results */}
            {results && (
                <>
                    {/* Convergence Alert */}
                    {!results.converged && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Convergence Warning</AlertTitle>
                            <AlertDescription>
                                The optimization algorithm did not converge. Results may be unreliable. 
                                Try adjusting the spatial weights method or check your data for issues.
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {results.converged && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Model Converged Successfully</AlertTitle>
                            <AlertDescription>
                                The SAR model has been fitted successfully with {results.n_obs} observations.
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {/* Diagnostics Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Spatial Diagnostics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Moran's I:</span>
                                        <Badge variant={Math.abs(results.diagnostics.morans_i) > 0.3 ? 'default' : 'secondary'}>
                                            {results.diagnostics.morans_i.toFixed(4)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {results.diagnostics.morans_i > 0.3 
                                            ? 'Strong positive spatial autocorrelation detected'
                                            : results.diagnostics.morans_i < -0.3
                                            ? 'Strong negative spatial autocorrelation detected'
                                            : 'Weak or no spatial autocorrelation'}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Spatial Weights:</span>
                                        <Badge variant="outline">
                                            {results.diagnostics.spatial_weights_method.toUpperCase()}
                                            {results.diagnostics.k_neighbors && ` (k=${results.diagnostics.k_neighbors})`}
                                            {results.diagnostics.distance_threshold && ` (${results.diagnostics.distance_threshold}km)`}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Coefficients Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Coefficients</CardTitle>
                            <CardDescription>
                                Spatial autoregressive parameter (ρ) and regression coefficients (β)
                            </CardDescription>
                        </CardHeader>
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
                                                {param === 'rho' ? 'ρ (rho)' : param}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {value.toFixed(6)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {param === 'rho' 
                                                    ? value > 0 
                                                        ? 'Positive spatial dependence' 
                                                        : 'Negative spatial dependence'
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
                    
                    {/* Model Fit Statistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Fit Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Log-Likelihood</p>
                                    <p className="text-2xl font-bold">{results.log_likelihood.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">AIC</p>
                                    <p className="text-2xl font-bold">{results.aic.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">BIC</p>
                                    <p className="text-2xl font-bold">{results.bic.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">σ² (Residual Variance)</p>
                                    <p className="text-2xl font-bold">{results.sigma2.toFixed(4)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}



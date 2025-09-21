
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BrainCircuit, UploadCloud, File, CheckCircle, ChevronRight, Loader2, Bot, Sparkles, Building, Heart, ShoppingCart, Layers, Plus, Trash2, Sigma, LineChart as LineChartIcon, TrendingUp, ScatterChart as ScatterChartIcon, Users, Terminal, Settings2, SlidersHorizontal, Sliders, Info, Variable, Check, X } from 'lucide-react';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { useToast } from '@/hooks/use-toast';
import { DataSet, parseData, unparseData } from '@/lib/stats';
import * as XLSX from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from './ui/chart';
import { LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine } from "recharts"
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';


type AnalysisStep = 'select-type' | 'configure';
type AnalysisType = 'classification' | 'regression' | 'clustering' | 'nlp' | 'computer-vision';
type DomainType = 'marketing' | 'finance' | 'healthcare' | 'general';
type PreprocessingOptions = { handleMissing: 'mean' | 'median' | 'drop'; scale: boolean; };

interface DnnPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onFileSelected: (file: File) => void;
    isUploading: boolean;
}

function RegressionResultDisplay({ results }: { results: any }) {
    if (!results) return null;
    const residualChartData = results.predictions.map((p: number, i: number) => ({ prediction: p, residual: results.residuals[i]}));

    return (
         <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Training Results</CardTitle>
                    <CardDescription>Performance metrics for the trained regression model.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">R-squared</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{results.metrics.r2.toFixed(3)}</p></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">RMSE</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{results.metrics.rmse.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">MAE</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{results.metrics.mae.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></CardContent></Card>
                    </div>

                     <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Actual vs. Predicted</CardTitle></CardHeader>
                            <CardContent>
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <ScatterChart>
                                            <CartesianGrid strokeDasharray="3 3"/>
                                            <XAxis type="number" dataKey="actual" name="Actual" label={{ value: 'Actual Values', position: 'insideBottom', offset: -5 }}/>
                                            <YAxis type="number" dataKey="predicted" name="Predicted" label={{ value: 'Predicted Values', angle: -90, position: 'insideLeft' }}/>
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                            <Scatter name="Predictions" data={results.predictions.map((p:number, i:number) => ({actual: results.actuals[i], predicted: p}))} fill="hsl(var(--chart-1))" />
                                            <ReferenceLine ifOverflow="extendDomain" x={0} y={0} stroke="#666" strokeDasharray="5 5" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Residual Analysis</CardTitle></CardHeader>
                            <CardContent>
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                     <ResponsiveContainer>
                                        <ScatterChart>
                                            <CartesianGrid strokeDasharray="3 3"/>
                                            <XAxis type="number" dataKey="prediction" name="Predicted" label={{ value: 'Predicted Values', position: 'insideBottom', offset: -5 }}/>
                                            <YAxis type="number" dataKey="residual" name="Residual" label={{ value: 'Residuals', angle: -90, position: 'insideLeft' }}/>
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                            <Scatter name="Residuals" data={residualChartData} fill="hsl(var(--chart-2))" />
                                             <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function DnnRegressionPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onFileSelected, isUploading, allHeaders }: DnnPageProps) {
    const [target, setTarget] = useState<string | undefined>(numericHeaders[0]);
    const [features, setFeatures] = useState<string[]>(allHeaders.filter(h => h !== numericHeaders[0]));
    const [model, setModel] = useState<'linear' | 'random_forest' | 'gbm'>('linear');
    
    const [preprocessing, setPreprocessing] = useState<PreprocessingOptions>({ handleMissing: 'mean', scale: true });
    
    const [isLoading, setIsLoading] = useState(false);
    const [trainingResults, setTrainingResults] = useState<any>(null);

     const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleTrainModel = () => {
        setIsLoading(true);
        setTrainingResults(null);
        console.log("Training regression model:", { target, features, model, preprocessing });
        setTimeout(() => {
            const actuals = Array.from({ length: 50 }, () => 150000 + Math.random() * 600000);
            const predictions = actuals.map(a => a + (Math.random() - 0.5) * 100000);
            const residuals = actuals.map((a, i) => a - predictions[i]);
            const predictionExamples = Array.from({length: 10}, (_, i) => {
                const actual = actuals[i];
                const predicted = predictions[i];
                const error = actual - predicted;
                const error_percent = (error / actual) * 100;
                return { actual, predicted, error, error_percent };
            });
            
            setTrainingResults({
                metrics: { r2: 0.88, rmse: 50000, mae: 35000 },
                actuals,
                predictions,
                residuals,
                predictionExamples,
            });
            setIsLoading(false);
        }, 3000);
    };

    const gbmRegressionExample = exampleDatasets.find(ex => ex.id === 'gbm-regression');

    if (data.length === 0) {
        return (
             <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Regression Analysis</CardTitle>
                        <CardDescription>
                            Upload a dataset with numeric features and a numeric target, or try our example.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                        {gbmRegressionExample && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                                </div>
                                 <Button variant="secondary" className="w-full" onClick={() => onLoadExample(gbmRegressionExample)}>
                                    <gbmRegressionExample.icon className="mr-2"/>
                                    Load House Price Dataset
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Variable /> 1. Select Variables</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     <div>
                        <Label>Target Variable (Numeric)</Label>
                        <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Feature Variables</Label>
                         <ScrollArea className="h-24 border rounded-md p-2">
                            {allHeaders.filter(h => h !== target).map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                     <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                    <Label htmlFor={`feat-${h}`}>{h}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Settings2 /> 2. Configure Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Model Selection</Label>
                            <Select value={model} onValueChange={(v) => setModel(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="linear">Linear Regression</SelectItem>
                                    <SelectItem value="random_forest">Random Forest</SelectItem>
                                    <SelectItem value="gbm">Gradient Boosting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Preprocessing Options</Label>
                            <div className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="handle-missing">Handle Missing Values</Label>
                                    <Select value={preprocessing.handleMissing} onValueChange={(v) => setPreprocessing(p => ({...p, handleMissing: v as any}))}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mean">Mean</SelectItem>
                                            <SelectItem value="median">Median</SelectItem>
                                            <SelectItem value="drop">Drop Row</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="scale-data">Standardize Data (Scaling)</Label>
                                    <Switch id="scale-data" checked={preprocessing.scale} onCheckedChange={(c) => setPreprocessing(p => ({...p, scale: c}))} />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleTrainModel} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Training...</> : <><Sigma className="mr-2" />Train Model</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardHeader><CardTitle>Training in Progress...</CardTitle></CardHeader><CardContent className="flex justify-center p-8"><Loader2 className="h-12 w-12 text-primary animate-spin" /></CardContent></Card>}
            {trainingResults && (
                <>
                    <RegressionResultDisplay results={trainingResults} />
                    <PredictionExamplesTable examples={trainingResults.predictionExamples} problemType="regression" />
                </>
            )}
        </div>
    );
}

const PredictionExamplesTable = ({ examples, problemType }: { examples: any[], problemType: 'regression' | 'classification' }) => {
    if (!examples || examples.length === 0) return null;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Terminal/> Prediction Examples</CardTitle>
                <CardDescription>A random sample of predictions from the test set.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {problemType === 'regression' ? (
                                <>
                                    <TableHead>Actual</TableHead>
                                    <TableHead>Predicted</TableHead>
                                    <TableHead>Error</TableHead>
                                    <TableHead>Error %</TableHead>
                                </>
                            ) : (
                                <>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actual</TableHead>
                                    <TableHead>Predicted</TableHead>
                                    <TableHead>Confidence</TableHead>
                                </>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {examples.map((ex, i) => (
                            <TableRow key={i}>
                                {problemType === 'regression' ? (
                                    <>
                                        <TableCell>{ex.actual.toFixed(2)}</TableCell>
                                        <TableCell>{ex.predicted.toFixed(2)}</TableCell>
                                        <TableCell>{ex.error.toFixed(2)}</TableCell>
                                        <TableCell>{ex.error_percent.toFixed(2)}%</TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell>{ex.status}</TableCell>
                                        <TableCell>{ex.actual}</TableCell>
                                        <TableCell>{ex.predicted}</TableCell>
                                        <TableCell>{(ex.confidence * 100).toFixed(1)}%</TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function DnnClassificationPage({ data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample, onFileSelected, isUploading }: DnnPageProps) {
    const [target, setTarget] = useState<string | undefined>(categoricalHeaders[0]);
    const [features, setFeatures] = useState<string[]>(allHeaders.filter(h => h !== categoricalHeaders[0]));
    const [model, setModel] = useState<'logistic' | 'random_forest' | 'gbm'>('logistic');
    const [preprocessing, setPreprocessing] = useState<PreprocessingOptions>({ handleMissing: 'mean', scale: true });
    
    const [isLoading, setIsLoading] = useState(false);
    const [trainingResults, setTrainingResults] = useState<any>(null);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };
    
    const handleTrainModel = () => {
        setIsLoading(true);
        setTrainingResults(null);
        console.log("Training classification model:", { target, features, model, preprocessing });
        setTimeout(() => {
            // Mock training results
            setTrainingResults({
                metrics: { accuracy: 0.92, precision: 0.91, recall: 0.93, f1: 0.92, auc: 0.97 },
                confusion_matrix: [[102, 8], [5, 115]], // Example confusion matrix
                feature_importance: Object.fromEntries(features.slice(0, 10).map(f => [f, Math.random()]).sort((a,b) => b[1] - a[1])),
                predictionExamples: Array.from({length: 10}, () => {
                    const actual = Math.random() > 0.5 ? 'Yes' : 'No';
                    const predicted = Math.random() > 0.3 ? actual : (actual === 'Yes' ? 'No' : 'Yes');
                    return { actual, predicted, status: actual === predicted ? <Check className="text-green-500" /> : <X className="text-destructive" />, confidence: 0.7 + Math.random() * 0.3 }
                })
            });
            setIsLoading(false);
        }, 3000);
    };

    const irisExample = exampleDatasets.find(ex => ex.id === 'iris');

    if (data.length === 0) {
        return (
             <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Classification Analysis</CardTitle>
                        <CardDescription>
                            Upload a dataset with numeric features and a categorical target, or try our example.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                        {irisExample && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                                </div>
                                 <Button variant="secondary" className="w-full" onClick={() => onLoadExample(irisExample)}>
                                    <irisExample.icon className="mr-2"/>
                                    Load Iris Flower Dataset
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Variable /> 1. Select Variables</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     <div>
                        <Label>Target Variable (Categorical)</Label>
                        <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Feature Variables</Label>
                        <ScrollArea className="h-24 border rounded-md p-2">
                            {allHeaders.filter(h => h !== target).map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                     <Checkbox id={`feat-clf-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                    <Label htmlFor={`feat-clf-${h}`}>{h}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Settings2 /> 2. Configure Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Model Selection</Label>
                            <Select value={model} onValueChange={(v) => setModel(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="logistic">Logistic Regression</SelectItem>
                                    <SelectItem value="random_forest">Random Forest</SelectItem>
                                    <SelectItem value="gbm">Gradient Boosting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Preprocessing Options</Label>
                            <div className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="handle-missing-clf">Handle Missing Values</Label>
                                    <Select value={preprocessing.handleMissing} onValueChange={(v) => setPreprocessing(p => ({...p, handleMissing: v as any}))}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mean">Mean</SelectItem>
                                            <SelectItem value="median">Median</SelectItem>
                                            <SelectItem value="drop">Drop Row</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="scale-data-clf">Standardize Data (Scaling)</Label>
                                    <Switch id="scale-data-clf" checked={preprocessing.scale} onCheckedChange={(c) => setPreprocessing(p => ({...p, scale: c}))} />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleTrainModel} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Training...</> : <><Sigma className="mr-2" />Train Model</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && (
                 <Card><CardHeader><CardTitle>Training in Progress...</CardTitle></CardHeader><CardContent className="flex justify-center p-8"><Loader2 className="h-12 w-12 text-primary animate-spin" /></CardContent></Card>
            )}

            {trainingResults && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Training Results</CardTitle>
                            <CardDescription>Performance metrics for the trained classification model.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Accuracy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{(trainingResults.metrics.accuracy * 100).toFixed(1)}%</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">F1-Score</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.f1.toFixed(3)}</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">AUC</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.auc.toFixed(3)}</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Precision</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.precision.toFixed(3)}</p></CardContent></Card>
                            </div>
                             <div className="grid md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Feature Importance (XAI)</CardTitle></CardHeader>
                                    <CardContent>
                                        <ChartContainer config={{}} className="h-[250px] w-full">
                                            <ResponsiveContainer>
                                                <BarChart data={Object.entries(trainingResults.feature_importance).map(([name, value]) => ({name, value})).sort((a,b) => a.value - b.value)} layout="vertical" margin={{left: 100}}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" />
                                                    <YAxis dataKey="name" type="category" tick={{fontSize: 10}}/>
                                                    <Tooltip content={<ChartTooltipContent />} />
                                                    <Bar dataKey="value" name="Importance" fill="hsl(var(--chart-1))" radius={4} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader><CardTitle className="text-base">Confusion Matrix</CardTitle></CardHeader>
                                    <CardContent>
                                         <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead></TableHead>
                                                    <TableHead className="text-center">Predicted Class 0</TableHead>
                                                    <TableHead className="text-center">Predicted Class 1</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableHead>Actual Class 0</TableHead>
                                                    <TableCell className="text-center font-mono text-lg">{trainingResults.confusion_matrix[0][0]}</TableCell>
                                                    <TableCell className="text-center font-mono text-lg">{trainingResults.confusion_matrix[0][1]}</TableCell>
                                                </TableRow>
                                                 <TableRow>
                                                    <TableHead>Actual Class 1</TableHead>
                                                    <TableCell className="text-center font-mono text-lg">{trainingResults.confusion_matrix[1][0]}</TableCell>
                                                    <TableCell className="text-center font-mono text-lg">{trainingResults.confusion_matrix[1][1]}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                    <PredictionExamplesTable examples={trainingResults.predictionExamples} problemType="classification" />
                </div>
            )}
        </div>
    );
}

function DnnClusteringPage({ data, numericHeaders, onLoadExample, onFileSelected, isUploading, allHeaders }: DnnPageProps) {
    const [features, setFeatures] = useState<string[]>(numericHeaders);
    const [model, setModel] = useState<'kmeans' | 'dbscan' | 'hierarchical'>('kmeans');
    const [preprocessing, setPreprocessing] = useState({ scale: true, pca: false });
    const [k, setK] = useState(3);
    const [isLoading, setIsLoading] = useState(false);
    const [trainingResults, setTrainingResults] = useState<any>(null);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleTrainModel = () => {
        setIsLoading(true);
        setTrainingResults(null);
        console.log("Training clustering model:", { features, model, k, preprocessing });
        setTimeout(() => {
            const clusterData = Array.from({ length: 150 }, () => ({
                x: Math.random() * 10,
                y: Math.random() * 10,
                cluster: Math.floor(Math.random() * k)
            }));
            
            const clusterProfiles = Array.from({length: k}, (_, i) => {
                const profile: any = { Cluster: `Cluster ${i+1}`, Size: Math.floor(150/k) };
                features.forEach(f => profile[f] = (Math.random() * 100).toFixed(2));
                return profile;
            })

            setTrainingResults({
                metrics: { silhouette: 0.55 + Math.random() * 0.2 },
                plotData: clusterData,
                clusterProfiles: clusterProfiles
            });
            setIsLoading(false);
        }, 3000);
    };

    const customerSegmentsExample = exampleDatasets.find(ex => ex.id === 'customer-segments');

    if (data.length === 0) {
        return (
             <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Clustering Analysis</CardTitle>
                        <CardDescription>Upload a dataset with numeric features to group similar data points, or try our example.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                        {customerSegmentsExample && (
                            <>
                                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div></div>
                                <Button variant="secondary" className="w-full" onClick={() => onLoadExample(customerSegmentsExample)}>
                                    <customerSegmentsExample.icon className="mr-2"/>Load Customer Segments Dataset
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                 <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Variable /> 1. Select Variables</CardTitle></CardHeader>
                 <CardContent>
                     <Label>Feature Variables (Numeric)</Label>
                     <ScrollArea className="h-24 border rounded-md p-2">
                        {numericHeaders.map(h => (
                            <div key={h} className="flex items-center space-x-2">
                                 <Checkbox id={`feat-clu-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                <Label htmlFor={`feat-clu-${h}`}>{h}</Label>
                            </div>
                        ))}
                    </ScrollArea>
                 </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Settings2 /> 2. Configure Analysis</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Model Selection</Label>
                            <Select value={model} onValueChange={(v) => setModel(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kmeans">K-Means</SelectItem>
                                    <SelectItem value="dbscan">DBSCAN</SelectItem>
                                    <SelectItem value="hierarchical">Hierarchical</SelectItem>
                                </SelectContent>
                            </Select>
                            {model === 'kmeans' && (
                                <div className="mt-4 space-y-2">
                                    <Label>Number of Clusters (K)</Label>
                                    <Input type="number" value={k} onChange={(e) => setK(parseInt(e.target.value))} min="2" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Preprocessing Options</Label>
                            <div className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-center justify-between"><Label>Standardize Data (Scaling)</Label><Switch checked={preprocessing.scale} onCheckedChange={(c) => setPreprocessing(p => ({...p, scale: c}))} /></div>
                                <div className="flex items-center justify-between"><Label>Reduce Dimensions (PCA)</Label><Switch checked={preprocessing.pca} onCheckedChange={(c) => setPreprocessing(p => ({...p, pca: c}))} /></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleTrainModel} disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 animate-spin" /> Clustering...</> : <><Sigma className="mr-2" />Run Analysis</>}</Button>
                </CardFooter>
            </Card>
            
            {isLoading && <Card><CardHeader><CardTitle>Running Clustering...</CardTitle></CardHeader><CardContent className="flex justify-center p-8"><Loader2 className="h-12 w-12 text-primary animate-spin" /></CardContent></Card>}
            
            {trainingResults && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Clustering Results</CardTitle>
                             <CardDescription>Model performance and cluster visualization.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                             <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Silhouette Score</p>
                                <p className="text-4xl font-bold">{trainingResults.metrics.silhouette.toFixed(3)}</p>
                                <p className="text-xs text-muted-foreground">(Closer to 1 is better)</p>
                            </div>
                            <ChartContainer config={{}} className="h-[250px] w-full">
                                <ResponsiveContainer>
                                    <ScatterChart>
                                        <CartesianGrid />
                                        <XAxis type="number" dataKey="x" name="Component 1"/>
                                        <YAxis type="number" dataKey="y" name="Component 2"/>
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                        <Scatter name="Clusters" data={trainingResults.plotData} fill="hsl(var(--primary))">
                                            {trainingResults.plotData.map((entry: any, index: any) => (
                                                <X key={`cell-${index}`} fill={`hsl(var(--chart-${entry.cluster + 1}))`} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Cluster Profiles</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow>{Object.keys(trainingResults.clusterProfiles[0]).map(k => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader>
                                <TableBody>{trainingResults.clusterProfiles.map((p: any, i: number) => (<TableRow key={i}>{Object.values(p).map((v: any, j: number) => <TableCell key={j}>{v}</TableCell>)}</TableRow>))}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

interface AnalysisCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    type: AnalysisType;
    onSelect: (type: AnalysisType) => void;
    disabled?: boolean;
}

const AnalysisSelectionCard: React.FC<AnalysisCardProps> = ({ title, description, icon: Icon, type, onSelect, disabled }) => (
    <Card 
      className={cn(
        "transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1",
        disabled ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'cursor-pointer'
      )} 
      onClick={() => !disabled && onSelect(type)}
    >
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary"/>
                {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
    </Card>
);

const DomainRecommendation = ({ headers }: { headers: string[] }) => {
    const recommendation = useMemo(() => {
        const lowerCaseHeaders = headers.map(h => h.toLowerCase());
        
        const marketingKeywords = ['campaign', 'channel', 'conversion', 'cpc', 'ctr', 'customer', 'ltv', 'revenue', 'session'];
        const financeKeywords = ['asset', 'liability', 'equity', 'revenue', 'profit', 'stock', 'trade', 'portfolio', 'loan', 'credit'];
        const healthcareKeywords = ['patient', 'diagnosis', 'treatment', 'bmi', 'blood_pressure', 'heart_rate', 'medical', 'hospital', 'doctor'];

        const scores: { [key in DomainType]: number } = {
            marketing: lowerCaseHeaders.filter(h => marketingKeywords.some(k => h.includes(k))).length,
            finance: lowerCaseHeaders.filter(h => financeKeywords.some(k => h.includes(k))).length,
            healthcare: lowerCaseHeaders.filter(h => healthcareKeywords.some(k => h.includes(k))).length,
            general: 1 // a small base score
        };

        const topDomain = Object.keys(scores).reduce((a, b) => scores[a as DomainType] > scores[b as DomainType] ? a : b) as DomainType;

        const reasons: { [key in DomainType]?: string[] } = {
            marketing: lowerCaseHeaders.filter(h => marketingKeywords.some(k => h.includes(k))),
            finance: lowerCaseHeaders.filter(h => financeKeywords.some(k => h.includes(k))),
            healthcare: lowerCaseHeaders.filter(h => healthcareKeywords.some(k => h.includes(k))),
        };

        const domainInfo = {
            marketing: { icon: ShoppingCart, label: 'Marketing & Sales' },
            finance: { icon: Building, label: 'Finance & Trading' },
            healthcare: { icon: Heart, label: 'Healthcare & Medical' },
            general: { icon: BrainCircuit, label: 'General Purpose' },
        };

        return {
            domain: topDomain,
            reason: `Detected keywords: ${reasons[topDomain]?.slice(0,3).join(', ')}`,
            ...domainInfo[topDomain]
        };
    }, [headers]);

    const { icon: Icon, label, reason } = recommendation;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Bot className="h-5 w-5 text-primary" /> AI Domain Recommendation</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <p className="font-semibold text-primary">{label}</p>
                        <p className="text-sm text-muted-foreground">{reason}</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};


export default function DeepLearningApp() {
    const [step, setStep] = useState<AnalysisStep>('select-type');
    const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);

    const [data, setData] = useState<DataSet>([]);
    const [allHeaders, setAllHeaders] = useState<string[]>([]);
    const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
    const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const processData = useCallback((content: string, name: string) => {
        setIsUploading(true);
        try {
            const { headers: newHeaders, data: newData, numericHeaders: newNumericHeaders, categoricalHeaders: newCategoricalHeaders } = parseData(content);
            
            if (newData.length === 0 || newHeaders.length === 0) {
              throw new Error("No valid data found in the file.");
            }
            setData(newData);
            setAllHeaders(newHeaders);
            setNumericHeaders(newNumericHeaders);
            setCategoricalHeaders(newCategoricalHeaders);
            setFileName(name);
            toast({ title: 'Success', description: `Loaded "${name}" with ${newData.length} rows.`});

          } catch (error: any) {
            toast({
              variant: 'destructive',
              title: 'File Processing Error',
              description: error.message || 'Could not parse file. Please check the format.',
            });
            handleClearData();
          } finally {
            setIsUploading(false);
          }
    }, [toast]);

    const handleFileSelected = useCallback((file: File) => {
        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) {
                toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
                setIsUploading(false);
                return;
            }
            processData(content, file.name);
        };

        reader.onerror = (e) => {
            toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
            setIsUploading(false);
        }
        
        if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            reader.readAsArrayBuffer(file);
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, {type: 'array'});
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                processData(csv, file.name);
            }
        } else {
            reader.readAsText(file);
        }
    }, [processData, toast]);

    const handleClearData = () => {
        setData([]);
        setAllHeaders([]);
        setNumericHeaders([]);
        setCategoricalHeaders([]);
        setFileName('');
    };

    const hasData = data.length > 0;

    const handleAnalysisSelect = (type: AnalysisType) => {
        setAnalysisType(type);
    };

    const handleNextStep = () => {
        if (analysisType) {
            setStep('configure');
        }
    };
    
    const handleLoadExampleData = (example: any) => {
        processData(example.data, example.name);
    }

    const renderContent = () => {
        if (step === 'select-type') {
            return (
                 <motion.div key="select-type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">Start a New Analysis</CardTitle>
                            <CardDescription>First, upload your dataset. Then, choose the type of analysis you want to perform.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
                                {hasData && <DataPreview fileName={fileName} data={data} headers={allHeaders} onDownload={()=>{}} onClearData={handleClearData} />}
                            </div>
                            
                            {hasData && <DomainRecommendation headers={allHeaders} />}

                            <div className={cn("transition-opacity duration-500", hasData ? 'opacity-100' : 'opacity-20 pointer-events-none')}>
                                <h3 className="text-lg font-semibold mb-4">Select Analysis Type</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <AnalysisSelectionCard title="Classification" description="Predict a category (e.g., churn, fraud)." icon={BrainCircuit} type="classification" onSelect={handleAnalysisSelect} />
                                    <AnalysisSelectionCard title="Regression" description="Predict a continuous value (e.g., price, sales)." icon={TrendingUp} type="regression" onSelect={handleAnalysisSelect} />
                                    <AnalysisSelectionCard title="Clustering" description="Group similar data points together." icon={Users} type="clustering" onSelect={handleAnalysisSelect} />
                                    <AnalysisSelectionCard title="Natural Language (NLP)" description="Analyze and understand text data." icon={BrainCircuit} type="nlp" onSelect={() => {}} disabled />
                                    <AnalysisSelectionCard title="Computer Vision (CV)" description="Analyze and understand image data." icon={BrainCircuit} type="computer-vision" onSelect={() => {}} disabled />
                                </div>
                                {analysisType && <div className="mt-4 text-center text-sm font-medium text-primary">Selected: {analysisType}</div>}
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-end">
                            <Button onClick={handleNextStep} disabled={!analysisType || !hasData}>
                                Next <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            );
        }

        if (step === 'configure') {
            const commonProps = {
                data,
                numericHeaders,
                categoricalHeaders,
                allHeaders,
                onLoadExample: handleLoadExampleData,
                onFileSelected: handleFileSelected,
                isUploading,
            };
            switch(analysisType) {
                case 'classification':
                    return <DnnClassificationPage {...commonProps} />
                case 'regression':
                    return <DnnRegressionPage {...commonProps} />
                case 'clustering':
                    return <DnnClusteringPage {...commonProps} />;
                default:
                    return (
                        <Card>
                            <CardHeader><CardTitle>Configuration Not Available</CardTitle></CardHeader>
                            <CardContent><p>Configuration for '{analysisType}' is not yet implemented.</p><Button onClick={() => setStep('select-type')}>Back</Button></CardContent>
                        </Card>
                    );
            }
        }
    };


    return (
        <div className="p-4 md:p-6 space-y-8">
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
        </div>
    );
}


'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BrainCircuit, UploadCloud, File, CheckCircle, ChevronRight, Loader2, Bot, Sparkles, Building, Heart, ShoppingCart, Layers, Plus, Trash2, Sigma, LineChart as LineChartIcon, TrendingUp, ScatterChart as ScatterChartIcon, Users, Terminal } from 'lucide-react';
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
import { LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ResponsiveContainer, ScatterChart, Scatter } from "recharts"


type AnalysisStep = 'select-type' | 'configure';
type AnalysisType = 'classification' | 'regression' | 'clustering' | 'nlp' | 'computer-vision';
type DomainType = 'marketing' | 'finance' | 'healthcare' | 'general';

interface Layer {
    id: number;
    neurons: number;
    activation: 'relu' | 'sigmoid' | 'tanh' | 'softmax';
}

interface DnnPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onFileSelected: (file: File) => void;
    isUploading: boolean;
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

function DnnRegressionPage({ data, numericHeaders, onLoadExample, onFileSelected, isUploading }: DnnPageProps) {
    const [layers, setLayers] = useState<Layer[]>([
        { id: 1, neurons: 128, activation: 'relu' },
        { id: 2, neurons: 64, activation: 'relu' },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [trainingResults, setTrainingResults] = useState<any>(null);

    const addLayer = () => {
        const newId = (layers.at(-1)?.id || 0) + 1;
        setLayers([...layers, { id: newId, neurons: 32, activation: 'relu' }]);
    };
    
    const removeLayer = (id: number) => {
        if (layers.length > 1) {
            setLayers(layers.filter(layer => layer.id !== id));
        }
    };

    const updateLayer = (id: number, field: keyof Omit<Layer, 'id'>, value: any) => {
        setLayers(layers.map(layer => layer.id === id ? { ...layer, [field]: value } : layer));
    };
    
    const handleTrainModel = () => {
        setIsLoading(true);
        setTrainingResults(null);
        console.log("Training regression model with layers:", layers);
        setTimeout(() => {
            const mockHistory = Array.from({ length: 20 }, (_, i) => ({
                epoch: i + 1,
                loss: 15000 - (i * 600) + (Math.random() * 1000),
                val_loss: 16000 - (i * 550) + (Math.random() * 1200),
            }));

            const mockPredictions = Array.from({length: 20}, () => ({
                actual: 300000 + Math.random() * 400000,
                predicted: 300000 + Math.random() * 400000,
            }));
            
            const predictionExamples = mockPredictions.slice(0, 10).map(p => {
                const error = p.actual - p.predicted;
                return {
                    actual: p.actual,
                    predicted: p.predicted,
                    error: Math.abs(error),
                    error_percent: p.actual !== 0 ? (Math.abs(error) / p.actual) * 100 : 0
                }
            });


            setTrainingResults({
                history: mockHistory,
                metrics: { r2: 0.88, mse: 12345.67, rmse: 111.11 },
                predictions: mockPredictions,
                predictionExamples: predictionExamples,
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
                        <CardTitle className="font-headline">DNN Regression</CardTitle>
                        <CardDescription>
                            Upload a dataset with numeric features and a numeric target, or try our example.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                        {gbmRegressionExample && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">
                                        Or
                                        </span>
                                    </div>
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
                    <CardTitle className="font-headline">1. Data & Variables</CardTitle>
                    <CardDescription>Select your target (what to predict) and feature (predictor) variables.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     <div>
                        <Label>Target Variable (Numeric)</Label>
                        <Select>
                            <SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger>
                            <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label>Feature Variables</Label>
                        <div className="p-2 border rounded-md h-24 overflow-y-auto">
                            {numericHeaders.slice(0,-1).map(h => <div key={h} className="text-sm">{h}</div>)}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Layers /> 2. Model Architecture</CardTitle>
                    <CardDescription>Define the layers of your Deep Neural Network for regression.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {layers.map((layer, index) => (
                        <div key={layer.id} className="flex items-center gap-4 p-3 border rounded-lg">
                            <Label className="font-semibold">Layer {index + 1}</Label>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor={`neurons-${layer.id}`}>Neurons</Label>
                                    <Input id={`neurons-${layer.id}`} type="number" value={layer.neurons} onChange={(e) => updateLayer(layer.id, 'neurons', parseInt(e.target.value) || 0)} min="1"/>
                                </div>
                                <div>
                                    <Label htmlFor={`activation-${layer.id}`}>Activation</Label>
                                    <Select value={layer.activation} onValueChange={(value) => updateLayer(layer.id, 'activation', value)}>
                                        <SelectTrigger id={`activation-${layer.id}`}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="relu">ReLU</SelectItem>
                                            <SelectItem value="sigmoid">Sigmoid</SelectItem>
                                            <SelectItem value="tanh">Tanh</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeLayer(layer.id)} disabled={layers.length <= 1}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                     <Button variant="outline" onClick={addLayer}><Plus className="mr-2" /> Add Layer</Button>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleTrainModel} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Training...</> : <><Sigma className="mr-2" />Train Model</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">3. Training in Progress...</CardTitle>
                        <CardDescription>The regression model is being trained.</CardDescription>
                    </CardHeader>
                     <CardContent className="flex flex-col items-center gap-4 p-8">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <p className="text-muted-foreground">Epoch 7/20 - Loss: 9876.54</p>
                    </CardContent>
                </Card>
            )}

            {trainingResults && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">3. Training Results</CardTitle>
                            <CardDescription>Performance metrics and visualizations for the trained regression model.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">R-squared</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.r2.toFixed(2)}</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">MSE</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.mse.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">RMSE</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.rmse.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></CardContent></Card>
                            </div>

                             <div className="grid md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Training History (Loss)</CardTitle></CardHeader>
                                    <CardContent>
                                        <ChartContainer config={{loss: {label: 'Loss', color: 'hsl(var(--chart-1))'}, val_loss: {label: 'Validation Loss', color: 'hsl(var(--chart-2))'}}} className="h-[250px] w-full">
                                            <LineChart data={trainingResults.history}>
                                                <CartesianGrid strokeDasharray="3 3"/>
                                                <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }}/>
                                                <YAxis label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}/>
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend verticalAlign="top"/>
                                                <Line type="monotone" dataKey="loss" stroke="var(--color-loss)" dot={false} />
                                                <Line type="monotone" dataKey="val_loss" stroke="var(--color-val_loss)" dot={false} strokeDasharray="5 5"/>
                                            </LineChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
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
                                                    <Scatter name="Predictions" data={trainingResults.predictions} fill="hsl(var(--chart-1))" />
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                    <PredictionExamplesTable examples={trainingResults.predictionExamples} problemType="regression" />
                </div>
            )}
        </div>
    );
}

function DnnClassificationPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onFileSelected, isUploading }: DnnPageProps) {
    const [layers, setLayers] = useState<Layer[]>([
        { id: 1, neurons: 128, activation: 'relu' },
        { id: 2, neurons: 64, activation: 'relu' },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [trainingResults, setTrainingResults] = useState<any>(null);

    const addLayer = () => {
        const newId = (layers.at(-1)?.id || 0) + 1;
        setLayers([...layers, { id: newId, neurons: 32, activation: 'relu' }]);
    };
    
    const removeLayer = (id: number) => {
        if (layers.length > 1) {
            setLayers(layers.filter(layer => layer.id !== id));
        }
    };

    const updateLayer = (id: number, field: keyof Omit<Layer, 'id'>, value: any) => {
        setLayers(layers.map(layer => layer.id === id ? { ...layer, [field]: value } : layer));
    };
    
    const handleTrainModel = () => {
        setIsLoading(true);
        setTrainingResults(null);
        console.log("Training model with layers:", layers);
        setTimeout(() => {
            // Mock training results
            const mockHistory = Array.from({ length: 20 }, (_, i) => ({
                epoch: i + 1,
                loss: 0.8 - (i * 0.035) + (Math.random() * 0.1),
                accuracy: 0.6 + (i * 0.018) + (Math.random() * 0.05),
                val_loss: 0.75 - (i * 0.025) + (Math.random() * 0.12),
                val_accuracy: 0.65 + (i * 0.015) + (Math.random() * 0.06),
            }));

            const predictionExamples = Array.from({length: 10}, () => {
                const actual = Math.random() > 0.5 ? 'Yes' : 'No';
                const predicted = Math.random() > 0.3 ? actual : (actual === 'Yes' ? 'No' : 'Yes');
                return {
                    actual,
                    predicted,
                    status: actual === predicted ? '✅' : '❌',
                    confidence: 0.7 + Math.random() * 0.3
                }
            })

            setTrainingResults({
                history: mockHistory,
                metrics: { accuracy: 0.92, precision: 0.91, recall: 0.93, f1_score: 0.92 },
                confusion_matrix: [[102, 8], [5, 115]], // Example confusion matrix
                predictionExamples: predictionExamples,
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
                        <CardTitle className="font-headline">DNN Classification</CardTitle>
                        <CardDescription>
                            Upload a dataset with numeric features and a categorical target, or try our example.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                        {irisExample && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">
                                        Or
                                        </span>
                                    </div>
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
                    <CardTitle className="font-headline">1. Data & Variables</CardTitle>
                    <CardDescription>Select your target (what to predict) and feature (predictor) variables.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     <div>
                        <Label>Target Variable (Categorical)</Label>
                        <Select>
                            <SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger>
                            <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label>Feature Variables (Numeric)</Label>
                        <div className="p-2 border rounded-md h-24 overflow-y-auto">
                            {numericHeaders.map(h => <div key={h} className="text-sm">{h}</div>)}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Layers /> 2. Model Architecture</CardTitle>
                    <CardDescription>Define the layers of your Deep Neural Network.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {layers.map((layer, index) => (
                        <div key={layer.id} className="flex items-center gap-4 p-3 border rounded-lg">
                            <Label className="font-semibold">Layer {index + 1}</Label>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor={`neurons-${layer.id}`}>Neurons</Label>
                                    <Input
                                        id={`neurons-${layer.id}`}
                                        type="number"
                                        value={layer.neurons}
                                        onChange={(e) => updateLayer(layer.id, 'neurons', parseInt(e.target.value) || 0)}
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`activation-${layer.id}`}>Activation</Label>
                                    <Select
                                        value={layer.activation}
                                        onValueChange={(value) => updateLayer(layer.id, 'activation', value)}
                                    >
                                        <SelectTrigger id={`activation-${layer.id}`}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="relu">ReLU</SelectItem>
                                            <SelectItem value="sigmoid">Sigmoid</SelectItem>
                                            <SelectItem value="tanh">Tanh</SelectItem>
                                            <SelectItem value="softmax">Softmax</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeLayer(layer.id)} disabled={layers.length <= 1}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                     <Button variant="outline" onClick={addLayer}><Plus className="mr-2" /> Add Layer</Button>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleTrainModel} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Training...</> : <><Sigma className="mr-2" />Train Model</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">3. Training in Progress...</CardTitle>
                        <CardDescription>The model is being trained. This may take a moment.</CardDescription>
                    </CardHeader>
                     <CardContent className="flex flex-col items-center gap-4 p-8">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <p className="text-muted-foreground">Epoch 5/20 - Loss: 0.45, Accuracy: 0.78</p>
                    </CardContent>
                </Card>
            )}

            {trainingResults && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">3. Training Results</CardTitle>
                            <CardDescription>Performance metrics and visualizations for the trained model.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Accuracy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{(trainingResults.metrics.accuracy * 100).toFixed(1)}%</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Precision</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.precision.toFixed(2)}</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recall</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.recall.toFixed(2)}</p></CardContent></Card>
                                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">F1-Score</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{trainingResults.metrics.f1_score.toFixed(2)}</p></CardContent></Card>
                            </div>

                             <div className="grid md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Training History</CardTitle></CardHeader>
                                    <CardContent>
                                        <ChartContainer config={{loss: {label: 'Loss', color: 'hsl(var(--chart-1))'}, accuracy: {label: 'Accuracy', color: 'hsl(var(--chart-2))'}}} className="h-[250px] w-full">
                                            <LineChart data={trainingResults.history}>
                                                <CartesianGrid strokeDasharray="3 3"/>
                                                <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }}/>
                                                <YAxis yAxisId="left" label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}/>
                                                <YAxis yAxisId="right" orientation="right" label={{ value: 'Accuracy', angle: -90, position: 'insideRight' }}/>
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend verticalAlign="top"/>
                                                <Line yAxisId="left" type="monotone" dataKey="loss" stroke="var(--color-loss)" dot={false} />
                                                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" dot={false} />
                                            </LineChart>
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

function DnnClusteringPage() {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline">DNN Clustering</CardTitle>
                    <CardDescription>
                        This section is under construction. Advanced unsupervised learning tools are coming soon!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Stay tuned for updates on autoencoders, SOMs, and more.</p>
                </CardContent>
            </Card>
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
            toast({ title: 'Success', description: `Loaded "${name}" with ${newData.length} rows.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'File Processing Error', description: error.message });
            setData([]); setAllHeaders([]); setFileName('');
        } finally {
            setIsUploading(false);
        }
    }, [toast]);

    const handleFileSelected = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => processData(e.target?.result as string, file.name);
        reader.onerror = () => toast({ variant: 'destructive', title: 'File Read Error' });
        if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            reader.readAsArrayBuffer(file);
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, {type: 'array'});
                const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
                processData(csv, file.name);
            }
        } else {
            reader.readAsText(file);
        }
    }, [processData, toast]);

    const handleClearData = () => {
        setData([]); setAllHeaders([]); setFileName('');
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
                    return <DnnClusteringPage />;
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

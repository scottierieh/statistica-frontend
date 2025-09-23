
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Container, Info, HelpCircle, Settings, BarChart, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


interface KnnRegressionMetrics {
    r2_score: number;
    rmse: number;
    mae: number;
}

interface KnnRegressionResults {
    metrics: {
        test: KnnRegressionMetrics;
        train: KnnRegressionMetrics;
    };
    predictions: { actual: number; predicted: number }[];
    prediction?: {
        x_value: number | { [key: string]: number };
        y_value: number;
    };
    features: string[];
}

interface FullAnalysisResponse {
    results: KnnRegressionResults;
    plot: string | null;
    relationship_plot?: string | null;
    prediction_plot?: string | null;
}

interface KnnRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    mode: 'simple' | 'multiple';
}

export default function KnnRegressionPage({ data, numericHeaders, onLoadExample, mode }: KnnRegressionPageProps) {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [k, setK] = useState(5);
    const [testSize, setTestSize] = useState(0.2);
    
    const [predictXValue, setPredictXValue] = useState<number | ''>('');
    const [predictXValues, setPredictXValues] = useState<{ [key: string]: number | '' }>({});

    const [predictedYValue, setPredictedYValue] = useState<number | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showHelpPage, setShowHelpPage] = useState(data.length === 0);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setTarget(defaultTarget);

        if (mode === 'simple') {
            const feature = numericHeaders.find(h => h !== defaultTarget) || numericHeaders[0];
            setFeatures(feature ? [feature] : []);
            setPredictXValues({});
        } else {
            const initialFeatures = numericHeaders.filter(h => h !== defaultTarget);
            setFeatures(initialFeatures);
            const initialValues: { [key: string]: number | '' } = {};
            initialFeatures.forEach(f => {
                initialValues[f] = '';
            });
            setPredictXValues(initialValues);
        }
        setAnalysisResult(null);
        setPredictedYValue(null);
        setPredictXValue('');
        setShowHelpPage(data.length === 0);
    }, [data, numericHeaders, mode]);
    
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= (mode === 'simple' ? 2 : 2), [data, numericHeaders, mode]);
    
    useEffect(() => {
        setShowHelpPage(!canRun);
    }, [canRun]);


    const handleFeatureChange = (header: string, checked: boolean) => {
        if (mode === 'simple') {
            setFeatures(checked ? [header] : []);
        } else {
            setFeatures(prev => {
                const newFeatures = checked ? [...prev, header] : prev.filter(f => f !== header);
                // Also update the state for prediction inputs
                setPredictXValues(currentValues => {
                    const newPredictValues: { [key: string]: number | '' } = {};
                    newFeatures.forEach(f => {
                        newPredictValues[f] = currentValues[f] || '';
                    });
                    return newPredictValues;
                });
                return newFeatures;
            });
        }
    };
    
    const handlePredictValuesChange = (feature: string, value: string) => {
        setPredictXValues(prev => ({
            ...prev,
            [feature]: value === '' ? '' : Number(value)
        }));
    }

    const handleAnalysis = useCallback(async (predictValue?: number | { [key: string]: number }) => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        if (predictValue === undefined) {
            setAnalysisResult(null);
            setPredictedYValue(null);
        }
        
        try {
            const analysisData = data.map(row => {
                const newRow: { [key: string]: any } = {};
                if (target) newRow[target] = row[target];
                features.forEach(f => {
                    if (row[f] !== undefined) {
                        newRow[f] = row[f];
                    }
                });
                return newRow;
            });

            const body = {
                data: analysisData,
                target,
                features,
                k,
                test_size: testSize,
                predict_x: predictValue
            };

            const response = await fetch('/api/analysis/knn-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            if (predictValue !== undefined && result.results.prediction) {
                setPredictedYValue(result.results.prediction.y_value);
                 toast({ title: 'Prediction Complete', description: `Predicted value is ${result.results.prediction.y_value.toFixed(2)}` });
            }

        } catch (e: any) {
            console.error('KNN Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, k, testSize, toast]);
    
    if (showHelpPage) {
        const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
        return (
             <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-4xl">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-3 text-2xl">
                             <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Container size={28} />
                             </div>
                            Simple K-Nearest Neighbors (KNN) Regression
                        </CardTitle>
                        <CardDescription className="text-base pt-2">
                           하나의 독립변수(X)를 사용하여 다른 하나의 종속변수(Y)를 예측하는 비모수 회귀 분석 방법입니다. "가까운 이웃과 비슷할 것이다"라는 단순한 아이디어에 기반합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><HelpCircle className="mr-2 h-5 w-5 text-primary" />어떻게 작동하나요?</h3>
                            <p className="text-muted-foreground">
                                KNN 회귀 분석은 새로운 데이터 포인트의 값을 예측하기 위해, 훈련 데이터셋에서 가장 가까운 'K'개의 이웃을 찾습니다. 그리고 이 이웃들의 종속변수(Y) 값의 평균을 내어 예측값으로 사용합니다. 예를 들어, '공부 시간'으로 '시험 점수'를 예측할 때, 5시간 공부한 학생의 점수를 예측하기 위해 훈련 데이터에서 5시간과 가장 가까운 K명의 학생들의 점수 평균을 계산하는 방식입니다.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><Settings className="mr-2 h-5 w-5 text-primary" />설정 방법</h3>
                             <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> 예측하고자 하는 숫자형 변수를 선택합니다. (예: 시험 점수)</li>
                                <li><strong>Feature Variable (X):</strong> 예측에 사용할 숫자형 변수를 선택합니다. (예: 공부 시간)</li>
                                <li><strong>K (Number of Neighbors):</strong> 예측에 참고할 이웃의 수를 정합니다. 작은 K는 모델을 더 유연하게 만들지만 노이즈에 민감해질 수 있고, 큰 K는 예측을 더 안정시키지만 중요한 패턴을 놓칠 수 있습니다.</li>
                                <li><strong>Test Set Size:</strong> 모델 성능 평가를 위해 전체 데이터에서 분리할 테스트 데이터의 비율을 정합니다. (예: 20%)</li>
                            </ul>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" />결과 해석</h3>
                             <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>R-squared (결정계수):</strong> 모델이 데이터의 분산을 얼마나 잘 설명하는지를 나타냅니다. 1에 가까울수록 좋습니다. Train R²가 Test R²보다 현저히 높으면 과적합(Overfitting)을 의심할 수 있습니다.</li>
                                <li><strong>RMSE (Root Mean Squared Error):</strong> 예측 오차의 평균적인 크기를 나타냅니다. 낮을수록 좋습니다.</li>
                                <li><strong>Actual vs. Predicted Plot:</strong> 점들이 45도 대각선에 가까울수록 모델의 예측이 정확하다는 의미입니다.</li>
                                <li><strong>Prediction Simulation:</strong> 특정 X값에 대한 Y값을 예측하고, 예측에 사용된 K개의 이웃 데이터 포인트를 시각적으로 확인할 수 있습니다.</li>
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                         {regressionExample && (
                             <Button variant="outline" onClick={() => onLoadExample(regressionExample)}>
                                <TrendingUp className="mr-2 h-4 w-4" /> Load Sample Regression Data
                            </Button>
                         )}
                         {canRun && <Button onClick={() => setShowHelpPage(false)}>Back to Setup</Button>}
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    const handleMultiPredict = () => {
        const valuesToPredict: { [key: string]: number } = {};
        for(const feature of features) {
            const val = predictXValues[feature];
            if (val === '' || isNaN(val)) {
                toast({ variant: 'destructive', title: 'Input Error', description: `Please enter a valid number for all features.` });
                return;
            }
            valuesToPredict[feature] = Number(val);
        }
        handleAnalysis(valuesToPredict);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle className="font-headline">KNN Regression Setup ({mode})</CardTitle>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setShowHelpPage(true)}><HelpCircle className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Learn about KNN Regression.</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex-1 space-y-2">
                         <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label>Target Variable</Label>
                                <Select value={target} onValueChange={setTarget}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            {mode === 'simple' ? (
                                 <div>
                                    <Label>Feature Variable</Label>
                                    <Select value={features[0]} onValueChange={v => setFeatures([v])}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{availableFeatures.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div>
                                    <Label>Features</Label>
                                    <ScrollArea className="h-24 border rounded-md p-2">
                                    {availableFeatures.map(h => (
                                            <div key={h} className="flex items-center space-x-2">
                                                <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                                <Label htmlFor={`feat-${h}`}>{h}</Label>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>K (Number of Neighbors): {k}</Label>
                            <Slider value={[k]} onValueChange={v => setK(v[0])} min={1} max={50} step={1} />
                        </div>
                         <div>
                            <Label>Test Set Size: {Math.round(testSize*100)}%</Label>
                            <Slider value={[testSize]} onValueChange={v => setTestSize(v[0])} min={0.1} max={0.5} step={0.05} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={() => handleAnalysis()} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run KNN</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {mode === 'simple' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Prediction Simulation</CardTitle>
                        <CardDescription>Enter a value for '{features[0]}' to predict '{target}'.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Input type="number" value={predictXValue} onChange={e => setPredictXValue(e.target.value === '' ? '' : Number(e.target.value))} placeholder={`Enter a value for ${features[0]}`}/>
                        <Button onClick={() => handleAnalysis(Number(predictXValue))} disabled={predictXValue === '' || isLoading}>Predict</Button>
                    </CardContent>
                    {predictedYValue !== null && (
                        <CardFooter>
                            <p className="text-lg">Predicted '{target}': <strong className="font-bold text-primary">{predictedYValue.toFixed(2)}</strong></p>
                        </CardFooter>
                    )}
                </Card>
            )}

            {mode === 'multiple' && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Prediction Simulation</CardTitle>
                        <CardDescription>Enter values for the features to get a prediction.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {features.map(feature => (
                                <div key={feature}>
                                    <Label htmlFor={`pred-in-${feature}`}>{feature}</Label>
                                    <Input
                                        id={`pred-in-${feature}`}
                                        type="number"
                                        value={predictXValues[feature] ?? ''}
                                        onChange={(e) => handlePredictValuesChange(feature, e.target.value)}
                                        placeholder="Enter value"
                                    />
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleMultiPredict} disabled={isLoading}>Predict</Button>
                    </CardContent>
                    {predictedYValue !== null && (
                        <CardFooter>
                            <p className="text-lg">Predicted '{target}': <strong className="font-bold text-primary">{predictedYValue.toFixed(2)}</strong></p>
                        </CardFooter>
                    )}
                </Card>
            )}

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Train vs. Test Performance</CardTitle>
                            <CardDescription>Comparing model performance on training and testing data can help identify overfitting.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Train Score</TableHead>
                                        <TableHead className="text-right">Test Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>R-squared</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.train.r2_score.toFixed(4)}</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.test.r2_score.toFixed(4)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>RMSE</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.train.rmse.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.test.rmse.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>MAE</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.train.mae.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.test.mae.toFixed(3)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/>Interpreting R-squared Scores</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Situation</TableHead>
                                        <TableHead>Train R² (Example)</TableHead>
                                        <TableHead>Test R² (Example)</TableHead>
                                        <TableHead>Interpretation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-semibold">Good Fit</TableCell>
                                        <TableCell className="font-mono">0.85</TableCell>
                                        <TableCell className="font-mono">0.82</TableCell>
                                        <TableCell>Train and test scores are similar and high. The model generalizes well.</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell className="font-semibold text-orange-600">Overfitting</TableCell>
                                        <TableCell className="font-mono">0.98</TableCell>
                                        <TableCell className="font-mono">0.65</TableCell>
                                        <TableCell>The model performs very well on training data but poorly on new (test) data. It learned the noise, not the signal.</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell className="font-semibold text-blue-600">Underfitting</TableCell>
                                        <TableCell className="font-mono">0.35</TableCell>
                                        <TableCell className="font-mono">0.30</TableCell>
                                        <TableCell>Both scores are low. The model is too simple and fails to capture the underlying pattern in the data.</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <div className="grid md:grid-cols-2 gap-4">
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Model Fit: Actual vs. Predicted</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plot} alt="KNN Actual vs Predicted Plot" width={800} height={600} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        )}
                        {analysisResult.relationship_plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>X vs. Y Relationship</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.relationship_plot} alt="KNN Relationship Plot" width={800} height={600} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    {analysisResult.prediction_plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Prediction Simulation Plot</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.prediction_plot} alt="KNN Prediction Plot" width={800} height={600} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Upload, Settings, TrendingUp, CheckCircle, AlertCircle, Info, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_DATASETS = [
    {
        name: 'Iris Classification',
        description: 'Predict flower species (3 classes)',
        targetColumn: 'species',
        taskType: 'classification' as const,
        modelType: 'random_forest' as const,
        searchMethod: 'random' as const,
        csvData: `sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3.0,1.4,0.2,setosa
4.7,3.2,1.3,0.2,setosa
4.6,3.1,1.5,0.2,setosa
5.0,3.6,1.4,0.2,setosa
5.4,3.9,1.7,0.4,setosa
4.6,3.4,1.4,0.3,setosa
5.0,3.4,1.5,0.2,setosa
4.4,2.9,1.4,0.2,setosa
4.9,3.1,1.5,0.1,setosa
7.0,3.2,4.7,1.4,versicolor
6.4,3.2,4.5,1.5,versicolor
6.9,3.1,4.9,1.5,versicolor
5.5,2.3,4.0,1.3,versicolor
6.5,2.8,4.6,1.5,versicolor
5.7,2.8,4.5,1.3,versicolor
6.3,3.3,4.7,1.6,versicolor
4.9,2.4,3.3,1.0,versicolor
6.6,2.9,4.6,1.3,versicolor
5.2,2.7,3.9,1.4,versicolor
6.3,3.3,6.0,2.5,virginica
5.8,2.7,5.1,1.9,virginica
7.1,3.0,5.9,2.1,virginica
6.3,2.9,5.6,1.8,virginica
6.5,3.0,5.8,2.2,virginica
7.6,3.0,6.6,2.1,virginica
4.9,2.5,4.5,1.7,virginica
7.3,2.9,6.3,1.8,virginica
6.7,2.5,5.8,1.8,virginica
7.2,3.6,6.1,2.5,virginica`
    },
    {
        name: 'Housing Regression',
        description: 'Predict house price',
        targetColumn: 'price',
        taskType: 'regression' as const,
        modelType: 'xgboost' as const,
        searchMethod: 'random' as const,
        csvData: `size,bedrooms,age,distance_to_city,price
1500,3,10,5.2,250000
2000,4,5,3.1,380000
1200,2,15,8.5,180000
1800,3,8,4.3,320000
2500,4,3,2.8,450000
1100,2,20,12.0,150000
1600,3,12,6.5,240000
2200,4,6,3.5,400000
1400,2,18,9.2,190000
1900,3,7,4.8,340000
2800,5,2,2.1,520000
1300,2,16,10.5,170000
2100,4,5,3.8,410000
1700,3,11,5.9,280000
2400,4,4,2.9,470000
1250,2,19,11.2,160000
1850,3,9,5.5,310000
2300,4,6,3.3,430000
1450,2,14,7.8,200000
2000,3,7,4.2,360000`
    }
];

interface HyperparameterTuningResult {
    success: boolean;
    best_params: Record<string, any>;
    best_score: number;
    all_results: Array<{
        params: Record<string, any>;
        mean_score: number;
        std_score: number;
    }>;
    model_info: {
        model_type: string;
        task_type: string;
        search_method: string;
        n_trials: number;
        cv_folds: number;
    };
    dataset_info: {
        n_samples: number;
        n_features: number;
        feature_names: string[];
        target_name: string;
    };
    plots: {
        param_importance?: string;
        convergence?: string;
        learning_curve?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function HyperparameterTuningPage() {
    const { toast } = useToast();

    const [file, setFile] = useState<File | null>(null);
    const [targetColumn, setTargetColumn] = useState('');
    const [modelType, setModelType] = useState<'random_forest' | 'xgboost' | 'svm' | 'logistic' | 'ridge' | 'lasso' | 'mlp'>('random_forest');
    const [taskType, setTaskType] = useState<'classification' | 'regression'>('classification');
    const [searchMethod, setSearchMethod] = useState<'grid' | 'random' | 'optuna'>('random');
    const [cvFolds, setCvFolds] = useState('5');
    const [nIter, setNIter] = useState('20');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<HyperparameterTuningResult | null>(null);
    
    // Example dataset states
    const [expandedExample, setExpandedExample] = useState<string | null>(null);
    
    // CSV columns state
    const [csvColumns, setCsvColumns] = useState<string[]>([]);

    const parseCSV = (csvData: string) => {
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',');
        const rows = lines.slice(1).map(line => line.split(','));
        return { headers, rows };
    };

    const readCSVColumns = async (file: File) => {
        return new Promise<string[]>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const firstLine = text.split('\n')[0];
                const columns = firstLine.split(',').map(col => col.trim());
                resolve(columns);
            };
            reader.readAsText(file);
        });
    };

    const handleExampleSelect = (example: typeof EXAMPLE_DATASETS[0]) => {
        const blob = new Blob([example.csvData], { type: 'text/csv' });
        const file = new File([blob], `${example.name.toLowerCase().replace(/\s+/g, '_')}.csv`, { type: 'text/csv' });
        
        setFile(file);
        setTargetColumn(example.targetColumn);
        setTaskType(example.taskType);
        setModelType(example.modelType);
        setSearchMethod(example.searchMethod);
        setResult(null);
        
        // Set columns from example
        const { headers } = parseCSV(example.csvData);
        setCsvColumns(headers);
        
        toast({
            title: "Example Loaded",
            description: `${example.name} dataset ready`
        });
    };

    const handleDownload = (example: typeof EXAMPLE_DATASETS[0]) => {
        const blob = new Blob([example.csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${example.name.toLowerCase().replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Downloaded",
            description: `${example.name} CSV file`
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFile(file);
            setResult(null);
            
            // Read columns from CSV
            const columns = await readCSVColumns(file);
            setCsvColumns(columns);
            setTargetColumn(''); // Reset target column
            
            toast({
                title: "File Loaded",
                description: `Found ${columns.length} columns`
            });
        }
    };

    const handleTune = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please upload a CSV file' });
            return;
        }

        if (!targetColumn) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please specify target column' });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('target_column', targetColumn);
            formData.append('model_type', modelType);
            formData.append('task_type', taskType);
            formData.append('search_method', searchMethod);
            formData.append('cv_folds', cvFolds);
            formData.append('n_iter', nIter);

            const response = await fetch(`${FASTAPI_URL}/api/analysis/hyperparameter-tuning`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Tuning failed');
            }

            const res: HyperparameterTuningResult = await response.json();
            setResult(res);

            toast({
                title: "Tuning Complete",
                description: `Best score: ${res.best_score.toFixed(4)}`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" />
                    Hyperparameter Tuning
                </h1>
                <p className="text-sm text-muted-foreground">
                    Automatically optimize ML model parameters for best performance
                </p>
            </div>

            {/* Example Datasets - MOVED UP */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Example Datasets
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {EXAMPLE_DATASETS.map(example => {
                        const { headers, rows } = parseCSV(example.csvData);
                        const isExpanded = expandedExample === example.name;
                        
                        return (
                            <Collapsible
                                key={example.name}
                                open={isExpanded}
                                onOpenChange={() => setExpandedExample(isExpanded ? null : example.name)}
                            >
                                <div className="p-4 bg-background rounded-lg border">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{example.name}</h3>
                                            <p className="text-sm text-muted-foreground">{example.description}</p>
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {rows.length} samples
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {headers.length} features
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    Target: {example.targetColumn}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <CollapsibleTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8">
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                    {isExpanded ? 'Hide' : 'Preview'}
                                                    {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                                </Button>
                                            </CollapsibleTrigger>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(example)}
                                                className="h-8"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1" />
                                                Download
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleExampleSelect(example)}
                                                className="h-8"
                                            >
                                                Use Dataset
                                            </Button>
                                        </div>
                                    </div>

                                    <CollapsibleContent>
                                        <div className="mt-3 border rounded-lg overflow-hidden bg-white">
                                            <div className="max-h-64 overflow-auto">
                                                <Table>
                                                    <TableHeader className="bg-muted/50 sticky top-0">
                                                        <TableRow>
                                                            {headers.map((header, i) => (
                                                                <TableHead 
                                                                    key={i}
                                                                    className={`${header === example.targetColumn ? 'bg-primary/10 font-bold' : ''} text-xs`}
                                                                >
                                                                    {header}
                                                                    {header === example.targetColumn && (
                                                                        <Badge variant="default" className="ml-1 text-xs">Target</Badge>
                                                                    )}
                                                                </TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {rows.slice(0, 10).map((row, i) => (
                                                            <TableRow key={i} className="hover:bg-muted/30">
                                                                {row.map((cell, j) => (
                                                                    <TableCell 
                                                                        key={j}
                                                                        className={`${headers[j] === example.targetColumn ? 'bg-primary/5 font-semibold' : ''} text-xs font-mono`}
                                                                    >
                                                                        {cell}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            {rows.length > 10 && (
                                                <div className="p-2 bg-muted/30 text-center text-xs text-muted-foreground border-t">
                                                    Showing 10 of {rows.length} rows
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Upload Dataset (CSV)</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="flex-1"
                            />
                            {file && (
                                <Badge variant="outline" className="text-xs">
                                    <Upload className="w-3 h-3 mr-1" />
                                    {file.name}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Upload your training data or use an example dataset above
                        </p>
                    </div>

                    <Separator />

                    {/* Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Target Column</Label>
                            {csvColumns.length > 0 ? (
                                <Select value={targetColumn} onValueChange={setTargetColumn}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select target column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {csvColumns.map(col => (
                                            <SelectItem key={col} value={col}>
                                                {col}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={targetColumn}
                                    onChange={e => setTargetColumn(e.target.value)}
                                    placeholder="Upload CSV first"
                                    className="h-9"
                                    disabled
                                />
                            )}
                            {csvColumns.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Available columns: {csvColumns.join(', ')}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Task Type</Label>
                            <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classification">Classification</SelectItem>
                                    <SelectItem value="regression">Regression</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Model Type</Label>
                            <Select value={modelType} onValueChange={(v: any) => setModelType(v)}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="random_forest">Random Forest</SelectItem>
                                    <SelectItem value="xgboost">XGBoost</SelectItem>
                                    <SelectItem value="svm">SVM</SelectItem>
                                    <SelectItem value="logistic">Logistic Regression</SelectItem>
                                    <SelectItem value="ridge">Ridge</SelectItem>
                                    <SelectItem value="lasso">Lasso</SelectItem>
                                    <SelectItem value="mlp">Neural Network (MLP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Search Method</Label>
                            <Select value={searchMethod} onValueChange={(v: any) => setSearchMethod(v)}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grid">Grid Search</SelectItem>
                                    <SelectItem value="random">Random Search</SelectItem>
                                    <SelectItem value="optuna">Optuna (Bayesian)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">CV Folds</Label>
                            <Input
                                type="number"
                                value={cvFolds}
                                onChange={e => setCvFolds(e.target.value)}
                                className="h-9 font-mono"
                                min="2"
                                max="10"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                {searchMethod === 'grid' ? 'Max Iterations' : 'N Iterations'}
                            </Label>
                            <Input
                                type="number"
                                value={nIter}
                                onChange={e => setNIter(e.target.value)}
                                className="h-9 font-mono"
                                min="5"
                                max="100"
                                disabled={searchMethod === 'grid'}
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800">
                            <Info className="w-3 h-3 inline mr-1" />
                            <strong>Search Methods:</strong> Grid tests all combinations (slow but thorough), 
                            Random samples randomly (faster), Optuna uses Bayesian optimization (smartest).
                        </p>
                    </div>

                    <Button onClick={handleTune} disabled={isLoading || !file} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Tuning...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Start Tuning</>
                        )}
                    </Button>
                </CardContent>
            </Card>


            {/* Results - RESTORED */}
            {result && (
                <>
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Best Score</p>
                                        <p className="text-xl font-bold text-green-700">{result.best_score.toFixed(4)}</p>
                                    </div>
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Trials</p>
                                        <p className="text-xl font-semibold">{result.model_info.n_trials}</p>
                                    </div>
                                    <Settings className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Samples</p>
                                        <p className="text-xl font-semibold">{result.dataset_info.n_samples}</p>
                                    </div>
                                    <CheckCircle className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Features</p>
                                        <p className="text-xl font-semibold">{result.dataset_info.n_features}</p>
                                    </div>
                                    <Info className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Best Parameters */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Optimal Hyperparameters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(result.best_params).map(([key, value]) => (
                                    <div key={key} className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">{key}</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Results */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Top 10 Configurations</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                Each configuration is a unique combination of hyperparameters tested during search
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {result.all_results.slice(0, 10).map((r, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg border ${idx === 0 ? 'bg-green-50 border-green-200' : 'bg-muted/30'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={idx === 0 ? "default" : "outline"} className="text-xs">
                                                    Config #{idx + 1}
                                                </Badge>
                                                {idx === 0 && (
                                                    <Badge variant="default" className="text-xs bg-green-600">
                                                        Best
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-sm font-semibold">
                                                    {r.mean_score.toFixed(4)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    ± {r.std_score.toFixed(4)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(r.params).map(([key, value]) => (
                                                <span key={key} className="text-xs bg-background px-2 py-1 rounded border">
                                                    <span className="text-muted-foreground">{key}:</span>{' '}
                                                    <span className="font-mono font-semibold">
                                                        {typeof value === 'number' ? value.toFixed(3) : String(value)}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            This configuration was tested with {result.model_info.cv_folds}-fold cross-validation
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visualizations */}
                    {result.plots && result.plots.param_importance && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Performance Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg overflow-hidden border">
                                    <Image
                                        src={`data:image/png;base64,${result.plots.param_importance}`}
                                        alt="Results"
                                        width={900}
                                        height={500}
                                        className="w-full"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

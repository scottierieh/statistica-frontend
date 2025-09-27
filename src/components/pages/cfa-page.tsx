
'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    BrainCircuit,
    Plus,
    Trash2,
    PlayCircle,
    AlertTriangle,
    CheckCircle2,
    Bot,
    Settings,
    FileSearch,
    MoveRight,
    HelpCircle,
    Loader2,
    X as XIcon,
    BarChart as BarChartIcon,
    Users,
    Building,
    Star
} from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { produce } from 'immer';
import Image from 'next/image';
import type { DataSet } from '@/lib/stats';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DataUploader from '../data-uploader';
import DataPreview from '../data-preview';
import { parseData, unparseData } from '@/lib/stats';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';


interface CfaFitIndices {
    chi_square?: number;
    df?: number;
    p_value?: number;
    cfi?: number;
    tli?: number;
    rmsea?: number;
    srmr?: number;
}
interface CfaEstimate {
    lval: string;
    op: string;
    rval: string;
    Estimate: number;
    Std_Err: number;
    z_value: number;
    p_value: number;
}

interface CfaResults {
    model_name: string;
    n_observations: number;
    fit_indices: CfaFitIndices;
    estimates: CfaEstimate[];
    interpretation: string;
    model: any; 
    factor_scores: any[];
    mean_components: any;
}

interface FullAnalysisResponse {
    results: CfaResults;
    plot: string | null;
    qq_plot?: string | null;
}

interface IntroPageProps {
  onStart: () => void;
  onLoadExample: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onStart, onLoadExample }) => {
    const cfaExample = exampleDatasets.find(d => d.id === 'cfa-psych-constructs');
    
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <BrainCircuit size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Confirmatory Factor Analysis (CFA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Test how well a pre-specified factor structure fits your observed data, providing a powerful tool for theory validation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use CFA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Unlike Exploratory Factor Analysis (EFA) which discovers underlying structures, CFA is a confirmatory technique used to test a specific hypothesis about the structure of a set of variables. It's crucial for validating psychological scales, confirming theoretical models, and ensuring your measurement instrument works as intended.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {cfaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={onLoadExample}>
                                <BrainCircuit className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{cfaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{cfaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Define Factors:</strong> Create latent variables (constructs) that you hypothesize exist in your data (e.g., 'Cognitive Ability').</li>
                                <li><strong>Assign Items:</strong> Assign your observed variables (e.g., survey questions) to the corresponding latent factor they are supposed to measure.</li>
                                <li><strong>Run Analysis:</strong> The tool will estimate the model and provide fit indices to evaluate how well your hypothesized model fits the actual data.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Model Fit Indices:</strong> These are crucial for evaluating your model. Good fit is generally indicated by CFI/TLI &gt; .90, and RMSEA/SRMR &lt; .08.
                                </li>
                                <li>
                                    <strong>Factor Loadings:</strong> Standardized estimates showing the correlation between an item and its factor. Values &gt; 0.5 (and ideally &gt; 0.7) are considered strong.
                                </li>
                                <li>
                                    <strong>Convergent & Discriminant Validity:</strong> Check if items for the same factor are highly related (convergent) and if different factors are distinct from one another (discriminant).
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


interface CfaPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CfaPage({ data: initialData, numericHeaders: initialNumericHeaders, allHeaders: initialAllHeaders, onLoadExample }: CfaPageProps) {
    const [view, setView] = useState('intro');
    const [modelSpec, setModelSpec] = useState<{ [key: string]: string[] }>({});
    const [results, setResults] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newFactorName, setNewFactorName] = useState('');
    const { toast } = useToast();
    
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [localData, setLocalData] = useState<DataSet>(initialData);
    const [localNumericHeaders, setLocalNumericHeaders] = useState<string[]>(initialNumericHeaders);
    const [localAllHeaders, setLocalAllHeaders] = useState<string[]>(initialAllHeaders);

    const canRun = useMemo(() => localData.length > 0, [localData]);
    
    const processAndSetData = useCallback((content: string, name: string) => {
        setIsUploading(true);
        try {
            const { headers, data: newData, numericHeaders: newNumHeaders } = parseData(content);
            setLocalData(newData);
            setLocalAllHeaders(headers);
            setLocalNumericHeaders(newNumHeaders);
            setFileName(name);
            toast({ title: 'Success', description: `Loaded "${name}" with ${newData.length} rows.`});
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'File Error', description: error.message });
        } finally {
            setIsUploading(false);
        }
    }, [toast]);
    
    const handleFileSelected = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if(content) {
                 if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(content, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    processAndSetData(csv, file.name);
                 } else {
                    processAndSetData(content as string, file.name);
                 }
            }
        };
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
             reader.readAsBinaryString(file);
        } else {
            reader.readAsText(file);
        }
    }, [processAndSetData]);

    const handleClearData = () => {
        setLocalData([]);
        setLocalAllHeaders([]);
        setLocalNumericHeaders([]);
        setFileName('');
    };

    const handleLoadExampleData = () => {
        const cfaExample = exampleDatasets.find(d => d.id === 'cfa-psych-constructs');
        if (cfaExample) {
            processAndSetData(cfaExample.data, cfaExample.name);
            setView('main');
        }
    }

    useEffect(() => {
        if (canRun) {
             const autoFactors: { [key: string]: string[] } = {};
             localNumericHeaders.forEach(h => {
                const baseName = h.replace(/[_\\d]+$/, ''); // Remove trailing numbers and underscores
                if (!autoFactors[baseName]) autoFactors[baseName] = [];
                autoFactors[baseName].push(h);
             });
             setModelSpec(autoFactors);
             setView('main');
        } else {
            setView('intro');
        }
        setResults(null);
     }, [localData, localNumericHeaders, canRun]);

    const availableVariables = useMemo(() => {
        if (localData.length === 0) return [];
        const usedVariables = Object.values(modelSpec).flat();
        return localNumericHeaders.filter(key => !usedVariables.includes(key));
    }, [localData, modelSpec, localNumericHeaders]);

    const addFactor = () => {
        if (newFactorName.trim() && !modelSpec[newFactorName.trim()]) {
            setModelSpec(prev => ({
                ...prev,
                [newFactorName.trim()]: []
            }));
            setNewFactorName('');
        }
    };

    const removeFactor = (factorName: string) => {
        setModelSpec(prev => {
            const newSpec = { ...prev };
            delete newSpec[factorName];
            return newSpec;
        });
    };

    const assignVariable = (factorName: string, variable: string) => {
        setModelSpec(prev => produce(prev, draft => {
            draft[factorName].push(variable);
        }));
    };

    const removeVariable = (factorName: string, variable: string) => {
        setModelSpec(prev => produce(prev, draft => {
            draft[factorName] = draft[factorName].filter(v => v !== variable);
        }));
    };

    const runAnalysis = useCallback(async () => {
        if (Object.values(modelSpec).some(items => items.length === 0)) {
            toast({ title: "Model Error", description: "Each factor must have at least one assigned variable.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setResults(null);
        try {
             const response = await fetch('/api/analysis/cfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: localData,
                    modelSpec,
                    modelName: "cfa_user_model"
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            setResults(result);

        } catch (error: any) {
             toast({
                title: "CFA Analysis Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [localData, modelSpec, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    const isGoodFit = results?.results?.fit_indices?.cfi && results.results.fit_indices.cfi > 0.9 && results.results.fit_indices.rmsea && results.results.fit_indices.rmsea < 0.08;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
                <DataPreview data={localData} fileName={fileName} headers={localAllHeaders} onDownload={() => unparseData({ headers: localAllHeaders, data: localData})} onClearData={handleClearData} />
            </div>
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">CFA Model Specification</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Define latent factors and assign observed variables.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="New factor name..."
                                value={newFactorName}
                                onChange={(e) => setNewFactorName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addFactor()}
                            />
                            <Button onClick={addFactor} size="sm"><Plus className="w-4 h-4" /></Button>
                        </div>
                        <ScrollArea className="h-72">
                        <div className="space-y-3">
                            {Object.keys(modelSpec).map(factorName => (
                                <Card key={factorName} className="p-3 bg-muted/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-sm">{factorName}</h4>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFactor(factorName)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                    </div>
                                    <div className="min-h-12 border border-dashed rounded-md p-2 space-y-1">
                                        {modelSpec[factorName].map(variable => (
                                            <div key={variable} className="flex justify-between items-center bg-background p-1 rounded text-xs">
                                                <span>{variable}</span>
                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeVariable(factorName, variable)}><Trash2 className="w-3 h-3" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                        </ScrollArea>
                    </div>
                     <div>
                        <Label>Available Variables</Label>
                         <ScrollArea className="h-96 border rounded-md p-2 mt-2">
                             <div className="flex flex-wrap gap-1">
                                {availableVariables.map(variable => (
                                    <Badge key={variable} variant="secondary" className="cursor-pointer" onClick={() => {
                                        const firstFactor = Object.keys(modelSpec)[0];
                                        if (firstFactor) assignVariable(firstFactor, variable);
                                    }}>
                                        {variable}
                                    </Badge>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={runAnalysis} disabled={isLoading || Object.keys(modelSpec).length === 0}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <PlayCircle className="mr-2"/>} Run CFA
                    </Button>
                </CardFooter>
            </Card>

             {isLoading && (
                <Card>
                    <CardContent className="p-6 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="mt-2 text-muted-foreground">Running Confirmatory Factor Analysis...</p>
                    </CardContent>
                </Card>
            )}

            {results && (
                 <div className="space-y-4">
                     <Alert variant={isGoodFit ? 'default' : 'destructive'}>
                        {isGoodFit ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <AlertTitle>{isGoodFit ? "Good Model Fit" : "Poor Model Fit"}</AlertTitle>
                        <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: results.results.interpretation.replace(/\n/g, '<br/>')}} />
                    </Alert>
                    <div className="grid md:grid-cols-2 gap-4">
                         {results.plot && (
                            <Card className="md:col-span-2">
                                <CardHeader><CardTitle>Path Diagram</CardTitle></CardHeader>
                                <CardContent>
                                    <Image src={results.plot} alt="CFA Path Diagram" width={1200} height={800} className="w-full rounded-md border" />
                                </CardContent>
                            </Card>
                        )}
                        <Card className="md:col-span-2">
                            <CardHeader><CardTitle>Parameter Estimates</CardTitle></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-80">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Path</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Estimate</TableHead><TableHead className="text-right">Std. Err</TableHead><TableHead className="text-right">z-value</TableHead><TableHead className="text-right">p-value</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {results.results.estimates.map((est, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{est.lval} {est.op} {est.rval}</TableCell>
                                                    <TableCell>{est.op === '=~' ? 'Loading' : est.op === '~' ? 'Path' : 'Covariance'}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.Estimate?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.Std_Err?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.z_value?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.p_value < 0.001 ? '&lt;.001' : est.p_value?.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

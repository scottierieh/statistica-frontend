
'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    Users,
    Building,
    Star,
    Move
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
import { Checkbox } from '../ui/checkbox';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor, closestCenter } from '@dnd-kit/core';
import { useSortable, SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

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
    fit_indices: CfaFitIndices;
    parameter_estimates: CfaEstimate[];
    adequacy: {
        kmo_overall?: number;
        bartlett_p?: number;
    };
}

interface FullAnalysisResponse {
    results: CfaResults;
    plot: string | null;
}

const ExampleCard: React.FC<{ example: ExampleDataSet; onLoad: (e: ExampleDataSet) => void; }> = ({ example, onLoad }) => {
    const Icon = example.icon;
    return (
        <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoad(example)}>
            <Icon className="mx-auto h-8 w-8 text-primary"/>
            <div>
                <h4 className="font-semibold">{example.name}</h4>
                <p className="text-xs text-muted-foreground">{example.description}</p>
            </div>
        </Card>
    );
};


const IntroPage: React.FC<{ onStart: () => void; onLoadExample: (e: any) => void; }> = ({ onStart, onLoadExample }) => {
    const cfaExample = exampleDatasets.find(d => d.id === 'cfa-psych-constructs');

    const PsychologyIcon = BrainCircuit;
    const ManagementIcon = Building;
    const MarketingIcon = Star;
    const SociologyIcon = Users;

    const iconMap: { [key: string]: React.FC<any> } = {
        Psychology: PsychologyIcon,
        Management: ManagementIcon,
        Marketing: MarketingIcon,
        Sociology: SociologyIcon,
    };
    
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
                    {cfaExample && (
                        <div className="flex justify-center">
                            <ExampleCard example={cfaExample} onLoad={onLoadExample} />
                        </div>
                    )}
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
                                    <strong>Model Fit Indices:</strong> These are crucial for evaluating your model. Good fit is generally indicated by CFI/TLI > .90, and RMSEA/SRMR < .08.
                                </li>
                                <li>
                                    <strong>Factor Loadings:</strong> Standardized estimates showing the correlation between an item and its factor. Values > 0.5 (and ideally > 0.7) are considered strong.
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
            if (newData.length === 0) throw new Error("No data found in file.");
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
            onLoadExample(cfaExample);
            setModelSpec({
                'Cognitive': ['cog1', 'cog2', 'cog3', 'cog4'],
                'Emotional': ['emo1', 'emo2', 'emo3'],
                'Social': ['soc1', 'soc2', 'soc3', 'soc4']
            });
            setView('main');
        }
    };

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

    const assignVariableToFactor = (variable: string, factorName: string | null) => {
        setModelSpec(produce(draft => {
            // Remove variable from any factor it might already be in
            for (const key in draft) {
                draft[key] = draft[key].filter(v => v !== variable);
            }
            // Add to the new factor if one is selected
            if (factorName && draft[factorName]) {
                draft[factorName].push(variable);
            }
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
    
    const isGoodFit = results?.results?.fit_indices?.cfi && results.results.fit_indices.cfi > 0.9 && results.results.fit_indices.rmsea && results.results.fit_indices.rmsea < 0.08;
    const factorForVariable = (variable: string) => Object.keys(modelSpec).find(f => modelSpec[f].includes(variable));
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }

    if (!canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">1. Data</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
                    <DataPreview data={localData} fileName={fileName} headers={localAllHeaders} onDownload={() => unparseData({ headers: localAllHeaders, data: localData})} onClearData={handleClearData} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">2. Define Latent Variables (Factors)</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Input
                        placeholder="New factor name (e.g., Satisfaction)"
                        value={newFactorName}
                        onChange={(e) => setNewFactorName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addFactor()}
                    />
                    <Button onClick={addFactor}><Plus className="w-4 h-4 mr-2" /> Add Factor</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">3. Assign Measurement Variables</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.keys(modelSpec).map(factorName => (
                            <Card key={factorName} className="flex flex-col">
                                <CardHeader className="flex-row items-center justify-between py-2">
                                    <CardTitle className="text-base">{factorName}</CardTitle>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFactor(factorName)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ScrollArea className="h-48 border rounded-md p-2">
                                        <div className="space-y-2">
                                            {localNumericHeaders.map(variable => (
                                                <div key={variable} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`${factorName}-${variable}`} 
                                                        checked={modelSpec[factorName]?.includes(variable)}
                                                        onCheckedChange={(checked) => assignVariableToFactor(variable, checked ? factorName : null)}
                                                        disabled={!!factorForVariable(variable) && !modelSpec[factorName]?.includes(variable)}
                                                    />
                                                    <Label htmlFor={`${factorName}-${variable}`} className="text-sm font-normal">{variable}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={runAnalysis} disabled={isLoading || Object.keys(modelSpec).length === 0}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />} Run CFA
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
                        <AlertDescription className="whitespace-pre-wrap">
                        Based on standard fit indices (e.g., CFI > .90, RMSEA < .08), this model appears to be a {isGoodFit ? 'good' : 'poor'} fit for the data. Review the detailed indices and estimates below.
                        </AlertDescription>
                    </Alert>
                    <div className="grid md:grid-cols-2 gap-4">
                        {results.plot && (
                            <Card className="md:col-span-2">
                                <CardHeader><CardTitle>Path Diagram</CardTitle></CardHeader>
                                <CardContent>
                                    <Image src={`data:image/png;base64,${results.plot}`} alt="CFA Path Diagram" width={1200} height={800} className="w-full rounded-md border bg-white" />
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
                                            {results.results.parameter_estimates.map((est, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{est.lval} {est.op} {est.rval}</TableCell>
                                                    <TableCell>{est.op === '=~' ? 'Loading' : est.op === '~' ? 'Path' : 'Covariance'}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.Estimate?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.Std_Err?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.z_value?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.p_value < 0.001 ? '<.001' : est.p_value?.toFixed(3)}</TableCell>
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


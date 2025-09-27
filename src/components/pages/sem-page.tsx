
'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
    Network, 
    GitBranch, 
    BarChart3, 
    Target, 
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Info,
    MoveRight,
    PlayCircle,
    Plus,
    Trash2,
    ArrowRight,
    Loader2,
    Settings,
    FileSearch,
    BookOpen,
    Users,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { produce } from 'immer';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Image from 'next/image';
import { exampleDatasets } from '@/lib/example-datasets';
import Papa from 'papaparse';

// Type Definitions
interface ModelSpec {
    measurement_model: { [key: string]: string[] };
    structural_model: { from: string; to: string }[];
}

interface FitIndices {
    chi_square: number;
    df: number;
    rmsea: number;
    cfi: number;
    tli: number;
    srmr: number;
    gfi: number;
    agfi: number;
    [key: string]: number;
}

interface SemResults {
    model_name: string;
    model_spec: { desc: string; measurement_model: { [key: string]: string[] } };
    n_observations: number;
    fit_indices: FitIndices;
    estimates: any[];
    factor_scores: any[];
    mean_components: {[key: string]: number}
}

interface FullAnalysisResponse {
    results: SemResults;
    plot: string | null;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (type: string) => void; }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Structural Equation Modeling (SEM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Analyze complex relationships between latent and observed variables to test theoretical models.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use SEM?</h2>
                        <p className="max-w-4xl mx-auto text-muted-foreground">
                            SEM combines factor analysis and path analysis to test complex theoretical models. 
                            It examines measurement models (how well observed variables represent latent constructs) and structural relationships (the paths between constructs) simultaneously.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="cursor-pointer hover:shadow-md" onClick={() => onLoadExample('academic')}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <BookOpen className="w-8 h-8 text-primary"/>
                                <div>
                                    <CardTitle className="text-lg">Academic Achievement Model</CardTitle>
                                    <CardDescription className="text-sm">Test a model where Motivation and Self-Efficacy predict Academic Achievement.</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                         <Card className="cursor-pointer hover:shadow-md" onClick={() => onLoadExample('organizational')}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Users className="w-8 h-8 text-primary"/>
                                <div>
                                    <CardTitle className="text-lg">Organizational Behavior Model</CardTitle>
                                    <CardDescription className="text-sm">Analyze how Leadership impacts Job Satisfaction, which in turn affects Commitment and Performance.</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
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

export default function SEMAnalysisComponent() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [data, setData] = useState<any[]>([]);
    const [datasetType, setDatasetType] = useState('academic');
    const [measurementModel, setMeasurementModel] = useState<{ [key: string]: string[] }>({});
    const [structuralModel, setStructuralModel] = useState<{ from: string, to: string }[]>([]);
    const [results, setResults] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newLatentVar, setNewLatentVar] = useState('');
    const [newPath, setNewPath] = useState<{ from: string, to: string }>({ from: '', to: '' });

    const loadSampleData = useCallback((type: string) => {
        let sampleDataCsv: string | undefined;
        let defaultMeasurement: any, defaultStructural: any[];
        
        if (type === 'academic') {
            sampleDataCsv = exampleDatasets.find(d => d.id === 'sem-satisfaction')?.data;
            defaultMeasurement = { 'Motivation': ['Motivation_1', 'Motivation_2', 'Motivation_3'], 'Efficacy': ['Efficacy_1', 'Efficacy_2', 'Efficacy_3'], 'Achievement': ['Achievement_1', 'Achievement_2', 'Achievement_3'] };
            defaultStructural = [ { from: 'Motivation', to: 'Efficacy' }, { from: 'Motivation', to: 'Achievement' }, { from: 'Efficacy', to: 'Achievement' } ];
        } else { // organizational
            sampleDataCsv = exampleDatasets.find(d => d.id === 'cfa-psych-constructs')?.data;
            defaultMeasurement = { 'Leadership': ['Leadership_1', 'Leadership_2'], 'Job_Satisfaction': ['Job_Satisfaction_1', 'Job_Satisfaction_2'], 'Organizational_Commitment': ['Commitment_1', 'Commitment_2'], 'Job_Performance': ['Performance_1', 'Performance_2'] };
            defaultStructural = [ { from: 'Leadership', to: 'Job_Satisfaction' }, { from: 'Job_Satisfaction', to: 'Organizational_Commitment' }, { from: 'Organizational_Commitment', to: 'Job_Performance' } ];
        }

        if (!sampleDataCsv) {
            toast({ title: "Error", description: "Sample data not found."});
            return;
        }

        const parsed = Papa.parse(sampleDataCsv, { header: true, dynamicTyping: true, skipEmptyLines: true });
        const sampleData = parsed.data;

        setData(sampleData as any[]);
        setMeasurementModel(defaultMeasurement);
        setStructuralModel(defaultStructural);
        setDatasetType(type);
        setView('main');
        toast({title: "Sample Data Loaded", description: `Loaded the ${type} dataset.`});
    }, [toast]);

    const availableVariables = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => key !== 'id' && typeof data[0][key] === 'number');
    }, [data]);
    const usedVariables = useMemo(() => Object.values(measurementModel).flat(), [measurementModel]);
    const latentVariables = useMemo(() => Object.keys(measurementModel), [measurementModel]);

    const addLatentVariable = () => {
        if (newLatentVar.trim() && !measurementModel[newLatentVar.trim()]) {
            setMeasurementModel(prev => ({ ...prev, [newLatentVar.trim()]: [] }));
            setNewLatentVar('');
        }
    };

    const removeLatentVariable = (latentVar: string) => {
        setMeasurementModel(produce(draft => { delete draft[latentVar]; }));
        setStructuralModel(prev => prev.filter(path => path.from !== latentVar && path.to !== latentVar));
    };

    const assignVariable = (latentVar: string, variable: string) => {
        setMeasurementModel(produce(draft => { draft[latentVar].push(variable); }));
    };

    const removeVariable = (latentVar: string, variable: string) => {
        setMeasurementModel(produce(draft => { draft[latentVar] = draft[latentVar].filter(v => v !== variable); }));
    };

    const addStructuralPath = () => {
        if(newPath.from && newPath.to && newPath.from !== newPath.to) {
            if(!structuralModel.find(p => p.from === newPath.from && p.to === newPath.to)) {
                setStructuralModel(prev => [...prev, newPath]);
                setNewPath({ from: '', to: '' });
            }
        }
    };

    const runSEMAnalysis = useCallback(async () => {
        setIsLoading(true);
        setResults(null);
        try {
            const response = await fetch('/api/analysis/sem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, modelSpec: { measurement_model: measurementModel, structural_model: structuralModel } })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setResults(result);
            toast({ title: "Analysis Complete" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, measurementModel, structuralModel, toast]);
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={loadSampleData} />;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">SEM Analysis</h1>
                    <p className="text-gray-600">Structural Equation Modeling</p>
                </div>
                <Button onClick={() => setView('intro')} variant="ghost">
                    <Info className="w-4 h-4 mr-2" /> Help
                </Button>
            </div>

            {data.length > 0 && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Dataset Loaded</AlertTitle>
                    <AlertDescription>
                        {data.length} observations with {availableVariables.length} variables loaded.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Network className="w-5 h-5" /> Model Specification</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <Label className="font-semibold">Measurement Model</Label>
                            
                            <div className="flex gap-2">
                                <Input placeholder="New latent variable..." value={newLatentVar} onChange={(e) => setNewLatentVar(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addLatentVariable()} />
                                <Button onClick={addLatentVariable} size="sm"><Plus className="w-4 h-4" /></Button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {Object.keys(measurementModel).map(latentVar => (
                                    <Card key={latentVar} className="p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-medium text-sm">{latentVar}</h4>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLatentVariable(latentVar)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                        </div>
                                        
                                        <div className="space-y-1 mb-2">
                                            {measurementModel[latentVar].map(variable => (
                                                <div key={variable} className="flex justify-between items-center bg-green-50 p-1 rounded text-xs">
                                                    <span>{variable}</span>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeVariable(latentVar, variable)}><X className="w-3 h-3" /></Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {availableVariables
                                                .filter(v => !usedVariables.includes(v))
                                                .map(variable => (
                                                <Badge key={variable} variant="secondary" className="cursor-pointer hover:bg-green-100 text-xs" onClick={() => assignVariable(latentVar, variable)}>{variable}</Badge>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-semibold">Structural Paths</Label>
                            <div className="flex items-center gap-2">
                                <Select value={newPath.from} onValueChange={v => setNewPath(p => ({...p, from: v}))}>
                                    <SelectTrigger><SelectValue placeholder="From"/></SelectTrigger>
                                    <SelectContent>{latentVariables.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                                <ArrowRight className="w-4 h-4" />
                                <Select value={newPath.to} onValueChange={v => setNewPath(p => ({...p, to: v}))}>
                                    <SelectTrigger><SelectValue placeholder="To"/></SelectTrigger>
                                    <SelectContent>{latentVariables.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                                <Button size="sm" onClick={addStructuralPath}><Plus className="w-4 h-4"/></Button>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
                                {structuralModel.map((path, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm">
                                        <span>{path.from} → {path.to}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStructuralModel(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={runSEMAnalysis} disabled={isLoading || data.length === 0} className="w-full">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                            {isLoading ? 'Running SEM...' : 'Run SEM Analysis'}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Analysis Results</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading && <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /><p className="text-gray-600">Running SEM analysis...</p></div>}
                        
                        {results && !isLoading && (
                             <Tabs defaultValue="diagram" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="diagram">Path Diagram</TabsTrigger>
                                    <TabsTrigger value="estimates">Estimates & Fit</TabsTrigger>
                                </TabsList>
                                <TabsContent value="diagram" className="mt-4">
                                     {results.plot && <Image src={results.plot} alt="SEM Path Diagram" width={800} height={600} className="w-full rounded-md border"/>}
                                </TabsContent>
                                <TabsContent value="estimates" className="mt-4">
                                     <Table>
                                        <TableHeader><TableRow><TableHead>lval</TableHead><TableHead>op</TableHead><TableHead>rval</TableHead><TableHead className="text-right">Estimate</TableHead><TableHead className="text-right">p-value</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {results.results.estimates.map((est, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{est.lval}</TableCell>
                                                    <TableCell>{est.op}</TableCell>
                                                    <TableCell>{est.rval}</TableCell>
                                                    <TableCell className="text-right font-mono">{est.Estimate?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{est['p-value'] < 0.001 ? '<.001' : est['p-value']?.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        )}

                        {!results && !isLoading && <div className="text-center py-12 text-gray-500"><p>Configure your SEM model and run analysis</p></div>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


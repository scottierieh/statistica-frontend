

'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
    Eye,
    Calculator,
    Loader2,
    Bot,
    BrainCircuit,
    Settings,
    FileSearch,
    BookOpen,
    Users
} from 'lucide-react';
import { exampleDatasets } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Image from 'next/image';
import { produce } from 'immer';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// --- Type Definitions ---
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
    factor_scores: { [key: string]: number }[];
    mean_components: { [key: string]: number };
}

interface FullAnalysisResponse {
    results: SemResults;
    plot: string;
}

// --- Intro Page Component ---
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

// --- Main Page Component ---
export default function SEMAnalysisComponent() {
    const [view, setView] = useState('intro');
    const [data, setData] = useState<any[]>([]);
    const [datasetType, setDatasetType] = useState('academic');
    const [measurementModel, setMeasurementModel] = useState<{ [key: string]: string[] }>({});
    const [structuralModel, setStructuralModel] = useState<{ from: string, to: string }[]>([]);
    const [results, setResults] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newLatentVar, setNewLatentVar] = useState('');
    const [newPath, setNewPath] = useState<{ from: string, to: string }>({ from: '', to: '' });

    const { toast } = useToast();

    // Sample Data Generation
    const generateSEMData = (nSamples = 500) => {
        const data = [];
        for (let i = 0; i < nSamples; i++) {
            const motivation = Math.random() * 2 - 1;
            const efficacy = 0.6 * motivation + Math.random() * 0.8 - 0.4;
            const achievement = 0.5 * motivation + 0.7 * efficacy + Math.random() * 0.6 - 0.3;
            const mot1 = 0.8 * motivation + Math.random() * 0.6 - 0.3;
            const mot2 = 0.75 * motivation + Math.random() * 0.6 - 0.3;
            const mot3 = 0.7 * motivation + Math.random() * 0.6 - 0.3;
            const eff1 = 0.85 * efficacy + Math.random() * 0.5 - 0.25;
            const eff2 = 0.78 * efficacy + Math.random() * 0.5 - 0.25;
            const eff3 = 0.72 * efficacy + Math.random() * 0.5 - 0.25;
            const ach1 = 0.9 * achievement + Math.random() * 0.4 - 0.2;
            const ach2 = 0.82 * achievement + Math.random() * 0.4 - 0.2;
            const ach3 = 0.76 * achievement + Math.random() * 0.4 - 0.2;
            data.push({ id: i + 1, Motivation_1: Math.max(1, Math.min(7, Math.round(mot1 * 1.5 + 4))), Motivation_2: Math.max(1, Math.min(7, Math.round(mot2 * 1.5 + 4))), Motivation_3: Math.max(1, Math.min(7, Math.round(mot3 * 1.5 + 4))), Efficacy_1: Math.max(1, Math.min(7, Math.round(eff1 * 1.5 + 4))), Efficacy_2: Math.max(1, Math.min(7, Math.round(eff2 * 1.5 + 4))), Efficacy_3: Math.max(1, Math.min(7, Math.round(eff3 * 1.5 + 4))), Achievement_1: Math.max(1, Math.min(7, Math.round(ach1 * 1.5 + 4))), Achievement_2: Math.max(1, Math.min(7, Math.round(ach2 * 1.5 + 4))), Achievement_3: Math.max(1, Math.min(7, Math.round(ach3 * 1.5 + 4))) });
        }
        return data;
    };
    const generateOrganizationalSEMData = (nSamples = 400) => {
        const data = [];
        for (let i = 0; i < nSamples; i++) {
            const leadership = Math.random() * 2 - 1;
            const jobSatisfaction = 0.7 * leadership + Math.random() * 0.7 - 0.35;
            const commitment = 0.5 * leadership + 0.6 * jobSatisfaction + Math.random() * 0.6 - 0.3;
            const performance = 0.4 * jobSatisfaction + 0.8 * commitment + Math.random() * 0.5 - 0.25;
            const lead1 = 0.85 * leadership + Math.random() * 0.5 - 0.25;
            const lead2 = 0.78 * leadership + Math.random() * 0.5 - 0.25;
            const lead3 = 0.72 * leadership + Math.random() * 0.5 - 0.25;
            const sat1 = 0.82 * jobSatisfaction + Math.random() * 0.6 - 0.3;
            const sat2 = 0.75 * jobSatisfaction + Math.random() * 0.6 - 0.3;
            const sat3 = 0.69 * jobSatisfaction + Math.random() * 0.6 - 0.3;
            const com1 = 0.88 * commitment + Math.random() * 0.4 - 0.2;
            const com2 = 0.81 * commitment + Math.random() * 0.4 - 0.2;
            const com3 = 0.74 * commitment + Math.random() * 0.4 - 0.2;
            const perf1 = 0.86 * performance + Math.random() * 0.5 - 0.25;
            const perf2 = 0.79 * performance + Math.random() * 0.5 - 0.25;
            data.push({ id: i + 1, Leadership_1: Math.max(1, Math.min(7, Math.round(lead1 * 1.5 + 4))), Leadership_2: Math.max(1, Math.min(7, Math.round(lead2 * 1.5 + 4))), Leadership_3: Math.max(1, Math.min(7, Math.round(lead3 * 1.5 + 4))), Job_Satisfaction_1: Math.max(1, Math.min(7, Math.round(sat1 * 1.5 + 4))), Job_Satisfaction_2: Math.max(1, Math.min(7, Math.round(sat2 * 1.5 + 4))), Job_Satisfaction_3: Math.max(1, Math.min(7, Math.round(sat3 * 1.5 + 4))), Commitment_1: Math.max(1, Math.min(7, Math.round(com1 * 1.5 + 4))), Commitment_2: Math.max(1, Math.min(7, Math.round(com2 * 1.5 + 4))), Commitment_3: Math.max(1, Math.min(7, Math.round(com3 * 1.5 + 4))), Performance_1: Math.max(1, Math.min(7, Math.round(perf1 * 1.5 + 4))), Performance_2: Math.max(1, Math.min(7, Math.round(perf2 * 1.5 + 4))) });
        }
        return data;
    };

    const loadSampleData = useCallback((type: string) => {
        let sampleData, defaultMeasurement, defaultStructural;
        
        if (type === 'academic') {
            sampleData = generateSEMData(500);
            defaultMeasurement = {
                'Learning_Motivation': ['Motivation_1', 'Motivation_2', 'Motivation_3'],
                'Self_Efficacy': ['Efficacy_1', 'Efficacy_2', 'Efficacy_3'],
                'Academic_Achievement': ['Achievement_1', 'Achievement_2', 'Achievement_3']
            };
            defaultStructural = [
                { from: 'Learning_Motivation', to: 'Self_Efficacy' },
                { from: 'Learning_Motivation', to: 'Academic_Achievement' },
                { from: 'Self_Efficacy', to: 'Academic_Achievement' }
            ];
        } else {
            sampleData = generateOrganizationalSEMData(400);
            defaultMeasurement = {
                'Leadership': ['Leadership_1', 'Leadership_2', 'Leadership_3'],
                'Job_Satisfaction': ['Job_Satisfaction_1', 'Job_Satisfaction_2', 'Job_Satisfaction_3'],
                'Organizational_Commitment': ['Commitment_1', 'Commitment_2', 'Commitment_3'],
                'Job_Performance': ['Performance_1', 'Performance_2']
            };
            defaultStructural = [
                { from: 'Leadership', to: 'Job_Satisfaction' },
                { from: 'Job_Satisfaction', to: 'Organizational_Commitment' },
                { from: 'Organizational_Commitment', to: 'Job_Performance' }
            ];
        }
        
        setData(sampleData);
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
        setMeasurementModel(prev => {
            const newModel = { ...prev };
            delete newModel[latentVar];
            return newModel;
        });
        setStructuralModel(prev => prev.filter(path => path.from !== latentVar && path.to !== latentVar));
    };

    const assignVariable = (latentVar: string, variable: string) => {
        setMeasurementModel(prev => ({ ...prev, [latentVar]: [...prev[latentVar], variable] }));
    };

    const removeVariable = (latentVar: string, variable: string) => {
        setMeasurementModel(produce(draft => {
            draft[latentVar] = draft[latentVar].filter(v => v !== variable);
        }));
    };

    const addStructuralPath = () => {
        if(newPath.from && newPath.to && newPath.from !== newPath.to) {
            if(!structuralModel.find(p => p.from === newPath.from && p.to === newPath.to)) {
                setStructuralModel(prev => [...prev, newPath]);
                setNewPath({ from: '', to: '' });
            }
        }
    }

    const runSEMAnalysis = useCallback(async () => {
        setIsLoading(true);
        setResults(null);
        try {
            const response = await fetch('/api/analysis/sem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    modelSpec: {
                        measurement_model: measurementModel,
                        structural_model: structuralModel
                    }
                })
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

    const interpretFit = (fitIndices: FitIndices) => {
        const { rmsea, cfi, srmr } = fitIndices;
        let interpretation: string[] = [];

        if (rmsea < 0.05) interpretation.push("RMSEA indicates excellent fit.");
        else if (rmsea < 0.08) interpretation.push("RMSEA indicates acceptable fit.");
        else interpretation.push("RMSEA indicates poor fit.");

        if (cfi > 0.95) interpretation.push("CFI indicates excellent fit.");
        else if (cfi > 0.90) interpretation.push("CFI indicates acceptable fit.");
        else interpretation.push("CFI indicates poor fit.");

        if (srmr < 0.08) interpretation.push("SRMR indicates good fit.");
        else interpretation.push("SRMR indicates poor fit.");

        return interpretation;
    };
    
    if (view === 'intro') {
        return <IntroPage onStart={() => {
            setData([]);
            setMeasurementModel({});
            setStructuralModel([]);
            setResults(null);
            setView('main');
        }} onLoadExample={loadSampleData} />;
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
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="w-5 h-5" />
                            Model Specification
                        </CardTitle>
                    </CardHeader>
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
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeVariable(latentVar, variable)}><Trash2 className="w-2 h-2" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {availableVariables.filter(v => !usedVariables.includes(v)).map(variable => (
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
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Running SEM...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <PlayCircle className="w-4 h-4" />
                                    Run SEM Analysis
                                </div>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> Analysis Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /><p>Running SEM analysis...</p></div>}
                        {results && !isLoading && (
                            <Tabs defaultValue="diagram" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="diagram">Path Diagram</TabsTrigger>
                                    <TabsTrigger value="fit">Model Fit</TabsTrigger>
                                    <TabsTrigger value="scores">Factor Scores</TabsTrigger>
                                </TabsList>
                                <TabsContent value="diagram" className="mt-4">
                                    {results.plot ? <Image src={results.plot} alt="SEM Path Diagram" width={500} height={400} className="w-full rounded-md border" /> : <p>Could not generate diagram.</p>}
                                </TabsContent>
                                <TabsContent value="fit" className="mt-4">
                                    <div className="space-y-3">
                                        <h4 className="font-semibold">Fit Indices</h4>
                                        {results.results.fit_indices && Object.entries(results.results.fit_indices).map(([index, value]) => (
                                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <span className="font-medium">{index.replace(/_/g, ' ').toUpperCase()}</span>
                                                <Badge variant="secondary">{typeof value === 'number' ? (value as number).toFixed(3) : value as any}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded mt-4">
                                        <h5 className="font-semibold mb-2">Interpretation</h5>
                                        <ul className="text-sm space-y-1">
                                            {interpretFit(results.results.fit_indices).map((item, idx) => (
                                                <li key={idx} className="flex items-center gap-2">
                                                    {item.includes('Excellent') ? 
                                                        <CheckCircle className="w-3 h-3 text-green-600" /> :
                                                        item.includes('Acceptable') ?
                                                        <AlertTriangle className="w-3 h-3 text-yellow-600" /> :
                                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                                    }
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </TabsContent>
                                 <TabsContent value="scores" className="mt-4">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead className="text-right">Mean Factor Score</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                        {results.results.mean_components && Object.entries(results.results.mean_components).map(([factor, mean]) => (
                                            <TableRow key={factor}>
                                                <TableCell>{factor}</TableCell>
                                                <TableCell className="text-right font-mono">{(mean as number).toFixed(4)}</TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        )}
                        {!results && !isLoading && (
                            <div className="text-center py-12 text-gray-500">
                                <Network className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>Configure your SEM model and run analysis</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


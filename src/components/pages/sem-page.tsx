
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    Settings,
    FileSearch,
    BrainCircuit,
    Users,
    Star,
    Building,
    HelpCircle,
    Loader2
} from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { produce } from 'immer';
import Image from 'next/image';
import type { DataSet } from '@/lib/stats';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SemResults {
    model_name: string;
    n_observations: number;
    fit_indices: any;
    estimates: any[];
    interpretation: string;
    model: any; 
    factor_scores: any[];
    mean_components: any;
}

interface FullAnalysisResponse {
    results: SemResults;
    plot: string | null;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (type: 'academic') => void }) => {
    
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
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Structural Equation Modeling (SEM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Analyze complex relationships between latent and observed variables by combining factor analysis and multiple regression.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use SEM?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            SEM is a versatile statistical technique that allows researchers to test complex theoretical models. It simultaneously models relationships between multiple independent and dependent variables, both observed and unobserved (latent), providing a more holistic view of the data's structure than running separate analyses.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <Target className="text-primary"/> Measurement Model
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li>Confirmatory Factor Analysis</li>
                                <li>Factor loadings estimation</li>
                                <li>Reliability assessment</li>
                                <li>Validity evaluation</li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <GitBranch className="text-primary"/> Structural Model
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li>Path coefficients</li>
                                <li>Direct effects</li>
                                <li>Indirect effects</li>
                                <li>R² values</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">Key Application Areas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            {Object.entries(iconMap).map(([area, IconComponent]) => (
                                <div key={area} className="p-4 bg-muted/50 rounded-lg space-y-2">
                                    <IconComponent className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{area}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {
                                                {
                                                    Psychology: "Testing theories of personality and intelligence.",
                                                    Management: "Modeling job satisfaction and performance.",
                                                    Marketing: "Understanding brand loyalty and purchase intent.",
                                                    Sociology: "Analyzing social support and well-being models."
                                                }[area]
                                            }
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     <Button variant="outline" onClick={() => onLoadExample('academic')}>Load Academic Example</Button>
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


interface SemPageProps {
    data: DataSet;
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SemPage({ data, onLoadExample }: SemPageProps) {
    const [view, setView] = useState('intro');
    const [measurementModel, setMeasurementModel] = useState<Record<string, string[]>>({});
    const [structuralModel, setStructuralModel] = useState<{ from: string; to: string }[]>([]);
    const [results, setResults] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newLatentVar, setNewLatentVar] = useState('');
    const [pathFrom, setPathFrom] = useState('');
    const [pathTo, setPathTo] = useState('');
    const { toast } = useToast();

    const addLatentVariable = () => {
        if (newLatentVar.trim() && !measurementModel[newLatentVar]) {
            setMeasurementModel(prev => ({
                ...prev,
                [newLatentVar.trim()]: []
            }));
            setNewLatentVar('');
        }
    };
    
    const addStructuralPath = () => {
        if (pathFrom && pathTo && pathFrom !== pathTo) {
            setStructuralModel(prev => [...prev, { from: pathFrom, to: pathTo }]);
            setPathFrom('');
            setPathTo('');
        }
    };
    
    const runAnalysis = useCallback(async () => {
        setIsLoading(true);
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
            if (!response.ok) throw new Error('Analysis failed');
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setResults(result);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [data, measurementModel, structuralModel, toast]);

    const handleLoadExample = () => {
        const semExample = exampleDatasets.find(d => d.id === 'sem-satisfaction');
        if (semExample) {
            onLoadExample(semExample);
            setMeasurementModel({
                'Quality': ['sq1', 'sq2', 'sq3'],
                'Satisfaction': ['sat1', 'sat2', 'sat3'],
                'Trust': ['trust1', 'trust2'],
                'Loyalty': ['loy1', 'loy2', 'loy3']
            });
            setStructuralModel([
                { from: 'Quality', to: 'Satisfaction' },
                { from: 'Satisfaction', to: 'Trust' },
                { from: 'Trust', to: 'Loyalty' }
            ]);
            setView('main');
        }
    };
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExample} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Structural Equation Modeling</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="font-semibold">Measurement Model (Factors)</Label>
                            <div className="flex gap-2">
                                <Input placeholder="New latent variable..." value={newLatentVar} onChange={(e) => setNewLatentVar(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addLatentVariable()} />
                                <Button onClick={addLatentVariable} size="sm"><Plus className="w-4 h-4" /></Button>
                            </div>
                            <ScrollArea className="h-40 border rounded-lg p-2">
                                {Object.keys(measurementModel).length === 0 ? <p className="text-muted-foreground text-sm p-2">Add latent variables to begin.</p> :
                                Object.keys(measurementModel).map(lv => (
                                    <div key={lv} className="mb-2"><Badge>{lv}</Badge> <span className="text-xs text-muted-foreground">{measurementModel[lv].join(', ')}</span></div>
                                ))
                                }
                            </ScrollArea>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-semibold">Structural Model (Paths)</Label>
                             <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                               <Select onValueChange={setPathFrom} value={pathFrom}><SelectTrigger><SelectValue placeholder="From..." /></SelectTrigger><SelectContent>{Object.keys(measurementModel).map(lv => <SelectItem key={lv} value={lv}>{lv}</SelectItem>)}</SelectContent></Select>
                               <ArrowRight className="w-4 h-4 text-muted-foreground" />
                               <Select onValueChange={setPathTo} value={pathTo}><SelectTrigger><SelectValue placeholder="To..." /></SelectTrigger><SelectContent>{Object.keys(measurementModel).map(lv => <SelectItem key={lv} value={lv}>{lv}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <Button onClick={addStructuralPath} size="sm" className="w-full">Add Path</Button>
                             <ScrollArea className="h-24 border rounded-lg p-2">
                                {structuralModel.map((path, i) => <div key={i}>{path.from} → {path.to}</div>)}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={runAnalysis} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2"/> : <PlayCircle className="w-4 h-4 mr-2" />}
                        Run SEM Analysis
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> <p>Running SEM...</p></CardContent></Card>}

            {results && (
                <Tabs defaultValue="diagram" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="diagram">Path Diagram</TabsTrigger>
                        <TabsTrigger value="fit">Model Fit & Estimates</TabsTrigger>
                    </TabsList>
                    <TabsContent value="diagram" className="mt-4">
                        <Card>
                            <CardContent className="p-4">
                                {results.plot ? <Image src={`data:image/png;base64,${results.plot}`} alt="SEM Path Diagram" width={1000} height={800} className="w-full rounded-md border bg-white" /> : "Path diagram could not be generated."}
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="fit" className="mt-4">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader><CardTitle>Model Fit Indices</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        {Object.entries(results.results.fit_indices).slice(0, 8).map(([key, value]) => (
                                            <div key={key} className="p-2 bg-muted rounded-md">
                                                <div className="font-semibold text-muted-foreground">{key.toUpperCase()}</div>
                                                <div className="text-lg font-mono">{(value as number)?.toFixed(3)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Parameter Estimates</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-80">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Path</TableHead><TableHead>Estimate</TableHead><TableHead>Std.Err</TableHead><TableHead>z-value</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {results.results.estimates.map((est, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{est.lval} {est.op} {est.rval}</TableCell>
                                                    <TableCell className="font-mono">{est.Estimate?.toFixed(3)}</TableCell>
                                                    <TableCell className="font-mono">{est.Std_Err?.toFixed(3)}</TableCell>
                                                    <TableCell className="font-mono">{est.z_value?.toFixed(2)}</TableCell>
                                                    <TableCell className="font-mono">{est.p_value < 0.001 ? '<.001' : est.p_value?.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}


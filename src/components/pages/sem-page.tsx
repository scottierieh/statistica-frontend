
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    Eye,
    Calculator,
    BrainCircuit,
    Building,
    Star,
    Users,
    Settings,
    FileSearch,
    BarChart as BarChartIcon
} from 'lucide-react';
import Image from 'next/image';


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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (type: 'academic' | 'organizational') => void }) => {
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

export default function SEMAnalysisComponent() {
    const [view, setView] = useState('main'); // Set to 'main' to skip intro for now
    const [data, setData] = useState<any[]>([]);
    const [datasetType, setDatasetType] = useState('academic');
    const [measurementModel, setMeasurementModel] = useState<Record<string, string[]>>({});
    const [structuralModel, setStructuralModel] = useState<{ from: string; to: string }[]>([]);
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newLatentVar, setNewLatentVar] = useState('');
    const [pathFrom, setPathFrom] = useState('');
    const [pathTo, setPathTo] = useState('');

    const runSEMAnalysis = useCallback(async () => {
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
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [data, measurementModel, structuralModel]);

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
    
    // Auto-load sample data on component mount for demonstration
    useEffect(() => {
        // Mock data loading
        const sampleData = [ { "id": 1, "Motivation_1": 4, "Motivation_2": 5, "Motivation_3": 5, "Efficacy_1": 4, "Efficacy_2": 4, "Efficacy_3": 3, "Achievement_1": 4, "Achievement_2": 4, "Achievement_3": 4 }];
        const defaultMeasurement = {
            'Learning_Motivation': ['Motivation_1', 'Motivation_2', 'Motivation_3'],
            'Self_Efficacy': ['Efficacy_1', 'Efficacy_2', 'Efficacy_3'],
            'Academic_Achievement': ['Achievement_1', 'Achievement_2', 'Achievement_3']
        };
        const defaultStructural = [
            { from: 'Learning_Motivation', to: 'Self_Efficacy' },
            { from: 'Learning_Motivation', to: 'Academic_Achievement' },
            { from: 'Self_Efficacy', to: 'Academic_Achievement' }
        ];
        setData(sampleData);
        setMeasurementModel(defaultMeasurement);
        setStructuralModel(defaultStructural);
    }, []);
    
     const usedVariables = useMemo(() => {
        return Object.values(measurementModel).flat();
    }, [measurementModel]);
    
    const availableVariables = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => key !== 'id' && typeof data[0][key] === 'number' && !usedVariables.includes(key));
    }, [data, usedVariables]);

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={() => {}} />;
    }
    
    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">SEM Analysis</h1>
                    <p className="text-gray-600">Structural Equation Modeling</p>
                </div>
            </div>

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
                            <Label className="font-semibold">Measurement Model (Factors)</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="New latent variable..."
                                    value={newLatentVar}
                                    onChange={(e) => setNewLatentVar(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addLatentVariable()}
                                />
                                <Button onClick={addLatentVariable} size="sm"><Plus className="w-4 h-4" /></Button>
                            </div>
                            <div className="space-y-2">
                                {Object.keys(measurementModel).map(latentVar => (
                                    <div key={latentVar}>
                                        <div className="font-medium text-sm">{latentVar}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                             {measurementModel[latentVar].map(variable => (
                                                <Badge key={variable} variant="secondary">{variable}</Badge>
                                             ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="font-semibold">Structural Model (Paths)</Label>
                            <div className="grid grid-cols-2 gap-2">
                               <Select onValueChange={setPathFrom} value={pathFrom}><SelectTrigger><SelectValue placeholder="From..." /></SelectTrigger><SelectContent>{Object.keys(measurementModel).map(lv => <SelectItem key={lv} value={lv}>{lv}</SelectItem>)}</SelectContent></Select>
                               <Select onValueChange={setPathTo} value={pathTo}><SelectTrigger><SelectValue placeholder="To..." /></SelectTrigger><SelectContent>{Object.keys(measurementModel).map(lv => <SelectItem key={lv} value={lv}>{lv}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <Button onClick={addStructuralPath} size="sm" className="w-full">Add Path</Button>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button 
                            onClick={runSEMAnalysis} 
                            disabled={isLoading || data.length === 0}
                            className="w-full"
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2"/> : <PlayCircle className="w-4 h-4 mr-2" />}
                            Run SEM Analysis
                        </Button>
                    </CardFooter>
                </Card>
                
                 {results && !isLoading && (
                    <Tabs defaultValue="diagram" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="diagram">Path Diagram</TabsTrigger>
                            <TabsTrigger value="fit">Model Fit</TabsTrigger>
                        </TabsList>
                        <TabsContent value="diagram">
                            <Card>
                                <CardHeader><CardTitle>Path Diagram</CardTitle></CardHeader>
                                <CardContent>
                                    {results.plot ? (
                                        <Image src={results.plot} alt="SEM Path Diagram" width={800} height={600} className="w-full h-auto rounded-md border bg-white" />
                                    ) : (
                                        <div className="text-center text-muted-foreground p-8">Path diagram could not be generated. Please ensure Graphviz is installed on the server.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="fit">
                             <Card>
                                <CardHeader><CardTitle>Model Fit Indices</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                    {Object.entries(results.fit_indices).map(([key, value]) => (
                                        <div key={key} className="flex justify-between p-2 rounded-md bg-muted/50">
                                            <span className="font-medium text-muted-foreground">{key.toUpperCase()}</span>
                                            <span className="font-mono">{(value as number).toFixed(3)}</span>
                                        </div>
                                    ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}

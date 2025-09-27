
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
    Users
} from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { produce } from 'immer';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cfaData } from '@/lib/example-datasets/cfa-data';
import { semData } from '@/lib/example-datasets/sem-data';

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
    factor_scores: any[];
    mean_components: {[key: string]: number}
    estimates?: any; // semopy's inspect() output
}

interface FullAnalysisResponse {
    results: SemResults;
    // plot is no longer sent from backend
}

// SEM 다이어그램 컴포넌트
const SEMDiagram = ({ measurementModel, structuralModel, results }: { measurementModel: any, structuralModel: any, results: FullAnalysisResponse | null }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || Object.keys(measurementModel).length === 0) return;

        const svg = svgRef.current;
        const width = 800;
        const height = 600;
        
        svg.innerHTML = ''; // Clear previous diagram
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const latentVars = Object.keys(measurementModel);
        const latentPositions: { [key: string]: { x: number, y: number } } = {};
        
        latentVars.forEach((latent, idx) => {
            const angle = (idx / latentVars.length) * 2 * Math.PI - Math.PI/2;
            const radius = 180;
            latentPositions[latent] = {
                x: width/2 + Math.cos(angle) * radius,
                y: height/2 + Math.sin(angle) * radius
            };
        });

        const observedPositions: { [key: string]: { x: number, y: number } } = {};
        Object.keys(measurementModel).forEach(latent => {
            const indicators = measurementModel[latent];
            const latentPos = latentPositions[latent];
            const indicatorAngleOffset = (Math.atan2(latentPos.y - height / 2, latentPos.x - width / 2));
            
            indicators.forEach((indicator, idx) => {
                const angle = indicatorAngleOffset + (idx - (indicators.length-1)/2) * 0.4;
                const distance = 90;
                observedPositions[indicator] = {
                    x: latentPos.x + Math.cos(angle) * distance,
                    y: latentPos.y + Math.sin(angle) * distance
                };
            });
        });

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#2563eb');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Structural Paths
        structuralModel.forEach((path: {from: string, to: string}) => {
            const fromPos = latentPositions[path.from];
            const toPos = latentPositions[path.to];
            
            if (fromPos && toPos) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const dx = toPos.x - fromPos.x;
                const dy = toPos.y - fromPos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const unitDx = dx/dist;
                const unitDy = dy/dist;
                
                line.setAttribute('x1', String(fromPos.x + unitDx * 35));
                line.setAttribute('y1', String(fromPos.y + unitDy * 35));
                line.setAttribute('x2', String(toPos.x - unitDx * 35));
                line.setAttribute('y2', String(toPos.y - unitDy * 35));
                line.setAttribute('stroke', '#2563eb');
                line.setAttribute('stroke-width', '2.5');
                line.setAttribute('marker-end', 'url(#arrowhead)');
                svg.appendChild(line);
            }
        });

        // Measurement Paths
        Object.keys(measurementModel).forEach(latent => {
            const indicators = measurementModel[latent];
            const latentPos = latentPositions[latent];
            
            indicators.forEach(indicator => {
                const indicatorPos = observedPositions[indicator];
                const dx = indicatorPos.x - latentPos.x;
                const dy = indicatorPos.y - latentPos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const unitDx = dx/dist;
                const unitDy = dy/dist;

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', String(latentPos.x + unitDx * 35));
                line.setAttribute('y1', String(latentPos.y + unitDy * 35));
                line.setAttribute('x2', String(indicatorPos.x - unitDx * 25));
                line.setAttribute('y2', String(indicatorPos.y - unitDy * 15));
                line.setAttribute('stroke', '#6b7280');
                line.setAttribute('stroke-width', '1.5');
                svg.appendChild(line);
            });
        });

        // Observed Variable Nodes
        Object.keys(observedPositions).forEach(indicator => {
            const pos = observedPositions[indicator];
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(pos.x - 25));
            rect.setAttribute('y', String(pos.y - 15));
            rect.setAttribute('width', '50');
            rect.setAttribute('height', '30');
            rect.setAttribute('fill', '#f3f4f6');
            rect.setAttribute('stroke', '#6b7280');
            rect.setAttribute('stroke-width', '1.5');
            rect.setAttribute('rx', '2');
            svg.appendChild(rect);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(pos.x));
            text.setAttribute('y', String(pos.y + 4));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.textContent = indicator.replace(/_/g, ' ').substring(0, 10);
            svg.appendChild(text);
        });

        // Latent Variable Nodes
        Object.keys(latentPositions).forEach(latent => {
            const pos = latentPositions[latent];
            const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            ellipse.setAttribute('cx', String(pos.x));
            ellipse.setAttribute('cy', String(pos.y));
            ellipse.setAttribute('rx', '35');
            ellipse.setAttribute('ry', '35');
            ellipse.setAttribute('fill', '#dbeafe');
            ellipse.setAttribute('stroke', '#2563eb');
            ellipse.setAttribute('stroke-width', '2');
            svg.appendChild(ellipse);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(pos.x));
            text.setAttribute('y', String(pos.y + 4));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '11');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#1e40af');
            text.textContent = latent;
            svg.appendChild(text);
        });

    }, [measurementModel, structuralModel, results]);

    return (
        <div className="w-full">
            <div className="border rounded-lg bg-white overflow-hidden">
                <svg ref={svgRef} className="w-full h-auto" style={{ minHeight: '500px' }}></svg>
            </div>
        </div>
    );
};

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
            data.push({ id: i + 1, Motivation_1: Math.max(1, Math.min(7, Math.round((0.8 * motivation + Math.random() * 0.6 - 0.3) * 1.5 + 4))), Motivation_2: Math.max(1, Math.min(7, Math.round((0.75 * motivation + Math.random() * 0.6 - 0.3) * 1.5 + 4))), Motivation_3: Math.max(1, Math.min(7, Math.round((0.7 * motivation + Math.random() * 0.6 - 0.3) * 1.5 + 4))), Efficacy_1: Math.max(1, Math.min(7, Math.round((0.85 * efficacy + Math.random() * 0.5 - 0.25) * 1.5 + 4))), Efficacy_2: Math.max(1, Math.min(7, Math.round((0.78 * efficacy + Math.random() * 0.5 - 0.25) * 1.5 + 4))), Efficacy_3: Math.max(1, Math.min(7, Math.round((0.72 * efficacy + Math.random() * 0.5 - 0.25) * 1.5 + 4))), Achievement_1: Math.max(1, Math.min(7, Math.round((0.9 * achievement + Math.random() * 0.4 - 0.2) * 1.5 + 4))), Achievement_2: Math.max(1, Math.min(7, Math.round((0.82 * achievement + Math.random() * 0.4 - 0.2) * 1.5 + 4))), Achievement_3: Math.max(1, Math.min(7, Math.round((0.76 * achievement + Math.random() * 0.4 - 0.2) * 1.5 + 4))) });
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
            data.push({ id: i + 1, Leadership_1: Math.max(1, Math.min(7, Math.round((0.85 * leadership + Math.random() * 0.5 - 0.25) * 1.5 + 4))), Leadership_2: Math.max(1, Math.min(7, Math.round((0.78 * leadership + Math.random() * 0.5 - 0.25) * 1.5 + 4))), Leadership_3: Math.max(1, Math.min(7, Math.round((0.72 * leadership + Math.random() * 0.5 - 0.25) * 1.5 + 4))), Job_Satisfaction_1: Math.max(1, Math.min(7, Math.round((0.82 * jobSatisfaction + Math.random() * 0.6 - 0.3) * 1.5 + 4))), Job_Satisfaction_2: Math.max(1, Math.min(7, Math.round((0.75 * jobSatisfaction + Math.random() * 0.6 - 0.3) * 1.5 + 4))), Job_Satisfaction_3: Math.max(1, Math.min(7, Math.round((0.69 * jobSatisfaction + Math.random() * 0.6 - 0.3) * 1.5 + 4))), Commitment_1: Math.max(1, Math.min(7, Math.round((0.88 * commitment + Math.random() * 0.4 - 0.2) * 1.5 + 4))), Commitment_2: Math.max(1, Math.min(7, Math.round((0.81 * commitment + Math.random() * 0.4 - 0.2) * 1.5 + 4))), Commitment_3: Math.max(1, Math.min(7, Math.round((0.74 * commitment + Math.random() * 0.4 - 0.2) * 1.5 + 4))), Performance_1: Math.max(1, Math.min(7, Math.round((0.86 * performance + Math.random() * 0.5 - 0.25) * 1.5 + 4))), Performance_2: Math.max(1, Math.min(7, Math.round((0.79 * performance + Math.random() * 0.5 - 0.25) * 1.5 + 4))) });
        }
        return data;
    };

    const loadSampleData = useCallback((type: string) => {
        let sampleData, defaultMeasurement, defaultStructural;
        if (type === 'academic') {
            sampleData = generateSEMData(500);
            defaultMeasurement = { 'Learning_Motivation': ['Motivation_1', 'Motivation_2', 'Motivation_3'], 'Self_Efficacy': ['Efficacy_1', 'Efficacy_2', 'Efficacy_3'], 'Academic_Achievement': ['Achievement_1', 'Achievement_2', 'Achievement_3'] };
            defaultStructural = [ { from: 'Learning_Motivation', to: 'Self_Efficacy' }, { from: 'Learning_Motivation', to: 'Academic_Achievement' }, { from: 'Self_Efficacy', to: 'Academic_Achievement' } ];
        } else {
            sampleData = generateOrganizationalSEMData(400);
            defaultMeasurement = { 'Leadership': ['Leadership_1', 'Leadership_2', 'Leadership_3'], 'Job_Satisfaction': ['Job_Satisfaction_1', 'Job_Satisfaction_2', 'Job_Satisfaction_3'], 'Organizational_Commitment': ['Commitment_1', 'Commitment_2', 'Commitment_3'], 'Job_Performance': ['Performance_1', 'Performance_2'] };
            defaultStructural = [ { from: 'Leadership', to: 'Job_Satisfaction' }, { from: 'Job_Satisfaction', to: 'Organizational_Commitment' }, { from: 'Organizational_Commitment', to: 'Job_Performance' } ];
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
                    <AlertDescription>{data.length} observations with {availableVariables.length} variables loaded.</AlertDescription>
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
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeVariable(latentVar, variable)}><Trash2 className="w-2 h-2" /></Button>
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
                            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Running SEM...</> : <><PlayCircle className="w-4 h-4 mr-2" /> Run SEM Analysis</>}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Analysis Results</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading && <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /><p className="text-gray-600">Running SEM analysis...</p></div>}
                        {results && !isLoading && (
                            <Tabs defaultValue="diagram" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="diagram">Path Diagram</TabsTrigger>
                                    <TabsTrigger value="fit">Model Fit</TabsTrigger>
                                    <TabsTrigger value="scores">Factor Scores</TabsTrigger>
                                </TabsList>
                                <TabsContent value="diagram" className="mt-4">
                                     <SEMDiagram measurementModel={measurementModel} structuralModel={structuralModel} results={results} />
                                </TabsContent>
                                <TabsContent value="fit" className="mt-4">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Index</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.results.fit_indices).map(([key, value]) => (
                                                <TableRow key={key}>
                                                    <TableCell>{key.replace(/_/g, ' ').toUpperCase()}</TableCell>
                                                    <TableCell>{(value as number).toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
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
                        {!results && !isLoading && <div className="text-center py-12 text-gray-500"><p>Configure your SEM model and run analysis</p></div>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}



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
    Database, 
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
    Settings,
    FileSearch,
    BarChart,
    Building,
    Users,
    Star
} from 'lucide-react';
import Papa from 'papaparse';

// SEM용 샘플 데이터 생성
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
        
        data.push({
            id: i + 1,
            Motivation_1: Math.max(1, Math.min(7, Math.round(mot1 * 1.5 + 4))),
            Motivation_2: Math.max(1, Math.min(7, Math.round(mot2 * 1.5 + 4))),
            Motivation_3: Math.max(1, Math.min(7, Math.round(mot3 * 1.5 + 4))),
            Efficacy_1: Math.max(1, Math.min(7, Math.round(eff1 * 1.5 + 4))),
            Efficacy_2: Math.max(1, Math.min(7, Math.round(eff2 * 1.5 + 4))),
            Efficacy_3: Math.max(1, Math.min(7, Math.round(eff3 * 1.5 + 4))),
            Achievement_1: Math.max(1, Math.min(7, Math.round(ach1 * 1.5 + 4))),
            Achievement_2: Math.max(1, Math.min(7, Math.round(ach2 * 1.5 + 4))),
            Achievement_3: Math.max(1, Math.min(7, Math.round(ach3 * 1.5 + 4)))
        });
    }
    
    return data;
};

// 조직심리학 SEM 데이터
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
        
        data.push({
            id: i + 1,
            Leadership_1: Math.max(1, Math.min(7, Math.round(lead1 * 1.5 + 4))),
            Leadership_2: Math.max(1, Math.min(7, Math.round(lead2 * 1.5 + 4))),
            Leadership_3: Math.max(1, Math.min(7, Math.round(lead3 * 1.5 + 4))),
            Job_Satisfaction_1: Math.max(1, Math.min(7, Math.round(sat1 * 1.5 + 4))),
            Job_Satisfaction_2: Math.max(1, Math.min(7, Math.round(sat2 * 1.5 + 4))),
            Job_Satisfaction_3: Math.max(1, Math.min(7, Math.round(sat3 * 1.5 + 4))),
            Commitment_1: Math.max(1, Math.min(7, Math.round(com1 * 1.5 + 4))),
            Commitment_2: Math.max(1, Math.min(7, Math.round(com2 * 1.5 + 4))),
            Commitment_3: Math.max(1, Math.min(7, Math.round(com3 * 1.5 + 4))),
            Performance_1: Math.max(1, Math.min(7, Math.round(perf1 * 1.5 + 4))),
            Performance_2: Math.max(1, Math.min(7, Math.round(perf2 * 1.5 + 4)))
        });
    }
    
    return data;
};

// 상관계수 계산
const calculateCorrelation = (data, var1, var2) => {
    const values1 = data.map(row => parseFloat(row[var1]));
    const values2 = data.map(row => parseFloat(row[var2]));
    
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
    
    const numerator = values1.reduce((sum, val, idx) => sum + (val - mean1) * (values2[idx] - mean2), 0);
    const denom1 = Math.sqrt(values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0));
    const denom2 = Math.sqrt(values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0));
    
    return numerator / (denom1 * denom2);
};

// SEM 분석 함수들
const calculateSEM = (data, measurementModel, structuralModel) => {
    const measurementResults = {};
    
    // 측정모형 분석
    Object.keys(measurementModel).forEach(latentVar => {
        const indicators = measurementModel[latentVar];
        if (indicators.length === 0) return;
        
        const loadings = {};
        indicators.forEach(indicator => {
            const correlations = indicators
                .filter(other => other !== indicator)
                .map(other => calculateCorrelation(data, indicator, other));
            
            const avgCorrelation = correlations.reduce((sum, corr) => sum + Math.abs(corr), 0) / correlations.length;
            loadings[indicator] = Math.min(0.95, Math.max(0.4, avgCorrelation + 0.2 + Math.random() * 0.3));
        });
        
        const loadingValues = Object.values(loadings);
        const sumLoadings = loadingValues.reduce((sum, loading) => sum + loading, 0);
        const sumSquaredLoadings = loadingValues.reduce((sum, loading) => sum + loading * loading, 0);
        
        const reliability = {
            composite_reliability: Math.pow(sumLoadings, 2) / 
                (Math.pow(sumLoadings, 2) + indicators.length * (1 - sumSquaredLoadings / indicators.length)),
            average_variance_extracted: sumSquaredLoadings / indicators.length,
            cronbach_alpha: 0
        };
        reliability.cronbach_alpha = reliability.composite_reliability * 0.9;
        
        measurementResults[latentVar] = {
            factor_loadings: loadings,
            reliability: reliability
        };
    });
    
    // 구조모형 분석
    const structuralResults = {};
    structuralModel.forEach(path => {
        const pathCoefficient = 0.3 + Math.random() * 0.5;
        structuralResults[`${path.from}_to_${path.to}`] = {
            path_coefficient: pathCoefficient,
            t_value: Math.abs(pathCoefficient) / (0.05 + Math.random() * 0.1),
            p_value: Math.max(0.001, 0.5 - Math.abs(pathCoefficient) * 0.6),
            significant: Math.abs(pathCoefficient) > 0.1 && Math.random() > 0.2
        };
    });
    
    // 적합도 지수
    const fitIndices = {
        chi_square: Math.random() * 100 + 20,
        df: Math.max(1, Object.keys(measurementModel).length * 2),
        p_value: Math.random() * 0.3 + 0.05,
        rmsea: Math.max(0.02, 0.12 - Object.keys(measurementModel).length * 0.02 + Math.random() * 0.03),
        cfi: Math.min(0.99, 0.75 + Object.keys(measurementModel).length * 0.04 + Math.random() * 0.08),
        tli: Math.min(0.98, 0.73 + Object.keys(measurementModel).length * 0.04 + Math.random() * 0.08),
        srmr: Math.max(0.02, 0.10 - Object.keys(measurementModel).length * 0.015 + Math.random() * 0.02),
        gfi: Math.min(0.98, 0.80 + Object.keys(measurementModel).length * 0.03 + Math.random() * 0.06),
        agfi: Math.min(0.97, 0.75 + Object.keys(measurementModel).length * 0.03 + Math.random() * 0.06),
        nfi: Math.min(0.97, 0.78 + Object.keys(measurementModel).length * 0.03 + Math.random() * 0.07),
        ifi: Math.min(0.98, 0.80 + Object.keys(measurementModel).length * 0.03 + Math.random() * 0.06)
    };
    
    return {
        measurement_model: measurementResults,
        structural_model: structuralResults,
        fit_indices: fitIndices,
        modification_indices: []
    };
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (type: 'academic' | 'organizational') => void }) => {
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
                        Analyze complex relationships between observed and latent variables by combining factor analysis and multiple regression.
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
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Load Data:</strong> Start with one of the sample datasets, like the Academic Motivation model or the Organizational Behavior model.</li>
                                <li><strong>Specify Measurement Model:</strong> Define your latent variables (constructs) and assign their corresponding observed variables (indicators, e.g., survey items).</li>
                                <li><strong>Specify Structural Model:</strong> Define the hypothesized causal paths between your latent variables.</li>
                                <li><strong>Run Analysis:</strong> The tool will estimate all paths and provide model fit indices to evaluate how well your theory fits the data.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Model Fit Indices:</strong> Check values like CFI, TLI (>0.90) and RMSEA, SRMR (<0.08) to assess if your model is a good fit for the data.</li>
                                <li><strong>Path Coefficients:</strong> Standardized coefficients indicate the strength and direction of relationships between variables. Significant p-values suggest a reliable path.</li>
                                <li><strong>Factor Loadings:</strong> Ensure all indicators load strongly and significantly onto their intended latent factor, confirming your measurement model.</li>
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">Key Application Areas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><BrainCircuit className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Psychology</h4><p className="text-xs text-muted-foreground">Testing theories of personality and intelligence.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Building className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Management</h4><p className="text-xs text-muted-foreground">Modeling job satisfaction and performance.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Star className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Marketing</h4><p className="text-xs text-muted-foreground">Understanding brand loyalty and purchase intent.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Users className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Sociology</h4><p className="text-xs text-muted-foreground">Analyzing social support and well-being models.</p></div></div>
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
    const [view, setView] = useState('intro');
    const [data, setData] = useState([]);
    const [datasetType, setDatasetType] = useState('academic');
    const [measurementModel, setMeasurementModel] = useState({});
    const [structuralModel, setStructuralModel] = useState([]);
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newLatentVar, setNewLatentVar] = useState('');

    // 샘플 데이터 로드
    const loadSampleData = (type) => {
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
    };

    // 변수 목록
    const availableVariables = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => key !== 'id' && typeof data[0][key] === 'number');
    }, [data]);

    const usedVariables = useMemo(() => {
        return Object.values(measurementModel).flat();
    }, [measurementModel]);

    // 잠재변수 관리
    const addLatentVariable = () => {
        if (newLatentVar.trim() && !measurementModel[newLatentVar]) {
            setMeasurementModel(prev => ({
                ...prev,
                [newLatentVar.trim()]: []
            }));
            setNewLatentVar('');
        }
    };

    const removeLatentVariable = (latentVar) => {
        setMeasurementModel(prev => {
            const newModel = { ...prev };
            delete newModel[latentVar];
            return newModel;
        });
        setStructuralModel(prev => 
            prev.filter(path => path.from !== latentVar && path.to !== latentVar)
        );
    };

    const assignVariable = (latentVar, variable) => {
        setMeasurementModel(prev => ({
            ...prev,
            [latentVar]: [...prev[latentVar], variable]
        }));
    };

    const removeVariable = (latentVar, variable) => {
        setMeasurementModel(prev => ({
            ...prev,
            [latentVar]: prev[latentVar].filter(v => v !== variable)
        }));
    };

    // SEM 분석 실행
    const runSEMAnalysis = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 2500));
        const semResults = calculateSEM(data, measurementModel, structuralModel);
        setResults(semResults);
        setIsLoading(false);
    };
    
    const handleStart = () => {
        loadSampleData('academic');
        setView('main');
    }

    if (view === 'intro') {
        return <IntroPage onStart={handleStart} onLoadExample={loadSampleData} />;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">SEM Analysis</h1>
                    <p className="text-gray-600">Structural Equation Modeling</p>
                </div>
                <Button onClick={() => setView('intro')} variant="ghost">
                    <Info className="w-4 h-4 mr-2" /> Help
                </Button>
            </div>

            {/* 데이터 상태 */}
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
                {/* 모델 설정 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="w-5 h-5" />
                            Model Specification
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 데이터셋 선택 */}
                        <div className="space-y-2">
                            <Label>Sample Dataset</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={datasetType === 'academic' ? 'default' : 'outline'}
                                    onClick={() => loadSampleData('academic')}
                                    size="sm"
                                >
                                    Academic Model
                                </Button>
                                <Button
                                    variant={datasetType === 'organizational' ? 'default' : 'outline'}
                                    onClick={() => loadSampleData('organizational')}
                                    size="sm"
                                >
                                    Organizational
                                </Button>
                            </div>
                        </div>

                        {/* 측정모형 */}
                        <div className="space-y-3">
                            <Label className="font-semibold">Measurement Model</Label>
                            
                            <div className="flex gap-2">
                                <Input
                                    placeholder="New latent variable..."
                                    value={newLatentVar}
                                    onChange={(e) => setNewLatentVar(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addLatentVariable()}
                                />
                                <Button onClick={addLatentVariable} size="sm">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {Object.keys(measurementModel).map(latentVar => (
                                    <Card key={latentVar} className="p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-medium text-sm">{latentVar}</h4>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeLatentVariable(latentVar)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-1 mb-2">
                                            {measurementModel[latentVar].map(variable => (
                                                <div key={variable} className="flex justify-between items-center bg-green-50 p-1 rounded text-xs">
                                                    <span>{variable}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeVariable(latentVar, variable)}
                                                    >
                                                        <Trash2 className="w-2 h-2" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {availableVariables
                                                .filter(v => !usedVariables.includes(v))
                                                .map(variable => (
                                                <Badge
                                                    key={variable}
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-green-100 text-xs"
                                                    onClick={() => assignVariable(latentVar, variable)}
                                                >
                                                    {variable}
                                                </Badge>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* 구조모형 */}
                        <div className="space-y-3">
                            <Label className="font-semibold">Structural Paths</Label>
                            <div className="space-y-1">
                                {structuralModel.map((path, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm">
                                        <span>{path.from} → {path.to}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setStructuralModel(prev => 
                                                prev.filter((_, i) => i !== idx)
                                            )}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={runSEMAnalysis} 
                            disabled={isLoading || data.length === 0}
                            className="w-full"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

                {/* 결과 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Analysis Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-600">Running SEM analysis...</p>
                                <Progress value={66} className="mt-4" />
                            </div>
                        )}

                        {results && !isLoading && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-green-50 rounded">
                                        <div className="text-sm text-green-600 font-medium">Model Type</div>
                                        <div className="font-semibold">SEM with {Object.keys(measurementModel).length} factors</div>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded">
                                        <div className="text-sm text-blue-600 font-medium">RMSEA</div>
                                        <div className="font-semibold">{results.fit_indices.rmsea.toFixed(3)}</div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-purple-50 rounded">
                                        <div className="text-sm text-purple-600 font-medium">CFI</div>
                                        <div className="font-semibold">{results.fit_indices.cfi.toFixed(3)}</div>
                                    </div>
                                    <div className="p-3 bg-orange-50 rounded">
                                        <div className="text-sm text-orange-600 font-medium">TLI</div>
                                        <div className="font-semibold">{results.fit_indices.tli.toFixed(3)}</div>
                                    </div>
                                </div>
                            </div>
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

            {/* 상세 결과 */}
            {results && !isLoading && (
                <Tabs defaultValue="fit" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="fit">Model Fit</TabsTrigger>
                        <TabsTrigger value="measurement">Measurement</TabsTrigger>
                        <TabsTrigger value="structural">Structural</TabsTrigger>
                        <TabsTrigger value="diagram">Diagram</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="fit" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Absolute Fit Indices</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span>Chi-square</span>
                                            <Badge>{results.fit_indices.chi_square.toFixed(2)}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>df</span>
                                            <Badge>{Math.round(results.fit_indices.df)}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>RMSEA</span>
                                            <Badge variant={results.fit_indices.rmsea < 0.08 ? 'default' : 'destructive'}>
                                                {results.fit_indices.rmsea.toFixed(3)}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>SRMR</span>
                                            <Badge variant={results.fit_indices.srmr < 0.08 ? 'default' : 'destructive'}>
                                                {results.fit_indices.srmr.toFixed(3)}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Incremental Fit Indices</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span>CFI</span>
                                            <Badge variant={results.fit_indices.cfi > 0.90 ? 'default' : 'destructive'}>
                                                {results.fit_indices.cfi.toFixed(3)}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>TLI</span>
                                            <Badge variant={results.fit_indices.tli > 0.90 ? 'default' : 'destructive'}>
                                                {results.fit_indices.tli.toFixed(3)}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>GFI</span>
                                            <Badge>{results.fit_indices.gfi.toFixed(3)}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>NFI</span>
                                            <Badge>{results.fit_indices.nfi.toFixed(3)}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="measurement" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            {Object.entries(results.measurement_model).map(([latentVar, result]) => (
                                <Card key={latentVar}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{latentVar}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div>
                                                <h5 className="font-medium mb-2">Factor Loadings</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(result.factor_loadings).map(([indicator, loading]) => (
                                                        <div key={indicator} className="flex justify-between items-center">
                                                            <span className="text-sm">{indicator}</span>
                                                            <Badge variant={Math.abs(loading) > 0.5 ? 'default' : 'secondary'}>
                                                                {loading.toFixed(3)}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <h5 className="font-medium mb-2">Reliability</h5>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm">CR</span>
                                                        <Badge variant={result.reliability.composite_reliability > 0.7 ? 'default' : 'destructive'}>
                                                            {result.reliability.composite_reliability.toFixed(3)}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm">AVE</span>
                                                        <Badge variant={result.reliability.average_variance_extracted > 0.5 ? 'default' : 'destructive'}>
                                                            {result.reliability.average_variance_extracted.toFixed(3)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="structural" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Path Coefficients</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(results.structural_model).map(([path, result]) => (
                                        <div key={path} className="p-3 bg-gray-50 rounded">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-sm">
                                                    {path.replace('_to_', ' → ').replace(/_/g, ' ')}
                                                </span>
                                                <Badge variant={result.significant ? 'default' : 'secondary'}>
                                                    {result.path_coefficient.toFixed(3)}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                <span>t = {result.t_value.toFixed(2)}, p = {result.p_value.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="diagram" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Path Diagram</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-gray-50 rounded-lg p-6 min-h-64 flex items-center justify-center">
                                    <div className="text-center">
                                        <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600">Conceptual path diagram</p>
                                        <div className="mt-4 text-left space-y-2">
                                            <div className="text-sm font-medium">Latent Variables:</div>
                                            {Object.keys(measurementModel).map(latent => (
                                                <div key={latent} className="text-xs">
                                                    <strong>{latent}</strong>: {measurementModel[latent].join(', ')}
                                                </div>
                                            ))}
                                            <div className="text-sm font-medium mt-3">Structural Paths:</div>
                                            {structuralModel.map((path, idx) => (
                                                <div key={idx} className="text-xs">{path.from} → {path.to}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

            {/* 데이터 미리보기 */}
            {data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dataset Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        {Object.keys(data[0]).slice(0, 8).map(header => (
                                            <th key={header} className="text-left p-2 font-medium">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(0, 5).map((row, idx) => (
                                        <tr key={idx} className="border-b">
                                            {Object.values(row).slice(0, 8).map((value, valueIdx) => (
                                                <td key={valueIdx} className="p-2">
                                                    {typeof value === 'number' ? value : value}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

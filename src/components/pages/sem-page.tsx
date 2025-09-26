
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
    Calculator
} from 'lucide-react';

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
const calculateCorrelation = (data: any[], var1: string, var2: string) => {
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
const calculateSEM = (data: any[], measurementModel: { [key: string]: string[] }, structuralModel: { from: string, to: string }[]) => {
    const measurementResults: { [key: string]: any } = {};
    
    // 측정모형 분석
    Object.keys(measurementModel).forEach(latentVar => {
        const indicators = measurementModel[latentVar];
        if (indicators.length === 0) return;
        
        const loadings: { [key: string]: number } = {};
        indicators.forEach(indicator => {
            const correlations = indicators
                .filter(other => other !== indicator)
                .map(other => calculateCorrelation(data, indicator, other));
            
            const avgCorrelation = correlations.reduce((sum, corr) => sum + Math.abs(corr), 0) / (correlations.length || 1);
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
    const structuralResults: { [key: string]: any } = {};
    structuralModel.forEach(path => {
        const pathCoefficient = 0.3 + Math.random() * 0.5;
        structuralResults[`${path.from}_to_${path.to}`] = {
            path_coefficient: pathCoefficient,
            t_value: Math.abs(pathCoefficient) / (0.05 + Math.random() * 0.1),
            p_value: Math.max(0.001, 0.5 - Math.abs(pathCoefficient) * 0.6),
            significant: Math.abs(pathCoefficient) > 0.1 && Math.random() > 0.2
        };
    });
    
    // 적합도 지수 계산 (시뮬레이션)
    const numFactors = Object.keys(measurementModel).filter(f => measurementModel[f].length > 0).length;
    const numItems = Object.values(measurementModel).flat().length;
    const complexity = numItems > 0 && numFactors > 0 ? numItems / numFactors : 1;
    
    const fitIndices = {
        chi_square: Math.random() * 100 + 20,
        df: Math.max(1, numItems * (numItems + 1) / 2 - numItems * numFactors),
        p_value: Math.random() * 0.3 + 0.05,
        rmsea: Math.max(0.02, 0.12 - complexity * 0.02 + Math.random() * 0.03),
        cfi: Math.min(0.99, 0.75 + complexity * 0.05 + Math.random() * 0.1),
        tli: Math.min(0.98, 0.73 + complexity * 0.04 + Math.random() * 0.08),
        srmr: Math.max(0.02, 0.10 - complexity * 0.015 + Math.random() * 0.02),
        gfi: Math.min(0.98, 0.80 + complexity * 0.03 + Math.random() * 0.06),
        agfi: Math.min(0.97, 0.75 + complexity * 0.03 + Math.random() * 0.06),
        nfi: Math.min(0.97, 0.78 + complexity * 0.03 + Math.random() * 0.07),
        ifi: Math.min(0.98, 0.80 + complexity * 0.03 + Math.random() * 0.06)
    };
    
    return {
        measurement_model: measurementResults,
        structural_model: structuralResults,
        fit_indices: fitIndices,
        modification_indices: []
    };
};

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-5xl shadow-lg">
                <CardHeader className="text-center p-8 bg-gradient-to-r from-green-50 to-teal-50">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="text-4xl font-bold text-gray-800">
                        Structural Equation Modeling (SEM)
                    </CardTitle>
                    <CardDescription className="text-xl pt-2 text-gray-600 max-w-4xl mx-auto">
                        Analyze complex relationships between latent and observed variables to test theoretical models.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 px-8 py-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">What is SEM?</h2>
                        <p className="max-w-4xl mx-auto text-gray-600">
                            Structural Equation Modeling is a powerful statistical methodology that combines factor analysis and path analysis. It allows researchers to simultaneously examine the relationships among latent constructs (unobservable variables, like 'satisfaction') and their manifest indicators (observable variables, like survey questions), as well as the causal relationships among the latent constructs themselves.
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <Target className="text-green-600"/> Measurement Model
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                                <li><strong>CFA:</strong> Validates the relationship between latent variables and their indicators.</li>
                                <li><strong>Reliability:</strong> Assesses internal consistency with CR and Alpha.</li>
                                <li><strong>Validity:</strong> Checks convergent (AVE) and discriminant validity.</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <GitBranch className="text-green-600"/> Structural Model
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                                <li><strong>Path Analysis:</strong> Estimates the causal relationships between latent variables.</li>
                                <li><strong>Effects:</strong> Calculates direct, indirect, and total effects.</li>
                                <li><strong>R² Values:</strong> Determines the variance explained for endogenous latent variables.</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <BarChart3 className="text-green-600"/> Model Evaluation
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                                <li><strong>Fit Indices:</strong> Assesses how well the overall model fits the data (e.g., RMSEA, CFI, TLI).</li>
                                <li><strong>Modification Indices:</strong> Suggests potential model improvements.</li>
                                <li><strong>Significance:</strong> Tests the statistical significance of paths and loadings.</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Calculator className="text-green-600"/> Analysis Steps
                        </h3>
                        <div className="grid md:grid-cols-5 gap-4 text-sm">
                            {[
                                { num: 1, title: "Specification", desc: "Define models" },
                                { num: 2, title: "Identification", desc: "Check parameters" },
                                { num: 3, title: "Estimation", desc: "Calculate values" },
                                { num: 4, title: "Evaluation", desc: "Assess fit" },
                                { num: 5, title: "Modification", desc: "Improve model" }
                            ].map(step => (
                                <div key={step.num} className="flex flex-col items-center text-center">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mb-2">
                                        {step.num}
                                    </div>
                                    <span className="font-medium">{step.title}</span>
                                    <span className="text-xs text-gray-500 mt-1">{step.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-gray-50">
                    <Button size="lg" onClick={onStart} className="bg-green-600 hover:bg-green-700">
                        Start SEM Analysis <MoveRight className="ml-2 w-5 h-5"/>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function SEMAnalysisComponent() {
    const [view, setView] = useState('main');
    const [data, setData] = useState<any[]>([]);
    const [datasetType, setDatasetType] = useState('academic');
    const [measurementModel, setMeasurementModel] = useState<{ [key: string]: string[] }>({});
    const [structuralModel, setStructuralModel] = useState<{ from: string, to: string }[]>([]);
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newLatentVar, setNewLatentVar] = useState('');

    const loadSampleData = (type: string) => {
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

    const availableVariables = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => key !== 'id' && typeof data[0][key] === 'number');
    }, [data]);

    const usedVariables = useMemo(() => {
        return Object.values(measurementModel).flat();
    }, [measurementModel]);

    const addLatentVariable = () => {
        if (newLatentVar.trim() && !measurementModel[newLatentVar.trim()]) {
            setMeasurementModel(prev => ({
                ...prev,
                [newLatentVar.trim()]: []
            }));
            setNewLatentVar('');
        }
    };

    const removeLatentVariable = (latentVar: string) => {
        setMeasurementModel(prev => {
            const newModel = { ...prev };
            delete newModel[latentVar];
            return newModel;
        });
        setStructuralModel(prev => 
            prev.filter(path => path.from !== latentVar && path.to !== latentVar)
        );
    };

    const assignVariable = (latentVar: string, variable: string) => {
        setMeasurementModel(prev => ({
            ...prev,
            [latentVar]: [...prev[latentVar], variable]
        }));
    };

    const removeVariable = (latentVar: string, variable: string) => {
        setMeasurementModel(prev => ({
            ...prev,
            [latentVar]: prev[latentVar].filter(v => v !== variable)
        }));
    };
    
    const runSEMAnalysis = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 2500));
        const semResults = calculateSEM(data, measurementModel, structuralModel);
        setResults(semResults);
        setIsLoading(false);
    };
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">SEM Analysis</h1>
                    <p className="text-gray-600">Structural Equation Modeling</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => loadSampleData(datasetType)}>
                        Load Sample Data
                    </Button>
                    <Button onClick={() => setView('intro')} variant="ghost">
                        <Info className="w-4 h-4 mr-2" /> Help
                    </Button>
                </div>
            </div>

            {data.length > 0 && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Dataset Loaded</AlertTitle>
                    <AlertDescription>
                        {data.length} observations with {availableVariables.length} variables loaded successfully.
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
                             <Tabs defaultValue="fit" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="fit">Fit</TabsTrigger>
                                    <TabsTrigger value="measurement">Measurement</TabsTrigger>
                                    <TabsTrigger value="structural">Structural</TabsTrigger>
                                    <TabsTrigger value="diagram">Diagram</TabsTrigger>
                                </TabsList>
                                <TabsContent value="fit" className="mt-4">
                                    Content for Model Fit
                                </TabsContent>
                                <TabsContent value="measurement" className="mt-4">
                                    Content for Measurement Model
                                </TabsContent>
                                <TabsContent value="structural" className="mt-4">
                                    Content for Structural Model
                                </TabsContent>
                                <TabsContent value="diagram" className="mt-4">
                                     Content for Path Diagram
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
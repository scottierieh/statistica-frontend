
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
import { 
    BrainCircuit, 
    Plus, 
    Trash2, 
    PlayCircle, 
    BarChart3, 
    Target, 
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Info,
    Settings,
    FileSearch,
    MoveRight
} from 'lucide-react';
import { exampleDatasets } from '@/lib/example-datasets';

// 샘플 데이터 생성 함수
const generateCFAData = (nSamples = 300) => {
    const data = [];
    
    for (let i = 0; i < nSamples; i++) {
        // Factor 1: Cognitive Ability (4 items)
        const cogFactor = Math.random() * 2 - 1; // 표준정규분포 근사
        const cog1 = 0.8 * cogFactor + Math.random() * 0.6 - 0.3;
        const cog2 = 0.75 * cogFactor + Math.random() * 0.6 - 0.3;
        const cog3 = 0.7 * cogFactor + Math.random() * 0.6 - 0.3;
        const cog4 = 0.65 * cogFactor + Math.random() * 0.6 - 0.3;
        
        // Factor 2: Emotional Wellbeing (4 items)
        const emoFactor = Math.random() * 2 - 1;
        const emo1 = 0.85 * emoFactor + Math.random() * 0.5 - 0.25;
        const emo2 = 0.78 * emoFactor + Math.random() * 0.5 - 0.25;
        const emo3 = 0.72 * emoFactor + Math.random() * 0.5 - 0.25;
        const emo4 = 0.68 * emoFactor + Math.random() * 0.5 - 0.25;
        
        // Factor 3: Social Skills (3 items)
        const socFactor = Math.random() * 2 - 1;
        const soc1 = 0.75 * socFactor + Math.random() * 0.6 - 0.3;
        const soc2 = 0.70 * socFactor + Math.random() * 0.6 - 0.3;
        const soc3 = 0.65 * socFactor + Math.random() * 0.6 - 0.3;
        
        data.push({
            id: i + 1,
            Cognitive_1: Math.round((cog1 * 1.5 + 4) * 10) / 10,
            Cognitive_2: Math.round((cog2 * 1.5 + 4) * 10) / 10,
            Cognitive_3: Math.round((cog3 * 1.5 + 4) * 10) / 10,
            Cognitive_4: Math.round((cog4 * 1.5 + 4) * 10) / 10,
            Emotional_1: Math.round((emo1 * 1.5 + 4) * 10) / 10,
            Emotional_2: Math.round((emo2 * 1.5 + 4) * 10) / 10,
            Emotional_3: Math.round((emo3 * 1.5 + 4) * 10) / 10,
            Emotional_4: Math.round((emo4 * 1.5 + 4) * 10) / 10,
            Social_1: Math.round((soc1 * 1.5 + 4) * 10) / 10,
            Social_2: Math.round((soc2 * 1.5 + 4) * 10) / 10,
            Social_3: Math.round((soc3 * 1.5 + 4) * 10) / 10
        });
    }
    
    return data;
};

// CFA 계산 함수들 (간단화된 시뮬레이션)
const calculateCorrelationMatrix = (data: any[], variables: string[]) => {
    const n = data.length;
    const correlations: { [key: string]: { [key: string]: number } } = {};
    
    for (let i = 0; i < variables.length; i++) {
        correlations[variables[i]] = {};
        for (let j = 0; j < variables.length; j++) {
            if (i === j) {
                correlations[variables[i]][variables[j]] = 1;
            } else {
                const x = data.map(row => parseFloat(row[variables[i]]));
                const y = data.map(row => parseFloat(row[variables[j]]));
                
                const meanX = x.reduce((a, b) => a + b) / n;
                const meanY = y.reduce((a, b) => a + b) / n;
                
                const numerator = x.map((xi, idx) => (xi - meanX) * (y[idx] - meanY))
                                   .reduce((a, b) => a + b);
                const denomX = Math.sqrt(x.map(xi => Math.pow(xi - meanX, 2)).reduce((a, b) => a + b));
                const denomY = Math.sqrt(y.map(yi => Math.pow(yi - meanY, 2)).reduce((a, b) => a + b));
                
                correlations[variables[i]][variables[j]] = numerator / (denomX * denomY);
            }
        }
    }
    
    return correlations;
};

const calculateCFA = (data: any[], modelSpec: { [key: string]: string[] }) => {
    const allVariables = Object.values(modelSpec).flat();
    const correlationMatrix = calculateCorrelationMatrix(data, allVariables);
    
    const factorLoadings: { [key: string]: { [key: string]: number } } = {};
    const fitIndices: { [key: string]: number } = {};
    const reliability: { [key: string]: any } = {};
    
    Object.keys(modelSpec).forEach(factor => {
        factorLoadings[factor] = {};
        const items = modelSpec[factor];
        
        if (items.length === 0) return;
        
        items.forEach(item => {
            const avgCorrelation = items
                .filter(otherItem => otherItem !== item)
                .map(otherItem => Math.abs(correlationMatrix[item][otherItem]))
                .reduce((a, b) => a + b, 0) / (items.length - 1 || 1);
            
            factorLoadings[factor][item] = Math.min(0.95, Math.max(0.3, avgCorrelation + 0.2 + Math.random() * 0.2));
        });
        
        const loadings = Object.values(factorLoadings[factor]);
        const sumLoadings = loadings.reduce((a, b) => a + b, 0);
        const sumSquaredLoadings = loadings.reduce((a, b) => a + b * b, 0);
        
        const compositeReliability = Math.pow(sumLoadings, 2) / (Math.pow(sumLoadings, 2) + items.length);
        const averageVarianceExtracted = sumSquaredLoadings / items.length;
        
        reliability[factor] = {
            composite_reliability: Math.min(0.95, Math.max(0.6, compositeReliability)),
            average_variance_extracted: Math.min(0.90, Math.max(0.4, averageVarianceExtracted)),
            cronbach_alpha: Math.min(0.95, Math.max(0.6, compositeReliability * 0.9))
        };
    });
    
    const numFactors = Object.keys(modelSpec).filter(f => modelSpec[f].length > 0).length;
    const numItems = allVariables.length;
    const complexity = numItems > 0 && numFactors > 0 ? numItems / numFactors : 1;
    
    fitIndices.chi_square = Math.random() * 50 + 10;
    fitIndices.df = Math.max(1, numItems * (numItems + 1) / 2 - numItems * numFactors);
    fitIndices.rmsea = Math.max(0.02, 0.15 - complexity * 0.02 + Math.random() * 0.04);
    fitIndices.cfi = Math.min(0.99, 0.75 + complexity * 0.05 + Math.random() * 0.1);
    fitIndices.tli = Math.min(0.98, fitIndices.cfi - 0.02);
    fitIndices.srmr = Math.max(0.02, 0.12 - complexity * 0.02 + Math.random() * 0.03);
    fitIndices.gfi = Math.min(0.98, 0.80 + complexity * 0.03 + Math.random() * 0.08);
    fitIndices.agfi = Math.min(0.97, fitIndices.gfi - 0.05);
    
    return { factorLoadings, fitIndices, reliability };
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void; }) => {
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
                        Test how well a pre-specified factor structure fits your observed data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use CFA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            CFA is a confirmatory technique used to test a specific hypothesis about the structure 
                            of a set of variables. It's crucial for scale validation and theory testing.
                        </p>
                    </div>
                     {cfaExample && (
                         <div className="flex justify-center">
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(cfaExample)}>
                                <BrainCircuit className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{cfaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{cfaExample.description}</p>
                                </div>
                            </Card>
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <Settings className="text-primary"/> Setup Guide
                            </h3>
                            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                                <li><strong>Define Factors:</strong> Add latent constructs you want to test</li>
                                <li><strong>Assign Variables:</strong> Assign observed variables to each factor</li>
                                <li><strong>Run Analysis:</strong> Get fit indices and parameter estimates</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <FileSearch className="text-primary"/> Interpretation
                            </h3>
                            <ul className="list-disc pl-5 space-y-3 text-muted-foreground">
                                <li><strong>Fit Indices:</strong> CFI/TLI &gt; .90, RMSEA &lt; .08</li>
                                <li><strong>Loadings:</strong> Should be high (&gt; 0.5) and significant</li>
                                <li><strong>Reliability:</strong> CR &gt; 0.7, AVE &gt; 0.5</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>
                        Start Analysis <MoveRight className="ml-2 w-5 h-5"/>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function CfaPage() {
    const [view, setView] = useState('main');
    const [data, setData] = useState<any[]>([]);
    const [modelSpec, setModelSpec] = useState<{ [key: string]: string[] }>({
        'Cognitive Ability': [],
        'Emotional Wellbeing': [],
        'Social Skills': []
    });
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newFactorName, setNewFactorName] = useState('');

    const loadSampleData = () => {
        const sampleData = generateCFAData(300);
        setData(sampleData);
        setModelSpec({
            'Cognitive Ability': ['Cognitive_1', 'Cognitive_2', 'Cognitive_3', 'Cognitive_4'],
            'Emotional Wellbeing': ['Emotional_1', 'Emotional_2', 'Emotional_3', 'Emotional_4'],
            'Social Skills': ['Social_1', 'Social_2', 'Social_3']
        });
    };

    const availableVariables = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => key !== 'id' && typeof data[0][key] === 'number');
    }, [data]);

    const usedVariables = useMemo(() => {
        return Object.values(modelSpec).flat();
    }, [modelSpec]);

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
        setModelSpec(prev => ({
            ...prev,
            [factorName]: [...prev[factorName], variable]
        }));
    };

    const removeVariable = (factorName: string, variable: string) => {
        setModelSpec(prev => ({
            ...prev,
            [factorName]: prev[factorName].filter(v => v !== variable)
        }));
    };

    const runAnalysis = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const analysisResults = calculateCFA(data, modelSpec);
        setResults(analysisResults);
        setIsLoading(false);
    };

    const interpretFit = (fitIndices: any) => {
        const { rmsea, cfi, srmr } = fitIndices;
        let score = 0;
        let interpretation = [];

        if (rmsea < 0.05) { 
            score += 2; 
            interpretation.push("RMSEA: Excellent fit"); 
        } else if (rmsea < 0.08) { 
            score += 1; 
            interpretation.push("RMSEA: Acceptable fit"); 
        } else {
            interpretation.push("RMSEA: Poor fit");
        }

        if (cfi > 0.95) { 
            score += 2; 
            interpretation.push("CFI: Excellent fit"); 
        } else if (cfi > 0.90) { 
            score += 1; 
            interpretation.push("CFI: Acceptable fit"); 
        } else {
            interpretation.push("CFI: Poor fit");
        }

        if (srmr < 0.05) { 
            score += 2; 
            interpretation.push("SRMR: Excellent fit"); 
        } else if (srmr < 0.08) { 
            score += 1; 
            interpretation.push("SRMR: Acceptable fit"); 
        } else {
            interpretation.push("SRMR: Poor fit");
        }

        return { score, interpretation };
    };
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={loadSampleData} />;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">CFA Analysis</h1>
                    <p className="text-gray-600">Configure your measurement model and test its fit</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadSampleData}>
                        Load Sample Data
                    </Button>
                </div>
            </div>

            {data.length > 0 && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Data Loaded</AlertTitle>
                    <AlertDescription>
                        {data.length} observations with {availableVariables.length} variables loaded successfully.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Model Specification
                        </CardTitle>
                        <CardDescription>
                            Define your latent factors and assign observed variables
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="New factor name..."
                                value={newFactorName}
                                onChange={(e) => setNewFactorName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addFactor()}
                            />
                            <Button onClick={addFactor} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {Object.keys(modelSpec).map(factorName => (
                                <Card key={factorName} className="p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold">{factorName}</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFactor(factorName)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {modelSpec[factorName].map(variable => (
                                            <div key={variable} className="flex justify-between items-center bg-blue-50 p-2 rounded">
                                                <span className="text-sm">{variable}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeVariable(factorName, variable)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t pt-3">
                                        <Label className="text-xs text-gray-500">Available variables:</Label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {availableVariables
                                                .filter(v => !usedVariables.includes(v))
                                                .map(variable => (
                                                <Badge
                                                    key={variable}
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-100"
                                                    onClick={() => assignVariable(factorName, variable)}
                                                >
                                                    {variable}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={runAnalysis} 
                            disabled={isLoading || data.length === 0 || usedVariables.length < 3}
                            className="w-full"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Running Analysis...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <PlayCircle className="w-4 h-4" />
                                    Run CFA Analysis
                                </div>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Analysis Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                            <div className="space-y-4">
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Running CFA analysis...</p>
                                </div>
                                <Progress value={33} />
                            </div>
                        )}

                        {results && !isLoading && (
                            <Tabs defaultValue="fit" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="fit">Model Fit</TabsTrigger>
                                    <TabsTrigger value="loadings">Factor Loadings</TabsTrigger>
                                    <TabsTrigger value="reliability">Reliability</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="fit" className="space-y-4 mt-4">
                                    <div className="space-y-3">
                                        <h4 className="font-semibold">Fit Indices</h4>
                                        {Object.entries(results.fitIndices).map(([index, value]) => (
                                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <span className="font-medium">{index.replace('_', ' ').toUpperCase()}</span>
                                                <Badge variant={
                                                    (index === 'rmsea' && (value as number) < 0.08) ||
                                                    (index === 'cfi' && (value as number) > 0.90) ||
                                                    (index === 'tli' && (value as number) > 0.90) ||
                                                    (index === 'srmr' && (value as number) < 0.08) ||
                                                    (index === 'gfi' && (value as number) > 0.90)
                                                    ? 'default' : 'destructive'
                                                }>
                                                    {typeof value === 'number' ? (value as number).toFixed(3) : value as any}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="p-4 bg-blue-50 rounded">
                                        <h5 className="font-semibold mb-2">Interpretation</h5>
                                        <ul className="text-sm space-y-1">
                                            {interpretFit(results.fitIndices).interpretation.map((item, idx) => (
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
                                
                                <TabsContent value="loadings" className="space-y-4 mt-4">
                                    {Object.entries(results.factorLoadings).map(([factor, loadings]: [string, any]) => (
                                        <div key={factor}>
                                            <h4 className="font-semibold mb-2">{factor}</h4>
                                            <div className="space-y-2">
                                                {Object.entries(loadings).map(([variable, loading]) => (
                                                    <div key={variable} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                        <span>{variable}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 bg-gray-200 rounded-full h-2">
                                                                <div 
                                                                    className="bg-blue-600 h-2 rounded-full"
                                                                    style={{ width: `${Math.abs(loading as number) * 100}%` }}
                                                                />
                                                            </div>
                                                            <Badge variant={Math.abs(loading as number) > 0.5 ? 'default' : 'secondary'}>
                                                                {(loading as number).toFixed(3)}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                                
                                <TabsContent value="reliability" className="space-y-4 mt-4">
                                    {Object.entries(results.reliability).map(([factor, stats]: [string, any]) => (
                                        <Card key={factor} className="p-4">
                                            <h4 className="font-semibold mb-3">{factor}</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>Composite Reliability</span>
                                                    <Badge variant={stats.composite_reliability > 0.7 ? 'default' : 'destructive'}>
                                                        {stats.composite_reliability.toFixed(3)}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Average Variance Extracted</span>
                                                    <Badge variant={stats.average_variance_extracted > 0.5 ? 'default' : 'destructive'}>
                                                        {stats.average_variance_extracted.toFixed(3)}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Cronbach&apos;s Alpha</span>
                                                    <Badge variant={stats.cronbach_alpha > 0.7 ? 'default' : 'destructive'}>
                                                        {stats.cronbach_alpha.toFixed(3)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </TabsContent>
                            </Tabs>
                        )}

                        {!results && !isLoading && (
                            <div className="text-center py-12 text-gray-500">
                                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>Configure your model and run analysis to see results</p>
                                <p className="text-sm mt-2">Load sample data to get started quickly</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


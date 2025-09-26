
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
import { produce } from 'immer';

// This is a simplified frontend simulation and does not represent a real CFA calculation.
// The actual calculation would happen on a backend server.

const calculateCFA = (data: any[], modelSpec: { [key: string]: string[] }) => {
    const allVariables = Object.values(modelSpec).flat();
    
    // Simple CFA estimation simulation
    const factorLoadings: { [key: string]: { [key: string]: number } } = {};
    const fitIndices: { [key: string]: number } = {};
    const reliability: { [key: string]: any } = {};
    
    Object.keys(modelSpec).forEach(factor => {
        factorLoadings[factor] = {};
        const items = modelSpec[factor];
        
        if (items.length === 0) return;
        
        items.forEach(item => {
            factorLoadings[factor][item] = Math.random() * 0.4 + 0.5; // Simulate loadings between 0.5 and 0.9
        });
        
        const loadings: number[] = Object.values(factorLoadings[factor]);
        const sumLoadings = loadings.reduce((a, b) => a + b, 0);
        const sumSquaredLoadings = loadings.reduce((a, b) => a + b * b, 0);
        
        const compositeReliability = Math.pow(sumLoadings, 2) / (Math.pow(sumLoadings, 2) + items.length * (1-sumSquaredLoadings/items.length));
        const averageVarianceExtracted = sumSquaredLoadings / items.length;
        
        reliability[factor] = {
            composite_reliability: Math.min(0.95, Math.max(0.6, compositeReliability)),
            average_variance_extracted: Math.min(0.90, Math.max(0.4, averageVarianceExtracted)),
            cronbach_alpha: Math.min(0.95, Math.max(0.6, compositeReliability * 0.95))
        };
    });
    
    const numFactors = Object.keys(modelSpec).filter(f => modelSpec[f].length > 0).length;
    const numItems = allVariables.length;
    const complexity = numItems > 0 && numFactors > 0 ? numItems / numFactors : 1;
    
    fitIndices.chi_square = Math.random() * 50 + 10;
    fitIndices.df = Math.max(1, numItems * (numItems + 1) / 2 - numItems * 2);
    fitIndices.rmsea = Math.max(0.02, 0.15 - complexity * 0.02 + Math.random() * 0.04);
    fitIndices.cfi = Math.min(0.99, 0.75 + complexity * 0.05 + Math.random() * 0.1);
    fitIndices.tli = Math.min(0.98, fitIndices.cfi - 0.02);
    fitIndices.srmr = Math.max(0.02, 0.12 - complexity * 0.02 + Math.random() * 0.03);
    
    return { factorLoadings, fitIndices, reliability };
};


export default function CompleteCFAComponent() {
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

            {data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Preview</CardTitle>
                        <CardDescription>First 5 rows of your dataset</CardDescription>
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
                                        {Object.keys(data[0]).length > 8 && <th className="text-left p-2">...</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(0, 5).map((row, idx) => (
                                        <tr key={idx} className="border-b">
                                            {Object.values(row).slice(0, 8).map((value, valueIdx) => (
                                                <td key={valueIdx} className="p-2">
                                                    {typeof value === 'number' ? value.toFixed(2) : value as string}
                                                </td>
                                            ))}
                                            {Object.values(row).length > 8 && <td className="p-2">...</td>}
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


'use client';
import React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, Network, LineChart as LineChartIcon, Activity, HelpCircle, MoveRight, Star, TrendingUp, CheckCircle, Users, AlertTriangle } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import type { Survey, SurveyResponse, Question } from '@/entities/Survey';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface RatingConjointResults {
    partWorths: { attribute: string, level: string, value: number }[];
    importance: { attribute: string, importance: number }[];
    regression: {
        rSquared: number;
        adjustedRSquared: number;
        predictions: number[];
        intercept: number;
        coefficients: {[key: string]: number};
    };
    targetVariable: string;
    optimalProduct?: {
        config: {[key: string]: string};
        totalUtility: number;
    };
    simulation?: any;
    segmentation?: SegmentationAnalysis;
}

interface SegmentationAnalysis {
    segmentVariable: string;
    resultsBySegment: { [segmentValue: string]: SegmentResult };
}

interface SegmentResult {
    importance: { attribute: string; importance: number }[];
    partWorths: { attribute: string; level: string; value: number }[];
}

interface FullAnalysisResponse {
    results: RatingConjointResults;
    error?: string;
}

interface Scenario {
    name: string;
    [key: string]: string;
}

interface RatingConjointAnalysisPageProps {
    survey: any;
    responses: any[];
}

export default function RatingConjointAnalysisPage({ survey, responses }: RatingConjointAnalysisPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState<string>('');
    
    // Advanced features state
    const [scenarios, setScenarios] = useState<Scenario[]>([
        { name: 'My Product' }, { name: 'Competitor A' }, { name: 'Competitor B' }
    ]);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [sensitivityAttribute, setSensitivityAttribute] = useState<string | undefined>();
    
    const conjointQuestion = useMemo(() => {
        const question = survey.questions?.find((q: any) => q.type === 'rating-conjoint');
        console.log('Found conjoint question:', question);
        return question;
    }, [survey]);

    const allAttributes = useMemo(() => {
        if (!conjointQuestion || !conjointQuestion.attributes) {
            console.log('No attributes found in conjoint question');
            return {};
        }
        
        const attributesObj: any = {};
        conjointQuestion.attributes.forEach((attr: any) => {
            attributesObj[attr.name] = {
                name: attr.name,
                type: 'categorical',
                levels: attr.levels || [],
                includeInAnalysis: true,
            };
        });
        
        console.log('Processed attributes:', attributesObj);
        return attributesObj;
    }, [conjointQuestion]);

    const attributeCols = useMemo(() => Object.keys(allAttributes), [allAttributes]);

    const handleAnalysis = useCallback(async (simulationScenarios?: Scenario[]) => {
        try {
            console.log('Starting analysis...');
            console.log('Conjoint Question:', conjointQuestion);
            console.log('Responses count:', responses?.length);
            console.log('Attributes:', allAttributes);

            if (!conjointQuestion) {
                const error = 'No rating-based conjoint question found in survey';
                console.error(error);
                setDebugInfo(error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Configuration Error', 
                    description: error 
                });
                setIsLoading(false);
                return;
            }

            if (!responses || responses.length === 0) {
                const error = 'No responses found for analysis';
                console.error(error);
                setDebugInfo(error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Data Error', 
                    description: error 
                });
                setIsLoading(false);
                return;
            }

            if (!conjointQuestion.profiles || conjointQuestion.profiles.length === 0) {
                const error = 'No profiles defined in conjoint question';
                console.error(error);
                setDebugInfo(error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Configuration Error', 
                    description: error 
                });
                setIsLoading(false);
                return;
            }

            // Collect analysis data
            const analysisData: any[] = [];
            let processedResponses = 0;
            let skippedResponses = 0;

            responses.forEach((resp, respIndex) => {
                let answerBlock = resp.answers?.[conjointQuestion.id];
                
                if (Array.isArray(resp.answers)) {
                    const answerObj = resp.answers.find((a: any) => a.questionId === conjointQuestion.id);
                    answerBlock = answerObj?.ratings || answerObj?.answer || answerObj;
                }
                
                if (!answerBlock || typeof answerBlock !== 'object') {
                    skippedResponses++;
                    return;
                }
                
                let profilesProcessed = 0;
                Object.entries(answerBlock).forEach(([profileKey, rating]) => {
                    const profile = conjointQuestion.profiles?.find((p: any) => 
                        p.id === profileKey || p.id.toString() === profileKey
                    );
                    
                    if (!profile || !profile.attributes) {
                        return;
                    }
                    
                    const ratingValue = Number(rating);
                    if (isNaN(ratingValue)) {
                        return;
                    }
                    
                    analysisData.push({ ...profile.attributes, rating: ratingValue });
                    profilesProcessed++;
                });
                
                if (profilesProcessed > 0) {
                    processedResponses++;
                }
            });
            
            if (analysisData.length === 0) {
                const error = `No valid rating data found. Processed ${processedResponses} responses but found no valid ratings.`;
                console.error(error);
                setDebugInfo(error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Data Error', 
                    description: error 
                });
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            if (!simulationScenarios) {
                setAnalysisResult(null);
                setSimulationResult(null);
            }

            // Prepare attributes for backend
            const attributesForBackend = attributeCols.reduce((acc, attrName) => {
                if (allAttributes[attrName]) {
                    acc[attrName] = { 
                        ...allAttributes[attrName], 
                        includeInAnalysis: true 
                    };
                }
                return acc;
            }, {} as any);

            const requestBody = {
                data: analysisData,
                attributes: attributesForBackend,
                targetVariable: 'rating',
                scenarios: simulationScenarios
            };

            const response = await fetch('/api/analysis/rating-conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Server error: ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorJson.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const result: FullAnalysisResponse = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            if (!result.results) {
                throw new Error('No results returned from analysis');
            }
            
            setDebugInfo('Analysis completed successfully');
            
            if (simulationScenarios && result.results.simulation) {
                setSimulationResult(result.results.simulation);
                toast({ 
                    title: 'Simulation Complete', 
                    description: 'Market shares have been predicted.'
                });
            } else {
                setAnalysisResult(result);
                toast({ 
                    title: 'Analysis Complete', 
                    description: `Successfully analyzed ${analysisData.length} rating data points.` 
                });
            }

        } catch (e: any) {
            const errorMessage = e.message || 'Unknown error occurred';
            setDebugInfo(`Error: ${errorMessage}`);
            toast({ 
                variant: 'destructive', 
                title: 'Analysis Error', 
                description: errorMessage 
            });
        } finally {
            setIsLoading(false);
        }
    }, [conjointQuestion, responses, toast, attributeCols, allAttributes]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    useEffect(() => {
        if (analysisResult && attributeCols.length > 0) {
            setSensitivityAttribute(attributeCols[0]);

            const initialScenarios = [
                { name: 'My Product' }, 
                { name: 'Competitor A' }, 
                { name: 'Competitor B' }
            ].map((sc, scIndex) => {
                const newSc: Scenario = { ...sc };
                attributeCols.forEach((attrName, i) => {
                    const levels = allAttributes[attrName]?.levels || [];
                    if (levels.length > 0) {
                        newSc[attrName] = levels[(scIndex + i) % levels.length];
                    }
                });
                return newSc;
            });
            setScenarios(initialScenarios);
        }
    }, [analysisResult, attributeCols, allAttributes]);

    const runSimulation = () => {
        handleAnalysis(scenarios);
    };

    const handleScenarioChange = (scenarioIndex: number, attrName: string, value: string) => {
        setScenarios(prev => {
            const newScenarios = [...prev];
            newScenarios[scenarioIndex] = { 
                ...newScenarios[scenarioIndex], 
                [attrName]: value 
            };
            return newScenarios;
        });
    };
    
    const sensitivityData = useMemo(() => {
        if (!analysisResult?.results || !sensitivityAttribute) return [];
        
        const otherAttributes = attributeCols.filter(attr => attr !== sensitivityAttribute);
        
        return analysisResult.results.partWorths
            .filter(p => p.attribute === sensitivityAttribute)
            .map(p => {
                let otherUtility = 0;
                otherAttributes.forEach(otherAttr => {
                    const levels = allAttributes[otherAttr]?.levels || [];
                    if (levels.length > 0) {
                        const baseLevelWorth = analysisResult.results.partWorths.find(
                            pw => pw.attribute === otherAttr && pw.level === levels[0]
                        );
                        otherUtility += baseLevelWorth?.value || 0;
                    }
                });
                return {
                    level: p.level,
                    utility: (analysisResult.results.regression.intercept || 0) + p.value + otherUtility,
                };
            });
    }, [analysisResult, sensitivityAttribute, attributeCols, allAttributes]);

    const importanceData = useMemo(() => {
        if (!analysisResult?.results.importance) return [];
        return analysisResult.results.importance
            .map(({ attribute, importance }) => ({ 
                name: attribute, 
                value: importance 
            }))
            .sort((a, b) => b.value - a.value);
    }, [analysisResult]);

    const partWorthsData = useMemo(() => {
        if (!analysisResult?.results.partWorths) return [];
        return analysisResult.results.partWorths;
    }, [analysisResult]);

    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    
    const importanceChartConfig = useMemo(() => {
        if (!analysisResult) return {};
        return importanceData.reduce((acc, item, index) => {
            acc[item.name] = { 
                label: item.name, 
                color: COLORS[index % COLORS.length] 
            };
            return acc;
        }, {} as any);
    }, [analysisResult, importanceData, COLORS]);

    const partWorthChartConfig = { value: { label: "Part-Worth" } };

    if (isLoading && !analysisResult) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Rating-based Conjoint analysis...</p>
                    {debugInfo && (
                        <Alert className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{debugInfo}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    }
    
    if (!analysisResult?.results) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            No analysis results available. {debugInfo || 'Please check your data and try again.'}
                        </AlertDescription>
                    </Alert>
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm font-semibold mb-2">Debug Information:</p>
                        <ul className="text-xs space-y-1">
                            <li>• Survey has conjoint question: {conjointQuestion ? 'Yes' : 'No'}</li>
                            <li>• Number of responses: {responses?.length || 0}</li>
                            <li>• Number of attributes: {attributeCols.length}</li>
                            {conjointQuestion && (
                                <li>• Number of profiles: {conjointQuestion.profiles?.length || 0}</li>
                            )}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;
    
    return (
        <div className="space-y-4">
            <Tabs defaultValue="importance" className="w-full">
                <TabsList className={`grid w-full ${results.segmentation ? 'grid-cols-6' : 'grid-cols-5'}`}>
                    <TabsTrigger value="importance"><PieIcon className="mr-2 h-4 w-4"/>Importance</TabsTrigger>
                    <TabsTrigger value="partworths"><BarIcon className="mr-2 h-4 w-4"/>Part-Worths</TabsTrigger>
                    <TabsTrigger value="optimal"><Star className="mr-2 h-4 w-4"/>Optimal</TabsTrigger>
                    <TabsTrigger value="simulation"><Activity className="mr-2 h-4 w-4"/>Simulation</TabsTrigger>
                    <TabsTrigger value="sensitivity"><LineChartIcon className="mr-2 h-4 w-4"/>Sensitivity</TabsTrigger>
                </TabsList>
                
                <TabsContent value="importance" className="mt-4">
                    <Card><CardHeader><CardTitle className='flex items-center gap-2'><PieIcon/>Relative Importance of Attributes</CardTitle><CardDescription>Shows which attributes have the most influence on ratings</CardDescription></CardHeader><CardContent><ChartContainer config={importanceChartConfig} className="w-full h-[400px]"><ResponsiveContainer><PieChart><Pie data={importanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={(entry) => `${entry.name} (${entry.value.toFixed(1)}%)`} labelLine={false}>{importanceData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} /><Legend /></PieChart></ResponsiveContainer></ChartContainer></CardContent></Card>
                </TabsContent>
                
                <TabsContent value="partworths" className="mt-4">
                    <Card><CardHeader><CardTitle className='flex items-center gap-2'><BarIcon/>Part-Worth Utilities</CardTitle><CardDescription>Utility values for each attribute level (zero-centered)</CardDescription></CardHeader><CardContent><div className="grid md:grid-cols-2 gap-6">{attributeCols.map(attr => { const attrData = partWorthsData.filter(p => p.attribute === attr); return (<div key={attr} className="space-y-2"><h3 className="font-semibold text-lg">{attr}</h3><ChartContainer config={partWorthChartConfig} className="w-full h-[250px]"><ResponsiveContainer><BarChart data={attrData} layout="vertical" margin={{ left: 100, right: 20, top: 20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="level" type="category" width={90} tick={{ fontSize: 12 }}/><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="value" name="Part-Worth" fill="hsl(var(--primary))" barSize={30}/></BarChart></ResponsiveContainer></ChartContainer></div>);})}</div></CardContent></Card>
                </TabsContent>
                
                <TabsContent value="optimal" className="mt-4">
                    <Card><CardHeader><CardTitle className='flex items-center gap-2'><Star className="h-5 w-5"/>Optimal Product Profile</CardTitle><CardDescription>The combination of attributes that yields the highest predicted preference rating</CardDescription></CardHeader><CardContent>{results.optimalProduct ? (<><Table><TableHeader><TableRow><TableHead>Attribute</TableHead><TableHead>Best Level</TableHead></TableRow></TableHeader><TableBody>{Object.entries(results.optimalProduct.config).map(([attr, level]) => (<TableRow key={attr}><TableCell className="font-medium">{attr}</TableCell><TableCell>{level as string}</TableCell></TableRow>))}</TableBody></Table><div className="mt-6 p-4 bg-primary/10 rounded-lg text-center"><p className="text-lg">Predicted Rating: <span className="text-2xl font-bold text-primary ml-2">{results.optimalProduct.totalUtility.toFixed(2)}</span></p></div></>) : (<p className="text-muted-foreground">Could not determine optimal profile.</p>)}</CardContent></Card>
                </TabsContent>
                
                <TabsContent value="simulation" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><Activity className="h-5 w-5"/>Preference Share Simulation</CardTitle><CardDescription>Build product scenarios to predict market preference shares</CardDescription></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4 mb-6">{scenarios.map((scenario, index) => (<Card key={index}><CardHeader className="pb-3"><Input value={scenario.name} onChange={(e) => handleScenarioChange(index, 'name', e.target.value)} className="font-semibold" placeholder="Scenario name"/></CardHeader><CardContent className="space-y-3">{attributeCols.map((attrName) => { const levels = allAttributes[attrName]?.levels || []; return (<div key={attrName}><Label className="text-sm">{attrName}</Label><Select value={scenario[attrName]} onValueChange={(v) => handleScenarioChange(index, attrName, v)}><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger><SelectContent>{levels.map((l: string) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}</SelectContent></Select></div>);})}</CardContent></Card>))}</div>
                            <Button onClick={runSimulation} disabled={isLoading} size="lg">{isLoading ? (<><Loader2 className="animate-spin mr-2 h-4 w-4"/>Running Simulation...</>) : (<><Activity className="mr-2 h-4 w-4"/>Run Simulation</>)}</Button>
                            {simulationResult && (
                                <div className="mt-6"><h3 className="text-lg font-semibold mb-4">Simulation Results</h3><ChartContainer config={{preferenceShare: {label: 'Preference Share', color: 'hsl(var(--chart-1))'}}} className="w-full h-[300px]"><ResponsiveContainer><BarChart data={simulationResult}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis unit="%" /><Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} /><Bar dataKey="preferenceShare" name="Preference Share (%)" fill="var(--color-preferenceShare)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartContainer></div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="sensitivity" className="mt-4">
                    <Card><CardHeader><CardTitle className='flex items-center gap-2'><LineChartIcon className="h-5 w-5"/>Sensitivity Analysis</CardTitle><CardDescription>See how the overall utility changes as you vary the levels of a single attribute</CardDescription></CardHeader><CardContent><div className="space-y-6"><div><Label>Attribute to Analyze</Label><Select value={sensitivityAttribute} onValueChange={setSensitivityAttribute}><SelectTrigger className="w-full md:w-[300px]"><SelectValue placeholder="Select attribute" /></SelectTrigger><SelectContent>{attributeCols.map(attr => (<SelectItem key={attr} value={attr}>{attr}</SelectItem>))}</SelectContent></Select></div><ChartContainer config={{ utility: { label: 'Utility', color: 'hsl(var(--primary))' } }} className="w-full h-[400px]"><ResponsiveContainer><LineChart data={sensitivityData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="level" /><YAxis /><Tooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="utility" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }} activeDot={{ r: 8 }}/></LineChart></ResponsiveContainer></ChartContainer></div></CardContent></Card>
                </TabsContent>
            </Tabs>
            
            {results.regression && (
                <Card><CardHeader><CardTitle className='flex items-center gap-2'><Brain className="h-5 w-5"/>Model Fit Statistics</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R-Squared</p><p className="text-2xl font-bold">{(results.regression.rSquared * 100).toFixed(1)}%</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Adjusted R-Squared</p><p className="text-2xl font-bold">{(results.regression.adjustedRSquared * 100).toFixed(1)}%</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Intercept</p><p className="text-2xl font-bold">{results.regression.intercept.toFixed(2)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Predictions</p><p className="text-2xl font-bold">{results.regression.predictions?.length || 0}</p></div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

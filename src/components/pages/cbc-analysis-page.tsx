
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
import { Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, Network, LineChart as LineChartIcon, Activity, HelpCircle, MoveRight, Star, TrendingUp, CheckCircle, Users } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, Bar } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import type { Survey, SurveyResponse, Question } from '@/entities/Survey';
import { Input } from '../ui/input';

interface CbcResults {
    partWorths: { attribute: string, level: string, value: number }[];
    importance: { attribute: string, importance: number }[];
    regression: {
        rSquared: number | null;
        modelType: string;
    };
    respondentLevel?: {
        partWorths: {[key: string]: { attribute: string, level: string, value: number }[]};
        importance: {[key: string]: { attribute: string, importance: number }[]};
    };
    simulation?: any;
}

interface FullAnalysisResponse {
    results: CbcResults;
    error?: string;
}

interface Scenario {
    name: string;
    [key: string]: string;
}

interface CbcPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function CbcAnalysisPage({ survey, responses }: CbcPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Advanced features state
    const [scenarios, setScenarios] = useState<Scenario[]>([
        { name: 'Scenario 1' }, { name: 'Scenario 2' }, { name: 'Scenario 3' }
    ]);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [sensitivityAttribute, setSensitivityAttribute] = useState<string | undefined>();
    
    const conjointQuestion = useMemo(() => survey.questions.find(q => q.type === 'conjoint'), [survey]);
    const allAttributes = useMemo(() => {
        if (!conjointQuestion || !conjointQuestion.attributes) return {};
        const attributesObj: any = {};
        conjointQuestion.attributes.forEach(attr => {
            attributesObj[attr.name] = {
                name: attr.name,
                type: 'categorical',
                levels: attr.levels,
                includeInAnalysis: true,
            };
        });
        return attributesObj;
    }, [conjointQuestion]);

    const attributeCols = useMemo(() => Object.keys(allAttributes), [allAttributes]);

    const handleAnalysis = useCallback(async (simulationScenarios?: Scenario[]) => {
        if (!conjointQuestion || !responses || responses.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No conjoint question or responses found for this survey.' });
            setIsLoading(false);
            return;
        }

        const analysisData: any[] = [];
        responses.forEach(resp => {
            const answerBlock = (resp.answers as any)[conjointQuestion.id];
            if (!answerBlock || typeof answerBlock !== 'object') return;

            Object.entries(answerBlock).forEach(([taskKey, chosenProfileId]) => {
                const presentedProfiles = (conjointQuestion.profiles || []).filter((p: any) => p.taskId === taskKey);
                if (presentedProfiles.length > 0) {
                    presentedProfiles.forEach((profile: any) => {
                         analysisData.push({
                            'respondent_id': resp.id,
                            'choice_set_id': taskKey,
                            ...profile.attributes,
                            chosen: profile.id === chosenProfileId ? 1 : 0
                        });
                    });
                }
            });
        });


        if (analysisData.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No valid choices found in responses. The data might not be structured correctly for CBC analysis.' });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        if (!simulationScenarios) {
            setAnalysisResult(null);
            setSimulationResult(null);
        }

        const attributesForBackend = attributeCols.reduce((acc, attrName) => {
            if (allAttributes[attrName]) {
                acc[attrName] = { ...allAttributes[attrName], type: 'categorical' };
            }
            return acc;
        }, {} as any);

        try {
            const response = await fetch('/api/analysis/conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    attributes: attributesForBackend,
                    scenarios: simulationScenarios
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);

            if (simulationScenarios && result.results.simulation) {
                setSimulationResult(result.results.simulation);
                toast({ title: 'Simulation Complete', description: 'Market shares have been predicted.'});
            } else {
                setAnalysisResult(result);
                toast({ title: 'CBC Analysis Complete', description: 'Part-worths and importance have been calculated.' });
            }

        } catch (e: any) {
            console.error('CBC error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [conjointQuestion, responses, toast, attributeCols, allAttributes]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    const { importanceData, partWorthsData, optimalProduct, respondentUtilities } = useMemo(() => {
        if (!analysisResult?.results) return { importanceData: [], partWorthsData: [], optimalProduct: {config: {}, totalUtility: 0}, respondentUtilities: [] };

        const results = analysisResult.results;
        const importanceData = results.importance.map(({ attribute, importance }) => ({ name: attribute, value: importance })).sort((a,b) => b.value - a.value);
        const partWorthsData = results.partWorths;

        let totalUtility = 0;
        const config: {[key: string]: string} = {};
        if (results.partWorths) {
            attributeCols.forEach((attr: any) => {
                const relatedPartWorths = results.partWorths.filter(p => p.attribute === attr);
                if (relatedPartWorths.length > 0) {
                    const bestLevel = relatedPartWorths.reduce((max, p) => p.value > max.value ? p : max, relatedPartWorths[0]);
                    config[attr] = bestLevel.level;
                    totalUtility += bestLevel.value;
                }
            });
        }
        const optimalProduct = { config, totalUtility };
        
        const respondentUtilities = results.respondentLevel ? Object.values(results.respondentLevel.partWorths).flat() : [];

        return { importanceData, partWorthsData, optimalProduct, respondentUtilities };
    }, [analysisResult, attributeCols]);
    
    const COLORS = useMemo(() => ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'], []);
    
    const importanceChartConfig = useMemo(() => {
      if (!analysisResult) return {};
      return importanceData.reduce((acc, item, index) => {
        acc[item.name] = { label: item.name, color: COLORS[index % COLORS.length] };
        return acc;
      }, {} as any);
    }, [analysisResult, importanceData, COLORS]);

    const partWorthChartConfig = { value: { label: "Part-Worth" } };

    if (isLoading && !analysisResult) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Hierarchical Bayes estimation for CBC... This may take a moment.</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!analysisResult?.results) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <p>No analysis results to display. This may be due to a lack of data or an error during analysis.</p>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;
    
    return (
        <div className="space-y-4">
            <Tabs defaultValue="importance" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="importance"><PieIcon className="mr-2"/>Importance</TabsTrigger>
                    <TabsTrigger value="partworths"><BarIcon className="mr-2"/>Part-Worths</TabsTrigger>
                    <TabsTrigger value="utility_dist"><TrendingUp className="mr-2 h-4 w-4"/>Utility Distribution</TabsTrigger>
                    <TabsTrigger value="simulation"><Activity className="mr-2"/>Simulation</TabsTrigger>
                    <TabsTrigger value="optimal"><Star className="mr-2"/>Optimal Product</TabsTrigger>
                </TabsList>
                <TabsContent value="importance" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><PieIcon/>Relative Importance of Attributes</CardTitle></CardHeader>
                        <CardContent>
                            <ChartContainer config={importanceChartConfig} className="w-full h-[300px]">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={importanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={p => `${p.name} (${p.value.toFixed(1)}%)`}>
                                            {importanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="partworths" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><BarIcon/>Part-Worth Utilities (Average)</CardTitle></CardHeader>
                        <CardContent>
                           <div className="grid md:grid-cols-2 gap-4">
                            {attributeCols.map(attr => (
                                <div key={attr}>
                                    <h3 className="font-semibold mb-2">{attr}</h3>
                                     <ChartContainer config={partWorthChartConfig} className="w-full h-[200px]">
                                        <ResponsiveContainer>
                                            <BarChart data={partWorthsData.filter(p => p.attribute === attr)} layout="vertical" margin={{ left: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="level" type="category" width={80} />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Bar dataKey="value" name="Part-Worth" fill="hsl(var(--primary))" barSize={30}/>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </div>
                            ))}
                           </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="utility_dist" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Individual Utility Distributions</CardTitle>
                            <CardDescription>Distribution of part-worths across all respondents.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                {attributeCols.map(attr => (
                                    <div key={attr}>
                                        <h3 className="font-semibold mb-2">{attr}</h3>
                                        <ChartContainer config={{}} className="w-full h-80">
                                             <ResponsiveContainer>
                                                <BarChart data={partWorthsData.filter(p => p.attribute === attr)}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="level"/>
                                                    <YAxis />
                                                    <Tooltip content={<ChartTooltipContent />} />
                                                    <Bar dataKey="value" name="Average Utility" fill="hsl(var(--primary))" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="simulation" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Market Share Simulation</CardTitle><CardDescription>Build product scenarios to predict market preference shares.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                                {scenarios.map((scenario, index) => (
                                    <Card key={index}>
                                        <CardHeader><Input value={scenario.name} onChange={(e) => handleScenarioChange(index, 'name', e.target.value)} /></CardHeader>
                                        <CardContent className="space-y-2">
                                            {attributeCols.map((attrName) => (
                                                <div key={attrName}>
                                                    <Label>{attrName}</Label>
                                                    <Select value={scenario[attrName]} onValueChange={(v) => handleScenarioChange(index, attrName, v)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>{allAttributes[attrName].levels.map((l:any) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <Button onClick={runSimulation} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin mr-2"/> : null} Run Simulation</Button>
                            {simulationResult && (
                                <div className="mt-4">
                                    <ChartContainer config={{marketShare: {label: 'Market Share', color: 'hsl(var(--chart-1))'}}} className="w-full h-[300px]">
                                      <ResponsiveContainer>
                                          <BarChart data={simulationResult}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" />
                                              <YAxis unit="%"/>
                                              <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                              <Bar dataKey="marketShare" name="Market Share (%)" fill="var(--color-marketShare)" radius={4} />
                                          </BarChart>
                                      </ResponsiveContainer>
                                    </ChartContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="optimal" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Optimal Product Profile</CardTitle>
                            <CardDescription>The combination of attributes that yields the highest preference.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {optimalProduct ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Attribute</TableHead><TableHead>Best Level</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.entries(optimalProduct.config).map(([attr, level]) => (
                                            <TableRow key={attr}><TableCell>{attr}</TableCell><TableCell>{level}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                    <CardFooter className="text-center justify-center p-4">
                                        <p className="text-lg">Total Utility Score: <strong className="text-primary text-xl">{optimalProduct.totalUtility.toFixed(2)}</strong></p>
                                    </CardFooter>
                                </Table>
                            ) : <p>Could not determine optimal profile.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

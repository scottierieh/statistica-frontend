
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
import { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
        coefficients: {[key: string]: number};
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
    
            // 각 choice task에 대해 처리
            Object.entries(answerBlock).forEach(([taskKey, chosenProfileId]) => {
                // 해당 task에 제시된 모든 프로필 찾기
                const presentedProfiles = (conjointQuestion.profiles || []).filter(
                    (p: any) => p.taskId === taskKey
                );
                
                if (presentedProfiles.length === 0) {
                    console.warn(`No profiles found for task ${taskKey}`);
                    return;
                }
    
                // 각 프로필에 대해 행 생성 (Exploded Logit)
                presentedProfiles.forEach((profile: any) => {
                    // profile.attributes가 존재하는지 확인
                    if (!profile.attributes) {
                        console.warn(`Profile ${profile.id} missing attributes:`, profile);
                        return;
                    }
    
                    const row: any = {
                        respondent_id: resp.id,
                        choice_set_id: taskKey,
                        profile_id: profile.id,
                        // 각 속성 값 펼치기
                        ...profile.attributes,
                        // 선택 여부: 선택된 프로필은 1, 나머지는 0
                        chosen: profile.id === chosenProfileId ? 1 : 0
                    };
                    
                    analysisData.push(row);
                });
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
            const response = await fetch('/api/analysis/cbc', {
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
    
    const runSimulation = () => {
        handleAnalysis(scenarios);
    };

    const handleScenarioChange = (scenarioIndex: number, attrName: string, value: string) => {
        const newScenarios = [...scenarios];
        newScenarios[scenarioIndex] = { ...newScenarios[scenarioIndex], [attrName]: value };
        setScenarios(newScenarios);
    };
    
    const importanceData = useMemo(() => {
        if (!analysisResult?.results.importance) return [];
        return analysisResult.results.importance.map(({ attribute, importance }) => ({ name: attribute, value: importance })).sort((a,b) => b.value - a.value);
    }, [analysisResult]);

    const partWorthsData = useMemo(() => {
        if (!analysisResult?.results.partWorths) return [];
        return analysisResult.results.partWorths.filter(p => p.attribute !== 'Base');
    }, [analysisResult]);

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
                    <p className="mt-4 text-muted-foreground">Running Aggregate Logit estimation for CBC... This may take a moment.</p>
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
                <TabsList className={`grid w-full grid-cols-4`}>
                    <TabsTrigger value="importance"><PieIcon className="mr-2 h-4 w-4"/>Importance</TabsTrigger>
                    <TabsTrigger value="partworths"><BarIcon className="mr-2 h-4 w-4"/>Part-Worths</TabsTrigger>
                    <TabsTrigger value="simulation"><Activity className="mr-2 h-4 w-4"/>Simulation</TabsTrigger>
                    <TabsTrigger value="modelfit"><TrendingUp className="mr-2 h-4 w-4"/>Model Fit</TabsTrigger>
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
                        <CardHeader><CardTitle className='flex items-center gap-2'><BarIcon/>Part-Worth Utilities</CardTitle></CardHeader>
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
                <TabsContent value="modelfit" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Fit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-muted rounded-lg">
                                <p>McFadden's Pseudo R-squared</p>
                                <p className="text-3xl font-bold">{results.regression.rSquared?.toFixed(4)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- STEP INDICATOR (reusable, if needed elsewhere) --- //
const StepIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex items-center justify-center p-4">
      {[ 'Select Variables', 'Configure Attributes', 'Review Results'].map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= index ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{index + 1}</div>
            <p className={`mt-2 text-xs text-center ${currentStep >= index ? 'font-semibold' : 'text-muted-foreground'}`}>{step}</p>
          </div>
          {index < 2 && <div className={`flex-1 h-0.5 mx-2 ${currentStep > index ? 'bg-primary' : 'bg-border'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

    
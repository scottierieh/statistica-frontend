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
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    
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
        // Debug information collection
        const debug: any = {
            hasConjointQuestion: !!conjointQuestion,
            responseCount: responses?.length || 0,
            conjointQuestionId: conjointQuestion?.id,
            conjointQuestionType: conjointQuestion?.type,
            attributeCount: Object.keys(allAttributes).length,
            attributes: allAttributes,
            sampleResponses: [],
            profilesCount: conjointQuestion?.profiles?.length || 0,
            sampleProfiles: conjointQuestion?.profiles?.slice(0, 3)
        };

        if (!conjointQuestion || !responses || responses.length === 0) {
            setDebugInfo(debug);
            setError('No conjoint question or responses found for this survey.');
            setIsLoading(false);
            return;
        }

        const analysisData: any[] = [];
        let processedResponseCount = 0;
        let skippedResponseCount = 0;

        // Get all profiles from the conjoint question
        const allProfiles = conjointQuestion.profiles || [];
        
        // Group profiles into choice sets (assuming 2-3 profiles per choice set)
        // This is a simplified approach - adjust based on your actual choice set structure
        const profilesPerSet = 2; // Or 3, depending on your design
        const choiceSets: any[] = [];
        
        for (let i = 0; i < allProfiles.length; i += profilesPerSet) {
            choiceSets.push({
                setId: `set_${Math.floor(i / profilesPerSet)}`,
                profiles: allProfiles.slice(i, Math.min(i + profilesPerSet, allProfiles.length))
            });
        }

        console.log('Choice sets created:', choiceSets);

        responses.forEach((resp, respIndex) => {
            // Collect sample response structure for debugging
            if (respIndex < 3) {
                debug.sampleResponses.push({
                    responseId: resp.id,
                    answers: resp.answers,
                    answerKeys: Object.keys(resp.answers || {})
                });
            }

            const chosenProfileId = (resp.answers as any)[conjointQuestion.id];
            
            if (!chosenProfileId || typeof chosenProfileId !== 'string') {
                skippedResponseCount++;
                console.warn(`Response ${resp.id} has no valid answer for question ${conjointQuestion.id}`);
                return;
            }

            // Find which choice set contains the chosen profile
            let chosenSet = null;
            for (const set of choiceSets) {
                if (set.profiles.some((p: any) => p.id === chosenProfileId)) {
                    chosenSet = set;
                    break;
                }
            }

            if (!chosenSet) {
                // If we can't find the set, create a simple pairwise comparison
                // between the chosen profile and another random profile
                const chosenProfile = allProfiles.find((p: any) => p.id === chosenProfileId);
                const otherProfiles = allProfiles.filter((p: any) => p.id !== chosenProfileId);
                
                if (chosenProfile && otherProfiles.length > 0) {
                    // Pick a random alternative profile
                    const alternativeProfile = otherProfiles[Math.floor(Math.random() * otherProfiles.length)];
                    chosenSet = {
                        setId: `resp_${resp.id}`,
                        profiles: [chosenProfile, alternativeProfile]
                    };
                }
            }

            if (!chosenSet) {
                skippedResponseCount++;
                console.warn(`Could not create choice set for response ${resp.id}`);
                return;
            }

            // Create data rows for this choice set
            let hasValidChoices = false;
            chosenSet.profiles.forEach((profile: any) => {
                // Build attributes object from profile
                const profileAttributes: any = {};
                attributeCols.forEach(attrName => {
                    profileAttributes[attrName] = profile[attrName];
                });

                const row: any = {
                    respondent_id: resp.id,
                    choice_set_id: `${resp.id}_${chosenSet.setId}`,
                    profile_id: profile.id,
                    ...profileAttributes,
                    chosen: profile.id === chosenProfileId ? 1 : 0
                };
                
                analysisData.push(row);
                hasValidChoices = true;
            });

            if (hasValidChoices) {
                processedResponseCount++;
            }
        });
        
        debug.processedResponseCount = processedResponseCount;
        debug.skippedResponseCount = skippedResponseCount;
        debug.analysisDataCount = analysisData.length;
        debug.sampleAnalysisData = analysisData.slice(0, 10);
        setDebugInfo(debug);

        if (analysisData.length === 0) {
            setError(`No valid choice data found in responses. 
                Processed: ${processedResponseCount}/${responses.length} responses. 
                Skipped: ${skippedResponseCount} responses.
                Check console for debug information.`);
            console.error('Debug Information:', debug);
            setIsLoading(false);
            return;
        }

        console.log('Analysis Data Summary:', {
            totalRows: analysisData.length,
            uniqueRespondents: new Set(analysisData.map(d => d.respondent_id)).size,
            uniqueChoiceSets: new Set(analysisData.map(d => d.choice_set_id)).size,
            chosenCount: analysisData.filter(d => d.chosen === 1).length,
            notChosenCount: analysisData.filter(d => d.chosen === 0).length,
            sampleData: analysisData.slice(0, 5)
        });

        setIsLoading(true);
        setError(null);
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
                toast({ title: 'Analysis Complete', description: 'CBC analysis finished successfully.' });
            }

        } catch (e: any) {
            setError(e.message);
            console.error('CBC error:', e);
            console.error('Debug info:', debug);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [conjointQuestion, responses, toast, attributeCols, allAttributes]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
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
                    <p className="mt-4 text-muted-foreground">Running Multinomial Logit estimation for CBC... This may take a moment.</p>
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
         return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                
                {debugInfo && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Debug Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                                <pre className="text-xs">
                                    {JSON.stringify(debugInfo, null, 2)}
                                </pre>
                            </ScrollArea>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Check the browser console for more detailed information.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
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
            {/* Debug info display in development */}
            {debugInfo && (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle className="text-sm">Data Processing Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Total Responses</p>
                                <p className="font-semibold">{debugInfo.responseCount}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Processed</p>
                                <p className="font-semibold">{debugInfo.processedResponseCount}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Data Rows</p>
                                <p className="font-semibold">{debugInfo.analysisDataCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="importance" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="importance"><PieIcon className="mr-2 h-4 w-4"/>Importance</TabsTrigger>
                    <TabsTrigger value="partworths"><BarIcon className="mr-2 h-4 w-4"/>Part-Worths</TabsTrigger>
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
                <TabsContent value="modelfit" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Fit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-muted rounded-lg">
                                <p>McFadden's Pseudo R-squared</p>
                                <p className="text-3xl font-bold">{results.regression.rSquared?.toFixed(4)}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Model Type: {results.regression.modelType || 'Multinomial Logit'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

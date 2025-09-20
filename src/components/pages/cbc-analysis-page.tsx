
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, Network, LineChart, Activity, SlidersHorizontal } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import Image from 'next/image';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px]" />,
});

interface CbcResults {
    part_worths: { attribute: string, level: string, value: number }[];
    attribute_importance: { attribute: string, importance: number }[];
    model_fit: {
        llf: number;
        llnull: number;
        pseudo_r2: number;
    };
    regression: {
        rSquared: number;
        adjustedRSquared: number;
        rmse: number;
        mae: number;
        predictions: number[];
        residuals: number[];
        intercept: number;
        coefficients: {[key: string]: number};
    };
}

interface FullAnalysisResponse {
    results: CbcResults;
    sensitivity_plot?: string;
}

interface Scenario {
    name: string;
    [key: string]: string;
}

interface CbcPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: any) => void;
}

export default function CbcAnalysisPage({ data, allHeaders, onLoadExample }: CbcPageProps) {
    const { toast } = useToast();
    const [respondentIdCol, setRespondentIdCol] = useState<string | undefined>();
    const [altIdCol, setAltIdCol] = useState<string | undefined>();
    const [choiceCol, setChoiceCol] = useState<string | undefined>();
    const [attributeCols, setAttributeCols] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Advanced features state
    const [scenarios, setScenarios] = useState<Scenario[]>([
        { name: 'Scenario 1' }, { name: 'Scenario 2' }, { name: 'Scenario 3' }
    ]);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [sensitivityAttribute, setSensitivityAttribute] = useState<string | undefined>();
    const [sensitivityPlot, setSensitivityPlot] = useState<string | null>(null);
    const [isSensitivityLoading, setIsSensitivityLoading] = useState(false);


    const allAttributes = useMemo(() => {
        if (!data || data.length === 0) return {};
        const attributes: any = {};
        allHeaders.forEach(header => {
            attributes[header] = {
                name: header,
                levels: Array.from(new Set(data.map(row => row[header]))).sort(),
            };
        });
        return attributes;
    }, [data, allHeaders]);


    useEffect(() => {
        setRespondentIdCol(allHeaders.find(h => h.toLowerCase().includes('resp')));
        setAltIdCol(allHeaders.find(h => h.toLowerCase().includes('alt')));
        setChoiceCol(allHeaders.find(h => h.toLowerCase().includes('choice')));
        const initialAttributes = allHeaders.filter(h => !['resp.id', 'alt', 'choice'].includes(h.toLowerCase()));
        setAttributeCols(initialAttributes);
        setAnalysisResult(null);
    }, [data, allHeaders]);

    useEffect(() => {
        if (analysisResult && attributeCols.length > 0) {
            setSensitivityAttribute(attributeCols[0]);

            const initialScenarios = [
                { name: 'Scenario 1' }, { name: 'Scenario 2' }, { name: 'Scenario 3' }
            ].map(sc => {
                const newSc: Scenario = { ...sc };
                attributeCols.forEach(attrName => {
                     newSc[attrName] = allAttributes[attrName].levels[0];
                });
                return newSc;
            });
            setScenarios(initialScenarios);
        }
    }, [analysisResult, attributeCols, allAttributes]);

    const handleAttributeChange = (header: string, checked: boolean) => {
        setAttributeCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!respondentIdCol || !altIdCol || !choiceCol || attributeCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/cbc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    respondent_id: respondentIdCol,
                    alt_id: altIdCol,
                    choice_col: choiceCol,
                    attribute_cols: attributeCols
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'CBC Analysis Complete', description: 'Part-worths and importance have been calculated.' });

        } catch (e: any) {
            console.error('CBC error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, respondentIdCol, altIdCol, choiceCol, attributeCols, toast]);
    
    const availableAttributeCols = useMemo(() => {
        return allHeaders.filter(h => ![respondentIdCol, altIdCol, choiceCol].includes(h));
    }, [allHeaders, respondentIdCol, altIdCol, choiceCol]);

    const calculateUtility = useCallback((scenario: Scenario) => {
        if (!analysisResult?.results) return 0;
        let utility = analysisResult.results.regression.intercept || 0;
        
        Object.entries(scenario).forEach(([attrName, value]) => {
            if (attrName === 'name' || !attributeCols.includes(attrName)) return;

            const worth = analysisResult.results.part_worths.find(pw => pw.attribute === attrName && String(pw.level) === String(value));
            if (worth) {
                utility += worth.value;
            }
        });
        return utility;
    }, [analysisResult, attributeCols]);
    
    const runSimulation = () => {
        const utilities = scenarios.map(scenario => calculateUtility(scenario));
        const expUtilities = utilities.map(u => Math.exp(u));
        const totalExpUtility = expUtilities.reduce((sum, exp) => sum + exp, 0);
        const marketShares = expUtilities.map(exp => (exp / totalExpUtility * 100));
        
        setSimulationResult(scenarios.map((scenario, index) => ({
            name: scenario.name,
            utility: utilities[index],
            marketShare: marketShares[index],
        })));
    };
    
    const handleScenarioChange = (scenarioIndex: number, attrName: string, value: string) => {
        const newScenarios = [...scenarios];
        newScenarios[scenarioIndex][attrName] = value;
        setScenarios(newScenarios);
    };

    const runSensitivityAnalysis = async () => {
        if (!sensitivityAttribute || !analysisResult) return;
        
        setIsSensitivityLoading(true);
        setSensitivityPlot(null);

        const baseScenario: Scenario = { name: 'base' };
        attributeCols.forEach(attrName => {
            if (attrName !== sensitivityAttribute) {
                baseScenario[attrName] = allAttributes[attrName].levels[0];
            }
        });

        const sensitivityData = allAttributes[sensitivityAttribute].levels.map((level: string) => {
            const scenario = { ...baseScenario, [sensitivityAttribute]: level };
            const utility = calculateUtility(scenario);
            return { level, utility, attribute: sensitivityAttribute };
        });

         try {
            const response = await fetch('/api/analysis/conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...analysisResult.results,
                    data,
                    attributes: allAttributes, 
                    targetVariable: 'Rating', // This might need adjustment based on data
                    sensitivityAnalysis: sensitivityData 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setSensitivityPlot(result.sensitivity_plot);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Sensitivity Analysis Error', description: e.message });
        } finally {
            setIsSensitivityLoading(false);
        }
    };
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 4, [data, allHeaders]);
    
    const results = analysisResult?.results;
    const importanceData = results ? results.attribute_importance.map(({ attribute, importance }) => ({ name: attribute, value: importance })).sort((a,b) => b.value - a.value) : [];
    const partWorthsData = results ? results.part_worths : [];
    
    const diagnosticsData = useMemo(() => {
        if (!results?.regression?.predictions || !results?.regression?.residuals) return [];
        return results.regression.predictions.map((p, i) => ({
            prediction: p,
            residual: results.regression.residuals[i]
        }));
    }, [results]);

    const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F"];
    const importanceChartConfig = useMemo(() => {
      if (!analysisResult) return {};
      return importanceData.reduce((acc, item, index) => {
        acc[item.name] = { label: item.name, color: COLORS[index % COLORS.length] };
        return acc;
      }, {} as any);
    }, [analysisResult, importanceData]);

    if (!canRun) {
        const cbcExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('cbc'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Choice-Based Conjoint (CBC) Analysis</CardTitle>
                        <CardDescription>
                           To perform CBC, you need choice data with respondent and alternative IDs, a choice indicator, and product attributes.
                        </CardDescription>
                    </CardHeader>
                    {cbcExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(cbcExamples[0])} className="w-full" size="sm">
                                <Network className="mr-2 h-4 w-4" />
                                Load {cbcExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">CBC Analysis Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div><Label>Respondent ID</Label><Select value={respondentIdCol} onValueChange={setRespondentIdCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Alternative ID</Label><Select value={altIdCol} onValueChange={setAltIdCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Choice Indicator</Label><Select value={choiceCol} onValueChange={setChoiceCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                     <div>
                        <Label>Attribute Columns</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            {availableAttributeCols.map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                    <Checkbox id={`attr-${h}`} checked={attributeCols.includes(h)} onCheckedChange={(c) => handleAttributeChange(h, c as boolean)} />
                                    <Label htmlFor={`attr-${h}`}>{h}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                     <Button onClick={handleAnalysis} disabled={isLoading || attributeCols.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            
            {results && (
                 <Tabs defaultValue="importance" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="importance"><PieIcon className="mr-2"/>Importance</TabsTrigger>
                        <TabsTrigger value="partworths"><BarIcon className="mr-2"/>Part-Worths</TabsTrigger>
                        <TabsTrigger value="simulation"><Activity className="mr-2"/>Simulation</TabsTrigger>
                        <TabsTrigger value="sensitivity"><LineChart className="mr-2"/>Sensitivity</TabsTrigger>
                        <TabsTrigger value="diagnostics"><SlidersHorizontal className="mr-2"/>Diagnostics</TabsTrigger>
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
                                         <ChartContainer config={{value: {label: 'Part-Worth'}}} className="w-full h-[200px]">
                                            <ResponsiveContainer>
                                                <BarChart data={partWorthsData.filter(p => p.attribute === attr)} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" />
                                                    <YAxis type="category" dataKey="level" width={80} />
                                                    <Tooltip content={<ChartTooltipContent />} />
                                                    <Bar dataKey="value" name="Part-Worth" fill="hsl(var(--primary))" />
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
                            <CardHeader><CardTitle>Market Share Simulation</CardTitle><CardDescription>Build product scenarios to predict market preference.</CardDescription></CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4 mb-4">
                                    {scenarios.map((scenario, index) => (
                                        <Card key={index}>
                                            <CardHeader><CardTitle>{scenario.name}</CardTitle></CardHeader>
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
                                <Button onClick={runSimulation}>Run Simulation</Button>
                                {simulationResult && (
                                    <div className="mt-4">
                                        <ChartContainer config={{marketShare: {label: 'Market Share', color: 'hsl(var(--chart-1))'}}} className="w-full h-[300px]">
                                                      <ResponsiveContainer width="100%" height={300}>
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
                    <TabsContent value="sensitivity" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle>Sensitivity Analysis</CardTitle><CardDescription>See how preference changes when one attribute level is varied.</CardDescription></CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 mb-4">
                                    <Label>Attribute to Analyze</Label>
                                    <Select value={sensitivityAttribute} onValueChange={setSensitivityAttribute}>
                                        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>{attributeCols.map((attr) => <SelectItem key={attr} value={attr}>{attr}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button onClick={runSensitivityAnalysis} disabled={isSensitivityLoading}>
                                        {isSensitivityLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                        Analyze
                                    </Button>
                                </div>
                                {isSensitivityLoading && <Skeleton className="h-[300px] w-full" />}
                                {sensitivityPlot && !isSensitivityLoading && (
                                    <div className="h-[300px] w-full">
                                         <Image src={`data:image/png;base64,${sensitivityPlot}`} alt="Sensitivity Analysis Plot" width={800} height={500} className="w-full h-full object-contain rounded-md border"/>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="diagnostics" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle>Model Diagnostics</CardTitle><CardDescription>Check the quality of the underlying regression model.</CardDescription></CardHeader>
                            <CardContent>
                                <h3 className="font-bold text-lg mb-2">Model Performance</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R²</p><p className="text-2xl font-bold">{results.regression.rSquared.toFixed(3)}</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Adjusted R²</p><p className="text-2xl font-bold">{results.regression.adjustedRSquared.toFixed(3)}</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">RMSE</p><p className="text-2xl font-bold">{results.regression.rmse.toFixed(3)}</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">MAE</p><p className="text-2xl font-bold">{results.regression.mae.toFixed(3)}</p></div>
                                </div>
                                <Card>
                                    <CardHeader><CardTitle>Residuals vs. Fitted</CardTitle></CardHeader>
                                    <CardContent>
                                        <ChartContainer config={{}} className="w-full h-[300px]">
                                            <ResponsiveContainer>
                                                <ScatterChart>
                                                    <CartesianGrid />
                                                    <XAxis type="number" dataKey="prediction" name="Fitted Value" />
                                                    <YAxis type="number" dataKey="residual" name="Residual" />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />}/>
                                                    {diagnosticsData.length > 0 &&
                                                        <Scatter data={diagnosticsData} fill="hsl(var(--primary))" />
                                                    }
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                 </Card>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
  
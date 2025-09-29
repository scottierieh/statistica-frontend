
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, Network, LineChart, Activity, SlidersHorizontal, HelpCircle, MoveRight, FileJson, DollarSign } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';

interface CbcResults {
    part_worths: { attribute: string, level: string, value: number }[];
    importance: { attribute: string, importance: number }[];
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
    targetVariable: string;
}

interface FullAnalysisResponse {
    results: CbcResults;
    sensitivity_plot?: string;
    error?: string;
}

interface Scenario {
    name: string;
    [key: string]: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const cbcExample = exampleDatasets.find(d => d.id === 'cbc-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Choice-Based Conjoint (CBC) Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Simulate real-world purchasing decisions by analyzing how customers choose between different product concepts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Choice-Based Conjoint?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           CBC is the most widely used form of conjoint analysis. Instead of rating single products, respondents are shown sets of products and asked to choose the one they would buy. This forces trade-offs and more accurately reflects actual market behavior, making it a powerful tool for predicting market share, optimizing product features, and setting prices.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Prepare Data</strong>
                                    <p className="text-sm pl-5">Your dataset needs a specific structure: each row represents one alternative within a choice set. Key columns are a Respondent ID, an Alternative ID, a 'Choice' column (1 for chosen, 0 for not), and several attribute columns.</p>
                                </li>
                                <li>
                                    <strong>Select Key Variables</strong>
                                    <p className="text-sm pl-5">Identify the Respondent ID, Alternative ID, and the binary 'Choice' column.</p>
                                </li>
                                <li>
                                    <strong>Define Attributes</strong>
                                    <p className="text-sm pl-5">Select the product features (attributes) to be included in the model.</p>
                                </li>
                                 <li>
                                    <strong>Run Analysis</strong>
                                    <p className="text-sm pl-5">The tool will run a regression to estimate the utility (part-worth) of each attribute level based on the choices made.</p>
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarIcon className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Attribute Importance</strong>
                                    <p className="text-sm pl-5">Shows which attributes (e.g., Brand, Price) have the most significant impact on consumer choice.</p>
                                </li>
                                <li>
                                    <strong>Part-Worths (Utilities)</strong>
                                    <p className="text-sm pl-5">Reveals the relative preference for each level within an attribute. Higher values indicate higher preference. For example, you can see how much more utility a price of $700 has compared to $1000.</p>
                                </li>
                                <li>
                                    <strong>Market Simulation</strong>
                                    <p className="text-sm pl-5">Create hypothetical product profiles and simulate their market share against competitors to test new product ideas and pricing strategies.</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     {cbcExample && <Button variant="outline" onClick={() => onLoadExample(cbcExample)}>Load Sample CBC Data</Button>}
                     <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface CbcPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: any) => void;
}

export default function CbcAnalysisPage({ data, allHeaders, onLoadExample }: CbcPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
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

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 4, [data, allHeaders]);

    const allAttributes = useMemo(() => {
        if (!canRun) return {};
        const attributes: any = {};
        allHeaders.forEach(header => {
            const values = Array.from(new Set(data.map(row => row[header]))).sort();
            attributes[header] = {
                name: header,
                type: 'categorical', // Always treat as categorical for CBC
                levels: values,
            };
        });
        return attributes;
    }, [data, allHeaders, canRun]);


    useEffect(() => {
        setRespondentIdCol(allHeaders.find(h => h.toLowerCase().includes('resp')));
        setAltIdCol(allHeaders.find(h => h.toLowerCase().includes('alt')));
        setChoiceCol(allHeaders.find(h => h.toLowerCase().includes('choice') || h.toLowerCase().includes('rating')));
        const initialAttributes = allHeaders.filter(h => !['resp.id', 'alt', 'choice', 'rating'].some(keyword => h.toLowerCase().includes(keyword)));
        setAttributeCols(initialAttributes);
        setAnalysisResult(null);
        setView(data.length === 0 ? 'intro' : 'main');
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
        if (!choiceCol || attributeCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target/choice variable and at least one attribute.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const attributesForBackend = attributeCols.reduce((acc, attrName) => {
            if (allAttributes[attrName]) {
                acc[attrName] = { ...allAttributes[attrName], includeInAnalysis: true };
            }
            return acc;
        }, {} as any);

        try {
            const response = await fetch('/api/analysis/cbc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    attributes: attributesForBackend,
                    targetVariable: choiceCol
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            toast({ title: 'CBC Analysis Complete', description: 'Part-worths and importance have been calculated.' });

        } catch (e: any) {
            console.error('CBC error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, choiceCol, attributeCols, allAttributes, toast]);
    
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
        if (!sensitivityAttribute || !analysisResult?.results) return;
        
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
            const attributesForBackend = attributeCols.reduce((acc, attrName) => {
                if (allAttributes[attrName]) {
                    acc[attrName] = { ...allAttributes[attrName], includeInAnalysis: true };
                }
                return acc;
            }, {} as any);

            const response = await fetch('/api/analysis/cbc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data,
                    attributes: attributesForBackend, 
                    targetVariable: choiceCol,
                    sensitivityAnalysis: sensitivityData 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            
            setSensitivityPlot(result.sensitivity_plot || null);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Sensitivity Analysis Error', description: e.message });
        } finally {
            setIsSensitivityLoading(false);
        }
    };
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (!canRun) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Choice-Based Conjoint (CBC) Analysis</CardTitle>
                        <CardDescription>
                           To perform CBC, you need choice data with respondent and alternative IDs, a choice indicator, and product attributes.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const results = analysisResult?.results;
    const importanceData = results ? results.importance.map(({ attribute, importance }) => ({ name: attribute, value: importance })).sort((a,b) => b.value - a.value) : [];
    const partWorthsData = results ? results.part_worths : [];
    
    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    const importanceChartConfig = useMemo(() => {
      if (!analysisResult) return {};
      return importanceData.reduce((acc, item, index) => {
        acc[item.name] = { label: item.name, color: COLORS[index % COLORS.length] };
        return acc;
      }, {} as any);
    }, [analysisResult, importanceData]);

    const partWorthChartConfig = { value: { label: "Part-Worth" } };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">CBC Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div><Label>Respondent ID</Label><Select value={respondentIdCol} onValueChange={setRespondentIdCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Alternative ID</Label><Select value={altIdCol} onValueChange={setAltIdCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Choice / Rating</Label><Select value={choiceCol} onValueChange={setChoiceCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="importance"><PieIcon className="mr-2"/>Importance</TabsTrigger>
                        <TabsTrigger value="partworths"><BarIcon className="mr-2"/>Part-Worths</TabsTrigger>
                        <TabsTrigger value="simulation"><Activity className="mr-2"/>Simulation</TabsTrigger>
                        <TabsTrigger value="sensitivity"><LineChart className="mr-2"/>Sensitivity</TabsTrigger>
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
                                                    <YAxis type="category" dataKey="level" width={80} />
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
                                {isSensitivityLoading ? <Skeleton className="h-[300px] w-full" /> : sensitivityPlot && (
                                    <div className="h-[300px] w-full">
                                         <Image src={sensitivityPlot} alt="Sensitivity Analysis Plot" width={800} height={500} className="w-full h-full object-contain rounded-md border"/>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

```
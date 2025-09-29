
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

interface AnalysisResults {
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
    partWorths: {
        attribute: string;
        level: string;
        value: number;
    }[];
    importance: {
        attribute: string;
        importance: number;
    }[];
    targetVariable: string;
}

interface FullAnalysisResponse {
    results: AnalysisResults;
    sensitivity_plot?: string;
    error?: string;
}

interface Scenario {
    name: string;
    [key: string]: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const conjointExample = exampleDatasets.find(d => d.id === 'conjoint-smartphone');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Conjoint Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A powerful market research technique to understand how customers value different attributes of a product or service.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Conjoint Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           When a customer decides to buy a product, they implicitly weigh its different features—like price, brand, and quality. Conjoint analysis deconstructs this decision-making process by presenting customers with a series of product profiles and analyzing their preferences. This allows you to quantify the value, or 'utility', of each attribute and level, revealing what truly drives customer choice. It's an essential tool for making data-driven decisions about product design, pricing, and feature prioritization.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Step-by-Step Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Prepare Data:</strong> Your dataset should contain various product profiles, where each row represents a unique combination of attributes and includes a consumer preference score (e.g., a rating from 1-10).
                                </li>
                                <li>
                                    <strong>Select Target Variable:</strong> Choose the column that represents the preference score or rating. This will be the dependent variable in the analysis.
                                </li>
                                <li>
                                    <strong>Define Attributes:</strong> Select the product/service features to be included in the analysis. The tool will automatically detect if they are categorical or numerical.
                                </li>
                                 <li>
                                    <strong>Run Analysis:</strong> Click 'Run Analysis' to perform the regression-based conjoint analysis, which calculates part-worths and attribute importance.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarIcon className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Relative Importance:</strong> This shows the influence of each attribute on the consumer's overall decision, expressed as a percentage. A higher percentage means the attribute is a more critical driver of choice.
                                </li>
                                <li>
                                    <strong>Part-Worths (Utilities):</strong> These are numerical scores representing the utility or preference for each level of an attribute. Higher values indicate higher preference. The baseline level for each attribute is always set to zero.
                                </li>
                                <li>
                                    <strong>Market Simulation:</strong> Create virtual product scenarios to predict their market share. This powerful feature helps you identify the optimal combination of attributes to maximize consumer preference.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     {conjointExample && <Button variant="outline" onClick={() => onLoadExample(conjointExample)}>Start with Sample Data</Button>}
                     <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface CbcAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: any) => void;
}

export default function CbcAnalysisPage({ data, allHeaders, onLoadExample }: CbcAnalysisPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState(0);
    const [targetVariable, setTargetVariable] = useState<string | undefined>();
    const [attributes, setAttributes] = useState<any>({});
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // State for advanced features
    const [scenarios, setScenarios] = useState<Scenario[]>([
        { name: 'Scenario 1' }, { name: 'Scenario 2' }, { name: 'Scenario 3' }
    ]);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [sensitivityAttribute, setSensitivityAttribute] = useState<string | undefined>();
    const [sensitivityPlot, setSensitivityPlot] = useState<string | null>(null);
    const [isSensitivityLoading, setIsSensitivityLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);

    const independentVariables = useMemo(() => Object.values(attributes).filter((attr: any) => attr.includeInAnalysis), [attributes]);
    
    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

    const results = analysisResult;
    const partWorthsData = results ? results.partWorths : [];

    const importanceChartConfig = useMemo(() => {
      if (!analysisResult) return {};
      return analysisResult.importance.reduce((acc, item, index) => {
        acc[item.attribute] = { label: item.attribute, color: COLORS[index % COLORS.length] };
        return acc;
      }, {} as any);
    }, [analysisResult]);

    const partWorthChartConfig = { value: { label: "Part-Worth" } };

    useEffect(() => {
        if (!canRun) {
            setView('intro');
            return;
        };

        const initialTarget = allHeaders.find(h => h.toLowerCase().includes('rating') || h.toLowerCase().includes('score') || h.toLowerCase().includes('preference')) || allHeaders[allHeaders.length - 1];
        setTargetVariable(initialTarget);

        const initialAttributes: any = {};
        allHeaders.forEach(header => {
            const values = Array.from(new Set(data.map(row => row[header]))).sort();
            const isNumeric = values.every(v => typeof v === 'number' || !isNaN(Number(v)));
            initialAttributes[header] = {
                name: header,
                type: isNumeric && values.length > 5 ? 'numerical' : 'categorical',
                levels: values,
                includeInAnalysis: !header.toLowerCase().includes('id') && header !== initialTarget
            };
        });
        setAttributes(initialAttributes);
        setCurrentStep(0);
        setAnalysisResult(null);
        setSimulationResult(null);
        setSensitivityPlot(null);
    }, [data, allHeaders, canRun]);
    
    useEffect(() => {
        if (analysisResult) {
            const firstAttribute = Object.keys(attributes).find(attr => attributes[attr].includeInAnalysis);
            setSensitivityAttribute(firstAttribute);

            const initialScenarios = [
                { name: 'Scenario 1' }, { name: 'Scenario 2' }, { name: 'Scenario 3' }
            ].map(sc => {
                const newSc: Scenario = { ...sc };
                Object.keys(attributes).forEach(attrName => {
                    if (attributes[attrName].includeInAnalysis) {
                        newSc[attrName] = attributes[attrName].levels[0];
                    }
                });
                return newSc;
            });
            setScenarios(initialScenarios);
        }
    }, [analysisResult, attributes]);

    const handleAttributeUpdate = (attrName: string, key: string, value: any) => {
        setAttributes((prev: any) => ({
            ...prev,
            [attrName]: { ...prev[attrName], [key]: value }
        }));
        if(key === 'includeInAnalysis' && value === true && targetVariable === attrName) {
            setTargetVariable(undefined);
        }
    };
    
    const handleTargetVarChange = (value: string) => {
        setTargetVariable(value);
        if (attributes[value]) {
            handleAttributeUpdate(value, 'includeInAnalysis', false);
        }
        if(targetVariable && attributes[targetVariable]) {
            handleAttributeUpdate(targetVariable, 'includeInAnalysis', true);
        }
    }

    const calculateUtility = useCallback((scenario: Scenario) => {
        if (!analysisResult?.regression) return 0;
        let utility = analysisResult.regression.intercept || 0;
        const { coefficients } = analysisResult.regression;

        Object.entries(scenario).forEach(([attrName, value]) => {
            if (attrName === 'name' || !attributes[attrName] || !attributes[attrName].includeInAnalysis) return;

            const attr = attributes[attrName];
            const cleanAttrName = attrName.replace(/[^A-Za-z0-9_]/g, '_');
            const cleanValue = String(value).replace(/[^A-Za-z0-9_.]/g, '_');
            if (attr.type === 'categorical') {
                if (String(value) !== String(attr.levels[0])) {
                    const paramName = `C(Q("${cleanAttrName}"))[T.${cleanValue}]`;
                    utility += coefficients[paramName] || 0;
                }
            } else {
                 const paramName = `Q("${cleanAttrName}")`;
                 utility += (coefficients[paramName] || 0) * Number(value);
            }
        });
        return utility;
    }, [analysisResult, attributes]);
    
    const runSimulation = () => {
        const utilities = scenarios.map(scenario => calculateUtility(scenario));
        const expUtilities = utilities.map(u => Math.exp(u));
        const totalExpUtility = expUtilities.reduce((sum, exp) => sum + exp, 0);
        const marketShares = expUtilities.map(exp => (totalExpUtility > 0 ? (exp / totalExpUtility * 100) : 0));
        
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

        const sensitivityData = attributes[sensitivityAttribute].levels.map((level: string) => {
            const scenario: Scenario = { name: 'base', [sensitivityAttribute]: level };
             Object.keys(attributes).forEach(attrName => {
                if(attributes[attrName].includeInAnalysis && attrName !== sensitivityAttribute) {
                    scenario[attrName] = attributes[attrName].levels[0];
                }
            });
            const utility = calculateUtility(scenario);
            return { level, utility, attribute: sensitivityAttribute };
        });

         try {
            const attributesForBackend = independentVariables.reduce((acc, attr: any) => {
                acc[attr.name] = { ...attr };
                return acc;
            }, {} as any);

            const response = await fetch('/api/analysis/conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data,
                    attributes: attributesForBackend, 
                    targetVariable,
                    sensitivityAnalysis: sensitivityData 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: { sensitivity_plot?: string, error?: string } = await response.json();
            if (result.error) throw new Error(result.error);
            
            setSensitivityPlot(result.sensitivity_plot || null);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Sensitivity Analysis Error', description: e.message });
        } finally {
            setIsSensitivityLoading(false);
        }
    };
    
    const runAnalysis = useCallback(async () => {
        if (!targetVariable) {
            toast({
                title: "Target variable not set",
                description: "Please select a target variable to continue.",
                variant: "destructive"
            });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/analysis/conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, attributes, targetVariable })
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result.results);
            setCurrentStep(2);
            toast({ title: 'Analysis Complete', description: 'Conjoint analysis results are ready.' });
        } catch (error: any) {
            toast({ title: 'Analysis Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [data, attributes, targetVariable, toast]);

    const conjointExample = exampleDatasets.find(d => d.id === 'conjoint-smartphone');
    
    if (view === 'intro') {
       return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <StepIndicator currentStep={currentStep} />
            
            {currentStep === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Target /> Step 1: Select Target Variable</CardTitle>
                        <CardDescription>Choose the column that represents the user's rating or preference.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label>Target Variable (e.g., Rating, Score)</Label>
                        <Select value={targetVariable} onValueChange={handleTargetVarChange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={() => setCurrentStep(1)} disabled={!targetVariable}>Next: Configure Attributes</Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings /> Step 2: Configure Attributes</CardTitle>
                        <CardDescription>Review auto-detected attributes and types. Ensure correct variables are included for analysis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-72">
                            <div className="space-y-4">
                                {Object.values(attributes).map((attr: any) => (
                                    <div key={attr.name} className="p-3 border rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">{attr.name}</span>
                                            {attr.name !== targetVariable && (
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id={`include-${attr.name}`} checked={attr.includeInAnalysis} onCheckedChange={(c) => handleAttributeUpdate(attr.name, 'includeInAnalysis', c)} />
                                                    <Label htmlFor={`include-${attr.name}`}>Include</Label>
                                                </div>
                                            )}
                                        </div>
                                         <p className="text-xs text-muted-foreground">{attr.levels.length} levels detected.</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(0)}>Back</Button>
                        <Button onClick={runAnalysis} disabled={isLoading || independentVariables.length < 1}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sigma className="mr-2" />}
                            Run Analysis
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 2 && analysisResult && (
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Brain/> Step 3: Analysis Results</CardTitle>
                            <CardDescription>Review the calculated part-worths and attribute importance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="importance">
                                <TabsList>
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
                                                        <Pie data={analysisResult.importance} dataKey="importance" nameKey="attribute" cx="50%" cy="50%" outerRadius={100} label={p => `${p.attribute} (${p.importance.toFixed(1)}%)`}>
                                                            {analysisResult.importance.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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
                                            {independentVariables.map((attr: any) => (
                                                <div key={attr.name}>
                                                    <h3 className="font-semibold mb-2">{attr.name}</h3>
                                                     <ChartContainer config={partWorthChartConfig} className="w-full h-[200px]">
                                                        <ResponsiveContainer>
                                                            <BarChart data={partWorthsData.filter(p => p.attribute === attr.name)} layout="vertical" margin={{ left: 80 }}>
                                                                <CartesianGrid strokeDasharray="3 3" />
                                                                <XAxis type="number" />
                                                                <YAxis type="category" dataKey="level" width={100} tick={{ fontSize: 12 }} />
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
                                                            {independentVariables.map((attr: any) => (
                                                                <div key={attr.name}>
                                                                    <Label>{attr.name}</Label>
                                                                    <Select value={scenario[attr.name]} onValueChange={(v) => handleScenarioChange(index, attr.name, v)}>
                                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                                        <SelectContent>{attr.levels.map((l:any) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
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
                                                    <SelectContent>{independentVariables.map((attr: any) => <SelectItem key={attr.name} value={attr.name}>{attr.name}</SelectItem>)}</SelectContent>
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
                        </CardContent>
                    </Card>

                    <div className="flex justify-between">
                         <Button variant="outline" onClick={() => setCurrentStep(1)}>Back to Configuration</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex items-center justify-center p-4">
      {[ 'Select Target', 'Configure Attributes', 'Review Results'].map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= index ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {index + 1}
            </div>
            <p className={`mt-2 text-xs text-center ${currentStep >= index ? 'font-semibold' : 'text-muted-foreground'}`}>{step}</p>
          </div>
          {index < 2 && <div className={`flex-1 h-0.5 mx-2 ${currentStep > index ? 'bg-primary' : 'bg-border'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

    
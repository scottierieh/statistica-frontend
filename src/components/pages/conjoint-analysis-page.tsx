
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, Network, LineChart, Activity, SlidersHorizontal, HelpCircle, MoveRight } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px]" />,
});

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

interface Scenario {
    name: string;
    [key: string]: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
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
                    <CardTitle className="font-headline text-4xl font-bold">컨조인트 분석 (Conjoint Analysis)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        제품이나 서비스가 가진 여러 속성들이 소비자의 선택에 얼마나 큰 영향을 미치는지 분석하는 기법입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">컨조인트 분석이란?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            소비자는 제품을 구매할 때 가격, 브랜드, 디자인, 성능 등 여러 속성을 종합적으로 고려합니다. 컨조인트 분석은 이러한 복잡한 의사결정 과정을 통계적으로 분석하여, 각 속성이 소비자의 선호도에 얼마나 기여하는지를 '부분 가치(Part-Worth)'라는 수치로 계산해냅니다. 이를 통해 어떤 속성의 조합이 가장 높은 선호도를 보이는지 파악할 수 있습니다.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> 분석 단계 가이드</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>데이터 준비</strong>
                                    <p className="text-sm pl-5">다양한 속성 조합(프로필)과 그에 대한 소비자 선호도(평점, 점수 등) 데이터가 필요합니다.</p>
                                </li>
                                <li>
                                    <strong>목표 변수 선택</strong>
                                    <p className="text-sm pl-5">분석의 기준이 될 '선호도 평점' 열을 선택합니다.</p>
                                </li>
                                <li>
                                    <strong>속성 정의</strong>
                                    <p className="text-sm pl-5">분석에 사용할 제품/서비스의 속성(Feature)들을 선택하고, 각 속성의 유형(범주형/수치형)을 확인합니다.</p>
                                </li>
                                 <li>
                                    <strong>분석 실행</strong>
                                    <p className="text-sm pl-5">'Run Analysis' 버튼을 클릭하여 회귀분석 기반의 컨조인트 분석을 실행합니다.</p>
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarIcon className="text-primary"/> 결과 해석 가이드</h3>
                             <ul className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>상대적 중요도 (Relative Importance)</strong>
                                    <p className="text-sm pl-5">각 속성이 소비자의 전체 선호도 결정에 얼마나 큰 영향을 미치는지를 백분율로 나타냅니다. 중요도가 높을수록 핵심적인 속성입니다.</p>
                                </li>
                                <li>
                                    <strong>부분 가치 (Part-Worths)</strong>
                                    <p className="text-sm pl-5">각 속성의 개별 수준(level)이 갖는 효용(utility) 값입니다. 이 값이 높을수록 해당 수준에 대한 선호도가 높다는 의미입니다. 기준 수준(base level)의 부분 가치는 항상 0입니다.</p>
                                </li>
                                <li>
                                    <strong>시뮬레이션</strong>
                                    <p className="text-sm pl-5">다양한 가상 제품 시나리오를 만들어 시장 점유율을 예측해볼 수 있습니다. 이를 통해 최적의 제품 조합을 탐색할 수 있습니다.</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">주요 활용 분야</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Brain className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">신제품 개발</h4><p className="text-xs text-muted-foreground">가장 선호되는 기능 조합을 찾아냅니다.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dollar-sign"><path d="M12 3v18"/><path d="M5 9h14"/><path d="M5 15h14"/></svg><div><h4 className="font-semibold">가격 전략</h4><p className="text-xs text-muted-foreground">소비자가 수용 가능한 최적의 가격을 설정합니다.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pie-chart"><path d="M21.21 15.89A10 10 0 1 1 8 2.79"/><path d="M22 12A10 10 0 0 0 12 2v10h10z"/></svg><div><h4 className="font-semibold">시장 세분화</h4><p className="text-xs text-muted-foreground">특정 속성을 선호하는 고객 그룹을 파악합니다.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Target className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">브랜드 자산</h4><p className="text-xs text-muted-foreground">브랜드가 선호도에 미치는 영향을 측정합니다.</p></div></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     {conjointExample && <Button variant="outline" onClick={() => onLoadExample(conjointExample)}>샘플 데이터로 시작하기</Button>}
                     <Button size="lg" onClick={onStart}>새 분석 시작하기 <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface ConjointAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: any) => void;
}

export default function ConjointAnalysisPage({ data, allHeaders, onLoadExample }: ConjointAnalysisPageProps) {
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
    const [sensitivityResult, setSensitivityResult] = useState<any>(null);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);

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
        setSensitivityResult(null);
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

    const runAnalysis = useCallback(async () => {
        if (!targetVariable) {
            toast({ title: 'Target variable not set', description: 'Please select a target variable to continue.', variant: 'destructive' });
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
            setAnalysisResult(result);
            setCurrentStep(2);
            toast({ title: 'Analysis Complete', description: 'Conjoint analysis results are ready.' });
        } catch (error: any) {
            toast({ title: 'Analysis Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [data, attributes, targetVariable, toast]);

    const independentVariables = useMemo(() => Object.values(attributes).filter((attr: any) => attr.includeInAnalysis), [attributes]);
    
    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

    const importanceChartConfig = useMemo(() => {
      if (!analysisResult) return {};
      return analysisResult.importance.reduce((acc, item, index) => {
        acc[item.attribute] = { label: item.attribute, color: COLORS[index % COLORS.length] };
        return acc;
      }, {} as any);
    }, [analysisResult]);

    const partWorthChartConfig = { value: { label: "Part-Worth" } };

    const calculateUtility = useCallback((scenario: Scenario) => {
        if (!analysisResult) return 0;
        let utility = analysisResult.regression.intercept || 0;
        const { coefficients } = analysisResult.regression;

        Object.entries(scenario).forEach(([attrName, value]) => {
            if (attrName === 'name' || !attributes[attrName] || !attributes[attrName].includeInAnalysis) return;

            const attr = attributes[attrName];
            if (attr.type === 'categorical') {
                if (String(value) !== String(attr.levels[0])) {
                    const featureName = `${attrName}_${value}`;
                    utility += coefficients[featureName] || 0;
                }
            } else {
                // Not implemented for numerical in this version as per the Python script
            }
        });
        return utility;
    }, [analysisResult, attributes]);
    
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

    const runSensitivityAnalysis = () => {
        if (!sensitivityAttribute) return;
        
        const baseScenario: Scenario = { name: 'base' };
        Object.keys(attributes).forEach(attrName => {
            if(attributes[attrName].includeInAnalysis) {
                baseScenario[attrName] = attributes[attrName].levels[0];
            }
        });

        const results = attributes[sensitivityAttribute].levels.map((level: string) => {
            const scenario = { ...baseScenario, [sensitivityAttribute]: level };
            const utility = calculateUtility(scenario);
            return { level, utility };
        });
        setSensitivityResult(results);
    };
    
    const sensitivityChartConfig = {
      utility: {
        label: 'Utility',
        color: 'hsl(var(--chart-1))',
      },
    };

    if (!canRun || view === 'intro') {
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
                                    <TabsTrigger value="diagnostics"><SlidersHorizontal className="mr-2"/>Diagnostics</TabsTrigger>
                                </TabsList>
                                <TabsContent value="importance" className="mt-4">
                                    <Card>
                                        <CardHeader><CardTitle className='flex items-center gap-2'><PieIcon/>Relative Importance of Attributes</CardTitle></CardHeader>
                                        <CardContent>
                                            <ChartContainer config={importanceChartConfig} className="w-full h-[300px]">
                                                <ResponsiveContainer width="100%" height={300}>
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
                                            <ChartContainer config={partWorthChartConfig} className="w-full h-[400px]">
                                                <ResponsiveContainer width="100%" height={400}>
                                                    <BarChart data={analysisResult.partWorths.filter(p => p.level !== 'coefficient')} layout="vertical" margin={{ left: 100 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" />
                                                        <YAxis dataKey="level" type="category" width={80} />
                                                        <Tooltip content={<ChartTooltipContent />} />
                                                        <Bar dataKey="value" name="Part-Worth">
                                                            {analysisResult.partWorths.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.value > 0 ? COLORS[0] : COLORS[3]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
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
                                                    <ChartContainer config={{marketShare: {label: 'Market Share', color: COLORS[0]}}} className="w-full h-[300px]">
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
                                                    <SelectContent>{independentVariables.map((attr: any) => <SelectItem key={attr.name} value={attr.name}>{attr.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <Button onClick={runSensitivityAnalysis}>Analyze</Button>
                                            </div>
                                            {sensitivityResult && (
                                                <div className="h-[300px] w-full">
                                                    <Plot
                                                        data={[
                                                            {
                                                                x: sensitivityResult.map((d: any) => d.level),
                                                                y: sensitivityResult.map((d: any) => d.utility),
                                                                type: 'scatter',
                                                                mode: 'lines+markers',
                                                                marker: {color: COLORS[4]},
                                                            },
                                                        ]}
                                                        layout={{
                                                            title: `Utility vs. ${sensitivityAttribute}`,
                                                            xaxis: { title: sensitivityAttribute },
                                                            yaxis: { title: 'Calculated Utility'},
                                                            autosize: true,
                                                        }}
                                                        style={{ width: '100%', height: '100%' }}
                                                        useResizeHandler={true}
                                                        className="w-full h-full"
                                                    />
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
                                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R²</p><p className="text-2xl font-bold">{analysisResult.regression.rSquared.toFixed(3)}</p></div>
                                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Adjusted R²</p><p className="text-2xl font-bold">{analysisResult.regression.adjustedRSquared.toFixed(3)}</p></div>
                                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">RMSE</p><p className="text-2xl font-bold">{analysisResult.regression.rmse.toFixed(3)}</p></div>
                                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">MAE</p><p className="text-2xl font-bold">{analysisResult.regression.mae.toFixed(3)}</p></div>
                                            </div>
                                             <Card>
                                                <CardHeader><CardTitle>Residuals vs. Fitted</CardTitle></CardHeader>
                                                <CardContent>
                                                    <ChartContainer config={{}} className="w-full h-[300px]">
                                                        <ResponsiveContainer width="100%" height={300}>
                                                            <ScatterChart>
                                                                <CartesianGrid />
                                                                <XAxis type="number" dataKey="prediction" name="Fitted Value" />
                                                                <YAxis type="number" dataKey="residual" name="Residual" />
                                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />}/>
                                                                {analysisResult.regression.predictions && analysisResult.regression.residuals &&
                                                                    <Scatter data={analysisResult.regression.predictions.map((p, i) => ({prediction: p, residual: analysisResult.regression.residuals[i]}))} fill="hsl(var(--primary))" />
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

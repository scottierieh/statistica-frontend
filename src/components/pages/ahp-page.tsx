
'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, Plus, Trash2, Network, BarChart as BarChartIcon, AlertTriangle, ChevronDown, ChevronRight, Share2, HelpCircle, FileJson, Building, Users, Star, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid } from 'recharts';
import { Switch } from '../ui/switch';
import { produce } from 'immer';
import DataUploader from '../data-uploader';
import { exampleDatasets } from '@/lib/example-datasets';

interface AHPResult {
    goal: string;
    analysis_results: { [key: string]: AnalysisBlock | null };
    synthesis: {
        final_weights: { [key: string]: number };
        ranking: [string, number][];
        type: 'alternatives' | 'criteria';
    };
}

interface AnalysisBlock {
    priority_vector: number[];
    lambda_max: number;
    consistency_index: number;
    consistency_ratio: number;
    is_consistent: boolean;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Share2 size={32} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">
                        계층 분석법 (AHP: Analytic Hierarchy Process)
                    </CardTitle>
                    <CardDescription className="text-lg pt-2 text-muted-foreground">
                        복잡한 다기준 의사결정 문제를 체계적으로 해결하기 위한 과학적 분석 도구
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 px-8 py-6">
                    <div className="text-base text-center">
                        <p>
                            AHP는 1970년대 Thomas L. Saaty에 의해 개발된 의사결정 방법론입니다. 여러 개의 상충하는 평가 기준이 존재할 때, 각 기준의 중요도를 파악하고 대안들을 종합적으로 평가하여 최적의 대안을 선택할 수 있도록 돕습니다. 정량적 데이터뿐만 아니라 경험, 직관과 같은 정성적 요소까지 판단에 통합할 수 있는 강력한 도구입니다.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2"><Settings className="text-primary"/> 설정 가이드</h3>
                            <ul className="list-decimal pl-5 space-y-3 text-muted-foreground">
                                <li>
                                    <strong>목표 설정 (Goal)</strong>
                                    <p className="text-xs">달성하고자 하는 최종 목표를 명확하게 정의합니다. (예: '최적의 신입사원 채용')</p>
                                </li>
                                <li>
                                    <strong>계층 구조 설계 (Hierarchy)</strong>
                                    <p className="text-xs">목표 달성을 위한 주요 평가 기준(Criteria)을 설정합니다. 필요한 경우, 각 기준을 더 세부적인 하위 기준(Sub-criteria)으로 나눌 수 있습니다.</p>
                                </li>
                                <li>
                                    <strong>대안 정의 (Alternatives)</strong>
                                    <p className="text-xs">선택 가능한 대안들을 나열합니다. (예: '후보자 A', '후보자 B') 이 단계는 선택 사항입니다.</p>
                                </li>
                                <li>
                                    <strong>쌍대 비교 (Pairwise Comparison)</strong>
                                    <p className="text-xs">각 계층 수준에서 항목들을 1:1로 비교하며 상대적 중요도(선호도)를 판단합니다. 'A가 B보다 얼마나 더 중요한가?'와 같은 질문에 답하는 과정입니다.</p>
                                </li>
                            </ul>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2"><BarChartIcon className="text-primary"/> 결과 해석</h3>
                            <ul className="list-decimal pl-5 space-y-3 text-muted-foreground">
                                <li>
                                    <strong>최종 우선순위 (Final Ranking)</strong>
                                    <p className="text-xs">모든 평가 기준과 쌍대 비교 결과를 종합하여 각 대안(또는 최하위 기준)의 최종 가중치를 보여줍니다. 점수가 가장 높은 항목이 최적의 대안입니다.</p>
                                </li>
                                <li>
                                    <strong>일관성 비율 (Consistency Ratio, CR)</strong>
                                    <p className="text-xs">쌍대 비교 과정에서 응답자가 얼마나 일관성 있게 판단했는지를 나타내는 지표입니다. 일반적으로 <strong>CR 값이 0.1 (10%) 미만</strong>일 때 판단의 일관성이 확보되었다고 봅니다. 이 값이 높으면 판단을 재검토해야 합니다.</p>
                                </li>
                                <li>
                                    <strong>가중치 (Weights)</strong>
                                    <p className="text-xs">각 계층에 있는 평가 기준과 대안들의 상대적 중요도를 수치로 보여줍니다.</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <h3 className="font-semibold text-xl flex items-center gap-2"><Building className="text-primary"/> 주요 활용 분야</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg"><Users className="mx-auto mb-2 text-primary"/><span>인사 관리<br/>(채용, 승진)</span></div>
                            <div className="p-4 bg-muted/50 rounded-lg"><Star className="mx-auto mb-2 text-primary"/><span>신제품 개발<br/>(기능 우선순위)</span></div>
                            <div className="p-4 bg-muted/50 rounded-lg"><Target className="mx-auto mb-2 text-primary"/><span>마케팅 전략<br/>(채널 선택)</span></div>
                            <div className="p-4 bg-muted/50 rounded-lg"><FileJson className="mx-auto mb-2 text-primary"/><span>정책 결정<br/>(대안 평가)</span></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6">
                     <Button variant="outline" onClick={onLoadExample}>샘플 데이터 불러오기</Button>
                     <Button size="lg" onClick={onStart}>분석 시작하기 <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const ComparisonMatrix = ({ items, matrix: initialMatrix, onMatrixChange }: { items: string[], matrix?: number[][], onMatrixChange: (matrix: number[][]) => void }) => {
    const [matrix, setMatrix] = useState<number[][]>(() => initialMatrix || Array(items.length).fill(0).map(() => Array(items.length).fill(1)));

    useEffect(() => {
        const newMatrix = initialMatrix || Array(items.length).fill(0).map(() => Array(items.length).fill(1));
        setMatrix(newMatrix);
    }, [items.join(','), initialMatrix]);

    const handleSliderChange = (value: number, i: number, j: number) => {
        const newMatrix = produce(matrix, draft => {
            if (value > 0) { // Favors item1
                draft[i][j] = value + 1;
                draft[j][i] = 1 / (value + 1);
            } else if (value < 0) { // Favors item2
                draft[i][j] = 1 / (Math.abs(value) + 1);
                draft[j][i] = Math.abs(value) + 1;
            } else { // Equal
                draft[i][j] = 1;
                draft[j][i] = 1;
            }
        });
        setMatrix(newMatrix);
        onMatrixChange(newMatrix);
    };

    const getSliderValue = (val: number) => {
        if (val >= 1) return val - 1;
        return -(1 / val - 1);
    };

    if (items.length < 2) return null;

    return (
        <div className="space-y-4">
            {items.map((item1, i) =>
                items.map((item2, j) => {
                    if (i >= j) return null;
                    const sliderValue = getSliderValue(matrix[i]?.[j] ?? 1);
                    return (
                        <div key={`${i}-${j}`} className="mb-4">
                            <Label className="flex justify-between text-sm"><span>{item1}</span><span>{item2}</span></Label>
                            <Slider min={-8} max={8} step={1} value={[sliderValue]} onValueChange={([val]) => handleSliderChange(val, i, j)} />
                             <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Favors {item1} →</span><span>← Favors {item2}</span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

interface HierarchyNode {
    id: string;
    name: string;
    children?: HierarchyLevel;
}

interface HierarchyLevel {
    id: string;
    name: string;
    nodes: HierarchyNode[];
}

export default function AhpPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [goal, setGoal] = useState("Select the best new car");
    const [hasAlternatives, setHasAlternatives] = useState(true);
    const [alternatives, setAlternatives] = useState<string[]>(["Car A", "Car B", "Car C"]);
    const [hierarchy, setHierarchy] = useState<HierarchyLevel[]>([{ id: 'level-0', name: 'Criteria', nodes: [{ id: 'node-0-0', name: 'Price' }, { id: 'node-0-1', name: 'Performance' }, { id: 'node-0-2', name: 'Style' }] }]);
    const [matrices, setMatrices] = useState<any>({});
    const [analysisResult, setAnalysisResult] = useState<AHPResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    
    const handleFileSelected = (file: File) => {
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                if (!content) {
                    throw new Error("File is empty or could not be read.");
                }
                const parsedData = JSON.parse(content);
                loadAHPData(parsedData, file.name);
                setView('main');
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'File Load Error', description: error.message });
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const loadAHPData = (parsedData: any, fileName: string) => {
        if (!parsedData.goal || !parsedData.hierarchy) {
            throw new Error("Invalid AHP file format. Missing 'goal' or 'hierarchy'.");
        }
        
        setGoal(parsedData.goal);
        setHierarchy(parsedData.hierarchy);
        setHasAlternatives(parsedData.hasAlternatives ?? false);
        if (parsedData.alternatives) setAlternatives(parsedData.alternatives);
        if (parsedData.matrices) setMatrices(parsedData.matrices);
        
        toast({ title: 'Success', description: `Loaded AHP structure from "${fileName}".`});
    }

    const handleLoadSample = () => {
        const ahpExample = exampleDatasets.find(d => d.id === 'ahp');
        if (ahpExample && ahpExample.data) {
            try {
                const parsedData = JSON.parse(ahpExample.data);
                loadAHPData(parsedData, ahpExample.name);
                setView('main');
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Sample Load Error', description: error.message });
            }
        }
    };

    const updateMatrix = (key: string, matrix: number[][]) => {
        setMatrices((prev: any) => ({ ...prev, [key]: matrix }));
    };

    const renderHierarchyComparisons = (level: HierarchyLevel, parentPath: string) => {
        let comparisons: JSX.Element[] = [];
        if (!level || level.nodes.length === 0) return comparisons;

        level.nodes.forEach(node => {
            if (node.children && node.children.nodes.length > 1) {
                const newPath = `${parentPath}.${node.name}`;
                 comparisons.push(
                    <Card key={newPath}>
                        <CardHeader><CardTitle>{`Compare Sub-criteria for '${node.name}'`}</CardTitle></CardHeader>
                        <CardContent>
                            <ComparisonMatrix items={node.children.nodes.map(n => n.name)} matrix={matrices[newPath]} onMatrixChange={(m) => updateMatrix(newPath, m)} />
                        </CardContent>
                    </Card>
                );
                comparisons = comparisons.concat(renderHierarchyComparisons(node.children, newPath));
            }
        });
        return comparisons;
    };
    
    const renderAlternativeComparisons = (level: HierarchyLevel, parentPath: string) => {
        if (!hasAlternatives || !level) return [];

        let comparisons: JSX.Element[] = [];

        level.nodes.forEach(node => {
            const currentPath = `${parentPath}.${node.name}`;
            if (!node.children || node.children.nodes.length === 0) { // It's a leaf node
                comparisons.push(
                    <Card key={currentPath}>
                        <CardHeader><CardTitle>{`Compare Alternatives for '${node.name}'`}</CardTitle></CardHeader>
                        <CardContent>
                            <ComparisonMatrix items={alternatives} matrix={matrices[currentPath]} onMatrixChange={(m) => updateMatrix(currentPath, m)} />
                        </CardContent>
                    </Card>
                );
            } else {
                comparisons = comparisons.concat(renderAlternativeComparisons(node.children, currentPath));
            }
        });
        
        return comparisons;
    };

    const handleRunAnalysis = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/analysis/ahp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, hierarchy, hasAlternatives, alternatives, matrices })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Analysis failed");
            }
            const result = await response.json();
            setAnalysisResult(result);
            setCurrentStep(1);
        } catch(e: any) {
            toast({ title: "Analysis Error", description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const results = analysisResult;
    const isConsistent = results ? Object.values(results.analysis_results).every(a => a === null || a.is_consistent) : true;
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadSample} />;
    }

    return (
        <div className="space-y-4">
            {currentStep === 0 && (
                <Card>
                    <CardHeader>
                         <div className="flex justify-between items-center">
                            <CardTitle className="font-headline flex items-center gap-2"><Share2 /> Analytic Hierarchy Process (AHP)</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                        </div>
                        <CardDescription>Structure your decision, make pairwise comparisons, and find the optimal choice. You can manually input your structure or upload a JSON configuration file.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                           <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
                           <Button variant="outline" onClick={handleLoadSample}>Load Sample Data</Button>
                        </div>

                        <div className="space-y-2"><Label>Goal</Label><Input value={goal} onChange={e => setGoal(e.target.value)} /></div>
                        <div className="flex items-center space-x-2"><Switch id="has-alt" checked={hasAlternatives} onCheckedChange={setHasAlternatives} /><Label htmlFor="has-alt">Include Alternatives</Label></div>
                        {hasAlternatives && <div><Label>Alternatives (comma-separated)</Label><Input value={alternatives.join(', ')} onChange={e => setAlternatives(e.target.value.split(',').map(s => s.trim()))} /></div>}
                        
                        <div className="space-y-4 mt-4">
                            <h3 className="text-lg font-semibold">Hierarchy Structure</h3>
                            {/* Simple UI for top-level criteria for now */}
                            <div><Label>Criteria (comma-separated)</Label><Input value={hierarchy[0].nodes.map(n=>n.name).join(', ')} onChange={e => setHierarchy([{...hierarchy[0], nodes: e.target.value.split(',').map((s, i) => ({id: `node-0-${i}`, name: s.trim()}))}])} /></div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h3 className="text-lg font-semibold">Pairwise Comparisons</h3>
                             {hierarchy.length > 0 && hierarchy[0].nodes.length > 1 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Compare Criteria for '{goal}'</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ComparisonMatrix items={hierarchy[0].nodes.map(n => n.name)} matrix={matrices['goal']} onMatrixChange={(m) => updateMatrix('goal', m)} />
                                    </CardContent>
                                </Card>
                            )}
                            {hierarchy.length > 0 && renderHierarchyComparisons(hierarchy[0], 'goal')}
                            {hierarchy.length > 0 && renderAlternativeComparisons(hierarchy[0], 'goal')}
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={handleRunAnalysis} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Analyzing...</> : <><Sigma className="mr-2" />Run Analysis</>}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 1 && results && (
                 <div className="space-y-4">
                    <Alert variant={isConsistent ? "default" : "destructive"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{isConsistent ? "Consistent Judgements" : "Inconsistency Detected"}</AlertTitle>
                        <AlertDescription>{isConsistent ? "All matrices meet the consistency threshold (CR < 0.1)." : "One or more matrices are inconsistent (CR >= 0.1). Review your judgements."}</AlertDescription>
                    </Alert>
                    <Card>
                        <CardHeader><CardTitle>Final Ranking ({results.synthesis.type === 'alternatives' ? 'Alternatives' : 'Criteria'})</CardTitle></CardHeader>
                        <CardContent>
                            <ChartContainer config={{}} className="w-full h-64">
                                <ResponsiveContainer>
                                    <RechartsBarChart data={results.synthesis.ranking.map(([name, value]) => ({ name, value }))} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="value" name="Final Weight" fill="hsl(var(--primary))" />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Detailed Weights & Consistency</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Comparison</TableHead><TableHead>CR</TableHead><TableHead>Weights</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.analysis_results).map(([key, analysis]) => {
                                      if (!analysis) return null;
                                      
                                      const getItemsForKey = (key: string): string[] => {
                                        if (key === 'goal') return hierarchy[0]?.nodes.map(n=>n.name) || [];

                                        const pathParts = key.split('.').slice(1);
                                        let currentLevel: HierarchyLevel | undefined = hierarchy[0];
                                        let currentNode: HierarchyNode | undefined;
                                        for(const part of pathParts) {
                                            if (!currentLevel) return alternatives; // Default to alternatives if path is deep
                                            currentNode = currentLevel.nodes.find(n => n.name === part);
                                            currentLevel = currentNode?.children;
                                        }

                                        if (currentLevel) {
                                            return currentLevel.nodes.map(n => n.name);
                                        }
                                        return alternatives; // It's a leaf node, comparing alternatives
                                      }

                                      const displayItems = getItemsForKey(key);

                                      return (
                                        <TableRow key={key}>
                                            <TableCell>{key.replace('goal.', '')}</TableCell>
                                            <TableCell className={`font-mono ${analysis.is_consistent ? '' : 'text-destructive'}`}>{analysis.consistency_ratio.toFixed(4)}</TableCell>
                                            <TableCell>
                                                <ul className='text-xs'>
                                                    {analysis.priority_vector.map((weight, i) => (
                                                        <li key={i}>{displayItems[i] ?? `Item ${i+1}`} : {weight.toFixed(3)}</li>
                                                    ))}
                                                </ul>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Button variant="outline" onClick={() => setCurrentStep(0)}>Back to Setup</Button>
                </div>
            )}
        </div>
    );
}

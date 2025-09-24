
'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, Plus, Trash2, Network, BarChart as BarChartIcon, AlertTriangle, ChevronDown, ChevronRight, Share2, HelpCircle, FileJson, Building, Users, Star, Settings, Target, MoveRight } from 'lucide-react';
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
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Share2 size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">
                        계층 분석법 (AHP)
                    </CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        복잡한 다기준 의사결정 문제를 체계적으로 분해하고, 논리적인 우선순위를 도출하는 과학적 분석 도구입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">왜 AHP를 사용해야 할까요?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            AHP는 1970년대 Thomas L. Saaty에 의해 개발된 의사결정 방법론으로, 여러 개의 상충하는 평가 기준이 존재할 때 최적의 대안을 선택하도록 돕습니다. 직관, 경험과 같은 정성적 요소와 정량적 데이터를 통합하여 복잡한 문제를 해결하는 데 강력한 프레임워크를 제공합니다.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> 단계별 분석 가이드</h3>
                            <ol className="list-decimal list-inside space-y-4">
                                <li>
                                    <strong>목표 설정 (Define Goal)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">달성하고자 하는 최종 목표를 명확하고 구체적으로 정의합니다. (예: '최적의 신입사원 채용')</p>
                                </li>
                                <li>
                                    <strong>계층 구조 설계 (Build Hierarchy)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">목표-기준-대안으로 이어지는 계층 구조를 만듭니다. 주요 기준을 설정하고, 필요 시 더 세부적인 하위 기준으로 나눕니다.</p>
                                </li>
                                <li>
                                    <strong>쌍대 비교 (Pairwise Comparison)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">각 계층의 요소들을 1:1로 비교하며 상대적 중요도를 판단합니다. 'A가 B보다 얼마나 더 중요한가?'와 같은 질문에 1~9점 척도로 답합니다.</p>
                                </li>
                                 <li>
                                    <strong>가중치 및 일관성 계산 (Calculate)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">쌍대 비교 행렬을 바탕으로 각 요소의 상대적 가중치(우선순위)를 계산하고, 판단의 논리적 일관성을 검증합니다 (일관성 비율, CR).</p>
                                </li>
                                 <li>
                                    <strong>최종 우선순위 도출 (Synthesize)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">계층 구조 전반의 가중치를 종합하여 대안들의 최종 우선순위를 결정합니다.</p>
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChartIcon className="text-primary"/> 결과 해석 가이드</h3>
                             <ul className="list-decimal list-inside space-y-4">
                                <li>
                                    <strong>최종 우선순위 (Final Ranking)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">모든 평가 기준과 쌍대 비교 결과를 종합하여 각 대안(또는 최하위 기준)의 최종 가중치를 보여줍니다. 점수가 가장 높은 항목이 최적의 대안입니다.</p>
                                </li>
                                <li>
                                    <strong>일관성 비율 (Consistency Ratio, CR)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">쌍대 비교 과정에서 응답자가 얼마나 일관성 있게 판단했는지를 나타내는 지표입니다. 일반적으로 <strong>CR 값이 0.1 (10%) 미만</strong>일 때 판단의 일관성이 확보되었다고 봅니다. 이 값이 높으면 판단을 재검토해야 합니다.</p>
                                </li>
                                <li>
                                    <strong>가중치 (Weights)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">각 계층에 있는 평가 기준과 대안들의 상대적 중요도를 수치로 보여줍니다.</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">주요 활용 분야</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Users className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">인사 관리</h4><p className="text-xs text-muted-foreground">채용, 승진 평가, 성과 측정</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Star className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">신제품 개발</h4><p className="text-xs text-muted-foreground">기능 우선순위 결정, 디자인 선택</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Target className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">마케팅 전략</h4><p className="text-xs text-muted-foreground">채널 선택, 캠페인 성과 평가</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><FileJson className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">공공 정책</h4><p className="text-xs text-muted-foreground">정책 대안 평가, 예산 분배</p></div></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     <Button variant="outline" onClick={onLoadExample}>샘플 데이터로 시작하기</Button>
                     <Button size="lg" onClick={onStart}>새 분석 시작하기 <MoveRight className="ml-2 w-5 h-5"/></Button>
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
    const [hierarchy, setHierarchy] = useState<HierarchyLevel[]>([{ id: 'level-0', name: 'Criteria', nodes: [{ id: 'node-0-0', name: 'Price' }, { id: 'node-0-1', name: 'Performance' }, { id: 'node-0-2', name: 'Design' }] }]);
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

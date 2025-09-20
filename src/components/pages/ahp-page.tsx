
'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Plus, Trash2, Network, BarChart as BarChartIcon, AlertTriangle, ChevronDown, ChevronRight, Share2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid } from 'recharts';
import { Switch } from '../ui/switch';
import { produce } from 'immer';
import DataUploader from '../data-uploader';

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
                const parsedData = JSON.parse(content);

                if (!parsedData.goal || !parsedData.hierarchy) {
                    throw new Error("Invalid AHP file format. Missing 'goal' or 'hierarchy'.");
                }
                
                setGoal(parsedData.goal);
                setHierarchy(parsedData.hierarchy);
                setHasAlternatives(parsedData.hasAlternatives ?? false);
                if (parsedData.alternatives) setAlternatives(parsedData.alternatives);
                if (parsedData.matrices) setMatrices(parsedData.matrices);
                
                toast({ title: 'Success', description: `Loaded AHP structure from "${file.name}".`});
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'File Load Error', description: error.message });
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const updateMatrix = (key: string, matrix: number[][]) => {
        setMatrices((prev: any) => ({ ...prev, [key]: matrix }));
    };

    const renderHierarchyComparisons = (levels: HierarchyLevel[], parentPath = 'goal') => {
        let comparisons: JSX.Element[] = [];
        if (levels.length === 0) return comparisons;
    
        const currentLevel = levels[0];
        if (!currentLevel || currentLevel.nodes.length < 2) return comparisons;

        currentLevel.nodes.forEach(node => {
            if (node.children && node.children.nodes.length > 0) {
                const newPath = `${parentPath}.${node.name}`;
                 comparisons.push(
                    <Card key={newPath}>
                        <CardHeader><CardTitle>{`Compare Sub-criteria for '${node.name}'`}</CardTitle></CardHeader>
                        <CardContent>
                            <ComparisonMatrix items={node.children.nodes.map(n => n.name)} matrix={matrices[newPath]} onMatrixChange={(m) => updateMatrix(newPath, m)} />
                        </CardContent>
                    </Card>
                );
                comparisons = comparisons.concat(renderHierarchyComparisons([node.children], newPath));
            }
        });
        return comparisons;
    };
    
    const renderAlternativeComparisons = () => {
        if (!hasAlternatives || hierarchy.length === 0) return [];
        
        const leafNodes: {path: string, name: string}[] = [];
        const calculateLeafs = (level: HierarchyLevel, parentPath: string) => {
             level.nodes.forEach(node => {
                const currentPath = `${parentPath}.${node.name}`;
                if (!node.children || node.children.nodes.length === 0) {
                    leafNodes.push({ path: currentPath, name: node.name });
                } else {
                    calculateLeafs(node.children, currentPath);
                }
            });
        }
        calculateLeafs(hierarchy[0], 'goal');
        
        return leafNodes.map(leaf => (
            <Card key={leaf.path}>
                <CardHeader><CardTitle>{`Compare Alternatives for '${leaf.name}'`}</CardTitle></CardHeader>
                <CardContent>
                    <ComparisonMatrix items={alternatives} matrix={matrices[leaf.path]} onMatrixChange={(m) => updateMatrix(leaf.path, m)} />
                </CardContent>
            </Card>
        ));
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
    
    return (
        <div className="space-y-4">
            {currentStep === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Share2 /> Analytic Hierarchy Process (AHP)</CardTitle>
                        <CardDescription>Structure your decision, make pairwise comparisons, and find the optimal choice. You can manually input your structure or upload a JSON configuration file.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />

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
                            {renderHierarchyComparisons(hierarchy)}
                            {renderAlternativeComparisons()}
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
                                      const items = key === 'goal'
                                        ? hierarchy[0].nodes.map(n => n.name)
                                        : alternatives; // Simplified for now
                                      
                                      const getItemsForKey = (key: string) => {
                                        if (key === 'goal') return hierarchy[0].nodes.map(n=>n.name);
                                        // This is a simplification; a full solution would traverse the hierarchy
                                        if (key.startsWith('goal.')) return alternatives;
                                        return [];
                                      }

                                      const displayItems = getItemsForKey(key);

                                      return (
                                        <TableRow key={key}>
                                            <TableCell>{key.replace('goal.', '')}</TableCell>
                                            <TableCell className={`font-mono ${analysis.is_consistent ? '' : 'text-destructive'}`}>{analysis.consistency_ratio.toFixed(4)}</TableCell>
                                            <TableCell>
                                                <ul>
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

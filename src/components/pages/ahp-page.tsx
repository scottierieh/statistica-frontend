
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
                        Analytic Hierarchy Process (AHP)
                    </CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A structured technique for organizing and analyzing complex decisions, based on mathematics and psychology.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use the Analytic Hierarchy Process?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Developed in the 1970s by Thomas L. Saaty, AHP is a decision-making methodology that helps select the best alternative when multiple, conflicting criteria exist. It provides a powerful framework for solving complex problems by integrating qualitative factors like intuition and experience with quantitative data.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Step-by-Step Analysis Guide</h3>
                            <ol className="list-decimal list-inside space-y-4">
                                <li>
                                    <strong>Define Goal</strong>
                                    <p className="text-sm text-muted-foreground pl-5">Clearly and specifically define the final objective you want to achieve (e.g., 'Select the Optimal New Employee').</p>
                                </li>
                                <li>
                                    <strong>Build Hierarchy</strong>
                                    <p className="text-sm text-muted-foreground pl-5">Create a hierarchical structure of Goal-Criteria-Alternatives. Set the main criteria and, if necessary, break them down into more detailed sub-criteria.</p>
                                </li>
                                <li>
                                    <strong>Pairwise Comparison</strong>
                                    <p className="text-sm text-muted-foreground pl-5">Compare the elements in each layer on a 1-to-1 basis to determine their relative importance. Answer questions like, "How much more important is A than B?" on a 1-9 scale.</p>
                                </li>
                                 <li>
                                    <strong>Calculate Weights & Consistency</strong>
                                    <p className="text-sm text-muted-foreground pl-5">Based on the pairwise comparison matrices, calculate the relative weights (priorities) of each element and verify the logical consistency of the judgments (Consistency Ratio, CR).</p>
                                </li>
                                 <li>
                                    <strong>Synthesize Final Priorities</strong>
                                    <p className="text-sm text-muted-foreground pl-5">Combine the weights throughout the hierarchy to determine the final priorities of the alternatives.</p>
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChartIcon className="text-primary"/> Results Interpretation Guide</h3>
                             <ul className="list-decimal list-inside space-y-4">
                                <li>
                                    <strong>Final Ranking</strong>
                                    <p className="text-sm text-muted-foreground pl-5">This shows the final weight of each alternative (or the lowest-level criteria), synthesizing all evaluation criteria and pairwise comparisons. The item with the highest score is the optimal choice.</p>
                                </li>
                                <li>
                                    <strong>Consistency Ratio (CR)</strong>
                                    <p className="text-sm text-muted-foreground pl-5">This metric indicates how consistently the respondent made judgments during the pairwise comparisons. Generally, a **CR value below 0.1 (10%)** is considered to have secured logical consistency. If this value is high, the judgments should be re-evaluated.</p>
                                </li>
                                <li>
                                    <strong>Weights</strong>
                                    <p className="text-sm text-muted-foreground pl-5">This numerically represents the relative importance of the evaluation criteria and alternatives at each level of the hierarchy.</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">Key Application Areas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Users className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Human Resources</h4><p className="text-xs text-muted-foreground">Recruitment, promotion evaluation, performance measurement.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Star className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Product Development</h4><p className="text-xs text-muted-foreground">Prioritizing features, selecting designs.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Target className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Marketing Strategy</h4><p className="text-xs text-muted-foreground">Channel selection, campaign performance evaluation.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><FileJson className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Public Policy</h4><p className="text-xs text-muted-foreground">Evaluating policy alternatives, budget allocation.</p></div></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     <Button variant="outline" onClick={onLoadExample}>Start with Sample Data</Button>
                     <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
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


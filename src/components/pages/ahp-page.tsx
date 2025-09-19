
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Plus, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';


interface AhpResults {
    weights: { [key: string]: number };
    consistency_ratio: number;
    is_consistent: boolean;
}

const saatyScale: { [key: number]: string } = {
    1: 'Equal Importance',
    2: 'Equal to Moderate',
    3: 'Moderate Importance',
    4: 'Moderate to Strong',
    5: 'Strong Importance',
    6: 'Strong to Very Strong',
    7: 'Very Strong Importance',
    8: 'Very to Extreme',
    9: 'Extreme Importance',
};

export default function AhpPage() {
    const { toast } = useToast();
    const [criteria, setCriteria] = useState<string[]>(['Price', 'Battery', 'Camera']);
    const [comparisonMatrix, setComparisonMatrix] = useState<number[][] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AhpResults | null>(null);

    const initializeMatrix = useCallback((size: number) => {
        const newMatrix = Array.from({ length: size }, () => Array(size).fill(1));
        setComparisonMatrix(newMatrix);
    }, []);

    useState(() => {
        initializeMatrix(criteria.length);
    });

    const handleCriteriaChange = (index: number, value: string) => {
        const newCriteria = [...criteria];
        newCriteria[index] = value;
        setCriteria(newCriteria);
    };
    
    const addCriterion = () => {
        const newCriteria = [...criteria, `New Criterion ${criteria.length + 1}`];
        setCriteria(newCriteria);
        initializeMatrix(newCriteria.length);
    };

    const removeCriterion = (index: number) => {
        if (criteria.length <= 2) {
            toast({ title: "Cannot remove", description: "You need at least two criteria.", variant: 'destructive' });
            return;
        }
        const newCriteria = criteria.filter((_, i) => i !== index);
        setCriteria(newCriteria);
        initializeMatrix(newCriteria.length);
    };

    const handleSliderChange = (row: number, col: number, value: number) => {
        if (!comparisonMatrix) return;
        const newMatrix = comparisonMatrix.map(r => [...r]);
        newMatrix[row][col] = value;
        newMatrix[col][row] = 1 / value;
        setComparisonMatrix(newMatrix);
    };
    
    const handleRunAnalysis = async () => {
        if (!comparisonMatrix) {
            toast({ title: "Error", description: "Comparison matrix is not initialized.", variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/ahp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matrix: comparisonMatrix })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result.results);

        } catch (error: any) {
            toast({ title: 'Analysis Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const weightsChartData = useMemo(() => {
        if (!analysisResult) return [];
        return Object.entries(analysisResult.weights).map(([name, value], index) => ({
            name: criteria[index], // Use the name from the criteria array
            weight: value * 100 // Convert to percentage for display
        })).sort((a,b) => b.weight - a.weight);
    }, [analysisResult, criteria]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>1. Define Criteria</CardTitle>
                    <CardDescription>List the criteria or alternatives you want to compare.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {criteria.map((criterion, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                value={criterion}
                                onChange={(e) => handleCriteriaChange(index, e.target.value)}
                                placeholder={`Criterion ${index + 1}`}
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeCriterion(index)} disabled={criteria.length <= 2}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </CardContent>
                <CardFooter>
                    <Button variant="outline" onClick={addCriterion}><Plus className="mr-2"/>Add Criterion</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Pairwise Comparison</CardTitle>
                    <CardDescription>For each pair, indicate how much more important the row item is than the column item using Saaty's 1-9 scale.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-6">
                        {comparisonMatrix && criteria.map((rowCriterion, i) => (
                            <div key={i} className="space-y-4">
                                {criteria.slice(i + 1).map((colCriterion, j_offset) => {
                                    const j = i + 1 + j_offset;
                                    const sliderValue = comparisonMatrix[i][j];
                                    const description = saatyScale[Math.round(sliderValue)];
                                    return (
                                        <div key={j} className="grid grid-cols-[1fr_auto_1fr_150px] items-center gap-4 p-3 border rounded-md">
                                            <Label className="text-right font-semibold">{rowCriterion}</Label>
                                            <div className="w-48">
                                                <Slider
                                                    value={[sliderValue]}
                                                    onValueChange={(v) => handleSliderChange(i, j, v[0])}
                                                    min={1} max={9} step={1}
                                                />
                                            </div>
                                            <Label className="text-left font-semibold">{colCriterion}</Label>
                                            <Badge variant="secondary" className="justify-center text-center">{description}</Badge>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                     <Button onClick={handleRunAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Calculate Weights</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>}

            {analysisResult && (
                 <Card>
                    <CardHeader>
                        <CardTitle>3. Results</CardTitle>
                        <CardDescription>Calculated weights and consistency ratio for your comparisons.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Criteria Weights</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{ weight: { label: 'Weight (%)' } }} className="w-full h-[300px]">
                                        <ResponsiveContainer>
                                            <BarChart data={weightsChartData} layout="vertical" margin={{ left: 100 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" dataKey="weight" unit="%" />
                                                <YAxis type="category" dataKey="name" width={100} />
                                                <Tooltip content={<ChartTooltipContent />} formatter={(value: number) => `${value.toFixed(2)}%`} />
                                                <Bar dataKey="weight" radius={4}>
                                                    {weightsChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Consistency Check</CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <div className="text-center p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Consistency Ratio (CR)</p>
                                        <p className="text-4xl font-bold">{analysisResult.consistency_ratio.toFixed(4)}</p>
                                    </div>
                                    <Alert variant={analysisResult.is_consistent ? 'default' : 'destructive'} className="mt-4">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>{analysisResult.is_consistent ? "Judgments are Consistent" : "Judgments are Inconsistent"}</AlertTitle>
                                        <AlertDescription>
                                            {analysisResult.is_consistent
                                                ? "The CR is less than 0.10, which indicates that the pairwise comparisons are sufficiently consistent."
                                                : "The CR is 0.10 or greater. This suggests inconsistencies in the pairwise judgments. Please review your comparisons for better accuracy."}
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

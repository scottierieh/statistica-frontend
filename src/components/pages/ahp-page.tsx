
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { produce } from 'immer';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid } from 'recharts';
import { Switch } from '../ui/switch';
import DataUploader from '../data-uploader';
import { exampleDatasets } from '@/lib/example-datasets';
import type { Survey, SurveyResponse, Question } from '@/types/survey';

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

interface AhpPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function AhpPage({ survey, responses }: AhpPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<AHPResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const { goal, hierarchy, hasAlternatives, alternatives } = useMemo(() => {
        const ahpQuestion = survey.questions.find(q => q.type.startsWith('matrix')); // Assuming AHP uses matrix questions
        // This is a simplified extraction. A real AHP survey would need a more structured way to define the hierarchy.
        const criteria = survey.questions.filter(q => q.type === 'matrix' && q.title.includes('Criteria'));
        
        const mainCriteria = criteria.length > 0 ? criteria[0].rows || [] : [];
        
        const mainHierarchy: any = {
            id: 'level-0',
            name: 'Criteria',
            nodes: mainCriteria.map((c, i) => ({ id: `node-0-${i}`, name: c }))
        };

        return {
            goal: survey.title,
            hierarchy: [mainHierarchy],
            hasAlternatives: mainHierarchy.nodes.length > 0,
            alternatives: survey.questions
                .find(q => q.type === 'matrix' && !q.title.includes('Criteria'))
                ?.rows || []
        };
    }, [survey]);


    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);

        const matrices: {[key:string]: number[][]} = {};

        survey.questions.forEach(q => {
            if (q.type !== 'matrix' || !q.rows || q.rows.length === 0) return;

            const matrix = Array(q.rows.length).fill(0).map(() => Array(q.rows.length).fill(1));
            
            const allAnswers: any[] = responses.map(r => r.answers[q.id]).filter(Boolean);

            if(allAnswers.length === 0) return;

            // Geometric mean of all responses for this matrix
            allAnswers.forEach(answer => {
                q.rows!.forEach((row1, i) => {
                    q.rows!.forEach((row2, j) => {
                         if (i < j) {
                            const pairKey = `${row1} vs ${row2}`;
                            const reversePairKey = `${row2} vs ${row1}`;
                            let value = 1;
                            if (answer[pairKey]) value = Number(answer[pairKey]);
                            else if (answer[reversePairKey]) value = 1/Number(answer[reversePairKey]);
                            
                            matrix[i][j] = (matrix[i][j] * value) ** (1/allAnswers.length);
                         }
                    })
                })
            });
             q.rows!.forEach((_, i) => { q.rows!.forEach((_, j) => { if (i > j) matrix[i][j] = 1 / matrix[j][i]; }); });
            
            let matrixKey = 'goal'; // default for main criteria
            if (q.title.includes('Alternatives')) {
                const parts = q.title.split('by ');
                if (parts.length > 1) {
                    matrixKey = `goal.${parts[1].trim()}`;
                }
            }
            matrices[matrixKey] = matrix;
        });
        
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
        } catch(e: any) {
            toast({ title: "Analysis Error", description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [goal, hierarchy, hasAlternatives, alternatives, responses, survey.questions, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const results = analysisResult;
    const isConsistent = results ? Object.values(results.analysis_results).every(a => a === null || a.is_consistent) : true;
    
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running AHP analysis...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!results) {
         return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <p>Could not perform AHP analysis. Ensure your survey has matrix questions for pairwise comparisons.</p>
                </CardContent>
            </Card>
        );
    }

    return (
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
                                let currentLevel: any | undefined = hierarchy[0];
                                let currentNode: any | undefined;
                                for(const part of pathParts) {
                                    if (!currentLevel) return alternatives; // Default to alternatives if path is deep
                                    currentNode = currentLevel.nodes.find((n:any) => n.name === part);
                                    currentLevel = currentNode?.children;
                                }

                                if (currentLevel) {
                                    return currentLevel.nodes.map((n:any) => n.name);
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
        </div>
    );
}

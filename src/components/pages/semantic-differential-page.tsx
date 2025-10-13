
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

interface EpaScores {
    evaluation: { mean: number };
    potency: { mean: number };
    activity: { mean: number };
}
interface AnalysisResults {
    statistics: { [key: string]: { scale: string; mean: number; std: number } };
    epa_scores: EpaScores;
    profile: { left: string; right: string; mean: number }[];
    overall_mean: number;
}
interface FullAnalysisResponse {
    results: AnalysisResults;
    plot: string;
    error?: string;
}

interface SemanticDifferentialPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function SemanticDifferentialPage({ survey, responses }: SemanticDifferentialPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dimensionMapping, setDimensionMapping] = useState<Record<string, string>>({});

    const sdQuestion = survey.questions.find(q => q.type === 'semantic-differential' || q.type === 'likert');

    useEffect(() => {
        if (sdQuestion?.rows) {
            const initialMapping: Record<string, string> = {};
            sdQuestion.rows.forEach((row, index) => {
                const scaleId = `scale_${index}`;
                let dimension = 'evaluation';
                const lowerRow = row.toLowerCase();
                if (['strong', 'big', 'powerful', '강한', '큰', '튼튼한'].some(k => lowerRow.includes(k))) dimension = 'potency';
                if (['fast', 'simple', 'innovative', '빠른', '간단한', '혁신적인'].some(k => lowerRow.includes(k))) dimension = 'activity';
                initialMapping[scaleId] = dimension;
            });
            setDimensionMapping(initialMapping);
        }
    }, [sdQuestion]);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (!sdQuestion) {
                throw new Error("No Semantic Differential or Likert question found.");
            }

            const scales = (sdQuestion.rows || []).map((row, index) => {
                const scaleId = `scale_${index}`;
                const [left, right] = row.split(' vs ').map(s => s.trim());
                return {
                    id: scaleId,
                    left_adjective: left,
                    right_adjective: right,
                    dimension: dimensionMapping[scaleId] || 'evaluation',
                };
            });
            
            const responseData = responses.map((resp) => {
                const ratings: {[key: string]: number} = { respondent_id: resp.id };
                const answer = resp.answers[sdQuestion.id];
                if(answer && typeof answer === 'object') {
                    (sdQuestion.rows || []).forEach((row, rowIndex) => {
                        const scaleId = `scale_${rowIndex}`;
                        if (answer[row]) {
                            ratings[scaleId] = Number(answer[row]);
                        }
                    });
                }
                return ratings;
            });

            const response = await fetch('/api/analysis/semantic-differential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemName: survey.title,
                    scales: scales,
                    responses: responseData
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Semantic Differential analysis finished.' });

        } catch (err: any) {
            setError(err.message);
            toast({ title: "Analysis Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, sdQuestion, dimensionMapping, toast]);

    useEffect(() => {
        // Only run analysis if dimensionMapping is populated
        if(Object.keys(dimensionMapping).length > 0) {
            handleAnalysis();
        }
    }, [dimensionMapping]); // Depend on dimensionMapping
    
    const handleDimensionChange = (scaleId: string, dimension: string) => {
        setDimensionMapping(prev => ({...prev, [scaleId]: dimension}));
    };

    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    const { results, plot } = analysisResult || {};

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Dimension Configuration</CardTitle>
                    <CardDescription>Assign each scale to an EPA dimension for a more accurate analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {sdQuestion?.rows?.map((row, index) => {
                        const scaleId = `scale_${index}`;
                        return (
                            <div key={scaleId} className="grid grid-cols-2 items-center gap-4 p-2 border-b">
                                <Label htmlFor={`dim-${scaleId}`} className="text-sm">{row}</Label>
                                <Select value={dimensionMapping[scaleId]} onValueChange={d => handleDimensionChange(scaleId, d)}>
                                    <SelectTrigger id={`dim-${scaleId}`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="evaluation">Evaluation (Good/Bad)</SelectItem>
                                        <SelectItem value="potency">Potency (Strong/Weak)</SelectItem>
                                        <SelectItem value="activity">Activity (Active/Passive)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )
                    })}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : null} 
                        Re-run Analysis
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && <Card><CardContent className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /></CardContent></Card>}

            {results && (
                <>
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Semantic Differential Profile</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={plot!} alt="Semantic Differential Analysis Plot" width={1600} height={1200} className="w-full h-auto rounded-md border" />
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

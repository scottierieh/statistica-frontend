
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign, Brain, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import type { Survey, SurveyResponse, Question } from '@/types/survey';

interface AnalysisResults {
    pme: number | null; // Point of Marginal Expensiveness
    pmc: number | null; // Point of Marginal Cheapness
    opp: number | null; // Optimal Price Point
    idp: number | null; // Indifference Price Point
    interpretation: string;
}

interface FullAnalysisResponse {
    results: AnalysisResults;
    plots: {
        psm_plot?: string;
    };
    error?: string;
}

interface VanWestendorpPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const StatCard = ({ title, value, unit = '$' }: { title: string, value: number | undefined | null, unit?: string }) => (
    <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value !== undefined && value !== null ? `${unit}${value.toFixed(2)}` : 'N/A'}</p>
    </div>
);

const InterpretationDisplay = ({ interpretation }: { interpretation: string | undefined }) => {
  const formattedInterpretation = useMemo(() => {
    if (!interpretation) return null;
    return interpretation.split('\n\n').map((paragraph, index) => {
        const parts = paragraph.split('\n');
        return (
            <div key={index} className="mb-4">
                {parts.map((part, partIndex) => (
                    <p key={partIndex} dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
            </div>
        )
    });
  }, [interpretation]);

  if (!interpretation) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Brain /> AI Interpretation</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Strategic Pricing Insights</AlertTitle>
          <AlertDescription className="space-y-2">
            {formattedInterpretation}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};


export default function VanWestendorpPage({ survey, responses }: VanWestendorpPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const requiredQuestions = useMemo(() => ['too cheap', 'cheap', 'expensive', 'too expensive'], []);
    
    const questionMap = useMemo(() => {
        const mapping: {[key: string]: string} = {};
        if (!survey) return mapping;
        
        requiredQuestions.forEach(q_title => {
            const question = survey.questions.find(q => q.title.toLowerCase().includes(q_title));
            if(question) {
                mapping[q_title] = question.id;
            }
        });
        return mapping;
    }, [survey, requiredQuestions]);

    const canRun = useMemo(() => Object.keys(questionMap).length === requiredQuestions.length, [questionMap, requiredQuestions]);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        if (!canRun) {
            setError("Not all required Van Westendorp questions were found. Please ensure questions containing 'Too Cheap', 'Cheap', 'Expensive', and 'Too Expensive' exist and are of 'number' type.");
            setIsLoading(false);
            return;
        }

        const analysisData = responses.map(r => {
            const answers = r.answers as any;
            return {
                'Too Cheap': answers[questionMap['too cheap']],
                'Cheap': answers[questionMap['cheap']],
                'Expensive': answers[questionMap['expensive']],
                'Too Expensive': answers[questionMap['too expensive']],
            };
        });
        
        try {
            const response = await fetch('/api/analysis/van-westendorp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData,
                    too_cheap_col: 'Too Cheap',
                    cheap_col: 'Cheap',
                    expensive_col: 'Expensive',
                    too_expensive_col: 'Too Expensive',
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "Van Westendorp analysis finished successfully." });

        } catch (e: any) {
            console.error('Van Westendorp error:', e);
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [responses, canRun, questionMap, toast]);
    
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    if (error) {
         return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
    if (isLoading || !analysisResult) {
        return <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> <p>Analyzing price sensitivity...</p></CardContent></Card>;
    }
    
    const { results, plots } = analysisResult;

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Key Price Points</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Optimal Price (OPP)" value={results.opp} />
                    <StatCard title="Indifference Price (IDP)" value={results.idp} />
                    <StatCard title="Marginal Cheapness (PMC)" value={results.pmc} />
                    <StatCard title="Marginal Expensiveness (PME)" value={results.pme} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Price Sensitivity Meter</CardTitle>
                </CardHeader>
                <CardContent>
                    {plots.psm_plot ? (
                        <Image src={`data:image/png;base64,${plots.psm_plot}`} alt="Van Westendorp Plot" width={1000} height={700} className="w-full rounded-md border" />
                    ) : <p>Could not render PSM plot.</p>}
                </CardContent>
            </Card>

            <InterpretationDisplay interpretation={results.interpretation} />
        </div>
    );
}


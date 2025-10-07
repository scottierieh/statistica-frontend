'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign, Brain, LineChart, AlertTriangle, HelpCircle, MoveRight } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
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
        psm_plot: string;
        acceptance_plot: string;
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
    return interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
          <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation || '' }} />
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
    
    const requiredQuestions = useMemo(() => ['too cheap', 'cheap/bargain', 'expensive/high side', 'too expensive'], []);
    
    const questionMap = useMemo(() => {
        const mapping: {[key: string]: string} = {};
        if (!survey) return mapping;
        
        requiredQuestions.forEach(q_title => {
            const question = survey.questions.find(q => q.title.toLowerCase().includes(q_title));
            if(question) {
                // Use a consistent key format
                const key = q_title.replace(/\//g, '_');
                mapping[key] = question.id;
            }
        });
        return mapping;
    }, [survey, requiredQuestions]);

    const canRun = useMemo(() => Object.keys(questionMap).length === requiredQuestions.length, [questionMap, requiredQuestions]);

    const handleAnalysis = useCallback(async () => {
        if (!canRun) {
            setError("Not all required Van Westendorp questions were found in the survey. Please ensure questions titled 'Too Cheap', 'Cheap/Bargain', 'Expensive/High Side', and 'Too Expensive' exist and are of 'number' type.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        
        const analysisData = responses.map(r => {
            const answers = r.answers as any;
            return {
                [questionMap.too_cheap]: answers[questionMap.too_cheap],
                [questionMap['cheap_bargain']]: answers[questionMap['cheap_bargain']],
                [questionMap['expensive_high_side']]: answers[questionMap['expensive_high_side']],
                [questionMap.too_expensive]: answers[questionMap.too_expensive],
            };
        });

        try {
            const response = await fetch('/api/analysis/van-westendorp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData,
                    too_cheap_col: questionMap.too_cheap,
                    cheap_col: questionMap['cheap_bargain'],
                    expensive_col: questionMap['expensive_high_side'],
                    too_expensive_col: questionMap.too_expensive,
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
    
    const results = analysisResult?.results;

    if (error) {
         return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        );
    }
    
    if (isLoading) {
        return <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> <p>Analyzing price sensitivity...</p></CardContent></Card>;
    }
    
    if (!analysisResult) {
         return <Card><CardContent className="p-6 text-center text-muted-foreground"><p>Could not load analysis results.</p></CardContent></Card>;
    }

    return (
        <div className="space-y-4">
             <Tabs defaultValue="visuals" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="visuals"><LineChart className="mr-2 h-4 w-4"/>Charts</TabsTrigger>
                    <TabsTrigger value="summary"><DollarSign className="mr-2 h-4 w-4"/>Key Metrics</TabsTrigger>
                </TabsList>
                <TabsContent value="visuals" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Price Sensitivity & Acceptance Curves</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                             {analysisResult.plots.psm_plot ? (
                                 <Image src={`data:image/png;base64,${analysisResult.plots.psm_plot}`} alt="Van Westendorp Plot" width={1000} height={700} className="w-full rounded-md border" />
                             ) : <p>Could not render PSM plot.</p>}
                              {analysisResult.plots.acceptance_plot ? (
                                 <Image src={`data:image/png;base64,${analysisResult.plots.acceptance_plot}`} alt="Price Acceptance Plot" width={1000} height={700} className="w-full rounded-md border" />
                             ) : <p>Could not render Acceptance plot.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="summary" className="mt-4">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Key Price Points</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Optimal Price (OPP)" value={results?.opp} />
                                <StatCard title="Indifference Price (IDP)" value={results?.idp} />
                                <StatCard title="Marginal Cheapness (PMC)" value={results?.pmc} />
                                <StatCard title="Marginal Expensiveness (PME)" value={results?.pme} />
                            </CardContent>
                        </Card>
                        <InterpretationDisplay interpretation={results?.interpretation} />
                    </div>
                 </TabsContent>
            </Tabs>
        </div>
    );
}

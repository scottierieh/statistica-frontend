
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign, Info, Brain, LineChart, AlertTriangle, HelpCircle, MoveRight } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import dynamic from 'next/dynamic';
import type { Survey, SurveyResponse } from '@/types/survey';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[500px]" />,
});


interface AnalysisResponse {
    results: {
        opp: number | null;
        pme: number | null;
        mdp: number | null;
        ipp: number | null;
    };
    plotData: any;
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

export default function VanWestendorpPage({ survey, responses }: VanWestendorpPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const requiredQuestions = ['too cheap', 'cheap/bargain', 'expensive/high side', 'too expensive'];
    
    const questionMap = useMemo(() => {
        const mapping: {[key: string]: string} = {};
        if (!survey) return mapping;
        
        requiredQuestions.forEach(q_title => {
            const question = survey.questions.find(q => q.title.toLowerCase().includes(q_title));
            if(question) {
                mapping[q_title.replace('/','_')] = question.id;
            }
        });
        return mapping;
    }, [survey]);

    const canRun = useMemo(() => requiredQuestions.every(q => Object.keys(questionMap).includes(q.replace('/','_'))), [questionMap]);

    const handleAnalysis = useCallback(async () => {
        if (!canRun) {
            toast({ variant: 'destructive', title: 'Setup Error', description: 'Not all required Van Westendorp questions were found in the survey.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const analysisData = responses.map(r => ({
            too_cheap: Number(r.answers[questionMap.too_cheap]),
            cheap: Number(r.answers[questionMap.cheap_bargain]),
            expensive: Number(r.answers[questionMap.expensive_high_side]),
            too_expensive: Number(r.answers[questionMap.too_expensive]),
        })).filter(row => !Object.values(row).some(isNaN));

        try {
            const response = await fetch('/api/analysis/van-westendorp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData, 
                    too_cheap_col: 'too_cheap',
                    cheap_col: 'cheap',
                    expensive_col: 'expensive',
                    too_expensive_col: 'too_expensive',
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "Van Westendorp analysis finished successfully." });

        } catch (e: any) {
            console.error('Van Westendorp error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [responses, canRun, questionMap, toast]);
    
    useEffect(() => {
        if (canRun) {
            handleAnalysis();
        }
    }, [canRun, handleAnalysis]);
    
    const results = analysisResult?.results;
    
    const plotData = useMemo(() => {
        if (!analysisResult?.plotData) return null;
        try {
            const { prices, too_cheap, cheap, expensive, too_expensive } = analysisResult.plotData;
            
            const traces = [
                { x: prices, y: too_expensive, mode: 'lines', name: 'Too Expensive', line: { color: 'red'} },
                { x: prices, y: expensive, mode: 'lines', name: 'Expensive', line: { color: 'orange'} },
                { x: prices, y: cheap.map((v: number) => 100 - v), mode: 'lines', name: 'Not Cheap', line: { color: 'blue'} },
                { x: prices, y: too_cheap.map((v: number) => 100 - v), mode: 'lines', name: 'Not Too Cheap', line: { color: 'skyblue', dash: 'dash' } }
            ];

            return { data: traces };
        } catch(e) {
            console.error("Failed to parse plot data", e);
            return null;
        }
    }, [analysisResult]);


    const layout = useMemo(() => {
      if (!results) return {};
      
      const shapes: any[] = [];
      const annotations: any[] = [];
      const addAnnotation = (x: number | null, y: number, text: string) => {
        if(x === null) return;
        annotations.push({ x: x, y: y, text: text, showarrow: true, arrowhead: 4, ax: 0, ay: -40, bgcolor: 'rgba(255, 255, 255, 0.7)' });
      };

      if (results.pme) {
          shapes.push({ type: 'line', x0: results.pme, x1: results.pme, y0: 0, y1: 100, line: { color: 'grey', width: 1, dash: 'dot' } });
          addAnnotation(results.pme, 95, 'PME');
      }
      if (results.ipp) {
          shapes.push({ type: 'line', x0: results.ipp, x1: results.ipp, y0: 0, y1: 100, line: { color: 'grey', width: 1, dash: 'dot' } });
          addAnnotation(results.ipp, 85, 'IPP');
      }
       if (results.mdp) {
          shapes.push({ type: 'line', x0: results.mdp, x1: results.mdp, y0: 0, y1: 100, line: { color: 'purple', width: 2, dash: 'dash' } });
           addAnnotation(results.mdp, 75, 'Point of Marginal<br>Cheapness');
      }
      if (results.opp) {
          shapes.push({ type: 'line', x0: results.opp, x1: results.opp, y0: 0, y1: 100, line: { color: 'green', width: 2, dash: 'dash' } });
           addAnnotation(results.opp, 65, 'Optimal Price Point');
      }
      
      return {
        title: 'Van Westendorp Price Sensitivity Meter',
        xaxis: { title: 'Price' },
        yaxis: { title: 'Percentage of Respondents (%)', range: [0, 100] },
        shapes: shapes,
        annotations: annotations,
        legend: { x: 0.01, y: 0.99 },
        autosize: true
      };
    }, [results]);

    if (!canRun) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Incomplete Survey Setup</AlertTitle>
                <AlertDescription>
                    This survey does not contain all four required questions for Van Westendorp analysis: "Too Cheap", "Cheap/Bargain", "Expensive/High Side", and "Too Expensive".
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
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Price Sensitivity Meter</CardTitle>
                </CardHeader>
                <CardContent>
                     {plotData && (
                         <Plot
                            data={plotData.data}
                            layout={layout}
                            useResizeHandler={true}
                            className="w-full h-[500px]"
                            config={{ scrollZoom: true }}
                        />
                     )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Key Price Points</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <StatCard title="Optimal Price (OPP)" value={results.opp} />
                     <StatCard title="Indifference Price (IPP)" value={results.ipp} />
                     <StatCard title="Marginal Cheapness (PMC)" value={results.mdp} />
                     <StatCard title="Marginal Expensiveness (PME)" value={results.pme} />
                </CardContent>
            </Card>
        </div>
    );
}

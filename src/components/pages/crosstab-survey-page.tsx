
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sigma, Columns, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import type { Survey, SurveyResponse } from '@/types/survey';

interface CrosstabResults {
  contingency_table: { [key: string]: { [key: string]: number } };
  chi_squared: {
    statistic: number;
    p_value: number;
    degrees_of_freedom: number;
  };
  cramers_v: number;
  interpretation: string;
}

interface FullAnalysisResponse {
  results: CrosstabResults;
  plot: string;
}

interface CrosstabSurveyPageProps {
  survey: Survey;
  responses: SurveyResponse[];
}

export default function CrosstabSurveyPage({ survey, responses }: CrosstabSurveyPageProps) {
  const { toast } = useToast();
  const [rowVar, setRowVar] = useState<string | undefined>();
  const [colVar, setColVar] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

  const questionOptions = useMemo(() => {
    return survey.questions
      .filter(q => ['single', 'multiple', 'dropdown'].includes(q.type))
      .map(q => ({ label: q.title, value: q.id }));
  }, [survey.questions]);

  useEffect(() => {
    if (questionOptions.length > 0) {
      setRowVar(questionOptions[0].value);
      if (questionOptions.length > 1) {
        setColVar(questionOptions[1].value);
      }
    }
  }, [questionOptions]);

  const handleAnalysis = useCallback(async () => {
    if (!rowVar || !colVar) {
      toast({ title: 'Selection Error', description: 'Please select two variables for crosstabulation.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const dataForAnalysis = responses.map(r => ({
        [rowVar]: r.answers[rowVar],
        [colVar]: r.answers[colVar]
      }));

      const response = await fetch('/api/analysis/crosstab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataForAnalysis, rowVar, colVar })
      });

      if (!response.ok) {
        const errorText = await response.json();
        throw new Error(errorText.error || 'Failed to analyze data.');
      }
      
      const result = await response.json();
      if(result.error) throw new Error(result.error);
      setAnalysisResult(result);

    } catch (e: any) {
      toast({ title: 'Analysis Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [rowVar, colVar, responses, toast]);
  
  const results = analysisResult?.results;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Crosstabulation Setup</CardTitle>
          <CardDescription>Select two categorical variables to analyze their relationship.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold">Row Variable</label>
              <Select value={rowVar} onValueChange={setRowVar}>
                <SelectTrigger><SelectValue placeholder="Select Row Variable..." /></SelectTrigger>
                <SelectContent>
                  {questionOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-semibold">Column Variable</label>
              <Select value={colVar} onValueChange={setColVar}>
                <SelectTrigger><SelectValue placeholder="Select Column Variable..." /></SelectTrigger>
                <SelectContent>
                  {questionOptions.filter(opt => opt.value !== rowVar).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
           <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                    This analysis works best with categorical variables (e.g., single choice, multiple choice). Results may not be meaningful for numeric or text-based questions.
                </AlertDescription>
            </Alert>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleAnalysis} disabled={isLoading || !rowVar || !colVar}>
            {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Crosstab</>}
          </Button>
        </CardFooter>
      </Card>
      
      {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}

      {results && (
        <Card>
            <CardHeader>
                <CardTitle>Crosstabulation Results</CardTitle>
                <CardDescription>
                    Chi-Squared: {results.chi_squared.statistic.toFixed(2)}, p-value: {results.chi_squared.p_value.toFixed(4)}, Cramer's V: {results.cramers_v.toFixed(3)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{questionOptions.find(q => q.value === rowVar)?.label}</TableHead>
                            {Object.keys(results.contingency_table).map(col => <TableHead key={col} className="text-right">{col}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(Object.values(results.contingency_table)[0]).map(([rowKey], rowIndex) => (
                             <TableRow key={rowIndex}>
                                <TableCell>{rowKey}</TableCell>
                                {Object.keys(results.contingency_table).map(colKey => (
                                    <TableCell key={colKey} className="text-right">{results.contingency_table[colKey][rowKey]}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

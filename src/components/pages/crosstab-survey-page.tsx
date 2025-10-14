
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sigma, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import type { Survey, SurveyResponse, Question } from '@/types/survey';

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
  const [rowVar, setRowVar] = useState<string>('');
  const [colVar, setColVar] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

  // Get all questions that can be used for crosstab
  const questionOptions = useMemo(() => {
    if (!survey || !survey.questions) return [];
    return survey.questions
      .filter(q => {
        // Include single choice, multiple choice, dropdown, rating and matrix questions
        return ['single', 'multiple', 'dropdown', 'rating', 'matrix'].includes(q.type);
      })
      .flatMap(q => {
        // For matrix questions, create an option for each row
        if (q.type === 'matrix' && q.rows) {
          return q.rows.map(row => ({
            label: `${q.title} - ${row}`,
            value: `${q.id}__${row}`,
            questionId: q.id,
            rowName: row
          }));
        }
        // For other question types, just use the question itself
        return [{
          label: q.title,
          value: q.id,
          questionId: q.id,
          rowName: null
        }];
      });
  }, [survey.questions]);

  // Set initial values
  useEffect(() => {
    if (questionOptions.length > 0) {
      setRowVar(questionOptions[0].value);
      if (questionOptions.length > 1) {
        setColVar(questionOptions[1].value);
      } else {
        setColVar('');
      }
    } else {
        setRowVar('');
        setColVar('');
    }
  }, [questionOptions]);

  const handleAnalysis = useCallback(async () => {
    if (!rowVar || !colVar) {
      toast({ 
        title: 'Selection Error', 
        description: 'Please select two variables for crosstabulation.', 
        variant: 'destructive' 
      });
      return;
    }

    if (rowVar === colVar) {
      toast({
        title: 'Selection Error',
        description: 'Row and Column variables must be different.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      // Parse the selected variables
      const rowOption = questionOptions.find(opt => opt.value === rowVar);
      const colOption = questionOptions.find(opt => opt.value === colVar);

      if (!rowOption || !colOption) {
        throw new Error('Selected variables not found');
      }

      // Extract data based on question type
      const dataForAnalysis = responses.map(r => {
        let rowValue: any;
        let colValue: any;

        // Get row value
        if (rowOption.rowName) {
          // Matrix question
          const matrixAnswer = r.answers[rowOption.questionId];
          rowValue = matrixAnswer?.[rowOption.rowName];
        } else {
          // Regular question
          rowValue = r.answers[rowOption.questionId];
        }

        // Get column value
        if (colOption.rowName) {
          // Matrix question
          const matrixAnswer = r.answers[colOption.questionId];
          colValue = matrixAnswer?.[colOption.rowName];
        } else {
          // Regular question
          colValue = r.answers[colOption.questionId];
        }

        // Handle array values (for multiple choice)
        if (Array.isArray(rowValue)) {
          rowValue = rowValue.join(', ');
        }
        if (Array.isArray(colValue)) {
          colValue = colValue.join(', ');
        }

        return {
          [rowOption.label]: rowValue,
          [colOption.label]: colValue
        };
      }).filter(row => row[rowOption.label] !== undefined && row[colOption.label] !== undefined);

      if (dataForAnalysis.length === 0) {
        throw new Error('No valid data found for the selected variables');
      }

      const response = await fetch('/api/analysis/crosstab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: dataForAnalysis, 
          rowVar: rowOption.label, 
          colVar: colOption.label 
        })
      });

      if (!response.ok) {
        const errorText = await response.json();
        throw new Error(errorText.error || 'Failed to analyze data.');
      }
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setAnalysisResult(result);

    } catch (e: any) {
      console.error('Crosstab error:', e);
      toast({ 
        title: 'Analysis Error', 
        description: e.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [rowVar, colVar, responses, toast, questionOptions]);
  
  const results = analysisResult?.results;

  // Get display labels for selected variables
  const rowLabel = questionOptions.find(q => q.value === rowVar)?.label || 'Row Variable';
  const colLabel = questionOptions.find(q => q.value === colVar)?.label || 'Column Variable';

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
              <label className="font-semibold block mb-2">Row Variable</label>
              <Select value={rowVar} onValueChange={setRowVar}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Row Variable..." />
                </SelectTrigger>
                <SelectContent>
                  {questionOptions.map(opt => (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value}
                      disabled={opt.value === colVar}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-semibold block mb-2">Column Variable</label>
              <Select value={colVar} onValueChange={setColVar}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Column Variable..." />
                </SelectTrigger>
                <SelectContent>
                  {questionOptions.map(opt => (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value}
                      disabled={opt.value === rowVar}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {rowVar && colVar && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Selected:</strong> {rowLabel} × {colLabel}
              </p>
            </div>
          )}

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              This analysis works best with categorical variables (e.g., single choice, multiple choice, matrix rows). 
              Results may not be meaningful for numeric or text-based questions.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleAnalysis} 
            disabled={isLoading || !rowVar || !colVar || rowVar === colVar}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Sigma className="mr-2 h-4 w-4" />
                Run Crosstab
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Analyzing crosstabulation...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Statistical Summary</CardTitle>
              <CardDescription>
                Chi-squared test results and effect size
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Chi-Squared Statistic</p>
                  <p className="text-2xl font-bold">{results.chi_squared.statistic.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">P-value</p>
                  <p className={`text-2xl font-bold ${results.chi_squared.p_value < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                    {results.chi_squared.p_value.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {results.chi_squared.p_value < 0.05 ? 'Significant' : 'Not Significant'}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Cramer's V</p>
                  <p className="text-2xl font-bold">{results.cramers_v.toFixed(3)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Effect Size</p>
                </div>
              </div>
              
              {results.interpretation && (
                <Alert className="mt-4">
                  <AlertTitle>Interpretation</AlertTitle>
                  <AlertDescription>{results.interpretation}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contingency Table</CardTitle>
              <CardDescription>
                {rowLabel} × {colLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">{rowLabel}</TableHead>
                      {Object.keys(results.contingency_table).map(col => (
                        <TableHead key={col} className="text-right font-bold">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(Object.values(results.contingency_table)[0] || {}).map(([rowKey]) => (
                      <TableRow key={rowKey}>
                        <TableCell className="font-semibold">{rowKey}</TableCell>
                        {Object.keys(results.contingency_table).map(colKey => (
                          <TableCell key={colKey} className="text-right">
                            {results.contingency_table[colKey]?.[rowKey] || 0}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

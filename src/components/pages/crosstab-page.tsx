
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sigma, AlertTriangle, FileSearch, Settings, MoveRight, HelpCircle, Columns } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import type { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';


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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const crosstabExample = exampleDatasets.find(d => d.id === 'crosstab');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Columns size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Crosstabulation & Chi-Squared Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Analyze the relationship and independence between two categorical variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Crosstabulation?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Crosstabulation (or contingency tables) is a fundamental tool for understanding the relationship between two categorical variables. It organizes data into a table that displays the frequency distribution of the variables, allowing you to see how the categories of one variable are related to the categories of another. The associated Chi-Squared test determines if this relationship is statistically significant.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {crosstabExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(crosstabExample)}>
                                <crosstabExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{crosstabExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{crosstabExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Row Variable:</strong> Select a categorical variable to form the rows of the table (e.g., 'Gender').</li>
                                <li><strong>Column Variable:</strong> Select another categorical variable for the columns (e.g., 'Product Preference').</li>
                                <li><strong>Run Analysis:</strong> The tool generates the contingency table, calculates the Chi-Squared statistic, and provides an interpretation.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Chi-Squared (χ²) Test:</strong> A p-value less than 0.05 indicates that there is a statistically significant association between the two variables; they are not independent.
                                </li>
                                <li>
                                    <strong>Cramer's V:</strong> Measures the strength of the association, ranging from 0 (no association) to 1 (perfect association).
                                </li>
                                <li>
                                    <strong>Contingency Table:</strong> Examine the counts in each cell to understand the nature of the relationship. Standardized residuals (if available) can highlight which specific cells contribute most to the association.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


interface CrosstabPageProps {
  data: DataSet;
  categoricalHeaders: string[];
  onLoadExample?: (example: ExampleDataSet) => void;
}

export default function CrosstabPage({ data, categoricalHeaders, onLoadExample }: CrosstabPageProps) {
  const { toast } = useToast();
  const [rowVar, setRowVar] = useState<string>('');
  const [colVar, setColVar] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
  const [view, setView] = useState('intro');

  const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length >= 2, [data, categoricalHeaders]);
  
  useEffect(() => {
    if (categoricalHeaders.length > 0) {
      setRowVar(categoricalHeaders[0]);
      if (categoricalHeaders.length > 1) {
        setColVar(categoricalHeaders[1]);
      } else {
        setColVar('');
      }
    }
    setAnalysisResult(null);
    setView(canRun ? 'main' : 'intro');
  }, [categoricalHeaders, data, canRun]);

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
      const response = await fetch('/api/analysis/crosstab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: data, 
          rowVar, 
          colVar 
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
  }, [rowVar, colVar, data, toast]);
  
  const results = analysisResult?.results;

  if (view === 'intro' || !canRun) {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample!} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline">Crosstabulation Setup</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
          </div>
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
                  {categoricalHeaders.map(opt => (
                    <SelectItem 
                      key={opt} 
                      value={opt}
                      disabled={opt === colVar}
                    >
                      {opt}
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
                  {categoricalHeaders.map(opt => (
                    <SelectItem 
                      key={opt} 
                      value={opt}
                      disabled={opt === rowVar}
                    >
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {rowVar && colVar && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Selected:</strong> {rowVar} × {colVar}
              </p>
            </div>
          )}
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
                {rowVar} × {colVar}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">{rowVar}</TableHead>
                      {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (
                        <TableHead key={col} className="text-right font-bold">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {Object.entries(results.contingency_table).map(([rowKey, rowData]) => (
                      <TableRow key={rowKey}>
                        <TableCell className="font-semibold">{rowKey}</TableCell>
                        {Object.values(rowData).map((cellValue, index) => (
                          <TableCell key={index} className="text-right">
                            {cellValue}
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

    
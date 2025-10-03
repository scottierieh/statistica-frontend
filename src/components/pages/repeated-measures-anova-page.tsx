'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sigma, Loader2, ArrowRight, TestTube2, CheckCircle, AlertCircle, BarChart, LineChart, HelpCircle, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { exampleDatasets } from '@/lib/example-datasets';

interface AnalysisResult {
  anova_table: Record<string, any>[];
  sphericity: {
    mauchly_w: number;
    p_value: number;
    sphericity_met: boolean;
    epsilon_gg: number;
    epsilon_hf: number;
    recommendation: string;
  };
  corrections: {
    'Greenhouse-Geisser': { df1: number; df2: number; 'p-value': number };
    'Huynh-Feldt': { df1: number; df2: number; 'p-value': number };
  };
  effect_size: {
    partial_eta_squared: number;
    interpretation: string;
  };
  post_hoc?: Record<string, any>[];
  recommended_result: {
      method: string;
      p_value: number;
      significant: boolean;
  }
}

const AnalysisPlaceholder = ({ onLoadExample }: { onLoadExample: (data: any) => void }) => {
    const rmAnovaExample = exampleDatasets.find(d => d.id === 'rm-anova');
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><HelpCircle /> About Repeated Measures ANOVA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 prose prose-sm dark:prose-invert max-w-full">
                <p>Repeated Measures Analysis of Variance (ANOVA) is a statistical test used to detect differences in mean scores across three or more related groups. It is an extension of the paired-samples t-test and is used when you measure the same subjects under multiple conditions or at multiple time points.</p>
                
                <h4>Key Concepts</h4>
                <ul>
                    <li><strong>Within-Subjects Factor:</strong> The independent variable that represents the different conditions or time points being compared (e.g., Time 1, Time 2, Time 3).</li>
                    <li><strong>Dependent Variable:</strong> The outcome variable being measured at each time point (must be continuous).</li>
                    <li><strong>Sphericity:</strong> An important assumption that the variances of the differences between all possible pairs of within-subject conditions are equal. Violations of this assumption require statistical corrections.</li>
                </ul>

                <h4>Assumptions</h4>
                <ol>
                    <li>The dependent variable should be measured at the continuous (interval or ratio) level.</li>
                    <li>The within-subjects factor should consist of at least two categorical, related groups or matched pairs.</li>
                    <li>There should be no significant outliers in the differences between the related groups.</li>
                    <li>The distribution of the differences in the dependent variable between all pairs of related groups should be approximately normally distributed.</li>
                    <li><strong>Sphericity:</strong> The variances of the differences between all combinations of related groups must be equal. This is automatically checked by Mauchly's Test in this tool.</li>
                </ol>
                
                 <h4>Interpretation of Results</h4>
                <ul>
                    <li><strong>ANOVA F-statistic and p-value:</strong> Indicates whether there is an overall significant difference between the means of the groups.</li>
                    <li><strong>Mauchly's Test of Sphericity:</strong> If the p-value is less than .05, the assumption of sphericity is violated.</li>
                     <li><strong>Corrections (Greenhouse-Geisser, Huynh-Feldt):</strong> If sphericity is violated, you should use the p-value from one of these corrected tests. Greenhouse-Geisser is more conservative and commonly used when epsilon (ε) is &lt; .75.</li>
                    <li><strong>Post-Hoc Tests:</strong> If the overall ANOVA is significant, post-hoc tests (like Bonferroni-corrected t-tests) are used to find out which specific group means are different from each other.</li>
                </ul>

                {rmAnovaExample && (
                    <div className="text-center py-4">
                        <Button onClick={() => onLoadExample(rmAnovaExample)}>
                            <BookOpen className="mr-2" /> Load Example: {rmAnovaExample.name}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
};

const RepeatedMeasuresANOAPage = ({ data, allHeaders, onLoadExample }: { data: DataSet; allHeaders: string[], onLoadExample: (data: any) => void }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [plots, setPlots] = useState<{ boxplot?: string; lineplot?: string } | null>(null);

  const [subjectCol, setSubjectCol] = useState<string>('');
  const [conditionCol, setConditionCol] = useState<string>('');
  const [valueCol, setValueCol] = useState<string>('');
  
  const numericHeaders = useMemo(() => {
    if (!data || data.length === 0) return [];
    return allHeaders.filter(h => typeof data[0][h] === 'number');
  }, [data, allHeaders]);

  const canRun = subjectCol && conditionCol && valueCol;

  const runAnalysis = useCallback(async () => {
    if (!canRun) {
      toast({ title: 'Incomplete Selection', description: 'Please select all required variables.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    setPlots(null);

    try {
      const response = await fetch('/api/analysis/repeated-measures-anova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, subject_col: subjectCol, condition_col: conditionCol, value_col: valueCol }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Analysis failed');
      }

      const res = await response.json();
      if (res.error) throw new Error(res.error);

      setResult(res.results);
      setPlots(res.plots);
      toast({ title: 'Analysis Complete', description: 'Repeated measures ANOVA has been successfully executed.' });
    } catch (error: any) {
      toast({ title: 'Analysis Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [data, subjectCol, conditionCol, valueCol, canRun, toast]);

  const ResultSummary = () => {
      if(!result) return null;
      const { significant, method, p_value } = result.recommended_result;
      const Icon = significant ? AlertCircle : CheckCircle;
      const alertVariant = significant ? 'default' : 'success'; // Changed to success for non-significant
      const title = `The difference is statistically ${significant ? 'significant' : 'not significant'}.`;
      const description = `Based on the ${method} correction, the p-value is ${p_value.toFixed(4)}, which is ${significant ? 'less' : 'greater'} than the common alpha level of 0.05.`;
      return (
          <Alert variant={alertVariant}>
              <Icon className="h-4 w-4" />
              <AlertTitle>{title}</AlertTitle>
              <AlertDescription>{description}</AlertDescription>
          </Alert>
      )
  }

  if (data.length === 0) {
    return <AnalysisPlaceholder onLoadExample={onLoadExample} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Repeated Measures ANOVA</CardTitle>
          <CardDescription>Analyzes differences in mean scores under three or more different conditions for the same subject.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold">Subject Identifier</label>
              <Select value={subjectCol} onValueChange={setSubjectCol}>
                <SelectTrigger><SelectValue placeholder="Select Subject Column..." /></SelectTrigger>
                <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-semibold">Within-Subject Condition</label>
              <Select value={conditionCol} onValueChange={setConditionCol}>
                <SelectTrigger><SelectValue placeholder="Select Condition Column..." /></SelectTrigger>
                <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-semibold">Dependent Value</label>
              <Select value={valueCol} onValueChange={setValueCol}>
                <SelectTrigger><SelectValue placeholder="Select Value Column..." /></SelectTrigger>
                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={runAnalysis} disabled={!canRun || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sigma className="mr-2 h-4 w-4" />} Run Analysis
          </Button>
        </CardFooter>
      </Card>

      {isLoading && <Skeleton className="w-full h-96" />}

      {result && (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary & Plots</TabsTrigger>
            <TabsTrigger value="sphericity">Sphericity Test</TabsTrigger>
            <TabsTrigger value="anova">ANOVA Table</TabsTrigger>
            {result.post_hoc && <TabsTrigger value="posthoc">Post-Hoc Tests</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="summary" className="mt-4 space-y-4">
            <ResultSummary />
            <div className="grid md:grid-cols-2 gap-4">
                 {plots?.boxplot && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart /> Distribution by Condition</CardTitle></CardHeader>
                        <CardContent className="flex justify-center items-center"><Image src={`data:image/png;base64,${plots.boxplot}`} alt="Box Plot" width={500} height={400} /></CardContent>
                    </Card>
                )}
                {plots?.lineplot && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><LineChart /> Repeated Measures by Subject</CardTitle></CardHeader>
                        <CardContent className="flex justify-center items-center"><Image src={`data:image/png;base64,${plots.lineplot}`} alt="Line Plot" width={500} height={400} /></CardContent>
                    </Card>
                )}
            </div>
          </TabsContent>

          <TabsContent value="sphericity" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TestTube2/> Mauchly&apos;s Test of Sphericity</CardTitle>
                    <CardDescription>{result.sphericity.recommendation}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow><TableCell>Mauchly&apos;s W</TableCell><TableCell>{result.sphericity.mauchly_w ? result.sphericity.mauchly_w.toFixed(4) : 'N/A'}</TableCell></TableRow>
                            <TableRow><TableCell>p-value</TableCell><TableCell>{result.sphericity.p_value ? result.sphericity.p_value.toFixed(4) : 'N/A'}</TableCell></TableRow>
                            <TableRow><TableCell>Sphericity Assumed?</TableCell><TableCell>{result.sphericity.sphericity_met ? 'Yes' : 'No'}</TableCell></TableRow>
                            <TableRow><TableCell>Greenhouse-Geisser ε</TableCell><TableCell>{result.sphericity.epsilon_gg.toFixed(4)}</TableCell></TableRow>
                            <TableRow><TableCell>Huynh-Feldt ε</TableCell><TableCell>{result.sphericity.epsilon_hf.toFixed(4)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anova" className="mt-4">
             <Card>
                <CardHeader><CardTitle>ANOVA Results</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>SS</TableHead><TableHead>df</TableHead><TableHead>MS</TableHead><TableHead>F</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {result.anova_table.map((row, i) => <TableRow key={i}><TableCell>{row.Source}</TableCell><TableCell>{row.SS.toFixed(2)}</TableCell><TableCell>{typeof row.df === 'number' ? row.df.toFixed(0) : row.df}</TableCell><TableCell>{typeof row.MS === 'number' ? row.MS.toFixed(2) : row.MS}</TableCell><TableCell>{typeof row.F === 'number' ? row.F.toFixed(3) : row.F}</TableCell><TableCell>{typeof row['p-value'] === 'number' ? row['p-value'].toFixed(4) : row['p-value']}</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                    <h4 className="font-semibold mt-4">Corrected Tests</h4>
                    <Table>
                        <TableHeader><TableRow><TableHead>Correction</TableHead><TableHead>df1</TableHead><TableHead>df2</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            <TableRow><TableCell>Greenhouse-Geisser</TableCell><TableCell>{result.corrections['Greenhouse-Geisser'].df1.toFixed(2)}</TableCell><TableCell>{result.corrections['Greenhouse-Geisser'].df2.toFixed(2)}</TableCell><TableCell>{result.corrections['Greenhouse-Geisser']['p-value'].toFixed(4)}</TableCell></TableRow>
                            <TableRow><TableCell>Huynh-Feldt</TableCell><TableCell>{result.corrections['Huynh-Feldt'].df1.toFixed(2)}</TableCell><TableCell>{result.corrections['Huynh-Feldt'].df2.toFixed(2)}</TableCell><TableCell>{result.corrections['Huynh-Feldt']['p-value'].toFixed(4)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
          </TabsContent>

          {result.post_hoc && <TabsContent value="posthoc" className="mt-4">
             <Card>
                <CardHeader><CardTitle>Post-Hoc Pairwise Comparisons</CardTitle><CardDescription>Bonferroni corrected t-tests for each pair of conditions.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Contrast</TableHead><TableHead>Mean Difference</TableHead><TableHead>t-statistic</TableHead><TableHead>p-value (Bonferroni)</TableHead><TableHead>Cohen&apos;s d</TableHead></TableRow></TableHeader>
                        <TableBody>
                           {result.post_hoc.map((row, i) => (
                                <TableRow key={i} className={row.significant ? 'bg-primary/10' : ''}>
                                    <TableCell>{row.Contrast}</TableCell>
                                    <TableCell>{row.Mean_Diff.toFixed(3)}</TableCell>
                                    <TableCell>{row['t-stat'].toFixed(3)}</TableCell>
                                    <TableCell>{row['p-bonferroni'].toFixed(4)}</TableCell>
                                    <TableCell>{row.cohens_d.toFixed(3)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
          </TabsContent>}
        </Tabs>
      )}
    </div>
  );
};

export default RepeatedMeasuresANOAPage;

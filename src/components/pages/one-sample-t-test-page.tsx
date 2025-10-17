
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sigma, Loader2, HelpCircle, BookOpen, CheckCircle, AlertCircle, BarChart } from 'lucide-react';
import Image from 'next/image';
import { exampleDatasets } from '@/lib/example-datasets';

interface AnalysisResult {
  summary_stats: Record<string, number>;
  t_test: Record<string, number>;
  confidence_interval: Record<string, any>;
  effect_size: {
    "Cohen's d": number;
    Interpretation: string;
  };
}

const AnalysisPlaceholder = ({ onLoadExample }: { onLoadExample: (data: any) => void }) => {
    // We can create a specific example for one-sample t-test later if needed.
    const example = exampleDatasets.find(d => d.id === 'student-performance');
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><HelpCircle /> About One-Sample T-Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 prose prose-sm dark:prose-invert max-w-full">
                <p>A One-Sample T-Test is used to determine whether the mean of a single sample is statistically different from a known or hypothesized population mean.</p>
                
                <h4>Key Questions</h4>
                <ul>
                    <li>Is the average score of a group of students significantly different from the national average of 75?</li>
                    <li>Is the average weight of a manufactured product significantly different from the required specification of 500g?</li>
                </ul>

                <h4>Assumptions</h4>
                <ol>
                    <li>The dependent variable must be continuous (i.e., measured on an interval or ratio scale).</li>
                    <li>The observations are independent of one another.</li>
                    <li>The dependent variable should be approximately normally distributed.</li>
                     <li>The dependent variable should not contain any significant outliers.</li>
                </ol>
                
                 <h4>Interpretation of Results</h4>
                <ul>
                    <li><strong>t-statistic:</strong> The ratio of the difference between the sample mean and the hypothesized mean to the standard error of the mean. A larger absolute t-value indicates a larger difference.</li>
                    <li><strong>p-value:</strong> The probability of observing a t-statistic as extreme as, or more extreme than, the one calculated, assuming the null hypothesis is true. A p-value less than your chosen alpha level (e.g., 0.05) suggests that you can reject the null hypothesis.</li>
                    <li><strong>Cohen&apos;s d:</strong> An effect size used to indicate the standardized difference between two means. It helps in understanding the magnitude of the difference, regardless of statistical significance.</li>
                </ul>

                {example && (
                    <div className="text-center py-4">
                        <Button onClick={() => onLoadExample(example)}>
                            <BookOpen className="mr-2" /> Load Example: {example.name}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
};

const OneSampleTTestPage = ({ data, numericHeaders, onLoadExample }: { data: DataSet; numericHeaders: string[], onLoadExample: (data: any) => void }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [plot, setPlot] = useState<string | null>(null);

  const [variable, setVariable] = useState<string>('');
  const [testMean, setTestMean] = useState<string>('0');

  const canRun = variable && testMean !== '';

  const runAnalysis = useCallback(async () => {
    if (!canRun) {
      toast({ title: 'Incomplete Selection', description: 'Please select a variable and enter a test mean.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    setPlot(null);

    try {
      const response = await fetch('/api/analysis/one-sample-ttest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, variable, test_mean: testMean }),
      });

      const res = await response.json();
      if (!response.ok || res.error) {
        throw new Error(res.details || res.error || 'Analysis failed');
      }

      setResult(res.results);
      setPlot(res.plots.distribution_plot);
      toast({ title: 'Analysis Complete', description: 'One-Sample T-Test has been successfully executed.' });
    } catch (error: any) {
      toast({ title: 'Analysis Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [data, variable, testMean, canRun, toast]);

  const ResultSummary = () => {
    if (!result) return null;
    const p_value = result.t_test['p-value'];
    const significant = p_value < 0.05;
    const Icon = significant ? AlertCircle : CheckCircle;
    const alertVariant = significant ? 'destructive' : 'success';
    const title = `The sample mean is statistically ${significant ? 'different' : 'not different'} from the test mean.`;
    const description = `The p-value is ${p_value.toFixed(4)}. The sample mean (${result.summary_stats.Mean.toFixed(2)}) is ${significant ? 'significantly' : 'not significantly'} different from the hypothesized population mean of ${result.t_test['Test Mean']}.`;
    return (
        <Alert variant={alertVariant}>
            <Icon className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
        </Alert>
    )
  }
  
  if (data.length === 0) {
      return <AnalysisPlaceholder onLoadExample={onLoadExample} />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>One-Sample T-Test</CardTitle>
          <CardDescription>Compares the mean of a single sample to a known or hypothesized population mean.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
                <label className="font-semibold">Variable</label>
                <Select value={variable} onValueChange={setVariable}>
                    <SelectTrigger><SelectValue placeholder="Select a numeric variable..." /></SelectTrigger>
                    <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <label htmlFor='test-mean' className="font-semibold">Test Mean (μ₀)</label>
                <Input id="test-mean" type="number" value={testMean} onChange={(e) => setTestMean(e.target.value)} placeholder="Enter hypothesized mean..." />
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
          <div className='space-y-6'>
            <ResultSummary />
            <div className="grid md:grid-cols-2 gap-6">
                {plot && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart /> Distribution Plot</CardTitle></CardHeader>
                        <CardContent className="flex justify-center items-center">
                            <Image src={`data:image/png;base64,${plot}`} alt="Distribution Plot" width={600} height={400} className="mx-auto h-auto rounded-md border" />
                        </CardContent>
                    </Card>
                )}
                <div className='space-y-4'>
                     <Card>
                        <CardHeader><CardTitle>T-Test Results</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <TableRow><TableCell>t-statistic</TableCell><TableCell className="text-right font-mono">{result.t_test['t-statistic'].toFixed(3)}</TableCell></TableRow>
                                    <TableRow><TableCell>Degrees of Freedom (df)</TableCell><TableCell className="text-right font-mono">{result.t_test.df}</TableCell></TableRow>
                                    <TableRow><TableCell>p-value</TableCell><TableCell className="text-right font-mono">{result.t_test['p-value'] < 0.001 ? '< 0.001' : result.t_test['p-value'].toFixed(4)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <TableRow><TableCell>Sample Size (N)</TableCell><TableCell className="text-right font-mono">{result.summary_stats.N}</TableCell></TableRow>
                                    <TableRow><TableCell>Sample Mean</TableCell><TableCell className="text-right font-mono">{result.summary_stats.Mean.toFixed(3)}</TableCell></TableRow>
                                    <TableRow><TableCell>Std. Deviation</TableCell><TableCell className="text-right font-mono">{result.summary_stats['Std. Dev.'].toFixed(3)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </div>
                 <Card className="md:col-span-2">
                    <CardHeader><CardTitle>Effect Size & Confidence Interval</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                             <TableBody>
                                <TableRow><TableCell>Cohen&apos;s d</TableCell><TableCell className="text-right font-mono">{result.effect_size["Cohen's d"].toFixed(3)}</TableCell></TableRow>
                                <TableRow><TableCell>Interpretation</TableCell><TableCell className="text-right font-mono">{result.effect_size.Interpretation}</TableCell></TableRow>
                                <TableRow><TableCell>95% Confidence Interval</TableCell><TableCell className="text-right font-mono">[{result.confidence_interval.CI_lower.toFixed(3)}, {result.confidence_interval.CI_upper.toFixed(3)}]</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
};

export default OneSampleTTestPage;


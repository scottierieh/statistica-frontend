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
import { Sigma, Loader2, HelpCircle, BookOpen, CheckCircle, AlertCircle, BarChart, Settings, FileSearch, MoveRight } from 'lucide-react';
import Image from 'next/image';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';

interface AnalysisResult {
  summary_stats: Record<string, number>;
  t_test: Record<string, number>;
  confidence_interval: Record<string, any>;
  effect_size: {
    "Cohen's d": number;
    Interpretation: string;
  };
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Sigma size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">One-Sample T-Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Determine if the mean of a single sample is statistically different from a known or hypothesized population mean.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use a One-Sample T-Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is useful when you want to compare your sample's average against a benchmark, a standard value, or a previously established mean. For example, testing if the average IQ score of a group of students is different from the national average of 100.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {ttestExample && (
                             <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ttestExample)}>
                                <ttestExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ttestExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ttestExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variable:</strong> Choose the single numeric variable you want to test.</li>
                                <li><strong>Enter Test Mean:</strong> Input the known or hypothesized mean you want to compare your sample against.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform the t-test and provide all relevant statistics and visualizations.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>t-statistic &amp; p-value:</strong> The core of the test. A p-value less than 0.05 indicates a statistically significant difference between your sample mean and the test mean.
                                </li>
                                <li>
                                    <strong>Cohen's d:</strong> Measures the size of the effect. A larger 'd' indicates a more substantial difference.
                                </li>
                                 <li>
                                    <strong>Confidence Interval:</strong> If this interval does not contain your test mean, it confirms a significant result.
                                </li>
                                <li>
                                    <strong>Distribution Plot:</strong> Visually compare your sample's distribution against the test mean.
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

const AnalysisPlaceholder = ({ onLoadExample }: { onLoadExample: (data: any) => void }) => {
    // This is a simplified placeholder as the main control is handled by the parent page
    return <IntroPage onStart={() => {}} onLoadExample={onLoadExample} />;
};


const OneSampleTTestPage = ({ data, numericHeaders, onLoadExample, onFileSelected }: { data: DataSet; numericHeaders: string[], onLoadExample: (data: any) => void, onFileSelected: (file: File) => void }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [plot, setPlot] = useState<string | null>(null);
  const [view, setView] = useState('intro');

  const [variable, setVariable] = useState<string>('');
  const [testMean, setTestMean] = useState<string>('0');
  
  const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

  useEffect(() => {
    setVariable(numericHeaders[0] || '');
    setTestMean('0');
    setResult(null);
    setPlot(null);
    setView(canRun ? 'main' : 'intro');
  }, [data, numericHeaders, canRun]);

  const runAnalysis = useCallback(async () => {
    if (!variable || testMean === '') {
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
  }, [data, variable, testMean, toast]);

  const ResultSummary = () => {
    if (!result) return null;
    const p_value = result.t_test['p-value'];
    const significant = p_value < 0.05;
    const Icon = significant ? AlertCircle : CheckCircle;
    const alertVariant = significant ? 'destructive' : 'default';
    const title = `The sample mean is statistically ${significant ? 'different' : 'not different'} from the test mean.`;
    const description = `The p-value is ${p_value < 0.001 ? '< 0.001' : p_value.toFixed(4)}. The sample mean (${result.summary_stats.Mean.toFixed(2)}) is ${significant ? 'significantly' : 'not significantly'} different from the hypothesized population mean of ${result.t_test['Test Mean']}.`;
    return (
        <Alert variant={alertVariant}>
            <Icon className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
        </Alert>
    )
  }
  
  if (view === 'intro' || !canRun) {
      return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>One-Sample T-Test</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
          </div>
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
          <Button onClick={runAnalysis} disabled={!variable || testMean === '' || isLoading}>
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
                    <CardHeader><CardTitle>Effect Size &amp; Confidence Interval</CardTitle></CardHeader>
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

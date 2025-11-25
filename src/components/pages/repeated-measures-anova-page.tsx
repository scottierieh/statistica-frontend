'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Sigma, Loader2, Repeat, CheckCircle, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, Users, TrendingUp, Target, Activity, BarChart3, BookOpen, Clock, Zap } from 'lucide-react';
import Image from 'next/image';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';

interface FullAnalysisResponse {
    results: {
        anova_table?: any[];
        mauchly_test?: any;
        posthoc_results?: any[];
        interpretation?: string;
    };
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: any }) => {
    const withinRow = results.anova_table?.find((row: any) => row.Source === 'Within');
    const betweenRow = results.anova_table?.find((row: any) => row.Source === 'Between');
    const interactionRow = results.anova_table?.find((row: any) => row.Source?.includes('*'));
    
    const getEffectSizeInterpretation = (eta_squared: number) => {
        if (eta_squared >= 0.14) return 'Large effect';
        if (eta_squared >= 0.06) return 'Medium effect';
        if (eta_squared >= 0.01) return 'Small effect';
        return 'Negligible';
    };

    const sphericityViolated = results.mauchly_test && results.mauchly_test['p-val'] < 0.05;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Within-Subjects Effect Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Within-Subjects
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${withinRow && withinRow['p-unc'] > 0.05 ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {withinRow ? (sphericityViolated ? 
                                (withinRow['p-GG-corr'] < 0.001 ? '<0.001' : withinRow['p-GG-corr']?.toFixed(4)) :
                                (withinRow['p-unc'] < 0.001 ? '<0.001' : withinRow['p-unc']?.toFixed(4))
                            ) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {sphericityViolated ? 'GG-corrected' : 'Uncorrected'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Between-Subjects Effect Card (if applicable) */}
            {betweenRow && (
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Between-Subjects
                                </p>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className={`text-2xl font-semibold ${betweenRow['p-unc'] > 0.05 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {betweenRow['p-unc'] < 0.001 ? '<0.001' : betweenRow['p-unc']?.toFixed(4)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                F = {betweenRow.F?.toFixed(2)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Effect Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Effect Size (η²p)
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {withinRow ? withinRow.np2?.toFixed(3) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {withinRow ? getEffectSizeInterpretation(withinRow.np2) : 'Within effect'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Sphericity Test Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Sphericity
                            </p>
                            {sphericityViolated ? 
                                <AlertTriangle className="h-4 w-4 text-yellow-600" /> : 
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {sphericityViolated ? 'Violated' : 'Met'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.mauchly_test ? `p = ${results.mauchly_test['p-val']?.toFixed(3)}` : 'Not tested'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const RmAnovaOverview = ({ subjectCol, withinCols, betweenCol, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (subjectCol && withinCols.length >= 2) {
            overview.push(`Analyzing ${withinCols.length} repeated measures`);
            if (betweenCol) {
                overview.push(`With between-subjects factor: ${betweenCol}`);
            }
        } else {
            overview.push('Select subject ID and at least 2 repeated measures');
        }

        // Subject information
        if (subjectCol && data.length > 0) {
            const uniqueSubjects = new Set(data.map((row: any) => row[subjectCol])).size;
            overview.push(`Number of subjects: ${uniqueSubjects}`);
            
            if (uniqueSubjects < 10) {
                overview.push('⚠ Very few subjects - results may be unstable');
            } else if (uniqueSubjects < 20) {
                overview.push('⚠ Small sample size - check assumptions carefully');
            }
        }

        // Repeated measures info
        if (withinCols.length > 0) {
            overview.push(`Time points/conditions: ${withinCols.length}`);
            if (withinCols.length === 2) {
                overview.push('Sphericity assumption not applicable (only 2 levels)');
            } else {
                overview.push('Will test sphericity assumption (Mauchly\'s test)');
            }
        }

        // Between-subjects groups
        if (betweenCol && data.length > 0) {
            const groups = new Set(data.map((row: any) => row[betweenCol])).size;
            overview.push(`Between-subjects groups: ${groups}`);
        }

        // Test type
        if (betweenCol) {
            overview.push('Test type: Mixed (split-plot) ANOVA');
            overview.push('Tests within-subjects, between-subjects, and interaction effects');
        } else {
            overview.push('Test type: One-way Repeated Measures ANOVA');
            overview.push('Tests for differences across repeated measurements');
        }

        return overview;
    }, [subjectCol, withinCols, betweenCol, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const rmAnovaExample = exampleDatasets.find(d => d.id === 'rm-anova');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Repeat className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Repeated Measures ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Analyze within-subjects designs with multiple measurements per participant
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Clock className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Longitudinal Data</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test changes across multiple time points or conditions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Increased Power</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Controls for individual differences between subjects
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Within-Subject Design</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Same participants measured multiple times
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Repeated Measures ANOVA for longitudinal studies, pre-test/post-test designs, or 
                            experiments where participants experience multiple conditions. It increases statistical 
                            power by controlling for individual differences, making it easier to detect true effects 
                            of interventions or changes over time.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Data format:</strong> Wide format (one row per subject)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Subject ID:</strong> Unique identifier column</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Repeated measures:</strong> 2+ measurement columns</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sphericity:</strong> Mauchly's test (p &gt; .05 ideal)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Main effect:</strong> Change across time/conditions</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Correction:</strong> GG/HF if sphericity violated</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {rmAnovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(rmAnovaExample)} size="lg">
                                {rmAnovaExample.icon && <rmAnovaExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default function RepeatedMeasuresAnovaPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: { data: DataSet; allHeaders: string[], numericHeaders: string[], categoricalHeaders: string[], onLoadExample: (data: any) => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
  const [view, setView] = useState('intro');

  const [subjectCol, setSubjectCol] = useState<string | undefined>();
  const [withinCols, setWithinCols] = useState<string[]>([]);
  const [betweenCol, setBetweenCol] = useState<string | undefined>();
  
  const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);

  useEffect(() => {
    if (canRun) {
        setSubjectCol(allHeaders.find(h => !numericHeaders.includes(h)));
        setWithinCols(numericHeaders.slice(0,3));
        setBetweenCol(undefined);
        setView('main');
    } else {
        setView('intro');
    }
    setAnalysisResult(null);
  }, [canRun, allHeaders, numericHeaders]);

  const handleWithinChange = (header: string, checked: boolean) => {
    setWithinCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
  };

  const handleAnalysis = useCallback(async () => {
    if (!subjectCol || withinCols.length < 2) {
      toast({ title: 'Incomplete Selection', description: 'Please select a subject column and at least two within-subject (repeated measures) columns.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analysis/repeated-measures-anova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, subjectCol, withinCols, dependentVar: 'score', betweenCol }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const res = await response.json();
      if (res.error) throw new Error(res.error);

      setAnalysisResult(res);
      toast({ title: 'Analysis Complete', description: 'Repeated measures ANOVA has been successfully executed.' });
    } catch (error: any) {
      toast({ title: 'Analysis Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [data, subjectCol, withinCols, betweenCol, toast]);
  
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;
    const sphericityViolated = results?.mauchly_test && results.mauchly_test['p-val'] < 0.05;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
           <div className="flex justify-between items-center">
              <CardTitle className="font-headline">Repeated Measures ANOVA Setup</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
           </div>
          <CardDescription>Configure your within-subjects and optional between-subjects factors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Subject Identifier</Label>
                  <Select value={subjectCol} onValueChange={setSubjectCol}><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                   <Label>Between-Subjects Factor (Optional)</Label>
                  <Select value={betweenCol} onValueChange={(v) => setBetweenCol(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categoricalHeaders.filter(h => h !== subjectCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                </div>
             </div>
             <div>
                <Label>Within-Subjects Factors (Repeated Measures)</Label>
                 <ScrollArea className="h-40 border rounded-md p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {numericHeaders.filter(h => h !== subjectCol && h !== betweenCol).map(h => (
                            <div key={h} className="flex items-center space-x-2">
                                <Checkbox id={`within-${h}`} checked={withinCols.includes(h)} onCheckedChange={(c) => handleWithinChange(h, c as boolean)} />
                                <Label htmlFor={`within-${h}`}>{h}</Label>
                            </div>
                        ))}
                      </div>
                </ScrollArea>
             </div>
             
             {/* Overview component */}
             <RmAnovaOverview 
                subjectCol={subjectCol}
                withinCols={withinCols}
                betweenCol={betweenCol}
                data={data}
             />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleAnalysis} disabled={isLoading || withinCols.length < 2}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sigma className="mr-2 h-4 w-4" />} Run Analysis
          </Button>
        </CardFooter>
      </Card>

      {isLoading && (
        <Card>
            <CardContent className="p-6">
                <Skeleton className="h-96 w-full" />
            </CardContent>
        </Card>
      )}

      {analysisResult && results && (
        <div className="space-y-4">
            {/* Statistical Summary Cards */}
            <StatisticalSummaryCards results={results} />
            
            {/* Test Results and Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle>Test Results & Visualization</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        {results.interpretation ? (
                            <Alert variant={results.anova_table?.[0]?.['p-unc'] > 0.05 ? 'destructive' : 'default'}>
                                {results.anova_table?.[0]?.['p-unc'] <= 0.05 ? 
                                    <CheckCircle className="h-4 w-4" /> : 
                                    <AlertTriangle className="h-4 w-4" />
                                }
                                <AlertTitle>
                                    {results.anova_table?.[0]?.['p-unc'] <= 0.05
                                        ? 'Significant Effect Found'
                                        : 'No Significant Effect'
                                    }
                                </AlertTitle>
                                <AlertDescription>
                                    {results.interpretation}
                                </AlertDescription>
                            </Alert>
                        ) : null}
                        
                        <div>
                            <h4 className="text-sm font-medium mb-2">Key Findings</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">F</TableHead>
                                        <TableHead className="text-right">
                                            {sphericityViolated ? 'p (GG-corr)' : 'p-value'}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(results.anova_table || []).slice(0, 3).map((row: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{row.Source}</TableCell>
                                            <TableCell className="text-right font-mono">{row.F?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {sphericityViolated && row['p-GG-corr'] ? 
                                                    (row['p-GG-corr'] < 0.001 ? '<.001' : row['p-GG-corr']?.toFixed(4)) :
                                                    (row['p-unc'] < 0.001 ? '<.001' : row['p-unc']?.toFixed(4))
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    {analysisResult.plot && (
                        <Image 
                            src={analysisResult.plot} 
                            alt="Repeated Measures Plot" 
                            width={800} 
                            height={600} 
                            className="w-full rounded-md border"
                        />
                    )}
                </CardContent>
            </Card>

            {/* Complete ANOVA Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Complete ANOVA Table</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Source</TableHead>
                                <TableHead className="text-right">SS</TableHead>
                                <TableHead className="text-right">df</TableHead>
                                <TableHead className="text-right">MS</TableHead>
                                <TableHead className="text-right">F</TableHead>
                                <TableHead className="text-right">p-unc</TableHead>
                                <TableHead className="text-right">p-GG-corr</TableHead>
                                <TableHead className="text-right">η²p</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(results.anova_table || []).map((row: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{row.Source}</TableCell>
                                    <TableCell className="text-right font-mono">{row.SS?.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{row.ddof1 ?? row.DF ?? 'N/A'}</TableCell>
                                    <TableCell className="text-right font-mono">{row.MS?.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{row.F?.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {row['p-unc'] < 0.001 ? '<.001' : row['p-unc']?.toFixed(4)}
                                        {getSignificanceStars(row['p-unc'])}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {row['p-GG-corr'] ? (row['p-GG-corr'] < 0.001 ? '<.001' : row['p-GG-corr']?.toFixed(4)) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{row.np2?.toFixed(3)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <p className='text-sm text-muted-foreground'>
                        η²p: Partial Eta-Squared (Effect Size) | Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                        {sphericityViolated && ' | Using Greenhouse-Geisser corrected p-values due to sphericity violation'}
                    </p>
                </CardFooter>
            </Card>

            {/* Sphericity Test */}
            {results.mauchly_test && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sphericity Assumption Check</CardTitle>
                        <CardDescription>Mauchly's Test of Sphericity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <p className="font-medium">Sphericity Assumption</p>
                                <p className="text-sm text-muted-foreground">
                                    Tests if variances of differences between conditions are equal
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {results.mauchly_test.spher ? 
                                    <Badge variant="default">Met</Badge> : 
                                    <Badge variant="destructive">Violated</Badge>
                                }
                                <span className='font-mono text-sm'>
                                    W = {typeof results.mauchly_test['W'] === 'number' ? results.mauchly_test['W'].toFixed(3) : 'N/A'}, 
                                    p = {typeof results.mauchly_test['p-val'] === 'number' ? results.mauchly_test['p-val'].toFixed(4) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">
                            {!results.mauchly_test.spher ?
                                '⚠ Sphericity violated. Using Greenhouse-Geisser corrected p-values in the results above.' :
                                '✓ Sphericity assumption met. Uncorrected p-values are valid.'}
                        </p>
                    </CardFooter>
                </Card>
            )}

            {/* Post-hoc Tests */}
            {results.posthoc_results && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pairwise Comparisons</CardTitle>
                        <CardDescription>Post-hoc tests with Bonferroni correction</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contrast</TableHead>
                                    <TableHead>Time A</TableHead>
                                    <TableHead>Time B</TableHead>
                                    <TableHead className="text-right">T</TableHead>
                                    <TableHead className="text-right">p-corr</TableHead>
                                    <TableHead className="text-right">Effect Size</TableHead>
                                    <TableHead className="text-center">Significant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.posthoc_results.map((row: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{row.Contrast}</TableCell>
                                        <TableCell>{row.A}</TableCell>
                                        <TableCell>{row.B}</TableCell>
                                        <TableCell className="font-mono text-right">{row.T?.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">
                                            {row['p-corr'] < 0.001 ? '<.001' : row['p-corr']?.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="font-mono text-right">{row.hedges?.toFixed(3)}</TableCell>
                                        <TableCell className="text-center">
                                            {row['p-corr'] < 0.05 ? 
                                                <CheckCircle className="h-4 w-4 text-green-600 inline" /> : 
                                                <span className="text-muted-foreground">-</span>
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <p className='text-sm text-muted-foreground'>
                            p-corr: Bonferroni corrected p-values | Effect size: Hedge's g
                        </p>
                    </CardFooter>
                </Card>
            )}
        </div>
      )}
    </div>
  );
}
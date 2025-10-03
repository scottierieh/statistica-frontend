
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sigma, Loader2, Repeat, CheckCircle, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, Users } from 'lucide-react';
import Image from 'next/image';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface FullAnalysisResponse {
    results: any; // Simplified for now
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const rmAnovaExample = exampleDatasets.find(d => d.id === 'rm-anova');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Repeat size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Repeated Measures ANOVA</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Analyze within-subjects designs, where the same subjects are measured multiple times, and test for differences across conditions or time points.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Repeated Measures ANOVA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is powerful for longitudinal studies, pre-test/post-test designs, or experiments where participants are exposed to multiple conditions. It increases statistical power by controlling for individual differences between subjects, making it easier to detect the true effect of your intervention or the change over time.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {rmAnovaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(rmAnovaExample)}>
                                <rmAnovaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{rmAnovaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{rmAnovaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Data Format:</strong> Your data should be in "wide" format, with each row representing a subject and each repeated measure in a separate column.
                                </li>
                                <li>
                                    <strong>Subject Identifier:</strong> Select the column that uniquely identifies each subject or participant.
                                </li>
                                <li>
                                    <strong>Within-Subjects Factors:</strong> Select two or more numeric columns that represent the repeated measurements (e.g., 'Week 1', 'Week 2', 'Week 3').
                                </li>
                                <li>
                                    <strong>Between-Subjects Factor (Optional):</strong> Select a categorical variable that splits the subjects into groups (e.g., 'Control', 'Treatment').
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Sphericity (Mauchly's Test):</strong> If this test is significant (p &lt; .05), the assumption of sphericity is violated. You should rely on the corrected p-values (e.g., Greenhouse-Geisser).
                                </li>
                                <li><strong>Main Effects & Interactions:</strong> A significant p-value for the within-subjects factor indicates a change over time. A significant interaction effect means the change over time differs between your between-subjects groups.</li>
                                <li><strong>Effect Size (η²p):</strong> Partial eta-squared indicates the proportion of variance explained by a factor.</li>
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

export default function RepeatedMeasuresAnovaPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: { data: DataSet; allHeaders: string[], numericHeaders: string[], categoricalHeaders: string[], onLoadExample: (data: any) => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FullAnalysisResponse | null>(null);
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
    setResult(null);
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
    setResult(null);

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

      setResult(res);
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
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleAnalysis} disabled={isLoading || withinCols.length < 2}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sigma className="mr-2 h-4 w-4" />} Run Analysis
          </Button>
        </CardFooter>
      </Card>

      {isLoading && <Skeleton className="w-full h-96" />}

      {result && (
        <div className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Plot</CardTitle></CardHeader>
                <CardContent>
                    <Image src={result.plot} alt="Interaction Plot" width={800} height={600} className="w-full h-auto rounded-md border" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>ANOVA Summary Table</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>SS</TableHead><TableHead>DF</TableHead><TableHead>MS</TableHead><TableHead>F</TableHead><TableHead>p-unc</TableHead><TableHead>p-GG-corr</TableHead><TableHead>np2</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {(result.results.anova_table || []).map((row: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell>{row.Source}</TableCell>
                                    <TableCell>{row.SS?.toFixed(3)}</TableCell>
                                    <TableCell>{row.ddof1}</TableCell>
                                    <TableCell>{row.MS?.toFixed(3)}</TableCell>
                                    <TableCell>{row.F?.toFixed(3)}</TableCell>
                                    <TableCell>{row['p-unc'] < 0.001 ? '<.001' : row['p-unc']?.toFixed(4)}</TableCell>
                                    <TableCell>{row['p-GG-corr'] < 0.001 ? '<.001' : row['p-GG-corr']?.toFixed(4)}</TableCell>
                                    <TableCell>{row.np2?.toFixed(3)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             {result.results.mauchly_test && (
                 <Card>
                    <CardHeader><CardTitle>Mauchly's Test for Sphericity</CardTitle></CardHeader>
                    <CardContent>
                        <p>Sphericity assumed: {result.results.mauchly_test.sphericity ? 'Yes' : 'No'} (W={result.results.mauchly_test.W?.toFixed(3)}, p={result.results.mauchly_test['p-val']?.toFixed(4)})</p>
                         <p className="text-xs text-muted-foreground mt-1">If p &lt; 0.05, the assumption is violated. Use the Greenhouse-Geisser (p-GG-corr) corrected p-value.</p>
                    </CardContent>
                </Card>
            )}
             {result.results.posthoc_results && (
                 <Card>
                    <CardHeader><CardTitle>Pairwise Post-Hoc Tests (Tukey)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Contrast</TableHead>
                                    <TableHead>A</TableHead>
                                    <TableHead>B</TableHead>
                                    <TableHead className="text-right">T</TableHead>
                                    <TableHead className="text-right">p-tukey</TableHead>
                                    <TableHead className="text-right">hedges</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.results.posthoc_results.map((row: any, i: number) => (
                                     <TableRow key={i}>
                                        <TableCell>{row.Contrast}</TableCell>
                                        <TableCell>{row.A}</TableCell>
                                        <TableCell>{row.B}</TableCell>
                                        <TableCell className="font-mono text-right">{row.T?.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{row['p-tukey'] < 0.001 ? '<.001' : row['p-tukey']?.toFixed(4)}</TableCell>
                                        <TableCell className="font-mono text-right">{row.hedges?.toFixed(3)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

        </div>
      )}
    </div>
  );
};

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { calculateAnova } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getAnovaInterpretation } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma } from 'lucide-react';

interface AnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
}

const AIGeneratedInterpretation = ({ promise }: { promise: Promise<string | null> | null }) => {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promise) {
        setInterpretation(null);
        setLoading(false);
        return;
    }
    let isMounted = true;
    setLoading(true);
    promise.then((desc) => {
        if (isMounted) {
            setInterpretation(desc);
            setLoading(false);
        }
    });
    return () => { isMounted = false; };
  }, [promise]);
  
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!interpretation) return null;

  return <CardDescription className="prose prose-sm dark:prose-invert whitespace-pre-wrap">{interpretation}</CardDescription>;
};

export default function AnovaPage({ data, numericHeaders, categoricalHeaders }: AnovaPageProps) {
    const { toast } = useToast();
    const [groupVar, setGroupVar] = useState(categoricalHeaders[0]);
    const [valueVar, setValueVar] = useState(numericHeaders[0]);
    const [anovaResult, setAnovaResult] = useState<any>(null);
    const [aiPromise, setAiPromise] = useState<Promise<string|null> | null>(null);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length > 0;
    }, [data, numericHeaders, categoricalHeaders]);

    const handleAnalysis = useCallback(() => {
        if (!groupVar || !valueVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select both a group variable and a value variable.'});
            return;
        };
        try {
            const result = calculateAnova(data, groupVar, valueVar);
            if (!result) {
                toast({variant: 'destructive', title: 'ANOVA Calculation Error', description: 'Could not compute ANOVA. Ensure groups have sufficient data.'});
                setAnovaResult(null);
                setAiPromise(null);
                return;
            }
            setAnovaResult(result);

            const promise = getAnovaInterpretation({
                fStat: result.fStat,
                pValue: result.pValue,
                groupVar: groupVar,
                valueVar: valueVar
            }).then(res => {
                if (res.success) {
                    return res.interpretation ?? null;
                }
                toast({variant: 'destructive', title: 'AI Interpretation Error', description: res.error});
                return null;
            });
            setAiPromise(promise);

        } catch(e: any) {
            console.error(e);
            toast({variant: 'destructive', title: 'ANOVA Error', description: e.message || 'Please check the data format.'})
            setAnovaResult(null);
            setAiPromise(null);
        }
    }, [data, groupVar, valueVar, toast]);

    if (!canRun) {
      return (
        <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="font-headline">Analysis of Variance (ANOVA)</CardTitle>
                    <CardDescription>
                        To perform ANOVA, you need to upload data with at least one numeric and one categorical variable.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
      )
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">ANOVA Setup</CardTitle>
                    <CardDescription>
                        Select a group variable (categorical) and a value variable (numeric) to compare means across groups, then click 'Run Analysis'.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Group Variable (Categorical)</label>
                            <Select value={groupVar} onValueChange={setGroupVar} disabled={categoricalHeaders.length === 0}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Value Variable (Numeric)</label>
                            <Select value={valueVar} onValueChange={setValueVar} disabled={numericHeaders.length === 0}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={!groupVar || !valueVar}>
                        <Sigma className="mr-2"/>
                        Run Analysis
                    </Button>
                </CardContent>
            </Card>

            {anovaResult ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">ANOVA Results</CardTitle>
                        <AIGeneratedInterpretation promise={aiPromise}/>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <dt className="text-muted-foreground">F-Statistic</dt>
                                        <dd className="font-mono text-right">{anovaResult.fStat.toFixed(4)}</dd>
                                        <dt className="text-muted-foreground">p-value</dt>
                                        <dd className="font-mono text-right flex justify-end items-center gap-2">
                                            {anovaResult.pValue < 0.0001 ? "< 0.0001" : anovaResult.pValue.toFixed(4)}
                                            {anovaResult.pValue < 0.05 && <Badge variant="destructive">Significant</Badge>}
                                        </dd>
                                    </dl>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">ANOVA Table</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Source</TableHead>
                                                <TableHead className="text-right">DF</TableHead>
                                                <TableHead className="text-right">Sum of Sq.</TableHead>
                                                <TableHead className="text-right">Mean Sq.</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Between Groups</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.dfBetween}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.ssb.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.msb.toFixed(2)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>Within Groups</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.dfWithin}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.ssw.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.msw.toFixed(2)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold mb-2">Group Statistics</h3>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Group ({groupVar})</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Mean</TableHead>
                                        <TableHead className="text-right">Std. Dev.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(anovaResult.groupStats).map(([groupName, stats]: [string, any]) => (
                                        <TableRow key={groupName}>
                                            <TableCell>{groupName}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.stdDev.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                 <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}

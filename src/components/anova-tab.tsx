'use client';
import { useState, useMemo, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { calculateAnova } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getAnovaInterpretation } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface AnovaTabProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
}

const AIGeneratedInterpretation = ({ promise }: { promise: Promise<string | null> }) => {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

export default function AnovaTab({ data, numericHeaders, categoricalHeaders }: AnovaTabProps) {
    const { toast } = useToast();
    const [groupVar, setGroupVar] = useState(categoricalHeaders[0]);
    const [valueVar, setValueVar] = useState(numericHeaders[0]);

    useEffect(() => {
        if (!categoricalHeaders.includes(groupVar)) {
            setGroupVar(categoricalHeaders[0]);
        }
        if (!numericHeaders.includes(valueVar)) {
            setValueVar(numericHeaders[0]);
        }
    }, [categoricalHeaders, numericHeaders, groupVar, valueVar]);
    
    const anovaResult = useMemo(() => {
        if (!groupVar || !valueVar) return null;
        try {
            return calculateAnova(data, groupVar, valueVar);
        } catch(e) {
            console.error(e);
            toast({variant: 'destructive', title: 'ANOVA Error', description: 'Could not calculate ANOVA. Ensure data is formatted correctly.'})
            return null;
        }
    }, [data, groupVar, valueVar, toast]);

    const aiPromise = useMemo(() => {
        if (!anovaResult || !groupVar || !valueVar) return Promise.resolve(null);
        return getAnovaInterpretation({
            fStat: anovaResult.fStat,
            pValue: anovaResult.pValue,
            groupVar: groupVar,
            valueVar: valueVar
        }).then(res => res.success ? res.interpretation ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null))
    }, [anovaResult, groupVar, valueVar, toast]);


    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">One-Way ANOVA</CardTitle>
                <CardDescription>
                    Analyzes the difference between the means of two or more groups.
                </CardDescription>
                <div className="flex gap-4 items-center pt-4">
                    <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Group Variable (Categorical)</label>
                        <Select value={groupVar} onValueChange={setGroupVar}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Value Variable (Numeric)</label>
                        <Select value={valueVar} onValueChange={setValueVar}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {anovaResult ? (
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">ANOVA Results</h3>
                             <AIGeneratedInterpretation promise={aiPromise}/>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <dt className="text-muted-foreground">F-statistic</dt>
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
                                                <TableHead className="text-right">df</TableHead>
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
                                        <TableHead className="text-right">N</TableHead>
                                        <TableHead className="text-right">Mean</TableHead>
                                        <TableHead className="text-right">Std. Dev.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(anovaResult.groupStats).map(([groupName, stats]) => (
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
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>Select a categorical and a numeric variable to perform ANOVA.</p>
                        <p className="text-xs mt-2">There may be an issue if groups have too few members or no variance.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

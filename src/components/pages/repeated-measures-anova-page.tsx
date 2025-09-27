

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Repeat, Users, HelpCircle, MoveRight, Settings, FileSearch, BarChart as BarChartIcon, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AnovaRow {
    Source: string;
    SS: number;
    DF: number;
    MS: number;
    F: number;
    'p-unc': number;
    'p-GG-corr'?: number;
    'p-HF-corr'?: number;
    np2: number;
}
interface PosthocRow {
    Contrast: string;
    A: string;
    B: string;
    'p-bonf': number;
    'p-corr': number;
}
interface SphericityResult {
    spher: boolean;
    W: number;
    'p-val': number;
}
interface RmAnovaResults {
    anova_table: AnovaRow[];
    sphericity?: SphericityResult;
    posthoc?: PosthocRow[];
}

interface FullAnalysisResponse {
    results: RmAnovaResults;
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const rmanovaExample = exampleDatasets.find(d => d.id === 'rm-anova');
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
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Analyze changes in a continuous variable over three or more time points or conditions for the same subjects.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Repeated Measures ANOVA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is powerful for longitudinal studies where you measure the same individuals multiple times. It can determine if there's a significant change over time and, if you have different groups, whether that change depends on the group (a time-by-group interaction).
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {rmanovaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(rmanovaExample)}>
                                <rmanovaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{rmanovaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{rmanovaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Subject Column:</strong> A unique identifier for each participant or subject.</li>
                                <li><strong>Within-Subject Factors:</strong> The columns representing the repeated measurements (e.g., 'time1', 'time2', 'time3').</li>
                                <li><strong>Between-Subjects Factor (Optional):</strong> A categorical variable that divides subjects into groups (e.g., 'Treatment', 'Control').</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Mauchly's Test for Sphericity:</strong> If p &lt; 0.05, the assumption of sphericity is violated. You should use the corrected p-values (Greenhouse-Geisser or Huynh-Feldt).</li>
                                <li><strong>Main & Interaction Effects:</strong> Check the p-values for your within-subject factor, between-subject factor, and their interaction to see if they are significant.</li>
                                <li><strong>Post-Hoc Tests:</strong> If an effect is significant, these tests show which specific time points or groups differ from each other.</li>
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

interface RepeatedMeasuresAnovaPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RepeatedMeasuresAnovaPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: RepeatedMeasuresAnovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [subjectCol, setSubjectCol] = useState<string | undefined>();
    const [withinCols, setWithinCols] = useState<string[]>([]);
    const [betweenCol, setBetweenCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        setSubjectCol(allHeaders.find(h => h.toLowerCase().includes('id') || h.toLowerCase().includes('subject')));
        const timeCols = numericHeaders.filter(h => /time|week|day|month/i.test(h));
        setWithinCols(timeCols.length > 1 ? timeCols : numericHeaders.slice(0,3));
        setBetweenCol(categoricalHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, numericHeaders, categoricalHeaders, canRun]);

    const handleWithinColChange = (header: string, checked: boolean) => {
        setWithinCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!subjectCol || withinCols.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a subject column and at least two within-subject columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        // Convert to long format for pingouin
        const longData = [];
        for (const row of data) {
            for (const col of withinCols) {
                const longRow: any = {
                    subject: row[subjectCol],
                    time: col,
                    measurement: row[col]
                };
                if (betweenCol) {
                    longRow[betweenCol] = row[betweenCol];
                }
                longData.push(longRow);
            }
        }

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: longData, 
                    testType: 'rm_anova',
                    params: {
                        dv: 'measurement',
                        within: 'time',
                        subject: 'subject',
                        between: betweenCol
                    }
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('RM-ANOVA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, subjectCol, withinCols, betweenCol, toast]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Repeated Measures ANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div><Label>Subject Identifier</Label><Select value={subjectCol} onValueChange={setSubjectCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Between-Subjects Factor (Optional)</Label><Select value={betweenCol} onValueChange={(v) => setBetweenCol(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="md:col-span-1"><Label>Within-Subjects Factors (Repeated Measures)</Label><ScrollArea className="h-32 border rounded-md p-2"><div className="space-y-2">{numericHeaders.map(h=><div key={h} className="flex items-center space-x-2"><Checkbox id={`within-${h}`} checked={withinCols.includes(h)} onCheckedChange={c=>handleWithinColChange(h, !!c)}/><Label htmlFor={`within-${h}`}>{h}</Label></div>)}</div></ScrollArea></div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !subjectCol || withinCols.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle>Interaction Plot</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.plot} alt="Interaction Plot" width={800} height={600} className="w-full rounded-md border" /></CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader><CardTitle>ANOVA Table</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead><TableHead className="text-right">F</TableHead><TableHead className="text-right">p-unc</TableHead><TableHead className="text-right">p-GG-corr</TableHead><TableHead className="text-right">η²p</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.Source}</TableCell>
                                            <TableCell className="font-mono text-right">{row.F.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">{row['p-unc'] < 0.001 ? '<.001' : row['p-unc'].toFixed(4)}</TableCell>
                                            <TableCell className="font-mono text-right">{row['p-GG-corr'] ? (row['p-GG-corr'] < 0.001 ? '<.001' : row['p-GG-corr'].toFixed(4)) : '-'}</TableCell>
                                            <TableCell className="font-mono text-right">{row.np2.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     {results.sphericity && (
                        <Card>
                            <CardHeader><CardTitle>Mauchly's Test for Sphericity</CardTitle></CardHeader>
                            <CardContent className="text-sm">
                                <p>Sphericity assumed? <strong>{results.sphericity.spher ? 'Yes' : 'No'}</strong></p>
                                <p className="font-mono">W = {results.sphericity.W.toFixed(4)}, p = {results.sphericity['p-val'].toFixed(4)}</p>
                                {!results.sphericity.spher && <p className="text-orange-600">Sphericity assumption violated. Use Greenhouse-Geisser corrected p-values.</p>}
                            </CardContent>
                        </Card>
                    )}
                    {results.posthoc && (
                        <Card>
                            <CardHeader><CardTitle>Post-Hoc Tests (Bonferroni Corrected)</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Contrast</TableHead><TableHead>A</TableHead><TableHead>B</TableHead><TableHead className="text-right">p-corr</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {results.posthoc.map((row, i) => (
                                            <TableRow key={i} className={row['p-corr'] < 0.05 ? 'bg-primary/10' : ''}>
                                                <TableCell>{row.Contrast}</TableCell>
                                                <TableCell>{row.A}</TableCell>
                                                <TableCell>{row.B}</TableCell>
                                                <TableCell className="font-mono text-right">{row['p-corr'].toFixed(4)} {getSignificanceStars(row['p-corr'])}</TableCell>
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
}

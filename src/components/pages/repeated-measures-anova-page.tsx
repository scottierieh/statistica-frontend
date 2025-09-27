
'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Repeat, 
    BarChart3, 
    Target, 
    TrendingUp,
    CheckCircle,
    Info,
    MoveRight,
    PlayCircle,
    Users,
    Calendar,
    LineChart,
    Zap,
    AlertTriangle,
    CheckSquare,
    Upload,
    FileText,
    Settings,
    FileSearch,
    HelpCircle,
    Loader2,
    Sigma,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import type { DataSet } from '@/lib/stats';


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
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Analyze within-subjects designs, where the same subjects are measured multiple times, and test for differences across conditions or time points.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use RM-ANOVA?</h2>
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
                                <li><strong>Load Data:</strong> Your data should be in "wide" format, with each row representing a subject and each repeated measure in a separate column.</li>
                                <li><strong>Subject Variable:</strong> Select the column that uniquely identifies each subject or participant.</li>
                                <li><strong>Within-Subjects Factors:</strong> Select two or more numeric columns that represent the repeated measurements (e.g., 'Week 1', 'Week 2', 'Week 3').</li>
                                <li><strong>Between-Subjects Factor (Optional):</strong> Select a categorical variable that splits the subjects into groups (e.g., 'Control', 'Treatment').</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Sphericity (Mauchly's Test):</strong> If this test is significant (p &lt; .05), the assumption of sphericity is violated. You should rely on the corrected p-values (Greenhouse-Geisser or Huynh-Feldt).
                                </li>
                                <li><strong>Main Effects & Interactions:</strong> A significant p-value for the within-subjects factor indicates a change over time. A significant interaction effect means the change over time differs between your between-subjects groups.</li>
                                 <li>
                                    <strong>Effect Size (η²p):</strong> Partial eta-squared indicates the proportion of variance explained by a factor.
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


interface RmAnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}


export default function RepeatedMeasuresAnovaPage({ data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample }: RmAnovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [subjectCol, setSubjectCol] = useState<string | undefined>();
    const [withinCols, setWithinCols] = useState<string[]>([]);
    const [betweenCol, setBetweenCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    useEffect(() => {
        const potentialSubject = allHeaders.find(h => h.toLowerCase().includes('id') || h.toLowerCase().includes('subject'));
        setSubjectCol(potentialSubject || allHeaders[0]);
    }, [allHeaders]);

    useEffect(() => {
        const potentialWithin = numericHeaders.filter(h => h !== subjectCol);
        setWithinCols(potentialWithin.slice(0, 3));
    }, [subjectCol, numericHeaders]);
    
    useEffect(() => {
      setAnalysisResult(null);
      setView(canRun ? 'main' : 'intro');
    }, [canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!subjectCol || withinCols.length < 2) {
            toast({
                variant: 'destructive',
                title: 'Selection Error',
                description: 'Please select a subject column and at least two within-subject (repeated measures) columns.'
            });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/repeated-measures-anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    subjectCol,
                    withinCols,
                    betweenCol: betweenCol === 'none' ? undefined : betweenCol
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, subjectCol, withinCols, betweenCol, toast]);

    const handleWithinChange = (header: string, checked: boolean) => {
        setWithinCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (!canRun) {
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
                        <div>
                            <Label>Subject ID Column</Label>
                            <Select value={subjectCol} onValueChange={setSubjectCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Between-Subjects Factor (Optional)</Label>
                            <Select value={betweenCol} onValueChange={(v) => setBetweenCol(v === 'none' ? undefined : v)}>
                                <SelectTrigger><SelectValue placeholder="None"/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {categoricalHeaders.filter(h => h !== subjectCol).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-3">
                            <Label>Within-Subjects Factors (Repeated Measures)</Label>
                            <ScrollArea className="h-32 border rounded-md p-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {numericHeaders.filter(h => h !== subjectCol).map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`within-${h}`} checked={withinCols.includes(h)} onCheckedChange={(c) => handleWithinChange(h, c as boolean)}/>
                                        <Label htmlFor={`within-${h}`}>{h}</Label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !subjectCol || withinCols.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle>Interaction Plot</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="RM-ANOVA Plot" width={800} height={600} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

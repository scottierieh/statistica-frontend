
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, AlertTriangle, CheckCircle2, HelpCircle, MoveRight, Settings, FileSearch, BarChart as BarChartIcon, Users, Handshake, TestTube } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type TestType = 'mann_whitney' | 'wilcoxon' | 'kruskal_wallis' | 'friedman' | 'mcnemar';

const IntroPage = ({ testType, onStart, onLoadExample }: { testType: TestType, onStart: () => void, onLoadExample: (e: any) => void }) => {
    const intros = {
        mann_whitney: {
            icon: Users,
            title: "Mann-Whitney U Test",
            description: "Compare two independent groups when the assumption of normality is not met. It's the non-parametric equivalent of the independent samples t-test.",
            why: "Use the Mann-Whitney U test when you want to compare the medians of two independent groups. For example, comparing customer satisfaction ratings (on a scale of 1-10) between two different store locations, where the data isn't normally distributed.",
            setup: [
                { title: 'Group Variable', text: 'Select a categorical variable with exactly two groups (e.g., "Group A" vs. "Group B").' },
                { title: 'Value Variable', text: 'Choose the numeric or ordinal variable you want to compare between the groups.' },
                { title: 'Run Analysis', text: 'The tool will compare the ranks of the data to determine if one group tends to have higher values than the other.' },
            ],
            interpretation: [
                { title: 'U-statistic', text: 'The main test statistic. A smaller value indicates a larger difference between the groups.' },
                { title: 'p-value', text: 'If less than 0.05, it indicates a statistically significant difference between the two groups.' },
                { title: 'Mean Ranks', text: 'Compare which group has a higher average rank, indicating which group tends to have higher values overall.' },
            ],
            exampleId: 'nonparametric-suite'
        },
        // ... other intros can be added here
    };

    const content = intros[testType];
    if (!content) return null;

    const example = exampleDatasets.find(d => d.id === content.exampleId);

    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <content.icon size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">{content.title}</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        {content.description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use This Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           {content.why}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                {content.setup.map(item => <li key={item.title}><strong>{item.title}:</strong> {item.text}</li>)}
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                {content.interpretation.map(item => <li key={item.title}><strong>{item.title}:</strong> {item.text}</li>)}
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">Load Example Data</h3>
                        <div className="flex justify-center">
                           {example && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(example)}>
                                    <example.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{example.name}</h4>
                                        <p className="text-xs text-muted-foreground">{example.description}</p>
                                    </div>
                                </Card>
                            )}
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


interface NonParametricPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string;
}

export default function NonParametricPage({ data, numericHeaders, categoricalHeaders, onLoadExample, activeAnalysis }: NonParametricPageProps) {
    const { toast } = useToast();
    
    const activeTest: TestType = useMemo(() => {
        if (activeAnalysis.includes('mann-whitney')) return 'mann_whitney';
        if (activeAnalysis.includes('wilcoxon')) return 'wilcoxon';
        if (activeAnalysis.includes('kruskal-wallis')) return 'kruskal_wallis';
        if (activeAnalysis.includes('friedman')) return 'friedman';
        if (activeAnalysis.includes('mcnemar')) return 'mcnemar';
        return 'mann_whitney';
    }, [activeAnalysis]);
    
    // States for each test
    const [mwGroupCol, setMwGroupCol] = useState(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size === 2) || categoricalHeaders[0]);
    const [mwValueCol, setMwValueCol] = useState(numericHeaders[0]);
    
    const [wxVar1, setWxVar1] = useState(numericHeaders[0]);
    const [wxVar2, setWxVar2] = useState(numericHeaders[1]);
    
    const [kwGroupCol, setKwGroupCol] = useState(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size >= 3) || categoricalHeaders[0]);
    const [kwValueCol, setKwValueCol] = useState(numericHeaders[0]);
    
    const [friedmanVars, setFriedmanVars] = useState<string[]>(numericHeaders.slice(0, 3));
    
    const [mcNemarVar1, setMcNemarVar1] = useState<string | undefined>();
    const [mcNemarVar2, setMcNemarVar2] = useState<string | undefined>();

    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('intro');

    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    useEffect(() => {
        setMwGroupCol(binaryCategoricalHeaders[0]);
        setMwValueCol(numericHeaders[0]);
        setWxVar1(numericHeaders[0]);
        setWxVar2(numericHeaders[1]);
        setKwGroupCol(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size >= 3) || categoricalHeaders[0]);
        setKwValueCol(numericHeaders[0]);
        setFriedmanVars(numericHeaders.slice(0,3));
        setMcNemarVar1(binaryCategoricalHeaders.find(h => h.includes('pre')) || binaryCategoricalHeaders[0]);
        setMcNemarVar2(binaryCategoricalHeaders.find(h => h.includes('post')) || binaryCategoricalHeaders[1]);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [numericHeaders, categoricalHeaders, data, binaryCategoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        let params: any = {};
        let testType: TestType = activeTest;

        switch(activeTest) {
            case 'mann_whitney':
                if (!mwGroupCol || !mwValueCol) { toast({ variant: "destructive", title: "Please select group and value columns." }); return; }
                const groups = Array.from(new Set(data.map(d => d[mwGroupCol]))).filter(g => g != null);
                if (groups.length !== 2) { toast({ variant: "destructive", title: `Mann-Whitney U test requires exactly 2 groups, but found ${groups.length} in '${mwGroupCol}'.` }); return; }
                params = { group_col: mwGroupCol, value_col: mwValueCol, groups };
                testType = 'mann_whitney';
                break;
            case 'wilcoxon':
                if (!wxVar1 || !wxVar2 || wxVar1 === wxVar2) { toast({ variant: "destructive", title: "Please select two different variables for Wilcoxon test." }); return; }
                params = { var1: wxVar1, var2: wxVar2 };
                testType = 'wilcoxon';
                break;
            case 'kruskal_wallis':
                 if (!kwGroupCol || !kwValueCol) { toast({ variant: "destructive", title: "Please select group and value columns." }); return; }
                const kwGroups = Array.from(new Set(data.map(d => d[kwGroupCol]))).filter(g => g != null);
                if (kwGroups.length < 3) { toast({ variant: "destructive", title: `Kruskal-Wallis requires at least 3 groups, but found ${kwGroups.length} in '${kwGroupCol}'.` }); return; }
                params = { group_col: kwGroupCol, value_col: kwValueCol };
                testType = 'kruskal_wallis';
                break;
            case 'friedman':
                if (friedmanVars.length < 3) { toast({ variant: "destructive", title: "Please select at least 3 variables for Friedman test." }); return; }
                params = { variables: friedmanVars };
                testType = 'friedman';
                break;
            case 'mcnemar':
                if (!mcNemarVar1 || !mcNemarVar2 || mcNemarVar1 === mcNemarVar2) { toast({ variant: "destructive", title: "Please select two different binary categorical variables for McNemar's test." }); return; }
                params = { var1: mcNemarVar1, var2: mcNemarVar2 };
                testType = 'mcnemar';
                break;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType, params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            setView('main');

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [activeTest, data, mwGroupCol, mwValueCol, wxVar1, wxVar2, kwGroupCol, kwValueCol, friedmanVars, mcNemarVar1, mcNemarVar2, toast]);
    
    const renderMcNemarResult = () => {
        if (!analysisResult || activeTest !== 'mcnemar') return null;
        const { results } = analysisResult;
        const { contingency_table } = results;
        const labels = Object.keys(contingency_table);

        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{mcNemarVar1} \ {mcNemarVar2}</TableHead>
                        {labels.map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {labels.map(rowLabel => (
                        <TableRow key={rowLabel}>
                            <TableHead>{rowLabel}</TableHead>
                            {labels.map(colLabel => (
                                <TableCell key={colLabel} className="text-right font-mono">{contingency_table[colLabel]?.[rowLabel] || 0}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    const renderResult = () => {
        if (!analysisResult) return null;
        const { results, plot } = analysisResult;
        const isSignificant = results.is_significant;
        
        const formattedInterpretation = results.interpretation
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>');


        return (
            <div className="space-y-4">
                 {plot && (
                    <Card>
                        <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={plot} alt={`${results.test_type} plot`} width={800} height={400} className="rounded-md border mx-auto" />
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">{results.test_type} Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant={isSignificant ? 'default' : 'secondary'}>
                            {isSignificant ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                            <AlertTitle>{isSignificant ? "Statistically Significant Result" : "Result Not Statistically Significant"}</AlertTitle>
                            <AlertDescription dangerouslySetInnerHTML={{ __html: formattedInterpretation }} />
                        </Alert>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Statistics</CardTitle></CardHeader>
                    <CardContent>
                        {activeTest === 'mcnemar' ? renderMcNemarResult() : activeTest === 'mann_whitney' ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Statistic</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Mann-Whitney U</TableCell><TableCell className="font-mono text-right">{results.U?.toFixed(3)}</TableCell></TableRow>
                                    <TableRow><TableCell>Z-score</TableCell><TableCell className="font-mono text-right">{results.z_score?.toFixed(4)}</TableCell></TableRow>
                                    <TableRow><TableCell>P-value</TableCell><TableCell className="font-mono text-right">{results.p_value?.toFixed(4)}</TableCell></TableRow>
                                    <TableRow><TableCell>Effect Size (r)</TableCell><TableCell className="font-mono text-right">{results.effect_size?.toFixed(3)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                <dt>Statistic</dt><dd className="font-mono text-right">{results.statistic.toFixed(3)}</dd>
                                <dt>P-value</dt><dd className="font-mono text-right">{results.p_value.toFixed(4)}</dd>
                                {results.df && <><dt>Degrees of Freedom</dt><dd className="font-mono text-right">{results.df}</dd></>}
                                {results.effect_size && <><dt>Effect Size</dt><dd className="font-mono text-right">{results.effect_size.toFixed(3)}</dd></>}
                            </dl>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    };
    
    if (view === 'intro') {
        return <IntroPage testType={activeTest} onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (!canRun) {
        return <IntroPage testType={activeTest} onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const renderSetupUI = () => {
      switch(activeTest) {
        case 'mann_whitney':
          return (
             <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Group Variable</Label>
                        <Select value={mwGroupCol} onValueChange={setMwGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Value Variable</Label>
                        <Select value={mwValueCol} onValueChange={setMwValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </div>
            </div>
          );
        case 'wilcoxon':
          return (
             <div className="space-y-4">
                 <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Variable 1 (e.g., Pre-test)</Label><Select value={wxVar1} onValueChange={setWxVar1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Variable 2 (e.g., Post-test)</Label><Select value={wxVar2} onValueChange={setWxVar2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=> h!==wxVar1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </div>
          );
        case 'kruskal_wallis':
            const multiGroupCategoricalHeaders = categoricalHeaders.filter(h => new Set(data.map(d => d[h])).size >= 3);
            if (multiGroupCategoricalHeaders.length === 0) return <p className="text-destructive">This test requires a categorical variable with at least 3 groups. None found.</p>;
          return (
             <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Group Variable</Label><Select value={kwGroupCol} onValueChange={setKwGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{multiGroupCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Value Variable</Label><Select value={kwValueCol} onValueChange={setKwValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </div>
          );
        case 'friedman':
          return (
             <div className="space-y-4">
                <div><Label>Select 3+ Variables</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-16">
                        {numericHeaders.map(h=><Badge key={h} variant={friedmanVars.includes(h) ? "default" : "secondary"} onClick={() => setFriedmanVars(p=>p.includes(h)?p.filter(v=>v!==h):[...p,h])} className="cursor-pointer">{h}</Badge>)}
                    </div>
                 </div>
            </div>
          );
        case 'mcnemar':
            if (binaryCategoricalHeaders.length < 2) return <p className="text-destructive">This test requires at least two binary categorical variables. Only {binaryCategoricalHeaders.length} found.</p>;
          return (
             <div className="space-y-4">
                 <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Variable 1 (e.g., Before)</Label><Select value={mcNemarVar1} onValueChange={setMcNemarVar1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Variable 2 (e.g., After)</Label><Select value={mcNemarVar2} onValueChange={setMcNemarVar2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{binaryCategoricalHeaders.filter(h => h !== mcNemarVar1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </div>
          );
        default: return null;
      }
    }
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">{activeTest.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Test</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderSetupUI()}
                </CardContent>
                <CardFooter className="flex justify-end mt-4">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            {!isLoading && analysisResult && renderResult()}
            {!isLoading && !analysisResult && <div className="text-center text-muted-foreground py-10"><FlaskConical className="mx-auto h-12 w-12"/><p className="mt-2">Select variables, then click 'Run Analysis'.</p></div>}
        </div>
    );
}

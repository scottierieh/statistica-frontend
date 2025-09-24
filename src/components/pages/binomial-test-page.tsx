
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sigma, AlertTriangle, CheckCircle2, HelpCircle, MoveRight, Settings, FileSearch, TestTube, BarChart } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';

interface BinomialTestResult {
    statistic: number;
    p_value: number;
    observed_proportion: number;
    expected_proportion: number;
    is_significant: boolean;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: BinomialTestResult;
    plot: string;
}

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <TestTube size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Binomial Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Determine if the proportion of successes in a series of independent Bernoulli trials is consistent with a hypothesized probability.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use a Binomial Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            The Binomial Test is used for analyzing experiments with a binary outcome (e.g., success/failure, heads/tails, yes/no). It compares the observed number of successes to the number expected under a specific probability, calculating the exact likelihood of observing a result as extreme or more extreme if the hypothesized probability were true.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Number of Trials (n):</strong> Enter the total number of independent trials conducted.</li>
                                <li><strong>Number of Successes (k):</strong> Enter the count of "successful" outcomes observed.</li>
                                <li><strong>Expected Probability (p):</strong> Set the hypothesized probability of success on a single trial (e.g., 0.5 for a fair coin).</li>
                                <li><strong>Run Test:</strong> The tool will calculate the exact binomial probability and provide a conclusion.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>p-value:</strong> If this value is less than 0.05, you can conclude that the observed proportion of successes is statistically different from the expected probability.
                                </li>
                                <li>
                                    <strong>Observed vs. Expected Proportion:</strong> Compare the actual proportion of successes in your data to the hypothesized probability to understand the direction of the difference.
                                </li>
                                <li>
                                    <strong>Binomial Distribution Plot:</strong> The plot visualizes the probability of every possible number of successes under the null hypothesis. The red line marks your observed outcome, helping you see how likely or unlikely it was.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function BinomialTestPage() {
    const { toast } = useToast();
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [successes, setSuccesses] = useState<number>(0);
    const [trials, setTrials] = useState<number>(0);
    const [probability, setProbability] = useState<number>(0.5);
    const [alternative, setAlternative] = useState('two-sided');
    
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        if (trials <= 0 || successes > trials) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Number of trials must be positive and successes cannot exceed trials.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/binomial-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ successes, trials, p: probability, alternative }),
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || "Failed to run analysis");
            }
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [successes, trials, probability, alternative, toast]);
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Binomial Test</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Test if the proportion of successes in a set of trials is consistent with a hypothesized probability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="successes">Number of Successes (k)</Label>
                            <Input id="successes" type="number" value={successes} onChange={e => setSuccesses(Number(e.target.value))} min="0" />
                        </div>
                        <div>
                            <Label htmlFor="trials">Number of Trials (n)</Label>
                            <Input id="trials" type="number" value={trials} onChange={e => setTrials(Number(e.target.value))} min="1" />
                        </div>
                        <div>
                            <Label htmlFor="probability">Expected Probability (p)</Label>
                            <Input id="probability" type="number" value={probability} onChange={e => setProbability(Number(e.target.value))} min="0" max="1" step="0.01" />
                        </div>
                    </div>
                     <div>
                        <Label>Alternative Hypothesis</Label>
                        <Select value={alternative} onValueChange={setAlternative}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="two-sided">Two-sided (p ≠ {probability})</SelectItem>
                                <SelectItem value="greater">Greater (p &gt; {probability})</SelectItem>
                                <SelectItem value="less">Less (p &lt; {probability})</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Running...</> : <><Sigma className="mr-2" />Run Test</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                         <CardHeader>
                            <CardTitle className="font-headline">Analysis Results</CardTitle>
                        </CardHeader>
                         <CardContent>
                             <Alert variant={results.is_significant ? 'default' : 'secondary'}>
                                {results.is_significant ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                <AlertTitle>{results.is_significant ? 'Statistically Significant' : 'Not Statistically Significant'}</AlertTitle>
                                <AlertDescription>
                                    <p className="whitespace-pre-wrap">{results.interpretation}</p>
                                </AlertDescription>
                            </Alert>
                         </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                         <Card>
                            <CardHeader><CardTitle>Binomial Distribution</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="Binomial Distribution Plot" width={800} height={500} className="rounded-md border" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Test Statistics</CardTitle></CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <dt>p-value</dt><dd className="font-mono text-right">{results.p_value.toFixed(4)}</dd>
                                    <dt>Observed Proportion</dt><dd className="font-mono text-right">{results.observed_proportion.toFixed(4)}</dd>
                                    <dt>Expected Proportion</dt><dd className="font-mono text-right">{results.expected_proportion.toFixed(4)}</dd>
                                    <dt>Successes</dt><dd className="font-mono text-right">{successes}</dd>
                                    <dt>Trials</dt><dd className="font-mono text-right">{trials}</dd>
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

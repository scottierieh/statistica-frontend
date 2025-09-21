
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sigma, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

export default function BinomialTestPage() {
    const { toast } = useToast();
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
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Binomial Test</CardTitle>
                    <CardDescription>Test if the proportion of successes in a set of trials is consistent with a hypothesized probability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Number of Successes (k)</Label>
                            <Input type="number" value={successes} onChange={e => setSuccesses(Number(e.target.value))} min="0" />
                        </div>
                        <div>
                            <Label>Number of Trials (n)</Label>
                            <Input type="number" value={trials} onChange={e => setTrials(Number(e.target.value))} min="1" />
                        </div>
                        <div>
                            <Label>Expected Probability (p)</Label>
                            <Input type="number" value={probability} onChange={e => setProbability(Number(e.target.value))} min="0" max="1" step="0.01" />
                        </div>
                    </div>
                     <div>
                        <Label>Alternative Hypothesis</Label>
                        <Select value={alternative} onValueChange={setAlternative}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="two-sided">Two-sided (p ≠ {probability})</SelectItem>
                                <SelectItem value="greater">Greater (p > {probability})</SelectItem>
                                <SelectItem value="less">Less (p < {probability})</SelectItem>
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

            {results && (
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
                                {analysisResult.plot && <Image src={analysisResult.plot} alt="Binomial Distribution Plot" width={800} height={500} className="rounded-md border" />}
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


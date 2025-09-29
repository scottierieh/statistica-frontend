
'use client';
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Label } from '../ui/label';

interface AnalysisResponse {
    plot: string;
}

export default function DiscriminantComparisonPage() {
    const { toast } = useToast();
    const [dataset, setDataset] = useState('isotropic');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/discriminant-comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataset }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to run analysis');
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Success', description: 'Discriminant analysis comparison is complete.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [dataset, toast]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">LDA vs QDA Comparison</CardTitle>
                    <CardDescription>Compare Linear and Quadratic Discriminant Analysis on different synthetic datasets to understand their behavior.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <Label>Dataset Type</Label>
                            <Select value={dataset} onValueChange={setDataset}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="isotropic">Isotropic Covariance</SelectItem>
                                    <SelectItem value="shared">Shared Covariance</SelectItem>
                                    <SelectItem value="different">Different Covariances</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Running...</> : <><Play className="mr-2" />Run Comparison</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full" /></CardContent></Card>}

            {analysisResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>LDA vs QDA Decision Boundaries</CardTitle>
                        <CardDescription>
                            This chart shows the decision boundaries learned by each classifier on three datasets with different covariance structures.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center overflow-x-auto">
                        <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="Discriminant Analysis Comparison Plot" width={800} height={1200} className="rounded-md border" />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

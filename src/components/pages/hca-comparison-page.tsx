
'use client';
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';

interface AnalysisResponse {
    plot: string;
}

export default function HcaComparisonPage() {
    const { toast } = useToast();
    const [dataset, setDataset] = useState('noisy_circles');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/hca-comparison', {
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
            toast({ title: 'Success', description: 'Hierarchical clustering comparison is complete.' });

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
                    <CardTitle className="font-headline">Hierarchical Clustering Algorithm Comparison</CardTitle>
                    <CardDescription>Compare different linkage methods for hierarchical clustering on various synthetic datasets.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <Select value={dataset} onValueChange={setDataset}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="noisy_circles">Noisy Circles</SelectItem>
                                <SelectItem value="noisy_moons">Noisy Moons</SelectItem>
                                <SelectItem value="blobs">Blobs</SelectItem>
                                <SelectItem value="aniso">Anisotropic Blobs</SelectItem>
                                <SelectItem value="varied">Varied Variance Blobs</SelectItem>
                                <SelectItem value="no_structure">No Structure</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Running...</> : <><Play className="mr-2" />Run Comparison</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[200px] w-full" /></CardContent></Card>}

            {analysisResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Clustering Algorithm Comparison</CardTitle>
                        <CardDescription>
                            This chart shows how different linkage criteria perform on the selected dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center overflow-x-auto">
                        <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="Hierarchical Clustering Comparison Plot" width={1400} height={400} className="rounded-md border" />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

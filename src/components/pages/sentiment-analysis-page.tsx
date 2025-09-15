'use client';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Smile } from 'lucide-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

interface SentimentResult {
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    score: number;
}

interface AnalysisResponse {
    results: SentimentResult[];
    plot: string;
}

const getSentimentBadge = (sentiment: SentimentResult['sentiment']) => {
    switch (sentiment) {
        case 'positive': return <Badge className="bg-green-500 hover:bg-green-600">Positive</Badge>;
        case 'negative': return <Badge variant="destructive">Negative</Badge>;
        case 'neutral': return <Badge variant="secondary">Neutral</Badge>;
    }
}

export default function SentimentAnalysisPage() {
    const { toast } = useToast();
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        const texts = text.split('\n').map(t => t.trim()).filter(Boolean);
        if (texts.length === 0) {
            toast({ variant: 'destructive', title: 'Input Error', description: 'Please enter some text to analyze.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/sentiment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Success', description: 'Sentiment analysis completed.' });

        } catch (e: any) {
            console.error('Sentiment analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [text, toast]);
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Smile /> Sentiment Analysis</CardTitle>
                    <CardDescription>Enter text (one item per line) to analyze its sentiment (positive, negative, or neutral).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        id="text-input"
                        placeholder="e.g., This product is amazing!&#10;I am very disappointed with the service."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={10}
                    />
                </CardContent>
                <CardFooter>
                     <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Analyze Sentiment</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}

            {analysisResult && (
                 <div className="grid lg:grid-cols-2 gap-4">
                     <Card>
                        <CardHeader><CardTitle>Sentiment Distribution</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Sentiment Distribution" width={800} height={500} className="rounded-md border"/>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Detailed Results</CardTitle></CardHeader>
                        <CardContent>
                             <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Text</TableHead>
                                            <TableHead>Sentiment</TableHead>
                                            <TableHead className="text-right">Confidence</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisResult.results.map((res, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="max-w-xs truncate">{res.text}</TableCell>
                                                <TableCell>{getSentimentBadge(res.sentiment)}</TableCell>
                                                <TableCell className="text-right font-mono">{(res.confidence * 100).toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </ScrollArea>
                        </CardContent>
                    </Card>
                 </div>
            )}
        </div>
    );
}

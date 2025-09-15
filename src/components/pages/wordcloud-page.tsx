'use client';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Feather } from 'lucide-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';

interface WordCloudResponse {
    plot: string;
    frequencies: { [key: string]: number };
}

export default function WordCloudPage() {
    const { toast } = useToast();
    const [text, setText] = useState('');
    const [customStopwords, setCustomStopwords] = useState('');
    const [minWordLength, setMinWordLength] = useState(3);
    const [maxWords, setMaxWords] = useState(100);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<WordCloudResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        if (!text.trim()) {
            toast({ variant: 'destructive', title: 'Input Error', description: 'Please enter some text to analyze.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/wordcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, customStopwords, minWordLength, maxWords })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result: WordCloudResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Success', description: 'Word cloud generated successfully.' });

        } catch (e: any) {
            console.error('Word cloud error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [text, customStopwords, minWordLength, maxWords, toast]);
    
    const frequencyData = analysisResult ? Object.entries(analysisResult.frequencies).map(([word, count]) => ({ word, count })) : [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Feather /> Word Cloud Generator</CardTitle>
                    <CardDescription>Enter text to generate a word cloud and see word frequencies.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="text-input">Text Input</Label>
                        <Textarea
                            id="text-input"
                            placeholder="Paste your text here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={10}
                        />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                         <div>
                            <Label htmlFor="stopwords-input">Custom Stopwords</Label>
                            <Input
                                id="stopwords-input"
                                placeholder="e.g., project, team, data"
                                value={customStopwords}
                                onChange={(e) => setCustomStopwords(e.target.value)}
                            />
                             <p className="text-xs text-muted-foreground mt-1">Comma-separated words to exclude.</p>
                        </div>
                        <div>
                            <Label htmlFor="min-length-input">Min. Word Length</Label>
                            <Input
                                id="min-length-input"
                                type="number"
                                value={minWordLength}
                                onChange={(e) => setMinWordLength(Number(e.target.value))}
                                min="1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="max-words-input">Max Words</Label>
                            <Input
                                id="max-words-input"
                                type="number"
                                value={maxWords}
                                onChange={(e) => setMaxWords(Number(e.target.value))}
                                min="10"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Generating...</> : <><Sigma className="mr-2"/>Generate Word Cloud</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}

            {analysisResult && (
                 <div className="grid lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generated Word Cloud</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Generated Word Cloud" width={800} height={400} className="rounded-md border"/>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Top Word Frequencies</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Word</TableHead>
                                            <TableHead className="text-right">Frequency</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {frequencyData.map(({ word, count }) => (
                                            <TableRow key={word}>
                                                <TableCell>{word}</TableCell>
                                                <TableCell className="text-right font-mono">{count}</TableCell>
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

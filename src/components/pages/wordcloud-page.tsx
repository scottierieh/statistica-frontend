
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface WordCloudResponse {
    plots: {
        wordcloud: string;
        frequency_bar: string;
    };
    frequencies: { [key: string]: number };
    statistics: {
        total_words: number;
        unique_words: number;
        processed_words_count: number;
        unique_processed_words: number;
        average_word_length: number;
    };
}

const colorSchemes = [
    'viridis', 'plasma', 'inferno', 'magma', 'cividis', 'spring', 'summer', 'autumn', 'winter', 'cool', 'hot', 'gist_heat', 'copper'
];

export default function WordCloudPage() {
    const { toast } = useToast();
    const [text, setText] = useState('');
    const [customStopwords, setCustomStopwords] = useState('');
    const [minWordLength, setMinWordLength] = useState(2);
    const [maxWords, setMaxWords] = useState(100);
    const [colormap, setColormap] = useState('viridis');
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
                body: JSON.stringify({ text, customStopwords, minWordLength, maxWords, colormap })
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

    }, [text, customStopwords, minWordLength, maxWords, colormap, toast]);
    
    const frequencyData = analysisResult ? Object.entries(analysisResult.frequencies).map(([word, count]) => ({ word, count })) : [];
    const stats = analysisResult?.statistics;

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
                            placeholder="e.g., This product is amazing!&#10;I am very disappointed with the service."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={10}
                        />
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div>
                            <Label htmlFor="colormap-select">Color Scheme</Label>
                             <Select value={colormap} onValueChange={setColormap}>
                                <SelectTrigger id="colormap-select">
                                    <SelectValue placeholder="Select color scheme" />
                                </SelectTrigger>
                                <SelectContent>
                                    {colorSchemes.map(scheme => (
                                        <SelectItem key={scheme} value={scheme}>
                                            {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                 <Tabs defaultValue="visuals" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="visuals">Visualizations</TabsTrigger>
                        <TabsTrigger value="data">Statistics</TabsTrigger>
                    </TabsList>
                    <TabsContent value="visuals" className="mt-4">
                         <div className="grid lg:grid-cols-2 gap-4">
                             <Card>
                                <CardHeader><CardTitle>Generated Word Cloud</CardTitle></CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plots.wordcloud} alt="Generated Word Cloud" width={800} height={400} className="rounded-md border"/>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Top 20 Word Frequencies</CardTitle></CardHeader>
                                <CardContent>
                                     <Image src={`data:image/png;base64,${analysisResult.plots.frequency_bar}`} alt="Word Frequency Bar Chart" width={1000} height={800} className="rounded-md border"/>
                                </CardContent>
                            </Card>
                         </div>
                    </TabsContent>
                    <TabsContent value="data" className="mt-4">
                        <div className="grid lg:grid-cols-2 gap-4">
                             <Card>
                                <CardHeader><CardTitle>Text Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    {stats && (
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <dt>Total Words</dt><dd className="font-mono text-right">{stats.total_words}</dd>
                                            <dt>Unique Words</dt><dd className="font-mono text-right">{stats.unique_words}</dd>
                                            <dt>Processed Words</dt><dd className="font-mono text-right">{stats.processed_words_count}</dd>
                                            <dt>Unique Processed</dt><dd className="font-mono text-right">{stats.unique_processed_words}</dd>
                                            <dt>Avg. Word Length</dt><dd className="font-mono text-right">{stats.average_word_length.toFixed(2)}</dd>
                                        </dl>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Word Frequency</CardTitle></CardHeader>
                                <CardContent>
                                     <ScrollArea className="h-80">
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
                    </TabsContent>
                 </Tabs>
            )}
        </div>
    );
}

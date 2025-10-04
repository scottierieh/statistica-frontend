
'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Feather, BarChart, Settings } from 'lucide-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-96" />,
});

interface AnalysisResponse {
    plots: {
        wordcloud: string; // This will be a JSON string for Plotly
        frequency_bar: string; // This is a base64 image string
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

export default function WordCloudPage() {
    const { toast } = useToast();
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    // Advanced settings
    const [customStopwords, setCustomStopwords] = useState('');
    const [minWordLength, setMinWordLength] = useState(2);
    const [maxWords, setMaxWords] = useState(100);
    const [colormap, setColormap] = useState('viridis');


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
                body: JSON.stringify({
                    text,
                    customStopwords,
                    minWordLength,
                    maxWords,
                    colormap
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Success', description: 'Word cloud and frequency analysis completed.' });

        } catch (e: any) {
            console.error('Word cloud analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [text, customStopwords, minWordLength, maxWords, colormap, toast]);

    const plotData = useMemo(() => {
        if (!analysisResult?.plots.wordcloud) return null;
        try {
            return JSON.parse(analysisResult.plots.wordcloud);
        } catch (e) {
            console.error("Failed to parse wordcloud plot data", e);
            return null;
        }
    }, [analysisResult]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Feather /> Word Cloud Generator</CardTitle>
                    <CardDescription>Enter text to generate a word cloud and see word frequency analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        id="text-input"
                        placeholder="Paste your text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={10}
                    />
                </CardContent>
                 <CardFooter className="flex justify-between items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline"><Settings className="mr-2"/>Advanced Settings</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Settings</h4>
                                    <p className="text-sm text-muted-foreground">Fine-tune the word cloud generation.</p>
                                </div>
                                <div className="grid gap-2">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="stopwords">Stopwords</Label>
                                        <Input id="stopwords" value={customStopwords} onChange={e => setCustomStopwords(e.target.value)} className="col-span-2 h-8" placeholder="e.g., word1,word2"/>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="min-length">Min Length</Label>
                                        <Input id="min-length" type="number" value={minWordLength} onChange={e => setMinWordLength(Number(e.target.value))} className="col-span-2 h-8" />
                                    </div>
                                     <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="max-words">Max Words</Label>
                                        <Input id="max-words" type="number" value={maxWords} onChange={e => setMaxWords(Number(e.target.value))} className="col-span-2 h-8" />
                                    </div>
                                     <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="colormap">Colormap</Label>
                                        <Select value={colormap} onValueChange={setColormap}>
                                            <SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="viridis">Viridis</SelectItem>
                                                <SelectItem value="plasma">Plasma</SelectItem>
                                                <SelectItem value="inferno">Inferno</SelectItem>
                                                <SelectItem value="magma">Magma</SelectItem>
                                                <SelectItem value="cividis">Cividis</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Generate</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}
            
            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Word Cloud</CardTitle></CardHeader>
                        <CardContent>
                           {plotData ? (
                                <Plot
                                    data={plotData.data}
                                    layout={plotData.layout}
                                    useResizeHandler={true}
                                    className="w-full h-[400px]"
                                />
                            ) : (
                                <p>Could not render word cloud.</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart/> Top 20 Word Frequency</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={`data:image/png;base64,${analysisResult.plots.frequency_bar}`} alt="Word Frequency Bar Chart" width={600} height={400} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Text Statistics</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableBody>
                                        <TableRow><TableCell>Total Words</TableCell><TableCell className="text-right font-mono">{analysisResult.statistics.total_words}</TableCell></TableRow>
                                        <TableRow><TableCell>Unique Words</TableCell><TableCell className="text-right font-mono">{analysisResult.statistics.unique_words}</TableCell></TableRow>
                                        <TableRow><TableCell>Words after Processing</TableCell><TableCell className="text-right font-mono">{analysisResult.statistics.processed_words_count}</TableCell></TableRow>
                                        <TableRow><TableCell>Unique Processed Words</TableCell><TableCell className="text-right font-mono">{analysisResult.statistics.unique_processed_words}</TableCell></TableRow>
                                        <TableRow><TableCell>Average Word Length</TableCell><TableCell className="text-right font-mono">{analysisResult.statistics.average_word_length.toFixed(2)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

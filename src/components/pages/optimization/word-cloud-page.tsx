'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Palette } from 'lucide-react';
import Plot from 'react-plotly.js';

interface WordCloudResult {
    plots: { wordcloud: string, frequency_bar: string };
    frequencies: Record<string, number>;
    statistics: Record<string, number>;
}

export default function WordCloudPage() {
    const { toast } = useToast();
    const [text, setText] = useState('The food was absolutely wonderful, from preparation to presentation. The service was a bit slow, but the delicious food made up for it. A very disappointing experience. The pasta was overcooked and the sauce was bland. I had a great time with my friends. The ambiance is cozy and the staff is friendly. Amazing cocktails! The bartender really knows his craft. Food was okay.');
    const [stopwords, setStopwords] = useState('a, an, the, but, is');
    const [maxWords, setMaxWords] = useState(100);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<WordCloudResult | null>(null);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            if (!text.trim()) throw new Error("Please enter some text to analyze.");

            const response = await fetch('/api/analysis/wordcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, customStopwords: stopwords, maxWords }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to generate word cloud.');
            }
            const res = await response.json();
            setResult(res);
            toast({ title: "Success", description: "Word cloud generated." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette /> Word Cloud</CardTitle>
                <CardDescription>Visualize the most frequent words in a body of text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Enter text here..."
                    rows={10}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Custom Stopwords (comma-separated)</Label>
                        <Input value={stopwords} onChange={e => setStopwords(e.target.value)} />
                    </div>
                    <div>
                        <Label>Max Words</Label>
                        <Input type="number" value={maxWords} onChange={e => setMaxWords(parseInt(e.target.value))} min="10" max="500" />
                    </div>
                </div>
                <Button onClick={handleAnalyze} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Generate Word Cloud
                </Button>
                {result && (
                    <div className="space-y-4 pt-4">
                        <h3 className="font-semibold">Results</h3>
                        {result.plots.wordcloud && <Plot data={JSON.parse(result.plots.wordcloud).data} layout={JSON.parse(result.plots.wordcloud).layout} useResizeHandler={true} className="w-full" />}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium">Statistics</h4>
                                <ul>
                                    {Object.entries(result.statistics).map(([key, value]) => (
                                        <li key={key} className="text-sm">{key.replace(/_/g, ' ')}: {value.toFixed(2)}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium">Top Words</h4>
                                <ul className="text-sm">
                                    {Object.entries(result.frequencies).slice(0, 10).map(([word, freq]) => (
                                        <li key={word}>{word}: {freq}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

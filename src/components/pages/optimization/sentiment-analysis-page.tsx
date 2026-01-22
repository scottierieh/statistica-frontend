'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Smile } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface SentimentResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  score: number;
}

export default function SentimentAnalysisPage() {
    const { toast } = useToast();
    const [text, setText] = useState('The food was absolutely wonderful, from preparation to presentation. The service was a bit slow, but the delicious food made up for it.\nA very disappointing experience. The pasta was overcooked and the sauce was bland.\nI had a great time with my friends. The ambiance is cozy and the staff is friendly.\nAmazing cocktails! The bartender really knows his craft. Food was okay.');
    const [stopwords, setStopwords] = useState('a, an, the, but, is');
    const [maxWords, setMaxWords] = useState(100);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ results: SentimentResult[], plot: string } | null>(null);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const texts = text.split('\n').filter(t => t.trim() !== '');
            if (texts.length === 0) throw new Error("Please enter some text to analyze.");

            const response = await fetch('/api/analysis/sentiment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to analyze sentiment.');
            }
            const res = await response.json();
            setResult(res);
            toast({ title: "Success", description: "Sentiment analysis complete." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Smile /> Sentiment Analysis</CardTitle>
                <CardDescription>Analyze text to determine its emotional tone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Enter text here, one sentence per line..."
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
                    Analyze Sentiment
                </Button>
                {result && (
                    <div className="space-y-4 pt-4">
                        <h3 className="font-semibold">Results</h3>
                        {result.plot && <Image src={`data:image/png;base64,${result.plot}`} alt="Sentiment Analysis Plot" width={800} height={600} className="rounded-md border" />}
                        <ul className="space-y-2">
                            {result.results.map((res, i) => (
                                <li key={i} className="p-2 border rounded-md text-sm">
                                    <span className={`font-bold ${res.sentiment === 'positive' ? 'text-green-600' : res.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'}`}>{res.sentiment.toUpperCase()}</span> ({(res.confidence * 100).toFixed(1)}%): "{res.text}"
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

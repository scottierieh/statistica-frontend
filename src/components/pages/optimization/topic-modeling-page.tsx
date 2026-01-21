'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Layers } from 'lucide-react';
import Image from 'next/image';

interface Topic {
    topic: number;
    words: { word: string, weight: number }[];
}

export default function TopicModelingPage() {
    const { toast } = useToast();
    const [text, setText] = useState('The food was absolutely wonderful, from preparation to presentation. The service was a bit slow, but the delicious food made up for it.\nA very disappointing experience. The pasta was overcooked and the sauce was bland.\nI had a great time with my friends. The ambiance is cozy and the staff is friendly.\nAmazing cocktails! The bartender really knows his craft. Food was okay.');
    const [numTopics, setNumTopics] = useState(3);
    const [numWords, setNumWords] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ topics: Topic[], plot: string } | null>(null);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const documents = text.split('\n').filter(t => t.trim() !== '');
            if (documents.length < 2) throw new Error("Please enter at least two documents (lines of text).");

            const response = await fetch('/api/analysis/topic-modeling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: documents, n_topics: numTopics, n_words: numWords }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to perform topic modeling.');
            }
            const res = await response.json();
            setResult(res);
            toast({ title: "Success", description: "Topic modeling complete." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers /> Topic Modeling</CardTitle>
                <CardDescription>Discover abstract topics from a collection of documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Enter documents here, one per line..."
                    rows={10}
                />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Number of Topics</Label>
                        <Input type="number" value={numTopics} onChange={e => setNumTopics(parseInt(e.target.value))} min="2" max="20" />
                    </div>
                    <div>
                        <Label>Words per Topic</Label>
                        <Input type="number" value={numWords} onChange={e => setNumWords(parseInt(e.target.value))} min="2" max="15" />
                    </div>
                </div>
                <Button onClick={handleAnalyze} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Discover Topics
                </Button>
                {result && (
                    <div className="space-y-4 pt-4">
                        <h3 className="font-semibold">Results</h3>
                        {result.plot && <Image src={`data:image/png;base64,${result.plot}`} alt="Topic Distribution Plot" width={800} height={400} className="rounded-md border" />}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {result.topics.map((topic) => (
                                <Card key={topic.topic}>
                                    <CardHeader><CardTitle>Topic {topic.topic + 1}</CardTitle></CardHeader>
                                    <CardContent>
                                        <ul>
                                            {topic.words.map((word, i) => (
                                                <li key={i} className="flex justify-between text-sm">
                                                    <span>{word.word}</span>
                                                    <span className="text-muted-foreground">{word.weight.toFixed(3)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

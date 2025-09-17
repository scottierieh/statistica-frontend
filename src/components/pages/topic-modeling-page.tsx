
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BookText, MessagesSquare } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface Topic {
    topic_id: number;
    top_words: string[];
    weights: number[];
}

interface TopicModelingResults {
    topics: Topic[];
    doc_topic_distribution: number[][];
    n_topics: number;
}

interface FullAnalysisResponse {
    results: TopicModelingResults;
    plot: string;
}

interface TopicModelingPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TopicModelingPage({ data, categoricalHeaders, onLoadExample }: TopicModelingPageProps) {
    const { toast } = useToast();
    const [textColumn, setTextColumn] = useState<string | undefined>();
    const [numTopics, setNumTopics] = useState<number>(10);
    const [numTopWords, setNumTopWords] = useState<number>(10);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);
    
    useEffect(() => {
        setTextColumn(categoricalHeaders.find(h => h.toLowerCase().includes('text') || h.toLowerCase().includes('review')) || categoricalHeaders[0]);
        setAnalysisResult(null);
    }, [data, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!textColumn) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a text column to analyze.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/topic-modeling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    text_column: textColumn, 
                    n_topics: numTopics,
                    n_top_words: numTopWords
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: "Topic Modeling Complete", description: `Successfully identified ${result.results.n_topics} topics.` });

        } catch (e: any) {
            console.error('Topic Modeling error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, textColumn, numTopics, numTopWords, toast]);

    if (!canRun) {
        const topicExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('topic-modeling'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Topic Modeling</CardTitle>
                        <CardDescription>
                           To discover topics, you need data with a text column. Try an example dataset to get started.
                        </CardDescription>
                    </CardHeader>
                     {topicExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(topicExamples[0])} className="w-full">
                                <MessagesSquare className="mr-2"/>
                                Load {topicExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Topic Modeling Setup (LDA)</CardTitle>
                    <CardDescription>Configure the parameters for Latent Dirichlet Allocation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Text Column</Label>
                            <Select value={textColumn} onValueChange={setTextColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Number of Topics</Label>
                            <Input type="number" value={numTopics} onChange={e => setNumTopics(Number(e.target.value))} min="2" max="20" />
                        </div>
                        <div>
                            <Label>Number of Top Words</Label>
                            <Input type="number" value={numTopWords} onChange={e => setNumTopWords(Number(e.target.value))} min="3" max="20" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !textColumn}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Topic Keywords</CardTitle>
                            <CardDescription>The most important words that make up each topic.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {results.topics.map(topic => (
                                    <Card key={topic.topic_id}>
                                        <CardHeader className="pb-2"><CardTitle className="text-lg">Topic {topic.topic_id + 1}</CardTitle></CardHeader>
                                        <CardContent>
                                            <ul className="space-y-1">
                                                {topic.top_words.map((word, i) => (
                                                    <li key={i} className="text-sm">{word}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Topic Word Weights</CardTitle>
                                <CardDescription>Visualization of word importance within each topic.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="Topic word weights plot" width={1500} height={750} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                         <CardHeader>
                            <CardTitle className="font-headline">Document-Topic Distribution</CardTitle>
                            <CardDescription>How much each document belongs to each topic.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[300px]">Document (First 50 chars)</TableHead>
                                            {results.topics.map(t => <TableHead key={t.topic_id} className="text-right">Topic {t.topic_id + 1}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.slice(0, 100).map((doc, docIndex) => (
                                            <TableRow key={docIndex}>
                                                <TableCell className="max-w-xs truncate">{String(doc[textColumn!]).substring(0, 50)}...</TableCell>
                                                {results.doc_topic_distribution[docIndex]?.map((prob, topicIndex) => (
                                                    <TableCell key={topicIndex} className="text-right font-mono">
                                                        <Badge variant={prob > 0.5 ? "default" : "secondary"}>
                                                            {(prob * 100).toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                ))}
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


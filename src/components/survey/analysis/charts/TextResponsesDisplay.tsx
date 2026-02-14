'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    ResponsiveContainer, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Bar,
    CartesianGrid
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, MessageSquare, Type, AlignLeft } from 'lucide-react';
import { COLORS, ChartBaseProps } from './constants';

interface TextResponsesDisplayProps extends ChartBaseProps {
  data: string[];
}

interface TextAnalysis {
  wordFreq: [string, number][];
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    overall: string;
  };
  stats: {
    totalResponses: number;
    avgLength: number;
    maxLength: number;
    minLength: number;
    totalChars: number;
    totalWords: number;
    avgWords: number;
  };
}

const analyzeTextResponses = (texts: string[]): TextAnalysis | null => {
    if (texts.length === 0) return null;
    
    const allText = texts.join(' ').toLowerCase();
    const words = allText.match(/\b[a-z]+\b/g) || [];
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were', 'been']);
    
    const wordFreq: {[key: string]: number} = {};
    words.forEach(word => {
        if (!stopWords.has(word) && word.length > 2) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });
    
    const sortedWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'best', 'wonderful', 'fantastic', 'happy'];
    const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'worst', 'awful', 'horrible', 'disappointed', 'frustrating', 'angry'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
    });
    
    const lengths = texts.map(t => t.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const maxLength = Math.max(...lengths);
    const minLength = Math.min(...lengths);
    
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    const totalWords = texts.reduce((sum, text) => sum + text.split(/\s+/).length, 0);
    
    return {
        wordFreq: sortedWords,
        sentiment: {
            positive: positiveCount,
            negative: negativeCount,
            neutral: words.length - positiveCount - negativeCount,
            overall: positiveCount > negativeCount ? 'Positive' : negativeCount > positiveCount ? 'Negative' : 'Neutral'
        },
        stats: {
            totalResponses: texts.length,
            avgLength,
            maxLength,
            minLength,
            totalChars,
            totalWords,
            avgWords: Math.round(totalWords / texts.length)
        }
    };
};

export default function TextResponsesDisplay({ data, title, onDownload }: TextResponsesDisplayProps) {
    const [activeTab, setActiveTab] = useState<'wordcloud' | 'frequency' | 'stats' | 'raw'>('wordcloud');
    const analysis = useMemo(() => analyzeTextResponses(data), [data]);
    
    if (!analysis) return null;
    
    // Generate word cloud data
    const wordCloudData = useMemo(() => {
        return analysis.wordFreq.map(([word, count]) => ({
            text: word,
            value: count,
            size: Math.max(12, Math.min(60, count * 3)) // Scale size based on frequency
        }));
    }, [analysis.wordFreq]);
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            {title}
                            <Badge variant="outline" className="ml-2 font-normal">Text</Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">Text response analysis</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDownload}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="wordcloud">Word Cloud</TabsTrigger>
                        <TabsTrigger value="frequency">Word Frequency</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                        <TabsTrigger value="raw">Raw Responses</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="wordcloud" className="space-y-4">
                        <div className="bg-muted/30 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                            <div className="text-center space-y-4 max-w-4xl mx-auto">
                                {/* Simple word cloud visualization using different sizes */}
                                <div className="flex flex-wrap justify-center gap-4 p-4">
                                    {wordCloudData.slice(0, 30).map((word, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-block transition-all hover:scale-110 cursor-default"
                                            style={{
                                                fontSize: `${word.size}px`,
                                                color: COLORS[idx % COLORS.length],
                                                fontWeight: word.size > 30 ? 'bold' : 'normal',
                                                opacity: Math.max(0.6, word.value / wordCloudData[0].value)
                                            }}
                                        >
                                            {word.text}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground mt-4">
                                    Most frequent words from {data.length} responses
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="frequency" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartContainer config={{}} className="w-full h-80">
                                <ResponsiveContainer>
                                    <BarChart data={analysis.wordFreq.slice(0, 10).map(([word, count]) => ({ word, count }))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="word" angle={-45} textAnchor="end" height={80} />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill={COLORS[0]} radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3 bg-muted/30">
                                    <CardTitle className="text-sm font-medium">Top 20 Words</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 max-h-80 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background">
                                            <TableRow>
                                                <TableHead className="h-9">#</TableHead>
                                                <TableHead className="h-9">Word</TableHead>
                                                <TableHead className="text-right h-9">Frequency</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {analysis.wordFreq.map(([word, count], idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="py-2 text-muted-foreground">{idx + 1}</TableCell>
                                                    <TableCell className="py-2 font-medium">{word}</TableCell>
                                                    <TableCell className="text-right py-2">
                                                        <Badge variant="secondary">{count}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="stats" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Responses</p>
                                            <p className="text-2xl font-bold">{analysis.stats.totalResponses}</p>
                                        </div>
                                        <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Words</p>
                                            <p className="text-2xl font-bold">{analysis.stats.totalWords}</p>
                                        </div>
                                        <Type className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Avg Words/Response</p>
                                            <p className="text-2xl font-bold">{analysis.stats.avgWords}</p>
                                        </div>
                                        <AlignLeft className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="raw" className="space-y-4">
                        <ScrollArea className="h-96 border rounded-lg">
                            <div className="p-4 space-y-3">
                                {data.map((text, idx) => (
                                    <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <Badge variant="outline" className="shrink-0 mt-0.5">#{idx + 1}</Badge>
                                                <p className="text-sm break-words">{text}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

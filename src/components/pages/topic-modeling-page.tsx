'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BookText, MessagesSquare, HelpCircle, Settings, FileSearch, Bot, Download, Activity, Info, TrendingUp, BarChart3 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';

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
    interpretations?: {
        overall_analysis: string;
        topic_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, data }: { results: TopicModelingResults, data: DataSet }) => {
    const stats = useMemo(() => {
        // Calculate document assignments
        const dominantTopics = results.doc_topic_distribution.map(dist => {
            const maxProb = Math.max(...dist);
            return dist.indexOf(maxProb);
        });
        
        // Count documents per topic
        const topicCounts = new Array(results.n_topics).fill(0);
        dominantTopics.forEach(topic => topicCounts[topic]++);
        
        // Find most common topic
        const maxCount = Math.max(...topicCounts);
        const mostCommonTopic = topicCounts.indexOf(maxCount);
        
        // Calculate average confidence
        const avgConfidence = results.doc_topic_distribution.reduce((sum, dist) => {
            return sum + Math.max(...dist);
        }, 0) / results.doc_topic_distribution.length;
        
        return {
            topicCounts,
            mostCommonTopic,
            mostCommonCount: maxCount,
            avgConfidence,
            totalDocs: data.length
        };
    }, [results, data]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Topics Identified Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Topics Found
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.n_topics}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Latent themes discovered
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Documents Analyzed Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Documents
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {stats.totalDocs}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Text samples analyzed
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Average Confidence Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Avg Assignment
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(stats.avgConfidence * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Topic certainty
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Largest Topic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Largest Topic
                            </p>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            Topic {stats.mostCommonTopic + 1}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {stats.mostCommonCount} documents ({((stats.mostCommonCount / stats.totalDocs) * 100).toFixed(1)}%)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const TopicModelingOverview = ({ textColumn, numTopics, numTopWords, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!textColumn) {
            overview.push('⚠ Select a text column to analyze');
        } else {
            overview.push(`Text column: ${textColumn}`);
        }
        
        overview.push(`Number of topics: ${numTopics}`);
        overview.push(`Top words per topic: ${numTopWords}`);

        // Data characteristics
        overview.push(`${data.length} documents to analyze`);

        // Method information
        overview.push('Method: Latent Dirichlet Allocation (LDA)');
        overview.push('Discovers hidden thematic structures');
        overview.push('Each document is a mixture of topics');
        overview.push('Each topic is a distribution over words');
        overview.push('Best for: Content categorization, text mining');

        return overview;
    }, [textColumn, numTopics, numTopWords, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Generate interpretations based on topic modeling results
const generateTopicModelingInterpretations = (results: TopicModelingResults, textColumn: string) => {
    const insights: string[] = [];
    
    // Calculate statistics
    const dominantTopics = results.doc_topic_distribution.map(dist => {
        const maxProb = Math.max(...dist);
        return { topic: dist.indexOf(maxProb), prob: maxProb };
    });
    
    const topicCounts = new Array(results.n_topics).fill(0);
    dominantTopics.forEach(({ topic }) => topicCounts[topic]++);
    
    const avgConfidence = dominantTopics.reduce((sum, { prob }) => sum + prob, 0) / dominantTopics.length;
    
    // Find most and least common topics
    const maxCount = Math.max(...topicCounts);
    const minCount = Math.min(...topicCounts);
    const mostCommonTopic = topicCounts.indexOf(maxCount);
    const leastCommonTopic = topicCounts.indexOf(minCount);
    
    // Overall analysis
    let overall = '';
    if (avgConfidence > 0.7) {
        overall = `<strong>Clear thematic structure identified.</strong> The LDA model discovered ${results.n_topics} distinct topics with an average assignment confidence of ${(avgConfidence * 100).toFixed(1)}%. Documents show strong alignment with specific topics, suggesting well-defined and coherent themes in your text corpus.`;
    } else if (avgConfidence > 0.5) {
        overall = `<strong>Moderate thematic structure identified.</strong> The LDA model discovered ${results.n_topics} topics with an average assignment confidence of ${(avgConfidence * 100).toFixed(1)}%. While topics are reasonably distinct, some documents contain mixed themes. Consider adjusting the number of topics for clearer separation.`;
    } else {
        overall = `<strong>Diffuse thematic structure detected.</strong> The LDA model discovered ${results.n_topics} topics but with lower average assignment confidence (${(avgConfidence * 100).toFixed(1)}%). Many documents appear to span multiple topics, suggesting either: (1) the optimal number of topics differs from ${results.n_topics}, (2) the corpus contains highly diverse content, or (3) documents are genuinely multi-thematic.`;
    }
    
    // Topic distribution insight
    const evenness = 1 - (Math.max(...topicCounts) - Math.min(...topicCounts)) / results.doc_topic_distribution.length;
    insights.push(`<strong>Topic Distribution:</strong> ${results.n_topics} topics were identified. Topic ${mostCommonTopic + 1} is the most prevalent (${maxCount} documents, ${((maxCount / results.doc_topic_distribution.length) * 100).toFixed(1)}%), while Topic ${leastCommonTopic + 1} is least common (${minCount} documents, ${((minCount / results.doc_topic_distribution.length) * 100).toFixed(1)}%). ${evenness > 0.7 ? 'Topics are relatively evenly distributed.' : 'Topic distribution is uneven, with some dominant themes.'}`);
    
    // Assignment confidence insight
    if (avgConfidence > 0.8) {
        insights.push(`<strong>Assignment Confidence:</strong> Very high average confidence (${(avgConfidence * 100).toFixed(1)}%). Documents have clear primary topics with minimal overlap, indicating distinct thematic content.`);
    } else if (avgConfidence > 0.6) {
        insights.push(`<strong>Assignment Confidence:</strong> Good average confidence (${(avgConfidence * 100).toFixed(1)}%). Most documents have identifiable primary topics, though some span multiple themes.`);
    } else {
        insights.push(`<strong>Assignment Confidence:</strong> Lower average confidence (${(avgConfidence * 100).toFixed(1)}%). Many documents don't strongly belong to any single topic. This could indicate: overlapping themes, the need for different topic counts, or genuinely multifaceted content.`);
    }
    
    // Topic quality insights based on top words
    const avgWordsPerTopic = results.topics.reduce((sum, t) => sum + t.top_words.length, 0) / results.topics.length;
    insights.push(`<strong>Topic Keywords:</strong> Each topic is characterized by ${avgWordsPerTopic} top words. Review these keywords to assess topic coherence and interpretability. Well-defined topics have semantically related keywords, while poorly defined topics show unrelated or generic terms.`);
    
    // Mixed topics insight
    const mixedDocs = dominantTopics.filter(({ prob }) => prob < 0.5).length;
    if (mixedDocs > 0) {
        insights.push(`<strong>Multi-Topic Documents:</strong> ${mixedDocs} documents (${((mixedDocs / dominantTopics.length) * 100).toFixed(1)}%) have no dominant topic (max probability < 50%). These documents span multiple themes and may benefit from manual review or more granular categorization.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (avgConfidence < 0.6) {
        recommendations = 'Low topic assignment confidence suggests model refinement needed. Try: (1) Adjusting the number of topics (try both higher and lower values), (2) Preprocessing text more thoroughly (remove stopwords, lemmatization), (3) Filtering very short or very long documents, (4) Increasing iterations for better convergence, (5) Using alternative methods like NMF or Top2Vec if LDA doesnt capture your corpus structure. Evaluate multiple models with different topic counts to find the optimal granularity.';
    } else if (topicCounts.some(count => count < 3)) {
        recommendations = 'Some topics have very few documents, suggesting over-segmentation. Consider: (1) Reducing the number of topics for broader themes, (2) Examining sparse topics for quality - they may represent outliers or noise, (3) Merging semantically similar topics manually, (4) Using hierarchical topic modeling to capture topics at multiple levels of granularity. For practical applications, aim for topics with sufficient document representation.';
    } else if (evenness < 0.5) {
        recommendations = 'Highly uneven topic distribution detected. Consider: (1) Investigating whether the corpus is naturally imbalanced or if sampling bias exists, (2) Using weighted sampling or stratification if building downstream models, (3) Examining dominant topics for over-generalization - they may need subdivision, (4) Checking if rare topics represent genuine niches or noise. Imbalanced topics are acceptable if they reflect real content distribution.';
    } else {
        recommendations = 'Your topic model shows good performance. To leverage these results: (1) Assign human-interpretable labels to each topic based on keywords and sample documents, (2) Use topic assignments for content categorization, search, or recommendation systems, (3) Track topic evolution over time if you have temporal data, (4) Identify trending or emerging topics by monitoring topic distributions, (5) Use topics as features for downstream machine learning tasks, (6) Validate topics with domain experts to ensure they align with actual content themes. Consider topic modeling as an iterative, exploratory process requiring human interpretation.';
    }
    
    return {
        overall_analysis: overall,
        topic_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const topicExample = exampleDatasets.find(d => d.analysisTypes.includes('topic-modeling'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BookText className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Topic Modeling</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Discover hidden thematic structures in large text collections
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">LDA</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Latent Dirichlet Allocation
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Unsupervised</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Automatic theme discovery
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Keywords</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Top words per topic
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Topic Modeling
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Topic modeling is an unsupervised machine learning technique that automatically discovers 
                            themes or "topics" within a collection of documents. Each topic is characterized by a set of 
                            related words, and each document is represented as a mixture of topics. Use it to explore large 
                            text corpora, categorize content, identify trends, or understand thematic structure without 
                            manual labeling.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Text Column:</strong> Document collection</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Documents:</strong> 50+ recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Topic Count:</strong> Choose based on corpus size</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Text Length:</strong> Longer texts work better</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Topics:</strong> Thematic clusters identified</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Keywords:</strong> Words defining each topic</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Distribution:</strong> Topic mixture per document</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Weights:</strong> Word importance scores</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {topicExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(topicExample)} size="lg">
                                <BookText className="mr-2 h-5 w-5" />
                                Load Topic Modeling Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface TopicModelingPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function TopicModelingPage({ data, categoricalHeaders, onLoadExample, onGenerateReport }: TopicModelingPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [textColumn, setTextColumn] = useState<string | undefined>();
    const [numTopics, setNumTopics] = useState<number>(10);
    const [numTopWords, setNumTopWords] = useState<number>(10);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);
    
    useEffect(() => {
        setTextColumn(categoricalHeaders.find(h => h.toLowerCase().includes('text') || h.toLowerCase().includes('review')) || categoricalHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, categoricalHeaders, canRun]);

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
            
            // Generate interpretations
            const interpretations = generateTopicModelingInterpretations(result.results, textColumn);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Topic Modeling error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, textColumn, numTopics, numTopWords, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        // Export topics and their keywords
        const topicsData = analysisResult.results.topics.map(topic => ({
            topic_id: topic.topic_id + 1,
            keywords: topic.top_words.join(', '),
            weights: topic.weights.map(w => w.toFixed(4)).join(', ')
        }));
        
        const csv = Papa.unparse(topicsData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'topic_modeling_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Topic results are being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Topic Modeling Setup (LDA)</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Configure parameters for Latent Dirichlet Allocation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Text Column</Label>
                            <Select value={textColumn} onValueChange={setTextColumn}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                    
                    {/* Analysis Overview */}
                    <TopicModelingOverview 
                        textColumn={textColumn}
                        numTopics={numTopics}
                        numTopWords={numTopWords}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(analysisResult, null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleDownloadResults}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Topics
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !textColumn}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Discovering topics in your text corpus...</p>
                        <Skeleton className="h-[600px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} data={data} />

                    {/* Interpretation */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Interpretation</CardTitle>
                                    <CardDescription>Analysis of discovered topics and thematic structure.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <strong className="text-foreground">Overall Analysis:</strong>
                                        <p className="text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }} />
                                    </div>
                                    <div>
                                        <strong className="text-foreground">Recommendations:</strong>
                                        <p className="text-muted-foreground mt-1">
                                            {analysisResult.interpretations?.recommendations}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Topic Insights */}
                    {analysisResult.interpretations?.topic_insights && analysisResult.interpretations.topic_insights.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Topic Insights</CardTitle>
                                <CardDescription>Detailed analysis of topic distribution and quality.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysisResult.interpretations.topic_insights.map((insight, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Topic Keywords Grid */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Topic Keywords</CardTitle>
                            <CardDescription>The most important words that define each discovered topic.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {results.topics.map(topic => (
                                    <Card key={topic.topic_id} className="border-2">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">Topic {topic.topic_id + 1}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-1">
                                                {topic.top_words.map((word, i) => (
                                                    <li key={i} className="text-sm flex items-center gap-2">
                                                        <span className="text-muted-foreground">{i + 1}.</span>
                                                        <span className="font-medium">{word}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Topic Word Weights Visualization */}
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

                    {/* Document-Topic Distribution Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Document-Topic Distribution</CardTitle>
                            <CardDescription>
                                Probability that each document belongs to each topic. Higher percentages indicate stronger topic assignment.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead className="w-[300px]">Document (Preview)</TableHead>
                                            {results.topics.map(t => <TableHead key={t.topic_id} className="text-right">Topic {t.topic_id + 1}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.slice(0, 100).map((doc, docIndex) => (
                                            <TableRow key={docIndex}>
                                                <TableCell className="text-muted-foreground">{docIndex + 1}</TableCell>
                                                <TableCell className="max-w-xs">
                                                    <div className="truncate" title={String(doc[textColumn!])}>
                                                        {String(doc[textColumn!]).substring(0, 50)}...
                                                    </div>
                                                </TableCell>
                                                {results.doc_topic_distribution[docIndex]?.map((prob, topicIndex) => (
                                                    <TableCell key={topicIndex} className="text-right font-mono">
                                                        <Badge variant={prob > 0.5 ? "default" : prob > 0.3 ? "secondary" : "outline"}>
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
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <BookText className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure parameters and click &apos;Run Analysis&apos; to discover topics.</p>
                </div>
            )}
        </div>
    );
}


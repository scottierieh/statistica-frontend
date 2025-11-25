'use client';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Smile, HelpCircle, Settings, FileSearch, Bot, Download, Activity, Info, TrendingUp, BarChart3 } from 'lucide-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';

interface SentimentResult {
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    score: number;
}

interface AnalysisResponse {
    results: SentimentResult[];
    plot: string;
    interpretations?: {
        overall_analysis: string;
        sentiment_insights: string[];
        recommendations: string;
    };
}

const getSentimentBadge = (sentiment: SentimentResult['sentiment']) => {
    switch (sentiment) {
        case 'positive': return <Badge className="bg-green-500 hover:bg-green-600">Positive</Badge>;
        case 'negative': return <Badge variant="destructive">Negative</Badge>;
        case 'neutral': return <Badge variant="secondary">Neutral</Badge>;
    }
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: SentimentResult[] }) => {
    const stats = useMemo(() => {
        const positive = results.filter(r => r.sentiment === 'positive').length;
        const negative = results.filter(r => r.sentiment === 'negative').length;
        const neutral = results.filter(r => r.sentiment === 'neutral').length;
        const total = results.length;
        
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / total;
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / total;
        
        return {
            positive,
            negative,
            neutral,
            total,
            positivePercent: (positive / total) * 100,
            negativePercent: (negative / total) * 100,
            neutralPercent: (neutral / total) * 100,
            avgConfidence,
            avgScore
        };
    }, [results]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Analyzed Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Analyzed
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {stats.total}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Text samples processed
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Positive Sentiment Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Positive
                            </p>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-2xl font-semibold text-green-600">
                            {stats.positive}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {stats.positivePercent.toFixed(1)}% of total
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Negative Sentiment Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Negative
                            </p>
                            <BarChart3 className="h-4 w-4 text-red-600" />
                        </div>
                        <p className="text-2xl font-semibold text-red-600">
                            {stats.negative}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {stats.negativePercent.toFixed(1)}% of total
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
                                Avg Confidence
                            </p>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(stats.avgConfidence * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Model certainty
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const SentimentOverview = ({ textCount }: { textCount: number }) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (textCount === 0) {
            overview.push('⚠ Enter text to analyze (one item per line)');
        } else {
            overview.push(`${textCount} text sample${textCount > 1 ? 's' : ''} ready for analysis`);
        }

        // Method information
        overview.push('Method: Transformer-based sentiment classification');
        overview.push('Model: Pre-trained neural network');
        overview.push('Outputs: Positive, Negative, or Neutral');
        overview.push('Confidence score for each prediction');
        overview.push('Best for: Customer reviews, social media, feedback');

        return overview;
    }, [textCount]);

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

// Generate interpretations based on sentiment results
const generateSentimentInterpretations = (results: SentimentResult[]) => {
    const insights: string[] = [];
    
    const positive = results.filter(r => r.sentiment === 'positive').length;
    const negative = results.filter(r => r.sentiment === 'negative').length;
    const neutral = results.filter(r => r.sentiment === 'neutral').length;
    const total = results.length;
    
    const positivePercent = (positive / total) * 100;
    const negativePercent = (negative / total) * 100;
    const neutralPercent = (neutral / total) * 100;
    
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / total;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / total;
    
    // Overall sentiment
    let overall = '';
    if (positivePercent > 60) {
        overall = `<strong>Predominantly positive sentiment detected.</strong> ${positivePercent.toFixed(1)}% of analyzed texts express positive sentiment, with ${positive} out of ${total} samples classified as positive. This suggests overall favorable opinions, satisfaction, or enthusiasm in the content.`;
    } else if (negativePercent > 60) {
        overall = `<strong>Predominantly negative sentiment detected.</strong> ${negativePercent.toFixed(1)}% of analyzed texts express negative sentiment, with ${negative} out of ${total} samples classified as negative. This indicates concerns, dissatisfaction, or critical perspectives in the content.`;
    } else if (neutralPercent > 50) {
        overall = `<strong>Predominantly neutral sentiment detected.</strong> ${neutralPercent.toFixed(1)}% of analyzed texts express neutral sentiment, with ${neutral} out of ${total} samples classified as neutral. This suggests factual, objective, or emotionally balanced content.`;
    } else {
        overall = `<strong>Mixed sentiment detected.</strong> The sentiment is distributed across categories: ${positivePercent.toFixed(1)}% positive, ${negativePercent.toFixed(1)}% negative, and ${neutralPercent.toFixed(1)}% neutral. This indicates diverse opinions or varied emotional expressions in the content.`;
    }
    
    // Distribution insights
    insights.push(`<strong>Sentiment Distribution:</strong> ${positive} positive (${positivePercent.toFixed(1)}%), ${negative} negative (${negativePercent.toFixed(1)}%), ${neutral} neutral (${neutralPercent.toFixed(1)}%). Total samples analyzed: ${total}.`);
    
    // Confidence insights
    if (avgConfidence > 0.9) {
        insights.push(`<strong>Model Confidence:</strong> Very high average confidence (${(avgConfidence * 100).toFixed(1)}%). The model is highly certain about its predictions, suggesting clear sentiment signals in the text.`);
    } else if (avgConfidence > 0.7) {
        insights.push(`<strong>Model Confidence:</strong> Good average confidence (${(avgConfidence * 100).toFixed(1)}%). The model shows reasonable certainty in its predictions.`);
    } else if (avgConfidence > 0.5) {
        insights.push(`<strong>Model Confidence:</strong> Moderate average confidence (${(avgConfidence * 100).toFixed(1)}%). Some texts may have ambiguous or mixed sentiment. Review low-confidence predictions carefully.`);
    } else {
        insights.push(`<strong>Model Confidence:</strong> Low average confidence (${(avgConfidence * 100).toFixed(1)}%). Many texts have ambiguous sentiment. Consider manual review or context-specific analysis.`);
    }
    
    // Sentiment score insights
    insights.push(`<strong>Average Sentiment Score:</strong> ${avgScore.toFixed(3)}. This normalized score ranges from -1 (very negative) to +1 (very positive), with 0 being neutral. ${avgScore > 0.3 ? 'The overall tone leans positive.' : avgScore < -0.3 ? 'The overall tone leans negative.' : 'The overall tone is relatively neutral or balanced.'}`);
    
    // Extreme sentiments
    const veryPositive = results.filter(r => r.sentiment === 'positive' && r.confidence > 0.9).length;
    const veryNegative = results.filter(r => r.sentiment === 'negative' && r.confidence > 0.9).length;
    
    if (veryPositive > 0 || veryNegative > 0) {
        insights.push(`<strong>Strong Sentiments:</strong> ${veryPositive} texts show very strong positive sentiment (>90% confidence), and ${veryNegative} show very strong negative sentiment. These represent the most emotionally charged or opinionated content.`);
    }
    
    // Low confidence items
    const lowConfidence = results.filter(r => r.confidence < 0.6).length;
    if (lowConfidence > 0) {
        insights.push(`<strong>Ambiguous Cases:</strong> ${lowConfidence} texts (${((lowConfidence / total) * 100).toFixed(1)}%) have confidence below 60%. These may contain mixed sentiment, sarcasm, or require human review for accurate interpretation.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (negativePercent > 40) {
        recommendations = 'Significant negative sentiment detected. Consider: (1) Identifying common themes in negative feedback using topic modeling or keyword analysis, (2) Prioritizing high-confidence negative items for immediate action, (3) Investigating root causes of dissatisfaction, (4) Developing targeted interventions or responses, (5) Monitoring sentiment trends over time to assess improvement. For customer feedback, consider reaching out to address concerns proactively.';
    } else if (positivePercent > 60) {
        recommendations = 'Strong positive sentiment provides valuable insights. Consider: (1) Identifying what drives positive sentiment to reinforce successful strategies, (2) Leveraging positive feedback for testimonials, marketing, or case studies, (3) Recognizing and rewarding contributors of positive content, (4) Maintaining factors that contribute to satisfaction, (5) Still monitoring the negative/neutral segments for improvement opportunities. Continue tracking sentiment to ensure sustained positivity.';
    } else if (avgConfidence < 0.7) {
        recommendations = 'Lower confidence scores suggest ambiguity in sentiment. Consider: (1) Manual review of low-confidence predictions for accuracy, (2) Using domain-specific sentiment models if available for your context, (3) Collecting more contextual information to improve classification, (4) Training custom models on your specific data if you have labeled examples, (5) Combining sentiment analysis with qualitative methods for nuanced understanding. Be cautious about drawing strong conclusions from low-confidence predictions.';
    } else {
        recommendations = 'Your sentiment distribution is balanced with good confidence. Consider: (1) Conducting deeper analysis to understand sentiment drivers, (2) Segmenting results by topics, time periods, or other dimensions, (3) Tracking sentiment trends over time for pattern detection, (4) Combining quantitative sentiment scores with qualitative review, (5) Using insights to inform decision-making, content strategy, or product improvements. Regular monitoring can reveal emerging trends early.';
    }
    
    return {
        overall_analysis: overall,
        sentiment_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Smile className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Sentiment Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Analyze emotional tone and opinion in text using AI
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-green-600 mb-2" />
                                <CardTitle className="text-lg">Positive</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Favorable, satisfied opinions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-gray-600 mb-2" />
                                <CardTitle className="text-lg">Neutral</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Objective, factual content
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-red-600 mb-2" />
                                <CardTitle className="text-lg">Negative</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Critical, dissatisfied views
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Sentiment Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Sentiment analysis uses natural language processing to automatically detect the emotional 
                            tone in text. It's invaluable for understanding customer opinions, monitoring brand 
                            perception, analyzing social media, evaluating product reviews, or processing survey 
                            responses at scale. The AI model classifies each text as positive, negative, or neutral 
                            with a confidence score.
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
                                        <span><strong>Text Input:</strong> Any written content</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Format:</strong> One item per line</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Language:</strong> English recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Length:</strong> Any length works</span>
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
                                        <span><strong>Sentiment:</strong> Positive/Negative/Neutral</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Confidence:</strong> Model certainty (0-100%)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Score:</strong> -1 (negative) to +1 (positive)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Distribution:</strong> Overall sentiment breakdown</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button onClick={onStart} size="lg">
                            <Smile className="mr-2 h-5 w-5" />
                            Start Analyzing Sentiment
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function SentimentAnalysisPage() {
    const { toast } = useToast();
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const textLines = useMemo(() => {
        return text.split('\n').map(t => t.trim()).filter(Boolean);
    }, [text]);

    const handleAnalysis = useCallback(async () => {
        if (textLines.length === 0) {
            toast({ variant: 'destructive', title: 'Input Error', description: 'Please enter some text to analyze.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/sentiment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: textLines })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            // Generate interpretations
            const interpretations = generateSentimentInterpretations(result.results);
            result.interpretations = interpretations;

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Sentiment analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [textLines, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const csv = Papa.unparse(analysisResult.results);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sentiment_analysis_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Sentiment results are being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Smile /> Sentiment Analysis
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Enter text (one item per line) to analyze its sentiment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        id="text-input"
                        placeholder="e.g., This product is amazing!&#10;I am very disappointed with the service.&#10;The features are exactly what I needed."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                    />
                    
                    {/* Analysis Overview */}
                    <SentimentOverview textCount={textLines.length} />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {analysisResult && (
                            <Button variant="outline" onClick={handleDownloadResults}>
                                <Download className="mr-2 h-4 w-4" />
                                Export Results
                            </Button>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || textLines.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Analyze Sentiment</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Analyzing sentiment with AI...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={analysisResult.results} />

                    {/* Interpretation */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Interpretation</CardTitle>
                                    <CardDescription>Analysis of overall sentiment distribution and patterns.</CardDescription>
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

                    {/* Sentiment Insights */}
                    {analysisResult.interpretations?.sentiment_insights && analysisResult.interpretations.sentiment_insights.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Sentiment Insights</CardTitle>
                                <CardDescription>Detailed breakdown of sentiment analysis results.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysisResult.interpretations.sentiment_insights.map((insight, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sentiment Distribution Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Sentiment Distribution</CardTitle>
                            <CardDescription>
                                Visual breakdown of positive, negative, and neutral sentiments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Sentiment Distribution" width={800} height={500} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>

                    {/* Detailed Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Results</CardTitle>
                            <CardDescription>
                                Individual sentiment predictions with confidence scores for each text sample.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>Text</TableHead>
                                            <TableHead className="w-32">Sentiment</TableHead>
                                            <TableHead className="text-right w-32">Confidence</TableHead>
                                            <TableHead className="text-right w-32">Score</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisResult.results.map((res, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                <TableCell className="max-w-md">
                                                    <div className="truncate" title={res.text}>{res.text}</div>
                                                </TableCell>
                                                <TableCell>{getSentimentBadge(res.sentiment)}</TableCell>
                                                <TableCell className="text-right font-mono">{(res.confidence * 100).toFixed(1)}%</TableCell>
                                                <TableCell className="text-right font-mono">{res.score.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && view === 'main' && (
                <div className="text-center text-muted-foreground py-10">
                    <Smile className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Enter text above and click &apos;Analyze Sentiment&apos; to begin.</p>
                </div>
            )}
        </div>
    );
}
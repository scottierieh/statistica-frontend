'use client';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Feather, BarChart, Settings, HelpCircle, FileSearch, Bot, Download, Activity, Info, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-96" />,
});

interface AnalysisResponse {
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
    interpretations?: {
        overall_analysis: string;
        text_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ statistics }: { statistics: AnalysisResponse['statistics'] }) => {
    const uniquenessRatio = (statistics.unique_words / statistics.total_words) * 100;
    const retentionRatio = (statistics.processed_words_count / statistics.total_words) * 100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Words Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Words
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {statistics.total_words.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Raw word count
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Unique Words Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Unique Words
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {statistics.unique_words.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {uniquenessRatio.toFixed(1)}% vocabulary diversity
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Processed Words Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Processed
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {statistics.processed_words_count.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {retentionRatio.toFixed(1)}% after filtering
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Average Length Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Avg Length
                            </p>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {statistics.average_word_length.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Characters per word
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const WordCloudOverview = ({ textLength, settings }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (textLength === 0) {
            overview.push('⚠ Enter text to analyze');
        } else {
            overview.push(`${textLength} characters of text ready`);
        }

        // Settings
        overview.push(`Max words in cloud: ${settings.maxWords}`);
        overview.push(`Minimum word length: ${settings.minWordLength}`);
        overview.push(`Color scheme: ${settings.colormap}`);
        if (settings.customStopwords) {
            overview.push(`Custom stopwords: ${settings.customStopwords.split(',').length} words`);
        }

        // Method information
        overview.push('Removes common stopwords automatically');
        overview.push('Word size reflects frequency');
        overview.push('Best for: Content analysis, keyword extraction');

        return overview;
    }, [textLength, settings]);

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

// Generate interpretations based on word cloud results
const generateWordCloudInterpretations = (statistics: AnalysisResponse['statistics'], frequencies: { [key: string]: number }) => {
    const insights: string[] = [];
    
    const uniquenessRatio = (statistics.unique_words / statistics.total_words) * 100;
    const retentionRatio = (statistics.processed_words_count / statistics.total_words) * 100;
    
    // Get top words
    const sortedWords = Object.entries(frequencies).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topWord = sortedWords[0];
    const topWordFreq = topWord ? (topWord[1] / statistics.processed_words_count) * 100 : 0;
    
    // Overall analysis
    let overall = '';
    if (uniquenessRatio > 70) {
        overall = `<strong>High vocabulary diversity detected.</strong> Your text contains ${statistics.unique_words.toLocaleString()} unique words out of ${statistics.total_words.toLocaleString()} total words (${uniquenessRatio.toFixed(1)}% uniqueness). This suggests rich, varied language with minimal repetition, typical of creative writing, academic prose, or diverse content.`;
    } else if (uniquenessRatio > 40) {
        overall = `<strong>Moderate vocabulary diversity.</strong> Your text contains ${statistics.unique_words.toLocaleString()} unique words out of ${statistics.total_words.toLocaleString()} total words (${uniquenessRatio.toFixed(1)}% uniqueness). This is typical of most written content with a balanced mix of repeated key terms and varied vocabulary.`;
    } else {
        overall = `<strong>Lower vocabulary diversity detected.</strong> Your text contains ${statistics.unique_words.toLocaleString()} unique words out of ${statistics.total_words.toLocaleString()} total words (${uniquenessRatio.toFixed(1)}% uniqueness). This suggests focused content with significant repetition of key terms, which is common in technical documentation, transcripts, or specialized content.`;
    }
    
    // Vocabulary insights
    insights.push(`<strong>Vocabulary Size:</strong> ${statistics.unique_words.toLocaleString()} unique words from ${statistics.total_words.toLocaleString()} total. Vocabulary diversity ratio of ${uniquenessRatio.toFixed(1)}% ${uniquenessRatio > 60 ? 'indicates rich language variety.' : uniquenessRatio > 40 ? 'is typical for most content.' : 'suggests focused, repetitive content.'}`);
    
    // Processing insights
    insights.push(`<strong>Word Processing:</strong> After filtering stopwords and applying minimum length requirements, ${statistics.processed_words_count.toLocaleString()} words (${retentionRatio.toFixed(1)}%) were retained. ${retentionRatio > 60 ? 'High retention suggests content-rich text with fewer common words.' : retentionRatio > 40 ? 'Moderate retention is typical.' : 'Lower retention indicates many common/short words were filtered out.'}`);
    
    // Top word insights
    if (topWord) {
        insights.push(`<strong>Most Frequent Word:</strong> "${topWord[0]}" appears ${topWord[1]} times (${topWordFreq.toFixed(1)}% of processed words). ${topWordFreq > 5 ? 'This high frequency suggests it\'s a central theme or topic.' : 'This indicates balanced word distribution without dominant terms.'}`);
    }
    
    // Top words list
    if (sortedWords.length >= 3) {
        const topThree = sortedWords.slice(0, 3).map(([word, count]) => `"${word}" (${count})`).join(', ');
        insights.push(`<strong>Top Words:</strong> The three most frequent words are ${topThree}. These likely represent the main themes or subjects of your text.`);
    }
    
    // Average word length insight
    if (statistics.average_word_length > 6) {
        insights.push(`<strong>Word Length:</strong> Average word length of ${statistics.average_word_length.toFixed(2)} characters suggests formal, complex vocabulary typical of academic or professional writing.`);
    } else if (statistics.average_word_length > 4.5) {
        insights.push(`<strong>Word Length:</strong> Average word length of ${statistics.average_word_length.toFixed(2)} characters is typical for general content with standard vocabulary.`);
    } else {
        insights.push(`<strong>Word Length:</strong> Average word length of ${statistics.average_word_length.toFixed(2)} characters suggests simpler, more accessible vocabulary.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (uniquenessRatio < 30) {
        recommendations = 'Low vocabulary diversity detected. Consider: (1) If this is intentional (e.g., focusing on specific keywords), the repetition serves your purpose well, (2) For general content, introducing synonyms and varied phrasing could improve readability and SEO, (3) Use the frequency analysis to identify over-used words that could be replaced, (4) Check if technical jargon or domain-specific terms are inflating repetition, (5) For creative writing, more varied vocabulary might enhance engagement.';
    } else if (statistics.processed_words_count < 50) {
        recommendations = 'Limited text analyzed. For more meaningful insights: (1) Provide longer text samples (at least 100-200 words recommended), (2) Combine multiple related documents for corpus analysis, (3) Be aware that results from short texts may not be representative, (4) Use this for quick keyword extraction from brief content, (5) Consider analyzing larger bodies of work for comprehensive patterns.';
    } else if (topWordFreq > 10) {
        recommendations = `The word "${topWord![0]}" dominates your text (${topWordFreq.toFixed(1)}%). Consider: (1) This is appropriate if it's your main topic or brand term, (2) For SEO, dominant keywords can help with search ranking, (3) From a readability perspective, excessive repetition can bore readers, (4) Try replacing some instances with synonyms or related terms, (5) Use the word cloud to identify other important but less emphasized terms that could be developed, (6) Balance keyword optimization with natural, engaging writing.`;
    } else {
        recommendations = 'Your text shows healthy word distribution. To leverage these insights: (1) Use the top words to identify main themes for content categorization, (2) Compare word clouds across different texts to spot thematic differences, (3) For SEO, ensure top words align with your target keywords, (4) Use the frequency analysis to check if important concepts are adequately emphasized, (5) Review the word cloud visually to ensure key messages are prominent, (6) Consider the unique processed words as potential content expansion opportunities.';
    }
    
    return {
        overall_analysis: overall,
        text_insights: insights,
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
                            <Feather className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Word Cloud Generator</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Visualize word frequency and discover key themes in your text
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Size reflects word frequency
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Frequency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Top words analysis
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Text metrics and insights
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Word Clouds
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Word clouds provide instant visual understanding of text content by displaying words 
                            sized according to their frequency. They're perfect for quickly identifying key themes, 
                            analyzing content focus, extracting keywords for SEO, summarizing large documents, 
                            comparing multiple texts, or presenting data in an engaging visual format. Common 
                            stopwords are automatically filtered to highlight meaningful content.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Features
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Smart Filtering:</strong> Auto-removes stopwords</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Customizable:</strong> Set word limits, length filters</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Color Schemes:</strong> Multiple colormap options</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Statistics:</strong> Detailed text metrics</span>
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
                                        <span><strong>Word Size:</strong> Larger = more frequent</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Frequency Bar:</strong> Top 20 words ranked</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Uniqueness:</strong> Vocabulary diversity ratio</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Processed:</strong> Words after filtering</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button onClick={onStart} size="lg">
                            <Feather className="mr-2 h-5 w-5" />
                            Start Creating Word Cloud
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function WordCloudPage() {
    const { toast } = useToast();
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    // Advanced settings
    const [customStopwords, setCustomStopwords] = useState('');
    const [minWordLength, setMinWordLength] = useState(2);
    const [maxWords, setMaxWords] = useState(100);
    const [colormap, setColormap] = useState('viridis');

    const settings = useMemo(() => ({
        customStopwords,
        minWordLength,
        maxWords,
        colormap
    }), [customStopwords, minWordLength, maxWords, colormap]);

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

            // Generate interpretations
            const interpretations = generateWordCloudInterpretations(result.statistics, result.frequencies);
            result.interpretations = interpretations;

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Word cloud analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [text, customStopwords, minWordLength, maxWords, colormap, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const frequencyData = Object.entries(analysisResult.frequencies).map(([word, count]) => ({
            word,
            frequency: count,
            percentage: ((count / analysisResult.statistics.processed_words_count) * 100).toFixed(2)
        }));
        
        const csv = Papa.unparse(frequencyData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'word_frequency_analysis.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Word frequency data is being downloaded." });
    }, [analysisResult, toast]);

    const plotData = useMemo(() => {
        if (!analysisResult?.plots.wordcloud) return null;
        try {
            return JSON.parse(analysisResult.plots.wordcloud);
        } catch (e) {
            console.error("Failed to parse wordcloud plot data", e);
            return null;
        }
    }, [analysisResult]);

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Feather /> Word Cloud Generator
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Enter text to generate a word cloud and see word frequency analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        id="text-input"
                        placeholder="Paste your text here...&#10;&#10;The word cloud will highlight the most frequently used words, with larger words appearing more often in your text."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                    />
                    
                    {/* Analysis Overview */}
                    <WordCloudOverview textLength={text.length} settings={settings} />
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="flex gap-2">
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
                        {analysisResult && (
                            <Button variant="outline" onClick={handleDownloadResults}>
                                <Download className="mr-2 h-4 w-4" />
                                Export Data
                            </Button>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !text.trim()}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Generate</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Generating word cloud and analyzing text...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}
            
            {analysisResult && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards statistics={analysisResult.statistics} />

                    {/* Interpretation */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Interpretation</CardTitle>
                                    <CardDescription>Analysis of vocabulary diversity and word patterns.</CardDescription>
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

                    {/* Text Insights */}
                    {analysisResult.interpretations?.text_insights && analysisResult.interpretations.text_insights.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Text Insights</CardTitle>
                                <CardDescription>Detailed analysis of word frequency and vocabulary patterns.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysisResult.interpretations.text_insights.map((insight, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Word Cloud */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Word Cloud</CardTitle>
                            <CardDescription>
                                Visual representation of word frequency. Larger words appear more frequently in the text.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           {plotData ? (
                                <Plot
                                    data={plotData.data}
                                    layout={plotData.layout}
                                    useResizeHandler={true}
                                    className="w-full h-[400px]"
                                />
                            ) : (
                                <p className="text-muted-foreground">Could not render word cloud.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Frequency Chart and Statistics */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <BarChart/> Top 20 Word Frequency
                                </CardTitle>
                                <CardDescription>Bar chart showing the most frequently occurring words.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={`data:image/png;base64,${analysisResult.plots.frequency_bar}`} alt="Word Frequency Bar Chart" width={600} height={400} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Text Statistics</CardTitle>
                                <CardDescription>Detailed metrics about your text corpus.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Metric</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-semibold">Total Words</TableCell>
                                            <TableCell className="text-right font-mono">{analysisResult.statistics.total_words.toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Unique Words</TableCell>
                                            <TableCell className="text-right font-mono">{analysisResult.statistics.unique_words.toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">After Processing</TableCell>
                                            <TableCell className="text-right font-mono">{analysisResult.statistics.processed_words_count.toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Unique Processed</TableCell>
                                            <TableCell className="text-right font-mono">{analysisResult.statistics.unique_processed_words.toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Avg Word Length</TableCell>
                                            <TableCell className="text-right font-mono">{analysisResult.statistics.average_word_length.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Vocabulary Diversity</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {((analysisResult.statistics.unique_words / analysisResult.statistics.total_words) * 100).toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && view === 'main' && (
                <div className="text-center text-muted-foreground py-10">
                    <Feather className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Enter text above and click &apos;Generate&apos; to create your word cloud.</p>
                </div>
            )}
        </div>
    );
}


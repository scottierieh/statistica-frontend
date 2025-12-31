'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Bot, FileUp, Sparkles, AlertCircle, ChevronsUpDown } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ScrollArea } from '../ui/scroll-area';


interface RecommendationPageProps {
  onLoadExample: (example: ExampleDataSet) => void;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  data: DataSet;
  allHeaders: string[];
}

const IntroPage = ({ onFileSelected, onLoadExample, isUploading }: any) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Wand2 className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">AI Analysis Recommendation</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Upload your data and let our AI suggest the best statistical analyses for your research questions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <p className="text-muted-foreground">
                        The model will analyze your dataset's structure—identifying numeric and categorical variables—to provide tailored recommendations.
                    </p>
                    <div className="flex justify-center gap-4 pt-2">
                        <Button size="lg" onClick={() => document.getElementById('recommend-upload-input')?.click()}>
                            <FileUp className="mr-2 h-5 w-5" />
                            Upload Data
                        </Button>
                         <input
                            id="recommend-upload-input"
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files && onFileSelected(e.target.files[0])}
                            accept=".csv,.txt,.tsv,.xlsx,.xls,.json"
                         />
                        <Button size="lg" variant="outline" onClick={onLoadExample}>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Use Sample
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function RecommendationPage({ data, allHeaders, onLoadExample, onFileSelected, isUploading }: RecommendationPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<any[] | null>(null);
    const [recommendations, setRecommendations] = useState<any[] | null>(null);
    const [dataDescription, setDataDescription] = useState('');

    const hasData = useMemo(() => data && data.length > 0, [data]);

    const handleAnalysis = useCallback(async () => {
        if (!hasData) {
            toast({
                title: "No Data",
                description: "Please upload a dataset first.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        setSummary(null);
        setRecommendations(null);

        try {
            const response = await fetch('/api/analysis/data-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, headers: allHeaders, dataDescription }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to analyze data');
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setSummary(result.summary);
            setRecommendations(result.recommendations);
            toast({ title: "Analysis Complete", description: "Data summary and recommendations are ready." });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, hasData, allHeaders, dataDescription, toast]);

    if (!hasData) {
        const example = exampleDatasets[0];
        return <IntroPage onFileSelected={onFileSelected} onLoadExample={() => onLoadExample(example)} isUploading={isUploading} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Analysis Recommendation</CardTitle>
                    <CardDescription>
                        Provide a brief description of your data (optional) for more accurate recommendations, then click "Analyze Data".
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="data-description" className="text-base font-semibold">
                                What is this data about? (Optional)
                            </Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                e.g., "This is customer satisfaction data from a post-purchase survey."
                            </p>
                            <Textarea
                                id="data-description"
                                placeholder="Describe your data here..."
                                value={dataDescription}
                                onChange={(e) => setDataDescription(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Analyzing...</> : <><Wand2 className="mr-2" />Analyze Data</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && (
                <Card>
                    <CardContent className="p-6 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="mt-4 text-muted-foreground">Summarizing data and generating recommendations...</p>
                    </CardContent>
                </Card>
            )}

            {summary && (
                <Collapsible>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Data Summary</CardTitle>
                                <CardDescription>A brief overview of your dataset's columns.</CardDescription>
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <ChevronsUpDown className="h-4 w-4" />
                                    <span className="sr-only">Toggle</span>
                                </Button>
                            </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent>
                                <ScrollArea className="max-h-[400px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Variable</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Missing</TableHead>
                                                <TableHead>Unique</TableHead>
                                                <TableHead>Mean</TableHead>
                                                <TableHead>Std Dev</TableHead>
                                                <TableHead>Min</TableHead>
                                                <TableHead>Max</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {summary.map((col, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{col.name}</TableCell>
                                                    <TableCell>{col.type}</TableCell>
                                                    <TableCell>{col.missing_count}</TableCell>
                                                    <TableCell>{col.unique_count}</TableCell>
                                                    <TableCell>{col.mean?.toFixed(2) ?? '-'}</TableCell>
                                                    <TableCell>{col.std?.toFixed(2) ?? '-'}</TableCell>
                                                    <TableCell>{col.min ?? '-'}</TableCell>
                                                    <TableCell>{col.max ?? '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            )}

            {recommendations && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot />AI-Powered Analysis Recommendations</CardTitle>
                        <CardDescription>Based on your data, here are some suggested analyses to perform.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommendations.map((rec, index) => (
                            <Card key={index} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg">{rec.analysis_name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                </CardContent>
                                <CardFooter>
                                    <p className="text-xs text-muted-foreground">
                                        <strong>Example Variables:</strong> {rec.required_variables.join(', ')}
                                    </p>
                                </CardFooter>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, AlertTriangle, Loader2, ShieldCheck, Settings2, Bot, CheckCircle2, FileSearch, MoveRight, HelpCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Type definitions for the rich Reliability results
interface ReliabilityResults {
    alpha: number;
    n_items: number;
    n_cases: number;
    confidence_interval: [number, number];
    sem: number;
    item_statistics: {
        means: { [key: string]: number };
        stds: { [key: string]: number };
        corrected_item_total_correlations: { [key: string]: number };
        alpha_if_deleted: { [key: string]: number };
    };
    scale_statistics: {
        mean: number;
        std: number;
        variance: number;
        avg_inter_item_correlation: number;
    };
    interpretation: string;
}

interface FullAnalysisResponse {
    results: ReliabilityResults;
}

const getAlphaInterpretationLevel = (alpha: number): { level: 'Excellent' | 'Good' | 'Acceptable' | 'Questionable' | 'Poor' | 'Unacceptable', color: string } => {
    if (alpha >= 0.9) return { level: 'Excellent', color: 'bg-green-600' };
    if (alpha >= 0.8) return { level: 'Good', color: 'bg-green-500' };
    if (alpha >= 0.7) return { level: 'Acceptable', color: 'bg-yellow-500' };
    if (alpha >= 0.6) return { level: 'Questionable', color: 'bg-orange-500' };
    if (alpha >= 0.5) return { level: 'Poor', color: 'bg-red-500' };
    return { level: 'Unacceptable', color: 'bg-red-600' };
};


const InterpretationDisplay = ({ interpretation, alpha }: { interpretation?: string, alpha?: number }) => {
    if (!interpretation) return null;
    
    const isAcceptable = alpha !== undefined && alpha >= 0.7;

    const formattedInterpretation = useMemo(() => {
        if (!interpretation) return null;
        return interpretation
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/α\s*=\s*(\.\d+)/g, '<i>α</i> = $1');

    }, [interpretation]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Bot /> Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant={isAcceptable ? 'default' : 'destructive'}>
                    {isAcceptable ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{isAcceptable ? "Acceptable to Excellent Reliability" : "Poor to Unacceptable Reliability"}</AlertTitle>
                    {formattedInterpretation && <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation }} />}
                </Alert>
            </CardContent>
        </Card>
    );
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const reliabilityExample = exampleDatasets.find(d => d.id === 'well-being-survey');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <ShieldCheck size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Reliability Analysis (Cronbach's Alpha)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Measure the internal consistency and reliability of a set of scale items.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Reliability Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            When using a survey or questionnaire with multiple questions to measure a single underlying concept (like 'job satisfaction' or 'anxiety'), it's crucial to know if those questions are consistently measuring the same thing. Cronbach's Alpha is the most common measure of this internal consistency. A high alpha value indicates that your scale items are reliable and hang together well.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {reliabilityExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(reliabilityExample)}>
                                <ShieldCheck className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{reliabilityExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{reliabilityExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings2 className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Select Items:</strong> Choose all the numeric columns that belong to the scale you want to test.
                                </li>
                                <li>
                                    <strong>Reverse-Code (Optional):</strong> If your scale includes negatively worded items (e.g., "I am *not* satisfied"), select them to be reverse-coded so they are scored in the same direction as other items.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will calculate Cronbach's Alpha and provide item-level statistics to help you assess and improve your scale.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Cronbach's Alpha (α):</strong> Ranges from 0 to 1. General guidelines: α ≥ 0.9 (Excellent), ≥ 0.8 (Good), ≥ 0.7 (Acceptable), ≥ 0.6 (Questionable), ≥ 0.5 (Poor), &lt; 0.5 (Unacceptable).</li>
                                <li><strong>Corrected Item-Total Correlation:</strong> Shows how well each item correlates with the total score of the other items. Low values (e.g., &lt; 0.3) suggest an item may not belong to the scale.</li>
                                <li><strong>Alpha if Item Deleted:</strong> This crucial metric shows what the scale's alpha would be if you removed a specific item. If removing an item significantly increases the alpha, that item may be problematic and worth dropping.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface ReliabilityPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ReliabilityPage({ data, numericHeaders, onLoadExample }: ReliabilityPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders.slice(0, 10));
    const [reverseCodeItems, setReverseCodeItems] = useState<string[]>([]);
    
    const [reliabilityResult, setReliabilityResult] = useState<ReliabilityResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      setSelectedItems(numericHeaders.slice(0, 10));
      setReverseCodeItems([]);
      setReliabilityResult(null);
      setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders])

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length >= 2;
    }, [data, numericHeaders]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => 
          checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleReverseCodeSelectionChange = (header: string, checked: boolean) => {
        setReverseCodeItems(prev => 
          checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({variant: 'destructive', title: 'Selection Error', description: 'Please select at least two items for the analysis.'});
            return;
        };
        
        setIsLoading(true);
        setReliabilityResult(null);

        const backendUrl = '/api/analysis/reliability';
        
        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data,
                    items: selectedItems,
                    reverseCodeItems: reverseCodeItems,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            setReliabilityResult(result);
            toast({ title: 'Analysis Complete', description: "Cronbach's Alpha has been calculated." });
            
        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Reliability Analysis Error', description: e.message || 'An unexpected error occurred. Please check the console for details.'})
            setReliabilityResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, reverseCodeItems, toast]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const alphaInterpretation = reliabilityResult ? getAlphaInterpretationLevel(reliabilityResult.alpha) : null;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Reliability Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select the numeric items that form a single scale to calculate internal consistency reliability (Cronbach's Alpha).
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Label>Select Items for Analysis</Label>
                    <ScrollArea className="h-48 border rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {numericHeaders.map(header => (
                          <div key={header} className="flex items-center space-x-2">
                            <Checkbox
                              id={`rel-${header}`}
                              checked={selectedItems.includes(header)}
                              onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                            />
                            <label htmlFor={`rel-${header}`} className="text-sm font-medium leading-none">
                              {header}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="flex items-center justify-end gap-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline"><Settings2 className="mr-2"/>Reverse-Code Items</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Reverse-Coding</h4>
                                        <p className="text-sm text-muted-foreground">Select items that are negatively worded. Their values will be inverted before analysis.</p>
                                    </div>
                                    <ScrollArea className="h-48">
                                        <div className="grid gap-2 p-1">
                                            {selectedItems.map(header => (
                                            <div key={`rev-${header}`} className="flex items-center space-x-2">
                                                <Checkbox
                                                id={`rev-${header}`}
                                                checked={reverseCodeItems.includes(header)}
                                                onCheckedChange={(checked) => handleReverseCodeSelectionChange(header, checked as boolean)}
                                                />
                                                <label htmlFor={`rev-${header}`} className="text-sm font-medium leading-none">
                                                {header}
                                                </label>
                                            </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button onClick={handleAnalysis} className="w-full md:w-auto" disabled={selectedItems.length < 2 || isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && (
                 <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Performing reliability analysis...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {reliabilityResult ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Reliability Summary (Cronbach's Alpha)</CardTitle>
                                <CardDescription>
                                    A measure of internal consistency for a set of scale items.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
                                    <div className="text-center">
                                        <div className="text-6xl font-bold font-mono tracking-tighter">{reliabilityResult.alpha.toFixed(3)}</div>
                                        {alphaInterpretation && <div className={`mt-2 font-semibold text-lg text-white px-3 py-1 rounded-full ${alphaInterpretation.color}`}>{alphaInterpretation.level}</div>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="font-medium text-muted-foreground">Number of Items:</div>
                                    <div className="text-right font-mono">{reliabilityResult.n_items}</div>
                                    <div className="font-medium text-muted-foreground">Number of Cases:</div>
                                    <div className="text-right font-mono">{reliabilityResult.n_cases}</div>
                                    <div className="font-medium text-muted-foreground">Avg. Inter-Item Correlation:</div>
                                    <div className="text-right font-mono">{reliabilityResult.scale_statistics.avg_inter_item_correlation.toFixed(3)}</div>
                                </div>
                            </CardContent>
                        </Card>
                         <InterpretationDisplay interpretation={reliabilityResult.interpretation} alpha={reliabilityResult.alpha} />
                    </div>
                    <Card className="lg:col-span-1">
                        <CardHeader><CardTitle className="font-headline">Item-Total Statistics</CardTitle><CardDescription>How each item relates to the overall scale.</CardDescription></CardHeader>
                        <CardContent>
                             <ScrollArea className="h-[450px]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Corrected Item-Total Corr.</TableHead>
                                            <TableHead className="text-right">Alpha if Deleted</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.keys(reliabilityResult.item_statistics.means).map((item) => {
                                            const citc = reliabilityResult.item_statistics.corrected_item_total_correlations[item];
                                            const aid = reliabilityResult.item_statistics.alpha_if_deleted[item];
                                            return (
                                            <TableRow key={item}>
                                                <TableCell className="font-medium">{item}</TableCell>
                                                <TableCell className={`text-right font-mono ${citc < 0.3 ? 'text-destructive' : ''}`}>{citc.toFixed(3)}</TableCell>
                                                <TableCell className={`text-right font-mono ${aid > reliabilityResult.alpha ? 'text-green-600' : ''}`}>{aid.toFixed(3)}</TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <p>Select items and click 'Run Analysis' to see the reliability results.</p>
                </div>
            )}
        </div>
    );
}

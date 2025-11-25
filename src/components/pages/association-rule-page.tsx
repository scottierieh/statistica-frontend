
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Link2, HelpCircle, MoveRight, Settings, FileSearch, ShoppingCart, AlertTriangle, CheckCircle, BookOpen, GitMerge, Layers, Target, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '../ui/tabs';

interface Rule {
    antecedents: string[];
    consequents: string[];
    support: number;
    confidence: number;
    lift: number;
    leverage: number;
    conviction: number;
}

interface Itemset {
    support: number;
    itemsets: string[];
}

interface Interpretation {
    summary: {
        total_rules: number;
        total_itemsets: number;
        avg_confidence: number;
        avg_lift: number;
        max_lift: number;
    };
    top_rules: {
        rule: string;
        lift: number;
        confidence: number;
        support: number;
        interpretation: string;
    }[];
    key_insights: {
        title: string;
        description: string;
    }[];
}

interface AnalysisResults {
    frequent_itemsets: Itemset[];
    association_rules: Rule[];
    scatter_plot: string | null;
    interpretation: Interpretation;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const marketBasketExample = exampleDatasets.find(d => d.id === 'market-basket-100');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShoppingCart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Association Rule Mining</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Discover "if-then" relationships in your data, famously used for Market Basket Analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitMerge className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Co-occurrence</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find items that frequently appear together
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Actionable Rules</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Generate rules like "If A, then B" for strategic decisions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Key Metrics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Evaluate rules with Support, Confidence, and Lift
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Association Rules
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Association Rule Mining is ideal for discovering relationships hidden in large datasets. 
                            Its most common application is Market Basket Analysis, which helps retailers understand 
                            customer purchasing habits. This analysis can drive decisions on product placement, 
                            promotions, and recommendation engines.
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
                                        <span><strong>Data format:</strong> Transactional (one-hot encoded)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Item columns:</strong> Binary (1/0 or True/False)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Parameters:</strong> Set support and confidence thresholds</span>
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
                                        <span><strong>Support:</strong> Frequency of an itemset in the data</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Confidence:</strong> Likelihood of {`{B}`} given {`{A}`}, P(B|A)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Lift:</strong> Increase in likelihood of {`{B}`} given {`{A}`}. Lift > 1 suggests a strong rule</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {marketBasketExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(marketBasketExample)} size="lg">
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Load 100 Transactions Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface AssociationRulePageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function AssociationRulePage({ data, allHeaders, onLoadExample }: AssociationRulePageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [itemCols, setItemCols] = useState<string[]>([]);
    const [minSupport, setMinSupport] = useState(0.01);
    const [metric, setMetric] = useState('confidence');
    const [minThreshold, setMinThreshold] = useState(0.5);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    useEffect(() => {
        setItemCols(allHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, canRun]);
    
    const handleItemColChange = (header: string, checked: boolean) => {
        setItemCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (itemCols.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two item columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/association-rule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, item_cols: itemCols, min_support: minSupport, metric, min_threshold: minThreshold })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({title: 'Analysis Complete', description: `${result.association_rules.length} rules found.`})

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, itemCols, minSupport, metric, minThreshold, toast]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Association Rule Mining Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Item Columns</Label>
                        <p className="text-sm text-muted-foreground mb-2">Select columns representing items (1 for purchased, 0 otherwise).</p>
                        <ScrollArea className="h-40 border rounded-md p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {allHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`itemcol-${h}`}
                                            checked={itemCols.includes(h)}
                                            onCheckedChange={(c) => handleItemColChange(h, c as boolean)}
                                        />
                                        <label htmlFor={`itemcol-${h}`} className="text-sm font-medium leading-none">{h}</label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                     <div className="grid md:grid-cols-3 gap-4">
                        <div><Label>Min Support</Label><Input type="number" value={minSupport} onChange={e => setMinSupport(parseFloat(e.target.value))} step="0.01" min="0.001" /></div>
                        <div><Label>Metric</Label><Select value={metric} onValueChange={setMetric}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="confidence">Confidence</SelectItem><SelectItem value="lift">Lift</SelectItem></SelectContent></Select></div>
                        <div><Label>Min Threshold</Label><Input type="number" value={minThreshold} onChange={e => setMinThreshold(parseFloat(e.target.value))} step="0.1" min="0" /></div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}><Sigma className="mr-2"/>Run Analysis</Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></CardContent></Card>}

            {results && (
                <Tabs defaultValue="rules" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="rules">Association Rules</TabsTrigger>
                        <TabsTrigger value="itemsets">Frequent Itemsets</TabsTrigger>
                        <TabsTrigger value="graph">Rule Scatter Plot</TabsTrigger>
                        <TabsTrigger value="interpretation">Interpretation</TabsTrigger>
                    </TabsList>
                    <TabsContent value="rules" className="mt-4">
                         <Card>
                            <CardHeader>
                                <CardTitle>Association Rules</CardTitle>
                                <CardDescription>Rules sorted by Lift and Confidence.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Antecedents (If)</TableHead>
                                                <TableHead>Consequents (Then)</TableHead>
                                                <TableHead className="text-right">Support</TableHead>
                                                <TableHead className="text-right">Confidence</TableHead>
                                                <TableHead className="text-right">Lift</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.association_rules.map((rule, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><div className="flex gap-1 flex-wrap">{rule.antecedents.map(item => <Badge key={item} variant="outline">{item}</Badge>)}</div></TableCell>
                                                    <TableCell><div className="flex gap-1 flex-wrap">{rule.consequents.map(item => <Badge key={item}>{item}</Badge>)}</div></TableCell>
                                                    <TableCell className="text-right font-mono">{rule.support.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{rule.confidence.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{rule.lift.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="itemsets" className="mt-4">
                         <Card>
                            <CardHeader>
                                <CardTitle>Frequent Itemsets</CardTitle>
                                <CardDescription>Itemsets that appear more frequently than the minimum support threshold.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <ScrollArea className="h-[500px]">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Itemset</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {results.frequent_itemsets.map((itemset, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><div className="flex gap-1 flex-wrap">{itemset.itemsets.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}</div></TableCell>
                                                    <TableCell className="text-right font-mono">{itemset.support.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="graph" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Rule Scatter Plot</CardTitle>
                                <CardDescription>Each point is a rule, showing Support vs. Confidence. Size and color indicate Lift.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {results.scatter_plot ? (
                                    <Image src={`data:image/png;base64,${results.scatter_plot}`} alt="Association Rules Scatter Plot" width={1000} height={600} className="w-full rounded-md border" />
                                ) : (
                                    <p>Could not generate scatter plot.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="interpretation" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle>AI-Powered Interpretation</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <Alert>
                                    <AlertTitle>Summary</AlertTitle>
                                    <AlertDescription>
                                        Found {results.interpretation.summary.total_rules} rules from {results.interpretation.summary.total_itemsets} frequent itemsets. 
                                        The average confidence is {(results.interpretation.summary.avg_confidence * 100).toFixed(1)}% and the average lift is {results.interpretation.summary.avg_lift.toFixed(2)}.
                                    </AlertDescription>
                                </Alert>
                                <h4 className="font-semibold">Top Rules by Lift</h4>
                                {results.interpretation.top_rules.map((rule, i) => (
                                    <Card key={i} className="bg-muted/50 p-4">
                                        <p className="font-mono text-sm mb-2">{rule.rule}</p>
                                        <p className="text-xs text-muted-foreground">{rule.interpretation}</p>
                                    </Card>
                                ))}
                                <h4 className="font-semibold">Key Insights</h4>
                                {results.interpretation.key_insights.map((insight, i) => (
                                     <Alert key={i}>
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertTitle>{insight.title}</AlertTitle>
                                        <AlertDescription>{insight.description}</AlertDescription>
                                    </Alert>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}


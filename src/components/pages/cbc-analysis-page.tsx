
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CbcResults {
    part_worths: { [key: string]: { [key: string]: number } };
    attribute_importance: { [key: string]: number };
    model_fit: {
        llf: number;
        llnull: number;
        pseudo_r2: number;
    };
}

interface FullAnalysisResponse {
    results: CbcResults;
}

interface CbcPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CbcAnalysisPage({ data, allHeaders, onLoadExample }: CbcPageProps) {
    const { toast } = useToast();
    const [respondentIdCol, setRespondentIdCol] = useState<string | undefined>();
    const [altIdCol, setAltIdCol] = useState<string | undefined>();
    const [choiceCol, setChoiceCol] = useState<string | undefined>();
    const [attributeCols, setAttributeCols] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 4, [data, allHeaders]);

    useEffect(() => {
        setRespondentIdCol(allHeaders.find(h => h.toLowerCase().includes('resp')));
        setAltIdCol(allHeaders.find(h => h.toLowerCase().includes('alt')));
        setChoiceCol(allHeaders.find(h => h.toLowerCase().includes('choice')));
        const initialAttributes = allHeaders.filter(h => !['resp.id', 'alt', 'choice'].includes(h.toLowerCase()));
        setAttributeCols(initialAttributes);
        setAnalysisResult(null);
    }, [data, allHeaders]);

    const handleAttributeChange = (header: string, checked: boolean) => {
        setAttributeCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!respondentIdCol || !altIdCol || !choiceCol || attributeCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/cbc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    respondent_id: respondentIdCol,
                    alt_id: altIdCol,
                    choice_col: choiceCol,
                    attribute_cols: attributeCols
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'CBC Analysis Complete', description: 'Part-worths and importance have been calculated.' });

        } catch (e: any) {
            console.error('CBC error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, respondentIdCol, altIdCol, choiceCol, attributeCols, toast]);
    
    const availableAttributeCols = useMemo(() => {
        return allHeaders.filter(h => ![respondentIdCol, altIdCol, choiceCol].includes(h));
    }, [allHeaders, respondentIdCol, altIdCol, choiceCol]);

    if (!canRun) {
        const cbcExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('cbc'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Choice-Based Conjoint (CBC) Analysis</CardTitle>
                        <CardDescription>
                           To perform CBC, you need choice data with respondent and alternative IDs, a choice indicator, and product attributes.
                        </CardDescription>
                    </CardHeader>
                    {cbcExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(cbcExamples[0])} className="w-full" size="sm">
                                <Network className="mr-2 h-4 w-4" />
                                Load {cbcExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }

    const results = analysisResult?.results;

    const importanceData = results ? Object.entries(results.attribute_importance).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value) : [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">CBC Analysis Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div><Label>Respondent ID</Label><Select value={respondentIdCol} onValueChange={setRespondentIdCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Alternative ID</Label><Select value={altIdCol} onValueChange={setAltIdCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Choice Indicator</Label><Select value={choiceCol} onValueChange={setChoiceCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                     <div>
                        <Label>Attribute Columns</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            {availableAttributeCols.map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                    <Checkbox id={`attr-${h}`} checked={attributeCols.includes(h)} onCheckedChange={(c) => handleAttributeChange(h, c as boolean)} />
                                    <Label htmlFor={`attr-${h}`}>{h}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                     <Button onClick={handleAnalysis} disabled={isLoading || attributeCols.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="grid lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle>Attribute Importance</CardTitle></CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="w-full h-[300px]">
                                <ResponsiveContainer>
                                    <BarChart data={importanceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="name" width={80}/>
                                        <Tooltip content={<ChartTooltipContent />}/>
                                        <Bar dataKey="value" name="Importance" fill="hsl(var(--primary))" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Model Fit</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Log-Likelihood</p><p className="text-2xl font-bold">{results.model_fit.llf.toFixed(2)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Pseudo R²</p><p className="text-2xl font-bold">{results.model_fit.pseudo_r2.toFixed(4)}</p></div>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>Part-Worth Utilities</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Attribute</TableHead>
                                        <TableHead>Level</TableHead>
                                        <TableHead className="text-right">Part-Worth</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.part_worths).flatMap(([attribute, levels]) => 
                                        Object.entries(levels).map(([level, value], index) => (
                                            <TableRow key={`${attribute}-${level}`}>
                                                {index === 0 && <TableCell rowSpan={Object.keys(levels).length} className="font-semibold align-top">{attribute}</TableCell>}
                                                <TableCell>{level}</TableCell>
                                                <TableCell className="font-mono text-right">{value.toFixed(4)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

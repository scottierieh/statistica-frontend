

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, Network } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';

interface AnalysisResults {
    regression: {
        rSquared: number;
        adjustedRSquared: number;
        rmse: number;
        mae: number;
    };
    partWorths: {
        attribute: string;
        level: string;
        value: number;
    }[];
    importance: {
        attribute: string;
        importance: number;
    }[];
}

interface ConjointAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: any) => void;
}

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = ['Data & Target', 'Attributes', 'Results'];
    return (
        <div className="flex justify-center items-center gap-4 mb-8">
            {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep > index ? 'bg-primary text-primary-foreground' : currentStep === index ? 'bg-primary/80 text-primary-foreground' : 'bg-muted'}`}>
                        {index + 1}
                    </div>
                    <span className={`${currentStep >= index ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
                    {index < steps.length - 1 && <div className="w-12 h-0.5 bg-border" />}
                </div>
            ))}
        </div>
    );
};

export default function ConjointAnalysisPage({ data, allHeaders, onLoadExample }: ConjointAnalysisPageProps) {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetVariable, setTargetVariable] = useState<string | undefined>();
    const [attributes, setAttributes] = useState<any>({});
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);

    useEffect(() => {
        if (!canRun) return;
        const initialTarget = allHeaders.find(h => h.toLowerCase().includes('rating') || h.toLowerCase().includes('score') || h.toLowerCase().includes('preference')) || allHeaders[allHeaders.length - 1];
        setTargetVariable(initialTarget);

        const initialAttributes: any = {};
        allHeaders.forEach(header => {
            const values = Array.from(new Set(data.map(row => row[header])));
            const isNumeric = values.every(v => typeof v === 'number' || !isNaN(Number(v)));
            initialAttributes[header] = {
                name: header,
                type: isNumeric && values.length > 5 ? 'numerical' : 'categorical',
                levels: values,
                includeInAnalysis: !header.toLowerCase().includes('id') && header !== initialTarget
            };
        });
        setAttributes(initialAttributes);
        setCurrentStep(0);
        setAnalysisResult(null);
    }, [data, allHeaders, canRun]);

    const handleAttributeUpdate = (attrName: string, key: string, value: any) => {
        setAttributes((prev: any) => ({
            ...prev,
            [attrName]: { ...prev[attrName], [key]: value }
        }));
        if(key === 'includeInAnalysis' && value === true && targetVariable === attrName) {
            setTargetVariable(undefined);
        }
        if(key === 'includeInAnalysis' && value === false && targetVariable === attrName) {
            // No need to do anything, it will be excluded anyway.
        }
    };
    
    const handleTargetVarChange = (value: string) => {
        setTargetVariable(value);
        // Ensure the new target is not included as an independent attribute
        if (attributes[value]) {
            handleAttributeUpdate(value, 'includeInAnalysis', false);
        }
        // Re-enable the old target var as a potential attribute if it exists
        if(targetVariable && attributes[targetVariable]) {
            handleAttributeUpdate(targetVariable, 'includeInAnalysis', true);
        }
    }

    const runAnalysis = useCallback(async () => {
        if (!targetVariable) {
            toast({ title: 'Target variable not set', description: 'Please select a target variable to continue.', variant: 'destructive' });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/analysis/conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, attributes, targetVariable })
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            setCurrentStep(2);
            toast({ title: 'Analysis Complete', description: 'Conjoint analysis results are ready.' });
        } catch (error: any) {
            toast({ title: 'Analysis Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [data, attributes, targetVariable, toast]);

    if (!canRun) {
        const conjointExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('conjoint'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Conjoint Analysis</CardTitle>
                        <CardDescription>
                           To perform this analysis, you need data with attributes and a preference/rating column. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {conjointExamples.map((ex) => {
                                const Icon = ex.icon || Network;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-6 w-6 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                            Load this data
                                        </Button>
                                    </CardFooter>
                                </Card>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const independentVariables = Object.values(attributes).filter((attr: any) => attr.includeInAnalysis);
    
    const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F"];

    return (
        <div className="space-y-4">
            <StepIndicator currentStep={currentStep} />
            
            {currentStep === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Target /> Step 1: Select Target Variable</CardTitle>
                        <CardDescription>Choose the column that represents the user's rating or preference.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label>Target Variable (e.g., Rating, Score)</Label>
                        <Select value={targetVariable} onValueChange={handleTargetVarChange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </CardContent>
                    <CardContent className="flex justify-end">
                        <Button onClick={() => setCurrentStep(1)} disabled={!targetVariable}>Next: Configure Attributes</Button>
                    </CardContent>
                </Card>
            )}

            {currentStep === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings /> Step 2: Configure Attributes</CardTitle>
                        <CardDescription>Review auto-detected attributes and types. Ensure correct variables are included for analysis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-72">
                            <div className="space-y-4">
                                {Object.values(attributes).map((attr: any) => (
                                    <div key={attr.name} className="p-3 border rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">{attr.name}</span>
                                            {attr.name !== targetVariable && (
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id={`include-${attr.name}`} checked={attr.includeInAnalysis} onCheckedChange={(c) => handleAttributeUpdate(attr.name, 'includeInAnalysis', c)} />
                                                    <Label htmlFor={`include-${attr.name}`}>Include</Label>
                                                </div>
                                            )}
                                        </div>
                                         <p className="text-xs text-muted-foreground">{attr.levels.length} levels detected.</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardContent className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(0)}>Back</Button>
                        <Button onClick={runAnalysis} disabled={isLoading || independentVariables.length < 1}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sigma className="mr-2" />}
                            Run Analysis
                        </Button>
                    </CardContent>
                </Card>
            )}

            {currentStep === 2 && analysisResult && (
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Brain/> Step 3: Analysis Results</CardTitle>
                            <CardDescription>Review the calculated part-worths and attribute importance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <h3 className="font-bold text-lg mb-2">Model Performance</h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R²</p><p className="text-2xl font-bold">{analysisResult.regression.rSquared.toFixed(3)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Adjusted R²</p><p className="text-2xl font-bold">{analysisResult.regression.adjustedRSquared.toFixed(3)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">RMSE</p><p className="text-2xl font-bold">{analysisResult.regression.rmse.toFixed(3)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">MAE</p><p className="text-2xl font-bold">{analysisResult.regression.mae.toFixed(3)}</p></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><PieIcon/>Relative Importance of Attributes</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={analysisResult.importance} dataKey="importance" nameKey="attribute" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={p => `${p.attribute} (${p.importance.toFixed(1)}%)`}>
                                        {analysisResult.importance.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><BarIcon/>Part-Worth Utilities</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={analysisResult.partWorths.filter(p => p.level !== 'coefficient')} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="level" type="category" width={100} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" name="Part-Worth">
                                        {analysisResult.partWorths.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-5))'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between">
                         <Button variant="outline" onClick={() => setCurrentStep(1)}>Back to Configuration</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

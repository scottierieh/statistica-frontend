
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Network, HelpCircle, MoveRight, Settings, FileSearch, BarChart, Bot } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';


const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const semExample = exampleDatasets.find(d => d.id === 'sem-satisfaction');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Structural Equation Modeling (SEM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Test complex theoretical models by examining relationships between observed and latent variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use SEM?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            SEM is a powerful multivariate statistical analysis technique that combines factor analysis and multiple regression. It allows researchers to test a set of relationships between one or more independent variables, either continuous or discrete, and one or more dependent variables. It's ideal for testing complex causal models and confirming theoretical structures.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {semExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(semExample)}>
                                <semExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{semExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{semExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Define Model:</strong> Use the text editor to specify your model using syntax. Define latent variables with the `=~` operator (e.g., `Satisfaction =~ sat1 + sat2 + sat3`). Define structural paths with the `~` operator (e.g., `Loyalty ~ Satisfaction`).
                                </li>
                                <li><strong>Upload Data:</strong> Provide a dataset containing all the observed variables (e.g., `sat1`, `sat2`) used in your model.</li>
                                <li><strong>Run Analysis:</strong> The tool will estimate the model parameters and provide fit indices to assess how well your theoretical model fits the observed data.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Model Fit Indices:</strong> Check values like CFI, TLI, RMSEA, and SRMR to assess model fit. Good fit is generally indicated by CFI/TLI > .90, RMSEA < .08, and SRMR < .08.</li>
                                <li><strong>Path Coefficients:</strong> These are like regression coefficients. A significant p-value indicates a meaningful relationship between variables in your model.</li>
                                <li><strong>Factor Loadings:</strong> In the measurement part, these show how well the observed variables represent the latent construct.</li>
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


interface SemPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: any) => void;
}

export default function SemPage({ data, allHeaders, onLoadExample }: SemPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [modelSyntax, setModelSyntax] = useState('Quality =~ sq1 + sq2 + sq3\nSatisfaction =~ sat1 + sat2 + sat3\nTrust =~ trust1 + trust2\nLoyalty =~ loy1 + loy2 + loy3\n\nSatisfaction ~ Quality\nTrust ~ Quality + Satisfaction\nLoyalty ~ Trust + Satisfaction');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 0, [data, allHeaders]);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const measurement_model: { [key: string]: string[] } = {};
            const structural_model: string[][] = [];
            
            modelSyntax.split('\n').forEach(line => {
                line = line.trim();
                if (line.includes('=~')) {
                    const [latent, indicators] = line.split('=~').map(s => s.trim());
                    measurement_model[latent] = indicators.split('+').map(s => s.trim());
                } else if (line.includes('~')) {
                    const [outcome, predictors] = line.split('~').map(s => s.trim());
                    predictors.split('+').forEach(pred => {
                        structural_model.push([pred.trim(), outcome]);
                    });
                }
            });

            if (Object.keys(measurement_model).length === 0) {
                throw new Error("Invalid model syntax. Please define at least one latent variable using '=~'.");
            }
            
            const response = await fetch('/api/analysis/sem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, modelSpec: { measurement_model, structural_model } })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('SEM error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [data, modelSyntax, toast]);
    
    useEffect(() => {
        setView(canRun ? 'main' : 'intro');
    }, [canRun]);
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">SEM Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Define your model using lavaan-style syntax and ensure all observed variables are in your dataset.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Label htmlFor="model-syntax">Model Syntax</Label>
                    <Textarea 
                        id="model-syntax"
                        value={modelSyntax}
                        onChange={(e) => setModelSyntax(e.target.value)}
                        rows={10}
                        className="font-mono"
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                         {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full" />}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Model Visualization & Fit</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="SEM Results" width={1500} height={700} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader><CardTitle>Effects</CardTitle></CardHeader>
                         <CardContent>
                            <Tabs defaultValue="direct">
                                <TabsList><TabsTrigger value="direct">Direct</TabsTrigger><TabsTrigger value="indirect">Indirect</TabsTrigger><TabsTrigger value="total">Total</TabsTrigger></TabsList>
                                <TabsContent value="direct">{renderEffectsTable(results.effects.direct_effects)}</TabsContent>
                                <TabsContent value="indirect">{renderEffectsTable(results.effects.indirect_effects)}</TabsContent>
                                <TabsContent value="total">{renderEffectsTable(results.effects.total_effects)}</TabsContent>
                            </Tabs>
                         </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

const renderEffectsTable = (effects: any) => {
    if (!effects || Object.keys(effects).length === 0) return <p>No effects to display.</p>;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    {effects[Object.keys(effects)[0]].se !== undefined && <TableHead className="text-right">Std. Error</TableHead>}
                    {effects[Object.keys(effects)[0]].z_value !== undefined && <TableHead className="text-right">Z-value</TableHead>}
                    {effects[Object.keys(effects)[0]].p_value !== undefined && <TableHead className="text-right">P-value</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(effects).map(([path, values]: [string, any]) => (
                    <TableRow key={path}>
                        <TableCell>{path}</TableCell>
                        <TableCell className="text-right font-mono">{values.estimate.toFixed(4)}</TableCell>
                        {values.se !== undefined && <TableCell className="text-right font-mono">{values.se.toFixed(4)}</TableCell>}
                        {values.z_value !== undefined && <TableCell className="text-right font-mono">{values.z_value.toFixed(3)}</TableCell>}
                        {values.p_value !== undefined && <TableCell className="text-right font-mono">{values.p_value < 0.001 ? '<.001' : values.p_value.toFixed(4)}</TableCell>}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

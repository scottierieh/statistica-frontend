
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Bot, FileUp, Sparkles, AlertCircle, HelpCircle, Info, Lightbulb, TrendingUp, Layers, Users, ArrowLeftRight, Target, Timer } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { analysisGoals } from '@/lib/analysis-goals';
import DataUploader from '../data-uploader';

interface RecommendationPageProps {
  onFileSelected: (file: File) => void;
  onLoadExample: (example: ExampleDataSet) => void;
  isUploading: boolean;
  data: DataSet;
  allHeaders: string[];
}

const IntroPage = ({ onFileSelected, onLoadExample, isUploading }: { onFileSelected: (file: File) => void; onLoadExample: (example: ExampleDataSet) => void; isUploading: boolean }) => {
    const irisExample = exampleDatasets.find(ex => ex.id === 'iris');

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Wand2 className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">AI Analysis Recommendation</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Don't know which analysis to run? Let our AI suggest the best methods for your data and research questions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6 items-start">
                        <Card className="hover:border-primary/50 hover:shadow-lg transition-all">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><FileUp className="w-5 h-5"/>From Data</CardTitle>
                                <CardDescription>Upload your dataset and get recommendations based on its structure.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                                {irisExample && (
                                    <Button size="sm" variant="outline" onClick={() => onLoadExample(irisExample)} className="w-full mt-2">
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Use Sample Data
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="hover:border-primary/50 hover:shadow-lg transition-all">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5"/>From Goal</CardTitle>
                                <CardDescription>Describe your research goal and get suitable analysis suggestions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Textarea placeholder="e.g., 'I want to see if there's a difference in test scores between two groups.'" className="mb-2"/>
                                <Button className="w-full">Get Recommendations</Button>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


export default function RecommendationPage(props: RecommendationPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<any[] | null>(null);
    const [recommendations, setRecommendations] = useState<any[] | null>(null);
    const [dataDescription, setDataDescription] = useState('');
    const [analysisGoal, setAnalysisGoal] = useState('');
    const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
    const [selectedVars, setSelectedVars] = useState<Set<string>>(new Set(props.allHeaders));
    
    useEffect(() => {
        if (props.allHeaders) {
            setSelectedVars(new Set(props.allHeaders));
        }
    }, [props.allHeaders]);

    const handleVarSelectionChange = (varName: string, isChecked: boolean) => {
        setSelectedVars(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(varName);
            } else {
                newSet.delete(varName);
            }
            return newSet;
        });
    };

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setSummary(null);
        setRecommendations(null);

        const combinedDescription = [
            dataDescription.trim() ? `About the data: ${dataDescription.trim()}` : '',
            analysisGoal.trim() ? `Analysis Goal: ${analysisGoal.trim()}` : '',
            ...Array.from(selectedGoals)
        ].filter(Boolean).join('\n');
        
        const dataForAnalysis = props.data.map(row => {
            const newRow: any = {};
            selectedVars.forEach(v => {
                newRow[v] = row[v];
            });
            return newRow;
        });

        try {
            const response = await fetch('/api/analysis/data-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: dataForAnalysis, dataDescription: combinedDescription }),
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
    }, [props.data, selectedVars, dataDescription, analysisGoal, selectedGoals, toast]);
    
    if (!props.data || props.data.length === 0) {
        return <IntroPage onFileSelected={props.onFileSelected} onLoadExample={() => props.onLoadExample(exampleDatasets.find(e => e.id === 'iris')!)} isUploading={props.isUploading} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">AI Analysis Recommendation</CardTitle>
                    <CardDescription>Tell the AI about your data and goals to get tailored analysis suggestions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="variable-selection" className="text-base font-semibold">
                            1. Select Variables for Analysis
                        </Label>
                         <div className="flex flex-wrap gap-2 mb-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedVars(new Set(props.allHeaders))}>Select All</Button>
                            <Button variant="outline" size="sm" onClick={() => setSelectedVars(new Set())}>Deselect All</Button>
                        </div>
                        <ScrollArea className="h-40 border rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {props.allHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`var-select-${h}`} 
                                            checked={selectedVars.has(h)}
                                            onCheckedChange={(checked) => handleVarSelectionChange(h, !!checked)} 
                                        />
                                        <Label htmlFor={`var-select-${h}`} className="text-sm font-medium cursor-pointer">
                                            {h}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                     <Alert className="bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800">
                        <Info className="h-4 w-4 text-sky-600" />
                        <AlertTitle className="text-sky-800 dark:text-sky-200">Describe Your Analysis Goal (Optional)</AlertTitle>
                        <AlertDescription className="text-sky-700 dark:text-sky-300">
                           Providing context helps our AI suggest more accurate analyses. If you leave this blank, recommendations will be based solely on your data's structure.
                        </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="data-description" className="font-semibold">
                                2. What is this data about?
                            </Label>
                            <Textarea
                                id="data-description"
                                placeholder="e.g., 'This is customer satisfaction data from a post-purchase survey.'"
                                value={dataDescription}
                                onChange={(e) => setDataDescription(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="analysis-goal" className="font-semibold">
                               3. What do you want to find out?
                            </Label>
                            <Textarea
                                id="analysis-goal"
                                placeholder="e.g., 'I want to see what drives satisfaction scores.' or 'Which customer group is most likely to churn?'"
                                value={analysisGoal}
                                onChange={(e) => setAnalysisGoal(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                    <div>
                         <Label className="font-semibold">4. Select Your Analysis Objectives</Label>
                         <p className="text-sm text-muted-foreground mb-3">Choose one or more general goals.</p>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {analysisGoals.map(goal => (
                                <div key={goal.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`goal-${goal.id}`} 
                                        checked={selectedGoals.has(goal.description)}
                                        onCheckedChange={(checked) => {
                                            setSelectedGoals(prev => {
                                                const newSet = new Set(prev);
                                                if (checked) {
                                                    newSet.add(goal.description);
                                                } else {
                                                    newSet.delete(goal.description);
                                                }
                                                return newSet;
                                            })
                                        }}
                                    />
                                    <Label htmlFor={`goal-${goal.id}`} className="flex items-center gap-2 cursor-pointer">
                                        <goal.icon className="w-4 h-4"/>
                                        {goal.title}
                                    </Label>
                                </div>
                            ))}
                         </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.size === 0} size="lg">
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" />Analyzing...</> : <><Wand2 className="mr-2" />Get Recommendations</>}
                        </Button>
                </CardFooter>
            </Card>

            {summary && (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Summary</CardTitle>
                        <CardDescription>A brief overview of your selected dataset columns.</CardDescription>
                    </CardHeader>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.map((col, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{col.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={col.type === 'numeric' ? 'default' : 'secondary'}
                                                  className={col.type === 'numeric' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                                  {col.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{col.missing_count}</TableCell>
                                            <TableCell>{col.unique_count}</TableCell>
                                            <TableCell>{col.mean?.toFixed(2) ?? '-'}</TableCell>
                                            <TableCell>{col.std?.toFixed(2) ?? '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {recommendations && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot />AI-Powered Analysis Recommendations</CardTitle>
                        <CardDescription>Based on your data and goals, here are some suggested analyses.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommendations.map((rec, index) => (
                            <Card key={index} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{rec.analysis_name}</CardTitle>
                                        <Badge variant="outline">{rec.category}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                </CardContent>
                                <CardFooter>
                                    <div className="w-full">
                                        <Label className="text-xs text-muted-foreground">Example Variables</Label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {rec.required_variables.map((v: string, i: number) => <Badge key={i} variant="secondary">{v}</Badge>)}
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

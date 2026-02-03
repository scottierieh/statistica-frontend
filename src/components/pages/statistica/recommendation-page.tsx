'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Bot, Sparkles, AlertCircle, HelpCircle, Info, Lightbulb, TrendingUp, Layers, Users, ArrowLeftRight, Target, Timer, BookOpen, Settings, CheckCircle, FileSearch, ChevronRight, ChevronLeft, Check, Database, Settings2, Shield, CheckCircle2, ArrowRight, ChevronDown } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { analysisGoals } from '@/lib/analysis-goals';
import DataPreview from '@/components/data-preview';
import { unparseData } from '@/lib/stats';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


interface RecommendationPageProps {
    data: DataSet;
    allHeaders: string[];
    fileName?: string; 
    onFileSelected: (file: File) => void;
    onLoadExample: (example: ExampleDataSet) => void;
    onClearData: () => void;  // ✅ required로 변경
    isUploading: boolean;
  }

type Step = 1 | 2 | 3;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Analysis' },
    { id: 3, label: 'Results' }
];

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const irisExample = exampleDatasets.find(ex => ex.id === 'iris');
    const tipsExample = exampleDatasets.find(ex => ex.id === 'tips-data');

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
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
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Smart Suggestions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Get tailored analysis recommendations based on your data structure
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Data-Driven</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    AI analyzes your variable types and relationships automatically
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Lightbulb className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Goal-Oriented</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Optionally describe your goals for more accurate suggestions
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use This Tool
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Perfect for beginners or when you're unsure which statistical test to use. 
                            The AI will examine your data and suggest appropriate analyses based on variable types, 
                            sample sizes, and your research objectives.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    How It Works
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Select variables</strong> you want to analyze</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Optionally describe</strong> your research goals</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Get recommendations</strong> with explanations</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You'll Get
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Data summary:</strong> Overview of your variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Recommended analyses:</strong> Best-fit statistical tests</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Reasoning:</strong> Why each analysis fits</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-2">
                        {tipsExample && (
                            <Button onClick={() => onLoadExample(tipsExample)} size="lg" variant="outline">
                                <Sparkles className="mr-2 h-5 w-5" />
                                Load Tips Dataset
                            </Button>
                        )}
                        {irisExample && (
                            <Button onClick={() => onLoadExample(irisExample)} size="lg">
                                {irisExample.icon && <irisExample.icon className="mr-2 h-5 w-5" />}
                                Load Iris Dataset
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


export default function RecommendationPage(props: RecommendationPageProps) {
    const { toast } = useToast();
    
    // View and step state
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Form state
    const [selectedVars, setSelectedVars] = useState<Set<string>>(new Set());
    const [dataDescription, setDataDescription] = useState('');
    const [analysisGoal, setAnalysisGoal] = useState('');
    const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    
    // Results state
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<any[] | null>(null);
    const [recommendations, setRecommendations] = useState<any[] | null>(null);
    
    const canRun = useMemo(() => props.data.length > 0 && props.allHeaders.length > 0, [props.data, props.allHeaders]);

    // Initialize when data changes
    useEffect(() => {
        if (canRun) {
            setSelectedVars(new Set(props.allHeaders.slice(0, 5)));
            setView('main');
        } else {
            setView('intro');
        }
        setSummary(null);
        setRecommendations(null);
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [props.allHeaders, props.data, canRun]);

    // Navigation
    const goToStep = useCallback((step: Step) => {
        setCurrentStep(step);
        setMaxReachedStep(prev => Math.max(prev, step) as Step);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep === 2) {
            runAnalysis();
        } else if (currentStep < 3) {
            goToStep((currentStep + 1) as Step);
        }
    }, [currentStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 1) goToStep((currentStep - 1) as Step);
    }, [currentStep, goToStep]);

    // Variable selection
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

    const selectAll = () => setSelectedVars(new Set(props.allHeaders));
    const selectNone = () => setSelectedVars(new Set());

    // Validation checks
    const dataValidation = useMemo(() => {
        const checks = [];
        checks.push({
            label: 'Variables selected',
            passed: selectedVars.size > 0,
            detail: selectedVars.size > 0 ? `${selectedVars.size} variable(s) selected` : 'Select at least one variable'
        });
        
        checks.push({
            label: 'Sample size',
            passed: props.data.length >= 5,
            detail: `${props.data.length} observations available`
        });
        
        return checks;
    }, [selectedVars, props.data]);

    const allValidationsPassed = dataValidation.every(check => check.passed);

    // Analysis
    const runAnalysis = useCallback(async () => {
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
            goToStep(3);
            toast({ title: "Analysis Complete", description: "Data summary and recommendations are ready." });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [props.data, selectedVars, dataDescription, analysisGoal, selectedGoals, toast, goToStep]);

    const handleDownloadData = useCallback(() => {
        if (props.data.length === 0) {
          toast({ title: 'No Data to Download', description: 'There is no data currently loaded.' });
          return;
        }
        try {
          const csvContent = unparseData({ headers: props.allHeaders, data: props.data });
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = (props.fileName?.replace(/\.[^/.]+$/, "") || 'statistica_data') + "_statistica.csv";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to download data:', error);
          toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
        }
    }, [props.data, props.allHeaders, props.fileName, toast]);
    
    // Intro page
    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={props.onLoadExample} />;
    }

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {props.data.length > 0 && (
                <DataPreview 
                    fileName={props.fileName ?? 'Untitled'}
                    data={props.data}
                    headers={props.allHeaders}
                    onDownload={handleDownloadData}
                    onClearData={props.onClearData}  // ✅ 직접 전달
                />
            )}
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">AI Analysis Recommendation</h1>
                    <p className="text-muted-foreground mt-1">Get tailored analysis suggestions for your data</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                    <HelpCircle className="w-5 h-5"/>
                </Button>
            </div>
            
            <ProgressBar />

            <div>
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables to Analyze</CardTitle>
                                    <CardDescription>Choose which columns you want AI to examine</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                                <Button variant="outline" size="sm" onClick={selectNone}>Clear All</Button>
                            </div>
                            
                            <ScrollArea className="h-48 border rounded-lg p-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {props.allHeaders.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`var-${h}`} 
                                                checked={selectedVars.has(h)}
                                                onCheckedChange={(checked) => handleVarSelectionChange(h, !!checked)} 
                                            />
                                            <Label htmlFor={`var-${h}`} className="text-sm font-medium cursor-pointer">
                                                {h}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <div className="text-sm text-muted-foreground">
                                    <strong className="text-foreground">{selectedVars.size}</strong> variables selected 
                                    from <strong className="text-foreground">{props.data.length}</strong> observations
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.size === 0}>
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Configure & Run Analysis */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Ready to Analyze</CardTitle>
                                    <CardDescription>Review settings and run AI analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Validation Checks */}
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                                        check.passed ? 'bg-primary/5' : 'bg-amber-50/50 dark:bg-amber-950/20'
                                    }`}>
                                        {check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>
                                                {check.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Advanced Settings - Collapsible */}
                            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-between p-4 h-auto border rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Settings2 className="w-5 h-5 text-muted-foreground" />
                                            <div className="text-left">
                                                <p className="font-medium text-sm">Advanced Settings</p>
                                                <p className="text-xs text-muted-foreground">Describe your data and goals for better recommendations</p>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-4 space-y-4">
                                    <Alert className="bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800">
                                        <Info className="h-4 w-4 text-sky-600" />
                                        <AlertTitle className="text-sky-800 dark:text-sky-200">Optional Context</AlertTitle>
                                        <AlertDescription className="text-sky-700 dark:text-sky-300">
                                           Providing context helps AI suggest more accurate analyses. If you leave these blank, recommendations will be based solely on your data's structure.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="data-description" className="font-semibold text-sm">
                                                What is this data about?
                                            </Label>
                                            <Textarea
                                                id="data-description"
                                                placeholder="e.g., 'Customer satisfaction data from a post-purchase survey.'"
                                                value={dataDescription}
                                                onChange={(e) => setDataDescription(e.target.value)}
                                                className="min-h-[80px]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="analysis-goal" className="font-semibold text-sm">
                                               What do you want to find out?
                                            </Label>
                                            <Textarea
                                                id="analysis-goal"
                                                placeholder="e.g., 'What drives satisfaction scores?' or 'Which group is most likely to churn?'"
                                                value={analysisGoal}
                                                onChange={(e) => setAnalysisGoal(e.target.value)}
                                                className="min-h-[80px]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold text-sm">Analysis Objectives</Label>
                                        <p className="text-xs text-muted-foreground mb-2">Select general goals that apply to your analysis.</p>
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
                                                    <Label htmlFor={`goal-${goal.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                                                        <goal.icon className="w-4 h-4"/>
                                                        {goal.title}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Info className="w-5 h-5 text-sky-600 shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    AI will analyze your data structure and recommend suitable statistical analyses.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
                                ) : (
                                    <><Wand2 className="mr-2 w-4 h-4" />Get Recommendations</>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Results */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        {/* Data Summary */}
                        {summary && (
                            <Card className="border-0 shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Layers className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Data Summary</CardTitle>
                                            <CardDescription>Overview of your selected dataset columns</CardDescription>
                                        </div>
                                    </div>
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

                        {/* AI Recommendations */}
                        {recommendations && (
                            <Card className="border-0 shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Bot className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>AI-Powered Analysis Recommendations</CardTitle>
                                            <CardDescription>Based on your data and goals, here are suggested analyses</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {recommendations.map((rec, index) => (
                                            <Card key={index} className="flex flex-col hover:border-primary/50 transition-colors">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-lg">{rec.analysis_name}</CardTitle>
                                                        <Badge variant="outline">{rec.category}</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="flex-1">
                                                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                                </CardContent>
                                                <CardFooter className="pt-2">
                                                    <div className="w-full">
                                                        <Label className="text-xs text-muted-foreground">Suggested Variables</Label>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                          {rec.required_variables.map((v: string, i: number) => (
                                                              <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                                                          ))}
                                                        </div>
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="flex justify-start">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back to Settings
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

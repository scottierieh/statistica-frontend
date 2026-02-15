'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Users, ArrowLeft, Scale, RotateCcw, Save, Loader2, FileDown, BeakerIcon, ShieldCheck, TrendingUp, Network, Filter, Info, BarChart as BarChartIcon, Grid3x3 } from 'lucide-react';
import type { Survey, SurveyResponse, Question, RowItem } from '@/entities/Survey';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import FilterPanel, { FilterGroup, FilterRule } from '@/components/survey/FilterPanel';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Import separated charts
import {
    CategoricalChart,
    NumericChart,
    RatingChart,
    NPSChart,
    TextResponsesDisplay,
    MatrixChart,
    BestWorstChart
} from './charts';

// Import separated utils
import {
    applyWeights,
    processTextResponses,
    processCategoricalResponses,
    processNumericResponses,
    processBestWorst,
    processMatrixResponses,
    processNPS,
    type QuestionWeight
} from './utils';

// --- 가중치 설정 다이얼로그 컴포넌트 ---
const WeightSettingsDialog = ({ 
    open, 
    onOpenChange, 
    survey, 
    currentWeights,
    onSaveWeights 
}: { 
    open: boolean;
    onOpenChange: (open: boolean) => void;
    survey: Survey;
    currentWeights: QuestionWeight[];
    onSaveWeights: (weights: QuestionWeight[]) => void;
}) => {
    const [weights, setWeights] = useState<QuestionWeight[]>(currentWeights);
    
    useEffect(() => {
        setWeights(currentWeights);
    }, [currentWeights]);
    
    const handleToggleWeight = (questionId: string, enabled: boolean) => {
        setWeights(prev => {
            const existing = prev.find(w => w.questionId === questionId);
            if (existing) {
                return prev.map(w => w.questionId === questionId ? { ...w, enabled } : w);
            }
            return [...prev, { questionId, enabled, optionWeights: {} }];
        });
    };
    
    const handleOptionWeightChange = (questionId: string, option: string, value: string) => {
        const numValue = parseFloat(value) || 1;
        setWeights(prev => {
            const existing = prev.find(w => w.questionId === questionId);
            if (existing) {
                return prev.map(w => 
                    w.questionId === questionId 
                        ? { ...w, optionWeights: { ...w.optionWeights, [option]: numValue } }
                        : w
                );
            }
            return [...prev, { questionId, enabled: true, optionWeights: { [option]: numValue } }];
        });
    };
    
    const handleDefaultWeightChange = (questionId: string, value: string) => {
        const numValue = parseFloat(value) || 1;
        setWeights(prev => {
            const existing = prev.find(w => w.questionId === questionId);
            if (existing) {
                return prev.map(w => 
                    w.questionId === questionId 
                        ? { ...w, defaultWeight: numValue }
                        : w
                );
            }
            return [...prev, { questionId, enabled: true, defaultWeight: numValue }];
        });
    };
    
    const handleReset = () => {
        setWeights([]);
    };
    
    const handleSave = () => {
        onSaveWeights(weights);
        onOpenChange(false);
    };
    
    const weightableQuestions = survey.questions.filter(q => 
        ['single', 'multiple', 'dropdown', 'likert', 'rating', 'number', 'nps'].includes(q.type)
    );
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scale className="w-5 h-5" />
                        Weight Settings
                    </DialogTitle>
                    <DialogDescription>
                        Set weights for each question and response option to apply them in data analysis.
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-6">
                        {weightableQuestions.map(question => {
                            const questionId = String(question.id);
                            const weight = weights.find(w => w.questionId === questionId);
                            const isEnabled = weight?.enabled || false;
                            
                            return (
                                <Card key={questionId}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                                <CardTitle className="text-sm font-medium">
                                                    {question.title}
                                                </CardTitle>
                                                <Badge variant="outline" className="text-xs">
                                                    {question.type}
                                                </Badge>
                                            </div>
                                            <Switch
                                                checked={isEnabled}
                                                onCheckedChange={(checked) => handleToggleWeight(questionId, checked)}
                                            />
                                        </div>
                                    </CardHeader>
                                    
                                    {isEnabled && (
                                        <CardContent className="space-y-3">
                                            {['single', 'multiple', 'dropdown'].includes(question.type) && question.options && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Option Weights</Label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {question.options.map(option => (
                                                            <div key={option} className="flex items-center gap-2">
                                                                <Label className="text-xs flex-1 truncate">{option}</Label>
                                                                <Input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    defaultValue={weight?.optionWeights?.[option] || 1}
                                                                    onChange={(e) => handleOptionWeightChange(questionId, option, e.target.value)}
                                                                    className="w-20 h-8 text-xs"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {question.type === 'likert' && question.scale && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Scale Weights</Label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {question.scale.map(scaleItem => {
                                                            const label = typeof scaleItem === 'string' ? scaleItem : scaleItem.label;
                                                            const value = typeof scaleItem === 'string' ? scaleItem : String(scaleItem.value);
                                                            return (
                                                                <div key={value} className="flex items-center gap-2">
                                                                    <Label className="text-xs flex-1 truncate">{label}</Label>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        defaultValue={weight?.optionWeights?.[value] || 1}
                                                                        onChange={(e) => handleOptionWeightChange(questionId, value, e.target.value)}
                                                                        className="w-20 h-8 text-xs"
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {['rating', 'number', 'nps'].includes(question.type) && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Default Weight</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        defaultValue={weight?.defaultWeight || 1}
                                                        onChange={(e) => handleDefaultWeightChange(questionId, e.target.value)}
                                                        className="w-32 h-8"
                                                    />
                                                </div>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
                
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Component ---
interface SurveyAnalysisPageProps {
    survey: Survey;
    responses: SurveyResponse[];
    specialAnalyses: { key: string; label: string; icon?: React.ReactNode; component: React.ReactNode }[];
}

export default function SurveyAnalysisPage({ survey, responses, specialAnalyses }: SurveyAnalysisPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const pageRef = useRef<HTMLDivElement>(null);
    const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState<any[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterGroup[]>([]);
    const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
    const [weights, setWeights] = useState<QuestionWeight[]>([]);

    // Filter responses based on active filters
    const filteredResponses = useMemo(() => {
        if (!activeFilters || activeFilters.length === 0 || activeFilters.every(g => g.rules.length === 0)) {
            return responses;
        }
        
        const checkCondition = (answer: any, rule: FilterRule): boolean => {
            if (answer === undefined || answer === null) return false;
            
            const question = survey.questions.find((q: any) => q.id === rule.questionId);
            if (!question) return false;
            
            const { operator, value } = rule;
            const numAnswer = Number(answer);
            const numValue = Number(value);

            switch (question.type) {
                case 'single':
                case 'dropdown':
                    return operator === 'is' ? answer === value : answer !== value;
                
                case 'multiple':
                    if (!Array.isArray(answer)) return false;
                    return operator === 'contains' ? answer.includes(value) : !answer.includes(value);
                
                case 'number':
                case 'rating':
                case 'nps':
                case 'likert':
                    if (isNaN(numAnswer)) return false;
                    switch (operator) {
                        case 'eq': return numAnswer === numValue;
                        case 'neq': return numAnswer !== numValue;
                        case 'gt': return numAnswer > numValue;
                        case 'lt': return numAnswer < numValue;
                        case 'gte': return numAnswer >= numValue;
                        case 'lte': return numAnswer <= numValue;
                        default: return false;
                    }

                case 'text':
                    if (typeof answer !== 'string') return false;
                    const text = String(value).toLowerCase();
                    return operator === 'contains' ? answer.toLowerCase().includes(text) : !answer.toLowerCase().includes(text);
                
                default:
                    return false;
            }
        };
        
        return responses.filter((resp: any) => {
            return activeFilters.every(group => {
                if (group.rules.length === 0) return true;
                
                const ruleResults = group.rules.map(rule => checkCondition((resp.answers as any)[rule.questionId], rule));
                
                if (group.conjunction === 'AND') {
                    return ruleResults.every(res => res);
                } else {
                    return ruleResults.some(res => res);
                }
            });
        });
    }, [responses, activeFilters, survey.questions]);

    // Apply weights to filtered responses
    const weightedResponses = useMemo(() => {
        return applyWeights(filteredResponses, weights);
    }, [filteredResponses, weights]);

    // Check if further analysis is available
    const numericHeaders = useMemo(() => {
        if (!survey || !survey.questions) return [];
        
        const headers: string[] = [];
        survey.questions.forEach(q => {
            if (['number', 'rating', 'likert', 'nps'].includes(q.type)) {
                headers.push(q.title);
            } else if(q.type === 'matrix') {
                q.rows?.forEach(row => {
                    const rowLabel = typeof row === 'object' ? (row as RowItem).left : row;
                    headers.push(`${q.title} - ${rowLabel}`);
                });
            }
        });
        return headers;
    }, [survey]);
    
    const hasFurtherAnalysis = useMemo(() => {
        return numericHeaders.length > 1;
    }, [numericHeaders]);

    // Process all question data
    const processAllData = useCallback(async (questions: Question[], responsesToProcess: SurveyResponse[]) => {
        if (!questions || !responsesToProcess) {
            return [];
        }
        const dataToProcess = questions.filter((q: any) => 
            q.type !== 'conjoint' && q.type !== 'rating-conjoint' && 
            q.type !== 'ranking-conjoint' && q.type !== 'ahp' && q.type !== 'servqual'
        );
        
        const promises = dataToProcess.map(async (q: Question) => {
            const questionId = String(q.id);
            switch(q.type) {
                case 'single':
                case 'multiple':
                case 'dropdown':
                    return { type: 'categorical', title: q.title, data: processCategoricalResponses(responsesToProcess, q) };
                case 'number':
                    const numericData = processNumericResponses(responsesToProcess, questionId);
                    return { type: 'numeric', title: q.title, data: numericData, questionId };
                case 'rating':
                    const ratingData = processNumericResponses(responsesToProcess, questionId);
                    return { type: 'rating', title: q.title, data: ratingData };
                case 'likert':
                    const likertData = processCategoricalResponses(responsesToProcess, q);
                    return { type: 'likert', title: q.title, question: q, data: likertData };
                case 'nps':
                    const npsData = await processNPS(responsesToProcess, questionId);
                    return { type: 'nps', title: q.title, data: npsData };
                case 'text':
                    return { type: 'text', title: q.title, data: processTextResponses(responsesToProcess, questionId) };
                case 'best-worst':
                    const bestWorstData = await processBestWorst(responsesToProcess, q);
                    return { type: 'best-worst', title: q.title, data: bestWorstData };
                case 'matrix':
                    const matrixData = processMatrixResponses(responsesToProcess, q);
                    return { type: 'matrix', title: q.title, data: matrixData, rows: q.rows, columns: q.scale || q.columns };
                default:
                    return null;
            }
        });
        
        return (await Promise.all(promises)).filter(Boolean);
    }, []);
    
    // Load data on mount and when responses change
    useEffect(() => {
        const loadData = async () => {
            if (survey && survey.questions && weightedResponses) {
                setLoading(true);
                const processed = await processAllData(survey.questions, weightedResponses);
                setAnalysisData(processed);
                setLoading(false);
            }
        };
        loadData();
    }, [survey, weightedResponses, processAllData]);
    
    // Download handler
    const handleDownload = useCallback(async (format: 'pdf' | 'excel' | 'csv' | 'json') => {
        setIsDownloading(true);
        toast({ title: 'Preparing Download', description: `Generating your ${format.toUpperCase()} file...` });

        try {
            if (format === 'pdf') {
                const element = pageRef.current;
                if (!element) throw new Error("Could not find page element to capture.");
                const canvas = await html2canvas(element, { 
                    scale: 2, 
                    useCORS: true,
                    backgroundColor: window.getComputedStyle(document.body).backgroundColor
                });
                const image = canvas.toDataURL('image/png', 1.0);
                const link = document.createElement('a');
                link.download = `${survey.title.replace(/\s+/g, '_')}_analysis.png`;
                link.href = image;
                link.click();
            } else {
                const dataToExport = weightedResponses.map(r => {
                    const row: any = {
                        respondent_id: r.id,
                        submittedAt: r.submittedAt,
                        weight: (r as any).weight || 1
                    };
                    survey.questions.forEach(q => {
                        const answer = r.answers[q.id];
                        if (q.type === 'matrix' && q.rows && typeof answer === 'object' && answer !== null) {
                            q.rows.forEach(rowItem => {
                                const rowLabel = typeof rowItem === 'object' ? (rowItem as RowItem).left : rowItem;
                                const headerName = `${q.title} - ${rowLabel}`;
                                row[headerName] = answer[rowLabel] ?? '';
                            });
                        } else {
                            row[q.title] = Array.isArray(answer) ? answer.join(', ') : (answer ?? '');
                        }
                    });
                    return row;
                });

                if (format === 'excel') {
                    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
                    XLSX.writeFile(workbook, `${survey.title.replace(/\s+/g, '_')}_responses.xlsx`);
                } else if (format === 'csv') {
                    const csv = Papa.unparse(dataToExport);
                    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${survey.title.replace(/\s+/g, '_')}_responses.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else if (format === 'json') {
                    const jsonString = JSON.stringify(weightedResponses, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${survey.title.replace(/\s+/g, '_')}_responses.json`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        } catch (err: any) {
            console.error("Download error:", err);
            toast({ title: "Download Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    }, [survey, weightedResponses, toast]);
    
    // Download individual chart as PNG
    const downloadChartAsPng = (chartId: string, chartTitle: string) => {
        const chartElement = chartRefs.current[chartId];
        if (chartElement) {
            html2canvas(chartElement).then(canvas => {
                const image = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${chartTitle.replace(/\s+/g, '_')}.png`;
                link.href = image;
                link.click();
            });
        }
    };

    // Navigate to further analysis
    const handleFurtherAnalysisClick = (analysisType: string) => {
        router.push(`/dashboard/statistica?analysis=${analysisType}`);
    };

    // Save weights
    const handleSaveWeights = (newWeights: QuestionWeight[]) => {
        setWeights(newWeights);
        toast({ 
            title: "Weights Applied", 
            description: `Weights applied to ${newWeights.filter(w => w.enabled).length} question(s).` 
        });
    };

    // Loading state
    if (loading && analysisData.length === 0) {
        return (
            <div className="space-y-6 p-4 md:p-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    // Error state
    if (!survey) {
        return (
            <Alert variant="destructive" className="m-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Survey not found.</AlertDescription>
            </Alert>
        );
    }

    // Build tabs
    const tabs = [
        { key: 'results', label: 'Results', icon: <BarChartIcon className="w-4 h-4" /> },
        ...specialAnalyses,
    ];

    if (hasFurtherAnalysis) {
        tabs.push({ key: 'further_analysis', label: 'Further Analysis', icon: <BeakerIcon className="w-4 h-4" /> });
    }

    return (
        <div ref={pageRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex items-start gap-6">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => router.push("/dashboard/survey2")}
                        className="mt-1 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 space-y-3">
                        <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                            {survey.title}
                        </h1>
                        <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="font-semibold">
                                <Users className="w-3 h-3 mr-1" />
                                {responses.length} responses
                            </Badge>
                            {weights.filter(w => w.enabled).length > 0 && (
                                <Badge variant="default" className="font-semibold">
                                    <Scale className="w-3 h-3 mr-1" />
                                    {weights.filter(w => w.enabled).length} weights applied
                                </Badge>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        {isDownloading ? <Loader2 className="w-3 h-3 animate-spin"/> : <FileDown className="w-3 h-3"/>} 
                                        Download
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleDownload('excel')}>Download as Excel</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownload('csv')}>Download as CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownload('json')}>Download as JSON</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownload('pdf')}>Download as PNG</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                <Button variant="outline" size="sm" className="gap-1.5"
                              onClick={() => {
                                const dataToExport = weightedResponses.map(r => {
                                  const row: any = {};
                                  survey.questions.forEach(q => {
                                    const answer = r.answers[q.id];
                                    if (q.type === 'matrix' && q.rows && typeof answer === 'object' && answer !== null) {
                                      q.rows.forEach(rowItem => {
                                        const rowLabel = typeof rowItem === 'object' ? (rowItem as RowItem).left : rowItem;
                                        row[`${q.title} - ${rowLabel}`] = answer[rowLabel] ?? '';
                                      });
                                    } else {
                                      row[q.title] = Array.isArray(answer) ? answer.join(', ') : (answer ?? '');
                                    }
                                  });
                                  return row;
                                });
                                const csv = Papa.unparse(dataToExport);
                                localStorage.setItem('statistica-survey-data', csv);
                                localStorage.setItem('statistica-survey-name', survey.title);
                                router.push('/dashboard/statistica?source=survey');
                              }}
                            >
                              <BeakerIcon className="w-3 h-3" />
                              Open in Statistica
                            </Button>
                
                {/* Weight Settings Dialog */}
                <WeightSettingsDialog
                    open={isWeightDialogOpen}
                    onOpenChange={setIsWeightDialogOpen}
                    survey={survey}
                    currentWeights={weights}
                    onSaveWeights={handleSaveWeights}
                />
                
                {/* Tabs Section */}
                <Tabs defaultValue="results" className="w-full">
                    <TabsList className="inline-flex h-11 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-full overflow-x-auto">
                        {tabs.map(tab => (
                            <TabsTrigger 
                                key={tab.key} 
                                value={tab.key}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
                            >
                                {tab.icon}
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    {/* Results Tab */}
                    <TabsContent value="results" className="mt-8">
                        <div className="flex justify-end mb-4 gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsWeightDialogOpen(true)}
                                className="gap-1.5"
                            >
                                <Scale className="w-3 h-3" />
                                Weight 
                            </Button>
                            <Button variant="outline" onClick={() => setIsFilterPanelOpen(true)}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filter {activeFilters.length > 0 && `(${activeFilters.map(g => g.rules.length).reduce((a,b) => a+b, 0)})`}
                            </Button>
                            <FilterPanel 
                                open={isFilterPanelOpen}
                                onOpenChange={setIsFilterPanelOpen}
                                survey={survey}
                                onApplyFilters={setActiveFilters}
                                onClearFilters={() => setActiveFilters([])}
                            />
                        </div>
                        
                        {filteredResponses.length !== responses.length && (
                            <Alert className="mb-4">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Filters Active</AlertTitle>
                                <AlertDescription>
                                    Showing results for {filteredResponses.length} out of {responses.length} total responses.
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        {analysisData && analysisData.length > 0 ? (
                            <div className="space-y-8">
                                {analysisData.map((result, index) => {
                                    if (!result || !result.data) return null;
                                    const chartId = `chart-${index}`;
                                    return (
                                        <div key={index} ref={el => { if(el) chartRefs.current[chartId] = el; }}>
                                            {(() => {
                                                switch (result.type) {
                                                    case 'categorical':
                                                        return <CategoricalChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                                    case 'numeric':
                                                        return <NumericChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                                    case 'rating':
                                                        return <RatingChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                                    case 'likert':
                                                        return <CategoricalChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} type="likert" />;
                                                    case 'nps':
                                                        return <NPSChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                                    case 'text':
                                                        return <TextResponsesDisplay data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                                    case 'best-worst':
                                                        return <BestWorstChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                                    case 'matrix':
                                                        return <MatrixChart data={result.data} title={result.title} rows={result.rows!} columns={result.columns!} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                                    default:
                                                        return null;
                                                }
                                            })()}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <Alert className="m-6">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>No Results to Display</AlertTitle>
                                <AlertDescription>
                                    {responses.length > 0
                                        ? "There are no results to display for standard questions. If you used an analysis template, please check the corresponding analysis tab."
                                        : "There are no survey responses (0 cases)."
                                    }
                                </AlertDescription>
                            </Alert>
                        )}
                    </TabsContent>                                         
                </Tabs>
            </div>
        </div>
    );
}


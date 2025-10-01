'use client';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, ArrowRight, ArrowLeft, Share2, BarChart2, Trash2, CaseSensitive, CircleDot, CheckSquare, ChevronDown, Star, Sigma, Phone, Mail, ThumbsUp, Grid3x3, FileText, Plus, X, Settings, Eye, Save } from 'lucide-react';
import { produce } from 'immer';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, QrCode } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { jStat } from 'jstat';
import dynamic from 'next/dynamic';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent, useDraggable } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Info, Link as LinkIcon, Laptop, Palette, Tablet, Monitor, FileDown, Frown, Lightbulb, AlertTriangle, ShoppingCart, ShieldCheck, BeakerIcon, ShieldAlert, Move, PieChart as PieChartIcon, DollarSign, ZoomIn, ZoomOut, AreaChart, BookOpen, Handshake, Columns, Network, TrendingUp, FlaskConical, Binary, Component, HeartPulse, Feather, GitBranch, Smile, Scaling } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from './ui/chart';
import { Bar, BarChart as RechartsBarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis, Legend, ReferenceLine } from 'recharts';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import Papa from 'papaparse';
import Link from 'next/link';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Simplified question and survey types for the new tool
type QuestionType = 'text' | 'choice' | 'single' | 'multiple' | 'dropdown' | 'rating' | 'number' | 'phone' | 'email' | 'nps' | 'description' | 'best-worst' | 'matrix';

type Question = {
  id: string;
  type: QuestionType;
  text: string;
  title?: string;
  options?: string[];
  items?: string[];
  columns?: string[];
  scale?: string[];
  required?: boolean;
  content?: string;
  imageUrl?: string;
  rows?: string[];
};

type Survey = {
  title: string;
  description: string;
  questions: Question[];
  startDate?: Date;
  endDate?: Date;
};

const STEPS = ['Setup', 'Build', 'Setting', 'Share & Analyze'];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', 
          '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const SortableCard = ({ id, children }: { id: any; children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-2">
            <div {...attributes} {...listeners} className="p-2 cursor-grab mt-1">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
};

const QuestionEditor = ({ question, onUpdate, onDelete, isPreview }: { question: Question; onUpdate: (id: string, newQuestion: Partial<Question>) => void; onDelete: (id: string) => void; isPreview?: boolean }) => {
    
    const handleOptionChange = (optIndex: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[optIndex] = value;
        onUpdate(question.id, { options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
        onUpdate(question.id, { options: newOptions });
    };

    const removeOption = (optIndex: number) => {
        const newOptions = (question.options || []).filter((_, i) => i !== optIndex);
        onUpdate(question.id, { options: newOptions });
    };

    const handleMatrixChange = (type: 'rows' | 'columns' | 'scale', index: number, value: string) => {
        const newValues = [...(question[type] || [])];
        newValues[index] = value;
        onUpdate(question.id, { [type]: newValues });
    };

    const addMatrixRow = () => onUpdate(question.id, { rows: [...(question.rows || []), `New Row`] });
    const removeMatrixRow = (index: number) => onUpdate(question.id, { rows: (question.rows || []).filter((_, i) => i !== index) });
    const addMatrixColumn = () => {
        const newColumns = [...(question.columns || []), `Col ${(question.columns?.length || 0) + 1}`];
        const newScale = [...(question.scale || []), `Label ${(question.scale?.length || 0) + 1}`];
        onUpdate(question.id, { columns: newColumns, scale: newScale });
    };
    const removeMatrixColumn = (index: number) => {
        const newColumns = (question.columns || []).filter((_, i) => i !== index);
        const newScale = (question.scale || []).filter((_, i) => i !== index);
        onUpdate(question.id, { columns: newColumns, scale: newScale });
    };
    
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...(question.items || [])];
        newItems[index] = value;
        onUpdate(question.id, { items: newItems });
    };
    
    const addItem = () => {
        const newItems = [...(question.items || []), `New Item`];
        onUpdate(question.id, { items: newItems });
    };
    
    const removeItem = (index: number) => {
        const newItems = (question.items || []).filter((_, i) => i !== index);
        onUpdate(question.id, { items: newItems });
    };

    if (question.type === 'matrix') {
        return (
            <Card className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div className='flex-1'>
                        <Label>Question Text</Label>
                        <Input
                            value={question.text}
                            onChange={(e) => onUpdate(question.id, { text: e.target.value })}
                            placeholder="Type your matrix question title here..."
                            readOnly={isPreview}
                        />
                    </div>
                    {!isPreview && (
                         <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}>
                            <Trash2 className="w-4 h-4 text-destructive"/>
                        </Button>
                    )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Rows (Items to be rated)</Label>
                        {(question.rows || []).map((row, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={row} onChange={e => handleMatrixChange('rows', index, e.target.value)} readOnly={isPreview}/>
                                {!isPreview && <Button variant="ghost" size="icon" onClick={() => removeMatrixRow(index)}><X className="w-4 h-4 text-muted-foreground"/></Button>}
                            </div>
                        ))}
                        {!isPreview && <Button variant="outline" size="sm" onClick={addMatrixRow}><PlusCircle className="mr-2 h-4 w-4"/> Add Row</Button>}
                    </div>
                    <div className="space-y-2">
                        <Label>Scale Labels (Columns)</Label>
                        {(question.scale || []).map((col, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={col} onChange={e => handleMatrixChange('scale', index, e.target.value)} readOnly={isPreview}/>
                                {!isPreview && <Button variant="ghost" size="icon" onClick={() => removeMatrixColumn(index)}><X className="w-4 h-4 text-muted-foreground"/></Button>}
                            </div>
                        ))}
                        {!isPreview && <Button variant="outline" size="sm" onClick={addMatrixColumn}><PlusCircle className="mr-2 h-4 w-4"/> Add Column</Button>}
                    </div>
                </div>
            </Card>
        );
    }

    return (
    <Card className="p-4 space-y-4">
        <div className="flex justify-between items-start">
            <div className='flex-1'>
                <Label>Question Text</Label>
                <Input
                    value={question.text}
                    onChange={(e) => onUpdate(question.id, { text: e.target.value })}
                    placeholder="Type your question here..."
                    readOnly={isPreview}
                />
            </div>
            {!isPreview && (
                 <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}>
                    <Trash2 className="w-4 h-4 text-destructive"/>
                </Button>
            )}
        </div>

        {['single', 'multiple', 'dropdown'].includes(question.type) && (
            <div className="space-y-2">
                <Label>Options</Label>
                {question.options?.map((opt, index) => (
                    <div key={index} className="flex items-center gap-2">
                    <Input
                        value={opt}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        readOnly={isPreview}
                    />
                    {!isPreview && (
                         <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                            <X className="w-4 h-4 text-muted-foreground"/>
                        </Button>
                    )}
                    </div>
                ))}
                {!isPreview && (
                    <Button variant="outline" size="sm" onClick={addOption}><PlusCircle className="mr-2 h-4 w-4"/> Add Option</Button>
                )}
            </div>
        )}

        {question.type === 'best-worst' && (
             <div className="space-y-2">
                <Label>Items to Compare</Label>
                {question.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input value={item} onChange={(e) => handleItemChange(index, e.target.value)} readOnly={isPreview} />
                        {!isPreview && <Button variant="ghost" size="icon" onClick={() => removeItem(index)}><X className="w-4 h-4 text-muted-foreground"/></Button>}
                    </div>
                ))}
                {!isPreview && <Button variant="outline" size="sm" onClick={addItem}><PlusCircle className="mr-2 h-4 w-4"/> Add Item</Button>}
            </div>
        )}

    </Card>
    );
};

// --- Analysis Components ---
const AnalysisResultDisplay = ({ question, responses }: { question: Question; responses: any[] }) => {
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const [chartType, setChartType] = useState<'hbar' | 'bar' | 'pie' | 'donut'>('hbar');

    const runAnalysis = useCallback(async () => {
        const answers = responses.map(r => r.answers[question.id]).filter(a => a !== undefined && a !== null);
        if (answers.length === 0) {
            toast({ title: 'No data for this question.' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/analysis/frequency`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: answers.map(a => ({ value: a })), variables: ['value'] }),
            });
            if (!response.ok) throw new Error('Analysis failed');
            const data = await response.json();
            setResult(data.results.value);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [question.id, responses, toast]);
    
     useEffect(() => {
        runAnalysis();
    }, [runAnalysis]);
    
    if (isLoading) return <Card><CardHeader><CardTitle>{question.text}</CardTitle></CardHeader><CardContent><Skeleton className="w-full h-64"/></CardContent></Card>;
    if (!result) return <Card><CardHeader><CardTitle>{question.text}</CardTitle></CardHeader><CardContent><p>No responses yet or analysis failed.</p><Button onClick={runAnalysis}>Retry</Button></CardContent></Card>;

    const chartData = result.table.map((d: any) => ({name: d.Value, value: d.Frequency}));
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{question.text}</CardTitle>
                 <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-full mt-2">
                    <TabsList>
                        <TabsTrigger value="hbar">Horizontal</TabsTrigger>
                        <TabsTrigger value="bar">Vertical</TabsTrigger>
                        <TabsTrigger value="pie">Pie</TabsTrigger>
                        <TabsTrigger value="donut">Donut</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                    {chartType.includes('bar') ? (
                        <RechartsBarChart data={chartData} layout={chartType === 'hbar' ? 'vertical' : 'horizontal'} margin={chartType === 'hbar' ? {left: 80} : {}}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type={chartType === 'hbar' ? 'number' : 'category'} dataKey={chartType === 'hbar' ? 'value' : 'name'} />
                            <YAxis type={chartType === 'hbar' ? 'category' : 'number'} dataKey={chartType === 'hbar' ? 'name' : 'value'} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" name="Frequency" fill={COLORS[0]} />
                        </RechartsBarChart>
                    ) : (
                        <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={p => `${p.name} (${p.value})`} hole={chartType === 'donut' ? 0.4 : 0}>
                                {chartData.map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<ChartTooltipContent />} />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
};

const BestWorstAnalysisDisplay = ({ question, responses }: { question: Question; responses: any[] }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const runAnalysis = useCallback(async () => {
        const relevantResponses = responses.map(r => r.answers[question.id]).filter(Boolean);
        if (relevantResponses.length === 0) {
            toast({ title: 'No data to analyze', variant: 'destructive' });
            return;
        }

        const data = relevantResponses.map(r => ({
            best_choice: r.best,
            worst_choice: r.worst,
        }));
        
        setIsLoading(true);
        try {
            const response = await fetch('/api/analysis/maxdiff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, bestCol: 'best_choice', worstCol: 'worst_choice' })
            });
            if (!response.ok) throw new Error('Analysis failed');
            const result = await response.json();
            setAnalysisResult(result);
        } catch (error: any) {
             toast({ title: 'Analysis Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [question.id, responses, toast]);
    
    useEffect(() => {
        runAnalysis();
    }, [runAnalysis]);

    if (isLoading) return <Card><CardHeader><CardTitle>{question.text}</CardTitle></CardHeader><CardContent><Skeleton className="h-64 w-full"/></CardContent></Card>;
    if (!analysisResult) return <Card><CardHeader><CardTitle>{question.text}</CardTitle></CardHeader><CardContent><p>No responses or analysis failed.</p><Button onClick={runAnalysis}>Retry</Button></CardContent></Card>;

    const plotData = useMemo(() => {
        return [{
            y: analysisResult.results.map((d: any) => d.item).reverse(),
            x: analysisResult.results.map((d: any) => d.best_pct).reverse(),
            name: 'Best %',
            type: 'bar',
            orientation: 'h',
            marker: { color: COLORS[4]}
        },
        {
            y: analysisResult.results.map((d: any) => d.item).reverse(),
            x: analysisResult.results.map((d: any) => -d.worst_pct).reverse(),
            name: 'Worst %',
            type: 'bar',
            orientation: 'h',
            marker: { color: COLORS[0] }
        }]
    }, [analysisResult]);

    return (
        <Card>
            <CardHeader><CardTitle>{question.text} - Best/Worst Analysis</CardTitle></CardHeader>
            <CardContent>
                <Plot 
                    data={plotData}
                    layout={{
                        barmode: 'overlay',
                        title: 'Best/Worst Scores',
                        xaxis: { title: 'Percentage' },
                        height: 400,
                        autosize: true
                    }}
                    style={{width: '100%', height: '100%'}}
                    useResizeHandler
                />
            </CardContent>
        </Card>
    );
};


const MatrixAnalysisDisplay = ({ question, responses }: { question: Question, responses: any[] }) => {
    // Placeholder implementation
    return (
        <Card>
            <CardHeader><CardTitle>{question.text}</CardTitle></CardHeader>
            <CardContent>
                <p>Matrix Analysis coming soon.</p>
            </CardContent>
        </Card>
    )
};


// Main Component
export default function SurveyApp1() {
  const [currentStep, setCurrentStep] = useState(0);
  const [survey, setSurvey] = useState<Survey>({
    title: 'New Survey',
    description: '',
    questions: [],
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
  });
  const [surveyUrl, setSurveyUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { toast } = useToast();
  const [responses, setResponses] = useState<any[]>([]);
  const [surveyId, setSurveyId] = useState<string>('');

  useEffect(() => {
    // This effect runs once on mount to load data from localStorage.
    const id = `survey1-${survey.title.replace(/\s+/g, '-')}`;
    setSurveyId(id);

    const savedSurvey = localStorage.getItem(id);
    const savedResponses = localStorage.getItem(`${id}_responses`);

    if (savedSurvey) {
      setSurvey(JSON.parse(savedSurvey));
    }
    if (savedResponses) {
      setResponses(JSON.parse(savedResponses));
    }
  }, []); // Empty dependency array ensures this runs only once

  const questionTypeCategories = {
    'Choice': [
        { id: 'single', icon: CircleDot, label: 'Single Selection', options: ["Option 1", "Option 2"], color: 'text-blue-500' },
        { id: 'multiple', icon: CheckSquare, label: 'Multiple Selection', options: ["Option 1", "Option 2"], color: 'text-green-500' },
        { id: 'dropdown', icon: ChevronDown, label: 'Dropdown', options: ["Option 1", "Option 2"], color: 'text-cyan-500' },
        { id: 'best-worst', icon: ThumbsUp, label: 'Best/Worst Choice', items: ["Item 1", "Item 2", "Item 3", "Item 4"], color: 'text-amber-500' },
    ],
    'Input': [
        { id: 'text', icon: CaseSensitive, label: 'Text Input', color: 'text-slate-500' },
        { id: 'number', icon: Sigma, label: 'Number Input', color: 'text-fuchsia-500' },
        { id: 'phone', icon: Phone, label: 'Phone Input', color: 'text-indigo-500' },
        { id: 'email', icon: Mail, label: 'Email Input', color: 'text-rose-500' },
    ],
    'Scale': [
        { id: 'rating', icon: Star, label: 'Rating', scale: ['1', '2', '3', '4', '5'], color: 'text-yellow-500' },
        { id: 'nps', icon: Share2, label: 'Net Promoter Score', color: 'text-sky-500' },
    ],
    'Structure': [
         { id: 'description', icon: FileText, label: 'Description Block', color: 'text-gray-400' },
         { id: 'matrix', icon: Grid3x3, label: 'Matrix', rows: ['Row 1', 'Row 2'], columns: ['Col 1', 'Col 2'], scale: ['Label 1', 'Label 2'], color: 'text-purple-500' },
    ]
};

  const addQuestion = (type: QuestionType) => {
    let questionConfig;
    Object.values(questionTypeCategories).flat().forEach(t => {
      if (t.id === type) {
        questionConfig = t;
      }
    });

    if (!questionConfig) return;

    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: type,
      text: `New ${questionConfig.label} Question`,
      title: `New ${questionConfig.label} Question`,
    };

    if ('options' in questionConfig) {
        newQuestion.options = [...questionConfig.options];
    }
     if ('items' in questionConfig) {
        newQuestion.items = [...(questionConfig as any).items];
    }
    if (type === 'description') {
        newQuestion.content = 'Enter your description or instructions here...';
    }
    if (type === 'matrix') {
        newQuestion.rows = ['Row 1', 'Row 2'];
        newQuestion.columns = ['Col 1', 'Col 2'];
        newQuestion.scale = ['Label 1', 'Label 2'];
    }

    setSurvey(
      produce((draft) => {
        draft.questions.push(newQuestion);
      })
    );
  };

  const updateQuestion = (id: string, newProps: Partial<Question>) => {
    setSurvey(
      produce((draft) => {
        const question = draft.questions.find((q) => q.id === id);
        if (question) {
          Object.assign(question, newProps);
        }
      })
    );
  };
  
  const deleteQuestion = (id: string) => {
      setSurvey(produce(draft => {
          draft.questions = draft.questions.filter(q => q.id !== id);
      }))
  }
  
  const nextStep = () => setCurrentStep(p => Math.min(p + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 0));

  const saveSurvey = () => {
    localStorage.setItem(surveyId, JSON.stringify(survey));
    toast({ title: 'Survey Saved!', description: 'Your survey draft has been saved locally.' });
    return surveyId;
  };

  const saveAndShare = () => {
    const id = saveSurvey();
    const url = `${window.location.origin}/survey/view/general/${id}`;
    setSurveyUrl(url);
    setIsShareModalOpen(true);
    generateQrCode(url);
  };

  const generateQrCode = async (url: string) => {
    if (!url) return;
    setIsLoadingQr(true);
    try {
        const response = await fetch(`/api/generate-qr-code?data=${encodeURIComponent(url)}`);
        if(!response.ok) throw new Error('Failed to generate QR code');
        const result = await response.json();
        setQrCodeUrl(result.image);
    } catch (error) {
         toast({ title: "QR Code Error", description: "Could not generate QR code.", variant: "destructive" });
    } finally {
        setIsLoadingQr(false);
    }
};

  const copyUrlToClipboard = async () => {
    if (!surveyUrl) return;
    try {
        await navigator.clipboard.writeText(surveyUrl);
        toast({ title: 'Copied to Clipboard' });
    } catch (error) {
        toast({ title: 'Failed to copy', variant: 'destructive' });
    }
};

const downloadQrCode = () => {
    if (qrCodeUrl) {
        const link = document.createElement('a');
        link.href = qrCodeUrl;
        link.download = `survey-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

const handleDateChange = (dateRange: DateRange | undefined) => {
    setSurvey(produce(draft => {
        draft.startDate = dateRange?.from;
        draft.endDate = dateRange?.to;
    }));
};

  const renderContent = () => {
    switch (currentStep) {
        case 0:
            return (
                 <Card>
                    <CardHeader>
                        <CardTitle>1. Survey Setup</CardTitle>
                        <CardDescription>Give your survey a title and a brief description.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                        <Label htmlFor="survey-title">Title</Label>
                        <Input
                            id="survey-title"
                            value={survey.title}
                            onChange={(e) => setSurvey(produce(draft => { draft.title = e.target.value; }))}
                        />
                        </div>
                        <div>
                        <Label htmlFor="survey-description">Description</Label>
                        <Textarea
                            id="survey-description"
                            value={survey.description}
                            onChange={(e) => setSurvey(produce(draft => { draft.description = e.target.value; }))}
                        />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={nextStep}>Next: Build Questions <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </CardFooter>
                </Card>
            );
        case 1:
            return (
                <div className="grid md:grid-cols-12 gap-6">
                    <div className="md:col-span-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Toolbox</CardTitle>
                            </CardHeader>
                             <CardContent className="space-y-2">
                                {Object.entries(questionTypeCategories).map(([category, types]) => (
                                    <div key={category}>
                                        <h3 className="text-sm font-semibold text-muted-foreground px-2 my-2">{category}</h3>
                                        {types.map((type) => (
                                            <Button
                                                key={type.id}
                                                variant="ghost"
                                                className="w-full justify-start"
                                                onClick={() => addQuestion(type.id as QuestionType)}
                                            >
                                                <type.icon className={cn("mr-2 h-4 w-4", type.color)} /> {type.label}
                                            </Button>
                                        ))}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-9">
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center">
                                <div>
                                    <CardTitle>2. Build Your Survey</CardTitle>
                                    <CardDescription>Add and edit the questions for your survey.</CardDescription>
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline"><Eye className="mr-2 h-4 w-4"/> Preview</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                        <DialogHeader>
                                            <DialogTitle>{survey.title}</DialogTitle>
                                            <DialogDescription>{survey.description}</DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="max-h-[70vh] p-4">
                                            <div className="space-y-4">
                                                <p>Preview functionality is not fully implemented in this view.</p>
                                            </div>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {survey.questions.map((q) => (
                                    <QuestionEditor 
                                        key={q.id}
                                        question={q}
                                        onUpdate={updateQuestion}
                                        onDelete={deleteQuestion}
                                    />
                                ))}
                                {survey.questions.length === 0 && (
                                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                        <p>Add questions from the toolbox.</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Setup</Button>
                                <div className="flex gap-2">
                                     <Button variant="secondary" onClick={saveSurvey}>
                                        <Save className="mr-2 h-4 w-4" /> Save Draft
                                    </Button>
                                    <Button onClick={nextStep}>Next: Settings <ArrowRight className="mr-2 h-4 w-4" /></Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            );
        case 2:
            return (
                <Card>
                     <CardHeader>
                        <CardTitle>3. Survey Settings</CardTitle>
                        <CardDescription>Configure the active period and other settings for your survey.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Survey Period</Label>
                             <DatePickerWithRange 
                                date={{ from: survey.startDate, to: survey.endDate }}
                                onDateChange={handleDateChange}
                             />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Build</Button>
                        <Button onClick={nextStep}>Next: Share & Analyze <ArrowRight className="mr-2 h-4 w-4" /></Button>
                    </CardFooter>
                </Card>
            );
        case 3:
            return (
                <Tabs defaultValue="share" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="share">Share</TabsTrigger>
                        <TabsTrigger value="analyze">Analyze</TabsTrigger>
                    </TabsList>
                    <TabsContent value="share">
                        <Card>
                            <CardHeader>
                                <CardTitle>4. Share & Analyze</CardTitle>
                                <CardDescription>Your survey is ready! Share the link to start collecting responses.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center space-y-6">
                                <div className="flex justify-center">
                                    <Button size="lg" onClick={saveAndShare}><Share2 className="mr-2 h-4 w-4"/> Save and Get Share Link</Button>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-start">
                                <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    <TabsContent value="analyze">
                        <Card>
                            <CardHeader><CardTitle>Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {responses.length > 0 ? (
                                    survey.questions.map(q => {
                                        if (q.type === 'matrix') {
                                            return <MatrixAnalysisDisplay key={q.id} question={q} responses={responses} />
                                        } else if (q.type === 'best-worst') {
                                            return <BestWorstAnalysisDisplay key={q.id} question={q} responses={responses} />
                                        }
                                        return <AnalysisResultDisplay key={q.id} question={q} responses={responses} />
                                    })
                                ) : (
                                    <p>No responses yet.</p>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            );
        default: return null;
    }
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-6xl mx-auto">
        <div className="flex justify-center items-center mb-8">
            {STEPS.map((step, index) => (
            <React.Fragment key={step}>
                <div className="flex flex-col items-center cursor-pointer" onClick={() => setCurrentStep(index)}>
                <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentStep === index
                        ? 'bg-primary text-primary-foreground scale-110'
                        : currentStep > index 
                        ? 'bg-primary/50 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                >
                    {index + 1}
                </div>
                <p className={`mt-2 text-sm text-center ${currentStep >= index ? 'font-semibold' : 'text-muted-foreground'}`}>{step}</p>
                </div>
                {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${currentStep > index ? 'bg-primary' : 'bg-muted'}`} />
                )}
            </React.Fragment>
            ))}
        </div>
        {renderContent()}

        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share Your Survey</DialogTitle>
                    <DialogDescription>Use the link or QR code to test or share it.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="survey-link">Shareable Link</Label>
                        <div className="flex items-center gap-2">
                            <Input id="survey-link" value={surveyUrl} readOnly />
                            <Button variant="outline" size="icon" onClick={copyUrlToClipboard}><Copy className="w-4 h-4" /></Button>
                        </div>
                    </div>
                    <div>
                        <Label>QR Code</Label>
                        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                            {isLoadingQr ? <Loader2 className="w-8 h-8 animate-spin" /> : qrCodeUrl ? <Image src={qrCodeUrl} alt="QR Code" width={200} height={200}/> : <p>QR code not available.</p>}
                            <Button variant="outline" disabled={!qrCodeUrl || isLoadingQr} onClick={downloadQrCode}><Download className="mr-2" /> Download</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button className="w-full" asChild>
                        <a href={surveyUrl} target="_blank" rel="noopener noreferrer">Launch Kiosk</a>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

export default SurveyApp1;

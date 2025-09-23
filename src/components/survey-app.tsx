

'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ClipboardList,
  LayoutDashboard,
  BarChart2,
  ArrowLeft,
  CircleDot,
  CheckSquare,
  CaseSensitive,
  Star,
  PlusCircle,
  Trash2,
  Eye,
  Shuffle,
  FileText,
  Save,
  Info,
  Link as LinkIcon,
  QrCode,
  Download,
  Copy,
  Users,
  EyeIcon,
  TrendingUp,
  Laptop,
  Palette,
  Grid3x3,
  ThumbsUp,
  Sigma,
  MessageSquareQuote,
  Target,
  Sparkles,
  MoveRight,
  ImageIcon,
  GripVertical,
  Smartphone,
  Tablet,
  Monitor,
  Loader2,
  FileDown,
  Share2,
  Phone,
  Mail,
  Award,
  Frown,
  Lightbulb,
  AlertTriangle,
  ShoppingCart,
  ShieldCheck,
  BeakerIcon,
  ShieldAlert,
  Move,
  BarChart,
  PieChart as PieChartIcon,
  DollarSign,
  ZoomIn,
  ZoomOut,
  AreaChart,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import dynamic from 'next/dynamic';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveContainer, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar as RechartsBar, LineChart, Line, ScatterChart, Scatter, ReferenceLine, Label as RechartsLabel, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { produce } from 'immer';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
const VanWestendorpPage = dynamic(() => import('@/components/pages/van-westendorp-page'), { ssr: false });

// Template Definition
const ipaTemplate = {
  title: 'Importance-Performance Analysis Survey',
  description: 'Evaluate the importance and performance of various attributes.',
  questions: [
    {
      id: 1,
      type: 'matrix',
      title: 'Attribute Satisfaction',
      description: 'Please rate your satisfaction with our performance on the following attributes.',
      rows: ['Attribute 1', 'Attribute 2', 'Attribute 3', 'Attribute 4'],
      columns: ['1', '2', '3', '4', '5'],
      scale: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
      required: true
    },
    {
      id: 2,
      type: 'rating',
      title: 'Overall, how satisfied are you with our service?',
      scale: ['1', '2', '3', '4', '5', '6', '7'],
      required: true
    }
  ],
  isIpaTemplate: true
};

const retailTemplate = {
    title: 'Retail Customer Survey',
    description: 'Please provide feedback on your recent experience to help us improve.',
    questions: [
        { id: 1, type: 'single', title: 'Which age group do you belong to?', options: ['20s', '30s', '40s', '50s', '60+'], required: true },
        { id: 2, type: 'rating', title: 'Overall, how satisfied are you with our service?', required: true, scale: ['1','2','3','4','5'] },
        { id: 3, type: 'nps', title: 'How likely are you to recommend us to a friend or colleague?', required: true },
        { id: 4, type: 'number', title: 'How many times have you purchased from us in the last 6 months?', required: false },
        { id: 5, type: 'number', title: 'Approximately, what is your average spend per visit?', required: false },
        { id: 6, type: 'single', title: 'Are you a new or existing customer?', options: ['New Customer', 'Existing Customer'], required: true },
        { id: 7, type: 'text', title: 'Do you have any other comments or suggestions?', required: false },
    ],
    isRetailTemplate: true
};

const servqualTemplate = {
    title: 'Service Quality Survey (SERVQUAL)',
    description: 'Please rate your expectations and perceptions for the following service quality attributes.',
    questions: [
        { 
            id: 1,
            type: 'matrix',
            title: 'Tangibles (Physical facilities, equipment, and appearance of personnel)',
            rows: [
                'Excellent companies will have modern-looking equipment.',
                'The physical facilities at excellent companies will be visually appealing.',
                'Employees at excellent companies will be neat in appearance.',
                'Materials associated with the service (such as pamphlets or statements) will be visually appealing at an excellent company.'
            ],
            columns: ['Expectation', 'Perception'],
            scale: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'],
            required: true
        },
         { 
            id: 2,
            type: 'matrix',
            title: 'Reliability (Ability to perform the promised service dependably and accurately)',
            rows: [
                'When excellent companies promise to do something by a certain time, they will do so.',
                'When you have a problem, excellent companies will show a sincere interest in solving it.',
                'Excellent companies will perform the service right the first time.',
                'Excellent companies will provide their services at the time they promise to do so.',
                'Excellent companies will insist on error-free records.'
            ],
            columns: ['Expectation', 'Perception'],
            scale: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'],
            required: true
        }
    ],
    isServqualTemplate: true
};

const psmTemplate = {
  title: 'Product Price Sensitivity Survey',
  description: 'Help us understand the right price for our new product.',
  questions: [
    {
      id: 1,
      type: 'number',
      title: 'At what price would you consider the product to be SO CHEAP that you would doubt its quality?'
    },
    {
      id: 2,
      type: 'number',
      title: 'At what price would you consider the product to be a BARGAIN — a great buy for the money?'
    },
    {
      id: 3,
      type: 'number',
      title: 'At what price would you consider the product to be EXPENSIVE, but you would still consider buying it?'
    },
    {
      id: 4,
      type: 'number',
      title: 'At what price would you consider the product to be SO EXPENSIVE that you would not consider buying it?'
    }
  ],
  isPsmTemplate: true
};


const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Draggable Question Wrapper
const DraggableQuestion = ({ id, children }: { id: any, children: React.ReactNode }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: id});
    
    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-2">
            <div {...attributes} {...listeners} className="p-2 cursor-grab mt-1">
                <GripVertical className="w-5 h-5 text-muted-foreground"/>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
};


// Question Components
const SingleSelectionQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        onUpdate?.({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...question.options, `Option ${question.options.length + 1}`];
        onUpdate?.({ ...question, options: newOptions });
    };

    const deleteOption = (index: number) => {
        const newOptions = question.options.filter((_:any, i:number) => i !== index);
        onUpdate?.({ ...question, options: newOptions });
    };

    return (
        <div className={cn("p-4", cardClassName)}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
                     {question.required && <span className="text-destructive text-xs">* Required</span>}
                </div>
                {!isPreview && (
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                          <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                          <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Info className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}>
                            <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                    </div>
                )}
            </div>
            {question.imageUrl && (
                 <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
            <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-2" disabled={isPreview}>
                {question.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 group">
                        <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                        <Input 
                            placeholder={`Option ${index + 1}`} 
                            className="border-none focus:ring-0 p-0" 
                            readOnly={isPreview} 
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                        />
                         {!isPreview && (
                             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteOption(index)}>
                                <Trash2 className="w-4 h-4 text-destructive"/>
                            </Button>
                        )}
                    </div>
                ))}
            </RadioGroup>
             {!isPreview && (
                <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Option
                </Button>
            )}
        </div>
    );
};

const MultipleSelectionQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string[]; onAnswerChange?: (newAnswer: string[]) => void; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
    const handleOptionChange = (index: number, value: string) => {
       const newOptions = [...question.options];
       newOptions[index] = value;
       onUpdate?.({ ...question, options: newOptions });
   };

   const addOption = () => {
       const newOptions = [...question.options, `Option ${question.options.length + 1}`];
       onUpdate?.({ ...question, options: newOptions });
   };

   const deleteOption = (index: number) => {
       const newOptions = question.options.filter((_:any, i:number) => i !== index);
       onUpdate?.({ ...question, options: newOptions });
   };

   const handleCheckChange = (checked: boolean, opt: string) => {
       if (!onAnswerChange) return;
       const currentAnswers = answer || [];
       const newAnswers = checked
           ? [...currentAnswers, opt]
           : currentAnswers.filter((a: string) => a !== opt);
       onAnswerChange(newAnswers);
   }
   
   return (
       <div className={cn("p-4", cardClassName)}>
           <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
                     {question.required && <span className="text-destructive text-xs">* Required</span>}
                </div>
               {!isPreview && (
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                          <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                          <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </Button>
                       <Button variant="ghost" size="icon">
                           <Info className="w-5 h-5 text-muted-foreground" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}>
                           <Trash2 className="w-5 h-5 text-destructive" />
                       </Button>
                   </div>
               )}
           </div>
           {question.imageUrl && (
                 <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
           <div className="space-y-2">
                {question.options.map((option: string, index: number) => (
                   <div key={index} className="flex items-center space-x-2 group">
                       <Checkbox
                           id={`q${question.id}-o${index}`}
                           disabled={isPreview}
                           checked={answer?.includes(option)}
                           onCheckedChange={(checked) => handleCheckChange(!!checked, option)}
                       />
                       <Input 
                           placeholder={`Option ${index + 1}`} 
                           className="border-none focus:ring-0 p-0" 
                           readOnly={isPreview} 
                           value={option}
                           onChange={(e) => handleOptionChange(index, e.target.value)}
                       />
                       {!isPreview && (
                           <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteOption(index)}>
                               <Trash2 className="w-4 h-4 text-destructive"/>
                           </Button>
                       )}
                   </div>
               ))}
           </div>
            {!isPreview && (
               <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                   <PlusCircle className="w-4 h-4 mr-2" /> Add Option
               </Button>
           )}
       </div>
   );
};

const TextAnalysisDisplay = ({ tableData, varName }: { tableData: any[], varName: string; }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [wordCloudImage, setWordCloudImage] = useState<string | null>(null);
    const [frequencies, setFrequencies] = useState<{ word: string, count: number }[]>([]);
    const [excludedWords, setExcludedWords] = useState<string[]>([]);

    const generateCloud = useCallback(async (stopwords: string[]) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/analysis/wordcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: tableData.join('\n'),
                    customStopwords: stopwords.join(',')
                })
            });
            if (!response.ok) throw new Error('Failed to generate word cloud');
            const result = await response.json();
            if (result.plots?.wordcloud) {
                setWordCloudImage(result.plots.wordcloud);
                setFrequencies(Object.entries(result.frequencies).map(([word, count]) => ({ word, count: count as number })));
            } else {
                throw new Error('Word cloud image not found in response');
            }
        } catch (error) {
            console.error("Word cloud generation failed", error);
            setWordCloudImage(null);
        } finally {
            setIsLoading(false);
        }
    }, [tableData]);

    useEffect(() => {
        if (tableData.length > 0) {
            generateCloud(excludedWords);
        } else {
            setIsLoading(false);
        }
    }, [tableData, excludedWords, generateCloud]);
    
    const handleExcludeWord = (word: string) => {
        if (!excludedWords.includes(word)) {
            setExcludedWords([...excludedWords, word]);
        }
    };
    
    const handleRestoreWord = (word: string) => {
        setExcludedWords(excludedWords.filter(w => w !== word));
    }

    return (
        <AnalysisDisplayShell varName={varName}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Word Cloud</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        {isLoading ? <Skeleton className="w-full h-[300px]" /> : wordCloudImage ? <Image src={wordCloudImage} alt="Word Cloud" width={500} height={300} className="rounded-md" /> : <p>Could not generate word cloud.</p>}
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Word Frequencies</CardTitle></CardHeader>
                        <CardContent>
                             <ScrollArea className="h-64">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Word</TableHead><TableHead className="text-right">Count</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {frequencies.map(({ word, count }) => (
                                            <TableRow key={word}>
                                                <TableCell>{word}</TableCell>
                                                <TableCell className="text-right">{count}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExcludeWord(word)}>
                                                        <Trash2 className="w-4 h-4 text-destructive"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    {excludedWords.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Excluded Words</CardTitle></CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {excludedWords.map(word => (
                                    <Badge key={word} variant="secondary" className="cursor-pointer" onClick={() => handleRestoreWord(word)}>
                                        {word} <X className="ml-1 h-3 w-3" />
                                    </Badge>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AnalysisDisplayShell>
    );
};

const TextQuestion = ({ question, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; onDelete?: (id: number) => void; onUpdate?: (q:any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
  <div className={cn("p-4", cardClassName)}>
    <div className="flex justify-between items-start mb-4">
       <div className="flex-1">
          <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0" readOnly={isPreview} />
          {question.required && <span className="text-destructive text-xs">* Required</span>}
      </div>
      {!isPreview && onDelete && (
        <div className="flex items-center">
            <div className="flex items-center space-x-2 mr-2">
              <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
              <Label htmlFor={`required-${question.id}`}>Required</Label>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
        </div>
      )}
    </div>
    {question.imageUrl && (
        <div className="my-4">
            <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
        </div>
    )}
    <Textarea placeholder="User answer..." disabled />
  </div>
);

const NumberQuestion = ({ question, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
    <div className={cn("p-4", cardClassName)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
            <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0" readOnly={isPreview} />
            {question.required && <span className="text-destructive text-xs">* Required</span>}
        </div>
        {!isPreview && (
            <div className="flex items-center">
                 <div className="flex items-center space-x-2 mr-2">
                    <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                    <Label htmlFor={`required-${question.id}`}>Required</Label>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
            </div>
        )}
      </div>
        {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
      <Input type="number" placeholder="User enters a number..." disabled />
    </div>
);

const PhoneQuestion = ({ question, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
    <div className={cn("p-4", cardClassName)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
            <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0" readOnly={isPreview} />
            {question.required && <span className="text-destructive text-xs">* Required</span>}
        </div>
        {!isPreview && (
            <div className="flex items-center">
                 <div className="flex items-center space-x-2 mr-2">
                    <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                    <Label htmlFor={`required-${question.id}`}>Required</Label>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
            </div>
        )}
      </div>
        {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
      <Input type="tel" placeholder="User enters a phone number..." disabled />
    </div>
);

const EmailQuestion = ({ question, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
    <div className={cn("p-4", cardClassName)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
            <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0" readOnly={isPreview} />
            {question.required && <span className="text-destructive text-xs">* Required</span>}
        </div>
        {!isPreview && (
            <div className="flex items-center">
                 <div className="flex items-center space-x-2 mr-2">
                    <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                    <Label htmlFor={`required-${question.id}`}>Required</Label>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
            </div>
        )}
      </div>
        {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
      <Input type="email" placeholder="User enters an email address..." disabled />
    </div>
);

const RatingQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer: number; onAnswerChange: (value: number) => void; onDelete?: (id: number) => void; onUpdate?: (q:any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
  const ratingScale = question.scale || ['1', '2', '3', '4', '5'];
  
  return (
    <div className={cn("p-4", cardClassName)}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
              <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
              {question.required && <span className="text-destructive text-xs">* Required</span>}
          </div>
          <div className="flex items-center">
              {!isPreview && (
                  <div className="flex items-center space-x-2 mr-2">
                      <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                      <Label htmlFor={`required-${question.id}`}>Required</Label>
                  </div>
              )}
              {!isPreview && (
                   <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </Button>
              )}
              {!isPreview && (
              <Button variant="ghost" size="icon">
                  <Info className="w-5 h-5 text-muted-foreground" />
              </Button>
              )}
              {!isPreview && onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}>
                  <Trash2 className="w-5 h-5 text-destructive" />
              </Button>
              )}
          </div>
      </div>
      {question.imageUrl && (
          <div className="my-4">
              <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
          </div>
      )}
      <div className="flex items-center gap-2">
        {ratingScale.map((ratingValue: any, index: number) => (
          <Star key={index} className={cn("w-8 h-8 text-yellow-400", isPreview && "cursor-pointer hover:text-yellow-500 transition-colors", (index + 1) <= answer && "fill-yellow-400")} onClick={() => onAnswerChange(index + 1)}/>
        ))}
      </div>
    </div>
  );
};


const NPSQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: number; onAnswerChange?: (value: number) => void; onDelete?: (id: number) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
    <div className={cn("p-4", cardClassName)}>
       <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
            <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
            {question.required && <span className="text-destructive text-xs">* Required</span>}
        </div>
          <div className="flex items-center">
              {!isPreview && (
                <div className="flex items-center space-x-2 mr-2">
                    <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                    <Label htmlFor={`required-${question.id}`}>Required</Label>
                </div>
              )}
              {!isPreview && (
                   <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </Button>
              )}
              {!isPreview && (
              <Button variant="ghost" size="icon">
                  <Info className="w-5 h-5 text-muted-foreground" />
              </Button>
              )}
              {!isPreview && onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}>
                  <Trash2 className="w-5 h-5 text-destructive" />
              </Button>
              )}
          </div>
      </div>
      {question.imageUrl && (
          <div className="my-4">
              <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
          </div>
      )}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {[...Array(11)].map((_, i) => (
            <Button key={i} variant={answer === i ? 'default' : 'outline'} size="icon" className="h-10 w-8 text-xs transition-transform hover:scale-110 active:scale-95" onClick={() => onAnswerChange?.(i)}>
                {i}
            </Button>
        ))}
      </div>
       <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
      </div>
    </div>
  );

const DescriptionBlock = ({ question, onDelete, onUpdate, isPreview, cardClassName }: { question: any; onDelete?: (id: number) => void; onUpdate?: (q:any) => void; isPreview?: boolean; cardClassName?: string; }) => (
    <div className={cn("p-4 bg-muted/20", cardClassName)}>
      <div className="flex justify-end items-center mb-2">
        {!isPreview && onDelete && (
          <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}>
              <Trash2 className="w-5 h-5 text-destructive" />
          </Button>
        )}
      </div>
      <Textarea 
        placeholder="Enter your description or instructions here..." 
        className="text-base border-none focus:ring-0 p-0 bg-transparent" 
        readOnly={isPreview}
        value={question.content}
        onChange={(e) => onUpdate?.({...question, content: e.target.value})}
      />
    </div>
);

const BestWorstQuestion = ({ question, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any, onDelete?: (id: number) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...question.items];
        newItems[index] = value;
        onUpdate?.({ ...question, items: newItems });
    };

    const addItem = () => {
        const newItems = [...question.items, `New Item`];
        onUpdate?.({ ...question, items: newItems });
    };

    const deleteItem = (index: number) => {
        const newItems = question.items.filter((_:any, i:number) => i !== index);
        onUpdate?.({ ...question, items: newItems });
    };

    return (
        <div className={cn("p-4", cardClassName)}>
            <div className="flex justify-between items-start mb-4">
                 <div className="flex-1">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
                    {question.required && <span className="text-destructive text-xs">* Required</span>}
                </div>
                {!isPreview && (
                    <div className="flex items-center">
                         <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                )}
            </div>
            {question.imageUrl && (
                <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
            <div>
                <h4 className="font-semibold mb-2">Items to evaluate</h4>
                <div className="space-y-2">
                    {question.items.map((item: string, index: number) => (
                         <div key={index} className="flex items-center space-x-2 group">
                            <Input value={item} onChange={e => handleItemChange(index, e.target.value)} readOnly={isPreview} />
                            {!isPreview && <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => deleteItem(index)}><Trash2 className="w-4 h-4 text-destructive"/></Button>}
                        </div>
                    ))}
                    {!isPreview && <Button variant="link" size="sm" onClick={addItem}><PlusCircle className="w-4 h-4 mr-2" /> Add Item</Button>}
                </div>
            </div>
        </div>
    );
};

const MatrixQuestion = ({ question, answer, onAnswerChange, onUpdate, onDelete, isPreview, cardClassName }: { question: any, answer: any, onAnswerChange?: (value: any) => void, onUpdate?: (q:any) => void, onDelete?: (id: number) => void, isPreview?: boolean, cardClassName?: string }) => {
    const handleRowChange = (index: number, value: string) => {
        onUpdate?.(produce(question, (draft: any) => { draft.rows[index] = value; }));
    };
    const handleColumnChange = (index: number, value: string) => {
        onUpdate?.(produce(question, (draft: any) => { draft.scale[index] = value; }));
    };
    const addRow = () => {
        onUpdate?.(produce(question, (draft: any) => { draft.rows.push(`New Row`); }));
    };
    const deleteRow = (index: number) => {
        onUpdate?.(produce(question, (draft: any) => { draft.rows.splice(index, 1); }));
    };
    const addColumn = () => {
        onUpdate?.(produce(question, (draft: any) => {
            const newColNum = draft.columns.length + 1;
            draft.columns.push(String(newColNum));
            if (draft.scale.length < newColNum) {
                draft.scale.push(`Label ${newColNum}`);
            }
        }));
    };
    const deleteColumn = (index: number) => {
        onUpdate?.(produce(question, (draft: any) => {
            if (draft.columns.length > 1) {
                draft.columns.splice(index, 1);
                if (draft.scale.length > index) {
                    draft.scale.splice(index, 1);
                }
            }
        }));
    };

    return (
        <div className={cn("p-4", cardClassName)}>
            <div className="flex justify-between items-start mb-4">
                 <div className="flex-1">
                    <Input placeholder="Enter matrix title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none p-0 focus-visible:ring-0" readOnly={isPreview} />
                    {question.required && <span className="text-destructive text-xs">* Required</span>}
                </div>
                {!isPreview && (
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                          <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                          <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}>
                            <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                    </div>
                )}
            </div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/3"></TableHead>
                        {question.columns?.map((col: string, colIndex: number) => (
                            <TableHead key={colIndex} className="text-center text-xs w-[80px] group relative">
                                <Input 
                                    value={question.scale?.[colIndex] || col} 
                                    onChange={(e) => handleColumnChange(colIndex, e.target.value)} 
                                    readOnly={isPreview}
                                    className="border-none text-center bg-transparent focus:ring-0 p-0"
                                />
                                 {!isPreview && (
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 absolute top-0 right-0" onClick={() => deleteColumn(colIndex)}>
                                        <X className="w-3 h-3 text-destructive"/>
                                    </Button>
                                )}
                            </TableHead>
                        ))}
                        {!isPreview && <TableHead><Button variant="ghost" size="icon" onClick={addColumn}><PlusCircle className="w-4 h-4" /></Button></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {question.rows?.map((row: string, rowIndex: number) => (
                        <TableRow key={rowIndex}>
                            <TableCell className="group relative">
                                {isPreview ? row : <Input value={row} onChange={e => handleRowChange(rowIndex, e.target.value)} className="border-none p-0 focus:ring-0" />}
                                {!isPreview && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-0" onClick={() => deleteRow(rowIndex)}>
                                        <Trash2 className="w-4 h-4 text-destructive"/>
                                    </Button>
                                )}
                            </TableCell>
                            <div role="radiogroup" className="contents">
                                {question.columns?.map((col: string, colIndex: number) => (
                                    <TableCell key={colIndex} className="text-center">
                                          <RadioGroupItem value={col} onClick={() => onAnswerChange?.(produce(answer || {}, (draft: any) => { draft[row] = col; }))} checked={answer?.[row] === col}/>
                                    </TableCell>
                                ))}
                            </div>
                            {!isPreview && <TableCell></TableCell>}
                         </TableRow>
                     ))}
                </TableBody>
            </Table>
            {!isPreview && (
                <Button variant="link" size="sm" onClick={addRow}><PlusCircle className="mr-2"/> Add Row</Button>
            )}
        </div>
    );
};


// --- Helper Functions for Rating Analysis ---
const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const standardDeviation = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
};

const getMode = (arr: (string | number)[]): (string | number | null) => {
    if (arr.length === 0) return null;
    const counts: { [key: string]: number } = {};
    arr.forEach(val => { 
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });
    let mode: string | number | null = null;
    let maxCount = 0;
    Object.entries(counts).forEach(([val, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mode = isNaN(Number(val)) ? val : Number(val);
        }
    });
    return mode;
};

const getMedian = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};


// New Star Display Component
const StarDisplay = ({ rating, total = 5, size = 'w-12 h-12' }: { rating: number, total?: number, size?: string }) => {
    const fullStars = Math.floor(rating);
    const partialStar = rating % 1;
    const emptyStars = total - Math.ceil(rating);

    return (
        <div className="flex items-center">
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} className={cn(size, 'text-yellow-400 fill-yellow-400')} />
            ))}
            {partialStar > 0 && (
                <div className="relative">
                    <Star className={cn(size, 'text-yellow-400')} />
                    <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${partialStar * 100}%` }}>
                        <Star className={cn(size, 'text-yellow-400 fill-yellow-400')} />
                    </div>
                </div>
            )}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} className={cn(size, 'text-yellow-400')} />
            ))}
        </div>
    );
};

const AnalysisDisplayShell = ({ children, varName }: { children: React.ReactNode, varName: string}) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{varName}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
};
  
const ChoiceAnalysisDisplay = ({ chartData, tableData, insightsData, varName }: { chartData: any, tableData: any[], insightsData: string[], varName: string }) => {
    const [chartType, setChartType] = useState<'hbar' | 'bar' | 'pie'>('hbar');

    const plotLayout = useMemo(() => {
        const baseLayout = {
            autosize: true,
            margin: { t: 40, b: 40, l: 40, r: 20 },
            xaxis: {
                title: chartType === 'hbar' ? 'Percentage' : '',
            },
            yaxis: {
                title: chartType === 'hbar' ? '' : 'Percentage',
            },
        };
        if (chartType === 'hbar') {
            baseLayout.yaxis = { autorange: 'reversed' as const };
            baseLayout.margin.l = 120;
        }
        if (chartType === 'bar') {
            baseLayout.xaxis.tickangle = -45;
        }
        return baseLayout;
    }, [chartType]);

    const plotData = useMemo(() => {
        const percentages = chartData.map((d: any) => parseFloat(d.percentage));
        const labels = chartData.map((d: any) => d.name);

        if (chartType === 'pie') {
            return [{
                values: percentages,
                labels: labels,
                type: 'pie',
                hole: 0.4,
                marker: { colors: COLORS },
                textinfo: 'label+percent',
                textposition: 'inside',
            }];
        }
        return [{
            y: chartType === 'hbar' ? labels : percentages,
            x: chartType === 'hbar' ? percentages : labels,
            type: 'bar',
            orientation: chartType === 'hbar' ? 'h' : 'v',
            marker: { color: 'hsl(var(--primary))' },
            text: percentages.map((p: number) => `${p.toFixed(1)}%`),
            textposition: 'auto',
        }];
    }, [chartType, chartData]);

    return (
        <AnalysisDisplayShell varName={varName}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex justify-between items-center">
                            Distribution
                             <div className="flex gap-1">
                                <Button variant={chartType === 'hbar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('hbar')}><BarChart className="w-4 h-4 -rotate-90" /></Button>
                                <Button variant={chartType === 'bar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('bar')}><BarChart className="w-4 h-4" /></Button>
                                <Button variant={chartType === 'pie' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('pie')}><PieChartIcon className="w-4 h-4" /></Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        <Plot
                            data={plotData}
                            layout={plotLayout}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: true, modeBarButtonsToRemove: ['select2d', 'lasso2d'] }}
                            useResizeHandler
                        />
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                        <CardContent className="max-h-[200px] overflow-y-auto">{
                            <Table>
                                <TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Percentage</TableHead></TableRow></TableHeader>
                                <TableBody>{tableData.map((item, index) => ( <TableRow key={`${item.name}-${index}`}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.count}</TableCell><TableCell className="text-right">{item.percentage}%</TableCell></TableRow> ))}</TableBody>
                            </Table>
                        }</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>{ <ul className="space-y-2 text-sm list-disc pl-4">{insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul> }</CardContent>
                    </Card>
                </div>
            </div>
        </AnalysisDisplayShell>
    );
};
  
const RatingAnalysisDisplay = ({ chartData, tableData, insightsData, varName, question }: { chartData: any, tableData: any, insightsData: string[], varName: string, question: any }) => {
    const ratingScale = question.scale || ['1', '2', '3', '4', '5'];
    
    return (
        <AnalysisDisplayShell varName={varName}>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Average Rating</CardTitle>
                    </CardHeader>
                     <CardContent className="flex items-center justify-center min-h-[300px]">
                        <Plot
                            data={[{
                                y: ['Average'],
                                x: [chartData.avg],
                                type: 'bar',
                                orientation: 'h',
                                text: [chartData.avg.toFixed(2)],
                                textposition: 'auto',
                                hoverinfo: 'none',
                                marker: { color: 'hsl(var(--primary))' },
                            }]}
                            layout={{
                                autosize: true,
                                margin: { t: 20, b: 40, l: 100, r: 20 },
                                xaxis: {
                                    range: [0, ratingScale.length],
                                    title: 'Rating'
                                },
                                yaxis: { showticklabels: false },
                            }}
                            style={{ width: '100%', height: '150px' }}
                            config={{ displayModeBar: true, modeBarButtonsToRemove: ['select2d', 'lasso2d'] }}
                            useResizeHandler
                        />
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Average Rating</TableCell><TableCell className="text-right">{tableData.avg.toFixed(3)}</TableCell></TableRow>
                                    <TableRow><TableCell>Median Rating</TableCell><TableCell className="text-right">{tableData.median}</TableCell></TableRow>
                                    <TableRow><TableCell>Mode</TableCell><TableCell className="text-right">{tableData.mode}</TableCell></TableRow>
                                    <TableRow><TableCell>Std. Deviation</TableCell><TableCell className="text-right">{tableData.stdDev.toFixed(3)}</TableCell></TableRow>
                                    <TableRow><TableCell>Total Responses</TableCell><TableCell className="text-right">{tableData.count}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm list-disc pl-4">
                                {insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AnalysisDisplayShell>
    );
};

const NumberAnalysisDisplay = ({ chartData, tableData, insightsData, varName }: { chartData: any, tableData: any, insightsData: string[], varName: string }) => {
    return (
      <AnalysisDisplayShell varName={varName}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Response Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        <Plot
                            data={[{ x: chartData.values, type: 'histogram' }]}
                            layout={{
                                autosize: true,
                                margin: { t: 40, b: 40, l: 40, r: 20 },
                                bargap: 0.1,
                            }}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: true, modeBarButtonsToRemove: ['select2d', 'lasso2d'] }}
                            useResizeHandler
                        />
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                         <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Mean</TableCell><TableCell className="text-right">{tableData.mean.toFixed(3)}</TableCell></TableRow>
                                    <TableRow><TableCell>Median</TableCell><TableCell className="text-right">{tableData.median}</TableCell></TableRow>
                                    <TableRow><TableCell>Mode</TableCell><TableCell className="text-right">{tableData.mode}</TableCell></TableRow>
                                    <TableRow><TableCell>Std. Deviation</TableCell><TableCell className="text-right">{tableData.stdDev.toFixed(3)}</TableCell></TableRow>
                                    <TableRow><TableCell>Minimum</TableCell><TableCell className="text-right">{tableData.min}</TableCell></TableRow>
                                    <TableRow><TableCell>Maximum</TableCell><TableCell className="text-right">{tableData.max}</TableCell></TableRow>
                                    <TableRow><TableCell>Total Responses</TableCell><TableCell className="text-right">{tableData.count}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                         </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>
                             <ul className="space-y-2 text-sm list-disc pl-4">
                                {insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
      </AnalysisDisplayShell>
    );
  };

const BestWorstAnalysisDisplay = ({ chartData, tableData, insightsData, varName }: { chartData: any, tableData: any[], insightsData: string[], varName: string }) => {
    return (
       <AnalysisDisplayShell varName={varName}>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Best-Worst Score</CardTitle>
                    </CardHeader>
                     <CardContent className="flex items-center justify-center min-h-[300px]">
                        <Plot
                            data={[{ ...chartData, type: 'bar' }]}
                            layout={{
                                autosize: true,
                                margin: { t: 20, b: 40, l: 100, r: 20 },
                                xaxis: { title: 'Best-Worst Score (Best count - Worst count)' },
                            }}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: true, modeBarButtonsToRemove: ['select2d', 'lasso2d'] }}
                            useResizeHandler
                        />
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Best Count</TableHead>
                                        <TableHead className="text-right">Worst Count</TableHead>
                                        <TableHead className="text-right">Net Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.map(item => (
                                        <TableRow key={item.name}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-right">{item.best}</TableCell>
                                            <TableCell className="text-right">{item.worst}</TableCell>
                                            <TableCell className="text-right font-bold">{item.score}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>
                             <ul className="space-y-2 text-sm list-disc pl-4">
                                {insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
       </AnalysisDisplayShell>
    );
};

const NPSAnalysisDisplay = ({ chartData, tableData, insightsData, varName }: { chartData: any, tableData: any, insightsData: string[], varName: string }) => {
    return (
        <AnalysisDisplayShell varName={varName}>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Net Promoter Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="text-7xl font-bold text-primary">{chartData.nps.toFixed(1)}</div>
                            <p className="text-muted-foreground">Net Promoter Score</p>
                            <div className="w-full pt-4">
                                <div className="flex w-full h-8 rounded-full overflow-hidden">
                                    <div className="bg-red-500" style={{ width: `${chartData.detractorsP}%` }} />
                                    <div className="bg-yellow-400" style={{ width: `${chartData.passivesP}%` }} />
                                    <div className="bg-green-500" style={{ width: `${chartData.promotersP}%` }} />
                                </div>
                                <div className="flex justify-between text-xs mt-1">
                                    <span>Detractors</span>
                                    <span>Passives</span>
                                    <span>Promoters</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                         <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Promoters (9-10)</TableCell><TableCell className="text-right">{tableData.promoters}</TableCell><TableCell className="text-right">{tableData.promotersP.toFixed(1)}%</TableCell></TableRow>
                                    <TableRow><TableCell>Passives (7-8)</TableCell><TableCell className="text-right">{tableData.passives}</TableCell><TableCell className="text-right">{tableData.passivesP.toFixed(1)}%</TableCell></TableRow>
                                    <TableRow><TableCell>Detractors (0-6)</TableCell><TableCell className="text-right">{tableData.detractors}</TableCell><TableCell className="text-right">{tableData.detractorsP.toFixed(1)}%</TableCell></TableRow>
                                    <TableRow className="font-bold border-t"><TableCell>NPS Score</TableCell><TableCell className="text-right" colSpan={2}>{tableData.nps.toFixed(1)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                         </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm list-disc pl-4">
                                {insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AnalysisDisplayShell>
    );
};

const KPICard = ({ title, value, status }: { title: string, value: string | number, status: 'excellent' | 'good' | 'warning' | 'poor' }) => {
    const statusClasses = {
        excellent: 'text-green-600 border-green-500',
        good: 'text-blue-600 border-blue-500',
        warning: 'text-amber-600 border-amber-500',
        poor: 'text-red-600 border-red-500',
    };
    return (
        <Card className={`relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:rounded-t-lg before:${statusClasses[status]}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-3xl font-bold ${statusClasses[status]}`}>{value}</div>
            </CardContent>
        </Card>
    );
};

const InsightCard = ({ insight }: { insight: any }) => {
    const insightStyles = {
        critical: { icon: <AlertTriangle className="h-5 w-5 text-red-600" />, card: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', title: 'text-red-800 dark:text-red-200' },
        warning: { icon: <Frown className="h-5 w-5 text-amber-600" />, card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', title: 'text-amber-800 dark:text-amber-200' },
        opportunity: { icon: <Lightbulb className="h-5 w-5 text-blue-600" />, card: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', title: 'text-blue-800 dark:text-blue-200' },
        excellent: { icon: <Award className="h-5 w-5 text-green-600" />, card: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', title: 'text-green-800 dark:text-green-200' },
    };
    const style = insightStyles[insight.type as keyof typeof insightStyles] || insightStyles.opportunity;
    return (
        <Card className={style.card}>
            <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-lg ${style.title}`}>
                    {style.icon}
                    {insight.title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{insight.text}</p>
                <div className="bg-background/50 p-3 rounded-md">
                    <p className="text-xs font-semibold">Recommended Action:</p>
                    <p className="text-xs text-muted-foreground">{insight.actions}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function pearsonCorrelation(arr1: (number | undefined)[], arr2: (number | undefined)[]): number {
    const validPairs = arr1.map((val1, i) => [val1, arr2[i]]).filter(pair => pair[0] !== undefined && pair[1] !== undefined);
    
    if (validPairs.length < 2) return 0;
    
    const x = validPairs.map(p => p[0] as number);
    const y = validPairs.map(p => p[1] as number);

    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);
    const stdDevX = standardDeviation(x);
    const stdDevY = standardDeviation(y);

    if (stdDevX === 0 || stdDevY === 0) return 0;

    const covariance = x.reduce((acc, val, i) => acc + (val - meanX) * (y[i] - meanY), 0) / (n - 1);
    
    return covariance / (stdDevX * stdDevY);
}

const RetailAnalyticsDashboard = ({ data }: { data: any }) => {
    if (!data) return null;
    const { kpiData, insights } = data;
    const kpiStatus = {
        npsScore: kpiData.npsScore > 50 ? 'excellent' : kpiData.npsScore > 0 ? 'good' : 'poor',
        avgSatisfaction: kpiData.avgSatisfaction > 4 ? 'excellent' : kpiData.avgSatisfaction > 3 ? 'good' : 'warning',
        avgOrderValue: 'good',
        repurchaseRate: kpiData.repurchaseRate > 50 ? 'excellent' : kpiData.repurchaseRate > 30 ? 'good' : 'warning',
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="NPS Score" value={kpiData.npsScore.toFixed(1)} status={kpiStatus.npsScore} />
                <KPICard title="Avg Satisfaction" value={`${kpiData.avgSatisfaction.toFixed(2)} / 5`} status={kpiStatus.avgSatisfaction} />
                <KPICard title="Avg Order Value" value={`$${kpiData.avgOrderValue.toFixed(2)}`} status={kpiStatus.avgOrderValue} />
                <KPICard title="Repurchase Rate" value={`${kpiData.repurchaseRate.toFixed(1)}%`} status={kpiStatus.repurchaseRate} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {insights.map((insight: any, i: number) => <InsightCard key={i} insight={insight} />)}
            </div>
        </div>
    )
}


const ServqualAnalyticsDashboard = ({ data }: { data: any }) => {
    if (!data) return null;

    const servqualChartConfig = {
        expectation: { label: "Expectation", color: "hsl(var(--chart-1))" },
        perception: { label: "Perception", color: "hsl(var(--chart-2))" },
        gap: { label: "Gap", color: "hsl(var(--chart-5))" },
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>SERVQUAL Gap Scores by Dimension</CardTitle>
                    <CardDescription>Negative gaps indicate perceptions fall short of expectations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={servqualChartConfig} className="w-full h-96">
                        <ResponsiveContainer>
                            <RechartsBarChart data={data.dimensionScores}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <RechartsBar dataKey="expectation" fill="var(--color-expectation)" radius={4}/>
                                <RechartsBar dataKey="perception" fill="var(--color-perception)" radius={4} />
                                <RechartsBar dataKey="gap" fill="var(--color-gap)" radius={4} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
};

const IpaAnalyticsDashboard = ({ data: ipaData }: { data: any }) => {
    if (!ipaData) return null;
    const { points, meanImportance, meanSatisfaction, quadrants } = ipaData;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Importance-Performance Matrix</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Plot
                        data={[{
                            x: points.map((p: any) => p.importance),
                            y: points.map((p: any) => p.satisfaction),
                            text: points.map((p: any) => p.name),
                            mode: 'markers+text',
                            textposition: 'top center',
                            type: 'scatter',
                            marker: { size: 12 }
                        }]}
                        layout={{
                            autosize: true,
                            width: 600,
                            height: 600,
                            xaxis: { title: 'Derived Importance' },
                            yaxis: { title: 'Stated Satisfaction' },
                            shapes: [
                                { type: 'line', x0: meanImportance, x1: meanImportance, y0: Math.min(...points.map((p:any) => p.satisfaction)) - 0.5, y1: Math.max(...points.map((p:any) => p.satisfaction)) + 0.5, line: { dash: 'dash', color: 'grey' } },
                                { type: 'line', y0: meanSatisfaction, y1: meanSatisfaction, x0: Math.min(...points.map((p:any) => p.importance)) - 0.05, x1: Math.max(...points.map((p:any) => p.importance)) + 0.05, line: { dash: 'dash', color: 'grey' } }
                            ],
                            annotations: [
                                { x: meanImportance, y: Math.max(...points.map((p:any) => p.satisfaction)) + 0.3, text: 'Keep Up Good Work', showarrow: false, xanchor: 'left'},
                                { x: meanImportance, y: Math.min(...points.map((p:any) => p.satisfaction)) - 0.3, text: 'Concentrate Here', showarrow: false, xanchor: 'left', yanchor: 'top'},
                                { x: Math.min(...points.map((p:any) => p.importance)) - 0.05, y: Math.max(...points.map((p:any) => p.satisfaction)) + 0.3, text: 'Possible Overkill', showarrow: false, xanchor: 'left'},
                                { x: Math.min(...points.map((p:any) => p.importance)) - 0.05, y: Math.min(...points.map((p:any) => p.satisfaction)) - 0.3, text: 'Low Priority', showarrow: false, xanchor: 'left', yanchor: 'top'},
                            ]
                        }}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default function SurveyApp() {
  return (
    <Suspense fallback={<div className="flex-1 p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto"/></div>}>
        <GeneralSurveyPageContentFromClient />
    </Suspense>
  )
}

function GeneralSurveyPageContentFromClient() {
    const searchParams = useSearchParams();
    const surveyId = searchParams.get('id');
    const template = searchParams.get('template');
    
    // We move state management into the child component that depends on the router.
    return <GeneralSurveyPageContent surveyId={surveyId as string} template={template} />;
}

function GeneralSurveyPageContent({ surveyId, template }: { surveyId: string; template?: string | null }) {
    const [survey, setSurvey] = useState<any>({
        title: 'Untitled Survey',
        description: 'Provide a short explanation for the purpose of this survey.',
        questions: [],
        logic: [],
        theme: {
            primaryColor: 'hsl(221.2 83.1% 60%)',
            layout: 'default',
            logo: null,
            background: null,
            innerBackground: null,
            innerBackgroundOpacity: 0.5,
            decorations: false,
            headerImage: null,
            type: 'default',
            transition: 'slide',
        }
    });
    
    const [cardStyle, setCardStyle] = useState('bg-card');

    const { toast } = useToast();
    const surveyUrlRef = useRef<HTMLInputElement>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [views, setViews] = useState(0);
    const [activeTab, setActiveTab] = useState('design');
    const [isSaved, setIsSaved] = useState(false);
    const [surveyUrl, setSurveyUrl] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isLoadingQr, setIsLoadingQr] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [retailAnalysisData, setRetailAnalysisData] = useState<any>(null);
    const [servqualAnalysisData, setServqualAnalysisData] = useState<any>(null);
    const [ipaAnalysisData, setIpaAnalysisData] = useState<any>(null);

    const [uploadingImageForQuestionId, setUploadingImageForQuestionId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loadedTemplate, setLoadedTemplate] = useState(false);

    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    useEffect(() => {
        if (template === 'retail' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: retailTemplate.title,
                description: retailTemplate.description,
                questions: retailTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isRetailTemplate: true
            }));
            setLoadedTemplate(true); // Prevent re-loading on re-renders
            toast({ title: "Template Loaded", description: "Retail Customer Survey template has been applied." });
        }
        if (template === 'servqual' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: servqualTemplate.title,
                description: servqualTemplate.description,
                questions: servqualTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isServqualTemplate: true,
            }));
            setLoadedTemplate(true);
            toast({ title: "Template Loaded", description: "SERVQUAL Survey template has been applied."});
        }
        if (template === 'ipa' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: ipaTemplate.title,
                description: ipaTemplate.description,
                questions: ipaTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isIpaTemplate: true
            }));
            setLoadedTemplate(true);
            toast({ title: "Template Loaded", description: "IPA Survey template has been applied." });
        }
         if (template === 'psm' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: psmTemplate.title,
                description: psmTemplate.description,
                questions: psmTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isPsmTemplate: true
            }));
            setLoadedTemplate(true);
            toast({ title: "Template Loaded", description: "Van Westendorp PSM Survey template has been applied." });
        }
    }, [template, loadedTemplate, toast]);

    const questionTypeCategories = {
        'Choice': [
            { id: 'single', icon: CircleDot, label: 'Single Selection', options: ["Option 1", "Option 2"], color: 'text-blue-500' },
            { id: 'multiple', icon: CheckSquare, label: 'Multiple Selection', options: ["Option 1", "Option 2"], color: 'text-green-500' },
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
             { id: 'matrix', icon: Grid3x3, label: 'Matrix', rows: ['Row 1', 'Row 2'], columns: ['Col 1', 'Col 2'], scale: ['Low', 'High'], color: 'text-purple-500' },
        ]
    };

    const downloadResponsesCSV = () => {
        if (responses.length === 0) {
            toast({
                title: "No Responses",
                description: "There is no data to export.",
                variant: "destructive"
            });
            return;
        }

        const dataForCsv: any[] = [];
        const headers: string[] = ['responseId', 'submittedAt'];

        // Dynamically create headers from questions
        survey.questions.forEach((q: any) => {
            if (q.type === 'best-worst') {
                headers.push(`${q.title} - Best`);
                headers.push(`${q.title} - Worst`);
            } else if (q.type !== 'description') {
                headers.push(q.title);
            }
        });
        
        responses.forEach(response => {
            const row: any = {
                responseId: response.id,
                submittedAt: response.submittedAt
            };
            survey.questions.forEach((q: any) => {
                if (q.type === 'description') return;
                
                const answer = response.answers[q.id];
                
                if (q.type === 'best-worst') {
                    row[`${q.title} - Best`] = answer ? answer.best || '' : '';
                    row[`${q.title} - Worst`] = answer ? answer.worst || '' : '';
                } else if (Array.isArray(answer)) {
                    row[q.title] = answer.join(', ');
                } else {
                    row[q.title] = answer !== undefined ? answer : '';
                }
            });
            dataForCsv.push(row);
        });

        const csv = Papa.unparse(dataForCsv, { columns: headers });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${survey.title.replace(/\s+/g, '_')}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    
    const getAnalysisDataForQuestion = (questionId: number) => {
        const question = survey.questions.find((q: any) => q.id === questionId);
        if (!question) {
            return { noData: true, chartData: null, tableData: null, insights: [] };
        }
        
        const allAnswers = responses.map(r => r.answers ? r.answers[question.id] : undefined).filter(a => a !== undefined && a !== null && a !== '');
        
        if (allAnswers.length === 0) {
            return { noData: true, chartData: null, tableData: null, insights: ["No responses yet."] };
        }
    
        let chartData: any = {};
        let tableData: any = [];
        let insights: string[] = [];

        switch (question.type) {
            case 'single':
            case 'multiple': {
                const counts: { [key: string]: number } = {};
                (question.options || []).forEach((opt: string) => { counts[opt] = 0; });
                allAnswers.flat().forEach((ans: any) => { if (counts[ans] !== undefined) counts[ans]++; });
                
                tableData = Object.entries(counts).map(([name, count]) => ({
                    name,
                    count,
                    percentage: responses.length > 0 ? ((count / responses.length) * 100).toFixed(1) : "0.0"
                })).sort((a,b) => b.count - a.count);

                const mostSelected = tableData[0];
                insights = [
                    `Most frequent answer: <strong>${mostSelected.name}</strong> (${mostSelected.count} responses, ${mostSelected.percentage}%).`,
                    `A total of <strong>${responses.length}</strong> responses were collected for this question.`
                ];

                chartData = tableData;
                break;
            }
            case 'text': {
                const textResponses = allAnswers.filter(a => typeof a === 'string' && a.trim() !== '');

                insights = [`Qualitative data collected.`];
                if (textResponses.length > 0) {
                    insights.push(`First response: <strong>"${textResponses[0]}"</strong>.`);
                }

                chartData = {}; 
                tableData = textResponses;
                break;
            }
            case 'number': {
                const numberResponses = allAnswers.map(Number).filter(n => !isNaN(n));
                const stats = {
                    mean: mean(numberResponses),
                    median: getMedian(numberResponses) || 0,
                    mode: getMode(numberResponses) || 0,
                    stdDev: standardDeviation(numberResponses),
                    min: Math.min(...numberResponses),
                    max: Math.max(...numberResponses),
                    count: numberResponses.length
                };
                chartData = { values: numberResponses };
                tableData = stats;
                insights = [
                    `The average response is <strong>${stats.mean.toFixed(2)}</strong>.`,
                    `Responses range from <strong>${stats.min}</strong> to <strong>${stats.max}</strong>.`,
                    `The standard deviation of <strong>${stats.stdDev.toFixed(2)}</strong> indicates the spread of the data.`
                ];
                break;
            }
             case 'rating': {
                const ratings = allAnswers.filter((a): a is number => typeof a === 'number');
                const avgRating = mean(ratings);
                chartData = { avg: avgRating, count: ratings.length };
                tableData = { 
                    avg: avgRating, 
                    median: getMedian(ratings) || 'N/A', 
                    mode: getMode(ratings) || 'N/A',
                    stdDev: standardDeviation(ratings),
                    count: ratings.length 
                };
                insights = [
                    `Average rating is <strong>${avgRating.toFixed(2)} / ${question.scale?.length || 5}</strong>.`,
                    `The most common rating given was <strong>${getMode(ratings)} star(s)</strong>.`,
                    `<strong>${((ratings.filter(r => r >= 4).length / ratings.length) * 100).toFixed(1)}%</strong> of users gave a high rating (4 or 5 stars).`
                ];
                break;
            }
            case 'best-worst': {
                const bestCounts: { [key: string]: number } = {};
                const worstCounts: { [key: string]: number } = {};
                question.items.forEach((item: string) => { bestCounts[item] = 0; worstCounts[item] = 0; });

                allAnswers.forEach(answer => {
                    if (answer?.best) bestCounts[answer.best]++;
                    if (answer?.worst) worstCounts[answer.worst]++;
                });
                
                tableData = question.items.map((item: string) => ({
                    name: item, best: bestCounts[item], worst: worstCounts[item],
                    score: (bestCounts[item] - worstCounts[item]),
                })).sort((a: any, b: any) => b.score - a.score);
                
                chartData = { y: tableData.map((d: any) => d.name).reverse(), x: tableData.map((d: any) => d.score).reverse(), orientation: 'h' };
                insights = [
                    `Highest preference: <strong>${tableData[0].name}</strong>.`,
                    `Lowest preference: <strong>${tableData[tableData.length-1].name}</strong>.`
                ];
                break;
            }
             case 'nps': {
                const npsScores = allAnswers.map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 10);
                const promoters = npsScores.filter(s => s >= 9).length;
                const passives = npsScores.filter(s => s >= 7 && s <= 8).length;
                const detractors = npsScores.filter(s => s <= 6).length;
                const total = npsScores.length;

                const promotersP = total > 0 ? (promoters / total) * 100 : 0;
                const passivesP = total > 0 ? (passives / total) * 100 : 0;
                const detractorsP = total > 0 ? (detractors / total) * 100 : 0;
                
                const nps = promotersP - detractorsP;

                chartData = { nps, promotersP, passivesP, detractorsP };
                tableData = { promoters, passives, detractors, promotersP, passivesP, detractorsP, nps };
                insights = [
                    `The overall NPS is <strong>${nps.toFixed(1)}</strong>.`,
                    `<strong>${promotersP.toFixed(1)}%</strong> of respondents are Promoters.`,
                    `<strong>${detractorsP.toFixed(1)}%</strong> of respondents are Detractors.`
                ];
                break;
            }
            default:
                return { noData: true, chartData: null, tableData: null, insights: [] };
        }
        return { chartData, tableData, insights };
    };
    
    const addQuestion = (type: string) => {
        let questionConfig;
        Object.values(questionTypeCategories).forEach(category => {
            const found = category.find(t => t.id === type);
            if (found) questionConfig = found;
        });
        if (!questionConfig) return;
        
        const newQuestion:any = {
            id: Date.now(),
            type: type,
            title: `New ${questionConfig.label} Question`,
            required: false,
            content: type === 'description' ? 'Enter your description or instructions here...' : '',
        };
        if ('options' in questionConfig) {
            newQuestion.options = [...questionConfig.options];
        }
        if ('items' in questionConfig) {
            newQuestion.items = [...(questionConfig as any).items];
        }
         if ('columns' in questionConfig) {
            newQuestion.columns = [...(questionConfig as any).columns];
        }
         if ('scale' in questionConfig) {
            newQuestion.scale = [...(questionConfig as any).scale];
        }
        if (type === 'nps') {
            newQuestion.title = 'How likely are you to recommend our product to a friend or colleague?';
        }
        if (type === 'matrix') {
            newQuestion.rows = ['Row 1', 'Row 2'];
        }
        setSurvey((prev: any) => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    };

    const deleteQuestion = (id: number) => {
        setSurvey((prev: any) => {
            const newQuestions = prev.questions.filter((q: any) => q.id !== id);
            const newLogic = prev.logic.filter((l: any) => l.questionId !== id).map((l: any) => ({
                ...l,
                paths: l.paths.filter((p: any) => p.toQuestion !== id)
            }));
            return { ...prev, questions: newQuestions, logic: newLogic };
        });
    }
    
    const updateQuestion = (updatedQuestion: any) => {
        setSurvey((prev: any) => ({
            ...prev,
            questions: prev.questions.map((q: any) => q.id === updatedQuestion.id ? updatedQuestion : q)
        }));
    };

    const addLogicPath = (questionId: number) => {
        const newPath: LogicPath = { id: Date.now(), fromOption: '', toQuestion: 'end' };
        setSurvey((prev: any) => {
            const existingLogicIndex = prev.logic.findIndex((l: any) => l.questionId === questionId);
            if (existingLogicIndex > -1) {
                const updatedLogic = [...prev.logic];
                updatedLogic[existingLogicIndex].paths.push(newPath);
                return { ...prev, logic: updatedLogic };
            } else {
                return { ...prev, logic: [...prev.logic, { questionId, paths: [newPath] }] };
            }
        });
    };

    const removeLogicPath = (questionId: number, pathId: number) => {
        setSurvey((prev: any) => {
            const existingLogicIndex = prev.logic.findIndex((l: any) => l.questionId === questionId);
            if (existingLogicIndex > -1) {
                const updatedLogic = [...prev.logic];
                updatedLogic[existingLogicIndex].paths = updatedLogic[existingLogicIndex].paths.filter((p: any) => p.id !== pathId);
                return { ...prev, logic: updatedLogic };
            }
            return prev;
        });
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
    
        if (over && active.id !== over.id) {
          setSurvey((prev: any) => {
            const oldIndex = prev.questions.findIndex((item: any) => item.id === active.id);
            const newIndex = prev.questions.findIndex((item: any) => item.id === over!.id);
            return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
          });
        }
      }

    const saveAndTest = () => {
        if(saveDraft()) {
            setIsShareModalOpen(true);
        }
    };
    
    const generateQrCode = async () => {
        if (!surveyUrl) return;
        setIsLoadingQr(true);
        try {
            const response = await fetch(`/api/generate-qr-code?data=${encodeURIComponent(surveyUrl)}`);
            if(!response.ok) {
                throw new Error('Failed to generate QR code');
            }
            const result = await response.json();
            setQrCodeUrl(result.image);
        } catch (error) {
             toast({
                title: "QR Code Error",
                description: "Could not generate the QR code.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingQr(false);
        }
    };

    const handleQuestionImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || uploadingImageForQuestionId === null) {
            return;
        }
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const imageUrl = reader.result as string;
            setSurvey(prev => ({
                ...prev,
                questions: prev.questions.map((q: any) => 
                    q.id === uploadingImageForQuestionId ? { ...q, imageUrl } : q
                )
            }));
            setUploadingImageForQuestionId(null);
        };
        reader.readAsDataURL(file);
    };
    
    const triggerImageUpload = (questionId: number) => {
        setUploadingImageForQuestionId(questionId);
        fileInputRef.current?.click();
    };


    useEffect(() => {
        if (surveyId) {
            setSurveyUrl(`${window.location.origin}/survey/view/general/${surveyId}`);
            
            const draft = localStorage.getItem(surveyId as string);
            if (draft) {
                const data = JSON.parse(draft);
                setSurvey(prev => ({...prev, ...data}));
                setIsSaved(true);
            }

            const savedResponses = localStorage.getItem(`${surveyId}_responses`);
            if (savedResponses) setResponses(JSON.parse(savedResponses));

            const savedViews = localStorage.getItem(`${surveyId}_views`);
            if (savedViews) setViews(parseInt(savedViews, 10));
        }
    }, [surveyId]);
    
    useEffect(() => {
        if (activeTab === 'dashboard' && surveyUrl && !qrCodeUrl) {
            generateQrCode();
        }
    }, [activeTab, surveyUrl, qrCodeUrl]);

    const copyUrlToClipboard = async () => {
        if (!surveyUrl) return;
        try {
            await navigator.clipboard.writeText(surveyUrl);
            toast({
                title: 'Copied to Clipboard',
                description: 'The survey URL has been copied to your clipboard.',
            });
        } catch (error) {
            console.error("Failed to copy", error);
        }
    };
    
    const downloadQrCode = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `${survey.title.replace(/\s+/g, '_')}_qr_code.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const saveDraft = () => {
        if (!surveyId) return false;
        const draft = {
            id: surveyId,
            ...survey,
        };
        localStorage.setItem(surveyId as string, JSON.stringify(draft));
        setIsSaved(true);
        toast({
            title: "Draft Saved!",
            description: "Your survey has been saved locally.",
        });
        return true;
    };

    const handleTypeChange = (value: string) => {
        setSurvey((prev: any) => {
            const newTheme = { ...prev.theme, type: value };
            if (value === 'type1') {
                newTheme.primaryColor = 'hsl(340 82% 52%)'; // Rose
                newTheme.layout = 'modern';
                setCardStyle('border rounded-lg bg-background/80 backdrop-blur-sm');
            } else if (value === 'type2') {
                newTheme.primaryColor = 'hsl(142 76% 36%)'; // Forest
                newTheme.layout = 'classic';
                setCardStyle('bg-card');
            } else { // Default
                newTheme.primaryColor = 'hsl(221.2 83.1% 60%)';
                newTheme.layout = 'default';
                setCardStyle('bg-card');
            }
            return { ...prev, theme: newTheme };
        });
    };
    
    const performRetailAnalysis = (data: any[]) => {
        if (!data || data.length === 0) return null;
    
        const flatResponses = data.map(r => r.answers);
    
        const getAnswerByTitle = (title: string) => {
            const question = survey.questions.find((q: any) => q.title === title);
            return question ? flatResponses.map(r => r[question.id]) : [];
        };
    
        const satisfactionScores = getAnswerByTitle('Overall, how satisfied are you with our service?').filter(v => typeof v === 'number');
        const npsScores = getAnswerByTitle('How likely are you to recommend us to a friend or colleague?').filter(v => typeof v === 'number');
        const orderValues = getAnswerByTitle('Approximately, what is your average spend per visit?').filter(v => typeof v === 'number');
        const frequencies = getAnswerByTitle('How many times have you purchased from us in the last 6 months?').filter(v => typeof v === 'number');
        const ageGroups = getAnswerByTitle('Which age group do you belong to?');
    
        const promoters = npsScores.filter(s => s >= 9).length;
        const detractors = npsScores.filter(s => s <= 6).length;
        const totalNps = npsScores.length;
        const npsScore = totalNps > 0 ? ((promoters / totalNps) - (detractors / totalNps)) * 100 : 0;
    
        const kpiData = {
            npsScore: npsScore,
            avgSatisfaction: satisfactionScores.length > 0 ? mean(satisfactionScores) : 0,
            avgOrderValue: orderValues.length > 0 ? mean(orderValues) : 0,
            repurchaseRate: frequencies.length > 0 ? (frequencies.filter(f => f >= 2).length / frequencies.length) * 100 : 0,
        };
        
        const insights = [];
        if (kpiData.npsScore < 0) insights.push({ type: 'critical', title: '🚨 Urgent NPS Improvement Needed', text: `NPS score of ${kpiData.npsScore.toFixed(1)} is very low.`, actions: 'Investigate sources of dissatisfaction from detractors immediately.' });
        else if (kpiData.npsScore < 30) insights.push({ type: 'warning', title: '⚠️ Low NPS Score', text: `NPS score of ${kpiData.npsScore.toFixed(1)} indicates room for improvement.`, actions: 'Analyze passive and detractor feedback to identify key issues.' });
        else insights.push({ type: 'excellent', title: '👍 Strong NPS Score', text: `An NPS of ${kpiData.npsScore.toFixed(1)} is a healthy score.`, actions: 'Leverage promoters for testimonials and referrals.' });

        const ageGroupSatisfaction: {[key: string]: number[]} = {};
        flatResponses.forEach(r => {
            const ageQ = survey.questions.find((q: any) => q.title === 'Which age group do you belong to?');
            const satQ = survey.questions.find((q: any) => q.title === 'Overall, how satisfied are you with our service?');
            if(ageQ && satQ) {
                const age = r[ageQ.id];
                const satisfaction = r[satQ.id];
                if(age && typeof satisfaction === 'number') {
                    if(!ageGroupSatisfaction[age]) ageGroupSatisfaction[age] = [];
                    ageGroupSatisfaction[age].push(satisfaction);
                };
            }
        });
        const avgAgeSatisfaction = Object.entries(ageGroupSatisfaction).map(([age, scores]) => ({ age, avg: mean(scores) }));
        if(avgAgeSatisfaction.length > 1) {
             const topAgeGroup = [...avgAgeSatisfaction].sort((a,b) => b.avg - a.avg)[0];
             insights.push({ type: 'opportunity', title: `🚀 High Satisfaction in ${topAgeGroup.age} Age Group`, text: `The ${topAgeGroup.age} age group shows the highest satisfaction (${topAgeGroup.avg.toFixed(2)}/5).`, actions: 'Tailor marketing campaigns and loyalty programs for this demographic.' });
        }
    
        return { kpiData, insights };
    };
    
    const performServqualAnalysis = () => {
        if(responses.length === 0) return null;
        
        const dimensionAverages: any = {};
        survey.questions.forEach((q: any) => {
            if (q.type !== 'matrix') return;
            const dimension = q.title;
            const expectationScores: number[] = [];
            const perceptionScores: number[] = [];

            q.rows.forEach((row: string) => {
                 responses.forEach(res => {
                    if(res.answers[q.id]?.[row]?.Expectation) {
                        expectationScores.push(res.answers[q.id][row].Expectation);
                    }
                    if(res.answers[q.id]?.[row]?.Perception) {
                        perceptionScores.push(res.answers[q.id][row].Perception);
                    }
                });
            });

            const avgExpectation = expectationScores.length > 0 ? mean(expectationScores) : 0;
            const avgPerception = perceptionScores.length > 0 ? mean(perceptionScores) : 0;
            
            dimensionAverages[dimension] = {
                name: dimension,
                expectation: avgExpectation,
                perception: avgPerception,
                gap: avgPerception - avgExpectation,
            };
        });

        const overallGap = Object.values(dimensionAverages).reduce((sum: number, dim: any) => sum + dim.gap, 0) / Object.keys(dimensionAverages).length;
        
        setServqualAnalysisData({
            dimensionScores: Object.values(dimensionAverages),
            overallGap,
        });
        setActiveTab('servqual-dashboard');
    };
    
    const performIpaAnalysis = () => {
        const validResponses = responses.filter(r => r && r.answers);
        const overallSatisfactionQ = survey.questions.find((q: any) => q.type === 'rating');
        if (!overallSatisfactionQ) {
            toast({ title: "Analysis Error", description: "Could not find the 'Overall Satisfaction' rating question.", variant: "destructive" });
            return;
        }

        const overallScores = validResponses.map(r => r.answers[overallSatisfactionQ.id]).filter((s): s is number => typeof s === 'number');

        if (overallScores.length < 2) {
            toast({ title: "Not Enough Data", description: "At least 2 valid 'Overall Satisfaction' responses are needed.", variant: "destructive" });
            return;
        }

        const matrixQ = survey.questions.find((q: any) => q.type === 'matrix');
        if (!matrixQ) {
            toast({ title: "Analysis Error", description: "Could not find the satisfaction matrix question.", variant: "destructive" });
            return;
        }

        const satisfactionData: { [key: string]: (number|undefined)[] } = {};
        matrixQ.rows.forEach((attr: string) => {
            satisfactionData[attr] = validResponses.map(r => r.answers[matrixQ.id]?.[attr]);
        });
        
        const correlations = matrixQ.rows.map((attr: string) => {
            const attrScores = satisfactionData[attr].map(s => s ? parseFloat(String(s)) : undefined);
            return { name: attr, cor: pearsonCorrelation(attrScores, overallScores) }
        });
        
        const totalCorrelation = correlations.reduce((sum, item) => sum + Math.abs(item.cor), 0);

        const ipaData = matrixQ.rows.map((attr: string) => {
            const corItem = correlations.find(c => c.name === attr);
            const importanceWeight = totalCorrelation > 0 ? Math.abs(corItem?.cor || 0) / totalCorrelation : (1 / matrixQ.rows.length);
            const satisfactionScores = satisfactionData[attr].map(s => s ? parseFloat(String(s)) : undefined).filter((s): s is number => s !== undefined);

            return {
                name: attr,
                satisfaction: mean(satisfactionScores),
                importance: importanceWeight,
            };
        });

        const meanImportance = mean(ipaData.map(d => d.importance));
        const meanSatisfaction = mean(ipaData.map(d => d.satisfaction));

        const quadrants = {
            'Keep Up the Good Work': ipaData.filter(d => d.importance >= meanImportance && d.satisfaction >= meanSatisfaction),
            'Concentrate Here': ipaData.filter(d => d.importance >= meanImportance && d.satisfaction < meanSatisfaction),
            'Low Priority': ipaData.filter(d => d.importance < meanImportance && d.satisfaction < meanSatisfaction),
            'Possible Overkill': ipaData.filter(d => d.importance < meanImportance && d.satisfaction >= meanSatisfaction),
        };

        setIpaAnalysisData({ points: ipaData, meanImportance, meanSatisfaction, quadrants });
        setActiveTab('ipa-dashboard');
    };
    
    const [analysisItems, setAnalysisItems] = useState(survey.questions);
    
    useEffect(() => {
        setAnalysisItems(survey.questions);
    }, [survey.questions]);
    
    const handleDashboardDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
            setAnalysisItems((items) => {
                const oldIndex = items.findIndex((item: any) => item.id === active.id);
                const newIndex = items.findIndex((item: any) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };


    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 bg-gradient-to-br from-background to-slate-50">
            <input type="file" ref={fileInputRef} onChange={handleQuestionImageFileChange} className="hidden" accept="image/*" />
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">General Survey</h1>
                    <p className="text-muted-foreground">
                    Design, configure, and analyze your survey.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={saveDraft} disabled={!surveyId}>
                        <Save className="mr-2" />
                        Save Draft
                    </Button>
                    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
                        <DialogTrigger asChild>
                             <Button onClick={saveAndTest} disabled={!surveyId}>
                                <Share2 className="mr-2" />
                                Share
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Share Your Survey</DialogTitle>
                                <DialogDescription>
                                Your survey is ready. Use the link or QR code to test or share it.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="survey-link">Shareable Link</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="survey-link" value={surveyUrl} readOnly />
                                        <Button variant="outline" size="icon" onClick={copyUrlToClipboard}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <Label>QR Code</Label>
                                    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                                        {isLoadingQr ? (
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        ) : qrCodeUrl ? (
                                            <Image src={qrCodeUrl} alt="Survey QR Code" width={200} height={200} data-ai-hint="QR code"/>
                                        ) : (
                                            <p className="text-muted-foreground">Could not load QR code.</p>
                                        )}
                                        <Button variant="outline" disabled={!qrCodeUrl || isLoadingQr} onClick={downloadQrCode}>
                                            <Download className="mr-2" /> Download
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="w-full" asChild>
                                    <a href={surveyUrl} target="_blank" rel="noopener noreferrer">
                                        <Eye className="mr-2" /> Launch Kiosk
                                    </a>
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" asChild>
                        <Link href="/dashboard/survey">
                            <ArrowLeft className="mr-2" />
                            Back to Surveys
                        </Link>
                    </Button>
                </div>
            </header>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <TabsList className="flex flex-wrap h-auto justify-start">
                    <TabsTrigger value="design"><ClipboardList className="mr-2" />Design</TabsTrigger>
                    <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2" />Dashboard</TabsTrigger>
                    <TabsTrigger value="analysis-detail">Detailed Analysis</TabsTrigger>
                    <TabsTrigger value="analysis-dashboard">Analysis Dashboard</TabsTrigger>
                    {survey.isRetailTemplate && <TabsTrigger value="retail-dashboard"><ShoppingCart className="mr-2" />Retail Dashboard</TabsTrigger>}
                    {survey.isServqualTemplate && <TabsTrigger value="servqual-dashboard"><ShieldCheck className="mr-2" />SERVQUAL Dashboard</TabsTrigger>}
                    {survey.isIpaTemplate && <TabsTrigger value="ipa-dashboard"><Target className="mr-2" />IPA Dashboard</TabsTrigger>}
                    {survey.isPsmTemplate && <TabsTrigger value="psm-dashboard"><DollarSign className="mr-2" />PSM Dashboard</TabsTrigger>}
                </TabsList>
                <TabsContent value="design">
                    <div className="grid md:grid-cols-12 gap-6 mt-4">
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
                                                <div key={type.id} className="group relative">
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-start h-12 text-base"
                                                        onClick={() => addQuestion(type.id)}
                                                    >
                                                        <type.icon className={cn("w-6 h-6 mr-3", type.color)} /> 
                                                        <span className="flex-1 text-left">{type.label}</span>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    <Separator className="my-4" />
                                    <h3 className="text-sm font-semibold text-muted-foreground px-2 mt-4">OPTIONS</h3>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Shuffle className="w-5 h-5 mr-2" /> Question Logic
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Question Logic</DialogTitle>
                                                <DialogDescription>
                                                    Define paths to guide users through the survey based on their answers.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
                                                {survey.questions.filter((q: any) => q.type !== 'description' && q.options).length === 0 ? (
                                                    <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                                                        <p className="text-muted-foreground text-center">Add some questions with options<br />to start building logic paths.</p>
                                                    </div>
                                                ) : (
                                                    survey.questions.filter((q: any) => q.type !== 'description' && q.options).map((q: any) => {
                                                        const questionLogic = survey.logic.find((l: any) => l.questionId === q.id);
                                                        return (
                                                            <Card key={q.id}>
                                                                <CardHeader>
                                                                    <CardTitle className="text-lg">{q.title}</CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="space-y-4">
                                                                    {questionLogic && questionLogic.paths.map((path: any) => (
                                                                        <div key={path.id} className="flex items-center gap-2">
                                                                            <Label>When answer is</Label>
                                                                            <Select>
                                                                                <SelectTrigger className="w-[150px]">
                                                                                    <SelectValue placeholder="Select option" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {q.options.map((opt: string) => (
                                                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <MoveRight className="w-5 h-5" />
                                                                            <Label>Jump to</Label>
                                                                            <Select>
                                                                                <SelectTrigger className="w-[180px]">
                                                                                    <SelectValue placeholder="Select question" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {survey.questions.filter((destQ: any) => destQ.id !== q.id && destQ.type !== 'description').map((destQ: any) => (
                                                                                        <SelectItem key={destQ.id} value={destQ.id.toString()}>{destQ.title}</SelectItem>
                                                                                    ))}
                                                                                    <Separator />
                                                                                    <SelectItem value="end">End of Survey</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <Button variant="ghost" size="icon" onClick={() => removeLogicPath(q.id, path.id)}>
                                                                                <Trash2 className="w-4 h-4 text-destructive"/>
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                    <Button variant="outline" size="sm" onClick={() => addLogicPath(q.id)}>
                                                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Logic Path
                                                                    </Button>
                                                                </CardContent>
                                                            </Card>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                     <CardTitle className="text-lg">Appearance</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 space-y-4">
                                    <div>
                                        <Label className="text-xs font-semibold mb-2 text-muted-foreground px-1">Survey Type</Label>
                                        <Select onValueChange={handleTypeChange} value={survey.theme?.type || 'default'}>
                                            <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">Default</SelectItem>
                                                <SelectItem value="type1">Type 1</SelectItem>
                                                <SelectItem value="type2">Type 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold mb-2 text-muted-foreground px-1">Page Transition</Label>
                                        <Select onValueChange={(value) => setSurvey(prev => ({ ...prev, theme: { ...prev.theme, transition: value } }))} value={survey.theme?.transition || 'slide'}>
                                            <SelectTrigger><SelectValue placeholder="Select a transition" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="slide">Slide</SelectItem>
                                                <SelectItem value="fade">Fade</SelectItem>
                                                <SelectItem value="none">None</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                             </Card>
                        </div>
                        <div className="md:col-span-9">
                             <Card
                                className="min-h-[600px] bg-cover bg-center"
                                style={{ 
                                    '--survey-primary-color': survey.theme?.primaryColor,
                                    backgroundImage: survey.theme?.background ? `url(${survey.theme.background})` : 'none',
                                } as React.CSSProperties}
                            >
                                <CardContent className="p-4 md:p-8 space-y-6">
                                     <div className={cn("p-4", cardStyle)}>
                                        <div className="text-center mb-4">
                                            {survey.theme?.logo && (
                                                <div className="flex justify-center">
                                                    <Image src={survey.theme.logo} alt="Survey Logo" width={120} height={120} className="max-h-24 w-auto object-contain" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="survey-title">Survey Title</Label>
                                            <Input 
                                            id="survey-title" 
                                            placeholder="Enter your survey title" 
                                            className="text-2xl font-bold p-0 border-none focus:ring-0 focus-visible:ring-offset-0 bg-transparent" 
                                            value={survey.title}
                                            onChange={(e) => setSurvey(prev => ({...prev, title: e.target.value}))}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="survey-description">Survey Description</Label>
                                            <Textarea 
                                            id="survey-description" 
                                            placeholder="Provide a short explanation for the purpose of this survey." 
                                            value={survey.description}
                                            onChange={(e) => setSurvey(prev => ({...prev, description: e.target.value}))}
                                            className="bg-transparent"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">You can add more specific explanations for individual questions.</p>
                                        </div>
                                        <Separator className="my-4" />
                                         <div>
                                            {survey.theme?.headerImage && (
                                                <div className="relative w-full h-48 bg-muted rounded-md mb-2">
                                                    <Image src={survey.theme.headerImage} alt="Header preview" fill objectFit="contain" className="p-2 rounded-md" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext 
                                            items={survey.questions.map((q: any) => q.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-4">
                                                {survey.questions.length === 0 ? (
                                                    <div className="flex flex-col justify-center items-center h-96 border-2 border-dashed rounded-lg">
                                                        <p className="text-muted-foreground mb-4">Add questions from the toolbox to get started.</p>
                                                        <Button onClick={() => addQuestion('single')}>
                                                            <PlusCircle className="mr-2" /> Add Question
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    survey.questions.map((q: any) => {
                                                        const questionComponents: { [key: string]: React.ComponentType<any> } = {
                                                            single: SingleSelectionQuestion,
                                                            multiple: MultipleSelectionQuestion,
                                                            text: TextQuestion,
                                                            rating: RatingQuestion,
                                                            number: NumberQuestion,
                                                            phone: PhoneQuestion,
                                                            email: EmailQuestion,
                                                            nps: NPSQuestion,
                                                            description: DescriptionBlock,
                                                            'best-worst': BestWorstQuestion,
                                                            matrix: MatrixQuestion
                                                          };
                                                          const QuestionComponent = questionComponents[q.type];
                                                          if (!QuestionComponent) return null;
                                                        return (
                                                            <DraggableQuestion key={q.id} id={q.id}>
                                                                <QuestionComponent
                                                                    question={q}
                                                                    onDelete={deleteQuestion}
                                                                    onUpdate={updateQuestion}
                                                                    onImageUpload={triggerImageUpload}
                                                                    cardClassName={cardStyle}
                                                                />
                                                            </DraggableQuestion>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="dashboard">
                <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Survey Dashboard</CardTitle>
                      <CardDescription>An overview of your survey's performance and sharing options.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                                    <EyeIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{views}</div>
                                    <p className="text-xs text-muted-foreground">Total times the survey was viewed</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{responses.length}</div>
                                    <p className="text-xs text-muted-foreground">Total number of completed surveys</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{views > 0 ? `${((responses.length / views) * 100).toFixed(1)}%` : '0%'}</div>
                                    <p className="text-xs text-muted-foreground">Based on views vs. responses</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Export Data</CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <Button variant="outline" className="w-full" onClick={downloadResponsesCSV} disabled={responses.length === 0}>
                                        <FileDown className="mr-2 h-4 w-4" />
                                        Download Responses (CSV)
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <LinkIcon className="w-6 h-6 text-primary" />
                                    <div className='flex flex-col'>
                                        <CardTitle>Shareable Link</CardTitle>
                                        <CardDescription>This is the public URL for your survey.</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex items-center gap-2">
                                    <Input ref={surveyUrlRef} value={surveyUrl} readOnly className="bg-muted" disabled={!isSaved}/>
                                    <Button variant="outline" size="icon" onClick={copyUrlToClipboard} disabled={!isSaved}>
                                        <Copy className="w-4 h-4"/>
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <QrCode className="w-6 h-6 text-primary" />
                                    <div className='flex flex-col'>
                                        <CardTitle>QR Code</CardTitle>
                                        <CardDescription>Respondents can scan this to open the survey.</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-4">
                                    {isLoadingQr ? (
                                        <div className="w-[166px] h-[166px] flex items-center justify-center bg-muted rounded-lg">
                                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : qrCodeUrl ? (
                                        <div className="p-4 border rounded-lg">
                                            <Image src={qrCodeUrl} alt="Survey QR Code" width={150} height={150} data-ai-hint="QR code"/>
                                        </div>
                                    ) : (
                                        <div className="w-[166px] h-[166px] flex items-center justify-center bg-muted rounded-lg">
                                            <p className="text-muted-foreground text-center px-4 text-sm">Save your draft to generate a QR Code.</p>
                                        </div>
                                    )}
                                    <Button variant="outline" disabled={!qrCodeUrl || isLoadingQr} onClick={downloadQrCode}>
                                        <Download className="mr-2"/>
                                        Download QR Code
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>


                        <div className="space-y-6">
                            <h3 className="text-xl font-bold">Recent Responses</h3>
                            <Card>
                                <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Response ID</TableHead>
                                            <TableHead>Submitted At</TableHead>
                                            {survey.questions.filter((q: any) => q.type !== 'description').slice(0, 3).map((q: any) => (
                                                <TableHead key={q.id}>{q.title}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {responses.length > 0 ? (
                                            responses.slice(0, 5).map(response => (
                                                <TableRow key={response.id}>
                                                    <TableCell className="font-mono text-xs">...{response.id.slice(-6)}</TableCell>
                                                    <TableCell>{new Date(response.submittedAt).toLocaleString()}</TableCell>
                                                    {survey.questions.filter((q: any) => q.type !== 'description').slice(0, 3).map((q: any) => (
                                                        <TableCell key={q.id}>{JSON.stringify(response.answers[q.id])}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={survey.questions.filter((q: any) => q.type !== 'description').slice(0, 3).length + 2} className="h-24 text-center">
                                                    No responses yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
                </TabsContent>
                <TabsContent value="analysis-detail">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Detailed Analysis</CardTitle>
                            <CardDescription>
                                A question-by-question breakdown of survey responses.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {responses.length === 0 ? (
                                <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">No responses yet. Share your survey to collect data!</p>
                                </div>
                            ) : (
                                survey.questions.filter((q: any) => q.type !== 'description' && q.type !== 'phone' && q.type !== 'email').map((q: any, qIndex: number) => {
                                    const { noData, chartData, tableData, insights } = getAnalysisDataForQuestion(q.id);
                                    if (noData) return null;
                                    
                                    const questionComponents: { [key: string]: React.ComponentType<any> } = {
                                        single: ChoiceAnalysisDisplay,
                                        multiple: ChoiceAnalysisDisplay,
                                        text: TextAnalysisDisplay,
                                        rating: RatingAnalysisDisplay,
                                        number: NumberAnalysisDisplay,
                                        nps: NPSAnalysisDisplay,
                                        'best-worst': BestWorstAnalysisDisplay,
                                      };
                                      const AnalysisComponent = questionComponents[q.type];

                                    return (
                                        <div key={`analysis-${q.id}`}>
                                            {AnalysisComponent ? (
                                                <AnalysisComponent chartData={chartData} tableData={tableData} insightsData={insights} varName={`${qIndex + 1}. ${q.title}`} question={q} />
                                            ) : (
                                                <p className="text-muted-foreground">Analysis for this question type is not yet implemented.</p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="analysis-dashboard">
                    <Card className="mt-4">
                         <CardHeader>
                            <CardTitle>Analysis Dashboard</CardTitle>
                            <CardDescription>Drag and drop to rearrange your analysis dashboard.</CardDescription>
                         </CardHeader>
                         <CardContent>
                            {responses.length === 0 ? (
                                <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">No responses yet to build a dashboard.</p>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDashboardDragEnd}>
                                    <SortableContext items={analysisItems.map((q: any) => q.id)} strategy={verticalListSortingStrategy}>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {analysisItems.filter((q: any) => q.type !== 'description' && q.type !== 'phone' && q.type !== 'email').map((q: any) => {
                                                const { noData, chartData } = getAnalysisDataForQuestion(q.id);
                                                if (noData) return null;
                                                
                                                 const ChartComponent = () => {
                                                    switch (q.type) {
                                                        case 'single':
                                                        case 'multiple':
                                                            return <Plot data={[{ values: chartData.map((d: any) => d.count), labels: chartData.map((d: any) => d.name), type: 'pie', hole: .4 }]} layout={{ autosize: true, margin: { t: 20, b: 20, l: 20, r: 20 } }} style={{ width: '100%', height: '300px' }} useResizeHandler/>;
                                                        case 'number':
                                                            return <Plot data={[{ x: chartData.values, type: 'histogram' }]} layout={{ autosize: true, margin: { t: 40, b: 40, l: 40, r: 20 }, bargap: 0.1 }} style={{ width: '100%', height: '300px' }} useResizeHandler/>;
                                                        case 'rating':
                                                            return <div className="flex flex-col items-center gap-2"><StarDisplay rating={chartData.avg} total={q.scale?.length || 5} /><p>{chartData.avg.toFixed(2)} / {q.scale?.length || 5}</p></div>;
                                                        case 'nps':
                                                            return <div className="text-5xl font-bold text-primary">{chartData.nps.toFixed(1)}</div>
                                                        case 'text':
                                                            return <p className="text-sm text-muted-foreground p-4">Text analysis visual coming soon.</p>;
                                                        default: return <p>Chart not available.</p>;
                                                    }
                                                };
                                                
                                                return (
                                                     <SortableCard key={q.id} id={q.id}>
                                                        <CardHeader>
                                                            <CardTitle className="truncate">{q.title}</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="flex items-center justify-center min-h-[300px]">
                                                            <ChartComponent />
                                                        </CardContent>
                                                    </SortableCard>
                                                )
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                         </CardContent>
                    </Card>
                </TabsContent>
                 {survey.isRetailTemplate && (
                    <TabsContent value="retail-dashboard">
                         <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Retail Analytics Dashboard</CardTitle>
                                <CardDescription>Specialized analysis for your retail customer survey data.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {retailAnalysisData ? <RetailAnalyticsDashboard data={retailAnalysisData} /> : <Button onClick={() => setRetailAnalysisData(performRetailAnalysis(responses))}>Run Retail Analysis</Button>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                 {survey.isServqualTemplate && (
                    <TabsContent value="servqual-dashboard">
                         <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>SERVQUAL Dashboard</CardTitle>
                                <CardDescription>Service quality gap analysis based on expectations and perceptions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {servqualAnalysisData ? <ServqualAnalyticsDashboard data={servqualAnalysisData} /> : <Button onClick={performServqualAnalysis}>Run SERVQUAL Analysis</Button>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                {survey.isIpaTemplate && (
                    <TabsContent value="ipa-dashboard">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>IPA Dashboard</CardTitle>
                                <CardDescription>Importance-Performance Analysis results.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {ipaAnalysisData ? <IpaAnalyticsDashboard data={ipaAnalysisData} /> : <Button onClick={performIpaAnalysis} disabled={responses.length < 2}>Run IPA Analysis</Button>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                 {survey.isPsmTemplate && (
                    <TabsContent value="psm-dashboard">
                       <VanWestendorpPage data={responses.map(r => r.answers)} numericHeaders={Object.keys(responses[0]?.answers || {})} onLoadExample={() => {}} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

type LogicPath = { id: number; fromOption: string; toQuestion: number | 'end' };
type QuestionLogic = { questionId: number; paths: LogicPath[] };
const SortableCard = ({ id, children }: { id: any, children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} className="relative">
            <Card>
                {children}
            </Card>
            <div {...attributes} {...listeners} className="absolute top-2 right-2 p-1 cursor-grab">
                <Move className="w-5 h-5 text-muted-foreground"/>
            </div>
        </div>
    );
};

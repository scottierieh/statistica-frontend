

'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { produce } from 'immer';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, ResponsiveContainer, ScatterChart, Scatter, Cell, PieChart, Pie } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent, useDraggable } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, ArrowLeft, CircleDot, CheckSquare, CaseSensitive, Star, PlusCircle, Eye, Shuffle, FileText, Save, Info, Link as LinkIcon, QrCode, Download, Copy, Users, EyeIcon, TrendingUp, Laptop, Palette, Grid3x3, ThumbsUp, MessageSquareQuote, Target, Sparkles, ImageIcon, Smartphone, Tablet, Monitor, FileDown, Share2, Phone, Mail, Frown, Lightbulb, AlertTriangle, ShoppingCart, ShieldCheck, BeakerIcon, ShieldAlert, Move, PieChart as PieChartIcon, DollarSign, ZoomIn, ZoomOut, AreaChart, X, ChevronDown, Settings, LayoutDashboard, Filter, BarChart2, BarChart as BarChartLucide, ClipboardList, Sigma, Loader2, BookOpen } from 'lucide-react';
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
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Line, ReferenceLine, Label as RechartsLabel, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '../ui/date-range-picker';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import VanWestendorpPage from '@/components/pages/van-westendorp-page';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { addDays } from 'date-fns';
import type { Question } from '@/entities/Survey';

const Plot = dynamic(() => import('react-plotly.js').then(mod => mod.default), { ssr: false });

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

const conjointTemplate = {
    title: 'Smartphone Feature Preference Survey',
    description: 'Please rate your preference for the following smartphone concepts.',
    questions: [
      {
        id: 1,
        type: 'rating',
        title: 'Profile 1: Brand A, $800, 6.1" Screen',
        description: 'How likely are you to purchase this specific model?',
        scale: ['1', '2', '3', '4', '5', '6', '7'],
        required: true
      },
      {
        id: 2,
        type: 'rating',
        title: 'Profile 2: Brand B, $1000, 6.7" Screen',
        description: 'How likely are you to purchase this specific model?',
        scale: ['1', '2', '3', '4', '5', '6', '7'],
        required: true
      },
      {
        id: 3,
        type: 'rating',
        title: 'Profile 3: Brand A, $1000, 6.1" Screen',
        description: 'How likely are you to purchase this specific model?',
        scale: ['1', '2', '3', '4', '5', '6', '7'],
        required: true
      },
      {
        id: 4,
        type: 'rating',
        title: 'Profile 4: Brand B, $800, 6.7" Screen',
        description: 'How likely are you to purchase this specific model?',
        scale: ['1', '2', '3', '4', '5', '6', '7'],
        required: true
      }
    ],
    isConjointTemplate: true
  };
  

const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

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

    if (isPreview) {
        return (
             <div className={cn("p-4", cardClassName)}>
                <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
                {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                    </div>
                )}
                <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-3">
                    {question.options?.map((option: string, index: number) => (
                        <Label key={index} htmlFor={`q${question.id}-o${index}`} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors cursor-pointer">
                            <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                            <span className="flex-1">{option}</span>
                        </Label>
                    ))}
                </RadioGroup>
            </div>
        )
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
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                </div>
            )}
            <div className="space-y-2">
                {(question.options || []).map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 group">
                        <RadioGroupItem value={option} id={`q${question.id}-o${index}`} disabled />
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

const MultipleSelectionQuestion = ({ question, answer = [], onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string[]; onAnswerChange?: (newAnswer: string[]) => void; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
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
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                </div>
            )}
           <div className="space-y-2">
                {question.options.map((option: string, index: number) => (
                   <Label key={index} htmlFor={`q${question.id}-o${index}`} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors cursor-pointer">
                       <Checkbox
                           id={`q${question.id}-o${index}`}
                           checked={answer?.includes(option)}
                           onCheckedChange={(checked) => handleCheckChange(!!checked, option)}
                       />
                       <span className="flex-1">{option}</span>
                   </Label>
               ))}
           </div>
       </div>
   );
};

const DropdownQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        onUpdate?.({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
        onUpdate?.({ ...question, options: newOptions });
    };

    const deleteOption = (index: number) => {
        const newOptions = question.options.filter((_:any, i:number) => i !== index);
        onUpdate?.({ ...question, options: newOptions });
    };
    
    if (isPreview) {
        return (
            <div className={cn("p-4", cardClassName)}>
                <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
                {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                    </div>
                )}
                <Select value={answer} onValueChange={onAnswerChange}>
                    <SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger>
                    <SelectContent>
                        {question.options.map((option: string, index: number) => (
                            <SelectItem key={index} value={option}>{option}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
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
             <div className="space-y-2">
                {question.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 group">
                        <Input 
                            placeholder={`Option ${index + 1}`} 
                            className="border-t-0 border-x-0 border-b focus:ring-0" 
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteOption(index)}>
                            <Trash2 className="w-4 h-4 text-destructive"/>
                        </Button>
                    </div>
                ))}
            </div>
            <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Option
            </Button>
        </div>
    );
};


const TextQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: number) => void; onUpdate?: (q:any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
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
            <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
        </div>
    )}
    <Textarea placeholder="Your answer..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} disabled={isPreview}/>
  </div>
);

const NumberQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
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
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
            </div>
        )}
      <Input type="number" placeholder="Enter a number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} disabled={isPreview}/>
    </div>
);

const PhoneQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
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
    <Input type="tel" placeholder="Enter phone number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} disabled={isPreview}/>
  </div>
);

const EmailQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => (
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
    <Input type="email" placeholder="Enter email address..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} disabled={isPreview}/>
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
              <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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
              <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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

const BestWorstQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void, onDelete?: (id: number) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...question.items!];
        newItems[index] = value;
        onUpdate?.({ ...question, items: newItems });
    };

    const addItem = () => {
        const newItems = [...question.items!, `New Item`];
        onUpdate?.({ ...question, items: newItems });
    };

    const deleteItem = (index: number) => {
        const newItems = question.items!.filter((_:any, i:number) => i !== index);
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
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                </div>
            )}
            <div>
                 {isPreview ? (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-2/3">Item</TableHead>
                                <TableHead className="text-center">Best</TableHead>
                                <TableHead className="text-center">Worst</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {question.items?.map((item: string, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{item}</TableCell>
                                    <TableCell className="text-center">
                                        <RadioGroup value={answer?.best} onValueChange={(value) => onAnswerChange({ ...answer, best: value })}>
                                            <RadioGroupItem value={item} />
                                        </RadioGroup>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <RadioGroup value={answer?.worst} onValueChange={(value) => onAnswerChange({ ...answer, worst: value })}>
                                            <RadioGroupItem value={item} />
                                        </RadioGroup>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <>
                        <h4 className="font-semibold mb-2">Items to evaluate</h4>
                        <div className="space-y-2">
                            {question.items?.map((item: string, index: number) => (
                                <div key={index} className="flex items-center space-x-2 group">
                                    <Input value={item} onChange={e => handleItemChange(index, e.target.value)} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => deleteItem(index)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="link" size="sm" onClick={addItem}><PlusCircle className="w-4 h-4 mr-2" /> Add Item</Button>
                    </>
                )}
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
                        {question.columns.map((col: string, colIndex: number) => (
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
                     {(question.rows || []).map((row: string, rowIndex: number) => (
                         <TableRow key={rowIndex}>
                            <TableCell className="group relative">
                                {isPreview ? row : <Input value={row} onChange={e => handleRowChange(rowIndex, e.target.value)} className="border-none p-0 focus:ring-0" />}
                                {!isPreview && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-0" onClick={() => deleteRow(rowIndex)}>
                                        <Trash2 className="w-4 h-4 text-destructive"/>
                                    </Button>
                                )}
                            </TableCell>
                            {question.columns.map((col: string, colIndex: number) => (
                                <TableCell key={colIndex} className="text-center">
                                     <RadioGroup value={answer?.[row]} onValueChange={(value) => onAnswerChange?.(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                        <RadioGroupItem value={col}/>
                                    </RadioGroup>
                                </TableCell>
                            ))}
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

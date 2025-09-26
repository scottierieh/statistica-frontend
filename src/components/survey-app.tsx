

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
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
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

const DropdownQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: number) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: number) => void; cardClassName?: string; }) => {
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
                <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
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
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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
            <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
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
  
const ChoiceAnalysisDisplay = ({ chartData, tableData, insightsData, varName, comparisonData }: { chartData: any, tableData: any[], insightsData: string[], varName: string, comparisonData: any }) => {
    const [chartType, setChartType] = useState<'hbar' | 'bar' | 'pie' | 'treemap'>('hbar');

    const comparisonChartData = useMemo(() => {
        if (!comparisonData) return tableData.map(d => ({ name: d.name, value: d.percentage }));
        return tableData.map(d => ({
            name: d.name,
            Overall: d.percentage,
            Group: comparisonData.tableData?.find((cd: any) => cd.name === d.name)?.percentage || 0
        }));
    }, [comparisonData, tableData]);

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
            (baseLayout.xaxis as any).tickangle = -45;
        }
        return baseLayout;
    }, [chartType]);

    const plotData = useMemo(() => {
        const percentages = tableData.map((d: any) => parseFloat(d.percentage));
        const labels = tableData.map((d: any) => d.name);
        const counts = tableData.map((d: any) => d.count);

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
        if (chartType === 'treemap') {
            return [{
                type: 'treemap',
                labels: labels,
                parents: Array(labels.length).fill(""),
                values: counts,
                textinfo: 'label+value+percent root',
                marker: {colors: COLORS}
            }];
        }
        return [{
            y: chartType === 'hbar' ? labels : percentages,
            x: chartType === 'hbar' ? percentages : labels,
            type: 'bar',
            orientation: chartType === 'hbar' ? 'h' : 'v',
            marker: { color: COLORS[0] },
            text: percentages.map((p: number) => `${p.toFixed(1)}%`),
            textposition: 'auto',
        }];
    }, [chartType, tableData]);

    return (
        <AnalysisDisplayShell varName={varName}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex justify-between items-center">
                            Distribution {comparisonData && `vs. ${comparisonData.filterValue}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                         {comparisonData ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={comparisonChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" unit="%" />
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar dataKey="Overall" fill={COLORS[0]} />
                                    <Bar dataKey="Group" fill={COLORS[1]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                             <Plot
                                data={plotData}
                                layout={plotLayout}
                                style={{ width: '100%', height: '100%' }}
                                config={{ displayModeBar: false }}
                                useResizeHandler
                            />
                        )}
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
  
const RatingAnalysisDisplay = ({ chartData, tableData, insightsData, varName, question, comparisonData }: { chartData: any, tableData: any, insightsData: string[], varName: string, question: any, comparisonData: any }) => {
    return (
        <AnalysisDisplayShell varName={varName}>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Average Rating {comparisonData && `vs. ${comparisonData.filterValue}`}</CardTitle>
                    </CardHeader>
                     <CardContent className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                        <StarDisplay rating={chartData.avg} total={question.scale?.length || 5} />
                        <p className="text-2xl font-bold">{chartData.avg.toFixed(2)} <span className="text-base font-normal text-muted-foreground">/ {question.scale?.length || 5}</span></p>
                        {comparisonData && (
                            <p className="text-lg">Group Avg: <strong className="text-primary">{comparisonData.chartData.avg.toFixed(2)}</strong></p>
                        )}
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

const NumberAnalysisDisplay = ({ chartData, tableData, insightsData, varName, comparisonData }: { chartData: any, tableData: any, insightsData: string[], varName: string, comparisonData: any }) => {
    return (
      <AnalysisDisplayShell varName={varName}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Response Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        <Plot
                            data={[{ x: chartData.values, type: 'histogram', marker: {color: COLORS[0]} }]}
                            layout={{
                                autosize: true,
                                margin: { t: 40, b: 40, l: 40, r: 20 },
                                bargap: 0.1,
                            }}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                            useResizeHandler
                        />
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                         <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics {comparisonData && `vs. ${comparisonData.filterValue}`}</CardTitle></CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Overall</TableHead>
                                        {comparisonData && <TableHead className="text-right">Group</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Mean</TableCell><TableCell className="text-right">{tableData.mean.toFixed(3)}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.mean.toFixed(3)}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Median</TableCell><TableCell className="text-right">{tableData.median}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.median}</TableCell>}</TableRow>
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
                            data={[{ ...chartData, type: 'bar', marker: { color: COLORS[1] } }]}
                            layout={{
                                autosize: true,
                                margin: { t: 20, b: 40, l: 100, r: 20 },
                                xaxis: { title: 'Best-Worst Score (Best count - Worst count)' },
                            }}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
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

const NPSAnalysisDisplay = ({ chartData, tableData, insightsData, varName, comparisonData }: { chartData: any, tableData: any, insightsData: string[], varName: string, comparisonData: any }) => {
    return (
        <AnalysisDisplayShell varName={varName}>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Net Promoter Score {comparisonData && `vs. ${comparisonData.filterValue}`}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-5xl font-bold text-primary">{chartData.nps.toFixed(1)}</div>
                                    <p className="text-muted-foreground text-sm">Overall NPS</p>
                                </div>
                                {comparisonData && (
                                     <div className="text-center">
                                        <div className="text-5xl font-bold">{comparisonData.chartData.nps.toFixed(1)}</div>
                                        <p className="text-muted-foreground text-sm">{comparisonData.filterValue} NPS</p>
                                    </div>
                                )}
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
                </div>
            </div>
        </AnalysisDisplayShell>
    );
};

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
        expectation: { label: "Expectation", color: COLORS[1] },
        perception: { label: "Perception", color: COLORS[0] },
        gap: { label: "Gap", color: COLORS[3] },
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
                            marker: { size: 12, color: COLORS[0] }
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
type LogicPath = { id: number; fromOption: string; toQuestion: number | 'end' };
type QuestionLogic = { questionId: number; paths: LogicPath[] };

// This function needs to be defined if it's used for IPA analysis
function pearsonCorrelation(x: (number | undefined)[], y: (number | undefined)[]): number {
    const validPairs = x.map((val, i) => [val, y[i]]).filter(([val1, val2]) => val1 !== undefined && val2 !== undefined) as [number, number][];
    if (validPairs.length < 2) return 0;
    
    const xs = validPairs.map(p => p[0]);
    const ys = validPairs.map(p => p[1]);

    const meanX = mean(xs);
    const meanY = mean(ys);
    const stdDevX = standardDeviation(xs);
    const stdDevY = standardDeviation(ys);

    if (stdDevX === 0 || stdDevY === 0) return 0;

    let covariance = 0;
    for (let i = 0; i < validPairs.length; i++) {
        covariance += (xs[i] - meanX) * (ys[i] - meanY);
    }
    covariance /= (validPairs.length - 1);

    return covariance / (stdDevX * stdDevY);
}

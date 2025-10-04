'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { produce } from 'immer';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GripVertical, Plus, Trash2, ArrowLeft, CircleDot, CheckSquare, CaseSensitive, Star, PlusCircle, Eye, Shuffle, FileText, Save, Info, ImageIcon, X, Phone, Mail, Share2, ThumbsUp, Grid3x3, ChevronDown, Sigma } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { SurveyEntity, type Question } from '@/entities/Survey';
import { cn } from '@/lib/utils';


// --- Reusable UI Components ---

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

const QuestionTypePalette = ({ onSelectType }: { onSelectType: (type: string) => void }) => {
    const questionTypeCategories = {
    'Choice': [
        { type: 'single', label: 'Single Selection', icon: CircleDot, color: 'text-blue-500' },
        { type: 'multiple', label: 'Multiple Selection', icon: CheckSquare, color: 'text-green-500' },
        { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, color: 'text-cyan-500' },
        { type: 'best-worst', label: 'Best/Worst Choice', icon: ThumbsUp, color: 'text-amber-500' },
    ],
    'Input': [
        { type: 'text', label: 'Text Input', icon: CaseSensitive, color: 'text-slate-500' },
        { type: 'number', label: 'Number Input', icon: Sigma, color: 'text-fuchsia-500' },
        { type: 'phone', label: 'Phone Input', icon: Phone, color: 'text-indigo-500' },
        { type: 'email', label: 'Email Input', icon: Mail, color: 'text-rose-500' },
    ],
    'Scale': [
        { type: 'rating', label: 'Rating', icon: Star, color: 'text-yellow-500' },
        { type: 'nps', label: 'Net Promoter Score', icon: Share2, color: 'text-sky-500' },
    ],
    'Structure': [
         { type: 'description', label: 'Description Block', icon: FileText, color: 'text-gray-400' },
         { type: 'matrix', label: 'Matrix', icon: Grid3x3, color: 'text-purple-500' },
    ]
};
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
    >
      <h3 className="text-lg font-bold text-slate-900 mb-4">Add a Question</h3>
       <div className="space-y-2">
            {Object.entries(questionTypeCategories).map(([category, types]) => (
                <div key={category}>
                    <h4 className="text-sm font-semibold text-muted-foreground px-2 my-2">{category}</h4>
                    {types.map((qType) => (
                        <div key={qType.type} className="group relative">
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-12 text-base"
                                onClick={() => onSelectType(qType.type)}
                            >
                                <qType.icon className={`w-5 h-5 mr-3 ${qType.color}`} />
                                {qType.label}
                            </Button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </motion.div>
  );
};


// --- Individual Question Type Components ---
const SingleSelectionQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = value;
        onUpdate?.({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
        onUpdate?.({ ...question, options: newOptions });
    };

    const deleteOption = (index: number) => {
        const newOptions = (question.options || []).filter((_:any, i:number) => i !== index);
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
                    {(question.options || []).map((option: string, index: number) => (
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
             <RadioGroup className="space-y-2">
                {(question.options || []).map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 group">
                        <RadioGroupItem value={option} id={`q${question.id}-o${index}-edit`} disabled />
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

const MultipleSelectionQuestion = ({ question, answer = [], onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string[]; onAnswerChange?: (newAnswer: string[]) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
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

const DropdownQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = value;
        onUpdate?.({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
        onUpdate?.({ ...question, options: newOptions });
    };

    const deleteOption = (index: number) => {
        const newOptions = (question.options || []).filter((_:any, i:number) => i !== index);
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
                        {(question.options || []).map((option: string, index: number) => (
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
                {(question.options || []).map((option: string, index: number) => (
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

const TextQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (q:any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
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

const NumberQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
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
      <Input type="number" placeholder="Enter a number..." value={answer || ''} onChange={e => onAnswerChange?.(e.target.value)} disabled={isPreview}/>
    </div>
);

const PhoneQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
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
    <Input type="tel" placeholder="Enter phone number..." value={answer || ''} onChange={e => onAnswerChange?.(e.target.value)} disabled={isPreview}/>
  </div>
);

const EmailQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
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
    <Input type="email" placeholder="Enter email address..." value={answer || ''} onChange={e => onAnswerChange?.(e.target.value)} disabled={isPreview}/>
  </div>
);

const RatingQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer: number; onAnswerChange: (value: number) => void; onDelete?: (id: string) => void; onUpdate?: (q:any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { 
    const ratingScale = question.scale || ['1', '2', '3', '4', '5'];
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
            <div className="flex items-center gap-2">
            {ratingScale.map((_: any, index: number) => (
                <Star key={index} 
                    className={cn("w-8 h-8 text-yellow-300 transition-colors", isPreview && "cursor-pointer hover:text-yellow-400", (index + 1) <= answer && "fill-yellow-400 text-yellow-400")} 
                    onClick={() => isPreview && onAnswerChange(index + 1)}
                />
            ))}
            </div>
        </div>
    );
};

const NPSQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: number; onAnswerChange?: (value: number) => void; onDelete?: (id: string) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
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
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {[...Array(11)].map((_, i) => (
            <Button key={i} variant={answer === i ? 'default' : 'outline'} size="icon" className="h-10 w-8 text-xs transition-transform hover:scale-110 active:scale-95" onClick={() => isPreview && onAnswerChange?.(i)}>
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

const DescriptionBlock = ({ question, onDelete, onUpdate, isPreview, cardClassName }: { question: any; onDelete?: (id: string) => void; onUpdate?: (q:any) => void; isPreview?: boolean; cardClassName?: string; }) => (
    <div className={cn("p-4 bg-muted/20", cardClassName)}>
      <div className="flex justify-between items-start mb-2">
        <Input 
          placeholder="Optional Title" 
          value={question.title} 
          onChange={(e) => onUpdate?.({...question, title: e.target.value})} 
          className="text-lg font-semibold border-none focus:ring-0 p-0 bg-transparent" 
          readOnly={isPreview} 
        />
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

const BestWorstQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void, onDelete?: (id: string) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...(question.items || [])];
        newItems[index] = value;
        onUpdate?.({ ...question, items: newItems });
    };

    const addItem = () => {
        const newItems = [...(question.items || []), `New Item`];
        onUpdate?.({ ...question, items: newItems });
    };

    const deleteItem = (index: number) => {
        const newItems = (question.items || []).filter((_:any, i:number) => i !== index);
        onUpdate?.({ ...question, items: newItems });
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-2/3">Item</TableHead>
                            <TableHead className="text-center">Best</TableHead>
                            <TableHead className="text-center">Worst</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(question.items || []).map((item: string, index: number) => (
                            <TableRow key={index}>
                                <TableCell>{item}</TableCell>
                                <TableCell className="text-center">
                                    <RadioGroup value={answer?.best} onValueChange={(value) => onAnswerChange({ ...answer, best: value })}>
                                        <RadioGroupItem value={item} id={`best-${question.id}-${index}`} />
                                    </RadioGroup>
                                </TableCell>
                                <TableCell className="text-center">
                                    <RadioGroup value={answer?.worst} onValueChange={(value) => onAnswerChange({ ...answer, worst: value })}>
                                        <RadioGroupItem value={item} id={`worst-${question.id}-${index}`}/>
                                    </RadioGroup>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
                    {(question.items || []).map((item: string, index: number) => (
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
const MatrixQuestion = ({ question, answer, onAnswerChange, onUpdate, onDelete, isPreview, cardClassName }: { question: any, answer: any, onAnswerChange?: (value: any) => void, onUpdate?: (q:any) => void, onDelete?: (id: string) => void, isPreview?: boolean, cardClassName?: string }) => {
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
                        {(question.columns || []).map((col: string, colIndex: number) => (
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
                            {(question.columns || []).map((col: string, colIndex: number) => (
                                <TableCell key={colIndex} className="text-center">
                                     <RadioGroup value={answer?.[row]} onValueChange={(value) => onAnswerChange?.(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                        <RadioGroupItem value={col} id={`q${question.id}-r${rowIndex}-c${colIndex}`}/>
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
// --- Main CreateSurvey Component ---
export default function CreateSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("My New Survey");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSurvey = async () => {
      const allSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
      const survey = allSurveys.find((s:any) => s.id === surveyId);
      if (survey) {
        setTitle(survey.title);
        setDescription(survey.description || "");
        setQuestions(survey.questions || []);
      }
    };
    if (surveyId) loadSurvey();
  }, [surveyId]);

  const handleSelectQuestionType = (type: string) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type,
      title: "",
      required: true,
      options: ['single', 'multiple', 'dropdown', 'best-worst'].includes(type) ? ['Option 1', 'Option 2'] : [],
      items: type === 'best-worst' ? ['Item 1', 'Item 2', 'Item 3'] : [],
      rows: type === 'matrix' ? ['Row 1', 'Row 2'] : [],
      columns: type === 'matrix' ? ['1', '2', '3'] : [],
      scale: type === 'matrix' ? ['Bad', 'Neutral', 'Good'] : type === 'rating' ? ['1','2','3','4','5'] : [],
      content: type === 'description' ? 'This is a description block.' : '',
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
  };
  
  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };
  
  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setQuestions((items) => {
            const oldIndex = items.findIndex(item => item.id === active.id);
            const newIndex = items.findIndex(item => item.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    }
  };
  
  const handleImageUploadClick = (questionId: string) => {
    const input = fileInputRef.current;
    if (input) {
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            handleUpdateQuestion({ ...questions.find(q => q.id === questionId)!, imageUrl: event.target?.result as string } as Question);
          };
          reader.readAsDataURL(files[0]);
        }
      };
      input.click();
    }
  };

  const saveSurvey = async (status = "draft") => {
    if (!title.trim()) { alert("Please enter a survey title"); return; }
    if (questions.length === 0) { alert("Please add at least one question"); return; }

    setIsSaving(true);
    try {
        const allSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
        
        if (surveyId) {
            const index = allSurveys.findIndex((s: any) => s.id === surveyId);
            if (index > -1) {
                // Update existing survey, but preserve original created_date
                allSurveys[index] = { ...allSurveys[index], title, description, questions, status };
            } else {
                 // This case should ideally not happen if editing, but as a fallback
                 allSurveys.push({ title, description, questions, status, id: surveyId, created_date: new Date().toISOString() });
            }
        } else {
            allSurveys.push({ title, description, questions, status, id: Date.now().toString(), created_date: new Date().toISOString() });
        }

        localStorage.setItem('surveys', JSON.stringify(allSurveys));
        router.push("/dashboard/survey2");
    } catch(e) {
        console.error(e);
        alert('Failed to save survey');
    } finally {
        setIsSaving(false);
    }
  };
  
  const QuestionComponents: { [key: string]: React.ComponentType<any> } = {
    single: SingleSelectionQuestion,
    multiple: MultipleSelectionQuestion,
    dropdown: DropdownQuestion,
    text: TextQuestion,
    number: NumberQuestion,
    phone: PhoneQuestion,
    email: EmailQuestion,
    rating: RatingQuestion,
    nps: NPSQuestion,
    description: DescriptionBlock,
    'best-worst': BestWorstQuestion,
    matrix: MatrixQuestion,
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/survey2")} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">{surveyId ? "Edit Survey" : "Create New Survey"}</h1>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[320px,1fr] gap-6">
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <QuestionTypePalette onSelectType={handleSelectQuestionType} />
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                                <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                            </CardContent>
                        </Card>
                        
                        <DndContext sensors={useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}))} collisionDetection={closestCenter} onDragEnd={handleReorder}>
                            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                <AnimatePresence>
                                    {questions.map((q) => {
                                        const QuestionComponent = QuestionComponents[q.type];
                                        return (
                                            <SortableCard key={q.id} id={q.id}>
                                                {QuestionComponent ? (
                                                     <QuestionComponent 
                                                        question={q} 
                                                        onUpdate={handleUpdateQuestion} 
                                                        onDelete={() => handleDeleteQuestion(q.id)}
                                                        onImageUpload={() => handleImageUploadClick(q.id)}
                                                        cardClassName="bg-white"
                                                    />
                                                ) : <p>Unknown question type: {q.type}</p>}
                                            </SortableCard>
                                        );
                                    })}
                                </AnimatePresence>
                            </SortableContext>
                        </DndContext>
                        
                        {questions.length > 0 && (
                            <div className="flex gap-3 sticky bottom-6 bg-white rounded-2xl p-4 shadow-lg border">
                                <Button variant="outline" size="lg" onClick={() => saveSurvey("draft")} disabled={isSaving} className="flex-1"><Save className="w-5 h-5 mr-2" />Save as Draft</Button>
                                <Button size="lg" onClick={() => saveSurvey("active")} disabled={isSaving} className="flex-1">{isSaving ? "Publishing..." : "Publish Survey"}</Button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    </div>
  );
}

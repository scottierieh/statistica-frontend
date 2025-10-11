
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GripVertical, Plus, Trash2, Info, ImageIcon, X, Phone, Mail, Share2, ThumbsUp, Grid3x3, ChevronDown, Network, Shuffle, RefreshCw, Save, Replace, PlusCircle, Copy, Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type { Survey, Question, ConjointAttribute, Criterion } from '@/entities/Survey';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';


interface SurveyDetailsCardProps {
    survey: Survey;
    setSurvey: React.Dispatch<React.SetStateAction<Survey>>;
    onImageUpload: (target: { type: 'startPage', field: 'logo' | 'image' }) => void;
}


const SurveyDetailsCard = ({ survey, setSurvey, onImageUpload }: SurveyDetailsCardProps) => {
    
    const handleSurveyChange = (updateFn: (draft: Survey) => void) => {
        setSurvey(produce(updateFn));
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle>Survey Details</CardTitle>
                </div>
                <CardDescription>
                    Configure your survey settings and start page
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                
                {/* Start Page Configuration */}
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 p-4 border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/10"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-semibold text-sm">Start Page Configuration</h4>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Welcome Title
                            </Label>
                            <Input 
                                value={survey.startPage?.title || ''} 
                                onChange={(e) => handleSurveyChange(draft => {
                                    if (!draft.startPage) draft.startPage = { title: '', description: '', buttonText: '' };
                                    draft.startPage.title = e.target.value;
                                })} 
                                placeholder="e.g., Welcome to our Survey!"
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Description
                            </Label>
                            <Textarea 
                                value={survey.startPage?.description || ''} 
                                onChange={(e) => handleSurveyChange(draft => {
                                     if (!draft.startPage) draft.startPage = { title: '', description: '', buttonText: '' };
                                    draft.startPage.description = e.target.value
                                })} 
                                placeholder="e.g., Your feedback helps us improve our services."
                                rows={2}
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Button Text
                            </Label>
                            <Input 
                                value={survey.startPage?.buttonText || 'Start Survey'} 
                                onChange={(e) => handleSurveyChange(draft => {
                                    if (!draft.startPage) draft.startPage = { title: '', description: '', buttonText: '' };
                                    draft.startPage.buttonText = e.target.value
                                })} 
                                placeholder="e.g., Begin Survey"
                            />
                        </div>
                    </div>
                </motion.div>
            </CardContent>
        </Card>
    );
};


interface QuestionHeaderProps {
    question: Question;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
}


const QuestionHeader = ({ 
    question, 
    onUpdate, 
    onDelete, 
    onImageUpload, 
    onDuplicate,
    styles,
    questionNumber
}: QuestionHeaderProps) => {
    const questionStyle = { 
        fontSize: `${styles.questionTextSize}px`, 
        color: styles.primaryColor 
    };
    
    return (
        <div className="space-y-3">
            <Badge 
                variant="secondary" 
                className="absolute -top-3 -left-3 z-10 font-mono"
            >
                Q{questionNumber}
            </Badge>
            
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                    <Input 
                        placeholder="Enter your question" 
                        value={question.title} 
                        onChange={(e) => onUpdate?.({...question, title: e.target.value})} 
                        className="text-lg font-semibold border-none focus-visible:ring-0 p-0 h-auto bg-transparent" 
                        style={questionStyle}
                    />
                    {question.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                </div>
                
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onDuplicate?.(question.id)}
                        title="Duplicate"
                    >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onImageUpload?.(question.id)}
                        title="Add image"
                    >
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    
                    <div className="flex items-center gap-2 px-2">
                        <Switch 
                            id={`required-${question.id}`} 
                            checked={question.required} 
                            onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} 
                        />
                        <Label 
                            htmlFor={`required-${question.id}`} 
                            className="text-xs cursor-pointer"
                        >
                            Required
                        </Label>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete?.(question.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            
            {question.imageUrl && (
                <div className="relative group">
                    <Image 
                        src={question.imageUrl} 
                        alt="Question image" 
                        width={400} 
                        height={300} 
                        className="rounded-lg max-h-60 w-auto object-contain border" 
                    />
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onUpdate?.({...question, imageUrl: undefined})}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};

const SingleSelectionQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    const [answer, setAnswer] = React.useState<string | undefined>();
    const theme = styles.theme || 'default';
    const choiceStyle = { fontSize: `${styles.answerTextSize}px` };
    
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
        if (question.options.length <= 2) return;
        const newOptions = question.options.filter((_:any, i:number) => i !== index);
        onUpdate?.({ ...question, options: newOptions });
    };

    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                
                <RadioGroup value={answer} onValueChange={setAnswer} className="space-y-2">
                    {(question.options || []).map((option: string, index: number) => (
                        <div key={index} className="flex items-center gap-3 group p-2 rounded-lg hover:bg-slate-50 transition-colors">
                            {theme !== 'modern' && (
                                <RadioGroupItem 
                                    value={option} 
                                    id={`q${question.id}-o${index}`} 
                                    disabled 
                                />
                            )}
                            
                            <Input 
                                placeholder={`Option ${index + 1}`} 
                                className="border-none focus-visible:ring-0 bg-transparent flex-1" 
                                style={choiceStyle}
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                            />
                            
                            {theme === 'modern' && answer === option && (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                            )}
                            
                            {question.options.length > 2 && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity" 
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        deleteOption(index); 
                                    }}
                                >
                                    <X className="w-4 h-4"/>
                                </Button>
                            )}
                        </div>
                    ))}
                </RadioGroup>
                
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" 
                    onClick={addOption}
                >
                    <Plus className="w-4 h-4 mr-2" /> 
                    Add option
                </Button>
            </CardContent>
        </Card>
    );
};

const MultipleSelectionQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
   const [answer, setAnswer] = React.useState<string[]>([]);
   const choiceStyle = { fontSize: `${styles.answerTextSize}px` };

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

   const handleCheckChange = (checked: boolean, opt: string) => {
       const currentAnswers = answer || [];
       const newAnswers = checked
           ? [...currentAnswers, opt]
           : currentAnswers.filter((a: string) => a !== opt);
       setAnswer(newAnswers);
   }
   
   return (
       <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
               <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
               <div className="space-y-2">
                    {(question.options || []).map((option: string, index: number) => (
                       <div key={index} className="flex items-center gap-3 group p-2 rounded-lg hover:bg-slate-50 transition-colors">
                           <Checkbox 
                               id={`q${question.id}-o${index}`} 
                               disabled 
                               checked={answer?.includes(option)}
                           />
                           <Input 
                                placeholder={`Option ${index + 1}`} 
                                className="border-none focus-visible:ring-0 bg-transparent flex-1" 
                                style={choiceStyle}
                                value={option} 
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteOption(index)}>
                                <X className="w-4 h-4"/>
                            </Button>
                       </div>
                   ))}
               </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" 
                    onClick={addOption}
                >
                    <Plus className="w-4 h-4 mr-2" /> 
                    Add option
                </Button>
            </CardContent>
        </Card>
   );
};

const DropdownQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
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
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                 <Select disabled><SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger></Select>
                 <div className="mt-4 space-y-2">
                    <Label>Options</Label>
                    {(question.options || []).map((option: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input value={option} onChange={e => handleOptionChange(index, e.target.value)} />
                             <Button variant="ghost" size="icon" onClick={() => deleteOption(index)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                        </div>
                    ))}
                     <Button variant="outline" size="sm" onClick={addOption}><PlusCircle className="mr-2 h-4 w-4"/> Add Option</Button>
                </div>
            </CardContent>
        </Card>
    )
};
const TextQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <Textarea placeholder="User's answer will be here..." disabled />
            </CardContent>
        </Card>
    );
};
const NumberQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
         <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <Input type="number" placeholder="User will enter a number here..." disabled />
            </CardContent>
        </Card>
    )
};
const PhoneQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
         <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <Input type="tel" placeholder="User will enter phone number..." disabled />
            </CardContent>
        </Card>
    )
};
const EmailQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
         <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <Input type="email" placeholder="User will enter email address..." disabled />
            </CardContent>
        </Card>
    )
};
const RatingQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
     return (
         <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-8 h-8 text-yellow-300" />)}
                </div>
            </CardContent>
        </Card>
    )
};
const NPSQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                 <div className="flex items-center justify-between gap-1 flex-wrap">
                    {[...Array(11)].map((_, i) => <Button key={i} variant='outline' size="icon" className="h-8 w-7 text-xs p-0">{i}</Button>)}
                </div>
            </CardContent>
        </Card>
    )
};

const DescriptionBlock = ({ question, onUpdate, onDelete, onDuplicate, styles, questionNumber }: any) => {
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={() => {}}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <Textarea value={question.content} onChange={(e) => onUpdate?.({ ...question, content: e.target.value })} placeholder="Enter your description text here."/>
            </CardContent>
        </Card>
    );
};

const BestWorstQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
             <CardContent className="p-6 space-y-4">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-center">Best</TableHead><TableHead className="text-center">Worst</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {(question.items || []).map((item: string, index: number) => (
                            <TableRow key={index}>
                                <TableCell>{item}</TableCell>
                                <TableCell className="text-center"><RadioGroup><RadioGroupItem value="best" disabled /></RadioGroup></TableCell>
                                <TableCell className="text-center"><RadioGroup><RadioGroupItem value="worst" disabled /></RadioGroup></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
const MatrixQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    
    const handleUpdate = (type: 'rows' | 'columns' | 'scale', index: number, value: string) => {
        const newArr = [...(question[type] || [])];
        newArr[index] = value;
        onUpdate?.({ ...question, [type]: newArr });
    };

    const handleAdd = (type: 'rows' | 'columns' | 'scale') => {
        const newArr = [...(question[type] || []), `New ${type.slice(0, -1)}`];
        onUpdate?.({ ...question, [type]: newArr });
    };

    const handleRemove = (type: 'rows' | 'columns' | 'scale', index: number) => {
        const newArr = (question[type] || []).filter((_: any, i: number) => i !== index);
        onUpdate?.({ ...question, [type]: newArr });
    };
    
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <div className="overflow-x-auto mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3 min-w-[150px]"></TableHead>
                                {(question.columns || []).map((header: string, colIndex: number) => (
                                    <TableHead key={`header-${colIndex}`} className="text-center text-xs min-w-[80px]">
                                        <div className="flex items-center gap-1 justify-center">
                                            <Input value={header} onChange={e => handleUpdate('columns', colIndex, e.target.value)} className="text-center bg-transparent border-none p-0" />
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemove('columns', colIndex)}><X className="h-3 w-3"/></Button>
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead><Button variant="ghost" size="icon" onClick={() => handleAdd('columns')}><PlusCircle className="w-4"/></Button></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(question.rows || []).map((row: string, rowIndex: number) => (
                                <TableRow key={`row-${rowIndex}`}>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Input value={row} onChange={e => handleUpdate('rows', rowIndex, e.target.value)} className="font-semibold bg-transparent border-none p-0" />
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemove('rows', rowIndex)}><X className="h-3 w-3"/></Button>
                                        </div>
                                    </TableHead>
                                    {(question.columns || []).map((col: string, colIndex: number) => (
                                        <TableCell key={`cell-${rowIndex}-${colIndex}`} className="text-center">
                                            <RadioGroup><RadioGroupItem value={col} disabled /></RadioGroup>
                                        </TableCell>
                                    ))}
                                    <TableCell></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 <Button variant="link" size="sm" className="mt-2" onClick={() => handleAdd('rows')}><PlusCircle className="w-4 h-4 mr-2" /> Add Row</Button>
            </CardContent>
        </Card>
    );
};
const SemanticDifferentialQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
         <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <div className="text-center text-muted-foreground py-4">Semantic Differential Scale Editor</div>
            </CardContent>
        </Card>
    )
};
const LikertQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
     return (
         <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6 space-y-4">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <div className="text-center text-muted-foreground py-4">Likert Scale Editor</div>
            </CardContent>
        </Card>
    )
};

const ConjointQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
            <CardContent className="p-6">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                 <div className="mt-4 space-y-2">
                     <Label>Description</Label>
                     <Textarea value={question.description} onChange={(e) => onUpdate?.({...question, description: e.target.value})} placeholder="Explain the choice task to the user."/>
                 </div>
                 <div className="mt-4 space-y-4">
                    <h4 className="font-semibold">Attributes & Levels</h4>
                    {(question.attributes || []).map((attr: ConjointAttribute, index: number) => (
                        <div key={attr.id} className="p-2 border rounded-md">
                            <Input value={attr.name} onChange={e => {
                                const newAttrs = produce(question.attributes, (draft: ConjointAttribute[]) => { draft[index].name = e.target.value });
                                onUpdate?.({...question, attributes: newAttrs});
                            }} placeholder="Attribute Name (e.g., Brand)" className="font-semibold" />
                             <Input value={attr.levels.join(', ')} onChange={e => {
                                const newAttrs = produce(question.attributes, (draft: ConjointAttribute[]) => { draft[index].levels = e.target.value.split(',').map(s => s.trim()) });
                                onUpdate?.({...question, attributes: newAttrs});
                            }} placeholder="Levels, comma-separated (e.g., Apple, Samsung)" className="text-sm mt-1" />
                        </div>
                    ))}
                 </div>
            </CardContent>
        </Card>
    );
};
const RatingConjointQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return <ConjointQuestion question={question} onUpdate={onUpdate} onDelete={onDelete} onImageUpload={onImageUpload} onDuplicate={onDuplicate} styles={styles} questionNumber={questionNumber} />;
};

const AHPQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
  return (
    <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
      <CardContent className="p-6 space-y-4">
        <QuestionHeader 
            question={question}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onImageUpload={onImageUpload}
            onDuplicate={onDuplicate}
            styles={styles}
            questionNumber={questionNumber}
        />
        <div className="text-center text-muted-foreground py-4">AHP Editor</div>
      </CardContent>
    </Card>
  );
};
const ServqualQuestion = ({ question, onUpdate, onDelete, onImageUpload, onDuplicate, styles, questionNumber }: any) => {
    return (
        <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible">
             <CardContent className="p-6 space-y-4">
                 <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                 <div className="text-center text-muted-foreground py-4">SERVQUAL Scale Editor</div>
             </CardContent>
        </Card>
    )
};


const SortableCard = ({ id, children, questionNumber }: { 
    id: any; 
    children: React.ReactNode;
    questionNumber: number;
}) => {
    const { 
        attributes, 
        listeners, 
        setNodeRef, 
        transform, 
        transition, 
        isDragging 
    } = useSortable({ id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };
    
    return (
        <motion.div 
            ref={setNodeRef} 
            style={style} 
            className="flex items-start gap-3 group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            layout
        >
            <div 
                {...attributes} 
                {...listeners} 
                className={cn(
                    "p-2 cursor-grab active:cursor-grabbing mt-3",
                    "hover:bg-slate-100 rounded-lg transition-colors",
                    "opacity-0 group-hover:opacity-100"
                )}
            >
                <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 relative">
                {children}
            </div>
        </motion.div>
    );
};

const EmptyState = () => {
    return (
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
            <CardContent className="p-12 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
                        <PlusCircle className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        No questions yet
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Get started by adding your first question. Choose from various question types to create your perfect survey.
                    </p>
                </motion.div>
            </CardContent>
        </Card>
    );
};

interface QuestionListProps {
  survey: Survey;
  setSurvey: React.Dispatch<React.SetStateAction<Survey>>;
  onUpdate: (questions: Question[] | ((prev: Question[]) => Question[])) => void;
  onImageUpload: (target: { type: 'question'; id: string } | { type: 'startPage'; field: 'logo' | 'image' }) => void;
  onDuplicate: (questionId: string) => void;
  styles: any;
  saveSurvey?: (status: string) => void;
  isSaving?: boolean;
}


export default function QuestionList({ survey, setSurvey, onUpdate: setQuestions, onImageUpload, onDuplicate, styles, saveSurvey, isSaving }: QuestionListProps) {
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));


    const handleUpdateQuestion = (updatedQuestion: Question) => {
        setQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? { ...q, ...updatedQuestion } : q));
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
        setActiveId(null);
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
        'semantic-differential': SemanticDifferentialQuestion,
        likert: LikertQuestion,
        conjoint: ConjointQuestion,
        'rating-conjoint': RatingConjointQuestion,
        ahp: AHPQuestion,
        servqual: ServqualQuestion,
    };

    return (
        <div className="space-y-6">
            <SurveyDetailsCard 
                survey={survey}
                setSurvey={setSurvey}
                onImageUpload={(target) => onImageUpload({ type: 'startPage', field: target as any })}
            />

            {survey.questions.length === 0 ? (
                 <EmptyState />
            ) : (
                <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragStart={({ active }) => setActiveId(active.id as string)}
                    onDragEnd={handleReorder}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext items={survey.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                        <AnimatePresence>
                            {survey.questions.map((q, index) => {
                                const QuestionComponent = QuestionComponents[q.type];
                                return (
                                    <SortableCard key={q.id} id={q.id} questionNumber={index + 1}>
                                        {QuestionComponent ? (
                                            <QuestionComponent 
                                                question={q} 
                                                onUpdate={handleUpdateQuestion} 
                                                onDelete={() => handleDeleteQuestion(q.id)}
                                                onImageUpload={() => onImageUpload({ type: 'question', id: q.id })}
                                                onDuplicate={() => onDuplicate(q.id)}
                                                styles={styles}
                                                questionNumber={index + 1}
                                            />
                                        ) : <p>Unknown question type: {q.type}</p>}
                                    </SortableCard>
                                );
                            })}
                        </AnimatePresence>
                    </SortableContext>
                </DndContext>
            )}

            {!isSaving && survey.questions.length > 0 && (
                <div className="flex gap-3 sticky bottom-6 bg-white rounded-2xl p-4 shadow-lg border">
                    <Button variant="outline" size="lg" onClick={() => saveSurvey && saveSurvey("draft")} disabled={isSaving} className="flex-1"><Save className="w-5 h-5 mr-2" />Save as Draft</Button>
                    <Button size="lg" onClick={() => saveSurvey && saveSurvey("active")} disabled={isSaving} className="flex-1">{isSaving ? "Publishing..." : "Publish Survey"}</Button>
                </div>
            )}
        </div>
    );
}


'use client';

import React from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { produce } from 'immer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GripVertical, PlusCircle, Trash2, Info, ImageIcon, Star, ThumbsDown, ThumbsUp, Sigma, CheckCircle2, CaseSensitive, Phone, Mail, FileText, Grid3x3, Share2, ChevronDown, Network, X, Shuffle, RefreshCw, Save, Replace } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type { Question, ConjointAttribute, Criterion } from '@/entities/Survey';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


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


// --- Individual Question Type Components ---
const SingleSelectionQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
    const [answer, setAnswer] = React.useState<string | undefined>();
    
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

    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    const choiceStyle = { fontSize: `${styles.answerTextSize}px` };

    const theme = styles.theme || 'default';
    
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle}/>
                         {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
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
                </div>
                {question.imageUrl && (
                     <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                    </div>
                )}
                <RadioGroup value={answer} onValueChange={setAnswer} className="space-y-2">
                    {(question.options || []).map((option: string, index: number) => (
                        <div key={index} className="flex items-center group">
                             <Label
                                htmlFor={`q${question.id}-o${index}`}
                                className={cn(
                                "flex flex-1 items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                                answer === option 
                                    ? "bg-primary/10 border-primary shadow-md" 
                                    : "bg-background hover:bg-accent/50 hover:border-primary/50"
                                )}
                            >
                                {theme !== 'modern' && <RadioGroupItem value={option} id={`q${question.id}-o${index}`} disabled />}
                                <Input
                                    placeholder={`Option ${index + 1}`}
                                    className="border-none focus:ring-0 p-0 h-auto bg-transparent flex-1"
                                    style={choiceStyle}
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                />
                                {theme === 'modern' && <CheckCircle2 className={cn("w-6 h-6 opacity-0", answer === option && "opacity-100 text-primary")} />}
                            </Label>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.preventDefault(); deleteOption(index); }}>
                                <Trash2 className="w-4 h-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                </RadioGroup>
                <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Option
                </Button>
            </div>
        </Card>
    );
};

const MultipleSelectionQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
   const handleOptionChange = (index: number, value: string) => {
       const newOptions = [...(question.options || [])];
       newOptions[index] = value;
       onUpdate?.({ ...question, options: newOptions });
   };

   const addOption = () => {
       const newOptions = [...(question.options || []), `Option ${question.options.length + 1}`];
       onUpdate?.({ ...question, options: newOptions });
   };

   const deleteOption = (index: number) => {
       const newOptions = (question.options || []).filter((_: any, i: number) => i !== index);
       onUpdate?.({ ...question, options: newOptions });
   };

   const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    const choiceStyle = { fontSize: `${styles.answerTextSize}px` };
    const theme = styles.theme || 'default';
   
   return (
       <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                {question.imageUrl && <div className="my-4"><Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" /></div>}
                <div className="space-y-2">
                    {(question.options || []).map((option: string, index: number) => (
                       <Label key={index} htmlFor={`q${question.id}-o${index}`} className={cn("flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer", 'bg-background hover:bg-accent/50 hover:border-primary/50' )}>
                           <Checkbox id={`q${question.id}-o${index}`} disabled />
                           <Input placeholder={`Option ${index + 1}`} className="border-none focus:ring-0 p-0 h-auto bg-transparent flex-1" style={choiceStyle} value={option} onChange={(e) => handleOptionChange(index, e.target.value)} />
                           <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 hover:opacity-100" onClick={(e) => { e.preventDefault(); deleteOption(index); }}>
                               <Trash2 className="w-4 h-4 text-destructive"/>
                           </Button>
                       </Label>
                   ))}
                </div>
                 <Button variant="link" size="sm" className="mt-2" onClick={addOption}><PlusCircle className="w-4 h-4 mr-2" /> Add Option</Button>
            </div>
        </Card>
   );
};

const DropdownQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    
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
        const newOptions = (question.options || []).filter((_: any, i: number) => i !== index);
        onUpdate?.({ ...question, options: newOptions });
    };
    
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                <Select disabled>
                    <SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger>
                </Select>
                 <div className="mt-4 space-y-2">
                    <Label>Options</Label>
                    {(question.options || []).map((option: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} />
                             <Button variant="ghost" size="icon" onClick={() => deleteOption(index)}>
                                <Trash2 className="w-4 h-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                     <Button variant="outline" size="sm" onClick={addOption}><PlusCircle className="mr-2 h-4 w-4"/> Add Option</Button>
                </div>
            </div>
        </Card>
    );
};

const TextQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                <Textarea placeholder="Your answer..." disabled />
            </div>
        </Card>
    );
};

const NumberQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                {question.description && <Textarea value={question.description} onChange={(e) => onUpdate?.({ ...question, description: e.target.value })} placeholder="Enter your description text here."/>}
                <Input type="number" placeholder="Enter a number..." disabled className="mt-2" />
            </div>
        </Card>
    );
};

const PhoneQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                <Input type="tel" placeholder="Enter phone number..." disabled />
            </div>
        </Card>
    );
};

const EmailQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                <Input type="email" placeholder="Enter email address..." disabled />
            </div>
        </Card>
    );
};

const RatingQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-8 h-8 text-yellow-300" />)}
                </div>
            </div>
        </Card>
    );
};

const NPSQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}><ImageIcon className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                 <div className="flex items-center justify-between gap-1 flex-wrap">
                    {[...Array(11)].map((_, i) => <Button key={i} variant='outline' size="icon" className="h-10 w-8 text-xs">{i}</Button>)}
                </div>
            </div>
        </Card>
    );
};


const DescriptionBlock = ({ question, onUpdate, onDelete, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; styles: any; }) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your title (optional)" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                </div>
                <Textarea value={question.content} onChange={(e) => onUpdate?.({ ...question, content: e.target.value })} placeholder="Enter your description text here."/>
            </div>
        </Card>
    );
};

const BestWorstQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
    // Simplified view for editor
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                         <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
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
            </div>
        </Card>
    );
};


const MatrixQuestion = ({ question, onUpdate, onDelete, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; styles: any;}) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    
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
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                    <div className="flex items-center">
                         <div className="flex items-center space-x-2 mr-2">
                            <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                            <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
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
            </div>
        </Card>
    );
};

const SemanticDifferentialQuestion = ({ question, onUpdate, onDelete, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; styles: any; }) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    
     const handleBipolarScaleChange = (index: number, side: 'left' | 'right', value: string) => {
        const newRows = produce(question.rows || [], (draft: string[]) => {
            const parts = (draft[index] || ' vs ').split(' vs ');
            if (side === 'left') {
                parts[0] = value;
            } else {
                parts[1] = value;
            }
            draft[index] = parts.join(' vs ');
        });
        onUpdate?.({ ...question, rows: newRows });
    };

    const handleAddBipolarScale = () => {
        const newRows = [...(question.rows || []), 'Left Label vs Right Label'];
        onUpdate?.({ ...question, rows: newRows });
    };
    
    const handleRemoveBipolarScale = (index: number) => {
        const newRows = (question.rows || []).filter((_: any, i: number) => i !== index);
        onUpdate?.({ ...question, rows: newRows });
    };
    
    const handleScalePointChange = (newSize: number) => {
        const oldSize = question.numScalePoints || 7;
        const currentLabels = question.scale || [];
        const newLabels = Array(newSize).fill('').map((_, i) => {
            if (i < oldSize) return currentLabels[i];
            return `${i + 1}`;
        });
         onUpdate?.({ ...question, numScalePoints: newSize, scale: newLabels });
    };

    const handleScaleLabelChange = (index: number, value: string) => {
        const newScale = [...(question.scale || [])];
        newScale[index] = value;
        onUpdate?.({ ...question, scale: newScale });
    };
    
    const numPoints = question.numScalePoints || 7;

    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-start mb-2">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                    <div className="flex items-center">
                        <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                        <Label htmlFor={`required-${question.id}`} className="mr-2">Required</Label>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>

                <div>
                    <Label>Bipolar Scales</Label>
                    <div className="space-y-2 mt-2">
                        {(question.rows || []).map((row: string, index: number) => {
                            const [left, right] = (row || ' vs ').split(' vs ').map(s => s.trim());
                            return (
                                <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                                    <Input value={left || ''} onChange={e => handleBipolarScaleChange(index, 'left', e.target.value)} placeholder="Left Label" />
                                    <span>vs</span>
                                    <Input value={right || ''} onChange={e => handleBipolarScaleChange(index, 'right', e.target.value)} placeholder="Right Label" />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveBipolarScale(index)}><X className="h-4 w-4"/></Button>
                                </div>
                            );
                        })}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleAddBipolarScale}><PlusCircle className="mr-2 h-4 w-4"/> Add Scale Row</Button>
                </div>
                
                 <div>
                    <Label>Scale Points</Label>
                    <Select value={String(numPoints)} onValueChange={v => handleScalePointChange(parseInt(v))}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[...Array(8).keys()].map(i => <SelectItem key={i + 2} value={String(i + 2)}>{i + 2} points</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 
                 <div>
                    <Label>Scale Point Labels</Label>
                     <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                        {Array.from({ length: numPoints }).map((_, i) => (
                             <Input key={i} value={question.scale?.[i] || ''} onChange={e => handleScaleLabelChange(i, e.target.value)} placeholder={`Point ${i+1}`} />
                        ))}
                    </div>
                 </div>
            </div>
        </Card>
    );
};

const LikertQuestion = ({ question, onUpdate, onDelete, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; styles: any; }) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    
     const handleUpdate = (type: 'rows' | 'scale', index: number, value: string) => {
        const newArr = [...(question[type] || [])];
        newArr[index] = value;
        onUpdate?.({ ...question, [type]: newArr });
    };

    const handleAdd = (type: 'rows' | 'scale') => {
        const newArr = [...(question[type] || []), `New ${type === 'rows' ? 'Statement' : 'Scale Point'}`];
        onUpdate?.({ ...question, [type]: newArr });
    };

    const handleRemove = (type: 'rows' | 'scale', index: number) => {
        const newArr = (question[type] || []).filter((_: any, i: number) => i !== index);
        onUpdate?.({ ...question, [type]: newArr });
    };

    const handleScalePointChange = (newSize: number) => {
        const oldSize = question.numScalePoints || 7;
        const currentLabels = question.scale || [];
        const newLabels = Array(newSize).fill('').map((_, i) => {
            if (i < oldSize) return currentLabels[i];
            return `${i + 1}`;
        });
        onUpdate?.({ ...question, numScalePoints: newSize, scale: newLabels });
    };

    const numPoints = question.numScalePoints || 5;
    
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6 space-y-4">
                 <div className="flex justify-between items-start mb-2">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                    <div className="flex items-center">
                        <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({ ...question, required: checked })} />
                        <Label htmlFor={`required-${question.id}`} className="mr-2">Required</Label>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                    </div>
                </div>

                <div>
                    <Label>Statements (Rows)</Label>
                    <div className="space-y-2 mt-2">
                        {(question.rows || []).map((row: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={row} onChange={e => handleUpdate('rows', index, e.target.value)} placeholder={`Statement ${index + 1}`} />
                                <Button variant="ghost" size="icon" onClick={() => handleRemove('rows', index)}><X className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => handleAdd('rows')}><PlusCircle className="mr-2 h-4 w-4"/> Add Statement</Button>
                </div>

                <div>
                    <Label>Scale Points</Label>
                    <Select value={String(numPoints)} onValueChange={v => handleScalePointChange(parseInt(v))}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[...Array(8).keys()].map(i => <SelectItem key={i + 2} value={String(i + 2)}>{i + 2} points</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 
                 <div>
                    <Label>Scale Point Labels</Label>
                     <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                        {Array.from({ length: numPoints }).map((_, i) => (
                             <Input key={i} value={question.scale?.[i] || ''} onChange={e => handleUpdate('scale', i, e.target.value)} placeholder={`Point ${i+1}`} />
                        ))}
                    </div>
                 </div>
            </div>
        </Card>
    );
};


const ConjointQuestion = ({ question, onUpdate, onDelete, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; styles: any; }) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    
    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Conjoint Analysis Title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                        {question.required && <span className="text-destructive text-xs">* Required</span>}
                    </div>
                     <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                 </div>
                 <div className="space-y-2">
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
            </div>
        </Card>
    );
};

const RatingConjointQuestion = ({ question, onUpdate, onDelete, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; styles: any; }) => {
    // This component is very similar to the Choice-Based one, just a different type
    return <ConjointQuestion question={question} onUpdate={onUpdate} onDelete={onDelete} styles={styles} />;
};

const AHPQuestion = ({ question, onUpdate, onDelete, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; styles: any; }) => {
  const { toast } = useToast();
  const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };

  const handleListChange = (type: 'criteria' | 'alternatives', value: string) => {
    const items = value.split(',').map(s => s.trim()).filter(Boolean);
    if (type === 'criteria') {
        const newCriteria = items.map((name, i) => ({ id: `c${i+1}`, name }));
        onUpdate?.({ ...question, [type]: newCriteria });
    } else {
        onUpdate?.({ ...question, [type]: items });
    }
  };

  const handleCriterionNameChange = (index: number, value: string) => {
    const newCriteria = produce(question.criteria, (draft: Criterion[]) => {
        draft[index].name = value;
    });
    onUpdate?.({ ...question, criteria: newCriteria });
  };
  
  const handleSubCriterionChange = (critIndex: number, subIndex: number, value: string) => {
      const newCriteria = produce(question.criteria, (draft: Criterion[]) => {
          if (draft[critIndex].subCriteria) {
              draft[critIndex].subCriteria![subIndex].name = value;
          }
      });
      onUpdate?.({ ...question, criteria: newCriteria });
  };
  
  const addSubCriterion = (critIndex: number) => {
    const newCriteria = produce(question.criteria, (draft: Criterion[]) => {
        if (!draft[critIndex].subCriteria) {
            draft[critIndex].subCriteria = [];
        }
        const newId = `sc${(draft[critIndex].subCriteria?.length || 0) + 1}`;
        draft[critIndex].subCriteria!.push({ id: newId, name: 'New Sub-criterion' });
    });
    onUpdate?.({ ...question, criteria: newCriteria });
  };
  
  const removeSubCriterion = (critIndex: number, subIndex: number) => {
    const newCriteria = produce(question.criteria, (draft: Criterion[]) => {
        if (draft[critIndex].subCriteria) {
            draft[critIndex].subCriteria!.splice(subIndex, 1);
        }
    });
    onUpdate?.({ ...question, criteria: newCriteria });
  };

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <Input placeholder="AHP Question Title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
          <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
        </div>
        <div>
          <Label>Criteria</Label>
          <div className="space-y-2 mt-2">
            {(question.criteria || []).map((criterion: Criterion, critIndex: number) => (
              <Card key={criterion.id} className="p-3">
                <div className="flex items-center gap-2">
                  <Input value={criterion.name} onChange={(e) => handleCriterionNameChange(critIndex, e.target.value)} />
                </div>
                <div className="pl-6 mt-2 space-y-2">
                    {(criterion.subCriteria || []).map((sub, subIndex) => (
                        <div key={sub.id} className="flex items-center gap-2">
                            <Input value={sub.name} onChange={e => handleSubCriterionChange(critIndex, subIndex, e.target.value)} />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSubCriterion(critIndex, subIndex)}><X className="h-4 w-4"/></Button>
                        </div>
                    ))}
                    <Button variant="link" size="sm" onClick={() => addSubCriterion(critIndex)}><PlusCircle className="mr-2 h-4 w-4"/> Add Sub-criterion</Button>
                </div>
              </Card>
            ))}
          </div>
           <Button variant="outline" size="sm" className="mt-2" onClick={() => onUpdate?.({ ...question, criteria: [...(question.criteria || []), { id: `c${(question.criteria || []).length + 1}`, name: 'New Criterion'}] })}><PlusCircle className="mr-2 h-4 w-4"/> Add Criterion</Button>
        </div>
        <div>
          <Label>Alternatives (Optional)</Label>
           <Textarea
            value={(question.alternatives || []).join(', ')}
            onChange={(e) => handleListChange('alternatives', e.target.value)}
            placeholder="e.g., Phone A, Phone B, Phone C"
          />
           <p className="text-xs text-muted-foreground mt-1">Enter alternatives separated by commas.</p>
        </div>
      </div>
    </Card>
  );
};

const ServqualQuestion = ({ question, onUpdate, onDelete, styles }: { question: any, onUpdate?: (q: any) => void, onDelete?: (id: string) => void, styles: any }) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };

    const handleRowChange = (index: number, value: string) => {
        const newRows = [...(question.rows || [])];
        newRows[index] = value;
        onUpdate?.({ ...question, rows: newRows });
    };

    const addRow = () => {
        const newRows = [...(question.rows || []), `New Statement`];
        onUpdate?.({ ...question, rows: newRows });
    };

    const removeRow = (index: number) => {
        const newRows = (question.rows || []).filter((_: any, i: number) => i !== index);
        onUpdate?.({ ...question, rows: newRows });
    };
    
    const showExpectation = question.servqualType !== 'Perception';
    const showPerception = question.servqualType !== 'Expectation';

    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto bg-transparent" style={questionStyle} />
                    <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/2">Statement</TableHead>
                                {showExpectation && <TableHead className="text-center">Expectation</TableHead>}
                                {showPerception && <TableHead className="text-center">Perception</TableHead>}
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {(question.rows || []).map((row: string, rowIndex: number) => (
                                <TableRow key={`row-${rowIndex}`}>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Input value={row} onChange={e => handleRowChange(rowIndex, e.target.value)} className="font-semibold bg-transparent border-none p-0" />
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeRow(rowIndex)}><X className="h-3 w-3"/></Button>
                                        </div>
                                    </TableHead>
                                    {showExpectation && (
                                        <TableCell className="text-center">
                                            <Input type="number" min="1" max="7" className="w-20 mx-auto" disabled />
                                        </TableCell>
                                    )}
                                    {showPerception && (
                                        <TableCell className="text-center">
                                            <Input type="number" min="1" max="7" className="w-20 mx-auto" disabled />
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 <Button variant="link" size="sm" className="mt-2" onClick={addRow}><PlusCircle className="w-4 h-4 mr-2" /> Add Row</Button>
            </div>
        </Card>
    );
};


interface QuestionListProps {
    title: string;
    setTitle: (title: string) => void;
    description: string;
    setDescription: (desc: string) => void;
    questions: Question[];
    setQuestions: (questions: Question[] | ((prev: Question[]) => Question[])) => void;
    isPreview?: boolean;
    styles: any;
    saveSurvey?: (status: string) => void;
    isSaving?: boolean;
}

export default function QuestionList({ title, setTitle, setDescription, description, questions, setQuestions, isPreview, styles, saveSurvey, isSaving }: QuestionListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
  
  const handleImageUploadClick = (questionId: string) => {
    const input = fileInputRef.current;
    if (input) {
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const questionIndex = questions.findIndex(q => q.id === questionId);
            if (questionIndex > -1) {
              const updatedQuestion = { ...questions[questionIndex], imageUrl: event.target?.result as string };
              handleUpdateQuestion(updatedQuestion);
            }
          };
          reader.readAsDataURL(files[0]);
        }
      };
      input.click();
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
    'semantic-differential': SemanticDifferentialQuestion,
    likert: LikertQuestion,
    conjoint: ConjointQuestion,
    'rating-conjoint': RatingConjointQuestion,
    ahp: AHPQuestion,
    servqual: ServqualQuestion,
  };


  return (
    <div className="space-y-6">
       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
      {!isPreview && (
        <Card className="shadow-md">
            <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </CardContent>
        </Card>
      )}
      
      <DndContext 
        sensors={useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))} 
        collisionDetection={closestCenter} 
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleReorder}
        onDragCancel={() => setActiveId(null)}
      >
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
                                    isPreview={isPreview}
                                    styles={styles}
                                />
                            ) : <p>Unknown question type: {q.type}</p>}
                        </SortableCard>
                    );
                })}
            </AnimatePresence>
        </SortableContext>
      </DndContext>
       {!isPreview && questions.length > 0 && (
            <div className="flex gap-3 sticky bottom-6 bg-white rounded-2xl p-4 shadow-lg border">
                <Button variant="outline" size="lg" onClick={() => saveSurvey && saveSurvey("draft")} disabled={isSaving} className="flex-1"><Save className="w-5 h-5 mr-2" />Save as Draft</Button>
                <Button size="lg" onClick={() => saveSurvey && saveSurvey("active")} disabled={isSaving} className="flex-1">{isSaving ? "Publishing..." : "Publish Survey"}</Button>
            </div>
        )}
    </div>
  );
}

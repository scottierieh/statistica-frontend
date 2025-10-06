
'use client';

import React from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { produce } from 'immer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { GripVertical, PlusCircle, Trash2, Info, ImageIcon, Star, ThumbsDown, ThumbsUp, Sigma, CheckCircle2, CaseSensitive, Phone, Mail, FileText, Grid3x3, Share2, ChevronDown, Network } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { type Question, type ConjointAttribute } from '@/entities/Survey';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


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
        <Card className="w-full">
        <div className="p-4">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle}/>
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
                              "flex flex-1 items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                              theme === 'flat' && "bg-slate-100",
                              theme === 'modern' && "justify-between",
                            )}
                          >
                             {theme !== 'modern' && (
                                <RadioGroupItem
                                  value={option}
                                  id={`q${question.id}-o${index}`}
                                  disabled
                                  className={cn(theme === 'flat' && "border-primary text-primary")}
                                />
                            )}
                            <Input
                                placeholder={`Option ${index + 1}`}
                                className={cn(
                                    "border-none focus:ring-0 p-0 h-auto bg-transparent",
                                    theme === 'flat' && "bg-transparent",
                                    theme === 'modern' && "bg-transparent placeholder:text-inherit"
                                )}
                                style={choiceStyle}
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                            />
                             {theme === 'modern' && <CheckCircle2 className="w-6 h-6 opacity-0" />}
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
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
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
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
                        <div key={index} className="flex items-center group">
                           <Label htmlFor={`q${question.id}-o${index}`} className={cn("flex flex-1 items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer", theme === 'flat' && "bg-slate-100")}>
                               <Checkbox id={`q${question.id}-o${index}`} disabled />
                                <Input placeholder={`Option ${index + 1}`} className="border-none focus:ring-0 p-0 h-auto bg-transparent" style={choiceStyle} value={option} onChange={(e) => handleOptionChange(index, e.target.value)} />
                           </Label>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.preventDefault(); deleteOption(index); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                    ))}
                </div>
                <Button variant="link" size="sm" className="mt-2" onClick={addOption}><PlusCircle className="w-4 h-4 mr-2" /> Add Option</Button>
            </div>
        </Card>
    );
};

const DropdownQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
    // Similar implementation as Single/Multiple choice for editing options
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full">
            <div className="p-4">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
                 {/* Option editing logic would be similar to other choice components */}
            </div>
        </Card>
    );
};

const TextQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
                <Input type="number" placeholder="Enter a number..." disabled />
            </div>
        </Card>
    );
};

const PhoneQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
     const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
        <Card className="w-full">
            <div className="p-4">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your title (optional)" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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

const MatrixQuestion = ({ question, onUpdate, onDelete, onImageUpload, styles }: { question: any; onUpdate?: (question: any) => void; onDelete?: (id: string) => void; onImageUpload?: (id: string) => void; styles: any; }) => {
    const questionStyle = { fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor };
    return (
        <Card className="w-full">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({ ...question, title: e.target.value })} className="text-lg font-semibold border-none focus:ring-0 p-0 h-auto" style={questionStyle} />
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
                     <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/3 min-w-[150px]"></TableHead>
                            {(question.columns || []).map((header: string, colIndex: number) => <TableHead key={`header-${colIndex}`} className="text-center text-xs min-w-[60px]">{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(question.rows || []).map((row: string, rowIndex: number) => (
                            <TableRow key={`row-${rowIndex}`}>
                                <TableHead>{row}</TableHead>
                                {(question.columns || []).map((col: string, colIndex: number) => (
                                    <TableCell key={`cell-${rowIndex}-${colIndex}`} className="text-center">
                                        <RadioGroup><RadioGroupItem value={col} disabled /></RadioGroup>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};

const ConjointQuestion = ({ question, onUpdate, onDelete }: { question: any, onUpdate?: any, onDelete?: any }) => {
    const { attributes = [] } = question;

    const handleAttributeNameChange = (attrIndex: number, newName: string) => {
        onUpdate(produce(question, (draft: any) => {
            draft.attributes[attrIndex].name = newName;
        }));
    };
    
    const handleLevelChange = (attrIndex: number, levelIndex: number, newLevel: string) => {
        onUpdate(produce(question, (draft: any) => {
            draft.attributes[attrIndex].levels[levelIndex] = newLevel;
        }));
    };

    const addAttribute = () => {
        onUpdate(produce(question, (draft: any) => {
            draft.attributes.push({ id: `attr-${Date.now()}`, name: `Attribute ${draft.attributes.length + 1}`, levels: ['Level 1', 'Level 2'] });
        }));
    };

    const addLevel = (attrIndex: number) => {
        onUpdate(produce(question, (draft: any) => {
            draft.attributes[attrIndex].levels.push(`Level ${draft.attributes[attrIndex].levels.length + 1}`);
        }));
    };

    const removeAttribute = (attrIndex: number) => {
        onUpdate(produce(question, (draft: any) => {
            draft.attributes.splice(attrIndex, 1);
        }));
    };

    const removeLevel = (attrIndex: number, levelIndex: number) => {
        onUpdate(produce(question, (draft: any) => {
            if (draft.attributes[attrIndex].levels.length > 2) {
                draft.attributes[attrIndex].levels.splice(levelIndex, 1);
            }
        }));
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Conjoint Analysis Setup</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>
                </div>
                 <CardDescription>Define the attributes and levels for the product profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-4">
                    {attributes.map((attr: ConjointAttribute, attrIndex: number) => (
                        <div key={attr.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <Input value={attr.name} onChange={(e) => handleAttributeNameChange(attrIndex, e.target.value)} className="text-md font-semibold"/>
                                <Button variant="ghost" size="icon" onClick={() => removeAttribute(attrIndex)}><Trash2 className="w-4 h-4 text-muted-foreground"/></Button>
                            </div>
                            <div className="space-y-2">
                                {attr.levels.map((level, levelIndex) => (
                                    <div key={levelIndex} className="flex items-center gap-2">
                                        <Input value={level} onChange={(e) => handleLevelChange(attrIndex, levelIndex, e.target.value)} />
                                        <Button variant="ghost" size="icon" onClick={() => removeLevel(attrIndex, levelIndex)} disabled={attr.levels.length <= 2}><X className="w-4 h-4 text-muted-foreground"/></Button>
                                    </div>
                                ))}
                                <Button variant="link" size="sm" onClick={() => addLevel(attrIndex)}><PlusCircle className="w-4 h-4 mr-2"/>Add Level</Button>
                            </div>
                        </div>
                    ))}
                </div>
                <Button onClick={addAttribute}><PlusCircle className="mr-2"/> Add Attribute</Button>
            </CardContent>
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
    styles: any;
    isPreview?: boolean;
}

export default function QuestionList({ title, setTitle, description, setDescription, questions, setQuestions, styles, isPreview = false }: QuestionListProps) {
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
    conjoint: ConjointQuestion,
  };


  return (
    <div className="space-y-6">
       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
      <Card>
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} readOnly={isPreview} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} readOnly={isPreview}/>
          </div>
        </CardContent>
      </Card>
      
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
                                    styles={styles}
                                />
                            ) : <p>Unknown question type: {q.type}</p>}
                        </SortableCard>
                    );
                })}
            </AnimatePresence>
        </SortableContext>
      </DndContext>
    </div>
  );
}

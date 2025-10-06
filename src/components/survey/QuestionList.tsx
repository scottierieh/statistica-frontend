
'use client';

import React from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { GripVertical, PlusCircle, Trash2, Info, ImageIcon, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { motion } from 'framer-motion';
import Image from 'next/image';
import { type Question } from '@/entities/Survey';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { produce } from 'immer';


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
const SingleSelectionQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
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
                {(question.options || []).map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 group">
                       <Checkbox id={`q${question.id}-o${index}`} onCheckedChange={(checked) => handleCheckChange(!!checked, option)} disabled={!onAnswerChange} />
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

const DropdownQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    // Similar to SingleSelectionQuestion, but using Select component
    return (
        <div className={cn("p-4", cardClassName)}>
          <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
          <Select value={answer} onValueChange={onAnswerChange}>
            <SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger>
            <SelectContent>
              {question.options?.map((option: string, index: number) => (
                <SelectItem key={index} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <Textarea placeholder="Your answer..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} disabled={!onAnswerChange}/>
    </div>
  );

const NumberQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
    <div className={cn("p-4", cardClassName)}>
      <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
      <Input type="number" placeholder="Enter a number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
    </div>
);

const PhoneQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
  <div className={cn("p-4", cardClassName)}>
    <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
    <Input type="tel" placeholder="Enter phone number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
  </div>
);

const EmailQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
  <div className={cn("p-4", cardClassName)}>
    <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
    <Input type="email" placeholder="Enter email address..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
  </div>
);

const RatingQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question; answer: number; onAnswerChange: (value: number) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    const scale = question.scale || ['1','2','3','4','5'];
    return (
        <div className={cn("p-4", cardClassName)}>
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
        <div className="flex items-center gap-2">
        {scale.map((_, index) => (
            <Star key={index} className={cn("w-8 h-8 text-yellow-400 cursor-pointer hover:text-yellow-500 transition-colors", (index + 1) <= answer && "fill-yellow-400")} onClick={() => onAnswerChange(index + 1)}/>
        ))}
        </div>
    </div>
  );
}

const NPSQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question; answer: number; onAnswerChange: (value: number) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => (
    <div className={cn("p-4", cardClassName)}>
      <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
       {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
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

const DescriptionBlock = ({ question, onDelete, onUpdate, cardClassName }: { question: Question, onDelete?: (id: string) => void, onUpdate?: (q:any) => void, cardClassName?: string; }) => (
    <div className={cn("p-4", cardClassName)}>
        <div className="flex justify-between items-start mb-4">
            <Textarea placeholder="Enter description text" value={question.content} onChange={(e) => onUpdate?.({...question, content: e.target.value})} className="text-base border-none focus:ring-0 p-0" />
            {onDelete && <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}><Trash2 className="w-5 h-5 text-destructive" /></Button>}
        </div>
    </div>
);

const BestWorstQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void, onDelete?: (id: string) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    return (
        <div className={cn("p-4", cardClassName)}>
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-2/3">Item</TableHead>
                        <TableHead className="text-center"><ThumbsUp className="mx-auto"/></TableHead>
                        <TableHead className="text-center"><ThumbsDown className="mx-auto"/></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(question.items || []).map((item: string, index: number) => (
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
        </div>
    );
};


const MatrixQuestion = ({ question, answer, onAnswerChange, onUpdate, onDelete, isPreview, onImageUpload, cardClassName }: { question: Question, answer: any, onAnswerChange?: (value: any) => void, onUpdate?: (q:any) => void, onDelete?: (id: string) => void, isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    const headers = question.scale && question.scale.length > 0 ? question.scale : (question.columns || []);

    return (
        <div className={cn("p-4", cardClassName)}>
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            <div className="overflow-x-auto">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/3 min-w-[150px]"></TableHead>
                            {(headers).map((header, colIndex) => (
                                <TableHead key={`header-${colIndex}`} className="text-center text-xs min-w-[60px]">
                                    {header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(question.rows || []).map((row: string, rowIndex: number) => (
                            <TableRow key={`row-${rowIndex}`}>
                                <TableHead>{row}</TableHead>
                                {(question.columns || []).map((col: string, colIndex: number) => (
                                    <TableCell key={`cell-${rowIndex}-${colIndex}`} className="text-center">
                                        {onAnswerChange &&
                                            <RadioGroup value={answer?.[row]} onValueChange={(value) => onAnswerChange(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                                <RadioGroupItem value={col} id={`q${question.id}-r${rowIndex}-c${colIndex}`}/>
                                            </RadioGroup>
                                        }
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};


interface QuestionListProps {
    title: string;
    setTitle: (title: string) => void;
    description: string;
    setDescription: (desc: string) => void;
    questions: Question[];
    setQuestions: (questions: Question[] | ((prev: Question[]) => Question[])) => void;
}

export default function QuestionList({ title, setTitle, description, setDescription, questions, setQuestions }: QuestionListProps) {
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
            handleUpdateQuestion({ ...questions.find(q => q.id === questionId)!, imageUrl: event.target?.result as string } as Question);
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
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
                                <Card className="w-full">
                                <QuestionComponent 
                                    question={q} 
                                    onUpdate={handleUpdateQuestion} 
                                    onDelete={() => handleDeleteQuestion(q.id)}
                                    onImageUpload={() => handleImageUploadClick(q.id)}
                                    cardClassName="bg-white"
                                />
                                </Card>
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

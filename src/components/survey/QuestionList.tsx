
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { GripVertical, PlusCircle, Trash2, Info, ImageIcon, Star, ThumbsDown, ThumbsUp, Sigma, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { type Question } from '@/entities/Survey';
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
                    <Label
                        key={index}
                        htmlFor={`q${question.id}-o${index}`}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                          theme === 'flat' && "bg-slate-100",
                          theme === 'modern' && "justify-between",
                          answer === option && theme === 'flat' && "border-primary ring-2 ring-primary bg-primary/10",
                          answer === option && theme === 'modern' && "bg-primary text-primary-foreground",
                        )}
                      >
                         {theme !== 'modern' && (
                            <RadioGroupItem
                              value={option}
                              id={`q${question.id}-o${index}`}
                              className={cn(theme === 'flat' && answer === option && "border-primary text-primary")}
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
                         {answer === option && theme === 'modern' && <CheckCircle2 className="w-6 h-6" />}
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.preventDefault(); deleteOption(index); }}>
                            <Trash2 className="w-4 h-4 text-destructive"/>
                        </Button>
                    </Label>
                ))}
            </RadioGroup>
            <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Option
            </Button>
        </div>
        </Card>
    );
};

// All other question components are defined here...

interface QuestionListProps {
    title: string;
    setTitle: (title: string) => void;
    description: string;
    setDescription: (desc: string) => void;
    questions: Question[];
    setQuestions: (questions: Question[] | ((prev: Question[]) => Question[])) => void;
    styles: any;
}

export default function QuestionList({ title, setTitle, description, setDescription, questions, setQuestions, styles }: QuestionListProps) {
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
    multiple: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    dropdown: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    text: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    number: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    phone: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    email: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    rating: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    nps: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    description: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    'best-worst': (props) => <SingleSelectionQuestion {...props} />, // Placeholder
    matrix: (props) => <SingleSelectionQuestion {...props} />, // Placeholder
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

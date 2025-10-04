
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
const DropdownQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { return <div>Dropdown (Not Implemented)</div>};
const NumberQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { return <div>Number (Not Implemented)</div>};
const PhoneQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { return <div>Phone (Not Implemented)</div>};
const EmailQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any, answer: string, onAnswerChange: (value: string) => void, onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { return <div>Email (Not Implemented)</div>};
const RatingQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer: number; onAnswerChange: (value: number) => void; onDelete?: (id: string) => void; onUpdate?: (q:any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { return <div>Rating (Not Implemented)</div>};
const NPSQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: number; onAnswerChange?: (value: number) => void; onDelete?: (id: string) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { return <div>NPS (Not Implemented)</div>};
const DescriptionBlock = ({ question, onDelete, onUpdate, isPreview, cardClassName }: { question: any; onDelete?: (id: string) => void; onUpdate?: (q:any) => void; isPreview?: boolean; cardClassName?: string; }) => { return <div>Description (Not Implemented)</div>};
const BestWorstQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: Question, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void, onDelete?: (id: string) => void; onUpdate?: (q: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => { return <div>Best/Worst (Not Implemented)</div>};
const MatrixQuestion = ({ question, answer, onAnswerChange, onUpdate, onDelete, isPreview, cardClassName }: { question: any, answer: any, onAnswerChange?: (value: any) => void, onUpdate?: (q:any) => void, onDelete?: (id: string) => void, isPreview?: boolean, cardClassName?: string }) => { return <div>Matrix (Not Implemented)</div>};


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
        const surveyData = { title, description, questions, status, created_date: new Date().toISOString() };
        
        if (surveyId) {
            const index = allSurveys.findIndex((s: any) => s.id === surveyId);
            if (index > -1) {
                allSurveys[index] = { ...allSurveys[index], ...surveyData };
            } else {
                 allSurveys.push({ ...surveyData, id: surveyId });
            }
        } else {
            allSurveys.push({ ...surveyData, id: Date.now().toString() });
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

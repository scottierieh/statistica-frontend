
'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { produce } from 'immer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GripVertical, Plus, Trash2, Info, ImageIcon, X, Copy, FileText, Save } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type { Survey, Question, ConjointAttribute, Criterion } from '@/entities/Survey';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

import SingleSelectionQuestion from './question-types/SingleSelectionQuestion';
import MultipleSelectionQuestion from './question-types/MultipleSelectionQuestion';
import DropdownQuestion from './question-types/DropdownQuestion';
import TextQuestion from './question-types/TextQuestion';
import NumberQuestion from './question-types/NumberQuestion';
import PhoneQuestion from './question-types/PhoneQuestion';
import EmailQuestion from './question-types/EmailQuestion';
import RatingQuestion from './question-types/RatingQuestion';
import NPSQuestion from './question-types/NPSQuestion';
import DescriptionBlock from './question-types/DescriptionBlock';
import BestWorstQuestion from './question-types/BestWorstQuestion';
import MatrixQuestion from './question-types/MatrixQuestion';
import SemanticDifferentialQuestion from './question-types/SemanticDifferentialQuestion';
import LikertQuestion from './question-types/LikertQuestion';
import ConjointQuestion from './question-types/ConjointQuestion';
import RatingConjointQuestion from './question-types/RatingConjointQuestion';
import RankingConjointQuestion from './question-types/RankingConjointQuestion';
import AHPQuestion from './question-types/AHPQuestion';
import ServqualQuestion from './question-types/ServqualQuestion';

interface SurveyDetailsCardProps {
    survey: Survey;
    setSurvey: React.Dispatch<React.SetStateAction<Survey>>;
    onImageUpload: (target: { type: 'startPage', field: 'logo' | 'image' }) => void;
}


const SurveyDetailsCard = ({ survey, setSurvey, onImageUpload }: SurveyDetailsCardProps) => {
    
    const handleSurveyChange = (updateFn: (draft: Survey) => void) => {
        setSurvey(produce(updateFn));
    };

    const defaultImage = PlaceHolderImages.find(img => img.id === 'survey-start-default');

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle>Start Page Configuration</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
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
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Logo Image</Label>
                                <Button variant="outline" className="w-full" onClick={() => onImageUpload({ type: 'startPage', field: 'logo' })}>
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Upload Logo
                                </Button>
                                {survey.startPage?.logo?.src && (
                                    <div className="relative mt-2">
                                        <Image src={survey.startPage.logo.src} alt={survey.startPage.logo.alt || 'Survey logo preview'} width={80} height={80} className="rounded-md border p-1" />
                                        <Button variant="destructive" size="icon" className="h-6 w-6 absolute -top-2 -right-2 rounded-full" onClick={() => handleSurveyChange(draft => { if (draft.startPage?.logo) draft.startPage.logo.src = undefined; })}><X className="w-3 h-3"/></Button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Content Image</Label>
                                <Button variant="outline" className="w-full" onClick={() => onImageUpload({ type: 'startPage', field: 'image' })}>
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Upload Image
                                </Button>
                                { (survey.startPage?.imageUrl || defaultImage?.imageUrl) && (
                                     <div className="relative mt-2">
                                        <Image src={survey.startPage?.imageUrl || defaultImage!.imageUrl} alt="Survey content image preview" width={150} height={75} className="rounded-md border p-1" />
                                         <Button variant="destructive" size="icon" className="h-6 w-6 absolute -top-2 -right-2 rounded-full" onClick={() => handleSurveyChange(draft => { if (draft.startPage) draft.startPage.imageUrl = undefined; })}><X className="w-3 h-3"/></Button>
                                    </div>
                                )}
                            </div>
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

const SortableQuestionCard = ({ id, children, questionNumber }: { 
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
        'ranking-conjoint': RankingConjointQuestion,
        ahp: AHPQuestion,
        servqual: ServqualQuestion,
    };

    return (
        <div className="space-y-6">
            <SurveyDetailsCard 
                survey={survey}
                setSurvey={setSurvey}
                onImageUpload={(target) => onImageUpload({ type: 'startPage', field: target.field as 'logo' | 'image' })}
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
                                    <SortableQuestionCard key={q.id} id={q.id} questionNumber={index + 1}>
                                        {QuestionComponent ? (
                                            <QuestionComponent 
                                                question={q} 
                                                onUpdate={handleUpdateQuestion} 
                                                onDelete={() => handleDeleteQuestion(q.id)}
                                                onImageUpload={(id: string) => onImageUpload({ type: 'question', id })}
                                                onDuplicate={() => onDuplicate(q.id)}
                                                styles={styles}
                                                questionNumber={index + 1}
                                            />
                                        ) : <p>Unknown question type: {q.type}</p>}
                                    </SortableQuestionCard>
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

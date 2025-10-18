'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { produce } from 'immer';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GripVertical, Plus, Save, PlusCircle } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import type { Survey, Question } from '@/entities/Survey';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

import SingleSelectionQuestion from '@/components/survey/question-types/SingleSelectionQuestion';
import MultipleSelectionQuestion from '@/components/survey/question-types/MultipleSelectionQuestion';
import DropdownQuestion from '@/components/survey/question-types/DropdownQuestion';
import TextQuestion from '@/components/survey/question-types/TextQuestion';
import NumberQuestion from '@/components/survey/question-types/NumberQuestion';
import PhoneQuestion from '@/components/survey/question-types/PhoneQuestion';
import EmailQuestion from '@/components/survey/question-types/EmailQuestion';
import RatingQuestion from '@/components/survey/question-types/RatingQuestion';
import NPSQuestion from '@/components/survey/question-types/NPSQuestion';
import DescriptionBlock from '@/components/survey/question-types/DescriptionBlock';
import BestWorstQuestion from '@/components/survey/question-types/BestWorstQuestion';
import MatrixQuestion from '@/components/survey/question-types/MatrixQuestion';
import SemanticDifferentialQuestion from '@/components/survey/question-types/SemanticDifferentialQuestion';
import LikertQuestion from '@/components/survey/question-types/LikertQuestion';
import ConjointQuestion from '@/components/survey/question-types/ConjointQuestion';
import RatingConjointQuestion from '@/components/survey/question-types/RatingConjointQuestion';
import RankingConjointQuestion from '@/components/survey/question-types/RankingConjointQuestion';
import AHPQuestion from '@/components/survey/question-types/AHPQuestion';
import ServqualQuestion from '@/components/survey/question-types/ServqualQuestion';

interface SurveyDetailsCardProps {
    survey: Survey;
    setSurvey: React.Dispatch<React.SetStateAction<Survey>>;
    onImageUpload: (target: { type: 'startPage'; field: 'logo' | 'image' }) => void;
}


const SurveyDetailsCard = ({ survey, setSurvey, onImageUpload }: SurveyDetailsCardProps) => {
    
    const handleSurveyChange = (updateFn: (draft: Survey) => void) => {
        setSurvey(produce(updateFn));
    };

    const defaultImage = PlaceHolderImages.find(img => img.id === 'survey-start-default');

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle>Survey Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label>Title *</label>
                    <Input 
                        value={survey.title} 
                        onChange={(e) => handleSurveyChange(draft => { draft.title = e.target.value })}
                    />
                </div>
                <div>
                    <label>Description</label>
                    <Textarea 
                        value={survey.description} 
                        onChange={(e) => handleSurveyChange(draft => { draft.description = e.target.value })}
                    />
                </div>
            </CardContent>
        </Card>
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
  onImageUpload: (target: { type: 'question'; id: string } | { type: 'startPage'; field: 'logo' | 'image' }) => void;
  onDuplicate: (questionId: string) => void;
  styles: any;
  saveSurvey?: (status: string) => void;
  isSaving?: boolean;
}


export default function QuestionList({ survey, setSurvey, onImageUpload, onDuplicate, styles, saveSurvey, isSaving }: QuestionListProps) {
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleUpdateQuestion = (updatedQuestion: Partial<Question>) => {
      setSurvey(prevSurvey => produce(prevSurvey, draft => {
        const questionIndex = draft.questions.findIndex(q => q.id === updatedQuestion.id);
        if (questionIndex !== -1) {
          draft.questions[questionIndex] = { ...draft.questions[questionIndex], ...updatedQuestion };
        }
      }));
    };
    
    const handleDeleteQuestion = (id: string) => {
        setSurvey(prev => ({...prev, questions: prev.questions.filter(q => q.id !== id)}));
    };

    const handleReorder = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSurvey(produce((draft: Survey) => {
                const oldIndex = draft.questions.findIndex(item => item.id === active.id);
                const newIndex = draft.questions.findIndex(item => item.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    const [removed] = draft.questions.splice(oldIndex, 1);
                    draft.questions.splice(newIndex, 0, removed);
                }
            }));
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
                                                survey={survey}
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

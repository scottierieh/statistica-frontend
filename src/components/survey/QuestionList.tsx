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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { GripVertical, Plus, Trash2, ArrowLeft, CircleDot, CheckSquare, CaseSensitive, Star, PlusCircle, Eye, Shuffle, FileText, Save, Info, ImageIcon, X, Phone, Mail, Share2, ThumbsUp, Grid3x3, ChevronDown, Sigma } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { SurveyEntity, type Question } from '@/entities/Survey';
import { cn } from '@/lib/utils';
import { SingleSelectionQuestion, MultipleSelectionQuestion, DropdownQuestion, TextQuestion, NumberQuestion, PhoneQuestion, EmailQuestion, RatingQuestion, NPSQuestion, DescriptionBlock, BestWorstQuestion, MatrixQuestion } from '@/components/survey/QuestionTypes';


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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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


interface QuestionListProps {
    title: string;
    setTitle: (title: string) => void;
    description: string;
    setDescription: (desc: string) => void;
    questions: Question[];
    setQuestions: (questions: Question[] | ((prev: Question[]) => Question[])) => void;
}

export default function QuestionList({ title, setTitle, description, setDescription, questions, setQuestions }: QuestionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      <QuestionTypePalette onSelectType={handleSelectQuestionType} />

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

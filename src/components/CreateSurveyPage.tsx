'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Monitor, Tablet, Smartphone, Lightbulb } from "lucide-react";
import { motion } from 'framer-motion';
import type { Survey, Question } from '@/entities/Survey';
import QuestionList from '@/components/survey/QuestionList';
import SurveyStylePanel from '@/components/survey/SurveyStylePanel';
import { QuestionTypePalette } from '@/components/survey/QuestionTypePalette';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsTrigger, TabsContent, TabsList } from '@/components/ui/tabs';
import SurveyView from '@/components/survey-view';
import { cn } from '@/lib/utils';
import { produce } from 'immer';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';
import { surveyService } from '@/services/survey-service';
import { useAuth } from '@/hooks/use-auth';

export default function CreateSurveyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { firestore } = initializeFirebase();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [survey, setSurvey] = useState<Survey>({
    id: surveyId || '',
    title: "My New Survey",
    description: "",
    questions: [],
    status: 'draft',
    created_date: '',
    showStartPage: true,
    startPage: {
        title: "Welcome to the Survey",
        description: "Your feedback is important to us. Please take a few moments to complete this survey.",
        buttonText: "Start Survey"
    }
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [styles, setStyles] = useState({
    theme: 'default',
    primaryColor: '#3C5462',
    secondaryColor: '#F3F4F6',
    iconColor: '#3C5462',
    font: 'Default',
    questionSpacing: 'Comfortable',
    questionTextSize: 22,
    answerTextSize: 16,
  });
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const loadSurvey = async () => {
      if (!surveyId) return;
      try {
        const loadedSurvey = await surveyService.getSurvey(firestore, surveyId);
        if (loadedSurvey) {
          setSurvey(prev => ({
              ...prev,
              ...loadedSurvey,
              showStartPage: loadedSurvey.showStartPage !== undefined ? loadedSurvey.showStartPage : true,
              startPage: loadedSurvey.startPage || prev.startPage
          }));
          if (loadedSurvey.styles) {
              setStyles(prevStyles => ({...prevStyles, ...loadedSurvey.styles}));
          }
        }
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load survey data.' });
      }
    };

    if (surveyId) {
        loadSurvey();
    }
  }, [surveyId, firestore, toast]);

  const saveSurveyAction = async (status: 'draft' | 'active' | 'closed' | 'scheduled' = "draft") => {
    if (!user) return;
    if (!survey.title.trim()) { alert("Please enter a survey title"); return; }
    if (survey.questions.length === 0) { alert("Please add at least one question"); return; }

    setIsSaving(true);
    try {
        const surveyData = {
          ...survey,
          status,
          styles,
          created_date: survey.created_date || new Date().toISOString()
        };

        await surveyService.saveSurvey(firestore, surveyData, user.email);
        toast({ title: 'Success', description: `Survey ${status === 'active' ? 'published' : 'saved'} successfully.` });
        router.push("/dashboard/survey2");
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save survey to cloud.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSelectQuestionType = (type: string) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type,
      title: "",
      required: true,
      options: ['single', 'multiple', 'dropdown', 'best-worst'].includes(type) ? ['Option 1', 'Option 2'] : [],
      items: type === 'best-worst' ? ['Item 1', 'Item 2', 'Item 3'] : [],
      rows: type === 'matrix' ? ['Row 1', 'Row 2'] : (type === 'semantic-differential') ? [{ left: 'Low Quality', right: 'High Quality' }] : [],
      columns: type === 'matrix' ? ['Col 1', 'Col 2', 'Col 3'] : [],
      scale: type === 'semantic-differential' 
          ? [{value: 1, label: 'Very Unlikely'}, {value: 2, label: ''}, {value: 3, label: ''}, {value: 4, label: 'Neutral'}, {value: 5, label: ''}, {value: 6, label: ''}, {value: 7, label: 'Very Likely'}] 
          : type === 'likert' ? [{value: 1, label: 'Strongly Disagree'}, {value: 2, label: 'Disagree'}, {value: 3, label: 'Neutral'}, {value: 4, label: 'Agree'}, {value: 5, label: 'Strongly Agree'}] 
          : type === 'rating' ? [{value: 1, label: '1'},{value: 2, label: '2'},{value: 3, label: '3'},{value: 4, label: '4'},{value: 5, label: '5'}] : [],      
      numScalePoints: ['semantic-differential', 'likert'].includes(type) ? 7 : undefined,
      content: type === 'description' ? 'This is a description block.' : '',
    };
    setSurvey(prev => ({...prev, questions: [...prev.questions, newQuestion]}));
  };

  const handleImageUpload = (target: { type: 'question'; id: string } | { type: 'startPage'; field: 'logo' | 'image' }) => {
    const input = fileInputRef.current;
    if (input) {
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            if (target.type === 'question') {
              setSurvey(produce(draft => {
                const question = draft.questions.find(q => q.id === target.id);
                if (question) {
                  question.imageUrl = imageUrl;
                }
              }));
            } else {
              setSurvey(produce(draft => {
                if (!draft.startPage) draft.startPage = { title: '', description: '', buttonText: '' };
                if (target.field === 'logo') {
                  if (!draft.startPage.logo) draft.startPage.logo = {};
                  draft.startPage.logo.src = imageUrl;
                } else {
                  draft.startPage.imageUrl = imageUrl;
                }
              }));
            }
          };
          reader.readAsDataURL(files[0]);
        }
      };
      input.click();
    }
  };
  
  const handleDuplicateQuestion = (questionId: string) => {
    const questionToDuplicate = survey.questions.find(q => q.id === questionId);
    if (questionToDuplicate) {
        const newQuestion = { ...questionToDuplicate, id: Date.now().toString() };
        const index = survey.questions.findIndex(q => q.id === questionId);
        setSurvey(prev => {
            const newQuestions = [...prev.questions];
            newQuestions.splice(index + 1, 0, newQuestion);
            return { ...prev, questions: newQuestions };
        });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
        <Sheet>
            <SheetTrigger asChild>
                <Button 
                    variant="default" 
                    className="fixed top-24 right-0 z-40 h-16 w-8 rounded-l-lg rounded-r-none shadow-lg p-0 flex items-center justify-center bg-primary hover:bg-primary/90"
                >
                    <span className="[writing-mode:vertical-rl] font-semibold text-xs tracking-wider">Tip</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[350px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2"><Lightbulb/> Survey Creation Tips</SheetTitle>
                    <SheetDescription>Best practices for creating effective surveys.</SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] pr-6">
                    <div className="py-4 space-y-4">
                      <p>Add context, choose appropriate scales, and keep questions concise for the best results.</p>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/survey2")} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">{surveyId ? "Edit Survey" : "Create New Survey"}</h1>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Eye className="w-5 h-5 mr-2" />Preview</Button>
                        </DialogTrigger>
                         <DialogContent className={cn("h-[95vh] flex flex-col p-0 w-full", "max-w-5xl")}>
                           <DialogHeader className="p-4 border-b">
                                <DialogTitle>Survey Preview</DialogTitle>
                                 <div className="flex items-center justify-center space-x-2 mt-2">
                                    <Button variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPreviewDevice('desktop')}><Monitor className="w-5 h-5"/></Button>
                                    <Button variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPreviewDevice('tablet')}><Tablet className="w-5 h-5"/></Button>
                                    <Button variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPreviewDevice('mobile')}><Smartphone className="w-5 h-5"/></Button>
                                </div>
                           </DialogHeader>
                           <div className="flex-1 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                                <SurveyView
                                    isPreview={true}
                                    previewDevice={previewDevice}
                                    survey={survey}
                                    previewStyles={styles}
                                />
                           </div>
                        </DialogContent>
                    </Dialog>
                </div>
                 <Tabs defaultValue="questions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="questions">Questions</TabsTrigger>
                        <TabsTrigger value="design">Design</TabsTrigger>
                    </TabsList>
                    <div className="mt-6 grid lg:grid-cols-[320px,1fr] gap-8 items-start">
                        <div>
                             <TabsContent value="questions" className="lg:sticky lg:top-24 space-y-6 m-0">
                                <QuestionTypePalette onSelectType={handleSelectQuestionType} />
                            </TabsContent>
                            <TabsContent value="design" className="lg:sticky lg:top-24 space-y-6 m-0">
                                <SurveyStylePanel survey={survey} setSurvey={setSurvey} styles={styles} setStyles={setStyles} />
                            </TabsContent>
                        </div>
                        <div className="min-w-0">
                            <QuestionList 
                                survey={survey}
                                setSurvey={setSurvey}
                                onImageUpload={handleImageUpload}
                                onDuplicate={handleDuplicateQuestion}
                                styles={styles}
                                saveSurvey={saveSurveyAction}
                                isSaving={isSaving}
                            />
                        </div>
                    </div>
                </Tabs>
            </motion.div>
        </div>
    </div>
  );
}
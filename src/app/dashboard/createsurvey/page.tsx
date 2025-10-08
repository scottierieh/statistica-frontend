
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { motion } from 'framer-motion';
import type { Question } from '@/entities/Survey';
import QuestionList from '@/components/survey/QuestionList';
import SurveyStylePanel from '@/components/survey/SurveyStylePanel';
import { QuestionTypePalette } from '@/components/survey/QuestionTypePalette';
import { SpecialAnalysisPalette } from '@/components/survey/SpecialAnalysisPalette';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { choiceBasedConjointTemplate, ratingBasedConjointTemplate, ipaTemplate, vanWestendorpTemplate, turfTemplate, gaborGrangerTemplate1, gaborGrangerTemplate2, ahpCriteriaOnlyTemplate, ahpWithAlternativesTemplate, csatTemplate, semanticDifferentialTemplate } from '@/lib/survey-templates';
import { Tabs, TabsTrigger, TabsContent, TabsList } from '@/components/ui/tabs';
import SurveyView from '@/components/survey-view';


export default function CreateSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");
  const template = searchParams.get("template");

  const [title, setTitle] = useState("My New Survey");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [styles, setStyles] = useState({
    theme: 'default',
    primaryColor: '#3C5462',
    secondaryColor: '#F3F4F6', // Changed to a slightly different gray
    font: 'Default',
    foregroundColor: 'Medium',
    questionSpacing: 'Comfortable',
    questionTextSize: 22,
    answerTextSize: 16
  });

  useEffect(() => {
    const loadSurvey = async () => {
      const allSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
      const survey = allSurveys.find((s:any) => s.id === surveyId);
      if (survey) {
        setTitle(survey.title);
        setDescription(survey.description || "");
        setQuestions(survey.questions || []);
        if (survey.styles) {
            setStyles(prev => ({...prev, ...survey.styles}));
        }
      }
    };
    
    const loadTemplate = (templateName: string) => {
        let selectedTemplate;
        switch (templateName) {
            case 'cbc':
                selectedTemplate = choiceBasedConjointTemplate;
                break;
            case 'rating-conjoint':
                selectedTemplate = ratingBasedConjointTemplate;
                break;
            case 'ipa':
                selectedTemplate = ipaTemplate;
                break;
            case 'van-westendorp':
                selectedTemplate = vanWestendorpTemplate;
                break;
            case 'turf':
                selectedTemplate = turfTemplate;
                break;
            case 'gabor-granger-1':
                selectedTemplate = gaborGrangerTemplate1;
                break;
            case 'gabor-granger-2':
                selectedTemplate = gaborGrangerTemplate2;
                break;
            case 'ahp-criteria':
                selectedTemplate = ahpCriteriaOnlyTemplate;
                break;
            case 'ahp-full':
                selectedTemplate = ahpWithAlternativesTemplate;
                break;
            case 'csat':
                selectedTemplate = csatTemplate;
                break;
            case 'semantic-differential':
                selectedTemplate = semanticDifferentialTemplate;
                break;
            default:
                return;
        }
        setTitle(selectedTemplate.title);
        setDescription(selectedTemplate.description);
        setQuestions(selectedTemplate.questions as Question[]);
    }

    if (surveyId) {
        loadSurvey();
    } else if (template) {
        loadTemplate(template);
    }
  }, [surveyId, template]);

  const saveSurvey = async (status = "draft") => {
    if (!title.trim()) { alert("Please enter a survey title"); return; }
    if (questions.length === 0) { alert("Please add at least one question"); return; }

    setIsSaving(true);
    try {
        const allSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
        
        let created_date = new Date().toISOString();

        if (surveyId) {
            const index = allSurveys.findIndex((s: any) => s.id === surveyId);
            if (index > -1) {
                created_date = allSurveys[index].created_date; // Preserve original creation date
                allSurveys[index] = { ...allSurveys[index], title, description, questions, status, styles, created_date };
            } else {
                 allSurveys.push({ title, description, questions, status, styles, id: surveyId, created_date });
            }
        } else {
            allSurveys.push({ title, description, questions, status, styles, id: Date.now().toString(), created_date });
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

  const handleSelectQuestionType = (type: string) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type,
      title: "",
      required: true,
      options: ['single', 'multiple', 'dropdown', 'best-worst'].includes(type) ? ['Option 1', 'Option 2'] : [],
      items: type === 'best-worst' ? ['Item 1', 'Item 2', 'Item 3'] : [],
      rows: type === 'matrix' ? ['Row 1', 'Row 2'] : type === 'semantic-differential' ? ['Low Quality vs High Quality'] : [],
      columns: type === 'matrix' ? ['Col 1', 'Col 2', 'Col 3'] : [],
      scale: ['semantic-differential'].includes(type) ? ['매우', '다소', '약간', '중립', '약간', '다소', '매우'] : type === 'matrix' ? ['Bad', 'Neutral', 'Good'] : type === 'rating' ? ['1','2','3','4','5'] : [],
      content: type === 'description' ? 'This is a description block.' : '',
      attributes: type === 'conjoint' || type === 'rating-conjoint' ? [{ id: `attr-1`, name: 'Brand', levels: ['Apple', 'Samsung'] }, { id: `attr-2`, name: 'Price', levels: ['$999', '$799'] }] : [],
      criteria: type === 'ahp' ? ['Quality', 'Price', 'Service'] : [],
      alternatives: type === 'ahp' ? ['Alternative A', 'Alternative B'] : [],
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
                        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                           <DialogHeader className="sr-only">
                            <DialogTitle>Survey Preview</DialogTitle>
                           </DialogHeader>
                           <SurveyView 
                                survey={{ id: 'preview', title, description, questions, status: 'active', created_date: '' }}
                                isPreview={true}
                                previewStyles={styles}
                             />
                        </DialogContent>
                    </Dialog>
                </div>
                 <Tabs defaultValue="questions">
                    <TabsList>
                        <TabsTrigger value="questions">Questions</TabsTrigger>
                        <TabsTrigger value="design">Design</TabsTrigger>
                    </TabsList>
                     <TabsContent value="questions" className="mt-6">
                        <div className="grid lg:grid-cols-[320px,1fr] gap-8 items-start">
                             <div className="lg:sticky lg:top-24 space-y-6">
                                <QuestionTypePalette onSelectType={handleSelectQuestionType} />
                                <SpecialAnalysisPalette />
                            </div>
                            <QuestionList 
                                title={title}
                                setTitle={setTitle}
                                description={description}
                                setDescription={setDescription}
                                questions={questions}
                                setQuestions={setQuestions}
                                styles={styles}
                                saveSurvey={saveSurvey}
                                isSaving={isSaving}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="design" className="mt-6">
                        <div className="grid lg:grid-cols-1 gap-8 items-start">
                           <div className="lg:sticky lg:top-24 space-y-6">
                                <SurveyStylePanel styles={styles} setStyles={setStyles} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    </div>
  );
}

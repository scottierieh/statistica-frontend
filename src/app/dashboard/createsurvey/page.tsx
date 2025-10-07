
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { motion } from 'framer-motion';
import type { Question } from '@/entities/Survey';
import QuestionList from '@/components/survey/QuestionList';
import SurveyStylePanel from '@/components/survey/SurveyStylePanel';
import { QuestionTypePalette } from '@/components/survey/QuestionTypePalette';
import SurveyView from '@/components/survey-view';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { choiceBasedConjointTemplate, ratingBasedConjointTemplate, ipaTemplate, vanWestendorpTemplate } from '@/lib/survey-templates';


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
    secondaryColor: '#E0E0E0',
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
      rows: type === 'matrix' ? ['Row 1', 'Row 2'] : [],
      columns: type === 'matrix' ? ['1', '2', '3'] : [],
      scale: type === 'matrix' ? ['Bad', 'Neutral', 'Good'] : type === 'rating' ? ['1','2','3','4','5'] : [],
      content: type === 'description' ? 'This is a description block.' : '',
      attributes: type === 'conjoint' ? [{ id: `attr-1`, name: 'Brand', levels: ['Apple', 'Samsung'] }, { id: `attr-2`, name: 'Price', levels: ['$999', '$799'] }] : [],
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
                        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                           <SurveyView 
                                survey={{ id: 'preview', title, description, questions, status: 'active', created_date: '' }}
                                isPreview={true}
                                previewStyles={styles}
                             />
                        </DialogContent>
                    </Dialog>
                     <Button onClick={() => saveSurvey("draft")} disabled={isSaving} className="max-w-fit"><Save className="w-5 h-5 mr-2" />Save Survey</Button>
                </div>

                <div className="grid lg:grid-cols-[320px,1fr,420px] gap-8 items-start">
                     <div className="lg:sticky lg:top-24">
                        <QuestionTypePalette onSelectType={handleSelectQuestionType} />
                    </div>
                    <QuestionList 
                        title={title}
                        setTitle={setTitle}
                        description={description}
                        setDescription={setDescription}
                        questions={questions}
                        setQuestions={setQuestions}
                        styles={styles}
                    />
                    <div className="lg:sticky lg:top-24 space-y-6">
                        <SurveyStylePanel styles={styles} setStyles={setStyles} />
                    </div>
                </div>
            </motion.div>
        </div>
    </div>
  );
}

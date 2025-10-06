'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from "lucide-react";
import { motion } from 'framer-motion';
import type { Question } from '@/entities/Survey';
import QuestionList from '@/components/survey/QuestionList';
import SurveyStylePanel from '@/components/survey/SurveyStylePanel';
import SurveyPreview from '@/components/survey/SurveyPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// --- Main CreateSurvey Component ---
export default function SurveyApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");
  
  const [title, setTitle] = useState("My New Survey");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [styles, setStyles] = useState({
    primaryColor: '#3C5462',
    secondaryColor: '#3C5462',
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
            setStyles(survey.styles);
        }
      }
    };
    if (surveyId) loadSurvey();
  }, [surveyId]);

  const saveSurvey = async (status = "draft") => {
    if (!title.trim()) { alert("Please enter a survey title"); return; }
    if (questions.length === 0) { alert("Please add at least one question"); return; }

    setIsSaving(true);
    try {
        const allSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
        const surveyData = { title, description, questions, status, styles, created_date: new Date().toISOString() };
        
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
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/survey2")} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">{surveyId ? "Edit Survey" : "Create New Survey"}</h1>
                    </div>
                     <Button onClick={() => saveSurvey("draft")} disabled={isSaving} className="flex-1 max-w-fit"><Save className="w-5 h-5 mr-2" />Save as Draft</Button>
                </div>
                 <Tabs defaultValue="questions">
                    <TabsList>
                        <TabsTrigger value="questions">Questions</TabsTrigger>
                        <TabsTrigger value="design">Design</TabsTrigger>
                    </TabsList>
                     <TabsContent value="questions">
                        <QuestionList 
                            title={title}
                            setTitle={setTitle}
                            description={description}
                            setDescription={setDescription}
                            questions={questions}
                            setQuestions={setQuestions}
                        />
                    </TabsContent>
                    <TabsContent value="design">
                        <div className="grid lg:grid-cols-[380px,1fr] gap-6">
                            <SurveyStylePanel styles={styles} setStyles={setStyles} />
                            <SurveyPreview styles={styles} />
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    </div>
  );
}

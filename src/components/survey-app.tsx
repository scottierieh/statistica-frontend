
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { motion } from 'framer-motion';
import type { Survey, Question } from '@/entities/Survey';
import QuestionList from '@/components/survey/QuestionList';
import SurveyStylePanel from '@/components/survey/SurveyStylePanel';
import { QuestionTypePalette } from './survey/QuestionTypePalette';
import { SpecialAnalysisPalette } from './survey/SpecialAnalysisPalette';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { choiceBasedConjointTemplate, ratingBasedConjointTemplate, ipaTemplate, vanWestendorpTemplate, turfTemplate, gaborGrangerTemplate1, gaborGrangerTemplate2, ahpCriteriaOnlyTemplate, ahpWithAlternativesTemplate, csatTemplate, semanticDifferentialTemplate, brandFunnelTemplate, servqualTemplate, servperfTemplate, rankingConjointTemplate } from '@/lib/survey-templates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SurveyView from './survey-view';


// --- Main CreateSurvey Component ---
export default function SurveyApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");
  const template = searchParams.get("template");
  
  const [survey, setSurvey] = useState<Survey>({
    id: surveyId || '',
    title: "My New Survey",
    description: "",
    questions: [],
    status: 'draft',
    created_date: '',
  });
  
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
      const foundSurvey = allSurveys.find((s:any) => s.id === surveyId);
      if (foundSurvey) {
        setSurvey(foundSurvey);
        if (foundSurvey.styles) {
            setStyles(prevStyles => ({...prevStyles, ...foundSurvey.styles}));
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
            case 'ranking-conjoint':
                selectedTemplate = rankingConjointTemplate;
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
            case 'brand-funnel':
                selectedTemplate = brandFunnelTemplate;
                break;
            case 'servqual':
                selectedTemplate = servqualTemplate;
                break;
            case 'servperf':
                selectedTemplate = servperfTemplate;
                break;
            default:
                return;
        }
        setSurvey(prev => ({
            ...prev,
            title: selectedTemplate.title,
            description: selectedTemplate.description,
            questions: selectedTemplate.questions as Question[],
        }));
    }

    if (surveyId) {
        loadSurvey();
    } else if (template) {
        loadTemplate(template);
    }
  }, [surveyId, template]);

  const saveSurveyAction = async (status = "draft") => {
    if (!survey.title.trim()) { alert("Please enter a survey title"); return; }
    if (survey.questions.length === 0) { alert("Please add at least one question"); return; }

    setIsSaving(true);
    try {
        const allSurveys = JSON.parse(localStorage.getItem('surveys') || '[]') as Survey[];
        const surveyData = { ...survey, status, styles };
        
        if (surveyId) {
            const index = allSurveys.findIndex((s) => s.id === surveyId);
            if (index > -1) {
                allSurveys[index] = { ...allSurveys[index], ...surveyData };
            } else {
                 allSurveys.push({ ...surveyData, id: surveyId, created_date: new Date().toISOString() });
            }
        } else {
            allSurveys.push({ ...surveyData, id: Date.now().toString(), created_date: new Date().toISOString() });
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
      rows: type === 'matrix' ? ['Row 1', 'Row 2'] : (type === 'semantic-differential') ? ['Low Quality vs High Quality'] : [],
      columns: type === 'matrix' ? ['Col 1', 'Col 2', 'Col 3'] : [],
      scale: type === 'semantic-differential' ? ['Very Unlikely', 'Unlikely', 'Slightly Unlikely', 'Neutral', 'Slightly Likely', 'Likely', 'Very Likely'] : type === 'likert' ? ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] : type === 'rating' ? ['1','2','3','4','5'] : [],      numScalePoints: ['semantic-differential', 'likert'].includes(type) ? 7 : undefined,
      scaleValues: type === 'likert' ? [1,2,3,4,5] : [],
      content: type === 'description' ? 'This is a description block.' : '',
      attributes: ['conjoint', 'rating-conjoint', 'ranking-conjoint'].includes(type) ? [{ id: `attr-1`, name: 'Brand', levels: ['Apple', 'Samsung'] }, { id: `attr-2`, name: 'Price', levels: ['$999', '$799'] }] : [],
      sets: ['conjoint', 'rating-conjoint', 'ranking-conjoint'].includes(type) ? 1 : undefined,
      cardsPerSet: type === 'conjoint' ? 1 : undefined,
      criteria: type === 'ahp' ? [{id:'c1', name:'Quality'}, {id:'c2', name:'Price'}, {id:'c3', name:'Service'}] : [],
      alternatives: type === 'ahp' ? ['Alternative A', 'Alternative B'] : [],
    };
    setSurvey(prev => ({...prev, questions: [...prev.questions, newQuestion]}));
  };
  
  const handleQuestionsUpdate = (updater: Question[] | ((prev: Question[]) => Question[])) => {
    if (typeof updater === 'function') {
      setSurvey(prev => ({ ...prev, questions: updater(prev.questions) }));
    } else {
      setSurvey(prev => ({ ...prev, questions: updater }));
    }
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
                           <DialogHeader>
                                <DialogTitle>Survey Preview</DialogTitle>
                           </DialogHeader>
                           <div className="flex-1 overflow-auto">
                                <SurveyView
                                    isPreview={true}
                                    survey={survey}
                                />
                           </div>
                        </DialogContent>
                    </Dialog>
                </div>
                 <Tabs defaultValue="questions" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="questions">Questions</TabsTrigger>
                        <TabsTrigger value="templates">Analysis Templates</TabsTrigger>
                        <TabsTrigger value="design">Design</TabsTrigger>
                    </TabsList>
                    <div className="mt-6 grid lg:grid-cols-[320px,1fr] gap-8 items-start">
                        <div>
                             <TabsContent value="questions" className="lg:sticky lg:top-24 space-y-6 m-0">
                                <QuestionTypePalette onSelectType={handleSelectQuestionType} />
                            </TabsContent>
                             <TabsContent value="templates" className="lg:sticky lg:top-24 space-y-6 m-0">
                                <SpecialAnalysisPalette />
                            </TabsContent>
                            <TabsContent value="design" className="lg:sticky lg:top-24 space-y-6 m-0">
                                <SurveyStylePanel styles={styles} setStyles={setStyles} />
                            </TabsContent>
                        </div>
                        <div className="min-w-0">
                            <QuestionList 
                                survey={survey}
                                setSurvey={setSurvey}
                                onUpdate={handleQuestionsUpdate}
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

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Question, Survey, SurveyResponse } from '@/entities/Survey';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';
import { surveyService } from '@/services/survey-service';

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
import SurveyStartPage from './survey/SurveyStartPage';


const questionComponents: { [key: string]: React.ComponentType<any> } = {
    single: SingleSelectionQuestion,
    multiple: MultipleSelectionQuestion,
    dropdown: DropdownQuestion,
    text: TextQuestion,
    rating: RatingQuestion,
    number: NumberQuestion,
    phone: PhoneQuestion,
    email: EmailQuestion,
    nps: NPSQuestion,
    description: DescriptionBlock,
    'best-worst': BestWorstQuestion,
    matrix: MatrixQuestion,
    'semantic-differential': SemanticDifferentialQuestion,
    likert: LikertQuestion,
};

const DeviceFrame = ({ device = 'desktop', children }: { device?: 'mobile' | 'tablet' | 'desktop'; children: React.ReactNode }) => {
  const frameStyles = {
    mobile: 'w-[320px] h-[640px] rounded-[32px] p-2 shadow-lg bg-gray-800',
    tablet: 'w-full max-w-[500px] aspect-[3/4] h-auto rounded-[24px] p-3 shadow-xl bg-gray-800',
    desktop: 'w-full h-full p-0 bg-white shadow-2xl rounded-lg',
  };
  const innerFrameStyles = {
      mobile: 'rounded-[24px]',
      tablet: 'rounded-[14px]',
      desktop: 'rounded-lg'
  }
  return (
    <div className={cn('relative mx-auto transition-all duration-300', frameStyles[device])}>
      {device !== 'desktop' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-800 rounded-b-lg z-20">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rounded-full"></div>
        </div>
      )}
      {device === 'mobile' && (
        <>
          <div className="absolute left-0 top-16 h-6 w-1 bg-gray-700 rounded-r-sm"></div>
          <div className="absolute left-0 top-24 h-12 w-1 bg-gray-700 rounded-r-sm"></div>
          <div className="absolute right-0 top-24 h-12 w-1 bg-gray-700 rounded-l-sm"></div>
        </>
      )}
       <div className={cn("h-full w-full bg-white overflow-hidden", innerFrameStyles[device])}>
        {children}
      </div>
    </div>
  );
};

const shuffleArray = (array: any[]) => {
  if (!array) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface SurveyViewProps {
  survey?: any;
  previewStyles?: any;
  isPreview?: boolean;
  previewDevice?: 'mobile' | 'tablet' | 'desktop';
}


export default function SurveyView({ survey: surveyProp, previewStyles, isPreview, previewDevice }: SurveyViewProps) {
    const params = useParams();
    const { toast } = useToast();
    const { firestore } = initializeFirebase();
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<any>(null);
    const [answers, setAnswers] = useState<any>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSurveyActive, setIsSurveyActive] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Effect for loading the survey data
    useEffect(() => {
        const loadSurveyData = async () => {
            if (isPreview && surveyProp) {
                setSurvey({ ...surveyProp, styles: previewStyles });
                setLoading(false);
            } else if (surveyId) {
                setLoading(true);
                try {
                    const loadedSurvey = await surveyService.getSurvey(firestore, surveyId);
                    if (loadedSurvey) {
                        setSurvey(loadedSurvey);
                    } else {
                        setError("Survey not found.");
                    }
                } catch (error) {
                    console.error("Failed to load survey from Firestore", error);
                    setError("Failed to load survey.");
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        loadSurveyData();
    }, [surveyId, surveyProp, previewStyles, isPreview, firestore]);

    // Effect for initializing survey state once data is loaded
    useEffect(() => {
        if (!survey) return;

        const randomizedQuestions = survey.questions.map((q: Question) => {
            if (q.randomizeOptions && q.options) return { ...q, options: shuffleArray(q.options) };
            if (q.randomizeOptions && q.items) return { ...q, items: shuffleArray(q.items) };
            return q;
        });
        setSurvey((s: Survey) => ({ ...s, questions: randomizedQuestions }));
        
        const now = new Date();
        const startDate = survey.startDate ? new Date(survey.startDate) : null;
        const endDate = survey.endDate ? new Date(survey.endDate) : null;
        let isActive = survey.status !== 'closed' && (!startDate || now >= startDate) && (!endDate || now <= endDate);
        setIsSurveyActive(isActive);

        const initialIndex = survey.showStartPage ? -1 : 0;
        setCurrentQuestionIndex(initialIndex);
        if (initialIndex === 0) {
            setStartTime(Date.now());
        }
    }, [survey?.id, isPreview]);
    
    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers((prev: any) => ({ ...prev, [questionId]: value }));
    };

    const handleNext = () => {
        if (survey && currentQuestionIndex < survey.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            if (currentQuestionIndex === -1) setStartTime(Date.now());
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > (survey?.showStartPage ? 0 : 0)) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (isPreview) {
            setIsCompleted(true);
            return;
        }

        if (!surveyId) {
            toast({ title: "Submit Failed", description: "This survey has no ID.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const endTime = Date.now();
        const completionTime = startTime ? (endTime - startTime) / 1000 : 0;

        const qualityFlags: ('fast_completion' | 'straight_lining')[] = [];

        const estimatedReadingTime = survey.questions.reduce((acc: number, q: Question) => {
            const textLength = (q.title?.length || 0) + (q.description?.length || 0);
            return acc + (textLength / 1500) * 60;
        }, 0);
        
        if (completionTime < (estimatedReadingTime * 0.3)) {
            qualityFlags.push('fast_completion');
        }

        survey.questions.forEach((q: Question) => {
            if (['matrix', 'likert'].includes(q.type) && q.rows && q.rows.length > 3) {
                const matrixAnswers = answers[q.id];
                if (matrixAnswers && typeof matrixAnswers === 'object') {
                    const values = Object.values(matrixAnswers);
                    if (values.length > 3 && new Set(values).size === 1) {
                        qualityFlags.push('straight_lining');
                    }
                }
            }
        });

        try {
            await surveyService.submitResponse(firestore, surveyId, {
                answers,
                completionTime,
                qualityFlags,
                submittedAt: new Date().toISOString()
            });
            setIsCompleted(true);
        } catch (e) {
            toast({ title: "Submit Failed", description: "Could not save your response.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const canProceed = () => {
        if (currentQuestionIndex === -1) return true;
        if (!survey) return false;
        const question = survey.questions[currentQuestionIndex];
        if (!question) return true;
        if (question.type === "description") return true;
        if (question.required) {
          const answer = answers[question.id];
          if (answer === undefined || answer === null) return false;
          if (Array.isArray(answer)) return answer.length > 0;
          if (typeof answer === "string") return answer.trim().length > 0;
          if (typeof answer === "object" && answer !== null) {
            if (question.type === "best-worst") {
              return answer.best && answer.worst;
            }
          }
          return true;
        }
        return true;
    };

    const currentQuestion = survey?.questions[currentQuestionIndex];
    const QuestionComponent = currentQuestion ? questionComponents[currentQuestion.type] : null;

    if (loading) return <div className="min-h-screen flex items-center justify-center text-sm">Loading survey...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-sm">{error}</div>;
    
    const surveyStyles = survey?.styles || {};

    if (!isSurveyActive && !isPreview) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
                <Card className="w-full max-w-md text-center p-6">
                    <CardHeader>
                        <CardTitle className="text-xl">Survey Closed</CardTitle>
                        <CardDescription className="text-sm">This survey is not currently accepting responses.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                        className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/30">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
                    <p className="text-slate-600 text-sm">Your response has been recorded.</p>
                </motion.div>
            </div>
        );
    }
    
    const backgroundStyle = {
      background: surveyStyles?.secondaryColor,
      '--primary-color': surveyStyles?.primaryColor,
      '--ring-color': surveyStyles?.ringColor || surveyStyles?.primaryColor,
    } as React.CSSProperties;

    const surveyContent = (
        <div style={backgroundStyle} className="h-full overflow-y-auto">
            <Card className="w-full rounded-none border-0 shadow-none flex flex-col bg-transparent flex-1 h-full">
                <CardHeader className="text-center p-4">
                    {currentQuestionIndex !== -1 && 
                        <Progress 
                            value={((currentQuestionIndex + 1) / (survey.questions.length)) * 100} 
                            className="mt-3 h-2"
                        />
                    }
                </CardHeader>
                <CardContent className={cn("flex-1 overflow-y-auto min-h-[300px] p-4", currentQuestionIndex !== -1 && "pb-20")}>
                    <AnimatePresence mode="wait">
                        {currentQuestionIndex === -1 && survey.showStartPage ? (
                            <motion.div key="intro" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                                <SurveyStartPage survey={survey} onStart={() => { setStartTime(Date.now()); setCurrentQuestionIndex(0); }} />
                            </motion.div>
                        ) : (
                            <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                                {QuestionComponent && survey && currentQuestion && (
                                    <div key={currentQuestion.id}>
                                        <QuestionComponent
                                            question={currentQuestion}
                                            answer={answers[currentQuestion.id]}
                                            onAnswerChange={(value: any) => handleAnswerChange(currentQuestion.id, value)}
                                            styles={survey.styles || {}}
                                            isPreview={true}
                                            onNextTask={handleNext}
                                            isLastQuestion={currentQuestionIndex === survey.questions.length - 1}
                                            submitSurvey={handleSubmit}
                                            survey={survey}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
                {currentQuestionIndex !== -1 && (
                    <CardFooter className="flex justify-between p-4 bg-background/50 border-t sticky bottom-0">
                        {currentQuestionIndex > 0 ? (
                            <Button onClick={handlePrev} variant="outline" size="sm" style={{ color: surveyStyles.primaryColor }}>
                                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                            </Button>
                        ) : <div />}

                        {currentQuestionIndex < survey.questions.length - 1 ? (
                            <Button onClick={handleNext} size="sm" style={{ backgroundColor: surveyStyles.primaryColor }}>
                                Next <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} size="sm" style={{ backgroundColor: surveyStyles.primaryColor }}>
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>
        </div>
    );

    if (isPreview && survey) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <DeviceFrame device={previewDevice}>{surveyContent}</DeviceFrame>
            </div>
        );
    }
    
    return surveyContent;
}
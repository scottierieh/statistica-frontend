
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Star, ArrowLeft, ArrowRight, ThumbsUp, ThumbsDown, FileText, Clock, BarChart } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Question, ConjointAttribute, Survey, SurveyResponse, Criterion } from '@/entities/Survey';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    conjoint: ConjointQuestion,
    'rating-conjoint': RatingConjointQuestion,
    'ranking-conjoint': RankingConjointQuestion,
    'semantic-differential': SemanticDifferentialQuestion,
    likert: LikertQuestion,
    ahp: AHPQuestion,
    servqual: ServqualQuestion,
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
  const style = frameStyles[device];
  const innerStyle = innerFrameStyles[device];
  
  return (
    <div className={cn('relative mx-auto transition-all duration-300', style)}>
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
       <div className={cn("h-full w-full bg-white overflow-y-auto", innerStyle)}>
        {children}
      </div>
    </div>
  );
};

const StartPage = ({ survey, onStart }: { survey: Survey, onStart: () => void }) => {
    const { startPage = {}, styles = {} } = survey;
    const { title, description, buttonText, logo, imageUrl } = startPage;

    return (
        <div className="flex flex-col h-full text-center p-6 bg-background rounded-lg">
             {logo?.src && (
                <div className="mb-4">
                    <img src={logo.src} alt={logo.alt || 'Survey Logo'} className="max-h-20 mx-auto" />
                </div>
            )}
            <div className="flex-1 flex flex-col justify-center items-center">
                <h2 className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                    {title || survey.title}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm" style={{ color: styles.primaryColor, opacity: 0.8 }}>
                    {description || survey.description}
                </p>
                {imageUrl && (
                     <div className="mt-6 w-full">
                        <img src={imageUrl} alt="Survey introduction" className="rounded-lg shadow-md max-w-full h-auto mx-auto" />
                    </div>
                )}
            </div>
            <Button 
                onClick={onStart} 
                className="w-full mt-8" 
                style={{ backgroundColor: styles.primaryColor }}
            >
                {buttonText || 'Start Survey'}
            </Button>
        </div>
    );
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
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<any>(surveyProp);
    const [answers, setAnswers] = useState<any>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState("");
    const [respondentName, setRespondentName] = useState("");
    const [respondentEmail, setRespondentEmail] = useState("");
    const [loading, setLoading] = useState(!surveyProp);
    const [isSurveyActive, setIsSurveyActive] = useState(false);

    useEffect(() => {
        if (isPreview && surveyProp) {
            setSurvey({...surveyProp, styles: previewStyles});
            setIsSurveyActive(true);
            setLoading(false);
            if (!surveyProp.showStartPage) {
                setCurrentQuestionIndex(0);
            } else {
                setCurrentQuestionIndex(-1);
            }
        } else if (surveyId) {
            setLoading(true);
            try {
                const surveys = JSON.parse(localStorage.getItem('surveys') || '[]');
                const loadedSurvey = surveys.find((s: any) => s.id === surveyId);
                
                if (loadedSurvey) {
                    setSurvey(loadedSurvey);
                    const now = new Date();
                    const startDate = loadedSurvey.startDate ? new Date(loadedSurvey.startDate) : null;
                    const endDate = loadedSurvey.endDate ? new Date(loadedSurvey.endDate) : null;
                    
                    if (loadedSurvey.status === 'closed') {
                        setIsSurveyActive(false);
                    } else if (startDate && now < startDate) {
                        setIsSurveyActive(false);
                    } else if (endDate && now > endDate) {
                        setIsSurveyActive(false);
                    } else {
                        setIsSurveyActive(true);
                    }
                    if (!loadedSurvey.showStartPage) {
                        setCurrentQuestionIndex(0);
                    }
                } else {
                    setError("Survey not found.");
                }
            } catch (error) {
                console.error("Failed to load survey from local storage", error);
                setError("Failed to load survey.");
            } finally {
                setLoading(false);
            }
        }
    }, [surveyId, surveyProp, previewStyles, isPreview]);
    
    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers((prev: any) => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleNext = () => {
        if (survey && currentQuestionIndex < survey.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > (survey?.showStartPage ? 0 : 0)) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (!surveyId && !isPreview) {
             toast({title: "Submit Failed", description: "This survey has no ID.", variant: "destructive"});
             return;
        }
        if (isPreview) {
             setIsCompleted(true);
            return;
        }
        
        const newResponse = {
            id: `resp-${Date.now()}`,
            survey_id: surveyId,
            submittedAt: new Date().toISOString(),
            answers,
        };
        const existingResponses = JSON.parse(localStorage.getItem(`${surveyId}_responses`) || '[]');
        localStorage.setItem(`${surveyId}_responses`, JSON.stringify([...existingResponses, newResponse]));
        setIsCompleted(true);
    };
    
    const canProceed = () => {
        if (currentQuestionIndex === -1) {
          return true;
        }
        if(!survey) return false;
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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-sm">Loading survey...</div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center text-sm">{error}</div>;
    }
    
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
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/30"
                    >
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Thank You!
                    </h2>
                    <p className="text-slate-600 text-sm">
                        Your response has been recorded.
                    </p>
                </motion.div>
            </div>
        );
    }
    
    const surveyContent = (
             <div className="h-full flex flex-col" style={{backgroundColor: surveyStyles?.secondaryColor}}>
                 <Card className="w-full rounded-none border-0 shadow-none flex-1 flex flex-col bg-transparent">
                    <CardHeader className="text-center p-4">
                        <CardTitle className="font-headline text-xl">{survey.title}</CardTitle>
                         {currentQuestionIndex !== -1 && <Progress value={((currentQuestionIndex + 1) / (survey.questions.length)) * 100} className="mt-3 h-2" />}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto min-h-[300px] p-4">
                         <AnimatePresence mode="wait">
                            {currentQuestionIndex === -1 && survey.showStartPage ? (
                                 <motion.div key="intro" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                                    <StartPage survey={survey} onStart={() => setCurrentQuestionIndex(0)} />
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
                                            />
                                        </div>
                                    )}
                                </motion.div>
                             )}
                         </AnimatePresence>
                    </CardContent>
                    <CardFooter className="flex justify-between p-4">
                       {currentQuestionIndex > (survey.showStartPage ? 0 : 0) ? (
                            <Button onClick={handlePrev} variant="outline" size="sm" className="transition-transform active:scale-95">
                                <ArrowLeft className="mr-1 h-4 w-4" /> Previous
                            </Button>
                        ) : <div />}

                        {currentQuestionIndex < survey.questions.length - 1 && currentQuestionIndex !== -1 && !['conjoint', 'rating-conjoint', 'ranking-conjoint'].includes(currentQuestion?.type || '') ? (
                            <Button onClick={handleNext} size="sm" className="transition-transform active:scale-95">
                                Next <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        ) : currentQuestionIndex !== -1 && !['conjoint', 'rating-conjoint', 'ranking-conjoint'].includes(currentQuestion?.type || '') && (
                            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} size="sm" className="transition-transform active:scale-95">
                                 {isSubmitting ? "Submitting..." : "Submit"}
                            </Button>
                        )}
                    </CardFooter>
                 </Card>
             </div>
        );

    // Preview mode rendering
    if (isPreview && survey) {
        return (
             <div className="w-full h-full flex items-center justify-center">
                 <DeviceFrame device={previewDevice}>
                    {surveyContent}
                </DeviceFrame>
            </div>
        );
    }
    
    // Default/Live survey rendering
    return surveyContent;
}


'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Question, ConjointAttribute, Survey, SurveyResponse } from '@/entities/Survey';
import { useToast } from '@/hooks/use-toast';

const SingleSelectionQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question; answer?: string; onAnswerChange: (value: string) => void; styles: any; }) => {
    const theme = styles.theme || 'default';
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
            <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-3">
                {(question.options || []).map((option: string, index: number) => (
                     <Label
                        key={index}
                        htmlFor={`q${question.id}-o${index}`}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                          theme === 'flat' && "bg-slate-100",
                          theme === 'modern' && "justify-between",
                          answer === option && theme === 'flat' && "border-primary ring-2 ring-primary bg-primary/10",
                           answer === option && theme === 'modern' && "bg-primary text-primary-foreground",
                        )}
                      >
                         {theme !== 'modern' && (
                            <RadioGroupItem
                              value={option}
                              id={`q${question.id}-o${index}`}
                              className={cn(theme === 'flat' && answer === option && "border-primary text-primary")}
                            />
                        )}
                        <span className="flex-1">{option}</span>
                         {answer === option && theme === 'modern' && <CheckCircle2 className="w-6 h-6" />}
                    </Label>
                ))}
            </RadioGroup>
        </div>
    )
};

const MultipleSelectionQuestion = ({ question, answer = [], onAnswerChange }: { question: Question; answer?: string[]; onAnswerChange: (newAnswer: string[]) => void; }) => {
   const handleCheckChange = (checked: boolean, opt: string) => {
       const currentAnswers = answer || [];
       const newAnswers = checked
           ? [...currentAnswers, opt]
           : currentAnswers.filter((a: string) => a !== opt);
       onAnswerChange(newAnswers);
   }
   return (
       <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
           {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
           <div className="space-y-3">
                {(question.options || []).map((option: string, index: number) => (
                   <Label key={index} htmlFor={`q${question.id}-o${index}`} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors cursor-pointer">
                       <Checkbox
                           id={`q${question.id}-o${index}`}
                           checked={answer?.includes(option)}
                           onCheckedChange={(checked) => handleCheckChange(!!checked, option)}
                       />
                       <span className="flex-1">{option}</span>
                   </Label>
               ))}
           </div>
       </div>
   );
};

const DropdownQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer?: string; onAnswerChange: (value: string) => void; }) => {
    return (
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
          {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
          <Select value={answer} onValueChange={onAnswerChange}>
            <SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger>
            <SelectContent>
              {(question.options || []).map((option: string, index: number) => (
                <SelectItem key={index} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
};

const TextQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
    <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
        <Textarea placeholder="Your answer..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)}/>
    </div>
);

const NumberQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: any) => void }) => (
    <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
        {question.description && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{question.description}</p>}
        <Input 
            type="number" 
            placeholder="Enter a number..." 
            value={answer || ''} 
            onChange={e => {
                const value = e.target.value;
                const parsed = parseFloat(value);
                onAnswerChange(value === '' ? null : (isNaN(parsed) ? value : parsed));
            }}
        />
    </div>
);


const PhoneQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
    <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
        <Input type="tel" placeholder="Enter phone number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
    </div>
);

const EmailQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
    <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
        <Input type="email" placeholder="Enter email address..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
    </div>
);

const RatingQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: number; onAnswerChange: (value: number) => void; }) => {
    const scale = question.scale || ['1','2','3','4','5'];
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
            <div className="flex items-center gap-2">
                {scale.map((_, index) => (
                    <Star key={index} className={cn("w-8 h-8 text-yellow-400 cursor-pointer hover:text-yellow-500 transition-colors", (index + 1) <= answer && "fill-yellow-400")} onClick={() => onAnswerChange(index + 1)}/>
                ))}
            </div>
        </div>
    );
}

const NPSQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: number; onAnswerChange: (value: number) => void; }) => (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
       {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {[...Array(11)].map((_, i) => (
            <Button key={i} variant={answer === i ? 'default' : 'outline'} size="icon" className="h-10 w-8 text-xs transition-transform hover:scale-110 active:scale-95" onClick={() => onAnswerChange?.(i)}>
                {i}
            </Button>
        ))}
      </div>
       <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
      </div>
    </div>
);

const DescriptionBlock = ({ question }: { question: Question }) => (
    <div className="p-4 prose dark:prose-invert">
      <h3 className="text-lg font-semibold">{question.title}</h3>
      <p>{question.content}</p>
    </div>
);

const BestWorstQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-2/3">Item</TableHead>
                        <TableHead className="text-center"><ThumbsUp className="mx-auto"/></TableHead>
                        <TableHead className="text-center"><ThumbsDown className="mx-auto"/></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(question.items || []).map((item: string, index: number) => (
                        <TableRow key={index}>
                            <TableCell>{item}</TableCell>
                            <TableCell className="text-center">
                                <RadioGroup value={answer?.best} onValueChange={(value) => onAnswerChange({ ...answer, best: value })}>
                                    <RadioGroupItem value={item} />
                                </RadioGroup>
                            </TableCell>
                            <TableCell className="text-center">
                                <RadioGroup value={answer?.worst} onValueChange={(value) => onAnswerChange({ ...answer, worst: value })}>
                                    <RadioGroupItem value={item} />
                                </RadioGroup>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

const MatrixQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: any, onAnswerChange: (value: any) => void }) => {
    const headers = question.scale && question.scale.length > 0 ? question.scale : (question.columns || []);

    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
            <div className="overflow-x-auto">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/3 min-w-[150px]"></TableHead>
                            {(headers).map((header, colIndex) => (
                                <TableHead key={`header-${colIndex}`} className="text-center text-xs min-w-[60px]">
                                    {header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(question.rows || []).map((row: string, rowIndex: number) => (
                            <TableRow key={`row-${rowIndex}`}>
                                <TableHead>{row}</TableHead>
                                {(question.columns || []).map((col: string, colIndex: number) => (
                                    <TableCell key={`cell-${rowIndex}-${colIndex}`} className="text-center">
                                        <RadioGroup value={answer?.[row]} onValueChange={(value) => onAnswerChange(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                            <RadioGroupItem value={col} id={`q${question.id}-r${rowIndex}-c${colIndex}`}/>
                                        </RadioGroup>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

const ConjointQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: string; onAnswerChange: (value: string) => void; }) => {
    const { attributes = [], profiles = [] } = question;
    
    if (profiles.length === 0) return <div className="p-4">Conjoint profiles not generated.</div>;
    
    // Assuming profiles are structured in sets
    const profileSet = profiles[0] || [];

    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.description && <p className="text-sm text-muted-foreground mb-4">{question.description}</p>}
             <div className="flex gap-4 overflow-x-auto pb-4">
                 <div className="flex-shrink-0 w-32 pr-2">
                    {(attributes || []).map(attr => (
                        <div key={attr.id} className="h-16 flex items-center font-semibold text-sm text-muted-foreground">{attr.name}:</div>
                    ))}
                 </div>
                {profileSet.map((profile: any, index: number) => (
                    <Card key={profile.id} className={cn("w-48 flex-shrink-0 text-center transition-all", answer === profile.id && "ring-2 ring-primary")}>
                        <CardContent className="p-4 space-y-2">
                             {(attributes || []).map(attr => (
                                <div key={attr.id} className="h-16 flex items-center justify-center text-sm">{profile[attr.name]}</div>
                            ))}
                        </CardContent>
                        <CardFooter className="p-2">
                            <Button className="w-full" variant={answer === profile.id ? 'default' : 'outline'} onClick={() => onAnswerChange(profile.id)}>
                                {answer === profile.id ? 'Selected' : 'Select'}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
             </div>
        </div>
    );
};

const RatingConjointQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: { [profileId: string]: number }, onAnswerChange: (value: any) => void; }) => {
    const { attributes = [], profiles = [] } = question;

    const handleRatingChange = (profileId: string, value: string) => {
        const rating = parseInt(value, 10);
        if (rating >= 1 && rating <= 10) {
             onAnswerChange(produce(answer || {}, (draft: any) => { draft[profileId] = rating; }));
        }
    };

    if (profiles.length === 0) return <div className="p-4">Conjoint profiles not generated.</div>;

    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.description && <p className="text-sm text-muted-foreground mb-4">{question.description}</p>}
             <div className="flex gap-4 overflow-x-auto pb-4">
                 <div className="flex-shrink-0 w-32 pr-2">
                    {(attributes || []).map(attr => (
                        <div key={attr.id} className="h-16 flex items-center font-semibold text-sm text-muted-foreground">{attr.name}:</div>
                    ))}
                     <div className="h-12 flex items-center font-semibold text-sm text-muted-foreground">Rating (1-10):</div>
                 </div>
                {profiles.map((profile: any) => (
                    <Card key={profile.id} className="w-48 flex-shrink-0 text-center">
                        <CardContent className="p-4 space-y-2">
                             {(attributes || []).map(attr => (
                                <div key={attr.id} className="h-16 flex items-center justify-center text-sm">{profile[attr.name]}</div>
                            ))}
                        </CardContent>
                        <CardFooter className="p-2">
                            <Input
                                type="number"
                                min="1"
                                max="10"
                                placeholder="1-10"
                                value={answer?.[profile.id] || ''}
                                onChange={(e) => handleRatingChange(profile.id, e.target.value)}
                            />
                        </CardFooter>
                    </Card>
                ))}
             </div>
        </div>
    );
};



interface SurveyViewProps {
  survey?: any; // For preview mode
  isPreview?: boolean;
  previewStyles?: any;
}


export default function SurveyView({ survey: surveyProp, isPreview = false, previewStyles }: SurveyViewProps) {
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
    const [loading, setLoading] = useState(!isPreview);
    const [isSurveyActive, setIsSurveyActive] = useState(false);

    useEffect(() => {
        if (isPreview) {
            setSurvey({...surveyProp, styles: previewStyles});
            setIsSurveyActive(true);
            setLoading(false);
        } else if (surveyId) {
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
                        setIsSurveyActive(false); // Scheduled for later
                    } else if (endDate && now > endDate) {
                        setIsSurveyActive(false); // Ended
                    } else {
                        setIsSurveyActive(true); // Active now
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
    }, [surveyId, isPreview, surveyProp, previewStyles]);
    
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
        if (currentQuestionIndex >= 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (isPreview || !surveyId) {
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
          return respondentName.trim() && respondentEmail.trim();
        }
        if(!survey) return false;
        const question = survey.questions[currentQuestionIndex];
        if (!question) return true; // Should not happen, but allow proceeding
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
    };
    
    const currentQuestion = survey?.questions[currentQuestionIndex];
    const QuestionComponent = currentQuestion ? questionComponents[currentQuestion.type] : null;

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading survey...</div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center">{error}</div>;
    }
    
    const surveyStyles = isPreview ? previewStyles : survey?.styles;

    if (isPreview && survey) {
        return (
             <div className="w-full h-full overflow-y-auto bg-card" style={{ backgroundColor: surveyStyles?.secondaryColor, color: surveyStyles?.primaryColor }}>
                <CardHeader className="text-center p-6 md:p-8">
                    <CardTitle className="font-headline text-xl" style={{color: surveyStyles?.primaryColor}}>{survey.title}</CardTitle>
                    {survey.description && <CardDescription style={{color: surveyStyles?.primaryColor}}>{survey.description}</CardDescription>}
                </CardHeader>
                <CardContent className="h-full">
                    {survey.questions.map((q: Question) => {
                        const QuestionComp = questionComponents[q.type];
                        return QuestionComp ? <div key={q.id} className="mb-4 border-b pb-4 last:border-b-0"><QuestionComp question={q} answer={answers[q.id]} onAnswerChange={() => {}} styles={surveyStyles} /></div> : null;
                    })}
                </CardContent>
            </div>
        );
    }

    if (!isSurveyActive) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/40">
                <Card className="w-full max-w-lg text-center p-8">
                    <CardHeader>
                        <CardTitle className="text-2xl">Survey Closed</CardTitle>
                        <CardDescription>This survey is not currently accepting responses. Thank you for your interest.</CardDescription>
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
                className="bg-white rounded-3xl p-12 shadow-2xl max-w-md w-full text-center"
                >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/30"
                >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                    Thank You!
                </h2>
                <p className="text-slate-600 text-lg">
                    Your response has been recorded.
                </p>
                </motion.div>
            </div>
        );
    }
    
    const progress = survey ? ((currentQuestionIndex + 2) / (survey.questions.length + 1)) * 100 : 0;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-muted/40">
             <Card className="w-full max-w-md md:max-w-2xl bg-card/80 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-lg">
                <CardHeader className="text-center p-6 md:p-8">
                    <CardTitle className="font-headline text-2xl md:text-3xl">{survey.title}</CardTitle>
                    <CardDescription>{survey.description}</CardDescription>
                     <Progress value={progress} className="mt-4" />
                </CardHeader>
                <CardContent className="min-h-[300px] overflow-hidden">
                    <AnimatePresence mode="wait">
                    {currentQuestionIndex === -1 ? (
                        <motion.div
                          key="intro"
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          className="p-4 md:p-8"
                        >
                          <div className="space-y-6">
                            <div>
                              <Label className="text-slate-900 font-semibold mb-2 block">
                                Name *
                              </Label>
                              <Input
                                value={respondentName}
                                onChange={(e) => setRespondentName(e.target.value)}
                                placeholder="Enter your name"
                                className="h-12 rounded-xl border-slate-200"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-900 font-semibold mb-2 block">
                                Email *
                              </Label>
                              <Input
                                type="email"
                                value={respondentEmail}
                                onChange={(e) => setRespondentEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="h-12 rounded-xl border-slate-200"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={currentQuestionIndex}
                           initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                           className="p-2 sm:p-4"
                        >
                            {QuestionComponent && survey && (
                                <div key={currentQuestion.id}>
                                    <QuestionComponent
                                        question={currentQuestion}
                                        answer={answers[currentQuestion.id]}
                                        onAnswerChange={(value: any) => handleAnswerChange(currentQuestion.id, value)}
                                        styles={survey.styles || {}}
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="flex justify-between p-6 md:p-8">
                    <Button onClick={handlePrev} disabled={currentQuestionIndex === -1} variant="outline" className="transition-transform active:scale-95">
                        Previous
                    </Button>
                    {currentQuestionIndex < survey.questions.length - 1 ? (
                        <Button onClick={currentQuestionIndex === -1 ? () => setCurrentQuestionIndex(0) : handleNext} disabled={!canProceed()} className="transition-transform active:scale-95">
                            {currentQuestionIndex === -1 ? "Start Survey" : "Next"}
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} className="transition-transform active:scale-95">
                             {isSubmitting ? "Submitting..." : "Submit Survey"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

```
- src/hooks/use-local-storage.ts:
```ts
'use client';
    
    import { useState, useEffect } from 'react';
    
    export function useLocalStorage<T>(key: string, initialValue: T) {
      const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
          return initialValue;
        }
        try {
          const item = window.localStorage.getItem(key);
          return item ? JSON.parse(item) : initialValue;
        } catch (error) {
          console.log(error);
          return initialValue;
        }
      });
    
      const setValue = (value: T | ((val: T) => T)) => {
        try {
          const valueToStore =
            value instanceof Function ? value(storedValue) : value;
          setStoredValue(valueToStore);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
        } catch (error) {
          console.log(error);
        }
      };
    
      useEffect(() => {
        if (typeof window !== 'undefined') {
            const item = window.localStorage.getItem(key);
            if (item) {
                try {
                    setStoredValue(JSON.parse(item));
                } catch (e) {
                    // If parsing fails, it might be a raw string
                    // Or could be corrupted, best to fall back to initial
                    console.warn(`Could not parse stored json for key "${key}"`);
                }
            }
        }
      }, [key]);
    
      return [storedValue, setValue] as const;
    }


```
- src/hooks/use-toast.ts:
```ts
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

```
- src/lib/stats.ts:
```ts

import Papa from 'papaparse';

export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    console.error("Parsing errors:", result.errors);
    // Optionally throw an error for the first critical error
    const firstError = result.errors[0];
    if (firstError.code !== 'UndetectableDelimiter') {
       throw new Error(`CSV Parsing Error: ${firstError.message} on row ${firstError.row}`);
    }
  }

  if (!result.data || result.data.length === 0) {
    throw new Error("No parsable data rows found in the file.");
  }
  
  const rawHeaders = result.meta.fields || [];
  const data: DataSet = result.data as DataSet;

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    
    // Check if every non-empty value is a number
    const isNumericColumn = values.length > 0 && values.every(val => typeof val === 'number' && isFinite(val));

    if (isNumericColumn) {
        numericHeaders.push(header);
    } else {
        categoricalHeaders.push(header);
    }
  });

  // Ensure types are correct, PapaParse does a good job but we can enforce it.
  const sanitizedData = data.map(row => {
    const newRow: DataPoint = {};
    rawHeaders.forEach(header => {
      const value = row[header];
      if (numericHeaders.includes(header)) {
        if (typeof value === 'number' && isFinite(value)) {
            newRow[header] = value;
        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
            newRow[header] = parseFloat(value);
        } else {
            newRow[header] = NaN; // Use NaN for non-numeric values in numeric columns
        }
      } else { // Categorical
        newRow[header] = String(value ?? '');
      }
    });
    return newRow;
  });

  return { headers: rawHeaders, data: sanitizedData, numericHeaders, categoricalHeaders };
};

export const unparseData = (
    { headers, data }: { headers: string[]; data: DataSet }
): string => {
    return Papa.unparse(data, {
        columns: headers,
        header: true,
    });
};


const getColumn = (data: DataSet, column: string): (number | string)[] => {
    return data.map(row => row[column]).filter(val => val !== undefined && val !== null && val !== '');
};

const getNumericColumn = (data: DataSet, column: string): number[] => {
    return data.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val)) as number[];
}

const mean = (arr: number[]): number => arr.length === 0 ? NaN : arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[]): number => {
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    if(isNaN(m)) return NaN;
    return mean(arr.map(x => Math.pow(x - m, 2)));
};

const stdDev = (arr: number[]): number => Math.sqrt(variance(arr));

const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    if(sorted[lower] === undefined || sorted[upper] === undefined) return NaN;
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

const mode = (arr: (number|string)[]): (number|string)[] => {
    if (arr.length === 0) return [];
    const counts: {[key: string]: number} = {};
    arr.forEach(val => {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });

    let maxFreq = 0;
    for (const key in counts) {
        if (counts[key] > maxFreq) {
            maxFreq = counts[key];
        }
    }

    if (maxFreq <= 1 && new Set(arr).size === arr.length) return []; // No mode if all unique

    const modes = Object.keys(counts)
        .filter(key => counts[key] === maxFreq)
        .map(key => {
            const num = parseFloat(key);
            return isNaN(num) ? key : num;
        });
    
    return modes;
}

const skewness = (arr: number[]): number => {
    if (arr.length < 3) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    return (n / ((n - 1) * (n - 2))) * arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
};

const kurtosis = (arr: number[]): number => {
    if (arr.length < 4) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
    const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return term1 * term2 - term3; // Excess kurtosis
};

export const findIntersection = (x1: number[], y1: number[], x2: number[], y2: number[]): number | null => {
    for (let i = 0; i < x1.length - 1; i++) {
        for (let j = 0; j < x2.length - 1; j++) {
            const p1 = { x: x1[i], y: y1[i] };
            const p2 = { x: x1[i+1], y: y1[i+1] };
            const p3 = { x: x2[j], y: y2[j] };
            const p4 = { x: x2[j+1], y: y2[j+1] };

            const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
            if (denominator === 0) continue;

            const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
            const ub = -((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                return p1.x + ua * (p2.x - p1.x); // Return intersection X value
            }
        }
    }
    return null;
};


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        const numericColumn = data.every(row => typeof row[header] === 'number');

        if (numericColumn) {
            const columnData = getNumericColumn(data, header);
            if (columnData.length > 0) {
                const p25 = percentile(columnData, 25);
                const p75 = percentile(columnData, 75);
                stats[header] = {
                    mean: mean(columnData),
                    median: median(columnData),
                    stdDev: stdDev(columnData),
                    variance: variance(columnData),
                    min: Math.min(...columnData),
                    max: Math.max(...columnData),
                    range: Math.max(...columnData) - Math.min(...columnData),
                    iqr: p75 - p25,
                    count: columnData.length,
                    mode: mode(columnData),
                    skewness: skewness(columnData),
                    kurtosis: kurtosis(columnData),
                    p25: p25,
                    p75: p75,
                };
            }
        } else {
             const catColumnData = getColumn(data, header);
             if(catColumnData.length > 0) {
                 stats[header] = {
                     count: catColumnData.length,
                     unique: new Set(catColumnData).size,
                     mode: mode(catColumnData),
                 }
             }
        }
    });
    return stats;
};

// Deprecated: Correlation calculation is now handled by the Python backend.
export const calculateCorrelationMatrix = (data: DataSet, headers: string[]) => {
    return [];
};

```
- src/lib/survey-templates.ts:
```ts

import type { Question } from '@/entities/Survey';

export const choiceBasedConjointTemplate = {
    title: "Smartphone Feature Preference (Choice-Based)",
    description: "Please choose the smartphone you would be most likely to purchase from each set.",
    questions: [
        {
            id: 'cbc_desc',
            type: 'description',
            title: 'Instructions',
            content: 'In the following questions, you will be presented with a few different smartphone options. From each set, please choose the one you would be most likely to purchase.'
        },
        {
            id: 'cbc_q_1',
            type: 'conjoint',
            title: 'Which of these smartphones would you choose?',
            required: true,
            attributes: [
                { id: `attr-1`, name: 'Brand', levels: ['Apple', 'Samsung', 'Google'] },
                { id: `attr-2`, name: 'Price', levels: ['$999', '$799', '$699'] },
                { id: `attr-3`, name: 'Screen Size', levels: ['6.1"', '6.7"'] },
                { id: `attr-4`, name: 'Battery', levels: ['4000mAh', '5000mAh'] },
            ],
            designMethod: 'full-factorial',
            sets: 3,
            cardsPerSet: 3,
            profiles: [],
        },
    ],
};


export const ratingBasedConjointTemplate = {
    title: "Smartphone Profile Rating (Conjoint)",
    description: "Please rate the following smartphone profiles based on your likelihood to purchase on a 1-10 scale.",
    questions: [
        {
            id: 'rating_desc',
            type: 'description',
            title: 'Instructions',
            content: 'On the following screens, you will be presented with several different smartphone concepts. Please rate each one on a scale of 1 (Very Unlikely to Buy) to 10 (Very Likely to Buy).'
        },
        {
            id: 'rating_conjoint_q_1',
            type: 'rating-conjoint',
            title: 'Please rate each of these smartphone profiles.',
            required: true,
            attributes: [
                { id: `attr-1`, name: 'Brand', levels: ['Apple', 'Samsung', 'Google'] },
                { id: `attr-2`, name: 'Price', levels: ['$999', '$799', '$699'] },
                { id: `attr-3`, name: 'Screen Size', levels: ['6.1"', '6.7"'] },
            ],
            profiles: [
                { id: 'profile_1', Brand: 'Apple', Price: '$999', 'Screen Size': '6.7"' },
                { id: 'profile_2', Brand: 'Samsung', Price: '$799', 'Screen Size': '6.7"' },
                { id: 'profile_3', Brand: 'Google', Price: '$699', 'Screen Size': '6.1"' },
            ]
        }
    ],
};

export const ipaTemplate = {
    title: "Restaurant Satisfaction Survey (for IPA)",
    description: "Please rate your experience based on the following attributes. Your feedback will help us improve.",
    questions: [
        {
            id: 'ipa_desc',
            type: 'description',
            title: 'Instructions',
            content: 'Please rate your satisfaction with the following aspects of your visit on a scale of 1 (Very Dissatisfied) to 5 (Very Satisfied).'
        },
        {
            id: 'ipa_q_attributes',
            type: 'matrix',
            title: 'Attribute Satisfaction',
            required: true,
            rows: ['Food Quality', 'Service Speed', 'Ambiance', 'Value for Money'],
            columns: ['1', '2', '3', '4', '5'],
            scale: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
        },
        {
            id: 'ipa_q_overall',
            type: 'matrix',
            title: 'Overall Satisfaction',
            required: true,
            rows: ['Overall, how satisfied were you with your visit?'],
            columns: ['1', '2', '3', '4', '5'],
            scale: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
        }
    ],
};

export const vanWestendorpTemplate = {
    title: "New Product Price Sensitivity",
    description: "We'd like to understand your perceptions of pricing for a new product. Please enter the price you feel corresponds to each question.",
    questions: [
        {
            id: 'psm_desc',
            type: 'description',
            title: 'Price Perception Questions',
            content: 'Considering the new [Product Name], what price comes to mind for each of the following descriptions?'
        },
        {
            id: 'psm_too_expensive',
            type: 'number',
            title: 'Too Expensive',
            description: 'At what price would you consider the product to be so expensive that you would not consider buying it?',
            required: true,
        },
         {
            id: 'psm_expensive',
            type: 'number',
            title: 'Expensive/High Side',
            description: 'At what price would you consider the product starting to get expensive, so that it is not out of the question, but you would have to give some thought to buying it?',
            required: true,
        },
        {
            id: 'psm_cheap',
            type: 'number',
            title: 'Cheap/Bargain',
            description: 'At what price would you consider the product to be a bargain—a great buy for the money?',
            required: true,
        },
        {
            id: 'psm_too_cheap',
            type: 'number',
            title: 'Too Cheap',
            description: 'At what price would you consider the product to be priced so low that you would feel the quality couldn\'t be very good?',
            required: true,
        },
    ] as Question[]
};

```
- src/lib/utils.ts:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```
- src/types/survey.ts:
```ts
export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  status: 'draft' | 'active' | 'closed';
  created_date: string;
  startDate?: string;
  endDate?: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submittedAt: string; // Changed from submitted_at
  answers: {
    [questionId: string]: any;
  };
}

export interface ConjointAttribute {
  id: string;
  name: string;
  levels: string[];
}

export interface Question {
  id: string;
  type: string;
  title: string;
  text?: string;
  description?: string;
  options?: string[];
  items?: string[];
  columns?: string[];
  scale?: string[];
  required?: boolean;
  content?: string;
  imageUrl?: string;
  rows?: string[];
  // For Conjoint Analysis
  attributes?: ConjointAttribute[];
}

```
- tailwind.config.ts:
```ts
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

```
- tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```
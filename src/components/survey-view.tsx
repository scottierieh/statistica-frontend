
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Question } from '@/entities/Survey';

const SingleSelectionQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer?: string; onAnswerChange: (value: string) => void; }) => (
    <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
        {question.imageUrl && (
             <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
        <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-3">
            {question.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors cursor-pointer">
                    <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                    <Label htmlFor={`q${question.id}-o${index}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
            ))}
        </RadioGroup>
    </div>
);

const MultipleSelectionQuestion = ({ question, answer = [], onAnswerChange }: { question: Question; answer?: string[]; onAnswerChange: (newAnswer: string[]) => void; }) => {
   const handleCheckChange = (checked: boolean, opt: string) => {
       if (!onAnswerChange) return;
       const currentAnswers = answer || [];
       const newAnswers = checked
           ? [...currentAnswers, opt]
           : currentAnswers.filter((a: string) => a !== opt);
       onAnswerChange(newAnswers);
   }
   
   return (
       <div className="p-4">
           <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
           {question.imageUrl && (
                 <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
           <div className="space-y-2">
                {question.options?.map((option: string, index: number) => (
                   <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors cursor-pointer">
                       <Checkbox
                           id={`q${question.id}-o${index}`}
                           checked={answer?.includes(option)}
                           onCheckedChange={(checked) => handleCheckChange(!!checked, option)}
                       />
                       <Label htmlFor={`q${question.id}-o${index}`} className="flex-1 cursor-pointer">{option}</Label>
                   </div>
               ))}
           </div>
       </div>
   );
};

const DropdownQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer?: string; onAnswerChange: (value: string) => void; }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
            {question.imageUrl && (
                <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
            <Select value={answer} onValueChange={onAnswerChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                    {question.options?.map((option: string, index: number) => (
                        <SelectItem key={index} value={option}>{option}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};


const TextQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
     {question.imageUrl && (
        <div className="my-4">
            <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
        </div>
    )}
    <Textarea placeholder="Your answer..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)}/>
  </div>
);

const NumberQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
       {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
      <Input type="number" placeholder="Enter a number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
    </div>
);

const PhoneQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
     {question.imageUrl && (
        <div className="my-4">
            <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
        </div>
    )}
    <Input type="tel" placeholder="Enter phone number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
  </div>
);

const EmailQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
    {question.imageUrl && (
        <div className="my-4">
            <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
        </div>
    )}
    <Input type="email" placeholder="Enter email address..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
  </div>
);

const RatingQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: number; onAnswerChange: (value: number) => void; }) => {
    const scale = question.scale || ['1','2','3','4','5'];
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
            {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
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
      <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
       {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
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
      <p>{question.content}</p>
    </div>
);

const BestWorstQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
            {question.imageUrl && (
                <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
            <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <div className="font-semibold text-muted-foreground">Item</div>
                    <div className="font-semibold text-center w-20">Best</div>
                    <div className="font-semibold text-center w-20">Worst</div>
                </div>
                {question.items?.map((item: string, index: number) => (
                    <div key={index} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 p-2 border rounded-md hover:bg-accent transition-colors">
                        <div>{item}</div>
                        <RadioGroup value={answer?.best} onValueChange={(value) => onAnswerChange({ ...answer, best: value })} className="flex items-center justify-center w-20">
                            <RadioGroupItem value={item} />
                        </RadioGroup>
                         <RadioGroup value={answer?.worst} onValueChange={(value) => onAnswerChange({ ...answer, worst: value })} className="flex items-center justify-center w-20">
                            <RadioGroupItem value={item} />
                        </RadioGroup>
                    </div>
                ))}
            </div>
        </div>
    );
};


const MatrixQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: any, onAnswerChange: (value: any) => void }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/3"></TableHead>
                        {question.columns?.map((col: string, colIndex: number) => {
                            const showLabel = colIndex === 0 || colIndex === (question.columns?.length || 0) - 1;
                            return (
                                <TableHead key={colIndex} className={cn("text-center text-xs w-[60px]", !showLabel && "hidden sm:table-cell")}>
                                    {showLabel ? question.scale?.[colIndex] : col}
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {(question.rows || []).map((row: string, rowIndex: number) => (
                         <TableRow key={rowIndex}>
                            <TableCell>{row}</TableCell>
                            {question.columns?.map((col: string, colIndex: number) => (
                                <TableCell key={colIndex} className="text-center">
                                     <RadioGroup value={answer?.[row]} onValueChange={(value) => onAnswerChange(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                        <RadioGroupItem value={col}/>
                                    </RadioGroup>
                                </TableCell>
                            ))}
                        </TableRow>
                     ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default function SurveyView() {
    const params = useParams();
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<any>(null);
    const [answers, setAnswers] = useState<any>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState("");
    const [startTime] = useState(Date.now());
    const [respondentName, setRespondentName] = useState("");
    const [respondentEmail, setRespondentEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSurveyActive, setIsSurveyActive] = useState(false);

    useEffect(() => {
        if (surveyId) {
            try {
                const views = parseInt(localStorage.getItem(`${surveyId}_views`) || '0', 10) + 1;
                localStorage.setItem(`${surveyId}_views`, views.toString());

                const draft = localStorage.getItem(surveyId);
                if (draft) {
                    const loadedSurvey = JSON.parse(draft);
                    setSurvey(loadedSurvey);
                    
                    const now = new Date();
                    const startDate = loadedSurvey.startDate ? new Date(loadedSurvey.startDate) : null;
                    const endDate = loadedSurvey.endDate ? new Date(loadedSurvey.endDate) : null;

                    if (startDate && endDate) {
                        setIsSurveyActive(now >= startDate && now <= endDate);
                    } else if (startDate) {
                        setIsSurveyActive(now >= startDate);
                    } else if (endDate) {
                        setIsSurveyActive(now <= endDate);
                    }
                    else {
                        setIsSurveyActive(true); // If no dates set, assume it's always active
                    }
                }
            } catch (error) {
                console.error("Failed to load survey from local storage", error);
                setError("Failed to load survey.");
            } finally {
                setLoading(false);
            }
        }
    }, [surveyId]);
    
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
        if (currentQuestionIndex > -1) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (!surveyId) return;
        const newResponse = {
            id: `resp-${Date.now()}`,
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
        matrix: MatrixQuestion
    };
    
    const currentQuestion = survey?.questions[currentQuestionIndex];
    const QuestionComponent = currentQuestion ? questionComponents[currentQuestion.type] : null;

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading survey...</div>;
    }

    if (!survey) {
        return <div className="min-h-screen flex items-center justify-center">Survey not found.</div>;
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
        )
    }
    
    const progress = survey ? ((currentQuestionIndex + 2) / (survey.questions.length + 1)) * 100 : 0;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
             <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-3xl">{survey.title}</CardTitle>
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
                          className="p-8 md:p-12"
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
                           className="p-4"
                        >
                            {QuestionComponent && survey && (
                                <div key={currentQuestion.id}>
                                    <QuestionComponent
                                        question={currentQuestion}
                                        answer={answers[currentQuestion.id]}
                                        onAnswerChange={(value: any) => handleAnswerChange(currentQuestion.id, value)}
                                        isPreview={true}
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="flex justify-between">
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

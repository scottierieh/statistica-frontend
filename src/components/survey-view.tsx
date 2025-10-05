
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
import { CheckCircle2, AlertCircle, Star, ThumbsUp, ThumbsDown, Info, ImageIcon, PlusCircle, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Question } from '@/entities/Survey';
import { Switch } from './ui/switch';

const SingleSelectionQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = value;
        onUpdate?.({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
        onUpdate?.({ ...question, options: newOptions });
    };

    const deleteOption = (index: number) => {
        const newOptions = (question.options || []).filter((_:any, i:number) => i !== index);
        onUpdate?.({ ...question, options: newOptions });
    };

    if (isPreview) {
        return (
             <div className={cn("p-4", cardClassName)}>
                <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
                {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                    </div>
                )}
                <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-3">
                    {(question.options || []).map((option: string, index: number) => (
                        <Label key={index} htmlFor={`q${question.id}-o${index}`} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors cursor-pointer">
                            <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                            <span className="flex-1">{option}</span>
                        </Label>
                    ))}
                </RadioGroup>
            </div>
        )
    }

    return (
        <div className={cn("p-4", cardClassName)}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
                     {question.required && <span className="text-destructive text-xs">* Required</span>}
                </div>
                {!isPreview && (
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                          <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                          <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Info className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}>
                            <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                    </div>
                )}
            </div>
            {question.imageUrl && (
                 <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                </div>
            )}
            <RadioGroup className="space-y-2">
                {(question.options || []).map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 group">
                        <RadioGroupItem value={option} id={`q${question.id}-o${index}`} disabled />
                        <Input 
                            placeholder={`Option ${index + 1}`} 
                            className="border-none focus:ring-0 p-0" 
                            readOnly={isPreview} 
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                        />
                         {!isPreview && (
                             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteOption(index)}>
                                <Trash2 className="w-4 h-4 text-destructive"/>
                            </Button>
                        )}
                    </div>
                ))}
            </RadioGroup>
             {!isPreview && (
                <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Option
                </Button>
            )}
        </div>
    );
};

const MultipleSelectionQuestion = ({ question, answer = [], onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string[]; onAnswerChange?: (newAnswer: string[]) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
   const handleOptionChange = (index: number, value: string) => {
       const newOptions = [...question.options];
       newOptions[index] = value;
       onUpdate?.({ ...question, options: newOptions });
   };

   const addOption = () => {
       const newOptions = [...question.options, `Option ${question.options.length + 1}`];
       onUpdate?.({ ...question, options: newOptions });
   };

   const deleteOption = (index: number) => {
       const newOptions = question.options.filter((_:any, i:number) => i !== index);
       onUpdate?.({ ...question, options: newOptions });
   };

   const handleCheckChange = (checked: boolean, opt: string) => {
       if (!onAnswerChange) return;
       const currentAnswers = answer || [];
       const newAnswers = checked
           ? [...currentAnswers, opt]
           : currentAnswers.filter((a: string) => a !== opt);
       onAnswerChange(newAnswers);
   }
   
   return (
       <div className={cn("p-4", cardClassName)}>
           <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
                     {question.required && <span className="text-destructive text-xs">* Required</span>}
                </div>
               {!isPreview && (
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                          <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                          <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </Button>
                       <Button variant="ghost" size="icon">
                           <Info className="w-5 h-5 text-muted-foreground" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}>
                           <Trash2 className="w-5 h-5 text-destructive" />
                       </Button>
                   </div>
               )}
           </div>
           {question.imageUrl && (
                 <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                </div>
            )}
           <div className="space-y-2">
                {question.options.map((option: string, index: number) => (
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

const DropdownQuestion = ({ question, answer, onAnswerChange, onDelete, onUpdate, isPreview, onImageUpload, cardClassName }: { question: any; answer?: string; onAnswerChange?: (value: string) => void; onDelete?: (id: string) => void; onUpdate?: (question: any) => void; isPreview?: boolean; onImageUpload?: (id: string) => void; cardClassName?: string; }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = value;
        onUpdate?.({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
        onUpdate?.({ ...question, options: newOptions });
    };

    const deleteOption = (index: number) => {
        const newOptions = (question.options || []).filter((_:any, i:number) => i !== index);
        onUpdate?.({ ...question, options: newOptions });
    };
    
    if (isPreview) {
        return (
            <div className={cn("p-4", cardClassName)}>
                <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
                {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto object-contain" />
                    </div>
                )}
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
    }
    
    return (
        <div className={cn("p-4", cardClassName)}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <Input placeholder="Enter your question title" value={question.title} onChange={(e) => onUpdate?.({...question, title: e.target.value})} className="text-lg font-semibold border-none focus:ring-0 p-0" readOnly={isPreview} />
                     {question.required && <span className="text-destructive text-xs">* Required</span>}
                </div>
                {!isPreview && (
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2 mr-2">
                          <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} />
                          <Label htmlFor={`required-${question.id}`}>Required</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onImageUpload?.(question.id)}>
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Info className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(question.id)}>
                            <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                    </div>
                )}
            </div>
             <div className="space-y-2">
                {(question.options || []).map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 group">
                        <Input 
                            placeholder={`Option ${index + 1}`} 
                            className="border-t-0 border-x-0 border-b focus:ring-0" 
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteOption(index)}>
                            <Trash2 className="w-4 h-4 text-destructive"/>
                        </Button>
                    </div>
                ))}
            </div>
            <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Option
            </Button>
        </div>
    );
};


const TextQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
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
      <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
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
    <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
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
    <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
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
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
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
      <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
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
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && (
                <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-2/3">Item</TableHead>
                        <TableHead className="text-center">Best</TableHead>
                        <TableHead className="text-center">Worst</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {question.items?.map((item: string, index: number) => (
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
    const headers = question.scale && question.scale.length > 0 ? question.scale : question.columns || [];

    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/3"></TableHead>
                        {headers.map((header, colIndex) => {
                            const showLabel = colIndex === 0 || colIndex === headers.length - 1;
                            return (
                                <TableHead key={`header-${colIndex}`} className={cn("text-center text-xs w-[60px]", !showLabel && "hidden sm:table-cell")}>
                                    {showLabel ? header : question.columns?.[colIndex]}
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {(question.rows || []).map((row: string, rowIndex: number) => (
                         <TableRow key={`row-${rowIndex}`}>
                            <TableCell>{row}</TableCell>
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
                const surveys = JSON.parse(localStorage.getItem('surveys') || '[]');
                const loadedSurvey = surveys.find((s: any) => s.id === surveyId);
                
                if (loadedSurvey) {
                    setSurvey(loadedSurvey);
                    const now = new Date();
                    const startDate = loadedSurvey.startDate ? new Date(loadedSurvey.startDate) : null;
                    const endDate = loadedSurvey.endDate ? new Date(loadedSurvey.endDate) : null;

                    if (!startDate && !endDate) {
                        setIsSurveyActive(loadedSurvey.status === 'active');
                    } else {
                         setIsSurveyActive(
                            loadedSurvey.status === 'active' &&
                            (!startDate || now >= startDate) &&
                            (!endDate || now <= endDate)
                        );
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

    if (error) {
        return <div className="min-h-screen flex items-center justify-center">{error}</div>;
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

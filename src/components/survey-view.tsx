
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Re-defining question components for the view page
// In a real app, these could be in a shared components directory.

const SingleSelectionQuestion = ({ question, answer, onAnswerChange }: { question: any; answer?: string; onAnswerChange: (value: string) => void; }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
            {question.imageUrl && (
                 <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
            <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-2">
                {question.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors">
                        <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                        <Label htmlFor={`q${question.id}-o${index}`} className="flex-1 cursor-pointer">{option}</Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    );
};

const MultipleSelectionQuestion = ({ question, answer = [], onAnswerChange }: { question: any; answer?: string[]; onAnswerChange: (newAnswer: string[]) => void; }) => {
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
                {question.options.map((option: string, index: number) => (
                   <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent transition-colors">
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

const TextQuestion = ({ question, answer, onAnswerChange }: { question: any, answer: string, onAnswerChange: (value: string) => void }) => (
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

const NumberQuestion = ({ question, answer, onAnswerChange }: { question: any, answer: string, onAnswerChange: (value: string) => void }) => (
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

const PhoneQuestion = ({ question, answer, onAnswerChange }: { question: any, answer: string, onAnswerChange: (value: string) => void }) => (
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

const EmailQuestion = ({ question, answer, onAnswerChange }: { question: any, answer: string, onAnswerChange: (value: string) => void }) => (
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

const RatingQuestion = ({ question, answer, onAnswerChange }: { question: any; answer: number; onAnswerChange: (value: number) => void; }) => (
  <div className="p-4">
     <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
     {question.imageUrl && (
        <div className="my-4">
            <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
        </div>
    )}
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map(rating => (
        <Star key={rating} className={cn("w-8 h-8 text-yellow-400 cursor-pointer hover:text-yellow-500 transition-colors", rating <= answer && "fill-yellow-400")} onClick={() => onAnswerChange(rating)}/>
      ))}
    </div>
  </div>
);

const NPSQuestion = ({ question, answer, onAnswerChange }: { question: any; answer: number; onAnswerChange: (value: number) => void; }) => (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
       {question.imageUrl && (
            <div className="my-4">
                <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
            </div>
        )}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {[...Array(11)].map((_, i) => (
            <Button key={i} variant={answer === i ? 'default' : 'outline'} size="icon" className="h-10 w-8 text-xs" onClick={() => onAnswerChange(i)}>
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

const DescriptionBlock = ({ question }: { question: any }) => (
    <div className="p-4 prose dark:prose-invert">
      <p>{question.content}</p>
    </div>
);

const BestWorstQuestion = ({ question, answer, onAnswerChange }: { question: any, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
            {question.imageUrl && (
                <div className="my-4">
                    <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4">
                <div className="font-semibold hidden md:block">Item</div>
                <div className="font-semibold text-center">Best</div>
                <div className="font-semibold text-center">Worst</div>
                <RadioGroup asChild value={answer?.best} onValueChange={(value) => onAnswerChange({ ...answer, best: value })}>
                    {question.items.map((item: string, index: number) => (
                        <React.Fragment key={index}>
                            <div className="p-2 border rounded-md bg-muted/20 flex items-center">{item}</div>
                            <div className="flex items-center justify-center p-2 border rounded-md">
                                <RadioGroupItem value={item}/>
                            </div>
                        </React.Fragment>
                    ))}
                </RadioGroup>
                 <RadioGroup asChild value={answer?.worst} onValueChange={(value) => onAnswerChange({ ...answer, worst: value })}>
                    {question.items.map((item: string, index: number) => (
                        <div key={index} className="flex items-center justify-center p-2 border rounded-md">
                            <RadioGroupItem value={item} />
                        </div>
                    ))}
                </RadioGroup>
            </div>
        </div>
    );
};

const MatrixQuestion = ({ question, answer, onAnswerChange }: { question: any, answer: any, onAnswerChange: (value: any) => void }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/3"></TableHead>
                        {question.columns.map((col: string, colIndex: number) => {
                            if (colIndex === 0 || colIndex === question.columns.length - 1) {
                                return (
                                    <TableHead key={colIndex} className="text-center text-xs w-[60px]">
                                        {question.scale[colIndex]}
                                    </TableHead>
                                );
                            }
                            return <TableHead key={colIndex} className="text-center w-[60px]"></TableHead>;
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {question.rows.map((row: string, rowIndex: number) => (
                         <TableRow key={rowIndex}>
                            <TableCell>{row}</TableCell>
                            <RadioGroup asChild value={answer?.[row]} onValueChange={(value) => onAnswerChange(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                <>
                                {question.columns.map((col: string, colIndex: number) => (
                                    <TableCell key={colIndex} className="text-center">
                                        <RadioGroupItem value={col}/>
                                    </TableCell>
                                ))}
                                </>
                            </RadioGroup>
                         </TableRow>
                     ))}
                </TableBody>
            </Table>
        </div>
    );
};


const questionComponents: { [key: string]: React.ComponentType<any> } = {
  single: SingleSelectionQuestion,
  multiple: MultipleSelectionQuestion,
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

export default function SurveyView() {
    const params = useParams();
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<any>(null);
    const [answers, setAnswers] = useState<any>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (surveyId) {
            try {
                // Increment view count
                const views = parseInt(localStorage.getItem(`${surveyId}_views`) || '0', 10) + 1;
                localStorage.setItem(`${surveyId}_views`, views.toString());

                // Load survey
                const draft = localStorage.getItem(surveyId);
                if (draft) {
                    setSurvey(JSON.parse(draft));
                }
            } catch (error) {
                console.error("Failed to load survey from local storage", error);
            } finally {
                setLoading(false);
            }
        }
    }, [surveyId]);
    
    const handleAnswerChange = (questionId: number, value: any) => {
        setAnswers((prev: any) => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleNext = () => {
        setCurrentQuestionIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        setCurrentQuestionIndex(prev => prev - 1);
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
        setSubmitted(true);
    };
    
    const currentQuestion = survey?.questions[currentQuestionIndex];
    const QuestionComponent = currentQuestion ? questionComponents[currentQuestion.type] : null;

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading survey...</div>;
    }

    if (!survey) {
        return <div className="flex items-center justify-center min-h-screen">Survey not found.</div>;
    }

    if (submitted) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted">
                <Card className="w-full max-w-lg text-center p-8">
                    <CardHeader>
                        <CardTitle>Thank You!</CardTitle>
                        <CardDescription>Your response has been submitted successfully.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
             <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-3xl">{survey.title}</CardTitle>
                    <CardDescription>{survey.description}</CardDescription>
                     <Progress value={((currentQuestionIndex + 1) / survey.questions.length) * 100} className="mt-4" />
                </CardHeader>
                <CardContent className="min-h-[300px]">
                    {QuestionComponent && (
                        <QuestionComponent
                            question={currentQuestion}
                            answer={answers[currentQuestion.id]}
                            onAnswerChange={(value: any) => handleAnswerChange(currentQuestion.id, value)}
                            isPreview={true}
                        />
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button onClick={handlePrev} disabled={currentQuestionIndex === 0}>
                        Previous
                    </Button>
                    {currentQuestionIndex < survey.questions.length - 1 ? (
                        <Button onClick={handleNext}>Next</Button>
                    ) : (
                        <Button onClick={handleSubmit}>Submit</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}


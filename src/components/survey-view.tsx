
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


const SingleSelectionQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question; answer?: string; onAnswerChange: (value: string) => void; styles: any; }) => {
    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={280} height={180} className="rounded-md mb-3 max-h-32 w-auto" />}
            <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-2">
                {(question.options || []).map((option: string, index: number) => (
                     <Label
                        key={index}
                        htmlFor={`q${question.id}-o${index}`}
                        className={cn(
                          "flex items-center space-x-2 p-2.5 rounded-lg border-2 transition-all cursor-pointer text-sm",
                          answer === option 
                            ? "bg-primary/10 border-primary shadow-md" 
                            : "bg-background hover:bg-accent/50 hover:border-primary/50"
                        )}
                      >
                        <RadioGroupItem value={option} id={`q${question.id}-o${index}`} className="shrink-0" />
                        <span className="flex-1 font-medium leading-tight">{option}</span>
                        {answer === option && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </Label>
                ))}
            </RadioGroup>
        </div>
    )
};

const MultipleSelectionQuestion = ({ question, answer = [], onAnswerChange, styles }: { question: Question; answer?: string[]; onAnswerChange: (newAnswer: string[]) => void; styles:any }) => {
   const handleCheckChange = (checked: boolean, opt: string) => {
       const currentAnswers = answer || [];
       const newAnswers = checked
           ? [...currentAnswers, opt]
           : currentAnswers.filter((a: string) => a !== opt);
       onAnswerChange(newAnswers);
   }
   return (
       <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
           {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={280} height={180} className="rounded-md mb-3 max-h-32 w-auto" />}
           <div className="space-y-2">
                {(question.options || []).map((option: string, index: number) => (
                   <Label key={index} htmlFor={`q${question.id}-o${index}`} className={cn("flex items-center space-x-2 p-2.5 rounded-lg border-2 transition-all cursor-pointer text-sm", answer?.includes(option) ? 'bg-primary/10 border-primary shadow-md' : 'bg-background hover:bg-accent/50 hover:border-primary/50' )}>
                       <Checkbox
                           id={`q${question.id}-o${index}`}
                           checked={answer?.includes(option)}
                           onCheckedChange={(checked) => handleCheckChange(!!checked, option)}
                           className="shrink-0"
                       />
                       <span className="flex-1 font-medium leading-tight">{option}</span>
                   </Label>
               ))}
           </div>
       </div>
   );
};

const DropdownQuestion = ({ question, answer, onAnswerChange, styles}: { question: Question; answer?: string; onAnswerChange: (value: string) => void; styles: any; }) => {
    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
          {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
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

const TextQuestion = ({ question, answer, onAnswerChange, styles}: { question: Question, answer: string, onAnswerChange: (value: string) => void, styles: any }) => (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
        <Textarea placeholder="Your answer..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} className="text-sm"/>
    </div>
);

const NumberQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question, answer: string, onAnswerChange: (value: any) => void, styles: any }) => (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
        {question.description && <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">{question.description}</p>}
        <Input 
            type="number" 
            placeholder="Enter a number..." 
            value={answer || ''} 
            onChange={e => {
                const value = e.target.value;
                const parsed = parseFloat(value);
                onAnswerChange(value === '' ? null : (isNaN(parsed) ? value : parsed));
            }}
            className="text-sm"
        />
    </div>
);


const PhoneQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question, answer: string, onAnswerChange: (value: string) => void, styles: any }) => (
    <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
        <Input type="tel" placeholder="Enter phone number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} className="text-sm"/>
    </div>
);

const EmailQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question, answer: string, onAnswerChange: (value: string) => void, styles: any }) => (
    <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
        <Input type="email" placeholder="Enter email address..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} className="text-sm"/>
    </div>
);

const RatingQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question; answer: number; onAnswerChange: (value: number) => void; styles: any }) => {
    const scale = question.scale || ['1','2','3','4','5'];
    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
            <div className="flex items-center justify-center gap-2">
                {[...Array(5)].map((_, i) => <Star key={i} className={cn("w-7 h-7 text-yellow-400 cursor-pointer hover:text-yellow-500 transition-colors", (i + 1) <= answer && "fill-yellow-400")} onClick={() => onAnswerChange(i + 1)}/>)}
            </div>
        </div>
    );
}

const NPSQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question; answer: number; onAnswerChange: (value: number) => void; styles: any }) => (
    <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
       {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {[...Array(11)].map((_, i) => (
            <Button 
                key={i} 
                variant={answer === i ? 'default' : 'outline'} 
                size="sm" 
                className="h-8 w-7 text-xs p-0 transition-transform hover:scale-110 active:scale-95" 
                onClick={() => onAnswerChange?.(i)}
            >
                {i}
            </Button>
        ))}
      </div>
       <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>Not likely</span>
          <span>Very likely</span>
      </div>
    </div>
);

const DescriptionBlock = ({ question, styles }: { question: Question, styles: any }) => (
    <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <h3 className="text-base font-semibold">{question.title}</h3>
      <p className="text-sm">{question.content}</p>
    </div>
);

const BestWorstQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question, answer: { best?: string, worst?: string }, onAnswerChange: (value: any) => void, styles: any }) => {
    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
            <div className="overflow-x-auto -mx-3 px-3">
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/2 text-xs">Item</TableHead>
                            <TableHead className="text-center w-1/4"><ThumbsUp className="mx-auto w-4 h-4"/></TableHead>
                            <TableHead className="text-center w-1/4"><ThumbsDown className="mx-auto w-4 h-4"/></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(question.items || []).map((item: string, index: number) => (
                            <TableRow key={index}>
                                <TableCell className="text-xs py-2">{item}</TableCell>
                                <TableCell className="text-center py-2">
                                    <RadioGroup value={answer?.best} onValueChange={(value) => onAnswerChange({ ...answer, best: value })}>
                                        <div className="flex justify-center">
                                            <RadioGroupItem value={item} className="h-4 w-4"/>
                                        </div>
                                    </RadioGroup>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                     <RadioGroup value={answer?.worst} onValueChange={(value) => onAnswerChange({ ...answer, worst: value })}>
                                        <div className="flex justify-center">
                                            <RadioGroupItem value={item} className="h-4 w-4"/>
                                        </div>
                                    </RadioGroup>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};


const MatrixQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question, answer: any, onAnswerChange: (value: any) => void, styles: any }) => {
    const headers = question.scale && question.scale.length > 0 ? question.scale : (question.columns || []);
    
    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={300} height={200} className="rounded-md mb-3 max-h-40 w-auto" />}
            <div className="overflow-x-auto -mx-3 px-3">
                 <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%] min-w-[80px] text-xs"></TableHead>
                            {(headers).map((header, colIndex) => (
                                <TableHead key={`header-${colIndex}`} className="text-center text-[10px] min-w-[40px] p-1">
                                    {header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(question.rows || []).map((row: string, rowIndex: number) => (
                            <TableRow key={`row-${rowIndex}`}>
                                <TableHead className="text-xs py-2">{row}</TableHead>
                                {(question.columns || []).map((col: string, colIndex: number) => (
                                    <TableCell key={`cell-${rowIndex}-${colIndex}`} className="text-center p-1">
                                        <RadioGroup value={answer?.[row]} onValueChange={(value) => onAnswerChange(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                            <div className="flex justify-center">
                                                <RadioGroupItem value={col} id={`q${question.id}-r${rowIndex}-c${colIndex}`} className="h-4 w-4"/>
                                            </div>
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

const SemanticDifferentialQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question, answer: any, onAnswerChange: (value: any) => void, styles: any }) => {
    const numPoints = question.numScalePoints || 7;
    const scalePoints = Array.from({ length: numPoints }, (_, i) => ({
      value: i + 1,
      label: question.scale?.[i] || `${i + 1}`,
    }));
  
    return (
      <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        <div className="space-y-3">
          {(question.rows || []).map((rowText, index) => {
            const [left, right] = (rowText || ' vs ').split(' vs ').map(s => s.trim());
            const selectedValue = answer?.[rowText];
            return (
              <div key={index} className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex justify-between items-center text-[11px] font-semibold text-gray-800 mb-2">
                  <span className="text-left w-[30%]">{left}</span>
                  <span className="text-right w-[30%]">{right}</span>
                </div>
                <div className="flex items-center justify-between gap-0.5">
                  {scalePoints.map(({ value, label }) => (
                    <div key={value} className="flex flex-col items-center space-y-1">
                      <button
                        onClick={() => onAnswerChange(produce(answer || {}, (draft: any) => { draft[rowText] = value; }))}
                        className={cn(`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center font-bold text-xs`,
                                  value === selectedValue
                                    ? 'bg-primary border-primary text-primary-foreground shadow-md scale-105'
                                    : 'bg-background border-border text-foreground hover:border-primary/50'
                                  )}
                      >
                        {value}
                      </button>
                      <span className="text-[9px] text-muted-foreground text-center hidden">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
};

const ServqualQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question; answer: any; onAnswerChange: (value: any) => void; styles: any }) => {
    const handleRatingChange = (rowText: string, type: 'Expectation' | 'Perception', value: number) => {
        onAnswerChange(produce(answer || {}, (draft: any) => {
            if (!draft[rowText]) draft[rowText] = {};
            draft[rowText][type] = value;
        }));
    };
    
    const scale = Array.from({ length: 7 }, (_, i) => i + 1);

    const showExpectation = question.servqualType !== 'Perception';
    const showPerception = question.servqualType !== 'Expectation';

    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            <p className="text-xs text-muted-foreground mb-3">Rate 1 (Strongly Disagree) to 7 (Strongly Agree)</p>
            <div className="space-y-3">
                {(question.rows || []).map((rowText, index) => (
                    <Card key={index}>
                        <CardHeader className="pb-2 p-3"><CardTitle className="text-sm">{rowText}</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 gap-3 p-3">
                             {showExpectation && (
                                <div className="p-2 border-l-4 border-blue-300 bg-blue-50 rounded-r-lg">
                                    <Label className="text-xs font-bold text-blue-800 mb-2 block">Expectation</Label>
                                    <div className="flex justify-between gap-1">
                                        {scale.map(value => (
                                            <Button
                                                key={`exp-${index}-${value}`}
                                                variant={answer?.[rowText]?.Expectation === value ? 'default' : 'outline'}
                                                size="sm"
                                                className={cn("h-7 w-7 p-0 text-xs", answer?.[rowText]?.Expectation === value && "bg-blue-600 hover:bg-blue-700")}
                                                onClick={() => handleRatingChange(rowText, 'Expectation', value)}
                                            >{value}</Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {showPerception && (
                                <div className="p-2 border-l-4 border-green-300 bg-green-50 rounded-r-lg">
                                    <Label className="text-xs font-bold text-green-800 mb-2 block">Perception</Label>
                                    <div className="flex justify-between gap-1">
                                         {scale.map(value => (
                                            <Button
                                                key={`per-${index}-${value}`}
                                                variant={answer?.[rowText]?.Perception === value ? 'default' : 'outline'}
                                                size="sm"
                                                 className={cn("h-7 w-7 p-0 text-xs", answer?.[rowText]?.Perception === value && "bg-green-600 hover:bg-green-700")}
                                                onClick={() => handleRatingChange(rowText, 'Perception', value)}
                                            >{value}</Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};


const ConjointQuestion = ({ question, answer, onAnswerChange, styles, isPreview, onNextTask }: { question: Question; answer: { [taskId: string]: string }; onAnswerChange: (value: any) => void; styles: any; isPreview?: boolean; onNextTask: () => void }) => {
    const { attributes = [], profiles = [], sets = 1, cardsPerSet = 3 } = question;
    const [currentTask, setCurrentTask] = useState(0);

    const tasks = useMemo(() => {
        const groupedProfiles: { [taskId: string]: any[] } = {};
        (profiles || []).forEach(p => {
            if (!groupedProfiles[p.taskId]) {
                groupedProfiles[p.taskId] = [];
            }
            groupedProfiles[p.taskId].push(p);
        });
        return Object.values(groupedProfiles);
    }, [profiles]);
    
    const handleChoice = (taskId: string, profileId: string) => {
        onAnswerChange({ ...answer, [taskId]: profileId });
        if (!isPreview) {
            setTimeout(() => {
                if (currentTask < tasks.length - 1) {
                    setCurrentTask(currentTask + 1);
                } else {
                    onNextTask();
                }
            }, 300);
        }
    };

    if (tasks.length === 0) return <p>Conjoint profiles are not generated.</p>;
    
    const currentTaskProfiles = tasks[currentTask];
    const taskId = currentTaskProfiles?.[0]?.taskId;

    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-3">{question.title} (Set {currentTask + 1} of {tasks.length}) {question.required && <span className="text-destructive">*</span>}</h3>
            {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
            
            <div className={`grid grid-cols-1 md:grid-cols-${Math.min(cardsPerSet, 4)} gap-3`}>
                {(currentTaskProfiles || []).map((profile: any, index: number) => (
                    <Card 
                        key={profile.id} 
                        className={cn(
                            "text-left transition-all overflow-hidden cursor-pointer", 
                            answer?.[taskId] === profile.id
                                ? "ring-2 ring-primary bg-primary/5" 
                                : "hover:shadow-md hover:-translate-y-1"
                        )}
                        onClick={() => handleChoice(taskId, profile.id)}
                    >
                        <CardHeader className="p-3 bg-muted/50">
                            <CardTitle className="text-sm font-semibold">Option {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-1.5">
                             {(attributes || []).map(attr => (
                                <div key={attr.id} className="flex justify-between items-center text-xs py-1 border-b last:border-b-0">
                                    <span className="font-medium text-muted-foreground">{attr.name}:</span>
                                    <span className="font-bold text-foreground">{profile[attr.name]}</span>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="p-2 bg-muted/50">
                            <div className="w-full flex items-center justify-center">
                                <RadioGroup value={answer?.[taskId]}>
                                    <RadioGroupItem value={profile.id} id={`q${question.id}-${profile.id}`} />
                                </RadioGroup>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
             </div>
        </div>
    );
};

const RatingConjointQuestion = ({ question, answer, onAnswerChange, styles, onNextTask, isLastQuestion, submitSurvey }: { question: Question; answer: { [profileId: string]: number }, onAnswerChange: (value: any) => void; styles: any; onNextTask: () => void; isLastQuestion: boolean; submitSurvey: () => void; }) => {
    const { attributes = [], profiles = [] } = question;
    const [currentTask, setCurrentTask] = useState(0);

    const tasks = useMemo(() => {
        const groupedProfiles: { [taskId: string]: any[] } = {};
        (profiles || []).forEach(p => {
            if (!groupedProfiles[p.taskId]) {
                groupedProfiles[p.taskId] = [];
            }
            groupedProfiles[p.taskId].push(p);
        });
        return Object.values(groupedProfiles);
    }, [profiles]);
    
    const handleRatingChange = (profileId: string, value: string) => {
        const rating = parseInt(value, 10);
        if (rating >= 1 && rating <= 10) {
             onAnswerChange(produce(answer || {}, (draft: any) => { draft[profileId] = rating; }));
        }
    };
    
    const handleNextTask = () => {
        if (currentTask < tasks.length - 1) {
            setCurrentTask(currentTask + 1);
        } else if (isLastQuestion) {
            submitSurvey();
        } else {
            onNextTask();
        }
    };

    if (tasks.length === 0) return <div className="p-3 text-sm">Conjoint profiles not generated.</div>;
    
    const currentTaskProfiles = tasks[currentTask];

    return (
        <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-3">{question.title} (Set {currentTask + 1} of {tasks.length}) {question.required && <span className="text-destructive">*</span>}</h3>
            {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
             <div className="grid grid-cols-2 gap-2">
                {currentTaskProfiles.map((profile: any, index: number) => (
                    <Card key={profile.id} className="text-center">
                        <CardHeader className="p-2 pb-1">
                            <CardTitle className="text-xs font-semibold">Option {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1">
                             {(attributes || []).map(attr => (
                                <div key={attr.id} className="flex justify-between items-center text-xs py-1 border-b last:border-b-0">
                                    <span className="font-medium text-muted-foreground w-16 text-left">{attr.name}:</span>
                                    <span className="font-semibold flex-1 text-right">{profile[attr.name]}</span>
                                </div>
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
                                className="h-8 text-xs"
                            />
                        </CardFooter>
                    </Card>
                ))}
             </div>
             <div className="text-right mt-4">
                <Button onClick={handleNextTask}>Next</Button>
            </div>
        </div>
    );
};

const AHPQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question; answer: any; onAnswerChange: (value: any) => void; styles: any; }) => {
    
    const scale = [-9, -7, -5, -3, 1, 3, 5, 7, 9];

    const generatePairs = (items: any[]) => {
        const pairs: [any, any][] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                pairs.push([items[i], items[j]]);
            }
        }
        return pairs;
    };
    
    const criteriaPairs = useMemo(() => generatePairs(question.criteria || []), [question.criteria]);
    const alternativePairsByCriterion = useMemo(() => {
        const result: {[criterionId: string]: [string, string][]} = {};
        if (question.alternatives && question.alternatives.length > 1) {
            const altPairs = generatePairs(question.alternatives);
            (question.criteria || []).forEach(c => {
                 result[c.id] = altPairs;
            });
        }
        return result;
    }, [question.criteria, question.alternatives]);


    const handleComparisonChange = (matrixKey: string, pairKey: string, value: number) => {
        onAnswerChange(produce(answer || {}, (draft: any) => {
            if (!draft[matrixKey]) draft[matrixKey] = {};
            draft[matrixKey][pairKey] = value;
        }));
    };
    
    const PairwiseComparison = ({ pair, matrixKey }: { pair: [string, string], matrixKey: string }) => {
        const pairKey = `${pair[0]} vs ${pair[1]}`;
        const value = answer?.[matrixKey]?.[pairKey];

        return (
            <div className="p-4 rounded-lg border bg-white mb-2 shadow-sm">
                <div className="relative flex flex-col items-center justify-between gap-3">
                    <div className="flex w-full justify-between font-bold text-sm">
                        <span className="text-left w-2/5 text-primary" style={{ color: styles.primaryColor }}>{pair[0]}</span>
                        <span className="text-center w-1/5 text-muted-foreground">vs</span>
                        <span className="text-right w-2/5 text-primary" style={{ color: styles.primaryColor }}>{pair[1]}</span>
                    </div>
                     <RadioGroup 
                        className="flex justify-between gap-1 sm:gap-2 w-full"
                        value={String(value)}
                        onValueChange={(v) => handleComparisonChange(matrixKey, pairKey, Number(v))}
                    >
                       {scale.map((v) => (
                            <div key={v} className="flex flex-col items-center space-y-1">
                                <Label htmlFor={`pair-${matrixKey}-${pair.join('-')}-${v}`} className="text-xs text-muted-foreground">{Math.abs(v)}</Label>
                                <RadioGroupItem 
                                    value={String(v)} 
                                    id={`pair-${matrixKey}-${pair.join('-')}-${v}`} 
                                    className={cn(value === v && "bg-primary text-primary-foreground")}
                                />
                            </div>
                        ))}
                    </RadioGroup>
                    <div className="w-full flex justify-between text-xs text-muted-foreground mt-1 px-1">
                        <span className="text-left text-[10px] sm:text-xs">Strongly Prefer {pair[0]}</span>
                        <span className="text-center text-[10px] sm:text-xs">Neutral</span>
                        <span className="text-right text-[10px] sm:text-xs">Strongly Prefer {pair[1]}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 rounded-lg" style={{ marginBottom: styles.questionSpacing }}>
            <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor }}>
                {question.title}
            </h3>
            <div className="space-y-6">
                {criteriaPairs.length > 0 && (
                    <div>
                        <div className="legend bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
                           <div className="legend-title font-semibold text-blue-800 mb-2">Importance Scale Guide</div>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700">
                               <div><strong>1:</strong> Equal Importance</div>
                               <div><strong>3:</strong> Moderate Importance</div>
                               <div><strong>5:</strong> Strong Importance</div>
                               <div><strong>7:</strong> Very Strong Importance</div>
                               <div><strong>9:</strong> Extreme Importance</div>
                           </div>
                        </div>
                        <h4 className="font-semibold text-lg mb-2">Criteria Comparison</h4>
                        {criteriaPairs.map((pair, index) => (
                             <PairwiseComparison key={index} pair={[pair[0].name, pair[1].name]} matrixKey="criteria" />
                        ))}
                    </div>
                )}
                 {Object.entries(alternativePairsByCriterion).length > 0 && (
                    <div>
                        <h4 className="font-semibold text-lg mb-2">Alternative Comparison</h4>
                        {Object.entries(alternativePairsByCriterion).map(([criterionId, pairs]) => {
                             const criterion = question.criteria?.find(c => c.id === criterionId);
                             return (
                                <div key={criterionId} className="mb-4">
                                    <h5 className="font-medium text-center p-2 bg-slate-100 rounded-md mb-2">Which alternative is better for: <strong>{criterion?.name}</strong></h5>
                                    {pairs.map((pair, index) => (
                                        <PairwiseComparison key={index} pair={pair} matrixKey={`alt_${criterionId}`} />
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                 )}
            </div>
        </div>
    );
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
        likert: SemanticDifferentialQuestion,
        ahp: AHPQuestion,
        servqual: ServqualQuestion,
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
                                                isPreview={isPreview}
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
```
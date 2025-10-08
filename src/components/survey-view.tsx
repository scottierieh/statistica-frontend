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
import { Slider } from './ui/slider';

const SingleSelectionQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question; answer?: string; onAnswerChange: (value: string) => void; styles: any; }) => {
    const theme = styles.theme || 'default';
    return (
        <div className="p-4 rounded-lg bg-background" style={{ marginBottom: styles.questionSpacing, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
            <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-3">
                {(question.options || []).map((option: string, index: number) => (
                     <Label
                        key={index}
                        htmlFor={`q${question.id}-o${index}`}
                        className={cn(
                          "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                          answer === option 
                            ? "bg-primary/10 border-primary shadow-md" 
                            : "bg-background hover:bg-accent/50 hover:border-primary/50"
                        )}
                      >
                        <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                        <span className="flex-1 font-medium">{option}</span>
                        {answer === option && <CheckCircle2 className="w-5 h-5 text-primary" />}
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
   const theme = styles.theme || 'default';
   return (
       <div className="p-4 rounded-lg bg-background" style={{ marginBottom: styles.questionSpacing, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
           {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
           <div className="space-y-3">
                {(question.options || []).map((option: string, index: number) => (
                   <Label key={index} htmlFor={`q${question.id}-o${index}`} className={cn("flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer", answer?.includes(option) ? 'bg-primary/10 border-primary shadow-md' : 'bg-background hover:bg-accent/50 hover:border-primary/50' )}>
                       <Checkbox
                           id={`q${question.id}-o${index}`}
                           checked={answer?.includes(option)}
                           onCheckedChange={(checked) => handleCheckChange(!!checked, option)}
                       />
                       <span className="flex-1 font-medium">{option}</span>
                   </Label>
               ))}
           </div>
       </div>
   );
};

const DropdownQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer?: string; onAnswerChange: (value: string) => void; }) => {
    return (
        <div className="p-4 rounded-lg bg-background shadow-md">
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
    <div className="p-4 rounded-lg bg-background shadow-md">
        <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
        <Textarea placeholder="Your answer..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)}/>
    </div>
);

const NumberQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: any) => void }) => (
    <div className="p-4 rounded-lg bg-background shadow-md">
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
    <div className="p-4 rounded-lg bg-background shadow-md">
        <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
        <Input type="tel" placeholder="Enter phone number..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
    </div>
);

const EmailQuestion = ({ question, answer, onAnswerChange }: { question: Question, answer: string, onAnswerChange: (value: string) => void }) => (
    <div className="p-4 rounded-lg bg-background shadow-md">
        <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        {question.imageUrl && <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md mb-4 max-h-60 w-auto" />}
        <Input type="email" placeholder="Enter email address..." value={answer || ''} onChange={e => onAnswerChange(e.target.value)} />
    </div>
);

const RatingQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: number; onAnswerChange: (value: number) => void; }) => {
    const scale = question.scale || ['1','2','3','4','5'];
    return (
        <div className="p-4 rounded-lg bg-background shadow-md">
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
    <div className="p-4 rounded-lg bg-background shadow-md">
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
        <div className="p-4 rounded-lg bg-background shadow-md">
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
        <div className="p-4 rounded-lg bg-background shadow-md">
            <h3 className="text-lg font-semibold mb-4">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
            {question.description && <p className="text-sm text-muted-foreground mb-4">{question.description}</p>}
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

const SemanticDifferentialQuestion = ({ question, answer, onAnswerChange, styles }: { question: Question, answer: any, onAnswerChange: (value: any) => void, styles: any }) => {
    const numPoints = question.numScalePoints || 7;
    const scalePoints = Array.from({ length: numPoints }, (_, i) => ({
      value: i + 1,
      label: question.scale?.[i] || `${i + 1}`,
    }));
  
    return (
      <div className="p-4 rounded-lg bg-background" style={{ marginBottom: styles.questionSpacing, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor }}>{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
        <div className="space-y-6">
          {(question.rows || []).map((rowText, index) => {
            const [left, right] = (rowText || ' vs ').split(' vs ').map(s => s.trim());
            const selectedValue = answer?.[rowText];
            return (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-800 mb-4 px-2">
                  <span>{left}</span>
                  <span>{right}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {scalePoints.map(({ value, label }) => (
                    <div key={value} className="flex flex-col items-center space-y-2">
                      <button
                        onClick={() => onAnswerChange(produce(answer || {}, (draft: any) => { draft[rowText] = value; }))}
                        className={cn(`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all flex items-center justify-center font-bold text-lg`,
                                  value === selectedValue
                                    ? 'bg-primary border-primary text-primary-foreground shadow-lg scale-110'
                                    : 'bg-background border-border text-foreground hover:border-primary/50'
                                  )}
                      >
                        {value}
                      </button>
                      <span className="text-xs text-muted-foreground text-center">{label}</span>
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

const AHPQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: any; onAnswerChange: (value: any) => void; }) => {
    const { criteria = [], alternatives = [] } = question;
    const [activeTab, setActiveTab] = useState<'criteria' | string>(alternatives.length > 0 ? 'criteria' : criteria[0] && criteria[1] ? `${criteria[0]} vs ${criteria[1]}` : 'criteria');
    
    const getPairs = (items: string[]) => {
        const pairs: [string, string][] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                pairs.push([items[i], items[j]]);
            }
        }
        return pairs;
    };
    
    const criteriaPairs = getPairs(criteria);
    const alternativePairs = getPairs(alternatives);
    
    const handleSliderChange = (pairKey: string, value: number) => {
        onAnswerChange(produce(answer || {}, (draft: any) => {
            draft[pairKey] = value;
        }));
    };
    
    const PairwiseComparison = ({ pair, matrixKey }: { pair: [string, string], matrixKey: string }) => {
        const pairKey = `${pair[0]} vs ${pair[1]}`;
        const value = answer?.[matrixKey]?.[pairKey] || 0;
        const labels = ['9', '7', '5', '3', '1', '3', '5', '7', '9'];

        return (
            <div className="py-4 border-b">
                <div className="flex justify-between items-center font-semibold mb-2">
                    <span>{pair[0]}</span>
                    <span>{pair[1]}</span>
                </div>
                <div className="flex items-center gap-4">
                    <Slider
                        value={[value]}
                        onValueChange={(v) => handleSliderChange(`${matrixKey}.${pairKey}`, v[0])}
                        min={-9}
                        max={9}
                        step={1}
                    />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                     {labels.slice(0, 5).reverse().map(l => <span key={`l-${l}`}>{l}</span>)}
                     {labels.slice(5).map(l => <span key={`r-${l}`}>{l}</span>)}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 rounded-lg bg-background shadow-md">
            <h3 className="text-lg font-semibold mb-4">{question.title}</h3>
            {question.description && <p className="text-sm text-muted-foreground mb-4">{question.description}</p>}
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="criteria">Criteria Comparison</TabsTrigger>
                    {alternatives.length > 0 && criteria.map(c => (
                        <TabsTrigger key={c} value={c}>Compare by {c}</TabsTrigger>
                    ))}
                </TabsList>
                
                <TabsContent value="criteria" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Compare Criteria Importance</CardTitle></CardHeader>
                        <CardContent>
                            {criteriaPairs.map((pair, i) => (
                                <PairwiseComparison key={i} pair={pair} matrixKey="criteria" />
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 {alternatives.length > 0 && criteria.map(criterion => (
                    <TabsContent key={criterion} value={criterion} className="mt-4">
                         <Card>
                            <CardHeader><CardTitle>Compare Alternatives based on &quot;{criterion}&quot;</CardTitle></CardHeader>
                            <CardContent>
                                {alternativePairs.map((pair, i) => (
                                    <PairwiseComparison key={i} pair={pair} matrixKey={criterion} />
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

const ConjointQuestion = ({ question, answer, onAnswerChange }: { question: Question; answer: string; onAnswerChange: (value: string) => void; }) => {
    const { attributes = [], profiles = [] } = question;
    
    if (profiles.length === 0) return <div className="p-4">Conjoint profiles not generated.</div>;
    
    // Assuming profiles are structured in sets
    const profileSet = profiles[0] || [];

    return (
        <div className="p-4 rounded-lg bg-background shadow-md">
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
        <div className="p-4 rounded-lg bg-background shadow-md">
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
        'semantic-differential': SemanticDifferentialQuestion,
        'likert': SemanticDifferentialQuestion,
        'ahp': AHPQuestion,
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
             <div className="w-full h-full overflow-y-auto" style={{ backgroundColor: surveyStyles?.secondaryColor, color: surveyStyles?.primaryColor }}>
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-2">{survey.title}</h2>
                  <p className="text-sm mb-6">{survey.description}</p>
                  <div className="space-y-6">
                      {survey.questions.map((q: Question) => {
                          const QuestionComp = questionComponents[q.type];
                          return QuestionComp ? <div key={q.id} className="mb-4"><QuestionComp question={q} answer={answers[q.id]} onAnswerChange={() => {}} styles={surveyStyles} /></div> : null;
                      })}
                  </div>
                </div>
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
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8" style={{backgroundColor: surveyStyles?.secondaryColor}}>
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

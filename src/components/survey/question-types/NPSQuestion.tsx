
'use client';

import { Question, SkipLogic, Survey } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { produce } from "immer";
import { X, PlusCircle } from "lucide-react";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const LogicEditor = ({ question, survey, onUpdate, onCancel }: { question: Question, survey: Survey, onUpdate: (data: Partial<Question>) => void, onCancel: () => void }) => {
    const [skipLogic, setSkipLogic] = useState<SkipLogic[]>(question.skipLogic || []);

    const handleLogicChange = (index: number, field: keyof SkipLogic, value: any) => {
        setSkipLogic(produce(draft => {
            (draft[index] as any)[field] = value;
        }));
    };
    
    const addLogicRule = () => {
        setSkipLogic([...skipLogic, { conditionValue: '', action: 'skip_to', targetQuestionId: '' }]);
    };

    const removeLogicRule = (index: number) => {
        setSkipLogic(skipLogic.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        onUpdate({ skipLogic });
        onCancel();
    };
    
    const availableQuestions = survey.questions.filter((q: Question) => q.id !== question.id);
    const npsOptions = Array.from({ length: 11 }, (_, i) => String(i)); // 0-10

    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Edit Skip Logic for "{question.title}"</DialogTitle>
                <DialogDescription>Define rules to skip to another question or end the survey based on the NPS score.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] p-1">
                <div className="space-y-4 py-4 pr-6">
                    {skipLogic.map((logic, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                            <Label>If score is</Label>
                            <Select value={logic.conditionValue} onValueChange={value => handleLogicChange(index, 'conditionValue', value)}>
                                <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                                <SelectContent>{npsOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                            </Select>
                            <Label>then</Label>
                            <Select value={logic.action} onValueChange={value => handleLogicChange(index, 'action', value)}>
                                <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="skip_to">Skip to</SelectItem>
                                    <SelectItem value="end_survey">End Survey</SelectItem>
                                </SelectContent>
                            </Select>
                            {logic.action === 'skip_to' && (
                                <Select value={logic.targetQuestionId} onValueChange={value => handleLogicChange(index, 'targetQuestionId', value)}>
                                    <SelectTrigger className="w-48"><SelectValue placeholder="Select question..."/></SelectTrigger>
                                    <SelectContent>{availableQuestions.map((q: Question) => <SelectItem key={q.id} value={q.id}>{q.title || `Question ${q.id}`}</SelectItem>)}</SelectContent>
                                </Select>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => removeLogicRule(index)}><X className="w-4 h-4"/></Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addLogicRule}><PlusCircle className="mr-2"/> Add Rule</Button>
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave}>Save Logic</Button>
            </DialogFooter>
        </DialogContent>
    );
};


interface NPSQuestionProps {
    question: Question & { leftLabel?: string; rightLabel?: string; };
    answer?: number;
    survey: Survey;
    onAnswerChange?: (value: number) => void;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function NPSQuestion({ 
    question, 
    answer, 
    survey,
    onAnswerChange, 
    onUpdate,
    onDelete,
    onImageUpload,
    onDuplicate,
    styles,
    questionNumber,
    isPreview 
}: NPSQuestionProps) {
    const [isLogicEditorOpen, setIsLogicEditorOpen] = useState(false);

    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                    </div>
                )}
                <div className="py-4 flex flex-col items-center gap-4">
                    <div className="text-4xl font-bold w-24 text-center rounded-lg p-2 border-2" style={{ borderColor: styles.primaryColor }}>
                       {answer ?? '-'}
                    </div>
                    <Slider
                        value={[answer ?? 0]}
                        onValueChange={(v) => onAnswerChange?.(v[0])}
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                         style={{ '--slider-track-color': styles.primaryColor } as React.CSSProperties}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground w-full">
                        <span>{question.leftLabel || 'Not at all Likely'}</span>
                        <span>{question.rightLabel || 'Extremely Likely'}</span>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <Card className="bg-white">
            <style>
                {`
                    .slider-track-color-variable { background-color: var(--slider-track-color); }
                `}
            </style>
            <CardContent className="p-6">
                <Dialog open={isLogicEditorOpen} onOpenChange={setIsLogicEditorOpen}>
                    <QuestionHeader 
                        question={question}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onImageUpload={onImageUpload}
                        onDuplicate={onDuplicate}
                        onLogicEdit={() => setIsLogicEditorOpen(true)}
                        styles={styles}
                        questionNumber={questionNumber}
                    />
                    {isLogicEditorOpen && <LogicEditor question={question} survey={survey} onUpdate={(data) => onUpdate?.({...question, ...data})} onCancel={() => setIsLogicEditorOpen(false)} />}
                </Dialog>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor={`left-label-${question.id}`} className="text-xs font-semibold">Left Label</Label>
                        <Input 
                            id={`left-label-${question.id}`} 
                            placeholder="e.g., Not likely" 
                            value={question.leftLabel || ''}
                            onChange={(e) => onUpdate?.({ ...question, leftLabel: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor={`right-label-${question.id}`} className="text-xs font-semibold">Right Label</Label>
                        <Input 
                            id={`right-label-${question.id}`} 
                            placeholder="e.g., Very likely" 
                            value={question.rightLabel || ''}
                            onChange={(e) => onUpdate?.({ ...question, rightLabel: e.target.value })}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

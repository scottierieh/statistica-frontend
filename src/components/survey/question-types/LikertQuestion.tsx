'use client';

import { Question, SkipLogic, Survey, ScaleItem } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, PlusCircle, X } from "lucide-react";
import { produce } from "immer";
import { Button } from "@/components/ui/button";
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
import Image from "next/image";

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
        setSkipLogic(skipLogic.filter((_: SkipLogic, i: number) => i !== index));
    };

    const handleSave = () => {
        onUpdate({ skipLogic });
        onCancel();
    };
    
    const availableQuestions = survey.questions.filter((q: Question) => q.id !== question.id);
    const likertOptions = (question.scale || []).map(item => ({
        label: item.label,
        value: String(item.value)
    }));

    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Edit Skip Logic for &quot;{question.title}&quot;</DialogTitle>
                <DialogDescription>Define rules to skip to another question or end the survey based on the answer.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] p-1">
                <div className="space-y-4 py-4 pr-6">
                    {skipLogic.map((logic, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                            <Label>If answer is</Label>
                            <Select value={String(logic.conditionValue)} onValueChange={value => handleLogicChange(index, 'conditionValue', Number(value))}>
                                <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                                <SelectContent>{likertOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
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

interface LikertQuestionProps {
    question: Question;
    answer?: number;
    survey: Survey;
    onAnswerChange?: (value: number) => void;
    onUpdate: (question: Question) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function LikertQuestion({ 
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
}: LikertQuestionProps) {
    const [isLogicEditorOpen, setIsLogicEditorOpen] = useState(false);

    const handleScaleChange = (index: number, field: 'label' | 'value', value: string | number) => {
        onUpdate(produce(question, draft => {
            if (draft.scale) {
                const item = draft.scale[index];
                if (typeof item === 'object' && item !== null) {
                    (item as any)[field] = value;
                }
            }
        }));
    };

    const addScaleItem = () => {
        onUpdate(produce(question, draft => {
            if (!draft.scale) draft.scale = [];
            draft.scale.push({ value: draft.scale.length + 1, label: `Scale Item ${draft.scale.length + 1}` });
        }));
    };

    const removeScaleItem = (index: number) => {
        onUpdate(produce(question, draft => {
            if (draft.scale) draft.scale.splice(index, 1);
        }));
    };
    
    const handleRatingChange = (value: number) => {
        onAnswerChange?.(value);
    };

    if (isPreview) {
        const scalePoints = question.scale || [];
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
                 <RadioGroup value={String(answer)} onValueChange={(v) => handleRatingChange(Number(v))} className="space-y-3">
                    {scalePoints.map(({ value, label }) => (
                        <Label 
                            key={value} 
                            htmlFor={`q${question.id}-o${value}`}
                            className={cn(
                                "flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                                answer === value ? "shadow-md" : styles.transparentOptionBg ? 'bg-transparent hover:bg-primary/10' : 'bg-background hover:bg-primary/10'
                            )}
                            style={answer === value ? { 
                                borderColor: styles.primaryColor, 
                                backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                '--ring-color': styles.ringColor || styles.primaryColor
                            } as React.CSSProperties : {
                                '--ring-color': styles.ringColor || styles.primaryColor
                            } as React.CSSProperties}
                        >
                            <RadioGroupItem 
                                value={String(value)} 
                                id={`q${question.id}-o${value}`} 
                                style={{ borderColor: styles.primaryColor, color: styles.primaryColor }}
                            />
                            <span className="flex-1" style={{ fontSize: `${styles.answerTextSize}px` }}>{label}</span>
                            {answer === value && (
                                <CheckCircle2 className="w-4 h-4 text-primary" style={{ color: styles.primaryColor }} />
                            )}
                        </Label>
                    ))}
                </RadioGroup>
            </div>
        );
    }
    
    return (
        <Card className="bg-white">
            <CardContent className="p-6">
                <Dialog open={isLogicEditorOpen} onOpenChange={setIsLogicEditorOpen}>
                    <QuestionHeader 
                        question={question}
                        onUpdate={(data) => onUpdate({...question, ...data})}
                        onDelete={onDelete}
                        onImageUpload={onImageUpload}
                        onDuplicate={onDuplicate}
                        onLogicEdit={() => setIsLogicEditorOpen(true)}
                        styles={styles}
                        questionNumber={questionNumber}
                    />
                    {isLogicEditorOpen && <LogicEditor question={question} survey={survey} onUpdate={(data) => onUpdate({...question, ...data})} onCancel={() => setIsLogicEditorOpen(false)} />}
                </Dialog>
                 <div className="mt-4 space-y-2">
                    <Label className="text-sm font-semibold">Scale Points</Label>
                    {(question.scale || []).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                             <Input 
                                type="number"
                                value={item.value} 
                                onChange={(e) => handleScaleChange(index, 'value', Number(e.target.value))}
                                className="w-20"
                            />
                            <Input 
                                value={item.label} 
                                onChange={(e) => handleScaleChange(index, 'label', e.target.value)}
                                placeholder={`Label for value ${item.value}`}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeScaleItem(index)}>
                                <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="link" size="sm" className="mt-2" onClick={addScaleItem}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Scale Point
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
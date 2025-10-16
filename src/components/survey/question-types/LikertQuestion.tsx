'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, PlusCircle, X } from "lucide-react";
import { produce } from "immer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


interface LikertQuestionProps {
    question: Question;
    answer?: number;
    onAnswerChange?: (value: number) => void;
    onUpdate?: (question: Partial<Question>) => void;
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
    onAnswerChange, 
    onUpdate,
    onDelete,
    onImageUpload,
    onDuplicate,
    styles,
    questionNumber,
    isPreview 
}: LikertQuestionProps) {

    const handleScaleChange = (index: number, value: string) => {
        onUpdate?.({ scale: produce(question.scale, draft => { if(draft) draft[index] = value; }) });
    };

    const addScaleItem = () => {
        onUpdate?.({ scale: [...(question.scale || []), `Scale Item ${(question.scale?.length || 0) + 1}`] });
    };

    const removeScaleItem = (index: number) => {
        onUpdate?.({ scale: (question.scale || []).filter((_, i) => i !== index) });
    };

    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                 <RadioGroup 
                    value={answer ? String(answer) : undefined} 
                    onValueChange={(value) => onAnswerChange?.(parseInt(value))}
                >
                    <div className="space-y-2">
                        {(question.scale || []).map((label: string, index: number) => (
                            <Label
                                key={index}
                                htmlFor={`q${question.id}-s${index}`}
                                className={cn(
                                    "flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                                    answer === index + 1
                                        ? "bg-primary/10 border-primary shadow-md"
                                        : "bg-background hover:bg-accent/50 hover:border-primary/50"
                                )}
                            >
                                <RadioGroupItem 
                                    value={String(index + 1)} 
                                    id={`q${question.id}-s${index}`}
                                    className="shrink-0"
                                />
                                <span className="flex-1 font-medium text-sm" style={{ fontSize: `${styles.answerTextSize}px` }}>{label}</span>
                                {answer === index + 1 && (
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                )}
                            </Label>
                        ))}
                    </div>
                </RadioGroup>
            </div>
        );
    }
    
    return (
        <Card className="bg-white">
            <CardContent className="p-6">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                 <div className="mt-4 space-y-2">
                    <Label className="text-sm font-semibold">Scale Items</Label>
                    {(question.scale || []).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                             <Input 
                                value={item} 
                                onChange={(e) => handleScaleChange(index, e.target.value)}
                                placeholder={`Scale Item ${index + 1}`}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeScaleItem(index)}>
                                <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="link" size="sm" className="mt-2" onClick={addScaleItem}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Scale Item
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

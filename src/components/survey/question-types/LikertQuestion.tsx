'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

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
            </CardContent>
        </Card>
    );
}

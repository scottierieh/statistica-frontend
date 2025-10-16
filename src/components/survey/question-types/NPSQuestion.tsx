'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface NPSQuestionProps {
    question: Question & { leftLabel?: string; rightLabel?: string; };
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

export default function NPSQuestion({ 
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
}: NPSQuestionProps) {
    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
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
                   <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>{question.leftLabel || 'Not likely'}</span>
                      <span>{question.rightLabel || 'Very likely'}</span>
                  </div>
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

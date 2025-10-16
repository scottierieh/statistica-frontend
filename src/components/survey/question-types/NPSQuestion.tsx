'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NPSQuestionProps {
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
                      <span>Not likely</span>
                      <span>Very likely</span>
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
            </CardContent>
        </Card>
    );
}
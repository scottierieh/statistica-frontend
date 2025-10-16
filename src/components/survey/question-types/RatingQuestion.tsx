'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingQuestionProps {
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

export default function RatingQuestion({ 
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
}: RatingQuestionProps) {
    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                <div className="flex items-center justify-center gap-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className={cn("w-8 h-8 text-yellow-400 cursor-pointer hover:text-yellow-500 transition-colors", (i + 1) <= (answer || 0) && "fill-yellow-400")} onClick={() => onAnswerChange?.(i + 1)}/>)}
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
                <div className="mt-4 flex items-center justify-center gap-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-8 h-8 text-yellow-300" />)}
                </div>
            </CardContent>
        </Card>
    );
}

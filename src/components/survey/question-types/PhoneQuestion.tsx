
'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

interface PhoneQuestionProps {
    question: Question;
    answer?: string;
    onAnswerChange?: (value: string) => void;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function PhoneQuestion({ 
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
}: PhoneQuestionProps) {
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
                 {question.description && <p className="text-sm text-muted-foreground mb-2">{question.description}</p>}
                <Input type="tel" placeholder={question.text || "Enter phone number..."} value={answer || ''} onChange={e => onAnswerChange?.(e.target.value)} />
            </div>
        );
    }
    
    return (
        <Card className="bg-white">
            <CardContent className="p-6 space-y-4">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <div>
                    <Label htmlFor={`desc-${question.id}`} className="text-xs font-semibold">Description</Label>
                    <Input id={`desc-${question.id}`} placeholder="Optional description" value={question.description || ''} onChange={(e) => onUpdate?.({...question, description: e.target.value})}/>
                </div>
                 <div>
                    <Label htmlFor={`placeholder-${question.id}`} className="text-xs font-semibold">Placeholder Text</Label>
                    <Input id={`placeholder-${question.id}`} placeholder="e.g., (123) 456-7890" value={question.text || ''} onChange={(e) => onUpdate?.({...question, text: e.target.value})}/>
                </div>
            </CardContent>
        </Card>
    );
}

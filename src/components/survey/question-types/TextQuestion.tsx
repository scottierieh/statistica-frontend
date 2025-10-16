'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TextQuestionProps {
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

export default function TextQuestion({ 
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
}: TextQuestionProps) {
    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                {question.description && <p className="text-sm text-muted-foreground mb-2">{question.description}</p>}
                {question.text === 'multiline' ? (
                    <Textarea placeholder="Your answer..." value={answer || ''} onChange={e => onAnswerChange?.(e.target.value)} />
                ) : (
                    <Input type="text" placeholder={question.text || "Your answer..."} value={answer || ''} onChange={e => onAnswerChange?.(e.target.value)} />
                )}
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
                    <Input id={`desc-${question.id}`} placeholder="Optional description for the question" value={question.description || ''} onChange={(e) => onUpdate?.({...question, description: e.target.value})}/>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id={`multiline-${question.id}`} checked={question.type === 'multiline'} onCheckedChange={(checked) => onUpdate?.({...question, type: checked ? 'multiline' : 'singleline'})} />
                    <Label htmlFor={`multiline-${question.id}`}>Allow multiple lines</Label>
                </div>
            </CardContent>
        </Card>
    );
}

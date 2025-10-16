'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { produce } from "immer";

interface ServqualQuestionProps {
    question: Question;
    answer?: any;
    onAnswerChange?: (value: any) => void;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function ServqualQuestion({ 
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
}: ServqualQuestionProps) {
    const handleRatingChange = (rowText: string, type: 'Expectation' | 'Perception', value: number) => {
        onAnswerChange?.(produce(answer || {}, (draft: any) => {
            if (!draft[rowText]) draft[rowText] = {};
            draft[rowText][type] = value;
        }));
    };
    
    const scale = Array.from({ length: 7 }, (_, i) => i + 1);

    const showExpectation = question.servqualType !== 'Perception';
    const showPerception = question.servqualType !== 'Expectation';

    if (isPreview) {
        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
                <p className="text-xs text-muted-foreground mb-3">Rate 1 (Strongly Disagree) to 7 (Strongly Agree)</p>
                <div className="space-y-3">
                    {(question.rows || []).map((rowText, index) => (
                        <Card key={index}>
                            <CardContent className="p-3">
                                <Label className="text-sm font-medium mb-3 block">{rowText}</Label>
                                {showExpectation && (
                                    <div className="p-2 border-l-4 border-blue-300 bg-blue-50 rounded-r-lg mb-2">
                                        <Label className="text-xs font-bold text-blue-800 mb-2 block">Expectation</Label>
                                        <div className="flex justify-between gap-1">
                                            {scale.map(value => (
                                                <Button
                                                    key={`exp-${index}-${value}`}
                                                    variant={answer?.[rowText]?.Expectation === value ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={cn("h-7 w-7 p-0 text-xs", answer?.[rowText]?.Expectation === value && "bg-blue-600 hover:bg-blue-700")}
                                                    onClick={() => handleRatingChange(rowText, 'Expectation', value)}
                                                >{value}</Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {showPerception && (
                                    <div className="p-2 border-l-4 border-green-300 bg-green-50 rounded-r-lg">
                                        <Label className="text-xs font-bold text-green-800 mb-2 block">Perception</Label>
                                        <div className="flex justify-between gap-1">
                                             {scale.map(value => (
                                                <Button
                                                    key={`per-${index}-${value}`}
                                                    variant={answer?.[rowText]?.Perception === value ? 'default' : 'outline'}
                                                    size="sm"
                                                     className={cn("h-7 w-7 p-0 text-xs", answer?.[rowText]?.Perception === value && "bg-green-600 hover:bg-green-700")}
                                                    onClick={() => handleRatingChange(rowText, 'Perception', value)}
                                                >{value}</Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
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
};

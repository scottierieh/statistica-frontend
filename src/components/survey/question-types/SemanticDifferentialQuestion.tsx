'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { produce } from "immer";

interface SemanticDifferentialQuestionProps {
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

export default function SemanticDifferentialQuestion({ 
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
}: SemanticDifferentialQuestionProps) {
    const numPoints = question.numScalePoints || 7;
    const scalePoints = Array.from({ length: numPoints }, (_, i) => ({
      value: i + 1,
      label: question.scale?.[i] || `${i + 1}`,
    }));

    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                <div className="space-y-3">
                  {(question.rows || []).map((rowText, index) => {
                    const [left, right] = (rowText || ' vs ').split(' vs ').map(s => s.trim());
                    const selectedValue = answer?.[rowText];
                    return (
                      <div key={index} className="bg-background rounded-lg p-2 border">
                        <div className="flex justify-between items-center text-xs font-semibold text-foreground mb-2">
                          <span className="text-left w-[40%]">{left}</span>
                          <span className="text-right w-[40%]">{right}</span>
                        </div>
                        <div className="flex items-center justify-between gap-0.5">
                          {scalePoints.map(({ value }) => (
                            <button
                                key={value}
                                onClick={() => onAnswerChange?.(produce(answer || {}, (draft: any) => { draft[rowText] = value; }))}
                                className={cn(`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center font-bold text-xs`,
                                          value === selectedValue
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'bg-background border-border text-foreground hover:border-primary/50'
                                          )}
                            >{value}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
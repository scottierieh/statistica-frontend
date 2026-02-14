
'use client';

import { Question, RowItem } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { produce } from "immer";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { PlusCircle, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


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
      label: question.scale?.[i]?.label || `${i + 1}`,
    }));
    
    const handleRowChange = (index: number, field: 'left' | 'right', value: string) => {
        onUpdate?.(produce(question, draft => {
            if (draft.rows) {
                ((draft.rows[index] as RowItem))[field] = value;
            }
        }));
    };

    const addRow = () => {
        onUpdate?.(produce(question, draft => {
            if (!draft.rows) draft.rows = [];
            (draft.rows as RowItem[]).push({ left: 'Left Label', right: 'Right Label' });
        }));
    };

    const removeRow = (index: number) => {
        onUpdate?.(produce(question, draft => {
            if (draft.rows) draft.rows.splice(index, 1);
        }));
    };

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
                <div className="space-y-3">
                  {(question.rows || []).map((row, index) => {
                    const rowKey = `row_${index}`;
                    const typedRow = row as RowItem;
                    const selectedValue = answer?.[rowKey];
                    return (
                      <div key={index} className="bg-background rounded-lg p-2 border">
                        <div className="flex justify-between items-center text-xs font-semibold text-foreground mb-2">
                          <span className="text-left w-[40%]">{typedRow.left}</span>
                          <span className="text-right w-[40%]">{typedRow.right}</span>
                        </div>
                        <div className="flex items-center justify-between gap-0.5">
                          {scalePoints.map(({ value }) => (
                            <button
                                key={value}
                                onClick={() => onAnswerChange?.(produce(answer || {}, (draft: any) => { draft[rowKey] = value; }))}
                                className={cn(`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center font-bold text-xs`,
                                          value === selectedValue
                                            ? 'text-primary-foreground'
                                            : 'bg-background border-border text-foreground hover:border-primary/50'
                                          )}
                                style={value === selectedValue ? { 
                                    backgroundColor: styles.primaryColor,
                                    borderColor: styles.primaryColor,
                                } : {
                                    '--ring-color': styles.ringColor || styles.primaryColor
                                } as React.CSSProperties}
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
                <div className="mt-4 space-y-4">
                    <div>
                        <Label className="text-sm font-semibold">Scale Items (Bipolar Adjectives)</Label>
                        <div className="space-y-2 mt-2">
                            {(question.rows || []).map((row, index) => (
                                <div key={index} className="flex items-center gap-2 group">
                                    <Input 
                                        value={(row as RowItem).left} 
                                        onChange={(e) => handleRowChange(index, 'left', e.target.value)}
                                        placeholder="Left Label"
                                    />
                                    <span className="text-muted-foreground">vs</span>
                                     <Input 
                                        value={(row as RowItem).right} 
                                        onChange={(e) => handleRowChange(index, 'right', e.target.value)}
                                        placeholder="Right Label"
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeRow(index)}>
                                        <X className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="link" size="sm" className="mt-2" onClick={addRow}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

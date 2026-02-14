
'use client';

import { Question, RowItem, ScaleItem } from "@/entities/Survey";
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

const scaleOptions: { [key: number]: ScaleItem[] } = {
    5: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
    ],
    7: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Slightly Disagree' },
        { value: 4, label: 'Neutral' },
        { value: 5, label: 'Slightly Agree' },
        { value: 6, label: 'Agree' },
        { value: 7, label: 'Strongly Agree' },
    ]
};


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
    
    const numPoints = question.numScalePoints || 7;
    const scale = scaleOptions[numPoints] || scaleOptions[7];

    const showExpectation = question.servqualType !== 'Perception';
    const showPerception = question.servqualType !== 'Expectation';

    const handleRowChange = (index: number, value: string) => {
        onUpdate?.(produce(question, draft => {
            if (draft.rows) draft.rows[index] = value;
        }));
    };

    const addRow = () => {
        onUpdate?.(produce(question, draft => {
            if (!draft.rows) draft.rows = [];
            draft.rows.push(`New Item ${draft.rows.length + 1}`);
        }));
    };

    const removeRow = (index: number) => {
        onUpdate?.(produce(question, draft => {
            if (draft.rows) draft.rows.splice(index, 1);
        }));
    };

    const handleScalePointChange = (value: string) => {
        const numValue = parseInt(value, 10);
        onUpdate?.({
            ...question,
            numScalePoints: numValue,
            scale: scaleOptions[numValue]
        });
    };

    if (isPreview) {
        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
                 {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                    </div>
                )}
                <p className="text-xs text-muted-foreground mb-3">Rate 1 (Strongly Disagree) to {numPoints} (Strongly Agree)</p>
                <div className="space-y-3">
                    {(question.rows || []).map((rowText, index) => (
                        <Card key={index}>
                            <CardContent className="p-3">
                                <Label className="text-sm font-medium mb-3 block">{rowText as string}</Label>
                                {showExpectation && (
                                    <div className="p-2 border-l-4 border-blue-300 bg-blue-50 rounded-r-lg mb-2">
                                        <Label className="text-xs font-bold text-blue-800 mb-2 block">Expectation</Label>
                                        <div className="flex justify-between gap-1">
                                            {scale.map(({value}) => (
                                                <Button
                                                    key={`exp-${index}-${value}`}
                                                    variant={answer?.[rowText as string]?.Expectation === value ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={cn("h-7 w-7 p-0 text-xs", answer?.[rowText as string]?.Expectation === value && "bg-blue-600 hover:bg-blue-700")}
                                                    onClick={() => handleRatingChange(rowText as string, 'Expectation', value)}
                                                >{value}</Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {showPerception && (
                                    <div className="p-2 border-l-4 border-green-300 bg-green-50 rounded-r-lg">
                                        <Label className="text-xs font-bold text-green-800 mb-2 block">Perception</Label>
                                        <div className="flex justify-between gap-1">
                                             {scale.map(({value}) => (
                                                <Button
                                                    key={`per-${index}-${value}`}
                                                    variant={answer?.[rowText as string]?.Perception === value ? 'default' : 'outline'}
                                                    size="sm"
                                                     className={cn("h-7 w-7 p-0 text-xs", answer?.[rowText as string]?.Perception === value && "bg-green-600 hover:bg-green-700")}
                                                    onClick={() => handleRatingChange(rowText as string, 'Perception', value)}
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
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Survey Type</Label>
                        <Select value={question.servqualType || 'SERVQUAL'} onValueChange={(v) => onUpdate?.({...question, servqualType: v as any })}>
                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SERVQUAL">SERVQUAL (Expectation & Perception)</SelectItem>
                                <SelectItem value="Expectation">Expectation Only</SelectItem>
                                <SelectItem value="Perception">SERVPERF (Perception Only)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-sm font-semibold">Scale Points</Label>
                        <Select value={String(numPoints)} onValueChange={handleScalePointChange}>
                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5-Point Scale</SelectItem>
                                <SelectItem value="7">7-Point Scale</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <Label className="text-sm font-semibold">Items (Rows)</Label>
                    {(question.rows || []).map((row, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                             <Input 
                                value={row as string} 
                                onChange={(e) => handleRowChange(index, e.target.value)}
                                placeholder={`Item ${index + 1}`}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeRow(index)}>
                                <X className="w-4 h-4 text-muted-foreground"/>
                            </Button>
                        </div>
                    ))}
                    <Button variant="link" size="sm" className="mt-2" onClick={addRow}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

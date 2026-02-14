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
import { PlusCircle, X, Check, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

interface MatrixQuestionProps {
    question: Question;
    answer?: any;
    onAnswerChange?: (value: any) => void;
    onUpdate: (question: Question) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function MatrixQuestion({ 
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
}: MatrixQuestionProps) {
    
    const [openItems, setOpenItems] = useState<string[]>([]);

    useEffect(() => {
        if (isPreview) {
            const unansweredItems = (question.rows || []).map((_: any, index: number) => `item-${index}`)
                .filter((itemValue: string) => {
                    const rowIndex = parseInt(itemValue.split('-')[1]);
                    const row = (question.rows || [])[rowIndex];
                    const rowText = typeof row === 'string' ? row : (row as RowItem).left;
                    return !answer?.[rowText];
                });
            setOpenItems(unansweredItems);
        }
    }, [isPreview, question.rows, answer]);

    const handleRowChange = (index: number, value: string) => {
        onUpdate(produce(question, draft => {
            if (draft.rows) {
                const existing = draft.rows[index];
                if (typeof existing === 'object' && existing !== null) {
                    (existing as any).left = value;
                } else {
                    (draft.rows as any[])[index] = value;
                }
            }
        }));
    };

    const addRow = () => {
        onUpdate(produce(question, draft => {
            if (!draft.rows) draft.rows = [];
            (draft.rows as any[]).push(`Row ${draft.rows.length + 1}`);
        }));
    };

    const removeRow = (index: number) => {
        onUpdate(produce(question, draft => {
            if (draft.rows) draft.rows.splice(index, 1);
        }));
    };

    const handleScaleChange = (index: number, field: keyof ScaleItem, value: string | number) => {
        onUpdate(produce(question, (draft) => {
            if (draft.scale) {
                (draft.scale[index] as any)[field] = value;
            }
        }));
    };

    const addScaleItem = () => {
        onUpdate(produce(question, draft => {
            if (!draft.scale) draft.scale = [];
            draft.scale.push({ value: draft.scale.length + 1, label: `Label ${draft.scale.length + 1}` });
        }));
    };

    const removeScaleItem = (index: number) => {
        onUpdate(produce(question, draft => {
            if (draft.scale) draft.scale.splice(index, 1);
        }));
    };

    const handleRadioChange = (rowText: string, value: number, itemValue: string) => {
        onAnswerChange?.(produce(answer || {}, (draft: any) => {
            draft[rowText] = value;
        }));
        setOpenItems(prev => prev.filter(item => item !== itemValue));
    };
    
    if (isPreview) {
        const scalePoints = question.scale || [];
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
                <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full space-y-2">
                    {(question.rows || []).map((row, rowIndex) => {
                        const rowText = typeof row === 'string' ? row : (row as RowItem).left;
                        const itemValue = `item-${rowIndex}`;
                        const selectedValue = answer?.[rowText];
                        const isRowAnswered = selectedValue !== undefined;
                        return (
                             <AccordionItem key={`row-${rowIndex}`} value={itemValue} className="border-2 rounded-lg data-[state=open]:border-primary transition-colors bg-white shadow-sm">
                                <AccordionTrigger className="p-4 text-base hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{borderColor: isRowAnswered ? styles.primaryColor : undefined}}>
                                            {isRowAnswered && <Check className="w-3 h-3" style={{ color: styles.primaryColor }}/>}
                                        </div>
                                        {rowText}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    <div className="flex flex-col items-stretch justify-between gap-2 p-2 bg-muted rounded-md">
                                        {scalePoints.map(({value, label}) => (
                                            <button
                                                key={value}
                                                onClick={() => handleRadioChange(rowText, value, itemValue)}
                                                className={cn(`w-full h-12 rounded-md border-2 transition-all flex items-center justify-center text-xs p-2`,
                                                        value === selectedValue ? 'text-primary-foreground' : 'bg-background border-border text-foreground hover:border-primary/50'
                                                    )}
                                                style={value === selectedValue ? { 
                                                    backgroundColor: styles.primaryColor,
                                                    borderColor: styles.primaryColor,
                                                } as React.CSSProperties : {
                                                    '--ring-color': styles.ringColor || styles.primaryColor
                                                } as React.CSSProperties}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-bold text-lg">{value}</span>
                                                    <span className="text-xs text-right">{label}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </div>
        );
    }
    
    return (
        <Card className="bg-white">
            <CardContent className="p-6">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate as any}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Scale Items (Rows)</Label>
                         {(question.rows || []).map((row, index) => (
                            <div key={index} className="flex items-center gap-2 group">
                                <Input 
                                    value={typeof row === 'object' ? (row as RowItem).left : row} 
                                    onChange={(e) => handleRowChange(index, e.target.value)}
                                    placeholder={`Row ${index + 1}`}
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeRow(index)}>
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="link" size="sm" className="mt-2" onClick={addRow}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                        </Button>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-sm font-semibold">Scale Points (Columns)</Label>
                         {(question.scale || []).map((item, index) => (
                            <div key={index} className="flex items-center gap-2 group">
                                <Input 
                                    type="number"
                                    value={item.value} 
                                    onChange={(e) => handleScaleChange(index, 'value', Number(e.target.value))}
                                    className="w-20"
                                />
                                <Input 
                                    value={item.label} 
                                    onChange={(e) => handleScaleChange(index, 'label', e.target.value)}
                                    placeholder={`Label for value ${item.value}`}
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeScaleItem(index)}>
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="link" size="sm" className="mt-2" onClick={addScaleItem}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Scale Point
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
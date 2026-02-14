
'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ThumbsUp, ThumbsDown, X, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { produce } from "immer";
import Image from "next/image";
import { Label } from "@/components/ui/label";

interface BestWorstQuestionProps {
    question: Question;
    answer?: { best?: string, worst?: string };
    onAnswerChange?: (value: any) => void;
    onUpdate: (question: Question) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function BestWorstQuestion({ 
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
}: BestWorstQuestionProps) {

    const handleItemChange = (index: number, value: string) => {
        onUpdate(produce(question, draft => {
            if (draft.items) draft.items[index] = value;
        }));
    };
    
    const addItem = () => {
        onUpdate(produce(question, draft => {
            if (!draft.items) draft.items = [];
            draft.items.push(`Item ${draft.items.length + 1}`);
        }));
    };

    const removeItem = (index: number) => {
        onUpdate(produce(question, draft => {
            if (draft.items) draft.items.splice(index, 1);
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
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow style={{ backgroundColor: styles.secondaryColor }}>
                                <TableHead className="w-1/2">Item</TableHead>
                                <TableHead className="text-center"><ThumbsUp className="mx-auto w-4 h-4"/></TableHead>
                                <TableHead className="text-center"><ThumbsDown className="mx-auto w-4 h-4"/></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(question.items || []).map((item: string, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{item}</TableCell>
                                    <TableCell className="text-center">
                                        <RadioGroup value={answer?.best} onValueChange={(value) => onAnswerChange?.({ ...answer, best: value })}>
                                            <div className="flex justify-center">
                                                <RadioGroupItem 
                                                    value={item} 
                                                    disabled={answer?.worst === item}
                                                    style={{ borderColor: styles.primaryColor, color: styles.primaryColor }}
                                                />
                                            </div>
                                        </RadioGroup>
                                    </TableCell>
                                    <TableCell className="text-center">
                                         <RadioGroup value={answer?.worst} onValueChange={(value) => onAnswerChange?.({ ...answer, worst: value })}>
                                            <div className="flex justify-center">
                                                <RadioGroupItem 
                                                    value={item} 
                                                    disabled={answer?.best === item} 
                                                    style={{ borderColor: styles.primaryColor, color: styles.primaryColor }}
                                                />
                                            </div>
                                        </RadioGroup>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <Card className="bg-white">
            <CardContent className="p-6">
                <QuestionHeader 
                    question={question}
                    onUpdate={(data) => onUpdate({ ...question, ...data })}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                 <div className="mt-4 space-y-2">
                    <Label className="text-sm font-semibold">Items</Label>
                    {(question.items || []).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                            <Input 
                                value={item} 
                                onChange={(e) => handleItemChange(index, e.target.value)}
                                placeholder={`Item ${index + 1}`}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeItem(index)}>
                                <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="link" size="sm" className="mt-2" onClick={addItem}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

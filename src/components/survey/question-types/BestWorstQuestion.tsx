'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface BestWorstQuestionProps {
    question: Question;
    answer?: { best?: string, worst?: string };
    onAnswerChange?: (value: any) => void;
    onUpdate?: (question: Partial<Question>) => void;
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
    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
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
                                                <RadioGroupItem value={item} />
                                            </div>
                                        </RadioGroup>
                                    </TableCell>
                                    <TableCell className="text-center">
                                         <RadioGroup value={answer?.worst} onValueChange={(value) => onAnswerChange?.({ ...answer, worst: value })}>
                                            <div className="flex justify-center">
                                                <RadioGroupItem value={item} />
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
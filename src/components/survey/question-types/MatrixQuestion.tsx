'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { produce } from "immer";

interface MatrixQuestionProps {
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
                                <TableHead className="w-[30%] min-w-[80px]"></TableHead>
                                {(question.columns || []).map((header, colIndex) => (
                                    <TableHead key={`header-${colIndex}`} className="text-center text-xs min-w-[40px] p-1">
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(question.rows || []).map((row: string, rowIndex: number) => (
                                <TableRow key={`row-${rowIndex}`}>
                                    <TableHead className="text-sm py-2">{row}</TableHead>
                                    {(question.columns || []).map((col: string, colIndex: number) => (
                                        <TableCell key={`cell-${rowIndex}-${colIndex}`} className="text-center p-1">
                                            <RadioGroup value={answer?.[row]} onValueChange={(value) => onAnswerChange?.(produce(answer || {}, (draft: any) => { draft[row] = value; }))}>
                                                <div className="flex justify-center">
                                                    <RadioGroupItem value={col} id={`q${question.id}-r${rowIndex}-c${colIndex}`} />
                                                </div>
                                            </RadioGroup>
                                        </TableCell>
                                    ))}
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
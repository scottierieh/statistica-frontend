'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { produce } from "immer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";

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
    
    const handleRowChange = (index: number, value: string) => {
        onUpdate?.({ rows: produce(question.rows, draft => { if(draft) draft[index] = value; }) });
    };

    const addRow = () => {
        onUpdate?.({ rows: [...(question.rows || []), `Row ${(question.rows?.length || 0) + 1}`] });
    };

    const removeRow = (index: number) => {
        onUpdate?.({ rows: (question.rows || []).filter((_, i) => i !== index) });
    };

    const handleColumnChange = (index: number, value: string) => {
        onUpdate?.({ columns: produce(question.columns, draft => { if(draft) draft[index] = value; }) });
    };

    const addColumn = () => {
        onUpdate?.({ columns: [...(question.columns || []), `Column ${(question.columns?.length || 0) + 1}`] });
    };

    const removeColumn = (index: number) => {
        onUpdate?.({ columns: (question.columns || []).filter((_, i) => i !== index) });
    };
    
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
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Rows</Label>
                         {(question.rows || []).map((row, index) => (
                            <div key={index} className="flex items-center gap-2 group">
                                <Input 
                                    value={row} 
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
                        <Label className="text-sm font-semibold">Columns</Label>
                         {(question.columns || []).map((col, index) => (
                            <div key={index} className="flex items-center gap-2 group">
                                <Input 
                                    value={col} 
                                    onChange={(e) => handleColumnChange(index, e.target.value)}
                                    placeholder={`Column ${index + 1}`}
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeColumn(index)}>
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="link" size="sm" className="mt-2" onClick={addColumn}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Column
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

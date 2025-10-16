'use client';

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";

interface SingleSelectionQuestionProps {
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

export default function SingleSelectionQuestion({ 
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
}: SingleSelectionQuestionProps) {
    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                <RadioGroup value={answer} onValueChange={onAnswerChange} className="space-y-3">
                    {(question.options || []).map((option: string, index: number) => (
                        <Label key={index} htmlFor={`q${question.id}-o${index}`} className={cn("flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer", answer === option ? "bg-primary/10 border-primary" : "bg-background hover:bg-accent/50")}>
                            <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                            <span className="flex-1" style={{ fontSize: `${styles.answerTextSize}px` }}>{option}</span>
                        </Label>
                    ))}
                </RadioGroup>
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
                 <div className="mt-4 space-y-2">
                    {(question.options || []).map((option: string, index: number) => (
                         <div key={index} className="flex items-center space-x-2 group">
                             <RadioGroupItem value={option} disabled />
                             <Input 
                                placeholder={`Option ${index + 1}`} 
                                className="border-none focus:ring-0 p-0 h-auto"
                                value={option}
                                onChange={(e) => onUpdate?.({ options: produce(question.options, draft => { draft![index] = e.target.value; }) })}
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onUpdate?.({ options: question.options?.filter((_, i) => i !== index) })}>
                                <X className="w-4 h-4 text-muted-foreground"/>
                            </Button>
                         </div>
                    ))}
                </div>
                <Button variant="link" size="sm" className="mt-2" onClick={() => onUpdate?.({ options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] })}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Option
                </Button>
            </CardContent>
        </Card>
    );
}

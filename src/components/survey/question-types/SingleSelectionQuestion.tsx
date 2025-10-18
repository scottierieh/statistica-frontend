'use client';

import { Question, SkipLogic, Survey } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, PlusCircle } from "lucide-react";
import { produce } from "immer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const LogicEditor = ({ question, survey, onUpdate, onCancel }: { question: Question, survey: Survey, onUpdate: (data: Partial<Question>) => void, onCancel: () => void }) => {
    const [skipLogic, setSkipLogic] = useState<SkipLogic[]>(question.skipLogic || []);

    const handleLogicChange = (index: number, field: keyof SkipLogic, value: any) => {
        setSkipLogic(produce(draft => {
            (draft[index] as any)[field] = value;
        }));
    };
    
    const addLogicRule = () => {
        setSkipLogic([...skipLogic, { conditionValue: '', action: 'skip_to', targetQuestionId: '' }]);
    };

    const removeLogicRule = (index: number) => {
        setSkipLogic(skipLogic.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        onUpdate({ skipLogic });
        onCancel();
    };
    
    const availableQuestions = survey.questions.filter((q: Question) => q.id !== question.id);

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Skip Logic for "{question.title}"</DialogTitle>
                <DialogDescription>Define rules to skip to another question or end the survey based on the answer.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {skipLogic.map((logic, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                        <Label>If answer is</Label>
                        <Select value={logic.conditionValue} onValueChange={value => handleLogicChange(index, 'conditionValue', value)}>
                            <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                            <SelectContent>{question.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                        <Label>then</Label>
                        <Select value={logic.action} onValueChange={value => handleLogicChange(index, 'action', value)}>
                            <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="skip_to">Skip to</SelectItem>
                                <SelectItem value="end_survey">End Survey</SelectItem>
                            </SelectContent>
                        </Select>
                        {logic.action === 'skip_to' && (
                            <Select value={logic.targetQuestionId} onValueChange={value => handleLogicChange(index, 'targetQuestionId', value)}>
                                <SelectTrigger className="w-48"><SelectValue placeholder="Select question..."/></SelectTrigger>
                                <SelectContent>{availableQuestions.map((q: Question) => <SelectItem key={q.id} value={q.id}>{q.title || `Question ${q.id}`}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => removeLogicRule(index)}><X className="w-4 h-4"/></Button>
                    </div>
                ))}
                <Button variant="outline" onClick={addLogicRule}><PlusCircle className="mr-2"/> Add Rule</Button>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave}>Save Logic</Button>
            </DialogFooter>
        </DialogContent>
    );
};


interface SingleSelectionQuestionProps {
    question: Question;
    answer?: string;
    survey: Survey;
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
    survey,
    onAnswerChange, 
    onUpdate,
    onDelete,
    onImageUpload,
    onDuplicate,
    styles, 
    questionNumber,
    isPreview 
}: SingleSelectionQuestionProps) {
    const [isLogicEditorOpen, setIsLogicEditorOpen] = useState(false);

    const handleOptionChange = (index: number, value: string) => {
        onUpdate?.({ options: produce(question.options, draft => { if(draft) draft[index] = value; }) });
    };

    const addOption = () => {
        onUpdate?.({ options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] });
    };

    const deleteOption = (index: number) => {
        onUpdate?.({ options: question.options?.filter((_, i) => i !== index) });
    };

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
                <Dialog open={isLogicEditorOpen} onOpenChange={setIsLogicEditorOpen}>
                    <QuestionHeader 
                        question={question}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onImageUpload={onImageUpload}
                        onDuplicate={onDuplicate}
                        onLogicEdit={() => setIsLogicEditorOpen(true)}
                        styles={styles}
                        questionNumber={questionNumber}
                    />
                    {isLogicEditorOpen && <LogicEditor question={question} survey={survey} onUpdate={onUpdate!} onCancel={() => setIsLogicEditorOpen(false)} />}
                </Dialog>
                 <div className="mt-4 space-y-2">
                    {(question.options || []).map((option: string, index: number) => (
                         <div key={index} className="flex items-center space-x-2 group">
                            <RadioGroup>
                                <RadioGroupItem value={option} disabled />
                            </RadioGroup>
                             <Input 
                                placeholder={`Option ${index + 1}`} 
                                className="border-none focus:ring-0 p-0 h-auto"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteOption(index)}>
                                <X className="w-4 h-4 text-muted-foreground"/>
                            </Button>
                         </div>
                    ))}
                </div>
                <Button variant="link" size="sm" className="mt-2" onClick={addOption}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Option
                </Button>
            </CardContent>
        </Card>
    );
}

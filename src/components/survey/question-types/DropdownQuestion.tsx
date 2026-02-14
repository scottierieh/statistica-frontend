
'use client';

import { Question, SkipLogic, Survey } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

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
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Edit Skip Logic for "{question.title}"</DialogTitle>
                <DialogDescription>Define rules to skip to another question or end the survey based on the answer.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] p-1">
                <div className="space-y-4 py-4 pr-6">
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
            </ScrollArea>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave}>Save Logic</Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface DropdownQuestionProps {
    question: Question;
    answer?: string;
    survey: Survey;
    onAnswerChange?: (value: string) => void;
    onUpdate: (question: Question) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function DropdownQuestion({ 
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
}: DropdownQuestionProps) {
    const [isLogicEditorOpen, setIsLogicEditorOpen] = useState(false);

    const handleOptionChange = (index: number, value: string) => {
        onUpdate(produce(question, draft => {
            if (draft.options) {
                draft.options[index] = value;
            }
        }));
    };

    const addOption = () => {
        onUpdate(produce(question, draft => {
            if (!draft.options) draft.options = [];
            draft.options.push(`Option ${draft.options.length + 1}`);
        }));
    };

    const deleteOption = (index: number) => {
        onUpdate(produce(question, draft => {
            if (draft.options) {
                draft.options.splice(index, 1);
            }
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
                <Select value={answer} onValueChange={onAnswerChange}>
                    <SelectTrigger style={{ fontSize: `${styles.answerTextSize}px` }}><SelectValue placeholder="Select an option..." /></SelectTrigger>
                    <SelectContent>
                    {(question.options || []).map((option: string, index: number) => (
                        <SelectItem key={index} value={option} style={{ fontSize: `${styles.answerTextSize}px` }}>{option}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }
    
    return (
        <Card className="bg-white">
            <CardContent className="p-6">
                <Dialog open={isLogicEditorOpen} onOpenChange={setIsLogicEditorOpen}>
                    <QuestionHeader 
                        question={question}
                        onUpdate={(data) => onUpdate({...question, ...data})}
                        onDelete={onDelete}
                        onImageUpload={onImageUpload}
                        onDuplicate={onDuplicate}
                        onLogicEdit={() => setIsLogicEditorOpen(true)}
                        styles={styles}
                        questionNumber={questionNumber}
                    />
                    {isLogicEditorOpen && <LogicEditor question={question} survey={survey} onUpdate={(data) => onUpdate({...question, ...data})} onCancel={() => setIsLogicEditorOpen(false)} />}
                </Dialog>
                 <div className="mt-4 space-y-2">
                    {(question.options || []).map((option: string, index: number) => (
                         <div key={index} className="flex items-center space-x-2 group">
                             <span className="text-muted-foreground text-sm">{index+1}.</span>
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
};

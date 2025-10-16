'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { produce } from "immer";

interface ConjointQuestionProps {
    question: Question;
    answer?: { [taskId: string]: string };
    onAnswerChange?: (value: any) => void;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
    onNextTask?: () => void;
    isLastQuestion?: boolean;
    submitSurvey?: () => void;
}

export default function ConjointQuestion({ 
    question, 
    answer, 
    onAnswerChange, 
    onUpdate,
    onDelete,
    onImageUpload,
    onDuplicate,
    styles,
    questionNumber,
    isPreview,
    onNextTask,
    isLastQuestion,
    submitSurvey
}: ConjointQuestionProps) {
    const { attributes = [], profiles = [], sets = 1, cardsPerSet = 3 } = question;
    const [currentTask, setCurrentTask] = useState(0);

    const tasks = useMemo(() => {
        const groupedProfiles: { [taskId: string]: any[] } = {};
        (profiles || []).forEach(p => {
            if (!groupedProfiles[p.taskId]) {
                groupedProfiles[p.taskId] = [];
            }
            groupedProfiles[p.taskId].push(p);
        });
        return Object.values(groupedProfiles);
    }, [profiles]);
    
    const isLastTask = currentTask === tasks.length - 1;

    const handleChoice = (taskId: string, profileId: string) => {
        onAnswerChange?.({ ...answer, [taskId]: profileId });
        if (!isPreview) {
            setTimeout(() => {
                 if (isLastTask) {
                    if (isLastQuestion) {
                        submitSurvey?.();
                    } else {
                        onNextTask?.();
                    }
                } else {
                    setCurrentTask(currentTask + 1);
                }
            }, 300);
        }
    };
    
    if (isPreview) {
        if (tasks.length === 0) return <p>Conjoint profiles are not generated.</p>;
    
        const currentTaskProfiles = tasks[currentTask];
        const taskId = currentTaskProfiles?.[0]?.taskId;

        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} (Set {currentTask + 1} of {tasks.length}) {question.required && <span className="text-destructive">*</span>}
                </h3>
                {question.description && <p className="text-sm text-muted-foreground mb-4">{question.description}</p>}
                
                <div className={`grid grid-cols-1 md:grid-cols-${Math.min(cardsPerSet, 4)} gap-3`}>
                    {(currentTaskProfiles || []).map((profile: any, index: number) => (
                        <Card 
                            key={profile.id} 
                            className={cn(
                                "text-left transition-all overflow-hidden cursor-pointer", 
                                answer?.[taskId] === profile.id
                                    ? "ring-2 ring-primary bg-primary/5" 
                                    : "hover:shadow-md hover:-translate-y-1"
                            )}
                            onClick={() => handleChoice(taskId, profile.id)}
                        >
                            <CardHeader className="p-3 bg-muted/50">
                                <CardTitle className="text-sm font-semibold">Option {index + 1}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-1.5">
                                {(attributes || []).map(attr => (
                                    <div key={attr.id} className="flex justify-between items-center text-xs py-1 border-b last:border-b-0">
                                        <span className="font-medium text-muted-foreground">{attr.name}:</span>
                                        <span className="font-bold text-foreground">{profile.attributes[attr.name]}</span>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="p-2 bg-muted/50">
                                <div className="w-full flex items-center justify-center">
                                    <RadioGroup value={answer?.[taskId]}>
                                        <RadioGroupItem value={profile.id} id={`q${question.id}-${profile.id}`} />
                                    </RadioGroup>
                                </div>
                            </CardFooter>
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
            </CardContent>
        </Card>
    );
}

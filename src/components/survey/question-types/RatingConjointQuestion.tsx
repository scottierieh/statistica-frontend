'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { produce } from "immer";

interface RatingConjointQuestionProps {
    question: Question;
    answer?: { [profileId: string]: number };
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

export default function RatingConjointQuestion({ 
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
}: RatingConjointQuestionProps) {
    const { attributes = [], profiles = [] } = question;
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
    
    const handleRatingChange = (profileId: string, value: string) => {
        const rating = parseInt(value, 10);
        if (rating >= 1 && rating <= 10) {
             onAnswerChange?.(produce(answer || {}, (draft: any) => { draft[profileId] = rating; }));
        }
    };
    
    const handleNextTask = () => {
        if (currentTask < tasks.length - 1) {
            setCurrentTask(currentTask + 1);
        } else {
             if (isLastQuestion && submitSurvey) {
                submitSurvey();
            } else if(onNextTask) {
                onNextTask();
            }
        }
    };

    if (tasks.length === 0 && isPreview) return <div className="p-3 text-sm">Conjoint profiles not generated.</div>;
    
    const currentTaskProfiles = tasks[currentTask];
    const isLastTask = currentTask === tasks.length - 1;

    if (isPreview) {
        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-3">{question.title} (Set {currentTask + 1} of {tasks.length}) {question.required && <span className="text-destructive">*</span>}</h3>
                {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
                 <div className="grid grid-cols-2 gap-2">
                    {currentTaskProfiles.map((profile: any, index: number) => (
                        <Card key={profile.id} className="text-center">
                            <CardHeader className="p-2 pb-1">
                                <CardTitle className="text-xs font-semibold">Option {index + 1}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-2 space-y-1">
                                 {(attributes || []).map(attr => (
                                    <div key={attr.id} className="flex justify-between items-center text-xs py-1 border-b last:border-b-0">
                                        <span className="font-medium text-muted-foreground w-16 text-left">{attr.name}:</span>
                                        <span className="font-semibold flex-1 text-right">{profile.attributes[attr.name]}</span>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="p-2">
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    placeholder="1-10"
                                    value={answer?.[profile.id] || ''}
                                    onChange={(e) => handleRatingChange(profile.id, e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </CardFooter>
                        </Card>
                    ))}
                 </div>
                 <div className="text-right mt-4">
                    <Button onClick={handleNextTask}>
                        {isLastTask ? (isLastQuestion ? 'Submit' : 'Next') : 'Next Set'}
                    </Button>
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
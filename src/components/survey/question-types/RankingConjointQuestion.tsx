'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useMemo, useEffect } from "react";
import { produce } from "immer";
import { cn } from "@/lib/utils";

const SortableCard = ({ id, profile, index, attributes }: { id: string, profile: any, index: number, attributes: any[] }) => {
    const { attributes: dndAttributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} {...dndAttributes} {...listeners} className="p-3 bg-white border shadow-sm rounded-lg flex items-center gap-3">
             <span className="font-bold text-lg text-primary">#{index + 1}</span>
            <div className="flex-1 text-xs">
                {(attributes || []).map(attr => (
                    <div key={attr.id} className="flex justify-between">
                        <span className="text-muted-foreground">{attr.name}:</span>
                        <span>{profile.attributes[attr.name]}</span>
                    </div>
                ))}
            </div>
        </div>
    )
};


interface RankingConjointQuestionProps {
    question: Question;
    answer?: { [taskId: string]: string[] };
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

export default function RankingConjointQuestion({ 
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
}: RankingConjointQuestionProps) {
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

    const currentTaskProfiles = tasks[currentTask] || [];
    const currentTaskId = currentTaskProfiles[0]?.taskId;

    const [rankedItems, setRankedItems] = useState(currentTaskProfiles);
    
    useEffect(() => {
        setRankedItems(tasks[currentTask] || []);
    }, [currentTask, tasks]);
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleReorder = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setRankedItems((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);
                // Update answer state after reordering is complete
                onAnswerChange?.(produce(answer || {}, (draft: any) => {
                    if(!draft[currentTaskId]) draft[currentTaskId] = [];
                    draft[currentTaskId] = newOrder.map(item => item.id);
                }));
                return newOrder;
            });
        }
    };
    
    const isLastTask = currentTask === tasks.length - 1;

    const handleNextTask = () => {
        if (!isLastTask) {
            setCurrentTask(currentTask + 1);
        } else {
             if (isLastQuestion && submitSurvey) {
                submitSurvey();
            } else if(onNextTask) {
                onNextTask();
            }
        }
    };

    if (isPreview) {
        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                 <h3 className="text-base font-semibold mb-3">{question.title} (Set {currentTask + 1} of {tasks.length}) {question.required && <span className="text-destructive">*</span>}</h3>
                 <p className="text-xs text-muted-foreground mb-3">Drag and drop the cards to rank them from your most preferred (top) to least preferred (bottom).</p>
                 <div className="space-y-2">
                     <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
                        <SortableContext items={rankedItems.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            {rankedItems.map((profile, index) => (
                                <SortableCard key={profile.id} id={profile.id} profile={profile} index={index} attributes={question.attributes || []} />
                            ))}
                        </SortableContext>
                     </DndContext>
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

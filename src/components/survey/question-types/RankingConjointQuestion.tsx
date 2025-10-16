
'use client';

import { Question, ConjointAttribute } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useMemo, useEffect } from "react";
import { produce } from "immer";
import { cn } from "@/lib/utils";
import { PlusCircle, Trash2, Zap, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


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

// Helper function to generate full factorial design
const generateFullFactorial = (attributes: ConjointAttribute[]) => {
    if (!attributes || attributes.length === 0) return [];
    
    const levels = attributes.map(attr => attr.levels);
    if (levels.some(l => l.length === 0)) return [];

    let combinations: any[] = [{}];
    
    attributes.forEach(attr => {
        const newCombinations: any[] = [];
        combinations.forEach(existingCombo => {
            attr.levels.forEach(level => {
                newCombinations.push({ ...existingCombo, [attr.name]: level });
            });
        });
        combinations = newCombinations;
    });

    return combinations;
};

// Helper to create profile tasks
const createProfileTasks = (profiles: any[], sets: number) => {
    const shuffled = [...profiles].sort(() => 0.5 - Math.random());
    const cardsPerSet = Math.ceil(shuffled.length / sets);
    
    const tasks: any[] = [];
    for (let i = 0; i < sets; i++) {
        const taskProfiles = shuffled.slice(i * cardsPerSet, (i + 1) * cardsPerSet);
        taskProfiles.forEach((profileAttrs, profileIndex) => {
            tasks.push({
                id: `profile_${i}_${profileIndex}`,
                taskId: `task_${i}`,
                attributes: profileAttrs
            });
        });
    }
    return tasks;
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
    const { attributes = [], profiles = [], sets = 1 } = question;
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
    
    const handleAttributeUpdate = (attrIndex: number, newName: string) => {
        onUpdate?.({ attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].name = newName;
        })});
    };

    const handleLevelUpdate = (attrIndex: number, levelIndex: number, newLevel: string) => {
        onUpdate?.({ attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].levels[levelIndex] = newLevel;
        })});
    };
    
    const addAttribute = () => {
        onUpdate?.({
            attributes: [...attributes, { id: `attr-${Date.now()}`, name: `Attribute ${attributes.length + 1}`, levels: ['Level 1'] }]
        });
    };

    const addLevel = (attrIndex: number) => {
        onUpdate?.({ attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].levels.push(`Level ${draft[attrIndex].levels.length + 1}`);
        })});
    };

    const removeAttribute = (attrIndex: number) => {
        onUpdate?.({ attributes: attributes.filter((_, i) => i !== attrIndex) });
    };

    const removeLevel = (attrIndex: number, levelIndex: number) => {
        onUpdate?.({ attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].levels.splice(levelIndex, 1);
        })});
    };

    const totalCombinations = useMemo(() => {
        if (!attributes || attributes.length === 0) return 0;
        return attributes.reduce((acc, attr) => acc * Math.max(1, attr.levels.length), 1);
    }, [attributes]);
    
    const generateProfiles = () => {
        const allProfiles = generateFullFactorial(attributes);
        const newProfiles = createProfileTasks(allProfiles, sets || 1);
        onUpdate?.({ profiles: newProfiles });
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
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold text-sm">Conjoint Attributes</h4>
                    {attributes.map((attr, attrIndex) => (
                        <Card key={attr.id} className="p-3 bg-slate-50">
                            <div className="flex items-center gap-2 mb-2">
                                <Input value={attr.name} onChange={e => handleAttributeUpdate(attrIndex, e.target.value)} className="font-semibold"/>
                                <Button variant="ghost" size="icon" onClick={() => removeAttribute(attrIndex)}><Trash2 className="w-4 h-4"/></Button>
                            </div>
                            <div className="pl-4 space-y-1">
                                {attr.levels.map((level, levelIndex) => (
                                    <div key={levelIndex} className="flex items-center gap-2">
                                        <Input value={level} onChange={e => handleLevelUpdate(attrIndex, levelIndex, e.target.value)} />
                                        <Button variant="ghost" size="icon" onClick={() => removeLevel(attrIndex, levelIndex)}><X className="w-4 h-4"/></Button>
                                    </div>
                                ))}
                                <Button variant="link" size="sm" onClick={() => addLevel(attrIndex)}><PlusCircle className="mr-2"/>Add Level</Button>
                            </div>
                        </Card>
                    ))}
                    <Button variant="outline" size="sm" onClick={addAttribute}><PlusCircle className="mr-2"/>Add Attribute</Button>
                </div>

                <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-sm">Design & Profiles</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="sets">Number of Sets (Tasks)</Label>
                            <Input id="sets" type="number" value={sets} onChange={e => onUpdate?.({ sets: parseInt(e.target.value) || 1 })} min="1" />
                        </div>
                        <div className="p-3 bg-muted rounded-md text-center">
                            <Label>Total Possible Profiles</Label>
                            <p className="text-2xl font-bold">{totalCombinations}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Generated Profiles: {profiles.length}</p>
                        <Button variant="secondary" size="sm" onClick={generateProfiles}><Zap className="mr-2 h-4 w-4"/>Generate Profiles</Button>
                    </div>
                     <ScrollArea className="h-48 border rounded-md p-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Profile ID</TableHead>
                                    <TableHead>Task ID</TableHead>
                                    {attributes.map(a => <TableHead key={a.id}>{a.name}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(profiles || []).slice(0,20).map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.id}</TableCell>
                                        <TableCell>{p.taskId}</TableCell>
                                        {attributes.map(a => <TableCell key={a.id}>{p.attributes[a.name]}</TableCell>)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}


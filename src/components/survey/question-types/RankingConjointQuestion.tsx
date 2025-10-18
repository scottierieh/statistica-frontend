
'use client';

import { Question, ConjointAttribute } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { produce } from "immer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Zap, X, Info, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const SortableCard = ({ id, profile, index, attributes }: { id: string, profile: any, index: number, attributes: any[] }) => {
    const { attributes: dndAttributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} className={cn(
            "p-3 bg-white border shadow-sm rounded-lg flex items-center gap-3",
            isDragging && "shadow-lg cursor-grabbing"
        )}>
            <div {...dndAttributes} {...listeners} className="cursor-grab">
                <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            <span className="font-bold text-lg text-primary">#{index + 1}</span>
            <div className="flex-1 text-xs">
                {(attributes || []).map(attr => (
                    <div key={attr.id} className="flex justify-between">
                        <span className="text-muted-foreground">{attr.name}:</span>
                        <span className="font-medium">{profile.attributes?.[attr.name] || '-'}</span>
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
    const { toast } = useToast();
    
    const { 
        attributes = [], 
        sets: numTasks = 5,
        cardsPerSet: profilesPerTask = 4,
        designMethod = 'fractional-factorial',
        allowPartialRanking = false,
        tasks: questionTasks = []
    } = question;

    const [currentTask, setCurrentTask] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const tasks = useMemo(() => {
        if (questionTasks && Array.isArray(questionTasks) && questionTasks.length > 0) {
            return questionTasks;
        }
        return [];
    }, [questionTasks]);

    const currentTaskData = tasks[currentTask] || { taskId: `task_${currentTask}`, profiles: [] };
    const currentTaskProfiles = currentTaskData.profiles || [];
    const currentTaskId = currentTaskData.taskId;

    const rankedItems = useMemo(() => {
        const newProfiles = tasks[currentTask]?.profiles || [];
        if (answer && answer[currentTaskId]) {
            const answerOrder = answer[currentTaskId];
            const sortedProfiles = [...newProfiles].sort((a, b) => {
                const indexA = answerOrder.indexOf(a.id);
                const indexB = answerOrder.indexOf(b.id);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
            return sortedProfiles;
        }
        return newProfiles;
    }, [currentTask, tasks, answer, currentTaskId]);
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }), 
        useSensor(KeyboardSensor, { 
            coordinateGetter: sortableKeyboardCoordinates 
        })
    );

    const handleReorder = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = rankedItems.findIndex(item => item.id === active.id);
            const newIndex = rankedItems.findIndex(item => item.id === over.id);
            
            if (oldIndex === -1 || newIndex === -1) return;
            
            const newOrder = arrayMove(rankedItems, oldIndex, newIndex);
            
            onAnswerChange?.(produce(answer || {}, (draft: any) => {
                draft[currentTaskId] = newOrder.map(item => item.id);
            }));
        }
    };
    
    const isLastTask = currentTask === tasks.length - 1;
    const isTaskAnswered = answer?.[currentTaskId]?.length > 0;

    const handleNextTask = () => {
        if (!allowPartialRanking && rankedItems.length > 0 && !isTaskAnswered) {
            toast({
                variant: "destructive",
                title: "Please rank the items",
                description: "You must rank all items before proceeding."
            });
            return;
        }
        
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
    
    const handlePreviousTask = () => {
        if (currentTask > 0) {
            setCurrentTask(currentTask - 1);
        }
    };
    
    const handleAttributeUpdate = (attrIndex: number, newName: string) => {
        onUpdate?.({ ...question, attributes: produce(attributes, draft => {
            if (draft && draft[attrIndex]) draft[attrIndex].name = newName;
        })});
    };

    const handleLevelUpdate = (attrIndex: number, levelIndex: number, newLevel: string) => {
        onUpdate?.({ ...question, attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].levels[levelIndex] = newLevel;
        })});
    };
    
    const addAttribute = () => {
        onUpdate?.({
            ...question,
            attributes: [...attributes, { 
                id: `attr-${Date.now()}`, 
                name: `Attribute ${attributes.length + 1}`, 
                levels: ['Level 1', 'Level 2'] 
            }]
        });
    };

    const addLevel = (attrIndex: number) => {
        onUpdate?.({ ...question, attributes: produce(attributes, draft => {
            if (draft && draft[attrIndex]) {
                draft[attrIndex].levels.push(`Level ${draft[attrIndex].levels.length + 1}`);
            }
        })});
    };

    const removeAttribute = (attrIndex: number) => {
        onUpdate?.({ ...question, attributes: attributes.filter((_, i) => i !== attrIndex) });
    };

    const removeLevel = (attrIndex: number, levelIndex: number) => {
        if (attributes[attrIndex].levels.length > 1) {
            onUpdate?.({ ...question, attributes: produce(attributes, draft => {
                if (draft && draft[attrIndex]) draft[attrIndex].levels.splice(levelIndex, 1);
            })});
        }
    };

    const totalCombinations = useMemo(() => {
        if (!attributes || attributes.length === 0) return 0;
        return attributes.reduce((acc, attr) => acc * Math.max(1, attr.levels.length), 1);
    }, [attributes]);
    
    const generateProfiles = async () => {
        if (attributes.length === 0) {
            toast({
                variant: 'destructive',
                title: "No Attributes",
                description: "Please add at least one attribute before generating profiles."
            });
            return;
        }
        
        setIsGenerating(true);
        try {
            const response = await fetch('/api/analysis/conjoint-design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributes,
                    designType: 'ranking-conjoint',
                    designMethod,
                    numTasks: designMethod === 'fractional-factorial' ? numTasks : undefined,
                    profilesPerTask: designMethod === 'fractional-factorial' ? profilesPerTask : undefined,
                    allowPartialRanking,
                }),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to generate design');
            }
            
            const result = await response.json();

            if (result.tasks && Array.isArray(result.tasks)) {
                 onUpdate?.({ ...question, tasks: result.tasks, profiles: [] });
            }
            
            setCurrentTask(0);
            onAnswerChange?.({});
            
            toast({
                title: "Tasks Generated",
                description: `${result.tasks?.length || 1} ranking task(s) created successfully.`
            });

        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: "Design Generation Failed",
                description: e.message
            });
        } finally {
            setIsGenerating(false);
        }
    };

    if (isPreview) {
        if (tasks.length === 0) return <div className="p-3 text-sm text-muted-foreground">No ranking tasks generated yet. Please generate profiles first.</div>;
    
        const isFullFactorial = designMethod === 'full-factorial';

        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} 
                 style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">
                        {question.title || `Q${questionNumber}: Ranking Task`}
                        {question.required && <span className="text-destructive ml-1">*</span>}
                    </h3>
                    {!isFullFactorial && (
                        <Badge variant="secondary">
                            Task {currentTask + 1} of {tasks.length}
                        </Badge>
                    )}
                </div>
                
                {question.description && (
                    <p className="text-xs text-muted-foreground mb-3">{question.description}</p>
                )}
                
                <Alert className="mb-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        Drag and drop to rank from most preferred (top) to least preferred (bottom).
                        {allowPartialRanking && " You may rank only your top choices."}
                    </AlertDescription>
                </Alert>
                
                 <div className="space-y-2">
                    {rankedItems.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
                            <SortableContext items={rankedItems.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                {rankedItems.map((profile, index) => (
                                    <SortableCard 
                                        key={profile.id} 
                                        id={profile.id} 
                                        profile={profile} 
                                        index={index} 
                                        attributes={question.attributes || []} 
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">
                            No profiles in this task
                        </div>
                    )}
                </div>
                
                {!isFullFactorial && (
                    <div className="flex justify-between items-center mt-4">
                        <Button 
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousTask}
                            disabled={currentTask === 0}
                        >
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {Object.keys(answer || {}).length} of {tasks.length} completed
                        </span>
                        <Button 
                            size="sm"
                            onClick={handleNextTask}
                        >
                            {isLastTask ? (isLastQuestion ? 'Submit' : 'Next') : 'Next Task'}
                        </Button>
                    </div>
                )}
            </div>
        );
    }
    
    // Editor mode
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
                                        <Button variant="ghost" size="icon" onClick={() => removeLevel(attrIndex, levelIndex)} disabled={attr.levels.length <= 1}><X className="w-4 h-4"/></Button>
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
                    
                     <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                       <div>
                           <Label htmlFor="designMethod">Design Method</Label>
                            <Select 
                                value={designMethod} 
                                onValueChange={(value) => onUpdate?.({...question, designMethod: value as any })}
                            >
                               <SelectTrigger><SelectValue /></SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="full-factorial">Full Factorial</SelectItem>
                                   <SelectItem value="fractional-factorial">Fractional Factorial</SelectItem>
                               </SelectContent>
                           </Select>
                       </div>
                       
                        <div className="p-3 bg-muted rounded-md text-center">
                            <Label>Total Combinations</Label>
                            <p className="text-2xl font-bold">{totalCombinations}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="partial"
                            checked={allowPartialRanking || false}
                            onCheckedChange={(checked) => onUpdate?.({ ...question, allowPartialRanking: !!checked })}
                        />
                        <Label htmlFor="partial" className="text-sm font-normal cursor-pointer">
                            Allow partial ranking
                        </Label>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            {tasks.length > 0 ? 
                                <span className="text-green-600">✓ Generated: {tasks.length} tasks</span> : 
                                'No tasks generated yet'}
                        </p>
                        <Button variant="secondary" size="sm" onClick={generateProfiles} disabled={attributes.length === 0 || isGenerating}>
                            <Zap className="mr-2 h-4 w-4"/>
                            {isGenerating ? 'Generating...' : 'Generate Tasks'}
                        </Button>
                    </div>
                     {(!tasks || tasks.length === 0) && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                You must generate tasks before you can publish the survey.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

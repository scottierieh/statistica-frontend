
'use client';

import { Question, ConjointAttribute } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { produce } from "immer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Zap, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    const { toast } = useToast();
    const { 
        attributes = [], 
        profiles = [], 
        sets: numTasks = 8,
        cardsPerSet = 3,
        designMethod = 'fractional-factorial',
        tasks: questionTasks = []
    } = question;

    const [currentTask, setCurrentTask] = useState(0);
    const [designStats, setDesignStats] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const tasks = useMemo(() => {
        if (questionTasks && Array.isArray(questionTasks) && questionTasks.length > 0) {
            return questionTasks;
        }
        
        if (profiles && profiles.length > 0) {
            const groupedProfiles: { [taskId: string]: any[] } = {};
            profiles.forEach(p => {
                const taskId = p.taskId || 'task_0';
                if (!groupedProfiles[taskId]) {
                    groupedProfiles[taskId] = [];
                }
                groupedProfiles[taskId].push(p);
            });
            
            const sortedTaskIds = Object.keys(groupedProfiles).sort((a, b) => {
                const numA = parseInt(a.replace('task_', ''));
                const numB = parseInt(b.replace('task_', ''));
                return numA - numB;
            });
            
            return sortedTaskIds.map(taskId => ({
                taskId,
                profiles: groupedProfiles[taskId]
            }));
        }
        
        return [];
    }, [questionTasks, profiles]);

    const handleChoice = (profileId: string) => {
        onAnswerChange?.(produce(answer || {}, (draft: any) => { 
            draft[currentTaskId] = profileId; 
        }));
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
    
    const handlePreviousTask = () => {
        if (currentTask > 0) {
            setCurrentTask(currentTask - 1);
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
            attributes: [...attributes, { 
                id: `attr-${Date.now()}`, 
                name: `Attribute ${attributes.length + 1}`, 
                levels: ['Level 1', 'Level 2'] 
            }]
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
        if (attributes[attrIndex].levels.length > 1) {
            onUpdate?.({ attributes: produce(attributes, draft => {
                if (draft) draft[attrIndex].levels.splice(levelIndex, 1);
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
                    designType: question.type,
                    numTasks, // Changed from sets
                    profilesPerTask, // Changed from cardsPerSet
                }),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to generate design');
            }
            
            const result = await response.json();

            if (result.tasks && Array.isArray(result.tasks)) {
                 onUpdate?.({ tasks: result.tasks });
            }
            
            if (result.metadata) {
                setDesignStats(result.metadata);
            }
            
            setCurrentTask(0);
            onAnswerChange?.({});
            
            toast({
                title: "Profiles Generated",
                description: `${result.tasks?.length || numTasks} choice sets created successfully.`
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
    
    const currentTaskId = `task_${currentTask}`;
    const currentTaskProfiles = tasks[currentTask]?.profiles || [];

    if (isPreview) {
        if (tasks.length === 0) return <div className="p-3 text-sm text-muted-foreground">No choice sets generated yet. Please generate profiles first.</div>;
    
        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} 
                 style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-3">{question.title} (Set {currentTask + 1} of {tasks.length}) {question.required && <span className="text-destructive">*</span>}</h3>
                {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
                
                 <RadioGroup value={answer?.[currentTaskId]} onValueChange={(value) => handleChoice(value)}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {currentTaskProfiles.map((profile: any, index: number) => (
                           <Label key={profile.id} htmlFor={`profile-${profile.id}`} className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all", answer?.[currentTaskId] === profile.id ? 'border-primary bg-primary/10' : 'bg-background hover:bg-accent/50')}>
                                <RadioGroupItem value={profile.id} id={`profile-${profile.id}`} className="sr-only"/>
                                <div className="space-y-1">
                                    {(attributes || []).map(attr => (
                                        <div key={attr.id} className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-muted-foreground">{attr.name}:</span>
                                            <span className="font-semibold">{profile.attributes[attr.name]}</span>
                                        </div>
                                    ))}
                                </div>
                            </Label>
                        ))}
                    </div>
                </RadioGroup>
                
                <div className="flex justify-between items-center mt-4">
                    <Button 
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousTask}
                        disabled={currentTask === 0}
                    >
                        Previous
                    </Button>
                     <Button 
                        size="sm"
                        onClick={handleNextTask}
                        disabled={!answer?.[currentTaskId]}
                    >
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
                    
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                         <div>
                            <Label htmlFor="designMethod">Design Method</Label>
                            <Select value={designMethod} onValueChange={(value) => onUpdate?.({ designMethod: value as any })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full-factorial">Full Factorial</SelectItem>
                                    <SelectItem value="fractional-factorial">Fractional Factorial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {designMethod === 'fractional-factorial' && (
                            <>
                                <div>
                                    <Label htmlFor="sets">Number of Sets (Tasks)</Label>
                                    <Input id="sets" type="number" value={numTasks} onChange={e => onUpdate?.({ sets: parseInt(e.target.value) || 1 })} min="1" max="20" />
                                </div>
                                <div>
                                    <Label htmlFor="cardsPerSet">Cards per Set</Label>
                                    <Input id="cardsPerSet" type="number" value={cardsPerSet} onChange={e => onUpdate?.({ cardsPerSet: parseInt(e.target.value) || 1 })} min="2" max="8" />
                                </div>
                            </>
                        )}
                        <div className="p-3 bg-muted rounded-md text-center">
                            <Label>Total Combinations</Label>
                            <p className="text-2xl font-bold">{totalCombinations}</p>
                        </div>
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

                    {tasks.length > 0 && (
                        <div>
                            <h5 className="text-sm font-semibold mb-2">Generated Tasks Preview</h5>
                            <ScrollArea className="h-48 border rounded-md p-2">
                                <div className="space-y-4">
                                    {tasks.map((task: any, taskIndex) => (
                                        <Card key={task.taskId} className="p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <Badge>Task {taskIndex + 1}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {task.profiles.length} profiles
                                                </span>
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-xs">Profile ID</TableHead>
                                                        {attributes.map(a => <TableHead key={a.id} className="text-xs">{a.name}</TableHead>)}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {task.profiles.map((p: any) => (
                                                        <TableRow key={p.id}>
                                                            <TableCell className="text-xs">{p.id}</TableCell>
                                                            {attributes.map(a => <TableCell key={a.id} className="text-xs">{p.attributes?.[a.name] || '-'}</TableCell>)}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


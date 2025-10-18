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
import { PlusCircle, Trash2, Zap, X, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Survey } from '@/entities/Survey';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";


interface ConjointQuestionProps {
    survey: Survey;
    question: Question;
    answer?: { [taskId: string]: string };
    onAnswerChange?: (value: any) => void;
    setSurvey: React.Dispatch<React.SetStateAction<Survey>>;
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
    survey,
    question, 
    answer, 
    onAnswerChange, 
    setSurvey,
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
        sets: numTasks = 8,
        cardsPerSet = 3,
        designMethod = 'd-efficient',
    } = question;

    const [currentTask, setCurrentTask] = useState(0);
    const [designStats, setDesignStats] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const tasks = question.tasks || [];

    const onUpdate = (data: Partial<Question>) => {
        setSurvey(produce((draft: Survey) => {
            const q = draft.questions.find(q => q.id === question.id);
            if (q) {
                Object.assign(q, data);
            }
        }));
    };

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
        onUpdate({ attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].name = newName;
        })});
    };

    const handleLevelUpdate = (attrIndex: number, levelIndex: number, newLevel: string) => {
        onUpdate({ attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].levels[levelIndex] = newLevel;
        })});
    };
    
    const addAttribute = () => {
        onUpdate({
            attributes: [...attributes, { 
                id: `attr-${Date.now()}`, 
                name: `Attribute ${attributes.length + 1}`, 
                levels: ['Level 1', 'Level 2'] 
            }]
        });
    };

    const addLevel = (attrIndex: number) => {
        onUpdate({ attributes: produce(attributes, draft => {
            if (draft) draft[attrIndex].levels.push(`Level ${draft[attrIndex].levels.length + 1}`);
        })});
    };

    const removeAttribute = (attrIndex: number) => {
        onUpdate({ attributes: attributes.filter((_, i) => i !== attrIndex) });
    };

    const removeLevel = (attrIndex: number, levelIndex: number) => {
        if (attributes[attrIndex].levels.length > 1) {
            onUpdate({ attributes: produce(attributes, draft => {
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
                    designType: 'cbc',
                    numTasks,
                    profilesPerTask: cardsPerSet,
                    designMethod,
                }),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to generate design');
            }
            
            const result = await response.json();

            if (result.tasks && Array.isArray(result.tasks)) {
                 onUpdate({ id: question.id, tasks: result.tasks });
            }
            
            if (result.metadata) {
                setDesignStats(result.metadata);
            }
            
            setCurrentTask(0);
            onAnswerChange?.({});
            
            toast({
                title: "Tasks Generated",
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
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">
                        {question.title || `Q${questionNumber}: Choice Task`}
                        {question.required && <span className="text-destructive ml-1">*</span>}
                    </h3>
                    <Badge variant="secondary">
                        Task {currentTask + 1} of {tasks.length}
                    </Badge>
                </div>
                
                {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
                
                 <RadioGroup value={answer?.[currentTaskId]} onValueChange={(value) => handleChoice(value)}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {currentTaskProfiles.map((profile: any) => (
                           <Label key={profile.id} htmlFor={`profile-${profile.id}`} className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all", answer?.[currentTaskId] === profile.id ? 'border-primary bg-primary/10' : 'bg-background hover:bg-accent/50')}>
                                <RadioGroupItem value={profile.id} id={`profile-${profile.id}`} className="sr-only"/>
                                <div className="space-y-1">
                                    {(attributes || []).map(attr => (
                                        <div key={attr.id} className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-muted-foreground">{attr.name}:</span>
                                            <span className="font-semibold">{profile.attributes?.[attr.name]}</span>
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
                     <span className="text-xs text-muted-foreground">
                        {Object.keys(answer || {}).length} of {tasks.length} completed
                    </span>
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
                    onUpdate={(d) => onUpdate?.({ id: question.id, ...d})}
                    onDelete={() => onDelete?.(question.id)}
                    onImageUpload={() => onImageUpload?.(question.id)}
                    onDuplicate={() => onDuplicate?.(question.id)}
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
                    
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                       <div>
                           <Label htmlFor="designMethod">Design Method</Label>
                            <Select 
                                value={designMethod} 
                                onValueChange={(value) => onUpdate?.({ id: question.id, designMethod: value as any })}
                            >
                               <SelectTrigger id="designMethod"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="d-efficient">D-efficient</SelectItem>
                                   <SelectItem value="full-factorial">Full Factorial</SelectItem>
                                   <SelectItem value="orthogonal">Orthogonal</SelectItem>
                                   <SelectItem value="random">Random</SelectItem>
                               </SelectContent>
                           </Select>
                       </div>
                        
                        {['d-efficient', 'orthogonal', 'random'].includes(designMethod) && (
                            <>
                                <div>
                                    <Label htmlFor="sets">Number of Sets (Tasks)</Label>
                                    <Input id="sets" type="number" value={numTasks} onChange={e => onUpdate?.({ id: question.id, sets: parseInt(e.target.value) || 1 })} min="1" max="20" />
                                </div>
                                <div>
                                    <Label htmlFor="cardsPerSet">Cards per Set</Label>
                                    <Input id="cardsPerSet" type="number" value={cardsPerSet} onChange={e => onUpdate?.({ id: question.id, cardsPerSet: parseInt(e.target.value) || 1 })} min="2" max="8" />
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
                            Generated Tasks: {tasks.length}
                        </p>
                        <Button variant="secondary" size="sm" onClick={generateProfiles} disabled={attributes.length === 0 || isGenerating}>
                            <Zap className="mr-2 h-4 w-4"/>
                            {isGenerating ? 'Generating...' : 'Generate Tasks'}
                        </Button>
                    </div>
                     {tasks.length === 0 && (
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

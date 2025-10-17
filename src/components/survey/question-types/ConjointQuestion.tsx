'use client';

import { Question, ConjointAttribute } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { produce } from "immer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Zap, X, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Helper to create profile tasks for rating
const createProfileTasks = (profiles: any[], sets: number, cardsPerSet: number) => {
    const shuffled = [...profiles].sort(() => 0.5 - Math.random());
    const tasks: any[] = [];
    let profileIndex = 0;

    for (let i = 0; i < sets; i++) {
        for (let j = 0; j < cardsPerSet; j++) {
            if (profileIndex >= shuffled.length) profileIndex = 0; // Loop back if not enough profiles
            tasks.push({
                ...shuffled[profileIndex],
                id: `profile_${i}_${j}`,
                taskId: `task_${i}`
            });
            profileIndex++;
        }
    }
    return tasks;
};

// --- Component Code ---
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
    const { attributes = [], profiles = [], sets = 1, cardsPerSet = 3, designMethod = 'fractional-factorial' } = question;
    const [currentTask, setCurrentTask] = useState(0);
    const [designStats, setDesignStats] = useState<any>(null);

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
    
    const totalCombinations = useMemo(() => {
        if (!attributes || attributes.length === 0) return 0;
        return attributes.reduce((acc, attr) => acc * Math.max(1, attr.levels.length), 1);
    }, [attributes]);
    
    if (isPreview) {
        if (tasks.length === 0) return <p>Conjoint profiles are not generated.</p>;
    
        const currentTaskProfiles = tasks[currentTask];
        const taskId = currentTaskProfiles?.[0]?.taskId;

        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-3">{question.title} (Set {currentTask + 1} of {tasks.length}) {question.required && <span className="text-destructive">*</span>}</h3>
                {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
                
                <div className={`grid grid-cols-1 md:grid-cols-${Math.min(currentTaskProfiles.length, 4)} gap-3`}>
                    {(currentTaskProfiles || []).map((profile: any, index: number) => (
                        <Card 
                            key={profile.id} 
                            className={cn(
                                "text-left transition-all overflow-hidden cursor-pointer", 
                                answer?.[taskId] === profile.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md hover:-translate-y-1"
                            )}
                            onClick={() => handleChoice(taskId, profile.id)}
                        >
                            <CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Option {index + 1}</CardTitle></CardHeader>
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

    const handleAttributeUpdate = (attrIndex: number, newName: string) => {
        onUpdate?.({ attributes: produce(attributes, draft => { if(draft) draft[attrIndex].name = newName; }) });
    };

    const handleLevelUpdate = (attrIndex: number, levelIndex: number, newLevel: string) => {
        onUpdate?.({ attributes: produce(attributes, draft => { if(draft) draft[attrIndex].levels[levelIndex] = newLevel; }) });
    };
    
    const addAttribute = () => {
        onUpdate?.({ attributes: [...attributes, { id: `attr-${Date.now()}`, name: `Attribute ${attributes.length + 1}`, levels: ['Level 1'] }] });
    };

    const addLevel = (attrIndex: number) => {
        onUpdate?.({ attributes: produce(attributes, draft => { if(draft) draft[attrIndex].levels.push(`Level ${draft[attrIndex].levels.length + 1}`); }) });
    };

    const removeAttribute = (attrIndex: number) => {
        onUpdate?.({ attributes: attributes.filter((_, i) => i !== attrIndex) });
    };

    const removeLevel = (attrIndex: number, levelIndex: number) => {
        onUpdate?.({ attributes: produce(attributes, draft => { if(draft) draft[attrIndex].levels.splice(levelIndex, 1); }) });
    };

    const generateProfiles = async () => {
        try {
            const response = await fetch('/api/analysis/conjoint-design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributes,
                    design_method: designMethod,
                }),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to generate design');
            }
            
            const result = await response.json();
            
            const newProfiles = createProfileTasks(result.profiles, sets || 1, cardsPerSet || 3);
            onUpdate?.({ profiles: newProfiles });
            
            setDesignStats(result.statistics);
            toast({
                title: "Profiles Generated",
                description: `${result.profiles.length} profiles created using ${designMethod} design.`
            });

        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: "Design Generation Failed",
                description: e.message
            });
        }
    };


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
                    
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="designMethod">Design Method</Label>
                            <Select value={designMethod} onValueChange={(value) => onUpdate?.({ designMethod: value as any })}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full-factorial">Full Factorial</SelectItem>
                                    <SelectItem value="fractional-factorial">Fractional Factorial</SelectItem>
                                    <SelectItem value="orthogonal">Orthogonal Design</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="sets">Number of Sets</Label>
                            <Input id="sets" type="number" value={sets} onChange={e => onUpdate?.({ sets: parseInt(e.target.value) || 1 })} min="1" />
                        </div>
                        <div>
                             <Label htmlFor="cardsPerSet">Cards per Set</Label>
                             <Input id="cardsPerSet" type="number" value={cardsPerSet} onChange={e => onUpdate?.({ cardsPerSet: parseInt(e.target.value) || 1 })} min="2" />
                        </div>
                        <div className="p-3 bg-muted rounded-md text-center">
                            <Label>Total Combinations</Label>
                            <p className="text-2xl font-bold">{totalCombinations}</p>
                        </div>
                    </div>
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                           {designMethod === 'full-factorial' && `Full Factorial: All ${totalCombinations} possible combinations will be generated. Best for small designs.`}
                           {designMethod === 'fractional-factorial' && `Fractional Factorial: Optimal subset using D-optimal algorithm.`}
                           {designMethod === 'orthogonal' && `Orthogonal Design: Uses standard arrays (L4, L8, etc.). Ensures statistical independence between attributes.`}
                        </AlertDescription>
                    </Alert>

                     {designStats && (
                        <div className="grid grid-cols-3 gap-2 text-center">
                           <Card className="p-2 bg-blue-50"><CardTitle className="text-sm">Generated</CardTitle><p className="font-bold text-blue-700 text-lg">{designStats.totalProfiles}</p></Card>
                           <Card className="p-2 bg-green-50"><CardTitle className="text-sm">Balance</CardTitle><p className="font-bold text-green-700 text-lg">{designStats.balance}%</p></Card>
                           <Card className="p-2 bg-purple-50"><CardTitle className="text-sm">Orthogonality</CardTitle><p className="font-bold text-purple-700 text-lg">{designStats.orthogonality}%</p></Card>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Generated Profiles: {profiles.length}</p>
                        <Button variant="secondary" size="sm" onClick={generateProfiles}><Zap className="mr-2 h-4 w-4"/>Generate Profiles</Button>
                    </div>
                     <ScrollArea className="h-48 border rounded-md p-2">
                        <Table>
                            <TableHeader><TableRow><TableHead className="text-xs">Profile ID</TableHead><TableHead className="text-xs">Task ID</TableHead>{attributes.map(a => <TableHead key={a.id} className="text-xs">{a.name}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>
                                {(profiles || []).map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="text-xs">{p.id}</TableCell>
                                        <TableCell className="text-xs">{p.taskId}</TableCell>
                                        {attributes.map(a => <TableCell key={a.id} className="text-xs">{p.attributes[a.name]}</TableCell>)}
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

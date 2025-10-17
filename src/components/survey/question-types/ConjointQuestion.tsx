

'use client';

import { Question, ConjointAttribute } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { produce } from "immer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Zap, X, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";


class ConjointDesignGenerator {
    static generateFullFactorial(attributes: ConjointAttribute[]) {
        if (!attributes || attributes.length === 0) return [];
        
        const levels = attributes.map(attr => attr.levels);
        if (levels.some(l => l.length === 0)) return [];

        let combinations: any[] = [{}];
        
        attributes.forEach(attr => {
            const newCombinations: any[] = [];
            combinations.forEach(existingCombo => {
                attr.levels.forEach(level => {
                    newCombinations.push({ 
                        ...existingCombo, 
                        [attr.name]: level 
                    });
                });
            });
            combinations = newCombinations;
        });

        return combinations.map((combo, index) => ({
            id: `profile_${index + 1}`,
            attributes: combo
        }));
    }

    static generateFractionalFactorial(attributes: ConjointAttribute[]) {
        if (!attributes || attributes.length === 0) return [];
        
        const fullDesign = this.generateFullFactorial(attributes);
        const targetSize = this.calculateOptimalProfileCount(attributes);
        
        return this.selectDOptimalProfiles(fullDesign, targetSize, attributes);
    }

    static calculateOptimalProfileCount(attributes: ConjointAttribute[]) {
        const totalLevels = attributes.reduce((sum, attr) => sum + attr.levels.length, 0);
        const minProfiles = totalLevels - attributes.length + 1;
        return Math.min(Math.max(minProfiles * 2, 16), 32);
    }

    static selectDOptimalProfiles(fullDesign: any[], targetSize: number, attributes: ConjointAttribute[]) {
        if (fullDesign.length <= targetSize) return fullDesign;
        
        const selected: any[] = [];
        const remaining = [...fullDesign];
        
        const firstIndex = Math.floor(Math.random() * remaining.length);
        selected.push(remaining[firstIndex]);
        remaining.splice(firstIndex, 1);
        
        while (selected.length < targetSize && remaining.length > 0) {
            let bestProfile = null;
            let bestScore = -Infinity;
            
            for (const profile of remaining) {
                const tempSelected = [...selected, profile];
                const score = this.calculateDesignBalance(tempSelected, attributes);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestProfile = profile;
                }
            }
            
            if (bestProfile) {
                selected.push(bestProfile);
                remaining.splice(remaining.indexOf(bestProfile), 1);
            }
        }
        
        return selected;
    }

    static calculateDesignBalance(profiles: any[], attributes: ConjointAttribute[]) {
        let balanceScore = 0;
        
        for (const attr of attributes) {
            const levelCounts: { [key: string]: number } = {};
            attr.levels.forEach(level => { levelCounts[level] = 0; });
            
            profiles.forEach(profile => {
                const level = profile.attributes[attr.name];
                if (level) levelCounts[level]++;
            });
            
            const counts = Object.values(levelCounts);
            const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
            const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
            
            balanceScore -= variance;
        }
        
        return balanceScore;
    }

    static generateOrthogonalDesign(attributes: ConjointAttribute[]) {
        const orthogonalArray = this.selectOrthogonalArray(attributes);
        
        if (!orthogonalArray) {
            return this.generateFractionalFactorial(attributes);
        }
        
        return this.mapOrthogonalArrayToProfiles(orthogonalArray, attributes);
    }

    static selectOrthogonalArray(attributes: ConjointAttribute[]) {
        const numFactors = attributes.length;
        const maxLevels = Math.max(...attributes.map(a => a.levels.length));
        
        const arrays: { [key: string]: any } = {
            'L4_2_3': { suitable: numFactors <= 3 && maxLevels <= 2, runs: 4, array: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]] },
            'L8_2_7': { suitable: numFactors <= 7 && maxLevels <= 2, runs: 8, array: [[0,0,0,0,0,0,0],[0,0,0,1,1,1,1],[0,1,1,0,0,1,1],[0,1,1,1,1,0,0],[1,0,1,0,1,0,1],[1,0,1,1,0,1,0],[1,1,0,0,1,1,0],[1,1,0,1,0,0,1]] },
            'L9_3_4': { suitable: numFactors <= 4 && maxLevels <= 3, runs: 9, array: [[0,0,0,0],[0,1,1,1],[0,2,2,2],[1,0,1,2],[1,1,2,0],[1,2,0,1],[2,0,2,1],[2,1,0,2],[2,2,1,0]] },
        };
        
        let selectedArray = null;
        let minRuns = Infinity;
        
        for (const [key, arrayDef] of Object.entries(arrays)) {
            if (arrayDef.suitable && arrayDef.runs < minRuns) {
                selectedArray = arrayDef;
                minRuns = arrayDef.runs;
            }
        }
        
        return selectedArray;
    }

    static mapOrthogonalArrayToProfiles(orthogonalArray: any, attributes: ConjointAttribute[]) {
        const profiles = [];
        
        for (let run = 0; run < orthogonalArray.runs; run++) {
            const profile: any = {
                id: `profile_${run + 1}`,
                attributes: {}
            };
            
            for (let factor = 0; factor < attributes.length; factor++) {
                const attr = attributes[factor];
                const levelIndex = orthogonalArray.array[run][factor] % attr.levels.length;
                profile.attributes[attr.name] = attr.levels[levelIndex];
            }
            
            profiles.push(profile);
        }
        
        return profiles;
    }

    static calculateDesignStatistics(profiles: any[], attributes: ConjointAttribute[]) {
        const totalCombinations = attributes.reduce((acc, attr) => acc * attr.levels.length, 1);
        const balance = this.checkBalance(profiles, attributes);
        const orthogonality = this.checkOrthogonality(profiles, attributes);
        
        return {
            totalProfiles: profiles.length,
            totalPossibleCombinations: totalCombinations,
            reductionRatio: ((1 - profiles.length / totalCombinations) * 100).toFixed(1),
            balance: (balance * 100).toFixed(1),
            orthogonality: (orthogonality * 100).toFixed(1)
        };
    }

    static checkOrthogonality(profiles: any[], attributes: ConjointAttribute[]) {
        if (attributes.length < 2) return 1;
        let totalOrthogonality = 0;
        let pairCount = 0;
        
        for (let i = 0; i < attributes.length - 1; i++) {
            for (let j = i + 1; j < attributes.length; j++) {
                const correlation = this.calculateCorrelation(profiles, attributes[i], attributes[j]);
                totalOrthogonality += 1 - Math.abs(correlation);
                pairCount++;
            }
        }
        return totalOrthogonality / pairCount;
    }

    static calculateCorrelation(profiles: any[], attr1: ConjointAttribute, attr2: ConjointAttribute) {
        const contingencyTable: { [key: string]: { [key: string]: number } } = {};
        
        attr1.levels.forEach(l1 => {
            contingencyTable[l1] = {};
            attr2.levels.forEach(l2 => { contingencyTable[l1][l2] = 0; });
        });
        
        profiles.forEach(profile => {
            const l1 = profile.attributes[attr1.name];
            const l2 = profile.attributes[attr2.name];
            if (l1 && l2) contingencyTable[l1][l2]++;
        });
        
        let chiSquare = 0;
        const n = profiles.length;
        
        attr1.levels.forEach(l1 => {
            attr2.levels.forEach(l2 => {
                const observed = contingencyTable[l1][l2];
                const expected = n / (attr1.levels.length * attr2.levels.length);
                if (expected > 0) {
                    chiSquare += Math.pow(observed - expected, 2) / expected;
                }
            });
        });
        
        const minDim = Math.min(attr1.levels.length - 1, attr2.levels.length - 1);
        return Math.sqrt(chiSquare / (n * minDim));
    }
}

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
    const { attributes = [], profiles = [], sets = 1, cardsPerSet = 3, designMethod = 'fractional' } = question;
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
                            className={cn("text-left transition-all overflow-hidden cursor-pointer", answer?.[taskId] === profile.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md hover:-translate-y-1")}
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
                                    <RadioGroup value={answer?.[taskId]}><RadioGroupItem value={profile.id} id={`q${question.id}-${profile.id}`} /></RadioGroup>
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

    const generateProfiles = () => {
        let generatedProfiles: any[] = [];
        
        switch (designMethod) {
            case 'full-factorial':
                generatedProfiles = ConjointDesignGenerator.generateFullFactorial(attributes);
                break;
            case 'fractional-factorial':
                generatedProfiles = ConjointDesignGenerator.generateFractionalFactorial(attributes);
                break;
            case 'orthogonal':
                generatedProfiles = ConjointDesignGenerator.generateOrthogonalDesign(attributes);
                break;
        }
        
        const newProfiles = createProfileTasks(generatedProfiles, sets || 1, cardsPerSet || 3);
        onUpdate?.({ profiles: newProfiles });
        
        const stats = ConjointDesignGenerator.calculateDesignStatistics(generatedProfiles, attributes);
        setDesignStats(stats);
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
                                    <SelectItem value="orthogonal">Orthogonal</SelectItem>
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
                           {designMethod === 'full-factorial' && `Full Factorial: All ${totalCombinations} combinations. Best for small designs.`}
                           {designMethod === 'fractional-factorial' && `Fractional Factorial: Optimal subset using D-optimal algorithm.`}
                           {designMethod === 'orthogonal' && `Orthogonal Design: Uses standard arrays (L4, L8, etc.).`}
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
                            <TableHeader><TableRow><TableHead className="text-xs">Profile</TableHead><TableHead className="text-xs">Task</TableHead>{attributes.map(a => <TableHead key={a.id} className="text-xs">{a.name}</TableHead>)}</TableRow></TableHeader>
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

'use client';

import { Question, ConjointAttribute } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { produce } from "immer";
import { PlusCircle, Trash2, Zap, X, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Conjoint Design Generator Class
class ConjointDesignGenerator {
    // Generate Full Factorial Design
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

    // Generate Fractional Factorial Design using D-optimal algorithm
    static generateFractionalFactorial(attributes: ConjointAttribute[]) {
        if (!attributes || attributes.length === 0) return [];
        
        const fullDesign = this.generateFullFactorial(attributes);
        const targetSize = this.calculateOptimalProfileCount(attributes);
        
        return this.selectDOptimalProfiles(fullDesign, targetSize, attributes);
    }

    // Calculate optimal number of profiles for fractional design
    static calculateOptimalProfileCount(attributes: ConjointAttribute[]) {
        const totalLevels = attributes.reduce((sum, attr) => sum + attr.levels.length, 0);
        const minProfiles = totalLevels - attributes.length + 1;
        // Use 2x minimum for better estimation, max 32 for practical reasons
        return Math.min(Math.max(minProfiles * 2, 16), 32);
    }

    // D-Optimal selection algorithm
    static selectDOptimalProfiles(fullDesign: any[], targetSize: number, attributes: ConjointAttribute[]) {
        if (fullDesign.length <= targetSize) return fullDesign;
        
        const selected: any[] = [];
        const remaining = [...fullDesign];
        
        // Select first profile randomly
        const firstIndex = Math.floor(Math.random() * remaining.length);
        selected.push(remaining[firstIndex]);
        remaining.splice(firstIndex, 1);
        
        // Iteratively select profiles that maximize D-efficiency
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

    // Calculate design balance score
    static calculateDesignBalance(profiles: any[], attributes: ConjointAttribute[]) {
        let balanceScore = 0;
        
        for (const attr of attributes) {
            const levelCounts: { [key: string]: number } = {};
            attr.levels.forEach(level => { levelCounts[level] = 0; });
            
            profiles.forEach(profile => {
                const level = profile.attributes[attr.name];
                if (level) levelCounts[level]++;
            });
            
            // Calculate variance in level frequencies
            const counts = Object.values(levelCounts);
            const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
            const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
            
            // Lower variance = better balance
            balanceScore -= variance;
        }
        
        return balanceScore;
    }

    // Generate Orthogonal Design
    static generateOrthogonalDesign(attributes: ConjointAttribute[]) {
        const orthogonalArray = this.selectOrthogonalArray(attributes);
        
        if (!orthogonalArray) {
            // Fallback to fractional factorial if no suitable array
            return this.generateFractionalFactorial(attributes);
        }
        
        return this.mapOrthogonalArrayToProfiles(orthogonalArray, attributes);
    }

    // Select appropriate orthogonal array
    static selectOrthogonalArray(attributes: ConjointAttribute[]) {
        const numFactors = attributes.length;
        const maxLevels = Math.max(...attributes.map(a => a.levels.length));
        
        // Orthogonal array library
        const arrays: { [key: string]: any } = {
            'L4_2_3': { // 4 runs, 3 factors at 2 levels
                suitable: numFactors <= 3 && maxLevels <= 2,
                runs: 4,
                array: [
                    [0, 0, 0],
                    [0, 1, 1],
                    [1, 0, 1],
                    [1, 1, 0]
                ]
            },
            'L8_2_7': { // 8 runs, 7 factors at 2 levels
                suitable: numFactors <= 7 && maxLevels <= 2,
                runs: 8,
                array: [
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 1, 1, 1, 1],
                    [0, 1, 1, 0, 0, 1, 1],
                    [0, 1, 1, 1, 1, 0, 0],
                    [1, 0, 1, 0, 1, 0, 1],
                    [1, 0, 1, 1, 0, 1, 0],
                    [1, 1, 0, 0, 1, 1, 0],
                    [1, 1, 0, 1, 0, 0, 1]
                ]
            },
            'L9_3_4': { // 9 runs, 4 factors at 3 levels
                suitable: numFactors <= 4 && maxLevels <= 3,
                runs: 9,
                array: [
                    [0, 0, 0, 0],
                    [0, 1, 1, 1],
                    [0, 2, 2, 2],
                    [1, 0, 1, 2],
                    [1, 1, 2, 0],
                    [1, 2, 0, 1],
                    [2, 0, 2, 1],
                    [2, 1, 0, 2],
                    [2, 2, 1, 0]
                ]
            },
            'L16_2_15': { // 16 runs, 15 factors at 2 levels
                suitable: numFactors <= 15 && maxLevels <= 2,
                runs: 16,
                array: this.generateL16Array()
            },
            'L18_3_7': { // 18 runs, 7 factors at 3 levels
                suitable: numFactors <= 7 && maxLevels <= 3,
                runs: 18,
                array: [
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1],
                    [0, 2, 2, 2, 2, 2, 2],
                    [1, 0, 0, 1, 1, 2, 2],
                    [1, 1, 1, 2, 2, 0, 0],
                    [1, 2, 2, 0, 0, 1, 1],
                    [2, 0, 1, 0, 2, 1, 2],
                    [2, 1, 2, 1, 0, 2, 0],
                    [2, 2, 0, 2, 1, 0, 1],
                    [0, 0, 2, 1, 2, 0, 1],
                    [0, 1, 0, 2, 0, 1, 2],
                    [0, 2, 1, 0, 1, 2, 0],
                    [1, 0, 2, 2, 1, 1, 0],
                    [1, 1, 0, 0, 2, 2, 1],
                    [1, 2, 1, 1, 0, 0, 2],
                    [2, 0, 1, 2, 0, 2, 1],
                    [2, 1, 2, 0, 1, 0, 2],
                    [2, 2, 0, 1, 2, 1, 0]
                ]
            },
            'L27_3_13': { // 27 runs, 13 factors at 3 levels
                suitable: numFactors <= 13 && maxLevels <= 3,
                runs: 27,
                array: this.generateL27Array()
            }
        };
        
        // Find the smallest suitable array
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

    // Generate L16 Hadamard matrix
    static generateL16Array() {
        const L16 = [];
        for (let i = 0; i < 16; i++) {
            const row = [];
            for (let j = 0; j < 15; j++) {
                const bit = ((i >> (j % 4)) & 1);
                row.push(bit);
            }
            L16.push(row);
        }
        return L16;
    }

    // Generate L27 array for 3-level factors
    static generateL27Array() {
        const L27 = [];
        for (let i = 0; i < 27; i++) {
            const row = [];
            let temp = i;
            for (let j = 0; j < 13; j++) {
                row.push(temp % 3);
                temp = Math.floor(temp / 3);
            }
            L27.push(row);
        }
        return L27;
    }

    // Map orthogonal array to profiles
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

    // Calculate design statistics
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

    // Check balance of the design
    static checkBalance(profiles: any[], attributes: ConjointAttribute[]) {
        let totalBalance = 0;
        let attrCount = 0;
        
        for (const attr of attributes) {
            const levelCounts: { [key: string]: number } = {};
            attr.levels.forEach(level => { levelCounts[level] = 0; });
            
            profiles.forEach(profile => {
                const level = profile.attributes[attr.name];
                if (level) levelCounts[level]++;
            });
            
            const counts = Object.values(levelCounts);
            const expectedCount = profiles.length / attr.levels.length;
            const maxDeviation = Math.max(...counts.map(c => Math.abs(c - expectedCount)));
            
            totalBalance += 1 - (maxDeviation / profiles.length);
            attrCount++;
        }
        
        return totalBalance / attrCount;
    }

    // Check orthogonality between attributes
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

    // Calculate correlation between two attributes
    static calculateCorrelation(profiles: any[], attr1: ConjointAttribute, attr2: ConjointAttribute) {
        const contingencyTable: { [key: string]: { [key: string]: number } } = {};
        
        attr1.levels.forEach(l1 => {
            contingencyTable[l1] = {};
            attr2.levels.forEach(l2 => {
                contingencyTable[l1][l2] = 0;
            });
        });
        
        profiles.forEach(profile => {
            const l1 = profile.attributes[attr1.name];
            const l2 = profile.attributes[attr2.name];
            if (l1 && l2) contingencyTable[l1][l2]++;
        });
        
        // Calculate Cramér's V
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

// Helper to create profile tasks for rating
const createProfileTasks = (profiles: any[], sets: number) => {
    const shuffled = [...profiles].sort(() => 0.5 - Math.random());
    const cardsPerSet = Math.ceil(shuffled.length / sets);
    
    const tasks: any[] = [];
    for (let i = 0; i < sets; i++) {
        const taskProfiles = shuffled.slice(i * cardsPerSet, (i + 1) * cardsPerSet);
        taskProfiles.forEach((profile, profileIndex) => {
            tasks.push({
                ...profile,
                id: `profile_${i}_${profileIndex}`,
                taskId: `task_${i}`
            });
        });
    }
    return tasks;
};

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
    const { attributes = [], profiles = [], sets = 1 } = question;
    const [currentTask, setCurrentTask] = useState(0);
    const [designType, setDesignType] = useState<'full' | 'fractional' | 'orthogonal'>('fractional');
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
    
    const handleRatingChange = (profileId: string, value: string) => {
        const rating = parseInt(value, 10);
        if (rating >= 1 && rating <= 10) {
            onAnswerChange?.(produce(answer || {}, (draft: any) => { 
                draft[profileId] = rating; 
            }));
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

    const generateProfiles = () => {
        let generatedProfiles: any[] = [];
        
        switch (designType) {
            case 'full':
                generatedProfiles = ConjointDesignGenerator.generateFullFactorial(attributes);
                break;
            case 'fractional':
                generatedProfiles = ConjointDesignGenerator.generateFractionalFactorial(attributes);
                break;
            case 'orthogonal':
                generatedProfiles = ConjointDesignGenerator.generateOrthogonalDesign(attributes);
                break;
        }
        
        const newProfiles = createProfileTasks(generatedProfiles, sets || 1);
        onUpdate?.({ profiles: newProfiles });
        
        // Calculate and display statistics
        const stats = ConjointDesignGenerator.calculateDesignStatistics(generatedProfiles, attributes);
        setDesignStats(stats);
    };

    if (isPreview) {
        if (tasks.length === 0) return <div className="p-3 text-sm">Conjoint profiles not generated.</div>;
    
        const currentTaskProfiles = tasks[currentTask];
        const isLastTask = currentTask === tasks.length - 1;

        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} 
                 style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-3">
                    {question.title} (Set {currentTask + 1} of {tasks.length}) 
                    {question.required && <span className="text-destructive">*</span>}
                </h3>
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
                
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold text-sm">Conjoint Attributes</h4>
                    {attributes.map((attr, attrIndex) => (
                        <Card key={attr.id} className="p-3 bg-slate-50">
                            <div className="flex items-center gap-2 mb-2">
                                <Input 
                                    value={attr.name} 
                                    onChange={e => handleAttributeUpdate(attrIndex, e.target.value)} 
                                    className="font-semibold"
                                />
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removeAttribute(attrIndex)}
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </div>
                            <div className="pl-4 space-y-1">
                                {attr.levels.map((level, levelIndex) => (
                                    <div key={levelIndex} className="flex items-center gap-2">
                                        <Input 
                                            value={level} 
                                            onChange={e => handleLevelUpdate(attrIndex, levelIndex, e.target.value)} 
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeLevel(attrIndex, levelIndex)}
                                            disabled={attr.levels.length <= 1}
                                        >
                                            <X className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="link" size="sm" onClick={() => addLevel(attrIndex)}>
                                    <PlusCircle className="mr-2"/>Add Level
                                </Button>
                            </div>
                        </Card>
                    ))}
                    <Button variant="outline" size="sm" onClick={addAttribute}>
                        <PlusCircle className="mr-2"/>Add Attribute
                    </Button>
                </div>

                <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-sm">Design & Profiles</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="designType">Design Type</Label>
                            <Select value={designType} onValueChange={(value: any) => setDesignType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full">Full Factorial</SelectItem>
                                    <SelectItem value="fractional">Fractional Factorial</SelectItem>
                                    <SelectItem value="orthogonal">Orthogonal Design</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="sets">Number of Sets (Tasks)</Label>
                            <Input 
                                id="sets" 
                                type="number" 
                                value={sets} 
                                onChange={e => onUpdate?.({ sets: parseInt(e.target.value) || 1 })} 
                                min="1" 
                            />
                        </div>
                    </div>

                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            {designType === 'full' && 
                                `Full Factorial: All ${totalCombinations} possible combinations will be generated. Best for small designs.`}
                            {designType === 'fractional' && 
                                `Fractional Factorial: Optimal subset using D-optimal algorithm. Balances statistical efficiency with practicality.`}
                            {designType === 'orthogonal' && 
                                `Orthogonal Design: Uses standard orthogonal arrays (L4, L8, L9, etc.). Ensures statistical independence between attributes.`}
                        </AlertDescription>
                    </Alert>

                    {designStats && (
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="p-3 bg-blue-50">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-700">{designStats.totalProfiles}</p>
                                    <p className="text-xs text-blue-600">Generated Profiles</p>
                                </div>
                            </Card>
                            <Card className="p-3 bg-green-50">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-700">{designStats.balance}%</p>
                                    <p className="text-xs text-green-600">Balance Score</p>
                                </div>
                            </Card>
                            <Card className="p-3 bg-purple-50">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-700">{designStats.orthogonality}%</p>
                                    <p className="text-xs text-purple-600">Orthogonality</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Total Possible: {totalCombinations} | Generated: {profiles.length}
                            </p>
                            {designStats && designStats.reductionRatio && (
                                <p className="text-xs text-green-600">
                                    {designStats.reductionRatio}% reduction from full factorial
                                </p>
                            )}
                        </div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={generateProfiles}
                            disabled={attributes.length === 0}
                        >
                            <Zap className="mr-2 h-4 w-4"/>Generate Profiles
                        </Button>
                    </div>

                    <ScrollArea className="h-48 border rounded-md p-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Profile ID</TableHead>
                                    <TableHead className="text-xs">Task ID</TableHead>
                                    {attributes.map(a => (
                                        <TableHead key={a.id} className="text-xs">{a.name}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(profiles || []).map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="text-xs">{p.id}</TableCell>
                                        <TableCell className="text-xs">{p.taskId}</TableCell>
                                        {attributes.map(a => (
                                            <TableCell key={a.id} className="text-xs">
                                                {p.attributes[a.name]}
                                            </TableCell>
                                        ))}
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

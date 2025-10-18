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
import { PlusCircle, Trash2, Zap, X, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
    const { toast } = useToast();
    const { 
        attributes = [], 
        profiles = [], 
        designMethod = 'fractional-factorial',
    } = question;
    const [designStats, setDesignStats] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleRatingChange = (profileId: string, value: string) => {
        const rating = parseInt(value, 10);
        if (rating >= 1 && rating <= 10) {
            onAnswerChange?.(produce(answer || {}, (draft: any) => { 
                draft[profileId] = rating; 
            }));
        }
    };
    
    const isLastTask = true; // Rating conjoint is always a single "task"

    const handleNextTask = () => {
        if (isLastQuestion && submitSurvey) {
            submitSurvey();
        } else if(onNextTask) {
            onNextTask();
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
                    designType: 'rating-conjoint',
                    designMethod: designMethod,
                }),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to generate design');
            }
            
            const result = await response.json();
            
            if (result.profiles) {
                onUpdate?.({ profiles: result.profiles });
            }
            
            if (result.metadata) {
                setDesignStats(result.metadata);
            }
            
            onAnswerChange?.({});
            
            toast({
                title: "Profiles Generated",
                description: `${result.profiles?.length || 0} profiles created successfully.`
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
        if (profiles.length === 0) return <div className="p-3 text-sm text-muted-foreground">No rating profiles generated yet. Please generate profiles first.</div>;
    
        return (
            <div className={cn("p-3 rounded-lg", styles.questionBackground === 'transparent' ? 'bg-transparent' : 'bg-background')} 
                 style={{ marginBottom: styles.questionSpacing, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-3">{question.title} {question.required && <span className="text-destructive">*</span>}</h3>
                {question.description && <p className="text-xs text-muted-foreground mb-3">{question.description}</p>}
                
                <div className="space-y-3">
                    {profiles.map((profile: any) => (
                        <Card key={profile.id}>
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="space-y-1 text-xs">
                                     {(attributes || []).map(attr => (
                                        <div key={attr.id} className="flex items-center gap-2">
                                            <span className="font-medium text-muted-foreground w-16">{attr.name}:</span>
                                            <span className="font-semibold">{profile.attributes[attr.name]}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="w-24">
                                     <Input
                                        type="number"
                                        min="1"
                                        max="10"
                                        placeholder="1-10"
                                        value={answer?.[profile.id] || ''}
                                        onChange={(e) => handleRatingChange(profile.id, e.target.value)}
                                        className="h-8 text-center text-sm"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                
                 <div className="text-right mt-4">
                    <Button onClick={handleNextTask}>
                        {isLastQuestion ? 'Submit' : 'Next'}
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
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="designMethod">Design Method</Label>
                            <Select value={designMethod} onValueChange={(value: any) => onUpdate?.({ designMethod: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full-factorial">Full Factorial</SelectItem>
                                    <SelectItem value="fractional-factorial">Fractional Factorial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-3 bg-muted rounded-md text-center">
                            <Label>Total Possible Combinations</Label>
                            <p className="text-2xl font-bold">{totalCombinations}</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            Generated Profiles: {profiles.length}
                        </p>
                        <Button variant="secondary" size="sm" onClick={generateProfiles} disabled={attributes.length === 0 || isGenerating}>
                            <Zap className="mr-2 h-4 w-4"/>
                            {isGenerating ? 'Generating...' : 'Generate Profiles'}
                        </Button>
                    </div>

                    <ScrollArea className="h-48 border rounded-md p-2">
                        <Table>
                            <TableHeader><TableRow><TableHead>Profile ID</TableHead>{attributes.map(a => <TableHead key={a.id}>{a.name}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>
                                {(profiles || []).map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.id}</TableCell>
                                        {attributes.map(a => <TableCell key={a.id}>{p.attributes?.[a.name] || '-'}</TableCell>)}
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

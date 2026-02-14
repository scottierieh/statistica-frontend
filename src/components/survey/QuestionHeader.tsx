
'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GripVertical, Info, ImageIcon, X, Copy, Trash2, GitBranch, Shuffle } from "lucide-react";
import Image from 'next/image';
import type { Question, SkipLogic } from '@/entities/Survey';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface QuestionHeaderProps {
    question: Question;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onLogicEdit?: (id: string) => void;
    styles: any;
    questionNumber: number;
}

export default function QuestionHeader({ 
    question, 
    onUpdate, 
    onDelete, 
    onImageUpload, 
    onDuplicate,
    onLogicEdit,
    styles,
    questionNumber
}: QuestionHeaderProps) {
    const questionStyle = { 
        fontSize: `${styles.questionTextSize}px`,
    };

    const logicEnabledTypes = ['single', 'multiple', 'dropdown', 'nps', 'rating', 'likert'];
    const randomizeEnabledTypes = ['single', 'multiple', 'dropdown', 'best-worst'];


    return (
        <div className="space-y-3">
            <Badge 
                variant="secondary" 
                className="absolute -top-3 -left-3 z-10 font-mono"
            >
                Q{questionNumber}
            </Badge>
            
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                    <Input 
                        placeholder="Enter your question" 
                        value={question.title} 
                        onChange={(e) => onUpdate?.({...question, title: e.target.value})} 
                        className="text-lg font-semibold border-none focus-visible:ring-0 p-0 h-auto bg-transparent" 
                        style={questionStyle}
                    />
                    {question.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                </div>
                
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onDuplicate?.(question.id)}
                        title="Duplicate"
                    >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onImageUpload?.(question.id)}
                        title="Add image"
                    >
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </Button>

                    {logicEnabledTypes.includes(question.type) && (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onLogicEdit?.(question.id)}
                            title="Edit Logic"
                        >
                            <GitBranch className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    )}
                    
                    
                    <div className="flex items-center gap-2 px-2">
                        <Switch 
                            id={`required-${question.id}`} 
                            checked={question.required} 
                            onCheckedChange={(checked) => onUpdate?.({...question, required: checked})} 
                        />
                        <Label 
                            htmlFor={`required-${question.id}`} 
                            className="text-xs cursor-pointer"
                        >
                            Required
                        </Label>
                    </div>
                    
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete?.(question.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            
            {question.imageUrl && (
                <div className="relative group">
                    <Image 
                        src={question.imageUrl} 
                        alt="Question image" 
                        width={400} 
                        height={300} 
                        className="rounded-lg max-h-60 w-auto object-contain border" 
                    />
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onUpdate?.({...question, imageUrl: undefined})}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
             {randomizeEnabledTypes.includes(question.type) && (
                <div className="flex items-center space-x-2 pt-2">
                    <Switch id={`randomize-${question.id}`} checked={question.randomizeOptions} onCheckedChange={(checked) => onUpdate?.({...question, randomizeOptions: checked})}/>
                    <Label htmlFor={`randomize-${question.id}`} className="text-sm flex items-center gap-2">
                        <Shuffle className="w-3 h-3"/> Randomize Options
                    </Label>
                </div>
            )}
        </div>
    );
}

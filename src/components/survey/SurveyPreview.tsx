
'use client';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

interface SurveyPreviewProps {
    styles: any;
}

export default function SurveyPreview({ styles }: SurveyPreviewProps) {
    const [view, setView] = useState<'desktop' | 'mobile'>('desktop');

    const questionStyle = {
        fontSize: `${styles.questionTextSize}px`,
        color: styles.primaryColor,
    };
    
    const choiceStyle = {
        fontSize: `${styles.answerTextSize}px`,
    };

    const spacingClasses = {
        Compact: 'space-y-2',
        Comfortable: 'space-y-3',
        Spacious: 'space-y-4'
    };

    return (
        <Card className="h-full">
            <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Preview</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant={view === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('desktop')}><Monitor/></Button>
                    <Button variant={view === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('mobile')}><Smartphone/></Button>
                </div>
            </CardHeader>
            <CardContent className="bg-muted h-[calc(100%-78px)] flex items-center justify-center">
                <div 
                    className={cn(
                        "bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300",
                        view === 'desktop' ? 'w-full max-w-2xl' : 'w-[375px] h-[667px]'
                    )}
                >
                    <div className="p-8">
                        <h2 style={questionStyle} className="font-bold text-center mb-6">Click to write the question text</h2>
                        <RadioGroup defaultValue="choice2" className={cn(spacingClasses[styles.questionSpacing as keyof typeof spacingClasses])}>
                            <Label style={choiceStyle} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 cursor-pointer">
                                <RadioGroupItem value="choice1" />
                                <span className="flex-1">Click to write Choice 1</span>
                            </Label>
                            <Label style={choiceStyle} className="flex items-center space-x-3 p-3 rounded-lg border-2 border-primary bg-primary/10 cursor-pointer">
                                <RadioGroupItem value="choice2" />
                                <span className="flex-1">Click to write Choice 2</span>
                            </Label>
                            <Label style={choiceStyle} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 cursor-pointer">
                                <RadioGroupItem value="choice3" />
                                <span className="flex-1">Click to write Choice 3</span>
                            </Label>
                        </RadioGroup>
                         <div className="flex justify-end mt-8">
                            <Button style={{ backgroundColor: styles.primaryColor }}>Submit</Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


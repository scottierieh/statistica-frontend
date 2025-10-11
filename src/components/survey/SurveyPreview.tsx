

'use client';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "../ui/label";
import { Question } from "@/entities/Survey";
import { cn } from "@/lib/utils";
import React from "react";
import SurveyView from "../survey-view";

const AHPQuestionPreview = ({ question, styles }: { question: Question; styles: any }) => {

    const PairwiseComparison = ({ pair, matrixKey }: { pair: [string, string], matrixKey: string }) => {
        const value = 1; // Example value for preview

        return (
            <div className="p-6 rounded-lg border bg-white mb-4 shadow-sm">
                <div className="relative flex flex-col items-center justify-between gap-4">
                    <div className="flex w-full justify-between font-bold">
                        <span className="text-left w-1/3 text-primary" style={{ color: styles.primaryColor }}>{pair[0]}</span>
                        <span className="text-center w-1/3 text-muted-foreground">vs</span>
                        <span className="text-right w-1/3 text-primary" style={{ color: styles.primaryColor }}>{pair[1]}</span>
                    </div>
                    <RadioGroup 
                        className="flex justify-between gap-1 sm:gap-2 w-full"
                        value={String(value)}
                    >
                       {[-9, -7, -5, -3, 1, 3, 5, 7, 9].map((v) => (
                            <div key={v} className="flex flex-col items-center space-y-1">
                                <Label htmlFor={`preview-pair-${matrixKey}-${pair.join('-')}-${v}`} className="text-xs text-muted-foreground">{Math.abs(v)}</Label>
                                <RadioGroupItem 
                                    value={String(v)} 
                                    id={`preview-pair-${matrixKey}-${pair.join('-')}-${v}`} 
                                    className={cn(value === v && "bg-primary text-primary-foreground")}
                                />
                            </div>
                        ))}
                    </RadioGroup>
                    <div className="w-full flex justify-between text-xs text-muted-foreground mt-2 px-1">
                        <span className="text-left text-[10px] sm:text-xs">Strongly Prefer {pair[0]}</span>
                        <span className="text-center text-[10px] sm:text-xs">Neutral</span>
                        <span className="text-right text-[10px] sm:text-xs">Strongly Prefer {pair[1]}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
      <div className="p-4 rounded-lg" style={{ marginBottom: styles.questionSpacing }}>
        <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor }}>
            {question.title || "Example AHP Question"}
        </h3>
        <div>
            <div className="legend bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
                <div className="legend-title font-semibold text-blue-800 mb-2">Importance Scale Guide</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700">
                    <div><strong>1:</strong> Equal</div>
                    <div><strong>3:</strong> Moderately Important</div>
                    <div><strong>5:</strong> Important</div>
                    <div><strong>7:</strong> Very Important</div>
                    <div><strong>9:</strong> Extremely Important</div>
                </div>
            </div>
            <h4 className="font-semibold text-lg mb-2 text-center">Which criterion is more important?</h4>
            <PairwiseComparison pair={["Price", "Quality"]} matrixKey="criteria" />
        </div>
      </div>
    );
};

export default function SurveyPreview({ styles, survey }: { styles: any, survey: any }) {
    return (
        <Card className="sticky top-24 overflow-hidden">
            <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>Changes to the styling will be reflected here.</CardDescription>
            </CardHeader>
            <div className="h-[70vh] bg-muted/20">
                <SurveyView 
                    isPreview={true}
                    survey={{ ...survey, styles }}
                />
            </div>
        </Card>
    );
}


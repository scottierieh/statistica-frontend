'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { produce } from "immer";

interface AHPQuestionProps {
    question: Question;
    answer?: any;
    onAnswerChange?: (value: any) => void;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

const PairwiseComparison = ({ pair, matrixKey, value, onChange, styles }: { pair: [string, string], matrixKey: string, value: number, onChange: (val: number) => void, styles: any }) => {
    const scale = [-9, -7, -5, -3, 1, 3, 5, 7, 9];
    return (
        <div className="p-4 rounded-lg border bg-white mb-2 shadow-sm">
            <div className="relative flex flex-col items-center justify-between gap-3">
                <div className="flex w-full justify-between font-bold text-sm">
                    <span className="text-left w-2/5 text-primary" style={{ color: styles.primaryColor }}>{pair[0]}</span>
                    <span className="text-center w-1/5 text-muted-foreground">vs</span>
                    <span className="text-right w-2/5 text-primary" style={{ color: styles.primaryColor }}>{pair[1]}</span>
                </div>
                 <RadioGroup 
                    className="flex justify-between gap-1 sm:gap-2 w-full"
                    value={String(value)}
                    onValueChange={(v) => onChange(Number(v))}
                >
                   {scale.map((v) => (
                        <div key={v} className="flex flex-col items-center space-y-1">
                            <Label htmlFor={`pair-${matrixKey}-${pair.join('-')}-${v}`} className="text-xs text-muted-foreground">{Math.abs(v)}</Label>
                            <RadioGroupItem 
                                value={String(v)} 
                                id={`pair-${matrixKey}-${pair.join('-')}-${v}`} 
                                className={cn(value === v && "bg-primary text-primary-foreground")}
                            />
                        </div>
                    ))}
                </RadioGroup>
                <div className="w-full flex justify-between text-xs text-muted-foreground mt-1 px-1">
                    <span className="text-left text-[10px] sm:text-xs">Strongly Prefer {pair[0]}</span>
                    <span className="text-center text-[10px] sm:text-xs">Neutral</span>
                    <span className="text-right text-[10px] sm:text-xs">Strongly Prefer {pair[1]}</span>
                </div>
            </div>
        </div>
    );
};


export default function AHPQuestion({ 
    question, 
    answer, 
    onAnswerChange, 
    onUpdate,
    onDelete,
    onImageUpload,
    onDuplicate,
    styles,
    questionNumber,
    isPreview 
}: AHPQuestionProps) {

    const generatePairs = (items: any[]) => {
        const pairs: [any, any][] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                pairs.push([items[i], items[j]]);
            }
        }
        return pairs;
    };
    
    const criteriaPairs = useMemo(() => generatePairs(question.criteria || []), [question.criteria]);
    const alternativePairsByCriterion = useMemo(() => {
        const result: {[criterionId: string]: [string, string][]} = {};
        if (question.alternatives && question.alternatives.length > 1) {
            const altPairs = generatePairs(question.alternatives);
            (question.criteria || []).forEach(c => {
                 result[c.id] = altPairs;
            });
        }
        return result;
    }, [question.criteria, question.alternatives]);

    const handleComparisonChange = (matrixKey: string, pairKey: string, value: number) => {
        onAnswerChange?.(produce(answer || {}, (draft: any) => {
            if (!draft[matrixKey]) draft[matrixKey] = {};
            draft[matrixKey][pairKey] = value;
        }));
    };

    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title} {question.required && <span className="text-destructive">*</span>}
                </h3>
                <div className="space-y-6">
                    {criteriaPairs.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Criteria Comparison</h4>
                            {criteriaPairs.map((pair, index) => (
                                 <PairwiseComparison 
                                    key={index} 
                                    pair={[pair[0].name, pair[1].name]} 
                                    matrixKey="criteria" 
                                    value={answer?.criteria?.[`${pair[0].name} vs ${pair[1].name}`] || 1}
                                    onChange={(val) => handleComparisonChange('criteria', `${pair[0].name} vs ${pair[1].name}`, val)}
                                    styles={styles}
                                />
                            ))}
                        </div>
                    )}
                     {Object.entries(alternativePairsByCriterion).length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Alternative Comparison</h4>
                            {Object.entries(alternativePairsByCriterion).map(([criterionId, pairs]) => {
                                 const criterion = question.criteria?.find(c => c.id === criterionId);
                                 return (
                                    <div key={criterionId} className="mb-4">
                                        <h5 className="font-medium text-center p-2 bg-slate-100 rounded-md mb-2">For criterion: <strong>{criterion?.name}</strong></h5>
                                        {pairs.map((pair, index) => (
                                            <PairwiseComparison 
                                                key={index} 
                                                pair={pair} 
                                                matrixKey={`alt_${criterionId}`} 
                                                value={answer?.[`alt_${criterionId}`]?.[`${pair[0]} vs ${pair[1]}`] || 1}
                                                onChange={(val) => handleComparisonChange(`alt_${criterionId}`, `${pair[0]} vs ${pair[1]}`, val)}
                                                styles={styles}
                                            />
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                     )}
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
            </CardContent>
        </Card>
    );
}

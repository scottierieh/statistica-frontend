'use client';

import { Question, CvmBidSet } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { produce } from "immer";
import { useState, useMemo, useEffect } from "react";
import { PlusCircle, X, DollarSign, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface CVMQuestionProps {
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

export default function CVMQuestion({
    question,
    answer = {},
    onAnswerChange,
    onUpdate,
    onDelete,
    onImageUpload,
    onDuplicate,
    styles,
    questionNumber,
    isPreview
}: CVMQuestionProps) {
    
    const [bidState, setBidState] = useState<'initial' | 'followup_yes' | 'followup_no'>('initial');
    const [selectedBidSet, setSelectedBidSet] = useState<CvmBidSet | null>(null);

    const cvmBids = question.cvmBids || [];

    useEffect(() => {
        if (isPreview && !selectedBidSet && cvmBids.length > 0) {
            const randomBidSet = cvmBids[Math.floor(Math.random() * cvmBids.length)];
            setSelectedBidSet(randomBidSet);
            onAnswerChange?.(produce(answer, (draft: any) => {
                draft.bidSet = randomBidSet;
            }));
        }
    }, [isPreview, selectedBidSet, cvmBids, onAnswerChange, answer]);

    const handleFirstResponse = (response: 'Yes' | 'No') => {
        const numericResponse = response === 'Yes' ? 1 : 0;
        
        onAnswerChange?.(produce(answer, (draft: any) => {
            draft.response1 = numericResponse;
        }));

        if (response === 'Yes') {
            setBidState('followup_yes');
        } else {
            setBidState('followup_no');
        }
    };

    const handleSecondResponse = (response: 'Yes' | 'No') => {
         const numericResponse = response === 'Yes' ? 1 : 0;
         onAnswerChange?.(produce(answer, (draft: any) => {
            draft.response2 = numericResponse;
        }));
    };
    
    const handleBidChange = (index: number, field: 'initial' | 'upper' | 'lower', value: string) => {
        onUpdate?.(produce(question, draft => {
            const numValue = parseInt(value, 10) || 0;
            if (draft.cvmBids) {
                (draft.cvmBids[index] as any)[field] = numValue;
            }
        }));
    };
    
    const addBidSet = () => {
        onUpdate?.(produce(question, draft => {
            if (!draft.cvmBids) draft.cvmBids = [];
            draft.cvmBids.push({ id: `bid${Date.now()}`, initial: 0, upper: 0, lower: 0 });
        }));
    };

    const removeBidSet = (index: number) => {
        onUpdate?.(produce(question, draft => {
            if (draft.cvmBids) draft.cvmBids.splice(index, 1);
        }));
    };


    if (isPreview) {
        let currentQuestionText = "";
        let currentBid: number | null = null;
        let currentHandler: (response: 'Yes' | 'No') => void;
        let currentResponseKey: 'response1' | 'response2' = 'response1';

        if (bidState === 'initial') {
            currentBid = selectedBidSet?.initial ?? null;
            currentQuestionText = question.bidQuestion || "Are you willing to pay [Bid Amount] for this policy?";
            currentHandler = handleFirstResponse;
            currentResponseKey = 'response1';
        } else if (bidState === 'followup_yes') {
            currentBid = selectedBidSet?.upper ?? null;
            currentQuestionText = question.followUpYesQuestion || "If the cost were [Bid Amount] instead, would you still be willing to pay?";
            currentHandler = handleSecondResponse;
            currentResponseKey = 'response2';
        } else { // followup_no
            currentBid = selectedBidSet?.lower ?? null;
            currentQuestionText = question.followUpNoQuestion || "If the cost were [Bid Amount] instead, would you be willing to pay?";
            currentHandler = handleSecondResponse;
            currentResponseKey = 'response2';
        }
        
        const currentResponseValue = answer[currentResponseKey] !== undefined ? (answer[currentResponseKey] === 1 ? 'Yes' : 'No') : undefined;

        // The first question should be disabled once answered, but the second should remain active.
        const isRadioGroupDisabled = bidState !== 'initial';

        return (
            <div>
                <h3 className="font-semibold mb-2 text-center" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {currentQuestionText.replace('[Bid Amount]', `$${currentBid?.toLocaleString()}`)} {question.required && <span className="text-destructive">*</span>}
                </h3>
                
                <div className="my-6 flex flex-col items-center">
                    <Badge variant="secondary" className="mb-2">Proposed Amount</Badge>
                    <div className="text-4xl font-bold p-4 rounded-lg bg-primary/10 text-primary border-2 border-primary/20">
                        ${currentBid?.toLocaleString()}
                    </div>
                </div>

                 <RadioGroup 
                    value={currentResponseValue} 
                    onValueChange={(v) => currentHandler(v as 'Yes' | 'No')} 
                    disabled={isRadioGroupDisabled && currentResponseKey === 'response1'}
                 >
                    <div className="grid grid-cols-2 gap-3">
                        <Label htmlFor={`cvm-yes-${currentResponseKey}`} className="flex items-center justify-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer text-lg">
                            <RadioGroupItem value="Yes" id={`cvm-yes-${currentResponseKey}`} />
                            <span>Yes</span>
                        </Label>
                        <Label htmlFor={`cvm-no-${currentResponseKey}`} className="flex items-center justify-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer text-lg">
                            <RadioGroupItem value="No" id={`cvm-no-${currentResponseKey}`} />
                            <span>No</span>
                        </Label>
                    </div>
                </RadioGroup>
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
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Initial Question</Label>
                        <Input 
                            value={question.bidQuestion || ''}
                            onChange={(e) => onUpdate?.({ ...question, bidQuestion: e.target.value })}
                            placeholder="e.g., Are you willing to pay [Bid Amount] for the policy?"
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Follow-up "Yes" Question</Label>
                            <Input 
                                value={question.followUpYesQuestion || ''}
                                onChange={(e) => onUpdate?.({ ...question, followUpYesQuestion: e.target.value })}
                                placeholder="e.g., If the cost were [Bid Amount] instead, would you still be willing to pay?"
                            />
                        </div>
                        <div className="space-y-2">
                             <Label className="text-sm font-semibold">Follow-up "No" Question</Label>
                            <Input 
                                value={question.followUpNoQuestion || ''}
                                onChange={(e) => onUpdate?.({ ...question, followUpNoQuestion: e.target.value })}
                                placeholder="e.g., If the cost were [Bid Amount] instead, would you be willing to pay?"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <Label className="text-sm font-semibold">Bid Sets</Label>
                        <Card className="mt-2">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Initial Bid</TableHead>
                                        <TableHead>Follow-up "Yes" (Upper)</TableHead>
                                        <TableHead>Follow-up "No" (Lower)</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cvmBids.map((bidSet, index) => (
                                        <TableRow key={bidSet.id}>
                                            <TableCell>
                                                <Input type="number" value={bidSet.initial} onChange={e => handleBidChange(index, 'initial', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" value={bidSet.upper} onChange={e => handleBidChange(index, 'upper', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" value={bidSet.lower} onChange={e => handleBidChange(index, 'lower', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => removeBidSet(index)}>
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <CardFooter className="pt-4">
                                <Button variant="outline" size="sm" onClick={addBidSet}>
                                    <PlusCircle className="w-4 h-4 mr-2" /> Add Bid Set
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


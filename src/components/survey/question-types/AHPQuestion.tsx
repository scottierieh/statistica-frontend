
'use client';

import { Question, Criterion } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { produce } from "immer";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, X, CornerDownRight } from "lucide-react";

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

const CriteriaEditor = ({ 
    criteria, 
    onCriterionChange, 
    addCriterion, 
    removeCriterion,
    onSubCriterionChange,
    addSubCriterion,
    removeSubCriterion
}: {
    criteria: Criterion[],
    onCriterionChange: (index: number, value: string) => void,
    addCriterion: () => void,
    removeCriterion: (index: number) => void,
    onSubCriterionChange: (critIndex: number, subIndex: number, value: string) => void,
    addSubCriterion: (critIndex: number) => void,
    removeSubCriterion: (critIndex: number, subIndex: number) => void,
}) => (
    <div className="space-y-2">
        <Label className="font-semibold">Criteria Hierarchy</Label>
        {criteria.map((criterion, index) => (
            <Card key={criterion.id} className="p-3 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 group">
                    <Input 
                        value={criterion.name} 
                        onChange={e => onCriterionChange(index, e.target.value)}
                        placeholder={`Criterion ${index + 1}`}
                        className="font-semibold bg-white"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeCriterion(index)} disabled={criteria.length <= 1}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                </div>
                
                <div className="pl-6 pt-2 space-y-2">
                    {(criterion.subCriteria || []).map((sub, subIndex) => (
                         <div key={sub.id} className="flex items-center gap-2 group">
                            <CornerDownRight className="w-4 h-4 text-muted-foreground" />
                            <Input 
                                value={sub.name} 
                                onChange={e => onSubCriterionChange(index, subIndex, e.target.value)}
                                placeholder={`Sub-criterion ${subIndex + 1}`}
                                className="bg-white"
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeSubCriterion(index, subIndex)}>
                                <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="link" size="sm" onClick={() => addSubCriterion(index)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Sub-criterion
                    </Button>
                </div>
            </Card>
        ))}
        <Button variant="outline" size="sm" className="mt-2" onClick={addCriterion}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Main Criterion
        </Button>
    </div>
);


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
    
    const subCriteriaPairs = useMemo(() => {
        const result: { parentId: string; parentName: string; pairs: [Criterion, Criterion][] }[] = [];
        (question.criteria || []).forEach(c => {
            if (c.subCriteria && c.subCriteria.length > 1) {
                result.push({
                    parentId: c.id,
                    parentName: c.name,
                    pairs: generatePairs(c.subCriteria)
                });
            }
        });
        return result;
    }, [question.criteria]);
    
    const alternativePairsByCriterion = useMemo(() => {
        const result: { criterionId: string; criterionName: string; pairs: [string, string][] }[] = [];
        if (!question.alternatives || question.alternatives.length < 2) return [];

        const altPairs = generatePairs(question.alternatives);

        const findLeafCriteria = (criteria: Criterion[]): Criterion[] => {
            let leaves: Criterion[] = [];
            criteria.forEach(c => {
                if (!c.subCriteria || c.subCriteria.length === 0) {
                    leaves.push(c);
                } else {
                    leaves = leaves.concat(findLeafCriteria(c.subCriteria));
                }
            });
            return leaves;
        };

        const leafCriteria = findLeafCriteria(question.criteria || []);

        leafCriteria.forEach(c => {
            result.push({
                criterionId: c.id,
                criterionName: c.name,
                pairs: altPairs
            });
        });
        return result;
    }, [question.criteria, question.alternatives]);


    const handleComparisonChange = (matrixKey: string, pairKey: string, value: number) => {
        onAnswerChange?.(produce(answer || {}, (draft: any) => {
            if (!draft[matrixKey]) draft[matrixKey] = {};
            draft[matrixKey][pairKey] = value;
        }));
    };
    
    // --- Editor-specific handlers ---
    const handleCriterionChange = (index: number, value: string) => {
        onUpdate?.(produce(question, draft => {
            if (draft.criteria) draft.criteria[index].name = value;
        }));
    };

    const addCriterion = () => {
        onUpdate?.(produce(question, draft => {
            if (!draft.criteria) draft.criteria = [];
            draft.criteria.push({ id: `c${Date.now()}`, name: `Criterion ${draft.criteria.length + 1}` });
        }));
    };

    const removeCriterion = (index: number) => {
        onUpdate?.(produce(question, draft => {
            if (draft.criteria) draft.criteria.splice(index, 1);
        }));
    };

    const handleSubCriterionChange = (critIndex: number, subIndex: number, value: string) => {
        onUpdate?.(produce(question, draft => {
            if (draft.criteria?.[critIndex]?.subCriteria) {
                draft.criteria[critIndex].subCriteria![subIndex].name = value;
            }
        }));
    };

    const addSubCriterion = (critIndex: number) => {
        onUpdate?.(produce(question, draft => {
            if (draft.criteria?.[critIndex]) {
                if (!draft.criteria[critIndex].subCriteria) {
                    draft.criteria[critIndex].subCriteria = [];
                }
                const subCriteria = draft.criteria[critIndex].subCriteria!;
                subCriteria.push({ id: `sc${Date.now()}`, name: `Sub-criterion ${subCriteria.length + 1}` });
            }
        }));
    };

    const removeSubCriterion = (critIndex: number, subIndex: number) => {
        onUpdate?.(produce(question, draft => {
            if (draft.criteria?.[critIndex]?.subCriteria) {
                draft.criteria[critIndex].subCriteria!.splice(subIndex, 1);
            }
        }));
    };
    
    const handleAlternativeChange = (index: number, value: string) => {
        onUpdate?.(produce(question, draft => {
            if (draft.alternatives) draft.alternatives[index] = value;
        }));
    };

    const addAlternative = () => {
        onUpdate?.(produce(question, draft => {
            if (!draft.alternatives) draft.alternatives = [];
            draft.alternatives.push(`Alternative ${draft.alternatives.length + 1}`);
        }));
    };

    const removeAlternative = (index: number) => {
        onUpdate?.(produce(question, draft => {
            if (draft.alternatives) draft.alternatives.splice(index, 1);
        }));
    };

    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px` }}>
                    {question.title || "Example AHP Question"} {question.required && <span className="text-destructive">*</span>}
                </h3>
                 {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                    </div>
                )}
                <div className="space-y-6">
                    <div className="legend bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
                        <div className="legend-title font-semibold text-blue-800 mb-2">Importance Scale Guide</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700">
                            <div><strong>1:</strong> Equal Importance</div>
                            <div><strong>3:</strong> Moderate Importance</div>
                            <div><strong>5:</strong> Strong Importance</div>
                            <div><strong>7:</strong> Very Strong Importance</div>
                            <div><strong>9:</strong> Extreme Importance</div>
                        </div>
                    </div>

                    {criteriaPairs.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg mb-2 text-center">Which criterion is more important?</h4>
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

                    {subCriteriaPairs.map(({ parentId, parentName, pairs }) => (
                         <div key={parentId}>
                            <h4 className="font-semibold text-lg mb-2 text-center">For "{parentName}", which sub-criterion is more important?</h4>
                            {pairs.map((pair, index) => (
                                 <PairwiseComparison 
                                    key={index} 
                                    pair={[pair[0].name, pair[1].name]} 
                                    matrixKey={`sub_criteria_${parentId}`} 
                                    value={answer?.[`sub_criteria_${parentId}`]?.[`${pair[0].name} vs ${pair[1].name}`] || 1}
                                    onChange={(val) => handleComparisonChange(`sub_criteria_${parentId}`, `${pair[0].name} vs ${pair[1].name}`, val)}
                                    styles={styles}
                                />
                            ))}
                        </div>
                    ))}
                    
                    {alternativePairsByCriterion.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg mb-2 text-center">Alternative Comparisons</h4>
                            {alternativePairsByCriterion.map(({ criterionId, criterionName, pairs }) => {
                                 return (
                                    <div key={criterionId} className="mb-4">
                                        <h5 className="font-medium text-center p-2 bg-slate-100 rounded-md mb-2">For criterion: <strong>{criterionName}</strong></h5>
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
                    onUpdate={onUpdate as any}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                 <div className="mt-4 grid md:grid-cols-2 gap-6">
                    <CriteriaEditor 
                        criteria={question.criteria || []}
                        onCriterionChange={handleCriterionChange}
                        addCriterion={addCriterion}
                        removeCriterion={removeCriterion}
                        onSubCriterionChange={handleSubCriterionChange}
                        addSubCriterion={addSubCriterion}
                        removeSubCriterion={removeSubCriterion}
                    />

                    {/* Alternatives Editor */}
                    <div className="space-y-2">
                        <Label className="font-semibold">Alternatives</Label>
                        {(question.alternatives || []).map((alt, index) => (
                            <div key={index} className="flex items-center gap-2 group">
                                <Input 
                                    value={alt} 
                                    onChange={e => handleAlternativeChange(index, e.target.value)}
                                    placeholder={`Alternative ${index + 1}`}
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeAlternative(index)}>
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                         <Button variant="link" size="sm" onClick={addAlternative}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Alternative
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


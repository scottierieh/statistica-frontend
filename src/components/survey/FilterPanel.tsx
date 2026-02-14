
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";
import { produce } from 'immer';
import type { Survey, Question } from '@/types/survey';
import { Card } from '../ui/card';

export interface FilterRule {
  id: string;
  questionId: string;
  operator: string;
  value: any;
}

export interface FilterGroup {
  id: string;
  conjunction: 'AND' | 'OR';
  rules: FilterRule[];
}

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  survey: Survey;
  onApplyFilters: (filters: FilterGroup[]) => void;
  onClearFilters: () => void;
}

const getOperatorsForQuestion = (question?: Question) => {
    if (!question) return [];
    switch(question.type) {
        case 'single':
        case 'dropdown':
            return [{value: 'is', label: 'Is'}, {value: 'is_not', label: 'Is Not'}];
        case 'multiple':
            return [{value: 'contains', label: 'Contains'}, {value: 'not_contains', label: 'Does Not Contain'}];
        case 'number':
        case 'rating':
        case 'nps':
        case 'likert':
            return [
                {value: 'eq', label: '='},
                {value: 'neq', label: '!='},
                {value: 'gt', label: '>'},
                {value: 'lt', label: '<'},
                {value: 'gte', label: '>='},
                {value: 'lte', label: '<='}
            ];
        case 'text':
             return [{value: 'contains', label: 'Contains'}, {value: 'not_contains', label: 'Does Not Contain'}];
        default:
            return [];
    }
};

const FilterRuleComponent = ({ rule, onUpdate, onDelete, questions }: { rule: FilterRule, onUpdate: (updatedRule: FilterRule) => void, onDelete: () => void, questions: Question[] }) => {
    const selectedQuestion = questions.find(q => q.id === rule.questionId);
    const operators = getOperatorsForQuestion(selectedQuestion);

    const handleQuestionChange = (questionId: string) => {
        onUpdate({ ...rule, questionId, operator: '', value: '' });
    };

    const handleOperatorChange = (operator: string) => {
        onUpdate({ ...rule, operator });
    };

    const handleValueChange = (value: any) => {
        onUpdate({ ...rule, value });
    };

    const renderValueInput = () => {
        if (!selectedQuestion) return null;

        switch (selectedQuestion.type) {
            case 'single':
            case 'dropdown':
            case 'multiple':
                return (
                    <Select value={rule.value} onValueChange={handleValueChange}>
                        <SelectTrigger><SelectValue placeholder="Select value..."/></SelectTrigger>
                        <SelectContent>
                            {selectedQuestion.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                );
            case 'text':
                return <Input value={rule.value} onChange={(e) => handleValueChange(e.target.value)} placeholder="Enter keyword..."/>;
            case 'number':
            case 'rating':
            case 'nps':
            case 'likert':
                 return <Input type="number" value={rule.value} onChange={(e) => handleValueChange(Number(e.target.value))}/>
            default:
                return null;
        }
    };

    return (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Select value={rule.questionId} onValueChange={handleQuestionChange}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select question..."/></SelectTrigger>
                <SelectContent>{questions.map(q => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}</SelectContent>
            </Select>

            <Select value={rule.operator} onValueChange={handleOperatorChange} disabled={!operators.length}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Operator"/></SelectTrigger>
                <SelectContent>{operators.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}</SelectContent>
            </Select>
            
            <div className="flex-1">
                {renderValueInput()}
            </div>

            <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4"/>
            </Button>
        </div>
    );
};

export default function FilterPanel({ open, onOpenChange, survey, onApplyFilters, onClearFilters }: FilterPanelProps) {
    const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
        { id: `g-${Date.now()}`, conjunction: 'AND', rules: [] }
    ]);
    
    const addRule = (groupIndex: number) => {
        setFilterGroups(produce(draft => {
            draft[groupIndex].rules.push({ id: `r-${Date.now()}`, questionId: '', operator: '', value: '' });
        }));
    };

    const updateRule = (groupIndex: number, ruleIndex: number, updatedRule: FilterRule) => {
        setFilterGroups(produce(draft => {
            draft[groupIndex].rules[ruleIndex] = updatedRule;
        }));
    };
    
    const deleteRule = (groupIndex: number, ruleIndex: number) => {
        setFilterGroups(produce(draft => {
            draft[groupIndex].rules.splice(ruleIndex, 1);
        }));
    };

    const handleApply = () => {
        onApplyFilters(filterGroups);
        onOpenChange(false);
    };

    const handleClear = () => {
        setFilterGroups([{ id: `g-${Date.now()}`, conjunction: 'AND', rules: [] }]);
        onClearFilters();
    };

    const handleConjunctionChange = (groupIndex: number, value: 'AND' | 'OR') => {
        setFilterGroups(produce(draft => {
            draft[groupIndex].conjunction = value;
        }));
    };

    const filterableQuestions = survey.questions.filter(q => q.type !== 'description');

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>Filter Survey Responses</SheetTitle>
                    <SheetDescription>
                        Build conditions to filter your analysis results. Click 'Apply' to see changes.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-4">
                    {filterGroups.map((group, groupIndex) => (
                        <Card key={group.id} className="p-4">
                            <div className="flex items-center justify-end mb-2">
                                <Select value={group.conjunction} onValueChange={(v) => handleConjunctionChange(groupIndex, v as 'AND' | 'OR')}>
                                    <SelectTrigger className="w-[100px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AND">AND</SelectItem>
                                        <SelectItem value="OR">OR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                {group.rules.map((rule, ruleIndex) => (
                                    <FilterRuleComponent 
                                        key={rule.id}
                                        rule={rule}
                                        onUpdate={(updated) => updateRule(groupIndex, ruleIndex, updated)}
                                        onDelete={() => deleteRule(groupIndex, ruleIndex)}
                                        questions={filterableQuestions}
                                    />
                                ))}
                                <Button variant="outline" size="sm" onClick={() => addRule(groupIndex)}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Add Condition
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
                <SheetFooter>
                    <Button variant="outline" onClick={handleClear}>Clear All</Button>
                    <Button onClick={handleApply}>Apply Filters</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

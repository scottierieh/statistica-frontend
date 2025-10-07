
'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Type Definitions
type Comparison = {
  criterion1?: string;
  criterion2?: string;
  alternative1?: string;
  alternative2?: string;
  value: number;
};

type CriteriaComparison = Comparison & { criterion1: string; criterion2: string; };
type AlternativeComparison = Comparison & { alternative1: string; alternative2: string; };

export default function AHPSurveyBuilder() {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<string[]>(['품질', '가격', '서비스', '신뢰성']);
  const [alternatives, setAlternatives] = useState<string[]>(['대안 A', '대안 B', '대안 C']);
  const [newCriterion, setNewCriterion] = useState('');
  const [newAlternative, setNewAlternative] = useState('');

  const [criteriaComparisons, setCriteriaComparisons] = useState<CriteriaComparison[]>([]);
  const [alternativeComparisons, setAlternativeComparisons] = useState<Record<string, AlternativeComparison[]>>({});

  const [currentStep, setCurrentStep] = useState<'setup' | 'criteria' | 'alternatives'>('setup');
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);

  const addCriterion = () => {
    if (newCriterion.trim() && !criteria.includes(newCriterion.trim())) {
      setCriteria([...criteria, newCriterion.trim()]);
      setNewCriterion('');
    }
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const addAlternative = () => {
    if (newAlternative.trim() && !alternatives.includes(newAlternative.trim())) {
      setAlternatives([...alternatives, newAlternative.trim()]);
      setNewAlternative('');
    }
  };

  const removeAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const generateCriteriaComparisons = () => {
    const comparisons: CriteriaComparison[] = [];
    for (let i = 0; i < criteria.length; i++) {
      for (let j = i + 1; j < criteria.length; j++) {
        comparisons.push({
          criterion1: criteria[i],
          criterion2: criteria[j],
          value: 1
        });
      }
    }
    setCriteriaComparisons(comparisons);
    setCurrentStep('criteria');
  };

  const startAlternativeComparisons = () => {
    const comparisons: Record<string, AlternativeComparison[]> = {};
    criteria.forEach(criterion => {
      const pairs: AlternativeComparison[] = [];
      for (let i = 0; i < alternatives.length; i++) {
        for (let j = i + 1; j < alternatives.length; j++) {
          pairs.push({
            alternative1: alternatives[i],
            alternative2: alternatives[j],
            value: 1
          });
        }
      }
      comparisons[criterion] = pairs;
    });
    setAlternativeComparisons(comparisons);
    setCurrentCriterionIndex(0);
    setCurrentStep('alternatives');
  };

  const updateCriteriaComparison = (index: number, value: number) => {
    const updated = [...criteriaComparisons];
    updated[index].value = value;
    setCriteriaComparisons(updated);
  };

  const updateAlternativeComparison = (criterionName: string, index: number, value: number) => {
    const updated = { ...alternativeComparisons };
    updated[criterionName][index].value = value;
    setAlternativeComparisons(updated);
  };

  const nextCriterion = () => {
    if (currentCriterionIndex < criteria.length - 1) {
      setCurrentCriterionIndex(currentCriterionIndex + 1);
    }
  };

  const prevCriterion = () => {
    if (currentCriterionIndex > 0) {
      setCurrentCriterionIndex(currentCriterionIndex - 1);
    }
  };

  const exportResults = () => {
    const results = {
      criteria,
      alternatives,
      criteriaComparisons,
      alternativeComparisons,
      timestamp: new Date().toISOString()
    };
    console.log('AHP Survey Results:', results);
    toast({
        title: "Results Exported",
        description: "The survey results have been logged to the browser console."
    })
  };

  const ScaleButton = ({ value, comparisonValue, onClick }: { value: number, comparisonValue: number, onClick: () => void }) => {
      const isSelected = Math.abs(comparisonValue - value) < 0.01;
      return (
        <div className="flex flex-col items-center">
            <button
            onClick={onClick}
            className={`w-12 h-12 rounded-full border-2 transition-all ${
                isSelected 
                ? 'bg-blue-600 border-blue-600 shadow-lg scale-110' 
                : 'bg-white border-gray-300 hover:border-blue-400 hover:scale-105'
            }`}
            >
            <span className={`text-sm font-semibold ${
                isSelected ? 'text-white' : 'text-gray-600'
            }`}>
                {Math.abs(value) === 1 ? 1 : Math.round(1/value) > 1 ? Math.round(1/value) : value}
            </span>
            </button>
        </div>
      )
  }

  const renderScaleButtons = (comparison: any, index: number, updateFunc: any, criterionName: string | null = null) => {
    const scaleValues = [1/9, 1/7, 1/5, 1/3, 1, 3, 5, 7, 9];
    const displayValues = [9, 7, 5, 3, 1, 3, 5, 7, 9];

    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold text-blue-700 text-lg">{comparison.criterion1 || comparison.alternative1}</span>
          <span className="text-gray-400 text-sm">vs</span>
          <span className="font-semibold text-indigo-700 text-lg">{comparison.criterion2 || comparison.alternative2}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          {scaleValues.map((value, idx) => (
            <ScaleButton
              key={idx}
              value={value}
              comparisonValue={comparison.value}
              onClick={() => criterionName ? updateFunc(criterionName, index, value) : updateFunc(index, value)}
            />
          ))}
        </div>

        <div className="flex justify-between text-xs text-gray-600 mb-2 px-2">
          <span className="font-medium">{comparison.criterion1 || comparison.alternative1}</span>
          <span className="font-medium">{comparison.criterion2 || comparison.alternative2}</span>
        </div>

        <div className="text-center mt-3 h-8">
          {comparison.value === 1 ? (
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              동등하게 중요
            </span>
          ) : comparison.value > 1 ? (
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {comparison.criterion1 || comparison.alternative1}가 {comparison.value.toFixed(0)}배 더 중요
            </span>
          ) : (
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              {comparison.criterion2 || comparison.alternative2}가 {(1/comparison.value).toFixed(0)}배 더 중요
            </span>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">AHP 설문 문항 설정</h1>
        <p className="text-gray-600 mb-8">평가 기준과 대안을 설정하고 쌍대비교를 수행하세요</p>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {['setup', 'criteria', 'alternatives'].map((step, i) => (
            <React.Fragment key={step}>
                <div className={`flex items-center ${currentStep === step ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === step ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>{i + 1}</div>
                    <span className="ml-2 font-medium capitalize">{step.replace('-', ' ')}</span>
                </div>
                {i < 2 && <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>}
            </React.Fragment>
          ))}
        </div>

        {currentStep === 'setup' && (
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">평가 기준 설정</h2>
              <div className="flex gap-2 mb-4">
                <Input type="text" value={newCriterion} onChange={(e) => setNewCriterion(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addCriterion()} placeholder="새로운 기준 입력" />
                <Button onClick={addCriterion} className="flex items-center gap-2"><Plus size={20} /> 추가</Button>
              </div>
              <div className="space-y-2">
                {criteria.map((criterion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-medium text-gray-700">{criterion}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeCriterion(index)}><Trash2 size={18} className="text-red-500 hover:text-red-700" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">대안 설정</h2>
              <div className="flex gap-2 mb-4">
                <Input type="text" value={newAlternative} onChange={(e) => setNewAlternative(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addAlternative()} placeholder="새로운 대안 입력" />
                <Button onClick={addAlternative} className="bg-indigo-500 hover:bg-indigo-600 flex items-center gap-2"><Plus size={20} /> 추가</Button>
              </div>
              <div className="space-y-2">
                {alternatives.map((alternative, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <span className="font-medium text-gray-700">{alternative}</span>
                     <Button variant="ghost" size="icon" onClick={() => removeAlternative(index)}><Trash2 size={18} className="text-red-500 hover:text-red-700"/></Button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={generateCriteriaComparisons} disabled={criteria.length < 2 || alternatives.length < 2} className="w-full">
              평가 시작하기 <ChevronRight size={20} className="ml-2"/>
            </Button>
            {(criteria.length < 2 || alternatives.length < 2) && <p className="text-sm text-gray-500 mt-2 text-center">최소 2개 이상의 기준과 2개 이상의 대안이 필요합니다</p>}
          </div>
        )}

        {currentStep === 'criteria' && (
          <div>
            <Button variant="link" onClick={() => setCurrentStep('setup')} className="mb-6 p-0">← 설정으로 돌아가기</Button>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">기준 간 쌍대비교</h2>
            <p className="text-sm text-gray-600 mb-6">각 기준에 대해 어느 것이 얼마나 더 중요한지 평가해주세요</p>
            <div className="space-y-6">{criteriaComparisons.map((comp, index) => renderScaleButtons(comp, index, updateCriteriaComparison))}</div>
            <Button onClick={startAlternativeComparisons} className="w-full mt-8">다음: 대안 평가 <ChevronRight size={20} className="ml-2"/></Button>
          </div>
        )}

        {currentStep === 'alternatives' && (
          <div>
            <Button variant="link" onClick={() => setCurrentStep('criteria')} className="mb-6 p-0">← 기준 비교로 돌아가기</Button>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">'{criteria[currentCriterionIndex]}' 기준에서의 대안 비교</h2>
              <p className="text-sm text-gray-600">{criteria[currentCriterionIndex]} 관점에서 각 대안을 비교 평가해주세요</p>
              <div className="mt-2 text-sm text-gray-500">진행 상황: {currentCriterionIndex + 1} / {criteria.length}</div>
            </div>
            <div className="space-y-6">{alternativeComparisons[criteria[currentCriterionIndex]]?.map((comp, index) => renderScaleButtons(comp, index, updateAlternativeComparison, criteria[currentCriterionIndex]))}</div>
            <div className="flex gap-4 mt-8">
              {currentCriterionIndex > 0 && <Button onClick={prevCriterion} className="flex-1 bg-gray-500 hover:bg-gray-600">이전 기준</Button>}
              {currentCriterionIndex < criteria.length - 1 ? (
                <Button onClick={nextCriterion} className="flex-1">다음 기준 <ChevronRight size={20} className="ml-2"/></Button>
              ) : (
                <Button onClick={exportResults} className="flex-1 bg-green-600 hover:bg-green-700"><Save size={20} className="mr-2"/> 평가 완료 및 저장</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import type { SurveyResponse } from '@/entities/Survey';

// --- 가중치 타입 정의 ---
export interface QuestionWeight {
  questionId: string;
  enabled: boolean;
  optionWeights?: { [option: string]: number };
  defaultWeight?: number;
}

// --- 가중치 적용 함수 ---
export const applyWeights = (responses: SurveyResponse[], weights: QuestionWeight[]): SurveyResponse[] => {
    if (!weights || weights.length === 0) return responses;
    
    return responses.map(response => {
        let weightMultiplier = 1;
        
        weights.forEach(weight => {
            if (!weight.enabled) return;
            
            const answer = (response.answers as any)[weight.questionId];
            if (!answer) return;
            
            if (weight.optionWeights) {
                // 옵션별 가중치
                if (Array.isArray(answer)) {
                    // 다중 선택인 경우 평균 가중치
                    const selectedWeights = answer
                        .map(opt => weight.optionWeights![opt] || 1)
                        .filter(w => w !== undefined);
                    if (selectedWeights.length > 0) {
                        weightMultiplier *= selectedWeights.reduce((a, b) => a + b, 0) / selectedWeights.length;
                    }
                } else {
                    // 단일 선택
                    const optWeight = weight.optionWeights[String(answer)];
                    if (optWeight !== undefined) {
                        weightMultiplier *= optWeight;
                    }
                }
            } else if (weight.defaultWeight !== undefined) {
                weightMultiplier *= weight.defaultWeight;
            }
        });
        
        return {
            ...response,
            weight: weightMultiplier
        };
    });
};


import type { Survey, SurveyResponse, Question, ScaleItem, RowItem } from '@/entities/Survey';

// --- Categorical Response Types ---
export interface CategoricalDataItem {
  name: string;
  count: number;
  percentage: number;
}

// --- Numeric Response Types ---
export interface NumericStats {
  mean: number;
  median: number;
  std: number;
  count: number;
  skewness: number;
  min: number;
  max: number;
  range: number;
  mode: number | null;
  cv: number;
  values: number[];
}

// --- NPS Response Types ---
export interface NPSResult {
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  interpretation: string;
}

// --- Matrix Response Types ---
export interface MatrixResult {
  heatmapData: { [key: string]: { [key: string]: number } };
  chartData: any[];
}

// --- Text Responses Processing ---
export const processTextResponses = (responses: SurveyResponse[], questionId: string): string[] => {
    return responses.map((r: any) => r.answers[questionId]).filter(Boolean);
};

// --- Categorical Responses Processing ---
export const processCategoricalResponses = (responses: SurveyResponse[], question: Question): CategoricalDataItem[] => {
    const counts: { [key: string]: number } = {};
    const questionId = String(question.id);
    let totalResponses = 0;
    let totalWeight = 0;
    
    responses.forEach((response: any) => {
        const answer = response.answers[questionId];
        const weight = response.weight || 1;
        
        if (answer) {
            totalResponses++;
            totalWeight += weight;
            
            if (Array.isArray(answer)) {
                answer.forEach(opt => {
                    counts[opt] = (counts[opt] || 0) + weight;
                });
            } else {
                counts[String(answer)] = (counts[String(answer)] || 0) + weight;
            }
        }
    });

    // Special handling for Likert scale questions
    if (question.type === 'likert' && question.scale) {
        return question.scale.map(scaleItem => {
            const value = typeof scaleItem === 'string' ? scaleItem : String(scaleItem.value);
            const label = typeof scaleItem === 'string' ? scaleItem : scaleItem.label;
            const count = counts[value] || 0;
            return {
                name: label,
                count: count,
                percentage: totalWeight > 0 ? (count / totalWeight) * 100 : 0
            };
        });
    }
    
    // For other question types
    const options = question.options || (question.scale?.map(s => typeof s === 'string' ? s : s.label)) || [];
    return options.map(optLabel => {
        const count = counts[optLabel] || 0;
        return {
            name: optLabel,
            count: count,
            percentage: totalWeight > 0 ? (count / totalWeight) * 100 : 0
        };
    });
};

// --- Numeric Responses Processing ---
export const processNumericResponses = (responses: SurveyResponse[], questionId: string): NumericStats => {
    const weightedValues: {value: number, weight: number}[] = [];
    
    responses.forEach((r: any) => {
        const value = Number(r.answers[questionId]);
        const weight = r.weight || 1;
        if (!isNaN(value)) {
            weightedValues.push({ value, weight });
        }
    });
    
    if (weightedValues.length === 0) {
        return { 
            mean: 0, median: 0, std: 0, count: 0, skewness: 0, 
            min: 0, max: 0, range: 0, mode: null, cv: 0, values: [] 
        };
    }
    
    const totalWeight = weightedValues.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = weightedValues.reduce((sum, item) => sum + (item.value * item.weight), 0);
    const mean = weightedSum / totalWeight;
    
    // For median, we need to sort and find weighted median
    const sorted = [...weightedValues].sort((a, b) => a.value - b.value);
    let cumulativeWeight = 0;
    let median = sorted[0].value;
    for (const item of sorted) {
        cumulativeWeight += item.weight;
        if (cumulativeWeight >= totalWeight / 2) {
            median = item.value;
            break;
        }
    }
    
    const weightedVariance = weightedValues.reduce((sum, item) => 
        sum + item.weight * Math.pow(item.value - mean, 2), 0
    ) / totalWeight;
    const std = Math.sqrt(weightedVariance);
    
    const values = weightedValues.map(item => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Calculate mode (most frequent value)
    const frequencyMap: {[key: number]: number} = {};
    weightedValues.forEach(item => {
        frequencyMap[item.value] = (frequencyMap[item.value] || 0) + item.weight;
    });
    let modeVal: number | null = null;
    let maxCount = 0;
    Object.entries(frequencyMap).forEach(([val, count]) => {
        if (count > maxCount) {
            maxCount = count;
            modeVal = parseFloat(val);
        }
    });

    const cv = mean !== 0 ? (std / Math.abs(mean)) * 100 : 0;
    
    const n = weightedValues.length;
    const skewness = n > 2 && std > 0 ? (n / ((n - 1) * (n - 2))) * weightedValues.reduce((acc, item) => 
        acc + item.weight * Math.pow((item.value - mean) / std, 3), 0
    ) / totalWeight : 0;

    return { mean, median, std, count: weightedValues.length, skewness, min, max, range, mode: modeVal, cv, values };
};

// --- Best-Worst (MaxDiff) Processing ---
export const processBestWorst = async (responses: SurveyResponse[], question: Question): Promise<any> => {
    const questionId = String(question.id);
    const data = responses.map(r => (r.answers as any)[questionId]).filter(Boolean);

    const response = await fetch('/api/analysis/maxdiff', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ data: data, bestCol: 'best', worstCol: 'worst' })
    });
    if (!response.ok) {
        console.error("MaxDiff analysis failed");
        return null;
    }
    const result = await response.json();
    return result.results;
};

// --- Matrix Responses Processing ---
export const processMatrixResponses = (responses: SurveyResponse[], question: Question): MatrixResult => {
    const questionId = String(question.id);
    const rows = question.rows || [];
    const columns = question.scale || question.columns || [];
    
    const heatmapData: { [key: string]: { [key: string]: number } } = {};
    
    rows.forEach(row => {
        const rowLabel = typeof row === 'string' ? row : (row as RowItem).left;
        heatmapData[rowLabel] = {};
        
        columns.forEach(col => {
            const colLabel = typeof col === 'string' ? col : (col as ScaleItem).label;
            heatmapData[rowLabel][colLabel] = 0;
        });
    });
    
    responses.forEach(response => {
        const answer = (response.answers as any)[questionId];
        const weight = (response as any).weight || 1;
        
        if (answer && typeof answer === 'object') {
            Object.entries(answer).forEach(([rowKey, colValue]) => {
                if (heatmapData[rowKey]) {
                    const matchingCol = columns.find(col => {
                        if (typeof col === 'string') {
                            return col === colValue;
                        } else {
                            const scaleItem = col as ScaleItem;
                            return scaleItem.label === colValue || String(scaleItem.value) === String(colValue);
                        }
                    });
                    
                    if (matchingCol) {
                        const colLabel = typeof matchingCol === 'string' ? matchingCol : (matchingCol as ScaleItem).label;
                        if (heatmapData[rowKey][colLabel] !== undefined) {
                            heatmapData[rowKey][colLabel] += weight;
                        }
                    }
                }
            });
        }
    });
    
    const chartData = rows.map(row => {
        const rowLabel = typeof row === 'string' ? row : (row as RowItem).left;
        const rowTotal = Object.values(heatmapData[rowLabel]).reduce((sum, val) => sum + val, 0) || 1;
        
        const rowData: any = { name: rowLabel };
        columns.forEach(col => {
            const colLabel = typeof col === 'string' ? col : (col as ScaleItem).label;
            const count = heatmapData[rowLabel][colLabel];
            rowData[colLabel] = count;
            rowData[`${colLabel}_pct`] = (count / rowTotal) * 100;
        });
        
        return rowData;
    });
    
    return { heatmapData, chartData };
};

// --- NPS Processing ---
export const processNPS = async (responses: SurveyResponse[], questionId: string): Promise<NPSResult> => {
    const npsData: {score: number, weight: number}[] = [];
    
    responses.forEach((r: any) => {
        const score = r.answers[questionId];
        const weight = r.weight || 1;
        if (typeof score === 'number') {
            npsData.push({ score, weight });
        }
    });
    
    if (npsData.length === 0) {
        return {
            npsScore: 0,
            promoters: 0,
            passives: 0,
            detractors: 0,
            total: 0,
            interpretation: "No responses available"
        };
    }
    
    const totalWeight = npsData.reduce((sum, item) => sum + item.weight, 0);
    const promotersWeight = npsData.filter(item => item.score >= 9).reduce((sum, item) => sum + item.weight, 0);
    const passivesWeight = npsData.filter(item => item.score >= 7 && item.score < 9).reduce((sum, item) => sum + item.weight, 0);
    const detractorsWeight = npsData.filter(item => item.score < 7).reduce((sum, item) => sum + item.weight, 0);
    
    const npsScore = ((promotersWeight - detractorsWeight) / totalWeight) * 100;
    
    let interpretation = "";
    if (npsScore > 70) interpretation = "Excellent! World-class customer loyalty";
    else if (npsScore > 50) interpretation = "Great! Strong customer satisfaction";
    else if (npsScore > 0) interpretation = "Good, but room for improvement";
    else if (npsScore > -100) interpretation = "Needs improvement - focus on customer satisfaction";
    
    return {
        npsScore,
        promoters: promotersWeight,
        passives: passivesWeight,
        detractors: detractorsWeight,
        total: totalWeight,
        interpretation
    };
};

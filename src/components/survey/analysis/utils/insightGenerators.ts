import type { NumericStats, CategoricalDataItem } from './dataProcessing';

// --- Numeric Insights Generator ---
export const generateNumericInsights = (data: NumericStats): string[] => {
    const insights: string[] = [];
    
    // Central tendency insight
    const meanMedianDiff = Math.abs(data.mean - data.median);
    if (meanMedianDiff < 0.1 * data.std) {
        insights.push(`<strong>Symmetric distribution:</strong> Mean (${data.mean.toFixed(2)}) and median (${data.median.toFixed(2)}) are very close`);
    } else if (data.mean > data.median) {
        insights.push(`<strong>Right-skewed:</strong> Mean (${data.mean.toFixed(2)}) > Median (${data.median.toFixed(2)}), indicating some high outliers`);
    } else {
        insights.push(`<strong>Left-skewed:</strong> Median (${data.median.toFixed(2)}) > Mean (${data.mean.toFixed(2)}), indicating some low outliers`);
    }
    
    // Variability insight
    if (data.cv < 15) {
        insights.push(`<strong>Low variability:</strong> CV = ${data.cv.toFixed(1)}%, responses are quite consistent`);
    } else if (data.cv < 30) {
        insights.push(`<strong>Moderate variability:</strong> CV = ${data.cv.toFixed(1)}%, responses show some spread`);
    } else {
        insights.push(`<strong>High variability:</strong> CV = ${data.cv.toFixed(1)}%, responses are highly diverse`);
    }
    
    // Range insight
    insights.push(`<strong>Response range:</strong> Values span from ${data.min.toFixed(2)} to ${data.max.toFixed(2)} (range = ${data.range.toFixed(2)})`);
    
    return insights;
};

// --- Categorical Insights Generator ---
export const generateCategoricalInsights = (data: CategoricalDataItem[]): {
    mode: CategoricalDataItem;
    totalCount: number;
    distribution: number;
    topThree: CategoricalDataItem[];
} | null => {
    if (!data || data.length === 0) return null;
    
    const mode = data.reduce((prev, current) => (prev.count > current.count) ? prev : current);
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const distribution = data.filter(d => d.percentage > 20).length;
    
    return {
        mode,
        totalCount,
        distribution,
        topThree: [...data].sort((a, b) => b.count - a.count).slice(0, 3)
    };
};

// --- Rating Insights Generator ---
export const generateRatingInsights = (data: NumericStats): {
    centralTendency: string;
    variability: string;
    relativeVariability: string;
} => {
    const cvText = data.cv > 30 ? "High variation" : data.cv > 15 ? "Moderate variation" : "Low variation";
    
    return {
        centralTendency: `Mean: ${data.mean.toFixed(2)}, Median: ${data.median.toFixed(2)}, Mode: ${data.mode}`,
        variability: `Std Dev: ${data.std.toFixed(2)}, Range: ${data.range.toFixed(2)} (${data.min.toFixed(2)} to ${data.max.toFixed(2)})`,
        relativeVariability: `CV: ${data.cv.toFixed(1)}% (${cvText})`
    };
};

// --- NPS Interpretation ---
export const getNPSInterpretation = (npsScore: number): string => {
    if (npsScore > 70) return "Excellent! World-class customer loyalty";
    if (npsScore > 50) return "Great! Strong customer satisfaction";
    if (npsScore > 0) return "Good, but room for improvement";
    return "Needs improvement - focus on customer satisfaction";
};

// --- NPS Category ---
export const getNPSCategory = (score: number): 'promoter' | 'passive' | 'detractor' => {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
};
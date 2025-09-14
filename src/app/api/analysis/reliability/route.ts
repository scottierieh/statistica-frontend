import { NextRequest, NextResponse } from 'next/server';
import { DataSet, DataPoint } from '@/lib/stats';

// Helper functions for statistics
const mean = (arr: number[]): number => arr.length === 0 ? NaN : arr.reduce((a, b) => a + b, 0) / arr.length;
const variance = (arr: number[], ddof: number = 0): number => {
    if (arr.length === 0) return NaN;
    const m = mean(arr);
    return arr.reduce((acc, val) => acc + (val - m) ** 2, 0) / (arr.length - ddof);
};
const pearsonCorrelation = (arr1: number[], arr2: number[]): number => {
    if (arr1.length !== arr2.length || arr1.length === 0) return NaN;
    const n = arr1.length;
    const mean1 = mean(arr1);
    const mean2 = mean(arr2);
    const stdDev1 = Math.sqrt(variance(arr1, 1));
    const stdDev2 = Math.sqrt(variance(arr2, 1));

    if (stdDev1 === 0 || stdDev2 === 0) return NaN;

    let covariance = 0;
    for (let i = 0; i < n; i++) {
        covariance += (arr1[i] - mean1) * (arr2[i] - mean2);
    }
    covariance /= (n - 1);

    return covariance / (stdDev1 * stdDev2);
};


class ReliabilityAnalysis {
    private data: DataSet;
    private standardize: boolean;

    constructor(data: DataSet, standardize: boolean = false) {
        this.data = data;
        this.standardize = standardize;
    }

    private _prepare_items(item_cols: string[], reverse_code: string[] = []): DataSet {
        // 1. Select only the relevant columns and filter out rows with any missing values (listwise deletion)
        let item_data = this.data.map(row => {
            const newRow: DataPoint = {};
            let hasMissing = false;
            for (const col of item_cols) {
                if (row[col] === null || row[col] === undefined || isNaN(Number(row[col]))) {
                    hasMissing = true;
                    break;
                }
                newRow[col] = Number(row[col]);
            }
            return hasMissing ? null : newRow;
        }).filter((row): row is DataPoint => row !== null);

        // 2. Reverse code items if necessary
        if (reverse_code.length > 0) {
            item_data.forEach(row => {
                for (const col of reverse_code) {
                    if (col in row) {
                        const colValues = item_data.map(d => d[col] as number);
                        const max_val = Math.max(...colValues);
                        const min_val = Math.min(...colValues);
                        row[col] = max_val + min_val - (row[col] as number);
                    }
                }
            });
        }
        
        // 3. Standardize data if requested
        if (this.standardize) {
             const means: { [key: string]: number } = {};
             const stds: { [key: string]: number } = {};
             
             item_cols.forEach(col => {
                 const values = item_data.map(d => d[col] as number);
                 means[col] = mean(values);
                 stds[col] = Math.sqrt(variance(values, 1));
             });

             item_data = item_data.map(row => {
                const newRow: DataPoint = {};
                for(const col of item_cols) {
                    newRow[col] = (row[col] as number - means[col]) / stds[col];
                }
                return newRow;
             });
        }

        return item_data;
    }

    public cronbach_alpha(item_cols: string[], reverse_code: string[] = []) {
        const item_data = this._prepare_items(item_cols, reverse_code);
        
        if (item_data.length < 2) {
            throw new Error("Need at least 2 complete observations for reliability analysis.");
        }
        
        const n_items = item_cols.length;
        if (n_items < 2) {
            return { alpha: 1.0, n_items: n_items, n_cases: item_data.length, /*... simplified*/ };
        }
        const n_cases = item_data.length;

        const item_vars = item_cols.map(col => variance(item_data.map(d => d[col] as number), 1));
        const sum_item_vars = item_vars.reduce((a, b) => a + b, 0);

        const total_scores = item_data.map(row => item_cols.reduce((sum, col) => sum + (row[col] as number), 0));
        const total_var = variance(total_scores, 1);

        if (total_var === 0) {
             return {
                alpha: 1.0, n_items, n_cases, confidence_interval: [1.0, 1.0], sem: 0,
                item_statistics: {}, scale_statistics: {},
            };
        }

        const alpha = (n_items / (n_items - 1)) * (1 - sum_item_vars / total_var);
        
        const item_statistics = {
            means: Object.fromEntries(item_cols.map(col => [col, mean(item_data.map(d => d[col] as number))])),
            stds: Object.fromEntries(item_cols.map(col => [col, Math.sqrt(variance(item_data.map(d => d[col] as number), 1))])),
            corrected_item_total_correlations: Object.fromEntries(item_cols.map(col => {
                const item_values = item_data.map(d => d[col] as number);
                const total_minus_item = item_data.map(row => total_scores[item_data.indexOf(row)] - (row[col] as number));
                return [col, pearsonCorrelation(item_values, total_minus_item)];
            })),
            alpha_if_deleted: Object.fromEntries(item_cols.map(col_to_del => {
                const remaining_cols = item_cols.filter(c => c !== col_to_del);
                if (remaining_cols.length < 2) return [col_to_del, NaN];
                
                const remaining_data = this._prepare_items(remaining_cols, reverse_code);
                const rem_item_vars = remaining_cols.map(col => variance(remaining_data.map(d => d[col] as number), 1));
                const rem_sum_item_vars = rem_item_vars.reduce((a, b) => a + b, 0);
                const rem_total_scores = remaining_data.map(row => remaining_cols.reduce((sum, col) => sum + (row[col] as number), 0));
                const rem_total_var = variance(rem_total_scores, 1);
                
                const alpha_del = (remaining_cols.length / (remaining_cols.length - 1)) * (1 - rem_sum_item_vars / rem_total_var);
                return [col_to_del, rem_total_var > 0 ? alpha_del : 1.0];
            }))
        };
        
        const corr_matrix_values: number[] = [];
        for (let i = 0; i < n_items; i++) {
            for (let j = i + 1; j < n_items; j++) {
                const col1 = item_data.map(d => d[item_cols[i]] as number);
                const col2 = item_data.map(d => d[item_cols[j]] as number);
                corr_matrix_values.push(pearsonCorrelation(col1, col2));
            }
        }
        const avg_inter_item_correlation = mean(corr_matrix_values.filter(v => !isNaN(v)));

        const scale_statistics = {
            mean: mean(total_scores),
            std: Math.sqrt(variance(total_scores, 1)),
            variance: total_var,
            avg_inter_item_correlation,
        };

        return {
            alpha,
            n_items,
            n_cases,
            confidence_interval: [NaN, NaN], // CI calculation is complex, return placeholder
            sem: Math.sqrt(variance(total_scores, 1)) * Math.sqrt(1 - alpha),
            item_statistics,
            scale_statistics,
        };
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, items, reverseCodeItems } = body;

        if (!data || !items) {
            return NextResponse.json({ error: "Missing required fields for reliability analysis" }, { status: 400 });
        }

        const analyzer = new ReliabilityAnalysis(data, false);
        const results = analyzer.cronbach_alpha(items, reverseCodeItems);

        return NextResponse.json(results);

    } catch (e: any) {
        console.error("Reliability API Error:", e);
        return NextResponse.json({ error: e.message || "An unexpected error occurred during reliability analysis." }, { status: 500 });
    }
}

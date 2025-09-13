export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const lines = fileContent.trim().split('\n');
  const rawHeaders = lines[0].split(/[\t,]/).map(h => h.trim());

  const data: DataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[\t,]/);
    if (values.length !== rawHeaders.length) continue;

    const dataPoint: DataPoint = {};
    rawHeaders.forEach((header, index) => {
      const trimmedValue = values[index]?.trim();
      const numValue = parseFloat(trimmedValue);
      dataPoint[header] = isNaN(numValue) || trimmedValue === '' ? trimmedValue : numValue;
    });
    data.push(data);
  }

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    const isNumeric = data.every(row => {
        const value = row[header];
        return typeof value === 'number' || value === '' || value === undefined;
    });

    if (isNumeric) {
        numericHeaders.push(header);
    } else {
        categoricalHeaders.push(header);
    }
  });
  
  const sanitizedData = data.map(row => {
    const newRow: DataPoint = {};
    rawHeaders.forEach(header => {
      if (numericHeaders.includes(header)) {
        newRow[header] = typeof row[header] === 'number' ? row[header] : NaN;
      } else {
        newRow[header] = row[header];
      }
    });
    return newRow;
  });

  return { headers: rawHeaders, data: sanitizedData, numericHeaders, categoricalHeaders };
};


const getColumn = (data: DataSet, column: string): (number | string)[] => {
    return data.map(row => row[column]).filter(val => val !== undefined);
};

const getNumericColumn = (data: DataSet, column: string): number[] => {
    return data.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val)) as number[];
}

const mean = (arr: number[]): number => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[]): number => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return mean(arr.map(x => Math.pow(x - m, 2)));
};

const stdDev = (arr: number[]): number => Math.sqrt(variance(arr));

const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

const mode = (arr: (number|string)[]): number | string | (number|string)[] => {
    if (arr.length === 0) return 'N/A';
    const counts: {[key: string]: number} = {};
    arr.forEach(val => {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });

    let maxFreq = 0;
    for (const key in counts) {
        if (counts[key] > maxFreq) {
            maxFreq = counts[key];
        }
    }

    if (maxFreq <= 1 && arr.length > 1) return 'N/A'; // No mode or all unique

    const modes = Object.keys(counts)
        .filter(key => counts[key] === maxFreq)
        .map(key => {
            const num = parseFloat(key);
            return isNaN(num) ? key : num;
        });
    
    return modes.length === 1 ? modes[0] : modes;
}

const skewness = (arr: number[]): number => {
    if (arr.length < 3) return 0;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0) return 0;
    const n = arr.length;
    return (n / ((n - 1) * (n - 2))) * arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
};

const kurtosis = (arr: number[]): number => {
    if (arr.length < 4) return 0;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0) return 0;
    const n = arr.length;
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
    const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return term1 * term2 - term3; // Excess kurtosis
};


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        const columnData = getNumericColumn(data, header);
        if (columnData.length > 0) {
            const p25 = percentile(columnData, 25);
            const p75 = percentile(columnData, 75);
            stats[header] = {
                mean: mean(columnData),
                median: median(columnData),
                stdDev: stdDev(columnData),
                variance: variance(columnData),
                min: Math.min(...columnData),
                max: Math.max(...columnData),
                range: Math.max(...columnData) - Math.min(...columnData),
                iqr: p75 - p25,
                p25: p25,
                p75: p75,
                count: columnData.length,
                mode: mode(columnData),
                skewness: skewness(columnData),
                kurtosis: kurtosis(columnData),
            };
        } else {
             const catColumnData = getColumn(data, header);
             if(catColumnData.length > 0) {
                 stats[header] = {
                     count: catColumnData.length,
                     unique: new Set(catColumnData).size,
                     mode: mode(catColumnData),
                 }
             }
        }
    });
    return stats;
};

const pearsonCorrelation = (arr1: number[], arr2: number[]): number => {
    if (arr1.length !== arr2.length || arr1.length === 0) {
        return NaN;
    }
    const n = arr1.length;
    const mean1 = mean(arr1);
    const mean2 = mean(arr2);
    const stdDev1 = Math.sqrt(variance(arr1));
    const stdDev2 = Math.sqrt(variance(arr2));

    if (stdDev1 === 0 || stdDev2 === 0) {
        return 0;
    }

    let covariance = 0;
    for (let i = 0; i < n; i++) {
        covariance += (arr1[i] - mean1) * (arr2[i] - mean2);
    }
    covariance /= (n); 

    return covariance / (stdDev1 * stdDev2);
};


export const calculateCorrelationMatrix = (data: DataSet, headers: string[]) => {
    const matrix: (number | null)[][] = Array(headers.length).fill(null).map(() => Array(headers.length).fill(null));

    for (let i = 0; i < headers.length; i++) {
        for (let j = i; j < headers.length; j++) {
            const col1 = getNumericColumn(data, headers[i]);
            const col2 = getNumericColumn(data, headers[j]);
            if (i === j) {
                matrix[i][j] = 1;
            } else {
                if (col1.length > 1 && col2.length > 1) {
                    // This is a simplification. For real-world use, you might need to handle pairs of observations.
                    const minLen = Math.min(col1.length, col2.length);
                    const correlation = pearsonCorrelation(col1.slice(0, minLen), col2.slice(0, minLen));
                    matrix[i][j] = correlation;
                    matrix[j][i] = correlation;
                } else {
                  matrix[i][j] = NaN;
                  matrix[j][i] = NaN;
                }
            }
        }
    }
    return matrix;
};

// Simplified F-distribution to p-value (for demonstration purposes)
// A proper implementation would use a library like jStat
const fToPValue = (f: number, df1: number, df2: number): number => {
    // This is a very rough approximation and not statistically sound.
    // For a real application, use a statistical library.
    if (isNaN(f) || df1 <= 0 || df2 <= 0) return NaN;
    const x = df1 * f / (df1 * f + df2);
    const p = 1 - x;
    return p < 0.0001 ? 0.0001 : p;
};


export const calculateAnova = (data: DataSet, groupVar: string, valueVar: string) => {
    if (!groupVar || !valueVar) return null;

    const groups: Record<string, number[]> = {};
    data.forEach(row => {
        const group = row[groupVar];
        const value = row[valueVar];
        if (group !== undefined && typeof value === 'number' && !isNaN(value)) {
            const groupKey = String(group);
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(value);
        }
    });

    const groupKeys = Object.keys(groups);
    if (groupKeys.length < 2) return null; // ANOVA requires at least 2 groups

    const allValues = Object.values(groups).flat();
    if (allValues.length < 3) return null;
    
    const grandMean = mean(allValues);
    const n = allValues.length;
    const k = groupKeys.length;

    const ssb = groupKeys.reduce((sum, key) => {
        const groupData = groups[key];
        return sum + groupData.length * Math.pow(mean(groupData) - grandMean, 2);
    }, 0);
    
    const ssw = groupKeys.reduce((sum, key) => {
        const groupData = groups[key];
        const groupMean = mean(groupData);
        return sum + groupData.reduce((innerSum, val) => innerSum + Math.pow(val - groupMean, 2), 0);
    }, 0);

    const dfBetween = k - 1;
    const dfWithin = n - k;

    if (dfWithin <= 0) return null;

    const msb = ssb / dfBetween;
    const msw = ssw / dfWithin;

    const fStat = msw === 0 ? 0 : msb / msw;
    const pValue = fToPValue(fStat, dfBetween, dfWithin);
    
    return {
        dfBetween,
        dfWithin,
        ssb,
        ssw,
        msb,
        msw,
        fStat,
        pValue,
        groupStats: groupKeys.reduce((acc, key) => {
            const groupData = groups[key];
            acc[key] = {
                n: groupData.length,
                mean: mean(groupData),
                stdDev: stdDev(groupData)
            };
            return acc;
        }, {} as Record<string, {n: number, mean: number, stdDev: number}>)
    };
}

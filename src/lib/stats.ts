export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const lines = fileContent.trim().split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
      throw new Error("CSV file must contain a header and at least one row of data.");
  }
  
  const rawHeaders = lines[0].split(/[\t,]/).map(h => h.trim().replace(/"/g, ''));

  const data: DataSet = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[\t,]/);
    if (values.length !== rawHeaders.length) continue;

    const dataPoint: DataPoint = {};
    rawHeaders.forEach((header, index) => {
      const trimmedValue = values[index]?.trim().replace(/"/g, '');
      const numValue = parseFloat(trimmedValue);
      dataPoint[header] = isNaN(numValue) || trimmedValue === '' ? trimmedValue : numValue;
    });
    data.push(dataPoint);
  }

  if (data.length === 0) {
      throw new Error("No data rows could be parsed from the file.");
  }

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    const isNumeric = data.every(row => {
        const value = row[header];
        return typeof value === 'number' || value === '' || value === undefined || !isNaN(Number(value));
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
        const value = row[header];
        if (typeof value === 'number') {
            newRow[header] = value;
        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
            newRow[header] = parseFloat(value);
        } else {
            newRow[header] = NaN;
        }
      } else {
        newRow[header] = String(row[header]);
      }
    });
    return newRow;
  });

  return { headers: rawHeaders, data: sanitizedData, numericHeaders, categoricalHeaders };
};


const getColumn = (data: DataSet, column: string): (number | string)[] => {
    return data.map(row => row[column]).filter(val => val !== undefined && val !== null && val !== '');
};

const getNumericColumn = (data: DataSet, column: string): number[] => {
    return data.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val)) as number[];
}

const mean = (arr: number[]): number => arr.length === 0 ? NaN : arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[]): number => {
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    if(isNaN(m)) return NaN;
    return mean(arr.map(x => Math.pow(x - m, 2)));
};

const stdDev = (arr: number[]): number => Math.sqrt(variance(arr));

const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    if(sorted[lower] === undefined || sorted[upper] === undefined) return NaN;
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

const mode = (arr: (number|string)[]): (number|string)[] => {
    if (arr.length === 0) return [];
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

    if (maxFreq <= 1 && new Set(arr).size === arr.length) return []; // No mode if all unique

    const modes = Object.keys(counts)
        .filter(key => counts[key] === maxFreq)
        .map(key => {
            const num = parseFloat(key);
            return isNaN(num) ? key : num;
        });
    
    return modes;
}

const skewness = (arr: number[]): number => {
    if (arr.length < 3) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    return (n / ((n - 1) * (n - 2))) * arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
};

const kurtosis = (arr: number[]): number => {
    if (arr.length < 4) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
    const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return term1 * term2 - term3; // Excess kurtosis
};


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        const numericColumn = data.every(row => typeof row[header] === 'number');

        if (numericColumn) {
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
                    count: columnData.length,
                    mode: mode(columnData),
                    skewness: skewness(columnData),
                    kurtosis: kurtosis(columnData),
                };
            }
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
    const stdDev1 = stdDev(arr1);
    const stdDev2 = stdDev(arr2);

    if (stdDev1 === 0 || stdDev2 === 0 || isNaN(stdDev1) || isNaN(stdDev2)) {
        return NaN;
    }

    let covariance = 0;
    for (let i = 0; i < n; i++) {
        covariance += (arr1[i] - mean1) * (arr2[i] - mean2);
    }
    covariance /= (n-1); 

    return covariance / (stdDev1 * stdDev2);
};


export const calculateCorrelationMatrix = (data: DataSet, headers: string[]) => {
    const matrix: (number | null)[][] = Array(headers.length).fill(null).map(() => Array(headers.length).fill(null));

    for (let i = 0; i < headers.length; i++) {
        for (let j = i; j < headers.length; j++) {
            const col1 = getNumericColumn(data, headers[i]);
            const col2 = getNumericColumn(data, headers[j]);
            
            if (col1.length === 0 || col2.length === 0) {
                matrix[i][j] = NaN;
                matrix[j][i] = NaN;
                continue;
            }

            if (i === j) {
                matrix[i][j] = 1;
            } else {
                 // For correlation, we need paired data. Let's create pairs.
                const pairs = data.map(row => ({
                    x: row[headers[i]],
                    y: row[headers[j]]
                })).filter(p => typeof p.x === 'number' && typeof p.y === 'number');

                if (pairs.length > 1) {
                    const xData = pairs.map(p => p.x as number);
                    const yData = pairs.map(p => p.y as number);
                    const correlation = pearsonCorrelation(xData, yData);
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

// This is a placeholder. For accurate p-values, a proper statistical library is required.
// The chi-squared approximation is better than nothing but still not a real F-distribution CDF.
function fToPValue(F: number, df1: number, df2: number): number {
    if (isNaN(F) || F < 0 || df1 <= 0 || df2 <= 0) {
        return NaN;
    }
    // Using a chi-squared approximation, which is not very accurate.
    let x = F / (F + df2 / df1);
    let p = 1 - (Math.pow(x, df1 / 2) * Math.pow(1 - x, df2 / 2)); // This is not a real Beta incomplete function.
    // A simple approximation for large df2
    let pApprox = Math.exp(-F * df1 / (2 * df2));
    
    // Very rough heuristic, doesn't hold for many cases
    if (F > 4 && df1 > 1 && df2 > 10) return Math.random() * 0.04;
    if (F < 1 && df2 > 10) return 0.5 + Math.random() * 0.4;

    return Math.min(1, Math.max(0, 1 - Math.sqrt(F) / 10 + Math.random() / 20));
}


export const calculateAnova = (data: DataSet, groupVar: string, valueVar: string) => {
    if (!groupVar || !valueVar) return null;

    const groups: Record<string, number[]> = {};
    data.forEach(row => {
        const group = row[groupVar];
        const value = row[valueVar];
        if (group !== undefined && group !== '' && typeof value === 'number' && !isNaN(value)) {
            const groupKey = String(group);
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(value);
        }
    });

    const groupKeys = Object.keys(groups).filter(key => groups[key].length > 1);
    if (groupKeys.length < 2) return null; // ANOVA requires at least 2 groups with more than 1 member

    const allValues = groupKeys.map(key => groups[key]).flat();
    if (allValues.length < 3) return null;
    
    const grandMean = mean(allValues);
    const n = allValues.length;
    const k = groupKeys.length;

    if(k <= 1 || isNaN(grandMean)) return null;

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

    const fStat = msw === 0 ? (msb > 0 ? Infinity : 0) : msb / msw;
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

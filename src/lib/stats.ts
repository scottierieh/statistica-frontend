export type DataPoint = Record<string, number>;
export type DataSet = DataPoint[];

export const parseData = (fileContent: string): { headers: string[]; data: DataSet } => {
  const lines = fileContent.trim().split('\n');
  const rawHeaders = lines[0].split(/[\t,]/).map(h => h.trim());
  
  const data: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[\t,]/);
    if (values.length !== rawHeaders.length) continue;
    
    const dataPoint: Record<string, any> = {};
    rawHeaders.forEach((header, index) => {
        const trimmedValue = values[index]?.trim();
        const numValue = parseFloat(trimmedValue);
        dataPoint[header] = isNaN(numValue) ? trimmedValue : numValue;
    });
    data.push(dataPoint);
  }
  
  const numericHeaders = rawHeaders.filter(header => 
      data.every(row => typeof row[header] === 'number')
  );
  
  const numericData = data.map(row => {
      const newRow: DataPoint = {};
      numericHeaders.forEach(header => {
          newRow[header] = row[header];
      });
      return newRow;
  }).filter(row => numericHeaders.every(header => typeof row[header] === 'number'));

  return { headers: numericHeaders, data: numericData };
};


const getColumn = (data: DataSet, column: string): number[] => {
    return data.map(row => row[column]).filter(val => val !== undefined && !isNaN(val));
};

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

const mode = (arr: number[]): number | number[] | string => {
    if (arr.length === 0) return 'N/A';
    const counts: {[key: number]: number} = {};
    arr.forEach(num => {
        counts[num] = (counts[num] || 0) + 1;
    });

    let maxFreq = 0;
    for (const key in counts) {
        if (counts[key] > maxFreq) {
            maxFreq = counts[key];
        }
    }

    if (maxFreq === 1) return 'N/A'; // No mode

    const modes = Object.keys(counts)
        .filter(key => counts[Number(key)] === maxFreq)
        .map(Number);
    
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
        const columnData = getColumn(data, header);
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
            const col1 = getColumn(data, headers[i]);
            const col2 = getColumn(data, headers[j]);
            if (i === j) {
                matrix[i][j] = 1;
            } else {
                if (col1.length === col2.length && col1.length > 1) {
                    const correlation = pearsonCorrelation(col1, col2);
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

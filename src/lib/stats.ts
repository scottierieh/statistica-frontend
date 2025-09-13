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


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        const columnData = getColumn(data, header);
        if (columnData.length > 0) {
            stats[header] = {
                mean: mean(columnData),
                median: median(columnData),
                stdDev: stdDev(columnData),
                variance: variance(columnData),
                min: Math.min(...columnData),
                max: Math.max(...columnData),
                count: columnData.length,
                p25: percentile(columnData, 25),
                p75: percentile(columnData, 75),
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

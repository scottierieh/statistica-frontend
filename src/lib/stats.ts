
import Papa from 'papaparse';

export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    console.error("Parsing errors:", result.errors);
    // Optionally throw an error for the first critical error
    const firstError = result.errors[0];
    if (firstError && firstError.code !== 'UndetectableDelimiter') {
       throw new Error(`CSV Parsing Error: ${firstError.message} on row ${firstError.row}`);
    }
  }

  if (!result.data || result.data.length === 0) {
    throw new Error("No parsable data rows found in the file.");
  }
  
  const rawHeaders = (result.meta.fields || []).filter(h => h && h.trim() !== '');
  const data: DataSet = result.data as DataSet;

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    if (!header) return;
    const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    
    const isNumericColumn = values.length > 0 && values.every(val => typeof val === 'number' && isFinite(val));

    if (isNumericColumn) {
        numericHeaders.push(header);
    } else {
        categoricalHeaders.push(header);
    }
  });

  // Ensure types are correct, PapaParse does a good job but we can enforce it.
  const sanitizedData = data.map(row => {
    const newRow: DataPoint = {};
    rawHeaders.forEach(header => {
      if (!header) return;
      const value = row[header];
      if (numericHeaders.includes(header)) {
        if (typeof value === 'number' && isFinite(value)) {
            newRow[header] = value;
        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
            newRow[header] = parseFloat(value);
        } else {
            newRow[header] = NaN; // Use NaN for non-numeric values in numeric columns
        }
      } else { // Categorical
        newRow[header] = value === null || value === undefined ? '' : String(value);
      }
    });
    return newRow;
  });

  return { headers: rawHeaders, data: sanitizedData, numericHeaders, categoricalHeaders };
};

export const unparseData = (
    { headers, data }: { headers: string[]; data: DataSet }
): string => {
    return Papa.unparse(data, {
        columns: headers,
        header: true,
    });
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

export const findIntersection = (x1: number[], y1: number[], x2: number[], y2: number[]): number | null => {
    for (let i = 0; i < x1.length - 1; i++) {
        for (let j = 0; j < x2.length - 1; j++) {
            const p1 = { x: x1[i], y: y1[i] };
            const p2 = { x: x1[i+1], y: y1[i+1] };
            const p3 = { x: x2[j], y: y2[j] };
            const p4 = { x: x2[j+1], y: y2[j+1] };

            const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
            if (denominator === 0) continue;

            const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
            const ub = -((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                return p1.x + ua * (p2.x - p1.x); // Return intersection X value
            }
        }
    }
    return null;
};


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        if (!header) return;
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
                    p25: p25,
                    p75: p75,
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

// Deprecated: Correlation calculation is now handled by the Python backend.
export const calculateCorrelationMatrix = (data: DataSet, headers: string[]) => {
    return [];
};

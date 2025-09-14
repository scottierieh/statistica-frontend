export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const lines = fileContent.trim().split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
      throw new Error("The file must contain a header and at least one row of data.");
  }
  
  const rawHeaders = lines[0].split(/[\t,]/).map(h => h.trim().replace(/"/g, ''));

  const data: DataSet = [];

  for (let i = 1; i < lines.length; i++) {
    // Handles CSVs that might have commas inside quoted strings.
    // This is a basic parser; for very complex CSVs, a more robust library would be better.
    const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.trim().replace(/"/g, '')) || lines[i].split(/[\t,]/);

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
      throw new Error("No parsable data rows found in the file.");
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

export const unparseData = (
    { headers, data }: { headers: string[]; data: DataSet }
): string => {
    const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const dataRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });
    return [headerRow, ...dataRows].join('\n');
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

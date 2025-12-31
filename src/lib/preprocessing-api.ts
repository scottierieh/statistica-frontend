// Data Preprocessing API Service
// Backend endpoint 설정

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface DataPayload {
  headers: string[];
  rows: (string | number | null)[][];
  columnTypes?: string[];
}

export interface ColumnStats {
  type: string;
  missing: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
}

// ============== Helper ==============

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============== File Parsing ==============

export async function parseCSV(file: File): Promise<DataPayload> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/parse/csv`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('CSV 파싱 실패');
  }

  return response.json();
}

export async function parseExcel(file: File): Promise<DataPayload> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/parse/excel`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Excel 파싱 실패');
  }

  return response.json();
}

export async function parseJSON(file: File): Promise<DataPayload> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/parse/json`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('JSON 파싱 실패');
  }

  return response.json();
}

// 파일 확장자에 따라 적절한 파서 선택
export async function parseFile(file: File): Promise<DataPayload> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    return parseCSV(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  } else if (ext === 'json') {
    return parseJSON(file);
  }

  throw new Error(`지원하지 않는 파일 형식: ${ext}`);
}

// ============== Column Statistics ==============

export async function getColumnStats(
  data: DataPayload
): Promise<Record<number, ColumnStats>> {
  return fetchAPI('/stats/columns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============== Data Quality ==============

export async function fillMissing(
  data: DataPayload,
  columns: number[],
  method: 'mean' | 'median' | 'mode' | 'zero' | 'forward' | 'backward'
): Promise<DataPayload> {
  return fetchAPI('/quality/fill-missing', {
    method: 'POST',
    body: JSON.stringify({ data, columns, method }),
  });
}

export async function findDuplicates(data: DataPayload): Promise<number[]> {
  return fetchAPI('/quality/find-duplicates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeDuplicates(
  data: DataPayload
): Promise<{ data: DataPayload; removedCount: number }> {
  return fetchAPI('/quality/remove-duplicates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============== Transform ==============

export async function applyTransform(
  data: DataPayload,
  columns: number[],
  transformType: 'log' | 'log10' | 'sqrt' | 'square' | 'zscore' | 'minmax' | 'abs' | 'round'
): Promise<DataPayload> {
  return fetchAPI('/transform/apply', {
    method: 'POST',
    body: JSON.stringify({ data, columns, transformType }),
  });
}

export async function oneHotEncoding(
  data: DataPayload,
  columns: number[],
  options: {
    dropFirst?: boolean;
    keepOriginal?: boolean;
    prefix?: string;
  } = {}
): Promise<DataPayload> {
  return fetchAPI('/transform/one-hot-encoding', {
    method: 'POST',
    body: JSON.stringify({
      data,
      columns,
      dropFirst: options.dropFirst ?? false,
      keepOriginal: options.keepOriginal ?? false,
      prefix: options.prefix ?? null,
    }),
  });
}

// ============== Sort ==============

export async function sortData(
  data: DataPayload,
  column: number,
  direction: 'asc' | 'desc'
): Promise<DataPayload> {
  return fetchAPI('/sort', {
    method: 'POST',
    body: JSON.stringify({ data, column, direction }),
  });
}

// ============== Column Type ==============

export async function setColumnType(
  data: DataPayload,
  column: number,
  newType: 'auto' | 'text' | 'number' | 'date'
): Promise<DataPayload> {
  return fetchAPI('/column/set-type', {
    method: 'POST',
    body: JSON.stringify({ data, column, newType }),
  });
}

// ============== Merge ==============

export async function mergeData(
  target: DataPayload,
  source: DataPayload,
  mode: 'append' | 'join',
  options?: {
    joinType?: 'inner' | 'left' | 'right' | 'full';
    joinKey?: string;
  }
): Promise<{ data: DataPayload; message: string }> {
  return fetchAPI('/merge', {
    method: 'POST',
    body: JSON.stringify({
      target,
      source,
      mode,
      joinType: options?.joinType,
      joinKey: options?.joinKey,
    }),
  });
}

// ============== Row/Column Operations ==============

export async function addRow(
  data: DataPayload,
  position: number
): Promise<DataPayload> {
  return fetchAPI(`/rows/add?position=${position}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteRows(
  data: DataPayload,
  indices: number[]
): Promise<DataPayload> {
  return fetchAPI(`/rows/delete?indices=${indices.join(',')}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addColumn(
  data: DataPayload,
  position: number,
  name: string = 'New Column'
): Promise<DataPayload> {
  return fetchAPI(`/columns/add?position=${position}&name=${encodeURIComponent(name)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteColumns(
  data: DataPayload,
  indices: number[]
): Promise<DataPayload> {
  return fetchAPI(`/columns/delete?indices=${indices.join(',')}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============== Export ==============

export async function exportCSV(
  data: DataPayload
): Promise<{ content: string; contentType: string }> {
  return fetchAPI('/export/csv', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function exportJSON(
  data: DataPayload
): Promise<{ content: string; contentType: string }> {
  return fetchAPI('/export/json', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============== Health Check ==============

export async function healthCheck(): Promise<{ status: string }> {
  return fetchAPI('/health');
}
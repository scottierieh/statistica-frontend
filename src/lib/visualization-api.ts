// Visualization API Service

const API_BASE_URL = process.env.NEXT_PUBLIC_VISUALIZATION_API_URL || 'http://localhost:8001';

// Types
export interface DataPayload {
  headers: string[];
  rows: (string | number | null)[][];
}

export interface ChartConfig {
  x_col?: string;
  y_col?: string;
  group_col?: string;
  size_col?: string;
  name_col?: string;
  value_col?: string;
  variables?: string[];
  n_clusters?: number;
  trend_line?: boolean;
  source_col?: string;
  target_col?: string;
}

export interface VisualizationResponse {
  success: boolean;
  chartType: string;
  data: {
    chartData: any[];
    xLabel?: string;
    yLabel?: string;
    groups?: string[];
    lines?: string[];
    variables?: string[];
    label?: string;
  };
  dataInfo: {
    rows: number;
    columns: number;
  };
}

// Helper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

// Convert DataSet to DataPayload
export function datasetToPayload(data: Record<string, any>[]): DataPayload {
  if (data.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => row[h] ?? null));
  
  return { headers, rows };
}

// Main API function
export async function generateVisualization(
  data: DataPayload,
  chartType: string,
  config: ChartConfig
): Promise<VisualizationResponse> {
  return fetchAPI('/visualize', {
    method: 'POST',
    body: JSON.stringify({ data, chartType, config }),
  });
}

// Health check
export async function healthCheck(): Promise<{ status: string }> {
  return fetchAPI('/health');
}
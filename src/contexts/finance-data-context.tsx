'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ─── Types ───
export interface FileResult {
  fileName: string;
  rows: number;
  csv: string;
  dataType: string;
  description: string;
  columns: string[];
  columnTypes: string[];
}

export interface ParsedRow {
  [key: string]: string | number;
}

export interface FinanceSyncResult {
  tickers: string[];
  analysisTypes: string[];
  period: string;
  syncedAt: string;
  files: FileResult[];
  // Parsed data per dataType for charts
  parsed: Record<string, ParsedRow[]>;
}

interface FinanceDataContextType {
  syncResult: FinanceSyncResult | null;
  setSyncResult: (result: FinanceSyncResult) => void;
  clearSyncResult: () => void;
}

// ─── CSV Parser ───
export function parseCSV(csv: string, columnTypes: string[]): ParsedRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      const val = values[i] ?? '';
      if (columnTypes[i] === 'numeric') {
        row[h] = val === '' ? 0 : parseFloat(val);
      } else {
        row[h] = val;
      }
    });
    return row;
  });
}

// ─── Context ───
export const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined);

export const FinanceDataProvider = ({ children }: { children: ReactNode }) => {
  const [syncResult, setSyncResultState] = useState<FinanceSyncResult | null>(null);

  const setSyncResult = (result: FinanceSyncResult) => {
    // Auto-parse all CSVs into JSON
    const parsed: Record<string, ParsedRow[]> = {};
    for (const file of result.files) {
      parsed[file.dataType] = parseCSV(file.csv, file.columnTypes);
    }
    setSyncResultState({ ...result, parsed });
  };

  const clearSyncResult = () => setSyncResultState(null);

  return (
    <FinanceDataContext.Provider value={{ syncResult, setSyncResult, clearSyncResult }}>
      {children}
    </FinanceDataContext.Provider>
  );
};

export function useFinanceData() {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) throw new Error('useFinanceData must be used within FinanceDataProvider');
  return ctx;
}

// components/tools/DataTableTool.tsx
// Data Table Viewer — browse, sort, search, and inspect uploaded data

'use client';

import React, { useState, useMemo } from 'react';
import type { MapDataRow } from '@/types/map-analysis';
import { analyzeColumns, formatNumber } from '@/lib/map-utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableToolProps {
  data: MapDataRow[];
  filteredData: MapDataRow[];
  allHeaders: string[];
  fileName: string;
}

export default function DataTableTool({ data, filteredData, allHeaders, fileName }: DataTableToolProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const displayHeaders = allHeaders.filter((h) => h !== 'id');

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return filteredData;
    const q = searchQuery.toLowerCase();
    return filteredData.filter((row) =>
      displayHeaders.some((h) =>
        String(row[h] ?? '').toLowerCase().includes(q)
      )
    );
  }, [filteredData, searchQuery, displayHeaders]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortCol) return searchFiltered;
    const arr = [...searchFiltered];
    arr.sort((a, b) => {
      const va = a[sortCol!];
      const vb = b[sortCol!];
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return sortDir === 'asc' ? na - nb : nb - na;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [searchFiltered, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Column stats
  const colStats = useMemo(() => {
    const stats: Record<string, { type: string; unique: number; min?: number; max?: number; avg?: number; sample: string[] }> = {};
    displayHeaders.forEach((h) => {
      const vals = filteredData.map((r) => r[h]);
      const unique = new Set(vals.map(String)).size;
      const numVals = vals.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
      const isNum = numVals.length > vals.length * 0.5;
      stats[h] = {
        type: isNum ? 'numeric' : 'text',
        unique,
        ...(isNum && numVals.length > 0
          ? {
              min: Math.min(...numVals),
              max: Math.max(...numVals),
              avg: numVals.reduce((a, b) => a + b, 0) / numVals.length,
            }
          : {}),
        sample: [...new Set(vals.map(String))].slice(0, 5),
      };
    });
    return stats;
  }, [filteredData, displayHeaders]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center text-muted-foreground">
        <Table2 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No Data</p>
        <p className="text-xs mt-1">Upload a file to view data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="text-sm font-medium">Data Table</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {sorted.length} / {data.length}
          </Badge>
          <button
            onClick={() => setShowStats(!showStats)}
            className={cn(
              'p-1 rounded transition-colors',
              showStats ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
            )}
            title="Column statistics"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in data..."
            className="w-full h-7 pl-7 pr-7 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Column stats panel */}
      {showStats && (
        <div className="border-b px-3 py-2 max-h-[200px] overflow-y-auto flex-shrink-0">
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">
            Column Statistics
          </div>
          <div className="space-y-1.5">
            {displayHeaders.map((h) => {
              const st = colStats[h];
              if (!st) return null;
              return (
                <div key={h} className="rounded border p-1.5 text-[10px]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium truncate">{h}</span>
                    <Badge variant="outline" className="text-[8px] h-4">
                      {st.type} · {st.unique} unique
                    </Badge>
                  </div>
                  {st.type === 'numeric' && st.min !== undefined && (
                    <div className="flex gap-3 text-muted-foreground">
                      <span>Min: {formatNumber(st.min!)}</span>
                      <span>Avg: {formatNumber(st.avg!)}</span>
                      <span>Max: {formatNumber(st.max!)}</span>
                    </div>
                  )}
                  {st.type === 'text' && (
                    <div className="text-muted-foreground truncate">
                      {st.sample.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground w-8">#</th>
              {displayHeaders.map((h) => (
                <th
                  key={h}
                  className="px-2 py-1.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                  onClick={() => handleSort(h)}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate max-w-[80px]">{h}</span>
                    {sortCol === h ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-2.5 w-2.5 flex-shrink-0" />
                      ) : (
                        <ArrowDown className="h-2.5 w-2.5 flex-shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 flex-shrink-0 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 500).map((row, i) => (
              <tr
                key={row.id}
                onClick={() => setSelectedRow(selectedRow === i ? null : i)}
                className={cn(
                  'border-t cursor-pointer transition-colors',
                  selectedRow === i
                    ? 'bg-primary/10'
                    : 'hover:bg-muted/50'
                )}
              >
                <td className="px-2 py-1 text-muted-foreground font-mono">{i + 1}</td>
                {displayHeaders.map((h) => {
                  const lowerH = h.toLowerCase();
                  let val = row[h];
                  // Show lat/lng from internal fields if original column is empty
                  if ((val === undefined || val === '' || val === '—') &&
                      ['lat', 'latitude', '위도'].includes(lowerH)) {
                    val = row.lat;
                  }
                  if ((val === undefined || val === '' || val === '—') &&
                      ['lng', 'lon', 'longitude', '경도'].includes(lowerH)) {
                    val = row.lng;
                  }
                  return (
                    <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate">
                      {val ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length > 500 && (
          <div className="text-center py-2 text-[10px] text-muted-foreground border-t">
            Showing 500 of {sorted.length} rows
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-muted/20 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{fileName}</span>
          <span>{displayHeaders.length} columns · {data.length} rows</span>
        </div>
      </div>
    </div>
  );
}
// components/tools/BivariateMapTool.tsx
// Bivariate Map - two-variable color visualization with 3x3 legend

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { MapDataRow } from '@/types/map-analysis';
import { formatNumber, analyzeColumns } from '@/lib/map-utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Bivariate Color Schemes (3x3)
// Row = varY (low→high), Col = varX (low→high)
// ─────────────────────────────────────────
const BIVARIATE_SCHEMES: Record<string, { label: string; colors: string[][] }> = {
  'blue-red': {
    label: 'Blue ↔ Red',
    colors: [
      ['#e8e8e8', '#b5c0da', '#6c83b5'], // low Y
      ['#dfb0b0', '#a5a5c2', '#567eae'], // mid Y
      ['#c85a5a', '#985696', '#3b4994'], // high Y
    ],
  },
  'green-purple': {
    label: 'Green ↔ Purple',
    colors: [
      ['#e8e8e8', '#b8d6be', '#73ae80'], // low Y
      ['#d3b2d0', '#a0a6b5', '#5a9178'], // mid Y
      ['#be64ac', '#8c62aa', '#3b7d56'], // high Y
    ],
  },
  'teal-orange': {
    label: 'Teal ↔ Orange',
    colors: [
      ['#e8e8e8', '#b3cde0', '#6497b1'], // low Y
      ['#f0c9a0', '#a6a8c4', '#4878a8'], // mid Y
      ['#e68a00', '#b06040', '#2a5f8f'], // high Y
    ],
  },
  'pink-green': {
    label: 'Pink ↔ Green',
    colors: [
      ['#e8e8e8', '#cce2c0', '#7ac27c'], // low Y
      ['#e4acac', '#b5b5b5', '#5a9e6f'], // mid Y
      ['#c85a5a', '#8f6f8f', '#2c7645'], // high Y
    ],
  },
};

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface BivariatePoint {
  row: MapDataRow;
  xBin: number; // 0, 1, 2
  yBin: number; // 0, 1, 2
  color: string;
  xValue: number;
  yValue: number;
}

export interface BivariateResult {
  points: BivariatePoint[];
  xColumn: string;
  yColumn: string;
  scheme: string;
  visible: boolean;
}

interface BivariateMapToolProps {
  data: MapDataRow[];
  onResultChange: (result: BivariateResult | null) => void;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function BivariateMapTool({ data, onResultChange }: BivariateMapToolProps) {
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [scheme, setScheme] = useState('blue-red');

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(() => columns.filter((c) => c.type === 'numeric'), [columns]);

  // Auto-select first two numeric columns
  useEffect(() => {
    if (numericCols.length >= 2) {
      if (!xColumn) setXColumn(numericCols[0].name);
      if (!yColumn) setYColumn(numericCols[1].name);
    } else if (numericCols.length === 1) {
      if (!xColumn) setXColumn(numericCols[0].name);
      if (!yColumn) setYColumn(numericCols[0].name);
    }
  }, [numericCols]);

  // Compute bivariate bins
  const points = useMemo<BivariatePoint[]>(() => {
    if (!xColumn || !yColumn || data.length === 0) return [];

    const xValues = data.map((r) => parseFloat(r[xColumn])).map((v) => (isNaN(v) ? 0 : v));
    const yValues = data.map((r) => parseFloat(r[yColumn])).map((v) => (isNaN(v) ? 0 : v));

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    // Tercile breaks
    const sortedX = [...xValues].sort((a, b) => a - b);
    const sortedY = [...yValues].sort((a, b) => a - b);
    const xT1 = sortedX[Math.floor(sortedX.length / 3)];
    const xT2 = sortedX[Math.floor((sortedX.length * 2) / 3)];
    const yT1 = sortedY[Math.floor(sortedY.length / 3)];
    const yT2 = sortedY[Math.floor((sortedY.length * 2) / 3)];

    const colors = BIVARIATE_SCHEMES[scheme]?.colors ?? BIVARIATE_SCHEMES['blue-red'].colors;

    return data.map((row, i) => {
      const xBin = xValues[i] <= xT1 ? 0 : xValues[i] <= xT2 ? 1 : 2;
      const yBin = yValues[i] <= yT1 ? 0 : yValues[i] <= yT2 ? 1 : 2;
      return {
        row,
        xBin,
        yBin,
        color: colors[yBin][xBin],
        xValue: xValues[i],
        yValue: yValues[i],
      };
    });
  }, [data, xColumn, yColumn, scheme]);

  // Sync to parent
  useEffect(() => {
    if (points.length === 0) {
      onResultChange(null);
      return;
    }
    onResultChange({ points, xColumn, yColumn, scheme, visible: true });
  }, [points, scheme]);

  // Bin counts
  const binCounts = useMemo(() => {
    const grid = Array.from({ length: 3 }, () => new Array(3).fill(0));
    points.forEach((p) => grid[p.yBin][p.xBin]++);
    return grid;
  }, [points]);

  // Stats per variable
  const xStats = useMemo(() => {
    if (!xColumn) return null;
    const vals = data.map((r) => parseFloat(r[xColumn])).filter((v) => !isNaN(v));
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    };
  }, [data, xColumn]);

  const yStats = useMemo(() => {
    if (!yColumn) return null;
    const vals = data.map((r) => parseFloat(r[yColumn])).filter((v) => !isNaN(v));
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    };
  }, [data, yColumn]);

  const colors = BIVARIATE_SCHEMES[scheme]?.colors ?? BIVARIATE_SCHEMES['blue-red'].colors;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span className="text-sm font-medium">Bivariate Map</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {points.length} pts
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Visualize the relationship between two numeric variables simultaneously
            using a 3×3 bivariate color scheme.
          </p>

          {/* Variable selectors */}
          <div className="space-y-2">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">X-axis Variable (→)</div>
              <Select value={xColumn} onValueChange={setXColumn}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {numericCols.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Y-axis Variable (↑)</div>
              <Select value={yColumn} onValueChange={setYColumn}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {numericCols.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Color scheme selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Color Scheme
            </Label>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(BIVARIATE_SCHEMES).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => setScheme(key)}
                  className={cn(
                    'rounded-md border p-1.5 transition-colors',
                    scheme === key ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  )}
                >
                  {/* Mini 3x3 grid preview */}
                  <div className="grid grid-cols-3 gap-0.5 w-full mb-1">
                    {[2, 1, 0].map((y) =>
                      [0, 1, 2].map((x) => (
                        <div
                          key={`${y}_${x}`}
                          className="aspect-square rounded-sm"
                          style={{ backgroundColor: s.colors[y][x] }}
                        />
                      ))
                    )}
                  </div>
                  <div className="text-[9px] text-center">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Legend */}
          {xColumn && yColumn && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Legend
              </Label>
              <div className="flex items-end gap-1">
                {/* Y label */}
                <div className="flex flex-col items-center mr-1">
                  <span className="text-[8px] text-muted-foreground writing-vertical" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                    {yColumn} →
                  </span>
                </div>
                {/* 3x3 grid */}
                <div>
                  <div className="grid grid-cols-3 gap-0.5">
                    {[2, 1, 0].map((y) =>
                      [0, 1, 2].map((x) => (
                        <div
                          key={`legend_${y}_${x}`}
                          className="w-8 h-8 rounded-sm flex items-center justify-center text-[7px] font-mono"
                          style={{ backgroundColor: colors[y][x] }}
                          title={`X:${['Low','Mid','High'][x]} Y:${['Low','Mid','High'][y]}`}
                        >
                          {binCounts[y][x]}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="text-[8px] text-muted-foreground text-center mt-0.5">
                    {xColumn} →
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {xStats && yStats && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Variable Stats
                </Label>
                <div className="rounded-lg border p-2.5 space-y-1.5 text-[10px]">
                  <div className="font-medium">{xColumn} (X →)</div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Min: {formatNumber(xStats.min)}</span>
                    <span>Avg: {formatNumber(xStats.avg)}</span>
                    <span>Max: {formatNumber(xStats.max)}</span>
                  </div>
                </div>
                <div className="rounded-lg border p-2.5 space-y-1.5 text-[10px]">
                  <div className="font-medium">{yColumn} (Y ↑)</div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Min: {formatNumber(yStats.min)}</span>
                    <span>Avg: {formatNumber(yStats.avg)}</span>
                    <span>Max: {formatNumber(yStats.max)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Bin distribution */}
          {points.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Distribution
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  {['Low-Low', 'Mid-Low', 'High-Low', 'Low-Mid', 'Mid-Mid', 'High-Mid', 'Low-High', 'Mid-High', 'High-High'].map((label, i) => {
                    const x = i % 3;
                    const y = Math.floor(i / 3);
                    const count = binCounts[y][x];
                    const pct = ((count / points.length) * 100).toFixed(0);
                    return (
                      <div
                        key={label}
                        className="rounded border p-1.5 text-center"
                        style={{ backgroundColor: colors[y][x] + '20' }}
                      >
                        <div className="text-[8px] text-muted-foreground">{label}</div>
                        <div className="text-[10px] font-bold font-mono">{count}</div>
                        <div className="text-[8px] text-muted-foreground">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {numericCols.length < 2 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>At least 2 numeric columns</p>
              <p>needed for bivariate map.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

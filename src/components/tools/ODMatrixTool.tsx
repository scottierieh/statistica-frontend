// components/tools/ODMatrixTool.tsx
// OD Matrix - Origin-Destination distance/time matrix

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { haversineDistance, formatNumber, analyzeColumns } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table2,
  Play,
  RotateCcw,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface ODEntry {
  originIdx: number;
  destIdx: number;
  distanceM: number;
  walkMin: number;
  driveMin: number;
}

export interface ODMatrixResult {
  origins: MapDataRow[];
  destinations: MapDataRow[];
  matrix: ODEntry[][];
  lines: { from: GeoPoint; to: GeoPoint; distanceM: number; colorValue: number }[];
  visible: boolean;
}

interface ODMatrixToolProps {
  data: MapDataRow[];
  onResultChange: (result: ODMatrixResult | null) => void;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function ODMatrixTool({ data, onResultChange }: ODMatrixToolProps) {
  const [mode, setMode] = useState<'all' | 'split'>('all');
  const [splitColumn, setSplitColumn] = useState('');
  const [originValue, setOriginValue] = useState('');
  const [destValue, setDestValue] = useState('');
  const [maxPoints, setMaxPoints] = useState(20);
  const [isComputed, setIsComputed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [matrix, setMatrix] = useState<ODEntry[][]>([]);
  const [origins, setOrigins] = useState<MapDataRow[]>([]);
  const [destinations, setDestinations] = useState<MapDataRow[]>([]);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const categoricalCols = useMemo(() => columns.filter((c) => c.type === 'categorical'), [columns]);

  const splitValues = useMemo(() => {
    if (!splitColumn) return [];
    const vals = new Set<string>();
    data.forEach((r) => vals.add(String(r[splitColumn] ?? '')));
    return [...vals].sort();
  }, [data, splitColumn]);

  useEffect(() => {
    if (categoricalCols.length > 0 && !splitColumn) setSplitColumn(categoricalCols[0].name);
  }, [categoricalCols]);

  useEffect(() => {
    if (splitValues.length >= 2) {
      if (!originValue) setOriginValue(splitValues[0]);
      if (!destValue) setDestValue(splitValues[1] || splitValues[0]);
    }
  }, [splitValues]);

  const runMatrix = () => {
    setIsRunning(true);
    setTimeout(() => {
      let ori: MapDataRow[];
      let dest: MapDataRow[];

      if (mode === 'all') {
        ori = data.slice(0, maxPoints);
        dest = data.slice(0, maxPoints);
      } else {
        ori = data.filter((r) => String(r[splitColumn]) === originValue).slice(0, maxPoints);
        dest = data.filter((r) => String(r[splitColumn]) === destValue).slice(0, maxPoints);
      }

      const mat: ODEntry[][] = [];
      for (let i = 0; i < ori.length; i++) {
        const row: ODEntry[] = [];
        for (let j = 0; j < dest.length; j++) {
          const d = haversineDistance(
            { lat: ori[i].lat, lng: ori[i].lng },
            { lat: dest[j].lat, lng: dest[j].lng }
          );
          row.push({
            originIdx: i,
            destIdx: j,
            distanceM: d,
            walkMin: d / 80, // ~80m/min walking
            driveMin: d / 500, // ~30km/h urban driving → 500m/min
          });
        }
        mat.push(row);
      }

      setOrigins(ori);
      setDestinations(dest);
      setMatrix(mat);
      setIsComputed(true);
      setIsRunning(false);
    }, 50);
  };

  const handleReset = () => {
    setMatrix([]);
    setOrigins([]);
    setDestinations([]);
    setIsComputed(false);
    onResultChange(null);
  };

  // Sync to parent (lines for map)
  useEffect(() => {
    if (!isComputed || matrix.length === 0) {
      onResultChange(null);
      return;
    }
    const allDists = matrix.flat().map((e) => e.distanceM);
    const maxDist = Math.max(...allDists, 1);

    const lines = matrix.flatMap((row) =>
      row.map((entry) => ({
        from: { lat: origins[entry.originIdx].lat, lng: origins[entry.originIdx].lng },
        to: { lat: destinations[entry.destIdx].lat, lng: destinations[entry.destIdx].lng },
        distanceM: entry.distanceM,
        colorValue: entry.distanceM / maxDist,
      }))
    );

    onResultChange({ origins, destinations, matrix, lines, visible: true });
  }, [matrix, isComputed]);

  // Stats
  const stats = useMemo(() => {
    if (matrix.length === 0) return null;
    const all = matrix.flat();
    const dists = all.map((e) => e.distanceM);
    return {
      pairs: all.length,
      avgDist: dists.reduce((a, b) => a + b, 0) / dists.length,
      minDist: Math.min(...dists),
      maxDist: Math.max(...dists),
      totalDist: dists.reduce((a, b) => a + b, 0),
    };
  }, [matrix]);

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  const getName = (row: MapDataRow) => row.name || row.id;

  // Export CSV
  const exportCSV = () => {
    if (matrix.length === 0) return;
    const header = ['Origin', ...destinations.map((d) => getName(d))];
    const rows = matrix.map((row, i) => [
      getName(origins[i]),
      ...row.map((e) => (e.distanceM / 1000).toFixed(3)),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'od_matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="text-sm font-medium">OD Matrix</span>
        </div>
        {isComputed && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={exportCSV} className="h-7 text-xs">
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Compute straight-line distance matrix between all origin-destination
            pairs. Useful for logistics, service area, and accessibility analysis.
          </p>

          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mode
            </Label>
            <div className="flex gap-1">
              <Button
                variant={mode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('all'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                All × All
              </Button>
              <Button
                variant={mode === 'split' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('split'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
                disabled={categoricalCols.length === 0}
              >
                Group Split
              </Button>
            </div>

            {mode === 'split' && (
              <div className="space-y-2">
                <Select value={splitColumn} onValueChange={(v) => { setSplitColumn(v); setIsComputed(false); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Group column" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoricalCols.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] text-muted-foreground mb-1">Origins</div>
                    <Select value={originValue} onValueChange={(v) => { setOriginValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {splitValues.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted-foreground mb-1">Destinations</div>
                    <Select value={destValue} onValueChange={(v) => { setDestValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {splitValues.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Max points */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Max Points per Side
              </Label>
              <span className="text-xs font-mono">{maxPoints}</span>
            </div>
            <Slider
              value={[maxPoints]}
              onValueChange={([v]) => { setMaxPoints(v); setIsComputed(false); }}
              min={5}
              max={50}
              step={5}
            />
            <div className="text-[9px] text-muted-foreground">
              Matrix size: {maxPoints} × {maxPoints} = {maxPoints * maxPoints} pairs
            </div>
          </div>

          <Button onClick={runMatrix} disabled={data.length < 2 || isRunning} className="w-full h-10">
            {isRunning ? (
              <><div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Computing...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" />{isComputed ? 'Recompute' : 'Build Matrix'}</>
            )}
          </Button>

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Pairs" value={stats.pairs.toLocaleString()} />
                <StatCard label="Avg Distance" value={formatDist(stats.avgDist)} />
                <StatCard label="Min" value={formatDist(stats.minDist)} />
                <StatCard label="Max" value={formatDist(stats.maxDist)} />
              </div>

              <Separator />

              {/* Mini matrix table */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Distance Matrix (km)
                </Label>
                <div className="overflow-auto max-h-[250px] rounded-lg border">
                  <table className="text-[8px] w-full">
                    <thead>
                      <tr className="bg-muted/50 sticky top-0">
                        <th className="px-1 py-0.5 text-left font-medium border-r sticky left-0 bg-muted/50 z-10">O \ D</th>
                        {destinations.slice(0, 15).map((d, j) => (
                          <th key={j} className="px-1 py-0.5 font-medium text-center whitespace-nowrap">
                            {getName(d).slice(0, 6)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.slice(0, 15).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-1 py-0.5 font-medium border-r sticky left-0 bg-background whitespace-nowrap">
                            {getName(origins[i]).slice(0, 6)}
                          </td>
                          {row.slice(0, 15).map((entry, j) => {
                            const km = entry.distanceM / 1000;
                            const maxKm = (stats?.maxDist || 1) / 1000;
                            const intensity = km / maxKm;
                            return (
                              <td
                                key={j}
                                className="px-1 py-0.5 text-center font-mono"
                                style={{
                                  backgroundColor: `rgba(59,130,246,${intensity * 0.3})`,
                                }}
                              >
                                {km.toFixed(1)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(origins.length > 15 || destinations.length > 15) && (
                  <div className="text-[9px] text-muted-foreground text-center">
                    Showing 15×15 of {origins.length}×{destinations.length}. Export CSV for full matrix.
                  </div>
                )}
              </div>

              {/* Nearest destination for each origin */}
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nearest Destination per Origin
                </Label>
                <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
                  {matrix.map((row, i) => {
                    const nearest = row.reduce((min, e) =>
                      e.distanceM > 0 && e.distanceM < min.distanceM ? e : min,
                      { ...row[0], distanceM: Infinity }
                    );
                    if (nearest.distanceM === Infinity) return null;
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-muted">
                        <span className="truncate flex-1">{getName(origins[i])}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="truncate flex-1 text-right">{getName(destinations[nearest.destIdx])}</span>
                        <span className="font-mono font-bold flex-shrink-0 w-14 text-right">
                          {formatDist(nearest.distanceM)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {data.length < 2 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Table2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data with at least</p>
              <p>2 points to build a matrix.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-xs font-bold font-mono">{value}</div>
    </div>
  );
}

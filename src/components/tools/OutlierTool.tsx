// components/tools/OutlierTool.tsx
// Outlier Detection - spatial and statistical outlier identification

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
  ShieldAlert,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  MapPin,
  BarChart3,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Outlier Detection Methods
// ─────────────────────────────────────────

// 1. KNN Distance - points far from their K nearest neighbors
function knnOutliers(
  data: MapDataRow[],
  k: number,
  threshold: number // multiplier of mean KNN distance
): { scores: number[]; meanDist: number; stdDist: number } {
  const n = data.length;
  const scores: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    // Compute distances to all other points
    const dists: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      dists.push(
        haversineDistance(
          { lat: data[i].lat, lng: data[i].lng },
          { lat: data[j].lat, lng: data[j].lng }
        )
      );
    }
    dists.sort((a, b) => a - b);
    // Average distance to K nearest neighbors
    const knnDist = dists.slice(0, k).reduce((a, b) => a + b, 0) / k;
    scores[i] = knnDist;
  }

  const meanDist = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((a, b) => a + (b - meanDist) ** 2, 0) / n;
  const stdDist = Math.sqrt(variance);

  return { scores, meanDist, stdDist };
}

// 2. IQR Method on a numeric column
function iqrOutliers(
  data: MapDataRow[],
  column: string,
  multiplier: number // typically 1.5 or 3.0
): { scores: number[]; q1: number; q3: number; iqr: number; lower: number; upper: number } {
  const values = data.map((r) => parseFloat(r[column]) || 0);
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;

  const scores = values.map((v) => {
    if (v < lower) return (lower - v) / (iqr || 1);
    if (v > upper) return (v - upper) / (iqr || 1);
    return 0;
  });

  return { scores, q1, q3, iqr, lower, upper };
}

// 3. Z-Score on a numeric column
function zScoreOutliers(
  data: MapDataRow[],
  column: string,
  threshold: number // typically 2 or 3
): { scores: number[]; mean: number; std: number } {
  const values = data.map((r) => parseFloat(r[column]) || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);

  const scores = values.map((v) => (std > 0 ? Math.abs(v - mean) / std : 0));

  return { scores, mean, std };
}

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface OutlierPoint {
  row: MapDataRow;
  score: number;
  isOutlier: boolean;
  rank: number;
}

export interface OutlierResult {
  method: string;
  points: OutlierPoint[];
  outlierCount: number;
  normalCount: number;
  showOutliersOnly: boolean;
  visible: boolean;
}

interface OutlierToolProps {
  data: MapDataRow[];
  onResultChange: (result: OutlierResult | null) => void;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function OutlierTool({ data, onResultChange }: OutlierToolProps) {
  const [method, setMethod] = useState<'knn' | 'iqr' | 'zscore'>('knn');
  const [knnK, setKnnK] = useState(5);
  const [knnThreshold, setKnnThreshold] = useState(2.0);
  const [iqrColumn, setIqrColumn] = useState('');
  const [iqrMultiplier, setIqrMultiplier] = useState(1.5);
  const [zColumn, setZColumn] = useState('');
  const [zThreshold, setZThreshold] = useState(2.5);
  const [showOutliersOnly, setShowOutliersOnly] = useState(false);
  const [isComputed, setIsComputed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<OutlierPoint[]>([]);
  const [methodInfo, setMethodInfo] = useState<any>(null);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(() => columns.filter((c) => c.type === 'numeric'), [columns]);

  useEffect(() => {
    if (numericCols.length > 0) {
      if (!iqrColumn) setIqrColumn(numericCols[0].name);
      if (!zColumn) setZColumn(numericCols[0].name);
    }
  }, [numericCols]);

  // Reset when method changes
  useEffect(() => {
    setIsComputed(false);
    onResultChange(null);
  }, [method]);

  const runDetection = () => {
    if (data.length === 0) return;
    setIsRunning(true);

    setTimeout(() => {
      let scores: number[] = [];
      let threshold = 0;
      let info: any = {};

      switch (method) {
        case 'knn': {
          const r = knnOutliers(data, knnK, knnThreshold);
          scores = r.scores;
          threshold = r.meanDist + knnThreshold * r.stdDist;
          info = {
            meanDist: r.meanDist,
            stdDist: r.stdDist,
            threshold,
            description: `Points whose avg ${knnK}-NN distance > ${formatDist(threshold)} (mean + ${knnThreshold}σ)`,
          };
          break;
        }
        case 'iqr': {
          const r = iqrOutliers(data, iqrColumn, iqrMultiplier);
          scores = r.scores;
          threshold = 0; // score > 0 means outlier
          info = {
            q1: r.q1,
            q3: r.q3,
            iqr: r.iqr,
            lower: r.lower,
            upper: r.upper,
            description: `Values outside [${formatNumber(r.lower)}, ${formatNumber(r.upper)}] (Q1/Q3 ± ${iqrMultiplier}×IQR)`,
          };
          break;
        }
        case 'zscore': {
          const r = zScoreOutliers(data, zColumn, zThreshold);
          scores = r.scores;
          threshold = zThreshold;
          info = {
            mean: r.mean,
            std: r.std,
            threshold: zThreshold,
            description: `Values with |z-score| > ${zThreshold} (mean=${formatNumber(r.mean)}, σ=${formatNumber(r.std)})`,
          };
          break;
        }
      }

      const points: OutlierPoint[] = data.map((row, i) => ({
        row,
        score: scores[i],
        isOutlier:
          method === 'knn'
            ? scores[i] > threshold
            : method === 'iqr'
            ? scores[i] > 0
            : scores[i] > threshold,
        rank: 0,
      }));

      // Rank by score descending
      const sorted = [...points].sort((a, b) => b.score - a.score);
      sorted.forEach((p, i) => (p.rank = i + 1));

      setResult(points);
      setMethodInfo(info);
      setIsComputed(true);
      setIsRunning(false);
    }, 50);
  };

  const handleReset = () => {
    setResult([]);
    setMethodInfo(null);
    setIsComputed(false);
    onResultChange(null);
  };

  // Sync to parent
  useEffect(() => {
    if (!isComputed || result.length === 0) {
      onResultChange(null);
      return;
    }
    const outlierCount = result.filter((p) => p.isOutlier).length;
    onResultChange({
      method,
      points: result,
      outlierCount,
      normalCount: result.length - outlierCount,
      showOutliersOnly,
      visible: true,
    });
  }, [result, showOutliersOnly, isComputed]);

  // Stats
  const stats = useMemo(() => {
    if (!isComputed) return null;
    const outliers = result.filter((p) => p.isOutlier);
    const normals = result.filter((p) => !p.isOutlier);
    const outlierScores = outliers.map((p) => p.score);
    return {
      total: result.length,
      outlierCount: outliers.length,
      normalCount: normals.length,
      outlierPercent: ((outliers.length / result.length) * 100).toFixed(1),
      maxScore: outlierScores.length > 0 ? Math.max(...outlierScores) : 0,
      avgScore: outlierScores.length > 0
        ? outlierScores.reduce((a, b) => a + b, 0) / outlierScores.length
        : 0,
    };
  }, [result, isComputed]);

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  const topOutliers = useMemo(
    () =>
      result
        .filter((p) => p.isOutlier)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20),
    [result]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-sm font-medium">Outlier Detection</span>
        </div>
        {isComputed && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Info */}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Detect spatial or statistical outliers in your data.
            Outliers are highlighted on the map for inspection.
          </p>

          {/* Method selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detection Method
            </Label>
            <div className="space-y-1">
              <button
                onClick={() => setMethod('knn')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                  method === 'knn' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5" />
                  <span className="font-medium">KNN Distance</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                  Points far from their K nearest neighbors (spatial)
                </div>
              </button>
              <button
                onClick={() => setMethod('iqr')}
                disabled={numericCols.length === 0}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                  method === 'iqr' ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                  numericCols.length === 0 && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="font-medium">IQR Method</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                  Values outside interquartile range fences
                </div>
              </button>
              <button
                onClick={() => setMethod('zscore')}
                disabled={numericCols.length === 0}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                  method === 'zscore' ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                  numericCols.length === 0 && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="font-medium">Z-Score</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                  Values deviating significantly from mean
                </div>
              </button>
            </div>
          </div>

          <Separator />

          {/* Method-specific parameters */}
          {method === 'knn' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    K (Neighbors)
                  </Label>
                  <span className="text-xs font-mono">{knnK}</span>
                </div>
                <Slider
                  value={[knnK]}
                  onValueChange={([v]) => { setKnnK(v); setIsComputed(false); }}
                  min={2}
                  max={20}
                  step={1}
                />
                <div className="flex gap-1">
                  {[3, 5, 7, 10, 15].map((v) => (
                    <button
                      key={v}
                      onClick={() => { setKnnK(v); setIsComputed(false); }}
                      className={cn(
                        'flex-1 py-1 text-[9px] rounded border transition-colors',
                        knnK === v ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-transparent'
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sensitivity (σ multiplier)
                  </Label>
                  <span className="text-xs font-mono">{knnThreshold.toFixed(1)}σ</span>
                </div>
                <Slider
                  value={[knnThreshold]}
                  onValueChange={([v]) => { setKnnThreshold(v); setIsComputed(false); }}
                  min={1.0}
                  max={4.0}
                  step={0.1}
                />
                <div className="text-[10px] text-muted-foreground">
                  Lower = more outliers detected, Higher = only extreme outliers
                </div>
              </div>
            </div>
          )}

          {method === 'iqr' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Column
                </Label>
                <Select value={iqrColumn} onValueChange={(v) => { setIqrColumn(v); setIsComputed(false); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {numericCols.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    IQR Multiplier
                  </Label>
                  <span className="text-xs font-mono">{iqrMultiplier}×</span>
                </div>
                <Slider
                  value={[iqrMultiplier]}
                  onValueChange={([v]) => { setIqrMultiplier(v); setIsComputed(false); }}
                  min={1.0}
                  max={3.0}
                  step={0.1}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => { setIqrMultiplier(1.5); setIsComputed(false); }}
                    className={cn('flex-1 py-1 text-[9px] rounded border', iqrMultiplier === 1.5 ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-transparent')}
                  >
                    1.5× (mild)
                  </button>
                  <button
                    onClick={() => { setIqrMultiplier(3.0); setIsComputed(false); }}
                    className={cn('flex-1 py-1 text-[9px] rounded border', iqrMultiplier === 3.0 ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-transparent')}
                  >
                    3.0× (extreme)
                  </button>
                </div>
              </div>
            </div>
          )}

          {method === 'zscore' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Column
                </Label>
                <Select value={zColumn} onValueChange={(v) => { setZColumn(v); setIsComputed(false); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {numericCols.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Z-Score Threshold
                  </Label>
                  <span className="text-xs font-mono">|z| &gt; {zThreshold}</span>
                </div>
                <Slider
                  value={[zThreshold]}
                  onValueChange={([v]) => { setZThreshold(v); setIsComputed(false); }}
                  min={1.5}
                  max={4.0}
                  step={0.1}
                />
                <div className="flex gap-1">
                  {[2.0, 2.5, 3.0].map((v) => (
                    <button
                      key={v}
                      onClick={() => { setZThreshold(v); setIsComputed(false); }}
                      className={cn('flex-1 py-1 text-[9px] rounded border', zThreshold === v ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-transparent')}
                    >
                      {v}σ
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Run button */}
          <Button
            onClick={runDetection}
            disabled={data.length === 0 || isRunning}
            className="w-full h-10"
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Detecting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {isComputed ? 'Re-run Detection' : 'Detect Outliers'}
              </>
            )}
          </Button>

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />

              {/* Method info */}
              {methodInfo?.description && (
                <div className="px-2 py-1.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground">
                  {methodInfo.description}
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Total" value={stats.total.toLocaleString()} />
                <div className="rounded-lg border p-2 text-center bg-red-500/5">
                  <div className="text-[9px] text-red-600">Outliers</div>
                  <div className="text-xs font-bold font-mono text-red-600">
                    {stats.outlierCount}
                  </div>
                </div>
                <StatCard label="Normal" value={stats.normalCount.toLocaleString()} />
              </div>

              {/* Outlier percentage bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Outlier Rate</span>
                  <span className="font-mono font-bold">{stats.outlierPercent}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.outlierPercent}%` }}
                  />
                </div>
              </div>

              {/* Display toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOutliersOnly(false)}
                  className={cn(
                    'flex-1 py-1.5 text-[10px] rounded border transition-colors',
                    !showOutliersOnly ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-muted'
                  )}
                >
                  Show All
                </button>
                <button
                  onClick={() => setShowOutliersOnly(true)}
                  className={cn(
                    'flex-1 py-1.5 text-[10px] rounded border transition-colors',
                    showOutliersOnly ? 'bg-red-500 text-white border-red-500' : 'hover:bg-muted border-muted'
                  )}
                >
                  Outliers Only
                </button>
              </div>

              {/* IQR box plot info */}
              {method === 'iqr' && methodInfo && (
                <div className="rounded-lg border p-2.5 space-y-1.5">
                  <div className="text-[10px] font-medium">IQR Analysis: {iqrColumn}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q1</span>
                      <span className="font-mono">{formatNumber(methodInfo.q1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q3</span>
                      <span className="font-mono">{formatNumber(methodInfo.q3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IQR</span>
                      <span className="font-mono">{formatNumber(methodInfo.iqr)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fence</span>
                      <span className="font-mono">{iqrMultiplier}×</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Lower</span>
                      <span className="font-mono">{formatNumber(methodInfo.lower)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Upper</span>
                      <span className="font-mono">{formatNumber(methodInfo.upper)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Z-score info */}
              {method === 'zscore' && methodInfo && (
                <div className="rounded-lg border p-2.5 space-y-1.5">
                  <div className="text-[10px] font-medium">Z-Score Analysis: {zColumn}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mean (μ)</span>
                      <span className="font-mono">{formatNumber(methodInfo.mean)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Std (σ)</span>
                      <span className="font-mono">{formatNumber(methodInfo.std)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Threshold</span>
                      <span className="font-mono">|z| &gt; {zThreshold}</span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Top outliers list */}
              {topOutliers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Top Outliers ({stats.outlierCount})
                  </Label>
                  <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                    {topOutliers.map((p, i) => {
                      const name = p.row.name || p.row.id || `Point ${p.rank}`;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-muted"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                          <span className="flex-1 truncate">{name}</span>
                          <span className="font-mono text-muted-foreground flex-shrink-0">
                            {method === 'knn'
                              ? formatDist(p.score)
                              : formatNumber(p.score)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {data.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data to detect</p>
              <p>spatial outliers.</p>
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

const formatDist = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

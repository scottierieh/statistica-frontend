// components/tools/LocationScoreTool.tsx
// Location Score Model - weighted multi-criteria scoring for optimal site selection

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { formatNumber, analyzeColumns } from '@/lib/map-utils';
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
  Trophy,
  Plus,
  Trash2,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface ScoreCriteria {
  id: string;
  column: string;
  weight: number; // 0~100
  direction: 'higher' | 'lower'; // higher is better or lower is better
}

export interface ScoredPoint {
  row: MapDataRow;
  totalScore: number; // 0~100 normalized
  criteriaScores: Record<string, number>; // per-criteria 0~1
  rank: number;
}

export interface LocationScoreResult {
  points: ScoredPoint[];
  criteria: ScoreCriteria[];
  visible: boolean;
}

interface LocationScoreToolProps {
  data: MapDataRow[];
  onResultChange: (result: LocationScoreResult | null) => void;
}

// ─────────────────────────────────────────
// Scoring logic
// ─────────────────────────────────────────
function computeScores(data: MapDataRow[], criteria: ScoreCriteria[]): ScoredPoint[] {
  if (data.length === 0 || criteria.length === 0) return [];

  const activeCriteria = criteria.filter((c) => c.column && c.weight > 0);
  if (activeCriteria.length === 0) return [];

  const totalWeight = activeCriteria.reduce((s, c) => s + c.weight, 0);

  // Precompute min/max for each column
  const ranges: Record<string, { min: number; max: number }> = {};
  activeCriteria.forEach((c) => {
    const vals = data.map((r) => parseFloat(r[c.column])).filter((v) => !isNaN(v));
    ranges[c.column] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  });

  const scored: ScoredPoint[] = data.map((row) => {
    const criteriaScores: Record<string, number> = {};
    let weightedSum = 0;

    activeCriteria.forEach((c) => {
      const val = parseFloat(row[c.column]);
      const range = ranges[c.column];
      const span = range.max - range.min || 1;

      let normalized: number;
      if (isNaN(val)) {
        normalized = 0;
      } else if (c.direction === 'higher') {
        normalized = (val - range.min) / span;
      } else {
        normalized = 1 - (val - range.min) / span;
      }

      criteriaScores[c.id] = normalized;
      weightedSum += normalized * (c.weight / totalWeight);
    });

    return {
      row,
      totalScore: weightedSum * 100,
      criteriaScores,
      rank: 0,
    };
  });

  // Rank
  scored.sort((a, b) => b.totalScore - a.totalScore);
  scored.forEach((p, i) => (p.rank = i + 1));

  return scored;
}

// Score color (green=high, red=low)
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
let criteriaCounter = 0;

export default function LocationScoreTool({ data, onResultChange }: LocationScoreToolProps) {
  const [criteria, setCriteria] = useState<ScoreCriteria[]>([]);
  const [showTopN, setShowTopN] = useState(0); // 0 = all

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(() => columns.filter((c) => c.type === 'numeric'), [columns]);

  // Auto-add first criteria
  useEffect(() => {
    if (numericCols.length > 0 && criteria.length === 0) {
      const initial: ScoreCriteria[] = numericCols.slice(0, Math.min(3, numericCols.length)).map((col, i) => ({
        id: `c_${criteriaCounter++}`,
        column: col.name,
        weight: Math.round(100 / Math.min(3, numericCols.length)),
        direction: 'higher',
      }));
      setCriteria(initial);
    }
  }, [numericCols]);

  const addCriteria = () => {
    const unused = numericCols.find((c) => !criteria.some((cr) => cr.column === c.name));
    setCriteria((prev) => [
      ...prev,
      {
        id: `c_${criteriaCounter++}`,
        column: unused?.name || numericCols[0]?.name || '',
        weight: 50,
        direction: 'higher',
      },
    ]);
  };

  const removeCriteria = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCriteria = (id: string, updates: Partial<ScoreCriteria>) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Compute scores
  const scored = useMemo(
    () => computeScores(data, criteria),
    [data, criteria]
  );

  // Sync to parent
  useEffect(() => {
    if (scored.length === 0) {
      onResultChange(null);
      return;
    }
    onResultChange({
      points: showTopN > 0 ? scored.slice(0, showTopN) : scored,
      criteria,
      visible: true,
    });
  }, [scored, showTopN, criteria]);

  // Stats
  const stats = useMemo(() => {
    if (scored.length === 0) return null;
    const scores = scored.map((s) => s.totalScore);
    return {
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      max: Math.max(...scores),
      min: Math.min(...scores),
      median: scores[Math.floor(scores.length / 2)],
      top10avg: scored.slice(0, Math.min(10, scored.length))
        .reduce((s, p) => s + p.totalScore, 0) / Math.min(10, scored.length),
    };
  }, [scored]);

  const handleReset = () => {
    setCriteria([]);
    onResultChange(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          <span className="text-sm font-medium">Location Score</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Info */}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Build a weighted scoring model to rank locations. Add criteria,
            set weights and direction, then view the composite score for each point.
          </p>

          {/* Criteria list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Scoring Criteria ({criteria.length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addCriteria}
                disabled={numericCols.length === 0}
                className="h-6 text-[10px] px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {criteria.map((c, i) => (
              <div key={c.id} className="rounded-lg border p-2.5 space-y-2">
                {/* Column + direction + remove */}
                <div className="flex items-center gap-1.5">
                  <Select
                    value={c.column}
                    onValueChange={(v) => updateCriteria(c.id, { column: v })}
                  >
                    <SelectTrigger className="flex-1 h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col.name} value={col.name}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button
                    onClick={() =>
                      updateCriteria(c.id, {
                        direction: c.direction === 'higher' ? 'lower' : 'higher',
                      })
                    }
                    className={cn(
                      'h-7 px-2 rounded border text-[10px] flex items-center gap-1 transition-colors',
                      c.direction === 'higher'
                        ? 'bg-green-500/10 border-green-500/30 text-green-700'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-700'
                    )}
                  >
                    {c.direction === 'higher' ? (
                      <><ArrowUp className="h-3 w-3" /> Higher</>
                    ) : (
                      <><ArrowDown className="h-3 w-3" /> Lower</>
                    )}
                  </button>

                  <button
                    onClick={() => removeCriteria(c.id)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Weight slider */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground w-10">Weight</span>
                  <Slider
                    value={[c.weight]}
                    onValueChange={([v]) => updateCriteria(c.id, { weight: v })}
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-mono w-8 text-right">{c.weight}</span>
                </div>
              </div>
            ))}

            {criteria.length === 0 && numericCols.length > 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                Add criteria to start scoring.
              </div>
            )}

            {numericCols.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                <Trophy className="h-6 w-6 mx-auto mb-1 opacity-30" />
                No numeric columns found in data.
              </div>
            )}
          </div>

          {/* Weight distribution */}
          {criteria.length > 1 && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Weight Distribution</div>
              <div className="flex h-3 rounded-full overflow-hidden">
                {criteria.filter((c) => c.weight > 0).map((c, i) => {
                  const total = criteria.reduce((s, cr) => s + cr.weight, 0) || 1;
                  const pct = (c.weight / total) * 100;
                  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];
                  return (
                    <div
                      key={c.id}
                      className="h-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors[i % colors.length],
                      }}
                      title={`${c.column}: ${pct.toFixed(0)}%`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {criteria.filter((c) => c.weight > 0).map((c, i) => {
                  const total = criteria.reduce((s, cr) => s + cr.weight, 0) || 1;
                  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];
                  return (
                    <div key={c.id} className="flex items-center gap-1 text-[9px]">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      />
                      <span className="text-muted-foreground">{c.column}</span>
                      <span className="font-mono">{((c.weight / total) * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top N filter */}
          {scored.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Display
                </Label>
                <div className="flex gap-1">
                  {[0, 5, 10, 20, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setShowTopN(n)}
                      className={cn(
                        'flex-1 py-1.5 text-[10px] rounded border transition-colors',
                        showTopN === n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-transparent'
                      )}
                    >
                      {n === 0 ? 'All' : `Top ${n}`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Stats */}
          {stats && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Score Distribution
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Average" value={stats.avg.toFixed(1)} />
                  <StatCard label="Median" value={stats.median.toFixed(1)} />
                  <StatCard label="Top 10 Avg" value={stats.top10avg.toFixed(1)} />
                </div>

                {/* Score histogram */}
                <ScoreHistogram scored={scored} />
              </div>
            </>
          )}

          {/* Rankings */}
          {scored.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Rankings
                </Label>
                <div className="space-y-0.5 max-h-[250px] overflow-y-auto">
                  {scored.slice(0, showTopN > 0 ? showTopN : 30).map((p, i) => {
                    const name = p.row.name || p.row.id;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    return (
                      <div
                        key={p.row.id}
                        className="flex items-center gap-2 text-[10px] py-1.5 px-1.5 rounded hover:bg-muted"
                      >
                        <span className="w-5 text-right text-muted-foreground font-mono">
                          {medal || `#${p.rank}`}
                        </span>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getScoreColor(p.totalScore) }}
                        />
                        <span className="flex-1 truncate">{name}</span>
                        <span
                          className="font-mono font-bold flex-shrink-0"
                          style={{ color: getScoreColor(p.totalScore) }}
                        >
                          {p.totalScore.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                  {showTopN === 0 && scored.length > 30 && (
                    <div className="text-[10px] text-center text-muted-foreground py-1">
                      +{scored.length - 30} more
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {data.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data to build a</p>
              <p>location scoring model.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-xs font-bold font-mono">{value}</div>
    </div>
  );
}

function ScoreHistogram({ scored }: { scored: ScoredPoint[] }) {
  const buckets = new Array(10).fill(0); // 0-10, 10-20, ..., 90-100
  scored.forEach((p) => {
    const idx = Math.min(Math.floor(p.totalScore / 10), 9);
    buckets[idx]++;
  });
  const max = Math.max(...buckets, 1);

  return (
    <div className="flex items-end gap-0.5 h-10">
      {buckets.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${(count / max) * 100}%`,
              minHeight: count > 0 ? 2 : 0,
              backgroundColor: getScoreColor(i * 10 + 5),
            }}
          />
        </div>
      ))}
    </div>
  );
}

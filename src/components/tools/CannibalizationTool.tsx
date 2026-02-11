// components/tools/CannibalizationTool.tsx
// Cannibalization Analysis - detect overlapping coverage between locations

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
  CircleDot,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface OverlapPair {
  id: string;
  storeA: MapDataRow;
  storeB: MapDataRow;
  distance: number; // meters between A and B
  overlapArea: number; // km² approximate
  overlapPercent: number; // % of smaller circle overlapped
  sharedPoints: MapDataRow[]; // points within both radii
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CannibalizationResult {
  pairs: OverlapPair[];
  stores: MapDataRow[];
  radius: number;
  circles: { center: GeoPoint; radiusM: number; color: string; storeId: string }[];
  overlapZones: { centerA: GeoPoint; centerB: GeoPoint; severity: string }[];
  visible: boolean;
}

interface CannibalizationToolProps {
  data: MapDataRow[];
  onResultChange: (result: CannibalizationResult | null) => void;
}

// ─────────────────────────────────────────
// Overlap calculation helpers
// ─────────────────────────────────────────
function circleOverlapArea(d: number, r1: number, r2: number): number {
  // Area of intersection of two circles (in km²)
  // d = distance between centers (km), r1, r2 = radii (km)
  if (d >= r1 + r2) return 0; // no overlap
  if (d + r2 <= r1) return Math.PI * r2 * r2; // r2 inside r1
  if (d + r1 <= r2) return Math.PI * r1 * r1; // r1 inside r2

  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const c = 0.5 * Math.sqrt(
    (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)
  );
  return a + b - c;
}

function getSeverity(overlapPercent: number): 'low' | 'medium' | 'high' | 'critical' {
  if (overlapPercent >= 75) return 'critical';
  if (overlapPercent >= 50) return 'high';
  if (overlapPercent >= 25) return 'medium';
  return 'low';
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-700', border: 'border-green-500/30', fill: '#22c55e' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-700', border: 'border-yellow-500/30', fill: '#eab308' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-700', border: 'border-orange-500/30', fill: '#f97316' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-700', border: 'border-red-500/30', fill: '#ef4444' },
};

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function CannibalizationTool({ data, onResultChange }: CannibalizationToolProps) {
  const [radius, setRadius] = useState(1000); // meters
  const [storeColumn, setStoreColumn] = useState(''); // column to identify stores vs customers
  const [storeValue, setStoreValue] = useState(''); // filter value for stores
  const [useAllAsStores, setUseAllAsStores] = useState(true);
  const [minOverlap, setMinOverlap] = useState(0); // minimum overlap % to show
  const [isComputed, setIsComputed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [pairs, setPairs] = useState<OverlapPair[]>([]);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const categoricalCols = useMemo(() => columns.filter((c) => c.type === 'categorical'), [columns]);
  const numericCols = useMemo(() => columns.filter((c) => c.type === 'numeric'), [columns]);

  // Get unique values for selected column
  const storeColumnValues = useMemo(() => {
    if (!storeColumn) return [];
    const vals = new Set<string>();
    data.forEach((r) => vals.add(String(r[storeColumn] ?? '')));
    return [...vals].sort();
  }, [data, storeColumn]);

  useEffect(() => {
    if (categoricalCols.length > 0 && !storeColumn) {
      setStoreColumn(categoricalCols[0].name);
    }
  }, [categoricalCols]);

  useEffect(() => {
    if (storeColumnValues.length > 0 && !storeValue) {
      setStoreValue(storeColumnValues[0]);
    }
  }, [storeColumnValues]);

  const runAnalysis = () => {
    if (data.length < 2) return;
    setIsRunning(true);

    setTimeout(() => {
      // Determine which points are "stores"
      let stores: MapDataRow[];
      let customers: MapDataRow[];

      if (useAllAsStores) {
        stores = data;
        customers = data;
      } else {
        stores = data.filter((r) => String(r[storeColumn]) === storeValue);
        customers = data.filter((r) => String(r[storeColumn]) !== storeValue);
      }

      if (stores.length < 2) {
        setPairs([]);
        setIsComputed(true);
        setIsRunning(false);
        return;
      }

      const radiusKm = radius / 1000;
      const results: OverlapPair[] = [];

      // Check all store pairs
      for (let i = 0; i < stores.length; i++) {
        for (let j = i + 1; j < stores.length; j++) {
          const dist = haversineDistance(
            { lat: stores[i].lat, lng: stores[i].lng },
            { lat: stores[j].lat, lng: stores[j].lng }
          );

          // Skip if circles don't overlap
          if (dist >= radius * 2) continue;

          const distKm = dist / 1000;
          const overlapKm2 = circleOverlapArea(distKm, radiusKm, radiusKm);
          const circleArea = Math.PI * radiusKm * radiusKm;
          const overlapPercent = circleArea > 0 ? (overlapKm2 / circleArea) * 100 : 0;

          if (overlapPercent < minOverlap) continue;

          // Find shared points (within both radii)
          const shared = customers.filter((c) => {
            const d1 = haversineDistance({ lat: c.lat, lng: c.lng }, { lat: stores[i].lat, lng: stores[i].lng });
            const d2 = haversineDistance({ lat: c.lat, lng: c.lng }, { lat: stores[j].lat, lng: stores[j].lng });
            return d1 <= radius && d2 <= radius;
          });

          results.push({
            id: `${i}_${j}`,
            storeA: stores[i],
            storeB: stores[j],
            distance: dist,
            overlapArea: overlapKm2,
            overlapPercent: Math.min(overlapPercent, 100),
            sharedPoints: shared,
            severity: getSeverity(overlapPercent),
          });
        }
      }

      // Sort by overlap descending
      results.sort((a, b) => b.overlapPercent - a.overlapPercent);
      setPairs(results);
      setIsComputed(true);
      setIsRunning(false);
    }, 50);
  };

  const handleReset = () => {
    setPairs([]);
    setIsComputed(false);
    onResultChange(null);
  };

  // Sync to parent
  useEffect(() => {
    if (!isComputed) {
      onResultChange(null);
      return;
    }

    const stores = useAllAsStores ? data : data.filter((r) => String(r[storeColumn]) === storeValue);
    const storeColors = [
      '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    ];

    const circles = stores.map((s, i) => ({
      center: { lat: s.lat, lng: s.lng },
      radiusM: radius,
      color: storeColors[i % storeColors.length],
      storeId: s.id,
    }));

    const overlapZones = pairs.map((p) => ({
      centerA: { lat: p.storeA.lat, lng: p.storeA.lng },
      centerB: { lat: p.storeB.lat, lng: p.storeB.lng },
      severity: p.severity,
    }));

    onResultChange({
      pairs,
      stores,
      radius,
      circles,
      overlapZones,
      visible: true,
    });
  }, [pairs, isComputed, radius]);

  // Stats
  const stats = useMemo(() => {
    if (!isComputed) return null;
    const storeCount = useAllAsStores ? data.length : data.filter((r) => String(r[storeColumn]) === storeValue).length;
    const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    pairs.forEach((p) => severityCounts[p.severity]++);
    const totalShared = pairs.reduce((s, p) => s + p.sharedPoints.length, 0);
    const avgOverlap = pairs.length > 0
      ? pairs.reduce((s, p) => s + p.overlapPercent, 0) / pairs.length
      : 0;

    return {
      storeCount,
      pairCount: pairs.length,
      severityCounts,
      totalShared,
      avgOverlap,
      maxOverlap: pairs.length > 0 ? pairs[0].overlapPercent : 0,
    };
  }, [pairs, isComputed]);

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4" />
          <span className="text-sm font-medium">Cannibalization</span>
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
            Detect overlapping coverage areas between your locations.
            Identifies pairs of stores competing for the same customers
            within their service radius.
          </p>

          {/* Store mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Store Selection
            </Label>
            <div className="flex gap-1">
              <Button
                variant={useAllAsStores ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setUseAllAsStores(true); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                All Points
              </Button>
              <Button
                variant={!useAllAsStores ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setUseAllAsStores(false); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
                disabled={categoricalCols.length === 0}
              >
                By Category
              </Button>
            </div>

            {!useAllAsStores && (
              <div className="space-y-2">
                <Select value={storeColumn} onValueChange={(v) => { setStoreColumn(v); setIsComputed(false); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Group column" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoricalCols.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={storeValue} onValueChange={(v) => { setStoreValue(v); setIsComputed(false); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Store value" />
                  </SelectTrigger>
                  <SelectContent>
                    {storeColumnValues.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Coverage radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Coverage Radius
              </Label>
              <span className="text-xs font-mono">{formatDist(radius)}</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={([v]) => { setRadius(v); setIsComputed(false); }}
              min={100}
              max={10000}
              step={50}
            />
            <div className="flex gap-1">
              {[250, 500, 1000, 2000, 3000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => { setRadius(v); setIsComputed(false); }}
                  className={cn(
                    'flex-1 py-1 text-[9px] rounded border transition-colors',
                    radius === v ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-transparent'
                  )}
                >
                  {v >= 1000 ? `${v / 1000}km` : `${v}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Min overlap filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Min Overlap to Show
              </Label>
              <span className="text-xs font-mono">{minOverlap}%</span>
            </div>
            <Slider
              value={[minOverlap]}
              onValueChange={([v]) => { setMinOverlap(v); setIsComputed(false); }}
              min={0}
              max={75}
              step={5}
            />
          </div>

          {/* Run */}
          <Button
            onClick={runAnalysis}
            disabled={data.length < 2 || isRunning}
            className="w-full h-10"
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {isComputed ? 'Re-analyze' : 'Run Analysis'}
              </>
            )}
          </Button>

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Stores" value={stats.storeCount.toString()} />
                <StatCard label="Overlaps" value={stats.pairCount.toString()} />
                <StatCard label="Avg Overlap" value={`${stats.avgOverlap.toFixed(1)}%`} />
              </div>

              {/* Severity breakdown */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground">Severity Breakdown</div>
                <div className="flex gap-1">
                  {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                    const count = stats.severityCounts[sev];
                    const colors = SEVERITY_COLORS[sev];
                    return (
                      <div
                        key={sev}
                        className={cn('flex-1 rounded-md border px-2 py-1.5 text-center', colors.bg, colors.border)}
                      >
                        <div className={cn('text-[9px] capitalize', colors.text)}>{sev}</div>
                        <div className={cn('text-sm font-bold font-mono', colors.text)}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {pairs.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  <CircleDot className="h-6 w-6 mx-auto mb-1 opacity-40" />
                  No overlapping pairs found. Try increasing the radius.
                </div>
              )}

              {/* Overlap pairs list */}
              {pairs.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Overlap Pairs ({pairs.length})
                    </Label>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {pairs.slice(0, 30).map((pair, i) => {
                        const sev = SEVERITY_COLORS[pair.severity];
                        const nameA = pair.storeA.name || pair.storeA.id;
                        const nameB = pair.storeB.name || pair.storeB.id;

                        return (
                          <div
                            key={pair.id}
                            className={cn('rounded-lg border p-2.5 space-y-2', sev.bg, sev.border)}
                          >
                            {/* Pair header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Badge
                                  variant="outline"
                                  className={cn('text-[8px] h-4 capitalize', sev.text, sev.border)}
                                >
                                  {pair.severity}
                                </Badge>
                                <span className="text-[10px] truncate">
                                  {nameA} ↔ {nameB}
                                </span>
                              </div>
                              <span className={cn('text-xs font-bold font-mono flex-shrink-0', sev.text)}>
                                {pair.overlapPercent.toFixed(1)}%
                              </span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-1 text-[10px]">
                              <div className="text-center">
                                <div className="text-muted-foreground">Distance</div>
                                <div className="font-mono font-bold">{formatDist(pair.distance)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">Overlap</div>
                                <div className="font-mono font-bold">
                                  {pair.overlapArea < 0.01
                                    ? `${(pair.overlapArea * 1e6).toFixed(0)} m²`
                                    : `${pair.overlapArea.toFixed(3)} km²`}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">Shared Pts</div>
                                <div className="font-mono font-bold">{pair.sharedPoints.length}</div>
                              </div>
                            </div>

                            {/* Overlap bar */}
                            <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pair.overlapPercent}%`,
                                  backgroundColor: sev.fill,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {pairs.length > 30 && (
                        <div className="text-[10px] text-center text-muted-foreground py-1">
                          +{pairs.length - 30} more pairs
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Recommendations */}
              {pairs.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Insights
                    </Label>
                    <div className="space-y-1.5 text-[10px]">
                      {stats.severityCounts.critical > 0 && (
                        <div className="flex items-start gap-1.5 text-red-600">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>
                            {stats.severityCounts.critical} critical overlap{stats.severityCounts.critical > 1 ? 's' : ''} — 
                            consider consolidating or repositioning these locations.
                          </span>
                        </div>
                      )}
                      {stats.severityCounts.high > 0 && (
                        <div className="flex items-start gap-1.5 text-orange-600">
                          <TrendingDown className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>
                            {stats.severityCounts.high} high overlap{stats.severityCounts.high > 1 ? 's' : ''} — 
                            potential revenue loss from internal competition.
                          </span>
                        </div>
                      )}
                      {stats.totalShared > 0 && (
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <CircleDot className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>
                            {stats.totalShared} data points fall within multiple coverage areas.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Empty state */}
          {data.length < 2 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <CircleDot className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>At least 2 locations needed</p>
              <p>for cannibalization analysis.</p>
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

export { SEVERITY_COLORS };

// components/tools/SpiderMapTool.tsx
// 스파이더맵 - 중심점에서 각 포인트로 방사형 연결선 + 거리 통계

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { haversineDistance, formatNumber, analyzeColumns } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Waypoints,
  Crosshair,
  RotateCcw,
  ArrowUpDown,
  Palette,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface SpiderLine {
  from: GeoPoint;
  to: GeoPoint;
  distanceM: number;
  row: MapDataRow;
  colorValue: number; // 0~1 normalized
}

export interface SpiderMapResult {
  center: GeoPoint;
  lines: SpiderLine[];
  maxDistanceM: number;
  colorMode: 'distance' | 'column';
  colorColumn: string;
  visible: boolean;
}

interface SpiderMapToolProps {
  data: MapDataRow[];
  onSpiderChange: (result: SpiderMapResult | null) => void;
  isSelectMode: boolean;
  onSelectModeChange: (mode: boolean) => void;
  onMapClick: GeoPoint | null;
}

// ─────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────
const GRADIENT_PRESETS = [
  { id: 'blue-red', label: 'Blue → Red', from: [59, 130, 246], to: [239, 68, 68] },
  { id: 'green-red', label: 'Green → Red', from: [34, 197, 94], to: [239, 68, 68] },
  { id: 'blue-yellow', label: 'Blue → Yellow', from: [59, 130, 246], to: [234, 179, 8] },
  { id: 'purple-orange', label: 'Purple → Orange', from: [168, 85, 247], to: [249, 115, 22] },
];

export function interpolateColor(t: number, preset: typeof GRADIENT_PRESETS[0]): string {
  const r = Math.round(preset.from[0] + (preset.to[0] - preset.from[0]) * t);
  const g = Math.round(preset.from[1] + (preset.to[1] - preset.from[1]) * t);
  const b = Math.round(preset.from[2] + (preset.to[2] - preset.from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

export default function SpiderMapTool({
  data,
  onSpiderChange,
  isSelectMode,
  onSelectModeChange,
  onMapClick,
}: SpiderMapToolProps) {
  const [center, setCenter] = useState<GeoPoint | null>(null);
  const [maxRadius, setMaxRadius] = useState(10000); // meters
  const [colorMode, setColorMode] = useState<'distance' | 'column'>('distance');
  const [colorColumn, setColorColumn] = useState<string>('');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [sortBy, setSortBy] = useState<'distance' | 'value'>('distance');
  const [sortDesc, setSortDesc] = useState(true);
  const [showTopN, setShowTopN] = useState(0); // 0 = all
  const [lineOpacity, setLineOpacity] = useState(60);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(
    () => columns.filter((c) => c.type === 'numeric'),
    [columns]
  );

  // Auto-select first numeric column
  useEffect(() => {
    if (numericCols.length > 0 && !colorColumn) {
      setColorColumn(numericCols[0].name);
    }
  }, [numericCols]);

  // Handle map click → set center
  useEffect(() => {
    if (onMapClick && isSelectMode) {
      setCenter(onMapClick);
      onSelectModeChange(false);
    }
  }, [onMapClick]);

  // Compute spider lines
  const spiderResult = useMemo<SpiderMapResult | null>(() => {
    if (!center || data.length === 0) return null;

    // Calculate all lines
    let lines: SpiderLine[] = data.map((row) => {
      const to = { lat: row.lat, lng: row.lng };
      const dist = haversineDistance(center, to);
      return { from: center, to, distanceM: dist, row, colorValue: 0 };
    });

    // Filter by max radius
    lines = lines.filter((l) => l.distanceM <= maxRadius);

    if (lines.length === 0) return null;

    const maxDist = Math.max(...lines.map((l) => l.distanceM));

    // Assign color values
    if (colorMode === 'distance') {
      lines.forEach((l) => {
        l.colorValue = maxDist > 0 ? l.distanceM / maxDist : 0;
      });
    } else if (colorColumn) {
      const values = lines
        .map((l) => parseFloat(l.row[colorColumn]))
        .filter((v) => !isNaN(v));
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const range = maxVal - minVal || 1;
      lines.forEach((l) => {
        const v = parseFloat(l.row[colorColumn]);
        l.colorValue = isNaN(v) ? 0 : (v - minVal) / range;
      });
    }

    // Sort
    if (sortBy === 'distance') {
      lines.sort((a, b) => sortDesc ? b.distanceM - a.distanceM : a.distanceM - b.distanceM);
    } else if (colorColumn) {
      lines.sort((a, b) => {
        const va = parseFloat(a.row[colorColumn]) || 0;
        const vb = parseFloat(b.row[colorColumn]) || 0;
        return sortDesc ? vb - va : va - vb;
      });
    }

    // Top N
    if (showTopN > 0 && showTopN < lines.length) {
      lines = lines.slice(0, showTopN);
    }

    return {
      center,
      lines,
      maxDistanceM: maxDist,
      colorMode,
      colorColumn,
      visible: true,
    };
  }, [center, data, maxRadius, colorMode, colorColumn, sortBy, sortDesc, showTopN]);

  // Sync to parent
  useEffect(() => {
    onSpiderChange(spiderResult);
  }, [spiderResult]);

  // Stats
  const stats = useMemo(() => {
    if (!spiderResult || spiderResult.lines.length === 0) return null;
    const dists = spiderResult.lines.map((l) => l.distanceM);
    return {
      count: dists.length,
      avgDist: dists.reduce((a, b) => a + b, 0) / dists.length,
      minDist: Math.min(...dists),
      maxDist: Math.max(...dists),
      medianDist: dists.sort((a, b) => a - b)[Math.floor(dists.length / 2)],
    };
  }, [spiderResult]);

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  const gradient = GRADIENT_PRESETS[gradientIdx];

  const handleStartSelect = () => {
    onSelectModeChange(true);
  };

  const handleReset = () => {
    setCenter(null);
    onSelectModeChange(false);
    onSpiderChange(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Waypoints className="h-4 w-4" />
          <span className="text-sm font-medium">Spider Map</span>
        </div>
        {center && (
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
            중심점을 설정하면 모든 데이터 포인트로 방사형 연결선을 그립니다.
            매장-고객, 물류센터-배송지 등의 관계를 시각화합니다.
          </p>

          {/* Center selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Center Point
            </Label>

            {center ? (
              <div className="rounded-lg border p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono">
                    {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                  </span>
                  <button
                    onClick={handleStartSelect}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartSelect}
                className="w-full h-10 text-xs"
              >
                <Crosshair className="h-4 w-4 mr-2" />
                Click map to set center
              </Button>
            )}

            {isSelectMode && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs">
                <Crosshair className="h-4 w-4 animate-pulse text-primary" />
                <span>Click on the map</span>
              </div>
            )}
          </div>

          {center && (
            <>
              <Separator />

              {/* Max radius */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Max Radius
                  </Label>
                  <span className="text-xs font-mono">{formatDist(maxRadius)}</span>
                </div>
                <Slider
                  value={[maxRadius]}
                  onValueChange={([v]) => setMaxRadius(v)}
                  min={100}
                  max={50000}
                  step={100}
                  className="w-full"
                />
                <div className="flex gap-1">
                  {[500, 1000, 2000, 5000, 10000, 50000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMaxRadius(v)}
                      className={cn(
                        'flex-1 py-1 text-[9px] rounded border transition-colors',
                        maxRadius === v
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-transparent'
                      )}
                    >
                      {v >= 1000 ? `${v / 1000}km` : `${v}m`}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Color mode */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Line Color By
                </Label>
                <div className="flex gap-1">
                  <Button
                    variant={colorMode === 'distance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setColorMode('distance')}
                    className="flex-1 h-8 text-xs"
                  >
                    Distance
                  </Button>
                  <Button
                    variant={colorMode === 'column' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setColorMode('column')}
                    className="flex-1 h-8 text-xs"
                    disabled={numericCols.length === 0}
                  >
                    Column Value
                  </Button>
                </div>

                {colorMode === 'column' && (
                  <Select value={colorColumn} onValueChange={setColorColumn}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Gradient */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Color Gradient
                </Label>
                <div className="grid grid-cols-2 gap-1">
                  {GRADIENT_PRESETS.map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => setGradientIdx(i)}
                      className={cn(
                        'h-7 rounded-md border text-[10px] flex items-center gap-1.5 px-2 transition-colors',
                        gradientIdx === i ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                      )}
                    >
                      <div
                        className="w-10 h-3 rounded-sm"
                        style={{
                          background: `linear-gradient(90deg, rgb(${g.from.join(',')}), rgb(${g.to.join(',')}))`,
                        }}
                      />
                      <span className="truncate">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Line opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Opacity
                  </Label>
                  <span className="text-xs font-mono">{lineOpacity}%</span>
                </div>
                <Slider
                  value={[lineOpacity]}
                  onValueChange={([v]) => setLineOpacity(v)}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* Sort & limit */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sort & Limit
                </Label>
                <div className="flex gap-1">
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">By Distance</SelectItem>
                      {colorColumn && <SelectItem value="value">By {colorColumn}</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDesc(!sortDesc)}
                    className="h-8 w-8 p-0"
                  >
                    {sortDesc ? <SortDesc className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                {/* Top N */}
                <div className="flex gap-1">
                  {[0, 10, 20, 50, 100].map((n) => (
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

              <Separator />

              {/* Stats */}
              {stats && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Distance Stats
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard label="Connections" value={stats.count.toLocaleString()} />
                    <StatCard label="Avg Distance" value={formatDist(stats.avgDist)} />
                    <StatCard label="Min" value={formatDist(stats.minDist)} />
                    <StatCard label="Max" value={formatDist(stats.maxDist)} />
                    <StatCard label="Median" value={formatDist(stats.medianDist)} />
                    <StatCard
                      label="Total Length"
                      value={formatDist(
                        spiderResult!.lines.reduce((s, l) => s + l.distanceM, 0)
                      )}
                    />
                  </div>

                  {/* Distance distribution */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">Distance Distribution</div>
                    <DistributionBar lines={spiderResult!.lines} gradient={gradient} />
                  </div>
                </div>
              )}

              {/* Top connections list */}
              {spiderResult && spiderResult.lines.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Connections ({spiderResult.lines.length})
                    </Label>
                    <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                      {spiderResult.lines.slice(0, 30).map((line, i) => {
                        const name = line.row.name || line.row.id || `Point ${i + 1}`;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-muted"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: interpolateColor(line.colorValue, gradient) }}
                            />
                            <span className="flex-1 truncate">{name}</span>
                            <span className="font-mono text-muted-foreground flex-shrink-0">
                              {formatDist(line.distanceM)}
                            </span>
                          </div>
                        );
                      })}
                      {spiderResult.lines.length > 30 && (
                        <div className="text-[10px] text-center text-muted-foreground py-1">
                          +{spiderResult.lines.length - 30} more
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Empty state */}
          {!center && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Waypoints className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>중심점을 설정하면</p>
              <p>방사형 연결선이 표시됩니다.</p>
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

function DistributionBar({
  lines,
  gradient,
}: {
  lines: SpiderLine[];
  gradient: typeof GRADIENT_PRESETS[0];
}) {
  // 5 buckets
  const maxDist = Math.max(...lines.map((l) => l.distanceM), 1);
  const buckets = [0, 0, 0, 0, 0];
  lines.forEach((l) => {
    const idx = Math.min(Math.floor((l.distanceM / maxDist) * 5), 4);
    buckets[idx]++;
  });
  const maxBucket = Math.max(...buckets, 1);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {buckets.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${(count / maxBucket) * 100}%`,
              minHeight: count > 0 ? 2 : 0,
              backgroundColor: interpolateColor(i / 4, gradient),
            }}
          />
        </div>
      ))}
    </div>
  );
}

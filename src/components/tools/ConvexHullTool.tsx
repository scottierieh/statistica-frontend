// components/tools/ConvexHullTool.tsx
// 볼록 껍질 (Convex Hull) - 데이터 포인트 외곽 경계선 + 면적/둘레 통계

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { haversineDistance, formatNumber, analyzeColumns } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pentagon,
  RotateCcw,
  Palette,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Convex Hull Algorithm (Graham Scan)
// ─────────────────────────────────────────
function cross(O: GeoPoint, A: GeoPoint, B: GeoPoint): number {
  return (A.lng - O.lng) * (B.lat - O.lat) - (A.lat - O.lat) * (B.lng - O.lng);
}

function computeConvexHull(points: GeoPoint[]): GeoPoint[] {
  if (points.length < 3) return [...points];

  // Sort by lng, then lat
  const sorted = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat);

  // Build lower hull
  const lower: GeoPoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper: GeoPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half (duplicate)
  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

// ─────────────────────────────────────────
// Area & Perimeter calculations
// ─────────────────────────────────────────
function computePolygonAreaKm2(hull: GeoPoint[]): number {
  // Shoelace formula in approximate km (using lat/lng as planar coords)
  // More accurate: convert to meters using center lat
  if (hull.length < 3) return 0;

  const centerLat = hull.reduce((s, p) => s + p.lat, 0) / hull.length;
  const latToKm = 111.32;
  const lngToKm = 111.32 * Math.cos((centerLat * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    const xi = hull[i].lng * lngToKm;
    const yi = hull[i].lat * latToKm;
    const xj = hull[j].lng * lngToKm;
    const yj = hull[j].lat * latToKm;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area) / 2;
}

function computePerimeterKm(hull: GeoPoint[]): number {
  if (hull.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    total += haversineDistance(hull[i], hull[j]);
  }
  return total / 1000; // meters → km
}

// ─────────────────────────────────────────
// Hull colors
// ─────────────────────────────────────────
const HULL_COLORS = [
  { fill: 'rgba(59, 130, 246, 0.12)', stroke: '#3b82f6', label: 'Blue' },
  { fill: 'rgba(239, 68, 68, 0.12)', stroke: '#ef4444', label: 'Red' },
  { fill: 'rgba(34, 197, 94, 0.12)', stroke: '#22c55e', label: 'Green' },
  { fill: 'rgba(168, 85, 247, 0.12)', stroke: '#a855f7', label: 'Purple' },
  { fill: 'rgba(249, 115, 22, 0.12)', stroke: '#f97316', label: 'Orange' },
  { fill: 'rgba(236, 72, 153, 0.12)', stroke: '#ec4899', label: 'Pink' },
  { fill: 'rgba(20, 184, 166, 0.12)', stroke: '#14b8a6', label: 'Teal' },
  { fill: 'rgba(234, 179, 8, 0.12)', stroke: '#eab308', label: 'Yellow' },
];

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface HullResult {
  id: string;
  label: string;
  hull: GeoPoint[];
  pointCount: number;
  areaKm2: number;
  perimeterKm: number;
  colorIdx: number;
  visible: boolean;
}

interface ConvexHullToolProps {
  data: MapDataRow[];
  onHullsChange: (hulls: HullResult[]) => void;
}

export default function ConvexHullTool({ data, onHullsChange }: ConvexHullToolProps) {
  const [mode, setMode] = useState<'all' | 'by-category'>('all');
  const [categoryColumn, setCategoryColumn] = useState<string>('');
  const [showVertices, setShowVertices] = useState(false);
  const [hulls, setHulls] = useState<HullResult[]>([]);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const categoricalCols = useMemo(
    () => columns.filter((c) => c.type === 'categorical'),
    [columns]
  );

  // Auto-select first categorical column
  useEffect(() => {
    if (categoricalCols.length > 0 && !categoryColumn) {
      setCategoryColumn(categoricalCols[0].name);
    }
  }, [categoricalCols]);

  // Compute hulls
  const computedHulls = useMemo(() => {
    if (data.length < 3) return [];

    if (mode === 'all') {
      const points = data.map((r) => ({ lat: r.lat, lng: r.lng }));
      const hull = computeConvexHull(points);
      return [
        {
          id: 'all',
          label: 'All Points',
          hull,
          pointCount: data.length,
          areaKm2: computePolygonAreaKm2(hull),
          perimeterKm: computePerimeterKm(hull),
          colorIdx: 0,
          visible: true,
        },
      ];
    }

    // By category
    if (!categoryColumn) return [];
    const groups = new Map<string, MapDataRow[]>();
    data.forEach((row) => {
      const key = String(row[categoryColumn] ?? 'Unknown');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });

    const results: HullResult[] = [];
    let idx = 0;
    groups.forEach((rows, key) => {
      if (rows.length < 3) return; // Need at least 3 points
      const points = rows.map((r) => ({ lat: r.lat, lng: r.lng }));
      const hull = computeConvexHull(points);
      results.push({
        id: `cat_${idx}`,
        label: key,
        hull,
        pointCount: rows.length,
        areaKm2: computePolygonAreaKm2(hull),
        perimeterKm: computePerimeterKm(hull),
        colorIdx: idx % HULL_COLORS.length,
        visible: true,
      });
      idx++;
    });

    // Sort by area descending
    results.sort((a, b) => b.areaKm2 - a.areaKm2);
    return results;
  }, [data, mode, categoryColumn]);

  // Update state & parent
  useEffect(() => {
    setHulls(computedHulls);
  }, [computedHulls]);

  useEffect(() => {
    onHullsChange(hulls);
  }, [hulls]);

  const toggleVisibility = (id: string) => {
    setHulls((prev) =>
      prev.map((h) => (h.id === id ? { ...h, visible: !h.visible } : h))
    );
  };

  const totalArea = hulls.reduce((s, h) => s + (h.visible ? h.areaKm2 : 0), 0);
  const totalPoints = hulls.reduce((s, h) => s + (h.visible ? h.pointCount : 0), 0);

  const formatArea = (km2: number) => {
    if (km2 < 0.01) return `${(km2 * 1000000).toFixed(0)} m²`;
    if (km2 < 1) return `${(km2 * 1000000).toFixed(0)} m²`;
    return `${km2.toFixed(2)} km²`;
  };

  const formatPerimeter = (km: number) => {
    if (km < 1) return `${(km * 1000).toFixed(0)} m`;
    return `${km.toFixed(2)} km`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Pentagon className="h-4 w-4" />
          <span className="text-sm font-medium">Convex Hull</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {hulls.length} hull{hulls.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Info */}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            데이터 포인트의 외곽 경계(볼록 껍질)를 계산합니다.
            전체 데이터 또는 카테고리별로 각각의 영역을 비교할 수 있습니다.
          </p>

          {/* Mode selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mode
            </Label>
            <div className="flex gap-1">
              <Button
                variant={mode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('all')}
                className="flex-1 h-8 text-xs"
              >
                <Pentagon className="h-3.5 w-3.5 mr-1" />
                All Points
              </Button>
              <Button
                variant={mode === 'by-category' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('by-category')}
                className="flex-1 h-8 text-xs"
                disabled={categoricalCols.length === 0}
              >
                <Layers className="h-3.5 w-3.5 mr-1" />
                By Category
              </Button>
            </div>
          </div>

          {/* Category column selector */}
          {mode === 'by-category' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Group By
              </Label>
              <Select value={categoryColumn} onValueChange={setCategoryColumn}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {categoricalCols.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Options */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-vertices"
              checked={showVertices}
              onCheckedChange={(v) => setShowVertices(!!v)}
            />
            <label htmlFor="show-vertices" className="text-xs cursor-pointer">
              Show hull vertices
            </label>
          </div>

          <Separator />

          {/* Summary stats */}
          {hulls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">Total Area</div>
                <div className="text-sm font-bold font-mono">{formatArea(totalArea)}</div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">Points</div>
                <div className="text-sm font-bold font-mono">{totalPoints.toLocaleString()}</div>
              </div>
            </div>
          )}

          <Separator />

          {/* Hull list */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Hulls
            </Label>

            {hulls.map((hull) => {
              const color = HULL_COLORS[hull.colorIdx];
              return (
                <div
                  key={hull.id}
                  className={cn(
                    'rounded-lg border p-2.5 space-y-2 transition-opacity',
                    !hull.visible && 'opacity-40'
                  )}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0 border"
                        style={{
                          backgroundColor: color.fill,
                          borderColor: color.stroke,
                        }}
                      />
                      <span className="text-xs font-medium truncate">{hull.label}</span>
                    </div>
                    <button
                      onClick={() => toggleVisibility(hull.id)}
                      className="p-1 hover:bg-muted rounded flex-shrink-0"
                    >
                      {hull.visible ? (
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <div className="text-center">
                      <div className="text-muted-foreground">Points</div>
                      <div className="font-bold font-mono">{hull.pointCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Area</div>
                      <div className="font-bold font-mono">{formatArea(hull.areaKm2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Perimeter</div>
                      <div className="font-bold font-mono">{formatPerimeter(hull.perimeterKm)}</div>
                    </div>
                  </div>

                  {/* Density */}
                  <div className="text-[10px] text-muted-foreground text-center">
                    Density: <strong>
                      {hull.areaKm2 > 0
                        ? `${(hull.pointCount / hull.areaKm2).toFixed(1)} pts/km²`
                        : '—'}
                    </strong>
                  </div>

                  {/* Area bar (relative to largest) */}
                  {hulls.length > 1 && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            (hull.areaKm2 / Math.max(...hulls.map((h) => h.areaKm2), 0.001)) * 100
                          }%`,
                          backgroundColor: color.stroke,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison table (for multi-hull) */}
          {hulls.length > 1 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Comparison
                </Label>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-2 py-1 font-medium">Group</th>
                        <th className="text-right px-2 py-1 font-medium">Pts</th>
                        <th className="text-right px-2 py-1 font-medium">Area</th>
                        <th className="text-right px-2 py-1 font-medium">Density</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hulls.map((hull) => {
                        const color = HULL_COLORS[hull.colorIdx];
                        return (
                          <tr key={hull.id} className="border-t">
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: color.stroke }}
                                />
                                <span className="truncate">{hull.label}</span>
                              </div>
                            </td>
                            <td className="text-right px-2 py-1 font-mono">{hull.pointCount}</td>
                            <td className="text-right px-2 py-1 font-mono">{formatArea(hull.areaKm2)}</td>
                            <td className="text-right px-2 py-1 font-mono">
                              {hull.areaKm2 > 0 ? `${(hull.pointCount / hull.areaKm2).toFixed(1)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {data.length < 3 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Pentagon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>3개 이상의 데이터 포인트가</p>
              <p>필요합니다.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export { computeConvexHull, HULL_COLORS };
export type { HullResult as ConvexHullResult };

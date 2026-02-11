// components/tools/SpatialJoinTool.tsx
// Spatial Join — count & aggregate points within defined areas

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { haversineDistance, formatNumber, generateCirclePoints } from '@/lib/map-utils';
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
  Combine,
  Play,
  RotateCcw,
  ArrowDown,
  ArrowUp,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface SpatialArea {
  id: string;
  label: string;
  center: GeoPoint;
  radiusM: number;
  polygon: [number, number][];
  color: string;
  pointCount: number;
  pointsInside: MapDataRow[];
  aggregations: Record<string, number>;
}

export interface SpatialJoinResult {
  areas: SpatialArea[];
  unmatched: number;
  visible: boolean;
}

interface SpatialJoinToolProps {
  data: MapDataRow[];
  filteredData: MapDataRow[];
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onResultChange: (result: SpatialJoinResult | null) => void;
}

// ─────────────────────────────────────────
// Colors
// ─────────────────────────────────────────
const AREA_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#a855f7', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
];

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function SpatialJoinTool({
  data,
  filteredData,
  allHeaders,
  numericHeaders,
  categoricalHeaders,
  onResultChange,
}: SpatialJoinToolProps) {
  const [mode, setMode] = useState<'category' | 'grid'>('category');

  // Category mode: use one category group as "areas", count other group's points
  const [areaColumn, setAreaColumn] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [pointValue, setPointValue] = useState('');
  const [radiusM, setRadiusM] = useState(500);

  // Grid mode: divide map into grid cells
  const [gridSizeM, setGridSizeM] = useState(1000);

  // Shared
  const [aggColumn, setAggColumn] = useState('');
  const [aggMethod, setAggMethod] = useState<'count' | 'sum' | 'avg'>('count');
  const [sortBy, setSortBy] = useState<'count' | 'agg'>('count');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [isComputed, setIsComputed] = useState(false);
  const [areas, setAreas] = useState<SpatialArea[]>([]);
  const [unmatched, setUnmatched] = useState(0);

  // Unique values
  const uniqueValues = useMemo(() => {
    if (!areaColumn) return [];
    return [...new Set(filteredData.map((r) => String(r[areaColumn] ?? '')))].sort();
  }, [filteredData, areaColumn]);

  useEffect(() => {
    setAreaValue('');
    setPointValue('');
    setIsComputed(false);
    onResultChange(null);
  }, [areaColumn]);

  const compute = () => {
    const result: SpatialArea[] = [];
    let unmatchedCount = 0;

    if (mode === 'category' && areaColumn && areaValue && pointValue) {
      // Area centers = points in areaValue group
      const areaPts = filteredData.filter((r) => String(r[areaColumn]) === areaValue);
      const targetPts = filteredData.filter((r) => String(r[areaColumn]) === pointValue);

      areaPts.forEach((ap, i) => {
        const center: GeoPoint = { lat: ap.lat, lng: ap.lng };
        const inside = targetPts.filter(
          (tp) => haversineDistance(center, { lat: tp.lat, lng: tp.lng }) <= radiusM
        );

        const aggs: Record<string, number> = {};
        if (aggColumn && inside.length > 0) {
          const vals = inside.map((r) => parseFloat(r[aggColumn]) || 0);
          if (aggMethod === 'sum') aggs[aggColumn] = vals.reduce((a, b) => a + b, 0);
          else if (aggMethod === 'avg') aggs[aggColumn] = vals.reduce((a, b) => a + b, 0) / vals.length;
          else aggs[aggColumn] = inside.length;
        }

        result.push({
          id: ap.id,
          label: String(ap.name || ap.id),
          center,
          radiusM,
          polygon: generateCirclePoints(center, radiusM, 48).map((p) => [p.lat, p.lng] as [number, number]),
          color: AREA_COLORS[i % AREA_COLORS.length],
          pointCount: inside.length,
          pointsInside: inside,
          aggregations: aggs,
        });
      });

      // Count unmatched target points
      const matchedIds = new Set(result.flatMap((a) => a.pointsInside.map((p) => p.id)));
      unmatchedCount = targetPts.filter((p) => !matchedIds.has(p.id)).length;
    } else if (mode === 'grid') {
      // Build grid cells
      if (filteredData.length === 0) return;

      const lats = filteredData.map((r) => r.lat);
      const lngs = filteredData.map((r) => r.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Convert grid size to degrees (approximate)
      const latStep = gridSizeM / 111320;
      const midLat = (minLat + maxLat) / 2;
      const lngStep = gridSizeM / (111320 * Math.cos((midLat * Math.PI) / 180));

      let cellIdx = 0;
      for (let lat = minLat; lat < maxLat + latStep; lat += latStep) {
        for (let lng = minLng; lng < maxLng + lngStep; lng += lngStep) {
          const cellPts = filteredData.filter(
            (r) => r.lat >= lat && r.lat < lat + latStep && r.lng >= lng && r.lng < lng + lngStep
          );
          if (cellPts.length === 0) continue;

          const center: GeoPoint = { lat: lat + latStep / 2, lng: lng + lngStep / 2 };
          const polygon: [number, number][] = [
            [lat, lng],
            [lat + latStep, lng],
            [lat + latStep, lng + lngStep],
            [lat, lng + lngStep],
            [lat, lng],
          ];

          const aggs: Record<string, number> = {};
          if (aggColumn && cellPts.length > 0) {
            const vals = cellPts.map((r) => parseFloat(r[aggColumn]) || 0);
            if (aggMethod === 'sum') aggs[aggColumn] = vals.reduce((a, b) => a + b, 0);
            else if (aggMethod === 'avg') aggs[aggColumn] = vals.reduce((a, b) => a + b, 0) / vals.length;
            else aggs[aggColumn] = cellPts.length;
          }

          // Color intensity by count
          const intensity = Math.min(cellPts.length / 10, 1);
          const hue = 210 - intensity * 160; // blue → red

          result.push({
            id: `cell_${cellIdx++}`,
            label: `Cell (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
            center,
            radiusM: gridSizeM / 2,
            polygon,
            color: `hsl(${hue}, 70%, 50%)`,
            pointCount: cellPts.length,
            pointsInside: cellPts,
            aggregations: aggs,
          });
        }
      }
    }

    // Sort
    result.sort((a, b) => {
      const va = sortBy === 'agg' && aggColumn ? (a.aggregations[aggColumn] ?? 0) : a.pointCount;
      const vb = sortBy === 'agg' && aggColumn ? (b.aggregations[aggColumn] ?? 0) : b.pointCount;
      return sortDir === 'desc' ? vb - va : va - vb;
    });

    setAreas(result);
    setUnmatched(unmatchedCount);
    setIsComputed(true);
  };

  // Stats
  const stats = useMemo(() => {
    if (areas.length === 0) return null;
    const counts = areas.map((a) => a.pointCount);
    const total = counts.reduce((a, b) => a + b, 0);
    return {
      totalAreas: areas.length,
      totalPoints: total,
      avgPerArea: total / areas.length,
      maxCount: Math.max(...counts),
      emptyAreas: counts.filter((c) => c === 0).length,
    };
  }, [areas]);

  // Sync
  useEffect(() => {
    if (!isComputed || areas.length === 0) {
      onResultChange(null);
      return;
    }
    onResultChange({ areas, unmatched, visible: true });
  }, [areas, isComputed, unmatched]);

  const handleReset = () => {
    setAreas([]);
    setIsComputed(false);
    setUnmatched(0);
    onResultChange(null);
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['area', 'lat', 'lng', 'point_count', ...(aggColumn ? [`${aggMethod}_${aggColumn}`] : [])];
    const rows = areas.map((a) => [
      a.label,
      a.center.lat.toFixed(5),
      a.center.lng.toFixed(5),
      a.pointCount,
      ...(aggColumn ? [a.aggregations[aggColumn]?.toFixed(2) ?? ''] : []),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spatial_join.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Combine className="h-4 w-4" />
          <span className="text-sm font-medium">Spatial Join</span>
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
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Count and aggregate points within defined areas.
            Split by category or use a grid overlay.
          </p>

          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Area Type
            </Label>
            <div className="flex gap-1">
              <Button
                variant={mode === 'category' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('category'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                Category Radius
              </Button>
              <Button
                variant={mode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('grid'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                Grid Cells
              </Button>
            </div>
          </div>

          {mode === 'category' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Group Column
                </Label>
                <Select value={areaColumn} onValueChange={setAreaColumn}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoricalHeaders.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {areaColumn && uniqueValues.length > 0 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      ⭕ Area Centers (from)
                    </Label>
                    <Select value={areaValue} onValueChange={(v) => { setAreaValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Area group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueValues.map((v) => (
                          <SelectItem key={v} value={v} className="text-xs">
                            {v} ({filteredData.filter((r) => String(r[areaColumn]) === v).length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      📍 Points to Count
                    </Label>
                    <Select value={pointValue} onValueChange={(v) => { setPointValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Point group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueValues.filter((v) => v !== areaValue).map((v) => (
                          <SelectItem key={v} value={v} className="text-xs">
                            {v} ({filteredData.filter((r) => String(r[areaColumn]) === v).length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Search Radius
                  </Label>
                  <span className="text-xs font-mono">
                    {radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)} km` : `${radiusM} m`}
                  </span>
                </div>
                <Slider
                  value={[radiusM]}
                  onValueChange={([v]) => { setRadiusM(v); setIsComputed(false); }}
                  min={100}
                  max={5000}
                  step={100}
                />
              </div>
            </>
          )}

          {mode === 'grid' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Grid Cell Size
                </Label>
                <span className="text-xs font-mono">
                  {gridSizeM >= 1000 ? `${(gridSizeM / 1000).toFixed(1)} km` : `${gridSizeM} m`}
                </span>
              </div>
              <Slider
                value={[gridSizeM]}
                onValueChange={([v]) => { setGridSizeM(v); setIsComputed(false); }}
                min={200}
                max={10000}
                step={200}
              />
            </div>
          )}

          <Separator />

          {/* Aggregation */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Aggregate <span className="font-normal">(optional)</span>
            </Label>
            <div className="flex gap-1">
              <Select value={aggColumn} onValueChange={(v) => { setAggColumn(v === '_none' ? '' : v); setIsComputed(false); }}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Column..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" className="text-xs">None</SelectItem>
                  {numericHeaders.map((h) => (
                    <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={aggMethod} onValueChange={(v) => { setAggMethod(v as any); setIsComputed(false); }}>
                <SelectTrigger className="h-8 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count" className="text-xs">Count</SelectItem>
                  <SelectItem value="sum" className="text-xs">Sum</SelectItem>
                  <SelectItem value="avg" className="text-xs">Avg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Run */}
          <Button
            onClick={compute}
            disabled={
              filteredData.length === 0 ||
              (mode === 'category' && (!areaColumn || !areaValue || !pointValue))
            }
            className="w-full h-10"
          >
            <Play className="h-4 w-4 mr-2" />
            {isComputed ? 'Recompute' : 'Run Spatial Join'}
          </Button>

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Areas" value={stats.totalAreas.toString()} />
                <StatCard label="Matched Points" value={stats.totalPoints.toString()} />
                <StatCard label="Avg per Area" value={stats.avgPerArea.toFixed(1)} />
                <StatCard label="Max Count" value={stats.maxCount.toString()} />
              </div>

              {unmatched > 0 && (
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-[10px] text-yellow-700">
                  ⚠️ {unmatched} points not within any area radius.
                </div>
              )}

              {stats.emptyAreas > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  {stats.emptyAreas} area(s) have 0 points inside.
                </div>
              )}

              <Separator />

              {/* Sort controls */}
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-muted-foreground">Sort:</Label>
                <button
                  onClick={() => setSortBy('count')}
                  className={cn('text-[10px] px-1.5 py-0.5 rounded', sortBy === 'count' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  Count
                </button>
                {aggColumn && (
                  <button
                    onClick={() => setSortBy('agg')}
                    className={cn('text-[10px] px-1.5 py-0.5 rounded', sortBy === 'agg' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                  >
                    {aggMethod}
                  </button>
                )}
                <button
                  onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                </button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={exportCSV} className="h-6 text-[10px] px-2">
                  <Download className="h-2.5 w-2.5 mr-1" />
                  CSV
                </Button>
              </div>

              {/* Area list */}
              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {areas.map((area, i) => (
                  <div key={area.id} className="flex items-center gap-2 p-1.5 rounded-lg border text-[10px] hover:bg-muted/50">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: area.color }} />
                    <span className="flex-1 truncate max-w-[100px]">{area.label}</span>
                    <Badge variant="secondary" className="text-[8px] h-4 px-1">
                      {area.pointCount} pts
                    </Badge>
                    {aggColumn && area.aggregations[aggColumn] !== undefined && (
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {formatNumber(area.aggregations[aggColumn])}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {filteredData.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Combine className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data to run spatial join.</p>
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

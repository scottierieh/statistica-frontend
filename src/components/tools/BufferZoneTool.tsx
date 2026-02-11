// components/tools/BufferZoneTool.tsx
// Buffer Zone — circular buffers around each point with overlap analysis

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
  CircleDashed,
  Play,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface BufferCircle {
  center: GeoPoint;
  radiusM: number;
  polygon: [number, number][]; // circle outline [lat,lng]
  row: MapDataRow;
  color: string;
  overlappingWith: number; // count of overlapping buffers
}

export interface BufferZoneResult {
  buffers: BufferCircle[];
  radiusM: number;
  visible: boolean;
}

interface BufferZoneToolProps {
  data: MapDataRow[];
  filteredData: MapDataRow[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onResultChange: (result: BufferZoneResult | null) => void;
}

// ─────────────────────────────────────────
// Color palettes
// ─────────────────────────────────────────
const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function BufferZoneTool({
  data,
  filteredData,
  numericHeaders,
  categoricalHeaders,
  onResultChange,
}: BufferZoneToolProps) {
  const [radiusM, setRadiusM] = useState(500);
  const [maxPoints, setMaxPoints] = useState(50);
  const [colorBy, setColorBy] = useState<'uniform' | 'category' | 'overlap'>('uniform');
  const [categoryColumn, setCategoryColumn] = useState('');
  const [uniformColor, setUniformColor] = useState('#3b82f6');
  const [isComputed, setIsComputed] = useState(false);
  const [buffers, setBuffers] = useState<BufferCircle[]>([]);
  const [variableRadius, setVariableRadius] = useState(false);
  const [radiusColumn, setRadiusColumn] = useState('');
  const [radiusMin, setRadiusMin] = useState(200);
  const [radiusMax, setRadiusMax] = useState(1000);

  const compute = () => {
    const pts = filteredData.slice(0, maxPoints);

    // Compute radius per point
    let radii: number[];
    if (variableRadius && radiusColumn) {
      const values = pts.map((r) => parseFloat(r[radiusColumn]) || 0);
      const vMin = Math.min(...values);
      const vMax = Math.max(...values);
      const vRange = vMax - vMin || 1;
      radii = values.map((v) => radiusMin + ((v - vMin) / vRange) * (radiusMax - radiusMin));
    } else {
      radii = pts.map(() => radiusM);
    }

    // Category colors
    const catMap = new Map<string, string>();
    if (colorBy === 'category' && categoryColumn) {
      const cats = [...new Set(pts.map((r) => String(r[categoryColumn] ?? '')))];
      cats.forEach((c, i) => catMap.set(c, COLORS[i % COLORS.length]));
    }

    // Build buffers
    const result: BufferCircle[] = pts.map((row, i) => {
      const center: GeoPoint = { lat: row.lat, lng: row.lng };
      const r = radii[i];
      const polygon = generateCirclePoints(center, r, 48).map(
        (p) => [p.lat, p.lng] as [number, number]
      );

      let color = uniformColor;
      if (colorBy === 'category' && categoryColumn) {
        color = catMap.get(String(row[categoryColumn])) || uniformColor;
      }

      return {
        center,
        radiusM: r,
        polygon,
        row,
        color,
        overlappingWith: 0,
      };
    });

    // Count overlaps
    for (let i = 0; i < result.length; i++) {
      let count = 0;
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const dist = haversineDistance(result[i].center, result[j].center);
        if (dist < result[i].radiusM + result[j].radiusM) {
          count++;
        }
      }
      result[i].overlappingWith = count;
    }

    // Overlap coloring
    if (colorBy === 'overlap') {
      const maxOverlap = Math.max(...result.map((b) => b.overlappingWith), 1);
      result.forEach((b) => {
        const ratio = b.overlappingWith / maxOverlap;
        if (ratio === 0) b.color = '#22c55e';
        else if (ratio < 0.33) b.color = '#eab308';
        else if (ratio < 0.66) b.color = '#f97316';
        else b.color = '#ef4444';
      });
    }

    setBuffers(result);
    setIsComputed(true);
  };

  // Stats
  const stats = useMemo(() => {
    if (buffers.length === 0) return null;
    const overlapping = buffers.filter((b) => b.overlappingWith > 0).length;
    const isolated = buffers.filter((b) => b.overlappingWith === 0).length;
    const avgOverlap = buffers.reduce((s, b) => s + b.overlappingWith, 0) / buffers.length;
    const totalArea = buffers.reduce((s, b) => s + Math.PI * (b.radiusM / 1000) ** 2, 0);
    return { overlapping, isolated, avgOverlap, totalArea };
  }, [buffers]);

  // Sync
  useEffect(() => {
    if (!isComputed || buffers.length === 0) {
      onResultChange(null);
      return;
    }
    onResultChange({ buffers, radiusM, visible: true });
  }, [buffers, isComputed]);

  const handleReset = () => {
    setBuffers([]);
    setIsComputed(false);
    onResultChange(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <CircleDashed className="h-4 w-4" />
          <span className="text-sm font-medium">Buffer Zone</span>
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
            Draw circular buffer zones around each point to visualize
            coverage areas and detect overlaps.
          </p>

          {/* Fixed or Variable radius */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1">
                Radius Mode
              </Label>
            </div>
            <div className="flex gap-1">
              <Button
                variant={!variableRadius ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setVariableRadius(false); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                Fixed
              </Button>
              <Button
                variant={variableRadius ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setVariableRadius(true); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                By Column
              </Button>
            </div>
          </div>

          {!variableRadius ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Radius
                </Label>
                <span className="text-xs font-mono">
                  {radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)} km` : `${radiusM} m`}
                </span>
              </div>
              <Slider
                value={[radiusM]}
                onValueChange={([v]) => { setRadiusM(v); setIsComputed(false); }}
                min={50}
                max={5000}
                step={50}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Radius Column
                </Label>
                <Select value={radiusColumn} onValueChange={(v) => { setRadiusColumn(v); setIsComputed(false); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {numericHeaders.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Min radius</Label>
                  <Slider value={[radiusMin]} onValueChange={([v]) => { setRadiusMin(v); setIsComputed(false); }} min={50} max={2000} step={50} />
                  <div className="text-[9px] font-mono text-center">{radiusMin}m</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Max radius</Label>
                  <Slider value={[radiusMax]} onValueChange={([v]) => { setRadiusMax(v); setIsComputed(false); }} min={200} max={5000} step={50} />
                  <div className="text-[9px] font-mono text-center">{radiusMax}m</div>
                </div>
              </div>
            </>
          )}

          {/* Max points */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Max Points
              </Label>
              <span className="text-xs font-mono">{Math.min(maxPoints, filteredData.length)}</span>
            </div>
            <Slider
              value={[maxPoints]}
              onValueChange={([v]) => { setMaxPoints(v); setIsComputed(false); }}
              min={5}
              max={Math.min(200, filteredData.length || 200)}
              step={5}
            />
          </div>

          <Separator />

          {/* Color mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Color By
            </Label>
            <div className="flex gap-1">
              {[
                { id: 'uniform' as const, label: 'Uniform' },
                { id: 'category' as const, label: 'Category' },
                { id: 'overlap' as const, label: 'Overlap' },
              ].map((m) => (
                <Button
                  key={m.id}
                  variant={colorBy === m.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setColorBy(m.id); setIsComputed(false); }}
                  className="flex-1 h-7 text-[10px]"
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>

          {colorBy === 'category' && (
            <div className="space-y-1.5">
              <Select value={categoryColumn} onValueChange={(v) => { setCategoryColumn(v); setIsComputed(false); }}>
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
          )}

          {colorBy === 'overlap' && (
            <div className="flex gap-2 text-[9px]">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" />None</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />Low</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" />Mid</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" />High</div>
            </div>
          )}

          {/* Run */}
          <Button
            onClick={compute}
            disabled={filteredData.length === 0 || (variableRadius && !radiusColumn)}
            className="w-full h-10"
          >
            <Play className="h-4 w-4 mr-2" />
            {isComputed ? 'Recompute' : 'Generate Buffers'}
          </Button>

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Buffers" value={buffers.length.toString()} />
                <StatCard label="Overlapping" value={`${stats.overlapping} (${((stats.overlapping / buffers.length) * 100).toFixed(0)}%)`} />
                <StatCard label="Isolated" value={stats.isolated.toString()} />
                <StatCard label="Total Area" value={`${stats.totalArea.toFixed(1)} km²`} />
              </div>

              <div className="rounded-lg border p-2.5 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg overlaps per buffer</span>
                  <span className="font-mono font-bold">{stats.avgOverlap.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max overlaps</span>
                  <span className="font-mono">{Math.max(...buffers.map((b) => b.overlappingWith))}</span>
                </div>
              </div>

              {/* Top overlapping */}
              {buffers.some((b) => b.overlappingWith > 0) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Most Overlapping
                    </Label>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {[...buffers]
                        .sort((a, b) => b.overlappingWith - a.overlappingWith)
                        .slice(0, 10)
                        .filter((b) => b.overlappingWith > 0)
                        .map((b, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded border hover:bg-muted/50">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                            <span className="flex-1 truncate">{b.row.name || b.row.id}</span>
                            <Badge variant="outline" className="text-[8px] h-4 px-1">
                              {b.overlappingWith} overlaps
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {filteredData.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <CircleDashed className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data to create buffer zones.</p>
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

// components/tools/FlowMapTool.tsx
// Flow Map — curved arrows showing movement/flow between locations

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
  MoveRight,
  Play,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface FlowLine {
  from: MapDataRow;
  to: MapDataRow;
  value: number; // volume/weight
  distanceM: number;
  curvePoints: [number, number][]; // bezier arc [lat,lng]
}

export interface FlowMapResult {
  flows: FlowLine[];
  maxValue: number;
  visible: boolean;
}

interface FlowMapToolProps {
  data: MapDataRow[];
  filteredData: MapDataRow[];
  allHeaders: string[];
  categoricalHeaders: string[];
  numericHeaders: string[];
  onResultChange: (result: FlowMapResult | null) => void;
}

// ─────────────────────────────────────────
// Build curved arc between two points
// ─────────────────────────────────────────
function buildArc(from: GeoPoint, to: GeoPoint, segments: number = 20): [number, number][] {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;

  // Offset perpendicular to line for curve
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.2; // 20% arc height

  // Perpendicular offset
  const controlLat = midLat + (-dx / dist) * offset;
  const controlLng = midLng + (dy / dist) * offset;

  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat =
      (1 - t) * (1 - t) * from.lat +
      2 * (1 - t) * t * controlLat +
      t * t * to.lat;
    const lng =
      (1 - t) * (1 - t) * from.lng +
      2 * (1 - t) * t * controlLng +
      t * t * to.lng;
    points.push([lat, lng]);
  }
  return points;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function FlowMapTool({
  data,
  filteredData,
  allHeaders,
  categoricalHeaders,
  numericHeaders,
  onResultChange,
}: FlowMapToolProps) {
  const [mode, setMode] = useState<'group' | 'hub'>('group');
  const [groupColumn, setGroupColumn] = useState('');
  const [originValue, setOriginValue] = useState('');
  const [destValue, setDestValue] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [hubIndex, setHubIndex] = useState(0);
  const [maxFlows, setMaxFlows] = useState(50);
  const [isComputed, setIsComputed] = useState(false);
  const [flows, setFlows] = useState<FlowLine[]>([]);

  // Unique values for group column
  const uniqueValues = useMemo(() => {
    if (!groupColumn) return [];
    return [...new Set(filteredData.map((r) => String(r[groupColumn] ?? '')))].sort();
  }, [filteredData, groupColumn]);

  useEffect(() => {
    setOriginValue('');
    setDestValue('');
    setIsComputed(false);
    setFlows([]);
    onResultChange(null);
  }, [groupColumn]);

  const compute = () => {
    let origins: MapDataRow[];
    let destinations: MapDataRow[];

    if (mode === 'group' && groupColumn && originValue && destValue) {
      origins = filteredData.filter((r) => String(r[groupColumn]) === originValue);
      destinations = filteredData.filter((r) => String(r[groupColumn]) === destValue);
    } else if (mode === 'hub') {
      // Hub = first point, spokes to all others
      const hub = filteredData[hubIndex] || filteredData[0];
      origins = [hub];
      destinations = filteredData.filter((_, i) => i !== hubIndex);
    } else {
      return;
    }

    const result: FlowLine[] = [];

    if (mode === 'group') {
      // Each origin matched to nearest destination, with optional value
      for (const orig of origins.slice(0, maxFlows)) {
        let nearest: MapDataRow | null = null;
        let nearestDist = Infinity;

        for (const dest of destinations) {
          const d = haversineDistance(
            { lat: orig.lat, lng: orig.lng },
            { lat: dest.lat, lng: dest.lng }
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearest = dest;
          }
        }

        if (nearest) {
          const val = valueColumn
            ? parseFloat(orig[valueColumn]) || 1
            : 1;
          result.push({
            from: orig,
            to: nearest,
            value: val,
            distanceM: nearestDist,
            curvePoints: buildArc(
              { lat: orig.lat, lng: orig.lng },
              { lat: nearest.lat, lng: nearest.lng }
            ),
          });
        }
      }
    } else {
      // Hub mode: hub to all destinations
      const hub = origins[0];
      for (const dest of destinations.slice(0, maxFlows)) {
        const d = haversineDistance(
          { lat: hub.lat, lng: hub.lng },
          { lat: dest.lat, lng: dest.lng }
        );
        const val = valueColumn
          ? parseFloat(dest[valueColumn]) || 1
          : 1;
        result.push({
          from: hub,
          to: dest,
          value: val,
          distanceM: d,
          curvePoints: buildArc(
            { lat: hub.lat, lng: hub.lng },
            { lat: dest.lat, lng: dest.lng }
          ),
        });
      }
    }

    result.sort((a, b) => b.value - a.value);
    setFlows(result);
    setIsComputed(true);
  };

  const maxValue = useMemo(
    () => Math.max(...flows.map((f) => f.value), 1),
    [flows]
  );

  // Stats
  const stats = useMemo(() => {
    if (flows.length === 0) return null;
    const dists = flows.map((f) => f.distanceM);
    const vals = flows.map((f) => f.value);
    return {
      totalFlows: flows.length,
      totalValue: vals.reduce((a, b) => a + b, 0),
      avgDist: dists.reduce((a, b) => a + b, 0) / dists.length,
      maxDist: Math.max(...dists),
    };
  }, [flows]);

  // Sync
  useEffect(() => {
    if (!isComputed || flows.length === 0) {
      onResultChange(null);
      return;
    }
    onResultChange({ flows, maxValue, visible: true });
  }, [flows, isComputed, maxValue]);

  const handleReset = () => {
    setFlows([]);
    setIsComputed(false);
    onResultChange(null);
  };

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <MoveRight className="h-4 w-4" />
          <span className="text-sm font-medium">Flow Map</span>
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
            Visualize movement flows between locations with curved arrows.
            Line thickness encodes volume or weight.
          </p>

          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mode
            </Label>
            <div className="flex gap-1">
              <Button
                variant={mode === 'group' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('group'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                Group → Group
              </Button>
              <Button
                variant={mode === 'hub' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('hub'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                Hub → All
              </Button>
            </div>
          </div>

          {mode === 'group' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Group Column
                </Label>
                <Select value={groupColumn} onValueChange={setGroupColumn}>
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

              {groupColumn && uniqueValues.length > 0 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      🟢 Origin
                    </Label>
                    <Select value={originValue} onValueChange={(v) => { setOriginValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Origin group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueValues.map((v) => (
                          <SelectItem key={v} value={v} className="text-xs">
                            {v} ({filteredData.filter((r) => String(r[groupColumn]) === v).length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      🔴 Destination
                    </Label>
                    <Select value={destValue} onValueChange={(v) => { setDestValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Destination group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueValues.filter((v) => v !== originValue).map((v) => (
                          <SelectItem key={v} value={v} className="text-xs">
                            {v} ({filteredData.filter((r) => String(r[groupColumn]) === v).length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'hub' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Hub Point
              </Label>
              <Select
                value={String(hubIndex)}
                onValueChange={(v) => { setHubIndex(parseInt(v)); setIsComputed(false); }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select hub..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredData.slice(0, 50).map((r, i) => (
                    <SelectItem key={i} value={String(i)} className="text-xs">
                      {r.name || r.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value column (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Value Column <span className="font-normal">(optional, for line thickness)</span>
            </Label>
            <Select value={valueColumn} onValueChange={(v) => { setValueColumn(v === '_none' ? '' : v); setIsComputed(false); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None (equal weight)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none" className="text-xs">None (equal weight)</SelectItem>
                {numericHeaders.map((h) => (
                  <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max flows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Max Flows
              </Label>
              <span className="text-xs font-mono">{maxFlows}</span>
            </div>
            <Slider
              value={[maxFlows]}
              onValueChange={([v]) => { setMaxFlows(v); setIsComputed(false); }}
              min={5}
              max={100}
              step={5}
            />
          </div>

          {/* Run */}
          <Button
            onClick={compute}
            disabled={
              filteredData.length < 2 ||
              (mode === 'group' && (!groupColumn || !originValue || !destValue))
            }
            className="w-full h-10"
          >
            <Play className="h-4 w-4 mr-2" />
            {isComputed ? 'Recompute' : 'Generate Flow Map'}
          </Button>

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Flows" value={stats.totalFlows.toString()} />
                <StatCard label="Total Value" value={formatNumber(stats.totalValue)} />
                <StatCard label="Avg Distance" value={formatDist(stats.avgDist)} />
                <StatCard label="Max Distance" value={formatDist(stats.maxDist)} />
              </div>

              <Separator />

              {/* Top flows */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Top Flows
                </Label>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {flows.slice(0, 20).map((f, i) => {
                    const thickness = f.value / maxValue;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 p-1.5 rounded border text-[10px] hover:bg-muted/50"
                      >
                        <div
                          className="w-1.5 rounded-full flex-shrink-0"
                          style={{
                            height: `${Math.max(8, thickness * 20)}px`,
                            backgroundColor: `hsl(${210 + (1 - thickness) * 120}, 70%, 50%)`,
                          }}
                        />
                        <span className="truncate flex-1 max-w-[65px]">{f.from.name || f.from.id}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1 max-w-[65px]">{f.to.name || f.to.id}</span>
                        <div className="text-right ml-auto flex-shrink-0">
                          <div className="font-mono font-bold">{formatNumber(f.value)}</div>
                          <div className="text-[8px] text-muted-foreground">{formatDist(f.distanceM)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {filteredData.length < 2 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <MoveRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data with at least</p>
              <p>2 points to create flow map.</p>
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

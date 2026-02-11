// components/tools/IsochroneTool.tsx
// Isochrone (Reachability) — shows area reachable within N minutes from a point
// Uses OSRM route sampling to approximate isochrone polygons

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { haversineDistance, formatNumber } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Timer,
  Play,
  RotateCcw,
  MapPin,
  AlertTriangle,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface IsochroneBand {
  minutes: number;
  color: string;
  polygon: [number, number][]; // [lat, lng][]
  reachablePoints: MapDataRow[];
}

export interface IsochroneResult {
  center: GeoPoint;
  bands: IsochroneBand[];
  visible: boolean;
}

interface IsochroneToolProps {
  data: MapDataRow[];
  onResultChange: (result: IsochroneResult | null) => void;
  lastMapClick: GeoPoint | null;
  isMapSelectMode: boolean;
  onMapSelectModeChange: (mode: boolean) => void;
}

// ─────────────────────────────────────────
// Isochrone computation via OSRM
// ─────────────────────────────────────────

// Generate sample destination points in a radial pattern
function generateSamplePoints(center: GeoPoint, maxRadiusKm: number, numRings: number, numRays: number): GeoPoint[] {
  const points: GeoPoint[] = [];
  const R = 6371; // Earth radius km

  for (let ring = 1; ring <= numRings; ring++) {
    const distKm = (ring / numRings) * maxRadiusKm;
    for (let ray = 0; ray < numRays; ray++) {
      const bearing = (ray / numRays) * 2 * Math.PI;
      const lat1 = (center.lat * Math.PI) / 180;
      const lng1 = (center.lng * Math.PI) / 180;
      const d = distKm / R;

      const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
      );
      const lng2 =
        lng1 +
        Math.atan2(
          Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
          Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
        );

      points.push({
        lat: (lat2 * 180) / Math.PI,
        lng: (lng2 * 180) / Math.PI,
      });
    }
  }
  return points;
}

// Fetch driving durations from OSRM table API
async function fetchDurations(
  center: GeoPoint,
  destinations: GeoPoint[]
): Promise<(number | null)[]> {
  // OSRM Table API: one source, many destinations
  const allCoords = [center, ...destinations];
  const coordStr = allCoords.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coordStr}?sources=0&annotations=duration`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM Table API error: ${res.status}`);

  const json = await res.json();
  if (json.code !== 'Ok') throw new Error(json.message || 'OSRM error');

  // durations[0] = durations from source (index 0) to all destinations
  const durations: number[] = json.durations[0];
  // First element is source-to-source (0), rest are destinations
  return durations.slice(1).map((d: number) => (d === null || d === undefined ? null : d));
}

// Build convex hull from points (Graham scan)
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);

  const cross = (O: [number, number], A: [number, number], B: [number, number]) =>
    (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// ─────────────────────────────────────────
// Band presets
// ─────────────────────────────────────────
const BAND_PRESETS = [
  { minutes: 5, color: '#22c55e', label: '5 min' },
  { minutes: 10, color: '#eab308', label: '10 min' },
  { minutes: 15, color: '#f97316', label: '15 min' },
  { minutes: 20, color: '#ef4444', label: '20 min' },
  { minutes: 30, color: '#8b5cf6', label: '30 min' },
];

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function IsochroneTool({
  data,
  onResultChange,
  lastMapClick,
  isMapSelectMode,
  onMapSelectModeChange,
}: IsochroneToolProps) {
  const [center, setCenter] = useState<GeoPoint | null>(null);
  const [enabledBands, setEnabledBands] = useState<Set<number>>(new Set([5, 10, 15]));
  const [isRunning, setIsRunning] = useState(false);
  const [isComputed, setIsComputed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bands, setBands] = useState<IsochroneBand[]>([]);
  const [sampleDensity, setSampleDensity] = useState<'low' | 'medium' | 'high'>('medium');

  // Pick center from map click
  useEffect(() => {
    if (lastMapClick && isMapSelectMode) {
      setCenter(lastMapClick);
      onMapSelectModeChange(false);
      setIsComputed(false);
      setBands([]);
      onResultChange(null);
    }
  }, [lastMapClick]);

  const toggleBand = (min: number) => {
    setEnabledBands((prev) => {
      const next = new Set(prev);
      if (next.has(min)) next.delete(min);
      else next.add(min);
      return next;
    });
    setIsComputed(false);
  };

  const densityConfig = {
    low: { rings: 4, rays: 12 },
    medium: { rings: 6, rays: 18 },
    high: { rings: 8, rays: 24 },
  };

  const runIsochrone = useCallback(async () => {
    if (!center) return;
    setIsRunning(true);
    setError(null);

    try {
      const maxMin = Math.max(...enabledBands);
      // Estimate max radius: driving ~40km/h → maxMin minutes
      const maxRadiusKm = (40 / 60) * maxMin * 1.3; // 1.3x buffer

      const config = densityConfig[sampleDensity];
      const samplePts = generateSamplePoints(center, maxRadiusKm, config.rings, config.rays);

      // Batch if too many (OSRM table has limits)
      const BATCH = 90;
      const allDurations: (number | null)[] = [];

      for (let i = 0; i < samplePts.length; i += BATCH) {
        const batch = samplePts.slice(i, i + BATCH);
        const durs = await fetchDurations(center, batch);
        allDurations.push(...durs);
      }

      // Build bands (largest first for proper layering)
      const sortedBands = [...enabledBands].sort((a, b) => b - a);
      const computedBands: IsochroneBand[] = [];

      for (const minutes of sortedBands) {
        const thresholdSec = minutes * 60;
        const preset = BAND_PRESETS.find((b) => b.minutes === minutes)!;

        // Points reachable within this time
        const reachableCoords: [number, number][] = [[center.lat, center.lng]];
        for (let i = 0; i < samplePts.length; i++) {
          const dur = allDurations[i];
          if (dur !== null && dur <= thresholdSec) {
            reachableCoords.push([samplePts[i].lat, samplePts[i].lng]);
          }
        }

        // Build polygon from convex hull
        const polygon = reachableCoords.length >= 3
          ? convexHull(reachableCoords)
          : reachableCoords;

        // Find data points within this band
        const reachablePoints = data.filter((row) => {
          // Simple check: is point inside the convex hull approximately?
          // Use distance-based check with the max reachable distance
          const maxReachDist = reachableCoords.reduce((max, coord) => {
            const d = haversineDistance(center, { lat: coord[0], lng: coord[1] });
            return Math.max(max, d);
          }, 0);
          return haversineDistance(center, { lat: row.lat, lng: row.lng }) <= maxReachDist;
        });

        computedBands.push({
          minutes,
          color: preset.color,
          polygon,
          reachablePoints,
        });
      }

      setBands(computedBands);
      setIsComputed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to compute isochrone');
    } finally {
      setIsRunning(false);
    }
  }, [center, enabledBands, sampleDensity, data]);

  // Sync to parent
  useEffect(() => {
    if (!isComputed || bands.length === 0 || !center) {
      onResultChange(null);
      return;
    }
    onResultChange({ center, bands, visible: true });
  }, [bands, isComputed, center]);

  const handleReset = () => {
    setCenter(null);
    setBands([]);
    setIsComputed(false);
    setError(null);
    onResultChange(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <span className="text-sm font-medium">Isochrone</span>
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
            Shows the area reachable within a given driving time
            from a center point. Powered by OSRM road network data.
          </p>

          {/* Center point */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Center Point
            </Label>
            {center ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <div className="text-[10px] font-mono flex-1">
                  {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                </div>
                <button
                  onClick={() => { setCenter(null); setIsComputed(false); setBands([]); onResultChange(null); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMapSelectModeChange(true)}
                className={cn('w-full h-9 text-xs', isMapSelectMode && 'border-primary text-primary animate-pulse')}
              >
                <MousePointerClick className="h-3.5 w-3.5 mr-1.5" />
                {isMapSelectMode ? 'Click on map...' : 'Select on Map'}
              </Button>
            )}
          </div>

          <Separator />

          {/* Time bands */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Time Bands
            </Label>
            <div className="space-y-1">
              {BAND_PRESETS.map((preset) => (
                <label
                  key={preset.minutes}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                    enabledBands.has(preset.minutes) ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted'
                  )}
                >
                  <Checkbox
                    checked={enabledBands.has(preset.minutes)}
                    onCheckedChange={() => toggleBand(preset.minutes)}
                  />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="text-xs flex-1">{preset.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ~{((40 / 60) * preset.minutes).toFixed(0)} km
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Sample density */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Accuracy
            </Label>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as const).map((d) => (
                <Button
                  key={d}
                  variant={sampleDensity === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSampleDensity(d); setIsComputed(false); }}
                  className="flex-1 h-7 text-[10px] capitalize"
                >
                  {d}
                </Button>
              ))}
            </div>
            <div className="text-[9px] text-muted-foreground">
              Higher accuracy = more API calls, slower computation.
            </div>
          </div>

          {/* Run */}
          <Button
            onClick={runIsochrone}
            disabled={!center || enabledBands.size === 0 || isRunning}
            className="w-full h-10"
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Computing reachability...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {isComputed ? 'Recompute' : 'Generate Isochrone'}
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 text-[10px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {isComputed && bands.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Results
                </Label>
                <div className="space-y-1.5">
                  {bands.map((band) => (
                    <div
                      key={band.minutes}
                      className="flex items-center gap-2 p-2 rounded-lg border text-[10px]"
                      style={{ borderColor: band.color + '40' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: band.color, opacity: 0.7 }}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{band.minutes} min</span>
                        <span className="text-muted-foreground ml-1">driving</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold">{band.reachablePoints.length}</div>
                        <div className="text-[8px] text-muted-foreground">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              {data.length > 0 && (
                <div className="rounded-lg border p-2.5 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total data points</span>
                    <span className="font-mono">{data.length}</span>
                  </div>
                  {bands.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Within {bands[bands.length - 1].minutes} min
                      </span>
                      <span className="font-mono font-bold">
                        {bands[bands.length - 1].reachablePoints.length}
                        <span className="text-muted-foreground font-normal ml-1">
                          ({((bands[bands.length - 1].reachablePoints.length / data.length) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!center && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              <Timer className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Select a center point to</p>
              <p>generate isochrone map.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

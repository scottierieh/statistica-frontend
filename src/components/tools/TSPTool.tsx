// components/tools/TSPTool.tsx
// TSP Optimal Route - OSRM Trip API for actual road-based optimal route

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Navigation,
  Play,
  RotateCcw,
  CornerDownRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface TSPResult {
  tour: MapDataRow[];
  tourIndices: number[];
  segments: { from: GeoPoint; to: GeoPoint; distanceM: number; legIndex: number }[];
  routeGeometry: [number, number][] | null;
  totalDistanceM: number;
  totalDurationSec: number;
  returnToStart: boolean;
  visible: boolean;
}

interface TSPToolProps {
  data: MapDataRow[];
  onResultChange: (result: TSPResult | null) => void;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function TSPTool({ data, onResultChange }: TSPToolProps) {
  const [maxPoints, setMaxPoints] = useState(25);
  const [returnToStart, setReturnToStart] = useState(true);
  const profile = 'driving';
  const [isComputed, setIsComputed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tour, setTour] = useState<MapDataRow[]>([]);
  const [tourIndices, setTourIndices] = useState<number[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [totalDist, setTotalDist] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [legDistances, setLegDistances] = useState<number[]>([]);
  const [legDurations, setLegDurations] = useState<number[]>([]);
  const [points, setPoints] = useState<MapDataRow[]>([]);

  const runTSP = useCallback(async () => {
    if (data.length < 2) return;
    setIsRunning(true);
    setError(null);

    try {
      const pts = data.slice(0, maxPoints);
      const coords = pts.map((p) => `${p.lng},${p.lat}`).join(';');

      const roundtrip = returnToStart ? 'true' : 'false';
      const sourceParam = returnToStart ? '' : '&source=first&destination=last';
      const url = `https://router.project-osrm.org/trip/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false&roundtrip=${roundtrip}${sourceParam}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM API error: ${res.status}`);

      const json = await res.json();
      if (json.code !== 'Ok') throw new Error(json.message || 'OSRM returned error');

      const trip = json.trips[0];
      const waypoints = json.waypoints;

      // Build optimized order from waypoint_index
      const orderMap: { origIdx: number; tripPos: number }[] = waypoints.map(
        (wp: any, i: number) => ({ origIdx: i, tripPos: wp.waypoint_index })
      );
      orderMap.sort((a, b) => a.tripPos - b.tripPos);
      const finalOrder = orderMap.map((o) => o.origIdx);

      // Route geometry (GeoJSON [lng,lat] → Leaflet [lat,lng])
      const geojsonCoords: [number, number][] = trip.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );

      // Leg distances and durations
      const legs = trip.legs || [];
      const legDists = legs.map((l: any) => l.distance);
      const legDurs = legs.map((l: any) => l.duration);

      const tourData = finalOrder.map((i) => pts[i]);

      const segments: TSPResult['segments'] = [];
      for (let i = 0; i < finalOrder.length - 1; i++) {
        const a = pts[finalOrder[i]];
        const b = pts[finalOrder[i + 1]];
        segments.push({
          from: { lat: a.lat, lng: a.lng },
          to: { lat: b.lat, lng: b.lng },
          distanceM: legDists[i] || haversineDistance({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }),
          legIndex: i,
        });
      }
      if (returnToStart && finalOrder.length > 1) {
        const last = pts[finalOrder[finalOrder.length - 1]];
        const first = pts[finalOrder[0]];
        segments.push({
          from: { lat: last.lat, lng: last.lng },
          to: { lat: first.lat, lng: first.lng },
          distanceM: legDists[legDists.length - 1] || 0,
          legIndex: finalOrder.length - 1,
        });
      }

      setPoints(pts);
      setTour(tourData);
      setTourIndices(finalOrder);
      setRouteGeometry(geojsonCoords);
      setTotalDist(trip.distance);
      setTotalDuration(trip.duration);
      setLegDistances(legDists);
      setLegDurations(legDurs);
      setIsComputed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to compute route');
    } finally {
      setIsRunning(false);
    }
  }, [data, maxPoints, returnToStart, profile]);

  const handleReset = () => {
    setTour([]);
    setTourIndices([]);
    setRouteGeometry(null);
    setTotalDist(0);
    setTotalDuration(0);
    setLegDistances([]);
    setLegDurations([]);
    setPoints([]);
    setIsComputed(false);
    setError(null);
    onResultChange(null);
  };

  // Sync to parent
  useEffect(() => {
    if (!isComputed || tour.length === 0) {
      onResultChange(null);
      return;
    }

    const segments: TSPResult['segments'] = [];
    for (let i = 0; i < tour.length - 1; i++) {
      segments.push({
        from: { lat: tour[i].lat, lng: tour[i].lng },
        to: { lat: tour[i + 1].lat, lng: tour[i + 1].lng },
        distanceM: legDistances[i] || 0,
        legIndex: i,
      });
    }
    if (returnToStart && tour.length > 1) {
      segments.push({
        from: { lat: tour[tour.length - 1].lat, lng: tour[tour.length - 1].lng },
        to: { lat: tour[0].lat, lng: tour[0].lng },
        distanceM: legDistances[legDistances.length - 1] || 0,
        legIndex: tour.length - 1,
      });
    }

    onResultChange({
      tour,
      tourIndices,
      segments,
      routeGeometry,
      totalDistanceM: totalDist,
      totalDurationSec: totalDuration,
      returnToStart,
      visible: true,
    });
  }, [tour, isComputed, returnToStart, routeGeometry]);

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  const formatDur = (sec: number) => {
    if (sec < 60) return `${Math.round(sec)}s`;
    if (sec < 3600) return `${Math.round(sec / 60)} min`;
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Straight-line comparison
  const straightLineDist = useMemo(() => {
    if (tour.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < tour.length - 1; i++) {
      total += haversineDistance(
        { lat: tour[i].lat, lng: tour[i].lng },
        { lat: tour[i + 1].lat, lng: tour[i + 1].lng }
      );
    }
    if (returnToStart) {
      total += haversineDistance(
        { lat: tour[tour.length - 1].lat, lng: tour[tour.length - 1].lng },
        { lat: tour[0].lat, lng: tour[0].lng }
      );
    }
    return total;
  }, [tour, returnToStart]);

  const detourRatio = straightLineDist > 0 ? (totalDist / straightLineDist).toFixed(2) : '—';
  const displayDuration = totalDuration > 0 ? totalDuration : (totalDist / 1000) / 30 * 3600;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          <span className="text-sm font-medium">TSP Route</span>
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
            Find the optimal route visiting all points using actual road
            network via OSRM. Supports driving, cycling, and walking.
          </p>

          {/* Max points */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Points to Visit
              </Label>
              <span className="text-xs font-mono">
                {Math.min(maxPoints, data.length)} / {data.length}
              </span>
            </div>
            <Slider
              value={[maxPoints]}
              onValueChange={([v]) => { setMaxPoints(v); setIsComputed(false); }}
              min={3}
              max={Math.min(100, data.length || 100)}
              step={1}
            />
            {maxPoints > 50 && (
              <div className="flex items-start gap-1.5 text-[10px] text-yellow-600">
                <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <span>OSRM public API may be slow with 50+ points.</span>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="returnToStart"
              checked={returnToStart}
              onCheckedChange={(c) => { setReturnToStart(!!c); setIsComputed(false); }}
            />
            <label htmlFor="returnToStart" className="text-xs">Return to start (round trip)</label>
          </div>

          {/* Run */}
          <Button onClick={runTSP} disabled={data.length < 2 || isRunning} className="w-full h-10">
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Computing route...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {isComputed ? 'Re-optimize' : 'Find Optimal Route'}
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
          {isComputed && (
            <>
              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Road Distance" value={formatDist(totalDist)} />
                <StatCard label="Est. Duration" value={formatDur(displayDuration)} />
                <StatCard label="Stops" value={tour.length.toString()} />
                <StatCard label="Detour Ratio" value={`${detourRatio}×`} />
              </div>

              <div className="rounded-lg border p-2.5 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Straight-line total</span>
                  <span className="font-mono">{formatDist(straightLineDist)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual road total</span>
                  <span className="font-mono font-bold">{formatDist(totalDist)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg speed</span>
                  <span className="font-mono">
                    {displayDuration > 0
                      ? `${((totalDist / 1000) / (displayDuration / 3600)).toFixed(0)} km/h`
                      : '—'}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Route order */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Optimized Route
                </Label>
                <div className="space-y-0.5 max-h-[250px] overflow-y-auto">
                  {tour.map((p, i) => {
                    const name = p.name || p.id;
                    const legDist = legDistances[i];
                    const legDur = legDurations[i];
                    const hasLeg = i < tour.length - 1 || (returnToStart && i === tour.length - 1);

                    return (
                      <div key={i}>
                        <div className="flex items-center gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-muted">
                          <span className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                            i === 0 ? 'bg-green-500 text-white' :
                            i === tour.length - 1 && !returnToStart ? 'bg-red-500 text-white' :
                            'bg-primary/10 text-primary'
                          )}>
                            {i + 1}
                          </span>
                          <span className="flex-1 truncate">{name}</span>
                        </div>
                        {hasLeg && legDist !== undefined && (
                          <div className="flex items-center gap-1 ml-3 text-[9px] text-muted-foreground">
                            <CornerDownRight className="h-2.5 w-2.5" />
                            <span className="font-mono">{formatDist(legDist)}</span>
                            <span className="font-mono">
                              · {formatDur((legDist / 1000) / 30 * 3600)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {returnToStart && tour.length > 1 && (
                    <div className="flex items-center gap-2 text-[10px] py-1 px-1.5 rounded bg-green-500/5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-green-500 text-white flex-shrink-0">
                        ↩
                      </span>
                      <span className="text-muted-foreground">Return to start</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {data.length < 2 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Navigation className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data with at least</p>
              <p>2 points to find optimal route.</p>
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
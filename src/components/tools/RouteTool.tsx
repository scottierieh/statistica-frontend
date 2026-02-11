// components/tools/RouteTool.tsx
// Route measurement tool

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { GeoPoint, MapDataRow, RouteResult } from '@/types/map-analysis';
import { haversineDistance, formatNumber } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Route,
  MapPin,
  MousePointerClick,
  Crosshair,
  Trash2,
  Plus,
  GripVertical,
  Navigation,
  Clock,
  Ruler,
  ArrowDown,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Waypoint {
  id: string;
  point: GeoPoint | null;
  label: string;
}

const DRIVING_SPEED_KMH = 40;

interface RouteToolProps {
  data: MapDataRow[];
  onRouteResult: (result: RouteResult | null) => void;
  onWaypoints: (points: GeoPoint[]) => void;
  isSelectMode: boolean;
  onSelectModeChange: (mode: boolean) => void;
  onMapClick: GeoPoint | null; // receives click from map
}

let waypointCounter = 0;
function createWaypoint(point?: GeoPoint): Waypoint {
  waypointCounter++;
  return {
    id: `wp_${waypointCounter}_${Date.now()}`,
    point: point ?? null,
    label: point
      ? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`
      : 'Click map to set',
  };
}

export default function RouteTool({
  data,
  onRouteResult,
  onWaypoints,
  isSelectMode,
  onSelectModeChange,
  onMapClick,
}: RouteToolProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    createWaypoint(),
    createWaypoint(),
  ]);
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);
  const travelMode = 'driving';
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [osrmError, setOsrmError] = useState<string | null>(null);

  const currentSpeed = DRIVING_SPEED_KMH;

  // Handle map click → assign to active waypoint
  React.useEffect(() => {
    if (onMapClick && activeWaypointId) {
      setWaypoints((prev) =>
        prev.map((wp) =>
          wp.id === activeWaypointId
            ? {
                ...wp,
                point: onMapClick,
                label: `${onMapClick.lat.toFixed(5)}, ${onMapClick.lng.toFixed(5)}`,
              }
            : wp
        )
      );
      // Move to next empty waypoint
      const currentIdx = waypoints.findIndex((w) => w.id === activeWaypointId);
      const nextEmpty = waypoints.find(
        (w, i) => i > currentIdx && !w.point
      );
      if (nextEmpty) {
        setActiveWaypointId(nextEmpty.id);
      } else {
        setActiveWaypointId(null);
        onSelectModeChange(false);
      }
    }
  }, [onMapClick]);

  // Emit waypoints for map rendering
  React.useEffect(() => {
    const validPoints = waypoints
      .filter((w) => w.point !== null)
      .map((w) => w.point!);
    onWaypoints(validPoints);
  }, [waypoints]);

  // Straight-line calculations
  const segments = useMemo(() => {
    const result: { from: Waypoint; to: Waypoint; distanceM: number }[] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      if (from.point && to.point) {
        result.push({
          from,
          to,
          distanceM: haversineDistance(from.point, to.point),
        });
      }
    }
    return result;
  }, [waypoints]);

  const totalStraightDistance = segments.reduce((s, seg) => s + seg.distanceM, 0);
  const estimatedMinutes = (totalStraightDistance / 1000 / currentSpeed) * 60;

  // OSRM route fetch
  const fetchOSRMRoute = useCallback(async () => {
    const validPoints = waypoints.filter((w) => w.point).map((w) => w.point!);
    if (validPoints.length < 2) return;

    setIsLoading(true);
    setOsrmError(null);

    try {
      const coords = validPoints.map((p) => `${p.lng},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.code === 'Ok' && json.routes?.[0]) {
        const route = json.routes[0];
        const path: GeoPoint[] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng })
        );
        const result: RouteResult = {
          path,
          distanceKm: route.distance / 1000,
          durationMin: route.duration / 60,
        };
        setRouteResult(result);
        onRouteResult(result);
      } else {
        setOsrmError('Route not found. Try different points.');
      }
    } catch (err) {
      setOsrmError('Failed to fetch route. Using straight-line distance.');
    } finally {
      setIsLoading(false);
    }
  }, [waypoints, travelMode, onRouteResult]);

  // Actions
  const addWaypoint = () => {
    setWaypoints((prev) => [...prev, createWaypoint()]);
  };

  const removeWaypoint = (id: string) => {
    if (waypoints.length <= 2) return;
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    if (activeWaypointId === id) setActiveWaypointId(null);
  };

  const reverseWaypoints = () => {
    setWaypoints((prev) => [...prev].reverse());
    setRouteResult(null);
    onRouteResult(null);
  };

  const clearAll = () => {
    setWaypoints([createWaypoint(), createWaypoint()]);
    setActiveWaypointId(null);
    setRouteResult(null);
    onRouteResult(null);
    setOsrmError(null);
    onSelectModeChange(false);
  };

  const startSelect = (id: string) => {
    setActiveWaypointId(id);
    onSelectModeChange(true);
  };

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  const formatTime = (min: number) => {
    if (min < 1) return `${Math.round(min * 60)} sec`;
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4" />
          <span className="text-sm font-medium">Route Measure</span>
        </div>
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Waypoints list */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Waypoints
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={reverseWaypoints}
                className="h-6 text-[10px] px-1.5"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Reverse
              </Button>
            </div>

            <div className="space-y-0">
              {waypoints.map((wp, idx) => (
                <React.Fragment key={wp.id}>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors',
                      activeWaypointId === wp.id && 'bg-primary/10 border border-primary/30',
                      !activeWaypointId && 'hover:bg-muted/50'
                    )}
                  >
                    {/* Index indicator */}
                    <div
                      className={cn(
                        'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                        idx === 0
                          ? 'bg-green-500 text-white'
                          : idx === waypoints.length - 1
                            ? 'bg-red-500 text-white'
                            : 'bg-blue-500 text-white'
                      )}
                    >
                      {idx === 0 ? 'S' : idx === waypoints.length - 1 ? 'E' : idx}
                    </div>

                    {/* Point info / click to select */}
                    <button
                      onClick={() => startSelect(wp.id)}
                      className="flex-1 text-left text-xs truncate"
                    >
                      {wp.point ? (
                        <span className="font-mono">{wp.label}</span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" />
                          Click to set point
                        </span>
                      )}
                    </button>

                    {/* Remove */}
                    {waypoints.length > 2 && (
                      <button
                        onClick={() => removeWaypoint(wp.id)}
                        className="p-1 hover:bg-destructive/10 rounded flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </div>

                  {/* Segment distance */}
                  {idx < waypoints.length - 1 && segments[idx] && (
                    <div className="flex items-center gap-2 pl-4 py-0.5 text-[10px] text-muted-foreground">
                      <ArrowDown className="h-3 w-3" />
                      <span>{formatDist(segments[idx].distanceM)} (straight)</span>
                    </div>
                  )}
                  {idx < waypoints.length - 1 && !segments[idx] && (
                    <div className="flex items-center gap-2 pl-4 py-0.5">
                      <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Add waypoint */}
            <Button
              variant="ghost"
              size="sm"
              onClick={addWaypoint}
              className="w-full h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add waypoint
            </Button>
          </div>

          {/* Active selection indicator */}
          {activeWaypointId && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs">
              <Crosshair className="h-4 w-4 animate-pulse text-primary" />
              <span>Click on the map to place this point</span>
            </div>
          )}

          <Separator />

          {/* Straight-line results */}
          {segments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Straight-line Distance
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2 text-center">
                  <Ruler className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-bold font-mono">
                    {formatDist(totalStraightDistance)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Distance</div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-bold font-mono">
                    {formatTime(estimatedMinutes)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Est. ({travelMode})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OSRM Route */}
          {segments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actual Route (OSRM)
                </Label>
                <Button
                  onClick={fetchOSRMRoute}
                  disabled={isLoading || segments.length === 0}
                  size="sm"
                  className="w-full"
                >
                  {isLoading ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Navigation className="h-3.5 w-3.5 mr-2" />
                  )}
                  {isLoading ? 'Calculating...' : 'Calculate Route'}
                </Button>

                {osrmError && (
                  <p className="text-xs text-destructive">{osrmError}</p>
                )}

                {routeResult && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center">
                      <Ruler className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-bold font-mono">
                        {routeResult.distanceKm.toFixed(2)} km
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Actual distance
                      </div>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-bold font-mono">
                        {formatTime(routeResult.durationMin)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Actual time
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparison: straight vs actual */}
                {routeResult && (
                  <div className="rounded-lg border border-dashed p-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Detour ratio</span>
                      <span className="font-mono font-medium">
                        {(
                          routeResult.distanceKm /
                          (totalStraightDistance / 1000)
                        ).toFixed(2)}
                        x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extra distance</span>
                      <span className="font-mono">
                        +
                        {(
                          routeResult.distanceKm -
                          totalStraightDistance / 1000
                        ).toFixed(2)}{' '}
                        km
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty state */}
          {segments.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Route className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Click on the map to set</p>
              <p>start and end points.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
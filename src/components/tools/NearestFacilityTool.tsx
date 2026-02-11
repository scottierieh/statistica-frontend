// components/tools/NearestFacilityTool.tsx
// Nearest Facility — matches each point to its nearest facility from a different group

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
  Locate,
  Play,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface FacilityMatch {
  source: MapDataRow;
  facility: MapDataRow;
  distanceM: number;
}

export interface NearestFacilityResult {
  matches: FacilityMatch[];
  stats: {
    avgDistM: number;
    minDistM: number;
    maxDistM: number;
    medianDistM: number;
  };
  visible: boolean;
}

interface NearestFacilityToolProps {
  data: MapDataRow[];
  filteredData: MapDataRow[];
  allHeaders: string[];
  categoricalHeaders: string[];
  onResultChange: (result: NearestFacilityResult | null) => void;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function NearestFacilityTool({
  data,
  filteredData,
  allHeaders,
  categoricalHeaders,
  onResultChange,
}: NearestFacilityToolProps) {
  const [mode, setMode] = useState<'split' | 'all'>('split');
  const [groupColumn, setGroupColumn] = useState('');
  const [sourceValue, setSourceValue] = useState('');
  const [facilityValue, setFacilityValue] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [isComputed, setIsComputed] = useState(false);
  const [matches, setMatches] = useState<FacilityMatch[]>([]);

  // Get unique values for selected column
  const uniqueValues = useMemo(() => {
    if (!groupColumn) return [];
    const vals = new Set(filteredData.map((r) => String(r[groupColumn] ?? '')));
    return [...vals].sort();
  }, [filteredData, groupColumn]);

  // Reset selections when column changes
  useEffect(() => {
    setSourceValue('');
    setFacilityValue('');
    setIsComputed(false);
    setMatches([]);
    onResultChange(null);
  }, [groupColumn]);

  const compute = () => {
    let sources: MapDataRow[];
    let facilities: MapDataRow[];

    if (mode === 'split' && groupColumn && sourceValue && facilityValue) {
      sources = filteredData.filter((r) => String(r[groupColumn]) === sourceValue);
      facilities = filteredData.filter((r) => String(r[groupColumn]) === facilityValue);
    } else if (mode === 'all') {
      // Each point's nearest OTHER point
      sources = filteredData.slice(0, maxResults);
      facilities = filteredData;
    } else {
      return;
    }

    const limited = sources.slice(0, maxResults);
    const result: FacilityMatch[] = [];

    for (const src of limited) {
      let nearestDist = Infinity;
      let nearest: MapDataRow | null = null;

      for (const fac of facilities) {
        if (fac.id === src.id) continue; // skip self
        const d = haversineDistance(
          { lat: src.lat, lng: src.lng },
          { lat: fac.lat, lng: fac.lng }
        );
        if (d < nearestDist) {
          nearestDist = d;
          nearest = fac;
        }
      }

      if (nearest) {
        result.push({ source: src, facility: nearest, distanceM: nearestDist });
      }
    }

    // Sort by distance
    result.sort((a, b) => a.distanceM - b.distanceM);
    setMatches(result);
    setIsComputed(true);
  };

  // Stats
  const stats = useMemo(() => {
    if (matches.length === 0) return null;
    const dists = matches.map((m) => m.distanceM);
    dists.sort((a, b) => a - b);
    return {
      avgDistM: dists.reduce((a, b) => a + b, 0) / dists.length,
      minDistM: dists[0],
      maxDistM: dists[dists.length - 1],
      medianDistM: dists[Math.floor(dists.length / 2)],
    };
  }, [matches]);

  // Sync to parent
  useEffect(() => {
    if (!isComputed || matches.length === 0 || !stats) {
      onResultChange(null);
      return;
    }
    onResultChange({ matches, stats, visible: true });
  }, [matches, isComputed]);

  const handleReset = () => {
    setMatches([]);
    setIsComputed(false);
    onResultChange(null);
  };

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  // Distance histogram (5 bins)
  const histogram = useMemo(() => {
    if (matches.length < 2) return [];
    const dists = matches.map((m) => m.distanceM);
    const min = Math.min(...dists);
    const max = Math.max(...dists);
    const binSize = (max - min) / 5 || 1;
    const bins = Array.from({ length: 5 }, (_, i) => ({
      from: min + i * binSize,
      to: min + (i + 1) * binSize,
      count: 0,
    }));
    dists.forEach((d) => {
      const idx = Math.min(Math.floor((d - min) / binSize), 4);
      bins[idx].count++;
    });
    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    return bins.map((b) => ({ ...b, pct: b.count / maxCount }));
  }, [matches]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Locate className="h-4 w-4" />
          <span className="text-sm font-medium">Nearest Facility</span>
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
            Find the nearest facility for each source point. Split your data by
            a category column (e.g., customers → stores) or find each point's nearest neighbor.
          </p>

          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mode
            </Label>
            <div className="flex gap-1">
              <Button
                variant={mode === 'split' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('split'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                Group Split
              </Button>
              <Button
                variant={mode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('all'); setIsComputed(false); }}
                className="flex-1 h-8 text-xs"
              >
                Nearest Neighbor
              </Button>
            </div>
          </div>

          {mode === 'split' && (
            <>
              {/* Group column */}
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
                  {/* Source group */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      🔵 Source (find nearest for)
                    </Label>
                    <Select value={sourceValue} onValueChange={(v) => { setSourceValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select source group..." />
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

                  {/* Facility group */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      🔴 Facility (match to)
                    </Label>
                    <Select value={facilityValue} onValueChange={(v) => { setFacilityValue(v); setIsComputed(false); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select facility group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueValues.filter((v) => v !== sourceValue).map((v) => (
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

          {/* Max results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Max Sources
              </Label>
              <span className="text-xs font-mono">{maxResults}</span>
            </div>
            <Slider
              value={[maxResults]}
              onValueChange={([v]) => { setMaxResults(v); setIsComputed(false); }}
              min={5}
              max={Math.min(200, filteredData.length)}
              step={5}
            />
          </div>

          {/* Run */}
          <Button
            onClick={compute}
            disabled={
              filteredData.length < 2 ||
              (mode === 'split' && (!groupColumn || !sourceValue || !facilityValue))
            }
            className="w-full h-10"
          >
            <Play className="h-4 w-4 mr-2" />
            {isComputed ? 'Recompute' : 'Find Nearest'}
          </Button>

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Avg Distance" value={formatDist(stats.avgDistM)} />
                <StatCard label="Median" value={formatDist(stats.medianDistM)} />
                <StatCard label="Min" value={formatDist(stats.minDistM)} />
                <StatCard label="Max" value={formatDist(stats.maxDistM)} />
              </div>

              {/* Histogram */}
              {histogram.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Distance Distribution
                  </Label>
                  <div className="space-y-0.5">
                    {histogram.map((bin, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        <span className="w-16 text-right text-muted-foreground font-mono">
                          {formatDist(bin.from)}
                        </span>
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all"
                            style={{
                              width: `${bin.pct * 100}%`,
                              backgroundColor: `hsl(${200 + i * 30}, 70%, 50%)`,
                            }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono">{bin.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Match list */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Matches ({matches.length})
                </Label>
                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  {matches.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 p-1.5 rounded-lg border text-[10px] hover:bg-muted/50"
                    >
                      <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="truncate flex-1 max-w-[70px]">{m.source.name || m.source.id}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                      <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="truncate flex-1 max-w-[70px]">{m.facility.name || m.facility.id}</span>
                      <Badge variant="outline" className="text-[8px] h-4 px-1 ml-auto flex-shrink-0">
                        {formatDist(m.distanceM)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {filteredData.length < 2 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Locate className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data with at least</p>
              <p>2 points to find nearest facilities.</p>
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

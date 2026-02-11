// components/tools/DBSCANTool.tsx
// DBSCAN Clustering - density-based spatial clustering with noise detection

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
  Scan,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// DBSCAN Algorithm
// ─────────────────────────────────────────
const NOISE = -1;
const UNVISITED = -2;

function dbscan(
  points: GeoPoint[],
  epsMeters: number,
  minPts: number
): number[] {
  const n = points.length;
  const labels = new Array(n).fill(UNVISITED);
  let clusterId = 0;

  // Precompute neighbor lists using spatial index (simple grid)
  const getNeighbors = (idx: number): number[] => {
    const neighbors: number[] = [];
    const p = points[idx];
    for (let i = 0; i < n; i++) {
      if (i === idx) continue;
      if (haversineDistance(p, points[i]) <= epsMeters) {
        neighbors.push(i);
      }
    }
    return neighbors;
  };

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    const neighbors = getNeighbors(i);

    if (neighbors.length < minPts - 1) {
      labels[i] = NOISE;
      continue;
    }

    // Start new cluster
    labels[i] = clusterId;
    const seed = [...neighbors];
    let j = 0;

    while (j < seed.length) {
      const q = seed[j];

      if (labels[q] === NOISE) {
        labels[q] = clusterId;
      }

      if (labels[q] !== UNVISITED) {
        j++;
        continue;
      }

      labels[q] = clusterId;
      const qNeighbors = getNeighbors(q);

      if (qNeighbors.length >= minPts - 1) {
        for (const nb of qNeighbors) {
          if (!seed.includes(nb)) {
            seed.push(nb);
          }
        }
      }

      j++;
    }

    clusterId++;
  }

  return labels;
}

// ─────────────────────────────────────────
// Cluster colors
// ─────────────────────────────────────────
const CLUSTER_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#e11d48', '#8b5cf6', '#10b981', '#d97706',
  '#7c3aed', '#0ea5e9', '#f43f5e', '#65a30d', '#0891b2',
];

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface DBSCANCluster {
  id: number;
  points: MapDataRow[];
  center: GeoPoint;
  color: string;
  visible: boolean;
  // Stats
  count: number;
  avgDistance: number; // avg distance from center
  maxDistance: number;
  radius: number; // approx enclosing radius
  density: number; // points per km²
}

export interface DBSCANResult {
  clusters: DBSCANCluster[];
  noise: MapDataRow[];
  noiseColor: string;
  showNoise: boolean;
  labels: number[];
  eps: number;
  minPts: number;
}

interface DBSCANToolProps {
  data: MapDataRow[];
  onResultChange: (result: DBSCANResult | null) => void;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function DBSCANTool({ data, onResultChange }: DBSCANToolProps) {
  const [eps, setEps] = useState(500); // meters
  const [minPts, setMinPts] = useState(3);
  const [isComputed, setIsComputed] = useState(false);
  const [showNoise, setShowNoise] = useState(true);
  const [clusters, setClusters] = useState<DBSCANCluster[]>([]);
  const [noise, setNoise] = useState<MapDataRow[]>([]);
  const [labels, setLabels] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(() => columns.filter((c) => c.type === 'numeric'), [columns]);

  // Run DBSCAN
  const runClustering = () => {
    if (data.length === 0) return;

    setIsRunning(true);

    // Use setTimeout to prevent UI freeze for large datasets
    setTimeout(() => {
      const points = data.map((d) => ({ lat: d.lat, lng: d.lng }));
      const result = dbscan(points, eps, minPts);

      // Group by cluster
      const clusterMap = new Map<number, MapDataRow[]>();
      const noisePoints: MapDataRow[] = [];

      result.forEach((label, i) => {
        if (label === NOISE) {
          noisePoints.push(data[i]);
        } else {
          if (!clusterMap.has(label)) clusterMap.set(label, []);
          clusterMap.get(label)!.push(data[i]);
        }
      });

      // Build cluster objects
      const clusterList: DBSCANCluster[] = [];
      clusterMap.forEach((rows, id) => {
        const lats = rows.map((r) => r.lat);
        const lngs = rows.map((r) => r.lng);
        const center: GeoPoint = {
          lat: lats.reduce((a, b) => a + b, 0) / lats.length,
          lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
        };

        const distances = rows.map((r) =>
          haversineDistance(center, { lat: r.lat, lng: r.lng })
        );
        const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
        const maxDist = Math.max(...distances);

        // Approximate area (convex hull area approx as circle)
        const radiusKm = maxDist / 1000;
        const areaKm2 = Math.PI * radiusKm * radiusKm;
        const density = areaKm2 > 0 ? rows.length / areaKm2 : 0;

        clusterList.push({
          id,
          points: rows,
          center,
          color: CLUSTER_COLORS[id % CLUSTER_COLORS.length],
          visible: true,
          count: rows.length,
          avgDistance: avgDist,
          maxDistance: maxDist,
          radius: maxDist,
          density,
        });
      });

      // Sort by size descending
      clusterList.sort((a, b) => b.count - a.count);

      setClusters(clusterList);
      setNoise(noisePoints);
      setLabels(result);
      setIsComputed(true);
      setIsRunning(false);
    }, 50);
  };

  const handleReset = () => {
    setClusters([]);
    setNoise([]);
    setLabels([]);
    setIsComputed(false);
    onResultChange(null);
  };

  const toggleClusterVisibility = (id: number) => {
    setClusters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  // Sync to parent
  useEffect(() => {
    if (!isComputed) {
      onResultChange(null);
      return;
    }
    onResultChange({
      clusters,
      noise,
      noiseColor: '#9ca3af',
      showNoise,
      labels,
      eps,
      minPts,
    });
  }, [clusters, noise, showNoise, isComputed]);

  // Summary stats
  const stats = useMemo(() => {
    if (!isComputed) return null;
    return {
      totalClusters: clusters.length,
      totalClustered: clusters.reduce((s, c) => s + c.count, 0),
      totalNoise: noise.length,
      noisePercent: data.length > 0 ? ((noise.length / data.length) * 100).toFixed(1) : '0',
      avgClusterSize: clusters.length > 0
        ? (clusters.reduce((s, c) => s + c.count, 0) / clusters.length).toFixed(1)
        : '0',
      largestCluster: clusters.length > 0 ? clusters[0].count : 0,
    };
  }, [clusters, noise, isComputed]);

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  // Auto-suggest eps based on data spread
  const suggestedEps = useMemo(() => {
    if (data.length < 10) return 500;
    // Sample 100 nearest-neighbor distances
    const sample = data.slice(0, Math.min(100, data.length));
    const nnDists: number[] = [];
    sample.forEach((p1, i) => {
      let minD = Infinity;
      sample.forEach((p2, j) => {
        if (i === j) return;
        const d = haversineDistance({ lat: p1.lat, lng: p1.lng }, { lat: p2.lat, lng: p2.lng });
        if (d < minD) minD = d;
      });
      if (minD < Infinity) nnDists.push(minD);
    });
    nnDists.sort((a, b) => a - b);
    // Use 75th percentile of NN distances
    const p75 = nnDists[Math.floor(nnDists.length * 0.75)] || 500;
    return Math.round(p75 / 50) * 50; // round to nearest 50
  }, [data]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Scan className="h-4 w-4" />
          <span className="text-sm font-medium">DBSCAN Clustering</span>
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
            DBSCAN finds clusters of densely packed points and identifies
            outliers as noise. Unlike K-means, it automatically determines
            the number of clusters.
          </p>

          {/* Parameters */}
          <div className="space-y-3">
            {/* Epsilon (radius) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Epsilon (ε) — Search Radius
                </Label>
                <span className="text-xs font-mono">{formatDist(eps)}</span>
              </div>
              <Slider
                value={[eps]}
                onValueChange={([v]) => { setEps(v); setIsComputed(false); }}
                min={50}
                max={10000}
                step={50}
                className="w-full"
              />
              <div className="flex gap-1">
                {[100, 250, 500, 1000, 2000, 5000].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setEps(v); setIsComputed(false); }}
                    className={cn(
                      'flex-1 py-1 text-[9px] rounded border transition-colors',
                      eps === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-transparent'
                    )}
                  >
                    {v >= 1000 ? `${v / 1000}km` : `${v}m`}
                  </button>
                ))}
              </div>
              {suggestedEps && !isComputed && (
                <button
                  onClick={() => { setEps(suggestedEps); setIsComputed(false); }}
                  className="text-[10px] text-primary hover:underline"
                >
                  💡 Suggested: {formatDist(suggestedEps)} (based on data spread)
                </button>
              )}
            </div>

            {/* MinPts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Min Points — Minimum Cluster Size
                </Label>
                <span className="text-xs font-mono">{minPts}</span>
              </div>
              <Slider
                value={[minPts]}
                onValueChange={([v]) => { setMinPts(v); setIsComputed(false); }}
                min={2}
                max={20}
                step={1}
                className="w-full"
              />
              <div className="flex gap-1">
                {[2, 3, 5, 7, 10, 15].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setMinPts(v); setIsComputed(false); }}
                    className={cn(
                      'flex-1 py-1 text-[9px] rounded border transition-colors',
                      minPts === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-transparent'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Run button */}
          <Button
            onClick={runClustering}
            disabled={data.length === 0 || isRunning}
            className="w-full h-10"
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Running DBSCAN...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {isComputed ? 'Re-run Clustering' : 'Run DBSCAN'}
              </>
            )}
          </Button>

          {data.length > 500 && !isComputed && (
            <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-[10px] text-yellow-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {data.length} points — may take a few seconds.
                Consider filtering data first for faster results.
              </span>
            </div>
          )}

          {/* Results */}
          {isComputed && stats && (
            <>
              <Separator />

              {/* Summary */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Results
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Clusters" value={stats.totalClusters.toString()} />
                  <StatCard label="Clustered" value={stats.totalClustered.toLocaleString()} />
                  <StatCard
                    label="Noise"
                    value={`${stats.totalNoise} (${stats.noisePercent}%)`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Avg Size" value={stats.avgClusterSize} />
                  <StatCard label="Largest" value={stats.largestCluster.toLocaleString()} />
                </div>
              </div>

              {/* Noise toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-xs">
                    Noise Points ({noise.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowNoise(!showNoise)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {showNoise ? (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>

              <Separator />

              {/* Cluster list */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Clusters
                </Label>

                {clusters.map((cluster, i) => (
                  <div
                    key={cluster.id}
                    className={cn(
                      'rounded-lg border p-2.5 space-y-2 transition-opacity',
                      !cluster.visible && 'opacity-40'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cluster.color }}
                        />
                        <span className="text-xs font-medium">
                          Cluster {i + 1}
                        </span>
                        <Badge variant="secondary" className="text-[9px] h-4">
                          {cluster.count} pts
                        </Badge>
                      </div>
                      <button
                        onClick={() => toggleClusterVisibility(cluster.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {cluster.visible ? (
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div className="text-center">
                        <div className="text-muted-foreground">Radius</div>
                        <div className="font-bold font-mono">{formatDist(cluster.radius)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Avg Dist</div>
                        <div className="font-bold font-mono">{formatDist(cluster.avgDistance)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Density</div>
                        <div className="font-bold font-mono">
                          {cluster.density > 0 ? `${cluster.density.toFixed(0)}/km²` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Size bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(cluster.count / Math.max(...clusters.map((c) => c.count), 1)) * 100}%`,
                          backgroundColor: cluster.color,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {clusters.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-1 opacity-40" />
                    No clusters found. Try increasing ε or decreasing Min Points.
                  </div>
                )}
              </div>

              {/* Comparison table */}
              {clusters.length > 1 && (
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
                            <th className="text-left px-2 py-1 font-medium">#</th>
                            <th className="text-right px-2 py-1 font-medium">Points</th>
                            <th className="text-right px-2 py-1 font-medium">Radius</th>
                            <th className="text-right px-2 py-1 font-medium">Density</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clusters.map((c, i) => (
                            <tr key={c.id} className="border-t">
                              <td className="px-2 py-1">
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: c.color }}
                                  />
                                  <span>{i + 1}</span>
                                </div>
                              </td>
                              <td className="text-right px-2 py-1 font-mono">{c.count}</td>
                              <td className="text-right px-2 py-1 font-mono">{formatDist(c.radius)}</td>
                              <td className="text-right px-2 py-1 font-mono">
                                {c.density > 0 ? `${c.density.toFixed(0)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Empty state */}
          {data.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Scan className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data to run</p>
              <p>DBSCAN clustering.</p>
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

export { CLUSTER_COLORS };

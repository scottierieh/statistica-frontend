// components/tools/VoronoiTool.tsx
// 보로노이 다이어그램 - 상권/세력권 영역 분할 + 통계

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { haversineDistance, formatNumber, assignNearestCenter } from '@/lib/map-utils';
import { analyzeColumns, type ColumnInfo } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Hexagon,
  Plus,
  Trash2,
  MousePointerClick,
  Crosshair,
  RotateCcw,
  BarChart3,
  Palette,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Color palette for voronoi cells
const CELL_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', label: 'Blue' },
  { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', label: 'Red' },
  { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', label: 'Green' },
  { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', label: 'Purple' },
  { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', label: 'Orange' },
  { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', label: 'Pink' },
  { bg: 'rgba(20, 184, 166, 0.15)', border: '#14b8a6', label: 'Teal' },
  { bg: 'rgba(234, 179, 8, 0.15)', border: '#eab308', label: 'Yellow' },
  { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', label: 'Indigo' },
  { bg: 'rgba(107, 114, 128, 0.15)', border: '#6b7280', label: 'Gray' },
];

interface VoronoiCenter {
  id: string;
  point: GeoPoint | null;
  label: string;
  colorIdx: number;
}

interface VoronoiCellStats {
  centerId: string;
  pointCount: number;
  avgDistance: number;
  maxDistance: number;
  numericStats: Record<string, { sum: number; avg: number }>;
}

interface VoronoiToolProps {
  data: MapDataRow[];
  onCentersChange: (centers: VoronoiCenter[]) => void;
  onCellAssignments: (assignments: Map<number, MapDataRow[]>) => void;
  onCellColors: (colors: typeof CELL_COLORS) => void;
  isSelectMode: boolean;
  onSelectModeChange: (mode: boolean) => void;
  onMapClick: GeoPoint | null;
}

let centerCounter = 0;
function createCenter(point?: GeoPoint): VoronoiCenter {
  centerCounter++;
  return {
    id: `vc_${centerCounter}_${Date.now()}`,
    point: point ?? null,
    label: point ? `Center ${centerCounter}` : `Center ${centerCounter}`,
    colorIdx: (centerCounter - 1) % CELL_COLORS.length,
  };
}

export default function VoronoiTool({
  data,
  onCentersChange,
  onCellAssignments,
  onCellColors,
  isSelectMode,
  onSelectModeChange,
  onMapClick,
}: VoronoiToolProps) {
  const [centers, setCenters] = useState<VoronoiCenter[]>([]);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [statsColumn, setStatsColumn] = useState<string>('none');

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(
    () => columns.filter((c) => c.type === 'numeric'),
    [columns]
  );

  // Handle map click → assign to active center
  React.useEffect(() => {
    if (onMapClick && activeCenterId) {
      setCenters((prev) =>
        prev.map((c) =>
          c.id === activeCenterId
            ? { ...c, point: onMapClick, label: c.label || `Center` }
            : c
        )
      );
      setActiveCenterId(null);
      onSelectModeChange(false);
    }
  }, [onMapClick]);

  // Sync centers to parent
  React.useEffect(() => {
    onCentersChange(centers);
  }, [centers]);

  // Compute voronoi assignments
  const { assignments, cellStats } = useMemo(() => {
    const validCenters = centers.filter((c) => c.point !== null);
    if (validCenters.length < 2 || data.length === 0) {
      return { assignments: new Map<number, MapDataRow[]>(), cellStats: [] };
    }

    const centerPoints = validCenters.map((c) => c.point!);
    const assigned = assignNearestCenter(data, centerPoints);

    // Calculate stats per cell
    const stats: VoronoiCellStats[] = validCenters.map((center, idx) => {
      const cellData = assigned.get(idx) ?? [];
      const distances = cellData.map((row) =>
        haversineDistance(center.point!, { lat: row.lat, lng: row.lng })
      );

      const numStats: Record<string, { sum: number; avg: number }> = {};
      if (statsColumn !== 'none') {
        const values = cellData
          .map((r) => parseFloat(r[statsColumn]))
          .filter((v) => !isNaN(v));
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          numStats[statsColumn] = { sum, avg: sum / values.length };
        }
      }

      return {
        centerId: center.id,
        pointCount: cellData.length,
        avgDistance: distances.length > 0
          ? distances.reduce((a, b) => a + b, 0) / distances.length
          : 0,
        maxDistance: distances.length > 0 ? Math.max(...distances) : 0,
        numericStats: numStats,
      };
    });

    return { assignments: assigned, cellStats: stats };
  }, [centers, data, statsColumn]);

  // Sync assignments to parent (separate from useMemo)
  React.useEffect(() => {
    onCellAssignments(assignments);
    onCellColors(CELL_COLORS);
  }, [assignments]);

  const validCenterCount = centers.filter((c) => c.point).length;

  // Actions
  const addCenter = () => {
    const newCenter = createCenter();
    setCenters((prev) => [...prev, newCenter]);
    setActiveCenterId(newCenter.id);
    onSelectModeChange(true);
  };

  const removeCenter = (id: string) => {
    setCenters((prev) => prev.filter((c) => c.id !== id));
    if (activeCenterId === id) {
      setActiveCenterId(null);
      onSelectModeChange(false);
    }
  };

  const updateLabel = (id: string, label: string) => {
    setCenters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label } : c))
    );
  };

  const startSelect = (id: string) => {
    setActiveCenterId(id);
    onSelectModeChange(true);
  };

  const clearAll = () => {
    setCenters([]);
    setActiveCenterId(null);
    onSelectModeChange(false);
    centerCounter = 0;
  };

  const autoFromData = useCallback(() => {
    // Pick some points from data as centers (evenly spaced)
    if (data.length < 2) return;
    const count = Math.min(5, Math.ceil(data.length / 20));
    const step = Math.floor(data.length / count);
    const newCenters: VoronoiCenter[] = [];
    for (let i = 0; i < count; i++) {
      const row = data[i * step];
      centerCounter++;
      newCenters.push({
        id: `vc_${centerCounter}_${Date.now()}_${i}`,
        point: { lat: row.lat, lng: row.lng },
        label: row.name ?? row.id ?? `Center ${i + 1}`,
        colorIdx: i % CELL_COLORS.length,
      });
    }
    setCenters(newCenters);
    onCentersChange(newCenters);
  }, [data]);

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Hexagon className="h-4 w-4" />
          <span className="text-sm font-medium">Voronoi / Territory</span>
        </div>
        {centers.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Info */}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            중심점(매장/거점)을 추가하면 각 중심점에 가장 가까운 데이터 포인트를 
            자동으로 영역 분할합니다. 상권 분석, 배달 커버리지, 세력권 분석에 
            활용할 수 있습니다.
          </p>

          {/* Center management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Centers ({validCenterCount})
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLabels(!showLabels)}
                className="h-6 text-[10px] px-1.5"
              >
                {showLabels ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
            </div>

            {/* Center list */}
            <div className="space-y-1">
              {centers.map((center, idx) => {
                const color = CELL_COLORS[center.colorIdx];
                const stats = cellStats.find((s) => s.centerId === center.id);

                return (
                  <div
                    key={center.id}
                    className={cn(
                      'rounded-md border p-2 space-y-1.5 transition-colors',
                      activeCenterId === center.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {/* Color dot */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 border"
                        style={{ backgroundColor: color.border, borderColor: color.border }}
                      />

                      {/* Label input */}
                      <input
                        type="text"
                        value={center.label}
                        onChange={(e) => updateLabel(center.id, e.target.value)}
                        className="flex-1 text-xs bg-transparent border-none outline-none focus:underline min-w-0"
                        placeholder={`Center ${idx + 1}`}
                      />

                      {/* Select point */}
                      <button
                        onClick={() => startSelect(center.id)}
                        className="p-1 hover:bg-muted rounded flex-shrink-0"
                        title="Set location"
                      >
                        {center.point ? (
                          <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Crosshair className="h-3 w-3 text-primary animate-pulse" />
                        )}
                      </button>

                      {/* Remove */}
                      <button
                        onClick={() => removeCenter(center.id)}
                        className="p-1 hover:bg-destructive/10 rounded flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>

                    {/* Coordinates */}
                    {center.point && (
                      <div className="text-[10px] text-muted-foreground font-mono pl-5">
                        {center.point.lat.toFixed(5)}, {center.point.lng.toFixed(5)}
                      </div>
                    )}

                    {/* Cell stats */}
                    {stats && stats.pointCount > 0 && (
                      <div className="flex gap-3 pl-5 text-[10px]">
                        <span>
                          <strong>{stats.pointCount}</strong> pts
                        </span>
                        <span>
                          avg <strong>{formatDist(stats.avgDistance)}</strong>
                        </span>
                        <span>
                          max <strong>{formatDist(stats.maxDistance)}</strong>
                        </span>
                      </div>
                    )}

                    {/* Numeric stat */}
                    {stats && statsColumn !== 'none' && stats.numericStats[statsColumn] && (
                      <div className="flex gap-3 pl-5 text-[10px] text-primary">
                        <span>
                          Σ {formatNumber(stats.numericStats[statsColumn].sum)}
                        </span>
                        <span>
                          μ {formatNumber(stats.numericStats[statsColumn].avg)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add / Auto buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={addCenter}
                className="flex-1 h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Center
              </Button>
              {data.length > 0 && centers.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoFromData}
                  className="flex-1 h-8 text-xs"
                >
                  <Hexagon className="h-3 w-3 mr-1" />
                  Auto Generate
                </Button>
              )}
            </div>
          </div>

          {/* Active selection indicator */}
          {activeCenterId && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-xs">
              <Crosshair className="h-4 w-4 animate-pulse text-primary" />
              <span>Click on the map to place this center</span>
            </div>
          )}

          {validCenterCount >= 2 && (
            <>
              <Separator />

              {/* Stats column selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Stats Column
                </Label>
                <Select value={statsColumn} onValueChange={setStatsColumn}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select column for stats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Point count only</SelectItem>
                    {numericCols.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Summary comparison table */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Territory Summary
                </Label>

                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-2 py-1 font-medium">Center</th>
                        <th className="text-right px-2 py-1 font-medium">Points</th>
                        <th className="text-right px-2 py-1 font-medium">Share</th>
                        <th className="text-right px-2 py-1 font-medium">Avg Dist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cellStats.map((stat, idx) => {
                        const center = centers.find((c) => c.id === stat.centerId);
                        if (!center) return null;
                        const color = CELL_COLORS[center.colorIdx];
                        const totalPoints = cellStats.reduce((s, c) => s + c.pointCount, 0);
                        const share = totalPoints > 0
                          ? ((stat.pointCount / totalPoints) * 100).toFixed(1)
                          : '0';

                        return (
                          <tr key={stat.centerId} className="border-t">
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: color.border }}
                                />
                                <span className="truncate">{center.label}</span>
                              </div>
                            </td>
                            <td className="text-right px-2 py-1 font-mono">
                              {stat.pointCount}
                            </td>
                            <td className="text-right px-2 py-1 font-mono">
                              {share}%
                            </td>
                            <td className="text-right px-2 py-1 font-mono">
                              {formatDist(stat.avgDistance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visual bar chart */}
                <div className="space-y-1">
                  {cellStats.map((stat) => {
                    const center = centers.find((c) => c.id === stat.centerId);
                    if (!center) return null;
                    const color = CELL_COLORS[center.colorIdx];
                    const totalPoints = cellStats.reduce((s, c) => s + c.pointCount, 0);
                    const pct = totalPoints > 0
                      ? (stat.pointCount / totalPoints) * 100
                      : 0;

                    return (
                      <div key={stat.centerId} className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="truncate">{center.label}</span>
                          <span className="font-mono">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color.border,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {centers.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Hexagon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>중심점(매장, 거점)을 추가하면</p>
              <p>세력권 영역이 자동 분할됩니다.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
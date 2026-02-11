// components/tools/GridHexTool.tsx
// Grid / Hex Bin Map - density visualization with aggregation

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GeoPoint, MapDataRow } from '@/types/map-analysis';
import { analyzeColumns, formatNumber } from '@/lib/map-utils';
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
  Grid3x3,
  Hexagon,
  RotateCcw,
  Palette,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface GridCell {
  id: string;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  center: GeoPoint;
  points: MapDataRow[];
  count: number;
  value: number; // aggregated value for coloring
  normalizedValue: number; // 0~1
}

export interface HexCell {
  id: string;
  center: GeoPoint;
  vertices: GeoPoint[];
  points: MapDataRow[];
  count: number;
  value: number;
  normalizedValue: number;
}

export interface GridHexResult {
  mode: 'grid' | 'hex';
  cells: (GridCell | HexCell)[];
  maxValue: number;
  colorScheme: string;
  aggregation: string;
  aggregationColumn: string;
  visible: boolean;
}

interface GridHexToolProps {
  data: MapDataRow[];
  onResultChange: (result: GridHexResult | null) => void;
}

// ─────────────────────────────────────────
// Color schemes
// ─────────────────────────────────────────
const COLOR_SCHEMES: Record<string, { label: string; stops: string[] }> = {
  heat: {
    label: 'Heat',
    stops: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026'],
  },
  blues: {
    label: 'Blues',
    stops: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'],
  },
  greens: {
    label: 'Greens',
    stops: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32'],
  },
  purples: {
    label: 'Purples',
    stops: ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#4a1486'],
  },
  viridis: {
    label: 'Viridis',
    stops: ['#440154', '#46327e', '#365c8d', '#277f8e', '#1fa187', '#4ac16d', '#9fda3a', '#fde725'],
  },
  plasma: {
    label: 'Plasma',
    stops: ['#0d0887', '#5b02a3', '#9a179b', '#cb4678', '#eb7852', '#fbb32f', '#eff821'],
  },
};

export function getColorForValue(normalizedValue: number, scheme: string): string {
  const stops = COLOR_SCHEMES[scheme]?.stops ?? COLOR_SCHEMES.heat.stops;
  const idx = Math.min(Math.floor(normalizedValue * (stops.length - 1)), stops.length - 1);
  return stops[Math.max(0, idx)];
}

// ─────────────────────────────────────────
// Grid computation
// ─────────────────────────────────────────
function computeGrid(
  data: MapDataRow[],
  cellSizeKm: number,
  aggColumn: string,
  aggMode: string
): GridCell[] {
  if (data.length === 0) return [];

  const lats = data.map((d) => d.lat);
  const lngs = data.map((d) => d.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Convert km to degrees (approximate)
  const centerLat = (minLat + maxLat) / 2;
  const latStep = cellSizeKm / 111.32;
  const lngStep = cellSizeKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));

  const cells = new Map<string, { rows: MapDataRow[]; r: number; c: number }>();

  data.forEach((row) => {
    const r = Math.floor((row.lat - minLat) / latStep);
    const c = Math.floor((row.lng - minLng) / lngStep);
    const key = `${r}_${c}`;
    if (!cells.has(key)) cells.set(key, { rows: [], r, c });
    cells.get(key)!.rows.push(row);
  });

  const result: GridCell[] = [];
  cells.forEach(({ rows, r, c }, key) => {
    const cellMinLat = minLat + r * latStep;
    const cellMaxLat = cellMinLat + latStep;
    const cellMinLng = minLng + c * lngStep;
    const cellMaxLng = cellMinLng + lngStep;

    const value = aggregateValue(rows, aggColumn, aggMode);

    result.push({
      id: key,
      bounds: { minLat: cellMinLat, maxLat: cellMaxLat, minLng: cellMinLng, maxLng: cellMaxLng },
      center: { lat: (cellMinLat + cellMaxLat) / 2, lng: (cellMinLng + cellMaxLng) / 2 },
      points: rows,
      count: rows.length,
      value,
      normalizedValue: 0,
    });
  });

  // Normalize
  const maxVal = Math.max(...result.map((c) => c.value), 1);
  result.forEach((c) => {
    c.normalizedValue = c.value / maxVal;
  });

  return result;
}

// ─────────────────────────────────────────
// Hex computation
// ─────────────────────────────────────────
function computeHex(
  data: MapDataRow[],
  cellSizeKm: number,
  aggColumn: string,
  aggMode: string
): HexCell[] {
  if (data.length === 0) return [];

  const lats = data.map((d) => d.lat);
  const lngs = data.map((d) => d.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);

  const centerLat = (minLat + maxLat) / 2;
  const latStep = cellSizeKm / 111.32;
  const lngStep = cellSizeKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));

  // Hex grid: offset coordinates
  const hexHeight = latStep * 2;
  const hexWidth = lngStep * Math.sqrt(3);
  const rowHeight = hexHeight * 0.75;

  const cells = new Map<string, MapDataRow[]>();

  data.forEach((row) => {
    const approxRow = Math.floor((row.lat - minLat) / rowHeight);
    const offset = approxRow % 2 === 1 ? hexWidth / 2 : 0;
    const approxCol = Math.floor((row.lng - minLng + offset) / hexWidth);
    const key = `${approxRow}_${approxCol}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(row);
  });

  const result: HexCell[] = [];
  cells.forEach((rows, key) => {
    const [rStr, cStr] = key.split('_');
    const r = parseInt(rStr);
    const c = parseInt(cStr);
    const offset = r % 2 === 1 ? hexWidth / 2 : 0;
    const centerLng = minLng + c * hexWidth + hexWidth / 2 - offset;
    const centerLat2 = minLat + r * rowHeight + hexHeight / 2;

    // Hex vertices
    const vertices: GeoPoint[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      vertices.push({
        lat: centerLat2 + (latStep * Math.sin(angle)),
        lng: centerLng + (lngStep * Math.cos(angle)),
      });
    }

    const value = aggregateValue(rows, aggColumn, aggMode);

    result.push({
      id: key,
      center: { lat: centerLat2, lng: centerLng },
      vertices,
      points: rows,
      count: rows.length,
      value,
      normalizedValue: 0,
    });
  });

  const maxVal = Math.max(...result.map((c) => c.value), 1);
  result.forEach((c) => {
    c.normalizedValue = c.value / maxVal;
  });

  return result;
}

// ─────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────
function aggregateValue(rows: MapDataRow[], column: string, mode: string): number {
  if (mode === 'count' || !column) return rows.length;

  const values = rows.map((r) => parseFloat(r[column])).filter((v) => !isNaN(v));
  if (values.length === 0) return 0;

  switch (mode) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    default:
      return rows.length;
  }
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function GridHexTool({ data, onResultChange }: GridHexToolProps) {
  const [mode, setMode] = useState<'grid' | 'hex'>('hex');
  const [cellSizeKm, setCellSizeKm] = useState(0.5);
  const [colorScheme, setColorScheme] = useState('heat');
  const [aggregation, setAggregation] = useState('count');
  const [aggColumn, setAggColumn] = useState('');
  const [opacity, setOpacity] = useState(65);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(() => columns.filter((c) => c.type === 'numeric'), [columns]);

  useEffect(() => {
    if (numericCols.length > 0 && !aggColumn) {
      setAggColumn(numericCols[0].name);
    }
  }, [numericCols]);

  // Compute cells
  const cells = useMemo(() => {
    if (data.length === 0) return [];
    if (mode === 'grid') return computeGrid(data, cellSizeKm, aggColumn, aggregation);
    return computeHex(data, cellSizeKm, aggColumn, aggregation);
  }, [data, mode, cellSizeKm, aggColumn, aggregation]);

  const maxValue = useMemo(
    () => Math.max(...cells.map((c) => c.value), 1),
    [cells]
  );

  // Sync to parent
  useEffect(() => {
    if (cells.length === 0) {
      onResultChange(null);
      return;
    }
    onResultChange({
      mode,
      cells,
      maxValue,
      colorScheme,
      aggregation,
      aggregationColumn: aggColumn,
      visible: true,
    });
  }, [cells, colorScheme, opacity]);

  // Stats
  const stats = useMemo(() => {
    if (cells.length === 0) return null;
    const values = cells.map((c) => c.value);
    const counts = cells.map((c) => c.count);
    return {
      totalCells: cells.length,
      totalPoints: counts.reduce((a, b) => a + b, 0),
      avgPerCell: counts.reduce((a, b) => a + b, 0) / cells.length,
      maxCount: Math.max(...counts),
      emptyCells: 0,
      avgValue: values.reduce((a, b) => a + b, 0) / values.length,
      maxValue: Math.max(...values),
    };
  }, [cells]);

  const CELL_SIZE_PRESETS = [
    { label: '100m', value: 0.1 },
    { label: '250m', value: 0.25 },
    { label: '500m', value: 0.5 },
    { label: '1km', value: 1 },
    { label: '2km', value: 2 },
    { label: '5km', value: 5 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          {mode === 'hex' ? <Hexagon className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {mode === 'hex' ? 'Hex Bin' : 'Grid'} Map
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {cells.length} cells
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Info */}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Divide the map into equal-sized grid or hexagonal cells and
            aggregate point data within each cell for density visualization.
          </p>

          {/* Mode toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cell Shape
            </Label>
            <div className="flex gap-1">
              <Button
                variant={mode === 'hex' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('hex')}
                className="flex-1 h-8 text-xs"
              >
                <Hexagon className="h-3.5 w-3.5 mr-1" />
                Hexagon
              </Button>
              <Button
                variant={mode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('grid')}
                className="flex-1 h-8 text-xs"
              >
                <Grid3x3 className="h-3.5 w-3.5 mr-1" />
                Grid
              </Button>
            </div>
          </div>

          {/* Cell size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cell Size
              </Label>
              <span className="text-xs font-mono">
                {cellSizeKm >= 1 ? `${cellSizeKm} km` : `${cellSizeKm * 1000} m`}
              </span>
            </div>
            <Slider
              value={[cellSizeKm]}
              onValueChange={([v]) => setCellSizeKm(v)}
              min={0.05}
              max={10}
              step={0.05}
              className="w-full"
            />
            <div className="flex gap-1">
              {CELL_SIZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setCellSizeKm(p.value)}
                  className={cn(
                    'flex-1 py-1 text-[9px] rounded border transition-colors',
                    Math.abs(cellSizeKm - p.value) < 0.01
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-transparent'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Aggregation */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Aggregate By
            </Label>
            <div className="flex gap-1 flex-wrap">
              {['count', 'sum', 'avg', 'max', 'min'].map((agg) => (
                <button
                  key={agg}
                  onClick={() => setAggregation(agg)}
                  className={cn(
                    'px-2.5 py-1 text-[10px] rounded border transition-colors capitalize',
                    aggregation === agg
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-muted'
                  )}
                >
                  {agg}
                </button>
              ))}
            </div>

            {aggregation !== 'count' && (
              <Select value={aggColumn} onValueChange={setAggColumn}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {numericCols.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          {/* Color scheme */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Color Scheme
            </Label>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => (
                <button
                  key={key}
                  onClick={() => setColorScheme(key)}
                  className={cn(
                    'h-8 rounded-md border flex items-center gap-1.5 px-2 text-[10px] transition-colors',
                    colorScheme === key ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  )}
                >
                  <div
                    className="w-12 h-3 rounded-sm flex-shrink-0"
                    style={{
                      background: `linear-gradient(90deg, ${scheme.stops.join(', ')})`,
                    }}
                  />
                  <span>{scheme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Opacity
              </Label>
              <span className="text-xs font-mono">{opacity}%</span>
            </div>
            <Slider
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Stats */}
          {stats && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Statistics
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Total Cells" value={stats.totalCells.toLocaleString()} />
                <StatCard label="Total Points" value={stats.totalPoints.toLocaleString()} />
                <StatCard label="Avg per Cell" value={stats.avgPerCell.toFixed(1)} />
                <StatCard label="Max Count" value={stats.maxCount.toLocaleString()} />
                {aggregation !== 'count' && (
                  <>
                    <StatCard
                      label={`Avg ${aggregation}`}
                      value={formatNumber(stats.avgValue)}
                    />
                    <StatCard
                      label={`Max ${aggregation}`}
                      value={formatNumber(stats.maxValue)}
                    />
                  </>
                )}
              </div>

              {/* Distribution */}
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Value Distribution</div>
                <DistributionChart cells={cells} colorScheme={colorScheme} />
              </div>
            </div>
          )}

          {/* Legend */}
          {cells.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Legend
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">Low</span>
                  <div
                    className="flex-1 h-3 rounded-sm"
                    style={{
                      background: `linear-gradient(90deg, ${COLOR_SCHEMES[colorScheme].stops.join(', ')})`,
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground">High</span>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                  <span>0</span>
                  <span>{formatNumber(maxValue)}</span>
                </div>
              </div>
            </>
          )}

          {/* Top cells */}
          {cells.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Top Cells
                </Label>
                <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
                  {[...cells]
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 15)
                    .map((cell, i) => (
                      <div
                        key={cell.id}
                        className="flex items-center gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-muted"
                      >
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor: getColorForValue(cell.normalizedValue, colorScheme),
                          }}
                        />
                        <span className="text-muted-foreground w-4 text-right">#{i + 1}</span>
                        <span className="flex-1 font-mono truncate">
                          {cell.center.lat.toFixed(4)}, {cell.center.lng.toFixed(4)}
                        </span>
                        <span className="font-mono font-bold flex-shrink-0">
                          {cell.count}pts
                        </span>
                        {aggregation !== 'count' && (
                          <span className="font-mono text-muted-foreground flex-shrink-0">
                            {formatNumber(cell.value)}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {data.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Grid3x3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data to generate</p>
              <p>grid or hex bin map.</p>
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

function DistributionChart({
  cells,
  colorScheme,
}: {
  cells: (GridCell | HexCell)[];
  colorScheme: string;
}) {
  const bucketCount = 8;
  const maxVal = Math.max(...cells.map((c) => c.value), 1);
  const buckets = new Array(bucketCount).fill(0);
  cells.forEach((c) => {
    const idx = Math.min(Math.floor((c.value / maxVal) * bucketCount), bucketCount - 1);
    buckets[idx]++;
  });
  const maxBucket = Math.max(...buckets, 1);

  return (
    <div className="flex items-end gap-0.5 h-10">
      {buckets.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${(count / maxBucket) * 100}%`,
              minHeight: count > 0 ? 2 : 0,
              backgroundColor: getColorForValue(i / (bucketCount - 1), colorScheme),
            }}
          />
          <div className="text-[7px] text-muted-foreground mt-0.5">{count}</div>
        </div>
      ))}
    </div>
  );
}

export { COLOR_SCHEMES };

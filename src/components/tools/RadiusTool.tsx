// components/tools/RadiusTool.tsx
// 반경 분석 도구 - 지도 클릭 → 반경 원 → 내부 포인트 통계

'use client';

import React, { useState, useMemo } from 'react';
import type { GeoPoint, MapDataRow, RadiusAnalysis } from '@/types/map-analysis';
import { analyzeRadius, formatNumber } from '@/lib/map-utils';
import type { ColumnInfo } from '@/lib/map-utils';
import { analyzeColumns } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
  Circle,
  MousePointerClick,
  MapPin,
  BarChart3,
  Crosshair,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Preset radius options in meters
const RADIUS_PRESETS = [
  { label: '100m', value: 100 },
  { label: '300m', value: 300 },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
];

interface RadiusToolProps {
  data: MapDataRow[];
  selectedCenter: GeoPoint | null;
  onCenterChange: (center: GeoPoint | null) => void;
  onAnalysisResult: (result: RadiusAnalysis | null) => void;
  isSelectMode: boolean;
  onSelectModeChange: (mode: boolean) => void;
  onMapClick: GeoPoint | null;
}

export default function RadiusTool({
  data,
  selectedCenter,
  onCenterChange,
  onAnalysisResult,
  isSelectMode,
  onSelectModeChange,
  onMapClick,
}: RadiusToolProps) {
  const [radiusMeters, setRadiusMeters] = useState(500);
  const [compareRadius, setCompareRadius] = useState<number | null>(null);

  // Handle map click → set center
  React.useEffect(() => {
    if (onMapClick && isSelectMode) {
      onCenterChange(onMapClick);
      onSelectModeChange(false);
    }
  }, [onMapClick]);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const numericCols = useMemo(
    () => columns.filter((c) => c.type === 'numeric').map((c) => c.name),
    [columns]
  );

  // Primary analysis
  const analysis = useMemo(() => {
    if (!selectedCenter || data.length === 0) return null;
    const result = analyzeRadius(selectedCenter, radiusMeters, data, numericCols);
    onAnalysisResult(result);
    return result;
  }, [selectedCenter, radiusMeters, data, numericCols]);

  // Compare analysis (optional second radius)
  const compareAnalysis = useMemo(() => {
    if (!selectedCenter || !compareRadius || data.length === 0) return null;
    return analyzeRadius(selectedCenter, compareRadius, data, numericCols);
  }, [selectedCenter, compareRadius, data, numericCols]);

  const handlePreset = (value: number) => {
    setRadiusMeters(value);
  };

  const handleClear = () => {
    onCenterChange(null);
    onAnalysisResult(null);
    setCompareRadius(null);
  };

  const formatRadius = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4" />
          <span className="text-sm font-medium">Radius Analysis</span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Step 1: Select point */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              1. Select Center Point
            </Label>
            <Button
              variant={isSelectMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectModeChange(!isSelectMode)}
              className="w-full justify-start"
            >
              {isSelectMode ? (
                <>
                  <Crosshair className="h-4 w-4 mr-2 animate-pulse" />
                  Click on map to select...
                </>
              ) : (
                <>
                  <MousePointerClick className="h-4 w-4 mr-2" />
                  Enable point selection
                </>
              )}
            </Button>

            {selectedCenter && (
              <div className="flex items-center justify-between bg-muted/50 rounded-md px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span>
                    {selectedCenter.lat.toFixed(5)}, {selectedCenter.lng.toFixed(5)}
                  </span>
                </div>
                <button
                  onClick={handleClear}
                  className="p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            )}
          </div>

          <Separator />

          {/* Step 2: Set radius */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              2. Set Radius
            </Label>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1">
              {RADIUS_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  variant={radiusMeters === p.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreset(p.value)}
                  className="h-7 text-xs px-2"
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Custom slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Custom</span>
                <span className="font-mono">{formatRadius(radiusMeters)}</span>
              </div>
              <Slider
                min={50}
                max={10000}
                step={50}
                value={[radiusMeters]}
                onValueChange={([v]) => setRadiusMeters(v)}
              />
            </div>
          </div>

          <Separator />

          {/* Step 3: Compare (optional) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              3. Compare Radius (optional)
            </Label>
            <Select
              value={compareRadius?.toString() ?? 'none'}
              onValueChange={(v) =>
                setCompareRadius(v === 'none' ? null : parseInt(v))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select comparison radius" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No comparison</SelectItem>
                {RADIUS_PRESETS.filter((p) => p.value !== radiusMeters).map((p) => (
                  <SelectItem key={p.value} value={p.value.toString()}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Results */}
          {analysis ? (
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Results
              </Label>

              {/* Primary result card */}
              <ResultCard
                label={formatRadius(radiusMeters)}
                analysis={analysis}
                numericCols={numericCols}
                variant="primary"
              />

              {/* Compare result card */}
              {compareAnalysis && compareRadius && (
                <ResultCard
                  label={formatRadius(compareRadius)}
                  analysis={compareAnalysis}
                  numericCols={numericCols}
                  variant="secondary"
                />
              )}

              {/* Comparison diff */}
              {analysis && compareAnalysis && (
                <ComparisonDiff
                  primary={analysis}
                  secondary={compareAnalysis}
                  primaryLabel={formatRadius(radiusMeters)}
                  secondaryLabel={formatRadius(compareRadius!)}
                  numericCols={numericCols}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>지도에서 중심점을 클릭하면</p>
              <p>반경 내 데이터를 분석합니다.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────
// Result Card
// ─────────────────────────────────────────────
function ResultCard({
  label,
  analysis,
  numericCols,
  variant,
}: {
  label: string;
  analysis: RadiusAnalysis;
  numericCols: string[];
  variant: 'primary' | 'secondary';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        variant === 'primary'
          ? 'border-primary/30 bg-primary/5'
          : 'border-muted-foreground/20 bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between">
        <Badge
          variant={variant === 'primary' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {label}
        </Badge>
        <span className="text-lg font-bold">
          {analysis.stats.totalPoints}
          <span className="text-xs font-normal text-muted-foreground ml-1">
            points
          </span>
        </span>
      </div>

      {numericCols.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {numericCols.slice(0, 6).map((col) => {
            const sum = analysis.stats[`${col}_sum`];
            const avg = analysis.stats[`${col}_avg`];
            if (sum === undefined) return null;
            return (
              <div key={col} className="text-xs space-y-0.5">
                <div className="text-muted-foreground truncate">{col}</div>
                <div className="font-mono">
                  Σ {formatNumber(sum)}
                  <span className="text-muted-foreground"> / μ {formatNumber(avg)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Comparison Diff
// ─────────────────────────────────────────────
function ComparisonDiff({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  numericCols,
}: {
  primary: RadiusAnalysis;
  secondary: RadiusAnalysis;
  primaryLabel: string;
  secondaryLabel: string;
  numericCols: string[];
}) {
  const diff = primary.stats.totalPoints - secondary.stats.totalPoints;
  const pct =
    secondary.stats.totalPoints > 0
      ? ((diff / secondary.stats.totalPoints) * 100).toFixed(1)
      : '—';

  return (
    <div className="rounded-lg border border-dashed p-3 space-y-2 text-xs">
      <div className="flex items-center gap-1">
        <BarChart3 className="h-3 w-3" />
        <span className="font-medium">
          {primaryLabel} vs {secondaryLabel}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Point difference</span>
        <span
          className={cn(
            'font-mono font-medium',
            diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''
          )}
        >
          {diff > 0 ? '+' : ''}
          {diff} ({pct}%)
        </span>
      </div>
      {numericCols.slice(0, 3).map((col) => {
        const pSum = primary.stats[`${col}_sum`] ?? 0;
        const sSum = secondary.stats[`${col}_sum`] ?? 0;
        const colDiff = pSum - sSum;
        return (
          <div key={col} className="flex items-center justify-between">
            <span className="text-muted-foreground truncate">{col} (sum)</span>
            <span
              className={cn(
                'font-mono',
                colDiff > 0 ? 'text-green-600' : colDiff < 0 ? 'text-red-600' : ''
              )}
            >
              {colDiff > 0 ? '+' : ''}
              {formatNumber(colDiff)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
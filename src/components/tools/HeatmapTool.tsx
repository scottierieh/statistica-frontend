// components/tools/HeatmapTool.tsx
// Heatmap — density-based heat visualization using leaflet.heat

'use client';

import React, { useState, useMemo } from 'react';
import type { MapDataRow } from '@/types/map-analysis';
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
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface HeatmapResult {
  points: [number, number, number][]; // [lat, lng, intensity]
  radius: number;
  blur: number;
  maxZoom: number;
  gradient: Record<number, string>;
  visible: boolean;
}

interface HeatmapToolProps {
  data: MapDataRow[];
  filteredData: MapDataRow[];
  numericHeaders: string[];
  onResultChange: (result: HeatmapResult | null) => void;
}

// ─────────────────────────────────────────
// Gradient presets
// ─────────────────────────────────────────
const GRADIENT_PRESETS: { id: string; label: string; gradient: Record<number, string> }[] = [
  {
    id: 'default',
    label: 'Blue → Red',
    gradient: { 0.2: '#313695', 0.4: '#4575b4', 0.5: '#74add1', 0.6: '#fee090', 0.8: '#f46d43', 1.0: '#a50026' },
  },
  {
    id: 'green',
    label: 'Green → Red',
    gradient: { 0.2: '#1a9850', 0.4: '#66bd63', 0.6: '#fee08b', 0.8: '#f46d43', 1.0: '#d73027' },
  },
  {
    id: 'purple',
    label: 'Purple → Yellow',
    gradient: { 0.2: '#3f007d', 0.4: '#6a51a3', 0.6: '#9e9ac8', 0.8: '#fdae6b', 1.0: '#f7f700' },
  },
  {
    id: 'thermal',
    label: 'Black → White',
    gradient: { 0.1: '#000004', 0.3: '#420a68', 0.5: '#932667', 0.7: '#dd513a', 0.9: '#fca50a', 1.0: '#fcffa4' },
  },
];

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function HeatmapTool({
  data,
  filteredData,
  numericHeaders,
  onResultChange,
}: HeatmapToolProps) {
  const [radius, setRadius] = useState(25);
  const [blur, setBlur] = useState(15);
  const [maxZoom, setMaxZoom] = useState(17);
  const [weightColumn, setWeightColumn] = useState('');
  const [gradientId, setGradientId] = useState('default');
  const [enabled, setEnabled] = useState(true);

  const gradient = GRADIENT_PRESETS.find((g) => g.id === gradientId)?.gradient || GRADIENT_PRESETS[0].gradient;

  // Build heatmap points
  const heatPoints = useMemo((): [number, number, number][] => {
    if (filteredData.length === 0) return [];

    if (!weightColumn) {
      return filteredData.map((r) => [r.lat, r.lng, 1]);
    }

    // Normalize weight column
    const values = filteredData.map((r) => parseFloat(r[weightColumn]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return filteredData.map((r, i) => {
      const normalized = (values[i] - min) / range;
      return [r.lat, r.lng, 0.1 + normalized * 0.9]; // 0.1–1.0 range
    });
  }, [filteredData, weightColumn]);

  // Sync result
  React.useEffect(() => {
    if (!enabled || heatPoints.length === 0) {
      onResultChange(null);
      return;
    }
    onResultChange({
      points: heatPoints,
      radius,
      blur,
      maxZoom,
      gradient,
      visible: true,
    });
  }, [heatPoints, radius, blur, maxZoom, gradient, enabled]);

  // Weight column stats
  const weightStats = useMemo(() => {
    if (!weightColumn) return null;
    const values = filteredData.map((r) => parseFloat(r[weightColumn]) || 0);
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, max, avg };
  }, [filteredData, weightColumn]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4" />
          <span className="text-sm font-medium">Heatmap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {filteredData.length} pts
          </Badge>
          <button
            onClick={() => setEnabled(!enabled)}
            className={cn(
              'w-8 h-4.5 rounded-full transition-colors relative',
              enabled ? 'bg-primary' : 'bg-muted-foreground/30'
            )}
          >
            <div
              className={cn(
                'w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform',
                enabled ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Visualize point density as a smooth heat gradient.
            Brighter areas indicate higher concentration.
          </p>

          {/* Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Radius
              </Label>
              <span className="text-xs font-mono">{radius}px</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={([v]) => setRadius(v)}
              min={5}
              max={60}
              step={1}
            />
          </div>

          {/* Blur */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Blur
              </Label>
              <span className="text-xs font-mono">{blur}px</span>
            </div>
            <Slider
              value={[blur]}
              onValueChange={([v]) => setBlur(v)}
              min={1}
              max={40}
              step={1}
            />
          </div>

          {/* Max Zoom */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Max Zoom
              </Label>
              <span className="text-xs font-mono">{maxZoom}</span>
            </div>
            <Slider
              value={[maxZoom]}
              onValueChange={([v]) => setMaxZoom(v)}
              min={8}
              max={20}
              step={1}
            />
            <div className="text-[9px] text-muted-foreground">
              Points spread more at lower max zoom values.
            </div>
          </div>

          <Separator />

          {/* Weight column */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Weight Column <span className="font-normal">(optional)</span>
            </Label>
            <Select value={weightColumn} onValueChange={(v) => setWeightColumn(v === '_none' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None (equal density)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none" className="text-xs">None (equal density)</SelectItem>
                {numericHeaders.map((h) => (
                  <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {weightStats && (
              <div className="flex gap-3 text-[9px] text-muted-foreground font-mono">
                <span>Min: {weightStats.min.toLocaleString()}</span>
                <span>Avg: {weightStats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span>Max: {weightStats.max.toLocaleString()}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Gradient */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Color Scheme
            </Label>
            <div className="space-y-1.5">
              {GRADIENT_PRESETS.map((preset) => {
                const stops = Object.entries(preset.gradient)
                  .map(([pos, color]) => `${color} ${parseFloat(pos) * 100}%`)
                  .join(', ');
                return (
                  <button
                    key={preset.id}
                    onClick={() => setGradientId(preset.id)}
                    className={cn(
                      'w-full flex items-center gap-2 p-1.5 rounded-lg border transition-colors',
                      gradientId === preset.id ? 'border-primary bg-primary/5' : 'hover:bg-muted border-transparent'
                    )}
                  >
                    <div
                      className="h-4 flex-1 rounded"
                      style={{ background: `linear-gradient(to right, ${stops})` }}
                    />
                    <span className="text-[9px] text-muted-foreground w-20 text-right">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {filteredData.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Flame className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Upload data to generate heatmap.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// components/tools/TimeSeriesSlider.tsx
// 시계열 슬라이더 - 재생/일시정지/속도 조절로 시간별 데이터 변화 애니메이션

'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { MapDataRow, TimeSeriesFrame } from '@/types/map-analysis';
import { groupByTimeSeries } from '@/lib/map-utils';
import { analyzeColumns } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Repeat,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SPEED_OPTIONS = [
  { label: '0.5x', value: 2000 },
  { label: '1x', value: 1000 },
  { label: '2x', value: 500 },
  { label: '4x', value: 250 },
];

interface TimeSeriesSliderProps {
  data: MapDataRow[];
  onFrameChange: (frame: TimeSeriesFrame | null) => void;
  onAllFrames: (frames: TimeSeriesFrame[]) => void;
}

export default function TimeSeriesSlider({
  data,
  onFrameChange,
  onAllFrames,
}: TimeSeriesSliderProps) {
  const [timeColumn, setTimeColumn] = useState<string>('');
  const [weightColumn, setWeightColumn] = useState<string>('none');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [loop, setLoop] = useState(true);
  const [showTrail, setShowTrail] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect columns
  const columns = useMemo(() => analyzeColumns(data), [data]);
  const timeColumns = useMemo(
    () => columns.filter((c) => c.type === 'datetime' || c.type === 'categorical'),
    [columns]
  );
  const numericCols = useMemo(
    () => columns.filter((c) => c.type === 'numeric'),
    [columns]
  );

  // Auto-select first time column
  useEffect(() => {
    if (!timeColumn && timeColumns.length > 0) {
      setTimeColumn(timeColumns[0].name);
    }
  }, [timeColumns, timeColumn]);

  // Build frames
  const frames = useMemo(() => {
    if (!timeColumn || data.length === 0) return [];
    const result = groupByTimeSeries(
      data,
      timeColumn,
      weightColumn !== 'none' ? weightColumn : undefined
    );
    onAllFrames(result);
    return result;
  }, [data, timeColumn, weightColumn]);

  // Emit current frame
  useEffect(() => {
    if (frames.length > 0 && currentIndex < frames.length) {
      if (showTrail) {
        // Trail mode: show all frames up to current
        const merged: TimeSeriesFrame = {
          label: frames[currentIndex].label,
          points: frames.slice(0, currentIndex + 1).flatMap((f) => f.points),
          weights: frames.slice(0, currentIndex + 1).flatMap((f) => f.weights ?? []),
        };
        onFrameChange(merged);
      } else {
        onFrameChange(frames[currentIndex]);
      }
    } else {
      onFrameChange(null);
    }
  }, [currentIndex, frames, showTrail]);

  // Playback control
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    stopPlayback();
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          if (loop) return 0;
          stopPlayback();
          return prev;
        }
        return next;
      });
    }, speed);
  }, [frames.length, speed, loop, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Restart playback when speed changes
  useEffect(() => {
    if (isPlaying) startPlayback();
  }, [speed]);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (currentIndex >= frames.length - 1) setCurrentIndex(0);
      startPlayback();
    }
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(frames.length - 1, index));
    setCurrentIndex(clamped);
  };

  const progressPct =
    frames.length > 1 ? (currentIndex / (frames.length - 1)) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Time Series</span>
        </div>
        {frames.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {frames.length} frames
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Column selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Time Column
            </Label>
            <Select value={timeColumn} onValueChange={setTimeColumn}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select time column" />
              </SelectTrigger>
              <SelectContent>
                {timeColumns.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                    <span className="text-muted-foreground ml-1">
                      ({c.uniqueCount} values)
                    </span>
                  </SelectItem>
                ))}
                {/* Also allow numeric columns as time */}
                {numericCols.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                    <span className="text-muted-foreground ml-1">(numeric)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Weight Column (optional)
            </Label>
            <Select value={weightColumn} onValueChange={setWeightColumn}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {numericCols.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frames.length > 0 && (
            <>
              <Separator />

              {/* Current frame display */}
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold font-mono">
                  {frames[currentIndex]?.label ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {frames[currentIndex]?.points.length ?? 0} points ·{' '}
                  Frame {currentIndex + 1}/{frames.length}
                </div>
              </div>

              {/* Progress bar */}
              <Progress value={progressPct} className="h-1.5" />

              {/* Timeline slider */}
              <Slider
                min={0}
                max={Math.max(0, frames.length - 1)}
                step={1}
                value={[currentIndex]}
                onValueChange={([v]) => {
                  if (isPlaying) stopPlayback();
                  goTo(v);
                }}
              />

              {/* Playback controls */}
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goTo(0)}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goTo(currentIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant={isPlaying ? 'default' : 'outline'}
                  size="icon"
                  className="h-10 w-10"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goTo(currentIndex + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goTo(frames.length - 1)}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Speed & Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {SPEED_OPTIONS.map((s) => (
                    <Button
                      key={s.value}
                      variant={speed === s.value ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 text-[10px] px-1.5"
                      onClick={() => setSpeed(s.value)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant={loop ? 'default' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setLoop(!loop)}
                    title="Loop"
                  >
                    <Repeat className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Trail toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs">Trail Mode (cumulative)</span>
                <button
                  onClick={() => setShowTrail(!showTrail)}
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors',
                    showTrail ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                      showTrail && 'translate-x-4'
                    )}
                  />
                </button>
              </label>

              <Separator />

              {/* Frame list */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Frames
                </Label>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-0.5">
                    {frames.map((frame, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isPlaying) stopPlayback();
                          goTo(idx);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors',
                          idx === currentIndex && 'bg-primary/10 border border-primary/30'
                        )}
                      >
                        <span className="font-mono">{frame.label}</span>
                        <span className="text-muted-foreground">
                          {frame.points.length} pts
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Empty state */}
          {frames.length === 0 && timeColumn && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>데이터에서 시계열 프레임을</p>
              <p>생성할 수 없습니다.</p>
              <p className="mt-1">시간/날짜 컬럼이 있는지 확인하세요.</p>
            </div>
          )}

          {!timeColumn && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>시간 컬럼을 선택하면</p>
              <p>시계열 애니메이션이 시작됩니다.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

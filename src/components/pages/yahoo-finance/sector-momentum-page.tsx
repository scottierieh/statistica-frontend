'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Download,
  Loader2,
  FileSpreadsheet,
  ImageIcon,
  ChevronDown,
  CheckCircle,
  X,
  FileText,
  Eye,
  BarChart3,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import type { AnalysisPageProps } from '@/components/finance-analytics-app';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ============================================
// Constants
// ============================================

const SECTOR_COLORS = [
  '#6C3AED', '#F59E0B', '#10B981', '#EF4444',
  '#3B82F6', '#EC4899', '#14B8A6', '#F97316',
  '#8B5CF6', '#06B6D4', '#84CC16', '#E11D48',
];

const EXAMPLE_SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Energy',
  'Consumer Disc.', 'Industrials', 'Utilities', 'Materials',
  'Real Estate', 'Comm. Services', 'Consumer Staples',
];

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2023-01-03');

  // Base cumulative returns per sector (different momentum profiles)
  const profiles: Record<string, { drift: number; vol: number }> = {
    'Technology':        { drift:  0.0012, vol: 0.018 },
    'Healthcare':        { drift:  0.0003, vol: 0.010 },
    'Financials':        { drift:  0.0005, vol: 0.012 },
    'Energy':            { drift: -0.0002, vol: 0.016 },
    'Consumer Disc.':    { drift:  0.0007, vol: 0.014 },
    'Industrials':       { drift:  0.0004, vol: 0.011 },
    'Utilities':         { drift: -0.0003, vol: 0.008 },
    'Materials':         { drift:  0.0002, vol: 0.013 },
    'Real Estate':       { drift: -0.0004, vol: 0.012 },
    'Comm. Services':    { drift:  0.0006, vol: 0.015 },
    'Consumer Staples':  { drift:  0.0001, vol: 0.007 },
  };

  // Initialize prices
  const prices: Record<string, number> = {};
  for (const s of EXAMPLE_SECTORS) prices[s] = 100;

  for (let d = 0; d < 260; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d + Math.floor(d / 5) * 2);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const row: Record<string, any> = { date: date.toISOString().split('T')[0] };
    for (const s of EXAMPLE_SECTORS) {
      const { drift, vol } = profiles[s];
      const ret = drift + (Math.random() - 0.5) * vol * 2;
      prices[s] = prices[s] * (1 + ret);
      row[s] = parseFloat(prices[s].toFixed(4));
    }
    rows.push(row);
  }
  return rows;
}

// ============================================
// Helpers
// ============================================

function calcReturn(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last  = values[values.length - 1];
  return first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
}

function calcMomentum(values: number[], window: number): number {
  if (values.length < window + 1) return calcReturn(values);
  const slice = values.slice(values.length - window - 1);
  return calcReturn(slice);
}

function calcRSI(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  const changes = values.slice(1).map((v, i) => v - values[i]);
  const recent  = changes.slice(-period);
  const gains   = recent.filter((c) => c > 0).reduce((s, c) => s + c, 0) / period;
  const losses  = recent.filter((c) => c < 0).reduce((s, c) => s - c, 0) / period;
  return losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
}

// ============================================
// Tooltips
// ============================================

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number'
              ? `${p.value >= 0 ? '+' : ''}${p.value.toFixed(2)}%`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Intro Page
// ============================================

const IntroPage = ({ onLoadExample }: { onLoadExample: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Sector Momentum & Relative Strength</CardTitle>
        <CardDescription className="text-base mt-2">
          Compare sector-level returns to identify which industries are leading or lagging the market
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />, title: 'Momentum Ranking',     desc: 'Rank all sectors by 1M, 3M, and full-period returns to identify which industries are currently in favor' },
            { icon: <ArrowUpDown className="w-6 h-6 text-primary mb-2" />, title: 'Relative Strength',   desc: 'Compare each sector return against the equal-weighted average to highlight outperformers and laggards' },
            { icon: <Layers      className="w-6 h-6 text-primary mb-2" />, title: 'Trend Comparison',    desc: 'Normalized price trend overlay for all sectors — visualize divergence and convergence over time' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use sector momentum to guide tactical allocation — overweight leading sectors and underweight or avoid laggards.
            Relative strength persistence is one of the most robust return predictors in equity markets.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — Trading date (one row per day)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Sector columns</strong> — Price or index level per sector</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Momentum ranking bar chart (1M / 3M / Full)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Relative strength vs equal-weight average</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Normalized trend overlay + sector RSI table</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <BarChart3 className="mr-2 h-5 w-5" />
            Load Example Data
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================
// Main Component
// ============================================

export default function SectorMomentumPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {
  const hasData    = data.length > 0;

  const [dateCol,      setDateCol]      = useState('');
  const [sectorCols,   setSectorCols]   = useState<string[]>([]);
  const [momentumWindow, setMomentumWindow] = useState<'1m' | '3m' | 'full'>('1m');
  const [sortBy,       setSortBy]       = useState<'return' | 'rs'>('return');

  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_sector_prices.csv');
    setDateCol('date');
    setSectorCols(EXAMPLE_SECTORS);
  }, []);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setSectorCols([]);
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map((s) => s.toLowerCase());
    const idx = h.findIndex((c) => c === 'date' || c.includes('date'));
    if (idx !== -1 && !dateCol) setDateCol(allHeaders[idx]);
  }, [hasData, allHeaders]);


  // ── Toggle sector selection ────────────────────────────────
  const toggleSector = (col: string) => {
    setSectorCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  // ── Per-sector values over time ────────────────────────────
  const sectorSeries = useMemo(() => {
    if (!dateCol || !sectorCols.length) return {};
    const result: Record<string, number[]> = {};
    for (const col of sectorCols) {
      result[col] = data
        .map((row) => parseFloat(String(row[col])))
        .filter((v) => !isNaN(v));
    }
    return result;
  }, [data, dateCol, sectorCols]);

  // ── Momentum stats per sector ──────────────────────────────
  const sectorStats = useMemo(() => {
    const windowDays = momentumWindow === '1m' ? 21 : momentumWindow === '3m' ? 63 : 99999;
    return sectorCols.map((col, i) => {
      const values = sectorSeries[col] ?? [];
      const ret    = calcMomentum(values, windowDays);
      const full   = calcReturn(values);
      const ret1m  = calcMomentum(values, 21);
      const ret3m  = calcMomentum(values, 63);
      const rsi    = calcRSI(values);
      return { col, color: SECTOR_COLORS[i % SECTOR_COLORS.length], ret, full, ret1m, ret3m, rsi };
    });
  }, [sectorCols, sectorSeries, momentumWindow]);

  // ── Equal-weight average return ────────────────────────────
  const avgReturn = useMemo(() => {
    if (!sectorStats.length) return 0;
    return sectorStats.reduce((s, v) => s + v.ret, 0) / sectorStats.length;
  }, [sectorStats]);

  // ── Sorted for charts ──────────────────────────────────────
  const sortedStats = useMemo(() =>
    [...sectorStats].sort((a, b) =>
      sortBy === 'return' ? b.ret - a.ret : (b.ret - avgReturn) - (a.ret - avgReturn)
    ),
    [sectorStats, sortBy, avgReturn],
  );

  // ── Momentum bar chart data ────────────────────────────────
  const momentumBarData = useMemo(() =>
    sortedStats.map((s) => ({
      name:   s.col,
      return: parseFloat(s.ret.toFixed(2)),
      rs:     parseFloat((s.ret - avgReturn).toFixed(2)),
      color:  s.color,
    })),
    [sortedStats, avgReturn],
  );

  const trendData = useMemo(() => {
    if (!dateCol || !sectorCols.length) return [];
    const firsts: Record<string, number> = {};
    for (const col of sectorCols) {
      const first = data.find((r) => !isNaN(parseFloat(String(r[col]))))?.[col];
      if (first) firsts[col] = parseFloat(String(first));
    }
    return data.map((row) => {
      const entry: Record<string, any> = { date: String(row[dateCol] ?? '') };
      for (const col of sectorCols) {
        const v = parseFloat(String(row[col]));
        entry[col] = firsts[col] && !isNaN(v) ? parseFloat(((v / firsts[col]) * 100).toFixed(3)) : null;
      }
      return entry;
    }).filter((r) => r.date);
  }, [data, dateCol, sectorCols]);


  const isConfigured = !!(dateCol && sectorCols.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!sectorStats.length) return;
    const csv = Papa.unparse(sectorStats.map((s) => ({
      sector:      s.col,
      return_pct:  s.ret.toFixed(2),
      return_1m:   s.ret1m.toFixed(2),
      return_3m:   s.ret3m.toFixed(2),
      return_full: s.full.toFixed(2),
      vs_avg:      (s.ret - avgReturn).toFixed(2),
      rsi:         s.rsi.toFixed(1),
    })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `SectorMomentum_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [sectorStats, avgReturn, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `SectorMomentum_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  if (!hasData) return <IntroPage onLoadExample={handleLoadExample} />;

  const leader  = sortedStats[0];
  const laggard = sortedStats[sortedStats.length - 1];

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-4">

      {/* ── File Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{displayFileName}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {data.length.toLocaleString()} rows · {allHeaders.length} cols
          </span>
          {isExample && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold whitespace-nowrap">
              Example
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => setPreviewOpen(true)} title="Preview data">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => {
              const csv = Papa.unparse(data);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = displayFileName.replace(/\.csv$/, '') + '_raw.csv';
              link.click();
              toast({ title: 'Raw data downloaded' });
            }} title="Download raw CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={handleClearAll} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Data Preview Modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {displayFileName}
              <span className="text-xs text-muted-foreground font-normal">
                — {data.length.toLocaleString()} rows · {allHeaders.length} columns
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0 rounded-md border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  {allHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    {allHeaders.map((h) => (
                      <td key={h} className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                        {String(row[h] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > 100 && (
            <p className="text-xs text-muted-foreground pt-2">
              Showing first 100 of {data.length.toLocaleString()} rows
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 1</span>
            <span className="text-xs text-muted-foreground">Macro & Sector</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sector Momentum & Relative Strength
          </CardTitle>
          <CardDescription>
            Compare sector-level returns to identify which industries are leading or lagging the market.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Select the date column, then check the sector columns to include.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date column */}
          <div className="w-48 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">DATE *</Label>
            <Select value={dateCol || '__none__'} onValueChange={(v) => setDateCol(v === '__none__' ? '' : v)}>
              <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {allHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Sector checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-muted-foreground">SECTOR COLUMNS</Label>
              <div className="flex gap-2">
                <button className="text-xs text-primary hover:underline"
                  onClick={() => setSectorCols(numericHeaders)}>All</button>
                <button className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setSectorCols([])}>None</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {numericHeaders.map((h) => {
                const active = sectorCols.includes(h);
                return (
                  <button key={h} onClick={() => toggleSector(h)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium
                      ${active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Export ── */}
      {isConfigured && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && leader && laggard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Leader</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight truncate">{leader.col}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {leader.ret >= 0 ? '+' : ''}{leader.ret.toFixed(2)}% · RSI {leader.rsi.toFixed(0)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Laggard</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight truncate">{laggard.col}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {laggard.ret >= 0 ? '+' : ''}{laggard.ret.toFixed(2)}% · RSI {laggard.rsi.toFixed(0)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Equal-Wt Avg</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">
              {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{sectorCols.length} sectors</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Spread</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">
              {(leader.ret - laggard.ret).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Leader vs laggard</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Momentum Bar Chart ── */}
        {isConfigured && momentumBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Sector Momentum Ranking</CardTitle>
                  <CardDescription>Return over selected window, sorted by performance</CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {(['1m', '3m', 'full'] as const).map((w) => (
                    <button key={w} onClick={() => setMomentumWindow(w)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all
                        ${momentumWindow === w
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {w === '1m' ? '1 Month' : w === '3m' ? '3 Month' : 'Full Period'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, momentumBarData.length * 32)}>
                <BarChart data={momentumBarData} layout="vertical"
                  margin={{ top: 4, right: 70, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false} axisLine={false} width={120} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="return" name="Return %" radius={[0, 3, 3, 0]} maxBarSize={22}>
                    {momentumBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Relative Strength vs Average ── */}
        {isConfigured && momentumBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Relative Strength vs Equal-Weight Average</CardTitle>
              <CardDescription>Positive = outperforming the average · Negative = underperforming</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, momentumBarData.length * 32)}>
                <BarChart data={momentumBarData} layout="vertical"
                  margin={{ top: 4, right: 70, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false} axisLine={false} width={120} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="rs" name="vs Avg %" radius={[0, 3, 3, 0]} maxBarSize={22}>
                    {momentumBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.rs >= 0 ? '#6C3AED' : '#94A3B8'} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Normalized Trend Overlay ── */}
        {isConfigured && trendData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Normalized Trend Overlay (Base = 100)</CardTitle>
              <CardDescription>All sectors rebased to 100 at start of period — compare relative trajectories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={60} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v.toFixed(0)} width={36} />
                  <Tooltip content={<LineTooltip />} />
                  <ReferenceLine y={100} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  {sectorCols.map((col, i) => (
                    <Line key={col} type="monotone" dataKey={col} name={col}
                      stroke={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                      strokeWidth={1.5} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Sector Stats Table ── */}
        {isConfigured && sortedStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sector Statistics</CardTitle>
              <CardDescription>Return across windows, relative strength, and RSI per sector</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Sector', '1M Return', '3M Return', 'Full Period', 'vs Avg', 'RSI'].map((h) => (
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Sector' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStats.map((s) => {
                      const rs = s.ret - avgReturn;
                      return (
                        <tr key={s.col} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="font-medium text-slate-700">{s.col}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className={s.ret1m >= 0 ? 'text-primary' : 'text-slate-500'}>
                              {s.ret1m >= 0 ? '+' : ''}{s.ret1m.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {s.ret3m >= 0 ? '+' : ''}{s.ret3m.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {s.full >= 0 ? '+' : ''}{s.full.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            <span className={rs >= 0 ? 'text-primary' : 'text-slate-500'}>
                              {rs >= 0 ? '+' : ''}{rs.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {s.rsi.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && leader && laggard && (() => {
          const spread       = leader.ret - laggard.ret;
          const overbought   = sortedStats.filter((s) => s.rsi > 70);
          const oversold     = sortedStats.filter((s) => s.rsi < 30);
          const outperformers = sortedStats.filter((s) => s.ret > avgReturn);
          const underperformers = sortedStats.filter((s) => s.ret < avgReturn);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated sector momentum analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Sector Momentum Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzing <span className="font-semibold">{sectorCols.length}</span> sectors over{' '}
                    <span className="font-mono font-semibold">{data.length}</span> trading days.
                    Equal-weight average return is{' '}
                    <span className="font-mono font-semibold">{avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(2)}%</span>.{' '}
                    <span className="font-semibold">{outperformers.length}</span> sectors are outperforming,{' '}
                    <span className="font-semibold">{underperformers.length}</span> are underperforming.
                    The spread between leader and laggard is{' '}
                    <span className="font-mono font-semibold">{spread.toFixed(2)}%</span>.
                  </p>
                </div>

                {/* Metric tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Leader',      value: leader.col,                                    sub: `+${leader.ret.toFixed(2)}% return` },
                    { label: 'Laggard',     value: laggard.col,                                   sub: `${laggard.ret.toFixed(2)}% return` },
                    { label: 'Spread',      value: `${spread.toFixed(2)}%`,                       sub: 'Leader vs laggard' },
                    { label: 'Outperforming', value: `${outperformers.length}/${sectorCols.length}`, sub: 'Above equal-wt avg' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-base font-bold font-mono text-slate-700 truncate">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Leading Sector — {leader.col}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold">{leader.col}</span> is the top performer with a return of{' '}
                        <span className="font-mono font-semibold">{leader.ret >= 0 ? '+' : ''}{leader.ret.toFixed(2)}%</span>,
                        outperforming the average by{' '}
                        <span className="font-mono font-semibold">+{(leader.ret - avgReturn).toFixed(2)}%</span>.
                        RSI at <span className="font-mono">{leader.rsi.toFixed(0)}</span>
                        {leader.rsi > 70 ? ' — momentum is extended, watch for mean-reversion risk.' : ' — momentum has room to continue.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Lagging Sector — {laggard.col}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold">{laggard.col}</span> is the weakest sector at{' '}
                        <span className="font-mono font-semibold">{laggard.ret >= 0 ? '+' : ''}{laggard.ret.toFixed(2)}%</span>,
                        underperforming the average by{' '}
                        <span className="font-mono font-semibold">{(laggard.ret - avgReturn).toFixed(2)}%</span>.
                        {laggard.rsi < 30
                          ? ` RSI at ${laggard.rsi.toFixed(0)} suggests oversold conditions — a technical bounce is possible.`
                          : ` RSI at ${laggard.rsi.toFixed(0)} — no oversold signal yet, momentum may continue lower.`}
                      </p>
                    </div>
                  </div>

                  {overbought.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Overbought Sectors (RSI &gt; 70)</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {overbought.map((s) => s.col).join(', ')} {overbought.length === 1 ? 'is' : 'are'} showing overbought RSI readings above 70.
                          While strong momentum sectors can remain overbought for extended periods, these names carry elevated mean-reversion risk and warrant tighter risk management.
                        </p>
                      </div>
                    </div>
                  )}

                  {oversold.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Oversold Sectors (RSI &lt; 30)</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {oversold.map((s) => s.col).join(', ')} {oversold.length === 1 ? 'has an' : 'have'} RSI below 30.
                          Oversold conditions can persist in strong downtrends, but they may also represent contrarian entry opportunities for mean-reversion strategies.
                        </p>
                      </div>
                    </div>
                  )}

                  {spread > 20 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Wide Sector Dispersion</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The {spread.toFixed(1)}% spread between the best and worst sector is elevated.
                          High dispersion environments favor stock-picking and sector rotation strategies over broad index exposure,
                          as individual sector selection has an outsized impact on portfolio performance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Momentum returns are computed over the trailing window using price levels. RSI is calculated using a 14-period standard formula.
                  Relative strength is vs equal-weighted average of all selected sectors.
                  This analysis is auto-generated for reference only and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
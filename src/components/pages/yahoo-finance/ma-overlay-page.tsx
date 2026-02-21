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
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Bar,
  Cell,
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
  LineChart,
  Activity,
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
// Types
// ============================================

type MAType = 'SMA' | 'EMA';

interface MAConfig {
  period: number;
  type:   MAType;
  color:  string;
  label:  string;
}

interface ChartRow {
  date:    string;
  price:   number;
  volume?: number;
  [key: string]: any; // dynamic MA keys: sma_20, ema_50, etc.
}

type Signal = 'Golden Cross' | 'Death Cross' | 'Price Above All MAs' | 'Price Below All MAs' | 'Mixed';

// ============================================
// Constants
// ============================================

const MA_PRESETS: MAConfig[] = [
  { period: 20,  type: 'SMA', color: '#F59E0B', label: 'SMA 20'  },
  { period: 50,  type: 'SMA', color: '#6C3AED', label: 'SMA 50'  },
  { period: 200, type: 'SMA', color: '#EF4444', label: 'SMA 200' },
  { period: 12,  type: 'EMA', color: '#10B981', label: 'EMA 12'  },
  { period: 26,  type: 'EMA', color: '#3B82F6', label: 'EMA 26'  },
];

const PRICE_COLOR   = '#1E293B';
const VOLUME_COLOR  = '#CBD5E1';

// ============================================
// Computation helpers
// ============================================

function calcSMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    const slice = prices.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function calcEMA(prices: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(period - 1).fill(null);
  const seed = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(seed);
  for (let i = period; i < prices.length; i++) {
    result.push(prices[i] * k + (result[result.length - 1]! * (1 - k)));
  }
  return result;
}

function buildChartData(
  data:       Record<string, any>[],
  dateCol:    string,
  priceCol:   string,
  volumeCol:  string,
  activeMA:   MAConfig[],
): ChartRow[] {
  const rows = data
    .map(r => ({
      date:   String(r[dateCol]  ?? ''),
      price:  parseFloat(r[priceCol]),
      volume: volumeCol ? parseFloat(r[volumeCol]) || undefined : undefined,
    }))
    .filter(r => r.date && isFinite(r.price));

  if (!rows.length) return [];

  const prices = rows.map(r => r.price);

  const maArrays: Record<string, (number | null)[]> = {};
  for (const ma of activeMA) {
    const key = `${ma.type.toLowerCase()}_${ma.period}`;
    maArrays[key] = ma.type === 'SMA'
      ? calcSMA(prices, ma.period)
      : calcEMA(prices, ma.period);
  }

  return rows.map((r, i) => {
    const row: ChartRow = { date: r.date, price: r.price };
    if (r.volume !== undefined) row.volume = r.volume;
    for (const ma of activeMA) {
      const key = `${ma.type.toLowerCase()}_${ma.period}`;
      const v = maArrays[key][i];
      row[key] = v !== null ? parseFloat(v.toFixed(4)) : null;
    }
    return row;
  });
}

function detectSignal(chartData: ChartRow[], activeMA: MAConfig[]): Signal {
  if (!chartData.length || !activeMA.length) return 'Mixed';
  const last = chartData[chartData.length - 1];
  const price = last.price;

  const maVals = activeMA
    .map(ma => last[`${ma.type.toLowerCase()}_${ma.period}`] as number | null)
    .filter((v): v is number => v !== null);

  if (!maVals.length) return 'Mixed';

  // Golden / Death Cross: SMA20 vs SMA50
  const sma20 = last['sma_20'] as number | null;
  const sma50 = last['sma_50'] as number | null;
  if (sma20 !== null && sma50 !== null) {
    const prev20 = chartData[chartData.length - 2]?.['sma_20'] as number | null;
    const prev50 = chartData[chartData.length - 2]?.['sma_50'] as number | null;
    if (prev20 !== null && prev50 !== null) {
      if (prev20 <= prev50 && sma20 > sma50) return 'Golden Cross';
      if (prev20 >= prev50 && sma20 < sma50) return 'Death Cross';
    }
  }

  const allAbove = maVals.every(v => price > v);
  const allBelow = maVals.every(v => price < v);
  if (allAbove) return 'Price Above All MAs';
  if (allBelow) return 'Price Below All MAs';
  return 'Mixed';
}

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2022-01-03');
  let price  = 150;
  let volume = 80_000_000;

  const phases = [
    { days: 60,  drift:  0.0008, vol: 0.015 }, // mild uptrend
    { days: 40,  drift: -0.0025, vol: 0.022 }, // pullback
    { days: 80,  drift:  0.0015, vol: 0.012 }, // recovery
    { days: 50,  drift: -0.0030, vol: 0.028 }, // correction
    { days: 100, drift:  0.0020, vol: 0.014 }, // strong uptrend
    { days: 60,  drift:  0.0005, vol: 0.010 }, // consolidation
    { days: 80,  drift:  0.0018, vol: 0.013 }, // breakout
  ];

  let day = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) { day++; i--; continue; }

      const ret = phase.drift + (Math.random() - 0.5) * phase.vol;
      price  = Math.max(50, price * (1 + ret));
      volume = Math.max(10_000_000, volume * (0.9 + Math.random() * 0.2));

      rows.push({
        date:   d.toISOString().split('T')[0],
        close:  parseFloat(price.toFixed(2)),
        volume: Math.round(volume),
      });
      day++;
    }
  }
  return rows;
}

// ============================================
// Custom Tooltip
// ============================================

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined && p.dataKey !== 'volume')
        .map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? p.stroke }} />
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
            <LineChart className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Moving Average Overlay</CardTitle>
        <CardDescription className="text-base mt-2">
          Overlay SMA and EMA lines on a price chart to identify trends, support/resistance levels, and crossover signals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <LineChart className="w-6 h-6 text-primary mb-2" />, title: 'SMA & EMA Overlay',    desc: 'Toggle any combination of SMA 20 / 50 / 200 and EMA 12 / 26 overlaid on the price chart — up to 5 moving averages simultaneously.' },
            { icon: <Activity  className="w-6 h-6 text-primary mb-2" />, title: 'Crossover Detection',  desc: 'Automatically identifies Golden Cross and Death Cross events between SMA 20 and SMA 50 — the most widely tracked trend-change signals.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Volume & MA Spread',   desc: 'Optional volume bars below the price chart and a dedicated MA spread panel showing the gap between two selected moving averages.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* MA preset legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {MA_PRESETS.map(ma => (
            <div key={ma.label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-0.5 rounded-full shrink-0" style={{ backgroundColor: ma.color }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{ma.label}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {ma.type === 'SMA'
                  ? `${ma.period}-day simple average`
                  : `${ma.period}-day exponential avg`}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use the MA Overlay as the first layer of technical analysis. Moving averages smooth price noise and
            reveal the underlying trend direction. A price trading above rising MAs is bullish; below falling MAs is
            bearish. Crossovers between short and long MAs mark potential trend reversals and are used as entry/exit signals.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — trading date (YYYY-MM-DD)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>close / price</strong> — daily closing price</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>volume</strong> — optional, enables volume bars</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Price chart with up to 5 MA lines overlaid</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Optional volume bars + MA spread panel</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Auto-detected signal + trend interpretation</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <LineChart className="mr-2 h-5 w-5" />
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

export default function MaOverlayPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ─────────────────────────────────────────
  const [dateCol,   setDateCol]   = useState('');
  const [priceCol,  setPriceCol]  = useState('');
  const [volumeCol, setVolumeCol] = useState('');

  // ── MA toggles ─────────────────────────────────────────────
  const [enableSMA20,  setEnableSMA20]  = useState(true);
  const [enableSMA50,  setEnableSMA50]  = useState(true);
  const [enableSMA200, setEnableSMA200] = useState(true);
  const [enableEMA12,  setEnableEMA12]  = useState(false);
  const [enableEMA26,  setEnableEMA26]  = useState(false);

  // ── Spread panel ───────────────────────────────────────────
  const [spreadMA1, setSpreadMA1] = useState<string>('sma_20');
  const [spreadMA2, setSpreadMA2] = useState<string>('sma_50');
  const [showVolume, setShowVolume] = useState(true);
  const [showSpread, setShowSpread] = useState(true);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,    setPreviewOpen]    = useState(false);
  const [isDownloading,  setIsDownloading]  = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Active MA list ─────────────────────────────────────────
  const activeMA: MAConfig[] = useMemo(() => [
    enableSMA20  && MA_PRESETS[0],
    enableSMA50  && MA_PRESETS[1],
    enableSMA200 && MA_PRESETS[2],
    enableEMA12  && MA_PRESETS[3],
    enableEMA26  && MA_PRESETS[4],
  ].filter(Boolean) as MAConfig[], [enableSMA20, enableSMA50, enableSMA200, enableEMA12, enableEMA26]);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_ma_overlay.csv');
    setEnableSMA20(true); setEnableSMA50(true); setEnableSMA200(true);
    setEnableEMA12(false); setEnableEMA26(false);
    setShowVolume(true); setShowSpread(true);
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setPriceCol(''); setVolumeCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['date'],                           setDateCol,   dateCol);
    detect(['close', 'price', 'adj_close'],    setPriceCol,  priceCol);
    detect(['volume', 'vol'],                  setVolumeCol, volumeCol);
  }, [hasData, allHeaders]);

  // ── Build chart data ───────────────────────────────────────
  const chartData = useMemo(() => {
    if (!dateCol || !priceCol) return [];
    return buildChartData(data, dateCol, priceCol, volumeCol, activeMA);
  }, [data, dateCol, priceCol, volumeCol, activeMA]);

  // ── Sample for chart performance ───────────────────────────
  const sampledData = useMemo(() => {
    if (chartData.length <= 500) return chartData;
    const step = Math.ceil(chartData.length / 500);
    return chartData.filter((_, i) => i % step === 0);
  }, [chartData]);

  // ── Spread data ────────────────────────────────────────────
  const spreadData = useMemo(() => {
    if (!showSpread || !spreadMA1 || !spreadMA2) return [];
    return sampledData.map(r => ({
      date:   r.date,
      spread: r[spreadMA1] !== null && r[spreadMA2] !== null
        ? parseFloat(((r[spreadMA1] as number) - (r[spreadMA2] as number)).toFixed(4))
        : null,
    }));
  }, [sampledData, spreadMA1, spreadMA2, showSpread]);

  // ── Stats ──────────────────────────────────────────────────
  const priceStats = useMemo(() => {
    if (!chartData.length) return null;
    const prices = chartData.map(r => r.price);
    const last   = chartData[chartData.length - 1];
    const first  = chartData[0];
    const hi     = Math.max(...prices);
    const lo     = Math.min(...prices);
    const pctChg = ((last.price - first.price) / first.price) * 100;
    return { last: last.price, first: first.price, hi, lo, pctChg, lastDate: last.date };
  }, [chartData]);

  // ── Signal detection ───────────────────────────────────────
  const signal: Signal = useMemo(() => detectSignal(chartData, activeMA), [chartData, activeMA]);

  // ── MA keys for spread selector ────────────────────────────
  const maKeyOptions = useMemo(() =>
    activeMA.map(ma => ({ key: `${ma.type.toLowerCase()}_${ma.period}`, label: ma.label })),
    [activeMA]
  );

  const isConfigured    = !!(dateCol && priceCol && chartData.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!chartData.length) return;
    const rows = chartData.map(r => {
      const row: Record<string, any> = { date: r.date, price: r.price };
      if (volumeCol) row.volume = r.volume ?? '';
      for (const ma of activeMA) {
        const key = `${ma.type.toLowerCase()}_${ma.period}`;
        row[ma.label.toLowerCase().replace(' ', '_')] = r[key] ?? '';
      }
      return row;
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `MAOverlay_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [chartData, activeMA, volumeCol, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `MAOverlay_${new Date().toISOString().split('T')[0]}.png`;
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
              const link = document.createElement('a');
              link.href = URL.createObjectURL(new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' }));
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
                  {allHeaders.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    {allHeaders.map(h => (
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 7</span>
            <span className="text-xs text-muted-foreground">Technical Timing</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Moving Average Overlay
          </CardTitle>
          <CardDescription>
            Overlay SMA and EMA lines on a price chart to identify trends, support/resistance levels, and crossover signals.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map columns, then toggle the moving averages to display.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Column mapping */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'DATE *',   value: dateCol,   setter: setDateCol,   headers: allHeaders,     opt: false },
              { label: 'PRICE *',  value: priceCol,  setter: setPriceCol,  headers: numericHeaders, opt: false },
              { label: 'VOLUME',   value: volumeCol, setter: setVolumeCol, headers: numericHeaders, opt: true  },
            ].map(({ label, value, setter, headers, opt }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {opt && <SelectItem value="__none__">— None —</SelectItem>}
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* MA toggles */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">MOVING AVERAGES</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'SMA 20',  enabled: enableSMA20,  setter: setEnableSMA20,  color: MA_PRESETS[0].color },
                { label: 'SMA 50',  enabled: enableSMA50,  setter: setEnableSMA50,  color: MA_PRESETS[1].color },
                { label: 'SMA 200', enabled: enableSMA200, setter: setEnableSMA200, color: MA_PRESETS[2].color },
                { label: 'EMA 12',  enabled: enableEMA12,  setter: setEnableEMA12,  color: MA_PRESETS[3].color },
                { label: 'EMA 26',  enabled: enableEMA26,  setter: setEnableEMA26,  color: MA_PRESETS[4].color },
              ].map(({ label, enabled, setter, color }) => (
                <button key={label} onClick={() => setter(!enabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${enabled
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                  style={enabled ? { backgroundColor: color, borderColor: color } : {}}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${enabled ? 'bg-white/70' : 'bg-slate-300'}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Options row */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showVolume} onChange={e => setShowVolume(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Show Volume</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showSpread} onChange={e => setShowSpread(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Show MA Spread</span>
            </label>

            {/* Spread MA selectors */}
            {showSpread && maKeyOptions.length >= 2 && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-muted-foreground">Spread:</span>
                {[
                  { value: spreadMA1, setter: setSpreadMA1 },
                  { value: spreadMA2, setter: setSpreadMA2 },
                ].map(({ value, setter }, i) => (
                  <Select key={i} value={value} onValueChange={setter}>
                    <SelectTrigger className="text-xs h-7 w-24">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {maKeyOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            )}
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
              <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && priceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Price</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">{priceStats.last.toFixed(2)}</div>
            <div className="text-xs mt-1.5 font-semibold text-slate-700">
              {priceStats.pctChg >= 0 ? '+' : ''}{priceStats.pctChg.toFixed(2)}% vs start
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Period High</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">{priceStats.hi.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{data.length.toLocaleString()} trading days</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Period Low</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">{priceStats.lo.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Range: {((priceStats.hi - priceStats.lo) / priceStats.lo * 100).toFixed(1)}%
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Signal</div>
            <div className="flex items-center gap-2 mt-1">
              {signal === 'Golden Cross' && <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />}
              {signal === 'Death Cross'  && <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />}
              {signal === 'Price Above All MAs' && <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />}
              {signal === 'Price Below All MAs' && <TrendingDown className="h-5 w-5 text-red-400 shrink-0" />}
              {signal === 'Mixed' && <Activity className="h-5 w-5 text-slate-400 shrink-0" />}
              <span className={`text-sm font-bold leading-tight
                ${signal === 'Golden Cross' || signal === 'Price Above All MAs' ? 'text-emerald-600' :
                  signal === 'Death Cross'  || signal === 'Price Below All MAs' ? 'text-red-500' :
                  'text-slate-500'}`}>
                {signal}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Price + MA chart ── */}
        {isConfigured && sampledData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price & Moving Average Overlay</CardTitle>
              <CardDescription>
                {activeMA.length === 0
                  ? 'No moving averages selected — enable at least one above'
                  : `Showing price with ${activeMA.map(m => m.label).join(', ')}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={sampledData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(sampledData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  {/* Primary Y axis (price) */}
                  <YAxis yAxisId="price" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(0)} />
                  {/* Secondary Y axis (volume) — declared before Bar that references it */}
                  {showVolume && volumeCol && (
                    <YAxis yAxisId="vol" orientation="right" hide domain={[0, (dataMax: number) => dataMax * 4]} />
                  )}
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                  {/* Volume bars */}
                  {showVolume && volumeCol && (
                    <Bar dataKey="volume" name="Volume" yAxisId="vol"
                      fill={VOLUME_COLOR} fillOpacity={0.35} maxBarSize={4} />
                  )}

                  {/* Price line */}
                  <Line yAxisId="price" dataKey="price" name="Price" stroke={PRICE_COLOR}
                    strokeWidth={2} dot={false} connectNulls />

                  {/* MA lines */}
                  {activeMA.map(ma => (
                    <Line key={`${ma.type}_${ma.period}`}
                      yAxisId="price"
                      dataKey={`${ma.type.toLowerCase()}_${ma.period}`}
                      name={ma.label}
                      stroke={ma.color}
                      strokeWidth={1.5}
                      strokeDasharray={ma.type === 'EMA' ? '5 3' : undefined}
                      dot={false}
                      connectNulls />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── MA Spread chart ── */}
        {isConfigured && showSpread && spreadData.length > 0 && maKeyOptions.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                MA Spread — {maKeyOptions.find(o => o.key === spreadMA1)?.label ?? spreadMA1} minus{' '}
                {maKeyOptions.find(o => o.key === spreadMA2)?.label ?? spreadMA2}
              </CardTitle>
              <CardDescription>
                Positive spread = shorter MA above longer MA (bullish) · Negative = bearish compression
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const validSpread = spreadData.filter(r => r.spread !== null);
                return (
                  <ResponsiveContainer width="100%" height={160}>
                    <ComposedChart data={validSpread} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                        axisLine={{ stroke: '#E2E8F0' }}
                        interval={Math.floor(validSpread.length / 8)}
                        tickFormatter={d => d?.slice(0, 7) ?? ''} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        width={48} tickFormatter={v => v.toFixed(1)} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                      <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="5 3" strokeWidth={1.5} />
                      <Bar dataKey="spread" name="MA Spread" maxBarSize={5} radius={[1, 1, 0, 0]}>
                        {validSpread.map((entry, i) => (
                          <Cell key={i}
                            fill={(entry.spread ?? 0) >= 0 ? '#10B981' : '#EF4444'}
                            fillOpacity={0.75} />
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* ── MA Values table ── */}
        {isConfigured && activeMA.length > 0 && sampledData.length > 0 && (() => {
          const last = chartData[chartData.length - 1];
          const lastPrice = last.price;
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Current MA Values</CardTitle>
                <CardDescription>
                  Latest values as of {last.date} — price vs each moving average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Moving Average', 'Value', 'Price vs MA', 'Signal'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeMA.map(ma => {
                        const key = `${ma.type.toLowerCase()}_${ma.period}`;
                        const val = last[key] as number | null;
                        const diff = val !== null ? ((lastPrice - val) / val) * 100 : null;
                        return (
                          <tr key={key} className="border-t hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-0.5 rounded shrink-0" style={{ backgroundColor: ma.color }} />
                                <span className="font-semibold text-slate-700">{ma.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">
                              {val !== null ? val.toFixed(2) : '—'}
                            </td>
                            <td className={`px-4 py-2.5 font-mono font-semibold text-sm
                              ${diff === null ? 'text-slate-400' : diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff !== null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {diff === null ? (
                                <span className="text-slate-400">Insufficient data</span>
                              ) : diff > 5 ? (
                                <span className="text-emerald-600 font-semibold">Strongly Above</span>
                              ) : diff > 0 ? (
                                <span className="text-emerald-500 font-semibold">Above</span>
                              ) : diff > -5 ? (
                                <span className="text-red-500 font-semibold">Below</span>
                              ) : (
                                <span className="text-red-600 font-semibold">Strongly Below</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Price row */}
                      <tr className="border-t bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 rounded shrink-0" style={{ backgroundColor: PRICE_COLOR }} />
                            <span className="font-semibold text-slate-800">Price</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{lastPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">—</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">Current price</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Insights ── */}
        {isConfigured && priceStats && (() => {
          const lastRow    = chartData[chartData.length - 1];
          const lastPrice  = lastRow.price;
          const aboveCount = activeMA.filter(ma => {
            const v = lastRow[`${ma.type.toLowerCase()}_${ma.period}`] as number | null;
            return v !== null && lastPrice > v;
          }).length;
          const belowCount = activeMA.length - aboveCount;
          const _sma200Raw = lastRow['sma_200'];
          const sma200Val  = (_sma200Raw != null && isFinite(_sma200Raw as number))
            ? (_sma200Raw as number)
            : null;
          const isBullish  = signal === 'Golden Cross' || signal === 'Price Above All MAs';
          const isBearish  = signal === 'Death Cross'  || signal === 'Price Below All MAs';

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated moving average analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">MA Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{data.length.toLocaleString()}</span> trading days.
                    Latest price is <span className="font-mono font-semibold">{lastPrice.toFixed(2)}</span> —
                    trading <span className="font-semibold">{aboveCount > belowCount ? 'above' : 'below'}</span> most active MAs
                    ({aboveCount} above, {belowCount} below).
                    Current signal: <span className="font-semibold">{signal}</span>.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'MAs Active',    value: activeMA.length,                unit: 'lines' },
                    { label: 'Price Above',   value: aboveCount,                     unit: 'MAs'   },
                    { label: 'Price Below',   value: belowCount,                     unit: 'MAs'   },
                    { label: 'Total Return',  value: `${priceStats.pctChg >= 0 ? '+' : ''}${priceStats.pctChg.toFixed(1)}%`, unit: 'period' },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-lg font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground">{unit}</div>
                    </div>
                  ))}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Trend Signal — {signal}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {signal === 'Golden Cross' &&
                          'SMA 20 has crossed above SMA 50 — a classic bullish crossover signal. This event typically marks the beginning of a new uptrend phase. Volume confirmation and a price breakout above SMA 200 would strengthen the case.'}
                        {signal === 'Death Cross' &&
                          'SMA 20 has crossed below SMA 50 — a bearish crossover signal. This suggests near-term momentum is weakening relative to the medium-term trend. Watch for a break below SMA 200 as confirmation of a sustained downtrend.'}
                        {signal === 'Price Above All MAs' &&
                          `Price is trading above all ${activeMA.length} active moving averages — a bullish alignment. All MAs are acting as dynamic support. The trend is intact across all measured timeframes. Monitor for any pullback to the nearest MA as a potential re-entry level.`}
                        {signal === 'Price Below All MAs' &&
                          `Price is below all ${activeMA.length} active moving averages — a bearish stack. The MAs are acting as overhead resistance. A sustained recovery above the shortest MA (${activeMA[0]?.label}) would be the first sign of trend improvement.`}
                        {signal === 'Mixed' &&
                          'Price is positioned between some moving averages — a mixed or consolidating signal. This often indicates a transition phase. Watch for a decisive close above or below the key MA cluster to determine the next directional move.'}
                      </p>
                    </div>
                  </div>

                  {sma200Val !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">SMA 200 — Long-Term Trend Line</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          SMA 200 is at <span className="font-mono font-semibold">{sma200Val.toFixed(2)}</span>.
                          Price is currently{' '}
                          <span className={`font-semibold ${lastPrice > sma200Val ? 'text-emerald-600' : 'text-red-500'}`}>
                            {lastPrice > sma200Val ? 'above' : 'below'}
                          </span>{' '}
                          the 200-day MA by{' '}
                          <span className="font-mono">
                            {Math.abs(((lastPrice - sma200Val) / sma200Val) * 100).toFixed(2)}%
                          </span>.{' '}
                          {lastPrice > sma200Val
                            ? 'Staying above the 200-day MA confirms a long-term bull market structure. Pullbacks to this level are historically used as buy opportunities.'
                            : 'Trading below the 200-day MA places the stock in a long-term bear market structure. Any rallies should be treated with caution until price reclaims this level.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Support & Resistance Interpretation</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        When price trades above a moving average, that MA acts as dynamic{' '}
                        <span className="font-semibold">support</span>. When below, it acts as{' '}
                        <span className="font-semibold">resistance</span>.
                        The nearest MA to price is{' '}
                        <span className="font-semibold">
                          {activeMA.reduce((closest, ma) => {
                            const v = lastRow[`${ma.type.toLowerCase()}_${ma.period}`] as number | null;
                            if (v === null) return closest;
                            const cv = lastRow[`${closest.type.toLowerCase()}_${closest.period}`] as number | null;
                            if (cv === null) return ma;
                            return Math.abs(lastPrice - v) < Math.abs(lastPrice - cv) ? ma : closest;
                          }, activeMA[0])?.label ?? '—'}
                        </span>{' '}
                        — the most relevant near-term reference level.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ SMA (Simple Moving Average) weights all periods equally. EMA (Exponential Moving Average)
                  places greater weight on recent prices, making it more responsive to short-term moves.
                  MA crossovers are lagging signals — they confirm trend changes after they occur.
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
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
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
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
  Activity,
  Waves,
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

type MACDSignal = 'Bullish Crossover' | 'Bearish Crossover' | 'Bullish Momentum' | 'Bearish Momentum' | 'Neutral';

interface MACDRow {
  date:       string;
  price:      number;
  macdLine:   number | null;  // EMA(fast) − EMA(slow)
  signalLine: number | null;  // EMA(signal) of MACD
  histogram:  number | null;  // MACD − signal
  volume?:    number;
}

interface CrossoverEvent {
  date:      string;
  type:      'Bullish Crossover' | 'Bearish Crossover';
  macdVal:   number;
  signalVal: number;
  price:     number;
}

// ============================================
// Constants
// ============================================

const MACD_COLOR     = '#6C3AED';  // violet — MACD line
const SIGNAL_COLOR   = '#F59E0B';  // amber  — signal line
const PRICE_COLOR    = '#1E293B';  // dark   — price
const HIST_POS       = '#10B981';  // green  — positive histogram
const HIST_NEG       = '#EF4444';  // red    — negative histogram
const VOLUME_COLOR   = '#CBD5E1';

const DEFAULT_FAST   = 12;
const DEFAULT_SLOW   = 26;
const DEFAULT_SIGNAL = 9;

// ============================================
// Computation helpers
// ============================================

function calcEMA(values: number[], period: number): (number | null)[] {
  if (values.length < period) return new Array(values.length).fill(null);
  const k      = 2 / (period + 1);
  const result: (number | null)[] = new Array(period - 1).fill(null);
  const seed   = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(seed);
  for (let i = period; i < values.length; i++) {
    result.push(values[i] * k + result[result.length - 1]! * (1 - k));
  }
  return result;
}

function buildMACDRows(
  data:        Record<string, any>[],
  dateCol:     string,
  priceCol:    string,
  volumeCol:   string,
  macdCol:     string,   // optional pre-computed MACD
  signalCol:   string,   // optional pre-computed signal
  fastPeriod:  number,
  slowPeriod:  number,
  signalPeriod:number,
): MACDRow[] {
  // Parse raw rows
  const rows = data
    .map(r => ({
      date:   String(r[dateCol] ?? ''),
      price:  parseFloat(r[priceCol]),
      macdRaw:   macdCol   ? parseFloat(r[macdCol])   : NaN,
      signalRaw: signalCol ? parseFloat(r[signalCol]) : NaN,
      volume: volumeCol ? (parseFloat(r[volumeCol]) || undefined) : undefined,
    }))
    .filter(r => r.date && isFinite(r.price));

  if (!rows.length) return [];

  const prices = rows.map(r => r.price);

  // If pre-computed columns are available and valid, use them
  const usePrecomputed =
    macdCol &&
    signalCol &&
    rows.some(r => isFinite(r.macdRaw)) &&
    rows.some(r => isFinite(r.signalRaw));

  let macdVals:   (number | null)[];
  let signalVals: (number | null)[];

  if (usePrecomputed) {
    macdVals   = rows.map(r => isFinite(r.macdRaw)   ? r.macdRaw   : null);
    signalVals = rows.map(r => isFinite(r.signalRaw) ? r.signalRaw : null);
  } else {
    // Auto-calculate from price
    const emaFast = calcEMA(prices, fastPeriod);
    const emaSlow = calcEMA(prices, slowPeriod);

    // MACD line = emaFast − emaSlow (defined only where both are non-null)
    const rawMACDs: (number | null)[] = emaFast.map((f, i) => {
      const s = emaSlow[i];
      return f !== null && s !== null ? f - s : null;
    });

    // Signal = EMA(signalPeriod) of MACD values (ignoring nulls from warmup)
    const macdNumbers = rawMACDs.filter((v): v is number => v !== null);
    const signalEMA   = calcEMA(macdNumbers, signalPeriod);

    // Align back: find first non-null MACD index
    const firstIdx = rawMACDs.findIndex(v => v !== null);
    signalVals = new Array(rawMACDs.length).fill(null);
    for (let i = 0; i < signalEMA.length; i++) {
      signalVals[firstIdx + i] = signalEMA[i];
    }

    macdVals = rawMACDs;
  }

  return rows.map((r, i) => {
    const m = macdVals[i];
    const s = signalVals[i];
    return {
      date:       r.date,
      price:      r.price,
      macdLine:   m !== null ? parseFloat(m.toFixed(4)) : null,
      signalLine: s !== null ? parseFloat(s.toFixed(4)) : null,
      histogram:  m !== null && s !== null ? parseFloat((m - s).toFixed(4)) : null,
      volume:     r.volume,
    };
  });
}

function detectCrossovers(rows: MACDRow[]): CrossoverEvent[] {
  const events: CrossoverEvent[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];
    if (
      prev.macdLine === null || prev.signalLine === null ||
      curr.macdLine === null || curr.signalLine === null
    ) continue;

    const wasBelow = prev.macdLine <= prev.signalLine;
    const isAbove  = curr.macdLine >  curr.signalLine;
    const wasAbove = prev.macdLine >= prev.signalLine;
    const isBelow  = curr.macdLine <  curr.signalLine;

    if (wasBelow && isAbove) {
      events.push({ date: curr.date, type: 'Bullish Crossover', macdVal: curr.macdLine, signalVal: curr.signalLine, price: curr.price });
    } else if (wasAbove && isBelow) {
      events.push({ date: curr.date, type: 'Bearish Crossover', macdVal: curr.macdLine, signalVal: curr.signalLine, price: curr.price });
    }
  }
  return events;
}

function detectSignal(rows: MACDRow[], crossovers: CrossoverEvent[]): MACDSignal {
  if (!rows.length) return 'Neutral';
  const last = rows[rows.length - 1];
  if (last.macdLine === null || last.signalLine === null) return 'Neutral';

  // Recent crossover within last 5 bars?
  const recent5 = rows.slice(-5);
  const recentCross = crossovers.filter(c => recent5.some(r => r.date === c.date));
  if (recentCross.length) {
    const latest = recentCross[recentCross.length - 1];
    return latest.type === 'Bullish Crossover' ? 'Bullish Crossover' : 'Bearish Crossover';
  }
  if (last.macdLine > last.signalLine) return 'Bullish Momentum';
  if (last.macdLine < last.signalLine) return 'Bearish Momentum';
  return 'Neutral';
}

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2022-01-03');
  let price  = 180;
  let volume = 55_000_000;

  const phases = [
    { days: 55,  drift:  0.0010, vol: 0.012 },
    { days: 45,  drift: -0.0020, vol: 0.019 },
    { days: 75,  drift:  0.0016, vol: 0.013 },
    { days: 50,  drift: -0.0025, vol: 0.022 },
    { days: 85,  drift:  0.0018, vol: 0.011 },
    { days: 35,  drift: -0.0012, vol: 0.016 },
    { days: 100, drift:  0.0020, vol: 0.010 },
    { days: 55,  drift:  0.0006, vol: 0.009 },
  ];

  let day = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) { day++; i--; continue; }
      const ret = phase.drift + (Math.random() - 0.5) * phase.vol;
      price  = Math.max(50, price * (1 + ret));
      volume = Math.max(5_000_000, volume * (0.9 + Math.random() * 0.2));
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
// Custom Tooltips
// ============================================

const PriceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
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

const MACDTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => {
          const v = p.value as number;
          return (
            <div key={p.dataKey} className="flex justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? p.fill }} />
                <span className="text-slate-500">{p.name}</span>
              </div>
              <span className={`font-mono font-semibold ${p.dataKey === 'histogram' ? (v >= 0 ? 'text-emerald-600' : 'text-red-500') : ''}`}>
                {v >= 0 ? '+' : ''}{v.toFixed(3)}
              </span>
            </div>
          );
        })}
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
            <Waves className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">MACD Chart</CardTitle>
        <CardDescription className="text-base mt-2">
          Visualize the MACD line, signal line, and histogram — all auto-calculated from closing prices if pre-computed columns are not provided
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Waves     className="w-6 h-6 text-primary mb-2" />, title: 'Auto-Calculated',   desc: 'MACD line, signal line, and histogram are computed automatically from closing prices using EMA(12), EMA(26), and EMA(9). Pre-computed columns are also accepted.' },
            { icon: <Activity  className="w-6 h-6 text-primary mb-2" />, title: 'Signal Detection',   desc: 'Identifies every MACD–Signal crossover in the history and classifies current momentum as Bullish/Bearish — with a near-term crossover recency check.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Histogram Panel',   desc: 'Dedicated MACD histogram panel below the price chart — bar height shows momentum strength, green bars for bullish and red for bearish expansion.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Component legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: MACD_COLOR,   label: 'MACD Line',    desc: `EMA(${DEFAULT_FAST}) − EMA(${DEFAULT_SLOW})` },
            { color: SIGNAL_COLOR, label: 'Signal Line',  desc: `EMA(${DEFAULT_SIGNAL}) of MACD` },
            { color: HIST_POS,     label: 'Histogram +',  desc: 'MACD above Signal (bullish)' },
            { color: HIST_NEG,     label: 'Histogram −',  desc: 'MACD below Signal (bearish)' },
          ].map(({ color, label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-0.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</div>
              </div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            MACD combines trend direction and momentum in a single indicator. The MACD line crossing above
            the signal line is a bullish trigger; crossing below is bearish. The histogram shows the rate
            of change — shrinking bars signal momentum is fading, even before a line crossover occurs.
            Use MACD alongside price structure and volume for higher-conviction signals.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — trading date (YYYY-MM-DD)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>close / price</strong> — daily closing price (MACD auto-computed)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>macd, signal</strong> — optional pre-computed columns</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Price chart with MACD / Signal lines overlaid</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Histogram panel + crossover event markers</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Signal log + momentum regime interpretation</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Waves className="mr-2 h-5 w-5" />
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

export default function MacdChartPage({
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
  const [macdCol,   setMacdCol]   = useState('');   // optional pre-computed
  const [signalCol, setSignalCol] = useState('');   // optional pre-computed

  // ── MACD parameters ────────────────────────────────────────
  const [fastPeriod,   setFastPeriod]   = useState(DEFAULT_FAST);
  const [slowPeriod,   setSlowPeriod]   = useState(DEFAULT_SLOW);
  const [signalPeriod, setSignalPeriod] = useState(DEFAULT_SIGNAL);

  // ── Options ────────────────────────────────────────────────
  const [showPrice,   setShowPrice]   = useState(true);
  const [showVolume,  setShowVolume]  = useState(true);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_macd.csv');
    setFastPeriod(DEFAULT_FAST);
    setSlowPeriod(DEFAULT_SLOW);
    setSignalPeriod(DEFAULT_SIGNAL);
    setMacdCol(''); setSignalCol('');
    setShowPrice(true); setShowVolume(true);
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setPriceCol(''); setVolumeCol('');
    setMacdCol(''); setSignalCol('');
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
    detect(['macd'],                           setMacdCol,   macdCol);
    detect(['signal', 'signal_line', 'macd_signal'], setSignalCol, signalCol);
  }, [hasData, allHeaders]);

  // ── Build MACD rows ────────────────────────────────────────
  const macdRows = useMemo(() => {
    if (!dateCol || !priceCol) return [];
    return buildMACDRows(
      data, dateCol, priceCol, volumeCol,
      macdCol, signalCol,
      fastPeriod, slowPeriod, signalPeriod,
    );
  }, [data, dateCol, priceCol, volumeCol, macdCol, signalCol, fastPeriod, slowPeriod, signalPeriod]);

  // ── Sample for chart performance ───────────────────────────
  const sampledRows = useMemo(() => {
    if (macdRows.length <= 600) return macdRows;
    const step = Math.ceil(macdRows.length / 600);
    return macdRows.filter((_, i) => i % step === 0);
  }, [macdRows]);

  // ── Crossovers ─────────────────────────────────────────────
  const crossovers = useMemo(() => detectCrossovers(macdRows), [macdRows]);

  // ── Current signal ─────────────────────────────────────────
  const currentSignal = useMemo(
    () => detectSignal(macdRows, crossovers),
    [macdRows, crossovers]
  );

  // ── Price stats ────────────────────────────────────────────
  const priceStats = useMemo(() => {
    if (!macdRows.length) return null;
    const last  = macdRows[macdRows.length - 1];
    const first = macdRows[0];
    return {
      last:     last.price,
      pctChg:   ((last.price - first.price) / first.price) * 100,
      lastDate: last.date,
      macdLast:   last.macdLine,
      signalLast: last.signalLine,
      histLast:   last.histogram,
    };
  }, [macdRows]);

  // ── Crossover stats ────────────────────────────────────────
  const crossStats = useMemo(() => {
    const bull = crossovers.filter(c => c.type === 'Bullish Crossover');
    const bear = crossovers.filter(c => c.type === 'Bearish Crossover');
    return { bullCount: bull.length, bearCount: bear.length };
  }, [crossovers]);

  // ── Using precomputed? ─────────────────────────────────────
  const usingPrecomputed = !!(macdCol && signalCol);

  const isConfigured    = !!(dateCol && priceCol && macdRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Histogram bar data (stable array for Cell index) ──────
  const histBarData = useMemo(() => {
    const filtered = sampledRows.filter(r => r.histogram !== null);
    if (filtered.length <= 300) return filtered;
    const step = Math.ceil(filtered.length / 300);
    return filtered.filter((_, i) => i % step === 0);
  }, [sampledRows]);

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!macdRows.length) return;
    const rows = macdRows.map(r => ({
      date:        r.date,
      price:       r.price,
      macd_line:   r.macdLine   ?? '',
      signal_line: r.signalLine ?? '',
      histogram:   r.histogram  ?? '',
      volume:      r.volume     ?? '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `MACD_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [macdRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `MACD_${new Date().toISOString().split('T')[0]}.png`;
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
            <Waves className="h-5 w-5" />
            MACD Chart
          </CardTitle>
          <CardDescription>
            MACD line, signal line, and histogram — auto-calculated from closing prices, or mapped from pre-computed columns.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Map columns. MACD is auto-calculated from price if MACD / Signal columns are not provided.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Required columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'DATE *',  value: dateCol,   setter: setDateCol,   headers: allHeaders,     opt: false },
              { label: 'PRICE *', value: priceCol,  setter: setPriceCol,  headers: numericHeaders, opt: false },
              { label: 'VOLUME',  value: volumeCol, setter: setVolumeCol, headers: numericHeaders, opt: true  },
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

          {/* Optional pre-computed columns */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              PRE-COMPUTED COLUMNS <span className="font-normal text-muted-foreground">(optional — overrides auto-calculation)</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'MACD LINE',   value: macdCol,   setter: setMacdCol   },
                { label: 'SIGNAL LINE', value: signalCol, setter: setSignalCol },
              ].map(({ label, value, setter }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                  <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="— Auto-calculate —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Auto-calculate —</SelectItem>
                      {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* MACD parameters (only when auto-calculating) */}
          {!usingPrecomputed && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">MACD PARAMETERS</Label>
              <div className="flex flex-wrap gap-4 items-end">
                {[
                  { label: 'Fast EMA',   value: fastPeriod,   setter: (v: number) => setFastPeriod(v)   },
                  { label: 'Slow EMA',   value: slowPeriod,   setter: (v: number) => setSlowPeriod(v)   },
                  { label: 'Signal EMA', value: signalPeriod, setter: (v: number) => setSignalPeriod(v) },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <input
                      type="number" value={value} min={2} max={500}
                      onChange={e => {
                        const n = parseInt(e.target.value);
                        if (isFinite(n) && n >= 2) setter(n);
                      }}
                      className="w-20 h-8 text-xs border border-slate-200 rounded px-2 font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pb-1.5">
                  MACD({fastPeriod},{slowPeriod},{signalPeriod})
                </div>
              </div>
            </div>
          )}

          {/* Display options */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Show Price Chart</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showVolume} onChange={e => setShowVolume(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Show Volume</span>
            </label>
            {usingPrecomputed && (
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Using pre-computed MACD columns
              </span>
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
              <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV (MACD Data)</DropdownMenuItem>
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Signal</div>
            <div className="flex items-center gap-2 mt-1">
              {(currentSignal === 'Bullish Crossover' || currentSignal === 'Bullish Momentum')
                ? <TrendingUp  className="h-5 w-5 text-emerald-500 shrink-0" />
                : (currentSignal === 'Bearish Crossover' || currentSignal === 'Bearish Momentum')
                ? <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />
                : <Activity className="h-5 w-5 text-slate-400 shrink-0" />}
              <span className={`text-sm font-bold leading-tight
                ${currentSignal.startsWith('Bullish') ? 'text-emerald-600'
                : currentSignal.startsWith('Bearish') ? 'text-red-500'
                : 'text-slate-500'}`}>
                {currentSignal}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">MACD Line</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {priceStats.macdLast !== null
                ? `${priceStats.macdLast >= 0 ? '+' : ''}${priceStats.macdLast.toFixed(3)}`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Latest value</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histogram</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {priceStats.histLast !== null
                ? `${priceStats.histLast >= 0 ? '+' : ''}${priceStats.histLast.toFixed(3)}`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {(priceStats.histLast ?? 0) >= 0 ? 'Bullish momentum' : 'Bearish momentum'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Crossovers</div>
            <div className="flex items-center gap-3 mt-1">
              <div>
                <div className="text-lg font-bold font-mono text-emerald-600">{crossStats.bullCount}</div>
                <div className="text-xs text-muted-foreground">Bullish</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-lg font-bold font-mono text-red-500">{crossStats.bearCount}</div>
                <div className="text-xs text-muted-foreground">Bearish</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Price chart (optional) ── */}
        {isConfigured && showPrice && sampledRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price Chart</CardTitle>
              <CardDescription>
                {priceStats
                  ? `${macdRows[0]?.date} — ${priceStats.lastDate} · Latest: ${priceStats.last.toFixed(2)} (${priceStats.pctChg >= 0 ? '+' : ''}${priceStats.pctChg.toFixed(2)}%)`
                  : 'Price over time'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={sampledRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(sampledRows.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis yAxisId="price" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(0)} />
                  {showVolume && volumeCol && (
                    <YAxis yAxisId="vol" orientation="right" hide domain={[0, (dataMax: number) => dataMax * 4]} />
                  )}
                  <Tooltip content={<PriceTooltip />} />
                  {showVolume && volumeCol && (
                    <Bar yAxisId="vol" dataKey="volume" name="Volume"
                      fill={VOLUME_COLOR} fillOpacity={0.35} maxBarSize={4} />
                  )}
                  <Line yAxisId="price" dataKey="price" name="Price" stroke={PRICE_COLOR}
                    strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── MACD + Signal lines chart ── */}
        {isConfigured && sampledRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">MACD Line & Signal Line</CardTitle>
              <CardDescription>
                {usingPrecomputed
                  ? 'Using pre-computed MACD and Signal columns'
                  : `Auto-calculated — MACD(${fastPeriod},${slowPeriod},${signalPeriod})`}
                {' '}· Violet = MACD · Amber = Signal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={sampledRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(sampledRows.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(2)} />
                  <Tooltip content={<MACDTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 3" strokeWidth={1} />
                  <Line dataKey="macdLine"   name="MACD"   stroke={MACD_COLOR}   strokeWidth={1.5} dot={false} connectNulls />
                  <Line dataKey="signalLine" name="Signal" stroke={SIGNAL_COLOR} strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Histogram chart ── */}
        {isConfigured && histBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">MACD Histogram</CardTitle>
              <CardDescription>
                MACD minus Signal — positive (green) = bullish expansion · negative (red) = bearish expansion · shrinking bars signal fading momentum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={histBarData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(histBarData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(2)} />
                  <Tooltip content={<MACDTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 3" strokeWidth={1.5} />
                  <Bar dataKey="histogram" name="Histogram" maxBarSize={6} radius={[1, 1, 0, 0]}>
                    {histBarData.map((row, i) => (
                      <Cell key={i}
                        fill={(row.histogram ?? 0) >= 0 ? HIST_POS : HIST_NEG}
                        fillOpacity={0.8} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Crossover event log ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Crossover Event Log
              </CardTitle>
              <CardDescription>
                {crossovers.length} total MACD–Signal crossover events detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {crossovers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Waves className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No crossover events detected</p>
                  <p className="text-xs mt-1">Try uploading more data or adjusting MACD parameters</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Date', 'Signal', 'Price', 'MACD', 'Signal Line', 'Histogram'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...crossovers].reverse().map((ev, i) => (
                        <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600 whitespace-nowrap">{ev.date}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: ev.type === 'Bullish Crossover' ? HIST_POS : HIST_NEG }} />
                              <span className={`text-xs font-bold ${ev.type === 'Bullish Crossover' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {ev.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{ev.price.toFixed(2)}</td>
                          <td className={`px-3 py-2 font-mono text-xs font-semibold ${ev.macdVal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {ev.macdVal >= 0 ? '+' : ''}{ev.macdVal.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{ev.signalVal.toFixed(3)}</td>
                          <td className={`px-3 py-2 font-mono text-xs font-semibold ${(ev.macdVal - ev.signalVal) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {(ev.macdVal - ev.signalVal) >= 0 ? '+' : ''}{(ev.macdVal - ev.signalVal).toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && priceStats && (() => {
          const last       = macdRows[macdRows.length - 1];
          const histLast   = last.histogram  ?? 0;
          const macdLast   = last.macdLine   ?? 0;
          const signalLast = last.signalLine ?? 0;

          // Recent histogram trend: last 5 bars expanding or contracting?
          const recentHist = macdRows.slice(-5).map(r => r.histogram).filter((v): v is number => v !== null);
          const histExpanding = recentHist.length >= 2
            ? Math.abs(recentHist[recentHist.length - 1]) > Math.abs(recentHist[0])
            : null;

          // Zero-line cross: MACD above or below 0?
          const macdAboveZero = macdLast > 0;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated MACD analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">MACD Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{data.length.toLocaleString()}</span> trading days
                    {!usingPrecomputed && <> using <span className="font-semibold">MACD({fastPeriod},{slowPeriod},{signalPeriod})</span></>}.
                    Detected <span className="font-semibold text-emerald-600">{crossStats.bullCount} Bullish</span> and{' '}
                    <span className="font-semibold text-red-500">{crossStats.bearCount} Bearish</span> crossovers.
                    Current signal: <span className="font-semibold">{currentSignal}</span>.
                    MACD is <span className="font-semibold">{macdAboveZero ? 'above' : 'below'}</span> the zero line.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'MACD Line',    value: `${macdLast   >= 0 ? '+' : ''}${macdLast.toFixed(3)}`,    sub: macdAboveZero ? 'Above zero' : 'Below zero' },
                    { label: 'Signal Line',  value: `${signalLast >= 0 ? '+' : ''}${signalLast.toFixed(3)}`,  sub: 'Latest value' },
                    { label: 'Histogram',    value: `${histLast   >= 0 ? '+' : ''}${histLast.toFixed(3)}`,    sub: histExpanding === null ? '—' : histExpanding ? 'Expanding' : 'Contracting' },
                    { label: 'Total Crosses',value: crossovers.length,                                         sub: `${crossStats.bullCount} bull · ${crossStats.bearCount} bear` },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-lg font-bold font-mono text-slate-700">{value}</div>
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Current Signal — {currentSignal}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentSignal === 'Bullish Crossover' &&
                          'MACD has just crossed above the Signal line — a fresh bullish trigger. This is the primary buy signal in MACD analysis. Confirm with price breaking above a key resistance level and increasing volume.'}
                        {currentSignal === 'Bearish Crossover' &&
                          'MACD has just crossed below the Signal line — a fresh bearish trigger. This is the primary sell signal. Confirm with price failing to hold key support and declining volume on rallies.'}
                        {currentSignal === 'Bullish Momentum' &&
                          'MACD is above the Signal line — bullish momentum is intact. No crossover has occurred recently, suggesting a sustained uptrend phase. Monitor histogram bars: if they start shrinking, momentum may be fading ahead of a crossover.'}
                        {currentSignal === 'Bearish Momentum' &&
                          'MACD is below the Signal line — bearish momentum is intact. No crossover has occurred recently, suggesting a sustained downtrend. Watch for histogram bars to shrink as an early warning of a potential bullish reversal.'}
                        {currentSignal === 'Neutral' &&
                          'MACD and Signal line are nearly equal — no directional momentum. This typically occurs during consolidation. Wait for a clear crossover with widening histogram bars before acting.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Zero-Line Position</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        MACD is currently <span className="font-semibold">{macdAboveZero ? 'above' : 'below'}</span> the zero line
                        at <span className="font-mono font-semibold">{macdLast >= 0 ? '+' : ''}{macdLast.toFixed(3)}</span>.{' '}
                        {macdAboveZero
                          ? 'A MACD above zero means the short-term EMA is above the long-term EMA — confirming an underlying uptrend. Bullish signals generated in this zone carry higher conviction.'
                          : 'A MACD below zero means the short-term EMA is below the long-term EMA — confirming an underlying downtrend. Bullish crossovers below zero are lower-conviction signals; wait for MACD to cross zero itself for confirmation of a true trend reversal.'}
                      </p>
                    </div>
                  </div>

                  {histExpanding !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Histogram Momentum — {histExpanding ? 'Expanding' : 'Contracting'}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {histExpanding
                            ? `Histogram bars are expanding over the last 5 periods — momentum is ${histLast >= 0 ? 'building to the upside' : 'accelerating to the downside'}. This confirms the current trend has near-term strength.`
                            : `Histogram bars are contracting over the last 5 periods — momentum is fading. Even if the current ${histLast >= 0 ? 'bullish' : 'bearish'} bias is intact, the rate of change is slowing. A potential crossover may be imminent.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {!usingPrecomputed && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Parameter Configuration — MACD({fastPeriod},{slowPeriod},{signalPeriod})</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {fastPeriod === 12 && slowPeriod === 26 && signalPeriod === 9
                            ? 'Using the standard MACD(12,26,9) — the most widely used configuration for daily charts. This is the default across most trading platforms and academic research.'
                            : fastPeriod < 12
                            ? `Faster settings (${fastPeriod}/${slowPeriod}) make the indicator more responsive but increase noise. More crossovers will be detected, including false signals in choppy markets. Suitable for shorter holding periods.`
                            : `Slower settings (${fastPeriod}/${slowPeriod}) reduce noise and produce fewer, higher-conviction signals. Better suited for longer-term position trading or weekly chart analysis.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ MACD = EMA({fastPeriod}) − EMA({slowPeriod}). Signal = EMA({signalPeriod}) of MACD.
                  Histogram = MACD − Signal. EMA uses a multiplier of 2/(period+1).
                  {usingPrecomputed
                    ? ' Values sourced from pre-computed columns in uploaded data.'
                    : ' All values auto-calculated from the price column.'}
                  {' '}MACD is a lagging indicator — it confirms trends but does not predict them.
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
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
  Activity,
  Zap,
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
// Types
// ============================================

type CrossType = 'Golden Cross' | 'Death Cross';

interface CrossEvent {
  date:        string;
  type:        CrossType;
  price:       number;
  fastVal:     number;
  slowVal:     number;
  // outcome fields (filled in post-processing)
  ret5d:       number | null;
  ret10d:      number | null;
  ret20d:      number | null;
  ret60d:      number | null;
}

interface ChartRow {
  date:        string;
  price:       number;
  fastEMA:     number | null;
  slowEMA:     number | null;
  spread:      number | null;  // fastEMA − slowEMA
  volume?:     number;
}

// ============================================
// Constants
// ============================================

const EMA_PAIRS = [
  { fast: 9,  slow: 21,  label: 'EMA 9 / 21'   },
  { fast: 12, slow: 26,  label: 'EMA 12 / 26'  },
  { fast: 20, slow: 50,  label: 'EMA 20 / 50'  },
  { fast: 50, slow: 200, label: 'EMA 50 / 200' },
] as const;

const FAST_COLOR    = '#6C3AED';  // violet
const SLOW_COLOR    = '#F59E0B';  // amber
const PRICE_COLOR   = '#1E293B';
const GOLDEN_COLOR  = '#10B981';  // green
const DEATH_COLOR   = '#EF4444';  // red
const SPREAD_POS    = '#10B981';
const SPREAD_NEG    = '#EF4444';
const VOLUME_COLOR  = '#CBD5E1';

// ============================================
// Computation helpers
// ============================================

function calcEMA(prices: number[], period: number): (number | null)[] {
  if (prices.length < period) return new Array(prices.length).fill(null);
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(period - 1).fill(null);
  const seed = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(seed);
  for (let i = period; i < prices.length; i++) {
    result.push(prices[i] * k + result[result.length - 1]! * (1 - k));
  }
  return result;
}

function buildChartRows(
  data:      Record<string, any>[],
  dateCol:   string,
  priceCol:  string,
  volumeCol: string,
  fast:      number,
  slow:      number,
): ChartRow[] {
  const rows = data
    .map(r => ({
      date:   String(r[dateCol]  ?? ''),
      price:  parseFloat(r[priceCol]),
      volume: volumeCol ? (parseFloat(r[volumeCol]) || undefined) : undefined,
    }))
    .filter(r => r.date && isFinite(r.price));

  if (!rows.length) return [];

  const prices   = rows.map(r => r.price);
  const fastVals = calcEMA(prices, fast);
  const slowVals = calcEMA(prices, slow);

  return rows.map((r, i) => {
    const fv = fastVals[i];
    const sv = slowVals[i];
    return {
      date:    r.date,
      price:   r.price,
      fastEMA: fv !== null ? parseFloat(fv.toFixed(4)) : null,
      slowEMA: sv !== null ? parseFloat(sv.toFixed(4)) : null,
      spread:  fv !== null && sv !== null ? parseFloat((fv - sv).toFixed(4)) : null,
      volume:  r.volume,
    };
  });
}

function detectCrosses(rows: ChartRow[], fast: number, slow: number): CrossEvent[] {
  const crosses: CrossEvent[] = [];

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];
    if (
      prev.fastEMA === null || prev.slowEMA === null ||
      curr.fastEMA === null || curr.slowEMA === null
    ) continue;

    const wasBelow = prev.fastEMA <= prev.slowEMA;
    const isAbove  = curr.fastEMA >  curr.slowEMA;
    const wasAbove = prev.fastEMA >= prev.slowEMA;
    const isBelow  = curr.fastEMA <  curr.slowEMA;

    if (wasBelow && isAbove) {
      crosses.push({ date: curr.date, type: 'Golden Cross', price: curr.price, fastVal: curr.fastEMA, slowVal: curr.slowEMA, ret5d: null, ret10d: null, ret20d: null, ret60d: null });
    } else if (wasAbove && isBelow) {
      crosses.push({ date: curr.date, type: 'Death Cross',  price: curr.price, fastVal: curr.fastEMA, slowVal: curr.slowEMA, ret5d: null, ret10d: null, ret20d: null, ret60d: null });
    }
  }

  // Fill forward returns
  const idx = (date: string) => rows.findIndex(r => r.date === date);

  for (const ev of crosses) {
    const i = idx(ev.date);
    if (i === -1) continue;
    const ret = (d: number) => {
      const j = i + d;
      if (j >= rows.length) return null;
      return parseFloat(((rows[j].price - ev.price) / ev.price * 100).toFixed(2));
    };
    ev.ret5d  = ret(5);
    ev.ret10d = ret(10);
    ev.ret20d = ret(20);
    ev.ret60d = ret(60);
  }

  return crosses;
}

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2021-01-04');
  let price  = 200;
  let volume = 60_000_000;

  const phases = [
    { days: 60,  drift:  0.0012, vol: 0.013 },
    { days: 45,  drift: -0.0022, vol: 0.020 },
    { days: 90,  drift:  0.0018, vol: 0.012 },
    { days: 55,  drift: -0.0028, vol: 0.025 },
    { days: 80,  drift:  0.0010, vol: 0.014 },
    { days: 40,  drift: -0.0015, vol: 0.018 },
    { days: 110, drift:  0.0022, vol: 0.011 },
    { days: 50,  drift:  0.0005, vol: 0.009 },
    { days: 70,  drift:  0.0016, vol: 0.013 },
  ];

  let day = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) { day++; i--; continue; }
      const ret = phase.drift + (Math.random() - 0.5) * phase.vol;
      price  = Math.max(50, price * (1 + ret));
      volume = Math.max(5_000_000, volume * (0.88 + Math.random() * 0.24));
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

const LineTooltip = ({ active, payload, label }: any) => {
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

const SpreadTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = (payload[0]?.value as number) ?? 0;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Fast − Slow</span>
        <span className={`font-mono font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {v >= 0 ? '+' : ''}{v?.toFixed(2)}
        </span>
      </div>
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
            <Zap className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">EMA Golden / Death Cross</CardTitle>
        <CardDescription className="text-base mt-2">
          Capture EMA crossover signals to analyze trade entry and exit timing — track every Golden Cross and Death Cross with forward-return outcomes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Zap       className="w-6 h-6 text-primary mb-2" />, title: 'Cross Detection',    desc: 'Automatically identifies every Golden Cross (fast EMA crosses above slow) and Death Cross (fast crosses below slow) event in your price history.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Forward Returns',    desc: 'For each cross event, calculate actual forward returns at 5, 10, 20, and 60 days — quantify whether the signal delivered real performance.' },
            { icon: <Layers    className="w-6 h-6 text-primary mb-2" />, title: 'EMA Pair Selector',  desc: 'Choose from four preset EMA pairs (9/21, 12/26, 20/50, 50/200) or customize fast and slow periods — adapts to any timeframe strategy.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Cross type legend */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              color: GOLDEN_COLOR,
              label: 'Golden Cross',
              subtitle: 'Fast EMA crosses above Slow EMA',
              desc:  'Signals momentum shifting bullish — short-term trend is gaining strength relative to the longer-term trend. Traditionally used as a buy signal.',
            },
            {
              color: DEATH_COLOR,
              label: 'Death Cross',
              subtitle: 'Fast EMA crosses below Slow EMA',
              desc:  'Signals momentum shifting bearish — short-term trend is weakening relative to the longer-term trend. Traditionally used as a sell or short signal.',
            },
          ].map(({ color, label, subtitle, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <div className="text-sm font-bold text-slate-700">{label}</div>
              </div>
              <div className="text-xs text-muted-foreground font-semibold mb-1">{subtitle}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use EMA crossovers as a systematic trend-following signal. Unlike SMA crosses, EMA crossovers
            react faster to price changes — reducing lag at the cost of slightly more noise. Combining
            forward-return analysis with historical cross events helps validate whether the chosen EMA pair
            has been historically effective on this specific instrument.
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
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Price chart with fast/slow EMA lines + cross markers</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>EMA spread bar chart (momentum signal)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Cross event log with 5 / 10 / 20 / 60-day forward returns</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Zap className="mr-2 h-5 w-5" />
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

export default function EmaCrossSignalPage({
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

  // ── EMA pair ───────────────────────────────────────────────
  const [pairIdx,    setPairIdx]    = useState(1);          // default: 12/26
  const [customFast, setCustomFast] = useState('');
  const [customSlow, setCustomSlow] = useState('');
  const [useCustom,  setUseCustom]  = useState(false);

  // ── Options ────────────────────────────────────────────────
  const [showVolume, setShowVolume] = useState(true);
  const [crossFilter, setCrossFilter] = useState<'all' | 'Golden Cross' | 'Death Cross'>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Resolved EMA periods ───────────────────────────────────
  const { fast, slow, pairLabel } = useMemo(() => {
    if (useCustom) {
      const f = parseInt(customFast) || 12;
      const s = parseInt(customSlow) || 26;
      return { fast: Math.min(f, s), slow: Math.max(f, s), pairLabel: `EMA ${Math.min(f,s)} / ${Math.max(f,s)}` };
    }
    const p = EMA_PAIRS[pairIdx] ?? EMA_PAIRS[1];
    return { fast: p.fast, slow: p.slow, pairLabel: p.label };
  }, [useCustom, customFast, customSlow, pairIdx]);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_ema_cross.csv');
    setPairIdx(1); setUseCustom(false);
    setShowVolume(true); setCrossFilter('all');
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
    detect(['date'],                        setDateCol,   dateCol);
    detect(['close', 'price', 'adj_close'], setPriceCol,  priceCol);
    detect(['volume', 'vol'],               setVolumeCol, volumeCol);
  }, [hasData, allHeaders]);

  // ── Build chart rows ───────────────────────────────────────
  const chartRows = useMemo(() => {
    if (!dateCol || !priceCol) return [];
    return buildChartRows(data, dateCol, priceCol, volumeCol, fast, slow);
  }, [data, dateCol, priceCol, volumeCol, fast, slow]);

  // ── Sample for chart perf ──────────────────────────────────
  const sampledRows = useMemo(() => {
    if (chartRows.length <= 600) return chartRows;
    const step = Math.ceil(chartRows.length / 600);
    return chartRows.filter((_, i) => i % step === 0);
  }, [chartRows]);

  // ── Spread bar data ────────────────────────────────────────
  const spreadBarData = useMemo(() => {
    const data = sampledRows.filter(r => r.spread !== null);
    const step  = Math.max(1, Math.floor(data.length / 200));
    return data.filter((_, i) => i % step === 0);
  }, [sampledRows]);

  // ── Cross events ───────────────────────────────────────────
  const crosses = useMemo(() => detectCrosses(chartRows, fast, slow), [chartRows, fast, slow]);

  const filteredCrosses = useMemo(() => {
    const base = crossFilter === 'all' ? crosses : crosses.filter(c => c.type === crossFilter);
    return [...base].sort((a, b) =>
      sortDir === 'desc'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );
  }, [crosses, crossFilter, sortDir]);

  // ── Stats ──────────────────────────────────────────────────
  const priceStats = useMemo(() => {
    if (!chartRows.length) return null;
    const prices = chartRows.map(r => r.price);
    const last   = chartRows[chartRows.length - 1];
    const first  = chartRows[0];
    return {
      last:     last.price,
      pctChg:   ((last.price - first.price) / first.price) * 100,
      hi:       Math.max(...prices),
      lo:       Math.min(...prices),
      lastDate: last.date,
    };
  }, [chartRows]);

  const crossStats = useMemo(() => {
    const golden = crosses.filter(c => c.type === 'Golden Cross');
    const death  = crosses.filter(c => c.type === 'Death Cross');
    const avgRet = (evts: CrossEvent[], key: keyof CrossEvent) => {
      const vals = evts.map(e => e[key] as number | null).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      goldenCount: golden.length,
      deathCount:  death.length,
      goldenAvg20: avgRet(golden, 'ret20d'),
      deathAvg20:  avgRet(death,  'ret20d'),
      goldenWinRate: golden.filter(e => (e.ret20d ?? 0) > 0).length / (golden.length || 1) * 100,
      deathWinRate:  death.filter(e => (e.ret20d ?? 0) < 0).length / (death.length  || 1) * 100,
    };
  }, [crosses]);

  // ── Current state ──────────────────────────────────────────
  const currentState = useMemo(() => {
    if (!chartRows.length) return null;
    const last = chartRows[chartRows.length - 1];
    if (last.fastEMA === null || last.slowEMA === null) return null;
    return {
      fastAbove: last.fastEMA > last.slowEMA,
      spread:    last.fastEMA - last.slowEMA,
      lastCross: crosses[crosses.length - 1] ?? null,
    };
  }, [chartRows, crosses]);

  const isConfigured    = !!(dateCol && priceCol && chartRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!crosses.length) return;
    const rows = crosses.map(c => ({
      date:        c.date,
      type:        c.type,
      price:       c.price,
      fast_ema:    c.fastVal,
      slow_ema:    c.slowVal,
      ret_5d_pct:  c.ret5d  ?? '',
      ret_10d_pct: c.ret10d ?? '',
      ret_20d_pct: c.ret20d ?? '',
      ret_60d_pct: c.ret60d ?? '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `EMACross_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [crosses, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `EMACross_${new Date().toISOString().split('T')[0]}.png`;
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
            <Zap className="h-5 w-5" />
            EMA Golden / Death Cross
          </CardTitle>
          <CardDescription>
            Capture EMA crossover signals to analyze trade entry and exit timing — every cross is logged with forward-return outcomes.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map columns and select the EMA pair to analyze.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Column mapping */}
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

          {/* EMA pair selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">EMA PAIR</Label>
            <div className="flex flex-wrap gap-2">
              {EMA_PAIRS.map((p, i) => (
                <button key={p.label}
                  onClick={() => { setPairIdx(i); setUseCustom(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${!useCustom && pairIdx === i
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                  ${useCustom
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                Custom
              </button>
            </div>

            {useCustom && (
              <div className="flex items-center gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fast period</Label>
                  <input type="number" value={customFast} min={2} max={500}
                    onChange={e => setCustomFast(e.target.value)}
                    className="w-20 h-8 text-xs border border-slate-200 rounded px-2 font-mono"
                    placeholder="12" />
                </div>
                <span className="text-muted-foreground text-sm mt-4">/</span>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Slow period</Label>
                  <input type="number" value={customSlow} min={2} max={500}
                    onChange={e => setCustomSlow(e.target.value)}
                    className="w-20 h-8 text-xs border border-slate-200 rounded px-2 font-mono"
                    placeholder="26" />
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showVolume} onChange={e => setShowVolume(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Show Volume</span>
            </label>
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
              <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Cross Events)</DropdownMenuItem>
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current State</div>
            <div className="flex items-center gap-2 mt-1">
              {currentState?.fastAbove
                ? <TrendingUp  className="h-5 w-5 text-emerald-500 shrink-0" />
                : <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />}
              <span className="text-sm font-bold leading-tight text-slate-700">
                {currentState?.fastAbove ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Fast {currentState?.fastAbove ? 'above' : 'below'} Slow
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Golden Crosses</div>
            <div className="text-2xl font-bold text-emerald-600 font-mono">{crossStats.goldenCount}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {crossStats.goldenCount > 0
                ? `Avg 20d: ${crossStats.goldenAvg20 !== null ? `${crossStats.goldenAvg20 >= 0 ? '+' : ''}${crossStats.goldenAvg20.toFixed(1)}%` : '—'}`
                : 'No events detected'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Death Crosses</div>
            <div className="text-2xl font-bold text-red-500 font-mono">{crossStats.deathCount}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {crossStats.deathCount > 0
                ? `Avg 20d: ${crossStats.deathAvg20 !== null ? `${crossStats.deathAvg20 >= 0 ? '+' : ''}${crossStats.deathAvg20.toFixed(1)}%` : '—'}`
                : 'No events detected'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">EMA Spread</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {currentState?.spread !== null && currentState?.spread !== undefined
                ? `${currentState.spread >= 0 ? '+' : ''}${currentState.spread.toFixed(2)}`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{pairLabel}</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Price + EMA chart ── */}
        {isConfigured && sampledRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price & EMA Overlay — {pairLabel}</CardTitle>
              <CardDescription>
                Violet = Fast EMA ({fast}) · Amber = Slow EMA ({slow}) · Dashed = EMA (exponential weighting)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
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
                  <Tooltip content={<LineTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                  {showVolume && volumeCol && (
                    <Bar yAxisId="vol" dataKey="volume" name="Volume"
                      fill={VOLUME_COLOR} fillOpacity={0.35} maxBarSize={4} />
                  )}
                  <Line yAxisId="price" dataKey="price"   name="Price"                stroke={PRICE_COLOR}  strokeWidth={2}   dot={false} connectNulls />
                  <Line yAxisId="price" dataKey="fastEMA" name={`EMA ${fast} (Fast)`} stroke={FAST_COLOR}   strokeWidth={1.5} dot={false} connectNulls strokeDasharray="5 3" />
                  <Line yAxisId="price" dataKey="slowEMA" name={`EMA ${slow} (Slow)`} stroke={SLOW_COLOR}   strokeWidth={1.5} dot={false} connectNulls strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── EMA Spread chart ── */}
        {isConfigured && spreadBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">EMA Spread — Fast ({fast}) minus Slow ({slow})</CardTitle>
              <CardDescription>
                Positive (green) = Fast above Slow — bullish · Negative (red) = Fast below Slow — bearish
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={spreadBarData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(spreadBarData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    width={48} tickFormatter={v => v.toFixed(1)} />
                  <Tooltip content={<SpreadTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="5 3" strokeWidth={1.5} />
                  <Bar dataKey="spread" name="EMA Spread" maxBarSize={5} radius={[1, 1, 0, 0]}>
                    {spreadBarData.map((entry, i) => (
                      <Cell key={i}
                        fill={(entry.spread ?? 0) >= 0 ? SPREAD_POS : SPREAD_NEG}
                        fillOpacity={0.75} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Cross event log ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    Cross Event Log
                  </CardTitle>
                  <CardDescription>
                    {crosses.length} total events — click headers to sort
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter tabs */}
                  {(['all', 'Golden Cross', 'Death Cross'] as const).map(f => (
                    <button key={f} onClick={() => setCrossFilter(f)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all
                        ${crossFilter === f
                          ? f === 'Golden Cross' ? 'bg-emerald-500 text-white border-emerald-500'
                          : f === 'Death Cross'  ? 'bg-red-500 text-white border-red-500'
                          : 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {f === 'all' ? 'All' : f}
                    </button>
                  ))}
                  {/* Sort toggle */}
                  <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border bg-white text-slate-500 border-slate-200 hover:border-slate-300">
                    <ArrowUpDown className="h-3 w-3" />
                    {sortDir === 'desc' ? 'Newest' : 'Oldest'}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCrosses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No cross events detected for {pairLabel}</p>
                  <p className="text-xs mt-1">Try a different EMA pair or upload more data</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Date', 'Signal', 'Price', `EMA ${fast}`, `EMA ${slow}`, '5D Ret', '10D Ret', '20D Ret', '60D Ret'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCrosses.map((ev, i) => {
                        const retCell = (v: number | null) => {
                          if (v === null) return <td className="px-3 py-2 text-xs text-slate-400 font-mono">—</td>;
                          return (
                            <td className={`px-3 py-2 text-xs font-mono font-semibold
                              ${v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                              {v >= 0 ? '+' : ''}{v.toFixed(2)}%
                            </td>
                          );
                        };
                        return (
                          <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2 font-mono text-xs text-slate-600 whitespace-nowrap">{ev.date}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: ev.type === 'Golden Cross' ? GOLDEN_COLOR : DEATH_COLOR }} />
                                <span className={`text-xs font-bold ${ev.type === 'Golden Cross' ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {ev.type}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{ev.price.toFixed(2)}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{ev.fastVal.toFixed(2)}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{ev.slowVal.toFixed(2)}</td>
                            {retCell(ev.ret5d)}
                            {retCell(ev.ret10d)}
                            {retCell(ev.ret20d)}
                            {retCell(ev.ret60d)}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && priceStats && crosses.length > 0 && (() => {
          const golden = crosses.filter(c => c.type === 'Golden Cross');
          const death  = crosses.filter(c => c.type === 'Death Cross');
          const lastCross = crosses[crosses.length - 1];

          const avgRet20Golden = crossStats.goldenAvg20;
          const avgRet20Death  = crossStats.deathAvg20;

          const bestGolden = golden.length
            ? [...golden].sort((a, b) => (b.ret20d ?? -999) - (a.ret20d ?? -999))[0]
            : null;
          const worstDeath = death.length
            ? [...death].sort((a, b) => (a.ret20d ?? 999) - (b.ret20d ?? 999))[0]
            : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated EMA cross signal analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Signal Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Detected <span className="font-semibold">{crosses.length}</span> cross events using{' '}
                    <span className="font-semibold">{pairLabel}</span> over{' '}
                    <span className="font-semibold">{data.length.toLocaleString()}</span> trading days —{' '}
                    <span className="font-semibold text-emerald-600">{crossStats.goldenCount} Golden</span> and{' '}
                    <span className="font-semibold text-red-500">{crossStats.deathCount} Death</span> crosses.
                    Current state is <span className="font-semibold">{currentState?.fastAbove ? 'Bullish (Fast above Slow)' : 'Bearish (Fast below Slow)'}</span>.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Golden Count',   value: crossStats.goldenCount,  sub: avgRet20Golden !== null ? `Avg 20d: ${avgRet20Golden >= 0 ? '+' : ''}${avgRet20Golden.toFixed(1)}%` : '—' },
                    { label: 'Golden Win Rate', value: `${crossStats.goldenWinRate.toFixed(0)}%`, sub: 'positive 20d return' },
                    { label: 'Death Count',    value: crossStats.deathCount,   sub: avgRet20Death !== null ? `Avg 20d: ${avgRet20Death >= 0 ? '+' : ''}${avgRet20Death.toFixed(1)}%` : '—' },
                    { label: 'Death Win Rate', value: `${crossStats.deathWinRate.toFixed(0)}%`,  sub: 'negative 20d return' },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Most Recent Signal — {lastCross.type}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The last cross occurred on <span className="font-semibold">{lastCross.date}</span> at a
                        price of <span className="font-mono font-semibold">{lastCross.price.toFixed(2)}</span>.{' '}
                        {lastCross.type === 'Golden Cross'
                          ? `EMA ${fast} crossed above EMA ${slow} — a bullish signal. `
                          : `EMA ${fast} crossed below EMA ${slow} — a bearish signal. `}
                        {lastCross.ret20d !== null
                          ? `The 20-day forward return from this event was ${lastCross.ret20d >= 0 ? '+' : ''}${lastCross.ret20d.toFixed(2)}%.`
                          : 'Insufficient data to compute forward return from this event.'}
                      </p>
                    </div>
                  </div>

                  {golden.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Golden Cross Performance</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Across {crossStats.goldenCount} Golden Cross events, the average 20-day forward return was{' '}
                          <span className={`font-mono font-semibold ${(avgRet20Golden ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {avgRet20Golden !== null ? `${avgRet20Golden >= 0 ? '+' : ''}${avgRet20Golden.toFixed(2)}%` : '—'}
                          </span>.{' '}
                          The win rate (positive 20d return) was <span className="font-semibold">{crossStats.goldenWinRate.toFixed(0)}%</span>.
                          {bestGolden?.ret20d !== undefined && bestGolden?.ret20d !== null && (
                            <> Best outcome: <span className="font-semibold">{bestGolden.date}</span> with a +{bestGolden.ret20d.toFixed(2)}% 20-day gain.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {death.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Death Cross Performance</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Across {crossStats.deathCount} Death Cross events, the average 20-day forward return was{' '}
                          <span className={`font-mono font-semibold ${(avgRet20Death ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {avgRet20Death !== null ? `${avgRet20Death >= 0 ? '+' : ''}${avgRet20Death.toFixed(2)}%` : '—'}
                          </span>.{' '}
                          The signal accuracy (negative 20d return after Death Cross) was{' '}
                          <span className="font-semibold">{crossStats.deathWinRate.toFixed(0)}%</span>.
                          {worstDeath?.ret20d !== undefined && worstDeath?.ret20d !== null && (
                            <> Worst outcome: <span className="font-semibold">{worstDeath.date}</span> with a {worstDeath.ret20d.toFixed(2)}% 20-day move.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">EMA Pair Selection Guidance</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Currently analyzing <span className="font-semibold">{pairLabel}</span>.{' '}
                        {fast <= 12
                          ? 'Short-period pairs (9/21, 12/26) are sensitive and generate more signals — suitable for swing trading but prone to false signals in sideways markets.'
                          : fast <= 20
                          ? 'The 20/50 pair balances sensitivity and noise-reduction — widely used for medium-term trend following on daily charts.'
                          : 'The 50/200 pair is the classic long-term filter — signals are rare but historically significant. Best suited for position trading and macro trend identification.'}
                        {' '}Consider backtesting multiple pairs to find the optimal configuration for this specific instrument.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ EMA (Exponential Moving Average) places greater weight on recent prices with a multiplier of
                  2 / (period + 1). Forward returns are calculated from the cross date price and are unadjusted
                  for dividends or splits. Cross detection uses a strict sign-change threshold — no smoothing or
                  confirmation filter is applied. This analysis is auto-generated for reference only and does not
                  constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
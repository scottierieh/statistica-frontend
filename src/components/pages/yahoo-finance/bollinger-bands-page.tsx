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
  Area,
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
  Gauge,
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

type RegimeLabel = 'Overbought' | 'Overbought Warning' | 'Neutral' | 'Oversold Warning' | 'Oversold';

interface IndicatorRow {
  date:        string;
  price:       number;
  upper:       number | null;   // BB upper band
  mid:         number | null;   // BB middle (SMA)
  lower:       number | null;   // BB lower band
  bWidth:      number | null;   // bandwidth = (upper-lower)/mid * 100
  bPct:        number | null;   // %B = (price-lower)/(upper-lower)
  rsi:         number | null;
  volume?:     number;
}

// ============================================
// Constants
// ============================================

const PRICE_COLOR   = '#1E293B';
const BB_MID_COLOR  = '#6C3AED';   // violet  — BB mid / SMA
const BB_BAND_COLOR = '#6C3AED';   // same hue, lighter fill
const RSI_COLOR     = '#F59E0B';   // amber
const OB_COLOR      = '#EF4444';   // red    — overbought zone
const OS_COLOR      = '#10B981';   // green  — oversold zone
const VOLUME_COLOR  = '#CBD5E1';

const DEFAULT_BB_PERIOD  = 20;
const DEFAULT_BB_STD     = 2;
const DEFAULT_RSI_PERIOD = 14;
const RSI_OB             = 70;
const RSI_OS             = 30;

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

function calcBollingerBands(
  prices: number[],
  period: number,
  stdMult: number,
): { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] } {
  const mid = calcSMA(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue; }
    const slice = prices.slice(i - period + 1, i + 1);
    const mean  = mid[i]!;
    const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period;
    const sd   = Math.sqrt(variance);
    upper.push(mean + stdMult * sd);
    lower.push(mean - stdMult * sd);
  }
  return { upper, mid, lower };
}

function calcRSI(prices: number[], period: number): (number | null)[] {
  if (prices.length < period + 1) return new Array(prices.length).fill(null);

  const result: (number | null)[] = new Array(period).fill(null);

  // Initial seed: simple average of first `period` gains/losses
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0  = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0));

  // Wilder smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs));
  }
  return result;
}

function buildIndicatorRows(
  data:         Record<string, any>[],
  dateCol:      string,
  priceCol:     string,
  volumeCol:    string,
  bbPeriod:     number,
  bbStd:        number,
  rsiPeriod:    number,
): IndicatorRow[] {
  const rows = data
    .map(r => ({
      date:   String(r[dateCol] ?? ''),
      price:  parseFloat(r[priceCol]),
      volume: volumeCol ? (parseFloat(r[volumeCol]) || undefined) : undefined,
    }))
    .filter(r => r.date && isFinite(r.price));

  if (!rows.length) return [];

  const prices = rows.map(r => r.price);
  const { upper, mid, lower } = calcBollingerBands(prices, bbPeriod, bbStd);
  const rsiVals = calcRSI(prices, rsiPeriod);

  return rows.map((r, i) => {
    const u = upper[i]; const m = mid[i]; const l = lower[i];
    const bWidth = (u !== null && m !== null && l !== null && m !== 0)
      ? parseFloat(((u - l) / m * 100).toFixed(3)) : null;
    const bPct = (u !== null && l !== null && u !== l)
      ? parseFloat(((r.price - l) / (u - l)).toFixed(4)) : null;
    const rsiRaw = rsiVals[i];
    return {
      date:   r.date,
      price:  r.price,
      upper:  u  !== null ? parseFloat(u.toFixed(4))  : null,
      mid:    m  !== null ? parseFloat(m.toFixed(4))  : null,
      lower:  l  !== null ? parseFloat(l.toFixed(4))  : null,
      bWidth,
      bPct,
      rsi:    rsiRaw !== null ? parseFloat(rsiRaw.toFixed(2)) : null,
      volume: r.volume,
    };
  });
}

function classifyRegime(rsi: number | null): RegimeLabel {
  if (rsi === null) return 'Neutral';
  if (rsi >= RSI_OB)      return 'Overbought';
  if (rsi >= RSI_OB - 10) return 'Overbought Warning';
  if (rsi <= RSI_OS)      return 'Oversold';
  if (rsi <= RSI_OS + 10) return 'Oversold Warning';
  return 'Neutral';
}

const REGIME_CONFIG: Record<RegimeLabel, { color: string; desc: string }> = {
  'Overbought':         { color: '#EF4444', desc: 'RSI ≥ 70 — consider taking profit' },
  'Overbought Warning': { color: '#F97316', desc: 'RSI 60–70 — approaching overbought' },
  'Neutral':            { color: '#94A3B8', desc: 'RSI 30–60 — no extreme signal' },
  'Oversold Warning':   { color: '#3B82F6', desc: 'RSI 30–40 — approaching oversold' },
  'Oversold':           { color: '#10B981', desc: 'RSI ≤ 30 — potential reversal zone' },
};

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2022-01-03');
  let price  = 250;
  let volume = 70_000_000;

  const phases = [
    { days: 50,  drift:  0.0012, vol: 0.013 },
    { days: 40,  drift: -0.0028, vol: 0.022 },
    { days: 70,  drift:  0.0020, vol: 0.012 },
    { days: 35,  drift: -0.0018, vol: 0.019 },
    { days: 90,  drift:  0.0022, vol: 0.011 },
    { days: 40,  drift: -0.0010, vol: 0.015 },
    { days: 75,  drift:  0.0015, vol: 0.010 },
    { days: 60,  drift:  0.0008, vol: 0.009 },
    { days: 40,  drift: -0.0025, vol: 0.021 },
    { days: 60,  drift:  0.0018, vol: 0.012 },
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

const BBTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const relevant = payload.filter((p: any) =>
    p.value !== null && p.value !== undefined && p.dataKey !== 'volume' && p.dataKey !== 'bbArea'
  );
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {relevant.map((p: any) => (
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

const RSITooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const rsiEntry = payload.find((p: any) => p.dataKey === 'rsi');
  if (!rsiEntry || rsiEntry.value === null) return null;
  const v = rsiEntry.value as number;
  const regime = classifyRegime(v);
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      <div className="flex justify-between gap-4 mb-1">
        <span className="text-slate-500">RSI ({DEFAULT_RSI_PERIOD})</span>
        <span className="font-mono font-bold" style={{ color: REGIME_CONFIG[regime].color }}>{v.toFixed(1)}</span>
      </div>
      <div className="text-xs font-semibold" style={{ color: REGIME_CONFIG[regime].color }}>{regime}</div>
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
            <Gauge className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">RSI / Bollinger Bands</CardTitle>
        <CardDescription className="text-base mt-2">
          Combine Bollinger Bands and RSI to identify overbought and oversold conditions — auto-calculated from closing prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Gauge     className="w-6 h-6 text-primary mb-2" />, title: 'RSI Regime Filter',   desc: 'Wilder\'s RSI with configurable period (default 14) — zones at 70/30 mark overbought and oversold. Color-coded regime badge updates in real time.' },
            { icon: <Activity  className="w-6 h-6 text-primary mb-2" />, title: 'Bollinger Bands',     desc: 'SMA(20) ± 2σ bands auto-calculated from price. Band width tracks volatility contraction and expansion — squeezes often precede large moves.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: '%B & Bandwidth',      desc: '%B shows where price sits within the bands (0 = lower, 1 = upper). Bandwidth measures band spread as % of the middle band.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Regime legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(REGIME_CONFIG) as [RegimeLabel, typeof REGIME_CONFIG[RegimeLabel]][]).map(([label, cfg]) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600"
                  style={{ fontSize: '9px' }}>{label}</div>
              </div>
              <div className="text-xs text-muted-foreground">{cfg.desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use RSI and Bollinger Bands together for higher-conviction signals. When RSI hits overbought
            (≥ 70) <em>and</em> price touches the upper BB, the confluence creates a stronger sell signal.
            When RSI is oversold (≤ 30) <em>and</em> price touches the lower BB, the confluence creates
            a stronger buy signal. Band squeezes (low bandwidth) followed by expansions often mark
            the start of new trending moves.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — trading date (YYYY-MM-DD)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>close / price</strong> — daily closing price (all indicators auto-computed)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>volume</strong> — optional, enables volume bars</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Price chart with Bollinger Bands shaded area</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>RSI panel with OB/OS zones + regime badge</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>%B and Bandwidth panels + confluence signal table</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Gauge className="mr-2 h-5 w-5" />
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

export default function RsiBollingerPage({
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

  // ── Indicator parameters ───────────────────────────────────
  const [bbPeriod,   setBbPeriod]   = useState(DEFAULT_BB_PERIOD);
  const [bbStd,      setBbStd]      = useState(DEFAULT_BB_STD);
  const [rsiPeriod,  setRsiPeriod]  = useState(DEFAULT_RSI_PERIOD);
  const [rsiOb,      setRsiOb]      = useState(RSI_OB);
  const [rsiOs,      setRsiOs]      = useState(RSI_OS);

  // ── Options ────────────────────────────────────────────────
  const [showVolume,    setShowVolume]    = useState(true);
  const [showBWidth,    setShowBWidth]    = useState(true);
  const [showBPct,      setShowBPct]      = useState(true);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_rsi_bb.csv');
    setBbPeriod(DEFAULT_BB_PERIOD); setBbStd(DEFAULT_BB_STD);
    setRsiPeriod(DEFAULT_RSI_PERIOD); setRsiOb(RSI_OB); setRsiOs(RSI_OS);
    setShowVolume(true); setShowBWidth(true); setShowBPct(true);
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

  // ── Build indicator rows ───────────────────────────────────
  const indicatorRows = useMemo(() => {
    if (!dateCol || !priceCol) return [];
    return buildIndicatorRows(data, dateCol, priceCol, volumeCol, bbPeriod, bbStd, rsiPeriod);
  }, [data, dateCol, priceCol, volumeCol, bbPeriod, bbStd, rsiPeriod]);

  // ── Sample for chart performance ───────────────────────────
  const sampledRows = useMemo(() => {
    if (indicatorRows.length <= 600) return indicatorRows;
    const step = Math.ceil(indicatorRows.length / 600);
    return indicatorRows.filter((_, i) => i % step === 0);
  }, [indicatorRows]);

  // ── Stable bar data arrays (avoid Cell index mismatch) ────
  const rsiBarData = useMemo(
    () => sampledRows.filter(r => r.rsi !== null),
    [sampledRows]
  );
  const bPctBarData = useMemo(
    () => sampledRows.filter(r => r.bPct !== null),
    [sampledRows]
  );
  const bWidthData = useMemo(
    () => sampledRows.filter(r => r.bWidth !== null),
    [sampledRows]
  );

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!indicatorRows.length) return null;
    const last   = indicatorRows[indicatorRows.length - 1];
    const first  = indicatorRows[0];
    const obDays = indicatorRows.filter(r => r.rsi !== null && r.rsi >= rsiOb).length;
    const osDays = indicatorRows.filter(r => r.rsi !== null && r.rsi <= rsiOs).length;
    const rsiValid = indicatorRows.filter(r => r.rsi !== null);
    const avgRsi = rsiValid.length
      ? rsiValid.reduce((s, r) => s + r.rsi!, 0) / rsiValid.length : null;
    return {
      lastPrice:  last.price,
      pctChg:     ((last.price - first.price) / first.price) * 100,
      lastDate:   last.date,
      lastRsi:    last.rsi,
      lastUpper:  last.upper,
      lastLower:  last.lower,
      lastMid:    last.mid,
      lastBWidth: last.bWidth,
      lastBPct:   last.bPct,
      regime:     classifyRegime(last.rsi),
      obDays,
      osDays,
      avgRsi,
    };
  }, [indicatorRows, rsiOb, rsiOs]);

  // ── Confluence signals ─────────────────────────────────────
  const confluenceEvents = useMemo(() => {
    return indicatorRows
      .filter(r => {
        if (r.rsi === null || r.upper === null || r.lower === null) return false;
        const atUpper = r.price >= r.upper * 0.995;
        const atLower = r.price <= r.lower * 1.005;
        const obRsi   = r.rsi >= rsiOb;
        const osRsi   = r.rsi <= rsiOs;
        return (atUpper && obRsi) || (atLower && osRsi);
      })
      .map(r => ({
        date:    r.date,
        price:   r.price,
        rsi:     r.rsi!,
        upper:   r.upper!,
        lower:   r.lower!,
        type:    r.rsi! >= rsiOb ? 'Sell Confluence' : 'Buy Confluence' as 'Sell Confluence' | 'Buy Confluence',
        bPct:    r.bPct,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [indicatorRows, rsiOb, rsiOs]);

  const isConfigured    = !!(dateCol && priceCol && indicatorRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!indicatorRows.length) return;
    const rows = indicatorRows.map(r => ({
      date:         r.date,
      price:        r.price,
      bb_upper:     r.upper   ?? '',
      bb_mid:       r.mid     ?? '',
      bb_lower:     r.lower   ?? '',
      bb_bandwidth: r.bWidth  ?? '',
      bb_pct_b:     r.bPct    ?? '',
      rsi:          r.rsi     ?? '',
      volume:       r.volume  ?? '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `RSI_BB_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [indicatorRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `RSI_BB_${new Date().toISOString().split('T')[0]}.png`;
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
    <div className="w-full max-w-6xl mx-auto space-y-6">

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
            <Gauge className="h-5 w-5" />
            RSI / Bollinger Bands
          </CardTitle>
          <CardDescription>
            Bollinger Bands and RSI auto-calculated from closing prices — identify overbought and oversold conditions and BB confluence signals.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map columns and adjust indicator parameters.</CardDescription>
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

          {/* Indicator parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Bollinger Bands */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">BOLLINGER BANDS</Label>
              <div className="flex flex-wrap gap-4 items-end">
                {[
                  { label: 'Period', value: bbPeriod, setter: (v: number) => setBbPeriod(v), min: 2, max: 200 },
                  { label: 'Std Dev', value: bbStd,   setter: (v: number) => setBbStd(v),   min: 0.5, max: 5, step: 0.5 },
                ].map(({ label, value, setter, min, max, step }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <input type="number" value={value} min={min} max={max} step={step ?? 1}
                      onChange={e => { const n = parseFloat(e.target.value); if (isFinite(n) && n >= min) setter(n); }}
                      className="w-20 h-8 text-xs border border-slate-200 rounded px-2 font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pb-1.5">BB({bbPeriod}, {bbStd}σ)</div>
              </div>
            </div>

            {/* RSI */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">RSI</Label>
              <div className="flex flex-wrap gap-4 items-end">
                {[
                  { label: 'Period',     value: rsiPeriod, setter: (v: number) => setRsiPeriod(v), min: 2,  max: 100 },
                  { label: 'OB Level',  value: rsiOb,     setter: (v: number) => setRsiOb(v),     min: 50, max: 95  },
                  { label: 'OS Level',  value: rsiOs,     setter: (v: number) => setRsiOs(v),     min: 5,  max: 50  },
                ].map(({ label, value, setter, min, max }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <input type="number" value={value} min={min} max={max}
                      onChange={e => { const n = parseInt(e.target.value); if (isFinite(n) && n >= min && n <= max) setter(n); }}
                      className="w-16 h-8 text-xs border border-slate-200 rounded px-2 font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pb-1.5">RSI({rsiPeriod})</div>
              </div>
            </div>
          </div>

          {/* Display options */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showVolume} onChange={e => setShowVolume(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Volume</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showBPct} onChange={e => setShowBPct(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">%B Panel</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showBWidth} onChange={e => setShowBWidth(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Bandwidth Panel</span>
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
              <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV (All Indicators)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Regime</div>
            <div className="flex items-center gap-2 mt-1">
              {stats.regime === 'Overbought' || stats.regime === 'Overbought Warning'
                ? <TrendingUp  className="h-5 w-5 shrink-0" style={{ color: REGIME_CONFIG[stats.regime].color }} />
                : stats.regime === 'Oversold' || stats.regime === 'Oversold Warning'
                ? <TrendingDown className="h-5 w-5 shrink-0" style={{ color: REGIME_CONFIG[stats.regime].color }} />
                : <Activity className="h-5 w-5 text-slate-400 shrink-0" />}
              <span className="text-sm font-bold leading-tight" style={{ color: REGIME_CONFIG[stats.regime].color }}>
                {stats.regime}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              RSI: {stats.lastRsi !== null ? stats.lastRsi.toFixed(1) : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Price</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">{stats.lastPrice.toFixed(2)}</div>
            <div className="text-xs mt-1.5 font-semibold text-slate-700">
              {stats.pctChg >= 0 ? '+' : ''}{stats.pctChg.toFixed(2)}% vs start
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">BB Position</div>
            <div className="text-2xl font-bold font-mono"
              style={{ color: (stats.lastBPct ?? 0.5) >= 0.8 ? OB_COLOR : (stats.lastBPct ?? 0.5) <= 0.2 ? OS_COLOR : '#1E293B' }}>
              {stats.lastBPct !== null ? `${(stats.lastBPct * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              %B · BW: {stats.lastBWidth !== null ? `${stats.lastBWidth.toFixed(1)}%` : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">OB / OS Days</div>
            <div className="flex items-center gap-3 mt-1">
              <div>
                <div className="text-lg font-bold font-mono text-red-500">{stats.obDays}</div>
                <div className="text-xs text-muted-foreground">OB days</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-lg font-bold font-mono text-emerald-600">{stats.osDays}</div>
                <div className="text-xs text-muted-foreground">OS days</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Price + Bollinger Bands chart ── */}
        {isConfigured && sampledRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price & Bollinger Bands — BB({bbPeriod}, {bbStd}σ)</CardTitle>
              <CardDescription>
                Shaded area = band range · Violet = SMA({bbPeriod}) middle band · Price touching bands signals potential mean-reversion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
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
                  <Tooltip content={<BBTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                  {showVolume && volumeCol && (
                    <Bar yAxisId="vol" dataKey="volume" name="Volume"
                      fill={VOLUME_COLOR} fillOpacity={0.30} maxBarSize={4} />
                  )}

                  {/* Shaded band area via upper/lower lines with fill */}
                  <Area yAxisId="price" dataKey="upper" name="Upper BB"
                    stroke={BB_BAND_COLOR} strokeWidth={1} strokeOpacity={0.5}
                    fill={BB_BAND_COLOR} fillOpacity={0.06}
                    dot={false} connectNulls legendType="none" />
                  <Area yAxisId="price" dataKey="lower" name="Lower BB"
                    stroke={BB_BAND_COLOR} strokeWidth={1} strokeOpacity={0.5}
                    fill="white" fillOpacity={1}
                    dot={false} connectNulls legendType="none" />

                  <Line yAxisId="price" dataKey="mid"   name={`SMA ${bbPeriod}`} stroke={BB_MID_COLOR}
                    strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                  <Line yAxisId="price" dataKey="price" name="Price" stroke={PRICE_COLOR}
                    strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── RSI panel ── */}
        {isConfigured && rsiBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">RSI — RSI({rsiPeriod})</CardTitle>
              <CardDescription>
                Red zone ≥ {rsiOb} (Overbought) · Green zone ≤ {rsiOs} (Oversold) · Current: {stats?.lastRsi?.toFixed(1) ?? '—'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={rsiBarData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(rsiBarData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={30} ticks={[0, 20, 40, 60, 80, 100]} />
                  <Tooltip content={<RSITooltip />} />

                  {/* OB zone shading */}
                  <ReferenceLine y={rsiOb} stroke={OB_COLOR} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: `OB ${rsiOb}`, position: 'right', fontSize: 9, fill: OB_COLOR }} />
                  {/* OS zone shading */}
                  <ReferenceLine y={rsiOs} stroke={OS_COLOR} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: `OS ${rsiOs}`, position: 'right', fontSize: 9, fill: OS_COLOR }} />
                  <ReferenceLine y={50} stroke="#CBD5E1" strokeDasharray="2 4" strokeWidth={1} />

                  <Bar dataKey="rsi" name={`RSI ${rsiPeriod}`} maxBarSize={5} radius={[1, 1, 0, 0]}>
                    {rsiBarData.map((row, i) => {
                      const v = row.rsi ?? 50;
                      const color = v >= rsiOb ? OB_COLOR : v <= rsiOs ? OS_COLOR : RSI_COLOR;
                      return <Cell key={i} fill={color} fillOpacity={0.85} />;
                    })}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── %B panel ── */}
        {isConfigured && showBPct && bPctBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">%B — Bollinger %B</CardTitle>
              <CardDescription>
                %B = (Price − Lower) / (Upper − Lower) · Above 1.0 = price above upper band · Below 0 = price below lower band
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={bPctBarData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(bPctBarData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={36} tickFormatter={v => v.toFixed(1)} />
                  <Tooltip formatter={(v: any) => [typeof v === 'number' ? v.toFixed(3) : v, '%B']} />
                  <ReferenceLine y={1}   stroke={OB_COLOR} strokeDasharray="3 3" strokeWidth={1} />
                  <ReferenceLine y={0.8} stroke={OB_COLOR} strokeDasharray="2 4" strokeWidth={1} strokeOpacity={0.5} />
                  <ReferenceLine y={0}   stroke={OS_COLOR} strokeDasharray="3 3" strokeWidth={1} />
                  <ReferenceLine y={0.2} stroke={OS_COLOR} strokeDasharray="2 4" strokeWidth={1} strokeOpacity={0.5} />
                  <ReferenceLine y={0.5} stroke="#CBD5E1"  strokeDasharray="2 4" strokeWidth={1} />
                  <Line dataKey="bPct" name="%B" stroke={BB_MID_COLOR} strokeWidth={1.5} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Bandwidth panel ── */}
        {isConfigured && showBWidth && bWidthData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bandwidth — Bollinger Band Width</CardTitle>
              <CardDescription>
                BW = (Upper − Lower) / Mid × 100 — low bandwidth = volatility squeeze, often precedes large directional move
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={bWidthData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(bWidthData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={36} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip formatter={(v: any) => [typeof v === 'number' ? `${v.toFixed(2)}%` : v, 'Bandwidth']} />
                  <Line dataKey="bWidth" name="Bandwidth" stroke="#3B82F6" strokeWidth={1.5} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Confluence signal log ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                RSI + Bollinger Confluence Signals
              </CardTitle>
              <CardDescription>
                Dates where RSI extreme AND price touching BB — highest-conviction signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confluenceEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Gauge className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No confluence signals detected</p>
                  <p className="text-xs mt-1">Confluence requires RSI extreme AND price at the corresponding BB</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Date', 'Signal', 'Price', 'RSI', '%B', 'Upper BB', 'Lower BB'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {confluenceEvents.map((ev, i) => (
                        <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600 whitespace-nowrap">{ev.date}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: ev.type === 'Sell Confluence' ? OB_COLOR : OS_COLOR }} />
                              <span className={`text-xs font-bold ${ev.type === 'Sell Confluence' ? 'text-red-500' : 'text-emerald-600'}`}>
                                {ev.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{ev.price.toFixed(2)}</td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold"
                            style={{ color: ev.rsi >= rsiOb ? OB_COLOR : OS_COLOR }}>
                            {ev.rsi.toFixed(1)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs"
                            style={{ color: ev.type === 'Sell Confluence' ? OB_COLOR : OS_COLOR }}>
                            {ev.bPct !== null ? ev.bPct.toFixed(3) : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{ev.upper.toFixed(2)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{ev.lower.toFixed(2)}</td>
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
        {isConfigured && stats && (() => {
          const { regime, lastRsi, lastBPct, lastBWidth, lastUpper, lastLower, lastMid, lastPrice, obDays, osDays, avgRsi } = stats;

          // Recent bandwidth trend: expanding or contracting?
          const recentBW = indicatorRows.slice(-10).map(r => r.bWidth).filter((v): v is number => v !== null);
          const bwExpanding = recentBW.length >= 2
            ? recentBW[recentBW.length - 1] > recentBW[0]
            : null;

          // Is price near a band?
          const nearUpper = lastUpper !== null && lastPrice >= lastUpper * 0.98;
          const nearLower = lastLower !== null && lastPrice <= lastLower * 1.02;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated RSI and Bollinger Bands analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Indicator Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{data.length.toLocaleString()}</span> trading days
                    with <span className="font-semibold">BB({bbPeriod},{bbStd}σ)</span> and{' '}
                    <span className="font-semibold">RSI({rsiPeriod})</span>.
                    Current regime: <span className="font-semibold" style={{ color: REGIME_CONFIG[regime].color }}>{regime}</span>.
                    RSI has spent <span className="font-semibold text-red-500">{obDays}</span> days overbought and{' '}
                    <span className="font-semibold text-emerald-600">{osDays}</span> days oversold.
                    Detected <span className="font-semibold">{confluenceEvents.length}</span> confluence signal{confluenceEvents.length !== 1 ? 's' : ''}.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'RSI',        value: lastRsi   !== null ? lastRsi.toFixed(1)       : '—', sub: regime },
                    { label: 'BB %B',      value: lastBPct  !== null ? `${(lastBPct*100).toFixed(1)}%` : '—', sub: nearUpper ? 'Near upper band' : nearLower ? 'Near lower band' : 'Mid range' },
                    { label: 'Bandwidth',  value: lastBWidth !== null ? `${lastBWidth.toFixed(1)}%` : '—', sub: bwExpanding === null ? '—' : bwExpanding ? 'Expanding' : 'Contracting' },
                    { label: 'Confluence', value: confluenceEvents.length,                              sub: `${confluenceEvents.filter(e => e.type === 'Sell Confluence').length} sell · ${confluenceEvents.filter(e => e.type === 'Buy Confluence').length} buy` },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">RSI Regime — {regime}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {regime === 'Overbought' &&
                          `RSI is at ${lastRsi?.toFixed(1)} — above the overbought threshold of ${rsiOb}. This does not automatically signal a reversal; in strong trends RSI can remain overbought for extended periods. Look for RSI to diverge from price (price making new highs while RSI does not) as the more actionable reversal signal.`}
                        {regime === 'Overbought Warning' &&
                          `RSI is at ${lastRsi?.toFixed(1)} — approaching the overbought zone of ${rsiOb}. Momentum is strong but slowing. Watch for RSI to breach ${rsiOb} or roll over from this level.`}
                        {regime === 'Oversold' &&
                          `RSI is at ${lastRsi?.toFixed(1)} — below the oversold threshold of ${rsiOs}. In downtrends RSI can stay oversold, so wait for a bullish divergence (price new low, RSI higher low) or a cross back above ${rsiOs} before acting.`}
                        {regime === 'Oversold Warning' &&
                          `RSI is at ${lastRsi?.toFixed(1)} — approaching the oversold zone of ${rsiOs}. Selling pressure is elevated. A further drop below ${rsiOs} would confirm oversold conditions.`}
                        {regime === 'Neutral' &&
                          `RSI is at ${lastRsi?.toFixed(1)} — neutral territory between ${rsiOs} and ${rsiOb}. No extreme momentum signal. Focus on price structure and BB position for directional bias.`}
                        {avgRsi !== null && (
                          <> Historical average RSI for this period was <span className="font-mono font-semibold">{avgRsi.toFixed(1)}</span>.</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Bollinger Band Position</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {lastUpper !== null && lastLower !== null && lastMid !== null ? (
                          <>
                            Upper band: <span className="font-mono font-semibold">{lastUpper.toFixed(2)}</span> ·
                            Mid (SMA {bbPeriod}): <span className="font-mono font-semibold">{lastMid.toFixed(2)}</span> ·
                            Lower band: <span className="font-mono font-semibold">{lastLower.toFixed(2)}</span>.{' '}
                            {nearUpper
                              ? `Price is near the upper band — in mean-reversion terms this is extended. Combined with RSI ${lastRsi !== null && lastRsi >= rsiOb ? 'overbought, a pull-back is a plausible near-term scenario' : 'not yet overbought, the breakout could have continuation'}.`
                              : nearLower
                              ? `Price is near the lower band — in mean-reversion terms this is oversold. Combined with RSI ${lastRsi !== null && lastRsi <= rsiOs ? 'oversold, a bounce is a plausible near-term scenario' : 'not yet oversold, further downside pressure may persist'}.`
                              : 'Price is trading within the bands — no extreme BB signal currently.'}
                          </>
                        ) : 'Insufficient data to compute Bollinger Bands at current parameters.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">
                        Bandwidth — {bwExpanding === null ? 'Insufficient data' : bwExpanding ? 'Expanding (Volatility Rising)' : 'Contracting (Squeeze)'}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {bwExpanding === true &&
                          `Bandwidth has been expanding over the last 10 periods — volatility is rising. An expanding band environment favors trend-following strategies. The current ${regime.startsWith('Over') ? regime.toLowerCase() : 'move'} may have more room to run.`}
                        {bwExpanding === false &&
                          'Bandwidth has been contracting over the last 10 periods — a volatility squeeze is developing. Bollinger Band squeezes often precede large directional moves. The direction is unknown in advance; watch for a decisive breakout above the upper or below the lower band as the resolution trigger.'}
                        {bwExpanding === null &&
                          'Insufficient data to determine bandwidth trend.'}
                      </p>
                    </div>
                  </div>

                  {confluenceEvents.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Confluence Signals — {confluenceEvents.length} detected
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {confluenceEvents.length} dates where RSI reached an extreme and price simultaneously touched the corresponding Bollinger Band.{' '}
                          {confluenceEvents.filter(e => e.type === 'Sell Confluence').length} sell confluence events (RSI ≥ {rsiOb} + price at upper BB) and{' '}
                          {confluenceEvents.filter(e => e.type === 'Buy Confluence').length} buy confluence events (RSI ≤ {rsiOs} + price at lower BB).
                          Most recent: <span className="font-semibold">{confluenceEvents[0].date}</span> — {confluenceEvents[0].type} at price{' '}
                          <span className="font-mono font-semibold">{confluenceEvents[0].price.toFixed(2)}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Bollinger Bands: Middle = SMA({bbPeriod}), Upper/Lower = Middle ± {bbStd} × rolling standard deviation.
                  RSI uses Wilder's smoothing method with a multiplier of 1/period. %B = (Price − Lower) / (Upper − Lower).
                  Bandwidth = (Upper − Lower) / Middle × 100. All values auto-calculated from the price column.
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
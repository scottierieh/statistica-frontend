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
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  Activity,
  LayoutDashboard,
  Zap,
  Gauge,
  Waves,
  GitMerge,
  AlertTriangle,
  Circle,
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

type SignalType = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';

interface DashRow {
  date:        string;
  price:       number;
  volume?:     number;
  // SMA / EMA
  sma20:       number | null;
  sma50:       number | null;
  ema12:       number | null;
  ema26:       number | null;
  // Bollinger
  bbUpper:     number | null;
  bbMid:       number | null;
  bbLower:     number | null;
  // MACD
  macdLine:    number | null;
  signalLine:  number | null;
  histogram:   number | null;
  // RSI
  rsi:         number | null;
  // Price–Volume
  volZScore:   number | null;
}

interface IndicatorSignal {
  name:   string;
  icon:   React.ReactNode;
  signal: SignalType;
  value:  string;
  detail: string;
}

// ============================================
// Constants
// ============================================

const PRICE_COLOR  = '#1E293B';
const BB_COLOR     = '#6C3AED';
const SMA20_COLOR  = '#F59E0B';
const SMA50_COLOR  = '#3B82F6';
const EMA12_COLOR  = '#10B981';
const EMA26_COLOR  = '#F97316';
const MACD_COLOR   = '#6C3AED';
const SIG_COLOR    = '#F59E0B';
const HIST_POS     = '#10B981';
const HIST_NEG     = '#EF4444';
const RSI_OB       = '#EF4444';
const RSI_OS       = '#10B981';
const RSI_COLOR    = '#F59E0B';
const VOL_UP       = '#10B98140';
const VOL_DN       = '#EF444440';

const SIGNAL_CONFIG: Record<SignalType, { color: string; bg: string; dot: string }> = {
  'Strong Buy':  { color: '#059669', bg: '#D1FAE5', dot: '#10B981' },
  'Buy':         { color: '#10B981', bg: '#ECFDF5', dot: '#34D399' },
  'Neutral':     { color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' },
  'Sell':        { color: '#F87171', bg: '#FEF2F2', dot: '#FCA5A5' },
  'Strong Sell': { color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
};

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

function calcBB(prices: number[], period: number, mult: number) {
  const mid = calcSMA(prices, period);
  return prices.map((_, i) => {
    if (i < period - 1) return { upper: null, mid: mid[i], lower: null };
    const slice = prices.slice(i - period + 1, i + 1);
    const mean  = mid[i]!;
    const sd    = Math.sqrt(slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period);
    return {
      upper: mean + mult * sd,
      mid:   mean,
      lower: mean - mult * sd,
    };
  });
}

function calcRSI(prices: number[], period: number): (number | null)[] {
  if (prices.length < period + 1) return new Array(prices.length).fill(null);
  const result: (number | null)[] = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function buildDashRows(
  data:      Record<string, any>[],
  dateCol:   string,
  priceCol:  string,
  volumeCol: string,
): DashRow[] {
  const raw = data
    .map(r => ({
      date:   String(r[dateCol] ?? ''),
      price:  parseFloat(r[priceCol]),
      volume: volumeCol ? (parseFloat(r[volumeCol]) || undefined) : undefined,
    }))
    .filter(r => r.date && isFinite(r.price));

  if (raw.length < 2) return [];

  const prices = raw.map(r => r.price);
  const vols   = raw.map(r => r.volume ?? 0).filter(v => v > 0);
  const avgVol = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 1;
  const sdVol  = vols.length
    ? Math.sqrt(vols.reduce((s, v) => s + (v - avgVol) ** 2, 0) / vols.length) || 1 : 1;

  const sma20v  = calcSMA(prices, 20);
  const sma50v  = calcSMA(prices, 50);
  const ema12v  = calcEMA(prices, 12);
  const ema26v  = calcEMA(prices, 26);
  const bbv     = calcBB(prices, 20, 2);
  const rsiVals = calcRSI(prices, 14);

  // MACD = EMA12 - EMA26
  const macdRaw: (number | null)[] = ema12v.map((f, i) => {
    const s = ema26v[i];
    return f !== null && s !== null ? f - s : null;
  });
  const macdNumbers = macdRaw.filter((v): v is number => v !== null);
  const signalEMA   = calcEMA(macdNumbers, 9);
  const firstIdx    = macdRaw.findIndex(v => v !== null);
  const signalAligned: (number | null)[] = new Array(macdRaw.length).fill(null);
  for (let i = 0; i < signalEMA.length; i++) signalAligned[firstIdx + i] = signalEMA[i];

  return raw.map((r, i) => {
    const m = macdRaw[i]; const s = signalAligned[i];
    const vol = r.volume;
    const zScore = vol != null && vol > 0 ? (vol - avgVol) / sdVol : null;
    return {
      date:       r.date,
      price:      r.price,
      volume:     r.volume,
      sma20:      sma20v[i]  !== null ? parseFloat(sma20v[i]!.toFixed(4))  : null,
      sma50:      sma50v[i]  !== null ? parseFloat(sma50v[i]!.toFixed(4))  : null,
      ema12:      ema12v[i]  !== null ? parseFloat(ema12v[i]!.toFixed(4))  : null,
      ema26:      ema26v[i]  !== null ? parseFloat(ema26v[i]!.toFixed(4))  : null,
      bbUpper:    bbv[i].upper !== null ? parseFloat(bbv[i].upper!.toFixed(4)) : null,
      bbMid:      bbv[i].mid  !== null ? parseFloat(bbv[i].mid!.toFixed(4))   : null,
      bbLower:    bbv[i].lower !== null ? parseFloat(bbv[i].lower!.toFixed(4)) : null,
      macdLine:   m !== null ? parseFloat(m.toFixed(4)) : null,
      signalLine: s !== null ? parseFloat(s.toFixed(4)) : null,
      histogram:  m !== null && s !== null ? parseFloat((m - s).toFixed(4)) : null,
      rsi:        rsiVals[i] !== null ? parseFloat(rsiVals[i]!.toFixed(2)) : null,
      volZScore:  zScore !== null ? parseFloat(zScore.toFixed(3)) : null,
    };
  });
}

// ============================================
// Signal scoring
// ============================================

function scoreIndicators(rows: DashRow[]): IndicatorSignal[] {
  if (!rows.length) return [];
  const last = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;

  const signals: IndicatorSignal[] = [];

  // ── 1. SMA Trend ──────────────────────────────────────────
  if (last.sma20 !== null && last.sma50 !== null) {
    const pAbove20  = last.price > last.sma20;
    const pAbove50  = last.price > last.sma50;
    const sma20gt50 = last.sma20 > last.sma50;
    const score = [pAbove20, pAbove50, sma20gt50].filter(Boolean).length;
    const signal: SignalType = score === 3 ? 'Strong Buy' : score === 2 ? 'Buy' : score === 1 ? 'Neutral' : 'Sell';
    signals.push({
      name:   'SMA Trend',
      icon:   <BarChart3 className="h-4 w-4" />,
      signal,
      value:  `SMA20: ${last.sma20.toFixed(2)} · SMA50: ${last.sma50.toFixed(2)}`,
      detail: `Price ${pAbove20 ? 'above' : 'below'} SMA20 · Price ${pAbove50 ? 'above' : 'below'} SMA50 · SMA20 ${sma20gt50 ? 'above' : 'below'} SMA50`,
    });
  }

  // ── 2. EMA Cross ─────────────────────────────────────────
  if (last.ema12 !== null && last.ema26 !== null) {
    const bullish = last.ema12 > last.ema26;
    const recentCross = prev?.ema12 !== null && prev?.ema26 !== null
      && ((prev.ema12 <= prev.ema26 && last.ema12 > last.ema26)
        || (prev.ema12 >= prev.ema26 && last.ema12 < last.ema26));
    const signal: SignalType = recentCross
      ? (bullish ? 'Strong Buy' : 'Strong Sell')
      : bullish ? 'Buy' : 'Sell';
    signals.push({
      name:   'EMA Cross (12/26)',
      icon:   <Zap className="h-4 w-4" />,
      signal,
      value:  `EMA12: ${last.ema12.toFixed(2)} · EMA26: ${last.ema26.toFixed(2)}`,
      detail: `EMA12 ${bullish ? 'above' : 'below'} EMA26${recentCross ? ' — fresh crossover!' : ''}`,
    });
  }

  // ── 3. Bollinger Position ────────────────────────────────
  if (last.bbUpper !== null && last.bbLower !== null && last.bbMid !== null) {
    const bPct = (last.price - last.bbLower) / (last.bbUpper - last.bbLower);
    const aboveUpper = last.price >= last.bbUpper;
    const belowLower = last.price <= last.bbLower;
    const signal: SignalType = aboveUpper
      ? 'Sell'
      : belowLower ? 'Buy'
      : bPct > 0.6 ? 'Neutral'
      : bPct < 0.4 ? 'Neutral'
      : 'Neutral';
    const pctB = (bPct * 100).toFixed(0);
    signals.push({
      name:   'Bollinger Bands',
      icon:   <Activity className="h-4 w-4" />,
      signal,
      value:  `%B: ${pctB}% · Width: ${((last.bbUpper - last.bbLower) / last.bbMid * 100).toFixed(1)}%`,
      detail: aboveUpper
        ? 'Price above upper band — extended / potential mean-reversion'
        : belowLower
        ? 'Price below lower band — oversold / potential bounce zone'
        : `Price at ${pctB}%B — within bands`,
    });
  }

  // ── 4. MACD ──────────────────────────────────────────────
  if (last.macdLine !== null && last.signalLine !== null) {
    const bullish = last.macdLine > last.signalLine;
    const aboveZero = last.macdLine > 0;
    const recentCross = prev?.macdLine !== null && prev?.signalLine !== null
      && ((prev.macdLine <= prev.signalLine && last.macdLine > last.signalLine)
        || (prev.macdLine >= prev.signalLine && last.macdLine < last.signalLine));
    const histExpanding = prev?.histogram !== null && last.histogram !== null
      && Math.abs(last.histogram) > Math.abs(prev.histogram);
    const signal: SignalType = recentCross
      ? (bullish ? 'Strong Buy' : 'Strong Sell')
      : (bullish && aboveZero) ? 'Buy'
      : (bullish && !aboveZero) ? 'Neutral'
      : (!bullish && !aboveZero) ? 'Sell'
      : 'Neutral';
    signals.push({
      name:   'MACD (12,26,9)',
      icon:   <Waves className="h-4 w-4" />,
      signal,
      value:  `MACD: ${last.macdLine >= 0 ? '+' : ''}${last.macdLine.toFixed(3)} · Hist: ${last.histogram !== null ? (last.histogram >= 0 ? '+' : '') + last.histogram.toFixed(3) : '—'}`,
      detail: `MACD ${bullish ? 'above' : 'below'} Signal · ${aboveZero ? 'Above' : 'Below'} zero line${recentCross ? ' — fresh crossover!' : ''}${histExpanding ? ' · Momentum expanding' : ''}`,
    });
  }

  // ── 5. RSI ───────────────────────────────────────────────
  if (last.rsi !== null) {
    const signal: SignalType = last.rsi >= 70 ? 'Sell'
      : last.rsi >= 60 ? 'Neutral'
      : last.rsi <= 30 ? 'Buy'
      : last.rsi <= 40 ? 'Neutral'
      : 'Neutral';
    signals.push({
      name:   'RSI (14)',
      icon:   <Gauge className="h-4 w-4" />,
      signal,
      value:  `RSI: ${last.rsi.toFixed(1)}`,
      detail: last.rsi >= 70 ? 'Overbought — potential pullback'
        : last.rsi <= 30 ? 'Oversold — potential reversal'
        : last.rsi >= 60 ? 'Approaching overbought'
        : last.rsi <= 40 ? 'Approaching oversold'
        : 'Neutral zone',
    });
  }

  // ── 6. Volume Confirmation ───────────────────────────────
  if (last.volZScore !== null && prev) {
    const priceUp  = last.price > prev.price;
    const highVol  = last.volZScore > 0;
    const signal: SignalType = (priceUp && highVol) ? 'Buy'
      : (!priceUp && highVol) ? 'Sell'
      : (priceUp && !highVol) ? 'Neutral'
      : 'Neutral';
    signals.push({
      name:   'Volume Confirm',
      icon:   <GitMerge className="h-4 w-4" />,
      signal,
      value:  `Z-Score: ${last.volZScore >= 0 ? '+' : ''}${last.volZScore.toFixed(2)}σ`,
      detail: `Price ${priceUp ? 'up' : 'down'} with ${highVol ? 'above' : 'below'}-average volume — ${
        priceUp && highVol   ? 'confirmed move' :
        !priceUp && highVol  ? 'confirmed selling' :
        priceUp && !highVol  ? 'weak rally, low conviction' :
        'weak pullback, may recover'
      }`,
    });
  }

  return signals;
}

function overallScore(signals: IndicatorSignal[]): { score: number; label: SignalType; summary: string } {
  const map: Record<SignalType, number> = {
    'Strong Buy': 2, 'Buy': 1, 'Neutral': 0, 'Sell': -1, 'Strong Sell': -2,
  };
  if (!signals.length) return { score: 0, label: 'Neutral', summary: 'No data' };
  const total = signals.reduce((s, sig) => s + map[sig.signal], 0);
  const avg   = total / signals.length;
  const label: SignalType = avg >= 1.2 ? 'Strong Buy' : avg >= 0.4 ? 'Buy' : avg <= -1.2 ? 'Strong Sell' : avg <= -0.4 ? 'Sell' : 'Neutral';
  const bullCount = signals.filter(s => s.signal === 'Buy' || s.signal === 'Strong Buy').length;
  const bearCount = signals.filter(s => s.signal === 'Sell' || s.signal === 'Strong Sell').length;
  const summary   = `${bullCount} bullish · ${bearCount} bearish · ${signals.length - bullCount - bearCount} neutral`;
  return { score: parseFloat(avg.toFixed(2)), label, summary };
}

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2022-06-01');
  let price = 180, volume = 55_000_000;
  const phases = [
    { days: 55,  drift:  0.0010, vol: 0.012, vm: 1.1 },
    { days: 40,  drift: -0.0022, vol: 0.020, vm: 1.4 },
    { days: 70,  drift:  0.0018, vol: 0.012, vm: 1.0 },
    { days: 45,  drift: -0.0015, vol: 0.017, vm: 1.2 },
    { days: 85,  drift:  0.0020, vol: 0.010, vm: 1.1 },
    { days: 40,  drift:  0.0005, vol: 0.009, vm: 0.8 },
    { days: 60,  drift: -0.0018, vol: 0.019, vm: 1.3 },
    { days: 65,  drift:  0.0016, vol: 0.011, vm: 1.0 },
  ];
  let day = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) { day++; i--; continue; }
      const ret = phase.drift + (Math.random() - 0.5) * phase.vol;
      price  = Math.max(80, price * (1 + ret));
      volume = Math.max(5_000_000, volume * (0.88 + Math.random() * 0.24) * phase.vm);
      volume = Math.min(volume, 200_000_000);
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

const MainTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const relevant = payload.filter((p: any) =>
    p.value !== null && p.value !== undefined && p.dataKey !== 'volume'
  );
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[200px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {relevant.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? p.stroke }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold text-slate-700">
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const SubTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-3">
            <span className="text-slate-500">{p.name}</span>
            <span className="font-mono font-bold" style={{ color: p.color ?? p.fill ?? p.stroke }}>
              {formatter ? formatter(p.value, p.dataKey) : (typeof p.value === 'number' ? p.value.toFixed(2) : p.value)}
            </span>
          </div>
        ))}
    </div>
  );
};

// ============================================
// Signal Badge
// ============================================

const SignalBadge = ({ signal, size = 'sm' }: { signal: SignalType; size?: 'sm' | 'md' | 'lg' }) => {
  const cfg = SIGNAL_CONFIG[signal];
  const sz  = size === 'lg' ? 'px-3 py-1.5 text-sm font-bold'
            : size === 'md' ? 'px-2.5 py-1 text-xs font-bold'
            : 'px-2 py-0.5 text-xs font-semibold';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sz}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <Circle className="h-1.5 w-1.5 fill-current" />
      {signal}
    </span>
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
            <LayoutDashboard className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Quant Technical Dashboard</CardTitle>
        <CardDescription className="text-base mt-2">
          Monitor all major technical indicators in one unified view — SMA, EMA, Bollinger Bands, MACD, RSI, and Volume Confirmation with an aggregated signal score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <LayoutDashboard className="w-6 h-6 text-primary mb-2" />,
              title: 'Unified Signal Panel',
              desc:  'Six indicators — SMA Trend, EMA Cross, Bollinger Bands, MACD, RSI, and Volume Confirmation — each scored and aggregated into one overall market signal.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Multi-Panel Charts',
              desc:  'Four synchronized charts: Price + BB + MAs, MACD Histogram, RSI with zones, and Volume with z-score — all on the same time axis.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Overall Score',
              desc:  'Each indicator contributes to a composite signal score from Strong Buy to Strong Sell — giving a fast, at-a-glance read of the market structure.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Indicators covered */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: <BarChart3 className="h-4 w-4" />, label: 'SMA Trend',      desc: 'SMA 20 & 50 position' },
            { icon: <Zap       className="h-4 w-4" />, label: 'EMA Cross 12/26',desc: 'Golden/Death Cross' },
            { icon: <Activity  className="h-4 w-4" />, label: 'Bollinger Bands', desc: '%B, bandwidth, BB position' },
            { icon: <Waves     className="h-4 w-4" />, label: 'MACD 12,26,9',   desc: 'Line, signal, histogram' },
            { icon: <Gauge     className="h-4 w-4" />, label: 'RSI (14)',        desc: 'OB/OS zones, regime' },
            { icon: <GitMerge  className="h-4 w-4" />, label: 'Volume Confirm',  desc: 'Volume z-score, conviction' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 flex items-start gap-2.5">
              <div className="mt-0.5 text-primary shrink-0">{icon}</div>
              <div>
                <div className="text-xs font-bold text-slate-700">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Technical Dashboard as your first-pass screening tool. When multiple independent
            indicators agree — SMA trend bullish, MACD above zero, RSI not yet overbought, volume
            confirming — the probability of a sustained move is higher. Divergence between indicators
            (e.g., price rising but RSI and MACD diverging) warrants caution. Use the aggregated
            signal score as a quick regime summary, then drill into individual indicator pages for deeper analysis.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — trading date (YYYY-MM-DD)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>close / price</strong> — daily closing price</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>volume</strong> — optional, enables volume confirmation</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Overall composite signal (Strong Buy → Strong Sell)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>6-indicator signal grid with current values and detail</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>4-panel synchronized technical chart suite</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <LayoutDashboard className="mr-2 h-5 w-5" />
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

export default function QuantTechnicalDashboardPage({
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

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_tech_dashboard.csv');
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

  // ── Build rows ─────────────────────────────────────────────
  const dashRows = useMemo(() => {
    if (!dateCol || !priceCol) return [];
    return buildDashRows(data, dateCol, priceCol, volumeCol);
  }, [data, dateCol, priceCol, volumeCol]);

  // ── Sample ─────────────────────────────────────────────────
  const sampled = useMemo(() => {
    if (dashRows.length <= 600) return dashRows;
    const step = Math.ceil(dashRows.length / 600);
    return dashRows.filter((_, i) => i % step === 0);
  }, [dashRows]);

  // ── Stable sub-series ──────────────────────────────────────
  const macdData = useMemo(() => sampled.filter(r => r.macdLine !== null), [sampled]);
  // rsiLine alias prevents duplicate dataKey='rsi' between Bar and Line in the RSI chart
  const rsiData  = useMemo(
    () => sampled.filter(r => r.rsi !== null).map(r => ({ ...r, rsiLine: r.rsi })),
    [sampled]
  );
  const volData  = useMemo(() => sampled.filter(r => r.volZScore !== null || r.volume != null), [sampled]);

  // ── Signals ────────────────────────────────────────────────
  const indicatorSignals = useMemo(() => scoreIndicators(dashRows), [dashRows]);
  const overall          = useMemo(() => overallScore(indicatorSignals), [indicatorSignals]);

  // ── Price stats ────────────────────────────────────────────
  const priceStats = useMemo(() => {
    if (!dashRows.length) return null;
    const last  = dashRows[dashRows.length - 1];
    const first = dashRows[0];
    return {
      last:     last.price,
      pctChg:   ((last.price - first.price) / first.price) * 100,
      lastDate: last.date,
    };
  }, [dashRows]);

  const isConfigured    = !!(dateCol && priceCol && dashRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!dashRows.length) return;
    const rows = dashRows.map(r => ({
      date: r.date, price: r.price,
      sma20: r.sma20 ?? '', sma50: r.sma50 ?? '',
      ema12: r.ema12 ?? '', ema26: r.ema26 ?? '',
      bb_upper: r.bbUpper ?? '', bb_mid: r.bbMid ?? '', bb_lower: r.bbLower ?? '',
      macd: r.macdLine ?? '', signal: r.signalLine ?? '', histogram: r.histogram ?? '',
      rsi: r.rsi ?? '', vol_zscore: r.volZScore ?? '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `TechDashboard_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [dashRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `TechDashboard_${new Date().toISOString().split('T')[0]}.png`;
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
            <LayoutDashboard className="h-5 w-5" />
            Quant Technical Dashboard
          </CardTitle>
          <CardDescription>
            Six technical indicators unified into one view — SMA, EMA cross, Bollinger Bands, MACD, RSI, and Volume Confirmation with an aggregated signal score.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map columns. All indicators are auto-calculated from price and volume.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <p className="text-xs text-muted-foreground pt-1">
            Fixed parameters: SMA 20/50 · EMA 12/26 · BB(20, 2σ) · MACD(12,26,9) · RSI(14)
          </p>
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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (All Indicators)
              </DropdownMenuItem>
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
          <div className="rounded-lg border border-slate-200 bg-white p-4 md:col-span-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Overall Signal
            </div>
            <div className="flex items-center gap-3">
              <SignalBadge signal={overall.label} size="lg" />
              <div>
                <div className="text-xs text-muted-foreground">{overall.summary}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Composite score: <span className="font-mono font-bold text-slate-700">{overall.score >= 0 ? '+' : ''}{overall.score}</span> / 2.0
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Price</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{priceStats.last.toFixed(2)}</div>
            <div className="text-xs mt-1.5 font-semibold text-slate-700">
              {priceStats.pctChg >= 0 ? '+' : ''}{priceStats.pctChg.toFixed(2)}% period
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Data Range</div>
            <div className="text-sm font-bold text-slate-700 font-mono">
              {dashRows[0]?.date ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              → {priceStats.lastDate} · {dashRows.length.toLocaleString()} days
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Indicator Signal Grid ── */}
        {isConfigured && indicatorSignals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-slate-400" />
                Indicator Signal Grid
              </CardTitle>
              <CardDescription>
                Current signal for each indicator — tap any row for detail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {indicatorSignals.map((sig) => {
                  const cfg = SIGNAL_CONFIG[sig.signal];
                  return (
                    <div key={sig.name}
                      className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <div className="mt-0.5 text-muted-foreground shrink-0">{sig.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-700">{sig.name}</span>
                          <SignalBadge signal={sig.signal} size="sm" />
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{sig.value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{sig.detail}</div>
                      </div>
                      {/* Mini signal bar */}
                      <div className="flex items-center gap-0.5 shrink-0 mt-1">
                        {(['Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'] as SignalType[]).map(s => (
                          <div key={s} className="w-2 h-5 rounded-sm transition-all"
                            style={{
                              backgroundColor: sig.signal === s ? SIGNAL_CONFIG[s].dot : '#F1F5F9',
                              opacity: sig.signal === s ? 1 : 0.5,
                            }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Score bar */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Composite Score
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-600">
                      {overall.score >= 0 ? '+' : ''}{overall.score} / 2.0
                    </span>
                    <SignalBadge signal={overall.label} size="sm" />
                  </div>
                </div>
                <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
                  {/* -2 to +2 scale mapped to 0-100% */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300 z-10" />
                  <div
                    className="absolute inset-y-0 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: SIGNAL_CONFIG[overall.label].dot,
                      left:  overall.score >= 0 ? '50%' : `${(overall.score + 2) / 4 * 100}%`,
                      width: `${Math.abs(overall.score) / 4 * 100}%`,
                    }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Strong Sell</span>
                  <span className="text-xs text-muted-foreground">Strong Buy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 1: Price + BB + MAs ── */}
        {isConfigured && sampled.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price · Bollinger Bands · Moving Averages</CardTitle>
              <CardDescription>
                Dark = Price · Violet = BB bands · Amber = SMA20 · Blue = SMA50 · Green = EMA12 · Orange = EMA26
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={sampled} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(sampled.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis yAxisId="price" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(0)} />
                  {volumeCol && <YAxis yAxisId="vol" orientation="right" hide domain={[0, (dataMax: number) => dataMax * 4]} />}
                  <Tooltip content={<MainTooltip />} />
                  {volumeCol && (
                    <Bar yAxisId="vol" dataKey="volume" name="Volume" maxBarSize={4}>
                      {sampled.map((r, i) => (
                        <Cell key={i} fill={i > 0 && sampled[i - 1] && r.price >= sampled[i - 1].price ? '#10B98130' : '#EF444430'} />
                      ))}
                    </Bar>
                  )}
                  <Area yAxisId="price" dataKey="bbUpper" name="BB Upper"
                    stroke={BB_COLOR} strokeWidth={1} strokeOpacity={0.4}
                    fill={BB_COLOR} fillOpacity={0.05} dot={false} connectNulls legendType="none" />
                  <Area yAxisId="price" dataKey="bbLower" name="BB Lower"
                    stroke={BB_COLOR} strokeWidth={1} strokeOpacity={0.4}
                    fill="white" fillOpacity={1} dot={false} connectNulls legendType="none" />
                  <Line yAxisId="price" dataKey="bbMid"  name="BB Mid"  stroke={BB_COLOR}   strokeWidth={1}   strokeDasharray="4 3" dot={false} connectNulls />
                  <Line yAxisId="price" dataKey="sma20"  name="SMA 20"  stroke={SMA20_COLOR} strokeWidth={1.5} dot={false} connectNulls />
                  <Line yAxisId="price" dataKey="sma50"  name="SMA 50"  stroke={SMA50_COLOR} strokeWidth={1.5} dot={false} connectNulls />
                  <Line yAxisId="price" dataKey="ema12"  name="EMA 12"  stroke={EMA12_COLOR} strokeWidth={1}   strokeDasharray="3 2" dot={false} connectNulls />
                  <Line yAxisId="price" dataKey="ema26"  name="EMA 26"  stroke={EMA26_COLOR} strokeWidth={1}   strokeDasharray="3 2" dot={false} connectNulls />
                  <Line yAxisId="price" dataKey="price"  name="Price"   stroke={PRICE_COLOR} strokeWidth={2}   dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: MACD Histogram ── */}
        {isConfigured && macdData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">MACD (12, 26, 9)</CardTitle>
              <CardDescription>
                Violet = MACD line · Amber = Signal line · Bars = Histogram (green positive, red negative)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={macdData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(macdData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={52} tickFormatter={v => v.toFixed(2)} />
                  <Tooltip content={<SubTooltip formatter={(v: number, k: string) =>
                    k === 'histogram' ? `${v >= 0 ? '+' : ''}${v.toFixed(3)}`
                    : `${v >= 0 ? '+' : ''}${v.toFixed(3)}`} />} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1} />
                  <Bar dataKey="histogram" name="Histogram" maxBarSize={5} radius={[1, 1, 0, 0]}>
                    {macdData.map((r, i) => (
                      <Cell key={i} fill={(r.histogram ?? 0) >= 0 ? HIST_POS : HIST_NEG} fillOpacity={0.8} />
                    ))}
                  </Bar>
                  <Line dataKey="macdLine"   name="MACD"   stroke={MACD_COLOR} strokeWidth={1.5} dot={false} connectNulls />
                  <Line dataKey="signalLine" name="Signal" stroke={SIG_COLOR}  strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: RSI ── */}
        {isConfigured && rsiData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">RSI (14)</CardTitle>
              <CardDescription>
                Red zone ≥ 70 (Overbought) · Green zone ≤ 30 (Oversold) · Amber line = RSI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={rsiData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(rsiData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={30} ticks={[0, 30, 50, 70, 100]} />
                  <Tooltip content={<SubTooltip formatter={(v: number) => v.toFixed(1)} />} />
                  <ReferenceLine y={70} stroke={RSI_OB} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: '70', position: 'right', fontSize: 9, fill: RSI_OB }} />
                  <ReferenceLine y={30} stroke={RSI_OS} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: '30', position: 'right', fontSize: 9, fill: RSI_OS }} />
                  <ReferenceLine y={50} stroke="#CBD5E1" strokeDasharray="2 4" strokeWidth={1} />
                  <Bar dataKey="rsi" name="RSI" maxBarSize={5} radius={[1, 1, 0, 0]}>
                    {rsiData.map((r, i) => {
                      const v = r.rsi ?? 50;
                      return <Cell key={i} fill={v >= 70 ? RSI_OB : v <= 30 ? RSI_OS : RSI_COLOR} fillOpacity={0.8} />;
                    })}
                  </Bar>
                  <Line dataKey="rsiLine" name="RSI(14)" stroke={RSI_COLOR} strokeWidth={1.5} dot={false} connectNulls legendType="none" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Volume + Z-Score ── */}
        {isConfigured && volumeCol && volData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Volume & Z-Score</CardTitle>
              <CardDescription>
                Bar color: green = up day · red = down day · Violet dashed = volume z-score (right axis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={volData} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(volData.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis yAxisId="vol"  tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={52}
                    domain={[0, (dataMax: number) => dataMax * 4]}
                    tickFormatter={v => v >= 1_000_000_000 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`} />
                  <YAxis yAxisId="zscore" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={36} tickFormatter={v => `${v.toFixed(1)}σ`} />
                  <Tooltip content={<SubTooltip formatter={(v: number, k: string) =>
                    k === 'volume'
                      ? v >= 1e9 ? `${(v/1e9).toFixed(2)}B` : `${(v/1e6).toFixed(1)}M`
                      : `${v >= 0 ? '+' : ''}${v.toFixed(2)}σ`} />} />
                  <ReferenceLine yAxisId="zscore" y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1} />
                  <Bar yAxisId="vol" dataKey="volume" name="Volume" maxBarSize={6}>
                    {volData.map((r, i) => (
                      <Cell key={i}
                        fill={i > 0 && volData[i - 1] && r.price >= volData[i - 1].price
                          ? '#10B981' : '#EF4444'}
                        fillOpacity={0.55} />
                    ))}
                  </Bar>
                  <Line yAxisId="zscore" dataKey="volZScore" name="Vol Z-Score"
                    stroke={BB_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && priceStats && indicatorSignals.length > 0 && (() => {
          const bullSigs  = indicatorSignals.filter(s => s.signal === 'Buy' || s.signal === 'Strong Buy');
          const bearSigs  = indicatorSignals.filter(s => s.signal === 'Sell' || s.signal === 'Strong Sell');
          const neutralSigs = indicatorSignals.filter(s => s.signal === 'Neutral');
          const last      = dashRows[dashRows.length - 1];
          const divergences: string[] = [];

          // Detect divergences
          if (last.rsi !== null && last.rsi >= 70 && (last.macdLine ?? 0) < 0)
            divergences.push('RSI overbought but MACD below zero');
          if (last.rsi !== null && last.rsi <= 30 && (last.sma20 ?? 0) > (last.sma50 ?? 0))
            divergences.push('RSI oversold but SMA trend still bullish');
          if (last.macdLine !== null && last.signalLine !== null && last.macdLine > last.signalLine
              && last.price < (last.sma50 ?? Infinity))
            divergences.push('MACD bullish cross but price below SMA50');
          if (last.volZScore !== null && last.volZScore > 1 && (last.histogram ?? 0) < 0)
            divergences.push('High volume spike but MACD histogram negative');

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated technical dashboard analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">Dashboard Overview</span>
                    <SignalBadge signal={overall.label} size="md" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Analyzed <span className="font-semibold">{dashRows.length.toLocaleString()}</span> trading days.
                    Latest price: <span className="font-mono font-semibold">{priceStats.last.toFixed(2)}</span>{' '}
                    (<span className={priceStats.pctChg >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                      {priceStats.pctChg >= 0 ? '+' : ''}{priceStats.pctChg.toFixed(1)}%
                    </span> period).
                    Composite score: <span className="font-mono font-semibold">{overall.score >= 0 ? '+' : ''}{overall.score}</span> — {overall.summary}.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Overall',          value: overall.label,                   sub: `Score ${overall.score >= 0 ? '+' : ''}${overall.score}` },
                    { label: 'Bullish Signals',  value: bullSigs.length,                 sub: bullSigs.map(s => s.name).join(', ') || '—' },
                    { label: 'Bearish Signals',  value: bearSigs.length,                 sub: bearSigs.map(s => s.name).join(', ') || '—' },
                    { label: 'Divergences',      value: divergences.length,              sub: divergences.length > 0 ? 'Review carefully' : 'None detected' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-lg font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground leading-tight">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Composite Signal — {overall.label}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {overall.label === 'Strong Buy' &&
                          'The majority of indicators are aligned bullishly. Trend structure, momentum, and volume are all pointing higher. This is a high-conviction long setup — though any market can reverse, the weight of evidence favors bulls.'}
                        {overall.label === 'Buy' &&
                          'More indicators are bullish than bearish, but alignment is not unanimous. The balance of evidence favors a bullish bias. Monitor the neutral or bearish indicators for potential confirmation or deterioration.'}
                        {overall.label === 'Neutral' &&
                          'Indicators are mixed or offsetting each other. No clear directional edge exists based on current technical readings. This is a waiting environment — reduce size or avoid new directional exposure until confluence improves.'}
                        {overall.label === 'Sell' &&
                          'More indicators are bearish than bullish. The weight of evidence suggests defensive positioning. Avoid new longs and consider tightening stops on existing positions.'}
                        {overall.label === 'Strong Sell' &&
                          'The majority of indicators are aligned bearishly. Trend, momentum, and volume all suggest downside pressure. This is a high-conviction defensive signal — the weight of evidence strongly favors bears.'}
                      </p>
                    </div>
                  </div>

                  {bullSigs.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Bullish Indicators ({bullSigs.length})
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {bullSigs.map(s => (
                            <span key={s.name}>
                              <span className="font-semibold text-emerald-600">{s.name}</span>
                              {': '}{s.detail}
                              {'. '}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  )}

                  {bearSigs.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Bearish Indicators ({bearSigs.length})
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {bearSigs.map(s => (
                            <span key={s.name}>
                              <span className="font-semibold text-red-500">{s.name}</span>
                              {': '}{s.detail}
                              {'. '}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  )}

                  {divergences.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-amber-400/50 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-amber-600 mb-0.5 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" />Indicator Divergences Detected
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {divergences.map((d, i) => (
                            <span key={i}>
                              <span className="font-semibold">{d}</span>
                              {i < divergences.length - 1 ? '. ' : '. '}
                            </span>
                          ))}
                          Indicator divergences do not guarantee a reversal but suggest reduced reliability of the current primary trend. Use tighter risk management until divergences resolve.
                        </p>
                      </div>
                    </div>
                  )}

                  {neutralSigs.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Neutral / Monitoring ({neutralSigs.length})
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {neutralSigs.map(s => s.name).join(', ')} — currently showing no clear directional bias.
                          A shift in these indicators to either bullish or bearish would increase conviction in the overall signal.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ All indicators auto-calculated from price and volume: SMA(20), SMA(50), EMA(12), EMA(26), BB(20,2σ), MACD(12,26,9), RSI(14), Volume Z-Score.
                  Composite score = average of per-indicator scores (Strong Buy=+2, Buy=+1, Neutral=0, Sell=−1, Strong Sell=−2).
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
'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Scatter, Cell,
  AreaChart, Area,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  TrendingUp, TrendingDown, Activity, Plus, Trash2, CheckCircle,
  FileText, Eye, X, ArrowUpDown,
} from 'lucide-react';
import type { AnalysisPageProps } from '@/components/finance-analytics-app';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Frequency = 'daily' | 'weekly' | 'monthly';
type Signal = 'peak' | 'trough' | 'golden' | 'death' | 'momentum_bull' | 'momentum_bear';

interface TurningPoint {
  idx:    number;
  price:  number;
  type:   Signal;
  label:  string;
  confirmed: boolean; // needs lookback bars after to confirm
}

interface AssetResult {
  name:      string;
  prices:    number[];
  n:         number;
  // Moving averages
  ma_short:  (number | null)[];
  ma_long:   (number | null)[];
  ema_short: (number | null)[];
  ema_long:  (number | null)[];
  // Momentum
  roc:       (number | null)[];   // rate of change
  rsi:       (number | null)[];
  macd:      (number | null)[];
  macd_sig:  (number | null)[];
  macd_hist: (number | null)[];
  // Turning points
  peaks:   TurningPoint[];
  troughs: TurningPoint[];
  crossovers: TurningPoint[];
  // Current state
  currentTrend: 'uptrend' | 'downtrend' | 'sideways';
  currentRSI:   number | null;
  currentMACD:  number | null;
  currentROC:   number | null;
  lastSignal:   TurningPoint | null;
  // Stats
  totalPeaks:   number;
  totalTroughs: number;
  avgCycleLen:  number | null;
}

// ─────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────

function sma(prices: number[], w: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < w - 1) return null;
    return prices.slice(i - w + 1, i + 1).reduce((s, v) => s + v, 0) / w;
  });
}

function ema(prices: number[], w: number): (number | null)[] {
  const k = 2 / (w + 1);
  const out: (number | null)[] = new Array(prices.length).fill(null);
  let val: number | null = null;
  for (let i = 0; i < prices.length; i++) {
    if (i < w - 1) { continue; }
    if (val === null) {
      val = prices.slice(0, w).reduce((s, v) => s + v, 0) / w;
      out[i] = val;
    } else {
      val = prices[i] * k + val * (1 - k);
      out[i] = val;
    }
  }
  return out;
}

function roc(prices: number[], period: number): (number | null)[] {
  return prices.map((p, i) => {
    if (i < period || prices[i - period] === 0) return null;
    return ((p - prices[i - period]) / prices[i - period]) * 100;
  });
}

function rsi(prices: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length <= period) return out;
  const changes = prices.map((p, i) => i === 0 ? 0 : p - prices[i - 1]);
  let avgGain = changes.slice(1, period + 1).filter(c => c > 0).reduce((s, v) => s + v, 0) / period;
  let avgLoss = changes.slice(1, period + 1).filter(c => c < 0).reduce((s, v) => s + Math.abs(v), 0) / period;
  for (let i = period; i < prices.length; i++) {
    const c = changes[i];
    avgGain = (avgGain * (period - 1) + Math.max(0, c)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -c)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function macdCalc(prices: number[], fast = 12, slow = 26, sig = 9) {
  const eFast = ema(prices, fast);
  const eSlow = ema(prices, slow);
  const macdLine = prices.map((_, i) => {
    const f = eFast[i], s = eSlow[i];
    return f !== null && s !== null ? f - s : null;
  });
  const validMacd = macdLine.filter((v): v is number => v !== null);
  const sigLine: (number | null)[] = new Array(prices.length).fill(null);
  let emaVal: number | null = null;
  const k = 2 / (sig + 1);
  let count = 0;
  for (let i = 0; i < prices.length; i++) {
    const m = macdLine[i];
    if (m === null) continue;
    count++;
    if (count < sig) continue;
    if (emaVal === null) {
      emaVal = validMacd.slice(0, sig).reduce((s, v) => s + v, 0) / sig;
    } else {
      emaVal = m * k + emaVal * (1 - k);
    }
    sigLine[i] = emaVal;
  }
  const hist = macdLine.map((m, i) => {
    const s = sigLine[i];
    return m !== null && s !== null ? m - s : null;
  });
  return { macd: macdLine, sig: sigLine, hist };
}

// Peak/Trough detection (zigzag with lookaround window)
function detectPeaksTroughs(prices: number[], window = 5): { peaks: number[]; troughs: number[] } {
  const peaks: number[] = [], troughs: number[] = [];
  for (let i = window; i < prices.length - window; i++) {
    const slice = prices.slice(i - window, i + window + 1);
    const center = prices[i];
    if (center === Math.max(...slice)) peaks.push(i);
    if (center === Math.min(...slice)) troughs.push(i);
  }
  return { peaks, troughs };
}

// MA crossover signals
function detectCrossovers(
  short: (number | null)[],
  long:  (number | null)[],
): { golden: number[]; death: number[] } {
  const golden: number[] = [], death: number[] = [];
  for (let i = 1; i < short.length; i++) {
    const cs = short[i], cl = long[i], ps = short[i-1], pl = long[i-1];
    if (cs === null || cl === null || ps === null || pl === null) continue;
    if (ps <= pl && cs > cl) golden.push(i);
    if (ps >= pl && cs < cl) death.push(i);
  }
  return { golden, death };
}

function computeResult(name: string, prices: number[], freq: Frequency, shortWin: number, longWin: number): AssetResult {
  const n = prices.length;
  const WIN = Math.min(5, Math.floor(n / 10));

  const maS  = sma(prices, shortWin);
  const maL  = sma(prices, longWin);
  const eS   = ema(prices, shortWin);
  const eL   = ema(prices, longWin);
  const rocV = roc(prices, Math.min(shortWin, Math.floor(n / 5)));
  const rsiV = rsi(prices, Math.min(14, Math.floor(n / 3)));
  const { macd: macdLine, sig: macdSig, hist: macdHist } = macdCalc(prices, Math.min(12, Math.floor(n/5)), Math.min(26, Math.floor(n/3)), 9);

  const { peaks, troughs } = detectPeaksTroughs(prices, WIN);
  const { golden, death }  = detectCrossovers(maS, maL);

  const peakPoints: TurningPoint[] = peaks.map(i => ({
    idx: i, price: prices[i], type: 'peak', label: 'Peak', confirmed: true,
  }));
  const troughPoints: TurningPoint[] = troughs.map(i => ({
    idx: i, price: prices[i], type: 'trough', label: 'Trough', confirmed: true,
  }));
  const crossPoints: TurningPoint[] = [
    ...golden.map(i => ({ idx: i, price: prices[i], type: 'golden' as Signal, label: 'Golden Cross', confirmed: true })),
    ...death.map(i =>  ({ idx: i, price: prices[i], type: 'death'  as Signal, label: 'Death Cross',  confirmed: true })),
  ].sort((a, b) => a.idx - b.idx);

  // Current trend from EMA
  const lastS = eS[n-1], lastL = eL[n-1];
  const currentTrend: AssetResult['currentTrend'] =
    lastS !== null && lastL !== null
      ? lastS > lastL * 1.001 ? 'uptrend' : lastS < lastL * 0.999 ? 'downtrend' : 'sideways'
      : 'sideways';

  const currentRSI  = rsiV[n-1] ?? null;
  const currentMACD = macdLine[n-1] ?? null;
  const currentROC  = rocV[n-1] ?? null;

  const allSignals = [...peakPoints, ...troughPoints, ...crossPoints].sort((a, b) => a.idx - b.idx);
  const lastSignal = allSignals[allSignals.length - 1] ?? null;

  // Average cycle length (peak-to-peak or trough-to-trough)
  let avgCycleLen: number | null = null;
  if (peaks.length >= 2) {
    const diffs = peaks.slice(1).map((p, i) => p - peaks[i]);
    avgCycleLen = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  } else if (troughs.length >= 2) {
    const diffs = troughs.slice(1).map((p, i) => p - troughs[i]);
    avgCycleLen = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  }

  return {
    name, prices, n,
    ma_short: maS, ma_long: maL,
    ema_short: eS, ema_long: eL,
    roc: rocV, rsi: rsiV,
    macd: macdLine, macd_sig: macdSig, macd_hist: macdHist,
    peaks: peakPoints, troughs: troughPoints, crossovers: crossPoints,
    currentTrend, currentRSI, currentMACD, currentROC,
    lastSignal,
    totalPeaks: peaks.length, totalTroughs: troughs.length,
    avgCycleLen,
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function detectAndNormalize(nums: number[]): number[] {
  return nums;  // prices, not returns
}

function parsePrices(str: string): number[] {
  return str.split(/[\s,;]+/).map(s => parseFloat(s)).filter(v => isFinite(v) && v > 0);
}

function fNum(n: number | null, d = 2): string {
  return n === null ? '—' : n.toFixed(d);
}
function fPct(n: number | null, d = 2): string {
  return n === null ? '—' : `${n.toFixed(d)}%`;
}

const PALETTE = ['#6C3AED','#10B981','#F59E0B','#3B82F6','#8B5CF6','#06B6D4'];

// ─────────────────────────────────────────────
// Demo data — price series with trends
// ─────────────────────────────────────────────

function seededWalk(n: number, start: number, mu: number, sigma: number, seed = 1): number[] {
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  const bm = () => Math.sqrt(-2 * Math.log(rand() || 1e-10)) * Math.cos(2 * Math.PI * rand());
  let p = start;
  return Array.from({ length: n }, () => {
    p = p * Math.exp(mu + sigma * bm());
    return parseFloat(p.toFixed(2));
  });
}

function defaultManual() {
  return [
    {
      id: '1', name: 'Growth Stock', enabled: true,
      prices: seededWalk(120, 100, 0.0006, 0.018, 7).join(', '),
    },
    {
      id: '2', name: 'Cyclical Stock', enabled: true,
      prices: seededWalk(120, 50, 0.0002, 0.022, 13).join(', '),
    },
  ];
}

function generateExampleCSV() {
  const a = seededWalk(120, 100, 0.0006, 0.018, 7);
  const b = seededWalk(120, 50,  0.0002, 0.022, 13);
  return a.map((_, i) => ({ period: i+1, growth_stock: a[i], cyclical_stock: b[i] }));
}

// ─────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────

const PriceTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">Period {label}</p>
      {payload.map((p: any) => p.value !== null && (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Intro
// ─────────────────────────────────────────────

const IntroPage = ({ onLoadExample, onManualEntry }: { onLoadExample: () => void; onManualEntry: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <ArrowUpDown className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Trend Turning Point</CardTitle>
        <CardDescription className="text-base mt-2">
          Detect price peaks, troughs, and trend reversals using MA crossovers, RSI, MACD, and rate-of-change — identifies where momentum shifts from bull to bear or vice versa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <ArrowUpDown className="w-6 h-6 text-primary mb-2" />,
              title: 'Peak & Trough Detection',
              desc: 'Identifies local price highs (peaks) and lows (troughs) using a configurable lookback window — marks confirmed turning points and calculates average cycle length.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'MA Crossover Signals',
              desc: 'Golden Cross (short MA crosses above long MA — bullish) and Death Cross (short crosses below long — bearish). Configurable short/long window parameters.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Momentum Indicators',
              desc: 'RSI (overbought >70 / oversold <30), MACD histogram (momentum direction), and Rate-of-Change — triangulate turning point signals across multiple dimensions.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Peak',         desc: 'Local high — potential sell signal' },
            { label: 'Trough',       desc: 'Local low — potential buy signal' },
            { label: 'Golden Cross', desc: 'Short MA > Long MA (bullish)' },
            { label: 'Death Cross',  desc: 'Short MA < Long MA (bearish)' },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-xs font-bold text-slate-700">{label}</div>
              <div className="text-xs text-muted-foreground mt-1">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />Input Format</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Price series (not returns). CSV: one column per asset, wide format.</p>
              <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600">
                <div>period, stock_a, stock_b</div>
                <div>1, 142.50, 85.20</div>
                <div>2, 144.10, 83.90</div>
                <div>3, 141.80, 86.40</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {['Price levels (not returns)', 'Min ~30 observations recommended', 'Multiple assets as separate columns', 'Daily / weekly / monthly frequency'].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <ArrowUpDown className="mr-2 h-5 w-5" />Load Example Data
          </Button>
          <Button onClick={onManualEntry} size="lg" variant="outline">
            <Plus className="mr-2 h-5 w-5" />Manual Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);


// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export default function TrendTurningPointPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,   setHasStarted]   = useState(false);
  const [inputMode,    setInputMode]    = useState<'manual' | 'csv'>('manual');
  const [manualAssets, setManualAssets] = useState<ReturnType<typeof defaultManual>>(defaultManual());
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [isDownloading,setIsDownloading]= useState(false);
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [freq,         setFreq]         = useState<Frequency>('daily');
  const [shortWin,     setShortWin]     = useState(20);
  const [longWin,      setLongWin]      = useState(50);
  const [chartTab,     setChartTab]     = useState<'price' | 'macd' | 'rsi' | 'roc'>('price');

  // CSV
  const [periodCol, setPeriodCol] = useState('');
  const [assetCols, setAssetCols] = useState<string[]>([]);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_turning_points.csv');
    setInputMode('csv');
    setHasStarted(true);
    setPeriodCol('period');
    setAssetCols(['growth_stock', 'cyclical_stock']);
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
    setActiveIdx(0);
    setPeriodCol(''); setAssetCols([]);
  }, [onClearData]);

  useMemo(() => {
    if (!hasData || assetCols.length) return;
    const hl = allHeaders.map(h => h.toLowerCase());
    const pi = hl.findIndex(h => ['period','date','time','month','week'].some(k => h.includes(k)));
    if (pi !== -1) setPeriodCol(allHeaders[pi]);
    setAssetCols(numericHeaders.filter(h => h !== allHeaders[pi]).slice(0, 6));
  }, [hasData, allHeaders, numericHeaders, assetCols.length]);

  // ── Build inputs ──────────────────────────────────────────
  const rawInputs = useMemo((): { name: string; prices: number[] }[] => {
    if (inputMode === 'csv' && hasData && assetCols.length) {
      return assetCols.map(col => {
        const nums = data.map(r => parseFloat(String(r[col] ?? ''))).filter(v => isFinite(v) && v > 0);
        return { name: col, prices: nums };
      }).filter(a => a.prices.length >= 10);
    }
    return manualAssets
      .filter(a => a.enabled && a.name.trim())
      .map(a => ({ name: a.name.trim(), prices: parsePrices(a.prices) }))
      .filter(a => a.prices.length >= 10);
  }, [inputMode, hasData, data, assetCols, manualAssets]);

  const results = useMemo<AssetResult[]>(() =>
    rawInputs.map(a => computeResult(a.name, a.prices, freq, shortWin, longWin)),
    [rawInputs, freq, shortWin, longWin]
  );

  const isConfigured = results.length > 0;
  const active = results[Math.min(activeIdx, results.length - 1)] ?? null;
  const isExample = (fileName ?? '').startsWith('example_');

  // ── Chart data for active asset ───────────────────────────
  const priceChartData = useMemo(() => {
    if (!active) return [];
    const peakSet   = new Set(active.peaks.map(p => p.idx));
    const troughSet = new Set(active.troughs.map(p => p.idx));
    const goldSet   = new Set(active.crossovers.filter(c => c.type === 'golden').map(c => c.idx));
    const deathSet  = new Set(active.crossovers.filter(c => c.type === 'death').map(c => c.idx));

    return active.prices.map((p, i) => ({
      idx:      i + 1,
      price:    p,
      ma_s:     active.ma_short[i] !== null ? parseFloat((active.ma_short[i] as number).toFixed(2)) : null,
      ma_l:     active.ma_long[i]  !== null ? parseFloat((active.ma_long[i]  as number).toFixed(2)) : null,
      peak:     peakSet.has(i)   ? p : null,
      trough:   troughSet.has(i) ? p : null,
      golden:   goldSet.has(i)   ? p : null,
      death:    deathSet.has(i)  ? p : null,
    }));
  }, [active]);

  const macdChartData = useMemo(() => {
    if (!active) return [];
    return active.prices.map((_, i) => ({
      idx:  i + 1,
      macd: active.macd[i] !== null ? parseFloat((active.macd[i] as number).toFixed(4)) : null,
      sig:  active.macd_sig[i] !== null ? parseFloat((active.macd_sig[i] as number).toFixed(4)) : null,
      hist: active.macd_hist[i] !== null ? parseFloat((active.macd_hist[i] as number).toFixed(4)) : null,
    }));
  }, [active]);

  const rsiChartData = useMemo(() => {
    if (!active) return [];
    return active.prices.map((_, i) => ({
      idx: i + 1,
      rsi: active.rsi[i] !== null ? parseFloat((active.rsi[i] as number).toFixed(2)) : null,
    }));
  }, [active]);

  const rocChartData = useMemo(() => {
    if (!active) return [];
    return active.prices.map((_, i) => ({
      idx: i + 1,
      roc: active.roc[i] !== null ? parseFloat((active.roc[i] as number).toFixed(2)) : null,
    }));
  }, [active]);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = results.map(r => ({
      asset:          r.name,
      n:              r.n,
      trend:          r.currentTrend,
      total_peaks:    r.totalPeaks,
      total_troughs:  r.totalTroughs,
      avg_cycle_len:  fNum(r.avgCycleLen),
      current_rsi:    fNum(r.currentRSI),
      current_macd:   fNum(r.currentMACD, 4),
      current_roc:    fPct(r.currentROC),
      last_signal:    r.lastSignal?.label ?? '—',
      last_signal_idx:r.lastSignal?.idx ?? '—',
      golden_crosses: r.crossovers.filter(c => c.type === 'golden').length,
      death_crosses:  r.crossovers.filter(c => c.type === 'death').length,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `TurningPoints_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, results, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `TurningPoints_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  if (!hasData && !hasStarted) return (
    <IntroPage onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }} />
  );

  const toggleCol = (col: string) =>
    setAssetCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const trendColor = (t: AssetResult['currentTrend']) =>
    t === 'uptrend' ? 'text-primary' : t === 'downtrend' ? 'text-slate-700' : 'text-slate-500';

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-8">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">
            {hasData ? (fileName || 'Uploaded file') : 'Manual Entry'}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {isConfigured
              ? `${results.length} asset${results.length !== 1 ? 's' : ''} · MA(${shortWin},${longWin})`
              : hasData ? `${data.length} rows` : `${manualAssets.length} assets`}
          </span>
          {isExample && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
          )}
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' }));
                link.download = (fileName || 'data').replace(/\.csv$/, '') + '_raw.csv';
                link.click();
                toast({ title: 'Raw data downloaded' });
              }} title="Download raw CSV"><Download className="h-4 w-4" /></Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={handleClearAll}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {hasData && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" />{fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-auto flex-1 min-h-0 rounded-md border border-slate-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b">
                    {allHeaders.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50/50">
                      {allHeaders.map(h => <td key={h} className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">{String(row[h] ?? '-')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 4</span>
            <span className="text-xs text-muted-foreground">Risk Management</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />Trend Turning Point
          </CardTitle>
          <CardDescription>
            Peak/trough detection with configurable lookback · Golden/Death Cross (MA crossover) · RSI overbought/oversold · MACD momentum · Rate-of-Change
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Input ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription className="mt-0.5">
                {inputMode === 'csv' ? 'Select price columns from uploaded data.' : 'Enter comma-separated price series per asset.'}
              </CardDescription>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant={inputMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setInputMode('manual')}>Manual</Button>
              {hasData
                ? <Button size="sm" variant={inputMode === 'csv' ? 'default' : 'outline'}
                    onClick={() => setInputMode('csv')}>CSV</Button>
                : <Button size="sm" variant="outline" onClick={handleLoadExample}>Load Example</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* CSV */}
          {inputMode === 'csv' && hasData && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">PERIOD COLUMN</Label>
                <Select value={periodCol || '__none__'} onValueChange={v => setPeriodCol(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8 w-48"><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  PRICE COLUMNS — {assetCols.length} selected
                </Label>
                <div className="flex flex-wrap gap-2">
                  {numericHeaders.filter(h => h !== periodCol).map(h => (
                    <button key={h} onClick={() => toggleCol(h)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors ${
                        assetCols.includes(h)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                      }`}>{h}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual */}
          {inputMode === 'manual' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['On','Asset Name','Price Series',''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualAssets.map(a => (
                      <tr key={a.id} className={`border-t hover:bg-slate-50/50 ${!a.enabled ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-1.5">
                          <input type="checkbox" checked={a.enabled}
                            onChange={e => setManualAssets(prev => prev.map(x => x.id !== a.id ? x : { ...x, enabled: e.target.checked }))}
                            className="w-4 h-4 accent-primary cursor-pointer" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-32 font-semibold" value={a.name}
                            onChange={e => setManualAssets(prev => prev.map(x => x.id !== a.id ? x : { ...x, name: e.target.value }))}
                            placeholder="Asset A" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[380px]" value={a.prices}
                            onChange={e => setManualAssets(prev => prev.map(x => x.id !== a.id ? x : { ...x, prices: e.target.value }))}
                            placeholder="142.5, 144.1, 141.8, 146.2, …" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => { setManualAssets(prev => prev.filter(x => x.id !== a.id)); setActiveIdx(0); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm"
                onClick={() => setManualAssets(prev => [...prev, { id: String(Date.now()), name: `Asset ${prev.length + 1}`, enabled: true, prices: '' }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Asset
              </Button>
            </div>
          )}

          {/* Parameters */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">SHORT MA</Label>
              <Input className="h-8 text-xs w-16 font-mono text-center" value={String(shortWin)}
                onChange={e => { const v = parseInt(e.target.value); if (v > 0 && v < longWin) setShortWin(v); }}
                type="number" min={2} max={longWin - 1} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">LONG MA</Label>
              <Input className="h-8 text-xs w-16 font-mono text-center" value={String(longWin)}
                onChange={e => { const v = parseInt(e.target.value); if (v > shortWin) setLongWin(v); }}
                type="number" min={shortWin + 1} max={500} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground">FREQUENCY</Label>
              <div className="flex gap-1">
                {(['daily','weekly','monthly'] as Frequency[]).map(f => (
                  <Button key={f} size="sm" variant={freq === f ? 'default' : 'outline'}
                    className="h-8 px-2.5 text-xs capitalize" onClick={() => setFreq(f)}>{f}</Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Controls + Export ── */}
      {isConfigured && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          {results.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Detail view</Label>
              <Select value={String(activeIdx)} onValueChange={v => setActiveIdx(Number(v))}>
                <SelectTrigger className="text-xs h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {results.map((r, i) => <SelectItem key={i} value={String(i)}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (All Metrics)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && active && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Trend</div>
            <div className={`text-2xl font-bold font-mono capitalize ${trendColor(active.currentTrend)}`}>
              {active.currentTrend === 'uptrend' ? '↑' : active.currentTrend === 'downtrend' ? '↓' : '→'} {active.currentTrend}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">EMA({shortWin}) vs EMA({longWin})</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">RSI</div>
            <div className={`text-2xl font-bold font-mono ${
              active.currentRSI !== null && active.currentRSI > 70 ? 'text-slate-800' :
              active.currentRSI !== null && active.currentRSI < 30 ? 'text-primary' : 'text-slate-600'
            }`}>{fNum(active.currentRSI, 1)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {active.currentRSI === null ? '—' :
               active.currentRSI > 70 ? 'Overbought' :
               active.currentRSI < 30 ? 'Oversold' : 'Neutral'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Turning Points</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.totalPeaks + active.totalTroughs}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {active.totalPeaks} peaks · {active.totalTroughs} troughs
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Last Signal</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.lastSignal?.type === 'golden' ? 'Golden' :
               active.lastSignal?.type === 'death'  ? 'Death' :
               active.lastSignal?.type === 'peak'   ? 'Peak' :
               active.lastSignal?.type === 'trough' ? 'Trough' : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {active.lastSignal ? `Period ${active.lastSignal.idx + 1} · ${active.lastSignal.label}` : 'No signals'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Detail Charts ── */}
        {isConfigured && active && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base shrink-0">
                  {chartTab === 'price' ? 'Price & Signals' :
                   chartTab === 'macd'  ? 'MACD' :
                   chartTab === 'rsi'   ? 'RSI' : 'Rate of Change'}
                </CardTitle>
                <div className="flex gap-1 shrink-0">
                  {([
                    { key: 'price', label: 'Price' },
                    { key: 'macd',  label: 'MACD' },
                    { key: 'rsi',   label: 'RSI' },
                    { key: 'roc',   label: 'ROC' },
                  ] as const).map(t => (
                    <Button key={t.key} size="sm"
                      variant={chartTab === t.key ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setChartTab(t.key)}>{t.label}</Button>
                  ))}
                </div>
              </div>
              <CardDescription className="mt-1">
                {chartTab === 'price' ? `${active.name} · MA(${shortWin},${longWin}) · peaks ▲ troughs ▼ · golden/death crosses`  :
                 chartTab === 'macd'  ? 'MACD line, signal line, histogram · fast=12 slow=26 sig=9' :
                 chartTab === 'rsi'   ? 'RSI(14) · overbought >70 oversold <30' :
                 `Rate-of-Change(${Math.min(shortWin, Math.floor(active.n / 5))}) · momentum proxy`}
              </CardDescription>
            </CardHeader>
            <CardContent>

              {/* Price + signals */}
              {chartTab === 'price' && priceChartData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={priceChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.1} />
                          <stop offset="95%" stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        domain={['auto', 'auto']} />
                      <Tooltip content={<PriceTip />} />
                      <Area type="monotone" dataKey="price" name="Price"
                        stroke={PALETTE[activeIdx % PALETTE.length]} fill="url(#priceGrad)"
                        strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ma_s" name={`MA(${shortWin})`}
                        stroke="#94A3B8" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="ma_l" name={`MA(${longWin})`}
                        stroke="#475569" strokeWidth={1.5} dot={false} connectNulls />
                      {/* Peaks */}
                      <Scatter dataKey="peak" name="Peak" fill="transparent"
                        shape={(props: any) => {
                          const { cx, cy } = props;
                          if (cy === null || isNaN(cy)) return <g/>;
                          return <text x={cx} y={cy - 8} textAnchor="middle" fontSize={10} fill="#475569">▲</text>;
                        }} />
                      {/* Troughs */}
                      <Scatter dataKey="trough" name="Trough" fill="transparent"
                        shape={(props: any) => {
                          const { cx, cy } = props;
                          if (cy === null || isNaN(cy)) return <g/>;
                          return <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill={PALETTE[activeIdx % PALETTE.length]}>▼</text>;
                        }} />
                      {/* Golden cross */}
                      <Scatter dataKey="golden" name="Golden Cross" fill="transparent"
                        shape={(props: any) => {
                          const { cx, cy } = props;
                          if (cy === null || isNaN(cy)) return <g/>;
                          return <text x={cx} y={cy - 18} textAnchor="middle" fontSize={9} fill="#475569">✕G</text>;
                        }} />
                      {/* Death cross */}
                      <Scatter dataKey="death" name="Death Cross" fill="transparent"
                        shape={(props: any) => {
                          const { cx, cy } = props;
                          if (cy === null || isNaN(cy)) return <g/>;
                          return <text x={cx} y={cy + 22} textAnchor="middle" fontSize={9} fill="#94A3B8">✕D</text>;
                        }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-slate-400" style={{borderTop:'2px dashed'}} />MA({shortWin})</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-slate-600" />MA({longWin})</div>
                    <div className="flex items-center gap-1.5"><span className="text-slate-600">▲</span> Peak</div>
                    <div className="flex items-center gap-1.5"><span style={{color: PALETTE[activeIdx % PALETTE.length]}}>▼</span> Trough</div>
                    <div className="flex items-center gap-1.5"><span className="text-slate-600 font-mono text-xs">✕G</span> Golden Cross</div>
                    <div className="flex items-center gap-1.5"><span className="text-slate-400 font-mono text-xs">✕D</span> Death Cross</div>
                  </div>
                </>
              )}

              {/* MACD */}
              {chartTab === 'macd' && macdChartData.length > 0 && (
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={macdChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<PriceTip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                    <Bar dataKey="hist" name="Histogram" maxBarSize={6}>
                      {macdChartData.map((d, i) => (
                        <Cell key={i}
                          fill={d.hist !== null && d.hist >= 0
                            ? PALETTE[activeIdx % PALETTE.length]
                            : '#94A3B8'}
                          fillOpacity={0.7} />
                      ))}
                    </Bar>
                    <Line dataKey="macd" name="MACD" type="monotone"
                      stroke={PALETTE[activeIdx % PALETTE.length]} strokeWidth={1.5} dot={false} connectNulls />
                    <Line dataKey="sig" name="Signal" type="monotone"
                      stroke="#94A3B8" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 2" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {/* RSI */}
              {chartTab === 'rsi' && rsiChartData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={rsiChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}`, 'RSI']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={70} stroke="#CBD5E1" strokeDasharray="4 2" strokeWidth={1}
                      label={{ value: '70', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                    <ReferenceLine y={30} stroke="#CBD5E1" strokeDasharray="4 2" strokeWidth={1}
                      label={{ value: '30', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                    <ReferenceLine y={50} stroke="#E2E8F0" strokeWidth={1} />
                    <Area dataKey="rsi" name="RSI" type="monotone"
                      stroke={PALETTE[activeIdx % PALETTE.length]} fill="url(#rsiGrad)"
                      strokeWidth={2} dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* ROC */}
              {chartTab === 'roc' && rocChartData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={rocChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'ROC']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                    <Bar dataKey="roc" name="ROC %" maxBarSize={6}>
                      {rocChartData.map((d, i) => (
                        <Cell key={i}
                          fill={(d.roc ?? 0) >= 0 ? PALETTE[activeIdx % PALETTE.length] : '#94A3B8'}
                          fillOpacity={0.75} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Turning Point Log ── */}
        {isConfigured && active && (() => {
          const allSignals = [
            ...active.peaks, ...active.troughs, ...active.crossovers,
          ].sort((a, b) => b.idx - a.idx).slice(0, 20);
          return allSignals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Signal Log — {active.name}</CardTitle>
                <CardDescription>Most recent 20 turning points and crossover signals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Period','Signal','Price','Type'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allSignals.map((s, i) => (
                        <tr key={i} className="border-t hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono text-slate-500">{s.idx + 1}</td>
                          <td className="px-3 py-2 font-semibold text-slate-700">{s.label}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{s.price.toFixed(2)}</td>
                          <td className={`px-3 py-2 font-semibold text-xs ${
                            s.type === 'golden' ? 'text-primary' :
                            s.type === 'trough' ? 'text-primary' :
                            'text-slate-500'
                          }`}>
                            {s.type === 'peak'    ? '▲ Peak' :
                             s.type === 'trough'  ? '▼ Trough' :
                             s.type === 'golden'  ? '✕ Bullish' :
                             '✕ Bearish'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Cross-asset table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Trend Summary
              </CardTitle>
              <CardDescription>Click row to switch detail view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Asset','Trend','RSI','MACD','ROC','Peaks','Troughs','Avg Cycle','Golden ✕','Death ✕','Last Signal'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i}
                        className={`border-t hover:bg-slate-50/50 cursor-pointer ${i === activeIdx ? 'bg-primary/5' : ''}`}
                        onClick={() => setActiveIdx(i)}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                            <span className="font-semibold text-slate-700">{r.name}</span>
                          </div>
                        </td>
                        <td className={`px-3 py-2 font-semibold capitalize ${trendColor(r.currentTrend)}`}>{r.currentTrend}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.currentRSI, 1)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.currentMACD, 4)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.currentROC)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.totalPeaks}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.totalTroughs}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {r.avgCycleLen ? `${r.avgCycleLen.toFixed(0)}p` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-primary">
                          {r.crossovers.filter(c => c.type === 'golden').length}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {r.crossovers.filter(c => c.type === 'death').length}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.lastSignal ? `${r.lastSignal.label} (p${r.lastSignal.idx + 1})` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && active && (() => {
          const gc = active.crossovers.filter(c => c.type === 'golden').length;
          const dc = active.crossovers.filter(c => c.type === 'death').length;
          const rsiOb = active.currentRSI !== null && active.currentRSI > 70;
          const rsiOs = active.currentRSI !== null && active.currentRSI < 30;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>
                  {active.name} · MA({shortWin},{longWin}) · {active.n} periods · {freq}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Trend Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    <span className="font-semibold">{active.name}</span> is currently in an{' '}
                    <span className={`font-semibold capitalize ${trendColor(active.currentTrend)}`}>{active.currentTrend}</span>{' '}
                    based on EMA({shortWin}) vs EMA({longWin}).{' '}
                    {active.totalPeaks + active.totalTroughs} turning points were detected over {active.n} periods{active.avgCycleLen ? `, with an average cycle length of ${active.avgCycleLen.toFixed(0)} periods` : ''}.{' '}
                    {gc > dc
                      ? `${gc} golden crosses vs ${dc} death crosses — net bullish crossover bias.`
                      : dc > gc
                      ? `${dc} death crosses vs ${gc} golden crosses — net bearish crossover bias.`
                      : `${gc} golden and ${dc} death crosses — balanced crossover history.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Trend',       value: active.currentTrend,                       sub: `EMA(${shortWin},${longWin})` },
                    { label: 'RSI',         value: fNum(active.currentRSI, 1),                sub: rsiOb ? 'Overbought' : rsiOs ? 'Oversold' : 'Neutral' },
                    { label: 'MACD',        value: fNum(active.currentMACD, 4),               sub: (active.currentMACD ?? 0) > 0 ? 'Positive' : 'Negative' },
                    { label: 'Avg Cycle',   value: active.avgCycleLen ? `${active.avgCycleLen.toFixed(0)}p` : '—', sub: 'Peak-to-peak' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-base font-bold font-mono text-slate-700 capitalize">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signal Analysis</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">MA Crossover</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {active.crossovers.length === 0
                          ? `No MA(${shortWin}/${longWin}) crossovers detected over the ${active.n}-period window. The trend has been persistent without a crossover reversal signal.`
                          : `${gc} golden cross${gc !== 1 ? 'es' : ''} and ${dc} death cross${dc !== 1 ? 'es' : ''} over ${active.n} periods.
                           ${active.lastSignal?.type === 'golden' ? `The most recent signal was a Golden Cross at period ${active.lastSignal.idx + 1} — short MA crossed above long MA, indicating potential upward momentum.` :
                             active.lastSignal?.type === 'death'  ? `The most recent signal was a Death Cross at period ${active.lastSignal.idx + 1} — short MA crossed below long MA, a classic bearish reversal signal.` :
                             `Most recent crossover at period ${active.crossovers[active.crossovers.length - 1]?.idx + 1}.`}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">RSI Momentum</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Current RSI(14) = <span className="font-semibold">{fNum(active.currentRSI, 1)}</span>.{' '}
                        {rsiOb
                          ? 'Above 70 — overbought territory. Price has moved aggressively upward; risk of a short-term pullback or consolidation is elevated. Monitor for divergence with price.'
                          : rsiOs
                          ? 'Below 30 — oversold territory. Selling pressure may be exhausted; probability of a near-term bounce or trend reversal is increased.'
                          : active.currentRSI !== null
                          ? `RSI is in neutral territory (30–70). No extreme momentum reading — trend continuation is not contradicted by RSI.`
                          : 'Insufficient data for RSI calculation.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Peak & Trough Cycle</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {active.totalPeaks} peaks and {active.totalTroughs} troughs detected.{' '}
                        {active.avgCycleLen
                          ? `Average peak-to-peak cycle length is ${active.avgCycleLen.toFixed(0)} periods — useful for timing re-entry or exit windows around turning points.`
                          : 'Insufficient peaks to calculate average cycle length. Longer time series recommended.'}
                        {active.lastSignal?.type === 'peak'
                          ? ` Most recent peak at period ${active.lastSignal.idx + 1} (price ${active.lastSignal.price.toFixed(2)}) — potential resistance level.`
                          : active.lastSignal?.type === 'trough'
                          ? ` Most recent trough at period ${active.lastSignal.idx + 1} (price ${active.lastSignal.price.toFixed(2)}) — potential support level.`
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Peaks/troughs detected using a symmetric {Math.min(5, Math.floor(active.n / 10))}-period lookback window.
                  MA = simple moving average. EMA uses multiplier k=2/(w+1).
                  RSI(14) = Wilder smoothing. MACD = EMA(12)−EMA(26), signal = EMA(9).
                  Rate-of-Change = (P_t − P_(t-n)) / P_(t-n) × 100.
                  All signals are lagging indicators — past turning points do not guarantee future reversals.
                  This analysis is auto-generated and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

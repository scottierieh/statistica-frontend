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
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  TrendingUp, Activity, Plus, Trash2, CheckCircle,
  FileText, Eye, X, Waves,
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

interface AssetInput {
  id:      string;
  name:    string;
  enabled: boolean;
  returns: string;
}

interface VolResult {
  name:     string;
  returns:  number[];
  n:        number;
  // Historical vol
  histVol:      number;   // full-period annualized
  histVolPct:   number;   // as %
  // Rolling vol series (window)
  rollingVol:   { idx: number; vol: number }[];
  // EWMA vol (λ=0.94)
  ewmaVol:      number;
  ewmaSeries:   { idx: number; vol: number }[];
  // Parkinson (high-low if available, else null)
  parkinsonVol: number | null;
  // Vol of vol
  volOfVol:     number;
  // Skewness & kurtosis of returns
  skew:         number;
  kurt:         number;
  // Vol term structure projection (1d, 5d, 10d, 21d, 63d, 126d, 252d)
  termStructure: { horizon: string; annVol: number; rawVol: number }[];
  // Realised percentile vs own history
  currentPct:   number;   // 0-100: where is current (last 20-period) vol vs full history
  regime:       'low' | 'normal' | 'elevated' | 'stress';
  // Return distribution histogram
  histData:     { bin: string; midpt: number; count: number }[];
  // Autocorrelation of |returns| (vol clustering indicator)
  absAutoCorr:  number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function detectAndNormalize(nums: number[]): number[] {
  const isPercent = nums.some(n => Math.abs(n) > 1);
  return isPercent ? nums.map(n => n / 100) : nums;
}

function parseReturns(str: string): number[] {
  const nums = str.split(/[\s,;]+/).map(s => parseFloat(s)).filter(v => isFinite(v));
  return detectAndNormalize(nums);
}

function annFactor(freq: Frequency): number {
  if (freq === 'weekly')  return 52;
  if (freq === 'monthly') return 12;
  return 252;
}

function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

function stdDev(a: number[], m?: number): number {
  if (a.length < 2) return 0;
  const mu = m ?? mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - mu) ** 2, 0) / (a.length - 1));
}

function skewness(a: number[]): number {
  const n = a.length;
  if (n < 3) return 0;
  const mu = mean(a), sig = stdDev(a, mu);
  if (sig === 0) return 0;
  return (n / ((n-1)*(n-2))) * a.reduce((s, v) => s + ((v - mu)/sig)**3, 0);
}

function excessKurt(a: number[]): number {
  const n = a.length;
  if (n < 4) return 0;
  const mu = mean(a), sig = stdDev(a, mu);
  if (sig === 0) return 0;
  const raw = (n*(n+1))/((n-1)*(n-2)*(n-3)) * a.reduce((s, v) => s + ((v-mu)/sig)**4, 0);
  return raw - (3*(n-1)**2)/((n-2)*(n-3));
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function volRegime(pct: number): VolResult['regime'] {
  if (pct >= 85) return 'stress';
  if (pct >= 60) return 'elevated';
  if (pct >= 25) return 'normal';
  return 'low';
}

function computeVol(name: string, rets: number[], freq: Frequency): VolResult {
  const n   = rets.length;
  const ann = annFactor(freq);
  const mu  = mean(rets);

  // Full-period historical vol
  const histVol = stdDev(rets, mu) * Math.sqrt(ann);

  // Rolling vol (window = min(20, n/4))
  const WIN = Math.max(5, Math.min(20, Math.floor(n / 4)));
  const rollingVol: VolResult['rollingVol'] = [];
  for (let i = WIN; i <= n; i++) {
    const slice = rets.slice(i - WIN, i);
    rollingVol.push({ idx: i, vol: parseFloat((stdDev(slice) * Math.sqrt(ann) * 100).toFixed(3)) });
  }

  // EWMA (λ=0.94 RiskMetrics)
  const LAMBDA = 0.94;
  let ewmaVar = rets.slice(0, 10).reduce((s, r) => s + r * r, 0) / 10;
  const ewmaSeries: VolResult['ewmaSeries'] = [];
  for (let i = 0; i < n; i++) {
    ewmaVar = LAMBDA * ewmaVar + (1 - LAMBDA) * rets[i] ** 2;
    if (i >= WIN - 1)
      ewmaSeries.push({ idx: i + 1, vol: parseFloat((Math.sqrt(ewmaVar * ann) * 100).toFixed(3)) });
  }
  const ewmaVol = Math.sqrt(ewmaVar * ann);

  // Vol of vol (std dev of rolling vol series)
  const rvVals = rollingVol.map(r => r.vol / 100);
  const volOfVol = stdDev(rvVals) * Math.sqrt(ann);

  // Term structure: square-root-of-time scaling from current EWMA vol
  const horizons = [
    { label: '1d',   T: 1 },
    { label: '5d',   T: 5 },
    { label: '10d',  T: 10 },
    { label: '21d',  T: 21 },
    { label: '63d',  T: 63 },
    { label: '126d', T: 126 },
    { label: '252d', T: 252 },
  ];
  // Mean-reversion toward long-run vol (Vasicek-style)
  const kappa    = 0.05;  // mean-reversion speed per day
  const longRunVol = histVol;
  const termStructure = horizons.map(({ label, T }) => {
    // OU mean-reversion: σ(T) = σ_LR + (σ_now - σ_LR)*exp(-κT)
    const annVol = longRunVol + (ewmaVol - longRunVol) * Math.exp(-kappa * T);
    const rawVol = annVol / Math.sqrt(ann / T);  // period vol over T days
    return { horizon: label, annVol: parseFloat((annVol * 100).toFixed(2)), rawVol: parseFloat((rawVol * 100).toFixed(2)) };
  });

  // Current percentile vs own history
  const rvSorted = [...rvVals].sort((a, b) => a - b);
  const curVol   = ewmaVol;
  const belowCur = rvSorted.filter(v => v <= curVol).length;
  const currentPct = rvSorted.length > 0 ? (belowCur / rvSorted.length) * 100 : 50;

  // Autocorrelation of |returns| at lag 1 (vol clustering)
  const absRets = rets.map(Math.abs);
  const absMu   = mean(absRets);
  let num = 0, den = 0;
  for (let i = 1; i < n; i++) {
    num += (absRets[i] - absMu) * (absRets[i - 1] - absMu);
    den += (absRets[i] - absMu) ** 2;
  }
  const absAutoCorr = den > 0 ? num / den : 0;

  // Return histogram (28 bins)
  const mn = Math.min(...rets), mx = Math.max(...rets);
  const bins = 28;
  const bw   = (mx - mn) / bins || 0.001;
  const counts = new Array(bins).fill(0);
  for (const r of rets) counts[Math.min(bins - 1, Math.floor((r - mn) / bw))]++;
  const histData = counts.map((count, i) => ({
    bin:   ((mn + (i + 0.5) * bw) * 100).toFixed(2) + '%',
    midpt: mn + (i + 0.5) * bw,
    count,
  }));

  return {
    name, returns: rets, n,
    histVol, histVolPct: histVol * 100,
    rollingVol, ewmaVol, ewmaSeries,
    parkinsonVol: null,
    volOfVol, skew: skewness(rets), kurt: excessKurt(rets),
    termStructure, currentPct,
    regime: volRegime(currentPct),
    histData, absAutoCorr,
  };
}

// ─────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────

function fPct(n: number | null, d = 2): string {
  if (n === null) return '—';
  return `${n.toFixed(d)}%`;
}
function fNum(n: number | null, d = 3): string {
  if (n === null) return '—';
  return n.toFixed(d);
}
function fSign(n: number, d = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(d)}`;
}

function regimeBadge(r: VolResult['regime']): string {
  if (r === 'stress')   return 'text-slate-800 font-bold';
  if (r === 'elevated') return 'text-slate-600';
  if (r === 'normal')   return 'text-slate-500';
  return 'text-slate-400';
}

const PALETTE = ['#6C3AED','#10B981','#F59E0B','#3B82F6','#8B5CF6','#06B6D4','#EC4899','#84CC16'];
const PRIMARY = '#6C3AED';

// ─────────────────────────────────────────────
// Demo data — 3 assets × 200 daily returns
// ─────────────────────────────────────────────

function seededRet(mu: number, sigma: number, n: number, seed = 42): number[] {
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  const boxMuller = () => {
    const u1 = rand() || 1e-10, u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const rets: number[] = [];
  let vol = sigma;
  for (let i = 0; i < n; i++) {
    vol = 0.94 * vol + 0.06 * sigma * (0.5 + rand());
    rets.push(mu + vol * boxMuller());
  }
  return rets;
}

const DEMO_ASSETS: { name: string; mu: number; sigma: number; seed: number }[] = [
  { name: 'Growth ETF',  mu: 0.0005, sigma: 0.016, seed: 11 },
  { name: 'Bond Fund',   mu: 0.0002, sigma: 0.006, seed: 22 },
  { name: 'Hedge Fund',  mu: 0.0004, sigma: 0.011, seed: 33 },
];

function defaultManual(): AssetInput[] {
  return DEMO_ASSETS.map((d, i) => {
    const rets = seededRet(d.mu, d.sigma, 200, d.seed);
    return {
      id:      String(i + 1),
      name:    d.name,
      enabled: true,
      returns: rets.map(r => (r * 100).toFixed(3)).join(', '),
    };
  });
}

function generateExampleCSV(): Record<string, any>[] {
  const series = DEMO_ASSETS.map(d => seededRet(d.mu, d.sigma, 200, d.seed));
  return series[0].map((_, i) => {
    const row: Record<string, any> = { period: i + 1 };
    DEMO_ASSETS.forEach((d, j) => {
      row[d.name.replace(/\s+/g, '_').toLowerCase()] = (series[j][i] * 100).toFixed(4);
    });
    return row;
  });
}

// ─────────────────────────────────────────────
// Custom Tooltips
// ─────────────────────────────────────────────

const LineTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-600 mb-1.5">Period {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{p.value !== null ? `${p.value}%` : '—'}</span>
        </div>
      ))}
    </div>
  );
};

const TermTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{fPct(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Intro Page
// ─────────────────────────────────────────────

const IntroPage = ({ onLoadExample, onManualEntry }: {
  onLoadExample: () => void;
  onManualEntry: () => void;
}) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Waves className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Volatility Projection</CardTitle>
        <CardDescription className="text-base mt-2">
          Project forward volatility using Historical Vol, EWMA (RiskMetrics), and mean-reverting term structure — with rolling vol analysis, vol-of-vol, and regime detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Historical & EWMA Vol',
              desc: 'Full-period historical volatility (annualized) and EWMA (λ=0.94, RiskMetrics standard) — shows current vol level vs long-run average with vol-of-vol and clustering metrics.',
            },
            {
              icon: <Waves className="w-6 h-6 text-primary mb-2" />,
              title: 'Term Structure',
              desc: 'Projects annualized volatility across horizons (1d → 252d) using mean-reversion toward long-run vol (Ornstein-Uhlenbeck). Captures vol-curve shape: contango or backwardation.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Regime Detection',
              desc: 'Compares current EWMA vol to the full rolling-vol history — outputs a percentile rank and regime label (Low / Normal / Elevated / Stress) to contextualise risk.',
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
            { label: 'Low',      cls: 'text-slate-400', desc: 'Vol pct < 25th' },
            { label: 'Normal',   cls: 'text-slate-500', desc: '25th–60th pct' },
            { label: 'Elevated', cls: 'text-slate-600', desc: '60th–85th pct' },
            { label: 'Stress',   cls: 'text-slate-800 font-bold', desc: 'Vol pct ≥ 85th' },
          ].map(({ label, cls, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className={`text-xs font-semibold ${cls}`}>{label}</div>
              <div className="text-xs text-muted-foreground font-mono mt-1">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wide format — one column per asset, one row per period. Returns in decimal or percent (auto-detected).
              </p>
              <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600">
                <div>period, growth_etf, bond_fund</div>
                <div>1, 0.52, 0.18</div>
                <div>2, -0.31, -0.09</div>
                <div>3, 0.74, 0.22</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {['Min 30 observations recommended','Daily / weekly / monthly frequency','Multiple assets as separate columns','Decimal or % returns auto-detected'].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Waves className="mr-2 h-5 w-5" />Load Example Data
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

export default function VolatilityProjectionPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [manualAssets,  setManualAssets]  = useState<AssetInput[]>(defaultManual());
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [freq,          setFreq]          = useState<Frequency>('daily');
  const [chartTab,      setChartTab]      = useState<'rolling' | 'ewma' | 'term' | 'dist'>('rolling');

  // CSV
  const [periodCol, setPeriodCol] = useState('');
  const [assetCols, setAssetCols] = useState<string[]>([]);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_volatility.csv');
    setInputMode('csv');
    setHasStarted(true);
    setPeriodCol('period');
    setAssetCols(DEMO_ASSETS.map(d => d.name.replace(/\s+/g, '_').toLowerCase()));
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
    setActiveIdx(0);
    setPeriodCol(''); setAssetCols([]);
  }, [onClearData]);

  // ── Auto-detect CSV ───────────────────────────────────────
  useMemo(() => {
    if (!hasData || assetCols.length) return;
    const hl = allHeaders.map(h => h.toLowerCase());
    const pi = hl.findIndex(h => ['period','date','time','month','week'].some(k => h.includes(k)));
    if (pi !== -1) setPeriodCol(allHeaders[pi]);
    setAssetCols(numericHeaders.filter((_, i) => i !== pi).slice(0, 8));
  }, [hasData, allHeaders, numericHeaders, assetCols.length]);

  // ── Build inputs ──────────────────────────────────────────
  const rawInputs = useMemo((): { name: string; returns: number[] }[] => {
    if (inputMode === 'csv' && hasData && assetCols.length) {
      return assetCols.map(col => {
        const nums = data.map(r => parseFloat(String(r[col] ?? ''))).filter(v => isFinite(v));
        return { name: col, returns: detectAndNormalize(nums) };
      }).filter(a => a.returns.length >= 10);
    }
    if (inputMode === 'manual') {
      return manualAssets
        .filter(a => a.enabled && a.name.trim())
        .map(a => ({ name: a.name.trim(), returns: parseReturns(a.returns) }))
        .filter(a => a.returns.length >= 10);
    }
    return [];
  }, [inputMode, hasData, data, assetCols, manualAssets]);

  // ── Compute ───────────────────────────────────────────────
  const results = useMemo<VolResult[]>(() =>
    rawInputs.map(a => computeVol(a.name, a.returns, freq)),
    [rawInputs, freq]
  );

  const isConfigured = results.length > 0;
  const active       = results[Math.min(activeIdx, results.length - 1)] ?? null;
  const isExample    = (fileName ?? '').startsWith('example_');

  // ── Overlaid rolling vol chart ────────────────────────────
  const rollingChartData = useMemo(() => {
    if (!results.length) return [];
    const maxLen = Math.max(...results.map(r => r.rollingVol.length));
    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, any> = { idx: results[0].rollingVol[i]?.idx ?? i };
      for (const r of results) row[r.name] = r.rollingVol[i]?.vol ?? null;
      return row;
    });
  }, [results]);

  // ── Overlaid EWMA chart ───────────────────────────────────
  const ewmaChartData = useMemo(() => {
    if (!results.length) return [];
    const maxLen = Math.max(...results.map(r => r.ewmaSeries.length));
    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, any> = { idx: results[0].ewmaSeries[i]?.idx ?? i };
      for (const r of results) row[r.name] = r.ewmaSeries[i]?.vol ?? null;
      return row;
    });
  }, [results]);

  // ── Term structure: multi-asset overlay ──────────────────
  const termChartData = useMemo(() => {
    if (!results.length) return [];
    return results[0].termStructure.map((t, i) => {
      const row: Record<string, any> = { horizon: t.horizon };
      for (const r of results) row[r.name] = r.termStructure[i]?.annVol ?? null;
      return row;
    });
  }, [results]);

  // ── Cross-asset comparison bar ────────────────────────────
  const volBarData = useMemo(() =>
    [...results]
      .sort((a, b) => b.histVolPct - a.histVolPct)
      .map(r => ({
        name:     r.name,
        hist:     parseFloat(r.histVolPct.toFixed(2)),
        ewma:     parseFloat((r.ewmaVol * 100).toFixed(2)),
        idx:      results.indexOf(r),
      })),
    [results]
  );

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = results.map(r => ({
      asset:         r.name,
      n:             r.n,
      hist_vol:      fPct(r.histVolPct),
      ewma_vol:      fPct(r.ewmaVol * 100),
      vol_regime:    r.regime,
      vol_percentile:r.currentPct.toFixed(1) + '%',
      vol_of_vol:    fPct(r.volOfVol * 100),
      skewness:      fNum(r.skew),
      excess_kurt:   fNum(r.kurt),
      abs_autocorr:  fNum(r.absAutoCorr),
      ...Object.fromEntries(r.termStructure.map(t => [`annvol_${t.horizon}`, fPct(t.annVol)])),
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `VolProjection_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, results, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image…' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `VolProjection_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Intro gate ────────────────────────────────────────────
  if (!hasData && !hasStarted) return (
    <IntroPage onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }} />
  );

  const toggleCol = (col: string) =>
    setAssetCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-8">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-8 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">
            {hasData ? (fileName || 'Uploaded file') : 'Manual Entry'}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {isConfigured
              ? `${results.length} asset${results.length !== 1 ? 's' : ''} · ${active?.n ?? 0} periods · ${freq}`
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
              }} title="Download raw CSV">
              <Download className="h-4 w-4" />
            </Button>
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
            <Waves className="h-5 w-5" />Volatility Projection
          </CardTitle>
          <CardDescription>
            Historical vol, EWMA (RiskMetrics λ=0.94), and mean-reverting term structure (OU process). Rolling vol analysis, vol-of-vol, volatility clustering (|r| autocorrelation), and regime detection.
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
                {inputMode === 'csv' ? 'Select return columns from uploaded data.' : 'Enter comma-separated return series per asset.'}
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
                <Label className="text-xs font-semibold text-muted-foreground">PERIOD COLUMN (optional)</Label>
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
                  ASSET COLUMNS — {assetCols.length} selected
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
                      {['On','Asset Name','Return Series (decimal or %)',''].map(h => (
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
                          <Input className="h-7 text-xs w-28 font-semibold" value={a.name}
                            onChange={e => setManualAssets(prev => prev.map(x => x.id !== a.id ? x : { ...x, name: e.target.value }))}
                            placeholder="Asset A" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[380px]" value={a.returns}
                            onChange={e => setManualAssets(prev => prev.map(x => x.id !== a.id ? x : { ...x, returns: e.target.value }))}
                            placeholder="0.018, -0.009, 0.024, …" />
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
                onClick={() => setManualAssets(prev => [...prev, { id: String(Date.now()), name: `Asset ${prev.length + 1}`, enabled: true, returns: '' }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Asset
              </Button>
            </div>
          )}

          {/* Frequency */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
            <Label className="text-xs font-semibold text-muted-foreground">RETURN FREQUENCY</Label>
            <div className="flex gap-1">
              {(['daily','weekly','monthly'] as Frequency[]).map(f => (
                <Button key={f} size="sm" variant={freq === f ? 'default' : 'outline'}
                  className="h-8 px-2.5 text-xs capitalize" onClick={() => setFreq(f)}>{f}</Button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Annualization factor: {annFactor(freq)}
            </span>
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Historical Vol</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fPct(active.histVolPct)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Annualized · {active.n} periods</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">EWMA Vol (Current)</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fPct(active.ewmaVol * 100)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">λ=0.94 · RiskMetrics</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vol Regime</div>
            <div className={`text-2xl font-bold font-mono capitalize ${regimeBadge(active.regime)}`}>
              {active.regime}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {active.currentPct.toFixed(0)}th percentile of history
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vol-of-Vol</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fPct(active.volOfVol * 100)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              |r| autocorr: {fNum(active.absAutoCorr, 3)}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Cross-asset vol comparison ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historical vs EWMA Volatility</CardTitle>
              <CardDescription>Annualized · sorted by historical vol</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(140, volBarData.length * 52)}>
                <BarChart data={volBarData} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={88} />
                  <Tooltip content={<TermTip />} />
                  <Bar dataKey="hist" name="Historical Vol %" maxBarSize={12} radius={[0, 3, 3, 0]}>
                    {volBarData.map(d => <Cell key={d.name} fill={PALETTE[d.idx % PALETTE.length]} fillOpacity={0.85} />)}
                  </Bar>
                  <Bar dataKey="ewma" name="EWMA Vol %" maxBarSize={12} radius={[0, 3, 3, 0]}>
                    {volBarData.map(d => <Cell key={d.name} fill={PALETTE[d.idx % PALETTE.length]} fillOpacity={0.4} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary opacity-85" />Historical</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary opacity-40" />EWMA</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Detail Charts ── */}
        {isConfigured && active && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base shrink-0">
                  {chartTab === 'rolling' ? 'Rolling Volatility' :
                   chartTab === 'ewma'    ? 'EWMA Volatility' :
                   chartTab === 'term'    ? 'Term Structure' :
                   'Return Distribution'}
                </CardTitle>
                <div className="flex gap-1 shrink-0">
                  {([
                    { key: 'rolling', label: 'Rolling' },
                    { key: 'ewma',    label: 'EWMA' },
                    { key: 'term',    label: 'Term Structure' },
                    { key: 'dist',    label: 'Distribution' },
                  ] as const).map(t => (
                    <Button key={t.key} size="sm"
                      variant={chartTab === t.key ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setChartTab(t.key)}>{t.label}</Button>
                  ))}
                </div>
              </div>
              <CardDescription className="mt-1">
                {chartTab === 'rolling' ? `${Math.max(5, Math.min(20, Math.floor(active.n / 4)))}p window · annualized rolling vol` :
                 chartTab === 'ewma'    ? 'λ=0.94 · more responsive to recent moves than historical vol' :
                 chartTab === 'term'    ? 'Projected annualized vol via OU mean-reversion' :
                 `Skew ${fSign(active.skew)} · Excess kurt ${fSign(active.kurt)} · Win rate ${((active.returns.filter(r=>r>0).length/active.n)*100).toFixed(0)}%`}
              </CardDescription>
            </CardHeader>
            <CardContent>

              {/* Rolling Vol */}
              {chartTab === 'rolling' && rollingChartData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={rollingChartData} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
                      <defs>
                        {results.map((_, i) => (
                          <linearGradient key={i} id={`rvg${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        tickFormatter={v => `${v}%`} />
                      <Tooltip content={<LineTip />} />
                      {results.map((r, i) => (
                        <Area key={r.name} type="monotone" dataKey={r.name} name={r.name}
                          stroke={PALETTE[i % PALETTE.length]} fill={`url(#rvg${i})`}
                          strokeWidth={activeIdx === i ? 2.5 : 1.5} dot={false} connectNulls />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-1 justify-center">
                    {results.map((r, i) => (
                      <div key={r.name} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                        onClick={() => setActiveIdx(i)}>
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        {r.name}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* EWMA Vol */}
              {chartTab === 'ewma' && ewmaChartData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={ewmaChartData} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
                      <defs>
                        {results.map((_, i) => (
                          <linearGradient key={i} id={`ewg${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        tickFormatter={v => `${v}%`} />
                      <Tooltip content={<LineTip />} />
                      <ReferenceLine y={active.histVolPct} stroke="#94A3B8" strokeDasharray="4 3" strokeWidth={1}
                        label={{ value: 'Hist.', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                      {results.map((r, i) => (
                        <Area key={r.name} type="monotone" dataKey={r.name} name={r.name}
                          stroke={PALETTE[i % PALETTE.length]} fill={`url(#ewg${i})`}
                          strokeWidth={activeIdx === i ? 2.5 : 1.5} dot={false} connectNulls />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-1 justify-center">
                    {results.map((r, i) => (
                      <div key={r.name} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                        onClick={() => setActiveIdx(i)}>
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        {r.name}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Term Structure */}
              {chartTab === 'term' && termChartData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={termChartData} margin={{ top: 8, right: 24, bottom: 4, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="horizon" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        tickFormatter={v => `${v}%`} />
                      <Tooltip content={<TermTip />} />
                      {results.map((r, i) => (
                        <Line key={r.name} type="monotone" dataKey={r.name} name={r.name}
                          stroke={PALETTE[i % PALETTE.length]}
                          strokeWidth={activeIdx === i ? 2.5 : 1.5}
                          dot={{ r: 3, fill: PALETTE[i % PALETTE.length], strokeWidth: 0 }}
                          connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-1 justify-center">
                    {results.map((r, i) => (
                      <div key={r.name} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                        onClick={() => setActiveIdx(i)}>
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        {r.name}
                      </div>
                    ))}
                  </div>
                  {/* Term structure table */}
                  <div className="mt-4 overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Asset</th>
                          {active.termStructure.map(t => (
                            <th key={t.horizon} className="px-3 py-2 text-right font-semibold text-muted-foreground font-mono">{t.horizon}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={r.name} className={`border-t hover:bg-slate-50/50 cursor-pointer ${i === activeIdx ? 'bg-primary/5' : ''}`}
                            onClick={() => setActiveIdx(i)}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                                <span className="font-semibold text-slate-700">{r.name}</span>
                              </div>
                            </td>
                            {r.termStructure.map(t => (
                              <td key={t.horizon} className="px-3 py-2 font-mono text-right text-slate-600">
                                {fPct(t.annVol)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Distribution */}
              {chartTab === 'dist' && active.histData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={active.histData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }} interval={5} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => [v, 'Frequency']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" name="Frequency" maxBarSize={16} radius={[2, 2, 0, 0]}>
                      {active.histData.map((d, i) => (
                        <Cell key={i}
                          fill={PALETTE[activeIdx % PALETTE.length]}
                          fillOpacity={d.midpt < 0 ? 0.45 : 0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Full Metrics Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Volatility Summary
              </CardTitle>
              <CardDescription>Click row to switch detail view · {freq} frequency · annualization ×{annFactor(freq)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Asset','N','Hist. Vol','EWMA Vol','Regime','Vol Pct.','Vol-of-Vol','|r| AutoCorr','Skew','Kurt'].map(h => (
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
                        <td className="px-3 py-2 font-mono text-slate-500">{r.n}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fPct(r.histVolPct)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.ewmaVol * 100)}</td>
                        <td className={`px-3 py-2 font-semibold capitalize ${regimeBadge(r.regime)}`}>{r.regime}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.currentPct.toFixed(0)}th</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.volOfVol * 100)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.absAutoCorr, 3)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.skew)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.kurt)}</td>
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
          const clustering  = active.absAutoCorr > 0.15;
          const fatTails    = active.kurt > 1;
          const negSkew     = active.skew < -0.5;
          const termSlope   = active.termStructure[6].annVol - active.termStructure[0].annVol;
          const ewmaVsHist  = active.ewmaVol - active.histVol;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>
                  Auto-generated volatility analysis · {active.name} · {freq} · {active.n} observations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Volatility Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    <span className="font-semibold">{active.name}</span> is currently in a{' '}
                    <span className={`font-semibold capitalize ${regimeBadge(active.regime)}`}>{active.regime}</span>{' '}
                    volatility regime — EWMA vol of{' '}
                    <span className="font-semibold">{fPct(active.ewmaVol * 100)}</span>{' '}
                    sits at the <span className="font-semibold">{active.currentPct.toFixed(0)}th percentile</span> of its own rolling vol history.{' '}
                    {ewmaVsHist > 0.005
                      ? `EWMA (${fPct(active.ewmaVol * 100)}) is above long-run historical vol (${fPct(active.histVolPct)}) — recent periods have been more turbulent than average.`
                      : ewmaVsHist < -0.005
                      ? `EWMA (${fPct(active.ewmaVol * 100)}) is below long-run vol (${fPct(active.histVolPct)}) — recent markets are calmer than average; could revert upward.`
                      : `EWMA and historical vol are closely aligned (${fPct(active.histVolPct)}) — no significant recent regime shift.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Hist. Vol',     value: fPct(active.histVolPct),        sub: 'Full-period ann.' },
                    { label: 'EWMA Vol',      value: fPct(active.ewmaVol * 100),     sub: 'λ=0.94 current' },
                    { label: 'Vol-of-Vol',    value: fPct(active.volOfVol * 100),    sub: 'Std dev of rolling vol' },
                    { label: '1y Term',       value: fPct(active.termStructure[6].annVol), sub: 'Projected 252d vol' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-base font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Term Structure</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The vol curve from 1d to 252d is{' '}
                        {termSlope > 0.5
                          ? <><span className="font-semibold">upward-sloping (contango)</span> — short-term vol ({fPct(active.termStructure[0].annVol)}) is below long-run ({fPct(active.termStructure[6].annVol)}). Current conditions are calmer than the long-run expectation; vol likely to mean-revert upward.</>
                          : termSlope < -0.5
                          ? <><span className="font-semibold">downward-sloping (backwardation)</span> — current vol ({fPct(active.termStructure[0].annVol)}) exceeds the long-run projection ({fPct(active.termStructure[6].annVol)}). Elevated short-term vol expected to decay.</>
                          : <><span className="font-semibold">flat</span> — short-term and long-run vol projections are closely aligned ({fPct(active.termStructure[0].annVol)} vs {fPct(active.termStructure[6].annVol)}). No strong mean-reversion signal.</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Volatility Clustering</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        |Return| autocorrelation at lag-1: <span className="font-semibold">{fNum(active.absAutoCorr, 3)}</span>.{' '}
                        {clustering
                          ? 'Positive autocorrelation confirms volatility clustering — large moves tend to be followed by large moves. GARCH-family models are appropriate; simple historical vol may understate near-term risk.'
                          : 'Low autocorrelation suggests returns are close to i.i.d. in absolute terms — clustering effects are weak. Historical vol is a reasonable near-term estimator.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Distribution Shape</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Skewness {fSign(active.skew, 2)}{negSkew ? ' — left-skewed: large losses more likely than large gains' : active.skew > 0.5 ? ' — right-skewed: large gains slightly more likely' : ' — near-symmetric'}.{' '}
                        Excess kurtosis {fSign(active.kurt, 2)}{fatTails ? ' — fat tails: extreme outcomes more frequent than a normal distribution predicts. Parametric VaR based on volatility alone will underestimate tail risk.' : ' — tail weight is close to normal.'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Historical vol = sample std dev of returns × √{annFactor(freq)}.
                  EWMA: σ²ₜ = λσ²ₜ₋₁ + (1−λ)r²ₜ, λ=0.94 (RiskMetrics standard for daily data).
                  Term structure uses Ornstein-Uhlenbeck mean-reversion: σ(T) = σ_LR + (σ_now − σ_LR)×exp(−κT), κ=0.05/period.
                  Regime percentile = position of current EWMA vol within the full rolling-vol distribution.
                  Vol-of-vol = annualized std dev of the rolling vol series.
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
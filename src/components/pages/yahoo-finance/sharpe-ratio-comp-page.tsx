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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ScatterChart, Scatter,
  ZAxis, ReferenceLine, AreaChart, Area,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  TrendingUp, Activity, Plus, Trash2, CheckCircle,
  FileText, Eye, X, Award,
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

interface AssetInput {
  id:      string;
  name:    string;
  enabled: boolean;
  returns: string;
}

interface AssetResult {
  name:          string;
  returns:       number[];
  // per-period stats
  meanPeriod:    number;
  stdPeriod:     number;
  // annualized
  annReturn:     number;
  annVol:        number;
  annRf:         number;        // risk-free annualized
  // ratios
  sharpe:        number;
  sortino:       number;        // downside deviation denominator
  calmar:        number | null;
  treynor:       number | null; // needs benchmark
  // supporting
  mdd:           number;
  skew:          number;
  kurt:          number;        // excess kurtosis
  winRate:       number;
  downsideDev:   number;        // annualized
  // rolling Sharpe (window=20)
  rollingSharpe: { idx: number; sharpe: number | null }[];
  // chart
  cumRet:        number[];
}

// ─────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────

// ⚠️  Array-level detection — never per-value
function detectAndNormalize(nums: number[]): number[] {
  const isPercent = nums.some(n => Math.abs(n) > 1);
  return isPercent ? nums.map(n => n / 100) : nums;
}

function parseReturns(str: string): number[] {
  const nums = str.split(/[\s,;]+/).map(s => parseFloat(s)).filter(v => isFinite(v));
  return detectAndNormalize(nums);
}

function arrMean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

function arrStd(a: number[], mu?: number): number {
  if (a.length < 2) return 0;
  const m = mu ?? arrMean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

function arrSkew(a: number[], mu: number, sigma: number): number {
  if (sigma === 0 || a.length < 3) return 0;
  const n = a.length;
  return (n / ((n - 1) * (n - 2))) * a.reduce((s, v) => s + ((v - mu) / sigma) ** 3, 0);
}

function arrKurt(a: number[], mu: number, sigma: number): number {
  if (sigma === 0 || a.length < 4) return 0;
  const n = a.length;
  const raw = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))
    * a.reduce((s, v) => s + ((v - mu) / sigma) ** 4, 0);
  const bias = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return raw - bias; // excess kurtosis
}

function computeMDD(rets: number[]): number {
  let peak = 1, val = 1, dd = 0;
  for (const r of rets) {
    val *= 1 + r;
    if (val > peak) peak = val;
    dd = Math.max(dd, (peak - val) / peak);
  }
  return dd;
}

// Annualization factor — default daily (252); override via prop
function annFactor(freq: Frequency): number {
  if (freq === 'weekly')  return 52;
  if (freq === 'monthly') return 12;
  return 252;
}

type Frequency = 'daily' | 'weekly' | 'monthly';

function computeAsset(
  name: string, rets: number[], rfPeriod: number, freq: Frequency
): AssetResult {
  const n       = rets.length;
  const mu      = arrMean(rets);
  const sigma   = arrStd(rets, mu);
  const ann     = annFactor(freq);
  const annRet  = (1 + mu) ** ann - 1;
  const annVol  = sigma * Math.sqrt(ann);
  const annRf   = (1 + rfPeriod) ** ann - 1;

  // Sharpe (annualized excess return / annualized vol)
  const sharpe  = annVol > 0 ? (annRet - annRf) / annVol : 0;

  // Sortino — downside deviation (semi-deviation below rf per period)
  const negExc  = rets.map(r => Math.min(0, r - rfPeriod));
  const downDev = Math.sqrt(negExc.reduce((s, v) => s + v * v, 0) / n) * Math.sqrt(ann);
  const sortino = downDev > 0 ? (annRet - annRf) / downDev : 0;

  // Calmar
  const mdd     = computeMDD(rets);
  const calmar  = mdd > 0 ? annRet / mdd : null;

  // Distribution
  const skew = arrSkew(rets, mu, sigma);
  const kurt = arrKurt(rets, mu, sigma);
  const wins = rets.filter(r => r > 0).length;

  // Cumulative return series
  const cumRet = [1];
  for (const r of rets) cumRet.push(cumRet[cumRet.length - 1] * (1 + r));

  // Rolling Sharpe (window periods)
  const WIN = Math.min(20, Math.floor(n / 3));
  const rollingSharpe: AssetResult['rollingSharpe'] = [];
  for (let i = WIN; i <= n; i++) {
    const slice  = rets.slice(i - WIN, i);
    const rMu    = arrMean(slice);
    const rSig   = arrStd(slice, rMu);
    const rAnn   = (1 + rMu) ** ann - 1;
    const rVol   = rSig * Math.sqrt(ann);
    const rSh    = rVol > 0 ? (rAnn - annRf) / rVol : null;
    rollingSharpe.push({ idx: i, sharpe: rSh !== null ? parseFloat(rSh.toFixed(3)) : null });
  }

  return {
    name, returns: rets,
    meanPeriod: mu, stdPeriod: sigma,
    annReturn: annRet, annVol, annRf,
    sharpe, sortino, calmar, treynor: null,
    mdd, skew, kurt,
    winRate: wins / n,
    downsideDev: downDev,
    rollingSharpe, cumRet,
  };
}

// ─────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────

function fPct(n: number, d = 2)  { return `${(n * 100).toFixed(d)}%`; }
function fNum(n: number, d = 3)  { return n.toFixed(d); }
function fSign(n: number, d = 3) { return `${n >= 0 ? '+' : ''}${n.toFixed(d)}`; }

function sharpeGrade(s: number): { label: string; cls: string } {
  if (s >= 2.0)  return { label: 'Excellent',  cls: 'bg-emerald-100 text-emerald-700' };
  if (s >= 1.0)  return { label: 'Good',        cls: 'bg-green-100 text-green-700' };
  if (s >= 0.5)  return { label: 'Acceptable',  cls: 'bg-amber-100 text-amber-700' };
  if (s >= 0.0)  return { label: 'Sub-par',     cls: 'bg-orange-100 text-orange-700' };
  return           { label: 'Negative',      cls: 'bg-slate-200 text-slate-600' };
}

const PALETTE = ['#6C3AED','#10B981','#F59E0B','#3B82F6','#8B5CF6','#06B6D4','#EC4899','#84CC16'];

// ─────────────────────────────────────────────
// Demo data — 4 assets × 120 periods (daily)
// ─────────────────────────────────────────────

const DEMO: { name: string; rets: number[] }[] = [
  { name: 'Growth ETF', rets: [
     0.018,-0.009, 0.024, 0.006,-0.031, 0.015, 0.011,-0.006, 0.028,-0.014,
     0.009, 0.021,-0.018, 0.033,-0.007, 0.019,-0.011, 0.026,-0.052, 0.022,
    -0.013, 0.034,-0.009, 0.027, 0.008,-0.019, 0.031,-0.012, 0.041,-0.008,
     0.014,-0.027, 0.032, 0.005,-0.061, 0.048,-0.017, 0.025,-0.009, 0.036,
    -0.021, 0.029,-0.008, 0.021, 0.047,-0.031, 0.013,-0.038, 0.026, 0.011,
     0.016,-0.012, 0.031,-0.007, 0.022, 0.009,-0.025, 0.039,-0.015, 0.031,
     0.004,-0.018, 0.027,-0.011, 0.036,-0.024, 0.019,-0.009, 0.028, 0.014,
    -0.043, 0.033,-0.012, 0.026,-0.006, 0.021, 0.008,-0.033, 0.038,-0.017,
     0.024,-0.010, 0.031, 0.005,-0.055, 0.044,-0.015, 0.028,-0.008, 0.039,
    -0.025, 0.019, 0.013,-0.016, 0.032,-0.007, 0.026,-0.035, 0.018, 0.011,
     0.021,-0.009, 0.028,-0.013, 0.038,-0.019, 0.010,-0.029, 0.024, 0.017,
    -0.008, 0.034,-0.021, 0.027,-0.004, 0.018,-0.013, 0.032,-0.010, 0.025,
  ]},
  { name: 'Value ETF', rets: [
     0.012,-0.006, 0.017, 0.004,-0.021, 0.011, 0.008,-0.004, 0.020,-0.010,
     0.006, 0.015,-0.012, 0.024,-0.005, 0.014,-0.008, 0.019,-0.036, 0.016,
    -0.009, 0.025,-0.006, 0.019, 0.005,-0.013, 0.023,-0.009, 0.029,-0.006,
     0.010,-0.019, 0.023, 0.004,-0.043, 0.034,-0.012, 0.018,-0.006, 0.026,
    -0.015, 0.021,-0.006, 0.015, 0.034,-0.022, 0.009,-0.027, 0.019, 0.008,
     0.012,-0.009, 0.023,-0.005, 0.016, 0.006,-0.018, 0.028,-0.011, 0.022,
     0.003,-0.013, 0.019,-0.008, 0.026,-0.017, 0.013,-0.007, 0.021, 0.010,
    -0.031, 0.024,-0.009, 0.018,-0.004, 0.015, 0.006,-0.023, 0.027,-0.012,
     0.017,-0.007, 0.022, 0.003,-0.039, 0.031,-0.011, 0.020,-0.006, 0.028,
    -0.018, 0.013, 0.009,-0.011, 0.023,-0.004, 0.018,-0.025, 0.013, 0.008,
     0.015,-0.006, 0.020,-0.009, 0.027,-0.013, 0.007,-0.021, 0.017, 0.012,
    -0.005, 0.023,-0.014, 0.018,-0.003, 0.013,-0.009, 0.023,-0.007, 0.018,
  ]},
  { name: 'Bond Fund', rets: [
     0.004,-0.002, 0.006, 0.002,-0.008, 0.004, 0.003,-0.002, 0.007,-0.003,
     0.002, 0.005,-0.004, 0.009,-0.002, 0.005,-0.003, 0.007,-0.013, 0.006,
    -0.003, 0.008,-0.002, 0.007, 0.002,-0.005, 0.008,-0.003, 0.011,-0.002,
     0.003,-0.007, 0.008, 0.001,-0.015, 0.012,-0.004, 0.007,-0.002, 0.009,
    -0.006, 0.007,-0.002, 0.005, 0.012,-0.008, 0.004,-0.010, 0.007, 0.003,
     0.005,-0.003, 0.008,-0.002, 0.006, 0.002,-0.007, 0.011,-0.004, 0.008,
     0.001,-0.005, 0.007,-0.003, 0.009,-0.006, 0.005,-0.002, 0.007, 0.004,
    -0.011, 0.008,-0.003, 0.006,-0.002, 0.005, 0.002,-0.009, 0.010,-0.004,
     0.007,-0.003, 0.009, 0.001,-0.013, 0.011,-0.004, 0.007,-0.002, 0.010,
    -0.006, 0.005, 0.003,-0.004, 0.008,-0.002, 0.006,-0.009, 0.004, 0.003,
     0.005,-0.002, 0.008,-0.003, 0.011,-0.005, 0.003,-0.007, 0.006, 0.004,
    -0.002, 0.009,-0.005, 0.007,-0.001, 0.005,-0.003, 0.008,-0.002, 0.006,
  ]},
  { name: 'Hedge Fund', rets: [
     0.009,-0.004, 0.013, 0.003,-0.016, 0.008, 0.006,-0.003, 0.014,-0.007,
     0.004, 0.011,-0.009, 0.016,-0.004, 0.009,-0.005, 0.013,-0.026, 0.011,
    -0.007, 0.017,-0.005, 0.013, 0.004,-0.009, 0.015,-0.006, 0.020,-0.004,
     0.007,-0.013, 0.016, 0.003,-0.031, 0.024,-0.008, 0.012,-0.004, 0.018,
    -0.011, 0.015,-0.004, 0.010, 0.023,-0.015, 0.006,-0.019, 0.013, 0.005,
     0.008,-0.006, 0.015,-0.003, 0.011, 0.004,-0.013, 0.020,-0.008, 0.015,
     0.002,-0.009, 0.013,-0.005, 0.018,-0.012, 0.009,-0.004, 0.014, 0.007,
    -0.022, 0.017,-0.006, 0.013,-0.003, 0.010, 0.004,-0.016, 0.019,-0.009,
     0.012,-0.005, 0.016, 0.002,-0.028, 0.022,-0.008, 0.014,-0.004, 0.019,
    -0.013, 0.009, 0.006,-0.008, 0.016,-0.003, 0.012,-0.018, 0.009, 0.006,
     0.010,-0.004, 0.013,-0.007, 0.019,-0.010, 0.005,-0.014, 0.011, 0.008,
    -0.003, 0.016,-0.010, 0.013,-0.002, 0.008,-0.006, 0.015,-0.005, 0.012,
  ]},
];

function defaultManual(): AssetInput[] {
  return DEMO.map((d, i) => ({
    id:      String(i + 1),
    name:    d.name,
    enabled: true,
    returns: d.rets.map(r => (r * 100).toFixed(2)).join(', '),
  }));
}

function generateExampleCSV(): Record<string, any>[] {
  return DEMO[0].rets.map((_, i) => {
    const row: Record<string, any> = { period: i + 1 };
    for (const d of DEMO) row[d.name.replace(/\s+/g, '_').toLowerCase()] = (d.rets[i] * 100).toFixed(4);
    return row;
  });
}

// ─────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? fNum(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const ScatterTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-1.5">{d.name}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Ann. Return</span>
          <span className="font-mono font-semibold">{fPct(d.x / 100)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Ann. Vol</span>
          <span className="font-mono font-semibold">{fPct(d.y / 100)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Sharpe</span>
          <span className="font-mono font-semibold">{fNum(d.sharpe)}</span>
        </div>
      </div>
    </div>
  );
};

const RollTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-600 mb-1">Period {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{p.value !== null ? fNum(p.value) : '—'}</span>
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
            <Award className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Sharpe Ratio Comparison</CardTitle>
        <CardDescription className="text-base mt-2">
          Compare risk-adjusted returns across assets using Sharpe, Sortino, and Calmar ratios — with rolling Sharpe, return-vs-risk scatter, and distribution analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Award className="w-6 h-6 text-primary mb-2" />,
              title: 'Sharpe Ratio',
              desc: '(Ann. Return − Risk-free) / Ann. Volatility. The most widely used risk-adjusted return metric. Higher = better return per unit of total risk taken.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Sortino & Calmar',
              desc: 'Sortino uses downside deviation (not total vol) — penalizes only harmful volatility. Calmar uses maximum drawdown — rewards resilience under worst-case conditions.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Rolling Analysis',
              desc: 'Rolling Sharpe (20-period window) reveals whether risk-adjusted performance is consistent or degrading over time — a stable line signals regime-robust alpha.',
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
            { range: '≥ 2.0', label: 'Excellent',  cls: 'bg-emerald-100 text-emerald-700' },
            { range: '1.0–2.0', label: 'Good',      cls: 'bg-green-100 text-green-700' },
            { range: '0.5–1.0', label: 'Acceptable', cls: 'bg-amber-100 text-amber-700' },
            { range: '< 0.5',  label: 'Sub-par',    cls: 'bg-orange-100 text-orange-700' },
          ].map(({ range, label, cls }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
              <div className="text-xs text-muted-foreground font-mono mt-1.5">{range}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wide format — one column per asset, one row per period. Returns in decimal or percent.
              </p>
              <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600 overflow-x-auto">
                <div>period, growth_etf, value_etf, bond_fund</div>
                <div>1, 1.80, 1.20, 0.40</div>
                <div>2, -0.90, -0.60, -0.20</div>
                <div>3, 2.40, 1.70, 0.60</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                'One row per period (daily / weekly / monthly)',
                'Multiple assets as separate columns',
                'Configurable risk-free rate and frequency',
                'Min 20 observations for reliable Sharpe',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Award className="mr-2 h-5 w-5" />Load Example Data
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
// Main Component
// ─────────────────────────────────────────────

export default function SharpePage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [manualAssets,  setManualAssets]  = useState<AssetInput[]>(defaultManual());
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(0);

  // Config
  const [rfRate,  setRfRate]  = useState('0.05');   // 5% annual
  const [freq,    setFreq]    = useState<Frequency>('daily');
  const [ratioTab, setRatioTab] = useState<'sharpe' | 'sortino' | 'calmar'>('sharpe');
  const [detailTab, setDetailTab] = useState<'rolling' | 'scatter' | 'dist'>('rolling');

  // CSV
  const [periodCol, setPeriodCol] = useState('');
  const [assetCols, setAssetCols] = useState<string[]>([]);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_sharpe.csv');
    setInputMode('csv');
    setHasStarted(true);
    setPeriodCol('period');
    setAssetCols(DEMO.map(d => d.name.replace(/\s+/g, '_').toLowerCase()));
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setAssetCols([]);
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
    setActiveIdx(0);
  }, [onClearData]);

  // ── Auto-detect columns ───────────────────────────────────
  useMemo(() => {
    if (!hasData || assetCols.length) return;
    const hl = allHeaders.map(h => h.toLowerCase());
    const pi = hl.findIndex(h => ['period','date','time','month'].some(k => h.includes(k)));
    if (pi !== -1) setPeriodCol(allHeaders[pi]);
    setAssetCols(numericHeaders.filter((_, i) => i !== pi).slice(0, 8));
  }, [hasData, allHeaders, numericHeaders, assetCols.length]);

  // ── Risk-free per period ──────────────────────────────────
  const rfAnnual = useMemo(() => {
    const v = parseFloat(rfRate);
    return isFinite(v) && v > 0 ? (v > 1 ? v / 100 : v) : 0.05;
  }, [rfRate]);

  const rfPeriod = useMemo(() => {
    const ann = annFactor(freq);
    return (1 + rfAnnual) ** (1 / ann) - 1;
  }, [rfAnnual, freq]);

  // ── Build raw inputs ──────────────────────────────────────
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
  const results = useMemo<AssetResult[]>(() =>
    rawInputs.map(a => computeAsset(a.name, a.returns, rfPeriod, freq)),
    [rawInputs, rfPeriod, freq]
  );

  const sorted = useMemo(() =>
    [...results].sort((a, b) => b.sharpe - a.sharpe),
    [results]
  );

  const isConfigured = results.length > 0;
  const active       = results[Math.min(activeIdx, results.length - 1)] ?? null;
  const isExample    = (fileName ?? '').startsWith('example_');
  const best         = sorted[0] ?? null;

  // ── Ratio bar data ────────────────────────────────────────
  const ratioBarData = useMemo(() =>
    [...results]
      .map(r => ({
        name:    r.name,
        sharpe:  parseFloat(r.sharpe.toFixed(3)),
        sortino: parseFloat(r.sortino.toFixed(3)),
        calmar:  r.calmar !== null ? parseFloat(r.calmar.toFixed(3)) : null,
        idx:     results.indexOf(r),
      }))
      .sort((a, b) => {
        const k = ratioTab as keyof typeof a;
        return ((b[k] as number) ?? -999) - ((a[k] as number) ?? -999);
      }),
    [results, ratioTab]
  );

  // ── Return-vs-Risk scatter ────────────────────────────────
  const scatterData = useMemo(() =>
    results.map((r, i) => ({
      name:   r.name,
      x:      parseFloat((r.annReturn * 100).toFixed(3)),
      y:      parseFloat((r.annVol    * 100).toFixed(3)),
      sharpe: r.sharpe,
      idx:    i,
    })),
    [results]
  );

  // ── Metric comparison table ────────────────────────────────
  const tableData = useMemo(() =>
    sorted.map((r, rank) => ({ ...r, rank: rank + 1 })),
    [sorted]
  );

  // ── Rolling Sharpe chart data (multi-asset) ───────────────
  const rollingChartData = useMemo(() => {
    if (!results.length) return [];
    const maxLen = Math.max(...results.map(r => r.rollingSharpe.length));
    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, any> = { idx: results[0].rollingSharpe[i]?.idx ?? i };
      for (const r of results) {
        row[r.name] = r.rollingSharpe[i]?.sharpe ?? null;
      }
      return row;
    });
  }, [results]);

  // ── Return distribution histogram ─────────────────────────
  const histData = useMemo(() => {
    if (!active) return [];
    const rets = active.returns;
    const mn = Math.min(...rets), mx = Math.max(...rets);
    const bins = 28;
    const w = (mx - mn) / bins || 0.001;
    const counts = new Array(bins).fill(0);
    for (const r of rets) counts[Math.min(bins - 1, Math.floor((r - mn) / w))]++;
    return counts.map((count, i) => ({
      bin:    ((mn + (i + 0.5) * w) * 100).toFixed(2) + '%',
      midpt:  mn + (i + 0.5) * w,
      count,
    }));
  }, [active]);

  // ── Manual handlers ───────────────────────────────────────
  const handleManualChange = useCallback((id: string, field: keyof AssetInput, val: string | boolean) => {
    setManualAssets(prev => prev.map(a => a.id !== id ? a : { ...a, [field]: val }));
  }, []);
  const handleAddAsset = useCallback(() => {
    setManualAssets(prev => [
      ...prev,
      { id: String(Date.now()), name: `Asset ${prev.length + 1}`, enabled: true, returns: '' },
    ]);
  }, []);
  const handleDeleteAsset = useCallback((id: string) => {
    setManualAssets(prev => prev.filter(a => a.id !== id));
    setActiveIdx(0);
  }, []);
  const toggleCol = (col: string) =>
    setAssetCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = tableData.map(r => ({
      rank:          r.rank,
      asset:         r.name,
      observations:  r.returns.length,
      ann_return:    fPct(r.annReturn),
      ann_vol:       fPct(r.annVol),
      sharpe:        fNum(r.sharpe),
      sortino:       fNum(r.sortino),
      calmar:        r.calmar !== null ? fNum(r.calmar) : 'N/A',
      mdd:           fPct(r.mdd),
      win_rate:      fPct(r.winRate),
      skewness:      fNum(r.skew),
      excess_kurt:   fNum(r.kurt),
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Sharpe_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, tableData, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image…' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Sharpe_${new Date().toISOString().split('T')[0]}.png`;
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

  const activeGrade = active ? sharpeGrade(active.sharpe) : null;

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-4">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">
            {hasData ? (fileName || 'Uploaded file') : 'Manual Entry'}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {isConfigured
              ? `${results.length} asset${results.length !== 1 ? 's' : ''} · ${active?.returns.length ?? 0} periods · rf = ${fPct(rfAnnual)}`
              : hasData ? `${data.length} rows` : `${manualAssets.length} assets`}
          </span>
          {isExample && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
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
            <Award className="h-5 w-5" />Sharpe Ratio Comparison
          </CardTitle>
          <CardDescription>
            Compare risk-adjusted returns across assets using Sharpe, Sortino, and Calmar ratios. Includes rolling Sharpe analysis, return-vs-risk scatter, and return distribution with skewness and kurtosis.
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
                {inputMode === 'csv'
                  ? 'Select asset columns from the uploaded return series.'
                  : 'Enter comma-separated return series per asset.'}
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

          {/* CSV Mode */}
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

          {/* Manual Mode */}
          {inputMode === 'manual' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['On', 'Asset Name', 'Return Series (comma-sep, decimal or %)', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualAssets.map(a => (
                      <tr key={a.id} className={`border-t hover:bg-slate-50/50 ${!a.enabled ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-1.5">
                          <input type="checkbox" checked={a.enabled}
                            onChange={e => handleManualChange(a.id, 'enabled', e.target.checked)}
                            className="w-4 h-4 accent-primary cursor-pointer" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-28 font-semibold" value={a.name}
                            onChange={e => handleManualChange(a.id, 'name', e.target.value)} placeholder="Asset A" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[380px]" value={a.returns}
                            onChange={e => handleManualChange(a.id, 'returns', e.target.value)}
                            placeholder="0.018, -0.009, 0.024, …" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600"
                            onClick={() => handleDeleteAsset(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddAsset}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Asset
              </Button>
            </div>
          )}

          {/* Config row */}
          <div className="flex flex-wrap gap-4 pt-1 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">RISK-FREE RATE (annual)</Label>
              <div className="flex items-center gap-1.5">
                <Input className="h-8 text-xs font-mono w-24"
                  value={rfRate}
                  onChange={e => setRfRate(e.target.value)}
                  placeholder="0.05" />
                <span className="text-xs text-muted-foreground">= {fPct(rfAnnual)} p.a.</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">RETURN FREQUENCY</Label>
              <div className="flex gap-1">
                {(['daily','weekly','monthly'] as Frequency[]).map(f => (
                  <Button key={f} size="sm"
                    variant={freq === f ? 'default' : 'outline'}
                    className="h-8 px-2.5 text-xs capitalize"
                    onClick={() => setFreq(f)}>{f}</Button>
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
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Detail view</Label>
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
      {isConfigured && active && activeGrade && best && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sharpe — {active.name}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fNum(active.sharpe)}</div>
            <div className="mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${activeGrade.cls}`}>{activeGrade.label}</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Best Sharpe
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fNum(best.sharpe)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{best.name}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Ann. Return — {active.name}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {fSign(active.annReturn * 100, 1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Vol: {fPct(active.annVol)}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sortino — {active.name}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fNum(active.sortino)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Calmar: {active.calmar !== null ? fNum(active.calmar) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Ratio Comparison Bar Chart ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">
                    {ratioTab === 'sharpe' ? 'Sharpe Ratio' : ratioTab === 'sortino' ? 'Sortino Ratio' : 'Calmar Ratio'} Ranking
                  </CardTitle>
                  <CardDescription>
                    {ratioTab === 'sharpe'
                      ? `(Ann. Return − rf) / Ann. Vol · rf = ${fPct(rfAnnual)} · ${freq}`
                      : ratioTab === 'sortino'
                      ? `(Ann. Return − rf) / Downside Deviation · rf = ${fPct(rfAnnual)}`
                      : 'Ann. Return / Maximum Drawdown'}
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {(['sharpe','sortino','calmar'] as const).map(t => (
                    <Button key={t} size="sm"
                      variant={ratioTab === t ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs capitalize"
                      onClick={() => setRatioTab(t)}>{t}</Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, ratioBarData.length * 52)}>
                <BarChart data={ratioBarData} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} tickFormatter={v => fNum(v)} />
                  <YAxis type="category" dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={88} />
                  <Tooltip content={<BarTip />} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey={ratioTab} name={ratioTab.charAt(0).toUpperCase() + ratioTab.slice(1)}
                    maxBarSize={26} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey={ratioTab} position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => v !== null ? fNum(v) : '—'} />
                    {ratioBarData.map((d, i) => (
                      <Cell key={i} fill={PALETTE[d.idx % PALETTE.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Detail Charts ── */}
        {isConfigured && active && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">
                    {detailTab === 'rolling' ? `Rolling Sharpe (${Math.min(20, Math.floor(active.returns.length / 3))}p window)` :
                     detailTab === 'scatter' ? 'Return vs Risk — Efficient Frontier View' :
                     `Return Distribution — ${active.name}`}
                  </CardTitle>
                  <CardDescription>
                    {detailTab === 'rolling' ? 'Annualized Sharpe computed over a rolling window — stability indicates consistent alpha' :
                     detailTab === 'scatter' ? 'Each dot = one asset · Sharpe = slope from origin · Upper-left = best risk-adjusted' :
                     `Skewness ${fSign(active.skew)} · Excess kurtosis ${fSign(active.kurt)} · Win rate ${fPct(active.winRate, 0)}`}
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {([
                    { key: 'rolling',  label: 'Rolling' },
                    { key: 'scatter',  label: 'Risk Map' },
                    { key: 'dist',     label: 'Distribution' },
                  ] as const).map(t => (
                    <Button key={t.key} size="sm"
                      variant={detailTab === t.key ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setDetailTab(t.key)}>{t.label}</Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Rolling Sharpe */}
              {detailTab === 'rolling' && rollingChartData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={rollingChartData} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
                    <defs>
                      {results.map((r, i) => (
                        <linearGradient key={r.name} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }}
                      tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => fNum(v, 1)} />
                    <Tooltip content={<RollTip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                    <ReferenceLine y={1} stroke="#94A3B8" strokeDasharray="4 3" strokeWidth={1}
                      label={{ value: '1.0', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                    {results.map((r, i) => (
                      <Area key={r.name} type="monotone" dataKey={r.name}
                        name={r.name}
                        stroke={PALETTE[i % PALETTE.length]}
                        fill={`url(#grad${i})`}
                        strokeWidth={activeIdx === i ? 2.5 : 1.5}
                        dot={false}
                        connectNulls />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Return-Risk Scatter */}
              {detailTab === 'scatter' && (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" dataKey="x" name="Ann. Volatility (%)"
                        tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        label={{ value: 'Ann. Volatility (%)', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#94A3B8' }} />
                      <YAxis type="number" dataKey="y" name="Ann. Return (%)"
                        tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        label={{ value: 'Ann. Return (%)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#94A3B8' }} />
                      <ZAxis range={[80, 80]} />
                      <Tooltip content={<ScatterTip />} />
                      {scatterData.map((d, i) => (
                        <Scatter key={d.name} data={[d]} name={d.name}
                          fill={PALETTE[d.idx % PALETTE.length]} fillOpacity={0.85}>
                        </Scatter>
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {scatterData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[d.idx % PALETTE.length] }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Distribution */}
              {detailTab === 'dist' && histData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={histData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#94A3B8' }}
                      tickLine={false} axisLine={{ stroke: '#E2E8F0' }} interval={5} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => [v, 'Frequency']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" name="Frequency" maxBarSize={16} radius={[2, 2, 0, 0]}>
                      {histData.map((d, i) => (
                        <Cell key={i}
                          fill={PALETTE[activeIdx % PALETTE.length]}
                          fillOpacity={d.midpt < 0 ? 0.5 : 0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Full Metrics Table ── */}
        {isConfigured && tableData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Full Risk-Adjusted Metrics
              </CardTitle>
              <CardDescription>
                Ranked by Sharpe ratio · rf = {fPct(rfAnnual)} · {freq} frequency · Click to change detail view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['#','Asset','Ann. Return','Ann. Vol','Sharpe','Sortino','Calmar','MDD','Win Rate','Skew','Kurt','Grade'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((r, i) => {
                      const grade = sharpeGrade(r.sharpe);
                      const ri = results.indexOf(r);
                      return (
                        <tr key={i}
                          className={`border-t hover:bg-slate-50/50 cursor-pointer transition-colors ${ri === activeIdx ? 'bg-primary/5' : ''}`}
                          onClick={() => setActiveIdx(ri)}>
                          <td className="px-3 py-2 font-bold text-muted-foreground font-mono">#{r.rank}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[ri % PALETTE.length] }} />
                              <span className="font-semibold text-slate-700">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                            {fSign(r.annReturn * 100, 1)}%
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.annVol)}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fNum(r.sharpe)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.sortino)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.calmar !== null ? fNum(r.calmar) : '—'}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.mdd)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.winRate, 0)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fSign(r.skew)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fSign(r.kurt)}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${grade.cls}`}>{grade.label}</span>
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
        {isConfigured && active && best && (() => {
          const worst      = sorted[sorted.length - 1];
          const grade      = sharpeGrade(active.sharpe);
          const spread     = best.sharpe - worst.sharpe;
          const negSkew    = active.skew < -0.5;
          const fatTails   = active.kurt > 1;
          const sortSharpe = active.sortino > active.sharpe * 1.2;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>
                  Auto-generated Sharpe analysis · {results.length} asset{results.length !== 1 ? 's' : ''} · rf = {fPct(rfAnnual)} · {freq}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Risk-Adjusted Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    {results.length > 1
                      ? <><span className="font-semibold">{best.name}</span> leads with a Sharpe Ratio of{' '}
                          <span className="font-semibold">{fNum(best.sharpe)}</span>{' '}
                          (<span className={`font-semibold text-xs px-1 py-0.5 rounded ${sharpeGrade(best.sharpe).cls}`}>{sharpeGrade(best.sharpe).label}</span>),
                          delivering <span className="font-semibold">{fPct(best.annReturn)}</span> annualized return
                          at <span className="font-semibold">{fPct(best.annVol)}</span> volatility.{' '}
                          {spread > 0.3 && <><span className="font-semibold">{worst.name}</span> trails significantly ({fNum(worst.sharpe)}), a spread of {fNum(spread)} — material differentiation in risk-adjusted quality.</>}
                        </>
                      : <><span className="font-semibold">{active.name}</span> generated a Sharpe Ratio of{' '}
                          <span className="font-semibold">{fNum(active.sharpe)}</span>{' '}
                          (<span className={`font-semibold text-xs px-1 py-0.5 rounded ${grade.cls}`}>{grade.label}</span>)
                          over {active.returns.length} {freq} observations.
                        </>}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Sharpe',       value: fNum(active.sharpe),              sub: grade.label },
                    { label: 'Sortino',      value: fNum(active.sortino),             sub: 'Downside-adj.' },
                    { label: 'Ann. Return',  value: `${fSign(active.annReturn * 100, 1)}%`, sub: `Vol ${fPct(active.annVol)}` },
                    { label: 'Skew / Kurt',  value: `${fSign(active.skew, 2)} / ${fSign(active.kurt, 2)}`, sub: 'Return shape' },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Sharpe Interpretation</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {active.name}'s Sharpe of <span className="font-semibold">{fNum(active.sharpe)}</span>{' '}
                        means the portfolio earns <span className="font-semibold">{fNum(active.sharpe)}</span> units
                        of excess return per unit of total volatility above rf ({fPct(rfAnnual)}).{' '}
                        {active.sharpe >= 1.0
                          ? 'A ratio above 1.0 is generally considered good for equity strategies — the reward compensates for the risk assumed.'
                          : active.sharpe >= 0.5
                          ? 'A ratio between 0.5–1.0 is acceptable but suggests limited compensation for the volatility taken. Consider whether diversification or factor exposure could improve it.'
                          : active.sharpe < 0
                          ? 'A negative Sharpe indicates the asset is generating less than the risk-free rate after accounting for volatility — destruction of risk-adjusted value.'
                          : 'A ratio below 0.5 is sub-par — the asset is not adequately compensating investors for its volatility.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Sortino vs Sharpe</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {active.name}'s Sortino ({fNum(active.sortino)}) is{' '}
                        {sortSharpe
                          ? <>significantly higher than its Sharpe ({fNum(active.sharpe)}), indicating that <span className="font-semibold">upside volatility dominates</span> — losses are infrequent and contained. The Sharpe penalizes both up and down moves equally, understating this asset's quality.</>
                          : <>close to its Sharpe ({fNum(active.sharpe)}), suggesting that downside and upside volatility are roughly symmetric — gains and losses contribute equally to overall risk.</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Return Distribution</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Skewness {fSign(active.skew, 2)}{negSkew ? ' (negative)' : active.skew > 0.5 ? ' (positive)' : ' (near-symmetric)'}:{' '}
                        {negSkew
                          ? 'The return distribution has a long left tail — large losses occur more frequently than a normal distribution would predict. VaR and Sharpe may understate true risk.'
                          : active.skew > 0.5
                          ? 'The distribution is right-skewed — occasional large gains pull the mean up. Positive skew is favorable for investors.'
                          : 'The distribution is approximately symmetric.'}
                        {' '}Excess kurtosis {fSign(active.kurt, 2)}{fatTails ? ' (fat tails)' : ''}:{' '}
                        {fatTails
                          ? 'Fat tails indicate a higher probability of extreme outcomes than a normal distribution. Sharpe Ratio assumes normality and may overstate risk-adjusted performance.'
                          : 'Tails are close to normal — Sharpe Ratio assumptions are broadly valid for this asset.'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Sharpe = (Ann. Return − rf) / Ann. Vol. Sortino = (Ann. Return − rf) / Downside Deviation (semi-deviation below rf).
                  Calmar = Ann. Return / Max Drawdown. Annualization: daily ×252, weekly ×52, monthly ×12 for returns; ×√ann for vol.
                  Rolling Sharpe computed over {Math.min(20, active ? Math.floor(active.returns.length / 3) : 20)}-period window.
                  Skewness and excess kurtosis computed from sample moments.
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
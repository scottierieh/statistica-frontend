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
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, LabelList,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  TrendingDown, BarChart3, Activity, Plus, Trash2,
  CheckCircle, FileText, Eye, X,
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
  id:         string;
  name:       string;
  enabled:    boolean;
  returns:    string;   // comma-separated
}

interface DrawdownPeriod {
  startIdx:   number;
  peakIdx:    number;
  troughIdx:  number;
  endIdx:     number | null;   // null = not yet recovered
  drawdown:   number;          // 0–1 fraction
  durationDD: number;          // periods from peak to trough
  durationRec: number | null;  // periods from trough to recovery (null = not recovered)
}

interface MDDResult {
  asset:           string;
  returns:         number[];
  cumulative:      number[];   // indexed wealth (start = 1)
  peaks:           number[];   // running peak
  drawdowns:       number[];   // drawdown series (0 to -1)
  mdd:             number;     // maximum drawdown fraction
  mddStart:        number;     // index of peak before MDD
  mddTrough:       number;     // index of trough
  mddEnd:          number | null; // index of recovery
  calmarRatio:     number | null;
  ulcerIndex:      number;
  avgDrawdown:     number;
  numDrawdowns:    number;
  periods:         DrawdownPeriod[];
  // chart-ready
  chartData:       { label: string; cumRet: number; drawdown: number; peak: number }[];
  topDrawdowns:    DrawdownPeriod[];
}

// ─────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────

function detectAndNormalize(nums: number[]): number[] {
  const isPercent = nums.some(n => Math.abs(n) > 1);
  return isPercent ? nums.map(n => n / 100) : nums;
}

function parseReturns(str: string): number[] {
  const nums = str.split(/[\s,;]+/).map(s => parseFloat(s)).filter(v => isFinite(v));
  return detectAndNormalize(nums);
}

function computeMDD(name: string, rets: number[]): MDDResult {
  const n      = rets.length;
  const cumul  = new Array(n + 1).fill(1);
  for (let i = 0; i < n; i++) cumul[i + 1] = cumul[i] * (1 + rets[i]);

  const peaks    = new Array(n + 1).fill(1);
  const ddSeries = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    peaks[i]    = Math.max(peaks[i - 1], cumul[i]);
    ddSeries[i] = (cumul[i] - peaks[i]) / peaks[i];
  }

  // MDD
  let mdd = 0, mddTrough = 0;
  for (let i = 0; i <= n; i++) if (ddSeries[i] < mdd) { mdd = ddSeries[i]; mddTrough = i; }

  // Peak before trough
  let mddStart = 0;
  for (let i = mddTrough; i >= 0; i--) {
    if (cumul[i] >= peaks[mddTrough]) { mddStart = i; break; }
  }

  // Recovery after trough
  let mddEnd: number | null = null;
  for (let i = mddTrough; i <= n; i++) {
    if (cumul[i] >= peaks[mddTrough]) { mddEnd = i; break; }
  }

  // All drawdown periods (peak-to-peak segments)
  const periods: DrawdownPeriod[] = [];
  let inDD = false, peakV = cumul[0], peakI = 0, troughV = cumul[0], troughI = 0;
  for (let i = 1; i <= n; i++) {
    if (!inDD && cumul[i] < peaks[i]) {
      inDD = true;
      // Find actual peak
      peakI = i - 1;
      for (let j = i - 1; j >= 0; j--) {
        if (cumul[j] >= peaks[i]) { peakI = j; break; }
      }
      peakV  = cumul[peakI];
      troughI = i; troughV = cumul[i];
    }
    if (inDD) {
      if (cumul[i] < troughV) { troughV = cumul[i]; troughI = i; }
      if (cumul[i] >= peakV) {
        inDD = false;
        periods.push({
          startIdx:    peakI,
          peakIdx:     peakI,
          troughIdx:   troughI,
          endIdx:      i,
          drawdown:    (troughV - peakV) / peakV,
          durationDD:  troughI - peakI,
          durationRec: i - troughI,
        });
      }
    }
  }
  // Still in drawdown at end
  if (inDD) {
    periods.push({
      startIdx:    peakI,
      peakIdx:     peakI,
      troughIdx:   troughI,
      endIdx:      null,
      drawdown:    (troughV - peakV) / peakV,
      durationDD:  troughI - peakI,
      durationRec: null,
    });
  }

  const topDrawdowns = [...periods].sort((a, b) => a.drawdown - b.drawdown).slice(0, 5);

  // Annualized return (simple)
  const totalReturn = cumul[n] - 1;
  const annReturn   = Math.pow(cumul[n], 252 / n) - 1;
  const calmar      = mdd !== 0 ? annReturn / Math.abs(mdd) : null;

  // Ulcer Index = sqrt(mean of dd²)
  const ulcer = Math.sqrt(ddSeries.reduce((s, d) => s + d * d, 0) / (n + 1));

  // Average drawdown (only negative)
  const ddNeg = ddSeries.filter(d => d < 0);
  const avgDD = ddNeg.length ? ddNeg.reduce((s, d) => s + d, 0) / ddNeg.length : 0;

  // Chart data
  const step = Math.max(1, Math.floor((n + 1) / 300));
  const chartData: MDDResult['chartData'] = [];
  for (let i = 0; i <= n; i += step) {
    chartData.push({
      label:    `${i}`,
      cumRet:   parseFloat(((cumul[i] - 1) * 100).toFixed(2)),
      drawdown: parseFloat((ddSeries[i] * 100).toFixed(2)),
      peak:     parseFloat(((peaks[i] - 1) * 100).toFixed(2)),
    });
  }

  return {
    asset: name, returns: rets, cumulative: cumul, peaks, drawdowns: ddSeries,
    mdd, mddStart, mddTrough, mddEnd, calmarRatio: calmar,
    ulcerIndex: ulcer, avgDrawdown: avgDD,
    numDrawdowns: periods.length, periods, topDrawdowns,
    chartData,
  };
}

// ─────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────

function fPct(n: number, d = 2): string { return `${(n * 100).toFixed(d)}%`; }
function fMult(n: number): string       { return `${n.toFixed(3)}×`; }

function mddLabel(mdd: number): { label: string; cls: string } {
  const a = Math.abs(mdd);
  if (a < 0.05)  return { label: 'Minimal',      cls: 'bg-emerald-100 text-emerald-700' };
  if (a < 0.15)  return { label: 'Moderate',     cls: 'bg-green-100 text-green-700' };
  if (a < 0.30)  return { label: 'Significant',  cls: 'bg-amber-100 text-amber-700' };
  if (a < 0.50)  return { label: 'Severe',       cls: 'bg-orange-100 text-orange-700' };
  return           { label: 'Catastrophic',   cls: 'bg-slate-200 text-slate-700' };
}

const PALETTE = ['#6C3AED','#10B981','#F59E0B','#3B82F6','#8B5CF6','#06B6D4'];
const DD_COLOR = '#6C3AED';

// ─────────────────────────────────────────────
// Default example data
// ─────────────────────────────────────────────

const DEMO_RETS_A = [
   0.012,-0.008, 0.018, 0.005,-0.022, 0.015, 0.009,-0.031, 0.024,-0.018,
   0.007, 0.021,-0.014, 0.033,-0.009, 0.016,-0.005, 0.028,-0.044, 0.019,
  -0.012, 0.031,-0.008, 0.022, 0.006,-0.017, 0.025,-0.011, 0.038,-0.007,
   0.013,-0.024, 0.029, 0.004,-0.053, 0.041,-0.016, 0.022,-0.008, 0.031,
  -0.019, 0.026,-0.007, 0.018, 0.043,-0.027, 0.011,-0.034, 0.022, 0.009,
   0.014,-0.011, 0.027,-0.006, 0.019, 0.008,-0.023, 0.035,-0.014, 0.028,
   0.003,-0.016, 0.024,-0.009, 0.031,-0.021, 0.017,-0.008, 0.026, 0.012,
  -0.038, 0.029,-0.011, 0.023,-0.005, 0.018, 0.007,-0.029, 0.033,-0.015,
   0.021,-0.009, 0.027, 0.004,-0.048, 0.039,-0.013, 0.025,-0.007, 0.034,
  -0.022, 0.017, 0.011,-0.014, 0.028,-0.006, 0.023,-0.031, 0.016, 0.009,
   0.019,-0.008, 0.025,-0.012, 0.034,-0.017, 0.009,-0.026, 0.021, 0.015,
  -0.007, 0.030,-0.019, 0.024,-0.003, 0.016,-0.011, 0.028,-0.009, 0.022,
];

const DEMO_RETS_B = [
   0.008,-0.005, 0.012, 0.003,-0.015, 0.010, 0.006,-0.019, 0.016,-0.012,
   0.005, 0.014,-0.009, 0.022,-0.006, 0.011,-0.003, 0.018,-0.028, 0.013,
  -0.008, 0.020,-0.005, 0.015, 0.004,-0.011, 0.017,-0.007, 0.025,-0.005,
   0.009,-0.016, 0.019, 0.003,-0.035, 0.027,-0.011, 0.015,-0.005, 0.021,
  -0.013, 0.017,-0.005, 0.012, 0.029,-0.018, 0.007,-0.022, 0.015, 0.006,
   0.010,-0.007, 0.018,-0.004, 0.013, 0.005,-0.015, 0.024,-0.009, 0.019,
   0.002,-0.011, 0.016,-0.006, 0.021,-0.014, 0.011,-0.005, 0.017, 0.008,
  -0.025, 0.020,-0.007, 0.015,-0.003, 0.012, 0.005,-0.019, 0.022,-0.010,
   0.014,-0.006, 0.018, 0.003,-0.032, 0.026,-0.009, 0.017,-0.005, 0.023,
  -0.015, 0.011, 0.007,-0.009, 0.019,-0.004, 0.016,-0.021, 0.011, 0.006,
   0.013,-0.005, 0.017,-0.008, 0.023,-0.011, 0.006,-0.017, 0.014, 0.010,
  -0.005, 0.021,-0.013, 0.016,-0.002, 0.011,-0.007, 0.019,-0.006, 0.015,
];

function defaultManualAssets(): AssetInput[] {
  return [
    { id: '1', name: 'Portfolio A', enabled: true,
      returns: DEMO_RETS_A.map(r => (r * 100).toFixed(2)).join(', ') },
    { id: '2', name: 'Portfolio B', enabled: true,
      returns: DEMO_RETS_B.map(r => (r * 100).toFixed(2)).join(', ') },
  ];
}

function generateExampleCSV(): Record<string, any>[] {
  return DEMO_RETS_A.map((r, i) => ({
    period:      i + 1,
    portfolio_a: (r * 100).toFixed(4),
    portfolio_b: (DEMO_RETS_B[i] * 100).toFixed(4),
  }));
}

// ─────────────────────────────────────────────
// Custom Tooltips
// ─────────────────────────────────────────────

const CumRetTip = ({ active, payload, label }: any) => {
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
          <span className="font-mono font-semibold">
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
};

const DDTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">Period {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
};

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{Math.abs(p.value).toFixed(2)}%</span>
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
            <TrendingDown className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Maximum Drawdown (MDD)</CardTitle>
        <CardDescription className="text-base mt-2">
          Measure peak-to-trough decline to quantify downside risk — analyze MDD, drawdown duration, recovery time, Calmar Ratio, and Ulcer Index across one or more portfolios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <TrendingDown className="w-6 h-6 text-primary mb-2" />,
              title: 'Maximum Drawdown',
              desc: 'MDD = (Trough − Peak) / Peak. The largest peak-to-trough decline in the cumulative return series. Measures worst-case loss from a high-water mark.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Drawdown Duration',
              desc: 'Time from peak to trough (decline duration) and from trough to full recovery. Portfolios that recover slowly impose greater opportunity cost.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Calmar & Ulcer Index',
              desc: 'Calmar Ratio = Annualized Return / |MDD| — higher is better. Ulcer Index = √(mean of squared drawdowns) — penalizes deep and prolonged drawdowns.',
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
            { range: '< 5%',     label: 'Minimal',      cls: 'bg-emerald-100 text-emerald-700' },
            { range: '5–15%',    label: 'Moderate',     cls: 'bg-green-100 text-green-700' },
            { range: '15–30%',   label: 'Significant',  cls: 'bg-amber-100 text-amber-700' },
            { range: '30–50%+',  label: 'Severe',       cls: 'bg-orange-100 text-orange-700' },
          ].map(({ range, label, cls }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
              <div className="text-xs text-muted-foreground mt-1.5 font-mono">{range}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <p className="text-sm text-muted-foreground mb-4">
            One column of return observations per portfolio. Optional period column for labels.
            Returns in decimal (0.012) or percent (1.2) — auto-detected.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600 overflow-x-auto">
              <div>period, portfolio_a, portfolio_b</div>
              <div>1, 1.2, 0.8</div>
              <div>2, -0.8, -0.5</div>
              <div>3, 1.8, 1.2</div>
              <div>4, 0.5, 0.3</div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                'One row per period (daily, weekly, monthly)',
                'Multiple portfolios as separate columns',
                'Returns in decimal or percent — auto-detected',
                'At least 5 observations required',
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
            <TrendingDown className="mr-2 h-5 w-5" />Load Example Data
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

export default function MDDPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [manualAssets,  setManualAssets]  = useState<AssetInput[]>(defaultManualAssets());
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [chartTab,      setChartTab]      = useState<'cumulative' | 'drawdown'>('cumulative');

  // CSV
  const [periodCol,  setPeriodCol]  = useState('');
  const [assetCols,  setAssetCols]  = useState<string[]>([]);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_mdd.csv');
    setInputMode('csv');
    setHasStarted(true);
    setPeriodCol('period');
    setAssetCols(['portfolio_a', 'portfolio_b']);
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
    const pi = hl.findIndex(h => ['period','date','time','month','day','week'].some(k => h.includes(k)));
    if (pi !== -1) setPeriodCol(allHeaders[pi]);
    const retCols = numericHeaders.filter((_, i) => i !== pi);
    setAssetCols(retCols.slice(0, 6)); // max 6 by default
  }, [hasData, allHeaders, numericHeaders, assetCols.length]);

  // ── Build inputs ──────────────────────────────────────────
  const activeInputs: { name: string; returns: number[] }[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && assetCols.length) {
      return assetCols.map(col => {
        const nums = data.map(r => parseFloat(String(r[col] ?? ''))).filter(v => isFinite(v));
        return { name: col, returns: detectAndNormalize(nums) };
      }).filter(a => a.returns.length >= 5);
    }
    if (inputMode === 'manual') {
      return manualAssets
        .filter(a => a.enabled && a.name.trim())
        .map(a => ({ name: a.name.trim(), returns: parseReturns(a.returns) }))
        .filter(a => a.returns.length >= 5);
    }
    return [];
  }, [inputMode, hasData, data, assetCols, manualAssets]);

  // ── Compute MDD ───────────────────────────────────────────
  const results: MDDResult[] = useMemo(() =>
    activeInputs.map(a => computeMDD(a.name, a.returns)),
    [activeInputs]
  );

  const isConfigured = results.length > 0;
  const active       = results[Math.min(activeIdx, results.length - 1)] ?? null;
  const isExample    = (fileName ?? '').startsWith('example_');

  // ── Multi-portfolio comparison bar chart ──────────────────
  const compBarData = useMemo(() =>
    results.map(r => ({
      asset:   r.asset,
      mdd:     parseFloat((r.mdd * 100).toFixed(2)),
      avgDD:   parseFloat((r.avgDrawdown * 100).toFixed(2)),
    })),
    [results]
  );

  // ── MDD label ─────────────────────────────────────────────
  const mddLbl = active ? mddLabel(active.mdd) : null;

  // ── Manual handlers ───────────────────────────────────────
  const handleManualChange = useCallback((id: string, field: keyof AssetInput, val: string | boolean) => {
    setManualAssets(prev => prev.map(a => a.id !== id ? a : { ...a, [field]: val }));
  }, []);

  const handleAddAsset = useCallback(() => {
    setManualAssets(prev => [
      ...prev,
      { id: String(Date.now()), name: `Portfolio ${prev.length + 1}`, enabled: true, returns: '' },
    ]);
  }, []);

  const handleDeleteAsset = useCallback((id: string) => {
    setManualAssets(prev => prev.filter(a => a.id !== id));
    setActiveIdx(0);
  }, []);

  const toggleAssetCol = (col: string) =>
    setAssetCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = results.map(r => ({
      asset:               r.asset,
      observations:        r.returns.length,
      mdd_pct:             fPct(r.mdd),
      mdd_peak_period:     r.mddStart,
      mdd_trough_period:   r.mddTrough,
      mdd_recovery_period: r.mddEnd ?? 'Not recovered',
      decline_duration:    r.mddTrough - r.mddStart,
      recovery_duration:   r.mddEnd !== null ? r.mddEnd - r.mddTrough : 'N/A',
      avg_drawdown_pct:    fPct(r.avgDrawdown),
      num_drawdowns:       r.numDrawdowns,
      calmar_ratio:        r.calmarRatio?.toFixed(3) ?? 'N/A',
      ulcer_index:         fPct(r.ulcerIndex),
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `MDD_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, results, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image…' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link   = document.createElement('a');
      link.download = `MDD_${new Date().toISOString().split('T')[0]}.png`;
      link.href     = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Intro gate ─────────────────────────────────────────────
  if (!hasData && !hasStarted) return (
    <IntroPage
      onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }}
    />
  );

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
              ? `${results.length} portfolio${results.length !== 1 ? 's' : ''} · ${active?.returns.length ?? 0} periods`
              : hasData ? `${data.length} rows · ${allHeaders.length} cols` : `${manualAssets.length} assets`}
          </span>
          {isExample && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={handleClearAll}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {hasData && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" />{fileName || 'Uploaded file'}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-auto flex-1 min-h-0 rounded-md border border-slate-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b">
                    {allHeaders.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50/50">
                      {allHeaders.map(h => (
                        <td key={h} className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">{String(row[h] ?? '-')}</td>
                      ))}
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
            <TrendingDown className="h-5 w-5" />Maximum Drawdown (MDD)
          </CardTitle>
          <CardDescription>
            Measure peak-to-trough decline across the full return series. Analyze MDD severity, drawdown duration, recovery time, Calmar Ratio, and Ulcer Index — with side-by-side multi-portfolio comparison.
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
                  ? 'Select columns representing portfolio return series.'
                  : 'Enter return series per portfolio (comma-separated decimal or %).'}
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
        <CardContent>

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
                  PORTFOLIO / RETURN COLUMNS — {assetCols.length} selected
                </Label>
                <div className="flex flex-wrap gap-2">
                  {numericHeaders.filter(h => h !== periodCol).map(h => (
                    <button key={h} onClick={() => toggleAssetCol(h)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors ${
                        assetCols.includes(h)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                      }`}>
                      {h}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Click to toggle. Select at least 1 column.</p>
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
                      {['On', 'Portfolio Name', 'Return Series (comma-separated, decimal or %)', ''].map(h => (
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
                          <Input className="h-7 text-xs w-32 font-semibold" value={a.name}
                            onChange={e => handleManualChange(a.id, 'name', e.target.value)}
                            placeholder="Portfolio A" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[400px]"
                            value={a.returns}
                            onChange={e => handleManualChange(a.id, 'returns', e.target.value)}
                            placeholder="0.012, -0.008, 0.018, …" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600"
                            onClick={() => handleDeleteAsset(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddAsset}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Portfolio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Portfolio selector + Export ── */}
      {isConfigured && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          {results.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Detail view</Label>
              <Select value={String(activeIdx)} onValueChange={v => setActiveIdx(Number(v))}>
                <SelectTrigger className="text-xs h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {results.map((r, i) => (
                    <SelectItem key={i} value={String(i)}>{r.asset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Download className="mr-2 h-4 w-4" />Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Summary)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <ImageIcon className="mr-2 h-4 w-4" />}
                PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && active && mddLbl && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Maximum Drawdown
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fPct(active.mdd)}</div>
            <div className="mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${mddLbl.cls}`}>
                {mddLbl.label}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Decline Duration
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.mddTrough - active.mddStart}
              <span className="text-sm font-normal text-muted-foreground ml-1">periods</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Peak → Trough</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recovery Duration
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.mddEnd !== null
                ? <>{active.mddEnd - active.mddTrough}<span className="text-sm font-normal text-muted-foreground ml-1">periods</span></>
                : <span className="text-slate-400 text-lg">Not recovered</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Trough → High-water mark</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Calmar Ratio
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.calmarRatio !== null ? active.calmarRatio.toFixed(2) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Ann. Return / |MDD| · Ulcer: {fPct(active.ulcerIndex)}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Cumulative Return & Drawdown Chart ── */}
        {isConfigured && active && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {chartTab === 'cumulative' ? 'Cumulative Return' : 'Drawdown Series'} — {active.asset}
                  </CardTitle>
                  <CardDescription>
                    {chartTab === 'cumulative'
                      ? 'Indexed wealth (start = 0%) with running peak line'
                      : 'Percentage decline from most recent peak at each point in time'}
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {(['cumulative', 'drawdown'] as const).map(t => (
                    <Button key={t} size="sm"
                      variant={chartTab === t ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs capitalize"
                      onClick={() => setChartTab(t)}>
                      {t === 'cumulative' ? 'Cumulative' : 'Drawdown'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {chartTab === 'cumulative' ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={active.chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE[0]} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }}
                      tickLine={false} axisLine={{ stroke: '#E2E8F0' }}
                      interval={Math.floor(active.chartData.length / 6)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`} />
                    <Tooltip content={<CumRetTip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                    {/* Running peak line */}
                    <Area type="monotone" dataKey="peak" name="Peak" stroke="#CBD5E1"
                      fill="none" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    {/* Cumulative return */}
                    <Area type="monotone" dataKey="cumRet" name="Cumulative Return"
                      stroke={PALETTE[0]} fill="url(#gradCum)"
                      strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={active.chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="gradDD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={DD_COLOR} stopOpacity={0.20} />
                        <stop offset="95%" stopColor={DD_COLOR} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }}
                      tickLine={false} axisLine={{ stroke: '#E2E8F0' }}
                      interval={Math.floor(active.chartData.length / 6)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v.toFixed(0)}%`} />
                    <Tooltip content={<DDTip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                    {/* MDD reference line */}
                    <ReferenceLine y={parseFloat((active.mdd * 100).toFixed(2))}
                      stroke={DD_COLOR} strokeDasharray="4 2" strokeWidth={1.5}
                      label={{ value: `MDD ${fPct(active.mdd)}`, position: 'insideBottomLeft', fontSize: 10, fill: DD_COLOR }} />
                    <Area type="monotone" dataKey="drawdown" name="Drawdown"
                      stroke={DD_COLOR} fill="url(#gradDD)"
                      strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {chartTab === 'cumulative' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 border-t-2 border-primary" />Cumulative Return
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 border-t-2 border-dashed border-slate-300" />Running Peak
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 border-t-2 border-primary" />Drawdown %
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 border-t-2 border-dashed border-primary/60" />MDD Level
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Multi-Portfolio MDD Comparison ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Portfolio MDD Comparison</CardTitle>
              <CardDescription>Maximum Drawdown and Average Drawdown side-by-side across all portfolios</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, results.length * 56)}>
                <BarChart
                  data={compBarData.map(d => ({ ...d, mdd: Math.abs(d.mdd), avgDD: Math.abs(d.avgDD) }))}
                  layout="vertical"
                  margin={{ top: 4, right: 80, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="asset"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="mdd" name="Max Drawdown %" maxBarSize={16} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="mdd" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => `${v.toFixed(2)}%`} />
                    {compBarData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="avgDD" name="Avg Drawdown %" maxBarSize={16} radius={[0, 3, 3, 0]}>
                    {compBarData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.35} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-primary/80" />Max Drawdown
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-primary/30" />Avg Drawdown
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Summary Comparison Table (multi) ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Portfolio Risk Comparison
              </CardTitle>
              <CardDescription>Side-by-side MDD metrics across all portfolios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Portfolio', 'MDD', 'Avg DD', '# Drawdowns', 'Decline Dur.', 'Recovery Dur.', 'Calmar', 'Ulcer Index', 'Severity'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => {
                      const lbl = mddLabel(r.mdd);
                      return (
                        <tr key={i}
                          className={`border-t hover:bg-slate-50/50 cursor-pointer ${activeIdx === i ? 'bg-primary/5' : ''}`}
                          onClick={() => setActiveIdx(i)}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                              <span className="font-semibold text-slate-700">{r.asset}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fPct(r.mdd)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.avgDrawdown)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.numDrawdowns}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.mddTrough - r.mddStart}p</td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {r.mddEnd !== null ? `${r.mddEnd - r.mddTrough}p` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {r.calmarRatio?.toFixed(2) ?? '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.ulcerIndex)}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${lbl.cls}`}>{lbl.label}</span>
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

        {/* ── Top Drawdown Periods ── */}
        {isConfigured && active && active.topDrawdowns.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top {active.topDrawdowns.length} Drawdown Periods — {active.asset}</CardTitle>
              <CardDescription>Worst peak-to-trough declines ranked by severity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Rank', 'Drawdown', 'Peak Period', 'Trough Period', 'Recovery Period', 'Decline Duration', 'Recovery Duration', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.topDrawdowns.map((p, i) => (
                      <tr key={i} className={`border-t hover:bg-slate-50/50 ${i === 0 ? 'bg-slate-50/60' : ''}`}>
                        <td className="px-3 py-2 font-bold text-slate-500 font-mono">#{i + 1}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fPct(p.drawdown)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{p.peakIdx}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{p.troughIdx}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{p.endIdx ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{p.durationDD}p</td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {p.durationRec !== null ? `${p.durationRec}p` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {p.endIdx !== null
                            ? <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Recovered</span>
                            : <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">Ongoing</span>}
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
        {isConfigured && active && mddLbl && (() => {
          const totalReturn   = active.cumulative[active.returns.length] - 1;
          const recoverNeeded = Math.abs(active.mdd) / (1 + active.mdd);
          const stillInDD     = active.mddEnd === null;
          const declineDur    = active.mddTrough - active.mddStart;
          const recovDur      = active.mddEnd !== null ? active.mddEnd - active.mddTrough : null;
          const bestCalmar    = results.reduce((best, r) =>
            (r.calmarRatio ?? -Infinity) > (best?.calmarRatio ?? -Infinity) ? r : best, results[0]);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>
                  Auto-generated MDD analysis · {active.asset} · {active.returns.length} periods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Drawdown Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    <span className="font-semibold">{active.asset}</span> experienced a Maximum Drawdown of{' '}
                    <span className="font-semibold">{fPct(active.mdd)}</span>{' '}
                    (<span className={`font-semibold text-xs px-1 py-0.5 rounded ${mddLbl.cls}`}>{mddLbl.label}</span>),
                    peaking at period {active.mddStart} and reaching the trough at period {active.mddTrough}{' '}
                    (decline over {declineDur} period{declineDur !== 1 ? 's' : ''}).
                    To fully recover, the portfolio needed to gain{' '}
                    <span className="font-semibold">{fPct(recoverNeeded)}</span> from the trough.{' '}
                    {stillInDD
                      ? 'The portfolio has not yet recovered to its prior peak.'
                      : `Full recovery was achieved after ${recovDur} period${recovDur !== 1 ? 's' : ''} from the trough.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'MDD',           value: fPct(active.mdd),           sub: mddLbl.label },
                    { label: 'Total Return',  value: `${totalReturn >= 0 ? '+' : ''}${fPct(totalReturn)}`, sub: `${active.returns.length} periods` },
                    { label: 'Calmar Ratio',  value: active.calmarRatio?.toFixed(2) ?? '—',   sub: 'Ann. Return / |MDD|' },
                    { label: 'Ulcer Index',   value: fPct(active.ulcerIndex),    sub: '√(mean DD²)' },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Drawdown Severity</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        An MDD of <span className="font-semibold">{fPct(active.mdd)}</span> classifies as{' '}
                        <span className="font-semibold">{mddLbl.label}</span>.{' '}
                        {Math.abs(active.mdd) < 0.15
                          ? 'Drawdowns below 15% are generally tolerable for long-term investors and indicate controlled downside risk.'
                          : Math.abs(active.mdd) < 0.30
                          ? 'Drawdowns in the 15–30% range require significant patience from investors and may indicate elevated equity-like risk.'
                          : 'Drawdowns exceeding 30% represent severe impairment of capital and require proportionally larger gains to recover — at 50% MDD, a 100% gain is needed to break even.'}
                        {' '}Recovery required a gain of <span className="font-semibold">{fPct(recoverNeeded)}</span> from the trough.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Calmar Ratio & Risk-Adjusted Return</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The Calmar Ratio of <span className="font-semibold">{active.calmarRatio?.toFixed(2) ?? '—'}</span>{' '}
                        represents annualized return per unit of maximum drawdown.
                        {active.calmarRatio !== null && (
                          active.calmarRatio >= 1.0
                            ? ' A ratio above 1.0 is generally considered strong — the portfolio earns more than 1× its worst drawdown annually.'
                            : active.calmarRatio >= 0.5
                            ? ' A ratio of 0.5–1.0 is acceptable for equity-oriented strategies, though capital at risk relative to return is meaningful.'
                            : ' A ratio below 0.5 indicates the drawdown risk is large relative to the return generated — consider reviewing position sizing or diversification.'
                        )}
                        {results.length > 1 && bestCalmar.asset !== active.asset
                          ? ` Among analyzed portfolios, ${bestCalmar.asset} has the highest Calmar Ratio (${bestCalmar.calmarRatio?.toFixed(2)}).`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Ulcer Index & Drawdown Frequency</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The Ulcer Index of <span className="font-semibold">{fPct(active.ulcerIndex)}</span>{' '}
                        measures the depth and duration of all drawdowns (not just the maximum).
                        Unlike MDD which captures only the worst event, the Ulcer Index reflects overall drawdown stress.
                        The portfolio experienced <span className="font-semibold">{active.numDrawdowns}</span> distinct drawdown period{active.numDrawdowns !== 1 ? 's' : ''}{' '}
                        with an average depth of <span className="font-semibold">{fPct(active.avgDrawdown)}</span>.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ MDD = (Trough − Peak) / Peak. Calmar Ratio = annualized return / |MDD| (assumes daily frequency: (V_n/V_0)^(252/n) − 1).
                  Ulcer Index = √(mean of squared drawdowns across all periods). Average Drawdown = mean of all negative drawdown observations.
                  "p" = periods (unit depends on input frequency). Recovery-required gain = |MDD| / (1 + MDD).
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
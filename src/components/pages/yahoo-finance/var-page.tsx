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
  ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine,
  LabelList,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  ShieldAlert, TrendingDown, BarChart3, Activity, Plus, Trash2,
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
  id:      string;
  name:    string;
  value:   number | null;   // position value $
  returns: string;          // comma-separated
}

interface VaRResult {
  asset:         string;
  value:         number;
  returns:       number[];
  mu:            number;    // daily mean
  sigma:         number;    // daily std
  // Parametric (normal)
  varP90:        number;
  varP95:        number;
  varP99:        number;
  // Historical simulation
  varH90:        number;
  varH95:        number;
  varH99:        number;
  // Expected Shortfall / CVaR
  esH95:         number;
  esH99:         number;
  // Monte Carlo
  varMC95:       number;
  varMC99:       number;
  // Max drawdown
  maxDD:         number;
  // Chart data
  histogram:     { bin: string; midpt: number; count: number; isLoss: boolean }[];
  sortedRets:    number[];
}

// ─────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────

const Z = { 90: 1.2816, 95: 1.6449, 99: 2.3263 } as const;

function arrMean(a: number[]) { return a.reduce((s, v) => s + v, 0) / a.length; }
function arrStd(a: number[], mu?: number) {
  const m = mu ?? arrMean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

function parametricVaR(mu: number, sigma: number, z: number, V: number) {
  return -(mu - z * sigma) * V;
}

function historicalVaR(sorted: number[], cl: number, V: number) {
  const idx = Math.floor((1 - cl) * sorted.length);
  return -sorted[Math.max(0, idx)] * V;
}

function expectedShortfall(sorted: number[], cl: number, V: number) {
  const cutIdx = Math.floor((1 - cl) * sorted.length);
  const tail   = sorted.slice(0, Math.max(1, cutIdx + 1));
  return -arrMean(tail) * V;
}

function computeMaxDD(rets: number[]) {
  let peak = 1, val = 1, dd = 0;
  for (const r of rets) {
    val *= (1 + r);
    if (val > peak) peak = val;
    dd = Math.max(dd, (peak - val) / peak);
  }
  return dd;
}

// Box-Muller
function randNorm(mu: number, sigma: number) {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function monteCarlo(mu: number, sigma: number, V: number, n = 5000) {
  return Array.from({ length: n }, () => randNorm(mu, sigma) * V).sort((a, b) => a - b);
}

function buildHistogram(rets: number[], bins = 32): VaRResult['histogram'] {
  if (!rets.length) return [];
  const mn = Math.min(...rets), mx = Math.max(...rets);
  const w  = (mx - mn) / bins || 0.001;
  const counts = new Array(bins).fill(0);
  for (const r of rets) counts[Math.min(bins - 1, Math.floor((r - mn) / w))]++;
  return counts.map((count, i) => {
    const midpt = mn + (i + 0.5) * w;
    return { bin: (midpt * 100).toFixed(2) + '%', midpt, count, isLoss: midpt < 0 };
  });
}

function scaleT(dailyVaR: number, T: number) { return dailyVaR * Math.sqrt(T); }

function parseReturns(str: string): number[] {
  return str.split(/[\s,;]+/)
    .map(s => parseFloat(s))
    .filter(isFinite)
    .map(n => Math.abs(n) > 1 ? n / 100 : n);
}

function computeVaR(a: AssetInput): VaRResult | null {
  const rets = parseReturns(a.returns);
  if (rets.length < 10 || !a.value || a.value <= 0) return null;

  const sorted = [...rets].sort((x, y) => x - y);
  const mu     = arrMean(rets);
  const sigma  = arrStd(rets, mu);
  const V      = a.value;

  // Monte Carlo
  const mcSims = monteCarlo(mu, sigma, V, 5000);

  return {
    asset: a.name, value: V, returns: rets, mu, sigma,
    varP90: parametricVaR(mu, sigma, Z[90], V),
    varP95: parametricVaR(mu, sigma, Z[95], V),
    varP99: parametricVaR(mu, sigma, Z[99], V),
    varH90: historicalVaR(sorted, 0.90, V),
    varH95: historicalVaR(sorted, 0.95, V),
    varH99: historicalVaR(sorted, 0.99, V),
    esH95: expectedShortfall(sorted, 0.95, V),
    esH99: expectedShortfall(sorted, 0.99, V),
    varMC95: -mcSims[Math.floor(0.05 * mcSims.length)],
    varMC99: -mcSims[Math.floor(0.01 * mcSims.length)],
    maxDD:   computeMaxDD(rets),
    histogram:   buildHistogram(rets),
    sortedRets:  sorted,
  };
}

// ─────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────

function fUSD(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(3)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fPct(n: number): string { return `${(n * 100).toFixed(2)}%`; }

function riskLabel(varPct: number) {
  if (varPct < 0.01) return { label: 'Low Risk',      cls: 'bg-emerald-100 text-emerald-700' };
  if (varPct < 0.02) return { label: 'Moderate',      cls: 'bg-amber-100 text-amber-700' };
  if (varPct < 0.04) return { label: 'Elevated',      cls: 'bg-orange-100 text-orange-700' };
  return               { label: 'High Risk',      cls: 'bg-red-100 text-red-600' };
}

const PALETTE = ['#6C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];

// ─────────────────────────────────────────────
// Default example data — 120 daily returns
// ─────────────────────────────────────────────

const DEMO_RETS = [
   0.0124,-0.0089, 0.0215, 0.0043,-0.0178, 0.0098, 0.0067,-0.0034, 0.0189, 0.0012,
  -0.0234, 0.0156, 0.0078,-0.0056, 0.0312,-0.0145, 0.0023,-0.0198, 0.0087, 0.0034,
  -0.0067, 0.0145,-0.0289, 0.0078, 0.0156,-0.0034, 0.0098,-0.0145, 0.0234, 0.0012,
   0.0067,-0.0198, 0.0123, 0.0056,-0.0312, 0.0189,-0.0023, 0.0145,-0.0078, 0.0034,
  -0.0156, 0.0289,-0.0045, 0.0067,-0.0123, 0.0198, 0.0034,-0.0089, 0.0156,-0.0067,
   0.0234,-0.0178, 0.0056, 0.0089,-0.0234, 0.0145, 0.0023,-0.0312, 0.0078, 0.0156,
  -0.0198, 0.0043, 0.0067,-0.0145, 0.0289,-0.0056, 0.0034,-0.0178, 0.0123, 0.0045,
  -0.0234, 0.0189,-0.0067, 0.0098, 0.0156,-0.0289, 0.0034,-0.0056, 0.0145,-0.0012,
   0.0312,-0.0234, 0.0067, 0.0156,-0.0098, 0.0023,-0.0145, 0.0189,-0.0067, 0.0045,
  -0.0178, 0.0234,-0.0012, 0.0078,-0.0312, 0.0145, 0.0089,-0.0234, 0.0067, 0.0023,
  -0.0456, 0.0023, 0.0189,-0.0389, 0.0245, 0.0078,-0.0167, 0.0312,-0.0089, 0.0156,
   0.0023,-0.0289, 0.0145, 0.0067,-0.0198, 0.0312,-0.0056, 0.0089,-0.0145, 0.0234,
];

function defaultManual(): AssetInput[] {
  return [{
    id: '1', name: 'My Portfolio', value: 1_000_000,
    returns: DEMO_RETS.map(r => (r * 100).toFixed(2)).join(', '),
  }];
}

function exampleCSV(): Record<string, any>[] {
  return DEMO_RETS.map((r, i) => ({
    date: `2024-${String(Math.floor(i / 21) + 1).padStart(2,'0')}-${String((i % 21) + 1).padStart(2,'0')}`,
    daily_return: (r * 100).toFixed(4),
    portfolio_value: 1_000_000,
  }));
}

// ─────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────

const HistoTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">Return ≈ {label}</p>
      <div className="flex justify-between gap-3">
        <span className="text-slate-500">Frequency</span>
        <span className="font-mono font-semibold">{payload[0].value}</span>
      </div>
    </div>
  );
};

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{fUSD(p.value)}</span>
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
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Value at Risk (VaR)</CardTitle>
        <CardDescription className="text-base mt-2">
          Compute maximum expected loss at specified confidence levels using Parametric, Historical Simulation, and Monte Carlo methods — with CVaR / Expected Shortfall and time-horizon scaling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <ShieldAlert className="w-6 h-6 text-primary mb-2" />,
              title: 'Three VaR Methods',
              desc: 'Parametric (normal distribution), Historical Simulation (empirical percentile), and Monte Carlo (5,000 scenarios). Each makes different assumptions about the return distribution.',
            },
            {
              icon: <TrendingDown className="w-6 h-6 text-primary mb-2" />,
              title: 'CVaR / Expected Shortfall',
              desc: 'Average loss given that the loss exceeds VaR — captures tail severity, not just threshold. More conservative and statistically coherent than VaR alone.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Horizon Scaling',
              desc: 'Scale daily VaR to multi-day horizons with the √T rule: VaR(T) = VaR(1)·√T. Supports 1d, 5d, 10d, 21d — useful for regulatory (Basel 10d 99%) reporting.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { cl: '90%', desc: '1-in-10 exceedance probability. Common internal threshold.' },
            { cl: '95%', desc: 'Standard reporting level. 1-in-20 probability.' },
            { cl: '99%', desc: 'Basel regulatory standard. 1-in-100 probability.' },
          ].map(({ cl, desc }) => (
            <div key={cl} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-sm font-bold text-primary mb-1">CL = {cl}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <p className="text-sm text-muted-foreground mb-4">
            One column of return observations per row. Returns in decimal (0.0124) or percent (1.24) — auto-detected.
            Optional date and portfolio_value columns.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600 overflow-x-auto">
              <div>date, daily_return, portfolio_value</div>
              <div>2024-01-02, 1.24, 1000000</div>
              <div>2024-01-03, -0.89, 1000000</div>
              <div>2024-01-04, 2.15, 1000000</div>
              <div>2024-01-05, 0.43, 1000000</div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                'daily_return — one row per trading day',
                'portfolio_value — position size in $ (auto-read from first row)',
                'date — period label (optional, for display only)',
                'Minimum 10 observations required',
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
            <ShieldAlert className="mr-2 h-5 w-5" />Load Example Data
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

export default function VaRPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [manualAssets,  setManualAssets]  = useState<AssetInput[]>(defaultManual());
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [horizon,       setHorizon]       = useState<1 | 5 | 10 | 21>(1);
  const [cl,            setCl]            = useState<90 | 95 | 99>(95);

  // CSV config
  const [returnCol,  setReturnCol]  = useState('');
  const [valueCol,   setValueCol]   = useState('');
  const [manualVal,  setManualVal]  = useState(1_000_000);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(exampleCSV(), 'example_var.csv');
    setInputMode('csv');
    setHasStarted(true);
    setReturnCol('daily_return');
    setValueCol('portfolio_value');
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setReturnCol(''); setValueCol('');
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
    setActiveIdx(0);
  }, [onClearData]);

  // ── Auto-detect CSV columns ───────────────────────────────
  useMemo(() => {
    if (!hasData || returnCol) return;
    const hl = allHeaders.map(h => h.toLowerCase());
    const retKws  = ['return', 'pnl', 'ret', 'daily', 'portfolio'];
    const valKws  = ['value', 'portfolio_value', 'notional', 'position'];
    const ri = hl.findIndex(h => retKws.some(k => h.includes(k)));
    const vi = hl.findIndex(h => valKws.some(k => h === k || h.includes(k)));
    if (ri !== -1) setReturnCol(allHeaders[ri]);
    if (vi !== -1 && vi !== ri) setValueCol(allHeaders[vi]);
  }, [hasData, allHeaders, returnCol]);

  // ── Build asset list ──────────────────────────────────────
  const assetInputs: AssetInput[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && returnCol) {
      const rawVal = valueCol ? parseFloat(String(data[0]?.[valueCol] ?? '')) : NaN;
      const V = isFinite(rawVal) ? rawVal : manualVal;
      const rets = data
        .map(r => parseFloat(String(r[returnCol] ?? '')))
        .filter(isFinite)
        .map(n => Math.abs(n) > 1 ? n / 100 : n);
      return [{ id: returnCol, name: returnCol, value: V, returns: rets.join(', ') }];
    }
    if (inputMode === 'manual') return manualAssets;
    return [];
  }, [inputMode, hasData, data, returnCol, valueCol, manualVal, manualAssets]);

  // ── Compute VaR ───────────────────────────────────────────
  const results: VaRResult[] = useMemo(() =>
    assetInputs.flatMap(a => { const r = computeVaR(a); return r ? [r] : []; }),
    [assetInputs]
  );

  const isConfigured = results.length > 0;
  const active       = results[Math.min(activeIdx, results.length - 1)] ?? null;
  const isExample    = (fileName ?? '').startsWith('example_');

  // ── Derived — scaled numbers ──────────────────────────────
  const scaled = useMemo(() => {
    if (!active) return null;
    const s = (v: number) => scaleT(v, horizon);
    return {
      P:  cl === 90 ? s(active.varP90) : cl === 95 ? s(active.varP95) : s(active.varP99),
      H:  cl === 90 ? s(active.varH90) : cl === 95 ? s(active.varH95) : s(active.varH99),
      MC: cl === 99 ? s(active.varMC99) : s(active.varMC95),
      es95: s(active.esH95),
      es99: s(active.esH99),
    };
  }, [active, cl, horizon]);

  // ── Comparison bar data ───────────────────────────────────
  const compData = useMemo(() => {
    if (!active || !scaled) return [];
    return [
      { method: 'Parametric',  var: parseFloat(scaled.P.toFixed(2)) },
      { method: 'Historical',  var: parseFloat(scaled.H.toFixed(2)) },
      { method: 'Monte Carlo', var: parseFloat(scaled.MC.toFixed(2)) },
      { method: 'CVaR 95%',    var: parseFloat(scaled.es95.toFixed(2)) },
      { method: 'CVaR 99%',    var: parseFloat(scaled.es99.toFixed(2)) },
    ];
  }, [active, scaled]);

  // ── Horizon scaling chart ─────────────────────────────────
  const horizonChart = useMemo(() => {
    if (!active) return [];
    const baseVar = cl === 90 ? active.varH90 : cl === 95 ? active.varH95 : active.varH99;
    return [1, 2, 5, 10, 21, 63, 126, 252].map(d => ({
      days: `${d}d`, var: parseFloat(scaleT(baseVar, d).toFixed(2)),
    }));
  }, [active, cl]);

  // ── Manual handlers ───────────────────────────────────────
  const handleManualChange = useCallback((id: string, field: keyof AssetInput, val: string) => {
    setManualAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      if (field === 'value') return { ...a, value: parseFloat(val) || null };
      return { ...a, [field]: val };
    }));
  }, []);

  const handleAddAsset = useCallback(() => {
    setManualAssets(prev => [
      ...prev,
      { id: String(Date.now()), name: `Portfolio ${prev.length + 1}`, value: 1_000_000, returns: '' },
    ]);
  }, []);

  const handleDeleteAsset = useCallback((id: string) => {
    setManualAssets(prev => prev.filter(a => a.id !== id));
    setActiveIdx(0);
  }, []);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = results.map(r => ({
      asset:           r.asset,
      position_value:  fUSD(r.value),
      observations:    r.returns.length,
      daily_mean:      fPct(r.mu),
      daily_vol:       fPct(r.sigma),
      var_p90_1d:      fUSD(r.varP90),
      var_p95_1d:      fUSD(r.varP95),
      var_p99_1d:      fUSD(r.varP99),
      var_h90_1d:      fUSD(r.varH90),
      var_h95_1d:      fUSD(r.varH95),
      var_h99_1d:      fUSD(r.varH99),
      es_95_1d:        fUSD(r.esH95),
      es_99_1d:        fUSD(r.esH99),
      var_mc95_1d:     fUSD(r.varMC95),
      var_mc99_1d:     fUSD(r.varMC99),
      max_drawdown:    fPct(r.maxDD),
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `VaR_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `VaR_${new Date().toISOString().split('T')[0]}.png`;
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

  const rlabel    = active ? riskLabel(active.varH95 / active.value) : null;
  const tailRatio = active ? active.esH95 / active.varH95 : null;

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
            {active
              ? `${active.returns.length} observations · ${fUSD(active.value)} position`
              : hasData ? `${data.length} rows` : `${manualAssets.length} asset${manualAssets.length !== 1 ? 's' : ''}`}
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
            <ShieldAlert className="h-5 w-5" />Value at Risk (VaR)
          </CardTitle>
          <CardDescription>
            Compute maximum expected loss at specified confidence levels using Parametric, Historical Simulation, and Monte Carlo methods. Includes CVaR / Expected Shortfall and time-horizon scaling via the √T rule.
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
                  ? 'Select the return column and optionally the portfolio value column.'
                  : 'Enter return series (comma-separated) and portfolio value per position.'}
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
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'RETURN COLUMN *', val: returnCol, set: setReturnCol },
                  { label: 'VALUE COLUMN',    val: valueCol,  set: setValueCol  },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                    <Select value={val || '__none__'} onValueChange={v => set(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="text-xs h-8 w-44"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {!valueCol && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">PORTFOLIO VALUE ($)</Label>
                    <Input className="h-8 text-xs font-mono w-36"
                      value={String(manualVal)}
                      onChange={e => setManualVal(parseFloat(e.target.value) || 1_000_000)}
                      placeholder="1000000" />
                  </div>
                )}
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
                      {['Name', 'Position Value ($)', 'Return Series (comma-sep, decimal or %)', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualAssets.map(a => (
                      <tr key={a.id} className="border-t hover:bg-slate-50/50">
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-32 font-semibold" value={a.name}
                            onChange={e => handleManualChange(a.id, 'name', e.target.value)}
                            placeholder="Portfolio" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-28 font-mono"
                            value={a.value !== null ? String(a.value) : ''}
                            onChange={e => handleManualChange(a.id, 'value', e.target.value)}
                            placeholder="1000000" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[380px]"
                            value={a.returns}
                            onChange={e => handleManualChange(a.id, 'returns', e.target.value)}
                            placeholder="0.0124, -0.0089, 0.0215, …" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
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
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Portfolio / Asset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Controls ── */}
      {isConfigured && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-5">

              {results.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Portfolio</Label>
                  <Select value={String(activeIdx)} onValueChange={v => setActiveIdx(Number(v))}>
                    <SelectTrigger className="text-xs h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {results.map((r, i) => (
                        <SelectItem key={i} value={String(i)}>{r.asset}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Confidence Level</Label>
                <div className="flex gap-1">
                  {([90, 95, 99] as const).map(c => (
                    <Button key={c} size="sm"
                      variant={cl === c ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setCl(c)}>
                      {c}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Horizon</Label>
                <div className="flex gap-1">
                  {([1, 5, 10, 21] as const).map(d => (
                    <Button key={d} size="sm"
                      variant={horizon === d ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setHorizon(d)}>
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (All Metrics)
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
      {isConfigured && active && scaled && rlabel && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {cl}% VaR · {horizon}d · Parametric
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fUSD(scaled.P)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {fPct(scaled.P / active.value)} of position
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {cl}% VaR · {horizon}d · Historical
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fUSD(scaled.H)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {fPct(scaled.H / active.value)} of position
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              95% CVaR · {horizon}d
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fUSD(scaled.es95)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Expected Shortfall</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Daily Volatility
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fPct(active.sigma)}</div>
            <div className="mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${rlabel.cls}`}>
                {rlabel.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Return Distribution Histogram ── */}
        {isConfigured && active && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Return Distribution Histogram — {active.asset}</CardTitle>
              <CardDescription>
                {active.returns.length} daily observations · Mean {fPct(active.mu)} · σ {fPct(active.sigma)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={active.histogram} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={{ stroke: '#E2E8F0' }} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<HistoTip />} />
                  <Bar dataKey="count" maxBarSize={18} radius={[2, 2, 0, 0]}>
                    {active.histogram.map((d, i) => (
                      <Cell key={i} fill={d.isLoss ? '#EF4444' : '#6C3AED'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-400" />Loss days (return &lt; 0)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-primary/70" />Gain days (return ≥ 0)
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── VaR Method Comparison ── */}
        {isConfigured && active && compData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                VaR Comparison — {cl}% CL · {horizon}d Horizon
              </CardTitle>
              <CardDescription>
                Maximum expected loss by method and CVaR (Expected Shortfall) — {fUSD(active.value)} position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(180, compData.length * 50)}>
                <BarChart data={compData} layout="vertical" margin={{ top: 4, right: 112, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => fUSD(v)} />
                  <YAxis type="category" dataKey="method"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="var" name="VaR / CVaR" maxBarSize={32} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="var" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => fUSD(v)} />
                    {compData.map((d, i) => (
                      <Cell key={i}
                        fill={d.method.startsWith('CVaR') ? '#DC2626' : PALETTE[i % PALETTE.length]}
                        fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Horizon Scaling ── */}
        {isConfigured && active && horizonChart.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">VaR Scaling by Horizon</CardTitle>
              <CardDescription>
                Historical {cl}% VaR scaled by √T rule — shows how risk accumulates over time (assumes i.i.d. returns)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={horizonChart} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="days" tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => fUSD(v)} />
                  <Tooltip formatter={(v: number) => [fUSD(v), `${cl}% Hist VaR`]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <ReferenceLine x={`${horizon}d`} stroke="#6C3AED" strokeDasharray="4 2"
                    label={{ value: 'Selected', fill: '#6C3AED', fontSize: 10 }} />
                  <Area type="monotone" dataKey="var" name="VaR"
                    stroke="#6C3AED" fill="#6C3AED" fillOpacity={0.12}
                    strokeWidth={2.5} dot={{ r: 3.5, fill: '#6C3AED' }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Full VaR Summary Table ── */}
        {isConfigured && active && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Full VaR Summary Table
              </CardTitle>
              <CardDescription>
                All confidence levels · {horizon}-day horizon (√T scaled) · {fUSD(active.value)} position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Metric', '1d (daily)', `${horizon}d Scaled`, '% of Position', 'Method'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'VaR 90%',  daily: active.varP90,  method: 'Parametric' },
                      { label: 'VaR 95%',  daily: active.varP95,  method: 'Parametric' },
                      { label: 'VaR 99%',  daily: active.varP99,  method: 'Parametric' },
                      { label: 'VaR 90%',  daily: active.varH90,  method: 'Historical' },
                      { label: 'VaR 95%',  daily: active.varH95,  method: 'Historical' },
                      { label: 'VaR 99%',  daily: active.varH99,  method: 'Historical' },
                      { label: 'VaR 95%',  daily: active.varMC95, method: 'Monte Carlo' },
                      { label: 'VaR 99%',  daily: active.varMC99, method: 'Monte Carlo' },
                      { label: 'CVaR 95%', daily: active.esH95,   method: 'Hist. ES' },
                      { label: 'CVaR 99%', daily: active.esH99,   method: 'Hist. ES' },
                    ].map((row, i) => {
                      const s = scaleT(row.daily, horizon);
                      return (
                        <tr key={i} className="border-t hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-semibold text-slate-700">{row.label}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fUSD(row.daily)}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fUSD(s)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(s / active.value)}</td>
                          <td className="px-3 py-2">
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              {row.method}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-200 bg-slate-50/40">
                      <td className="px-3 py-2 font-semibold text-slate-700">Max Drawdown</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fPct(active.maxDD)}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fUSD(active.maxDD * active.value)}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{fPct(active.maxDD)}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Historical</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && active && scaled && tailRatio !== null && (() => {
          const varPctH95 = active.varH95 / active.value;
          const spread    = Math.abs(active.varP95 - active.varH95) / Math.max(active.varH95, 0.0001);
          const basel10d99 = scaleT(active.varH99, 10);
          const rl = riskLabel(varPctH95);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>
                  Auto-generated VaR analysis · {active.returns.length} observations · {fUSD(active.value)} position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Risk Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Based on <span className="font-semibold">{active.returns.length} return observations</span>,
                    the {cl}% {horizon}-day Historical VaR is{' '}
                    <span className="font-semibold">{fUSD(scaled.H)}</span>{' '}
                    ({fPct(scaled.H / active.value)} of the {fUSD(active.value)} position).
                    There is a <span className="font-semibold">{100 - cl}%</span> probability that losses will exceed
                    this threshold over the next {horizon} day{horizon > 1 ? 's' : ''}.
                    Daily volatility is <span className="font-semibold">{fPct(active.sigma)}</span>{' '}
                    — classified as <span className={`font-semibold px-1 py-0.5 rounded text-xs ${rl.cls}`}>{rl.label}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Daily σ',       value: fPct(active.sigma),        sub: rl.label },
                    { label: '95% VaR (1d)',  value: fUSD(active.varH95),       sub: fPct(varPctH95) },
                    { label: '95% CVaR (1d)', value: fUSD(active.esH95),        sub: `CVaR/VaR = ${tailRatio.toFixed(2)}×` },
                    { label: 'Max Drawdown',  value: fPct(active.maxDD),        sub: fUSD(active.maxDD * active.value) },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Method Comparison</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Parametric 95% VaR ({fUSD(active.varP95)}) assumes normally distributed returns.
                        Historical 95% VaR ({fUSD(active.varH95)}) uses empirical percentiles.{' '}
                        {spread > 0.15
                          ? `The ${(spread * 100).toFixed(0)}% spread between these methods indicates the return distribution has fat tails or meaningful skewness. The parametric model likely understates risk — prefer the Historical or Monte Carlo estimate.`
                          : 'The methods are broadly consistent, suggesting the return distribution is approximately normal over this sample period.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">CVaR vs VaR — Tail Severity</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The 95% CVaR ({fUSD(active.esH95)}) is{' '}
                        <span className="font-semibold">{tailRatio.toFixed(2)}×</span> the 95% VaR.
                        On days where the loss exceeds VaR, the average loss is{' '}
                        {fUSD(active.esH95)}.{' '}
                        {tailRatio > 1.6
                          ? 'A CVaR/VaR ratio above 1.6 signals heavy tail risk — losses in the tail are significantly larger than the VaR boundary alone suggests. Relying solely on VaR materially understates tail exposure.'
                          : 'The ratio indicates moderate tail risk — extreme events are somewhat larger than the VaR threshold but not dramatically so.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Regulatory Context — Basel 10d 99%</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The Basel III 10-day 99% VaR (standard market risk capital requirement) is{' '}
                        <span className="font-semibold">{fUSD(basel10d99)}</span>{' '}
                        ({fPct(basel10d99 / active.value)} of position), scaled from the 1-day estimate via √10.
                        The √T rule assumes i.i.d. daily returns — autocorrelation or volatility clustering
                        (GARCH effects) will cause actual multi-day losses to deviate from this figure.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Parametric VaR = −(μ − z·σ)·V (normal distribution). Historical VaR = empirical return percentile × V.
                  CVaR / ES = mean of returns below VaR cutoff × V. VaR(T) = VaR(1)·√T (i.i.d. assumption).
                  Monte Carlo: 5,000 draws from N(μ,σ). Max Drawdown = max peak-to-trough decline in cumulative return.
                  VaR gives a threshold loss — it does not describe the size of losses beyond that threshold. Always pair with CVaR.
                  This analysis is auto-generated and does not constitute investment or risk management advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
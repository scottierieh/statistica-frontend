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
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  ReferenceLine, LabelList,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  AlertTriangle, TrendingUp, BarChart3, Activity, Plus, Trash2,
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

// ============================================
// Types
// ============================================

interface AssetInput {
  id:      string;
  name:    string;
  weight:  number | null;   // portfolio weight 0–100
  returns: string;          // comma-separated return series
}

interface RiskResult {
  asset:        string;
  weight:       number;     // fraction 0–1
  sigma:        number;     // annualized vol
  mrc:          number;     // marginal risk contribution
  crc:          number;     // component risk contribution (absolute)
  prc:          number;     // % risk contribution 0–1
  beta:         number;     // beta to portfolio
  sharpe:       number | null;
  annReturn:    number;
}

interface PortfolioStats {
  sigma:        number;     // portfolio annualized vol
  annReturn:    number;     // portfolio annualized return
  sharpe:       number | null;
  hhi:          number;     // Herfindahl–Hirschman (weight concentration)
  hhiRisk:      number;     // HHI of risk contributions
  riskConc:     string;     // concentration label
}

// ============================================
// Math helpers
// ============================================

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : num / denom;
}

function covMatrix(series: number[][]): number[][] {
  const n = series.length;
  const T = Math.min(...series.map(s => s.length));
  const means = series.map(s => mean(s.slice(0, T)));
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let t = 0; t < T; t++)
        s += (series[i][t] - means[i]) * (series[j][t] - means[j]);
      cov[i][j] = cov[j][i] = s / (T - 1);
    }
  }
  return cov;
}

/** σ_p = sqrt(w^T Σ w) — monthly, then annualize */
function portfolioVol(w: number[], cov: number[][]): number {
  let v = 0;
  for (let i = 0; i < w.length; i++)
    for (let j = 0; j < w.length; j++)
      v += w[i] * w[j] * cov[i][j];
  return Math.sqrt(Math.max(v, 0)) * Math.sqrt(12);
}

/** (Σ w)_i * sqrt(12) — annualized marginal contribution numerator */
function sigmaW(w: number[], cov: number[][]): number[] {
  return w.map((_, i) =>
    w.reduce((s, wj, j) => s + wj * cov[i][j], 0) * 12
  );
}

function parseReturns(str: string): number[] {
  return str.split(/[\s,;]+/)
    .map(s => parseFloat(s))
    .filter(n => isFinite(n))
    .map(n => Math.abs(n) > 1 ? n / 100 : n);
}

// ============================================
// Default data
// ============================================

const DEFAULT_ASSETS: { name: string; weight: number; returns: number[] }[] = [
  { name: 'SPY',  weight: 40, returns: [ 0.032,-0.018, 0.045, 0.012,-0.027, 0.038, 0.021,-0.009, 0.051, 0.015,-0.031, 0.042, 0.028,-0.014, 0.039, 0.007,-0.022, 0.033, 0.017,-0.005, 0.044, 0.011,-0.028, 0.036] },
  { name: 'QQQ',  weight: 20, returns: [ 0.041,-0.022, 0.058, 0.018,-0.035, 0.049, 0.027,-0.011, 0.064, 0.020,-0.039, 0.053, 0.035,-0.017, 0.051, 0.010,-0.030, 0.044, 0.022,-0.008, 0.057, 0.015,-0.036, 0.047] },
  { name: 'BND',  weight: 20, returns: [-0.005, 0.012,-0.008, 0.015,-0.003, 0.010,-0.006, 0.014,-0.004, 0.011,-0.007, 0.013,-0.004, 0.011,-0.007, 0.013,-0.002, 0.009,-0.005, 0.012,-0.003, 0.010,-0.006, 0.011] },
  { name: 'GLD',  weight: 10, returns: [ 0.018,-0.025, 0.005, 0.030,-0.010, 0.022, 0.008,-0.018, 0.015, 0.027,-0.012, 0.019, 0.013,-0.020, 0.007, 0.025,-0.008, 0.018, 0.010,-0.015, 0.012, 0.022,-0.010, 0.016] },
  { name: 'VNQ',  weight:  5, returns: [ 0.025,-0.030, 0.035, 0.008,-0.022, 0.031, 0.015,-0.018, 0.040, 0.010,-0.025, 0.034, 0.020,-0.025, 0.030, 0.005,-0.019, 0.027, 0.013,-0.014, 0.035, 0.008,-0.022, 0.030] },
  { name: 'EFA',  weight:  5, returns: [ 0.028,-0.015, 0.038, 0.010,-0.021, 0.032, 0.018,-0.007, 0.043, 0.012,-0.025, 0.036, 0.022,-0.011, 0.033, 0.007,-0.017, 0.028, 0.015,-0.004, 0.038, 0.009,-0.022, 0.031] },
];

function defaultManualAssets(): AssetInput[] {
  return DEFAULT_ASSETS.map((a, i) => ({
    id:      String(i + 1),
    name:    a.name,
    weight:  a.weight,
    returns: a.returns.map(v => (v * 100).toFixed(2)).join(', '),
  }));
}

function generateExampleCSV(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  // Row 0: weights
  const weightRow: Record<string, any> = { period: 'weight' };
  for (const a of DEFAULT_ASSETS) weightRow[a.name] = a.weight;
  rows.push(weightRow);
  // Period rows
  for (let t = 0; t < 24; t++) {
    const row: Record<string, any> = { period: `2023-${String((t % 12) + 1).padStart(2, '0')}` };
    for (const a of DEFAULT_ASSETS) row[a.name] = (a.returns[t] * 100).toFixed(2);
    rows.push(row);
  }
  return rows;
}

// ============================================
// Color palette
// ============================================

const PALETTE = [
  '#6C3AED','#10B981','#F59E0B','#3B82F6','#EF4444',
  '#8B5CF6','#06B6D4','#EC4899','#84CC16','#F97316',
];

function riskConcentrationLabel(hhiRisk: number): string {
  if (hhiRisk < 0.15) return 'Well Distributed';
  if (hhiRisk < 0.25) return 'Moderate';
  if (hhiRisk < 0.40) return 'Concentrated';
  return 'Highly Concentrated';
}

function concBadge(label: string): string {
  if (label === 'Well Distributed') return 'bg-emerald-100 text-emerald-700';
  if (label === 'Moderate')         return 'bg-green-100 text-green-700';
  if (label === 'Concentrated')     return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
}

// ============================================
// Computation
// ============================================

function computeRisk(assets: { name: string; weight: number; returns: number[] }[]): {
  results: RiskResult[];
  portfolio: PortfolioStats;
} | null {
  const n = assets.length;
  if (n < 2) return null;

  const totalW = assets.reduce((s, a) => s + a.weight, 0);
  if (totalW === 0) return null;
  const w = assets.map(a => a.weight / totalW);

  const series = assets.map(a => a.returns);
  const T = Math.min(...series.map(s => s.length));
  if (T < 3) return null;

  const cov = covMatrix(series);
  const pVol = portfolioVol(w, cov);
  if (pVol === 0) return null;

  const sw = sigmaW(w, cov); // Σw * 12 (annualized numerator per asset)

  // annualized MRC_i = sw_i / pVol
  // CRC_i = w_i * MRC_i
  // PRC_i = CRC_i / pVol
  const results: RiskResult[] = assets.map((a, i) => {
    const mrc    = sw[i] / pVol;
    const crc    = w[i] * mrc;
    const prc    = crc / pVol;
    const beta   = (sw[i] / 12) / (pVol / Math.sqrt(12)) ** 2 * (pVol / Math.sqrt(12));

    const retMean = mean(a.returns.slice(0, T));
    const annRet  = retMean * 12;
    const annSig  = Math.sqrt(cov[i][i] * 12);
    const sharpe  = annSig > 0 ? annRet / annSig : null;

    return {
      asset: a.name, weight: w[i],
      sigma: annSig, mrc, crc, prc, beta,
      sharpe, annReturn: annRet,
    };
  });

  // Portfolio stats
  const portRetMean = w.reduce((s, wi, i) => s + wi * mean(series[i].slice(0, T)), 0);
  const portAnnRet  = portRetMean * 12;
  const portSharpe  = pVol > 0 ? portAnnRet / pVol : null;

  const hhi     = w.reduce((s, wi) => s + wi * wi, 0);
  const hhiRisk = results.reduce((s, r) => s + r.prc * r.prc, 0);

  return {
    results,
    portfolio: {
      sigma: pVol, annReturn: portAnnRet, sharpe: portSharpe,
      hhi, hhiRisk, riskConc: riskConcentrationLabel(hhiRisk),
    },
  };
}

// ============================================
// Tooltips
// ============================================

const RiskTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[170px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number'
              ? p.name?.includes('%') ? `${(p.value * 100).toFixed(1)}%` : p.value.toFixed(3)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Risk Contribution</span>
        <span className="font-mono font-semibold">{(d.value * 100).toFixed(2)}%</span>
      </div>
    </div>
  );
};

// ============================================
// Intro Page
// ============================================

const IntroPage = ({ onLoadExample, onManualEntry }: {
  onLoadExample: () => void; onManualEntry: () => void;
}) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <AlertTriangle className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Risk Component Decomposition</CardTitle>
        <CardDescription className="text-base mt-2">
          Decompose total portfolio volatility into individual asset risk contributions — identify which assets drive portfolio risk, and whether the risk budget is aligned with the weight allocation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <AlertTriangle className="w-6 h-6 text-primary mb-2" />,
              title: 'Marginal Risk Contribution',
              desc: 'MRC_i = (Σw)_i / σ_p. The additional portfolio volatility from increasing asset i\'s weight by 1 unit. Used to compute component risk.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Component Risk Contribution',
              desc: 'CRC_i = w_i × MRC_i. The portion of total portfolio volatility attributable to asset i. Σ CRC_i = σ_p (Euler decomposition).',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: '% Risk Contribution',
              desc: '%RC_i = CRC_i / σ_p. Percentage of total portfolio risk from each asset. Enables weight-vs-risk alignment analysis.',
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
            { label: 'Risk Budget',    desc: 'Risk % aligned with weight %' },
            { label: 'Over-Budget',    desc: 'Risk % >> Weight % — contributing excess risk' },
            { label: 'Under-Budget',   desc: 'Risk % << Weight % — diversifying asset' },
            { label: 'Negative CRC',   desc: 'Asset reduces portfolio variance (hedge)' },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-xs font-bold text-slate-700 mb-0.5">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Wide format with one column per asset. The first row should be labeled <strong>weight</strong> in the period column and contain portfolio weights (%).
            Subsequent rows are period return observations.
          </p>
          <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600 overflow-x-auto mb-4">
            <div>period, SPY, QQQ, BND, GLD</div>
            <div>weight, 40, 20, 20, 10</div>
            <div>2023-01, 3.2, 4.1, -0.5, 1.8</div>
            <div>2023-02, -1.8, -2.2, 1.2, -2.5</div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              'Returns in % (3.2) or decimal (0.032) — auto-detected',
              'At least 3 return periods required per asset',
              'Weights do not need to sum to 100 — they are normalized automatically',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <AlertTriangle className="mr-2 h-5 w-5" />Load Example Data
          </Button>
          <Button onClick={onManualEntry} size="lg" variant="outline">
            <Plus className="mr-2 h-5 w-5" />Manual Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================
// Main Component
// ============================================

export default function RiskDecompositionPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [manualAssets,  setManualAssets]  = useState<AssetInput[]>(defaultManualAssets());
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [chartView,     setChartView]     = useState<'bar' | 'pie'>('bar');

  // CSV columns
  const [periodCol,  setPeriodCol]  = useState('');
  const [assetCols,  setAssetCols]  = useState<string[]>([]);
  const [weightRow,  setWeightRow]  = useState<Record<string, number>>({});

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_risk_decomp.csv');
    setInputMode('csv');
    setHasStarted(true);
    setPeriodCol('period');
    setAssetCols(DEFAULT_ASSETS.map(a => a.name));
    const wr: Record<string, number> = {};
    for (const a of DEFAULT_ASSETS) wr[a.name] = a.weight;
    setWeightRow(wr);
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setAssetCols([]); setWeightRow({});
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
  }, [onClearData]);

  // ── Auto-detect CSV columns ───────────────────────────────
  useMemo(() => {
    if (!hasData || inputMode !== 'csv') return;
    const h = allHeaders.map(s => s.toLowerCase());
    if (!periodCol) {
      const idx = h.findIndex(c => ['period', 'date', 'time', 'month'].some(k => c.includes(k)));
      if (idx !== -1) setPeriodCol(allHeaders[idx]);
    }
    if (assetCols.length === 0) {
      const aCols = numericHeaders.filter(c => c !== periodCol);
      setAssetCols(aCols);
    }
  }, [hasData, inputMode, allHeaders, numericHeaders]);

  // ── Extract weight row from CSV ───────────────────────────
  useMemo(() => {
    if (!hasData || !periodCol || assetCols.length === 0) return;
    const weightRowData = data.find(r => String(r[periodCol] ?? '').toLowerCase().includes('weight'));
    if (weightRowData) {
      const wr: Record<string, number> = {};
      for (const col of assetCols) {
        const v = parseFloat(String(weightRowData[col] ?? ''));
        if (isFinite(v)) wr[col] = v;
      }
      setWeightRow(wr);
    }
  }, [hasData, data, periodCol, assetCols]);

  // ── Build asset list for computation ──────────────────────
  const computeAssets: { name: string; weight: number; returns: number[] }[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && assetCols.length >= 2) {
      const returnRows = data.filter(r => {
        const p = String(r[periodCol] ?? '').toLowerCase();
        return !p.includes('weight') && !p.includes('w');
      });
      return assetCols.map(col => ({
        name:    col,
        weight:  weightRow[col] ?? 10,
        returns: returnRows.map(r => {
          const v = parseFloat(String(r[col] ?? ''));
          return isFinite(v) ? (Math.abs(v) > 1 ? v / 100 : v) : 0;
        }),
      }));
    }
    if (inputMode === 'manual') {
      return manualAssets
        .filter(a => a.name.trim() && a.weight !== null && a.weight > 0)
        .map(a => ({
          name:    a.name.trim(),
          weight:  a.weight!,
          returns: parseReturns(a.returns),
        }))
        .filter(a => a.returns.length >= 3);
    }
    return [];
  }, [inputMode, hasData, data, periodCol, assetCols, weightRow, manualAssets]);

  const computation = useMemo(() => computeRisk(computeAssets), [computeAssets]);
  const { results, portfolio } = computation ?? { results: [], portfolio: null };
  const isConfigured = results.length >= 2 && portfolio !== null;

  // ── Manual handlers ───────────────────────────────────────
  const handleManualChange = useCallback((id: string, field: keyof AssetInput, val: string) => {
    setManualAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      if (field === 'weight') return { ...a, weight: parseFloat(val) || null };
      return { ...a, [field]: val };
    }));
  }, []);

  const handleAddAsset = useCallback(() => {
    setManualAssets(prev => [...prev, { id: String(Date.now()), name: `Asset ${prev.length + 1}`, weight: 10, returns: '' }]);
  }, []);

  const handleDeleteAsset = useCallback((id: string) => {
    setManualAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const toggleAssetCol = (col: string) =>
    setAssetCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const updateWeightRow = (col: string, val: string) =>
    setWeightRow(prev => ({ ...prev, [col]: parseFloat(val) || 0 }));

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = results.map(r => ({
      asset:                   r.asset,
      weight_pct:              `${(r.weight * 100).toFixed(1)}%`,
      ann_vol_pct:             `${(r.sigma * 100).toFixed(2)}%`,
      marginal_risk_contrib:   r.mrc.toFixed(4),
      component_risk_contrib:  r.crc.toFixed(4),
      pct_risk_contrib:        `${(r.prc * 100).toFixed(2)}%`,
      weight_vs_risk_gap_pp:   `${((r.prc - r.weight) * 100).toFixed(2)}pp`,
      beta_to_portfolio:       r.beta.toFixed(3),
      ann_return_pct:          `${(r.annReturn * 100).toFixed(2)}%`,
      sharpe:                  r.sharpe?.toFixed(3) ?? '—',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `RiskDecomp_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, results, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `RiskDecomp_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Derived chart data ────────────────────────────────────
  const sortedByRisk = useMemo(() =>
    [...results].sort((a, b) => b.prc - a.prc),
    [results]
  );

  const weightVsRisk = useMemo(() =>
    results.map(r => ({
      asset:  r.asset,
      weight: parseFloat((r.weight * 100).toFixed(2)),
      risk:   parseFloat((r.prc * 100).toFixed(2)),
      gap:    parseFloat(((r.prc - r.weight) * 100).toFixed(2)),
    })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)),
    [results]
  );

  const pieData = useMemo(() =>
    sortedByRisk.filter(r => r.prc > 0).map((r, i) => ({
      name:  r.asset,
      value: parseFloat(r.prc.toFixed(4)),
      fill:  PALETTE[i % PALETTE.length],
    })),
    [sortedByRisk]
  );

  const isExample = (fileName ?? '').startsWith('example_');

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
              ? `${results.length} assets · ${computeAssets[0]?.returns.length ?? 0} periods`
              : hasData ? `${data.length} rows · ${allHeaders.length} cols` : `${manualAssets.length} assets`}
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
                <FileText className="h-4 w-4 text-muted-foreground" />{fileName || 'Uploaded file'}
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
            <span className="text-xs text-muted-foreground">Portfolio Construction</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />Risk Component Decomposition
          </CardTitle>
          <CardDescription>
            Decompose total portfolio volatility into individual asset risk contributions using Euler decomposition. Identify which assets consume the most risk budget and whether allocations are risk-efficient.
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
                  ? 'Select asset columns and verify weights extracted from the weight row.'
                  : 'Enter portfolio weight (%) and return series per asset.'}
              </CardDescription>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant={inputMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setInputMode('manual')}>Manual</Button>
              {hasData
                ? <Button size="sm" variant={inputMode === 'csv' ? 'default' : 'outline'} onClick={() => setInputMode('csv')}>CSV</Button>
                : <Button size="sm" variant="outline" onClick={handleLoadExample}>Load Example</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* CSV Mode */}
          {inputMode === 'csv' && hasData && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">PERIOD COLUMN</Label>
                <Select value={periodCol || '__none__'} onValueChange={v => setPeriodCol(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8 w-48"><SelectValue placeholder="—" /></SelectTrigger>
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
              </div>

              {assetCols.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                    PORTFOLIO WEIGHTS (%) — auto-extracted from weight row, edit if needed
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {assetCols.map(col => (
                      <div key={col} className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-semibold text-slate-700">{col}</span>
                        <Input className="h-7 text-xs w-16 font-mono" value={String(weightRow[col] ?? '')}
                          onChange={e => updateWeightRow(col, e.target.value)} placeholder="10" />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Total: {assetCols.reduce((s, c) => s + (weightRow[c] ?? 0), 0).toFixed(1)}% — weights are normalized automatically
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {inputMode === 'manual' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Asset', 'Weight (%)', 'Return Series (comma-separated decimals or %)', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualAssets.map(a => (
                      <tr key={a.id} className="border-t hover:bg-slate-50/50">
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-24 font-mono font-semibold" value={a.name}
                            onChange={e => handleManualChange(a.id, 'name', e.target.value)} placeholder="SPY" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-16 font-mono" value={a.weight !== null ? String(a.weight) : ''}
                            onChange={e => handleManualChange(a.id, 'weight', e.target.value)} placeholder="40" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[360px]" value={a.returns}
                            onChange={e => handleManualChange(a.id, 'returns', e.target.value)}
                            placeholder="0.032, -0.018, 0.045, ..." />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteAsset(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleAddAsset}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add Asset
                </Button>
                <span className="text-xs text-muted-foreground">
                  Total weight: {manualAssets.reduce((s, a) => s + (a.weight ?? 0), 0).toFixed(1)}% — auto-normalized
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Export ── */}
      {isConfigured && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Full Results)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && portfolio && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Portfolio Vol (Ann.)</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{(portfolio.sigma * 100).toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground mt-1.5">Annualized std dev</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Portfolio Return</div>
            <div className={`text-2xl font-bold font-mono ${portfolio.annReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {(portfolio.annReturn * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Sharpe: {portfolio.sharpe !== null ? portfolio.sharpe.toFixed(2) : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Largest Risk Driver</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{sortedByRisk[0]?.asset}</div>
            <div className="text-xs text-muted-foreground mt-1.5 font-mono">
              {(sortedByRisk[0]?.prc * 100).toFixed(1)}% of risk — {(sortedByRisk[0]?.weight * 100).toFixed(1)}% weight
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk Concentration</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {(portfolio.hhiRisk * 100).toFixed(1)}<span className="text-sm font-normal text-muted-foreground"> HHI</span>
            </div>
            <div className="mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${concBadge(portfolio.riskConc)}`}>
                {portfolio.riskConc}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── % Risk Contribution Chart ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">% Risk Contribution per Asset</CardTitle>
                  <CardDescription>Sorted largest to smallest — bars show share of total portfolio volatility</CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {(['bar', 'pie'] as const).map(v => (
                    <Button key={v} size="sm" variant={chartView === v ? 'default' : 'outline'}
                      onClick={() => setChartView(v)} className="h-7 px-2.5 text-xs capitalize">{v}</Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {chartView === 'bar' ? (
                <ResponsiveContainer width="100%" height={Math.max(160, sortedByRisk.length * 48)}>
                  <BarChart data={sortedByRisk.map((r, i) => ({
                    asset: r.asset,
                    prc:   parseFloat((r.prc * 100).toFixed(2)),
                    color: PALETTE[i % PALETTE.length],
                  }))} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="asset" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                      tickLine={false} axisLine={false} width={52} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, '% Risk']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="prc" name="% Risk Contribution" maxBarSize={34} radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="prc" position="right"
                        style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                        formatter={(v: number) => `${v.toFixed(1)}%`} />
                      {sortedByRisk.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center">
                  <PieChart width={400} height={300}>
                    <Pie data={pieData} cx={200} cy={140} innerRadius={70} outerRadius={120}
                      dataKey="value" nameKey="name" paddingAngle={2}
                      label={({ name, value }) => `${name} ${(value * 100).toFixed(1)}%`}
                      labelLine={false}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Weight vs Risk Gap ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weight vs Risk Contribution Gap</CardTitle>
              <CardDescription>
                Positive gap = asset contributes more risk than its weight share — negative = diversifying asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, weightVsRisk.length * 52)}>
                <BarChart data={weightVsRisk} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="asset" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1.5} />
                  <Bar dataKey="weight" name="Portfolio Weight %" maxBarSize={14} fill="#CBD5E1" fillOpacity={0.8} radius={[0, 3, 3, 0]} />
                  <Bar dataKey="risk" name="Risk Contribution %" maxBarSize={14} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="gap" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`} />
                    {weightVsRisk.map((d, i) => (
                      <Cell key={i} fill={d.gap > 1 ? '#EF4444' : d.gap < -1 ? '#10B981' : '#94A3B8'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-300" />Portfolio Weight</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" />Risk &gt; Weight</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400" />Risk &lt; Weight (Diversifier)</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Full Decomposition Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Full Risk Decomposition Table
              </CardTitle>
              <CardDescription>Euler decomposition — Component Risk Contributions sum to portfolio σ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Asset', 'Weight', 'Ann. Vol', 'MRC', 'CRC', '% Risk', 'Weight Gap', 'Beta', 'Ann. Return', 'Sharpe'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByRisk.map((r, i) => {
                      const gap = (r.prc - r.weight) * 100;
                      return (
                        <tr key={r.asset} className="border-t hover:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                              <span className="font-semibold text-slate-700">{r.asset}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{(r.weight * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{(r.sigma * 100).toFixed(2)}%</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.mrc.toFixed(4)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.crc.toFixed(4)}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{(r.prc * 100).toFixed(2)}%</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${Math.abs(gap) < 1 ? 'text-slate-500' : gap > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {gap >= 0 ? '+' : ''}{gap.toFixed(1)}pp
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.beta.toFixed(3)}</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${r.annReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {(r.annReturn * 100).toFixed(2)}%
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.sharpe?.toFixed(2) ?? '—'}</td>
                        </tr>
                      );
                    })}
                    {/* Portfolio total row */}
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td className="px-3 py-2 font-bold text-primary">★ Portfolio</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">100.0%</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{(portfolio!.sigma * 100).toFixed(2)}%</td>
                      <td colSpan={2} className="px-3 py-2 text-muted-foreground text-xs">Euler: Σ CRC = σ_p</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">100.00%</td>
                      <td className="px-3 py-2 font-mono text-slate-500">—</td>
                      <td className="px-3 py-2 font-mono text-slate-500">1.000</td>
                      <td className={`px-3 py-2 font-mono font-bold ${portfolio!.annReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {(portfolio!.annReturn * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                        {portfolio!.sharpe?.toFixed(2) ?? '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                <span><strong>MRC</strong> = Marginal Risk Contribution = (Σw)_i / σ_p</span>
                <span><strong>CRC</strong> = w_i × MRC_i</span>
                <span><strong>%RC</strong> = CRC_i / σ_p · Σ = 100%</span>
                <span><strong>Gap</strong> = %RC − Weight%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && portfolio && (() => {
          const topRisk   = sortedByRisk[0];
          const overBudget = results.filter(r => (r.prc - r.weight) * 100 > 5);
          const diversifiers = results.filter(r => r.prc < r.weight - 0.03);
          const riskEfficient = results.filter(r => Math.abs((r.prc - r.weight) * 100) <= 2);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated risk decomposition analysis — {results.length} assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Risk Budget Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Total portfolio volatility: <span className="font-semibold">{(portfolio.sigma * 100).toFixed(2)}%</span> annualized.
                    The dominant risk driver is <span className="font-semibold">{topRisk.asset}</span> contributing{' '}
                    <span className="font-semibold">{(topRisk.prc * 100).toFixed(1)}%</span> of total portfolio risk
                    while holding only <span className="font-semibold">{(topRisk.weight * 100).toFixed(1)}%</span> of the weight.
                    Risk concentration (HHI): <span className="font-semibold">{(portfolio.hhiRisk * 100).toFixed(1)}</span> —{' '}
                    <span className="font-semibold">{portfolio.riskConc}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Portfolio σ',   value: `${(portfolio.sigma * 100).toFixed(2)}%`,  sub: 'annualized vol' },
                    { label: 'Risk HHI',      value: `${(portfolio.hhiRisk * 100).toFixed(1)}`, sub: portfolio.riskConc },
                    { label: 'Over-Budget',   value: String(overBudget.length),                 sub: '%RC >> Weight' },
                    { label: 'Diversifiers',  value: String(diversifiers.length),               sub: '%RC << Weight' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-lg font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Risk Budget Alignment</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {riskEfficient.length > 0
                          ? <>{riskEfficient.map(r => r.asset).join(', ')} {riskEfficient.length === 1 ? 'is' : 'are'} approximately risk-efficient — their % risk contribution closely matches their portfolio weight. </>
                          : 'No assets have risk contributions closely aligned with their portfolio weights. '}
                        {overBudget.length > 0
                          ? <>{overBudget.map(r => `${r.asset} (+${((r.prc - r.weight) * 100).toFixed(1)}pp)`).join(', ')} {overBudget.length === 1 ? 'consumes' : 'consume'} disproportionately more risk than weight — consider trimming or hedging.</>
                          : ''}
                      </p>
                    </div>
                  </div>

                  {diversifiers.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Diversifying Assets</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-semibold">{diversifiers.map(r => r.asset).join(', ')}</span>{' '}
                          contribute proportionally less risk than their portfolio weight, indicating low or negative
                          correlation with other holdings. These assets improve the portfolio's risk-adjusted profile —
                          increasing their allocation could reduce overall portfolio volatility.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Risk Parity Perspective</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        A risk parity portfolio targets equal % risk contribution from all assets ({(100 / results.length).toFixed(1)}% each).
                        The current portfolio deviates from this — particularly{' '}
                        <span className="font-semibold">{topRisk.asset}</span> at{' '}
                        <span className="font-semibold">{(topRisk.prc * 100).toFixed(1)}%</span>.
                        If risk parity is the goal, reduce high-volatility allocations and increase low-volatility or
                        negatively correlated asset weights until % risk contributions converge.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ MRC_i = (Σw)_i · 12 / σ_p. CRC_i = w_i · MRC_i. %RC_i = CRC_i / σ_p. Σ CRC_i = σ_p (Euler theorem).
                  Covariance matrix estimated from sample returns — assumes monthly frequency, annualized by ×12 / ×√12.
                  Risk HHI = Σ(%RC_i)² — HHI &lt; 0.15 = well distributed, &gt; 0.40 = highly concentrated.
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
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
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine, LabelList,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  Grid3X3, TrendingUp, BarChart3, Activity, Plus, Trash2,
  CheckCircle, FileText, Eye, X, ArrowUpRight, ArrowDownRight,
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

interface AssetReturn {
  asset:  string;
  values: number[];
}

// ============================================
// Math helpers
// ============================================

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function pearson(a: number[], b: number[]): number {
  const n  = Math.min(a.length, b.length);
  if (n < 2) return NaN;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? NaN : num / denom;
}

function buildCorrMatrix(assets: AssetReturn[]): (number | null)[][] {
  return assets.map(a =>
    assets.map(b => {
      const r = pearson(a.values, b.values);
      return isFinite(r) ? parseFloat(r.toFixed(4)) : null;
    })
  );
}

function corrColor(r: number | null): string {
  if (r === null) return '#F8FAFC';
  if (r >=  0.8)  return '#065F46';
  if (r >=  0.6)  return '#059669';
  if (r >=  0.4)  return '#34D399';
  if (r >=  0.2)  return '#A7F3D0';
  if (r >=  0.0)  return '#ECFDF5';
  if (r >= -0.2)  return '#FEF2F2';
  if (r >= -0.4)  return '#FCA5A5';
  if (r >= -0.6)  return '#EF4444';
  if (r >= -0.8)  return '#DC2626';
  return '#7F1D1D';
}

function corrTextColor(r: number | null): string {
  if (r === null) return '#94A3B8';
  const abs = Math.abs(r);
  if (abs >= 0.6) return '#FFFFFF';
  return '#1E293B';
}

function corrLabel(r: number | null): string {
  if (r === null) return '—';
  if (r >=  0.7) return 'Strong +';
  if (r >=  0.4) return 'Moderate +';
  if (r >=  0.2) return 'Weak +';
  if (r >= -0.2) return 'Negligible';
  if (r >= -0.4) return 'Weak −';
  if (r >= -0.7) return 'Moderate −';
  return 'Strong −';
}

function diversificationScore(corrMatrix: (number | null)[][], n: number): number {
  // Average off-diagonal correlation (lower = better diversification)
  const offDiag: number[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j && corrMatrix[i][j] !== null)
        offDiag.push(corrMatrix[i][j]!);
  if (!offDiag.length) return 0;
  const avg = offDiag.reduce((s, v) => s + v, 0) / offDiag.length;
  // Score 0-100: avg corr -1 = 100, avg corr +1 = 0
  return Math.round((1 - avg) / 2 * 100);
}

// ============================================
// Default data — monthly returns
// ============================================

const EXAMPLE_ASSETS = ['SPY', 'QQQ', 'BND', 'GLD', 'VNQ', 'EFA'];
const EXAMPLE_RETURNS: Record<string, number[]> = {
  SPY: [ 0.032, -0.018,  0.045,  0.012, -0.027,  0.038,  0.021, -0.009,  0.051,  0.015, -0.031,  0.042,
          0.028, -0.014,  0.039,  0.007, -0.022,  0.033,  0.017, -0.005,  0.044,  0.011, -0.028,  0.036],
  QQQ: [ 0.041, -0.022,  0.058,  0.018, -0.035,  0.049,  0.027, -0.011,  0.064,  0.020, -0.039,  0.053,
          0.035, -0.017,  0.051,  0.010, -0.030,  0.044,  0.022, -0.008,  0.057,  0.015, -0.036,  0.047],
  BND: [-0.005,  0.012, -0.008,  0.015, -0.003,  0.010, -0.006,  0.014, -0.004,  0.011, -0.007,  0.013,
        -0.004,  0.011, -0.007,  0.013, -0.002,  0.009, -0.005,  0.012, -0.003,  0.010, -0.006,  0.011],
  GLD: [ 0.018, -0.025,  0.005,  0.030, -0.010,  0.022,  0.008, -0.018,  0.015,  0.027, -0.012,  0.019,
          0.013, -0.020,  0.007,  0.025, -0.008,  0.018,  0.010, -0.015,  0.012,  0.022, -0.010,  0.016],
  VNQ: [ 0.025, -0.030,  0.035,  0.008, -0.022,  0.031,  0.015, -0.018,  0.040,  0.010, -0.025,  0.034,
          0.020, -0.025,  0.030,  0.005, -0.019,  0.027,  0.013, -0.014,  0.035,  0.008, -0.022,  0.030],
  EFA: [ 0.028, -0.015,  0.038,  0.010, -0.021,  0.032,  0.018, -0.007,  0.043,  0.012, -0.025,  0.036,
          0.022, -0.011,  0.033,  0.007, -0.017,  0.028,  0.015, -0.004,  0.038,  0.009, -0.022,  0.031],
};

function generateExampleCSV(): Record<string, any>[] {
  return Array.from({ length: 24 }, (_, i) => {
    const row: Record<string, any> = { period: `2023-${String((i % 12) + 1).padStart(2, '0')}` };
    for (const a of EXAMPLE_ASSETS) row[a] = EXAMPLE_RETURNS[a][i];
    return row;
  });
}

function defaultManualAssets(): { id: string; name: string; returns: string }[] {
  return EXAMPLE_ASSETS.map(a => ({
    id:      a,
    name:    a,
    returns: EXAMPLE_RETURNS[a].slice(0, 12).map(v => (v * 100).toFixed(2)).join(', '),
  }));
}

// ============================================
// Parse manual returns
// ============================================

function parseReturns(str: string): number[] {
  return str.split(/[\s,;]+/)
    .map(s => parseFloat(s))
    .filter(n => isFinite(n))
    .map(n => Math.abs(n) > 1 ? n / 100 : n); // auto-convert % if needed
}

// ============================================
// Tooltip
// ============================================

const CorrTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{d.assetA} × {d.assetB}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Correlation</span>
        <span className="font-mono font-semibold">{d.corr?.toFixed(3) ?? '—'}</span>
      </div>
      <div className="text-muted-foreground mt-0.5">{corrLabel(d.corr)}</div>
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
            <Grid3X3 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Portfolio Correlation Matrix</CardTitle>
        <CardDescription className="text-base mt-2">
          Generate an interactive correlation heatmap across portfolio assets — quantify diversification benefit, identify over-correlated pairs, and measure portfolio risk concentration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Grid3X3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Correlation Heatmap',
              desc: 'Pearson correlation of returns across all asset pairs. Dark green = strong positive, dark red = strong negative, white = uncorrelated.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Diversification Score',
              desc: 'Composite score (0–100) based on average off-diagonal correlation. Score near 100 = well-diversified, near 0 = concentrated.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Pair Analysis',
              desc: 'Identify the most correlated and most diversifying pairs. Low or negative correlations reduce portfolio variance.',
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
            { range: '0.7 – 1.0',   label: 'Strong +',    bg: '#065F46', fg: '#fff' },
            { range: '0.0 – 0.7',   label: 'Positive',    bg: '#34D399', fg: '#065F46' },
            { range: '-0.7 – 0.0',  label: 'Negative',    bg: '#FCA5A5', fg: '#7F1D1D' },
            { range: '-1.0 – -0.7', label: 'Strong −',    bg: '#7F1D1D', fg: '#fff' },
          ].map(({ range, label, bg, fg }) => (
            <div key={label} className="rounded-lg border border-slate-100 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: bg, color: fg }}>r</div>
              <div>
                <div className="text-xs font-bold text-slate-700">{label}</div>
                <div className="text-xs font-mono text-muted-foreground">{range}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Wide format: one column per asset, one row per period. Each cell is the return for that period.
            Returns can be decimals (0.032) or percentages (3.2) — they are auto-detected.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Wide Format (recommended)</h4>
              <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600 overflow-x-auto">
                <div>period, SPY, QQQ, BND, GLD</div>
                <div>2023-01, 3.2, 4.1, -0.5, 1.8</div>
                <div>2023-02, -1.8, -2.2, 1.2, -2.5</div>
                <div>2023-03, 4.5, 5.8, -0.8, 0.5</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Output</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  'Full N×N correlation heatmap with color coding',
                  'Diversification Score (0–100)',
                  'Most & least correlated pairs',
                  'Per-asset average correlation bar chart',
                  'Return statistics (mean, volatility, Sharpe)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Grid3X3 className="mr-2 h-5 w-5" />Load Example Data
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

export default function PortfolioCorrelationPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [manualAssets,  setManualAssets]  = useState(defaultManualAssets());
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hoveredPair,   setHoveredPair]   = useState<{ i: number; j: number } | null>(null);

  // CSV: select which columns are assets (returns)
  const [periodCol,  setPeriodCol]  = useState('');
  const [assetCols,  setAssetCols]  = useState<string[]>([]);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_correlation.csv');
    setInputMode('csv');
    setHasStarted(true);
    setPeriodCol('period');
    setAssetCols(EXAMPLE_ASSETS);
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setAssetCols([]);
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
  }, [onClearData]);

  // ── Build asset returns ───────────────────────────────────
  const assetReturns: AssetReturn[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && assetCols.length >= 2) {
      return assetCols.map(col => ({
        asset:  col,
        values: data.map(row => {
          const v = parseFloat(String(row[col] ?? ''));
          return isFinite(v) ? (Math.abs(v) > 1 ? v / 100 : v) : 0;
        }),
      }));
    }
    if (inputMode === 'manual') {
      return manualAssets
        .filter(a => a.name.trim() !== '')
        .map(a => ({ asset: a.name.trim(), values: parseReturns(a.returns) }))
        .filter(a => a.values.length >= 2);
    }
    return [];
  }, [inputMode, hasData, data, assetCols, manualAssets]);

  const isConfigured = assetReturns.length >= 2;

  // ── Correlation matrix ────────────────────────────────────
  const corrMatrix = useMemo(() =>
    isConfigured ? buildCorrMatrix(assetReturns) : [],
    [assetReturns, isConfigured]
  );

  const n = assetReturns.length;

  // ── Diversification score ─────────────────────────────────
  const divScore = useMemo(() =>
    corrMatrix.length ? diversificationScore(corrMatrix, n) : 0,
    [corrMatrix, n]
  );

  // ── Pairs list ─────────────────────────────────────────────
  const pairs = useMemo(() => {
    const list: { assetA: string; assetB: string; corr: number }[] = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (corrMatrix[i]?.[j] !== null && corrMatrix[i]?.[j] !== undefined)
          list.push({ assetA: assetReturns[i].asset, assetB: assetReturns[j].asset, corr: corrMatrix[i][j]! });
    return list.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
  }, [corrMatrix, assetReturns, n]);

  const mostCorrelated    = pairs.slice(0, 5);
  const leastCorrelated   = [...pairs].sort((a, b) => a.corr - b.corr).slice(0, 5);

  // ── Per-asset avg corr ─────────────────────────────────────
  const avgCorrByAsset = useMemo(() =>
    assetReturns.map((a, i) => {
      const others = corrMatrix[i]?.filter((v, j) => j !== i && v !== null) as number[];
      const avg = others?.length ? others.reduce((s, v) => s + v, 0) / others.length : 0;
      return { asset: a.asset, avgCorr: parseFloat(avg.toFixed(3)) };
    }).sort((a, b) => a.avgCorr - b.avgCorr),
    [corrMatrix, assetReturns]
  );

  // ── Stats per asset ────────────────────────────────────────
  const assetStats = useMemo(() =>
    assetReturns.map(a => {
      const m  = mean(a.values);
      const sd = stddev(a.values);
      const annM  = m * 12;
      const annSd = sd * Math.sqrt(12);
      const sharpe = annSd > 0 ? annM / annSd : null;
      return { asset: a.asset, mean: m, std: sd, annMean: annM, annStd: annSd, sharpe, n: a.values.length };
    }),
    [assetReturns]
  );

  // ── CSV asset col toggle ──────────────────────────────────
  const toggleAssetCol = (col: string) => {
    setAssetCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  // ── Manual asset handlers ─────────────────────────────────
  const handleManualChange = useCallback((id: string, field: 'name' | 'returns', val: string) => {
    setManualAssets(prev => prev.map(a => a.id !== id ? a : { ...a, [field]: val }));
  }, []);

  const handleAddAsset = useCallback(() => {
    setManualAssets(prev => [...prev, { id: String(Date.now()), name: `Asset ${prev.length + 1}`, returns: '' }]);
  }, []);

  const handleDeleteAsset = useCallback((id: string) => {
    setManualAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows: Record<string, any>[] = [];
    // Header row
    for (let i = 0; i < n; i++) {
      const row: Record<string, any> = { asset: assetReturns[i].asset };
      for (let j = 0; j < n; j++)
        row[assetReturns[j].asset] = corrMatrix[i][j]?.toFixed(4) ?? '—';
      rows.push(row);
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `CorrelationMatrix_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, assetReturns, corrMatrix, n, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `CorrelationMatrix_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Diversification band ──────────────────────────────────
  const divBand = divScore >= 75 ? { label: 'Well Diversified', cls: 'text-emerald-700 bg-emerald-100' }
    : divScore >= 50 ? { label: 'Moderately Diversified', cls: 'text-amber-700 bg-amber-100' }
    : divScore >= 25 ? { label: 'Concentrated', cls: 'text-orange-700 bg-orange-100' }
    : { label: 'Highly Concentrated', cls: 'text-red-700 bg-red-100' };

  // ── Intro gate ─────────────────────────────────────────────
  if (!hasData && !hasStarted) return (
    <IntroPage
      onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }}
    />
  );

  const cellSize = Math.max(52, Math.min(80, Math.floor(560 / Math.max(n, 1))));

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
              ? `${n} assets · ${assetReturns[0]?.values.length ?? 0} periods`
              : hasData ? `${data.length} rows · ${allHeaders.length} cols` : 'No data'}
          </span>
          {(fileName ?? '').startsWith('example_') && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>
          )}
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
            <Grid3X3 className="h-5 w-5" />Portfolio Correlation Matrix
          </CardTitle>
          <CardDescription>
            Generate a correlation heatmap across portfolio assets to measure diversification. Identifies over-correlated pairs and quantifies the portfolio's diversification benefit.
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
                  ? 'Select which columns represent asset returns. One column per asset, one row per period.'
                  : 'Enter return series per asset as comma-separated values (decimal or %).'}
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
                  ASSET COLUMNS (select all return columns) — {assetCols.length} selected
                </Label>
                <div className="flex flex-wrap gap-2">
                  {numericHeaders.filter(h => h !== periodCol).map(h => (
                    <button key={h}
                      onClick={() => toggleAssetCol(h)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors ${
                        assetCols.includes(h)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                      }`}>
                      {h}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Click to toggle. Select at least 2 columns.</p>
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
                      {['Asset Name', 'Return Series (comma-separated decimals or %)', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualAssets.map(a => (
                      <tr key={a.id} className="border-t hover:bg-slate-50/50">
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-24 font-mono font-semibold" value={a.name}
                            onChange={e => handleManualChange(a.id, 'name', e.target.value)} placeholder="AAPL" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[380px]" value={a.returns}
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
              <Button variant="outline" size="sm" onClick={handleAddAsset}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Asset
              </Button>
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
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Matrix)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assets</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{n}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{assetReturns[0]?.values.length} periods each</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Diversification Score</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{divScore}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
            <div className="mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${divBand.cls}`}>{divBand.label}</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Most Correlated Pair</div>
            {mostCorrelated[0] && (
              <>
                <div className="text-lg font-bold font-mono text-slate-800">
                  {mostCorrelated[0].assetA} / {mostCorrelated[0].assetB}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 font-mono">r = {mostCorrelated[0].corr.toFixed(3)}</div>
              </>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Best Diversifier Pair</div>
            {leastCorrelated[0] && (
              <>
                <div className="text-lg font-bold font-mono text-slate-800">
                  {leastCorrelated[0].assetA} / {leastCorrelated[0].assetB}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 font-mono">r = {leastCorrelated[0].corr.toFixed(3)}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Correlation Heatmap ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Correlation Heatmap</CardTitle>
              <CardDescription>Pearson correlation of returns — diagonal = 1.0 (self-correlation)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div style={{ minWidth: (n + 1) * cellSize }}>
                  {/* Column headers */}
                  <div className="flex" style={{ marginLeft: cellSize }}>
                    {assetReturns.map((a, j) => (
                      <div key={j}
                        style={{ width: cellSize, minWidth: cellSize }}
                        className="flex items-end justify-center pb-1.5 text-xs font-semibold text-slate-600 truncate px-0.5">
                        {a.asset}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {assetReturns.map((rowAsset, i) => (
                    <div key={i} className="flex items-center">
                      {/* Row label */}
                      <div style={{ width: cellSize, minWidth: cellSize }}
                        className="flex items-center justify-end pr-2 text-xs font-semibold text-slate-600 truncate">
                        {rowAsset.asset}
                      </div>
                      {/* Cells */}
                      {assetReturns.map((_, j) => {
                        const r = corrMatrix[i]?.[j] ?? null;
                        const isDiag = i === j;
                        const isHovered = hoveredPair?.i === i && hoveredPair?.j === j;
                        return (
                          <div key={j}
                            style={{
                              width: cellSize, minWidth: cellSize, height: cellSize,
                              backgroundColor: corrColor(isDiag ? 1 : r),
                              border: isHovered ? '2px solid #6C3AED' : '1px solid rgba(255,255,255,0.3)',
                            }}
                            className="flex items-center justify-center cursor-pointer transition-all relative group"
                            onMouseEnter={() => !isDiag && setHoveredPair({ i, j })}
                            onMouseLeave={() => setHoveredPair(null)}>
                            <div className="text-center">
                              <div className="text-xs font-bold font-mono leading-tight"
                                style={{ color: corrTextColor(isDiag ? 1 : r) }}>
                                {isDiag ? '1.00' : (r !== null ? r.toFixed(2) : '—')}
                              </div>
                            </div>
                            {/* Tooltip */}
                            {!isDiag && isHovered && (
                              <div className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap pointer-events-none">
                                <div className="font-semibold text-slate-700">{rowAsset.asset} × {assetReturns[j].asset}</div>
                                <div className="flex justify-between gap-3 mt-0.5">
                                  <span className="text-slate-500">r =</span>
                                  <span className="font-mono font-semibold">{r?.toFixed(4) ?? '—'}</span>
                                </div>
                                <div className="text-muted-foreground">{corrLabel(r)}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Color legend */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">−1.0</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                  {['#7F1D1D','#DC2626','#EF4444','#FCA5A5','#FEF2F2','#ECFDF5','#A7F3D0','#34D399','#059669','#065F46'].map((c, i) => (
                    <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">+1.0</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 px-8">
                <span>Strong −</span><span>Neutral</span><span>Strong +</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Avg Correlation per Asset ── */}
        {isConfigured && avgCorrByAsset.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Average Correlation per Asset</CardTitle>
              <CardDescription>Average off-diagonal correlation — lower = better diversifier within the portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, avgCorrByAsset.length * 44)}>
                <BarChart data={avgCorrByAsset} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(1)} />
                  <YAxis type="category" dataKey="asset" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={56} />
                  <Tooltip
                    formatter={(v: number) => [v.toFixed(3), 'Avg Correlation']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1.5} />
                  <Bar dataKey="avgCorr" name="Avg Corr" maxBarSize={28} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="avgCorr" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => v.toFixed(3)} />
                    {avgCorrByAsset.map((d, i) => (
                      <Cell key={i} fill={corrColor(d.avgCorr)} stroke="#CBD5E1" strokeWidth={0.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Top Pairs Table ── */}
        {isConfigured && pairs.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Most correlated */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Most Correlated Pairs</CardTitle>
                <CardDescription>Highest correlation — lowest diversification benefit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Pair', 'Correlation', 'Interpretation'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...pairs].sort((a, b) => b.corr - a.corr).slice(0, 6).map((p, i) => (
                        <tr key={i} className="border-t hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-semibold text-slate-700 font-mono text-xs">
                            {p.assetA} / {p.assetB}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold"
                              style={{ backgroundColor: corrColor(p.corr), color: corrTextColor(p.corr) }}>
                              {p.corr.toFixed(3)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{corrLabel(p.corr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Least correlated (best diversifiers) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Best Diversifying Pairs</CardTitle>
                <CardDescription>Lowest correlation — highest diversification benefit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Pair', 'Correlation', 'Interpretation'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...pairs].sort((a, b) => a.corr - b.corr).slice(0, 6).map((p, i) => (
                        <tr key={i} className="border-t hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-semibold text-slate-700 font-mono text-xs">
                            {p.assetA} / {p.assetB}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold"
                              style={{ backgroundColor: corrColor(p.corr), color: corrTextColor(p.corr) }}>
                              {p.corr.toFixed(3)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{corrLabel(p.corr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Asset Statistics ── */}
        {isConfigured && assetStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Asset Return Statistics
              </CardTitle>
              <CardDescription>Annualized figures based on {assetReturns[0]?.values.length} period{assetReturns[0]?.values.length !== 1 ? 's' : ''} — assumes monthly returns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Asset', 'Periods', 'Monthly Mean', 'Monthly Vol', 'Ann. Return', 'Ann. Vol', 'Sharpe', 'Avg Corr'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assetStats.map((s, i) => {
                      const avgCorr = avgCorrByAsset.find(a => a.asset === s.asset)?.avgCorr ?? null;
                      return (
                        <tr key={i} className="border-t hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-bold text-slate-700">{s.asset}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">{s.n}</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${s.mean >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {(s.mean * 100).toFixed(2)}%
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{(s.std * 100).toFixed(2)}%</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${s.annMean >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {(s.annMean * 100).toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{(s.annStd * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 font-mono text-slate-700 font-semibold">
                            {s.sharpe !== null ? s.sharpe.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {avgCorr !== null && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold"
                                style={{ backgroundColor: corrColor(avgCorr), color: corrTextColor(avgCorr) }}>
                                {avgCorr.toFixed(3)}
                              </span>
                            )}
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
        {isConfigured && (() => {
          const avgAllCorr = pairs.length
            ? pairs.reduce((s, p) => s + p.corr, 0) / pairs.length : 0;
          const highCorrPairs = pairs.filter(p => p.corr >= 0.7);
          const negCorrPairs  = pairs.filter(p => p.corr < 0);
          const bestDiv       = [...pairs].sort((a, b) => a.corr - b.corr)[0];
          const worstDiv      = [...pairs].sort((a, b) => b.corr - a.corr)[0];
          const bestSharpe    = [...assetStats].filter(s => s.sharpe !== null).sort((a, b) => (b.sharpe ?? 0) - (a.sharpe ?? 0))[0];

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated correlation analysis — {n} assets · {pairs.length} unique pairs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Portfolio Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{n} assets</span> across{' '}
                    <span className="font-semibold">{assetReturns[0]?.values.length} periods</span>.
                    Average pairwise correlation: <span className="font-semibold">{avgAllCorr.toFixed(3)}</span>.
                    Diversification Score: <span className="font-semibold">{divScore}/100</span>{' '}
                    (<span className="font-semibold">{divBand.label}</span>).
                    {highCorrPairs.length > 0
                      ? <> <span className="font-semibold">{highCorrPairs.length}</span> pair{highCorrPairs.length !== 1 ? 's' : ''} with r ≥ 0.7 (high overlap).</>
                      : ' No highly correlated pairs (r ≥ 0.7) detected.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Div. Score',   value: `${divScore}/100`, sub: divBand.label },
                    { label: 'Avg Corr',     value: avgAllCorr.toFixed(3), sub: `${pairs.length} pairs` },
                    { label: 'High Corr Pairs', value: String(highCorrPairs.length), sub: 'r ≥ 0.70' },
                    { label: 'Neg Corr Pairs',  value: String(negCorrPairs.length),  sub: 'r < 0 (hedge)' },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Diversification Assessment</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {divScore >= 75
                          ? `A diversification score of ${divScore}/100 indicates the portfolio is well-diversified. The low average pairwise correlation (${avgAllCorr.toFixed(3)}) means that assets do not move in lockstep — combining them meaningfully reduces portfolio variance relative to holding any single asset.`
                          : divScore >= 50
                          ? `A diversification score of ${divScore}/100 indicates moderate diversification. While some low-correlation pairs exist, the overall average correlation of ${avgAllCorr.toFixed(3)} suggests the portfolio still carries meaningful concentration risk. Consider adding assets from uncorrelated asset classes.`
                          : `A diversification score of ${divScore}/100 suggests the portfolio is concentrated. The average pairwise correlation of ${avgAllCorr.toFixed(3)} is relatively high — assets tend to move together, which amplifies drawdowns during broad market stress events. Adding genuinely uncorrelated assets (e.g., bonds, commodities, alternatives) could reduce portfolio variance.`}
                      </p>
                    </div>
                  </div>

                  {highCorrPairs.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">High-Correlation Pairs (r ≥ 0.70)</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {highCorrPairs.slice(0, 4).map(p => `${p.assetA} / ${p.assetB} (r = ${p.corr.toFixed(3)})`).join(', ')}.
                          {' '}These pairs offer limited diversification benefit — holding both provides minimal variance reduction
                          compared to holding a larger position in one. Review whether the allocation to both is intentional
                          or reflects redundancy.
                        </p>
                      </div>
                    </div>
                  )}

                  {bestDiv && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Best Diversifying Pair</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-semibold">{bestDiv.assetA} / {bestDiv.assetB}</span>{' '}
                          (r = <span className="font-semibold">{bestDiv.corr.toFixed(3)}</span>){' '}
                          is the pair with the lowest correlation in the portfolio.
                          {bestDiv.corr < 0
                            ? ` A negative correlation means these assets tend to move in opposite directions — combining them actively reduces portfolio variance and can serve as a natural hedge.`
                            : ` A low positive correlation still provides meaningful variance reduction when combined at the portfolio level.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {bestSharpe && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Risk-Adjusted Return</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-semibold">{bestSharpe.asset}</span> has the highest Sharpe ratio{' '}
                          (<span className="font-semibold">{bestSharpe.sharpe?.toFixed(2)}</span>), with an annualized return
                          of <span className="font-semibold">{(bestSharpe.annMean * 100).toFixed(1)}%</span> and volatility
                          of <span className="font-semibold">{(bestSharpe.annStd * 100).toFixed(1)}%</span>.
                          Note: Sharpe here uses 0% risk-free rate — adjust for comparison against actual benchmarks.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Pearson correlation of return series. Diversification Score = (1 − avg off-diagonal correlation) / 2 × 100.
                  Sharpe assumes 0% risk-free rate and monthly return frequency (annualized ×12 / ×√12).
                  Past return correlations may not persist — correlations often spike toward 1 during market stress.
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
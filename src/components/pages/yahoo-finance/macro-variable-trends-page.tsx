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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
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
  Activity,
  BarChart3,
  Layers,
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
// Constants
// ============================================

const CHART_COLORS = [
  '#6C3AED', '#F59E0B', '#10B981', '#EF4444',
  '#3B82F6', '#EC4899', '#14B8A6', '#F97316',
];

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2020-01-03');

  let rate    = 1.75;  // Fed Funds Rate %
  let oil     = 60;    // WTI Crude $/bbl
  let usdIndex = 97;   // DXY
  let vix     = 15;    // VIX

  // Simulate macro shocks
  const shocks: { day: number; rateD: number; oilD: number; usdD: number; vixD: number }[] = [
    { day: 55,  rateD: -1.50, oilD: -30, usdD:  3,  vixD:  40 }, // COVID crash
    { day: 70,  rateD: -0.25, oilD: -10, usdD:  2,  vixD:  20 },
    { day: 200, rateD:  0,    oilD:  20, usdD: -3,  vixD: -15 }, // recovery
    { day: 400, rateD:  0.25, oilD:  15, usdD:  2,  vixD:   5 }, // hike cycle starts
    { day: 450, rateD:  0.50, oilD:  10, usdD:  3,  vixD:   3 },
    { day: 500, rateD:  0.75, oilD:   5, usdD:  2,  vixD:  -2 },
    { day: 600, rateD:  0.25, oilD:  -8, usdD: -2,  vixD:  -3 }, // pause
  ];

  for (let d = 0; d < 756; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Apply shocks
    const shock = shocks.find((s) => s.day === d);
    if (shock) {
      rate     = Math.max(0, rate     + shock.rateD);
      oil      = Math.max(10, oil     + shock.oilD);
      usdIndex = Math.max(80, usdIndex + shock.usdD);
      vix      = Math.max(10, vix     + shock.vixD);
    }

    // Daily drift + noise
    rate     = Math.max(0,  rate     + (Math.random() - 0.5) * 0.02);
    oil      = Math.max(10, oil      + (Math.random() - 0.48) * 1.2);
    usdIndex = Math.max(80, usdIndex + (Math.random() - 0.5) * 0.3);
    vix      = Math.max(10, vix      + (Math.random() - 0.5) * 0.8);

    rows.push({
      date:        date.toISOString().split('T')[0],
      fed_rate:    parseFloat(rate.toFixed(2)),
      oil_wti:     parseFloat(oil.toFixed(2)),
      usd_index:   parseFloat(usdIndex.toFixed(2)),
      vix:         parseFloat(vix.toFixed(2)),
    });
  }
  return rows;
}

// ============================================
// Helpers
// ============================================

function calcStats(values: number[]) {
  if (!values.length) return { min: 0, max: 0, mean: 0, last: 0, chg: 0, chgPct: 0 };
  const min  = Math.min(...values);
  const max  = Math.max(...values);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const last = values[values.length - 1];
  const first = values[0];
  const chg    = last - first;
  const chgPct = first !== 0 ? (chg / Math.abs(first)) * 100 : 0;
  return { min, max, mean, last, chg, chgPct };
}

// ============================================
// Tooltip
// ============================================

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
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

// ============================================
// Intro Page
// ============================================

const IntroPage = ({ onLoadExample }: { onLoadExample: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Activity className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Macro Variable Trends</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze time-series trends of key macroeconomic variables — interest rates, oil prices, exchange rates, and volatility indices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <TrendingUp  className="w-6 h-6 text-primary mb-2" />, title: 'Multi-Variable Overlay', desc: 'Plot up to 4 macro variables on a shared timeline to identify co-movements, divergences, and inflection points' },
            { icon: <BarChart3   className="w-6 h-6 text-primary mb-2" />, title: 'Summary Statistics',     desc: 'Min, max, mean, and period change for each variable — quickly assess the range and direction of each indicator' },
            { icon: <Layers      className="w-6 h-6 text-primary mb-2" />, title: 'Normalized View',        desc: 'Normalize all variables to a common base to compare relative performance regardless of scale differences' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use this page to monitor macroeconomic conditions over time. Tracking variables like fed funds rate, oil, FX, and VIX together helps identify regime shifts, policy pivots, and macro headwinds or tailwinds.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — Observation date</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>1–4 numeric columns</strong> — Any macro variables (rate, price, index…)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Per-variable trend line charts</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Normalized overlay for cross-variable comparison</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Summary statistics table + insights</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Activity className="mr-2 h-5 w-5" />
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

export default function MacroVariableTrendsPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {
  const hasData    = data.length > 0;

  const [dateCol,  setDateCol]  = useState('');
  const [var1Col,  setVar1Col]  = useState('');
  const [var2Col,  setVar2Col]  = useState('');
  const [var3Col,  setVar3Col]  = useState('');
  const [var4Col,  setVar4Col]  = useState('');
  const [normalize, setNormalize] = useState(false);

  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_macro_variables.csv');
    setDateCol('date');
    setVar1Col('fed_rate');
    setVar2Col('oil_wti');
    setVar3Col('usd_index');
    setVar4Col('vix');
    setNormalize(false);
  }, []);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setVar1Col(''); setVar2Col(''); setVar3Col(''); setVar4Col('');
    setNormalize(false);
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map((s) => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex((c) => kws.some((k) => c === k));
      if (idx === -1) idx = h.findIndex((c) => kws.some((k) => k.length > 3 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['date', 'Date'], setDateCol, dateCol);
  }, [hasData, allHeaders]);


  // ── Active variables ───────────────────────────────────────
  const activeVars = useMemo(() =>
    [
      { col: var1Col, color: CHART_COLORS[0] },
      { col: var2Col, color: CHART_COLORS[1] },
      { col: var3Col, color: CHART_COLORS[2] },
      { col: var4Col, color: CHART_COLORS[3] },
    ].filter((v) => v.col),
    [var1Col, var2Col, var3Col, var4Col],
  );

  // ── Chart data ─────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!dateCol || !activeVars.length) return [];
    const rows = data.map((row) => {
      const entry: Record<string, any> = { date: String(row[dateCol] ?? '') };
      for (const { col } of activeVars) {
        entry[col] = row[col] != null ? parseFloat(String(row[col])) : null;      }
      return entry;
    }).filter((r) => r.date);

    if (!normalize) return rows;

    // Normalize to 100 base
    const firsts: Record<string, number> = {};
    for (const { col } of activeVars) {
      const first = rows.find((r) => r[col] !== null)?.[col];
      if (first) firsts[col] = first;
    }
    return rows.map((r) => {
      const n = { ...r };
      for (const { col } of activeVars) {
        if (firsts[col] && r[col] !== null) n[col] = parseFloat(((r[col] / firsts[col]) * 100).toFixed(3));
      }
      return n;
    });
  }, [data, dateCol, activeVars, normalize]);

  // ── Per-variable stats ─────────────────────────────────────
  const varStats = useMemo(
    () =>
      activeVars.map(({ col, color }) => {
        const values = data
          .map((r) => {
            const raw = r[col];
  
            if (raw == null) return NaN;
            if (typeof raw === "number") return raw;
  
            return parseFloat(raw);
          })
          .filter((v) => !isNaN(v));
  
        return { col, color, ...calcStats(values) };
      }),
    [activeVars, data],
  );
  

  const isConfigured = !!(dateCol && activeVars.length > 0 && chartData.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!chartData.length) return;
    const csv = Papa.unparse(chartData);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `MacroVariables_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [chartData, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `MacroVariables_${new Date().toISOString().split('T')[0]}.png`;
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
              const csv = Papa.unparse(data);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
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
                  {allHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    {allHeaders.map((h) => (
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 1</span>
            <span className="text-xs text-muted-foreground">Macro & Sector</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Macro Variable Trends
          </CardTitle>
          <CardDescription>
            Time-series analysis of key macroeconomic variables — interest rates, oil prices, exchange rates, and volatility indices.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Select a date column and up to 4 macro variables to plot.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">DATE *</Label>
              <Select value={dateCol || '__none__'} onValueChange={(v) => setDateCol(v === '__none__' ? '' : v)}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {allHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Variable selectors */}
            {[
              { label: 'VARIABLE 1', value: var1Col, setter: setVar1Col },
              { label: 'VARIABLE 2', value: var2Col, setter: setVar2Col },
              { label: 'VARIABLE 3', value: var3Col, setter: setVar3Col },
              { label: 'VARIABLE 4', value: var4Col, setter: setVar4Col },
            ].map(({ label, value, setter }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={(v) => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {numericHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {/* Normalize toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">NORMALIZE</Label>
              <Button
                variant={normalize ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-full text-xs"
                onClick={() => setNormalize((v) => !v)}
              >
                {normalize ? 'On (base 100)' : 'Off'}
              </Button>
            </div>
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
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && varStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {varStats.map((s) => (
            <div key={s.col} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 truncate" title={s.col}>
                {s.col}
              </div>
              <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">
                {s.last.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {s.chgPct >= 0 ? '+' : ''}{s.chgPct.toFixed(1)}% — {s.chg >= 0 ? '+' : ''}{s.chg.toFixed(2)} vs start
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Combined Overlay Chart ── */}
        {isConfigured && chartData.length > 0 && activeVars.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {normalize ? 'Normalized Trend Overlay (Base = 100)' : 'Multi-Variable Overlay'}
              </CardTitle>
              <CardDescription>
                {normalize
                  ? 'All variables rebased to 100 at the start of the period for relative comparison'
                  : 'All selected macro variables plotted on a shared timeline'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={60} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(1)} width={42} />
                  <Tooltip content={<LineTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {normalize && <ReferenceLine y={100} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1} />}
                  {activeVars.map(({ col, color }) => (
                    <Line key={col} type="monotone" dataKey={col} name={col}
                      stroke={color} strokeWidth={1.5} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Individual Variable Charts ── */}
        {isConfigured && chartData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {activeVars.map(({ col, color }) => {
              const s = varStats.find((v) => v.col === col);
              return (
                <Card key={col}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{col}</CardTitle>
                      {s && (
                        <span className={`text-xs font-mono font-semibold ${s.chgPct >= 0 ? 'text-primary' : 'text-slate-500'}`}>
                          {s.chgPct >= 0 ? '+' : ''}{s.chgPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {s && (
                      <CardDescription>
                        Current {s.last.toFixed(2)} · Min {s.min.toFixed(2)} · Max {s.max.toFixed(2)} · Mean {s.mean.toFixed(2)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                          axisLine={{ stroke: '#E2E8F0' }} minTickGap={60} />
                        <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(1)} width={36} />
                        <Tooltip content={<LineTooltip />} />
                        <Line type="monotone" dataKey={col} name={col}
                          stroke={color} strokeWidth={1.5} dot={false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Summary Statistics Table ── */}
        {isConfigured && varStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Summary Statistics</CardTitle>
              <CardDescription>Period statistics for each selected variable</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Variable', 'Latest', 'Min', 'Max', 'Mean', 'Change', 'Change %'].map((h) => (
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Variable' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {varStats.map((s) => (
                      <tr key={s.col} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="font-medium text-slate-700">{s.col}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{s.last.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{s.min.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{s.max.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{s.mean.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {s.chg >= 0 ? '+' : ''}{s.chg.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          <span className={s.chgPct >= 0 ? 'text-primary' : 'text-slate-500'}>
                            {s.chgPct >= 0 ? '+' : ''}{s.chgPct.toFixed(2)}%
                          </span>
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
        {isConfigured && varStats.length > 0 && (() => {
          const sorted     = [...varStats].sort((a, b) => Math.abs(b.chgPct) - Math.abs(a.chgPct));
          const biggest    = sorted[0];
          const mostStable = [...varStats].sort((a, b) => Math.abs(a.chgPct) - Math.abs(b.chgPct))[0];
          const risers     = varStats.filter((s) => s.chgPct > 0);
          const fallers    = varStats.filter((s) => s.chgPct < 0);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated summary of macro variable trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">Period Overview</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Tracking <span className="font-semibold">{varStats.length}</span> macro variable{varStats.length > 1 ? 's' : ''} over{' '}
                    <span className="font-semibold font-mono">{chartData.length.toLocaleString()}</span> observations.{' '}
                    {risers.length > 0 && <>{risers.length} variable{risers.length > 1 ? 's' : ''} rose over the period. </>}
                    {fallers.length > 0 && <>{fallers.length} variable{fallers.length > 1 ? 's' : ''} declined. </>}
                    The most volatile move was in{' '}
                    <span className="font-semibold">{biggest.col}</span> ({biggest.chgPct >= 0 ? '+' : ''}{biggest.chgPct.toFixed(1)}%).
                  </p>
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {varStats.map((s) => (
                    <div key={s.col} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 truncate">{s.col}</div>
                      <div className="text-lg font-bold font-mono text-slate-700">{s.last.toFixed(2)}</div>
                      <div className={`text-xs font-mono mt-0.5 ${s.chgPct >= 0 ? 'text-primary' : 'text-slate-500'}`}>
                        {s.chgPct >= 0 ? '+' : ''}{s.chgPct.toFixed(1)}% total
                      </div>
                    </div>
                  ))}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Largest Move — {biggest.col}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold">{biggest.col}</span> showed the largest period change at{' '}
                        <span className="font-mono font-semibold">{biggest.chgPct >= 0 ? '+' : ''}{biggest.chgPct.toFixed(1)}%</span>,
                        moving from <span className="font-mono">{(biggest.last - biggest.chg).toFixed(2)}</span> to{' '}
                        <span className="font-mono">{biggest.last.toFixed(2)}</span>.
                        The range over the period spanned <span className="font-mono">{biggest.min.toFixed(2)}</span> to{' '}
                        <span className="font-mono">{biggest.max.toFixed(2)}</span>.
                      </p>
                    </div>
                  </div>

                  {mostStable.col !== biggest.col && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Most Stable — {mostStable.col}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-semibold">{mostStable.col}</span> was the most stable variable with a period change of{' '}
                          <span className="font-mono font-semibold">{mostStable.chgPct >= 0 ? '+' : ''}{mostStable.chgPct.toFixed(1)}%</span>.
                          This relative stability can serve as an anchor when interpreting moves in more volatile variables.
                        </p>
                      </div>
                    </div>
                  )}

                  {normalize && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Normalized View Enabled</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          All variables are rebased to 100 at the start of the period.
                          The overlay chart shows relative performance regardless of scale — useful for comparing variables with very different unit magnitudes (e.g., interest rates vs oil prices).
                        </p>
                      </div>
                    </div>
                  )}

                  {risers.length > 0 && fallers.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Divergent Trends</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Variables are moving in opposite directions over the period —{' '}
                          {risers.map((r) => r.col).join(', ')} rising while{' '}
                          {fallers.map((f) => f.col).join(', ')} declining.
                          Divergences between macro variables can signal regime transitions or policy shifts worth monitoring.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Statistics are computed across all available rows for each selected column. Normalized values use the first non-null observation as the base (= 100).
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
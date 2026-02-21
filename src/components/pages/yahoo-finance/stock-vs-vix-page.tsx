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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  ComposedChart,
  Bar,
} from 'recharts';
import {
  Activity,
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
  AlertTriangle,
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
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2020-01-03');

  let price = 3230;
  let vix   = 14;

  const shocks = [
    { day: 38,  priceDrift: -0.05, vixJump:  55 }, // Feb 2020 crash
    { day: 55,  priceDrift: -0.04, vixJump:  25 },
    { day: 70,  priceDrift:  0.03, vixJump: -20 }, // recovery starts
    { day: 130, priceDrift:  0.02, vixJump: -10 },
    { day: 280, priceDrift:  0.01, vixJump:  -5 },
    { day: 450, priceDrift: -0.02, vixJump:  12 }, // 2021 vol spike
    { day: 510, priceDrift: -0.03, vixJump:  18 }, // rate hike fears
    { day: 560, priceDrift: -0.02, vixJump:  10 },
    { day: 650, priceDrift:  0.015,vixJump:  -8 },
    { day: 700, priceDrift:  0.02, vixJump:  -6 },
  ];

  for (let d = 0; d < 756; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const shock = shocks.find((s) => s.day === d);
    if (shock) {
      price = price * (1 + shock.priceDrift);
      vix   = Math.max(10, vix + shock.vixJump);
    }

    // VIX and price tend to move inversely
    const vixNoise   = (Math.random() - 0.5) * 1.2;
    const priceNoise = (Math.random() - 0.48) * 18;

    // Negative correlation: when vix rises, price tends to fall
    const vixChange   = vixNoise;
    const priceChange = -vixChange * 6 + priceNoise;

    vix   = Math.max(10, Math.min(85, vix   + vixChange));
    price = Math.max(1000, price + priceChange);

    const ret = rows.length > 0
      ? ((price - (rows[rows.length - 1].price as number)) / (rows[rows.length - 1].price as number)) * 100
      : 0;

    rows.push({
      date:         date.toISOString().split('T')[0],
      price:        parseFloat(price.toFixed(2)),
      vix:          parseFloat(vix.toFixed(2)),
      daily_return: parseFloat(ret.toFixed(4)),
    });
  }
  return rows;
}

// ============================================
// Helpers
// ============================================

function calcCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const meanX = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num  += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : num / denom;
}

function vixRiskLabel(vix: number): { label: string; desc: string } {
  if (vix < 15) return { label: 'Complacency',  desc: 'Market is calm — risk appetite is elevated' };
  if (vix < 20) return { label: 'Low Fear',     desc: 'Modest uncertainty — broadly risk-on' };
  if (vix < 30) return { label: 'Elevated Fear',desc: 'Noticeable stress — risk appetite declining' };
  if (vix < 40) return { label: 'High Fear',    desc: 'Significant stress — risk-off environment' };
  return              { label: 'Extreme Fear',  desc: 'Market panic — systemic risk concerns' };
}

// ============================================
// Tooltips
// ============================================

const DualTooltip = ({ active, payload, label }: any) => {
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

const ScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d?.date}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">VIX</span>
        <span className="font-mono">{d?.vix?.toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Return</span>
        <span className="font-mono">{d?.ret?.toFixed(3)}%</span>
      </div>
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
        <CardTitle className="font-headline text-3xl">Volatility (VIX) vs Price</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze the inverse relationship between the VIX index and equity returns to gauge market risk appetite
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Activity   className="w-6 h-6 text-primary mb-2" />, title: 'Inverse Correlation',   desc: 'Quantify how strongly VIX moves opposite to price returns — the fear gauge vs greed dynamic in a single metric' },
            { icon: <BarChart3  className="w-6 h-6 text-primary mb-2" />, title: 'Scatter Analysis',      desc: 'Plot VIX levels against daily returns to visualize the relationship and identify outlier stress days' },
            { icon: <Layers     className="w-6 h-6 text-primary mb-2" />, title: 'Risk Appetite Gauge',   desc: 'Classify the current VIX level into risk regimes — Complacency, Low Fear, Elevated Fear, High Fear, or Extreme Fear' },
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
            Use this page to monitor the fear-greed relationship in equity markets.
            A rising VIX with falling prices signals risk-off; a falling VIX with rising prices signals risk-on.
            Breakdowns in the inverse correlation can indicate structural shifts in market behavior.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — Trading date</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>vix</strong> — VIX index level</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>daily_return or price</strong> — Equity return or price</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Dual-axis VIX + Price timeline</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>VIX vs return scatter plot</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Correlation coefficient + risk appetite insights</span></li>
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

export default function VixVsPricePage({
  data: externalData,
  allHeaders: externalHeaders,
  numericHeaders,
  fileName,
  onClearData,
}: AnalysisPageProps) {
  const [internalData, setInternalData] = useState<Record<string, any>[] | null>(null);
  const data       = internalData ?? externalData;
  const allHeaders = internalData ? Object.keys(internalData[0] ?? {}) : externalHeaders;
  const hasData    = data.length > 0;

  const [dateCol,   setDateCol]   = useState('');
  const [vixCol,    setVixCol]    = useState('');
  const [returnCol, setReturnCol] = useState('');
  const [priceCol,  setPriceCol]  = useState('');

  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    setInternalData(rows);
    setDateCol('date');
    setVixCol('vix');
    setReturnCol('daily_return');
    setPriceCol('price');
  }, []);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setInternalData(null);
    setDateCol(''); setVixCol(''); setReturnCol(''); setPriceCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData || internalData) return;
    const h = allHeaders.map((s) => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex((c) => kws.some((k) => c === k));
      if (idx === -1) idx = h.findIndex((c) => kws.some((k) => k.length > 3 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['date'],                                    setDateCol,   dateCol);
    detect(['vix', 'volatility_index', 'vol_index'],   setVixCol,    vixCol);
    detect(['daily_return', 'return', 'ret', 'pct'],   setReturnCol, returnCol);
    detect(['close', 'price', 'adj_close'],             setPriceCol,  priceCol);
  }, [hasData, allHeaders, internalData]);

  // ── Effective headers ──────────────────────────────────────
  const effectiveNumericHeaders = useMemo(() => {
    if (!internalData) return numericHeaders;
    const s = internalData[0] ?? {};
    return Object.keys(s).filter((k) => typeof s[k] === 'number');
  }, [internalData, numericHeaders]);

  // ── Build chart data ───────────────────────────────────────
  const chartData = useMemo(() => {
    if (!dateCol || !vixCol) return [];
    return data.map((row) => ({
      date:   String(row[dateCol] ?? ''),
      vix:    parseFloat(row[vixCol])    || null,
      ret:    returnCol ? parseFloat(row[returnCol]) || null : null,
      price:  priceCol  ? parseFloat(row[priceCol])  || null : null,
    })).filter((r) => r.date && r.vix !== null);
  }, [data, dateCol, vixCol, returnCol, priceCol]);

  // ── Scatter data (VIX vs return) ───────────────────────────
  const scatterData = useMemo(() => {
    if (!returnCol) return [];
    return chartData
      .filter((r) => r.vix !== null && r.ret !== null)
      .slice(0, 500); // cap for perf
  }, [chartData, returnCol]);

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const vixValues = chartData.map((r) => r.vix!).filter(Boolean);
    const retValues = returnCol ? chartData.map((r) => r.ret!).filter((v) => v !== null) : [];

    const currentVix = vixValues[vixValues.length - 1] ?? 0;
    const avgVix     = vixValues.reduce((s, v) => s + v, 0) / vixValues.length;
    const maxVix     = Math.max(...vixValues);
    const minVix     = Math.min(...vixValues);
    const corr       = retValues.length > 10 ? calcCorrelation(vixValues.slice(0, retValues.length), retValues) : null;

    // Stress days: VIX > 30
    const stressDays = vixValues.filter((v) => v > 30).length;
    const stressPct  = (stressDays / vixValues.length) * 100;

    return { currentVix, avgVix, maxVix, minVix, corr, stressDays, stressPct };
  }, [chartData, returnCol]);

  const currentRisk = stats ? vixRiskLabel(stats.currentVix) : null;
  const isConfigured = !!(dateCol && vixCol && chartData.length > 0);
  const isExample    = !!internalData;
  const displayFileName = isExample ? 'example_vix_price.csv' : (fileName ?? 'Uploaded file');

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!chartData.length) return;
    const csv = Papa.unparse(chartData);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `VixVsPrice_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `VixVsPrice_${new Date().toISOString().split('T')[0]}.png`;
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
            Volatility (VIX) vs Price
          </CardTitle>
          <CardDescription>
            Inverse relationship between VIX and equity returns — gauge market risk appetite through the fear index.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Required: date and VIX column. Add return or price for full analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'DATE *',         value: dateCol,   setter: setDateCol,   headers: allHeaders,               opt: false },
              { label: 'VIX *',          value: vixCol,    setter: setVixCol,    headers: effectiveNumericHeaders,  opt: false },
              { label: 'DAILY RETURN',   value: returnCol, setter: setReturnCol, headers: effectiveNumericHeaders,  opt: true  },
              { label: 'PRICE',          value: priceCol,  setter: setPriceCol,  headers: effectiveNumericHeaders,  opt: true  },
            ].map(({ label, value, setter, headers, opt }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={(v) => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {opt && <SelectItem value="__none__">— None —</SelectItem>}
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
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
      {isConfigured && stats && currentRisk && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk Appetite</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">{currentRisk.label}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{currentRisk.desc}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current VIX</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{stats.currentVix.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Avg {stats.avgVix.toFixed(1)} · Max {stats.maxVix.toFixed(1)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stress Days (VIX &gt; 30)</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{stats.stressDays}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{stats.stressPct.toFixed(1)}% of all sessions</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">VIX–Return Correlation</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">
              {stats.corr !== null ? stats.corr.toFixed(3) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.corr !== null
                ? stats.corr < -0.3 ? 'Strong inverse relationship'
                  : stats.corr < 0  ? 'Weak inverse relationship'
                  : 'Positive — atypical'
                : 'Add return column'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── VIX Timeline ── */}
        {isConfigured && chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">VIX Level Over Time</CardTitle>
              <CardDescription>Fear index timeline with stress threshold at 30</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={60} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<DualTooltip />} />
                  <ReferenceLine y={30} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1}
                    label={{ value: 'Stress (30)', position: 'insideTopRight', fontSize: 9, fill: '#94A3B8' }} />
                  <ReferenceLine y={20} stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth={1}
                    label={{ value: '20', position: 'insideTopRight', fontSize: 9, fill: '#CBD5E1' }} />
                  <Line type="monotone" dataKey="vix" name="VIX" stroke="#6C3AED"
                    strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Price Timeline ── */}
        {isConfigured && priceCol && chartData.some((d) => d.price !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price Timeline</CardTitle>
              <CardDescription>Equity price trend over the same period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={60} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)} width={42} />
                  <Tooltip content={<DualTooltip />} />
                  <Line type="monotone" dataKey="price" name="Price" stroke="#10B981"
                    strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Return Timeline ── */}
        {isConfigured && returnCol && chartData.some((d) => d.ret !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Return Timeline</CardTitle>
              <CardDescription>Daily returns — compare with VIX spikes above</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={60} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}%`} width={42} />
                  <Tooltip content={<DualTooltip />} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="ret" name="Daily Return %" maxBarSize={6} radius={[1, 1, 0, 0]}
                    fill="#6C3AED" fillOpacity={0.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Scatter Plot: VIX vs Return ── */}
        {isConfigured && scatterData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">VIX vs Daily Return — Scatter</CardTitle>
              <CardDescription>Each dot is one trading day — inverse relationship appears as a downward-sloping cloud</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" dataKey="vix" name="VIX" tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={{ stroke: '#E2E8F0' }}
                    label={{ value: 'VIX', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis type="number" dataKey="ret" name="Return %" tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} width={42} />
                  <ZAxis range={[18, 18]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <ReferenceLine x={30} stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth={1} />
                  <Scatter data={scatterData} fill="#6C3AED" fillOpacity={0.35} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && stats && currentRisk && (() => {
          const corr = stats.corr;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated risk appetite analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Risk Appetite Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Current VIX at <span className="font-mono font-semibold">{stats.currentVix.toFixed(1)}</span> signals{' '}
                    <span className="font-semibold">{currentRisk.label}</span> — {currentRisk.desc.toLowerCase()}.
                    Over the analysis period, VIX averaged <span className="font-mono font-semibold">{stats.avgVix.toFixed(1)}</span> and
                    peaked at <span className="font-mono font-semibold">{stats.maxVix.toFixed(1)}</span>.{' '}
                    Stress conditions (VIX &gt; 30) occurred on{' '}
                    <span className="font-semibold">{stats.stressDays}</span> days ({stats.stressPct.toFixed(1)}% of sessions).
                  </p>
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Current VIX',       value: stats.currentVix.toFixed(1),  sub: currentRisk.label },
                    { label: 'Average VIX',        value: stats.avgVix.toFixed(1),      sub: 'Period mean' },
                    { label: 'Peak VIX',           value: stats.maxVix.toFixed(1),      sub: 'Maximum observed' },
                    { label: 'Stress Days',        value: `${stats.stressDays}`,         sub: `${stats.stressPct.toFixed(1)}% of period` },
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

                  {corr !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">VIX–Return Correlation: {corr.toFixed(3)}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {corr < -0.4
                            ? `A strong negative correlation of ${corr.toFixed(3)} confirms the classic fear-greed dynamic. VIX spikes reliably coincide with equity selloffs, validating VIX as a useful hedge signal.`
                            : corr < -0.1
                            ? `A moderate negative correlation of ${corr.toFixed(3)} indicates the inverse relationship is present but not dominant. Other factors are also driving returns during this period.`
                            : corr < 0
                            ? `A weak negative correlation of ${corr.toFixed(3)} suggests the VIX–price inverse relationship is less reliable during this period. Regime shifts or structural changes may be at play.`
                            : `A positive correlation of ${corr.toFixed(3)} is atypical and may indicate a distressed period where selling pressure drove both volatility and prices up simultaneously.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {stats.stressPct > 15 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Elevated Stress Frequency</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          VIX exceeded 30 on <span className="font-mono font-semibold">{stats.stressDays}</span> days
                          ({stats.stressPct.toFixed(1)}% of sessions), indicating the period included
                          sustained episodes of market stress. Portfolios with explicit volatility hedges or tail-risk
                          protection would have been especially valuable during these windows.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Current Positioning Implication</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {stats.currentVix < 15 &&
                          'Low VIX suggests complacency. While risk assets can continue to rally, compressed volatility often precedes sharp reversals. Consider maintaining some optionality or tail hedges.'}
                        {stats.currentVix >= 15 && stats.currentVix < 20 &&
                          'Modest VIX indicates a broadly stable environment. Risk-on positioning is supported but remain attentive to macro catalysts that could spike volatility.'}
                        {stats.currentVix >= 20 && stats.currentVix < 30 &&
                          'Elevated VIX signals growing uncertainty. Reducing gross exposure, tightening stop-losses, and avoiding concentrated bets are prudent steps in this environment.'}
                        {stats.currentVix >= 30 &&
                          'High VIX indicates a risk-off regime. Defensive positioning, reduced equity exposure, and explicit vol hedges are warranted. Watch for VIX mean-reversion as a potential re-entry signal.'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Correlation is computed using Pearson's method across all available observations.
                  VIX risk labels are based on commonly used thresholds (15 / 20 / 30 / 40) and are indicative only.
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
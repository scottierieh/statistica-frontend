'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Target, BookOpen, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles,
  HelpCircle, Upload, BarChart3, Settings2, Zap, Activity,
  Package, AlertTriangle, Layers, ShoppingCart, RefreshCw,
  ArrowUpRight, ArrowDownRight, Truck
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '../../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Badge } from '../../ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface DemandRow {
  period: string;
  product: string;
  demand: number;        // units
  sortKey: number;
}

type ForecastMethod = 'linear' | 'moving_avg' | 'exp_smoothing' | 'growth_rate';

interface Settings {
  companyName: string;
  forecastPeriods: number;
  method: ForecastMethod;
  movingAvgWindow: number;
  smoothingAlpha: number;
  confidenceLevel: number;
  leadTimeDays: number;       // supplier lead time
  safetyStockDays: number;    // safety stock buffer
  avgUnitPrice: number;       // $ per unit for revenue impact
}

interface DemandForecastPageProps {
  onNavigateHome?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  primary: '#1e3a5f', secondary: '#0d9488', midNavy: '#2d5a8e',
  lightNavy: '#3b7cc0', softRed: '#e57373', skyBlue: '#5ba3cf',
  palette: ['#1e3a5f', '#0d9488', '#2d5a8e', '#3b7cc0', '#e57373', '#5ba3cf', '#7c9fc0', '#4db6ac', '#4a90b8', '#64748b'],
};

const METHOD_LABELS: Record<ForecastMethod, string> = {
  linear: 'Linear Regression', moving_avg: 'Moving Average',
  exp_smoothing: 'Exponential Smoothing', growth_rate: 'Growth Rate',
};

const fmtU = (n: number) => isFinite(n) ? Math.round(n).toLocaleString() : '—';
const fmtP = (n: number) => isFinite(n) ? `${n.toFixed(1)}%` : '—';
const fmtD = (n: number) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'M' : Math.round(n).toLocaleString() + 'K'}`;

// ═══════════════════════════════════════════════════════════════════════════════
// FORECASTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function linearRegression(data: number[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += data[i]; sxx += i * i; sxy += i * data[i]; }
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  const yMean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) { ssTot += (data[i] - yMean) ** 2; ssRes += (data[i] - (intercept + slope * i)) ** 2; }
  return { slope, intercept, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

function runForecast(data: number[], periods: number, method: ForecastMethod, window: number, alpha: number): { forecast: number[]; fitted: number[]; r2?: number; cagr?: number } {
  const n = data.length;
  if (n < 2) return { forecast: Array(periods).fill(data[0] || 0), fitted: [...data] };
  switch (method) {
    case 'linear': {
      const { slope, intercept, r2 } = linearRegression(data);
      return { forecast: Array.from({ length: periods }, (_, i) => Math.max(0, intercept + slope * (n + i))), fitted: data.map((_, i) => intercept + slope * i), r2 };
    }
    case 'moving_avg': {
      const w = Math.min(window, n);
      const fitted = data.map((_, i) => { const s = Math.max(0, i - w + 1); return data.slice(s, i + 1).reduce((a, b) => a + b, 0) / (i - s + 1); });
      const buf = [...data.slice(-w)];
      const fc: number[] = [];
      for (let i = 0; i < periods; i++) { const v = Math.max(0, buf.slice(-w).reduce((a, b) => a + b, 0) / w); fc.push(v); buf.push(v); }
      return { forecast: fc, fitted };
    }
    case 'exp_smoothing': {
      const beta = 0.3;
      let level = data[0], trend = n > 1 ? data[1] - data[0] : 0;
      const fitted: number[] = [level];
      for (let i = 1; i < n; i++) {
        const nl = alpha * data[i] + (1 - alpha) * (level + trend);
        const nt = beta * (nl - level) + (1 - beta) * trend;
        level = nl; trend = nt; fitted.push(level);
      }
      return { forecast: Array.from({ length: periods }, (_, i) => Math.max(0, level + trend * (i + 1))), fitted };
    }
    case 'growth_rate': {
      const first = data[0] || 1, last = data[n - 1];
      const cagr = (Math.pow(Math.abs(last / first), 1 / (n - 1)) - 1) * (last >= first ? 1 : -1);
      return { forecast: Array.from({ length: periods }, (_, i) => Math.max(0, last * Math.pow(1 + cagr, i + 1))), fitted: data.map((_, i) => first * Math.pow(1 + cagr, i)), cagr: cagr * 100 };
    }
  }
}

function computeBands(data: number[], fitted: number[], forecast: number[], z: number) {
  const residuals = data.map((d, i) => d - fitted[i]);
  const stdErr = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 1, 1));
  return forecast.map((f, i) => ({ lower: Math.max(0, f - stdErr * z * Math.sqrt(1 + (i + 1) / data.length)), upper: f + stdErr * z * Math.sqrt(1 + (i + 1) / data.length) }));
}

// Seasonality detection
function detectSeasonality(data: number[], periodsPerCycle: number): number[] {
  if (data.length < periodsPerCycle * 2) return Array(periodsPerCycle).fill(1);
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  const indices: number[][] = Array.from({ length: periodsPerCycle }, () => []);
  data.forEach((v, i) => indices[i % periodsPerCycle].push(v));
  return indices.map(arr => arr.length > 0 ? (arr.reduce((s, v) => s + v, 0) / arr.length) / (avg || 1) : 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

function buildSampleData(): DemandRow[] {
  const products = [
    { name: 'Widget Pro', base: 1200, growth: 25, season: [0.8, 0.85, 0.95, 1.0, 1.05, 1.1, 1.0, 0.95, 1.1, 1.15, 1.2, 1.3] },
    { name: 'Gadget Lite', base: 800, growth: 15, season: [0.9, 0.92, 1.0, 1.02, 1.05, 1.08, 0.98, 0.95, 1.05, 1.08, 1.1, 1.15] },
    { name: 'Sensor X', base: 450, growth: 30, season: [0.75, 0.8, 0.9, 1.0, 1.1, 1.15, 1.05, 1.0, 1.1, 1.15, 1.2, 1.25] },
    { name: 'Cable Pack', base: 2000, growth: 5, season: [0.95, 0.97, 1.0, 1.01, 1.02, 1.03, 1.0, 0.98, 1.02, 1.03, 1.04, 1.05] },
    { name: 'Display Unit', base: 300, growth: 40, season: [0.7, 0.75, 0.85, 0.95, 1.05, 1.15, 1.1, 1.0, 1.15, 1.2, 1.25, 1.35] },
  ];
  const rows: DemandRow[] = [];
  for (let y = 0; y < 3; y++) {
    for (let m = 0; m < 12; m++) {
      products.forEach(p => {
        const trend = p.base + (y * 12 + m) * p.growth;
        const noise = (Math.random() - 0.5) * p.base * 0.1;
        rows.push({
          period: `${2022 + y}-${String(m + 1).padStart(2, '0')}`,
          product: p.name,
          demand: Math.round(Math.max(0, trend * p.season[m] + noise)),
          sortKey: (2022 + y) * 100 + m + 1,
        });
      });
    }
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DemandForecastPage({ onNavigateHome }: DemandForecastPageProps) {
  const [phase, setPhase] = useState<'landing' | 'workspace'>('landing');
  const [demandRows, setDemandRows] = useState<DemandRow[]>([]);
  const [S, setS] = useState<Settings>({
    companyName: 'Acme Corp', forecastPeriods: 12, method: 'linear',
    movingAvgWindow: 3, smoothingAlpha: 0.3, confidenceLevel: 95,
    leadTimeDays: 30, safetyStockDays: 14, avgUnitPrice: 45,
  });
  const [showGuide, setShowGuide] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data as Record<string, any>[];
          if (rows.length < 3) throw new Error('Need at least 3 rows');
          const cols = Object.keys(rows[0]);
          const periodCol = cols.find(c => /period|date|month/i.test(c)) || cols[0];
          const prodCol = cols.find(c => /product|sku|item|name/i.test(c));
          const demCol = cols.find(c => /demand|units|quantity|qty|volume/i.test(c)) || cols[cols.length - 1];
          const parsed: DemandRow[] = rows.map((r, i) => ({
            period: String(r[periodCol]).trim(),
            product: prodCol ? String(r[prodCol]).trim() : 'Total',
            demand: Math.round(parseFloat(String(r[demCol]).replace(/[,]/g, '')) || 0),
            sortKey: i,
          })).filter(d => d.demand >= 0);
          if (parsed.length < 3) throw new Error('Need at least 3 valid rows');
          setDemandRows(parsed);
          setPhase('workspace');
          toast({ title: 'Data loaded', description: `${parsed.length} demand records.` });
        } catch (e: any) { toast({ title: 'Parse error', description: e.message, variant: 'destructive' }); }
      }
    });
  }, [toast]);

  const loadSample = useCallback(() => {
    setDemandRows(buildSampleData());
    setPhase('workspace');
    toast({ title: 'Sample loaded', description: '36 months × 5 products.' });
  }, [toast]);

  // ─── Aggregations ───
  const periods = useMemo(() => [...new Set(demandRows.map(r => r.period))], [demandRows]);
  const products = useMemo(() => [...new Set(demandRows.map(r => r.product))], [demandRows]);
  const nPeriods = periods.length;

  const periodTotals = useMemo(() => periods.map(p => demandRows.filter(r => r.period === p).reduce((s, r) => s + r.demand, 0)), [periods, demandRows]);

  const productSummaries = useMemo(() => products.map(prod => {
    const rows = demandRows.filter(r => r.product === prod);
    const totals = periods.map(p => rows.filter(r => r.period === p).reduce((s, r) => s + r.demand, 0));
    const totalDemand = totals.reduce((s, v) => s + v, 0);
    const avg = nPeriods > 0 ? totalDemand / nPeriods : 0;
    const growth = totals.length >= 2 && totals[0] > 0 ? ((totals[totals.length - 1] / totals[0]) - 1) * 100 : 0;
    const cv = avg > 0 ? Math.sqrt(totals.reduce((s, v) => s + (v - avg) ** 2, 0) / totals.length) / avg : 0;
    const seasonality = detectSeasonality(totals, 12);
    const peakMonth = seasonality.indexOf(Math.max(...seasonality));
    const troughMonth = seasonality.indexOf(Math.min(...seasonality));
    return { product: prod, totals, totalDemand, avg, growth, cv, seasonality, peakMonth, troughMonth };
  }).sort((a, b) => b.totalDemand - a.totalDemand), [products, demandRows, periods, nPeriods]);

  // ─── Total demand forecast ───
  const z = S.confidenceLevel === 95 ? 1.96 : 1.28;

  const totalResult = useMemo(() => {
    if (periodTotals.length < 3) return null;
    const res = runForecast(periodTotals, S.forecastPeriods, S.method, S.movingAvgWindow, S.smoothingAlpha);
    const bands = computeBands(periodTotals, res.fitted, res.forecast, z);
    const mae = periodTotals.reduce((s, v, i) => s + Math.abs(v - res.fitted[i]), 0) / periodTotals.length;
    const mape = periodTotals.reduce((s, v, i) => s + Math.abs(v > 0 ? (v - res.fitted[i]) / v : 0), 0) / periodTotals.length * 100;
    return { ...res, bands, mae, mape };
  }, [periodTotals, S, z]);

  // Product-level forecasts
  const productForecasts = useMemo(() => {
    return productSummaries.map(p => {
      if (p.totals.length < 3) return { ...p, forecast: [], fitted: [], fcAvg: 0, reorderPoint: 0, safetyStock: 0 };
      const res = runForecast(p.totals, S.forecastPeriods, S.method, S.movingAvgWindow, S.smoothingAlpha);
      const fcAvg = res.forecast.length > 0 ? res.forecast.reduce((s, v) => s + v, 0) / res.forecast.length : 0;
      const dailyDemand = fcAvg / 30;
      const safetyStock = Math.round(dailyDemand * S.safetyStockDays);
      const reorderPoint = Math.round(dailyDemand * S.leadTimeDays + safetyStock);
      return { ...p, forecast: res.forecast as number[], fitted: res.fitted as number[], fcAvg, reorderPoint, safetyStock };
    });
  }, [productSummaries, S]);

  // ─── Derived ───
  const totalHistDemand = periodTotals.reduce((s, v) => s + v, 0);
  const avgHistDemand = nPeriods > 0 ? totalHistDemand / nPeriods : 0;
  const totalForecastDemand = totalResult?.forecast.reduce((s, v) => s + v, 0) || 0;
  const avgForecastDemand = totalResult ? totalForecastDemand / S.forecastPeriods : 0;
  const lastActual = periodTotals[periodTotals.length - 1] || 0;
  const lastForecast = totalResult?.forecast[totalResult.forecast.length - 1] || 0;
  const demandGrowth = lastActual > 0 ? ((lastForecast / lastActual) - 1) * 100 : 0;
  const forecastRevenue = totalForecastDemand * S.avgUnitPrice / 1000; // $K

  // ─── Chart Data ───
  const chartData = useMemo(() => {
    if (!totalResult) return [];
    const rows: any[] = [];
    periods.forEach((p, i) => rows.push({ period: p, actual: periodTotals[i], fitted: Math.round(totalResult.fitted[i]), type: 'historical' }));
    const lastP = periods[periods.length - 1] || '';
    const isM = /^\d{4}-\d{2}$/.test(lastP);
    for (let i = 0; i < S.forecastPeriods; i++) {
      let label: string;
      if (isM) { const [y, m] = lastP.split('-').map(Number); const t = y * 12 + m + i; label = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; }
      else label = `F+${i + 1}`;
      rows.push({ period: label, forecast: Math.round(totalResult.forecast[i]), lower: Math.round(totalResult.bands[i].lower), upper: Math.round(totalResult.bands[i].upper), type: 'forecast' });
    }
    return rows;
  }, [periods, periodTotals, totalResult, S.forecastPeriods]);

  // Seasonality radar
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seasonRadar = useMemo(() => {
    const totalSeason = detectSeasonality(periodTotals, 12);
    return months.map((m, i) => ({ month: m, index: Math.round(totalSeason[i] * 100) }));
  }, [periodTotals]);

  // Product stacked
  const stackData = useMemo(() => periods.map(p => {
    const row: any = { period: p };
    productSummaries.forEach(prod => { row[prod.product] = demandRows.filter(r => r.period === p && r.product === prod.product).reduce((s, r) => s + r.demand, 0); });
    return row;
  }), [periods, productSummaries, demandRows]);

  // ─── Exports ───
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `Demand_Forecast.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, []);

  const handleDownloadCSV = useCallback(() => {
    if (!totalResult) return;
    const rows = [['Period', 'Total Demand', 'Fitted', 'Forecast', 'Lower', 'Upper']];
    periods.forEach((p, i) => rows.push([p, String(periodTotals[i]), String(Math.round(totalResult.fitted[i])), '', '', '']));
    chartData.filter(d => d.type === 'forecast').forEach(d => rows.push([d.period, '', '', String(d.forecast), String(d.lower), String(d.upper)]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a'); link.download = 'Demand_Forecast.csv'; link.href = URL.createObjectURL(blob); link.click();
  }, [totalResult, periods, periodTotals, chartData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === 'landing') return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-4 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"><ShoppingCart className="w-4 h-4" />Operations Planning</div>
        <CardTitle className="font-headline text-3xl">Demand Forecast</CardTitle>
        <p className="text-muted-foreground max-w-xl mx-auto">Forecast product-level demand with seasonality detection, inventory reorder points, safety stock calculations, and stock-out risk analysis.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Package, title: 'SKU-Level', desc: 'Forecast each product independently' },
          { icon: RefreshCw, title: 'Seasonality', desc: 'Auto-detect seasonal demand patterns' },
          { icon: Truck, title: 'Reorder Points', desc: 'Lead time + safety stock calculations' },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById('df-csv')?.click()}>
          <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Upload className="w-6 h-6 text-primary" /></div>
            <div><CardTitle className="text-base">Upload Demand Data</CardTitle><CardDescription className="text-xs">CSV: period, product, demand (units)</CardDescription></div>
            <input id="df-csv" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          </CardContent>
        </Card>
        <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={loadSample}>
          <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center"><BarChart3 className="w-6 h-6 text-secondary" /></div>
            <div><CardTitle className="text-base">Sample Data</CardTitle><CardDescription className="text-xs">36 months × 5 products with seasonality</CardDescription></div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Demand Forecast Guide</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div><h4 className="font-semibold mb-1">Data Format</h4><p className="text-muted-foreground">CSV: period, product/SKU, demand (units). If no product column, all demand treated as single total.</p></div>
            <div><h4 className="font-semibold mb-1">Reorder Point</h4><p className="text-muted-foreground">ROP = (Daily demand × Lead time) + Safety stock. Set lead time and safety stock days in settings.</p></div>
            <div><h4 className="font-semibold mb-1">Coefficient of Variation</h4><p className="text-muted-foreground">CV measures demand volatility. CV &gt; 0.5 = highly variable, needs larger safety stock.</p></div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="text-center"><Button variant="ghost" size="sm" onClick={() => setShowGuide(true)}><HelpCircle className="w-4 h-4 mr-1" />How it works</Button></div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKSPACE
  // ═══════════════════════════════════════════════════════════════════════════

  if (!totalResult) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><Label className="text-xs">Company</Label><Input value={S.companyName} onChange={e => setS(s => ({ ...s, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Method</Label>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full h-8 text-sm justify-between">{METHOD_LABELS[S.method]}<ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>{(Object.keys(METHOD_LABELS) as ForecastMethod[]).map(m => (<DropdownMenuItem key={m} onClick={() => setS(s => ({ ...s, method: m }))}>{METHOD_LABELS[m]}</DropdownMenuItem>))}</DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div><Label className="text-xs">Forecast Periods</Label><Input type="number" min={1} max={24} value={S.forecastPeriods} onChange={e => setS(s => ({ ...s, forecastPeriods: parseInt(e.target.value) || 6 }))} className="h-8 text-sm font-mono" /></div>
            <div><Label className="text-xs">Lead Time (days)</Label><Input type="number" min={1} value={S.leadTimeDays} onChange={e => setS(s => ({ ...s, leadTimeDays: parseInt(e.target.value) || 30 }))} className="h-8 text-sm font-mono" /></div>
            <div><Label className="text-xs">Safety Stock (days)</Label><Input type="number" min={0} value={S.safetyStockDays} onChange={e => setS(s => ({ ...s, safetyStockDays: parseInt(e.target.value) || 7 }))} className="h-8 text-sm font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div><Label className="text-xs">Avg Unit Price ($)</Label><Input type="number" min={0} value={S.avgUnitPrice} onChange={e => setS(s => ({ ...s, avgUnitPrice: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
            <div><Label className="text-xs">Confidence</Label>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full h-8 text-sm justify-between">{S.confidenceLevel}%<ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent><DropdownMenuItem onClick={() => setS(s => ({ ...s, confidenceLevel: 80 }))}>80%</DropdownMenuItem><DropdownMenuItem onClick={() => setS(s => ({ ...s, confidenceLevel: 95 }))}>95%</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            </div>
            {S.method === 'moving_avg' && <div><Label className="text-xs">Window</Label><Input type="number" min={2} max={12} value={S.movingAvgWindow} onChange={e => setS(s => ({ ...s, movingAvgWindow: parseInt(e.target.value) || 3 }))} className="h-8 text-sm font-mono" /></div>}
            {S.method === 'exp_smoothing' && <div><Label className="text-xs">Alpha</Label><Input type="number" min={0.1} max={0.9} step={0.1} value={S.smoothingAlpha} onChange={e => setS(s => ({ ...s, smoothingAlpha: parseFloat(e.target.value) || 0.3 }))} className="h-8 text-sm font-mono" /></div>}
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report</h2>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b">
          <h2 className="text-2xl font-bold">{S.companyName} — Demand Forecast</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {nPeriods} Periods | {products.length} Products | {METHOD_LABELS[S.method]}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Avg Demand/Period', value: fmtU(avgHistDemand), sub: `${products.length} products`, color: 'text-primary' },
            { label: 'Forecast Total', value: fmtU(totalForecastDemand), sub: `${S.forecastPeriods} periods`, color: 'text-primary' },
            { label: 'Demand Growth', value: fmtP(demandGrowth), sub: demandGrowth > 0 ? 'Growing' : 'Declining', color: demandGrowth > 0 ? 'text-green-600' : demandGrowth < -5 ? 'text-red-600' : 'text-amber-600' },
            { label: 'Revenue Impact', value: fmtD(forecastRevenue), sub: `@ $${S.avgUnitPrice}/unit`, color: 'text-primary' },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} className="border-0 shadow-lg"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Product Demand Detail Table */}
        <Card>
          <CardHeader><CardTitle>Product Demand Detail</CardTitle><CardDescription>Historical avg, forecast, growth, volatility, reorder point, and safety stock</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Product</th>
              <th className="p-2 text-right font-semibold">Avg/Period</th>
              <th className="p-2 text-right font-semibold">Last Period</th>
              <th className="p-2 text-right font-semibold">Forecast Avg</th>
              <th className="p-2 text-right font-semibold">Growth</th>
              <th className="p-2 text-center font-semibold">CV</th>
              <th className="p-2 text-right font-semibold">Reorder Pt</th>
              <th className="p-2 text-right font-semibold">Safety Stock</th>
              <th className="p-2 text-right font-semibold">% of Total</th>
            </tr></thead>
            <tbody>{productForecasts.map((p, i) => {
              const lastVal = p.totals[p.totals.length - 1] || 0;
              const pctTotal = totalHistDemand > 0 ? (p.totalDemand / totalHistDemand * 100) : 0;
              return (
                <tr key={p.product} className={`border-b ${p.cv > 0.5 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.palette[i % COLORS.palette.length] }} />{p.product}</div></td>
                  <td className="p-2 text-right font-mono">{fmtU(p.avg)}</td>
                  <td className="p-2 text-right font-mono">{fmtU(lastVal)}</td>
                  <td className="p-2 text-right font-mono font-semibold">{fmtU(p.fcAvg)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${p.growth > 10 ? 'text-green-600' : p.growth > 0 ? 'text-amber-600' : 'text-red-600'}`}>{p.growth >= 0 ? '+' : ''}{p.growth.toFixed(1)}%</td>
                  <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.cv > 0.5 ? 'bg-red-100 text-red-700' : p.cv > 0.25 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{p.cv.toFixed(2)}</span></td>
                  <td className="p-2 text-right font-mono">{fmtU(p.reorderPoint)}</td>
                  <td className="p-2 text-right font-mono">{fmtU(p.safetyStock)}</td>
                  <td className="p-2 text-right font-mono">{pctTotal.toFixed(1)}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total ({products.length})</td>
              <td className="p-2 text-right font-mono">{fmtU(avgHistDemand)}</td>
              <td className="p-2 text-right font-mono">{fmtU(lastActual)}</td>
              <td className="p-2 text-right font-mono">{fmtU(avgForecastDemand)}</td>
              <td className={`p-2 text-right font-mono ${demandGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>{demandGrowth >= 0 ? '+' : ''}{demandGrowth.toFixed(1)}%</td>
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2 text-right font-mono">100%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div><div><CardTitle>Key Findings</CardTitle><CardDescription>Demand forecast highlights</CardDescription></div></div></CardHeader>
          <CardContent><div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">{(() => {
              const items: string[] = [];
              items.push(`Historical: ${nPeriods} periods, ${products.length} products. Avg total demand: ${fmtU(avgHistDemand)} units/period. Total: ${fmtU(totalHistDemand)} units.`);
              items.push(`Forecast (${METHOD_LABELS[S.method]}): ${S.forecastPeriods} periods, total ${fmtU(totalForecastDemand)} units. Avg ${fmtU(avgForecastDemand)}/period. Growth: ${demandGrowth >= 0 ? '+' : ''}${demandGrowth.toFixed(1)}%.`);
              if (S.avgUnitPrice > 0) items.push(`Revenue impact: ${fmtD(forecastRevenue)} forecast revenue at $${S.avgUnitPrice}/unit avg price.`);
              const fastest = productForecasts.filter(p => p.growth > 0).sort((a, b) => b.growth - a.growth)[0];
              if (fastest) items.push(`Fastest-growing product: "${fastest.product}" at +${fastest.growth.toFixed(1)}%. ${fastest.totalDemand > totalHistDemand * 0.3 ? 'Major volume driver.' : 'Monitor for capacity planning.'}`);
              const volatile = productForecasts.filter(p => p.cv > 0.5);
              if (volatile.length > 0) items.push(`High volatility: ${volatile.map(p => `"${p.product}" (CV ${p.cv.toFixed(2)})`).join(', ')}. Increase safety stock for these SKUs.`);
              else items.push('All products have stable demand patterns (CV below 0.5).');
              const biggest = productSummaries[0];
              if (biggest) items.push(`Largest volume: "${biggest.product}" at ${fmtP(biggest.totalDemand / totalHistDemand * 100)} of total demand. Peak: ${months[biggest.peakMonth]}, Trough: ${months[biggest.troughMonth]}.`);
              items.push(`Model accuracy: MAPE ${totalResult.mape.toFixed(1)}%.${totalResult.mape <= 10 ? ' Strong fit.' : totalResult.mape <= 20 ? ' Acceptable.' : ' Consider alternative method or more data.'}`);
              return items.map((text, i) => (<div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>));
            })()}</div>
          </div></CardContent>
        </Card>

        {/* Total Demand Forecast Chart */}
        <Card>
          <CardHeader><CardTitle>Total Demand Forecast — {METHOD_LABELS[S.method]}</CardTitle></CardHeader>
          <CardContent><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(chartData.length / 12) - 1)} angle={-30} textAnchor="end" height={50} />
              <YAxis tickFormatter={v => v.toLocaleString()} />
              <Tooltip formatter={(v: any) => [Number(v).toLocaleString() + ' units', '']} />
              <Legend />
              <Area dataKey="upper" type="monotone" fill={COLORS.secondary} fillOpacity={0.1} stroke="none" name={`Upper ${S.confidenceLevel}%`} />
              <Area dataKey="lower" type="monotone" fill="#fff" fillOpacity={1} stroke="none" name={`Lower ${S.confidenceLevel}%`} />
              <Line dataKey="actual" name="Actual" type="monotone" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
              <Line dataKey="fitted" name="Fitted" type="monotone" stroke={COLORS.midNavy} strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls={false} />
              <Line dataKey="forecast" name="Forecast" type="monotone" stroke={COLORS.secondary} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Product Demand Stacked */}
        <Card>
          <CardHeader><CardTitle>Demand by Product Over Time</CardTitle></CardHeader>
          <CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stackData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(stackData.length / 12) - 1)} />
              <YAxis tickFormatter={v => v.toLocaleString()} />
              <Tooltip formatter={(v: any) => [Number(v).toLocaleString() + ' units', '']} />
              <Legend />
              {productSummaries.map((p, i) => (
                <Area key={p.product} dataKey={p.product} stackId="1" type="monotone" fill={COLORS.palette[i % COLORS.palette.length]} stroke={COLORS.palette[i % COLORS.palette.length]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Seasonality Radar */}
        <Card>
          <CardHeader><CardTitle>Seasonality Index</CardTitle><CardDescription>100 = average. Above 100 = above-average demand month</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%">
            <RadarChart data={seasonRadar} outerRadius="75%">
              <PolarGrid />
              <PolarAngleAxis dataKey="month" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[60, 140]} tick={{ fontSize: 9 }} />
              <Radar dataKey="index" name="Seasonality Index" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} strokeWidth={2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Assessment */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent><div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Demand Assessment</h3></div>
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
              <p>Total demand is projected to {demandGrowth >= 0 ? 'grow' : 'decline'} by {Math.abs(demandGrowth).toFixed(1)}% over {S.forecastPeriods} periods, totaling {fmtU(totalForecastDemand)} units across {products.length} products.</p>
              <p>Inventory planning: With {S.leadTimeDays}-day lead time and {S.safetyStockDays}-day safety buffer, reorder points range from {fmtU(Math.min(...productForecasts.map(p => p.reorderPoint)))} to {fmtU(Math.max(...productForecasts.map(p => p.reorderPoint)))} units across products. {productForecasts.some(p => p.cv > 0.5) ? 'High-volatility SKUs should carry additional safety stock beyond the standard calculation.' : 'Demand is relatively stable across all SKUs.'}</p>
              <p>Seasonality analysis shows demand peaks in {months[seasonRadar.reduce((m, d, i) => d.index > seasonRadar[m].index ? i : m, 0)]} and troughs in {months[seasonRadar.reduce((m, d, i) => d.index < seasonRadar[m].index ? i : m, 0)]}. Plan inventory builds and promotional activities accordingly.</p>
            </div>
          </div></CardContent>
        </Card>
      </div>
    </div>
  );
}
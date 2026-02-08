'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingDown, Target, BookOpen, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, Upload, BarChart3, Plus, X,
  Settings2, ChevronRight, Zap, Activity, ArrowUpRight,
  ArrowDownRight, Layers, AlertTriangle, Scissors, PieChart
, CheckCircle2, Calculator} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '../../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell, Pie, PieChart as RePieChart
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CostRow {
  period: string;
  category: string;
  costType: 'fixed' | 'variable';
  amount: number;       // $K
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
  annualRevenue: number;   // $K — for cost-to-revenue ratio
}

interface CostForecastPageProps {
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

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'M' : Math.round(n).toLocaleString() + 'K'}`;
const fmtP = (n: number) => isFinite(n) ? `${n.toFixed(1)}%` : '—';
const fmtD = (n: number) => `$${Math.round(n).toLocaleString()}K`;

// ═══════════════════════════════════════════════════════════════════════════════
// FORECASTING ENGINE (same as Revenue Forecast)
// ═══════════════════════════════════════════════════════════════════════════════

function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
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

function forecastLinear(data: number[], periods: number) {
  const { slope, intercept, r2 } = linearRegression(data);
  return { forecast: Array.from({ length: periods }, (_, i) => intercept + slope * (data.length + i)), fitted: data.map((_, i) => intercept + slope * i), r2 };
}

function forecastMovingAvg(data: number[], periods: number, window: number) {
  const w = Math.min(window, data.length);
  const fitted = data.map((_, i) => { const s = Math.max(0, i - w + 1); return data.slice(s, i + 1).reduce((a, b) => a + b, 0) / (i - s + 1); });
  const buffer = [...data.slice(-w)];
  const forecast: number[] = [];
  for (let i = 0; i < periods; i++) { const v = buffer.slice(-w).reduce((a, b) => a + b, 0) / w; forecast.push(v); buffer.push(v); }
  return { forecast, fitted };
}

function forecastExpSmoothing(data: number[], periods: number, alpha: number) {
  if (data.length === 0) return { forecast: [], fitted: [] };
  const beta = 0.3;
  let level = data[0], trend = data.length > 1 ? data[1] - data[0] : 0;
  const fitted: number[] = [level];
  for (let i = 1; i < data.length; i++) {
    const nl = alpha * data[i] + (1 - alpha) * (level + trend);
    const nt = beta * (nl - level) + (1 - beta) * trend;
    level = nl; trend = nt; fitted.push(level);
  }
  return { forecast: Array.from({ length: periods }, (_, i) => level + trend * (i + 1)), fitted };
}

function forecastGrowthRate(data: number[], periods: number) {
  if (data.length < 2) return { forecast: Array(periods).fill(data[0] || 0), fitted: [...data], cagr: 0 };
  const first = data[0] || 1, last = data[data.length - 1], nn = data.length - 1;
  const cagr = (Math.pow(Math.abs(last / first), 1 / nn) - 1) * (last >= first ? 1 : -1);
  return { forecast: Array.from({ length: periods }, (_, i) => last * Math.pow(1 + cagr, i + 1)), fitted: data.map((_, i) => first * Math.pow(1 + cagr, i)), cagr: cagr * 100 };
}

function computeConfidenceBands(data: number[], fitted: number[], forecast: number[], zScore: number) {
  const residuals = data.map((d, i) => d - fitted[i]);
  const stdErr = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 1, 1));
  return forecast.map((f, i) => ({ lower: f - stdErr * zScore * Math.sqrt(1 + (i + 1) / data.length), upper: f + stdErr * zScore * Math.sqrt(1 + (i + 1) / data.length) }));
}

function runForecast(data: number[], periods: number, method: ForecastMethod, window: number, alpha: number) {
  switch (method) {
    case 'linear': return forecastLinear(data, periods);
    case 'moving_avg': return forecastMovingAvg(data, periods, window);
    case 'exp_smoothing': return forecastExpSmoothing(data, periods, alpha);
    case 'growth_rate': return forecastGrowthRate(data, periods);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

function buildSampleData(): CostRow[] {
  const cats = [
    { name: 'Payroll', type: 'fixed' as const, base: 320, growth: 4 },
    { name: 'Cloud & IT', type: 'variable' as const, base: 85, growth: 8 },
    { name: 'Marketing', type: 'variable' as const, base: 110, growth: 6 },
    { name: 'Rent & Facilities', type: 'fixed' as const, base: 60, growth: 1 },
    { name: 'R&D', type: 'variable' as const, base: 95, growth: 10 },
    { name: 'G&A', type: 'fixed' as const, base: 45, growth: 2 },
  ];
  const season = [0.92, 0.95, 1.0, 1.02, 1.03, 1.05, 0.98, 0.97, 1.04, 1.06, 1.08, 1.12];
  const rows: CostRow[] = [];
  for (let y = 0; y < 3; y++) {
    for (let m = 0; m < 12; m++) {
      cats.forEach(c => {
        const trend = c.base + (y * 12 + m) * c.growth / 12;
        const noise = (Math.random() - 0.5) * c.base * 0.08;
        rows.push({
          period: `${2022 + y}-${String(m + 1).padStart(2, '0')}`,
          category: c.name,
          costType: c.type,
          amount: Math.round(trend * (c.type === 'variable' ? season[m] : 1) + noise),
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

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY & GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  'Fixed Cost': 'Costs that remain constant regardless of activity level — rent, salaries, insurance.',
  'Variable Cost': 'Costs that change proportionally with activity — materials, commissions, cloud usage.',
  'Cost-to-Revenue Ratio': 'Total costs divided by total revenue. Lower ratio = better cost efficiency.',
  'MAPE': 'Mean Absolute Percentage Error — average forecast error as a percentage of actuals.',
  'Confidence Band': 'Range within which future costs are expected to fall at a given probability.',
  'Category Forecast': 'Independent forecast for each cost category, enabling granular budget planning.',
  'Cost Growth Rate': 'Percentage change in costs from last actual period to end of forecast horizon.'
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[80vh]"><DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Cost Forecast Glossary</DialogTitle><DialogDescription>Key terms and definitions</DialogDescription></DialogHeader><ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea></DialogContent></Dialog>
);

const ForecastGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Cost Forecast Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Prepare Data', desc: 'Upload CSV with period, category, cost_type (fixed/variable), and amount columns.' },
            { step: '2', title: 'Select Method', desc: 'Choose forecasting method. Each category is forecasted independently.' },
            { step: '3', title: 'Set Revenue', desc: 'Enter annual revenue to calculate cost-to-revenue ratio for efficiency analysis.' },
            { step: '4', title: 'Review Categories', desc: 'Examine per-category growth rates and fixed/variable composition.' },
            { step: '5', title: 'Identify Drivers', desc: 'Focus on fastest-growing categories for cost optimization opportunities.' },
            { step: '6', title: 'Export Report', desc: 'Download comprehensive cost forecast with category breakdowns.' }
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Key Formulas</h3>
            <div className="space-y-3">
              {[
                { label: 'Cost-to-Revenue', formula: 'Avg Monthly Cost × 12 / Annual Revenue', example: '$715K × 12 / $12M = 71.5%' },
              { label: 'Fixed Ratio', formula: 'Total Fixed / Total Costs × 100', example: '$5.2M / $8.6M = 60.5%' },
              { label: 'Category Growth', formula: '(Last Period / First Period - 1) × 100', example: '($162K / $82K - 1) = +97.6%' }
              ].map(({ label, formula, example }) => (
                <div key={label} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between"><span className="font-medium text-sm">{label}</span><span className="font-mono text-xs text-primary">{formula}</span></div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{example}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> Categories with &gt;20% growth and &gt;15% of total costs are prime targets for optimization. Fixed costs above 70% limit short-term flexibility.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default function CostForecastPage({ onNavigateHome }: CostForecastPageProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [pendingData, setPendingData] = useState<CostRow[]>([]);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [S, setS] = useState<Settings>({
    companyName: 'Acme Corp', forecastPeriods: 12, method: 'linear',
    movingAvgWindow: 3, smoothingAlpha: 0.3, confidenceLevel: 95, annualRevenue: 12000,
  });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // CSV upload
  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data as Record<string, any>[];
          if (rows.length < 3) throw new Error('Need at least 3 rows');
          const cols = Object.keys(rows[0]);
          const periodCol = cols.find(c => /period|date|month/i.test(c)) || cols[0];
          const catCol = cols.find(c => /category|type|department|item/i.test(c));
          const costTypeCol = cols.find(c => /cost.?type|fixed.?var|nature/i.test(c));
          const amtCol = cols.find(c => /amount|cost|spend|value/i.test(c)) || cols[cols.length - 1];
          const parsed: CostRow[] = rows.map((r, i) => ({
            period: String(r[periodCol]).trim(),
            category: catCol ? String(r[catCol]).trim() : 'Total',
            costType: (costTypeCol && /var/i.test(String(r[costTypeCol])) ? 'variable' : 'fixed') as CostRow['costType'],            amount: Math.round(parseFloat(String(r[amtCol]).replace(/[$,]/g, '')) || 0),
            sortKey: i,
          })).filter(d => d.amount > 0);
          if (parsed.length < 3) throw new Error('Need at least 3 valid rows');
          setPendingData(parsed);
          toast({ title: 'Data loaded', description: `${parsed.length} cost records from CSV.` });
        } catch (e: any) { toast({ title: 'Parse error', description: e.message, variant: 'destructive' }); }
      }
    });
  }, [toast]);

  const loadSample = useCallback(() => {
    setCostRows(buildSampleData());
    setShowIntro(false);
    toast({ title: 'Sample loaded', description: '36 months × 6 categories of cost data.' });
  }, [toast]);
  const handleStartWithData = useCallback(() => {
    if (pendingData.length > 0) { setCostRows(pendingData); setShowIntro(false); }
  }, [pendingData]);


  // ─── Aggregations ───
  const periods = useMemo(() => [...new Set(costRows.map(r => r.period))], [costRows]);
  const categories = useMemo(() => [...new Set(costRows.map(r => r.category))], [costRows]);
  const nPeriods = periods.length;

  // Total cost per period
  const periodTotals = useMemo(() => periods.map(p => ({
    period: p,
    total: costRows.filter(r => r.period === p).reduce((s, r) => s + r.amount, 0),
    fixed: costRows.filter(r => r.period === p && r.costType === 'fixed').reduce((s, r) => s + r.amount, 0),
    variable: costRows.filter(r => r.period === p && r.costType === 'variable').reduce((s, r) => s + r.amount, 0),
  })), [periods, costRows]);

  const totalCosts = useMemo(() => periodTotals.map(p => p.total), [periodTotals]);

  // Category summaries
  const catSummaries = useMemo(() => categories.map(cat => {
    const rows = costRows.filter(r => r.category === cat);
    const totals = periods.map(p => rows.filter(r => r.period === p).reduce((s, r) => s + r.amount, 0));
    const totalAmt = totals.reduce((s, v) => s + v, 0);
    const avg = nPeriods > 0 ? totalAmt / nPeriods : 0;
    const costType = rows[0]?.costType || 'fixed';
    const growth = totals.length >= 2 && totals[0] > 0 ? ((totals[totals.length - 1] / totals[0]) - 1) * 100 : 0;
    return { category: cat, costType, totals, totalAmt, avg, growth, periodCount: totals.length };
  }).sort((a, b) => b.totalAmt - a.totalAmt), [categories, costRows, periods, nPeriods]);

  // ─── Forecast (on total costs) ───
  const result = useMemo(() => {
    if (totalCosts.length < 3) return null;
    const fp = S.forecastPeriods;
    const res = runForecast(totalCosts, fp, S.method, S.movingAvgWindow, S.smoothingAlpha) as any;
    const z = S.confidenceLevel === 95 ? 1.96 : 1.28;
    const bands = computeConfidenceBands(totalCosts, res.fitted, res.forecast, z);
    const mae = totalCosts.reduce((s, v, i) => s + Math.abs(v - res.fitted[i]), 0) / totalCosts.length;
    const mape = totalCosts.reduce((s, v, i) => s + Math.abs((v - res.fitted[i]) / (v || 1)), 0) / totalCosts.length * 100;
    return { ...res, bands, mae, mape };
  }, [totalCosts, S]);

  // Category-level forecasts
  const catForecasts = useMemo(() => {
    if (!result) return [];
    return catSummaries.map(cat => {
      if (cat.totals.length < 3) return { ...cat, forecast: [], fitted: [] };
      const res = runForecast(cat.totals, S.forecastPeriods, S.method, S.movingAvgWindow, S.smoothingAlpha) as any;
      return { ...cat, forecast: res.forecast as number[], fitted: res.fitted as number[] };
    });
  }, [catSummaries, result, S]);

  // ─── Derived Metrics ───
  const totalHistorical = totalCosts.reduce((s, v) => s + v, 0);
  const totalForecast = result?.forecast.reduce((s: number, v: number) => s + v, 0) || 0;
  const lastActual = totalCosts[totalCosts.length - 1] || 0;
  const lastForecast = result?.forecast[result.forecast.length - 1] || 0;
  const costGrowth = lastActual > 0 ? ((lastForecast / lastActual) - 1) * 100 : 0;
  const avgHistorical = nPeriods > 0 ? totalHistorical / nPeriods : 0;
  const avgForecast = result ? totalForecast / S.forecastPeriods : 0;
  const totalFixed = periodTotals.reduce((s, p) => s + p.fixed, 0);
  const totalVariable = periodTotals.reduce((s, p) => s + p.variable, 0);
  const fixedPct = totalHistorical > 0 ? (totalFixed / totalHistorical) * 100 : 0;
  const costToRevenue = S.annualRevenue > 0 ? (avgHistorical * 12 / S.annualRevenue) * 100 : 0;

  // ─── Chart Data ───
  const chartData = useMemo(() => {
    if (!result) return [];
    const rows: any[] = [];
    periodTotals.forEach((p, i) => rows.push({ period: p.period, actual: p.total, fitted: Math.round(result.fitted[i]), fixed: p.fixed, variable: p.variable, type: 'historical' }));
    const lastP = periods[periods.length - 1] || '';
    const isMonthly = /^\d{4}-\d{2}$/.test(lastP);
    for (let i = 0; i < S.forecastPeriods; i++) {
      let label: string;
      if (isMonthly) { const [y, m] = lastP.split('-').map(Number); const t = y * 12 + m + i; label = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; }
      else label = `F+${i + 1}`;
      rows.push({ period: label, forecast: Math.round(result.forecast[i]), lower: Math.round(result.bands[i].lower), upper: Math.round(result.bands[i].upper), type: 'forecast' });
    }
    return rows;
  }, [periodTotals, result, periods, S.forecastPeriods]);

  // Category stacked chart data
  const stackData = useMemo(() => {
    const rows: any[] = [];
    periods.forEach(p => {
      const row: any = { period: p };
      catSummaries.forEach(cat => { row[cat.category] = costRows.filter(r => r.period === p && r.category === cat.category).reduce((s, r) => s + r.amount, 0); });
      rows.push(row);
    });
    return rows;
  }, [periods, catSummaries, costRows]);

  // ─── Exports ───
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `Cost_Forecast_${S.companyName.replace(/\s/g, '_')}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, [S.companyName]);

  const handleDownloadCSV = useCallback(() => {
    if (!result) return;
    const rows = [['Period', 'Actual', 'Fitted', 'Forecast', 'Lower', 'Upper']];
    periodTotals.forEach((p, i) => rows.push([p.period, String(p.total), String(Math.round(result.fitted[i])), '', '', '']));
    chartData.filter(d => d.type === 'forecast').forEach(d => rows.push([d.period, '', '', String(d.forecast), String(d.lower), String(d.upper)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a'); link.download = 'Cost_Forecast.csv'; link.href = URL.createObjectURL(blob); link.click();
  }, [result, periodTotals, chartData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════════════════════


  const SAMPLE_FC_CSV = `period,category,cost_type,amount\n2022-01,Payroll,fixed,315\n2022-01,Cloud & IT,variable,82\n2022-01,Marketing,variable,98\n2022-01,Rent,fixed,59\n2022-01,R&D,variable,88`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Required Data Format</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Prepare your cost data in this format before uploading</p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Structure</h4>
            <p className="text-sm text-muted-foreground">One row per category per period. Amounts in $K. cost_type and category are optional.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b"><th className="p-2 text-left font-semibold">Period</th><th className="p-2 text-right font-semibold">Category</th><th className="p-2 text-right font-semibold">Cost Type</th><th className="p-2 text-right font-semibold">Amount ($K)</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium">2022-01</td><td className="p-2 text-right font-mono">Payroll</td><td className="p-2 text-right font-mono">fixed</td><td className="p-2 text-right font-mono">315</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-01</td><td className="p-2 text-right font-mono">Cloud &amp; IT</td><td className="p-2 text-right font-mono">variable</td><td className="p-2 text-right font-mono">82</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-01</td><td className="p-2 text-right font-mono">Marketing</td><td className="p-2 text-right font-mono">variable</td><td className="p-2 text-right font-mono">98</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-02</td><td className="p-2 text-right font-mono">Payroll</td><td className="p-2 text-right font-mono">fixed</td><td className="p-2 text-right font-mono">318</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-02</td><td className="p-2 text-right font-mono">Cloud &amp; IT</td><td className="p-2 text-right font-mono">variable</td><td className="p-2 text-right font-mono">84</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Accepted Column Names</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Period</span><Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Required</Badge></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: Date, Month, Quarter</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Category</span></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: Department, Type, Item, Name</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Cost Type</span></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: Nature, Fixed/Variable. Values: fixed or variable</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Amount</span><Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Required</Badge></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: Cost, Spend, Value, Expense</p>
                    </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Column names are auto-detected. The tool will find the best match from your CSV headers.</p>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_FC_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_cost_forecast.csv'; a.click(); }}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

  if (showIntro) return (<>
    <div className="flex flex-1 items-center justify-center p-6"><Card className="w-full max-w-4xl">
      <CardHeader className="text-center"><div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><TrendingDown className="w-8 h-8 text-primary" /></div></div><CardTitle className="font-headline text-3xl">Cost Forecast</CardTitle><CardDescription className="text-base mt-2">Forecast costs by category with fixed/variable analysis and optimization insights</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">{[
          { icon: Layers, title: 'Category Breakdown', desc: 'Forecast each cost category independently' },
          { icon: Scissors, title: 'Fixed vs Variable', desc: 'Split analysis for cost optimization' },
          { icon: Target, title: 'Confidence Bands', desc: '80% or 95% prediction intervals' },
        ].map(({ icon: Icon, title, desc }) => (<Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>))}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-2 transition-all ${pendingData.length > 0 ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`} onClick={() => { if (pendingData.length === 0) document.getElementById('cf-csv-upload')?.click(); }}>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingData.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload Cost Data</CardTitle><CardDescription className="text-xs">CSV: period, category, cost_type, amount</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              {pendingData.length > 0 ? (<><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">{pendingData.length} records detected</span></div><Button onClick={handleStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start Analysis</Button><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('cf-csv-reup')?.click()}>Upload different file<input id="cf-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} /></Button></>) : (<><p className="text-sm text-muted-foreground">Upload CSV with cost data by category. At least 3 rows.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>period | category | cost_type | amount</p>
                      <p className="text-muted-foreground">e.g. 2022-01, Payroll, fixed, 315</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); setFormatGuideOpen(true); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide &amp; Sample</Button>{parseError && (<div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>)}
                    <p className="text-xs text-muted-foreground text-center">Upload your data file first, then come back here</p>
                  </>)}
              <input id="cf-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div><div><CardTitle className="text-base">Sample Cost Data</CardTitle><CardDescription className="text-xs">36 months × 6 categories (fixed + variable)</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div key="6 cost categories" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />6 cost categories</div>
                <div key="Fixed/variable split" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Fixed/variable split</div>
                <div key="Category forecasts" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Category forecasts</div>
                <div key="Cost-to-revenue ratio" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Cost-to-revenue ratio</div>
              </div>
              <Button onClick={loadSample} className="w-full" size="lg"><TrendingDown className="w-4 h-4 mr-2" />Load Sample Data</Button>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card></div>
    <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />
  </>);

  // WORKSPACE
  // ═══════════════════════════════════════════════════════════════════════════

  if (!result) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">

      {/* Header */}
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Cost Forecast</h1><p className="text-muted-foreground mt-1">{nPeriods} periods | {METHOD_LABELS[S.method]}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div></div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <ForecastGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Forecast Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><Label className="text-xs">Company</Label><Input value={S.companyName} onChange={e => setS(s => ({ ...s, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Method</Label>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full h-8 text-sm justify-between">{METHOD_LABELS[S.method]}<ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>{(Object.keys(METHOD_LABELS) as ForecastMethod[]).map(m => (<DropdownMenuItem key={m} onClick={() => setS(s => ({ ...s, method: m }))}>{METHOD_LABELS[m]}</DropdownMenuItem>))}</DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div><Label className="text-xs">Forecast Periods</Label><Input type="number" min={1} max={36} value={S.forecastPeriods} onChange={e => setS(s => ({ ...s, forecastPeriods: parseInt(e.target.value) || 6 }))} className="h-8 text-sm font-mono" /></div>
            <div><Label className="text-xs">Confidence</Label>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full h-8 text-sm justify-between">{S.confidenceLevel}%<ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent><DropdownMenuItem onClick={() => setS(s => ({ ...s, confidenceLevel: 80 }))}>80%</DropdownMenuItem><DropdownMenuItem onClick={() => setS(s => ({ ...s, confidenceLevel: 95 }))}>95%</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div><Label className="text-xs">Annual Revenue ($K)</Label><Input type="number" value={S.annualRevenue} onChange={e => setS(s => ({ ...s, annualRevenue: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
          </div>
          {S.method === 'moving_avg' && <div className="mt-3 w-48"><Label className="text-xs">Window Size</Label><Input type="number" min={2} max={12} value={S.movingAvgWindow} onChange={e => setS(s => ({ ...s, movingAvgWindow: parseInt(e.target.value) || 3 }))} className="h-8 text-sm font-mono" /></div>}
          {S.method === 'exp_smoothing' && <div className="mt-3 w-48"><Label className="text-xs">Alpha (0.1–0.9)</Label><Input type="number" min={0.1} max={0.9} step={0.1} value={S.smoothingAlpha} onChange={e => setS(s => ({ ...s, smoothingAlpha: parseFloat(e.target.value) || 0.3 }))} className="h-8 text-sm font-mono" /></div>}
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
          <h2 className="text-2xl font-bold">{S.companyName} — Cost Forecast</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {nPeriods} Periods | {categories.length} Categories | {METHOD_LABELS[S.method]}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Avg Cost/Period', value: fmtD(avgHistorical), sub: `${nPeriods} periods`, color: 'text-primary' },
            { label: 'Forecast Total', value: fmt(totalForecast), sub: `${S.forecastPeriods} periods ahead`, color: 'text-primary' },
            { label: 'Cost Growth', value: fmtP(costGrowth), sub: costGrowth > 0 ? 'Costs rising' : 'Costs declining', color: costGrowth > 10 ? 'text-red-600' : costGrowth > 0 ? 'text-amber-600' : 'text-green-600' },
            { label: 'Cost-to-Revenue', value: fmtP(costToRevenue), sub: `${fmtP(fixedPct)} fixed`, color: costToRevenue > 80 ? 'text-red-600' : costToRevenue > 60 ? 'text-amber-600' : 'text-green-600' },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} className="border-0 shadow-lg"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Category Cost Detail Table */}
        <Card>
          <CardHeader><CardTitle>Cost Category Detail</CardTitle><CardDescription>Historical average, forecast, growth, and fixed/variable classification</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Category</th>
              <th className="p-2 text-center font-semibold">Type</th>
              <th className="p-2 text-right font-semibold">Avg/Period</th>
              <th className="p-2 text-right font-semibold">Last Period</th>
              <th className="p-2 text-right font-semibold">Forecast Avg</th>
              <th className="p-2 text-right font-semibold">Growth</th>
              <th className="p-2 text-right font-semibold">% of Total</th>
            </tr></thead>
            <tbody>{catForecasts.map((cat, i) => {
              const fcAvg = cat.forecast.length > 0 ? cat.forecast.reduce((s, v) => s + v, 0) / cat.forecast.length : 0;
              const lastVal = cat.totals[cat.totals.length - 1] || 0;
              const pctTotal = totalHistorical > 0 ? (cat.totalAmt / totalHistorical * 100) : 0;
              return (
                <tr key={cat.category} className={`border-b ${cat.growth > 20 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.palette[i % COLORS.palette.length] }} />{cat.category}</div></td>
                  <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${cat.costType === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{cat.costType}</span></td>
                  <td className="p-2 text-right font-mono">{fmtD(cat.avg)}</td>
                  <td className="p-2 text-right font-mono">{fmtD(lastVal)}</td>
                  <td className="p-2 text-right font-mono font-semibold">{fmtD(fcAvg)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${cat.growth > 10 ? 'text-red-600' : cat.growth > 0 ? 'text-amber-600' : 'text-green-600'}`}>{cat.growth >= 0 ? '+' : ''}{cat.growth.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{pctTotal.toFixed(1)}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total ({categories.length})</td>
              <td className="p-2 text-center">{fmtP(fixedPct)} fixed</td>
              <td className="p-2 text-right font-mono">{fmtD(avgHistorical)}</td>
              <td className="p-2 text-right font-mono">{fmtD(lastActual)}</td>
              <td className="p-2 text-right font-mono">{fmtD(avgForecast)}</td>
              <td className={`p-2 text-right font-mono ${costGrowth > 10 ? 'text-red-600' : costGrowth > 0 ? 'text-amber-600' : 'text-green-600'}`}>{costGrowth >= 0 ? '+' : ''}{costGrowth.toFixed(1)}%</td>
              <td className="p-2 text-right font-mono">100%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div><div><CardTitle>Key Findings</CardTitle><CardDescription>Cost forecast highlights</CardDescription></div></div></CardHeader>
          <CardContent><div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">{(() => {
              const items: string[] = [];
              items.push(`Historical: ${nPeriods} periods, ${categories.length} categories. Average total cost ${fmtD(avgHistorical)}/period. Last period: ${fmtD(lastActual)}.`);
              items.push(`Forecast (${METHOD_LABELS[S.method]}): ${S.forecastPeriods} periods, total ${fmt(totalForecast)}. Average ${fmtD(avgForecast)}/period. Cost trajectory: ${costGrowth >= 0 ? '+' : ''}${costGrowth.toFixed(1)}%.`);
              items.push(`Cost structure: ${fmtP(fixedPct)} fixed / ${fmtP(100 - fixedPct)} variable. ${fixedPct > 70 ? 'High fixed cost base — limited short-term flexibility.' : fixedPct > 40 ? 'Balanced cost structure.' : 'Mostly variable — costs scale with activity.'}`);
              if (S.annualRevenue > 0) items.push(`Cost-to-revenue ratio: ${fmtP(costToRevenue)}. ${costToRevenue > 80 ? 'Margins under pressure — cost optimization critical.' : costToRevenue > 60 ? 'Moderate cost efficiency.' : 'Healthy cost structure with strong margins.'}`);
              const fastest = catForecasts.filter(c => c.growth > 0).sort((a, b) => b.growth - a.growth)[0];
              if (fastest) items.push(`Fastest-growing cost: "${fastest.category}" at +${fastest.growth.toFixed(1)}% — ${fastest.totalAmt > totalHistorical * 0.3 ? 'significant budget impact.' : 'monitor trajectory.'}`);
              const biggest = catSummaries[0];
              if (biggest) items.push(`Largest category: "${biggest.category}" at ${fmtP(biggest.totalAmt / totalHistorical * 100)} of total costs (${fmtD(biggest.avg)}/period).`);
              items.push(`Model accuracy: MAPE ${result.mape.toFixed(1)}%.${result.mape <= 5 ? ' Excellent fit.' : result.mape <= 15 ? ' Acceptable fit.' : ' Consider alternative method.'}`);
              return items.map((text, i) => (<div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>));
            })()}</div>
          </div></CardContent>
        </Card>

        {/* Total Cost Forecast Chart */}
        <Card>
          <CardHeader><CardTitle>Total Cost Forecast — {METHOD_LABELS[S.method]}</CardTitle><CardDescription>Actuals, fitted, forecast with {S.confidenceLevel}% bands</CardDescription></CardHeader>
          <CardContent><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(chartData.length / 12) - 1)} angle={-30} textAnchor="end" height={50} />
              <YAxis tickFormatter={v => `$${v}K`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
              <Legend />
              <Area dataKey="upper" type="monotone" fill={COLORS.softRed} fillOpacity={0.1} stroke="none" name={`Upper ${S.confidenceLevel}%`} />
              <Area dataKey="lower" type="monotone" fill="#fff" fillOpacity={1} stroke="none" name={`Lower ${S.confidenceLevel}%`} />
              <Line dataKey="actual" name="Actual" type="monotone" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
              <Line dataKey="fitted" name="Fitted" type="monotone" stroke={COLORS.midNavy} strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls={false} />
              <Line dataKey="forecast" name="Forecast" type="monotone" stroke={COLORS.softRed} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Cost by Category Stacked */}
        <Card>
          <CardHeader><CardTitle>Cost by Category Over Time</CardTitle></CardHeader>
          <CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stackData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(stackData.length / 12) - 1)} />
              <YAxis tickFormatter={v => `$${v}K`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
              <Legend />
              {catSummaries.map((cat, i) => (
                <Area key={cat.category} dataKey={cat.category} stackId="1" type="monotone" fill={COLORS.palette[i % COLORS.palette.length]} stroke={COLORS.palette[i % COLORS.palette.length]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Fixed vs Variable Trend */}
        <Card>
          <CardHeader><CardTitle>Fixed vs Variable Cost Trend</CardTitle></CardHeader>
          <CardContent><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={periodTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(periodTotals.length / 12) - 1)} />
              <YAxis tickFormatter={v => `$${v}K`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
              <Legend />
              <Bar dataKey="fixed" name="Fixed" stackId="a" fill={COLORS.primary} radius={[0, 0, 0, 0]} />
              <Bar dataKey="variable" name="Variable" stackId="a" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Assessment Summary */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent><div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Cost Forecast Assessment</h3></div>
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
              <p>Using {METHOD_LABELS[S.method]}, total costs are projected to {costGrowth >= 0 ? 'increase' : 'decrease'} by {Math.abs(costGrowth).toFixed(1)}% over {S.forecastPeriods} periods, reaching {fmtD(lastForecast)}/period. Total forecast spend: {fmt(totalForecast)}.</p>
              <p>The cost base is {fmtP(fixedPct)} fixed and {fmtP(100 - fixedPct)} variable across {categories.length} categories. {fixedPct > 60 ? 'The high fixed-cost structure limits short-term flexibility but provides predictability.' : 'The variable-heavy cost structure provides flexibility to scale costs with activity levels.'}</p>
              {S.annualRevenue > 0 && <p>At a cost-to-revenue ratio of {fmtP(costToRevenue)}, {costToRevenue > 80 ? 'margin pressure is significant. Focus on the fastest-growing categories for optimization.' : costToRevenue > 60 ? 'margins are moderate. Monitor variable cost categories for efficiency gains.' : 'the cost structure supports healthy margins.'}</p>}
              <p>Model MAPE of {result.mape.toFixed(1)}% indicates {result.mape <= 5 ? 'excellent' : result.mape <= 15 ? 'acceptable' : 'poor'} predictive accuracy. The {S.confidenceLevel}% confidence band at the end of the forecast ranges from {fmtD(result.bands[result.bands.length - 1]?.lower || 0)} to {fmtD(result.bands[result.bands.length - 1]?.upper || 0)}.</p>
            </div>
          </div></CardContent>
        </Card>
      </div>
    </div>
  );
}
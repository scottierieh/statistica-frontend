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
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, Upload, BarChart3, Plus, X,
  Settings2, ChevronRight, Zap, Activity, ArrowUpRight,
  ArrowDownRight, Layers, AlertTriangle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface DataPoint {
  period: string;       // "2023-01", "Q1 2024", "2024" etc
  revenue: number;      // $K
  sortKey: number;      // numeric for ordering
}

type ForecastMethod = 'linear' | 'moving_avg' | 'exp_smoothing' | 'growth_rate';

interface Settings {
  companyName: string;
  forecastPeriods: number;       // how many periods to forecast
  method: ForecastMethod;
  movingAvgWindow: number;       // for MA
  smoothingAlpha: number;        // for exp smoothing (0-1)
  confidenceLevel: number;       // 80 or 95
  seasonalAdjust: boolean;
}

interface RevenueForecastPageProps {
  onNavigateHome?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  primary: '#1e3a5f', secondary: '#0d9488', midNavy: '#2d5a8e',
  lightNavy: '#3b7cc0', softRed: '#e57373', skyBlue: '#5ba3cf',
  palette: ['#1e3a5f', '#0d9488', '#2d5a8e', '#3b7cc0', '#e57373', '#5ba3cf', '#7c9fc0', '#4db6ac'],
};

const METHOD_LABELS: Record<ForecastMethod, string> = {
  linear: 'Linear Regression',
  moving_avg: 'Moving Average',
  exp_smoothing: 'Exponential Smoothing',
  growth_rate: 'Growth Rate',
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'M' : Math.round(n).toLocaleString() + 'K'}`;

const fmtP = (n: number) => isFinite(n) ? `${n.toFixed(1)}%` : '—';
const fmtD = (n: number) => `$${Math.round(n).toLocaleString()}K`;

// ═══════════════════════════════════════════════════════════════════════════════
// FORECASTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += data[i]; sxx += i * i; sxy += i * data[i]; syy += data[i] * data[i];
  }
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  const yMean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssTot += (data[i] - yMean) ** 2;
    ssRes += (data[i] - (intercept + slope * i)) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

function forecastLinear(data: number[], periods: number): { forecast: number[]; fitted: number[]; r2: number } {
  const { slope, intercept, r2 } = linearRegression(data);
  const fitted = data.map((_, i) => intercept + slope * i);
  const forecast: number[] = [];
  for (let i = 0; i < periods; i++) forecast.push(intercept + slope * (data.length + i));
  return { forecast, fitted, r2 };
}

function forecastMovingAvg(data: number[], periods: number, window: number): { forecast: number[]; fitted: number[] } {
  const w = Math.min(window, data.length);
  const fitted = data.map((_, i) => {
    if (i < w - 1) return data.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
    return data.slice(i - w + 1, i + 1).reduce((a, b) => a + b, 0) / w;
  });
  const forecast: number[] = [];
  const buffer = [...data.slice(-w)];
  for (let i = 0; i < periods; i++) {
    const val = buffer.slice(-w).reduce((a, b) => a + b, 0) / w;
    forecast.push(val);
    buffer.push(val);
  }
  return { forecast, fitted };
}

function forecastExpSmoothing(data: number[], periods: number, alpha: number): { forecast: number[]; fitted: number[] } {
  if (data.length === 0) return { forecast: [], fitted: [] };
  const fitted: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    fitted.push(alpha * data[i] + (1 - alpha) * fitted[i - 1]);
  }
  // Double exponential (Holt) for trend
  const beta = 0.3;
  let level = data[0], trend = data.length > 1 ? data[1] - data[0] : 0;
  const holtFitted: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { holtFitted.push(level); continue; }
    const newLevel = alpha * data[i] + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel; trend = newTrend;
    holtFitted.push(level);
  }
  const forecast: number[] = [];
  for (let i = 1; i <= periods; i++) forecast.push(level + trend * i);
  return { forecast, fitted: holtFitted };
}

function forecastGrowthRate(data: number[], periods: number): { forecast: number[]; fitted: number[]; cagr: number } {
  if (data.length < 2) return { forecast: Array(periods).fill(data[0] || 0), fitted: [...data], cagr: 0 };
  const first = data[0] || 1;
  const last = data[data.length - 1];
  const n = data.length - 1;
  const cagr = (Math.pow(Math.abs(last / first), 1 / n) - 1) * (last >= first ? 1 : -1);
  const fitted = data.map((_, i) => first * Math.pow(1 + cagr, i));
  const forecast: number[] = [];
  for (let i = 1; i <= periods; i++) forecast.push(last * Math.pow(1 + cagr, i));
  return { forecast, fitted, cagr: cagr * 100 };
}

function computeConfidenceBands(data: number[], fitted: number[], forecast: number[], zScore: number) {
  const residuals = data.map((d, i) => d - fitted[i]);
  const stdErr = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 1, 1));
  return forecast.map((f, i) => {
    const width = stdErr * zScore * Math.sqrt(1 + (i + 1) / data.length);
    return { lower: f - width, upper: f + width };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

function buildSampleData(): DataPoint[] {
  const base = 800;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seasonality = [0.85, 0.88, 0.95, 1.02, 1.05, 1.08, 1.00, 0.98, 1.10, 1.12, 1.15, 1.20];
  const data: DataPoint[] = [];
  for (let y = 0; y < 3; y++) {
    for (let m = 0; m < 12; m++) {
      const trend = base + (y * 12 + m) * 12;
      const noise = (Math.random() - 0.5) * 60;
      data.push({
        period: `${2022 + y}-${String(m + 1).padStart(2, '0')}`,
        revenue: Math.round(trend * seasonality[m] + noise),
        sortKey: (2022 + y) * 100 + m + 1,
      });
    }
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY & GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  'MAPE': 'Mean Absolute Percentage Error — average forecast error as a percentage of actuals. Lower is better.',
  'MAE': 'Mean Absolute Error — average magnitude of forecast errors in original units ($K).',
  'R²': 'R-squared — proportion of variance explained by the model. 1.0 = perfect fit, 0 = no explanatory power.',
  'CAGR': 'Compound Annual Growth Rate — smoothed annualized growth rate over multiple periods.',
  'Confidence Band': 'Range within which future values are expected to fall at a given probability (80% or 95%).',
  'Linear Regression': 'Fits a straight trend line through historical data using least-squares minimization.',
  'Moving Average': 'Averages the last N periods to smooth out noise and project forward.',
  'Exponential Smoothing': 'Holt\u2019s double exponential method — weights recent observations more heavily and captures trend.',
  'Fitted Value': 'The model\u2019s estimate for a historical period — used to assess how well the model tracks actuals.'
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[80vh]"><DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Revenue Forecast Glossary</DialogTitle><DialogDescription>Key terms and definitions</DialogDescription></DialogHeader><ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea></DialogContent></Dialog>
);

const ForecastGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Revenue Forecast Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Prepare Data', desc: 'Upload CSV with period and revenue columns. At least 3 data points required.' },
            { step: '2', title: 'Select Method', desc: 'Choose from Linear Regression, Moving Average, Exponential Smoothing, or Growth Rate.' },
            { step: '3', title: 'Set Parameters', desc: 'Adjust forecast horizon, confidence level, and method-specific settings (window, alpha).' },
            { step: '4', title: 'Review Accuracy', desc: 'Check MAPE, MAE, and R² to evaluate model fit on historical data.' },
            { step: '5', title: 'Interpret Forecast', desc: 'Examine forecast values and confidence bands. Wider bands = more uncertainty.' },
            { step: '6', title: 'Export Report', desc: 'Download PNG report or CSV data with actuals, fitted, and forecast values.' }
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
                { label: 'Linear Trend', formula: 'y = a + b × t', example: 'Revenue = 800 + 12 × month' },
              { label: 'Moving Avg', formula: 'Σ(last N values) / N', example: '(900+920+950) / 3 = 923' },
              { label: 'MAPE', formula: 'Σ|actual-forecast|/actual / N × 100', example: '5.2% average error' },
              { label: 'CAGR', formula: '(End/Start)^(1/N) - 1', example: '($1.2M/$0.8M)^(1/3) - 1 = 14.5%' }
              ].map(({ label, formula, example }) => (
                <div key={label} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between"><span className="font-medium text-sm">{label}</span><span className="font-mono text-xs text-primary">{formula}</span></div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{example}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> If MAPE exceeds 15%, try a different method. Moving Average works well for volatile data, while Linear Regression suits steady trends.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default function RevenueForecastPage({ onNavigateHome }: RevenueForecastPageProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [pendingData, setPendingData] = useState<DataPoint[]>([]);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [S, setS] = useState<Settings>({
    companyName: 'Acme Corp',
    forecastPeriods: 12,
    method: 'linear',
    movingAvgWindow: 3,
    smoothingAlpha: 0.3,
    confidenceLevel: 95,
    seasonalAdjust: false,
  });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const n = dataPoints.length;

  // CSV upload
  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data as Record<string, any>[];
          if (rows.length < 3) throw new Error('Need at least 3 data points');
          const cols = Object.keys(rows[0]);
          const periodCol = cols.find(c => /period|date|month|quarter|year/i.test(c)) || cols[0];
          const revCol = cols.find(c => /revenue|sales|amount|value/i.test(c)) || cols[1];
          if (!periodCol || !revCol) throw new Error('Cannot detect period and revenue columns');
          const parsed: DataPoint[] = rows.map((r, i) => ({
            period: String(r[periodCol]).trim(),
            revenue: Math.round(parseFloat(String(r[revCol]).replace(/[$,]/g, '')) || 0),
            sortKey: i,
          })).filter(d => d.revenue > 0);
          if (parsed.length < 3) throw new Error('Need at least 3 valid data points');
          setPendingData(parsed);
          toast({ title: 'Data loaded', description: `${parsed.length} periods from CSV.` });
        } catch (e: any) {
          toast({ title: 'Parse error', description: e.message, variant: 'destructive' });
        }
      }
    });
  }, [toast]);

  const loadSample = useCallback(() => {
    setDataPoints(buildSampleData());
    setShowIntro(false);
    toast({ title: 'Sample loaded', description: '36 months of revenue data.' });
  }, [toast]);
  const handleStartWithData = useCallback(() => {
    if (pendingData.length > 0) { setDataPoints(pendingData); setShowIntro(false); }
  }, [pendingData]);


  // ─── Forecast Computation ───
  const revenues = useMemo(() => dataPoints.map(d => d.revenue), [dataPoints]);

  const result = useMemo(() => {
    if (revenues.length < 3) return null;
    const fp = S.forecastPeriods;
    let forecast: number[], fitted: number[], r2 = 0, cagr = 0;
    switch (S.method) {
      case 'linear': {
        const lr = forecastLinear(revenues, fp);
        forecast = lr.forecast; fitted = lr.fitted; r2 = lr.r2;
        break;
      }
      case 'moving_avg': {
        const ma = forecastMovingAvg(revenues, fp, S.movingAvgWindow);
        forecast = ma.forecast; fitted = ma.fitted;
        break;
      }
      case 'exp_smoothing': {
        const es = forecastExpSmoothing(revenues, fp, S.smoothingAlpha);
        forecast = es.forecast; fitted = es.fitted;
        break;
      }
      case 'growth_rate': {
        const gr = forecastGrowthRate(revenues, fp);
        forecast = gr.forecast; fitted = gr.fitted; cagr = gr.cagr;
        break;
      }
      default: forecast = []; fitted = [];
    }
    const z = S.confidenceLevel === 95 ? 1.96 : 1.28;
    const bands = computeConfidenceBands(revenues, fitted, forecast, z);
    // accuracy
    const mae = revenues.reduce((s, v, i) => s + Math.abs(v - fitted[i]), 0) / revenues.length;
    const mape = revenues.reduce((s, v, i) => s + Math.abs((v - fitted[i]) / (v || 1)), 0) / revenues.length * 100;
    return { forecast, fitted, bands, r2, cagr, mae, mape };
  }, [revenues, S]);

  // ─── Derived metrics ───
  const totalHistorical = useMemo(() => revenues.reduce((s, v) => s + v, 0), [revenues]);
  const totalForecast = useMemo(() => result?.forecast.reduce((s, v) => s + v, 0) || 0, [result]);
  const lastActual = revenues[revenues.length - 1] || 0;
  const firstForecast = result?.forecast[0] || 0;
  const lastForecast = result?.forecast[result.forecast.length - 1] || 0;
  const forecastGrowth = lastActual > 0 ? ((lastForecast / lastActual) - 1) * 100 : 0;
  const avgHistorical = n > 0 ? totalHistorical / n : 0;
  const avgForecast = result ? totalForecast / S.forecastPeriods : 0;

  // ─── Chart Data ───
  const chartData = useMemo(() => {
    if (!result) return [];
    const rows: any[] = [];
    dataPoints.forEach((d, i) => {
      rows.push({ period: d.period, actual: d.revenue, fitted: Math.round(result.fitted[i]), type: 'historical' });
    });
    // Generate forecast period labels
    const lastPeriod = dataPoints[dataPoints.length - 1]?.period || '';
    const isMonthly = /^\d{4}-\d{2}$/.test(lastPeriod);
    for (let i = 0; i < S.forecastPeriods; i++) {
      let label: string;
      if (isMonthly) {
        const [y, m] = lastPeriod.split('-').map(Number);
        const totalM = y * 12 + m + i;
        label = `${Math.floor(totalM / 12)}-${String((totalM % 12) + 1).padStart(2, '0')}`;
      } else {
        label = `F+${i + 1}`;
      }
      rows.push({
        period: label,
        forecast: Math.round(result.forecast[i]),
        lower: Math.round(result.bands[i].lower),
        upper: Math.round(result.bands[i].upper),
        type: 'forecast',
      });
    }
    return rows;
  }, [dataPoints, result, S.forecastPeriods]);

  // Residual data
  const residualData = useMemo(() => {
    if (!result) return [];
    return dataPoints.map((d, i) => ({
      period: d.period,
      residual: Math.round(d.revenue - result.fitted[i]),
      pctError: d.revenue > 0 ? ((d.revenue - result.fitted[i]) / d.revenue * 100) : 0,
    }));
  }, [dataPoints, result]);

  // Growth rates
  const growthData = useMemo(() => {
    return dataPoints.slice(1).map((d, i) => ({
      period: d.period,
      growth: dataPoints[i].revenue > 0 ? ((d.revenue / dataPoints[i].revenue) - 1) * 100 : 0,
      revenue: d.revenue,
    }));
  }, [dataPoints]);

  // ─── Exports ───
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Revenue_Forecast_${S.companyName.replace(/\s/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch {} finally { setIsDownloading(false); }
  }, [S.companyName]);

  const handleDownloadCSV = useCallback(() => {
    if (!result) return;
    const rows = [['Period', 'Actual', 'Fitted', 'Forecast', 'Lower', 'Upper']];
    dataPoints.forEach((d, i) => rows.push([d.period, String(d.revenue), String(Math.round(result.fitted[i])), '', '', '']));
    const lastPeriod = dataPoints[dataPoints.length - 1]?.period || '';
    const isMonthly = /^\d{4}-\d{2}$/.test(lastPeriod);
    result.forecast.forEach((f, i) => {
      let label: string;
      if (isMonthly) {
        const [y, m] = lastPeriod.split('-').map(Number);
        const totalM = y * 12 + m + i;
        label = `${Math.floor(totalM / 12)}-${String((totalM % 12) + 1).padStart(2, '0')}`;
      } else { label = `F+${i + 1}`; }
      rows.push([label, '', '', String(Math.round(f)), String(Math.round(result.bands[i].lower)), String(Math.round(result.bands[i].upper))]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `Revenue_Forecast.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [result, dataPoints]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════════════════════


  const SAMPLE_FC_CSV = `period,revenue\n2022-01,685\n2022-02,720\n2022-03,755\n2022-04,790\n2022-05,830\n2022-06,865\n2022-07,900\n2022-08,890\n2022-09,945\n2022-10,980\n2022-11,1020\n2022-12,1065`;

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
          <p className="text-sm text-muted-foreground">Prepare your revenue data in this format before uploading</p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Structure</h4>
            <p className="text-sm text-muted-foreground">Rows = Time periods. Two columns: period label and revenue amount in $K.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b"><th className="p-2 text-left font-semibold">Period</th><th className="p-2 text-right font-semibold">Revenue ($K)</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium">2022-01</td><td className="p-2 text-right font-mono">685</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-02</td><td className="p-2 text-right font-mono">720</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-03</td><td className="p-2 text-right font-mono">755</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-04</td><td className="p-2 text-right font-mono">790</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-05</td><td className="p-2 text-right font-mono">830</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-06</td><td className="p-2 text-right font-mono">865</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Accepted Column Names</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Period</span><Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Required</Badge></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: Date, Month, Quarter, Year</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Revenue</span><Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Required</Badge></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: Sales, Turnover, Net Revenue, Amount, Income</p>
                    </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Column names are auto-detected. The tool will find the best match from your CSV headers.</p>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_FC_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_revenue_forecast.csv'; a.click(); }}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

  if (showIntro) return (<>
    <div className="flex flex-1 items-center justify-center p-6"><Card className="w-full max-w-4xl">
      <CardHeader className="text-center"><div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><TrendingUp className="w-8 h-8 text-primary" /></div></div><CardTitle className="font-headline text-3xl">Revenue Forecast</CardTitle><CardDescription className="text-base mt-2">Forecast revenue using multiple statistical methods with confidence bands</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">{[
          { icon: TrendingUp, title: '4 Methods', desc: 'Linear, MA, Exponential Smoothing, Growth Rate' },
          { icon: Target, title: 'Confidence Bands', desc: '80% or 95% prediction intervals' },
          { icon: Activity, title: 'Accuracy Metrics', desc: 'MAPE, MAE, R² for model evaluation' },
        ].map(({ icon: Icon, title, desc }) => (<Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>))}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-2 transition-all ${pendingData.length > 0 ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`} onClick={() => { if (pendingData.length === 0) document.getElementById('rf-csv-upload')?.click(); }}>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingData.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload Revenue Data</CardTitle><CardDescription className="text-xs">CSV with period & revenue columns</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              {pendingData.length > 0 ? (<><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">{pendingData.length} periods detected</span></div><Button onClick={handleStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start Analysis</Button><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('rf-csv-reup')?.click()}>Upload different file<input id="rf-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} /></Button></>) : (<><p className="text-sm text-muted-foreground">Upload CSV with historical revenue. At least 3 periods.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>period | revenue</p>
                      <p className="text-muted-foreground">e.g. 2022-01, 685, ...</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); setFormatGuideOpen(true); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide &amp; Sample</Button>{parseError && (<div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>)}
                    <p className="text-xs text-muted-foreground text-center">Upload your data file first, then come back here</p>
                  </>)}
              <input id="rf-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div><div><CardTitle className="text-base">Sample Revenue Data</CardTitle><CardDescription className="text-xs">36 months with trend + seasonality</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div key="36 monthly periods" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />36 monthly periods</div>
                <div key="Trend + seasonality" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Trend + seasonality</div>
                <div key="4 forecast methods" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />4 forecast methods</div>
                <div key="Confidence bands" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Confidence bands</div>
              </div>
              <Button onClick={loadSample} className="w-full" size="lg"><TrendingUp className="w-4 h-4 mr-2" />Load Sample Data</Button>
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
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Revenue Forecast</h1><p className="text-muted-foreground mt-1">{n} periods | {METHOD_LABELS[S.method]}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div></div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <ForecastGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Forecast Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label className="text-xs">Company</Label><Input value={S.companyName} onChange={e => setS(s => ({ ...s, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Method</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full h-8 text-sm justify-between">{METHOD_LABELS[S.method]}<ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>{(Object.keys(METHOD_LABELS) as ForecastMethod[]).map(m => (
                  <DropdownMenuItem key={m} onClick={() => setS(s => ({ ...s, method: m }))}>{METHOD_LABELS[m]}</DropdownMenuItem>
                ))}</DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div><Label className="text-xs">Forecast Periods</Label><Input type="number" min={1} max={36} value={S.forecastPeriods} onChange={e => setS(s => ({ ...s, forecastPeriods: parseInt(e.target.value) || 6 }))} className="h-8 text-sm font-mono" /></div>
            <div><Label className="text-xs">Confidence</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full h-8 text-sm justify-between">{S.confidenceLevel}%<ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setS(s => ({ ...s, confidenceLevel: 80 }))}>80%</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setS(s => ({ ...s, confidenceLevel: 95 }))}>95%</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {S.method === 'moving_avg' && (
            <div className="mt-3 w-48"><Label className="text-xs">Window Size</Label><Input type="number" min={2} max={12} value={S.movingAvgWindow} onChange={e => setS(s => ({ ...s, movingAvgWindow: parseInt(e.target.value) || 3 }))} className="h-8 text-sm font-mono" /></div>
          )}
          {S.method === 'exp_smoothing' && (
            <div className="mt-3 w-48"><Label className="text-xs">Alpha (0.1–0.9)</Label><Input type="number" min={0.1} max={0.9} step={0.1} value={S.smoothingAlpha} onChange={e => setS(s => ({ ...s, smoothingAlpha: parseFloat(e.target.value) || 0.3 }))} className="h-8 text-sm font-mono" /></div>
          )}
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b">
          <h2 className="text-2xl font-bold">{S.companyName} — Revenue Forecast</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {n} Historical Periods | {S.forecastPeriods} Forecast | {METHOD_LABELS[S.method]}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Avg Historical', value: fmtD(avgHistorical), sub: `${n} periods`, color: 'text-primary' },
            { label: 'Forecast Total', value: fmt(totalForecast), sub: `${S.forecastPeriods} periods ahead`, color: 'text-primary' },
            { label: 'Forecast Growth', value: fmtP(forecastGrowth), sub: `Last actual → Last forecast`, color: forecastGrowth > 0 ? 'text-green-600' : forecastGrowth < 0 ? 'text-red-600' : 'text-primary' },
            { label: 'Model Accuracy', value: `${result.mape.toFixed(1)}%`, sub: `MAPE${S.method === 'linear' ? ` | R² ${result.r2.toFixed(2)}` : ''}`, color: result.mape <= 5 ? 'text-green-600' : result.mape <= 15 ? 'text-amber-600' : 'text-red-600' },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} className="border-0 shadow-lg">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Forecast Detail Table */}
        <Card>
          <CardHeader><CardTitle>Forecast Detail</CardTitle><CardDescription>Historical actuals, fitted values, and forecast with {S.confidenceLevel}% confidence bands</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Period</th>
              <th className="p-2 text-right font-semibold">Actual</th>
              <th className="p-2 text-right font-semibold">Fitted/Forecast</th>
              <th className="p-2 text-right font-semibold">Error</th>
              <th className="p-2 text-right font-semibold">Lower</th>
              <th className="p-2 text-right font-semibold">Upper</th>
              <th className="p-2 text-center font-semibold">Type</th>
            </tr></thead>
            <tbody>
              {/* Show last 6 historical */}
              {dataPoints.slice(-6).map((d, idx) => {
                const i = n - 6 + idx;
                if (i < 0) return null;
                const err = d.revenue - result.fitted[i];
                return (
                  <tr key={`h-${i}`} className="border-b">
                    <td className="p-2 font-medium">{d.period}</td>
                    <td className="p-2 text-right font-mono">{fmtD(d.revenue)}</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{fmtD(result.fitted[i])}</td>
                    <td className={`p-2 text-right font-mono ${Math.abs(err) / d.revenue > 0.1 ? 'text-red-600' : 'text-muted-foreground'}`}>{err >= 0 ? '+' : ''}{Math.round(err)}</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">—</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">—</td>
                    <td className="p-2 text-center"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">Actual</span></td>
                  </tr>);
              })}
              {/* Forecast periods */}
              {chartData.filter(d => d.type === 'forecast').map((d, i) => (
                <tr key={`f-${i}`} className="border-b bg-blue-50/30 dark:bg-blue-950/10">
                  <td className="p-2 font-medium">{d.period}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">—</td>
                  <td className="p-2 text-right font-mono font-semibold text-primary">{fmtD(d.forecast)}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">—</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{fmtD(d.lower)}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{fmtD(d.upper)}</td>
                  <td className="p-2 text-center"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Forecast</span></td>
                </tr>
              ))}
            </tbody>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Revenue forecast highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Historical: ${n} periods, average revenue ${fmtD(avgHistorical)}/period. Last actual: ${fmtD(lastActual)}.`);
                  items.push(`Forecast (${METHOD_LABELS[S.method]}): ${S.forecastPeriods} periods ahead, total ${fmt(totalForecast)}. Average forecast: ${fmtD(avgForecast)}/period.`);
                  items.push(`Growth trajectory: ${forecastGrowth >= 0 ? '+' : ''}${forecastGrowth.toFixed(1)}% from last actual to end of forecast period.${forecastGrowth > 20 ? ' Strong growth expected.' : forecastGrowth > 0 ? ' Moderate growth.' : ' Declining trend — investigate drivers.'}`);
                  items.push(`Model accuracy: MAPE ${result.mape.toFixed(1)}%${result.mape <= 5 ? ' — excellent fit.' : result.mape <= 15 ? ' — acceptable fit.' : ' — poor fit, consider alternative method.'}${S.method === 'linear' ? ` R² = ${result.r2.toFixed(3)} (${result.r2 >= 0.9 ? 'strong' : result.r2 >= 0.7 ? 'moderate' : 'weak'} explanatory power).` : ''}`);
                  if (S.method === 'growth_rate') items.push(`CAGR: ${result.cagr.toFixed(1)}% — compound annual growth rate applied to forecast.`);
                  const bandWidth = result.bands[result.bands.length - 1];
                  if (bandWidth) {
                    const spread = bandWidth.upper - bandWidth.lower;
                    const midpoint = (bandWidth.upper + bandWidth.lower) / 2;
                    items.push(`${S.confidenceLevel}% confidence band at end of forecast: ${fmtD(bandWidth.lower)} – ${fmtD(bandWidth.upper)} (${fmtP(spread / midpoint * 100)} spread). ${spread / midpoint > 0.5 ? 'Wide uncertainty — forecast far out.' : 'Reasonable confidence.'}`);
                  }
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Forecast Chart */}
        <Card>
          <CardHeader><CardTitle>Revenue Forecast — {METHOD_LABELS[S.method]}</CardTitle><CardDescription>Historical actuals, fitted model, forecast with {S.confidenceLevel}% confidence bands</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(chartData.length / 12) - 1)} angle={-30} textAnchor="end" height={50} />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <Area dataKey="upper" stackId="" type="monotone" fill={COLORS.secondary} fillOpacity={0.1} stroke="none" name={`Upper ${S.confidenceLevel}%`} />
                  <Area dataKey="lower" stackId="" type="monotone" fill="#fff" fillOpacity={1} stroke="none" name={`Lower ${S.confidenceLevel}%`} />
                  <Line dataKey="actual" name="Actual" type="monotone" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                  <Line dataKey="fitted" name="Fitted" type="monotone" stroke={COLORS.midNavy} strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls={false} />
                  <Line dataKey="forecast" name="Forecast" type="monotone" stroke={COLORS.secondary} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Period-over-Period Growth */}
        <Card>
          <CardHeader><CardTitle>Period-over-Period Growth Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(growthData.length / 12) - 1)} />
                  <YAxis tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: any, name: string) => [name === 'Growth %' ? `${Number(v).toFixed(1)}%` : `$${Number(v).toLocaleString()}K`, name]} />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
                  <Bar dataKey="growth" name="Growth %" radius={[2, 2, 0, 0]}>
                    {growthData.map((d, i) => <Cell key={i} fill={d.growth >= 0 ? COLORS.secondary : COLORS.softRed} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Residual Analysis */}
        <Card>
          <CardHeader><CardTitle>Model Residuals — Fitted vs Actual Error</CardTitle><CardDescription>Ideal: randomly distributed around zero</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={residualData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 8 }} interval={Math.max(0, Math.floor(residualData.length / 12) - 1)} />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
                  <Bar dataKey="residual" name="Residual" radius={[2, 2, 0, 0]}>
                    {residualData.map((d, i) => <Cell key={i} fill={Math.abs(d.pctError) > 10 ? COLORS.softRed : COLORS.palette[0]} fillOpacity={0.7} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Summary */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Forecast Assessment</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p>Using {METHOD_LABELS[S.method]}, the model projects {S.companyName}'s revenue to {forecastGrowth >= 0 ? 'grow' : 'decline'} by {Math.abs(forecastGrowth).toFixed(1)}% over the next {S.forecastPeriods} periods, reaching {fmtD(lastForecast)} in the final forecast period. Total forecast revenue is {fmt(totalForecast)}.</p>
                <p>Model fit: MAPE of {result.mape.toFixed(1)}% and MAE of {fmtD(result.mae)} indicate {result.mape <= 5 ? 'excellent' : result.mape <= 15 ? 'acceptable' : 'poor'} predictive accuracy on historical data. {result.mape > 15 ? 'Consider trying alternative methods or adding more data points.' : 'The model captures the underlying revenue pattern well.'}</p>
                <p>The {S.confidenceLevel}% confidence bands widen over the forecast horizon, reflecting increasing uncertainty. Decision-makers should plan for the range between {fmtD(result.bands[result.bands.length - 1]?.lower || 0)} and {fmtD(result.bands[result.bands.length - 1]?.upper || 0)} in the final period.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
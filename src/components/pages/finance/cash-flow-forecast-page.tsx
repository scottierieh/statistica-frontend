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
  Wallet, ArrowUpRight, ArrowDownRight, Layers, AlertTriangle,
  Banknote, ShieldCheck
, CheckCircle2, Calculator, Info} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ReferenceLine, Cell
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CFRow {
  period: string;
  operating: number;
  investing: number;
  financing: number;
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
  openingCash: number;       // $K
  minCashReserve: number;    // $K — safety threshold
}

interface CashFlowForecastPageProps {
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
  linear: 'Linear Regression', moving_avg: 'Moving Average',
  exp_smoothing: 'Exponential Smoothing', growth_rate: 'Growth Rate',
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  `${n < 0 ? '-' : ''}$${Math.abs(n) >= 1000 ? (Math.abs(n) / 1000).toFixed(1) + 'M' : Math.abs(Math.round(n)).toLocaleString() + 'K'}`;
const fmtP = (n: number) => isFinite(n) ? `${n.toFixed(1)}%` : '—';
const fmtD = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString()}K`;

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
      return { forecast: Array.from({ length: periods }, (_, i) => intercept + slope * (n + i)), fitted: data.map((_, i) => intercept + slope * i), r2 };
    }
    case 'moving_avg': {
      const w = Math.min(window, n);
      const fitted = data.map((_, i) => { const s = Math.max(0, i - w + 1); return data.slice(s, i + 1).reduce((a, b) => a + b, 0) / (i - s + 1); });
      const buf = [...data.slice(-w)];
      const fc: number[] = [];
      for (let i = 0; i < periods; i++) { const v = buf.slice(-w).reduce((a, b) => a + b, 0) / w; fc.push(v); buf.push(v); }
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
      return { forecast: Array.from({ length: periods }, (_, i) => level + trend * (i + 1)), fitted };
    }
    case 'growth_rate': {
      const first = data[0] || 1, last = data[n - 1];
      // For cash flow that can be negative, use additive growth instead of CAGR
      const avgGrowth = (last - first) / (n - 1);
      const fitted = data.map((_, i) => first + avgGrowth * i);
      return { forecast: Array.from({ length: periods }, (_, i) => last + avgGrowth * (i + 1)), fitted, cagr: first !== 0 ? (avgGrowth / Math.abs(first)) * 100 : 0 };
    }
  }
}

function computeBands(data: number[], fitted: number[], forecast: number[], z: number) {
  const residuals = data.map((d, i) => d - fitted[i]);
  const stdErr = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 1, 1));
  return forecast.map((f, i) => ({ lower: f - stdErr * z * Math.sqrt(1 + (i + 1) / data.length), upper: f + stdErr * z * Math.sqrt(1 + (i + 1) / data.length) }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

function buildSampleData(): CFRow[] {
  const rows: CFRow[] = [];
  for (let y = 0; y < 3; y++) {
    for (let m = 0; m < 12; m++) {
      const idx = y * 12 + m;
      const opBase = 180 + idx * 5 + (Math.random() - 0.5) * 60;
      const invBase = -(40 + idx * 1.5 + (Math.random() - 0.5) * 30);
      const finBase = idx < 6 ? 50 + (Math.random() - 0.5) * 20 : -(15 + idx * 0.8 + (Math.random() - 0.5) * 15);
      rows.push({
        period: `${2022 + y}-${String(m + 1).padStart(2, '0')}`,
        operating: Math.round(opBase),
        investing: Math.round(invBase),
        financing: Math.round(finBase),
        sortKey: (2022 + y) * 100 + m + 1,
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
  'CFO (Operating)': 'Cash from core business operations — revenue collected minus operating expenses paid.',
  'CFI (Investing)': 'Cash from buying/selling long-term assets — typically negative (capital expenditures).',
  'CFF (Financing)': 'Cash from debt and equity — borrowing, repayments, dividends, share issuance.',
  'Net Cash Flow': 'CFO + CFI + CFF — total cash generated or consumed in a period.',
  'Burn Rate': 'Average periodic cash consumption when net cash flow is negative.',
  'Runway': 'Opening cash / burn rate — how many periods until cash is depleted.',
  'Minimum Reserve': 'Target minimum cash balance to maintain for safety and operational needs.',
  'Confidence Band': 'Range within which future cash flows are expected to fall at a given probability.'
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[80vh]"><DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Cash Flow Forecast Glossary</DialogTitle><DialogDescription>Key terms and definitions</DialogDescription></DialogHeader><ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea></DialogContent></Dialog>
);

const ForecastGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Cash Flow Forecast Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Prepare Data', desc: 'Upload CSV with period, operating, investing, and financing cash flow columns.' },
            { step: '2', title: 'Set Cash Position', desc: 'Enter opening cash balance and minimum reserve threshold.' },
            { step: '3', title: 'Select Method', desc: 'Each component (CFO, CFI, CFF) is forecasted independently, then combined.' },
            { step: '4', title: 'Review Projection', desc: 'Check projected cash balance — red rows indicate periods below minimum reserve.' },
            { step: '5', title: 'Assess Runway', desc: 'If burning cash, evaluate runway and plan funding or cost reduction.' },
            { step: '6', title: 'Export Report', desc: 'Download cash flow projection with balance and component forecasts.' }
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
                { label: 'Net CF', formula: 'CFO + CFI + CFF', example: '$325K + (-$98K) + (-$48K) = $179K' },
              { label: 'Burn Rate', formula: '|Avg Net CF| (when negative)', example: '$|-45K| = $45K/month' },
              { label: 'Runway', formula: 'Opening Cash / Burn Rate', example: '$2,500K / $45K = 56 months' },
              { label: 'Cash Balance', formula: 'Prior Balance + Net CF', example: '$2,500K + $179K = $2,679K' }
              ].map(({ label, formula, example }) => (
                <div key={label} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between"><span className="font-medium text-sm">{label}</span><span className="font-mono text-xs text-primary">{formula}</span></div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{example}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> If projected cash falls below minimum reserve, consider: drawing credit facilities, delaying CapEx, accelerating receivables, or reducing discretionary spending.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default function CashFlowForecastPage({ onNavigateHome }: CashFlowForecastPageProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [pendingData, setPendingData] = useState<CFRow[]>([]);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [cfRows, setCfRows] = useState<CFRow[]>([]);
  const [S, setS] = useState<Settings>({
    companyName: 'Acme Corp', forecastPeriods: 12, method: 'linear',
    movingAvgWindow: 3, smoothingAlpha: 0.3, confidenceLevel: 95,
    openingCash: 2500, minCashReserve: 500,
  });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const nPeriods = cfRows.length;

  // CSV upload
  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data as Record<string, any>[];
          if (rows.length < 3) throw new Error('Need at least 3 periods');
          const cols = Object.keys(rows[0]);
          const periodCol = cols.find(c => /period|date|month/i.test(c)) || cols[0];
          const opCol = cols.find(c => /operat|cfo/i.test(c));
          const invCol = cols.find(c => /invest|cfi|capex/i.test(c));
          const finCol = cols.find(c => /financ|cff|debt/i.test(c));
          if (!opCol) throw new Error('Need operating cash flow column (operating/CFO)');
          const parsed: CFRow[] = rows.map((r, i) => ({
            period: String(r[periodCol]).trim(),
            operating: Math.round(parseFloat(String(r[opCol]).replace(/[$,]/g, '')) || 0),
            investing: Math.round(parseFloat(String(r[invCol || ''] || '0').replace(/[$,]/g, '')) || 0),
            financing: Math.round(parseFloat(String(r[finCol || ''] || '0').replace(/[$,]/g, '')) || 0),
            sortKey: i,
          }));
          if (parsed.length < 3) throw new Error('Need at least 3 valid periods');
          setPendingData(parsed);
          toast({ title: 'Data loaded', description: `${parsed.length} periods from CSV.` });
        } catch (e: any) { toast({ title: 'Parse error', description: e.message, variant: 'destructive' }); }
      }
    });
  }, [toast]);

  const loadSample = useCallback(() => {
    setCfRows(buildSampleData());
    setShowIntro(false);
    toast({ title: 'Sample loaded', description: '36 months of cash flow data.' });
  }, [toast]);
  const handleStartWithData = useCallback(() => {
    if (pendingData.length > 0) { setCfRows(pendingData); setShowIntro(false); }
  }, [pendingData]);


  // ─── Data Arrays ───
  const netCFs = useMemo(() => cfRows.map(r => r.operating + r.investing + r.financing), [cfRows]);
  const opCFs = useMemo(() => cfRows.map(r => r.operating), [cfRows]);
  const invCFs = useMemo(() => cfRows.map(r => r.investing), [cfRows]);
  const finCFs = useMemo(() => cfRows.map(r => r.financing), [cfRows]);

  // ─── Forecasts ───
  const z = S.confidenceLevel === 95 ? 1.96 : 1.28;

  const netResult = useMemo(() => {
    if (netCFs.length < 3) return null;
    const res = runForecast(netCFs, S.forecastPeriods, S.method, S.movingAvgWindow, S.smoothingAlpha);
    const bands = computeBands(netCFs, res.fitted, res.forecast, z);
    const mae = netCFs.reduce((s, v, i) => s + Math.abs(v - res.fitted[i]), 0) / netCFs.length;
    const mape = netCFs.reduce((s, v, i) => s + Math.abs(v !== 0 ? (v - res.fitted[i]) / v : 0), 0) / netCFs.length * 100;
    return { ...res, bands, mae, mape };
  }, [netCFs, S, z]);

  const opResult = useMemo(() => opCFs.length >= 3 ? runForecast(opCFs, S.forecastPeriods, S.method, S.movingAvgWindow, S.smoothingAlpha) : null, [opCFs, S]);
  const invResult = useMemo(() => invCFs.length >= 3 ? runForecast(invCFs, S.forecastPeriods, S.method, S.movingAvgWindow, S.smoothingAlpha) : null, [invCFs, S]);
  const finResult = useMemo(() => finCFs.length >= 3 ? runForecast(finCFs, S.forecastPeriods, S.method, S.movingAvgWindow, S.smoothingAlpha) : null, [finCFs, S]);

  // ─── Cash Balance Projection ───
  const cashProjection = useMemo(() => {
    if (!netResult) return [];
    const rows: { period: string; balance: number; netCF: number; type: string; lower?: number; upper?: number }[] = [];
    let bal = S.openingCash;
    cfRows.forEach((r, i) => {
      const net = netCFs[i];
      bal += net;
      rows.push({ period: r.period, balance: Math.round(bal), netCF: net, type: 'historical' });
    });
    netResult.forecast.forEach((fc, i) => {
      bal += fc;
      const lb = rows[rows.length - 1 - netResult.forecast.length + i + 1]?.balance || bal;
      rows.push({ period: chartLabels(i), balance: Math.round(bal), netCF: Math.round(fc), type: 'forecast',
        lower: Math.round(bal - (netResult.bands[i].upper - fc)),
        upper: Math.round(bal + (netResult.bands[i].upper - fc)),
      });
    });
    return rows;
  }, [cfRows, netCFs, netResult, S.openingCash]);

  function chartLabels(i: number): string {
    const lastP = cfRows[cfRows.length - 1]?.period || '';
    if (/^\d{4}-\d{2}$/.test(lastP)) {
      const [y, m] = lastP.split('-').map(Number);
      const t = y * 12 + m + i;
      return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
    }
    return `F+${i + 1}`;
  }

  // ─── Derived Metrics ───
  const totalHistNet = netCFs.reduce((s, v) => s + v, 0);
  const avgHistNet = nPeriods > 0 ? totalHistNet / nPeriods : 0;
  const totalForecastNet = netResult?.forecast.reduce((s, v) => s + v, 0) || 0;
  const avgForecastNet = netResult ? totalForecastNet / S.forecastPeriods : 0;
  const endingCash = cashProjection.length > 0 ? cashProjection[cashProjection.length - 1].balance : S.openingCash;
  const minProjectedCash = cashProjection.length > 0 ? Math.min(...cashProjection.map(r => r.balance)) : S.openingCash;
  const burnRate = avgHistNet < 0 ? Math.abs(avgHistNet) : 0;
  const runway = burnRate > 0 ? S.openingCash / burnRate : Infinity;
  const avgOp = nPeriods > 0 ? opCFs.reduce((s, v) => s + v, 0) / nPeriods : 0;
  const avgInv = nPeriods > 0 ? invCFs.reduce((s, v) => s + v, 0) / nPeriods : 0;
  const avgFin = nPeriods > 0 ? finCFs.reduce((s, v) => s + v, 0) / nPeriods : 0;
  const fcfMargin = avgOp !== 0 ? ((avgOp + avgInv) / avgOp) * 100 : 0;

  // ─── Chart Data ───
  const waterfallData = useMemo(() => {
    if (!netResult || !opResult || !invResult || !finResult) return [];
    const rows: any[] = [];
    cfRows.forEach((r, i) => rows.push({
      period: r.period, operating: r.operating, investing: r.investing, financing: r.financing,
      net: netCFs[i], type: 'historical',
    }));
    for (let i = 0; i < S.forecastPeriods; i++) {
      rows.push({
        period: chartLabels(i),
        operating: Math.round(opResult.forecast[i]),
        investing: Math.round(invResult.forecast[i]),
        financing: Math.round(finResult.forecast[i]),
        net: Math.round(netResult.forecast[i]),
        type: 'forecast',
      });
    }
    return rows;
  }, [cfRows, netCFs, netResult, opResult, invResult, finResult, S.forecastPeriods]);

  // ─── Exports ───
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `CashFlow_Forecast_${S.companyName.replace(/\s/g, '_')}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, [S.companyName]);

  const handleDownloadCSV = useCallback(() => {
    if (!netResult) return;
    const hdr = ['Period', 'Operating', 'Investing', 'Financing', 'Net CF', 'Cash Balance', 'Type'];
    const rows = [hdr];
    let bal = S.openingCash;
    cfRows.forEach((r, i) => { bal += netCFs[i]; rows.push([r.period, String(r.operating), String(r.investing), String(r.financing), String(netCFs[i]), String(Math.round(bal)), 'Actual']); });
    netResult.forecast.forEach((fc, i) => { bal += fc; rows.push([chartLabels(i), String(Math.round(opResult?.forecast[i] || 0)), String(Math.round(invResult?.forecast[i] || 0)), String(Math.round(finResult?.forecast[i] || 0)), String(Math.round(fc)), String(Math.round(bal)), 'Forecast']); });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a'); link.download = 'CashFlow_Forecast.csv'; link.href = URL.createObjectURL(blob); link.click();
  }, [netResult, cfRows, netCFs, opResult, invResult, finResult, S]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════════════════════


  const SAMPLE_FC_CSV = `period,operating,investing,financing\n2022-01,165,-35,55\n2022-02,172,-42,48\n2022-03,185,-38,42\n2022-04,190,-45,35\n2022-05,198,-50,30`;

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
          <p className="text-sm text-muted-foreground">Prepare your cash flow data in this format before uploading</p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Structure</h4>
            <p className="text-sm text-muted-foreground">One row per period. Amounts in $K. Investing is typically negative. Investing and financing default to 0 if missing.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b"><th className="p-2 text-left font-semibold">Period</th><th className="p-2 text-right font-semibold">Operating ($K)</th><th className="p-2 text-right font-semibold">Investing ($K)</th><th className="p-2 text-right font-semibold">Financing ($K)</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium">2022-01</td><td className="p-2 text-right font-mono">165</td><td className="p-2 text-right font-mono">-35</td><td className="p-2 text-right font-mono">55</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-02</td><td className="p-2 text-right font-mono">172</td><td className="p-2 text-right font-mono">-42</td><td className="p-2 text-right font-mono">48</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-03</td><td className="p-2 text-right font-mono">185</td><td className="p-2 text-right font-mono">-38</td><td className="p-2 text-right font-mono">42</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-04</td><td className="p-2 text-right font-mono">190</td><td className="p-2 text-right font-mono">-45</td><td className="p-2 text-right font-mono">35</td></tr>
                    <tr className="border-b"><td className="p-2 font-medium">2022-05</td><td className="p-2 text-right font-mono">198</td><td className="p-2 text-right font-mono">-50</td><td className="p-2 text-right font-mono">30</td></tr>
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
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Operating</span><Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Required</Badge></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: CFO, Operating Cash Flow</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Investing</span></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: CFI, CapEx, Capital Expenditure</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><span className="font-semibold text-sm">Financing</span></div>
                      <p className="text-xs text-muted-foreground mt-1">Also accepts: CFF, Debt, Financing Cash Flow</p>
                    </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Column names are auto-detected. The tool will find the best match from your CSV headers.</p>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_FC_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_cashflow_forecast.csv'; a.click(); }}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

  if (showIntro) return (<>
    <div className="flex flex-1 items-center justify-center p-6"><Card className="w-full max-w-4xl">
      <CardHeader className="text-center"><div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Banknote className="w-8 h-8 text-primary" /></div></div><CardTitle className="font-headline text-3xl">Cash Flow Forecast</CardTitle><CardDescription className="text-base mt-2">Forecast operating, investing, and financing cash flows with runway analysis</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">{[
          { icon: Layers, title: '3-Component', desc: 'Operating + Investing + Financing forecasted separately' },
          { icon: Wallet, title: 'Cash Runway', desc: 'Projected balance, burn rate, runway months' },
          { icon: ShieldCheck, title: 'Liquidity Guard', desc: 'Min cash reserve alerts and confidence bands' },
        ].map(({ icon: Icon, title, desc }) => (<Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>))}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-2 transition-all ${pendingData.length > 0 ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`} onClick={() => { if (pendingData.length === 0) document.getElementById('cff-csv-upload')?.click(); }}>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingData.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload Cash Flow Data</CardTitle><CardDescription className="text-xs">CSV: period, operating, investing, financing</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              {pendingData.length > 0 ? (<><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">{pendingData.length} periods detected</span></div><Button onClick={handleStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start Analysis</Button><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('cff-csv-reup')?.click()}>Upload different file<input id="cff-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} /></Button></>) : (<><p className="text-sm text-muted-foreground">Upload CSV with cash flow components. Operating is required.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>period | operating | investing | financing</p>
                      <p className="text-muted-foreground">e.g. 2022-01, 165, -35, 55</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); setFormatGuideOpen(true); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide &amp; Sample</Button>{parseError && (<div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>)}
                    <p className="text-xs text-muted-foreground text-center">Upload your data file first, then come back here</p>
                  </>)}
              <input id="cff-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div><div><CardTitle className="text-base">Sample Cash Flow Data</CardTitle><CardDescription className="text-xs">36 months — CFO, CFI, CFF</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div key="3 CF components" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />3 CF components</div>
                <div key="Balance projection" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Balance projection</div>
                <div key="Burn rate & runway" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Burn rate & runway</div>
                <div key="Reserve alerts" className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Reserve alerts</div>
              </div>
              <Button onClick={loadSample} className="w-full" size="lg"><Banknote className="w-4 h-4 mr-2" />Load Sample Data</Button>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card></div>
    <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />
  </>);

  // WORKSPACE
  // ═══════════════════════════════════════════════════════════════════════════

  if (!netResult) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">

      {/* Header */}
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Cash Flow Forecast</h1><p className="text-muted-foreground mt-1">{nPeriods} periods | {METHOD_LABELS[S.method]}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div></div>
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
            <div><Label className="text-xs">Opening Cash ($K)</Label><Input type="number" value={S.openingCash} onChange={e => setS(s => ({ ...s, openingCash: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
            <div><Label className="text-xs">Min Reserve ($K)</Label><Input type="number" value={S.minCashReserve} onChange={e => setS(s => ({ ...s, minCashReserve: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
          </div>
          {S.method === 'moving_avg' && <div className="mt-3 w-48"><Label className="text-xs">Window</Label><Input type="number" min={2} max={12} value={S.movingAvgWindow} onChange={e => setS(s => ({ ...s, movingAvgWindow: parseInt(e.target.value) || 3 }))} className="h-8 text-sm font-mono" /></div>}
          {S.method === 'exp_smoothing' && <div className="mt-3 w-48"><Label className="text-xs">Alpha</Label><Input type="number" min={0.1} max={0.9} step={0.1} value={S.smoothingAlpha} onChange={e => setS(s => ({ ...s, smoothingAlpha: parseFloat(e.target.value) || 0.3 }))} className="h-8 text-sm font-mono" /></div>}
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
          <h2 className="text-2xl font-bold">{S.companyName} — Cash Flow Forecast</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {nPeriods} Periods | {S.forecastPeriods} Forecast | {METHOD_LABELS[S.method]}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Ending Cash', value: fmtD(endingCash), sub: `Opening: ${fmtD(S.openingCash)}`, color: endingCash >= S.minCashReserve ? 'text-green-600' : 'text-red-600' },
            { label: 'Avg Net CF', value: fmtD(avgHistNet), sub: avgHistNet >= 0 ? 'Cash positive' : `Burn: ${fmtD(burnRate)}/period`, color: avgHistNet >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Runway', value: isFinite(runway) ? `${runway.toFixed(0)} periods` : '∞', sub: burnRate > 0 ? `At ${fmtD(burnRate)} burn` : 'No burn', color: runway >= 12 ? 'text-green-600' : runway >= 6 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Min Projected', value: fmtD(minProjectedCash), sub: minProjectedCash >= S.minCashReserve ? 'Above reserve' : 'Below reserve', color: minProjectedCash >= S.minCashReserve ? 'text-green-600' : 'text-red-600' },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} className="border-0 shadow-lg"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Cash Flow Detail Table */}
        <Card>
          <CardHeader><CardTitle>Cash Flow Projection</CardTitle><CardDescription>Operating, investing, financing, net CF, and cumulative cash balance</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Period</th>
              <th className="p-2 text-right font-semibold">Operating</th>
              <th className="p-2 text-right font-semibold">Investing</th>
              <th className="p-2 text-right font-semibold">Financing</th>
              <th className="p-2 text-right font-semibold">Net CF</th>
              <th className="p-2 text-right font-semibold">Cash Balance</th>
              <th className="p-2 text-center font-semibold">Status</th>
            </tr></thead>
            <tbody>
              {/* Last 6 historical */}
              {cfRows.slice(-6).map((r, idx) => {
                const i = nPeriods - 6 + idx;
                if (i < 0) return null;
                const cp = cashProjection.find(c => c.period === r.period);
                const bal = cp?.balance || 0;
                const net = netCFs[i];
                return (
                  <tr key={`h-${i}`} className="border-b">
                    <td className="p-2 font-medium">{r.period}</td>
                    <td className={`p-2 text-right font-mono ${r.operating >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(r.operating)}</td>
                    <td className={`p-2 text-right font-mono ${r.investing >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(r.investing)}</td>
                    <td className={`p-2 text-right font-mono ${r.financing >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(r.financing)}</td>
                    <td className={`p-2 text-right font-mono font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(net)}</td>
                    <td className="p-2 text-right font-mono">{fmtD(bal)}</td>
                    <td className="p-2 text-center"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">Actual</span></td>
                  </tr>);
              })}
              {/* Forecast */}
              {waterfallData.filter(d => d.type === 'forecast').map((d, i) => {
                const cp = cashProjection.find(c => c.period === d.period);
                const bal = cp?.balance || 0;
                const belowReserve = bal < S.minCashReserve;
                return (
                  <tr key={`f-${i}`} className={`border-b ${belowReserve ? 'bg-red-50/30 dark:bg-red-950/10' : 'bg-blue-50/20 dark:bg-blue-950/10'}`}>
                    <td className="p-2 font-medium">{d.period}</td>
                    <td className={`p-2 text-right font-mono ${d.operating >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(d.operating)}</td>
                    <td className={`p-2 text-right font-mono ${d.investing >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(d.investing)}</td>
                    <td className={`p-2 text-right font-mono ${d.financing >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(d.financing)}</td>
                    <td className={`p-2 text-right font-mono font-semibold ${d.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(d.net)}</td>
                    <td className={`p-2 text-right font-mono font-semibold ${belowReserve ? 'text-red-600' : ''}`}>{fmtD(bal)}</td>
                    <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${belowReserve ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{belowReserve ? 'Below Reserve' : 'Forecast'}</span></td>
                  </tr>);
              })}
            </tbody>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div><div><CardTitle>Key Findings</CardTitle><CardDescription>Cash flow forecast highlights</CardDescription></div></div></CardHeader>
          <CardContent><div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">{(() => {
              const items: string[] = [];
              items.push(`Historical: ${nPeriods} periods. Avg net CF: ${fmtD(avgHistNet)}/period (CFO ${fmtD(avgOp)}, CFI ${fmtD(avgInv)}, CFF ${fmtD(avgFin)}).`);
              items.push(`Forecast (${METHOD_LABELS[S.method]}): ${S.forecastPeriods} periods, avg net ${fmtD(avgForecastNet)}/period. Total projected: ${fmt(totalForecastNet)}.`);
              items.push(`Cash balance: Opening ${fmtD(S.openingCash)} → Ending ${fmtD(endingCash)}. ${endingCash > S.openingCash ? 'Cash position improving.' : 'Cash declining over forecast period.'}`);
              if (burnRate > 0) items.push(`Burn rate: ${fmtD(burnRate)}/period. Runway: ${isFinite(runway) ? `${runway.toFixed(0)} periods from opening cash.` : 'Infinite.'} ${runway < 6 ? 'Critical — seek funding or reduce burn.' : runway < 12 ? 'Monitor closely.' : 'Adequate runway.'}`);
              else items.push('Net cash flow positive — no burn rate. Company is self-funding.');
              if (minProjectedCash < S.minCashReserve) {
                const breachPeriods = cashProjection.filter(c => c.balance < S.minCashReserve && c.type === 'forecast');
                items.push(`Liquidity warning: ${breachPeriods.length} forecast period(s) fall below ${fmtD(S.minCashReserve)} minimum reserve. Lowest point: ${fmtD(minProjectedCash)}.`);
              } else items.push(`Cash remains above ${fmtD(S.minCashReserve)} minimum reserve throughout the forecast period.`);
              items.push(`Model accuracy: MAPE ${netResult.mape.toFixed(1)}%.${netResult.mape <= 10 ? ' Good fit for cash flow data.' : netResult.mape <= 25 ? ' Acceptable — cash flows are inherently volatile.' : ' High variance — use wider confidence bands.'}`);
              return items.map((text, i) => (<div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>));
            })()}</div>
          </div></CardContent>
        </Card>

        {/* Cash Balance Projection Chart */}
        <Card>
          <CardHeader><CardTitle>Projected Cash Balance</CardTitle><CardDescription>Cumulative balance with {S.confidenceLevel}% bands and minimum reserve line</CardDescription></CardHeader>
          <CardContent><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashProjection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(cashProjection.length / 12) - 1)} angle={-30} textAnchor="end" height={50} />
              <YAxis tickFormatter={v => `$${v}K`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
              <Legend />
              <ReferenceLine y={S.minCashReserve} stroke="#dc2626" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Min Reserve ${fmtD(S.minCashReserve)}`, fill: '#dc2626', fontSize: 10 }} />
              <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
              <Area dataKey="upper" type="monotone" fill={COLORS.secondary} fillOpacity={0.08} stroke="none" name="Upper" />
              <Area dataKey="lower" type="monotone" fill="#fff" fillOpacity={1} stroke="none" name="Lower" />
              <Line dataKey="balance" name="Cash Balance" type="monotone" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* CF Components Stacked Bar */}
        <Card>
          <CardHeader><CardTitle>Cash Flow Components — Historical &amp; Forecast</CardTitle></CardHeader>
          <CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 8 }} interval={Math.max(0, Math.floor(waterfallData.length / 12) - 1)} />
              <YAxis tickFormatter={v => `$${v}K`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
              <Legend />
              <Bar dataKey="operating" name="Operating" fill={COLORS.secondary} stackId="a" />
              <Bar dataKey="investing" name="Investing" fill={COLORS.softRed} stackId="a" />
              <Bar dataKey="financing" name="Financing" fill={COLORS.midNavy} stackId="a" />
              <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Net CF Trend */}
        <Card>
          <CardHeader><CardTitle>Net Cash Flow Trend</CardTitle></CardHeader>
          <CardContent><div className="h-[220px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 8 }} interval={Math.max(0, Math.floor(waterfallData.length / 12) - 1)} />
              <YAxis tickFormatter={v => `$${v}K`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
              <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
              <Bar dataKey="net" name="Net CF" radius={[2, 2, 0, 0]}>
                {waterfallData.map((d, i) => <Cell key={i} fill={d.net >= 0 ? COLORS.secondary : COLORS.softRed} fillOpacity={d.type === 'forecast' ? 0.6 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        {/* Assessment */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent><div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Cash Flow Assessment</h3></div>
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
              <p>{S.companyName}'s cash position is projected to {endingCash > S.openingCash ? 'grow' : 'decline'} from {fmtD(S.openingCash)} to {fmtD(endingCash)} over the next {S.forecastPeriods} periods. Average operating cash flow of {fmtD(avgOp)}/period {avgOp > 0 ? 'provides a solid foundation' : 'indicates operational cash challenges'}.</p>
              <p>Investing activities average {fmtD(avgInv)}/period, while financing flows average {fmtD(avgFin)}/period. {avgFin < 0 ? 'Net debt repayment signals deleveraging.' : 'Net financing inflows provide additional liquidity.'}</p>
              {minProjectedCash < S.minCashReserve ? <p>The projected minimum cash balance of {fmtD(minProjectedCash)} falls below the {fmtD(S.minCashReserve)} reserve target. Consider drawing on credit facilities, adjusting CapEx timing, or accelerating receivables to maintain adequate liquidity.</p> : <p>Cash remains above the {fmtD(S.minCashReserve)} minimum reserve throughout the projection, indicating adequate liquidity.</p>}
            </div>
          </div></CardContent>
        </Card>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  ComposedChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Info, Download, Loader2,
  FileSpreadsheet, ImageIcon, ChevronDown, CheckCircle,
  X, FileText, Eye, BarChart3, Activity,
  Zap, AlertTriangle, ArrowUpDown,
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
interface LeverageRow {
  period:          string;
  revenue:         number | null;
  ebit:            number | null;
  cm:              number | null;   // contribution margin (optional — for DOL via CM)
  fixedCosts:      number | null;   // optional
  // Derived
  revenueGrowth:   number | null;   // % YoY / QoQ
  ebitGrowth:      number | null;   // % YoY / QoQ
  dol:             number | null;   // Degree of Operating Leverage
  dolAlt:          number | null;   // DOL via CM/EBIT
  ebitMargin:      number | null;   // EBIT / Revenue %
  fixedCostRatio:  number | null;   // Fixed Costs / Revenue %
  sensitivity:     number | null;   // implied EBIT change for +1% revenue
}

// ─────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────
const REV_COLOR  = '#6C3AED';
const EBIT_COLOR = '#10B981';
const DOL_COLOR  = '#F59E0B';
const FC_COLOR   = '#EF4444';
const CM_COLOR   = '#3B82F6';

// ─────────────────────────────────────────────
// Risk tier
// ─────────────────────────────────────────────
function dolTier(dol: number | null): { label: string; color: string; bg: string } {
  if (dol === null) return { label: 'N/A',      color: '#94A3B8', bg: 'bg-slate-100' };
  if (dol >= 5)     return { label: 'Very High', color: '#EF4444', bg: 'bg-red-50'    };
  if (dol >= 3)     return { label: 'High',      color: '#F97316', bg: 'bg-orange-50' };
  if (dol >= 2)     return { label: 'Moderate',  color: '#F59E0B', bg: 'bg-amber-50'  };
  if (dol >= 1)     return { label: 'Low',       color: '#10B981', bg: 'bg-emerald-50'};
  return               { label: 'Negative',   color: '#6C3AED', bg: 'bg-violet-50' };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function pv(r: Record<string, any>, col: string): number | null {
  if (!col) return null;
  const v = parseFloat(r[col]);
  return isFinite(v) ? v : null;
}

function pct(a: number, b: number): number | null {
  if (!isFinite(b) || b === 0) return null;
  return parseFloat(((a / b) * 100).toFixed(2));
}

function growthRate(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null || prev === 0) return null;
  return parseFloat((((curr - prev) / Math.abs(prev)) * 100).toFixed(2));
}

function autoUnit(rows: LeverageRow[]): string {
  const max = Math.max(...rows.map(r => Math.abs(r.revenue ?? r.ebit ?? 0)));
  if (max >= 1_000_000) return 'M';
  if (max >= 1_000)     return 'K';
  return '';
}

function scl(v: number | null, unit: string): number | null {
  if (v === null) return null;
  if (unit === 'M') return parseFloat((v / 1_000_000).toFixed(2));
  if (unit === 'K') return parseFloat((v / 1_000).toFixed(2));
  return parseFloat(v.toFixed(1));
}

// ─────────────────────────────────────────────
// Build rows
// ─────────────────────────────────────────────
function buildRows(
  data: Record<string, any>[],
  periodCol: string, revCol: string, ebitCol: string,
  cmCol: string, fcCol: string,
): LeverageRow[] {
  if (!periodCol || !revCol) return [];

  const raw: LeverageRow[] = data
    .map(r => {
      const period  = String(r[periodCol] ?? '').trim();
      if (!period) return null;
      const revenue = pv(r, revCol);
      const ebit    = pv(r, ebitCol);
      const cm      = pv(r, cmCol);
      const fc      = pv(r, fcCol);
      return {
        period, revenue, ebit, cm, fixedCosts: fc,
        revenueGrowth: null, ebitGrowth: null,
        dol: null, dolAlt: null,
        ebitMargin:   ebit !== null && revenue !== null && revenue > 0
          ? parseFloat(((ebit / revenue) * 100).toFixed(2)) : null,
        fixedCostRatio: fc !== null && revenue !== null && revenue > 0
          ? parseFloat(((fc / revenue) * 100).toFixed(2)) : null,
        sensitivity: null,
      } as LeverageRow;
    })
    .filter((r): r is LeverageRow => r !== null);

  // Compute period-over-period growth & DOL
  for (let i = 1; i < raw.length; i++) {
    const curr = raw[i];
    const prev = raw[i - 1];

    curr.revenueGrowth = growthRate(curr.revenue, prev.revenue);
    curr.ebitGrowth    = growthRate(curr.ebit,    prev.ebit);

    // DOL method 1: % EBIT change / % Revenue change
    if (curr.revenueGrowth !== null && curr.ebitGrowth !== null
        && curr.revenueGrowth !== 0) {
      curr.dol = parseFloat((curr.ebitGrowth / curr.revenueGrowth).toFixed(3));
    }

    // DOL method 2 (point): CM / EBIT
    if (curr.cm !== null && curr.ebit !== null && curr.ebit !== 0) {
      curr.dolAlt = parseFloat((curr.cm / curr.ebit).toFixed(3));
    } else if (prev.cm !== null && prev.ebit !== null && prev.ebit !== 0) {
      curr.dolAlt = parseFloat((prev.cm / prev.ebit).toFixed(3));
    }

    // Use dolAlt as primary if dol is noisy (|revenue growth| < 0.5%)
    const bestDol = (curr.revenueGrowth !== null && Math.abs(curr.revenueGrowth) >= 0.5)
      ? curr.dol : curr.dolAlt;

    curr.sensitivity = bestDol !== null
      ? parseFloat(bestDol.toFixed(3)) : null;
  }

  // First row: only dolAlt available
  if (raw.length > 0) {
    const first = raw[0];
    if (first.cm !== null && first.ebit !== null && first.ebit !== 0)
      first.dolAlt = parseFloat((first.cm / first.ebit).toFixed(3));
  }

  return raw;
}

// ─────────────────────────────────────────────
// Sensitivity simulation  — for latest period
// ─────────────────────────────────────────────
interface SimPoint {
  revChange:   number;   // % change in revenue
  ebitChange:  number;   // implied % change in EBIT
  impliedEbit: number;   // actual EBIT value
}

function buildSimulation(
  baseRevenue: number, baseEbit: number, dol: number, unit: string,
): SimPoint[] {
  const steps = [-30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30];
  return steps.map(pct => {
    const ebitChg = pct * dol;
    const newEbit  = baseEbit * (1 + ebitChg / 100);
    return {
      revChange:   pct,
      ebitChange:  parseFloat(ebitChg.toFixed(2)),
      impliedEbit: parseFloat((scl(newEbit, unit) ?? newEbit).toFixed(2)),
    };
  });
}

// ─────────────────────────────────────────────
// Example data
// ─────────────────────────────────────────────
function generateExample(): Record<string, any>[] {
  const quarters = [
    '2022Q1','2022Q2','2022Q3','2022Q4',
    '2023Q1','2023Q2','2023Q3','2023Q4',
    '2024Q1','2024Q2','2024Q3','2024Q4',
  ];
  let rev = 2000, fc = 600, vcR = 0.52;
  return quarters.map(q => {
    rev = parseFloat((rev * (1 + 0.04 + (Math.random() - 0.4) * 0.05)).toFixed(1));
    vcR = Math.max(0.44, Math.min(0.60, vcR + (Math.random() - 0.52) * 0.015));
    fc  = parseFloat((fc  * (1 + 0.008 + (Math.random() - 0.5) * 0.01)).toFixed(1));
    const vc   = parseFloat((rev * vcR).toFixed(1));
    const cm   = parseFloat((rev - vc).toFixed(1));
    const ebit = parseFloat((cm - fc).toFixed(1));
    return { period: q, revenue: rev, ebit, cm, fixed_costs: fc };
  });
}

// ─────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────
const GenTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[170px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any, i: number) => (
          <div key={i} className="flex justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-mono font-semibold text-slate-700">
              {typeof p.value === 'number'
                ? `${p.value.toFixed(2)}${unit}` : p.value}
            </span>
          </div>
        ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// DOL Risk Badge
// ─────────────────────────────────────────────
const DolBadge = ({ dol }: { dol: number | null }) => {
  const t = dolTier(dol);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border
      ${t.bg}`}
      style={{ color: t.color, borderColor: t.color + '40' }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
      {t.label}
    </span>
  );
};

// ─────────────────────────────────────────────
// Intro Page
// ─────────────────────────────────────────────
const IntroPage = ({ onLoadExample }: { onLoadExample: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Zap className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Operating Leverage</CardTitle>
        <CardDescription className="text-base mt-2">
          Measure the elasticity of operating profit to revenue changes —
          quantify how a 1% shift in revenue translates to EBIT impact across periods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Zap className="w-6 h-6 text-primary mb-2" />,
              title: 'Degree of Operating Leverage',
              desc:  'DOL = % Change in EBIT ÷ % Change in Revenue. Or equivalently CM ÷ EBIT. Measures how much EBIT amplifies a given revenue change — both up and down.' },
            { icon: <ArrowUpDown className="w-6 h-6 text-primary mb-2" />,
              title: 'Revenue–EBIT Sensitivity',
              desc:  'Simulate the implied EBIT impact across a range of revenue scenarios (−30% to +30%). Understand asymmetric risk under different volume assumptions.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Leverage Trend',
              desc:  'Track DOL over time. Rising leverage as a company scales is normal — but persistently high DOL near break-even signals elevated earnings volatility risk.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Info className="w-5 h-5" />Required Columns
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div className="space-y-2">
              {[
                ['period *',          'Fiscal period — year or quarter, sorted chronologically'],
                ['revenue *',         'Total revenue / net sales'],
                ['ebit *',            'Operating profit (EBIT) — required for DOL calculation'],
                ['contribution_margin','CM = Revenue − Variable Costs (enables CM/EBIT method)'],
                ['fixed_costs',       'Fixed cost base (for fixed cost ratio trend)'],
              ].map(([col, desc]) => (
                <div key={col as string} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>{col as string}</strong> — {desc as string}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 mb-1">What you get</p>
              {[
                'DOL trend — period-over-period operating leverage',
                'Revenue growth vs EBIT growth rate comparison',
                'Revenue & EBIT level chart with margin overlay',
                'Sensitivity simulation: EBIT impact at −30% to +30% revenue',
                'Fixed cost ratio trend (if fixed_costs mapped)',
                'Risk-tiered DOL table — Very High / High / Moderate / Low',
                'Insights on leverage trend, risk concentration, and inflection points',
              ].map(s => (
                <div key={s} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">DOL Risk Tiers</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Very High (≥5×)', color: '#EF4444', bg: 'bg-red-50' },
                { label: 'High (3–5×)',     color: '#F97316', bg: 'bg-orange-50' },
                { label: 'Moderate (2–3×)', color: '#F59E0B', bg: 'bg-amber-50' },
                { label: 'Low (1–2×)',      color: '#10B981', bg: 'bg-emerald-50' },
                { label: 'Negative',        color: '#6C3AED', bg: 'bg-violet-50' },
              ].map(t => (
                <span key={t.label}
                  className={`text-xs font-semibold px-2 py-0.5 rounded border ${t.bg}`}
                  style={{ color: t.color, borderColor: t.color + '40' }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Zap className="mr-2 h-5 w-5" />Load Example Data
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function OperatingLeveragePage({
  data, allHeaders, numericHeaders,
  fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ────────────────────────────────────────
  const [periodCol, setPeriodCol] = useState('');
  const [revCol,    setRevCol]    = useState('');
  const [ebitCol,   setEbitCol]   = useState('');
  const [cmCol,     setCmCol]     = useState('');
  const [fcCol,     setFcCol]     = useState('');

  // ── UI ────────────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Auto-detect ───────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['period','year','quarter','date','fiscal'],                             setPeriodCol, periodCol);
    detect(['revenue','sales','net_sales','total_revenue','net_revenue'],           setRevCol,    revCol);
    detect(['ebit','operating_income','operating_profit','op_income'],              setEbitCol,   ebitCol);
    detect(['cm','contribution_margin','gross_profit','gross profit'],              setCmCol,     cmCol);
    detect(['fixed_costs','fixed_cost','fc','overhead','fixed'],                   setFcCol,     fcCol);
  }, [hasData, allHeaders]);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExample();
    onExampleLoaded?.(rows, 'example_operating_leverage.csv');
    setPeriodCol('period'); setRevCol('revenue'); setEbitCol('ebit');
    setCmCol('cm'); setFcCol('fixed_costs');
  }, [onExampleLoaded]);

  // ── Build rows ────────────────────────────────────────────
  const rows = useMemo(
    () => buildRows(data, periodCol, revCol, ebitCol, cmCol, fcCol),
    [data, periodCol, revCol, ebitCol, cmCol, fcCol],
  );

  const unit = useMemo(() => autoUnit(rows), [rows]);

  // scaled rows for charts
  const chartRows = useMemo(() =>
    rows.map(r => ({
      ...r,
      revenueS:    scl(r.revenue,     unit),
      ebitS:       scl(r.ebit,        unit),
      cmS:         scl(r.cm,          unit),
      dolDisplay:  r.dolAlt ?? r.dol,     // prefer CM/EBIT method for display
      dolBar:      r.dolAlt ?? r.dol,     // alias for Bar (avoids Bar+Line duplicate)
    })),
    [rows, unit],
  );

  // ── Simulation ────────────────────────────────────────────
  const lastRow = rows[rows.length - 1] ?? null;
  const simDol  = lastRow?.dolAlt ?? lastRow?.dol ?? null;
  const simData = useMemo(() => {
    if (!lastRow?.revenue || !lastRow?.ebit || simDol === null) return [];
    return buildSimulation(lastRow.revenue, lastRow.ebit, simDol, unit);
  }, [lastRow, simDol, unit]);

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!rows.length) return null;
    const last   = rows[rows.length - 1];
    const first  = rows[0];
    const dolVals = chartRows.map(r => r.dolDisplay).filter((v): v is number => v !== null && isFinite(v));
    const avgDol  = dolVals.length ? dolVals.reduce((a, b) => a + b, 0) / dolVals.length : null;
    const maxDol  = dolVals.length ? Math.max(...dolVals) : null;
    const minDol  = dolVals.length ? Math.min(...dolVals) : null;
    const highRiskPeriods = chartRows.filter(r => (r.dolDisplay ?? 0) >= 3).length;
    return { last, first, avgDol, maxDol, minDol, highRiskPeriods, periods: rows.length };
  }, [rows, chartRows]);

  const isConfigured    = rows.length > 0;
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Handlers ─────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setRevCol(''); setEbitCol(''); setCmCol(''); setFcCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  const handleDownloadCSV = useCallback(() => {
    if (!rows.length) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `OperatingLeverage_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [rows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link   = document.createElement('a');
      link.download = `OperatingLeverage_${new Date().toISOString().split('T')[0]}.png`;
      link.href     = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  if (!hasData) return <IntroPage onLoadExample={handleLoadExample} />;

  const latestDol   = lastRow ? (lastRow.dolAlt ?? lastRow.dol) : null;
  const latestTier  = dolTier(latestDol);

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
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => setPreviewOpen(true)} title="Preview data"><Eye className="h-4 w-4" /></Button>
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
            onClick={handleClearAll} title="Close"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Data Preview Modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />{displayFileName}
              <span className="text-xs text-muted-foreground font-normal">
                — {data.length.toLocaleString()} rows · {allHeaders.length} columns
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0 rounded-md border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  {allHeaders.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
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

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 4</span>
            <span className="text-xs text-muted-foreground">Financial Analysis</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />Operating Leverage
          </CardTitle>
          <CardDescription>
            Degree of Operating Leverage (DOL) — revenue-to-EBIT elasticity,
            sensitivity simulation, and leverage risk trend across periods.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Map period, revenue, and EBIT columns. Contribution margin enables the CM/EBIT DOL method.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { label: 'PERIOD *',               value: periodCol, setter: setPeriodCol, headers: allHeaders,     opt: false },
              { label: 'REVENUE *',              value: revCol,    setter: setRevCol,    headers: numericHeaders, opt: false },
              { label: 'EBIT *',                 value: ebitCol,   setter: setEbitCol,   headers: numericHeaders, opt: false },
              { label: 'CONTRIBUTION MARGIN',    value: cmCol,     setter: setCmCol,     headers: numericHeaders, opt: true  },
              { label: 'FIXED COSTS',            value: fcCol,     setter: setFcCol,     headers: numericHeaders, opt: true  },
            ].map(({ label, value, setter, headers, opt }) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-7"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {opt && <SelectItem value="__none__">— None —</SelectItem>}
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
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
                <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Leverage Metrics)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest DOL</div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold font-mono text-slate-800">
                {latestDol !== null ? `${latestDol.toFixed(2)}×` : '—'}
              </span>
            </div>
            <DolBadge dol={latestDol} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avg DOL</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.avgDol !== null ? `${stats.avgDol.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              across {stats.periods} periods
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Peak DOL</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.maxDol !== null ? `${stats.maxDol.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.highRiskPeriods} period{stats.highRiskPeriods !== 1 ? 's' : ''} at High/Very High risk
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">EBIT Margin (Latest)</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.last.ebitMargin !== null ? `${stats.last.ebitMargin.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.last.ebitMargin !== null
                ? stats.last.ebitMargin >= 15 ? 'Healthy operating margin'
                : stats.last.ebitMargin >=  8 ? 'Adequate'
                : stats.last.ebitMargin >=  0 ? 'Thin — high DOL sensitivity'
                : 'Operating at a loss'
                : 'EBIT not mapped'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Revenue & EBIT levels + EBIT Margin ── */}
        {isConfigured && chartRows.some(r => r.revenueS !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue &amp; EBIT</CardTitle>
              <CardDescription>
                Violet bars = Revenue · Green bars = EBIT ·
                Black line = EBIT Margin % (right axis){unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis yAxisId="val" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GenTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar yAxisId="val" dataKey="revenueS" name="Revenue" fill={REV_COLOR}  fillOpacity={0.7} maxBarSize={28} radius={[3,3,0,0]} />
                  <Bar yAxisId="val" dataKey="ebitS"    name="EBIT"    fill={EBIT_COLOR} fillOpacity={0.85} maxBarSize={28} radius={[3,3,0,0]} />
                  <Line yAxisId="pct" dataKey="ebitMargin" name="EBIT Margin %"
                    stroke="#1E293B" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#1E293B' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: DOL trend ── */}
        {isConfigured && chartRows.some(r => r.dolDisplay !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Degree of Operating Leverage (DOL)</CardTitle>
              <CardDescription>
                Amber line = DOL (CM/EBIT or % EBIT change / % Revenue change) ·
                Color-coded risk zones: red ≥5× · orange ≥3× · amber ≥2× · green ≥1×
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(1)}×`} />
                  <Tooltip content={<GenTooltip unit="×" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={5} stroke="#EF4444" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: '5× Very High', position: 'right', fontSize: 9, fill: '#EF4444' }} />
                  <ReferenceLine y={3} stroke="#F97316" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: '3× High',      position: 'right', fontSize: 9, fill: '#F97316' }} />
                  <ReferenceLine y={2} stroke="#F59E0B" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: '2× Moderate',  position: 'right', fontSize: 9, fill: '#F59E0B' }} />
                  <ReferenceLine y={1} stroke="#10B981" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: '1× Low',        position: 'right', fontSize: 9, fill: '#10B981' }} />
                  <Bar dataKey="dolBar" name="DOL" maxBarSize={24} radius={[2,2,0,0]}>
                    {chartRows.map((r, i) => {
                      const tier = dolTier(r.dolDisplay);
                      return <Cell key={i} fill={tier.color} fillOpacity={0.75} />;
                    })}
                  </Bar>
                  <Line dataKey="dolDisplay" name="DOL trend" stroke={DOL_COLOR} strokeWidth={2}
                    dot={{ r: 2.5, fill: DOL_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: Revenue growth vs EBIT growth ── */}
        {isConfigured && chartRows.some(r => r.revenueGrowth !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue Growth vs EBIT Growth</CardTitle>
              <CardDescription>
                Violet bars = Revenue growth % · Green bars = EBIT growth % ·
                Gap between bars = leverage amplification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GenTooltip unit="%" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="revenueGrowth" name="Revenue Growth %" fill={REV_COLOR}  fillOpacity={0.75} maxBarSize={24} radius={[2,2,0,0]} />
                  <Bar dataKey="ebitGrowth"    name="EBIT Growth %"    fill={EBIT_COLOR} fillOpacity={0.75} maxBarSize={24} radius={[2,2,0,0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Sensitivity simulation ── */}
        {isConfigured && simData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                EBIT Sensitivity Simulation — {lastRow?.period}
              </CardTitle>
              <CardDescription>
                Implied EBIT at revenue −30% to +30% based on DOL {simDol?.toFixed(2)}×{unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={simData} margin={{ top: 4, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="revChange" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={v => `${v}%`}
                    label={{ value: 'Revenue Change %', position: 'insideBottom', offset: -8, fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as SimPoint;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[170px]">
                          <p className="font-semibold text-slate-700 mb-1.5">Revenue {label}%</p>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">EBIT change</span>
                            <span className={`font-mono font-bold ${d.ebitChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {d.ebitChange >= 0 ? '+' : ''}{d.ebitChange.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Implied EBIT</span>
                            <span className="font-mono font-semibold">{d.impliedEbit.toFixed(2)}{unit}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1.5} />
                  <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 3" strokeWidth={1} />
                  <Bar dataKey="impliedEbit" name="Implied EBIT" maxBarSize={28} radius={[2,2,0,0]}>
                    {simData.map((d, i) => (
                      <Cell key={i}
                        fill={d.impliedEbit >= 0 ? EBIT_COLOR : FC_COLOR}
                        fillOpacity={Math.abs(d.revChange) === 0 ? 1 : 0.75} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 5: Fixed cost ratio (if available) ── */}
        {isConfigured && chartRows.some(r => r.fixedCostRatio !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fixed Cost Ratio &amp; EBIT Margin</CardTitle>
              <CardDescription>
                Red area = Fixed Costs / Revenue % · Green line = EBIT Margin %
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GenTooltip unit="%" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area dataKey="fixedCostRatio" name="Fixed Cost Ratio %"
                    stroke={FC_COLOR} fill={FC_COLOR} fillOpacity={0.12} strokeWidth={2}
                    dot={false} connectNulls />
                  <Line dataKey="ebitMargin" name="EBIT Margin %"
                    stroke={EBIT_COLOR} strokeWidth={2.5}
                    dot={{ r: 2.5, fill: EBIT_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── DOL Table ── */}
        {isConfigured && rows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Operating Leverage Table
              </CardTitle>
              <CardDescription>Period-by-period metrics — newest first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {[
                        'Period', 'Revenue', 'EBIT', 'EBIT Margin',
                        'Rev Growth', 'EBIT Growth', 'DOL',
                        ...(rows.some(r => r.dolAlt !== null) ? ['DOL (CM/EBIT)'] : []),
                        ...(rows.some(r => r.fixedCostRatio !== null) ? ['FC Ratio'] : []),
                        'Risk',
                      ].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows].reverse().map((r, i) => {
                      const displayDol = r.dolAlt ?? r.dol;
                      const tier = dolTier(displayDol);
                      return (
                        <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.revenue !== null ? `${scl(r.revenue, unit)?.toFixed(1)}${unit}` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.ebit !== null ? `${scl(r.ebit, unit)?.toFixed(1)}${unit}` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.ebitMargin !== null ? `${r.ebitMargin.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.revenueGrowth !== null
                              ? <span className={r.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                  {r.revenueGrowth >= 0 ? '+' : ''}{r.revenueGrowth.toFixed(1)}%
                                </span>
                              : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {r.ebitGrowth !== null
                              ? <span className={r.ebitGrowth >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                                  {r.ebitGrowth >= 0 ? '+' : ''}{r.ebitGrowth.toFixed(1)}%
                                </span>
                              : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {r.dol !== null ? `${r.dol.toFixed(2)}×` : '—'}
                          </td>
                          {rows.some(p => p.dolAlt !== null) && (
                            <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                              {r.dolAlt !== null ? `${r.dolAlt.toFixed(2)}×` : '—'}
                            </td>
                          )}
                          {rows.some(p => p.fixedCostRatio !== null) && (
                            <td className="px-3 py-2 font-mono text-xs text-slate-700">
                              {r.fixedCostRatio !== null ? `${r.fixedCostRatio.toFixed(1)}%` : '—'}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <DolBadge dol={displayDol} />
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
        {isConfigured && stats && (() => {
          const { last, first, avgDol, maxDol, highRiskPeriods } = stats;
          const displayDol = last.dolAlt ?? last.dol;
          const tier = dolTier(displayDol);

          // DOL trend direction
          const dolVals = chartRows
            .map(r => r.dolDisplay)
            .filter((v): v is number => v !== null && isFinite(v));
          const dolTrend = dolVals.length >= 4
            ? dolVals.slice(-3).reduce((a, b) => a + b, 0) / 3
              - dolVals.slice(0, 3).reduce((a, b) => a + b, 0) / 3
            : null;

          // Inflection: period where EBIT growth decoupled most from rev growth
          const maxDecoupled = [...rows]
            .filter(r => r.revenueGrowth !== null && r.ebitGrowth !== null)
            .reduce((best, r) => {
              const gap = Math.abs((r.ebitGrowth ?? 0) - (r.revenueGrowth ?? 0));
              const bestGap = Math.abs((best?.ebitGrowth ?? 0) - (best?.revenueGrowth ?? 0));
              return gap > bestGap ? r : best;
            }, rows.find(r => r.revenueGrowth !== null) ?? rows[0]);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights
                </CardTitle>
                <CardDescription>Auto-generated operating leverage analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Overview</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stats.periods} periods analyzed ({first.period} → {last.period}).
                    Latest DOL: <span className="font-semibold">{displayDol?.toFixed(2) ?? '—'}×</span> ({tier.label} risk).
                    {avgDol !== null && <> Average DOL: <span className="font-semibold">{avgDol.toFixed(2)}×</span>.</>}
                    {highRiskPeriods > 0 && <> <span className="font-semibold text-orange-600">{highRiskPeriods} period{highRiskPeriods > 1 ? 's' : ''}</span> at High or Very High leverage risk.</>}
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Analysis</p>

                  {/* Current DOL interpretation */}
                  {displayDol !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Current Leverage — {displayDol.toFixed(2)}× ({tier.label})
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {displayDol >= 5
                            ? `DOL of ${displayDol.toFixed(2)}× is very high. A 1% change in revenue produces a ${displayDol.toFixed(2)}% change in EBIT — earnings are extremely sensitive to volume fluctuations. This level typically occurs when a company is operating close to its break-even point or has a very high fixed cost base. Strong revenue growth is amplified powerfully, but any revenue decline will compress profits disproportionately.`
                            : displayDol >= 3
                            ? `DOL of ${displayDol.toFixed(2)}× is high. Each 1% revenue shift drives roughly ${displayDol.toFixed(1)}% EBIT movement. The business has meaningful operating leverage — well positioned to benefit from volume growth, but exposed to significant profit volatility in downturns.`
                            : displayDol >= 2
                            ? `DOL of ${displayDol.toFixed(2)}× is moderate. Revenue changes are amplified approximately ${displayDol.toFixed(1)}× at the EBIT level. The business has a healthy balance between fixed and variable cost structure.`
                            : displayDol >= 1
                            ? `DOL of ${displayDol.toFixed(2)}× is low — close to 1:1 revenue-to-EBIT sensitivity. The cost structure is relatively variable, which limits earnings amplification on upside but provides downside protection.`
                            : `DOL is ${displayDol.toFixed(2)}× — negative leverage signals that EBIT is moving in the opposite direction to revenue, which may indicate operational issues or a cost structure that is growing faster than revenue.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Trend */}
                  {dolTrend !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Leverage Trend — {dolTrend > 0.3 ? 'Rising' : dolTrend < -0.3 ? 'Falling' : 'Stable'}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {dolTrend > 0.3
                            ? `Operating leverage has been rising over recent periods. This often accompanies revenue scaling past a high fixed-cost threshold, but may also indicate that fixed costs are growing faster than the business is scaling. Monitor whether EBIT margins are expanding alongside DOL — rising DOL with expanding margins is healthy; rising DOL with flat margins signals cost pressure.`
                            : dolTrend < -0.3
                            ? `Operating leverage has been declining. This is typically a positive signal — either the business is expanding revenue faster than its fixed cost base, or it has shifted toward a more variable cost structure. Falling DOL reduces earnings volatility and improves downside resilience.`
                            : `Operating leverage has been broadly stable over recent periods, suggesting a consistent cost structure and predictable revenue-to-profit conversion ratio.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Peak decoupling event */}
                  {maxDecoupled && maxDecoupled.ebitGrowth !== null && maxDecoupled.revenueGrowth !== null
                    && Math.abs(maxDecoupled.ebitGrowth - maxDecoupled.revenueGrowth) > 5 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Peak Amplification — {maxDecoupled.period}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {`The largest revenue-EBIT decoupling occurred in ${maxDecoupled.period}: revenue grew ${maxDecoupled.revenueGrowth >= 0 ? '+' : ''}${maxDecoupled.revenueGrowth.toFixed(1)}% while EBIT moved ${maxDecoupled.ebitGrowth >= 0 ? '+' : ''}${maxDecoupled.ebitGrowth.toFixed(1)}% — a ${Math.abs(maxDecoupled.ebitGrowth - maxDecoupled.revenueGrowth).toFixed(1)}pp gap. `}
                          {maxDecoupled.ebitGrowth > maxDecoupled.revenueGrowth
                            ? `This positive amplification demonstrates leverage working in the company's favor — fixed cost absorption over a growing revenue base drove disproportionate profit growth.`
                            : `This negative amplification suggests that fixed costs or one-time charges caused EBIT to underperform revenue growth — worth investigating for structural cost issues.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sensitivity callout */}
                  {simData.length > 0 && simDol !== null && lastRow?.ebit !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Downside Sensitivity — {lastRow.period}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {(() => {
                            const down10 = simData.find(d => d.revChange === -10);
                            const down20 = simData.find(d => d.revChange === -20);
                            if (!down10 || !down20) return null;
                            return `At current DOL of ${simDol.toFixed(2)}×, a 10% revenue decline would reduce EBIT by approximately ${Math.abs(down10.ebitChange).toFixed(1)}% (to ${down10.impliedEbit.toFixed(1)}${unit}). A 20% revenue decline would compress EBIT by ${Math.abs(down20.ebitChange).toFixed(1)}% (to ${down20.impliedEbit.toFixed(1)}${unit}). ${down20.impliedEbit < 0 ? 'A 20% revenue shock would push the business into an operating loss — significant downside risk.' : 'The business remains EBIT-positive in both scenarios.'}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ DOL (period-over-period) = % EBIT Change ÷ % Revenue Change.
                  DOL (point estimate) = Contribution Margin ÷ EBIT.
                  Higher DOL amplifies both upside and downside. Sensitivity simulation assumes linear cost structure.
                  This analysis is for reference only and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
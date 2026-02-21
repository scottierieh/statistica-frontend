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
  Target, Zap, AlertTriangle,
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
interface PeriodRow {
  period:          string;
  revenue:         number | null;
  variableCosts:   number | null;
  fixedCosts:      number | null;
  // derived
  contributionMargin:     number | null;  // Revenue - Variable Costs
  cmRatio:                number | null;  // CM / Revenue %
  bepRevenue:             number | null;  // Fixed Costs / CM Ratio
  bepUnits:               number | null;  // Fixed Costs / CM per unit (if price+vc/unit given)
  marginOfSafety:         number | null;  // (Revenue - BEP Revenue) / Revenue %
  operatingLeverage:      number | null;  // CM / EBIT
  ebit:                   number | null;  // Revenue - VC - FC
  // for chart stacking
  vcStack:                number | null;
  fcStack:                number | null;
  profitStack:            number | null;
}

// ─────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────
const REV_COLOR   = '#6C3AED';  // violet — revenue
const VC_COLOR    = '#EF4444';  // red    — variable costs
const FC_COLOR    = '#F97316';  // orange — fixed costs
const CM_COLOR    = '#10B981';  // green  — contribution margin
const BEP_COLOR   = '#F59E0B';  // amber  — break-even
const MOS_COLOR   = '#3B82F6';  // blue   — margin of safety
const PROFIT_COLOR= '#059669';  // emerald— profit

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function n(r: Record<string, any>, col: string): number | null {
  if (!col) return null;
  const v = parseFloat(r[col]);
  return isFinite(v) ? v : null;
}

function autoUnit(rows: PeriodRow[]): string {
  const max = Math.max(...rows.map(r => Math.abs(r.revenue ?? r.fixedCosts ?? 0)));
  if (max >= 1_000_000) return 'M';
  if (max >= 1_000)     return 'K';
  return '';
}

function scale(v: number | null, unit: string): number | null {
  if (v === null) return null;
  if (unit === 'M') return parseFloat((v / 1_000_000).toFixed(2));
  if (unit === 'K') return parseFloat((v / 1_000).toFixed(2));
  return parseFloat(v.toFixed(1));
}

function buildRows(
  data: Record<string, any>[],
  periodCol: string,
  revCol: string,
  vcCol: string,
  fcCol: string,
  ebitCol: string,
): PeriodRow[] {
  if (!periodCol) return [];

  return data
    .map(r => {
      const period   = String(r[periodCol] ?? '').trim();
      if (!period) return null;

      let revenue    = n(r, revCol);
      let vc         = n(r, vcCol);
      let fc         = n(r, fcCol);
      let ebit       = n(r, ebitCol);

      // If EBIT provided but FC not, try deriving FC = Revenue - VC - EBIT
      if (fc === null && revenue !== null && vc !== null && ebit !== null)
        fc = parseFloat((revenue - vc - ebit).toFixed(2));
      // If VC not provided but gross profit col used: VC = Revenue - GP
      // EBIT = Revenue - VC - FC
      if (ebit === null && revenue !== null && vc !== null && fc !== null)
        ebit = parseFloat((revenue - vc - fc).toFixed(2));

      const cm    = revenue !== null && vc !== null
        ? parseFloat((revenue - vc).toFixed(2)) : null;
      const cmR   = cm !== null && revenue !== null && revenue > 0
        ? parseFloat(((cm / revenue) * 100).toFixed(2)) : null;
      const bepRev= cmR !== null && fc !== null && cmR > 0
        ? parseFloat((fc / (cmR / 100)).toFixed(2)) : null;
      const mos   = bepRev !== null && revenue !== null && revenue > 0
        ? parseFloat((((revenue - bepRev) / revenue) * 100).toFixed(2)) : null;
      const ol    = cm !== null && ebit !== null && ebit !== 0
        ? parseFloat((cm / ebit).toFixed(2)) : null;

      return {
        period,
        revenue,
        variableCosts: vc,
        fixedCosts:    fc,
        contributionMargin: cm,
        cmRatio:       cmR,
        bepRevenue:    bepRev,
        bepUnits:      null,
        marginOfSafety: mos,
        operatingLeverage: ol,
        ebit,
        vcStack:  vc,
        fcStack:  fc,
        profitStack: ebit !== null && ebit > 0 ? ebit : 0,
      } as PeriodRow;
    })
    .filter((r): r is PeriodRow => r !== null);
}

// ─────────────────────────────────────────────
// BEP curve — cost-volume-profit for latest period
// ─────────────────────────────────────────────
interface CvpPoint {
  units:       number;   // % of actual revenue (0–200)
  totalCost:   number;
  totalRevenue:number;
  profit:      number;
}

function buildCvpCurve(
  revenue: number,
  vc: number,
  fc: number,
  steps: number = 21,
): CvpPoint[] {
  const vcRatio = vc / revenue;
  const points: CvpPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const pct  = (i / (steps - 1)) * 2;   // 0 → 200% of revenue
    const rev  = parseFloat((revenue * pct).toFixed(2));
    const cost = parseFloat((fc + rev * vcRatio).toFixed(2));
    points.push({
      units:        parseFloat((pct * 100).toFixed(1)),
      totalCost:    cost,
      totalRevenue: rev,
      profit:       parseFloat((rev - cost).toFixed(2)),
    });
  }
  return points;
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
  let rev = 2400, vcR = 0.52, fc = 650;
  return quarters.map(q => {
    rev  = parseFloat((rev  * (1 + 0.04 + (Math.random() - 0.4) * 0.04)).toFixed(1));
    vcR  = Math.max(0.40, Math.min(0.62, vcR + (Math.random() - 0.55) * 0.015));
    fc   = parseFloat((fc   * (1 + 0.01 + (Math.random() - 0.5) * 0.02)).toFixed(1));
    const vc = parseFloat((rev * vcR).toFixed(1));
    return { period: q, revenue: rev, variable_costs: vc, fixed_costs: fc };
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
      {payload.filter((p: any) => p.value !== null && p.value !== undefined && p.value !== 0).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold text-slate-700">
            {typeof p.value === 'number'
              ? (Math.abs(p.value) < 1000 && unit === '')
                ? p.value.toFixed(1)
                : `${p.value.toFixed(2)}${unit}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const CvpTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CvpPoint;
  if (!d) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">Revenue at {d.units}%</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Revenue</span>
        <span className="font-mono font-semibold">{d.totalRevenue.toFixed(1)}{unit}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Total Cost</span>
        <span className="font-mono font-semibold">{d.totalCost.toFixed(1)}{unit}</span>
      </div>
      <div className={`flex justify-between gap-4 mt-1 pt-1 border-t border-slate-100`}>
        <span className="text-slate-500">Profit</span>
        <span className={`font-mono font-bold ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {d.profit >= 0 ? '+' : ''}{d.profit.toFixed(1)}{unit}
        </span>
      </div>
    </div>
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
            <Target className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Contribution Margin &amp; Break-Even</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze contribution margin and derive the break-even point (BEP) —
          understand cost structure, operating leverage, and margin of safety across periods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Key concept cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Target className="w-6 h-6 text-primary mb-2" />,
              title: 'Break-Even Point',
              desc:  'BEP Revenue = Fixed Costs ÷ CM Ratio. The revenue level at which total costs exactly equal total revenue — zero profit, zero loss.' },
            { icon: <Zap className="w-6 h-6 text-primary mb-2" />,
              title: 'Contribution Margin',
              desc:  'CM = Revenue − Variable Costs. The amount each revenue dollar contributes to covering fixed costs and generating profit. CM Ratio = CM ÷ Revenue.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Operating Leverage',
              desc:  'OL = CM ÷ EBIT. High leverage means a small revenue increase produces a large profit increase — and vice versa. Tracks sensitivity to volume changes.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Input guide */}
        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Info className="w-5 h-5" />Required Columns
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div className="space-y-2">
              {[
                ['period *',        'Fiscal period label (year / quarter)'],
                ['revenue *',       'Total revenue / net sales'],
                ['variable_costs *','Total variable costs (COGS if mostly variable)'],
                ['fixed_costs',     'Total fixed costs (SG&A, rent, depreciation)'],
                ['ebit',            'Operating profit — used if fixed_costs missing'],
              ].map(([col, desc]) => (
                <div key={col as string} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>{col as string}</strong> — {desc as string}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700 mb-1">What you get</p>
              {[
                'Cost structure stacked bar chart (VC + FC + Profit = Revenue)',
                'CM Ratio trend line over periods',
                'Break-even revenue vs actual revenue comparison',
                'Margin of Safety % trend',
                'CVP curve for latest period (cost-volume-profit)',
                'Operating leverage trend',
                'Full metrics table + insights',
              ].map(s => (
                <div key={s} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3">
            Tip: If your data has COGS and SG&A separately, map COGS as variable_costs and SG&A as fixed_costs.
            The page will derive EBIT automatically. Alternatively, map EBIT directly and omit fixed_costs.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Target className="mr-2 h-5 w-5" />Load Example Data
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ContributionMarginBepPage({
  data, allHeaders, numericHeaders,
  fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ────────────────────────────────────────
  const [periodCol, setPeriodCol] = useState('');
  const [revCol,    setRevCol]    = useState('');
  const [vcCol,     setVcCol]     = useState('');
  const [fcCol,     setFcCol]     = useState('');
  const [ebitCol,   setEbitCol]   = useState('');

  // ── CVP period selector ───────────────────────────────────
  const [cvpIdx, setCvpIdx] = useState(0);

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
    detect(['period','year','quarter','date','fiscal'],                   setPeriodCol, periodCol);
    detect(['revenue','sales','net_sales','total_revenue','net_revenue'], setRevCol,    revCol);
    detect(['variable_costs','variable_cost','vc','cogs','cost_of_sales'],setVcCol,     vcCol);
    detect(['fixed_costs','fixed_cost','fc','sga','opex','overhead'],     setFcCol,     fcCol);
    detect(['ebit','operating_income','operating_profit','op_income'],    setEbitCol,   ebitCol);
  }, [hasData, allHeaders]);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExample();
    onExampleLoaded?.(rows, 'example_cm_bep.csv');
    setPeriodCol('period');
    setRevCol('revenue');
    setVcCol('variable_costs');
    setFcCol('fixed_costs');
    setEbitCol('');
  }, [onExampleLoaded]);

  // ── Build rows ────────────────────────────────────────────
  const rows = useMemo(() =>
    buildRows(data, periodCol, revCol, vcCol, fcCol, ebitCol),
    [data, periodCol, revCol, vcCol, fcCol, ebitCol]
  );

  const unit = useMemo(() => autoUnit(rows), [rows]);

  // Scaled chart data
  const chartRows = useMemo(() =>
    rows.map(r => ({
      ...r,
      revenueS:    scale(r.revenue,             unit),
      vcS:         scale(r.variableCosts,        unit),
      fcS:         scale(r.fixedCosts,           unit),
      cmS:         scale(r.contributionMargin,   unit),
      bepS:        scale(r.bepRevenue,           unit),
      ebitS:       scale(r.ebit,                 unit),
      profitS:     r.ebit !== null && r.ebit > 0 ? scale(r.ebit, unit) : 0,
    })),
    [rows, unit]
  );

  // ── CVP curve ─────────────────────────────────────────────
  const safeIdx = Math.min(cvpIdx, rows.length - 1);
  const cvpRow  = rows[safeIdx] ?? null;
  const cvpCurve = useMemo(() => {
    if (!cvpRow || cvpRow.revenue === null ||
        cvpRow.variableCosts === null || cvpRow.fixedCosts === null) return [];
    const raw = buildCvpCurve(cvpRow.revenue, cvpRow.variableCosts, cvpRow.fixedCosts);
    return raw.map(p => ({
      ...p,
      totalCostS:   scale(p.totalCost,   unit) ?? 0,
      totalRevenueS:scale(p.totalRevenue,unit) ?? 0,
      profitS:      scale(p.profit,      unit) ?? 0,
    }));
  }, [cvpRow, unit]);

  const bepPct = cvpRow?.revenue && cvpRow?.bepRevenue
    ? parseFloat(((cvpRow.bepRevenue / cvpRow.revenue) * 100).toFixed(1)) : null;

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!rows.length) return null;
    const last  = rows[rows.length - 1];
    const first = rows[0];
    const cmRatios = rows.map(r => r.cmRatio).filter((v): v is number => v !== null);
    const avgCmR   = cmRatios.length
      ? cmRatios.reduce((a, b) => a + b, 0) / cmRatios.length : null;
    const cmDelta  = cmRatios.length >= 2
      ? cmRatios[cmRatios.length - 1] - cmRatios[0] : null;
    return { last, first, avgCmR, cmDelta, periods: rows.length };
  }, [rows]);

  const isConfigured    = rows.length > 0;
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Handlers ─────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setRevCol(''); setVcCol(''); setFcCol(''); setEbitCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  const handleDownloadCSV = useCallback(() => {
    if (!rows.length) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `CM_BEP_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `CM_BEP_${new Date().toISOString().split('T')[0]}.png`;
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
            <Target className="h-5 w-5" />Contribution Margin &amp; Break-Even Point
          </CardTitle>
          <CardDescription>
            Derive BEP from contribution margin analysis — understand cost structure,
            margin of safety, and operating leverage sensitivity.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Map period and cost columns. Fixed costs can be omitted if EBIT is available (FC = Revenue − VC − EBIT).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { label: 'PERIOD *',        value: periodCol, setter: setPeriodCol, headers: allHeaders,     opt: false },
              { label: 'REVENUE *',       value: revCol,    setter: setRevCol,    headers: numericHeaders, opt: false },
              { label: 'VARIABLE COSTS *',value: vcCol,     setter: setVcCol,     headers: numericHeaders, opt: false },
              { label: 'FIXED COSTS',     value: fcCol,     setter: setFcCol,     headers: numericHeaders, opt: true  },
              { label: 'EBIT',            value: ebitCol,   setter: setEbitCol,   headers: numericHeaders, opt: true  },
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

          {/* CVP period selector */}
          {isConfigured && cvpCurve.length > 0 && (
            <div className="border-t border-slate-100 pt-3 flex items-end gap-4 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">CVP CURVE — PERIOD</Label>
                <Select value={String(safeIdx)} onValueChange={v => setCvpIdx(parseInt(v))}>
                  <SelectTrigger className="text-xs h-7 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rows.map((r, i) => (
                      <SelectItem key={i} value={String(i)}>{r.period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {cvpRow && cvpRow.bepRevenue !== null && cvpRow.revenue !== null && (
                <div className="text-xs text-muted-foreground pb-0.5">
                  BEP: <span className="font-mono font-semibold">{scale(cvpRow.bepRevenue, unit)?.toFixed(1)}{unit}</span>
                  {' '}({bepPct}% of revenue) ·
                  CM Ratio: <span className="font-mono font-semibold">{cvpRow.cmRatio?.toFixed(1)}%</span>
                </div>
              )}
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
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (All Metrics)
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">CM Ratio (Latest)</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.last.cmRatio !== null ? `${stats.last.cmRatio.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.last.cmRatio !== null
                ? stats.last.cmRatio >= 60 ? 'High — strong margin structure'
                : stats.last.cmRatio >= 40 ? 'Healthy — solid contribution'
                : stats.last.cmRatio >= 20 ? 'Moderate — review variable costs'
                : 'Low — thin contribution margin'
                : 'Revenue or VC not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Break-Even Revenue</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.last.bepRevenue !== null
                ? `${scale(stats.last.bepRevenue, unit)?.toFixed(1)}${unit}`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {bepPct !== null ? `${bepPct}% of latest revenue` : 'Fixed costs not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Margin of Safety</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.last.marginOfSafety !== null ? `${stats.last.marginOfSafety.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.last.marginOfSafety !== null
                ? stats.last.marginOfSafety >= 40 ? 'Comfortable buffer'
                : stats.last.marginOfSafety >= 20 ? 'Adequate safety margin'
                : stats.last.marginOfSafety >= 0  ? 'Thin — close to BEP'
                : 'Below break-even'
                : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Operating Leverage</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.last.operatingLeverage !== null ? `${stats.last.operatingLeverage.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.last.operatingLeverage !== null
                ? `${stats.last.operatingLeverage.toFixed(1)}× profit sensitivity to revenue`
                : 'EBIT not available'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Cost Structure Stacked Bar ── */}
        {isConfigured && chartRows.some(r => r.vcS !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cost Structure vs Revenue</CardTitle>
              <CardDescription>
                Stacked: Variable Costs (red) + Fixed Costs (orange) + Profit (green) = Revenue ·
                Violet line = Revenue{unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<GenTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="vcS"     name="Variable Costs" stackId="cost" fill={VC_COLOR}     fillOpacity={0.85} maxBarSize={28} />
                  <Bar dataKey="fcS"     name="Fixed Costs"    stackId="cost" fill={FC_COLOR}     fillOpacity={0.85} maxBarSize={28} />
                  <Bar dataKey="profitS" name="Profit"         stackId="cost" fill={PROFIT_COLOR} fillOpacity={0.85} maxBarSize={28} radius={[3,3,0,0]} />
                  <Line dataKey="revenueS" name="Revenue" stroke={REV_COLOR} strokeWidth={2.5}
                    dot={{ r: 2.5, fill: REV_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: CM Ratio + BEP vs Revenue ── */}
        {isConfigured && chartRows.some(r => r.cmRatio !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">CM Ratio &amp; Break-Even Revenue</CardTitle>
              <CardDescription>
                Green line = CM Ratio % (right axis) ·
                Violet bars = Actual Revenue · Amber bars = BEP Revenue{unit ? ` · Unit: ${unit}` : ''}
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
                  <Bar yAxisId="val" dataKey="revenueS" name="Revenue"     fill={REV_COLOR} fillOpacity={0.7} maxBarSize={24} radius={[2,2,0,0]} />
                  <Bar yAxisId="val" dataKey="bepS"     name="BEP Revenue" fill={BEP_COLOR} fillOpacity={0.7} maxBarSize={24} radius={[2,2,0,0]} />
                  <Line yAxisId="pct" dataKey="cmRatio" name="CM Ratio %"
                    stroke={CM_COLOR} strokeWidth={2.5}
                    dot={{ r: 3, fill: CM_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: CVP Curve ── */}
        {isConfigured && cvpCurve.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Cost-Volume-Profit Curve — {cvpRow?.period}
              </CardTitle>
              <CardDescription>
                Violet = Total Revenue · Orange = Total Cost · Green area = Profit zone ·
                Amber dashed = Break-even point{unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={cvpCurve} margin={{ top: 4, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="units" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={v => `${v}%`}
                    label={{ value: '% of Actual Revenue', position: 'insideBottom', offset: -8, fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<CvpTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {bepPct !== null && (
                    <ReferenceLine x={bepPct} stroke={BEP_COLOR} strokeDasharray="5 3" strokeWidth={2}
                      label={{ value: `BEP ${bepPct}%`, position: 'top', fontSize: 9, fill: BEP_COLOR }} />
                  )}
                  <Area dataKey="totalRevenueS" name="Revenue" stroke={REV_COLOR} fill={REV_COLOR}
                    fillOpacity={0.08} strokeWidth={2.5} dot={false} connectNulls />
                  <Line dataKey="totalCostS" name="Total Cost" stroke={FC_COLOR} strokeWidth={2}
                    dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Margin of Safety + Operating Leverage ── */}
        {isConfigured && chartRows.some(r => r.marginOfSafety !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Margin of Safety &amp; Operating Leverage</CardTitle>
              <CardDescription>
                Blue bars = Margin of Safety % (left axis) ·
                Amber line = Operating Leverage × (right axis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis yAxisId="mos" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis yAxisId="ol" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={36}
                    tickFormatter={v => `${v.toFixed(1)}×`} />
                  <Tooltip content={<GenTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine yAxisId="mos" y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar yAxisId="mos" dataKey="marginOfSafety" name="Margin of Safety %"
                    maxBarSize={24} radius={[2,2,0,0]}>
                    {chartRows.map((r, i) => (
                      <Cell key={i} fill={(r.marginOfSafety ?? 0) >= 20 ? MOS_COLOR : (r.marginOfSafety ?? 0) >= 0 ? BEP_COLOR : VC_COLOR} fillOpacity={0.8} />
                    ))}
                  </Bar>
                  {chartRows.some(r => r.operatingLeverage !== null) && (
                    <Line yAxisId="ol" dataKey="operatingLeverage" name="Op. Leverage ×"
                      stroke={BEP_COLOR} strokeWidth={2}
                      dot={{ r: 3, fill: BEP_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Metrics Table ── */}
        {isConfigured && rows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />CM &amp; BEP Metrics Table
              </CardTitle>
              <CardDescription>All computed metrics by period — newest first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {[
                        'Period', 'Revenue', 'Variable Cost', 'Fixed Cost',
                        'CM', 'CM Ratio',
                        ...(rows.some(r => r.bepRevenue !== null)      ? ['BEP Revenue'] : []),
                        ...(rows.some(r => r.marginOfSafety !== null)  ? ['MoS %'] : []),
                        ...(rows.some(r => r.operatingLeverage !== null) ? ['Op. Leverage'] : []),
                        ...(rows.some(r => r.ebit !== null)            ? ['EBIT'] : []),
                      ].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows].reverse().map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {r.revenue !== null ? `${scale(r.revenue, unit)?.toFixed(1)}${unit}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {r.variableCosts !== null ? `${scale(r.variableCosts, unit)?.toFixed(1)}${unit}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {r.fixedCosts !== null ? `${scale(r.fixedCosts, unit)?.toFixed(1)}${unit}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                          {r.contributionMargin !== null ? `${scale(r.contributionMargin, unit)?.toFixed(1)}${unit}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                          {r.cmRatio !== null ? `${r.cmRatio.toFixed(1)}%` : '—'}
                        </td>
                        {rows.some(p => p.bepRevenue !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.bepRevenue !== null ? `${scale(r.bepRevenue, unit)?.toFixed(1)}${unit}` : '—'}
                          </td>
                        )}
                        {rows.some(p => p.marginOfSafety !== null) && (
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {r.marginOfSafety !== null ? `${r.marginOfSafety.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        {rows.some(p => p.operatingLeverage !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.operatingLeverage !== null ? `${r.operatingLeverage.toFixed(2)}×` : '—'}
                          </td>
                        )}
                        {rows.some(p => p.ebit !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.ebit !== null ? `${scale(r.ebit, unit)?.toFixed(1)}${unit}` : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && stats && (() => {
          const { last, first, avgCmR, cmDelta } = stats;

          const mosVals = rows.map(r => r.marginOfSafety).filter((v): v is number => v !== null);
          const mosDelta = mosVals.length >= 2 ? mosVals[mosVals.length - 1] - mosVals[0] : null;

          const olVals = rows.map(r => r.operatingLeverage).filter((v): v is number => v !== null);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights
                </CardTitle>
                <CardDescription>Auto-generated contribution margin &amp; BEP analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Overview</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Analyzed <span className="font-semibold">{stats.periods}</span> periods
                    ({first.period} → {last.period}).
                    {last.cmRatio !== null && <> Latest CM Ratio: <span className="font-semibold">{last.cmRatio.toFixed(1)}%</span>.</>}
                    {last.bepRevenue !== null && last.revenue !== null && <>
                      {' '}BEP Revenue: <span className="font-semibold">{scale(last.bepRevenue, unit)?.toFixed(1)}{unit}</span>
                      {' '}({bepPct}% of actual revenue).
                    </>}
                    {last.marginOfSafety !== null && <> Margin of Safety: <span className="font-semibold">{last.marginOfSafety.toFixed(1)}%</span>.</>}
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'CM Ratio Latest',  value: last.cmRatio !== null ? `${last.cmRatio.toFixed(1)}%` : '—',                sub: 'contribution per revenue $' },
                    { label: 'CM Ratio Avg',      value: avgCmR !== null ? `${avgCmR.toFixed(1)}%` : '—',                            sub: 'all periods' },
                    { label: 'CM Ratio Δ',        value: cmDelta !== null ? `${cmDelta >= 0 ? '+' : ''}${cmDelta.toFixed(1)}pp` : '—', sub: `${first.period} → ${last.period}` },
                    { label: 'Avg Op. Leverage',  value: olVals.length ? `${(olVals.reduce((a,b)=>a+b,0)/olVals.length).toFixed(2)}×` : '—', sub: 'avg across periods' },
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Analysis</p>

                  {/* CM Ratio */}
                  {last.cmRatio !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Contribution Margin Ratio — {last.cmRatio.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.cmRatio >= 60
                            ? `A CM Ratio of ${last.cmRatio.toFixed(1)}% is high — for every dollar of revenue, ${last.cmRatio.toFixed(0)} cents contributes to covering fixed costs and generating profit. This indicates a low-variable-cost business model with strong pricing power or lean production.`
                            : last.cmRatio >= 40
                            ? `CM Ratio of ${last.cmRatio.toFixed(1)}% is healthy. The business retains ${last.cmRatio.toFixed(0)} cents per revenue dollar after variable costs — sufficient to cover fixed costs and generate meaningful profit at scale.`
                            : last.cmRatio >= 20
                            ? `CM Ratio of ${last.cmRatio.toFixed(1)}% is moderate. Variable costs consume ${(100 - last.cmRatio).toFixed(0)}% of revenue, leaving limited contribution per unit. Reducing variable cost intensity or increasing pricing would materially improve profitability.`
                            : `CM Ratio of ${last.cmRatio.toFixed(1)}% is low — variable costs are very high relative to revenue. The business is highly volume-sensitive; small revenue drops can rapidly erode profitability.`}
                          {cmDelta !== null && (
                            <> The CM Ratio has {cmDelta >= 0 ? 'improved' : 'declined'} by{' '}
                              <span className="font-semibold">{Math.abs(cmDelta).toFixed(1)}pp</span> since {first.period}.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* BEP */}
                  {last.bepRevenue !== null && last.revenue !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Break-Even Point — {scale(last.bepRevenue, unit)?.toFixed(1)}{unit} ({bepPct}% of revenue)
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {bepPct !== null && bepPct <= 40
                            ? `BEP at ${bepPct}% of current revenue is excellent. The company reaches profitability at less than half its current volume — providing a wide buffer against demand slowdowns.`
                            : bepPct !== null && bepPct <= 60
                            ? `BEP at ${bepPct}% of revenue is comfortable. The business has meaningful downside protection before reaching a loss position.`
                            : bepPct !== null && bepPct <= 80
                            ? `BEP at ${bepPct}% of revenue means the company requires most of its current volume to stay profitable. A revenue decline of ${(100 - bepPct).toFixed(0)}% would push it to breakeven — monitor fixed cost growth carefully.`
                            : bepPct !== null
                            ? `BEP at ${bepPct}% of revenue is dangerously close to current revenue. Any meaningful volume decline could result in losses. Consider restructuring fixed costs or improving variable cost efficiency.`
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Margin of Safety */}
                  {last.marginOfSafety !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Margin of Safety — {last.marginOfSafety.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.marginOfSafety >= 40
                            ? `Margin of Safety of ${last.marginOfSafety.toFixed(1)}% is strong — revenue can drop ${last.marginOfSafety.toFixed(0)}% before the business hits break-even.`
                            : last.marginOfSafety >= 20
                            ? `Margin of Safety of ${last.marginOfSafety.toFixed(1)}% is adequate. The business has a reasonable buffer above break-even, but should monitor volume trends closely.`
                            : last.marginOfSafety >= 0
                            ? `Margin of Safety of ${last.marginOfSafety.toFixed(1)}% is thin. The company is operating close to break-even — a modest revenue shortfall would result in a loss.`
                            : `Margin of Safety is negative (${last.marginOfSafety.toFixed(1)}%) — the company is currently operating below break-even and generating a loss.`}
                          {mosDelta !== null && (
                            <> The safety buffer has {mosDelta >= 0 ? 'widened' : 'narrowed'} by{' '}
                              <span className="font-semibold">{Math.abs(mosDelta).toFixed(1)}pp</span> since {first.period}.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Operating Leverage */}
                  {last.operatingLeverage !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Operating Leverage — {last.operatingLeverage.toFixed(2)}×
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {`Operating leverage of ${last.operatingLeverage.toFixed(2)}× means a 1% change in revenue produces approximately a ${last.operatingLeverage.toFixed(2)}% change in EBIT. `}
                          {last.operatingLeverage >= 5
                            ? 'This is high leverage — the business amplifies revenue gains strongly into profit, but is equally exposed to downside. Fixed cost discipline is critical.'
                            : last.operatingLeverage >= 2
                            ? 'This is moderate-to-high leverage — growth in revenue translates meaningfully into profit growth, but requires sustained volume to cover the fixed cost base.'
                            : 'This is relatively low leverage — the cost structure is more variable, providing stability but limiting profit amplification on volume upside.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ CM = Revenue − Variable Costs. CM Ratio = CM ÷ Revenue × 100%.
                  BEP Revenue = Fixed Costs ÷ CM Ratio. Margin of Safety = (Revenue − BEP) ÷ Revenue × 100%.
                  Operating Leverage = CM ÷ EBIT. CVP curve shows profit/loss at 0–200% of current revenue.
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
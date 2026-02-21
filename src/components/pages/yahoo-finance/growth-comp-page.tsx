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
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
  LabelList,
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
  BarChart3,
  Activity,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
// Types
// ============================================

interface PeriodRow {
  period:       string;   // e.g. "2021Q1", "2022", "Jan-23"
  revenue:      number;
  cogs:         number | null;    // Cost of Goods Sold
  grossProfit:  number | null;
  opex:         number | null;    // Operating Expenses (SGA + R&D etc.)
  ebit:         number | null;    // Earnings Before Interest & Tax
  // Derived
  grossMargin:  number | null;    // %
  opexRatio:    number | null;    // opex / revenue %
  ebitMargin:   number | null;    // %
  revenueGrowth:number | null;    // % YoY or period-on-period
  cogsGrowth:   number | null;
  opexGrowth:   number | null;
  // Waterfall deltas vs prior period
  revDelta:     number | null;
  cogsDelta:    number | null;
  opexDelta:    number | null;
  ebitDelta:    number | null;
}

interface WaterfallBar {
  name:   string;
  base:   number;   // invisible bottom
  value:  number;   // visible bar height (can be negative)
  total:  number;   // running total (for labeling)
  type:   'start' | 'pos' | 'neg' | 'end';
}

// ============================================
// Constants
// ============================================

const REV_COLOR    = '#6C3AED';   // violet
const COGS_COLOR   = '#EF4444';   // red
const OPEX_COLOR   = '#F97316';   // orange
const EBIT_COLOR   = '#10B981';   // green
const GROSS_COLOR  = '#3B82F6';   // blue
const MARGIN_COLOR = '#6C3AED';
const GROWTH_POS   = '#10B981';
const GROWTH_NEG   = '#EF4444';
const WATERFALL_POS = '#10B981';
const WATERFALL_NEG = '#EF4444';
const WATERFALL_BASE = '#6C3AED';

// ============================================
// Computation helpers
// ============================================

function pct(a: number, b: number): number | null {
  return b !== 0 ? parseFloat(((a / b) * 100).toFixed(2)) : null;
}

function growth(curr: number, prev: number): number | null {
  return prev !== 0 ? parseFloat((((curr - prev) / Math.abs(prev)) * 100).toFixed(2)) : null;
}

function buildPeriodRows(
  data:       Record<string, any>[],
  periodCol:  string,
  revenueCol: string,
  cogsCol:    string,
  opexCol:    string,
  ebitCol:    string,
): PeriodRow[] {
  const raw = data
    .map(r => ({
      period:  String(r[periodCol] ?? '').trim(),
      revenue: parseFloat(r[revenueCol]),
      cogs:    cogsCol ? parseFloat(r[cogsCol])  : NaN,
      opex:    opexCol ? parseFloat(r[opexCol])  : NaN,
      ebit:    ebitCol ? parseFloat(r[ebitCol])  : NaN,
    }))
    .filter(r => r.period && isFinite(r.revenue));

  return raw.map((r, i) => {
    const cogs       = isFinite(r.cogs) ? r.cogs : null;
    const opex       = isFinite(r.opex) ? r.opex : null;
    const ebitRaw    = isFinite(r.ebit) ? r.ebit : null;
    const grossProfit = cogs !== null ? r.revenue - cogs : null;
    const ebit       = ebitRaw !== null ? ebitRaw
                      : (grossProfit !== null && opex !== null) ? grossProfit - opex : null;

    const prev = i > 0 ? raw[i - 1] : null;
    const prevCogs = prev && isFinite(prev.cogs) ? prev.cogs : null;
    const prevOpex = prev && isFinite(prev.opex) ? prev.opex : null;
    const prevEbit = (() => {
      if (!prev) return null;
      if (isFinite(prev.ebit)) return prev.ebit;
      const pg = isFinite(prev.cogs) ? prev.revenue - prev.cogs : null;
      return pg !== null && isFinite(prev.opex) ? pg - prev.opex : null;
    })();

    return {
      period:       r.period,
      revenue:      r.revenue,
      cogs,
      grossProfit,
      opex,
      ebit,
      grossMargin:  grossProfit !== null ? pct(grossProfit, r.revenue) : null,
      opexRatio:    opex !== null        ? pct(opex, r.revenue)        : null,
      ebitMargin:   ebit !== null        ? pct(ebit, r.revenue)        : null,
      revenueGrowth: prev ? growth(r.revenue, prev.revenue)            : null,
      cogsGrowth:    prev && cogs !== null && prevCogs !== null ? growth(cogs, prevCogs) : null,
      opexGrowth:    prev && opex !== null && prevOpex !== null ? growth(opex, prevOpex) : null,
      revDelta:      prev ? parseFloat((r.revenue - prev.revenue).toFixed(2)) : null,
      cogsDelta:     prev && cogs !== null && prevCogs !== null
                       ? parseFloat((cogs - prevCogs).toFixed(2)) : null,
      opexDelta:     prev && opex !== null && prevOpex !== null
                       ? parseFloat((opex - prevOpex).toFixed(2)) : null,
      ebitDelta:     prev && ebit !== null && prevEbit !== null
                       ? parseFloat((ebit - prevEbit).toFixed(2)) : null,
    };
  });
}

function buildWaterfall(rows: PeriodRow[], baseIdx: number, targetIdx: number): WaterfallBar[] {
  if (baseIdx < 0 || targetIdx >= rows.length || baseIdx >= targetIdx) return [];
  const base   = rows[baseIdx];
  const target = rows[targetIdx];

  // EBIT bridge: base EBIT → +revDelta → -cogsDelta → -opexDelta → target EBIT
  const baseEbit   = base.ebit   ?? base.revenue;
  const targetEbit = target.ebit ?? target.revenue;

  const revEffect  = target.revenue - base.revenue;
  const cogsEffect = (base.cogs !== null && target.cogs !== null)
    ? -(target.cogs - base.cogs)   // cost increase hurts profit
    : 0;
  const opexEffect = (base.opex !== null && target.opex !== null)
    ? -(target.opex - base.opex)
    : 0;
  const other = targetEbit - baseEbit - revEffect - cogsEffect - opexEffect;

  const bars: WaterfallBar[] = [];
  let running = baseEbit;

  bars.push({ name: 'Base EBIT', base: 0, value: running, total: running, type: 'start' });

  const drivers = [
    { name: 'Revenue', val: revEffect },
    { name: 'COGS',    val: cogsEffect },
    { name: 'OpEx',    val: opexEffect },
  ];
  if (Math.abs(other) > 0.01) drivers.push({ name: 'Other', val: other });

  for (const d of drivers) {
    if (d.val === 0) continue;
    bars.push({
      name:  d.name,
      base:  d.val > 0 ? running : running + d.val,
      value: Math.abs(d.val),
      total: running + d.val,
      type:  d.val > 0 ? 'pos' : 'neg',
    });
    running += d.val;
  }

  bars.push({ name: 'Target EBIT', base: 0, value: targetEbit, total: targetEbit, type: 'end' });
  return bars;
}

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const quarters = [
    '2021Q1','2021Q2','2021Q3','2021Q4',
    '2022Q1','2022Q2','2022Q3','2022Q4',
    '2023Q1','2023Q2','2023Q3','2023Q4',
    '2024Q1','2024Q2','2024Q3','2024Q4',
  ];
  let rev = 1000, cogsRatio = 0.55, opexRatio = 0.22;

  return quarters.map((q, i) => {
    // Simulate growth + margin improvement
    rev         = rev * (1 + 0.04 + (Math.random() - 0.4) * 0.04);
    cogsRatio   = Math.max(0.42, cogsRatio - 0.003 + (Math.random() - 0.5) * 0.01);
    opexRatio   = Math.max(0.15, opexRatio + (Math.random() - 0.55) * 0.01);
    const cogs  = rev * cogsRatio;
    const opex  = rev * opexRatio;
    const ebit  = rev - cogs - opex;
    return {
      period: q,
      revenue: parseFloat(rev.toFixed(1)),
      cogs:    parseFloat(cogs.toFixed(1)),
      opex:    parseFloat(opex.toFixed(1)),
      ebit:    parseFloat(ebit.toFixed(1)),
    };
  });
}

// ============================================
// Formatters
// ============================================

function fmtNum(v: number, unit: string): string {
  if (unit === '%') return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(1)}`;
}

function autoUnit(rows: PeriodRow[]): string {
  const maxRev = Math.max(...rows.map(r => r.revenue));
  if (maxRev >= 1_000_000) return 'M';
  if (maxRev >= 1_000)     return 'K';
  return '';
}

function scaleVal(v: number, unit: string): number {
  if (unit === 'M') return parseFloat((v / 1_000_000).toFixed(3));
  if (unit === 'K') return parseFloat((v / 1_000).toFixed(3));
  return parseFloat(v.toFixed(2));
}

// ============================================
// Custom Tooltips
// ============================================

const StackedTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {[...payload].reverse().map((p: any) => (
        p.value !== null && p.value !== undefined && (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-mono font-semibold">
              {typeof p.value === 'number' ? fmtNum(p.value, unit ?? '') : p.value}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

const MarginTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.stroke ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const GrowthTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className={`font-mono font-semibold ${p.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

const WaterfallTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as WaterfallBar;
  if (!d) return null;
  const isNet = d.type === 'pos' || d.type === 'neg';
  const sign = d.type === 'neg' ? '-' : d.type === 'pos' ? '+' : '';
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">{isNet ? 'Impact' : 'EBIT'}</span>
        <span className={`font-mono font-bold ${d.type === 'pos' ? 'text-emerald-600' : d.type === 'neg' ? 'text-red-500' : 'text-slate-700'}`}>
          {sign}{Math.abs(d.value).toFixed(1)}
        </span>
      </div>
      {(d.type === 'end' || d.type === 'start') && (
        <div className="flex justify-between gap-4 mt-0.5">
          <span className="text-slate-500">Total</span>
          <span className="font-mono font-bold">{d.total.toFixed(1)}</span>
        </div>
      )}
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
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Revenue / Cost Driver</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze the key drivers of revenue growth and cost structure changes — identify what is expanding margins and what is compressing them
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Revenue Growth Drivers',
              desc:  'Period-over-period revenue growth rate with decomposition — see when growth accelerated or decelerated and how COGS growth compares to top-line growth.',
            },
            {
              icon: <PieChart className="w-6 h-6 text-primary mb-2" />,
              title: 'Cost Structure Analysis',
              desc:  'Track COGS ratio and OpEx ratio over time — identify structural margin improvement, cost creep, or operational leverage unlocking.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'EBIT Bridge (Waterfall)',
              desc:  'Decompose EBIT change between any two periods into Revenue, COGS, and OpEx effects — isolate what drove profit improvement or deterioration.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Key metrics legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: REV_COLOR,   label: 'Revenue',       desc: 'Top-line sales / total income' },
            { color: COGS_COLOR,  label: 'COGS',          desc: 'Cost of Goods Sold — direct costs' },
            { color: OPEX_COLOR,  label: 'OpEx',          desc: 'Operating Expenses — SG&A, R&D etc.' },
            { color: EBIT_COLOR,  label: 'EBIT / Profit', desc: 'Earnings Before Interest & Tax' },
          ].map(({ color, label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <div className="text-xs font-bold text-slate-700">{label}</div>
              </div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use Revenue / Cost Driver analysis when you have multi-period financial data (quarterly or annual)
            and want to understand <em>why</em> margins changed — not just <em>that</em> they changed.
            The EBIT bridge quantifies exactly how much of a profit change came from revenue growth,
            cost of goods efficiency, and operating expense control vs. other factors.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>period</strong> — time label (e.g. "2023Q1", "2022", "Jan-23")</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>revenue</strong> — total revenue / sales</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>cogs</strong> — optional, cost of goods sold</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>opex</strong> — optional, operating expenses</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>ebit</strong> — optional (auto-computed if cogs+opex provided)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Stacked cost structure chart + revenue trend</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Gross margin, OpEx ratio, EBIT margin trend lines</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Revenue / COGS / OpEx growth rate comparison</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>EBIT waterfall bridge between selected periods</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <DollarSign className="mr-2 h-5 w-5" />
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

export default function RevenueCostDriverPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ─────────────────────────────────────────
  const [periodCol,  setPeriodCol]  = useState('');
  const [revenueCol, setRevenueCol] = useState('');
  const [cogsCol,    setCogsCol]    = useState('');
  const [opexCol,    setOpexCol]    = useState('');
  const [ebitCol,    setEbitCol]    = useState('');

  // ── Waterfall selection ────────────────────────────────────
  const [wfBaseIdx,   setWfBaseIdx]   = useState(0);
  const [wfTargetIdx, setWfTargetIdx] = useState(1);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_revenue_cost.csv');
    setPeriodCol('period'); setRevenueCol('revenue');
    setCogsCol('cogs');     setOpexCol('opex');
    setEbitCol('ebit');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setRevenueCol(''); setCogsCol('');
    setOpexCol('');   setEbitCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['period', 'quarter', 'year', 'date', 'fiscal_period'], setPeriodCol,  periodCol);
    detect(['revenue', 'sales', 'net_sales', 'total_revenue'],      setRevenueCol, revenueCol);
    detect(['cogs', 'cost_of_goods', 'cost_of_revenue'],            setCogsCol,    cogsCol);
    detect(['opex', 'operating_expense', 'sga', 'sg&a'],           setOpexCol,    opexCol);
    detect(['ebit', 'operating_income', 'operating_profit'],        setEbitCol,    ebitCol);
  }, [hasData, allHeaders]);

  // ── Build rows ─────────────────────────────────────────────
  const periodRows = useMemo(() => {
    if (!periodCol || !revenueCol) return [];
    return buildPeriodRows(data, periodCol, revenueCol, cogsCol, opexCol, ebitCol);
  }, [data, periodCol, revenueCol, cogsCol, opexCol, ebitCol]);

  // ── Scale unit ─────────────────────────────────────────────
  const unit = useMemo(() => autoUnit(periodRows), [periodRows]);

  // ── Scaled chart data ──────────────────────────────────────
  const chartData = useMemo(() =>
    periodRows.map(r => ({
      period:       r.period,
      revenue:      scaleVal(r.revenue, unit),
      revLine:      scaleVal(r.revenue, unit), // alias for Line to avoid duplicate dataKey with Bar
      cogs:         r.cogs      !== null ? scaleVal(r.cogs, unit)      : null,
      opex:         r.opex      !== null ? scaleVal(r.opex, unit)      : null,
      ebit:         r.ebit      !== null ? scaleVal(r.ebit, unit)      : null,
      grossProfit:  r.grossProfit !== null ? scaleVal(r.grossProfit, unit) : null,
      grossMargin:  r.grossMargin,
      opexRatio:    r.opexRatio,
      ebitMargin:   r.ebitMargin,
      revenueGrowth:r.revenueGrowth,
      cogsGrowth:   r.cogsGrowth,
      opexGrowth:   r.opexGrowth,
    })),
    [periodRows, unit]
  );

  // ── Waterfall ──────────────────────────────────────────────
  const wfData = useMemo(() => {
    const safeBase   = Math.min(wfBaseIdx,   periodRows.length - 1);
    const safeTarget = Math.min(wfTargetIdx, periodRows.length - 1);
    if (safeBase >= safeTarget) return [];
    return buildWaterfall(periodRows, safeBase, safeTarget);
  }, [periodRows, wfBaseIdx, wfTargetIdx]);

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (periodRows.length < 2) return null;
    const last  = periodRows[periodRows.length - 1];
    const first = periodRows[0];
    const validGrowth = periodRows.map(r => r.revenueGrowth).filter((v): v is number => v !== null);
    const avgRevGrowth = validGrowth.length
      ? validGrowth.reduce((a, b) => a + b, 0) / validGrowth.length : null;
    const latestGrowth = last.revenueGrowth;
    const totalRevGrowth = growth(last.revenue, first.revenue);
    return {
      periods:        periodRows.length,
      latestRevenue:  last.revenue,
      latestPeriod:   last.period,
      latestGrowth,
      avgRevGrowth,
      totalRevGrowth,
      latestGrossMargin: last.grossMargin,
      latestEbitMargin:  last.ebitMargin,
      firstGrossMargin:  first.grossMargin,
      firstEbitMargin:   first.ebitMargin,
      marginDrift: last.ebitMargin !== null && first.ebitMargin !== null
        ? parseFloat((last.ebitMargin - first.ebitMargin).toFixed(2)) : null,
    };
  }, [periodRows]);

  const isConfigured    = !!(periodCol && revenueCol && periodRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!periodRows.length) return;
    const rows = periodRows.map(r => ({
      period:        r.period,
      revenue:       r.revenue,
      cogs:          r.cogs       ?? '',
      gross_profit:  r.grossProfit ?? '',
      opex:          r.opex        ?? '',
      ebit:          r.ebit        ?? '',
      gross_margin:  r.grossMargin  !== null ? `${r.grossMargin}%`  : '',
      opex_ratio:    r.opexRatio    !== null ? `${r.opexRatio}%`    : '',
      ebit_margin:   r.ebitMargin   !== null ? `${r.ebitMargin}%`   : '',
      revenue_growth:r.revenueGrowth !== null ? `${r.revenueGrowth}%` : '',
      cogs_growth:   r.cogsGrowth    !== null ? `${r.cogsGrowth}%`    : '',
      opex_growth:   r.opexGrowth    !== null ? `${r.opexGrowth}%`    : '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `RevCostDriver_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [periodRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `RevCostDriver_${new Date().toISOString().split('T')[0]}.png`;
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
              const link = document.createElement('a');
              link.href = URL.createObjectURL(new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' }));
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
                  {allHeaders.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    {allHeaders.map(h => (
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 4</span>
            <span className="text-xs text-muted-foreground">Financial Analysis</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue / Cost Driver
          </CardTitle>
          <CardDescription>
            Analyze revenue growth and cost structure changes — identify the primary drivers of margin expansion or compression across periods.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map period and financial columns. COGS, OpEx, and EBIT are optional but unlock cost driver analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Column mapping */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'PERIOD *',  value: periodCol,  setter: setPeriodCol,  headers: allHeaders,     opt: false },
              { label: 'REVENUE *', value: revenueCol, setter: setRevenueCol, headers: numericHeaders, opt: false },
              { label: 'COGS',      value: cogsCol,    setter: setCogsCol,    headers: numericHeaders, opt: true  },
              { label: 'OPEX',      value: opexCol,    setter: setOpexCol,    headers: numericHeaders, opt: true  },
              { label: 'EBIT',      value: ebitCol,    setter: setEbitCol,    headers: numericHeaders, opt: true  },
            ].map(({ label, value, setter, headers, opt }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {opt && <SelectItem value="__none__">— None —</SelectItem>}
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Waterfall period selection */}
          {isConfigured && periodRows.length >= 2 && (
            <div className="border-t border-slate-100 pt-3">
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                EBIT BRIDGE — SELECT PERIOD RANGE
              </Label>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From (Base)</Label>
                  <Select
                    value={String(wfBaseIdx)}
                    onValueChange={v => {
                      const n = parseInt(v);
                      setWfBaseIdx(n);
                      if (n >= wfTargetIdx) setWfTargetIdx(Math.min(n + 1, periodRows.length - 1));
                    }}>
                    <SelectTrigger className="text-xs h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periodRows.slice(0, periodRows.length - 1).map((r, i) => (
                        <SelectItem key={i} value={String(i)}>{r.period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To (Target)</Label>
                  <Select
                    value={String(wfTargetIdx)}
                    onValueChange={v => {
                      const n = parseInt(v);
                      setWfTargetIdx(n);
                      if (n <= wfBaseIdx) setWfBaseIdx(Math.max(n - 1, 0));
                    }}>
                    <SelectTrigger className="text-xs h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periodRows.slice(1).map((r, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{r.period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground pb-1">
                  {periodRows[wfBaseIdx]?.period} → {periodRows[Math.min(wfTargetIdx, periodRows.length - 1)]?.period}
                </div>
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
                <Download className="mr-2 h-4 w-4" />Export
                <ChevronDown className="ml-2 h-4 w-4" />
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Revenue</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {fmtNum(stats.latestRevenue, unit)}
              {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{stats.latestPeriod}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Growth</div>
            <div className="flex items-center gap-1.5 text-2xl font-bold font-mono text-slate-800">
              {stats.latestGrowth !== null
                ? (stats.latestGrowth >= 0 ? <ArrowUpRight className="h-5 w-5 shrink-0" /> : <ArrowDownRight className="h-5 w-5 shrink-0" />)
                : <Minus className="h-5 w-5 shrink-0 text-slate-400" />}
              {stats.latestGrowth !== null ? `${stats.latestGrowth >= 0 ? '+' : ''}${stats.latestGrowth.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Avg: {stats.avgRevGrowth !== null ? `${stats.avgRevGrowth >= 0 ? '+' : ''}${stats.avgRevGrowth.toFixed(1)}%` : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">EBIT Margin</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestEbitMargin !== null ? `${stats.latestEbitMargin.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.marginDrift !== null
                ? `${stats.marginDrift >= 0 ? '▲ +' : '▼ '}${stats.marginDrift.toFixed(1)}pp vs first period`
                : 'EBIT not available'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gross Margin</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestGrossMargin !== null ? `${stats.latestGrossMargin.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.firstGrossMargin !== null && stats.latestGrossMargin !== null
                ? (() => {
                    const d = stats.latestGrossMargin - stats.firstGrossMargin;
                    return `${d >= 0 ? '▲ +' : '▼ '}${d.toFixed(1)}pp vs first period`;
                  })()
                : 'COGS not available'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Revenue + Cost structure stacked ── */}
        {isConfigured && chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue & Cost Structure</CardTitle>
              <CardDescription>
                {cogsCol && opexCol
                  ? `Revenue bars (violet) + COGS / OpEx / EBIT lines overlaid · Unit: ${unit || 'absolute'}`
                  : `Revenue trend · Unit: ${unit || 'absolute'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartData.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={60}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<StackedTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {/* Revenue bar — always rendered as the base */}
                  <Bar dataKey="revenue" name="Revenue" fill={REV_COLOR} fillOpacity={0.85} maxBarSize={32} radius={[3,3,0,0]} />
                  {/* COGS + OpEx lines overlaid when mapped */}
                  {cogsCol && (
                    <Line dataKey="cogs" name="COGS" stroke={COGS_COLOR} strokeWidth={2}
                      dot={{ r: 2.5, fill: COGS_COLOR }} connectNulls />
                  )}
                  {opexCol && (
                    <Line dataKey="opex" name="OpEx" stroke={OPEX_COLOR} strokeWidth={2}
                      strokeDasharray="4 3" dot={{ r: 2.5, fill: OPEX_COLOR }} connectNulls />
                  )}
                  {chartData.some(r => r.ebit !== null) && (
                    <Line dataKey="ebit" name="EBIT" stroke={EBIT_COLOR} strokeWidth={2}
                      strokeDasharray="6 3" dot={{ r: 2, fill: EBIT_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: Margin trends ── */}
        {isConfigured && chartData.some(r => r.grossMargin !== null || r.ebitMargin !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Margin Trends</CardTitle>
              <CardDescription>
                Blue = Gross Margin · Violet = EBIT Margin · Orange = OpEx Ratio — all as % of revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartData.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<MarginTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1} />
                  {chartData.some(r => r.grossMargin !== null) && (
                    <Line dataKey="grossMargin" name="Gross Margin"
                      stroke={GROSS_COLOR} strokeWidth={2} dot={{ r: 2, fill: GROSS_COLOR }} connectNulls />
                  )}
                  {chartData.some(r => r.opexRatio !== null) && (
                    <Line dataKey="opexRatio" name="OpEx Ratio"
                      stroke={OPEX_COLOR} strokeWidth={1.5} strokeDasharray="4 3"
                      dot={{ r: 2, fill: OPEX_COLOR }} connectNulls />
                  )}
                  {chartData.some(r => r.ebitMargin !== null) && (
                    <Line dataKey="ebitMargin" name="EBIT Margin"
                      stroke={MARGIN_COLOR} strokeWidth={2} dot={{ r: 2, fill: MARGIN_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: Growth rate comparison ── */}
        {isConfigured && chartData.some(r => r.revenueGrowth !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Growth Rate Comparison</CardTitle>
              <CardDescription>
                Revenue vs COGS vs OpEx growth — when COGS grows slower than Revenue, gross margin expands
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartData.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GrowthTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1.5} />
                  <Bar dataKey="revenueGrowth" name="Revenue Growth" maxBarSize={20} radius={[2, 2, 0, 0]}>
                    {chartData.map((r, i) => (
                      <Cell key={i} fill={(r.revenueGrowth ?? 0) >= 0 ? GROWTH_POS : GROWTH_NEG} fillOpacity={0.8} />
                    ))}
                  </Bar>
                  {chartData.some(r => r.cogsGrowth !== null) && (
                    <Line dataKey="cogsGrowth" name="COGS Growth"
                      stroke={COGS_COLOR} strokeWidth={1.5} strokeDasharray="4 3"
                      dot={{ r: 2, fill: COGS_COLOR }} connectNulls />
                  )}
                  {chartData.some(r => r.opexGrowth !== null) && (
                    <Line dataKey="opexGrowth" name="OpEx Growth"
                      stroke={OPEX_COLOR} strokeWidth={1.5} strokeDasharray="4 3"
                      dot={{ r: 2, fill: OPEX_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Waterfall EBIT bridge ── */}
        {isConfigured && wfData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                EBIT Bridge — {periodRows[wfBaseIdx]?.period} → {periodRows[Math.min(wfTargetIdx, periodRows.length - 1)]?.period}
              </CardTitle>
              <CardDescription>
                Decomposes EBIT change into Revenue, COGS, and OpEx effects — green = profit tailwind, red = profit headwind
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={wfData} margin={{ top: 16, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<WaterfallTooltip />} />
                  {/* Invisible base bar for waterfall positioning */}
                  <Bar dataKey="base" stackId="wf" fill="transparent" />
                  {/* Visible value bar */}
                  <Bar dataKey="value" stackId="wf" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="total" position="top" style={{ fontSize: 9, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => v.toFixed(1)} />
                    {wfData.map((bar, i) => (
                      <Cell key={i}
                        fill={bar.type === 'start' || bar.type === 'end'
                          ? WATERFALL_BASE
                          : bar.type === 'pos' ? WATERFALL_POS : WATERFALL_NEG}
                        fillOpacity={bar.type === 'start' || bar.type === 'end' ? 0.9 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Period table ── */}
        {isConfigured && periodRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Period Detail Table
              </CardTitle>
              <CardDescription>All computed metrics by period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period', 'Revenue', ...(cogsCol ? ['COGS', 'Gross Margin'] : []),
                        ...(opexCol ? ['OpEx', 'OpEx Ratio'] : []),
                        ...(cogsCol || ebitCol ? ['EBIT', 'EBIT Margin'] : []),
                        'Rev Growth', ...(cogsCol ? ['COGS Growth'] : [])
                      ].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...periodRows].reverse().map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{fmtNum(r.revenue, unit)}</td>
                        {cogsCol && <>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.cogs !== null ? fmtNum(r.cogs, unit) : '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold"
                            style={{ color: r.grossMargin !== null ? (r.grossMargin >= 40 ? EBIT_COLOR : r.grossMargin >= 20 ? '#F59E0B' : COGS_COLOR) : '#94A3B8' }}>
                            {r.grossMargin !== null ? `${r.grossMargin.toFixed(1)}%` : '—'}
                          </td>
                        </>}
                        {opexCol && <>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.opex !== null ? fmtNum(r.opex, unit) : '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.opexRatio !== null ? `${r.opexRatio.toFixed(1)}%` : '—'}</td>
                        </>}
                        {(cogsCol || ebitCol) && <>
                          <td className="px-3 py-2 font-mono text-xs font-semibold"
                            style={{ color: r.ebit !== null ? (r.ebit >= 0 ? EBIT_COLOR : COGS_COLOR) : '#94A3B8' }}>
                            {r.ebit !== null ? fmtNum(r.ebit, unit) : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold"
                            style={{ color: r.ebitMargin !== null ? (r.ebitMargin >= 10 ? EBIT_COLOR : r.ebitMargin >= 0 ? '#F59E0B' : COGS_COLOR) : '#94A3B8' }}>
                            {r.ebitMargin !== null ? `${r.ebitMargin.toFixed(1)}%` : '—'}
                          </td>
                        </>}
                        <td className="px-3 py-2">
                          {r.revenueGrowth !== null ? (
                            <span className={`font-mono text-xs font-semibold ${r.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {r.revenueGrowth >= 0 ? '+' : ''}{r.revenueGrowth.toFixed(1)}%
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        {cogsCol && (
                          <td className="px-3 py-2">
                            {r.cogsGrowth !== null ? (
                              <span className={`font-mono text-xs font-semibold ${r.cogsGrowth >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                {r.cogsGrowth >= 0 ? '+' : ''}{r.cogsGrowth.toFixed(1)}%
                              </span>
                            ) : <span className="text-slate-400">—</span>}
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
          const last     = periodRows[periodRows.length - 1];
          const first    = periodRows[0];
          const prevLast = periodRows.length >= 2 ? periodRows[periodRows.length - 2] : null;

          // Growth acceleration/deceleration
          const growthTrend = (() => {
            const recent = periodRows.slice(-4).map(r => r.revenueGrowth).filter((v): v is number => v !== null);
            if (recent.length < 3) return null;
            const first3avg = (recent[0] + recent[1]) / 2;
            const last2avg  = (recent[recent.length - 2] + recent[recent.length - 1]) / 2;
            return last2avg - first3avg;
          })();

          // Cost leverage: COGS grows slower than revenue?
          const hasLeverage = prevLast && last.cogs !== null && prevLast.cogs !== null
            && last.cogsGrowth !== null && last.revenueGrowth !== null
            && last.cogsGrowth < last.revenueGrowth;

          // OpEx creep
          const opexCreep = periodRows.length >= 4
            ? (() => {
                const ratios = periodRows.slice(-4).map(r => r.opexRatio).filter((v): v is number => v !== null);
                if (ratios.length < 3) return null;
                return ratios[ratios.length - 1] - ratios[0];
              })()
            : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated revenue and cost driver analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Financial Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{stats.periods}</span> periods from{' '}
                    <span className="font-semibold">{first.period}</span> to{' '}
                    <span className="font-semibold">{last.period}</span>.
                    Revenue grew <span className={`font-semibold ${(stats.totalRevGrowth ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {stats.totalRevGrowth !== null ? `${stats.totalRevGrowth >= 0 ? '+' : ''}${stats.totalRevGrowth.toFixed(1)}%` : '—'}
                    </span> in total.
                    Latest EBIT margin: <span className="font-semibold">{stats.latestEbitMargin !== null ? `${stats.latestEbitMargin.toFixed(1)}%` : '—'}</span>
                    {stats.marginDrift !== null && (
                      <> (<span className={stats.marginDrift >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                        {stats.marginDrift >= 0 ? '+' : ''}{stats.marginDrift.toFixed(1)}pp
                      </span> vs first period)</>
                    )}.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Rev Growth',  value: stats.totalRevGrowth  !== null ? `${stats.totalRevGrowth >= 0 ? '+' : ''}${stats.totalRevGrowth.toFixed(1)}%` : '—',  sub: `${first.period} → ${last.period}` },
                    { label: 'Avg Rev Growth',    value: stats.avgRevGrowth    !== null ? `${stats.avgRevGrowth >= 0 ? '+' : ''}${stats.avgRevGrowth.toFixed(1)}%` : '—',    sub: 'period-over-period avg' },
                    { label: 'Gross Margin Δ',    value: stats.firstGrossMargin !== null && stats.latestGrossMargin !== null ? `${(stats.latestGrossMargin - stats.firstGrossMargin) >= 0 ? '+' : ''}${(stats.latestGrossMargin - stats.firstGrossMargin).toFixed(1)}pp` : '—', sub: 'first vs last period' },
                    { label: 'EBIT Margin Δ',     value: stats.marginDrift     !== null ? `${stats.marginDrift >= 0 ? '+' : ''}${stats.marginDrift.toFixed(1)}pp` : '—',     sub: 'first vs last period' },
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

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Revenue Growth Trajectory</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {stats.avgRevGrowth !== null
                          ? `Average period-over-period revenue growth was ${stats.avgRevGrowth >= 0 ? '+' : ''}${stats.avgRevGrowth.toFixed(1)}% over the analyzed period.`
                          : 'Insufficient data for average growth.'}
                        {' '}
                        {growthTrend !== null
                          ? growthTrend > 1
                            ? `Growth is accelerating — the most recent periods show a ${growthTrend.toFixed(1)}pp improvement in growth rate vs the prior sub-period. This is a positive signal for top-line momentum.`
                            : growthTrend < -1
                            ? `Growth is decelerating — the most recent periods show a ${Math.abs(growthTrend).toFixed(1)}pp slowdown in growth rate. Monitor whether this is cyclical or a structural shift.`
                            : 'Growth has been relatively stable, with no significant acceleration or deceleration over recent periods.'
                          : ''}
                        {stats.latestGrowth !== null && stats.avgRevGrowth !== null && (
                          <> The latest period growth of <span className={`font-semibold ${stats.latestGrowth >= stats.avgRevGrowth ? 'text-emerald-600' : 'text-red-500'}`}>{stats.latestGrowth >= 0 ? '+' : ''}{stats.latestGrowth.toFixed(1)}%</span> is {stats.latestGrowth >= stats.avgRevGrowth ? 'above' : 'below'} the historical average.</>
                        )}
                      </p>
                    </div>
                  </div>

                  {(last.grossMargin !== null || last.ebitMargin !== null) && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Margin Structure</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.grossMargin !== null && (
                            <>Latest gross margin is <span className="font-semibold">{last.grossMargin.toFixed(1)}%</span>
                            {first.grossMargin !== null && (() => {
                              const d = last.grossMargin! - first.grossMargin!;
                              return <>, a <span className={`font-semibold ${d >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{d >= 0 ? '+' : ''}{d.toFixed(1)}pp</span> shift since {first.period}. {d > 2 ? 'This indicates meaningful COGS efficiency gains — either input cost reduction, pricing power, or mix shift toward higher-margin products.' : d < -2 ? 'This indicates gross margin compression — rising input costs, pricing pressure, or mix shift toward lower-margin products.' : 'Gross margin has been relatively stable.'}</>;
                            })()}. </>
                          )}
                          {last.ebitMargin !== null && last.grossMargin !== null && last.opexRatio !== null && (
                            <>The gap between gross margin ({last.grossMargin.toFixed(1)}%) and EBIT margin ({last.ebitMargin.toFixed(1)}%) reflects OpEx of {last.opexRatio.toFixed(1)}% of revenue. {last.opexRatio > 25 ? 'OpEx is a significant cost layer — watch for operational leverage as revenue scales.' : 'OpEx is well-controlled relative to revenue.'}</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {hasLeverage !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Cost Leverage</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {hasLeverage
                            ? `COGS grew ${last.cogsGrowth?.toFixed(1)}% while revenue grew ${last.revenueGrowth?.toFixed(1)}% in the latest period — a positive cost leverage signal. When cost of goods grows slower than revenue, gross margin expands automatically. This can result from pricing power, scale economies, or favorable input cost trends.`
                            : `COGS grew ${last.cogsGrowth?.toFixed(1)}% vs revenue growth of ${last.revenueGrowth?.toFixed(1)}% in the latest period — COGS is outpacing revenue, which compresses gross margin. This warrants monitoring for cost control or pricing adjustment.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {opexCreep !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          OpEx Ratio Trend — {opexCreep >= 0 ? 'Rising' : 'Declining'}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {opexCreep > 1
                            ? `OpEx as a % of revenue has risen by ${opexCreep.toFixed(1)}pp over the last 4 periods — cost creep is active. If this coincides with investment in growth (R&D, sales headcount), it may be intentional. If not, it represents efficiency deterioration that will compress EBIT margin unless reversed.`
                            : opexCreep < -1
                            ? `OpEx as a % of revenue has declined by ${Math.abs(opexCreep).toFixed(1)}pp over the last 4 periods — positive operational leverage is occurring. As revenue scales, fixed operating costs are spreading over a larger base, improving EBIT margin without top-line acceleration.`
                            : 'OpEx ratio has been relatively stable over recent periods — no significant leverage or creep.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {wfData.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          EBIT Bridge — {periodRows[wfBaseIdx]?.period} → {periodRows[Math.min(wfTargetIdx, periodRows.length - 1)]?.period}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {(() => {
                            const revBar  = wfData.find(b => b.name === 'Revenue');
                            const cogsBar = wfData.find(b => b.name === 'COGS');
                            const opexBar = wfData.find(b => b.name === 'OpEx');
                            const baseBar = wfData.find(b => b.type === 'start');
                            const endBar  = wfData.find(b => b.type === 'end');
                            const parts: string[] = [];
                            if (revBar)  parts.push(`Revenue contributed ${revBar.type === 'pos' ? '+' : '−'}${Math.abs(revBar.value).toFixed(1)} to EBIT`);
                            if (cogsBar) parts.push(`COGS changes ${cogsBar.type === 'pos' ? 'added +' : 'subtracted −'}${Math.abs(cogsBar.value).toFixed(1)}`);
                            if (opexBar) parts.push(`OpEx changes ${opexBar.type === 'pos' ? 'contributed +' : 'subtracted −'}${Math.abs(opexBar.value).toFixed(1)}`);
                            const ebitChange = endBar && baseBar ? endBar.total - baseBar.total : null;
                            return (
                              <>
                                {parts.join('. ')}.
                                {ebitChange !== null && (
                                  <> Total EBIT{' '}
                                    <span className={`font-semibold ${ebitChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {ebitChange >= 0 ? 'improved by +' : 'declined by −'}{Math.abs(ebitChange).toFixed(1)}
                                    </span>
                                    {' '}between {periodRows[wfBaseIdx]?.period} and {periodRows[Math.min(wfTargetIdx, periodRows.length - 1)]?.period}.
                                    {' '}{ebitChange >= 0
                                      ? 'The primary driver of improvement is ' + (revBar && revBar.type === 'pos' ? 'revenue growth' : cogsBar && cogsBar.type === 'pos' ? 'COGS efficiency' : 'OpEx control') + '.'
                                      : 'The primary drag is ' + (cogsBar && cogsBar.type === 'neg' ? 'rising COGS' : opexBar && opexBar.type === 'neg' ? 'rising OpEx' : 'revenue decline') + '.'}
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Gross Profit = Revenue − COGS. EBIT = Gross Profit − OpEx (auto-computed if not provided directly).
                  Growth rates are period-over-period. Margin ratios are expressed as % of revenue.
                  EBIT Bridge decomposes profit change into Revenue effect, COGS effect, and OpEx effect — residual is labeled Other.
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
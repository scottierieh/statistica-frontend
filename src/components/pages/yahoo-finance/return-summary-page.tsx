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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ComposedChart,
  Legend,
  Line,
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
  BarChart3,
  Activity,
  Droplets,
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

interface CFRow {
  period: string;
  netIncome: number;
  da: number | null;           // D&A
  workingCapital: number | null; // ΔWorking Capital
  otherOperating: number | null;
  cfo: number | null;          // Cash from Operations
  capex: number | null;        // Capital Expenditure (negative = outflow)
  otherInvesting: number | null;
  cfi: number | null;          // Cash from Investing
  debtChange: number | null;   // Net debt issuance/repayment
  equityChange: number | null; // Equity issuance/buybacks
  dividends: number | null;
  otherFinancing: number | null;
  cff: number | null;          // Cash from Financing
  beginCash: number | null;
  endCash: number | null;
  freeCashFlow: number | null; // CFO - CapEx
}

interface WaterfallBar {
  name: string;
  base: number;
  value: number;
  total: number;
  type: 'start' | 'pos' | 'neg' | 'end';
}

// ============================================
// Constants
// ============================================

const CFO_COLOR   = '#6C3AED'; // violet - operating
const CFI_COLOR   = '#EF4444'; // red    - investing
const CFF_COLOR   = '#3B82F6'; // blue   - financing
const FCF_COLOR   = '#10B981'; // green  - free cash flow
const NI_COLOR    = '#F59E0B'; // amber  - net income
const WF_POS      = '#10B981';
const WF_NEG      = '#EF4444';
const WF_BASE     = '#6C3AED';
const WF_END      = '#3B82F6';

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

  let cash = 500;
  let ni   = 120;

  return quarters.map((q, i) => {
    ni      = ni * (1 + 0.03 + (Math.random() - 0.4) * 0.04);
    const da             = ni * (0.15 + Math.random() * 0.05);
    const wc             = -(ni * (0.04 + (Math.random() - 0.5) * 0.06));
    const otherOp        = ni * (-0.02 + (Math.random() - 0.5) * 0.04);
    const cfo            = ni + da + wc + otherOp;
    const capex          = -(ni * (0.3 + Math.random() * 0.1));
    const otherInv       = (Math.random() - 0.7) * 50;
    const cfi            = capex + otherInv;
    const debtChg        = (Math.random() - 0.5) * 80;
    const divs           = -(ni * 0.12);
    const equityChg      = i % 4 === 3 ? -(ni * 0.08) : 0;
    const cff            = debtChg + divs + equityChg;
    const beginCash      = cash;
    cash                 = Math.max(50, cash + cfo + cfi + cff);
    const fcf            = cfo + capex;

    return {
      period:         q,
      net_income:     parseFloat(ni.toFixed(1)),
      da:             parseFloat(da.toFixed(1)),
      working_capital:parseFloat(wc.toFixed(1)),
      other_operating:parseFloat(otherOp.toFixed(1)),
      cfo:            parseFloat(cfo.toFixed(1)),
      capex:          parseFloat(capex.toFixed(1)),
      other_investing:parseFloat(otherInv.toFixed(1)),
      cfi:            parseFloat(cfi.toFixed(1)),
      debt_change:    parseFloat(debtChg.toFixed(1)),
      dividends:      parseFloat(divs.toFixed(1)),
      equity_change:  parseFloat(equityChg.toFixed(1)),
      cff:            parseFloat(cff.toFixed(1)),
      begin_cash:     parseFloat(beginCash.toFixed(1)),
      end_cash:       parseFloat(cash.toFixed(1)),
      free_cash_flow: parseFloat(fcf.toFixed(1)),
    };
  });
}

// ============================================
// Computation helpers
// ============================================

function buildCFRows(
  data: Record<string, any>[],
  cols: {
    period: string; netIncome: string;
    da: string; workingCapital: string; otherOperating: string; cfo: string;
    capex: string; otherInvesting: string; cfi: string;
    debtChange: string; equityChange: string; dividends: string; otherFinancing: string; cff: string;
    beginCash: string; endCash: string;
  }
): CFRow[] {
  return data
    .map(r => {
      const g = (k: string) => k ? (isFinite(parseFloat(r[k])) ? parseFloat(r[k]) : null) : null;
      const netIncome = parseFloat(r[cols.netIncome]);
      if (!cols.period || !isFinite(netIncome)) return null;

      const da            = g(cols.da);
      const wc            = g(cols.workingCapital);
      const otherOp       = g(cols.otherOperating);
      const cfoRaw        = g(cols.cfo);
      const capex         = g(cols.capex);
      const otherInv      = g(cols.otherInvesting);
      const cfiRaw        = g(cols.cfi);
      const debtChg       = g(cols.debtChange);
      const equityChg     = g(cols.equityChange);
      const divs          = g(cols.dividends);
      const otherFin      = g(cols.otherFinancing);
      const cffRaw        = g(cols.cff);
      const beginCash     = g(cols.beginCash);
      const endCash       = g(cols.endCash);

      // Auto-compute CFO if not provided
      const cfo = cfoRaw !== null ? cfoRaw
        : (da !== null && wc !== null) ? netIncome + da + wc + (otherOp ?? 0)
        : null;

      // Auto-compute CFI
      const cfi = cfiRaw !== null ? cfiRaw
        : capex !== null ? capex + (otherInv ?? 0)
        : null;

      // Auto-compute CFF
      const cff = cffRaw !== null ? cffRaw
        : (debtChg !== null || divs !== null)
          ? (debtChg ?? 0) + (equityChg ?? 0) + (divs ?? 0) + (otherFin ?? 0)
        : null;

      const fcf = cfo !== null && capex !== null ? cfo + capex : null;

      return {
        period: String(r[cols.period] ?? '').trim(),
        netIncome,
        da, workingCapital: wc, otherOperating: otherOp, cfo,
        capex, otherInvesting: otherInv, cfi,
        debtChange: debtChg, equityChange: equityChg, dividends: divs, otherFinancing: otherFin, cff,
        beginCash, endCash,
        freeCashFlow: fcf,
      } as CFRow;
    })
    .filter((r): r is CFRow => r !== null && r.period !== '');
}

function buildCFWaterfall(row: CFRow): WaterfallBar[] {
  const bars: WaterfallBar[] = [];
  let running = row.netIncome;

  bars.push({ name: 'Net Income', base: 0, value: running, total: running, type: 'start' });

  const drivers: { name: string; val: number | null }[] = [
    { name: 'D&A',            val: row.da },
    { name: 'Δ Working Cap',  val: row.workingCapital },
    { name: 'Other Operating',val: row.otherOperating },
  ];

  // Add investing / financing components
  if (row.capex !== null)       drivers.push({ name: 'CapEx',       val: row.capex });
  if (row.otherInvesting !== null && row.otherInvesting !== 0) drivers.push({ name: 'Other Investing', val: row.otherInvesting });
  if (row.debtChange !== null && row.debtChange !== 0) drivers.push({ name: 'Debt Change', val: row.debtChange });
  if (row.dividends !== null && row.dividends !== 0)   drivers.push({ name: 'Dividends',   val: row.dividends });
  if (row.equityChange !== null && row.equityChange !== 0) drivers.push({ name: 'Equity Change', val: row.equityChange });

  for (const d of drivers) {
    if (d.val === null || d.val === 0) continue;
    bars.push({
      name:  d.name,
      base:  d.val > 0 ? running : running + d.val,
      value: Math.abs(d.val),
      total: running + d.val,
      type:  d.val > 0 ? 'pos' : 'neg',
    });
    running += d.val;
  }

  // End: Ending Cash (if available) or net cash
  const endVal = row.endCash !== null ? row.endCash : running;
  bars.push({ name: 'End Cash', base: 0, value: endVal, total: endVal, type: 'end' });
  return bars;
}

function autoUnit(rows: CFRow[]): string {
  const max = Math.max(...rows.map(r => Math.abs(r.netIncome)));
  if (max >= 1_000_000) return 'M';
  if (max >= 1_000)     return 'K';
  return '';
}

function scaleVal(v: number, unit: string): number {
  if (unit === 'M') return parseFloat((v / 1_000_000).toFixed(3));
  if (unit === 'K') return parseFloat((v / 1_000).toFixed(3));
  return parseFloat(v.toFixed(2));
}

function fmtNum(v: number, unit: string): string {
  const abs  = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (unit === 'M' || abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (unit === 'K' || abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(1)}`;
}

// ============================================
// Tooltips
// ============================================

const WaterfallTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as WaterfallBar;
  if (!d) return null;
  const isNet = d.type === 'pos' || d.type === 'neg';
  const sign  = d.type === 'neg' ? '-' : d.type === 'pos' ? '+' : '';
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">{isNet ? 'Impact' : 'Cash'}</span>
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

const LineTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.stroke ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? fmtNum(p.value, unit ?? '') : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className={`font-mono font-semibold ${typeof p.value === 'number' && p.value < 0 ? 'text-red-500' : ''}`}>
            {typeof p.value === 'number' ? fmtNum(p.value, unit ?? '') : p.value}
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
            <Droplets className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Cash Flow Bridge</CardTitle>
        <CardDescription className="text-base mt-2">
          Visualize step-by-step how net income flows into ending cash — decompose operating, investing, and financing activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Cash Flow Waterfall',
              desc:  'Bridge from Net Income to Ending Cash — show each component (D&A, Working Capital, CapEx, Debt, Dividends) as a waterfall step.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'CFO / CFI / CFF Trends',
              desc:  'Track operating, investing, and financing cash flows over time — identify periods of cash generation vs cash burn.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Free Cash Flow Analysis',
              desc:  'Monitor FCF (CFO − CapEx) as the clearest signal of a company\'s ability to generate cash after maintaining its asset base.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Component legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: CFO_COLOR, label: 'CFO',          desc: 'Cash from Operations' },
            { color: CFI_COLOR, label: 'CFI',          desc: 'Cash from Investing' },
            { color: CFF_COLOR, label: 'CFF',          desc: 'Cash from Financing' },
            { color: FCF_COLOR, label: 'Free Cash Flow', desc: 'CFO − CapEx' },
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
            Use Cash Flow Bridge to understand <em>why</em> ending cash changed — not just by how much.
            The waterfall decomposes each line item so you can see whether cash is being consumed by working capital build-up,
            heavy CapEx, debt repayments, or dividend distributions — or generated by strong operations and D&A add-backs.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>period</strong> — time label (e.g. "2023Q1")</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>net_income</strong> — starting point of the bridge</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>cfo / cfi / cff</strong> — section totals (optional if components provided)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>capex, da, dividends</strong> etc. — individual components (optional)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Waterfall bridge: Net Income → End Cash</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>CFO / CFI / CFF trend over time</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Free Cash Flow vs Net Income comparison</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Cash balance trend with auto-generated insights</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Droplets className="mr-2 h-5 w-5" />
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

export default function CashFlowBridgePage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ─────────────────────────────────────────
  const [periodCol,       setPeriodCol]       = useState('');
  const [netIncomeCol,    setNetIncomeCol]     = useState('');
  const [daCol,           setDaCol]           = useState('');
  const [wcCol,           setWcCol]           = useState('');
  const [otherOpCol,      setOtherOpCol]       = useState('');
  const [cfoCol,          setCfoCol]          = useState('');
  const [capexCol,        setCapexCol]        = useState('');
  const [otherInvCol,     setOtherInvCol]     = useState('');
  const [cfiCol,          setCfiCol]          = useState('');
  const [debtChgCol,      setDebtChgCol]      = useState('');
  const [equityChgCol,    setEquityChgCol]    = useState('');
  const [dividendsCol,    setDividendsCol]    = useState('');
  const [otherFinCol,     setOtherFinCol]     = useState('');
  const [cffCol,          setCffCol]          = useState('');
  const [beginCashCol,    setBeginCashCol]    = useState('');
  const [endCashCol,      setEndCashCol]      = useState('');

  // ── Waterfall period selection ─────────────────────────────
  const [wfPeriodIdx, setWfPeriodIdx] = useState(0);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_cashflow_bridge.csv');
    setPeriodCol('period');       setNetIncomeCol('net_income');
    setDaCol('da');               setWcCol('working_capital');
    setOtherOpCol('other_operating'); setCfoCol('cfo');
    setCapexCol('capex');         setOtherInvCol('other_investing');
    setCfiCol('cfi');             setDebtChgCol('debt_change');
    setEquityChgCol('equity_change'); setDividendsCol('dividends');
    setCffCol('cff');             setBeginCashCol('begin_cash');
    setEndCashCol('end_cash');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setNetIncomeCol(''); setDaCol(''); setWcCol('');
    setOtherOpCol(''); setCfoCol(''); setCapexCol(''); setOtherInvCol('');
    setCfiCol(''); setDebtChgCol(''); setEquityChgCol(''); setDividendsCol('');
    setOtherFinCol(''); setCffCol(''); setBeginCashCol(''); setEndCashCol('');
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
    detect(['period', 'quarter', 'year', 'date'],            setPeriodCol,    periodCol);
    detect(['net_income', 'netincome', 'ni', 'earnings'],    setNetIncomeCol, netIncomeCol);
    detect(['da', 'd&a', 'depreciation', 'amortization'],   setDaCol,        daCol);
    detect(['working_capital', 'wc', 'nwc'],                 setWcCol,        wcCol);
    detect(['cfo', 'operating_cash', 'cash_from_operations'],setCfoCol,       cfoCol);
    detect(['capex', 'capital_expenditure', 'capex_net'],    setCapexCol,     capexCol);
    detect(['cfi', 'investing_cash', 'cash_from_investing'], setCfiCol,       cfiCol);
    detect(['debt_change', 'net_debt', 'debt_issuance'],     setDebtChgCol,   debtChgCol);
    detect(['dividends', 'dividend'],                        setDividendsCol, dividendsCol);
    detect(['cff', 'financing_cash', 'cash_from_financing'], setCffCol,       cffCol);
    detect(['begin_cash', 'beginning_cash', 'cash_begin'],   setBeginCashCol, beginCashCol);
    detect(['end_cash', 'ending_cash', 'cash_end'],          setEndCashCol,   endCashCol);
  }, [hasData, allHeaders]);

  // ── Build rows ─────────────────────────────────────────────
  const cfRows = useMemo(() => {
    if (!periodCol || !netIncomeCol) return [];
    return buildCFRows(data, {
      period: periodCol, netIncome: netIncomeCol,
      da: daCol, workingCapital: wcCol, otherOperating: otherOpCol, cfo: cfoCol,
      capex: capexCol, otherInvesting: otherInvCol, cfi: cfiCol,
      debtChange: debtChgCol, equityChange: equityChgCol, dividends: dividendsCol,
      otherFinancing: otherFinCol, cff: cffCol,
      beginCash: beginCashCol, endCash: endCashCol,
    });
  }, [data, periodCol, netIncomeCol, daCol, wcCol, otherOpCol, cfoCol,
      capexCol, otherInvCol, cfiCol, debtChgCol, equityChgCol, dividendsCol,
      otherFinCol, cffCol, beginCashCol, endCashCol]);

  const unit = useMemo(() => autoUnit(cfRows), [cfRows]);

  // ── Waterfall for selected period ─────────────────────────
  const wfData = useMemo(() => {
    if (!cfRows.length) return [];
    const idx = Math.min(wfPeriodIdx, cfRows.length - 1);
    return buildCFWaterfall(cfRows[idx]);
  }, [cfRows, wfPeriodIdx]);

  // ── Trend chart data ───────────────────────────────────────
  const trendData = useMemo(() =>
    cfRows.map(r => ({
      period:       r.period,
      netIncome:    scaleVal(r.netIncome, unit),
      cfo:          r.cfo          !== null ? scaleVal(r.cfo, unit)          : null,
      cfi:          r.cfi          !== null ? scaleVal(r.cfi, unit)          : null,
      cff:          r.cff          !== null ? scaleVal(r.cff, unit)          : null,
      freeCashFlow: r.freeCashFlow !== null ? scaleVal(r.freeCashFlow, unit) : null,
      endCash:      r.endCash      !== null ? scaleVal(r.endCash, unit)      : null,
    })),
    [cfRows, unit]
  );

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (cfRows.length < 1) return null;
    const last  = cfRows[cfRows.length - 1];
    const first = cfRows[0];
    const fcfRows = cfRows.filter(r => r.freeCashFlow !== null);
    const avgFCF  = fcfRows.length
      ? fcfRows.reduce((s, r) => s + r.freeCashFlow!, 0) / fcfRows.length : null;
    const cfoRows = cfRows.filter(r => r.cfo !== null);
    const avgCFO  = cfoRows.length
      ? cfoRows.reduce((s, r) => s + r.cfo!, 0) / cfoRows.length : null;
    const cashChange = last.endCash !== null && first.beginCash !== null
      ? last.endCash - first.beginCash : null;
    return {
      periods:      cfRows.length,
      latestPeriod: last.period,
      latestCFO:    last.cfo,
      latestFCF:    last.freeCashFlow,
      latestEndCash:last.endCash,
      avgFCF, avgCFO, cashChange,
      firstPeriod:  first.period,
    };
  }, [cfRows]);

  const isConfigured    = !!(periodCol && netIncomeCol && cfRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!cfRows.length) return;
    const rows = cfRows.map(r => ({
      period:          r.period,
      net_income:      r.netIncome,
      da:              r.da              ?? '',
      working_capital: r.workingCapital  ?? '',
      cfo:             r.cfo             ?? '',
      capex:           r.capex           ?? '',
      cfi:             r.cfi             ?? '',
      debt_change:     r.debtChange      ?? '',
      dividends:       r.dividends       ?? '',
      cff:             r.cff             ?? '',
      begin_cash:      r.beginCash       ?? '',
      end_cash:        r.endCash         ?? '',
      free_cash_flow:  r.freeCashFlow    ?? '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `CashFlowBridge_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [cfRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `CashFlowBridge_${new Date().toISOString().split('T')[0]}.png`;
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
            <Droplets className="h-5 w-5" />
            Cash Flow Bridge
          </CardTitle>
          <CardDescription>
            Visualize step-by-step how net income converts into ending cash — decompose operating, investing, and financing activities to identify cash drivers and drains.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map period and cash flow columns. Only Period and Net Income are required — all other columns are optional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Required */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Required</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'PERIOD *',     value: periodCol,    setter: setPeriodCol,    headers: allHeaders     },
                { label: 'NET INCOME *', value: netIncomeCol, setter: setNetIncomeCol, headers: numericHeaders },
                { label: 'END CASH',     value: endCashCol,   setter: setEndCashCol,   headers: numericHeaders },
                { label: 'BEGIN CASH',   value: beginCashCol, setter: setBeginCashCol, headers: numericHeaders },
              ].map(({ label, value, setter, headers }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                  <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Operating */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Operating Activities</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'D&A',             value: daCol,      setter: setDaCol      },
                { label: 'Δ WORKING CAP',   value: wcCol,      setter: setWcCol      },
                { label: 'OTHER OPERATING', value: otherOpCol, setter: setOtherOpCol },
                { label: 'CFO (TOTAL)',      value: cfoCol,     setter: setCfoCol     },
              ].map(({ label, value, setter }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                  <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Investing */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Investing Activities</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'CAPEX',           value: capexCol,   setter: setCapexCol   },
                { label: 'OTHER INVESTING', value: otherInvCol,setter: setOtherInvCol},
                { label: 'CFI (TOTAL)',      value: cfiCol,     setter: setCfiCol     },
              ].map(({ label, value, setter }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                  <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Financing */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Financing Activities</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'DEBT CHANGE',     value: debtChgCol,   setter: setDebtChgCol   },
                { label: 'EQUITY CHANGE',   value: equityChgCol, setter: setEquityChgCol },
                { label: 'DIVIDENDS',        value: dividendsCol, setter: setDividendsCol },
                { label: 'CFF (TOTAL)',      value: cffCol,       setter: setCffCol       },
              ].map(({ label, value, setter }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                  <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Waterfall period selection */}
          {isConfigured && cfRows.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                WATERFALL BRIDGE — SELECT PERIOD
              </Label>
              <Select
                value={String(wfPeriodIdx)}
                onValueChange={v => setWfPeriodIdx(parseInt(v))}>
                <SelectTrigger className="text-xs h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cfRows.map((r, i) => (
                    <SelectItem key={i} value={String(i)}>{r.period}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest CFO</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestCFO !== null ? fmtNum(stats.latestCFO, unit) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{stats.latestPeriod}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Free Cash Flow</div>
            <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
              {stats.latestFCF !== null
                ? (stats.latestFCF >= 0 ? <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" /> : <ArrowDownRight className="h-5 w-5 shrink-0 text-red-500" />)
                : <Minus className="h-5 w-5 shrink-0 text-slate-400" />}
              {stats.latestFCF !== null ? fmtNum(stats.latestFCF, unit) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Avg: {stats.avgFCF !== null ? fmtNum(stats.avgFCF, unit) : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ending Cash</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestEndCash !== null ? fmtNum(stats.latestEndCash, unit) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{stats.latestPeriod}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cash Change</div>
            <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
              {stats.cashChange !== null
                ? (stats.cashChange >= 0 ? <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" /> : <ArrowDownRight className="h-5 w-5 shrink-0 text-red-500" />)
                : <Minus className="h-5 w-5 shrink-0 text-slate-400" />}
              {stats.cashChange !== null ? fmtNum(stats.cashChange, unit) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.firstPeriod} → {stats.latestPeriod}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Waterfall Bridge ── */}
        {isConfigured && wfData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Cash Flow Bridge — {cfRows[Math.min(wfPeriodIdx, cfRows.length - 1)]?.period}
              </CardTitle>
              <CardDescription>
                Net Income → Ending Cash — green = cash inflow, red = cash outflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={wfData} margin={{ top: 20, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<WaterfallTooltip />} />
                  <Bar dataKey="base" stackId="wf" fill="transparent" />
                  <Bar dataKey="value" stackId="wf" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="total" position="top"
                      style={{ fontSize: 9, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => v.toFixed(1)} />
                    {wfData.map((bar, i) => (
                      <Cell key={i}
                        fill={
                          bar.type === 'start' ? WF_BASE :
                          bar.type === 'end'   ? WF_END  :
                          bar.type === 'pos'   ? WF_POS  : WF_NEG
                        }
                        fillOpacity={bar.type === 'start' || bar.type === 'end' ? 0.9 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 justify-end">
                {[
                  { color: WF_BASE, label: 'Starting / Net Income' },
                  { color: WF_POS,  label: 'Cash Inflow' },
                  { color: WF_NEG,  label: 'Cash Outflow' },
                  { color: WF_END,  label: 'Ending Cash' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: CFO / CFI / CFF Trend ── */}
        {isConfigured && trendData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">CFO / CFI / CFF Trend</CardTitle>
              <CardDescription>
                Operating (violet), Investing (red), Financing (blue) cash flows over time — unit: {unit || 'absolute'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={trendData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<LineTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1.5} />
                  {trendData.some(r => r.cfo !== null) && (
                    <Line dataKey="cfo" name="CFO" stroke={CFO_COLOR} strokeWidth={2}
                      dot={{ r: 2.5, fill: CFO_COLOR }} connectNulls />
                  )}
                  {trendData.some(r => r.cfi !== null) && (
                    <Line dataKey="cfi" name="CFI" stroke={CFI_COLOR} strokeWidth={2}
                      strokeDasharray="4 3" dot={{ r: 2.5, fill: CFI_COLOR }} connectNulls />
                  )}
                  {trendData.some(r => r.cff !== null) && (
                    <Line dataKey="cff" name="CFF" stroke={CFF_COLOR} strokeWidth={2}
                      strokeDasharray="6 3" dot={{ r: 2.5, fill: CFF_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: FCF vs Net Income ── */}
        {isConfigured && trendData.some(r => r.freeCashFlow !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Free Cash Flow vs Net Income</CardTitle>
              <CardDescription>
                FCF (green bars) vs Net Income (amber line) — gap reveals quality of earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={trendData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<BarTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1} />
                  <Bar dataKey="freeCashFlow" name="Free Cash Flow" maxBarSize={28} radius={[3, 3, 0, 0]}>
                    {trendData.map((r, i) => (
                      <Cell key={i} fill={(r.freeCashFlow ?? 0) >= 0 ? FCF_COLOR : CFI_COLOR} fillOpacity={0.8} />
                    ))}
                  </Bar>
                  <Line dataKey="netIncome" name="Net Income" stroke={NI_COLOR}
                    strokeWidth={2} dot={{ r: 2, fill: NI_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Cash Balance ── */}
        {isConfigured && trendData.some(r => r.endCash !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cash Balance Trend</CardTitle>
              <CardDescription>Ending cash position over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={trendData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<LineTooltip unit={unit} />} />
                  <Bar dataKey="endCash" name="Ending Cash" fill={CFF_COLOR} fillOpacity={0.15} maxBarSize={40} />
                  <Line dataKey="endCash" name="Ending Cash" stroke={CFF_COLOR}
                    strokeWidth={2} dot={{ r: 2.5, fill: CFF_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Period Table ── */}
        {isConfigured && cfRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Period Detail Table
              </CardTitle>
              <CardDescription>All computed cash flow metrics by period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period', 'Net Income', 'CFO', 'CapEx', 'Free Cash Flow', 'CFI', 'CFF', 'End Cash'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...cfRows].reverse().map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{fmtNum(r.netIncome, unit)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold"
                          style={{ color: r.cfo !== null ? (r.cfo >= 0 ? CFO_COLOR : CFI_COLOR) : '#94A3B8' }}>
                          {r.cfo !== null ? fmtNum(r.cfo, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-red-500">
                          {r.capex !== null ? fmtNum(r.capex, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold"
                          style={{ color: r.freeCashFlow !== null ? (r.freeCashFlow >= 0 ? FCF_COLOR : CFI_COLOR) : '#94A3B8' }}>
                          {r.freeCashFlow !== null ? fmtNum(r.freeCashFlow, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs"
                          style={{ color: r.cfi !== null ? (r.cfi >= 0 ? FCF_COLOR : CFI_COLOR) : '#94A3B8' }}>
                          {r.cfi !== null ? fmtNum(r.cfi, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs"
                          style={{ color: r.cff !== null ? (r.cff >= 0 ? FCF_COLOR : CFI_COLOR) : '#94A3B8' }}>
                          {r.cff !== null ? fmtNum(r.cff, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">
                          {r.endCash !== null ? fmtNum(r.endCash, unit) : '—'}
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
        {isConfigured && stats && (() => {
          const last     = cfRows[cfRows.length - 1];
          const first    = cfRows[0];

          const fcfPositivePeriods = cfRows.filter(r => r.freeCashFlow !== null && r.freeCashFlow > 0).length;
          const fcfTotal = cfRows.filter(r => r.freeCashFlow !== null).length;
          const fcfPct   = fcfTotal > 0 ? (fcfPositivePeriods / fcfTotal) * 100 : null;

          const avgCapexRatio = (() => {
            const valid = cfRows.filter(r => r.capex !== null && r.cfo !== null && r.cfo !== 0);
            if (!valid.length) return null;
            return valid.reduce((s, r) => s + Math.abs(r.capex!) / r.cfo!, 0) / valid.length * 100;
          })();

          const cashConversion = last.cfo !== null && last.netIncome !== 0
            ? (last.cfo / last.netIncome) * 100 : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated cash flow analysis summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Cash Flow Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{stats.periods}</span> periods from{' '}
                    <span className="font-semibold">{first.period}</span> to{' '}
                    <span className="font-semibold">{last.period}</span>.
                    Latest CFO: <span className="font-semibold">{stats.latestCFO !== null ? fmtNum(stats.latestCFO, unit) : '—'}</span>.
                    Latest FCF: <span className={`font-semibold ${(stats.latestFCF ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {stats.latestFCF !== null ? fmtNum(stats.latestFCF, unit) : '—'}
                    </span>.
                    {stats.cashChange !== null && (
                      <> Total cash {stats.cashChange >= 0 ? 'built up' : 'declined'} by{' '}
                        <span className={`font-semibold ${stats.cashChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fmtNum(Math.abs(stats.cashChange), unit)}
                        </span> over the full period.</>
                    )}
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Avg CFO',       value: stats.avgCFO !== null  ? fmtNum(stats.avgCFO, unit)  : '—', sub: 'per period' },
                    { label: 'Avg FCF',       value: stats.avgFCF !== null  ? fmtNum(stats.avgFCF, unit)  : '—', sub: 'per period' },
                    { label: 'FCF Positive',  value: fcfPct !== null        ? `${fcfPct.toFixed(0)}%`     : '—', sub: 'of all periods' },
                    { label: 'Cash Conversion', value: cashConversion !== null ? `${cashConversion.toFixed(0)}%` : '—', sub: 'CFO / Net Income' },
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

                  {cashConversion !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Earnings Quality</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Cash conversion ratio (CFO / Net Income) is{' '}
                          <span className="font-semibold">{cashConversion.toFixed(0)}%</span>.
                          {cashConversion >= 100
                            ? ' A ratio above 100% indicates strong earnings quality — the company is converting more than its reported profit into actual cash, supported by favorable working capital dynamics or D&A add-backs.'
                            : cashConversion >= 70
                            ? ' A ratio between 70–100% is acceptable, though working capital usage or accrual timing is consuming some of the reported earnings.'
                            : ' A ratio below 70% warrants scrutiny — earnings may be outpacing cash generation due to rising receivables, inventory build-up, or aggressive revenue recognition.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {fcfPct !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Free Cash Flow Consistency</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          FCF was positive in <span className="font-semibold">{fcfPct.toFixed(0)}%</span> of periods
                          ({fcfPositivePeriods} of {fcfTotal}).
                          {fcfPct >= 80
                            ? ' Highly consistent FCF generation signals a capital-light, self-funding business model with strong operational leverage.'
                            : fcfPct >= 50
                            ? ' FCF is positive in most periods but shows some variability — likely tied to lumpy CapEx cycles or seasonal working capital swings.'
                            : ' Frequent negative FCF suggests the business is in an investment phase or facing structural cash burn. Evaluate whether CapEx is growth-oriented or maintenance-driven.'}
                          {stats.avgFCF !== null && (
                            <> Average FCF per period: <span className="font-semibold">{fmtNum(stats.avgFCF, unit)}</span>.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {avgCapexRatio !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">CapEx Intensity</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Average CapEx represents <span className="font-semibold">{avgCapexRatio.toFixed(0)}%</span> of CFO.
                          {avgCapexRatio <= 25
                            ? ' Low CapEx intensity — the business generates significant cash after maintaining and growing its asset base. This is typical of asset-light or software-driven business models.'
                            : avgCapexRatio <= 60
                            ? ' Moderate CapEx intensity — reinvestment is meaningful but CFO comfortably covers it. Watch for sustained increases which could compress FCF.'
                            : ' High CapEx intensity — the majority of operating cash flow is being reinvested. This may be appropriate for capital-heavy industries (infrastructure, manufacturing) or aggressive growth phases, but leaves limited room for debt service or distributions.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {stats.cashChange !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Cash Position Change</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          From <span className="font-semibold">{first.period}</span> to{' '}
                          <span className="font-semibold">{last.period}</span>, ending cash{' '}
                          {stats.cashChange >= 0
                            ? <span className="text-emerald-600 font-semibold">increased by {fmtNum(stats.cashChange, unit)}</span>
                            : <span className="text-red-500 font-semibold">decreased by {fmtNum(Math.abs(stats.cashChange), unit)}</span>}.
                          {stats.cashChange >= 0
                            ? ' Accumulated cash can support future investments, debt reduction, or shareholder returns. Monitor whether excess cash is being deployed productively.'
                            : ' Sustained cash reduction requires review of whether the drawdown is driven by intentional investment, debt repayment, or operational underperformance.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ CFO = Net Income + D&A + ΔWorking Capital + Other Operating (auto-computed if not provided directly).
                  FCF = CFO − CapEx. Cash Conversion = CFO / Net Income.
                  CapEx Intensity = |CapEx| / CFO. This analysis is auto-generated for reference only
                  and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
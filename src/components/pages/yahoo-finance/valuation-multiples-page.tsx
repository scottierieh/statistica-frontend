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
import { Input } from '@/components/ui/input';
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
} from 'recharts';
import {
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
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
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

interface HistoricalRow {
  period: string;
  // Cash Flow Bridge inputs
  netIncome:       number | null;
  da:              number | null; // D&A
  workingCapital:  number | null; // ΔWC (positive = cash outflow)
  otherOperating:  number | null;
  cfo:             number | null; // if provided directly
  capex:           number | null; // always negative convention
  // Derived
  fcf:             number | null; // CFO - |capex|
  fcfMargin:       number | null; // FCF / Revenue
  revenue:         number | null;
}

interface ProjectionRow {
  period:        string;
  revenueGrowth: number;   // %
  fcfMargin:     number;   // %
  revenue:       number;
  fcf:           number;
  discountFactor: number;
  pvFCF:         number;
  isForecast:    boolean;
}

interface DCFResult {
  // Inputs
  wacc:              number;
  terminalGrowth:    number;
  forecastYears:     number;
  sharesOutstanding: number;
  netDebt:           number;
  // PV breakdown
  pvFCFs:            number;
  terminalValue:     number;
  pvTerminalValue:   number;
  enterpriseValue:   number;
  equityValue:       number;
  intrinsicPerShare: number;
  // Upside
  currentPrice:      number;
  upside:            number;
  // Sensitivity table
  sensitivity: { wacc: number; tgr: number; price: number; upside: number }[];
}

// ============================================
// Constants
// ============================================

const FCF_COLOR     = '#6C3AED';
const CFO_COLOR     = '#3B82F6';
const PV_COLOR      = '#10B981';
const TV_COLOR      = '#F59E0B';
const CAPEX_COLOR   = '#EF4444';
const UPSIDE_POS    = '#10B981';
const UPSIDE_NEG    = '#EF4444';

// ============================================
// Example Data
// ============================================

function generateExampleData(): Record<string, any>[] {
  const years = ['2019','2020','2021','2022','2023','2024'];
  const data = [
    { net_income: 320, da: 85,  wc_change: -12, capex: -110, revenue: 1800 },
    { net_income: 280, da: 92,  wc_change:  18, capex: -95,  revenue: 1650 },
    { net_income: 410, da: 98,  wc_change: -25, capex: -130, revenue: 2100 },
    { net_income: 490, da: 108, wc_change: -30, capex: -155, revenue: 2480 },
    { net_income: 540, da: 115, wc_change: -18, capex: -168, revenue: 2750 },
    { net_income: 610, da: 122, wc_change: -22, capex: -180, revenue: 3050 },
  ];
  return years.map((y, i) => ({ period: y, ...data[i] }));
}

// ============================================
// Computation helpers
// ============================================

function buildHistoricalRows(
  data: Record<string, any>[],
  cols: {
    period: string; netIncome: string; da: string;
    wc: string; other: string; cfo: string;
    capex: string; revenue: string;
  }
): HistoricalRow[] {
  const g = (r: Record<string, any>, k: string): number | null => {
    if (!k) return null;
    const v = parseFloat(r[k]);
    return isFinite(v) ? v : null;
  };
  return data
    .map(r => {
      const period    = String(r[cols.period] ?? '').trim();
      const netIncome = g(r, cols.netIncome);
      const da        = g(r, cols.da);
      const wc        = g(r, cols.wc);
      const other     = g(r, cols.other);
      const cfoDirect = g(r, cols.cfo);
      const capex     = g(r, cols.capex);
      const revenue   = g(r, cols.revenue);
      if (!period) return null;

      // CFO: prefer direct, else derive from bridge
      let cfo: number | null = cfoDirect;
      if (cfo === null && netIncome !== null) {
        cfo = netIncome
          + (da    ?? 0)
          - (wc    ?? 0)  // ΔWC positive = cash outflow
          + (other ?? 0);
      }

      // FCF = CFO - |capex| (capex stored as negative conventionally)
      const capexAbs = capex !== null ? Math.abs(capex) : null;
      const fcf = cfo !== null && capexAbs !== null ? cfo - capexAbs : null;

      const fcfMargin = fcf !== null && revenue !== null && revenue !== 0
        ? parseFloat(((fcf / revenue) * 100).toFixed(2))
        : null;

      return { period, netIncome, da, workingCapital: wc, otherOperating: other, cfo, capex, fcf, fcfMargin, revenue };
    })
    .filter((r): r is HistoricalRow => r !== null && r.period !== '');
}

function runDCF(params: {
  baseFCF: number;
  baseRevenue: number;
  revenueGrowthRates: number[];  // % per year
  fcfMarginTarget: number;       // % — converges toward this
  wacc: number;
  terminalGrowth: number;
  forecastYears: number;
  sharesOutstanding: number;
  netDebt: number;
  currentPrice: number;
  lastPeriod: string;
}): { projections: ProjectionRow[]; result: DCFResult } {
  const {
    baseFCF, baseRevenue, revenueGrowthRates, fcfMarginTarget,
    wacc, terminalGrowth, forecastYears, sharesOutstanding, netDebt, currentPrice, lastPeriod,
  } = params;

  // Generate future period labels
  const lastYear = parseInt(lastPeriod.match(/\d{4}/)?.[0] ?? '2024');

  const projections: ProjectionRow[] = [];
  let revenue = baseRevenue;
  let prevFCFMargin = baseFCF / baseRevenue * 100;
  let pvFCFs = 0;

  for (let y = 1; y <= forecastYears; y++) {
    const growthRate   = revenueGrowthRates[y - 1] ?? revenueGrowthRates[revenueGrowthRates.length - 1];
    revenue            = revenue * (1 + growthRate / 100);
    // Linearly converge FCF margin toward target
    const fcfMargin    = prevFCFMargin + (fcfMarginTarget - prevFCFMargin) * (y / forecastYears);
    prevFCFMargin      = fcfMargin;
    const fcf          = revenue * fcfMargin / 100;
    const discountFactor = Math.pow(1 + wacc / 100, y);
    const pvFCF        = fcf / discountFactor;
    pvFCFs            += pvFCF;

    projections.push({
      period:        String(lastYear + y),
      revenueGrowth: parseFloat(growthRate.toFixed(2)),
      fcfMargin:     parseFloat(fcfMargin.toFixed(2)),
      revenue:       parseFloat(revenue.toFixed(1)),
      fcf:           parseFloat(fcf.toFixed(1)),
      discountFactor: parseFloat(discountFactor.toFixed(4)),
      pvFCF:         parseFloat(pvFCF.toFixed(1)),
      isForecast:    true,
    });
  }

  // Terminal value (Gordon Growth)
  const lastFCF       = projections[projections.length - 1].fcf;
  const terminalValue = lastFCF * (1 + terminalGrowth / 100) / ((wacc - terminalGrowth) / 100);
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc / 100, forecastYears);

  const enterpriseValue  = pvFCFs + pvTerminalValue;
  const equityValue      = enterpriseValue - netDebt;
  const intrinsicPerShare = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;
  const upside = currentPrice > 0
    ? parseFloat((((intrinsicPerShare - currentPrice) / currentPrice) * 100).toFixed(1))
    : 0;

  // Sensitivity table: WACC ±1.5% × TGR ±1%
  const waccRange = [-1.5, -0.75, 0, 0.75, 1.5];
  const tgrRange  = [-1.0, -0.5,  0, 0.5,  1.0];
  const sensitivity = waccRange.flatMap(dw => tgrRange.map(dt => {
    const w2   = wacc + dw;
    const t2   = terminalGrowth + dt;
    if (w2 <= t2) return null;
    let pv2 = 0;
    let rev2 = baseRevenue;
    let margin2 = baseFCF / baseRevenue * 100;
    for (let y = 1; y <= forecastYears; y++) {
      const gr2  = revenueGrowthRates[y - 1] ?? revenueGrowthRates[revenueGrowthRates.length - 1];
      rev2       = rev2 * (1 + gr2 / 100);
      margin2    = margin2 + (fcfMarginTarget - margin2) * (y / forecastYears);
      pv2       += (rev2 * margin2 / 100) / Math.pow(1 + w2 / 100, y);
    }
    const fcf2Last = (baseRevenue * (1 + (revenueGrowthRates[0] ?? 8) / 100) ** forecastYears) * fcfMarginTarget / 100;
    const tv2  = fcf2Last * (1 + t2 / 100) / ((w2 - t2) / 100);
    const ptv2 = tv2 / Math.pow(1 + w2 / 100, forecastYears);
    const eq2  = pv2 + ptv2 - netDebt;
    const ps2  = sharesOutstanding > 0 ? eq2 / sharesOutstanding : 0;
    const up2  = currentPrice > 0 ? parseFloat((((ps2 - currentPrice) / currentPrice) * 100).toFixed(1)) : 0;
    return { wacc: parseFloat(w2.toFixed(2)), tgr: parseFloat(t2.toFixed(2)), price: parseFloat(ps2.toFixed(2)), upside: up2 };
  })).filter((r): r is NonNullable<typeof r> => r !== null);

  const result: DCFResult = {
    wacc, terminalGrowth, forecastYears, sharesOutstanding, netDebt, currentPrice,
    pvFCFs:            parseFloat(pvFCFs.toFixed(1)),
    terminalValue:     parseFloat(terminalValue.toFixed(1)),
    pvTerminalValue:   parseFloat(pvTerminalValue.toFixed(1)),
    enterpriseValue:   parseFloat(enterpriseValue.toFixed(1)),
    equityValue:       parseFloat(equityValue.toFixed(1)),
    intrinsicPerShare: parseFloat(intrinsicPerShare.toFixed(2)),
    upside,
    sensitivity,
  };

  return { projections, result };
}

function autoUnit(rows: HistoricalRow[]): string {
  const max = Math.max(...rows.map(r => Math.abs(r.cfo ?? r.netIncome ?? 0)));
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

const BarTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {unit ? fmtNum(p.value, unit) : typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const LineTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.stroke ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {unit ? fmtNum(p.value, unit) : typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}
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
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">DCF Model</CardTitle>
        <CardDescription className="text-base mt-2">
          Estimate intrinsic value by discounting projected Free Cash Flows — built on the Cash Flow Bridge framework (Net Income → CFO → FCF)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Cash Flow Bridge → FCF',
              desc: 'Derive Free Cash Flow from the bottom up: Net Income + D&A − ΔWorking Capital − CapEx. Or input CFO and CapEx directly.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'DCF Valuation',
              desc: 'Project FCF over your chosen horizon, discount at WACC, add terminal value (Gordon Growth Model) to arrive at intrinsic Enterprise and Equity Value.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Sensitivity Analysis',
              desc: 'See how intrinsic value per share changes across a grid of WACC and terminal growth rate combinations — understand the key value drivers.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: FCF_COLOR,   label: 'FCF',            desc: 'Free Cash Flow = CFO − CapEx' },
            { color: PV_COLOR,    label: 'PV of FCFs',     desc: 'Discounted projection-period cash flows' },
            { color: TV_COLOR,    label: 'Terminal Value',  desc: 'Gordon Growth: FCF_n+1 / (WACC − g)' },
            { color: CAPEX_COLOR, label: 'CapEx',           desc: 'Capital expenditures (cash outflow)' },
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
            Use the DCF Model when you want to value a company based on its ability to generate future free cash flows.
            This model follows the Cash Flow Bridge approach — starting from reported earnings and adjusting for
            non-cash items and working capital changes to arrive at true cash generation.
            Best suited for companies with positive, relatively predictable FCF.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>period</strong> — year or quarter label</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>net_income + da + wc_change + capex</strong> — Cash Flow Bridge components</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>OR: cfo + capex</strong> — direct CFO input</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>revenue</strong> — for FCF margin calculation</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Historical CFO / FCF / CapEx trend (Cash Flow Bridge)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>FCF projection + present value waterfall</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Intrinsic value per share vs current price</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>WACC × Terminal Growth Rate sensitivity table</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <DollarSign className="mr-2 h-5 w-5" />Load Example Data
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================
// Main Component
// ============================================

export default function DCFModelPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ─────────────────────────────────────────
  const [periodCol,    setPeriodCol]    = useState('');
  const [netIncomeCol, setNetIncomeCol] = useState('');
  const [daCol,        setDaCol]        = useState('');
  const [wcCol,        setWcCol]        = useState('');
  const [otherCol,     setOtherCol]     = useState('');
  const [cfoCol,       setCfoCol]       = useState('');
  const [capexCol,     setCapexCol]     = useState('');
  const [revenueCol,   setRevenueCol]   = useState('');

  // ── DCF Assumptions ───────────────────────────────────────
  const [wacc,              setWacc]              = useState('10');
  const [terminalGrowth,    setTerminalGrowth]    = useState('2.5');
  const [forecastYears,     setForecastYears]     = useState('5');
  const [yr1Growth,         setYr1Growth]         = useState('12');
  const [yr2Growth,         setYr2Growth]         = useState('10');
  const [yr3Growth,         setYr3Growth]         = useState('8');
  const [yr4Growth,         setYr4Growth]         = useState('7');
  const [yr5Growth,         setYr5Growth]         = useState('6');
  const [fcfMarginTarget,   setFcfMarginTarget]   = useState('');  // empty = auto from history
  const [sharesOutstanding, setSharesOutstanding] = useState('');
  const [netDebt,           setNetDebt]           = useState('0');
  const [currentPrice,      setCurrentPrice]      = useState('');

  // ── UI ─────────────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_dcf_model.csv');
    setPeriodCol('period'); setNetIncomeCol('net_income');
    setDaCol('da'); setWcCol('wc_change'); setCapexCol('capex'); setRevenueCol('revenue');
    setWacc('10'); setTerminalGrowth('2.5'); setForecastYears('5');
    setYr1Growth('12'); setYr2Growth('10'); setYr3Growth('8'); setYr4Growth('7'); setYr5Growth('6');
    setSharesOutstanding('200'); setNetDebt('500'); setCurrentPrice('28');
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setNetIncomeCol(''); setDaCol(''); setWcCol('');
    setOtherCol(''); setCfoCol(''); setCapexCol(''); setRevenueCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect columns ───────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['period','year','quarter','date'],                          setPeriodCol,    periodCol);
    detect(['net_income','net income','ni','earnings'],                 setNetIncomeCol, netIncomeCol);
    detect(['da','d&a','depreciation','amortization'],                  setDaCol,        daCol);
    detect(['wc_change','wc change','working_capital','delta_wc'],      setWcCol,        wcCol);
    detect(['other_operating','other_op','other'],                      setOtherCol,     otherCol);
    detect(['cfo','operating_cash','cash_from_operations'],             setCfoCol,       cfoCol);
    detect(['capex','capital_expenditure','cap_ex'],                    setCapexCol,     capexCol);
    detect(['revenue','sales','net_sales'],                             setRevenueCol,   revenueCol);
  }, [hasData, allHeaders]);

  // ── Build historical rows ─────────────────────────────────
  const historicalRows = useMemo(() => {
    if (!periodCol) return [];
    return buildHistoricalRows(data, {
      period: periodCol, netIncome: netIncomeCol, da: daCol,
      wc: wcCol, other: otherCol, cfo: cfoCol,
      capex: capexCol, revenue: revenueCol,
    });
  }, [data, periodCol, netIncomeCol, daCol, wcCol, otherCol, cfoCol, capexCol, revenueCol]);

  const unit = useMemo(() => autoUnit(historicalRows), [historicalRows]);

  // ── Derive base FCF for projections ──────────────────────
  const baseFCF = useMemo(() => {
    const valid = historicalRows.filter(r => r.fcf !== null);
    if (!valid.length) return 0;
    // Use average of last 2 years or last available
    const last2 = valid.slice(-2);
    return last2.reduce((s, r) => s + r.fcf!, 0) / last2.length;
  }, [historicalRows]);

  const baseRevenue = useMemo(() => {
    const valid = historicalRows.filter(r => r.revenue !== null);
    if (!valid.length) return 1;
    return valid[valid.length - 1].revenue!;
  }, [historicalRows]);

  const derivedFCFMargin = useMemo(() => {
    const valid = historicalRows.filter(r => r.fcfMargin !== null);
    if (!valid.length) return 15;
    // Average of last 3
    const last3 = valid.slice(-3);
    return last3.reduce((s, r) => s + r.fcfMargin!, 0) / last3.length;
  }, [historicalRows]);

  const lastPeriod = useMemo(() => {
    return historicalRows[historicalRows.length - 1]?.period ?? '2024';
  }, [historicalRows]);

  // ── Run DCF ───────────────────────────────────────────────
  const { projections, result } = useMemo(() => {
    const fy      = parseInt(forecastYears) || 5;
    const waccNum = parseFloat(wacc)          || 10;
    const tgrNum  = parseFloat(terminalGrowth) || 2.5;
    const shares  = parseFloat(sharesOutstanding) || 0;
    const debt    = parseFloat(netDebt)       || 0;
    const price   = parseFloat(currentPrice)  || 0;
    const marginTarget = parseFloat(fcfMarginTarget) || derivedFCFMargin;

    if (!historicalRows.length || baseFCF === 0) {
      return { projections: [], result: null as unknown as DCFResult };
    }

    const growthRates = [
      parseFloat(yr1Growth) || 10,
      parseFloat(yr2Growth) || 8,
      parseFloat(yr3Growth) || 7,
      parseFloat(yr4Growth) || 6,
      parseFloat(yr5Growth) || 5,
    ].slice(0, fy);

    return runDCF({
      baseFCF, baseRevenue, revenueGrowthRates: growthRates,
      fcfMarginTarget: marginTarget, wacc: waccNum,
      terminalGrowth: tgrNum, forecastYears: fy,
      sharesOutstanding: shares, netDebt: debt,
      currentPrice: price, lastPeriod,
    });
  }, [historicalRows, baseFCF, baseRevenue, derivedFCFMargin, lastPeriod,
      wacc, terminalGrowth, forecastYears, yr1Growth, yr2Growth, yr3Growth, yr4Growth, yr5Growth,
      fcfMarginTarget, sharesOutstanding, netDebt, currentPrice]);

  // ── Chart data ─────────────────────────────────────────────
  const cfoBridgeData = useMemo(() =>
    historicalRows.map(r => ({
      period:    r.period,
      cfo:       r.cfo    !== null ? scaleVal(r.cfo,    unit) : null,
      fcf:       r.fcf    !== null ? scaleVal(r.fcf,    unit) : null,
      capex:     r.capex  !== null ? scaleVal(r.capex,  unit) : null, // negative
      netIncome: r.netIncome !== null ? scaleVal(r.netIncome, unit) : null,
    })),
    [historicalRows, unit]
  );

  const fcfMarginData = useMemo(() =>
    historicalRows.map(r => ({
      period:    r.period,
      fcfMargin: r.fcfMargin,
    })),
    [historicalRows]
  );

  const pvWaterfallData = useMemo(() => {
    if (!projections.length || !result) return [];
    return [
      ...projections.map(p => ({
        period: p.period,
        pvFCF:  parseFloat(scaleVal(p.pvFCF, unit).toFixed(2)),
        isTv:   false,
      })),
      {
        period: 'Terminal Value',
        pvFCF:  parseFloat(scaleVal(result.pvTerminalValue, unit).toFixed(2)),
        isTv:   true,
      },
    ];
  }, [projections, result, unit]);

  const fcfProjectionData = useMemo(() => {
    const hist = historicalRows.map(r => ({
      period: r.period,
      actual: r.fcf !== null ? scaleVal(r.fcf, unit) : null,
      forecast: null as number | null,
      isForecast: false,
    }));
    const fore = projections.map(p => ({
      period:     p.period,
      actual:     null as number | null,
      forecast:   parseFloat(scaleVal(p.fcf, unit).toFixed(2)),
      isForecast: true,
    }));
    return [...hist, ...fore];
  }, [historicalRows, projections, unit]);

  const isConfigured = historicalRows.length > 0 && projections.length > 0 && result;
  const isExample    = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!projections.length || !result) return;
    const rows = projections.map(p => ({
      period:         p.period,
      revenue_growth: `${p.revenueGrowth}%`,
      revenue:        p.revenue,
      fcf_margin:     `${p.fcfMargin.toFixed(1)}%`,
      fcf:            p.fcf,
      discount_factor:p.discountFactor,
      pv_fcf:         p.pvFCF,
    }));
    const summary = [{
      metric: 'PV of FCFs',            value: result.pvFCFs },
      { metric: 'Terminal Value (PV)', value: result.pvTerminalValue },
      { metric: 'Enterprise Value',    value: result.enterpriseValue },
      { metric: 'Net Debt',            value: result.netDebt },
      { metric: 'Equity Value',        value: result.equityValue },
      { metric: 'Shares Outstanding',  value: result.sharesOutstanding },
      { metric: 'Intrinsic Per Share', value: result.intrinsicPerShare },
      { metric: 'Current Price',       value: result.currentPrice },
      { metric: 'Upside %',           value: `${result.upside}%` },
    ];
    const csv = Papa.unparse(rows) + '\n\n' + Papa.unparse(summary);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `DCFModel_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [projections, result, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `DCFModel_${new Date().toISOString().split('T')[0]}.png`;
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

  const growthFields = [
    { label: 'YR1 Rev Growth',   value: yr1Growth,   setter: setYr1Growth },
    { label: 'YR2 Rev Growth',   value: yr2Growth,   setter: setYr2Growth },
    { label: 'YR3 Rev Growth',   value: yr3Growth,   setter: setYr3Growth },
    { label: 'YR4 Rev Growth',   value: yr4Growth,   setter: setYr4Growth },
    { label: 'YR5+ Rev Growth',  value: yr5Growth,   setter: setYr5Growth },
  ];

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
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold whitespace-nowrap">Example</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => {
              const link = document.createElement('a');
              link.href = URL.createObjectURL(new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' }));
              link.download = displayFileName.replace(/\.csv$/, '') + '_raw.csv';
              link.click();
              toast({ title: 'Raw data downloaded' });
            }}><Download className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={handleClearAll}><X className="h-4 w-4" /></Button>
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
                  {allHeaders.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    {allHeaders.map(h => <td key={h} className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">{String(row[h] ?? '-')}</td>)}
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 3</span>
            <span className="text-xs text-muted-foreground">Intrinsic Valuation</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />DCF Model
          </CardTitle>
          <CardDescription>
            Derive Free Cash Flow from the Cash Flow Bridge and discount projected FCFs at WACC to estimate intrinsic enterprise and equity value.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Column Mapping ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cash Flow Bridge — Column Mapping</CardTitle>
          <CardDescription>
            Map Cash Flow Bridge components. Either (Net Income + D&A + ΔWC + CapEx) or (CFO + CapEx) is required to derive FCF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'PERIOD *',     value: periodCol,    setter: setPeriodCol,    headers: allHeaders     },
              { label: 'NET INCOME',   value: netIncomeCol, setter: setNetIncomeCol, headers: numericHeaders },
              { label: 'D&A',          value: daCol,        setter: setDaCol,        headers: numericHeaders },
              { label: 'ΔWC',          value: wcCol,        setter: setWcCol,        headers: numericHeaders },
            ].map(({ label, value, setter, headers }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {label !== 'PERIOD *' && <SelectItem value="__none__">— None —</SelectItem>}
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-3">
            {[
              { label: 'CFO (direct)', value: cfoCol,      setter: setCfoCol,     headers: numericHeaders },
              { label: 'CAPEX *',      value: capexCol,    setter: setCapexCol,   headers: numericHeaders },
              { label: 'REVENUE',      value: revenueCol,  setter: setRevenueCol, headers: numericHeaders },
              { label: 'OTHER OP',     value: otherCol,    setter: setOtherCol,   headers: numericHeaders },
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
        </CardContent>
      </Card>

      {/* ── DCF Assumptions ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">DCF Assumptions</CardTitle>
          <CardDescription>
            Revenue growth rates per forecast year, WACC, terminal growth, and equity bridge inputs.
            FCF Margin target: leave blank to use historical average ({derivedFCFMargin.toFixed(1)}%).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Growth rates */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {growthFields.slice(0, parseInt(forecastYears) || 5).map(({ label, value, setter }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label} %</Label>
                <Input className="h-8 text-xs font-mono" value={value}
                  onChange={e => setter(e.target.value)} placeholder="e.g. 10" />
              </div>
            ))}
          </div>
          {/* Key assumptions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-3">
            {[
              { label: 'WACC %',               value: wacc,              setter: setWacc              },
              { label: 'TERMINAL GROWTH %',    value: terminalGrowth,    setter: setTerminalGrowth    },
              { label: 'FORECAST YEARS',       value: forecastYears,     setter: setForecastYears     },
              { label: 'FCF MARGIN TARGET %',  value: fcfMarginTarget,   setter: setFcfMarginTarget, placeholder: `auto (${derivedFCFMargin.toFixed(1)}%)` },
            ].map(({ label, value, setter, placeholder }: any) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Input className="h-8 text-xs font-mono" value={value}
                  onChange={e => setter(e.target.value)} placeholder={placeholder ?? ''} />
              </div>
            ))}
          </div>
          {/* Equity bridge */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            {[
              { label: 'SHARES OUTSTANDING',  value: sharesOutstanding, setter: setSharesOutstanding, placeholder: `e.g. 200 (${unit})`  },
              { label: 'NET DEBT',             value: netDebt,           setter: setNetDebt,           placeholder: `e.g. 500 (${unit})`  },
              { label: 'CURRENT PRICE',        value: currentPrice,      setter: setCurrentPrice,      placeholder: 'e.g. 28'             },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Input className="h-8 text-xs font-mono" value={value}
                  onChange={e => setter(e.target.value)} placeholder={placeholder} />
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
              <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Intrinsic Value / Share</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {result.sharesOutstanding > 0 ? `$${result.intrinsicPerShare.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {result.currentPrice > 0
                ? `vs $${result.currentPrice.toFixed(2)} current`
                : 'Enter current price for upside'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Upside / Downside</div>
            <div className={`flex items-center gap-1 text-2xl font-bold font-mono ${result.upside >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {result.upside >= 0 ? <ArrowUpRight className="h-5 w-5 shrink-0" /> : <ArrowDownRight className="h-5 w-5 shrink-0" />}
              {result.currentPrice > 0 ? `${result.upside >= 0 ? '+' : ''}${result.upside.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">vs current price</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Enterprise Value</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {fmtNum(result.enterpriseValue, unit)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              PV FCFs: {fmtNum(result.pvFCFs, unit)} · TV: {fmtNum(result.pvTerminalValue, unit)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">TV % of EV</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {result.enterpriseValue > 0
                ? `${((result.pvTerminalValue / result.enterpriseValue) * 100).toFixed(0)}%`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">terminal value proportion</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Historical CFO / FCF / CapEx ── */}
        {historicalRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historical Cash Flow Bridge</CardTitle>
              <CardDescription>
                CFO (blue) · FCF = CFO − |CapEx| (violet) · CapEx (red, negative) — unit: {unit || 'absolute'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={cfoBridgeData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<BarTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                  {cfoBridgeData.some(r => r.capex !== null) && (
                    <Bar dataKey="capex" name="CapEx" fill={CAPEX_COLOR} fillOpacity={0.7} maxBarSize={24} radius={[0,0,2,2]} />
                  )}
                  {cfoBridgeData.some(r => r.cfo !== null) && (
                    <Line dataKey="cfo" name="CFO" stroke={CFO_COLOR} strokeWidth={2}
                      dot={{ r: 3, fill: CFO_COLOR }} connectNulls />
                  )}
                  {cfoBridgeData.some(r => r.fcf !== null) && (
                    <Line dataKey="fcf" name="FCF" stroke={FCF_COLOR} strokeWidth={2.5}
                      dot={{ r: 3.5, fill: FCF_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: FCF Actual + Forecast ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">FCF — Historical & Projected</CardTitle>
              <CardDescription>
                Actual FCF (solid) → Projected FCF (dashed) — based on revenue growth and FCF margin convergence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={fcfProjectionData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<LineTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Line dataKey="actual"   name="Actual FCF"    stroke={FCF_COLOR} strokeWidth={2.5}
                    dot={{ r: 3.5, fill: FCF_COLOR }} connectNulls />
                  <Line dataKey="forecast" name="Projected FCF" stroke={FCF_COLOR} strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 3, fill: 'white', stroke: FCF_COLOR, strokeWidth: 2 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: PV Waterfall (PV FCFs + Terminal Value) ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Present Value Waterfall</CardTitle>
              <CardDescription>
                Discounted FCF per year (green) + PV of Terminal Value (amber) = Enterprise Value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pvWaterfallData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<BarTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="pvFCF" name="PV of FCF" maxBarSize={48} radius={[3, 3, 0, 0]}>
                    {pvWaterfallData.map((r, i) => (
                      <Cell key={i} fill={r.isTv ? TV_COLOR : PV_COLOR} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {result && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {[
                    { label: 'PV of FCFs',       value: fmtNum(result.pvFCFs, unit),          color: PV_COLOR },
                    { label: 'PV Terminal Value', value: fmtNum(result.pvTerminalValue, unit),  color: TV_COLOR },
                    { label: 'Enterprise Value',  value: fmtNum(result.enterpriseValue, unit),  color: '#1e293b' },
                    { label: '− Net Debt',        value: fmtNum(result.netDebt, unit),          color: CAPEX_COLOR },
                    { label: '= Equity Value',    value: fmtNum(result.equityValue, unit),       color: '#1e293b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-mono font-semibold text-slate-700">{value}</span>
                    </div>
                  ))}
                  {result.sharesOutstanding > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm shrink-0 bg-primary" />
                      <span className="text-muted-foreground">÷ {fmtNum(result.sharesOutstanding, unit)} shares =</span>
                      <span className="font-mono font-semibold text-primary">${result.intrinsicPerShare.toFixed(2)} / share</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── FCF Margin Historical ── */}
        {historicalRows.some(r => r.fcfMargin !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historical FCF Margin</CardTitle>
              <CardDescription>
                FCF / Revenue — used to derive the FCF margin target for projections (avg last 3 yrs: {derivedFCFMargin.toFixed(1)}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={fcfMarginData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<BarTooltip />} />
                  <ReferenceLine y={derivedFCFMargin} stroke={FCF_COLOR} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: `Avg ${derivedFCFMargin.toFixed(1)}%`, position: 'right', fontSize: 9, fill: FCF_COLOR }} />
                  <Bar dataKey="fcfMargin" name="FCF Margin %" fill={FCF_COLOR} fillOpacity={0.75} maxBarSize={36} radius={[2,2,0,0]}>
                    {fcfMarginData.map((r, i) => (
                      <Cell key={i} fill={(r.fcfMargin ?? 0) >= 0 ? FCF_COLOR : CAPEX_COLOR} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Projection Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Projection Detail Table
              </CardTitle>
              <CardDescription>Year-by-year FCF projection and discounted present values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Year', 'Rev Growth', 'Revenue', 'FCF Margin', 'FCF', 'Discount Factor', 'PV of FCF'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projections.map((p, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700">{p.period}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.revenueGrowth.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{fmtNum(p.revenue, unit)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.fcfMargin.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{fmtNum(p.fcf, unit)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.discountFactor.toFixed(3)}×</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{fmtNum(p.pvFCF, unit)}</td>
                      </tr>
                    ))}
                    {result && (
                      <>
                        <tr className="border-t border-slate-200 bg-amber-50/30">
                          <td className="px-3 py-2 font-semibold text-slate-700" colSpan={4}>Terminal Value</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{fmtNum(result.terminalValue, unit)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{(Math.pow(1 + parseFloat(wacc) / 100, parseInt(forecastYears))).toFixed(3)}×</td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: TV_COLOR }}>{fmtNum(result.pvTerminalValue, unit)}</td>
                        </tr>
                        <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                          <td className="px-3 py-2 text-slate-700 font-bold" colSpan={6}>Enterprise Value</td>
                          <td className="px-3 py-2 font-mono text-xs font-bold text-slate-800">{fmtNum(result.enterpriseValue, unit)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Sensitivity Table ── */}
        {isConfigured && result && result.sensitivity.length > 0 && result.sharesOutstanding > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sensitivity Table — Intrinsic Value per Share</CardTitle>
              <CardDescription>
                WACC (rows) × Terminal Growth Rate (columns) — base case highlighted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const waccVals = [...new Set(result.sensitivity.map(s => s.wacc))].sort((a, b) => a - b);
                const tgrVals  = [...new Set(result.sensitivity.map(s => s.tgr))].sort((a, b) => a - b);
                return (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                            WACC ↓ / TGR →
                          </th>
                          {tgrVals.map(t => (
                            <th key={t} className={`px-3 py-2.5 text-center text-xs font-semibold whitespace-nowrap ${Math.abs(t - parseFloat(terminalGrowth)) < 0.01 ? 'text-primary' : 'text-muted-foreground'}`}>
                              {t.toFixed(1)}%
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {waccVals.map(w => (
                          <tr key={w} className="border-t hover:bg-slate-50/50">
                            <td className={`px-3 py-2 font-semibold whitespace-nowrap ${Math.abs(w - parseFloat(wacc)) < 0.01 ? 'text-primary' : 'text-slate-700'}`}>
                              {w.toFixed(2)}%
                            </td>
                            {tgrVals.map(t => {
                              const cell = result.sensitivity.find(s => Math.abs(s.wacc - w) < 0.01 && Math.abs(s.tgr - t) < 0.01);
                              const isBase = Math.abs(w - parseFloat(wacc)) < 0.01 && Math.abs(t - parseFloat(terminalGrowth)) < 0.01;
                              const upside = cell?.upside ?? 0;
                              const cellColor = !cell ? '' :
                                upside >= 20  ? 'bg-emerald-50' :
                                upside >= 0   ? 'bg-green-50/50' :
                                upside >= -20 ? 'bg-orange-50/50' : 'bg-red-50/30';
                              return (
                                <td key={t} className={`px-3 py-2 text-center font-mono text-xs ${cellColor} ${isBase ? 'ring-1 ring-primary ring-inset font-semibold' : ''}`}>
                                  {cell ? (
                                    <div>
                                      <div className="font-semibold text-slate-700">${cell.price.toFixed(1)}</div>
                                      <div className={`text-[10px] ${upside >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {upside >= 0 ? '+' : ''}{upside.toFixed(0)}%
                                      </div>
                                    </div>
                                  ) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              <p className="text-xs text-muted-foreground mt-2">
                Base case (WACC {parseFloat(wacc).toFixed(1)}% × TGR {parseFloat(terminalGrowth).toFixed(1)}%) highlighted with violet border.
                Green = upside, Red = downside vs current price ${parseFloat(currentPrice).toFixed(2) || '—'}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && result && (() => {
          const tvPct = result.enterpriseValue > 0
            ? (result.pvTerminalValue / result.enterpriseValue) * 100 : 0;
          const fcfGrowth = projections.length >= 2
            ? ((projections[projections.length - 1].fcf - projections[0].fcf) / projections[0].fcf * 100) : 0;
          const histFCFGrowth = historicalRows.length >= 2 && historicalRows[0].fcf && historicalRows[historicalRows.length - 1].fcf
            ? ((historicalRows[historicalRows.length - 1].fcf! - historicalRows[0].fcf!) / Math.abs(historicalRows[0].fcf!) * 100) : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated DCF analysis summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">DCF Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Using a WACC of <span className="font-semibold">{result.wacc}%</span> and terminal growth rate of{' '}
                    <span className="font-semibold">{result.terminalGrowth}%</span> over a{' '}
                    <span className="font-semibold">{result.forecastYears}-year</span> horizon,
                    the model derives an Enterprise Value of{' '}
                    <span className="font-semibold">{fmtNum(result.enterpriseValue, unit)}</span>.
                    {result.sharesOutstanding > 0 && (
                      <> After subtracting net debt of <span className="font-semibold">{fmtNum(result.netDebt, unit)}</span>,
                      the implied equity value per share is{' '}
                      <span className={`font-semibold ${result.upside >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        ${result.intrinsicPerShare.toFixed(2)}
                      </span>
                      {result.currentPrice > 0 && (
                        <> — representing a{' '}
                        <span className={`font-semibold ${result.upside >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {result.upside >= 0 ? '+' : ''}{result.upside.toFixed(1)}%
                        </span> {result.upside >= 0 ? 'upside' : 'downside'} vs the current price of ${result.currentPrice.toFixed(2)}</>
                      )}.
                      </>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Intrinsic / Share', value: result.sharesOutstanding > 0 ? `$${result.intrinsicPerShare.toFixed(2)}` : '—', sub: `EV: ${fmtNum(result.enterpriseValue, unit)}` },
                    { label: 'TV % of EV',        value: `${tvPct.toFixed(0)}%`,                                       sub: `PV TV: ${fmtNum(result.pvTerminalValue, unit)}` },
                    { label: 'FCF CAGR (proj.)',  value: `${fcfGrowth >= 0 ? '+' : ''}${fcfGrowth.toFixed(1)}%`,      sub: `over ${result.forecastYears} years` },
                    { label: 'Upside',            value: result.currentPrice > 0 ? `${result.upside >= 0 ? '+' : ''}${result.upside.toFixed(1)}%` : '—', sub: result.currentPrice > 0 ? `$${result.currentPrice} → $${result.intrinsicPerShare.toFixed(2)}` : 'Enter current price' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-lg font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Terminal Value Dependency</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tvPct >= 70
                          ? <>Terminal value accounts for <span className="font-semibold">{tvPct.toFixed(0)}%</span> of enterprise value — a high proportion typical of growth companies. This means the valuation is highly sensitive to the terminal growth rate and WACC assumptions. A 1% change in terminal growth rate can swing intrinsic value significantly. See the sensitivity table above to quantify this range.</>
                          : tvPct >= 50
                          ? <>Terminal value accounts for <span className="font-semibold">{tvPct.toFixed(0)}%</span> of enterprise value — a moderate proportion. The near-term FCF projections contribute meaningfully to the valuation, reducing (but not eliminating) sensitivity to long-run assumptions.</>
                          : <>Terminal value accounts for only <span className="font-semibold">{tvPct.toFixed(0)}%</span> of enterprise value — unusually low. This suggests the company generates substantial near-term FCF relative to its perpetuity value, making the valuation more grounded in observable cash flows.</>}
                      </p>
                    </div>
                  </div>

                  {histFCFGrowth !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Historical vs Projected FCF</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Historical FCF grew by <span className="font-semibold">{histFCFGrowth.toFixed(1)}%</span> from{' '}
                          {historicalRows[0].period} to {historicalRows[historicalRows.length - 1].period}.
                          The projection assumes FCF grows <span className="font-semibold">{fcfGrowth.toFixed(1)}%</span>{' '}
                          over the {result.forecastYears}-year forecast horizon.
                          {Math.abs(fcfGrowth - histFCFGrowth) < 20
                            ? ' The projection is broadly consistent with the historical growth trajectory — a reasonable baseline assumption.'
                            : fcfGrowth > histFCFGrowth
                            ? ' The projection assumes meaningfully faster growth than the historical record — verify that the revenue growth and margin assumptions are supportable.'
                            : ' The projection is more conservative than the historical record — this may reflect deliberate caution or an expectation of slowing growth.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">WACC Sensitivity</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        At WACC = {result.wacc}%, the model uses{' '}
                        {result.wacc <= 8
                          ? 'a low discount rate — appropriate for stable, investment-grade companies with predictable cash flows. Ensure this reflects the true cost of equity and debt.'
                          : result.wacc <= 12
                          ? 'a moderate discount rate consistent with most listed equities. This is in the typical range for DCF models applied to mid-to-large cap companies.'
                          : 'a high discount rate — typically applied to higher-risk growth companies or those in cyclical industries. A higher WACC compresses the terminal value and reduces the intrinsic estimate.'}
                        {' '}The sensitivity table shows how a ±1.5% WACC change impacts intrinsic value per share.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ FCF = CFO − |CapEx|. CFO derived from Net Income + D&A − ΔWC + Other Operating if not provided directly.
                  Revenue growth is applied year-by-year; FCF margin linearly converges to the target over the forecast period.
                  Terminal Value = FCF_last × (1 + g) / (WACC − g) discounted back to present.
                  Equity Value = Enterprise Value − Net Debt. Intrinsic per share = Equity Value / Shares Outstanding.
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
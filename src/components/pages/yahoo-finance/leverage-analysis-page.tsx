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
  Area,
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
  Shield,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Scale,
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

type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Critical';

interface PeriodRow {
  period:       string;
  // Balance sheet
  totalDebt:    number;
  shortTermDebt:number | null;  // current portion
  longTermDebt: number | null;
  cash:         number | null;
  totalAssets:  number | null;
  totalEquity:  number | null;
  // Income / Cash flow
  ebitda:       number | null;
  ebit:         number | null;
  interestExp:  number | null;
  fcf:          number | null;  // free cash flow
  // Derived ratios
  netDebt:      number | null;  // totalDebt - cash
  netDebtEbitda:number | null;  // Net Debt / EBITDA
  debtEquity:   number | null;  // Total Debt / Equity
  debtAssets:   number | null;  // Total Debt / Total Assets  %
  icr:          number | null;  // Interest Coverage = EBIT / Interest
  debtFcf:      number | null;  // Total Debt / FCF  (years to repay)
  debtGrowth:   number | null;  // % change in total debt
  riskLevel:    RiskLevel;
}

interface ScheduleRow {
  period:       string;        // maturity label
  principal:    number;
  interest:     number | null;
  total:        number | null;
  cumulative:   number;
}

// ============================================
// Constants
// ============================================

const DEBT_COLOR     = '#EF4444';
const STD_COLOR      = '#F97316';
const LTD_COLOR      = '#EF4444';
const CASH_COLOR     = '#10B981';
const NET_DEBT_COLOR = '#6C3AED';
const ICR_COLOR      = '#3B82F6';
const DE_COLOR       = '#F59E0B';
const EBITDA_COLOR   = '#10B981';

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; desc: string }> = {
  'Low':      { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', desc: 'Net Debt/EBITDA < 1× — minimal leverage, strong capacity' },
  'Moderate': { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', desc: 'Net Debt/EBITDA 1–2× — manageable, watch cash flows' },
  'Elevated': { color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', desc: 'Net Debt/EBITDA 2–3× — meaningful leverage, limited buffer' },
  'High':     { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', desc: 'Net Debt/EBITDA 3–4× — high leverage, refinancing risk' },
  'Critical': { color: '#991B1B', bg: '#FEE2E2', border: '#EF4444', desc: 'Net Debt/EBITDA > 4× — distressed leverage, covenant risk' },
};

// ============================================
// Risk classification
// ============================================

function classifyRisk(row: Omit<PeriodRow, 'riskLevel'>): RiskLevel {
  const nd = row.netDebtEbitda;
  if (nd === null) {
    // Fallback to D/E
    const de = row.debtEquity;
    if (de === null) return 'Moderate';
    if (de < 0.5) return 'Low';
    if (de < 1.0) return 'Moderate';
    if (de < 2.0) return 'Elevated';
    if (de < 3.5) return 'High';
    return 'Critical';
  }
  if (nd < 0)   return 'Low';       // net cash position
  if (nd < 1)   return 'Low';
  if (nd < 2)   return 'Moderate';
  if (nd < 3)   return 'Elevated';
  if (nd < 4)   return 'High';
  return 'Critical';
}

// ============================================
// Computation
// ============================================

function buildPeriodRows(
  data:         Record<string, any>[],
  periodCol:    string,
  totalDebtCol: string,
  stdCol:       string,
  ltdCol:       string,
  cashCol:      string,
  assetsCol:    string,
  equityCol:    string,
  ebitdaCol:    string,
  ebitCol:      string,
  interestCol:  string,
  fcfCol:       string,
): PeriodRow[] {
  const parse = (r: Record<string, any>, col: string) =>
    col ? parseFloat(r[col]) : NaN;

  const raw = data
    .map(r => ({
      period:       String(r[periodCol] ?? '').trim(),
      totalDebt:    parse(r, totalDebtCol),
      std:          parse(r, stdCol),
      ltd:          parse(r, ltdCol),
      cash:         parse(r, cashCol),
      assets:       parse(r, assetsCol),
      equity:       parse(r, equityCol),
      ebitda:       parse(r, ebitdaCol),
      ebit:         parse(r, ebitCol),
      interest:     parse(r, interestCol),
      fcf:          parse(r, fcfCol),
    }))
    .filter(r => r.period && isFinite(r.totalDebt));

  return raw.map((r, i) => {
    const cash     = isFinite(r.cash)     ? r.cash     : null;
    const assets   = isFinite(r.assets)   ? r.assets   : null;
    const equity   = isFinite(r.equity)   ? r.equity   : null;
    const ebitda   = isFinite(r.ebitda)   ? r.ebitda   : null;
    const ebit     = isFinite(r.ebit)     ? r.ebit     : null;
    const interest = isFinite(r.interest) ? r.interest : null;
    const fcf      = isFinite(r.fcf)      ? r.fcf      : null;
    const std      = isFinite(r.std)      ? r.std      : null;
    const ltd      = isFinite(r.ltd)      ? r.ltd      : null;

    const netDebt      = cash !== null ? parseFloat((r.totalDebt - cash).toFixed(2)) : null;
    const netDebtEbitda = netDebt !== null && ebitda !== null && ebitda > 0
      ? parseFloat((netDebt / ebitda).toFixed(2)) : null;
    const debtEquity   = equity !== null && equity > 0
      ? parseFloat((r.totalDebt / equity).toFixed(2)) : null;
    const debtAssets   = assets !== null && assets > 0
      ? parseFloat(((r.totalDebt / assets) * 100).toFixed(2)) : null;
    const icr          = ebit !== null && interest !== null && interest > 0
      ? parseFloat((ebit / interest).toFixed(2)) : null;
    const debtFcf      = fcf !== null && fcf > 0
      ? parseFloat((r.totalDebt / fcf).toFixed(2)) : null;

    const prev = i > 0 ? raw[i - 1] : null;
    const debtGrowth = prev
      ? parseFloat((((r.totalDebt - prev.totalDebt) / Math.abs(prev.totalDebt)) * 100).toFixed(2))
      : null;

    const base = {
      period: r.period,
      totalDebt: r.totalDebt, shortTermDebt: std, longTermDebt: ltd,
      cash, totalAssets: assets, totalEquity: equity,
      ebitda, ebit, interestExp: interest, fcf,
      netDebt, netDebtEbitda, debtEquity, debtAssets,
      icr, debtFcf, debtGrowth,
    };
    return { ...base, riskLevel: classifyRisk(base) };
  });
}

function buildSchedule(
  data:         Record<string, any>[],
  schedPeriod:  string,
  schedPrinc:   string,
  schedInt:     string,
): ScheduleRow[] {
  if (!schedPeriod || !schedPrinc) return [];
  const raw = data
    .map(r => ({
      period:    String(r[schedPeriod] ?? '').trim(),
      principal: parseFloat(r[schedPrinc]),
      interest:  schedInt ? parseFloat(r[schedInt]) : NaN,
    }))
    .filter(r => r.period && isFinite(r.principal));

  let cum = 0;
  return raw.map(r => {
    cum += r.principal;
    const interest = isFinite(r.interest) ? r.interest : null;
    return {
      period:    r.period,
      principal: r.principal,
      interest,
      total:     interest !== null ? r.principal + interest : null,
      cumulative: parseFloat(cum.toFixed(2)),
    };
  });
}

// ============================================
// Example Data
// ============================================

function generateExampleData(): Record<string, any>[] {
  const quarters = [
    '2020','2021','2022','2023','2024',
  ];
  let debt = 5000, cash = 800, ebitda = 1200, equity = 3500, assets = 9500;

  return quarters.map((y, i) => {
    debt   = Math.max(1000, debt   * (1 + (Math.random() - 0.55) * 0.15));
    cash   = Math.max(200,  cash   * (1 + (Math.random() - 0.3)  * 0.2));
    ebitda = Math.max(400,  ebitda * (1 + (Math.random() - 0.35) * 0.12));
    equity = Math.max(1000, equity * (1 + (Math.random() - 0.4)  * 0.1));
    assets = Math.max(5000, assets * (1 + (Math.random() - 0.4)  * 0.08));
    const ebit     = ebitda * 0.72;
    const interest = debt   * 0.045;
    const fcf      = ebitda * 0.55 - debt * 0.05;
    const std      = debt   * 0.15;
    const ltd      = debt   * 0.85;
    return {
      period:        y,
      total_debt:    parseFloat(debt.toFixed(1)),
      short_term_debt: parseFloat(std.toFixed(1)),
      long_term_debt:  parseFloat(ltd.toFixed(1)),
      cash:          parseFloat(cash.toFixed(1)),
      total_assets:  parseFloat(assets.toFixed(1)),
      total_equity:  parseFloat(equity.toFixed(1)),
      ebitda:        parseFloat(ebitda.toFixed(1)),
      ebit:          parseFloat(ebit.toFixed(1)),
      interest_expense: parseFloat(interest.toFixed(1)),
      free_cash_flow:   parseFloat(fcf.toFixed(1)),
    };
  });
}

function generateScheduleExample(): Record<string, any>[] {
  const maturities = ['2025','2026','2027','2028','2029','2030+'];
  const principals = [800, 1200, 900, 1500, 700, 900];
  let balance = principals.reduce((a, b) => a + b, 0);
  return maturities.map((y, i) => {
    const principal = principals[i];
    const interest  = parseFloat((balance * 0.045).toFixed(1));
    balance -= principal;
    return { maturity: y, principal, interest };
  });
}

// ============================================
// Formatters
// ============================================

function autoUnit(rows: PeriodRow[]): string {
  const max = Math.max(...rows.map(r => r.totalDebt));
  if (max >= 1_000_000) return 'M';
  if (max >= 1_000)     return 'K';
  return '';
}

function scaleVal(v: number, unit: string): number {
  if (unit === 'M') return parseFloat((v / 1_000_000).toFixed(2));
  if (unit === 'K') return parseFloat((v / 1_000).toFixed(2));
  return parseFloat(v.toFixed(1));
}

function fmtAbs(v: number, unit: string): string {
  const abs  = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (unit === 'M') return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (unit === 'K') return `${sign}${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(1)}`;
}

// ============================================
// Tooltips
// ============================================

const DebtTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[170px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {[...payload].reverse().map((p: any) =>
        p.value !== null && p.value !== undefined ? (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-mono font-semibold">
              {typeof p.value === 'number' ? fmtAbs(p.value, unit ?? '') : p.value}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
};

const RatioTooltip = ({ active, payload, label, suffix = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.stroke ?? p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? `${p.value.toFixed(2)}${suffix}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Risk Badge
// ============================================

const RiskBadge = ({ level, size = 'sm' }: { level: RiskLevel; size?: 'sm' | 'md' | 'lg' }) => {
  const cfg = RISK_CONFIG[level];
  const cls = size === 'lg' ? 'px-3 py-1.5 text-sm font-bold'
            : size === 'md' ? 'px-2.5 py-1 text-xs font-bold'
            : 'px-2 py-0.5 text-xs font-semibold';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${cls}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
      {level}
    </span>
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
            <Scale className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Debt Schedule & Leverage</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze debt maturity schedules, leverage ratios, and repayment capacity — assess financial risk from the balance sheet perspective
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Debt Maturity Schedule',
              desc:  'Visualize upcoming principal and interest payments by maturity year — identify concentration risk and refinancing walls.',
            },
            {
              icon: <Scale className="w-6 h-6 text-primary mb-2" />,
              title: 'Leverage Ratios',
              desc:  'Track Net Debt/EBITDA, Debt/Equity, and Interest Coverage Ratio over time — the three core measures of financial risk.',
            },
            {
              icon: <Shield className="w-6 h-6 text-primary mb-2" />,
              title: 'Risk Classification',
              desc:  'Each period is auto-classified as Low / Moderate / Elevated / High / Critical based on Net Debt/EBITDA or Debt/Equity as fallback.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Risk scale legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(Object.entries(RISK_CONFIG) as [RiskLevel, typeof RISK_CONFIG[RiskLevel]][]).map(([level, cfg]) => (
            <div key={level} className="rounded-lg border p-2.5" style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}>
              <div className="text-xs font-bold mb-0.5" style={{ color: cfg.color }}>{level}</div>
              <div className="text-xs" style={{ color: cfg.color, opacity: 0.8 }}>{cfg.desc.split('—')[0].trim()}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />Data Modes
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            This page supports two data modes simultaneously. Upload a single CSV with both modes combined, or use separate column groups.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Mode A — Balance Sheet / Ratio Analysis</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>period</strong> — fiscal year or quarter</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>total_debt</strong> — required</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>cash, ebitda, ebit, interest_expense, total_equity, total_assets, fcf — optional</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Mode B — Debt Maturity Schedule</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>maturity</strong> — year or label (e.g. "2026")</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>principal</strong> — amount due at maturity</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>interest — optional, annual coupon payment</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Scale className="mr-2 h-5 w-5" />Load Example Data
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================
// Main Component
// ============================================

export default function DebtScheduleLeveragePage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Mode A: Ratio columns ──────────────────────────────────
  const [periodCol,   setPeriodCol]   = useState('');
  const [debtCol,     setDebtCol]     = useState('');
  const [stdCol,      setStdCol]      = useState('');
  const [ltdCol,      setLtdCol]      = useState('');
  const [cashCol,     setCashCol]     = useState('');
  const [assetsCol,   setAssetsCol]   = useState('');
  const [equityCol,   setEquityCol]   = useState('');
  const [ebitdaCol,   setEbitdaCol]   = useState('');
  const [ebitCol,     setEbitCol]     = useState('');
  const [interestCol, setInterestCol] = useState('');
  const [fcfCol,      setFcfCol]      = useState('');

  // ── Mode B: Schedule columns ───────────────────────────────
  const [schedPeriod, setSchedPeriod] = useState('');
  const [schedPrinc,  setSchedPrinc]  = useState('');
  const [schedInt,    setSchedInt]    = useState('');

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeMode,    setActiveMode]    = useState<'both' | 'ratio' | 'schedule'>('both');

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    // Combine both datasets: ratio rows first, then schedule rows with different columns
    const ratioRows    = generateExampleData();
    const schedRows    = generateScheduleExample();
    // Merge into unified rows (schedRows have different columns, pad missing fields)
    const combined = [
      ...ratioRows,
      ...schedRows.map(r => ({ maturity: r.maturity, principal: r.principal, interest: r.interest })),
    ];
    onExampleLoaded?.(combined, 'example_debt_leverage.csv');
    // Set ratio columns
    setPeriodCol('period');     setDebtCol('total_debt');
    setStdCol('short_term_debt'); setLtdCol('long_term_debt');
    setCashCol('cash');         setAssetsCol('total_assets');
    setEquityCol('total_equity'); setEbitdaCol('ebitda');
    setEbitCol('ebit');         setInterestCol('interest_expense');
    setFcfCol('free_cash_flow');
    // Set schedule columns
    setSchedPeriod('maturity'); setSchedPrinc('principal');
    setSchedInt('interest');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    [setPeriodCol, setDebtCol, setStdCol, setLtdCol, setCashCol,
     setAssetsCol, setEquityCol, setEbitdaCol, setEbitCol,
     setInterestCol, setFcfCol, setSchedPeriod, setSchedPrinc, setSchedInt]
      .forEach(s => s(''));
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
    detect(['period', 'year', 'fiscal_year', 'date'],                 setPeriodCol,   periodCol);
    detect(['total_debt', 'debt', 'total_borrowings'],                setDebtCol,     debtCol);
    detect(['short_term_debt', 'current_portion', 'std'],             setStdCol,      stdCol);
    detect(['long_term_debt', 'ltd', 'long_term_borrowings'],         setLtdCol,      ltdCol);
    detect(['cash', 'cash_equivalents', 'cash_and_equivalents'],      setCashCol,     cashCol);
    detect(['total_assets', 'assets'],                                setAssetsCol,   assetsCol);
    detect(['total_equity', 'equity', 'shareholders_equity'],         setEquityCol,   equityCol);
    detect(['ebitda'],                                                 setEbitdaCol,   ebitdaCol);
    detect(['ebit', 'operating_income', 'operating_profit'],          setEbitCol,     ebitCol);
    detect(['interest_expense', 'interest', 'interest_paid'],         setInterestCol, interestCol);
    detect(['fcf', 'free_cash_flow', 'levered_fcf'],                  setFcfCol,      fcfCol);
    detect(['maturity', 'maturity_year', 'due_year'],                 setSchedPeriod, schedPeriod);
    detect(['principal', 'principal_payment', 'amount_due'],          setSchedPrinc,  schedPrinc);
  }, [hasData, allHeaders]);

  // ── Build data ─────────────────────────────────────────────
  const periodRows = useMemo(() => {
    if (!periodCol || !debtCol) return [];
    return buildPeriodRows(data, periodCol, debtCol, stdCol, ltdCol, cashCol,
      assetsCol, equityCol, ebitdaCol, ebitCol, interestCol, fcfCol);
  }, [data, periodCol, debtCol, stdCol, ltdCol, cashCol, assetsCol, equityCol,
      ebitdaCol, ebitCol, interestCol, fcfCol]);

  const scheduleRows = useMemo(() => {
    if (!schedPeriod || !schedPrinc) return [];
    return buildSchedule(data, schedPeriod, schedPrinc, schedInt);
  }, [data, schedPeriod, schedPrinc, schedInt]);

  // ── Scale unit ─────────────────────────────────────────────
  const unit = useMemo(() => autoUnit(periodRows.length ? periodRows : [{ totalDebt: scheduleRows.reduce((a, r) => a + r.principal, 0) || 0 } as PeriodRow]), [periodRows, scheduleRows]);

  // ── Scaled chart rows ──────────────────────────────────────
  const chartRows = useMemo(() =>
    periodRows.map(r => ({
      period:       r.period,
      totalDebt:    scaleVal(r.totalDebt, unit),
      shortTermDebt:r.shortTermDebt !== null ? scaleVal(r.shortTermDebt, unit) : null,
      longTermDebt: r.longTermDebt  !== null ? scaleVal(r.longTermDebt,  unit) : null,
      cash:         r.cash          !== null ? scaleVal(r.cash,          unit) : null,
      netDebt:      r.netDebt       !== null ? scaleVal(r.netDebt,       unit) : null,
      ebitda:       r.ebitda        !== null ? scaleVal(r.ebitda,        unit) : null,
      netDebtEbitda:r.netDebtEbitda,
      debtEquity:   r.debtEquity,
      debtAssets:   r.debtAssets,
      icr:          r.icr,
      debtFcf:      r.debtFcf,
      riskLevel:    r.riskLevel,
    })),
    [periodRows, unit]
  );

  const schedChartRows = useMemo(() =>
    scheduleRows.map(r => ({
      period:    r.period,
      principal: scaleVal(r.principal, unit),
      interest:  r.interest !== null ? scaleVal(r.interest, unit) : null,
      total:     r.total    !== null ? scaleVal(r.total,    unit) : null,
      cumulative:scaleVal(r.cumulative, unit),
    })),
    [scheduleRows, unit]
  );

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!periodRows.length) return null;
    const last  = periodRows[periodRows.length - 1];
    const first = periodRows[0];
    return {
      latestPeriod:    last.period,
      latestDebt:      last.totalDebt,
      latestNetDebt:   last.netDebt,
      latestNDE:       last.netDebtEbitda,
      latestDE:        last.debtEquity,
      latestICR:       last.icr,
      latestRisk:      last.riskLevel,
      debtChange:      last.debtGrowth,
      totalPrincipal:  scheduleRows.reduce((a, r) => a + r.principal, 0),
      nearTermPrinc:   scheduleRows.slice(0, 2).reduce((a, r) => a + r.principal, 0),
      schedPeriods:    scheduleRows.length,
    };
  }, [periodRows, scheduleRows]);

  const hasRatios   = periodRows.length > 0;
  const hasSched    = scheduleRows.length > 0;
  const isConfigured = hasRatios || hasSched;
  const isExample    = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!periodRows.length && !scheduleRows.length) return;
    const ratioOut = periodRows.map(r => ({
      period: r.period, total_debt: r.totalDebt,
      short_term_debt: r.shortTermDebt ?? '', long_term_debt: r.longTermDebt ?? '',
      cash: r.cash ?? '', net_debt: r.netDebt ?? '',
      ebitda: r.ebitda ?? '', ebit: r.ebit ?? '',
      interest_expense: r.interestExp ?? '', fcf: r.fcf ?? '',
      net_debt_ebitda: r.netDebtEbitda ?? '',
      debt_equity: r.debtEquity ?? '',
      debt_assets_pct: r.debtAssets ?? '',
      icr: r.icr ?? '', debt_fcf: r.debtFcf ?? '',
      debt_growth_pct: r.debtGrowth ?? '',
      risk_level: r.riskLevel,
    }));
    const schedOut = scheduleRows.map(r => ({
      maturity: r.period, principal: r.principal,
      interest: r.interest ?? '', total: r.total ?? '',
      cumulative: r.cumulative,
    }));
    const csvContent = ratioOut.length
      ? Papa.unparse(ratioOut) + (schedOut.length ? '\n\n' + Papa.unparse(schedOut) : '')
      : Papa.unparse(schedOut);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `DebtLeverage_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [periodRows, scheduleRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `DebtLeverage_${new Date().toISOString().split('T')[0]}.png`;
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
            <p className="text-xs text-muted-foreground pt-2">Showing first 100 of {data.length.toLocaleString()} rows</p>
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
            <Scale className="h-5 w-5" />Debt Schedule & Leverage
          </CardTitle>
          <CardDescription>
            Analyze debt maturity schedules, leverage ratios, and repayment capacity — assess financial risk and covenant headroom.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Map columns for ratio analysis (Mode A) and/or maturity schedule (Mode B). Both modes are optional and independent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Mode A */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-primary/60" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mode A — Balance Sheet / Ratio Analysis</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'PERIOD *',       value: periodCol,   setter: setPeriodCol,   headers: allHeaders,     opt: false },
                { label: 'TOTAL DEBT *',   value: debtCol,     setter: setDebtCol,     headers: numericHeaders, opt: false },
                { label: 'SHORT-TERM DEBT',value: stdCol,      setter: setStdCol,      headers: numericHeaders, opt: true  },
                { label: 'LONG-TERM DEBT', value: ltdCol,      setter: setLtdCol,      headers: numericHeaders, opt: true  },
                { label: 'CASH',           value: cashCol,     setter: setCashCol,     headers: numericHeaders, opt: true  },
                { label: 'TOTAL ASSETS',   value: assetsCol,   setter: setAssetsCol,   headers: numericHeaders, opt: true  },
                { label: 'TOTAL EQUITY',   value: equityCol,   setter: setEquityCol,   headers: numericHeaders, opt: true  },
                { label: 'EBITDA',         value: ebitdaCol,   setter: setEbitdaCol,   headers: numericHeaders, opt: true  },
                { label: 'EBIT',           value: ebitCol,     setter: setEbitCol,     headers: numericHeaders, opt: true  },
                { label: 'INTEREST EXP.',  value: interestCol, setter: setInterestCol, headers: numericHeaders, opt: true  },
                { label: 'FREE CASH FLOW', value: fcfCol,      setter: setFcfCol,      headers: numericHeaders, opt: true  },
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
          </div>

          {/* Mode B */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-amber-400/80" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mode B — Debt Maturity Schedule</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: 'MATURITY *', value: schedPeriod, setter: setSchedPeriod, headers: allHeaders,     opt: false },
                { label: 'PRINCIPAL *',value: schedPrinc,  setter: setSchedPrinc,  headers: numericHeaders, opt: false },
                { label: 'INTEREST',   value: schedInt,    setter: setSchedInt,    headers: numericHeaders, opt: true  },
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Leverage Risk</div>
            {stats.latestRisk ? (
              <>
                <RiskBadge level={stats.latestRisk} size="md" />
                <div className="text-xs text-muted-foreground mt-2">
                  {stats.latestNDE !== null ? `Net Debt/EBITDA: ${stats.latestNDE.toFixed(2)}×` : stats.latestDE !== null ? `D/E: ${stats.latestDE.toFixed(2)}×` : 'Latest period'}
                </div>
              </>
            ) : <div className="text-slate-400 text-sm">—</div>}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Net Debt / EBITDA</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestNDE !== null ? `${stats.latestNDE.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.latestNDE !== null
                ? stats.latestNDE < 0 ? 'Net cash position'
                : stats.latestNDE < 1 ? 'Low leverage'
                : stats.latestNDE < 2 ? 'Manageable'
                : stats.latestNDE < 3 ? 'Elevated'
                : 'High — monitor covenants'
                : 'EBITDA or Cash not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Interest Coverage</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestICR !== null ? `${stats.latestICR.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.latestICR !== null
                ? stats.latestICR >= 5   ? 'Strong — comfortable'
                : stats.latestICR >= 2.5 ? 'Adequate'
                : stats.latestICR >= 1.5 ? 'Thin — watch closely'
                : 'Critical — below 1.5×'
                : 'EBIT or Interest not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {hasSched ? 'Near-Term Maturities' : 'Debt / Equity'}
            </div>
            {hasSched ? (
              <>
                <div className="text-2xl font-bold font-mono text-slate-800">
                  {fmtAbs(stats.nearTermPrinc, unit)}
                  {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  Due in next {Math.min(2, stats.schedPeriods)} period{stats.schedPeriods > 1 ? 's' : ''}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-slate-800">
                  {stats.latestDE !== null ? `${stats.latestDE.toFixed(2)}×` : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {stats.latestDE !== null
                    ? stats.latestDE < 0.5 ? 'Conservative'
                    : stats.latestDE < 1.5 ? 'Moderate'
                    : 'Leveraged balance sheet'
                    : 'Equity not mapped'}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Debt structure stacked ── */}
        {hasRatios && chartRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Debt Structure — Short-Term vs Long-Term</CardTitle>
              <CardDescription>
                Red = Long-Term Debt · Orange = Short-Term Debt · Green line = Cash · Violet line = Net Debt
                {unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={60}
                    tickFormatter={v => `${v}${unit}`} />
                  <Tooltip content={<DebtTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {chartRows.some(r => r.longTermDebt !== null) && (
                    <Bar dataKey="longTermDebt" name="Long-Term Debt" stackId="debt"
                      fill={LTD_COLOR} fillOpacity={0.82} />
                  )}
                  {chartRows.some(r => r.shortTermDebt !== null) && (
                    <Bar dataKey="shortTermDebt" name="Short-Term Debt" stackId="debt"
                      fill={STD_COLOR} fillOpacity={0.82} />
                  )}
                  {!chartRows.some(r => r.longTermDebt !== null) && (
                    <Bar dataKey="totalDebt" name="Total Debt" fill={DEBT_COLOR} fillOpacity={0.82} />
                  )}
                  {chartRows.some(r => r.cash !== null) && (
                    <Line dataKey="cash" name="Cash" stroke={CASH_COLOR} strokeWidth={2}
                      dot={{ r: 2.5, fill: CASH_COLOR }} connectNulls />
                  )}
                  {chartRows.some(r => r.netDebt !== null) && (
                    <Line dataKey="netDebt" name="Net Debt" stroke={NET_DEBT_COLOR} strokeWidth={2}
                      strokeDasharray="5 3" dot={{ r: 2, fill: NET_DEBT_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: Net Debt / EBITDA + EBITDA bars ── */}
        {hasRatios && chartRows.some(r => r.netDebtEbitda !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Net Debt / EBITDA & EBITDA Trend</CardTitle>
              <CardDescription>
                Green bars = EBITDA · Violet line = Net Debt/EBITDA ratio (right axis) — key leverage metric for lenders and covenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis yAxisId="ebitda" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={60} tickFormatter={v => `${v}${unit}`} />
                  <YAxis yAxisId="ratio" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={36}
                    tickFormatter={v => `${v.toFixed(1)}×`} />
                  <Tooltip content={<RatioTooltip suffix="×" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine yAxisId="ratio" y={1} stroke={CASH_COLOR}  strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: '1×', position: 'right', fontSize: 9, fill: CASH_COLOR }} />
                  <ReferenceLine yAxisId="ratio" y={3} stroke={DEBT_COLOR}  strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: '3×', position: 'right', fontSize: 9, fill: DEBT_COLOR }} />
                  <Bar yAxisId="ebitda" dataKey="ebitda" name={`EBITDA (${unit || 'abs'})`}
                    fill={EBITDA_COLOR} fillOpacity={0.75} maxBarSize={30} />
                  <Line yAxisId="ratio" dataKey="netDebtEbitda" name="Net Debt/EBITDA"
                    stroke={NET_DEBT_COLOR} strokeWidth={2.5}
                    dot={(props: any) => {
                      const v = props?.payload?.netDebtEbitda;
                      if (v === null || v === undefined) return <g key={props.key} />;
                      const color = v >= 4 ? '#DC2626' : v >= 3 ? '#EA580C' : v >= 2 ? '#D97706' : CASH_COLOR;
                      return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />;
                    }}
                    connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: ICR + D/E trend ── */}
        {hasRatios && (chartRows.some(r => r.icr !== null) || chartRows.some(r => r.debtEquity !== null)) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Interest Coverage & Debt / Equity</CardTitle>
              <CardDescription>
                Blue = ICR (EBIT/Interest, left axis) · Amber = D/E ratio (right axis) · ICR below 2.5× is a warning zone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(chartRows.length / 10) - 1)} />
                  <YAxis yAxisId="icr" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40} tickFormatter={v => `${v.toFixed(1)}×`} />
                  <YAxis yAxisId="de" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={36}
                    tickFormatter={v => `${v.toFixed(1)}×`} />
                  <Tooltip content={<RatioTooltip suffix="×" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine yAxisId="icr" y={2.5} stroke={DEBT_COLOR} strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: '2.5×', position: 'right', fontSize: 9, fill: DEBT_COLOR }} />
                  {chartRows.some(r => r.icr !== null) && (
                    <Line yAxisId="icr" dataKey="icr" name="ICR (EBIT/Int)"
                      stroke={ICR_COLOR} strokeWidth={2}
                      dot={{ r: 3, fill: ICR_COLOR }} connectNulls />
                  )}
                  {chartRows.some(r => r.debtEquity !== null) && (
                    <Line yAxisId="de" dataKey="debtEquity" name="Debt / Equity"
                      stroke={DE_COLOR} strokeWidth={2} strokeDasharray="5 3"
                      dot={{ r: 3, fill: DE_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Debt Maturity Schedule ── */}
        {hasSched && schedChartRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Debt Maturity Schedule</CardTitle>
              <CardDescription>
                Red = Principal due · Orange = Interest payments · Violet line = Cumulative principal
                {unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={schedChartRows} margin={{ top: 16, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis yAxisId="payment" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => `${v}${unit}`} />
                  <YAxis yAxisId="cumul" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={56}
                    tickFormatter={v => `${v}${unit}`} />
                  <Tooltip content={<DebtTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {schedChartRows.some(r => r.interest !== null) && (
                    <Bar yAxisId="payment" dataKey="interest" name="Interest" stackId="pay"
                      fill={STD_COLOR} fillOpacity={0.75} />
                  )}
                  <Bar yAxisId="payment" dataKey="principal" name="Principal" stackId="pay"
                    fill={DEBT_COLOR} fillOpacity={0.85} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="principal" position="top"
                      style={{ fontSize: 9, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => v > 0 ? `${v.toFixed(0)}${unit}` : ''} />
                  </Bar>
                  <Line yAxisId="cumul" dataKey="cumulative" name="Cumulative" stroke={NET_DEBT_COLOR}
                    strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: NET_DEBT_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Ratio Table ── */}
        {hasRatios && periodRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Leverage Ratio Table
              </CardTitle>
              <CardDescription>All computed leverage metrics by period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period','Total Debt','Net Debt',
                        ...(periodRows.some(r => r.netDebtEbitda !== null) ? ['ND/EBITDA'] : []),
                        ...(periodRows.some(r => r.debtEquity  !== null) ? ['D/E']       : []),
                        ...(periodRows.some(r => r.debtAssets  !== null) ? ['D/Assets']  : []),
                        ...(periodRows.some(r => r.icr         !== null) ? ['ICR']       : []),
                        ...(periodRows.some(r => r.debtFcf     !== null) ? ['Debt/FCF']  : []),
                        'Risk',
                      ].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...periodRows].reverse().map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2 font-mono text-xs">{fmtAbs(r.totalDebt, unit)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold"
                          style={{ color: r.netDebt !== null ? (r.netDebt < 0 ? CASH_COLOR : r.netDebt > r.totalDebt * 0.8 ? DEBT_COLOR : '#475569') : '#94A3B8' }}>
                          {r.netDebt !== null ? fmtAbs(r.netDebt, unit) : '—'}
                        </td>
                        {periodRows.some(p => p.netDebtEbitda !== null) && (
                          <td className="px-3 py-2 font-mono text-xs font-semibold"
                            style={{ color: r.netDebtEbitda !== null ? (r.netDebtEbitda < 2 ? CASH_COLOR : r.netDebtEbitda < 3 ? '#D97706' : DEBT_COLOR) : '#94A3B8' }}>
                            {r.netDebtEbitda !== null ? `${r.netDebtEbitda.toFixed(2)}×` : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.debtEquity !== null) && (
                          <td className="px-3 py-2 font-mono text-xs"
                            style={{ color: r.debtEquity !== null ? (r.debtEquity < 1 ? CASH_COLOR : r.debtEquity < 2 ? '#D97706' : DEBT_COLOR) : '#94A3B8' }}>
                            {r.debtEquity !== null ? `${r.debtEquity.toFixed(2)}×` : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.debtAssets !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {r.debtAssets !== null ? `${r.debtAssets.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.icr !== null) && (
                          <td className="px-3 py-2 font-mono text-xs font-semibold"
                            style={{ color: r.icr !== null ? (r.icr >= 5 ? CASH_COLOR : r.icr >= 2.5 ? '#D97706' : DEBT_COLOR) : '#94A3B8' }}>
                            {r.icr !== null ? `${r.icr.toFixed(2)}×` : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.debtFcf !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {r.debtFcf !== null ? `${r.debtFcf.toFixed(1)}y` : '—'}
                          </td>
                        )}
                        <td className="px-3 py-2"><RiskBadge level={r.riskLevel} size="sm" /></td>
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
          const last  = periodRows.length ? periodRows[periodRows.length - 1] : null;
          const first = periodRows.length ? periodRows[0] : null;

          // Trend analysis
          const ndeVals = periodRows.map(r => r.netDebtEbitda).filter((v): v is number => v !== null);
          const ndeTrend = ndeVals.length >= 3
            ? ndeVals[ndeVals.length - 1] - ndeVals[0] : null;

          // Maturity concentration
          const totalPrinc = scheduleRows.reduce((a, r) => a + r.principal, 0);
          const maxSched   = scheduleRows.length
            ? scheduleRows.reduce((a, b) => a.principal > b.principal ? a : b, scheduleRows[0])
            : null;
          const concentrationPct = maxSched && totalPrinc > 0
            ? (maxSched.principal / totalPrinc) * 100 : 0;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated debt and leverage analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">Leverage Overview</span>
                    {last && <RiskBadge level={last.riskLevel} size="md" />}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {last && <>
                      Latest period (<span className="font-semibold">{last.period}</span>): Total Debt{' '}
                      <span className="font-semibold">{fmtAbs(last.totalDebt, unit)}{unit}</span>
                      {last.netDebt !== null && <>, Net Debt{' '}
                        <span className={`font-semibold ${last.netDebt < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {fmtAbs(last.netDebt, unit)}{unit}
                        </span>
                      </>}
                      {last.netDebtEbitda !== null && <>, Net Debt/EBITDA{' '}
                        <span className={`font-semibold ${last.netDebtEbitda < 2 ? 'text-emerald-600' : last.netDebtEbitda < 3 ? 'text-amber-600' : 'text-red-600'}`}>
                          {last.netDebtEbitda.toFixed(2)}×
                        </span>
                      </>}
                      {last.icr !== null && <>, ICR{' '}
                        <span className={`font-semibold ${last.icr >= 5 ? 'text-emerald-600' : last.icr >= 2.5 ? 'text-amber-600' : 'text-red-600'}`}>
                          {last.icr.toFixed(2)}×
                        </span>
                      </>}.
                    </>}
                    {hasSched && <> Total scheduled principal: <span className="font-semibold">{fmtAbs(stats.totalPrincipal, unit)}{unit}</span> across {stats.schedPeriods} maturity periods.</>}
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'ND/EBITDA Latest', value: stats.latestNDE !== null ? `${stats.latestNDE.toFixed(2)}×` : '—', sub: 'primary leverage measure' },
                    { label: 'ND/EBITDA Trend',  value: ndeTrend !== null ? `${ndeTrend >= 0 ? '+' : ''}${ndeTrend.toFixed(2)}×` : '—', sub: ndeTrend !== null ? (ndeTrend < 0 ? 'deleveraging ✓' : 'increasing leverage') : 'insufficient data' },
                    { label: 'ICR Latest',        value: stats.latestICR !== null ? `${stats.latestICR.toFixed(2)}×` : '—', sub: 'EBIT / interest expense' },
                    { label: 'D/E Latest',        value: stats.latestDE  !== null ? `${stats.latestDE.toFixed(2)}×`  : '—', sub: 'debt to equity' },
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

                  {/* Net Debt / EBITDA */}
                  {last?.netDebtEbitda !== null && last !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Net Debt / EBITDA — {last.riskLevel} Risk</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.netDebtEbitda! < 0
                            ? `Net cash position (${last.netDebtEbitda!.toFixed(2)}×) — the company holds more cash than debt. This is the strongest possible leverage position and provides maximum financial flexibility for acquisitions, buybacks, or weathering downturns.`
                            : last.netDebtEbitda! < 1
                            ? `Net Debt/EBITDA of ${last.netDebtEbitda!.toFixed(2)}× is low leverage. The company could repay all net debt from roughly ${last.netDebtEbitda!.toFixed(1)} year${last.netDebtEbitda! > 0.9 ? '' : 's'} of EBITDA. Covenants are typically set at 3–4×, so there is substantial headroom.`
                            : last.netDebtEbitda! < 2
                            ? `Net Debt/EBITDA of ${last.netDebtEbitda!.toFixed(2)}× is moderate and typical for investment-grade companies. Most lenders become cautious above 3×, so the current level provides reasonable covenant headroom.`
                            : last.netDebtEbitda! < 3
                            ? `Net Debt/EBITDA of ${last.netDebtEbitda!.toFixed(2)}× is elevated. This is within the range where lenders apply more scrutiny. Monitor free cash flow generation to ensure deleveraging capacity exists.`
                            : last.netDebtEbitda! < 4
                            ? `Net Debt/EBITDA of ${last.netDebtEbitda!.toFixed(2)}× is high. Most investment-grade covenant thresholds are around 3.5–4×. If EBITDA deteriorates, covenant breach risk increases materially.`
                            : `Net Debt/EBITDA of ${last.netDebtEbitda!.toFixed(2)}× is at distressed levels. This typically implies sub-investment grade credit quality and significant refinancing/covenant risk. EBITDA growth or debt reduction is urgently needed.`}
                          {ndeTrend !== null && (
                            <> The ratio has {ndeTrend < -0.3 ? `improved by ${Math.abs(ndeTrend).toFixed(2)}× since ${first?.period} — a positive deleveraging trajectory` : ndeTrend > 0.3 ? `increased by ${ndeTrend.toFixed(2)}× since ${first?.period} — leverage is building and should be monitored` : `remained relatively stable since ${first?.period}`}.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ICR */}
                  {last?.icr !== null && last !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Interest Coverage Ratio — {last.icr!.toFixed(2)}×</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.icr! >= 8
                            ? `ICR of ${last.icr!.toFixed(2)}× is excellent — operating profit covers interest expense ${last.icr!.toFixed(1)} times. The company has ample earnings cushion even if EBIT declined significantly.`
                            : last.icr! >= 5
                            ? `ICR of ${last.icr!.toFixed(2)}× is strong and comfortable. The company can service its debt with significant buffer. This level supports investment-grade credit positioning.`
                            : last.icr! >= 2.5
                            ? `ICR of ${last.icr!.toFixed(2)}× is adequate but requires monitoring. A covenant of 2.0–2.5× is common, so current headroom is limited. An earnings decline could push the ratio to concerning levels.`
                            : last.icr! >= 1.5
                            ? `ICR of ${last.icr!.toFixed(2)}× is thin. The company earns only ${last.icr!.toFixed(2)} times its interest cost. A modest EBIT decline would breach standard 1.5–2.0× covenant thresholds.`
                            : `ICR of ${last.icr!.toFixed(2)}× is critically low. Operating profit barely covers interest expense. This signals potential debt service stress and is a red flag for lenders and investors.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Maturity schedule */}
                  {hasSched && maxSched && (
                    <div className="flex gap-3 items-start">
                      <div className={`w-0.5 min-h-[40px] rounded-full shrink-0 mt-1 ${concentrationPct > 40 ? 'bg-amber-400/60' : 'bg-primary/30'}`} />
                      <div>
                        <p className={`text-sm font-semibold mb-0.5 ${concentrationPct > 40 ? 'text-amber-600' : 'text-primary'}`}>
                          Maturity Schedule{concentrationPct > 40 ? ' — Concentration Risk' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Total scheduled principal is{' '}
                          <span className="font-semibold">{fmtAbs(stats.totalPrincipal, unit)}{unit}</span>{' '}
                          across {stats.schedPeriods} periods. The largest single maturity is{' '}
                          <span className="font-semibold">{maxSched.period}</span>{' '}
                          with <span className="font-semibold">{fmtAbs(maxSched.principal, unit)}{unit}</span>{' '}
                          ({concentrationPct.toFixed(0)}% of total).
                          {concentrationPct > 50
                            ? ` This represents a significant refinancing wall — more than half of total debt matures in a single period. Refinancing risk is high if credit markets tighten around that date.`
                            : concentrationPct > 30
                            ? ` This is a meaningful concentration. Ensure refinancing capacity or cash reserves are available well in advance of this maturity.`
                            : ` Maturities are reasonably distributed, which reduces refinancing risk.`}
                          {stats.nearTermPrinc > 0 && (
                            <> Near-term maturities (first {Math.min(2, stats.schedPeriods)} period{stats.schedPeriods > 1 ? 's' : ''}) total <span className="font-semibold">{fmtAbs(stats.nearTermPrinc, unit)}{unit}</span> — ensure liquidity is in place.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* D/E ratio */}
                  {last?.debtEquity !== null && last !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Debt / Equity — {last.debtEquity!.toFixed(2)}×</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.debtEquity! < 0.5
                            ? `D/E of ${last.debtEquity!.toFixed(2)}× indicates a conservatively capitalized balance sheet. The equity base is substantially larger than debt, offering strong solvency protection.`
                            : last.debtEquity! < 1.5
                            ? `D/E of ${last.debtEquity!.toFixed(2)}× is moderate. Debt and equity are reasonably balanced — this is typical for investment-grade industrials and consumer companies.`
                            : last.debtEquity! < 3
                            ? `D/E of ${last.debtEquity!.toFixed(2)}× is elevated. The debt load is ${last.debtEquity!.toFixed(1)} times equity. This amplifies returns in good times but increases bankruptcy risk in downturns.`
                            : `D/E of ${last.debtEquity!.toFixed(2)}× is high. The company is heavily leveraged relative to its equity base, which reduces financial flexibility and increases lender risk sensitivity.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Net Debt = Total Debt − Cash. Net Debt/EBITDA = primary leverage ratio used by lenders.
                  ICR (Interest Coverage Ratio) = EBIT / Interest Expense — measures debt service capacity.
                  Debt/Equity and Debt/Assets measure balance sheet capitalization.
                  Debt/FCF estimates years to repay debt from free cash flow.
                  Risk classification: Low (&lt;1×), Moderate (1–2×), Elevated (2–3×), High (3–4×), Critical (&gt;4×) based on Net Debt/EBITDA.
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

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
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
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

type HealthLabel = 'Excellent' | 'Good' | 'Marginal' | 'Poor' | 'Critical';

interface PeriodRow {
  period:        string;
  // Core inputs
  ltv:           number | null;  // Customer Lifetime Value
  cac:           number | null;  // Customer Acquisition Cost
  arpu:          number | null;  // Average Revenue Per User
  grossMargin:   number | null;  // % (0–100)
  churnRate:     number | null;  // % monthly or annual
  avgLifeMonths: number | null;  // average customer lifetime in months
  newCustomers:  number | null;  // newly acquired customers
  totalCustomers:number | null;  // total active customers
  // Derived
  ltvCacRatio:   number | null;  // LTV / CAC
  cacPayback:    number | null;  // months to recover CAC = CAC / (ARPU * GrossMargin%)
  netRevenueRetention: number | null; // NRR %
  health:        HealthLabel;
}

interface PaybackRow {
  month:      number;   // 1..36
  cumRevenue: number;   // cumulative gross profit per customer
  cac:        number;   // CAC horizontal line
  recovered:  boolean;
}

// ============================================
// Constants
// ============================================

const LTV_COLOR    = '#6C3AED';   // violet
const CAC_COLOR    = '#EF4444';   // red
const RATIO_COLOR  = '#10B981';   // green
const PAYBACK_COLOR= '#3B82F6';   // blue
const ARPU_COLOR   = '#F59E0B';   // amber
const CHURN_COLOR  = '#F97316';   // orange
const NRR_COLOR    = '#06B6D4';   // cyan

const HEALTH_CONFIG: Record<HealthLabel, { color: string; bg: string; border: string; desc: string }> = {
  'Excellent': { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', desc: 'LTV/CAC ≥ 5× — outstanding unit economics' },
  'Good':      { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', desc: 'LTV/CAC 3–5× — healthy, sustainable growth' },
  'Marginal':  { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', desc: 'LTV/CAC 1–3× — profitable but thin margin' },
  'Poor':      { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', desc: 'LTV/CAC < 1× — destroying value per customer' },
  'Critical':  { color: '#991B1B', bg: '#FEE2E2', border: '#EF4444', desc: 'No LTV/CAC data or negative LTV' },
};

// ============================================
// Helpers
// ============================================

function classifyHealth(ratio: number | null): HealthLabel {
  if (ratio === null || !isFinite(ratio)) return 'Critical';
  if (ratio < 0)   return 'Critical';
  if (ratio < 1)   return 'Poor';
  if (ratio < 3)   return 'Marginal';
  if (ratio < 5)   return 'Good';
  return 'Excellent';
}

// LTV from components if not directly provided
function deriveLTV(
  arpu: number | null,
  grossMargin: number | null,
  churnRate: number | null,
  avgLifeMonths: number | null,
): number | null {
  // Method 1: LTV = ARPU × GrossMargin% × AvgLifeMonths
  if (arpu !== null && grossMargin !== null && avgLifeMonths !== null) {
    return parseFloat((arpu * (grossMargin / 100) * avgLifeMonths).toFixed(2));
  }
  // Method 2: LTV = ARPU × GrossMargin% / ChurnRate%  (churn as monthly %)
  if (arpu !== null && grossMargin !== null && churnRate !== null && churnRate > 0) {
    return parseFloat((arpu * (grossMargin / 100) / (churnRate / 100)).toFixed(2));
  }
  return null;
}

// CAC Payback: months until cumulative gross profit covers CAC
function buildPaybackCurve(
  cac: number,
  arpu: number,
  grossMarginPct: number,
  months: number = 36,
): PaybackRow[] {
  const monthlyGP = arpu * (grossMarginPct / 100);
  const rows: PaybackRow[] = [];
  let cumRev = 0;
  let recovered = false;
  for (let m = 1; m <= months; m++) {
    cumRev += monthlyGP;
    if (!recovered && cumRev >= cac) recovered = true;
    rows.push({
      month:      m,
      cumRevenue: parseFloat(cumRev.toFixed(2)),
      cac:        parseFloat(cac.toFixed(2)),
      recovered,
    });
  }
  return rows;
}

function buildPeriodRows(
  data:          Record<string, any>[],
  periodCol:     string,
  ltvCol:        string,
  cacCol:        string,
  arpuCol:       string,
  gmCol:         string,
  churnCol:      string,
  avgLifeCol:    string,
  newCustCol:    string,
  totalCustCol:  string,
  nrrCol:        string,
): PeriodRow[] {
  const p = (r: Record<string, any>, col: string) =>
    col ? parseFloat(r[col]) : NaN;

  const raw = data
    .map(r => ({
      period:      String(r[periodCol] ?? '').trim(),
      ltv:         p(r, ltvCol),
      cac:         p(r, cacCol),
      arpu:        p(r, arpuCol),
      gm:          p(r, gmCol),
      churn:       p(r, churnCol),
      avgLife:     p(r, avgLifeCol),
      newCust:     p(r, newCustCol),
      totalCust:   p(r, totalCustCol),
      nrr:         p(r, nrrCol),
    }))
    .filter(r => r.period);

  return raw.map(r => {
    const ltv   = isFinite(r.ltv)     ? r.ltv     : null;
    const cac   = isFinite(r.cac)     ? r.cac     : null;
    const arpu  = isFinite(r.arpu)    ? r.arpu    : null;
    const gm    = isFinite(r.gm)      ? r.gm      : null;
    const churn = isFinite(r.churn)   ? r.churn   : null;
    const avgLife= isFinite(r.avgLife) ? r.avgLife : null;
    const newCust= isFinite(r.newCust) ? r.newCust : null;
    const totalCust= isFinite(r.totalCust) ? r.totalCust : null;
    const nrr   = isFinite(r.nrr)     ? r.nrr     : null;

    // Derive LTV if not given
    const effectiveLTV = ltv ?? deriveLTV(arpu, gm, churn, avgLife);

    // CAC Payback = CAC / monthly gross profit
    const cacPayback = (() => {
      if (cac === null || arpu === null || gm === null || gm <= 0) return null;
      const monthly = arpu * (gm / 100);
      return monthly > 0 ? parseFloat((cac / monthly).toFixed(1)) : null;
    })();

    const ltvCacRatio = effectiveLTV !== null && cac !== null && cac > 0
      ? parseFloat((effectiveLTV / cac).toFixed(2)) : null;

    return {
      period:       r.period,
      ltv:          effectiveLTV,
      cac,
      arpu,
      grossMargin:  gm,
      churnRate:    churn,
      avgLifeMonths:avgLife,
      newCustomers: newCust,
      totalCustomers: totalCust,
      netRevenueRetention: nrr,
      ltvCacRatio,
      cacPayback,
      health: classifyHealth(ltvCacRatio),
    };
  });
}

// ============================================
// Example Data
// ============================================

function generateExampleData(): Record<string, any>[] {
  const quarters = [
    '2022Q1','2022Q2','2022Q3','2022Q4',
    '2023Q1','2023Q2','2023Q3','2023Q4',
    '2024Q1','2024Q2','2024Q3','2024Q4',
  ];
  let cac = 420, arpu = 85, gm = 68, churn = 3.2, totalCust = 1800, nrr = 108;

  return quarters.map((q) => {
    // Improving unit economics over time
    cac   = Math.max(200, cac   * (1 + (Math.random() - 0.6) * 0.10));
    arpu  = Math.max(50,  arpu  * (1 + (Math.random() - 0.35) * 0.06));
    gm    = Math.min(85,  Math.max(50, gm + (Math.random() - 0.4) * 1.5));
    churn = Math.max(0.8, churn * (1 + (Math.random() - 0.65) * 0.08));
    nrr   = Math.min(140, Math.max(90, nrr + (Math.random() - 0.4) * 3));
    const newCust = Math.round(150 + Math.random() * 100);
    totalCust = Math.round(totalCust * (1 - churn / 100) + newCust);
    const ltv = (arpu * (gm / 100)) / (churn / 100);
    return {
      period:      q,
      cac:         parseFloat(cac.toFixed(1)),
      arpu:        parseFloat(arpu.toFixed(1)),
      gross_margin:parseFloat(gm.toFixed(1)),
      churn_rate:  parseFloat(churn.toFixed(2)),
      new_customers: newCust,
      total_customers: totalCust,
      nrr:         parseFloat(nrr.toFixed(1)),
      ltv:         parseFloat(ltv.toFixed(1)),
    };
  });
}

// ============================================
// Tooltips
// ============================================

const GenericTooltip = ({ active, payload, label, suffix = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-mono font-semibold text-slate-700">
              {typeof p.value === 'number'
                ? suffix ? `${p.value.toFixed(2)}${suffix}` : p.value.toFixed(2)
                : p.value}
            </span>
          </div>
        ))}
    </div>
  );
};

const PaybackTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PaybackRow;
  if (!d) return null;
  const diff = d.cumRevenue - d.cac;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">Month {label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Cum. Gross Profit</span>
        <span className="font-mono font-semibold">{d.cumRevenue.toFixed(1)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">CAC</span>
        <span className="font-mono font-semibold">{d.cac.toFixed(1)}</span>
      </div>
      <div className={`flex justify-between gap-4 mt-1 pt-1 border-t border-slate-100`}>
        <span className="text-slate-500">{diff >= 0 ? 'Net Profit' : 'Unrecovered'}</span>
        <span className={`font-mono font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

// ============================================
// Health Badge
// ============================================

const HealthBadge = ({ health, size = 'sm' }: { health: HealthLabel; size?: 'sm' | 'md' | 'lg' }) => {
  const cfg = HEALTH_CONFIG[health];
  const cls = size === 'lg' ? 'px-3 py-1.5 text-sm font-bold'
            : size === 'md' ? 'px-2.5 py-1 text-xs font-bold'
            : 'px-2 py-0.5 text-xs font-semibold';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${cls}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
      {health}
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
            <Target className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Unit Economics — LTV vs CAC</CardTitle>
        <CardDescription className="text-base mt-2">
          Compare Customer Lifetime Value against Customer Acquisition Cost — measure the fundamental
          profitability of each customer relationship and track unit economic health over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Target className="w-6 h-6 text-primary mb-2" />,
              title: 'LTV / CAC Ratio',
              desc:  'The single most important SaaS and subscription metric — how many dollars of lifetime value you earn for every dollar spent acquiring a customer. 3× is the minimum healthy benchmark.',
            },
            {
              icon: <Zap className="w-6 h-6 text-primary mb-2" />,
              title: 'CAC Payback Period',
              desc:  'How many months until cumulative gross profit from a new customer covers the cost to acquire them. The payback curve shows recovery timing and profitability at the cohort level.',
            },
            {
              icon: <Users className="w-6 h-6 text-primary mb-2" />,
              title: 'Cohort Health Trends',
              desc:  'Track LTV, CAC, ARPU, churn rate, and NRR over time — identify whether unit economics are improving (scale) or deteriorating (market saturation, increased competition).',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Health scale */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(Object.entries(HEALTH_CONFIG) as [HealthLabel, typeof HEALTH_CONFIG[HealthLabel]][]).map(([label, cfg]) => (
            <div key={label} className="rounded-lg border p-2.5" style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}>
              <div className="text-xs font-bold mb-0.5" style={{ color: cfg.color }}>{label}</div>
              <div className="text-xs" style={{ color: cfg.color, opacity: 0.85 }}>{cfg.desc.split('—')[0].trim()}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />Input Flexibility
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can provide LTV directly, or let the page derive it from ARPU, Gross Margin, and Churn Rate
            (LTV = ARPU × Gross Margin% ÷ Monthly Churn%) or from Average Customer Lifetime
            (LTV = ARPU × Gross Margin% × Avg Life in Months).
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Columns
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {[
                  ['period', 'fiscal period label', true],
                  ['cac', 'customer acquisition cost', true],
                  ['ltv', 'lifetime value (or derive below)', false],
                  ['arpu', 'avg revenue per user / month', false],
                  ['gross_margin', '% gross margin (0–100)', false],
                  ['churn_rate', '% monthly churn rate', false],
                  ['avg_lifetime_months', 'avg customer life in months', false],
                  ['new_customers', 'newly acquired this period', false],
                  ['total_customers', 'total active customers', false],
                  ['nrr', 'net revenue retention %', false],
                ].map(([col, desc, req]) => (
                  <li key={col as string} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span><strong>{col as string}</strong>{req as boolean ? ' *' : ''} — {desc as string}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {[
                  'LTV vs CAC bar comparison over periods',
                  'LTV/CAC ratio trend line with health zones',
                  'CAC payback curve — month-by-month recovery',
                  'ARPU, churn rate & NRR trend panel',
                  'Customer growth (new vs total) chart',
                  'Full metrics table + health classification',
                  'Auto-generated insights per observation',
                ].map(s => (
                  <li key={s} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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

// ============================================
// Main Component
// ============================================

export default function UnitEconomicsLtvCacPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ─────────────────────────────────────────
  const [periodCol,   setPeriodCol]   = useState('');
  const [cacCol,      setCacCol]      = useState('');
  const [ltvCol,      setLtvCol]      = useState('');
  const [arpuCol,     setArpuCol]     = useState('');
  const [gmCol,       setGmCol]       = useState('');
  const [churnCol,    setChurnCol]    = useState('');
  const [avgLifeCol,  setAvgLifeCol]  = useState('');
  const [newCustCol,  setNewCustCol]  = useState('');
  const [totalCustCol,setTotalCustCol]= useState('');
  const [nrrCol,      setNrrCol]      = useState('');

  // ── Payback curve selection ────────────────────────────────
  const [paybackPeriodIdx, setPaybackPeriodIdx] = useState(0);
  const [paybackMonths,    setPaybackMonths]    = useState(36);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_unit_economics.csv');
    setPeriodCol('period');      setCacCol('cac');
    setLtvCol('ltv');            setArpuCol('arpu');
    setGmCol('gross_margin');    setChurnCol('churn_rate');
    setNewCustCol('new_customers');
    setTotalCustCol('total_customers');
    setNrrCol('nrr');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    [setPeriodCol, setCacCol, setLtvCol, setArpuCol, setGmCol,
     setChurnCol, setAvgLifeCol, setNewCustCol, setTotalCustCol, setNrrCol]
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
    detect(['period','quarter','year','date','cohort'],              setPeriodCol,    periodCol);
    detect(['cac','customer_acquisition_cost','acquisition_cost'],  setCacCol,       cacCol);
    detect(['ltv','lifetime_value','clv','customer_lifetime_value'],setLtvCol,       ltvCol);
    detect(['arpu','avg_revenue','average_revenue_per_user'],       setArpuCol,      arpuCol);
    detect(['gross_margin','gm','margin_pct','margin_percent'],     setGmCol,        gmCol);
    detect(['churn','churn_rate','monthly_churn'],                  setChurnCol,     churnCol);
    detect(['avg_lifetime','avg_life','lifetime_months'],           setAvgLifeCol,   avgLifeCol);
    detect(['new_customers','new_cust','acquisitions'],             setNewCustCol,   newCustCol);
    detect(['total_customers','total_cust','active_customers'],     setTotalCustCol, totalCustCol);
    detect(['nrr','net_revenue_retention','net_retention'],         setNrrCol,       nrrCol);
  }, [hasData, allHeaders]);

  // ── Build rows ─────────────────────────────────────────────
  const periodRows = useMemo(() => {
    if (!periodCol || !cacCol) return [];
    return buildPeriodRows(data, periodCol, ltvCol, cacCol, arpuCol,
      gmCol, churnCol, avgLifeCol, newCustCol, totalCustCol, nrrCol);
  }, [data, periodCol, cacCol, ltvCol, arpuCol, gmCol, churnCol,
      avgLifeCol, newCustCol, totalCustCol, nrrCol]);

  // ── Payback curve ──────────────────────────────────────────
  const safeIdx    = Math.min(paybackPeriodIdx, periodRows.length - 1);
  const paybackRow = periodRows[safeIdx] ?? null;
  const paybackCurve = useMemo(() => {
    if (!paybackRow || paybackRow.cac === null ||
        paybackRow.arpu === null || paybackRow.grossMargin === null) return [];
    return buildPaybackCurve(paybackRow.cac, paybackRow.arpu, paybackRow.grossMargin, paybackMonths);
  }, [paybackRow, paybackMonths]);

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!periodRows.length) return null;
    const last  = periodRows[periodRows.length - 1];
    const first = periodRows[0];
    const ratios = periodRows.map(r => r.ltvCacRatio).filter((v): v is number => v !== null);
    const avgRatio = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
    const ratioDelta = ratios.length >= 2 ? ratios[ratios.length - 1] - ratios[0] : null;
    const paybackMonthActual = paybackCurve.find(r => r.recovered)?.month ?? null;
    return {
      latestPeriod:   last.period,
      latestLtv:      last.ltv,
      latestCac:      last.cac,
      latestRatio:    last.ltvCacRatio,
      latestHealth:   last.health,
      latestPayback:  last.cacPayback,
      latestChurn:    last.churnRate,
      latestNrr:      last.netRevenueRetention,
      avgRatio,
      ratioDelta,
      paybackMonthActual,
      totalPeriods:   periodRows.length,
    };
  }, [periodRows, paybackCurve]);

  const isConfigured    = !!(periodCol && cacCol && periodRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!periodRows.length) return;
    const rows = periodRows.map(r => ({
      period:        r.period,
      ltv:           r.ltv           ?? '',
      cac:           r.cac           ?? '',
      ltv_cac_ratio: r.ltvCacRatio   ?? '',
      cac_payback_months: r.cacPayback ?? '',
      arpu:          r.arpu          ?? '',
      gross_margin_pct: r.grossMargin ?? '',
      churn_rate_pct:r.churnRate     ?? '',
      avg_life_months: r.avgLifeMonths ?? '',
      new_customers: r.newCustomers  ?? '',
      total_customers: r.totalCustomers ?? '',
      nrr_pct:       r.netRevenueRetention ?? '',
      health:        r.health,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `UnitEconomics_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `UnitEconomics_${new Date().toISOString().split('T')[0]}.png`;
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
            <Target className="h-5 w-5" />Unit Economics — LTV vs CAC
          </CardTitle>
          <CardDescription>
            Measure the profitability of each customer relationship — track LTV/CAC ratio, payback period, churn, and NRR trends to assess the health and scalability of your business model.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Map columns. LTV can be provided directly or derived from ARPU + Gross Margin + Churn Rate (or Avg Lifetime).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { label: 'PERIOD *',        value: periodCol,    setter: setPeriodCol,    headers: allHeaders,     opt: false },
              { label: 'CAC *',           value: cacCol,       setter: setCacCol,       headers: numericHeaders, opt: false },
              { label: 'LTV',             value: ltvCol,       setter: setLtvCol,       headers: numericHeaders, opt: true  },
              { label: 'ARPU (monthly)',   value: arpuCol,      setter: setArpuCol,      headers: numericHeaders, opt: true  },
              { label: 'GROSS MARGIN %',  value: gmCol,        setter: setGmCol,        headers: numericHeaders, opt: true  },
              { label: 'CHURN RATE %',    value: churnCol,     setter: setChurnCol,     headers: numericHeaders, opt: true  },
              { label: 'AVG LIFE (mo.)',  value: avgLifeCol,   setter: setAvgLifeCol,   headers: numericHeaders, opt: true  },
              { label: 'NEW CUSTOMERS',   value: newCustCol,   setter: setNewCustCol,   headers: numericHeaders, opt: true  },
              { label: 'TOTAL CUSTOMERS', value: totalCustCol, setter: setTotalCustCol, headers: numericHeaders, opt: true  },
              { label: 'NRR %',           value: nrrCol,       setter: setNrrCol,       headers: numericHeaders, opt: true  },
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

          {/* Payback curve period selector */}
          {isConfigured && periodRows.length > 0 && (
            <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">PAYBACK CURVE — PERIOD</Label>
                <Select value={String(safeIdx)} onValueChange={v => setPaybackPeriodIdx(parseInt(v))}>
                  <SelectTrigger className="text-xs h-7 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {periodRows.map((r, i) => (
                      <SelectItem key={i} value={String(i)}>{r.period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">PROJECTION MONTHS</Label>
                <input
                  type="number" value={paybackMonths} min={6} max={60}
                  onChange={e => { const n = parseInt(e.target.value); if (n >= 6 && n <= 60) setPaybackMonths(n); }}
                  className="w-20 h-7 text-xs border border-slate-200 rounded px-2 font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              {paybackRow && paybackRow.cac !== null && paybackRow.arpu !== null && paybackRow.grossMargin !== null && (
                <div className="text-xs text-muted-foreground pb-0.5">
                  CAC: <span className="font-mono font-semibold">{paybackRow.cac.toFixed(1)}</span> ·
                  Monthly GP/customer: <span className="font-mono font-semibold">{(paybackRow.arpu * (paybackRow.grossMargin / 100)).toFixed(1)}</span>
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Unit Economics Health</div>
            <HealthBadge health={stats.latestHealth} size="md" />
            <div className="text-xs text-muted-foreground mt-2">
              {stats.latestRatio !== null ? `LTV/CAC: ${stats.latestRatio.toFixed(2)}×` : 'LTV not available'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">LTV / CAC</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestRatio !== null ? `${stats.latestRatio.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Avg: {stats.avgRatio !== null ? `${stats.avgRatio.toFixed(2)}×` : '—'}
              {stats.ratioDelta !== null && (
                <span className="ml-2 font-semibold text-slate-700">
                  {stats.ratioDelta >= 0 ? '▲' : '▼'} {Math.abs(stats.ratioDelta).toFixed(2)}×
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">CAC Payback</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestPayback !== null ? `${stats.latestPayback.toFixed(0)}mo` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.latestPayback !== null
                ? stats.latestPayback <= 12 ? 'Excellent — under 12 months'
                : stats.latestPayback <= 18 ? 'Good — under 18 months'
                : stats.latestPayback <= 24 ? 'Acceptable — under 24 months'
                : 'Long — review CAC efficiency'
                : 'ARPU or Margin not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {stats.latestNrr !== null ? 'Net Revenue Retention' : 'Monthly Churn'}
            </div>
            {stats.latestNrr !== null ? (
              <>
                <div className="text-2xl font-bold font-mono text-slate-800">
                  {stats.latestNrr.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {stats.latestNrr >= 120 ? 'Best-in-class expansion'
                  : stats.latestNrr >= 110 ? 'Strong upsell momentum'
                  : stats.latestNrr >= 100 ? 'Retaining full base'
                  : 'Contraction — NRR < 100%'}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-slate-800">
                  {stats.latestChurn !== null ? `${stats.latestChurn.toFixed(2)}%` : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {stats.latestChurn !== null
                    ? stats.latestChurn <= 1  ? 'Low — excellent retention'
                    : stats.latestChurn <= 3  ? 'Moderate'
                    : stats.latestChurn <= 5  ? 'Elevated — monitor closely'
                    : 'High — retention issue'
                    : 'Churn not mapped'}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: LTV vs CAC bars ── */}
        {isConfigured && periodRows.some(r => r.ltv !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">LTV vs CAC by Period</CardTitle>
              <CardDescription>
                Violet = LTV · Red = CAC · Green line = LTV/CAC ratio (right axis) · 3× benchmark dashed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={periodRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(periodRows.length / 10) - 1)} />
                  <YAxis yAxisId="value" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(0)} />
                  <YAxis yAxisId="ratio" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={36}
                    tickFormatter={v => `${v.toFixed(1)}×`} />
                  <Tooltip content={<GenericTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine yAxisId="ratio" y={3} stroke={RATIO_COLOR} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: '3×', position: 'right', fontSize: 9, fill: RATIO_COLOR }} />
                  <Bar yAxisId="value" dataKey="ltv" name="LTV" fill={LTV_COLOR} fillOpacity={0.82} maxBarSize={28} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="value" dataKey="cac" name="CAC" fill={CAC_COLOR} fillOpacity={0.82} maxBarSize={28} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="ratio" dataKey="ltvCacRatio" name="LTV/CAC"
                    stroke={RATIO_COLOR} strokeWidth={2.5}
                    dot={(props: any) => {
                      const v = props?.payload?.ltvCacRatio;
                      if (v === null || v === undefined) return <g key={props.key} />;
                      const color = v >= 5 ? '#059669' : v >= 3 ? RATIO_COLOR : v >= 1 ? '#D97706' : CAC_COLOR;
                      return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />;
                    }}
                    connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: CAC Payback Curve ── */}
        {isConfigured && paybackCurve.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                CAC Payback Curve — {paybackRow?.period}
              </CardTitle>
              <CardDescription>
                Blue area = cumulative gross profit per customer · Red line = CAC to recover ·
                Intersection = payback month ({stats?.paybackMonthActual !== null ? `Month ${stats?.paybackMonthActual}` : 'beyond projection'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={paybackCurve} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip content={<PaybackTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {/* Shade recovered region */}
                  {stats?.paybackMonthActual !== null && stats?.paybackMonthActual !== undefined && (
                    <ReferenceLine x={stats.paybackMonthActual} stroke={RATIO_COLOR}
                      strokeDasharray="4 3" strokeWidth={1.5}
                      label={{ value: `Payback: Mo.${stats.paybackMonthActual}`, position: 'top', fontSize: 9, fill: RATIO_COLOR }} />
                  )}
                  <Area dataKey="cumRevenue" name="Cum. Gross Profit"
                    stroke={PAYBACK_COLOR} fill={PAYBACK_COLOR} fillOpacity={0.15}
                    strokeWidth={2} dot={false} connectNulls />
                  <Line dataKey="cac" name="CAC"
                    stroke={CAC_COLOR} strokeWidth={2} strokeDasharray="5 3"
                    dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: ARPU + Churn + NRR ── */}
        {isConfigured && (periodRows.some(r => r.arpu !== null) || periodRows.some(r => r.churnRate !== null)) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ARPU · Churn Rate · NRR Trends</CardTitle>
              <CardDescription>
                Amber = ARPU (left axis) · Orange dashed = Monthly Churn % (right axis) · Cyan dashed = NRR % (right axis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={periodRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(periodRows.length / 10) - 1)} />
                  <YAxis yAxisId="arpu" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={48} tickFormatter={v => v.toFixed(0)} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={36}
                    tickFormatter={v => `${v.toFixed(1)}%`} />
                  <Tooltip content={<GenericTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {periodRows.some(r => r.netRevenueRetention !== null) && (
                    <ReferenceLine yAxisId="pct" y={100} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1}
                      label={{ value: '100%', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                  )}
                  {periodRows.some(r => r.arpu !== null) && (
                    <Bar yAxisId="arpu" dataKey="arpu" name="ARPU" fill={ARPU_COLOR} fillOpacity={0.7} maxBarSize={24} radius={[2, 2, 0, 0]} />
                  )}
                  {periodRows.some(r => r.churnRate !== null) && (
                    <Line yAxisId="pct" dataKey="churnRate" name="Churn %"
                      stroke={CHURN_COLOR} strokeWidth={1.5} strokeDasharray="4 3"
                      dot={{ r: 2.5, fill: CHURN_COLOR }} connectNulls />
                  )}
                  {periodRows.some(r => r.netRevenueRetention !== null) && (
                    <Line yAxisId="pct" dataKey="netRevenueRetention" name="NRR %"
                      stroke={NRR_COLOR} strokeWidth={2}
                      dot={{ r: 2.5, fill: NRR_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Customer Growth ── */}
        {isConfigured && periodRows.some(r => r.newCustomers !== null || r.totalCustomers !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Customer Growth</CardTitle>
              <CardDescription>
                Violet bars = New Customers acquired · Dark line = Total Active Customers (right axis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={periodRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(periodRows.length / 10) - 1)} />
                  <YAxis yAxisId="new" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={48} domain={[0, (dataMax: number) => dataMax * 4]}
                    tickFormatter={v => v.toFixed(0)} />
                  <YAxis yAxisId="total" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={52}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)} />
                  <Tooltip content={<GenericTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {periodRows.some(r => r.newCustomers !== null) && (
                    <Bar yAxisId="new" dataKey="newCustomers" name="New Customers"
                      fill={LTV_COLOR} fillOpacity={0.75} maxBarSize={24} radius={[2, 2, 0, 0]} />
                  )}
                  {periodRows.some(r => r.totalCustomers !== null) && (
                    <Line yAxisId="total" dataKey="totalCustomers" name="Total Customers"
                      stroke="#1E293B" strokeWidth={2}
                      dot={{ r: 2, fill: '#1E293B' }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Metrics Table ── */}
        {isConfigured && periodRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Unit Economics Table
              </CardTitle>
              <CardDescription>All computed metrics by period — newest first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period','LTV','CAC','LTV/CAC',
                        ...(periodRows.some(r => r.cacPayback !== null) ? ['Payback (mo)'] : []),
                        ...(periodRows.some(r => r.arpu !== null)       ? ['ARPU'] : []),
                        ...(periodRows.some(r => r.grossMargin !== null)? ['GM%'] : []),
                        ...(periodRows.some(r => r.churnRate !== null)  ? ['Churn%'] : []),
                        ...(periodRows.some(r => r.netRevenueRetention !== null) ? ['NRR%'] : []),
                        'Health',
                      ].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...periodRows].reverse().map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: LTV_COLOR }}>
                          {r.ltv !== null ? r.ltv.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: CAC_COLOR }}>
                          {r.cac !== null ? r.cac.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-bold"
                          style={{ color: r.ltvCacRatio !== null ? (r.ltvCacRatio >= 5 ? '#059669' : r.ltvCacRatio >= 3 ? RATIO_COLOR : r.ltvCacRatio >= 1 ? '#D97706' : CAC_COLOR) : '#94A3B8' }}>
                          {r.ltvCacRatio !== null ? `${r.ltvCacRatio.toFixed(2)}×` : '—'}
                        </td>
                        {periodRows.some(p => p.cacPayback !== null) && (
                          <td className="px-3 py-2 font-mono text-xs"
                            style={{ color: r.cacPayback !== null ? (r.cacPayback <= 12 ? RATIO_COLOR : r.cacPayback <= 18 ? '#D97706' : CAC_COLOR) : '#94A3B8' }}>
                            {r.cacPayback !== null ? `${r.cacPayback.toFixed(0)}` : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.arpu !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {r.arpu !== null ? r.arpu.toFixed(1) : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.grossMargin !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {r.grossMargin !== null ? `${r.grossMargin.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.churnRate !== null) && (
                          <td className="px-3 py-2 font-mono text-xs"
                            style={{ color: r.churnRate !== null ? (r.churnRate <= 2 ? RATIO_COLOR : r.churnRate <= 5 ? '#D97706' : CAC_COLOR) : '#94A3B8' }}>
                            {r.churnRate !== null ? `${r.churnRate.toFixed(2)}%` : '—'}
                          </td>
                        )}
                        {periodRows.some(p => p.netRevenueRetention !== null) && (
                          <td className="px-3 py-2 font-mono text-xs font-semibold"
                            style={{ color: r.netRevenueRetention !== null ? (r.netRevenueRetention >= 110 ? RATIO_COLOR : r.netRevenueRetention >= 100 ? '#10B981' : CAC_COLOR) : '#94A3B8' }}>
                            {r.netRevenueRetention !== null ? `${r.netRevenueRetention.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        <td className="px-3 py-2"><HealthBadge health={r.health} size="sm" /></td>
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
          const last  = periodRows[periodRows.length - 1];
          const first = periodRows[0];

          // Trend detection: improving or deteriorating?
          const ratios = periodRows.map(r => r.ltvCacRatio).filter((v): v is number => v !== null);
          const recentAvg = ratios.length >= 4
            ? ratios.slice(-2).reduce((a, b) => a + b, 0) / 2 : null;
          const priorAvg  = ratios.length >= 4
            ? ratios.slice(-4, -2).reduce((a, b) => a + b, 0) / 2 : null;
          const trendImproving = recentAvg !== null && priorAvg !== null && recentAvg > priorAvg + 0.2;
          const trendDeteriorating = recentAvg !== null && priorAvg !== null && recentAvg < priorAvg - 0.2;

          // Churn trajectory
          const churnVals = periodRows.map(r => r.churnRate).filter((v): v is number => v !== null);
          const churnDelta = churnVals.length >= 2
            ? churnVals[churnVals.length - 1] - churnVals[0] : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated unit economics analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">Unit Economics Overview</span>
                    <HealthBadge health={last.health} size="md" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Analyzed <span className="font-semibold">{stats.totalPeriods}</span> periods from{' '}
                    <span className="font-semibold">{first.period}</span> to{' '}
                    <span className="font-semibold">{last.period}</span>.
                    Latest LTV/CAC: <span className={`font-semibold ${last.ltvCacRatio !== null && last.ltvCacRatio >= 3 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {last.ltvCacRatio !== null ? `${last.ltvCacRatio.toFixed(2)}×` : '—'}
                    </span>.
                    CAC Payback: <span className="font-semibold">{last.cacPayback !== null ? `${last.cacPayback.toFixed(0)} months` : '—'}</span>.
                    {last.churnRate !== null && <> Monthly churn: <span className="font-semibold">{last.churnRate.toFixed(2)}%</span>.</>}
                    {last.netRevenueRetention !== null && <> NRR: <span className={`font-semibold ${last.netRevenueRetention >= 100 ? 'text-emerald-600' : 'text-red-500'}`}>{last.netRevenueRetention.toFixed(1)}%</span>.</>}
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'LTV/CAC Latest',  value: last.ltvCacRatio !== null ? `${last.ltvCacRatio.toFixed(2)}×` : '—',  sub: 'benchmark: ≥ 3×' },
                    { label: 'LTV/CAC Avg',      value: stats.avgRatio   !== null ? `${stats.avgRatio.toFixed(2)}×` : '—',    sub: 'all periods' },
                    { label: 'Ratio Δ',          value: stats.ratioDelta !== null ? `${stats.ratioDelta >= 0 ? '+' : ''}${stats.ratioDelta.toFixed(2)}×` : '—', sub: 'first vs last period' },
                    { label: 'Payback Latest',   value: stats.latestPayback !== null ? `${stats.latestPayback.toFixed(0)}mo` : '—', sub: 'months to recover CAC' },
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

                  {/* LTV/CAC quality */}
                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">LTV / CAC — {last.health}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {last.ltvCacRatio === null
                          ? 'LTV/CAC cannot be calculated — ensure CAC and at least one LTV source (direct LTV, or ARPU + Gross Margin + Churn/Avg Life) are mapped.'
                          : last.ltvCacRatio >= 5
                          ? `LTV/CAC of ${last.ltvCacRatio.toFixed(2)}× is excellent — every dollar spent acquiring a customer returns over ${last.ltvCacRatio.toFixed(1)}× in lifetime gross profit. This is a strong signal of durable competitive advantage and pricing power. The business can confidently invest more in growth without sacrificing unit profitability.`
                          : last.ltvCacRatio >= 3
                          ? `LTV/CAC of ${last.ltvCacRatio.toFixed(2)}× is healthy. The 3× threshold is the widely used SaaS benchmark — above it, each customer meaningfully exceeds their acquisition cost. There is room to invest more aggressively in growth while preserving strong unit economics.`
                          : last.ltvCacRatio >= 1
                          ? `LTV/CAC of ${last.ltvCacRatio.toFixed(2)}× is marginal. The business is technically profitable per customer but with thin margin. Any increase in CAC (e.g., from competition) or decrease in LTV (e.g., from rising churn) could push the ratio below breakeven. Prioritize CAC reduction or ARPU expansion.`
                          : `LTV/CAC of ${last.ltvCacRatio.toFixed(2)}× means the business is spending more to acquire a customer than it earns from them over their lifetime — a value-destroying dynamic. This is unsustainable at scale. Immediate review of either acquisition channel efficiency or product monetization is required.`}
                        {trendImproving && ' Unit economics are improving — the recent ratio is meaningfully above prior periods.'}
                        {trendDeteriorating && ' Unit economics are deteriorating — the recent ratio has declined vs prior periods. Investigate whether CAC is rising or LTV is compressing.'}
                        {stats.ratioDelta !== null && (
                          <> Overall, the LTV/CAC ratio has {stats.ratioDelta >= 0 ? 'improved' : 'declined'} by{' '}
                            <span className={`font-semibold ${stats.ratioDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {Math.abs(stats.ratioDelta).toFixed(2)}×
                            </span> since {first.period}.</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Payback period */}
                  {last.cacPayback !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          CAC Payback — {last.cacPayback.toFixed(0)} Months
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.cacPayback <= 6
                            ? `Payback of ${last.cacPayback.toFixed(0)} months is exceptional. The business recoups its customer acquisition cost in under half a year, enabling fast reinvestment into further growth. This dramatically reduces cash flow risk from customer churn.`
                            : last.cacPayback <= 12
                            ? `Payback of ${last.cacPayback.toFixed(0)} months is strong. Recovering CAC within a year is the benchmark for high-performing SaaS companies. The business maintains strong cash efficiency even with moderate churn.`
                            : last.cacPayback <= 18
                            ? `Payback of ${last.cacPayback.toFixed(0)} months is acceptable for B2B SaaS but requires sustained retention. If a significant share of customers churn before month ${last.cacPayback.toFixed(0)}, the cohort will be unprofitable. Prioritize early-stage engagement and success.`
                            : last.cacPayback <= 24
                            ? `Payback of ${last.cacPayback.toFixed(0)} months is long. In a high-churn environment, many customers may not survive to their payback point, making cohorts net negative. Consider whether CAC can be reduced through more efficient channels.`
                            : `Payback of ${last.cacPayback.toFixed(0)} months is a material risk. At this payback period, significant customer churn before recovery creates negative cohort economics. Review acquisition cost efficiency and monthly gross profit generation.`}
                          {stats.paybackMonthActual !== null && (
                            <> The payback curve for <span className="font-semibold">{paybackRow?.period}</span> crosses breakeven at{' '}
                              <span className="font-semibold text-emerald-600">Month {stats.paybackMonthActual}</span>.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Churn / NRR */}
                  {(last.churnRate !== null || last.netRevenueRetention !== null) && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Retention — {last.netRevenueRetention !== null ? `NRR ${last.netRevenueRetention.toFixed(1)}%` : `Churn ${last.churnRate?.toFixed(2)}%`}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.netRevenueRetention !== null && (
                            <>NRR of {last.netRevenueRetention.toFixed(1)}%{' '}
                              {last.netRevenueRetention >= 130
                                ? 'is world-class. Existing customers are expanding faster than any churn — the base grows organically even with zero new customer additions. This is a compounding growth engine.'
                                : last.netRevenueRetention >= 110
                                ? 'reflects strong upsell and expansion momentum. The existing customer base is a net positive revenue source, materially reducing dependence on new logo acquisition.'
                                : last.netRevenueRetention >= 100
                                ? 'means the existing customer base is holding steady. You are not losing revenue from the existing base, but also not driving significant upsell. Focus on expansion revenue opportunities.'
                                : 'is below 100% — the existing base is contracting from churn or downsells faster than expansions. This is a compounding headwind that will suppress growth even with strong new customer acquisition.'}
                            </>
                          )}
                          {last.churnRate !== null && (
                            <>Monthly churn of {last.churnRate.toFixed(2)}% implies an average customer lifetime of roughly{' '}
                              <span className="font-semibold">{(1 / (last.churnRate / 100)).toFixed(0)} months</span>.{' '}
                              {last.churnRate <= 1
                                ? 'This is low churn — customers are staying long enough to significantly exceed their acquisition cost.'
                                : last.churnRate <= 3
                                ? 'This is moderate churn — manageable for most SaaS businesses, but reducing it even slightly would materially extend average customer lifetime and LTV.'
                                : last.churnRate <= 5
                                ? 'This churn rate is elevated. At 5% monthly, half of customers have churned within 14 months. LTV is structurally limited unless churn can be reduced to 2–3%.'
                                : 'This churn rate is high. Focus on identifying early churn signals (product adoption, support tickets) and implementing proactive retention programs before scaling acquisition spend.'}
                              {churnDelta !== null && (
                                <> Churn has {churnDelta < -0.3 ? `improved by ${Math.abs(churnDelta).toFixed(2)}pp since ${first.period} — a positive retention trend` : churnDelta > 0.3 ? `increased by ${churnDelta.toFixed(2)}pp since ${first.period} — retention is deteriorating` : `been relatively stable since ${first.period}`}.</>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ LTV derivation: if not provided directly, LTV = ARPU × (Gross Margin% / 100) ÷ (Monthly Churn% / 100),
                  or ARPU × (Gross Margin% / 100) × Avg Life Months.
                  CAC Payback = CAC ÷ Monthly Gross Profit per Customer.
                  LTV/CAC benchmarks: &lt;1× (value-destroying), 1–3× (marginal), 3–5× (healthy), ≥5× (excellent).
                  NRR &gt; 100% means net expansion from existing customers exceeds churn/contraction.
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
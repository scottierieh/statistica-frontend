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
  RefreshCw,
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

interface WCRow {
  period: string;
  revenue: number;
  cogs: number | null;

  accountsReceivable: number | null;
  inventory: number | null;
  accountsPayable: number | null;
  otherCurrentAssets: number | null;
  otherCurrentLiabilities: number | null;

  // Derived
  nwc: number | null;           // Net Working Capital = AR + Inv + OCA - AP - OCL
  nwcPctRevenue: number | null; // NWC / Revenue %
  nwcChange: number | null;     // ΔWorking Capital (cash impact: positive = cash out)

  // Days metrics
  dso: number | null;   // Days Sales Outstanding = AR / (Revenue / 365)
  dii: number | null;   // Days Inventory on Hand = Inv / (COGS / 365)
  dpo: number | null;   // Days Payable Outstanding = AP / (COGS / 365)
  ccc: number | null;   // Cash Conversion Cycle = DSO + DII - DPO
}

// ============================================
// Constants
// ============================================

const AR_COLOR   = '#6C3AED'; // violet  - receivables
const INV_COLOR  = '#3B82F6'; // blue    - inventory
const AP_COLOR   = '#10B981'; // green   - payables
const NWC_COLOR  = '#F59E0B'; // amber   - NWC
const CCC_COLOR  = '#EF4444'; // red     - CCC
const DSO_COLOR  = '#6C3AED';
const DII_COLOR  = '#3B82F6';
const DPO_COLOR  = '#10B981';
const POS_COLOR  = '#10B981';
const NEG_COLOR  = '#EF4444';

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

  let rev = 1000;
  let dso = 45, dii = 38, dpo = 32;

  return quarters.map((q) => {
    rev = rev * (1 + 0.04 + (Math.random() - 0.4) * 0.04);
    const cogsRatio = 0.55 + (Math.random() - 0.5) * 0.03;
    const cogs      = rev * cogsRatio;

    // Gradually improving DSO & DPO, stable DII
    dso = Math.max(25, dso + (Math.random() - 0.55) * 2);
    dii = Math.max(20, dii + (Math.random() - 0.5)  * 1.5);
    dpo = Math.min(60, dpo + (Math.random() - 0.45) * 1.5);

    const ar  = rev  * (dso / 365) * 4; // quarterly annualized
    const inv = cogs * (dii / 365) * 4;
    const ap  = cogs * (dpo / 365) * 4;

    return {
      period:            q,
      revenue:           parseFloat(rev.toFixed(1)),
      cogs:              parseFloat(cogs.toFixed(1)),
      accounts_receivable: parseFloat(ar.toFixed(1)),
      inventory:           parseFloat(inv.toFixed(1)),
      accounts_payable:    parseFloat(ap.toFixed(1)),
    };
  });
}

// ============================================
// Computation
// ============================================

function buildWCRows(
  data: Record<string, any>[],
  cols: {
    period: string; revenue: string; cogs: string;
    ar: string; inventory: string; ap: string;
    oca: string; ocl: string;
  }
): WCRow[] {
  const raw = data
    .map(r => {
      const g = (k: string) => k && isFinite(parseFloat(r[k])) ? parseFloat(r[k]) : null;
      const revenue = parseFloat(r[cols.period] !== undefined ? r[cols.revenue] : 'NaN');
      if (!cols.period || !isFinite(revenue)) return null;

      return {
        period:   String(r[cols.period] ?? '').trim(),
        revenue,
        cogs:     g(cols.cogs),
        ar:       g(cols.ar),
        inventory:g(cols.inventory),
        ap:       g(cols.ap),
        oca:      g(cols.oca),
        ocl:      g(cols.ocl),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.period !== '');

  return raw.map((r, i) => {
    const nwc = (r.ar !== null || r.inventory !== null || r.oca !== null || r.ap !== null || r.ocl !== null)
      ? (r.ar ?? 0) + (r.inventory ?? 0) + (r.oca ?? 0) - (r.ap ?? 0) - (r.ocl ?? 0)
      : null;

    const prev     = i > 0 ? raw[i - 1] : null;
    const prevNWC  = prev ? (() => {
      const p = raw[i - 1];
      return (p.ar !== null || p.inventory !== null || p.oca !== null || p.ap !== null || p.ocl !== null)
        ? (p.ar ?? 0) + (p.inventory ?? 0) + (p.oca ?? 0) - (p.ap ?? 0) - (p.ocl ?? 0)
        : null;
    })() : null;

    const nwcChange = nwc !== null && prevNWC !== null ? nwc - prevNWC : null;

    // Annualize quarterly revenue/cogs for days calculations
    const annRev  = r.revenue  * 4; // assume quarterly; use 1x if annual
    const annCogs = r.cogs !== null ? r.cogs * 4 : null;

    const dso = r.ar       !== null && annRev  > 0 ? (r.ar       / annRev)  * 365 : null;
    const dii = r.inventory !== null && annCogs !== null && annCogs > 0 ? (r.inventory / annCogs) * 365 : null;
    const dpo = r.ap        !== null && annCogs !== null && annCogs > 0 ? (r.ap        / annCogs) * 365 : null;
    const ccc = dso !== null && dii !== null && dpo !== null ? dso + dii - dpo : null;

    return {
      period: r.period,
      revenue: r.revenue,
      cogs: r.cogs,
      accountsReceivable: r.ar,
      inventory: r.inventory,
      accountsPayable: r.ap,
      otherCurrentAssets: r.oca,
      otherCurrentLiabilities: r.ocl,
      nwc,
      nwcPctRevenue: nwc !== null && r.revenue > 0 ? parseFloat(((nwc / r.revenue) * 100).toFixed(2)) : null,
      nwcChange,
      dso: dso !== null ? parseFloat(dso.toFixed(1)) : null,
      dii: dii !== null ? parseFloat(dii.toFixed(1)) : null,
      dpo: dpo !== null ? parseFloat(dpo.toFixed(1)) : null,
      ccc: ccc !== null ? parseFloat(ccc.toFixed(1)) : null,
    };
  });
}

function autoUnit(rows: WCRow[]): string {
  const max = Math.max(...rows.map(r => Math.abs(r.revenue)));
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
            {typeof p.value === 'number'
              ? unit === 'days' ? `${p.value.toFixed(1)} days` : fmtNum(p.value, unit ?? '')
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
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

// ============================================
// Intro Page
// ============================================

const IntroPage = ({ onLoadExample }: { onLoadExample: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <RefreshCw className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Working Capital Model</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze receivables, inventory, and payables dynamics — track the Cash Conversion Cycle and identify working capital efficiency trends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <RefreshCw className="w-6 h-6 text-primary mb-2" />,
              title: 'Cash Conversion Cycle',
              desc:  'Track DSO + DII − DPO over time — the CCC measures how many days cash is tied up in the operating cycle before being collected.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'NWC Trend & Cash Impact',
              desc:  'Monitor Net Working Capital as a % of revenue and quantify the cash impact of working capital changes period over period.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Days Metrics Breakdown',
              desc:  'Decompose DSO (receivables), DII (inventory), and DPO (payables) individually — identify which component is driving CCC changes.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Metric legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: DSO_COLOR, label: 'DSO', desc: 'Days Sales Outstanding — AR collection speed' },
            { color: DII_COLOR, label: 'DII', desc: 'Days Inventory on Hand — inventory turnover speed' },
            { color: DPO_COLOR, label: 'DPO', desc: 'Days Payable Outstanding — how long you delay AP' },
            { color: CCC_COLOR, label: 'CCC', desc: 'Cash Conversion Cycle = DSO + DII − DPO' },
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
            Use the Working Capital Model when you want to understand operational efficiency — specifically how
            fast a company collects cash from customers (DSO), turns over its inventory (DII), and delays
            payments to suppliers (DPO). A declining CCC means the business is becoming more cash-efficient.
            A rising CCC is an early warning of liquidity pressure.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>period</strong> — time label (e.g. "2023Q1")</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>revenue</strong> — total revenue / sales</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>accounts_receivable</strong> — AR balance</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>inventory, accounts_payable</strong> — optional but recommended</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>cogs</strong> — required for DII and DPO</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>DSO / DII / DPO trend lines</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Cash Conversion Cycle (CCC) over time</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>NWC balance & % of revenue trend</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Period-over-period ΔWorking Capital cash impact</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <RefreshCw className="mr-2 h-5 w-5" />
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

export default function WorkingCapitalPage({
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
  const [revenueCol,  setRevenueCol]  = useState('');
  const [cogsCol,     setCogsCol]     = useState('');
  const [arCol,       setArCol]       = useState('');
  const [invCol,      setInvCol]      = useState('');
  const [apCol,       setApCol]       = useState('');
  const [ocaCol,      setOcaCol]      = useState('');
  const [oclCol,      setOclCol]      = useState('');

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_working_capital.csv');
    setPeriodCol('period');   setRevenueCol('revenue');
    setCogsCol('cogs');       setArCol('accounts_receivable');
    setInvCol('inventory');   setApCol('accounts_payable');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setRevenueCol(''); setCogsCol('');
    setArCol('');     setInvCol('');     setApCol('');
    setOcaCol('');    setOclCol('');
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
    detect(['period', 'quarter', 'year', 'date'],                         setPeriodCol,  periodCol);
    detect(['revenue', 'sales', 'net_sales', 'total_revenue'],            setRevenueCol, revenueCol);
    detect(['cogs', 'cost_of_goods', 'cost_of_revenue'],                  setCogsCol,    cogsCol);
    detect(['accounts_receivable', 'ar', 'receivables', 'trade_ar'],      setArCol,      arCol);
    detect(['inventory', 'inventories'],                                   setInvCol,     invCol);
    detect(['accounts_payable', 'ap', 'payables', 'trade_ap'],            setApCol,      apCol);
    detect(['other_current_assets', 'oca', 'prepaid'],                    setOcaCol,     ocaCol);
    detect(['other_current_liabilities', 'ocl', 'accrued'],               setOclCol,     oclCol);
  }, [hasData, allHeaders]);

  // ── Build rows ─────────────────────────────────────────────
  const wcRows = useMemo(() => {
    if (!periodCol || !revenueCol) return [];
    return buildWCRows(data, {
      period: periodCol, revenue: revenueCol, cogs: cogsCol,
      ar: arCol, inventory: invCol, ap: apCol, oca: ocaCol, ocl: oclCol,
    });
  }, [data, periodCol, revenueCol, cogsCol, arCol, invCol, apCol, ocaCol, oclCol]);

  const unit = useMemo(() => autoUnit(wcRows), [wcRows]);

  // ── Chart data ─────────────────────────────────────────────
  const balanceData = useMemo(() =>
    wcRows.map(r => ({
      period: r.period,
      ar:     r.accountsReceivable !== null ? scaleVal(r.accountsReceivable, unit) : null,
      inv:    r.inventory          !== null ? scaleVal(r.inventory, unit)          : null,
      ap:     r.accountsPayable    !== null ? scaleVal(r.accountsPayable, unit)    : null,
      nwc:    r.nwc                !== null ? scaleVal(r.nwc, unit)                : null,
    })),
    [wcRows, unit]
  );

  const daysData = useMemo(() =>
    wcRows.map(r => ({
      period: r.period,
      dso: r.dso,
      dii: r.dii,
      dpo: r.dpo,
      ccc: r.ccc,
    })),
    [wcRows]
  );

  const nwcData = useMemo(() =>
    wcRows.map(r => ({
      period:       r.period,
      nwcPct:       r.nwcPctRevenue,
      nwcChange:    r.nwcChange !== null ? scaleVal(r.nwcChange, unit) : null,
    })),
    [wcRows, unit]
  );

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!wcRows.length) return null;
    const last  = wcRows[wcRows.length - 1];
    const first = wcRows[0];
    const cccRows  = wcRows.filter(r => r.ccc !== null);
    const avgCCC   = cccRows.length  ? cccRows.reduce((s, r)  => s + r.ccc!, 0)  / cccRows.length  : null;
    const dsoRows  = wcRows.filter(r => r.dso !== null);
    const latestDSO = last.dso;
    const firstDSO  = first.dso;
    const latestCCC = last.ccc;
    const firstCCC  = first.ccc;
    return {
      periods: wcRows.length,
      latestPeriod: last.period,
      firstPeriod:  first.period,
      latestDSO,  firstDSO,
      latestDII:  last.dii,
      latestDPO:  last.dpo,
      latestCCC,  firstCCC,
      avgCCC,
      latestNWC:       last.nwc,
      latestNWCPct:    last.nwcPctRevenue,
      cccDrift: latestCCC !== null && firstCCC !== null ? latestCCC - firstCCC : null,
    };
  }, [wcRows]);

  const isConfigured    = !!(periodCol && revenueCol && wcRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!wcRows.length) return;
    const rows = wcRows.map(r => ({
      period:              r.period,
      revenue:             r.revenue,
      cogs:                r.cogs              ?? '',
      accounts_receivable: r.accountsReceivable ?? '',
      inventory:           r.inventory          ?? '',
      accounts_payable:    r.accountsPayable     ?? '',
      nwc:                 r.nwc                ?? '',
      nwc_pct_revenue:     r.nwcPctRevenue       !== null ? `${r.nwcPctRevenue}%` : '',
      nwc_change:          r.nwcChange           ?? '',
      dso:                 r.dso                ?? '',
      dii:                 r.dii                ?? '',
      dpo:                 r.dpo                ?? '',
      ccc:                 r.ccc                ?? '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `WorkingCapital_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [wcRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `WorkingCapital_${new Date().toISOString().split('T')[0]}.png`;
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
            <RefreshCw className="h-5 w-5" />
            Working Capital Model
          </CardTitle>
          <CardDescription>
            Analyze receivables, inventory, and payables dynamics — track DSO, DII, DPO, and the Cash Conversion Cycle to measure operational cash efficiency.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map period, revenue, and balance sheet columns. COGS is required for DII and DPO calculations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'PERIOD *',   value: periodCol,  setter: setPeriodCol,  headers: allHeaders,     opt: false },
              { label: 'REVENUE *',  value: revenueCol, setter: setRevenueCol, headers: numericHeaders, opt: false },
              { label: 'COGS',       value: cogsCol,    setter: setCogsCol,    headers: numericHeaders, opt: true  },
              { label: 'AR *',       value: arCol,      setter: setArCol,      headers: numericHeaders, opt: false },
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-3">
            {[
              { label: 'INVENTORY',  value: invCol,  setter: setInvCol  },
              { label: 'AP',         value: apCol,   setter: setApCol   },
              { label: 'OTHER CURR ASSETS', value: ocaCol, setter: setOcaCol },
              { label: 'OTHER CURR LIAB',   value: oclCol, setter: setOclCol },
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cash Conv. Cycle</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestCCC !== null ? `${stats.latestCCC.toFixed(1)}d` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.cccDrift !== null
                ? `${stats.cccDrift >= 0 ? '▲ +' : '▼ '}${stats.cccDrift.toFixed(1)}d vs first period`
                : stats.latestPeriod}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">DSO</div>
            <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
              {stats.latestDSO !== null ? `${stats.latestDSO.toFixed(1)}d` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.latestDSO !== null && stats.firstDSO !== null
                ? (() => {
                    const d = stats.latestDSO - stats.firstDSO;
                    return `${d >= 0 ? '▲ +' : '▼ '}${d.toFixed(1)}d vs first period`;
                  })()
                : 'Days Sales Outstanding'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">DII</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestDII !== null ? `${stats.latestDII.toFixed(1)}d` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Days Inventory on Hand</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">DPO</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestDPO !== null ? `${stats.latestDPO.toFixed(1)}d` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Days Payable Outstanding</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: CCC & Days Metrics ── */}
        {isConfigured && daysData.some(r => r.dso !== null || r.ccc !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cash Conversion Cycle & Days Metrics</CardTitle>
              <CardDescription>
                DSO (violet) + DII (blue) − DPO (green) = CCC (red) — lower CCC = more cash-efficient
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={daysData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}d`} />
                  <Tooltip content={<LineTooltip unit="days" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1} />
                  {daysData.some(r => r.dso !== null) && (
                    <Line dataKey="dso" name="DSO" stroke={DSO_COLOR} strokeWidth={2}
                      dot={{ r: 2.5, fill: DSO_COLOR }} connectNulls />
                  )}
                  {daysData.some(r => r.dii !== null) && (
                    <Line dataKey="dii" name="DII" stroke={DII_COLOR} strokeWidth={2}
                      strokeDasharray="4 3" dot={{ r: 2.5, fill: DII_COLOR }} connectNulls />
                  )}
                  {daysData.some(r => r.dpo !== null) && (
                    <Line dataKey="dpo" name="DPO" stroke={DPO_COLOR} strokeWidth={2}
                      strokeDasharray="4 3" dot={{ r: 2.5, fill: DPO_COLOR }} connectNulls />
                  )}
                  {daysData.some(r => r.ccc !== null) && (
                    <Line dataKey="ccc" name="CCC" stroke={CCC_COLOR} strokeWidth={2.5}
                      dot={{ r: 3, fill: CCC_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: AR / Inventory / AP Balances ── */}
        {isConfigured && balanceData.some(r => r.ar !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AR / Inventory / AP Balances</CardTitle>
              <CardDescription>
                Balance sheet working capital components — unit: {unit || 'absolute'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={balanceData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<LineTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {balanceData.some(r => r.ar !== null) && (
                    <Line dataKey="ar" name="Accounts Receivable" stroke={AR_COLOR} strokeWidth={2}
                      dot={{ r: 2, fill: AR_COLOR }} connectNulls />
                  )}
                  {balanceData.some(r => r.inv !== null) && (
                    <Line dataKey="inv" name="Inventory" stroke={INV_COLOR} strokeWidth={2}
                      strokeDasharray="4 3" dot={{ r: 2, fill: INV_COLOR }} connectNulls />
                  )}
                  {balanceData.some(r => r.ap !== null) && (
                    <Line dataKey="ap" name="Accounts Payable" stroke={AP_COLOR} strokeWidth={2}
                      strokeDasharray="4 3" dot={{ r: 2, fill: AP_COLOR }} connectNulls />
                  )}
                  {balanceData.some(r => r.nwc !== null) && (
                    <Line dataKey="nwc" name="NWC" stroke={NWC_COLOR} strokeWidth={2.5}
                      dot={{ r: 3, fill: NWC_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: NWC % of Revenue ── */}
        {isConfigured && nwcData.some(r => r.nwcPct !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">NWC as % of Revenue</CardTitle>
              <CardDescription>
                Rising NWC % = more cash tied up in operations; declining = improving efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={nwcData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<LineTooltip unit="%" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1} />
                  <Line dataKey="nwcPct" name="NWC % of Revenue" stroke={NWC_COLOR}
                    strokeWidth={2.5} dot={{ r: 3, fill: NWC_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: ΔNWC Cash Impact ── */}
        {isConfigured && nwcData.some(r => r.nwcChange !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ΔWorking Capital — Cash Impact</CardTitle>
              <CardDescription>
                Positive bar = NWC increased (cash outflow) · Negative bar = NWC decreased (cash inflow)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={nwcData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<BarTooltip unit={unit} />} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1.5} />
                  <Bar dataKey="nwcChange" name="ΔNWC" maxBarSize={32} radius={[3, 3, 0, 0]}>
                    {nwcData.map((r, i) => (
                      <Cell key={i} fill={(r.nwcChange ?? 0) >= 0 ? NEG_COLOR : POS_COLOR} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                Red = cash consumed by WC build-up · Green = cash released from WC reduction
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Period Table ── */}
        {isConfigured && wcRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Period Detail Table
              </CardTitle>
              <CardDescription>All computed working capital metrics by period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period', 'AR', 'Inventory', 'AP', 'NWC', 'NWC %', 'ΔNWC', 'DSO', 'DII', 'DPO', 'CCC'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...wcRows].reverse().map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.accountsReceivable !== null ? fmtNum(r.accountsReceivable, unit) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.inventory !== null ? fmtNum(r.inventory, unit) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.accountsPayable !== null ? fmtNum(r.accountsPayable, unit) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.nwc !== null ? fmtNum(r.nwc, unit) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.nwcPctRevenue !== null ? `${r.nwcPctRevenue.toFixed(1)}%` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">
                          {r.nwcChange !== null ? `${r.nwcChange >= 0 ? '+' : ''}${fmtNum(r.nwcChange, unit)}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.dso !== null ? `${r.dso.toFixed(1)}d` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.dii !== null ? `${r.dii.toFixed(1)}d` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.dpo !== null ? `${r.dpo.toFixed(1)}d` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.ccc !== null ? `${r.ccc.toFixed(1)}d` : '—'}</td>
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
          const last  = wcRows[wcRows.length - 1];
          const first = wcRows[0];

          const dsoDrift = last.dso !== null && first.dso !== null ? last.dso - first.dso : null;
          const dpoDrift = last.dpo !== null && first.dpo !== null ? last.dpo - first.dpo : null;
          const diiDrift = last.dii !== null && first.dii !== null ? last.dii - first.dii : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated working capital analysis summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Working Capital Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{stats.periods}</span> periods from{' '}
                    <span className="font-semibold">{first.period}</span> to{' '}
                    <span className="font-semibold">{last.period}</span>.
                    Latest CCC: <span className={`font-semibold ${(stats.latestCCC ?? 999) <= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {stats.latestCCC !== null ? `${stats.latestCCC.toFixed(1)} days` : '—'}
                    </span>.
                    {stats.cccDrift !== null && (
                      <> CCC{' '}
                        <span className={`font-semibold ${stats.cccDrift <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {stats.cccDrift <= 0 ? 'improved' : 'deteriorated'} by {Math.abs(stats.cccDrift).toFixed(1)} days
                        </span>
                        {' '}since {first.period}.
                      </>
                    )}
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Latest CCC',  value: stats.latestCCC  !== null ? `${stats.latestCCC.toFixed(1)}d`  : '—', sub: stats.latestPeriod },
                    { label: 'Avg CCC',     value: stats.avgCCC     !== null ? `${stats.avgCCC.toFixed(1)}d`     : '—', sub: 'all periods' },
                    { label: 'CCC Change',  value: stats.cccDrift   !== null ? `${stats.cccDrift >= 0 ? '+' : ''}${stats.cccDrift.toFixed(1)}d` : '—', sub: `${first.period} → ${last.period}` },
                    { label: 'NWC % Rev',   value: stats.latestNWCPct !== null ? `${stats.latestNWCPct.toFixed(1)}%` : '—', sub: stats.latestPeriod },
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

                  {stats.latestCCC !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Cash Conversion Cycle</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The current CCC of <span className="font-semibold">{stats.latestCCC.toFixed(1)} days</span> means the business
                          takes approximately {stats.latestCCC.toFixed(0)} days from spending cash on inputs to collecting cash from customers.
                          {stats.latestCCC <= 20
                            ? ' This is exceptionally efficient — often seen in subscription businesses, retailers with strong supplier terms, or businesses that collect before delivering.'
                            : stats.latestCCC <= 45
                            ? ' This is a healthy CCC for most industries. The business is managing its working capital efficiently.'
                            : stats.latestCCC <= 90
                            ? ' A moderate CCC. There may be opportunity to reduce DSO through faster collections or extend DPO through better supplier negotiations.'
                            : ' A high CCC indicates significant cash is being tied up in the operating cycle. This can create liquidity pressure during rapid growth and warrants focused working capital management.'}
                          {stats.cccDrift !== null && (
                            <> The CCC has{' '}
                              <span className={stats.cccDrift <= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                                {stats.cccDrift <= 0 ? `improved by ${Math.abs(stats.cccDrift).toFixed(1)} days` : `deteriorated by ${stats.cccDrift.toFixed(1)} days`}
                              </span>
                              {' '}since {first.period}.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {dsoDrift !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Receivables (DSO)</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          DSO {dsoDrift <= 0 ? 'improved' : 'increased'} by{' '}
                          <span className={`font-semibold ${dsoDrift <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {Math.abs(dsoDrift).toFixed(1)} days
                          </span>{' '}
                          from {first.dso?.toFixed(1)}d to {last.dso?.toFixed(1)}d.
                          {dsoDrift > 5
                            ? ' Rising DSO suggests customers are taking longer to pay — this could indicate relaxed credit terms, collection challenges, or weaker customer credit quality. Monitor closely for bad debt risk.'
                            : dsoDrift < -5
                            ? ' Declining DSO signals improved collection efficiency — either tightened credit terms, better invoicing processes, or a shift toward faster-paying customers.'
                            : ' DSO has been relatively stable, indicating consistent collection patterns.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {dpoDrift !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Payables (DPO)</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          DPO {dpoDrift >= 0 ? 'extended' : 'shortened'} by{' '}
                          <span className={`font-semibold ${dpoDrift >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {Math.abs(dpoDrift).toFixed(1)} days
                          </span>{' '}
                          from {first.dpo?.toFixed(1)}d to {last.dpo?.toFixed(1)}d.
                          {dpoDrift >= 5
                            ? ' Extending DPO improves cash efficiency — the company is funding its operations longer with supplier credit. Ensure this doesn\'t strain supplier relationships or forfeit early-payment discounts.'
                            : dpoDrift <= -5
                            ? ' Shortening DPO means paying suppliers faster. This may reflect lost negotiating power, early-payment discounts being captured, or supplier pressure.'
                            : ' DPO has been relatively stable.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {diiDrift !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Inventory (DII)</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          DII {diiDrift <= 0 ? 'improved' : 'increased'} by{' '}
                          <span className={`font-semibold ${diiDrift <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {Math.abs(diiDrift).toFixed(1)} days
                          </span>{' '}
                          from {first.dii?.toFixed(1)}d to {last.dii?.toFixed(1)}d.
                          {diiDrift > 10
                            ? ' Rising DII may indicate demand softening, over-purchasing, or supply chain build-up ahead of expected demand. High inventory carries obsolescence and storage cost risk.'
                            : diiDrift < -10
                            ? ' Declining DII signals faster inventory turnover — a positive sign of demand strength and lean inventory management.'
                            : ' Inventory days have been broadly stable.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ DSO = (AR / Annualized Revenue) × 365. DII = (Inventory / Annualized COGS) × 365.
                  DPO = (AP / Annualized COGS) × 365. CCC = DSO + DII − DPO.
                  Quarterly data is annualized (×4) for days calculations.
                  ΔNWC sign convention: positive = cash outflow (NWC increase), negative = cash inflow (NWC release).
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
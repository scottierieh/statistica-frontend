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
  BarChart,
  Bar,
  ComposedChart,
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
  Scale,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
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

interface CompanyRow {
  id: string;
  ticker:       string;
  name:         string;
  isTarget:     boolean;   // 분석 대상 기업

  // Market data
  marketCap:    number | null;  // 시가총액
  netDebt:      number | null;  // 순차입금
  ev:           number | null;  // EV = marketCap + netDebt (auto if null)

  // Financials
  revenue:      number | null;
  ebitda:       number | null;
  ebit:         number | null;
  netIncome:    number | null;
  fcf:          number | null;
  eps:          number | null;

  // Growth / Margins
  revenueGrowth: number | null; // %
  ebitdaMargin:  number | null; // %
  ebitMargin:    number | null; // %

  // Multiples (some auto-derived)
  peRatio:       number | null;
  evEbitda:      number | null;
  evEbit:        number | null;
  evRevenue:     number | null;
  pbRatio:       number | null; // Price / Book
  fcfYield:      number | null; // FCF / Market Cap %

  // Derived z-scores per multiple (vs peer group)
  zPE:       number | null;
  zEvEbitda: number | null;
  zEvRev:    number | null;

  // Overall relative score (0–100, 50 = peer median)
  relativeScore:  number | null;
  valueSignal:    'Undervalued' | 'Fair Value' | 'Overvalued' | null;
}

// ============================================
// Constants
// ============================================

const TARGET_COLOR     = '#6C3AED';
const PEER_COLOR       = '#94A3B8';
const UNDER_COLOR      = '#10B981';
const OVER_COLOR       = '#EF4444';
const FAIR_COLOR       = '#F59E0B';
const MEDIAN_COLOR     = '#3B82F6';

const MULTIPLES = [
  { key: 'peRatio',   label: 'P/E',         lower: true  },
  { key: 'evEbitda',  label: 'EV/EBITDA',   lower: true  },
  { key: 'evEbit',    label: 'EV/EBIT',     lower: true  },
  { key: 'evRevenue', label: 'EV/Revenue',  lower: true  },
  { key: 'pbRatio',   label: 'P/B',         lower: true  },
  { key: 'fcfYield',  label: 'FCF Yield %', lower: false }, // higher = cheaper
] as const;

// ============================================
// Default / Example data
// ============================================

function defaultCompanies(): CompanyRow[] {
  const raw = [
    { id:'1', ticker:'AAPL',  name:'Apple',           isTarget:true,  mc:2940, nd:-50,   rev:385,  ebitda:130, ebit:115, ni:97,   fcf:107, eps:6.42, rg:4,  em:33.8, ebitdam:33.8 },
    { id:'2', ticker:'MSFT',  name:'Microsoft',        isTarget:false, mc:3120, nd:25,    rev:245,  ebitda:115, ebit:109, ni:88,   fcf:89,  eps:11.8, rg:16, em:44.6, ebitdam:47.0 },
    { id:'3', ticker:'GOOGL', name:'Alphabet',         isTarget:false, mc:2100, nd:-90,   rev:307,  ebitda:105, ebit:84,  ni:73,   fcf:69,  eps:5.80, rg:14, em:27.4, ebitdam:34.2 },
    { id:'4', ticker:'META',  name:'Meta Platforms',   isTarget:false, mc:1370, nd:-45,   rev:134,  ebitda:65,  ebit:59,  ni:50,   fcf:55,  eps:19.3, rg:21, em:44.0, ebitdam:48.5 },
    { id:'5', ticker:'AMZN',  name:'Amazon',           isTarget:false, mc:2050, nd:55,    rev:575,  ebitda:95,  ebit:37,  ni:30,   fcf:32,  eps:2.90, rg:11, em:6.4,  ebitdam:16.5 },
    { id:'6', ticker:'NVDA',  name:'NVIDIA',           isTarget:false, mc:2200, nd:-10,   rev:60,   ebitda:36,  ebit:33,  ni:29,   fcf:27,  eps:11.9, rg:122,em:55.0, ebitdam:60.0 },
  ];

  return raw.map(r => {
    const ev = r.mc + r.nd;
    const pe       = r.ni    > 0 ? parseFloat((r.mc / r.ni).toFixed(2))    : null;
    const evEbitda = r.ebitda > 0 ? parseFloat((ev  / r.ebitda).toFixed(2)) : null;
    const evEbit   = r.ebit   > 0 ? parseFloat((ev  / r.ebit).toFixed(2))   : null;
    const evRev    = r.rev    > 0 ? parseFloat((ev  / r.rev).toFixed(2))    : null;
    const fcfYield = r.fcf    > 0 ? parseFloat((r.fcf / r.mc * 100).toFixed(2)) : null;
    return {
      id: r.id, ticker: r.ticker, name: r.name, isTarget: r.isTarget,
      marketCap: r.mc, netDebt: r.nd, ev,
      revenue: r.rev, ebitda: r.ebitda, ebit: r.ebit, netIncome: r.ni, fcf: r.fcf, eps: r.eps,
      revenueGrowth: r.rg, ebitdaMargin: r.ebitdam, ebitMargin: r.em,
      peRatio: pe, evEbitda, evEbit, evRevenue: evRev, pbRatio: null, fcfYield,
      zPE: null, zEvEbitda: null, zEvRev: null, relativeScore: null, valueSignal: null,
    };
  });
}

function generateExampleCSV(): Record<string, any>[] {
  return defaultCompanies().map(c => ({
    ticker:         c.ticker,
    name:           c.name,
    is_target:      c.isTarget ? 'TRUE' : 'FALSE',
    market_cap:     c.marketCap,
    net_debt:       c.netDebt,
    revenue:        c.revenue,
    ebitda:         c.ebitda,
    ebit:           c.ebit,
    net_income:     c.netIncome,
    fcf:            c.fcf,
    eps:            c.eps,
    revenue_growth: c.revenueGrowth,
    ebitda_margin:  c.ebitdaMargin,
  }));
}

// ============================================
// Computation
// ============================================

function computeMultiples(companies: CompanyRow[]): CompanyRow[] {
  return companies.map(c => {
    const ev = c.ev ?? ((c.marketCap ?? 0) + (c.netDebt ?? 0));
    const mc = c.marketCap ?? 0;

    const peRatio   = c.peRatio   ?? (c.netIncome  && c.netIncome  > 0 && mc > 0 ? parseFloat((mc / c.netIncome).toFixed(2))   : null);
    const evEbitda  = c.evEbitda  ?? (c.ebitda     && c.ebitda     > 0            ? parseFloat((ev / c.ebitda).toFixed(2))      : null);
    const evEbit    = c.evEbit    ?? (c.ebit       && c.ebit       > 0            ? parseFloat((ev / c.ebit).toFixed(2))        : null);
    const evRevenue = c.evRevenue ?? (c.revenue    && c.revenue    > 0            ? parseFloat((ev / c.revenue).toFixed(2))    : null);
    const fcfYield  = c.fcfYield  ?? (c.fcf        && c.fcf        > 0 && mc > 0  ? parseFloat((c.fcf / mc * 100).toFixed(2))  : null);

    const ebitdaMargin = c.ebitdaMargin ?? (c.ebitda && c.revenue && c.revenue > 0 ? parseFloat((c.ebitda / c.revenue * 100).toFixed(1)) : null);
    const ebitMargin   = c.ebitMargin   ?? (c.ebit   && c.revenue && c.revenue > 0 ? parseFloat((c.ebit   / c.revenue * 100).toFixed(1)) : null);

    return { ...c, ev, peRatio, evEbitda, evEbit, evRevenue, fcfYield, ebitdaMargin, ebitMargin };
  });
}

function computeScores(companies: CompanyRow[]): CompanyRow[] {
  const peers = companies.filter(c => !c.isTarget);
  if (!peers.length) return companies;

  // Compute peer median & std for each multiple
  const stats = MULTIPLES.map(m => {
    const vals = peers.map(p => p[m.key as keyof CompanyRow] as number | null).filter((v): v is number => v !== null);
    if (!vals.length) return { key: m.key, median: null, std: null, lower: m.lower };
    vals.sort((a, b) => a - b);
    const med = vals.length % 2 === 0
      ? (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
      : vals[Math.floor(vals.length / 2)];
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std  = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
    return { key: m.key, median: parseFloat(med.toFixed(3)), std, lower: m.lower };
  });

  return companies.map(c => {
    // z-score: positive = more expensive vs peers (if lower=true, higher z = overvalued)
    const zScores: number[] = [];
    let zPE = null, zEvEbitda = null, zEvRev = null;

    for (const s of stats) {
      if (s.median === null) continue;
      const val = c[s.key as keyof CompanyRow] as number | null;
      if (val === null) continue;
      const z = (val - s.median) / (s.std || 1);
      const zAdj = s.lower ? z : -z; // For FCF yield: higher = cheaper → invert
      zScores.push(zAdj);
      if (s.key === 'peRatio')   zPE       = parseFloat(zAdj.toFixed(3));
      if (s.key === 'evEbitda')  zEvEbitda = parseFloat(zAdj.toFixed(3));
      if (s.key === 'evRevenue') zEvRev    = parseFloat(zAdj.toFixed(3));
    }

    // Relative score: 50 = peer median; >50 = expensive, <50 = cheap
    const avgZ = zScores.length ? zScores.reduce((s, v) => s + v, 0) / zScores.length : 0;
    // Map avgZ to 0–100: score = 50 + avgZ * 15 (clamped)
    const relScore = parseFloat(Math.min(100, Math.max(0, 50 + avgZ * 15)).toFixed(1));
    const sig: CompanyRow['valueSignal'] =
      relScore < 40 ? 'Undervalued' :
      relScore > 60 ? 'Overvalued'  : 'Fair Value';

    return { ...c, zPE, zEvEbitda, zEvRev, relativeScore: relScore, valueSignal: sig };
  });
}

function peerMedians(companies: CompanyRow[]): Record<string, number | null> {
  const peers = companies.filter(c => !c.isTarget);
  const result: Record<string, number | null> = {};
  for (const m of MULTIPLES) {
    const vals = peers.map(p => p[m.key as keyof CompanyRow] as number | null).filter((v): v is number => v !== null);
    if (!vals.length) { result[m.key] = null; continue; }
    vals.sort((a, b) => a - b);
    result[m.key] = vals.length % 2 === 0
      ? (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
      : vals[Math.floor(vals.length / 2)];
  }
  return result;
}

function fmtM(v: number | null, digits = 0): string {
  if (v === null) return '—';
  const abs  = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}T`;
  if (abs >= 1)    return `${sign}${abs.toFixed(digits)}B`;
  return `${sign}${(abs * 1000).toFixed(0)}M`;
}

function signalColor(sig: CompanyRow['valueSignal'] | null): string {
  if (sig === 'Undervalued') return 'bg-emerald-100 text-emerald-700';
  if (sig === 'Overvalued')  return 'bg-red-100 text-red-600';
  return 'bg-amber-100 text-amber-700';
}

// ============================================
// Tooltips
// ============================================

const MultipleTooltip = ({ active, payload, label, medians }: any) => {
  if (!active || !payload?.length) return null;
  const mul = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? p.value.toFixed(1) + 'x' : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const ScoreTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Intro Page
// ============================================

const IntroPage = ({ onLoadExample, onManualEntry }: { onLoadExample: () => void; onManualEntry: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Scale className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Comparable Company Analysis</CardTitle>
        <CardDescription className="text-base mt-2">
          Compare valuation multiples across a peer group — identify relative over/under-valuation of the target company vs its sector peers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Scale className="w-6 h-6 text-primary mb-2" />,
              title: 'Multiple Comparison',
              desc: 'Compare P/E, EV/EBITDA, EV/EBIT, EV/Revenue, P/B, and FCF Yield against peer group median and range — see where the target trades relative to comps.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Relative Valuation Score',
              desc: 'Score each company 0–100 based on z-scores across all multiples — <40 = undervalued vs peers, >60 = overvalued, 40–60 = fair value.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Implied Value from Peers',
              desc: 'Apply peer median multiples to the target\'s financials to derive an implied equity value — what the market would price the target at if it traded like its peers.',
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
            { color: TARGET_COLOR, label: 'Target',       desc: 'Company being valued' },
            { color: PEER_COLOR,   label: 'Peers',        desc: 'Comparable companies' },
            { color: MEDIAN_COLOR, label: 'Peer Median',  desc: 'Reference benchmark line' },
            { color: UNDER_COLOR,  label: 'Undervalued',  desc: 'Trading below peer median' },
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
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />When to Use</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use CCA when you want a market-based valuation reference — it tells you not what a company is
            "intrinsically worth" (DCF), but how the market values similar businesses. It's most useful as a
            sanity check on DCF assumptions, or as the primary valuation method for companies where
            peer benchmarks are meaningful (same sector, similar scale, similar business model).
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>ticker</strong> — stock identifier</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>is_target</strong> — TRUE for the company being valued</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>market_cap, net_debt</strong> — for EV calculation</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>revenue, ebitda, net_income</strong> — financials for multiples</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Multi-multiple comparison charts vs peer median</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Relative valuation score (0–100) per company</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Implied equity value from peer multiples</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Growth-adjusted analysis (PEG-style)</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Scale className="mr-2 h-5 w-5" />Load Example Data
          </Button>
          <Button onClick={onManualEntry} size="lg" variant="outline">
            <Plus className="mr-2 h-5 w-5" />Manual Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================
// Main Component
// ============================================

export default function ComparableAnalysisPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted, setHasStarted] = useState(false);

  // ── Column mapping ─────────────────────────────────────────
  const [tickerCol,    setTickerCol]    = useState('');
  const [nameCol,      setNameCol]      = useState('');
  const [isTargetCol,  setIsTargetCol]  = useState('');
  const [mcCol,        setMcCol]        = useState('');
  const [ndCol,        setNdCol]        = useState('');
  const [revCol,       setRevCol]       = useState('');
  const [ebitdaCol,    setEbitdaCol]    = useState('');
  const [ebitCol,      setEbitCol]      = useState('');
  const [niCol,        setNiCol]        = useState('');
  const [fcfCol,       setFcfCol]       = useState('');
  const [epsCol,       setEpsCol]       = useState('');
  const [revGrowthCol, setRevGrowthCol] = useState('');
  const [ebitdaMarCol, setEbitdaMarCol] = useState('');

  // ── Manual mode ────────────────────────────────────────────
  const [manualCompanies, setManualCompanies] = useState<CompanyRow[]>(() => computeScores(computeMultiples(defaultCompanies())));
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('manual');

  // ── UI ─────────────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleCSV();
    onExampleLoaded?.(rows, 'example_cca.csv');
    setInputMode('csv');
    setHasStarted(true);
    setTickerCol('ticker'); setNameCol('name'); setIsTargetCol('is_target');
    setMcCol('market_cap'); setNdCol('net_debt'); setRevCol('revenue');
    setEbitdaCol('ebitda'); setEbitCol('ebit'); setNiCol('net_income');
    setFcfCol('fcf'); setEpsCol('eps'); setRevGrowthCol('revenue_growth');
    setEbitdaMarCol('ebitda_margin');
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setTickerCol(''); setNameCol(''); setIsTargetCol(''); setMcCol(''); setNdCol('');
    setRevCol(''); setEbitdaCol(''); setEbitCol(''); setNiCol(''); setFcfCol('');
    setEpsCol(''); setRevGrowthCol(''); setEbitdaMarCol('');
    if (onClearData) onClearData();
    setInputMode('manual');
    setHasStarted(false);
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
    detect(['ticker','symbol'],                           setTickerCol,    tickerCol);
    detect(['name','company','company_name'],              setNameCol,      nameCol);
    detect(['is_target','target','is target'],             setIsTargetCol,  isTargetCol);
    detect(['market_cap','marketcap','mkt_cap'],           setMcCol,        mcCol);
    detect(['net_debt','netdebt','nd'],                    setNdCol,        ndCol);
    detect(['revenue','sales','net_sales'],                setRevCol,       revCol);
    detect(['ebitda'],                                     setEbitdaCol,    ebitdaCol);
    detect(['ebit','operating_income'],                    setEbitCol,      ebitCol);
    detect(['net_income','ni','earnings'],                 setNiCol,        niCol);
    detect(['fcf','free_cash_flow'],                       setFcfCol,       fcfCol);
    detect(['eps','earnings_per_share'],                   setEpsCol,       epsCol);
    detect(['revenue_growth','rev_growth','sales_growth'], setRevGrowthCol, revGrowthCol);
    detect(['ebitda_margin','ebitda margin'],              setEbitdaMarCol, ebitdaMarCol);
  }, [hasData, allHeaders]);

  // ── Build from CSV ─────────────────────────────────────────
  const csvCompanies = useMemo((): CompanyRow[] => {
    if (!tickerCol || !mcCol) return [];
    const g = (r: Record<string, any>, k: string) => k && isFinite(parseFloat(r[k])) ? parseFloat(r[k]) : null;
    const raw = data.map((r, i) => ({
      id:           String(i),
      ticker:       String(r[tickerCol] ?? '').trim(),
      name:         nameCol ? String(r[nameCol] ?? '').trim() : String(r[tickerCol] ?? '').trim(),
      isTarget:     isTargetCol ? String(r[isTargetCol] ?? '').toUpperCase() === 'TRUE' : i === 0,
      marketCap:    g(r, mcCol),
      netDebt:      g(r, ndCol),
      ev:           null,
      revenue:      g(r, revCol),
      ebitda:       g(r, ebitdaCol),
      ebit:         g(r, ebitCol),
      netIncome:    g(r, niCol),
      fcf:          g(r, fcfCol),
      eps:          g(r, epsCol),
      revenueGrowth:g(r, revGrowthCol),
      ebitdaMargin: g(r, ebitdaMarCol),
      ebitMargin:   null,
      peRatio: null, evEbitda: null, evEbit: null, evRevenue: null, pbRatio: null, fcfYield: null,
      zPE: null, zEvEbitda: null, zEvRev: null, relativeScore: null, valueSignal: null,
    })).filter(r => r.ticker && r.marketCap !== null);
    return computeScores(computeMultiples(raw));
  }, [data, tickerCol, nameCol, isTargetCol, mcCol, ndCol, revCol,
      ebitdaCol, ebitCol, niCol, fcfCol, epsCol, revGrowthCol, ebitdaMarCol]);

  const activeCompanies = inputMode === 'csv' ? csvCompanies : manualCompanies;
  const targetCo  = activeCompanies.find(c => c.isTarget) ?? activeCompanies[0];
  const peers     = activeCompanies.filter(c => !c.isTarget);
  const medians   = useMemo(() => peerMedians(activeCompanies), [activeCompanies]);

  // ── Manual handlers ────────────────────────────────────────
  const handleManualChange = useCallback((id: string, field: string, value: string) => {
    setManualCompanies(prev => {
      const updated = prev.map(c => {
        if (c.id !== id) return c;
        const num = parseFloat(value);
        const nv  = isFinite(num) ? num : null;
        const u   = { ...c, [field]: field === 'ticker' || field === 'name' ? value : nv };
        if (field === 'isTarget') return { ...c, isTarget: value === 'true' };
        return u;
      });
      return computeScores(computeMultiples(updated));
    });
  }, []);

  const handleAddCompany = useCallback(() => {
    const id = String(Date.now());
    setManualCompanies(prev => {
      const updated = [...prev, {
        id, ticker: 'NEW', name: 'New Company', isTarget: false,
        marketCap: 500, netDebt: 50, ev: 550,
        revenue: 100, ebitda: 30, ebit: 25, netIncome: 20, fcf: 18, eps: 2.0,
        revenueGrowth: 10, ebitdaMargin: 30, ebitMargin: 25,
        peRatio: null, evEbitda: null, evEbit: null, evRevenue: null, pbRatio: null, fcfYield: null,
        zPE: null, zEvEbitda: null, zEvRev: null, relativeScore: null, valueSignal: null,
      }];
      return computeScores(computeMultiples(updated));
    });
  }, []);

  const handleDeleteCompany = useCallback((id: string) => {
    setManualCompanies(prev => {
      const updated = prev.filter(c => c.id !== id);
      return computeScores(computeMultiples(updated));
    });
  }, []);

  // ── Chart data ─────────────────────────────────────────────
  const multipleChartData = useMemo(() =>
    MULTIPLES.map(m => {
      const row: Record<string, any> = { multiple: m.label, median: medians[m.key] };
      for (const c of activeCompanies) {
        row[c.ticker] = c[m.key as keyof CompanyRow] ?? null;
      }
      return row;
    }),
    [activeCompanies, medians]
  );

  const scoreChartData = useMemo(() =>
    [...activeCompanies].sort((a, b) => (a.relativeScore ?? 50) - (b.relativeScore ?? 50)).map(c => ({
      ticker: c.ticker,
      score:  c.relativeScore,
      signal: c.valueSignal,
      isTarget: c.isTarget,
    })),
    [activeCompanies]
  );

  // Implied value from peer medians applied to target
  const impliedValues = useMemo(() => {
    if (!targetCo) return [];
    const rows = [];
    if (medians.evEbitda && targetCo.ebitda) {
      const impliedEV  = medians.evEbitda * targetCo.ebitda;
      const impliedEq  = impliedEV - (targetCo.netDebt ?? 0);
      rows.push({ method: 'EV/EBITDA', multiple: medians.evEbitda, impliedEV, impliedEquity: impliedEq });
    }
    if (medians.evEbit && targetCo.ebit) {
      const impliedEV  = medians.evEbit * targetCo.ebit;
      const impliedEq  = impliedEV - (targetCo.netDebt ?? 0);
      rows.push({ method: 'EV/EBIT', multiple: medians.evEbit, impliedEV, impliedEquity: impliedEq });
    }
    if (medians.evRevenue && targetCo.revenue) {
      const impliedEV  = medians.evRevenue * targetCo.revenue;
      const impliedEq  = impliedEV - (targetCo.netDebt ?? 0);
      rows.push({ method: 'EV/Revenue', multiple: medians.evRevenue, impliedEV, impliedEquity: impliedEq });
    }
    if (medians.peRatio && targetCo.netIncome) {
      const impliedMC  = medians.peRatio * targetCo.netIncome;
      rows.push({ method: 'P/E', multiple: medians.peRatio, impliedEV: impliedMC, impliedEquity: impliedMC });
    }
    return rows;
  }, [targetCo, medians]);

  const impliedChartData = useMemo(() =>
    impliedValues.map(r => ({
      method:    r.method,
      implied:   parseFloat(r.impliedEquity.toFixed(1)),
      current:   targetCo?.marketCap ?? null,
    })),
    [impliedValues, targetCo]
  );

  const isConfigured    = activeCompanies.length >= 2;
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!activeCompanies.length) return;
    const rows = activeCompanies.map(c => ({
      ticker:           c.ticker,
      name:             c.name,
      is_target:        c.isTarget,
      market_cap:       c.marketCap,
      ev:               c.ev,
      pe_ratio:         c.peRatio,
      ev_ebitda:        c.evEbitda,
      ev_ebit:          c.evEbit,
      ev_revenue:       c.evRevenue,
      fcf_yield:        c.fcfYield !== null ? `${c.fcfYield}%` : '',
      ebitda_margin:    c.ebitdaMargin !== null ? `${c.ebitdaMargin}%` : '',
      revenue_growth:   c.revenueGrowth !== null ? `${c.revenueGrowth}%` : '',
      relative_score:   c.relativeScore,
      value_signal:     c.valueSignal,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `CCA_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [activeCompanies, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `CCA_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  if (!hasData && !hasStarted) return (
    <IntroPage
      onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }}
    />
  );

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-3xl mx-auto w-full px-4">

      {/* ── File Header Bar ── */}
      {(hasData || hasStarted) && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-slate-700 truncate">
              {hasData ? displayFileName : 'Manual Entry'}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {hasData ? `${data.length.toLocaleString()} rows · ${allHeaders.length} cols` : `${manualCompanies.length} companies`}
            </span>
            {isExample && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold whitespace-nowrap">Example</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {hasData && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700" onClick={handleClearAll}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />{displayFileName}
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
            <span className="text-xs text-muted-foreground">Relative Valuation</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />Comparable Company Analysis (CCA)
          </CardTitle>
          <CardDescription>
            Compare valuation multiples across a peer group — identify relative over/under-valuation and derive implied equity value from peer benchmarks.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Input ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription>Mark one company as the target (is_target = TRUE). All others are treated as peers.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={inputMode === 'manual' ? 'default' : 'outline'} onClick={() => setInputMode('manual')}>Manual</Button>
              {hasData && <Button size="sm" variant={inputMode === 'csv' ? 'default' : 'outline'} onClick={() => setInputMode('csv')}>CSV</Button>}
              {!hasData && <Button size="sm" variant="outline" onClick={handleLoadExample}>Load Example</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {inputMode === 'manual' ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Target?', 'Ticker', 'Mkt Cap ($B)', 'Net Debt ($B)', 'Revenue ($B)', 'EBITDA ($B)', 'Net Income ($B)', 'FCF ($B)', 'Rev Growth %', 'EBITDA Margin %', ''].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualCompanies.map(c => (
                      <tr key={c.id} className={`border-t hover:bg-slate-50/30 transition-colors ${c.isTarget ? 'bg-primary/5' : ''}`}>
                        <td className="px-2 py-1.5">
                          <Select value={c.isTarget ? 'true' : 'false'} onValueChange={v => handleManualChange(c.id, 'isTarget', v)}>
                            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true"><span className="text-primary font-semibold">Target</span></SelectItem>
                              <SelectItem value="false">Peer</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        {[
                          { f: 'ticker',        w: 'w-16' },
                          { f: 'marketCap',     w: 'w-20' },
                          { f: 'netDebt',       w: 'w-20' },
                          { f: 'revenue',       w: 'w-20' },
                          { f: 'ebitda',        w: 'w-20' },
                          { f: 'netIncome',     w: 'w-24' },
                          { f: 'fcf',           w: 'w-20' },
                          { f: 'revenueGrowth', w: 'w-20' },
                          { f: 'ebitdaMargin',  w: 'w-24' },
                        ].map(({ f, w }) => (
                          <td key={f} className="px-2 py-1.5">
                            <Input className={`h-7 text-xs ${w} font-mono`}
                              value={String((c as any)[f] ?? '')}
                              onChange={e => handleManualChange(c.id, f, e.target.value)} />
                          </td>
                        ))}
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteCompany(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddCompany}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Company
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'TICKER *',    value: tickerCol,   setter: setTickerCol,   headers: allHeaders     },
                  { label: 'IS TARGET',   value: isTargetCol, setter: setIsTargetCol, headers: allHeaders     },
                  { label: 'MARKET CAP *',value: mcCol,       setter: setMcCol,       headers: numericHeaders },
                  { label: 'NET DEBT',    value: ndCol,       setter: setNdCol,       headers: numericHeaders },
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-100 pt-3">
                {[
                  { label: 'REVENUE',       value: revCol,       setter: setRevCol       },
                  { label: 'EBITDA',        value: ebitdaCol,    setter: setEbitdaCol    },
                  { label: 'EBIT',          value: ebitCol,      setter: setEbitCol      },
                  { label: 'NET INCOME',    value: niCol,        setter: setNiCol        },
                  { label: 'FCF',           value: fcfCol,       setter: setFcfCol       },
                  { label: 'EPS',           value: epsCol,       setter: setEpsCol       },
                  { label: 'REV GROWTH %',  value: revGrowthCol, setter: setRevGrowthCol },
                  { label: 'EBITDA MARGIN %',value: ebitdaMarCol, setter: setEbitdaMarCol},
                  { label: 'NAME',          value: nameCol,      setter: setNameCol      },
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
              <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && targetCo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Target</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{targetCo.ticker}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {targetCo.name} · {peers.length} peers
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Relative Score</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{targetCo.relativeScore?.toFixed(0) ?? '—'}</div>
            <div className="mt-1.5">
              {targetCo.valueSignal && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalColor(targetCo.valueSignal)}`}>
                  {targetCo.valueSignal}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">EV/EBITDA vs Median</div>
            <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
              {targetCo.evEbitda?.toFixed(1) ?? '—'}x
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Peer median: {medians.evEbitda?.toFixed(1) ?? '—'}x
              {targetCo.evEbitda !== null && medians.evEbitda !== null && (
                <span className={`ml-1 font-semibold ${targetCo.evEbitda > medians.evEbitda ? 'text-red-500' : 'text-emerald-600'}`}>
                  ({targetCo.evEbitda > medians.evEbitda ? '+' : ''}{((targetCo.evEbitda / medians.evEbitda - 1) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">P/E vs Median</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {targetCo.peRatio?.toFixed(1) ?? '—'}x
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Peer median: {medians.peRatio?.toFixed(1) ?? '—'}x
              {targetCo.peRatio !== null && medians.peRatio !== null && (
                <span className={`ml-1 font-semibold ${targetCo.peRatio > medians.peRatio ? 'text-red-500' : 'text-emerald-600'}`}>
                  ({targetCo.peRatio > medians.peRatio ? '+' : ''}{((targetCo.peRatio / medians.peRatio - 1) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Multiple comparison per metric ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Valuation Multiple Comparison</CardTitle>
              <CardDescription>
                {targetCo?.ticker} (violet) vs peers — blue line = peer median. Lower multiples = cheaper (except FCF Yield: higher = cheaper)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MULTIPLES.filter(m => activeCompanies.some(c => c[m.key as keyof CompanyRow] !== null)).map(m => {
                const chartData = activeCompanies
                  .filter(c => c[m.key as keyof CompanyRow] !== null)
                  .map(c => ({
                    ticker:   c.ticker,
                    value:    c[m.key as keyof CompanyRow] as number,
                    isTarget: c.isTarget,
                  }))
                  .sort((a, b) => a.value - b.value);
                const med = medians[m.key];
                return (
                  <div key={m.key}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{m.label}</p>
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                          tickFormatter={v => m.key === 'fcfYield' ? `${v.toFixed(1)}%` : `${v.toFixed(1)}x`} />
                        <YAxis type="category" dataKey="ticker" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} width={44} />
                        <Tooltip
                          formatter={(v: any) => [m.key === 'fcfYield' ? `${Number(v).toFixed(2)}%` : `${Number(v).toFixed(2)}x`, m.label]}
                          labelFormatter={(l) => l}
                          contentStyle={{ fontSize: 11, border: '1px solid #E2E8F0', borderRadius: 8 }}
                        />
                        {med !== null && <ReferenceLine x={med} stroke={MEDIAN_COLOR} strokeWidth={1.5} strokeDasharray="4 3" />}
                        <Bar dataKey="value" maxBarSize={18} radius={[0, 3, 3, 0]}>
                          {chartData.map((r, i) => (
                            <Cell key={i} fill={r.isTarget ? TARGET_COLOR : PEER_COLOR} fillOpacity={r.isTarget ? 0.9 : 0.55} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 text-xs pt-1">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TARGET_COLOR }} /><span className="text-muted-foreground">Target</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PEER_COLOR, opacity: 0.55 }} /><span className="text-muted-foreground">Peers</span></div>
                <div className="flex items-center gap-1.5"><div className="w-6 h-0.5" style={{ backgroundColor: MEDIAN_COLOR }} /><span className="text-muted-foreground">Peer Median</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: Relative Valuation Score ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Relative Valuation Score</CardTitle>
              <CardDescription>0–100 score based on z-scores across all multiples — &lt;40 Undervalued · 40–60 Fair Value · &gt;60 Overvalued</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreChartData} margin={{ top: 8, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={36} domain={[0, 100]} />
                  <Tooltip content={<ScoreTooltip />} />
                  <ReferenceLine y={60} stroke={OVER_COLOR}   strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Overvalued',  position: 'right', fontSize: 9, fill: OVER_COLOR }} />
                  <ReferenceLine y={50} stroke={MEDIAN_COLOR} strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Peer Median', position: 'right', fontSize: 9, fill: MEDIAN_COLOR }} />
                  <ReferenceLine y={40} stroke={UNDER_COLOR}  strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Undervalued', position: 'right', fontSize: 9, fill: UNDER_COLOR }} />
                  <Bar dataKey="score" name="Relative Score" maxBarSize={48} radius={[3, 3, 0, 0]}>
                    {scoreChartData.map((r, i) => (
                      <Cell key={i}
                      fill={(r.score ?? 0) >= 60 ? OVER_COLOR : (r.score ?? 0) <= 40 ? UNDER_COLOR : FAIR_COLOR}                        fillOpacity={r.isTarget ? 1.0 : 0.6}
                        stroke={r.isTarget ? TARGET_COLOR : 'none'}
                        strokeWidth={r.isTarget ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: Implied Equity Value ── */}
        {isConfigured && impliedChartData.length > 0 && targetCo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Implied Equity Value — {targetCo.ticker}</CardTitle>
              <CardDescription>
                Peer median multiples applied to {targetCo.ticker}'s financials vs current market cap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={impliedChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="method" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={56}
                    tickFormatter={v => `$${(v).toFixed(0)}B`} />
                  <Tooltip
                    formatter={(v: any, name: string) => [`$${Number(v).toFixed(1)}B`, name]}
                    contentStyle={{ fontSize: 11, border: '1px solid #E2E8F0', borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {targetCo.marketCap !== null && (
                    <ReferenceLine y={targetCo.marketCap} stroke="#1e293b" strokeWidth={1.5} strokeDasharray="4 3"
                      label={{ value: `Current $${targetCo.marketCap.toFixed(0)}B`, position: 'right', fontSize: 9, fill: '#475569' }} />
                  )}
                  <Bar dataKey="implied" name="Implied Equity Value" maxBarSize={60} radius={[3, 3, 0, 0]}>
                    {impliedChartData.map((r, i) => (
                      <Cell key={i}
                        fill={r.current !== null && r.implied > r.current ? UNDER_COLOR : OVER_COLOR}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">
                Green = implied value above current market cap (undervalued signal) · Red = implied value below (overvalued signal)
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Comps Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Comparable Company Table
              </CardTitle>
              <CardDescription>Full multiple breakdown — peer median row shown at bottom</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['', 'Ticker', 'Mkt Cap', 'EV', 'EV/Revenue', 'EV/EBITDA', 'EV/EBIT', 'P/E', 'FCF Yield', 'Rev Growth', 'EBITDA Margin', 'Score', 'Signal'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeCompanies].sort((a, b) => (a.isTarget ? -1 : 1)).map((c) => (
                      <tr key={c.id} className={`border-t hover:bg-slate-50/50 transition-colors ${c.isTarget ? 'bg-primary/5' : ''}`}>
                        <td className="px-3 py-2">
                          {c.isTarget && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Target</span>}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{c.ticker}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{fmtM(c.marketCap)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{fmtM(c.ev)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.evRevenue?.toFixed(1) ?? '—'}x</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.evEbitda?.toFixed(1) ?? '—'}x</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.evEbit?.toFixed(1) ?? '—'}x</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.peRatio?.toFixed(1) ?? '—'}x</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.fcfYield !== null ? `${c.fcfYield.toFixed(1)}%` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.revenueGrowth !== null ? `${c.revenueGrowth.toFixed(0)}%` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.ebitdaMargin !== null ? `${c.ebitdaMargin.toFixed(1)}%` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{c.relativeScore?.toFixed(0) ?? '—'}</td>
                        <td className="px-3 py-2">
                          {c.valueSignal && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalColor(c.valueSignal)}`}>{c.valueSignal}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Peer Median Row */}
                    <tr className="border-t-2 border-blue-200 bg-blue-50/30">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 font-semibold text-blue-600 text-xs">PEER MEDIAN</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">—</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">—</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-blue-600">{medians.evRevenue?.toFixed(1) ?? '—'}x</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-blue-600">{medians.evEbitda?.toFixed(1) ?? '—'}x</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-blue-600">{medians.evEbit?.toFixed(1) ?? '—'}x</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-blue-600">{medians.peRatio?.toFixed(1) ?? '—'}x</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-blue-600">{medians.fcfYield?.toFixed(1) ?? '—'}%</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">—</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">—</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">—</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Implied Value Table ── */}
        {isConfigured && impliedValues.length > 0 && targetCo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Implied Equity Value Table — {targetCo.ticker}</CardTitle>
              <CardDescription>Peer median multiple × {targetCo.ticker}'s financial metric = implied enterprise/equity value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Method', 'Peer Median Multiple', 'Financial Metric', 'Implied EV / Mkt Cap', 'Implied Equity Value', 'vs Current Mkt Cap', 'Upside / Downside'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {impliedValues.map((r, i) => {
                      const cur = targetCo.marketCap ?? 0;
                      const upside = cur > 0 ? ((r.impliedEquity - cur) / cur * 100) : null;
                      const metric = r.method === 'EV/EBITDA' ? targetCo.ebitda :
                                     r.method === 'EV/EBIT'   ? targetCo.ebit   :
                                     r.method === 'EV/Revenue'? targetCo.revenue :
                                     targetCo.netIncome;
                      return (
                        <tr key={i} className="border-t hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-semibold text-slate-700">{r.method}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.multiple.toFixed(2)}x</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{metric !== null ? `$${metric.toFixed(1)}B` : '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">${r.impliedEV.toFixed(1)}B</td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">${r.impliedEquity.toFixed(1)}B</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">${cur.toFixed(1)}B</td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold">
                            {upside !== null ? (
                              <span className={upside >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
                              </span>
                            ) : '—'}
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
        {isConfigured && targetCo && (() => {
          const sig = targetCo.valueSignal;
          const premiumDiscount = targetCo.evEbitda !== null && medians.evEbitda !== null
            ? ((targetCo.evEbitda / medians.evEbitda - 1) * 100) : null;
          const highestGrowth = [...activeCompanies].sort((a, b) => (b.revenueGrowth ?? 0) - (a.revenueGrowth ?? 0))[0];
          const bestFCFYield = [...activeCompanies].filter(c => c.fcfYield !== null).sort((a, b) => b.fcfYield! - a.fcfYield!)[0];

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated CCA analysis — {targetCo.ticker} vs {peers.length} peers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Valuation Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    <span className="font-semibold">{targetCo.ticker}</span> trades at{' '}
                    {targetCo.evEbitda !== null ? <><span className="font-semibold">{targetCo.evEbitda.toFixed(1)}x EV/EBITDA</span></> : 'N/A'}
                    {medians.evEbitda !== null && premiumDiscount !== null && (
                      <>, a <span className="font-semibold">
                        {Math.abs(premiumDiscount).toFixed(0)}% {premiumDiscount > 0 ? 'premium' : 'discount'}
                      </span> to the peer group median of {medians.evEbitda.toFixed(1)}x</>
                    )}.
                    {' '}Relative valuation score: <span className="font-semibold">
                      {targetCo.relativeScore?.toFixed(0)}/100 ({sig})
                    </span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Rel. Score',    value: `${targetCo.relativeScore?.toFixed(0) ?? '—'}/100`, sub: sig ?? '—' },
                    { label: 'EV/EBITDA',     value: `${targetCo.evEbitda?.toFixed(1) ?? '—'}x`, sub: `Median: ${medians.evEbitda?.toFixed(1) ?? '—'}x` },
                    { label: 'P/E',           value: `${targetCo.peRatio?.toFixed(1) ?? '—'}x`,   sub: `Median: ${medians.peRatio?.toFixed(1) ?? '—'}x` },
                    { label: 'FCF Yield',     value: targetCo.fcfYield !== null ? `${targetCo.fcfYield.toFixed(1)}%` : '—', sub: `Median: ${medians.fcfYield?.toFixed(1) ?? '—'}%` },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Relative Positioning</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {sig === 'Undervalued'
                          ? `${targetCo.ticker} appears undervalued relative to its peer group on a composite multiple basis (score: ${targetCo.relativeScore?.toFixed(0)}). Its multiples are broadly below the peer median, suggesting the market may be discounting it relative to comparable businesses. This could reflect company-specific risk, lower growth expectations, or a genuine mispricing — further investigation of the gap is warranted.`
                          : sig === 'Overvalued'
                          ? `${targetCo.ticker} trades at a premium to its peer group on a composite multiple basis (score: ${targetCo.relativeScore?.toFixed(0)}). This premium could be justified by superior growth, margins, or quality of earnings — or it may reflect market optimism that is not fully supported by fundamentals. Compare the growth and margin profile below to assess whether the premium is warranted.`
                          : `${targetCo.ticker} trades broadly in line with its peer group (score: ${targetCo.relativeScore?.toFixed(0)}). Its composite multiple profile is close to the peer median, suggesting the market is pricing it consistently with the sector. The relative valuation is neither compelling cheap nor notably expensive.`}
                      </p>
                    </div>
                  </div>

                  {premiumDiscount !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">EV/EBITDA Premium / Discount</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {targetCo.ticker} trades at a{' '}
                          <span className="font-semibold">
                            {Math.abs(premiumDiscount).toFixed(0)}% {premiumDiscount > 0 ? 'premium' : 'discount'}
                          </span>{' '}
                          to the peer EV/EBITDA median of {medians.evEbitda?.toFixed(1)}x.
                          {premiumDiscount > 20
                            ? ` A premium above 20% requires justification — typically superior revenue growth, higher EBITDA margins, stronger FCF conversion, or a defensible competitive moat. Check whether ${targetCo.ticker}'s growth and margin profile supports this premium.`
                            : premiumDiscount < -20
                            ? ` A discount of more than 20% may indicate an attractive relative entry point — but verify that the discount isn't driven by legitimate structural issues (declining margins, leverage, cyclicality) that peers don't share.`
                            : ` A moderate premium/discount within ±20% is within normal range and may reflect immaterial differences in capital structure, growth, or market positioning.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {highestGrowth && highestGrowth.ticker !== targetCo.ticker && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Growth Context</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The highest-growth peer is <span className="font-semibold">{highestGrowth.ticker}</span>{' '}
                          ({highestGrowth.revenueGrowth?.toFixed(0)}% revenue growth), which likely justifies a higher multiple.
                          {targetCo.revenueGrowth !== null && (
                            <> {targetCo.ticker} is growing at <span className="font-semibold">{targetCo.revenueGrowth.toFixed(0)}%</span>{' '}
                            — {targetCo.revenueGrowth >= (highestGrowth.revenueGrowth ?? 0) * 0.8
                              ? 'a comparable growth rate that may support a premium multiple.'
                              : 'a slower rate, which partially explains any valuation discount to faster-growing peers.'}</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {impliedValues.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Implied Value Summary</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Applying peer median multiples to {targetCo.ticker}'s financials produces implied equity values ranging from{' '}
                          <span className="font-semibold">${Math.min(...impliedValues.map(r => r.impliedEquity)).toFixed(0)}B</span> to{' '}
                          <span className="font-semibold">${Math.max(...impliedValues.map(r => r.impliedEquity)).toFixed(0)}B</span>.
                          {targetCo.marketCap !== null && (
                            <> vs the current market cap of <span className="font-semibold">${targetCo.marketCap.toFixed(0)}B</span>.
                            The average implied value is <span className="font-semibold">${(impliedValues.reduce((s, r) => s + r.impliedEquity, 0) / impliedValues.length).toFixed(0)}B</span>.</>
                          )}
                          {' '}Note that implied value from CCA reflects what the market would price the target at if it traded exactly like its peers — it is a relative, not absolute, measure of value.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ EV = Market Cap + Net Debt. Multiples auto-derived from financials if not provided directly.
                  Relative Score = 50 + (avg z-score across multiples) × 15, clamped to 0–100.
                  Peer Median used as reference (excludes target). Lower multiples = cheaper for all metrics except FCF Yield (higher = cheaper).
                  Implied Equity Value = Peer Median Multiple × Target Financial Metric − Net Debt.
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
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
  ReferenceLine,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
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
  Layers,
  ArrowUpDown,
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

type TTGrade = 'Strong Buy' | 'Buy' | 'Neutral' | 'Avoid';

interface StockTT {
  ticker:        string;
  // Raw inputs
  per:           number | null;
  pbr:           number | null;
  roe:           number | null;
  grossMargin:   number | null;
  debtEquity:    number | null;
  shortMom:      number | null;
  longMom:       number | null;
  // Pillar scores (0–100)
  valueScore:    number;
  qualityScore:  number;
  momentumScore: number;
  // Composite
  totalScore:    number;
  grade:         TTGrade;
}

// ============================================
// Constants
// ============================================

const GRADE_CONFIG: Record<TTGrade, { label: string; hex: string; desc: string }> = {
  'Strong Buy': { label: 'Strong Buy', hex: '#6C3AED', desc: 'All three pillars strong'       },
  'Buy':        { label: 'Buy',        hex: '#10B981', desc: 'Two pillars positive'            },
  'Neutral':    { label: 'Neutral',    hex: '#F59E0B', desc: 'Mixed signals across pillars'    },
  'Avoid':      { label: 'Avoid',      hex: '#94A3B8', desc: 'Weak across multiple dimensions' },
};

const PILLAR_COLORS = {
  value:    '#F59E0B',
  quality:  '#10B981',
  momentum: '#6C3AED',
};

const EXAMPLE_TICKERS = [
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA',
  'JPM','BAC','GS',
  'XOM','CVX','BP',
  'JNJ','PFE','MRK',
  'PG','KO','WMT','HD',
];

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const profiles: Record<string, {
    per: number; pbr: number; roe: number; gm: number; de: number;
    shortMom: number; longMom: number;
  }> = {
    AAPL:  { per: 28,  pbr: 45,  roe: 145, gm: 44, de: 1.8,  shortMom:  8,  longMom:  28  },
    MSFT:  { per: 32,  pbr: 12,  roe: 38,  gm: 69, de: 0.4,  shortMom:  12, longMom:  42  },
    GOOGL: { per: 24,  pbr: 5.5, roe: 25,  gm: 56, de: 0.06, shortMom:  14, longMom:  35  },
    AMZN:  { per: 60,  pbr: 8,   roe: 20,  gm: 47, de: 0.8,  shortMom:  6,  longMom:  22  },
    META:  { per: 22,  pbr: 6.5, roe: 28,  gm: 80, de: 0.12, shortMom:  18, longMom:  62  },
    NVDA:  { per: 55,  pbr: 35,  roe: 90,  gm: 72, de: 0.4,  shortMom:  28, longMom:  95  },
    TSLA:  { per: 70,  pbr: 12,  roe: 18,  gm: 18, de: 0.2,  shortMom:  22, longMom: -18  },
    JPM:   { per: 11,  pbr: 1.6, roe: 15,  gm: 62, de: 1.2,  shortMom:  10, longMom:  20  },
    BAC:   { per: 10,  pbr: 1.1, roe: 10,  gm: 55, de: 1.1,  shortMom: -2,  longMom:  -5  },
    GS:    { per: 12,  pbr: 1.3, roe: 12,  gm: 58, de: 1.0,  shortMom:  8,  longMom:  15  },
    XOM:   { per: 13,  pbr: 2.0, roe: 18,  gm: 35, de: 0.25, shortMom: -8,  longMom: -12  },
    CVX:   { per: 12,  pbr: 1.8, roe: 14,  gm: 30, de: 0.15, shortMom: -10, longMom: -15  },
    BP:    { per: 8,   pbr: 1.2, roe: 8,   gm: 18, de: 0.5,  shortMom: -14, longMom: -22  },
    JNJ:   { per: 15,  pbr: 5.0, roe: 22,  gm: 68, de: 0.45, shortMom: -6,  longMom:   8  },
    PFE:   { per: 9,   pbr: 1.5, roe: 12,  gm: 62, de: 0.6,  shortMom: -12, longMom: -28  },
    MRK:   { per: 13,  pbr: 6.0, roe: 18,  gm: 68, de: 0.3,  shortMom: -4,  longMom: -10  },
    PG:    { per: 24,  pbr: 7.5, roe: 32,  gm: 50, de: 0.65, shortMom: -3,  longMom:  12  },
    KO:    { per: 22,  pbr: 10,  roe: 42,  gm: 58, de: 1.7,  shortMom: -5,  longMom:   6  },
    WMT:   { per: 26,  pbr: 6.5, roe: 18,  gm: 24, de: 0.68, shortMom:  2,  longMom:  30  },
    HD:    { per: 20,  pbr: -1,  roe: 999, gm: 33, de: -1,   shortMom: -4,  longMom:  25  },
  };

  return EXAMPLE_TICKERS.map((ticker) => {
    const p = profiles[ticker];
    const n = (v: number, pct = 0.12) => parseFloat((v * (1 - pct / 2 + Math.random() * pct)).toFixed(3));
    return {
      ticker,
      per:          p.per  > 0  ? n(p.per)  : null,
      pbr:          p.pbr  > 0  ? n(p.pbr)  : null,
      roe:          p.roe  < 500 ? n(p.roe) : null,
      gross_margin: n(p.gm),
      debt_equity:  p.de   > 0  ? n(p.de)   : null,
      short_momentum: parseFloat((p.shortMom + (Math.random() - 0.5) * 3).toFixed(2)),
      long_momentum:  parseFloat((p.longMom  + (Math.random() - 0.5) * 5).toFixed(2)),
    };
  });
}

// ============================================
// Scoring helpers
// ============================================

function pctRank(value: number, all: number[], lowerBetter = false): number {
  const valid = all.filter((v) => isFinite(v));
  if (valid.length < 2) return 50;
  const rank = valid.filter((v) => v < value).length / valid.length;
  return parseFloat(((lowerBetter ? 1 - rank : rank) * 100).toFixed(2));
}

function buildTTScores(
  data: Record<string, any>[],
  cols: {
    ticker: string;
    per: string; pbr: string;
    roe: string; gm: string; de: string;
    shortMom: string; longMom: string;
  },
  weights: { value: number; quality: number; momentum: number },
): StockTT[] {
  const get = (row: Record<string, any>, col: string): number | null => {
    if (!col) return null;
    const v = parseFloat(row[col]);
    return isFinite(v) ? v : null;
  };

  const rows = data.map((row) => ({
    ticker:       String(row[cols.ticker] ?? '').trim().toUpperCase(),
    per:          get(row, cols.per),
    pbr:          get(row, cols.pbr),
    roe:          get(row, cols.roe),
    grossMargin:  get(row, cols.gm),
    debtEquity:   get(row, cols.de),
    shortMom:     get(row, cols.shortMom),
    longMom:      get(row, cols.longMom),
  })).filter((r) => r.ticker);

  // Universe arrays for percentile
  const allPer   = rows.map((r) => r.per!).filter((v): v is number => v !== null && v > 0);
  const allPbr   = rows.map((r) => r.pbr!).filter((v): v is number => v !== null && v > 0);
  const allRoe   = rows.map((r) => r.roe!).filter((v): v is number => v !== null);
  const allGm    = rows.map((r) => r.grossMargin!).filter((v): v is number => v !== null);
  const allDe    = rows.map((r) => r.debtEquity!).filter((v): v is number => v !== null && v > 0);
  const allShort = rows.map((r) => r.shortMom!).filter((v): v is number => v !== null);
  const allLong  = rows.map((r) => r.longMom!).filter((v): v is number => v !== null);

  return rows.map((r) => {
    // --- Value pillar (lower multiple = better) ---
    const perR  = r.per  !== null && r.per  > 0 ? pctRank(r.per,  allPer,  true) : null;
    const pbrR  = r.pbr  !== null && r.pbr  > 0 ? pctRank(r.pbr,  allPbr,  true) : null;
    const valArr = [perR, pbrR].filter((v): v is number => v !== null);
    const valueScore = valArr.length ? valArr.reduce((s, v) => s + v, 0) / valArr.length : 50;

    // --- Quality pillar ---
    const roeR  = r.roe  !== null ? pctRank(r.roe,         allRoe, false) : null;
    const gmR   = r.grossMargin !== null ? pctRank(r.grossMargin, allGm, false) : null;
    const deR   = r.debtEquity  !== null && r.debtEquity > 0 ? pctRank(r.debtEquity, allDe, true) : null;
    const qualArr = [roeR, gmR, deR].filter((v): v is number => v !== null);
    const qualityScore = qualArr.length ? qualArr.reduce((s, v) => s + v, 0) / qualArr.length : 50;

    // --- Momentum pillar ---
    const shortR = r.shortMom !== null ? pctRank(r.shortMom, allShort, false) : null;
    const longR  = r.longMom  !== null ? pctRank(r.longMom,  allLong,  false) : null;
    const momArr = [shortR, longR].filter((v): v is number => v !== null);
    const momentumScore = momArr.length ? momArr.reduce((s, v) => s + v, 0) / momArr.length : 50;

    // --- Composite ---
    const wTotal = weights.value + weights.quality + weights.momentum;
    const totalScore = wTotal > 0
      ? (valueScore * weights.value + qualityScore * weights.quality + momentumScore * weights.momentum) / wTotal
      : (valueScore + qualityScore + momentumScore) / 3;

    // Grade
    const pillarsAbove55 = [valueScore, qualityScore, momentumScore].filter((s) => s >= 55).length;
    const grade: TTGrade =
      totalScore >= 65 && pillarsAbove55 >= 2 ? 'Strong Buy' :
      totalScore >= 55                         ? 'Buy'        :
      totalScore >= 42                         ? 'Neutral'    :
                                                 'Avoid';

    return {
      ...r,
      valueScore:    parseFloat(valueScore.toFixed(1)),
      qualityScore:  parseFloat(qualityScore.toFixed(1)),
      momentumScore: parseFloat(momentumScore.toFixed(1)),
      totalScore:    parseFloat(totalScore.toFixed(1)),
      grade,
    };
  });
}

// ============================================
// Tooltips
// ============================================

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const RadarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{payload[0]?.payload?.subject}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
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
            <Zap className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Triple-Threat Filter</CardTitle>
        <CardDescription className="text-base mt-2">
          Combine Value, Quality, and Momentum into a single composite scorecard — surface stocks strong across all three dimensions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Zap      className="w-6 h-6 text-primary mb-2" />, title: 'Composite Scoring',  desc: 'Each stock receives a total score from 0–100 aggregated across Value, Quality, and Momentum pillars — with configurable weights per pillar.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Stacked Pillar Bar', desc: 'Visualize how much each of the three pillars contributes to every stock\'s composite score — instantly spot single-pillar vs. all-round strength.' },
            { icon: <Layers    className="w-6 h-6 text-primary mb-2" />, title: 'Radar Comparison',   desc: 'Overlay up to 3 stocks on a Value–Quality–Momentum radar to compare profile shape — ideal for final candidate selection.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Grade legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(GRADE_CONFIG) as [TTGrade, typeof GRADE_CONFIG[TTGrade]][]).map(([, cfg]) => (
            <div key={cfg.label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{cfg.label}</div>
              </div>
              <div className="text-xs text-muted-foreground">{cfg.desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            The Triple-Threat Filter is a final-stage screener. It synthesizes outputs from your value, quality, and
            momentum analyses into one ranking — helping you identify stocks that are genuinely strong across
            all dimensions, not just one. Strong Buy candidates should become your highest-conviction research targets.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>ticker / name</strong> — Stock identifier</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Value</strong> — PER and/or PBR</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Quality</strong> — ROE, Gross Margin, and/or D/E</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Momentum</strong> — Short and/or long-term return (%)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Stacked pillar bar chart per stock with grade coloring</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Radar overlay for up to 3 selected stocks</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Full ranked table + grade filter + pillar weight control</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Zap className="mr-2 h-5 w-5" />
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

export default function TripleThreatFilterPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {
  const hasData    = data.length > 0;

  // Column mapping
  const [tickerCol,  setTickerCol]  = useState('');
  const [perCol,     setPerCol]     = useState('');
  const [pbrCol,     setPbrCol]     = useState('');
  const [roeCol,     setRoeCol]     = useState('');
  const [gmCol,      setGmCol]      = useState('');
  const [deCol,      setDeCol]      = useState('');
  const [shortCol,   setShortCol]   = useState('');
  const [longCol,    setLongCol]    = useState('');

  // Pillar weights
  const [wValue,    setWValue]    = useState(1);
  const [wQuality,  setWQuality]  = useState(1);
  const [wMomentum, setWMomentum] = useState(1);

  // UI state
  const [gradeFilter,  setGradeFilter]  = useState<TTGrade | 'all'>('all');
  const [sortKey,      setSortKey]      = useState<'totalScore' | 'valueScore' | 'qualityScore' | 'momentumScore' | 'ticker'>('totalScore');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [compareList,  setCompareList]  = useState<string[]>([]);
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [isDownloading,setIsDownloading]= useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_triple_threat.csv');
    // column auto-detect handled by useMemo below
    setTickerCol('ticker');
    setPerCol('per'); setPbrCol('pbr');
    setRoeCol('roe'); setGmCol('gross_margin'); setDeCol('debt_equity');
    setShortCol('short_momentum'); setLongCol('long_momentum');
    setWValue(1); setWQuality(1); setWMomentum(1);
    setCompareList([]);
  }, []);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setTickerCol(''); setPerCol(''); setPbrCol('');
    setRoeCol(''); setGmCol(''); setDeCol('');
    setShortCol(''); setLongCol('');
    setCompareList([]);
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map((s) => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex((c) => kws.some((k) => c === k));
      if (idx === -1) idx = h.findIndex((c) => kws.some((k) => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['ticker', 'symbol', 'name', 'stock'],                      setTickerCol, tickerCol);
    detect(['per', 'p/e', 'pe_ratio', 'pe'],                           setPerCol,    perCol);
    detect(['pbr', 'p/b', 'pb_ratio', 'pb'],                           setPbrCol,    pbrCol);
    detect(['roe', 'return_on_equity'],                                 setRoeCol,    roeCol);
    detect(['gross_margin', 'gross_profit_margin', 'gm'],              setGmCol,     gmCol);
    detect(['debt_equity', 'debt_to_equity', 'd/e', 'de'],             setDeCol,     deCol);
    detect(['short_momentum', 'short_mom', 'mom_1m', '1m_return'],    setShortCol,  shortCol);
    detect(['long_momentum',  'long_mom',  'mom_6m', '6m_return'],    setLongCol,   longCol);
  }, [hasData, allHeaders]);


  // ── Build scores ───────────────────────────────────────────
  const scored = useMemo(() => {
    if (!tickerCol) return [];
    return buildTTScores(
      data,
      { ticker: tickerCol, per: perCol, pbr: pbrCol, roe: roeCol, gm: gmCol, de: deCol, shortMom: shortCol, longMom: longCol },
      { value: wValue, quality: wQuality, momentum: wMomentum },
    );
  }, [data, tickerCol, perCol, pbrCol, roeCol, gmCol, deCol, shortCol, longCol, wValue, wQuality, wMomentum]);

  // ── Grade counts ───────────────────────────────────────────
  const gradeCounts = useMemo(() => {
    const c: Record<TTGrade, number> = { 'Strong Buy': 0, 'Buy': 0, 'Neutral': 0, 'Avoid': 0 };
    for (const s of scored) c[s.grade]++;
    return c;
  }, [scored]);

  // ── Filtered + sorted ──────────────────────────────────────
  const filtered = useMemo(() => {
    const base = gradeFilter === 'all' ? scored : scored.filter((s) => s.grade === gradeFilter);
    return [...base].sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [scored, gradeFilter, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir(key === 'ticker' ? 'asc' : 'desc'); }
  };

  // ── Top 15 stacked bar data ────────────────────────────────
  const top15 = useMemo(() =>
    [...scored].sort((a, b) => b.totalScore - a.totalScore).slice(0, 15).map((s) => ({
      name:     s.ticker,
      Value:    parseFloat((s.valueScore    / 3).toFixed(1)),
      Quality:  parseFloat((s.qualityScore  / 3).toFixed(1)),
      Momentum: parseFloat((s.momentumScore / 3).toFixed(1)),
      grade:    s.grade,
      total:    s.totalScore,
    })),
    [scored],
  );

  // ── Radar data for compare ─────────────────────────────────
  const radarData = useMemo(() => [
    { subject: 'Value' },
    { subject: 'Quality' },
    { subject: 'Momentum' },
  ].map((row) => {
    const entry: Record<string, any> = { subject: row.subject };
    for (const t of compareList) {
      const s = scored.find((r) => r.ticker === t);
      if (s) entry[t] = row.subject === 'Value' ? s.valueScore : row.subject === 'Quality' ? s.qualityScore : s.momentumScore;
    }
    return entry;
  }), [compareList, scored]);

  const toggleCompare = (ticker: string) =>
    setCompareList((p) => p.includes(ticker) ? p.filter((t) => t !== ticker) : p.length < 3 ? [...p, ticker] : p);

  const bestStock  = scored.length > 0 ? [...scored].sort((a, b) => b.totalScore - a.totalScore)[0] : null;
  const avgScore   = scored.length > 0 ? scored.reduce((s, r) => s + r.totalScore, 0) / scored.length : 0;
  const strongBuys = scored.filter((s) => s.grade === 'Strong Buy');

  const isConfigured = !!(tickerCol && scored.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Weight label ───────────────────────────────────────────
  const weightLabel = (w: number) => w === 0 ? '0×' : w === 1 ? '1×' : w === 2 ? '2×' : '3×';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!scored.length) return;
    const csv = Papa.unparse(scored.map((s) => ({
      ticker:         s.ticker,
      total_score:    s.totalScore,
      grade:          s.grade,
      value_score:    s.valueScore,
      quality_score:  s.qualityScore,
      momentum_score: s.momentumScore,
      per: s.per ?? '', pbr: s.pbr ?? '',
      roe: s.roe ?? '', gross_margin: s.grossMargin ?? '', debt_equity: s.debtEquity ?? '',
      short_momentum: s.shortMom ?? '', long_momentum: s.longMom ?? '',
    })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `TripleThreat_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [scored, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `TripleThreat_${new Date().toISOString().split('T')[0]}.png`;
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
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreading hover:text-slate-700"
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
                  {allHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    {allHeaders.map((h) => (
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
            <span className="text-xs text-muted-foreground">Composite</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Triple-Threat Filter
          </CardTitle>
          <CardDescription>
            Integrate Value, Quality, and Momentum into a single composite scorecard — identify stocks with strength across all three dimensions.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map columns for each pillar. At least one column per pillar recommended for a balanced score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Column mapping grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { label: 'TICKER *',       value: tickerCol, setter: setTickerCol, headers: allHeaders,     opt: false },
              { label: 'PER (Value)',     value: perCol,    setter: setPerCol,    headers: numericHeaders, opt: true  },
              { label: 'PBR (Value)',     value: pbrCol,    setter: setPbrCol,    headers: numericHeaders, opt: true  },
              { label: 'ROE (Quality)',   value: roeCol,    setter: setRoeCol,    headers: numericHeaders, opt: true  },
              { label: 'GROSS MARGIN',   value: gmCol,     setter: setGmCol,     headers: numericHeaders, opt: true  },
              { label: 'DEBT / EQUITY',  value: deCol,     setter: setDeCol,     headers: numericHeaders, opt: true  },
              { label: 'SHORT MOM.',     value: shortCol,  setter: setShortCol,  headers: numericHeaders, opt: true  },
              { label: 'LONG MOM.',      value: longCol,   setter: setLongCol,   headers: numericHeaders, opt: true  },
            ].map(({ label, value, setter, headers, opt }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={(v) => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {opt && <SelectItem value="__none__">— None —</SelectItem>}
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Pillar weights */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pillar Weights</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Value',    color: PILLAR_COLORS.value,    state: wValue,    setState: setWValue    },
                { label: 'Quality',  color: PILLAR_COLORS.quality,  state: wQuality,  setState: setWQuality  },
                { label: 'Momentum', color: PILLAR_COLORS.momentum, state: wMomentum, setState: setWMomentum },
              ].map(({ label, color, state, setState }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <Label className="text-xs font-semibold text-muted-foreground">{label.toUpperCase()}</Label>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((w) => (
                      <button key={w} onClick={() => setState(w)}
                        className={`flex-1 py-1 rounded text-xs font-bold border transition-all
                          ${state === w
                            ? 'text-white border-transparent'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                        style={state === w ? { backgroundColor: color } : {}}>
                        {weightLabel(w)}
                      </button>
                    ))}
                  </div>
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
                <Download className="mr-2 h-4 w-4" />Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && bestStock && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Ranked</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">{bestStock.ticker}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Score {bestStock.totalScore} · {bestStock.grade}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Strong Buy</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{gradeCounts['Strong Buy']}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              + {gradeCounts['Buy']} Buy
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Universe Avg</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{avgScore.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{scored.length} stocks</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avoid</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{gradeCounts['Avoid']}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Score below 42</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Stacked Pillar Bar Chart ── */}
        {isConfigured && top15.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 15 — Value · Quality · Momentum Breakdown</CardTitle>
              <CardDescription>Each bar shows the contribution of each pillar to the total composite score</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(240, top15.length * 34)}>
                <BarChart data={top15} layout="vertical"
                  margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="Value"    name="Value"    stackId="a" fill={PILLAR_COLORS.value}    fillOpacity={0.85} radius={[0, 0, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Quality"  name="Quality"  stackId="a" fill={PILLAR_COLORS.quality}  fillOpacity={0.85} radius={[0, 0, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Momentum" name="Momentum" stackId="a" fill={PILLAR_COLORS.momentum} fillOpacity={0.85} radius={[0, 3, 3, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-3 justify-end">
                {(Object.entries(GRADE_CONFIG) as [TTGrade, typeof GRADE_CONFIG[TTGrade]][]).map(([, cfg]) => (
                  <div key={cfg.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cfg.hex }} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Radar Comparison ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Pillar Radar Comparison</CardTitle>
                  <CardDescription>Select up to 3 stocks to compare Value, Quality, and Momentum side by side</CardDescription>
                </div>
                {compareList.length > 0 && (
                  <button className="text-xs text-muted-foreground hover:text-slate-700 underline"
                    onClick={() => setCompareList([])}>Clear</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {scored.map((s) => {
                  const active   = compareList.includes(s.ticker);
                  const disabled = !active && compareList.length >= 3;
                  const cfg      = GRADE_CONFIG[s.grade];
                  return (
                    <button key={s.ticker} onClick={() => !disabled && toggleCompare(s.ticker)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-all font-mono font-semibold
                        ${active   ? 'bg-primary text-white border-primary'
                        : disabled ? 'bg-white text-slate-300 border-slate-100 cursor-not-allowed'
                        :            'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                      {s.ticker}
                    </button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent>
              {compareList.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  Select stocks above to display the radar chart
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData} margin={{ top: 16, right: 40, bottom: 16, left: 40 }}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <Tooltip content={<RadarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {compareList.map((ticker, i) => (
                      <Radar key={ticker} name={ticker} dataKey={ticker}
                        stroke={['#6C3AED', '#10B981', '#F59E0B'][i]}
                        fill={['#6C3AED', '#10B981', '#F59E0B'][i]}
                        fillOpacity={0.15} strokeWidth={2} dot />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Full Ranked Table ── */}
        {isConfigured && filtered.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    All Stocks — Triple-Threat Ranking
                  </CardTitle>
                  <CardDescription>{filtered.length} stocks · click headers to sort</CardDescription>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'Strong Buy', 'Buy', 'Neutral', 'Avoid'] as const).map((g) => (
                    <button key={g} onClick={() => setGradeFilter(g)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all
                        ${gradeFilter === g
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {g === 'all' ? 'All' : g}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {[
                        { key: 'ticker',        label: 'Ticker',    align: 'left'  },
                        { key: 'totalScore',    label: 'Total',     align: 'right' },
                        { key: null,            label: 'Grade',     align: 'left'  },
                        { key: 'valueScore',    label: 'Value',     align: 'right' },
                        { key: 'qualityScore',  label: 'Quality',   align: 'right' },
                        { key: 'momentumScore', label: 'Momentum',  align: 'right' },
                      ].map(({ key, label, align }) => (
                        <th key={label}
                          onClick={() => key && handleSort(key as typeof sortKey)}
                          className={`px-3 py-2.5 text-${align} text-xs font-semibold text-muted-foreground uppercase tracking-wide
                            ${key ? 'cursor-pointer hover:text-slate-700 select-none' : ''} whitespace-nowrap`}>
                          <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                            {label}
                            {key && (sortKey === key
                              ? (sortDir === 'desc' ? <TrendingDown className="h-3 w-3 text-primary" /> : <TrendingUp className="h-3 w-3 text-primary" />)
                              : <ArrowUpDown className="h-3 w-3 text-slate-300" />)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const cfg = GRADE_CONFIG[s.grade];
                      return (
                        <tr key={s.ticker} className="border-t hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">{s.ticker}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`font-mono font-bold ${s.totalScore >= 55 ? 'text-primary' : 'text-slate-500'}`}>
                              {s.totalScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                              <span className="text-xs font-semibold text-slate-600">{s.grade}</span>
                            </div>
                          </td>
                          {[
                            { score: s.valueScore,    color: PILLAR_COLORS.value    },
                            { score: s.qualityScore,  color: PILLAR_COLORS.quality  },
                            { score: s.momentumScore, color: PILLAR_COLORS.momentum },
                          ].map(({ score, color }, i) => (
                            <td key={i} className="px-3 py-2.5 text-right font-mono text-xs">
                              <span style={{ color: score >= 55 ? color : '#94A3B8' }}>
                                {score.toFixed(1)}
                              </span>
                            </td>
                          ))}
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
        {isConfigured && bestStock && (() => {
          const worstStock   = [...scored].sort((a, b) => a.totalScore - b.totalScore)[0];
          const valueLead    = [...scored].sort((a, b) => b.valueScore    - a.valueScore)[0];
          const qualityLead  = [...scored].sort((a, b) => b.qualityScore  - a.qualityScore)[0];
          const momentumLead = [...scored].sort((a, b) => b.momentumScore - a.momentumScore)[0];
          const spread       = bestStock.totalScore - worstStock.totalScore;
          const allStrong    = scored.filter((s) => s.valueScore >= 55 && s.qualityScore >= 55 && s.momentumScore >= 55);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated Triple-Threat composite analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Composite Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Scored <span className="font-semibold">{scored.length}</span> stocks across Value, Quality, and Momentum with weights{' '}
                    <span className="font-mono font-semibold">{wValue}:{wQuality}:{wMomentum}</span>.
                    Universe average composite score is <span className="font-mono font-semibold">{avgScore.toFixed(1)}</span>.{' '}
                    <span className="font-semibold">{gradeCounts['Strong Buy']}</span> Strong Buy and{' '}
                    <span className="font-semibold">{gradeCounts['Buy']}</span> Buy candidates identified.{' '}
                    {allStrong.length > 0 && (
                      <span><span className="font-semibold">{allStrong.length}</span> stock{allStrong.length > 1 ? 's' : ''} score above 55 on all three pillars simultaneously.</span>
                    )}
                  </p>
                </div>

                {/* Grade tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(gradeCounts) as [TTGrade, number][]).map(([grade, count]) => {
                    const cfg = GRADE_CONFIG[grade];
                    return (
                      <div key={grade} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{grade}</div>
                        </div>
                        <div className="text-lg font-bold font-mono text-slate-700">{count}</div>
                        <div className="text-xs text-muted-foreground">
                          {scored.length > 0 ? `${((count / scored.length) * 100).toFixed(0)}% of universe` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Top Ranked — {bestStock.ticker}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold">{bestStock.ticker}</span> leads with a total score of{' '}
                        <span className="font-mono font-semibold">{bestStock.totalScore.toFixed(1)}</span>.
                        Value: <span className="font-mono" style={{ color: PILLAR_COLORS.value }}>{bestStock.valueScore.toFixed(1)}</span> ·{' '}
                        Quality: <span className="font-mono" style={{ color: PILLAR_COLORS.quality }}>{bestStock.qualityScore.toFixed(1)}</span> ·{' '}
                        Momentum: <span className="font-mono" style={{ color: PILLAR_COLORS.momentum }}>{bestStock.momentumScore.toFixed(1)}</span>.{' '}
                        This stock represents the highest-conviction composite opportunity in the current universe.
                      </p>
                    </div>
                  </div>

                  {allStrong.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">All-Pillar Strength ({allStrong.length} stocks)</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {allStrong.sort((a, b) => b.totalScore - a.totalScore).slice(0, 5).map((s) => s.ticker).join(', ')}
                          {allStrong.length > 5 ? ` and ${allStrong.length - 5} more` : ''}{' '}
                          score above 55 on Value, Quality, and Momentum simultaneously — the rarest and most
                          defensible combination. These names avoid the classic tradeoff of cheap-but-deteriorating
                          or high-quality-but-expensive.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Pillar Leaders</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Best Value: <span className="font-semibold">{valueLead.ticker}</span> ({valueLead.valueScore.toFixed(1)}) ·{' '}
                        Best Quality: <span className="font-semibold">{qualityLead.ticker}</span> ({qualityLead.qualityScore.toFixed(1)}) ·{' '}
                        Best Momentum: <span className="font-semibold">{momentumLead.ticker}</span> ({momentumLead.momentumScore.toFixed(1)}).
                        These are the domain leaders in each individual dimension — useful as style-pure alternatives
                        for factor-tilted strategies.
                      </p>
                    </div>
                  </div>

                  {gradeCounts['Avoid'] > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Avoid — {gradeCounts['Avoid']} stocks</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {scored.filter((s) => s.grade === 'Avoid').sort((a, b) => a.totalScore - b.totalScore).slice(0, 4).map((s) => s.ticker).join(', ')}{' '}
                          score below 42 on the composite — weak across multiple pillars.
                          While Avoid does not mean sell, these names lack positive catalysts across value, quality, and momentum
                          simultaneously. Fundamental deterioration, rich valuations, and negative trend create a compounding headwind.
                        </p>
                      </div>
                    </div>
                  )}

                  {spread > 35 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Wide Score Dispersion</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The composite spread between best and worst is{' '}
                          <span className="font-mono font-semibold">{spread.toFixed(1)}</span> points.
                          High dispersion indicates meaningful differentiation across the universe — active stock
                          selection should outperform passive exposure in this environment.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ All pillar scores use percentile ranking within the uploaded universe — scores are relative, not absolute.
                  Pillar weights adjust the composite but do not affect individual pillar percentiles.
                  Strong Buy requires a composite ≥ 65 with at least 2 of 3 pillars ≥ 55.
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
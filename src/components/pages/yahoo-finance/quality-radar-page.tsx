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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
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
  Layers,
  ArrowUpDown,
  Target,
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

type QualityGrade = 'Excellent' | 'Good' | 'Average' | 'Weak';

interface StockQuality {
  ticker:      string;
  // Raw metrics
  roe:         number | null;
  roa:         number | null;
  grossMargin: number | null;
  debtEquity:  number | null;
  currentRatio:number | null;
  assetTurnover:number | null;
  // Percentile scores (0–100)
  roeScore:     number;
  roaScore:     number;
  grossScore:   number;
  debtScore:    number;  // lower D/E = better
  currentScore: number;
  turnoverScore:number;
  // Category averages
  profitability: number;
  stability:     number;
  efficiency:    number;
  // Composite
  totalScore:    number;
  grade:         QualityGrade;
}

// ============================================
// Constants
// ============================================

const GRADE_CONFIG: Record<QualityGrade, { label: string; hex: string }> = {
  'Excellent': { label: 'Excellent', hex: '#6C3AED' },
  'Good':      { label: 'Good',      hex: '#10B981' },
  'Average':   { label: 'Average',   hex: '#F59E0B' },
  'Weak':      { label: 'Weak',      hex: '#94A3B8' },
};

const RADAR_AXES = [
  { key: 'profitability', label: 'Profitability' },
  { key: 'stability',     label: 'Stability'     },
  { key: 'efficiency',    label: 'Efficiency'    },
];

const CHART_COLORS = [
  '#6C3AED', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#EC4899', '#14B8A6', '#F97316',
];

const EXAMPLE_TICKERS = [
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA',
  'JPM','BAC','XOM','CVX',
  'JNJ','PFE','PG','KO','WMT',
];

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const profiles: Record<string, {
    roe: number; roa: number; gm: number; de: number; cr: number; at: number;
  }> = {
    AAPL:  { roe: 145,  roa: 28,  gm: 44,  de: 1.8,  cr: 0.98, at: 1.07 },
    MSFT:  { roe: 38,   roa: 18,  gm: 69,  de: 0.4,  cr: 1.77, at: 0.55 },
    GOOGL: { roe: 25,   roa: 15,  gm: 56,  de: 0.06, cr: 2.1,  at: 0.65 },
    AMZN:  { roe: 20,   roa: 5,   gm: 47,  de: 0.8,  cr: 1.05, at: 1.25 },
    META:  { roe: 28,   roa: 18,  gm: 80,  de: 0.12, cr: 2.7,  at: 0.62 },
    NVDA:  { roe: 90,   roa: 45,  gm: 72,  de: 0.4,  cr: 4.17, at: 0.92 },
    JPM:   { roe: 15,   roa: 1.4, gm: 62,  de: 1.2,  cr: 1.3,  at: 0.08 },
    BAC:   { roe: 10,   roa: 1.0, gm: 55,  de: 1.1,  cr: 1.2,  at: 0.07 },
    XOM:   { roe: 18,   roa: 8,   gm: 35,  de: 0.25, cr: 1.5,  at: 0.85 },
    CVX:   { roe: 14,   roa: 7,   gm: 30,  de: 0.15, cr: 1.6,  at: 0.75 },
    JNJ:   { roe: 22,   roa: 10,  gm: 68,  de: 0.45, cr: 1.1,  at: 0.52 },
    PFE:   { roe: 12,   roa: 5,   gm: 62,  de: 0.6,  cr: 1.3,  at: 0.38 },
    PG:    { roe: 32,   roa: 12,  gm: 50,  de: 0.65, cr: 0.68, at: 0.62 },
    KO:    { roe: 42,   roa: 10,  gm: 58,  de: 1.7,  cr: 1.1,  at: 0.48 },
    WMT:   { roe: 18,   roa: 7,   gm: 24,  de: 0.68, cr: 0.83, at: 2.35 },
  };

  return EXAMPLE_TICKERS.map((ticker) => {
    const p = profiles[ticker];
    const n = (base: number, pct = 0.1) => parseFloat((base * (1 - pct / 2 + Math.random() * pct)).toFixed(3));
    return {
      ticker,
      roe:           n(p.roe),
      roa:           n(p.roa),
      gross_margin:  n(p.gm),
      debt_equity:   n(p.de),
      current_ratio: n(p.cr),
      asset_turnover:n(p.at),
    };
  });
}

// ============================================
// Scoring
// ============================================

function percentileRank(value: number, allValues: number[], lowerIsBetter = false): number {
  const valid = allValues.filter((v) => isFinite(v));
  if (!valid.length) return 50;
  const rank = valid.filter((v) => v < value).length / valid.length;
  return lowerIsBetter ? (1 - rank) * 100 : rank * 100;
}

function buildQualityScores(
  data: Record<string, any>[],
  tickerCol:     string,
  roeCol:        string,
  roaCol:        string,
  grossCol:      string,
  debtCol:       string,
  currentCol:    string,
  turnoverCol:   string,
): StockQuality[] {
  const get = (row: Record<string, any>, col: string): number | null => {
    if (!col) return null;
    const v = parseFloat(row[col]);
    return isFinite(v) ? v : null;
  };

  const rows = data.map((row) => ({
    ticker:       String(row[tickerCol] ?? '').trim().toUpperCase(),
    roe:          get(row, roeCol),
    roa:          get(row, roaCol),
    grossMargin:  get(row, grossCol),
    debtEquity:   get(row, debtCol),
    currentRatio: get(row, currentCol),
    assetTurnover:get(row, turnoverCol),
  })).filter((r) => r.ticker);

  const allRoe     = rows.map((r) => r.roe!).filter((v): v is number => v !== null);
  const allRoa     = rows.map((r) => r.roa!).filter((v): v is number => v !== null);
  const allGross   = rows.map((r) => r.grossMargin!).filter((v): v is number => v !== null);
  const allDebt    = rows.map((r) => r.debtEquity!).filter((v): v is number => v !== null);
  const allCurrent = rows.map((r) => r.currentRatio!).filter((v): v is number => v !== null);
  const allTurn    = rows.map((r) => r.assetTurnover!).filter((v): v is number => v !== null);

  return rows.map((r) => {
    const roeScore     = r.roe          !== null ? percentileRank(r.roe,          allRoe,     false) : 50;
    const roaScore     = r.roa          !== null ? percentileRank(r.roa,          allRoa,     false) : 50;
    const grossScore   = r.grossMargin  !== null ? percentileRank(r.grossMargin,  allGross,   false) : 50;
    const debtScore    = r.debtEquity   !== null ? percentileRank(r.debtEquity,   allDebt,    true)  : 50;
    const currentScore = r.currentRatio !== null ? percentileRank(r.currentRatio, allCurrent, false) : 50;
    const turnoverScore= r.assetTurnover!== null ? percentileRank(r.assetTurnover,allTurn,    false) : 50;

    // Category averages
    const profCols  = [r.roe !== null ? roeScore : null, r.roa !== null ? roaScore : null, r.grossMargin !== null ? grossScore : null].filter((v): v is number => v !== null);
    const stabCols  = [r.debtEquity !== null ? debtScore : null, r.currentRatio !== null ? currentScore : null].filter((v): v is number => v !== null);
    const effCols   = [r.assetTurnover !== null ? turnoverScore : null].filter((v): v is number => v !== null);

    const profitability = profCols.length  ? profCols.reduce((s, v) => s + v, 0)  / profCols.length  : 50;
    const stability     = stabCols.length  ? stabCols.reduce((s, v) => s + v, 0)  / stabCols.length  : 50;
    const efficiency    = effCols.length   ? effCols.reduce((s, v) => s + v, 0)   / effCols.length   : 50;

    const allCat    = [profCols, stabCols, effCols].map((c) => c.length ? c.reduce((s, v) => s + v, 0) / c.length : null).filter((v): v is number => v !== null);
    const totalScore = allCat.length ? allCat.reduce((s, v) => s + v, 0) / allCat.length : 50;

    const grade: QualityGrade =
      totalScore >= 70 ? 'Excellent' :
      totalScore >= 55 ? 'Good'      :
      totalScore >= 40 ? 'Average'   :
                         'Weak';

    return {
      ...r,
      roeScore, roaScore, grossScore, debtScore, currentScore, turnoverScore,
      profitability: parseFloat(profitability.toFixed(1)),
      stability:     parseFloat(stability.toFixed(1)),
      efficiency:    parseFloat(efficiency.toFixed(1)),
      totalScore:    parseFloat(totalScore.toFixed(1)),
      grade,
    };
  });
}

// ============================================
// Tooltips
// ============================================

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

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
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

const IntroPage = ({ onLoadExample }: { onLoadExample: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Target className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Fundamental Quality Radar</CardTitle>
        <CardDescription className="text-base mt-2">
          Visualize profitability, stability, and efficiency metrics on a radar chart to assess the qualitative strength of each company
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Target   className="w-6 h-6 text-primary mb-2" />, title: 'Radar Visualization',  desc: 'Three-axis radar chart plots Profitability, Stability, and Efficiency scores — instantly reveal a company\'s quality profile at a glance' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Quality Ranking',      desc: 'Rank all stocks by total quality score from Excellent to Weak — identify which companies have the strongest fundamentals' },
            { icon: <Layers    className="w-6 h-6 text-primary mb-2" />, title: 'Multi-Stock Compare',  desc: 'Overlay up to 3 companies on the same radar to directly compare quality profiles across competitors or candidates' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          {(Object.entries(GRADE_CONFIG) as [QualityGrade, typeof GRADE_CONFIG[QualityGrade]][]).map(([, cfg]) => (
            <div key={cfg.label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{cfg.label}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {cfg.label === 'Excellent' ? 'Score ≥ 70 — top quality'
                : cfg.label === 'Good'     ? 'Score 55–70 — above average'
                : cfg.label === 'Average'  ? 'Score 40–55 — near median'
                :                            'Score < 40 — below peers'}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Quality Radar alongside valuation metrics to avoid value traps.
            A stock cheap on PER but weak on fundamentals may deserve its discount —
            combining value and quality screens produces more robust investment candidates.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>ticker / name</strong> — Stock identifier</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>At least 2 quality metrics</strong> — ROE, ROA, Gross Margin, D/E, Current Ratio, Asset Turnover</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Radar chart per stock (or multi-overlay)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Quality score ranking bar chart</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Profitability / Stability / Efficiency breakdown table</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Target className="mr-2 h-5 w-5" />
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

export default function FundamentalQualityRadarPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {
  const hasData    = data.length > 0;

  const [tickerCol,   setTickerCol]   = useState('');
  const [roeCol,      setRoeCol]      = useState('');
  const [roaCol,      setRoaCol]      = useState('');
  const [grossCol,    setGrossCol]    = useState('');
  const [debtCol,     setDebtCol]     = useState('');
  const [currentCol,  setCurrentCol]  = useState('');
  const [turnoverCol, setTurnoverCol] = useState('');

  // For radar comparison: up to 3 selected tickers
  const [compareList, setCompareList] = useState<string[]>([]);

  const [sortKey,  setSortKey]  = useState<'totalScore' | 'profitability' | 'stability' | 'efficiency' | 'ticker'>('totalScore');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');
  const [gradeFilter, setGradeFilter] = useState<QualityGrade | 'all'>('all');

  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_fundamental_quality.csv');
    // column auto-detect handled by useMemo below
    setTickerCol('ticker');
    setRoeCol('roe');
    setRoaCol('roa');
    setGrossCol('gross_margin');
    setDebtCol('debt_equity');
    setCurrentCol('current_ratio');
    setTurnoverCol('asset_turnover');
    setCompareList([]);
  }, []);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setTickerCol(''); setRoeCol(''); setRoaCol(''); setGrossCol('');
    setDebtCol(''); setCurrentCol(''); setTurnoverCol('');
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
    detect(['ticker', 'symbol', 'name', 'stock'],               setTickerCol,   tickerCol);
    detect(['roe', 'return_on_equity'],                         setRoeCol,      roeCol);
    detect(['roa', 'return_on_assets'],                         setRoaCol,      roaCol);
    detect(['gross_margin', 'gross_profit_margin', 'gm'],       setGrossCol,    grossCol);
    detect(['debt_equity', 'debt_to_equity', 'd/e', 'de'],      setDebtCol,     debtCol);
    detect(['current_ratio', 'current'],                        setCurrentCol,  currentCol);
    detect(['asset_turnover', 'assets_turnover'],               setTurnoverCol, turnoverCol);
  }, [hasData, allHeaders]);


  // ── Build quality scores ───────────────────────────────────
  const scored = useMemo(() => {
    if (!tickerCol) return [];
    return buildQualityScores(data, tickerCol, roeCol, roaCol, grossCol, debtCol, currentCol, turnoverCol);
  }, [data, tickerCol, roeCol, roaCol, grossCol, debtCol, currentCol, turnoverCol]);

  // ── Grade counts ───────────────────────────────────────────
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = { Excellent: 0, Good: 0, Average: 0, Weak: 0 };
    for (const s of scored) counts[s.grade]++;
    return counts;
  }, [scored]);

  // ── Filtered + sorted ──────────────────────────────────────
  const filtered = useMemo(() => {
    const base = gradeFilter === 'all' ? scored : scored.filter((s) => s.grade === gradeFilter);
    return [...base].sort((a, b) => {
      const va = a[sortKey] as any;
      const vb = b[sortKey] as any;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [scored, gradeFilter, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // ── Top 15 for bar chart ───────────────────────────────────
  const top15 = useMemo(() =>
    [...scored].sort((a, b) => b.totalScore - a.totalScore).slice(0, 15).map((s) => ({
      name:  s.ticker,
      score: s.totalScore,
      color: GRADE_CONFIG[s.grade].hex,
    })),
    [scored],
  );

  // ── Radar data for selected comparison stocks ──────────────
  const radarData = useMemo(() => {
    // Build 3 axes × N stocks
    const axes = RADAR_AXES.map(({ key, label }) => {
      const entry: Record<string, any> = { subject: label };
      for (const ticker of compareList) {
        const s = scored.find((r) => r.ticker === ticker);
        entry[ticker] = s ? s[key as keyof StockQuality] : 0;
      }
      return entry;
    });
    return axes;
  }, [compareList, scored]);

  // ── Toggle compare list (max 3) ────────────────────────────
  const toggleCompare = (ticker: string) => {
    setCompareList((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : prev.length < 3 ? [...prev, ticker] : prev,
    );
  };

  const bestStock  = scored.length > 0 ? [...scored].sort((a, b) => b.totalScore - a.totalScore)[0] : null;
  const avgScore   = scored.length > 0 ? scored.reduce((s, r) => s + r.totalScore, 0) / scored.length : 50;

  const isConfigured = !!(tickerCol && scored.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!scored.length) return;
    const csv = Papa.unparse(scored.map((s) => ({
      ticker:        s.ticker,
      total_score:   s.totalScore,
      grade:         s.grade,
      profitability: s.profitability,
      stability:     s.stability,
      efficiency:    s.efficiency,
      roe:           s.roe ?? '',
      roa:           s.roa ?? '',
      gross_margin:  s.grossMargin ?? '',
      debt_equity:   s.debtEquity ?? '',
      current_ratio: s.currentRatio ?? '',
      asset_turnover:s.assetTurnover ?? '',
    })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `FundamentalQuality_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `FundamentalQuality_${new Date().toISOString().split('T')[0]}.png`;
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 2</span>
            <span className="text-xs text-muted-foreground">Valuation</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Fundamental Quality Radar
          </CardTitle>
          <CardDescription>
            Visualize profitability, stability, and efficiency metrics on a radar chart to assess the qualitative strength of each company.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map your columns. Ticker required; add at least 2 quality metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { label: 'TICKER *',       value: tickerCol,   setter: setTickerCol,   headers: allHeaders,     opt: false },
              { label: 'ROE (%)',        value: roeCol,      setter: setRoeCol,      headers: numericHeaders, opt: true  },
              { label: 'ROA (%)',        value: roaCol,      setter: setRoaCol,      headers: numericHeaders, opt: true  },
              { label: 'GROSS MARGIN (%)',value: grossCol,   setter: setGrossCol,    headers: numericHeaders, opt: true  },
              { label: 'DEBT / EQUITY',  value: debtCol,     setter: setDebtCol,     headers: numericHeaders, opt: true  },
              { label: 'CURRENT RATIO',  value: currentCol,  setter: setCurrentCol,  headers: numericHeaders, opt: true  },
              { label: 'ASSET TURNOVER', value: turnoverCol, setter: setTurnoverCol, headers: numericHeaders, opt: true  },
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Highest Quality</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">{bestStock.ticker}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Score {bestStock.totalScore} · {bestStock.grade}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Universe Avg</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{avgScore.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{scored.length} stocks scored</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Excellent + Good</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">
              {gradeCounts['Excellent'] + gradeCounts['Good']}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {scored.length > 0 ? `${(((gradeCounts['Excellent'] + gradeCounts['Good']) / scored.length) * 100).toFixed(0)}% of universe` : ''}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Weak Quality</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{gradeCounts['Weak']}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Score below 40</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Quality Score Ranking Bar ── */}
        {isConfigured && top15.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 15 by Quality Score</CardTitle>
              <CardDescription>Composite of Profitability, Stability, and Efficiency — percentile-ranked vs peers</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, top15.length * 34)}>
                <BarChart data={top15} layout="vertical"
                  margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine x={50} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1}
                    label={{ value: 'Avg (50)', position: 'top', fontSize: 9, fill: '#94A3B8' }} />
                  <Bar dataKey="score" name="Quality Score" radius={[0, 3, 3, 0]} maxBarSize={22}>
                    {top15.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-3 justify-end">
                {(Object.entries(GRADE_CONFIG) as [QualityGrade, typeof GRADE_CONFIG[QualityGrade]][]).map(([, cfg]) => (
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
                  <CardTitle className="text-base">Radar Comparison</CardTitle>
                  <CardDescription>Select up to 3 stocks to compare on the radar chart</CardDescription>
                </div>
                {compareList.length > 0 && (
                  <button className="text-xs text-muted-foreground hover:text-slate-700 underline"
                    onClick={() => setCompareList([])}>Clear</button>
                )}
              </div>
              {/* Ticker pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {scored.map((s) => {
                  const active = compareList.includes(s.ticker);
                  const disabled = !active && compareList.length >= 3;
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
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData} margin={{ top: 16, right: 40, bottom: 16, left: 40 }}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <Tooltip content={<RadarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {compareList.map((ticker, i) => (
                      <Radar key={ticker} name={ticker} dataKey={ticker}
                        stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15}
                        strokeWidth={2} dot />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Full Table ── */}
        {isConfigured && filtered.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    All Stocks — Quality Ranking
                  </CardTitle>
                  <CardDescription>{filtered.length} stocks · click headers to sort</CardDescription>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'Excellent', 'Good', 'Average', 'Weak'] as const).map((g) => (
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
                        { key: 'ticker',        label: 'Ticker',         align: 'left'  },
                        { key: 'totalScore',    label: 'Total Score',    align: 'right' },
                        { key: null,            label: 'Grade',          align: 'left'  },
                        { key: 'profitability', label: 'Profitability',  align: 'right' },
                        { key: 'stability',     label: 'Stability',      align: 'right' },
                        { key: 'efficiency',    label: 'Efficiency',     align: 'right' },
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
                          <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500">{s.profitability.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500">{s.stability.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500">{s.efficiency.toFixed(1)}</td>
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
          const excellent    = scored.filter((s) => s.grade === 'Excellent');
          const weak         = scored.filter((s) => s.grade === 'Weak');
          const worstStock   = [...scored].sort((a, b) => a.totalScore - b.totalScore)[0];
          const topProfit    = [...scored].sort((a, b) => b.profitability - a.profitability)[0];
          const topStability = [...scored].sort((a, b) => b.stability - a.stability)[0];
          const topEfficiency= [...scored].sort((a, b) => b.efficiency - a.efficiency)[0];

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated fundamental quality analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Quality Universe Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Scored <span className="font-semibold">{scored.length}</span> stocks across up to 6 fundamental metrics.
                    Universe average quality score is <span className="font-mono font-semibold">{avgScore.toFixed(1)}</span>.{' '}
                    <span className="font-semibold">{excellent.length}</span> stocks qualify as Excellent quality
                    and <span className="font-semibold">{gradeCounts['Good']}</span> as Good.{' '}
                    <span className="font-semibold">{weak.length}</span> stocks are classified as Weak quality.
                  </p>
                </div>

                {/* Metric tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(gradeCounts) as [string, number][]).map(([grade, count]) => {
                    const cfg = GRADE_CONFIG[grade as QualityGrade];
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Highest Quality — {bestStock.ticker}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold">{bestStock.ticker}</span> ranks first with a total quality score of{' '}
                        <span className="font-mono font-semibold">{bestStock.totalScore.toFixed(1)}</span> — Profitability{' '}
                        <span className="font-mono">{bestStock.profitability.toFixed(1)}</span>,
                        Stability <span className="font-mono">{bestStock.stability.toFixed(1)}</span>,
                        Efficiency <span className="font-mono">{bestStock.efficiency.toFixed(1)}</span>.
                        This company demonstrates superior fundamentals across multiple dimensions relative to its peers.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Category Leaders</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Best Profitability: <span className="font-semibold">{topProfit.ticker}</span> ({topProfit.profitability.toFixed(1)}) ·{' '}
                        Best Stability: <span className="font-semibold">{topStability.ticker}</span> ({topStability.stability.toFixed(1)}) ·{' '}
                        Best Efficiency: <span className="font-semibold">{topEfficiency.ticker}</span> ({topEfficiency.efficiency.toFixed(1)}).
                        These leaders are prime candidates for further analysis in their respective quality dimensions.
                      </p>
                    </div>
                  </div>

                  {excellent.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Excellent Quality Stocks ({excellent.length})</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {excellent.slice(0, 5).map((s) => s.ticker).join(', ')}
                          {excellent.length > 5 ? ` and ${excellent.length - 5} more` : ''}{' '}
                          score above 70 across Profitability, Stability, and Efficiency.
                          These companies represent high-quality candidates — when combined with favorable valuation (Composite Value Score), they form the strongest investment case.
                        </p>
                      </div>
                    </div>
                  )}

                  {weak.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Weak Quality Stocks ({weak.length})</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {weak.map((s) => s.ticker).join(', ')} score below 40.
                          Low quality scores often indicate structural profitability challenges, high leverage, or operational inefficiency.
                          Cheap valuation multiples on these names may represent value traps rather than genuine opportunities.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Quality scores are percentile-ranked within the uploaded universe — scores are relative, not absolute.
                  Profitability = avg of ROE, ROA, Gross Margin ranks. Stability = avg of D/E (inverted) and Current Ratio ranks.
                  Efficiency = Asset Turnover rank. Missing metrics are excluded from the relevant category average.
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
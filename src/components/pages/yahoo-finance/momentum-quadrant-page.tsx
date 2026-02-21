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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  BarChart,
  Bar,
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
  ArrowUpDown,
  Compass,
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

type Quadrant = 'Leading' | 'Improving' | 'Lagging' | 'Weakening';

interface StockMomentum {
  ticker:    string;
  shortMom:  number;   // short-term momentum (x-axis)
  longMom:   number;   // long-term momentum (y-axis)
  quadrant:  Quadrant;
  rs:        number;   // relative strength vs avg
}

// ============================================
// Constants
// ============================================

const QUADRANT_CONFIG: Record<Quadrant, { label: string; hex: string; desc: string; x: string; y: string }> = {
  'Leading':   { label: 'Leading',   hex: '#6C3AED', desc: 'Strong short & long momentum',    x: '+', y: '+' },
  'Improving': { label: 'Improving', hex: '#10B981', desc: 'Weak short but strong long trend', x: '−', y: '+' },
  'Weakening': { label: 'Weakening', hex: '#F59E0B', desc: 'Strong short but fading long',     x: '+', y: '−' },
  'Lagging':   { label: 'Lagging',   hex: '#94A3B8', desc: 'Weak short & long momentum',       x: '−', y: '−' },
};

const EXAMPLE_TICKERS = [
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','NFLX',
  'JPM','BAC','GS','WFC',
  'XOM','CVX','BP','SLB',
  'JNJ','PFE','MRK','UNH',
  'PG','KO','WMT','HD',
];

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  // Assign each ticker a realistic momentum profile
  const profiles: Record<string, { short: number; long: number }> = {
    NVDA:  { short:  28,  long:  95  },
    META:  { short:  18,  long:  62  },
    MSFT:  { short:  12,  long:  42  },
    AAPL:  { short:   8,  long:  28  },
    GOOGL: { short:  14,  long:  35  },
    AMZN:  { short:   6,  long:  22  },
    TSLA:  { short:  22,  long: -18  },
    NFLX:  { short:  16,  long:  18  },
    HD:    { short:  -4,  long:  25  },
    UNH:   { short:  -8,  long:  18  },
    JNJ:   { short:  -6,  long:   8  },
    PG:    { short:  -3,  long:  12  },
    KO:    { short:  -5,  long:   6  },
    WMT:   { short:   2,  long:  30  },
    JPM:   { short:  10,  long:  20  },
    GS:    { short:   8,  long:  15  },
    BAC:   { short:  -2,  long:  -5  },
    WFC:   { short:  -4,  long:  -8  },
    XOM:   { short:  -8,  long: -12  },
    CVX:   { short: -10,  long: -15  },
    BP:    { short: -14,  long: -22  },
    SLB:   { short:  -6,  long:  -9  },
    PFE:   { short: -12,  long: -28  },
    MRK:   { short:  -4,  long: -10  },
  };

  return EXAMPLE_TICKERS.map((ticker) => {
    const p = profiles[ticker] ?? { short: 0, long: 0 };
    const noise = (v: number) => parseFloat((v + (Math.random() - 0.5) * 4).toFixed(2));
    return {
      ticker,
      short_momentum: noise(p.short),
      long_momentum:  noise(p.long),
    };
  });
}

// ============================================
// Helpers
// ============================================

function assignQuadrant(short: number, long: number): Quadrant {
  if (short >= 0 && long >= 0) return 'Leading';
  if (short <  0 && long >= 0) return 'Improving';
  if (short >= 0 && long <  0) return 'Weakening';
  return 'Lagging';
}

// ============================================
// Custom Scatter Dot with ticker label
// ============================================

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const cfg = QUADRANT_CONFIG[payload.quadrant as Quadrant];
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={cfg.hex} fillOpacity={0.75} stroke={cfg.hex} strokeWidth={1} />
      <text x={cx + 9} y={cy + 4} fontSize={9} fill="#64748B" fontFamily="monospace" fontWeight={600}>
        {payload.ticker}
      </text>
    </g>
  );
};

// ============================================
// Tooltips
// ============================================

const ScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as StockMomentum;
  if (!d) return null;
  const cfg = QUADRANT_CONFIG[d.quadrant];
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
        <p className="font-semibold text-slate-700">{d.ticker}</p>
        <span className="text-muted-foreground">— {d.quadrant}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Short Momentum</span>
        <span className="font-mono">{d.shortMom >= 0 ? '+' : ''}{d.shortMom.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Long Momentum</span>
        <span className="font-mono">{d.longMom >= 0 ? '+' : ''}{d.longMom.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Rel. Strength</span>
        <span className="font-mono">{d.rs >= 0 ? '+' : ''}{d.rs.toFixed(2)}%</span>
      </div>
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
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? `${p.value >= 0 ? '+' : ''}${p.value.toFixed(2)}%` : p.value}
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
            <Compass className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Momentum Quadrant</CardTitle>
        <CardDescription className="text-base mt-2">
          Combine short-term and long-term momentum to map each stock into one of four trend quadrants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Compass    className="w-6 h-6 text-primary mb-2" />, title: 'Quadrant Scatter',  desc: 'Plot all stocks on a 2D map — short momentum on X, long momentum on Y. Instantly see who is leading or lagging relative to the universe average.' },
            { icon: <BarChart3  className="w-6 h-6 text-primary mb-2" />, title: 'Momentum Ranking', desc: 'Rank stocks by composite momentum score within each quadrant — identify the strongest trend names and surface high-conviction candidates.' },
            { icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />, title: 'Relative Strength', desc: "Compare each stock's momentum against the equal-weighted universe average to gauge relative trend leadership across the full peer group." },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Quadrant legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(QUADRANT_CONFIG) as [Quadrant, typeof QUADRANT_CONFIG[Quadrant]][]).map(([, cfg]) => (
            <div key={cfg.label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{cfg.label}</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Short {cfg.x} · Long {cfg.y}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Momentum Quadrant to build a trend-following watchlist. Stocks in the Leading quadrant have
            both near-term and long-term wind at their backs. Improving stocks are early rotation candidates —
            their long-term trend is intact but short-term has dipped, creating a potential entry point.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>ticker / name</strong> — Stock identifier</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>short momentum</strong> — e.g. 1M return (%)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>long momentum</strong> — e.g. 6M or 12M return (%)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Quadrant scatter plot with ticker labels and crosshair</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Per-quadrant stock count + composite momentum ranking</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Relative strength bar chart + auto-generated insights</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Compass className="mr-2 h-5 w-5" />
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

export default function MomentumQuadrantPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {
  const hasData    = data.length > 0;

  const [tickerCol, setTickerCol] = useState('');
  const [shortCol,  setShortCol]  = useState('');
  const [longCol,   setLongCol]   = useState('');

  const [quadrantFilter, setQuadrantFilter] = useState<Quadrant | 'all'>('all');
  const [sortKey,  setSortKey]  = useState<'composite' | 'shortMom' | 'longMom' | 'ticker'>('composite');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');

  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_momentum_quadrant.csv');
    // column auto-detect handled by useMemo below
    setTickerCol('ticker');
    setShortCol('short_momentum');
    setLongCol('long_momentum');
  }, []);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setTickerCol(''); setShortCol(''); setLongCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map((s) => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex((c) => kws.some((k) => c === k));
      if (idx === -1) idx = h.findIndex((c) => kws.some((k) => k.length > 3 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['ticker', 'symbol', 'name', 'stock'],                    setTickerCol, tickerCol);
    detect(['short_momentum', 'short_mom', 'mom_1m', '1m_return'],   setShortCol,  shortCol);
    detect(['long_momentum',  'long_mom',  'mom_6m', '6m_return',
            'mom_12m', '12m_return'],                                 setLongCol,   longCol);
  }, [hasData, allHeaders]);


  // ── Build momentum rows ────────────────────────────────────
  const scored: StockMomentum[] = useMemo(() => {
    if (!tickerCol || !shortCol || !longCol) return [];
    const rows = data.map((row) => ({
      ticker:   String(row[tickerCol] ?? '').trim().toUpperCase(),
      shortMom: Number(row[shortCol]) || 0,
      longMom:  Number(row[longCol])  || 0,
    })).filter((r) => r.ticker);

    const avgShort = rows.reduce((s, r) => s + r.shortMom, 0) / rows.length;
    const avgLong  = rows.reduce((s, r) => s + r.longMom,  0) / rows.length;

    return rows.map((r) => {
      const quadrant = assignQuadrant(r.shortMom - avgShort, r.longMom - avgLong);
      const rs = ((r.shortMom + r.longMom) / 2) - ((avgShort + avgLong) / 2);
      return {
        ...r,
        quadrant,
        rs: parseFloat(rs.toFixed(2)),
      };
    });
  }, [data, tickerCol, shortCol, longCol]);

  // ── Quadrant counts ────────────────────────────────────────
  const quadrantCounts = useMemo(() => {
    const counts: Record<Quadrant, number> = { Leading: 0, Improving: 0, Weakening: 0, Lagging: 0 };
    for (const s of scored) counts[s.quadrant]++;
    return counts;
  }, [scored]);

  // ── Scatter data: one array per quadrant for coloring ──────
  const scatterByQuadrant = useMemo(() =>
    (Object.keys(QUADRANT_CONFIG) as Quadrant[]).map((q) => ({
      quadrant: q,
      data: scored.filter((s) => s.quadrant === q),
      color: QUADRANT_CONFIG[q].hex,
    })),
    [scored],
  );

  // ── Axis domains ───────────────────────────────────────────
  const axisExtent = useMemo(() => {
    if (!scored.length) return { xMin: -30, xMax: 30, yMin: -30, yMax: 30 };
    const shorts = scored.map((s) => s.shortMom);
    const longs  = scored.map((s) => s.longMom);
    const pad = (arr: number[]) => {
      const range = Math.max(...arr) - Math.min(...arr);
      const p = range * 0.15;
      return { min: Math.min(...arr) - p, max: Math.max(...arr) + p };
    };
    return { ...pad(shorts), ...{ xMin: pad(shorts).min, xMax: pad(shorts).max, yMin: pad(longs).min, yMax: pad(longs).max } };
  }, [scored]);

  // ── Filtered + sorted table ────────────────────────────────
  const filtered = useMemo(() => {
    const base = quadrantFilter === 'all' ? scored : scored.filter((s) => s.quadrant === quadrantFilter);
    return [...base].sort((a, b) => {
      const key = sortKey === 'composite' ? 'rs' : sortKey;
      const va = (a as any)[key];
      const vb = (b as any)[key];
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [scored, quadrantFilter, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir(key === 'ticker' ? 'asc' : 'desc'); }
  };

  // ── Top 15 RS bar ──────────────────────────────────────────
  const top15 = useMemo(() =>
    [...scored].sort((a, b) => b.rs - a.rs).slice(0, 15).map((s) => ({
      name:  s.ticker,
      rs:    s.rs,
      color: QUADRANT_CONFIG[s.quadrant].hex,
    })),
    [scored],
  );

  const bestStock  = scored.length > 0 ? [...scored].sort((a, b) => b.rs - a.rs)[0] : null;
  const worstStock = scored.length > 0 ? [...scored].sort((a, b) => a.rs - b.rs)[0] : null;
  const leading    = scored.filter((s) => s.quadrant === 'Leading');
  const improving  = scored.filter((s) => s.quadrant === 'Improving');

  const isConfigured = !!(tickerCol && shortCol && longCol && scored.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!scored.length) return;
    const csv = Papa.unparse(scored.map((s) => ({
      ticker:          s.ticker,
      quadrant:        s.quadrant,
      short_momentum:  s.shortMom,
      long_momentum:   s.longMom,
      relative_strength: s.rs,
    })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `MomentumQuadrant_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `MomentumQuadrant_${new Date().toISOString().split('T')[0]}.png`;
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 3</span>
            <span className="text-xs text-muted-foreground">Momentum</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Momentum Quadrant
          </CardTitle>
          <CardDescription>
            Combine short-term and long-term momentum to map each stock into one of four trend quadrants — Leading, Improving, Weakening, or Lagging.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Select ticker, short-term momentum (e.g. 1M return), and long-term momentum (e.g. 6M or 12M return).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'TICKER *',          value: tickerCol, setter: setTickerCol, headers: allHeaders,     opt: false },
              { label: 'SHORT MOMENTUM *',  value: shortCol,  setter: setShortCol,  headers: numericHeaders, opt: false },
              { label: 'LONG MOMENTUM *',   value: longCol,   setter: setLongCol,   headers: numericHeaders, opt: false },
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
      {isConfigured && bestStock && worstStock && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(QUADRANT_CONFIG) as Quadrant[]).map((q) => {
            const cfg = QUADRANT_CONFIG[q];
            return (
              <div key={q} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cfg.label}</div>
                </div>
                <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{quadrantCounts[q]}</div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {scored.length > 0 ? `${((quadrantCounts[q] / scored.length) * 100).toFixed(0)}% of universe` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Quadrant Scatter Plot ── */}
        {isConfigured && scored.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Momentum Quadrant Map</CardTitle>
              <CardDescription>
                X-axis: short-term momentum · Y-axis: long-term momentum · Origin = universe average
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Quadrant labels */}
              <div className="grid grid-cols-2 gap-1 mb-2 max-w-sm ml-auto">
                {(Object.entries(QUADRANT_CONFIG) as [Quadrant, typeof QUADRANT_CONFIG[Quadrant]][]).map(([q, cfg]) => (
                  <div key={q} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                    <span className="font-semibold">{cfg.label}</span>
                    <span className="text-slate-400">({cfg.x}/{cfg.y})</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 16, right: 40, bottom: 24, left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    type="number" dataKey="shortMom" name="Short Momentum"
                    domain={[axisExtent.xMin, axisExtent.xMax]}
                    tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                    label={{ value: `Short Momentum (${shortCol})`, position: 'insideBottom', offset: -12, fontSize: 10, fill: '#94A3B8' }}
                  />
                  <YAxis
                    type="number" dataKey="longMom" name="Long Momentum"
                    domain={[axisExtent.yMin, axisExtent.yMax]}
                    tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`} width={44}
                    label={{ value: `Long Momentum (${longCol})`, angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#94A3B8' }}
                  />
                  <ZAxis range={[40, 40]} />
                  <Tooltip content={<ScatterTooltip />} />
                  {/* Universe average crosshairs */}
                  <ReferenceLine
                    x={scored.reduce((s, r) => s + r.shortMom, 0) / scored.length}
                    stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="5 4"
                  />
                  <ReferenceLine
                    y={scored.reduce((s, r) => s + r.longMom, 0) / scored.length}
                    stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="5 4"
                  />
                  {scatterByQuadrant.map(({ quadrant, data: qData, color }) => (
                    <Scatter
                      key={quadrant}
                      name={quadrant}
                      data={qData}
                      fill={color}
                      shape={<CustomDot />}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Top 15 Relative Strength Bar ── */}
        {isConfigured && top15.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 15 by Relative Strength</CardTitle>
              <CardDescription>Average of short and long momentum minus universe mean — composite trend leadership</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, top15.length * 34)}>
                <BarChart data={top15} layout="vertical"
                  margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="rs" name="Rel. Strength" radius={[0, 3, 3, 0]} maxBarSize={22}>
                    {top15.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
                    All Stocks — Momentum Ranking
                  </CardTitle>
                  <CardDescription>{filtered.length} stocks · click headers to sort</CardDescription>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'Leading', 'Improving', 'Weakening', 'Lagging'] as const).map((q) => (
                    <button key={q} onClick={() => setQuadrantFilter(q)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all
                        ${quadrantFilter === q
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {q === 'all' ? 'All' : q}
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
                        { key: 'ticker',    label: 'Ticker',         align: 'left'  },
                        { key: null,        label: 'Quadrant',       align: 'left'  },
                        { key: 'shortMom',  label: 'Short Momentum', align: 'right' },
                        { key: 'longMom',   label: 'Long Momentum',  align: 'right' },
                        { key: 'composite', label: 'Rel. Strength',  align: 'right' },
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
                      const cfg = QUADRANT_CONFIG[s.quadrant];
                      return (
                        <tr key={s.ticker} className="border-t hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">{s.ticker}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                              <span className="text-xs font-semibold text-slate-600">{s.quadrant}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">
                            <span className={s.shortMom >= 0 ? 'text-primary' : 'text-slate-500'}>
                              {s.shortMom >= 0 ? '+' : ''}{s.shortMom.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">
                            <span className={s.longMom >= 0 ? 'text-primary' : 'text-slate-500'}>
                              {s.longMom >= 0 ? '+' : ''}{s.longMom.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">
                            <span className={s.rs >= 0 ? 'text-primary' : 'text-slate-500'}>
                              {s.rs >= 0 ? '+' : ''}{s.rs.toFixed(2)}%
                            </span>
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
        {isConfigured && bestStock && worstStock && (() => {
          const spread = bestStock.rs - worstStock.rs;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated momentum quadrant analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Momentum Universe Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Mapped <span className="font-semibold">{scored.length}</span> stocks across four trend quadrants.{' '}
                    <span className="font-semibold">{quadrantCounts['Leading']}</span> are Leading (strong short + long),{' '}
                    <span className="font-semibold">{quadrantCounts['Improving']}</span> Improving,{' '}
                    <span className="font-semibold">{quadrantCounts['Weakening']}</span> Weakening,
                    and <span className="font-semibold">{quadrantCounts['Lagging']}</span> Lagging.
                    The strongest relative strength is <span className="font-mono font-semibold">{bestStock.ticker}</span> (+{bestStock.rs.toFixed(2)}%).
                  </p>
                </div>

                {/* Metric tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.keys(QUADRANT_CONFIG) as Quadrant[]).map((q) => {
                    const cfg = QUADRANT_CONFIG[q];
                    const pct = scored.length > 0 ? ((quadrantCounts[q] / scored.length) * 100).toFixed(0) : '0';
                    return (
                      <div key={q} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{q}</div>
                        </div>
                        <div className="text-lg font-bold font-mono text-slate-700">{quadrantCounts[q]}</div>
                        <div className="text-xs text-muted-foreground">{pct}% of universe</div>
                      </div>
                    );
                  })}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  {leading.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Leading Quadrant — {leading.length} stocks</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {leading.sort((a, b) => b.rs - a.rs).slice(0, 5).map((s) => s.ticker).join(', ')}
                          {leading.length > 5 ? ` and ${leading.length - 5} more` : ''}{' '}
                          show positive momentum on both short and long timeframes.
                          These stocks have the wind at their backs — trend-following strategies favor overweighting this quadrant,
                          particularly the names with the highest relative strength.
                        </p>
                      </div>
                    </div>
                  )}

                  {improving.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Improving Quadrant — Rotation Candidates</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {improving.sort((a, b) => b.rs - a.rs).slice(0, 4).map((s) => s.ticker).join(', ')}{' '}
                          have a positive long-term trend but have pulled back short-term.
                          These are early rotation candidates — if short-term momentum recovers, they may re-enter the Leading quadrant.
                          They can represent attractive risk/reward for mean-reversion or anticipatory positioning.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Strongest Momentum — {bestStock.ticker}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold">{bestStock.ticker}</span> leads the universe with a relative strength of{' '}
                        <span className="font-mono font-semibold">+{bestStock.rs.toFixed(2)}%</span>.
                        Short momentum: <span className="font-mono">{bestStock.shortMom >= 0 ? '+' : ''}{bestStock.shortMom.toFixed(2)}%</span>{' '}
                        · Long momentum: <span className="font-mono">{bestStock.longMom >= 0 ? '+' : ''}{bestStock.longMom.toFixed(2)}%</span>.
                        This stock is the highest-conviction trend leader in the current universe.
                      </p>
                    </div>
                  </div>

                  {spread > 30 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Wide Momentum Dispersion</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The relative strength spread between the best and worst stock is{' '}
                          <span className="font-mono font-semibold">{spread.toFixed(1)}%</span>.
                          Wide dispersion favors momentum strategies — the signal-to-noise ratio for trend following is elevated,
                          and long/short momentum portfolios should generate meaningful alpha in this environment.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Quadrant assignment uses each stock's momentum relative to the universe equal-weighted average.
                  Relative strength is the average of short and long momentum minus the universe mean.
                  Quadrant positions can shift significantly from period to period — treat as a snapshot, not a permanent classification.
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
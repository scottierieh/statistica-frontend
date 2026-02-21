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
  ScatterChart,
  Scatter,
  Bar,
  Line,
  XAxis,
  YAxis,
  ZAxis,
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
  GitMerge,
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

type QuadrantLabel =
  | 'Up + High Vol'    // price up, volume above average  → confirmed uptrend
  | 'Up + Low Vol'     // price up, volume below average  → weak rally
  | 'Down + High Vol'  // price down, volume above average → confirmed downtrend
  | 'Down + Low Vol';  // price down, volume below average → weak pullback

interface DailyRow {
  date:        string;
  price:       number;
  priceChg:    number;   // % daily price change
  volume:      number;
  volChg:      number;   // % daily volume change vs previous
  volZScore:   number;   // (vol - mean) / sd over window
  rollingCorr: number | null; // rolling N-day pearson corr of priceChg vs volChg
  quadrant:    QuadrantLabel;
  isHighVol:   boolean;  // volume > avgVol
}

interface RollingCorrRow {
  date: string;
  corr: number | null;
}

// ============================================
// Constants
// ============================================

const DEFAULT_WINDOW     = 20;   // rolling correlation window

const COLOR_UP_HIGH      = '#10B981';  // green   — up + high vol
const COLOR_UP_LOW       = '#6EE7B7';  // light green — up + low vol
const COLOR_DOWN_HIGH    = '#EF4444';  // red     — down + high vol
const COLOR_DOWN_LOW     = '#FCA5A5';  // light red   — down + low vol
const PRICE_COLOR        = '#1E293B';
const CORR_COLOR         = '#6C3AED';  // violet — correlation line
const VOL_COLOR          = '#CBD5E1';  // slate  — volume bars

const QUADRANT_CONFIG: Record<QuadrantLabel, { color: string; desc: string }> = {
  'Up + High Vol':   { color: COLOR_UP_HIGH,   desc: 'Confirmed uptrend — price rising with conviction' },
  'Up + Low Vol':    { color: COLOR_UP_LOW,     desc: 'Weak rally — rising price but drying volume' },
  'Down + High Vol': { color: COLOR_DOWN_HIGH,  desc: 'Confirmed downtrend — price falling with conviction' },
  'Down + Low Vol':  { color: COLOR_DOWN_LOW,   desc: 'Weak pullback — declining price, volume lacks follow-through' },
};

// ============================================
// Computation helpers
// ============================================

function pearsonCorr(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? null : parseFloat((num / denom).toFixed(4));
}

function buildDailyRows(
  data:      Record<string, any>[],
  dateCol:   string,
  priceCol:  string,
  volumeCol: string,
  window:    number,
): DailyRow[] {
  // Parse
  const raw = data
    .map(r => ({
      date:   String(r[dateCol] ?? ''),
      price:  parseFloat(r[priceCol]),
      volume: parseFloat(r[volumeCol]),
    }))
    .filter(r => r.date && isFinite(r.price) && isFinite(r.volume) && r.volume > 0);

  if (raw.length < 2) return [];

  // Global volume stats for z-score
  const vols   = raw.map(r => r.volume);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
  const sdVol  = Math.sqrt(vols.reduce((s, v) => s + (v - avgVol) ** 2, 0) / vols.length) || 1;

  // Build rows with daily changes
  const rows: DailyRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1];
    const curr = raw[i];
    const priceChg = ((curr.price - prev.price) / prev.price) * 100;
    const volChg   = ((curr.volume - prev.volume) / prev.volume) * 100;
    const volZ     = (curr.volume - avgVol) / sdVol;
    const isHighVol = curr.volume >= avgVol;
    const up       = priceChg >= 0;
    const quadrant: QuadrantLabel = up
      ? (isHighVol ? 'Up + High Vol'   : 'Up + Low Vol')
      : (isHighVol ? 'Down + High Vol' : 'Down + Low Vol');

    rows.push({
      date:        curr.date,
      price:       curr.price,
      priceChg:    parseFloat(priceChg.toFixed(4)),
      volume:      curr.volume,
      volChg:      parseFloat(volChg.toFixed(4)),
      volZScore:   parseFloat(volZ.toFixed(3)),
      rollingCorr: null,
      quadrant,
      isHighVol,
    });
  }

  // Compute rolling Pearson correlation of priceChg vs volChg
  for (let i = 0; i < rows.length; i++) {
    if (i < window - 1) { rows[i].rollingCorr = null; continue; }
    const slice  = rows.slice(i - window + 1, i + 1);
    const pChgs  = slice.map(r => r.priceChg);
    const vChgs  = slice.map(r => r.volChg);
    rows[i].rollingCorr = pearsonCorr(pChgs, vChgs);
  }

  return rows;
}

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2023-01-02');
  let price  = 200;
  let volume = 60_000_000;

  const phases = [
    { days: 60,  drift:  0.0012, vol: 0.012, volMult: 1.2  },
    { days: 40,  drift: -0.0020, vol: 0.019, volMult: 1.4  },
    { days: 75,  drift:  0.0018, vol: 0.011, volMult: 0.85 },
    { days: 45,  drift: -0.0014, vol: 0.016, volMult: 0.9  },
    { days: 90,  drift:  0.0022, vol: 0.010, volMult: 1.3  },
    { days: 50,  drift:  0.0005, vol: 0.009, volMult: 0.7  },
    { days: 50,  drift: -0.0018, vol: 0.020, volMult: 1.5  },
    { days: 60,  drift:  0.0015, vol: 0.012, volMult: 1.1  },
  ];

  let day = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) { day++; i--; continue; }
      const ret = phase.drift + (Math.random() - 0.5) * phase.vol;
      price  = Math.max(80, price * (1 + ret));
      // Volume correlated with price move magnitude * phase multiplier
      const volNoise = 0.85 + Math.random() * 0.30;
      volume = Math.max(5_000_000,
        volume * volNoise * phase.volMult * (1 + Math.abs(ret) * 3));
      volume = Math.min(volume, 200_000_000); // cap
      rows.push({
        date:   d.toISOString().split('T')[0],
        close:  parseFloat(price.toFixed(2)),
        volume: Math.round(volume),
      });
      day++;
    }
  }
  return rows;
}

// ============================================
// Custom Tooltips
// ============================================

const DualTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color ?? p.stroke ?? p.fill }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-mono font-semibold">
              {typeof p.value === 'number'
                ? p.name?.includes('Vol') && Math.abs(p.value) > 1000
                  ? `${(p.value / 1_000_000).toFixed(1)}M`
                  : p.value.toFixed(2)
                : p.value}
            </span>
          </div>
        ))}
    </div>
  );
};

const ScatterDotTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DailyRow;
  if (!d) return null;
  const cfg = QUADRANT_CONFIG[d.quadrant];
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{d.date}</p>
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-slate-500">Price Δ</span>
        <span className={`font-mono font-semibold ${d.priceChg >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {d.priceChg >= 0 ? '+' : ''}{d.priceChg.toFixed(2)}%
        </span>
      </div>
      <div className="flex justify-between gap-4 mb-1">
        <span className="text-slate-500">Vol Z-score</span>
        <span className={`font-mono font-semibold ${d.volZScore >= 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
          {d.volZScore >= 0 ? '+' : ''}{d.volZScore.toFixed(2)}σ
        </span>
      </div>
      <div className="text-xs font-bold" style={{ color: cfg.color }}>{d.quadrant}</div>
    </div>
  );
};

const CorrTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload.find((p: any) => p.dataKey === 'rollingCorr')?.value as number | null;
  if (v === null || v === undefined) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Rolling Corr</span>
        <span className={`font-mono font-bold ${v > 0.3 ? 'text-emerald-600' : v < -0.3 ? 'text-red-500' : 'text-slate-500'}`}>
          {v >= 0 ? '+' : ''}{v.toFixed(3)}
        </span>
      </div>
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
            <GitMerge className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Price–Volume Correlation</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze the relationship between price changes and volume changes to assess trend conviction and detect divergences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <GitMerge  className="w-6 h-6 text-primary mb-2" />,
              title: 'Rolling Correlation',
              desc:  'Rolling N-day Pearson correlation between daily price % change and daily volume % change — tracks whether volume is confirming or diverging from price moves.',
            },
            {
              icon: <Activity  className="w-6 h-6 text-primary mb-2" />,
              title: 'Quadrant Scatter',
              desc:  'Every trading day plotted by price change (x) vs. volume z-score (y) — four quadrants reveal whether moves are happening with or against conviction.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Trend Reliability',
              desc:  'Positive correlation = volume confirms trend. Negative = divergence warning. Each day classified into one of four signal quadrants for pattern analysis.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Quadrant legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(QUADRANT_CONFIG) as [QuadrantLabel, typeof QUADRANT_CONFIG[QuadrantLabel]][])
            .map(([label, cfg]) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <div className="text-xs font-bold text-slate-700">{label}</div>
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
            Use Price–Volume Correlation to validate whether a trend is supported by volume conviction.
            A strong uptrend with consistently positive correlation (volume rising with price, falling on dips)
            is highly reliable. When price continues up but the rolling correlation turns negative
            — volume is not confirming — it signals a potential exhaustion. Use it alongside price action
            to separate high-conviction moves from low-quality noise.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                  <span><strong>date</strong> — trading date (YYYY-MM-DD)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                  <span><strong>close / price</strong> — daily closing price</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                  <span><strong>volume</strong> — daily trading volume</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                  <span>Price + volume bar chart with volume z-score overlay</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                  <span>Rolling correlation line chart (price % vs volume %)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                  <span>Quadrant scatter plot + day-count breakdown table</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <GitMerge className="mr-2 h-5 w-5" />
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

export default function PriceVolumeCorrelationPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ─────────────────────────────────────────
  const [dateCol,   setDateCol]   = useState('');
  const [priceCol,  setPriceCol]  = useState('');
  const [volumeCol, setVolumeCol] = useState('');

  // ── Parameters ─────────────────────────────────────────────
  const [corrWindow, setCorrWindow] = useState(DEFAULT_WINDOW);

  // ── Options ────────────────────────────────────────────────
  const [showScatter,  setShowScatter]  = useState(true);
  const [showVolZScore,setShowVolZScore]= useState(true);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_pv_correlation.csv');
    setCorrWindow(DEFAULT_WINDOW);
    setShowScatter(true); setShowVolZScore(true);
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setPriceCol(''); setVolumeCol('');
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
    detect(['date'],                        setDateCol,   dateCol);
    detect(['close', 'price', 'adj_close'], setPriceCol,  priceCol);
    detect(['volume', 'vol'],               setVolumeCol, volumeCol);
  }, [hasData, allHeaders]);

  // ── Build daily rows ───────────────────────────────────────
  const dailyRows = useMemo(() => {
    if (!dateCol || !priceCol || !volumeCol) return [];
    return buildDailyRows(data, dateCol, priceCol, volumeCol, corrWindow);
  }, [data, dateCol, priceCol, volumeCol, corrWindow]);

  // ── Sample for chart performance ───────────────────────────
  const sampledRows = useMemo(() => {
    if (dailyRows.length <= 600) return dailyRows;
    const step = Math.ceil(dailyRows.length / 600);
    return dailyRows.filter((_, i) => i % step === 0);
  }, [dailyRows]);

  // ── Scatter data — only need rows where both values finite ─
  const scatterData = useMemo(
    () => dailyRows.filter(r => isFinite(r.priceChg) && isFinite(r.volZScore)),
    [dailyRows]
  );

  // ── Rolling corr series ────────────────────────────────────
  // corrLine alias prevents duplicate dataKey='rollingCorr' between Bar and Line
  const corrSeries = useMemo(
    () => sampledRows.filter(r => r.rollingCorr !== null).map(r => ({ ...r, corrLine: r.rollingCorr })),
    [sampledRows]
  );

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!dailyRows.length) return null;

    const last    = dailyRows[dailyRows.length - 1];
    const first   = data.find(r => r[dateCol]);
    const firstPrice = first ? parseFloat(first[priceCol]) : NaN;
    const pctChg  = isFinite(firstPrice) && firstPrice > 0
      ? ((last.price - firstPrice) / firstPrice) * 100 : 0;

    const corrVals = dailyRows.map(r => r.rollingCorr).filter((v): v is number => v !== null);
    const avgCorr  = corrVals.length
      ? corrVals.reduce((a, b) => a + b, 0) / corrVals.length : null;
    const lastCorr = last.rollingCorr;

    const qCounts = {
      'Up + High Vol':   dailyRows.filter(r => r.quadrant === 'Up + High Vol').length,
      'Up + Low Vol':    dailyRows.filter(r => r.quadrant === 'Up + Low Vol').length,
      'Down + High Vol': dailyRows.filter(r => r.quadrant === 'Down + High Vol').length,
      'Down + Low Vol':  dailyRows.filter(r => r.quadrant === 'Down + Low Vol').length,
    };

    const totalDays = dailyRows.length;
    const highVolUp   = qCounts['Up + High Vol'];
    const highVolDown = qCounts['Down + High Vol'];
    const conviction  = (highVolUp + highVolDown) / totalDays * 100;

    // Divergence days: last 20 days where price up but volume below avg
    const recentDiv = dailyRows.slice(-corrWindow).filter(
      r => r.priceChg > 0 && !r.isHighVol
    ).length;

    return {
      lastPrice: last.price,
      lastDate:  last.date,
      pctChg,
      lastCorr,
      avgCorr,
      qCounts,
      totalDays,
      conviction,
      recentDiv,
      lastQuadrant: last.quadrant,
    };
  }, [dailyRows, data, dateCol, priceCol, corrWindow]);

  const isConfigured    = !!(dateCol && priceCol && volumeCol && dailyRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!dailyRows.length) return;
    const rows = dailyRows.map(r => ({
      date:          r.date,
      price:         r.price,
      price_chg_pct: r.priceChg,
      volume:        r.volume,
      vol_chg_pct:   r.volChg,
      vol_z_score:   r.volZScore,
      rolling_corr:  r.rollingCorr ?? '',
      quadrant:      r.quadrant,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `PVCorrelation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [dailyRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `PVCorrelation_${new Date().toISOString().split('T')[0]}.png`;
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 7</span>
            <span className="text-xs text-muted-foreground">Technical Timing</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Price–Volume Correlation
          </CardTitle>
          <CardDescription>
            Analyze the relationship between daily price changes and volume changes to assess trend conviction and detect divergences.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map columns and set the rolling correlation window.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Column mapping */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'DATE *',   value: dateCol,   setter: setDateCol,   headers: allHeaders,     opt: false },
              { label: 'PRICE *',  value: priceCol,  setter: setPriceCol,  headers: numericHeaders, opt: false },
              { label: 'VOLUME *', value: volumeCol, setter: setVolumeCol, headers: numericHeaders, opt: false },
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

          {/* Rolling window */}
          <div className="flex flex-wrap gap-6 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">ROLLING WINDOW (DAYS)</Label>
              <input
                type="number" value={corrWindow} min={5} max={252}
                onChange={e => { const n = parseInt(e.target.value); if (isFinite(n) && n >= 5 && n <= 252) setCorrWindow(n); }}
                className="w-24 h-8 text-xs border border-slate-200 rounded px-2 font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="text-xs text-muted-foreground pb-1.5">
              Pearson correlation of daily price % vs volume % over {corrWindow}-day rolling window
            </div>
          </div>

          {/* Display options */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showVolZScore} onChange={e => setShowVolZScore(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Vol Z-Score Overlay</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showScatter} onChange={e => setShowScatter(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Quadrant Scatter Plot</span>
            </label>
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
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Daily Rows)
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Signal</div>
            <div className="flex items-center gap-2 mt-1">
              {stats.lastQuadrant === 'Up + High Vol'
                ? <TrendingUp  className="h-5 w-5 shrink-0" style={{ color: COLOR_UP_HIGH }} />
                : stats.lastQuadrant === 'Down + High Vol'
                ? <TrendingDown className="h-5 w-5 shrink-0" style={{ color: COLOR_DOWN_HIGH }} />
                : <Activity className="h-5 w-5 shrink-0 text-slate-400" />}
              <span className="text-sm font-bold leading-tight"
                style={{ color: QUADRANT_CONFIG[stats.lastQuadrant].color }}>
                {stats.lastQuadrant}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Latest trading day</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rolling Corr ({corrWindow}d)</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.lastCorr !== null
                ? `${stats.lastCorr >= 0 ? '+' : ''}${stats.lastCorr.toFixed(3)}`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.lastCorr === null ? '—'
               : stats.lastCorr > 0.3  ? 'Volume confirming'
               : stats.lastCorr < -0.3 ? 'Divergence warning'
               : 'Weak / neutral signal'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Conviction Days</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.conviction.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              High-vol directional moves
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Divergence</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.recentDiv}d
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Up-price + low-vol (last {corrWindow}d)
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Price + Volume bar chart ── */}
        {isConfigured && sampledRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price & Volume</CardTitle>
              <CardDescription>
                Bar color: green = up day, red = down day · Opacity reflects volume magnitude
                {showVolZScore ? ' · Violet line = volume z-score (right axis)' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={sampledRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(sampledRows.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis yAxisId="price" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(0)} />
                  <YAxis yAxisId="vol" orientation="right" hide domain={[0, (dataMax: number) => dataMax * 4]} />
                  {showVolZScore && (
                    <YAxis yAxisId="zscore" orientation="right"
                      tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                      axisLine={false} width={36} tickFormatter={v => v.toFixed(1)} />
                  )}
                  <Tooltip content={<DualTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                  <Bar yAxisId="vol" dataKey="volume" name="Volume" maxBarSize={6}>
                    {sampledRows.map((row, i) => (
                      <Cell key={i}
                        fill={row.priceChg >= 0 ? COLOR_UP_HIGH : COLOR_DOWN_HIGH}
                        fillOpacity={Math.min(0.3 + Math.abs(row.volZScore) * 0.2, 0.9)} />
                    ))}
                  </Bar>

                  <Line yAxisId="price" dataKey="price" name="Price" stroke={PRICE_COLOR}
                    strokeWidth={2} dot={false} connectNulls />

                  {showVolZScore && (
                    <Line yAxisId="zscore" dataKey="volZScore" name="Vol Z-Score"
                      stroke={CORR_COLOR} strokeWidth={1.5} dot={false} connectNulls
                      strokeDasharray="4 3" strokeOpacity={0.8} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Rolling correlation chart ── */}
        {isConfigured && corrSeries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rolling {corrWindow}-Day Correlation — Price % vs Volume %</CardTitle>
              <CardDescription>
                Above +0.3 = volume confirming trend · Below −0.3 = divergence · Near 0 = no relationship
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={corrSeries} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(corrSeries.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis domain={[-1, 1]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={36} ticks={[-1, -0.5, 0, 0.5, 1]} />
                  <Tooltip content={<CorrTooltip />} />
                  <ReferenceLine y={0}    stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1.5} />
                  <ReferenceLine y={ 0.3} stroke={COLOR_UP_HIGH}  strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: '+0.3', position: 'right', fontSize: 9, fill: COLOR_UP_HIGH }} />
                  <ReferenceLine y={-0.3} stroke={COLOR_DOWN_HIGH} strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: '−0.3', position: 'right', fontSize: 9, fill: COLOR_DOWN_HIGH }} />
                  <Bar dataKey="rollingCorr" name="Correlation" maxBarSize={5} radius={[1, 1, 0, 0]}>
                    {corrSeries.map((row, i) => (
                      <Cell key={i}
                        fill={(row.rollingCorr ?? 0) >= 0 ? COLOR_UP_HIGH : COLOR_DOWN_HIGH}
                        fillOpacity={0.75} />
                    ))}
                  </Bar>
                  <Line dataKey="corrLine" name="Corr" stroke={CORR_COLOR}
                    strokeWidth={1.5} dot={false} connectNulls legendType="none" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Quadrant scatter plot ── */}
        {isConfigured && showScatter && scatterData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quadrant Scatter — Price Change vs Volume Z-Score</CardTitle>
              <CardDescription>
                X = daily price % change · Y = volume z-score (σ above/below avg) · Color = quadrant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    type="number" dataKey="priceChg" name="Price Δ%"
                    tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    label={{ value: 'Price Change (%)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94A3B8' }}
                    tickFormatter={v => `${v.toFixed(1)}%`} />
                  <YAxis
                    type="number" dataKey="volZScore" name="Vol Z-Score"
                    tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40}
                    label={{ value: 'Vol Z-Score (σ)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: '#94A3B8' }}
                    tickFormatter={v => `${v.toFixed(1)}σ`} />
                  <ZAxis range={[18, 18]} />
                  <Tooltip content={<ScatterDotTooltip />} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth={1} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth={1} />

                  {/* One Scatter per quadrant for legend */}
                  {(Object.keys(QUADRANT_CONFIG) as QuadrantLabel[]).map(q => (
                    <Scatter
                      key={q}
                      name={q}
                      data={scatterData.filter(r => r.quadrant === q)}
                      fill={QUADRANT_CONFIG[q].color}
                      fillOpacity={0.6}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Quadrant breakdown table ── */}
        {isConfigured && stats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Quadrant Breakdown
              </CardTitle>
              <CardDescription>
                Day counts and share of total for each price–volume quadrant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Quadrant', 'Days', 'Share', 'Description', 'Implication'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      {
                        q:   'Up + High Vol' as QuadrantLabel,
                        imp: 'Strongest bullish signal — institutions buying with conviction',
                      },
                      {
                        q:   'Up + Low Vol' as QuadrantLabel,
                        imp: 'Caution — rally lacks participation, may not be sustained',
                      },
                      {
                        q:   'Down + High Vol' as QuadrantLabel,
                        imp: 'Strongest bearish signal — distribution or panic selling',
                      },
                      {
                        q:   'Down + Low Vol' as QuadrantLabel,
                        imp: 'Healthy pullback — sellers not aggressive, trend may resume',
                      },
                    ] as const).map(({ q, imp }) => {
                      const count = stats.qCounts[q];
                      const share = (count / stats.totalDays * 100).toFixed(1);
                      const cfg   = QUADRANT_CONFIG[q];
                      return (
                        <tr key={q} className="border-t hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                              <span className="text-xs font-bold text-slate-700">{q}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">{count}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full bg-slate-100 w-16">
                                <div className="h-1.5 rounded-full"
                                  style={{ width: `${share}%`, backgroundColor: cfg.color }} />
                              </div>
                              <span className="font-mono text-xs text-slate-600">{share}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{cfg.desc}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{imp}</td>
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
        {isConfigured && stats && (() => {
          const {
            lastCorr, avgCorr, conviction, recentDiv,
            qCounts, totalDays, lastQuadrant, pctChg,
          } = stats;

          const bullDays = qCounts['Up + High Vol'] + qCounts['Up + Low Vol'];
          const bearDays = qCounts['Down + High Vol'] + qCounts['Down + Low Vol'];
          const bullConviction = totalDays > 0
            ? (qCounts['Up + High Vol'] / bullDays * 100) : 0;
          const bearConviction = totalDays > 0
            ? (qCounts['Down + High Vol'] / bearDays * 100) : 0;

          const corrStrength = lastCorr === null ? 'unknown'
            : Math.abs(lastCorr) >= 0.6 ? 'strong'
            : Math.abs(lastCorr) >= 0.3 ? 'moderate'
            : 'weak';
          const corrDir = lastCorr === null ? 'neutral'
            : lastCorr >= 0 ? 'positive'
            : 'negative';

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated Price–Volume Correlation analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Correlation Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{totalDays.toLocaleString()}</span> trading days.
                    Period price return: <span className={`font-semibold ${pctChg >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {pctChg >= 0 ? '+' : ''}{pctChg.toFixed(1)}%
                    </span>.
                    Rolling {corrWindow}-day correlation is currently{' '}
                    <span className="font-semibold">{corrStrength}</span> and{' '}
                    <span className="font-semibold">{corrDir}</span>
                    {lastCorr !== null && <> ({lastCorr >= 0 ? '+' : ''}{lastCorr.toFixed(3)})</>}.
                    {' '}{conviction.toFixed(0)}% of days were high-conviction directional moves.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Current Corr',
                      value: lastCorr !== null ? `${lastCorr >= 0 ? '+' : ''}${lastCorr.toFixed(3)}` : '—',
                      sub:   corrStrength + ' / ' + corrDir,
                    },
                    {
                      label: 'Avg Corr',
                      value: avgCorr !== null ? `${avgCorr >= 0 ? '+' : ''}${avgCorr.toFixed(3)}` : '—',
                      sub:   'full period average',
                    },
                    {
                      label: 'Bull Conviction',
                      value: `${bullConviction.toFixed(0)}%`,
                      sub:   'of up days w/ high vol',
                    },
                    {
                      label: 'Bear Conviction',
                      value: `${bearConviction.toFixed(0)}%`,
                      sub:   'of down days w/ high vol',
                    },
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Detailed Observations
                  </p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">
                        Rolling Correlation — {corrStrength.charAt(0).toUpperCase() + corrStrength.slice(1)} & {corrDir.charAt(0).toUpperCase() + corrDir.slice(1)}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {lastCorr === null &&
                          `Insufficient data to compute rolling correlation — need at least ${corrWindow} data points.`}
                        {lastCorr !== null && corrDir === 'positive' && corrStrength === 'strong' &&
                          `Strong positive correlation (${lastCorr.toFixed(3)}) — volume is strongly confirming price moves. Rising days see above-average volume and falling days see below-average volume. This pattern describes a high-quality trend with institutional participation.`}
                        {lastCorr !== null && corrDir === 'positive' && corrStrength === 'moderate' &&
                          `Moderate positive correlation (${lastCorr.toFixed(3)}) — volume is generally confirming price direction, but not consistently. The trend has some conviction but also periods of noise. Continue monitoring for the correlation to strengthen or weaken.`}
                        {lastCorr !== null && corrDir === 'positive' && corrStrength === 'weak' &&
                          `Weak positive correlation (${lastCorr.toFixed(3)}) — volume is barely confirming price. Moves are occurring but lack clear volume backing. Treat current price action with caution until confirmation improves.`}
                        {lastCorr !== null && corrDir === 'negative' && corrStrength === 'strong' &&
                          `Strong negative correlation (${lastCorr.toFixed(3)}) — a significant divergence is active. Price and volume are moving in opposite directions. If price is rising while volume falls on up days and rises on down days, this is a classic topping or exhaustion signal.`}
                        {lastCorr !== null && corrDir === 'negative' && corrStrength === 'moderate' &&
                          `Moderate negative correlation (${lastCorr.toFixed(3)}) — divergence developing. Volume is not confirming the current price trend. Watch for this to intensify as a potential reversal warning.`}
                        {lastCorr !== null && corrDir === 'negative' && corrStrength === 'weak' &&
                          `Weak negative correlation (${lastCorr.toFixed(3)}) — slight divergence but not yet a strong signal. Noise may be a factor. Combine with price structure analysis before drawing conclusions.`}
                        {avgCorr !== null && lastCorr !== null && (
                          <> Historical average correlation was <span className="font-mono font-semibold">{avgCorr >= 0 ? '+' : ''}{avgCorr.toFixed(3)}</span>{' '}
                          — current reading is {Math.abs(lastCorr) > Math.abs(avgCorr) ? 'stronger' : 'weaker'} than the historical baseline.</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">
                        Quadrant Profile — Conviction Assessment
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Of {totalDays} total days:{' '}
                        <span className="font-semibold" style={{ color: COLOR_UP_HIGH }}>
                          {qCounts['Up + High Vol']} ({(qCounts['Up + High Vol'] / totalDays * 100).toFixed(0)}%) confirmed bullish
                        </span>,{' '}
                        <span className="font-semibold" style={{ color: COLOR_DOWN_HIGH }}>
                          {qCounts['Down + High Vol']} ({(qCounts['Down + High Vol'] / totalDays * 100).toFixed(0)}%) confirmed bearish
                        </span>.{' '}
                        {conviction >= 50
                          ? `The majority of directional moves were high-conviction (${conviction.toFixed(0)}%) — this market shows clear volume participation on meaningful moves.`
                          : `Only ${conviction.toFixed(0)}% of directional moves were high-conviction — most moves lacked volume follow-through, suggesting a choppy or low-quality price action environment.`}
                      </p>
                    </div>
                  </div>

                  {recentDiv > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Recent Divergence — {recentDiv} Days (Last {corrWindow})
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {recentDiv} of the last {corrWindow} trading days saw price rise with below-average volume.{' '}
                          {recentDiv > corrWindow * 0.4
                            ? `This is an elevated divergence rate (${(recentDiv / corrWindow * 100).toFixed(0)}% of the window). When up-price days consistently show weak volume, it typically signals that the rally is running on fumes — smart money may be distributing into retail buying. A high-volume reversal day would confirm this interpretation.`
                            : `This is within a normal range — some low-volume up days are expected in any trend. No immediate concern, but continued monitoring is warranted.`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">
                        Latest Day — {lastQuadrant}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {lastQuadrant === 'Up + High Vol' &&
                          'The most recent trading day was a confirmed bullish session — price moved up with above-average volume. This is the highest-quality bullish day classification. If this pattern continues, it reinforces the uptrend.'}
                        {lastQuadrant === 'Up + Low Vol' &&
                          'The most recent day saw price rise but on below-average volume. While direction is positive, the lack of volume participation weakens the conviction. A follow-through day with high volume would validate the move.'}
                        {lastQuadrant === 'Down + High Vol' &&
                          'The most recent day was a confirmed bearish session — price dropped with above-average volume, indicating aggressive selling. This is the highest-conviction bearish signal. Watch for continuation.'}
                        {lastQuadrant === 'Down + Low Vol' &&
                          'The most recent day saw price decline but on below-average volume — a healthy pullback pattern. Sellers were not aggressive, suggesting the primary trend may remain intact. Low-volume pullbacks in uptrends are typically buyable dips.'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Correlation = Pearson coefficient of daily price % change vs daily volume % change over a {corrWindow}-day rolling window.
                  Range: −1 (perfect inverse) to +1 (perfect positive). Values near 0 indicate no linear relationship.
                  Volume z-score = (daily volume − mean volume) / standard deviation of volume over the full period.
                  High volume defined as daily volume ≥ full-period mean. This analysis is auto-generated for reference only and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
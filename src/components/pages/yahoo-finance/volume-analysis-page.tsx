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
  Layers,
  Activity,
  BarChart2,
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

interface PriceBin {
  priceFrom:   number;   // bin lower bound
  priceTo:     number;   // bin upper bound
  priceLabel:  string;   // e.g. "142.00–144.00"
  volume:      number;   // total volume in this bin
  pct:         number;   // % of total volume
  isPOC:       boolean;  // Point of Control (highest volume bin)
  isVAH:       boolean;  // Value Area High boundary
  isVAL:       boolean;  // Value Area Low boundary
  isCurrentBin:boolean;  // bin containing the latest close price
}

interface TimeSeriesRow {
  date:       string;
  price:      number;
  volume:     number;
  cumVolume:  number;   // running cumulative volume
}

// ============================================
// Constants
// ============================================

const DEFAULT_BINS      = 40;
const DEFAULT_VA_PCT    = 70;   // Value Area covers 70% of total volume

const POC_COLOR         = '#EF4444';   // red    — POC
const VAH_COLOR         = '#F59E0B';   // amber  — Value Area High
const VAL_COLOR         = '#10B981';   // green  — Value Area Low
const PRICE_COLOR       = '#1E293B';
const VOL_COLOR_NORMAL  = '#6C3AED40'; // violet tint
const VOL_COLOR_VA      = '#6C3AED';   // solid violet — inside value area
const VOL_COLOR_POC     = '#EF4444';   // red — POC bar
const CUMVOL_COLOR      = '#3B82F6';   // blue — cumulative volume line

// ============================================
// Computation helpers
// ============================================

function buildProfile(
  data:      Record<string, any>[],
  dateCol:   string,
  priceCol:  string,
  volumeCol: string,
  highCol:   string,
  lowCol:    string,
  numBins:   number,
  vaPct:     number,
): { bins: PriceBin[]; poc: PriceBin | null; vah: number | null; val: number | null; totalVolume: number } {
  // Parse rows
  const rows = data
    .map(r => {
      const price  = parseFloat(r[priceCol]);
      const vol    = parseFloat(r[volumeCol]);
      const hi     = highCol  ? parseFloat(r[highCol])  : price;
      const lo     = lowCol   ? parseFloat(r[lowCol])   : price;
      return { price, vol, hi: isFinite(hi) ? hi : price, lo: isFinite(lo) ? lo : price, date: String(r[dateCol] ?? '') };
    })
    .filter(r => r.date && isFinite(r.price) && isFinite(r.vol) && r.vol > 0);

  if (!rows.length) return { bins: [], poc: null, vah: null, val: null, totalVolume: 0 };

  const globalHi = Math.max(...rows.map(r => r.hi));
  const globalLo = Math.min(...rows.map(r => r.lo));
  const range    = globalHi - globalLo;
  if (range <= 0) return { bins: [], poc: null, vah: null, val: null, totalVolume: 0 };

  const binSize = range / numBins;

  // Initialize bins
  const binVols = new Array(numBins).fill(0);

  // Distribute each candle's volume proportionally across price range
  for (const row of rows) {
    const hi = row.hi; const lo = row.lo; const vol = row.vol;
    const candleRange = hi - lo;
    for (let b = 0; b < numBins; b++) {
      const binLo = globalLo + b * binSize;
      const binHi = binLo + binSize;
      let overlap: number;
      if (candleRange <= 0) {
        // Point candle — assign to matching bin
        overlap = (row.price >= binLo && row.price < binHi) ? 1 : 0;
      } else {
        const overlapLo = Math.max(lo, binLo);
        const overlapHi = Math.min(hi, binHi);
        overlap = Math.max(0, (overlapHi - overlapLo) / candleRange);
      }
      binVols[b] += vol * overlap;
    }
  }

  const totalVolume = binVols.reduce((a, b) => a + b, 0);
  const latestPrice = rows[rows.length - 1].price;

  // Find POC (max volume bin)
  const pocIdx = binVols.indexOf(Math.max(...binVols));

  // Value Area: expand from POC until vaPct% of total volume is covered
  let vaVol = binVols[pocIdx];
  const inVA = new Array(numBins).fill(false);
  inVA[pocIdx] = true;
  let lo2 = pocIdx, hi2 = pocIdx;

  while (vaVol / totalVolume < vaPct / 100 && (lo2 > 0 || hi2 < numBins - 1)) {
    const addLo = lo2 > 0 ? binVols[lo2 - 1] : -Infinity;
    const addHi = hi2 < numBins - 1 ? binVols[hi2 + 1] : -Infinity;
    if (addHi >= addLo && hi2 < numBins - 1) { hi2++; inVA[hi2] = true; vaVol += binVols[hi2]; }
    else if (lo2 > 0) { lo2--; inVA[lo2] = true; vaVol += binVols[lo2]; }
    else break;
  }

  const vahPrice = globalLo + (hi2 + 1) * binSize;
  const valPrice = globalLo + lo2 * binSize;

  // Build bins array
  const bins: PriceBin[] = binVols.map((vol, b) => {
    const from  = globalLo + b * binSize;
    const to    = from + binSize;
    const pct   = totalVolume > 0 ? (vol / totalVolume) * 100 : 0;
    return {
      priceFrom:    parseFloat(from.toFixed(4)),
      priceTo:      parseFloat(to.toFixed(4)),
      priceLabel:   `${from.toFixed(2)}–${to.toFixed(2)}`,
      volume:       Math.round(vol),
      pct:          parseFloat(pct.toFixed(3)),
      isPOC:        b === pocIdx,
      isVAH:        b === hi2,
      isVAL:        b === lo2,
      isCurrentBin: latestPrice >= from && latestPrice < to,
    };
  }).reverse(); // high price at top

  const poc = bins.find(b => b.isPOC) ?? null;

  return { bins, poc, vah: vahPrice, val: valPrice, totalVolume };
}

function buildTimeSeries(
  data:      Record<string, any>[],
  dateCol:   string,
  priceCol:  string,
  volumeCol: string,
): TimeSeriesRow[] {
  let cumVol = 0;
  return data
    .map(r => ({
      date:   String(r[dateCol] ?? ''),
      price:  parseFloat(r[priceCol]),
      volume: parseFloat(r[volumeCol]),
    }))
    .filter(r => r.date && isFinite(r.price) && isFinite(r.volume))
    .map(r => {
      cumVol += r.volume;
      return { date: r.date, price: r.price, volume: r.volume, cumVolume: cumVol };
    });
}

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2023-01-03');
  let close  = 160;
  let volume = 65_000_000;

  const phases = [
    { days: 55,  drift:  0.0010, vol: 0.012 },
    { days: 40,  drift: -0.0022, vol: 0.020 },
    { days: 70,  drift:  0.0018, vol: 0.013 },
    { days: 45,  drift: -0.0015, vol: 0.018 },
    { days: 90,  drift:  0.0020, vol: 0.010 },
    { days: 60,  drift:  0.0008, vol: 0.009 },
    { days: 40,  drift: -0.0020, vol: 0.019 },
    { days: 60,  drift:  0.0015, vol: 0.011 },
  ];

  let day = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) { day++; i--; continue; }

      const ret   = phase.drift + (Math.random() - 0.5) * phase.vol;
      close       = Math.max(80, close * (1 + ret));
      volume      = Math.max(5_000_000, volume * (0.88 + Math.random() * 0.24));

      // Simulate OHLC from close
      const intraDayVol = phase.vol * 0.8;
      const high  = close * (1 + Math.random() * intraDayVol * 0.6);
      const low   = close * (1 - Math.random() * intraDayVol * 0.6);

      rows.push({
        date:   d.toISOString().split('T')[0],
        close:  parseFloat(close.toFixed(2)),
        high:   parseFloat(high.toFixed(2)),
        low:    parseFloat(low.toFixed(2)),
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

const ProfileTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PriceBin;
  if (!d) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-1.5">{d.priceLabel}</p>
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-slate-500">Volume</span>
        <span className="font-mono font-semibold">{d.volume.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-slate-500">% of Total</span>
        <span className="font-mono font-semibold">{d.pct.toFixed(2)}%</span>
      </div>
      {d.isPOC && <div className="mt-1 text-xs font-bold text-red-500">◆ Point of Control</div>}
      {(d.isVAH || d.isVAL) && <div className="mt-1 text-xs font-bold" style={{ color: d.isVAH ? VAH_COLOR : VAL_COLOR }}>{d.isVAH ? '▲ Value Area High' : '▼ Value Area Low'}</div>}
      {d.isCurrentBin && <div className="mt-1 text-xs font-bold text-primary">● Current Price</div>}
    </div>
  );
};

const PriceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? p.stroke }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-mono font-semibold">
              {typeof p.value === 'number'
                ? p.value > 1_000_000 ? `${(p.value / 1_000_000).toFixed(1)}M` : p.value.toFixed(2)
                : p.value}
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
            <BarChart2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Volume Profile</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze cumulative volume by price level to identify key supply zones, demand zones, and support/resistance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <BarChart2 className="w-6 h-6 text-primary mb-2" />, title: 'Volume Profile',    desc: 'Horizontal bar chart showing cumulative volume at each price bin — instantly reveals where the most trading activity occurred over the selected period.' },
            { icon: <Activity  className="w-6 h-6 text-primary mb-2" />, title: 'POC & Value Area',  desc: 'Point of Control (highest volume price) and Value Area (70% of total volume) are auto-detected — primary references for support and resistance.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Price vs. Profile', desc: 'Current price position relative to POC, VAH, and VAL reveals the structural bias — above POC is bullish, below is bearish.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Key level legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: POC_COLOR,   label: 'POC',          desc: 'Point of Control — highest volume price level' },
            { color: VAH_COLOR,   label: 'VAH',          desc: 'Value Area High — upper edge of 70% vol zone' },
            { color: VAL_COLOR,   label: 'VAL',          desc: 'Value Area Low — lower edge of 70% vol zone' },
            { color: VOL_COLOR_VA,label: 'Value Area',   desc: 'Price range containing 70% of total volume' },
          ].map(({ color, label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</div>
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
            Use Volume Profile to identify high-conviction support and resistance levels based on where
            the market actually transacted — not just chart patterns. The POC acts as a magnet; price
            tends to revisit it. The Value Area defines fair value — trading above VAH is bullish
            auction theory, below VAL is bearish. Low-volume nodes between clusters often act as
            fast-travel zones when price passes through them.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — trading date</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>close / price</strong> — closing price</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>volume</strong> — trading volume</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>high, low</strong> — optional, improves bin distribution accuracy</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Horizontal volume profile with POC, VAH, VAL markers</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Price chart with POC / VAH / VAL reference lines</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Top volume nodes table + structural bias interpretation</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <BarChart2 className="mr-2 h-5 w-5" />
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

export default function VolumeProfilePage({
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
  const [highCol,   setHighCol]   = useState('');
  const [lowCol,    setLowCol]    = useState('');

  // ── Profile parameters ─────────────────────────────────────
  const [numBins, setNumBins] = useState(DEFAULT_BINS);
  const [vaPct,   setVaPct]   = useState(DEFAULT_VA_PCT);

  // ── Options ────────────────────────────────────────────────
  const [showPriceChart,  setShowPriceChart]  = useState(true);
  const [showCumVolChart, setShowCumVolChart] = useState(true);
  const [topN,            setTopN]            = useState(15);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_volume_profile.csv');
    setNumBins(DEFAULT_BINS); setVaPct(DEFAULT_VA_PCT);
    setShowPriceChart(true); setShowCumVolChart(true); setTopN(15);
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setPriceCol(''); setVolumeCol('');
    setHighCol(''); setLowCol('');
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
    detect(['high'],                        setHighCol,   highCol);
    detect(['low'],                         setLowCol,    lowCol);
  }, [hasData, allHeaders]);

  // ── Build volume profile ───────────────────────────────────
  const { bins, poc, vah, val, totalVolume } = useMemo(() => {
    if (!dateCol || !priceCol || !volumeCol) return { bins: [], poc: null, vah: null, val: null, totalVolume: 0 };
    return buildProfile(data, dateCol, priceCol, volumeCol, highCol, lowCol, numBins, vaPct);
  }, [data, dateCol, priceCol, volumeCol, highCol, lowCol, numBins, vaPct]);

  // ── Time series (for price chart) ──────────────────────────
  const timeSeries = useMemo(() => {
    if (!dateCol || !priceCol || !volumeCol) return [];
    return buildTimeSeries(data, dateCol, priceCol, volumeCol);
  }, [data, dateCol, priceCol, volumeCol]);

  // ── Sample time series ─────────────────────────────────────
  const sampledTS = useMemo(() => {
    if (timeSeries.length <= 600) return timeSeries;
    const step = Math.ceil(timeSeries.length / 600);
    return timeSeries.filter((_, i) => i % step === 0);
  }, [timeSeries]);

  // ── Top N volume nodes ─────────────────────────────────────
  const topNodes = useMemo(() =>
    [...bins]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, topN),
    [bins, topN]
  );

  // ── Summary stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!timeSeries.length || !poc) return null;
    const last  = timeSeries[timeSeries.length - 1];
    const first = timeSeries[0];
    const pctChg = ((last.price - first.price) / first.price) * 100;
    const abovePOC = last.price > poc.priceTo;
    const belowPOC = last.price < poc.priceFrom;
    const inVA     = vah !== null && val !== null && last.price >= val && last.price <= vah;
    return {
      lastPrice:  last.price,
      lastDate:   last.date,
      pctChg,
      pocPrice:   (poc.priceFrom + poc.priceTo) / 2,
      vahPrice:   vah,
      valPrice:   val,
      abovePOC,
      belowPOC,
      inVA,
      totalVolume,
      tradingDays: timeSeries.length,
    };
  }, [timeSeries, poc, vah, val, totalVolume]);

  const isConfigured    = !!(dateCol && priceCol && volumeCol && bins.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!bins.length) return;
    const rows = [...bins].reverse().map(b => ({
      price_from:  b.priceFrom,
      price_to:    b.priceTo,
      volume:      b.volume,
      pct_of_total:b.pct,
      is_poc:      b.isPOC ? 'Y' : '',
      is_vah:      b.isVAH ? 'Y' : '',
      is_val:      b.isVAL ? 'Y' : '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `VolumeProfile_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [bins, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `VolumeProfile_${new Date().toISOString().split('T')[0]}.png`;
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
            <BarChart2 className="h-5 w-5" />
            Volume Profile
          </CardTitle>
          <CardDescription>
            Cumulative volume by price level — identify Point of Control, Value Area, and key supply/demand zones.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map columns. High and Low improve bin distribution accuracy but are optional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Column mapping */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'DATE *',   value: dateCol,   setter: setDateCol,   headers: allHeaders,     opt: false },
              { label: 'PRICE *',  value: priceCol,  setter: setPriceCol,  headers: numericHeaders, opt: false },
              { label: 'VOLUME *', value: volumeCol, setter: setVolumeCol, headers: numericHeaders, opt: false },
              { label: 'HIGH',     value: highCol,   setter: setHighCol,   headers: numericHeaders, opt: true  },
              { label: 'LOW',      value: lowCol,    setter: setLowCol,    headers: numericHeaders, opt: true  },
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

          {/* Profile parameters */}
          <div className="flex flex-wrap gap-6 items-end">
            {[
              { label: 'Price Bins',    value: numBins, setter: (v: number) => setNumBins(v), min: 10, max: 200 },
              { label: 'Value Area %',  value: vaPct,   setter: (v: number) => setVaPct(v),   min: 50, max: 95  },
              { label: 'Top Nodes',     value: topN,    setter: (v: number) => setTopN(v),     min: 5,  max: 50  },
            ].map(({ label, value, setter, min, max }) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <input type="number" value={value} min={min} max={max}
                  onChange={e => { const n = parseInt(e.target.value); if (isFinite(n) && n >= min && n <= max) setter(n); }}
                  className="w-20 h-8 text-xs border border-slate-200 rounded px-2 font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            ))}
            <div className="text-xs text-muted-foreground pb-1.5">
              {numBins} bins · VA = {vaPct}% of volume
            </div>
          </div>

          {/* Display options */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showPriceChart} onChange={e => setShowPriceChart(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Price Chart</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showCumVolChart} onChange={e => setShowCumVolChart(e.target.checked)}
                className="rounded border-slate-300 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Cumulative Volume Chart</span>
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
              <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Volume Profile)</DropdownMenuItem>
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Structural Bias</div>
            <div className="flex items-center gap-2 mt-1">
              {stats.abovePOC
                ? <TrendingUp  className="h-5 w-5 text-emerald-500 shrink-0" />
                : stats.belowPOC
                ? <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />
                : <Activity className="h-5 w-5 text-amber-500 shrink-0" />}
              <span className="text-sm font-bold leading-tight text-slate-700">
                {stats.abovePOC ? 'Above POC' : stats.belowPOC ? 'Below POC' : 'At POC'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.inVA ? 'Inside Value Area' : stats.abovePOC ? 'Above Value Area' : 'Below Value Area'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">POC Price</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{stats.pocPrice.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Point of Control</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Value Area</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono" style={{ color: VAL_COLOR }}>
                {stats.valPrice !== null ? stats.valPrice.toFixed(2) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">—</span>
              <span className="text-sm font-bold font-mono" style={{ color: VAH_COLOR }}>
                {stats.vahPrice !== null ? stats.vahPrice.toFixed(2) : '—'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">VAL – VAH · {vaPct}% of volume</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Volume</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {totalVolume >= 1_000_000_000
                ? `${(totalVolume / 1_000_000_000).toFixed(1)}B`
                : totalVolume >= 1_000_000
                ? `${(totalVolume / 1_000_000).toFixed(0)}M`
                : totalVolume.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{stats.tradingDays.toLocaleString()} trading days</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Volume Profile horizontal chart ── */}
        {isConfigured && bins.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Volume Profile — {numBins} Price Bins</CardTitle>
              <CardDescription>
                Red = POC · Amber = VAH · Green = VAL · Solid violet = Value Area · Current price bin highlighted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(320, Math.min(bins.length * 10, 600))}>
                <BarChart
                  data={bins}
                  layout="vertical"
                  margin={{ top: 4, right: 80, bottom: 4, left: 8 }}
                  barCategoryGap="1%"
                >
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v.toLocaleString()} />
                  <YAxis type="category" dataKey="priceLabel"
                    tick={{ fontSize: 8, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    width={78} interval={Math.floor(bins.length / 12)} />
                  <Tooltip content={<ProfileTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="volume" name="Volume" radius={[0, 2, 2, 0]}>
                    {bins.map((bin, i) => {
                      let fill: string;
                      if (bin.isPOC)              fill = VOL_COLOR_POC;
                      else if (bin.isCurrentBin)  fill = '#1E293B';
                      else {
                        // Determine if in value area (between VAL and VAH bin indices)
                        const binMid = (bin.priceFrom + bin.priceTo) / 2;
                        const inVA   = stats?.valPrice !== null && stats?.vahPrice !== null
                          && binMid >= (stats?.valPrice ?? -Infinity)
                          && binMid <= (stats?.vahPrice ?? Infinity);
                        fill = inVA ? VOL_COLOR_VA : VOL_COLOR_NORMAL;
                      }
                      return <Cell key={i} fill={fill} fillOpacity={bin.isPOC || bin.isCurrentBin ? 1 : 0.75} />;
                    })}
                  </Bar>

                  {/* Key level reference lines */}
                  {poc && (
                    <ReferenceLine
                      x={poc.volume}
                      stroke={POC_COLOR}
                      strokeDasharray="4 2"
                      strokeWidth={1}
                      label={{ value: `POC ${((poc.priceFrom + poc.priceTo) / 2).toFixed(2)}`, position: 'right', fontSize: 9, fill: POC_COLOR }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Price chart with POC / VAH / VAL lines ── */}
        {isConfigured && showPriceChart && sampledTS.length > 0 && stats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price with Key Levels</CardTitle>
              <CardDescription>
                Red = POC ({stats.pocPrice.toFixed(2)}) · Amber = VAH ({stats.vahPrice?.toFixed(2) ?? '—'}) · Green = VAL ({stats.valPrice?.toFixed(2) ?? '—'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={sampledTS} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(sampledTS.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip content={<PriceTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                  {/* Key level horizontal lines */}
                  <ReferenceLine y={stats.pocPrice} stroke={POC_COLOR} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `POC ${stats.pocPrice.toFixed(2)}`, position: 'right', fontSize: 9, fill: POC_COLOR }} />
                  {stats.vahPrice !== null && (
                    <ReferenceLine y={stats.vahPrice} stroke={VAH_COLOR} strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value: `VAH ${stats.vahPrice.toFixed(2)}`, position: 'right', fontSize: 9, fill: VAH_COLOR }} />
                  )}
                  {stats.valPrice !== null && (
                    <ReferenceLine y={stats.valPrice} stroke={VAL_COLOR} strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value: `VAL ${stats.valPrice.toFixed(2)}`, position: 'right', fontSize: 9, fill: VAL_COLOR }} />
                  )}

                  <Line dataKey="price" name="Price" stroke={PRICE_COLOR} strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Cumulative volume chart ── */}
        {isConfigured && showCumVolChart && sampledTS.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cumulative Volume Over Time</CardTitle>
              <CardDescription>
                Running total of traded volume — steep slopes indicate high-activity periods; flat segments are low-volume phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={sampledTS} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.floor(sampledTS.length / 8)}
                    tickFormatter={d => d?.slice(0, 7) ?? ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    width={52} tickFormatter={v => v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B` : `${(v / 1_000_000).toFixed(0)}M`} />
                  <Tooltip content={<PriceTooltip />} />
                  <Line dataKey="cumVolume" name="Cum. Volume" stroke={CUMVOL_COLOR} strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Top volume nodes table ── */}
        {isConfigured && topNodes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                Top {topN} Volume Nodes
              </CardTitle>
              <CardDescription>
                Highest-volume price bins ranked by total activity — primary support/resistance levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Rank', 'Price Range', 'Volume', '% of Total', 'Level Type'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topNodes.map((node, i) => {
                      const levelType = node.isPOC ? 'POC' : node.isVAH ? 'VAH' : node.isVAL ? 'VAL' : node.isCurrentBin ? 'Current' : '—';
                      const levelColor = node.isPOC ? POC_COLOR : node.isVAH ? VAH_COLOR : node.isVAL ? VAL_COLOR : node.isCurrentBin ? '#6C3AED' : '#94A3B8';
                      return (
                        <tr key={i} className={`border-t transition-colors ${node.isPOC ? 'bg-red-50/50' : 'hover:bg-slate-50/50'}`}>
                          <td className="px-3 py-2 font-mono text-xs font-bold text-slate-500">#{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{node.priceLabel}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {node.volume >= 1_000_000
                              ? `${(node.volume / 1_000_000).toFixed(1)}M`
                              : node.volume.toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full bg-primary/20 flex-1 max-w-[80px]">
                                <div className="h-1.5 rounded-full bg-primary"
                                  style={{ width: `${Math.min(node.pct / topNodes[0].pct * 100, 100)}%` }} />
                              </div>
                              <span className="font-mono text-xs text-slate-600">{node.pct.toFixed(2)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {levelType !== '—' ? (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${levelColor}18`, color: levelColor }}>
                                {levelType}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
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
        {isConfigured && stats && (() => {
          const { lastPrice, pocPrice, vahPrice, valPrice, abovePOC, belowPOC, inVA, pctChg } = stats;

          // Distance to key levels
          const distToPOC = pocPrice ? ((lastPrice - pocPrice) / pocPrice * 100) : null;
          const distToVAH = vahPrice ? ((lastPrice - vahPrice) / vahPrice * 100) : null;
          const distToVAL = valPrice ? ((lastPrice - valPrice) / valPrice * 100) : null;

          // Low volume nodes (potential fast-travel zones)
          const avgVol = totalVolume / numBins;
          const lvnBins = bins.filter(b => b.volume < avgVol * 0.3).slice(0, 3);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated Volume Profile analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Profile Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{stats.tradingDays.toLocaleString()}</span> trading days across{' '}
                    <span className="font-semibold">{numBins}</span> price bins.
                    POC at <span className="font-mono font-semibold text-red-500">{pocPrice.toFixed(2)}</span>.
                    Value Area ({vaPct}%): <span className="font-mono font-semibold" style={{ color: VAL_COLOR }}>{valPrice?.toFixed(2) ?? '—'}</span> – <span className="font-mono font-semibold" style={{ color: VAH_COLOR }}>{vahPrice?.toFixed(2) ?? '—'}</span>.
                    Price is currently <span className="font-semibold">{abovePOC ? 'above' : belowPOC ? 'below' : 'at'}</span> POC
                    and <span className="font-semibold">{inVA ? 'inside' : 'outside'}</span> the Value Area.
                  </p>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Dist. to POC',   value: distToPOC !== null  ? `${distToPOC >= 0 ? '+' : ''}${distToPOC.toFixed(1)}%`  : '—', sub: 'from latest price' },
                    { label: 'Dist. to VAH',   value: distToVAH !== null  ? `${distToVAH >= 0 ? '+' : ''}${distToVAH.toFixed(1)}%`  : '—', sub: 'from latest price' },
                    { label: 'Dist. to VAL',   value: distToVAL !== null  ? `${distToVAL >= 0 ? '+' : ''}${distToVAL.toFixed(1)}%`  : '—', sub: 'from latest price' },
                    { label: 'Period Return',  value: `${pctChg >= 0 ? '+' : ''}${pctChg.toFixed(1)}%`,                              sub: 'first to last close' },
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

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Structural Bias — Price vs. POC</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {abovePOC
                          ? `Price is ${distToPOC !== null ? `${Math.abs(distToPOC).toFixed(1)}% above` : 'above'} the POC at ${pocPrice.toFixed(2)} — a bullish structural position. In auction theory, price above POC signals that buyers are in control and willing to trade at a premium to the fairest value price. The POC acts as a primary support on any pullback.`
                          : belowPOC
                          ? `Price is ${distToPOC !== null ? `${Math.abs(distToPOC).toFixed(1)}% below` : 'below'} the POC at ${pocPrice.toFixed(2)} — a bearish structural position. Price below POC signals sellers are in control. The POC acts as primary overhead resistance on any rally.`
                          : `Price is trading at or near the POC (${pocPrice.toFixed(2)}) — the highest-volume price level. This is often a zone of indecision and two-way activity. A decisive break above or below the POC would clarify directional bias.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Value Area Analysis</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {vahPrice !== null && valPrice !== null ? (
                          <>
                            The {vaPct}% Value Area spans <span className="font-mono font-semibold" style={{ color: VAL_COLOR }}>{valPrice.toFixed(2)}</span> (VAL) to <span className="font-mono font-semibold" style={{ color: VAH_COLOR }}>{vahPrice.toFixed(2)}</span> (VAH).{' '}
                            {inVA
                              ? 'Price is inside the Value Area — considered fair value. The market may continue to rotate within this range until a catalyst drives it outside.'
                              : abovePOC
                              ? `Price is trading above the Value Area High (${vahPrice.toFixed(2)}). This is considered premium territory — buyers are paying above fair value, typically signaling strong bullish conviction or breakout conditions. A rejection back below VAH would signal a failed breakout.`
                              : `Price is trading below the Value Area Low (${valPrice.toFixed(2)}). This is discount territory — sellers are accepting below fair value, typically signaling bearish conviction or breakdown. A recovery back above VAL would suggest the sell-off was rejected.`}
                          </>
                        ) : 'Insufficient data to compute Value Area at current parameters.'}
                      </p>
                    </div>
                  </div>

                  {lvnBins.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Low Volume Nodes — Fast Travel Zones</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Low-volume nodes detected near: <span className="font-semibold">{lvnBins.map(b => b.priceLabel).join(', ')}</span>.
                          These price ranges had minimal trading activity — when price enters a low-volume node, it tends to move through it quickly with little resistance.
                          They represent potential acceleration zones rather than support or resistance levels.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Top Volume Node — Primary Supply/Demand Zone</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The highest-volume bin ({poc ? poc.priceLabel : '—'}) represents the price where the greatest consensus between buyers and sellers occurred.
                        This is the strongest reference level in the entire profile — expect price to gravitate toward it during periods of low conviction
                        and to use it as the key battle line during directional moves.
                        {poc && poc.pct >= 5 && (
                          <> At <span className="font-mono font-semibold">{poc.pct.toFixed(1)}%</span> of total volume, this node is unusually dominant — suggesting a strong, well-established fair value anchor.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Volume is distributed across price bins proportionally based on the high-low range of each candle.
                  {highCol && lowCol ? ' High and Low columns used for accurate distribution.' : ' Using close price as a point estimate (high/low not mapped).'}
                  {' '}Point of Control = highest-volume bin. Value Area = {vaPct}% of total volume centered on POC, expanded greedily to adjacent highest-volume bins.
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
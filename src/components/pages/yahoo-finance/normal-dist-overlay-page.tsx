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
  AreaChart,
  Area,
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
  Bell,
  Plus,
  Trash2,
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
// Math helpers — Normal distribution
// ============================================

// Error function approximation (Abramowitz & Stegun 7.1.26)
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 =  0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

// Standard normal CDF
function normalCDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return x >= mu ? 1 : 0;
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

// Standard normal PDF
function normalPDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
}

// ============================================
// Types
// ============================================

interface StockEntry {
  id: string;
  ticker: string;
  consensus: number;   // EPS estimate (mean of distribution)
  sigma: number;       // Std dev in EPS units
  // Historical surprises (optional, comma-separated)
  historicalInput: string;
  historicalSurprises: number[]; // parsed %
}

interface DistributionResult {
  id: string;
  ticker: string;
  consensus: number;
  sigma: number;
  // Probabilities
  pBeatAny:    number; // P(actual > consensus)
  pBeat5:      number; // P(actual > consensus * 1.05)
  pBeat10:     number;
  pMissAny:    number; // P(actual < consensus)
  pMiss5:      number;
  pMiss10:     number;
  pInLine:     number; // P(within ±2%)
  // Expected range
  range1SigmaLow:  number; // consensus - 1σ
  range1SigmaHigh: number;
  range2SigmaLow:  number;
  range2SigmaHigh: number;
  // Historical (if provided)
  historicalBeatRate:   number | null;
  historicalAvgSurprise: number | null;
  historicalSigma:      number | null;
}

// ============================================
// Constants
// ============================================

const BEAT_COLOR    = '#10B981';
const MISS_COLOR    = '#F59E0B';
const INLINE_COLOR  = '#F59E0B';
const DIST_COLOR    = '#6C3AED';
const HIST_COLOR    = '#3B82F6';

const N_CURVE_POINTS = 120;

// ============================================
// Computation
// ============================================

function parseHistorical(input: string): number[] {
  if (!input.trim()) return [];
  return input.split(/[,\s]+/)
    .map(s => parseFloat(s))
    .filter(v => isFinite(v));
}

function computeResult(s: StockEntry): DistributionResult {
  const { consensus: mu, sigma, historicalSurprises: hist } = s;

  const beat5Threshold  = mu * 1.05;
  const beat10Threshold = mu * 1.10;
  const miss5Threshold  = mu * 0.95;
  const miss10Threshold = mu * 0.90;
  const inlineHigh      = mu * 1.02;
  const inlineLow       = mu * 0.98;

  const pBeatAny = 1 - normalCDF(mu,             mu, sigma);
  const pBeat5   = 1 - normalCDF(beat5Threshold,  mu, sigma);
  const pBeat10  = 1 - normalCDF(beat10Threshold, mu, sigma);
  const pMissAny = normalCDF(mu,                  mu, sigma);
  const pMiss5   = normalCDF(miss5Threshold,       mu, sigma);
  const pMiss10  = normalCDF(miss10Threshold,      mu, sigma);
  const pInLine  = normalCDF(inlineHigh, mu, sigma) - normalCDF(inlineLow, mu, sigma);

  // Historical stats
  let historicalBeatRate: number | null = null;
  let historicalAvgSurprise: number | null = null;
  let historicalSigma: number | null = null;

  if (hist.length > 0) {
    historicalBeatRate   = parseFloat(((hist.filter(v => v > 0).length / hist.length) * 100).toFixed(1));
    historicalAvgSurprise = parseFloat((hist.reduce((a, b) => a + b, 0) / hist.length).toFixed(2));
    if (hist.length > 1) {
      const avg = historicalAvgSurprise;
      historicalSigma = parseFloat(
        Math.sqrt(hist.reduce((s, v) => s + (v - avg) ** 2, 0) / (hist.length - 1)).toFixed(2)
      );
    }
  }

  return {
    id: s.id, ticker: s.ticker, consensus: mu, sigma,
    pBeatAny: parseFloat((pBeatAny * 100).toFixed(1)),
    pBeat5:   parseFloat((pBeat5   * 100).toFixed(1)),
    pBeat10:  parseFloat((pBeat10  * 100).toFixed(1)),
    pMissAny: parseFloat((pMissAny * 100).toFixed(1)),
    pMiss5:   parseFloat((pMiss5   * 100).toFixed(1)),
    pMiss10:  parseFloat((pMiss10  * 100).toFixed(1)),
    pInLine:  parseFloat((pInLine  * 100).toFixed(1)),
    range1SigmaLow:  parseFloat((mu - sigma).toFixed(3)),
    range1SigmaHigh: parseFloat((mu + sigma).toFixed(3)),
    range2SigmaLow:  parseFloat((mu - 2 * sigma).toFixed(3)),
    range2SigmaHigh: parseFloat((mu + 2 * sigma).toFixed(3)),
    historicalBeatRate, historicalAvgSurprise, historicalSigma,
  };
}

// Build bell curve points for a single stock
function buildCurve(r: DistributionResult) {
  const { consensus: mu, sigma } = r;
  const lo = mu - 3.5 * sigma;
  const hi = mu + 3.5 * sigma;
  const step = (hi - lo) / N_CURVE_POINTS;

  return Array.from({ length: N_CURVE_POINTS + 1 }, (_, i) => {
    const x   = lo + i * step;
    const pdf = normalPDF(x, mu, sigma);
    // Region colouring
    const isBeat5  = x > mu * 1.05;
    const isMiss5  = x < mu * 0.95;
    const isInLine = x >= mu * 0.98 && x <= mu * 1.02;
    return {
      x: parseFloat(x.toFixed(4)),
      pdf: parseFloat(pdf.toFixed(6)),
      beatArea:   isBeat5  ? parseFloat(pdf.toFixed(6)) : 0,
      missArea:   isMiss5  ? parseFloat(pdf.toFixed(6)) : 0,
      inlineArea: isInLine ? parseFloat(pdf.toFixed(6)) : 0,
      baseArea:   !isBeat5 && !isMiss5 && !isInLine ? parseFloat(pdf.toFixed(6)) : 0,
    };
  });
}

// ============================================
// Example / default stocks
// ============================================

function defaultStocks(): StockEntry[] {
  return [
    { id: '1', ticker: 'AAPL',  consensus: 1.58, sigma: 0.06, historicalInput: '3.2, 1.1, 4.5, -0.8, 2.9, 1.6, 5.1, -1.2', historicalSurprises: [3.2, 1.1, 4.5, -0.8, 2.9, 1.6, 5.1, -1.2] },
    { id: '2', ticker: 'MSFT',  consensus: 3.10, sigma: 0.09, historicalInput: '5.4, 3.2, 6.1, 2.8, 4.9, 7.2, 3.5, 5.8',    historicalSurprises: [5.4, 3.2, 6.1, 2.8, 4.9, 7.2, 3.5, 5.8] },
    { id: '3', ticker: 'NVDA',  consensus: 4.62, sigma: 0.35, historicalInput: '18.2, 12.4, 21.3, 9.8, 15.6, 24.1, 11.2, 19.3', historicalSurprises: [18.2, 12.4, 21.3, 9.8, 15.6, 24.1, 11.2, 19.3] },
    { id: '4', ticker: 'META',  consensus: 5.25, sigma: 0.28, historicalInput: '8.3, -2.1, 11.5, 4.2, 7.8, -1.5, 9.6, 6.1',  historicalSurprises: [8.3, -2.1, 11.5, 4.2, 7.8, -1.5, 9.6, 6.1] },
    { id: '5', ticker: 'TSLA',  consensus: 0.72, sigma: 0.12, historicalInput: '-12.5, 4.3, -8.2, 22.1, -5.6, 15.4, -18.3, 8.7', historicalSurprises: [-12.5, 4.3, -8.2, 22.1, -5.6, 15.4, -18.3, 8.7] },
  ];
}

function generateExampleCSV(): Record<string, any>[] {
  return defaultStocks().map(s => ({
    ticker:         s.ticker,
    consensus_eps:  s.consensus,
    sigma:          s.sigma,
    hist_surprises: s.historicalInput,
  }));
}

// ============================================
// Custom Tooltips
// ============================================

const CurveTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const x   = payload[0]?.payload?.x;
  const pdf = payload[0]?.payload?.pdf;
  if (x === undefined) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[130px]">
      <p className="font-semibold text-slate-700 mb-1">EPS: {x.toFixed(3)}</p>
      <p className="text-slate-500">Density: <span className="font-mono font-semibold">{pdf?.toFixed(4)}</span></p>
    </div>
  );
};

const ProbTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Probability Bar (inline mini component)
// ============================================

const ProbBar = ({ value, color, label }: { value: number; color: string; label: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  </div>
);

// ============================================
// Intro Page
// ============================================

const IntroPage = ({ onLoadExample, onManualEntry }: { onLoadExample: () => void; onManualEntry: () => void }) => (
  <div className="flex flex-1 justify-center px-4 py-6">
    <div className="w-full max-w-5xl">
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Bell className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Earnings Surprise Probability</CardTitle>
        <CardDescription className="text-base mt-2">
          Model earnings outcomes as a normal distribution — calculate the probability of beats, misses, and in-line results given consensus estimates and historical volatility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Bell className="w-6 h-6 text-primary mb-2" />,
              title: 'Probability Distribution',
              desc:  'Model actual EPS as normally distributed around the consensus estimate — visualize the full bell curve with shaded beat, miss, and in-line regions.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Surprise Probability Bands',
              desc:  'Compute P(beat >0%), P(beat >5%), P(beat >10%), P(miss >5%) — see the probability of crossing key surprise thresholds used by investors and traders.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Historical Calibration',
              desc:  'Input past surprise percentages to calibrate the model — compare implied σ from the distribution to realized historical surprise volatility.',
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
            { color: BEAT_COLOR,   label: 'Beat Zone',    desc: 'Actual > consensus +5%' },
            { color: MISS_COLOR,   label: 'Miss Zone',    desc: 'Actual < consensus −5%' },
            { color: INLINE_COLOR, label: 'In-Line Zone', desc: 'Within ±2% of consensus' },
            { color: DIST_COLOR,   label: 'Distribution', desc: 'Full normal distribution curve' },
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
            Use Earnings Surprise Probability in the lead-up to earnings releases — model the distribution of actual EPS
            around the consensus estimate using analyst estimate dispersion or historical surprise volatility as the standard deviation.
            A narrow σ (low dispersion) produces tight probability bands; a wide σ (high uncertainty) produces fat-tailed outcomes.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required Inputs
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>ticker</strong> — stock identifier</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>consensus_eps</strong> — mean analyst estimate</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>sigma</strong> — std dev in EPS (analyst dispersion or implied)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>historical surprises %</strong> — optional, for calibration</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Bell curve with shaded beat / miss / in-line regions</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>P(beat), P(miss), P(in-line) at multiple thresholds</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Cross-stock probability comparison</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Historical beat rate vs implied probability</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Bell className="mr-2 h-5 w-5" />Load Example Data
          </Button>
          <Button onClick={onManualEntry} size="lg" variant="outline">
            <Plus className="mr-2 h-5 w-5" />Manual Entry
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  </div>
);

// ============================================
// Main Component
// ============================================

export default function EarningsSurprisePage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ─────────────────────────────────────────
  const [tickerCol,    setTickerCol]    = useState('');
  const [consensusCol, setConsensusCol] = useState('');
  const [sigmaCol,     setSigmaCol]     = useState('');
  const [histCol,      setHistCol]      = useState('');

  // ── Manual stocks ──────────────────────────────────────────
  const [manualStocks, setManualStocks] = useState<StockEntry[]>(defaultStocks);
  const [inputMode,    setInputMode]    = useState<'csv' | 'manual'>('manual');
  const [hasStarted,   setHasStarted]   = useState(false);

  // ── Selected stock for distribution chart ─────────────────
  const [selectedId,   setSelectedId]   = useState('1');

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleCSV();
    onExampleLoaded?.(rows, 'example_earnings_surprise.csv');
    setInputMode('csv');
    setHasStarted(true);
    setTickerCol('ticker'); setConsensusCol('consensus_eps');
    setSigmaCol('sigma');   setHistCol('hist_surprises');
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setTickerCol(''); setConsensusCol(''); setSigmaCol(''); setHistCol('');
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
    detect(['ticker', 'symbol', 'stock'],                        setTickerCol,    tickerCol);
    detect(['consensus_eps', 'consensus', 'estimate', 'eps'],    setConsensusCol, consensusCol);
    detect(['sigma', 'std_dev', 'stddev', 'dispersion'],         setSigmaCol,     sigmaCol);
    detect(['hist_surprises', 'historical', 'surprises', 'hist'],setHistCol,      histCol);
  }, [hasData, allHeaders]);

  // ── Build stocks from CSV ─────────────────────────────────
  const csvStocks = useMemo((): StockEntry[] => {
    if (!tickerCol || !consensusCol || !sigmaCol) return [];
    return data.map((r, i) => {
      const ticker    = String(r[tickerCol] ?? '').trim();
      const consensus = parseFloat(String(r[consensusCol]));
      const sigma     = parseFloat(String(r[sigmaCol]));
      if (!ticker || !isFinite(consensus) || !isFinite(sigma)) return null;
      const histInput = histCol ? String(r[histCol] ?? '') : '';
      return {
        id: String(i), ticker, consensus, sigma,
        historicalInput: histInput,
        historicalSurprises: parseHistorical(histInput),
      };
    }).filter((r): r is StockEntry => r !== null);
  }, [data, tickerCol, consensusCol, sigmaCol, histCol]);

  const activeStocks = inputMode === 'csv' ? csvStocks : manualStocks;

  // ── Results ───────────────────────────────────────────────
  const results = useMemo(() => activeStocks.map(computeResult), [activeStocks]);

  // ── Selected stock curve ───────────────────────────────────
  const selectedResult = useMemo(
    () => results.find(r => r.id === selectedId) ?? results[0],
    [results, selectedId]
  );

  const curveData = useMemo(
    () => selectedResult ? buildCurve(selectedResult) : [],
    [selectedResult]
  );

  // ── Cross-stock comparison chart data ─────────────────────
  const comparisonData = useMemo(() =>
    results.map(r => ({
      ticker:  r.ticker,
      beat5:   r.pBeat5,
      inLine:  r.pInLine,
      miss5:   r.pMiss5,
      beatAny: r.pBeatAny,
    })),
    [results]
  );

  const histCompareData = useMemo(() =>
    results.filter(r => r.historicalBeatRate !== null).map(r => ({
      ticker:         r.ticker,
      impliedBeat:    r.pBeatAny,
      historicalBeat: r.historicalBeatRate,
    })),
    [results]
  );

  // ── Manual entry handlers ──────────────────────────────────
  const handleManualChange = useCallback((id: string, field: string, value: string) => {
    setManualStocks(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (field === 'ticker')    return { ...s, ticker: value };
      if (field === 'consensus') {
        const v = parseFloat(value);
        return { ...s, consensus: isFinite(v) ? v : s.consensus };
      }
      if (field === 'sigma') {
        const v = parseFloat(value);
        return { ...s, sigma: isFinite(v) ? Math.max(0.001, v) : s.sigma };
      }
      if (field === 'historical') {
        return { ...s, historicalInput: value, historicalSurprises: parseHistorical(value) };
      }
      return s;
    }));
  }, []);

  const handleAddStock = useCallback(() => {
    const id = String(Date.now());
    setManualStocks(prev => [...prev, {
      id, ticker: 'NEW', consensus: 2.00, sigma: 0.10,
      historicalInput: '', historicalSurprises: [],
    }]);
  }, []);

  const handleDeleteStock = useCallback((id: string) => {
    setManualStocks(prev => prev.filter(s => s.id !== id));
    setSelectedId(prev => prev === id ? (manualStocks[0]?.id ?? '') : prev);
  }, [manualStocks]);

  const isConfigured    = results.length > 0;
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!results.length) return;
    const rows = results.map(r => ({
      ticker:                   r.ticker,
      consensus_eps:            r.consensus,
      sigma:                    r.sigma,
      p_beat_any:               `${r.pBeatAny}%`,
      p_beat_5pct:              `${r.pBeat5}%`,
      p_beat_10pct:             `${r.pBeat10}%`,
      p_miss_any:               `${r.pMissAny}%`,
      p_miss_5pct:              `${r.pMiss5}%`,
      p_miss_10pct:             `${r.pMiss10}%`,
      p_in_line:                `${r.pInLine}%`,
      range_1sigma:             `${r.range1SigmaLow} – ${r.range1SigmaHigh}`,
      range_2sigma:             `${r.range2SigmaLow} – ${r.range2SigmaHigh}`,
      historical_beat_rate:     r.historicalBeatRate !== null ? `${r.historicalBeatRate}%` : '',
      historical_avg_surprise:  r.historicalAvgSurprise !== null ? `${r.historicalAvgSurprise}%` : '',
      historical_sigma:         r.historicalSigma !== null ? `${r.historicalSigma}%` : '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `EarningsSurprise_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [results, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `EarningsSurprise_${new Date().toISOString().split('T')[0]}.png`;
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
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-4">

      {/* ── File Header Bar ── */}
      {hasData && (
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
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' }));
                link.download = (fileName || 'data').replace(/\.csv$/, '') + '_raw.csv';
                link.click();
                toast({ title: 'Raw data downloaded' });
              }} title="Download raw CSV">
              <Download className="h-4 w-4" />
            </Button>
          )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={handleClearAll}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* ── Data Preview Modal ── */}
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 2</span>
            <span className="text-xs text-muted-foreground">Probability Distribution Analysis</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />Earnings Surprise Probability
          </CardTitle>
          <CardDescription>
            Model earnings outcomes as a normal distribution — calculate the probability of beats, misses, and in-line results given consensus estimates and historical volatility.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Input ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription>Enter stock data manually or map CSV columns. σ = analyst estimate dispersion (EPS units).</CardDescription>
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
                      {['Ticker', 'Consensus EPS (μ)', 'Std Dev (σ)', 'Historical Surprises % (comma-separated)', ''].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualStocks.map(s => (
                      <tr key={s.id} className={`border-t hover:bg-slate-50/30 transition-colors ${selectedId === s.id ? 'bg-primary/5' : ''}`}>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-20 font-semibold" value={s.ticker}
                            onChange={e => handleManualChange(s.id, 'ticker', e.target.value)}
                            onClick={() => setSelectedId(s.id)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-28 font-mono" value={s.consensus}
                            onChange={e => handleManualChange(s.id, 'consensus', e.target.value)}
                            onClick={() => setSelectedId(s.id)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-24 font-mono" value={s.sigma}
                            onChange={e => handleManualChange(s.id, 'sigma', e.target.value)}
                            onClick={() => setSelectedId(s.id)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-72 font-mono" value={s.historicalInput}
                            placeholder="e.g. 3.2, -1.5, 5.8, 2.1"
                            onChange={e => handleManualChange(s.id, 'historical', e.target.value)}
                            onClick={() => setSelectedId(s.id)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600"
                            onClick={() => handleDeleteStock(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">Click a row to select it for the distribution chart below.</p>
              <Button variant="outline" size="sm" onClick={handleAddStock}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Stock
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'TICKER *',        value: tickerCol,    setter: setTickerCol,    headers: allHeaders     },
                { label: 'CONSENSUS EPS *', value: consensusCol, setter: setConsensusCol, headers: numericHeaders },
                { label: 'STD DEV (σ) *',   value: sigmaCol,     setter: setSigmaCol,     headers: numericHeaders },
                { label: 'HIST SURPRISES',  value: histCol,      setter: setHistCol,      headers: allHeaders     },
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
      {isConfigured && selectedResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">P(Beat)</div>
            <div className="text-2xl font-bold font-mono" style={{ color: BEAT_COLOR }}>
              {selectedResult.pBeatAny.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{selectedResult.ticker} · above consensus</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">P(Beat &gt;5%)</div>
            <div className="text-2xl font-bold font-mono" style={{ color: BEAT_COLOR }}>
              {selectedResult.pBeat5.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Meaningful positive surprise</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">P(Miss &gt;5%)</div>
            <div className="text-2xl font-bold font-mono" style={{ color: MISS_COLOR }}>
              {selectedResult.pMiss5.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Meaningful negative surprise</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">1σ EPS Range</div>
            <div className="text-lg font-bold font-mono text-slate-800">
              {selectedResult.range1SigmaLow.toFixed(2)} – {selectedResult.range1SigmaHigh.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">68% confidence interval</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Bell Curve for selected stock ── */}
        {isConfigured && selectedResult && curveData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Probability Distribution — {selectedResult.ticker}</CardTitle>
                  <CardDescription>
                    N(μ={selectedResult.consensus.toFixed(3)}, σ={selectedResult.sigma.toFixed(3)}) ·
                    Green = Beat &gt;5% · Red = Miss &gt;5% · Amber = In-Line (±2%)
                  </CardDescription>
                </div>
                {results.length > 1 && (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {results.map(r => <SelectItem key={r.id} value={r.id}>{r.ticker}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={curveData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={v => typeof v === 'number' ? v.toFixed(2) : v}
                    minTickGap={30} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={40}
                    tickFormatter={v => v.toFixed(2)} />
                  <Tooltip content={<CurveTooltip />} />
                  {/* Base area */}
                  <Area dataKey="baseArea" name="Base" stackId="a"
                    stroke="none" fill={DIST_COLOR} fillOpacity={0.15} />
                  {/* In-line zone */}
                  <Area dataKey="inlineArea" name="In-Line" stackId="a"
                    stroke="none" fill={INLINE_COLOR} fillOpacity={0.5} />
                  {/* Beat zone */}
                  <Area dataKey="beatArea" name="Beat >5%" stackId="a"
                    stroke="none" fill={BEAT_COLOR} fillOpacity={0.5} />
                  {/* Miss zone */}
                  <Area dataKey="missArea" name="Miss >5%" stackId="a"
                    stroke="none" fill={MISS_COLOR} fillOpacity={0.5} />
                  {/* Outline */}
                  <Area dataKey="pdf" name="PDF"
                    stroke={DIST_COLOR} strokeWidth={2} fill="none" />
                  {/* Reference lines */}
                  <ReferenceLine x={selectedResult.consensus}
                    stroke={DIST_COLOR} strokeWidth={1.5} strokeDasharray="4 3"
                    label={{ value: 'μ', position: 'top', fontSize: 11, fill: DIST_COLOR }} />
                  <ReferenceLine x={selectedResult.range1SigmaHigh}
                    stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 3"
                    label={{ value: '+1σ', position: 'top', fontSize: 9, fill: '#94A3B8' }} />
                  <ReferenceLine x={selectedResult.range1SigmaLow}
                    stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 3"
                    label={{ value: '-1σ', position: 'top', fontSize: 9, fill: '#94A3B8' }} />
                </AreaChart>
              </ResponsiveContainer>

              {/* Probability bars */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2.5">
                <ProbBar value={selectedResult.pBeat10}  color={BEAT_COLOR}   label="P(Beat >10%)" />
                <ProbBar value={selectedResult.pBeat5}   color={BEAT_COLOR}   label="P(Beat >5%)" />
                <ProbBar value={selectedResult.pBeatAny} color={BEAT_COLOR}   label="P(Any Beat)" />
                <ProbBar value={selectedResult.pInLine}  color={INLINE_COLOR} label="P(In-Line ±2%)" />
                <ProbBar value={selectedResult.pMiss5}   color={MISS_COLOR}   label="P(Miss >5%)" />
                <ProbBar value={selectedResult.pMiss10}  color={MISS_COLOR}   label="P(Miss >10%)" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: Cross-stock probability comparison ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cross-Stock Probability Comparison</CardTitle>
              <CardDescription>P(Beat &gt;5%) · P(In-Line) · P(Miss &gt;5%) across all stocks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={comparisonData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<ProbTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="beat5"  name="P(Beat >5%)"  fill={BEAT_COLOR}   fillOpacity={0.8} maxBarSize={24} radius={[2,2,0,0]} />
                  <Bar dataKey="inLine" name="P(In-Line)"   fill={INLINE_COLOR} fillOpacity={0.8} maxBarSize={24} radius={[2,2,0,0]} />
                  <Bar dataKey="miss5"  name="P(Miss >5%)"  fill={MISS_COLOR}   fillOpacity={0.8} maxBarSize={24} radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: Historical Beat Rate vs Implied ── */}
        {isConfigured && histCompareData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historical Beat Rate vs Implied P(Beat)</CardTitle>
              <CardDescription>
                Implied P(Beat) from the model vs realized historical beat rate — gap indicates model calibration quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={histCompareData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<ProbTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={50} stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth={1} />
                  <Bar dataKey="impliedBeat"    name="Implied P(Beat)"    fill={DIST_COLOR} fillOpacity={0.7} maxBarSize={32} radius={[2,2,0,0]} />
                  <Bar dataKey="historicalBeat" name="Historical Beat Rate" fill={HIST_COLOR} fillOpacity={0.7} maxBarSize={32} radius={[2,2,0,0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Detail Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Stock Detail Table
              </CardTitle>
              <CardDescription>Probability breakdown and EPS confidence ranges per stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Ticker', 'μ (EPS)', 'σ', 'P(Beat)', 'P(Beat>5%)', 'P(Beat>10%)',
                        'P(In-Line)', 'P(Miss>5%)', 'P(Miss>10%)', '1σ Range', 'Hist Beat%', 'Hist Avg Sur%'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id}
                        className={`border-t hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedId === r.id ? 'bg-primary/5' : ''}`}
                        onClick={() => setSelectedId(r.id)}>
                        <td className="px-3 py-2 font-semibold text-slate-700">{r.ticker}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.consensus.toFixed(3)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.sigma.toFixed(3)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.pBeatAny.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.pBeat5.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.pBeat10.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.pInLine.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.pMiss5.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.pMiss10.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.range1SigmaLow.toFixed(2)} – {r.range1SigmaHigh.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.historicalBeatRate !== null ? `${r.historicalBeatRate}%` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.historicalAvgSurprise !== null ? `${r.historicalAvgSurprise >= 0 ? '+' : ''}${r.historicalAvgSurprise}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click a row to update the distribution chart.</p>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && selectedResult && (() => {
          const r = selectedResult;
          const calibrationGap = r.historicalBeatRate !== null ? r.historicalBeatRate - r.pBeatAny : null;
          const isWideSigma = r.sigma / r.consensus > 0.08;
          const isHighHistBeat = r.historicalBeatRate !== null && r.historicalBeatRate > 65;
          const avgHistSurprise = results
            .filter(x => x.historicalAvgSurprise !== null)
            .map(x => x.historicalAvgSurprise!);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated earnings surprise probability analysis — {r.ticker}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Distribution Summary — {r.ticker}</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Under a normal distribution with μ = <span className="font-semibold">{r.consensus.toFixed(3)}</span>{' '}
                    and σ = <span className="font-semibold">{r.sigma.toFixed(3)}</span>, the probability of beating
                    the consensus estimate by more than 5% is{' '}
                    <span className="font-semibold" style={{ color: BEAT_COLOR }}>{r.pBeat5.toFixed(1)}%</span>,
                    while the probability of missing by more than 5% is{' '}
                    <span className="font-semibold" style={{ color: MISS_COLOR }}>{r.pMiss5.toFixed(1)}%</span>.
                    The 1σ EPS range spans <span className="font-semibold">{r.range1SigmaLow.toFixed(2)} – {r.range1SigmaHigh.toFixed(2)}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'P(Beat >5%)',   value: `${r.pBeat5.toFixed(1)}%`,   sub: 'meaningful upside surprise' },
                    { label: 'P(In-Line)',     value: `${r.pInLine.toFixed(1)}%`,  sub: 'within ±2% of consensus' },
                    { label: 'P(Miss >5%)',    value: `${r.pMiss5.toFixed(1)}%`,   sub: 'meaningful downside miss' },
                    { label: 'Hist Beat Rate', value: r.historicalBeatRate !== null ? `${r.historicalBeatRate}%` : '—', sub: `${activeStocks.find(s => s.id === r.id)?.historicalSurprises.length ?? 0} quarters` },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Distribution Width & Uncertainty</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isWideSigma
                          ? <>The σ/μ ratio of <span className="font-semibold">{(r.sigma / r.consensus * 100).toFixed(1)}%</span> is relatively high, indicating substantial analyst uncertainty around the consensus. Wide distributions produce fatter tails — both the beat and miss probabilities are elevated. This is typical for high-growth or cyclical companies where earnings are harder to model.</>
                          : <>The σ/μ ratio of <span className="font-semibold">{(r.sigma / r.consensus * 100).toFixed(1)}%</span> is relatively low, indicating tight analyst consensus. The distribution is narrow — most outcomes are clustered near the estimate, and extreme surprises in either direction are unlikely. This is typical for mature, predictable businesses.</>}
                      </p>
                    </div>
                  </div>

                  {calibrationGap !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Model Calibration</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The implied P(Beat) from the model is <span className="font-semibold">{r.pBeatAny.toFixed(1)}%</span>,
                          while the realized historical beat rate is <span className="font-semibold">{r.historicalBeatRate!.toFixed(1)}%</span>{' '}
                          (gap: {calibrationGap >= 0 ? '+' : ''}{calibrationGap.toFixed(1)}pp).{' '}
                          {Math.abs(calibrationGap) < 10
                            ? 'The model is well-calibrated — the implied and historical rates are closely aligned.'
                            : calibrationGap > 0
                            ? 'Historical beats have exceeded the model\'s implied probability — the consensus has historically been set conservatively for this stock, and actual results have tended to beat. Consider whether to adjust σ upward to account for positive skew.'
                            : 'The model implies a higher beat probability than has been realized historically — this may suggest that the current σ underestimates actual downside risk, or that consensus estimates have been set more accurately in recent periods.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {isHighHistBeat && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Systematic Beat Pattern</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {r.ticker} has beaten consensus in <span className="font-semibold">{r.historicalBeatRate!.toFixed(0)}%</span>{' '}
                          of historical quarters — significantly above the 50% implied by a symmetric distribution.
                          This pattern is common among companies that guide conservatively or where sellside models
                          consistently underestimate execution. In practice, this means the effective distribution
                          may be positively skewed, and the normal model's 50/50 split around μ understates beat probability.
                          Traders often embed this historical edge into their positioning.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Practical Usage</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        These probabilities are inputs to options pricing and pre-earnings positioning.
                        A high P(Beat &gt;5%) combined with a high historical beat rate argues for a bullish
                        pre-earnings stance. Conversely, high P(Miss &gt;5%) in a stock that rarely beat in the past
                        suggests asymmetric downside risk. The model assumes a symmetric normal distribution —
                        in reality, analyst estimate revisions, guidance patterns, and industry dynamics can
                        introduce skew not captured here.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Assumes actual EPS ~ N(μ = consensus estimate, σ = analyst dispersion).
                  P(Beat &gt;X%) = 1 − Φ((μ × (1+X/100) − μ) / σ) where Φ is the standard normal CDF.
                  In-Line = P(actual within ±2% of consensus). erf approximation: Abramowitz & Stegun 7.1.26.
                  Historical Beat Rate = fraction of past quarters where actual EPS exceeded consensus.
                  This model assumes symmetric outcomes — actual distributions may exhibit positive skew
                  due to conservative guidance practices.
                  This analysis is for reference only and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
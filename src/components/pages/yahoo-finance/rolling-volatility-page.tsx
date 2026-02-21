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
  AreaChart,
  Area,
  Line,
  Bar,
  BarChart,
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
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Radar,
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

interface RFRow {
  period: string;
  actual: number;
  // Rolling stats (computed over window)
  rollingMean:   number | null;
  rollingStdDev: number | null;
  rollingMin:    number | null;
  rollingMax:    number | null;
  // Forecast bands
  forecastBase:  number | null; // = rollingMean (forward projected)
  forecastHigh:  number | null; // = mean + 1σ
  forecastLow:   number | null; // = mean - 1σ
  forecastHigh2: number | null; // = mean + 2σ
  forecastLow2:  number | null; // = mean - 2σ
  // Growth
  periodGrowth:  number | null;
  rollingGrowth: number | null; // avg growth over window
  // Volatility
  cv: number | null; // Coefficient of Variation = stddev / mean
  isForecast: boolean;
}

// ============================================
// Constants
// ============================================

const ACTUAL_COLOR  = '#6C3AED';
const MEAN_COLOR    = '#3B82F6';
const BAND1_COLOR   = '#10B981';
const BAND2_COLOR   = '#F59E0B';
const VOL_COLOR     = '#EF4444';
const GROWTH_POS    = '#10B981';
const GROWTH_NEG    = '#EF4444';

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const quarters = [
    '2020Q1','2020Q2','2020Q3','2020Q4',
    '2021Q1','2021Q2','2021Q3','2021Q4',
    '2022Q1','2022Q2','2022Q3','2022Q4',
    '2023Q1','2023Q2','2023Q3','2023Q4',
    '2024Q1','2024Q2','2024Q3','2024Q4',
  ];

  let val = 800;
  return quarters.map(q => {
    val = val * (1 + 0.035 + (Math.random() - 0.38) * 0.06);
    return {
      period:  q,
      revenue: parseFloat(val.toFixed(1)),
    };
  });
}

// ============================================
// Rolling Computation
// ============================================

function buildRFRows(
  data: Record<string, any>[],
  periodCol: string,
  valueCol:  string,
  window:    number,
  forecastPeriods: number,
): RFRow[] {
  const raw = data
    .map(r => ({
      period: String(r[periodCol] ?? '').trim(),
      actual: parseFloat(r[valueCol]),
    }))
    .filter(r => r.period && isFinite(r.actual));

  if (!raw.length) return [];

  // Build historical rows
  const rows: RFRow[] = raw.map((r, i) => {
    const slice = raw.slice(Math.max(0, i - window + 1), i + 1);
    const vals  = slice.map(s => s.actual);

    const mean   = vals.reduce((a, b) => a + b, 0) / vals.length;
    const stddev = vals.length > 1
      ? Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (vals.length - 1))
      : 0;
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    const prevActual = i > 0 ? raw[i - 1].actual : null;
    const periodGrowth = prevActual && prevActual !== 0
      ? parseFloat((((r.actual - prevActual) / Math.abs(prevActual)) * 100).toFixed(2))
      : null;

    // Rolling growth: avg of period growths in window
    const growthSlice = raw.slice(Math.max(1, i - window + 1), i + 1);
    const growths = growthSlice.map((s, j) => {
      const prev = raw[Math.max(0, i - window + j)];
      return prev && prev.actual !== 0
        ? (s.actual - prev.actual) / Math.abs(prev.actual) * 100
        : null;
    }).filter((v): v is number => v !== null);
    const rollingGrowth = growths.length
      ? parseFloat((growths.reduce((a, b) => a + b, 0) / growths.length).toFixed(2))
      : null;

    return {
      period: r.period,
      actual: r.actual,
      rollingMean:   parseFloat(mean.toFixed(2)),
      rollingStdDev: parseFloat(stddev.toFixed(2)),
      rollingMin:    parseFloat(min.toFixed(2)),
      rollingMax:    parseFloat(max.toFixed(2)),
      forecastBase:  null,
      forecastHigh:  null,
      forecastLow:   null,
      forecastHigh2: null,
      forecastLow2:  null,
      periodGrowth,
      rollingGrowth,
      cv: mean !== 0 ? parseFloat(((stddev / Math.abs(mean)) * 100).toFixed(2)) : null,
      isForecast: false,
    };
  });

  // Build forecast rows using last window stats + rolling growth
  const lastRow   = rows[rows.length - 1];
  const lastMean  = lastRow.rollingMean  ?? lastRow.actual;
  const lastStd   = lastRow.rollingStdDev ?? 0;
  const lastGrowth = lastRow.rollingGrowth ?? 0;

  // Generate synthetic future period labels
  const lastPeriod = raw[raw.length - 1].period;
  const futurePeriods = generateFuturePeriods(lastPeriod, forecastPeriods);

  let projMean = lastMean;
  for (let f = 0; f < forecastPeriods; f++) {
    projMean = projMean * (1 + lastGrowth / 100);
    // Widen uncertainty bands with horizon
    const uncertainty = lastStd * (1 + f * 0.15);
    rows.push({
      period:        futurePeriods[f],
      actual:        projMean, // projected "actual" line
      rollingMean:   parseFloat(projMean.toFixed(2)),
      rollingStdDev: parseFloat(uncertainty.toFixed(2)),
      rollingMin:    null,
      rollingMax:    null,
      forecastBase:  parseFloat(projMean.toFixed(2)),
      forecastHigh:  parseFloat((projMean + uncertainty).toFixed(2)),
      forecastLow:   parseFloat(Math.max(0, projMean - uncertainty).toFixed(2)),
      forecastHigh2: parseFloat((projMean + uncertainty * 2).toFixed(2)),
      forecastLow2:  parseFloat(Math.max(0, projMean - uncertainty * 2).toFixed(2)),
      periodGrowth:  parseFloat(lastGrowth.toFixed(2)),
      rollingGrowth: parseFloat(lastGrowth.toFixed(2)),
      cv:            lastRow.cv,
      isForecast:    true,
    });
  }

  return rows;
}

function generateFuturePeriods(last: string, n: number): string[] {
  // Try to detect quarter pattern e.g. 2024Q4
  const qMatch = last.match(/^(\d{4})Q(\d)$/);
  if (qMatch) {
    let year = parseInt(qMatch[1]);
    let q    = parseInt(qMatch[2]);
    return Array.from({ length: n }, () => {
      q++;
      if (q > 4) { q = 1; year++; }
      return `${year}Q${q}`;
    });
  }
  // Try year only
  const yMatch = last.match(/^(\d{4})$/);
  if (yMatch) {
    let year = parseInt(yMatch[1]);
    return Array.from({ length: n }, () => `${++year}`);
  }
  // Fallback: append +1, +2 etc.
  return Array.from({ length: n }, (_, i) => `${last}+${i + 1}`);
}

function autoUnit(rows: RFRow[]): string {
  const max = Math.max(...rows.filter(r => !r.isForecast).map(r => Math.abs(r.actual)));
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

const ForecastTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  const isForecast = payload[0]?.payload?.isForecast;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-1.5">
        {label}
        {isForecast && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Forecast</span>}
      </p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined && p.name !== 'band2' && p.name !== 'band1').map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.stroke ?? p.fill ?? p.color }} />
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

const GrowthTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className={`font-mono font-semibold ${p.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

const VolTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}</span>
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
            <Radar className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Rolling Forecast</CardTitle>
        <CardDescription className="text-base mt-2">
          Continuously forecast financial performance using a rolling window — track mean, volatility, and confidence bands that update as new data arrives
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Rolling Window Forecast',
              desc:  'Project forward using a rolling average and standard deviation — forecast bands widen with horizon to reflect increasing uncertainty.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Confidence Bands',
              desc:  'Visualize 1σ and 2σ uncertainty bands around the forecast — see the range of plausible outcomes at each future period.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Volatility Tracking',
              desc:  'Monitor rolling volatility (coefficient of variation) over time — identify periods of elevated uncertainty that affect forecast reliability.',
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
            { color: ACTUAL_COLOR, label: 'Actual',        desc: 'Historical observed values' },
            { color: MEAN_COLOR,   label: 'Rolling Mean',  desc: 'Average over rolling window' },
            { color: BAND1_COLOR,  label: '1σ Band',       desc: '68% confidence interval' },
            { color: BAND2_COLOR,  label: '2σ Band',       desc: '95% confidence interval' },
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
            Use Rolling Forecast when you want a continuously updated projection that adapts to recent performance trends.
            Unlike static annual forecasts, the rolling window approach places more weight on recent data and automatically
            widens uncertainty bands for longer horizons — giving a realistic view of forecast risk.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>period</strong> — time label (e.g. "2023Q1", "2022")</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>value column</strong> — any numeric metric (revenue, EBIT, FCF, etc.)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Forecast chart with 1σ and 2σ confidence bands</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Rolling mean and volatility (CV) trend</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Period growth vs rolling average growth</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Auto-generated forecast reliability insights</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Radar className="mr-2 h-5 w-5" />
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

export default function RollingForecastPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [periodCol,        setPeriodCol]        = useState('');
  const [valueCol,         setValueCol]         = useState('');
  const [windowSize,       setWindowSize]       = useState('4');
  const [forecastPeriods,  setForecastPeriods]  = useState('4');

  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_rolling_forecast.csv');
    setPeriodCol('period');
    setValueCol('revenue');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setValueCol('');
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
    detect(['period', 'quarter', 'year', 'date'],          setPeriodCol, periodCol);
    detect(['revenue', 'sales', 'value', 'ebit', 'fcf'],   setValueCol,  valueCol);
  }, [hasData, allHeaders]);

  // ── Build rows ─────────────────────────────────────────────
  const rfRows = useMemo(() => {
    if (!periodCol || !valueCol) return [];
    return buildRFRows(data, periodCol, valueCol, parseInt(windowSize), parseInt(forecastPeriods));
  }, [data, periodCol, valueCol, windowSize, forecastPeriods]);

  const unit = useMemo(() => autoUnit(rfRows), [rfRows]);

  // ── Chart data ─────────────────────────────────────────────
  const forecastChartData = useMemo(() =>
    rfRows.map(r => ({
      period:       r.period,
      actual:       !r.isForecast ? scaleVal(r.actual, unit) : null,
      forecast:     r.isForecast  ? scaleVal(r.actual, unit) : null,
      rollingMean:  r.rollingMean  !== null ? scaleVal(r.rollingMean, unit)  : null,
      high1:        r.forecastHigh  !== null ? scaleVal(r.forecastHigh, unit)  : null,
      low1:         r.forecastLow   !== null ? scaleVal(r.forecastLow, unit)   : null,
      high2:        r.forecastHigh2 !== null ? scaleVal(r.forecastHigh2, unit) : null,
      low2:         r.forecastLow2  !== null ? scaleVal(r.forecastLow2, unit)  : null,
      // For area chart: band widths
      band2Lower:   r.forecastLow2  !== null ? scaleVal(r.forecastLow2, unit)  : null,
      band2Width:   r.forecastHigh2 !== null && r.forecastLow2 !== null
                      ? scaleVal(r.forecastHigh2 - r.forecastLow2, unit) : null,
      band1Lower:   r.forecastLow   !== null ? scaleVal(r.forecastLow, unit)   : null,
      band1Width:   r.forecastHigh  !== null && r.forecastLow !== null
                      ? scaleVal(r.forecastHigh - r.forecastLow, unit) : null,
      isForecast:   r.isForecast,
    })),
    [rfRows, unit]
  );

  const growthData = useMemo(() =>
    rfRows.map(r => ({
      period:        r.period,
      periodGrowth:  r.periodGrowth,
      rollingGrowth: r.rollingGrowth,
      isForecast:    r.isForecast,
    })),
    [rfRows]
  );

  const volData = useMemo(() =>
    rfRows.map(r => ({
      period: r.period,
      cv:     r.cv,
      stddev: r.rollingStdDev !== null && unit ? scaleVal(r.rollingStdDev, unit) : r.rollingStdDev,
      isForecast: r.isForecast,
    })),
    [rfRows, unit]
  );

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const hist = rfRows.filter(r => !r.isForecast);
    const fore = rfRows.filter(r => r.isForecast);
    if (!hist.length) return null;
    const last = hist[hist.length - 1];
    const avgCV = hist.filter(r => r.cv !== null).reduce((s, r) => s + r.cv!, 0) /
                  hist.filter(r => r.cv !== null).length || null;
    const nextForecast = fore[0];
    return {
      latestActual:   last.actual,
      latestPeriod:   last.period,
      latestMean:     last.rollingMean,
      latestStdDev:   last.rollingStdDev,
      latestCV:       last.cv,
      avgCV:          avgCV ? parseFloat(avgCV.toFixed(2)) : null,
      latestGrowth:   last.rollingGrowth,
      nextForecast:   nextForecast?.forecastBase,
      nextHigh:       nextForecast?.forecastHigh,
      nextLow:        nextForecast?.forecastLow,
      nextPeriod:     nextForecast?.period,
      histPeriods:    hist.length,
      forePeriods:    fore.length,
    };
  }, [rfRows]);

  const isConfigured    = !!(periodCol && valueCol && rfRows.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!rfRows.length) return;
    const rows = rfRows.map(r => ({
      period:         r.period,
      actual:         r.isForecast ? '' : r.actual,
      is_forecast:    r.isForecast ? 'TRUE' : 'FALSE',
      rolling_mean:   r.rollingMean   ?? '',
      rolling_stddev: r.rollingStdDev ?? '',
      forecast_base:  r.forecastBase  ?? '',
      forecast_high1: r.forecastHigh  ?? '',
      forecast_low1:  r.forecastLow   ?? '',
      forecast_high2: r.forecastHigh2 ?? '',
      forecast_low2:  r.forecastLow2  ?? '',
      period_growth:  r.periodGrowth  !== null ? `${r.periodGrowth}%` : '',
      rolling_growth: r.rollingGrowth !== null ? `${r.rollingGrowth}%` : '',
      cv:             r.cv            !== null ? `${r.cv}%` : '',
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `RollingForecast_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [rfRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `RollingForecast_${new Date().toISOString().split('T')[0]}.png`;
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
            <Radar className="h-5 w-5" />
            Rolling Forecast
          </CardTitle>
          <CardDescription>
            Continuously forecast financial performance using a rolling window — track mean, volatility, and confidence bands that update as new data arrives.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Select the metric to forecast and tune the rolling window and forecast horizon.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">PERIOD *</Label>
              <Select value={periodCol || '__none__'} onValueChange={v => setPeriodCol(v === '__none__' ? '' : v)}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">VALUE COLUMN *</Label>
              <Select value={valueCol || '__none__'} onValueChange={v => setValueCol(v === '__none__' ? '' : v)}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">ROLLING WINDOW</Label>
              <Select value={windowSize} onValueChange={setWindowSize}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2','3','4','6','8','12'].map(v => (
                    <SelectItem key={v} value={v}>{v} periods</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">FORECAST HORIZON</Label>
              <Select value={forecastPeriods} onValueChange={setForecastPeriods}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['1','2','3','4','6','8'].map(v => (
                    <SelectItem key={v} value={v}>{v} periods</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Actual</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {fmtNum(stats.latestActual, unit)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{stats.latestPeriod}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Next Forecast</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.nextForecast !== null ? fmtNum(stats.nextForecast, unit) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.nextPeriod} · range {stats.nextLow !== null ? fmtNum(stats.nextLow, unit) : '—'} – {stats.nextHigh !== null ? fmtNum(stats.nextHigh, unit) : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rolling Growth</div>
            <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
              {stats.latestGrowth !== null
                ? (stats.latestGrowth >= 0
                    ? <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" />
                    : <ArrowDownRight className="h-5 w-5 shrink-0 text-red-500" />)
                : <Minus className="h-5 w-5 shrink-0 text-slate-400" />}
              {stats.latestGrowth !== null ? `${stats.latestGrowth >= 0 ? '+' : ''}${stats.latestGrowth.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{windowSize}-period avg</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Volatility (CV)</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.latestCV !== null ? `${stats.latestCV.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Avg: {stats.avgCV !== null ? `${stats.avgCV.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Forecast with Confidence Bands ── */}
        {isConfigured && forecastChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rolling Forecast with Confidence Bands</CardTitle>
              <CardDescription>
                Actual (violet) · Forecast (dashed) · 1σ band (green) · 2σ band (amber) — bands widen with forecast horizon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={forecastChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<ForecastTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                  {/* 2σ band (invisible base + width) */}
                  <Bar dataKey="band2Lower" stackId="b2" fill="transparent" legendType="none" />
                  <Bar dataKey="band2Width" stackId="b2" name="2σ Band" fill={BAND2_COLOR} fillOpacity={0.15} radius={[2,2,0,0]} />

                  {/* 1σ band */}
                  <Bar dataKey="band1Lower" stackId="b1" fill="transparent" legendType="none" />
                  <Bar dataKey="band1Width" stackId="b1" name="1σ Band" fill={BAND1_COLOR} fillOpacity={0.25} radius={[2,2,0,0]} />

                  {/* Rolling mean */}
                  <Line dataKey="rollingMean" name="Rolling Mean" stroke={MEAN_COLOR}
                    strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />

                  {/* Actual */}
                  <Line dataKey="actual" name="Actual" stroke={ACTUAL_COLOR}
                    strokeWidth={2.5} dot={{ r: 3, fill: ACTUAL_COLOR }} connectNulls />

                  {/* Forecast */}
                  <Line dataKey="forecast" name="Forecast" stroke={ACTUAL_COLOR}
                    strokeWidth={2} strokeDasharray="6 3"
                    dot={{ r: 3, fill: 'white', stroke: ACTUAL_COLOR, strokeWidth: 2 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: Growth Rate ── */}
        {isConfigured && growthData.some(r => r.periodGrowth !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Growth Rate — Actual vs Rolling Average</CardTitle>
              <CardDescription>
                Period-over-period growth (bars) vs rolling average growth (line)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={growthData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GrowthTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1.5} />
                  <Bar dataKey="periodGrowth" name="Period Growth" maxBarSize={24} radius={[2, 2, 0, 0]}>
                    {growthData.map((r, i) => (
                      <Cell key={i}
                        fill={(r.periodGrowth ?? 0) >= 0 ? GROWTH_POS : GROWTH_NEG}
                        fillOpacity={r.isForecast ? 0.4 : 0.8}
                      />
                    ))}
                  </Bar>
                  <Line dataKey="rollingGrowth" name="Rolling Avg Growth" stroke={MEAN_COLOR}
                    strokeWidth={2} dot={{ r: 2, fill: MEAN_COLOR }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: Rolling Volatility (CV) ── */}
        {isConfigured && volData.some(r => r.cv !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rolling Volatility — Coefficient of Variation</CardTitle>
              <CardDescription>
                CV = Rolling StdDev / Rolling Mean — higher CV = less predictable, wider forecast bands
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={volData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<VolTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={10} stroke="#F59E0B" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Moderate', position: 'right', fontSize: 9, fill: '#F59E0B' }} />
                  <ReferenceLine y={20} stroke="#EF4444" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'High', position: 'right', fontSize: 9, fill: '#EF4444' }} />
                  <Bar dataKey="cv" name="CV %" maxBarSize={28} radius={[2, 2, 0, 0]}>
                    {volData.map((r, i) => (
                      <Cell key={i}
                        fill={(r.cv ?? 0) >= 20 ? VOL_COLOR : (r.cv ?? 0) >= 10 ? BAND2_COLOR : BAND1_COLOR}
                        fillOpacity={r.isForecast ? 0.4 : 0.8}
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Period Table ── */}
        {isConfigured && rfRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Period Detail Table
              </CardTitle>
              <CardDescription>Historical actuals and forecast values with rolling statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period', 'Type', 'Actual / Forecast', 'Rolling Mean', 'Std Dev', 'CV', 'Growth', 'Forecast Low', 'Forecast High'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...rfRows].reverse().map((r, i) => (
                      <tr key={i} className={`border-t hover:bg-slate-50/50 transition-colors ${r.isForecast ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${r.isForecast ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {r.isForecast ? 'Forecast' : 'Actual'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{fmtNum(r.actual, unit)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.rollingMean !== null ? fmtNum(r.rollingMean, unit) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.rollingStdDev !== null ? fmtNum(r.rollingStdDev, unit) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.cv !== null ? `${r.cv.toFixed(1)}%` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">
                          {r.rollingGrowth !== null ? `${r.rollingGrowth >= 0 ? '+' : ''}${r.rollingGrowth.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.forecastLow  !== null ? fmtNum(r.forecastLow, unit)  : '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.forecastHigh !== null ? fmtNum(r.forecastHigh, unit) : '—'}</td>
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
          const hist = rfRows.filter(r => !r.isForecast);
          const last = hist[hist.length - 1];

          const volatilityLevel =
            (stats.latestCV ?? 0) >= 20 ? 'high' :
            (stats.latestCV ?? 0) >= 10 ? 'moderate' : 'low';

          const growthTrend = (() => {
            const recent = hist.slice(-6).map(r => r.rollingGrowth).filter((v): v is number => v !== null);
            if (recent.length < 4) return null;
            const first2 = (recent[0] + recent[1]) / 2;
            const last2  = (recent[recent.length - 2] + recent[recent.length - 1]) / 2;
            return last2 - first2;
          })();

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated rolling forecast analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Forecast Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Based on a <span className="font-semibold">{windowSize}-period</span> rolling window across{' '}
                    <span className="font-semibold">{stats.histPeriods}</span> historical periods,
                    the next-period forecast is{' '}
                    <span className="font-semibold">{stats.nextForecast !== null ? fmtNum(stats.nextForecast, unit) : '—'}</span>{' '}
                    ({stats.nextPeriod}), with a 1σ range of{' '}
                    <span className="font-semibold">{stats.nextLow !== null ? fmtNum(stats.nextLow, unit) : '—'}</span> – <span className="font-semibold">{stats.nextHigh !== null ? fmtNum(stats.nextHigh, unit) : '—'}</span>.
                    Current volatility is <span className={`font-semibold ${volatilityLevel === 'high' ? 'text-red-500' : volatilityLevel === 'moderate' ? 'text-amber-600' : 'text-emerald-600'}`}>{volatilityLevel}</span>{' '}
                    (CV: {stats.latestCV !== null ? `${stats.latestCV.toFixed(1)}%` : '—'}).
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Window Size',     value: `${windowSize} periods`,                            sub: 'rolling lookback' },
                    { label: 'Rolling Growth',  value: stats.latestGrowth !== null ? `${stats.latestGrowth >= 0 ? '+' : ''}${stats.latestGrowth.toFixed(1)}%` : '—', sub: 'avg per period' },
                    { label: 'Volatility (CV)', value: stats.latestCV !== null ? `${stats.latestCV.toFixed(1)}%` : '—', sub: volatilityLevel + ' volatility' },
                    { label: 'Forecast Periods', value: `${stats.forePeriods}`,                            sub: 'periods ahead' },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Forecast Reliability</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {volatilityLevel === 'low'
                          ? `With a CV of ${stats.latestCV?.toFixed(1)}%, the series is highly predictable. The rolling mean provides a reliable baseline and the confidence bands are relatively tight — forecasts should be treated with high confidence, particularly for the near-term horizon.`
                          : volatilityLevel === 'moderate'
                          ? `A CV of ${stats.latestCV?.toFixed(1)}% indicates moderate variability. Near-term forecasts (1–2 periods) should be reliable, but confidence bands widen meaningfully for longer horizons. Use the 1σ band as a planning range and the 2σ band as a stress scenario.`
                          : `High volatility (CV: ${stats.latestCV?.toFixed(1)}%) means individual period outcomes deviate significantly from the rolling mean. Forecast bands are wide and should be treated as scenario ranges rather than point estimates. Consider whether external factors are driving the volatility before relying on statistical forecasts alone.`}
                      </p>
                    </div>
                  </div>

                  {growthTrend !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Growth Momentum</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Rolling growth has{' '}
                          {growthTrend > 0.5
                            ? <><span className="text-emerald-600 font-semibold">accelerated by {growthTrend.toFixed(1)}pp</span> over recent periods — improving momentum that supports an optimistic forecast outlook. If sustained, the upper confidence band may underestimate actual performance.</>
                            : growthTrend < -0.5
                            ? <><span className="text-red-500 font-semibold">decelerated by {Math.abs(growthTrend).toFixed(1)}pp</span> over recent periods — decelerating growth suggests the rolling mean may overstate near-term performance. The lower confidence band deserves attention as a more conservative planning scenario.</>
                            : <>been <span className="font-semibold">broadly stable</span> — consistent growth rates increase the reliability of the rolling mean as a forecast baseline.</>}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Window Size Effect</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The current {windowSize}-period window{' '}
                        {parseInt(windowSize) <= 3
                          ? 'is short and responsive — it reacts quickly to recent trends but may be noisy. Consider a longer window if the series has high period-to-period variance.'
                          : parseInt(windowSize) <= 6
                          ? 'provides a balanced view — recent enough to capture trend shifts while smoothing out short-term noise. Suitable for most quarterly financial series.'
                          : 'is long and stable — it smooths out noise effectively but reacts slowly to structural trend changes. If underlying growth is shifting, consider a shorter window to capture the new trend faster.'}
                        {' '}Adjusting the window size will shift both the rolling mean and the forecast bands.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Rolling Mean and StdDev are computed over the selected window using expanding statistics for early periods.
                  Forecast = Rolling Mean projected forward using rolling average growth rate.
                  1σ band = ±1 standard deviation (≈68% of outcomes if normally distributed).
                  2σ band = ±2 standard deviations (≈95%). Uncertainty bands widen by 15% per additional forecast period.
                  CV = StdDev / Mean × 100. This analysis is auto-generated for reference only and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
  Activity,
  Layers,
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
// Constants
// ============================================

const DRIVER_COLORS: Record<string, string> = {
  interest_rate: '#EF4444',
  oil:           '#F59E0B',
  usd:           '#3B82F6',
  custom1:       '#10B981',
  custom2:       '#8B5CF6',
};

const WINDOW_SIZES = [21, 63, 126] as const;
type WindowSize = typeof WINDOW_SIZES[number];

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2020-01-03');

  let price = 3230;
  let rate  = 1.75;
  let oil   = 58;
  let usd   = 97;

  const shocks = [
    { day: 38,  priceD: -0.06, rateD: -0.5,  oilD: -25, usdD:  4  },
    { day: 55,  priceD: -0.04, rateD: -1.0,  oilD: -15, usdD:  3  },
    { day: 80,  priceD:  0.04, rateD:  0,    oilD:  10, usdD: -2  },
    { day: 200, priceD:  0.02, rateD:  0,    oilD:  8,  usdD: -3  },
    { day: 380, priceD:  0.01, rateD:  0.25, oilD:  12, usdD:  2  },
    { day: 430, priceD: -0.02, rateD:  0.5,  oilD:  8,  usdD:  3  },
    { day: 480, priceD: -0.03, rateD:  0.75, oilD:  5,  usdD:  2  },
    { day: 560, priceD: -0.02, rateD:  0.5,  oilD: -6,  usdD:  1  },
    { day: 650, priceD:  0.02, rateD: -0.25, oilD: -4,  usdD: -2  },
    { day: 700, priceD:  0.02, rateD:  0,    oilD:  3,  usdD: -1  },
  ];

  for (let d = 0; d < 756; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const shock = shocks.find((s) => s.day === d);
    if (shock) {
      price = price * (1 + shock.priceD);
      rate  = Math.max(0, rate + shock.rateD);
      oil   = Math.max(10, oil  + shock.oilD);
      usd   = Math.max(80, usd  + shock.usdD);
    }

    // Rate hike → price tends to fall; oil up → mixed; USD up → price tends to fall
    const rateNoise  = (Math.random() - 0.5) * 0.02;
    const oilNoise   = (Math.random() - 0.5) * 1.2;
    const usdNoise   = (Math.random() - 0.5) * 0.25;
    const priceNoise = (Math.random() - 0.5) * 22
      - rateNoise * 400
      - usdNoise  * 30
      + oilNoise  * 1.5;

    rate  = Math.max(0,  rate  + rateNoise);
    oil   = Math.max(10, oil   + oilNoise);
    usd   = Math.max(80, usd   + usdNoise);
    price = Math.max(500, price + priceNoise);

    const ret = rows.length > 0
      ? ((price - (rows[rows.length - 1].price as number)) / (rows[rows.length - 1].price as number)) * 100
      : 0;

    rows.push({
      date:          date.toISOString().split('T')[0],
      price:         parseFloat(price.toFixed(2)),
      daily_return:  parseFloat(ret.toFixed(4)),
      interest_rate: parseFloat(rate.toFixed(3)),
      oil:           parseFloat(oil.toFixed(2)),
      usd_index:     parseFloat(usd.toFixed(2)),
    });
  }
  return rows;
}

// ============================================
// Helpers
// ============================================

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return 0;
  const mx = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

// Rolling correlation over a sliding window
function rollingCorr(xs: number[], ys: number[], window: number): (number | null)[] {
  const result: (number | null)[] = new Array(window - 1).fill(null);
  for (let i = window - 1; i < xs.length; i++) {
    result.push(pearson(xs.slice(i - window + 1, i + 1), ys.slice(i - window + 1, i + 1)));
  }
  return result;
}

function corrStrength(r: number): string {
  const a = Math.abs(r);
  if (a >= 0.7) return 'Very strong';
  if (a >= 0.5) return 'Strong';
  if (a >= 0.3) return 'Moderate';
  if (a >= 0.1) return 'Weak';
  return 'Negligible';
}

// ============================================
// Tooltips
// ============================================

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
          </span>
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
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</span>
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
            <Activity className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Stock vs. Macro Drivers</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze how correlations between stock prices and macro variables — interest rates, oil, and the dollar — shift over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Activity  className="w-6 h-6 text-primary mb-2" />, title: 'Rolling Correlation',  desc: 'Track how the relationship between stock returns and each macro driver evolves using a sliding time window' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Driver Comparison',    desc: 'Side-by-side static correlation for all drivers — quickly identify which macro variable matters most right now' },
            { icon: <Layers    className="w-6 h-6 text-primary mb-2" />, title: 'Regime Shifts',        desc: 'Detect when correlations flip sign — e.g. when rising rates stop being a headwind — as a macro regime signal' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use this analysis before making top-down allocation decisions.
            Understanding which macro driver is currently dominant — and whether the relationship is strengthening or breaking down — helps avoid being on the wrong side of a regime shift.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — Trading date</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>stock return or price</strong> — Equity series</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>1+ macro driver columns</strong> — Rate, oil, FX, etc.</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Rolling correlation chart per driver</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Static correlation bar chart comparison</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Dominant driver identification + insights</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Activity className="mr-2 h-5 w-5" />
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

export default function StockVsMacroDriversPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {
  // ✅ internalData 제거 — 앱 state 직접 사용
  const hasData = data.length > 0;

  const [dateCol,    setDateCol]    = useState('');
  const [stockCol,   setStockCol]   = useState('');
  const [rateCol,    setRateCol]    = useState('');
  const [oilCol,     setOilCol]     = useState('');
  const [usdCol,     setUsdCol]     = useState('');
  const [custom1Col, setCustom1Col] = useState('');
  const [custom2Col, setCustom2Col] = useState('');
  const [window,     setWindow]     = useState<WindowSize>(63);

  const [previewOpen,    setPreviewOpen]    = useState(false);
  const [isDownloading,  setIsDownloading]  = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  // ✅ onExampleLoaded 콜백으로 앱 state 에 직접 반영
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_stock_macro.csv');
    // 컬럼 선택은 auto-detect useMemo 가 처리
    setWindow(63);
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  // ✅ 자체 state 초기화 + 앱 state 초기화
  const handleClearAll = useCallback(() => {
    setDateCol(''); setStockCol(''); setRateCol(''); setOilCol(''); setUsdCol('');
    setCustom1Col(''); setCustom2Col('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect (예제 & 업로드 모두 처리) ─────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map((s) => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex((c) => kws.some((k) => c === k));
      if (idx === -1) idx = h.findIndex((c) => kws.some((k) => k.length > 3 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['date'],                              setDateCol,  dateCol);
    detect(['daily_return', 'return', 'ret'],     setStockCol, stockCol);
    detect(['interest_rate', 'rate', 'fed_rate'], setRateCol,  rateCol);
    detect(['oil', 'wti', 'crude'],               setOilCol,   oilCol);
    detect(['usd_index', 'dxy', 'usd', 'dollar'], setUsdCol,   usdCol);
  }, [hasData, allHeaders]);

  // ── Active drivers ─────────────────────────────────────────
  const drivers = useMemo(() => [
    { key: 'interest_rate', col: rateCol,    label: rateCol    || 'Interest Rate', color: DRIVER_COLORS.interest_rate },
    { key: 'oil',           col: oilCol,     label: oilCol     || 'Oil',           color: DRIVER_COLORS.oil           },
    { key: 'usd',           col: usdCol,     label: usdCol     || 'USD Index',     color: DRIVER_COLORS.usd           },
    { key: 'custom1',       col: custom1Col, label: custom1Col || 'Custom 1',      color: DRIVER_COLORS.custom1       },
    { key: 'custom2',       col: custom2Col, label: custom2Col || 'Custom 2',      color: DRIVER_COLORS.custom2       },
  ].filter((d) => d.col), [rateCol, oilCol, usdCol, custom1Col, custom2Col]);

  // ── Raw series ─────────────────────────────────────────────
  const stockValues = useMemo(() =>
    data.map((r) => parseFloat(r[stockCol])).filter((v) => !isNaN(v)),
    [data, stockCol],
  );

  const driverValues = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const d of drivers) {
      result[d.key] = data.map((r) => parseFloat(r[d.col])).filter((v) => !isNaN(v));
    }
    return result;
  }, [data, drivers]);

  const dates = useMemo(() =>
    data.map((r) => String(r[dateCol] ?? '')).filter(Boolean),
    [data, dateCol],
  );

  // ── Static (full-period) correlations ─────────────────────
  const staticCorr = useMemo(() =>
    drivers.map((d) => ({
      ...d,
      corr: pearson(stockValues, driverValues[d.key] ?? []),
    })),
    [drivers, stockValues, driverValues],
  );

  // ── Rolling correlation data ───────────────────────────────
  const rollingData = useMemo(() => {
    if (!dates.length || !stockValues.length) return [];
    const series: Record<string, (number | null)[]> = {};
    for (const d of drivers) {
      series[d.key] = rollingCorr(stockValues, driverValues[d.key] ?? [], window);
    }
    return dates.map((date, i) => {
      const entry: Record<string, any> = { date };
      for (const d of drivers) {
        entry[d.key] = series[d.key]?.[i] !== null && series[d.key]?.[i] !== undefined
          ? parseFloat((series[d.key][i] as number).toFixed(4))
          : null;
      }
      return entry;
    });
  }, [dates, stockValues, driverValues, drivers, window]);

  // ── Static corr bar data ───────────────────────────────────
  const corrBarData = useMemo(() =>
    staticCorr.map((d) => ({
      name:  d.label,
      corr:  parseFloat(d.corr.toFixed(3)),
      color: d.color,
    })).sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr)),
    [staticCorr],
  );

  // ── Dominant driver ────────────────────────────────────────
  const dominant = useMemo(() =>
    staticCorr.length
      ? staticCorr.reduce((a, b) => Math.abs(a.corr) > Math.abs(b.corr) ? a : b)
      : null,
    [staticCorr],
  );

  const isConfigured    = !!(dateCol && stockCol && drivers.length > 0 && rollingData.length > 0);
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!staticCorr.length) return;
    const csv = Papa.unparse(staticCorr.map((d) => ({
      driver:       d.label,
      full_corr:    d.corr.toFixed(4),
      strength:     corrStrength(d.corr),
      direction:    d.corr >= 0 ? 'positive' : 'negative',
    })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `StockMacroDrivers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [staticCorr, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `StockMacroDrivers_${new Date().toISOString().split('T')[0]}.png`;
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 1</span>
            <span className="text-xs text-muted-foreground">Macro & Sector</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Stock vs. Macro Drivers
          </CardTitle>
          <CardDescription>
            Analyze how correlations between stock returns and macro variables — interest rates, oil, and the dollar — shift over time.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map your columns. Stock return required; macro driver columns are optional but at least one needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { label: 'DATE *',          value: dateCol,    setter: setDateCol,    headers: allHeaders,      opt: false },
              { label: 'STOCK RETURN *',  value: stockCol,   setter: setStockCol,   headers: numericHeaders,  opt: false },
              { label: 'INTEREST RATE',   value: rateCol,    setter: setRateCol,    headers: numericHeaders,  opt: true  },
              { label: 'OIL PRICE',       value: oilCol,     setter: setOilCol,     headers: numericHeaders,  opt: true  },
              { label: 'USD INDEX',       value: usdCol,     setter: setUsdCol,     headers: numericHeaders,  opt: true  },
              { label: 'CUSTOM 1',        value: custom1Col, setter: setCustom1Col, headers: numericHeaders,  opt: true  },
              { label: 'CUSTOM 2',        value: custom2Col, setter: setCustom2Col, headers: numericHeaders,  opt: true  },
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
      {isConfigured && dominant && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dominant Driver</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight truncate">{dominant.label}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{corrStrength(dominant.corr)} · r = {dominant.corr.toFixed(3)}</div>
          </div>
          {staticCorr.slice(0, 3).map((d) => (
            <div key={d.key} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 truncate">{d.label}</div>
              <div className="text-2xl font-bold text-slate-800 leading-tight font-mono">{d.corr.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {corrStrength(d.corr)} {d.corr >= 0 ? 'positive' : 'negative'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Static Correlation Bar ── */}
        {isConfigured && corrBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Full-Period Correlation with Stock Returns</CardTitle>
              <CardDescription>Pearson correlation coefficient — sorted by absolute strength</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, corrBarData.length * 52)}>
                <BarChart data={corrBarData} layout="vertical"
                  margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false} axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={(v) => v.toFixed(1)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false} axisLine={false} width={110} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="corr" name="Correlation" radius={[0, 3, 3, 0]} maxBarSize={28}>
                    {corrBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Rolling Correlation Chart ── */}
        {isConfigured && rollingData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Rolling Correlation Over Time</CardTitle>
                  <CardDescription>
                    {window}-day sliding window — shows how relationships shift across market regimes
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {WINDOW_SIZES.map((w) => (
                    <button key={w} onClick={() => setWindow(w)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all
                        ${window === w
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {w === 21 ? '1M' : w === 63 ? '3M' : '6M'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rollingData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={60} />
                  <YAxis domain={[-1, 1]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} tickFormatter={(v) => v.toFixed(1)} width={36} />
                  <Tooltip content={<LineTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  <ReferenceLine y={0}    stroke="#CBD5E1" strokeWidth={1} />
                  <ReferenceLine y={0.5}  stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={-0.5} stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth={1} />
                  {drivers.map((d) => (
                    <Line key={d.key} type="monotone" dataKey={d.key} name={d.label}
                      stroke={d.color} strokeWidth={1.5} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Correlation Table ── */}
        {isConfigured && staticCorr.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Correlation Summary</CardTitle>
              <CardDescription>Full-period Pearson r and qualitative interpretation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Driver', 'Correlation (r)', 'Strength', 'Direction', 'Interpretation'].map((h) => (
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Driver' || h === 'Interpretation' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...staticCorr].sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr)).map((d) => (
                      <tr key={d.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="font-medium text-slate-700">{d.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          <span className={d.corr >= 0 ? 'text-primary' : 'text-slate-500'}>
                            {d.corr >= 0 ? '+' : ''}{d.corr.toFixed(3)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{corrStrength(d.corr)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{d.corr >= 0 ? 'Positive' : 'Negative'}</td>
                        <td className="px-4 py-3 text-left text-xs text-muted-foreground max-w-[200px]">
                          {Math.abs(d.corr) < 0.1
                            ? 'No meaningful relationship with stock returns'
                            : d.corr < 0
                            ? `Rising ${d.label} tends to coincide with falling returns`
                            : `Rising ${d.label} tends to coincide with rising returns`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && dominant && (() => {
          const sorted       = [...staticCorr].sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
          const second       = sorted[1];
          const signFlippers = drivers.filter((d) => {
            const series = rollingData.map((r) => r[d.key]).filter((v) => v !== null) as number[];
            if (series.length < 10) return false;
            const recent = series.slice(-20);
            const earlier = series.slice(-60, -20);
            if (!recent.length || !earlier.length) return false;
            const avgRecent  = recent.reduce((s, v) => s + v, 0) / recent.length;
            const avgEarlier = earlier.reduce((s, v) => s + v, 0) / earlier.length;
            return Math.sign(avgRecent) !== Math.sign(avgEarlier);
          });

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated macro driver analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Macro Driver Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    The dominant macro driver of stock returns over the full period is{' '}
                    <span className="font-semibold">{dominant.label}</span> with a correlation of{' '}
                    <span className="font-mono font-semibold">{dominant.corr.toFixed(3)}</span> ({corrStrength(dominant.corr).toLowerCase()}{' '}
                    {dominant.corr >= 0 ? 'positive' : 'negative'} relationship).
                    {second && ` The second most influential driver is ${second.label} at r = ${second.corr.toFixed(3)}.`}
                  </p>
                </div>

                {/* Metric tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {sorted.slice(0, 4).map((d) => (
                    <div key={d.key} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 truncate">{d.label}</div>
                      <div className="text-lg font-bold font-mono text-slate-700">{d.corr.toFixed(3)}</div>
                      <div className="text-xs text-muted-foreground">{corrStrength(d.corr)}</div>
                    </div>
                  ))}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Dominant Driver — {dominant.label}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        With a {corrStrength(dominant.corr).toLowerCase()} {dominant.corr >= 0 ? 'positive' : 'negative'} correlation of{' '}
                        <span className="font-mono font-semibold">{dominant.corr.toFixed(3)}</span>,{' '}
                        {dominant.label} has been the most influential macro driver of stock returns over the analysis period.
                        {dominant.corr < -0.3
                          ? ` This negative relationship means that when ${dominant.label} rises, stock returns have tended to fall — a classic macro headwind dynamic.`
                          : dominant.corr > 0.3
                          ? ` This positive relationship means that ${dominant.label} and stock returns have been moving in the same direction.`
                          : ` The relationship is present but modest — other factors are also shaping returns.`}
                      </p>
                    </div>
                  </div>

                  {signFlippers.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Correlation Regime Shift Detected</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The rolling correlation for{' '}
                          <span className="font-semibold">{signFlippers.map((d) => d.label).join(', ')}</span>{' '}
                          has recently flipped sign compared to earlier in the period.
                          This regime shift suggests the macro relationship is evolving —
                          strategies built on historical correlations may need to be re-evaluated.
                        </p>
                      </div>
                    </div>
                  )}

                  {sorted.some((d) => Math.abs(d.corr) < 0.1) && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Negligible Drivers</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {sorted.filter((d) => Math.abs(d.corr) < 0.1).map((d) => d.label).join(', ')}{' '}
                          show negligible correlation with stock returns over this period.
                          This does not mean these drivers are permanently irrelevant — their influence often emerges during specific macro regimes.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Rolling Window Interpretation</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The {window}-day rolling correlation chart shows when these macro relationships were strongest or weakest.
                        Periods where correlations converge toward zero indicate idiosyncratic equity-specific factors were dominating.
                        Periods of extreme readings (above +0.5 or below −0.5) reflect strong macro regime influence on equity direction.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Correlations are computed using Pearson's method. Rolling correlation uses a {window}-day sliding window.
                  Correlation measures linear association only and does not imply causation.
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
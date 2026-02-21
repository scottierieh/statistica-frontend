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
  Globe,
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
  Activity,
  BarChart3,
  Layers,
  AlertTriangle,
  ArrowUpDown,
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

type RegimeType = 'bull' | 'bear' | 'sideways' | 'volatile';

interface RegimeRow {
  date: string;
  regime: RegimeType;
  regimeLabel: string;
  returnVal: number;
  volatility: number;
  [key: string]: any;
}

interface RegimeSummary {
  regime: RegimeType;
  label: string;
  count: number;
  pct: number;
  avgReturn: number;
  avgVolatility: number;
}

// ============================================
// Constants
// ============================================

const REGIME_CONFIG: Record<RegimeType, {
  label: string; hex: string;
}> = {
  bull:      { label: 'Bull Market',     hex: '#10B981' },
  bear:      { label: 'Bear Market',     hex: '#EF4444' },
  sideways:  { label: 'Sideways',        hex: '#F59E0B' },
  volatile:  { label: 'High Volatility', hex: '#8B5CF6' },
};

// ============================================
// Example Data Generator
// ============================================

function generateExampleData(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const startDate = new Date('2020-01-03');
  let price = 100;
  let vol = 0.15;

  // Regime phases: bull → bear (crash) → sideways → bull → volatile
  const phases: { regime: RegimeType; drift: number; volBase: number; days: number }[] = [
    { regime: 'bull',     drift:  0.0008, volBase: 0.010, days: 60  },
    { regime: 'bear',     drift: -0.0025, volBase: 0.028, days: 45  },
    { regime: 'volatile', drift:  0.0002, volBase: 0.035, days: 40  },
    { regime: 'sideways', drift:  0.0001, volBase: 0.008, days: 60  },
    { regime: 'bull',     drift:  0.0012, volBase: 0.012, days: 80  },
    { regime: 'volatile', drift: -0.0005, volBase: 0.030, days: 35  },
    { regime: 'sideways', drift:  0.0000, volBase: 0.009, days: 50  },
    { regime: 'bull',     drift:  0.0010, volBase: 0.011, days: 70  },
  ];

  let d = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      if (date.getDay() === 0 || date.getDay() === 6) { d++; i--; continue; }

      const dailyRet = phase.drift + (Math.random() - 0.5) * phase.volBase * 2;
      price = price * (1 + dailyRet);
      const rollingVol = phase.volBase * (0.8 + Math.random() * 0.4);

      rows.push({
        date:       date.toISOString().split('T')[0],
        close:      parseFloat(price.toFixed(2)),
        daily_return: parseFloat((dailyRet * 100).toFixed(4)),
        volatility: parseFloat((rollingVol * 100).toFixed(4)),
        vix:        parseFloat((rollingVol * 100 * 6 + 5 + Math.random() * 3).toFixed(2)),
        regime:     phase.regime,
      });
      d++;
    }
  }
  return rows;
}

// ============================================
// Classify regime from data
// ============================================

function classifyRegimes(
  data: Record<string, any>[],
  dateCol: string,
  returnCol: string,
  volCol: string,
  regimeCol: string,
): RegimeRow[] {
  // If user already has a regime column, use it; otherwise auto-classify
  return data.map((row) => {
    const ret = parseFloat(row[returnCol]) || 0;
    const vol = parseFloat(row[volCol]) || 0;
    let regime: RegimeType;

    if (regimeCol && row[regimeCol]) {
      const raw = String(row[regimeCol]).toLowerCase().trim();
      if      (raw.includes('bull'))     regime = 'bull';
      else if (raw.includes('bear'))     regime = 'bear';
      else if (raw.includes('vol'))      regime = 'volatile';
      else if (raw.includes('side') || raw.includes('flat') || raw.includes('neutral')) regime = 'sideways';
      else if (ret > 0.05)               regime = 'bull';
      else if (ret < -0.05)              regime = 'bear';
      else if (vol > 2.5)                regime = 'volatile';
      else                               regime = 'sideways';
    } else {
      // Auto-classify based on return + volatility
      if      (vol > 2.5 && Math.abs(ret) > 0.15) regime = 'volatile';
      else if (ret > 0.05)                          regime = 'bull';
      else if (ret < -0.05)                         regime = 'bear';
      else if (vol > 1.8)                           regime = 'volatile';
      else                                          regime = 'sideways';
    }

    return {
      date:       String(row[dateCol] ?? ''),
      regime,
      regimeLabel: REGIME_CONFIG[regime].label,
      returnVal:  ret,
      volatility: vol,
      ...row,
    };
  }).filter((r) => r.date);
}

function buildRegimeSummary(rows: RegimeRow[]): RegimeSummary[] {
  const total = rows.length;
  return (['bull', 'bear', 'sideways', 'volatile'] as RegimeType[]).map((regime) => {
    const subset = rows.filter((r) => r.regime === regime);
    const count  = subset.length;
    const avgReturn    = count > 0 ? subset.reduce((s, r) => s + r.returnVal, 0) / count : 0;
    const avgVolatility = count > 0 ? subset.reduce((s, r) => s + r.volatility, 0) / count : 0;
    return { regime, label: REGIME_CONFIG[regime].label, count, pct: total > 0 ? (count / total) * 100 : 0, avgReturn, avgVolatility };
  });
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
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
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
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
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
            <Globe className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Macro Regime Classification</CardTitle>
        <CardDescription className="text-base mt-2">
          Classify current market regimes based on macroeconomic indicators and volatility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Layers className="w-6 h-6 text-primary mb-2" />,   title: 'Regime Detection',    desc: 'Automatically classify each period as Bull, Bear, Sideways, or High-Volatility using return and volatility signals' },
            { icon: <Activity className="w-6 h-6 text-primary mb-2" />, title: 'Volatility Analysis', desc: 'Track rolling volatility to identify regime transitions and stress periods in the market cycle' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Regime Statistics',  desc: 'Compare average returns, volatility, and time-in-regime across all four market states' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Regime legend */}
        <div className="grid md:grid-cols-4 gap-3">
          {(Object.entries(REGIME_CONFIG) as [RegimeType, typeof REGIME_CONFIG[RegimeType]][]).map(([key, cfg]) => (
            <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{cfg.label}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {key === 'bull'     ? 'Positive returns, low vol'
                : key === 'bear'    ? 'Negative returns, high vol'
                : key === 'sideways'? 'Flat returns, low vol'
                :                    'Extreme volatility spike'}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use Macro Regime Classification to understand the current market environment before making allocation decisions.
            Identifying the regime helps calibrate position sizing, factor exposure, and hedging strategy.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>date</strong> — Trading date</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>daily_return</strong> — Daily return (%)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>volatility</strong> — Rolling volatility (%)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Timeline chart colored by regime</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Regime distribution & statistics</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Auto-generated regime insights</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Globe className="mr-2 h-5 w-5" />
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

export default function MarketRegimePage({
  data,
  allHeaders,
  numericHeaders,
  categoricalHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {
  const hasData     = data.length > 0;

  const [dateCol,    setDateCol]    = useState('');
  const [returnCol,  setReturnCol]  = useState('');
  const [volCol,     setVolCol]     = useState('');
  const [regimeCol,  setRegimeCol]  = useState('');  // optional: pre-labeled column
  const [priceCol,   setPriceCol]   = useState('');  // optional: price for overlay

  const [previewOpen, setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_macro_regime.csv');
    setDateCol('date');
    setReturnCol('daily_return');
    setVolCol('volatility');
    setRegimeCol('regime');
    setPriceCol('close');
  }, []);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setReturnCol(''); setVolCol(''); setRegimeCol(''); setPriceCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect columns ───────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map((s) => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex((c) => kws.some((k) => c === k));
      if (idx === -1) idx = h.findIndex((c) => kws.some((k) => k.length > 3 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['date'],                               setDateCol,   dateCol);
    detect(['daily_return', 'return', 'ret'],      setReturnCol, returnCol);
    detect(['volatility', 'vol', 'realized_vol'],  setVolCol,    volCol);
    detect(['regime', 'market_regime', 'state'],   setRegimeCol, regimeCol);
    detect(['close', 'price', 'adj_close'],        setPriceCol,  priceCol);
  }, [hasData, allHeaders]);


  // ── Build classified rows ─────────────────────────────────
  const regimeRows = useMemo(() => {
    if (!dateCol || !returnCol || !volCol) return [];
    return classifyRegimes(data, dateCol, returnCol, volCol, regimeCol);
  }, [data, dateCol, returnCol, volCol, regimeCol]);

  // ── Summary per regime ────────────────────────────────────
  const summary = useMemo(() => buildRegimeSummary(regimeRows), [regimeRows]);

  // ── Current regime (last row) ──────────────────────────────
  const currentRegime = regimeRows.length > 0 ? regimeRows[regimeRows.length - 1] : null;

  // ── Timeline chart data ───────────────────────────────────
  const timelineData = useMemo(() => regimeRows.map((r) => ({
    date:      r.date,
    return:    r.returnVal,
    volatility: r.volatility,
    price:     priceCol ? parseFloat(r[priceCol]) || null : null,
    regime:    r.regime,
    color:     REGIME_CONFIG[r.regime].hex,
  })), [regimeRows, priceCol]);

  // ── Regime distribution bar data ─────────────────────────
  const distData = useMemo(() =>
    summary.map((s) => ({ name: s.label, days: s.count, pct: parseFloat(s.pct.toFixed(1)) })),
    [summary],
  );

  const isConfigured = !!(dateCol && returnCol && volCol && regimeRows.length > 0);

  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!regimeRows.length) return;
    const csv = Papa.unparse(regimeRows.map((r) => ({
      date:       r.date,
      regime:     r.regime,
      regime_label: r.regimeLabel,
      daily_return: r.returnVal.toFixed(4),
      volatility: r.volatility.toFixed(4),
    })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `MacroRegime_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [regimeRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `MacroRegime_${new Date().toISOString().split('T')[0]}.png`;
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
    <div className="w-full max-w-6xl mx-auto space-y-6">

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
            <Globe className="h-5 w-5" />
            Macro Regime Classification
          </CardTitle>
          <CardDescription>
            Classify market regimes based on macroeconomic indicators and volatility. Identify Bull, Bear, Sideways, and High-Volatility periods.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Map your columns. Required: date, daily return, volatility.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: 'DATE *',          value: dateCol,   setter: setDateCol,   headers: allHeaders,     opt: false },
              { label: 'DAILY RETURN *',  value: returnCol, setter: setReturnCol, headers: numericHeaders, opt: false },
              { label: 'VOLATILITY *',    value: volCol,    setter: setVolCol,    headers: numericHeaders, opt: false },
              { label: 'REGIME COLUMN',   value: regimeCol, setter: setRegimeCol, headers: allHeaders,     opt: true  },
              { label: 'PRICE (OVERLAY)', value: priceCol,  setter: setPriceCol,  headers: numericHeaders, opt: true  },
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

      {/* ── Current Regime + Summary Tiles ── */}
      {isConfigured && currentRegime && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Current Regime */}
          <div className="col-span-2 md:col-span-1 rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Regime</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {REGIME_CONFIG[currentRegime.regime].label}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              as of {currentRegime.date}
            </div>
          </div>
          {/* 4 regime summary tiles */}
          {summary.map((s) => {
            const cfg = REGIME_CONFIG[s.regime];
            return (
              <div key={s.regime} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cfg.label}</div>
                <div className="text-2xl font-bold text-slate-800 leading-tight">{s.count}</div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {s.pct.toFixed(1)}% — avg {s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(2)}%/day
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Volatility Timeline ── */}
        {isConfigured && timelineData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Volatility Timeline by Regime</CardTitle>
              <CardDescription>Rolling volatility colored by classified regime</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timelineData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }} barCategoryGap="0%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    minTickGap={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    width={42}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="volatility" name="Volatility %" radius={[1, 1, 0, 0]} maxBarSize={8}>
                    {timelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Regime legend */}
              <div className="flex flex-wrap gap-3 mt-3 justify-end">
                {(Object.entries(REGIME_CONFIG) as [RegimeType, typeof REGIME_CONFIG[RegimeType]][]).map(([, cfg]) => (
                  <div key={cfg.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cfg.hex }} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Return Timeline ── */}
        {isConfigured && timelineData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Return Timeline</CardTitle>
              <CardDescription>Daily returns with regime-colored bars</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timelineData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }} barCategoryGap="0%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}%`} width={42} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="return" name="Daily Return %" radius={[1, 1, 0, 0]} maxBarSize={6}>
                    {timelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Price Overlay (optional) ── */}
        {isConfigured && priceCol && timelineData.some((d) => d.price !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price with Regime Overlay</CardTitle>
              <CardDescription>Price trend colored by prevailing regime</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timelineData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} minTickGap={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)} width={42} />
                  <Tooltip content={<LineTooltip />} />
                  <Line type="monotone" dataKey="price" name="Price" stroke="#6C3AED"
                    strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Regime Distribution Bar Chart ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Regime Distribution</CardTitle>
              <CardDescription>Number of days spent in each market regime</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={distData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="days" name="Days" radius={[3, 3, 0, 0]} maxBarSize={60}>
                    {distData.map((_, i) => {
                      const key = (['bull', 'bear', 'sideways', 'volatile'] as RegimeType[])[i];
                      return <Cell key={i} fill={REGIME_CONFIG[key].hex} fillOpacity={0.75} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Regime Statistics Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Regime Statistics</CardTitle>
              <CardDescription>Average return and volatility per regime</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Regime</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Days</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">% of Period</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Daily Return</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Volatility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s) => {
                      const cfg = REGIME_CONFIG[s.regime];
                      return (
                        <tr key={s.regime} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                              <span className="font-medium">{s.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">{s.count}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">{s.pct.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            <span className={s.avgReturn >= 0 ? 'text-primary' : 'text-slate-500'}>
                              {s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(3)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {s.avgVolatility.toFixed(3)}%
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
        {isConfigured && currentRegime && (() => {
          const dominantRegime = [...summary].sort((a, b) => b.count - a.count)[0];
          const bullStats      = summary.find((s) => s.regime === 'bull');
          const bearStats      = summary.find((s) => s.regime === 'bear');
          const volStats       = summary.find((s) => s.regime === 'volatile');
          const totalDays      = regimeRows.length;
          const bearPct        = bearStats ? bearStats.pct : 0;
          const volPct         = volStats  ? volStats.pct  : 0;
          const currentCfg     = REGIME_CONFIG[currentRegime.regime];

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated regime analysis summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Current regime banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">
                      Current Market Regime
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    As of <span className="font-semibold">{currentRegime.date}</span>, the market is classified as a{' '}
                    <span className="font-semibold text-slate-700">{currentCfg.label}</span> regime.
                    The analysis covers <span className="font-semibold font-mono">{totalDays}</span> trading days.
                    The dominant regime over the full period was{' '}
                    <span className="font-semibold">{dominantRegime.label}</span>{' '}
                    at <span className="font-mono font-semibold">{dominantRegime.pct.toFixed(1)}%</span> of all sessions.
                  </p>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {summary.map((s) => {
                    const cfg = REGIME_CONFIG[s.regime];
                    return (
                      <div key={s.regime} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</div>
                        <div className="text-lg font-bold font-mono text-slate-700">{s.pct.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">{s.count} days</div>
                        <div className="text-xs font-mono text-muted-foreground mt-1">
                          avg {s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(3)}%/day
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  {bullStats && bearStats && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Bull vs Bear Ratio</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Bull market conditions prevailed for{' '}
                          <span className="font-semibold font-mono">{bullStats.pct.toFixed(1)}%</span> of the period
                          vs <span className="font-semibold font-mono">{bearStats.pct.toFixed(1)}%</span> in bear conditions.
                          {bullStats.pct > bearStats.pct * 2
                            ? ' The period was overwhelmingly bullish — defensive positioning may be less critical.'
                            : ' The bear regime had a significant presence, suggesting risk management remained important throughout.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {volStats && volPct > 10 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Volatility Risk</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          High-volatility regimes accounted for{' '}
                          <span className="font-semibold font-mono">{volPct.toFixed(1)}%</span> of all sessions
                          with an average daily volatility of{' '}
                          <span className="font-semibold font-mono">{volStats.avgVolatility.toFixed(2)}%</span>.
                          {volPct > 20
                            ? ' This elevated volatility exposure suggests the period included significant macro stress events.'
                            : ' Volatility spikes were present but manageable within the broader trend.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Current Positioning Implication</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentRegime.regime === 'bull' &&
                          'Current bull regime supports risk-on positioning. Consider overweighting equities and cyclicals while maintaining stop-loss discipline as regimes can shift rapidly.'}
                        {currentRegime.regime === 'bear' &&
                          'Current bear regime warrants defensive positioning. Consider reducing equity exposure, increasing cash or short-duration bonds, and reviewing downside hedges.'}
                        {currentRegime.regime === 'sideways' &&
                          'Sideways regime favors range-bound strategies. Mean-reversion approaches, covered calls, and selective stock-picking tend to outperform trend-following in this environment.'}
                        {currentRegime.regime === 'volatile' &&
                          'High-volatility regime calls for reduced position sizing and wider stop-losses. Volatility strategies (long vol) may offer attractive risk-adjusted returns during this phase.'}
                      </p>
                    </div>
                  </div>

                  {bearPct > 25 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Extended Bear Exposure</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Over a quarter of the analysis period was spent in bear conditions
                          (<span className="font-mono font-semibold">{bearPct.toFixed(1)}%</span>).
                          This level of sustained drawdown pressure typically requires robust risk controls,
                          diversification across uncorrelated assets, and a clear re-entry framework.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Regime classification is based on return and volatility thresholds applied to the selected columns.
                  If a pre-labeled regime column is provided, it takes precedence. This analysis is auto-generated for reference only
                  and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
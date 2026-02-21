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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LabelList,
} from 'recharts';
import {
  Info,
  Download,
  Loader2,
  FileSpreadsheet,
  ImageIcon,
  ChevronDown,
  Shield,
  BarChart3,
  Activity,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  FileText,
  Eye,
  X,
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

interface ManualEntry {
  id:           string;
  ticker:       string;
  method:       string;
  intrinsicVal: number | null;
  currentPrice: number | null;
  weight:       number;
  enabled:      boolean;
  notes:        string;
}

interface SafetyResult {
  ticker:       string;
  method:       string;
  intrinsicVal: number;
  currentPrice: number;
  mos:          number;
  upside:       number;
  signal:       string;
  weight:       number;
  notes:        string;
}

interface TickerSummary {
  ticker:         string;
  weightedIV:     number;
  currentPrice:   number;
  weightedMOS:    number;
  weightedUpside: number;
  signal:         string;
  minIV:          number;
  maxIV:          number;
  methodCount:    number;
  methods:        SafetyResult[];
}

// ============================================
// Helpers
// ============================================

function getSignal(mos: number): string {
  if (mos >= 40)  return 'Strong Buy';
  if (mos >= 20)  return 'Buy';
  if (mos >= 0)   return 'Hold';
  if (mos >= -20) return 'Reduce';
  return 'Sell';
}

function signalBadgeClass(sig: string): string {
  if (sig === 'Strong Buy') return 'bg-emerald-100 text-emerald-700';
  if (sig === 'Buy')        return 'bg-green-100 text-green-700';
  if (sig === 'Hold')       return 'bg-amber-100 text-amber-700';
  if (sig === 'Reduce')     return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-600';
}

function mosBarColor(mos: number): string {
  if (mos >= 40)  return '#10B981';
  if (mos >= 20)  return '#34D399';
  if (mos >= 0)   return '#F59E0B';
  if (mos >= -20) return '#F97316';
  return '#EF4444';
}

function calcMOS(iv: number, price: number) {
  return parseFloat(((iv - price) / iv * 100).toFixed(2));
}
function calcUpside(iv: number, price: number) {
  return parseFloat(((iv - price) / price * 100).toFixed(2));
}

// ============================================
// Default Data
// ============================================

function defaultManualEntries(): ManualEntry[] {
  return [
    { id: '1',  ticker: 'AAPL',  method: 'DCF',        intrinsicVal: 185, currentPrice: 148, weight: 40, enabled: true, notes: 'WACC 10%, TGR 2.5%' },
    { id: '2',  ticker: 'AAPL',  method: 'EV/EBITDA',  intrinsicVal: 162, currentPrice: 148, weight: 30, enabled: true, notes: 'Peer median 18x' },
    { id: '3',  ticker: 'AAPL',  method: 'P/E',        intrinsicVal: 175, currentPrice: 148, weight: 20, enabled: true, notes: 'Sector P/E 28x' },
    { id: '4',  ticker: 'AAPL',  method: 'Graham',     intrinsicVal: 140, currentPrice: 148, weight: 10, enabled: true, notes: '√(22.5 × EPS × BVPS)' },
    { id: '5',  ticker: 'MSFT',  method: 'DCF',        intrinsicVal: 420, currentPrice: 380, weight: 40, enabled: true, notes: 'WACC 9%, TGR 3%' },
    { id: '6',  ticker: 'MSFT',  method: 'EV/EBITDA',  intrinsicVal: 445, currentPrice: 380, weight: 35, enabled: true, notes: 'Peer median 22x' },
    { id: '7',  ticker: 'MSFT',  method: 'P/E',        intrinsicVal: 410, currentPrice: 380, weight: 25, enabled: true, notes: 'Sector P/E 32x' },
    { id: '8',  ticker: 'GOOGL', method: 'DCF',        intrinsicVal: 195, currentPrice: 210, weight: 50, enabled: true, notes: 'WACC 10.5%, TGR 2%' },
    { id: '9',  ticker: 'GOOGL', method: 'EV/EBITDA',  intrinsicVal: 185, currentPrice: 210, weight: 30, enabled: true, notes: 'Peer median 17x' },
    { id: '10', ticker: 'GOOGL', method: 'P/E',        intrinsicVal: 205, currentPrice: 210, weight: 20, enabled: true, notes: 'Sector P/E 25x' },
    { id: '11', ticker: 'META',  method: 'DCF',        intrinsicVal: 560, currentPrice: 510, weight: 45, enabled: true, notes: 'WACC 11%, TGR 2.5%' },
    { id: '12', ticker: 'META',  method: 'EV/EBITDA',  intrinsicVal: 590, currentPrice: 510, weight: 35, enabled: true, notes: 'Peer median 19x' },
    { id: '13', ticker: 'META',  method: 'P/E',        intrinsicVal: 540, currentPrice: 510, weight: 20, enabled: true, notes: 'Sector P/E 24x' },
  ];
}

function generateExampleCSV(): Record<string, any>[] {
  return defaultManualEntries().map(e => ({
    ticker: e.ticker, method: e.method,
    intrinsic_value: e.intrinsicVal, current_price: e.currentPrice,
    weight: e.weight, notes: e.notes,
  }));
}

// ============================================
// Computation
// ============================================

function computeFromRows(
  rows: Record<string, any>[],
  cols: { ticker: string; method: string; iv: string; price: string; weight: string; notes: string }
): SafetyResult[] {
  return rows.flatMap(r => {
    const ticker = String(r[cols.ticker] ?? '').trim();
    const method = String(r[cols.method] ?? '').trim();
    const iv     = parseFloat(r[cols.iv]);
    const price  = parseFloat(r[cols.price]);
    const weight = parseFloat(r[cols.weight]) || 0;
    if (!ticker || !method || !isFinite(iv) || iv <= 0 || !isFinite(price) || price <= 0) return [];
    return [{ ticker, method, intrinsicVal: iv, currentPrice: price,
      mos: calcMOS(iv, price), upside: calcUpside(iv, price),
      signal: getSignal(calcMOS(iv, price)), weight,
      notes: cols.notes ? String(r[cols.notes] ?? '') : '' }];
  });
}

function computeFromManual(entries: ManualEntry[]): SafetyResult[] {
  return entries.flatMap(e => {
    if (!e.enabled || !e.ticker?.trim() || !e.method || e.intrinsicVal === null || e.currentPrice === null) return [];
    const iv = e.intrinsicVal; const price = e.currentPrice;
    if (iv <= 0 || price <= 0) return [];
    return [{ ticker: e.ticker.trim(), method: e.method, intrinsicVal: iv, currentPrice: price,
      mos: calcMOS(iv, price), upside: calcUpside(iv, price),
      signal: getSignal(calcMOS(iv, price)), weight: e.weight, notes: e.notes }];
  });
}

function groupByTicker(results: SafetyResult[]): TickerSummary[] {
  const map = new Map<string, SafetyResult[]>();
  for (const r of results) {
    if (!map.has(r.ticker)) map.set(r.ticker, []);
    map.get(r.ticker)!.push(r);
  }
  return Array.from(map.entries()).map(([ticker, methods]) => {
    const price       = methods[0].currentPrice;
    const totalWeight = methods.reduce((s, m) => s + m.weight, 0);
    const weightedIV  = totalWeight > 0 ? methods.reduce((s, m) => s + m.intrinsicVal * (m.weight / totalWeight), 0) : 0;
    const weightedMOS = weightedIV > 0 ? calcMOS(weightedIV, price) : 0;
    const ivs = methods.map(m => m.intrinsicVal);
    return {
      ticker, weightedIV, currentPrice: price,
      weightedMOS, weightedUpside: calcUpside(weightedIV, price),
      signal: getSignal(weightedMOS),
      minIV: Math.min(...ivs), maxIV: Math.max(...ivs),
      methodCount: methods.length, methods,
    };
  }).sort((a, b) => b.weightedMOS - a.weightedMOS);
}

// ============================================
// MOS Gauge
// ============================================

const MosGauge = ({ mos }: { mos: number }) => {
  const pct   = Math.round((Math.max(-100, Math.min(100, mos)) + 100) / 2);
  const color = mosBarColor(mos);
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative w-40 h-24 overflow-hidden">
        <RadialBarChart width={160} height={160} cx={80} cy={80}
          innerRadius={52} outerRadius={76} startAngle={180} endAngle={0}
          data={[{ value: pct, fill: color }]} barSize={22}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: '#F1F5F9' }} dataKey="value" cornerRadius={4} />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <div className="text-center">
            <div className="text-base font-bold font-mono" style={{ color }}>
              {mos >= 0 ? '+' : ''}{mos.toFixed(1)}%
            </div>
            <div className="text-[9px] text-slate-500 -mt-0.5">Margin of Safety</div>
          </div>
        </div>
      </div>
      <div className="flex justify-between w-36 text-[9px] text-slate-400 mt-0.5">
        <span>Sell</span><span>Hold</span><span>Strong Buy</span>
      </div>
    </div>
  );
};

// ============================================
// Tooltips
// ============================================

const MosTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[170px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const PriceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            ${typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Intro Page
// ============================================

const IntroPage = ({ onLoadExample, onManualEntry }: {
  onLoadExample: () => void; onManualEntry: () => void;
}) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Safety Margin</CardTitle>
        <CardDescription className="text-base mt-2">
          Calculate the margin of safety between current price and intrinsic value — aggregate multiple valuation methods with custom weights to derive a composite investment signal per ticker
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Shield className="w-6 h-6 text-primary mb-2" />,
              title: 'Margin of Safety',
              desc: "MOS = (Intrinsic − Price) / Intrinsic × 100. ≥40% = Strong Buy, ≥20% = Buy, ≥0% = Hold, negative = overvalued. Based on Benjamin Graham's principle.",
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Multi-Method Aggregation',
              desc: 'Combine DCF, EV/EBITDA, P/E, Graham Number, EV/Revenue and any other valuation method. Weighted average reduces single-model estimation error.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Multi-Ticker Comparison',
              desc: 'Analyze and rank multiple tickers side by side. Upload a CSV with one row per ticker-method pair, or enter data manually in the table.',
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
            { range: '≥ 40%',  label: 'Strong Buy', desc: 'Substantial safety margin' },
            { range: '20–40%', label: 'Buy',        desc: 'Adequate margin of safety' },
            { range: '0–20%',  label: 'Hold',       desc: 'Thin margin, use caution' },
            { range: '< 0%',   label: 'Overvalued', desc: 'Price > intrinsic value' },
          ].map(({ range, label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-xs font-bold text-slate-700 mb-0.5">{label}</div>
              <div className="text-xs font-mono text-primary mb-1">{range}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />CSV Format
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Each row represents one valuation method for one ticker. Multiple rows per ticker are aggregated using weighted average.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  ['ticker', 'stock symbol (e.g. AAPL)'],
                  ['method', 'valuation method name'],
                  ['intrinsic_value', 'estimated fair value per share'],
                  ['current_price', 'current market price'],
                  ['weight', 'method weighting (e.g. 40 for 40%)'],
                ].map(([col, desc]) => (
                  <li key={col} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span><strong>{col}</strong> — {desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />Output
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  'Per-method MOS % and upside/downside per ticker',
                  'Weighted average intrinsic value per ticker',
                  'Multi-ticker MOS ranking chart',
                  'Composite investment signal (Strong Buy → Sell)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Shield className="mr-2 h-5 w-5" />Load Example Data
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

export default function SafetyMarginPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,     setHasStarted]     = useState(false);
  const [inputMode,      setInputMode]      = useState<'manual' | 'csv'>('manual');
  const [manualRows,     setManualRows]     = useState<ManualEntry[]>(defaultManualEntries());
  const [selectedTicker, setSelectedTicker] = useState('');
  const [previewOpen,    setPreviewOpen]    = useState(false);
  const [isDownloading,  setIsDownloading]  = useState(false);

  // CSV column mapping
  const [tickerCol, setTickerCol] = useState('');
  const [methodCol, setMethodCol] = useState('');
  const [ivCol,     setIvCol]     = useState('');
  const [priceCol,  setPriceCol]  = useState('');
  const [weightCol, setWeightCol] = useState('');
  const [notesCol,  setNotesCol]  = useState('');

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_safety_margin.csv');
    setInputMode('csv');
    setHasStarted(true);
    setTickerCol('ticker'); setMethodCol('method'); setIvCol('intrinsic_value');
    setPriceCol('current_price'); setWeightCol('weight'); setNotesCol('notes');
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setTickerCol(''); setMethodCol(''); setIvCol(''); setPriceCol(''); setWeightCol(''); setNotesCol('');
    if (onClearData) onClearData();
    setHasStarted(false);
    setInputMode('manual');
  }, [onClearData]);

  // ── Auto-detect CSV columns ───────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['ticker', 'symbol', 'stock'],                          setTickerCol, tickerCol);
    detect(['method', 'valuation_method', 'model'],               setMethodCol, methodCol);
    detect(['intrinsic_value', 'intrinsic', 'fair_value', 'iv'],  setIvCol,     ivCol);
    detect(['current_price', 'price', 'market_price'],            setPriceCol,  priceCol);
    detect(['weight', 'weighting'],                               setWeightCol, weightCol);
    detect(['notes', 'note', 'comment'],                          setNotesCol,  notesCol);
  }, [hasData, allHeaders]);

  // ── Compute results ───────────────────────────────────────
  const results: SafetyResult[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && tickerCol && methodCol && ivCol && priceCol && weightCol)
      return computeFromRows(data, { ticker: tickerCol, method: methodCol, iv: ivCol, price: priceCol, weight: weightCol, notes: notesCol });
    if (inputMode === 'manual') return computeFromManual(manualRows);
    return [];
  }, [inputMode, hasData, data, tickerCol, methodCol, ivCol, priceCol, weightCol, notesCol, manualRows]);

  const tickerSummaries = useMemo(() => groupByTicker(results), [results]);
  const tickers         = useMemo(() => tickerSummaries.map(t => t.ticker), [tickerSummaries]);
  const activeTicker    = (selectedTicker && tickers.includes(selectedTicker)) ? selectedTicker : (tickers[0] ?? '');
  const tickerDetail    = useMemo(() => tickerSummaries.find(t => t.ticker === activeTicker) ?? null, [tickerSummaries, activeTicker]);

  const isConfigured    = results.length > 0;
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Manual row handlers ───────────────────────────────────
  const handleManualChange = useCallback((id: string, field: keyof ManualEntry, raw: string | boolean) => {
    setManualRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (field === 'intrinsicVal' || field === 'currentPrice' || field === 'weight') {
        const n = parseFloat(raw as string);
        return { ...r, [field]: isFinite(n) ? n : null };
      }
      return { ...r, [field]: raw };
    }));
  }, []);

  const handleAddRow = useCallback(() => {
    const last = manualRows[manualRows.length - 1];
    setManualRows(prev => [...prev, {
      id: String(Date.now()), ticker: last?.ticker ?? '',
      method: 'New Method', intrinsicVal: null,
      currentPrice: last?.currentPrice ?? null, weight: 20, enabled: true, notes: '',
    }]);
  }, [manualRows]);

  const handleDeleteRow = useCallback((id: string) => setManualRows(prev => prev.filter(r => r.id !== id)), []);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    const rows: Record<string, any>[] = [];
    for (const ts of tickerSummaries) {
      for (const m of ts.methods)
        rows.push({ ticker: m.ticker, method: m.method, intrinsic_value: m.intrinsicVal, current_price: m.currentPrice,
          mos_pct: `${m.mos >= 0 ? '+' : ''}${m.mos.toFixed(1)}%`, upside_pct: `${m.upside >= 0 ? '+' : ''}${m.upside.toFixed(1)}%`,
          weight: m.weight, signal: m.signal });
      rows.push({ ticker: ts.ticker, method: '★ Weighted Avg', intrinsic_value: ts.weightedIV.toFixed(2),
        current_price: ts.currentPrice, mos_pct: `${ts.weightedMOS >= 0 ? '+' : ''}${ts.weightedMOS.toFixed(1)}%`,
        upside_pct: `${ts.weightedUpside >= 0 ? '+' : ''}${ts.weightedUpside.toFixed(1)}%`, weight: 100, signal: ts.signal });
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `SafetyMargin_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [tickerSummaries, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `SafetyMargin_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Intro gate ────────────────────────────────────────────
  if (!hasData && !hasStarted) return (
    <IntroPage
      onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }}
    />
  );

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-4">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">
            {hasData ? displayFileName : 'Manual Entry'}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {hasData
              ? `${data.length.toLocaleString()} rows · ${allHeaders.length} cols`
              : `${manualRows.filter(r => r.enabled).length} rows · ${tickers.length} ticker${tickers.length !== 1 ? 's' : ''}`}
          </span>
          {isExample && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={handleClearAll}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {hasData && (
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
      )}

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 3</span>
            <span className="text-xs text-muted-foreground">Intrinsic Valuation</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />Safety Margin
          </CardTitle>
          <CardDescription>
            Quantify the gap between current price and intrinsic value across multiple valuation methods and tickers. Weighted average MOS per ticker with a composite investment signal.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration / Input ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription className="mt-0.5">
                {inputMode === 'csv'
                  ? 'Map CSV columns — one row per ticker-method pair.'
                  : 'Enter ticker, method, intrinsic value, current price and weight per row.'}
              </CardDescription>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant={inputMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setInputMode('manual')}>Manual</Button>
              {hasData
                ? <Button size="sm" variant={inputMode === 'csv' ? 'default' : 'outline'} onClick={() => setInputMode('csv')}>CSV</Button>
                : <Button size="sm" variant="outline" onClick={handleLoadExample}>Load Example</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* CSV mode */}
          {inputMode === 'csv' && hasData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'TICKER *',          value: tickerCol, setter: setTickerCol, headers: allHeaders     },
                { label: 'METHOD *',          value: methodCol, setter: setMethodCol, headers: allHeaders     },
                { label: 'INTRINSIC VALUE *', value: ivCol,     setter: setIvCol,     headers: numericHeaders },
                { label: 'CURRENT PRICE *',   value: priceCol,  setter: setPriceCol,  headers: numericHeaders },
                { label: 'WEIGHT *',          value: weightCol, setter: setWeightCol, headers: numericHeaders },
                { label: 'NOTES',             value: notesCol,  setter: setNotesCol,  headers: allHeaders     },
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

          {/* Manual mode */}
          {inputMode === 'manual' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['On', 'Ticker', 'Method', 'Intrinsic Value ($)', 'Current Price ($)', 'Weight (%)', 'Notes', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualRows.map(r => (
                      <tr key={r.id} className={`border-t transition-colors ${r.enabled ? 'hover:bg-slate-50/50' : 'opacity-40 bg-slate-50/30'}`}>
                        <td className="px-3 py-1.5">
                          <input type="checkbox" checked={r.enabled}
                            onChange={e => handleManualChange(r.id, 'enabled', e.target.checked)}
                            className="accent-primary w-3.5 h-3.5 cursor-pointer" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-20 font-mono font-semibold" value={r.ticker}
                            onChange={e => handleManualChange(r.id, 'ticker', e.target.value)} placeholder="AAPL" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-32" value={r.method}
                            onChange={e => handleManualChange(r.id, 'method', e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-24 font-mono"
                            value={r.intrinsicVal !== null ? String(r.intrinsicVal) : ''}
                            onChange={e => handleManualChange(r.id, 'intrinsicVal', e.target.value)} placeholder="—" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-24 font-mono"
                            value={r.currentPrice !== null ? String(r.currentPrice) : ''}
                            onChange={e => handleManualChange(r.id, 'currentPrice', e.target.value)} placeholder="—" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-16 font-mono" value={String(r.weight)}
                            onChange={e => handleManualChange(r.id, 'weight', e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-40 text-slate-500" value={r.notes}
                            onChange={e => handleManualChange(r.id, 'notes', e.target.value)} placeholder="optional" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteRow(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddRow}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Row
              </Button>
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
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (All Results)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tickers Analyzed</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{tickerSummaries.length}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {tickerSummaries.filter(t => t.weightedMOS >= 20).length} with MOS ≥ 20%
            </div>
          </div>

          {tickerSummaries[0] && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Best Opportunity</div>
              <div className="text-2xl font-bold font-mono text-slate-800">{tickerSummaries[0].ticker}</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalBadgeClass(tickerSummaries[0].signal)}`}>
                  {tickerSummaries[0].signal}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {tickerSummaries[0].weightedMOS >= 0 ? '+' : ''}{tickerSummaries[0].weightedMOS.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {tickerSummaries[0] && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Weighted IV</div>
              <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
                {tickerSummaries[0].weightedMOS >= 0
                  ? <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" />
                  : <ArrowDownRight className="h-5 w-5 shrink-0 text-red-500" />}
                ${tickerSummaries[0].weightedIV.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {tickerSummaries[0].ticker} — vs ${tickerSummaries[0].currentPrice.toFixed(2)}
              </div>
            </div>
          )}

          {tickerSummaries.length > 1 && tickerSummaries[tickerSummaries.length - 1] && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Most Overvalued</div>
              <div className="text-2xl font-bold font-mono text-slate-800">
                {tickerSummaries[tickerSummaries.length - 1].ticker}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalBadgeClass(tickerSummaries[tickerSummaries.length - 1].signal)}`}>
                  {tickerSummaries[tickerSummaries.length - 1].signal}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {tickerSummaries[tickerSummaries.length - 1].weightedMOS >= 0 ? '+' : ''}
                  {tickerSummaries[tickerSummaries.length - 1].weightedMOS.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Multi-ticker MOS Ranking ── */}
        {isConfigured && tickerSummaries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Margin of Safety Ranking — All Tickers</CardTitle>
              <CardDescription>Weighted average MOS % — sorted best to worst</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, tickerSummaries.length * 52)}>
                <BarChart
                  data={tickerSummaries.map(t => ({ ticker: t.ticker, mos: t.weightedMOS }))}
                  layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="ticker" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<MosTooltip />} />
                  <ReferenceLine x={0}  stroke="#CBD5E1" strokeWidth={1.5} />
                  <ReferenceLine x={20} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 3"
                    label={{ value: 'Buy', position: 'insideTopLeft', fontSize: 9, fill: '#94A3B8' }} />
                  <ReferenceLine x={40} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 3"
                    label={{ value: 'Strong Buy', position: 'insideTopLeft', fontSize: 9, fill: '#94A3B8' }} />
                  <Bar dataKey="mos" name="Weighted MOS" maxBarSize={34} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="mos" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                    {tickerSummaries.map((t, i) => (
                      <Cell key={i} fill={mosBarColor(t.weightedMOS)} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: Intrinsic Value vs Current Price ── */}
        {isConfigured && tickerSummaries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weighted Intrinsic Value vs Current Price</CardTitle>
              <CardDescription>Intrinsic value (violet) vs current price (slate) per ticker</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={tickerSummaries.map(t => ({
                    ticker: t.ticker,
                    'Intrinsic Value': parseFloat(t.weightedIV.toFixed(2)),
                    'Current Price':   parseFloat(t.currentPrice.toFixed(2)),
                  }))}
                  margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${v}`} />
                  <Tooltip content={<PriceTooltip />} />
                  <Bar dataKey="Intrinsic Value" fill="#6C3AED" fillOpacity={0.8} maxBarSize={32} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Current Price"   fill="#94A3B8" fillOpacity={0.55} maxBarSize={32} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Ticker Detail ── */}
        {isConfigured && tickerSummaries.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">Method Detail — Single Ticker</CardTitle>
                  <CardDescription>Per-method breakdown and weighted summary for selected ticker</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Ticker</Label>
                  <Select value={activeTicker} onValueChange={setSelectedTicker}>
                    <SelectTrigger className="text-xs h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tickers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            {tickerDetail && (
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <MosGauge mos={tickerDetail.weightedMOS} />
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    {[
                      { label: 'Weighted IV',  value: `$${tickerDetail.weightedIV.toFixed(2)}`,  sub: `vs $${tickerDetail.currentPrice.toFixed(2)} current` },
                      { label: 'Weighted MOS', value: `${tickerDetail.weightedMOS >= 0 ? '+' : ''}${tickerDetail.weightedMOS.toFixed(1)}%`, sub: tickerDetail.signal },
                      { label: 'Upside',       value: `${tickerDetail.weightedUpside >= 0 ? '+' : ''}${tickerDetail.weightedUpside.toFixed(1)}%`, sub: 'to weighted IV' },
                      { label: 'IV Range',     value: `$${tickerDetail.minIV.toFixed(0)}–$${tickerDetail.maxIV.toFixed(0)}`, sub: `${tickerDetail.methodCount} methods` },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                        <div className="text-base font-bold font-mono text-slate-700">{value}</div>
                        <div className="text-xs text-muted-foreground">{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-method MOS chart */}
                <ResponsiveContainer width="100%" height={Math.max(140, tickerDetail.methods.length * 44)}>
                  <BarChart
                    data={[...tickerDetail.methods].sort((a, b) => b.mos - a.mos).map(m => ({ method: m.method, mos: m.mos }))}
                    layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="method" tick={{ fontSize: 10, fill: '#475569' }}
                      tickLine={false} axisLine={false} width={110} />
                    <Tooltip content={<MosTooltip />} />
                    <ReferenceLine x={0}  stroke="#CBD5E1" strokeWidth={1.5} />
                    <ReferenceLine x={20} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 3" />
                    <ReferenceLine x={40} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 3" />
                    <Bar dataKey="mos" name="MOS %" maxBarSize={26} radius={[0, 3, 3, 0]}>
                      <LabelList dataKey="mos" position="right"
                        style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                        formatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                      {[...tickerDetail.methods].sort((a, b) => b.mos - a.mos).map((m, i) => (
                        <Cell key={i} fill={mosBarColor(m.mos)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Method detail table */}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Method', 'Intrinsic Value', 'Current Price', 'MOS %', 'Upside', 'Weight', 'Signal', 'Notes'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...tickerDetail.methods].sort((a, b) => b.mos - a.mos).map((m, i) => (
                        <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2 font-semibold text-slate-700">{m.method}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">${m.intrinsicVal.toFixed(2)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">${m.currentPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{m.mos >= 0 ? '+' : ''}{m.mos.toFixed(1)}%</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{m.upside >= 0 ? '+' : ''}{m.upside.toFixed(1)}%</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{m.weight}%</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalBadgeClass(m.signal)}`}>{m.signal}</span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{m.notes || '—'}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-primary/30 bg-primary/5">
                        <td className="px-3 py-2 font-bold text-primary">★ Weighted Avg</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">${tickerDetail.weightedIV.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">${tickerDetail.currentPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">{tickerDetail.weightedMOS >= 0 ? '+' : ''}{tickerDetail.weightedMOS.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">{tickerDetail.weightedUpside >= 0 ? '+' : ''}{tickerDetail.weightedUpside.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-slate-600">100%</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalBadgeClass(tickerDetail.signal)}`}>{tickerDetail.signal}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">Weighted average</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* ── All Tickers Summary Table ── */}
        {isConfigured && tickerSummaries.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />All Tickers Summary
              </CardTitle>
              <CardDescription>Ranked by weighted MOS — click a row to view method detail above</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['#', 'Ticker', 'Weighted IV', 'Current Price', 'MOS %', 'Upside', 'IV Range', 'Methods', 'Signal'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickerSummaries.map((t, i) => (
                      <tr key={t.ticker}
                        className={`border-t hover:bg-slate-50/50 cursor-pointer transition-colors ${t.ticker === activeTicker ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
                        onClick={() => setSelectedTicker(t.ticker)}>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-700">{t.ticker}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">${t.weightedIV.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">${t.currentPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                          {t.weightedMOS >= 0 ? '+' : ''}{t.weightedMOS.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {t.weightedUpside >= 0 ? '+' : ''}{t.weightedUpside.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">${t.minIV.toFixed(0)}–${t.maxIV.toFixed(0)}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{t.methodCount}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalBadgeClass(t.signal)}`}>{t.signal}</span>
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
        {isConfigured && tickerSummaries.length > 0 && (() => {
          const best       = tickerSummaries[0];
          const worst      = tickerSummaries[tickerSummaries.length - 1];
          const strongBuys = tickerSummaries.filter(t => t.weightedMOS >= 40).length;
          const buys       = tickerSummaries.filter(t => t.weightedMOS >= 20 && t.weightedMOS < 40).length;
          const overvalued = tickerSummaries.filter(t => t.weightedMOS < 0).length;
          const spread     = best.weightedMOS - worst.weightedMOS;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated safety margin analysis — {tickerSummaries.length} tickers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Portfolio Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{tickerSummaries.length}</span> tickers across{' '}
                    <span className="font-semibold">{results.length}</span> valuation entries.{' '}
                    <span className="font-semibold">{strongBuys}</span> ticker{strongBuys !== 1 ? 's' : ''} qualify as Strong Buy (MOS ≥ 40%),{' '}
                    <span className="font-semibold">{buys}</span> as Buy, and{' '}
                    <span className="font-semibold">{overvalued}</span> appear{overvalued !== 1 ? '' : 's'} overvalued.{' '}
                    Best opportunity: <span className="font-semibold">{best.ticker}</span>{' '}
                    ({best.weightedMOS >= 0 ? '+' : ''}{best.weightedMOS.toFixed(1)}% MOS,{' '}
                    weighted IV ${best.weightedIV.toFixed(2)} vs ${best.currentPrice.toFixed(2)} current).
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Strong Buy',  value: String(strongBuys),         sub: 'MOS ≥ 40%'  },
                    { label: 'Buy',         value: String(buys),               sub: 'MOS 20–40%' },
                    { label: 'Overvalued',  value: String(overvalued),         sub: 'MOS < 0%'   },
                    { label: 'MOS Spread',  value: `${spread.toFixed(1)}pp`,   sub: `${best.ticker} vs ${worst.ticker}` },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Best Opportunity — {best.ticker}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {best.ticker} has a weighted MOS of <span className="font-semibold">{best.weightedMOS >= 0 ? '+' : ''}{best.weightedMOS.toFixed(1)}%</span> across{' '}
                        {best.methodCount} method{best.methodCount !== 1 ? 's' : ''}, with intrinsic value estimates ranging{' '}
                        from <span className="font-semibold">${best.minIV.toFixed(0)}</span> to{' '}
                        <span className="font-semibold">${best.maxIV.toFixed(0)}</span> vs a current price of{' '}
                        <span className="font-semibold">${best.currentPrice.toFixed(2)}</span>.
                        {best.weightedMOS >= 40
                          ? " A MOS above 40% exceeds Benjamin Graham's 33% threshold — substantial downside protection even under moderately pessimistic assumptions."
                          : best.weightedMOS >= 20
                          ? ' A MOS of 20–40% provides a reasonable buffer. Consider whether the intrinsic value estimates are conservative enough to justify a full position.'
                          : ' The margin is thin — a modest downward revision to any assumption could erode the buffer entirely.'}
                      </p>
                    </div>
                  </div>

                  {overvalued > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Overvalued Tickers</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {tickerSummaries.filter(t => t.weightedMOS < 0).map(t => t.ticker).join(', ')}{' '}
                          {overvalued === 1 ? 'is' : 'are'} trading above weighted intrinsic value on a composite basis.
                          A negative MOS means the current price already embeds optimistic assumptions — any earnings shortfall
                          or multiple compression could produce meaningful drawdowns. Review whether growth and discount rate
                          inputs are sufficiently conservative.
                        </p>
                      </div>
                    </div>
                  )}

                  {spread > 30 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Wide Cross-Ticker Dispersion</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The MOS spread between the most attractive (<span className="font-semibold">{best.ticker}</span> at{' '}
                          {best.weightedMOS >= 0 ? '+' : ''}{best.weightedMOS.toFixed(1)}%) and least attractive{' '}
                          (<span className="font-semibold">{worst.ticker}</span> at{' '}
                          {worst.weightedMOS >= 0 ? '+' : ''}{worst.weightedMOS.toFixed(1)}%) is{' '}
                          <span className="font-semibold">{spread.toFixed(1)} percentage points</span>. This wide dispersion
                          suggests meaningful relative valuation opportunities — a rotation or long/short strategy may be appropriate.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ MOS = (Intrinsic Value − Current Price) / Intrinsic Value × 100. Weighted IV = Σ(IV × Weight) / Σ Weight per ticker.
                  Margin of safety is a buffer against estimation error and unforeseen adverse events — not a guarantee of returns.
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
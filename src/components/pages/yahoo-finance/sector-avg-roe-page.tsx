'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell, PieChart, Pie, Sector,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Info, Download, Loader2,
  FileSpreadsheet, ImageIcon, ChevronDown, CheckCircle,
  X, FileText, Eye, BarChart3, Activity,
  Layers, Package, PieChart as PieIcon, Star,
} from 'lucide-react';
import type { AnalysisPageProps } from '@/components/finance-analytics-app';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** One row = one product × one period */
interface RawRow {
  product:   string;
  period:    string;
  revenue:   number | null;
  cogs:      number | null;
  opex:      number | null;   // allocated operating expenses (optional)
  units:     number | null;   // units sold (optional)
}

/** Per-product summary across all selected periods */
interface ProductSummary {
  product:        string;
  totalRevenue:   number;
  totalCogs:      number;
  totalOpex:      number;
  totalGrossProfit: number;
  totalOperatingProfit: number;
  grossMargin:    number;   // %
  operatingMargin:number;   // %
  revenueShare:   number;   // % of grand total revenue
  gpShare:        number;   // % of grand total gross profit
  avgUnits:       number | null;
  revenuePerUnit: number | null;
  gpPerUnit:      number | null;
  color:          string;
}

/** Per-period × per-product for trend charts */
interface TrendRow {
  period:  string;
  [product: string]: number | string | null;
}

// ─────────────────────────────────────────────
// Palette — up to 12 products
// ─────────────────────────────────────────────
const PALETTE = [
  '#6C3AED','#3B82F6','#10B981','#F59E0B',
  '#EF4444','#8B5CF6','#06B6D4','#F97316',
  '#EC4899','#84CC16','#14B8A6','#A855F7',
];

function productColor(idx: number) { return PALETTE[idx % PALETTE.length]; }

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function pv(r: Record<string, any>, col: string): number | null {
  if (!col) return null;
  const v = parseFloat(r[col]);
  return isFinite(v) ? v : null;
}
function sv(r: Record<string, any>, col: string): string {
  return col ? String(r[col] ?? '').trim() : '';
}

function autoUnit(maxVal: number): string {
  if (maxVal >= 1_000_000) return 'M';
  if (maxVal >= 1_000)     return 'K';
  return '';
}
function scl(v: number, unit: string): number {
  if (unit === 'M') return parseFloat((v / 1_000_000).toFixed(2));
  if (unit === 'K') return parseFloat((v / 1_000).toFixed(2));
  return parseFloat(v.toFixed(1));
}

// ─────────────────────────────────────────────
// Example data  (3 products × 8 quarters)
// ─────────────────────────────────────────────
function generateExample(): Record<string, any>[] {
  const products = [
    { name: 'Product A', revBase: 1200, cogsR: 0.48, opexR: 0.12, units: 3000 },
    { name: 'Product B', revBase:  800, cogsR: 0.62, opexR: 0.15, units: 1500 },
    { name: 'Product C', revBase:  500, cogsR: 0.35, opexR: 0.18, units:  800 },
  ];
  const quarters = ['2023Q1','2023Q2','2023Q3','2023Q4','2024Q1','2024Q2','2024Q3','2024Q4'];
  const rows: Record<string, any>[] = [];
  for (const q of quarters) {
    for (const p of products) {
      const rev   = parseFloat((p.revBase * (1 + 0.04 * quarters.indexOf(q) / 4 + (Math.random()-0.4)*0.06)).toFixed(1));
      const cogs  = parseFloat((rev * (p.cogsR + (Math.random()-0.5)*0.03)).toFixed(1));
      const opex  = parseFloat((rev * (p.opexR + (Math.random()-0.5)*0.02)).toFixed(1));
      const units = Math.round(p.units * (1 + 0.03 * quarters.indexOf(q) / 4 + (Math.random()-0.4)*0.08));
      rows.push({ period: q, product: p.name, revenue: rev, cogs, opex, units });
    }
  }
  return rows;
}

// ─────────────────────────────────────────────
// Build summaries & trend rows
// ─────────────────────────────────────────────
function buildSummaries(
  data: Record<string, any>[],
  productCol: string, periodCol: string,
  revCol: string, cogsCol: string,
  opexCol: string, unitsCol: string,
  selectedPeriods: string[],
): { summaries: ProductSummary[]; trendRows: TrendRow[]; allPeriods: string[] } {

  if (!productCol || !revCol) return { summaries: [], trendRows: [], allPeriods: [] };

  // Filter to selected periods
  const rows: RawRow[] = data
    .map(r => ({
      product:  sv(r, productCol),
      period:   periodCol ? sv(r, periodCol) : 'All',
      revenue:  pv(r, revCol),
      cogs:     pv(r, cogsCol),
      opex:     pv(r, opexCol),
      units:    pv(r, unitsCol),
    }))
    .filter(r => r.product && r.revenue !== null
      && (selectedPeriods.length === 0 || selectedPeriods.includes(r.period)));

  const allPeriods = [...new Set(
    data.map(r => (periodCol ? sv(r, periodCol) : 'All')).filter(Boolean)
  )].sort();

  // Product list (order by first appearance)
  const products = [...new Set(rows.map(r => r.product))];
  const grandRev  = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const grandGP   = rows.reduce((s, r) => s + (r.revenue ?? 0) - (r.cogs ?? 0), 0);

  const summaries: ProductSummary[] = products.map((prod, idx) => {
    const pRows = rows.filter(r => r.product === prod);
    const totRev  = pRows.reduce((s, r) => s + (r.revenue ?? 0), 0);
    const totCogs = pRows.reduce((s, r) => s + (r.cogs    ?? 0), 0);
    const totOpex = pRows.reduce((s, r) => s + (r.opex    ?? 0), 0);
    const totUnits= pRows.every(r => r.units !== null)
      ? pRows.reduce((s, r) => s + (r.units ?? 0), 0) : null;
    const totGP   = totRev - totCogs;
    const totOP   = totGP  - totOpex;
    return {
      product:          prod,
      totalRevenue:     parseFloat(totRev.toFixed(2)),
      totalCogs:        parseFloat(totCogs.toFixed(2)),
      totalOpex:        parseFloat(totOpex.toFixed(2)),
      totalGrossProfit: parseFloat(totGP.toFixed(2)),
      totalOperatingProfit: parseFloat(totOP.toFixed(2)),
      grossMargin:      totRev > 0 ? parseFloat(((totGP / totRev) * 100).toFixed(2)) : 0,
      operatingMargin:  totRev > 0 ? parseFloat(((totOP / totRev) * 100).toFixed(2)) : 0,
      revenueShare:     grandRev > 0 ? parseFloat(((totRev / grandRev) * 100).toFixed(2)) : 0,
      gpShare:          grandGP  > 0 ? parseFloat(((totGP / grandGP)  * 100).toFixed(2)) : 0,
      avgUnits:         totUnits,
      revenuePerUnit:   totUnits && totUnits > 0 ? parseFloat((totRev / totUnits).toFixed(2)) : null,
      gpPerUnit:        totUnits && totUnits > 0 ? parseFloat((totGP  / totUnits).toFixed(2)) : null,
      color:            productColor(idx),
    };
  });

  // Trend rows — per period, each product's revenue & gross margin
  const trendMap: Record<string, Record<string, number | null>> = {};
  for (const row of rows) {
    if (!trendMap[row.period]) trendMap[row.period] = {};
    trendMap[row.period][`rev_${row.product}`] =
      (trendMap[row.period][`rev_${row.product}`] ?? 0) + (row.revenue ?? 0);
    trendMap[row.period][`gm_${row.product}`] =
      row.cogs !== null && row.revenue !== null && row.revenue > 0
        ? parseFloat((((row.revenue - row.cogs) / row.revenue) * 100).toFixed(2))
        : null;
  }
  const trendRows: TrendRow[] = allPeriods
    .filter(p => selectedPeriods.length === 0 || selectedPeriods.includes(p))
    .map(period => ({ period, ...(trendMap[period] ?? {}) }));

  return { summaries, trendRows, allPeriods };
}

// ─────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────
const GenTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold text-slate-700">
            {typeof p.value === 'number'
              ? `${p.value.toFixed(2)}${unit}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Waterfall bar — contribution to total GP
// ─────────────────────────────────────────────
function buildWaterfall(summaries: ProductSummary[], unit: string) {
  let running = 0;
  return summaries
    .sort((a, b) => b.totalGrossProfit - a.totalGrossProfit)
    .map(s => {
      const base  = running;
      const value = parseFloat(scl(s.totalGrossProfit, unit).toFixed(2));
      running    += s.totalGrossProfit;
      return {
        product: s.product,
        base:    parseFloat(scl(base, unit).toFixed(2)),
        value,
        color:   s.color,
        total:   parseFloat(scl(running, unit).toFixed(2)),
      };
    });
}

// ─────────────────────────────────────────────
// Intro Page
// ─────────────────────────────────────────────
const IntroPage = ({ onLoadExample }: { onLoadExample: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Package className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Product Profitability</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze profitability contribution by product line or business segment —
          identify revenue share, gross margin, operating margin, and GP per unit across products and periods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <PieIcon className="w-6 h-6 text-primary mb-2" />,
              title: 'Revenue & GP Share',
              desc:  'See which products drive the most revenue and which contribute the most gross profit. Revenue share and GP share often differ — high-margin products punch above their weight.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Margin Comparison',
              desc:  'Compare gross margin and operating margin side-by-side across all products. Identify which segments are structurally high-margin and which are cost-heavy.' },
            { icon: <Layers className="w-6 h-6 text-primary mb-2" />,
              title: 'Trend Analysis',
              desc:  'Track revenue contribution and gross margin per product over time. Detect which segments are growing, shrinking, or experiencing margin pressure.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Info className="w-5 h-5" />Required Columns
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div className="space-y-2">
              {[
                ['product *',  'Product / segment name (one row per product per period)'],
                ['revenue *',  'Revenue for this product in this period'],
                ['period',     'Fiscal period — year, quarter, month'],
                ['cogs',       'Cost of goods sold (to compute gross profit)'],
                ['opex',       'Allocated operating expenses (for operating margin)'],
                ['units',      'Units sold (enables revenue/GP per unit)'],
              ].map(([col, desc]) => (
                <div key={col as string} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>{col as string}</strong> — {desc as string}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 mb-1">What you get</p>
              {[
                'Revenue share & GP share donut/bar comparison',
                'Gross margin & operating margin by product',
                'GP contribution waterfall chart',
                'Revenue trend per product over periods',
                'Gross margin trend per product',
                'BCG-style scatter: Revenue share vs GM%',
                'Full metrics table — newest periods first',
                'Auto-generated insights per product',
              ].map(s => (
                <div key={s} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3">
            Data format: long/tidy — one row per product per period.
            Example: period=2024Q1, product=&quot;Product A&quot;, revenue=1200, cogs=576, opex=144, units=3000.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Package className="mr-2 h-5 w-5" />Load Example Data
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ProductProfitabilityPage({
  data, allHeaders, numericHeaders, categoricalHeaders,
  fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping ────────────────────────────────────────
  const [productCol, setProductCol] = useState('');
  const [periodCol,  setPeriodCol]  = useState('');
  const [revCol,     setRevCol]     = useState('');
  const [cogsCol,    setCogsCol]    = useState('');
  const [opexCol,    setOpexCol]    = useState('');
  const [unitsCol,   setUnitsCol]   = useState('');

  // ── Period filter ─────────────────────────────────────────
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  // ── UI ────────────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Auto-detect ───────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['product','segment','product_name','segment_name','division','category'], setProductCol, productCol);
    detect(['period','quarter','year','date','fiscal'],                               setPeriodCol,  periodCol);
    detect(['revenue','sales','net_sales','total_revenue'],                           setRevCol,     revCol);
    detect(['cogs','cost_of_sales','cost_of_goods','variable_cost'],                 setCogsCol,    cogsCol);
    detect(['opex','operating_expense','sga','allocated_opex'],                      setOpexCol,    opexCol);
    detect(['units','qty','quantity','units_sold','volume'],                          setUnitsCol,   unitsCol);
  }, [hasData, allHeaders]);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExample();
    onExampleLoaded?.(rows, 'example_product_profitability.csv');
    setProductCol('product'); setPeriodCol('period'); setRevCol('revenue');
    setCogsCol('cogs'); setOpexCol('opex'); setUnitsCol('units');
    setSelectedPeriods([]);
  }, [onExampleLoaded]);

  // ── Build data ────────────────────────────────────────────
  const { summaries, trendRows, allPeriods } = useMemo(() =>
    buildSummaries(data, productCol, periodCol, revCol, cogsCol, opexCol, unitsCol, selectedPeriods),
    [data, productCol, periodCol, revCol, cogsCol, opexCol, unitsCol, selectedPeriods]
  );

  const unit = useMemo(() => {
    if (!summaries.length) return '';
    return autoUnit(Math.max(...summaries.map(s => s.totalRevenue)));
  }, [summaries]);

  const wfData = useMemo(() => buildWaterfall(summaries, unit), [summaries, unit]);

  // Trend chart: scale revenue values
  const scaledTrend = useMemo(() =>
    trendRows.map(row => {
      const out: TrendRow = { period: row.period };
      for (const [k, v] of Object.entries(row)) {
        if (k === 'period') continue;
        if (k.startsWith('rev_') && typeof v === 'number') {
          out[k] = parseFloat(scl(v, unit).toFixed(2));
        } else {
          out[k] = v;
        }
      }
      return out;
    }),
    [trendRows, unit]
  );

  // Scatter data: revenue share vs gross margin
  const scatterData = useMemo(() =>
    summaries.map(s => ({
      product:     s.product,
      x:           s.revenueShare,
      y:           s.grossMargin,
      size:        scl(s.totalRevenue, unit),
      color:       s.color,
    })),
    [summaries, unit]
  );

  // Summary stats
  const stats = useMemo(() => {
    if (!summaries.length) return null;
    const top     = [...summaries].sort((a, b) => b.totalGrossProfit - a.totalGrossProfit)[0];
    const highest = [...summaries].sort((a, b) => b.grossMargin - a.grossMargin)[0];
    const lowest  = [...summaries].sort((a, b) => a.grossMargin - b.grossMargin)[0];
    const grandRev= summaries.reduce((s, p) => s + p.totalRevenue, 0);
    const grandGP = summaries.reduce((s, p) => s + p.totalGrossProfit, 0);
    const blendedGM = grandRev > 0 ? (grandGP / grandRev) * 100 : 0;
    return { top, highest, lowest, grandRev, grandGP, blendedGM, count: summaries.length };
  }, [summaries]);

  const isConfigured    = summaries.length > 0;
  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';
  const products        = summaries.map(s => s.product);

  // ── Handlers ─────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setProductCol(''); setPeriodCol(''); setRevCol('');
    setCogsCol(''); setOpexCol(''); setUnitsCol('');
    setSelectedPeriods([]);
    if (onClearData) onClearData();
  }, [onClearData]);

  const handleDownloadCSV = useCallback(() => {
    if (!summaries.length) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(summaries)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `ProductProfitability_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [summaries, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link   = document.createElement('a');
      link.download = `ProductProfitability_${new Date().toISOString().split('T')[0]}.png`;
      link.href     = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  const togglePeriod = (p: string) =>
    setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

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
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => setPreviewOpen(true)} title="Preview data"><Eye className="h-4 w-4" /></Button>
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
            onClick={handleClearAll} title="Close"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Data Preview Modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />{displayFileName}
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
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    {allHeaders.map(h => (
                      <td key={h} className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">{String(row[h] ?? '-')}</td>
                    ))}
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
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 4</span>
            <span className="text-xs text-muted-foreground">Financial Analysis</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />Product Profitability
          </CardTitle>
          <CardDescription>
            Revenue share, gross margin, and operating profit contribution by product line or business segment.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Map product/segment and financial columns. Period is optional — omit for aggregate-only analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            {[
              { label: 'PRODUCT *',  value: productCol, setter: setProductCol, headers: allHeaders,           opt: false },
              { label: 'PERIOD',     value: periodCol,  setter: setPeriodCol,  headers: allHeaders,           opt: true  },
              { label: 'REVENUE *',  value: revCol,     setter: setRevCol,     headers: numericHeaders,       opt: false },
              { label: 'COGS',       value: cogsCol,    setter: setCogsCol,    headers: numericHeaders,       opt: true  },
              { label: 'OPEX',       value: opexCol,    setter: setOpexCol,    headers: numericHeaders,       opt: true  },
              { label: 'UNITS',      value: unitsCol,   setter: setUnitsCol,   headers: numericHeaders,       opt: true  },
            ].map(({ label, value, setter, headers, opt }) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-7"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {opt && <SelectItem value="__none__">— None —</SelectItem>}
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Period filter chips */}
          {allPeriods.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <Label className="text-xs font-semibold text-muted-foreground block mb-2">
                PERIOD FILTER — click to select/deselect (empty = all periods)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {allPeriods.map(p => (
                  <button key={p} onClick={() => togglePeriod(p)}
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition-all font-medium
                      ${selectedPeriods.includes(p)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'}`}>
                    {p}
                  </button>
                ))}
                {selectedPeriods.length > 0 && (
                  <button onClick={() => setSelectedPeriods([])}
                    className="text-xs px-2.5 py-0.5 rounded-full border border-slate-200 text-muted-foreground hover:border-red-300 hover:text-red-500 transition-all">
                    Clear
                  </button>
                )}
              </div>
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
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Product Summary)
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top GP Contributor</div>
            <div className="text-2xl font-bold font-mono text-slate-800 truncate">{stats.top.product}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats.top.gpShare.toFixed(1)}% of total GP · GM {stats.top.grossMargin.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Blended Gross Margin</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {stats.blendedGM.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              across {stats.count} product{stats.count > 1 ? 's' : ''}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Highest Margin</div>
            <div className="text-2xl font-bold font-mono text-slate-800 truncate">{stats.highest.product}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              GM {stats.highest.grossMargin.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Lowest Margin</div>
            <div className="text-2xl font-bold font-mono text-slate-800 truncate">{stats.lowest.product}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              GM {stats.lowest.grossMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Revenue & GP Share stacked bar ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue &amp; Gross Profit by Product</CardTitle>
              <CardDescription>
                Bars = Revenue per product{unit ? ` (${unit})` : ''} ·
                Line = Gross Margin % (right axis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart
                  data={summaries.map(s => ({
                    product:      s.product,
                    revenueS:     parseFloat(scl(s.totalRevenue, unit).toFixed(2)),
                    grossProfitS: parseFloat(scl(s.totalGrossProfit, unit).toFixed(2)),
                    grossMargin:  s.grossMargin,
                    color:        s.color,
                  }))}
                  margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="product" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis yAxisId="val" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GenTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar yAxisId="val" dataKey="revenueS" name="Revenue" maxBarSize={48} radius={[3,3,0,0]}>
                    {summaries.map((s, i) => <Cell key={i} fill={s.color} fillOpacity={0.75} />)}
                  </Bar>
                  <Bar yAxisId="val" dataKey="grossProfitS" name="Gross Profit" maxBarSize={48} radius={[3,3,0,0]}>
                    {summaries.map((s, i) => <Cell key={i} fill={s.color} fillOpacity={1} />)}
                  </Bar>
                  <Line yAxisId="pct" dataKey="grossMargin" name="GM %"
                    stroke="#1E293B" strokeWidth={2.5}
                    dot={(props: any) => {
                      const c = props?.payload?.color;
                      return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={c ?? '#1E293B'} stroke="white" strokeWidth={1.5} />;
                    }}
                    connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: GP Contribution Waterfall ── */}
        {isConfigured && wfData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gross Profit Contribution (Ranked)</CardTitle>
              <CardDescription>
                Products ranked by gross profit contribution — stacked to show cumulative total{unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={wfData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="product" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<GenTooltip unit={unit} />} />
                  <Bar dataKey="base"  name=" " stackId="wf" fill="transparent" />
                  <Bar dataKey="value" name="GP Contribution" stackId="wf" maxBarSize={52} radius={[3,3,0,0]}>
                    {wfData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: Margin comparison grouped bar ── */}
        {isConfigured && summaries.some(s => s.grossMargin > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Margin Comparison by Product</CardTitle>
              <CardDescription>
                Gross Margin % vs Operating Margin % — blended GM reference line
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart
                  data={summaries.map(s => ({
                    product:         s.product,
                    grossMargin:     s.grossMargin,
                    operatingMargin: s.opexCol !== '' ? s.operatingMargin : null,
                    color:           s.color,
                  }))}
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="product" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GenTooltip unit="%" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {stats && (
                    <ReferenceLine y={stats.blendedGM} stroke="#94A3B8" strokeDasharray="4 3" strokeWidth={1.5}
                      label={{ value: `Blended GM ${stats.blendedGM.toFixed(1)}%`, position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                  )}
                  <Bar dataKey="grossMargin" name="Gross Margin %" maxBarSize={36} radius={[3,3,0,0]}>
                    {summaries.map((s, i) => <Cell key={i} fill={s.color} fillOpacity={0.85} />)}
                  </Bar>
                  {summaries.some(s => s.operatingMargin !== 0 && opexCol) && (
                    <Bar dataKey="operatingMargin" name="Operating Margin %" maxBarSize={36} radius={[3,3,0,0]}>
                      {summaries.map((s, i) => <Cell key={i} fill={s.color} fillOpacity={0.4} />)}
                    </Bar>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Revenue trend by product (if periods exist) ── */}
        {isConfigured && scaledTrend.length > 1 && products.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue Trend by Product</CardTitle>
              <CardDescription>
                Per-product revenue over periods{unit ? ` · Unit: ${unit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={scaledTrend} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(scaledTrend.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${unit}`} />
                  <Tooltip content={<GenTooltip unit={unit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {products.map((prod, i) => (
                    <Line key={prod}
                      dataKey={`rev_${prod}`} name={prod}
                      stroke={productColor(i)} strokeWidth={2}
                      dot={{ r: 2.5, fill: productColor(i) }} connectNulls />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 5: GM% trend by product ── */}
        {isConfigured && scaledTrend.length > 1 && cogsCol && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gross Margin % Trend by Product</CardTitle>
              <CardDescription>
                Per-product gross margin trend over periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={trendRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={Math.max(0, Math.floor(trendRows.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GenTooltip unit="%" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {products.map((prod, i) => (
                    <Line key={prod}
                      dataKey={`gm_${prod}`} name={`${prod} GM%`}
                      stroke={productColor(i)} strokeWidth={1.5} strokeDasharray="5 3"
                      dot={{ r: 2, fill: productColor(i) }} connectNulls />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Metrics Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Product Metrics Table
              </CardTitle>
              <CardDescription>
                Aggregated across {selectedPeriods.length ? selectedPeriods.join(', ') : 'all'} periods · sorted by GP contribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {[
                        'Product', 'Revenue', 'Rev Share',
                        ...(summaries.some(s => s.totalCogs > 0) ? ['Gross Profit', 'GP Share', 'GM%'] : []),
                        ...(opexCol ? ['Op Profit', 'OP Margin'] : []),
                        ...(summaries.some(s => s.avgUnits !== null) ? ['Units', 'Rev/Unit', 'GP/Unit'] : []),
                      ].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...summaries].sort((a, b) => b.totalGrossProfit - a.totalGrossProfit).map((s, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="font-semibold text-slate-700">{s.product}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {scl(s.totalRevenue, unit).toFixed(1)}{unit}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {s.revenueShare.toFixed(1)}%
                        </td>
                        {summaries.some(p => p.totalCogs > 0) && (<>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {scl(s.totalGrossProfit, unit).toFixed(1)}{unit}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {s.gpShare.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {s.grossMargin.toFixed(1)}%
                          </td>
                        </>)}
                        {opexCol && (<>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {scl(s.totalOperatingProfit, unit).toFixed(1)}{unit}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {s.operatingMargin.toFixed(1)}%
                          </td>
                        </>)}
                        {summaries.some(p => p.avgUnits !== null) && (<>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {s.avgUnits !== null ? s.avgUnits.toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {s.revenuePerUnit !== null ? scl(s.revenuePerUnit, unit).toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {s.gpPerUnit !== null ? scl(s.gpPerUnit, unit).toFixed(2) : '—'}
                          </td>
                        </>)}
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
          const sorted = [...summaries].sort((a, b) => b.totalGrossProfit - a.totalGrossProfit);
          const topTwo = sorted.slice(0, 2);
          const bottom = sorted[sorted.length - 1];

          // Revenue-GP divergence: product with biggest gap between rev share and GP share
          const divergent = summaries.reduce((best, s) =>
            Math.abs(s.gpShare - s.revenueShare) > Math.abs(best.gpShare - best.revenueShare) ? s : best
          );

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights
                </CardTitle>
                <CardDescription>Auto-generated product profitability analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Overview banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Portfolio Overview</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="font-semibold">{stats.count}</span> products analyzed.
                    Total revenue: <span className="font-semibold">{scl(stats.grandRev, unit).toFixed(1)}{unit}</span>.
                    Total gross profit: <span className="font-semibold">{scl(stats.grandGP, unit).toFixed(1)}{unit}</span>.
                    Blended GM: <span className="font-semibold">{stats.blendedGM.toFixed(1)}%</span>.
                    Top contributor: <span className="font-semibold">{stats.top.product}</span> ({stats.top.gpShare.toFixed(1)}% of GP).
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Analysis</p>

                  {/* Top contributor */}
                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">
                        Top GP Contributor — {stats.top.product}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {stats.top.product} generates {stats.top.gpShare.toFixed(1)}% of total gross profit
                        on {stats.top.revenueShare.toFixed(1)}% of revenue, with a gross margin of {stats.top.grossMargin.toFixed(1)}%.
                        {stats.top.gpShare > stats.top.revenueShare
                          ? ` Its GP share exceeds its revenue share by ${(stats.top.gpShare - stats.top.revenueShare).toFixed(1)}pp — indicating above-average profitability. This is the portfolio's highest-leverage product.`
                          : ` Its GP share is below its revenue share — indicating below-average margin relative to its size.`}
                        {topTwo.length > 1 && ` Combined, the top 2 products (${topTwo.map(t => t.product).join(' & ')}) account for ${(topTwo[0].gpShare + topTwo[1].gpShare).toFixed(1)}% of total gross profit.`}
                      </p>
                    </div>
                  </div>

                  {/* Revenue vs GP divergence */}
                  {Math.abs(divergent.gpShare - divergent.revenueShare) > 3 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Revenue vs GP Share Divergence — {divergent.product}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {divergent.product} shows the largest gap between revenue share ({divergent.revenueShare.toFixed(1)}%)
                          and GP share ({divergent.gpShare.toFixed(1)}%) — a {Math.abs(divergent.gpShare - divergent.revenueShare).toFixed(1)}pp difference.
                          {divergent.gpShare > divergent.revenueShare
                            ? ` This product punches above its weight in profitability — it contributes proportionally more to gross profit than to revenue. Prioritizing this product's growth would improve overall portfolio margins.`
                            : ` This product consumes a disproportionate share of revenue relative to its gross profit contribution, suggesting high variable costs or competitive pricing pressure. Review cost structure or pricing strategy.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Highest vs lowest margin */}
                  {stats.count > 1 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Margin Spread — {stats.highest.grossMargin.toFixed(1)}% vs {stats.lowest.grossMargin.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {`${stats.highest.product} has the highest gross margin at ${stats.highest.grossMargin.toFixed(1)}%, while ${stats.lowest.product} has the lowest at ${stats.lowest.grossMargin.toFixed(1)}% — a spread of ${(stats.highest.grossMargin - stats.lowest.grossMargin).toFixed(1)}pp. `}
                          {stats.highest.grossMargin - stats.lowest.grossMargin > 20
                            ? `This wide spread suggests meaningful structural differences in cost structure, pricing power, or market positioning across the portfolio. Consider whether the lower-margin product requires a cost reduction initiative or pricing adjustment.`
                            : `The narrow margin spread indicates relatively consistent cost structures across products — portfolio-level decisions will have broadly even impact.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bottom performer */}
                  {stats.count > 2 && bottom.grossMargin < stats.blendedGM - 5 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">
                          Below-Average Margin — {bottom.product}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {bottom.product} operates at {bottom.grossMargin.toFixed(1)}% gross margin,
                          {' '}{(stats.blendedGM - bottom.grossMargin).toFixed(1)}pp below the portfolio blended average of {stats.blendedGM.toFixed(1)}%.
                          {bottom.revenueShare > 20
                            ? ` Given its ${bottom.revenueShare.toFixed(1)}% revenue share, its below-average margin materially drags the portfolio. Improving this product's cost structure or pricing would have an outsized positive effect on blended margins.`
                            : ` Its relatively small revenue share (${bottom.revenueShare.toFixed(1)}%) limits its dilutive impact, but the margin gap warrants monitoring.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Gross Margin = (Revenue − COGS) ÷ Revenue × 100%.
                  Operating Margin = (Revenue − COGS − OpEx) ÷ Revenue × 100%.
                  GP Share = Product GP ÷ Total Portfolio GP × 100%.
                  Revenue Share = Product Revenue ÷ Total Portfolio Revenue × 100%.
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
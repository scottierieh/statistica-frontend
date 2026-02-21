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
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
// Types
// ============================================

type ScenarioKey = 'bull' | 'base' | 'bear';

interface Scenario {
  eps: number;       // or EBITDA
  multiple: number;  // P/E or EV/EBITDA
  targetPrice: number;
  upside: number;    // %
}

interface StockRow {
  id: string;
  ticker: string;
  currentPrice: number;
  // Scenarios
  bull: Scenario;
  base: Scenario;
  bear: Scenario;
  // Risk
  beta: number;
  epsUncertainty: number; // % — analyst estimate dispersion
  // Derived
  weightedTargetPrice: number; // 25% bull + 50% base + 25% bear
  weightedUpside: number;
  riskAdjustedScore: number;  // 0–100
  scoreLabel: 'Strong Buy' | 'Buy' | 'Hold' | 'Underperform' | 'Sell';
}

// ============================================
// Constants
// ============================================

const BULL_COLOR   = '#10B981';
const BASE_COLOR   = '#6C3AED';
const BEAR_COLOR   = '#F59E0B';
const SCORE_COLOR  = '#3B82F6';
const UPSIDE_POS   = '#10B981';
const UPSIDE_NEG   = '#F59E0B';

const SCENARIO_WEIGHTS = { bull: 0.25, base: 0.50, bear: 0.25 };

// ============================================
// Scoring Logic
// ============================================

function computeScenario(eps: number, multiple: number, currentPrice: number): Scenario {
  const targetPrice = parseFloat((eps * multiple).toFixed(2));
  const upside      = currentPrice > 0
    ? parseFloat((((targetPrice - currentPrice) / currentPrice) * 100).toFixed(2))
    : 0;
  return { eps, multiple, targetPrice, upside };
}

function computeStock(raw: Omit<StockRow, 'weightedTargetPrice' | 'weightedUpside' | 'riskAdjustedScore' | 'scoreLabel'>): StockRow {
  const weightedTP = parseFloat((
    raw.bull.targetPrice * SCENARIO_WEIGHTS.bull +
    raw.base.targetPrice * SCENARIO_WEIGHTS.base +
    raw.bear.targetPrice * SCENARIO_WEIGHTS.bear
  ).toFixed(2));

  const weightedUpside = raw.currentPrice > 0
    ? parseFloat((((weightedTP - raw.currentPrice) / raw.currentPrice) * 100).toFixed(2))
    : 0;

  // Risk-adjusted score: upside scaled by risk penalty
  // Base score from weighted upside (50% upside = 100 score)
  // Penalty from beta and EPS uncertainty
  const rawScore    = Math.min(100, Math.max(0, (weightedUpside / 50) * 100));
  const betaPenalty = Math.max(0, (raw.beta - 1.0) * 10);
  const uncPenalty  = raw.epsUncertainty * 0.5;
  const riskAdjustedScore = parseFloat(Math.min(100, Math.max(0, rawScore - betaPenalty - uncPenalty)).toFixed(1));

  const scoreLabel: StockRow['scoreLabel'] =
    riskAdjustedScore >= 70 ? 'Strong Buy' :
    riskAdjustedScore >= 50 ? 'Buy' :
    riskAdjustedScore >= 35 ? 'Hold' :
    riskAdjustedScore >= 20 ? 'Underperform' : 'Sell';

  return { ...raw, weightedTargetPrice: weightedTP, weightedUpside, riskAdjustedScore, scoreLabel };
}

function scoreLabelColor(label: StockRow['scoreLabel']): string {
  switch (label) {
    case 'Strong Buy':   return 'bg-emerald-100 text-emerald-700';
    case 'Buy':          return 'bg-green-100 text-green-700';
    case 'Hold':         return 'bg-slate-100 text-slate-600';
    case 'Underperform': return 'bg-orange-100 text-orange-700';
    case 'Sell':         return 'bg-slate-100 text-slate-700';
  }
}

// ============================================
// Default Stocks
// ============================================

function defaultStocks(): StockRow[] {
  const entries: Array<{
    id: string; ticker: string; currentPrice: number;
    bullEps: number; bullMul: number;
    baseEps: number; baseMul: number;
    bearEps: number; bearMul: number;
    beta: number; epsUnc: number;
  }> = [
    { id: '1', ticker: 'AAPL',  currentPrice: 189, bullEps: 8.2, bullMul: 32, baseEps: 7.5, baseMul: 28, bearEps: 6.5, bearMul: 22, beta: 1.2, epsUnc: 5  },
    { id: '2', ticker: 'MSFT',  currentPrice: 415, bullEps: 14.0,bullMul: 36, baseEps: 13.1,baseMul: 31, bearEps: 11.5,bearMul: 25, beta: 0.9, epsUnc: 4  },
    { id: '3', ticker: 'GOOGL', currentPrice: 172, bullEps: 9.5, bullMul: 26, baseEps: 8.7, baseMul: 22, bearEps: 7.2, bearMul: 17, beta: 1.1, epsUnc: 8  },
    { id: '4', ticker: 'META',  currentPrice: 505, bullEps: 24.0,bullMul: 28, baseEps: 21.5,baseMul: 23, bearEps: 17.0,bearMul: 17, beta: 1.4, epsUnc: 10 },
    { id: '5', ticker: 'AMZN',  currentPrice: 198, bullEps: 6.8, bullMul: 42, baseEps: 5.8, baseMul: 36, bearEps: 4.2, bearMul: 28, beta: 1.3, epsUnc: 12 },
  ];
  return entries.map(e => computeStock({
    id: e.id, ticker: e.ticker, currentPrice: e.currentPrice,
    bull: computeScenario(e.bullEps, e.bullMul, e.currentPrice),
    base: computeScenario(e.baseEps, e.baseMul, e.currentPrice),
    bear: computeScenario(e.bearEps, e.bearMul, e.currentPrice),
    beta: e.beta, epsUncertainty: e.epsUnc,
  }));
}

// ============================================
// Example CSV Data
// ============================================

function generateExampleData(): Record<string, any>[] {
  return defaultStocks().map(s => ({
    ticker:        s.ticker,
    current_price: s.currentPrice,
    bull_eps:      s.bull.eps,
    bull_multiple: s.bull.multiple,
    base_eps:      s.base.eps,
    base_multiple: s.base.multiple,
    bear_eps:      s.bear.eps,
    bear_multiple: s.bear.multiple,
    beta:          s.beta,
    eps_uncertainty: s.epsUncertainty,
  }));
}

// ============================================
// Tooltips
// ============================================

const UpsideTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className={`font-mono font-semibold ${typeof p.value === 'number' && p.value < 0 ? 'text-slate-600' : 'text-emerald-600'}`}>
            {typeof p.value === 'number' ? `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const ScoreTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const TpTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">${typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

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
            <Target className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Return Potential Scoring</CardTitle>
        <CardDescription className="text-base mt-2">
          Combine earnings estimates and valuation multiples to derive target prices — score stocks by risk-adjusted upside across Bull, Base, and Bear scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Target className="w-6 h-6 text-primary mb-2" />,
              title: 'Target Price Derivation',
              desc:  'Apply EPS or EBITDA estimates to P/E or EV/EBITDA multiples across three scenarios — Bull, Base, and Bear — to compute a probability-weighted target price.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Upside / Downside Analysis',
              desc:  'Automatically calculate upside % vs current price for each scenario and the weighted average — see where risk/reward is most asymmetric.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Risk-Adjusted Scoring',
              desc:  'Score each stock 0–100 based on weighted upside, penalized by beta and EPS estimate uncertainty — rank and compare across your coverage universe.',
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
            { color: BULL_COLOR,  label: 'Bull Case',   desc: '25% weight — optimistic scenario' },
            { color: BASE_COLOR,  label: 'Base Case',   desc: '50% weight — consensus scenario' },
            { color: BEAR_COLOR,  label: 'Bear Case',   desc: '25% weight — downside scenario' },
            { color: SCORE_COLOR, label: 'Risk Score',  desc: 'Upside adjusted for beta & uncertainty' },
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
            Use Return Potential Scoring when you want to systematically rank equities by forward return potential
            across a coverage universe. The model combines earnings estimates with appropriate valuation multiples
            to derive target prices, then adjusts for risk to produce a comparable score across stocks with
            different risk profiles.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Required CSV Columns
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>ticker</strong> — stock identifier</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>current_price</strong> — latest market price</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>base_eps, base_multiple</strong> — base case estimates</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>bull/bear variants</strong> — optional scenario columns</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>beta, eps_uncertainty</strong> — optional risk inputs</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />What You Get
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Target price per scenario + weighted average</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Upside % vs current price across scenarios</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Risk-adjusted score (0–100) with rating label</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span>Cross-stock ranking and insights</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Target className="mr-2 h-5 w-5" />Load Example Data
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
// Manual Entry Row
// ============================================

interface ManualRowProps {
  stock: StockRow;
  onChange: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
}

const ManualRow: React.FC<ManualRowProps> = ({ stock, onChange, onDelete }) => (
  <tr className="border-t hover:bg-slate-50/30 transition-colors">
    <td className="px-2 py-1.5">
      <Input className="h-7 text-xs w-20 font-semibold" value={stock.ticker}
        onChange={e => onChange(stock.id, 'ticker', e.target.value)} />
    </td>
    <td className="px-2 py-1.5">
      <Input className="h-7 text-xs w-24 font-mono" value={stock.currentPrice}
        onChange={e => onChange(stock.id, 'currentPrice', e.target.value)} />
    </td>
    {(['bull','base','bear'] as ScenarioKey[]).map(sc => (
      <React.Fragment key={sc}>
        <td className="px-2 py-1.5">
          <Input className="h-7 text-xs w-20 font-mono" value={stock[sc].eps}
            onChange={e => onChange(stock.id, `${sc}_eps`, e.target.value)} />
        </td>
        <td className="px-2 py-1.5">
          <Input className="h-7 text-xs w-20 font-mono" value={stock[sc].multiple}
            onChange={e => onChange(stock.id, `${sc}_multiple`, e.target.value)} />
        </td>
      </React.Fragment>
    ))}
    <td className="px-2 py-1.5">
      <Input className="h-7 text-xs w-16 font-mono" value={stock.beta}
        onChange={e => onChange(stock.id, 'beta', e.target.value)} />
    </td>
    <td className="px-2 py-1.5">
      <Input className="h-7 text-xs w-16 font-mono" value={stock.epsUncertainty}
        onChange={e => onChange(stock.id, 'epsUncertainty', e.target.value)} />
    </td>
    <td className="px-2 py-1.5">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600"
        onClick={() => onDelete(stock.id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </td>
  </tr>
);

// ============================================
// Main Component
// ============================================

export default function ReturnPotentialPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Column mapping (CSV mode) ──────────────────────────────
  const [tickerCol,    setTickerCol]    = useState('');
  const [priceCol,     setPriceCol]     = useState('');
  const [baseEpsCol,   setBaseEpsCol]   = useState('');
  const [baseMulCol,   setBaseMulCol]   = useState('');
  const [bullEpsCol,   setBullEpsCol]   = useState('');
  const [bullMulCol,   setBullMulCol]   = useState('');
  const [bearEpsCol,   setBearEpsCol]   = useState('');
  const [bearMulCol,   setBearMulCol]   = useState('');
  const [betaCol,      setBetaCol]      = useState('');
  const [uncCol,       setUncCol]       = useState('');

  // ── Manual entry mode ──────────────────────────────────────
  const [manualStocks, setManualStocks] = useState<StockRow[]>(defaultStocks);
  const [inputMode,    setInputMode]    = useState<'csv' | 'manual'>('manual');
  const [hasStarted,   setHasStarted]   = useState(false);

  // ── UI state ───────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const rows = generateExampleData();
    onExampleLoaded?.(rows, 'example_return_potential.csv');
    setInputMode('csv');
    setHasStarted(true);
    setTickerCol('ticker');       setPriceCol('current_price');
    setBaseEpsCol('base_eps');    setBaseMulCol('base_multiple');
    setBullEpsCol('bull_eps');    setBullMulCol('bull_multiple');
    setBearEpsCol('bear_eps');    setBearMulCol('bear_multiple');
    setBetaCol('beta');           setUncCol('eps_uncertainty');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setTickerCol(''); setPriceCol(''); setBaseEpsCol(''); setBaseMulCol('');
    setBullEpsCol(''); setBullMulCol(''); setBearEpsCol(''); setBearMulCol('');
    setBetaCol(''); setUncCol('');
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
    detect(['ticker', 'symbol', 'stock', 'name'],              setTickerCol,  tickerCol);
    detect(['current_price', 'price', 'close', 'last_price'],  setPriceCol,   priceCol);
    detect(['base_eps', 'eps', 'earnings'],                    setBaseEpsCol, baseEpsCol);
    detect(['base_multiple', 'base_pe', 'multiple', 'pe'],     setBaseMulCol, baseMulCol);
    detect(['bull_eps'],                                        setBullEpsCol, bullEpsCol);
    detect(['bull_multiple', 'bull_pe'],                        setBullMulCol, bullMulCol);
    detect(['bear_eps'],                                        setBearEpsCol, bearEpsCol);
    detect(['bear_multiple', 'bear_pe'],                        setBearMulCol, bearMulCol);
    detect(['beta'],                                            setBetaCol,    betaCol);
    detect(['eps_uncertainty', 'uncertainty', 'dispersion'],    setUncCol,     uncCol);
  }, [hasData, allHeaders]);

  // ── Build stocks from CSV ─────────────────────────────────
  const csvStocks = useMemo((): StockRow[] => {
    if (!tickerCol || !priceCol || !baseEpsCol || !baseMulCol) return [];
    return data
      .map((r, i) => {
        const g  = (k: string) => k && isFinite(parseFloat(String(r[k]))) ? parseFloat(String(r[k])) : null;
        const ticker = String(r[tickerCol] ?? '').trim();
        const price  = g(priceCol);
        const bEps   = g(baseEpsCol);
        const bMul   = g(baseMulCol);
        if (!ticker || !price || !bEps || !bMul) return null;

        const bullEps = g(bullEpsCol) ?? bEps * 1.15;
        const bullMul = g(bullMulCol) ?? bMul * 1.15;
        const bearEps = g(bearEpsCol) ?? bEps * 0.85;
        const bearMul = g(bearMulCol) ?? bMul * 0.85;

        return computeStock({
          id: String(i),
          ticker,
          currentPrice: price,
          bull: computeScenario(bullEps, bullMul, price),
          base: computeScenario(bEps, bMul, price),
          bear: computeScenario(bearEps, bearMul, price),
          beta:           g(betaCol) ?? 1.0,
          epsUncertainty: g(uncCol)  ?? 5,
        });
      })
      .filter((r): r is StockRow => r !== null);
  }, [data, tickerCol, priceCol, baseEpsCol, baseMulCol,
      bullEpsCol, bullMulCol, bearEpsCol, bearMulCol, betaCol, uncCol]);

  const activeStocks = inputMode === 'csv' ? csvStocks : manualStocks;

  // ── Manual entry handlers ──────────────────────────────────
  const handleManualChange = useCallback((id: string, field: string, value: string) => {
    setManualStocks(prev => prev.map(s => {
      if (s.id !== id) return s;
      const num = parseFloat(value);
      let updated = { ...s };

      if (field === 'ticker')        updated.ticker        = value;
      else if (field === 'currentPrice') updated.currentPrice = isFinite(num) ? num : s.currentPrice;
      else if (field === 'beta')         updated.beta         = isFinite(num) ? num : s.beta;
      else if (field === 'epsUncertainty') updated.epsUncertainty = isFinite(num) ? num : s.epsUncertainty;
      else {
        const [sc, prop] = field.split('_') as [ScenarioKey, 'eps' | 'multiple'];
        const newVal = isFinite(num) ? num : s[sc][prop];
        const newScenario = computeScenario(
          prop === 'eps'      ? newVal : s[sc].eps,
          prop === 'multiple' ? newVal : s[sc].multiple,
          updated.currentPrice,
        );
        updated = { ...updated, [sc]: newScenario };
      }
      return computeStock(updated);
    }));
  }, []);

  const handleAddStock = useCallback(() => {
    const newId = String(Date.now());
    const base  = computeScenario(5.0, 20, 100);
    setManualStocks(prev => [...prev, computeStock({
      id: newId, ticker: 'NEW', currentPrice: 100,
      bull: computeScenario(5.75, 23, 100),
      base,
      bear: computeScenario(4.25, 17, 100),
      beta: 1.0, epsUncertainty: 5,
    })]);
  }, []);

  const handleDeleteStock = useCallback((id: string) => {
    setManualStocks(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── Chart data ─────────────────────────────────────────────
  const upsideChartData = useMemo(() =>
    [...activeStocks]
      .sort((a, b) => b.weightedUpside - a.weightedUpside)
      .map(s => ({
        ticker:        s.ticker,
        bull:          s.bull.upside,
        base:          s.base.upside,
        bear:          s.bear.upside,
        weighted:      s.weightedUpside,
      })),
    [activeStocks]
  );

  const scoreChartData = useMemo(() =>
    [...activeStocks]
      .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
      .map(s => ({
        ticker: s.ticker,
        score:  s.riskAdjustedScore,
        label:  s.scoreLabel,
      })),
    [activeStocks]
  );

  const tpChartData = useMemo(() =>
    activeStocks.map(s => ({
      ticker:   s.ticker,
      current:  s.currentPrice,
      bull:     s.bull.targetPrice,
      base:     s.base.targetPrice,
      bear:     s.bear.targetPrice,
      weighted: s.weightedTargetPrice,
    })),
    [activeStocks]
  );

  const isConfigured = activeStocks.length > 0;
  const isExample    = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!activeStocks.length) return;
    const rows = activeStocks.map(s => ({
      ticker:               s.ticker,
      current_price:        s.currentPrice,
      bull_target_price:    s.bull.targetPrice,
      base_target_price:    s.base.targetPrice,
      bear_target_price:    s.bear.targetPrice,
      weighted_target_price:s.weightedTargetPrice,
      bull_upside:          `${s.bull.upside}%`,
      base_upside:          `${s.base.upside}%`,
      bear_upside:          `${s.bear.upside}%`,
      weighted_upside:      `${s.weightedUpside}%`,
      beta:                 s.beta,
      eps_uncertainty:      `${s.epsUncertainty}%`,
      risk_adjusted_score:  s.riskAdjustedScore,
      rating:               s.scoreLabel,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `ReturnPotential_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [activeStocks, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `ReturnPotential_${new Date().toISOString().split('T')[0]}.png`;
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

      {/* ── File Header Bar (CSV mode only) ── */}
      {hasData && (
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
              onClick={handleClearAll} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Data Preview Modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {displayFileName}
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
        </DialogContent>
      </Dialog>

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 2</span>
            <span className="text-xs text-muted-foreground">Equity Valuation</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Return Potential Scoring
          </CardTitle>
          <CardDescription>
            Combine earnings estimates and valuation multiples to derive target prices — score stocks by risk-adjusted upside across Bull, Base, and Bear scenarios.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Input Mode Toggle + CSV Config ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription>Enter stock data manually or map CSV columns.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={inputMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setInputMode('manual')}>
                Manual
              </Button>
              {hasData && (
                <Button size="sm" variant={inputMode === 'csv' ? 'default' : 'outline'}
                  onClick={() => setInputMode('csv')}>
                  CSV
                </Button>
              )}
              {!hasData && (
                <Button size="sm" variant="outline" onClick={handleLoadExample}>
                  Load Example
                </Button>
              )}
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
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticker</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cur Price</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ color: BULL_COLOR }}>Bull EPS</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ color: BULL_COLOR }}>Bull P/E</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ color: BASE_COLOR }}>Base EPS</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ color: BASE_COLOR }}>Base P/E</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ color: BEAR_COLOR }}>Bear EPS</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ color: BEAR_COLOR }}>Bear P/E</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Beta</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">EPS Unc %</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualStocks.map(s => (
                      <ManualRow key={s.id} stock={s} onChange={handleManualChange} onDelete={handleDeleteStock} />
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddStock}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Stock
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'TICKER *',        value: tickerCol,  setter: setTickerCol,  headers: allHeaders     },
                  { label: 'CURRENT PRICE *', value: priceCol,   setter: setPriceCol,   headers: numericHeaders },
                  { label: 'BASE EPS *',       value: baseEpsCol, setter: setBaseEpsCol, headers: numericHeaders },
                  { label: 'BASE MULTIPLE *',  value: baseMulCol, setter: setBaseMulCol, headers: numericHeaders },
                  { label: 'BETA',             value: betaCol,    setter: setBetaCol,    headers: numericHeaders },
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-100 pt-3">
                {[
                  { label: 'BULL EPS',      value: bullEpsCol, setter: setBullEpsCol },
                  { label: 'BULL MULTIPLE', value: bullMulCol, setter: setBullMulCol },
                  { label: 'BEAR EPS',      value: bearEpsCol, setter: setBearEpsCol },
                  { label: 'BEAR MULTIPLE', value: bearMulCol, setter: setBearMulCol },
                  { label: 'EPS UNCERTAINTY', value: uncCol,   setter: setUncCol },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                    <Select value={value || '__none__'} onValueChange={v => setter(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
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
      {isConfigured && (() => {
        const sorted   = [...activeStocks].sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);
        const topStock = sorted[0];
        const avgUpside = activeStocks.reduce((s, r) => s + r.weightedUpside, 0) / activeStocks.length;
        const buys     = activeStocks.filter(s => s.scoreLabel === 'Strong Buy' || s.scoreLabel === 'Buy').length;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Pick</div>
              <div className="text-2xl font-bold font-mono text-slate-800">{topStock.ticker}</div>
              <div className="text-xs text-muted-foreground mt-1.5">Score: {topStock.riskAdjustedScore.toFixed(0)} · {topStock.scoreLabel}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avg Weighted Upside</div>
              <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
                {avgUpside >= 0 ? <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" /> : <ArrowDownRight className="h-5 w-5 shrink-0 text-slate-600" />}
                {avgUpside >= 0 ? '+' : ''}{avgUpside.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">across {activeStocks.length} stocks</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Buy / Strong Buy</div>
              <div className="text-2xl font-bold font-mono text-slate-800">{buys} / {activeStocks.length}</div>
              <div className="text-xs text-muted-foreground mt-1.5">{((buys / activeStocks.length) * 100).toFixed(0)}% of universe</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Highest Upside</div>
              <div className="text-2xl font-bold font-mono text-slate-800">
                {Math.max(...activeStocks.map(s => s.weightedUpside)) >= 0 ? '+' : ''}{Math.max(...activeStocks.map(s => s.weightedUpside)).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {activeStocks.sort((a, b) => b.weightedUpside - a.weightedUpside)[0]?.ticker}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Upside by Scenario ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upside % by Scenario</CardTitle>
              <CardDescription>
                Bull (green) / Base (violet) / Bear (red) upside vs current price — sorted by weighted upside
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={upsideChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={44}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<UpsideTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                  <Bar dataKey="bull"     name="Bull"     fill={BULL_COLOR} fillOpacity={0.75} maxBarSize={20} radius={[2,2,0,0]} />
                  <Bar dataKey="base"     name="Base"     fill={BASE_COLOR} fillOpacity={0.85} maxBarSize={20} radius={[2,2,0,0]} />
                  <Bar dataKey="bear"     name="Bear"     fill={BEAR_COLOR} fillOpacity={0.75} maxBarSize={20} radius={[2,2,0,0]} />
                  <Line dataKey="weighted" name="Weighted Avg" stroke="#1e293b" strokeWidth={2}
                    dot={{ r: 4, fill: '#1e293b' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: Risk-Adjusted Score ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Risk-Adjusted Score Ranking</CardTitle>
              <CardDescription>
                Score 0–100 — weighted upside adjusted for beta and EPS estimate uncertainty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={36} domain={[0, 100]} />
                  <Tooltip content={<ScoreTooltip />} cursor={{ fill: '#F8FAFC' }} />
                  <ReferenceLine y={70} stroke={BULL_COLOR} strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Strong Buy', position: 'right', fontSize: 9, fill: BULL_COLOR }} />
                  <ReferenceLine y={50} stroke={BASE_COLOR} strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Buy', position: 'right', fontSize: 9, fill: BASE_COLOR }} />
                  <ReferenceLine y={35} stroke="#94A3B8" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Hold', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                  <Bar dataKey="score" name="Risk-Adj Score" radius={[3, 3, 0, 0]} maxBarSize={48}>
                    {scoreChartData.map((r, i) => (
                      <Cell key={i}
                        fill={r.score >= 70 ? BULL_COLOR : r.score >= 50 ? BASE_COLOR : r.score >= 35 ? '#94A3B8' : BEAR_COLOR}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: Target Price vs Current ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Target Price vs Current Price</CardTitle>
              <CardDescription>
                Current price (line) vs Bull / Base / Bear target prices — gap = upside or downside
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={tpChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `$${v.toFixed(0)}`} />
                  <Tooltip content={<TpTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="bull" name="Bull TP"     fill={BULL_COLOR} fillOpacity={0.6} maxBarSize={16} radius={[2,2,0,0]} />
                  <Bar dataKey="base" name="Base TP"     fill={BASE_COLOR} fillOpacity={0.7} maxBarSize={16} radius={[2,2,0,0]} />
                  <Bar dataKey="bear" name="Bear TP"     fill={BEAR_COLOR} fillOpacity={0.6} maxBarSize={16} radius={[2,2,0,0]} />
                  <Line dataKey="current" name="Current Price" stroke="#1e293b"
                    strokeWidth={2.5} dot={{ r: 4, fill: '#1e293b' }} connectNulls />
                  <Line dataKey="weighted" name="Weighted TP" stroke={SCORE_COLOR}
                    strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: SCORE_COLOR }} connectNulls />
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
                <Activity className="h-4 w-4 text-slate-400" />
                Stock Detail Table
              </CardTitle>
              <CardDescription>Target prices, upside %, and risk-adjusted scores per stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Ticker', 'Cur Price', 'Bull TP', 'Base TP', 'Bear TP', 'Weighted TP',
                        'Bull Up%', 'Base Up%', 'Bear Up%', 'W. Upside', 'Beta', 'Score', 'Rating'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeStocks].sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore).map((s, i) => (
                      <tr key={s.id} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700">{s.ticker}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">${s.currentPrice.toFixed(1)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">${s.bull.targetPrice.toFixed(1)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">${s.base.targetPrice.toFixed(1)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">${s.bear.targetPrice.toFixed(1)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">${s.weightedTargetPrice.toFixed(1)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.bull.upside >= 0 ? '+' : ''}{s.bull.upside.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.base.upside >= 0 ? '+' : ''}{s.base.upside.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.bear.upside >= 0 ? '+' : ''}{s.bear.upside.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{s.weightedUpside >= 0 ? '+' : ''}{s.weightedUpside.toFixed(1)}%</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.beta.toFixed(1)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{s.riskAdjustedScore.toFixed(0)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${scoreLabelColor(s.scoreLabel)}`}>
                            {s.scoreLabel}
                          </span>
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
        {isConfigured && (() => {
          const sorted    = [...activeStocks].sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);
          const top       = sorted[0];
          const bottom    = sorted[sorted.length - 1];
          const avgUpside = activeStocks.reduce((s, r) => s + r.weightedUpside, 0) / activeStocks.length;
          const highBeta  = activeStocks.filter(s => s.beta > 1.3);
          const asymmetric = activeStocks.filter(s => s.bull.upside > 20 && s.bear.upside > -10);

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated return potential analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Universe Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Analyzed <span className="font-semibold">{activeStocks.length}</span> stocks.
                    Average probability-weighted upside:{' '}
                    <span className={`font-semibold ${avgUpside >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {avgUpside >= 0 ? '+' : ''}{avgUpside.toFixed(1)}%
                    </span>.
                    Top-ranked stock is <span className="font-semibold">{top.ticker}</span>{' '}
                    (score: {top.riskAdjustedScore.toFixed(0)}, weighted upside: {top.weightedUpside >= 0 ? '+' : ''}{top.weightedUpside.toFixed(1)}%).
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Top Score',    value: `${top.ticker} · ${top.riskAdjustedScore.toFixed(0)}`,    sub: top.scoreLabel },
                    { label: 'Lowest Score', value: `${bottom.ticker} · ${bottom.riskAdjustedScore.toFixed(0)}`, sub: bottom.scoreLabel },
                    { label: 'Avg Upside',   value: `${avgUpside >= 0 ? '+' : ''}${avgUpside.toFixed(1)}%`,  sub: 'weighted avg' },
                    { label: 'Buy Rated',    value: `${activeStocks.filter(s => ['Strong Buy','Buy'].includes(s.scoreLabel)).length} / ${activeStocks.length}`, sub: 'Buy or Strong Buy' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-sm font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Top Conviction: {top.ticker}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {top.ticker} scores highest at <span className="font-semibold">{top.riskAdjustedScore.toFixed(0)}/100</span> with
                        a weighted target price of <span className="font-semibold">${top.weightedTargetPrice.toFixed(1)}</span> vs
                        current price of <span className="font-semibold">${top.currentPrice.toFixed(1)}</span>{' '}
                        (weighted upside: <span className="text-emerald-600 font-semibold">{top.weightedUpside >= 0 ? '+' : ''}{top.weightedUpside.toFixed(1)}%</span>).
                        Even in the bear case, the downside is limited to <span className="font-semibold">{top.bear.upside.toFixed(1)}%</span>,
                        suggesting a favorable risk/reward profile.
                      </p>
                    </div>
                  </div>

                  {asymmetric.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Asymmetric Risk/Reward</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {asymmetric.map(s => s.ticker).join(', ')}{' '}
                          {asymmetric.length === 1 ? 'shows' : 'show'} asymmetric upside — bull case upside exceeds 20%
                          while bear case downside is limited (above −10%).
                          These names offer attractive optionality: significant gains in a favorable scenario
                          with relatively contained downside in an adverse one.
                        </p>
                      </div>
                    </div>
                  )}

                  {highBeta.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">High Beta Stocks</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {highBeta.map(s => s.ticker).join(', ')}{' '}
                          {highBeta.length === 1 ? 'has' : 'have'} beta above 1.3, indicating above-market sensitivity.
                          While their raw upside estimates may look attractive, the risk adjustment
                          penalizes high-beta names — position sizing should reflect the higher volatility
                          and potential for sharper drawdowns in a market sell-off.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Score Interpretation</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Scores are computed as: (Weighted Upside / 50) × 100, penalized by (Beta − 1.0) × 10
                        and EPS uncertainty × 0.5. A score of 70+ suggests strong return potential on a risk-adjusted basis.
                        50–70 indicates a positive but less compelling setup. Below 35 reflects limited upside
                        or elevated risk that offsets the return potential.
                        Scenario weights are fixed at 25% Bull / 50% Base / 25% Bear.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Target Price = EPS × P/E Multiple. Weighted Target Price = 25% Bull + 50% Base + 25% Bear.
                  Upside % = (Target Price − Current Price) / Current Price × 100.
                  Risk-Adjusted Score = max(0, min(100, (Weighted Upside / 50 × 100) − (Beta − 1) × 10 − EPS Uncertainty × 0.5)).
                  If Bull/Bear columns are not provided, Bull = Base × 1.15 and Bear = Base × 0.85 (both EPS and Multiple).
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
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
  AreaChart,
  Area,
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
  Layers,
  BarChart3,
  Shuffle,
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
// Constants
// ============================================

const VALUE_COLOR   = '#F59E0B';  // amber
const GROWTH_COLOR  = '#6C3AED'; // purple
const SPREAD_POS    = '#10B981'; // green  (value leads)
const SPREAD_NEG    = '#EF4444'; // red    (growth leads)
const NEUTRAL_COLOR = '#94A3B8';

type RegimeLabel = 'Value Leads' | 'Growth Leads' | 'Neutral';

interface RotationRow {
  date:         string;
  valueReturn:  number;
  growthReturn: number;
  spread:       number;         // value − growth cumulative
  rollingSpread: number | null; // rolling window spread
  regime:       RegimeLabel;
}

interface StockRow {
  ticker:  string;
  factor:  'Value' | 'Growth' | 'Blend';
  ret1m:   number;
  ret3m:   number;
  ret6m:   number;
  per:     number | null;
  pbr:     number | null;
  roe:     number | null;
  revenueGrowth: number | null;
}

const ROLLING_OPTIONS = [
  { label: '1M',  days: 21  },
  { label: '3M',  days: 63  },
  { label: '6M',  days: 126 },
];

// ============================================
// Example Data Generator
// ============================================

function generateExampleTimeSeries(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const start = new Date('2019-01-02');

  // Simulates a realistic value/growth rotation cycle:
  //   2019    → Growth leads (low-rate, momentum driven)
  //   2020 Q1 → COVID crash, both fall; growth recovers faster
  //   2021    → Value rotation (reopening trade, rate fears)
  //   2022    → Value holds better as rates rise sharply
  //   2023    → Growth comeback (AI/tech rally)
  //   2024+   → Mixed; slight value recovery

  let valueCum  = 100;
  let growthCum = 100;

  const phases: { endDay: number; valueDrift: number; growthDrift: number }[] = [
    { endDay:  60,  valueDrift:  0.0002,  growthDrift:  0.0010 }, // 2019 Q1 growth rally
    { endDay: 130,  valueDrift:  0.0004,  growthDrift:  0.0008 }, // 2019 Q2-Q3 growth
    { endDay: 200,  valueDrift:  0.0002,  growthDrift:  0.0005 }, // 2019 Q4 mild
    { endDay: 260,  valueDrift: -0.0025,  growthDrift: -0.0020 }, // 2020 Q1 COVID crash
    { endDay: 340,  valueDrift:  0.0006,  growthDrift:  0.0025 }, // 2020 recovery growth surge
    { endDay: 440,  valueDrift:  0.0015,  growthDrift:  0.0005 }, // 2021 Q1 value rotation
    { endDay: 520,  valueDrift:  0.0008,  growthDrift:  0.0004 }, // 2021 Q2 mixed
    { endDay: 650,  valueDrift:  0.0010,  growthDrift: -0.0005 }, // 2022 rate hike value leads
    { endDay: 780,  valueDrift:  0.0003,  growthDrift:  0.0015 }, // 2023 AI/tech growth
    { endDay: 1000, valueDrift:  0.0006,  growthDrift:  0.0008 }, // 2024 mixed
  ];

  let day = 0;
  for (const phase of phases) {
    while (day < phase.endDay) {
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      if (date.getDay() === 0 || date.getDay() === 6) { day++; continue; }

      const noise = () => (Math.random() - 0.5) * 0.008;
      const vr = phase.valueDrift  + noise();
      const gr = phase.growthDrift + noise();

      valueCum  *= (1 + vr);
      growthCum *= (1 + gr);

      rows.push({
        date:          date.toISOString().split('T')[0],
        value_index:   parseFloat(valueCum.toFixed(4)),
        growth_index:  parseFloat(growthCum.toFixed(4)),
        value_return:  parseFloat((vr  * 100).toFixed(4)),
        growth_return: parseFloat((gr  * 100).toFixed(4)),
      });
      day++;
    }
  }
  return rows;
}

function generateExampleStocks(): Record<string, any>[] {
  return [
    // Value stocks
    { ticker: 'JPM',  factor: 'Value',  ret_1m:  2.1, ret_3m:  8.4, ret_6m: 14.2, per: 11, pbr: 1.6, roe: 15, revenue_growth:  6  },
    { ticker: 'BAC',  factor: 'Value',  ret_1m:  1.8, ret_3m:  6.2, ret_6m: 11.0, per: 10, pbr: 1.1, roe: 10, revenue_growth:  4  },
    { ticker: 'XOM',  factor: 'Value',  ret_1m: -0.8, ret_3m:  3.1, ret_6m:  8.5, per: 13, pbr: 2.0, roe: 18, revenue_growth:  2  },
    { ticker: 'CVX',  factor: 'Value',  ret_1m: -1.2, ret_3m:  2.8, ret_6m:  7.2, per: 12, pbr: 1.8, roe: 14, revenue_growth:  1  },
    { ticker: 'JNJ',  factor: 'Value',  ret_1m: -0.5, ret_3m:  1.2, ret_6m:  5.8, per: 15, pbr: 5.0, roe: 22, revenue_growth:  5  },
    { ticker: 'PG',   factor: 'Value',  ret_1m:  0.3, ret_3m:  3.6, ret_6m:  9.1, per: 24, pbr: 7.5, roe: 32, revenue_growth:  4  },
    { ticker: 'KO',   factor: 'Value',  ret_1m: -0.2, ret_3m:  2.1, ret_6m:  6.4, per: 22, pbr:10.0, roe: 42, revenue_growth:  3  },
    { ticker: 'WMT',  factor: 'Value',  ret_1m:  1.5, ret_3m:  5.8, ret_6m: 12.5, per: 26, pbr: 6.5, roe: 18, revenue_growth:  7  },
    // Growth stocks
    { ticker: 'NVDA', factor: 'Growth', ret_1m: 12.5, ret_3m: 38.2, ret_6m: 82.4, per: 55, pbr: 35,  roe: 90, revenue_growth: 122 },
    { ticker: 'META', factor: 'Growth', ret_1m:  8.2, ret_3m: 22.4, ret_6m: 48.1, per: 22, pbr:  6.5, roe: 28, revenue_growth:  27 },
    { ticker: 'MSFT', factor: 'Growth', ret_1m:  4.1, ret_3m: 12.8, ret_6m: 28.5, per: 32, pbr: 12,  roe: 38, revenue_growth:  17 },
    { ticker: 'GOOGL',factor: 'Growth', ret_1m:  5.3, ret_3m: 14.2, ret_6m: 30.8, per: 24, pbr:  5.5, roe: 25, revenue_growth:  15 },
    { ticker: 'AMZN', factor: 'Growth', ret_1m:  3.8, ret_3m: 10.5, ret_6m: 22.3, per: 60, pbr:  8,  roe: 20, revenue_growth:  13 },
    { ticker: 'TSLA', factor: 'Growth', ret_1m:  6.2, ret_3m: 18.4, ret_6m: -8.2, per: 70, pbr: 12,  roe: 18, revenue_growth:   2 },
    { ticker: 'NFLX', factor: 'Growth', ret_1m:  3.5, ret_3m: 11.2, ret_6m: 24.6, per: 45, pbr: 14,  roe: 26, revenue_growth:  15 },
    // Blend
    { ticker: 'AAPL', factor: 'Blend',  ret_1m:  2.8, ret_3m:  9.5, ret_6m: 20.2, per: 28, pbr: 45,  roe:145, revenue_growth:   8 },
    { ticker: 'WFC',  factor: 'Blend',  ret_1m:  0.9, ret_3m:  4.2, ret_6m:  9.8, per: 11, pbr:  1.2, roe: 11, revenue_growth:   5 },
    { ticker: 'UNH',  factor: 'Blend',  ret_1m: -1.2, ret_3m:  2.8, ret_6m:  8.4, per: 18, pbr:  5,  roe: 24, revenue_growth:  12 },
  ];
}

// ============================================
// Compute helpers
// ============================================

function computeRotation(
  data: Record<string, any>[],
  dateCol: string,
  valueCol: string,
  growthCol: string,
  winSize: number,   // ✅ renamed from 'window' to avoid collision with browser global
): RotationRow[] {
  const rows = data
    .map(r => ({
      date:  String(r[dateCol] ?? ''),
      vr:    parseFloat(r[valueCol])  || 0,
      gr:    parseFloat(r[growthCol]) || 0,
    }))
    .filter(r => r.date);

  if (rows.length === 0) return [];

  // Determine if input is index level or daily return
  const firstV = rows[0].vr;
  const isIndex = firstV > 5; // index starts ~100 vs small % returns

  let valueCum  = isIndex ? rows[0].vr  : 100;
  let growthCum = isIndex ? rows[0].gr  : 100;

  const result: RotationRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const { date, vr, gr } = rows[i];

    if (!isIndex) {
      valueCum  *= (1 + vr  / 100);
      growthCum *= (1 + gr  / 100);
    } else {
      valueCum  = vr;
      growthCum = gr;
    }

    const spread = valueCum - growthCum;

    // Rolling spread: avg daily return diff over winSize
    let rollingSpread: number | null = null;
    if (i >= winSize - 1) {
      let sumDiff = 0;
      for (let j = i - winSize + 1; j <= i; j++) {
        sumDiff += rows[j].vr - rows[j].gr;
      }
      rollingSpread = parseFloat((sumDiff / winSize * 100).toFixed(4));
    }

    const regime: RegimeLabel =
      spread >  2  ? 'Value Leads'  :
      spread < -2  ? 'Growth Leads' :
                     'Neutral';

    result.push({
      date,
      valueReturn:   parseFloat(valueCum.toFixed(4)),
      growthReturn:  parseFloat(growthCum.toFixed(4)),
      spread:        parseFloat(spread.toFixed(4)),
      rollingSpread,
      regime,
    });
  }

  return result;
}

function computeStockStats(
  data: Record<string, any>[],
  tickerCol: string,
  factorCol: string,
  ret1mCol: string,
  ret3mCol: string,
  ret6mCol: string,
  perCol: string,
  pbrCol: string,
  roeCol: string,
  revGrowthCol: string,
): StockRow[] {
  return data.map(r => ({
    ticker:        String(r[tickerCol] ?? '').toUpperCase(),
    factor:        (String(r[factorCol] ?? '')) as StockRow['factor'],
    ret1m:         parseFloat(r[ret1mCol])     || 0,
    ret3m:         parseFloat(r[ret3mCol])     || 0,
    ret6m:         parseFloat(r[ret6mCol])     || 0,
    per:           parseFloat(r[perCol])        || null,
    pbr:           parseFloat(r[pbrCol])        || null,
    roe:           parseFloat(r[roeCol])        || null,
    revenueGrowth: parseFloat(r[revGrowthCol])  || null,
  })).filter(r => r.ticker);
}

// ============================================
// Tooltips
// ============================================

const IndexTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
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

const SpreadTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value as number;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Value − Growth</span>
        <span className={`font-mono font-bold ${v >= 0 ? 'text-amber-600' : 'text-violet-600'}`}>
          {v >= 0 ? '+' : ''}{v?.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
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
            <Shuffle className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Value vs. Growth Rotation</CardTitle>
        <CardDescription className="text-base mt-2">
          Track the relative performance and rotation flow between the value factor and growth factor over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />, title: 'Cumulative Index',    desc: 'Rebase both factors to 100 and track their cumulative paths — divergence reveals which factor has sustained leadership over the full period.' },
            { icon: <BarChart3  className="w-6 h-6 text-primary mb-2" />, title: 'Spread & Regime',     desc: 'The Value − Growth spread chart isolates rotation signal. Configurable rolling window (1M / 3M / 6M) smooths noise and highlights trend inflections.' },
            { icon: <Layers     className="w-6 h-6 text-primary mb-2" />, title: 'Cross-Section Mode',  desc: 'Upload a stock-level dataset with factor labels to compare average returns and fundamentals across Value, Growth, and Blend groups side by side.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Regime legend */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { color: SPREAD_POS,    label: 'Value Leads',  desc: 'Cumulative spread > +2pt — value outperforming' },
            { color: NEUTRAL_COLOR, label: 'Neutral',      desc: 'Spread within ±2pt — no clear leadership' },
            { color: SPREAD_NEG,    label: 'Growth Leads', desc: 'Cumulative spread < −2pt — growth outperforming' },
          ].map(({ color, label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />When to Use
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use this page to understand the macro backdrop for your portfolio. Identifying the current rotation
            regime helps calibrate factor tilts — overweighting value in rising-rate environments and
            growth in low-rate, momentum-driven markets. The spread chart also doubles as a leading indicator
            of macro regime shifts.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Mode A — Time Series
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>date</strong> — trading date</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>value_index / value_return</strong> — value factor series</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>growth_index / growth_return</strong> — growth factor series</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />Mode B — Cross-Section
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>ticker</strong> + <strong>factor</strong> (Value / Growth / Blend)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>ret_1m, ret_3m, ret_6m</strong> — period returns (%)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span><strong>per, pbr, roe, revenue_growth</strong> — optional fundamentals</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onLoadExample} size="lg">
            <Shuffle className="mr-2 h-5 w-5" />
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

export default function ValueGrowthRotationPage({
  data,
  allHeaders,
  numericHeaders,
  fileName,
  onClearData,
  onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Mode: 'timeseries' or 'crosssection' ──────────────────
  const [mode, setMode] = useState<'timeseries' | 'crosssection'>('timeseries');

  // ── Time-series columns ────────────────────────────────────
  const [dateCol,   setDateCol]   = useState('');
  const [valueCol,  setValueCol]  = useState('');
  const [growthCol, setGrowthCol] = useState('');
  const [rollingWin, setRollingWin] = useState(63);

  // ── Cross-section columns ──────────────────────────────────
  const [tickerCol,    setTickerCol]    = useState('');
  const [factorCol,    setFactorCol]    = useState('');
  const [ret1mCol,     setRet1mCol]     = useState('');
  const [ret3mCol,     setRet3mCol]     = useState('');
  const [ret6mCol,     setRet6mCol]     = useState('');
  const [perCol,       setPerCol]       = useState('');
  const [pbrCol,       setPbrCol]       = useState('');
  const [roeCol,       setRoeCol]       = useState('');
  const [revGrowthCol, setRevGrowthCol] = useState('');

  // ── UI state ───────────────────────────────────────────────
  const [returnWindow,  setReturnWindow]  = useState<'ret1m' | 'ret3m' | 'ret6m'>('ret3m');
  const [sortKey,       setSortKey]       = useState<'ret3m' | 'ret1m' | 'ret6m' | 'ticker' | 'per'>('ret3m');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [factorFilter,  setFactorFilter]  = useState<'all' | 'Value' | 'Growth' | 'Blend'>('all');
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    // Load time-series first; user can switch to cross-section manually
    const tsRows = generateExampleTimeSeries();
    onExampleLoaded?.(tsRows, 'example_value_growth_ts.csv');
    setMode('timeseries');
    setRollingWin(63);
  }, [onExampleLoaded]);

  // ── Load cross-section example ─────────────────────────────
  const handleLoadCrossSection = useCallback(() => {
    const csRows = generateExampleStocks();
    onExampleLoaded?.(csRows, 'example_value_growth_cs.csv');
    setMode('crosssection');
  }, [onExampleLoaded]);

  // ── Clear ──────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setDateCol(''); setValueCol(''); setGrowthCol('');
    setTickerCol(''); setFactorCol(''); setRet1mCol(''); setRet3mCol(''); setRet6mCol('');
    setPerCol(''); setPbrCol(''); setRoeCol(''); setRevGrowthCol('');
    if (onClearData) onClearData();
  }, [onClearData]);

  // ── Auto-detect ────────────────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 3 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    // time-series
    detect(['date'],                                   setDateCol,   dateCol);
    detect(['value_index', 'value_return', 'value'],   setValueCol,  valueCol);
    detect(['growth_index','growth_return','growth'],   setGrowthCol, growthCol);
    // cross-section
    detect(['ticker','symbol','name'],                 setTickerCol,    tickerCol);
    detect(['factor','style','type'],                  setFactorCol,    factorCol);
    detect(['ret_1m','return_1m','1m_return','ret1m'],  setRet1mCol,    ret1mCol);
    detect(['ret_3m','return_3m','3m_return','ret3m'],  setRet3mCol,    ret3mCol);
    detect(['ret_6m','return_6m','6m_return','ret6m'],  setRet6mCol,    ret6mCol);
    detect(['per','p/e','pe_ratio'],                    setPerCol,      perCol);
    detect(['pbr','p/b','pb_ratio'],                    setPbrCol,      pbrCol);
    detect(['roe','return_on_equity'],                  setRoeCol,      roeCol);
    detect(['revenue_growth','rev_growth','sales_growth'], setRevGrowthCol, revGrowthCol);
  }, [hasData, allHeaders]);

  // ── Time-series computation ────────────────────────────────
  const rotation = useMemo(() => {
    if (mode !== 'timeseries' || !dateCol || !valueCol || !growthCol) return [];
    return computeRotation(data, dateCol, valueCol, growthCol, rollingWin);
  }, [mode, data, dateCol, valueCol, growthCol, rollingWin]);

  // Sample every N rows for chart performance
  const chartData = useMemo(() => {
    if (rotation.length <= 500) return rotation;
    const step = Math.ceil(rotation.length / 500);
    return rotation.filter((_, i) => i % step === 0);
  }, [rotation]);

  // ── Regime summary ─────────────────────────────────────────
  const regimeCounts = useMemo(() => {
    const c: Record<RegimeLabel, number> = { 'Value Leads': 0, 'Neutral': 0, 'Growth Leads': 0 };
    for (const r of rotation) c[r.regime]++;
    return c;
  }, [rotation]);

  const currentRegime: RegimeLabel | null = rotation.length > 0 ? rotation[rotation.length - 1].regime : null;
  const currentSpread  = rotation.length > 0 ? rotation[rotation.length - 1].spread  : 0;
  const peakValueLead  = rotation.length > 0 ? Math.max(...rotation.map(r => r.spread)) : 0;
  const peakGrowthLead = rotation.length > 0 ? Math.min(...rotation.map(r => r.spread)) : 0;

  // ── Cross-section computation ──────────────────────────────
  const stocks = useMemo(() => {
    if (mode !== 'crosssection' || !tickerCol) return [];
    return computeStockStats(data, tickerCol, factorCol, ret1mCol, ret3mCol, ret6mCol, perCol, pbrCol, roeCol, revGrowthCol);
  }, [mode, data, tickerCol, factorCol, ret1mCol, ret3mCol, ret6mCol, perCol, pbrCol, roeCol, revGrowthCol]);

  // ── Factor averages for bar chart ──────────────────────────
  const factorAvg = useMemo(() => {
    const factors = ['Value', 'Growth', 'Blend'] as const;
    return factors.map(f => {
      const s = stocks.filter(r => r.factor === f);
      const avg = (key: keyof StockRow) => {
        const vals = s.map(r => r[key] as number).filter(v => isFinite(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      };
      return {
        factor: f,
        ret1m:  parseFloat(avg('ret1m').toFixed(2)),
        ret3m:  parseFloat(avg('ret3m').toFixed(2)),
        ret6m:  parseFloat(avg('ret6m').toFixed(2)),
        count:  s.length,
        color:  f === 'Value' ? VALUE_COLOR : f === 'Growth' ? GROWTH_COLOR : NEUTRAL_COLOR,
      };
    }).filter(f => f.count > 0);
  }, [stocks]);

  // ── Filtered + sorted stock table ─────────────────────────
  const filteredStocks = useMemo(() => {
    const base = factorFilter === 'all' ? stocks : stocks.filter(s => s.factor === factorFilter);
    return [...base].sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? (va ?? 0) - (vb ?? 0) : (vb ?? 0) - (va ?? 0);
    });
  }, [stocks, factorFilter, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir(key === 'ticker' ? 'asc' : 'desc'); }
  };

  const isExample       = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';
  const isTSConfigured  = mode === 'timeseries'   && rotation.length > 0;
  const isCSConfigured  = mode === 'crosssection' && stocks.length   > 0;
  const isConfigured    = isTSConfigured || isCSConfigured;

  // ── Downloads ──────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    const rows = mode === 'timeseries'
      ? rotation.map(r => ({ date: r.date, value_index: r.valueReturn, growth_index: r.growthReturn, spread: r.spread, rolling_spread: r.rollingSpread ?? '', regime: r.regime }))
      : stocks.map(s => ({ ticker: s.ticker, factor: s.factor, ret_1m: s.ret1m, ret_3m: s.ret3m, ret_6m: s.ret6m, per: s.per ?? '', pbr: s.pbr ?? '', roe: s.roe ?? '', revenue_growth: s.revenueGrowth ?? '' }));
    if (!rows.length) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows as any)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `ValueGrowthRotation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [mode, rotation, stocks, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `ValueGrowthRotation_${new Date().toISOString().split('T')[0]}.png`;
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
              link.href = URL.createObjectURL(new Blob([Papa.unparse(data as any)], { type: 'text/csv;charset=utf-8;' }));
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
          {data.length > 100 && <p className="text-xs text-muted-foreground pt-2">Showing first 100 of {data.length.toLocaleString()} rows</p>}
        </DialogContent>
      </Dialog>

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 2</span>
            <span className="text-xs text-muted-foreground">Quant Screening</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Value vs. Growth Rotation
          </CardTitle>
          <CardDescription>
            Track relative performance and rotation flow between the value factor and growth factor — identify the current regime and when to shift factor tilts.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>Select analysis mode and map your columns.</CardDescription>
            </div>
            {/* Mode toggle */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {([
                { key: 'timeseries',   label: 'Time Series'   },
                { key: 'crosssection', label: 'Cross-Section' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setMode(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                    ${mode === key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === 'timeseries' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'DATE *',          value: dateCol,   setter: setDateCol,   headers: allHeaders,     opt: false },
                  { label: 'VALUE SERIES *',  value: valueCol,  setter: setValueCol,  headers: numericHeaders, opt: false },
                  { label: 'GROWTH SERIES *', value: growthCol, setter: setGrowthCol, headers: numericHeaders, opt: false },
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
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rolling Window</span>
                <div className="flex gap-1">
                  {ROLLING_OPTIONS.map(({ label, days }) => (
                    <button key={days} onClick={() => setRollingWin(days)}
                      className={`px-2.5 py-1 rounded text-xs font-bold border transition-all
                        ${rollingWin === days
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: 'TICKER *',       value: tickerCol,    setter: setTickerCol,    headers: allHeaders,     opt: false },
                  { label: 'FACTOR *',       value: factorCol,    setter: setFactorCol,    headers: allHeaders,     opt: false },
                  { label: 'RET 1M (%)',     value: ret1mCol,     setter: setRet1mCol,     headers: numericHeaders, opt: true  },
                  { label: 'RET 3M (%)',     value: ret3mCol,     setter: setRet3mCol,     headers: numericHeaders, opt: true  },
                  { label: 'RET 6M (%)',     value: ret6mCol,     setter: setRet6mCol,     headers: numericHeaders, opt: true  },
                  { label: 'PER',            value: perCol,       setter: setPerCol,       headers: numericHeaders, opt: true  },
                  { label: 'PBR',            value: pbrCol,       setter: setPbrCol,       headers: numericHeaders, opt: true  },
                  { label: 'ROE (%)',        value: roeCol,       setter: setRoeCol,       headers: numericHeaders, opt: true  },
                  { label: 'REV GROWTH (%)', value: revGrowthCol, setter: setRevGrowthCol, headers: numericHeaders, opt: true  },
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
              {isExample && (
                <button onClick={handleLoadCrossSection}
                  className="text-xs text-primary underline hover:no-underline">
                  Switch to cross-section example data →
                </button>
              )}
            </>
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
            <DropdownMenuContent align="end" className="w-48">
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
      {isTSConfigured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Regime</div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{
                backgroundColor: currentRegime === 'Value Leads' ? SPREAD_POS : currentRegime === 'Growth Leads' ? SPREAD_NEG : NEUTRAL_COLOR
              }} />
              <span className="text-lg font-bold text-slate-800 leading-tight">{currentRegime}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Spread {currentSpread >= 0 ? '+' : ''}{currentSpread.toFixed(2)}pt
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Value-Led Days</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">{regimeCounts['Value Leads']}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {rotation.length > 0 ? `${((regimeCounts['Value Leads'] / rotation.length) * 100).toFixed(0)}% of period` : ''}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Growth-Led Days</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">{regimeCounts['Growth Leads']}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {rotation.length > 0 ? `${((regimeCounts['Growth Leads'] / rotation.length) * 100).toFixed(0)}% of period` : ''}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Peak Value Lead</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">
              {peakValueLead >= 0 ? '+' : ''}{peakValueLead.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Max spread vs {Math.abs(peakGrowthLead).toFixed(1)} growth peak
            </div>
          </div>
        </div>
      )}

      {isCSConfigured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {factorAvg.map(f => (
            <div key={f.factor} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{f.factor}</div>
              </div>
              <div className="text-2xl font-bold text-slate-800 font-mono">
                {f.ret3m >= 0 ? '+' : ''}{f.ret3m.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">{f.count} stocks · 3M avg</div>
            </div>
          ))}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Stocks</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">{stocks.length}</div>
            <div className="text-xs text-muted-foreground mt-1.5">across all factor groups</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Time-Series Charts ── */}
        {isTSConfigured && (
          <>
            {/* Cumulative index chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cumulative Performance — Value vs. Growth</CardTitle>
                <CardDescription>Rebased to 100 at start of period — divergence shows sustained factor leadership</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      interval={Math.floor(chartData.length / 8)}
                      tickFormatter={d => d?.slice(0, 7) ?? ''} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48}
                      tickFormatter={v => v.toFixed(0)} />
                    <Tooltip content={<IndexTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line dataKey="valueReturn"  name="Value"  stroke={VALUE_COLOR}  strokeWidth={2} dot={false} />
                    <Line dataKey="growthReturn" name="Growth" stroke={GROWTH_COLOR} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Spread (Value − Growth) area chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Value − Growth Spread</CardTitle>
                <CardDescription>
                  Positive = value outperforming · Negative = growth outperforming · Dashed line at zero
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="spreadPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={SPREAD_POS} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={SPREAD_POS} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="spreadNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={SPREAD_NEG} stopOpacity={0.02} />
                        <stop offset="95%" stopColor={SPREAD_NEG} stopOpacity={0.25} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      interval={Math.floor(chartData.length / 8)}
                      tickFormatter={d => d?.slice(0, 7) ?? ''} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48}
                      tickFormatter={v => v.toFixed(0)} />
                    <Tooltip content={<SpreadTooltip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="5 3" strokeWidth={1.5} />
                    <Area dataKey="spread" name="V−G Spread"
                      stroke={currentSpread >= 0 ? SPREAD_POS : SPREAD_NEG}
                      fill={currentSpread >= 0 ? 'url(#spreadPos)' : 'url(#spreadNeg)'}
                      strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rolling spread bar chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Rolling {ROLLING_OPTIONS.find(o => o.days === rollingWin)?.label} Spread (Average Daily Diff × 100)
                </CardTitle>
                <CardDescription>Smoothed rotation signal — bars above zero signal value leadership momentum</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // ✅ Build a stable array once so Bar data and Cell indices always match
                  const rollingBarData = chartData
                    .filter(r => r.rollingSpread !== null)
                    .filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 120)) === 0);
                  return (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={rollingBarData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                          axisLine={{ stroke: '#E2E8F0' }}
                          interval={Math.floor(rollingBarData.length / 8)}
                          tickFormatter={d => d?.slice(0, 7) ?? ''} />
                        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48} />
                        <Tooltip content={<SpreadTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                        <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                        <Bar dataKey="rollingSpread" name="Rolling Spread" maxBarSize={6} radius={[1, 1, 0, 0]}>
                          {rollingBarData.map((entry, i) => (
                            <Cell key={i} fill={(entry.rollingSpread ?? 0) >= 0 ? SPREAD_POS : SPREAD_NEG} fillOpacity={0.75} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Cross-Section Charts ── */}
        {isCSConfigured && (
          <>
            {/* Factor avg return comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Factor Average Returns — 1M · 3M · 6M</CardTitle>
                <CardDescription>Equal-weighted average return by factor group across all three windows</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={factorAvg}
                    margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={false} />
                    <XAxis dataKey="factor" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={44}
                      tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`} />
                    <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                    <Bar dataKey="ret1m" name="1M Return" maxBarSize={28} radius={[3, 3, 0, 0]} fillOpacity={0.7}>
                      {factorAvg.map((f, i) => <Cell key={i} fill={f.color} />)}
                    </Bar>
                    <Bar dataKey="ret3m" name="3M Return" maxBarSize={28} radius={[3, 3, 0, 0]} fillOpacity={0.85}>
                      {factorAvg.map((f, i) => <Cell key={i} fill={f.color} />)}
                    </Bar>
                    <Bar dataKey="ret6m" name="6M Return" maxBarSize={28} radius={[3, 3, 0, 0]}>
                      {factorAvg.map((f, i) => <Cell key={i} fill={f.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stock table */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                      All Stocks — Factor Breakdown
                    </CardTitle>
                    <CardDescription>{filteredStocks.length} stocks · click headers to sort</CardDescription>
                  </div>
                  {/* Return window tabs */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <div className="flex gap-1 mr-2">
                      {(['ret1m', 'ret3m', 'ret6m'] as const).map(k => (
                        <button key={k} onClick={() => setReturnWindow(k)}
                          className={`px-2 py-0.5 rounded text-xs font-bold border transition-all
                            ${returnWindow === k ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200'}`}>
                          {k === 'ret1m' ? '1M' : k === 'ret3m' ? '3M' : '6M'}
                        </button>
                      ))}
                    </div>
                    {(['all', 'Value', 'Growth', 'Blend'] as const).map(f => (
                      <button key={f} onClick={() => setFactorFilter(f)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all
                          ${factorFilter === f ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                        {f === 'all' ? 'All' : f}
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
                          { key: 'ticker', label: 'Ticker',    align: 'left'  },
                          { key: null,     label: 'Factor',    align: 'left'  },
                          { key: 'ret1m',  label: '1M Ret',    align: 'right' },
                          { key: 'ret3m',  label: '3M Ret',    align: 'right' },
                          { key: 'ret6m',  label: '6M Ret',    align: 'right' },
                          { key: 'per',    label: 'PER',       align: 'right' },
                          { key: null,     label: 'PBR',       align: 'right' },
                          { key: null,     label: 'Rev Gr%',   align: 'right' },
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
                      {filteredStocks.map(s => {
                        const factorColor = s.factor === 'Value' ? VALUE_COLOR : s.factor === 'Growth' ? GROWTH_COLOR : NEUTRAL_COLOR;
                        const retColor    = (v: number) => v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-500' : 'text-slate-500';
                        return (
                          <tr key={s.ticker} className="border-t hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">{s.ticker}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: factorColor }} />
                                <span className="text-xs font-semibold text-slate-600">{s.factor}</span>
                              </div>
                            </td>
                            {[s.ret1m, s.ret3m, s.ret6m].map((v, i) => (
                              <td key={i} className={`px-3 py-2.5 text-right font-mono text-xs font-semibold ${retColor(v)}`}>
                                {v >= 0 ? '+' : ''}{v.toFixed(2)}%
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500">{s.per?.toFixed(1) ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500">{s.pbr?.toFixed(1) ?? '—'}</td>
                            <td className={`px-3 py-2.5 text-right font-mono text-xs font-semibold
                              ${(s.revenueGrowth ?? 0) > 20 ? 'text-violet-600' : (s.revenueGrowth ?? 0) > 5 ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {s.revenueGrowth != null ? `${s.revenueGrowth >= 0 ? '+' : ''}${s.revenueGrowth.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Insights ── */}
        {isTSConfigured && currentRegime && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Insights & Interpretation
              </CardTitle>
              <CardDescription>Auto-generated rotation analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <span className="text-xs font-bold uppercase tracking-wide text-primary">Rotation Overview</span>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Analyzed <span className="font-semibold">{rotation.length.toLocaleString()}</span> trading days.
                  Value led on <span className="font-semibold">{regimeCounts['Value Leads']}</span> days (
                  {((regimeCounts['Value Leads'] / rotation.length) * 100).toFixed(0)}%), growth led on{' '}
                  <span className="font-semibold">{regimeCounts['Growth Leads']}</span> days (
                  {((regimeCounts['Growth Leads'] / rotation.length) * 100).toFixed(0)}%).
                  Current regime is <span className="font-semibold">{currentRegime}</span> with a spread of{' '}
                  <span className="font-mono font-semibold">
                    {currentSpread >= 0 ? '+' : ''}{currentSpread.toFixed(2)}
                  </span>.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Value Leads', count: regimeCounts['Value Leads'],  color: SPREAD_POS   },
                  { label: 'Neutral',     count: regimeCounts['Neutral'],       color: NEUTRAL_COLOR },
                  { label: 'Growth Leads',count: regimeCounts['Growth Leads'],  color: SPREAD_NEG   },
                ].map(({ label, count, color }) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
                    </div>
                    <div className="text-lg font-bold font-mono text-slate-700">{count}</div>
                    <div className="text-xs text-muted-foreground">
                      {rotation.length > 0 ? `${((count / rotation.length) * 100).toFixed(0)}% of period` : ''}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                <div className="flex gap-3 items-start">
                  <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-0.5">Current Regime — {currentRegime}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The most recent reading places the market in the{' '}
                      <span className="font-semibold">{currentRegime}</span> regime.{' '}
                      {currentRegime === 'Value Leads'
                        ? 'This typically coincides with rising real rates, normalizing economic conditions, or rotation out of extended growth valuations. Consider overweighting financials, energy, and industrials.'
                        : currentRegime === 'Growth Leads'
                        ? 'This typically occurs in low-rate, risk-on environments or during technology/innovation cycles. Growth factor momentum tends to persist in this regime.'
                        : 'Neither factor has clear sustained leadership. This neutral phase often precedes a rotation trigger — monitor macro variables (real rates, yield curve) for direction clues.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-0.5">Historical Balance</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Over the full period, {regimeCounts['Value Leads'] > regimeCounts['Growth Leads'] ? 'value' : 'growth'} dominated for more trading days
                      ({Math.max(regimeCounts['Value Leads'], regimeCounts['Growth Leads'])} vs{' '}
                      {Math.min(regimeCounts['Value Leads'], regimeCounts['Growth Leads'])} days).
                      Peak value spread reached <span className="font-mono">+{peakValueLead.toFixed(2)}</span> and
                      peak growth spread reached <span className="font-mono">{peakGrowthLead.toFixed(2)}</span>.
                      The magnitude of these extremes reflects the volatility of factor rotation over the period.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-0.5">Rotation Signal Interpretation</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The rolling spread chart filters daily noise to reveal trend momentum in rotation.
                      Consecutive positive bars signal building value momentum — a setup for factor overweight.
                      A sign flip from positive to negative (or vice versa) in the rolling spread is a leading indicator
                      of regime change, often leading index-level confirmation by 3–6 weeks.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                ※ Regime classification uses a ±2pt spread threshold on cumulative rebased indices.
                The rolling spread window is configurable (1M / 3M / 6M) and represents average daily return
                differential × 100 over the selected window.
                This analysis is auto-generated for reference only and does not constitute investment advice.
              </p>
            </CardContent>
          </Card>
        )}

        {isCSConfigured && (() => {
          const valueStocks  = stocks.filter(s => s.factor === 'Value');
          const growthStocks = stocks.filter(s => s.factor === 'Growth');
          const avgRet = (arr: StockRow[], key: 'ret1m' | 'ret3m' | 'ret6m') =>
            arr.length ? arr.reduce((s, r) => s + r[key], 0) / arr.length : 0;
          const vAvg3 = avgRet(valueStocks, 'ret3m');
          const gAvg3 = avgRet(growthStocks, 'ret3m');
          const leading = vAvg3 > gAvg3 ? 'Value' : 'Growth';
          const topValue  = [...valueStocks].sort((a, b) => b.ret3m - a.ret3m)[0];
          const topGrowth = [...growthStocks].sort((a, b) => b.ret3m - a.ret3m)[0];
          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Cross-Section Insights
                </CardTitle>
                <CardDescription>Auto-generated factor performance analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Factor Snapshot</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Across <span className="font-semibold">{stocks.length}</span> stocks,{' '}
                    <span className="font-semibold">{leading}</span> is currently leading on a 3M basis —
                    avg return <span className="font-mono font-semibold" style={{ color: leading === 'Value' ? VALUE_COLOR : GROWTH_COLOR }}>
                      {leading === 'Value' ? `+${vAvg3.toFixed(2)}%` : `+${gAvg3.toFixed(2)}%`}
                    </span> vs{' '}
                    <span className="font-mono">
                      {leading === 'Value' ? `${gAvg3 >= 0 ? '+' : ''}${gAvg3.toFixed(2)}%` : `${vAvg3 >= 0 ? '+' : ''}${vAvg3.toFixed(2)}%`}
                    </span> for the lagging factor.
                  </p>
                </div>

                <div className="space-y-3">
                  {topValue && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Top Value Stock — {topValue.ticker}</p>
                        <p className="text-sm text-muted-foreground">
                          Best-performing value name with a 3M return of{' '}
                          <span className="font-mono font-semibold">+{topValue.ret3m.toFixed(2)}%</span>.
                          {topValue.per != null && ` PER ${topValue.per.toFixed(1)}x`}
                          {topValue.roe != null && `, ROE ${topValue.roe.toFixed(1)}%`}.
                        </p>
                      </div>
                    </div>
                  )}
                  {topGrowth && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Top Growth Stock — {topGrowth.ticker}</p>
                        <p className="text-sm text-muted-foreground">
                          Best-performing growth name with a 3M return of{' '}
                          <span className="font-mono font-semibold">+{topGrowth.ret3m.toFixed(2)}%</span>.
                          {topGrowth.revenueGrowth != null && ` Revenue growth ${topGrowth.revenueGrowth.toFixed(1)}%`}
                          {topGrowth.per != null && `, PER ${topGrowth.per.toFixed(1)}x`}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Factor classification is based on the <strong>factor</strong> column in your data (Value / Growth / Blend).
                  Returns are as provided — this page does not compute returns from price data.
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
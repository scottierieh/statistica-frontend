'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ComposedChart, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, LabelList,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  Clock, TrendingUp, BarChart3, Activity, Plus, Trash2,
  CheckCircle, FileText, Eye, X, ArrowUpRight, ArrowDownRight,
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

// ============================================
// Types
// ============================================

interface CashFlowRow {
  id:     string;
  period: string;
  cf:     number | null;
}

interface ProjectEntry {
  id:           string;
  name:         string;
  initialInv:   number | null;
  discountRate: number;
  cashFlows:    CashFlowRow[];
  enabled:      boolean;
}

interface PaybackResult {
  id:             string;
  name:           string;
  initialInv:     number;
  discountRate:   number;
  allCFs:         number[];
  cumCF:          number[];
  cumDCF:         number[];
  payback:        number | null;
  discPayback:    number | null;
  totalReturn:    number;
  roi:            number | null;
  breakEvenPct:   number | null;
  chartData:      { period: string; cf: number; cumCF: number; cumDCF: number; pv: number }[];
  signal:         string;
}

// ============================================
// Math helpers
// ============================================

function calcPayback(allCFs: number[]): number | null {
  let cum = 0;
  for (let t = 0; t < allCFs.length; t++) {
    const prev = cum;
    cum += allCFs[t];
    if (cum >= 0) {
      if (t === 0) return 0;
      return (t - 1) + (-prev / allCFs[t]);
    }
  }
  return null; // never recovered
}

function calcDiscPayback(allCFs: number[], rate: number): number | null {
  let cum = 0;
  for (let t = 0; t < allCFs.length; t++) {
    const pv   = allCFs[t] / Math.pow(1 + rate, t);
    const prev = cum;
    cum += pv;
    if (cum >= 0) {
      if (t === 0) return 0;
      return (t - 1) + (-prev / pv);
    }
  }
  return null;
}

function getSignal(payback: number | null, horizon: number): string {
  if (payback === null)       return 'Never';
  if (payback <= horizon / 3) return 'Fast';
  if (payback <= horizon / 2) return 'Moderate';
  if (payback <= horizon)     return 'Slow';
  return 'Beyond Horizon';
}

function signalBadgeClass(sig: string): string {
  if (sig === 'Fast')           return 'bg-emerald-100 text-emerald-700';
  if (sig === 'Moderate')       return 'bg-green-100 text-green-700';
  if (sig === 'Slow')           return 'bg-amber-100 text-amber-700';
  if (sig === 'Beyond Horizon') return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-600';
}

function paybackBarColor(sig: string): string {
  if (sig === 'Fast')           return '#10B981';
  if (sig === 'Moderate')       return '#34D399';
  if (sig === 'Slow')           return '#F59E0B';
  if (sig === 'Beyond Horizon') return '#F97316';
  return '#EF4444';
}

function fmtM(n: number | null): string {
  if (n === null) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtYr(n: number | null): string {
  if (n === null) return '—';
  const yrs  = Math.floor(n);
  const mos  = Math.round((n - yrs) * 12);
  if (mos === 0) return `${yrs} yr${yrs !== 1 ? 's' : ''}`;
  if (yrs === 0) return `${mos} mo${mos !== 1 ? 's' : ''}`;
  return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mos} mo${mos !== 1 ? 's' : ''}`;
}

// ============================================
// Computation
// ============================================

function computeProject(p: ProjectEntry): PaybackResult | null {
  if (!p.enabled || p.initialInv === null || p.cashFlows.length === 0) return null;
  const rate   = (p.discountRate || 0) / 100;
  const allCFs = [-(p.initialInv), ...p.cashFlows.map(c => c.cf ?? 0)];
  const n      = allCFs.length;

  const cumCF: number[]  = [];
  const cumDCF: number[] = [];
  let runCF = 0, runDCF = 0;
  for (let t = 0; t < n; t++) {
    runCF  += allCFs[t];
    runDCF += allCFs[t] / Math.pow(1 + rate, t);
    cumCF.push(parseFloat(runCF.toFixed(2)));
    cumDCF.push(parseFloat(runDCF.toFixed(2)));
  }

  const payback     = calcPayback(allCFs);
  const discPayback = rate > 0 ? calcDiscPayback(allCFs, rate) : null;
  const totalReturn = cumCF[cumCF.length - 1];
  const roi         = p.initialInv > 0 ? totalReturn / p.initialInv : null;
  const horizon     = p.cashFlows.length;
  const breakEvenPct = payback !== null ? payback / horizon * 100 : null;

  const chartData = allCFs.map((cf, t) => ({
    period: t === 0 ? 'Year 0' : `Year ${t}`,
    cf:     parseFloat(cf.toFixed(2)),
    cumCF:  cumCF[t],
    cumDCF: cumDCF[t],
    pv:     parseFloat((allCFs[t] / Math.pow(1 + rate, t)).toFixed(2)),
  }));

  return {
    id: p.id, name: p.name,
    initialInv: p.initialInv, discountRate: rate,
    allCFs, cumCF, cumDCF,
    payback, discPayback,
    totalReturn, roi, breakEvenPct,
    chartData,
    signal: getSignal(payback, horizon),
  };
}

function computeFromCSV(
  rows: Record<string, any>[],
  cols: { project: string; period: string; cf: string; rate: string }
): ProjectEntry[] {
  const map = new Map<string, ProjectEntry>();
  for (const r of rows) {
    const name   = String(r[cols.project] ?? '').trim();
    const period = String(r[cols.period]  ?? '').trim().toLowerCase();
    const cf     = parseFloat(r[cols.cf]);
    const rate   = parseFloat(r[cols.rate]) || 0;
    if (!name || !isFinite(cf)) continue;
    if (!map.has(name))
      map.set(name, { id: name, name, initialInv: null, discountRate: rate, cashFlows: [], enabled: true });
    const p = map.get(name)!;
    if (period.includes('0') || period.includes('initial') || period.includes('invest')) {
      p.initialInv = cf < 0 ? -cf : cf;
    } else {
      p.cashFlows.push({ id: `${name}-${period}`, period: String(r[cols.period] ?? '').trim(), cf });
    }
  }
  return Array.from(map.values());
}

// ============================================
// Default data
// ============================================

function defaultProjects(): ProjectEntry[] {
  return [
    {
      id: '1', name: 'Project Alpha', enabled: true,
      initialInv: 1000000, discountRate: 10,
      cashFlows: [
        { id: 'a1', period: 'Year 1', cf: 250000 },
        { id: 'a2', period: 'Year 2', cf: 300000 },
        { id: 'a3', period: 'Year 3', cf: 350000 },
        { id: 'a4', period: 'Year 4', cf: 400000 },
        { id: 'a5', period: 'Year 5', cf: 450000 },
        { id: 'a6', period: 'Year 6', cf: 300000 },
        { id: 'a7', period: 'Year 7', cf: 200000 },
      ],
    },
    {
      id: '2', name: 'Project Beta', enabled: true,
      initialInv: 600000, discountRate: 10,
      cashFlows: [
        { id: 'b1', period: 'Year 1', cf: 400000 },
        { id: 'b2', period: 'Year 2', cf: 300000 },
        { id: 'b3', period: 'Year 3', cf: 200000 },
        { id: 'b4', period: 'Year 4', cf: 150000 },
        { id: 'b5', period: 'Year 5', cf: 100000 },
      ],
    },
    {
      id: '3', name: 'Project Gamma', enabled: true,
      initialInv: 2000000, discountRate: 8,
      cashFlows: [
        { id: 'c1', period: 'Year 1', cf: 100000 },
        { id: 'c2', period: 'Year 2', cf: 200000 },
        { id: 'c3', period: 'Year 3', cf: 350000 },
        { id: 'c4', period: 'Year 4', cf: 500000 },
        { id: 'c5', period: 'Year 5', cf: 650000 },
        { id: 'c6', period: 'Year 6', cf: 700000 },
        { id: 'c7', period: 'Year 7', cf: 500000 },
        { id: 'c8', period: 'Year 8', cf: 300000 },
      ],
    },
  ];
}

function generateExampleCSV(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  for (const p of defaultProjects()) {
    rows.push({ project: p.name, period: 'Year 0', cash_flow: -(p.initialInv ?? 0), discount_rate: p.discountRate });
    for (const c of p.cashFlows)
      rows.push({ project: p.name, period: c.period, cash_flow: c.cf, discount_rate: p.discountRate });
  }
  return rows;
}

// ============================================
// Tooltips
// ============================================

const CumTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.stroke ?? p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{fmtM(p.value)}</span>
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
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Payback</span>
        <span className="font-mono font-semibold">{fmtYr(payload[0]?.value)}</span>
      </div>
    </div>
  );
};

// ============================================
// Project Editor
// ============================================

const ProjectEditor = ({ project, onChange, onDelete }: {
  project: ProjectEntry;
  onChange: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
}) => {
  const addCF = () => onChange(project.id, 'cashFlows', [
    ...project.cashFlows,
    { id: String(Date.now()), period: `Year ${project.cashFlows.length + 1}`, cf: null },
  ]);

  const updateCF = (cfId: string, field: 'period' | 'cf', val: string) =>
    onChange(project.id, 'cashFlows', project.cashFlows.map(c =>
      c.id !== cfId ? c : { ...c, [field]: field === 'cf' ? (parseFloat(val) || null) : val }
    ));

  const deleteCF = (cfId: string) =>
    onChange(project.id, 'cashFlows', project.cashFlows.filter(c => c.id !== cfId));

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-opacity ${project.enabled ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <input type="checkbox" checked={project.enabled}
          onChange={e => onChange(project.id, 'enabled', e.target.checked)}
          className="accent-primary w-3.5 h-3.5 cursor-pointer shrink-0" />
        <Input className="h-7 text-sm font-semibold w-44" value={project.name}
          onChange={e => onChange(project.id, 'name', e.target.value)} />
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Discount Rate %</Label>
          <Input className="h-7 text-xs w-16 font-mono" value={String(project.discountRate)}
            onChange={e => onChange(project.id, 'discountRate', parseFloat(e.target.value) || 0)}
            placeholder="0" />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Initial Investment ($)</Label>
          <Input className="h-7 text-xs w-32 font-mono"
            value={project.initialInv !== null ? String(project.initialInv) : ''}
            onChange={e => onChange(project.id, 'initialInv', parseFloat(e.target.value) || null)}
            placeholder="e.g. 1000000" />
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 ml-auto"
          onClick={() => onDelete(project.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b">
              {['Period', 'Cash Flow ($)', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t bg-red-50/30">
              <td className="px-3 py-1.5 text-muted-foreground font-medium">Year 0</td>
              <td className="px-3 py-1.5 font-mono text-red-600">
                {project.initialInv !== null ? `−${fmtM(project.initialInv)}` : '—'}
              </td>
              <td />
            </tr>
            {project.cashFlows.map(cf => (
              <tr key={cf.id} className="border-t hover:bg-slate-50/50">
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs w-24" value={cf.period}
                    onChange={e => updateCF(cf.id, 'period', e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs w-28 font-mono"
                    value={cf.cf !== null ? String(cf.cf) : ''}
                    onChange={e => updateCF(cf.id, 'cf', e.target.value)}
                    placeholder="e.g. 250000" />
                </td>
                <td className="px-2 py-1.5">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                    onClick={() => deleteCF(cf.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addCF}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />Add Period
      </Button>
    </div>
  );
};

// ============================================
// Payback Progress Bar
// ============================================

const PaybackBar = ({ payback, horizon, disc }: { payback: number | null; horizon: number; disc: number | null }) => {
  const pct = payback !== null ? Math.min(100, payback / horizon * 100) : 100;
  const dpct = disc !== null ? Math.min(100, disc / horizon * 100) : null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Simple Payback</span>
        <span className="font-mono font-semibold text-slate-700">{fmtYr(payback)}</span>
      </div>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }} />
        {payback === null && (
          <div className="absolute inset-0 flex items-center justify-center text-[9px] text-red-500 font-semibold">Not recovered</div>
        )}
      </div>
      {disc !== null && (
        <>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground font-medium">Discounted Payback</span>
            <span className="font-mono font-semibold text-slate-700">{fmtYr(disc)}</span>
          </div>
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary/50 transition-all"
              style={{ width: `${dpct}%` }} />
          </div>
        </>
      )}
      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
        <span>Year 0</span>
        <span>Year {horizon}</span>
      </div>
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
            <Clock className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Investment Payback Period</CardTitle>
        <CardDescription className="text-base mt-2">
          Calculate how long it takes to recover the initial investment from projected cash flows — both simple and discounted payback, with multi-project comparison and break-even visualization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Clock className="w-6 h-6 text-primary mb-2" />,
              title: 'Simple Payback',
              desc: 'The number of years until cumulative undiscounted cash inflows equal the initial outlay. Quick to calculate, ignores time value of money.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'Discounted Payback',
              desc: 'Same as payback but cash flows are discounted at the required rate before accumulating. A more conservative and economically accurate measure.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Multi-Project Ranking',
              desc: 'Compare multiple projects side by side. Identify which recovers the initial investment fastest relative to the project horizon.',
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
            { label: 'Fast',           desc: 'Payback ≤ 1/3 of horizon' },
            { label: 'Moderate',       desc: 'Payback ≤ 1/2 of horizon' },
            { label: 'Slow',           desc: 'Payback ≤ full horizon'   },
            { label: 'Beyond Horizon', desc: 'Not recovered in time'    },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-xs font-bold text-slate-700 mb-0.5">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Each row is one cash flow for one project. Year 0 (or rows with "initial" / "invest") is the initial outlay.
            Set <strong>discount_rate</strong> to 0 if you only want simple payback.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Required Columns</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  ['project',       'project or investment name'],
                  ['period',        'Year 0, Year 1, ... or period label'],
                  ['cash_flow',     'cash flow amount (Year 0 = negative outlay)'],
                  ['discount_rate', 'required rate in % — set to 0 for simple payback only'],
                ].map(([col, desc]) => (
                  <li key={col} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span><strong>{col}</strong> — {desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Output</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  'Simple & Discounted Payback per project',
                  'Payback progress bar (% of horizon recovered)',
                  'Cumulative cash flow chart with breakeven line',
                  'Multi-project payback ranking comparison',
                  'Total return and ROI over the full horizon',
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
            <Clock className="mr-2 h-5 w-5" />Load Example Data
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

export default function PaybackPeriodPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [projects,      setProjects]      = useState<ProjectEntry[]>(defaultProjects());
  const [selectedId,    setSelectedId]    = useState('');
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [projectCol, setProjectCol] = useState('');
  const [periodCol,  setPeriodCol]  = useState('');
  const [cfCol,      setCfCol]      = useState('');
  const [rateCol,    setRateCol]    = useState('');

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_payback.csv');
    setInputMode('csv');
    setHasStarted(true);
    setProjectCol('project'); setPeriodCol('period'); setCfCol('cash_flow'); setRateCol('discount_rate');
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setProjectCol(''); setPeriodCol(''); setCfCol(''); setRateCol('');
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
  }, [onClearData]);

  // ── Auto-detect columns ───────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const h = allHeaders.map(s => s.toLowerCase());
    const detect = (kws: string[], setter: (v: string) => void, cur: string) => {
      if (cur) return;
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setter(allHeaders[idx]);
    };
    detect(['project', 'name', 'project_name'],                setProjectCol, projectCol);
    detect(['period', 'year', 'time'],                         setPeriodCol,  periodCol);
    detect(['cash_flow', 'cf', 'cashflow', 'amount'],          setCfCol,      cfCol);
    detect(['discount_rate', 'wacc', 'rate', 'required_rate'], setRateCol,    rateCol);
  }, [hasData, allHeaders]);

  // ── Active projects & results ─────────────────────────────
  const activeProjects: ProjectEntry[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && projectCol && periodCol && cfCol && rateCol)
      return computeFromCSV(data, { project: projectCol, period: periodCol, cf: cfCol, rate: rateCol });
    if (inputMode === 'manual') return projects;
    return [];
  }, [inputMode, hasData, data, projectCol, periodCol, cfCol, rateCol, projects]);

  const results: PaybackResult[] = useMemo(() =>
    activeProjects.flatMap(p => { const r = computeProject(p); return r ? [r] : []; })
      .sort((a, b) => (a.payback ?? 999) - (b.payback ?? 999)),
    [activeProjects]
  );

  const activeId     = (selectedId && results.find(r => r.id === selectedId)) ? selectedId : (results[0]?.id ?? '');
  const activeResult = results.find(r => r.id === activeId) ?? null;
  const isConfigured = results.length > 0;
  const isExample    = (fileName ?? '').startsWith('example_');

  // ── Project handlers ──────────────────────────────────────
  const handleProjectChange = useCallback((id: string, field: string, value: any) =>
    setProjects(prev => prev.map(p => p.id !== id ? p : { ...p, [field]: value })), []);

  const handleAddProject = useCallback(() => {
    const newId = String(Date.now());
    setProjects(prev => [...prev, {
      id: newId, name: `Project ${String.fromCharCode(65 + prev.length)}`,
      enabled: true, initialInv: null, discountRate: 10,
      cashFlows: [1, 2, 3, 4, 5].map(y => ({ id: `${newId}-y${y}`, period: `Year ${y}`, cf: null })),
    }]);
  }, []);

  const handleDeleteProject = useCallback((id: string) =>
    setProjects(prev => prev.filter(p => p.id !== id)), []);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    const rows = results.map(r => ({
      project:            r.name,
      initial_investment: fmtM(r.initialInv),
      payback_period:     fmtYr(r.payback),
      payback_years:      r.payback?.toFixed(2) ?? '—',
      disc_payback_years: r.discPayback?.toFixed(2) ?? '—',
      disc_payback:       fmtYr(r.discPayback),
      total_return:       fmtM(r.totalReturn),
      roi_pct:            r.roi !== null ? `${(r.roi * 100).toFixed(1)}%` : '—',
      discount_rate:      `${(r.discountRate * 100).toFixed(1)}%`,
      signal:             r.signal,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `PaybackPeriod_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `PaybackPeriod_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Payback ranking chart data ─────────────────────────────
  const rankingData = useMemo(() =>
    results.map(r => ({
      name:    r.name,
      payback: parseFloat((r.payback ?? 0).toFixed(2)),
      disc:    r.discPayback !== null ? parseFloat(r.discPayback.toFixed(2)) : null,
      signal:  r.signal,
    })),
    [results]
  );

  // ── Intro gate ─────────────────────────────────────────────
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
            {hasData ? (fileName || 'Uploaded file') : 'Manual Entry'}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {hasData
              ? `${data.length.toLocaleString()} rows · ${allHeaders.length} cols`
              : `${results.length} project${results.length !== 1 ? 's' : ''}`}
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
                <FileText className="h-4 w-4 text-muted-foreground" />{fileName || 'Uploaded file'}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-auto flex-1 min-h-0 rounded-md border border-slate-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b">
                    {allHeaders.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50/50">
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
            <span className="text-xs text-muted-foreground">Capital Budgeting</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />Investment Payback Period
          </CardTitle>
          <CardDescription>
            Calculate the expected time to recover the initial investment from projected cash inflows — simple and discounted payback, with multi-project comparison and break-even chart.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Input ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription className="mt-0.5">
                {inputMode === 'csv'
                  ? 'Map columns — one row per period per project. Year 0 = initial outlay.'
                  : 'Add projects with initial investment, cash flows per period, and optional discount rate.'}
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

          {inputMode === 'csv' && hasData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'PROJECT *',       value: projectCol, setter: setProjectCol, headers: allHeaders     },
                { label: 'PERIOD *',        value: periodCol,  setter: setPeriodCol,  headers: allHeaders     },
                { label: 'CASH FLOW *',     value: cfCol,      setter: setCfCol,      headers: numericHeaders },
                { label: 'DISCOUNT RATE',   value: rateCol,    setter: setRateCol,    headers: numericHeaders },
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

          {inputMode === 'manual' && (
            <div className="space-y-4">
              {projects.map(p => (
                <ProjectEditor key={p.id} project={p}
                  onChange={handleProjectChange} onDelete={handleDeleteProject} />
              ))}
              <Button variant="outline" size="sm" onClick={handleAddProject}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Project
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
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Summary)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && results[0] && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Projects</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{results.length}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {results.filter(r => r.payback !== null).length} with recoverable payback
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fastest Payback</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fmtYr(results[0].payback)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{results[0].name}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Slowest Payback</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {fmtYr(results[results.length - 1].payback)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{results[results.length - 1].name}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Best ROI</div>
            {(() => {
              const best = [...results].filter(r => r.roi !== null).sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0];
              return best ? (
                <>
                  <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
                    {(best.roi ?? 0) >= 0
                      ? <ArrowUpRight className="h-5 w-5 text-emerald-500 shrink-0" />
                      : <ArrowDownRight className="h-5 w-5 text-red-500 shrink-0" />}
                    {((best.roi ?? 0) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">{best.name}</div>
                </>
              ) : <div className="text-2xl font-bold text-muted-foreground">—</div>;
            })()}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: Payback Ranking ── */}
        {isConfigured && rankingData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payback Period Ranking — All Projects</CardTitle>
              <CardDescription>Simple payback sorted fastest to slowest (years)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, rankingData.length * 52)}>
                <BarChart data={rankingData} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}yr`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={100} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="payback" name="Payback (yrs)" maxBarSize={34} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="payback" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => fmtYr(v)} />
                    {rankingData.map((d, i) => (
                      <Cell key={i} fill={paybackBarColor(d.signal)} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Summary Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />All Projects Summary
              </CardTitle>
              <CardDescription>Ranked by simple payback — click a row to view cumulative CF detail below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['#', 'Project', 'Initial Inv.', 'Payback', 'Disc. Payback', 'Total Return', 'ROI', 'Discount Rate', 'Signal'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.id}
                        className={`border-t hover:bg-slate-50/50 cursor-pointer transition-colors ${r.id === activeId ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
                        onClick={() => setSelectedId(r.id)}>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{r.name}</td>
                        <td className="px-3 py-2 font-mono text-red-600">{fmtM(r.initialInv)}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fmtYr(r.payback)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fmtYr(r.discPayback)}</td>
                        <td className={`px-3 py-2 font-mono font-semibold ${r.totalReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {fmtM(r.totalReturn)}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {r.roi !== null ? `${(r.roi * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {(r.discountRate * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${signalBadgeClass(r.signal)}`}>{r.signal}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Selected Project Detail ── */}
        {isConfigured && activeResult && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">Cumulative Cash Flow — {activeResult.name}</CardTitle>
                  <CardDescription>Break-even point shown where cumulative CF crosses zero</CardDescription>
                </div>
                {results.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Project</Label>
                    <Select value={activeId} onValueChange={setSelectedId}>
                      <SelectTrigger className="text-xs h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {results.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Payback progress bars */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <PaybackBar
                  payback={activeResult.payback}
                  disc={activeResult.discountRate > 0 ? activeResult.discPayback : null}
                  horizon={activeResult.chartData.length - 1}
                />
              </div>

              {/* KPI tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Initial Investment', value: fmtM(activeResult.initialInv) },
                  { label: 'Payback',            value: fmtYr(activeResult.payback) },
                  { label: 'Total Return',        value: fmtM(activeResult.totalReturn) },
                  { label: 'ROI',                 value: activeResult.roi !== null ? `${(activeResult.roi * 100).toFixed(1)}%` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                    <div className="text-base font-bold font-mono text-slate-700">{value}</div>
                  </div>
                ))}
              </div>

              {/* Cumulative CF Chart */}
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={activeResult.chartData} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmtM(v)} />
                  <Tooltip content={<CumTooltip />} />
                  <ReferenceLine y={0} stroke="#3B82F6" strokeWidth={2} strokeDasharray="6 3"
                    label={{ value: 'Break-even', position: 'insideTopLeft', fontSize: 9, fill: '#3B82F6' }} />
                  <Bar dataKey="cf" name="Cash Flow" maxBarSize={28} radius={[3, 3, 0, 0]}>
                    {activeResult.chartData.map((d, i) => (
                      <Cell key={i} fill={d.cf >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.65} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="cumCF" name="Cumulative CF" dot={{ r: 3 }}
                    stroke="#6C3AED" strokeWidth={2.5} />
                  {activeResult.discountRate > 0 && (
                    <Line type="monotone" dataKey="cumDCF" name="Cumulative DCF" dot={false}
                      stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 3" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>

              {/* Period-by-period table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period', 'Cash Flow', 'Disc. Factor', 'PV of CF', 'Cum. CF', 'Cum. DCF', 'Recovered?'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeResult.chartData.map((d, t) => {
                      const df = 1 / Math.pow(1 + activeResult.discountRate, t);
                      const recovered = activeResult.cumCF[t] >= 0;
                      return (
                        <tr key={t} className={`border-t hover:bg-slate-50/50 ${t === 0 ? 'bg-red-50/30' : ''} ${recovered && t > 0 ? 'bg-emerald-50/20' : ''}`}>
                          <td className="px-3 py-2 font-semibold text-slate-700">{d.period}</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${d.cf >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {fmtM(d.cf)}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">{df.toFixed(4)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fmtM(d.pv)}</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${activeResult.cumCF[t] >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {fmtM(activeResult.cumCF[t])}
                          </td>
                          <td className={`px-3 py-2 font-mono ${activeResult.cumDCF[t] >= 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {fmtM(activeResult.cumDCF[t])}
                          </td>
                          <td className="px-3 py-2">
                            {t === 0 ? <span className="text-muted-foreground text-xs">—</span>
                              : recovered
                              ? <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">✓ Yes</span>
                              : <span className="text-xs text-muted-foreground">No</span>}
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
        {isConfigured && activeResult && (() => {
          const fastest  = results[0];
          const slowest  = results[results.length - 1];
          const recovered = results.filter(r => r.payback !== null);
          const neverRec  = results.filter(r => r.payback === null);
          const avgPayback = recovered.length
            ? recovered.reduce((s, r) => s + (r.payback ?? 0), 0) / recovered.length : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated payback analysis — {results.length} project{results.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Of <span className="font-semibold">{results.length}</span> project{results.length !== 1 ? 's' : ''},{' '}
                    <span className="font-semibold">{recovered.length}</span> recover the initial investment within the projection horizon
                    {neverRec.length > 0 && <> and <span className="font-semibold">{neverRec.length}</span> do not</>}.
                    Fastest payback: <span className="font-semibold">{fastest.name}</span> at{' '}
                    <span className="font-semibold">{fmtYr(fastest.payback)}</span>.
                    {avgPayback !== null && <> Average payback across recovered projects:{' '}
                    <span className="font-semibold">{fmtYr(avgPayback)}</span>.</>}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Recovered',     value: String(recovered.length), sub: `of ${results.length} projects` },
                    { label: 'Fastest',       value: fmtYr(fastest.payback),   sub: fastest.name },
                    { label: 'Slowest',       value: fmtYr(slowest.payback),   sub: slowest.name },
                    { label: 'Avg Payback',   value: avgPayback !== null ? fmtYr(avgPayback) : '—', sub: 'recovered projects' },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">Payback as a Liquidity Metric</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Payback period measures capital at risk — how long invested funds are exposed before recovery.{' '}
                        <span className="font-semibold">{fastest.name}</span> with{' '}
                        <span className="font-semibold">{fmtYr(fastest.payback)}</span> payback offers the fastest capital recovery,
                        reducing exposure to project risk and opportunity cost. However, payback alone ignores cash flows beyond
                        the breakeven point — a project with a longer payback may generate substantially higher total returns.
                      </p>
                    </div>
                  </div>

                  {recovered.some(r => r.discountRate > 0 && r.discPayback !== null) && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Simple vs Discounted Payback</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {recovered.filter(r => r.discPayback !== null && r.payback !== null).map(r =>
                            `${r.name}: simple ${fmtYr(r.payback)} → discounted ${fmtYr(r.discPayback)}`
                          ).join(' · ')}.
                          {' '}Discounted payback accounts for the time value of money and is always longer (or equal) to simple payback.
                          The gap between them widens with higher discount rates and back-loaded cash flow profiles.
                        </p>
                      </div>
                    </div>
                  )}

                  {neverRec.length > 0 && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Unrecovered Projects</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-semibold">{neverRec.map(r => r.name).join(', ')}</span>{' '}
                          {neverRec.length === 1 ? 'does' : 'do'} not recover the initial outlay within the projection horizon.
                          This does not necessarily mean the project{neverRec.length === 1 ? '' : 's'} should be rejected —
                          consider extending the projection period or evaluating NPV and IRR to capture the full value profile.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Payback vs Total Return</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {[...results].sort((a, b) => b.totalReturn - a.totalReturn).slice(0, 2).map(r =>
                          `${r.name}: total return ${fmtM(r.totalReturn)} (ROI ${r.roi !== null ? (r.roi * 100).toFixed(0) + '%' : '—'})`
                        ).join(' vs ')}.
                        {' '}The highest-return project and the fastest-payback project are often different.
                        Use payback for liquidity assessment and NPV/IRR for value-creation analysis.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Simple Payback: years until Σ CF_t ≥ 0. Discounted Payback: years until Σ CF_t / (1+r)^t ≥ 0.
                  ROI = Total Return / Initial Investment. Payback is a liquidity metric — use alongside NPV and IRR for full investment evaluation.
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
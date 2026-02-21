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
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, LabelList, ComposedChart,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  Calculator, TrendingUp, BarChart3, Activity, Plus, Trash2,
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

interface CashFlowEntry {
  id:     string;
  period: string;   // e.g. "Year 0", "Year 1"
  cf:     number | null;
}

interface ProjectEntry {
  id:          string;
  name:        string;
  initialInv:  number | null;  // negative initial outflow (stored as positive)
  cashFlows:   CashFlowEntry[];
  discountRate: number;        // % WACC / required rate
  enabled:     boolean;
}

interface ProjectResult {
  id:          string;
  name:        string;
  npv:         number;
  irr:         number | null;
  mirr:        number | null;
  payback:     number | null;   // years
  discPayback: number | null;
  pi:          number | null;   // profitability index
  allCFs:      number[];        // [initial, cf1, cf2, ...]
  cumulativeCF: number[];
  discountRate: number;
  signal:      string;
  npvProfile:  { rate: number; npv: number }[];
}

// ============================================
// Math Helpers
// ============================================

/** Newton-Raphson IRR solver */
function calcIRR(cfs: number[], guess = 0.1): number | null {
  if (cfs.length < 2) return null;
  let r = guess;
  for (let iter = 0; iter < 500; iter++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cfs.length; t++) {
      const denom = Math.pow(1 + r, t);
      npv  += cfs[t] / denom;
      dnpv -= t * cfs[t] / (denom * (1 + r));
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const rNew = r - npv / dnpv;
    if (Math.abs(rNew - r) < 1e-8) return isFinite(rNew) ? rNew : null;
    r = rNew;
  }
  return isFinite(r) ? r : null;
}

/** Modified IRR */
function calcMIRR(cfs: number[], finRate: number, reinvRate: number): number | null {
  const n = cfs.length - 1;
  if (n < 1) return null;
  const negPV  = cfs.reduce((s, cf, t) => cf < 0 ? s + cf / Math.pow(1 + finRate,  t) : s, 0);
  const posFV  = cfs.reduce((s, cf, t) => cf > 0 ? s + cf * Math.pow(1 + reinvRate, n - t) : s, 0);
  if (negPV >= 0 || posFV <= 0) return null;
  return Math.pow(posFV / (-negPV), 1 / n) - 1;
}

function calcNPV(cfs: number[], rate: number): number {
  return cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
}

function calcPayback(cfs: number[]): number | null {
  let cum = 0;
  for (let t = 0; t < cfs.length; t++) {
    cum += cfs[t];
    if (cum >= 0) {
      if (t === 0) return 0;
      const prev = cum - cfs[t];
      return (t - 1) + (-prev / cfs[t]);
    }
  }
  return null;
}

function calcDiscPayback(cfs: number[], rate: number): number | null {
  let cum = 0;
  for (let t = 0; t < cfs.length; t++) {
    cum += cfs[t] / Math.pow(1 + rate, t);
    if (cum >= 0) {
      if (t === 0) return 0;
      const prev = cum - cfs[t] / Math.pow(1 + rate, t);
      return (t - 1) + (-prev / (cfs[t] / Math.pow(1 + rate, t)));
    }
  }
  return null;
}

function calcPI(cfs: number[], rate: number): number | null {
  if (!cfs[0] || cfs[0] >= 0) return null;
  const pvInflows = cfs.slice(1).reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t + 1), 0);
  return pvInflows / (-cfs[0]);
}

function buildNPVProfile(cfs: number[]): { rate: number; npv: number }[] {
  const pts: { rate: number; npv: number }[] = [];
  for (let r = -0.2; r <= 1.0; r += 0.02) {
    pts.push({ rate: parseFloat((r * 100).toFixed(1)), npv: parseFloat(calcNPV(cfs, r).toFixed(2)) });
  }
  return pts;
}

function getSignal(npv: number, irr: number | null, rate: number): string {
  if (npv > 0 && irr !== null && irr > rate) return 'Accept';
  if (npv > 0) return 'Likely Accept';
  if (npv >= -Math.abs(npv) * 0.05) return 'Marginal';
  return 'Reject';
}

function signalBadgeClass(sig: string): string {
  if (sig === 'Accept')        return 'bg-emerald-100 text-emerald-700';
  if (sig === 'Likely Accept') return 'bg-green-100 text-green-700';
  if (sig === 'Marginal')      return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function fmt(n: number | null, dec = 2, prefix = ''): string {
  if (n === null) return '—';
  return `${prefix}${n.toFixed(dec)}`;
}
function fmtPct(n: number | null): string {
  if (n === null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}
function fmtM(n: number | null): string {
  if (n === null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9)  return `${n < 0 ? '-' : ''}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${n < 0 ? '-' : ''}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${n < 0 ? '-' : ''}$${(abs / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ============================================
// Default Projects
// ============================================

function defaultProjects(): ProjectEntry[] {
  return [
    {
      id: '1', name: 'Project Alpha', enabled: true,
      initialInv: 500000, discountRate: 10,
      cashFlows: [
        { id: 'a1', period: 'Year 1', cf: 120000 },
        { id: 'a2', period: 'Year 2', cf: 150000 },
        { id: 'a3', period: 'Year 3', cf: 180000 },
        { id: 'a4', period: 'Year 4', cf: 200000 },
        { id: 'a5', period: 'Year 5', cf: 220000 },
      ],
    },
    {
      id: '2', name: 'Project Beta', enabled: true,
      initialInv: 800000, discountRate: 10,
      cashFlows: [
        { id: 'b1', period: 'Year 1', cf: 80000  },
        { id: 'b2', period: 'Year 2', cf: 160000 },
        { id: 'b3', period: 'Year 3', cf: 240000 },
        { id: 'b4', period: 'Year 4', cf: 300000 },
        { id: 'b5', period: 'Year 5', cf: 350000 },
      ],
    },
    {
      id: '3', name: 'Project Gamma', enabled: true,
      initialInv: 300000, discountRate: 10,
      cashFlows: [
        { id: 'c1', period: 'Year 1', cf: 200000 },
        { id: 'c2', period: 'Year 2', cf: 150000 },
        { id: 'c3', period: 'Year 3', cf: 100000 },
        { id: 'c4', period: 'Year 4', cf:  80000 },
        { id: 'c5', period: 'Year 5', cf:  60000 },
      ],
    },
  ];
}

function generateExampleCSV(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  for (const p of defaultProjects()) {
    rows.push({ project: p.name, period: 'Year 0', cash_flow: -(p.initialInv ?? 0), discount_rate: p.discountRate });
    for (const cf of p.cashFlows)
      rows.push({ project: p.name, period: cf.period, cash_flow: cf.cf, discount_rate: p.discountRate });
  }
  return rows;
}

// ============================================
// Compute Results
// ============================================

function computeProject(p: ProjectEntry): ProjectResult | null {
  if (!p.enabled || p.initialInv === null) return null;
  const rate = (p.discountRate || 10) / 100;
  const allCFs: number[] = [-(p.initialInv), ...p.cashFlows.map(c => c.cf ?? 0)];

  const npv          = calcNPV(allCFs, rate);
  const irr          = calcIRR(allCFs);
  const mirr         = calcMIRR(allCFs, rate, rate);
  const payback      = calcPayback(allCFs);
  const discPayback  = calcDiscPayback(allCFs, rate);
  const pi           = calcPI(allCFs, rate);
  const npvProfile   = buildNPVProfile(allCFs);

  const cumulativeCF: number[] = [];
  let cum = 0;
  for (const cf of allCFs) { cum += cf; cumulativeCF.push(parseFloat(cum.toFixed(2))); }

  return {
    id: p.id, name: p.name,
    npv, irr, mirr, payback, discPayback, pi,
    allCFs, cumulativeCF, discountRate: rate,
    signal: getSignal(npv, irr, rate),
    npvProfile,
  };
}

function computeFromCSV(
  rows: Record<string, any>[],
  cols: { project: string; period: string; cf: string; rate: string }
): ProjectEntry[] {
  const map = new Map<string, ProjectEntry>();
  for (const r of rows) {
    const name   = String(r[cols.project] ?? '').trim();
    const period = String(r[cols.period]  ?? '').trim();
    const cf     = parseFloat(r[cols.cf]);
    const rate   = parseFloat(r[cols.rate]) || 10;
    if (!name || !isFinite(cf)) continue;
    if (!map.has(name)) {
      map.set(name, { id: name, name, initialInv: null, discountRate: rate, cashFlows: [], enabled: true });
    }
    const p = map.get(name)!;
    const periodLower = period.toLowerCase();
    if (periodLower.includes('0') || periodLower.includes('initial') || periodLower.includes('invest')) {
      p.initialInv = cf <= 0 ? -cf : cf;
    } else {
      p.cashFlows.push({ id: `${name}-${period}`, period, cf });
    }
  }
  return Array.from(map.values());
}

// ============================================
// Tooltips
// ============================================

const CFTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const NPVTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">Discount Rate: {label}%</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{fmtM(p.value)}</span>
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
            <Calculator className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">IRR / NPV Calculator</CardTitle>
        <CardDescription className="text-base mt-2">
          Evaluate capital investment decisions using Net Present Value, Internal Rate of Return, MIRR, Payback Period and Profitability Index — compare multiple projects side by side
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <Calculator className="w-6 h-6 text-primary mb-2" />,
              title: 'NPV & IRR',
              desc: 'NPV discounts all cash flows at the required rate of return. IRR is the rate that makes NPV zero. Accept if NPV > 0 and IRR > WACC.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-primary mb-2" />,
              title: 'MIRR & Payback',
              desc: 'MIRR corrects IRR by assuming reinvestment at WACC. Payback and Discounted Payback measure how quickly the initial outlay is recovered.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Multi-Project Comparison',
              desc: 'Enter multiple projects in parallel. NPV profile chart shows how NPV varies with discount rate and where each project crosses zero (= IRR).',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'NPV',     desc: 'Σ CF_t / (1+r)^t' },
            { label: 'IRR',     desc: 'NPV = 0 at r = IRR' },
            { label: 'MIRR',    desc: 'Reinvest at WACC' },
            { label: 'Payback', desc: 'Years to breakeven' },
            { label: 'PI',      desc: 'PV inflows / |CF₀|' },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-xs font-bold text-slate-700 mb-0.5">{label}</div>
              <div className="text-xs font-mono text-primary">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Each row is one cash flow for one project. Year 0 (or rows containing "initial" / "invest") is treated as the initial outlay.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Required Columns</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  ['project',       'project name'],
                  ['period',        'Year 0, Year 1, ... or period label'],
                  ['cash_flow',     'cash flow amount (Year 0 = negative outlay)'],
                  ['discount_rate', 'WACC / required rate in % (e.g. 10)'],
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
                  'NPV, IRR, MIRR, Payback, Discounted Payback, PI',
                  'Cumulative cash flow chart per project',
                  'NPV sensitivity profile (NPV vs discount rate)',
                  'Multi-project comparison table & ranking',
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
            <Calculator className="mr-2 h-5 w-5" />Load Example Data
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
// Project Editor
// ============================================

const ProjectEditor = ({
  project, onChange, onDelete,
}: {
  project: ProjectEntry;
  onChange: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
}) => {
  const addCF = () => {
    const newCF: CashFlowEntry = {
      id:     String(Date.now()),
      period: `Year ${project.cashFlows.length + 1}`,
      cf:     null,
    };
    onChange(project.id, 'cashFlows', [...project.cashFlows, newCF]);
  };

  const updateCF = (cfId: string, field: 'period' | 'cf', val: string) => {
    onChange(project.id, 'cashFlows', project.cashFlows.map(c =>
      c.id !== cfId ? c : { ...c, [field]: field === 'cf' ? (parseFloat(val) || null) : val }
    ));
  };

  const deleteCF = (cfId: string) => {
    onChange(project.id, 'cashFlows', project.cashFlows.filter(c => c.id !== cfId));
  };

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-opacity ${project.enabled ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={project.enabled}
          onChange={e => onChange(project.id, 'enabled', e.target.checked)}
          className="accent-primary w-3.5 h-3.5 cursor-pointer" />
        <Input className="h-7 text-sm font-semibold w-44" value={project.name}
          onChange={e => onChange(project.id, 'name', e.target.value)} />
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">WACC %</Label>
          <Input className="h-7 text-xs w-16 font-mono" value={String(project.discountRate)}
            onChange={e => onChange(project.id, 'discountRate', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Initial Outlay ($)</Label>
          <Input className="h-7 text-xs w-28 font-mono"
            value={project.initialInv !== null ? String(project.initialInv) : ''}
            onChange={e => onChange(project.id, 'initialInv', parseFloat(e.target.value) || null)}
            placeholder="e.g. 500000" />
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600 ml-auto"
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
            <tr className="border-t bg-slate-50/50">
              <td className="px-3 py-1.5 text-muted-foreground font-medium">Year 0</td>
              <td className="px-3 py-1.5 font-mono text-slate-700">
                {project.initialInv !== null ? `−$${project.initialInv.toLocaleString()}` : '—'}
              </td>
              <td />
            </tr>
            {project.cashFlows.map((cf, i) => (
              <tr key={cf.id} className="border-t hover:bg-slate-50/50">
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs w-24" value={cf.period}
                    onChange={e => updateCF(cf.id, 'period', e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs w-28 font-mono"
                    value={cf.cf !== null ? String(cf.cf) : ''}
                    onChange={e => updateCF(cf.id, 'cf', e.target.value)}
                    placeholder="e.g. 150000" />
                </td>
                <td className="px-2 py-1.5">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600"
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
// Main Component
// ============================================

export default function IrrNpvCalculatorPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [projects,      setProjects]      = useState<ProjectEntry[]>(defaultProjects());
  const [selectedProj,  setSelectedProj]  = useState('');
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // CSV columns
  const [projectCol, setProjectCol] = useState('');
  const [periodCol,  setPeriodCol]  = useState('');
  const [cfCol,      setCfCol]      = useState('');
  const [rateCol,    setRateCol]    = useState('');

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ─────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_irr_npv.csv');
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
    detect(['project', 'name', 'project_name'],                setProjectCol, projectCol);
    detect(['period', 'year', 'time'],                         setPeriodCol,  periodCol);
    detect(['cash_flow', 'cf', 'cashflow', 'amount'],          setCfCol,      cfCol);
    detect(['discount_rate', 'wacc', 'rate', 'required_rate'], setRateCol,    rateCol);
  }, [hasData, allHeaders]);

  // ── Compute ────────────────────────────────────────────────
  const activeProjects: ProjectEntry[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && projectCol && periodCol && cfCol && rateCol)
      return computeFromCSV(data, { project: projectCol, period: periodCol, cf: cfCol, rate: rateCol });
    if (inputMode === 'manual') return projects;
    return [];
  }, [inputMode, hasData, data, projectCol, periodCol, cfCol, rateCol, projects]);

  const results: ProjectResult[] = useMemo(() =>
    activeProjects.flatMap(p => { const r = computeProject(p); return r ? [r] : []; })
      .sort((a, b) => b.npv - a.npv),
    [activeProjects]
  );

  const activeId   = (selectedProj && results.find(r => r.id === selectedProj)) ? selectedProj : (results[0]?.id ?? '');
  const activeResult = results.find(r => r.id === activeId) ?? null;
  const isConfigured = results.length > 0;
  const isExample  = (fileName ?? '').startsWith('example_');

  // ── Project handlers ───────────────────────────────────────
  const handleProjectChange = useCallback((id: string, field: string, value: any) => {
    setProjects(prev => prev.map(p => p.id !== id ? p : { ...p, [field]: value }));
  }, []);

  const handleAddProject = useCallback(() => {
    const newId = String(Date.now());
    setProjects(prev => [...prev, {
      id: newId, name: `Project ${String.fromCharCode(65 + prev.length)}`,
      enabled: true, initialInv: null, discountRate: 10,
      cashFlows: [1, 2, 3, 4, 5].map(y => ({ id: `${newId}-y${y}`, period: `Year ${y}`, cf: null })),
    }]);
  }, []);

  const handleDeleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    const rows = results.map(r => ({
      project: r.name,
      npv: r.npv.toFixed(2),
      irr: r.irr !== null ? `${(r.irr * 100).toFixed(2)}%` : '—',
      mirr: r.mirr !== null ? `${(r.mirr * 100).toFixed(2)}%` : '—',
      payback_years: r.payback !== null ? r.payback.toFixed(2) : '—',
      disc_payback_years: r.discPayback !== null ? r.discPayback.toFixed(2) : '—',
      pi: r.pi !== null ? r.pi.toFixed(3) : '—',
      discount_rate: `${(r.discountRate * 100).toFixed(1)}%`,
      signal: r.signal,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `IRR_NPV_${new Date().toISOString().split('T')[0]}.csv`;
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
      link.download = `IRR_NPV_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── NPV Profile data (overlay all enabled projects) ───────
  const npvProfileData = useMemo(() => {
    if (!results.length) return [];
    const rates = results[0].npvProfile.map(p => p.rate);
    return rates.map((rate, i) => {
      const row: Record<string, any> = { rate };
      for (const r of results) row[r.name] = r.npvProfile[i]?.npv ?? null;
      return row;
    });
  }, [results]);

  const COLORS = ['#6C3AED', '#10B981', '#F59E0B', '#3B82F6', '#F59E0B', '#8B5CF6'];

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
            <Calculator className="h-5 w-5" />IRR / NPV Calculator
          </CardTitle>
          <CardDescription>
            Evaluate capital projects using NPV, IRR, MIRR, Payback Period and Profitability Index. NPV profile chart shows sensitivity to discount rate assumptions.
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
                  ? 'Map CSV columns — one row per period per project. Year 0 = initial outlay.'
                  : 'Configure projects with initial outlay, per-period cash flows and WACC.'}
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

          {/* CSV Mode */}
          {inputMode === 'csv' && hasData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'PROJECT *',       value: projectCol, setter: setProjectCol, headers: allHeaders     },
                { label: 'PERIOD *',        value: periodCol,  setter: setPeriodCol,  headers: allHeaders     },
                { label: 'CASH FLOW *',     value: cfCol,      setter: setCfCol,      headers: numericHeaders },
                { label: 'DISCOUNT RATE *', value: rateCol,    setter: setRateCol,    headers: numericHeaders },
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

          {/* Manual Mode */}
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Projects Analyzed</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{results.length}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {results.filter(r => r.npv > 0).length} NPV-positive
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Best NPV</div>
            <div className="flex items-center gap-1 text-2xl font-bold font-mono text-slate-800">
              {results[0].npv >= 0
                ? <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" />
                : <ArrowDownRight className="h-5 w-5 shrink-0 text-slate-600" />}
              {fmtM(results[0].npv)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{results[0].name}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Best IRR</div>
            {(() => {
              const bestIRR = [...results].filter(r => r.irr !== null).sort((a, b) => (b.irr ?? 0) - (a.irr ?? 0))[0];
              return bestIRR ? (
                <>
                  <div className="text-2xl font-bold font-mono text-slate-800">{fmtPct(bestIRR.irr)}</div>
                  <div className="text-xs text-muted-foreground mt-1.5">{bestIRR.name}</div>
                </>
              ) : <div className="text-2xl font-bold text-muted-foreground">—</div>;
            })()}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fastest Payback</div>
            {(() => {
              const fastest = [...results].filter(r => r.payback !== null).sort((a, b) => (a.payback ?? 999) - (b.payback ?? 999))[0];
              return fastest ? (
                <>
                  <div className="text-2xl font-bold font-mono text-slate-800">{fmt(fastest.payback, 1)} yrs</div>
                  <div className="text-xs text-muted-foreground mt-1.5">{fastest.name}</div>
                </>
              ) : <div className="text-2xl font-bold text-muted-foreground">—</div>;
            })()}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Summary Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Project Comparison Summary
              </CardTitle>
              <CardDescription>Ranked by NPV — click a row to view detail below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['#', 'Project', 'NPV', 'IRR', 'MIRR', 'Payback', 'Disc. Payback', 'PI', 'WACC', 'Signal'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.id}
                        className={`border-t hover:bg-slate-50/50 cursor-pointer transition-colors ${r.id === activeId ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
                        onClick={() => setSelectedProj(r.id)}>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{r.name}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fmtM(r.npv)}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{fmtPct(r.irr)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{fmtPct(r.mirr)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.payback !== null ? `${r.payback.toFixed(1)} yrs` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.discPayback !== null ? `${r.discPayback.toFixed(1)} yrs` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.pi !== null ? r.pi.toFixed(3) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{(r.discountRate * 100).toFixed(1)}%</td>
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

        {/* ── NPV Profile ── */}
        {isConfigured && npvProfileData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">NPV Profile — Sensitivity to Discount Rate</CardTitle>
              <CardDescription>
                X-axis = discount rate, Y-axis = NPV. Zero crossing = IRR per project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={npvProfileData} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="rate" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={v => `${v}%`} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmtM(v)} />
                  <Tooltip content={<NPVTooltip />} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={2} />
                  {results.map((r, i) => (
                    <Line key={r.id} type="monotone" dataKey={r.name} dot={false}
                      stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-2">
                {results.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{r.name}</span>
                    {r.irr !== null && <span className="font-mono text-slate-600">IRR: {fmtPct(r.irr)}</span>}
                  </div>
                ))}
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
                  <CardTitle className="text-base">Cash Flow Detail — {activeResult.name}</CardTitle>
                  <CardDescription>Cumulative cash flow and discounted cash flow waterfall</CardDescription>
                </div>
                {results.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Project</Label>
                    <Select value={activeId} onValueChange={setSelectedProj}>
                      <SelectTrigger className="text-xs h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {results.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* KPI tiles */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'NPV',             value: fmtM(activeResult.npv) },
                  { label: 'IRR',             value: fmtPct(activeResult.irr) },
                  { label: 'MIRR',            value: fmtPct(activeResult.mirr) },
                  { label: 'Payback',         value: activeResult.payback !== null ? `${activeResult.payback.toFixed(1)} yrs` : '—' },
                  { label: 'Disc. Payback',   value: activeResult.discPayback !== null ? `${activeResult.discPayback.toFixed(1)} yrs` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                    <div className="text-base font-bold font-mono text-slate-700">{value}</div>
                  </div>
                ))}
              </div>

              {/* Cumulative CF Chart */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cumulative Cash Flow</p>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart
                    data={activeResult.allCFs.map((cf, t) => ({
                      period: t === 0 ? 'Year 0' : `Year ${t}`,
                      cf,
                      cumulative: activeResult.cumulativeCF[t],
                    }))}
                    margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => fmtM(v)} />
                    <Tooltip content={<CFTooltip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                    <Bar dataKey="cf" name="Cash Flow" maxBarSize={32} radius={[3, 3, 0, 0]}>
                      {activeResult.allCFs.map((cf, i) => (
                        <Cell key={i} fill={cf >= 0 ? '#10B981' : '#F59E0B'} fillOpacity={0.75} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="cumulative" name="Cumulative CF" dot={{ r: 3 }}
                      stroke="#6C3AED" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Period-by-period CF table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period', 'Cash Flow', 'Discount Factor', 'PV of CF', 'Cumulative CF'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeResult.allCFs.map((cf, t) => {
                      const df  = 1 / Math.pow(1 + activeResult.discountRate, t);
                      const pv  = cf * df;
                      return (
                        <tr key={t} className={`border-t hover:bg-slate-50/50 ${t === 0 ? 'bg-slate-50/30' : ''}`}>
                          <td className="px-3 py-2 font-semibold text-slate-700">{t === 0 ? 'Year 0' : `Year ${t}`}</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${cf >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {fmtM(cf)}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">{df.toFixed(4)}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{fmtM(pv)}</td>
                          <td className={`px-3 py-2 font-mono font-semibold ${activeResult.cumulativeCF[t] >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {fmtM(activeResult.cumulativeCF[t])}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td className="px-3 py-2 font-bold text-primary">NPV</td>
                      <td colSpan={3} />
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{fmtM(activeResult.npv)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && activeResult && (() => {
          const best     = results[0];
          const accepted = results.filter(r => r.npv > 0);
          const rejected = results.filter(r => r.npv <= 0);
          const irrSpread = (() => {
            const irrs = results.filter(r => r.irr !== null).map(r => r.irr!);
            if (irrs.length < 2) return null;
            return (Math.max(...irrs) - Math.min(...irrs)) * 100;
          })();

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>Auto-generated capital budgeting analysis — {results.length} project{results.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Decision Summary</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Of <span className="font-semibold">{results.length}</span> projects analyzed,{' '}
                    <span className="font-semibold">{accepted.length}</span> generate positive NPV and{' '}
                    <span className="font-semibold">{rejected.length}</span> destroy value at the required rate of return.{' '}
                    The highest NPV project is <span className="font-semibold">{best.name}</span> at{' '}
                    <span className="font-semibold">{fmtM(best.npv)}</span>
                    {best.irr !== null && <>, IRR <span className="font-semibold">{fmtPct(best.irr)}</span></>}.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'NPV Positive',  value: String(accepted.length), sub: `of ${results.length} projects` },
                    { label: 'Highest NPV',   value: fmtM(best.npv),          sub: best.name },
                    { label: 'Highest IRR',   value: fmtPct(results.filter(r => r.irr !== null).sort((a, b) => (b.irr ?? 0) - (a.irr ?? 0))[0]?.irr ?? null), sub: 'best return project' },
                    { label: 'IRR Spread',    value: irrSpread !== null ? `${irrSpread.toFixed(1)}pp` : '—', sub: 'max − min IRR' },
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
                      <p className="text-sm font-semibold text-primary mb-0.5">NPV Decision Rule</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {accepted.length > 0
                          ? `${accepted.map(r => r.name).join(', ')} ${accepted.length === 1 ? 'has' : 'have'} positive NPV at the specified discount rate, indicating that the project${accepted.length === 1 ? '' : 's'} generate${accepted.length === 1 ? 's' : ''} returns in excess of the cost of capital. Under NPV rule, these projects should be accepted (subject to capital constraints).`
                          : 'No projects generate positive NPV at the specified discount rates. At current assumptions, all projects destroy value relative to the hurdle rate. Consider whether the discount rate or cash flow estimates are too conservative.'}
                      </p>
                    </div>
                  </div>

                  {results.some(r => r.irr !== null) && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">IRR vs WACC</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {results.filter(r => r.irr !== null && r.irr > r.discountRate).map(r =>
                            `${r.name} (IRR ${fmtPct(r.irr)} vs WACC ${(r.discountRate * 100).toFixed(1)}%)`
                          ).join(', ')} {results.filter(r => r.irr !== null && r.irr > r.discountRate).length > 0
                            ? 'exceed the required rate of return — IRR rule supports acceptance.'
                            : ''
                          }
                          {results.filter(r => r.irr !== null && r.irr <= r.discountRate).length > 0
                            ? ` ${results.filter(r => r.irr !== null && r.irr <= r.discountRate).map(r => r.name).join(', ')} have IRR below WACC — these projects fail the IRR hurdle.`
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {results.some(r => r.payback !== null) && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Payback & Liquidity</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {results.filter(r => r.payback !== null).sort((a, b) => (a.payback ?? 999) - (b.payback ?? 999)).map(r =>
                            `${r.name}: ${r.payback!.toFixed(1)} yrs (discounted: ${r.discPayback !== null ? r.discPayback.toFixed(1) + ' yrs' : '—'})`
                          ).join(' · ')}.
                          {' '}Payback is a liquidity metric, not a value metric — a short payback reduces risk exposure but ignores cash flows beyond the payback point. Always use in conjunction with NPV.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ NPV = Σ CF_t / (1+r)^t. IRR solved via Newton-Raphson. MIRR assumes reinvestment at WACC. PI = PV(inflows) / |CF₀|.
                  Accept if: NPV {'>'} 0, IRR {'>'} WACC, PI {'>'} 1. All metrics should be considered jointly.
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
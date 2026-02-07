'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  BookOpen, Download, FileSpreadsheet, ImageIcon, ChevronDown, Sparkles,
  HelpCircle, Lightbulb, ChevronRight, Upload, CheckCircle2, AlertTriangle,
  Shield, Zap, Target, BarChart3, DollarSign, ArrowUpRight, Calculator,
  Clock, Settings2, TrendingUp, Layers
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '../../ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ComposedChart, Line, AreaChart, Area,
  ReferenceLine, ScatterChart, Scatter, ZAxis
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProjectCF {
  id: string;
  project_name: string;
  category: string;
  cashflows: number[];   // year 0 (negative = investment), year 1..N
  npv: number;
  irr: number;
  mirr: number;
  payback: number;
  discountedPayback: number;
  pi: number;            // profitability index
  totalInvestment: number;
  totalReturn: number;
  decision: string;      // Accept / Reject / Marginal
}

interface CalcConfig {
  discountRate: number;      // % WACC
  reinvestmentRate: number;  // % for MIRR
  hurdleRate: number;        // % minimum acceptable
}

interface IrrNpvPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  primary: '#1e3a5f', secondary: '#0d9488', midNavy: '#2d5a8e',
  lightNavy: '#3b7cc0', softRed: '#e57373', skyBlue: '#5ba3cf',
  palette: ['#1e3a5f', '#0d9488', '#2d5a8e', '#3b7cc0', '#e57373', '#5ba3cf', '#7c9fc0', '#4db6ac'],
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}K`;
const fmtPct = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(2)}%`;
const fmtYr = (n: number) => isNaN(n) || !isFinite(n) ? 'Never' : `${n.toFixed(1)} yr`;

const DEFAULT_CONFIG: CalcConfig = { discountRate: 10, reinvestmentRate: 8, hurdleRate: 10 };
const DECISION_COLORS: Record<string, string> = { Accept: 'bg-green-100 text-green-700', Reject: 'bg-red-100 text-red-700', Marginal: 'bg-amber-100 text-amber-700' };


// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function calcNPV(cfs: number[], rate: number): number {
  return cfs.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate / 100, t), 0);
}

function calcIRR(cfs: number[], guess: number = 0.1): number {
  let rate = guess;
  for (let i = 0; i < 200; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cfs.length; t++) {
      const df = Math.pow(1 + rate, t);
      npv += cfs[t] / df;
      if (t > 0) dnpv -= t * cfs[t] / (df * (1 + rate));
    }
    if (Math.abs(npv) < 0.001) return rate * 100;
    if (dnpv === 0) break;
    rate -= npv / dnpv;
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }
  // Bisection fallback
  let lo = -0.5, hi = 5.0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + mid, t), 0);
    if (Math.abs(npvMid) < 0.01) return mid * 100;
    if (npvMid > 0) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

function calcMIRR(cfs: number[], financeRate: number, reinvestRate: number): number {
  const n = cfs.length - 1;
  if (n <= 0) return 0;
  // FV of positive cash flows (reinvested)
  let fvPositive = 0;
  for (let t = 0; t < cfs.length; t++) {
    if (cfs[t] > 0) fvPositive += cfs[t] * Math.pow(1 + reinvestRate / 100, n - t);
  }
  // PV of negative cash flows (financed)
  let pvNegative = 0;
  for (let t = 0; t < cfs.length; t++) {
    if (cfs[t] < 0) pvNegative += Math.abs(cfs[t]) / Math.pow(1 + financeRate / 100, t);
  }
  if (pvNegative === 0) return 0;
  return (Math.pow(fvPositive / pvNegative, 1 / n) - 1) * 100;
}

function calcPayback(cfs: number[]): number {
  let cum = 0;
  for (let t = 0; t < cfs.length; t++) {
    cum += cfs[t];
    if (cum >= 0 && t > 0) {
      const prev = cum - cfs[t];
      return (t - 1) + Math.abs(prev) / cfs[t];
    }
  }
  return Infinity;
}

function calcDiscountedPayback(cfs: number[], rate: number): number {
  let cum = 0;
  for (let t = 0; t < cfs.length; t++) {
    const dcf = cfs[t] / Math.pow(1 + rate / 100, t);
    cum += dcf;
    if (cum >= 0 && t > 0) {
      const prev = cum - dcf;
      return (t - 1) + Math.abs(prev) / dcf;
    }
  }
  return Infinity;
}

function calcPI(cfs: number[], rate: number): number {
  const pvFuture = cfs.slice(1).reduce((s, cf, i) => s + cf / Math.pow(1 + rate / 100, i + 1), 0);
  const initialInv = Math.abs(cfs[0]);
  return initialInv > 0 ? pvFuture / initialInv : 0;
}

function computeProject(id: string, name: string, category: string, cfs: number[], config: CalcConfig): ProjectCF {
  const npv = calcNPV(cfs, config.discountRate);
  const irr = calcIRR(cfs);
  const mirr = calcMIRR(cfs, config.discountRate, config.reinvestmentRate);
  const payback = calcPayback(cfs);
  const dpb = calcDiscountedPayback(cfs, config.discountRate);
  const pi = calcPI(cfs, config.discountRate);
  const totalInv = cfs.filter(c => c < 0).reduce((s, c) => s + Math.abs(c), 0);
  const totalRet = cfs.filter(c => c > 0).reduce((s, c) => s + c, 0);
  let decision = 'Reject';
  if (npv > 0 && irr > config.hurdleRate) decision = 'Accept';
  else if (npv > 0 || irr > config.hurdleRate) decision = 'Marginal';
  return { id, project_name: name, category, cashflows: cfs, npv, irr, mirr, payback, discountedPayback: dpb, pi, totalInvestment: totalInv, totalReturn: totalRet, decision };
}


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parseCashFlowData(rows: Record<string, any>[], config: CalcConfig): ProjectCF[] | null {
  if (!rows || rows.length === 0) return null;
  const get = (row: Record<string, any>, ...ss: string[]): string => {
    for (const s of ss) { const f = Object.entries(row).find(([k]) => k.toLowerCase().replace(/[\s_-]/g, '').includes(s.replace(/[\s_-]/g, ''))); if (f && f[1] != null && f[1] !== '') return String(f[1]).trim(); } return '';
  };
  const getN = (row: Record<string, any>, ...ss: string[]): number => { const v = get(row, ...ss); return parseFloat(v.replace(/[$,%]/g, '')) || 0; };

  const items: ProjectCF[] = rows.map((row, i) => {
    const name = get(row, 'project_name', 'project', 'name', 'investment', 'description');
    if (!name) return null;
    const category = get(row, 'category', 'type', 'sector') || 'Other';
    // Parse year_0..year_N, y0..yN, cf0..cfN, or numbered columns
    const cfs: number[] = [];
    for (let y = 0; y <= 20; y++) {
      const v = get(row, `year_${y}`, `y${y}`, `cf${y}`, `year${y}`, `period_${y}`);
      if (v === '' && y > 1 && cfs.length > 0) break;
      cfs.push(parseFloat(v.replace(/[$,%]/g, '')) || 0);
    }
    // If no year columns found, try to find numeric columns
    if (cfs.every(c => c === 0)) {
      const numCols = Object.entries(row).filter(([k]) => {
        const kl = k.toLowerCase();
        return !['project', 'name', 'category', 'type', 'id', 'description', 'sector'].some(s => kl.includes(s));
      });
      numCols.forEach(([, v]) => {
        const n = parseFloat(String(v).replace(/[$,%]/g, ''));
        if (!isNaN(n)) cfs.push(n);
      });
      // Remove leading zeros from auto-parse
      while (cfs.length > 0 && cfs[0] === 0 && cfs.length > 2) cfs.shift();
    }
    // Trim trailing zeros
    while (cfs.length > 2 && cfs[cfs.length - 1] === 0) cfs.pop();
    if (cfs.length < 2 || cfs.every(c => c === 0)) return null;
    const id = get(row, 'id', 'project_id') || `P${String(i + 1).padStart(3, '0')}`;
    return computeProject(id, name, category, cfs, config);
  }).filter(Boolean) as ProjectCF[];

  return items.length > 0 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `id,project_name,category,year_0,year_1,year_2,year_3,year_4,year_5,year_6,year_7
P01,ERP System Upgrade,Technology,-2500,450,550,650,700,700,700,0
P02,Manufacturing Line B,Equipment,-4200,800,1000,1200,1200,1200,1200,1200
P03,Cloud Migration,Technology,-1100,300,400,450,400,0,0,0
P04,Warehouse Automation,Equipment,-2800,500,700,900,1000,1000,800,0
P05,Solar Installation,Sustainability,-950,120,140,160,180,200,200,200
P06,AI Analytics Platform,Technology,-750,200,300,350,300,0,0,0
P07,CRM Platform,Technology,-680,150,200,220,200,180,0,0
P08,R&D Lab Equipment,Equipment,-1500,300,400,450,400,350,0,0
P09,Fleet Electrification,Vehicles,-1200,100,200,250,300,300,300,250
P10,Office Renovation,Facilities,-1800,150,200,200,200,200,200,200
P11,Mobile App v2,Technology,-480,200,250,200,0,0,0,0
P12,Supply Chain SW,Technology,-340,100,150,150,120,0,0,0
P13,Production Robots,Equipment,-3200,600,800,1000,1000,1000,1000,0
P14,Marketing Automation,Technology,-290,120,150,130,0,0,0,0
P15,Data Center Expansion,Technology,-3500,500,700,800,900,900,900,800`;

function buildDefaultProjects(config: CalcConfig): ProjectCF[] {
  const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true });
  return parseCashFlowData(result.data as Record<string, any>[], config) || [];
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY + GUIDE + FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "NPV (Net Present Value)": "Sum of discounted cash flows. NPV > 0 = creates value above required return.",
  "IRR (Internal Rate of Return)": "Discount rate where NPV = 0. IRR > WACC = project exceeds cost of capital.",
  "MIRR (Modified IRR)": "Assumes reinvestment at a specified rate (not IRR). More realistic than IRR.",
  "Payback Period": "Years to recover initial investment from undiscounted cash flows.",
  "Discounted Payback": "Years to recover investment from discounted cash flows. More conservative than simple payback.",
  "Profitability Index (PI)": "PV of future cash flows ÷ Initial Investment. PI > 1.0 = value-creating.",
  "WACC": "Weighted Average Cost of Capital. The discount rate representing opportunity cost.",
  "Hurdle Rate": "Minimum IRR for project acceptance. Often equals or exceeds WACC.",
  "Reinvestment Rate": "Rate at which positive cash flows are assumed to be reinvested (used in MIRR).",
  "Capital Rationing": "When budget is limited, rank by PI or NPV per $ invested, not just NPV.",
};
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (<Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[80vh]"><DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />IRR/NPV Glossary</DialogTitle><DialogDescription>Key terms</DialogDescription></DialogHeader><ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea></DialogContent></Dialog>);

const GuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => { if (!isOpen) return null; return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
    <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between"><div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">IRR / NPV Calculator Guide</h2></div><Button variant="ghost" size="sm" onClick={onClose}>✕</Button></div>
    <div className="p-6 space-y-8">
      <div><h3 className="font-semibold text-primary mb-2">Capital Budgeting with IRR & NPV</h3><p className="text-sm text-muted-foreground">Upload multi-year cash flow projections for each project. The calculator computes NPV, IRR, MIRR, Payback, Discounted Payback, and Profitability Index — then ranks projects and recommends Accept/Reject decisions based on your hurdle rate and WACC.</p></div>
      <div><h3 className="font-semibold text-primary mb-3">Process</h3><div className="space-y-2">{[
        { step: '1', title: 'Upload Cash Flows', desc: 'CSV with Year 0 (negative = investment) through Year N for each project.' },
        { step: '2', title: 'Set Rates', desc: 'Discount rate (WACC), reinvestment rate (MIRR), hurdle rate (minimum IRR).' },
        { step: '3', title: 'Compute Metrics', desc: 'NPV, IRR, MIRR, Payback, Discounted Payback, PI auto-calculated.' },
        { step: '4', title: 'Decision Framework', desc: 'Accept: NPV > 0 AND IRR > hurdle. Reject: both fail. Marginal: mixed.' },
        { step: '5', title: 'Sensitivity', desc: 'NPV profile chart shows how NPV changes across discount rates.' },
        { step: '6', title: 'Report', desc: 'Rankings, comparisons, Key Findings, exportable report.' },
      ].map(({ step, title, desc }) => (<div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"><div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div><div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div></div>))}</div></div>
      <div><h3 className="font-semibold text-primary mb-3">Key Formulas</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Accept If</th><th className="p-2 text-left">Caution</th></tr></thead><tbody>{[
        ['NPV', 'Σ CFₜ/(1+r)^t', '> 0', 'Sensitive to discount rate'],
        ['IRR', 'Rate where NPV = 0', '> WACC', 'Multiple IRRs possible'],
        ['MIRR', '(FVₚₒₛ/PVₙₑᵍ)^(1/n)−1', '> WACC', 'Assumes reinvestment rate'],
        ['Payback', 'Yr where Σ CF ≥ 0', '< Threshold', 'Ignores post-payback CF'],
        ['Disc. Payback', 'Yr where Σ DCF ≥ 0', '< Threshold', 'Always ≥ Simple PB'],
        ['PI', 'PV(future CF) ÷ |CF₀|', '> 1.0', 'Use for capital rationing'],
        ['NPV/Investment', 'NPV ÷ |CF₀|', 'Higher = better', 'Efficiency measure'],
      ].map(([m, f, a, c], i) => (<tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{m}</td><td className="p-2 border-r font-mono text-muted-foreground">{f}</td><td className="p-2 border-r text-green-600">{a}</td><td className="p-2 text-amber-600">{c}</td></tr>))}</tbody></table></div></div>
      <div><h3 className="font-semibold text-primary mb-3">Decision Framework</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Scenario</th><th className="p-2 text-left">NPV</th><th className="p-2 text-left">IRR vs Hurdle</th><th className="p-2 text-left">Action</th></tr></thead><tbody>{[
        ['Best case', '> 0', 'IRR > Hurdle', 'Accept — both metrics confirm value creation'],
        ['NPV-only positive', '> 0', 'IRR < Hurdle', 'Review — reinvestment assumption matters, check MIRR'],
        ['IRR-only positive', '< 0', 'IRR > Hurdle', 'Review — scale issue, IRR can mislead on small projects'],
        ['Worst case', '< 0', 'IRR < Hurdle', 'Reject — neither metric supports investment'],
        ['Conflicting rankings', 'A > B', 'IRR: B > A', 'Use NPV for mutually exclusive; PI for capital rationing'],
        ['Non-conventional CF', 'Varies', 'Multiple IRRs', 'Rely on NPV and MIRR instead of IRR'],
      ].map(([s, n, i, a], idx) => (<tr key={idx} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{s}</td><td className="p-2 border-r font-mono text-muted-foreground">{n}</td><td className="p-2 border-r font-mono text-muted-foreground">{i}</td><td className="p-2">{a}</td></tr>))}</tbody></table></div></div>
      <div><h3 className="font-semibold text-primary mb-3">When to Use Which Metric</h3><div className="grid grid-cols-2 gap-3">{[
        { title: 'NPV — The Gold Standard', desc: 'Always use NPV as primary metric. Measures absolute value creation in dollars. For mutually exclusive projects, always rank by NPV.' },
        { title: 'IRR — Intuitive but Flawed', desc: 'Good for communication ("18% return") but can produce multiple values for non-conventional cash flows. Never use alone.' },
        { title: 'MIRR — The Better IRR', desc: 'Solves IRR\'s reinvestment assumption (IRR assumes reinvestment at IRR itself). MIRR uses a realistic reinvestment rate.' },
        { title: 'PI — Capital Rationing', desc: 'When budget is limited, rank by PI (value per dollar). PI > 1 = value-creating. Optimal for maximizing portfolio NPV under constraints.' },
      ].map(({ title, desc }, i) => (<div key={i} className="p-3 rounded-lg bg-muted/20 border"><p className="text-xs font-semibold mb-1">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>))}</div></div>
      <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5"><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4><ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• Year 0 should be <strong>negative</strong> (the initial investment outflow).</li>
        <li>• MIRR is more reliable than IRR for <strong>non-conventional</strong> cash flows (sign changes).</li>
        <li>• Under capital rationing, rank by <strong>PI</strong> (value per $ invested), not just NPV.</li>
        <li>• NPV sensitivity chart shows where each project's line crosses $0 = that project's <strong>IRR</strong>.</li>
        <li>• Set discount rate = <strong>WACC</strong>. Set hurdle ≥ WACC to account for project-specific risk.</li>
        <li>• All amounts in <strong>$K</strong>. Trailing zero years auto-trimmed.</li>
      </ul></div>
    </div>
  </div></div>); };

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => { if (!isOpen) return null; return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
    <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between"><div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CSV Format Guide — Project Cash Flows</h2></div><Button variant="ghost" size="sm" onClick={onClose}>✕</Button></div>
    <div className="p-6 space-y-6">
      <p className="text-sm text-muted-foreground">Each row is a project. Year 0 = initial investment (negative). Year 1–N = projected cash inflows. Amounts in <strong>$K</strong>.</p>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-1.5">project_name</th><th className="p-1.5">category</th><th className="p-1.5 text-right">year_0</th><th className="p-1.5 text-right">year_1</th><th className="p-1.5 text-right">year_2</th><th className="p-1.5 text-center">...</th><th className="p-1.5 text-right">year_7</th></tr></thead><tbody>{[
        ['ERP Upgrade', 'Technology', '-2500', '450', '550', '...', '700'],
        ['Mfg Line B', 'Equipment', '-4200', '800', '1000', '...', '1200'],
        ['Solar Panels', 'Sustainability', '-950', '120', '140', '...', '200'],
      ].map((row, i) => (<tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>{row.map((c, j) => <td key={j} className={`p-1.5 ${[2,3,4,6].includes(j) ? 'text-right font-mono' : j === 5 ? 'text-center' : ''}`}>{c}</td>)}</tr>))}</tbody></table></div>
      <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Badge className="bg-primary text-primary-foreground text-xs">Required</Badge> Minimum</h4><div className="grid grid-cols-4 gap-2">{['project_name', 'year_0', 'year_1', 'year_2+'].map(col => (<div key={col} className="p-2 rounded border bg-primary/5 text-center"><span className="font-mono text-xs font-semibold">{col}</span></div>))}</div></div>
      <div><h4 className="font-semibold text-sm mb-2">All Columns</h4><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{[
        { name: 'project_name', desc: 'Project name' },
        { name: 'category', desc: 'Technology, Equipment, etc.' },
        { name: 'year_0', desc: 'Initial investment (negative)' },
        { name: 'year_1..N', desc: 'Cash flows by year ($K)' },
      ].map(({ name, desc }) => (<div key={name} className="p-2 rounded border bg-muted/20"><span className="font-mono text-xs font-semibold">{name}</span><p className="text-xs text-muted-foreground mt-0.5">{desc}</p></div>))}</div></div>
      <div className="flex justify-center"><Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_project_cashflows.csv'; a.click(); }}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button></div>
    </div>
  </div></div>); };


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({ onStartWithData, onStartSample, onUpload, onFormatGuide, uploadedCount, parseError }: {
  onStartWithData: () => void; onStartSample: () => void; onUpload: (f: File) => void; onFormatGuide: () => void; uploadedCount: number; parseError: string | null;
}) => {
  const hasData = uploadedCount > 0;
  return (
    <div className="flex flex-1 items-center justify-center p-6"><Card className="w-full max-w-4xl">
      <CardHeader className="text-center"><div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Calculator className="w-8 h-8 text-primary" /></div></div><CardTitle className="font-headline text-3xl">IRR / NPV Calculator</CardTitle><CardDescription className="text-base mt-2">Standard financial metrics for capital budgeting and investment appraisal</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">{[
          { icon: DollarSign, title: 'NPV & IRR', desc: 'Net Present Value, Internal Rate of Return, and Modified IRR' },
          { icon: Clock, title: 'Payback Analysis', desc: 'Simple and Discounted Payback periods for each project' },
          { icon: Target, title: 'Decision Framework', desc: 'Accept/Reject recommendations with Profitability Index ranking' },
        ].map(({ icon: Icon, title, desc }) => (<Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>))}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-2 transition-all ${hasData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`} onClick={() => { if (!hasData) document.getElementById('irr-csv-upload')?.click(); }}>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload Cash Flows</CardTitle><CardDescription className="text-xs">CSV with year-by-year projections</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              {hasData ? (<><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Cash flow data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('irr-csv-reup')?.click()}>Upload different file<input id="irr-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} /></Button></>) : (<><p className="text-sm text-muted-foreground">Upload CSV with Year 0 investment and Year 1–N cash flows.</p><div className="bg-muted/50 rounded-lg p-3 text-xs font-mono"><p className="text-muted-foreground mb-1">Required:</p><p>project_name | year_0 | year_1 | year_2+</p></div><Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); onFormatGuide(); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>{parseError && (<div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>)}</>)}
              <input id="irr-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Calculator className="w-5 h-5" /></div><div><CardTitle className="text-base">Sample Projects</CardTitle><CardDescription className="text-xs">15 projects, up to 7 years</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Diversified capital projects: Technology, Equipment, Sustainability, Vehicles, Facilities.</p><div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">{['15 projects', '5 categories', 'NPV & IRR & MIRR', 'Accept/Reject'].map(f => (<div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>))}</div><Button onClick={onStartSample} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Load Sample Projects</Button></CardContent>
          </Card>
        </div>
      </CardContent>
    </Card></div>);
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function IrrNpvCalculatorPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: IrrNpvPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [projects, setProjects] = useState<ProjectCF[]>([]);
  const [config, setConfig] = useState<CalcConfig>(DEFAULT_CONFIG);
  const [pendingProjects, setPendingProjects] = useState<ProjectCF[]>(() => {
    if (data && data.length > 0) { const p = parseCashFlowData(data, DEFAULT_CONFIG); if (p && p.length > 0) return p; } return [];
  });
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => { if (data && data.length > 0) { const parsed = parseCashFlowData(data, config); if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); } } }, [data, config]);

  // Recompute when config changes
  useEffect(() => {
    if (projects.length > 0) {
      setProjects(prev => prev.map(p => computeProject(p.id, p.project_name, p.category, p.cashflows, config)));
    }
  }, [config]);

  const handleFileUpload = useCallback((file: File) => { setParseError(null); Papa.parse(file, { header: true, skipEmptyLines: true, complete: (result) => { const parsed = parseCashFlowData(result.data as Record<string, any>[], config); if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); toast({ title: 'Imported', description: `${parsed.length} projects detected.` }); } else { const cols = Object.keys((result.data as any[])[0] || {}).join(', '); setParseError(`Could not parse. Columns: [${cols}].`); } }, error: () => setParseError('Failed to read CSV.') }); }, [toast, config]);
  const handleStartWithData = useCallback(() => { if (pendingProjects.length > 0) { setProjects(pendingProjects); setShowIntro(false); } }, [pendingProjects]);
  const handleLoadSample = useCallback(() => { setProjects(buildDefaultProjects(config)); setShowIntro(false); }, [config]);

  // Analytics
  const n = projects.length;
  const sortedNPV = useMemo(() => [...projects].sort((a, b) => b.npv - a.npv), [projects]);
  const sortedPI = useMemo(() => [...projects].sort((a, b) => b.pi - a.pi), [projects]);
  const totalInvestment = useMemo(() => projects.reduce((s, p) => s + p.totalInvestment, 0), [projects]);
  const totalNPV = useMemo(() => projects.reduce((s, p) => s + p.npv, 0), [projects]);
  const acceptCount = useMemo(() => projects.filter(p => p.decision === 'Accept').length, [projects]);
  const rejectCount = useMemo(() => projects.filter(p => p.decision === 'Reject').length, [projects]);
  const marginalCount = n - acceptCount - rejectCount;
  const waIRR = useMemo(() => totalInvestment > 0 ? projects.reduce((s, p) => s + p.irr * p.totalInvestment, 0) / totalInvestment : 0, [projects, totalInvestment]);
  const avgPayback = useMemo(() => { const f = projects.filter(p => isFinite(p.payback)); return f.length > 0 ? f.reduce((s, p) => s + p.payback, 0) / f.length : 0; }, [projects]);

  // NPV Profile (sensitivity)
  const npvProfile = useMemo(() => {
    const rates = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30];
    return rates.map(r => {
      const row: any = { rate: `${r}%` };
      sortedNPV.slice(0, 5).forEach(p => { row[p.project_name.slice(0, 12)] = Math.round(calcNPV(p.cashflows, r)); });
      row._total = Math.round(projects.reduce((s, p) => s + calcNPV(p.cashflows, r), 0));
      return row;
    });
  }, [sortedNPV, projects]);

  const catData = useMemo(() => {
    const m: Record<string, { inv: number; npv: number; count: number }> = {};
    projects.forEach(p => { if (!m[p.category]) m[p.category] = { inv: 0, npv: 0, count: 0 }; m[p.category].inv += p.totalInvestment; m[p.category].npv += p.npv; m[p.category].count++; });
    return Object.entries(m).map(([c, d]) => ({ category: c, ...d })).sort((a, b) => b.npv - a.npv);
  }, [projects]);

  // Export
  const handleDownloadPNG = useCallback(async () => { if (!resultsRef.current) return; setIsDownloading(true); try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = 'IRR_NPV_Report.png'; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); } }, []);
  const handleDownloadCSV = useCallback(() => {
    const rows = sortedNPV.map(p => ({ ID: p.id, Project: p.project_name, Category: p.category, 'Investment($K)': p.totalInvestment, 'NPV($K)': p.npv.toFixed(0), 'IRR%': fmtPct(p.irr), 'MIRR%': fmtPct(p.mirr), 'Payback(yr)': fmtYr(p.payback), 'Disc.Payback(yr)': fmtYr(p.discountedPayback), PI: p.pi.toFixed(2), Decision: p.decision }));
    let csv = `IRR/NPV CALCULATOR REPORT\n${new Date().toLocaleDateString()}\nWACC: ${config.discountRate}% | Hurdle: ${config.hurdleRate}% | ${n} Projects\n\n`; csv += Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'IRR_NPV_Report.csv'; link.click();
  }, [sortedNPV, config, n]);

  if (showIntro) return (<><IntroPage onStartWithData={handleStartWithData} onStartSample={handleLoadSample} onUpload={handleFileUpload} onFormatGuide={() => setFormatGuideOpen(true)} uploadedCount={pendingProjects.length} parseError={parseError} /><FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} /></>);

  const top5Names = sortedNPV.slice(0, 5).map(p => p.project_name.slice(0, 12));

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">IRR / NPV Calculator</h1><p className="text-muted-foreground mt-1">{n} projects | WACC {config.discountRate}% | Hurdle {config.hurdleRate}%</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div></div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <GuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />

      {/* Config */}
      <Card className="border-0 shadow-lg"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-4">{[
        { label: 'Discount / WACC (%)', key: 'discountRate' },
        { label: 'Reinvestment Rate (%)', key: 'reinvestmentRate' },
        { label: 'Hurdle Rate (%)', key: 'hurdleRate' },
      ].map(({ label, key }) => (<div key={key}><Label className="text-xs">{label}</Label><Input type="number" value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>))}</div></CardContent></Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[
        { label: 'Total NPV', value: fmt(totalNPV), sub: `@ ${config.discountRate}% WACC`, alert: totalNPV < 0 },
        { label: 'Wtd Avg IRR', value: fmtPct(waIRR), sub: `vs ${config.hurdleRate}% hurdle`, alert: waIRR < config.hurdleRate },
        { label: 'Decisions', value: `${acceptCount} ✓`, sub: `${rejectCount} ✗ · ${marginalCount} ~` },
        { label: 'Avg Payback', value: `${avgPayback.toFixed(1)} yr`, sub: `${fmt(totalInvestment)} invested` },
      ].map(({ label, value, sub, alert }) => (<Card key={label} className={`border-0 shadow-lg ${alert ? 'ring-2 ring-red-500/20' : ''}`}><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{sub}</p></CardContent></Card>))}</div>

      {/* Project Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calculator className="w-5 h-5 text-primary" /></div><div><CardTitle>Project Appraisal</CardTitle><CardDescription>Sorted by NPV (highest first)</CardDescription></div></div><Button variant="outline" size="sm" onClick={() => document.getElementById('irr-csv-reupload')?.click()}><Upload className="w-4 h-4 mr-1" />Re-upload<input id="irr-csv-reupload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} /></Button></div></CardHeader>
        <CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="min-w-[130px]">Project</TableHead><TableHead className="text-right">Investment</TableHead><TableHead className="text-right">NPV</TableHead><TableHead className="text-right">IRR</TableHead><TableHead className="text-right">MIRR</TableHead><TableHead className="text-right">Payback</TableHead><TableHead className="text-right">PI</TableHead><TableHead>Decision</TableHead></TableRow></TableHeader>
          <TableBody>{sortedNPV.map(p => (<TableRow key={p.id} className={p.decision === 'Reject' ? 'bg-red-50/30 dark:bg-red-950/10' : p.decision === 'Accept' ? '' : 'bg-amber-50/30 dark:bg-amber-950/10'}>
            <TableCell><div><p className="font-medium text-sm">{p.project_name}</p><p className="text-xs text-muted-foreground">{p.category} · {p.cashflows.length - 1}yr</p></div></TableCell>
            <TableCell className="text-right font-mono text-xs">{fmt(p.totalInvestment)}</TableCell>
            <TableCell className={`text-right font-mono text-xs font-bold ${p.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.npv)}</TableCell>
            <TableCell className={`text-right font-mono text-xs ${p.irr >= config.hurdleRate ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(p.irr)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{fmtPct(p.mirr)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{fmtYr(p.payback)}</TableCell>
            <TableCell className={`text-right font-mono text-xs font-bold ${p.pi >= 1 ? 'text-green-600' : 'text-red-600'}`}>{p.pi.toFixed(2)}</TableCell>
            <TableCell><Badge className={`text-xs ${DECISION_COLORS[p.decision] || ''}`}>{p.decision}</Badge></TableCell>
          </TableRow>))}</TableBody></Table></div></CardContent>
      </Card>

      {/* Report */}
      <div className="flex justify-between items-center"><h2 className="text-lg font-semibold">Report</h2><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">IRR / NPV Calculator Report</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {n} Projects | WACC {config.discountRate}% | Hurdle {config.hurdleRate}%</p></div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Investment', value: fmt(totalInvestment), sub: `${n} projects`, color: 'text-primary' },
            { label: 'Combined NPV', value: fmt(totalNPV), sub: `@ ${config.discountRate}% WACC`, color: totalNPV >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Wtd Avg IRR', value: fmtPct(waIRR), sub: waIRR >= config.hurdleRate ? 'Exceeds hurdle' : 'Below hurdle', color: waIRR >= config.hurdleRate ? 'text-green-600' : 'text-red-600' },
            { label: 'Decisions', value: `${acceptCount}A / ${marginalCount}M / ${rejectCount}R`, sub: `${acceptCount} accept, ${rejectCount} reject`, color: acceptCount >= rejectCount ? 'text-green-600' : 'text-red-600' },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} className="border-0 shadow-lg">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Capital Budgeting Detail Table */}
        <Card>
          <CardHeader><CardTitle>Capital Budgeting Detail</CardTitle><CardDescription>NPV-ranked projects with IRR, MIRR, payback, PI, and decision</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Project</th>
              <th className="p-2 text-right font-semibold">Investment</th>
              <th className="p-2 text-right font-semibold">NPV</th>
              <th className="p-2 text-right font-semibold">IRR</th>
              <th className="p-2 text-right font-semibold">MIRR</th>
              <th className="p-2 text-right font-semibold">Payback</th>
              <th className="p-2 text-right font-semibold">PI</th>
              <th className="p-2 text-center font-semibold">Decision</th>
            </tr></thead>
            <tbody>{sortedNPV.map((p, i) => (
              <tr key={p.id} className={`border-b ${p.decision === 'Reject' ? 'bg-red-50/30 dark:bg-red-950/10' : p.decision === 'Marginal' ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.palette[i % COLORS.palette.length] }} />{p.project_name}</div></td>
                <td className="p-2 text-right font-mono">{fmt(p.totalInvestment)}</td>
                <td className={`p-2 text-right font-mono font-semibold ${p.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.npv)}</td>
                <td className={`p-2 text-right font-mono ${p.irr >= config.hurdleRate ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(p.irr)}</td>
                <td className="p-2 text-right font-mono">{fmtPct(p.mirr)}</td>
                <td className="p-2 text-right font-mono">{fmtYr(p.payback)}</td>
                <td className={`p-2 text-right font-mono font-semibold ${p.pi >= 1 ? 'text-green-600' : 'text-red-600'}`}>{p.pi.toFixed(2)}</td>
                <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${DECISION_COLORS[p.decision] || ''}`}>{p.decision}</span></td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total / Wtd Avg</td>
              <td className="p-2 text-right font-mono">{fmt(totalInvestment)}</td>
              <td className={`p-2 text-right font-mono font-bold ${totalNPV >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalNPV)}</td>
              <td className="p-2 text-right font-mono">{fmtPct(waIRR)}</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{avgPayback.toFixed(1)}yr</td>
              <td className="p-2" />
              <td className="p-2" />
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div><div><CardTitle>Key Findings</CardTitle><CardDescription>Capital budgeting insights</CardDescription></div></div></CardHeader>
          <CardContent><div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">{(() => {
              const items: string[] = [];
              items.push(`Portfolio: ${n} projects, ${fmt(totalInvestment)} total investment. Combined NPV: ${fmt(totalNPV)} @ ${config.discountRate}% WACC.`);
              items.push(`Decisions: ${acceptCount} Accept, ${marginalCount} Marginal, ${rejectCount} Reject. ${acceptCount > rejectCount ? 'Majority value-creating.' : 'Majority do not meet criteria.'}`);
              items.push(`IRR: Weighted-average ${fmtPct(waIRR)} vs ${config.hurdleRate}% hurdle. ${waIRR >= config.hurdleRate ? 'Portfolio exceeds hurdle.' : 'Portfolio IRR below hurdle.'}`);
              const top = sortedNPV[0];
              if (top) items.push(`Best project: "${top.project_name}" — NPV ${fmt(top.npv)}, IRR ${fmtPct(top.irr)}, PI ${top.pi.toFixed(2)}, Payback ${fmtYr(top.payback)}.`);
              const bestPI = sortedPI[0];
              if (bestPI && bestPI.id !== top?.id) items.push(`Best capital efficiency: "${bestPI.project_name}" — PI ${bestPI.pi.toFixed(2)} (${fmt(bestPI.npv)} NPV per ${fmt(bestPI.totalInvestment)} invested).`);
              const rejects = projects.filter(p => p.decision === 'Reject');
              if (rejects.length > 0) items.push(`Reject: ${rejects.map(p => `"${p.project_name}" (NPV ${fmt(p.npv)}, IRR ${fmtPct(p.irr)})`).join(', ')}.`);
              items.push(`Payback: Average ${avgPayback.toFixed(1)} years. Fastest: "${[...projects].sort((a, b) => a.payback - b.payback)[0]?.project_name}" (${fmtYr([...projects].sort((a, b) => a.payback - b.payback)[0]?.payback)}).`);
              const negNPV = projects.filter(p => p.npv < 0);
              if (negNPV.length > 0) items.push(`${negNPV.length} projects with negative NPV totaling ${fmt(negNPV.reduce((s, p) => s + p.npv, 0))}. Capital could be reallocated.`);
              return items.map((text, i) => (<div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>));
            })()}</div>
          </div></CardContent>
        </Card>

        {/* NPV Ranking Bar */}
        <Card><CardHeader><CardTitle>NPV Ranking</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={sortedNPV} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tickFormatter={v => `$${v}K`} /><YAxis type="category" dataKey="project_name" width={120} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><ReferenceLine x={0} stroke="#000" strokeWidth={1} /><Bar dataKey="npv" name="NPV ($K)" radius={[0, 4, 4, 0]}>{sortedNPV.map((d, i) => <Cell key={i} fill={d.npv >= 0 ? COLORS.secondary : COLORS.softRed} />)}</Bar></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* NPV Sensitivity Profile */}
        <Card><CardHeader><CardTitle>NPV Sensitivity — Top 5 Projects vs Discount Rate</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={npvProfile}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="rate" /><YAxis tickFormatter={v => `$${v}K`} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><Legend /><ReferenceLine y={0} stroke="#000" strokeWidth={1} />{top5Names.map((name, i) => (<Line key={name} dataKey={name} type="monotone" stroke={COLORS.palette[i]} strokeWidth={2} dot={{ r: 3 }} />))}<Line dataKey="_total" name="Portfolio" type="monotone" stroke={COLORS.primary} strokeWidth={3} strokeDasharray="6 3" dot={false} /></ComposedChart></ResponsiveContainer></div><div className="flex justify-center mt-2 text-xs text-muted-foreground"><span>X-axis: discount rate. Where a line crosses $0 = that project's IRR.</span></div></CardContent></Card>

        {/* IRR vs PI Scatter */}
        <Card><CardHeader><CardTitle>IRR vs Profitability Index — Bubble = Investment</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="pi" name="PI" type="number" domain={[0, 'auto']} /><YAxis dataKey="irr" name="IRR %" tickFormatter={v => `${v}%`} type="number" /><ZAxis dataKey="totalInvestment" range={[40, 400]} name="Investment" /><Tooltip formatter={(v: any, name: string) => [name === 'IRR %' ? `${Number(v).toFixed(1)}%` : name === 'PI' ? Number(v).toFixed(2) : `$${Number(v).toLocaleString()}K`, name]} /><ReferenceLine y={config.hurdleRate} stroke="#dc2626" strokeDasharray="5 5" label={{ value: `Hurdle ${config.hurdleRate}%`, fontSize: 10, fill: '#dc2626' }} /><ReferenceLine x={1} stroke="#dc2626" strokeDasharray="5 5" label={{ value: 'PI=1', fontSize: 10, fill: '#dc2626', position: 'top' }} /><Scatter data={projects.map(p => ({ ...p, name: p.project_name }))} fill={COLORS.primary} fillOpacity={0.6} /></ScatterChart></ResponsiveContainer></div><div className="flex justify-center mt-2 text-xs text-muted-foreground"><span>Top-right quadrant (IRR {'>'} hurdle, PI {'>'} 1) = best investments.</span></div></CardContent></Card>

        {/* Category Comparison */}
        <Card><CardHeader><CardTitle>NPV by Category</CardTitle></CardHeader><CardContent><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={catData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="category" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => `$${v}K`} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><Legend /><Bar dataKey="inv" name="Investment" fill={COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.7} /><Bar dataKey="npv" name="NPV" radius={[4, 4, 0, 0]}>{catData.map((d, i) => <Cell key={i} fill={d.npv >= 0 ? COLORS.secondary : COLORS.softRed} />)}</Bar></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* Metrics + Decision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Portfolio Metrics</CardTitle></CardHeader><CardContent><div className="space-y-2">{[
            { label: 'Total Investment', value: fmt(totalInvestment) },
            { label: 'Total NPV', value: fmt(totalNPV) },
            { label: 'Wtd Avg IRR', value: fmtPct(waIRR) },
            { label: 'Avg Payback', value: `${avgPayback.toFixed(1)} yr` },
            { label: 'Positive NPV', value: `${projects.filter(p => p.npv >= 0).length} / ${n}` },
            { label: 'Best PI', value: `${sortedPI[0]?.project_name} (${sortedPI[0]?.pi.toFixed(2)})` },
          ].map(({ label, value }) => (<div key={label} className="flex justify-between p-2 rounded-lg bg-muted/20"><span className="text-sm">{label}</span><span className="font-mono text-sm font-semibold">{value}</span></div>))}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Decision Summary</CardTitle></CardHeader><CardContent><div className="space-y-3">{[
            { decision: 'Accept', count: acceptCount, desc: 'NPV > 0 AND IRR > hurdle', color: 'bg-green-500' },
            { decision: 'Marginal', count: marginalCount, desc: 'Mixed signals — review', color: 'bg-amber-500' },
            { decision: 'Reject', count: rejectCount, desc: 'NPV ≤ 0 AND IRR ≤ hurdle', color: 'bg-red-500' },
          ].map(({ decision, count, desc, color }) => (<div key={decision} className="flex items-center justify-between p-3 rounded-lg bg-muted/20"><div><Badge className={`text-xs ${DECISION_COLORS[decision]}`}>{decision}</Badge><p className="text-xs text-muted-foreground mt-1">{desc}</p></div><div className="flex items-center gap-2"><div className="w-20 h-3 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${n > 0 ? (count / n) * 100 : 0}%` }} /></div><span className="font-mono text-sm font-bold w-6 text-right">{count}</span></div></div>))}</div></CardContent></Card>
        </div>

        {/* Summary */}
        <Card><CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader><CardContent><div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Capital Budgeting Summary</h3></div><div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">Evaluated <strong>{n} capital projects</strong> totaling {fmt(totalInvestment)} in investment. At a {config.discountRate}% discount rate, total portfolio NPV is <strong>{fmt(totalNPV)}</strong>. Weighted-average IRR is {fmtPct(waIRR)} against a {config.hurdleRate}% hurdle rate.</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Recommendations:</strong> {acceptCount} projects recommended for approval (combined NPV {fmt(projects.filter(p => p.decision === 'Accept').reduce((s, p) => s + p.npv, 0))}). {rejectCount} recommended for rejection. {marginalCount} require further analysis.</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Capital efficiency:</strong> Best PI is "{sortedPI[0]?.project_name}" at {sortedPI[0]?.pi.toFixed(2)}. Average payback {avgPayback.toFixed(1)} years. {avgPayback <= 3 ? 'Fast recovery profile.' : avgPayback <= 5 ? 'Moderate recovery.' : 'Long recovery horizon — monitor closely.'}</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>By category:</strong> {catData.map(c => `${c.category}: ${c.count} projects, NPV ${fmt(c.npv)}`).join(' · ')}.</p>
        </div></div></CardContent></Card>
      </div>

      <div className="flex justify-center pb-8"><Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top</Button></div>
    </div>
  );
}
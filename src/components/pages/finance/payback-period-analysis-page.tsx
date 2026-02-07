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
  Clock, Settings2, TrendingUp, Timer, Hourglass
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
  ReferenceLine, LineChart
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PaybackRow {
  id: string;
  project_name: string;
  category: string;
  cashflows: number[];          // year 0..N ($K)
  investment: number;           // |CF₀|
  totalReturn: number;
  simplePayback: number;        // years (undiscounted)
  discountedPayback: number;    // years (discounted)
  cumulativeCF: number[];       // running total undiscounted
  cumulativeDCF: number[];      // running total discounted
  roi: number;                  // total return / investment
  npv: number;
  breakEvenYear: number;        // first year cumCF >= 0 (integer)
  recovered: boolean;           // does it ever recover?
}

interface PaybackConfig {
  discountRate: number;
  maxAcceptablePayback: number;  // years threshold
}

interface PaybackPageProps {
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
const fmtPct = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;
const fmtYr = (n: number) => isNaN(n) || !isFinite(n) ? 'Never' : `${n.toFixed(1)} yr`;

const DEFAULT_CONFIG: PaybackConfig = { discountRate: 10, maxAcceptablePayback: 5 };


// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function computePayback(id: string, name: string, category: string, cfs: number[], config: PaybackConfig): PaybackRow {
  const investment = Math.abs(cfs[0] || 0);
  const totalReturn = cfs.slice(1).filter(c => c > 0).reduce((s, c) => s + c, 0);

  // Cumulative undiscounted
  const cumCF: number[] = [];
  let cumSum = 0;
  cfs.forEach(cf => { cumSum += cf; cumCF.push(cumSum); });

  // Cumulative discounted
  const cumDCF: number[] = [];
  let cumDSum = 0;
  cfs.forEach((cf, t) => { cumDSum += cf / Math.pow(1 + config.discountRate / 100, t); cumDCF.push(cumDSum); });

  // Simple payback
  let simplePayback = Infinity;
  for (let t = 1; t < cumCF.length; t++) {
    if (cumCF[t] >= 0 && cumCF[t - 1] < 0) {
      simplePayback = (t - 1) + Math.abs(cumCF[t - 1]) / (cumCF[t] - cumCF[t - 1]);
      break;
    }
    if (cumCF[t] >= 0 && t === 1) { simplePayback = Math.abs(cfs[0]) / cfs[1]; break; }
  }
  if (cumCF.length > 0 && cumCF[cumCF.length - 1] >= 0 && simplePayback === Infinity) {
    // Try full scan
    for (let t = 1; t < cumCF.length; t++) {
      if (cumCF[t] >= 0) { simplePayback = t; break; }
    }
  }

  // Discounted payback
  let discPayback = Infinity;
  for (let t = 1; t < cumDCF.length; t++) {
    if (cumDCF[t] >= 0 && cumDCF[t - 1] < 0) {
      const dcfT = cfs[t] / Math.pow(1 + config.discountRate / 100, t);
      discPayback = (t - 1) + Math.abs(cumDCF[t - 1]) / dcfT;
      break;
    }
  }

  const npv = cumDCF[cumDCF.length - 1] || 0;
  const roi = investment > 0 ? (totalReturn / investment) * 100 : 0;
  const breakEvenYear = cumCF.findIndex((c, i) => i > 0 && c >= 0);
  const recovered = isFinite(simplePayback);

  return { id, project_name: name, category, cashflows: cfs, investment, totalReturn, simplePayback, discountedPayback: discPayback, cumulativeCF: cumCF, cumulativeDCF: cumDCF, roi, npv, breakEvenYear: breakEvenYear >= 0 ? breakEvenYear : -1, recovered };
}


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parsePaybackData(rows: Record<string, any>[], config: PaybackConfig): PaybackRow[] | null {
  if (!rows || rows.length === 0) return null;
  const get = (row: Record<string, any>, ...ss: string[]): string => {
    for (const s of ss) { const f = Object.entries(row).find(([k]) => k.toLowerCase().replace(/[\s_-]/g, '').includes(s.replace(/[\s_-]/g, ''))); if (f && f[1] != null && f[1] !== '') return String(f[1]).trim(); } return '';
  };

  const items: PaybackRow[] = rows.map((row, i) => {
    const name = get(row, 'project_name', 'project', 'name', 'investment', 'description');
    if (!name) return null;
    const category = get(row, 'category', 'type', 'sector') || 'Other';

    const cfs: number[] = [];
    for (let y = 0; y <= 20; y++) {
      const v = get(row, `year_${y}`, `y${y}`, `cf${y}`, `year${y}`, `period_${y}`);
      if (v === '' && y > 1 && cfs.length > 0) break;
      cfs.push(parseFloat(v.replace(/[$,%]/g, '')) || 0);
    }
    if (cfs.every(c => c === 0)) {
      const numCols = Object.entries(row).filter(([k]) => !['project', 'name', 'category', 'type', 'id', 'description', 'sector'].some(s => k.toLowerCase().includes(s)));
      numCols.forEach(([, v]) => { const n = parseFloat(String(v).replace(/[$,%]/g, '')); if (!isNaN(n)) cfs.push(n); });
      while (cfs.length > 0 && cfs[0] === 0 && cfs.length > 2) cfs.shift();
    }
    while (cfs.length > 2 && cfs[cfs.length - 1] === 0) cfs.pop();
    if (cfs.length < 2 || cfs.every(c => c === 0)) return null;

    const id = get(row, 'id', 'project_id') || `PB${String(i + 1).padStart(3, '0')}`;
    return computePayback(id, name, category, cfs, config);
  }).filter(Boolean) as PaybackRow[];

  return items.length > 0 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `id,project_name,category,year_0,year_1,year_2,year_3,year_4,year_5,year_6,year_7,year_8
PB01,ERP System Upgrade,Technology,-2500,450,550,650,700,700,700,500,0
PB02,Manufacturing Line B,Equipment,-4200,800,1000,1200,1200,1200,1200,1200,0
PB03,Cloud Migration,Technology,-1100,300,400,450,400,0,0,0,0
PB04,Warehouse Automation,Equipment,-2800,500,700,900,1000,1000,800,0,0
PB05,Solar Installation,Sustainability,-950,100,120,140,160,180,200,200,200
PB06,AI Analytics Platform,Technology,-750,200,300,350,300,0,0,0,0
PB07,R&D Lab Equipment,Equipment,-1500,250,350,400,400,350,300,0,0
PB08,Fleet Electrification,Vehicles,-1200,100,180,250,300,300,300,250,0
PB09,Office Renovation,Facilities,-1800,150,200,200,200,200,200,200,200
PB10,Mobile App v2,Technology,-480,200,250,200,0,0,0,0,0
PB11,Production Robots,Equipment,-3200,400,700,900,1000,1000,1000,800,0
PB12,Marketing Automation,Technology,-290,120,150,130,0,0,0,0,0
PB13,Data Center Expansion,Technology,-3500,400,600,750,850,900,900,800,600
PB14,Employee Training,Facilities,-560,100,120,130,130,120,0,0,0
PB15,Delivery Drones Pilot,Innovation,-380,50,80,120,180,200,0,0,0
PB16,Parking Structure,Facilities,-2200,80,100,120,140,160,180,200,220
PB17,Supply Chain Software,Technology,-340,80,120,140,120,0,0,0,0
PB18,Quality Testing Lab,Equipment,-890,200,250,280,250,0,0,0,0`;

function buildDefaultPayback(config: PaybackConfig): PaybackRow[] {
  const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true });
  return parsePaybackData(result.data as Record<string, any>[], config) || [];
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Simple Payback": "Years to recover investment from undiscounted cash flows. Fast to calculate but ignores time value of money.",
  "Discounted Payback": "Years to recover investment from discounted cash flows. More conservative and realistic.",
  "Cumulative Cash Flow": "Running total of all cash flows from Year 0. Crosses zero at the payback point.",
  "Break-Even Year": "The first full year in which cumulative cash flow becomes non-negative.",
  "Maximum Acceptable Payback": "Threshold set by management. Projects exceeding this may be rejected.",
  "Time Value of Money": "A dollar today is worth more than a dollar in the future due to earning potential.",
  "NPV": "Net Present Value — sum of all discounted cash flows including initial investment.",
  "Recovery Rate": "Percentage of projects that recover their initial investment within the projection horizon.",
};
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (<Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[80vh]"><DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Payback Glossary</DialogTitle><DialogDescription>Key terms</DialogDescription></DialogHeader><ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea></DialogContent></Dialog>);

const PaybackGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => { if (!isOpen) return null; return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
    <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between"><div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Payback Period Analysis Guide</h2></div><Button variant="ghost" size="sm" onClick={onClose}>✕</Button></div>
    <div className="p-6 space-y-8">
      <div><h3 className="font-semibold text-primary mb-2">What is Payback Period Analysis?</h3><p className="text-sm text-muted-foreground">Payback period measures how long it takes for an investment to generate enough cash flow to recover its initial cost. This tool calculates both Simple (undiscounted) and Discounted payback, visualizes cumulative cash flow curves, and identifies break-even points for each project.</p></div>
      <div><h3 className="font-semibold text-primary mb-3">Process</h3><div className="space-y-2">{[
        { step: '1', title: 'Upload Cash Flows', desc: 'Year 0 (investment, negative) through Year N for each project.' },
        { step: '2', title: 'Set Parameters', desc: 'Discount rate for discounted payback, maximum acceptable payback threshold.' },
        { step: '3', title: 'Compute Payback', desc: 'Simple and discounted payback, cumulative CF curves, break-even years.' },
        { step: '4', title: 'Compare Projects', desc: 'Side-by-side rankings, recovery curves, threshold analysis.' },
        { step: '5', title: 'Identify Risk', desc: 'Flag projects that never recover or exceed the acceptable payback.' },
        { step: '6', title: 'Report', desc: 'Charts, rankings, Key Findings, exportable report.' },
      ].map(({ step, title, desc }) => (<div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"><div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div><div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div></div>))}</div></div>
      <div><h3 className="font-semibold text-primary mb-3">Key Formulas</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Good</th><th className="p-2 text-left">Warning</th></tr></thead><tbody>{[
        ['Simple Payback', 'Year t where Σ₀ᵗ CFₜ ≥ 0 (interpolated)', '< 3 yr', '> 5 yr'],
        ['Discounted Payback', 'Year t where Σ₀ᵗ CFₜ/(1+r)ᵗ ≥ 0', '< 4 yr', '> 6 yr'],
        ['Disc. Premium', 'Disc.PB − Simple PB', '< 1 yr gap', '> 2 yr gap'],
        ['Break-Even Year', 'First integer year cumCF ≥ 0', 'Early', 'Late/Never'],
        ['Recovery Rate', '# recovered ÷ total projects', '> 90%', '< 70%'],
        ['Wtd Avg Payback', 'Σ(PBᵢ × Investᵢ) ÷ Σ Investᵢ', '< threshold', '> threshold'],
        ['NPV at Payback', 'Σ DCF at simple PB year', 'Negative', 'Still deep neg.'],
        ['ROI (Total)', 'Σ Returns ÷ Investment × 100', '> 100%', '< 80%'],
      ].map(([m, f, g, w], i) => (<tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{m}</td><td className="p-2 border-r font-mono text-muted-foreground">{f}</td><td className="p-2 border-r text-green-600">{g}</td><td className="p-2 text-red-500">{w}</td></tr>))}</tbody></table></div></div>
      <div><h3 className="font-semibold text-primary mb-3">How to Interpret Results</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Scenario</th><th className="p-2 text-left">Interpretation</th><th className="p-2 text-left">Action</th></tr></thead><tbody>{[
        ['Short PB + Positive NPV', 'Fast recovery & creates value', 'Strong candidate — approve'],
        ['Short PB + Negative NPV', 'Recovers fast but destroys value long-term', 'Review post-payback cash flows'],
        ['Long PB + Positive NPV', 'Slow recovery but high total value', 'Accept if risk tolerance allows'],
        ['Long PB + Negative NPV', 'Slow recovery & destroys value', 'Reject or restructure'],
        ['Never recovers', 'Investment never recouped', 'Write-off candidate'],
        ['Disc.PB ≫ Simple PB', 'High discount rate sensitivity', 'Vulnerable to rate changes'],
      ].map(([s, i, a], idx) => (<tr key={idx} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{s}</td><td className="p-2 border-r text-muted-foreground">{i}</td><td className="p-2">{a}</td></tr>))}</tbody></table></div></div>
      <div><h3 className="font-semibold text-primary mb-3">Limitations & Best Practices</h3><div className="grid grid-cols-2 gap-3">{[
        { title: 'Ignores post-payback CF', desc: 'Payback stops counting after break-even. A 2yr-payback project with no further returns ranks above a 3yr project that generates 10× more over its life.' },
        { title: 'No risk adjustment', desc: 'Two projects with same payback may have very different risk profiles. Combine with NPV and sensitivity analysis.' },
        { title: 'Liquidity proxy', desc: 'Payback is excellent as a liquidity constraint — how quickly can capital be recycled into new investments.' },
        { title: 'Simple communication', desc: '"We recover our money in 2.5 years" is intuitive for all stakeholders, even non-financial.' },
      ].map(({ title, desc }, i) => (<div key={i} className="p-3 rounded-lg bg-muted/20 border"><p className="text-xs font-semibold mb-1">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>))}</div></div>
      <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5"><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4><ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• Discounted payback is <strong>always ≥ simple payback</strong>. The gap = time value cost.</li>
        <li>• Use simple payback for <strong>quick screening</strong>, discounted for <strong>final decisions</strong>.</li>
        <li>• Always pair payback with <strong>NPV</strong> — fast payback alone doesn't mean good investment.</li>
        <li>• Set threshold by industry: <strong>Tech: 2–3yr</strong>, Manufacturing: 3–5yr, Infrastructure: 5–7yr.</li>
        <li>• Projects "Never" recovering often have back-loaded or insufficient returns.</li>
        <li>• Year 0 = <strong>negative</strong> (investment). Year 1+ = projected inflows. All in <strong>$K</strong>.</li>
      </ul></div>
    </div>
  </div></div>); };

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => { if (!isOpen) return null; return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
    <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between"><div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CSV Format Guide — Project Cash Flows</h2></div><Button variant="ghost" size="sm" onClick={onClose}>✕</Button></div>
    <div className="p-6 space-y-6">
      <p className="text-sm text-muted-foreground">Each row = one project. Year 0 = initial investment (negative). Year 1–N = projected inflows. Amounts in <strong>$K</strong>.</p>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-1.5">project_name</th><th className="p-1.5">category</th><th className="p-1.5 text-right">year_0</th><th className="p-1.5 text-right">year_1</th><th className="p-1.5 text-right">year_2</th><th className="p-1.5 text-center">...</th><th className="p-1.5 text-right">year_7</th></tr></thead><tbody>{[
        ['ERP Upgrade', 'Technology', '-2500', '450', '550', '...', '500'],
        ['Mfg Line B', 'Equipment', '-4200', '800', '1000', '...', '1200'],
      ].map((row, i) => (<tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>{row.map((c, j) => <td key={j} className={`p-1.5 ${[2,3,4,6].includes(j) ? 'text-right font-mono' : j === 5 ? 'text-center' : ''}`}>{c}</td>)}</tr>))}</tbody></table></div>
      <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Badge className="bg-primary text-primary-foreground text-xs">Required</Badge> Minimum</h4><div className="grid grid-cols-4 gap-2">{['project_name', 'year_0', 'year_1', 'year_2+'].map(col => (<div key={col} className="p-2 rounded border bg-primary/5 text-center"><span className="font-mono text-xs font-semibold">{col}</span></div>))}</div></div>
      <div className="flex justify-center"><Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_payback_data.csv'; a.click(); }}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button></div>
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
      <CardHeader className="text-center"><div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Timer className="w-8 h-8 text-primary" /></div></div><CardTitle className="font-headline text-3xl">Payback Period Analysis</CardTitle><CardDescription className="text-base mt-2">Determine the time required to recover an initial investment</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">{[
          { icon: Clock, title: 'Simple & Discounted', desc: 'Both undiscounted and time-value-adjusted payback calculations' },
          { icon: TrendingUp, title: 'Break-Even Curves', desc: 'Cumulative cash flow visualization showing recovery trajectory' },
          { icon: Target, title: 'Threshold Analysis', desc: 'Flag projects exceeding your maximum acceptable payback period' },
        ].map(({ icon: Icon, title, desc }) => (<Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>))}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-2 transition-all ${hasData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`} onClick={() => { if (!hasData) document.getElementById('pb-csv-upload')?.click(); }}>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload Cash Flows</CardTitle><CardDescription className="text-xs">CSV with year-by-year projections</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              {hasData ? (<><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Cash flow data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('pb-csv-reup')?.click()}>Upload different file<input id="pb-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} /></Button></>) : (<><p className="text-sm text-muted-foreground">Upload CSV with Year 0 investment and Year 1–N cash flows.</p><div className="bg-muted/50 rounded-lg p-3 text-xs font-mono"><p className="text-muted-foreground mb-1">Required:</p><p>project_name | year_0 | year_1 | year_2+</p></div><Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); onFormatGuide(); }}><FileSpreadsheet className="w-4 h-4 mr-2" />Format Guide & Sample</Button>{parseError && (<div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>)}</>)}
              <input id="pb-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Timer className="w-5 h-5" /></div><div><CardTitle className="text-base">Sample Projects</CardTitle><CardDescription className="text-xs">18 projects, up to 8 years</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Capital projects across Technology, Equipment, Sustainability, Vehicles, Facilities, and Innovation.</p><div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">{['18 projects', '6 categories', 'Break-even curves', 'Threshold flags'].map(f => (<div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>))}</div><Button onClick={onStartSample} className="w-full" size="lg"><Timer className="w-4 h-4 mr-2" />Load Sample Projects</Button></CardContent>
          </Card>
        </div>
      </CardContent>
    </Card></div>);
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function PaybackPeriodPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: PaybackPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [projects, setProjects] = useState<PaybackRow[]>([]);
  const [config, setConfig] = useState<PaybackConfig>(DEFAULT_CONFIG);
  const [pendingProjects, setPendingProjects] = useState<PaybackRow[]>(() => {
    if (data && data.length > 0) { const p = parsePaybackData(data, DEFAULT_CONFIG); if (p && p.length > 0) return p; } return [];
  });
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => { if (data && data.length > 0) { const parsed = parsePaybackData(data, config); if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); } } }, [data, config]);
  useEffect(() => { if (projects.length > 0) setProjects(prev => prev.map(p => computePayback(p.id, p.project_name, p.category, p.cashflows, config))); }, [config]);

  const handleFileUpload = useCallback((file: File) => { setParseError(null); Papa.parse(file, { header: true, skipEmptyLines: true, complete: (result) => { const parsed = parsePaybackData(result.data as Record<string, any>[], config); if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); toast({ title: 'Imported', description: `${parsed.length} projects detected.` }); } else { setParseError(`Could not parse cash flows.`); } }, error: () => setParseError('Failed to read CSV.') }); }, [toast, config]);
  const handleStartWithData = useCallback(() => { if (pendingProjects.length > 0) { setProjects(pendingProjects); setShowIntro(false); } }, [pendingProjects]);
  const handleLoadSample = useCallback(() => { setProjects(buildDefaultPayback(config)); setShowIntro(false); }, [config]);

  // Analytics
  const n = projects.length;
  const sortedSimple = useMemo(() => [...projects].sort((a, b) => a.simplePayback - b.simplePayback), [projects]);
  const sortedDisc = useMemo(() => [...projects].sort((a, b) => a.discountedPayback - b.discountedPayback), [projects]);
  const totalInvestment = useMemo(() => projects.reduce((s, p) => s + p.investment, 0), [projects]);
  const recovered = useMemo(() => projects.filter(p => p.recovered), [projects]);
  const recoveryRate = n > 0 ? (recovered.length / n) * 100 : 0;
  const avgSimple = useMemo(() => { const f = projects.filter(p => isFinite(p.simplePayback)); return f.length > 0 ? f.reduce((s, p) => s + p.simplePayback, 0) / f.length : Infinity; }, [projects]);
  const avgDisc = useMemo(() => { const f = projects.filter(p => isFinite(p.discountedPayback)); return f.length > 0 ? f.reduce((s, p) => s + p.discountedPayback, 0) / f.length : Infinity; }, [projects]);
  const withinThreshold = useMemo(() => projects.filter(p => isFinite(p.simplePayback) && p.simplePayback <= config.maxAcceptablePayback), [projects, config.maxAcceptablePayback]);
  const exceedThreshold = useMemo(() => projects.filter(p => !isFinite(p.simplePayback) || p.simplePayback > config.maxAcceptablePayback), [projects, config.maxAcceptablePayback]);

  // Payback comparison chart
  const comparisonData = useMemo(() => sortedSimple.map(p => ({
    name: p.project_name.length > 16 ? p.project_name.slice(0, 14) + '…' : p.project_name,
    simple: isFinite(p.simplePayback) ? +p.simplePayback.toFixed(1) : null,
    discounted: isFinite(p.discountedPayback) ? +p.discountedPayback.toFixed(1) : null,
    investment: p.investment,
    ok: isFinite(p.simplePayback) && p.simplePayback <= config.maxAcceptablePayback,
  })), [sortedSimple, config.maxAcceptablePayback]);

  // Cumulative CF curves (top 6 by investment)
  const top6 = useMemo(() => [...projects].sort((a, b) => b.investment - a.investment).slice(0, 6), [projects]);
  const maxYears = useMemo(() => Math.max(...projects.map(p => p.cashflows.length - 1), 5), [projects]);
  const cumulativeChartData = useMemo(() => {
    const data: any[] = [];
    for (let y = 0; y <= maxYears; y++) {
      const row: any = { year: `Y${y}` };
      top6.forEach(p => { row[p.project_name.slice(0, 12)] = Math.round(p.cumulativeCF[y] ?? p.cumulativeCF[p.cumulativeCF.length - 1] ?? 0); });
      data.push(row);
    }
    return data;
  }, [top6, maxYears]);

  // Bucket distribution
  const bucketData = useMemo(() => {
    const buckets = ['< 2yr', '2–3yr', '3–4yr', '4–5yr', '5–7yr', '> 7yr', 'Never'];
    const limits = [2, 3, 4, 5, 7, Infinity, Infinity];
    return buckets.map((label, i) => {
      const lo = i === 0 ? 0 : limits[i - 1];
      const hi = limits[i];
      let group: PaybackRow[];
      if (label === 'Never') group = projects.filter(p => !isFinite(p.simplePayback));
      else group = projects.filter(p => isFinite(p.simplePayback) && p.simplePayback >= lo && p.simplePayback < hi);
      return { bucket: label, count: group.length, investment: group.reduce((s, p) => s + p.investment, 0) };
    }).filter(b => b.count > 0);
  }, [projects]);

  // Category breakdown
  const catData = useMemo(() => {
    const m: Record<string, { count: number; avgPB: number[]; inv: number }> = {};
    projects.forEach(p => { if (!m[p.category]) m[p.category] = { count: 0, avgPB: [], inv: 0 }; m[p.category].count++; m[p.category].inv += p.investment; if (isFinite(p.simplePayback)) m[p.category].avgPB.push(p.simplePayback); });
    return Object.entries(m).map(([cat, d]) => ({ category: cat, count: d.count, investment: d.inv, avgPayback: d.avgPB.length > 0 ? d.avgPB.reduce((a, b) => a + b, 0) / d.avgPB.length : Infinity })).sort((a, b) => a.avgPayback - b.avgPayback);
  }, [projects]);

  // Export
  const handleDownloadPNG = useCallback(async () => { if (!resultsRef.current) return; setIsDownloading(true); try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = 'Payback_Analysis_Report.png'; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); } }, []);
  const handleDownloadCSV = useCallback(() => {
    const rows = sortedSimple.map(p => ({ ID: p.id, Project: p.project_name, Category: p.category, 'Investment($K)': p.investment, 'SimplePayback(yr)': fmtYr(p.simplePayback), 'DiscPayback(yr)': fmtYr(p.discountedPayback), 'BreakEvenYr': p.breakEvenYear >= 0 ? p.breakEvenYear : 'Never', 'NPV($K)': p.npv.toFixed(0), 'ROI%': fmtPct(p.roi), Within: p.simplePayback <= config.maxAcceptablePayback ? 'Yes' : 'No' }));
    let csv = `PAYBACK PERIOD REPORT\n${new Date().toLocaleDateString()}\nDiscount: ${config.discountRate}% | Threshold: ${config.maxAcceptablePayback}yr | ${n} Projects\n\n`; csv += Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Payback_Analysis_Report.csv'; link.click();
  }, [sortedSimple, config, n]);

  if (showIntro) return (<><IntroPage onStartWithData={handleStartWithData} onStartSample={handleLoadSample} onUpload={handleFileUpload} onFormatGuide={() => setFormatGuideOpen(true)} uploadedCount={pendingProjects.length} parseError={parseError} /><FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} /></>);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Payback Period Analysis</h1><p className="text-muted-foreground mt-1">{n} projects | Discount {config.discountRate}% | Threshold {config.maxAcceptablePayback}yr</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div></div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <PaybackGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />

      {/* Config */}
      <Card className="border-0 shadow-lg"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4"><div><Label className="text-xs">Discount Rate (%)</Label><Input type="number" value={config.discountRate} onChange={e => setConfig(c => ({ ...c, discountRate: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div><div><Label className="text-xs">Max Acceptable Payback (years)</Label><Input type="number" value={config.maxAcceptablePayback} onChange={e => setConfig(c => ({ ...c, maxAcceptablePayback: parseFloat(e.target.value) || 5 }))} className="h-8 text-sm font-mono" /></div></div></CardContent></Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[
        { label: 'Avg Simple Payback', value: fmtYr(avgSimple), sub: `Median: ${fmtYr(sortedSimple[Math.floor(n / 2)]?.simplePayback)}`, alert: avgSimple > config.maxAcceptablePayback },
        { label: 'Avg Discounted', value: fmtYr(avgDisc), sub: `@ ${config.discountRate}% rate` },
        { label: 'Recovery Rate', value: fmtPct(recoveryRate), sub: `${recovered.length}/${n} recover`, alert: recoveryRate < 80 },
        { label: 'Within Threshold', value: `${withinThreshold.length}/${n}`, sub: `≤ ${config.maxAcceptablePayback} yr`, alert: exceedThreshold.length > n / 2 },
      ].map(({ label, value, sub, alert }) => (<Card key={label} className={`border-0 shadow-lg ${alert ? 'ring-2 ring-red-500/20' : ''}`}><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{sub}</p></CardContent></Card>))}</div>

      {/* Project Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Timer className="w-5 h-5 text-primary" /></div><div><CardTitle>Payback Rankings</CardTitle><CardDescription>Sorted by simple payback (fastest first)</CardDescription></div></div><Button variant="outline" size="sm" onClick={() => document.getElementById('pb-csv-reupload')?.click()}><Upload className="w-4 h-4 mr-1" />Re-upload<input id="pb-csv-reupload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} /></Button></div></CardHeader>
        <CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-8">#</TableHead><TableHead className="min-w-[130px]">Project</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Investment</TableHead><TableHead className="text-right">Simple PB</TableHead><TableHead className="text-right">Disc. PB</TableHead><TableHead className="text-right">NPV</TableHead><TableHead className="text-right">ROI</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{sortedSimple.map((p, i) => { const exceed = !isFinite(p.simplePayback) || p.simplePayback > config.maxAcceptablePayback; return (<TableRow key={p.id} className={exceed ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
            <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
            <TableCell><div><p className="font-medium text-sm">{p.project_name}</p><p className="text-xs text-muted-foreground">{p.cashflows.length - 1}yr horizon</p></div></TableCell>
            <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
            <TableCell className="text-right font-mono text-xs">{fmt(p.investment)}</TableCell>
            <TableCell className={`text-right font-mono text-xs font-bold ${!exceed ? 'text-green-600' : 'text-red-600'}`}>{fmtYr(p.simplePayback)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{fmtYr(p.discountedPayback)}</TableCell>
            <TableCell className={`text-right font-mono text-xs ${p.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.npv)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{fmtPct(p.roi)}</TableCell>
            <TableCell><Badge className={`text-xs ${exceed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{exceed ? 'Exceeds' : 'Within'}</Badge></TableCell>
          </TableRow>); })}</TableBody></Table></div></CardContent>
      </Card>

      {/* Report */}
      <div className="flex justify-between items-center"><h2 className="text-lg font-semibold">Report</h2><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Payback Period Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {n} Projects | Discount {config.discountRate}% | Threshold {config.maxAcceptablePayback}yr</p></div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Investment', value: fmt(totalInvestment), sub: `${n} projects`, color: 'text-primary' },
            { label: 'Avg Simple Payback', value: isFinite(avgSimple) ? `${avgSimple.toFixed(1)}yr` : '—', sub: avgSimple <= config.maxAcceptablePayback ? 'Within threshold' : 'Exceeds threshold', color: isFinite(avgSimple) && avgSimple <= config.maxAcceptablePayback ? 'text-green-600' : 'text-red-600' },
            { label: 'Recovery Rate', value: `${recovered.length}/${n}`, sub: `${recoveryRate.toFixed(0)}% recover`, color: recoveryRate >= 80 ? 'text-green-600' : recoveryRate >= 50 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Within Threshold', value: `${withinThreshold.length}`, sub: `${exceedThreshold.length} exceed ${config.maxAcceptablePayback}yr`, color: withinThreshold.length >= n * 0.7 ? 'text-green-600' : 'text-amber-600' },
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

        {/* Payback Detail Table */}
        <Card>
          <CardHeader><CardTitle>Payback Detail</CardTitle><CardDescription>Simple &amp; discounted payback, cash flows, ROI, and threshold status</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Project</th>
              <th className="p-2 text-left font-semibold">Category</th>
              <th className="p-2 text-right font-semibold">Investment</th>
              <th className="p-2 text-right font-semibold">Annual CF</th>
              <th className="p-2 text-right font-semibold">Simple</th>
              <th className="p-2 text-right font-semibold">Discounted</th>
              <th className="p-2 text-right font-semibold">ROI %</th>
              <th className="p-2 text-center font-semibold">Status</th>
            </tr></thead>
            <tbody>{sortedSimple.map((p, i) => {
              const exceed = !isFinite(p.simplePayback) || p.simplePayback > config.maxAcceptablePayback;
              return (
                <tr key={p.id} className={`border-b ${!p.recovered ? 'bg-red-50/30 dark:bg-red-950/10' : exceed ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.palette[i % COLORS.palette.length] }} />{p.project_name}</div></td>
                  <td className="p-2 text-muted-foreground">{p.category}</td>
                  <td className="p-2 text-right font-mono">{fmt(p.investment)}</td>
                  <td className="p-2 text-right font-mono">{fmt(p.avgAnnualCF)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${isFinite(p.simplePayback) && p.simplePayback <= config.maxAcceptablePayback ? 'text-green-600' : 'text-red-600'}`}>{fmtYr(p.simplePayback)}</td>
                  <td className={`p-2 text-right font-mono ${isFinite(p.discountedPayback) && p.discountedPayback <= config.maxAcceptablePayback ? 'text-green-600' : 'text-red-600'}`}>{fmtYr(p.discountedPayback)}</td>
                  <td className={`p-2 text-right font-mono ${p.roi >= 20 ? 'text-green-600' : p.roi >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(p.roi)}</td>
                  <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${exceed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{exceed ? 'Exceeds' : 'Within'}</span></td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Average</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{fmt(totalInvestment)}</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{fmtYr(avgSimple)}</td>
              <td className="p-2 text-right font-mono">{fmtYr(avgDisc)}</td>
              <td className="p-2" />
              <td className="p-2" />
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div><div><CardTitle>Key Findings</CardTitle><CardDescription>Payback analysis insights</CardDescription></div></div></CardHeader>
          <CardContent><div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">{(() => {
              const items: string[] = [];
              items.push(`Portfolio: ${n} projects, ${fmt(totalInvestment)} total investment. Average simple payback ${fmtYr(avgSimple)}, discounted payback ${fmtYr(avgDisc)}.`);
              items.push(`Recovery: ${recovered.length}/${n} projects (${fmtPct(recoveryRate)}) recover their investment. ${recovered.length === n ? 'All projects recover.' : `${n - recovered.length} project(s) never recover.`}`);
              items.push(`Threshold (${config.maxAcceptablePayback}yr): ${withinThreshold.length} within, ${exceedThreshold.length} exceed. ${withinThreshold.length >= n * 0.7 ? 'Majority pass.' : 'Significant portion fails threshold.'}`);
              const fastest = sortedSimple[0];
              if (fastest) items.push(`Fastest recovery: "${fastest.project_name}" — ${fmtYr(fastest.simplePayback)} simple, ${fmtYr(fastest.discountedPayback)} discounted. Investment ${fmt(fastest.investment)}.`);
              const slowest = sortedSimple[sortedSimple.length - 1];
              if (slowest && slowest.id !== fastest?.id) items.push(`Slowest: "${slowest.project_name}" — ${fmtYr(slowest.simplePayback)}. ${!isFinite(slowest.simplePayback) ? 'Never recovers.' : `Investment ${fmt(slowest.investment)}.`}`);
              const avgGap = avgDisc - avgSimple;
              items.push(`Discounting effect: Average discounted payback is ${avgGap.toFixed(1)} years longer than simple payback. Time value of money adds ${fmtPct((avgGap / avgSimple) * 100)} to recovery time.`);
              const bestCat = catData[0];
              if (bestCat) items.push(`Fastest category: "${bestCat.category}" (avg ${fmtYr(bestCat.avgPayback)}, ${bestCat.count} projects, ${fmt(bestCat.investment)} invested).`);
              const neverRecover = projects.filter(p => !p.recovered);
              if (neverRecover.length > 0) items.push(`Non-recoverable: ${neverRecover.map(p => `"${p.project_name}" (${fmt(p.investment)})`).join(', ')}. Consider restructuring or write-off.`);
              return items.map((text, i) => (<div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>));
            })()}</div>
          </div></CardContent>
        </Card>

        {/* Simple vs Discounted Comparison */}
        <Card><CardHeader><CardTitle>Simple vs Discounted Payback</CardTitle><CardDescription>Red dashed line = {config.maxAcceptablePayback}-year threshold</CardDescription></CardHeader><CardContent><div style={{ height: Math.max(400, comparisonData.length * 44) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={comparisonData} layout="vertical" barCategoryGap="20%"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" domain={[0, 'auto']} label={{ value: 'Years', position: 'insideBottom', offset: -5 }} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} interval={0} /><Tooltip formatter={(v: any) => [v != null ? `${Number(v).toFixed(1)} yr` : 'Never', '']} /><Legend /><ReferenceLine x={config.maxAcceptablePayback} stroke="#dc2626" strokeWidth={2} strokeDasharray="6 4" label={{ value: `${config.maxAcceptablePayback}yr`, fill: '#dc2626', fontSize: 10 }} /><Bar dataKey="simple" name="Simple Payback" fill={COLORS.primary} radius={[0, 4, 4, 0]} /><Bar dataKey="discounted" name="Discounted Payback" fill={COLORS.secondary} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* Cumulative CF Curves */}
        <Card><CardHeader><CardTitle>Cumulative Cash Flow — Top 6 by Investment</CardTitle><CardDescription>Break-even = where line crosses $0</CardDescription></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={cumulativeChartData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="year" /><YAxis tickFormatter={v => `$${v}K`} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><Legend /><ReferenceLine y={0} stroke="#000" strokeWidth={2} label={{ value: 'Break-Even', position: 'right', fontSize: 10 }} />{top6.map((p, i) => (<Line key={p.id} dataKey={p.project_name.slice(0, 12)} type="monotone" stroke={COLORS.palette[i % COLORS.palette.length]} strokeWidth={2} dot={{ r: 3 }} />))}</LineChart></ResponsiveContainer></div></CardContent></Card>

        {/* Payback Distribution */}
        <Card><CardHeader><CardTitle>Payback Distribution</CardTitle></CardHeader><CardContent><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={bucketData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="bucket" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${v}K`} /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="count" name="# Projects" radius={[4, 4, 0, 0]}>{bucketData.map((d, i) => <Cell key={i} fill={d.bucket === 'Never' || d.bucket === '> 7yr' ? COLORS.softRed : COLORS.palette[i % COLORS.palette.length]} />)}</Bar><Bar yAxisId="right" dataKey="investment" name="Investment ($K)" fill={COLORS.secondary} radius={[4, 4, 0, 0]} opacity={0.5} /></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* Category + Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Average Payback by Category</CardTitle></CardHeader><CardContent><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={catData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="category" tick={{ fontSize: 11 }} /><YAxis yAxisId="left" label={{ value: 'Years', angle: -90, position: 'insideLeft', fontSize: 10 }} /><YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${v}K`} /><Tooltip /><ReferenceLine yAxisId="left" y={config.maxAcceptablePayback} stroke="#dc2626" strokeDasharray="5 5" /><Bar yAxisId="right" dataKey="investment" name="Investment ($K)" fill={COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.3} /><Bar yAxisId="left" dataKey="avgPayback" name="Avg Payback (yr)" radius={[4, 4, 0, 0]}>{catData.map((d, i) => <Cell key={i} fill={d.avgPayback <= config.maxAcceptablePayback ? COLORS.secondary : COLORS.softRed} />)}</Bar></ComposedChart></ResponsiveContainer></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Portfolio Metrics</CardTitle></CardHeader><CardContent><div className="space-y-2">{[
            { label: 'Total Investment', value: fmt(totalInvestment) },
            { label: 'Avg Simple Payback', value: fmtYr(avgSimple) },
            { label: 'Avg Discounted Payback', value: fmtYr(avgDisc) },
            { label: 'Recovery Rate', value: fmtPct(recoveryRate) },
            { label: 'Within Threshold', value: `${withinThreshold.length} / ${n}` },
            { label: 'Fastest Project', value: `${sortedSimple[0]?.project_name} (${fmtYr(sortedSimple[0]?.simplePayback)})` },
            { label: 'Disc. Premium', value: `+${(avgDisc - avgSimple).toFixed(1)} yr` },
          ].map(({ label, value }) => (<div key={label} className="flex justify-between p-2 rounded-lg bg-muted/20"><span className="text-sm">{label}</span><span className="font-mono text-sm font-semibold">{value}</span></div>))}</div></CardContent></Card>
        </div>

        {/* Summary */}
        <Card><CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader><CardContent><div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Payback Assessment</h3></div><div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">Analyzed <strong>{n} investments</strong> totaling {fmt(totalInvestment)}. Average simple payback is <strong>{fmtYr(avgSimple)}</strong>, discounted payback {fmtYr(avgDisc)} at {config.discountRate}% discount rate. The time value of money adds {(avgDisc - avgSimple).toFixed(1)} years to average recovery.</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Recovery:</strong> {recovered.length} of {n} projects ({fmtPct(recoveryRate)}) recover their investment. {withinThreshold.length} meet the {config.maxAcceptablePayback}-year threshold. {exceedThreshold.length > 0 ? `${exceedThreshold.length} exceed or never recover.` : 'All projects within threshold.'}</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>By category:</strong> {catData.map(c => `${c.category}: avg ${fmtYr(c.avgPayback)} (${c.count} projects)`).join(' · ')}.</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Recommendation:</strong> {recoveryRate >= 90 ? 'Strong recovery profile across the portfolio.' : recoveryRate >= 70 ? 'Acceptable recovery rate. Review projects exceeding threshold for restructuring.' : 'Low recovery rate — significant portfolio risk. Prioritize fast-payback projects.'}</p>
        </div></div></CardContent></Card>
      </div>

      <div className="flex justify-center pb-8"><Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top</Button></div>
    </div>
  );
}
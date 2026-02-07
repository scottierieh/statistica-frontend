'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  BookOpen, Download, FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, Lightbulb, ChevronRight, Settings2, Upload, CheckCircle2, AlertTriangle,
  Shield, Zap, Target, BarChart3, Eye, TrendingUp, TrendingDown, DollarSign,
  Activity, ArrowUpRight, Calculator, Clock, Layers
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ComposedChart, Line, ReferenceLine,
  ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RoiRow {
  id: string;
  project_name: string;
  category: string;
  investment: number;      // $K initial cost
  annual_return: number;   // $K annual cash flow / benefit
  roi_pct: number;         // (annual_return / investment) × 100
  npv: number;             // $K net present value
  irr: number;             // internal rate of return %
  payback_years: number;   // investment / annual_return
  time_horizon: number;    // years
  status: string;          // Active / Planned / Completed / Underperforming
  risk_level: string;      // Low / Medium / High
}

interface RoiConfig {
  discountRate: number;    // % for NPV calc
  taxRate: number;         // %
  inflationRate: number;   // %
}

interface RoiPageProps {
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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', planned: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-700', underperforming: 'bg-red-100 text-red-700',
};
const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700',
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  Math.abs(n) >= 1 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}K` :
  `$${n.toFixed(1)}K`;
const fmtPct = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;

const DEFAULT_CONFIG: RoiConfig = { discountRate: 8, taxRate: 25, inflationRate: 3 };


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function calcNPV(investment: number, annualReturn: number, years: number, discountRate: number): number {
  let npv = -investment;
  for (let t = 1; t <= years; t++) npv += annualReturn / Math.pow(1 + discountRate / 100, t);
  return npv;
}

function calcIRR(investment: number, annualReturn: number, years: number): number {
  // Newton's method approximation
  if (annualReturn <= 0 || investment <= 0) return 0;
  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let npv = -investment, dnpv = 0;
    for (let t = 1; t <= years; t++) {
      const df = Math.pow(1 + rate, t);
      npv += annualReturn / df;
      dnpv -= t * annualReturn / (df * (1 + rate));
    }
    if (Math.abs(npv) < 0.01) break;
    if (dnpv === 0) break;
    rate -= npv / dnpv;
    if (rate < -0.99) rate = -0.99;
  }
  return rate * 100;
}

function parseRoiData(rows: Record<string, any>[], config: RoiConfig): RoiRow[] | null {
  if (!rows || rows.length === 0) return null;

  const get = (row: Record<string, any>, ...ss: string[]): string => {
    for (const s of ss) {
      const f = Object.entries(row).find(([k]) => k.toLowerCase().replace(/[\s_-]/g, '').includes(s.replace(/[\s_-]/g, '')));
      if (f && f[1] != null && f[1] !== '') return String(f[1]).trim();
    }
    return '';
  };
  const getN = (row: Record<string, any>, ...ss: string[]): number => {
    const v = get(row, ...ss);
    return parseFloat(v.replace(/[$,%]/g, '')) || 0;
  };

  const items: RoiRow[] = rows.map((row, i) => {
    const name = get(row, 'project_name', 'project', 'name', 'investment_name', 'asset', 'description');
    if (!name) return null;

    const investment = getN(row, 'investment', 'cost', 'initial_cost', 'capex', 'amount', 'total_cost');
    const annualReturn = getN(row, 'annual_return', 'annual_benefit', 'annual_cashflow', 'revenue', 'benefit', 'return', 'annual_income', 'cash_flow');
    if (investment <= 0) return null;

    const horizon = getN(row, 'time_horizon', 'horizon', 'years', 'term', 'duration', 'life') || 5;
    const roiPct = investment > 0 ? (annualReturn / investment) * 100 : 0;
    const payback = annualReturn > 0 ? investment / annualReturn : Infinity;
    const npv = calcNPV(investment, annualReturn, horizon, config.discountRate);
    const irr = calcIRR(investment, annualReturn, horizon);

    const rawStatus = get(row, 'status', 'state', 'phase').toLowerCase();
    let status = 'active';
    if (['planned', 'proposed', 'pending'].some(s => rawStatus.includes(s))) status = 'planned';
    else if (['completed', 'done', 'closed'].some(s => rawStatus.includes(s))) status = 'completed';
    else if (['under', 'poor', 'fail', 'loss'].some(s => rawStatus.includes(s)) || npv < 0) status = 'underperforming';
    else if (['active', 'ongoing', 'live'].some(s => rawStatus.includes(s))) status = 'active';
    else if (npv < 0) status = 'underperforming';

    const rawRisk = get(row, 'risk_level', 'risk', 'risk_rating').toLowerCase();
    let risk = 'medium';
    if (['low', 'safe', 'minimal'].some(s => rawRisk.includes(s))) risk = 'low';
    else if (['high', 'critical', 'significant'].some(s => rawRisk.includes(s))) risk = 'high';
    else if (roiPct < 5 || npv < 0) risk = 'high';
    else if (roiPct > 25) risk = 'low';

    const category = get(row, 'category', 'type', 'asset_class', 'sector') || 'Other';

    return {
      id: get(row, 'id', 'project_id') || `ROI${String(i + 1).padStart(3, '0')}`,
      project_name: name, category, investment, annual_return: annualReturn,
      roi_pct: roiPct, npv, irr, payback_years: payback, time_horizon: horizon,
      status, risk_level: risk,
    };
  }).filter(Boolean) as RoiRow[];

  return items.length > 0 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `id,project_name,category,investment,annual_return,time_horizon,status,risk_level
ROI01,ERP System Overhaul,Technology,2500,625,5,Active,Medium
ROI02,Manufacturing Line B,Equipment,4200,1260,7,Active,Low
ROI03,Cloud Migration,Technology,1100,385,4,Active,Low
ROI04,Warehouse Automation,Equipment,2800,980,6,Active,Low
ROI05,Solar Panel Array,Sustainability,950,190,10,Active,Low
ROI06,AI Analytics Platform,Technology,750,338,4,Active,Medium
ROI07,CRM Platform,Technology,680,204,5,Active,Medium
ROI08,R&D Lab Equipment,Equipment,1500,525,5,Active,Medium
ROI09,Fleet Electrification,Vehicles,1200,240,8,Planned,Medium
ROI10,Office Renovation,Facilities,1800,180,10,Completed,Low
ROI11,Mobile App v2,Technology,480,192,3,Active,Medium
ROI12,Supply Chain Software,Technology,340,136,4,Planned,Medium
ROI13,Quality Testing Lab,Equipment,890,267,5,Active,Low
ROI14,Employee Training Center,Facilities,560,112,7,Active,Medium
ROI15,Delivery Drones Pilot,Innovation,380,190,3,Planned,High
ROI16,Marketing Automation,Technology,290,145,3,Active,Low
ROI17,Security System,Facilities,420,63,8,Completed,Low
ROI18,Parking Structure,Facilities,2200,132,15,Planned,Low
ROI19,Production Robots,Equipment,3200,1120,6,Planned,Medium
ROI20,Data Center Expansion,Technology,3500,875,5,Active,High`;

function buildDefaultRoi(config: RoiConfig): RoiRow[] {
  const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true });
  return parseRoiData(result.data as Record<string, any>[], config) || [];
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "ROI (Return on Investment)": "Annual Return ÷ Investment × 100. Simple measure of investment efficiency.",
  "NPV (Net Present Value)": "Sum of discounted future cash flows minus initial investment. Positive = value-creating.",
  "IRR (Internal Rate of Return)": "Discount rate at which NPV = 0. Compare to cost of capital: IRR > WACC = good.",
  "Payback Period": "Investment ÷ Annual Return. Years to recover the initial investment.",
  "Discount Rate": "Rate used to calculate present value of future cash flows. Reflects opportunity cost.",
  "Time Horizon": "Number of years over which returns are projected.",
  "Risk-Adjusted Return": "Return considering the probability of different outcomes.",
  "Hurdle Rate": "Minimum acceptable return. Projects below this should be reconsidered.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[80vh]"><DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />ROI Glossary</DialogTitle><DialogDescription>Key terms</DialogDescription></DialogHeader><ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea></DialogContent></Dialog>
);


// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const RoiGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between"><div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">ROI Analysis Guide</h2></div><Button variant="ghost" size="sm" onClick={onClose}>✕</Button></div>
      <div className="p-6 space-y-8">
        <div><h3 className="font-semibold text-primary mb-2">What is ROI Analysis?</h3><p className="text-sm text-muted-foreground">ROI analysis evaluates the profitability and efficiency of investments. Upload project data and the tool calculates ROI %, NPV, IRR, and payback period for each investment, ranks them, identifies underperformers, and produces an investment portfolio report.</p></div>
        <div><h3 className="font-semibold text-primary mb-3">Analysis Process</h3><div className="space-y-2">{[
          { step: '1', title: 'Upload Investments', desc: 'CSV with project name, investment cost, and annual return/benefit.' },
          { step: '2', title: 'Configure Rates', desc: 'Set discount rate, tax rate, inflation for NPV and real-return calculations.' },
          { step: '3', title: 'Compute Metrics', desc: 'ROI%, NPV, IRR, payback calculated. Projects ranked by value creation.' },
          { step: '4', title: 'Portfolio Analysis', desc: 'Category allocation, risk distribution, efficiency frontier.' },
          { step: '5', title: 'Identify Opportunities', desc: 'Underperformers flagged, reallocation suggestions, optimization.' },
          { step: '6', title: 'Report', desc: 'Key Findings, charts, exportable report.' },
        ].map(({ step, title, desc }) => (<div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"><div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div><div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div></div>))}</div></div>
        <div><h3 className="font-semibold text-primary mb-3">Key Formulas</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Good</th><th className="p-2 text-left">Caution</th></tr></thead><tbody>{[
          ['ROI %', 'Annual Return ÷ Investment', '> 20%', '< 8%'],
          ['NPV', 'Σ CF/(1+r)^t − I₀', 'Positive', 'Negative'],
          ['IRR', 'Rate where NPV = 0', '> Discount Rate', '< WACC'],
          ['Payback', 'Investment ÷ Annual Return', '< 3 years', '> 5 years'],
        ].map(([m, f, g, c], i) => (<tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{m}</td><td className="p-2 border-r font-mono text-muted-foreground">{f}</td><td className="p-2 border-r text-green-600">{g}</td><td className="p-2 text-red-500">{c}</td></tr>))}</tbody></table></div></div>
        <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5"><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4><ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>• <strong>NPV {'>'} 0</strong> means the investment creates value above the required return.</li>
          <li>• Compare IRR to your <strong>cost of capital</strong> — IRR {'>'} WACC = proceed.</li>
          <li>• Short payback {'<'} 3 years reduces risk. Long payback increases uncertainty.</li>
          <li>• High ROI + Low Risk = best investments. Flag High Risk + Low ROI for review.</li>
          <li>• All amounts in <strong>$K</strong>. Returns/risks auto-classified if not in CSV.</li>
        </ul></div>
      </div>
    </div></div>);
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between"><div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CSV Format Guide — Investment Data</h2></div><Button variant="ghost" size="sm" onClick={onClose}>✕</Button></div>
      <div className="p-6 space-y-6">
        <p className="text-sm text-muted-foreground">Upload CSV with investment projects. Amounts in <strong>$K</strong>. NPV, IRR, and payback auto-calculated.</p>
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-1.5">project_name</th><th className="p-1.5">category</th><th className="p-1.5 text-right">investment</th><th className="p-1.5 text-right">annual_return</th><th className="p-1.5 text-right">time_horizon</th><th className="p-1.5">status</th><th className="p-1.5">risk_level</th></tr></thead><tbody>{[
          ['ERP Overhaul', 'Technology', '2500', '625', '5', 'Active', 'Medium'],
          ['Mfg Line B', 'Equipment', '4200', '1260', '7', 'Active', 'Low'],
          ['Cloud Migration', 'Technology', '1100', '385', '4', 'Active', 'Low'],
        ].map((row, i) => (<tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>{row.map((c, j) => <td key={j} className={`p-1.5 ${[2,3,4].includes(j) ? 'text-right font-mono' : ''}`}>{c}</td>)}</tr>))}</tbody></table></div>
        <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Badge className="bg-primary text-primary-foreground text-xs">Required</Badge> Minimum</h4><div className="grid grid-cols-3 gap-2">{['project_name', 'investment', 'annual_return'].map(col => (<div key={col} className="p-2 rounded border bg-primary/5 text-center"><span className="font-mono text-xs font-semibold">{col}</span></div>))}</div></div>
        <div><h4 className="font-semibold text-sm mb-2">All Columns</h4><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{[
          { name: 'project_name', desc: 'Investment / project name' },
          { name: 'category', desc: 'Technology, Equipment, Facilities, etc.' },
          { name: 'investment', desc: 'Initial cost in $K' },
          { name: 'annual_return', desc: 'Annual benefit / cash flow in $K' },
          { name: 'time_horizon', desc: 'Years (default 5)' },
          { name: 'status', desc: 'Active / Planned / Completed' },
          { name: 'risk_level', desc: 'Low / Medium / High (auto-derived)' },
        ].map(({ name, desc }) => (<div key={name} className="p-2 rounded border bg-muted/20"><span className="font-mono text-xs font-semibold">{name}</span><p className="text-xs text-muted-foreground mt-0.5">{desc}</p></div>))}</div></div>
        <div className="flex justify-center"><Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_roi_data.csv'; a.click(); }}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button></div>
      </div>
    </div></div>);
};


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({ onStartWithData, onStartSample, onUpload, onFormatGuide, uploadedCount, parseError }: {
  onStartWithData: () => void; onStartSample: () => void; onUpload: (f: File) => void; onFormatGuide: () => void; uploadedCount: number; parseError: string | null;
}) => {
  const hasData = uploadedCount > 0;
  return (
    <div className="flex flex-1 items-center justify-center p-6"><Card className="w-full max-w-4xl">
      <CardHeader className="text-center"><div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><ArrowUpRight className="w-8 h-8 text-primary" /></div></div><CardTitle className="font-headline text-3xl">ROI Analysis</CardTitle><CardDescription className="text-base mt-2">Calculate the Return on Investment for projects and assets</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">{[
          { icon: Calculator, title: 'ROI & NPV', desc: 'Return on investment, net present value, and IRR for every project' },
          { icon: Clock, title: 'Payback Analysis', desc: 'Time to recover investment with ranking and comparisons' },
          { icon: Target, title: 'Portfolio Optimization', desc: 'Identify top performers, underperformers, and reallocation opportunities' },
        ].map(({ icon: Icon, title, desc }) => (<Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>))}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-2 transition-all ${hasData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`} onClick={() => { if (!hasData) document.getElementById('roi-csv-upload')?.click(); }}>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload Investment Data</CardTitle><CardDescription className="text-xs">CSV with project costs & returns</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              {hasData ? (<><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Investment data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('roi-csv-reup')?.click()}>Upload different file<input id="roi-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} /></Button></>) : (<><p className="text-sm text-muted-foreground">Upload CSV with project costs and annual returns.</p><div className="bg-muted/50 rounded-lg p-3 text-xs font-mono"><p className="text-muted-foreground mb-1">Required:</p><p>project_name | investment | annual_return</p></div><Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); onFormatGuide(); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>{parseError && (<div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>)}</>)}
              <input id="roi-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><ArrowUpRight className="w-5 h-5" /></div><div><CardTitle className="text-base">Sample Portfolio</CardTitle><CardDescription className="text-xs">20 investments, 6 categories</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Diversified investment portfolio: Technology, Equipment, Facilities, Vehicles, Sustainability, Innovation.</p><div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">{['20 investments', '6 categories', 'NPV & IRR calc', 'Payback ranking'].map(f => (<div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>))}</div><Button onClick={onStartSample} className="w-full" size="lg"><ArrowUpRight className="w-4 h-4 mr-2" />Load Sample Portfolio</Button></CardContent>
          </Card>
        </div>
      </CardContent>
    </Card></div>);
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function RoiAnalysisPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: RoiPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [projects, setProjects] = useState<RoiRow[]>([]);
  const [config, setConfig] = useState<RoiConfig>(DEFAULT_CONFIG);
  const [pendingProjects, setPendingProjects] = useState<RoiRow[]>(() => {
    if (data && data.length > 0) { const p = parseRoiData(data, DEFAULT_CONFIG); if (p && p.length > 0) return p; }
    return [];
  });
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => { if (data && data.length > 0) { const parsed = parseRoiData(data, config); if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); } } }, [data, config]);

  // Recalculate when config changes
  useEffect(() => {
    if (projects.length > 0) {
      setProjects(prev => prev.map(p => {
        const npv = calcNPV(p.investment, p.annual_return, p.time_horizon, config.discountRate);
        const irr = calcIRR(p.investment, p.annual_return, p.time_horizon);
        return { ...p, npv, irr, status: npv < 0 && p.status === 'active' ? 'underperforming' : p.status };
      }));
    }
  }, [config.discountRate]);

  const handleFileUpload = useCallback((file: File) => {
    setParseError(null);
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (result) => {
      const parsed = parseRoiData(result.data as Record<string, any>[], config);
      if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); toast({ title: 'Imported', description: `${parsed.length} investments detected.` }); }
      else { const cols = Object.keys((result.data as any[])[0] || {}).join(', '); setParseError(`Could not parse. Columns: [${cols}].`); }
    }, error: () => setParseError('Failed to read CSV.') });
  }, [toast, config]);

  const handleStartWithData = useCallback(() => { if (pendingProjects.length > 0) { setProjects(pendingProjects); setShowIntro(false); } }, [pendingProjects]);
  const handleLoadSample = useCallback(() => { setProjects(buildDefaultRoi(config)); setShowIntro(false); }, [config]);

  // Analytics
  const n = projects.length;
  const totalInvestment = useMemo(() => projects.reduce((s, p) => s + p.investment, 0), [projects]);
  const totalAnnualReturn = useMemo(() => projects.reduce((s, p) => s + p.annual_return, 0), [projects]);
  const totalNPV = useMemo(() => projects.reduce((s, p) => s + p.npv, 0), [projects]);
  const waROI = totalInvestment > 0 ? (totalAnnualReturn / totalInvestment) * 100 : 0;
  const waIRR = useMemo(() => totalInvestment > 0 ? projects.reduce((s, p) => s + p.irr * p.investment, 0) / totalInvestment : 0, [projects, totalInvestment]);
  const avgPayback = useMemo(() => { const finite = projects.filter(p => isFinite(p.payback_years)); return finite.length > 0 ? finite.reduce((s, p) => s + p.payback_years, 0) / finite.length : 0; }, [projects]);

  const sortedByNPV = useMemo(() => [...projects].sort((a, b) => b.npv - a.npv), [projects]);
  const sortedByROI = useMemo(() => [...projects].sort((a, b) => b.roi_pct - a.roi_pct), [projects]);
  const underperformers = useMemo(() => projects.filter(p => p.npv < 0), [projects]);
  const positiveNPV = useMemo(() => projects.filter(p => p.npv >= 0), [projects]);

  const catData = useMemo(() => {
    const m: Record<string, { investment: number; return: number; count: number; npv: number }> = {};
    projects.forEach(p => { if (!m[p.category]) m[p.category] = { investment: 0, return: 0, count: 0, npv: 0 }; m[p.category].investment += p.investment; m[p.category].return += p.annual_return; m[p.category].count++; m[p.category].npv += p.npv; });
    return Object.entries(m).map(([cat, d]) => ({ category: cat, ...d, roi: d.investment > 0 ? (d.return / d.investment) * 100 : 0 })).sort((a, b) => b.investment - a.investment);
  }, [projects]);

  const riskCounts = useMemo(() => { const c: Record<string, number> = {}; projects.forEach(p => { c[p.risk_level] = (c[p.risk_level] || 0) + 1; }); return c; }, [projects]);

  // Cumulative NPV curve (sorted best to worst)
  const cumulativeNPV = useMemo(() => {
    let cum = 0;
    return sortedByNPV.map((p, i) => { cum += p.npv; return { name: p.project_name.slice(0, 15), npv: p.npv, cumulative: cum, idx: i + 1 }; });
  }, [sortedByNPV]);

  // Payback distribution
  const paybackBuckets = useMemo(() => {
    const buckets = ['< 2yr', '2–3yr', '3–5yr', '5–7yr', '> 7yr'];
    const limits = [2, 3, 5, 7, Infinity];
    return buckets.map((label, i) => {
      const lo = i === 0 ? 0 : limits[i - 1];
      const hi = limits[i];
      const group = projects.filter(p => p.payback_years >= lo && p.payback_years < hi);
      return { bucket: label, count: group.length, investment: group.reduce((s, p) => s + p.investment, 0) };
    });
  }, [projects]);

  // Export
  const handleDownloadPNG = useCallback(async () => { if (!resultsRef.current) return; setIsDownloading(true); try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = 'ROI_Analysis_Report.png'; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); } }, []);
  const handleDownloadCSV = useCallback(() => {
    const rows = sortedByNPV.map(p => ({ ID: p.id, Project: p.project_name, Category: p.category, 'Investment($K)': p.investment, 'Annual Return($K)': p.annual_return, 'ROI%': p.roi_pct.toFixed(1), 'NPV($K)': p.npv.toFixed(0), 'IRR%': p.irr.toFixed(1), 'Payback(yr)': isFinite(p.payback_years) ? p.payback_years.toFixed(1) : 'N/A', Status: p.status, Risk: p.risk_level }));
    let csv = `ROI ANALYSIS REPORT\n${new Date().toLocaleDateString()}\nDiscount Rate: ${config.discountRate}% | ${n} Projects | Total Investment ${fmt(totalInvestment)}\n\n`; csv += Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'ROI_Analysis_Report.csv'; link.click();
  }, [sortedByNPV, n, totalInvestment, config.discountRate]);

  if (showIntro) return (<><IntroPage onStartWithData={handleStartWithData} onStartSample={handleLoadSample} onUpload={handleFileUpload} onFormatGuide={() => setFormatGuideOpen(true)} uploadedCount={pendingProjects.length} parseError={parseError} /><FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} /></>);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">ROI Analysis</h1><p className="text-muted-foreground mt-1">{n} investments | {fmt(totalInvestment)} total | Discount {config.discountRate}%</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div></div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <RoiGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />

      {/* Config */}
      <Card className="border-0 shadow-lg"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Analysis Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-4">{[
        { label: 'Discount Rate (%)', key: 'discountRate' },
        { label: 'Tax Rate (%)', key: 'taxRate' },
        { label: 'Inflation (%)', key: 'inflationRate' },
      ].map(({ label, key }) => (<div key={key}><label className="text-xs text-muted-foreground">{label}</label><input type="number" value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm" /></div>))}</div></CardContent></Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[
        { label: 'Portfolio ROI', value: fmtPct(waROI), sub: `${fmt(totalAnnualReturn)}/yr return` },
        { label: 'Total NPV', value: fmt(totalNPV), sub: `@ ${config.discountRate}% discount`, alert: totalNPV < 0 },
        { label: 'Wtd Avg IRR', value: fmtPct(waIRR), sub: `vs ${config.discountRate}% hurdle`, alert: waIRR < config.discountRate },
        { label: 'Avg Payback', value: `${avgPayback.toFixed(1)} yr`, sub: `${underperformers.length} underperforming`, alert: underperformers.length > 0 },
      ].map(({ label, value, sub, alert }) => (<Card key={label} className={`border-0 shadow-lg ${alert ? 'ring-2 ring-red-500/20' : ''}`}><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{sub}</p></CardContent></Card>))}</div>

      {/* Investment Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div><div><CardTitle>Investment Portfolio</CardTitle><CardDescription>Sorted by NPV (highest first)</CardDescription></div></div><Button variant="outline" size="sm" onClick={() => document.getElementById('roi-csv-reupload')?.click()}><Upload className="w-4 h-4 mr-1" />Re-upload<input id="roi-csv-reupload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} /></Button></div></CardHeader>
        <CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="min-w-[140px]">Project</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Investment</TableHead><TableHead className="text-right">Return/yr</TableHead><TableHead className="text-right">ROI %</TableHead><TableHead className="text-right">NPV</TableHead><TableHead className="text-right">IRR</TableHead><TableHead className="text-right">Payback</TableHead><TableHead>Risk</TableHead></TableRow></TableHeader>
          <TableBody>{sortedByNPV.map(p => (<TableRow key={p.id} className={p.npv < 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}><TableCell className="font-medium text-sm">{p.project_name}</TableCell><TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell><TableCell className="text-right font-mono text-xs">{fmt(p.investment)}</TableCell><TableCell className="text-right font-mono text-xs">{fmt(p.annual_return)}</TableCell><TableCell className="text-right font-mono text-xs font-bold">{fmtPct(p.roi_pct)}</TableCell><TableCell className={`text-right font-mono text-xs font-bold ${p.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.npv)}</TableCell><TableCell className={`text-right font-mono text-xs ${p.irr >= config.discountRate ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(p.irr)}</TableCell><TableCell className="text-right font-mono text-xs">{isFinite(p.payback_years) ? `${p.payback_years.toFixed(1)}yr` : '—'}</TableCell><TableCell><Badge className={`text-xs capitalize ${RISK_COLORS[p.risk_level] || ''}`}>{p.risk_level}</Badge></TableCell></TableRow>))}</TableBody></Table></div></CardContent>
      </Card>

      {/* Report */}
      <div className="flex justify-between items-center"><h2 className="text-lg font-semibold">Report</h2><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">ROI Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {n} Investments | Discount Rate {config.discountRate}%</p></div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Invested', value: fmt(totalInvestment), sub: `${n} projects`, color: 'text-primary' },
            { label: 'Portfolio ROI', value: fmtPct(waROI), sub: `${fmt(totalAnnualReturn)}/yr return`, color: waROI >= 20 ? 'text-green-600' : waROI >= 10 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Total NPV', value: fmt(totalNPV), sub: `${positiveNPV.length} positive / ${underperformers.length} negative`, color: totalNPV >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Wtd Avg IRR', value: fmtPct(waIRR), sub: waIRR >= config.discountRate ? 'Exceeds hurdle' : 'Below hurdle', color: waIRR >= config.discountRate ? 'text-green-600' : 'text-red-600' },
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

        {/* Project Detail Table */}
        <Card>
          <CardHeader><CardTitle>Investment Performance Detail</CardTitle><CardDescription>NPV-ranked projects with ROI, IRR, payback, and risk</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Project</th>
              <th className="p-2 text-left font-semibold">Category</th>
              <th className="p-2 text-right font-semibold">Investment</th>
              <th className="p-2 text-right font-semibold">Return/yr</th>
              <th className="p-2 text-right font-semibold">ROI %</th>
              <th className="p-2 text-right font-semibold">NPV</th>
              <th className="p-2 text-right font-semibold">IRR</th>
              <th className="p-2 text-right font-semibold">Payback</th>
              <th className="p-2 text-center font-semibold">Risk</th>
            </tr></thead>
            <tbody>{sortedByNPV.map((p, i) => (
              <tr key={p.id} className={`border-b ${p.npv < 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.palette[i % COLORS.palette.length] }} />{p.project_name}</div></td>
                <td className="p-2 text-muted-foreground">{p.category}</td>
                <td className="p-2 text-right font-mono">{fmt(p.investment)}</td>
                <td className="p-2 text-right font-mono">{fmt(p.annual_return)}</td>
                <td className={`p-2 text-right font-mono font-semibold ${p.roi_pct >= 20 ? 'text-green-600' : p.roi_pct >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(p.roi_pct)}</td>
                <td className={`p-2 text-right font-mono font-semibold ${p.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.npv)}</td>
                <td className={`p-2 text-right font-mono ${p.irr >= config.discountRate ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(p.irr)}</td>
                <td className="p-2 text-right font-mono">{isFinite(p.payback_years) ? `${p.payback_years.toFixed(1)}yr` : '—'}</td>
                <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${RISK_COLORS[p.risk_level] || ''}`}>{p.risk_level}</span></td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total / Wtd Avg</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{fmt(totalInvestment)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalAnnualReturn)}</td>
              <td className="p-2 text-right font-mono">{fmtPct(waROI)}</td>
              <td className={`p-2 text-right font-mono font-bold ${totalNPV >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalNPV)}</td>
              <td className="p-2 text-right font-mono">{fmtPct(waIRR)}</td>
              <td className="p-2 text-right font-mono">{avgPayback.toFixed(1)}yr</td>
              <td className="p-2" />
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div><div><CardTitle>Key Findings</CardTitle><CardDescription>Investment performance insights</CardDescription></div></div></CardHeader>
          <CardContent><div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">{(() => {
              const items: string[] = [];
              items.push(`Portfolio: ${n} investments, ${fmt(totalInvestment)} deployed, generating ${fmt(totalAnnualReturn)}/year. Portfolio ROI: ${fmtPct(waROI)}.`);
              items.push(`NPV (@ ${config.discountRate}% discount): Total ${fmt(totalNPV)}. ${positiveNPV.length} positive-NPV projects (${fmtPct(positiveNPV.length / n * 100)}), ${underperformers.length} negative-NPV.`);
              items.push(`IRR: Weighted-average ${fmtPct(waIRR)} vs ${config.discountRate}% hurdle. ${waIRR >= config.discountRate ? 'Portfolio exceeds cost of capital.' : 'Portfolio IRR below hurdle rate.'}`);
              const top3 = sortedByNPV.slice(0, 3);
              items.push(`Top 3 value creators: ${top3.map(p => `"${p.project_name}" (NPV ${fmt(p.npv)}, ROI ${fmtPct(p.roi_pct)})`).join(', ')}.`);
              if (underperformers.length > 0) items.push(`Underperformers: ${underperformers.map(p => `"${p.project_name}" (NPV ${fmt(p.npv)})`).join(', ')}. Consider divestment or restructuring.`);
              else items.push('All investments have positive NPV at current discount rate.');
              items.push(`Payback: Average ${avgPayback.toFixed(1)} years. Fastest: "${sortedByROI[0]?.project_name}" (${sortedByROI[0]?.payback_years.toFixed(1)}yr). Slowest: "${[...projects].sort((a, b) => b.payback_years - a.payback_years)[0]?.project_name}".`);
              const topCat = catData[0];
              if (topCat && topCat.investment / totalInvestment > 0.3) items.push(`Category concentration: "${topCat.category}" is ${fmtPct(topCat.investment / totalInvestment * 100)} of investment (${topCat.count} projects, ROI ${fmtPct(topCat.roi)}).`);
              const highRiskCount = riskCounts['high'] || 0;
              if (highRiskCount > 0) items.push(`${highRiskCount} high-risk investments totaling ${fmt(projects.filter(p => p.risk_level === 'high').reduce((s, p) => s + p.investment, 0))}.`);
              return items.map((text, i) => (<div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>));
            })()}</div>
          </div></CardContent>
        </Card>

        {/* NPV Ranking */}
        <Card><CardHeader><CardTitle>NPV Ranking — Value Creation by Project</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cumulativeNPV}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} /><YAxis tickFormatter={v => `$${v}K`} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><Legend /><Bar dataKey="npv" name="Individual NPV" radius={[4, 4, 0, 0]}>{cumulativeNPV.map((d, i) => <Cell key={i} fill={d.npv >= 0 ? COLORS.secondary : COLORS.softRed} />)}</Bar><Line dataKey="cumulative" name="Cumulative NPV" type="monotone" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} /><ReferenceLine y={0} stroke="#000" strokeWidth={1} /></ComposedChart></ResponsiveContainer></div></CardContent></Card>

        {/* ROI vs Investment Scatter */}
        <Card><CardHeader><CardTitle>ROI % vs Investment Size — Bubble = NPV</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="investment" name="Investment" tickFormatter={v => `$${v}K`} type="number" /><YAxis dataKey="roi_pct" name="ROI %" tickFormatter={v => `${v}%`} type="number" /><ZAxis dataKey="npv" range={[40, 400]} name="NPV" /><Tooltip formatter={(v: any, name: string) => [name === 'ROI %' ? `${Number(v).toFixed(1)}%` : `$${Number(v).toLocaleString()}K`, name]} /><ReferenceLine y={config.discountRate} stroke="#dc2626" strokeDasharray="5 5" label={{ value: `Hurdle ${config.discountRate}%`, position: 'right', fontSize: 10, fill: '#dc2626' }} /><Scatter data={projects.map(p => ({ ...p, name: p.project_name }))} fill={COLORS.primary} fillOpacity={0.6} /></ScatterChart></ResponsiveContainer></div><div className="flex justify-center mt-2 text-xs text-muted-foreground"><span>Above red line = exceeds hurdle rate. Bigger bubble = higher NPV.</span></div></CardContent></Card>

        {/* Category ROI */}
        <Card><CardHeader><CardTitle>ROI by Category</CardTitle></CardHeader><CardContent><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={catData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="category" tick={{ fontSize: 11 }} /><YAxis yAxisId="left" tickFormatter={v => `$${v}K`} /><YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="investment" name="Investment ($K)" fill={COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.7} /><Bar yAxisId="left" dataKey="return" name="Annual Return ($K)" fill={COLORS.secondary} radius={[4, 4, 0, 0]} opacity={0.7} /><Line yAxisId="right" dataKey="roi" name="ROI %" type="monotone" stroke={COLORS.softRed} strokeWidth={2} dot={{ r: 4 }} /></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* Payback Distribution */}
        <Card><CardHeader><CardTitle>Payback Period Distribution</CardTitle></CardHeader><CardContent><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={paybackBuckets}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="bucket" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${v}K`} /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="count" name="# Projects" fill={COLORS.primary} radius={[4, 4, 0, 0]} /><Bar yAxisId="right" dataKey="investment" name="Investment ($K)" fill={COLORS.secondary} radius={[4, 4, 0, 0]} opacity={0.7} /></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* Risk + Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Risk Distribution</CardTitle></CardHeader><CardContent><div className="space-y-2">{['low', 'medium', 'high'].filter(r => riskCounts[r]).map(risk => { const group = projects.filter(p => p.risk_level === risk); const inv = group.reduce((s, p) => s + p.investment, 0); return (<div key={risk} className="flex items-center justify-between p-2 rounded-lg bg-muted/20"><Badge className={`text-xs capitalize ${RISK_COLORS[risk]}`}>{risk}</Badge><div className="flex items-center gap-2"><div className="w-24 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(riskCounts[risk] / n) * 100}%` }} /></div><span className="font-mono text-xs">{riskCounts[risk]} ({fmt(inv)})</span></div></div>); })}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Portfolio Metrics</CardTitle></CardHeader><CardContent><div className="space-y-2">{[
            { label: 'Total Investment', value: fmt(totalInvestment) },
            { label: 'Total Annual Return', value: fmt(totalAnnualReturn) },
            { label: 'Portfolio ROI', value: fmtPct(waROI) },
            { label: 'Total NPV', value: fmt(totalNPV) },
            { label: 'Wtd Avg IRR', value: fmtPct(waIRR) },
            { label: 'Avg Payback', value: `${avgPayback.toFixed(1)} years` },
            { label: 'Positive NPV Projects', value: `${positiveNPV.length} / ${n}` },
          ].map(({ label, value }) => (<div key={label} className="flex justify-between p-2 rounded-lg bg-muted/20"><span className="text-sm">{label}</span><span className="font-mono text-sm font-semibold">{value}</span></div>))}</div></CardContent></Card>
        </div>

        {/* Summary */}
        <Card><CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader><CardContent><div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">ROI Summary</h3></div><div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">The investment portfolio comprises <strong>{n} projects</strong> with {fmt(totalInvestment)} deployed capital, generating {fmt(totalAnnualReturn)} in annual returns (portfolio ROI {fmtPct(waROI)}).</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Value creation:</strong> At a {config.discountRate}% discount rate, total NPV is {fmt(totalNPV)}. {positiveNPV.length} of {n} investments have positive NPV. Weighted IRR of {fmtPct(waIRR)} {waIRR >= config.discountRate ? 'exceeds' : 'falls below'} the hurdle rate.</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Payback:</strong> Average {avgPayback.toFixed(1)} years. {paybackBuckets[0].count + paybackBuckets[1].count} projects recover within 3 years ({fmtPct((paybackBuckets[0].count + paybackBuckets[1].count) / n * 100)}).</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Risk:</strong> {riskCounts['low'] || 0} low, {riskCounts['medium'] || 0} medium, {riskCounts['high'] || 0} high risk. {underperformers.length > 0 ? `${underperformers.length} underperforming investments with negative NPV totaling ${fmt(underperformers.reduce((s, p) => s + p.npv, 0))}.` : 'No underperformers at current discount rate.'}</p>
        </div></div></CardContent></Card>
      </div>

      <div className="flex justify-center pb-8"><Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top</Button></div>
    </div>
  );
}

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
  HelpCircle, Lightbulb, ChevronRight, Upload, CheckCircle2, AlertTriangle,
  Shield, Zap, Target, BarChart3, Eye, TrendingUp, DollarSign,
  Activity, Settings2, Building2, Hammer, Clock, ArrowUpRight
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
  ResponsiveContainer, Cell, ComposedChart, Line, PieChart, Pie,
  ReferenceLine, ScatterChart, Scatter, ZAxis
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CapexRow {
  id: string;
  project_name: string;
  category: string;
  department: string;
  budget: number;        // $K
  spent: number;         // $K
  remaining: number;     // $K
  utilization: number;   // 0–1
  status: string;        // Planned / In Progress / Completed / On Hold / Over Budget
  priority: string;      // Critical / High / Medium / Low
  roi: number;           // expected ROI %
  start_quarter: string; // Q1, Q2, Q3, Q4
}

interface CapexPageProps {
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
  planned: 'bg-blue-100 text-blue-700', 'in progress': 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700', 'on hold': 'bg-gray-100 text-gray-700',
  'over budget': 'bg-red-100 text-red-700', cancelled: 'bg-red-50 text-red-500',
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white', high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700', low: 'bg-green-100 text-green-700',
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  Math.abs(n) >= 1 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}K` :
  `$${n.toFixed(1)}K`;
const fmtPct = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parseCapexData(rows: Record<string, any>[]): CapexRow[] | null {
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

  const items: CapexRow[] = rows.map((row, i) => {
    const name = get(row, 'project_name', 'project', 'name', 'description', 'item');
    if (!name) return null;

    const budget = getN(row, 'budget', 'total_budget', 'approved', 'capex_budget', 'amount');
    const spent = getN(row, 'spent', 'actual', 'cost_to_date', 'ytd_spend', 'expenditure');
    const remaining = budget > 0 ? budget - spent : 0;
    const utilization = budget > 0 ? spent / budget : 0;

    const rawStatus = get(row, 'status', 'state', 'phase').toLowerCase();
    let status = 'planned';
    if (['in progress', 'active', 'ongoing', 'executing'].some(s => rawStatus.includes(s))) status = 'in progress';
    else if (['completed', 'done', 'finished', 'closed'].some(s => rawStatus.includes(s))) status = 'completed';
    else if (['hold', 'paused', 'deferred', 'delayed'].some(s => rawStatus.includes(s))) status = 'on hold';
    else if (['over', 'exceeded', 'overrun'].some(s => rawStatus.includes(s)) || utilization > 1) status = 'over budget';
    else if (['cancel'].some(s => rawStatus.includes(s))) status = 'cancelled';
    else if (['plan', 'proposed', 'pending', 'approved'].some(s => rawStatus.includes(s))) status = 'planned';
    else if (utilization > 1) status = 'over budget';
    else if (utilization > 0) status = 'in progress';

    const rawPri = get(row, 'priority', 'importance', 'urgency').toLowerCase();
    let priority = 'medium';
    if (['critical', 'urgent', 'p0', 'p1'].some(s => rawPri.includes(s))) priority = 'critical';
    else if (['high', 'p2'].some(s => rawPri.includes(s))) priority = 'high';
    else if (['low', 'p4', 'nice'].some(s => rawPri.includes(s))) priority = 'low';

    let roi = getN(row, 'roi', 'return', 'expected_roi', 'irr');
    if (roi > 1 && roi <= 100) roi = roi; // already %
    else if (roi > 0 && roi <= 1) roi = roi * 100;

    const rawQ = get(row, 'start_quarter', 'quarter', 'start', 'timeline', 'start_date').toUpperCase();
    let startQ = 'Q1';
    if (rawQ.includes('Q2') || rawQ.includes('APR') || rawQ.includes('MAY') || rawQ.includes('JUN')) startQ = 'Q2';
    else if (rawQ.includes('Q3') || rawQ.includes('JUL') || rawQ.includes('AUG') || rawQ.includes('SEP')) startQ = 'Q3';
    else if (rawQ.includes('Q4') || rawQ.includes('OCT') || rawQ.includes('NOV') || rawQ.includes('DEC')) startQ = 'Q4';

    return {
      id: get(row, 'id', 'project_id') || `CX${String(i + 1).padStart(3, '0')}`,
      project_name: name,
      category: get(row, 'category', 'type', 'asset_class', 'capex_type') || 'Other',
      department: get(row, 'department', 'dept', 'division', 'business_unit', 'owner') || 'General',
      budget, spent, remaining, utilization, status, priority, roi, start_quarter: startQ,
    };
  }).filter(Boolean) as CapexRow[];

  return items.length > 0 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `id,project_name,category,department,budget,spent,status,priority,roi,start_quarter
CX01,ERP System Upgrade,Technology,IT,2500,1875,In Progress,Critical,18,Q1
CX02,New Manufacturing Line,Equipment,Operations,4200,420,Planned,High,25,Q3
CX03,Office Renovation HQ,Facilities,Admin,1800,1620,In Progress,Medium,8,Q1
CX04,Data Center Expansion,Technology,IT,3500,3850,Over Budget,Critical,22,Q1
CX05,Fleet Replacement (Phase 1),Vehicles,Logistics,1200,1200,Completed,High,12,Q1
CX06,Warehouse Automation,Equipment,Operations,2800,700,In Progress,High,30,Q2
CX07,Solar Panel Installation,Facilities,Sustainability,950,285,In Progress,Medium,15,Q2
CX08,CRM Platform Migration,Technology,Sales,680,68,Planned,Medium,20,Q4
CX09,R&D Lab Equipment,Equipment,R&D,1500,1350,In Progress,Critical,35,Q1
CX10,Security System Upgrade,Facilities,Admin,420,420,Completed,High,10,Q1
CX11,Cloud Infrastructure,Technology,IT,1100,825,In Progress,High,28,Q2
CX12,Production Robot Arms,Equipment,Operations,3200,0,Planned,High,32,Q4
CX13,HVAC Replacement,Facilities,Admin,650,195,In Progress,Medium,5,Q2
CX14,Mobile App Development,Technology,Digital,480,360,In Progress,Medium,24,Q1
CX15,Delivery Drones Pilot,Equipment,Logistics,380,0,On Hold,Low,40,Q3
CX16,Parking Structure,Facilities,Admin,2200,0,Planned,Low,3,Q4
CX17,AI Analytics Platform,Technology,IT,750,450,In Progress,Critical,45,Q2
CX18,Quality Testing Lab,Equipment,R&D,890,800,In Progress,High,18,Q1
CX19,Employee Training Center,Facilities,HR,560,280,In Progress,Medium,12,Q3
CX20,Supply Chain Software,Technology,Operations,340,0,Planned,Medium,22,Q4`;

function buildDefaultCapex(): CapexRow[] {
  const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true });
  return parseCapexData(result.data as Record<string, any>[]) || [];
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Capital Expenditure (CapEx)": "Funds spent to acquire, maintain, or improve long-term assets (equipment, buildings, technology).",
  "Budget Utilization": "Spent ÷ Budget. Shows how much of the approved capital has been deployed.",
  "ROI (Return on Investment)": "Expected return from the investment, typically as annual percentage.",
  "Budget Variance": "(Budget − Spent) ÷ Budget. Negative = over budget. Positive = under budget.",
  "CapEx Intensity": "Total CapEx ÷ Revenue. Measures capital investment relative to business size.",
  "Payback Period": "Time for an investment to generate enough cash flow to recover its cost.",
  "Priority Classification": "Critical (must-do), High (important), Medium (should-do), Low (nice-to-have).",
  "Status": "Planned → In Progress → Completed. On Hold = paused. Over Budget = exceeded allocation.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />CapEx Glossary</DialogTitle><DialogDescription>Key terms</DialogDescription></DialogHeader>
      <ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea>
    </DialogContent>
  </Dialog>
);


// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const CapexGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CapEx Planning Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">
          <div>
            <h3 className="font-semibold text-primary mb-2">What is CapEx Planning?</h3>
            <p className="text-sm text-muted-foreground">Capital expenditure planning involves tracking, prioritizing, and analyzing investments in long-term assets. Upload your CapEx register to visualize budget utilization, category allocation, department spending, ROI analysis, and project status tracking.</p>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Upload CapEx Register', desc: 'CSV with projects, budgets, spending, categories, and priorities.' },
                { step: '2', title: 'Budget Analysis', desc: 'Total budget vs spent, utilization rates, variance by project.' },
                { step: '3', title: 'Category Allocation', desc: 'Technology, Equipment, Facilities, Vehicles — where is capital going?' },
                { step: '4', title: 'Priority & ROI', desc: 'Map spending against priority and expected returns.' },
                { step: '5', title: 'Timeline', desc: 'Quarterly distribution of CapEx commitments.' },
                { step: '6', title: 'Report', desc: 'Key Findings, over-budget alerts, optimization opportunities.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Key Formulas</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Good</th></tr></thead>
                <tbody>
                  {[
                    ['Utilization', 'Spent ÷ Budget', '70–100%'],
                    ['Budget Variance', '(Budget − Spent) ÷ Budget', '> 0%'],
                    ['ROI', 'Annual Return ÷ Investment', '> Cost of Capital'],
                    ['Completion Rate', 'Completed ÷ Total Projects', 'Per plan'],
                    ['Over-Budget Rate', 'Over-Budget ÷ Active', '< 10%'],
                  ].map(([m, f, g], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{m}</td><td className="p-2 border-r font-mono text-muted-foreground">{f}</td><td className="p-2 text-green-600">{g}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Track <strong>budget vs actual</strong> monthly to catch overruns early.</li>
              <li>• Prioritize projects with <strong>highest ROI</strong> and <strong>critical priority</strong>.</li>
              <li>• Category and priority auto-classified from CSV if not explicit.</li>
              <li>• Over-budget projects are auto-flagged when spent exceeds budget.</li>
              <li>• All amounts in <strong>$K</strong>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CSV Format Guide — CapEx Register</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Upload CSV with capital expenditure projects. Amounts in <strong>$K</strong>.</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50"><th className="p-1.5">project_name</th><th className="p-1.5">category</th><th className="p-1.5">department</th><th className="p-1.5 text-right">budget</th><th className="p-1.5 text-right">spent</th><th className="p-1.5">status</th><th className="p-1.5">priority</th><th className="p-1.5 text-right">roi</th></tr></thead>
              <tbody>
                {[['ERP Upgrade', 'Technology', 'IT', '2500', '1875', 'In Progress', 'Critical', '18'],['New Mfg Line', 'Equipment', 'Operations', '4200', '420', 'Planned', 'High', '25'],['Office Reno', 'Facilities', 'Admin', '1800', '1620', 'In Progress', 'Medium', '8']].map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>{row.map((c, j) => <td key={j} className={`p-1.5 ${[3,4,7].includes(j) ? 'text-right font-mono' : ''}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Badge className="bg-primary text-primary-foreground text-xs">Required</Badge> Minimum</h4><div className="grid grid-cols-3 gap-2">{['project_name', 'budget', 'spent'].map(col => (<div key={col} className="p-2 rounded border bg-primary/5 text-center"><span className="font-mono text-xs font-semibold">{col}</span></div>))}</div></div>
          <div><h4 className="font-semibold text-sm mb-2">All Columns</h4><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{[{ name: 'project_name', desc: 'Project / investment name' },{ name: 'category', desc: 'Technology, Equipment, Facilities, Vehicles' },{ name: 'department', desc: 'Business unit / owner' },{ name: 'budget', desc: 'Approved budget in $K' },{ name: 'spent', desc: 'Actual spend to date in $K' },{ name: 'status', desc: 'Planned/In Progress/Completed/On Hold' },{ name: 'priority', desc: 'Critical/High/Medium/Low' },{ name: 'roi', desc: 'Expected ROI %' },{ name: 'start_quarter', desc: 'Q1/Q2/Q3/Q4' }].map(({ name, desc }) => (<div key={name} className="p-2 rounded border bg-muted/20"><span className="font-mono text-xs font-semibold">{name}</span><p className="text-xs text-muted-foreground mt-0.5">{desc}</p></div>))}</div></div>
          <div className="flex justify-center"><Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_capex_register.csv'; a.click(); }}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button></div>
        </div>
      </div>
    </div>
  );
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
      <CardHeader className="text-center"><div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Building2 className="w-8 h-8 text-primary" /></div></div><CardTitle className="font-headline text-3xl">CapEx Planning</CardTitle><CardDescription className="text-base mt-2">Track, prioritize, and analyze capital expenditure investments</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">{[{ icon: DollarSign, title: 'Budget Tracking', desc: 'Total budget vs spend with utilization and variance analysis' },{ icon: BarChart3, title: 'Portfolio Analysis', desc: 'Category allocation, department breakdown, priority mapping' },{ icon: ArrowUpRight, title: 'ROI & Timeline', desc: 'Expected returns, quarterly distribution, optimization' }].map(({ icon: Icon, title, desc }) => (<Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>))}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-2 transition-all ${hasData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`} onClick={() => { if (!hasData) document.getElementById('cx-csv-upload')?.click(); }}>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload CapEx Register</CardTitle><CardDescription className="text-xs">CSV with project data</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3">
              {hasData ? (<><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">CapEx data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('cx-csv-reup')?.click()}>Upload different file<input id="cx-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} /></Button></>) : (<><p className="text-sm text-muted-foreground">Upload CSV with project budgets, spending, and priorities.</p><div className="bg-muted/50 rounded-lg p-3 text-xs font-mono"><p className="text-muted-foreground mb-1">Required:</p><p>project_name | budget | spent</p></div><Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); onFormatGuide(); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>{parseError && (<div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>)}</>)}
              <input id="cx-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Building2 className="w-5 h-5" /></div><div><CardTitle className="text-base">Sample Register</CardTitle><CardDescription className="text-xs">20 projects, 5 categories</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Diversified CapEx portfolio: Technology, Equipment, Facilities, Vehicles across 7 departments.</p><div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">{['20 projects', '5 categories', 'Budget tracking', 'ROI analysis'].map(f => (<div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>))}</div><Button onClick={onStartSample} className="w-full" size="lg"><Building2 className="w-4 h-4 mr-2" />Load Sample Register</Button></CardContent>
          </Card>
        </div>
      </CardContent>
    </Card></div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CapexPlanningPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: CapexPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [projects, setProjects] = useState<CapexRow[]>([]);
  const [pendingProjects, setPendingProjects] = useState<CapexRow[]>(() => {
    if (data && data.length > 0) { const p = parseCapexData(data); if (p && p.length > 0) return p; }
    return [];
  });
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => { if (data && data.length > 0) { const parsed = parseCapexData(data); if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); } } }, [data]);

  const handleFileUpload = useCallback((file: File) => {
    setParseError(null);
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (result) => {
      const parsed = parseCapexData(result.data as Record<string, any>[]);
      if (parsed && parsed.length > 0) { setPendingProjects(parsed); setParseError(null); toast({ title: 'Imported', description: `${parsed.length} projects detected.` }); }
      else { const cols = Object.keys((result.data as any[])[0] || {}).join(', '); setParseError(`Could not parse. Columns: [${cols}].`); }
    }, error: () => setParseError('Failed to read CSV.') });
  }, [toast]);

  const handleStartWithData = useCallback(() => { if (pendingProjects.length > 0) { setProjects(pendingProjects); setShowIntro(false); } }, [pendingProjects]);
  const handleLoadSample = useCallback(() => { setProjects(buildDefaultCapex()); setShowIntro(false); }, []);

  // Analytics
  const n = projects.length;
  const totalBudget = useMemo(() => projects.reduce((s, p) => s + p.budget, 0), [projects]);
  const totalSpent = useMemo(() => projects.reduce((s, p) => s + p.spent, 0), [projects]);
  const totalRemaining = totalBudget - totalSpent;
  const avgUtilization = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const overBudget = useMemo(() => projects.filter(p => p.utilization > 1), [projects]);
  const waROI = useMemo(() => totalBudget > 0 ? projects.reduce((s, p) => s + p.roi * p.budget, 0) / totalBudget : 0, [projects, totalBudget]);

  const sorted = useMemo(() => [...projects].sort((a, b) => b.budget - a.budget), [projects]);

  const catData = useMemo(() => {
    const m: Record<string, { budget: number; spent: number; count: number }> = {};
    projects.forEach(p => { if (!m[p.category]) m[p.category] = { budget: 0, spent: 0, count: 0 }; m[p.category].budget += p.budget; m[p.category].spent += p.spent; m[p.category].count++; });
    return Object.entries(m).map(([cat, d]) => ({ category: cat, ...d })).sort((a, b) => b.budget - a.budget);
  }, [projects]);

  const deptData = useMemo(() => {
    const m: Record<string, { budget: number; spent: number; count: number }> = {};
    projects.forEach(p => { if (!m[p.department]) m[p.department] = { budget: 0, spent: 0, count: 0 }; m[p.department].budget += p.budget; m[p.department].spent += p.spent; m[p.department].count++; });
    return Object.entries(m).map(([dept, d]) => ({ department: dept, ...d })).sort((a, b) => b.budget - a.budget);
  }, [projects]);

  const statusCounts = useMemo(() => { const c: Record<string, number> = {}; projects.forEach(p => { c[p.status] = (c[p.status] || 0) + 1; }); return c; }, [projects]);
  const priorityCounts = useMemo(() => { const c: Record<string, number> = {}; projects.forEach(p => { c[p.priority] = (c[p.priority] || 0) + 1; }); return c; }, [projects]);

  const quarterData = useMemo(() => ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
    const group = projects.filter(p => p.start_quarter === q);
    return { quarter: q, budget: group.reduce((s, p) => s + p.budget, 0), spent: group.reduce((s, p) => s + p.spent, 0), count: group.length };
  }), [projects]);

  // Export
  const handleDownloadPNG = useCallback(async () => { if (!resultsRef.current) return; setIsDownloading(true); try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = 'CapEx_Report.png'; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); } }, []);
  const handleDownloadCSV = useCallback(() => { const rows = sorted.map(p => ({ ID: p.id, Project: p.project_name, Category: p.category, Dept: p.department, 'Budget($K)': p.budget, 'Spent($K)': p.spent, Utilization: fmtPct(p.utilization * 100), Status: p.status, Priority: p.priority, 'ROI%': p.roi, Quarter: p.start_quarter })); let csv = `CAPEX PLANNING REPORT\n${new Date().toLocaleDateString()}\n${n} Projects | Budget ${fmt(totalBudget)} | Spent ${fmt(totalSpent)}\n\n`; csv += Papa.unparse(rows); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'CapEx_Report.csv'; link.click(); }, [sorted, n, totalBudget, totalSpent]);

  if (showIntro) return (<><IntroPage onStartWithData={handleStartWithData} onStartSample={handleLoadSample} onUpload={handleFileUpload} onFormatGuide={() => setFormatGuideOpen(true)} uploadedCount={pendingProjects.length} parseError={parseError} /><FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} /></>);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">CapEx Planning</h1><p className="text-muted-foreground mt-1">{n} projects | {fmt(totalBudget)} total budget</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div></div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <CapexGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[
        { label: 'Total Budget', value: fmt(totalBudget), sub: `${n} projects` },
        { label: 'Total Spent', value: fmt(totalSpent), sub: `${fmtPct(avgUtilization * 100)} utilized`, alert: avgUtilization > 1 },
        { label: 'Remaining', value: fmt(totalRemaining), sub: totalRemaining < 0 ? 'Over budget' : 'Under budget', alert: totalRemaining < 0 },
        { label: 'Wtd Avg ROI', value: `${waROI.toFixed(1)}%`, sub: `${overBudget.length} over budget`, alert: overBudget.length > 0 },
      ].map(({ label, value, sub, alert }) => (<Card key={label} className={`border-0 shadow-lg ${alert ? 'ring-2 ring-red-500/20' : ''}`}><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{sub}</p></CardContent></Card>))}</div>

      {/* Project Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div><div><CardTitle>CapEx Projects</CardTitle><CardDescription>Sorted by budget (highest first)</CardDescription></div></div><Button variant="outline" size="sm" onClick={() => document.getElementById('cx-csv-reupload')?.click()}><Upload className="w-4 h-4 mr-1" />Re-upload<input id="cx-csv-reupload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} /></Button></div></CardHeader>
        <CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="min-w-[160px]">Project</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Spent</TableHead><TableHead className="text-right">Util %</TableHead><TableHead>Status</TableHead><TableHead className="text-right">ROI</TableHead></TableRow></TableHeader>
          <TableBody>{sorted.map(p => (<TableRow key={p.id} className={p.utilization > 1 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}><TableCell className="font-medium text-sm">{p.project_name}</TableCell><TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell><TableCell><Badge className={`text-xs capitalize ${PRIORITY_COLORS[p.priority] || ''}`}>{p.priority}</Badge></TableCell><TableCell className="text-right font-mono text-xs">{fmt(p.budget)}</TableCell><TableCell className="text-right font-mono text-xs">{fmt(p.spent)}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-2"><div className="w-16 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${p.utilization > 1 ? 'bg-red-500' : p.utilization > 0.8 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(p.utilization * 100, 100)}%` }} /></div><span className="font-mono text-xs w-10 text-right">{fmtPct(p.utilization * 100)}</span></div></TableCell><TableCell><Badge className={`text-xs capitalize ${STATUS_COLORS[p.status] || ''}`}>{p.status}</Badge></TableCell><TableCell className="text-right font-mono text-xs">{p.roi > 0 ? `${p.roi}%` : '—'}</TableCell></TableRow>))}</TableBody></Table></div></CardContent>
      </Card>


      {/* Report */}
      <div className="flex justify-between items-center"><h2 className="text-lg font-semibold">Report</h2><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">CapEx Planning Report</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {n} Projects | {fmt(totalBudget)} Budget</p></div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Budget', value: fmt(totalBudget), sub: `${n} projects`, color: 'text-primary' },
            { label: 'Utilization', value: fmtPct(avgUtilization * 100), sub: `${fmt(totalSpent)} spent`, color: avgUtilization <= 0.8 ? 'text-green-600' : avgUtilization <= 1.0 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Over Budget', value: `${overBudget.length}`, sub: overBudget.length > 0 ? fmt(overBudget.reduce((s, p) => s + (p.spent - p.budget), 0)) + ' overrun' : 'All within limits', color: overBudget.length > 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Wtd Avg ROI', value: `${waROI.toFixed(1)}%`, sub: `${(priorityCounts['critical'] || 0)} critical`, color: waROI >= 15 ? 'text-green-600' : waROI >= 8 ? 'text-amber-600' : 'text-red-600' },
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

        {/* CapEx Project Detail Table */}
        <Card>
          <CardHeader><CardTitle>CapEx Project Detail</CardTitle><CardDescription>Budget, spend, utilization, priority, and ROI by project</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Project</th>
              <th className="p-2 text-left font-semibold">Category</th>
              <th className="p-2 text-left font-semibold">Dept</th>
              <th className="p-2 text-right font-semibold">Budget</th>
              <th className="p-2 text-right font-semibold">Spent</th>
              <th className="p-2 text-right font-semibold">Util</th>
              <th className="p-2 text-center font-semibold">Priority</th>
              <th className="p-2 text-center font-semibold">Status</th>
              <th className="p-2 text-right font-semibold">ROI</th>
            </tr></thead>
            <tbody>{sorted.slice(0, 15).map((p, i) => (
              <tr key={p.id} className={`border-b ${p.utilization > 1 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.palette[i % COLORS.palette.length] }} />{p.project_name}</div></td>
                <td className="p-2 text-muted-foreground">{p.category}</td>
                <td className="p-2 text-muted-foreground">{p.department}</td>
                <td className="p-2 text-right font-mono">{fmt(p.budget)}</td>
                <td className="p-2 text-right font-mono">{fmt(p.spent)}</td>
                <td className="p-2 text-right"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.utilization > 1 ? 'bg-red-100 text-red-700' : p.utilization > 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{fmtPct(p.utilization * 100)}</span></td>
                <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${PRIORITY_COLORS[p.priority] || ''}`}>{p.priority}</span></td>
                <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${STATUS_COLORS[p.status] || STATUS_COLORS.planned}`}>{p.status}</span></td>
                <td className={`p-2 text-right font-mono ${p.roi >= 15 ? 'text-green-600' : p.roi >= 8 ? 'text-amber-600' : p.roi > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{p.roi > 0 ? `${p.roi}%` : '—'}</td>
              </tr>
            ))}{sorted.length > 15 && (
              <tr className="border-b"><td colSpan={9} className="p-2 text-center text-muted-foreground italic">+ {sorted.length - 15} more projects</td></tr>
            )}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total ({n})</td>
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{fmt(totalBudget)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalSpent)}</td>
              <td className="p-2 text-right font-mono">{fmtPct(avgUtilization * 100)}</td>
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{waROI.toFixed(1)}%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div><div><CardTitle>Key Findings</CardTitle><CardDescription>CapEx portfolio insights</CardDescription></div></div></CardHeader>
          <CardContent><div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">{(() => {
              const items: string[] = [];
              items.push(`Portfolio: ${n} projects, ${fmt(totalBudget)} total budget, ${fmt(totalSpent)} spent (${fmtPct(avgUtilization * 100)} utilization). Remaining: ${fmt(totalRemaining)}.`);
              if (overBudget.length > 0) items.push(`Over-budget: ${overBudget.length} project${overBudget.length > 1 ? 's' : ''}: ${overBudget.map(p => `"${p.project_name}" (${fmtPct(p.utilization * 100)})`).join(', ')}. Total overrun: ${fmt(overBudget.reduce((s, p) => s + (p.spent - p.budget), 0))}.`);
              else items.push('No over-budget projects. All spending within approved limits.');
              const topCat = catData[0];
              if (topCat) items.push(`Largest category: "${topCat.category}" with ${fmt(topCat.budget)} budget (${fmtPct(topCat.budget / totalBudget * 100)} of total, ${topCat.count} projects).`);
              const criticals = projects.filter(p => p.priority === 'critical');
              if (criticals.length > 0) items.push(`Critical projects: ${criticals.length} totaling ${fmt(criticals.reduce((s, p) => s + p.budget, 0))} (${fmtPct(criticals.reduce((s, p) => s + p.budget, 0) / totalBudget * 100)}). Avg utilization: ${fmtPct(criticals.reduce((s, p) => s + p.utilization, 0) / criticals.length * 100)}.`);
              items.push(`Weighted-average ROI: ${waROI.toFixed(1)}%. Highest: "${[...projects].sort((a, b) => b.roi - a.roi)[0]?.project_name}" at ${[...projects].sort((a, b) => b.roi - a.roi)[0]?.roi}%.`);
              const completed = projects.filter(p => p.status === 'completed').length;
              const onHold = projects.filter(p => p.status === 'on hold').length;
              items.push(`Status: ${completed} completed, ${statusCounts['in progress'] || 0} in progress, ${statusCounts['planned'] || 0} planned${onHold > 0 ? `, ${onHold} on hold` : ''}. Completion rate: ${fmtPct(completed / n * 100)}.`);
              const topDept = deptData[0];
              if (topDept && topDept.budget / totalBudget > 0.25) items.push(`Department concentration: "${topDept.department}" is ${fmtPct(topDept.budget / totalBudget * 100)} of total budget.`);
              return items.map((text, i) => (<div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>));
            })()}</div>
          </div></CardContent>
        </Card>

        {/* Budget vs Spent by Category */}
        <Card><CardHeader><CardTitle>Budget vs Spent by Category</CardTitle></CardHeader><CardContent><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={catData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="category" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => `$${v}K`} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><Legend /><Bar dataKey="budget" name="Budget" fill={COLORS.primary} radius={[4, 4, 0, 0]} /><Bar dataKey="spent" name="Spent" fill={COLORS.secondary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* Department Breakdown */}
        <Card><CardHeader><CardTitle>Budget by Department</CardTitle></CardHeader><CardContent><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={deptData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tickFormatter={v => `$${v}K`} /><YAxis type="category" dataKey="department" width={90} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><Legend /><Bar dataKey="budget" name="Budget" radius={[0, 4, 4, 0]}>{deptData.map((d, i) => {const pct = d.budget / totalBudget; return <Cell key={i} fill={pct >= 0.25 ? '#dc2626' : pct >= 0.15 ? '#f59e0b' : COLORS.palette[i % COLORS.palette.length]} />;})}</Bar></BarChart></ResponsiveContainer></div></CardContent></Card>

        {/* ROI vs Budget Scatter */}
        <Card><CardHeader><CardTitle>ROI vs Budget — Bubble Size = Spent</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="budget" name="Budget" tickFormatter={v => `$${v}K`} type="number" /><YAxis dataKey="roi" name="ROI" tickFormatter={v => `${v}%`} type="number" /><ZAxis dataKey="spent" range={[40, 400]} name="Spent" /><Tooltip formatter={(v: any, name: string) => [name === 'ROI' ? `${Number(v)}%` : `$${Number(v).toLocaleString()}K`, name]} /><Scatter data={projects.filter(p => p.roi > 0).map(p => ({ ...p, name: p.project_name }))} fill={COLORS.primary} fillOpacity={0.6} /></ScatterChart></ResponsiveContainer></div><div className="flex justify-center mt-2 text-xs text-muted-foreground"><span>High-ROI + Low-Budget = best value (top-left). Bubble size = spend to date.</span></div></CardContent></Card>

        {/* Quarterly Timeline */}
        <Card><CardHeader><CardTitle>Quarterly CapEx Distribution</CardTitle></CardHeader><CardContent><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={quarterData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="quarter" /><YAxis tickFormatter={v => `$${v}K`} /><Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} /><Legend /><Bar dataKey="budget" name="Budget" fill={COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.7} /><Bar dataKey="spent" name="Spent" fill={COLORS.secondary} radius={[4, 4, 0, 0]} opacity={0.7} /><Line dataKey="count" name="# Projects" type="monotone" stroke={COLORS.softRed} strokeWidth={2} yAxisId={0} /></ComposedChart></ResponsiveContainer></div></CardContent></Card>

        {/* Status + Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Project Status</CardTitle></CardHeader><CardContent><div className="space-y-2">{Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (<div key={status} className="flex items-center justify-between p-2 rounded-lg bg-muted/20"><Badge className={`text-xs capitalize ${STATUS_COLORS[status] || STATUS_COLORS.planned}`}>{status}</Badge><div className="flex items-center gap-2"><div className="w-24 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / n) * 100}%` }} /></div><span className="font-mono text-xs font-semibold w-8 text-right">{count}</span></div></div>))}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Priority Breakdown</CardTitle></CardHeader><CardContent><div className="space-y-2">{['critical', 'high', 'medium', 'low'].filter(p => priorityCounts[p]).map(pri => { const group = projects.filter(p => p.priority === pri); const bud = group.reduce((s, p) => s + p.budget, 0); return (<div key={pri} className="flex items-center justify-between p-2 rounded-lg bg-muted/20"><Badge className={`text-xs capitalize ${PRIORITY_COLORS[pri] || ''}`}>{pri}</Badge><div className="text-right"><span className="font-mono text-xs font-semibold">{fmt(bud)}</span><span className="text-xs text-muted-foreground ml-2">({priorityCounts[pri]} projects)</span></div></div>); })}</div></CardContent></Card>
        </div>

        {/* Summary */}
        <Card><CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader><CardContent><div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">CapEx Summary</h3></div><div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">The CapEx portfolio comprises <strong>{n} projects</strong> with a total approved budget of <strong>{fmt(totalBudget)}</strong>. Current spending is {fmt(totalSpent)} ({fmtPct(avgUtilization * 100)} utilization) with {fmt(totalRemaining)} remaining.</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Category:</strong> {catData.map(c => `${c.category} ${fmt(c.budget)} (${c.count})`).join(', ')}. Top category "{catData[0]?.category}" represents {fmtPct((catData[0]?.budget || 0) / totalBudget * 100)} of the portfolio.</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><strong>Risk:</strong> {overBudget.length > 0 ? `${overBudget.length} project${overBudget.length > 1 ? 's' : ''} over budget with total overrun of ${fmt(overBudget.reduce((s, p) => s + (p.spent - p.budget), 0))}.` : 'No over-budget projects.'} Weighted-average ROI is {waROI.toFixed(1)}%. {waROI >= 15 ? 'Strong return profile.' : waROI >= 10 ? 'Moderate returns.' : 'Consider reprioritizing low-ROI projects.'}</p>
        </div></div></CardContent></Card>
      </div>

      <div className="flex justify-center pb-8"><Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top</Button></div>
    </div>
  );
}
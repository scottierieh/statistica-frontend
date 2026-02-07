'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Target, Layers, BookOpen, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, AlertTriangle, Calculator, Percent, Building2,
  Lightbulb, ChevronRight, Users, Upload, BarChart3, Plus, X,
  Settings2, CheckCircle2, Wallet, ArrowUpRight, ArrowDownRight,
  Monitor, Megaphone, Wrench, Shield, Zap, Globe, HeartPulse,
  Landmark, Truck, GraduationCap, Scale, SlidersHorizontal
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '../../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ComposedChart, Line,
  PieChart as RechartsPie, Pie, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Department {
  id: string;
  name: string;
  icon: string;
  allocPct: number;           // % of total envelope
  headcount: number;
  avgSalary: number;          // $K
  personnelPct: number;       // % of dept allocation going to personnel
  opexPct: number;            // % going to OpEx
  capexPct: number;           // % going to CapEx (auto: 100 - personnel - opex)
  priorYearSpend: number;     // $K (last year actual for comparison)
}

interface AllocationSettings {
  companyName: string;
  fiscalYear: number;
  totalEnvelope: number;      // $K total budget to distribute
  contingencyPct: number;     // % reserved
  scenario: 'base' | 'growth' | 'austerity';
  scenarioMultiplier: number; // derived: 1.0, 1.15, 0.85
}

interface AllocationPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPT_ICONS: Record<string, React.ElementType> = {
  'Engineering': Monitor, 'Sales': TrendingUp, 'Marketing': Megaphone,
  'Operations': Wrench, 'HR': Users, 'Finance': Landmark,
  'R&D': Zap, 'Customer Success': HeartPulse, 'Legal': Shield,
  'General & Admin': Building2, 'IT': Globe, 'Supply Chain': Truck,
  'Training': GraduationCap,
};

const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e', '#4a90b8', '#64748b'];

const DEFAULT_SETTINGS: AllocationSettings = {
  companyName: 'Acme Corp',
  fiscalYear: new Date().getFullYear() + 1,
  totalEnvelope: 12000,
  contingencyPct: 5,
  scenario: 'base',
  scenarioMultiplier: 1.0,
};

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Engineering', icon: 'Engineering', allocPct: 38, headcount: 35, avgSalary: 130, personnelPct: 88, opexPct: 8, capexPct: 4, priorYearSpend: 4800 },
  { id: 'd2', name: 'Sales', icon: 'Sales', allocPct: 18, headcount: 20, avgSalary: 95, personnelPct: 83, opexPct: 15, capexPct: 2, priorYearSpend: 2100 },
  { id: 'd3', name: 'Marketing', icon: 'Marketing', allocPct: 15, headcount: 12, avgSalary: 90, personnelPct: 57, opexPct: 42, capexPct: 1, priorYearSpend: 1800 },
  { id: 'd4', name: 'Operations', icon: 'Operations', allocPct: 10, headcount: 8, avgSalary: 85, personnelPct: 69, opexPct: 20, capexPct: 11, priorYearSpend: 1100 },
  { id: 'd5', name: 'HR', icon: 'HR', allocPct: 5, headcount: 5, avgSalary: 80, personnelPct: 77, opexPct: 23, capexPct: 0, priorYearSpend: 540 },
  { id: 'd6', name: 'Finance', icon: 'Finance', allocPct: 7, headcount: 6, avgSalary: 100, personnelPct: 78, opexPct: 19, capexPct: 3, priorYearSpend: 760 },
  { id: 'd7', name: 'Legal', icon: 'Legal', allocPct: 4, headcount: 3, avgSalary: 120, personnelPct: 75, opexPct: 25, capexPct: 0, priorYearSpend: 420 },
  { id: 'd8', name: 'IT', icon: 'IT', allocPct: 3, headcount: 4, avgSalary: 110, personnelPct: 65, opexPct: 20, capexPct: 15, priorYearSpend: 380 },
];

const BENCHMARKS: Record<string, Record<string, number>> = {
  'SaaS': { 'Engineering': 35, 'Sales': 20, 'Marketing': 18, 'Operations': 8, 'HR': 4, 'Finance': 5, 'Legal': 3, 'IT': 4 },
  'E-Commerce': { 'Engineering': 15, 'Sales': 10, 'Marketing': 25, 'Operations': 25, 'HR': 5, 'Finance': 6, 'Legal': 3, 'IT': 8 },
  'Manufacturing': { 'Engineering': 10, 'Sales': 12, 'Marketing': 5, 'Operations': 40, 'HR': 6, 'Finance': 7, 'Legal': 4, 'IT': 5 },
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) => n == null || isNaN(n) || !isFinite(n) ? '—' : n >= 10000 ? `$${(n / 1000).toFixed(d === 0 ? 1 : d)}M` : `$${n.toLocaleString()}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n.toFixed(1)}%`;
const fmtN = (n: number) => n.toLocaleString();


// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseAllocationCSV(csvText: string): { departments: Department[]; envelope?: number } | null {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 2) return null;
  const rows = parsed.data as Record<string, string>[];
  const departments: Department[] = [];
  let envelope: number | undefined;
  for (const row of rows) {
    const name = (row['Department'] || row['Name'] || '').trim();
    if (!name) continue;
    const p = (k: string) => parseFloat(row[k]) || 0;
    departments.push({
      id: `d${departments.length + 1}`, name, icon: name,
      allocPct: p('AllocPct') || p('Allocation%') || 0,
      headcount: p('Headcount') || p('HC') || 0,
      avgSalary: p('AvgSalary') || p('Salary') || 80,
      personnelPct: p('PersonnelPct') || 70,
      opexPct: p('OpexPct') || 25,
      capexPct: p('CapexPct') || 5,
      priorYearSpend: p('PriorYear') || p('LastYear') || 0,
    });
  }
  if (rows[0] && rows[0]['TotalEnvelope']) envelope = parseFloat(rows[0]['TotalEnvelope']) || undefined;
  if (departments.length === 0) return null;
  // Normalize allocPct if they don't sum to ~100
  const total = departments.reduce((s, d) => s + d.allocPct, 0);
  if (total > 0 && (total < 90 || total > 110)) {
    departments.forEach(d => d.allocPct = Math.round((d.allocPct / total) * 100 * 10) / 10);
  }
  return { departments, envelope };
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Budget Envelope": "Total amount of money available for allocation across all departments.",
  "Allocation %": "Percentage of the distributable envelope assigned to each department.",
  "Distributable Budget": "Envelope minus contingency reserve. The actual amount split across departments.",
  "Contingency Reserve": "Percentage held back for unexpected costs (typically 5–10%).",
  "Personnel Cost": "Headcount × Average Salary. Usually the largest portion of any department budget.",
  "Category Split": "How each department's allocation is divided: Personnel vs OpEx vs CapEx.",
  "Prior-Year Spend": "Last year's actual expenditure per department. Useful as a baseline for current year allocation.",
  "Prior-Year Spend": "Last year's actual spending — baseline for comparison and trend analysis.",
  "YoY Change": "(Current Allocation − Prior Year) ÷ Prior Year × 100%. Growth or contraction.",
  "Cost per Head": "Department Budget ÷ Headcount. Efficiency metric across departments.",
  "Scenario Planning": "Testing allocation under different total budgets: Base, Growth (+15%), Austerity (−15%).",
  "Benchmark": "Industry-typical allocation percentages for comparison.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Allocation Glossary</DialogTitle>
        <DialogDescription>Key budget allocation terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {Object.entries(glossaryItems).map(([t, d]) => (
            <div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>
          ))}
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);


// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const AllocationGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Allocation Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">

          <div>
            <h3 className="font-semibold text-primary mb-3">Allocation Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Set Total Envelope', desc: 'Define the total budget available for distribution across all departments.' },
                { step: '2', title: 'Reserve Contingency', desc: 'Hold back 5–10% for unexpected costs. The remainder is the distributable budget.' },
                { step: '3', title: 'Assign Department %', desc: 'Distribute the envelope using percentage sliders. Total must sum to 100%.' },
                { step: '4', title: 'Set Category Splits', desc: 'Within each department, define Personnel / OpEx / CapEx ratios.' },
                { step: '5', title: 'Compare & Optimize', desc: 'Review vs prior year, benchmarks, and headcount efficiency. Run scenarios.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Key Formulas</h3>
            <div className="space-y-3">
              {[
                { label: 'Distributable Budget', formula: 'Envelope × (1 − Contingency%)', example: '$12,000K × (1 − 5%) = $11,400K' },
                { label: 'Department Budget', formula: 'Distributable × AllocPct', example: '$11,400K × 38% = $4,332K' },
                { label: 'Personnel Cost', formula: 'Dept Budget × PersonnelPct', example: '$4,332K × 88% = $3,812K' },
                { label: 'Cost per Head', formula: 'Dept Budget ÷ Headcount', example: '$4,332K ÷ 35 = $124K' },
                { label: 'YoY Change', formula: '(Current − PriorYear) ÷ PriorYear × 100', example: '($4,332K − $4,800K) ÷ $4,800K = −9.8%' },
                { label: 'Headcount Affordability', formula: 'Dept Personnel Budget ÷ AvgSalary', example: '$3,812K ÷ $130K = 29 FTEs max' },
                { label: 'Scenario Budget', formula: 'Envelope × Scenario Multiplier', example: '$12,000K × 1.15 = $13,800K (Growth)' },
              ].map(({ label, formula, example }) => (
                <div key={label} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{label}</span>
                    <span className="font-mono text-xs text-primary">{formula}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{example}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Industry Benchmarks (% of Total Budget)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b">
                  <th className="text-left p-2 font-semibold">Department</th>
                  <th className="text-center p-2 font-semibold">SaaS</th>
                  <th className="text-center p-2 font-semibold">E-Commerce</th>
                  <th className="text-center p-2 font-semibold">Manufacturing</th>
                </tr></thead>
                <tbody>
                  {Object.keys(BENCHMARKS['SaaS']).map((dept, i) => (
                    <tr key={dept} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 font-medium">{dept}</td>
                      <td className="p-2 text-center font-mono">{BENCHMARKS['SaaS'][dept]}%</td>
                      <td className="p-2 text-center font-mono">{BENCHMARKS['E-Commerce'][dept]}%</td>
                      <td className="p-2 text-center font-mono">{BENCHMARKS['Manufacturing'][dept]}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> Start with prior-year actuals as a baseline, then adjust based on strategic goals. Use the Normalize button to snap allocations to exactly 100%, then fine-tune manually.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE CSV & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_ALLOC_CSV = `Department,AllocPct,Headcount,AvgSalary,PersonnelPct,OpexPct,CapexPct,PriorYear
Engineering,38,35,130,88,8,4,4800
Sales,18,20,95,83,15,2,2100
Marketing,15,12,90,57,42,1,1800
Operations,10,8,85,69,20,11,1100
HR,5,5,80,77,23,0,540
Finance,7,6,100,78,19,3,760
Legal,4,3,120,75,25,0,420
IT,3,4,110,65,20,15,380`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_ALLOC_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_allocation.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Required Data Format</DialogTitle>
          <DialogDescription>Prepare your allocation data in this format before uploading</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">One row per department. Allocation % will be normalized if they don&apos;t sum to 100%.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Department</th>
                    <th className="p-2 text-right">AllocPct</th>
                    <th className="p-2 text-right">HC</th>
                    <th className="p-2 text-right">AvgSalary</th>
                    <th className="p-2 text-right">Personnel%</th>
                    <th className="p-2 text-right">OpEx%</th>
                    <th className="p-2 text-right">CapEx%</th>
                    <th className="p-2 text-right">PriorYear</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Engineering', '38', '35', '130', '88', '8', '4', '4800'],
                      ['Sales', '18', '20', '95', '83', '15', '2', '2100'],
                      ['Marketing', '15', '12', '90', '57', '42', '1', '1800'],
                    ].map(([dept, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{dept}</td>
                        {vals.map((v, j) => <td key={j} className="p-2 text-right">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Column Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'Department', required: true, desc: 'Department name' },
                  { name: 'AllocPct', required: true, desc: 'Allocation percentage (will normalize to 100%)' },
                  { name: 'Headcount', required: false, desc: 'Number of employees' },
                  { name: 'AvgSalary', required: false, desc: 'Average salary in $K' },
                  { name: 'PersonnelPct', required: false, desc: '% of dept budget for personnel (default 70%)' },
                  { name: 'OpexPct', required: false, desc: '% for operating expenses (default 25%)' },
                  { name: 'CapexPct', required: false, desc: '% for capital expenditure (default 5%)' },
                  { name: 'PriorYear', required: false, desc: 'Last year actual spend ($K)' },
                  { name: 'PriorYear', required: false, desc: 'Last year actual spend in $K' },
                ].map(({ name, required, desc }) => (
                  <div key={name} className={`p-2.5 rounded-lg border text-sm ${required ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{name}</span>
                      {required && <Badge variant="default" className="text-[10px] px-1.5 py-0">Required</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• All monetary values in <strong>$K</strong> (thousands).</li>
                <li>• AllocPct values auto-normalize to sum to 100%.</li>
                <li>• PersonnelPct + OpexPct + CapexPct should sum to ~100% per department.</li>
                <li>• PersonnelPct + OpexPct + CapexPct should equal 100%.</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleDownloadSample}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({
  onStartWithData, onStartManual, hasUploadedData, parseError
}: {
  onStartWithData: () => void; onStartManual: () => void;
  hasUploadedData: boolean; parseError: string | null;
}) => {
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><SlidersHorizontal className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Department Budget Allocation</CardTitle>
          <CardDescription className="text-base mt-2">Distribute financial resources across organizational departments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Percent, title: 'Envelope Distribution', desc: 'Allocate total budget using percentage sliders per department' },
              { icon: Layers, title: 'Category Split', desc: 'Break down each allocation into Personnel, OpEx, and CapEx' },
              { icon: Scale, title: 'Benchmark & Compare', desc: 'Industry benchmarks, prior-year comparison, and scenario planning' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-2">
                <CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className={`border-2 transition-all ${hasUploadedData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasUploadedData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Upload Allocation Data</CardTitle><CardDescription className="text-xs">Import department data from CSV</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected — ready to allocate</span></div>
                    <p className="text-xs text-muted-foreground">Your uploaded data will populate departments and allocations automatically.</p>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with department allocations, headcount, and prior-year spend to auto-populate.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Department | AllocPct | HC | Salary | ...</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>
                    {parseError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground text-center">Upload your data file first, then come back here</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">Pre-loaded 8-department SaaS company</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Start with a pre-filled SaaS company template with 8 departments and adjust everything.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />$12M total envelope, 8 departments</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Personnel / OpEx / CapEx split per dept</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Prior-year comparison and scenario planning</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Base / Growth / Austerity scenarios</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Both paths lead to the same model. Uploading data pre-fills departments and percentages — you can always add, remove, or adjust afterward.</p>
          </div>
        </CardContent>
      </Card>
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AllocationPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: AllocationPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [settings, setSettings] = useState<AllocationSettings>(DEFAULT_SETTINGS);
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);

  // CSV detection
  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try { const raw = Papa.unparse(data); return parseAllocationCSV(raw); } catch { return null; }
  }, [data]);
  const [parseError] = useState<string | null>(null);

  const applyUpload = useCallback(() => {
    if (parsedUpload) {
      setDepartments(parsedUpload.departments);
      if (parsedUpload.envelope) setSettings(p => ({ ...p, totalEnvelope: parsedUpload.envelope! }));
    }
    setShowIntro(false);
  }, [parsedUpload]);

  // ── Computed ──
  const effectiveEnvelope = settings.totalEnvelope * settings.scenarioMultiplier;
  const contingencyAmt = effectiveEnvelope * (settings.contingencyPct / 100);
  const distributable = effectiveEnvelope - contingencyAmt;
  const totalAllocPct = departments.reduce((s, d) => s + d.allocPct, 0);
  const isBalanced = Math.abs(totalAllocPct - 100) < 0.5;
  const totalHeadcount = departments.reduce((s, d) => s + d.headcount, 0);
  const totalPriorYear = departments.reduce((s, d) => s + d.priorYearSpend, 0);

  const deptResults = useMemo(() => departments.map((d, i) => {
    const budget = distributable * (d.allocPct / 100);
    const personnel = budget * (d.personnelPct / 100);
    const opex = budget * (d.opexPct / 100);
    const capex = budget * (d.capexPct / 100);
    const costPerHead = d.headcount > 0 ? budget / d.headcount : 0;
    const yoy = d.priorYearSpend > 0 ? ((budget - d.priorYearSpend) / d.priorYearSpend) * 100 : 0;
    const maxHC = d.avgSalary > 0 ? Math.floor(personnel / d.avgSalary) : 0;
    return { ...d, budget, personnel, opex, capex, costPerHead, yoy, maxHC, colorIndex: i };
  }), [departments, distributable]);

  const totalBudget = deptResults.reduce((s, d) => s + d.budget, 0);
  const totalPersonnel = deptResults.reduce((s, d) => s + d.personnel, 0);
  const totalOpex = deptResults.reduce((s, d) => s + d.opex, 0);
  const totalCapex = deptResults.reduce((s, d) => s + d.capex, 0);

  // ── Department CRUD ──
  const updateDept = useCallback((id: string, updates: Partial<Department>) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);
  const addDept = useCallback(() => {
    setDepartments(prev => [...prev, {
      id: `d${Date.now()}`, name: 'New Dept', icon: 'General & Admin',
      allocPct: 0, headcount: 3, avgSalary: 80, personnelPct: 70, opexPct: 25, capexPct: 5,
      priorYearSpend: 0,
    }]);
  }, []);
  const removeDept = useCallback((id: string) => { setDepartments(prev => prev.filter(d => d.id !== id)); }, []);

  // ── Normalize to 100% ──
  const normalize = useCallback(() => {
    const total = departments.reduce((s, d) => s + d.allocPct, 0);
    if (total === 0) return;
    setDepartments(prev => prev.map(d => ({ ...d, allocPct: Math.round((d.allocPct / total) * 1000) / 10 })));
  }, [departments]);

  // ── Scenario ──
  const setScenario = useCallback((s: 'base' | 'growth' | 'austerity') => {
    const m = s === 'growth' ? 1.15 : s === 'austerity' ? 0.85 : 1.0;
    setSettings(p => ({ ...p, scenario: s, scenarioMultiplier: m }));
  }, []);

  // ── Charts ──
  const pieData = deptResults.map((d, i) => ({ name: d.name, value: Math.round(d.budget), fill: CHART_COLORS[i % CHART_COLORS.length] }));
  const categoryPieData = [
    { name: 'Personnel', value: Math.round(totalPersonnel), fill: '#1e3a5f' },
    { name: 'OpEx', value: Math.round(totalOpex), fill: '#0d9488' },
    { name: 'CapEx', value: Math.round(totalCapex), fill: '#3b7cc0' },
    { name: 'Contingency', value: Math.round(contingencyAmt), fill: '#94a3b8' },
  ].filter(c => c.value > 0);
  const barData = deptResults.map(d => ({ name: d.name, Personnel: Math.round(d.personnel), OpEx: Math.round(d.opex), CapEx: Math.round(d.capex) }));
  const yoyData = deptResults.filter(d => d.priorYearSpend > 0).map(d => ({ name: d.name, current: Math.round(d.budget), prior: d.priorYearSpend, yoy: Math.round(d.yoy * 10) / 10 }));

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a'); link.download = `Allocation_${settings.fiscalYear}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [settings.fiscalYear, toast]);

  const handleDownloadCSV = useCallback(() => {
    let csv = `DEPARTMENT BUDGET ALLOCATION — ${settings.companyName} FY${settings.fiscalYear}\n`;
    csv += `Scenario: ${settings.scenario} | Envelope: $${effectiveEnvelope.toLocaleString()}K | Contingency: ${settings.contingencyPct}%\n\n`;
    csv += Papa.unparse(deptResults.map(d => ({
      Department: d.name, 'Alloc%': d.allocPct, Budget: Math.round(d.budget),
      Personnel: Math.round(d.personnel), OpEx: Math.round(d.opex), CapEx: Math.round(d.capex),
      Headcount: d.headcount, CostPerHead: Math.round(d.costPerHead),
      PriorYear: d.priorYearSpend, 'YoY%': d.yoy.toFixed(1),
    }))) + '\n';
    csv += `\nTotal,,${Math.round(totalBudget)},${Math.round(totalPersonnel)},${Math.round(totalOpex)},${Math.round(totalCapex)},${totalHeadcount},,,,\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Allocation_${settings.fiscalYear}.csv`; link.click();
    toast({ title: "Downloaded" });
  }, [deptResults, settings, effectiveEnvelope, totalBudget, totalPersonnel, totalOpex, totalCapex, totalHeadcount, toast]);

  // ─── Intro ───
  if (showIntro) return (
    <IntroPage hasUploadedData={!!parsedUpload} parseError={parseError} onStartWithData={applyUpload} onStartManual={() => setShowIntro(false)} />
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Department Budget Allocation</h1><p className="text-muted-foreground mt-1">{settings.companyName} — FY{settings.fiscalYear}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <AllocationGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Allocation Settings</CardTitle><CardDescription>Total envelope, contingency, and scenario</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={settings.companyName} onChange={e => setSettings(p => ({ ...p, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Fiscal Year</Label><Input type="number" value={settings.fiscalYear} onChange={e => setSettings(p => ({ ...p, fiscalYear: parseInt(e.target.value) || 2025 }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Total Envelope ($K)</Label><Input type="number" value={settings.totalEnvelope} onChange={e => setSettings(p => ({ ...p, totalEnvelope: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Contingency %</Label><Input type="number" step={0.5} value={settings.contingencyPct} onChange={e => setSettings(p => ({ ...p, contingencyPct: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scenario</Label>
            <div className="flex gap-2">
              {([
                { key: 'austerity', label: 'Austerity (−15%)', mult: 0.85 },
                { key: 'base', label: 'Base', mult: 1.0 },
                { key: 'growth', label: 'Growth (+15%)', mult: 1.15 },
              ] as const).map(({ key, label }) => (
                <Button key={key} variant={settings.scenario === key ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setScenario(key)}>{label}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Allocation Overview</h3>
              {!isBalanced && <Badge variant="destructive" className="text-xs">⚠ Allocation total: {totalAllocPct.toFixed(1)}% (need 100%)</Badge>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Effective Envelope', value: fmt(effectiveEnvelope) },
                { label: 'Distributable', value: fmt(distributable) },
                { label: 'Departments', value: `${departments.length}` },
                { label: 'Total Headcount', value: `${totalHeadcount}` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-primary">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
              {[
                { label: 'Personnel', value: fmt(totalPersonnel) },
                { label: 'OpEx', value: fmt(totalOpex) },
                { label: 'CapEx', value: fmt(totalCapex) },
                { label: 'Contingency', value: fmt(contingencyAmt) },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Department Allocation Sliders ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><SlidersHorizontal className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Department Allocations</CardTitle><CardDescription>Adjust % sliders — total should equal 100%</CardDescription></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={normalize}><Scale className="w-4 h-4 mr-1" />Normalize</Button>
              <Button variant="outline" size="sm" onClick={addDept}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {departments.map((d, i) => {
              const Icon = DEPT_ICONS[d.icon] || Building2;
              const budget = distributable * (d.allocPct / 100);
              return (
                <div key={d.id} className="p-3 rounded-lg border hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input value={d.name} onChange={e => updateDept(d.id, { name: e.target.value })} className="h-7 text-sm font-medium border-0 bg-transparent p-0 w-28" />
                    <div className="flex-1">
                      <Slider value={[d.allocPct]} onValueChange={([v]) => updateDept(d.id, { allocPct: v })} min={0} max={60} step={0.5} />
                    </div>
                    <span className="font-mono text-sm w-14 text-right">{d.allocPct.toFixed(1)}%</span>
                    <span className="font-mono text-sm w-20 text-right text-primary">{fmt(budget)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeDept(d.id)}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg font-semibold ${isBalanced ? 'bg-primary/5' : 'bg-destructive/10'}`}>
              <span className="text-sm">Total Allocation</span>
              <span className={`font-mono text-sm ${isBalanced ? 'text-primary' : 'text-destructive'}`}>{totalAllocPct.toFixed(1)}% — {fmt(totalBudget)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Category Split Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Layers className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Category Split & Headcount</CardTitle><CardDescription>Personnel / OpEx / CapEx ratios and staffing capacity</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Personnel%</TableHead>
                  <TableHead className="text-right">OpEx%</TableHead>
                  <TableHead className="text-right">CapEx%</TableHead>
                  <TableHead className="text-right">HC</TableHead>
                  <TableHead className="text-right">Avg Sal</TableHead>
                  <TableHead className="text-right">Max HC</TableHead>
                  <TableHead className="text-right">$/Head</TableHead>
                  <TableHead className="text-right">Prior Yr</TableHead>
                  <TableHead className="text-right">YoY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptResults.map(d => {
                  const Icon = DEPT_ICONS[d.icon] || Building2;
                  return (
                    <TableRow key={d.id}>
                      <TableCell><div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{d.name}</span></div></TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmt(d.budget)}</TableCell>
                      <TableCell className="text-right"><Input type="number" value={d.personnelPct} onChange={e => updateDept(d.id, { personnelPct: parseFloat(e.target.value) || 0 })} className="h-6 w-14 text-right text-xs font-mono p-1" /></TableCell>
                      <TableCell className="text-right"><Input type="number" value={d.opexPct} onChange={e => updateDept(d.id, { opexPct: parseFloat(e.target.value) || 0 })} className="h-6 w-14 text-right text-xs font-mono p-1" /></TableCell>
                      <TableCell className="text-right"><Input type="number" value={d.capexPct} onChange={e => updateDept(d.id, { capexPct: parseFloat(e.target.value) || 0 })} className="h-6 w-14 text-right text-xs font-mono p-1" /></TableCell>
                      <TableCell className="text-right"><Input type="number" value={d.headcount} onChange={e => updateDept(d.id, { headcount: parseInt(e.target.value) || 0 })} className="h-6 w-12 text-right text-xs font-mono p-1" /></TableCell>
                      <TableCell className="text-right"><Input type="number" value={d.avgSalary} onChange={e => updateDept(d.id, { avgSalary: parseFloat(e.target.value) || 0 })} className="h-6 w-14 text-right text-xs font-mono p-1" /></TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{d.maxHC}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(d.costPerHead)}</TableCell>
                      <TableCell className="text-right"><Input type="number" value={d.priorYearSpend} onChange={e => updateDept(d.id, { priorYearSpend: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono p-1" /></TableCell>
                      <TableCell className={`text-right font-mono text-xs ${d.yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>{d.yoy >= 0 ? '+' : ''}{d.yoy.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono text-primary">{fmt(totalBudget)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{totalBudget > 0 ? fmtP((totalPersonnel / totalBudget) * 100) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{totalBudget > 0 ? fmtP((totalOpex / totalBudget) * 100) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{totalBudget > 0 ? fmtP((totalCapex / totalBudget) * 100) : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{totalHeadcount}</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right font-mono text-xs">{totalHeadcount > 0 ? fmt(totalBudget / totalHeadcount) : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totalPriorYear)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${totalPriorYear > 0 && totalBudget >= totalPriorYear ? 'text-green-600' : 'text-red-600'}`}>{totalPriorYear > 0 ? `${((totalBudget - totalPriorYear) / totalPriorYear * 100) >= 0 ? '+' : ''}${((totalBudget - totalPriorYear) / totalPriorYear * 100).toFixed(1)}%` : '—'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Calculation Breakdown ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />Allocation Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {[
                  { label: 'Total Envelope', value: fmt(settings.totalEnvelope) },
                  ...(settings.scenario !== 'base' ? [{ label: `Scenario (${settings.scenario} ×${settings.scenarioMultiplier})`, value: fmt(effectiveEnvelope) }] : []),
                  { label: `(−) Contingency (${settings.contingencyPct}%)`, value: fmt(contingencyAmt) },
                  { label: 'Distributable Budget', value: fmt(distributable), bold: true },
                  ...deptResults.slice(0, 3).map(d => ({ label: `  ${d.name} (${d.allocPct}%)`, value: fmt(d.budget) })),
                  ...(deptResults.length > 3 ? [{ label: `  + ${deptResults.length - 3} more departments`, value: '' }] : []),
                  { label: 'Total Allocated', value: fmt(totalBudget), bold: true },
                  { label: 'Unallocated', value: fmt(distributable - totalBudget), final: true },
                ].map(({ label, value, bold, final }, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                    <span className={`text-sm ${bold || final ? 'font-semibold' : ''}`}>{label}</span>
                    <span className={`font-mono text-sm ${final ? 'text-primary font-bold' : bold ? 'font-semibold' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
              <p>Distributable = {fmt(settings.totalEnvelope)}{settings.scenario !== 'base' ? ` × ${settings.scenarioMultiplier}` : ''} × (1 − {fmtP(settings.contingencyPct)}) = {fmt(distributable)}</p>
              <p>Each Dept = {fmt(distributable)} × AllocPct</p>
              <p className="text-primary font-semibold">Unallocated = {fmt(distributable)} − {fmt(totalBudget)} = {fmt(distributable - totalBudget)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Allocation Report</h2><p className="text-sm text-muted-foreground">Charts, comparison, and summary</p></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b">
          <h2 className="text-2xl font-bold">{settings.companyName} — FY{settings.fiscalYear} Allocation</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | Envelope: {fmt(effectiveEnvelope)} | {departments.length} departments | Scenario: {settings.scenario}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Envelope', value: fmt(effectiveEnvelope), sub: `Contingency: ${fmt(contingencyAmt)}`, color: 'text-primary' },
            { label: 'Allocated', value: fmt(totalBudget), sub: `${departments.length} departments`, color: 'text-primary' },
            { label: 'Unallocated', value: fmt(distributable - totalBudget), sub: `${(Math.abs(distributable - totalBudget) / distributable * 100).toFixed(1)}% of envelope`, color: distributable - totalBudget >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Headcount', value: `${totalHeadcount}`, sub: `${fmt(totalBudget / (totalHeadcount || 1))} per employee`, color: 'text-primary' },
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

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Allocation analysis highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Total distributable budget: ${fmt(distributable)} (${fmt(effectiveEnvelope)} envelope − ${settings.contingencyPct}% contingency).`);
                  const largest = deptResults.reduce((a, b) => a.budget > b.budget ? a : b);
                  items.push(`Largest allocation: ${largest.name} at ${fmt(largest.budget)} (${largest.allocPct.toFixed(1)}%), ${largest.headcount} employees.`);
                  const personnelPct = totalBudget > 0 ? (totalPersonnel / totalBudget * 100) : 0;
                  items.push(`Personnel costs: ${fmt(totalPersonnel)} (${personnelPct.toFixed(0)}% of total). OpEx: ${fmt(totalOpex)}. CapEx: ${fmt(totalCapex)}.`);
                  items.push(`Total headcount: ${totalHeadcount} across ${departments.length} departments. Average cost per employee: ${fmt(totalBudget / (totalHeadcount || 1))}.`);
                  const unallocated = distributable - totalBudget;
                  if (Math.abs(unallocated) > 1) items.push(`${unallocated > 0 ? 'Unallocated' : 'Over-allocated'} budget: ${fmt(Math.abs(unallocated))} (${(Math.abs(unallocated) / distributable * 100).toFixed(1)}% of envelope).`);
                  const yoyGrowth = totalPriorYear > 0 ? ((totalBudget - totalPriorYear) / totalPriorYear * 100) : 0;
                  if (totalPriorYear > 0) items.push(`Year-over-year budget change: ${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}% (${fmt(totalPriorYear)} → ${fmt(totalBudget)}).`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Allocation Detail */}
        <Card>
          <CardHeader><CardTitle>Department Allocation Detail</CardTitle><CardDescription>Budget breakdown by department with category split and efficiency metrics</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Department</th>
              <th className="p-2 text-right font-semibold">Alloc %</th>
              <th className="p-2 text-right font-semibold">Budget</th>
              <th className="p-2 text-right font-semibold">Personnel</th>
              <th className="p-2 text-right font-semibold">OpEx</th>
              <th className="p-2 text-right font-semibold">CapEx</th>
              <th className="p-2 text-right font-semibold">HC</th>
              <th className="p-2 text-right font-semibold">Cost/Head</th>
              <th className="p-2 text-right font-semibold">YoY</th>
            </tr></thead>
            <tbody>{deptResults.map((d, i) => (
              <tr key={d.id} className="border-b">
                <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{d.name}</div></td>
                <td className="p-2 text-right font-mono">{d.allocPct.toFixed(1)}%</td>
                <td className="p-2 text-right font-mono font-semibold">{fmt(d.budget)}</td>
                <td className="p-2 text-right font-mono">{fmt(d.personnel)}</td>
                <td className="p-2 text-right font-mono">{fmt(d.opex)}</td>
                <td className="p-2 text-right font-mono">{fmt(d.capex)}</td>
                <td className="p-2 text-right font-mono">{d.headcount}</td>
                <td className="p-2 text-right font-mono">{fmt(d.costPerHead)}</td>
                <td className={`p-2 text-right font-mono ${d.yoy > 0 ? 'text-green-600' : d.yoy < 0 ? 'text-red-600' : ''}`}>{d.priorYearSpend > 0 ? `${d.yoy >= 0 ? '+' : ''}${d.yoy.toFixed(1)}%` : '—'}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total</td>
              <td className="p-2 text-right font-mono">{departments.reduce((s, d) => s + d.allocPct, 0).toFixed(1)}%</td>
              <td className="p-2 text-right font-mono">{fmt(totalBudget)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalPersonnel)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalOpex)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalCapex)}</td>
              <td className="p-2 text-right font-mono">{totalHeadcount}</td>
              <td className="p-2 text-right font-mono">{totalHeadcount > 0 ? fmt(totalBudget / totalHeadcount) : '—'}</td>
              <td className="p-2" />
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Pie Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'By Department', data: pieData },
            { title: 'By Category', data: categoryPieData },
          ].map(({ title, data: pd }) => (
            <Card key={title}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={pd} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {pd.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`$${fmtN(v)}K`, '']} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stacked Bar */}
        <Card>
          <CardHeader><CardTitle>Category Breakdown by Department</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `$${v}K`} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip formatter={(v: any) => [`$${fmtN(v)}K`, '']} />
                  <Legend />
                  <Bar dataKey="Personnel" stackId="a" fill="#1e3a5f" />
                  <Bar dataKey="OpEx" stackId="a" fill="#0d9488" />
                  <Bar dataKey="CapEx" stackId="a" fill="#3b7cc0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* YoY Comparison */}
        {yoyData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Year-over-Year Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yoyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={v => `$${v}K`} />
                    <Tooltip formatter={(v: any) => [`$${fmtN(v)}K`, '']} />
                    <Legend />
                    <Bar dataKey="prior" name="Prior Year" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" name="FY Budget" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Allocation Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">FY{settings.fiscalYear} Budget Allocation — {settings.companyName}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The FY{settings.fiscalYear} budget allocation distributes <strong>{fmt(distributable)}</strong> across {departments.length} departments from an effective envelope of {fmt(effectiveEnvelope)} ({settings.scenario} scenario{settings.scenario !== 'base' ? `, ${settings.scenarioMultiplier}× multiplier` : ''}) with {fmtP(settings.contingencyPct)} contingency reserve ({fmt(contingencyAmt)}).
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The largest allocation goes to <strong>{deptResults.reduce((best, d) => d.budget > best.budget ? d : best, deptResults[0]).name}</strong> at {fmtP(deptResults.reduce((best, d) => d.budget > best.budget ? d : best, deptResults[0]).allocPct)} ({fmt(deptResults.reduce((best, d) => d.budget > best.budget ? d : best, deptResults[0]).budget)}), followed by {deptResults.sort((a, b) => b.budget - a.budget)[1]?.name} at {fmtP(deptResults.sort((a, b) => b.budget - a.budget)[1]?.allocPct)}.
                  Personnel costs represent {totalBudget > 0 ? fmtP((totalPersonnel / totalBudget) * 100) : '—'} of total allocation.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Total headcount of {totalHeadcount} yields an average cost per head of {totalHeadcount > 0 ? fmt(totalBudget / totalHeadcount) : '—'}.
                  {totalPriorYear > 0 && <> Compared to prior year spending of {fmt(totalPriorYear)}, the total allocation represents a {((totalBudget - totalPriorYear) / totalPriorYear * 100).toFixed(1)}% {totalBudget >= totalPriorYear ? 'increase' : 'decrease'}.</>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top
        </Button>
      </div>
    </div>
  );
}
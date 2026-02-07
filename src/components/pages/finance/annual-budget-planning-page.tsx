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
  FileSpreadsheet, ImageIcon, ChevronDown, FileText,
  Sparkles, Info, HelpCircle, AlertTriangle, Calculator, Percent,
  Building2, Lightbulb, ChevronRight, Users, Shield, Upload,
  Zap, Globe, Award, BarChart3, Star, Briefcase, CheckCircle2,
  ArrowRight, PieChart, Flame, Package, TrendingDown, Plus,
  Trash2, Settings2, Pencil, ArrowUpRight, ArrowDownRight,
  Wallet, Receipt, Landmark, Monitor, Megaphone, Wrench,
  GraduationCap, HeartPulse, Truck, X
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
  ResponsiveContainer, Cell, ReferenceLine, ComposedChart, Line,
  PieChart as RechartsPie, Pie, AreaChart, Area
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RevenueStream {
  id: string;
  name: string;
  annualTarget: number;       // $K
  monthlyDistribution: number[]; // 12 percentages (sum=100)
}

interface DepartmentBudget {
  id: string;
  name: string;
  icon: string;
  headcount: number;
  avgSalary: number;          // $K per person per year
  personnelBudget: number;    // $K (auto: headcount × avgSalary)
  opexBudget: number;         // $K (non-personnel operating expenses)
  capexBudget: number;        // $K
  totalBudget: number;        // auto: personnel + opex + capex
  actualSpend?: number;       // $K (optional, for variance)
}

interface BudgetAssumptions {
  fiscalYear: number;
  companyName: string;
  currency: string;
  inflationRate: number;      // %
  contingencyPct: number;     // % of total budget
  taxRate: number;            // %
}

interface BudgetPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DEPT_ICONS: Record<string, React.ElementType> = {
  'Engineering': Monitor, 'Sales': TrendingUp, 'Marketing': Megaphone,
  'Operations': Wrench, 'HR': Users, 'Finance': Landmark,
  'R&D': Zap, 'Customer Success': HeartPulse, 'Legal': Shield,
  'General & Admin': Building2, 'IT': Globe, 'Supply Chain': Truck,
};

const COLORS = {
  primary: '#1e3a5f',
  revenue: '#0d9488',
  expense: '#e57373',
  personnel: '#1e3a5f',
  opex: '#2d5a8e',
  capex: '#3b7cc0',
  contingency: '#94a3b8',
  departments: ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e', '#4a90b8', '#64748b'],
};

const DEFAULT_ASSUMPTIONS: BudgetAssumptions = {
  fiscalYear: new Date().getFullYear() + 1,
  companyName: 'Acme Corp',
  currency: '$',
  inflationRate: 3.0,
  contingencyPct: 5.0,
  taxRate: 25.0,
};

const DEFAULT_REVENUE: RevenueStream[] = [
  { id: 'r1', name: 'SaaS Subscriptions', annualTarget: 8500, monthlyDistribution: [7, 7, 8, 8, 8, 9, 9, 9, 9, 9, 9, 8] },
  { id: 'r2', name: 'Professional Services', annualTarget: 2200, monthlyDistribution: [6, 6, 8, 8, 9, 9, 10, 10, 9, 9, 8, 8] },
  { id: 'r3', name: 'Licensing & Royalties', annualTarget: 800, monthlyDistribution: [8, 8, 8, 8, 8, 8, 9, 9, 9, 8, 8, 9] },
];

const DEFAULT_DEPARTMENTS: DepartmentBudget[] = [
  { id: 'd1', name: 'Engineering', icon: 'Engineering', headcount: 35, avgSalary: 130, personnelBudget: 4550, opexBudget: 420, capexBudget: 180, totalBudget: 5150 },
  { id: 'd2', name: 'Sales', icon: 'Sales', headcount: 20, avgSalary: 95, personnelBudget: 1900, opexBudget: 350, capexBudget: 50, totalBudget: 2300 },
  { id: 'd3', name: 'Marketing', icon: 'Marketing', headcount: 12, avgSalary: 90, personnelBudget: 1080, opexBudget: 800, capexBudget: 30, totalBudget: 1910 },
  { id: 'd4', name: 'Operations', icon: 'Operations', headcount: 8, avgSalary: 85, personnelBudget: 680, opexBudget: 200, capexBudget: 100, totalBudget: 980 },
  { id: 'd5', name: 'HR', icon: 'HR', headcount: 5, avgSalary: 80, personnelBudget: 400, opexBudget: 120, capexBudget: 0, totalBudget: 520 },
  { id: 'd6', name: 'Finance', icon: 'Finance', headcount: 6, avgSalary: 100, personnelBudget: 600, opexBudget: 150, capexBudget: 20, totalBudget: 770 },
];


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 1) => n == null || isNaN(n) || !isFinite(n) ? '—' : n >= 1000 ? `$${(n / 1000).toFixed(d)}M` : `$${n.toFixed(0)}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n.toFixed(1)}%`;
const fmtN = (n: number) => n.toLocaleString();


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Annual Budget": "A financial plan outlining expected revenues and authorized expenditures for a fiscal year.",
  "Revenue Target": "Projected income from products/services. Broken down by stream and month.",
  "Personnel Budget": "Headcount × Average Salary. Typically 60–70% of total OpEx for tech companies.",
  "OpEx (Operating Expenses)": "Non-personnel recurring costs: software, rent, travel, professional fees.",
  "CapEx (Capital Expenditure)": "Long-term asset purchases: servers, equipment, office buildout. Depreciated over time.",
  "Contingency Reserve": "Buffer for unexpected costs, typically 5–10% of total budget.",
  "Variance Analysis": "Actual vs Budget comparison. Favorable = under budget, Unfavorable = over budget.",
  "Burn Rate": "Monthly cash outflow. Total Budget ÷ 12 = average monthly burn.",
  "Revenue per Employee": "Total Revenue ÷ Total Headcount. Efficiency metric.",
  "Operating Margin": "(Revenue − Total Expenses) ÷ Revenue. Profitability measure.",
  "Resource Allocation": "How budget is distributed across departments and expense categories.",
  "Fiscal Year": "12-month accounting period. May differ from calendar year.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Budget Planning Glossary</DialogTitle>
        <DialogDescription>Key budget planning terms</DialogDescription>
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

const BudgetGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Budget Planning Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">

          <div>
            <h3 className="font-semibold text-primary mb-3">Budget Planning Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Set Revenue Targets', desc: 'Define expected income by stream (products, services, licensing). Distribute monthly.' },
                { step: '2', title: 'Allocate Department Budgets', desc: 'Assign headcount, salaries, OpEx, and CapEx per department.' },
                { step: '3', title: 'Add Contingency', desc: 'Reserve 5–10% for unplanned expenses.' },
                { step: '4', title: 'Review P&L Summary', desc: 'Check operating margin, burn rate, and profitability.' },
                { step: '5', title: 'Track Variance', desc: 'Compare actual spend vs budget throughout the year.' },
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
                { label: 'Personnel Budget', formula: 'Headcount × Avg Salary', example: '35 × $130K = $4,550K' },
                { label: 'Total Dept Budget', formula: 'Personnel + OpEx + CapEx', example: '$4,550K + $420K + $180K = $5,150K' },
                { label: 'Total Budget', formula: 'Σ Department Budgets + Contingency', example: '$11,630K + $581K = $12,211K' },
                { label: 'Contingency', formula: 'Total Dept Budgets × Contingency %', example: '$11,630K × 5% = $581K' },
                { label: 'Operating Income', formula: 'Total Revenue − Total Expenses', example: '$11,500K − $12,211K = −$711K' },
                { label: 'Operating Margin', formula: 'Operating Income ÷ Revenue × 100', example: '−$711K ÷ $11,500K = −6.2%' },
                { label: 'Monthly Burn Rate', formula: 'Total Budget ÷ 12', example: '$12,211K ÷ 12 = $1,018K/mo' },
                { label: 'Revenue per Employee', formula: 'Total Revenue ÷ Total Headcount', example: '$11,500K ÷ 86 = $134K' },
                { label: 'Budget Variance', formula: 'Actual − Budget (negative = favorable)', example: '$4,800K − $5,150K = −$350K (7% under)' },
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
            <h3 className="font-semibold text-primary mb-3">Benchmarks by Industry</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b">
                  <th className="text-left p-2 font-semibold">Metric</th>
                  <th className="text-center p-2 font-semibold">SaaS</th>
                  <th className="text-center p-2 font-semibold">E-Commerce</th>
                  <th className="text-center p-2 font-semibold">Manufacturing</th>
                </tr></thead>
                <tbody>
                  {[
                    ['Personnel % of Revenue', '50–70%', '15–25%', '20–35%'],
                    ['Marketing % of Revenue', '15–25%', '10–20%', '3–8%'],
                    ['R&D % of Revenue', '15–25%', '5–10%', '3–8%'],
                    ['Operating Margin', '−20% to 20%', '5–15%', '10–20%'],
                    ['Revenue per Employee', '$100K–$300K', '$200K–$500K', '$150K–$300K'],
                  ].map(([metric, saas, ecom, mfg], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 font-medium">{metric}</td>
                      <td className="p-2 text-center font-mono">{saas}</td>
                      <td className="p-2 text-center font-mono">{ecom}</td>
                      <td className="p-2 text-center font-mono">{mfg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1e3a5f]/25 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> Start with revenue targets first, then work backward to determine affordable headcount and spend. Budget should support strategic priorities — not just be last year + inflation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// CSV UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════

function parseBudgetCSV(csvText: string): { departments: DepartmentBudget[]; revenue: RevenueStream[] } | null {
  const parsed = Papa.parse(csvText.trim(), { header: false, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 2) return null;
  const rows = parsed.data as string[][];
  const departments: DepartmentBudget[] = [];
  const revenue: RevenueStream[] = [];
  let section = '';
  for (const row of rows) {
    const first = (row[0] || '').trim().toLowerCase();
    if (first === 'department' || first === 'departments') { section = 'dept'; continue; }
    if (first === 'revenue' || first === 'revenue streams') { section = 'rev'; continue; }
    if (!row[0]?.trim()) continue;
    if (section === 'dept' && row.length >= 4) {
      const name = row[0].trim();
      const headcount = parseFloat(row[1]) || 0;
      const avgSalary = parseFloat(row[2]) || 0;
      const opex = parseFloat(row[3]) || 0;
      const capex = parseFloat(row[4]) || 0;
      const personnel = headcount * avgSalary;
      departments.push({
        id: `d${departments.length + 1}`, name, icon: name,
        headcount, avgSalary, personnelBudget: personnel,
        opexBudget: opex, capexBudget: capex, totalBudget: personnel + opex + capex,
      });
    }
    if (section === 'rev' && row.length >= 2) {
      revenue.push({
        id: `r${revenue.length + 1}`, name: row[0].trim(),
        annualTarget: parseFloat(row[1]) || 0,
        monthlyDistribution: [8, 8, 8, 8, 8, 8, 9, 9, 9, 8, 9, 8],
      });
    }
  }
  if (departments.length === 0 && revenue.length === 0) return null;
  return { departments: departments.length > 0 ? departments : DEFAULT_DEPARTMENTS, revenue: revenue.length > 0 ? revenue : DEFAULT_REVENUE };
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE CSV & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_BUDGET_CSV = `Departments
Department,Headcount,AvgSalary($K),OpEx($K),CapEx($K)
Engineering,35,130,420,180
Sales,20,95,350,50
Marketing,12,90,800,30
Operations,8,85,200,100
HR,5,80,120,0
Finance,6,100,150,20

Revenue Streams
Stream,AnnualTarget($K)
SaaS Subscriptions,8500
Professional Services,2200
Licensing & Royalties,800`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_BUDGET_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_budget.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Required Data Format
          </DialogTitle>
          <DialogDescription>
            Prepare your budget data in this format before uploading
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Structure overview */}
            <div>
              <h4 className="font-semibold text-sm mb-2">File Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">
                The CSV has two sections separated by section headers. The parser detects &quot;Departments&quot; and &quot;Revenue Streams&quot; headers automatically.
              </p>
            </div>

            {/* Section 1: Departments */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</span>
                Departments Section
              </h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 text-left font-semibold border-r">Department</th>
                      <th className="p-2 text-right">Headcount</th>
                      <th className="p-2 text-right">AvgSalary($K)</th>
                      <th className="p-2 text-right">OpEx($K)</th>
                      <th className="p-2 text-right">CapEx($K)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Engineering', '35', '130', '420', '180'],
                      ['Sales', '20', '95', '350', '50'],
                      ['Marketing', '12', '90', '800', '30'],
                      ['Operations', '8', '85', '200', '100'],
                      ['HR', '5', '80', '120', '0'],
                      ['Finance', '6', '100', '150', '20'],
                    ].map(([dept, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{dept}</td>
                        {vals.map((v, j) => <td key={j} className="p-2 text-right">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Personnel Budget is auto-calculated: Headcount × AvgSalary. Total = Personnel + OpEx + CapEx.</p>
            </div>

            {/* Section 2: Revenue */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</span>
                Revenue Streams Section
              </h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold border-r">Stream</th><th className="p-2 text-right">AnnualTarget($K)</th></tr></thead>
                  <tbody>
                    {[['SaaS Subscriptions', '8500'], ['Professional Services', '2200'], ['Licensing & Royalties', '800']].map(([name, val], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{name}</td>
                        <td className="p-2 text-right">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Monthly distribution defaults to even split. You can adjust per-month weights after upload.</p>
            </div>

            {/* Column Details */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Column Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'Department', required: true, desc: 'Name of the department or team' },
                  { name: 'Headcount', required: true, desc: 'Number of full-time employees' },
                  { name: 'AvgSalary($K)', required: true, desc: 'Average annual salary per employee in $K' },
                  { name: 'OpEx($K)', required: false, desc: 'Non-personnel operating expenses in $K' },
                  { name: 'CapEx($K)', required: false, desc: 'Capital expenditure in $K' },
                  { name: 'Stream', required: true, desc: 'Revenue stream / product name' },
                  { name: 'AnnualTarget($K)', required: true, desc: 'Annual revenue target in $K' },
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

            {/* Tips */}
            <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Section headers (&quot;Departments&quot; and &quot;Revenue Streams&quot;) must appear on their own row.</li>
                <li>• All monetary values should be in <strong>$K</strong> (thousands).</li>
                <li>• You can omit either section — only the provided section will be imported, defaults used for the rest.</li>
                <li>• Column names in the header row are for readability — the parser uses position (column order matters).</li>
                <li>• Empty rows are skipped automatically.</li>
              </ul>
            </div>

            {/* Download */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleDownloadSample}>
                <Download className="w-4 h-4 mr-2" />Download Sample CSV
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO PAGE — Two paths: Upload Data or Manual Input (DCF pattern)
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({
  onStartWithData,
  onStartManual,
  hasUploadedData,
  parseError
}: {
  onStartWithData: () => void;
  onStartManual: () => void;
  hasUploadedData: boolean;
  parseError: string | null;
}) => {
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl">Annual Budget Planning</CardTitle>
          <CardDescription className="text-base mt-2">
            Define financial goals, allocate resources, and track budget performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, title: 'Revenue Targets', desc: 'Set annual income goals by stream with monthly distribution' },
              { icon: Building2, title: 'Department Budgets', desc: 'Allocate personnel, OpEx, and CapEx per department' },
              { icon: BarChart3, title: 'P&L Dashboard', desc: 'Operating margin, burn rate, variance, and charts' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-2">
                <CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
              </Card>
            ))}
          </div>

          {/* ── Two Paths ── */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Path 1: Upload Data */}
            <Card className={`border-2 transition-all ${hasUploadedData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasUploadedData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Upload Budget Data</CardTitle>
                    <CardDescription className="text-xs">Import departments and revenue from CSV</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-primary">Data detected — ready to plan</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your uploaded budget data will be used to populate departments and revenue streams automatically.
                    </p>
                    <Button onClick={onStartWithData} className="w-full" size="lg">
                      <Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with department budgets and revenue streams to auto-populate the planning model.
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Departments | HC | Salary | OpEx | CapEx</p>
                      <p>Revenue Streams | Annual Target</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample
                    </Button>
                    {parseError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-xs text-destructive">{parseError}</p>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground text-center">
                      Upload your data file first, then come back here
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Path 2: Manual Input */}
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Start from Template</CardTitle>
                    <CardDescription className="text-xs">Pre-loaded SaaS company budget</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Start with a pre-filled SaaS company template and customize all departments, revenue streams, and assumptions.
                </p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />6 departments with headcount & salaries</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />3 revenue streams with monthly distribution</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Contingency, tax rate, inflation defaults</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Real-time calculation as you adjust</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg">
                  <Calculator className="w-4 h-4 mr-2" />Start with Defaults
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Bottom note */}
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Both paths lead to the same model. Uploading data simply pre-fills departments and revenue — you can always add, remove, or edit anything afterward.
            </p>
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

export default function BudgetPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: BudgetPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [assumptions, setAssumptions] = useState<BudgetAssumptions>(DEFAULT_ASSUMPTIONS);
  const [revenue, setRevenue] = useState<RevenueStream[]>(DEFAULT_REVENUE);
  const [departments, setDepartments] = useState<DepartmentBudget[]>(DEFAULT_DEPARTMENTS);

  // ── Computed ──
  const totalRevenue = useMemo(() => revenue.reduce((s, r) => s + r.annualTarget, 0), [revenue]);
  const totalHeadcount = useMemo(() => departments.reduce((s, d) => s + d.headcount, 0), [departments]);
  const totalPersonnel = useMemo(() => departments.reduce((s, d) => s + d.personnelBudget, 0), [departments]);
  const totalOpex = useMemo(() => departments.reduce((s, d) => s + d.opexBudget, 0), [departments]);
  const totalCapex = useMemo(() => departments.reduce((s, d) => s + d.capexBudget, 0), [departments]);
  const totalDeptBudget = useMemo(() => departments.reduce((s, d) => s + d.totalBudget, 0), [departments]);
  const contingency = useMemo(() => totalDeptBudget * (assumptions.contingencyPct / 100), [totalDeptBudget, assumptions.contingencyPct]);
  const totalBudget = useMemo(() => totalDeptBudget + contingency, [totalDeptBudget, contingency]);
  const operatingIncome = useMemo(() => totalRevenue - totalBudget, [totalRevenue, totalBudget]);
  const operatingMargin = useMemo(() => totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0, [operatingIncome, totalRevenue]);
  const monthlyBurn = useMemo(() => totalBudget / 12, [totalBudget]);
  const revenuePerEmployee = useMemo(() => totalHeadcount > 0 ? totalRevenue / totalHeadcount : 0, [totalRevenue, totalHeadcount]);

  // Monthly revenue
  const monthlyRevenue = useMemo(() => {
    return MONTHS.map((_, mi) => {
      let total = 0;
      for (const r of revenue) {
        const pct = r.monthlyDistribution[mi] || (100 / 12);
        total += r.annualTarget * (pct / 100);
      }
      return total;
    });
  }, [revenue]);

  // Monthly budget (evenly distributed)
  const monthlyBudgetArr = useMemo(() => MONTHS.map(() => totalBudget / 12), [totalBudget]);

  // Charts
  const monthlyChart = useMemo(() => MONTHS.map((m, i) => ({
    month: m, revenue: Math.round(monthlyRevenue[i]), expenses: Math.round(monthlyBudgetArr[i]),
    net: Math.round(monthlyRevenue[i] - monthlyBudgetArr[i]),
  })), [monthlyRevenue, monthlyBudgetArr]);

  const deptPieData = useMemo(() => departments.map((d, i) => ({
    name: d.name, value: d.totalBudget, fill: COLORS.departments[i % COLORS.departments.length],
  })), [departments]);

  const categoryPieData = useMemo(() => [
    { name: 'Personnel', value: totalPersonnel, fill: COLORS.personnel },
    { name: 'OpEx', value: totalOpex, fill: COLORS.opex },
    { name: 'CapEx', value: totalCapex, fill: COLORS.capex },
    { name: 'Contingency', value: contingency, fill: COLORS.contingency },
  ].filter(c => c.value > 0), [totalPersonnel, totalOpex, totalCapex, contingency]);

  const revenuePieData = useMemo(() => revenue.map((r, i) => ({
    name: r.name, value: r.annualTarget, fill: COLORS.departments[i % COLORS.departments.length],
  })), [revenue]);

  // Variance
  const hasVariance = useMemo(() => departments.some(d => d.actualSpend != null && d.actualSpend > 0), [departments]);
  const totalActual = useMemo(() => departments.reduce((s, d) => s + (d.actualSpend || 0), 0), [departments]);

  // ── Department CRUD ──
  const updateDept = useCallback((id: string, updates: Partial<DepartmentBudget>) => {
    setDepartments(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, ...updates };
      updated.personnelBudget = updated.headcount * updated.avgSalary;
      updated.totalBudget = updated.personnelBudget + updated.opexBudget + updated.capexBudget;
      return updated;
    }));
  }, []);

  const addDept = useCallback(() => {
    setDepartments(prev => [...prev, {
      id: `d${Date.now()}`, name: 'New Department', icon: 'General & Admin',
      headcount: 3, avgSalary: 80, personnelBudget: 240,
      opexBudget: 50, capexBudget: 0, totalBudget: 290,
    }]);
  }, []);

  const removeDept = useCallback((id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
  }, []);

  // ── Revenue CRUD ──
  const updateRevenue = useCallback((id: string, updates: Partial<RevenueStream>) => {
    setRevenue(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const addRevenue = useCallback(() => {
    setRevenue(prev => [...prev, {
      id: `r${Date.now()}`, name: 'New Stream', annualTarget: 500,
      monthlyDistribution: [8, 8, 8, 8, 8, 8, 9, 9, 9, 8, 9, 8],
    }]);
  }, []);

  const removeRevenue = useCallback((id: string) => {
    setRevenue(prev => prev.filter(r => r.id !== id));
  }, []);

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Budget_${assumptions.fiscalYear}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [assumptions.fiscalYear, toast]);

  const handleDownloadCSV = useCallback(() => {
    let csv = `ANNUAL BUDGET — ${assumptions.companyName} FY${assumptions.fiscalYear}\n\n`;
    csv += "REVENUE STREAMS\n";
    csv += Papa.unparse(revenue.map(r => ({ Stream: r.name, 'Annual Target ($K)': r.annualTarget }))) + "\n";
    csv += `Total Revenue,$${totalRevenue}K\n\n`;
    csv += "DEPARTMENT BUDGETS\n";
    csv += Papa.unparse(departments.map(d => ({
      Department: d.name, Headcount: d.headcount, 'Avg Salary ($K)': d.avgSalary,
      'Personnel ($K)': d.personnelBudget, 'OpEx ($K)': d.opexBudget, 'CapEx ($K)': d.capexBudget,
      'Total ($K)': d.totalBudget, ...(d.actualSpend != null ? { 'Actual ($K)': d.actualSpend, 'Variance ($K)': d.actualSpend - d.totalBudget } : {}),
    }))) + "\n";
    csv += `Total Dept Budget,$${totalDeptBudget}K\nContingency (${assumptions.contingencyPct}%),$${contingency.toFixed(0)}K\nTotal Budget,$${totalBudget.toFixed(0)}K\n\n`;
    csv += "SUMMARY\n";
    csv += `Operating Income,$${operatingIncome.toFixed(0)}K\nOperating Margin,${operatingMargin.toFixed(1)}%\nMonthly Burn,$${monthlyBurn.toFixed(0)}K\nRevenue/Employee,$${revenuePerEmployee.toFixed(0)}K\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Budget_${assumptions.fiscalYear}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [revenue, departments, assumptions, totalRevenue, totalDeptBudget, contingency, totalBudget, operatingIncome, operatingMargin, monthlyBurn, revenuePerEmployee, toast]);

  const handleStart = useCallback(() => setShowIntro(false), []);

  // Parse uploaded CSV data if available
  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    // Try to detect if data is budget format by checking for department/headcount columns
    try {
      const rawCSV = Papa.unparse(data);
      return parseBudgetCSV(rawCSV);
    } catch { return null; }
  }, [data]);

  const [parseError] = useState<string | null>(null);

  const applyUploadedData = useCallback(() => {
    if (parsedUpload) {
      setDepartments(parsedUpload.departments);
      setRevenue(parsedUpload.revenue);
    }
    setShowIntro(false);
  }, [parsedUpload]);

  if (showIntro) return (
    <IntroPage
      hasUploadedData={!!parsedUpload}
      parseError={parseError}
      onStartWithData={() => {
        applyUploadedData();
      }}
      onStartManual={handleStart}
    />
  );

  const isProfit = operatingIncome >= 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Annual Budget Planning</h1><p className="text-muted-foreground mt-1">{assumptions.companyName} — FY{assumptions.fiscalYear}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <BudgetGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Assumptions ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Budget Assumptions</CardTitle><CardDescription>Fiscal year settings and global parameters</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { key: 'companyName', label: 'Company', type: 'text' },
              { key: 'fiscalYear', label: 'Fiscal Year', type: 'number' },
              { key: 'inflationRate', label: 'Inflation %', type: 'number', step: 0.1 },
              { key: 'contingencyPct', label: 'Contingency %', type: 'number', step: 0.5 },
              { key: 'taxRate', label: 'Tax Rate %', type: 'number', step: 0.5 },
              { key: 'currency', label: 'Currency', type: 'text' },
            ].map(({ key, label, type, step }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium">{label}</Label>
                <Input
                  type={type} step={step}
                  value={(assumptions as any)[key]}
                  onChange={e => setAssumptions(prev => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ Summary Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />FY{assumptions.fiscalYear} Budget Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: fmt(totalRevenue), icon: TrendingUp },
                { label: 'Total Budget', value: fmt(totalBudget), icon: Wallet },
                { label: 'Operating Income', value: fmt(operatingIncome), icon: isProfit ? ArrowUpRight : ArrowDownRight },
                { label: 'Operating Margin', value: fmtP(operatingMargin), icon: Percent },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-primary">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
              {[
                { label: 'Headcount', value: `${totalHeadcount}` },
                { label: 'Monthly Burn', value: fmt(monthlyBurn) },
                { label: 'Rev/Employee', value: fmt(revenuePerEmployee) },
                { label: 'Contingency', value: fmt(contingency) },
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

      {/* ══ Revenue Targets ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Revenue Targets</CardTitle><CardDescription>{revenue.length} streams — Total: {fmt(totalRevenue)}</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={addRevenue}><Plus className="w-4 h-4 mr-1" />Add Stream</Button>
          </div>
        </CardHeader>
        <CardContent>
          {revenue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No revenue streams</p><Button variant="outline" size="sm" className="mt-2" onClick={addRevenue}><Plus className="w-4 h-4 mr-1" />Add Stream</Button></div>
          ) : (
            <div className="space-y-3">
              {revenue.map((r, ri) => (
                <div key={r.id} className="p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.departments[ri % COLORS.departments.length] }} />
                    <Input value={r.name} onChange={e => updateRevenue(r.id, { name: e.target.value })} className="h-8 text-sm font-medium flex-1" />
                    <Input type="number" value={r.annualTarget} onChange={e => updateRevenue(r.id, { annualTarget: parseFloat(e.target.value) || 0 })} className="h-8 w-28 text-right text-sm font-mono" />
                    <span className="text-xs text-muted-foreground w-6">$K</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRevenue(r.id)}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded-lg font-semibold">
                <span className="text-sm">Total Revenue</span>
                <span className="font-mono text-primary">{fmt(totalRevenue)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══ Department Budgets ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Department Budgets</CardTitle><CardDescription>{departments.length} departments — {totalHeadcount} employees — Total: {fmt(totalDeptBudget)}</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={addDept}><Plus className="w-4 h-4 mr-1" />Add Department</Button>
          </div>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No departments</p><Button variant="outline" size="sm" className="mt-2" onClick={addDept}><Plus className="w-4 h-4 mr-1" />Add Department</Button></div>
          ) : (
            <div className="space-y-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">HC</TableHead>
                      <TableHead className="text-right">Avg Salary</TableHead>
                      <TableHead className="text-right">Personnel</TableHead>
                      <TableHead className="text-right">OpEx</TableHead>
                      <TableHead className="text-right">CapEx</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                      {hasVariance && <TableHead className="text-right">Actual</TableHead>}
                      {hasVariance && <TableHead className="text-right">Variance</TableHead>}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((d, di) => {
                      const Icon = DEPT_ICONS[d.icon] || Building2;
                      const variance = d.actualSpend != null ? d.actualSpend - d.totalBudget : null;
                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <Input value={d.name} onChange={e => updateDept(d.id, { name: e.target.value })} className="h-7 text-sm border-0 bg-transparent p-0 font-medium" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right"><Input type="number" value={d.headcount} onChange={e => updateDept(d.id, { headcount: parseInt(e.target.value) || 0 })} className="h-7 w-16 text-right text-sm font-mono" /></TableCell>
                          <TableCell className="text-right"><Input type="number" value={d.avgSalary} onChange={e => updateDept(d.id, { avgSalary: parseFloat(e.target.value) || 0 })} className="h-7 w-20 text-right text-sm font-mono" /></TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmt(d.personnelBudget)}</TableCell>
                          <TableCell className="text-right"><Input type="number" value={d.opexBudget} onChange={e => updateDept(d.id, { opexBudget: parseFloat(e.target.value) || 0 })} className="h-7 w-20 text-right text-sm font-mono" /></TableCell>
                          <TableCell className="text-right"><Input type="number" value={d.capexBudget} onChange={e => updateDept(d.id, { capexBudget: parseFloat(e.target.value) || 0 })} className="h-7 w-20 text-right text-sm font-mono" /></TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">{fmt(d.totalBudget)}</TableCell>
                          {hasVariance && (
                            <TableCell className="text-right"><Input type="number" value={d.actualSpend || ''} onChange={e => updateDept(d.id, { actualSpend: parseFloat(e.target.value) || 0 })} className="h-7 w-20 text-right text-sm font-mono" placeholder="—" /></TableCell>
                          )}
                          {hasVariance && (
                            <TableCell className={`text-right font-mono text-sm ${variance != null ? (variance <= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                              {variance != null ? `${variance > 0 ? '+' : ''}${fmt(variance)}` : '—'}
                            </TableCell>
                          )}
                          <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDept(d.id)}><X className="w-3 h-3" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right font-mono">{totalHeadcount}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                      <TableCell className="text-right font-mono">{fmt(totalPersonnel)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(totalOpex)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(totalCapex)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{fmt(totalDeptBudget)}</TableCell>
                      {hasVariance && <TableCell className="text-right font-mono">{fmt(totalActual)}</TableCell>}
                      {hasVariance && <TableCell className={`text-right font-mono ${totalActual - totalDeptBudget <= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalActual > 0 ? `${totalActual - totalDeptBudget > 0 ? '+' : ''}${fmt(totalActual - totalDeptBudget)}` : '—'}</TableCell>}
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {!hasVariance && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => updateDept(departments[0].id, { actualSpend: 0 })}>
                  <Plus className="w-3 h-3 mr-1" />Add Actual Spend for Variance Tracking
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══ Calculation Breakdown ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Budget Calculation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {[
                  { label: 'Total Personnel', value: fmt(totalPersonnel), sub: `${totalHeadcount} employees`, color: '' },
                  { label: '(+) Total OpEx', value: fmt(totalOpex), color: '' },
                  { label: '(+) Total CapEx', value: fmt(totalCapex), color: '' },
                  { label: 'Total Department Budgets', value: fmt(totalDeptBudget), color: '', bold: true },
                  { label: `(+) Contingency (${assumptions.contingencyPct}%)`, value: fmt(contingency), color: '' },
                  { label: 'Total Budget', value: fmt(totalBudget), color: 'text-primary font-bold', bold: true },
                  { label: 'Total Revenue', value: fmt(totalRevenue), color: '' },
                  { label: 'Operating Income', value: fmt(operatingIncome), color: 'text-primary font-bold', final: true },
                ].map(({ label, value, sub, color, bold, final }, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                    <div>
                      <span className={`text-sm ${bold || final ? 'font-semibold' : ''}`}>{label}</span>
                      {sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}
                    </div>
                    <span className={`font-mono text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
              <p>Personnel = Σ(Headcount × Avg Salary) = {fmt(totalPersonnel)}</p>
              <p>Total Budget = ({fmt(totalPersonnel)} + {fmt(totalOpex)} + {fmt(totalCapex)}) × (1 + {fmtP(assumptions.contingencyPct)}) = {fmt(totalBudget)}</p>
              <p className="text-primary font-semibold">
                Operating Income = {fmt(totalRevenue)} − {fmt(totalBudget)} = {fmt(operatingIncome)} ({fmtP(operatingMargin)} margin)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Budget Report</h2><p className="text-sm text-muted-foreground">Charts, allocation, and summary</p></div>
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
          <h2 className="text-2xl font-bold">{assumptions.companyName} — FY{assumptions.fiscalYear} Budget</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {totalHeadcount} employees | {departments.length} departments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: `${departments.length} departments`, color: isProfit ? 'text-green-600' : 'text-primary' },
            { label: 'Total Budget', value: fmt(totalBudget), sub: `Contingency: ${fmt(contingency)}`, color: 'text-primary' },
            { label: 'Operating Income', value: fmt(operatingIncome), sub: `${fmtP(operatingMargin)} margin`, color: isProfit ? 'text-green-600' : 'text-red-600' },
            { label: 'Monthly Burn', value: fmt(monthlyBurn), sub: `${totalHeadcount} employees`, color: 'text-primary' },
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
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Budget analysis highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(isProfit
                    ? `Profitable budget with operating margin of ${fmtP(operatingMargin)} and ${fmt(operatingIncome)} net income.`
                    : `Growth-stage budget with planned deficit of ${fmt(Math.abs(operatingIncome))} (${fmtP(Math.abs(operatingMargin))} negative margin).`);
                  const personnelPct = totalDeptBudget > 0 ? (totalPersonnel / totalDeptBudget) * 100 : 0;
                  items.push(`Personnel costs represent ${personnelPct.toFixed(0)}% of department budgets (${fmt(totalPersonnel)}) across ${totalHeadcount} employees.`);
                  items.push(`Revenue efficiency: ${fmt(revenuePerEmployee)} per employee. Monthly burn rate: ${fmt(monthlyBurn)}.`);
                  if (departments.length > 0) {
                    const largest = departments.reduce((a, b) => a.totalBudget > b.totalBudget ? a : b);
                    const largestPct = totalDeptBudget > 0 ? (largest.totalBudget / totalDeptBudget * 100) : 0;
                    items.push(`Largest department: ${largest.name} at ${fmt(largest.totalBudget)} (${largestPct.toFixed(0)}% of total spend).`);
                  }
                  if (assumptions.contingencyPct > 0) items.push(`Contingency reserve of ${assumptions.contingencyPct}% (${fmt(contingency)}) budgeted for unexpected costs.`);
                  if (hasVariance && totalActual > 0) {
                    const varPct = ((totalActual - totalDeptBudget) / totalDeptBudget * 100);
                    items.push(`Actual spending ${varPct <= 0 ? 'favorable' : 'unfavorable'} by ${Math.abs(varPct).toFixed(1)}% vs budget (${fmt(totalActual)} vs ${fmt(totalDeptBudget)}).`);
                  }
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Budget Detail */}
        <Card>
          <CardHeader><CardTitle>Department Budget Detail</CardTitle><CardDescription>Budget by department with category breakdown and variance</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Department</th>
              <th className="p-2 text-right font-semibold">HC</th>
              <th className="p-2 text-right font-semibold">Personnel</th>
              <th className="p-2 text-right font-semibold">OpEx</th>
              <th className="p-2 text-right font-semibold">CapEx</th>
              <th className="p-2 text-right font-semibold">Total Budget</th>
              {hasVariance && <th className="p-2 text-right font-semibold">Actual</th>}
              {hasVariance && <th className="p-2 text-right font-semibold">Variance</th>}
              <th className="p-2 text-right font-semibold">% of Total</th>
            </tr></thead>
            <tbody>{departments.map((d, i) => {
              const pctOfTotal = totalDeptBudget > 0 ? (d.totalBudget / totalDeptBudget * 100) : 0;
              const variance = d.actualSpend ? d.actualSpend - d.totalBudget : 0;
              return (
                <tr key={d.id} className="border-b">
                  <td className="p-2 font-medium">{d.name}</td>
                  <td className="p-2 text-right font-mono">{d.headcount}</td>
                  <td className="p-2 text-right font-mono">{fmt(d.personnelBudget)}</td>
                  <td className="p-2 text-right font-mono">{fmt(d.opexBudget)}</td>
                  <td className="p-2 text-right font-mono">{fmt(d.capexBudget)}</td>
                  <td className="p-2 text-right font-mono font-semibold">{fmt(d.totalBudget)}</td>
                  {hasVariance && <td className="p-2 text-right font-mono">{d.actualSpend ? fmt(d.actualSpend) : '—'}</td>}
                  {hasVariance && <td className={`p-2 text-right font-mono font-semibold ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}`}>{d.actualSpend ? `${variance >= 0 ? '+' : ''}${fmt(variance)}` : '—'}</td>}
                  <td className="p-2 text-right font-mono">{pctOfTotal.toFixed(1)}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total</td>
              <td className="p-2 text-right font-mono">{totalHeadcount}</td>
              <td className="p-2 text-right font-mono">{fmt(totalPersonnel)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalOpex)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalCapex)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalDeptBudget)}</td>
              {hasVariance && <td className="p-2 text-right font-mono">{fmt(totalActual)}</td>}
              {hasVariance && <td className={`p-2 text-right font-mono font-semibold ${totalActual - totalDeptBudget > 0 ? 'text-red-600' : 'text-green-600'}`}>{totalActual > 0 ? `${totalActual - totalDeptBudget >= 0 ? '+' : ''}${fmt(totalActual - totalDeptBudget)}` : '—'}</td>}
              <td className="p-2 text-right font-mono">100.0%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Monthly Revenue vs Expenses */}
        <Card>
          <CardHeader><CardTitle>Monthly Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${fmtN(v)}K`, '']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill={COLORS.expense} radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Line dataKey="net" name="Net" type="monotone" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Charts */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'By Department', data: deptPieData },
            { title: 'By Category', data: categoryPieData },
            { title: 'Revenue Streams', data: revenuePieData },
          ].map(({ title, data: pieData }) => (
            <Card key={title}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`$${fmtN(v)}K`, '']} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Department Bar Chart */}
        <Card>
          <CardHeader><CardTitle>Department Budget Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departments.map(d => ({ name: d.name, Personnel: d.personnelBudget, OpEx: d.opexBudget, CapEx: d.capexBudget }))} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `$${v}K`} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip formatter={(v: any) => [`$${fmtN(v)}K`, '']} />
                  <Legend />
                  <Bar dataKey="Personnel" stackId="a" fill={COLORS.personnel} />
                  <Bar dataKey="OpEx" stackId="a" fill={COLORS.opex} />
                  <Bar dataKey="CapEx" stackId="a" fill={COLORS.capex} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Budget Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">FY{assumptions.fiscalYear} Annual Budget — {assumptions.companyName}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The FY{assumptions.fiscalYear} budget projects total revenue of <strong>{fmt(totalRevenue)}</strong> across {revenue.length} revenue stream{revenue.length !== 1 ? 's' : ''}{revenue.length > 0 ? `, led by ${revenue.reduce((best, r) => r.annualTarget > best.annualTarget ? r : best, revenue[0]).name} (${fmt(revenue.reduce((best, r) => r.annualTarget > best.annualTarget ? r : best, revenue[0]).annualTarget)})` : ''}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Total budgeted expenses are <strong>{fmt(totalBudget)}</strong>, consisting of {fmt(totalPersonnel)} in personnel costs ({totalHeadcount} employees), {fmt(totalOpex)} in operating expenses, {fmt(totalCapex)} in capital expenditure, and {fmt(contingency)} contingency reserve ({assumptions.contingencyPct}%).
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The largest department by budget is <strong>{departments.reduce((best, d) => d.totalBudget > best.totalBudget ? d : best, departments[0])?.name}</strong> ({fmt(departments.reduce((best, d) => d.totalBudget > best.totalBudget ? d : best, departments[0])?.totalBudget)}), representing {totalDeptBudget > 0 ? ((departments.reduce((best, d) => d.totalBudget > best.totalBudget ? d : best, departments[0])?.totalBudget / totalDeptBudget) * 100).toFixed(0) : 0}% of department budgets. Personnel costs represent {totalDeptBudget > 0 ? ((totalPersonnel / totalDeptBudget) * 100).toFixed(0) : 0}% of total department spending.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {isProfit
                    ? <>This budget achieves an <strong>operating margin of {fmtP(operatingMargin)}</strong> with monthly burn rate of {fmt(monthlyBurn)} and revenue per employee of {fmt(revenuePerEmployee)}.</>
                    : <>This is a <strong>growth-stage budget with a planned deficit of {fmt(Math.abs(operatingIncome))}</strong> ({fmtP(Math.abs(operatingMargin))} negative margin). Monthly burn rate is {fmt(monthlyBurn)}. Revenue per employee is {fmt(revenuePerEmployee)}.</>
                  }
                </p>
                {hasVariance && totalActual > 0 && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong>Variance Analysis:</strong> Actual department spending of {fmt(totalActual)} vs budget of {fmt(totalDeptBudget)} represents a {((totalActual - totalDeptBudget) / totalDeptBudget * 100).toFixed(1)}% {totalActual <= totalDeptBudget ? 'favorable' : 'unfavorable'} variance.
                  </p>
                )}
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
'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Target, BookOpen, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, AlertTriangle, Calculator, Percent, Building2,
  Lightbulb, ChevronRight, Upload, BarChart3, Plus, X,
  Settings2, ArrowUpRight, ArrowDownRight, CheckCircle2,
  Filter, Tag, Search, AlertCircle, ArrowRight, Layers,
  Eye, EyeOff, Minus, TriangleAlert, TrendingDown, Scale, Zap
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
  AreaChart, Area
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type CauseTag = 'Volume' | 'Price' | 'Mix' | 'Timing' | 'One-off' | 'Efficiency' | 'Market' | 'FX' | '';

interface LineItem {
  id: string;
  category: 'revenue' | 'cogs' | 'opex';
  name: string;
  isSubtotal: boolean;
  // 12 months + annual
  budget: number[];           // 12 values ($K)
  actual: number[];           // 12 values ($K)
  causeTag: CauseTag;
  notes: string;
}

interface VarianceAssumptions {
  fiscalYear: number;
  companyName: string;
  currentMonth: number;           // 0-11, how many months of actuals
  materialityThreshold: number;   // $ amount — hide variances below this
  showFavorableOnly: boolean;
  showUnfavorableOnly: boolean;
}

interface VariancePageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CAUSE_TAGS: CauseTag[] = ['Volume', 'Price', 'Mix', 'Timing', 'One-off', 'Efficiency', 'Market', 'FX'];

const CAUSE_COLORS: Record<CauseTag, string> = {
  'Volume': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Price': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Mix': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Timing': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'One-off': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Efficiency': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Market': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'FX': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  '': '',
};

const DEFAULT_ASSUMPTIONS: VarianceAssumptions = {
  fiscalYear: new Date().getFullYear(),
  companyName: 'Acme Corp',
  currentMonth: 6,
  materialityThreshold: 0,
  showFavorableOnly: false,
  showUnfavorableOnly: false,
};

function rng(base: number, pct = 0.08) { return Math.round(base * (1 - pct + Math.random() * 2 * pct)); }

function buildDefaultItems(): LineItem[] {
  const s = [0.88, 0.90, 0.95, 0.98, 1.00, 1.02, 1.05, 1.08, 1.05, 1.02, 0.98, 1.09];
  const mk = (id: string, cat: 'revenue'|'cogs'|'opex', name: string, base: number, sub = false, tag: CauseTag = ''): LineItem => ({
    id, category: cat, name, isSubtotal: sub, causeTag: tag, notes: '',
    budget: s.map(sv => Math.round(base * sv)),
    actual: s.map(sv => rng(Math.round(base * sv))),
  });
  return [
    mk('r1', 'revenue', 'Product Revenue', 800, false, 'Volume'),
    mk('r2', 'revenue', 'Service Revenue', 300, false, 'Price'),
    mk('r3', 'revenue', 'Licensing Revenue', 100, false, ''),
    mk('c1', 'cogs', 'Direct Materials', 240, false, 'Market'),
    mk('c2', 'cogs', 'Direct Labor', 120, false, 'Efficiency'),
    mk('c3', 'cogs', 'Manufacturing Overhead', 60, false, ''),
    mk('o1', 'opex', 'Sales & Marketing', 180, false, 'Volume'),
    mk('o2', 'opex', 'R&D', 130, false, 'Timing'),
    mk('o3', 'opex', 'General & Admin', 80, false, ''),
    mk('o4', 'opex', 'Rent & Facilities', 40, false, ''),
    mk('o5', 'opex', 'Professional Fees', 25, false, 'One-off'),
  ];
}


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) => n == null || isNaN(n) || !isFinite(n) ? '—' : Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(d)}M` : `$${n.toLocaleString()}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const sum = (arr: number[], start: number, end: number) => arr.slice(start, end).reduce((s, v) => s + v, 0);


// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseVarianceCSV(csvText: string): LineItem[] | null {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 3) return null;
  const rows = parsed.data as Record<string, string>[];
  const items: LineItem[] = [];
  for (const row of rows) {
    const name = (row['Item'] || row['Name'] || row['LineItem'] || '').trim();
    if (!name) continue;
    const catRaw = (row['Category'] || row['Type'] || '').trim().toLowerCase();
    const category = catRaw.startsWith('rev') ? 'revenue' : catRaw.startsWith('cog') ? 'cogs' : 'opex';
    const budget: number[] = [];
    const actual: number[] = [];
    for (const m of MONTHS) {
      budget.push(parseFloat(row[`Budget_${m}`] || row[`B_${m}`]) || 0);
      actual.push(parseFloat(row[`Actual_${m}`] || row[`A_${m}`]) || 0);
    }
    items.push({ id: `i${items.length}`, category, name, isSubtotal: false, budget, actual, causeTag: '', notes: '' });
  }
  return items.length >= 3 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Variance": "The difference between actual and budgeted amounts. Favorable = better than planned, Unfavorable = worse.",
  "Favorable Variance": "Revenue higher than budget OR expense lower than budget. Indicates positive performance.",
  "Unfavorable Variance": "Revenue lower than budget OR expense higher than budget. Requires investigation.",
  "Materiality Threshold": "Minimum $ or % variance to flag for review. Filters out noise.",
  "Root Cause Tag": "Classification of why the variance occurred: Volume, Price, Mix, Timing, One-off, Efficiency, Market, FX.",
  "Volume Variance": "Caused by selling more or fewer units than planned.",
  "Price Variance": "Caused by actual prices differing from budgeted prices.",
  "Mix Variance": "Caused by different product/customer mix than planned.",
  "Timing Variance": "Expense or revenue recognized in a different period than budgeted.",
  "One-off": "Non-recurring item not in the original budget.",
  "YTD Variance": "Cumulative variance from start of year through current month.",
  "Waterfall": "Chart showing how budget walks to actual through individual variances.",
  "Gross Profit": "Revenue − COGS. First-level profitability.",
  "Operating Income": "Gross Profit − OpEx. Core business profitability.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Variance Analysis Glossary</DialogTitle>
        <DialogDescription>Key terms and definitions</DialogDescription>
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

const VarianceGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Variance Analysis Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">

          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Input Budget & Actuals', desc: 'Enter original budget and realized actuals by line item and month.' },
                { step: '2', title: 'Identify Material Variances', desc: 'Use threshold filter to surface only significant deviations.' },
                { step: '3', title: 'Tag Root Causes', desc: 'Classify each variance: Volume, Price, Mix, Timing, One-off, Efficiency, Market, FX.' },
                { step: '4', title: 'Analyze Trends', desc: 'Is the variance getting better or worse month-over-month?' },
                { step: '5', title: 'Take Action', desc: 'Document findings and corrective actions in notes.' },
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
                { label: 'Variance ($)', formula: 'Actual − Budget', example: '$1,120K − $1,056K = +$64K' },
                { label: 'Variance (%)', formula: '(Actual − Budget) ÷ |Budget| × 100', example: '+$64K ÷ $1,056K = +6.1%' },
                { label: 'Favorable (Revenue)', formula: 'Actual > Budget → positive', example: 'Rev Actual $1,120K > Budget $1,056K → Favorable' },
                { label: 'Favorable (Expense)', formula: 'Actual < Budget → positive', example: 'OpEx Actual $490K < Budget $520K → Favorable' },
                { label: 'YTD Variance', formula: 'Σ Monthly Variances (Month 1 to Current)', example: '+$64K + $30K + ... = +$174K' },
                { label: 'Gross Profit Variance', formula: 'Revenue Var − COGS Var', example: '+$174K − (+$45K) = +$129K' },
                { label: 'Operating Income Var', formula: 'GP Var − OpEx Var', example: '+$129K − (+$32K) = +$97K' },
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
            <h3 className="font-semibold text-primary mb-3">Root Cause Tags</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { tag: 'Volume', desc: 'Units sold ≠ plan' },
                { tag: 'Price', desc: 'Selling/cost price ≠ plan' },
                { tag: 'Mix', desc: 'Product/customer mix shift' },
                { tag: 'Timing', desc: 'Revenue/cost in wrong period' },
                { tag: 'One-off', desc: 'Non-recurring item' },
                { tag: 'Efficiency', desc: 'Productivity gain/loss' },
                { tag: 'Market', desc: 'External market change' },
                { tag: 'FX', desc: 'Currency impact' },
              ].map(({ tag, desc }) => (
                <div key={tag} className="p-2 rounded-lg border text-xs">
                  <Badge className={`text-[10px] ${CAUSE_COLORS[tag as CauseTag]}`}>{tag}</Badge>
                  <p className="text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> Start with the largest absolute-dollar variances, not percentages. A 50% variance on a $10K item matters less than a 3% variance on a $5M item. Use materiality filter to focus attention.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE CSV & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_VARIANCE_CSV = `Item,Category,Budget_Jan,Budget_Feb,Budget_Mar,Budget_Apr,Budget_May,Budget_Jun,Budget_Jul,Budget_Aug,Budget_Sep,Budget_Oct,Budget_Nov,Budget_Dec,Actual_Jan,Actual_Feb,Actual_Mar,Actual_Apr,Actual_May,Actual_Jun,Actual_Jul,Actual_Aug,Actual_Sep,Actual_Oct,Actual_Nov,Actual_Dec
Product Revenue,Revenue,704,720,760,784,800,816,840,864,840,816,784,872,680,745,735,810,820,840,860,880,850,830,790,895
Service Revenue,Revenue,264,270,285,294,300,306,315,324,315,306,294,327,270,260,290,305,295,320,310,330,310,300,290,340
Direct Materials,COGS,211,216,228,235,240,245,252,259,252,245,235,262,205,225,220,245,235,255,248,265,255,240,230,270
Direct Labor,COGS,106,108,114,118,120,122,126,130,126,122,118,131,100,112,108,122,118,128,125,132,128,120,115,135
Sales & Marketing,OpEx,158,162,171,176,180,184,189,194,189,184,176,196,150,168,165,182,175,190,185,200,192,180,172,205
R&D,OpEx,114,117,124,127,130,133,137,140,137,133,127,142,118,115,130,125,135,130,140,138,135,135,130,145
General & Admin,OpEx,70,72,76,78,80,82,84,86,84,82,78,87,68,75,72,80,78,85,82,88,85,80,76,90`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_VARIANCE_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_variance.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Required Data Format</DialogTitle>
          <DialogDescription>Prepare your variance data in this format before uploading</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">One row per line item. Each row has 12 budget columns and 12 actual columns, one per month.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Item</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-right">Budget_Jan</th>
                    <th className="p-2 text-right">...</th>
                    <th className="p-2 text-right">Budget_Dec</th>
                    <th className="p-2 text-right border-l">Actual_Jan</th>
                    <th className="p-2 text-right">...</th>
                    <th className="p-2 text-right">Actual_Dec</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Product Revenue', 'Revenue', '704', '...', '872', '680', '...', '895'],
                      ['Direct Materials', 'COGS', '211', '...', '262', '205', '...', '270'],
                      ['Sales & Marketing', 'OpEx', '158', '...', '196', '150', '...', '205'],
                    ].map(([item, cat, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{item}</td>
                        <td className="p-2">{cat}</td>
                        {vals.map((v, j) => <td key={j} className={`p-2 text-right ${j === 3 ? 'border-l' : ''}`}>{v}</td>)}
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
                  { name: 'Item', required: true, desc: 'Line item name (e.g., Product Revenue, Direct Materials)' },
                  { name: 'Category', required: true, desc: 'One of: Revenue, COGS, OpEx' },
                  { name: 'Budget_Jan...Dec', required: true, desc: 'Monthly budget amounts ($K)' },
                  { name: 'Actual_Jan...Dec', required: true, desc: 'Monthly actual amounts ($K)' },
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
                <li>• Category must be Revenue, COGS, or OpEx (case-insensitive).</li>
                <li>• Column names: Budget_Jan, Budget_Feb, ... or B_Jan, B_Feb, ...</li>
                <li>• At least 3 line items required.</li>
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
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Scale className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Variance Analysis</CardTitle>
          <CardDescription className="text-base mt-2">Deep-dive into actual vs budget performance with root cause analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: BarChart3, title: 'Line-Item Drill-Down', desc: 'Revenue, COGS, and OpEx by individual line item' },
              { icon: Tag, title: 'Root Cause Tagging', desc: 'Classify variances: Volume, Price, Mix, Timing, etc.' },
              { icon: Filter, title: 'Materiality Filter', desc: 'Surface only significant variances that matter' },
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
                  <div><CardTitle className="text-base">Upload Variance Data</CardTitle><CardDescription className="text-xs">Import budget and actuals from CSV</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected — ready to analyze</span></div>
                    <p className="text-xs text-muted-foreground">Your uploaded data will populate budget and actual columns automatically.</p>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with monthly budget and actual amounts per line item.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Item | Category | Budget_Jan..Dec | Actual_Jan..Dec</p>
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
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">Pre-loaded sample company data</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Start with a sample company that has 11 line items across Revenue, COGS, and OpEx with 12 months of budget vs actuals.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />3 revenue streams, 3 COGS items, 5 OpEx items</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />12 months budget and actuals</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Root cause tags and materiality filter</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Waterfall, trend, and P&L breakdown</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Both paths lead to the same analysis. Uploading data pre-fills all values — you can always edit, add, or remove line items afterward.</p>
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

export default function VariancePage({ data, numericHeaders, categoricalHeaders, onLoadExample }: VariancePageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const [assumptions, setAssumptions] = useState<VarianceAssumptions>(DEFAULT_ASSUMPTIONS);
  const [items, setItems] = useState<LineItem[]>(buildDefaultItems);

  // Parse uploaded CSV
  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try { const raw = Papa.unparse(data); return parseVarianceCSV(raw); } catch { return null; }
  }, [data]);

  const [parseError] = useState<string | null>(null);

  const applyUpload = useCallback(() => {
    if (parsedUpload) setItems(parsedUpload);
    setShowIntro(false);
  }, [parsedUpload]);

  // ── Computed aggregates ──
  const cm = assumptions.currentMonth; // how many months

  const byCategory = useMemo(() => {
    const rev = items.filter(i => i.category === 'revenue');
    const cogs = items.filter(i => i.category === 'cogs');
    const opex = items.filter(i => i.category === 'opex');
    return { rev, cogs, opex };
  }, [items]);

  const ytd = useMemo(() => {
    const calc = (arr: LineItem[]) => ({
      budget: arr.reduce((s, i) => s + sum(i.budget, 0, cm), 0),
      actual: arr.reduce((s, i) => s + sum(i.actual, 0, cm), 0),
    });
    const rev = calc(byCategory.rev);
    const cogs = calc(byCategory.cogs);
    const opex = calc(byCategory.opex);
    const gp = { budget: rev.budget - cogs.budget, actual: rev.actual - cogs.actual };
    const oi = { budget: gp.budget - opex.budget, actual: gp.actual - opex.actual };
    return { rev, cogs, opex, gp, oi };
  }, [byCategory, cm]);

  const annual = useMemo(() => {
    const calc = (arr: LineItem[]) => ({
      budget: arr.reduce((s, i) => s + sum(i.budget, 0, 12), 0),
      actual: arr.reduce((s, i) => s + sum(i.actual, 0, 12), 0),
    });
    const rev = calc(byCategory.rev);
    const cogs = calc(byCategory.cogs);
    const opex = calc(byCategory.opex);
    const gp = { budget: rev.budget - cogs.budget, actual: rev.actual - cogs.actual };
    const oi = { budget: gp.budget - opex.budget, actual: gp.actual - opex.actual };
    return { rev, cogs, opex, gp, oi };
  }, [byCategory]);

  // Monthly variance trend (revenue)
  const monthlyVariance = useMemo(() => MONTHS.slice(0, cm).map((m, mi) => {
    const bRev = byCategory.rev.reduce((s, i) => s + i.budget[mi], 0);
    const aRev = byCategory.rev.reduce((s, i) => s + i.actual[mi], 0);
    const bCOGS = byCategory.cogs.reduce((s, i) => s + i.budget[mi], 0);
    const aCOGS = byCategory.cogs.reduce((s, i) => s + i.actual[mi], 0);
    const bOpex = byCategory.opex.reduce((s, i) => s + i.budget[mi], 0);
    const aOpex = byCategory.opex.reduce((s, i) => s + i.actual[mi], 0);
    return {
      month: m,
      revVar: aRev - bRev,
      cogsVar: aCOGS - bCOGS,
      gpVar: (aRev - aCOGS) - (bRev - bCOGS),
      opexVar: aOpex - bOpex,
      oiVar: (aRev - aCOGS - aOpex) - (bRev - bCOGS - bOpex),
    };
  }), [byCategory, cm]);

  // Waterfall
  const waterfallData = useMemo(() => {
    const result: { name: string; value: number; isTotal?: boolean; fill: string }[] = [];
    result.push({ name: 'Budget OI', value: ytd.oi.budget, isTotal: true, fill: '#94a3b8' });
    // Group by category
    const revVar = ytd.rev.actual - ytd.rev.budget;
    const cogsVar = ytd.cogs.actual - ytd.cogs.budget;
    const opexVar = ytd.opex.actual - ytd.opex.budget;
    result.push({ name: 'Revenue', value: revVar, fill: revVar >= 0 ? '#0d9488' : '#e57373' });
    result.push({ name: 'COGS', value: -cogsVar, fill: cogsVar <= 0 ? '#0d9488' : '#e57373' }); // negative COGS variance is favorable
    result.push({ name: 'OpEx', value: -opexVar, fill: opexVar <= 0 ? '#0d9488' : '#e57373' });
    result.push({ name: 'Actual OI', value: ytd.oi.actual, isTotal: true, fill: '#1e3a5f' });
    return result;
  }, [ytd]);

  // Item-level variance for table
  const itemVariances = useMemo(() => items.map(item => {
    const b = sum(item.budget, 0, cm);
    const a = sum(item.actual, 0, cm);
    const diff = a - b;
    const pct = b !== 0 ? (diff / Math.abs(b)) * 100 : 0;
    const isExpense = item.category === 'cogs' || item.category === 'opex';
    const favorable = isExpense ? diff < 0 : diff > 0;
    return { ...item, ytdBudget: b, ytdActual: a, variance: diff, variancePct: pct, favorable };
  }), [items, cm]);

  // Filter
  const filteredVariances = useMemo(() => {
    let filtered = itemVariances;
    if (assumptions.materialityThreshold > 0) {
      filtered = filtered.filter(v => Math.abs(v.variance) >= assumptions.materialityThreshold);
    }
    if (assumptions.showFavorableOnly) filtered = filtered.filter(v => v.favorable);
    if (assumptions.showUnfavorableOnly) filtered = filtered.filter(v => !v.favorable);
    return filtered;
  }, [itemVariances, assumptions]);

  // ── CRUD ──
  const updateItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const updateItemMonth = useCallback((id: string, field: 'budget' | 'actual', mi: number, value: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const arr = [...i[field]];
      arr[mi] = value;
      return { ...i, [field]: arr };
    }));
  }, []);

  const addItem = useCallback((category: 'revenue' | 'cogs' | 'opex') => {
    setItems(prev => [...prev, {
      id: `i${Date.now()}`, category, name: 'New Item', isSubtotal: false,
      budget: Array(12).fill(0), actual: Array(12).fill(0), causeTag: '', notes: '',
    }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Variance_${assumptions.fiscalYear}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [assumptions.fiscalYear, toast]);

  const handleDownloadCSV = useCallback(() => {
    const rows = itemVariances.map(v => ({
      Item: v.name, Category: v.category, 'YTD Budget ($K)': v.ytdBudget, 'YTD Actual ($K)': v.ytdActual,
      'Variance ($K)': v.variance, 'Variance (%)': `${v.variancePct.toFixed(1)}%`,
      'Favorable': v.favorable ? 'Yes' : 'No', 'Cause': v.causeTag, 'Notes': v.notes,
    }));
    let csv = `VARIANCE ANALYSIS — ${assumptions.companyName} FY${assumptions.fiscalYear}\n`;
    csv += `Months: 1-${cm} | Threshold: $${assumptions.materialityThreshold}K\n\n`;
    csv += Papa.unparse(rows) + '\n\n';
    csv += `YTD Revenue Variance,$${ytd.rev.actual - ytd.rev.budget}K\n`;
    csv += `YTD Gross Profit Variance,$${ytd.gp.actual - ytd.gp.budget}K\n`;
    csv += `YTD Operating Income Variance,$${ytd.oi.actual - ytd.oi.budget}K\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Variance_${assumptions.fiscalYear}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [itemVariances, assumptions, cm, ytd, toast]);

  // ─── Intro ───
  if (showIntro) return (
    <IntroPage hasUploadedData={!!parsedUpload} parseError={parseError} onStartWithData={applyUpload} onStartManual={() => setShowIntro(false)} />
  );

  const varFn = (a: number, b: number) => b !== 0 ? ((a - b) / Math.abs(b) * 100) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Variance Analysis</h1><p className="text-muted-foreground mt-1">{assumptions.companyName} — FY{assumptions.fiscalYear} | Months 1–{cm}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <VarianceGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Analysis Settings</CardTitle><CardDescription>Period, filters, and thresholds</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={assumptions.companyName} onChange={e => setAssumptions(p => ({ ...p, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Fiscal Year</Label><Input type="number" value={assumptions.fiscalYear} onChange={e => setAssumptions(p => ({ ...p, fiscalYear: parseInt(e.target.value) || 2025 }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Months Analyzed</Label>
              <div className="flex items-center gap-2">
                <Slider value={[assumptions.currentMonth]} onValueChange={([v]) => setAssumptions(p => ({ ...p, currentMonth: v }))} min={1} max={12} step={1} className="flex-1" />
                <span className="text-sm font-mono w-6">{cm}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Materiality ($K)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[assumptions.materialityThreshold]} onValueChange={([v]) => setAssumptions(p => ({ ...p, materialityThreshold: v }))} min={0} max={200} step={5} className="flex-1" />
                <span className="text-sm font-mono w-10">${assumptions.materialityThreshold}K</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Filter</Label>
              <div className="flex gap-1">
                <Button variant={!assumptions.showFavorableOnly && !assumptions.showUnfavorableOnly ? 'default' : 'outline'} size="sm" className="text-xs flex-1 h-8" onClick={() => setAssumptions(p => ({ ...p, showFavorableOnly: false, showUnfavorableOnly: false }))}>All</Button>
                <Button variant={assumptions.showFavorableOnly ? 'default' : 'outline'} size="sm" className="text-xs flex-1 h-8" onClick={() => setAssumptions(p => ({ ...p, showFavorableOnly: true, showUnfavorableOnly: false }))}>Fav</Button>
                <Button variant={assumptions.showUnfavorableOnly ? 'default' : 'outline'} size="sm" className="text-xs flex-1 h-8" onClick={() => setAssumptions(p => ({ ...p, showFavorableOnly: false, showUnfavorableOnly: true }))}>Unfav</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />YTD Variance Summary — Months 1–{cm}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Revenue Var', budget: ytd.rev.budget, actual: ytd.rev.actual, expense: false },
                { label: 'COGS Var', budget: ytd.cogs.budget, actual: ytd.cogs.actual, expense: true },
                { label: 'GP Var', budget: ytd.gp.budget, actual: ytd.gp.actual, expense: false },
                { label: 'OpEx Var', budget: ytd.opex.budget, actual: ytd.opex.actual, expense: true },
                { label: 'OI Var', budget: ytd.oi.budget, actual: ytd.oi.actual, expense: false },
              ].map(({ label, budget, actual, expense }) => {
                const diff = actual - budget;
                const favorable = expense ? diff < 0 : diff > 0;
                return (
                  <div key={label} className="text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold text-primary">{diff >= 0 ? '+' : ''}{fmt(diff)}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtP(varFn(actual, budget))}</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
              {[
                { label: 'YTD Revenue (A)', value: fmt(ytd.rev.actual) },
                { label: 'YTD Revenue (B)', value: fmt(ytd.rev.budget) },
                { label: 'Items Flagged', value: `${filteredVariances.length} / ${itemVariances.length}` },
                { label: 'Largest Var ($)', value: itemVariances.length > 0 ? fmt(itemVariances.reduce((max, v) => Math.abs(v.variance) > Math.abs(max.variance) ? v : max, itemVariances[0]).variance) : '—' },
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

      {/* ══ Line Item Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Layers className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Line Item Variance</CardTitle><CardDescription>YTD Budget vs Actual by item — {filteredVariances.length} items shown</CardDescription></div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add Item</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => addItem('revenue')}>Revenue Item</DropdownMenuItem>
                <DropdownMenuItem onClick={() => addItem('cogs')}>COGS Item</DropdownMenuItem>
                <DropdownMenuItem onClick={() => addItem('opex')}>OpEx Item</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Line Item</TableHead>
                  <TableHead className="text-right">YTD Budget</TableHead>
                  <TableHead className="text-right">YTD Actual</TableHead>
                  <TableHead className="text-right">Variance ($)</TableHead>
                  <TableHead className="text-right">Variance (%)</TableHead>
                  <TableHead className="text-center">F/U</TableHead>
                  <TableHead className="text-center">Cause</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(['revenue', 'cogs', 'opex'] as const).map(cat => {
                  const catItems = filteredVariances.filter(v => v.category === cat);
                  if (catItems.length === 0) return null;
                  const catLabel = cat === 'revenue' ? 'Revenue' : cat === 'cogs' ? 'Cost of Goods Sold' : 'Operating Expenses';
                  const catTotal = cat === 'revenue' ? ytd.rev : cat === 'cogs' ? ytd.cogs : ytd.opex;
                  const catVar = catTotal.actual - catTotal.budget;
                  const catFav = (cat === 'cogs' || cat === 'opex') ? catVar < 0 : catVar > 0;
                  return (
                    <React.Fragment key={cat}>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={8} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-1.5">{catLabel}</TableCell>
                      </TableRow>
                      {catItems.map(v => (
                        <React.Fragment key={v.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedItem(prev => prev === v.id ? null : v.id)}>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedItem === v.id ? 'rotate-90' : ''}`} />
                                <Input value={v.name} onChange={e => { e.stopPropagation(); updateItem(v.id, { name: e.target.value }); }} onClick={e => e.stopPropagation()} className="h-7 text-sm border-0 bg-transparent p-0 font-medium" />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(v.ytdBudget)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(v.ytdActual)}</TableCell>
                            <TableCell className={`text-right font-mono text-sm ${v.favorable ? 'text-green-600' : 'text-red-600'}`}>{v.variance >= 0 ? '+' : ''}{fmt(v.variance)}</TableCell>
                            <TableCell className={`text-right font-mono text-sm ${v.favorable ? 'text-green-600' : 'text-red-600'}`}>{fmtP(v.variancePct)}</TableCell>
                            <TableCell className="text-center">
                              {v.favorable
                                ? <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">F</Badge>
                                : <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300">U</Badge>
                              }
                            </TableCell>
                            <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                    {v.causeTag ? <Badge className={`text-[9px] ${CAUSE_COLORS[v.causeTag]}`}>{v.causeTag}</Badge> : <Tag className="w-3 h-3 text-muted-foreground" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {CAUSE_TAGS.map(t => (
                                    <DropdownMenuItem key={t} onClick={() => updateItem(v.id, { causeTag: t })}>
                                      <Badge className={`text-[9px] mr-2 ${CAUSE_COLORS[t]}`}>{t}</Badge>{t}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => updateItem(v.id, { causeTag: '' })}>Clear</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(v.id)}><X className="w-3 h-3" /></Button></TableCell>
                          </TableRow>
                          {expandedItem === v.id && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <div className="bg-muted/10 border-y px-4 py-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Detail — {v.name}</span>
                                    <span className="text-[10px] text-muted-foreground">(click row again to collapse)</span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs font-mono">
                                      <thead>
                                        <tr className="text-muted-foreground">
                                          <th className="p-1.5 text-left font-medium w-16">Month</th>
                                          {MONTHS.slice(0, cm).map(m => <th key={m} className="p-1.5 text-center font-medium w-20">{m}</th>)}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td className="p-1.5 font-semibold text-muted-foreground">Budget</td>
                                          {MONTHS.slice(0, cm).map((m, mi) => (
                                            <td key={m} className="p-1">
                                              <Input type="number" value={v.budget[mi]} onChange={e => updateItemMonth(v.id, 'budget', mi, parseFloat(e.target.value) || 0)} className="h-6 w-full text-center text-xs font-mono p-0.5" />
                                            </td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <td className="p-1.5 font-semibold text-muted-foreground">Actual</td>
                                          {MONTHS.slice(0, cm).map((m, mi) => (
                                            <td key={m} className="p-1">
                                              <Input type="number" value={v.actual[mi]} onChange={e => updateItemMonth(v.id, 'actual', mi, parseFloat(e.target.value) || 0)} className="h-6 w-full text-center text-xs font-mono p-0.5" />
                                            </td>
                                          ))}
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-1.5 font-semibold text-muted-foreground">Var ($)</td>
                                          {MONTHS.slice(0, cm).map((m, mi) => {
                                            const d = v.actual[mi] - v.budget[mi];
                                            const isExp = v.category === 'cogs' || v.category === 'opex';
                                            const fav = isExp ? d < 0 : d > 0;
                                            return <td key={m} className={`p-1.5 text-center ${fav ? 'text-green-600' : d === 0 ? '' : 'text-red-600'}`}>{d >= 0 ? '+' : ''}{d}</td>;
                                          })}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell className="font-semibold text-sm">Total {catLabel}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{fmt(catTotal.budget)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{fmt(catTotal.actual)}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${catFav ? 'text-green-600' : 'text-red-600'}`}>{catVar >= 0 ? '+' : ''}{fmt(catVar)}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${catFav ? 'text-green-600' : 'text-red-600'}`}>{fmtP(varFn(catTotal.actual, catTotal.budget))}</TableCell>
                        <TableCell></TableCell><TableCell></TableCell><TableCell></TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {/* P&L subtotals */}
                <TableRow className="bg-muted/20 border-t-2">
                  <TableCell className="font-bold">Gross Profit</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(ytd.gp.budget)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(ytd.gp.actual)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${ytd.gp.actual - ytd.gp.budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>{ytd.gp.actual - ytd.gp.budget >= 0 ? '+' : ''}{fmt(ytd.gp.actual - ytd.gp.budget)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${ytd.gp.actual - ytd.gp.budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtP(varFn(ytd.gp.actual, ytd.gp.budget))}</TableCell>
                  <TableCell></TableCell><TableCell></TableCell><TableCell></TableCell>
                </TableRow>
                <TableRow className="bg-primary/5 border-t-2">
                  <TableCell className="font-bold text-primary">Operating Income</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(ytd.oi.budget)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(ytd.oi.actual)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${ytd.oi.actual - ytd.oi.budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>{ytd.oi.actual - ytd.oi.budget >= 0 ? '+' : ''}{fmt(ytd.oi.actual - ytd.oi.budget)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${ytd.oi.actual - ytd.oi.budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtP(varFn(ytd.oi.actual, ytd.oi.budget))}</TableCell>
                  <TableCell></TableCell><TableCell></TableCell><TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Calculation Breakdown ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />Variance Decomposition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {[
                  { label: 'Revenue Variance', value: ytd.rev.actual - ytd.rev.budget, sub: `${fmt(ytd.rev.actual)} − ${fmt(ytd.rev.budget)}` },
                  { label: '(−) COGS Variance', value: ytd.cogs.actual - ytd.cogs.budget, sub: `${fmt(ytd.cogs.actual)} − ${fmt(ytd.cogs.budget)}`, flip: true },
                  { label: 'Gross Profit Variance', value: ytd.gp.actual - ytd.gp.budget, bold: true },
                  { label: '(−) OpEx Variance', value: ytd.opex.actual - ytd.opex.budget, sub: `${fmt(ytd.opex.actual)} − ${fmt(ytd.opex.budget)}`, flip: true },
                  { label: 'Operating Income Variance', value: ytd.oi.actual - ytd.oi.budget, bold: true, final: true },
                ].map(({ label, value, sub, bold, final, flip }, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                    <div>
                      <span className={`text-sm ${bold || final ? 'font-semibold' : ''}`}>{label}</span>
                      {sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}
                    </div>
                    <span className={`font-mono text-sm ${final ? 'text-primary font-bold' : bold ? 'font-semibold' : ''}`}>{value >= 0 ? '+' : ''}{fmt(value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
              <p>GP Variance = Revenue Var ({fmt(ytd.rev.actual - ytd.rev.budget)}) − COGS Var ({fmt(ytd.cogs.actual - ytd.cogs.budget)}) = {fmt(ytd.gp.actual - ytd.gp.budget)}</p>
              <p className="text-primary font-semibold">OI Variance = GP Var ({fmt(ytd.gp.actual - ytd.gp.budget)}) − OpEx Var ({fmt(ytd.opex.actual - ytd.opex.budget)}) = {fmt(ytd.oi.actual - ytd.oi.budget)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Variance Report</h2><p className="text-sm text-muted-foreground">Charts, trends, and summary</p></div>
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
          <h2 className="text-2xl font-bold">{assumptions.companyName} — FY{assumptions.fiscalYear} Variance Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | Months 1–{cm} | Threshold: ${assumptions.materialityThreshold}K</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(() => {
            const revVar = ytd.rev.actual - ytd.rev.budget;
            const revVarPct = ytd.rev.budget > 0 ? (revVar / ytd.rev.budget * 100) : 0;
            const oiVar = ytd.oi.actual - ytd.oi.budget;
            const oiVarPct = ytd.oi.budget !== 0 ? (oiVar / Math.abs(ytd.oi.budget) * 100) : 0;
            const gpMarginActual = ytd.rev.actual > 0 ? ((ytd.gp.actual / ytd.rev.actual) * 100) : 0;
            const unfavCount = itemVariances.filter(v => v.variance < 0 && Math.abs(v.variance) >= (assumptions.materialityThreshold || 0)).length;
            return [
              { label: 'Revenue Variance', value: `${revVar >= 0 ? '+' : ''}${fmt(revVar)}`, sub: `${revVarPct >= 0 ? '+' : ''}${revVarPct.toFixed(1)}% vs budget`, color: revVar >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'OI Variance', value: `${oiVar >= 0 ? '+' : ''}${fmt(oiVar)}`, sub: `${oiVarPct >= 0 ? '+' : ''}${oiVarPct.toFixed(1)}% vs budget`, color: oiVar >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'Gross Margin', value: `${gpMarginActual.toFixed(1)}%`, sub: `Actual vs ${(ytd.rev.budget > 0 ? (ytd.gp.budget / ytd.rev.budget * 100) : 0).toFixed(1)}% budget`, color: 'text-primary' },
              { label: 'Unfavorable Items', value: `${unfavCount}`, sub: `of ${itemVariances.length} above threshold`, color: unfavCount > 0 ? 'text-amber-600' : 'text-green-600' },
            ].map(({ label, value, sub, color }) => (
              <Card key={label} className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ));
          })()}
        </div>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Variance analysis highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  const revVar = ytd.rev.actual - ytd.rev.budget;
                  const revVarPct = ytd.rev.budget > 0 ? (revVar / ytd.rev.budget * 100) : 0;
                  items.push(`YTD Revenue: ${fmt(ytd.rev.actual)} vs budget ${fmt(ytd.rev.budget)} — ${revVar >= 0 ? 'favorable' : 'unfavorable'} by ${fmt(Math.abs(revVar))} (${revVarPct >= 0 ? '+' : ''}${revVarPct.toFixed(1)}%).`);
                  const oiVar = ytd.oi.actual - ytd.oi.budget;
                  const oiVarPct = ytd.oi.budget !== 0 ? (oiVar / Math.abs(ytd.oi.budget) * 100) : 0;
                  items.push(`Operating Income: ${fmt(ytd.oi.actual)} vs budget ${fmt(ytd.oi.budget)} — ${oiVar >= 0 ? 'favorable' : 'unfavorable'} by ${fmt(Math.abs(oiVar))} (${oiVarPct >= 0 ? '+' : ''}${oiVarPct.toFixed(1)}%).`);
                  const gpMarginActual = ytd.rev.actual > 0 ? ((ytd.gp.actual / ytd.rev.actual) * 100) : 0;
                  const gpMarginBudget = ytd.rev.budget > 0 ? ((ytd.gp.budget / ytd.rev.budget) * 100) : 0;
                  items.push(`Gross margin: ${gpMarginActual.toFixed(1)}% actual vs ${gpMarginBudget.toFixed(1)}% budget (${(gpMarginActual - gpMarginBudget) >= 0 ? '+' : ''}${(gpMarginActual - gpMarginBudget).toFixed(1)}pp).`);
                  const materialCount = itemVariances.filter(v => Math.abs(v.variance) >= (assumptions.materialityThreshold || 0)).length;
                  const unfavorableCount = itemVariances.filter(v => v.variance < 0 && Math.abs(v.variance) >= (assumptions.materialityThreshold || 0)).length;
                  items.push(`${materialCount} line items analyzed. ${unfavorableCount} unfavorable variance${unfavorableCount !== 1 ? 's' : ''} above materiality threshold.`);
                  const largestVar = itemVariances.reduce((a, b) => Math.abs(a.variance) > Math.abs(b.variance) ? a : b, itemVariances[0]);
                  if (largestVar) items.push(`Largest variance: ${largestVar.name} at ${fmt(largestVar.variance)} (${largestVar.variancePct >= 0 ? '+' : ''}${largestVar.variancePct.toFixed(1)}%)${largestVar.causeTag ? ` — tagged as ${largestVar.causeTag}.` : '.'}`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OI Waterfall */}
        <Card>
          <CardHeader><CardTitle>Operating Income Waterfall — Budget to Actual</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${v}K`, '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Variance Trend */}
        <Card>
          <CardHeader><CardTitle>Monthly Variance Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyVariance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${v}K`, '']} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar dataKey="revVar" name="Revenue" fill="#3b7cc0" radius={[4, 4, 0, 0]} />
                  <Line dataKey="oiVar" name="Op. Income" type="monotone" stroke="#e57373" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cause Analysis */}
        {itemVariances.some(v => v.causeTag) && (
          <Card>
            <CardHeader><CardTitle>Variance by Root Cause</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CAUSE_TAGS.map(tag => {
                  const tagged = itemVariances.filter(v => v.causeTag === tag);
                  if (tagged.length === 0) return null;
                  const totalVar = tagged.reduce((s, v) => s + v.variance, 0);
                  return (
                    <div key={tag} className="p-3 rounded-lg border">
                      <Badge className={`text-[10px] mb-2 ${CAUSE_COLORS[tag]}`}>{tag}</Badge>
                      <p className="text-lg font-bold font-mono">{totalVar >= 0 ? '+' : ''}{fmt(totalVar)}</p>
                      <p className="text-xs text-muted-foreground">{tagged.length} item{tagged.length !== 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Bridge Table */}
        <Card>
          <CardHeader><CardTitle>Monthly P&L Bridge — Budget vs Actual</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 sticky left-0 bg-background z-10">Month</TableHead>
                    <TableHead className="text-center text-xs" colSpan={3}>Revenue ($K)</TableHead>
                    <TableHead className="text-center text-xs border-l" colSpan={3}>Gross Profit ($K)</TableHead>
                    <TableHead className="text-center text-xs border-l" colSpan={3}>Op. Income ($K)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10"></TableHead>
                    <TableHead className="text-right text-xs">Budget</TableHead><TableHead className="text-right text-xs">Actual</TableHead><TableHead className="text-right text-xs">Var</TableHead>
                    <TableHead className="text-right text-xs border-l">Budget</TableHead><TableHead className="text-right text-xs">Actual</TableHead><TableHead className="text-right text-xs">Var</TableHead>
                    <TableHead className="text-right text-xs border-l">Budget</TableHead><TableHead className="text-right text-xs">Actual</TableHead><TableHead className="text-right text-xs">Var</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MONTHS.slice(0, cm).map((m, mi) => {
                    const bRev = byCategory.rev.reduce((s, i) => s + i.budget[mi], 0);
                    const aRev = byCategory.rev.reduce((s, i) => s + i.actual[mi], 0);
                    const bCOGS = byCategory.cogs.reduce((s, i) => s + i.budget[mi], 0);
                    const aCOGS = byCategory.cogs.reduce((s, i) => s + i.actual[mi], 0);
                    const bOpex = byCategory.opex.reduce((s, i) => s + i.budget[mi], 0);
                    const aOpex = byCategory.opex.reduce((s, i) => s + i.actual[mi], 0);
                    const bGP = bRev - bCOGS; const aGP = aRev - aCOGS;
                    const bOI = bGP - bOpex; const aOI = aGP - aOpex;
                    const vc = (v: number) => v >= 0 ? 'text-green-600' : 'text-red-500';
                    return (
                      <TableRow key={mi}>
                        <TableCell className="font-medium text-xs sticky left-0 bg-background z-10">{m}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Math.round(bRev)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Math.round(aRev)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs ${vc(aRev - bRev)}`}>{aRev - bRev >= 0 ? '+' : ''}{Math.round(aRev - bRev)}</TableCell>
                        <TableCell className="text-right font-mono text-xs border-l">{Math.round(bGP)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Math.round(aGP)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs ${vc(aGP - bGP)}`}>{aGP - bGP >= 0 ? '+' : ''}{Math.round(aGP - bGP)}</TableCell>
                        <TableCell className="text-right font-mono text-xs border-l">{Math.round(bOI)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Math.round(aOI)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs ${vc(aOI - bOI)}`}>{aOI - bOI >= 0 ? '+' : ''}{Math.round(aOI - bOI)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/30 font-semibold border-t-2">
                    <TableCell className="text-xs sticky left-0 bg-muted/30 z-10">YTD</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Math.round(ytd.rev.budget)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Math.round(ytd.rev.actual)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${ytd.rev.actual >= ytd.rev.budget ? 'text-green-600' : 'text-red-500'}`}>{ytd.rev.actual - ytd.rev.budget >= 0 ? '+' : ''}{Math.round(ytd.rev.actual - ytd.rev.budget)}</TableCell>
                    <TableCell className="text-right font-mono text-xs border-l">{Math.round(ytd.gp.budget)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Math.round(ytd.gp.actual)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${ytd.gp.actual >= ytd.gp.budget ? 'text-green-600' : 'text-red-500'}`}>{ytd.gp.actual - ytd.gp.budget >= 0 ? '+' : ''}{Math.round(ytd.gp.actual - ytd.gp.budget)}</TableCell>
                    <TableCell className="text-right font-mono text-xs border-l">{Math.round(ytd.oi.budget)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Math.round(ytd.oi.actual)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${ytd.oi.actual >= ytd.oi.budget ? 'text-green-600' : 'text-red-500'}`}>{ytd.oi.actual - ytd.oi.budget >= 0 ? '+' : ''}{Math.round(ytd.oi.actual - ytd.oi.budget)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">FY{assumptions.fiscalYear} Variance Analysis — {assumptions.companyName}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Through Month {cm}, YTD revenue of <strong>{fmt(ytd.rev.actual)}</strong> is {ytd.rev.actual >= ytd.rev.budget ? 'above' : 'below'} budget of {fmt(ytd.rev.budget)} by {fmt(Math.abs(ytd.rev.actual - ytd.rev.budget))} ({fmtP(varFn(ytd.rev.actual, ytd.rev.budget))}).
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  COGS variance of {fmt(ytd.cogs.actual - ytd.cogs.budget)} and OpEx variance of {fmt(ytd.opex.actual - ytd.opex.budget)} result in a <strong>gross profit variance of {fmt(ytd.gp.actual - ytd.gp.budget)}</strong> and <strong>operating income variance of {fmt(ytd.oi.actual - ytd.oi.budget)}</strong>.
                </p>
                {itemVariances.some(v => v.causeTag) && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Root cause analysis shows {CAUSE_TAGS.filter(t => itemVariances.some(v => v.causeTag === t)).map(t => {
                      const total = itemVariances.filter(v => v.causeTag === t).reduce((s, v) => s + v.variance, 0);
                      return `${t}: ${total >= 0 ? '+' : ''}${fmt(total)}`;
                    }).join(', ')}.
                  </p>
                )}
                {filteredVariances.length > 0 && (() => {
                  const largest = filteredVariances.reduce((max, v) => Math.abs(v.variance) > Math.abs(max.variance) ? v : max, filteredVariances[0]);
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      The largest individual variance is <strong>{largest.name}</strong> at {largest.variance >= 0 ? '+' : ''}{fmt(largest.variance)} ({fmtP(largest.variancePct)}){largest.causeTag ? `, attributed to ${largest.causeTag}` : ''}.
                    </p>
                  );
                })()}
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
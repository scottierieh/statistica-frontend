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
  HelpCircle, Calculator, Lightbulb, Building2, ChevronRight, Upload,
  BarChart3,  Plus, X, Settings2, CheckCircle2, Layers,
  AlertTriangle, Activity, Percent, Scale, ArrowUpRight,
  ArrowDownRight, Minus, Equal, Zap
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '../../ui/label';
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

interface Product {
  id: string;
  name: string;
  category: string;
  unitPrice: number;               // $ per unit
  variableCosts: VariableCost[];   // per-unit variable costs
  monthlyUnits: number[];          // 12 months
}

interface VariableCost {
  id: string;
  name: string;
  perUnit: number;                 // $ per unit
}

interface FixedCost {
  id: string;
  name: string;
  category: 'labor' | 'rent' | 'depreciation' | 'insurance' | 'marketing' | 'admin' | 'other';
  monthlyAmount: number;           // $K per month
}

interface CMSettings {
  companyName: string;
  fiscalYear: number;
  currentMonth: number;
  scenarioVolumePct: number;       // -50 to +50 % change
}

interface CMPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e', '#4a90b8', '#64748b'];
const seasonality = [0.85, 0.88, 0.95, 1.00, 1.05, 1.08, 1.12, 1.10, 1.05, 1.00, 0.95, 0.97];

const FC_LABELS: Record<string, string> = {
  labor: 'Labor', rent: 'Rent / Facilities', depreciation: 'Depreciation',
  insurance: 'Insurance', marketing: 'Marketing (Fixed)', admin: 'Admin / G&A', other: 'Other',
};
const FC_COLORS: Record<string, string> = {
  labor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  rent: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  depreciation: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  insurance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  marketing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

function buildDefaultProducts(): Product[] {
  const mk = (id: string, name: string, cat: string, price: number, vcs: [string, number][], baseUnits: number): Product => ({
    id, name, category: cat, unitPrice: price,
    variableCosts: vcs.map(([n, c], i) => ({ id: `${id}_vc${i}`, name: n, perUnit: c })),
    monthlyUnits: seasonality.map(sv => Math.round(baseUnits * sv * (0.96 + Math.random() * 0.08))),
  });
  return [
    mk('p1', 'Standard Plan', 'Subscription', 79, [['Hosting', 8], ['Payment Processing', 2.4], ['Support Allocation', 5]], 650),
    mk('p2', 'Pro Plan', 'Subscription', 199, [['Hosting', 15], ['Payment Processing', 6], ['Support Allocation', 12], ['API Costs', 4]], 280),
    mk('p3', 'Enterprise License', 'License', 899, [['Hosting', 45], ['Payment Processing', 27], ['Dedicated Support', 80], ['Implementation', 35]], 42),
    mk('p4', 'Consulting Hour', 'Services', 250, [['Consultant Salary', 95], ['Tools & Software', 8], ['Travel', 12]], 180),
    mk('p5', 'Training Workshop', 'Services', 1500, [['Trainer Cost', 400], ['Materials', 50], ['Venue', 120]], 18),
  ];
}

function buildDefaultFixedCosts(): FixedCost[] {
  return [
    { id: 'fc1', name: 'Engineering Team', category: 'labor', monthlyAmount: 185 },
    { id: 'fc2', name: 'Sales Team', category: 'labor', monthlyAmount: 120 },
    { id: 'fc3', name: 'Office Lease', category: 'rent', monthlyAmount: 35 },
    { id: 'fc4', name: 'Server Infrastructure (Base)', category: 'depreciation', monthlyAmount: 28 },
    { id: 'fc5', name: 'Business Insurance', category: 'insurance', monthlyAmount: 8 },
    { id: 'fc6', name: 'Brand Marketing', category: 'marketing', monthlyAmount: 45 },
    { id: 'fc7', name: 'Legal & Accounting', category: 'admin', monthlyAmount: 15 },
    { id: 'fc8', name: 'Executive Compensation', category: 'labor', monthlyAmount: 65 },
  ];
}

const DEFAULT_SETTINGS: CMSettings = {
  companyName: 'Acme SaaS',
  fiscalYear: new Date().getFullYear(),
  currentMonth: 12 as number,
  scenarioVolumePct: 0 as number,
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}K`;
const fmtD = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDi = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;
const fmtU = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
const sumArr = (arr: number[], s: number, e: number) => arr.slice(s, e).reduce((a, v) => a + v, 0);


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Contribution Margin ($)": "Revenue − Variable Costs. The amount each unit contributes toward covering fixed costs and generating profit.",
  "Contribution Margin (%)": "CM$ ÷ Revenue × 100. Higher % means more of each dollar goes to fixed cost coverage.",
  "Variable Costs": "Costs that change directly with volume: materials, transaction fees, direct labor per unit.",
  "Fixed Costs": "Costs that remain constant regardless of volume: rent, salaries, insurance, depreciation.",
  "Break-Even Point": "Units where total CM exactly covers all fixed costs. Above = profit, below = loss.",
  "Break-Even Revenue": "Revenue at break-even point. = Fixed Costs ÷ Weighted CM%.",
  "Margin of Safety": "Current units − Break-even units. How far above break-even the business operates.",
  "Margin of Safety %": "Margin of Safety ÷ Current Units × 100. Buffer before hitting break-even.",
  "Operating Leverage": "CM ÷ Operating Income. Higher leverage = profit grows faster than revenue.",
  "CM Ratio": "Contribution Margin % expressed as a ratio. Used in break-even calculations.",
  "Weighted CM": "Total CM across all products ÷ Total Revenue. Accounts for product mix.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />CM Analysis Glossary</DialogTitle>
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

const CMGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Contribution Margin Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Separate Variable from Fixed', desc: 'Classify every cost as variable (changes with volume) or fixed (stays constant).' },
                { step: '2', title: 'Calculate Per-Unit CM', desc: 'Price − Variable Costs = Contribution Margin per unit.' },
                { step: '3', title: 'Find Break-Even', desc: 'Total Fixed Costs ÷ Weighted CM% = Break-even revenue.' },
                { step: '4', title: 'Measure Safety Margin', desc: 'How far above break-even? Larger margin = more resilient.' },
                { step: '5', title: 'Scenario Test', desc: 'What if volume changes ±10–30%? Use the slider to stress-test.' },
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
                { label: 'CM per Unit', formula: 'Price − Variable Cost per Unit', example: '$79 − $15.40 = $63.60' },
                { label: 'CM %', formula: 'CM per Unit ÷ Price × 100', example: '$63.60 ÷ $79 = 80.5%' },
                { label: 'Total CM', formula: 'Σ (CM per Unit × Units Sold)', example: '$63.60 × 650 = $41,340' },
                { label: 'Weighted CM%', formula: 'Total CM ÷ Total Revenue', example: '$500K ÷ $680K = 73.5%' },
                { label: 'Break-Even ($)', formula: 'Total Fixed Costs ÷ Weighted CM%', example: '$501K ÷ 73.5% = $681.6K' },
                { label: 'Margin of Safety', formula: 'Actual Revenue − BE Revenue', example: '$680K − $681.6K = −$1.6K' },
                { label: 'Operating Leverage', formula: 'Total CM ÷ Operating Income', example: '$500K ÷ (−$1K) = very high' },
              ].map(({ label, formula, example }) => (
                <div key={label} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between"><span className="font-medium text-sm">{label}</span><span className="font-mono text-xs text-primary">{formula}</span></div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{example}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> Products with high CM% are most valuable for covering fixed costs. Prioritize volume growth in high-CM products to maximize operating income.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// CSV & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CM_CSV = `Product,Category,UnitPrice,VarCost1_Name,VarCost1_Amt,VarCost2_Name,VarCost2_Amt,VarCost3_Name,VarCost3_Amt,Units_Jan,Units_Feb,Units_Mar,Units_Apr,Units_May,Units_Jun,Units_Jul,Units_Aug,Units_Sep,Units_Oct,Units_Nov,Units_Dec
Standard Plan,Subscription,79,Hosting,8,Payment,2.4,Support,5,553,572,618,650,683,702,728,715,683,650,618,631
Pro Plan,Subscription,199,Hosting,15,Payment,6,Support,12,238,246,266,280,294,302,314,308,294,280,266,272
Enterprise License,License,899,Hosting,45,Payment,27,Support,80,36,37,40,42,44,45,47,46,44,42,40,41
Consulting Hour,Services,250,Salary,95,Tools,8,Travel,12,153,158,171,180,189,194,202,198,189,180,171,175
Training Workshop,Services,1500,Trainer,400,Materials,50,Venue,120,15,16,17,18,19,19,20,20,19,18,17,17`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CM_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_contribution_margin.csv';
    link.click();
    toast({ title: "Downloaded!" });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Data Format</DialogTitle>
          <DialogDescription>Product and variable cost structure</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">One row per product. Variable costs in paired columns (Name + Amount). Fixed costs are entered separately in the tool.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                {[
                  { name: 'Product', required: true, desc: 'Product/service name' },
                  { name: 'Category', required: false, desc: 'Product category' },
                  { name: 'UnitPrice', required: true, desc: 'Selling price per unit ($)' },
                  { name: 'VarCost1_Name/Amt', required: true, desc: 'Variable cost name and $ per unit' },
                  { name: 'Units_Jan...Dec', required: true, desc: 'Monthly unit volumes' },
                ].map(({ name, required, desc }) => (
                  <div key={name} className={`p-2.5 rounded-lg border text-sm ${required ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-2"><span className="font-semibold">{name}</span>{required && <Badge variant="default" className="text-[10px] px-1.5 py-0">Required</Badge>}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
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
// CSV PARSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseCMcsv(csvText: string): Product[] | null {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 2) return null;
  const rows = parsed.data as Record<string, string>[];
  const items: Product[] = [];
  for (const row of rows) {
    const name = (row['Product'] || row['Name'] || '').trim();
    if (!name) continue;
    const category = (row['Category'] || 'General').trim();
    const unitPrice = parseFloat(row['UnitPrice'] || row['Price']) || 0;
    const variableCosts: VariableCost[] = [];
    for (let i = 1; i <= 10; i++) {
      const vcName = (row[`VarCost${i}_Name`] || '').trim();
      const vcAmt = parseFloat(row[`VarCost${i}_Amt`]) || 0;
      if (vcName && vcAmt > 0) variableCosts.push({ id: `vc${items.length}_${i}`, name: vcName, perUnit: vcAmt });
    }
    if (variableCosts.length === 0) {
      const totalVC = parseFloat(row['VarCost'] || row['VariableCost']) || 0;
      if (totalVC > 0) variableCosts.push({ id: `vc${items.length}_0`, name: 'Variable Cost', perUnit: totalVC });
    }
    const monthlyUnits: number[] = [];
    for (const m of MONTHS) monthlyUnits.push(Number(parseFloat(row[`Units_${m}`] || row[m])) || 0);
    if (monthlyUnits.every(u => u === 0 as number)) {
      const ann = parseFloat(row['AnnualUnits'] || row['Units']) || 1200;
      seasonality.forEach((sv, i) => { monthlyUnits[i] = Math.round((ann / 12) * sv) as number; });    }
    items.push({ id: `p${items.length}`, name, category, unitPrice, variableCosts, monthlyUnits });
  }
  return items.length >= 2 ? items : null;
}


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
          <CardTitle className="font-headline text-3xl">Contribution Margin Analysis</CardTitle>
          <CardDescription className="text-base mt-2">Determine how much each sale contributes to covering fixed costs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Layers, title: 'Variable vs Fixed', desc: 'Separate cost structure to reveal true per-unit economics' },
              { icon: Target, title: 'Break-Even Point', desc: 'Exact volume and revenue needed to cover all fixed costs' },
              { icon: Activity, title: 'Operating Leverage', desc: 'How fast profit grows as volume increases above break-even' },
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
                  <div><CardTitle className="text-base">Upload Product Data</CardTitle><CardDescription className="text-xs">Import from CSV</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected</span></div>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload products with unit prices, variable costs, and monthly volumes.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Product | UnitPrice | VariableCost | Units_Jan..Dec</p>
                      <p className="text-muted-foreground">e.g. Pro Plan, 99, 32, 500, 520, ...</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide</Button>
                    {parseError && <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>}
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">5 products + 8 fixed costs</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">SaaS company with subscriptions, licenses, and services. Variable cost breakdowns and fixed cost structure pre-loaded.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />5 products with per-unit variable costs</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />8 fixed cost line items</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Break-even, safety margin, leverage</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">This tool focuses on separating variable from fixed costs to find the break-even point and measure operating leverage. For full product P&L, use Product Profitability.</p>
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

export default function ContributionMarginPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: CMPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const [settings, setSettings] = useState<CMSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>(buildDefaultProducts);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(buildDefaultFixedCosts);

  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try { const raw = Papa.unparse(data); return parseCMcsv(raw); } catch { return null; }
  }, [data]);
  const [parseError] = useState<string | null>(null);
  const applyUpload = useCallback(() => { if (parsedUpload) setProducts(parsedUpload); setShowIntro(false); }, [parsedUpload]);

  const cm = settings.currentMonth;
  const volAdj = 1 + settings.scenarioVolumePct / 100;

  // ── Product metrics ──
  const productMetrics = useMemo(() => products.map(p => {
    const vcPerUnit = p.variableCosts.reduce((s, vc) => s + vc.perUnit, 0);
    const cmPerUnit = p.unitPrice - vcPerUnit;
    const cmPct = p.unitPrice > 0 ? (cmPerUnit / p.unitPrice) * 100 : 0;
    const ytdUnits = Math.round(sumArr(p.monthlyUnits, 0, cm) * volAdj);
    const ytdRevenue = ytdUnits * p.unitPrice / 1000;
    const ytdVC = ytdUnits * vcPerUnit / 1000;
    const ytdCM = ytdRevenue - ytdVC;
    return { ...p, vcPerUnit, cmPerUnit, cmPct, ytdUnits, ytdRevenue, ytdVC, ytdCM };
  }), [products, cm, volAdj]);

  // Totals
  const totalRevenue = useMemo(() => productMetrics.reduce((s, p) => s + p.ytdRevenue, 0), [productMetrics]);
  const totalVC = useMemo(() => productMetrics.reduce((s, p) => s + p.ytdVC, 0), [productMetrics]);
  const totalCM = useMemo(() => productMetrics.reduce((s, p) => s + p.ytdCM, 0), [productMetrics]);
  const weightedCMpct = totalRevenue > 0 ? (totalCM / totalRevenue) * 100 : 0;

  // Fixed costs
  const totalFC = useMemo(() => fixedCosts.reduce((s, fc) => s + fc.monthlyAmount, 0) * cm, [fixedCosts, cm]);
  const operatingIncome = totalCM - totalFC;
  const oiMarginPct = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

  // Break-even
  const monthlyFC = useMemo(() => fixedCosts.reduce((s, fc) => s + fc.monthlyAmount, 0), [fixedCosts]);
  const beRevenue = weightedCMpct > 0 ? (totalFC / (weightedCMpct / 100)) : Infinity;
  const marginOfSafety = totalRevenue - beRevenue;
  const marginOfSafetyPct = totalRevenue > 0 ? (marginOfSafety / totalRevenue) * 100 : 0;
  const opLeverage = operatingIncome !== 0 ? totalCM / operatingIncome : Infinity;

  // Per-product break-even (units)
  const productBE = useMemo(() => productMetrics.map(p => ({
    ...p,
    beUnits: p.cmPerUnit > 0 ? Math.ceil((monthlyFC * cm * 1000 * (p.ytdRevenue / totalRevenue)) / p.cmPerUnit) : Infinity,
  })), [productMetrics, monthlyFC, cm, totalRevenue]);

  // Monthly trend
  const monthlyTrend = useMemo(() => MONTHS.slice(0, cm).map((m, mi) => {
    let rev = 0, vc = 0;
    products.forEach(p => {
      const units = Math.round(p.monthlyUnits[mi] * volAdj);
      rev += units * p.unitPrice / 1000;
      vc += units * p.variableCosts.reduce((s, v) => s + v.perUnit, 0) / 1000;
    });
    const cmVal = rev - vc;
    const fc = monthlyFC;
    return { month: m, revenue: rev, variableCost: vc, cm: cmVal, fixedCost: fc, operatingIncome: cmVal - fc };
  }), [products, cm, volAdj, monthlyFC]);

  // Scenario sensitivity (volume change → OI)
  const scenarioData = useMemo(() => {
    const vols = [-30, -20, -10, 0, 10, 20, 30];
    return vols.map(pct => {
      const adj = 1 + pct / 100;
      let rev = 0, vc = 0;
      products.forEach(p => {
        const units = Math.round(sumArr(p.monthlyUnits, 0, cm) * adj);
        rev += units * p.unitPrice / 1000;
        vc += units * p.variableCosts.reduce((s, v) => s + v.perUnit, 0) / 1000;
      });
      const cmVal = rev - vc;
      return { scenario: `${pct >= 0 ? '+' : ''}${pct}%`, revenue: rev, cm: cmVal, oi: cmVal - totalFC };
    });
  }, [products, cm, totalFC]);

  // FC breakdown by category
  const fcByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    fixedCosts.forEach(fc => { cats[fc.category] = (cats[fc.category] || 0) + fc.monthlyAmount; });
    return Object.entries(cats).map(([cat, amt]) => ({ category: FC_LABELS[cat] || cat, amount: amt * cm, monthly: amt }));
  }, [fixedCosts, cm]);

  // ── CRUD ──
  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);
  const updateVC = useCallback((prodId: string, vcId: string, updates: Partial<VariableCost>) => {
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, variableCosts: p.variableCosts.map(vc => vc.id === vcId ? { ...vc, ...updates } : vc) } : p));
  }, []);
  const addVC = useCallback((prodId: string) => {
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, variableCosts: [...p.variableCosts, { id: `vc${Date.now()}`, name: 'New Cost', perUnit: 0 }] } : p));
  }, []);
  const removeVC = useCallback((prodId: string, vcId: string) => {
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, variableCosts: p.variableCosts.filter(vc => vc.id !== vcId) } : p));
  }, []);
  const updateMonthUnits = useCallback((id: string, mi: number, value: number) => {
    setProducts(prev => prev.map(p => { if (p.id !== id) return p; const arr = [...p.monthlyUnits]; arr[mi] = value; return { ...p, monthlyUnits: arr }; }));
  }, []);
  const addProduct = useCallback(() => {
    setProducts(prev => [...prev, { id: `p${Date.now()}`, name: 'New Product', category: 'General', unitPrice: 100, variableCosts: [{ id: `vc${Date.now()}`, name: 'Variable Cost', perUnit: 30 }], monthlyUnits: Array(12).fill(100) }]);
  }, []);
  const removeProduct = useCallback((id: string) => { setProducts(prev => prev.filter(p => p.id !== id)); if (expandedProduct === id) setExpandedProduct(null); }, [expandedProduct]);

  const updateFC = useCallback((id: string, updates: Partial<FixedCost>) => { setFixedCosts(prev => prev.map(fc => fc.id === id ? { ...fc, ...updates } : fc)); }, []);
  const addFC = useCallback((cat: FixedCost['category']) => { const newFC: FixedCost = { id: `fc${Date.now()}`, name: 'New Fixed Cost', category: cat, monthlyAmount: 10 }; setFixedCosts(prev => [...prev, newFC]); }, []);  const removeFC = useCallback((id: string) => { setFixedCosts(prev => prev.filter(fc => fc.id !== id)); }, []);

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `CM_Analysis_${settings.fiscalYear}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, [settings.fiscalYear]);

  const handleDownloadCSV = useCallback(() => {
    const rows = productMetrics.map(p => ({ Product: p.name, Category: p.category, Price: `$${p.unitPrice}`, 'Var Cost/Unit': fmtD(p.vcPerUnit), 'CM/Unit': fmtD(p.cmPerUnit), 'CM%': fmtP(p.cmPct), Units: p.ytdUnits, 'Revenue($K)': p.ytdRevenue.toFixed(1), 'Total CM($K)': p.ytdCM.toFixed(1) }));
    let csv = `CONTRIBUTION MARGIN — ${settings.companyName} FY${settings.fiscalYear}\n`;
    csv += `Months: 1-${cm} | Volume Adj: ${settings.scenarioVolumePct >= 0 ? '+' : ''}${settings.scenarioVolumePct}%\n\n`;
    csv += Papa.unparse(rows) + '\n\n';
    csv += `Total Revenue,${fmt(totalRevenue)}\nTotal Variable Costs,${fmt(totalVC)}\nTotal CM,${fmt(totalCM)} (${fmtP(weightedCMpct)})\nTotal Fixed Costs,${fmt(totalFC)}\nOperating Income,${fmt(operatingIncome)}\n`;
    csv += `Break-Even Revenue,${fmt(beRevenue)}\nMargin of Safety,${fmtP(marginOfSafetyPct)}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `CM_Analysis_${settings.fiscalYear}.csv`; link.click();
  }, [productMetrics, settings, cm, totalRevenue, totalVC, totalCM, totalFC, operatingIncome, beRevenue, marginOfSafetyPct, weightedCMpct]);

  if (showIntro) return <IntroPage hasUploadedData={!!parsedUpload} parseError={parseError} onStartWithData={applyUpload} onStartManual={() => setShowIntro(false)} />;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Contribution Margin Analysis</h1><p className="text-muted-foreground mt-1">{settings.companyName} — FY{settings.fiscalYear} | Months 1–{cm}{settings.scenarioVolumePct !== 0 ? ` | Volume ${settings.scenarioVolumePct >= 0 ? '+' : ''}${settings.scenarioVolumePct}%` : ''}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <CMGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Settings</CardTitle><CardDescription>Company, period, and volume scenario</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={settings.companyName} onChange={e => setSettings(p => ({ ...p, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Fiscal Year</Label><Input type="number" value={settings.fiscalYear} onChange={e => setSettings(p => ({ ...p, fiscalYear: parseInt(e.target.value) || 2025 }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Months</Label>
              <div className="flex items-center gap-2"><Slider value={[settings.currentMonth]} onValueChange={(val) => setSettings(p => ({ ...p, currentMonth: Number(val[0]) }))}  min={1} max={12} step={1} className="flex-1" /><span className="text-sm font-mono w-6">{cm}</span></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Volume Scenario</Label>
              <div className="flex items-center gap-2">
                <Slider value={[settings.scenarioVolumePct]} onValueChange={(val) => setSettings(p => ({ ...p, scenarioVolumePct: Number(val[0]) }))}min={-50} max={50} step={5} className="flex-1" />
                <span className={`text-sm font-mono w-10 ${settings.scenarioVolumePct > 0 ? 'text-green-600' : settings.scenarioVolumePct < 0 ? 'text-red-600' : ''}`}>{settings.scenarioVolumePct >= 0 ? '+' : ''}{settings.scenarioVolumePct}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Contribution Margin Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: fmt(totalRevenue) },
                { label: 'Total Variable Costs', value: fmt(totalVC) },
                { label: 'Total CM', value: fmt(totalCM), sub: fmtP(weightedCMpct) },
                { label: 'Operating Income', value: fmt(operatingIncome), sub: fmtP(oiMarginPct) },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold text-primary">{value}</p>
                  {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
                </div>
              ))}
            </div>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Break-Even Revenue', value: isFinite(beRevenue) ? fmt(beRevenue) : '∞' },
                { label: 'Margin of Safety', value: fmtP(marginOfSafetyPct), ok: marginOfSafety > 0 },
                { label: 'Operating Leverage', value: isFinite(opLeverage) ? `${opLeverage.toFixed(1)}x` : '∞' },
                { label: 'Total Fixed Costs', value: fmt(totalFC), sub: `${fmt(monthlyFC)}/mo` },
              ].map(({ label, value, sub, ok }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-lg font-bold ${ok !== undefined ? (ok ? 'text-green-600' : 'text-red-600') : 'text-primary'}`}>{value}</p>
                  {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Product CM Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Layers className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Product Contribution Margins</CardTitle><CardDescription>Click row to expand variable cost detail and monthly volumes</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={addProduct}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">VC/Unit</TableHead>
                  <TableHead className="text-right">CM/Unit</TableHead>
                  <TableHead className="text-right">CM %</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Total CM</TableHead>
                  <TableHead className="text-right">CM Mix</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productMetrics.map((p, i) => (
                  <React.Fragment key={p.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedProduct(prev => prev === p.id ? null : p.id)}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedProduct === p.id ? 'rotate-90' : ''}`} />
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs font-medium truncate max-w-[100px]">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <Input type="number" value={p.unitPrice} onChange={e => updateProduct(p.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono p-0.5" />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmtD(p.vcPerUnit)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{fmtD(p.cmPerUnit)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-semibold ${p.cmPct >= 50 ? 'text-green-600' : p.cmPct >= 25 ? 'text-amber-600' : 'text-red-600'}`}>{fmtP(p.cmPct)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtU(p.ytdUnits)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(p.ytdRevenue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{fmt(p.ytdCM)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{totalCM > 0 ? fmtP((p.ytdCM / totalCM) * 100) : '—'}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeProduct(p.id)}><X className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                    {expandedProduct === p.id && (
                      <TableRow>
                        <TableCell colSpan={10} className="p-0">
                          <div className="bg-muted/10 border-y px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{p.name} — Variable Cost Breakdown</span>
                              <Button variant="outline" size="sm" className="h-5 text-[10px]" onClick={() => addVC(p.id)}><Plus className="w-3 h-3 mr-0.5" />Cost</Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {p.variableCosts.map(vc => (
                                <div key={vc.id} className="flex items-center gap-1 p-1.5 rounded border bg-background">
                                  <Input value={vc.name} onChange={e => updateVC(p.id, vc.id, { name: e.target.value })} className="h-5 text-[10px] border-0 p-0 flex-1" />
                                  <span className="text-[10px] text-muted-foreground">$</span>
                                  <Input type="number" value={vc.perUnit} onChange={e => updateVC(p.id, vc.id, { perUnit: parseFloat(e.target.value) || 0 })} className="h-5 w-14 text-right text-[10px] font-mono p-0" step={0.1} />
                                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removeVC(p.id, vc.id)}><X className="w-2.5 h-2.5" /></Button>
                                </div>
                              ))}
                            </div>
                            <div>
                              <Label className="text-[10px] font-semibold text-muted-foreground">Monthly Units</Label>
                              <div className="overflow-x-auto mt-1">
                                <table className="w-full text-xs font-mono"><thead><tr className="text-muted-foreground">
                                  {MONTHS.slice(0, cm).map(m => <th key={m} className="p-1 text-center w-14">{m}</th>)}
                                  <th className="p-1 text-center border-l font-semibold">Total</th>
                                </tr></thead><tbody><tr>
                                  {MONTHS.slice(0, cm).map((m, mi) => (
                                    <td key={m} className="p-0.5"><Input type="number" value={p.monthlyUnits[mi]} onChange={e => updateMonthUnits(p.id, mi, parseInt(e.target.value) || 0)} className="h-5 w-full text-center text-[10px] font-mono p-0" /></td>
                                  ))}
                                  <td className="p-1 text-center font-semibold border-l">{fmtU(p.ytdUnits)}</td>
                                </tr></tbody></table>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                <TableRow className="border-t-2 bg-primary/5">
                  <TableCell className="font-bold text-primary">Total</TableCell>
                  <TableCell></TableCell><TableCell></TableCell><TableCell></TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmtP(weightedCMpct)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtU(productMetrics.reduce((s, p) => s + p.ytdUnits, 0))}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmt(totalRevenue)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmt(totalCM)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">100%</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Fixed Costs ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Fixed Costs</CardTitle><CardDescription>Costs that do not change with volume</CardDescription></div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button></DropdownMenuTrigger>
              <DropdownMenuContent>{Object.entries(FC_LABELS).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => addFC(k as FixedCost['category'])}>{v}</DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Item</TableHead>
                <TableHead className="text-center">Category</TableHead>
                <TableHead className="text-right">$/mo ($K)</TableHead>
                <TableHead className="text-right">YTD ({cm}mo)</TableHead>
                <TableHead className="text-right">% of FC</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixedCosts.map(fc => (
                <TableRow key={fc.id}>
                  <TableCell><Input value={fc.name} onChange={e => updateFC(fc.id, { name: e.target.value })} className="h-6 text-xs font-medium border-0 bg-transparent p-0" /></TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-5 px-2"><Badge className={`text-[9px] ${FC_COLORS[fc.category]}`}>{FC_LABELS[fc.category]}</Badge></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>{Object.entries(FC_LABELS).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => updateFC(fc.id, { category: k as FixedCost['category'] })}>{v}</DropdownMenuItem>)}</DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right"><Input type="number" value={fc.monthlyAmount} onChange={e => updateFC(fc.id, { monthlyAmount: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" step={1} /></TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(fc.monthlyAmount * cm)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">{totalFC > 0 ? fmtP((fc.monthlyAmount * cm / totalFC) * 100) : '—'}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeFC(fc.id)}><X className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 bg-primary/5">
                <TableCell className="font-bold text-primary">Total Fixed Costs</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmt(monthlyFC)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{fmt(totalFC)}</TableCell>
                <TableCell className="text-right font-mono text-xs">100%</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ══ CM Income Statement ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />CM Income Statement</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="divide-y">
              {[
                { label: 'Total Revenue', value: totalRevenue, sub: `${products.length} products × ${cm} months` },
                { label: '(−) Total Variable Costs', value: -totalVC },
                { label: 'Contribution Margin', value: totalCM, bold: true, sub: `${fmtP(weightedCMpct)} CM ratio` },
                { label: '(−) Total Fixed Costs', value: -totalFC, sub: `${fmt(monthlyFC)}/mo × ${cm} months` },
                { label: 'Operating Income', value: operatingIncome, bold: true, final: true, sub: `${fmtP(oiMarginPct)} margin` },
              ].map(({ label, value, sub, bold, final }, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                  <div><span className={`text-sm ${bold || final ? 'font-semibold' : ''}`}>{label}</span>{sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}</div>
                  <span className={`font-mono text-sm ${final ? 'text-primary font-bold' : bold ? 'font-semibold' : ''} ${value < 0 && !final ? 'text-muted-foreground' : ''}`}>{value >= 0 ? '' : '−'}{fmt(Math.abs(value))}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report</h2>
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
          <h2 className="text-2xl font-bold">{settings.companyName} — CM Analysis FY{settings.fiscalYear}</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {products.length} Products | Months 1–{cm}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: `${productMetrics.length} products`, color: 'text-primary' },
            { label: 'Weighted CM%', value: `${weightedCMpct.toFixed(1)}%`, sub: `CM: ${fmt(totalCM)}`, color: weightedCMpct >= 40 ? 'text-green-600' : weightedCMpct >= 20 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Operating Income', value: fmt(operatingIncome), sub: `${oiMarginPct.toFixed(1)}% OI margin`, color: operatingIncome >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Margin of Safety', value: `${marginOfSafetyPct.toFixed(1)}%`, sub: beRevenue === Infinity ? 'No BE' : `BE: ${fmt(beRevenue)}`, color: marginOfSafetyPct > 20 ? 'text-green-600' : marginOfSafetyPct > 0 ? 'text-amber-600' : 'text-red-600' },
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

        {/* Product CM Detail Table */}
        <Card>
          <CardHeader><CardTitle>Product Contribution Margin Detail</CardTitle><CardDescription>Unit economics, volume, and contribution by product</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Product</th>
              <th className="p-2 text-right font-semibold">Price</th>
              <th className="p-2 text-right font-semibold">VC/Unit</th>
              <th className="p-2 text-right font-semibold">CM/Unit</th>
              <th className="p-2 text-right font-semibold">CM %</th>
              <th className="p-2 text-right font-semibold">YTD Units</th>
              <th className="p-2 text-right font-semibold">Revenue</th>
              <th className="p-2 text-right font-semibold">Total CM</th>
              <th className="p-2 text-right font-semibold">CM Mix</th>
            </tr></thead>
            <tbody>{productMetrics.map((p, i) => {
              const cmMix = totalCM > 0 ? (p.ytdCM / totalCM * 100) : 0;
              return (
                <tr key={p.name} className={`border-b ${p.cmPct < 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{p.name}</div></td>
                  <td className="p-2 text-right font-mono">${p.unitPrice}</td>
                  <td className="p-2 text-right font-mono">${p.vcPerUnit.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono">${p.cmPerUnit.toFixed(2)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${p.cmPct >= 40 ? 'text-green-600' : p.cmPct >= 20 ? 'text-amber-600' : 'text-red-600'}`}>{p.cmPct.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{p.ytdUnits.toLocaleString()}</td>
                  <td className="p-2 text-right font-mono">{fmt(p.ytdRevenue)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${p.ytdCM >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.ytdCM)}</td>
                  <td className="p-2 text-right font-mono">{cmMix.toFixed(1)}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total / Wtd Avg</td>
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{weightedCMpct.toFixed(1)}%</td>
              <td className="p-2 text-right font-mono">{productMetrics.reduce((s, p) => s + p.ytdUnits, 0).toLocaleString()}</td>
              <td className="p-2 text-right font-mono">{fmt(totalRevenue)}</td>
              <td className={`p-2 text-right font-mono font-bold ${totalCM >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalCM)}</td>
              <td className="p-2 text-right font-mono">100.0%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Contribution margin highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Weighted CM: ${weightedCMpct.toFixed(1)}%. Total contribution margin ${fmt(totalCM)} on ${fmt(totalRevenue)} revenue (${productMetrics.length} products).`);
                  items.push(`Operating income: ${fmt(operatingIncome)} after ${fmt(totalFC)} fixed costs. ${operatingIncome >= 0 ? 'Profitable — CM covers fixed costs.' : 'Below breakeven — CM does not cover fixed costs.'}`);
                  items.push(`Breakeven revenue: ${beRevenue === Infinity ? '—' : fmt(beRevenue)}. Margin of safety: ${marginOfSafetyPct.toFixed(1)}%${marginOfSafetyPct > 20 ? ' — comfortable buffer.' : marginOfSafetyPct > 0 ? ' — thin margin, monitor closely.' : ' — operating below breakeven.'}`);
                  const best = productMetrics.reduce((a, b) => a.cmPct > b.cmPct ? a : b);
                  const worst = productMetrics.reduce((a, b) => a.cmPct < b.cmPct ? a : b);
                  items.push(`Highest CM%: ${best.name} at ${best.cmPct.toFixed(1)}%. Lowest: ${worst.name} at ${worst.cmPct.toFixed(1)}%.`);
                  const negCM = productMetrics.filter(p => p.cmPct < 0);
                  if (negCM.length > 0) items.push(`${negCM.length} product${negCM.length > 1 ? 's' : ''} with negative CM: ${negCM.map(p => p.name).join(', ')} — selling below variable cost.`);
                  else items.push(`All ${productMetrics.length} products have positive contribution margins.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CM% by Product */}
        <Card>
          <CardHeader><CardTitle>Contribution Margin % by Product</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productMetrics.map((p, i) => ({ name: p.name, cmPct: p.cmPct, color: CHART_COLORS[i % CHART_COLORS.length] }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'CM%']} />
                  <Bar dataKey="cmPct" radius={[0, 4, 4, 0]}>
                    {productMetrics.map((p, i) => <Cell key={i} fill={p.cmPct >= 50 ? CHART_COLORS[i % CHART_COLORS.length] : '#e57373'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue vs CM vs FC */}
        <Card>
          <CardHeader><CardTitle>Monthly: Revenue, CM, and Fixed Costs</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}K`, '']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#1e3a5f" radius={[4, 4, 0, 0]} opacity={0.3} />
                  <Bar dataKey="cm" name="CM" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Line dataKey="fixedCost" name="Fixed Costs" type="monotone" stroke="#e57373" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line dataKey="operatingIncome" name="Op. Income" type="monotone" stroke="#000" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volume Scenario */}
        <Card>
          <CardHeader><CardTitle>Volume Sensitivity — Operating Income</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scenarioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="scenario" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}K`, '']} />
                  <ReferenceLine y={0} stroke="#e57373" strokeWidth={2} />
                  <Bar dataKey="oi" name="Operating Income" radius={[4, 4, 0, 0]}>
                    {scenarioData.map((d, i) => <Cell key={i} fill={d.oi >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                  <Line dataKey="cm" name="Total CM" type="monotone" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Fixed costs remain constant at {fmt(totalFC)} — only volume changes. Operating leverage amplifies gains and losses.</p>
          </CardContent>
        </Card>

        {/* Break-Even Visual */}
        <Card>
          <CardHeader><CardTitle>Break-Even Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Break-Even Revenue</p>
                <p className="text-2xl font-bold text-primary mt-1">{isFinite(beRevenue) ? fmt(beRevenue) : '∞'}</p>
                <p className="text-xs text-muted-foreground mt-1">FC {fmt(totalFC)} ÷ CM {fmtP(weightedCMpct)}</p>
              </div>
              <div className="p-4 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Margin of Safety</p>
                <p className={`text-2xl font-bold mt-1 ${marginOfSafety >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtP(marginOfSafetyPct)}</p>
                <p className="text-xs text-muted-foreground mt-1">{marginOfSafety >= 0 ? fmt(marginOfSafety) : `−${fmt(Math.abs(marginOfSafety))}`} {marginOfSafety >= 0 ? 'above' : 'below'} break-even</p>
              </div>
              <div className="p-4 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Operating Leverage</p>
                <p className="text-2xl font-bold text-primary mt-1">{isFinite(opLeverage) ? `${opLeverage.toFixed(1)}x` : '∞'}</p>
                <p className="text-xs text-muted-foreground mt-1">{isFinite(opLeverage) && opLeverage > 5 ? 'High leverage — profit sensitive to volume' : 'Moderate leverage'}</p>
              </div>
            </div>
            <div className="mt-8 mb-6">
              <div className="relative h-8 bg-muted rounded-full">
                {isFinite(beRevenue) && totalRevenue > 0 && (
                  <>
                    <div className="absolute inset-y-0 left-0 bg-primary/20 rounded-l-full overflow-hidden" style={{ width: `${Math.min(100, (beRevenue / Math.max(totalRevenue, beRevenue) * 1.2) * 100)}%` }} />
                    <div className={`absolute inset-y-0 left-0 rounded-l-full overflow-hidden ${totalRevenue >= beRevenue ? 'bg-green-500/30' : 'bg-red-500/30'}`} style={{ width: `${Math.min(100, (totalRevenue / Math.max(totalRevenue, beRevenue) * 1.2) * 100)}%` }} />
                    <div className="absolute inset-y-0 border-r-2 border-red-500" style={{ left: `${Math.min(100, (beRevenue / Math.max(totalRevenue, beRevenue) * 1.2) * 100)}%` }}>
                      <span className="absolute -top-5 -translate-x-1/2 text-[9px] text-red-600 font-mono">BE {fmt(beRevenue)}</span>
                    </div>
                    <div className="absolute inset-y-0 border-r-2 border-primary" style={{ left: `${Math.min(100, (totalRevenue / Math.max(totalRevenue, beRevenue) * 1.2) * 100)}%` }}>
                      <span className="absolute -bottom-5 -translate-x-1/2 text-[9px] text-primary font-mono">Actual {fmt(totalRevenue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">{settings.companyName} — Contribution Margin Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Across {products.length} products over {cm} months, <strong>{settings.companyName}</strong> generated {fmt(totalRevenue)} in revenue with a <strong>weighted contribution margin of {fmtP(weightedCMpct)}</strong> ({fmt(totalCM)} total CM).
                </p>
                {(() => {
                  const best = productMetrics.reduce((m, p) => p.cmPct > m.cmPct ? p : m, productMetrics[0]);
                  const worst = productMetrics.reduce((m, p) => p.cmPct < m.cmPct ? p : m, productMetrics[0]);
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Highest CM%: <strong>{best.name}</strong> at {fmtP(best.cmPct)} ({fmtD(best.cmPerUnit)}/unit). Lowest: <strong>{worst.name}</strong> at {fmtP(worst.cmPct)}. Products with higher CM% are most valuable for absorbing fixed costs.
                    </p>
                  );
                })()}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Fixed costs total {fmt(totalFC)} ({fmt(monthlyFC)}/month). Break-even revenue is <strong>{isFinite(beRevenue) ? fmt(beRevenue) : 'not achievable'}</strong>. The company is currently {marginOfSafety >= 0 ? `<strong>${fmtP(marginOfSafetyPct)}</strong> above break-even` : `<strong>${fmtP(Math.abs(marginOfSafetyPct))}</strong> below break-even`}{marginOfSafety >= 0 ? ', indicating a healthy safety cushion' : ', indicating a need to increase volume or reduce fixed costs'}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Operating leverage is <strong>{isFinite(opLeverage) ? `${opLeverage.toFixed(1)}x` : 'infinite (at break-even)'}</strong> — {isFinite(opLeverage) && opLeverage > 5 ? 'a 10% increase in volume would drive approximately a 50%+ increase in operating income' : 'profit changes roughly in proportion to volume changes'}. Use the volume scenario slider to stress-test different demand levels.
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
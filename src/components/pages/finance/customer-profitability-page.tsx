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
  HelpCircle, Calculator, Percent, Building2,
  Lightbulb, ChevronRight, Upload, BarChart3, Plus, X,
  Settings2, CheckCircle2, Layers, Users, UserCheck,
  AlertTriangle, Crown, Heart, ShieldCheck, Repeat,
  ArrowUpRight, ArrowDownRight, UserPlus, Zap
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
  AreaChart, Area, PieChart, Pie
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CustomerSegment {
  id: string;
  name: string;
  tier: 'Enterprise' | 'Mid-Market' | 'SMB' | 'Consumer' | 'Custom';
  // Volume
  customerCount: number;
  avgRevenuePerCustomer: number;    // $K per year
  // Cost-to-serve (annual per customer, $K)
  acquisitionCost: number;          // CAC $K
  onboardingCost: number;           // $K per customer
  supportCost: number;              // $K per customer per year
  accountMgmtCost: number;          // $K per customer per year
  // Retention
  annualRetentionRate: number;      // 0-100 %
  avgLifespanYears: number;         // estimated customer lifespan
  // Monthly revenue (12 months, total segment $K)
  monthlyRevenue: number[];
}

interface CustomerSettings {
  companyName: string;
  fiscalYear: number;
  currentMonth: number;
  discountRate: number;             // for LTV NPV, %
  companyOverhead: number;          // $K, allocated across segments
  ohAllocMethod: 'revenue' | 'customers' | 'equal';
}

interface CustomerPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e'];
const TIER_COLORS: Record<string, string> = {
  'Enterprise': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Mid-Market': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'SMB': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Consumer': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Custom': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const s = [0.85, 0.88, 0.95, 1.00, 1.05, 1.08, 1.12, 1.10, 1.05, 1.00, 0.95, 0.97];

function buildDefaultSegments(): CustomerSegment[] {
  const mk = (id: string, name: string, tier: CustomerSegment['tier'], count: number, arpc: number, cac: number, onb: number, sup: number, am: number, ret: number, life: number): CustomerSegment => ({
    id, name, tier, customerCount: count, avgRevenuePerCustomer: arpc,
    acquisitionCost: cac, onboardingCost: onb, supportCost: sup, accountMgmtCost: am,
    annualRetentionRate: ret, avgLifespanYears: life,
    monthlyRevenue: s.map(sv => Math.round(count * arpc / 12 * sv * (0.97 + Math.random() * 0.06))),
  });
  return [
    mk('s1', 'Enterprise Accounts', 'Enterprise', 45, 120, 35, 12, 8, 15, 95, 8),
    mk('s2', 'Mid-Market', 'Mid-Market', 180, 36, 12, 4, 3.5, 5, 88, 5),
    mk('s3', 'SMB SaaS', 'SMB', 1200, 4.8, 1.2, 0.3, 0.5, 0.2, 78, 3),
    mk('s4', 'Self-Serve / Free-to-Paid', 'Consumer', 8500, 0.6, 0.08, 0, 0.05, 0, 62, 1.5),
    mk('s5', 'Strategic Partners', 'Enterprise', 12, 250, 80, 25, 15, 30, 97, 10),
  ];
}

const DEFAULT_SETTINGS: CustomerSettings = {
  companyName: 'Acme Corp',
  fiscalYear: new Date().getFullYear(),
  currentMonth: 12,
  discountRate: 10,
  companyOverhead: 1800,
  ohAllocMethod: 'revenue',
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n.toFixed(1)}%`;
const fmtN = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
const fmtR = (n: number) => `${n.toFixed(1)}x`;
const sum = (arr: number[], start: number, end: number) => arr.slice(start, end).reduce((a, v) => a + v, 0);


// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseCustomerCSV(csvText: string): CustomerSegment[] | null {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 2) return null;
  const rows = parsed.data as Record<string, string>[];
  const items: CustomerSegment[] = [];
  for (const row of rows) {
    const name = (row['Segment'] || row['Name'] || row['Customer'] || '').trim();
    if (!name) continue;
    const tierRaw = (row['Tier'] || row['Type'] || 'Custom').trim();
    const tier = (['Enterprise', 'Mid-Market', 'SMB', 'Consumer'].includes(tierRaw) ? tierRaw : 'Custom') as CustomerSegment['tier'];
    const count = parseInt(row['Customers'] || row['Count']) || 100;
    const arpc = parseFloat(row['ARPC'] || row['AvgRevenue']) || 10;
    const cac = parseFloat(row['CAC'] || row['AcqCost']) || 1;
    const onb = parseFloat(row['Onboarding'] || row['OnbCost']) || 0;
    const sup = parseFloat(row['Support'] || row['SupportCost']) || 0.5;
    const am = parseFloat(row['AcctMgmt'] || row['AMCost']) || 0;
    const ret = parseFloat(row['Retention'] || row['RetentionRate']) || 80;
    const life = parseFloat(row['Lifespan'] || row['AvgYears']) || 3;
    const monthlyRevenue: number[] = [];
    for (const m of MONTHS) monthlyRevenue.push(parseFloat(row[`Rev_${m}`]) || 0);
    if (monthlyRevenue.every(r => r === 0)) {
      const annRev = count * arpc;
      s.forEach((sv, i) => monthlyRevenue[i] = Math.round(annRev / 12 * sv));
    }
    items.push({ id: `s${items.length}`, name, tier, customerCount: count, avgRevenuePerCustomer: arpc, acquisitionCost: cac, onboardingCost: onb, supportCost: sup, accountMgmtCost: am, annualRetentionRate: ret, avgLifespanYears: life, monthlyRevenue });
  }
  return items.length >= 2 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "ARPC": "Average Revenue Per Customer (annual). Total segment revenue ÷ customer count.",
  "CAC": "Customer Acquisition Cost. Marketing + sales cost to acquire one new customer.",
  "Cost-to-Serve": "Total annual cost per customer: Support + Account Management + Onboarding (amortized).",
  "Gross Profit": "Revenue − Cost-to-Serve (at segment level).",
  "LTV": "Customer Lifetime Value. NPV of all future profits from one customer over their lifespan.",
  "LTV:CAC Ratio": "LTV ÷ CAC. Target ≥ 3x. Below 1x = losing money on acquisition.",
  "Retention Rate": "% of customers retained year-over-year. 90% = 10% annual churn.",
  "Churn Rate": "1 − Retention Rate. % of customers lost per year.",
  "Payback Period": "CAC ÷ Annual Profit Per Customer. Months to recoup acquisition cost.",
  "Revenue Concentration": "How much revenue comes from top customers. High = risky.",
  "Segment Margin": "Segment Net Income ÷ Segment Revenue. Final profitability after overhead.",
  "Cohort Retention": "How revenue from a customer cohort decays over time.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Customer Profitability Glossary</DialogTitle>
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

const CustomerGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Customer Profitability Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Define Segments', desc: 'Group customers by tier (Enterprise, Mid-Market, SMB, Consumer) or behavior.' },
                { step: '2', title: 'Set Unit Economics', desc: 'ARPC, CAC, and cost-to-serve per customer per segment.' },
                { step: '3', title: 'Model Retention', desc: 'Retention rate and avg lifespan drive LTV calculation.' },
                { step: '4', title: 'Calculate LTV & Ratios', desc: 'LTV = NPV of annual profit × lifespan. Target LTV:CAC ≥ 3x.' },
                { step: '5', title: 'Analyze Concentration', desc: 'Check if revenue is dangerously concentrated in few segments.' },
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
                { label: 'Segment Revenue', formula: 'Customers × ARPC', example: '45 × $120K = $5,400K' },
                { label: 'Cost-to-Serve / Cust', formula: 'Support + Acct Mgmt + Onboarding', example: '$8K + $15K + $12K = $35K' },
                { label: 'Gross Profit / Cust', formula: 'ARPC − Cost-to-Serve', example: '$120K − $35K = $85K' },
                { label: 'LTV (Simple)', formula: 'Annual Profit × Avg Lifespan', example: '$85K × 8 yrs = $680K' },
                { label: 'LTV (NPV)', formula: 'Σ Annual Profit ÷ (1 + r)^t', example: 'Discounted at 10% over 8 yrs' },
                { label: 'LTV:CAC', formula: 'LTV ÷ CAC', example: '$680K ÷ $35K = 19.4x' },
                { label: 'Payback (months)', formula: 'CAC ÷ (Monthly Profit/Cust)', example: '$35K ÷ ($85K/12) = 4.9 mo' },
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
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> A segment with high revenue but low LTV:CAC may be destroying value. Focus on segments where LTV:CAC ≥ 3x and payback &lt; 12 months.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE CSV & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CUSTOMER_CSV = `Segment,Tier,Customers,ARPC,CAC,Onboarding,Support,AcctMgmt,Retention,Lifespan
Enterprise Accounts,Enterprise,45,120,35,12,8,15,95,8
Mid-Market,Mid-Market,180,36,12,4,3.5,5,88,5
SMB SaaS,SMB,1200,4.8,1.2,0.3,0.5,0.2,78,3
Self-Serve / Free-to-Paid,Consumer,8500,0.6,0.08,0,0.05,0,62,1.5
Strategic Partners,Enterprise,12,250,80,25,15,30,97,10`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CUSTOMER_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_customers.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Required Data Format</DialogTitle>
          <DialogDescription>Prepare your customer segment data</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">One row per customer segment. All monetary values in $K except where noted.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Segment</th>
                    <th className="p-2 text-left">Tier</th>
                    <th className="p-2 text-right">Customers</th>
                    <th className="p-2 text-right">ARPC ($K)</th>
                    <th className="p-2 text-right">CAC ($K)</th>
                    <th className="p-2 text-right">Support ($K)</th>
                    <th className="p-2 text-right">Retention %</th>
                    <th className="p-2 text-right">Lifespan (yr)</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Enterprise', 'Enterprise', '45', '120', '35', '8', '95', '8'],
                      ['SMB SaaS', 'SMB', '1200', '4.8', '1.2', '0.5', '78', '3'],
                      ['Self-Serve', 'Consumer', '8500', '0.6', '0.08', '0.05', '62', '1.5'],
                    ].map(([seg, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{seg}</td>
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
                  { name: 'Segment', required: true, desc: 'Segment name' },
                  { name: 'Tier', required: false, desc: 'Enterprise, Mid-Market, SMB, Consumer' },
                  { name: 'Customers', required: true, desc: 'Number of customers in segment' },
                  { name: 'ARPC', required: true, desc: 'Avg Revenue Per Customer ($K/yr)' },
                  { name: 'CAC', required: true, desc: 'Customer Acquisition Cost ($K)' },
                  { name: 'Onboarding', required: false, desc: 'Onboarding cost per customer ($K)' },
                  { name: 'Support', required: false, desc: 'Annual support cost per customer ($K)' },
                  { name: 'AcctMgmt', required: false, desc: 'Annual account management cost ($K)' },
                  { name: 'Retention', required: true, desc: 'Annual retention rate (%)' },
                  { name: 'Lifespan', required: true, desc: 'Avg customer lifespan (years)' },
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
                <li>• All monetary values in <strong>$K</strong> (thousands) per customer per year.</li>
                <li>• Optionally add Rev_Jan...Rev_Dec for monthly segment revenue totals ($K).</li>
                <li>• At least 2 segments required.</li>
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
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Users className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Customer Profitability</CardTitle>
          <CardDescription className="text-base mt-2">Analyze profit contribution by customer segments and lifetime value</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Crown, title: 'Segment P&L', desc: 'Revenue, cost-to-serve, and net income per segment' },
              { icon: Heart, title: 'LTV & Retention', desc: 'Lifetime value, LTV:CAC ratio, and payback period' },
              { icon: BarChart3, title: 'Concentration Risk', desc: 'Revenue mix and Pareto analysis across segments' },
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
                  <div><CardTitle className="text-base">Upload Customer Data</CardTitle><CardDescription className="text-xs">Import segments from CSV</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected — ready to analyze</span></div>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with customer segments, unit economics, and retention.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Segment | Customers | ARPU | CostToServe | CAC | Retention%</p>
                      <p className="text-muted-foreground">e.g. Enterprise, 50, 120, 45, 800, 92</p>
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
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">Pre-loaded 5-segment sample</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Start with a sample SaaS company: Enterprise, Mid-Market, SMB, Consumer, and Strategic Partner segments.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />5 segments with full unit economics</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />LTV, CAC, retention, and payback</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Revenue concentration analysis</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Cohort retention curves</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Both paths lead to the same analysis. You can always edit, add, or remove segments afterward.</p>
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

export default function CustomerProfitPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: CustomerPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  const [settings, setSettings] = useState<CustomerSettings>(DEFAULT_SETTINGS);
  const [segments, setSegments] = useState<CustomerSegment[]>(buildDefaultSegments);

  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try { const raw = Papa.unparse(data); return parseCustomerCSV(raw); } catch { return null; }
  }, [data]);
  const [parseError] = useState<string | null>(null);
  const applyUpload = useCallback(() => { if (parsedUpload) setSegments(parsedUpload); setShowIntro(false); }, [parsedUpload]);

  const cm = settings.currentMonth;
  const r = settings.discountRate / 100;

  // ── Segment metrics ──
  const segmentMetrics = useMemo(() => segments.map(seg => {
    const ytdRevenue = sum(seg.monthlyRevenue, 0, cm);
    const annualRevenue = seg.customerCount * seg.avgRevenuePerCustomer;
    const costToServePerCust = seg.supportCost + seg.accountMgmtCost + seg.onboardingCost;
    const totalCostToServe = costToServePerCust * seg.customerCount;
    const grossProfit = ytdRevenue - totalCostToServe * (cm / 12);
    const gpPerCust = seg.avgRevenuePerCustomer - costToServePerCust;
    const gpMarginPct = ytdRevenue > 0 ? (grossProfit / ytdRevenue) * 100 : 0;

    // LTV (NPV)
    let ltv = 0;
    let retainedPct = 1;
    for (let y = 0; y < Math.ceil(seg.avgLifespanYears); y++) {
      const fraction = y < Math.floor(seg.avgLifespanYears) ? 1 : seg.avgLifespanYears - Math.floor(seg.avgLifespanYears);
      ltv += (gpPerCust * fraction * retainedPct) / Math.pow(1 + r, y + 1);
      retainedPct *= seg.annualRetentionRate / 100;
    }

    const ltvCacRatio = seg.acquisitionCost > 0 ? ltv / seg.acquisitionCost : Infinity;
    const monthlyProfit = gpPerCust / 12;
    const paybackMonths = monthlyProfit > 0 ? seg.acquisitionCost / monthlyProfit : Infinity;
    const churnRate = 100 - seg.annualRetentionRate;

    return {
      ...seg, ytdRevenue, annualRevenue, costToServePerCust, totalCostToServe,
      grossProfit, gpPerCust, gpMarginPct, ltv, ltvCacRatio, paybackMonths, churnRate,
    };
  }), [segments, cm, r]);

  // OH allocation
  const totalRevenue = useMemo(() => segmentMetrics.reduce((s, seg) => s + seg.ytdRevenue, 0), [segmentMetrics]);
  const totalCustomers = useMemo(() => segmentMetrics.reduce((s, seg) => s + seg.customerCount, 0), [segmentMetrics]);

  const segmentPnL = useMemo(() => segmentMetrics.map(seg => {
    const oh = settings.companyOverhead;
    let allocOH = 0;
    switch (settings.ohAllocMethod) {
      case 'revenue': allocOH = totalRevenue > 0 ? oh * (seg.ytdRevenue / totalRevenue) : 0; break;
      case 'customers': allocOH = totalCustomers > 0 ? oh * (seg.customerCount / totalCustomers) : 0; break;
      case 'equal': allocOH = oh / segmentMetrics.length; break;
    }
    const netIncome = seg.grossProfit - allocOH;
    const netMarginPct = seg.ytdRevenue > 0 ? (netIncome / seg.ytdRevenue) * 100 : 0;
    return { ...seg, allocOH, netIncome, netMarginPct };
  }), [segmentMetrics, settings, totalRevenue, totalCustomers]);

  // Totals
  const totals = useMemo(() => {
    const revenue = segmentPnL.reduce((s, seg) => s + seg.ytdRevenue, 0);
    const cts = segmentPnL.reduce((s, seg) => s + seg.totalCostToServe * (cm / 12), 0);
    const gp = revenue - cts;
    const ni = segmentPnL.reduce((s, seg) => s + seg.netIncome, 0);
    const customers = segmentPnL.reduce((s, seg) => s + seg.customerCount, 0);
    const weightedRet = customers > 0 ? segmentPnL.reduce((s, seg) => s + seg.annualRetentionRate * seg.customerCount, 0) / customers : 0;
    return { revenue, cts, gp, ni, customers, gpPct: revenue > 0 ? (gp / revenue) * 100 : 0, niPct: revenue > 0 ? (ni / revenue) * 100 : 0, weightedRet };
  }, [segmentPnL, cm]);

  // Cohort retention curve
  const cohortData = useMemo(() => {
    const years = Array.from({ length: 10 }, (_, i) => i + 1);
    return years.map(y => {
      const row: Record<string, any> = { year: `Y${y}` };
      segments.forEach(seg => { row[seg.name] = Math.round(Math.pow(seg.annualRetentionRate / 100, y) * 100); });
      return row;
    });
  }, [segments]);

  // Revenue concentration
  const concentrationData = useMemo(() => {
    const sorted = [...segmentPnL].sort((a, b) => b.ytdRevenue - a.ytdRevenue);
    let cumRev = 0;
    return sorted.map((seg, i) => {
      cumRev += seg.ytdRevenue;
      return { name: seg.name, revenue: seg.ytdRevenue, cumPct: totalRevenue > 0 ? (cumRev / totalRevenue) * 100 : 0 };
    });
  }, [segmentPnL, totalRevenue]);

  // Monthly revenue trend
  const monthlyTrend = useMemo(() => MONTHS.slice(0, cm).map((m, mi) => {
    const row: Record<string, any> = { month: m };
    segments.forEach(seg => { row[seg.name] = seg.monthlyRevenue[mi]; });
    row['total'] = segments.reduce((s, seg) => s + seg.monthlyRevenue[mi], 0);
    return row;
  }), [segments, cm]);

  // ── CRUD ──
  const updateSegment = useCallback((id: string, updates: Partial<CustomerSegment>) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const updateMonthRevenue = useCallback((id: string, mi: number, value: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id !== id) return seg;
      const arr = [...seg.monthlyRevenue]; arr[mi] = value;
      return { ...seg, monthlyRevenue: arr };
    }));
  }, []);

  const addSegment = useCallback(() => {
    setSegments(prev => [...prev, {
      id: `s${Date.now()}`, name: 'New Segment', tier: 'Custom' as const,
      customerCount: 100, avgRevenuePerCustomer: 10, acquisitionCost: 2, onboardingCost: 0.5,
      supportCost: 1, accountMgmtCost: 0.5, annualRetentionRate: 80, avgLifespanYears: 3,
      monthlyRevenue: Array(12).fill(Math.round(100 * 10 / 12)),
    }]);
  }, []);

  const removeSegment = useCallback((id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    if (expandedSegment === id) setExpandedSegment(null);
  }, [expandedSegment]);

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `CustomerProfit_${settings.fiscalYear}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [settings.fiscalYear, toast]);

  const handleDownloadCSV = useCallback(() => {
    const rows = segmentPnL.map(seg => ({
      Segment: seg.name, Tier: seg.tier, Customers: seg.customerCount, 'ARPC ($K)': seg.avgRevenuePerCustomer,
      'CAC ($K)': seg.acquisitionCost, 'CTS/Cust ($K)': seg.costToServePerCust.toFixed(1),
      'YTD Revenue ($K)': seg.ytdRevenue.toFixed(1), 'Gross Profit ($K)': seg.grossProfit.toFixed(1),
      'GP Margin %': `${seg.gpMarginPct.toFixed(1)}%`, 'LTV ($K)': seg.ltv.toFixed(1),
      'LTV:CAC': seg.ltvCacRatio === Infinity ? '∞' : seg.ltvCacRatio.toFixed(1),
      'Payback (mo)': seg.paybackMonths === Infinity ? '∞' : seg.paybackMonths.toFixed(1),
      'Retention %': `${seg.annualRetentionRate}%`, 'Net Income ($K)': seg.netIncome.toFixed(1),
      'Net Margin %': `${seg.netMarginPct.toFixed(1)}%`,
    }));
    let csv = `CUSTOMER PROFITABILITY — ${settings.companyName} FY${settings.fiscalYear}\n\n`;
    csv += Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CustomerProfit_${settings.fiscalYear}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [segmentPnL, settings, toast]);

  if (showIntro) return <IntroPage hasUploadedData={!!parsedUpload} parseError={parseError} onStartWithData={applyUpload} onStartManual={() => setShowIntro(false)} />;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Customer Profitability</h1><p className="text-muted-foreground mt-1">{settings.companyName} — FY{settings.fiscalYear} | {fmtN(totalCustomers)} customers | {segments.length} segments</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <CustomerGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Settings</CardTitle><CardDescription>Period, overhead, and discount rate</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={settings.companyName} onChange={e => setSettings(p => ({ ...p, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Fiscal Year</Label><Input type="number" value={settings.fiscalYear} onChange={e => setSettings(p => ({ ...p, fiscalYear: parseInt(e.target.value) || 2025 }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Months</Label>
              <div className="flex items-center gap-2"><Slider value={[settings.currentMonth]} onValueChange={([v]) => setSettings(p => ({ ...p, currentMonth: v }))} min={1} max={12} step={1} className="flex-1" /><span className="text-sm font-mono w-6">{cm}</span></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Discount Rate (%)</Label><Input type="number" value={settings.discountRate} onChange={e => setSettings(p => ({ ...p, discountRate: parseFloat(e.target.value) || 10 }))} className="h-8 text-sm font-mono" step={0.5} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Company OH ($K)</Label><Input type="number" value={settings.companyOverhead} onChange={e => setSettings(p => ({ ...p, companyOverhead: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">OH Alloc</Label>
              <div className="flex gap-1">{(['revenue', 'customers', 'equal'] as const).map(m => (
                <Button key={m} variant={settings.ohAllocMethod === m ? 'default' : 'outline'} size="sm" className="text-[9px] h-7 flex-1 capitalize px-1" onClick={() => setSettings(p => ({ ...p, ohAllocMethod: m }))}>{m === 'customers' ? 'Cust' : m}</Button>
              ))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Portfolio Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: fmt(totals.revenue) },
                { label: 'Total Customers', value: fmtN(totals.customers) },
                { label: 'Gross Profit', value: fmt(totals.gp), sub: fmtP(totals.gpPct) },
                { label: 'Net Income', value: fmt(totals.ni), sub: fmtP(totals.niPct) },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold text-primary">{value}</p>
                  {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
              {[
                { label: 'Wtd Avg Retention', value: fmtP(totals.weightedRet) },
                { label: 'Best LTV:CAC', value: (() => { const best = segmentPnL.reduce((m, s) => s.ltvCacRatio > m.ltvCacRatio && s.ltvCacRatio !== Infinity ? s : m, segmentPnL[0]); return `${fmtR(best.ltvCacRatio)} (${best.name})`; })() },
                { label: 'Top Segment Rev', value: (() => { const top = segmentPnL.reduce((m, s) => s.ytdRevenue > m.ytdRevenue ? s : m, segmentPnL[0]); return `${fmt(top.ytdRevenue)} (${top.name})`; })() },
                { label: 'Company OH', value: fmt(settings.companyOverhead) },
              ].map(({ label, value }) => (
                <div key={label} className="text-center"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-semibold">{value}</p></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Segment Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Layers className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Segment P&L & Unit Economics</CardTitle><CardDescription>Click row to expand — edit all inputs inline</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={addSegment}><Plus className="w-4 h-4 mr-1" />Add Segment</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Segment</TableHead>
                  <TableHead className="text-right">Cust</TableHead>
                  <TableHead className="text-right">ARPC</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">CTS/C</TableHead>
                  <TableHead className="text-right">GP %</TableHead>
                  <TableHead className="text-right">LTV</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">LTV:CAC</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                  <TableHead className="text-right">Ret %</TableHead>
                  <TableHead className="text-right">Net Inc</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segmentPnL.map((seg, i) => {
                  const ltvOk = seg.ltvCacRatio >= 3;
                  const paybackOk = seg.paybackMonths <= 12;
                  return (
                    <React.Fragment key={seg.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedSegment(prev => prev === seg.id ? null : seg.id)}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedSegment === seg.id ? 'rotate-90' : ''}`} />
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-xs font-medium truncate max-w-[90px]">{seg.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtN(seg.customerCount)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(seg.avgRevenuePerCustomer, 1)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(seg.ytdRevenue)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(seg.costToServePerCust, 1)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtP(seg.gpMarginPct)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">{fmt(seg.ltv, 1)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(seg.acquisitionCost, 1)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs font-semibold ${ltvOk ? 'text-green-600' : 'text-red-600'}`}>{seg.ltvCacRatio === Infinity ? '∞' : fmtR(seg.ltvCacRatio)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs ${paybackOk ? 'text-green-600' : 'text-red-600'}`}>{seg.paybackMonths === Infinity ? '∞' : `${seg.paybackMonths.toFixed(0)}mo`}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtP(seg.annualRetentionRate)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs font-semibold ${seg.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(seg.netIncome)}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeSegment(seg.id)}><X className="w-3 h-3" /></Button></TableCell>
                      </TableRow>
                      {expandedSegment === seg.id && (
                        <TableRow>
                          <TableCell colSpan={13} className="p-0">
                            <div className="bg-muted/10 border-y px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{seg.name}</span>
                                <Badge className={`text-[9px] ${TIER_COLORS[seg.tier]}`}>{seg.tier}</Badge>
                              </div>
                              {/* Editable unit economics */}
                              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                {[
                                  { label: 'Customers', value: seg.customerCount, key: 'customerCount', step: 1 },
                                  { label: 'ARPC ($K/yr)', value: seg.avgRevenuePerCustomer, key: 'avgRevenuePerCustomer', step: 0.1 },
                                  { label: 'CAC ($K)', value: seg.acquisitionCost, key: 'acquisitionCost', step: 0.1 },
                                  { label: 'Onboarding ($K)', value: seg.onboardingCost, key: 'onboardingCost', step: 0.1 },
                                  { label: 'Support ($K/yr)', value: seg.supportCost, key: 'supportCost', step: 0.1 },
                                  { label: 'Acct Mgmt ($K/yr)', value: seg.accountMgmtCost, key: 'accountMgmtCost', step: 0.1 },
                                  { label: 'Retention (%)', value: seg.annualRetentionRate, key: 'annualRetentionRate', step: 1 },
                                  { label: 'Avg Lifespan (yr)', value: seg.avgLifespanYears, key: 'avgLifespanYears', step: 0.5 },
                                ].map(({ label, value, key, step }) => (
                                  <div key={key} className="space-y-0.5">
                                    <Label className="text-[10px]">{label}</Label>
                                    <Input type="number" value={value} onChange={e => updateSegment(seg.id, { [key]: parseFloat(e.target.value) || 0 })} className="h-6 text-xs font-mono" step={step} />
                                  </div>
                                ))}
                                <div className="space-y-0.5">
                                  <Label className="text-[10px]">Tier</Label>
                                  <div className="flex gap-0.5 flex-wrap">
                                    {(['Enterprise', 'Mid-Market', 'SMB', 'Consumer'] as const).map(t => (
                                      <Button key={t} variant={seg.tier === t ? 'default' : 'outline'} size="sm" className="text-[8px] h-5 px-1.5" onClick={() => updateSegment(seg.id, { tier: t })}>{t}</Button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px]">Name</Label>
                                  <Input value={seg.name} onChange={e => updateSegment(seg.id, { name: e.target.value })} className="h-6 text-xs" />
                                </div>
                              </div>
                              {/* Monthly revenue */}
                              <div>
                                <Label className="text-[10px] font-semibold text-muted-foreground">Monthly Segment Revenue ($K)</Label>
                                <div className="overflow-x-auto mt-1">
                                  <table className="w-full text-xs font-mono">
                                    <thead><tr className="text-muted-foreground">
                                      {MONTHS.slice(0, cm).map(m => <th key={m} className="p-1 text-center w-16">{m}</th>)}
                                      <th className="p-1 text-center border-l font-semibold">Total</th>
                                    </tr></thead>
                                    <tbody><tr>
                                      {MONTHS.slice(0, cm).map((m, mi) => (
                                        <td key={m} className="p-0.5">
                                          <Input type="number" value={seg.monthlyRevenue[mi]} onChange={e => updateMonthRevenue(seg.id, mi, parseFloat(e.target.value) || 0)} className="h-5 w-full text-center text-[10px] font-mono p-0" />
                                        </td>
                                      ))}
                                      <td className="p-1 text-center font-semibold border-l">{fmt(seg.ytdRevenue)}</td>
                                    </tr></tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                <TableRow className="border-t-2 bg-primary/5">
                  <TableCell className="font-bold text-primary">Total</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtN(totals.customers)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmt(totals.revenue)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtP(totals.gpPct)}</TableCell>
                  <TableCell colSpan={4}></TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtP(totals.weightedRet)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs font-bold ${totals.ni >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.ni)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Calculation Breakdown ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />P&L Waterfall</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="divide-y">
              {[
                { label: 'Total Customer Revenue', value: totals.revenue, sub: `${fmtN(totals.customers)} customers × ${cm} months` },
                { label: '(−) Total Cost-to-Serve', value: -totals.cts },
                { label: 'Gross Profit', value: totals.gp, bold: true, sub: `${fmtP(totals.gpPct)} margin` },
                { label: '(−) Company Overhead', value: -settings.companyOverhead, sub: `Allocated by ${settings.ohAllocMethod}` },
                { label: 'Net Income', value: totals.ni, bold: true, final: true, sub: `${fmtP(totals.niPct)} margin` },
              ].map(({ label, value, sub, bold, final }, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                  <div><span className={`text-sm ${bold || final ? 'font-semibold' : ''}`}>{label}</span>{sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}</div>
                  <span className={`font-mono text-sm ${final ? 'text-primary font-bold' : bold ? 'font-semibold' : ''}`}>{value >= 0 ? '' : '−'}{fmt(Math.abs(value))}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Customer Report</h2></div>
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
          <h2 className="text-2xl font-bold">{settings.companyName} — FY{settings.fiscalYear} Customer Profitability</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {segments.length} Segments | {fmtN(totals.customers)} Customers</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(totals.revenue), sub: `${fmtN(totals.customers)} customers`, color: 'text-primary' },
            { label: 'Net Margin', value: `${totals.niPct.toFixed(1)}%`, sub: `NI: ${fmt(totals.ni)}`, color: totals.ni >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Avg Retention', value: `${totals.weightedRet.toFixed(1)}%`, sub: totals.weightedRet >= 90 ? 'Strong loyalty' : totals.weightedRet >= 75 ? 'Moderate' : 'High churn risk', color: totals.weightedRet >= 90 ? 'text-green-600' : totals.weightedRet >= 75 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Unprofitable', value: `${segmentPnL.filter(s => s.netIncome < 0).length}`, sub: `of ${segmentPnL.length} segments`, color: segmentPnL.some(s => s.netIncome < 0) ? 'text-red-600' : 'text-green-600' },
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

        {/* Segment P&L Table */}
        <Card>
          <CardHeader><CardTitle>Segment P&L & Unit Economics</CardTitle><CardDescription>Revenue, margins, LTV:CAC, and retention by customer segment</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Segment</th>
              <th className="p-2 text-right font-semibold">Customers</th>
              <th className="p-2 text-right font-semibold">Revenue</th>
              <th className="p-2 text-right font-semibold">GP</th>
              <th className="p-2 text-right font-semibold">GP %</th>
              <th className="p-2 text-right font-semibold">Alloc OH</th>
              <th className="p-2 text-right font-semibold">Net Income</th>
              <th className="p-2 text-right font-semibold">Net %</th>
              <th className="p-2 text-right font-semibold">LTV:CAC</th>
              <th className="p-2 text-right font-semibold">Retention</th>
              <th className="p-2 text-right font-semibold">Rev Mix</th>
            </tr></thead>
            <tbody>{segmentPnL.map((s, i) => {
              const revMix = totals.revenue > 0 ? (s.ytdRevenue / totals.revenue * 100) : 0;
              return (
                <tr key={s.name} className={`border-b ${s.netIncome < 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{s.name}</div></td>
                  <td className="p-2 text-right font-mono">{fmtN(s.customerCount)}</td>
                  <td className="p-2 text-right font-mono">{fmt(s.ytdRevenue)}</td>
                  <td className="p-2 text-right font-mono">{fmt(s.grossProfit)}</td>
                  <td className={`p-2 text-right font-mono ${s.gpMarginPct >= 40 ? 'text-green-600' : s.gpMarginPct >= 20 ? 'text-amber-600' : 'text-red-600'}`}>{s.gpMarginPct.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{fmt(s.allocOH)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${s.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(s.netIncome)}</td>
                  <td className={`p-2 text-right font-mono ${s.netMarginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.netMarginPct.toFixed(1)}%</td>
                  <td className={`p-2 text-right font-mono font-semibold ${s.ltvCacRatio >= 3 ? 'text-green-600' : s.ltvCacRatio >= 1 ? 'text-amber-600' : 'text-red-600'}`}>{s.ltvCacRatio === Infinity ? '∞' : s.ltvCacRatio.toFixed(1)}x</td>
                  <td className={`p-2 text-right font-mono ${s.annualRetentionRate >= 90 ? 'text-green-600' : s.annualRetentionRate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{s.annualRetentionRate.toFixed(0)}%</td>
                  <td className="p-2 text-right font-mono">{revMix.toFixed(1)}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total</td>
              <td className="p-2 text-right font-mono">{fmtN(totals.customers)}</td>
              <td className="p-2 text-right font-mono">{fmt(totals.revenue)}</td>
              <td className="p-2 text-right font-mono">{fmt(totals.gp)}</td>
              <td className="p-2 text-right font-mono">{totals.gpPct.toFixed(1)}%</td>
              <td className="p-2 text-right font-mono">{fmt(segmentPnL.reduce((s, seg) => s + seg.allocOH, 0))}</td>
              <td className={`p-2 text-right font-mono font-bold ${totals.ni >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.ni)}</td>
              <td className="p-2 text-right font-mono">{totals.niPct.toFixed(1)}%</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{totals.weightedRet.toFixed(0)}%</td>
              <td className="p-2 text-right font-mono">100.0%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Customer profitability highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Portfolio: ${fmt(totals.revenue)} revenue from ${fmtN(totals.customers)} customers across ${segmentPnL.length} segments. Net margin: ${totals.niPct.toFixed(1)}%.`);
                  const bestLTV = segmentPnL.reduce((a, b) => (a.ltvCacRatio === Infinity ? 0 : a.ltvCacRatio) > (b.ltvCacRatio === Infinity ? 0 : b.ltvCacRatio) ? a : b);
                  items.push(`Best unit economics: ${bestLTV.name} with LTV:CAC of ${bestLTV.ltvCacRatio === Infinity ? '∞' : bestLTV.ltvCacRatio.toFixed(1)}x and ${bestLTV.paybackMonths === Infinity ? '—' : bestLTV.paybackMonths.toFixed(0) + ' month'} payback.`);
                  const worstSeg = segmentPnL.reduce((a, b) => a.netMarginPct < b.netMarginPct ? a : b);
                  if (worstSeg.netIncome < 0) items.push(`${worstSeg.name} is unprofitable: ${worstSeg.netMarginPct.toFixed(1)}% net margin, losing ${fmt(Math.abs(worstSeg.netIncome))}.`);
                  else items.push(`All segments profitable. Lowest margin: ${worstSeg.name} at ${worstSeg.netMarginPct.toFixed(1)}%.`);
                  items.push(`Weighted retention: ${totals.weightedRet.toFixed(1)}%. ${totals.weightedRet >= 90 ? 'Strong customer loyalty.' : totals.weightedRet >= 75 ? 'Moderate retention — room for improvement.' : 'Low retention — churn risk is high.'}`);
                  const topSeg = segmentPnL.reduce((a, b) => a.ytdRevenue > b.ytdRevenue ? a : b);
                  const topPct = totals.revenue > 0 ? (topSeg.ytdRevenue / totals.revenue * 100) : 0;
                  items.push(`Revenue concentration: ${topSeg.name} accounts for ${topPct.toFixed(0)}% of total revenue${topPct > 50 ? ' — high dependency risk.' : '.'}`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LTV:CAC by Segment */}
        <Card>
          <CardHeader><CardTitle>LTV:CAC Ratio by Segment</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentPnL.map((seg, i) => ({ name: seg.name, ratio: seg.ltvCacRatio === Infinity ? 0 : seg.ltvCacRatio, color: CHART_COLORS[i % CHART_COLORS.length] }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}x`, 'LTV:CAC']} />
                  <ReferenceLine x={3} stroke="#0d9488" strokeDasharray="5 5" label={{ value: '3x target', position: 'top', fontSize: 10 }} />
                  <Bar dataKey="ratio" radius={[0, 4, 4, 0]}>
                    {segmentPnL.map((seg, i) => <Cell key={i} fill={seg.ltvCacRatio >= 3 ? CHART_COLORS[i % CHART_COLORS.length] : '#e57373'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Concentration (Pareto) */}
        <Card>
          <CardHeader><CardTitle>Revenue Concentration</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={concentrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tickFormatter={v => `$${v}K`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue ($K)" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" dataKey="cumPct" name="Cumulative %" type="monotone" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
                  <ReferenceLine yAxisId="right" y={80} stroke="#e57373" strokeDasharray="5 5" label={{ value: '80%', position: 'right', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cohort Retention Curves */}
        <Card>
          <CardHeader><CardTitle>Cohort Retention Curves</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cohortData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => [`${v}%`, '']} />
                  <Legend />
                  {segments.map((seg, i) => (
                    <Area key={seg.id} dataKey={seg.name} type="monotone" stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.1} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader><CardTitle>Monthly Revenue by Segment</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}K`, '']} />
                  <Legend />
                  {segments.map((seg, i) => <Bar key={seg.id} dataKey={seg.name} stackId="rev" fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  <Line dataKey="total" name="Total" type="monotone" stroke="#000" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Segment Scorecard */}
        <Card>
          <CardHeader><CardTitle>Segment Health Scorecard</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {segmentPnL.map((seg, i) => {
                const ltvOk = seg.ltvCacRatio >= 3;
                const paybackOk = seg.paybackMonths <= 12;
                const retOk = seg.annualRetentionRate >= 80;
                const profitOk = seg.netIncome > 0;
                const score = [ltvOk, paybackOk, retOk, profitOk].filter(Boolean).length;
                return (
                  <div key={seg.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-sm font-medium">{seg.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{score}/4</Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      {[
                        { label: 'LTV:CAC ≥ 3x', ok: ltvOk, value: seg.ltvCacRatio === Infinity ? '∞' : fmtR(seg.ltvCacRatio) },
                        { label: 'Payback ≤ 12mo', ok: paybackOk, value: seg.paybackMonths === Infinity ? '∞' : `${seg.paybackMonths.toFixed(0)}mo` },
                        { label: 'Retention ≥ 80%', ok: retOk, value: fmtP(seg.annualRetentionRate) },
                        { label: 'Net Profitable', ok: profitOk, value: fmt(seg.netIncome) },
                      ].map(({ label, ok, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {ok ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3 text-red-500" />}
                            <span className="text-muted-foreground">{label}</span>
                          </div>
                          <span className={`font-mono ${ok ? 'text-green-600' : 'text-red-600'}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">FY{settings.fiscalYear} Customer Profitability — {settings.companyName}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>{settings.companyName}</strong> serves <strong>{fmtN(totals.customers)}</strong> customers across {segments.length} segments, generating <strong>{fmt(totals.revenue)}</strong> in YTD revenue with a net margin of <strong>{fmtP(totals.niPct)}</strong>.
                </p>
                {(() => {
                  const best = segmentPnL.reduce((m, s) => s.ltvCacRatio > m.ltvCacRatio && s.ltvCacRatio !== Infinity ? s : m, segmentPnL[0]);
                  const worst = segmentPnL.reduce((m, s) => s.ltvCacRatio < m.ltvCacRatio ? s : m, segmentPnL[0]);
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      The strongest unit economics are in <strong>{best.name}</strong> (LTV:CAC {fmtR(best.ltvCacRatio)}, {fmtP(best.annualRetentionRate)} retention). The weakest is <strong>{worst.name}</strong> (LTV:CAC {worst.ltvCacRatio === Infinity ? '∞' : fmtR(worst.ltvCacRatio)}, {fmtP(worst.annualRetentionRate)} retention).
                    </p>
                  );
                })()}
                {(() => {
                  const topRev = concentrationData[0];
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Revenue is {concentrationData.length > 0 && concentrationData[0].cumPct > 50 ? 'heavily' : 'moderately'} concentrated — <strong>{topRev?.name}</strong> alone accounts for {fmtP(topRev?.cumPct)} of total revenue, indicating {concentrationData[0]?.cumPct > 60 ? 'significant concentration risk' : 'reasonable diversification'}.
                    </p>
                  );
                })()}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Weighted average retention is <strong>{fmtP(totals.weightedRet)}</strong>. Improving retention by even 5 percentage points in low-retention segments could materially increase LTV and reduce acquisition pressure.
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
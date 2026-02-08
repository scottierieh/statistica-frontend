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
  HelpCircle, Calculator, Building2, Lightbulb, ChevronRight,
  Upload, BarChart3, Plus, X, Settings2, CheckCircle2, Layers,
  Users, AlertTriangle, Repeat, ArrowUpRight, ArrowDownRight,
  UserPlus, Megaphone, Search, Share2, Phone, Zap, Activity,
  Clock, TrendingDown
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

interface AcqChannel {
  id: string;
  name: string;
  icon: string;               // icon key
  spend: number;              // $K per month
  customersAcquired: number;  // per month
}

interface CostItem {
  id: string;
  name: string;
  category: 'cogs' | 'delivery' | 'support' | 'overhead';
  perCustomerMonthly: number; // $ per customer per month
}

interface UnitSettings {
  companyName: string;
  fiscalYear: number;
  // Revenue
  avgRevenuePerUser: number;       // $ per month (ARPU)
  monthlyGrowthRate: number;       // % (net revenue expansion)
  // Retention
  monthlyChurnRate: number;        // %
  avgLifespanMonths: number;       // derived or manual
  // LTV settings
  discountRateAnnual: number;      // %
  grossMarginPct: number;          // % (revenue after COGS)
  // Onboarding
  onboardingCostPerCustomer: number; // $ one-time
  // Scale
  totalActiveCustomers: number;
  monthlyNewCustomers: number;
}

interface UnitPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS_36 = Array.from({ length: 36 }, (_, i) => `M${i + 1}`);
const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e'];

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  'Paid Ads': Megaphone, 'Organic / SEO': Search, 'Referral': Share2,
  'Outbound Sales': Phone, 'Partnerships': Building2, 'Content': BookOpen,
};

function buildDefaultChannels(): AcqChannel[] {
  return [
    { id: 'ch1', name: 'Paid Ads', icon: 'Paid Ads', spend: 45, customersAcquired: 120 },
    { id: 'ch2', name: 'Organic / SEO', icon: 'Organic / SEO', spend: 12, customersAcquired: 85 },
    { id: 'ch3', name: 'Referral', icon: 'Referral', spend: 5, customersAcquired: 40 },
    { id: 'ch4', name: 'Outbound Sales', icon: 'Outbound Sales', spend: 30, customersAcquired: 25 },
    { id: 'ch5', name: 'Partnerships', icon: 'Partnerships', spend: 8, customersAcquired: 15 },
  ];
}

function buildDefaultCosts(): CostItem[] {
  return [
    { id: 'c1', name: 'Hosting / Infrastructure', category: 'cogs', perCustomerMonthly: 3.20 },
    { id: 'c2', name: 'Payment Processing', category: 'cogs', perCustomerMonthly: 2.10 },
    { id: 'c3', name: 'Customer Support', category: 'support', perCustomerMonthly: 4.50 },
    { id: 'c4', name: 'Account Management', category: 'support', perCustomerMonthly: 1.80 },
    { id: 'c5', name: 'Onboarding Team', category: 'delivery', perCustomerMonthly: 0.90 },
    { id: 'c6', name: 'G&A Allocation', category: 'overhead', perCustomerMonthly: 2.50 },
  ];
}

const DEFAULT_SETTINGS: UnitSettings = {
  companyName: 'Acme SaaS',
  fiscalYear: new Date().getFullYear(),
  avgRevenuePerUser: 89,
  monthlyGrowthRate: 1.5,
  monthlyChurnRate: 3.2,
  avgLifespanMonths: 31,
  discountRateAnnual: 10,
  grossMarginPct: 72,
  onboardingCostPerCustomer: 45,
  totalActiveCustomers: 4200,
  monthlyNewCustomers: 285,
};

const CATEGORY_LABELS: Record<string, string> = {
  cogs: 'COGS', delivery: 'Delivery', support: 'Support', overhead: 'Overhead',
};
const CATEGORY_COLORS: Record<string, string> = {
  cogs: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  delivery: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  support: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  overhead: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  Math.abs(n) >= 1 ? `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}K` :
  `$${(n * 1000).toFixed(0)}`;
const fmtD = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDi = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n.toFixed(1)}%`;
const fmtR = (n: number) => isFinite(n) ? `${n.toFixed(1)}x` : '∞';
const fmtMo = (n: number) => isFinite(n) ? `${n.toFixed(1)} mo` : '∞';


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "ARPU": "Average Revenue Per User per month. Total MRR ÷ active customers.",
  "CAC": "Customer Acquisition Cost. Total acquisition spend ÷ new customers acquired.",
  "Blended CAC": "Weighted average CAC across all acquisition channels.",
  "LTV": "Lifetime Value. Total gross profit from a customer over their entire relationship.",
  "LTV (NPV)": "Net Present Value of LTV, discounting future profits to today's dollars.",
  "LTV:CAC": "Ratio of lifetime value to acquisition cost. Target ≥ 3x for healthy SaaS.",
  "Payback Period": "Months to recoup CAC from gross profit. Target ≤ 12 months.",
  "Monthly Churn": "% of customers lost per month. 3% monthly ≈ 31% annual.",
  "Customer Lifespan": "Average months a customer stays. ≈ 1 ÷ Monthly Churn Rate.",
  "Gross Margin": "Revenue − COGS as % of revenue. The 'true' margin per unit.",
  "Net Revenue Retention": "Revenue from existing customers after expansion and churn. >100% = growth.",
  "Contribution Margin": "Revenue − all variable costs per customer. What's left to cover CAC and fixed costs.",
  "Margin Stack": "Layered view of how revenue breaks down into costs and profit per unit.",
  "Cohort Payback": "Month-by-month cumulative profit per customer, showing when CAC is recovered.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Unit Economics Glossary</DialogTitle>
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

const UnitGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Unit Economics Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Set ARPU & Churn', desc: 'Monthly revenue per user and churn rate determine the baseline.' },
                { step: '2', title: 'Break Down CAC by Channel', desc: 'Each channel has different spend and efficiency. Blended CAC = total spend ÷ total acquired.' },
                { step: '3', title: 'Map the Cost Stack', desc: 'COGS, delivery, support, overhead — all variable costs per customer per month.' },
                { step: '4', title: 'Calculate LTV & Ratios', desc: 'LTV = Monthly GP × Lifespan (or NPV). Check LTV:CAC ≥ 3x, Payback ≤ 12mo.' },
                { step: '5', title: 'Sensitivity & Scenarios', desc: 'What if churn drops 1%? What if ARPU grows 10%? Stress-test assumptions.' },
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
                { label: 'ARPU', formula: 'MRR ÷ Active Customers', example: '$373,800 ÷ 4,200 = $89/mo' },
                { label: 'Blended CAC', formula: 'Σ Channel Spend ÷ Σ Customers Acquired', example: '$100K ÷ 285 = $351' },
                { label: 'Monthly Gross Profit', formula: 'ARPU × Gross Margin %', example: '$89 × 72% = $64.08' },
                { label: 'Lifespan', formula: '1 ÷ Monthly Churn Rate', example: '1 ÷ 3.2% = 31.3 months' },
                { label: 'LTV (Simple)', formula: 'Monthly GP × Lifespan', example: '$64.08 × 31.3 = $2,006' },
                { label: 'LTV (NPV)', formula: 'Σ Monthly GP ÷ (1 + r/12)^t', example: 'Discounted over 31 months' },
                { label: 'LTV:CAC', formula: 'LTV ÷ Blended CAC', example: '$2,006 ÷ $351 = 5.7x' },
                { label: 'Payback', formula: 'CAC ÷ Monthly GP', example: '$351 ÷ $64.08 = 5.5 months' },
              ].map(({ label, formula, example }) => (
                <div key={label} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between"><span className="font-medium text-sm">{label}</span><span className="font-mono text-xs text-primary">{formula}</span></div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{example}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Benchmarks:</strong> LTV:CAC ≥ 3x (healthy), Payback ≤ 12 months (sustainable), Gross Margin ≥ 70% (SaaS standard), Monthly churn ≤ 5% (acceptable for SMB SaaS).</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE & SAMPLE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_UNIT_CSV = `Channel,MonthlySpend($K),CustomersAcquired
Paid Ads,45,120
Organic / SEO,12,85
Referral,5,40
Outbound Sales,30,25
Partnerships,8,15`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_UNIT_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_unit_economics.csv';
    link.click();
    toast({ title: "Downloaded!" });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Data Format</DialogTitle>
          <DialogDescription>Optional: upload acquisition channel data</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Upload is <strong>optional</strong> — you can input everything manually. CSV only imports acquisition channels; all other settings are configured in the tool.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Channel</th>
                    <th className="p-2 text-right">MonthlySpend($K)</th>
                    <th className="p-2 text-right">CustomersAcquired</th>
                  </tr></thead>
                  <tbody>
                    {[['Paid Ads', '45', '120'], ['Organic / SEO', '12', '85'], ['Referral', '5', '40']].map(([ch, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{ch}</td>
                        {vals.map((v, j) => <td key={j} className="p-2 text-right">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Zap className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Unit Economics</CardTitle>
          <CardDescription className="text-base mt-2">Assess the financial performance of a single unit of your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: DollarSign, title: 'LTV / CAC', desc: 'Lifetime value, acquisition cost, and the critical LTV:CAC ratio' },
              { icon: Layers, title: 'Margin Stack', desc: 'See how revenue flows through COGS, delivery, support, to profit' },
              { icon: Activity, title: 'Payback & Sensitivity', desc: 'Month-by-month payback curve and what-if scenario analysis' },
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
                  <div><CardTitle className="text-base">Upload Channel Data</CardTitle><CardDescription className="text-xs">Import acquisition channels from CSV</CardDescription></div>
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
                    <p className="text-sm text-muted-foreground">Optionally upload acquisition channel data. All other inputs are configured in the tool.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Channel | MonthlySpend($K) | CustomersAcquired</p>
                      <p className="text-muted-foreground">e.g. Paid Ads, 45, 120</p>
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
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">SaaS model with 5 channels</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Pre-loaded SaaS unit economics: $89 ARPU, 5 acquisition channels, 6 cost line items, 3.2% monthly churn.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />CAC breakdown by 5 channels</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Full margin stack with 6 cost items</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />LTV/CAC, payback, sensitivity</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">This tool analyzes a single business model's unit economics. For multi-product or multi-segment comparisons, use Product Profitability or Customer Profitability.</p>
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

export default function UnitEconomicsPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: UnitPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [settings, setSettings] = useState<UnitSettings>(DEFAULT_SETTINGS);
  const [channels, setChannels] = useState<AcqChannel[]>(buildDefaultChannels);
  const [costs, setCosts] = useState<CostItem[]>(buildDefaultCosts);

  // Parse upload
  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try {
      const raw = Papa.unparse(data);
      const parsed = Papa.parse(raw.trim(), { header: true, skipEmptyLines: true });
      if (!parsed.data || parsed.data.length < 2) return null;
      const rows = parsed.data as Record<string, string>[];
      const chs: AcqChannel[] = [];
      for (const row of rows) {
        const name = (row['Channel'] || row['Name'] || '').trim();
        if (!name) continue;
        const spend = parseFloat(row['MonthlySpend($K)'] || row['Spend']) || 0;
        const acq = parseInt(row['CustomersAcquired'] || row['Acquired']) || 0;
        chs.push({ id: `ch${chs.length}`, name, icon: name, spend, customersAcquired: acq });
      }
      return chs.length >= 2 ? chs : null;
    } catch { return null; }
  }, [data]);

  const [parseError] = useState<string | null>(null);
  const applyUpload = useCallback(() => { if (parsedUpload) setChannels(parsedUpload); setShowIntro(false); }, [parsedUpload]);

  // ── Core calculations ──
  const arpu = settings.avgRevenuePerUser;
  const monthlyChurn = settings.monthlyChurnRate / 100;
  const lifespan = monthlyChurn > 0 ? 1 / monthlyChurn : 120;
  const monthlyDiscount = settings.discountRateAnnual / 100 / 12;

  // CAC
  const totalChannelSpend = useMemo(() => channels.reduce((s, ch) => s + ch.spend, 0), [channels]);
  const totalAcquired = useMemo(() => channels.reduce((s, ch) => s + ch.customersAcquired, 0), [channels]);
  const blendedCAC = useMemo(() => totalAcquired > 0 ? (totalChannelSpend * 1000) / totalAcquired : 0, [totalChannelSpend, totalAcquired]);
  const fullCAC = blendedCAC + settings.onboardingCostPerCustomer;

  // Costs per customer per month
  const totalMonthlyCost = useMemo(() => costs.reduce((s, c) => s + c.perCustomerMonthly, 0), [costs]);
  const monthlyGP = arpu * (settings.grossMarginPct / 100);
  const monthlyContribution = arpu - totalMonthlyCost;

  // LTV
  const ltvSimple = monthlyGP * lifespan;
  const ltvNPV = useMemo(() => {
    let ltv = 0;
    let retained = 1;
    const months = Math.min(Math.ceil(lifespan * 2), 120);
    for (let m = 1; m <= months; m++) {
      retained *= (1 - monthlyChurn);
      ltv += (monthlyGP * retained) / Math.pow(1 + monthlyDiscount, m);
    }
    return ltv;
  }, [monthlyGP, lifespan, monthlyChurn, monthlyDiscount]);

  const ltvCacRatio = fullCAC > 0 ? ltvNPV / fullCAC : Infinity;
  const paybackMonths = monthlyGP > 0 ? fullCAC / monthlyGP : Infinity;

  // Margin stack data
  const marginStack = useMemo(() => {
    const categories = ['cogs', 'delivery', 'support', 'overhead'] as const;
    const items = categories.map(cat => ({
      category: CATEGORY_LABELS[cat],
      amount: costs.filter(c => c.category === cat).reduce((s, c) => s + c.perCustomerMonthly, 0),
    }));
    const totalCost = items.reduce((s, i) => s + i.amount, 0);
    return [
      { category: 'ARPU', amount: arpu },
      ...items.map(i => ({ ...i, amount: -i.amount })),
      { category: 'Net Margin', amount: arpu - totalCost },
    ];
  }, [arpu, costs]);

  // Payback curve (36 months)
  const paybackCurve = useMemo(() => {
    let cumProfit = -fullCAC;
    let retained = 1;
    return MONTHS_36.map((m, i) => {
      retained *= (1 - monthlyChurn);
      cumProfit += monthlyGP * retained;
      return { month: m, cumProfit: Math.round(cumProfit * 100) / 100, breakeven: 0 };
    });
  }, [fullCAC, monthlyGP, monthlyChurn]);

  // Sensitivity matrix: LTV:CAC for various churn × ARPU combos
  const sensitivityData = useMemo(() => {
    const churnVals = [-2, -1, 0, 1, 2].map(d => settings.monthlyChurnRate + d * 0.5).filter(v => v > 0);
    const arpuVals = [-2, -1, 0, 1, 2].map(d => arpu + d * 10).filter(v => v > 0);
    return churnVals.map(ch => {
      const row: Record<string, any> = { churn: `${ch.toFixed(1)}%` };
      arpuVals.forEach(a => {
        const gp = a * (settings.grossMarginPct / 100);
        const life = 1 / (ch / 100);
        let ltv = 0; let ret = 1;
        for (let m = 1; m <= Math.min(Math.ceil(life * 2), 120); m++) {
          ret *= (1 - ch / 100);
          ltv += (gp * ret) / Math.pow(1 + monthlyDiscount, m);
        }
        row[`$${a}`] = fullCAC > 0 ? ltv / fullCAC : 0;
      });
      return row;
    });
  }, [settings, arpu, fullCAC, monthlyDiscount]);
  const arpuCols = useMemo(() => [-2, -1, 0, 1, 2].map(d => arpu + d * 10).filter(v => v > 0).map(a => `$${a}`), [arpu]);

  // Channel CAC data
  const channelData = useMemo(() => channels.map((ch, i) => ({
    name: ch.name,
    cac: ch.customersAcquired > 0 ? (ch.spend * 1000) / ch.customersAcquired : 0,
    customers: ch.customersAcquired,
    spend: ch.spend,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })), [channels]);

  // ── CRUD ──
  const updateChannel = useCallback((id: string, updates: Partial<AcqChannel>) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch));
  }, []);
  const addChannel = useCallback(() => {
    setChannels(prev => [...prev, { id: `ch${Date.now()}`, name: 'New Channel', icon: 'Paid Ads', spend: 5, customersAcquired: 20 }]);
  }, []);
  const removeChannel = useCallback((id: string) => { setChannels(prev => prev.filter(ch => ch.id !== id)); }, []);

  const updateCost = useCallback((id: string, updates: Partial<CostItem>) => {
    setCosts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);
  const addCost = useCallback((category: CostItem['category']) => {
    setCosts(prev => [...prev, { id: `c${Date.now()}`, name: 'New Cost', category, perCustomerMonthly: 1 }]);
  }, []);
  const removeCost = useCallback((id: string) => { setCosts(prev => prev.filter(c => c.id !== id)); }, []);

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `UnitEconomics_${settings.fiscalYear}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch {} finally { setIsDownloading(false); }
  }, [settings.fiscalYear]);

  const handleDownloadCSV = useCallback(() => {
    let csv = `UNIT ECONOMICS — ${settings.companyName} FY${settings.fiscalYear}\n\n`;
    csv += `ARPU,$${arpu}/mo\nBlended CAC,${fmtDi(blendedCAC)}\nFull CAC (incl onboarding),${fmtDi(fullCAC)}\n`;
    csv += `Monthly GP,${fmtD(monthlyGP)}\nLTV (NPV),${fmtDi(Math.round(ltvNPV))}\nLTV:CAC,${fmtR(ltvCacRatio)}\nPayback,${fmtMo(paybackMonths)}\n\n`;
    csv += `CHANNELS\n${Papa.unparse(channels.map(ch => ({ Channel: ch.name, 'Spend ($K/mo)': ch.spend, Acquired: ch.customersAcquired, CAC: ch.customersAcquired > 0 ? `$${((ch.spend * 1000) / ch.customersAcquired).toFixed(0)}` : '—' })))}\n\n`;
    csv += `COSTS\n${Papa.unparse(costs.map(c => ({ Item: c.name, Category: CATEGORY_LABELS[c.category], '$/cust/mo': c.perCustomerMonthly.toFixed(2) })))}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `UnitEconomics_${settings.fiscalYear}.csv`;
    link.click();
  }, [settings, arpu, blendedCAC, fullCAC, monthlyGP, ltvNPV, ltvCacRatio, paybackMonths, channels, costs]);

  if (showIntro) return <IntroPage hasUploadedData={!!parsedUpload} parseError={parseError} onStartWithData={applyUpload} onStartManual={() => setShowIntro(false)} />;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Unit Economics</h1><p className="text-muted-foreground mt-1">{settings.companyName} — FY{settings.fiscalYear}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <UnitGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Core Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Revenue & Retention</CardTitle><CardDescription>Core unit economics inputs</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'ARPU ($/mo)', key: 'avgRevenuePerUser', value: settings.avgRevenuePerUser, step: 1, min: 1, max: 5000, prefix: '$' },
              { label: 'Gross Margin (%)', key: 'grossMarginPct', value: settings.grossMarginPct, step: 1, min: 10, max: 99, prefix: '' },
              { label: 'Monthly Churn (%)', key: 'monthlyChurnRate', value: settings.monthlyChurnRate, step: 0.1, min: 0.1, max: 20, prefix: '' },
              { label: 'Onboarding ($/cust)', key: 'onboardingCostPerCustomer', value: settings.onboardingCostPerCustomer, step: 5, min: 0, max: 5000, prefix: '$' },
            ].map(({ label, key, value, step, min, max, prefix }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <div className="flex items-center gap-2">
                  <Slider value={[value]} onValueChange={([v]) => setSettings(p => ({ ...p, [key]: v }))} min={min} max={max} step={step} className="flex-1" />
                  <div className="flex items-center gap-0.5">
                    {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
                    <Input type="number" value={value} onChange={e => setSettings(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))} className="h-7 w-16 text-right text-xs font-mono" step={step} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={settings.companyName} onChange={e => setSettings(p => ({ ...p, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Discount Rate (%/yr)</Label><Input type="number" value={settings.discountRateAnnual} onChange={e => setSettings(p => ({ ...p, discountRateAnnual: parseFloat(e.target.value) || 10 }))} className="h-8 text-sm font-mono" step={0.5} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Active Customers</Label><Input type="number" value={settings.totalActiveCustomers} onChange={e => setSettings(p => ({ ...p, totalActiveCustomers: parseInt(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">New Customers/mo</Label><Input type="number" value={settings.monthlyNewCustomers} onChange={e => setSettings(p => ({ ...p, monthlyNewCustomers: parseInt(e.target.value) || 0 }))} className="h-8 text-sm font-mono" /></div>
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Unit Economics Dashboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'ARPU', value: `${fmtDi(arpu)}/mo` },
                { label: 'Blended CAC', value: fmtDi(Math.round(blendedCAC)) },
                { label: 'Full CAC', value: fmtDi(Math.round(fullCAC)), sub: `incl. $${settings.onboardingCostPerCustomer} onboarding` },
                { label: 'Monthly GP', value: fmtD(monthlyGP), sub: `${fmtP(settings.grossMarginPct)} margin` },
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
                { label: 'LTV (NPV)', value: fmtDi(Math.round(ltvNPV)) },
                { label: 'LTV:CAC', value: fmtR(ltvCacRatio), ok: ltvCacRatio >= 3 },
                { label: 'Payback', value: fmtMo(paybackMonths), ok: paybackMonths <= 12 },
                { label: 'Avg Lifespan', value: `${lifespan.toFixed(1)} mo`, sub: `${(100 - settings.monthlyChurnRate).toFixed(1)}% retention` },
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

      {/* ══ CAC Channels ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Acquisition Channels</CardTitle><CardDescription>Monthly spend and customers acquired per channel</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={addChannel}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Channel</TableHead>
                <TableHead className="text-right">Spend ($K/mo)</TableHead>
                <TableHead className="text-right">Acquired/mo</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((ch, i) => {
                const cac = ch.customersAcquired > 0 ? (ch.spend * 1000) / ch.customersAcquired : 0;
                const Icon = CHANNEL_ICONS[ch.icon] || Megaphone;
                return (
                  <TableRow key={ch.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <Input value={ch.name} onChange={e => updateChannel(ch.id, { name: e.target.value })} className="h-6 text-xs font-medium border-0 bg-transparent p-0 w-28" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right"><Input type="number" value={ch.spend} onChange={e => updateChannel(ch.id, { spend: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" step={1} /></TableCell>
                    <TableCell className="text-right"><Input type="number" value={ch.customersAcquired} onChange={e => updateChannel(ch.id, { customersAcquired: parseInt(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" /></TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{fmtDi(Math.round(cac))}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{totalAcquired > 0 ? fmtP((ch.customersAcquired / totalAcquired) * 100) : '—'}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeChannel(ch.id)}><X className="w-3 h-3" /></Button></TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2 bg-primary/5">
                <TableCell className="font-semibold text-primary">Blended</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">${totalChannelSpend}K</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">{totalAcquired}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmtDi(Math.round(blendedCAC))}</TableCell>
                <TableCell className="text-right font-mono text-xs">100%</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ══ Cost Stack ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Layers className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Cost-to-Serve Stack</CardTitle><CardDescription>Variable costs per customer per month</CardDescription></div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add Cost</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                {(['cogs', 'delivery', 'support', 'overhead'] as const).map(cat => (
                  <DropdownMenuItem key={cat} onClick={() => addCost(cat)}>{CATEGORY_LABELS[cat]}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Cost Item</TableHead>
                <TableHead className="text-center">Category</TableHead>
                <TableHead className="text-right">$/cust/mo</TableHead>
                <TableHead className="text-right">% of ARPU</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map(c => (
                <TableRow key={c.id}>
                  <TableCell><Input value={c.name} onChange={e => updateCost(c.id, { name: e.target.value })} className="h-6 text-xs font-medium border-0 bg-transparent p-0" /></TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 px-2"><Badge className={`text-[9px] ${CATEGORY_COLORS[c.category]}`}>{CATEGORY_LABELS[c.category]}</Badge></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(['cogs', 'delivery', 'support', 'overhead'] as const).map(cat => (
                          <DropdownMenuItem key={cat} onClick={() => updateCost(c.id, { category: cat })}><Badge className={`text-[9px] mr-2 ${CATEGORY_COLORS[cat]}`}>{CATEGORY_LABELS[cat]}</Badge></DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right"><Input type="number" value={c.perCustomerMonthly} onChange={e => updateCost(c.id, { perCustomerMonthly: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" step={0.1} /></TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">{arpu > 0 ? fmtP((c.perCustomerMonthly / arpu) * 100) : '—'}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeCost(c.id)}><X className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 bg-primary/5">
                <TableCell className="font-semibold text-primary">Total Cost / Customer / Month</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmtD(totalMonthlyCost)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">{fmtP((totalMonthlyCost / arpu) * 100)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow className="bg-muted/20">
                <TableCell className="font-semibold">Net Margin / Customer / Month</TableCell>
                <TableCell></TableCell>
                <TableCell className={`text-right font-mono text-xs font-bold ${monthlyContribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtD(monthlyContribution)}</TableCell>
                <TableCell className={`text-right font-mono text-xs font-semibold ${monthlyContribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtP((monthlyContribution / arpu) * 100)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ══ Calculation Breakdown ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />LTV Calculation</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="divide-y">
              {[
                { step: 1, label: 'ARPU', formula: '', value: `${fmtDi(arpu)}/mo` },
                { step: 2, label: 'Gross Margin', formula: `${fmtDi(arpu)} × ${settings.grossMarginPct}%`, value: `${fmtD(monthlyGP)}/mo` },
                { step: 3, label: 'Avg Lifespan', formula: `1 ÷ ${settings.monthlyChurnRate}%`, value: `${lifespan.toFixed(1)} months` },
                { step: 4, label: 'LTV (Simple)', formula: `${fmtD(monthlyGP)} × ${lifespan.toFixed(1)}`, value: fmtDi(Math.round(ltvSimple)) },
                { step: 5, label: 'LTV (NPV)', formula: `Σ GP × retained ÷ (1+${(monthlyDiscount * 100).toFixed(2)}%)^t`, value: fmtDi(Math.round(ltvNPV)) },
                { step: 6, label: 'Full CAC', formula: `${fmtDi(Math.round(blendedCAC))} + $${settings.onboardingCostPerCustomer}`, value: fmtDi(Math.round(fullCAC)) },
                { step: 7, label: 'LTV:CAC', formula: `${fmtDi(Math.round(ltvNPV))} ÷ ${fmtDi(Math.round(fullCAC))}`, value: fmtR(ltvCacRatio), final: true },
              ].map(({ step, label, formula, value, final }) => (
                <div key={step} className={`flex items-center gap-4 px-3 py-2 ${final ? 'bg-primary/5' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{step}</div>
                  <div className="flex-1">
                    <p className={`text-sm ${final ? 'font-semibold' : ''}`}>{label}</p>
                    {formula && <p className="text-xs font-mono text-muted-foreground">{formula}</p>}
                  </div>
                  <span className={`font-mono text-sm ${final ? 'text-primary font-bold' : ''}`}>{value}</span>
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
          <h2 className="text-2xl font-bold">{settings.companyName} — Unit Economics Report</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | ARPU ${arpu}/mo | {channels.length} channels | {settings.monthlyChurnRate}% churn</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'LTV:CAC', value: ltvCacRatio === Infinity ? '∞' : `${ltvCacRatio.toFixed(1)}x`, sub: ltvCacRatio >= 3 ? 'Healthy (≥3x)' : ltvCacRatio >= 1 ? 'Below target' : 'Negative', color: ltvCacRatio >= 3 ? 'text-green-600' : ltvCacRatio >= 1 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Customer LTV', value: `$${Math.round(ltvNPV).toLocaleString()}`, sub: `NPV at ${settings.discountRateAnnual}%`
            , color: 'text-primary' },
            { label: 'Blended CAC', value: `$${Math.round(fullCAC).toLocaleString()}`, sub: `${totalAcquired} customers/mo`, color: 'text-primary' },
            { label: 'Payback', value: paybackMonths === Infinity ? '—' : `${paybackMonths.toFixed(1)}mo`, sub: paybackMonths <= 12 ? 'Sustainable' : paybackMonths <= 18 ? 'Acceptable' : 'Long — cash risk', color: paybackMonths <= 12 ? 'text-green-600' : paybackMonths <= 18 ? 'text-amber-600' : 'text-red-600' },
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

        {/* Channel Economics Table */}
        <Card>
          <CardHeader><CardTitle>Channel Economics</CardTitle><CardDescription>Spend, acquisition, CAC, and LTV:CAC by channel</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Channel</th>
              <th className="p-2 text-right font-semibold">Spend/mo</th>
              <th className="p-2 text-right font-semibold">Customers</th>
              <th className="p-2 text-right font-semibold">CAC</th>
              <th className="p-2 text-right font-semibold">Channel LTV:CAC</th>
              <th className="p-2 text-right font-semibold">% of Spend</th>
              <th className="p-2 text-right font-semibold">% of Acq</th>
              <th className="p-2 text-right font-semibold">Efficiency</th>
            </tr></thead>
            <tbody>{channels.map((ch, i) => {
              const chCAC = ch.customersAcquired > 0 ? (ch.spend * 1000) / ch.customersAcquired : 0;
              const chLtvCac = chCAC > 0 ? ltvNPV / (chCAC + settings.onboardingCostPerCustomer) : Infinity;
              const spendPct = totalChannelSpend > 0 ? (ch.spend / totalChannelSpend * 100) : 0;
              const acqPct = totalAcquired > 0 ? (ch.customersAcquired / totalAcquired * 100) : 0;
              const efficiency = spendPct > 0 ? (acqPct / spendPct) : 0;
              return (
                <tr key={ch.id} className="border-b">
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{ch.name}</div></td>
                  <td className="p-2 text-right font-mono">${ch.spend}K</td>
                  <td className="p-2 text-right font-mono">{ch.customersAcquired}</td>
                  <td className="p-2 text-right font-mono">${Math.round(chCAC).toLocaleString()}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${chLtvCac >= 3 ? 'text-green-600' : chLtvCac >= 1 ? 'text-amber-600' : 'text-red-600'}`}>{chLtvCac === Infinity ? '∞' : chLtvCac.toFixed(1)}x</td>
                  <td className="p-2 text-right font-mono">{spendPct.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{acqPct.toFixed(1)}%</td>
                  <td className="p-2 text-right"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${efficiency >= 1.2 ? 'bg-green-100 text-green-700' : efficiency >= 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{efficiency.toFixed(2)}x</span></td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Blended</td>
              <td className="p-2 text-right font-mono">${totalChannelSpend}K</td>
              <td className="p-2 text-right font-mono">{totalAcquired}</td>
              <td className="p-2 text-right font-mono">${Math.round(fullCAC).toLocaleString()}</td>
              <td className={`p-2 text-right font-mono font-bold ${ltvCacRatio >= 3 ? 'text-green-600' : ltvCacRatio >= 1 ? 'text-amber-600' : 'text-red-600'}`}>{ltvCacRatio === Infinity ? '∞' : ltvCacRatio.toFixed(1)}x</td>
              <td className="p-2 text-right font-mono">100%</td>
              <td className="p-2 text-right font-mono">100%</td>
              <td className="p-2" />
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Unit economics highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`LTV:CAC ratio: ${ltvCacRatio === Infinity ? '∞' : ltvCacRatio.toFixed(1)}x${ltvCacRatio >= 3 ? ' — healthy (≥3x benchmark).' : ltvCacRatio >= 1 ? ' — below 3x target, monitor closely.' : ' — unit economics are negative.'}`);
                  items.push(`Customer LTV: $${Math.round(ltvNPV).toLocaleString()} (NPV at ${settings.discountRateAnnual}% discount). Blended CAC: $${Math.round(fullCAC).toLocaleString()} (acquisition + $${settings.onboardingCostPerCustomer} onboarding).`);
                  items.push(`Payback period: ${paybackMonths === Infinity ? '—' : paybackMonths.toFixed(1) + ' months'}${paybackMonths <= 12 ? ' — sustainable.' : paybackMonths <= 18 ? ' — acceptable but room to improve.' : ' — long payback, cash flow risk.'}`);
                  items.push(`ARPU $${arpu}/mo × ${settings.grossMarginPct}% gross margin = $${monthlyGP.toFixed(0)}/mo gross profit per customer. Avg lifespan: ${lifespan.toFixed(0)} months (${(settings.monthlyChurnRate).toFixed(1)}% monthly churn).`);
                  const bestCh = channels.reduce((a, b) => (a.customersAcquired / (a.spend || 1)) > (b.customersAcquired / (b.spend || 1)) ? a : b);
                  const bestEfficiency = bestCh.spend > 0 ? ((bestCh.spend * 1000) / bestCh.customersAcquired) : 0;
                  items.push(`Most efficient channel: ${bestCh.name} at $${Math.round(bestEfficiency)} CAC (${bestCh.customersAcquired} customers from $${bestCh.spend}K spend).`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CAC by Channel */}
        <Card>
          <CardHeader><CardTitle>CAC by Acquisition Channel</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="cac" name="CAC ($)" fill="#1e3a5f" radius={[4, 4, 0, 0]}>
                    {channelData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                  <Line yAxisId="right" dataKey="customers" name="Acquired/mo" type="monotone" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
                  <ReferenceLine yAxisId="left" y={blendedCAC} stroke="#e57373" strokeDasharray="5 5" label={{ value: `Blended $${Math.round(blendedCAC)}`, position: 'right', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Margin Stack Waterfall */}
        <Card>
          <CardHeader><CardTitle>Monthly Margin Stack (per customer)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginStack}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, '']} />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {marginStack.map((d, i) => (
                      <Cell key={i} fill={i === 0 ? '#6366f1' : i === marginStack.length - 1 ? (d.amount >= 0 ? '#22c55e' : '#ef4444') : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cohort Payback Curve */}
        <Card>
          <CardHeader><CardTitle>Cohort Payback Curve</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={paybackCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" interval={5} tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}`, 'Cumulative P&L']} />
                  <ReferenceLine y={0} stroke="#e57373" strokeWidth={2} label={{ value: 'Breakeven', position: 'right', fontSize: 10 }} />
                  <defs>
                    <linearGradient id="paybackGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="cumProfit" name="Cum. Profit" type="monotone" stroke="#1e3a5f" fill="url(#paybackGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Payback in ~<strong>{paybackMonths.toFixed(1)} months</strong>. LTV at month {Math.round(lifespan)}: <strong>{fmtDi(Math.round(ltvNPV))}</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Sensitivity Matrix */}
        <Card>
          <CardHeader><CardTitle>LTV:CAC Sensitivity — Churn vs ARPU</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Churn ↓ / ARPU →</TableHead>
                    {arpuCols.map(col => <TableHead key={col} className="text-center text-xs font-mono">{col}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sensitivityData.map((row, ri) => {
                    const isCurrentChurn = row.churn === `${settings.monthlyChurnRate.toFixed(1)}%`;
                    return (
                      <TableRow key={ri} className={isCurrentChurn ? 'bg-primary/5' : ''}>
                        <TableCell className="font-mono text-xs font-semibold">{row.churn}</TableCell>
                        {arpuCols.map(col => {
                          const val = row[col] as number;
                          const isCurrentCell = isCurrentChurn && col === `$${arpu}`;
                          return (
                            <TableCell key={col} className={`text-center font-mono text-xs ${isCurrentCell ? 'font-bold ring-2 ring-primary rounded' : ''} ${val >= 3 ? 'text-green-600 bg-green-50/50 dark:bg-green-950/20' : val >= 1 ? 'text-amber-600 bg-amber-50/50 dark:bg-amber-950/20' : 'text-red-600 bg-red-50/50 dark:bg-red-950/20'}`}>
                              {val.toFixed(1)}x
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-100" />≥ 3x (Healthy)</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-100" />1-3x (Caution)</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-100" />&lt; 1x (Loss)</span>
            </div>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">{settings.companyName} — Unit Economics Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  At <strong>${arpu}/mo ARPU</strong> with {fmtP(settings.grossMarginPct)} gross margin, each customer generates <strong>{fmtD(monthlyGP)}/mo</strong> in gross profit. With {settings.monthlyChurnRate}% monthly churn (avg lifespan {lifespan.toFixed(1)} months), the <strong>NPV-based LTV is {fmtDi(Math.round(ltvNPV))}</strong>.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Blended CAC across {channels.length} channels is <strong>{fmtDi(Math.round(blendedCAC))}</strong> ({fmtDi(Math.round(fullCAC))} including onboarding), yielding an <strong>LTV:CAC of {fmtR(ltvCacRatio)}</strong> — {ltvCacRatio >= 3 ? 'above the 3x benchmark' : ltvCacRatio >= 1 ? 'below the 3x target but still positive' : 'negative — the business loses money per customer'}.
                </p>
                {(() => {
                  const cheapest = channelData.reduce((m, ch) => ch.cac < m.cac && ch.cac > 0 ? ch : m, channelData[0]);
                  const mostExpensive = channelData.reduce((m, ch) => ch.cac > m.cac ? ch : m, channelData[0]);
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Most efficient channel: <strong>{cheapest.name}</strong> at {fmtDi(Math.round(cheapest.cac))} CAC. Most expensive: <strong>{mostExpensive.name}</strong> at {fmtDi(Math.round(mostExpensive.cac))} CAC. Consider shifting budget toward lower-CAC channels while monitoring volume capacity.
                    </p>
                  );
                })()}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  CAC payback occurs at approximately <strong>{fmtMo(paybackMonths)}</strong>. {paybackMonths <= 12 ? 'This is within the 12-month benchmark for sustainable growth.' : 'This exceeds the 12-month benchmark — consider reducing CAC or increasing ARPU.'}
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
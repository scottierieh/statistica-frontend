'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Target, BookOpen, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, Calculator, Lightbulb, ChevronRight, Upload,
  Plus, X, Settings2, CheckCircle2, Layers,
  AlertTriangle, Activity, Shield, Droplets, Clock,
  ArrowUpRight, ArrowDownRight, BarChart3, Eye, Gauge,
  CalendarDays, Wallet, CreditCard, TrendingDown, Ban
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

interface CashInflow {
  id: string;
  name: string;
  category: 'collections' | 'investment' | 'financing' | 'other';
  monthly: number[];  // 12 months $K
}

interface CashOutflow {
  id: string;
  name: string;
  category: 'payroll' | 'rent' | 'suppliers' | 'debt_service' | 'capex' | 'tax' | 'other';
  monthly: number[];  // 12 months $K
}

interface LiquidAsset {
  id: string;
  name: string;
  amount: number;          // $K
  daysToLiquidate: number; // 0=cash, 1-3=near-cash, 7-30=short-term
}

interface Obligation {
  id: string;
  name: string;
  amount: number;          // $K
  dueInDays: number;       // 0-365
  category: 'payable' | 'debt' | 'payroll' | 'tax' | 'lease' | 'other';
}

interface Covenant {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  currentValue: number;
  direction: 'min' | 'max'; // min = must be ≥ threshold; max = must be ≤ threshold
}

interface LiquiditySettings {
  companyName: string;
  fiscalYear: number;
  openingCash: number;        // $K
  // Balance sheet items for ratios
  currentAssets: number;       // $K
  currentLiabilities: number;  // $K
  inventory: number;           // $K
  prepaidExpenses: number;     // $K
  // Working capital cycle (days)
  daysReceivable: number;
  daysPayable: number;
  daysInventory: number;
  // Credit facility
  creditLineTotal: number;     // $K
  creditLineDrawn: number;     // $K
  // Stress
  stressCollectionDelay: number; // days additional delay
  stressRevenueDropPct: number;  // %
}

interface LiquidityPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = ['#1e3a5f', '#0d9488', '#2d5a8e', '#3b7cc0', '#e57373', '#5ba3cf', '#7c9fc0', '#4db6ac'];

const INFLOW_CATS: Record<string, string> = { collections: 'Collections', investment: 'Investment', financing: 'Financing', other: 'Other' };
const OUTFLOW_CATS: Record<string, string> = { payroll: 'Payroll', rent: 'Rent/Lease', suppliers: 'Suppliers', debt_service: 'Debt Service', capex: 'CapEx', tax: 'Tax', other: 'Other' };
const INFLOW_COLORS: Record<string, string> = { collections: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', investment: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', financing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };
const OUTFLOW_COLORS: Record<string, string> = { payroll: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', rent: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', suppliers: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', debt_service: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', capex: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', tax: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };

const s = [0.88, 0.90, 0.95, 1.00, 1.05, 1.08, 1.10, 1.08, 1.04, 1.00, 0.95, 0.97];
const mkM = (base: number) => s.map(sv => Math.round(base * sv));

function buildDefaultInflows(): CashInflow[] {
  return [
    { id: 'in1', name: 'Customer Collections', category: 'collections', monthly: mkM(1350) },
    { id: 'in2', name: 'Subscription Revenue', category: 'collections', monthly: mkM(420) },
    { id: 'in3', name: 'Interest Income', category: 'investment', monthly: Array(12).fill(8) },
  ];
}

function buildDefaultOutflows(): CashOutflow[] {
  return [
    { id: 'out1', name: 'Payroll & Benefits', category: 'payroll', monthly: Array(12).fill(680) },
    { id: 'out2', name: 'Office Lease', category: 'rent', monthly: Array(12).fill(85) },
    { id: 'out3', name: 'Vendor Payments', category: 'suppliers', monthly: mkM(310) },
    { id: 'out4', name: 'Debt Principal + Interest', category: 'debt_service', monthly: Array(12).fill(95) },
    { id: 'out5', name: 'Server & Infrastructure', category: 'suppliers', monthly: mkM(120) },
    { id: 'out6', name: 'Marketing Spend', category: 'other', monthly: mkM(145) },
    { id: 'out7', name: 'Income Tax (Quarterly)', category: 'tax', monthly: [0, 0, 180, 0, 0, 180, 0, 0, 180, 0, 0, 180] },
    { id: 'out8', name: 'CapEx', category: 'capex', monthly: [50, 20, 20, 20, 50, 20, 20, 20, 50, 20, 20, 20] },
  ];
}

function buildDefaultLiquidAssets(): LiquidAsset[] {
  return [
    { id: 'la1', name: 'Operating Cash', amount: 2800, daysToLiquidate: 0 },
    { id: 'la2', name: 'Money Market Fund', amount: 1500, daysToLiquidate: 1 },
    { id: 'la3', name: 'Treasury Bills (< 90 day)', amount: 2000, daysToLiquidate: 3 },
    { id: 'la4', name: 'Accounts Receivable (Current)', amount: 3200, daysToLiquidate: 30 },
  ];
}

function buildDefaultObligations(): Obligation[] {
  return [
    { id: 'ob1', name: 'Accounts Payable', amount: 1850, dueInDays: 30, category: 'payable' },
    { id: 'ob2', name: 'Payroll (Next Cycle)', amount: 340, dueInDays: 14, category: 'payroll' },
    { id: 'ob3', name: 'Quarterly Tax Payment', amount: 180, dueInDays: 45, category: 'tax' },
    { id: 'ob4', name: 'Debt Payment', amount: 95, dueInDays: 30, category: 'debt' },
    { id: 'ob5', name: 'Annual Insurance Premium', amount: 120, dueInDays: 60, category: 'other' },
    { id: 'ob6', name: 'Lease Payment', amount: 85, dueInDays: 30, category: 'lease' },
    { id: 'ob7', name: 'Term Loan Maturity', amount: 2500, dueInDays: 180, category: 'debt' },
  ];
}

function buildDefaultCovenants(): Covenant[] {
  return [
    { id: 'cov1', name: 'Current Ratio', metric: 'Current Assets ÷ Current Liabilities', threshold: 1.25, currentValue: 0, direction: 'min' },
    { id: 'cov2', name: 'Quick Ratio', metric: '(Current Assets − Inventory − Prepaid) ÷ CL', threshold: 1.0, currentValue: 0, direction: 'min' },
    { id: 'cov3', name: 'Debt Service Coverage', metric: 'EBITDA ÷ Total Debt Service', threshold: 1.5, currentValue: 2.1, direction: 'min' },
    { id: 'cov4', name: 'Leverage Ratio', metric: 'Total Debt ÷ EBITDA', threshold: 3.5, currentValue: 2.8, direction: 'max' },
  ];
}

const DEFAULT_SETTINGS: LiquiditySettings = {
  companyName: 'Acme Corp',
  fiscalYear: new Date().getFullYear(),
  openingCash: 2800,
  currentAssets: 9500,
  currentLiabilities: 3400,
  inventory: 800,
  prepaidExpenses: 350,
  daysReceivable: 42,
  daysPayable: 35,
  daysInventory: 28,
  creditLineTotal: 3000,
  creditLineDrawn: 500,
  stressCollectionDelay: 15,
  stressRevenueDropPct: 25,
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;
const fmtR = (n: number) => isFinite(n) ? n.toFixed(2) : '—';
const fmtD = (n: number) => `${n.toFixed(0)} days`;
const sumM = (arr: number[]) => arr.reduce((a, v) => a + v, 0);


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Current Ratio": "Current Assets ÷ Current Liabilities. Measures ability to pay short-term obligations. Target ≥ 1.5.",
  "Quick Ratio": "(Current Assets − Inventory − Prepaid) ÷ Current Liabilities. Stricter liquidity test. Target ≥ 1.0.",
  "Cash Ratio": "Cash & Equivalents ÷ Current Liabilities. Most conservative ratio.",
  "Cash Conversion Cycle": "Days Receivable + Days Inventory − Days Payable. Days to convert investment to cash.",
  "Working Capital": "Current Assets − Current Liabilities. Positive = can cover short-term debts.",
  "Cash Runway": "Available Cash ÷ Avg Monthly Burn. Months until cash is depleted.",
  "Maturity Gap": "Liquid Assets available within a timeframe minus obligations due. Positive = covered.",
  "Credit Line Headroom": "Undrawn credit facility. Emergency buffer available immediately.",
  "Debt Service Coverage": "EBITDA ÷ Annual Debt Service. Ability to cover debt payments. Target ≥ 1.5x.",
  "Liquidity Buffer": "Cash + Near-Cash + Undrawn Credit − Immediate Obligations.",
  "Stress Test": "Simulated adverse scenario (delayed collections, revenue drop) to test survival.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Liquidity Risk Glossary</DialogTitle>
        <DialogDescription>Key terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);


// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const LiquidityGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Liquidity Risk Analysis Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">
          <div>
            <h3 className="font-semibold text-primary mb-2">What is Liquidity Risk?</h3>
            <p className="text-sm text-muted-foreground">The risk that a company cannot meet short-term financial obligations as they come due, even if it is solvent on a balance-sheet basis. A profitable company can fail if cash is tied up in receivables or inventory. This tool projects cash flows, stress-tests adverse scenarios, and checks covenant compliance.</p>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Map Cash Flows', desc: 'Project 12-month inflows (collections, investment, financing) and outflows (payroll, rent, suppliers, debt service, capex, tax).' },
                { step: '2', title: 'Assess Liquidity Ratios', desc: 'Current, Quick, and Cash ratios measure how well current assets cover current liabilities.' },
                { step: '3', title: 'Maturity Gap Analysis', desc: 'Match liquid asset availability (by days to liquidate) against obligation due dates across 5 time buckets.' },
                { step: '4', title: 'Check Covenants', desc: 'Verify financial ratios stay within lender-imposed covenant thresholds to avoid default triggers.' },
                { step: '5', title: 'Stress Test', desc: 'Model adverse scenarios: delayed collections, revenue drop. Does the company run out of cash?' },
                { step: '6', title: 'Report & Monitor', desc: 'Export findings. Track ratios monthly, update projections quarterly.' },
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
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Healthy</th><th className="p-2 text-left">Warning</th></tr></thead>
                <tbody>
                  {[
                    ['Current Ratio', 'Current Assets ÷ CL', '≥ 1.5', '< 1.0'],
                    ['Quick Ratio', '(CA − Inventory − Prepaid) ÷ CL', '≥ 1.0', '< 0.8'],
                    ['Cash Ratio', '(Cash + Equivalents) ÷ CL', '≥ 0.5', '< 0.2'],
                    ['Cash Conversion Cycle', 'DSO + DIO − DPO', '< 45 days', '> 60 days'],
                    ['Working Capital', 'Current Assets − CL', 'Positive', 'Negative'],
                    ['Cash Runway', 'Cash ÷ Monthly Burn', '> 12 months', '< 6 months'],
                  ].map(([m, f, h, w], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 border-r font-semibold">{m}</td>
                      <td className="p-2 border-r font-mono text-muted-foreground">{f}</td>
                      <td className="p-2 border-r text-green-600">{h}</td>
                      <td className="p-2 text-red-500">{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Maturity Buckets</h3>
            <div className="grid grid-cols-5 gap-2">
              {['0–7 days', '8–30 days', '31–90 days', '91–180 days', '181–365 days'].map(b => (
                <div key={b} className="p-2 rounded-lg border bg-muted/20 text-center">
                  <p className="font-semibold text-xs">{b}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Assets vs Obligations</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Positive gap = assets exceed obligations in that time bucket. Negative gap = funding shortfall.</p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• A company can be <strong>profitable but illiquid</strong> if cash is tied up in receivables or inventory.</li>
              <li>• Watch the <strong>Cash Conversion Cycle</strong> — shorter = faster cash access.</li>
              <li>• Maintain at least <strong>6 months cash runway</strong> as a safety buffer.</li>
              <li>• Negative maturity gaps in early buckets (0–30 days) are most dangerous.</li>
              <li>• Run stress tests regularly — don't wait for a crisis to discover vulnerabilities.</li>
              <li>• Covenant breaches can trigger loan acceleration — monitor proactively.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({ onStart }: { onStart: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Droplets className="w-8 h-8 text-primary" /></div></div>
        <CardTitle className="font-headline text-3xl">Liquidity Risk Analysis</CardTitle>
        <CardDescription className="text-base mt-2">Analyze the risk of not being able to meet short-term financial obligations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Wallet, title: 'Cash Flow Projection', desc: '12-month inflow/outflow forecast with running cash balance' },
            { icon: Gauge, title: 'Liquidity Ratios', desc: 'Current, Quick, Cash ratios and working capital cycle' },
            { icon: Shield, title: 'Maturity Gap & Stress', desc: 'Match assets vs obligations; test adverse scenarios' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Manual Input */}
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
                <div><CardTitle className="text-base">Manual Input</CardTitle><CardDescription className="text-xs">Enter cash flow data directly</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Configure inflows, outflows, liquid assets, obligations, and covenants manually. All values editable.</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {['3 inflow lines', '8 outflow lines', '4 liquid assets', '7 obligations'].map(f => (
                  <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>
                ))}
              </div>
              <Button onClick={onStart} className="w-full" size="lg"><Droplets className="w-4 h-4 mr-2" />Start Analysis</Button>
            </CardContent>
          </Card>
          {/* What's included */}
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
                <div><CardTitle className="text-base">Analysis Includes</CardTitle><CardDescription className="text-xs">Pre-loaded sample data</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-xs text-muted-foreground">
                {['12-month cash flow projection', 'Liquidity ratios (Current, Quick, Cash)', 'Cash Conversion Cycle visualization', 'Maturity gap analysis (5 buckets)', 'Covenant compliance check', 'Stress test scenario modeling', 'Key Findings auto-generation'].map(f => (
                  <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />{f}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
          <Info className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">This tool provides a structured framework for liquidity risk analysis. All inputs are editable. It is not a substitute for professional financial advice.</p>
        </div>
      </CardContent>
    </Card>
  </div>
);


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function LiquidityRiskPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: LiquidityPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedInflow, setExpandedInflow] = useState<string | null>(null);
  const [expandedOutflow, setExpandedOutflow] = useState<string | null>(null);

  const [settings, setSettings] = useState<LiquiditySettings>(DEFAULT_SETTINGS);
  const [inflows, setInflows] = useState<CashInflow[]>(buildDefaultInflows);
  const [outflows, setOutflows] = useState<CashOutflow[]>(buildDefaultOutflows);
  const [liquidAssets, setLiquidAssets] = useState<LiquidAsset[]>(buildDefaultLiquidAssets);
  const [obligations, setObligations] = useState<Obligation[]>(buildDefaultObligations);
  const [covenants, setCovenants] = useState<Covenant[]>(buildDefaultCovenants);

  // ── Ratios ──
  const ratios = useMemo(() => {
    const ca = settings.currentAssets;
    const cl = settings.currentLiabilities;
    const current = cl > 0 ? ca / cl : 0;
    const quick = cl > 0 ? (ca - settings.inventory - settings.prepaidExpenses) / cl : 0;
    const cashEquiv = liquidAssets.filter(la => la.daysToLiquidate <= 1).reduce((s, la) => s + la.amount, 0);
    const cashR = cl > 0 ? cashEquiv / cl : 0;
    const wc = ca - cl;
    const ccc = settings.daysReceivable + settings.daysInventory - settings.daysPayable;
    return { current, quick, cashR, wc, ccc, cashEquiv };
  }, [settings, liquidAssets]);

  // Update covenant current values for ratio-based covenants
  useMemo(() => {
    setCovenants(prev => prev.map(c => {
      if (c.name === 'Current Ratio') return { ...c, currentValue: ratios.current };
      if (c.name === 'Quick Ratio') return { ...c, currentValue: ratios.quick };
      return c;
    }));
  }, [ratios.current, ratios.quick]);

  // ── Monthly cash projection ──
  const cashProjection = useMemo(() => {
    let balance = settings.openingCash;
    return MONTHS.map((m, mi) => {
      const totalIn = inflows.reduce((s, inf) => s + inf.monthly[mi], 0);
      const totalOut = outflows.reduce((s, out) => s + out.monthly[mi], 0);
      const netFlow = totalIn - totalOut;
      balance += netFlow;
      return { month: m, inflow: totalIn, outflow: totalOut, netFlow, balance, creditAvail: settings.creditLineTotal - settings.creditLineDrawn };
    });
  }, [inflows, outflows, settings]);

  // Stressed projection
  const stressedProjection = useMemo(() => {
    let balance = settings.openingCash;
    const revDrop = 1 - settings.stressRevenueDropPct / 100;
    const delayMonths = Math.round(settings.stressCollectionDelay / 30);
    return MONTHS.map((m, mi) => {
      let totalIn = inflows.reduce((s, inf) => {
        const base = inf.monthly[mi] * (inf.category === 'collections' ? revDrop : 1);
        if (inf.category === 'collections' && delayMonths > 0 && mi < delayMonths) return s + base * 0.5;
        return s + base;
      }, 0);
      const totalOut = outflows.reduce((s, out) => s + out.monthly[mi], 0);
      balance += totalIn - totalOut;
      return { month: m, balance, netFlow: totalIn - totalOut };
    });
  }, [inflows, outflows, settings]);

  // Cash runway
  const avgMonthlyBurn = useMemo(() => {
    const negMonths = cashProjection.filter(cp => cp.netFlow < 0);
    return negMonths.length > 0 ? negMonths.reduce((s, cp) => s + Math.abs(cp.netFlow), 0) / negMonths.length : 0;
  }, [cashProjection]);
  const totalLiquid = useMemo(() => liquidAssets.reduce((s, la) => s + la.amount, 0), [liquidAssets]);
  const cashRunway = avgMonthlyBurn > 0 ? totalLiquid / avgMonthlyBurn : Infinity;
  const creditHeadroom = settings.creditLineTotal - settings.creditLineDrawn;

  // Maturity gap
  const maturityBuckets = useMemo(() => {
    const buckets = [
      { label: '0–7 days', maxDays: 7 },
      { label: '8–30 days', maxDays: 30 },
      { label: '31–90 days', maxDays: 90 },
      { label: '91–180 days', maxDays: 180 },
      { label: '181–365 days', maxDays: 365 },
    ];
    return buckets.map(b => {
      const assets = liquidAssets.filter(la => la.daysToLiquidate <= b.maxDays).reduce((s, la) => s + la.amount, 0);
      const liab = obligations.filter(ob => ob.dueInDays <= b.maxDays).reduce((s, ob) => s + ob.amount, 0);
      return { ...b, assets, liabilities: liab, gap: assets - liab };
    });
  }, [liquidAssets, obligations]);

  // Minimum cash month
  const minCashMonth = useMemo(() => cashProjection.reduce((min, cp) => cp.balance < min.balance ? cp : min, cashProjection[0]), [cashProjection]);
  const stressMinCash = useMemo(() => stressedProjection.reduce((min, cp) => cp.balance < min.balance ? cp : min, stressedProjection[0]), [stressedProjection]);

  // ── CRUD ──
  const updateInflowMonth = useCallback((id: string, mi: number, val: number) => {
    setInflows(prev => prev.map(inf => { if (inf.id !== id) return inf; const arr = [...inf.monthly]; arr[mi] = val; return { ...inf, monthly: arr }; }));
  }, []);
  const addInflow = useCallback((cat: CashInflow['category']) => {
    setInflows(prev => [...prev, { id: `in${Date.now()}`, name: 'New Inflow', category: cat, monthly: Array(12).fill(0) }]);
  }, []);
  const removeInflow = useCallback((id: string) => { setInflows(prev => prev.filter(i => i.id !== id)); }, []);
  const updateInflow = useCallback((id: string, updates: Partial<CashInflow>) => { setInflows(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i)); }, []);

  const updateOutflowMonth = useCallback((id: string, mi: number, val: number) => {
    setOutflows(prev => prev.map(out => { if (out.id !== id) return out; const arr = [...out.monthly]; arr[mi] = val; return { ...out, monthly: arr }; }));
  }, []);
  const addOutflow = useCallback((cat: CashOutflow['category']) => {
    setOutflows(prev => [...prev, { id: `out${Date.now()}`, name: 'New Outflow', category: cat, monthly: Array(12).fill(0) }]);
  }, []);
  const removeOutflow = useCallback((id: string) => { setOutflows(prev => prev.filter(o => o.id !== id)); }, []);
  const updateOutflow = useCallback((id: string, updates: Partial<CashOutflow>) => { setOutflows(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o)); }, []);

  const updateLA = useCallback((id: string, updates: Partial<LiquidAsset>) => { setLiquidAssets(prev => prev.map(la => la.id === id ? { ...la, ...updates } : la)); }, []);
  const addLA = useCallback(() => { setLiquidAssets(prev => [...prev, { id: `la${Date.now()}`, name: 'New Asset', amount: 0, daysToLiquidate: 0 }]); }, []);
  const removeLA = useCallback((id: string) => { setLiquidAssets(prev => prev.filter(la => la.id !== id)); }, []);

  const updateOb = useCallback((id: string, updates: Partial<Obligation>) => { setObligations(prev => prev.map(ob => ob.id === id ? { ...ob, ...updates } : ob)); }, []);
  const addOb = useCallback((cat: Obligation['category']) => { setObligations(prev => [...prev, { id: `ob${Date.now()}`, name: 'New Obligation', amount: 0, dueInDays: 30, category: cat }]); }, []);
  const removeOb = useCallback((id: string) => { setObligations(prev => prev.filter(ob => ob.id !== id)); }, []);

  const updateCov = useCallback((id: string, updates: Partial<Covenant>) => { setCovenants(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)); }, []);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `LiquidityRisk_${settings.fiscalYear}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, [settings.fiscalYear]);

  const handleDownloadCSV = useCallback(() => {
    let csv = `LIQUIDITY RISK — ${settings.companyName} FY${settings.fiscalYear}\n\n`;
    csv += `RATIOS\nCurrent Ratio,${fmtR(ratios.current)}\nQuick Ratio,${fmtR(ratios.quick)}\nCash Ratio,${fmtR(ratios.cashR)}\nWorking Capital,${fmt(ratios.wc)}\nCCC,${settings.daysReceivable + settings.daysInventory - settings.daysPayable} days\n\n`;
    csv += `MONTHLY PROJECTION\n`;
    csv += Papa.unparse(cashProjection.map(cp => ({ Month: cp.month, 'Inflow ($K)': cp.inflow, 'Outflow ($K)': cp.outflow, 'Net ($K)': cp.netFlow, 'Balance ($K)': Math.round(cp.balance) }))) + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `LiquidityRisk_${settings.fiscalYear}.csv`; link.click();
  }, [settings, ratios, cashProjection]);

  if (showIntro) return <IntroPage onStart={() => setShowIntro(false)} />;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Liquidity Risk Analysis</h1><p className="text-muted-foreground mt-1">{settings.companyName} — FY{settings.fiscalYear}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <LiquidityGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Balance Sheet & Working Capital</CardTitle><CardDescription>Financial position inputs</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Company', key: 'companyName', type: 'text' },
              { label: 'Opening Cash ($K)', key: 'openingCash' },
              { label: 'Current Assets ($K)', key: 'currentAssets' },
              { label: 'Current Liabilities ($K)', key: 'currentLiabilities' },
              { label: 'Inventory ($K)', key: 'inventory' },
              { label: 'Prepaid ($K)', key: 'prepaidExpenses' },
              { label: 'Days Receivable', key: 'daysReceivable' },
              { label: 'Days Payable', key: 'daysPayable' },
              { label: 'Days Inventory', key: 'daysInventory' },
              { label: 'Credit Line ($K)', key: 'creditLineTotal' },
              { label: 'Credit Drawn ($K)', key: 'creditLineDrawn' },
            ].map(({ label, key, type }) => (
              <div key={key} className="space-y-1.5"><Label className="text-xs">{label}</Label>
                <Input type={type || 'number'} value={(settings as any)[key]} onChange={e => setSettings(p => ({ ...p, [key]: type === 'text' ? e.target.value : parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Liquidity Dashboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Current Ratio', value: fmtR(ratios.current), ok: ratios.current >= 1.5, target: '≥ 1.50' },
                { label: 'Quick Ratio', value: fmtR(ratios.quick), ok: ratios.quick >= 1.0, target: '≥ 1.00' },
                { label: 'Cash Ratio', value: fmtR(ratios.cashR), ok: ratios.cashR >= 0.5, target: '≥ 0.50' },
                { label: 'Working Capital', value: fmt(ratios.wc), ok: ratios.wc > 0 },
              ].map(({ label, value, ok, target }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-lg font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>{value}</p>
                  {target && <p className="text-xs text-muted-foreground">Target {target}</p>}
                </div>
              ))}
            </div>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cash Conv. Cycle', value: `${ratios.ccc} days`, ok: ratios.ccc <= 60 },
                { label: 'Total Liquid Assets', value: fmt(totalLiquid) },
                { label: 'Credit Headroom', value: fmt(creditHeadroom) },
                { label: 'Cash Runway', value: isFinite(cashRunway) ? `${cashRunway.toFixed(1)} mo` : 'Net positive', ok: cashRunway > 6 || !isFinite(cashRunway) },
              ].map(({ label, value, ok }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-sm font-bold ${ok !== undefined ? (ok ? 'text-green-600' : 'text-red-600') : 'text-primary'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Cash Inflows ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><ArrowUpRight className="w-5 h-5 text-green-700 dark:text-green-400" /></div>
              <div><CardTitle>Cash Inflows</CardTitle><CardDescription>Click to expand monthly detail</CardDescription></div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button></DropdownMenuTrigger>
              <DropdownMenuContent>{Object.entries(INFLOW_CATS).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => addInflow(k as CashInflow['category'])}>{v}</DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead className="min-w-[140px]">Source</TableHead><TableHead className="text-center">Category</TableHead><TableHead className="text-right">Annual ($K)</TableHead><TableHead className="text-right">Avg/mo</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
            <TableBody>
              {inflows.map(inf => (
                <React.Fragment key={inf.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedInflow(prev => prev === inf.id ? null : inf.id)}>
                    <TableCell><div className="flex items-center gap-1.5"><ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedInflow === inf.id ? 'rotate-90' : ''}`} /><Input value={inf.name} onChange={e => { e.stopPropagation(); updateInflow(inf.id, { name: e.target.value }); }} onClick={e => e.stopPropagation()} className="h-6 text-xs font-medium border-0 bg-transparent p-0" /></div></TableCell>
                    <TableCell className="text-center"><Badge className={`text-xs ${INFLOW_COLORS[inf.category]}`}>{INFLOW_CATS[inf.category]}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-green-600">{fmt(sumM(inf.monthly))}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(Math.round(sumM(inf.monthly) / 12))}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeInflow(inf.id)}><X className="w-3 h-3" /></Button></TableCell>
                  </TableRow>
                  {expandedInflow === inf.id && (
                    <TableRow><TableCell colSpan={5} className="p-0">
                      <div className="bg-muted/10 border-y px-4 py-2 overflow-x-auto" onClick={e => e.stopPropagation()}>
                        <table className="w-full text-xs font-mono"><thead><tr className="text-muted-foreground">{MONTHS.map(m => <th key={m} className="p-1 text-center w-16">{m}</th>)}</tr></thead>
                        <tbody><tr>{MONTHS.map((m, mi) => (<td key={m} className="p-0.5"><Input type="number" value={inf.monthly[mi]} onChange={e => updateInflowMonth(inf.id, mi, parseFloat(e.target.value) || 0)} className="h-5 w-full text-center text-xs font-mono p-0" /></td>))}</tr></tbody></table>
                      </div>
                    </TableCell></TableRow>
                  )}
                </React.Fragment>
              ))}
              <TableRow className="border-t-2 bg-green-50/50 dark:bg-green-950/10">
                <TableCell className="font-semibold text-green-700 dark:text-green-400">Total Inflows</TableCell><TableCell></TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-green-600">{fmt(inflows.reduce((s, inf) => s + sumM(inf.monthly), 0))}</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(Math.round(inflows.reduce((s, inf) => s + sumM(inf.monthly), 0) / 12))}</TableCell><TableCell></TableCell>
              </TableRow>
            </TableBody></Table>
        </CardContent>
      </Card>

      {/* ══ Cash Outflows ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><ArrowDownRight className="w-5 h-5 text-red-700 dark:text-red-400" /></div>
              <div><CardTitle>Cash Outflows</CardTitle><CardDescription>Click to expand monthly detail</CardDescription></div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button></DropdownMenuTrigger>
              <DropdownMenuContent>{Object.entries(OUTFLOW_CATS).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => addOutflow(k as CashOutflow['category'])}>{v}</DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead className="min-w-[140px]">Item</TableHead><TableHead className="text-center">Category</TableHead><TableHead className="text-right">Annual ($K)</TableHead><TableHead className="text-right">Avg/mo</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
            <TableBody>
              {outflows.map(out => (
                <React.Fragment key={out.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedOutflow(prev => prev === out.id ? null : out.id)}>
                    <TableCell><div className="flex items-center gap-1.5"><ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedOutflow === out.id ? 'rotate-90' : ''}`} /><Input value={out.name} onChange={e => { e.stopPropagation(); updateOutflow(out.id, { name: e.target.value }); }} onClick={e => e.stopPropagation()} className="h-6 text-xs font-medium border-0 bg-transparent p-0" /></div></TableCell>
                    <TableCell className="text-center"><Badge className={`text-xs ${OUTFLOW_COLORS[out.category]}`}>{OUTFLOW_CATS[out.category]}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-red-600">{fmt(sumM(out.monthly))}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(Math.round(sumM(out.monthly) / 12))}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeOutflow(out.id)}><X className="w-3 h-3" /></Button></TableCell>
                  </TableRow>
                  {expandedOutflow === out.id && (
                    <TableRow><TableCell colSpan={5} className="p-0">
                      <div className="bg-muted/10 border-y px-4 py-2 overflow-x-auto" onClick={e => e.stopPropagation()}>
                        <table className="w-full text-xs font-mono"><thead><tr className="text-muted-foreground">{MONTHS.map(m => <th key={m} className="p-1 text-center w-16">{m}</th>)}</tr></thead>
                        <tbody><tr>{MONTHS.map((m, mi) => (<td key={m} className="p-0.5"><Input type="number" value={out.monthly[mi]} onChange={e => updateOutflowMonth(out.id, mi, parseFloat(e.target.value) || 0)} className="h-5 w-full text-center text-xs font-mono p-0" /></td>))}</tr></tbody></table>
                      </div>
                    </TableCell></TableRow>
                  )}
                </React.Fragment>
              ))}
              <TableRow className="border-t-2 bg-red-50/50 dark:bg-red-950/10">
                <TableCell className="font-semibold text-red-700 dark:text-red-400">Total Outflows</TableCell><TableCell></TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-red-600">{fmt(outflows.reduce((s, out) => s + sumM(out.monthly), 0))}</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(Math.round(outflows.reduce((s, out) => s + sumM(out.monthly), 0) / 12))}</TableCell><TableCell></TableCell>
              </TableRow>
            </TableBody></Table>
        </CardContent>
      </Card>

      {/* ══ Liquid Assets & Obligations ══ */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" />Liquid Assets</CardTitle>
              <Button variant="outline" size="sm" onClick={addLA}><Plus className="w-3 h-3 mr-1" />Add</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Days</TableHead><TableHead className="w-6"></TableHead></TableRow></TableHeader>
              <TableBody>
                {liquidAssets.map(la => (
                  <TableRow key={la.id}>
                    <TableCell><Input value={la.name} onChange={e => updateLA(la.id, { name: e.target.value })} className="h-6 text-xs border-0 bg-transparent p-0" /></TableCell>
                    <TableCell className="text-right"><Input type="number" value={la.amount} onChange={e => updateLA(la.id, { amount: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" /></TableCell>
                    <TableCell className="text-right"><Input type="number" value={la.daysToLiquidate} onChange={e => updateLA(la.id, { daysToLiquidate: parseInt(e.target.value) || 0 })} className="h-6 w-10 text-right text-xs font-mono" /></TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removeLA(la.id)}><X className="w-2.5 h-2.5" /></Button></TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2"><TableCell className="font-semibold text-primary">Total</TableCell><TableCell className="text-right font-mono text-xs font-bold text-primary">{fmt(totalLiquid)}</TableCell><TableCell></TableCell><TableCell></TableCell></TableRow>
              </TableBody></Table>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Near-Term Obligations</CardTitle>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-3 h-3 mr-1" />Add</Button></DropdownMenuTrigger>
                <DropdownMenuContent>{['payable', 'debt', 'payroll', 'tax', 'lease', 'other'].map(c => <DropdownMenuItem key={c} onClick={() => addOb(c as Obligation['category'])}>{c}</DropdownMenuItem>)}</DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Obligation</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Due</TableHead><TableHead className="w-6"></TableHead></TableRow></TableHeader>
              <TableBody>
                {obligations.sort((a, b) => a.dueInDays - b.dueInDays).map(ob => (
                  <TableRow key={ob.id}>
                    <TableCell><Input value={ob.name} onChange={e => updateOb(ob.id, { name: e.target.value })} className="h-6 text-xs border-0 bg-transparent p-0" /></TableCell>
                    <TableCell className="text-right"><Input type="number" value={ob.amount} onChange={e => updateOb(ob.id, { amount: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" /></TableCell>
                    <TableCell className="text-right"><Input type="number" value={ob.dueInDays} onChange={e => updateOb(ob.id, { dueInDays: parseInt(e.target.value) || 0 })} className="h-6 w-12 text-right text-xs font-mono" /></TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removeOb(ob.id)}><X className="w-2.5 h-2.5" /></Button></TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2"><TableCell className="font-semibold text-red-600">Total</TableCell><TableCell className="text-right font-mono text-xs font-bold text-red-600">{fmt(obligations.reduce((s, ob) => s + ob.amount, 0))}</TableCell><TableCell></TableCell><TableCell></TableCell></TableRow>
              </TableBody></Table>
          </CardContent>
        </Card>
      </div>

      {/* ══ Covenant Compliance ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Covenant Compliance</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Covenant</TableHead><TableHead>Metric</TableHead><TableHead className="text-center">Threshold</TableHead><TableHead className="text-center">Current</TableHead><TableHead className="text-center">Headroom</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {covenants.map(cov => {
                const compliant = cov.direction === 'min' ? cov.currentValue >= cov.threshold : cov.currentValue <= cov.threshold;
                const headroom = cov.direction === 'min' ? cov.currentValue - cov.threshold : cov.threshold - cov.currentValue;
                return (
                  <TableRow key={cov.id}>
                    <TableCell className="text-xs font-medium">{cov.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cov.metric}</TableCell>
                    <TableCell className="text-center"><Input type="number" value={cov.threshold} onChange={e => updateCov(cov.id, { threshold: parseFloat(e.target.value) || 0 })} className="h-6 w-14 text-center text-xs font-mono mx-auto" step={0.1} /></TableCell>
                    <TableCell className="text-center"><Input type="number" value={parseFloat(cov.currentValue.toFixed(2))} onChange={e => updateCov(cov.id, { currentValue: parseFloat(e.target.value) || 0 })} className="h-6 w-14 text-center text-xs font-mono mx-auto" step={0.01} /></TableCell>
                    <TableCell className={`text-center font-mono text-xs ${compliant ? 'text-green-600' : 'text-red-600'}`}>{headroom >= 0 ? '+' : ''}{headroom.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{compliant ? <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Pass</Badge> : <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Breach</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody></Table>
        </CardContent>
      </Card>

      {/* ══ Stress Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-primary" />Stress Scenario</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Collection Delay (days)</Label>
              <div className="flex items-center gap-2"><Slider value={[settings.stressCollectionDelay]} onValueChange={([v]) => setSettings(p => ({ ...p, stressCollectionDelay: v }))} min={0} max={60} step={5} className="flex-1" /><span className="text-sm font-mono w-10">+{settings.stressCollectionDelay}d</span></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Revenue Drop (%)</Label>
              <div className="flex items-center gap-2"><Slider value={[settings.stressRevenueDropPct]} onValueChange={([v]) => setSettings(p => ({ ...p, stressRevenueDropPct: v }))} min={0} max={60} step={5} className="flex-1" /><span className="text-sm font-mono w-10 text-red-600">−{settings.stressRevenueDropPct}%</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b">
          <h2 className="text-2xl font-bold">{settings.companyName} — Liquidity Risk Report</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | FY{settings.fiscalYear}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Liquidity', value: fmt(totalLiquid + creditHeadroom), sub: `${fmt(totalLiquid)} cash + ${fmt(creditHeadroom)} credit`, color: 'text-primary' },
            { label: 'Current Ratio', value: fmtR(ratios.current), sub: ratios.current >= 1.5 ? 'Healthy (≥1.5)' : ratios.current >= 1.0 ? 'Adequate' : 'Critical (<1.0)', color: ratios.current >= 1.5 ? 'text-green-600' : ratios.current >= 1.0 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Cash Runway', value: isFinite(cashRunway) ? `${Math.round(cashRunway)}mo` : '∞', sub: isFinite(cashRunway) ? (cashRunway >= 12 ? 'Comfortable' : cashRunway >= 6 ? 'Monitor closely' : 'Critical') : 'No net burn', color: !isFinite(cashRunway) || cashRunway >= 12 ? 'text-green-600' : cashRunway >= 6 ? 'text-amber-600' : 'text-red-600' },
            { label: 'CCC', value: `${ratios.ccc}d`, sub: ratios.ccc > 60 ? 'Elevated' : ratios.ccc > 45 ? 'Moderate' : 'Efficient', color: ratios.ccc <= 45 ? 'text-green-600' : ratios.ccc <= 60 ? 'text-amber-600' : 'text-red-600' },
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

        {/* Liquidity Ratios & Metrics Table */}
        <Card>
          <CardHeader><CardTitle>Liquidity Ratios & Risk Metrics</CardTitle><CardDescription>Key ratios, stress test results, and covenant status</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Metric</th>
              <th className="p-2 text-right font-semibold">Value</th>
              <th className="p-2 text-right font-semibold">Benchmark</th>
              <th className="p-2 text-right font-semibold">Status</th>
            </tr></thead>
            <tbody>
              {[
                { metric: 'Current Ratio', value: fmtR(ratios.current), bench: '≥ 1.50', ok: ratios.current >= 1.5, warn: ratios.current >= 1.0 },
                { metric: 'Quick Ratio', value: fmtR(ratios.quick), bench: '≥ 1.00', ok: ratios.quick >= 1.0, warn: ratios.quick >= 0.7 },
                { metric: 'Cash Ratio', value: fmtR(ratios.cashR), bench: '≥ 0.50', ok: ratios.cashR >= 0.5, warn: ratios.cashR >= 0.2 },
                { metric: 'Cash Conversion Cycle', value: `${ratios.ccc} days`, bench: '≤ 45 days', ok: ratios.ccc <= 45, warn: ratios.ccc <= 60 },
                { metric: 'DSO (Days Sales Outstanding)', value: `${settings.daysReceivable}d`, bench: '≤ 30d', ok: settings.daysReceivable <= 30, warn: settings.daysReceivable <= 45 },
                { metric: 'DIO (Days Inventory)', value: `${settings.daysInventory}d`, bench: '≤ 30d', ok: settings.daysInventory <= 30, warn: settings.daysInventory <= 60 },
                { metric: 'DPO (Days Payable)', value: `${settings.daysPayable}d`, bench: '≥ 30d', ok: settings.daysPayable >= 30, warn: settings.daysPayable >= 15 },
                { metric: 'Cash Runway', value: isFinite(cashRunway) ? `${Math.round(cashRunway)} months` : '∞', bench: '≥ 12 months', ok: !isFinite(cashRunway) || cashRunway >= 12, warn: !isFinite(cashRunway) || cashRunway >= 6 },
                { metric: '12-Month Min Cash', value: fmt(Math.round(minCashMonth.balance)), bench: '> $0', ok: minCashMonth.balance > 0, warn: minCashMonth.balance >= -100 },
                { metric: 'Stress Test Min Cash', value: fmt(Math.round(stressMinCash.balance)), bench: '> $0', ok: stressMinCash.balance > 0, warn: stressMinCash.balance >= -100 },
              ].map(({ metric, value, bench, ok, warn }) => (
                <tr key={metric} className="border-b">
                  <td className="p-2 font-medium">{metric}</td>
                  <td className="p-2 text-right font-mono font-semibold">{value}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{bench}</td>
                  <td className="p-2 text-right"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${ok ? 'bg-green-100 text-green-700' : warn ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{ok ? 'Pass' : warn ? 'Watch' : 'Fail'}</span></td>
                </tr>
              ))}
              {covenants.map(c => {
                const breached = c.direction === 'min' ? c.currentValue < c.threshold : c.currentValue > c.threshold;
                return (
                  <tr key={c.name} className="border-b">
                    <td className="p-2 font-medium">Covenant: {c.name}</td>
                    <td className="p-2 text-right font-mono font-semibold">{fmtR(c.currentValue)}</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{c.direction === 'min' ? '≥' : '≤'} {fmtR(c.threshold)}</td>
                    <td className="p-2 text-right"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${breached ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{breached ? 'Breach' : 'Pass'}</span></td>
                  </tr>);
              })}
            </tbody>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Liquidity risk highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Total liquidity: ${fmt(totalLiquid)} liquid assets + ${fmt(creditHeadroom)} undrawn credit = ${fmt(totalLiquid + creditHeadroom)} available. ${isFinite(cashRunway) ? `Cash runway: ${Math.round(cashRunway)} months.` : 'No net cash burn detected.'}`);
                  items.push(`Liquidity ratios: Current ${fmtR(ratios.current)} (${ratios.current >= 1.5 ? 'above 1.5 — healthy' : ratios.current >= 1.0 ? 'adequate but below 1.5' : 'below 1.0 — critical'}), Quick ${fmtR(ratios.quick)} (${ratios.quick >= 1.0 ? 'healthy' : 'below 1.0'}), Cash ${fmtR(ratios.cashR)} (${ratios.cashR >= 0.5 ? 'healthy' : 'low'}).`);
                  items.push(`Cash Conversion Cycle: ${ratios.ccc} days (DSO ${settings.daysReceivable}d + DIO ${settings.daysInventory}d − DPO ${settings.daysPayable}d). ${ratios.ccc > 60 ? 'Elevated — consider accelerating collections or extending payment terms.' : ratios.ccc > 45 ? 'Moderate — room for improvement.' : 'Efficient cash cycle.'}`);
                  const negGaps = maturityBuckets.filter(b => b.gap < 0);
                  if (negGaps.length > 0) items.push(`Maturity gap shortfalls in ${negGaps.length} bucket${negGaps.length > 1 ? 's' : ''}: ${negGaps.map(b => `${b.label} (${fmt(Math.abs(b.gap))} shortfall)`).join(', ')}. Consider drawing credit line or restructuring.`);
                  else items.push('All maturity buckets show positive gaps — assets exceed obligations at every horizon.');
                  items.push(`12-month projection: Min cash ${fmt(Math.round(minCashMonth.balance))} in ${minCashMonth.month}, ending balance ${fmt(Math.round(cashProjection[11]?.balance || 0))}. ${minCashMonth.balance < 0 ? 'Cash goes negative — funding needed.' : 'Cash stays positive all year.'}`);
                  items.push(`Stress test (−${settings.stressRevenueDropPct}% revenue, +${settings.stressCollectionDelay}d delay): Min cash ${fmt(Math.round(stressMinCash.balance))} in ${stressMinCash.month}. ${stressMinCash.balance < 0 ? `Shortfall of ${fmt(Math.abs(Math.round(stressMinCash.balance)))} — emergency funding required.` : 'Survives stress scenario.'}`);
                  const breached = covenants.filter(c => c.direction === 'min' ? c.currentValue < c.threshold : c.currentValue > c.threshold);
                  if (breached.length > 0) items.push(`Covenant breaches: ${breached.map(c => `${c.name} (${fmtR(c.currentValue)} vs ${c.direction === 'min' ? '≥' : '≤'} ${fmtR(c.threshold)})`).join(', ')}. Immediate remediation required.`);
                  else items.push(`All ${covenants.length} debt covenants in compliance.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow + Balance */}
        <Card>
          <CardHeader><CardTitle>12-Month Cash Projection</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <Bar dataKey="inflow" name="Inflows" fill="#0d9488" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Bar dataKey="outflow" name="Outflows" fill="#e57373" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Line dataKey="balance" name="Cash Balance" type="monotone" stroke="#1e3a5f" strokeWidth={3} dot={{ r: 4 }} />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Min Cash: <strong className={minCashMonth.balance >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(Math.round(minCashMonth.balance))}</strong> ({minCashMonth.month})</span>
              <span>End Balance: <strong>{fmt(Math.round(cashProjection[11]?.balance || 0))}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Stressed Projection */}
        <Card>
          <CardHeader><CardTitle>Stress Test — Cash Balance Comparison</CardTitle><CardDescription>Collection delay +{settings.stressCollectionDelay}d, Revenue −{settings.stressRevenueDropPct}%</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHS.map((m, i) => ({ month: m, base: Math.round(cashProjection[i].balance), stress: Math.round(stressedProjection[i].balance) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#e57373" strokeWidth={2} label={{ value: 'Cash = $0', position: 'right', fontSize: 10 }} />
                  <Area dataKey="base" name="Base Case" type="monotone" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.1} strokeWidth={2} />
                  <Area dataKey="stress" name="Stress Case" type="monotone" stroke="#e57373" fill="#e57373" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Stress min cash: <strong className={stressMinCash.balance >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(Math.round(stressMinCash.balance))}</strong> ({stressMinCash.month}){stressMinCash.balance < 0 ? ` — would need ${fmt(Math.abs(Math.round(stressMinCash.balance)))} emergency funding` : ''}</p>
          </CardContent>
        </Card>

        {/* Maturity Gap */}
        <Card>
          <CardHeader><CardTitle>Maturity Gap Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maturityBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <Bar dataKey="assets" name="Liquid Assets" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="liabilities" name="Obligations" fill="#e57373" radius={[4, 4, 0, 0]} />
                  <ReferenceLine y={0} stroke="#000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {maturityBuckets.map(b => (
                <div key={b.label} className={`text-center p-2 rounded-lg border ${b.gap >= 0 ? 'bg-green-50/50 dark:bg-green-950/10' : 'bg-red-50/50 dark:bg-red-950/10'}`}>
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className={`text-xs font-bold font-mono ${b.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>{b.gap >= 0 ? '+' : ''}{fmt(b.gap)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Working Capital Cycle */}
        <Card>
          <CardHeader><CardTitle>Cash Conversion Cycle</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
              {[
                { label: 'DSO', value: settings.daysReceivable, color: 'bg-blue-100 dark:bg-blue-900/30' },
                { label: '+', value: null, op: true },
                { label: 'DIO', value: settings.daysInventory, color: 'bg-amber-100 dark:bg-amber-900/30' },
                { label: '−', value: null, op: true },
                { label: 'DPO', value: settings.daysPayable, color: 'bg-green-100 dark:bg-green-900/30' },
                { label: '=', value: null, op: true },
                { label: 'CCC', value: ratios.ccc, color: 'bg-primary/10', final: true },
              ].map((item, i) => item.op ? (
                <span key={i} className="text-2xl font-light text-muted-foreground">{item.label}</span>
              ) : (
                <div key={i} className={`px-4 py-3 rounded-xl text-center ${item.color} ${item.final ? 'ring-2 ring-primary' : ''}`}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-xl font-bold ${item.final ? 'text-primary' : ''}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">days</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">{settings.companyName} — Liquidity Assessment</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>{settings.companyName}</strong> holds {fmt(totalLiquid)} in liquid assets with {fmt(creditHeadroom)} in undrawn credit, totaling <strong>{fmt(totalLiquid + creditHeadroom)}</strong> in available liquidity. Current ratio is <strong>{fmtR(ratios.current)}</strong> ({ratios.current >= 1.5 ? 'above' : 'below'} the 1.5 target) and quick ratio is {fmtR(ratios.quick)}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The cash conversion cycle is <strong>{ratios.ccc} days</strong> (DSO {settings.daysReceivable}d + DIO {settings.daysInventory}d − DPO {settings.daysPayable}d). {ratios.ccc > 60 ? 'This is elevated — consider accelerating collections or negotiating longer payment terms.' : 'This is within acceptable range.'}
                </p>
                {(() => {
                  const negGaps = maturityBuckets.filter(b => b.gap < 0);
                  return negGaps.length > 0 ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <strong>Maturity gap risk:</strong> {negGaps.map(b => `${b.label} (shortfall ${fmt(Math.abs(b.gap))})`).join(', ')}. Consider drawing on the credit line or restructuring obligation maturities.
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">All maturity buckets show positive gaps — liquid assets exceed obligations at every time horizon.</p>
                  );
                })()}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Under stress (collections delayed {settings.stressCollectionDelay} days, revenue down {settings.stressRevenueDropPct}%), minimum cash would be <strong>{fmt(Math.round(stressMinCash.balance))}</strong> in {stressMinCash.month}. {stressMinCash.balance < 0 ? `This represents a shortfall requiring ${fmt(Math.abs(Math.round(stressMinCash.balance)))} in emergency funding.` : 'The company survives the stress scenario without requiring emergency funding.'}
                </p>
                {(() => {
                  const breached = covenants.filter(c => c.direction === 'min' ? c.currentValue < c.threshold : c.currentValue > c.threshold);
                  return breached.length > 0 ? (
                    <p className="text-sm leading-relaxed text-muted-foreground"><strong>Covenant breaches:</strong> {breached.map(c => c.name).join(', ')}. Immediate remediation required to avoid default triggers.</p>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">All {covenants.length} debt covenants are currently in compliance.</p>
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
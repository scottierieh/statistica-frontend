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
  HelpCircle, Calculator, ChevronRight, Upload,
  Plus, X, Settings2, CheckCircle2, Layers,
  AlertTriangle, Activity, Clock, Repeat,
  ArrowUpRight, ArrowDownRight, BarChart3, Gauge,
  Wallet, CreditCard, Package, RefreshCw, Lightbulb, Zap
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
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface WCSettings {
  companyName: string;
  fiscalYear: number;
  annualRevenue: number;      // $K
  annualCOGS: number;         // $K
  annualOpex: number;         // $K
  monthlyGrowthPct: number;   // %
}

interface ARItem {
  id: string;
  name: string;
  amount: number;              // $K
  agingBucket: '0-30' | '31-60' | '61-90' | '90+';
  collectionDays: number;
}

interface APItem {
  id: string;
  name: string;
  amount: number;              // $K
  agingBucket: '0-30' | '31-60' | '61-90' | '90+';
  paymentDays: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: 'raw' | 'wip' | 'finished';
  amount: number;              // $K
  turnoverDays: number;
}

interface WCScenario {
  dsoDelta: number;            // days change from current
  dpoDelta: number;
  dioDelta: number;
}

interface WCPageProps {
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
const SEASONALITY = [0.85, 0.88, 0.95, 1.00, 1.05, 1.10, 1.12, 1.08, 1.02, 0.98, 0.92, 0.95];

const AGING_COLORS: Record<string, string> = {
  '0-30': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  '31-60': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  '61-90': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  '90+': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};
const INV_COLORS: Record<string, string> = {
  raw: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  wip: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  finished: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};
const INV_LABELS: Record<string, string> = { raw: 'Raw Materials', wip: 'Work-in-Progress', finished: 'Finished Goods' };

function buildDefaultAR(): ARItem[] {
  return [
    { id: 'ar1', name: 'Enterprise Clients', amount: 1800, agingBucket: '0-30', collectionDays: 35 },
    { id: 'ar2', name: 'Mid-Market Accounts', amount: 950, agingBucket: '0-30', collectionDays: 42 },
    { id: 'ar3', name: 'SMB — Current', amount: 420, agingBucket: '31-60', collectionDays: 55 },
    { id: 'ar4', name: 'Overdue Invoices', amount: 280, agingBucket: '61-90', collectionDays: 75 },
    { id: 'ar5', name: 'Collections / Disputed', amount: 150, agingBucket: '90+', collectionDays: 120 },
  ];
}

function buildDefaultAP(): APItem[] {
  return [
    { id: 'ap1', name: 'Cloud Services (AWS/GCP)', amount: 650, agingBucket: '0-30', paymentDays: 30 },
    { id: 'ap2', name: 'SaaS Vendors', amount: 320, agingBucket: '0-30', paymentDays: 25 },
    { id: 'ap3', name: 'Professional Services', amount: 280, agingBucket: '31-60', paymentDays: 45 },
    { id: 'ap4', name: 'Office & Facilities', amount: 180, agingBucket: '0-30', paymentDays: 30 },
    { id: 'ap5', name: 'Hardware Suppliers', amount: 220, agingBucket: '31-60', paymentDays: 60 },
  ];
}

function buildDefaultInventory(): InventoryItem[] {
  return [
    { id: 'inv1', name: 'Server Components', category: 'raw', amount: 350, turnoverDays: 25 },
    { id: 'inv2', name: 'Assembly Queue', category: 'wip', amount: 180, turnoverDays: 12 },
    { id: 'inv3', name: 'Ready-to-Ship Hardware', category: 'finished', amount: 270, turnoverDays: 18 },
  ];
}

const DEFAULT_SETTINGS: WCSettings = {
  companyName: 'Acme Corp',
  fiscalYear: new Date().getFullYear(),
  annualRevenue: 18500,
  annualCOGS: 7400,
  annualOpex: 6200,
  monthlyGrowthPct: 1.5,
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;
const fmtR = (n: number) => isFinite(n) ? n.toFixed(1) : '—';


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Working Capital": "Current Assets − Current Liabilities. Cash available for day-to-day operations.",
  "Net Working Capital (NWC)": "AR + Inventory − AP. Operating working capital excluding cash.",
  "DSO": "Days Sales Outstanding. AR ÷ (Revenue ÷ 365). Speed of customer collections.",
  "DPO": "Days Payable Outstanding. AP ÷ (COGS ÷ 365). How long you take to pay suppliers.",
  "DIO": "Days Inventory Outstanding. Inventory ÷ (COGS ÷ 365). How long inventory sits before sale.",
  "Cash Conversion Cycle": "DSO + DIO − DPO. Total days from cash outlay to cash collection.",
  "Aging Analysis": "Breakdown of AR/AP by how long invoices have been outstanding (0-30, 31-60, etc.).",
  "Inventory Turnover": "COGS ÷ Average Inventory. How many times inventory cycles per year.",
  "WC Intensity": "NWC ÷ Revenue × 100. Percentage of revenue tied up in working capital.",
  "Cash Impact": "Change in NWC. Decrease = cash freed. Increase = cash consumed.",
  "Float": "Time between when you pay suppliers and when customers pay you.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Working Capital Glossary</DialogTitle><DialogDescription>Key terms</DialogDescription></DialogHeader>
      <ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea>
    </DialogContent>
  </Dialog>
);


// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const WCGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Working Capital Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">

          {/* What is it */}
          <div>
            <h3 className="font-semibold text-primary mb-2">What is Working Capital?</h3>
            <p className="text-sm text-muted-foreground">Working Capital (NWC) = Current Assets − Current Liabilities. It measures a company's short-term liquidity and operational efficiency. Managing working capital is critical because it directly impacts cash flow — even profitable companies can fail if they run out of cash due to poor working capital management.</p>
          </div>

          {/* Optimization Process */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Optimization Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Measure Current State', desc: 'Calculate DSO, DIO, DPO and the Cash Conversion Cycle (CCC). This is your baseline.' },
                { step: '2', title: 'Analyze AR Aging', desc: 'Identify overdue invoices by aging bucket (0-30, 31-60, 61-90, 90+ days). Older = higher risk of write-off and cash shortfall.' },
                { step: '3', title: 'Optimize Inventory', desc: 'Reduce raw materials and WIP holding without causing stockouts. Target finished goods to match demand cycles.' },
                { step: '4', title: 'Negotiate AP Terms', desc: 'Extend payment terms to keep cash longer. Balance with supplier relationships and early-pay discounts (2/10 net 30).' },
                { step: '5', title: 'Model Scenarios', desc: 'Use the scenario slider to see the cash impact of DSO/DIO/DPO improvements before implementing changes.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Three Components */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Three Components</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/10">
                <p className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-400">📥 Accounts Receivable</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>What:</strong> Money owed to you by customers</p>
                  <p><strong>Measure:</strong> DSO (Days Sales Outstanding)</p>
                  <p><strong>Goal:</strong> Lower DSO = collect cash faster</p>
                  <p><strong>Levers:</strong> Tighter terms, early-pay discounts, automated collections</p>
                  <p><strong>Risk:</strong> Aging 60+ days → higher default probability</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/10">
                <p className="font-semibold text-sm mb-2 text-red-700 dark:text-red-400">📤 Accounts Payable</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>What:</strong> Money you owe to suppliers</p>
                  <p><strong>Measure:</strong> DPO (Days Payables Outstanding)</p>
                  <p><strong>Goal:</strong> Higher DPO = hold cash longer</p>
                  <p><strong>Levers:</strong> Negotiate net-60/90 terms, centralize payments</p>
                  <p><strong>Risk:</strong> Too long → damaged supplier relationships</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/10">
                <p className="font-semibold text-sm mb-2 text-amber-700 dark:text-amber-400">📦 Inventory</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>What:</strong> Raw materials, WIP, finished goods</p>
                  <p><strong>Measure:</strong> DIO (Days Inventory Outstanding)</p>
                  <p><strong>Goal:</strong> Lower DIO = less cash tied up in stock</p>
                  <p><strong>Levers:</strong> JIT delivery, demand forecasting, SKU rationalization</p>
                  <p><strong>Risk:</strong> Too lean → stockouts and lost sales</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Formulas */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Key Formulas</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Interpretation</th></tr></thead>
                <tbody>
                  {[
                    ['DSO', 'AR ÷ (Revenue ÷ 365)', 'Days to collect customer payments. Lower = faster cash in.'],
                    ['DIO', 'Inventory ÷ (COGS ÷ 365)', 'Days inventory sits before being sold. Lower = less cash tied up.'],
                    ['DPO', 'AP ÷ (COGS ÷ 365)', 'Days to pay suppliers. Higher = cash retained longer.'],
                    ['CCC', 'DSO + DIO − DPO', 'Total days from cash-out to cash-in. Lower (or negative) = better.'],
                    ['NWC', 'AR + Inventory − AP', 'Net working capital. Positive = cash is being used to fund operations.'],
                    ['Cash Impact', 'ΔNWC = ΔAR + ΔInv − ΔAP', 'Change in NWC = cash freed up (if negative) or consumed (if positive).'],
                    ['WC Intensity', 'NWC ÷ Revenue × 100%', 'How much working capital per dollar of revenue. Lower = more efficient.'],
                  ].map(([metric, formula, interp], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 border-r font-semibold">{metric}</td>
                      <td className="p-2 border-r font-mono text-muted-foreground">{formula}</td>
                      <td className="p-2 text-muted-foreground">{interp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Benchmarks */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Industry Benchmarks</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { metric: 'DSO', excellent: '< 30d', good: '30–45d', warning: '45–60d', poor: '> 60d' },
                { metric: 'DIO', excellent: '< 20d', good: '20–40d', warning: '40–60d', poor: '> 60d' },
                { metric: 'DPO', excellent: '> 45d', good: '30–45d', warning: '20–30d', poor: '< 20d' },
                { metric: 'CCC', excellent: '< 20d', good: '20–40d', warning: '40–60d', poor: '> 60d' },
              ].map(({ metric, excellent, good, warning, poor }) => (
                <div key={metric} className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-sm text-center mb-2">{metric}</p>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span className="text-green-600">🟢 Excellent</span><span className="font-mono">{excellent}</span></div>
                    <div className="flex justify-between"><span className="text-blue-600">🔵 Good</span><span className="font-mono">{good}</span></div>
                    <div className="flex justify-between"><span className="text-amber-600">🟡 Warning</span><span className="font-mono">{warning}</span></div>
                    <div className="flex justify-between"><span className="text-red-600">🔴 Poor</span><span className="font-mono">{poor}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aging Analysis */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Aging Analysis Explained</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { bucket: '0–30 days', risk: 'Low', color: 'bg-green-100 text-green-800', desc: 'Current invoices within standard terms. Healthy.' },
                { bucket: '31–60 days', risk: 'Medium', color: 'bg-yellow-100 text-yellow-800', desc: 'Slightly past due. Follow up with reminders.' },
                { bucket: '61–90 days', risk: 'High', color: 'bg-orange-100 text-orange-800', desc: 'Significantly overdue. Escalate collections.' },
                { bucket: '90+ days', risk: 'Critical', color: 'bg-red-100 text-red-800', desc: 'Consider bad debt provision. May require legal action.' },
              ].map(({ bucket, risk, color, desc }) => (
                <div key={bucket} className="p-2.5 rounded-lg border bg-muted/20">
                  <Badge className={`text-[9px] ${color} mb-1.5`}>{bucket}</Badge>
                  <p className="font-semibold text-xs">Risk: {risk}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Analysis */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Scenario Analysis</h3>
            <p className="text-sm text-muted-foreground mb-3">The scenario slider lets you model what happens if you improve DSO, DIO, and DPO by a percentage. It shows:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { title: 'Cash Freed Up', desc: 'Dollar amount released from working capital by reducing AR/Inventory or extending AP.' },
                { title: 'Radar Comparison', desc: 'Visual overlay of current vs. improved DSO, DIO, DPO, CCC, and NWC metrics.' },
                { title: 'Margin of Safety', desc: 'How much buffer you have before working capital constraints impact operations.' },
                { title: 'Implementation Priority', desc: 'Which lever (AR, AP, or Inventory) gives the biggest cash improvement per day improved.' },
              ].map(({ title, desc }) => (
                <div key={title} className="p-3 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• <strong>Goal:</strong> Minimize CCC. Lower DSO (collect faster) + lower DIO (less inventory) + higher DPO (pay slower) = more cash available.</li>
              <li>• A negative CCC means you receive customer cash before paying suppliers — the ideal position (common in subscription/prepaid models).</li>
              <li>• Watch AR aging closely: if 60+ day receivables exceed 15% of total AR, collection risk is elevated.</li>
              <li>• Don't extend DPO at the expense of supplier relationships — losing key vendors costs more than the cash benefit.</li>
              <li>• Use the Export CSV/PNG to share working capital analysis with CFO, treasury, or auditors.</li>
              <li>• Upload your own data via CSV to replace defaults with actual AR/AP/Inventory balances.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// CSV FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_WC_CSV = `Section,Name,Amount,AgingBucket,Days,Category
AR,Enterprise Clients,1800,0-30,35,
AR,Mid-Market Accounts,950,0-30,42,
AR,SMB Current,420,31-60,55,
AR,Overdue Invoices,280,61-90,75,
AR,Collections Disputed,150,90+,120,
AP,Cloud Services,650,0-30,30,
AP,SaaS Vendors,320,0-30,25,
AP,Professional Services,280,31-60,45,
AP,Office Facilities,180,0-30,30,
AP,Hardware Suppliers,220,31-60,60,
INV,Server Components,350,,25,raw
INV,Assembly Queue,180,,12,wip
INV,Ready-to-Ship Hardware,270,,18,finished`;

const WCFormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownload = () => {
    const blob = new Blob([SAMPLE_WC_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'sample_working_capital.csv'; link.click();
    toast({ title: "Downloaded!" });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Working Capital Data Format</DialogTitle><DialogDescription>Upload AR, AP, and Inventory items in a single CSV</DialogDescription></DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Structure */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">Use a <strong>Section</strong> column (<code className="bg-muted px-1 rounded text-xs">AR</code>, <code className="bg-muted px-1 rounded text-xs">AP</code>, or <code className="bg-muted px-1 rounded text-xs">INV</code>) to distinguish item types. Amounts in <strong>$K</strong>.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50"><th className="p-2 text-left border-r">Section</th><th className="p-2 text-left border-r">Name</th><th className="p-2 text-right border-r">Amount</th><th className="p-2 text-center border-r">Aging</th><th className="p-2 text-right border-r">Days</th><th className="p-2 text-center">Category</th></tr></thead>
                  <tbody>
                    {[
                      ['AR', 'Enterprise Clients', '1,800', '0-30', '35', '—'],
                      ['AR', 'Mid-Market Accounts', '950', '0-30', '42', '—'],
                      ['AR', 'SMB Current', '420', '31-60', '55', '—'],
                      ['AR', 'Overdue Invoices', '280', '61-90', '75', '—'],
                      ['AR', 'Collections Disputed', '150', '90+', '120', '—'],
                      ['AP', 'Cloud Services', '650', '0-30', '30', '—'],
                      ['AP', 'SaaS Vendors', '320', '0-30', '25', '—'],
                      ['AP', 'Professional Services', '280', '31-60', '45', '—'],
                      ['AP', 'Hardware Suppliers', '220', '31-60', '60', '—'],
                      ['INV', 'Server Components', '350', '—', '25', 'raw'],
                      ['INV', 'Assembly Queue', '180', '—', '12', 'wip'],
                      ['INV', 'Ready-to-Ship', '270', '—', '18', 'finished'],
                    ].map(([s, n, a, ag, d, c], idx) => (
                      <tr key={idx} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{s}</td><td className="p-2 border-r">{n}</td><td className="p-2 text-right border-r">{a}</td><td className="p-2 text-center border-r">{ag}</td><td className="p-2 text-right border-r">{d}</td><td className="p-2 text-center">{c}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column Reference */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Column Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'Section', required: true, desc: 'AR (Accounts Receivable), AP (Accounts Payable), or INV (Inventory)' },
                  { name: 'Name', required: true, desc: 'Descriptive label for the item (e.g. "Enterprise Clients", "Cloud Services")' },
                  { name: 'Amount', required: true, desc: 'Outstanding balance in $K (thousands)' },
                  { name: 'AgingBucket', required: false, desc: 'For AR/AP: 0-30, 31-60, 61-90, or 90+. Leave blank for INV.' },
                  { name: 'Days', required: true, desc: 'AR: Collection days. AP: Payment terms. INV: Turnover days.' },
                  { name: 'Category', required: false, desc: 'For INV only: raw, wip (work-in-progress), or finished. Ignored for AR/AP.' },
                ].map(({ name, required, desc }) => (
                  <div key={name} className={`p-2.5 rounded-lg border text-sm ${required ? 'border-[#1e3a5f]/30 bg-[#1e3a5f]/5' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs">{name}</span>
                      {required && <span className="text-[9px] text-red-500 font-medium">Required</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Details */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Section Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { section: 'AR', icon: '📥', title: 'Accounts Receivable', items: ['Collection days per item', 'Aging buckets (0-30, 31-60, 61-90, 90+)', 'Used for: DSO calculation, aging analysis', 'Higher days → slower cash inflow'] },
                  { section: 'AP', icon: '📤', title: 'Accounts Payable', items: ['Payment terms per vendor', 'Aging buckets for payables', 'Used for: DPO calculation, cash flow', 'Higher days → better cash retention'] },
                  { section: 'INV', icon: '📦', title: 'Inventory', items: ['Turnover days by category', 'Categories: raw → wip → finished', 'Used for: DIO calculation, CCC', 'Lower days → faster inventory turns'] },
                ].map(({ section, icon, title, items }) => (
                  <div key={section} className="p-3 rounded-lg border bg-muted/20">
                    <p className="font-semibold text-xs flex items-center gap-1.5">{icon} {title} <Badge variant="secondary" className="text-[8px]">{section}</Badge></p>
                    <ul className="mt-2 space-y-1">
                      {items.map((item, i) => <li key={i} className="text-[10px] text-muted-foreground">• {item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics Explained */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Key Metrics Calculated</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { metric: 'DSO', formula: 'AR ÷ (Revenue ÷ 365)', desc: 'Days Sales Outstanding' },
                  { metric: 'DPO', formula: 'AP ÷ (COGS ÷ 365)', desc: 'Days Payable Outstanding' },
                  { metric: 'DIO', formula: 'INV ÷ (COGS ÷ 365)', desc: 'Days Inventory Outstanding' },
                  { metric: 'CCC', formula: 'DSO + DIO − DPO', desc: 'Cash Conversion Cycle' },
                ].map(({ metric, formula, desc }) => (
                  <div key={metric} className="p-2.5 rounded-lg border bg-muted/20 text-center">
                    <p className="font-bold text-sm text-primary">{metric}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                    <p className="text-[9px] font-mono bg-muted rounded px-1.5 py-0.5 mt-1 inline-block">{formula}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• All amounts in <strong>$K</strong> (thousands). Use positive values.</li>
                <li>• AR items with <strong>90+ aging</strong> are flagged as high-risk in the analysis.</li>
                <li>• INV <strong>Category</strong> is optional — defaults to <code className="bg-muted px-1 rounded">raw</code> if omitted.</li>
                <li>• A healthy CCC is typically <strong>30–60 days</strong> for most industries. Lower = better cash efficiency.</li>
                <li>• Revenue and COGS inputs (for DSO/DPO/DIO) are set separately in the tool after upload.</li>
              </ul>
            </div>

            <div className="flex justify-center"><Button variant="outline" onClick={handleDownload}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button></div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({ onStart, hasUploadedData, onStartWithData }: { onStart: () => void; hasUploadedData: boolean; onStartWithData: () => void }) => {
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><RefreshCw className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Working Capital Model</CardTitle>
          <CardDescription className="text-base mt-2">Analyze short-term assets and liabilities to optimize operational efficiency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Clock, title: 'Cash Conversion', desc: 'DSO + DIO − DPO cycle time and optimization targets' },
              { icon: BarChart3, title: 'Aging Analysis', desc: 'AR/AP aging buckets to identify collection risk' },
              { icon: Gauge, title: 'Scenario Impact', desc: 'Model how WC changes release or consume cash' },
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
                  <div><CardTitle className="text-base">Upload WC Data</CardTitle><CardDescription className="text-xs">AR/AP/Inventory from CSV</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button></>
                ) : (
                  <><p className="text-sm text-muted-foreground">Upload AR/AP items with aging and collection/payment days.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Name | Amount($K) | AgingBucket | CollectionDays</p>
                      <p className="text-muted-foreground">e.g. Enterprise Clients, 1800, 0-30, 35</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide</Button></>
                )}
              </CardContent>
            </Card>
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">Sample AR/AP/Inventory</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Pre-loaded with 5 AR items, 5 AP items, 3 inventory items, and monthly projections.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />Aging analysis by bucket</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />CCC optimization with scenario slider</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />12-month WC projection</div>
                </div>
                <Button variant="outline" onClick={onStart} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <WCFormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function WorkingCapitalPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: WCPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [settings, setSettings] = useState<WCSettings>(DEFAULT_SETTINGS);
  const [arItems, setArItems] = useState<ARItem[]>(buildDefaultAR);
  const [apItems, setApItems] = useState<APItem[]>(buildDefaultAP);
  const [invItems, setInvItems] = useState<InventoryItem[]>(buildDefaultInventory);
  const [scenario, setScenario] = useState<WCScenario>({ dsoDelta: 0, dpoDelta: 0, dioDelta: 0 });

  const parsedUpload = useMemo(() => { /* simplified — check for AR/AP data */ return null; }, [data]);

  // ── Core metrics ──
  const totalAR = useMemo(() => arItems.reduce((s, a) => s + a.amount, 0), [arItems]);
  const totalAP = useMemo(() => apItems.reduce((s, a) => s + a.amount, 0), [apItems]);
  const totalInv = useMemo(() => invItems.reduce((s, i) => s + i.amount, 0), [invItems]);
  const nwc = totalAR + totalInv - totalAP;

  const dailyRev = settings.annualRevenue / 365;
  const dailyCOGS = settings.annualCOGS / 365;

  const dso = dailyRev > 0 ? totalAR / dailyRev : 0;
  const dpo = dailyCOGS > 0 ? totalAP / dailyCOGS : 0;
  const dio = dailyCOGS > 0 ? totalInv / dailyCOGS : 0;
  const ccc = dso + dio - dpo;

  const wcIntensity = settings.annualRevenue > 0 ? (nwc / settings.annualRevenue) * 100 : 0;
  const invTurnover = totalInv > 0 ? settings.annualCOGS / totalInv : 0;

  // Scenario impact
  const scenarioDSO = dso + scenario.dsoDelta;
  const scenarioDPO = dpo + scenario.dpoDelta;
  const scenarioDIO = dio + scenario.dioDelta;
  const scenarioCCC = scenarioDSO + scenarioDIO - scenarioDPO;
  const scenarioAR = scenarioDSO * dailyRev;
  const scenarioAP = scenarioDPO * dailyCOGS;
  const scenarioInv = scenarioDIO * dailyCOGS;
  const scenarioNWC = scenarioAR + scenarioInv - scenarioAP;
  const cashImpact = nwc - scenarioNWC; // positive = cash freed

  // AR aging breakdown
  const arAging = useMemo(() => {
    const buckets = ['0-30', '31-60', '61-90', '90+'];
    return buckets.map(b => ({
      bucket: b,
      amount: arItems.filter(a => a.agingBucket === b).reduce((s, a) => s + a.amount, 0),
      count: arItems.filter(a => a.agingBucket === b).length,
      pct: totalAR > 0 ? (arItems.filter(a => a.agingBucket === b).reduce((s, a) => s + a.amount, 0) / totalAR) * 100 : 0,
    }));
  }, [arItems, totalAR]);

  // AP aging breakdown
  const apAging = useMemo(() => {
    const buckets = ['0-30', '31-60', '61-90', '90+'];
    return buckets.map(b => ({
      bucket: b,
      amount: apItems.filter(a => a.agingBucket === b).reduce((s, a) => s + a.amount, 0),
      pct: totalAP > 0 ? (apItems.filter(a => a.agingBucket === b).reduce((s, a) => s + a.amount, 0) / totalAP) * 100 : 0,
    }));
  }, [apItems, totalAP]);

  // Inventory by category
  const invByCategory = useMemo(() => {
    return (['raw', 'wip', 'finished'] as const).map(cat => ({
      category: INV_LABELS[cat],
      amount: invItems.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0),
      pct: totalInv > 0 ? (invItems.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0) / totalInv) * 100 : 0,
    }));
  }, [invItems, totalInv]);

  // Monthly WC projection
  const monthlyProjection = useMemo(() => {
    const monthlyRev = settings.annualRevenue / 12;
    const monthlyCOGS = settings.annualCOGS / 12;
    let cumGrowth = 1;
    return MONTHS.map((m, mi) => {
      cumGrowth *= (1 + settings.monthlyGrowthPct / 100);
      const rev = monthlyRev * SEASONALITY[mi] * cumGrowth;
      const cgs = monthlyCOGS * SEASONALITY[mi] * cumGrowth;
      const ar = (rev * 12 / 365) * (scenarioDSO);
      const ap = (cgs * 12 / 365) * (scenarioDPO);
      const inv = (cgs * 12 / 365) * (scenarioDIO);
      return { month: m, ar, ap, inventory: inv, nwc: ar + inv - ap, revenue: rev };
    });
  }, [settings, scenarioDSO, scenarioDPO, scenarioDIO]);

  // Radar comparison
  const radarData = useMemo(() => [
    { metric: 'DSO', current: dso, scenario: scenarioDSO, benchmark: 45 },
    { metric: 'DIO', current: dio, scenario: scenarioDIO, benchmark: 30 },
    { metric: 'DPO', current: dpo, scenario: scenarioDPO, benchmark: 40 },
    { metric: 'CCC', current: ccc, scenario: scenarioCCC, benchmark: 35 },
    { metric: 'WC %', current: wcIntensity, scenario: settings.annualRevenue > 0 ? (scenarioNWC / settings.annualRevenue) * 100 : 0, benchmark: 15 },
  ], [dso, dio, dpo, ccc, wcIntensity, scenarioDSO, scenarioDIO, scenarioDPO, scenarioCCC, scenarioNWC, settings.annualRevenue]);

  // ── CRUD ──
  const updateAR = useCallback((id: string, u: Partial<ARItem>) => { setArItems(p => p.map(a => a.id === id ? { ...a, ...u } : a)); }, []);
  const addAR = useCallback(() => { setArItems(p => [...p, { id: `ar${Date.now()}`, name: 'New AR', amount: 100, agingBucket: '0-30', collectionDays: 30 }]); }, []);
  const removeAR = useCallback((id: string) => { setArItems(p => p.filter(a => a.id !== id)); }, []);

  const updateAP = useCallback((id: string, u: Partial<APItem>) => { setApItems(p => p.map(a => a.id === id ? { ...a, ...u } : a)); }, []);
  const addAP = useCallback(() => { setApItems(p => [...p, { id: `ap${Date.now()}`, name: 'New AP', amount: 100, agingBucket: '0-30', paymentDays: 30 }]); }, []);
  const removeAP = useCallback((id: string) => { setApItems(p => p.filter(a => a.id !== id)); }, []);

  const updateInv = useCallback((id: string, u: Partial<InventoryItem>) => { setInvItems(p => p.map(i => i.id === id ? { ...i, ...u } : i)); }, []);
  const addInv = useCallback((cat: InventoryItem['category']) => { setInvItems(p => [...p, { id: `inv${Date.now()}`, name: 'New Item', category: cat, amount: 100, turnoverDays: 20 }]); }, []);
  const removeInv = useCallback((id: string) => { setInvItems(p => p.filter(i => i.id !== id)); }, []);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `WorkingCapital_${settings.fiscalYear}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, [settings.fiscalYear]);

  const handleDownloadCSV = useCallback(() => {
    let csv = `WORKING CAPITAL — ${settings.companyName} FY${settings.fiscalYear}\n\n`;
    csv += `DSO,${dso.toFixed(1)} days\nDIO,${dio.toFixed(1)} days\nDPO,${dpo.toFixed(1)} days\nCCC,${ccc.toFixed(1)} days\nNWC,${fmt(nwc)}\nWC Intensity,${fmtP(wcIntensity)}\n\n`;
    csv += `AR ITEMS\n${Papa.unparse(arItems.map(a => ({ Name: a.name, Amount: a.amount, Aging: a.agingBucket, Days: a.collectionDays })))}\n\n`;
    csv += `AP ITEMS\n${Papa.unparse(apItems.map(a => ({ Name: a.name, Amount: a.amount, Aging: a.agingBucket, Days: a.paymentDays })))}\n\n`;
    csv += `INVENTORY\n${Papa.unparse(invItems.map(i => ({ Name: i.name, Category: INV_LABELS[i.category], Amount: i.amount, Days: i.turnoverDays })))}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `WorkingCapital_${settings.fiscalYear}.csv`; link.click();
  }, [settings, arItems, apItems, invItems, dso, dio, dpo, ccc, nwc, wcIntensity]);

  if (showIntro) return <IntroPage hasUploadedData={false} onStartWithData={() => setShowIntro(false)} onStart={() => setShowIntro(false)} />;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Working Capital Model</h1><p className="text-muted-foreground mt-1">{settings.companyName} — FY{settings.fiscalYear}</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <WCGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div><div><CardTitle>Company Financials</CardTitle><CardDescription>Revenue and cost base for ratio calculations</CardDescription></div></div></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Company', key: 'companyName', type: 'text' },
              { label: 'Revenue ($K/yr)', key: 'annualRevenue' },
              { label: 'COGS ($K/yr)', key: 'annualCOGS' },
              { label: 'OpEx ($K/yr)', key: 'annualOpex' },
              { label: 'Monthly Growth %', key: 'monthlyGrowthPct', step: 0.5 },
            ].map(({ label, key, type, step }) => (
              <div key={key} className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type={type || 'number'} value={(settings as any)[key]} onChange={e => setSettings(p => ({ ...p, [key]: type === 'text' ? e.target.value : parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" step={step} /></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Working Capital Dashboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total AR', value: fmt(totalAR), sub: `DSO: ${fmtR(dso)}d` },
                { label: 'Total Inventory', value: fmt(totalInv), sub: `DIO: ${fmtR(dio)}d` },
                { label: 'Total AP', value: fmt(totalAP), sub: `DPO: ${fmtR(dpo)}d` },
                { label: 'Net Working Capital', value: fmt(nwc), sub: `WC Intensity: ${fmtP(wcIntensity)}` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold text-primary">{value}</p><p className="text-[10px] text-muted-foreground">{sub}</p></div>
              ))}
            </div>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cash Conv. Cycle', value: `${fmtR(ccc)} days`, ok: ccc <= 60 },
                { label: 'Inventory Turnover', value: `${fmtR(invTurnover)}x`, ok: invTurnover >= 4 },
                { label: 'AR > 60 days', value: fmtP(arAging.filter(a => a.bucket === '61-90' || a.bucket === '90+').reduce((s, a) => s + a.pct, 0)), ok: arAging.filter(a => a.bucket === '61-90' || a.bucket === '90+').reduce((s, a) => s + a.pct, 0) <= 15 },
                { label: 'Cash Impact (Scenario)', value: cashImpact >= 0 ? `+${fmt(Math.round(cashImpact))} freed` : `${fmt(Math.round(cashImpact))} consumed`, ok: cashImpact >= 0 },
              ].map(({ label, value, ok }) => (
                <div key={label} className="text-center"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-sm font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>{value}</p></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ CCC Visual ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-primary" />Cash Conversion Cycle</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
            {[
              { label: 'DSO', value: dso, color: 'bg-blue-100 dark:bg-blue-900/30' },
              { label: '+', op: true },
              { label: 'DIO', value: dio, color: 'bg-amber-100 dark:bg-amber-900/30' },
              { label: '−', op: true },
              { label: 'DPO', value: dpo, color: 'bg-green-100 dark:bg-green-900/30' },
              { label: '=', op: true },
              { label: 'CCC', value: ccc, color: 'bg-primary/10', final: true },
            ].map((item, i) => 'op' in item && item.op ? (
              <span key={i} className="text-2xl font-light text-muted-foreground">{item.label}</span>
            ) : (
              <div key={i} className={`px-4 py-3 rounded-xl text-center ${'color' in item ? item.color : ''} ${'final' in item && item.final ? 'ring-2 ring-primary' : ''}`}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-xl font-bold ${'final' in item && item.final ? 'text-primary' : ''}`}>{'value' in item ? fmtR(item.value as number) : ''}</p>
                <p className="text-[10px] text-muted-foreground">days</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ AR Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Wallet className="w-5 h-5 text-blue-700 dark:text-blue-400" /></div><div><CardTitle>Accounts Receivable</CardTitle><CardDescription>Customer balances and collection speed</CardDescription></div></div><Button variant="outline" size="sm" onClick={addAR}><Plus className="w-4 h-4 mr-1" />Add</Button></div></CardHeader>
        <CardContent><Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[35%]">Customer / Bucket</TableHead><TableHead className="text-right w-[18%]">Amount ($K)</TableHead><TableHead className="text-center w-[12%]">Aging</TableHead><TableHead className="text-right w-[13%]">Days</TableHead><TableHead className="text-right w-[14%]">% of AR</TableHead><TableHead className="w-[8%]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {arItems.map(a => (
              <TableRow key={a.id}>
                <TableCell><Input value={a.name} onChange={e => updateAR(a.id, { name: e.target.value })} className="h-6 text-xs border-0 bg-transparent p-0" /></TableCell>
                <TableCell><div className="flex justify-end"><Input type="number" value={a.amount} onChange={e => updateAR(a.id, { amount: parseFloat(e.target.value) || 0 })} className="h-6 w-20 text-right text-xs font-mono" /></div></TableCell>
                <TableCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-5 px-2"><Badge className={`text-[9px] ${AGING_COLORS[a.agingBucket]}`}>{a.agingBucket}</Badge></Button></DropdownMenuTrigger><DropdownMenuContent>{['0-30', '31-60', '61-90', '90+'].map(b => <DropdownMenuItem key={b} onClick={() => updateAR(a.id, { agingBucket: b as any })}>{b} days</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></TableCell>
                <TableCell><div className="flex justify-end"><Input type="number" value={a.collectionDays} onChange={e => updateAR(a.id, { collectionDays: parseInt(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" /></div></TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{totalAR > 0 ? fmtP((a.amount / totalAR) * 100) : '—'}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeAR(a.id)}><X className="w-3 h-3" /></Button></TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 bg-blue-50/50 dark:bg-blue-950/10"><TableCell className="font-semibold text-blue-700 dark:text-blue-400">Total AR</TableCell><TableCell className="text-right font-mono text-xs font-bold text-blue-700">{fmt(totalAR)}</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-xs font-semibold">{fmtR(dso)}d</TableCell><TableCell className="text-right font-mono text-xs">100%</TableCell><TableCell></TableCell></TableRow>
          </TableBody></Table></CardContent>
      </Card>

      {/* ══ AP Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><CreditCard className="w-5 h-5 text-red-700 dark:text-red-400" /></div><div><CardTitle>Accounts Payable</CardTitle><CardDescription>Supplier balances and payment terms</CardDescription></div></div><Button variant="outline" size="sm" onClick={addAP}><Plus className="w-4 h-4 mr-1" />Add</Button></div></CardHeader>
        <CardContent><Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[35%]">Vendor</TableHead><TableHead className="text-right w-[18%]">Amount ($K)</TableHead><TableHead className="text-center w-[12%]">Aging</TableHead><TableHead className="text-right w-[13%]">Days</TableHead><TableHead className="text-right w-[14%]">% of AP</TableHead><TableHead className="w-[8%]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {apItems.map(a => (
              <TableRow key={a.id}>
                <TableCell><Input value={a.name} onChange={e => updateAP(a.id, { name: e.target.value })} className="h-6 text-xs border-0 bg-transparent p-0" /></TableCell>
                <TableCell><div className="flex justify-end"><Input type="number" value={a.amount} onChange={e => updateAP(a.id, { amount: parseFloat(e.target.value) || 0 })} className="h-6 w-20 text-right text-xs font-mono" /></div></TableCell>
                <TableCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-5 px-2"><Badge className={`text-[9px] ${AGING_COLORS[a.agingBucket]}`}>{a.agingBucket}</Badge></Button></DropdownMenuTrigger><DropdownMenuContent>{['0-30', '31-60', '61-90', '90+'].map(b => <DropdownMenuItem key={b} onClick={() => updateAP(a.id, { agingBucket: b as any })}>{b} days</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></TableCell>
                <TableCell><div className="flex justify-end"><Input type="number" value={a.paymentDays} onChange={e => updateAP(a.id, { paymentDays: parseInt(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" /></div></TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{totalAP > 0 ? fmtP((a.amount / totalAP) * 100) : '—'}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeAP(a.id)}><X className="w-3 h-3" /></Button></TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 bg-red-50/50 dark:bg-red-950/10"><TableCell className="font-semibold text-red-700 dark:text-red-400">Total AP</TableCell><TableCell className="text-right font-mono text-xs font-bold text-red-700">{fmt(totalAP)}</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-xs font-semibold">{fmtR(dpo)}d</TableCell><TableCell className="text-right font-mono text-xs">100%</TableCell><TableCell></TableCell></TableRow>
          </TableBody></Table></CardContent>
      </Card>

      {/* ══ Inventory Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Package className="w-5 h-5 text-amber-700 dark:text-amber-400" /></div><div><CardTitle>Inventory</CardTitle><CardDescription>Stock levels and turnover speed</CardDescription></div></div>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button></DropdownMenuTrigger><DropdownMenuContent>{(['raw', 'wip', 'finished'] as const).map(c => <DropdownMenuItem key={c} onClick={() => addInv(c)}>{INV_LABELS[c]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        </div></CardHeader>
        <CardContent><Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[30%]">Item</TableHead><TableHead className="text-center w-[14%]">Type</TableHead><TableHead className="text-right w-[18%]">Amount ($K)</TableHead><TableHead className="text-right w-[16%]">Turnover Days</TableHead><TableHead className="text-right w-[14%]">% of Inv</TableHead><TableHead className="w-[8%]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {invItems.map(inv => (
              <TableRow key={inv.id}>
                <TableCell><Input value={inv.name} onChange={e => updateInv(inv.id, { name: e.target.value })} className="h-6 text-xs border-0 bg-transparent p-0" /></TableCell>
                <TableCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-5 px-2"><Badge className={`text-[9px] ${INV_COLORS[inv.category]}`}>{INV_LABELS[inv.category]}</Badge></Button></DropdownMenuTrigger><DropdownMenuContent>{(['raw', 'wip', 'finished'] as const).map(c => <DropdownMenuItem key={c} onClick={() => updateInv(inv.id, { category: c })}>{INV_LABELS[c]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></TableCell>
                <TableCell><div className="flex justify-end"><Input type="number" value={inv.amount} onChange={e => updateInv(inv.id, { amount: parseFloat(e.target.value) || 0 })} className="h-6 w-20 text-right text-xs font-mono" /></div></TableCell>
                <TableCell><div className="flex justify-end"><Input type="number" value={inv.turnoverDays} onChange={e => updateInv(inv.id, { turnoverDays: parseInt(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono" /></div></TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{totalInv > 0 ? fmtP((inv.amount / totalInv) * 100) : '—'}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeInv(inv.id)}><X className="w-3 h-3" /></Button></TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 bg-amber-50/50 dark:bg-amber-950/10"><TableCell className="font-semibold text-amber-700 dark:text-amber-400">Total Inventory</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-xs font-bold text-amber-700">{fmt(totalInv)}</TableCell><TableCell className="text-right font-mono text-xs font-semibold">{fmtR(dio)}d</TableCell><TableCell className="text-right font-mono text-xs">100%</TableCell><TableCell></TableCell></TableRow>
          </TableBody></Table></CardContent>
      </Card>

      {/* ══ Scenario Slider ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5 text-primary" />Optimization Scenario</CardTitle><CardDescription>Adjust DSO/DIO/DPO to see cash impact</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'DSO Change (days)', key: 'dsoDelta' as const, current: dso, color: 'text-blue-600' },
              { label: 'DIO Change (days)', key: 'dioDelta' as const, current: dio, color: 'text-amber-600' },
              { label: 'DPO Change (days)', key: 'dpoDelta' as const, current: dpo, color: 'text-green-600' },
            ].map(({ label, key, current, color }) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between"><Label className="text-xs">{label}</Label><span className={`text-xs font-mono ${color}`}>{fmtR(current)} → {fmtR(current + scenario[key])} days</span></div>
                <Slider value={[scenario[key]]} onValueChange={([v]) => setScenario(p => ({ ...p, [key]: v }))} min={-30} max={30} step={1} className="flex-1" />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>−30d</span><span className="font-semibold">{scenario[key] >= 0 ? '+' : ''}{scenario[key]}d</span><span>+30d</span></div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Scenario CCC</p><p className={`text-xl font-bold ${scenarioCCC < ccc ? 'text-green-600' : scenarioCCC > ccc ? 'text-red-600' : 'text-primary'}`}>{fmtR(scenarioCCC)}d</p><p className="text-[10px] text-muted-foreground">was {fmtR(ccc)}d</p></div>
            <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Scenario NWC</p><p className="text-xl font-bold text-primary">{fmt(Math.round(scenarioNWC))}</p><p className="text-[10px] text-muted-foreground">was {fmt(nwc)}</p></div>
            <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Cash Impact</p><p className={`text-xl font-bold ${cashImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>{cashImpact >= 0 ? '+' : ''}{fmt(Math.round(cashImpact))}</p><p className="text-[10px] text-muted-foreground">{cashImpact >= 0 ? 'freed' : 'consumed'}</p></div>
            <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">CCC Change</p><p className={`text-xl font-bold ${scenarioCCC - ccc <= 0 ? 'text-green-600' : 'text-red-600'}`}>{scenarioCCC - ccc >= 0 ? '+' : ''}{fmtR(scenarioCCC - ccc)}d</p></div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report</h2>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">{settings.companyName} — Working Capital Report</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | FY{settings.fiscalYear}</p></div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Net Working Capital', value: `$${nwc.toLocaleString()}K`, sub: `AR + Inv − AP`, color: nwc >= 0 ? 'text-primary' : 'text-red-600' },
            { label: 'CCC', value: `${ccc.toFixed(0)}d`, sub: ccc <= 30 ? 'Efficient' : ccc <= 60 ? 'Moderate' : 'Long cycle', color: ccc <= 30 ? 'text-green-600' : ccc <= 60 ? 'text-amber-600' : 'text-red-600' },
            { label: 'DSO', value: `${dso.toFixed(0)}d`, sub: dso <= 35 ? 'Excellent' : dso <= 45 ? 'Good' : dso <= 60 ? 'Average' : 'High', color: dso <= 45 ? 'text-green-600' : dso <= 60 ? 'text-amber-600' : 'text-red-600' },
            { label: 'DPO', value: `${dpo.toFixed(0)}d`, sub: dpo >= 45 ? 'Leveraging terms' : dpo >= 30 ? 'Standard' : 'Paying fast', color: dpo >= 45 ? 'text-green-600' : dpo >= 30 ? 'text-amber-600' : 'text-red-600' },
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

        {/* Working Capital Components Table */}
        <Card>
          <CardHeader><CardTitle>Working Capital Components</CardTitle><CardDescription>AR, AP, and Inventory detail with aging and efficiency metrics</CardDescription></CardHeader>
          <CardContent><div className="space-y-4">
            {/* AR Summary */}
            <div><p className="text-xs font-semibold text-blue-700 mb-1">Accounts Receivable — ${totalAR.toLocaleString()}K (DSO: {dso.toFixed(0)}d)</p>
            <table className="w-full text-xs"><thead><tr className="border-b bg-muted/50">
              <th className="p-1.5 text-left font-semibold">Customer</th><th className="p-1.5 text-right font-semibold">Amount</th><th className="p-1.5 text-center font-semibold">Aging</th><th className="p-1.5 text-right font-semibold">% of AR</th>
            </tr></thead><tbody>{arItems.map(a => (
              <tr key={a.id} className={`border-b ${a.agingBucket === '90+' ? 'bg-red-50/30 dark:bg-red-950/10' : a.agingBucket === '61-90' ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                <td className="p-1.5 font-medium">{a.name}</td>
                <td className="p-1.5 text-right font-mono">${a.amount.toLocaleString()}K</td>
                <td className="p-1.5 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${AGING_COLORS[a.agingBucket]}`}>{a.agingBucket}d</span></td>
                <td className="p-1.5 text-right font-mono">{totalAR > 0 ? (a.amount / totalAR * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}</tbody></table></div>

            {/* AP Summary */}
            <div><p className="text-xs font-semibold text-red-700 mb-1">Accounts Payable — ${totalAP.toLocaleString()}K (DPO: {dpo.toFixed(0)}d)</p>
            <table className="w-full text-xs"><thead><tr className="border-b bg-muted/50">
              <th className="p-1.5 text-left font-semibold">Supplier</th><th className="p-1.5 text-right font-semibold">Amount</th><th className="p-1.5 text-center font-semibold">Aging</th><th className="p-1.5 text-right font-semibold">% of AP</th>
            </tr></thead><tbody>{apItems.map(a => (
              <tr key={a.id} className="border-b">
                <td className="p-1.5 font-medium">{a.name}</td>
                <td className="p-1.5 text-right font-mono">${a.amount.toLocaleString()}K</td>
                <td className="p-1.5 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${AGING_COLORS[a.agingBucket]}`}>{a.agingBucket}d</span></td>
                <td className="p-1.5 text-right font-mono">{totalAP > 0 ? (a.amount / totalAP * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}</tbody></table></div>

            {/* Inventory Summary */}
            <div><p className="text-xs font-semibold text-amber-700 mb-1">Inventory — ${totalInv.toLocaleString()}K (DIO: {dio.toFixed(0)}d)</p>
            <table className="w-full text-xs"><thead><tr className="border-b bg-muted/50">
              <th className="p-1.5 text-left font-semibold">Item</th><th className="p-1.5 text-right font-semibold">Amount</th><th className="p-1.5 text-center font-semibold">Type</th><th className="p-1.5 text-right font-semibold">% of Inv</th>
            </tr></thead><tbody>{invItems.map(inv => (
              <tr key={inv.id} className="border-b">
                <td className="p-1.5 font-medium">{inv.name}</td>
                <td className="p-1.5 text-right font-mono">${inv.amount.toLocaleString()}K</td>
                <td className="p-1.5 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${INV_COLORS[inv.category] || 'bg-gray-100 text-gray-700'}`}>{inv.category}</span></td>
                <td className="p-1.5 text-right font-mono">{totalInv > 0 ? (inv.amount / totalInv * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}</tbody></table></div>

            {/* NWC Summary Row */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border-t-2">
              <span className="font-semibold text-sm">Net Working Capital</span>
              <span className={`font-mono font-bold text-lg ${nwc >= 0 ? 'text-primary' : 'text-red-600'}`}>${nwc.toLocaleString()}K</span>
            </div>
          </div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Working capital highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Cash Conversion Cycle: ${ccc.toFixed(0)} days (DSO ${dso.toFixed(0)}d + DIO ${dio.toFixed(0)}d − DPO ${dpo.toFixed(0)}d).${ccc <= 30 ? ' Efficient cash cycle.' : ccc <= 60 ? ' Moderate — room for optimization.' : ' Long cycle — cash is tied up.'}`);
                  items.push(`Net Working Capital: $${nwc.toLocaleString()}K. AR $${totalAR.toLocaleString()}K + Inventory $${totalInv.toLocaleString()}K − AP $${totalAP.toLocaleString()}K.`);
                  const arOver60 = arItems.filter(a => a.agingBucket === '61-90' || a.agingBucket === '90+').reduce((s, a) => s + a.amount, 0);
                  const arOver60Pct = totalAR > 0 ? (arOver60 / totalAR * 100) : 0;
                  if (arOver60 > 0) items.push(`$${arOver60.toLocaleString()}K in AR aged 60+ days (${arOver60Pct.toFixed(0)}% of total AR). Collection risk elevated.`);
                  else items.push(`All AR within 60-day aging — healthy collections.`);
                  items.push(`DSO benchmark: ${dso <= 35 ? 'Excellent (<35 days).' : dso <= 45 ? 'Good (35–45 days).' : dso <= 60 ? 'Average (45–60 days) — consider tightening terms.' : 'High (>60 days) — immediate attention needed.'}`);
                  items.push(`DPO: ${dpo.toFixed(0)} days. ${dpo >= 45 ? 'Leveraging supplier terms well.' : dpo >= 30 ? 'Standard payment terms.' : 'Paying suppliers quickly — may be able to extend terms for better cash position.'}`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AR Aging Chart */}
        <Card>
          <CardHeader><CardTitle>AR Aging Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arAging} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `$${v}K`} />
                  <YAxis type="category" dataKey="bucket" width={60} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K (${((v / totalAR) * 100).toFixed(1)}%)`, 'Amount']} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {arAging.map((d, i) => <Cell key={i} fill={['#22c55e', '#f59e0b', '#f97316', '#ef4444'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly WC Projection */}
        <Card>
          <CardHeader><CardTitle>12-Month Working Capital Projection</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v.toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}K`, '']} />
                  <Legend />
                  <Bar dataKey="ar" name="AR" fill="#1e3a5f" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inventory" name="Inventory" fill="#0d9488" stackId="a" />
                  <Bar dataKey="ap" name="AP (offset)" fill="#e57373" stackId="b" />
                  <Line dataKey="nwc" name="NWC" type="monotone" stroke="#000" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Breakdown */}
        <Card>
          <CardHeader><CardTitle>Inventory Composition</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {invByCategory.map((d, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Radar */}
        <Card>
          <CardHeader><CardTitle>Efficiency Comparison — Current vs Scenario</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar name="Current" dataKey="current" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Scenario" dataKey="scenario" stroke="#0d9488" fill="#0d9488" fillOpacity={0.15} strokeWidth={2} strokeDasharray="5 5" />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">{settings.companyName} — Working Capital Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>{settings.companyName}</strong> has <strong>{fmt(nwc)}</strong> in net working capital (AR {fmt(totalAR)} + Inventory {fmt(totalInv)} − AP {fmt(totalAP)}), representing {fmtP(wcIntensity)} of annual revenue.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The <strong>Cash Conversion Cycle is {fmtR(ccc)} days</strong> (DSO {fmtR(dso)}d + DIO {fmtR(dio)}d − DPO {fmtR(dpo)}d). {ccc > 60 ? 'This is elevated — cash is tied up for over 2 months per cycle.' : 'This is within a reasonable range.'}
                </p>
                {(() => {
                  const overdueAR = arAging.filter(a => a.bucket === '61-90' || a.bucket === '90+').reduce((s, a) => s + a.amount, 0);
                  const overduePct = totalAR > 0 ? (overdueAR / totalAR) * 100 : 0;
                  return overduePct > 10 ? (
                    <p className="text-sm leading-relaxed text-muted-foreground"><strong>AR aging concern:</strong> {fmtP(overduePct)} of receivables ({fmt(overdueAR)}) are over 60 days old. Consider tightening credit terms or escalating collections.</p>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">AR aging is healthy — only {fmtP(overduePct)} of receivables are over 60 days.</p>
                  );
                })()}
                {cashImpact !== 0 && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    The optimization scenario (DSO {scenario.dsoDelta >= 0 ? '+' : ''}{scenario.dsoDelta}d, DIO {scenario.dioDelta >= 0 ? '+' : ''}{scenario.dioDelta}d, DPO {scenario.dpoDelta >= 0 ? '+' : ''}{scenario.dpoDelta}d) would {cashImpact >= 0 ? 'free' : 'consume'} <strong>{fmt(Math.abs(Math.round(cashImpact)))}</strong> in cash and {scenarioCCC < ccc ? 'reduce' : 'increase'} CCC to {fmtR(scenarioCCC)} days.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pb-8"><Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top</Button></div>
    </div>
  );
}
'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Target, Layers, BookOpen, Download,
  FileSpreadsheet, ImageIcon, Settings2, ChevronDown, FileText,
  Sparkles, Info, HelpCircle, CheckCircle, AlertTriangle,
  Calculator, Percent, Building2, PieChart, Activity, Lightbulb,
  ChevronRight, Upload, Table as TableIcon, XCircle, Check,
  CheckCircle2, Users, Scale, Plus, Trash2, Eye, EyeOff,
  BarChart3, Calendar, Handshake, ArrowRight, Tag
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine, ComposedChart, Line,
  ScatterChart, Scatter, ZAxis
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TransactionData {
  id: string;
  included: boolean;
  date: string;           // YYYY-MM-DD or YYYY
  acquirer: string;
  target: string;
  dealValue: number;      // Total deal value (EV) in $M
  targetRevenue: number;
  targetEbitda: number;
  targetNetIncome: number;
  premiumPaid: number;    // % premium over pre-deal price (optional, 0 if unknown)
}

interface TransactionMultiples {
  target: string;
  acquirer: string;
  date: string;
  dealValue: number;
  evToRevenue: number | null;
  evToEbitda: number | null;
  evToNetIncome: number | null;
  premiumPaid: number;
  targetEbitdaMargin: number | null;
}

interface TxnStats {
  metric: string;
  min: number | null;
  q1: number | null;
  median: number | null;
  mean: number | null;
  q3: number | null;
  max: number | null;
}

interface TargetCompany {
  name: string;
  revenue: number;
  ebitda: number;
  netIncome: number;
  totalDebt: number;
  cash: number;
  sharesOutstanding: number;
}

interface ImpliedValuation {
  metric: string;
  multipleUsed: number;
  multipleName: string;
  enterpriseValue: number | null;
  equityValue: number | null;
  impliedSharePrice: number | null;
}

interface ParsedTxnData {
  transactions: string[];
  metrics: Record<string, (string | number | null)[]>;
  unmapped: string[];
}

interface PTAPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const METRIC_ALIASES: Record<string, string[]> = {
  Date:           ["date", "deal date", "announcement date", "close date", "transaction date", "year"],
  Acquirer:       ["acquirer", "buyer", "acquiring company", "bidder"],
  Target:         ["target", "target company", "seller", "acquired company"],
  DealValue:      ["dealvalue", "deal value", "transaction value", "ev", "enterprise value", "total consideration"],
  TargetRevenue:  ["targetrevenue", "target revenue", "revenue", "ltm revenue", "sales"],
  TargetEbitda:   ["targetebitda", "target ebitda", "ebitda", "ltm ebitda"],
  TargetNetIncome:["targetnetincome", "target net income", "net income", "earnings"],
  PremiumPaid:    ["premiumpaid", "premium paid", "premium", "premium %", "control premium", "offer premium"],
};

const COLORS = {
  primary: '#1e3a5f',
  secondary: '#0d9488',
  positive: '#22c55e',
  negative: '#ef4444',
  muted: '#94a3b8',
  bars: ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#5b9bd5', '#7fb3e0', '#0d9488', '#14b8a6'],
  highlight: '#0d9488',
};

const DEFAULT_TARGET: TargetCompany = {
  name: 'CloudSync (Target)',
  revenue: 620,
  ebitda: 130,
  netIncome: 62,
  totalDebt: 150,
  cash: 200,
  sharesOutstanding: 85,
};

const SAMPLE_TRANSACTIONS: TransactionData[] = [
  { id: 'tx1', included: true, date: '2024-03', acquirer: 'Salesforce', target: 'DataStream AI', dealValue: 4800, targetRevenue: 680, targetEbitda: 163, targetNetIncome: 75, premiumPaid: 35 },
  { id: 'tx2', included: true, date: '2023-11', acquirer: 'SAP', target: 'CloudMetrics', dealValue: 7200, targetRevenue: 1100, targetEbitda: 286, targetNetIncome: 132, premiumPaid: 28 },
  { id: 'tx3', included: true, date: '2023-06', acquirer: 'Adobe', target: 'FormStack Pro', dealValue: 2900, targetRevenue: 420, targetEbitda: 97, targetNetIncome: 42, premiumPaid: 40 },
  { id: 'tx4', included: true, date: '2023-02', acquirer: 'Microsoft', target: 'PipelineIQ', dealValue: 10500, targetRevenue: 1500, targetEbitda: 405, targetNetIncome: 195, premiumPaid: 32 },
  { id: 'tx5', included: true, date: '2022-09', acquirer: 'Oracle', target: 'VaultDB', dealValue: 5600, targetRevenue: 850, targetEbitda: 213, targetNetIncome: 94, premiumPaid: 25 },
  { id: 'tx6', included: true, date: '2022-04', acquirer: 'ServiceNow', target: 'WorkflowAI', dealValue: 3400, targetRevenue: 510, targetEbitda: 127, targetNetIncome: 56, premiumPaid: 30 },
];

const SAMPLE_CSV_CONTENT = `Metric,Deal 1,Deal 2,Deal 3,Deal 4,Deal 5,Deal 6
Date,2024-03,2023-11,2023-06,2023-02,2022-09,2022-04
Acquirer,Salesforce,SAP,Adobe,Microsoft,Oracle,ServiceNow
Target,DataStream AI,CloudMetrics,FormStack Pro,PipelineIQ,VaultDB,WorkflowAI
DealValue,4800,7200,2900,10500,5600,3400
TargetRevenue,680,1100,420,1500,850,510
TargetEbitda,163,286,97,405,213,127
TargetNetIncome,75,132,42,195,94,56
PremiumPaid,35,28,40,32,25,30`;

const EMPTY_TXN: Omit<TransactionData, 'id'> = {
  included: true,
  date: '',
  acquirer: '',
  target: '',
  dealValue: 0,
  targetRevenue: 0,
  targetEbitda: 0,
  targetNetIncome: 0,
  premiumPaid: 0,
};

let _txnIdCounter = 100;
const nextTxnId = () => `txn_${++_txnIdCounter}`;

const metricDefinitions: Record<string, string> = {
  "Precedent Transactions": "Valuation based on prices paid for similar companies in past M&A deals. Includes control premiums not present in trading multiples.",
  "Deal Value (EV)": "Total enterprise value of the transaction, including equity + assumed debt − cash. Represents what the acquirer effectively paid.",
  "EV/Revenue": "Deal Value ÷ Target Revenue. Key multiple for SaaS and high-growth acquisitions.",
  "EV/EBITDA": "Deal Value ÷ Target EBITDA. Primary multiple for mature company acquisitions.",
  "Control Premium": "The premium paid above the target's pre-deal trading price. Typically 20–40% for public targets.",
  "LTM (Last Twelve Months)": "Financial metrics for the 12-month period ending just before the deal. Standard basis for transaction multiples.",
  "Implied Valuation": "Applying median transaction multiples to the subject company's financials to estimate its acquisition value.",
  "Football Field": "Visualization showing the range of implied valuations from different transaction multiples.",
  "Median vs Mean": "Median is preferred as it's less affected by outlier deals (e.g., bidding wars). Mean can be skewed by extreme premiums.",
  "Synergies": "Expected cost savings or revenue gains post-acquisition. Higher synergy expectations can justify higher multiples, but are excluded from this analysis.",
};


// ═══════════════════════════════════════════════════════════════════════════════
// DATA PARSER — Fixed format: rows=Metric, cols=Deal
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeMetricName(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(METRIC_ALIASES)) {
    if (cleaned === canonical.toLowerCase() || aliases.includes(cleaned)) return canonical;
  }
  return null;
}

function parseTxnData(rawData: Record<string, any>[]): ParsedTxnData {
  if (!rawData || rawData.length === 0) throw new Error("Empty data");

  const firstRow = rawData[0];
  const keys = Object.keys(firstRow);

  // Find metric column
  let metricCol: string | null = null;
  for (const key of keys) {
    const val = String(firstRow[key] ?? '').trim().toLowerCase();
    // Metric column contains known metric labels
    if (normalizeMetricName(val) !== null) { metricCol = key; break; }
  }
  // Fallback: first column
  if (!metricCol) metricCol = keys[0];

  const dealCols = keys.filter(k => k !== metricCol);
  if (dealCols.length === 0) throw new Error("No deal columns found.");

  const metrics: Record<string, (string | number | null)[]> = {};
  const unmapped: string[] = [];

  for (const row of rawData) {
    const rawLabel = String(row[metricCol!] ?? '').trim();
    if (!rawLabel) continue;
    const canonical = normalizeMetricName(rawLabel);
    if (!canonical) { unmapped.push(rawLabel); continue; }

    const values = dealCols.map(c => {
      const v = row[c];
      if (v == null || v === '') return null;
      const num = Number(v);
      return isNaN(num) ? String(v) : num;
    });
    metrics[canonical] = values;
  }

  if (!metrics.DealValue) throw new Error("DealValue row is required.");

  return { transactions: dealCols, metrics, unmapped };
}

function buildTransactions(parsed: ParsedTxnData): TransactionData[] {
  const { transactions: deals, metrics: m } = parsed;
  return deals.map((_, i) => ({
    id: nextTxnId(),
    included: true,
    date:           String(m.Date?.[i] ?? ''),
    acquirer:       String(m.Acquirer?.[i] ?? ''),
    target:         String(m.Target?.[i] ?? `Deal ${i + 1}`),
    dealValue:      Number(m.DealValue?.[i] ?? 0),
    targetRevenue:  Number(m.TargetRevenue?.[i] ?? 0),
    targetEbitda:   Number(m.TargetEbitda?.[i] ?? 0),
    targetNetIncome:Number(m.TargetNetIncome?.[i] ?? 0),
    premiumPaid:    Number(m.PremiumPaid?.[i] ?? 0),
  }));
}


// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function computeTxnMultiples(txns: TransactionData[]): TransactionMultiples[] {
  return txns.map(t => ({
    target: t.target,
    acquirer: t.acquirer,
    date: t.date,
    dealValue: t.dealValue,
    evToRevenue:    t.targetRevenue > 0 ? t.dealValue / t.targetRevenue : null,
    evToEbitda:     t.targetEbitda > 0 ? t.dealValue / t.targetEbitda : null,
    evToNetIncome:  t.targetNetIncome > 0 ? t.dealValue / t.targetNetIncome : null,
    premiumPaid:    t.premiumPaid,
    targetEbitdaMargin: t.targetRevenue > 0 ? (t.targetEbitda / t.targetRevenue) * 100 : null,
  }));
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStats(multiples: TransactionMultiples[]): TxnStats[] {
  const metrics: { key: keyof TransactionMultiples; label: string }[] = [
    { key: 'evToRevenue', label: 'EV/Revenue' },
    { key: 'evToEbitda', label: 'EV/EBITDA' },
    { key: 'evToNetIncome', label: 'EV/Net Income' },
    { key: 'premiumPaid', label: 'Premium Paid (%)' },
    { key: 'targetEbitdaMargin', label: 'Target EBITDA Margin (%)' },
  ];

  return metrics.map(({ key, label }) => {
    const vals = multiples.map(m => m[key]).filter(v => v != null && typeof v === 'number' && v > 0) as number[];
    if (vals.length === 0) return { metric: label, min: null, q1: null, median: null, mean: null, q3: null, max: null };
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      metric: label,
      min: sorted[0],
      q1: percentile(vals, 25),
      median: percentile(vals, 50),
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      q3: percentile(vals, 75),
      max: sorted[sorted.length - 1],
    };
  });
}

function computeImpliedValuations(stats: TxnStats[], target: TargetCompany): ImpliedValuation[] {
  const netDebt = target.totalDebt - target.cash;
  const results: ImpliedValuation[] = [];

  const evMultiples: { statLabel: string; targetMetric: number; name: string }[] = [
    { statLabel: 'EV/Revenue', targetMetric: target.revenue, name: 'EV/Revenue' },
    { statLabel: 'EV/EBITDA', targetMetric: target.ebitda, name: 'EV/EBITDA' },
    { statLabel: 'EV/Net Income', targetMetric: target.netIncome, name: 'EV/Net Income' },
  ];

  for (const { statLabel, targetMetric, name } of evMultiples) {
    const stat = stats.find(s => s.metric === statLabel);
    if (!stat || stat.median == null || targetMetric <= 0) continue;

    // Median
    const ev = stat.median * targetMetric;
    const equity = ev - netDebt;
    const price = target.sharesOutstanding > 0 ? equity / target.sharesOutstanding : null;
    results.push({ metric: name, multipleUsed: stat.median, multipleName: `${name} (Median)`, enterpriseValue: ev, equityValue: equity, impliedSharePrice: price });

    // Mean
    if (stat.mean != null) {
      const evM = stat.mean * targetMetric;
      const eqM = evM - netDebt;
      const prM = target.sharesOutstanding > 0 ? eqM / target.sharesOutstanding : null;
      results.push({ metric: name, multipleUsed: stat.mean, multipleName: `${name} (Mean)`, enterpriseValue: evM, equityValue: eqM, impliedSharePrice: prM });
    }
  }

  return results;
}


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null, d = 1) => {
  if (n == null || isNaN(n) || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(d)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(d)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(d)}K`;
  return n.toFixed(d);
};
const fmtC = (n: number | null, d = 2) => n == null || isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(d)}`;
const fmtP = (n: number | null, d = 1) => n == null ? '—' : `${n.toFixed(d)}%`;
const fmtX = (n: number | null, d = 1) => n == null || isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(d)}x`;


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />PTA Glossary</DialogTitle>
        <DialogDescription>Key precedent transactions terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {Object.entries(metricDefinitions).map(([t, d]) => (
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

const PTAGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Precedent Transactions Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">

          {/* What is PTA */}
          <div>
            <h3 className="font-semibold text-primary mb-2">What is Precedent Transactions Analysis?</h3>
            <p className="text-sm text-muted-foreground">Precedent Transactions Analysis (PTA) values a company based on multiples paid in comparable M&A transactions. Unlike trading comps (CCA), these multiples include a control premium — what acquirers paid above market value to gain control of the target. PTA is used in M&A advisory, fairness opinions, hostile defense, and LBO pricing.</p>
          </div>

          {/* Key Steps */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Key Steps</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Identify Comparable Deals', desc: 'Find 8–20 M&A transactions in the same industry, of similar size, ideally within the last 3–5 years.' },
                { step: '2', title: 'Gather Deal Terms', desc: 'Collect deal value (EV), target financials (Revenue, EBITDA), premium paid, deal type (cash/stock/mixed), and strategic rationale.' },
                { step: '3', title: 'Calculate Transaction Multiples', desc: 'EV/Revenue and EV/EBITDA based on target\'s LTM financials at announcement date. Adjust for one-time items.' },
                { step: '4', title: 'Analyze Statistics', desc: 'Compute median, mean, 25th/75th percentile. Filter outliers (distressed sales, bidding wars).' },
                { step: '5', title: 'Adjust for Time & Context', desc: 'Older deals may reflect different market conditions. Weight recent transactions more heavily.' },
                { step: '6', title: 'Apply to Target', desc: 'Multiply target\'s financials by transaction multiples to get implied acquisition EV. Back out equity value.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* PTA vs CCA */}
          <div>
            <h3 className="font-semibold text-primary mb-3">PTA vs CCA Comparison</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Dimension</th><th className="p-2 text-left">CCA (Trading Comps)</th><th className="p-2 text-left">PTA (Transaction Comps)</th></tr></thead>
                <tbody>
                  {[
                    ['Data Source', 'Current public market prices', 'Completed M&A deal values'],
                    ['Control Premium', 'Not included', 'Included (typically 20–40%)'],
                    ['Valuation Level', 'Minority interest (per-share)', 'Control interest (whole company)'],
                    ['Timeliness', 'Real-time market data', 'Historical (may be stale)'],
                    ['Typical Result', 'Lower valuation range', 'Higher valuation range'],
                    ['Best For', 'IPO pricing, equity research', 'M&A advisory, fairness opinions'],
                  ].map(([dim, cca, pta], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 border-r font-semibold">{dim}</td>
                      <td className="p-2 border-r text-muted-foreground">{cca}</td>
                      <td className="p-2 text-muted-foreground">{pta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Control Premium */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Understanding Control Premiums</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2 text-primary">What Drives Premiums?</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Strategic value:</strong> Synergies (cost savings, revenue uplift) justify paying more</p>
                  <p><strong>Scarcity:</strong> Few targets in the sector → competitive bidding</p>
                  <p><strong>Market conditions:</strong> Bull markets → higher premiums</p>
                  <p><strong>Deal type:</strong> Hostile takeovers typically require higher premiums</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2 text-primary">Typical Premium Ranges</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>20–30%:</strong> Friendly, strategic acquisition. Most common range.</p>
                  <p><strong>30–40%:</strong> Competitive bidding or significant synergies expected.</p>
                  <p><strong>40–50%+:</strong> Hostile bid, bidding war, or transformative deal.</p>
                  <p><strong>&lt; 15%:</strong> Possible squeeze-out, distressed target, or related-party deal.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Deal Selection Criteria */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Deal Selection Criteria</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { criterion: 'Industry Match', desc: 'Same sector and sub-sector. Business model should be comparable to target.' },
                { criterion: 'Deal Size', desc: 'Within 0.5x–3x of expected target EV. Very large or small deals have different dynamics.' },
                { criterion: 'Time Period', desc: 'Last 3–5 years preferred. Older deals reflect different market/rate environments.' },
                { criterion: 'Deal Type', desc: 'Strategic vs financial buyer. PE buyouts often at lower multiples than strategic deals.' },
                { criterion: 'Geography', desc: 'Same region preferred. Cross-border deals may include country premium/discount.' },
                { criterion: 'Completion Status', desc: 'Only completed deals. Withdrawn/failed deals signal pricing ceiling.' },
              ].map(({ criterion, desc }) => (
                <div key={criterion} className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{criterion}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Multiples */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Transaction Multiples</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Multiple</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">When to Use</th></tr></thead>
                <tbody>
                  {[
                    ['EV / Revenue', 'Deal EV ÷ LTM Revenue', 'High-growth targets, unprofitable companies, SaaS/tech deals'],
                    ['EV / EBITDA', 'Deal EV ÷ LTM EBITDA', 'Most common. Best apples-to-apples comparison across deals.'],
                    ['EV / EBIT', 'Deal EV ÷ LTM EBIT', 'When D&A policies differ significantly across targets.'],
                    ['P / E (Deal)', 'Equity Value ÷ Net Income', 'All-stock deals or when leverage is similar across deals.'],
                    ['Premium Paid', '(Offer − Undisturbed Price) ÷ Price', 'Measures control premium. Compare to 20–40% benchmark.'],
                  ].map(([m, f, w], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 border-r font-semibold">{m}</td>
                      <td className="p-2 border-r font-mono text-muted-foreground">{f}</td>
                      <td className="p-2 text-muted-foreground">{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reading the Output */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Reading the Output</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { title: 'Football Field Chart', desc: 'Valuation range from each transaction multiple. Compare PTA range to CCA range — the gap approximates the control premium.' },
                { title: 'Deal Timeline', desc: 'Scatter plot showing deal multiples over time. Rising trend suggests market heating up. Declining suggests sector cooling.' },
                { title: 'Multiple Distribution', desc: 'Histogram or box plot of transaction multiples. Tight clustering = strong consensus. Wide spread = heterogeneous deals.' },
                { title: 'Implied Valuation', desc: 'Target\'s financials × median/mean transaction multiples = implied EV. Equity Value = EV − Net Debt.' },
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
              <li>• PTA typically yields <strong>higher valuations</strong> than CCA due to control premiums. The gap is your implied premium.</li>
              <li>• Use both CCA and PTA together — the overlap zone is the most defensible valuation range.</li>
              <li>• <strong>Filter out distressed sales</strong> (fire sales at 3–5x EBITDA) and <strong>bidding wars</strong> (inflated 15x+ EBITDA) as outliers.</li>
              <li>• Weight recent transactions (last 2 years) more heavily — market conditions change deal pricing significantly.</li>
              <li>• Note the <strong>strategic vs financial buyer</strong> distinction: PE deals often close at 1–2x lower EBITDA multiples than strategic.</li>
              <li>• Upload deal data via CSV to quickly populate the transaction table. Export the comparison chart for pitch decks.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_transactions.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Required Data Format</DialogTitle>
          <DialogDescription>Prepare transaction data in this format</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">Rows = Data fields, Columns = Deals. First column is the field name.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Metric</th>
                    <th className="p-2 text-right">Deal 1</th><th className="p-2 text-right">Deal 2</th><th className="p-2 text-right">Deal 3</th>
                  </tr></thead>
                  <tbody>
                    {[['Date','2024-03','2023-11','2023-06'],['Acquirer','Salesforce','SAP','Adobe'],['Target','DataStream','CloudMetrics','FormStack'],['DealValue','4800','7200','2900'],['TargetRevenue','680','1100','420'],['TargetEbitda','163','286','97'],['TargetNetIncome','75','132','42'],['PremiumPaid','35','28','40']].map(([m,...vs],i)=>(
                      <tr key={i} className={i%2?'bg-muted/20':''}><td className="p-2 font-semibold border-r">{m}</td>{vs.map((v,j)=><td key={j} className="p-2 text-right">{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Accepted Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'DealValue', required: true, aliases: 'Deal Value, Transaction Value, EV' },
                  { name: 'TargetRevenue', required: false, aliases: 'Revenue, Sales, LTM Revenue' },
                  { name: 'TargetEbitda', required: false, aliases: 'EBITDA, LTM EBITDA' },
                  { name: 'Date', required: false, aliases: 'Deal Date, Announcement Date, Year' },
                  { name: 'Acquirer', required: false, aliases: 'Buyer, Acquiring Company' },
                  { name: 'Target', required: false, aliases: 'Target Company, Seller' },
                  { name: 'TargetNetIncome', required: false, aliases: 'Net Income, Earnings' },
                  { name: 'PremiumPaid', required: false, aliases: 'Premium, Control Premium, Offer Premium' },
                ].map(({ name, required, aliases }) => (
                  <div key={name} className={`p-2.5 rounded-lg border text-sm ${required ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{name}</span>
                      {required && <Badge variant="default" className="text-[10px] px-1.5 py-0">Required</Badge>}
                    </div>
                    {aliases && <p className="text-xs text-muted-foreground mt-0.5">Also: {aliases}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-600" />Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• <strong>DealValue is required.</strong> Include TargetRevenue and TargetEbitda for meaningful multiples.</li>
                <li>• Use LTM (Last Twelve Months) financials at the time of the deal announcement.</li>
                <li>• Deals within the last 3–5 years in the same industry are most relevant.</li>
                <li>• Premium Paid is optional — enter 0 or leave blank if unknown.</li>
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

const IntroPage = ({ onStartWithData, onStartManual, hasUploadedData, parseError }: {
  onStartWithData: () => void; onStartManual: () => void; hasUploadedData: boolean; parseError: string | null;
}) => {
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Handshake className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Precedent Transactions Analysis</CardTitle>
          <CardDescription className="text-base mt-2">Valuation based on prices paid in comparable M&A deals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Handshake, title: 'M&A Multiples', desc: 'EV/Revenue, EV/EBITDA from past deals' },
              { icon: Tag, title: 'Control Premium', desc: 'Premium paid over pre-deal market price' },
              { icon: Target, title: 'Implied Value', desc: 'Apply deal multiples to target company' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Upload */}
            <Card className={`border-2 transition-all ${hasUploadedData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasUploadedData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Upload Transaction Data</CardTitle><CardDescription className="text-xs">Past M&A deal information</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected</span></div>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Analyze Uploaded Deals</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with past M&A transaction data.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Acquirer | Target | Date | EV | Revenue | EBITDA</p>
                      <p className="text-muted-foreground">e.g. BigCo, SmallCo, 2024-03, 2500, 800, 200</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Format:</p>
                      <p>Metric | Deal 1 | Deal 2 | ...</p>
                      <p className="text-muted-foreground">DealValue, TargetRevenue, Acquirer, ...</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>
                    {parseError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground text-center">Upload your data file first, then come back here</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Manual */}
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Manual Input</CardTitle><CardDescription className="text-xs">Enter deals manually</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Start with 6 sample SaaS M&A deals and edit, add, or remove as needed.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5" />6 SaaS acquisitions pre-loaded</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5" />Toggle deals in/out of analysis</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5" />Add, remove, or edit any deal</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Sample Deals</Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">PTA values typically exceed trading comps (CCA) because they include a control premium. Compare both for a complete picture.</p>
          </div>
        </CardContent>
      </Card>
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY CARDS
// ═══════════════════════════════════════════════════════════════════════════════

const SummaryCards = ({ stats, txnCount }: { stats: TxnStats[]; txnCount: number }) => {
  const evEbitda = stats.find(s => s.metric === 'EV/EBITDA');
  const evRev = stats.find(s => s.metric === 'EV/Revenue');
  const evNI = stats.find(s => s.metric === 'EV/Net Income');
  const premium = stats.find(s => s.metric === 'Premium Paid (%)');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {[
        { label: 'Transactions', value: `${txnCount}`, sub: 'Comparable deals', icon: Handshake },
        { label: 'EV/EBITDA (Med)', value: fmtX(evEbitda?.median ?? null), sub: `Range: ${fmtX(evEbitda?.min??null)}–${fmtX(evEbitda?.max??null)}`, icon: Activity },
        { label: 'EV/Revenue (Med)', value: fmtX(evRev?.median ?? null), sub: `Range: ${fmtX(evRev?.min??null)}–${fmtX(evRev?.max??null)}`, icon: TrendingUp },
        { label: 'EV/NI (Med)', value: fmtX(evNI?.median ?? null), sub: `Range: ${fmtX(evNI?.min??null)}–${fmtX(evNI?.max??null)}`, icon: DollarSign },
        { label: 'Avg Premium', value: fmtP(premium?.mean ?? null), sub: `Med: ${fmtP(premium?.median??null)}`, icon: Tag },
      ].map(({ label, value, sub, icon: Icon }) => (
        <Card key={label}><CardContent className="p-6"><div className="space-y-2">
          <div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div></CardContent></Card>
      ))}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function PTAPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: PTAPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Data
  const [parsedData, setParsedData] = useState<ParsedTxnData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [target, setTarget] = useState<TargetCompany>(DEFAULT_TARGET);

  // Parse uploaded data
  useEffect(() => {
    if (!data || data.length === 0) { setParsedData(null); setParseError(null); return; }
    try {
      const parsed = parseTxnData(data);
      setParsedData(parsed);
      setParseError(null);
    } catch (err: any) {
      setParseError(err.message);
      setParsedData(null);
    }
  }, [data]);

  const loadFromParsed = useCallback(() => {
    if (!parsedData) return;
    setTransactions(buildTransactions(parsedData));
  }, [parsedData]);

  const loadSampleData = useCallback(() => {
    setTransactions([...SAMPLE_TRANSACTIONS]);
  }, []);

  // ─── Transaction management ────────────────────────────────────────────
  const toggleTxn = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, included: !t.included } : t));
  };
  const removeTxn = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  const addTxn = () => {
    setTransactions(prev => [...prev, { ...EMPTY_TXN, id: nextTxnId() }]);
  };
  const updateTxn = (id: string, field: keyof TransactionData, value: string | number | boolean) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // ─── Computed ──────────────────────────────────────────────────────────
  const includedTxns = useMemo(() => transactions.filter(t => t.included), [transactions]);
  const multiples = useMemo(() => computeTxnMultiples(includedTxns), [includedTxns]);
  const stats = useMemo(() => computeStats(multiples), [multiples]);
  const valuations = useMemo(() => computeImpliedValuations(stats, target), [stats, target]);

  const footballData = useMemo(() => {
    return valuations.filter(v => v.multipleName.includes('Median') && v.impliedSharePrice != null)
      .map(v => ({ name: v.metric, price: v.impliedSharePrice! }));
  }, [valuations]);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `PTA_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  const handleDownloadCSV = useCallback(() => {
    let csv = "PRECEDENT TRANSACTIONS ANALYSIS\n\n";
    csv += "TRANSACTION MULTIPLES\n";
    csv += Papa.unparse(multiples.map(m => ({
      Target: m.target, Acquirer: m.acquirer, Date: m.date,
      'Deal Value': m.dealValue, 'EV/Revenue': m.evToRevenue?.toFixed(2) ?? '',
      'EV/EBITDA': m.evToEbitda?.toFixed(2) ?? '', 'Premium': `${m.premiumPaid}%`,
    }))) + "\n\n";
    csv += "STATISTICS\n";
    csv += Papa.unparse(stats.map(s => ({
      Metric: s.metric, Min: s.min?.toFixed(2) ?? '', Median: s.median?.toFixed(2) ?? '',
      Mean: s.mean?.toFixed(2) ?? '', Max: s.max?.toFixed(2) ?? '',
    }))) + "\n\n";
    csv += "IMPLIED VALUATION\n";
    csv += Papa.unparse(valuations.map(v => ({
      Method: v.multipleName, Multiple: v.multipleUsed.toFixed(2),
      EV: v.enterpriseValue?.toFixed(0) ?? '', Equity: v.equityValue?.toFixed(0) ?? '',
      'Implied Price': v.impliedSharePrice?.toFixed(2) ?? '',
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PTA_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [multiples, stats, valuations, toast]);

  // Intro
  if (showIntro) return (
    <IntroPage
      hasUploadedData={!!parsedData}
      parseError={parseError}
      onStartWithData={() => { loadFromParsed(); setShowIntro(false); }}
      onStartManual={() => { loadSampleData(); setShowIntro(false); }}
    />
  );

  const validPrices = valuations.filter(v => v.impliedSharePrice != null && v.multipleName.includes('Median')).map(v => v.impliedSharePrice!);
  const priceRange = validPrices.length >= 2 ? { low: Math.min(...validPrices), high: Math.max(...validPrices), mid: validPrices.reduce((a, b) => a + b, 0) / validPrices.length } : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Precedent Transactions Analysis</h1><p className="text-muted-foreground mt-1">M&A-based relative valuation</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <PTAGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Target Company ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="w-6 h-6 text-primary" /></div>
            <div><CardTitle>Target Company</CardTitle><CardDescription>Company being valued for potential acquisition</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ['name', 'Company Name', 'text'],
              ['revenue', 'LTM Revenue ($M)', 'number'],
              ['ebitda', 'LTM EBITDA ($M)', 'number'],
              ['netIncome', 'LTM Net Income ($M)', 'number'],
              ['totalDebt', 'Total Debt ($M)', 'number'],
              ['cash', 'Cash ($M)', 'number'],
              ['sharesOutstanding', 'Shares (M)', 'number'],
            ] as const).map(([key, label, type]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium">{label}</Label>
                <Input
                  type={type}
                  value={(target as any)[key]}
                  onChange={e => setTarget(prev => ({ ...prev, [key]: type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value }))}
                  className="h-9 text-sm font-mono text-right"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ Transaction Management ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Handshake className="w-6 h-6 text-primary" /></div>
              <div>
                <CardTitle>Precedent Transactions</CardTitle>
                <CardDescription>{includedTxns.length} of {transactions.length} deals included in analysis</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {transactions.length > 0 && (
                <Button onClick={() => setTransactions([])} size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />Clear All
                </Button>
              )}
              <Button onClick={addTxn} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />Add Deal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Use</TableHead>
                  <TableHead className="min-w-[90px]">Date</TableHead>
                  <TableHead className="min-w-[120px]">Acquirer</TableHead>
                  <TableHead className="min-w-[120px]">Target</TableHead>
                  <TableHead className="text-right">Deal Value</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Net Inc</TableHead>
                  <TableHead className="text-right">Premium %</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id} className={!t.included ? 'opacity-40' : ''}>
                    <TableCell>
                      <button
                        onClick={() => toggleTxn(t.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${t.included ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}
                      >
                        {t.included && <Check className="w-3 h-3" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Input value={t.date} onChange={e => updateTxn(t.id, 'date', e.target.value)} className="h-8 text-sm border-0 bg-transparent p-0 w-24 focus-visible:ring-1" placeholder="YYYY-MM" />
                    </TableCell>
                    <TableCell>
                      <Input value={t.acquirer} onChange={e => updateTxn(t.id, 'acquirer', e.target.value)} className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-1" />
                    </TableCell>
                    <TableCell>
                      <Input value={t.target} onChange={e => updateTxn(t.id, 'target', e.target.value)} className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-1" />
                    </TableCell>
                    {(['dealValue', 'targetRevenue', 'targetEbitda', 'targetNetIncome', 'premiumPaid'] as const).map(field => (
                      <TableCell key={field} className="text-right">
                        <Input
                          type="number"
                          value={t[field]}
                          onChange={e => updateTxn(t.id, field, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm font-mono text-right border-0 bg-transparent p-0 w-20 focus-visible:ring-1"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeTxn(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="space-y-3">
                        <Handshake className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No transactions yet</p>
                        <Button onClick={addTxn} size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Add Deal</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {transactions.length > 0 && includedTxns.length === 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No transactions included</AlertTitle>
              <AlertDescription>Enable at least one deal to run the analysis.</AlertDescription>
            </Alert>
          )}
          {transactions.length > 0 && <p className="text-xs text-muted-foreground mt-3">Click values to edit inline. Uncheck to exclude from analysis without deleting.</p>}
        </CardContent>
      </Card>

      {/* ══ Summary ══ */}
      {includedTxns.length > 0 ? (<>
      {/* ══ Detailed Output ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Detailed Analysis</h2><p className="text-sm text-muted-foreground">Full transaction multiples and statistics</p></div>
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
          <h2 className="text-2xl font-bold">Precedent Transactions Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Target: {target.name} | Deals: {includedTxns.length} transactions | {new Date().toLocaleDateString()}</p>
        </div>

        <SummaryCards stats={stats} txnCount={includedTxns.length} />

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Valuation Summary</CardTitle><CardDescription>Implied acquisition value from precedent transaction multiples</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {priceRange && (
              <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Transaction comps imply a <strong>share price range of {fmtC(priceRange.low)} – {fmtC(priceRange.high)}</strong> for {target.name}, with a midpoint of {fmtC(priceRange.mid)}.</p></div>
                  <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Based on {includedTxns.length} precedent deals. Median EV/EBITDA: {fmtX(stats.find(s => s.metric === 'EV/EBITDA')?.median ?? null)}, Median EV/Revenue: {fmtX(stats.find(s => s.metric === 'EV/Revenue')?.median ?? null)}.</p></div>
                  <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Average control premium: {fmtP(stats.find(s => s.metric === 'Premium Paid (%)')?.mean ?? null)}. These multiples include premiums paid to gain control.</p></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Football Field */}
        {footballData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Implied Share Price — Football Field</CardTitle><CardDescription>Range of implied valuations by methodology</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={footballData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Implied Price']} />
                    <Bar dataKey="price" radius={[0, 6, 6, 0]}>
                      {footballData.map((_, i) => <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />)}
                    </Bar>
                    {priceRange && <ReferenceLine x={priceRange.mid} stroke={COLORS.highlight} strokeDasharray="5 5" label={{ value: `Mid: $${priceRange.mid.toFixed(0)}`, position: 'top', fill: COLORS.highlight, fontSize: 11 }} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Multiples */}
        <Card>
          <CardHeader><CardTitle>Transaction Multiples</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Acquirer → Target</TableHead>
                    <TableHead className="text-right">Deal Value</TableHead>
                    <TableHead className="text-right">EV/Revenue</TableHead><TableHead className="text-right">EV/EBITDA</TableHead>
                    <TableHead className="text-right">EV/NI</TableHead>
                    <TableHead className="text-right">Premium</TableHead><TableHead className="text-right">EBITDA Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {multiples.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{m.date}</TableCell>
                      <TableCell className="font-medium"><span className="text-muted-foreground">{m.acquirer}</span> → {m.target}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(m.dealValue)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtX(m.evToRevenue)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtX(m.evToEbitda)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtX(m.evToNetIncome)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtP(m.premiumPaid)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtP(m.targetEbitdaMargin)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* EV/EBITDA chart */}
        <Card>
          <CardHeader><CardTitle>Deal EV/EBITDA by Transaction</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={multiples.filter(m => m.evToEbitda != null).map(m => ({ name: m.target, value: m.evToEbitda, premium: m.premiumPaid }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tickFormatter={v => `${v}x`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="value" name="EV/EBITDA" radius={[6, 6, 0, 0]}>
                    {multiples.filter(m => m.evToEbitda != null).map((_, i) => <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />)}
                  </Bar>
                  <Line yAxisId="right" dataKey="premium" name="Premium %" stroke={COLORS.highlight} strokeWidth={2} dot={{ r: 4 }} />
                  {stats.find(s => s.metric === 'EV/EBITDA')?.median != null && (
                    <ReferenceLine yAxisId="left" y={stats.find(s => s.metric === 'EV/EBITDA')!.median!} stroke={COLORS.negative} strokeDasharray="5 5" label={{ value: `Med: ${stats.find(s => s.metric === 'EV/EBITDA')!.median!.toFixed(1)}x`, position: 'right', fill: COLORS.negative, fontSize: 11 }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader><CardTitle>Summary Statistics</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Min</TableHead><TableHead className="text-right">Q1</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Q3</TableHead><TableHead className="text-right">Max</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {stats.map(s => (
                  <TableRow key={s.metric}>
                    <TableCell className="font-medium">{s.metric}</TableCell>
                    <TableCell className="text-right font-mono">{s.metric.includes('%') ? fmtP(s.min) : fmtX(s.min)}</TableCell>
                    <TableCell className="text-right font-mono">{s.metric.includes('%') ? fmtP(s.q1) : fmtX(s.q1)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">{s.metric.includes('%') ? fmtP(s.median) : fmtX(s.median)}</TableCell>
                    <TableCell className="text-right font-mono">{s.metric.includes('%') ? fmtP(s.mean) : fmtX(s.mean)}</TableCell>
                    <TableCell className="text-right font-mono">{s.metric.includes('%') ? fmtP(s.q3) : fmtX(s.q3)}</TableCell>
                    <TableCell className="text-right font-mono">{s.metric.includes('%') ? fmtP(s.max) : fmtX(s.max)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Implied Valuation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Implied Valuation — {target.name}<Badge variant="outline" className="text-xs">Median & Mean</Badge></CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Method</TableHead><TableHead className="text-right">Multiple</TableHead><TableHead className="text-right">EV ($M)</TableHead><TableHead className="text-right">Equity ($M)</TableHead><TableHead className="text-right">Implied Price</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {valuations.map((v, i) => (
                  <TableRow key={i} className={v.multipleName.includes('Median') ? 'bg-primary/5 font-semibold' : ''}>
                    <TableCell className="font-medium">
                      {v.multipleName}
                      {v.multipleName.includes('Median') && <Badge variant="default" className="ml-2 text-[10px]">Preferred</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{v.multipleUsed.toFixed(2)}x</TableCell>
                    <TableCell className="text-right font-mono">{fmt(v.enterpriseValue)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(v.equityValue)}</TableCell>
                    <TableCell className={`text-right font-mono ${v.multipleName.includes('Median') ? 'text-primary font-bold' : ''}`}>{fmtC(v.impliedSharePrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Precedent Transactions Analysis</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A precedent transactions analysis was conducted using {includedTxns.length} comparable M&A deals
                  {includedTxns.length > 0 && ` spanning ${includedTxns[includedTxns.length - 1]?.date || '?'} to ${includedTxns[0]?.date || '?'}`}
                  {' '}to derive implied acquisition multiples for {target.name}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Median transaction multiples are: EV/EBITDA {fmtX(stats.find(s=>s.metric==='EV/EBITDA')?.median??null)}, EV/Revenue {fmtX(stats.find(s=>s.metric==='EV/Revenue')?.median??null)}, EV/Net Income {fmtX(stats.find(s=>s.metric==='EV/Net Income')?.median??null)}.
                  The average control premium paid was {fmtP(stats.find(s=>s.metric==='Premium Paid (%)')?.mean??null)}.
                </p>
                {priceRange && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Applying median transaction multiples to {target.name}&apos;s LTM financials (Revenue: {fmt(target.revenue)}, EBITDA: {fmt(target.ebitda)}) yields an <strong>implied share price range of {fmtC(priceRange.low)} – {fmtC(priceRange.high)}</strong>, with a midpoint of <strong>{fmtC(priceRange.mid)}</strong>.
                  </p>
                )}
                <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> Transaction multiples include control premiums and may reflect synergy expectations. They typically exceed trading multiples (CCA). Cross-reference with CCA and DCF for a comprehensive valuation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </>) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Add transactions above to see the analysis results.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top
        </Button>
      </div>
    </div>
  );
}
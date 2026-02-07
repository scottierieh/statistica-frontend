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
  Sparkles, Info, HelpCircle, BarChart as BarChartIcon,
  CheckCircle, AlertTriangle, Calculator, Percent, Building2,
  PieChart, Activity, Shield, Lightbulb, ChevronRight, Database,
  Upload, Table as TableIcon, ArrowRight, RefreshCw, XCircle,
  Check, CheckCircle2, TrendingDown, Users, GitCompare, Minus,
  ArrowUpDown, BarChart3, Scale, Plus, Trash2, Eye, EyeOff
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
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
  ResponsiveContainer, Cell, ReferenceLine, ScatterChart, Scatter,
  ComposedChart, Line
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CompanyData {
  id: string;
  name: string;
  included: boolean;
  marketCap: number;
  sharePrice: number;
  sharesOutstanding: number;
  totalDebt: number;
  cash: number;
  revenue: number;
  ebitda: number;
  netIncome: number;
  bookValue: number;
}

interface CompanyMultiples {
  name: string;
  ev: number;
  evToRevenue: number | null;
  evToEbitda: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  netMargin: number | null;
  ebitdaMargin: number | null;
}

interface CompsStats {
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
  bookValue: number;
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

interface ParsedCompsData {
  companies: string[];
  metrics: Record<string, (number | null)[]>;
  unmapped: string[];
}

interface CCAPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const METRIC_ALIASES: Record<string, string[]> = {
  MarketCap:         ["marketcap", "market cap", "market capitalization", "mkt cap"],
  SharePrice:        ["shareprice", "share price", "stock price", "price"],
  SharesOutstanding: ["sharesoutstanding", "shares outstanding", "shares", "diluted shares"],
  TotalDebt:         ["totaldebt", "total debt", "debt", "long term debt"],
  Cash:              ["cash", "cash and equivalents", "cash & equivalents", "cash and cash equivalents"],
  Revenue:           ["revenue", "sales", "turnover", "total revenue", "net revenue"],
  EBITDA:            ["ebitda"],
  NetIncome:         ["netincome", "net income", "net profit", "net earnings", "earnings"],
  BookValue:         ["bookvalue", "book value", "shareholders equity", "total equity", "equity"],
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
  bookValue: 380,
  totalDebt: 150,
  cash: 200,
  sharesOutstanding: 85,
};

const metricDefinitions: Record<string, string> = {
  "Comparable Company Analysis": "A relative valuation method that values a company by comparing its financial multiples to those of similar public companies.",
  "Enterprise Value (EV)": "Market Cap + Total Debt − Cash. Represents the total value of a company's operations to all capital providers.",
  "EV/Revenue": "Enterprise Value ÷ Revenue. Useful for high-growth or unprofitable companies. Lower values may indicate undervaluation.",
  "EV/EBITDA": "Enterprise Value ÷ EBITDA. The most widely used comparable multiple. Adjusts for capital structure and tax differences.",
  "P/E Ratio": "Share Price ÷ Earnings Per Share (or Market Cap ÷ Net Income). Reflects how much investors pay per dollar of earnings.",
  "P/B Ratio": "Market Cap ÷ Book Value. Compares market valuation to accounting value. Below 1.0 may indicate undervaluation.",
  "EBITDA Margin": "EBITDA ÷ Revenue × 100. Measures operating profitability before non-cash charges and financing.",
  "Net Margin": "Net Income ÷ Revenue × 100. Bottom-line profitability after all expenses.",
  "Median vs Mean": "Median is preferred for comps analysis as it's less sensitive to outliers. Mean can be skewed by extreme values.",
  "Implied Valuation": "Applying the peer group's median multiple to the target company's financial metric to estimate its fair value.",
  "Football Field": "A visualization showing the range of implied valuations from different methodologies and multiples.",
};

const SAMPLE_CSV_CONTENT = `Metric,DataForge,NetSuite Pro,PipelineHQ,Vaultix,Metrica AI
MarketCap,5200,8400,3600,12000,6800
SharePrice,52.00,105.00,36.00,120.00,68.00
SharesOutstanding,100,80,100,100,100
TotalDebt,400,600,300,1000,500
Cash,500,700,250,1200,600
Revenue,1400,2200,950,3500,1800
EBITDA,350,572,209,980,486
NetIncome,168,286,95,525,234
BookValue,800,1400,500,2500,1100`;

const EMPTY_COMPANY: Omit<CompanyData, 'id'> = {
  name: '',
  included: true,
  marketCap: 0,
  sharePrice: 0,
  sharesOutstanding: 0,
  totalDebt: 0,
  cash: 0,
  revenue: 0,
  ebitda: 0,
  netIncome: 0,
  bookValue: 0,
};

let _companyIdCounter = 0;
const nextCompanyId = () => `comp_${++_companyIdCounter}`;


// ═══════════════════════════════════════════════════════════════════════════════
// DATA PARSER — Fixed format: rows=Metric, cols=Company
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeMetricName(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(METRIC_ALIASES)) {
    if (cleaned === canonical.toLowerCase() || aliases.includes(cleaned)) return canonical;
  }
  return null;
}

function parseCompsData(rawData: Record<string, any>[]): ParsedCompsData {
  if (!rawData || rawData.length === 0) throw new Error("Empty data");

  const firstRow = rawData[0];
  const keys = Object.keys(firstRow);

  // Find metric column (first non-numeric)
  let metricCol: string | null = null;
  for (const key of keys) {
    const val = String(firstRow[key] ?? '').trim();
    if (isNaN(Number(val)) && val !== '') { metricCol = key; break; }
  }
  if (!metricCol) throw new Error("Cannot find metric label column.");

  // Company columns = everything else
  const compCols = keys.filter(k => k !== metricCol);
  if (compCols.length === 0) throw new Error("No company columns found.");

  const metrics: Record<string, (number | null)[]> = {};
  const unmapped: string[] = [];

  for (const row of rawData) {
    const rawLabel = String(row[metricCol!] ?? '').trim();
    if (!rawLabel) continue;
    const canonical = normalizeMetricName(rawLabel);
    if (!canonical) { unmapped.push(rawLabel); continue; }
    const values = compCols.map(c => {
      const v = Number(row[c]);
      return isNaN(v) ? null : v;
    });
    metrics[canonical] = values;
  }

  if (!metrics.Revenue) throw new Error("Revenue row is required.");

  return { companies: compCols, metrics, unmapped };
}

function buildCompanyData(parsed: ParsedCompsData): CompanyData[] {
  const { companies, metrics: m } = parsed;
  return companies.map((name, i) => ({
    id: nextCompanyId(),
    name,
    included: true,
    marketCap:         m.MarketCap?.[i] ?? 0,
    sharePrice:        m.SharePrice?.[i] ?? 0,
    sharesOutstanding: m.SharesOutstanding?.[i] ?? (m.MarketCap?.[i] && m.SharePrice?.[i] ? m.MarketCap[i]! / m.SharePrice[i]! : 0),
    totalDebt:         m.TotalDebt?.[i] ?? 0,
    cash:              m.Cash?.[i] ?? 0,
    revenue:           m.Revenue?.[i] ?? 0,
    ebitda:            m.EBITDA?.[i] ?? 0,
    netIncome:         m.NetIncome?.[i] ?? 0,
    bookValue:         m.BookValue?.[i] ?? 0,
  }));
}

function computeMultiples(companies: CompanyData[]): CompanyMultiples[] {
  return companies.map(c => {
    const ev = c.marketCap + c.totalDebt - c.cash;
    return {
      name: c.name,
      ev,
      evToRevenue:  c.revenue > 0 ? ev / c.revenue : null,
      evToEbitda:   c.ebitda > 0 ? ev / c.ebitda : null,
      peRatio:      c.netIncome > 0 ? c.marketCap / c.netIncome : null,
      pbRatio:      c.bookValue > 0 ? c.marketCap / c.bookValue : null,
      netMargin:    c.revenue > 0 ? (c.netIncome / c.revenue) * 100 : null,
      ebitdaMargin: c.revenue > 0 ? (c.ebitda / c.revenue) * 100 : null,
    };
  });
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStats(multiples: CompanyMultiples[]): CompsStats[] {
  const metrics: { key: keyof CompanyMultiples; label: string }[] = [
    { key: 'evToRevenue', label: 'EV/Revenue' },
    { key: 'evToEbitda', label: 'EV/EBITDA' },
    { key: 'peRatio', label: 'P/E' },
    { key: 'pbRatio', label: 'P/B' },
    { key: 'ebitdaMargin', label: 'EBITDA Margin (%)' },
    { key: 'netMargin', label: 'Net Margin (%)' },
  ];

  return metrics.map(({ key, label }) => {
    const vals = multiples.map(m => m[key]).filter(v => v != null) as number[];
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

function computeImpliedValuations(
  stats: CompsStats[],
  target: TargetCompany
): ImpliedValuation[] {
  const netDebt = target.totalDebt - target.cash;
  const results: ImpliedValuation[] = [];

  // EV-based multiples
  const evMultiples: { statLabel: string; targetMetric: number; name: string }[] = [
    { statLabel: 'EV/Revenue', targetMetric: target.revenue, name: 'EV/Revenue' },
    { statLabel: 'EV/EBITDA', targetMetric: target.ebitda, name: 'EV/EBITDA' },
  ];

  for (const { statLabel, targetMetric, name } of evMultiples) {
    const stat = stats.find(s => s.metric === statLabel);
    if (!stat || stat.median == null || targetMetric <= 0) continue;
    const ev = stat.median * targetMetric;
    const equity = ev - netDebt;
    const price = target.sharesOutstanding > 0 ? equity / target.sharesOutstanding : null;
    results.push({ metric: name, multipleUsed: stat.median, multipleName: `${name} (Median)`, enterpriseValue: ev, equityValue: equity, impliedSharePrice: price });

    // Also mean
    if (stat.mean != null) {
      const evM = stat.mean * targetMetric;
      const eqM = evM - netDebt;
      const prM = target.sharesOutstanding > 0 ? eqM / target.sharesOutstanding : null;
      results.push({ metric: name, multipleUsed: stat.mean, multipleName: `${name} (Mean)`, enterpriseValue: evM, equityValue: eqM, impliedSharePrice: prM });
    }
  }

  // Equity-based multiples
  const eqMultiples: { statLabel: string; targetMetric: number; name: string }[] = [
    { statLabel: 'P/E', targetMetric: target.netIncome, name: 'P/E' },
    { statLabel: 'P/B', targetMetric: target.bookValue, name: 'P/B' },
  ];

  for (const { statLabel, targetMetric, name } of eqMultiples) {
    const stat = stats.find(s => s.metric === statLabel);
    if (!stat || stat.median == null || targetMetric <= 0) continue;
    const equity = stat.median * targetMetric;
    const ev = equity + netDebt;
    const price = target.sharesOutstanding > 0 ? equity / target.sharesOutstanding : null;
    results.push({ metric: name, multipleUsed: stat.median, multipleName: `${name} (Median)`, enterpriseValue: ev, equityValue: equity, impliedSharePrice: price });

    if (stat.mean != null) {
      const eqM = stat.mean * targetMetric;
      const evM = eqM + netDebt;
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
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />CCA Glossary</DialogTitle>
        <DialogDescription>Key comparable company analysis terms</DialogDescription>
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

const CCAGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Comparable Company Analysis Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">

          {/* What is CCA */}
          <div>
            <h3 className="font-semibold text-primary mb-2">What is Comparable Company Analysis?</h3>
            <p className="text-sm text-muted-foreground">Comparable Company Analysis (Comps) values a company by comparing its financial multiples to a peer group of similar publicly traded companies. It is the most common relative valuation method in investment banking, used for IPO pricing, M&A advisory, fairness opinions, and equity research. Unlike DCF (intrinsic valuation), comps derive value from what the market currently pays for similar businesses.</p>
          </div>

          {/* Key Steps */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Key Steps</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Select Peer Group', desc: 'Choose 5–15 comparable companies in the same industry, of similar size, growth profile, and business model. Avoid mixing different sectors.' },
                { step: '2', title: 'Gather Financial Data', desc: 'Collect Market Cap, Total Debt, Cash, Revenue, EBITDA, Net Income, Book Value, and share counts for each peer.' },
                { step: '3', title: 'Calculate Enterprise Value', desc: 'EV = Market Cap + Total Debt − Cash. This gives a capital-structure-neutral measure of company value.' },
                { step: '4', title: 'Compute Trading Multiples', desc: 'Calculate EV/Revenue, EV/EBITDA, P/E, P/B for each peer. These are the "comparable" multiples.' },
                { step: '5', title: 'Analyze Statistics', desc: 'Compute median, mean, 25th/75th percentile. Median is preferred — less distorted by outliers.' },
                { step: '6', title: 'Apply to Target', desc: 'Multiply target\'s financials by peer multiples to get implied EV. Back out equity value: EV − Debt + Cash.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Multiples */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Key Valuation Multiples</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Multiple</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Typical Range</th><th className="p-2 text-left">Best For</th></tr></thead>
                <tbody>
                  {[
                    ['EV / Revenue', 'Enterprise Value ÷ Revenue', '1–5x', 'High-growth or unprofitable companies (SaaS, biotech)'],
                    ['EV / EBITDA', 'Enterprise Value ÷ EBITDA', '8–12x', 'Most common. Capital-structure neutral. Mature businesses.'],
                    ['P / E', 'Share Price ÷ EPS', '15–25x', 'Earnings-based. Affected by leverage and tax rate.'],
                    ['P / B', 'Share Price ÷ Book Value/Share', '1–3x', 'Asset-heavy industries (banks, REITs, industrials).'],
                    ['EV / EBIT', 'Enterprise Value ÷ EBIT', '10–15x', 'When D&A differs significantly across peers.'],
                    ['PEG', 'P/E ÷ EPS Growth Rate', '1–2x', 'Growth-adjusted earnings. PEG < 1 may signal undervaluation.'],
                  ].map(([m, f, r, b], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 border-r font-semibold">{m}</td>
                      <td className="p-2 border-r font-mono text-muted-foreground">{f}</td>
                      <td className="p-2 border-r">{r}</td>
                      <td className="p-2 text-muted-foreground">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* EV Bridge */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Enterprise Value vs Equity Value</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2 text-primary">Enterprise Value (EV)</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Formula:</strong> Market Cap + Total Debt − Cash</p>
                  <p><strong>Represents:</strong> Value of the entire business (debt + equity holders)</p>
                  <p><strong>Use with:</strong> EV/Revenue, EV/EBITDA, EV/EBIT</p>
                  <p><strong>Advantage:</strong> Capital-structure neutral — allows apples-to-apples comparison</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2 text-primary">Equity Value</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Formula:</strong> Share Price × Shares Outstanding (= Market Cap)</p>
                  <p><strong>Represents:</strong> Value belonging to equity shareholders only</p>
                  <p><strong>Use with:</strong> P/E, P/B, Dividend Yield</p>
                  <p><strong>Bridge:</strong> Equity Value = EV − Debt + Cash</p>
                </div>
              </div>
            </div>
          </div>

          {/* Peer Selection */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Peer Group Selection Criteria</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { criterion: 'Industry / Sector', desc: 'Same GICS sub-industry or SIC code. Core business model should match.' },
                { criterion: 'Size (Revenue/EV)', desc: 'Within 0.5x–2x of target. Very large or small peers distort multiples.' },
                { criterion: 'Growth Profile', desc: 'Similar revenue/earnings growth rates. High-growth trades at premium.' },
                { criterion: 'Geography', desc: 'Same region preferred. Cross-border comps need country risk adjustment.' },
                { criterion: 'Profitability', desc: 'Similar margins (gross, EBITDA). Mix of profitable and unprofitable is problematic.' },
                { criterion: 'Business Model', desc: 'Subscription vs transactional, B2B vs B2C, asset-light vs capital-intensive.' },
              ].map(({ criterion, desc }) => (
                <div key={criterion} className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{criterion}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Summary Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { stat: 'Median', desc: 'Middle value. Preferred — robust to outliers. Used as primary reference point.', rec: '★ Recommended' },
                { stat: 'Mean', desc: 'Simple average. Distorted by extreme values. Use cautiously with small peer sets.', rec: 'Secondary' },
                { stat: '25th Percentile', desc: 'Lower bound of reasonable range. Use for conservative / downside scenario.', rec: 'Range bound' },
                { stat: '75th Percentile', desc: 'Upper bound. Use for optimistic / premium scenario (strong growth, market leader).', rec: 'Range bound' },
              ].map(({ stat, desc, rec }) => (
                <div key={stat} className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{stat}</p>
                  <p className="text-[9px] text-primary font-medium mt-0.5">{rec}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reading the Charts */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Reading the Output</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { title: 'Football Field Chart', desc: 'Shows valuation range from each multiple method side by side. Wider bars = more uncertainty. Overlap zone across methods = consensus valuation range.' },
                { title: 'Multiple Comparison', desc: 'Horizontal bar chart comparing each peer\'s multiples. Spot outliers and understand where target ranks relative to peers.' },
                { title: 'Implied Valuation Table', desc: 'For each multiple, shows implied EV and equity value at low (25th pct), median, and high (75th pct). The range is your valuation corridor.' },
                { title: 'Scatter Plots', desc: 'Plot multiples vs growth or margins to see if premium/discount is justified by fundamentals. Peers above the trendline trade rich.' },
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
              <li>• Use <strong>median over mean</strong> — it is less sensitive to outliers. Minimum 5 peers for reliable statistics.</li>
              <li>• Always cross-check comps with <strong>DCF</strong> and <strong>Precedent Transactions</strong> for a triangulated view.</li>
              <li>• Exclude peers with negative EBITDA from EV/EBITDA calculations — they produce meaningless multiples.</li>
              <li>• If your target trades at a premium to peers, verify it is justified by superior growth, margins, or market position.</li>
              <li>• Use <strong>NTM (forward) multiples</strong> when available — they better reflect market expectations than trailing.</li>
              <li>• Upload peer data via CSV to quickly populate the comp table. Export the football field chart for presentations.</li>
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
    link.download = 'sample_comps.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Required Data Format</DialogTitle>
          <DialogDescription>Prepare comparable company data in this format</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">Rows = Financial metrics, Columns = Companies. First column is the metric name.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Metric</th>
                    <th className="p-2 text-right">DataForge</th><th className="p-2 text-right">NetSuite Pro</th><th className="p-2 text-right">PipelineHQ</th>
                  </tr></thead>
                  <tbody>
                    {[['MarketCap','5200','8400','3600'],['SharePrice','52','105','36'],['TotalDebt','400','600','300'],['Cash','500','700','250'],['Revenue','1400','2200','950'],['EBITDA','350','572','209'],['NetIncome','168','286','95'],['BookValue','800','1400','500']].map(([m,...vs],i)=>(
                      <tr key={i} className={i%2?'bg-muted/20':''}><td className="p-2 font-semibold border-r">{m}</td>{vs.map((v,j)=><td key={j} className="p-2 text-right">{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Accepted Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'Revenue', required: true, aliases: 'Sales, Turnover, Net Revenue' },
                  { name: 'MarketCap', required: false, aliases: 'Market Cap, Market Capitalization' },
                  { name: 'SharePrice', required: false, aliases: 'Share Price, Stock Price, Price' },
                  { name: 'SharesOutstanding', required: false, aliases: 'Shares, Diluted Shares' },
                  { name: 'TotalDebt', required: false, aliases: 'Total Debt, Debt' },
                  { name: 'Cash', required: false, aliases: 'Cash and Equivalents' },
                  { name: 'EBITDA', required: false, aliases: '' },
                  { name: 'NetIncome', required: false, aliases: 'Net Income, Net Profit' },
                  { name: 'BookValue', required: false, aliases: 'Book Value, Total Equity' },
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
                <li>• <strong>Revenue is required.</strong> The more metrics you provide, the more multiples can be calculated.</li>
                <li>• Use consistent units across all companies.</li>
                <li>• At least 3 comparable companies is recommended for meaningful statistics.</li>
                <li>• If SharePrice is missing but MarketCap and SharesOutstanding are present, it will be derived.</li>
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
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Scale className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Comparable Company Analysis</CardTitle>
          <CardDescription className="text-base mt-2">Relative valuation through peer company multiples</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Users, title: 'Peer Multiples', desc: 'EV/Revenue, EV/EBITDA, P/E, P/B' },
              { icon: BarChart3, title: 'Statistical Analysis', desc: 'Min, Q1, Median, Mean, Q3, Max' },
              { icon: Target, title: 'Implied Valuation', desc: 'Apply peer multiples to target company' },
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
                  <div><CardTitle className="text-base">Upload Comps Data</CardTitle><CardDescription className="text-xs">Peer company financials</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected</span></div>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Analyze Uploaded Comps</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with comparable companies&apos; financial data.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Company | Revenue | EBITDA | NetIncome | EV</p>
                      <p className="text-muted-foreground">e.g. Acme Corp, 500, 120, 65, 1800</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Format:</p>
                      <p>Metric | CompanyA | CompanyB | ...</p>
                      <p className="text-muted-foreground">Revenue, EBITDA, MarketCap, ...</p>
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
                  <div><CardTitle className="text-base">Manual Input</CardTitle><CardDescription className="text-xs">Enter company data manually</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Start with 5 sample SaaS companies and a target company. Edit, add, or remove peers as needed.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5" />5 SaaS peers pre-loaded</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5" />Toggle companies in/out of analysis</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5" />Add, remove, or edit any company</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Sample Data</Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Both paths lead to the same analysis. You can always edit comparable companies and target company values after starting.</p>
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

const SummaryCards = ({ stats, compCount }: { stats: CompsStats[]; compCount: number }) => {
  const evEbitda = stats.find(s => s.metric === 'EV/EBITDA');
  const evRev = stats.find(s => s.metric === 'EV/Revenue');
  const pe = stats.find(s => s.metric === 'P/E');
  const pb = stats.find(s => s.metric === 'P/B');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {[
        { label: 'Companies', value: `${compCount}`, sub: 'In peer group', icon: Users },
        { label: 'EV/EBITDA (Med)', value: fmtX(evEbitda?.median ?? null), sub: `Range: ${fmtX(evEbitda?.min??null)}–${fmtX(evEbitda?.max??null)}`, icon: Activity },
        { label: 'EV/Revenue (Med)', value: fmtX(evRev?.median ?? null), sub: `Range: ${fmtX(evRev?.min??null)}–${fmtX(evRev?.max??null)}`, icon: TrendingUp },
        { label: 'P/E (Med)', value: fmtX(pe?.median ?? null), sub: `Range: ${fmtX(pe?.min??null)}–${fmtX(pe?.max??null)}`, icon: DollarSign },
        { label: 'P/B (Med)', value: fmtX(pb?.median ?? null), sub: `Range: ${fmtX(pb?.min??null)}–${fmtX(pb?.max??null)}`, icon: Building2 },
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

export default function CCAPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: CCAPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Data
  const [parsedData, setParsedData] = useState<ParsedCompsData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [target, setTarget] = useState<TargetCompany>(DEFAULT_TARGET);

  // Parse uploaded data
  useEffect(() => {
    if (!data || data.length === 0) { setParsedData(null); setParseError(null); return; }
    try {
      const parsed = parseCompsData(data);
      setParsedData(parsed);
      setParseError(null);
    } catch (err: any) {
      setParseError(err.message);
      setParsedData(null);
    }
  }, [data]);

  const loadFromParsed = useCallback(() => {
    if (!parsedData) return;
    setCompanies(buildCompanyData(parsedData));
  }, [parsedData]);

  const loadSampleData = useCallback(() => {
    const sampleRows = Papa.parse(SAMPLE_CSV_CONTENT, { header: true, dynamicTyping: true }).data as Record<string, any>[];
    try {
      const parsed = parseCompsData(sampleRows);
      setParsedData(parsed);
      setCompanies(buildCompanyData(parsed));
    } catch {}
  }, []);

  // ─── Peer group management ────────────────────────────────────────────
  const toggleCompany = (id: string) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, included: !c.included } : c));
  };

  const removeCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const addCompany = () => {
    setCompanies(prev => [...prev, { ...EMPTY_COMPANY, id: nextCompanyId(), name: `Company ${prev.length + 1}` }]);
  };

  const updateCompany = (id: string, field: keyof CompanyData, value: string | number | boolean) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // ─── Computed (only included companies) ────────────────────────────────
  const includedCompanies = useMemo(() => companies.filter(c => c.included), [companies]);
  const multiples = useMemo(() => computeMultiples(includedCompanies), [includedCompanies]);
  const stats = useMemo(() => computeStats(multiples), [multiples]);
  const valuations = useMemo(() => computeImpliedValuations(stats, target), [stats, target]);

  // Football field data
  const footballData = useMemo(() => {
    const medianVals = valuations.filter(v => v.multipleName.includes('Median') && v.impliedSharePrice != null);
    return medianVals.map(v => ({
      name: v.metric,
      price: v.impliedSharePrice!,
    }));
  }, [valuations]);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `CCA_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  const handleDownloadCSV = useCallback(() => {
    let csv = "COMPARABLE COMPANY ANALYSIS\n\n";
    csv += "MULTIPLES\n";
    csv += Papa.unparse(multiples.map(m => ({
      Company: m.name, EV: m.ev.toFixed(0), 'EV/Revenue': m.evToRevenue?.toFixed(2) ?? '', 'EV/EBITDA': m.evToEbitda?.toFixed(2) ?? '',
      'P/E': m.peRatio?.toFixed(2) ?? '', 'P/B': m.pbRatio?.toFixed(2) ?? '',
    }))) + "\n\n";
    csv += "STATISTICS\n";
    csv += Papa.unparse(stats.map(s => ({
      Metric: s.metric, Min: s.min?.toFixed(2) ?? '', Q1: s.q1?.toFixed(2) ?? '',
      Median: s.median?.toFixed(2) ?? '', Mean: s.mean?.toFixed(2) ?? '',
      Q3: s.q3?.toFixed(2) ?? '', Max: s.max?.toFixed(2) ?? '',
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
    link.download = `CCA_${new Date().toISOString().split('T')[0]}.csv`;
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
        <div><h1 className="text-2xl font-bold">Comparable Company Analysis</h1><p className="text-muted-foreground mt-1">Relative valuation through peer multiples</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <CCAGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Target Company Input ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="w-6 h-6 text-primary" /></div>
            <div><CardTitle>Target Company</CardTitle><CardDescription>Enter financials for the company you want to value</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ['name', 'Company Name', '', 'text'],
              ['revenue', 'Revenue ($M)', '', 'number'],
              ['ebitda', 'EBITDA ($M)', '', 'number'],
              ['netIncome', 'Net Income ($M)', '', 'number'],
              ['bookValue', 'Book Value ($M)', '', 'number'],
              ['totalDebt', 'Total Debt ($M)', '', 'number'],
              ['cash', 'Cash ($M)', '', 'number'],
              ['sharesOutstanding', 'Shares (M)', '', 'number'],
            ] as const).map(([key, label, , type]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium">{label}</Label>
                <Input
                  type={type}
                  value={(target as any)[key]}
                  onChange={e => setTarget(prev => ({
                    ...prev,
                    [key]: type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value
                  }))}
                  className="h-9 text-sm font-mono text-right"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ Peer Group Management ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-6 h-6 text-primary" /></div>
              <div>
                <CardTitle>Peer Group</CardTitle>
                <CardDescription>
                  {includedCompanies.length} of {companies.length} companies included in analysis
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {companies.length > 0 && (
                <Button onClick={() => setCompanies([])} size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />Clear All
                </Button>
              )}
              <Button onClick={addCompany} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />Add Company
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
                  <TableHead className="min-w-[140px]">Company</TableHead>
                  <TableHead className="text-right">Mkt Cap</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Net Inc</TableHead>
                  <TableHead className="text-right">Debt</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Book Val</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map(c => (
                  <TableRow key={c.id} className={!c.included ? 'opacity-40' : ''}>
                    <TableCell>
                      <button
                        onClick={() => toggleCompany(c.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${c.included ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}
                      >
                        {c.included && <Check className="w-3 h-3" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={c.name}
                        onChange={e => updateCompany(c.id, 'name', e.target.value)}
                        className="h-8 text-sm font-medium border-0 bg-transparent p-0 focus-visible:ring-1"
                      />
                    </TableCell>
                    {(['marketCap', 'revenue', 'ebitda', 'netIncome', 'totalDebt', 'cash', 'bookValue', 'sharesOutstanding'] as const).map(field => (
                      <TableCell key={field} className="text-right">
                        <Input
                          type="number"
                          value={c[field]}
                          onChange={e => updateCompany(c.id, field, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm font-mono text-right border-0 bg-transparent p-0 w-20 focus-visible:ring-1"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCompany(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {companies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="space-y-3">
                        <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No peer companies yet</p>
                        <Button onClick={addCompany} size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Add Company</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {companies.length > 0 && includedCompanies.length === 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No companies included</AlertTitle>
              <AlertDescription>Enable at least one company to run the analysis.</AlertDescription>
            </Alert>
          )}
          {companies.length > 0 && <p className="text-xs text-muted-foreground mt-3">Click values to edit inline. Uncheck to exclude from analysis without deleting.</p>}
        </CardContent>
      </Card>

      {/* ══ Detailed Output ══ */}
      {includedCompanies.length > 0 ? (<>
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Detailed Analysis</h2><p className="text-sm text-muted-foreground">Full multiples and implied valuations</p></div>
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
          <h2 className="text-2xl font-bold">Comparable Company Analysis Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Target: {target.name} | Peers: {includedCompanies.length} companies | {new Date().toLocaleDateString()}</p>
        </div>

        <SummaryCards stats={stats} compCount={includedCompanies.length} />

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Valuation Summary</CardTitle><CardDescription>Implied valuation from peer multiples applied to {target.name}</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {priceRange && (
              <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Comparable analysis implies a <strong>share price range of {fmtC(priceRange.low)} – {fmtC(priceRange.high)}</strong> for {target.name}, with a midpoint of {fmtC(priceRange.mid)}.</p></div>
                  <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Based on {includedCompanies.length} peer companies. Median EV/EBITDA: {fmtX(stats.find(s => s.metric === 'EV/EBITDA')?.median ?? null)}, Median EV/Revenue: {fmtX(stats.find(s => s.metric === 'EV/Revenue')?.median ?? null)}.</p></div>
                  <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Target EBITDA margin: {target.revenue > 0 ? fmtP((target.ebitda / target.revenue) * 100) : '—'} vs peer median: {fmtP(stats.find(s => s.metric === 'EBITDA Margin (%)')?.median ?? null)}.</p></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Football Field Chart */}
        {footballData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Implied Share Price — Football Field</CardTitle><CardDescription>Range of implied valuations by methodology</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={footballData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={80} />
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

        {/* Multiples Table */}
        <Card>
          <CardHeader><CardTitle>Trading Multiples</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead><TableHead className="text-right">EV ($M)</TableHead>
                    <TableHead className="text-right">EV/Revenue</TableHead><TableHead className="text-right">EV/EBITDA</TableHead>
                    <TableHead className="text-right">P/E</TableHead><TableHead className="text-right">P/B</TableHead>
                    <TableHead className="text-right">EBITDA Margin</TableHead><TableHead className="text-right">Net Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {multiples.map(m => (
                    <TableRow key={m.name}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(m.ev)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtX(m.evToRevenue)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtX(m.evToEbitda)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtX(m.peRatio)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtX(m.pbRatio)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtP(m.ebitdaMargin)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtP(m.netMargin)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Multiples Bar Chart */}
        <Card>
          <CardHeader><CardTitle>EV/EBITDA Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={multiples.filter(m => m.evToEbitda != null).map(m => ({ name: m.name, value: m.evToEbitda }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => `${v}x`} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}x`, 'EV/EBITDA']} />
                  <Bar dataKey="value" name="EV/EBITDA" radius={[6, 6, 0, 0]}>
                    {multiples.filter(m => m.evToEbitda != null).map((_, i) => <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />)}
                  </Bar>
                  {stats.find(s => s.metric === 'EV/EBITDA')?.median != null && (
                    <ReferenceLine y={stats.find(s => s.metric === 'EV/EBITDA')!.median!} stroke={COLORS.highlight} strokeDasharray="5 5" label={{ value: `Median: ${stats.find(s => s.metric === 'EV/EBITDA')!.median!.toFixed(1)}x`, position: 'right', fill: COLORS.highlight, fontSize: 11 }} />
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
                <TableRow><TableHead>Multiple</TableHead><TableHead className="text-right">Min</TableHead><TableHead className="text-right">Q1</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Q3</TableHead><TableHead className="text-right">Max</TableHead></TableRow>
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
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Comparable Company Analysis — {target.name}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A comparable company analysis was conducted using <strong>{includedCompanies.length} peer companies</strong> to derive implied valuation multiples for {target.name}. The peer set represents companies with similar business models, end markets, and growth characteristics.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Peer median trading multiples are: <strong>EV/EBITDA {fmtX(stats.find(s=>s.metric==='EV/EBITDA')?.median??null)}</strong>, EV/Revenue {fmtX(stats.find(s=>s.metric==='EV/Revenue')?.median??null)}, P/E {fmtX(stats.find(s=>s.metric==='P/E')?.median??null)}, P/B {fmtX(stats.find(s=>s.metric==='P/B')?.median??null)}.
                  {(() => {
                    const evEbitda = stats.find(s => s.metric === 'EV/EBITDA');
                    if (evEbitda?.high != null && evEbitda?.low != null) {
                      const spread = evEbitda.high - evEbitda.low;
                      return ` The EV/EBITDA range spans ${evEbitda.low.toFixed(1)}x to ${evEbitda.high.toFixed(1)}x (${spread.toFixed(1)}x spread), ${spread > 5 ? 'indicating meaningful valuation dispersion among peers.' : 'reflecting relatively tight peer consensus.'}`;
                    }
                    return '';
                  })()}
                </p>
                {priceRange && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Applying median peer multiples to {target.name}&apos;s financials (Revenue: {fmt(target.revenue)}, EBITDA: {fmt(target.ebitda)}, Net Income: {fmt(target.netIncome)}) yields an <strong>implied share price range of {fmtC(priceRange.low)} – {fmtC(priceRange.high)}</strong>, with a midpoint of <strong>{fmtC(priceRange.mid)}</strong>.
                    {target.sharesOutstanding > 0 && (() => {
                      const impliedMktCap = priceRange.mid * target.sharesOutstanding;
                      return ` This implies an equity value of approximately $${impliedMktCap >= 1000 ? (impliedMktCap / 1000).toFixed(1) + 'B' : impliedMktCap.toFixed(0) + 'M'} at the midpoint.`;
                    })()}
                  </p>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The target company&apos;s EBITDA margin ({target.revenue > 0 ? fmtP((target.ebitda / target.revenue) * 100) : '—'}) is {
                    target.revenue > 0 && stats.find(s => s.metric === 'EBITDA Margin (%)')?.median != null
                      ? ((target.ebitda / target.revenue) * 100 > stats.find(s => s.metric === 'EBITDA Margin (%)')!.median! ? 'above' : 'below')
                      : 'comparable to'
                  } the peer median ({fmtP(stats.find(s => s.metric === 'EBITDA Margin (%)')?.median ?? null)}){
                    target.revenue > 0 && stats.find(s => s.metric === 'Revenue Growth (%)')?.median != null
                      ? `, and its revenue growth (${fmtP(target.revenueGrowth)}) is ${target.revenueGrowth > stats.find(s => s.metric === 'Revenue Growth (%)')!.median! ? 'above' : 'below'} the peer median (${fmtP(stats.find(s => s.metric === 'Revenue Growth (%)')!.median)})`
                      : ''
                  }.
                  {' '}{
                    target.revenue > 0 && stats.find(s => s.metric === 'EBITDA Margin (%)')?.median != null
                      ? ((target.ebitda / target.revenue) * 100 > stats.find(s => s.metric === 'EBITDA Margin (%)')!.median! ? 'This superior profitability profile may justify a premium to peer median multiples.' : 'This may warrant a modest discount to peer median multiples, partially offset by other qualitative factors.')
                      : 'This suggests valuation broadly in line with peer multiples.'
                  }
                </p>
                {(() => {
                  const highComp = includedCompanies.reduce((a, b) => (a.evToEbitda ?? 0) > (b.evToEbitda ?? 0) ? a : b);
                  const lowComp = includedCompanies.reduce((a, b) => (a.evToEbitda ?? Infinity) < (b.evToEbitda ?? Infinity) ? a : b);
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <strong>Notable peers:</strong> {highComp.name} trades at the highest EV/EBITDA ({fmtX(highComp.evToEbitda ?? null)}), likely reflecting {highComp.revenueGrowth > 20 ? 'superior growth expectations' : 'premium market positioning'}, while {lowComp.name} ({fmtX(lowComp.evToEbitda ?? null)}) trades at the low end{lowComp.ebitdaMargin != null && lowComp.ebitdaMargin < 15 ? ', potentially reflecting margin compression concerns' : ''}.
                    </p>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </>) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Add peer companies above to see the analysis results.</p>
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
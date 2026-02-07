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
  Check, CheckCircle2, TrendingDown
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
import { Slider } from '@/components/ui/slider';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area,
  Cell, ReferenceLine
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface DCFInput {
  baseRevenue: number;
  revenueGrowthRates: number[]; // 5 years
  ebitdaMargin: number;
  ebitdaMarginTerminal: number;
  depreciationPctRevenue: number;
  capexPctRevenue: number;
  nwcPctRevenue: number;
  taxRate: number;
  wacc: number;
  terminalGrowthRate: number;
  totalDebt: number;
  cashEquivalents: number;
  sharesOutstanding: number;
}

interface YearProjection {
  year: number;
  label: string;
  revenue: number;
  growthRate: number;
  ebitda: number;
  ebitdaMargin: number;
  depreciation: number;
  ebit: number;
  taxes: number;
  nopat: number;
  capex: number;
  changeNWC: number;
  fcf: number;
  discountFactor: number;
  pvFCF: number;
}

interface DCFOutput {
  projections: YearProjection[];
  terminalValue: number;
  pvTerminalValue: number;
  pvFCFs: number[];
  sumPVFCF: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  impliedSharePrice: number;
  evToEbitda: number;
  evToRevenue: number;
  tvPctOfEV: number;
  sensitivityWACC: number[];
  sensitivityGrowth: number[];
  sensitivityMatrix: (number | null)[][];
}

interface HistoricalData {
  years: number[];
  metrics: Record<string, (number | null)[]>;
  unmapped: string[];
}

interface HistoricalStats {
  years: number[];
  revenueValues: (number | null)[];
  revenueGrowthRates: (number | null)[];
  revenueCagr?: number;
  ebitdaValues?: (number | null)[];
  ebitdaMargins?: (number | null)[];
  avgEbitdaMargin?: number;
  lastEbitdaMargin?: number;
  depAmortValues?: (number | null)[];
  avgDepAmortPct?: number;
  capexValues?: (number | null)[];
  avgCapexPct?: number;
  nwcValues?: (number | null)[];
  avgNwcPct?: number;
  netIncomeValues?: (number | null)[];
  totalDebtLatest?: number;
  cashLatest?: number;
  sharesOutstandingLatest?: number;
}

interface SuggestedAssumptions {
  baseRevenue?: number;
  revenueGrowthRates?: number[];
  ebitdaMargin?: number;
  ebitdaMarginTerminal?: number;
  depreciationPctRevenue?: number;
  capexPctRevenue?: number;
  nwcPctRevenue?: number;
  totalDebt?: number;
  cashEquivalents?: number;
  sharesOutstanding?: number;
}

interface DCFPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PROJECTION_YEARS = 5;

const DEFAULT_INPUTS: DCFInput = {
  baseRevenue: 1000,
  revenueGrowthRates: [15, 12, 10, 8, 5],
  ebitdaMargin: 25,
  ebitdaMarginTerminal: 22,
  depreciationPctRevenue: 3,
  capexPctRevenue: 5,
  nwcPctRevenue: 10,
  taxRate: 25,
  wacc: 10,
  terminalGrowthRate: 2.5,
  totalDebt: 200,
  cashEquivalents: 150,
  sharesOutstanding: 100,
};

const METRIC_ALIASES: Record<string, string[]> = {
  Revenue: ["revenue", "sales", "turnover", "total revenue", "net revenue", "net sales"],
  EBITDA: ["ebitda"],
  DepAmort: ["depamort", "depreciation", "depreciation and amortization", "d&a", "da"],
  CapEx: ["capex", "capital expenditure", "capital expenditures"],
  NWC: ["nwc", "net working capital", "working capital"],
  NetIncome: ["netincome", "net income", "net profit", "net earnings"],
  TotalDebt: ["totaldebt", "total debt", "debt", "long term debt"],
  Cash: ["cash", "cash and equivalents", "cash & equivalents", "cash and cash equivalents"],
  SharesOutstanding: ["sharesoutstanding", "shares outstanding", "shares", "diluted shares"],
};

const COLORS = {
  primary: '#1e3a5f',
  primaryLight: '#2d5a8e',
  secondary: '#0d9488',
  secondaryLight: '#14b8a6',
  positive: '#22c55e',
  negative: '#ef4444',
  muted: '#94a3b8',
  area: 'rgba(30, 58, 95, 0.1)',
  areaSecondary: 'rgba(13, 148, 136, 0.1)',
  historical: '#64748b',
  projected: '#1e3a5f',
  fcf: '#1e3a5f',
  tv: '#0d9488',
};

const metricDefinitions: Record<string, string> = {
  "DCF (Discounted Cash Flow)": "A valuation method that estimates the present value of expected future free cash flows, discounted at WACC.",
  "Free Cash Flow (FCF)": "Cash generated after reinvestment. FCF = NOPAT + D&A − CapEx − ΔNWC.",
  "WACC": "Weighted Average Cost of Capital — blended required return for debt and equity holders.",
  "Terminal Value": "Value of cash flows beyond projection period. TV = FCF × (1+g) / (WACC − g).",
  "Enterprise Value (EV)": "Total firm value = PV of projected FCFs + PV of terminal value.",
  "Equity Value": "Value to equity holders = EV − Net Debt. Divide by shares for implied price.",
  "EBITDA": "Earnings Before Interest, Taxes, Depreciation, and Amortization.",
  "NOPAT": "Net Operating Profit After Tax = EBIT × (1 − Tax Rate).",
  "Terminal Growth Rate": "Perpetual FCF growth rate beyond projection. Typically 2–3%.",
  "Sensitivity Analysis": "Matrix showing implied price under different WACC / growth assumptions.",
  "Net Debt": "Total debt minus cash. Represents net financial obligations.",
  "EV/EBITDA": "Enterprise Value / EBITDA — common relative valuation multiple.",
};


// ═══════════════════════════════════════════════════════════════════════════════
// DATA PARSER — Fixed format: rows=Metric, cols=Year
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeMetricName(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(METRIC_ALIASES)) {
    if (cleaned === canonical.toLowerCase() || aliases.includes(cleaned)) {
      return canonical;
    }
  }
  return null;
}

function parseFinancialData(rawData: Record<string, any>[]): HistoricalData {
  if (!rawData || rawData.length === 0) throw new Error("Empty data");

  const firstRow = rawData[0];
  const keys = Object.keys(firstRow);

  // Find metric column (first non-numeric column)
  let metricCol: string | null = null;
  for (const key of keys) {
    const val = String(firstRow[key] ?? '').trim();
    if (isNaN(Number(val)) && val !== '') {
      metricCol = key;
      break;
    }
  }
  if (!metricCol) throw new Error("Cannot find metric label column.");

  // Find year columns
  const yearCols: { key: string; year: number }[] = [];
  for (const key of keys) {
    if (key === metricCol) continue;
    const cleaned = String(key).trim();
    const y = parseInt(cleaned);
    if (!isNaN(y) && y >= 1900 && y <= 2100) {
      yearCols.push({ key, year: y });
    }
  }
  if (yearCols.length === 0) throw new Error("No year columns found.");

  yearCols.sort((a, b) => a.year - b.year);
  const years = yearCols.map(yc => yc.year);

  const metrics: Record<string, (number | null)[]> = {};
  const unmapped: string[] = [];

  for (const row of rawData) {
    const rawLabel = String(row[metricCol] ?? '').trim();
    if (!rawLabel) continue;

    const canonical = normalizeMetricName(rawLabel);
    if (!canonical) {
      unmapped.push(rawLabel);
      continue;
    }

    const values: (number | null)[] = yearCols.map(yc => {
      const v = row[yc.key];
      const num = Number(v);
      return isNaN(num) ? null : num;
    });

    metrics[canonical] = values;
  }

  if (!metrics.Revenue) throw new Error("Revenue row is required.");

  return { years, metrics, unmapped };
}

function computeHistoricalStats(parsed: HistoricalData): HistoricalStats {
  const { years, metrics: m } = parsed;
  const rev = m.Revenue || [];

  // Revenue growth rates
  const revGrowth: (number | null)[] = [];
  for (let i = 1; i < rev.length; i++) {
    if (rev[i] != null && rev[i - 1] != null && rev[i - 1]! !== 0) {
      revGrowth.push(Math.round(((rev[i]! / rev[i - 1]!) - 1) * 10000) / 100);
    } else {
      revGrowth.push(null);
    }
  }

  // Revenue CAGR
  const validRev = rev.map((v, i) => ({ i, v })).filter(x => x.v != null && x.v > 0);
  let revenueCagr: number | undefined;
  if (validRev.length >= 2) {
    const first = validRev[0], last = validRev[validRev.length - 1];
    const span = last.i - first.i;
    if (span > 0) revenueCagr = Math.round(((last.v! / first.v!) ** (1 / span) - 1) * 10000) / 100;
  }

  const result: HistoricalStats = {
    years,
    revenueValues: rev,
    revenueGrowthRates: revGrowth,
    revenueCagr,
  };

  // EBITDA margins
  const ebitda = m.EBITDA;
  if (ebitda) {
    result.ebitdaValues = ebitda;
    const margins = rev.map((r, i) =>
      r != null && i < ebitda.length && ebitda[i] != null && r !== 0
        ? Math.round((ebitda[i]! / r) * 10000) / 100 : null
    );
    result.ebitdaMargins = margins;
    const validM = margins.filter(v => v != null) as number[];
    if (validM.length) {
      result.avgEbitdaMargin = Math.round(validM.reduce((a, b) => a + b, 0) / validM.length * 100) / 100;
      result.lastEbitdaMargin = validM[validM.length - 1];
    }
  }

  // D&A % of revenue
  const dep = m.DepAmort;
  if (dep) {
    result.depAmortValues = dep;
    const pcts = rev.map((r, i) =>
      r != null && i < dep.length && dep[i] != null && r !== 0
        ? Math.round((dep[i]! / r) * 10000) / 100 : null
    );
    const valid = pcts.filter(v => v != null) as number[];
    if (valid.length) result.avgDepAmortPct = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length * 100) / 100;
  }

  // CapEx % of revenue
  const capex = m.CapEx;
  if (capex) {
    result.capexValues = capex;
    const pcts = rev.map((r, i) =>
      r != null && i < capex.length && capex[i] != null && r !== 0
        ? Math.round((capex[i]! / r) * 10000) / 100 : null
    );
    const valid = pcts.filter(v => v != null) as number[];
    if (valid.length) result.avgCapexPct = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length * 100) / 100;
  }

  // NWC % of revenue
  const nwc = m.NWC;
  if (nwc) {
    result.nwcValues = nwc;
    const pcts = rev.map((r, i) =>
      r != null && i < nwc.length && nwc[i] != null && r !== 0
        ? Math.round((nwc[i]! / r) * 10000) / 100 : null
    );
    const valid = pcts.filter(v => v != null) as number[];
    if (valid.length) result.avgNwcPct = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length * 100) / 100;
  }

  // Net Income
  if (m.NetIncome) result.netIncomeValues = m.NetIncome;

  // Balance sheet latest
  for (const [mk, rk] of [["TotalDebt", "totalDebtLatest"], ["Cash", "cashLatest"], ["SharesOutstanding", "sharesOutstandingLatest"]] as const) {
    const vals = m[mk];
    if (vals) {
      const valid = vals.filter(v => v != null) as number[];
      if (valid.length) (result as any)[rk] = valid[valid.length - 1];
    }
  }

  return result;
}

function suggestAssumptions(hist: HistoricalStats): SuggestedAssumptions {
  const s: SuggestedAssumptions = {};

  // Base revenue
  const validRev = (hist.revenueValues || []).filter(v => v != null) as number[];
  if (validRev.length) s.baseRevenue = validRev[validRev.length - 1];

  // Growth rates: decelerate from last growth toward avg * 0.6
  const validGrowth = (hist.revenueGrowthRates || []).filter(v => v != null) as number[];
  if (validGrowth.length) {
    const lastG = validGrowth[validGrowth.length - 1];
    const avgG = validGrowth.reduce((a, b) => a + b, 0) / validGrowth.length;
    const target = Math.max(avgG * 0.6, 2.0);
    s.revenueGrowthRates = Array.from({ length: 5 }, (_, i) =>
      Math.round((lastG + (target - lastG) * (i / 4)) * 10) / 10
    );
  }

  if (hist.lastEbitdaMargin != null) s.ebitdaMargin = hist.lastEbitdaMargin;
  if (hist.avgEbitdaMargin != null) s.ebitdaMarginTerminal = hist.avgEbitdaMargin;
  if (hist.avgDepAmortPct != null) s.depreciationPctRevenue = hist.avgDepAmortPct;
  if (hist.avgCapexPct != null) s.capexPctRevenue = hist.avgCapexPct;
  if (hist.avgNwcPct != null) s.nwcPctRevenue = hist.avgNwcPct;
  if (hist.totalDebtLatest != null) s.totalDebt = hist.totalDebtLatest;
  if (hist.cashLatest != null) s.cashEquivalents = hist.cashLatest;
  if (hist.sharesOutstandingLatest != null) s.sharesOutstanding = hist.sharesOutstandingLatest;

  return s;
}


// ═══════════════════════════════════════════════════════════════════════════════
// DCF COMPUTATION ENGINE (client-side)
// ═══════════════════════════════════════════════════════════════════════════════

function runDCF(inputs: DCFInput): DCFOutput {
  const projections: YearProjection[] = [];
  let prevRevenue = inputs.baseRevenue;
  let prevNWC = inputs.baseRevenue * (inputs.nwcPctRevenue / 100);
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < PROJECTION_YEARS; i++) {
    const growthRate = inputs.revenueGrowthRates[i] / 100;
    const revenue = prevRevenue * (1 + growthRate);
    const marginWeight = PROJECTION_YEARS > 1 ? i / (PROJECTION_YEARS - 1) : 1;
    const margin = inputs.ebitdaMargin + (inputs.ebitdaMarginTerminal - inputs.ebitdaMargin) * marginWeight;
    const ebitda = revenue * (margin / 100);
    const depreciation = revenue * (inputs.depreciationPctRevenue / 100);
    const ebit = ebitda - depreciation;
    const taxes = Math.max(0, ebit * (inputs.taxRate / 100));
    const nopat = ebit - taxes;
    const capex = revenue * (inputs.capexPctRevenue / 100);
    const currentNWC = revenue * (inputs.nwcPctRevenue / 100);
    const changeNWC = currentNWC - prevNWC;
    const fcf = nopat + depreciation - capex - changeNWC;
    const discountFactor = 1 / Math.pow(1 + inputs.wacc / 100, i + 1);
    const pvFCF = fcf * discountFactor;

    projections.push({
      year: currentYear + i + 1,
      label: `Y${i + 1} (${currentYear + i + 1})`,
      revenue, growthRate: inputs.revenueGrowthRates[i], ebitda, ebitdaMargin: margin,
      depreciation, ebit, taxes, nopat, capex, changeNWC, fcf, discountFactor, pvFCF,
    });
    prevRevenue = revenue;
    prevNWC = currentNWC;
  }

  const lastFCF = projections[PROJECTION_YEARS - 1].fcf;
  const tv = (lastFCF * (1 + inputs.terminalGrowthRate / 100)) / (inputs.wacc / 100 - inputs.terminalGrowthRate / 100);
  const pvTV = tv / Math.pow(1 + inputs.wacc / 100, PROJECTION_YEARS);
  const sumPVFCF = projections.reduce((s, p) => s + p.pvFCF, 0);
  const ev = sumPVFCF + pvTV;
  const netDebt = inputs.totalDebt - inputs.cashEquivalents;
  const equityValue = ev - netDebt;
  const impliedSharePrice = inputs.sharesOutstanding > 0 ? equityValue / inputs.sharesOutstanding : 0;
  const lastEBITDA = projections[PROJECTION_YEARS - 1].ebitda;
  const lastRevenue = projections[PROJECTION_YEARS - 1].revenue;

  // Sensitivity
  const waccRange = [-2, -1, 0, 1, 2].map(d => inputs.wacc + d);
  const growthRange = [-1, -0.5, 0, 0.5, 1].map(d => inputs.terminalGrowthRate + d);
  const sensitivityMatrix = waccRange.map(w => growthRange.map(g => {
    if (w / 100 <= g / 100) return null;
    const tvS = (lastFCF * (1 + g / 100)) / (w / 100 - g / 100);
    const pvTVS = tvS / Math.pow(1 + w / 100, PROJECTION_YEARS);
    const sumPVS = projections.reduce((s, p) => s + p.fcf / Math.pow(1 + w / 100, p.year - new Date().getFullYear()), 0);
    const evS = sumPVS + pvTVS;
    return (evS - netDebt) / (inputs.sharesOutstanding || 1);
  }));

  return {
    projections, terminalValue: tv, pvTerminalValue: pvTV, pvFCFs: projections.map(p => p.pvFCF),
    sumPVFCF, enterpriseValue: ev, netDebt, equityValue, impliedSharePrice,
    evToEbitda: lastEBITDA > 0 ? ev / lastEBITDA : 0,
    evToRevenue: lastRevenue > 0 ? ev / lastRevenue : 0,
    tvPctOfEV: ev > 0 ? (pvTV / ev) * 100 : 0,
    sensitivityWACC: waccRange, sensitivityGrowth: growthRange, sensitivityMatrix,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number, d = 1) => {
  if (isNaN(n) || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(d)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(d)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(d)}K`;
  return n.toFixed(d);
};
const fmtC = (n: number, d = 2) => isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(d)}`;
const fmtP = (n: number, d = 1) => `${n.toFixed(d)}%`;


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />DCF Glossary</DialogTitle>
        <DialogDescription>Key DCF valuation terms</DialogDescription>
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
// GUIDE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const DCFGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">DCF Valuation Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">

          {/* What is DCF */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" />What is DCF?</h3>
            <p className="text-sm text-muted-foreground">Discounted Cash Flow (DCF) estimates a company&apos;s intrinsic value by projecting future free cash flows and discounting them to present value using the Weighted Average Cost of Capital (WACC). It is the most theoretically grounded valuation method, used for mature companies with predictable cash flows.</p>
          </div>

          <Separator />

          {/* Master Formula */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Core Formula</h3>
            <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm text-center space-y-2">
              <p className="text-primary font-semibold">Enterprise Value = Σ [ FCFₜ ÷ (1 + WACC)ᵗ ] + Terminal Value ÷ (1 + WACC)ⁿ</p>
              <p className="text-muted-foreground text-xs">where t = 1 to n (projection years), n = last projection year</p>
            </div>
          </div>

          <Separator />

          {/* Step 1: FCF */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>Free Cash Flow (FCF)</h3>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="p-3 bg-muted/30 rounded-md font-mono text-sm text-center space-y-1">
                <p>UFCF = EBITDA − D&A Tax Shield + D&A − CapEx − ΔNWC</p>
                <p className="text-xs text-muted-foreground">Simplified:</p>
                <p className="text-primary font-semibold">UFCF = EBITDA × (1 − Tax Rate) + D&A × Tax Rate − CapEx − ΔNWC</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-1.5 font-semibold">Component</th><th className="text-left p-1.5 font-semibold">Meaning</th><th className="text-right p-1.5 font-semibold">Example</th></tr></thead>
                  <tbody>
                    {[
                      ['EBITDA', 'Earnings before interest, taxes, depreciation, amortization', '$210M'],
                      ['D&A', 'Depreciation & Amortization (non-cash expense)', '$24M'],
                      ['Tax Rate', 'Corporate tax rate applied', '25%'],
                      ['CapEx', 'Capital Expenditures (maintenance + growth)', '$44M'],
                      ['ΔNWC', 'Change in Net Working Capital (increase = cash outflow)', '$8M'],
                    ].map(([c, m, e], i) => (
                      <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-1.5 font-mono">{c}</td><td className="p-1.5 text-muted-foreground">{m}</td><td className="p-1.5 text-right font-mono">{e}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-background rounded-md text-xs space-y-1 border">
                <p className="font-semibold">Example: Year 2024 FCF</p>
                <p className="font-mono">EBITDA × (1 − 25%) + D&A × 25% − CapEx − ΔNWC</p>
                <p className="font-mono">= $210M × 0.75 + $24M × 0.25 − $44M − $8M</p>
                <p className="font-mono">= $157.5M + $6M − $44M − $8M</p>
                <p className="font-mono text-primary font-semibold">= $111.5M</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 2: WACC */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>WACC (Discount Rate)</h3>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="p-3 bg-muted/30 rounded-md font-mono text-sm text-center space-y-1">
                <p className="text-primary font-semibold">WACC = (E/V × Ke) + (D/V × Kd × (1 − T))</p>
                <p className="text-xs text-muted-foreground">where Ke = Cost of Equity, Kd = Cost of Debt, T = Tax Rate</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-1.5 font-semibold">Variable</th><th className="text-left p-1.5 font-semibold">Meaning</th><th className="text-right p-1.5 font-semibold">Example</th></tr></thead>
                  <tbody>
                    {[
                      ['E/V', 'Equity weight (Market Cap ÷ Total Value)', '70%'],
                      ['D/V', 'Debt weight (Debt ÷ Total Value)', '30%'],
                      ['Ke', 'Cost of equity (via CAPM: Rf + β × ERP)', '10.5%'],
                      ['Kd', 'Cost of debt (interest rate on borrowings)', '5.0%'],
                      ['T', 'Corporate tax rate', '25%'],
                    ].map(([v, m, e], i) => (
                      <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-1.5 font-mono">{v}</td><td className="p-1.5 text-muted-foreground">{m}</td><td className="p-1.5 text-right font-mono">{e}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-background rounded-md text-xs space-y-1 border">
                <p className="font-semibold">Example:</p>
                <p className="font-mono">WACC = (70% × 10.5%) + (30% × 5.0% × (1 − 25%))</p>
                <p className="font-mono">= 7.35% + 1.125%</p>
                <p className="font-mono text-primary font-semibold">= 8.475% ≈ 8.5%</p>
              </div>
              <div className="p-3 bg-muted/20 rounded-md text-xs space-y-1">
                <p className="font-semibold">CAPM (Cost of Equity):</p>
                <p className="font-mono">Ke = Rf + β × (Rm − Rf)</p>
                <p className="font-mono text-muted-foreground">= 4.0% + 1.1 × (10% − 4.0%) = 4.0% + 6.6% = 10.6%</p>
                <p className="text-muted-foreground mt-1">Rf = Risk-free rate (10Y Treasury), β = Beta, Rm − Rf = Equity Risk Premium</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 3: Terminal Value */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>Terminal Value</h3>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Terminal Value captures all cash flows beyond the projection period. Two common approaches:</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="font-semibold text-sm text-primary">Gordon Growth Model (Perpetuity)</p>
                  <div className="p-2 bg-muted/30 rounded font-mono text-sm text-center">
                    <p>TV = FCFₙ × (1 + g) ÷ (WACC − g)</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">Example:</p>
                    <p className="font-mono">TV = $150M × (1 + 2.5%) ÷ (8.5% − 2.5%)</p>
                    <p className="font-mono">= $153.75M ÷ 6.0%</p>
                    <p className="font-mono text-primary font-semibold">= $2,562.5M</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">g = perpetual growth rate (typically 2–3%, ≤ GDP growth)</p>
                </div>
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="font-semibold text-sm text-amber-600">Exit Multiple Method</p>
                  <div className="p-2 bg-muted/30 rounded font-mono text-sm text-center">
                    <p>TV = EBITDAₙ × Exit Multiple</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">Example:</p>
                    <p className="font-mono">TV = $280M × 10.0x</p>
                    <p className="font-mono text-amber-600 font-semibold">= $2,800M</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Exit multiple based on comparable company EV/EBITDA. Cross-check with CCA.</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <strong>Warning:</strong> Terminal Value often represents 60–80% of total Enterprise Value. Small changes in g or WACC have outsized impact — always run sensitivity analysis.
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 4: Present Value & EV Bridge */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>Present Value & Equity Bridge</h3>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="p-3 bg-muted/30 rounded-md font-mono text-sm text-center space-y-1">
                <p>PV(FCFₜ) = FCFₜ ÷ (1 + WACC)ᵗ</p>
                <p>PV(TV) = TV ÷ (1 + WACC)ⁿ</p>
                <p className="text-primary font-semibold pt-1">Enterprise Value = Σ PV(FCF) + PV(TV)</p>
              </div>
              <div className="p-3 bg-background rounded-md text-xs space-y-1 border">
                <p className="font-semibold">Example: 5-Year DCF (WACC = 8.5%)</p>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono mt-1">
                    <thead><tr className="border-b text-muted-foreground"><th className="p-1 text-left">Year</th><th className="p-1 text-right">FCF</th><th className="p-1 text-right">Discount</th><th className="p-1 text-right">PV</th></tr></thead>
                    <tbody>
                      {[
                        ['1', '$112M', '÷ 1.085¹', '$103.2M'],
                        ['2', '$122M', '÷ 1.085²', '$103.7M'],
                        ['3', '$133M', '÷ 1.085³', '$104.1M'],
                        ['4', '$142M', '÷ 1.085⁴', '$102.5M'],
                        ['5', '$150M', '÷ 1.085⁵', '$99.9M'],
                        ['TV', '$2,563M', '÷ 1.085⁵', '$1,706M'],
                      ].map(([y, fcf, disc, pv], i) => (
                        <tr key={i} className={i === 5 ? 'border-t font-semibold' : ''}><td className="p-1">{y}</td><td className="p-1 text-right">{fcf}</td><td className="p-1 text-right text-muted-foreground text-[10px]">{disc}</td><td className="p-1 text-right">{pv}</td></tr>
                      ))}
                      <tr className="border-t-2 font-bold"><td className="p-1" colSpan={3}>Enterprise Value</td><td className="p-1 text-right text-primary">$2,219M</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-md font-mono text-sm space-y-1">
                <p className="font-semibold text-xs">Equity Bridge:</p>
                <p className="text-xs">Enterprise Value <span className="text-muted-foreground">$2,219M</span></p>
                <p className="text-xs">− Total Debt <span className="text-red-500">−$140M</span></p>
                <p className="text-xs">+ Cash <span className="text-green-600">+$150M</span></p>
                <p className="text-xs border-t pt-1"><strong className="text-primary">Equity Value = $2,229M</strong></p>
                <p className="text-xs mt-1">÷ Shares Outstanding: 95M</p>
                <p className="text-xs"><strong className="text-primary">Implied Share Price = $23.46</strong></p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sensitivity */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>Sensitivity Analysis</h3>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">DCF is highly sensitive to two key assumptions. The sensitivity table shows how implied share price changes across different WACC and terminal growth rate combinations.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="border-b"><th className="p-1.5 text-left">WACC ↓ / g →</th><th className="p-1.5 text-center">1.5%</th><th className="p-1.5 text-center">2.0%</th><th className="p-1.5 text-center font-bold text-primary">2.5%</th><th className="p-1.5 text-center">3.0%</th><th className="p-1.5 text-center">3.5%</th></tr></thead>
                  <tbody>
                    {[
                      ['7.5%', '$24.50', '$26.80', '$29.70', '$33.40', '$38.20'],
                      ['8.0%', '$21.80', '$23.60', '$25.90', '$28.70', '$32.30'],
                      ['8.5%', '$19.50', '$21.00', '$23.46', '$25.30', '$28.00'],
                      ['9.0%', '$17.60', '$18.80', '$20.30', '$22.30', '$24.80'],
                      ['9.5%', '$15.90', '$17.00', '$18.30', '$19.90', '$21.90'],
                    ].map(([wacc, ...prices], i) => (
                      <tr key={i} className={i === 2 ? 'bg-primary/5 font-semibold' : i % 2 ? 'bg-muted/20' : ''}>
                        <td className={`p-1.5 ${i === 2 ? 'text-primary font-bold' : ''}`}>{wacc}</td>
                        {prices.map((p, j) => (
                          <td key={j} className={`p-1.5 text-center ${i === 2 && j === 2 ? 'text-primary font-bold bg-primary/10 rounded' : ''}`}>{p}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>WACC ±1%</strong> can swing the share price by <strong>30–40%</strong>.</p>
                <p><strong>Terminal growth ±1%</strong> can swing the share price by <strong>20–30%</strong>.</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Key Assumptions */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Key Assumptions & Pitfalls</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { title: 'Revenue Growth', desc: 'Project realistic growth rates. Declining growth over time is more realistic than constant high growth.' },
                { title: 'Margin Expansion', desc: 'EBITDA margins may improve with scale, but be conservative. Mean-reversion toward industry averages.' },
                { title: 'Terminal Growth (g)', desc: 'Must be ≤ long-term GDP growth (2-3%). g ≥ WACC makes the model explode — never allow this.' },
                { title: 'WACC Stability', desc: 'Capital structure may change over time. Use target WACC, not current if restructuring expected.' },
                { title: 'CapEx vs D&A', desc: 'Mature companies: CapEx ≈ D&A. Growth companies: CapEx > D&A. Ratio matters for FCF.' },
                { title: 'Working Capital', desc: 'Growing companies need more NWC (ΔNWC negative to FCF). Watch receivables and inventory trends.' },
              ].map(({ title, desc }) => (
                <div key={title} className="p-3 rounded-lg border bg-muted/10">
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Data Format */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><TableIcon className="w-4 h-4" />Required Data Format</h3>
            <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono overflow-x-auto">
              <p>Metric,2019,2020,2021,2022,2023,2024</p>
              <p>Revenue,420,500,580,650,720,800</p>
              <p>EBITDA,100.8,125,150.8,169,187.2,210</p>
              <p>DepAmort,12.6,15,17.4,19.5,21.6,24</p>
              <p>CapEx,21,30,34.8,37.7,39.6,44</p>
              <p>NWC,42,50,58,65,72,80</p>
              <p>NetIncome,50.4,60,72.5,85,93.6,105</p>
              <p>TotalDebt,220,200,180,160,150,140</p>
              <p>Cash,65,80,95,110,120,150</p>
              <p>SharesOutstanding,100,100,100,98,97,95</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">First column = metric name, remaining columns = years. Revenue is required; all others optional.</p>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
            <p className="text-xs text-muted-foreground"><strong className="text-primary">Tip:</strong> Always run sensitivity analysis on WACC and terminal growth rate. Cross-check DCF results with CCA (trading multiples) and PTA (transaction multiples) for a triangulated valuation.</p>
            <p className="text-xs text-muted-foreground"><strong className="text-primary">Rule of thumb:</strong> If Terminal Value &gt; 75% of Enterprise Value, your projection period may be too short or your near-term FCFs are underestimated.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY CARDS
// ═══════════════════════════════════════════════════════════════════════════════

const SummaryCards = ({ output }: { output: DCFOutput }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    {[
      { label: 'Implied Price', value: fmtC(output.impliedSharePrice), sub: 'Per Share', icon: DollarSign },
      { label: 'Enterprise Value', value: fmt(output.enterpriseValue), sub: 'Total Firm Value', icon: Building2 },
      { label: 'Equity Value', value: fmt(output.equityValue), sub: 'After Net Debt', icon: PieChart },
      { label: 'EV/EBITDA', value: `${output.evToEbitda.toFixed(1)}x`, sub: 'Implied Multiple', icon: Activity },
      { label: 'TV % of EV', value: fmtP(output.tvPctOfEV), sub: 'Terminal Value Share', icon: Target },
    ].map(({ label, value, sub, icon: Icon }) => (
      <Card key={label}><CardContent className="p-6"><div className="space-y-2">
        <div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div></CardContent></Card>
    ))}
  </div>
);


// ═══════════════════════════════════════════════════════════════════════════════
// INPUT ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const InputRow = ({ label, value, onChange, suffix = '', min = 0, max = 100, step = 0.1, tooltip, highlight }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; min?: number; max?: number; step?: number; tooltip?: string; highlight?: boolean;
}) => (
  <div className={`space-y-1.5 ${highlight ? 'bg-primary/5 rounded-lg p-3 border border-primary/20' : ''}`}>
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      {tooltip && <span className="text-xs text-muted-foreground">{tooltip}</span>}
    </div>
    <div className="flex items-center gap-3">
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1" />
      <div className="flex items-center gap-1 min-w-[80px]">
        <Input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="h-8 w-20 text-right text-sm font-mono" step={step} />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  </div>
);


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV_CONTENT = `Metric,2019,2020,2021,2022,2023,2024
Revenue,420.0,500.0,580.0,650.0,720.0,800.0
EBITDA,100.8,125.0,150.8,169.0,187.2,210.0
DepAmort,12.6,15.0,17.4,19.5,21.6,24.0
CapEx,21.0,30.0,34.8,37.7,39.6,44.0
NWC,42.0,50.0,58.0,65.0,72.0,80.0
NetIncome,50.4,60.0,72.5,85.0,93.6,105.0
TotalDebt,220.0,200.0,180.0,160.0,150.0,140.0
Cash,65.0,80.0,95.0,110.0,120.0,150.0
SharesOutstanding,100.0,100.0,100.0,98.0,97.0,95.0`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_financials.csv';
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
            Prepare your financial data in this format before uploading
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Structure */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Rows = Financial metrics, Columns = Years. First column is the metric name, remaining columns are year values.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 text-left font-semibold border-r">Metric</th>
                      <th className="p-2 text-right">2019</th>
                      <th className="p-2 text-right">2020</th>
                      <th className="p-2 text-right">2021</th>
                      <th className="p-2 text-right">2022</th>
                      <th className="p-2 text-right">2023</th>
                      <th className="p-2 text-right">2024</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Revenue', '420', '500', '580', '650', '720', '800'],
                      ['EBITDA', '100.8', '125', '150.8', '169', '187.2', '210'],
                      ['DepAmort', '12.6', '15', '17.4', '19.5', '21.6', '24'],
                      ['CapEx', '21', '30', '34.8', '37.7', '39.6', '44'],
                      ['NWC', '42', '50', '58', '65', '72', '80'],
                      ['TotalDebt', '220', '200', '180', '160', '150', '140'],
                      ['Cash', '65', '80', '95', '110', '120', '150'],
                      ['SharesOutstanding', '100', '100', '100', '98', '97', '95'],
                    ].map(([metric, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{metric}</td>
                        {vals.map((v, j) => <td key={j} className="p-2 text-right">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Metric Names */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Accepted Metric Names</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'Revenue', required: true, aliases: 'Sales, Turnover, Net Revenue, Net Sales' },
                  { name: 'EBITDA', required: false, aliases: '' },
                  { name: 'DepAmort', required: false, aliases: 'Depreciation, D&A, Depreciation and Amortization' },
                  { name: 'CapEx', required: false, aliases: 'Capital Expenditure, Capital Expenditures' },
                  { name: 'NWC', required: false, aliases: 'Net Working Capital, Working Capital' },
                  { name: 'NetIncome', required: false, aliases: 'Net Income, Net Profit, Net Earnings' },
                  { name: 'TotalDebt', required: false, aliases: 'Total Debt, Debt, Long Term Debt' },
                  { name: 'Cash', required: false, aliases: 'Cash and Equivalents, Cash & Equivalents' },
                  { name: 'SharesOutstanding', required: false, aliases: 'Shares Outstanding, Shares, Diluted Shares' },
                ].map(({ name, required, aliases }) => (
                  <div key={name} className={`p-2.5 rounded-lg border text-sm ${required ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{name}</span>
                      {required && <Badge variant="default" className="text-[10px] px-1.5 py-0">Required</Badge>}
                    </div>
                    {aliases && <p className="text-xs text-muted-foreground mt-0.5">Also accepts: {aliases}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />Tips
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• <strong>Revenue is the only required metric.</strong> All others are optional but improve auto-fill quality.</li>
                <li>• Use consistent units (e.g., all in $M or all in $K). The model does not convert units.</li>
                <li>• At least 3 years of data is recommended for growth rate estimation.</li>
                <li>• Column headers must be years (e.g., 2019, 2020, 2021...).</li>
                <li>• Metric names are case-insensitive: "revenue", "Revenue", "REVENUE" all work.</li>
                <li>• Rows the system doesn&apos;t recognize will be shown as &quot;unmapped&quot; — they won&apos;t cause errors.</li>
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
// INTRO PAGE — Two paths: Upload Data or Manual Input
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
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl">DCF Valuation Model</CardTitle>
          <CardDescription className="text-base mt-2">
            Intrinsic valuation through discounted cash flow analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, title: '5-Year Projection', desc: 'Revenue, EBITDA, and FCF forecasts' },
              { icon: Calculator, title: 'Terminal Value', desc: 'Gordon Growth Model perpetuity' },
              { icon: Target, title: 'Sensitivity', desc: 'WACC × Growth rate matrix' },
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
                    <CardTitle className="text-base">Upload Financial Data</CardTitle>
                    <CardDescription className="text-xs">Auto-fill assumptions from historical financials</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-primary">Data detected — ready to analyze</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your uploaded financial data will be used to automatically calculate growth rates, margins, and balance sheet values.
                    </p>
                    <Button onClick={onStartWithData} className="w-full" size="lg">
                      <Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with your company&apos;s historical financial statements to auto-populate model assumptions.
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Metric | 2019 | 2020 | 2021 | ...</p>
                      <p className="text-muted-foreground">Revenue, EBITDA, CapEx, ...</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample
                    </Button>
                    {parseError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
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
                    <CardTitle className="text-base">Manual Input</CardTitle>
                    <CardDescription className="text-xs">Enter assumptions manually with defaults</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Start with pre-filled default values and adjust all assumptions manually using sliders and inputs.
                </p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-muted-foreground" />Revenue, growth rates, margins</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-muted-foreground" />WACC, terminal growth rate</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-muted-foreground" />Balance sheet (debt, cash, shares)</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-muted-foreground" />Real-time calculation as you adjust</div>
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
              Both paths lead to the same model. Uploading data simply pre-fills the assumptions — you can always override any value afterward.
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

export default function DCFPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: DCFPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Data states
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dataApplied, setDataApplied] = useState(false);

  // DCF inputs
  const [inputs, setInputs] = useState<DCFInput>(DEFAULT_INPUTS);

  // ─── Parse uploaded data ───────────────────────────────────────────────
  useEffect(() => {
    if (!data || data.length === 0) {
      setHistoricalData(null);
      setHistoricalStats(null);
      setParseError(null);
      return;
    }
    try {
      const parsed = parseFinancialData(data);
      const stats = computeHistoricalStats(parsed);
      setHistoricalData(parsed);
      setHistoricalStats(stats);
      setParseError(null);
    } catch (err: any) {
      setParseError(err.message);
      setHistoricalData(null);
      setHistoricalStats(null);
    }
  }, [data]);

  // ─── Apply suggestions to inputs ──────────────────────────────────────
  const applyHistoricalData = useCallback(() => {
    if (!historicalStats) return;
    const s = suggestAssumptions(historicalStats);
    setInputs(prev => ({
      ...prev,
      ...(s.baseRevenue != null && { baseRevenue: s.baseRevenue }),
      ...(s.revenueGrowthRates && { revenueGrowthRates: s.revenueGrowthRates }),
      ...(s.ebitdaMargin != null && { ebitdaMargin: s.ebitdaMargin }),
      ...(s.ebitdaMarginTerminal != null && { ebitdaMarginTerminal: s.ebitdaMarginTerminal }),
      ...(s.depreciationPctRevenue != null && { depreciationPctRevenue: s.depreciationPctRevenue }),
      ...(s.capexPctRevenue != null && { capexPctRevenue: s.capexPctRevenue }),
      ...(s.nwcPctRevenue != null && { nwcPctRevenue: s.nwcPctRevenue }),
      ...(s.totalDebt != null && { totalDebt: s.totalDebt }),
      ...(s.cashEquivalents != null && { cashEquivalents: s.cashEquivalents }),
      ...(s.sharesOutstanding != null && { sharesOutstanding: s.sharesOutstanding }),
    }));
    setDataApplied(true);
    toast({ title: "Applied!", description: "Assumptions populated from historical data." });
  }, [historicalStats, toast]);

  // ─── Compute DCF (reactive) ───────────────────────────────────────────
  const output = useMemo(() => {
    try { return runDCF(inputs); } catch { return null; }
  }, [inputs]);

  const updateGrowth = (idx: number, val: number) => {
    setInputs(prev => {
      const rates = [...prev.revenueGrowthRates];
      rates[idx] = val;
      return { ...prev, revenueGrowthRates: rates };
    });
  };

  // ─── Chart data: Historical + Projected ────────────────────────────────
  const combinedChartData = useMemo(() => {
    if (!output) return [];
    const result: any[] = [];

    // Historical
    if (historicalStats) {
      historicalStats.years.forEach((year, i) => {
        result.push({
          label: String(year),
          type: 'historical',
          revenue: historicalStats.revenueValues[i],
          ebitda: historicalStats.ebitdaValues?.[i] ?? null,
          ebitdaMargin: historicalStats.ebitdaMargins?.[i] ?? null,
        });
      });
    }

    // Projected
    output.projections.forEach(p => {
      result.push({
        label: String(p.year),
        type: 'projected',
        revenue: p.revenue,
        ebitda: p.ebitda,
        ebitdaMargin: p.ebitdaMargin,
        fcf: p.fcf,
        pvFCF: p.pvFCF,
      });
    });

    return result;
  }, [output, historicalStats]);

  // ─── Export ────────────────────────────────────────────────────────────
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `DCF_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  const handleDownloadCSV = useCallback(() => {
    if (!output) return;
    let csv = "DCF MODEL OUTPUT\n\n";
    csv += Papa.unparse(output.projections.map(p => ({
      Year: p.year, Revenue: p.revenue.toFixed(2), Growth: fmtP(p.growthRate),
      EBITDA: p.ebitda.toFixed(2), Margin: fmtP(p.ebitdaMargin),
      FCF: p.fcf.toFixed(2), PV_FCF: p.pvFCF.toFixed(2),
    }))) + "\n\n";
    csv += `Enterprise Value,${output.enterpriseValue.toFixed(2)}\n`;
    csv += `Equity Value,${output.equityValue.toFixed(2)}\n`;
    csv += `Implied Share Price,${output.impliedSharePrice.toFixed(2)}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DCF_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [output, toast]);

  // ─── Intro ─────────────────────────────────────────────────────────────
  if (showIntro) return (
    <IntroPage
      hasUploadedData={!!historicalStats}
      parseError={parseError}
      onStartWithData={() => {
        applyHistoricalData();
        setShowIntro(false);
      }}
      onStartManual={() => setShowIntro(false)}
    />
  );
  if (!output) return <div className="p-8 text-center text-muted-foreground">Invalid inputs. WACC must exceed terminal growth rate.</div>;

  const tvWarning = output.tvPctOfEV > 75;
  const isHealthy = output.impliedSharePrice > 0 && isFinite(output.impliedSharePrice);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">DCF Valuation Model</h1><p className="text-muted-foreground mt-1">Discounted Cash Flow Analysis</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <DCFGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Data Upload Status ══ */}
      {parseError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Parse Error</AlertTitle>
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {historicalStats && !dataApplied && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold">Historical Data Detected</p>
                  <p className="text-sm text-muted-foreground">
                    {historicalStats.years.length} years ({historicalStats.years[0]}–{historicalStats.years[historicalStats.years.length - 1]}) · 
                    {Object.keys(historicalData?.metrics || {}).length} metrics found
                    {historicalData?.unmapped.length ? ` · ${historicalData.unmapped.length} unmapped rows` : ''}
                  </p>
                </div>
              </div>
              <Button onClick={applyHistoricalData}><Sparkles className="w-4 h-4 mr-2" />Auto-Fill Assumptions</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dataApplied && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Assumptions Applied from Historical Data</AlertTitle>
          <AlertDescription>
            Growth rates, margins, and balance sheet values have been populated. You can still adjust them below.
          </AlertDescription>
        </Alert>
      )}

      {/* ══ Historical Data Overview ══ */}
      {historicalStats && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><TableIcon className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Historical Financials</CardTitle><CardDescription>{historicalStats.years[0]}–{historicalStats.years[historicalStats.years.length - 1]} uploaded data summary</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Historical Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Revenue CAGR', value: historicalStats.revenueCagr != null ? fmtP(historicalStats.revenueCagr) : '—' },
                { label: 'Avg EBITDA Margin', value: historicalStats.avgEbitdaMargin != null ? fmtP(historicalStats.avgEbitdaMargin) : '—' },
                { label: 'Avg CapEx/Rev', value: historicalStats.avgCapexPct != null ? fmtP(historicalStats.avgCapexPct) : '—' },
                { label: 'Avg D&A/Rev', value: historicalStats.avgDepAmortPct != null ? fmtP(historicalStats.avgDepAmortPct) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold mt-1">{value}</p>
                </div>
              ))}
            </div>

            {/* Historical Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {historicalStats.years.map(y => <TableHead key={y} className="text-right">{y}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(historicalData?.metrics || {}).map(([metric, values]) => (
                    <TableRow key={metric}>
                      <TableCell className="font-medium">{metric}</TableCell>
                      {values.map((v, i) => (
                        <TableCell key={i} className="text-right font-mono">{v != null ? fmt(v) : '—'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* Revenue Growth row */}
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground pl-6">Revenue Growth</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                    {historicalStats.revenueGrowthRates.map((g, i) => (
                      <TableCell key={i} className="text-right font-mono text-muted-foreground">{g != null ? fmtP(g) : '—'}</TableCell>
                    ))}
                  </TableRow>
                  {/* EBITDA Margin row */}
                  {historicalStats.ebitdaMargins && (
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground pl-6">EBITDA Margin</TableCell>
                      {historicalStats.ebitdaMargins.map((m, i) => (
                        <TableCell key={i} className="text-right font-mono text-muted-foreground">{m != null ? fmtP(m) : '—'}</TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Historical Revenue + EBITDA Chart */}
            {historicalStats.revenueValues.some(v => v != null) && (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={historicalStats.years.map((y, i) => ({
                    year: y,
                    revenue: historicalStats.revenueValues[i],
                    ebitda: historicalStats.ebitdaValues?.[i] ?? null,
                    margin: historicalStats.ebitdaMargins?.[i] ?? null,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" tickFormatter={v => `$${v}`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: any, name: string) => [name === 'margin' ? `${v?.toFixed(1)}%` : `$${v?.toFixed(1)}`, name === 'margin' ? 'EBITDA Margin' : name === 'ebitda' ? 'EBITDA' : 'Revenue']} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill={COLORS.historical} name="Revenue" opacity={0.7} />
                    <Bar yAxisId="left" dataKey="ebitda" fill={COLORS.secondary} name="EBITDA" opacity={0.7} />
                    <Line yAxisId="right" dataKey="margin" stroke={COLORS.primary} strokeWidth={2} name="EBITDA Margin %" dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══ Assumptions Input ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div>
            <div><CardTitle>Model Assumptions</CardTitle><CardDescription>Revenue, margin, and discount rate assumptions {dataApplied && '(auto-filled from data)'}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Revenue & Growth */}
          <div>
            <h4 className="font-semibold text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Revenue & Growth</h4>
            <div className="space-y-4">
              <InputRow label="Base Revenue ($M)" value={inputs.baseRevenue} onChange={v => setInputs(p => ({ ...p, baseRevenue: v }))} min={0} max={100000} step={10} highlight={dataApplied} tooltip={dataApplied ? 'From data' : ''} />
              <div>
                <Label className="text-sm font-medium mb-2 block">Revenue Growth Rates (Year 1–5)</Label>
                <div className="grid grid-cols-5 gap-3">
                  {inputs.revenueGrowthRates.map((rate, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Y{i + 1}</Label>
                      <Input type="number" value={rate} onChange={e => updateGrowth(i, parseFloat(e.target.value) || 0)} className="h-9 text-right font-mono text-sm" step={0.5} />
                      <span className="text-xs text-muted-foreground text-right block">%</span>
                    </div>
                  ))}
                </div>
                {historicalStats?.revenueCagr != null && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Info className="w-3 h-3" />Historical CAGR: {fmtP(historicalStats.revenueCagr)}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Margins */}
          <div>
            <h4 className="font-semibold text-sm mb-4 flex items-center gap-2"><Percent className="w-4 h-4 text-primary" />Margins & Operating</h4>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              <InputRow label="EBITDA Margin (Initial)" value={inputs.ebitdaMargin} onChange={v => setInputs(p => ({ ...p, ebitdaMargin: v }))} suffix="%" max={80} step={0.5} />
              <InputRow label="EBITDA Margin (Terminal)" value={inputs.ebitdaMarginTerminal} onChange={v => setInputs(p => ({ ...p, ebitdaMarginTerminal: v }))} suffix="%" max={80} step={0.5} />
              <InputRow label="D&A (% of Revenue)" value={inputs.depreciationPctRevenue} onChange={v => setInputs(p => ({ ...p, depreciationPctRevenue: v }))} suffix="%" max={30} step={0.5} />
              <InputRow label="CapEx (% of Revenue)" value={inputs.capexPctRevenue} onChange={v => setInputs(p => ({ ...p, capexPctRevenue: v }))} suffix="%" max={30} step={0.5} />
              <InputRow label="NWC (% of Revenue)" value={inputs.nwcPctRevenue} onChange={v => setInputs(p => ({ ...p, nwcPctRevenue: v }))} suffix="%" max={40} step={0.5} />
              <InputRow label="Tax Rate" value={inputs.taxRate} onChange={v => setInputs(p => ({ ...p, taxRate: v }))} suffix="%" max={50} step={0.5} />
            </div>
          </div>

          <Separator />

          {/* WACC & Terminal */}
          <div>
            <h4 className="font-semibold text-sm mb-4 flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" />Discount & Terminal</h4>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              <InputRow label="WACC" value={inputs.wacc} onChange={v => setInputs(p => ({ ...p, wacc: v }))} suffix="%" min={1} max={25} step={0.25} tooltip="Cost of capital" />
              <InputRow label="Terminal Growth" value={inputs.terminalGrowthRate} onChange={v => setInputs(p => ({ ...p, terminalGrowthRate: v }))} suffix="%" min={0} max={5} step={0.25} tooltip="≤ GDP growth" />
            </div>
          </div>

          <Separator />

          {/* Balance Sheet */}
          <div>
            <h4 className="font-semibold text-sm mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />Balance Sheet</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Total Debt ($M)', value: inputs.totalDebt, key: 'totalDebt' },
                { label: 'Cash ($M)', value: inputs.cashEquivalents, key: 'cashEquivalents' },
                { label: 'Shares Outstanding (M)', value: inputs.sharesOutstanding, key: 'sharesOutstanding' },
              ].map(({ label, value, key }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-medium">{label}</Label>
                  <Input type="number" value={value} onChange={e => setInputs(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))} className="h-9 font-mono text-right" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Detailed Model Output ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Detailed Model Output</h2><p className="text-sm text-muted-foreground">Full projections and sensitivity</p></div>
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
          <h2 className="text-2xl font-bold">DCF Valuation Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Base Revenue: {fmt(inputs.baseRevenue)} | WACC: {fmtP(inputs.wacc)} | g: {fmtP(inputs.terminalGrowthRate)} | {new Date().toLocaleDateString()}</p>
        </div>

        {/* Valuation Summary (Key Findings) */}
        <SummaryCards output={output} />
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Valuation Summary</CardTitle><CardDescription>Key findings from DCF model</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`rounded-xl p-6 space-y-4 border ${isHealthy ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isHealthy ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
              <div className="space-y-3">
                {[
                  `Implied share price: ${fmtC(output.impliedSharePrice)} (WACC ${fmtP(inputs.wacc)}, terminal growth ${fmtP(inputs.terminalGrowthRate)}).`,
                  `Enterprise Value: ${fmt(output.enterpriseValue)}. Terminal value = ${fmtP(output.tvPctOfEV)} of EV.${tvWarning ? ' High TV dependency.' : ''}`,
                  `Year-5 revenue: ${fmt(output.projections[4].revenue)}, EBITDA margin: ${fmtP(output.projections[4].ebitdaMargin)}, FCF: ${fmt(output.projections[4].fcf)}.`,
                  `Implied multiples: ${output.evToEbitda.toFixed(1)}x EV/EBITDA, ${output.evToRevenue.toFixed(1)}x EV/Revenue.`,
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3"><span className={`font-bold ${isHealthy ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{text}</p></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valuation Bridge */}
        <Card>
          <CardHeader><CardTitle>Valuation Bridge</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {[
                  ['Sum of PV of FCFs', output.sumPVFCF],
                  ['(+) PV of Terminal Value', output.pvTerminalValue],
                  ['Enterprise Value', output.enterpriseValue, true],
                  ['(−) Total Debt', -inputs.totalDebt, false, true],
                  ['(+) Cash & Equivalents', inputs.cashEquivalents],
                  ['Equity Value', output.equityValue, true],
                  ['(÷) Shares Outstanding', inputs.sharesOutstanding, false, false, true],
                  ['Implied Share Price', output.impliedSharePrice, true, false, false, true],
                ].map(([label, value, bold, neg, isShares, isPrice]: any) => (
                  <TableRow key={label as string} className={bold ? 'border-t-2' : ''}>
                    <TableCell className={`${bold ? 'font-bold' : 'font-medium'} ${isPrice ? 'text-primary text-lg' : ''}`}>{label}</TableCell>
                    <TableCell className={`text-right font-mono ${bold ? 'font-bold' : ''} ${neg ? 'text-red-600' : ''} ${isPrice ? 'text-primary text-lg' : ''}`}>
                      {isShares ? `${fmt(value as number, 1)}M` : isPrice ? fmtC(value as number) : fmt(value as number, 2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Revenue & EBITDA Chart */}
        {combinedChartData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Revenue & EBITDA — Historical vs Projected</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`} />
                    <Tooltip formatter={(v: any, name: string) => [`$${Number(v).toFixed(1)}`, name]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill={COLORS.primary} opacity={0.8}>
                      {combinedChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.type === 'historical' ? COLORS.historical : COLORS.primary} opacity={entry.type === 'historical' ? 0.6 : 0.85} />
                      ))}
                    </Bar>
                    <Bar dataKey="ebitda" name="EBITDA" fill={COLORS.secondary} opacity={0.7}>
                      {combinedChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.type === 'historical' ? '#9ca3af' : COLORS.secondary} opacity={entry.type === 'historical' ? 0.5 : 0.75} />
                      ))}
                    </Bar>
                    {historicalStats && (
                      <ReferenceLine x={String(historicalStats.years[historicalStats.years.length - 1])} stroke={COLORS.primary} strokeDasharray="5 5" label={{ value: 'Projected →', position: 'top', fill: COLORS.primary, fontSize: 11 }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FCF Chart */}
        <Card>
          <CardHeader><CardTitle>Free Cash Flow — Nominal vs Present Value</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={output.projections.map(p => ({ label: `Y${p.year - new Date().getFullYear()}`, fcf: p.fcf, pvFCF: p.pvFCF }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: any, name: string) => [`$${Number(v).toFixed(1)}`, name === 'fcf' ? 'FCF (Nominal)' : 'PV of FCF']} />
                  <Legend />
                  <Bar dataKey="fcf" fill={COLORS.fcf} name="FCF (Nominal)" opacity={0.8} />
                  <Bar dataKey="pvFCF" fill={COLORS.secondary} name="PV of FCF" opacity={0.75} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>5-Year FCF Projections</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Metric</TableHead>{output.projections.map(p => <TableHead key={p.year} className="text-right">Y{p.year - new Date().getFullYear()} ({p.year})</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {([
                    ['Revenue', 'revenue'], ['  Growth Rate', 'growthRate', true, true],
                    ['EBITDA', 'ebitda'], ['  Margin', 'ebitdaMargin', true, true],
                    ['  (−) D&A', 'depreciation', true], ['EBIT', 'ebit'],
                    ['  (−) Taxes', 'taxes', true], ['NOPAT', 'nopat'],
                    ['  (+) D&A', 'depreciation', true], ['  (−) CapEx', 'capex', true],
                    ['  (−) ΔNWC', 'changeNWC', true],
                    ['Free Cash Flow', 'fcf', false, false, true],
                    ['  Discount Factor', 'discountFactor', true, false, false, true],
                    ['PV of FCF', 'pvFCF', false, false, true],
                  ] as any[]).map(([label, key, muted, isPct, isBold, isDF]) => (
                    <TableRow key={label} className={isBold ? 'border-t-2 font-semibold' : ''}>
                      <TableCell className={`${isBold ? 'font-bold' : 'font-medium'} ${muted ? 'text-muted-foreground pl-6' : ''}`}>{label}</TableCell>
                      {output.projections.map(p => (
                        <TableCell key={p.year} className={`text-right font-mono ${muted ? 'text-muted-foreground' : ''} ${isBold ? 'font-bold' : ''} ${key === 'fcf' && (p as any)[key] < 0 ? 'text-red-600' : ''}`}>
                          {isDF ? (p as any)[key].toFixed(4) : isPct ? fmtP((p as any)[key]) : fmt((p as any)[key], 1)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Sensitivity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Sensitivity Analysis<Badge variant="outline" className="text-xs">WACC × Terminal Growth</Badge></CardTitle>
            <CardDescription>Implied share price under different assumptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="text-center">WACC ↓ \ g →</TableHead>{output.sensitivityGrowth.map(g => <TableHead key={g} className="text-center">{fmtP(g)}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {output.sensitivityWACC.map((w, i) => (
                    <TableRow key={w}>
                      <TableCell className="font-medium text-center">{fmtP(w)}</TableCell>
                      {output.sensitivityMatrix[i].map((price, j) => {
                        const isBase = Math.abs(w - inputs.wacc) < 0.01 && Math.abs(output.sensitivityGrowth[j] - inputs.terminalGrowthRate) < 0.01;
                        return (
                          <TableCell key={j} className={`text-center font-mono ${isBase ? 'bg-primary/10 font-bold text-primary' : ''} ${price == null ? 'text-muted-foreground' : price < 0 ? 'text-red-600' : ''}`}>
                            {price == null ? 'N/A' : fmtC(price)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Highlighted = base case. N/A = WACC ≤ terminal growth (invalid).</p>
          </CardContent>
        </Card>

        {/* Written Summary */}

        {/* ── Calculation Breakdown: FCF ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              Free Cash Flow Breakdown
              <Badge variant="outline" className="text-[10px]">Year 1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {output.projections.length > 0 && (() => {
              const p = output.projections[0];
              return (
                <div className="space-y-3">
                  <div className="rounded-lg border overflow-hidden">
                    <div className="divide-y">
                      {[
                        { label: 'Revenue', value: fmt(p.revenue), color: '' },
                        { label: 'EBITDA', value: fmt(p.ebitda), color: '' },
                        { label: '(−) D&A', value: fmt(p.depreciation), color: 'text-red-500' },
                        { label: 'EBIT', value: fmt(p.ebit), color: '', bold: true },
                        { label: '(−) Taxes', value: fmt(p.taxes), color: 'text-red-500' },
                        { label: 'NOPAT', value: fmt(p.nopat), color: '', bold: true },
                        { label: '(+) D&A add-back', value: `+${fmt(p.depreciation)}`, color: 'text-green-600' },
                        { label: '(−) CapEx', value: fmt(p.capex), color: 'text-red-500' },
                        { label: '(−) ΔNWC', value: p.changeNWC >= 0 ? fmt(p.changeNWC) : `+${fmt(Math.abs(p.changeNWC))}`, color: p.changeNWC >= 0 ? 'text-red-500' : 'text-green-600' },
                        { label: 'Free Cash Flow', value: fmt(p.fcf), color: 'text-primary font-bold', final: true },
                      ].map(({ label, value, color, bold, final }, i) => (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                          <span className={`text-sm ${final || bold ? 'font-semibold' : ''}`}>{label}</span>
                          <span className={`font-mono text-sm ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
                    <p>Revenue = {fmt(inputs.baseRevenue)} × (1 + {fmtP(inputs.revenueGrowthRates[0])}) = {fmt(p.revenue)}</p>
                    <p>EBITDA = {fmt(p.revenue)} × {fmtP(p.ebitdaMargin)} = {fmt(p.ebitda)}</p>
                    <p>NOPAT = ({fmt(p.ebitda)} − {fmt(p.depreciation)}) × (1 − {fmtP(inputs.taxRate)}) = {fmt(p.nopat)}</p>
                    <p className="text-primary font-semibold">FCF = {fmt(p.nopat)} + {fmt(p.depreciation)} − {fmt(p.capex)} − {fmt(p.changeNWC)} = {fmt(p.fcf)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Showing Year 1 ({p.year}). Full projections in the table below.</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* ── Calculation Breakdown: WACC ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              Discount Rate (WACC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="divide-y">
                  {[
                    { label: 'WACC', value: fmtP(inputs.wacc), color: 'text-primary font-bold' },
                    { label: 'Terminal Growth Rate (g)', value: fmtP(inputs.terminalGrowthRate), color: '' },
                    { label: 'Discount Factor — Year 1', value: output.projections[0]?.discountFactor.toFixed(4), color: '' },
                    { label: 'Discount Factor — Year 3', value: output.projections[2]?.discountFactor.toFixed(4), color: '' },
                    { label: 'Discount Factor — Year 5', value: output.projections[4]?.discountFactor.toFixed(4), color: '' },
                  ].map(({ label, value, color }, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 ${i === 0 ? 'bg-primary/5' : ''}`}>
                      <span className={`text-sm ${i === 0 ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
                      <span className={`font-mono text-sm ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
                <p>Discount Factor = 1 ÷ (1 + WACC)ᵗ</p>
                <p>Year 1: 1 ÷ (1 + {fmtP(inputs.wacc)})¹ = {output.projections[0]?.discountFactor.toFixed(4)}</p>
                <p>Year 5: 1 ÷ (1 + {fmtP(inputs.wacc)})⁵ = {output.projections[4]?.discountFactor.toFixed(4)}</p>
                <p className="text-muted-foreground pt-1">WACC = (E/V × Ke) + (D/V × Kd × (1 − T))  — See Guide for full derivation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Calculation Breakdown: Terminal Value ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              Terminal Value
              <Badge variant="outline" className="text-[10px]">{fmtP(output.tvPctOfEV)} of EV</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg font-mono text-sm text-center space-y-1">
                <p className="text-muted-foreground text-xs">Gordon Growth (Perpetuity) Model</p>
                <p className="text-primary font-semibold">TV = FCFₙ × (1 + g) ÷ (WACC − g)</p>
              </div>
              {output.projections.length >= 5 && (() => {
                const lastFCF = output.projections[4].fcf;
                const g = inputs.terminalGrowthRate;
                const w = inputs.wacc;
                const numerator = lastFCF * (1 + g / 100);
                const denominator = (w / 100) - (g / 100);
                return (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="divide-y">
                      {[
                        { label: 'Last Year FCF (Year 5)', value: fmt(lastFCF), color: '' },
                        { label: 'Terminal Growth Rate (g)', value: fmtP(g), color: '' },
                        { label: 'FCF × (1 + g)', value: fmt(numerator), color: '' },
                        { label: 'WACC − g', value: `${fmtP(w)} − ${fmtP(g)} = ${fmtP(w - g)}`, color: '' },
                        { label: 'Terminal Value', value: fmt(output.terminalValue), color: 'text-primary font-bold' },
                        { label: 'PV of Terminal Value', value: fmt(output.pvTerminalValue), color: 'text-primary' },
                      ].map(({ label, value, color }, i) => (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 ${i === 4 ? 'bg-primary/5' : ''}`}>
                          <span className={`text-sm ${i === 4 ? 'font-semibold' : ''}`}>{label}</span>
                          <span className={`font-mono text-sm ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
                <p>TV = {fmt(output.projections[4]?.fcf)} × (1 + {fmtP(inputs.terminalGrowthRate)}) ÷ ({fmtP(inputs.wacc)} − {fmtP(inputs.terminalGrowthRate)})</p>
                <p>= {fmt(output.projections[4]?.fcf * (1 + inputs.terminalGrowthRate / 100))} ÷ {fmtP(inputs.wacc - inputs.terminalGrowthRate)}</p>
                <p className="text-primary font-semibold">= {fmt(output.terminalValue)}</p>
                <p className="text-muted-foreground pt-1">PV(TV) = {fmt(output.terminalValue)} ÷ (1 + {fmtP(inputs.wacc)})⁵ = {fmt(output.pvTerminalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Calculation Breakdown: EV Bridge ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
              EV → Equity → Share Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="divide-y">
                  {output.projections.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-sm text-muted-foreground">PV of FCF Year {i + 1} ({p.year})</span>
                      <span className="font-mono text-sm">{fmt(p.pvFCF)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/20 font-medium">
                    <span className="text-sm">Σ PV of FCFs</span>
                    <span className="font-mono text-sm">{fmt(output.sumPVFCF)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-sm text-muted-foreground">(+) PV of Terminal Value</span>
                    <span className="font-mono text-sm">{fmt(output.pvTerminalValue)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-primary/5 font-semibold border-t-2">
                    <span className="text-sm">Enterprise Value</span>
                    <span className="font-mono text-sm text-primary">{fmt(output.enterpriseValue)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-sm text-red-600">(−) Total Debt</span>
                    <span className="font-mono text-sm text-red-600">−{fmt(inputs.totalDebt)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-sm text-green-600">(+) Cash & Equivalents</span>
                    <span className="font-mono text-sm text-green-600">+{fmt(inputs.cashEquivalents)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-primary/5 font-semibold border-t-2">
                    <span className="text-sm">Equity Value</span>
                    <span className="font-mono text-sm text-primary">{fmt(output.equityValue)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-sm text-muted-foreground">(÷) Shares Outstanding</span>
                    <span className="font-mono text-sm">{inputs.sharesOutstanding.toFixed(1)}M</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-3 bg-primary/10 font-bold border-t-2">
                    <span className="text-lg">Implied Share Price</span>
                    <span className="font-mono text-lg text-primary">{fmtC(output.impliedSharePrice)}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
                <p>EV = {fmt(output.sumPVFCF)} + {fmt(output.pvTerminalValue)} = {fmt(output.enterpriseValue)}</p>
                <p>Equity = {fmt(output.enterpriseValue)} − {fmt(inputs.totalDebt)} + {fmt(inputs.cashEquivalents)} = {fmt(output.equityValue)}</p>
                <p className="text-primary font-semibold">Price = {fmt(output.equityValue)} ÷ {inputs.sharesOutstanding.toFixed(1)}M = {fmtC(output.impliedSharePrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projections */}

        {tvWarning && (
          <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>High TV Dependency</AlertTitle><AlertDescription>Terminal value = {fmtP(output.tvPctOfEV)} of EV.</AlertDescription></Alert>
        )}
        <Card>
          <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Valuation Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A {PROJECTION_YEARS}-year DCF analysis was conducted with base revenue of {fmt(inputs.baseRevenue)}, discounted at {fmtP(inputs.wacc)} WACC.
                  {historicalStats && ` Based on ${historicalStats.years.length} years of historical data (${historicalStats.years[0]}–${historicalStats.years[historicalStats.years.length - 1]}).`}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Revenue is projected to grow from {fmt(inputs.baseRevenue)} to {fmt(output.projections[4].revenue)} by Year 5, 
                  with EBITDA margins converging from {fmtP(inputs.ebitdaMargin)} to {fmtP(inputs.ebitdaMarginTerminal)}. 
                  Year-5 FCF is {fmt(output.projections[4].fcf)}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Terminal value ({fmt(output.terminalValue)}) was estimated using the Gordon Growth Model at {fmtP(inputs.terminalGrowthRate)}, 
                  contributing {fmtP(output.tvPctOfEV)} of Enterprise Value ({fmt(output.enterpriseValue)}).
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  After net debt of {fmt(output.netDebt)}, Equity Value is <strong>{fmt(output.equityValue)}</strong>, 
                  implying <strong>{fmtC(output.impliedSharePrice)}</strong> per share across {fmt(inputs.sharesOutstanding)}M shares.
                </p>
                {tvWarning && (
                  <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                    <strong>Note:</strong> Terminal value accounts for {fmtP(output.tvPctOfEV)} of EV. Consider extending the projection period or stress-testing terminal assumptions.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Assumptions
        </Button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, BookOpen, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, Calculator, Lightbulb, ChevronRight, Upload,
  Plus, X, Settings2, CheckCircle2, Layers,
  AlertTriangle, Activity, BarChart3,
  ArrowUpRight, ArrowDownRight, Link2, RefreshCw, Zap
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

interface HistoricalYear {
  label: string;
  revenue: number;
  cogs: number;
  opex: number;
  da: number;
  interestExpense: number;
  otherIncome: number;
  taxRate: number;
  // BS
  cash: number;
  accountsReceivable: number;
  inventory: number;
  otherCurrentAssets: number;
  ppeNet: number;
  otherLTAssets: number;
  accountsPayable: number;
  accruedExpenses: number;
  currentDebt: number;
  longTermDebt: number;
  otherLTLiabilities: number;
  commonStock: number;
  retainedEarnings: number;
}

interface Assumptions {
  projectionYears: number;
  revenueGrowthPct: number;
  cogsPct: number;
  opexGrowthPct: number;
  daPct: number;           // % of prior PP&E
  taxRatePct: number;
  interestRatePct: number;
  // Working capital (days)
  dso: number;
  dio: number;
  dpo: number;
  // CapEx & Financing
  capexPct: number;        // % of revenue
  dividendsPct: number;    // % of net income
  debtRepayment: number;   // $K per year
  newDebtIssuance: number; // $K per year
  // Other
  otherCurrentAssetsPct: number;  // % of revenue
  accruedExpensesPct: number;     // % of opex
  otherLTAssetGrowth: number;
  otherLTLiabGrowth: number;
}

interface ProjectedYear {
  label: string;
  // IS
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  da: number;
  ebit: number;
  interestExpense: number;
  otherIncome: number;
  ebt: number;
  tax: number;
  netIncome: number;
  // BS
  cash: number;
  accountsReceivable: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  ppeNet: number;
  otherLTAssets: number;
  totalAssets: number;
  accountsPayable: number;
  accruedExpenses: number;
  currentDebt: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  otherLTLiabilities: number;
  totalLiabilities: number;
  commonStock: number;
  retainedEarnings: number;
  totalEquity: number;
  totalLiabEquity: number;
  balanceCheck: number;
  // CF
  cfOperating: number;
  cfInvesting: number;
  cfFinancing: number;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  // CF detail
  deltaAR: number;
  deltaInv: number;
  deltaOCA: number;
  deltaAP: number;
  deltaAccrued: number;
  capex: number;
  dividends: number;
  debtRepaid: number;
  debtIssued: number;
}

interface ThreeStmtPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e'];

function buildDefaultHistorical(): HistoricalYear[] {
  return [
    { label: 'Y-2', revenue: 15000, cogs: 6000, opex: 5200, da: 1000, interestExpense: 450, otherIncome: 50, taxRate: 25, cash: 2100, accountsReceivable: 2700, inventory: 600, otherCurrentAssets: 400, ppeNet: 8000, otherLTAssets: 1200, accountsPayable: 1400, accruedExpenses: 800, currentDebt: 500, longTermDebt: 9500, otherLTLiabilities: 600, commonStock: 2000, retainedEarnings: 200 },
    { label: 'Y-1', revenue: 16800, cogs: 6720, opex: 5700, da: 1100, interestExpense: 420, otherIncome: 55, taxRate: 25, cash: 2500, accountsReceivable: 2950, inventory: 700, otherCurrentAssets: 430, ppeNet: 8500, otherLTAssets: 1250, accountsPayable: 1600, accruedExpenses: 870, currentDebt: 500, longTermDebt: 9000, otherLTLiabilities: 620, commonStock: 2000, retainedEarnings: 740 },
    { label: 'Y0', revenue: 18500, cogs: 7400, opex: 6200, da: 1200, interestExpense: 380, otherIncome: 60, taxRate: 25, cash: 2800, accountsReceivable: 3200, inventory: 800, otherCurrentAssets: 470, ppeNet: 9000, otherLTAssets: 1300, accountsPayable: 1850, accruedExpenses: 950, currentDebt: 500, longTermDebt: 8000, otherLTLiabilities: 640, commonStock: 2000, retainedEarnings: 1830 },
  ];
}

const DEFAULT_ASSUMPTIONS: Assumptions = {
  projectionYears: 5,
  revenueGrowthPct: 12,
  cogsPct: 40,
  opexGrowthPct: 8,
  daPct: 12,
  taxRatePct: 25,
  interestRatePct: 5,
  dso: 63,
  dio: 39,
  dpo: 45,
  capexPct: 12,
  dividendsPct: 20,
  debtRepayment: 1000,
  newDebtIssuance: 0,
  otherCurrentAssetsPct: 2.5,
  accruedExpensesPct: 15,
  otherLTAssetGrowth: 3,
  otherLTLiabGrowth: 3,
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 100000 ? `$${(n / 1000).toFixed(0)}M` :
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;
const fmtR = (n: number) => isFinite(n) ? n.toFixed(2) : '—';


// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseHistoricalCSV(csvText: string): HistoricalYear[] | null {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 3) return null;
  const rows = parsed.data as Record<string, string>[];
  const yearCols = Object.keys(rows[0]).filter(k => k !== 'Sheet' && k !== 'Item');
  if (yearCols.length < 2) return null;

  const get = (sheet: string, item: string, yr: string): number => {
    const row = rows.find(r => (r['Sheet'] || '').toUpperCase() === sheet && (r['Item'] || '').toLowerCase().includes(item.toLowerCase()));
    return row ? parseFloat(row[yr]) || 0 : 0;
  };

  const years: HistoricalYear[] = yearCols.map(yr => ({
    label: yr,
    revenue: get('IS', 'revenue', yr),
    cogs: get('IS', 'cogs', yr) || get('IS', 'cost of goods', yr),
    opex: get('IS', 'operat', yr) || get('IS', 'opex', yr),
    da: get('IS', 'deprec', yr) || get('IS', 'd&a', yr),
    interestExpense: get('IS', 'interest', yr),
    otherIncome: get('IS', 'other income', yr),
    taxRate: 25,
    cash: get('BS', 'cash', yr),
    accountsReceivable: get('BS', 'receivable', yr) || get('BS', 'ar', yr),
    inventory: get('BS', 'inventor', yr),
    otherCurrentAssets: get('BS', 'other current', yr),
    ppeNet: get('BS', 'pp&e', yr) || get('BS', 'ppe', yr) || get('BS', 'property', yr),
    otherLTAssets: get('BS', 'other lt asset', yr) || get('BS', 'other long', yr),
    accountsPayable: get('BS', 'payable', yr) || get('BS', 'ap', yr),
    accruedExpenses: get('BS', 'accrued', yr),
    currentDebt: get('BS', 'current debt', yr) || get('BS', 'short-term debt', yr),
    longTermDebt: get('BS', 'long-term debt', yr) || get('BS', 'total debt', yr) || get('BS', 'lt debt', yr),
    otherLTLiabilities: get('BS', 'other lt liab', yr),
    commonStock: get('BS', 'common stock', yr) || get('BS', 'equity', yr) || 2000,
    retainedEarnings: get('BS', 'retained', yr),
  }));

  return years.some(y => y.revenue > 0) ? years : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "EBITDA": "Earnings Before Interest, Taxes, Depreciation & Amortization. Proxy for operating cash generation.",
  "EBIT": "Earnings Before Interest & Taxes. Operating profit after depreciation.",
  "Net Income": "Bottom-line profit after all expenses and taxes. Flows to Retained Earnings on BS.",
  "PP&E (Net)": "Property, Plant & Equipment minus accumulated depreciation. Prior PP&E + CapEx − D&A.",
  "Working Capital": "Current Assets − Current Liabilities. Changes drive operating cash flow.",
  "DSO": "Days Sales Outstanding. AR ÷ (Revenue ÷ 365). How fast you collect.",
  "DIO": "Days Inventory Outstanding. Inventory ÷ (COGS ÷ 365).",
  "DPO": "Days Payable Outstanding. AP ÷ (COGS ÷ 365). How slow you pay suppliers.",
  "Cash Conversion Cycle": "DSO + DIO − DPO. Days to convert investment into cash.",
  "Balance Check": "Total Assets − (Total Liabilities + Total Equity). Must equal 0.",
  "Indirect Method CF": "Start with Net Income, add back non-cash items (D&A), adjust for working capital changes.",
  "Circular Reference": "Interest depends on debt, debt depends on cash, cash depends on interest. Solved iteratively.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />3-Statement Glossary</DialogTitle>
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

const ThreeStmtGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">3-Statement Model Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">

          {/* What is it */}
          <div>
            <h3 className="font-semibold text-primary mb-2">What is a 3-Statement Model?</h3>
            <p className="text-sm text-muted-foreground">A 3-statement financial model integrates the Income Statement (IS), Balance Sheet (BS), and Cash Flow Statement (CF) into a single dynamic model. It is the foundation of corporate finance and valuation — used for forecasting, DCF analysis, LBO modeling, and M&A due diligence.</p>
          </div>

          {/* How the 3 Statements Link */}
          <div>
            <h3 className="font-semibold text-primary mb-3">How the 3 Statements Link</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Income Statement → Balance Sheet', desc: 'Net Income adds to Retained Earnings each year, growing book equity.' },
                { step: '2', title: 'Income Statement → Cash Flow', desc: 'Net Income is the starting point for the indirect-method Cash Flow Statement.' },
                { step: '3', title: 'Cash Flow → Balance Sheet', desc: 'Ending Cash from CF must equal Cash on the Balance Sheet. This is the key integrity check.' },
                { step: '4', title: 'Balance Sheet → Income Statement', desc: 'Average Debt × Interest Rate = Interest Expense. This creates a circular reference solved iteratively.' },
                { step: '5', title: 'Balance Check', desc: 'Assets = Liabilities + Equity. If the difference is not zero, the model is broken.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Income Statement */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Income Statement (IS)</h3>
            <p className="text-sm text-muted-foreground mb-3">Shows profitability over a period. Revenue flows down through cost deductions to Net Income.</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Line Item</th><th className="p-2 text-left">Driver / Formula</th><th className="p-2 text-left">Key Assumption</th></tr></thead>
                <tbody>
                  {[
                    ['Revenue', 'Base Year × (1 + Growth %)', 'Revenue growth rate'],
                    ['(−) COGS', 'Revenue × COGS %', 'COGS as % of revenue'],
                    ['= Gross Profit', 'Revenue − COGS', '—'],
                    ['(−) Operating Expenses', 'Revenue × OpEx %', 'OpEx as % of revenue'],
                    ['= EBITDA', 'Gross Profit − OpEx', '—'],
                    ['(−) D&A', 'Revenue × D&A %', 'D&A as % of revenue'],
                    ['= EBIT', 'EBITDA − D&A', '—'],
                    ['(+) Other Income', 'Fixed amount', 'Other income per year'],
                    ['(−) Interest Expense', 'Avg Debt × Interest Rate', 'Interest rate on debt'],
                    ['= EBT', 'EBIT + Other − Interest', '—'],
                    ['(−) Tax', 'EBT × Tax Rate', 'Effective tax rate'],
                    ['= Net Income', 'EBT − Tax', '—'],
                  ].map(([item, formula, assumption], i) => (
                    <tr key={i} className={`${i % 2 ? 'bg-muted/20' : ''} ${item.startsWith('=') ? 'font-semibold' : ''}`}>
                      <td className="p-2 border-r">{item}</td><td className="p-2 border-r font-mono text-muted-foreground">{formula}</td><td className="p-2 text-muted-foreground">{assumption}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Sheet */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Balance Sheet (BS)</h3>
            <p className="text-sm text-muted-foreground mb-3">Snapshot of assets, liabilities, and equity at a point in time. Must always balance: A = L + E.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2 text-primary">Assets</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Cash</strong> — Ending Cash from CF Statement</p>
                  <p><strong>Accounts Receivable</strong> — Revenue × (DSO / 365)</p>
                  <p><strong>Inventory</strong> — COGS × (DIO / 365)</p>
                  <p><strong>PP&E (Net)</strong> — Prior PP&E + CapEx − D&A</p>
                  <p><strong>Other Assets</strong> — Held constant or grown</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2 text-primary">Liabilities</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Accounts Payable</strong> — COGS × (DPO / 365)</p>
                  <p><strong>Accrued Expenses</strong> — OpEx × Accrual %</p>
                  <p><strong>Current Debt</strong> — Short-term obligations</p>
                  <p><strong>Long-Term Debt</strong> — Prior ± Issuance − Repayment</p>
                  <p><strong>Other LT Liabilities</strong> — Held constant</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2 text-primary">Equity</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Common Stock</strong> — Held constant</p>
                  <p><strong>Retained Earnings</strong> — Prior RE + Net Income − Dividends</p>
                  <p><strong>Total Equity</strong> — Stock + RE</p>
                  <p className="mt-2 font-semibold text-primary">✓ Balance Check: A − L − E = 0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Cash Flow Statement (CF)</h3>
            <p className="text-sm text-muted-foreground mb-3">Reconciles Net Income to actual cash movement using the indirect method. Three sections:</p>
            <div className="space-y-2">
              {[
                { title: 'CF from Operations', items: 'Net Income + D&A ± Working Capital changes (ΔAR, ΔInventory, ΔAP, ΔAccruals). Non-cash charges added back, working capital changes adjust for timing.' },
                { title: 'CF from Investing', items: '(−) Capital Expenditures. CapEx driven as % of Revenue. Other investments held constant.' },
                { title: 'CF from Financing', items: 'Debt Issued − Debt Repaid − Dividends. Reflects capital structure decisions.' },
              ].map(({ title, items }) => (
                <div key={title} className="p-3 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{items}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Assumptions */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Key Assumptions You Control</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Revenue Growth %', desc: 'YoY top-line growth rate' },
                { label: 'COGS %', desc: 'Cost of goods as % of revenue' },
                { label: 'OpEx %', desc: 'Operating expenses as % of revenue' },
                { label: 'D&A %', desc: 'Depreciation as % of revenue' },
                { label: 'Tax Rate %', desc: 'Effective corporate tax rate' },
                { label: 'Interest Rate %', desc: 'Blended cost of debt' },
                { label: 'CapEx %', desc: 'Capital spending as % of revenue' },
                { label: 'DSO / DIO / DPO', desc: 'Working capital efficiency (days)' },
                { label: 'Dividend Payout', desc: 'Cash returned to shareholders' },
                { label: 'Debt Repayment', desc: 'Scheduled debt amortization' },
                { label: 'New Debt Issuance', desc: 'Fresh borrowings per year' },
                { label: 'Projection Years', desc: '1–10 year forecast horizon' },
              ].map(({ label, desc }) => (
                <div key={label} className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-[11px]">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interpreting Results */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Interpreting Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { metric: 'Gross Margin', interpretation: 'Revenue minus direct costs. Higher = better pricing power or cost efficiency.' },
                { metric: 'EBITDA Margin', interpretation: 'Operating profitability before non-cash charges. Core business health indicator.' },
                { metric: 'Net Margin', interpretation: 'Bottom-line profitability after all costs, interest, and taxes.' },
                { metric: 'Balance Check = 0', interpretation: 'Model integrity confirmed. Non-zero means a formula error exists.' },
                { metric: 'Free Cash Flow', interpretation: 'CF from Operations − CapEx. Cash available for debt paydown, dividends, or reinvestment.' },
                { metric: 'Cash Flow Waterfall', interpretation: 'Visual breakdown of how cash moves from operations through investing and financing activities.' },
              ].map(({ metric, interpretation }) => (
                <div key={metric} className="p-3 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{metric}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{interpretation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Adjust assumptions and watch all 3 statements update in real-time. The Balance Check row confirms integrity.</li>
              <li>• Start with revenue growth and margins, then tune working capital (DSO/DIO/DPO) for realistic cash flow.</li>
              <li>• Use the Cash Flow Waterfall chart to visualize where cash is generated and consumed.</li>
              <li>• Export individual statements (IS, BS, CF) or all three via the Export dropdown.</li>
              <li>• If Balance Check ≠ 0, check your debt and equity assumptions — the circular reference may need adjustment.</li>
              <li>• Upload historical data via CSV to auto-populate base year values, then project forward from those actuals.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE & SAMPLE CSV
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `Sheet,Item,Y-2,Y-1,Y0
IS,Revenue,15000,16800,18500
IS,COGS,6000,6720,7400
IS,Operating Expenses,5200,5700,6200
IS,Depreciation & Amortization,1000,1100,1200
IS,Interest Expense,450,420,380
IS,Other Income,50,55,60
BS,Cash,2100,2500,2800
BS,Accounts Receivable,2700,2950,3200
BS,Inventory,600,700,800
BS,Other Current Assets,400,430,470
BS,PP&E (Net),8000,8500,9000
BS,Other LT Assets,1200,1250,1300
BS,Accounts Payable,1400,1600,1850
BS,Accrued Expenses,800,870,950
BS,Current Debt,500,500,500
BS,Long-Term Debt,9500,9000,8000
BS,Other LT Liabilities,600,620,640
BS,Common Stock,2000,2000,2000
BS,Retained Earnings,200,740,1830`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownload = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_3statement.csv';
    link.click();
    toast({ title: "Downloaded!" });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Historical Data Format</DialogTitle>
          <DialogDescription>Upload 2–3 years of historical financials to auto-populate the model</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Structure */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">Single CSV with a <strong>Sheet</strong> column (<code className="bg-muted px-1 rounded text-xs">IS</code> or <code className="bg-muted px-1 rounded text-xs">BS</code>), an <strong>Item</strong> column, and year columns with values in <strong>$K</strong>.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50"><th className="p-2 text-left border-r">Sheet</th><th className="p-2 text-left border-r">Item</th><th className="p-2 text-right">Y-2</th><th className="p-2 text-right">Y-1</th><th className="p-2 text-right">Y0</th></tr></thead>
                  <tbody>
                    {[
                      ['IS', 'Revenue', '15,000', '16,800', '18,500'],
                      ['IS', 'COGS', '6,000', '6,720', '7,400'],
                      ['IS', 'Operating Expenses', '5,200', '5,700', '6,200'],
                      ['IS', 'D&A', '1,000', '1,100', '1,200'],
                      ['IS', 'Interest Expense', '450', '420', '380'],
                      ['IS', 'Other Income', '50', '55', '60'],
                      ['BS', 'Cash', '2,100', '2,500', '2,800'],
                      ['BS', 'Accounts Receivable', '2,700', '2,950', '3,200'],
                      ['BS', 'Inventory', '600', '700', '800'],
                      ['BS', 'PP&E (Net)', '8,000', '8,500', '9,000'],
                      ['BS', 'Accounts Payable', '1,400', '1,600', '1,850'],
                      ['BS', 'Long-Term Debt', '9,500', '9,000', '8,000'],
                      ['BS', 'Retained Earnings', '200', '740', '1,830'],
                    ].map(([s, i, ...vals], idx) => (
                      <tr key={idx} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-2 border-r font-semibold">{s}</td><td className="p-2 border-r">{i}</td>{vals.map((v, j) => <td key={j} className="p-2 text-right">{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accepted Item Names */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Accepted Item Names</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'Revenue', required: true, sheet: 'IS', aliases: 'Sales, Net Revenue, Net Sales' },
                  { name: 'COGS', required: true, sheet: 'IS', aliases: 'Cost of Goods Sold, Cost of Revenue' },
                  { name: 'Operating Expenses', required: true, sheet: 'IS', aliases: 'OpEx, SG&A, Operating Costs' },
                  { name: 'D&A', required: false, sheet: 'IS', aliases: 'Depreciation, Depreciation & Amortization, DepAmort' },
                  { name: 'Interest Expense', required: false, sheet: 'IS', aliases: 'Interest, Finance Costs' },
                  { name: 'Other Income', required: false, sheet: 'IS', aliases: 'Non-Operating Income' },
                  { name: 'Cash', required: true, sheet: 'BS', aliases: 'Cash & Equivalents, Cash and Equivalents' },
                  { name: 'Accounts Receivable', required: true, sheet: 'BS', aliases: 'AR, Trade Receivables' },
                  { name: 'Inventory', required: false, sheet: 'BS', aliases: 'Inventories' },
                  { name: 'Other Current Assets', required: false, sheet: 'BS', aliases: 'OCA, Prepaid Expenses' },
                  { name: 'PP&E (Net)', required: true, sheet: 'BS', aliases: 'PPE, Property Plant Equipment, Fixed Assets' },
                  { name: 'Other LT Assets', required: false, sheet: 'BS', aliases: 'Intangibles, Goodwill, Other Assets' },
                  { name: 'Accounts Payable', required: true, sheet: 'BS', aliases: 'AP, Trade Payables' },
                  { name: 'Accrued Expenses', required: false, sheet: 'BS', aliases: 'Accruals, Accrued Liabilities' },
                  { name: 'Current Debt', required: false, sheet: 'BS', aliases: 'Short-Term Debt, Current Portion LTD' },
                  { name: 'Long-Term Debt', required: true, sheet: 'BS', aliases: 'LTD, Long Term Debt, Debt' },
                  { name: 'Other LT Liabilities', required: false, sheet: 'BS', aliases: 'Other Liabilities' },
                  { name: 'Common Stock', required: false, sheet: 'BS', aliases: 'Equity, Paid-In Capital' },
                  { name: 'Retained Earnings', required: true, sheet: 'BS', aliases: 'RE, Accumulated Earnings' },
                ].map(({ name, required, sheet, aliases }) => (
                  <div key={name} className={`p-2.5 rounded-lg border text-sm ${required ? 'border-[#1e3a5f]/30 bg-[#1e3a5f]/5' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={required ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">{sheet}</Badge>
                      <span className="font-semibold text-xs">{name}</span>
                      {required && <span className="text-[9px] text-red-500 font-medium">Required</span>}
                    </div>
                    {aliases && <p className="text-[10px] text-muted-foreground mt-1">Also: {aliases}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div>
              <h4 className="font-semibold text-sm mb-2">How the 3-Statement Model Links</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { num: '1', title: 'IS → BS', desc: 'Net Income flows into Retained Earnings each year.' },
                  { num: '2', title: 'IS → CF', desc: 'Net Income is the starting point for indirect-method Cash Flow.' },
                  { num: '3', title: 'CF → BS', desc: 'Ending Cash from CF must equal Cash on the Balance Sheet.' },
                  { num: '4', title: 'BS → IS', desc: 'Avg Debt × Interest Rate = Interest Expense (circular reference).' },
                ].map(({ num, title, desc }) => (
                  <div key={num} className="p-3 rounded-lg border bg-muted/20 flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{num}</div>
                    <div><p className="font-semibold text-xs">{title}</p><p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• All values in <strong>$K</strong> (thousands). Use positive values — signs are handled automatically.</li>
                <li>• <strong>Sheet</strong> column must be <code className="bg-muted px-1 rounded">IS</code> or <code className="bg-muted px-1 rounded">BS</code>. Cash Flow is auto-generated from changes in IS & BS.</li>
                <li>• Year headers can be <code className="bg-muted px-1 rounded">Y-2, Y-1, Y0</code> or <code className="bg-muted px-1 rounded">2022, 2023, 2024</code>.</li>
                <li>• Items not provided will use default values. Provide at minimum: Revenue, COGS, Cash, PP&E, Debt, RE.</li>
                <li>• Projected years (Y1–Y5) are calculated from driver-based assumptions you can adjust after upload.</li>
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

const IntroPage = ({ onStartWithData, onStartManual, hasUploadedData, parseError }: { onStartWithData: () => void; onStartManual: () => void; hasUploadedData: boolean; parseError: string | null }) => {
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Link2 className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">3-Statement Model</CardTitle>
          <CardDescription className="text-base mt-2">Integrated Income Statement, Balance Sheet, and Cash Flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: BarChart3, title: 'Income Statement', desc: 'Revenue through Net Income with driver-based assumptions' },
              { icon: Layers, title: 'Balance Sheet', desc: 'Assets, liabilities, equity with real-time balance check' },
              { icon: Activity, title: 'Cash Flow', desc: 'Indirect method auto-generated from IS & BS changes' },
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
                  <div><CardTitle className="text-base">Upload Historical Data</CardTitle><CardDescription className="text-xs">Past 2-3 years IS & BS</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button></>
                ) : (
                  <><p className="text-sm text-muted-foreground">Upload historical financials as CSV. Future years auto-projected from assumptions.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Metric | 2021 | 2022 | 2023 | ...</p>
                      <p className="text-muted-foreground">Revenue, COGS, OpEx, Cash, AR, AP, Debt, ...</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide</Button>
                  {parseError && <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30"><AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p></div>}</>
                )}
              </CardContent>
            </Card>
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">Sample company, 3yr history</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Pre-loaded with 3 years of historical data and default growth assumptions. All editable.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />3yr Historical + 5yr Projection</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />IS ↔ BS ↔ CF fully linked</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Iterative interest solver</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-xs text-muted-foreground">Historical data provides the base year. Assumptions drive projections. All 3 statements update in real-time.</p></div>
        </CardContent>
      </Card>
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION ENGINE (with iterative interest solver)
// ═══════════════════════════════════════════════════════════════════════════════

function projectYears(historical: HistoricalYear[], assumptions: Assumptions): ProjectedYear[] {
  const base = historical[historical.length - 1];
  const n = assumptions.projectionYears;
  const projected: ProjectedYear[] = [];
  let prevBS = {
    cash: base.cash, ar: base.accountsReceivable, inv: base.inventory, oca: base.otherCurrentAssets,
    ppe: base.ppeNet, olta: base.otherLTAssets, ap: base.accountsPayable, accrued: base.accruedExpenses,
    cd: base.currentDebt, ltd: base.longTermDebt, oltl: base.otherLTLiabilities,
    cs: base.commonStock, re: base.retainedEarnings,
  };
  let prevRevenue = base.revenue;
  let prevOpex = base.opex;

  for (let y = 0; y < n; y++) {
    const label = `Y${y + 1}`;
    // IS
    const revenue = prevRevenue * (1 + assumptions.revenueGrowthPct / 100);
    const cogs = revenue * (assumptions.cogsPct / 100);
    const grossProfit = revenue - cogs;
    const opex = prevOpex * (1 + assumptions.opexGrowthPct / 100);
    const da = prevBS.ppe * (assumptions.daPct / 100);
    const ebitda = grossProfit - opex;
    const ebit = ebitda - da;
    const otherIncome = base.otherIncome;

    // Iterative solver for interest (3 passes)
    let interestExpense = 0;
    let netIncome = 0;
    let endingCash = 0;
    let ltd = prevBS.ltd;
    let cash = prevBS.cash;

    for (let iter = 0; iter < 4; iter++) {
      const avgDebt = ((prevBS.cd + prevBS.ltd) + (prevBS.cd + ltd)) / 2;
      interestExpense = avgDebt * (assumptions.interestRatePct / 100);
      const ebt = ebit + otherIncome - interestExpense;
      const tax = Math.max(0, ebt * (assumptions.taxRatePct / 100));
      netIncome = ebt - tax;

      // BS
      const ar = revenue * assumptions.dso / 365;
      const inv = cogs * assumptions.dio / 365;
      const oca = revenue * (assumptions.otherCurrentAssetsPct / 100);
      const capex = revenue * (assumptions.capexPct / 100);
      const ppe = prevBS.ppe + capex - da;
      const olta = prevBS.olta * (1 + assumptions.otherLTAssetGrowth / 100);
      const ap = cogs * assumptions.dpo / 365;
      const accrued = opex * (assumptions.accruedExpensesPct / 100);
      const cd = prevBS.cd;
      ltd = prevBS.ltd - assumptions.debtRepayment + assumptions.newDebtIssuance;
      if (ltd < 0) ltd = 0;
      const oltl = prevBS.oltl * (1 + assumptions.otherLTLiabGrowth / 100);
      const dividends = Math.max(0, netIncome * (assumptions.dividendsPct / 100));
      const re = prevBS.re + netIncome - dividends;
      const cs = prevBS.cs;

      // CF
      const deltaAR = -(ar - prevBS.ar);
      const deltaInv = -(inv - prevBS.inv);
      const deltaOCA = -(oca - prevBS.oca);
      const deltaAP = ap - prevBS.ap;
      const deltaAccrued = accrued - prevBS.accrued;
      const cfOp = netIncome + da + deltaAR + deltaInv + deltaOCA + deltaAP + deltaAccrued;
      const cfInv = -capex;
      const debtChange = (cd + ltd) - (prevBS.cd + prevBS.ltd);
      const cfFin = debtChange - dividends;
      const netCF = cfOp + cfInv + cfFin;
      endingCash = prevBS.cash + netCF;
      cash = endingCash;

      if (iter === 3) {
        const totalCA = cash + ar + inv + oca;
        const totalAssets = totalCA + ppe + olta;
        const totalCL = ap + accrued + cd;
        const totalLiab = totalCL + ltd + oltl;
        const totalEquity = cs + re;
        const totalLE = totalLiab + totalEquity;
        projected.push({
          label, revenue, cogs, grossProfit, opex, ebitda, da, ebit, interestExpense, otherIncome,
          ebt: ebit + otherIncome - interestExpense,
          tax: Math.max(0, (ebit + otherIncome - interestExpense) * (assumptions.taxRatePct / 100)),
          netIncome,
          cash, accountsReceivable: ar, inventory: inv, otherCurrentAssets: oca, totalCurrentAssets: totalCA,
          ppeNet: ppe, otherLTAssets: olta, totalAssets,
          accountsPayable: ap, accruedExpenses: accrued, currentDebt: cd, totalCurrentLiabilities: totalCL,
          longTermDebt: ltd, otherLTLiabilities: oltl, totalLiabilities: totalLiab,
          commonStock: cs, retainedEarnings: re, totalEquity, totalLiabEquity: totalLE,
          balanceCheck: Math.round((totalAssets - totalLE) * 100) / 100,
          cfOperating: cfOp, cfInvesting: cfInv, cfFinancing: cfFin, netCashFlow: netCF,
          beginningCash: prevBS.cash, endingCash: cash,
          deltaAR, deltaInv, deltaOCA, deltaAP, deltaAccrued,
          capex, dividends, debtRepaid: assumptions.debtRepayment, debtIssued: assumptions.newDebtIssuance,
        });
        prevBS = { cash, ar, inv, oca, ppe, olta, ap, accrued, cd, ltd, oltl, cs, re };
      }
    }
    prevRevenue = revenue;
    prevOpex = opex;
  }
  return projected;
}


// ═══════════════════════════════════════════════════════════════════════════════
// STATEMENT TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function StmtRow({ label, values, bold, topBorder, highlight, sub, check }: { label: string; values: (number | string)[]; bold?: boolean; topBorder?: boolean; highlight?: boolean; sub?: boolean; check?: boolean }) {
  return (
    <TableRow className={`${topBorder ? 'border-t-2' : ''} ${highlight ? 'bg-primary/5' : ''} ${check ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
      <TableCell className={`${bold ? 'font-semibold' : ''} ${sub ? 'pl-6 text-muted-foreground' : ''} text-xs`}>{label}</TableCell>
      {values.map((v, i) => {
        const num = typeof v === 'number' ? v : NaN;
        const isHistorical = i < 3;
        const isNeg = !isNaN(num) && num < 0;
        return (
          <TableCell key={i} className={`text-right font-mono text-xs ${bold ? 'font-semibold' : ''} ${isHistorical ? 'text-muted-foreground' : ''} ${isNeg ? 'text-red-600' : ''} ${check && Math.abs(num) > 0.01 ? 'text-red-600 font-bold' : check ? 'text-green-600' : ''}`}>
            {typeof v === 'string' ? v : fmt(Math.round(v))}
          </TableCell>
        );
      })}
    </TableRow>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ThreeStatementPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: ThreeStmtPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [historical, setHistorical] = useState<HistoricalYear[]>(buildDefaultHistorical);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);

  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try { return parseHistoricalCSV(Papa.unparse(data)); } catch { return null; }
  }, [data]);
  const applyUpload = useCallback(() => { if (parsedUpload) setHistorical(parsedUpload); setShowIntro(false); }, [parsedUpload]);

  // Project
  const projected = useMemo(() => projectYears(historical, assumptions), [historical, assumptions]);
  const allYearLabels = [...historical.map(h => h.label), ...projected.map(p => p.label)];
  const hLen = historical.length;

  // Helper to get values across all years
  const allVals = useCallback((hKey: keyof HistoricalYear, pKey: keyof ProjectedYear) => [
    ...historical.map(h => h[hKey] as number),
    ...projected.map(p => p[pKey] as number),
  ], [historical, projected]);

  // Derived IS values for historical
  const histGP = historical.map(h => h.revenue - h.cogs);
  const histEBITDA = historical.map((h, i) => histGP[i] - h.opex);
  const histEBIT = historical.map((h, i) => histEBITDA[i] - h.da);
  const histEBT = historical.map((h, i) => histEBIT[i] + h.otherIncome - h.interestExpense);
  const histTax = historical.map((h, i) => Math.max(0, histEBT[i] * (h.taxRate / 100)));
  const histNI = historical.map((h, i) => histEBT[i] - histTax[i]);

  // Chart data
  const revenueChart = useMemo(() => allYearLabels.map((l, i) => ({
    year: l, revenue: i < hLen ? historical[i].revenue : projected[i - hLen].revenue,
    netIncome: i < hLen ? histNI[i] : projected[i - hLen].netIncome,
    ebitda: i < hLen ? histEBITDA[i] : projected[i - hLen].ebitda,
    isProjected: i >= hLen,
  })), [allYearLabels, historical, projected, hLen, histNI, histEBITDA]);

  const cfChart = useMemo(() => projected.map(p => ({
    year: p.label, operating: p.cfOperating, investing: p.cfInvesting, financing: p.cfFinancing, net: p.netCashFlow,
  })), [projected]);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `3Statement_Model.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, []);

  // Export helpers
  const csvRow = useCallback((label: string, vals: (string | number)[]) => [label, ...vals.map(v => typeof v === 'number' ? Math.round(v) : v)].join(','), []);
  const csvDownload = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
  }, []);

  const buildIS = useCallback(() => {
    const hdr = ['Item', ...allYearLabels].join(',');
    let csv = 'INCOME STATEMENT ($K)\n' + hdr + '\n';
    csv += csvRow('Revenue', allVals('revenue', 'revenue')) + '\n';
    csv += csvRow('(−) COGS', allVals('cogs', 'cogs')) + '\n';
    csv += csvRow('Gross Profit', [...histGP, ...projected.map(p => p.grossProfit)]) + '\n';
    csv += csvRow('(−) Operating Expenses', allVals('opex', 'opex')) + '\n';
    csv += csvRow('EBITDA', [...histEBITDA, ...projected.map(p => p.ebitda)]) + '\n';
    csv += csvRow('(−) D&A', allVals('da', 'da')) + '\n';
    csv += csvRow('EBIT', [...histEBIT, ...projected.map(p => p.ebit)]) + '\n';
    csv += csvRow('(−) Interest Expense', [...historical.map(h => h.interestExpense), ...projected.map(p => p.interestExpense)]) + '\n';
    csv += csvRow('Net Income', [...histNI, ...projected.map(p => p.netIncome)]) + '\n';
    return csv;
  }, [allVals, allYearLabels, historical, projected, histGP, histEBITDA, histEBIT, histNI, csvRow]);

  const buildBS = useCallback(() => {
    const hdr = ['Item', ...allYearLabels].join(',');
    let csv = 'BALANCE SHEET ($K)\n' + hdr + '\n';
    csv += csvRow('Cash', allVals('cash', 'cash')) + '\n';
    csv += csvRow('Accounts Receivable', allVals('accountsReceivable', 'accountsReceivable')) + '\n';
    csv += csvRow('Inventory', allVals('inventory', 'inventory')) + '\n';
    csv += csvRow('Other Current Assets', allVals('otherCurrentAssets', 'otherCurrentAssets')) + '\n';
    csv += csvRow('Total Current Assets', [...historical.map(h => h.cash + h.accountsReceivable + h.inventory + h.otherCurrentAssets), ...projected.map(p => p.totalCurrentAssets)]) + '\n';
    csv += csvRow('PP&E (Net)', allVals('ppeNet', 'ppeNet')) + '\n';
    csv += csvRow('Other LT Assets', allVals('otherLTAssets', 'otherLTAssets')) + '\n';
    csv += csvRow('Total Assets', [...historical.map(h => h.cash + h.accountsReceivable + h.inventory + h.otherCurrentAssets + h.ppeNet + h.otherLTAssets), ...projected.map(p => p.totalAssets)]) + '\n';
    csv += '\n';
    csv += csvRow('Accounts Payable', allVals('accountsPayable', 'accountsPayable')) + '\n';
    csv += csvRow('Accrued Expenses', allVals('accruedExpenses', 'accruedExpenses')) + '\n';
    csv += csvRow('Current Debt', allVals('currentDebt', 'currentDebt')) + '\n';
    csv += csvRow('Total Current Liabilities', [...historical.map(h => h.accountsPayable + h.accruedExpenses + h.currentDebt), ...projected.map(p => p.totalCurrentLiabilities)]) + '\n';
    csv += csvRow('Long-Term Debt', allVals('longTermDebt', 'longTermDebt')) + '\n';
    csv += csvRow('Other LT Liabilities', allVals('otherLTLiabilities', 'otherLTLiabilities')) + '\n';
    csv += csvRow('Total Liabilities', [...historical.map(h => h.accountsPayable + h.accruedExpenses + h.currentDebt + h.longTermDebt + h.otherLTLiabilities), ...projected.map(p => p.totalLiabilities)]) + '\n';
    csv += '\n';
    csv += csvRow('Common Stock', allVals('commonStock', 'commonStock')) + '\n';
    csv += csvRow('Retained Earnings', allVals('retainedEarnings', 'retainedEarnings')) + '\n';
    csv += csvRow('Total Equity', [...historical.map(h => h.commonStock + h.retainedEarnings), ...projected.map(p => p.totalEquity)]) + '\n';
    csv += csvRow('Total Liabilities + Equity', [...historical.map(h => h.accountsPayable + h.accruedExpenses + h.currentDebt + h.longTermDebt + h.otherLTLiabilities + h.commonStock + h.retainedEarnings), ...projected.map(p => p.totalLiabEquity)]) + '\n';
    csv += csvRow('Balance Check (A − L − E)', [...historical.map(() => 0), ...projected.map(p => p.balanceCheck)]) + '\n';
    return csv;
  }, [allVals, allYearLabels, historical, projected, csvRow]);

  const buildCF = useCallback(() => {
    const pHdr = ['Item', ...projected.map(p => p.label)].join(',');
    const pRow = (label: string, vals: number[]) => [label, ...vals.map(v => Math.round(v))].join(',');
    let csv = 'CASH FLOW STATEMENT ($K) — Projected Only\n' + pHdr + '\n';
    csv += pRow('Net Income', projected.map(p => p.netIncome)) + '\n';
    csv += pRow('(+) D&A', projected.map(p => p.da)) + '\n';
    csv += pRow('Δ Accounts Receivable', projected.map(p => p.deltaAR)) + '\n';
    csv += pRow('Δ Inventory', projected.map(p => p.deltaInv)) + '\n';
    csv += pRow('Δ Other Current Assets', projected.map(p => p.deltaOCA)) + '\n';
    csv += pRow('Δ Accounts Payable', projected.map(p => p.deltaAP)) + '\n';
    csv += pRow('Δ Accrued Expenses', projected.map(p => p.deltaAccrued)) + '\n';
    csv += pRow('CF from Operations', projected.map(p => p.cfOperating)) + '\n';
    csv += '\n';
    csv += pRow('(−) CapEx', projected.map(p => -p.capex)) + '\n';
    csv += pRow('CF from Investing', projected.map(p => p.cfInvesting)) + '\n';
    csv += '\n';
    csv += pRow('Debt Issued / (Repaid)', projected.map(p => p.debtIssued - p.debtRepaid)) + '\n';
    csv += pRow('(−) Dividends', projected.map(p => -p.dividends)) + '\n';
    csv += pRow('CF from Financing', projected.map(p => p.cfFinancing)) + '\n';
    csv += '\n';
    csv += pRow('Net Change in Cash', projected.map(p => p.netCashFlow)) + '\n';
    csv += pRow('Beginning Cash', projected.map(p => p.beginningCash)) + '\n';
    csv += pRow('Ending Cash', projected.map(p => p.endingCash)) + '\n';
    return csv;
  }, [projected]);

  const handleDownloadCSV = useCallback(() => csvDownload(buildIS() + '\n' + buildBS() + '\n' + buildCF(), '3Statement_Full.csv'), [buildIS, buildBS, buildCF, csvDownload]);
  const handleDownloadIS = useCallback(() => csvDownload(buildIS(), 'Income_Statement.csv'), [buildIS, csvDownload]);
  const handleDownloadBS = useCallback(() => csvDownload(buildBS(), 'Balance_Sheet.csv'), [buildBS, csvDownload]);
  const handleDownloadCF = useCallback(() => csvDownload(buildCF(), 'Cash_Flow.csv'), [buildCF, csvDownload]);

  if (showIntro) return <IntroPage hasUploadedData={!!parsedUpload} parseError={null} onStartWithData={applyUpload} onStartManual={() => setShowIntro(false)} />;

  const A = assumptions;
  const setA = (updates: Partial<Assumptions>) => setAssumptions(prev => ({ ...prev, ...updates }));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">3-Statement Model</h1><p className="text-muted-foreground mt-1">{hLen}yr Historical + {A.projectionYears}yr Projected</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <ThreeStmtGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Assumptions ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Driver Assumptions</CardTitle><CardDescription>Change assumptions → 3 statements update in real-time</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Revenue Growth %', key: 'revenueGrowthPct', min: -20, max: 50, step: 1 },
              { label: 'COGS % of Revenue', key: 'cogsPct', min: 10, max: 80, step: 1 },
              { label: 'OpEx Growth %', key: 'opexGrowthPct', min: -10, max: 30, step: 1 },
              { label: 'Tax Rate %', key: 'taxRatePct', min: 0, max: 40, step: 1 },
              { label: 'D&A % of PP&E', key: 'daPct', min: 5, max: 25, step: 1 },
              { label: 'Interest Rate %', key: 'interestRatePct', min: 1, max: 15, step: 0.5 },
              { label: 'CapEx % of Revenue', key: 'capexPct', min: 2, max: 30, step: 1 },
              { label: 'Dividends % of NI', key: 'dividendsPct', min: 0, max: 80, step: 5 },
            ].map(({ label, key, min, max, step }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <div className="flex items-center gap-2">
                  <Slider value={[(A as any)[key]]} onValueChange={([v]) => setA({ [key]: v })} min={min} max={max} step={step} className="flex-1" />
                  <Input type="number" value={(A as any)[key]} onChange={e => setA({ [key]: parseFloat(e.target.value) || 0 })} className="h-7 w-14 text-right text-xs font-mono" step={step} />
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'DSO (days)', key: 'dso', step: 1 },
              { label: 'DIO (days)', key: 'dio', step: 1 },
              { label: 'DPO (days)', key: 'dpo', step: 1 },
              { label: 'Debt Repayment ($K/yr)', key: 'debtRepayment', step: 100 },
              { label: 'New Debt ($K/yr)', key: 'newDebtIssuance', step: 100 },
            ].map(({ label, key, step }) => (
              <div key={key} className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type="number" value={(A as any)[key]} onChange={e => setA({ [key]: parseFloat(e.target.value) || 0 })} className="h-8 text-sm font-mono" step={step} /></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ Key Findings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
            <div><CardTitle>Key Findings</CardTitle><CardDescription>3-Statement model highlights</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">
              {(() => {
                const items: string[] = [];
                const lastProj = projected[projected.length - 1];
                const baseRev = historical[hLen - 1]?.revenue || 0;
                items.push(`Revenue grows from ${fmt(baseRev)} (base) to ${fmt(lastProj?.revenue)} in Y${A.projectionYears} at ${A.revenueGrowthPct}% annual growth.`);
                const lastEBITDA = lastProj?.ebitda || 0;
                const ebitdaMargin = lastProj?.revenue > 0 ? (lastEBITDA / lastProj.revenue * 100) : 0;
                items.push(`EBITDA reaches ${fmt(lastEBITDA)} with ${fmtP(ebitdaMargin)} margin. Net Income: ${fmt(lastProj?.netIncome)} by Y${A.projectionYears}.`);
                items.push(`Cash balance: ${fmt(historical[hLen - 1]?.cash)} → ${fmt(lastProj?.cash)}. ${lastProj?.cash > historical[hLen - 1]?.cash ? 'Strong cash generation.' : '⚠️ Cash declining — monitor liquidity.'}`);
                items.push(`Debt: ${fmt(historical[hLen - 1]?.longTermDebt)} → ${fmt(lastProj?.longTermDebt)}. ${A.debtRepayment > 0 ? `Repaying ${fmt(A.debtRepayment)}/yr — deleveraging.` : 'No scheduled repayment.'}`);
                items.push(`Balance check: ${projected.every(p => Math.abs(p.balanceCheck) < 1) ? '✅ All projected years balanced — model integrity confirmed.' : '⚠️ Imbalance detected — review assumptions.'}`);
                return items.map((text, i) => (
                  <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                ));
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report & Statements */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" />Linked Financial Statements</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>CSV by Statement</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleDownloadIS}><BarChart3 className="mr-2 h-4 w-4" />Income Statement</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadBS}><Layers className="mr-2 h-4 w-4" />Balance Sheet</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadCF}><Activity className="mr-2 h-4 w-4" />Cash Flow Statement</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />All 3 Statements (CSV)</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPNG}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}Full Report (PNG)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">3-Statement Financial Model</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {hLen}yr Historical + {A.projectionYears}yr Projected</p></div>
        {/* ══ INCOME STATEMENT ══ */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Income Statement ($K)</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead className="min-w-[140px]">Item</TableHead>{allYearLabels.map((l, i) => <TableHead key={l} className={`text-right min-w-[70px] ${i < hLen ? 'text-muted-foreground' : 'text-primary font-semibold'}`}>{l}{i === hLen - 1 && <Badge className="ml-1 text-[8px] bg-primary text-primary-foreground">Base</Badge>}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              <StmtRow label="Revenue" values={allVals('revenue', 'revenue')} bold />
              <StmtRow label="(−) COGS" values={allVals('cogs', 'cogs').map(v => -v)} sub />
              <StmtRow label="Gross Profit" values={[...histGP, ...projected.map(p => p.grossProfit)]} bold topBorder />
              <StmtRow label="(−) Operating Expenses" values={allVals('opex', 'opex').map(v => -v)} sub />
              <StmtRow label="EBITDA" values={[...histEBITDA, ...projected.map(p => p.ebitda)]} bold topBorder />
              <StmtRow label="(−) D&A" values={allVals('da', 'da').map(v => -v)} sub />
              <StmtRow label="EBIT" values={[...histEBIT, ...projected.map(p => p.ebit)]} bold topBorder />
              <StmtRow label="(+) Other Income" values={[...historical.map(h => h.otherIncome), ...projected.map(p => p.otherIncome)]} sub />
              <StmtRow label="(−) Interest Expense" values={[...historical.map(h => -h.interestExpense), ...projected.map(p => -p.interestExpense)]} sub />
              <StmtRow label="EBT" values={[...histEBT, ...projected.map(p => p.ebt)]} bold topBorder />
              <StmtRow label="(−) Tax" values={[...histTax.map(t => -t), ...projected.map(p => -p.tax)]} sub />
              <StmtRow label="Net Income" values={[...histNI, ...projected.map(p => p.netIncome)]} bold topBorder highlight />
            </TableBody>
          </Table></div></CardContent>
        </Card>

        {/* ══ BALANCE SHEET ══ */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-primary" />Balance Sheet ($K)</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead className="min-w-[140px]">Item</TableHead>{allYearLabels.map((l, i) => <TableHead key={l} className={`text-right min-w-[70px] ${i < hLen ? 'text-muted-foreground' : 'text-primary font-semibold'}`}>{l}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              <StmtRow label="Cash" values={allVals('cash', 'cash')} />
              <StmtRow label="Accounts Receivable" values={allVals('accountsReceivable', 'accountsReceivable')} />
              <StmtRow label="Inventory" values={allVals('inventory', 'inventory')} />
              <StmtRow label="Other Current Assets" values={allVals('otherCurrentAssets', 'otherCurrentAssets')} />
              <StmtRow label="Total Current Assets" values={[...historical.map(h => h.cash + h.accountsReceivable + h.inventory + h.otherCurrentAssets), ...projected.map(p => p.totalCurrentAssets)]} bold topBorder />
              <StmtRow label="PP&E (Net)" values={allVals('ppeNet', 'ppeNet')} />
              <StmtRow label="Other LT Assets" values={allVals('otherLTAssets', 'otherLTAssets')} />
              <StmtRow label="Total Assets" values={[...historical.map(h => h.cash + h.accountsReceivable + h.inventory + h.otherCurrentAssets + h.ppeNet + h.otherLTAssets), ...projected.map(p => p.totalAssets)]} bold topBorder highlight />

              <StmtRow label="" values={allYearLabels.map(() => '')} />
              <StmtRow label="Accounts Payable" values={allVals('accountsPayable', 'accountsPayable')} />
              <StmtRow label="Accrued Expenses" values={allVals('accruedExpenses', 'accruedExpenses')} />
              <StmtRow label="Current Debt" values={allVals('currentDebt', 'currentDebt')} />
              <StmtRow label="Total Current Liabilities" values={[...historical.map(h => h.accountsPayable + h.accruedExpenses + h.currentDebt), ...projected.map(p => p.totalCurrentLiabilities)]} bold topBorder />
              <StmtRow label="Long-Term Debt" values={allVals('longTermDebt', 'longTermDebt')} />
              <StmtRow label="Other LT Liabilities" values={allVals('otherLTLiabilities', 'otherLTLiabilities')} />
              <StmtRow label="Total Liabilities" values={[...historical.map(h => h.accountsPayable + h.accruedExpenses + h.currentDebt + h.longTermDebt + h.otherLTLiabilities), ...projected.map(p => p.totalLiabilities)]} bold topBorder />

              <StmtRow label="" values={allYearLabels.map(() => '')} />
              <StmtRow label="Common Stock" values={allVals('commonStock', 'commonStock')} />
              <StmtRow label="Retained Earnings" values={allVals('retainedEarnings', 'retainedEarnings')} />
              <StmtRow label="Total Equity" values={[...historical.map(h => h.commonStock + h.retainedEarnings), ...projected.map(p => p.totalEquity)]} bold topBorder />
              <StmtRow label="Total Liabilities + Equity" values={[...historical.map(h => h.accountsPayable + h.accruedExpenses + h.currentDebt + h.longTermDebt + h.otherLTLiabilities + h.commonStock + h.retainedEarnings), ...projected.map(p => p.totalLiabEquity)]} bold topBorder highlight />
              <StmtRow label="✓ Balance Check (A − L − E)" values={[...historical.map(() => 0), ...projected.map(p => p.balanceCheck)]} check />
            </TableBody>
          </Table></div></CardContent>
        </Card>

        {/* ══ CASH FLOW ══ */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Cash Flow Statement ($K) — Projected Only</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead className="min-w-[160px]">Item</TableHead>{projected.map(p => <TableHead key={p.label} className="text-right min-w-[70px] text-primary font-semibold">{p.label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              <StmtRow label="Net Income" values={projected.map(p => p.netIncome)} bold />
              <StmtRow label="(+) D&A" values={projected.map(p => p.da)} sub />
              <StmtRow label="Δ Accounts Receivable" values={projected.map(p => p.deltaAR)} sub />
              <StmtRow label="Δ Inventory" values={projected.map(p => p.deltaInv)} sub />
              <StmtRow label="Δ Other Current Assets" values={projected.map(p => p.deltaOCA)} sub />
              <StmtRow label="Δ Accounts Payable" values={projected.map(p => p.deltaAP)} sub />
              <StmtRow label="Δ Accrued Expenses" values={projected.map(p => p.deltaAccrued)} sub />
              <StmtRow label="CF from Operations" values={projected.map(p => p.cfOperating)} bold topBorder highlight />

              <StmtRow label="(−) CapEx" values={projected.map(p => -p.capex)} sub />
              <StmtRow label="CF from Investing" values={projected.map(p => p.cfInvesting)} bold topBorder />

              <StmtRow label="Debt Issued / (Repaid)" values={projected.map(p => p.debtIssued - p.debtRepaid)} sub />
              <StmtRow label="(−) Dividends" values={projected.map(p => -p.dividends)} sub />
              <StmtRow label="CF from Financing" values={projected.map(p => p.cfFinancing)} bold topBorder />

              <StmtRow label="Net Change in Cash" values={projected.map(p => p.netCashFlow)} bold topBorder />
              <StmtRow label="Beginning Cash" values={projected.map(p => p.beginningCash)} sub />
              <StmtRow label="Ending Cash" values={projected.map(p => p.endingCash)} bold topBorder highlight />
            </TableBody>
          </Table></div></CardContent>
        </Card>

        {/* ══ Charts ══ */}
        <Card>
          <CardHeader><CardTitle>Revenue, EBITDA & Net Income Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#1e3a5f" radius={[4, 4, 0, 0]} opacity={0.3} />
                  <Bar dataKey="ebitda" name="EBITDA" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Line dataKey="netIncome" name="Net Income" type="monotone" stroke="#3b7cc0" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cash Flow Waterfall (Projected)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cfChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <Bar dataKey="operating" name="Operating" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="investing" name="Investing" fill="#e57373" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="financing" name="Financing" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  <Line dataKey="net" name="Net CF" type="monotone" stroke="#000" strokeWidth={2} dot={{ r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">3-Statement Model Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Revenue grows from <strong>{fmt(historical[hLen - 1].revenue)}</strong> (base year) to <strong>{fmt(projected[projected.length - 1]?.revenue)}</strong> in Y{A.projectionYears} at {A.revenueGrowthPct}% annual growth. EBITDA expands from {fmt(histEBITDA[hLen - 1])} to <strong>{fmt(projected[projected.length - 1]?.ebitda)}</strong>, with EBITDA margin {projected.length > 0 ? fmtP((projected[projected.length - 1].ebitda / projected[projected.length - 1].revenue) * 100) : '—'}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Net Income reaches <strong>{fmt(projected[projected.length - 1]?.netIncome)}</strong> by Y{A.projectionYears}. Interest expense {A.debtRepayment > 0 ? 'declines as debt is repaid' : 'remains stable'} — long-term debt moves from {fmt(historical[hLen - 1].longTermDebt)} to {fmt(projected[projected.length - 1]?.longTermDebt)}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Cash balance grows from {fmt(historical[hLen - 1].cash)} to <strong>{fmt(projected[projected.length - 1]?.cash)}</strong>, driven by strong operating cash flow. Balance check: <strong>{projected.every(p => Math.abs(p.balanceCheck) < 1) ? '✅ All years balanced' : '⚠ Imbalance detected'}</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top</Button>
      </div>
    </div>
  );
}
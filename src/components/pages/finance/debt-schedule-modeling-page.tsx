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
  HelpCircle, Calculator, ChevronRight, Upload,
  Plus, X, Settings2, CheckCircle2, Layers,
  AlertTriangle, Activity, Shield, Clock, Lightbulb,
  ArrowUpRight, ArrowDownRight, BarChart3, Gauge,
  Wallet, CreditCard, Calendar, Landmark, Lock, Unlock, Zap
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

type DebtType = 'term_loan' | 'revolver' | 'bond' | 'mortgage' | 'note' | 'line_of_credit';
type RateType = 'fixed' | 'variable';
type AmortType = 'level_payment' | 'level_principal' | 'interest_only' | 'bullet';

interface DebtTranche {
  id: string;
  name: string;
  type: DebtType;
  originalPrincipal: number;    // $K
  currentBalance: number;       // $K
  interestRate: number;         // % annual
  rateType: RateType;
  rateSpread: number;           // bps over base (variable only)
  amortization: AmortType;
  termMonths: number;           // total term
  remainingMonths: number;      // months left
  startDate: string;            // YYYY-MM
  maturityDate: string;         // YYYY-MM
  paymentFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  isSecured: boolean;
  collateral: string;
}

interface DebtSettings {
  companyName: string;
  fiscalYear: number;
  projectionYears: number;
  ebitda: number;               // $K annual
  totalRevenue: number;         // $K annual
  cashBalance: number;          // $K
  baseRate: number;             // % (SOFR/prime for variable)
  rateScenarioUp: number;       // bps increase for stress
  rateScenarioDown: number;     // bps decrease
}

interface DebtPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e'];
const DEBT_TYPES: Record<DebtType, { label: string; color: string }> = {
  term_loan: { label: 'Term Loan', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  revolver: { label: 'Revolver', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  bond: { label: 'Bond', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  mortgage: { label: 'Mortgage', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  note: { label: 'Note', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  line_of_credit: { label: 'LOC', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
};
const AMORT_LABELS: Record<AmortType, string> = {
  level_payment: 'Level Payment', level_principal: 'Level Principal', interest_only: 'Interest Only', bullet: 'Bullet',
};
const FREQ_MULTIPLIER: Record<string, number> = { monthly: 12, quarterly: 4, semi_annual: 2, annual: 1 };
const FREQ_LABELS: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual' };

function buildDefaultTranches(): DebtTranche[] {
  return [
    { id: 'd1', name: 'Senior Term Loan A', type: 'term_loan', originalPrincipal: 5000, currentBalance: 4200, interestRate: 5.5, rateType: 'variable', rateSpread: 200, amortization: 'level_payment', termMonths: 60, remainingMonths: 42, startDate: '2023-01', maturityDate: '2027-12', paymentFrequency: 'quarterly', isSecured: true, collateral: 'All assets' },
    { id: 'd2', name: 'Senior Term Loan B', type: 'term_loan', originalPrincipal: 3000, currentBalance: 2800, interestRate: 6.25, rateType: 'fixed', rateSpread: 0, amortization: 'level_principal', termMonths: 84, remainingMonths: 72, startDate: '2024-01', maturityDate: '2030-12', paymentFrequency: 'quarterly', isSecured: true, collateral: 'Equipment' },
    { id: 'd3', name: 'Revolving Credit Facility', type: 'revolver', originalPrincipal: 2500, currentBalance: 800, interestRate: 5.0, rateType: 'variable', rateSpread: 175, amortization: 'interest_only', termMonths: 48, remainingMonths: 36, startDate: '2023-06', maturityDate: '2027-05', paymentFrequency: 'monthly', isSecured: true, collateral: 'AR + Inventory' },
    { id: 'd4', name: 'Corporate Bond (5yr)', type: 'bond', originalPrincipal: 4000, currentBalance: 4000, interestRate: 7.0, rateType: 'fixed', rateSpread: 0, amortization: 'bullet', termMonths: 60, remainingMonths: 48, startDate: '2024-06', maturityDate: '2029-05', paymentFrequency: 'semi_annual', isSecured: false, collateral: '' },
    { id: 'd5', name: 'Office Mortgage', type: 'mortgage', originalPrincipal: 3500, currentBalance: 3100, interestRate: 4.75, rateType: 'fixed', rateSpread: 0, amortization: 'level_payment', termMonths: 240, remainingMonths: 216, startDate: '2023-01', maturityDate: '2042-12', paymentFrequency: 'monthly', isSecured: true, collateral: 'Office building' },
  ];
}

const DEFAULT_SETTINGS: DebtSettings = {
  companyName: 'Acme Corp',
  fiscalYear: new Date().getFullYear(),
  projectionYears: 5,
  ebitda: 4800,
  totalRevenue: 18500,
  cashBalance: 2800,
  baseRate: 4.5,
  rateScenarioUp: 200,
  rateScenarioDown: 100,
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(2)}%`;
const fmtR = (n: number) => isFinite(n) ? n.toFixed(2) : '—';

function effectiveRate(tranche: DebtTranche, baseRate: number): number {
  return tranche.rateType === 'variable' ? baseRate + tranche.rateSpread / 100 : tranche.interestRate;
}

interface YearSchedule {
  year: number;
  beginningBalance: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  endingBalance: number;
}

function computeAmortSchedule(tranche: DebtTranche, baseRate: number, years: number): YearSchedule[] {
  const rate = effectiveRate(tranche, baseRate);
  const periodsPerYear = FREQ_MULTIPLIER[tranche.paymentFrequency];
  const periodicRate = rate / 100 / periodsPerYear;
  let balance = tranche.currentBalance;
  const schedule: YearSchedule[] = [];
  let remainingPeriods = tranche.remainingMonths / (12 / periodsPerYear);

  for (let y = 0; y < years; y++) {
    if (balance <= 0.01) { schedule.push({ year: y + 1, beginningBalance: 0, principalPayment: 0, interestPayment: 0, totalPayment: 0, endingBalance: 0 }); continue; }
    const beg = balance;
    let yearPrincipal = 0;
    let yearInterest = 0;
    const periodsThisYear = Math.min(periodsPerYear, Math.ceil(remainingPeriods));

    for (let p = 0; p < periodsThisYear; p++) {
      if (balance <= 0.01) break;
      const interest = balance * periodicRate;
      let principal = 0;

      if (tranche.amortization === 'level_payment') {
        const totalPeriods = remainingPeriods - (y * periodsPerYear + p);
        if (totalPeriods <= 0) { principal = balance; } else {
          const pmt = periodicRate > 0 ? balance * periodicRate / (1 - Math.pow(1 + periodicRate, -totalPeriods)) : balance / totalPeriods;
          principal = pmt - interest;
        }
      } else if (tranche.amortization === 'level_principal') {
        const totalPeriods = remainingPeriods;
        principal = tranche.currentBalance / totalPeriods;
      } else if (tranche.amortization === 'interest_only') {
        principal = 0;
      } else if (tranche.amortization === 'bullet') {
        const periodsLeft = remainingPeriods - (y * periodsPerYear + p);
        principal = periodsLeft <= 1 ? balance : 0;
      }

      principal = Math.min(principal, balance);
      yearPrincipal += principal;
      yearInterest += interest;
      balance -= principal;
    }

    schedule.push({ year: y + 1, beginningBalance: beg, principalPayment: yearPrincipal, interestPayment: yearInterest, totalPayment: yearPrincipal + yearInterest, endingBalance: balance });
  }
  return schedule;
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Term Loan": "Fixed amount borrowed, repaid over a set schedule with regular principal + interest payments.",
  "Revolver": "Revolving credit facility. Borrow and repay flexibly up to a limit. Pay interest only on drawn amount.",
  "Bullet Maturity": "No principal repayment during the term. Full principal due at maturity.",
  "Amortization": "Gradual repayment of principal. Level payment = fixed total; Level principal = fixed principal portion.",
  "DSCR": "Debt Service Coverage Ratio. EBITDA ÷ Total Debt Service. Ability to cover payments. Target ≥ 1.5x.",
  "Leverage Ratio": "Total Debt ÷ EBITDA. How many years of EBITDA to repay all debt. Lower = less risky.",
  "Interest Coverage": "EBITDA ÷ Total Interest. Ability to cover interest payments. Target ≥ 3.0x.",
  "Weighted Avg Cost": "Blended interest rate across all tranches, weighted by balance.",
  "Maturity Wall": "Concentration of debt maturities in a short period. Creates refinancing risk.",
  "Variable Rate Risk": "Exposure to rising interest rates. Spread over SOFR/base rate.",
  "Secured vs Unsecured": "Secured debt has collateral backing. Unsecured relies solely on creditworthiness.",
  "Debt Capacity": "Maximum additional debt supportable given EBITDA and target leverage.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Debt Schedule Glossary</DialogTitle><DialogDescription>Key terms</DialogDescription></DialogHeader>
      <ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea>
    </DialogContent>
  </Dialog>
);


// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const DebtGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Debt Schedule Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">

          {/* What is it */}
          <div>
            <h3 className="font-semibold text-primary mb-2">What is a Debt Schedule?</h3>
            <p className="text-sm text-muted-foreground">A debt schedule tracks all outstanding debt obligations — principal amortization, interest payments, maturity dates, and covenants. It feeds into the 3-statement model (Interest Expense → IS, Debt Balances → BS, Debt Service → CF) and is essential for LBO models, credit analysis, and refinancing planning.</p>
          </div>

          {/* Modeling Process */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Modeling Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Catalog All Debt', desc: 'Enter each tranche: balance, rate, term, amortization type, payment frequency, and whether secured.' },
                { step: '2', title: 'Generate Schedules', desc: 'Auto-calculate annual principal + interest for each tranche over the projection period.' },
                { step: '3', title: 'Check Covenants', desc: 'DSCR, Leverage, Interest Coverage — are you within lending covenants?' },
                { step: '4', title: 'Stress Test Rates', desc: 'What if base rate rises 200bps? See the impact on variable-rate debt service.' },
                { step: '5', title: 'Identify Maturity Risk', desc: 'Spot maturity walls — large amounts due in a single year requiring refinancing.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Debt Types */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Debt Instrument Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: '🏦', title: 'Term Loan', desc: 'Fixed repayment schedule over set term. Most common corporate debt. Can be amortizing (level payment or level principal) or bullet at maturity.' },
                { icon: '🔄', title: 'Revolver (RCF)', desc: 'Flexible draw-down facility. Interest-only on drawn balance. Acts as a liquidity buffer. Typically committed for 3–5 years.' },
                { icon: '📜', title: 'Bond / Note', desc: 'Fixed-income security. Usually bullet maturity (interest-only, principal at end). Issued in capital markets. Less flexible but often lower cost.' },
                { icon: '🏢', title: 'Mortgage', desc: 'Secured against property/real estate. Long tenor (15–30 years). Level payment amortization. Lower rate due to collateral.' },
                { icon: '💳', title: 'Line of Credit', desc: 'Similar to revolver but typically smaller and for short-term needs. Often unsecured.' },
                { icon: '📝', title: 'Promissory Note', desc: 'Simple debt instrument. Common for intercompany loans, vendor financing, or shareholder loans.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="p-3 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-sm mb-1">{icon} {title}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Amortization Types */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Amortization Methods</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { type: 'Level Payment', desc: 'Equal total payments (P+I). Principal increases over time as interest decreases. Most common for mortgages.', pattern: '▬▬▬▬' },
                { type: 'Level Principal', desc: 'Equal principal payments each period. Total payment decreases over time. Common for term loans.', pattern: '▰▰▰▰' },
                { type: 'Interest Only', desc: 'Pay interest only during term, full principal at maturity. Used for revolvers and some bonds.', pattern: '···●' },
                { type: 'Bullet', desc: 'Zero payments until maturity, then pay everything. Highest refinancing risk.', pattern: '····●' },
              ].map(({ type, desc, pattern }) => (
                <div key={type} className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{type}</p>
                  <p className="font-mono text-[10px] text-primary my-1">{pattern}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Key Metrics & Covenants</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Healthy Range</th><th className="p-2 text-left">Red Flag</th></tr></thead>
                <tbody>
                  {[
                    ['DSCR', 'EBITDA ÷ Total Debt Service', '≥ 1.50x', '< 1.25x'],
                    ['Leverage', 'Total Debt ÷ EBITDA', '≤ 3.0x', '> 4.5x'],
                    ['Interest Coverage', 'EBITDA ÷ Interest Expense', '≥ 3.0x', '< 2.0x'],
                    ['Fixed Charge Coverage', 'EBITDA ÷ (Interest + Mandatory P)', '≥ 1.20x', '< 1.00x'],
                    ['Debt / Equity', 'Total Debt ÷ Total Equity', '≤ 1.5x', '> 3.0x'],
                    ['Weighted Avg Cost', 'Σ(Rate × Balance) ÷ Total Debt', 'Market rate', 'Spread widening'],
                  ].map(([metric, formula, healthy, red], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 border-r font-semibold">{metric}</td>
                      <td className="p-2 border-r font-mono text-muted-foreground">{formula}</td>
                      <td className="p-2 border-r text-green-600">{healthy}</td>
                      <td className="p-2 text-red-500">{red}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rate Risk */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Interest Rate Risk</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2">Fixed vs Variable</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Fixed:</strong> Rate locked for full term. Predictable. No upside if rates fall.</p>
                  <p><strong>Variable:</strong> Base rate (SOFR/EURIBOR) + spread. Cheaper initially but exposed to rate hikes.</p>
                  <p><strong>Ideal mix:</strong> 50–70% fixed for stability, 30–50% variable for flexibility.</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm mb-2">Stress Testing</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Rate Up scenario:</strong> Shows impact of base rate increasing (e.g., +200bps).</p>
                  <p><strong>Rate Down scenario:</strong> Shows savings if rates decrease.</p>
                  <p><strong>Focus on:</strong> How variable-rate tranches affect total debt service and DSCR under stress.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Maturity Wall */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Maturity Wall Analysis</h3>
            <p className="text-sm text-muted-foreground mb-3">A maturity wall shows total debt maturing per year. Key risks:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { title: 'Concentration Risk', desc: 'Multiple tranches maturing in the same year creates a large refinancing need. Stagger maturities across years.' },
                { title: 'EBITDA Comparison', desc: 'Any year with maturities exceeding 50% of EBITDA is a red flag — you may not generate enough cash to repay.' },
                { title: 'Market Timing', desc: 'If markets are tight when debt matures, refinancing costs spike. Maintain 12–18 month runway before maturities.' },
                { title: 'Mitigation', desc: 'Proactively extend or refinance 12+ months early. Maintain a revolver as backup liquidity.' },
              ].map(({ title, desc }) => (
                <div key={title} className="p-3 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Explained */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Reading the Charts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { title: 'Payment Schedule', desc: 'Stacked bars show principal (navy) + interest (teal) per year. Red line tracks declining balance. Watch for years where payments spike.' },
                { title: 'Balance by Tranche', desc: 'Stacked area chart shows how each tranche\'s balance declines over time. Reveals which tranches dominate the portfolio.' },
                { title: 'Rate Sensitivity', desc: 'Bar = base case interest. Dashed lines show interest under rate up/down scenarios. Gap between lines = your rate exposure.' },
                { title: 'Maturity Wall', desc: 'Bar chart of total maturities per year. Bars exceeding EBITDA line (green dashed) indicate refinancing risk.' },
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
              <li>• <strong>DSCR below 1.25x</strong> is a red flag — debt service exceeds comfortable operating cash flow.</li>
              <li>• <strong>Leverage above 4.0x</strong> limits refinancing options and may trigger covenant violations.</li>
              <li>• Keep at least <strong>20–30% of debt at fixed rates</strong> to hedge against variable-rate risk.</li>
              <li>• Click the expand arrow on any tranche row to see its detailed period-by-period amortization schedule.</li>
              <li>• Use the EBITDA and projection inputs to test how operating performance changes affect debt serviceability.</li>
              <li>• Export individual tranche schedules or the full debt summary via the Export dropdown.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSE & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_DEBT_CSV = `Name,Type,OriginalPrincipal,CurrentBalance,Rate,RateType,Spread,Amortization,TermMonths,RemainingMonths,StartDate,MaturityDate,Frequency,Secured
Senior Term Loan A,term_loan,5000,4200,5.5,variable,200,level_payment,60,42,2023-01,2027-12,quarterly,true
Senior Term Loan B,term_loan,3000,2800,6.25,fixed,0,level_principal,84,72,2024-01,2030-12,quarterly,true
Revolving Credit,revolver,2500,800,5.0,variable,175,interest_only,48,36,2023-06,2027-05,monthly,true
Corporate Bond,bond,4000,4000,7.0,fixed,0,bullet,60,48,2024-06,2029-05,semi_annual,false
Office Mortgage,mortgage,3500,3100,4.75,fixed,0,level_payment,240,216,2023-01,2042-12,monthly,true`;

function parseDebtCSV(rows: Record<string, any>[]): DebtTranche[] | null {
  if (!rows || rows.length === 0) return null;
  const keys = Object.keys(rows[0]).map(k => k.toLowerCase().trim());
  const hasName = keys.some(k => k === 'name');
  const hasBalance = keys.some(k => k.includes('balance') || k.includes('principal'));
  if (!hasName || !hasBalance) return null;

  const get = (row: Record<string, any>, ...searches: string[]): string => {
    for (const s of searches) {
      const found = Object.entries(row).find(([k]) => k.toLowerCase().trim().includes(s));
      if (found && found[1] != null && found[1] !== '') return String(found[1]);
    }
    return '';
  };
  const getN = (row: Record<string, any>, ...searches: string[]): number => parseFloat(get(row, ...searches)) || 0;

  const validTypes: DebtType[] = ['term_loan', 'revolver', 'bond', 'mortgage', 'note', 'line_of_credit'];
  const validAmort: AmortType[] = ['level_payment', 'level_principal', 'interest_only', 'bullet'];
  const validFreq = ['monthly', 'quarterly', 'semi_annual', 'annual'];

  const tranches: DebtTranche[] = rows.map((row, i) => {
    const rawType = get(row, 'type').toLowerCase().replace(/\s+/g, '_');
    const rawAmort = get(row, 'amort').toLowerCase().replace(/\s+/g, '_');
    const rawFreq = get(row, 'freq').toLowerCase().replace(/\s+/g, '_');
    return {
      id: `imp${Date.now()}_${i}`,
      name: get(row, 'name') || `Tranche ${i + 1}`,
      type: (validTypes.includes(rawType as DebtType) ? rawType : 'term_loan') as DebtType,
      originalPrincipal: getN(row, 'originalprincipal', 'original'),
      currentBalance: getN(row, 'currentbalance', 'balance'),
      interestRate: getN(row, 'rate', 'interest'),
      rateType: (get(row, 'ratetype', 'rate_type').toLowerCase().includes('var') ? 'variable' : 'fixed') as RateType,
      rateSpread: getN(row, 'spread'),
      amortization: (validAmort.includes(rawAmort as AmortType) ? rawAmort : 'level_payment') as AmortType,
      termMonths: getN(row, 'termmonths', 'term'),
      remainingMonths: getN(row, 'remainingmonths', 'remaining'),
      startDate: get(row, 'startdate', 'start') || '2024-01',
      maturityDate: get(row, 'maturitydate', 'maturity') || '2029-01',
      paymentFrequency: (validFreq.includes(rawFreq) ? rawFreq : 'quarterly') as DebtTranche['paymentFrequency'],
      isSecured: ['true', 'yes', '1'].includes(get(row, 'secured').toLowerCase()),
      collateral: get(row, 'collateral'),
    };
  }).filter(t => t.currentBalance > 0);

  return tranches.length > 0 ? tranches : null;
}

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownload = () => {
    const blob = new Blob([SAMPLE_DEBT_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'sample_debt_schedule.csv'; link.click();
    toast({ title: "Downloaded!" });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Debt Data Format</DialogTitle><DialogDescription>One row per debt tranche</DialogDescription></DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Each row is a debt instrument. All amounts in $K.</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-[9px] font-mono">
                <thead><tr className="bg-muted/50"><th className="p-1.5 text-left">Name</th><th className="p-1.5">Type</th><th className="p-1.5 text-right">Balance</th><th className="p-1.5 text-right">Rate%</th><th className="p-1.5">RateType</th><th className="p-1.5">Amort</th><th className="p-1.5">Maturity</th></tr></thead>
                <tbody>
                  {[['Senior TL-A', 'term_loan', '4,200', '5.5', 'variable', 'level_payment', '2027-12'], ['Bond', 'bond', '4,000', '7.0', 'fixed', 'bullet', '2029-05']].map(([n, t, b, r, rt, a, m], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-1.5">{n}</td><td className="p-1.5">{t}</td><td className="p-1.5 text-right">{b}</td><td className="p-1.5 text-right">{r}</td><td className="p-1.5">{rt}</td><td className="p-1.5">{a}</td><td className="p-1.5">{m}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Type', items: 'term_loan, revolver, bond, mortgage, note, line_of_credit' },
                { name: 'Amortization', items: 'level_payment, level_principal, interest_only, bullet' },
                { name: 'Frequency', items: 'monthly, quarterly, semi_annual, annual' },
                { name: 'RateType', items: 'fixed, variable (+ Spread in bps)' },
              ].map(({ name, items }) => (
                <div key={name} className="p-3 rounded-lg border bg-muted/20"><p className="font-semibold text-xs">{name}</p><p className="text-[10px] text-muted-foreground mt-1">{items}</p></div>
              ))}
            </div>
            <div className="flex justify-center"><Button variant="outline" onClick={handleDownload}><Download className="w-4 h-4 mr-2" />Download Sample CSV</Button></div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({ onStart, hasUploadedData, onStartWithData }: { onStart: () => void; hasUploadedData: boolean; onStartWithData: () => void }) => {
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Landmark className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Debt Schedule Modeling</CardTitle>
          <CardDescription className="text-base mt-2">Track and forecast principal and interest payments for organizational debt</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Calendar, title: 'Amortization Schedules', desc: 'Per-tranche P&I breakdown with 4 amortization types' },
              { icon: Gauge, title: 'Covenant Monitoring', desc: 'DSCR, Leverage, Interest Coverage in real-time' },
              { icon: AlertTriangle, title: 'Rate Stress Test', desc: 'Variable-rate exposure under rising/falling rate scenarios' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className={`border-2 transition-all ${hasUploadedData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasUploadedData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Upload Debt Data</CardTitle><CardDescription className="text-xs">One row per tranche (CSV)</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Debt data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button></>
                ) : (
                  <><p className="text-sm text-muted-foreground">Upload your debt tranches — name, balance, rate, amortization type, maturity date, and more.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Name | Balance | Rate | RateType | Amort | Maturity</p>
                      <p className="text-muted-foreground">e.g. Term Loan A, 4200, 5.5, variable, level_payment, 2027-12</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFormatGuideOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide</Button></>
                )}
              </CardContent>
            </Card>
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">5 sample debt tranches</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Pre-loaded: 2 term loans, revolver, bond, and mortgage. Fully editable.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {['5 debt tranches', '4 amortization types', 'Fixed & variable rates', 'Maturity wall analysis'].map(f => (
                    <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />{f}</div>
                  ))}
                </div>
                <Button variant="outline" onClick={onStart} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
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

export default function DebtSchedulePage({ data, numericHeaders, categoricalHeaders, onLoadExample }: DebtPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedTranche, setExpandedTranche] = useState<string | null>(null);

  const [settings, setSettings] = useState<DebtSettings>(DEFAULT_SETTINGS);
  const [tranches, setTranches] = useState<DebtTranche[]>(buildDefaultTranches);

  // CSV upload detection
  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    return parseDebtCSV(data);
  }, [data]);
  const applyUpload = useCallback(() => { if (parsedUpload) setTranches(parsedUpload); setShowIntro(false); }, [parsedUpload]);

  const S = settings;
  const N = S.projectionYears;

  // ── Per-tranche schedules ──
  const trancheSchedules = useMemo(() =>
    tranches.map(t => ({ tranche: t, schedule: computeAmortSchedule(t, S.baseRate, N) })),
  [tranches, S.baseRate, N]);

  // ── Aggregated annual schedule ──
  const annualSchedule = useMemo(() => {
    return Array.from({ length: N }, (_, y) => {
      let totalPrincipal = 0, totalInterest = 0, totalBeginning = 0, totalEnding = 0;
      trancheSchedules.forEach(({ schedule }) => {
        if (schedule[y]) {
          totalPrincipal += schedule[y].principalPayment;
          totalInterest += schedule[y].interestPayment;
          totalBeginning += schedule[y].beginningBalance;
          totalEnding += schedule[y].endingBalance;
        }
      });
      return { year: `Y${y + 1}`, principal: totalPrincipal, interest: totalInterest, total: totalPrincipal + totalInterest, beginningBalance: totalBeginning, endingBalance: totalEnding };
    });
  }, [trancheSchedules, N]);

  // ── Metrics ──
  const totalDebt = useMemo(() => tranches.reduce((s, t) => s + t.currentBalance, 0), [tranches]);
  const totalOriginal = useMemo(() => tranches.reduce((s, t) => s + t.originalPrincipal, 0), [tranches]);
  const y1DebtService = annualSchedule[0]?.total || 0;
  const y1Interest = annualSchedule[0]?.interest || 0;
  const y1Principal = annualSchedule[0]?.principal || 0;

  const weightedAvgRate = useMemo(() => {
    if (totalDebt === 0) return 0;
    return tranches.reduce((s, t) => s + effectiveRate(t, S.baseRate) * t.currentBalance, 0) / totalDebt;
  }, [tranches, S.baseRate, totalDebt]);

  const weightedAvgMaturity = useMemo(() => {
    if (totalDebt === 0) return 0;
    return tranches.reduce((s, t) => s + (t.remainingMonths / 12) * t.currentBalance, 0) / totalDebt;
  }, [tranches, totalDebt]);

  const dscr = y1DebtService > 0 ? S.ebitda / y1DebtService : Infinity;
  const leverage = S.ebitda > 0 ? totalDebt / S.ebitda : Infinity;
  const interestCoverage = y1Interest > 0 ? S.ebitda / y1Interest : Infinity;

  const fixedPct = useMemo(() => totalDebt > 0 ? (tranches.filter(t => t.rateType === 'fixed').reduce((s, t) => s + t.currentBalance, 0) / totalDebt) * 100 : 0, [tranches, totalDebt]);
  const securedPct = useMemo(() => totalDebt > 0 ? (tranches.filter(t => t.isSecured).reduce((s, t) => s + t.currentBalance, 0) / totalDebt) * 100 : 0, [tranches, totalDebt]);
  const revolverAvail = useMemo(() => tranches.filter(t => t.type === 'revolver').reduce((s, t) => s + (t.originalPrincipal - t.currentBalance), 0), [tranches]);

  // Rate stress
  const stressUp = useMemo(() => {
    const stressBase = S.baseRate + S.rateScenarioUp / 100;
    return tranches.map(t => ({ tranche: t, schedule: computeAmortSchedule(t, stressBase, N) }));
  }, [tranches, S.baseRate, S.rateScenarioUp, N]);
  const stressDown = useMemo(() => {
    const stressBase = Math.max(0, S.baseRate - S.rateScenarioDown / 100);
    return tranches.map(t => ({ tranche: t, schedule: computeAmortSchedule(t, stressBase, N) }));
  }, [tranches, S.baseRate, S.rateScenarioDown, N]);

  const stressData = useMemo(() => Array.from({ length: N }, (_, y) => ({
    year: `Y${y + 1}`,
    base: annualSchedule[y]?.total || 0,
    up: stressUp.reduce((s, { schedule }) => s + (schedule[y]?.totalPayment || 0), 0),
    down: stressDown.reduce((s, { schedule }) => s + (schedule[y]?.totalPayment || 0), 0),
  })), [annualSchedule, stressUp, stressDown, N]);

  // Maturity wall
  const maturityWall = useMemo(() => {
    const wall: Record<string, number> = {};
    tranches.forEach(t => {
      const yr = t.maturityDate.slice(0, 4);
      wall[yr] = (wall[yr] || 0) + t.currentBalance;
    });
    return Object.entries(wall).sort((a, b) => a[0].localeCompare(b[0])).map(([year, amount]) => ({ year, amount }));
  }, [tranches]);

  // Debt capacity
  const targetLeverage = 3.5;
  const debtCapacity = Math.max(0, S.ebitda * targetLeverage - totalDebt);

  // ── CRUD ──
  const updateTranche = useCallback((id: string, u: Partial<DebtTranche>) => { setTranches(p => p.map(t => t.id === id ? { ...t, ...u } : t)); }, []);
  const addTranche = useCallback((type: DebtType) => {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setTranches(p => [...p, {
      id: `d${Date.now()}`, name: `New ${DEBT_TYPES[type].label}`, type, originalPrincipal: 1000, currentBalance: 1000,
      interestRate: 5.0, rateType: 'fixed', rateSpread: 0, amortization: 'level_payment',
      termMonths: 60, remainingMonths: 60, startDate: start, maturityDate: `${now.getFullYear() + 5}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      paymentFrequency: 'quarterly', isSecured: false, collateral: '',
    }]);
  }, []);
  const removeTranche = useCallback((id: string) => { setTranches(p => p.filter(t => t.id !== id)); if (expandedTranche === id) setExpandedTranche(null); }, [expandedTranche]);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `DebtSchedule_${S.fiscalYear}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, [S.fiscalYear]);

  const handleDownloadCSV = useCallback(() => {
    let csv = `DEBT SCHEDULE — ${S.companyName} FY${S.fiscalYear}\n\n`;
    csv += `SUMMARY\nTotal Debt,${fmt(totalDebt)}\nWeighted Avg Rate,${fmtP(weightedAvgRate)}\nDSCR,${fmtR(dscr)}x\nLeverage,${fmtR(leverage)}x\n\n`;
    csv += `ANNUAL SCHEDULE\n${Papa.unparse(annualSchedule.map(a => ({ Year: a.year, Principal: Math.round(a.principal), Interest: Math.round(a.interest), Total: Math.round(a.total), 'Ending Balance': Math.round(a.endingBalance) })))}\n\n`;
    tranches.forEach(t => {
      const sch = trancheSchedules.find(ts => ts.tranche.id === t.id)?.schedule || [];
      csv += `${t.name}\n${Papa.unparse(sch.map(s => ({ Year: `Y${s.year}`, Beginning: Math.round(s.beginningBalance), Principal: Math.round(s.principalPayment), Interest: Math.round(s.interestPayment), Ending: Math.round(s.endingBalance) })))}\n\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `DebtSchedule_${S.fiscalYear}.csv`; link.click();
  }, [S, totalDebt, weightedAvgRate, dscr, leverage, annualSchedule, tranches, trancheSchedules]);

  if (showIntro) return <IntroPage hasUploadedData={!!parsedUpload} onStartWithData={applyUpload} onStart={() => setShowIntro(false)} />;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Debt Schedule Model</h1><p className="text-muted-foreground mt-1">{S.companyName} — FY{S.fiscalYear} | {tranches.length} tranches</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <DebtGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div><div><CardTitle>Company & Rate Settings</CardTitle><CardDescription>Financials for covenant calculation and rate scenarios</CardDescription></div></div></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Company', key: 'companyName', type: 'text' },
              { label: 'EBITDA ($K)', key: 'ebitda' },
              { label: 'Revenue ($K)', key: 'totalRevenue' },
              { label: 'Cash ($K)', key: 'cashBalance' },
              { label: 'Projection Years', key: 'projectionYears', step: 1 },
              { label: 'Base Rate %', key: 'baseRate', step: 0.25 },
              { label: 'Stress Up (bps)', key: 'rateScenarioUp', step: 25 },
              { label: 'Stress Down (bps)', key: 'rateScenarioDown', step: 25 },
            ].map(({ label, key, type, step }) => (
              <div key={key} className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type={type || 'number'} value={(S as any)[key]} onChange={e => setSettings(p => ({ ...p, [key]: type === 'text' ? e.target.value : parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" step={step} /></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Debt Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Debt', value: fmt(totalDebt), sub: `of ${fmt(totalOriginal)} original` },
                { label: 'Wtd Avg Rate', value: fmtP(weightedAvgRate) },
                { label: 'Wtd Avg Maturity', value: `${weightedAvgMaturity.toFixed(1)} yr` },
                { label: 'Y1 Debt Service', value: fmt(Math.round(y1DebtService)), sub: `P: ${fmt(Math.round(y1Principal))} + I: ${fmt(Math.round(y1Interest))}` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold text-primary">{value}</p>{sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}</div>
              ))}
            </div>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'DSCR', value: `${fmtR(dscr)}x`, ok: dscr >= 1.5, target: '≥ 1.50x' },
                { label: 'Leverage', value: `${fmtR(leverage)}x`, ok: leverage <= 3.5, target: '≤ 3.50x' },
                { label: 'Interest Coverage', value: `${fmtR(interestCoverage)}x`, ok: interestCoverage >= 3.0, target: '≥ 3.00x' },
                { label: 'Fixed Rate %', value: fmtP(fixedPct) },
                { label: 'Revolver Avail', value: fmt(revolverAvail) },
              ].map(({ label, value, ok, target }) => (
                <div key={label} className="text-center"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-sm font-bold ${ok !== undefined ? (ok ? 'text-green-600' : 'text-red-600') : 'text-primary'}`}>{value}</p>{target && <p className="text-[10px] text-muted-foreground">{target}</p>}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Debt Register ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Landmark className="w-5 h-5 text-primary" /></div><div><CardTitle>Debt Tranches</CardTitle><CardDescription>Click to expand amortization schedule</CardDescription></div></div>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button></DropdownMenuTrigger><DropdownMenuContent>{(Object.entries(DEBT_TYPES) as [DebtType, any][]).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => addTranche(k)}>{v.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        </div></CardHeader>
        <CardContent><div className="overflow-x-auto"><Table>
          <TableHeader><TableRow>
            <TableHead className="min-w-[140px]">Tranche</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-center">Amort</TableHead>
            <TableHead className="text-center">Freq</TableHead>
            <TableHead className="text-center">Maturity</TableHead>
            <TableHead className="text-center">Secured</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {tranches.map((t, i) => {
              const eff = effectiveRate(t, S.baseRate);
              return (
                <React.Fragment key={t.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedTranche(prev => prev === t.id ? null : t.id)}>
                    <TableCell><div className="flex items-center gap-1.5"><ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedTranche === t.id ? 'rotate-90' : ''}`} /><div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-xs font-medium">{t.name}</span></div></TableCell>
                    <TableCell className="text-center"><Badge className={`text-[9px] ${DEBT_TYPES[t.type].color}`}>{DEBT_TYPES[t.type].label}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{fmt(t.currentBalance)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtP(eff)}{t.rateType === 'variable' && <span className="text-[8px] text-muted-foreground ml-0.5">V</span>}</TableCell>
                    <TableCell className="text-center text-[9px] text-muted-foreground">{AMORT_LABELS[t.amortization]}</TableCell>
                    <TableCell className="text-center text-[9px] text-muted-foreground">{FREQ_LABELS[t.paymentFrequency]}</TableCell>
                    <TableCell className="text-center text-xs font-mono">{t.maturityDate}</TableCell>
                    <TableCell className="text-center">{t.isSecured ? <Lock className="w-3.5 h-3.5 text-green-600 mx-auto" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeTranche(t.id)}><X className="w-3 h-3" /></Button></TableCell>
                  </TableRow>
                  {expandedTranche === t.id && (
                    <TableRow><TableCell colSpan={9} className="p-0">
                      <div className="bg-muted/10 border-y px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Name', key: 'name', type: 'text' },
                            { label: 'Original ($K)', key: 'originalPrincipal' },
                            { label: 'Balance ($K)', key: 'currentBalance' },
                            { label: 'Rate %', key: 'interestRate', step: 0.25 },
                            { label: 'Term (mo)', key: 'termMonths' },
                            { label: 'Remaining (mo)', key: 'remainingMonths' },
                            { label: 'Start', key: 'startDate', type: 'text' },
                            { label: 'Maturity', key: 'maturityDate', type: 'text' },
                          ].map(({ label, key, type, step }) => (
                            <div key={key} className="space-y-1"><Label className="text-[10px]">{label}</Label><Input type={type || 'number'} value={(t as any)[key]} onChange={e => updateTranche(t.id, { [key]: type === 'text' ? e.target.value : parseFloat(e.target.value) || 0 })} className="h-6 text-xs font-mono" step={step} /></div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="space-y-1"><Label className="text-[10px]">Rate Type</Label><div className="flex gap-1">{(['fixed', 'variable'] as const).map(rt => <Button key={rt} variant={t.rateType === rt ? 'default' : 'outline'} size="sm" className="text-[8px] h-5 flex-1 capitalize" onClick={() => updateTranche(t.id, { rateType: rt })}>{rt}</Button>)}</div></div>
                          <div className="space-y-1"><Label className="text-[10px]">Amortization</Label><div className="flex gap-0.5 flex-wrap">{(Object.entries(AMORT_LABELS) as [AmortType, string][]).map(([k, v]) => <Button key={k} variant={t.amortization === k ? 'default' : 'outline'} size="sm" className="text-[7px] h-5 px-1" onClick={() => updateTranche(t.id, { amortization: k })}>{v}</Button>)}</div></div>
                          <div className="space-y-1"><Label className="text-[10px]">Frequency</Label><div className="flex gap-0.5 flex-wrap">{(Object.entries(FREQ_LABELS) as [string, string][]).map(([k, v]) => <Button key={k} variant={t.paymentFrequency === k ? 'default' : 'outline'} size="sm" className="text-[7px] h-5 px-1" onClick={() => updateTranche(t.id, { paymentFrequency: k as any })}>{v}</Button>)}</div></div>
                          <div className="space-y-1"><Label className="text-[10px]">Secured</Label><div className="flex gap-1"><Button variant={t.isSecured ? 'default' : 'outline'} size="sm" className="text-[8px] h-5 flex-1" onClick={() => updateTranche(t.id, { isSecured: true })}>Yes</Button><Button variant={!t.isSecured ? 'default' : 'outline'} size="sm" className="text-[8px] h-5 flex-1" onClick={() => updateTranche(t.id, { isSecured: false })}>No</Button></div></div>
                        </div>
                        {/* Mini schedule */}
                        <div><Label className="text-[10px] font-semibold">Amortization Schedule</Label>
                          <div className="overflow-x-auto mt-1"><table className="w-full text-[10px] font-mono"><thead><tr className="text-muted-foreground"><th className="p-1 text-left">Year</th><th className="p-1 text-right">Beginning</th><th className="p-1 text-right">Principal</th><th className="p-1 text-right">Interest</th><th className="p-1 text-right">Total</th><th className="p-1 text-right">Ending</th></tr></thead>
                            <tbody>{trancheSchedules.find(ts => ts.tranche.id === t.id)?.schedule.map(s => (
                              <tr key={s.year}><td className="p-1">Y{s.year}</td><td className="p-1 text-right">{fmt(Math.round(s.beginningBalance))}</td><td className="p-1 text-right">{fmt(Math.round(s.principalPayment))}</td><td className="p-1 text-right text-muted-foreground">{fmt(Math.round(s.interestPayment))}</td><td className="p-1 text-right font-semibold">{fmt(Math.round(s.totalPayment))}</td><td className="p-1 text-right">{fmt(Math.round(s.endingBalance))}</td></tr>
                            ))}</tbody></table></div>
                        </div>
                      </div>
                    </TableCell></TableRow>
                  )}
                </React.Fragment>
              );
            })}
            <TableRow className="border-t-2 bg-primary/5">
              <TableCell className="font-bold text-primary">Total</TableCell><TableCell></TableCell>
              <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmt(totalDebt)}</TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold">{fmtP(weightedAvgRate)}</TableCell>
              <TableCell colSpan={5}></TableCell>
            </TableRow>
          </TableBody>
        </Table></div></CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report</h2>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">{S.companyName} — Debt Schedule</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {tranches.length} Tranches | {N}-Year Projection</p></div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Debt', value: fmt(totalDebt), sub: `${tranches.length} tranches`, color: 'text-primary' },
            { label: 'DSCR', value: dscr === Infinity ? '∞' : `${dscr.toFixed(2)}x`, sub: dscr >= 1.5 ? 'Adequate' : dscr >= 1.25 ? 'Marginal' : 'At risk', color: dscr >= 1.5 ? 'text-green-600' : dscr >= 1.25 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Leverage', value: leverage === Infinity ? '∞' : `${leverage.toFixed(1)}x`, sub: leverage <= 3 ? 'Conservative' : leverage <= 4.5 ? 'Moderate' : 'High', color: leverage <= 3 ? 'text-green-600' : leverage <= 4.5 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Wtd Avg Rate', value: `${weightedAvgRate.toFixed(2)}%`, sub: `${fixedPct.toFixed(0)}% fixed / ${(100 - fixedPct).toFixed(0)}% variable`, color: 'text-primary' },
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

        {/* Debt Tranche Detail Table */}
        <Card>
          <CardHeader><CardTitle>Debt Tranche Detail</CardTitle><CardDescription>Balance, rate, amortization, and maturity by tranche</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Tranche</th>
              <th className="p-2 text-left font-semibold">Type</th>
              <th className="p-2 text-right font-semibold">Balance</th>
              <th className="p-2 text-right font-semibold">Rate</th>
              <th className="p-2 text-center font-semibold">Rate Type</th>
              <th className="p-2 text-left font-semibold">Amort</th>
              <th className="p-2 text-right font-semibold">Remaining</th>
              <th className="p-2 text-left font-semibold">Maturity</th>
              <th className="p-2 text-right font-semibold">% of Total</th>
            </tr></thead>
            <tbody>{tranches.map((t, i) => {
              const pctOfTotal = totalDebt > 0 ? (t.currentBalance / totalDebt * 100) : 0;
              const mRemain = t.remainingMonths;
              return (
                <tr key={t.id} className={`border-b ${mRemain <= 12 ? 'bg-red-50/30 dark:bg-red-950/10' : mRemain <= 24 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{t.name}</div></td>
                  <td className="p-2 text-muted-foreground capitalize">{t.type.replace('_', ' ')}</td>
                  <td className="p-2 text-right font-mono font-semibold">{fmt(t.currentBalance)}</td>
                  <td className="p-2 text-right font-mono">{t.interestRate.toFixed(2)}%</td>
                  <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.rateType === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{t.rateType}</span></td>
                  <td className="p-2 capitalize">{t.amortization.replace('_', ' ')}</td>
                  <td className={`p-2 text-right font-mono ${mRemain <= 12 ? 'text-red-600 font-semibold' : mRemain <= 24 ? 'text-amber-600' : ''}`}>{Math.round(mRemain / 12 * 10) / 10}yr</td>
                  <td className="p-2 font-mono">{t.maturityDate}</td>
                  <td className="p-2 text-right font-mono">{pctOfTotal.toFixed(1)}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{fmt(totalDebt)}</td>
              <td className="p-2 text-right font-mono">{weightedAvgRate.toFixed(2)}%</td>
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{weightedAvgMaturity.toFixed(1)}yr</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">100%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Debt schedule highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Total debt: ${fmt(totalDebt)} across ${tranches.length} tranches. Weighted avg rate: ${weightedAvgRate.toFixed(2)}%. Avg maturity: ${weightedAvgMaturity.toFixed(1)} years.`);
                  items.push(`DSCR: ${dscr === Infinity ? '∞' : dscr.toFixed(2)}x${dscr >= 1.5 ? ' — adequate debt service coverage.' : dscr >= 1.25 ? ' — marginal, monitor closely.' : ' — below 1.25x — debt service at risk.'}`);
                  items.push(`Leverage: ${leverage === Infinity ? '∞' : leverage.toFixed(1)}x Debt/EBITDA${leverage <= 3.0 ? ' — conservative.' : leverage <= 4.5 ? ' — moderate.' : ' — high leverage, refinancing risk.'}`);
                  items.push(`Rate mix: ${fixedPct.toFixed(0)}% fixed / ${(100 - fixedPct).toFixed(0)}% variable. ${fixedPct >= 60 ? 'Well-hedged against rate increases.' : fixedPct >= 30 ? 'Moderate rate exposure.' : 'Heavily exposed to rate increases.'}`);
                  const bigMat = maturityWall.filter(m => m.amount > S.ebitda * 0.5);
                  if (bigMat.length > 0) items.push(`Maturity wall: ${bigMat.length} year${bigMat.length > 1 ? 's' : ''} with maturities exceeding 50% of EBITDA (${bigMat.map(m => m.year).join(', ')}). Refinancing risk.`);
                  else items.push(`No maturity wall concentration — maturities well-distributed.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debt Service Waterfall */}
        <Card>
          <CardHeader><CardTitle>Annual Debt Service — Principal vs Interest</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={annualSchedule}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `$${v.toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}K`, '']} />
                  <Legend />
                  <Bar dataKey="principal" name="Principal" stackId="a" fill="#1e3a5f" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="interest" name="Interest" stackId="a" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Line dataKey="endingBalance" name="Ending Balance" type="monotone" stroke="#e57373" strokeWidth={2} dot={{ r: 4 }} yAxisId={0} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Balance Rundown by Tranche */}
        <Card>
          <CardHeader><CardTitle>Debt Balance Rundown by Tranche</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.from({ length: N }, (_, y) => {
                  const row: any = { year: `Y${y + 1}` };
                  trancheSchedules.forEach(({ tranche, schedule }, i) => { row[tranche.name] = Math.round(schedule[y]?.endingBalance || 0); });
                  return row;
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  {tranches.map((t, i) => (
                    <Area key={t.id} dataKey={t.name} stackId="1" type="monotone" fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.6} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rate Stress */}
        <Card>
          <CardHeader><CardTitle>Interest Rate Stress — Total Debt Service</CardTitle><CardDescription>Base ({fmtP(S.baseRate)}) vs +{S.rateScenarioUp}bps vs −{S.rateScenarioDown}bps</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `$${v.toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}K`, '']} />
                  <Legend />
                  <Bar dataKey="base" name="Base" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  <Line dataKey="up" name={`+${S.rateScenarioUp}bps`} type="monotone" stroke="#e57373" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line dataKey="down" name={`-${S.rateScenarioDown}bps`} type="monotone" stroke="#0d9488" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <ReferenceLine y={S.ebitda} stroke="#000" strokeDasharray="3 3" label={{ value: `EBITDA ${fmt(S.ebitda)}`, position: 'right', fontSize: 9 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Maturity Wall */}
        <Card>
          <CardHeader><CardTitle>Maturity Wall</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maturityWall}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, 'Matures']} />
                  <Bar dataKey="amount" name="Maturing Debt" radius={[4, 4, 0, 0]}>
                    {maturityWall.map((d, i) => <Cell key={i} fill={d.amount > S.ebitda ? '#e57373' : '#1e3a5f'} />)}
                  </Bar>
                  <ReferenceLine y={S.ebitda} stroke="#0d9488" strokeDasharray="3 3" label={{ value: 'EBITDA', position: 'right', fontSize: 9 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Covenant & Capacity */}
        <Card>
          <CardHeader><CardTitle>Covenant Compliance & Debt Capacity</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'DSCR', value: `${fmtR(dscr)}x`, threshold: '≥ 1.50x', ok: dscr >= 1.5 },
                { label: 'Leverage', value: `${fmtR(leverage)}x`, threshold: '≤ 3.50x', ok: leverage <= 3.5 },
                { label: 'Interest Coverage', value: `${fmtR(interestCoverage)}x`, threshold: '≥ 3.00x', ok: interestCoverage >= 3.0 },
                { label: 'Debt Capacity', value: fmt(Math.round(debtCapacity)), threshold: `at ${targetLeverage}x leverage`, ok: debtCapacity > 0 },
              ].map(({ label, value, threshold, ok }) => (
                <div key={label} className={`p-4 rounded-lg border text-center ${ok ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800' : 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800'}`}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${ok ? 'text-green-600' : 'text-red-600'}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{threshold}</p>
                  <Badge className={`mt-1 text-[9px] ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ok ? 'Pass' : 'Breach'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Schedule Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">{S.companyName} — Debt Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>{S.companyName}</strong> carries <strong>{fmt(totalDebt)}</strong> in total debt across {tranches.length} tranches at a weighted average rate of <strong>{fmtP(weightedAvgRate)}</strong> with {weightedAvgMaturity.toFixed(1)} years average maturity. {fmtP(fixedPct)} is fixed-rate and {fmtP(securedPct)} is secured.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Year 1 debt service is <strong>{fmt(Math.round(y1DebtService))}</strong> (P: {fmt(Math.round(y1Principal))} + I: {fmt(Math.round(y1Interest))}). DSCR of <strong>{fmtR(dscr)}x</strong> {dscr >= 1.5 ? 'provides adequate coverage' : 'is below the 1.5x minimum'}. Leverage ratio of {fmtR(leverage)}x {leverage <= 3.5 ? 'is within acceptable range' : 'exceeds the 3.5x threshold'}.
                </p>
                {(() => {
                  const bigMaturities = maturityWall.filter(m => m.amount > S.ebitda * 0.5);
                  return bigMaturities.length > 0 ? (
                    <p className="text-sm leading-relaxed text-muted-foreground"><strong>Maturity wall risk:</strong> {bigMaturities.map(m => `${m.year} (${fmt(m.amount)})`).join(', ')} — consider refinancing or building cash reserves ahead of these dates.</p>
                  ) : (<p className="text-sm leading-relaxed text-muted-foreground">No significant maturity concentration detected.</p>);
                })()}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Under rate stress (+{S.rateScenarioUp}bps), Y1 debt service increases to {fmt(Math.round(stressData[0]?.up || 0))} — {S.ebitda > (stressData[0]?.up || 0) ? 'still within EBITDA capacity' : 'would exceed EBITDA, requiring cost reductions or asset sales'}. Additional debt capacity at {targetLeverage}x leverage: <strong>{fmt(Math.round(debtCapacity))}</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pb-8"><Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronRight className="mr-2 w-4 h-4 rotate-[-90deg]" />Back to Top</Button></div>
    </div>
  );
}

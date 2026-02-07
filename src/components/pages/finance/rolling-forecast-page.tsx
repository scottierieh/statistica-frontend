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
  HelpCircle, AlertTriangle, Calculator, Percent, Building2,
  Lightbulb, ChevronRight, Upload, BarChart3, Plus, X, Zap,
  Settings2, ArrowUpRight, ArrowDownRight, Wallet, CheckCircle2,
  RefreshCw, Calendar, Layers, Activity, Eye, EyeOff, Lock, Unlock
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
import { Slider } from '@/components/ui/slider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine, ComposedChart, Line,
  AreaChart, Area
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MonthData {
  month: string;            // "Jan", "Feb", etc.
  monthIndex: number;       // 0-11
  // Original budget
  budgetRevenue: number;
  budgetCOGS: number;
  budgetOpex: number;
  // Actuals (null = not yet reported)
  actualRevenue: number | null;
  actualCOGS: number | null;
  actualOpex: number | null;
  // Forecast (auto or manual override)
  forecastRevenue: number;
  forecastCOGS: number;
  forecastOpex: number;
  isLocked: boolean;        // locked = actual entered
  isOverride: boolean;      // manually overridden forecast
}

interface ForecastAssumptions {
  fiscalYear: number;
  companyName: string;
  currentMonth: number;     // 0-11, how many months of actuals we have
  forecastMethod: 'run-rate' | 'trend' | 'budget';
  // Scenario adjustments (%)
  revenueAdjust: number;
  cogsAdjust: number;
  opexAdjust: number;
}

interface ForecastPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DEFAULT_ASSUMPTIONS: ForecastAssumptions = {
  fiscalYear: new Date().getFullYear(),
  companyName: 'Acme Corp',
  currentMonth: 6,
  forecastMethod: 'run-rate',
  revenueAdjust: 0,
  cogsAdjust: 0,
  opexAdjust: 0,
};

function buildDefaultData(): MonthData[] {
  const seasonality = [0.88, 0.90, 0.95, 0.98, 1.00, 1.02, 1.05, 1.08, 1.05, 1.02, 0.98, 1.09];
  const baseRevenue = 1200; // $K per month
  const baseCOGS = 360;
  const baseOpex = 520;
  return MONTHS.map((m, i) => {
    const s = seasonality[i];
    const bRev = Math.round(baseRevenue * s);
    const bCOGS = Math.round(baseCOGS * s);
    const bOpex = Math.round(baseOpex * (0.95 + Math.random() * 0.1));
    // First 6 months have actuals with small random variance
    const hasActual = i < 6;
    const variance = () => 0.92 + Math.random() * 0.16;
    return {
      month: m, monthIndex: i,
      budgetRevenue: bRev, budgetCOGS: bCOGS, budgetOpex: bOpex,
      actualRevenue: hasActual ? Math.round(bRev * variance()) : null,
      actualCOGS: hasActual ? Math.round(bCOGS * variance()) : null,
      actualOpex: hasActual ? Math.round(bOpex * variance()) : null,
      forecastRevenue: bRev, forecastCOGS: bCOGS, forecastOpex: bOpex,
      isLocked: hasActual, isOverride: false,
    };
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) => n == null || isNaN(n) || !isFinite(n) ? '—' : n >= 10000 ? `$${(n / 1000).toFixed(d)}M` : `$${n.toLocaleString()}K`;
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtVar = (actual: number, budget: number) => budget === 0 ? '—' : fmtP(((actual - budget) / budget) * 100);


// ═══════════════════════════════════════════════════════════════════════════════
// FORECAST ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function reforecast(data: MonthData[], assumptions: ForecastAssumptions): MonthData[] {
  const { currentMonth, forecastMethod, revenueAdjust, cogsAdjust, opexAdjust } = assumptions;
  const actuals = data.filter(d => d.isLocked && d.actualRevenue != null);

  return data.map(d => {
    if (d.isLocked || d.isOverride) return d;
    if (d.monthIndex < currentMonth) return d;

    let fRev = d.budgetRevenue;
    let fCOGS = d.budgetCOGS;
    let fOpex = d.budgetOpex;

    if (forecastMethod === 'run-rate' && actuals.length > 0) {
      // Use average of last 3 actuals (or fewer)
      const recent = actuals.slice(-3);
      const avgRev = recent.reduce((s, a) => s + (a.actualRevenue || 0), 0) / recent.length;
      const avgCOGS = recent.reduce((s, a) => s + (a.actualCOGS || 0), 0) / recent.length;
      const avgOpex = recent.reduce((s, a) => s + (a.actualOpex || 0), 0) / recent.length;
      // Apply seasonality ratio from budget
      const avgBudgetRev = recent.reduce((s, a) => s + a.budgetRevenue, 0) / recent.length;
      const seasonRatio = avgBudgetRev > 0 ? d.budgetRevenue / avgBudgetRev : 1;
      fRev = Math.round(avgRev * seasonRatio);
      fCOGS = Math.round(avgCOGS * seasonRatio);
      fOpex = Math.round(avgOpex * (d.budgetOpex / (recent.reduce((s, a) => s + a.budgetOpex, 0) / recent.length || 1)));
    } else if (forecastMethod === 'trend' && actuals.length >= 2) {
      // Linear trend extrapolation
      const n = actuals.length;
      const xMean = (n - 1) / 2;
      const yRevMean = actuals.reduce((s, a) => s + (a.actualRevenue || 0), 0) / n;
      let num = 0, den = 0;
      actuals.forEach((a, i) => { num += (i - xMean) * ((a.actualRevenue || 0) - yRevMean); den += (i - xMean) ** 2; });
      const slope = den > 0 ? num / den : 0;
      const intercept = yRevMean - slope * xMean;
      const projected = intercept + slope * d.monthIndex;
      fRev = Math.round(Math.max(0, projected));
      // COGS/OpEx scale proportionally
      const revRatio = d.budgetRevenue > 0 ? fRev / d.budgetRevenue : 1;
      fCOGS = Math.round(d.budgetCOGS * revRatio);
      fOpex = Math.round(d.budgetOpex * (0.7 + 0.3 * revRatio)); // OpEx is semi-fixed
    }
    // forecast method 'budget' uses budget as-is

    // Apply scenario adjustments
    fRev = Math.round(fRev * (1 + revenueAdjust / 100));
    fCOGS = Math.round(fCOGS * (1 + cogsAdjust / 100));
    fOpex = Math.round(fOpex * (1 + opexAdjust / 100));

    return { ...d, forecastRevenue: fRev, forecastCOGS: fCOGS, forecastOpex: fOpex };
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseForecastCSV(csvText: string): MonthData[] | null {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 2) return null;
  const rows = parsed.data as Record<string, string>[];
  const result: MonthData[] = [];
  for (const row of rows) {
    const month = (row['Month'] || row['month'] || '').trim();
    const mi = MONTHS.findIndex(m => m.toLowerCase() === month.toLowerCase().substring(0, 3));
    if (mi < 0) continue;
    const p = (key: string) => parseFloat(row[key]) || 0;
    const pn = (key: string) => row[key] != null && row[key] !== '' ? parseFloat(row[key]) || 0 : null;
    result.push({
      month: MONTHS[mi], monthIndex: mi,
      budgetRevenue: p('BudgetRevenue'), budgetCOGS: p('BudgetCOGS'), budgetOpex: p('BudgetOpex'),
      actualRevenue: pn('ActualRevenue'), actualCOGS: pn('ActualCOGS'), actualOpex: pn('ActualOpex'),
      forecastRevenue: p('BudgetRevenue'), forecastCOGS: p('BudgetCOGS'), forecastOpex: p('BudgetOpex'),
      isLocked: pn('ActualRevenue') != null, isOverride: false,
    });
  }
  return result.length >= 6 ? result : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Rolling Forecast": "A continuously updated forecast that always looks 12 months ahead, replacing static annual budgets.",
  "Actuals": "Realized financial results for completed months. Once entered, the month is 'locked'.",
  "Run-Rate": "Forecasting method using the average of recent actual months, adjusted for seasonality.",
  "Trend": "Forecasting method using linear extrapolation from actual data points.",
  "Budget-Based": "Uses the original budget for remaining months with no adjustment.",
  "Variance": "(Actual − Budget) ÷ Budget × 100%. Positive = over budget/target.",
  "YTD (Year-to-Date)": "Cumulative total from the start of the fiscal year through the current month.",
  "Full-Year Forecast": "YTD Actuals + Remaining Months Forecast. The best current estimate of annual results.",
  "Gross Profit": "Revenue − COGS. Measures production/delivery efficiency.",
  "Operating Income": "Gross Profit − OpEx. Core business profitability.",
  "Gross Margin": "Gross Profit ÷ Revenue × 100%.",
  "Scenario Adjustment": "Percentage increase/decrease applied to remaining forecast months for what-if analysis.",
  "Seasonality": "Budget ratios between months used to scale run-rate forecasts proportionally.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Rolling Forecast Glossary</DialogTitle>
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

const ForecastGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Rolling Forecast Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">

          <div>
            <h3 className="font-semibold text-primary mb-3">Rolling Forecast vs Static Budget</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border bg-muted/20">
                <p className="font-semibold text-sm">Static Budget</p>
                <p className="text-xs text-muted-foreground mt-1">Set once at year start. Fixed targets regardless of actual performance. Becomes stale by Q2.</p>
              </div>
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-semibold text-sm text-primary">Rolling Forecast</p>
                <p className="text-xs text-muted-foreground mt-1">Updated monthly with actuals. Remaining months re-forecast based on latest data. Always forward-looking.</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Forecasting Methods</h3>
            <div className="space-y-3">
              {[
                { label: 'Run-Rate', formula: 'Avg(Last 3 Actuals) × Seasonality Ratio', desc: 'Best when: Recent performance is a good indicator of future. Adjusts for seasonal patterns.', example: 'Avg Revenue L3M = $1,150K, Budget ratio Jul/Avg = 1.05 → Forecast Jul = $1,208K' },
                { label: 'Trend', formula: 'Linear Regression on Actuals → Extrapolate', desc: 'Best when: Clear upward or downward trend in actuals. Captures momentum.', example: 'Slope = +$30K/month, Intercept = $1,000K → Month 8 = $1,000 + 30×8 = $1,240K' },
                { label: 'Budget-Based', formula: 'Original Budget (no adjustment)', desc: 'Best when: Actuals are close to budget and no significant changes expected.', example: 'Budget Jul = $1,260K → Forecast Jul = $1,260K' },
              ].map(({ label, formula, desc, example }) => (
                <div key={label} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{label}</span>
                    <span className="font-mono text-xs text-primary">{formula}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{example}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Key Formulas</h3>
            <div className="space-y-3">
              {[
                { label: 'YTD Actual', formula: 'Σ Actuals (Month 1 to Current)', example: '$1,056K + $1,080K + ... + $1,224K = $6,630K' },
                { label: 'Full-Year Forecast', formula: 'YTD Actual + Σ Forecast (Remaining)', example: '$6,630K + $6,890K = $13,520K' },
                { label: 'Variance ($)', formula: 'Actual − Budget', example: '$6,630K − $6,456K = +$174K' },
                { label: 'Variance (%)', formula: '(Actual − Budget) ÷ Budget × 100', example: '+$174K ÷ $6,456K = +2.7%' },
                { label: 'Gross Profit', formula: 'Revenue − COGS', example: '$1,200K − $360K = $840K' },
                { label: 'Operating Income', formula: 'Gross Profit − OpEx', example: '$840K − $520K = $320K' },
                { label: 'Run-Rate Annual', formula: 'YTD Actual ÷ Months Elapsed × 12', example: '$6,630K ÷ 6 × 12 = $13,260K' },
                { label: 'Seasonality Ratio', formula: 'Budget[Month] ÷ Avg(Budget[Actual Months])', example: 'Budget Jul $1,260K ÷ Avg $1,076K = 1.17' },
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
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> Lock months once actuals are finalized. Use scenario adjustments for what-if analysis — e.g., &quot;what if revenue grows 5% faster?&quot; Compare all three forecast methods before committing.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE CSV & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_FORECAST_CSV = `Month,BudgetRevenue,BudgetCOGS,BudgetOpex,ActualRevenue,ActualCOGS,ActualOpex
Jan,1056,317,510,1020,305,498
Feb,1080,324,525,1110,340,515
Mar,1140,342,502,1095,330,510
Apr,1176,353,518,1200,355,530
May,1200,360,495,1180,350,505
Jun,1224,367,530,1260,375,520
Jul,1260,378,508,,,
Aug,1296,389,515,,,
Sep,1260,378,500,,,
Oct,1224,367,522,,,
Nov,1176,353,510,,,
Dec,1308,392,535,,,`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_FORECAST_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_rolling_forecast.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Required Data Format</DialogTitle>
          <DialogDescription>Prepare your forecast data in this format before uploading</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">One row per month. Budget columns are required. Actual columns are optional — leave blank for future months.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Month</th>
                    <th className="p-2 text-right">BudgetRevenue</th>
                    <th className="p-2 text-right">BudgetCOGS</th>
                    <th className="p-2 text-right">BudgetOpex</th>
                    <th className="p-2 text-right border-l">ActualRevenue</th>
                    <th className="p-2 text-right">ActualCOGS</th>
                    <th className="p-2 text-right">ActualOpex</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Jan', '1056', '317', '510', '1020', '305', '498'],
                      ['Feb', '1080', '324', '525', '1110', '340', '515'],
                      ['...', '...', '...', '...', '...', '...', '...'],
                      ['Jul', '1260', '378', '508', '', '', ''],
                      ['Dec', '1308', '392', '535', '', '', ''],
                    ].map(([m, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{m}</td>
                        {vals.map((v, j) => <td key={j} className={`p-2 text-right ${j === 3 ? 'border-l' : ''} ${!v ? 'text-muted-foreground' : ''}`}>{v || '(blank)'}</td>)}
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
                  { name: 'Month', required: true, desc: 'Month abbreviation: Jan, Feb, Mar, ...' },
                  { name: 'BudgetRevenue', required: true, desc: 'Original budget revenue ($K)' },
                  { name: 'BudgetCOGS', required: true, desc: 'Original budget cost of goods sold ($K)' },
                  { name: 'BudgetOpex', required: true, desc: 'Original budget operating expenses ($K)' },
                  { name: 'ActualRevenue', required: false, desc: 'Actual revenue ($K). Blank for future months.' },
                  { name: 'ActualCOGS', required: false, desc: 'Actual COGS ($K). Blank for future months.' },
                  { name: 'ActualOpex', required: false, desc: 'Actual OpEx ($K). Blank for future months.' },
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
                <li>• All monetary values in <strong>$K</strong> (thousands).</li>
                <li>• Months with all three actual values will be auto-locked.</li>
                <li>• At least 6 months of data recommended (12 for full year).</li>
                <li>• Column headers must match exactly (case-sensitive).</li>
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
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><RefreshCw className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Rolling Forecast</CardTitle>
          <CardDescription className="text-base mt-2">Continuously update forecasts based on actual performance and changing conditions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Activity, title: 'Live Re-Forecast', desc: 'Actuals automatically drive remaining month projections' },
              { icon: BarChart3, title: 'Variance Analysis', desc: 'Budget vs Actual vs Forecast with drill-down' },
              { icon: Layers, title: 'Scenario Planning', desc: 'Base, upside, downside with adjustment sliders' },
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
                  <div><CardTitle className="text-base">Upload Forecast Data</CardTitle><CardDescription className="text-xs">Import budget and actuals from CSV</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected — ready to forecast</span></div>
                    <p className="text-xs text-muted-foreground">Your uploaded data will populate budget targets and actuals automatically.</p>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with monthly budget and actual figures to auto-populate the forecast model.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Month | BudgetRev | BudgetCOGS | BudgetOpex</p>
                      <p className="text-muted-foreground">ActualRev | ActualCOGS | ActualOpex (optional)</p>
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
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">Pre-loaded with 6 months actuals</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Start with a sample company that has 6 months of actual results and 6 months to forecast.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />12-month budget with seasonality</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />6 months of actuals pre-filled</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />3 forecast methods to compare</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Scenario adjustment sliders</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Both paths lead to the same model. Uploading data pre-fills budget and actuals — you can always edit any value afterward.</p>
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

export default function ForecastPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: ForecastPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [assumptions, setAssumptions] = useState<ForecastAssumptions>(DEFAULT_ASSUMPTIONS);
  const [monthData, setMonthData] = useState<MonthData[]>(buildDefaultData);

  // Parse uploaded CSV
  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try { const raw = Papa.unparse(data); return parseForecastCSV(raw); } catch { return null; }
  }, [data]);

  const [parseError] = useState<string | null>(null);

  const applyUpload = useCallback(() => {
    if (parsedUpload) {
      setMonthData(parsedUpload);
      const locked = parsedUpload.filter(d => d.isLocked).length;
      setAssumptions(prev => ({ ...prev, currentMonth: locked }));
    }
    setShowIntro(false);
  }, [parsedUpload]);

  // Re-forecast whenever assumptions or data changes
  const forecastedData = useMemo(() => reforecast(monthData, assumptions), [monthData, assumptions]);

  // ── KPIs ──
  const lockedMonths = forecastedData.filter(d => d.isLocked);
  const futureMonths = forecastedData.filter(d => !d.isLocked);

  const ytdActualRev = lockedMonths.reduce((s, d) => s + (d.actualRevenue || 0), 0);
  const ytdActualCOGS = lockedMonths.reduce((s, d) => s + (d.actualCOGS || 0), 0);
  const ytdActualOpex = lockedMonths.reduce((s, d) => s + (d.actualOpex || 0), 0);
  const ytdBudgetRev = lockedMonths.reduce((s, d) => s + d.budgetRevenue, 0);
  const ytdBudgetCOGS = lockedMonths.reduce((s, d) => s + d.budgetCOGS, 0);
  const ytdBudgetOpex = lockedMonths.reduce((s, d) => s + d.budgetOpex, 0);

  const remainingForecastRev = futureMonths.reduce((s, d) => s + d.forecastRevenue, 0);
  const remainingForecastCOGS = futureMonths.reduce((s, d) => s + d.forecastCOGS, 0);
  const remainingForecastOpex = futureMonths.reduce((s, d) => s + d.forecastOpex, 0);

  const fullYearRev = ytdActualRev + remainingForecastRev;
  const fullYearCOGS = ytdActualCOGS + remainingForecastCOGS;
  const fullYearOpex = ytdActualOpex + remainingForecastOpex;
  const fullYearGP = fullYearRev - fullYearCOGS;
  const fullYearOI = fullYearGP - fullYearOpex;
  const fullYearBudgetRev = forecastedData.reduce((s, d) => s + d.budgetRevenue, 0);
  const fullYearGPMargin = fullYearRev > 0 ? (fullYearGP / fullYearRev) * 100 : 0;
  const fullYearOIMargin = fullYearRev > 0 ? (fullYearOI / fullYearRev) * 100 : 0;

  // Charts
  const chartData = forecastedData.map(d => ({
    month: d.month,
    budget: d.budgetRevenue,
    actual: d.actualRevenue,
    forecast: !d.isLocked ? d.forecastRevenue : null,
  }));

  const waterfallData = [
    { name: 'YTD Actual', value: ytdActualRev },
    { name: 'Remaining Forecast', value: remainingForecastRev },
    { name: 'Full Year', value: fullYearRev },
  ];

  const plChart = forecastedData.map(d => {
    const rev = d.isLocked ? (d.actualRevenue || 0) : d.forecastRevenue;
    const cogs = d.isLocked ? (d.actualCOGS || 0) : d.forecastCOGS;
    const opex = d.isLocked ? (d.actualOpex || 0) : d.forecastOpex;
    return { month: d.month, revenue: rev, grossProfit: rev - cogs, opIncome: rev - cogs - opex };
  });

  // ── Month editing ──
  const updateMonth = useCallback((mi: number, field: string, value: number | null) => {
    setMonthData(prev => prev.map(d => {
      if (d.monthIndex !== mi) return d;
      const updated = { ...d, [field]: value };
      if (field.startsWith('actual') && value != null) {
        updated.isLocked = true;
      }
      if (field.startsWith('forecast')) {
        updated.isOverride = true;
      }
      return updated;
    }));
  }, []);

  const lockMonth = useCallback((mi: number) => {
    setMonthData(prev => prev.map(d => d.monthIndex === mi ? { ...d, isLocked: !d.isLocked } : d));
  }, []);

  const resetOverride = useCallback((mi: number) => {
    setMonthData(prev => prev.map(d => d.monthIndex === mi ? { ...d, isOverride: false } : d));
  }, []);

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Forecast_${assumptions.fiscalYear}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [assumptions.fiscalYear, toast]);

  const handleDownloadCSV = useCallback(() => {
    const rows = forecastedData.map(d => ({
      Month: d.month, BudgetRevenue: d.budgetRevenue, BudgetCOGS: d.budgetCOGS, BudgetOpex: d.budgetOpex,
      ActualRevenue: d.actualRevenue ?? '', ActualCOGS: d.actualCOGS ?? '', ActualOpex: d.actualOpex ?? '',
      ForecastRevenue: d.forecastRevenue, ForecastCOGS: d.forecastCOGS, ForecastOpex: d.forecastOpex,
      Status: d.isLocked ? 'Actual' : d.isOverride ? 'Override' : 'Forecast',
    }));
    let csv = `ROLLING FORECAST — ${assumptions.companyName} FY${assumptions.fiscalYear}\n`;
    csv += `Method: ${assumptions.forecastMethod} | As of Month ${assumptions.currentMonth}\n\n`;
    csv += Papa.unparse(rows) + '\n\n';
    csv += `Full Year Revenue,$${fullYearRev}K\nFull Year Gross Profit,$${fullYearGP}K\nFull Year Operating Income,$${fullYearOI}K\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Forecast_${assumptions.fiscalYear}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [forecastedData, assumptions, fullYearRev, fullYearGP, fullYearOI, toast]);

  // ─── Intro ───
  if (showIntro) return (
    <IntroPage
      hasUploadedData={!!parsedUpload}
      parseError={parseError}
      onStartWithData={applyUpload}
      onStartManual={() => setShowIntro(false)}
    />
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Rolling Forecast</h1><p className="text-muted-foreground mt-1">{assumptions.companyName} — FY{assumptions.fiscalYear} | {lockedMonths.length} months actual</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <ForecastGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Forecast Settings</CardTitle><CardDescription>Method, scenario adjustments, and assumptions</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={assumptions.companyName} onChange={e => setAssumptions(p => ({ ...p, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Fiscal Year</Label><Input type="number" value={assumptions.fiscalYear} onChange={e => setAssumptions(p => ({ ...p, fiscalYear: parseInt(e.target.value) || 2025 }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forecast Method</Label>
              <div className="flex gap-1">
                {(['run-rate', 'trend', 'budget'] as const).map(m => (
                  <Button key={m} variant={assumptions.forecastMethod === m ? 'default' : 'outline'} size="sm" className="text-xs flex-1 h-8" onClick={() => setAssumptions(p => ({ ...p, forecastMethod: m }))}>
                    {m === 'run-rate' ? 'Run-Rate' : m === 'trend' ? 'Trend' : 'Budget'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current Month (Actuals)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[assumptions.currentMonth]} onValueChange={([v]) => {
                  setAssumptions(p => ({ ...p, currentMonth: v }));
                  setMonthData(prev => prev.map(d => ({ ...d, isLocked: d.monthIndex < v && d.actualRevenue != null })));
                }} min={0} max={12} step={1} className="flex-1" />
                <span className="text-sm font-mono w-8">{assumptions.currentMonth}</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scenario Adjustments (applied to remaining forecast months)</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {[
                { key: 'revenueAdjust', label: 'Revenue' },
                { key: 'cogsAdjust', label: 'COGS' },
                { key: 'opexAdjust', label: 'OpEx' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{label} Adj.</Label>
                    <span className="text-xs font-mono text-primary">{(assumptions as any)[key] >= 0 ? '+' : ''}{(assumptions as any)[key]}%</span>
                  </div>
                  <Slider value={[(assumptions as any)[key]]} onValueChange={([v]) => setAssumptions(p => ({ ...p, [key]: v }))} min={-20} max={20} step={0.5} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Forecast Summary — FY{assumptions.fiscalYear}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Full-Year Revenue', value: fmt(fullYearRev) },
                { label: 'Gross Margin', value: `${fullYearGPMargin.toFixed(1)}%` },
                { label: 'Operating Income', value: fmt(fullYearOI) },
                { label: 'Op. Margin', value: `${fullYearOIMargin.toFixed(1)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-primary">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
              {[
                { label: 'YTD Revenue', value: fmt(ytdActualRev) },
                { label: 'YTD vs Budget', value: fmtVar(ytdActualRev, ytdBudgetRev) },
                { label: 'Forecast vs Budget', value: fmtVar(fullYearRev, fullYearBudgetRev) },
                { label: 'Run-Rate Annual', value: lockedMonths.length > 0 ? fmt(Math.round(ytdActualRev / lockedMonths.length * 12)) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Monthly Data Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Monthly Data</CardTitle><CardDescription>Budget, actuals, and forecast — edit any cell</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Month</TableHead>
                  <TableHead className="text-center text-xs" colSpan={3}>Budget ($K)</TableHead>
                  <TableHead className="text-center text-xs border-l" colSpan={3}>Actual ($K)</TableHead>
                  <TableHead className="text-center text-xs border-l" colSpan={3}>Forecast ($K)</TableHead>
                  <TableHead className="text-center text-xs border-l">Var %</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead className="text-right text-xs">Rev</TableHead><TableHead className="text-right text-xs">COGS</TableHead><TableHead className="text-right text-xs">OpEx</TableHead>
                  <TableHead className="text-right text-xs border-l">Rev</TableHead><TableHead className="text-right text-xs">COGS</TableHead><TableHead className="text-right text-xs">OpEx</TableHead>
                  <TableHead className="text-right text-xs border-l">Rev</TableHead><TableHead className="text-right text-xs">COGS</TableHead><TableHead className="text-right text-xs">OpEx</TableHead>
                  <TableHead className="text-right text-xs border-l">Rev</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastedData.map(d => {
                  const best = d.isLocked ? (d.actualRevenue || 0) : d.forecastRevenue;
                  const varPct = d.budgetRevenue > 0 ? ((best - d.budgetRevenue) / d.budgetRevenue * 100) : 0;
                  return (
                    <TableRow key={d.monthIndex} className={d.isLocked ? 'bg-primary/[0.02]' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {d.isLocked ? <Lock className="w-3 h-3 text-primary" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
                          {d.month}
                          {d.isOverride && <Badge variant="outline" className="text-[8px] px-1 py-0">OVR</Badge>}
                        </div>
                      </TableCell>
                      {/* Budget */}
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{d.budgetRevenue}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{d.budgetCOGS}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{d.budgetOpex}</TableCell>
                      {/* Actuals */}
                      <TableCell className="text-right border-l">
                        <Input type="number" value={d.actualRevenue ?? ''} placeholder="—" onChange={e => updateMonth(d.monthIndex, 'actualRevenue', e.target.value ? parseFloat(e.target.value) : null)} className="h-6 w-16 text-right text-xs font-mono p-1" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" value={d.actualCOGS ?? ''} placeholder="—" onChange={e => updateMonth(d.monthIndex, 'actualCOGS', e.target.value ? parseFloat(e.target.value) : null)} className="h-6 w-16 text-right text-xs font-mono p-1" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" value={d.actualOpex ?? ''} placeholder="—" onChange={e => updateMonth(d.monthIndex, 'actualOpex', e.target.value ? parseFloat(e.target.value) : null)} className="h-6 w-16 text-right text-xs font-mono p-1" />
                      </TableCell>
                      {/* Forecast */}
                      <TableCell className="text-right border-l">
                        {d.isLocked ? <span className="text-xs font-mono text-muted-foreground">—</span> : (
                          <Input type="number" value={d.forecastRevenue} onChange={e => updateMonth(d.monthIndex, 'forecastRevenue', parseFloat(e.target.value) || 0)} className="h-6 w-16 text-right text-xs font-mono p-1" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.isLocked ? <span className="text-xs font-mono text-muted-foreground">—</span> : (
                          <Input type="number" value={d.forecastCOGS} onChange={e => updateMonth(d.monthIndex, 'forecastCOGS', parseFloat(e.target.value) || 0)} className="h-6 w-16 text-right text-xs font-mono p-1" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.isLocked ? <span className="text-xs font-mono text-muted-foreground">—</span> : (
                          <Input type="number" value={d.forecastOpex} onChange={e => updateMonth(d.monthIndex, 'forecastOpex', parseFloat(e.target.value) || 0)} className="h-6 w-16 text-right text-xs font-mono p-1" />
                        )}
                      </TableCell>
                      {/* Variance */}
                      <TableCell className={`text-right font-mono text-xs border-l ${varPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {varPct >= 0 ? '+' : ''}{varPct.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => lockMonth(d.monthIndex)}>
                          {d.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Calculation Breakdown ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />Full-Year P&L Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {[
                  { label: 'YTD Actual Revenue', value: fmt(ytdActualRev), sub: `${lockedMonths.length} months` },
                  { label: '(+) Remaining Forecast Revenue', value: fmt(remainingForecastRev), sub: `${futureMonths.length} months` },
                  { label: 'Full-Year Revenue', value: fmt(fullYearRev), bold: true },
                  { label: '(−) Full-Year COGS', value: fmt(fullYearCOGS) },
                  { label: 'Gross Profit', value: fmt(fullYearGP), bold: true },
                  { label: '(−) Full-Year OpEx', value: fmt(fullYearOpex) },
                  { label: 'Operating Income', value: fmt(fullYearOI), bold: true, final: true },
                ].map(({ label, value, sub, bold, final }, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                    <div>
                      <span className={`text-sm ${bold || final ? 'font-semibold' : ''}`}>{label}</span>
                      {sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}
                    </div>
                    <span className={`font-mono text-sm ${final ? 'text-primary font-bold' : bold ? 'font-semibold' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono text-center space-y-1">
              <p>Full-Year Revenue = YTD {fmt(ytdActualRev)} + Remaining {fmt(remainingForecastRev)} = {fmt(fullYearRev)}</p>
              <p>Gross Profit = {fmt(fullYearRev)} − {fmt(fullYearCOGS)} = {fmt(fullYearGP)} ({fullYearGPMargin.toFixed(1)}% margin)</p>
              <p className="text-primary font-semibold">Operating Income = {fmt(fullYearGP)} − {fmt(fullYearOpex)} = {fmt(fullYearOI)} ({fullYearOIMargin.toFixed(1)}% margin)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Forecast Report</h2><p className="text-sm text-muted-foreground">Charts, variance, and summary</p></div>
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
          <h2 className="text-2xl font-bold">{assumptions.companyName} — FY{assumptions.fiscalYear} Rolling Forecast</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | Method: {assumptions.forecastMethod} | {lockedMonths.length} months actual</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Full-Year Revenue', value: fmt(fullYearRev), sub: `Budget: ${fmt(fullYearBudgetRev)}`, color: fullYearRev >= fullYearBudgetRev ? 'text-green-600' : 'text-red-600' },
            { label: 'Gross Profit', value: fmt(fullYearGP), sub: `${fullYearGPMargin.toFixed(1)}% margin`, color: 'text-primary' },
            { label: 'Operating Income', value: fmt(fullYearOI), sub: `${fullYearOIMargin.toFixed(1)}% margin`, color: fullYearOI >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Forecast Coverage', value: `${lockedMonths.length}/${forecastedData.length}`, sub: `${futureMonths.length} months projected`, color: 'text-primary' },
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

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Rolling forecast highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  const ytdRevVar = ytdBudgetRev > 0 ? ((ytdActualRev - ytdBudgetRev) / ytdBudgetRev * 100) : 0;
                  if (lockedMonths.length > 0) items.push(`YTD revenue ${ytdRevVar >= 0 ? 'above' : 'below'} budget: ${fmt(ytdActualRev)} vs ${fmt(ytdBudgetRev)} (${ytdRevVar >= 0 ? '+' : ''}${ytdRevVar.toFixed(1)}%) across ${lockedMonths.length} months.`);
                  const fullYearVar = fullYearBudgetRev > 0 ? ((fullYearRev - fullYearBudgetRev) / fullYearBudgetRev * 100) : 0;
                  items.push(`Full-year revenue outlook: ${fmt(fullYearRev)} vs budget ${fmt(fullYearBudgetRev)} (${fullYearVar >= 0 ? '+' : ''}${fullYearVar.toFixed(1)}%).`);
                  items.push(`Gross margin ${fullYearGPMargin.toFixed(1)}% — gross profit of ${fmt(fullYearGP)} on ${fmt(fullYearRev)} revenue.`);
                  items.push(`Operating income: ${fmt(fullYearOI)} (${fullYearOIMargin.toFixed(1)}% margin). ${fullYearOI >= 0 ? 'Profitable forecast.' : 'Forecast deficit.'}`);
                  items.push(`Forecast method: ${assumptions.forecastMethod === 'moving_avg' ? 'Moving Average' : assumptions.forecastMethod === 'linear_trend' ? 'Linear Trend' : 'Budget-Based'}. ${futureMonths.length} months forecasted, ${lockedMonths.length} months with actuals.`);
                  const cogsPct = fullYearRev > 0 ? (fullYearCOGS / fullYearRev * 100) : 0;
                  items.push(`COGS ratio ${cogsPct.toFixed(1)}% (${fmt(fullYearCOGS)}) — ${cogsPct > 60 ? 'elevated cost pressure.' : 'within healthy range.'}`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly P&L Detail */}
        <Card>
          <CardHeader><CardTitle>Monthly P&L Detail</CardTitle><CardDescription>Budget vs Actual/Forecast — Revenue, COGS, Gross Profit, OpEx, Operating Income</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Month</th>
              <th className="p-2 text-center font-semibold" colSpan={2}>Revenue</th>
              <th className="p-2 text-center font-semibold" colSpan={2}>COGS</th>
              <th className="p-2 text-center font-semibold" colSpan={2}>OpEx</th>
              <th className="p-2 text-right font-semibold">GP</th>
              <th className="p-2 text-right font-semibold">OI</th>
              <th className="p-2 text-right font-semibold">Status</th>
            </tr><tr className="border-b bg-muted/30">
              <th className="p-1" />
              <th className="p-1 text-right text-muted-foreground font-normal">Budget</th>
              <th className="p-1 text-right text-muted-foreground font-normal">Act/Fcast</th>
              <th className="p-1 text-right text-muted-foreground font-normal">Budget</th>
              <th className="p-1 text-right text-muted-foreground font-normal">Act/Fcast</th>
              <th className="p-1 text-right text-muted-foreground font-normal">Budget</th>
              <th className="p-1 text-right text-muted-foreground font-normal">Act/Fcast</th>
              <th className="p-1" /><th className="p-1" /><th className="p-1" />
            </tr></thead>
            <tbody>{forecastedData.map(d => {
              const actRev = d.isLocked ? (d.actualRevenue || 0) : d.forecastRevenue;
              const actCOGS = d.isLocked ? (d.actualCOGS || 0) : d.forecastCOGS;
              const actOpex = d.isLocked ? (d.actualOpex || 0) : d.forecastOpex;
              const gp = actRev - actCOGS;
              const oi = gp - actOpex;
              return (
                <tr key={d.month} className={`border-b ${!d.isLocked ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
                  <td className="p-2 font-medium">{d.month}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{fmt(d.budgetRevenue)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${actRev >= d.budgetRevenue ? 'text-green-600' : 'text-red-600'}`}>{fmt(actRev)}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{fmt(d.budgetCOGS)}</td>
                  <td className="p-2 text-right font-mono">{fmt(actCOGS)}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{fmt(d.budgetOpex)}</td>
                  <td className="p-2 text-right font-mono">{fmt(actOpex)}</td>
                  <td className="p-2 text-right font-mono font-semibold">{fmt(gp)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${oi >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(oi)}</td>
                  <td className="p-2 text-right"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${d.isLocked ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{d.isLocked ? 'Actual' : 'Forecast'}</span></td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Full Year</td>
              <td className="p-2 text-right font-mono">{fmt(fullYearBudgetRev)}</td>
              <td className={`p-2 text-right font-mono font-bold ${fullYearRev >= fullYearBudgetRev ? 'text-green-600' : 'text-red-600'}`}>{fmt(fullYearRev)}</td>
              <td className="p-2 text-right font-mono" colSpan={2}>{fmt(fullYearCOGS)}</td>
              <td className="p-2 text-right font-mono" colSpan={2}>{fmt(fullYearOpex)}</td>
              <td className="p-2 text-right font-mono font-bold">{fmt(fullYearGP)}</td>
              <td className={`p-2 text-right font-mono font-bold ${fullYearOI >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(fullYearOI)}</td>
              <td className="p-2" />
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Revenue: Budget vs Actual vs Forecast */}
        <Card>
          <CardHeader><CardTitle>Revenue — Budget vs Actual vs Forecast</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => v != null ? [`$${v}K`, ''] : []} />
                  <Legend />
                  <Line dataKey="budget" name="Budget" type="monotone" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  <Bar dataKey="actual" name="Actual" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="forecast" name="Forecast" fill="#1e3a5f" opacity={0.35} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* P&L Monthly Trend */}
        <Card>
          <CardHeader><CardTitle>Monthly P&L Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={plChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${v}K`, '']} />
                  <Legend />
                  <Area dataKey="revenue" name="Revenue" type="monotone" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.1} />
                  <Area dataKey="grossProfit" name="Gross Profit" type="monotone" stroke="#0d9488" fill="#0d9488" fillOpacity={0.1} />
                  <Area dataKey="opIncome" name="Op. Income" type="monotone" stroke="#2d5a8e" fill="#2d5a8e" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Variance Table */}
        <Card>
          <CardHeader><CardTitle>YTD Variance Analysis</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance ($)</TableHead><TableHead className="text-right">Variance (%)</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: 'Revenue', budget: ytdBudgetRev, actual: ytdActualRev },
                  { label: 'COGS', budget: ytdBudgetCOGS, actual: ytdActualCOGS },
                  { label: 'OpEx', budget: ytdBudgetOpex, actual: ytdActualOpex },
                  { label: 'Gross Profit', budget: ytdBudgetRev - ytdBudgetCOGS, actual: ytdActualRev - ytdActualCOGS },
                  { label: 'Operating Income', budget: (ytdBudgetRev - ytdBudgetCOGS) - ytdBudgetOpex, actual: (ytdActualRev - ytdActualCOGS) - ytdActualOpex },
                ].map(({ label, budget, actual }) => {
                  const diff = actual - budget;
                  const pct = budget !== 0 ? (diff / Math.abs(budget)) * 100 : 0;
                  const favorable = (label === 'COGS' || label === 'OpEx') ? diff < 0 : diff > 0;
                  return (
                    <TableRow key={label} className={label === 'Operating Income' ? 'border-t-2 font-semibold' : ''}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(budget)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(actual)}</TableCell>
                      <TableCell className={`text-right font-mono ${favorable ? 'text-green-600' : 'text-red-600'}`}>{diff >= 0 ? '+' : ''}{fmt(diff)}</TableCell>
                      <TableCell className={`text-right font-mono ${favorable ? 'text-green-600' : 'text-red-600'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Forecast Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">FY{assumptions.fiscalYear} Rolling Forecast — {assumptions.companyName}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  With {lockedMonths.length} months of actual results recorded, YTD revenue of <strong>{fmt(ytdActualRev)}</strong> is {ytdActualRev >= ytdBudgetRev ? 'tracking above' : 'trailing below'} budget of {fmt(ytdBudgetRev)} ({fmtVar(ytdActualRev, ytdBudgetRev)}).
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Using the <strong>{assumptions.forecastMethod}</strong> method{assumptions.revenueAdjust !== 0 || assumptions.cogsAdjust !== 0 || assumptions.opexAdjust !== 0 ? ` with scenario adjustments (Revenue {fmtP(assumptions.revenueAdjust)}, COGS {fmtP(assumptions.cogsAdjust)}, OpEx {fmtP(assumptions.opexAdjust)})` : ''}, the remaining {futureMonths.length} months are projected to generate {fmt(remainingForecastRev)} in revenue.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The <strong>full-year revenue forecast is {fmt(fullYearRev)}</strong>, which is {fmtVar(fullYearRev, fullYearBudgetRev)} versus the original annual budget of {fmt(fullYearBudgetRev)}.
                  Gross margin is projected at {fullYearGPMargin.toFixed(1)}%, yielding an <strong>operating income of {fmt(fullYearOI)}</strong> ({fullYearOIMargin.toFixed(1)}% operating margin).
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
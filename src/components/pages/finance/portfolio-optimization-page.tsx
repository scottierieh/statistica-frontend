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
  AlertTriangle, Activity, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, Gauge, Shield,
  Zap, Shuffle, Trophy, Crosshair
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
  ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Asset {
  id: string;
  name: string;
  assetClass: 'equity' | 'bond' | 'real_estate' | 'commodity' | 'cash' | 'alternative';
  expectedReturn: number;    // % annual
  stdDev: number;            // % annual
  currentWeight: number;     // % 0-100
}

interface PortfolioSettings {
  portfolioName: string;
  totalValue: number;          // $K
  riskFreeRate: number;        // %
  monteCarloRuns: number;
  riskTolerance: number;       // 1-10 scale
}

interface SimulatedPortfolio {
  weights: number[];
  ret: number;
  risk: number;
  sharpe: number;
}

interface PortfolioPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e', '#4a90b8', '#64748b'];
const CLASS_COLORS: Record<string, string> = {
  equity: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  bond: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  real_estate: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  commodity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  cash: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  alternative: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};
const CLASS_LABELS: Record<string, string> = {
  equity: 'Equity', bond: 'Bond', real_estate: 'Real Estate',
  commodity: 'Commodity', cash: 'Cash', alternative: 'Alternative',
};

function buildDefaultAssets(): Asset[] {
  return [
    { id: 'a1', name: 'US Large Cap (S&P 500)', assetClass: 'equity', expectedReturn: 10.5, stdDev: 18.0, currentWeight: 35 },
    { id: 'a2', name: 'International Developed', assetClass: 'equity', expectedReturn: 8.0, stdDev: 16.5, currentWeight: 15 },
    { id: 'a3', name: 'Emerging Markets', assetClass: 'equity', expectedReturn: 11.0, stdDev: 24.0, currentWeight: 10 },
    { id: 'a4', name: 'US Aggregate Bond', assetClass: 'bond', expectedReturn: 4.2, stdDev: 5.5, currentWeight: 20 },
    { id: 'a5', name: 'Real Estate (REITs)', assetClass: 'real_estate', expectedReturn: 7.5, stdDev: 17.0, currentWeight: 8 },
    { id: 'a6', name: 'Gold', assetClass: 'commodity', expectedReturn: 5.0, stdDev: 16.0, currentWeight: 5 },
    { id: 'a7', name: 'Cash / Money Market', assetClass: 'cash', expectedReturn: 4.5, stdDev: 0.5, currentWeight: 7 },
  ];
}

// Default correlation matrix (symmetric) — indices match default assets order
const DEFAULT_CORR = [
//  SP500  IntlD   EM   Bond  REIT  Gold  Cash
  [ 1.00,  0.85,  0.70, -0.20, 0.60, 0.05, 0.00], // SP500
  [ 0.85,  1.00,  0.75, -0.10, 0.55, 0.10, 0.00], // Intl Dev
  [ 0.70,  0.75,  1.00, -0.05, 0.45, 0.15, 0.00], // EM
  [-0.20, -0.10, -0.05,  1.00, 0.20, 0.25, 0.10], // Bond
  [ 0.60,  0.55,  0.45,  0.20, 1.00, 0.10, 0.00], // REIT
  [ 0.05,  0.10,  0.15,  0.25, 0.10, 1.00, 0.00], // Gold
  [ 0.00,  0.00,  0.00,  0.10, 0.00, 0.00, 1.00], // Cash
];

const DEFAULT_SETTINGS: PortfolioSettings = {
  portfolioName: 'Growth & Income Portfolio',
  totalValue: 1000,
  riskFreeRate: 4.5,
  monteCarloRuns: 8000,
  riskTolerance: 6,
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
function shortName(name: string, maxLen?: number): string {
  const ml = maxLen || 14;
  const start = name.indexOf('(');
  const end = name.indexOf(')');
  if (start >= 0 && end > start) {
    const inner = name.slice(start + 1, end);
    return inner.length <= ml ? inner : inner.slice(0, ml);
  }
  return name.length <= ml ? name : name.slice(0, ml);
}


// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO MATH
// ═══════════════════════════════════════════════════════════════════════════════

function portfolioReturn(weights: number[], returns: number[]): number {
  return weights.reduce((s, w, i) => s + w * returns[i], 0);
}

function portfolioRisk(weights: number[], stdDevs: number[], corr: number[][]): number {
  let variance = 0;
  const n = weights.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const c = corr[i] && corr[i][j] != null ? corr[i][j] : (i === j ? 1 : 0);
      variance += weights[i] * weights[j] * stdDevs[i] * stdDevs[j] * c;
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

function randomWeights(n: number): number[] {
  const raw = Array.from({ length: n }, () => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(r => r / sum);
}

function runMonteCarlo(
  assets: Asset[], corr: number[][], riskFreeRate: number, runs: number
): { portfolios: SimulatedPortfolio[]; maxSharpe: SimulatedPortfolio; minVar: SimulatedPortfolio } {
  const returns = assets.map(a => a.expectedReturn);
  const stdDevs = assets.map(a => a.stdDev);
  const n = assets.length;

  let maxSharpe: SimulatedPortfolio = { weights: [], ret: 0, risk: 999, sharpe: -999 };
  let minVar: SimulatedPortfolio = { weights: [], ret: 0, risk: 999, sharpe: -999 };
  const portfolios: SimulatedPortfolio[] = [];

  for (let i = 0; i < runs; i++) {
    const w = randomWeights(n);
    const ret = portfolioReturn(w, returns);
    const risk = portfolioRisk(w, stdDevs, corr);
    const sharpe = risk > 0 ? (ret - riskFreeRate) / risk : 0;
    const p = { weights: w, ret, risk, sharpe };
    portfolios.push(p);
    if (sharpe > maxSharpe.sharpe) maxSharpe = p;
    if (risk < minVar.risk) minVar = p;
  }

  return { portfolios, maxSharpe, minVar };
}

function targetRiskPortfolio(
  assets: Asset[], corr: number[][], riskFreeRate: number,
  targetRiskLevel: number, runs: number
): SimulatedPortfolio | null {
  // targetRiskLevel 1-10 → maps to a risk range
  const returns = assets.map(a => a.expectedReturn);
  const stdDevs = assets.map(a => a.stdDev);
  const minRisk = Math.min(...stdDevs);
  const maxRisk = Math.max(...stdDevs);
  const targetRisk = minRisk + (targetRiskLevel / 10) * (maxRisk - minRisk);
  const tolerance = (maxRisk - minRisk) * 0.08;

  let best: SimulatedPortfolio | null = null;
  for (let i = 0; i < runs; i++) {
    const w = randomWeights(assets.length);
    const ret = portfolioReturn(w, returns);
    const risk = portfolioRisk(w, stdDevs, corr);
    if (Math.abs(risk - targetRisk) < tolerance) {
      const sharpe = risk > 0 ? (ret - riskFreeRate) / risk : 0;
      if (!best || sharpe > best.sharpe) {
        best = { weights: w, ret, risk, sharpe };
      }
    }
  }
  return best;
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Expected Return": "Projected annual return of an asset or portfolio, based on historical averages or forward estimates.",
  "Standard Deviation": "Measure of volatility/risk. Higher = more return variability. Annualized.",
  "Sharpe Ratio": "(Return − Risk-Free Rate) ÷ Std Dev. Risk-adjusted return. Higher is better. > 1.0 is good.",
  "Efficient Frontier": "Set of portfolios offering highest return for each level of risk. Curved line on risk-return plot.",
  "Max Sharpe Portfolio": "The portfolio on the efficient frontier with the highest Sharpe ratio. Optimal risk-adjusted return.",
  "Min Variance Portfolio": "The portfolio with the lowest possible risk (std dev). Most conservative efficient portfolio.",
  "Correlation": "Relationship between two assets (-1 to +1). Negative correlation provides diversification benefit.",
  "Diversification": "Combining weakly/negatively correlated assets to reduce portfolio risk below individual asset risk.",
  "Asset Allocation": "How portfolio value is distributed across asset classes. Primary driver of long-term returns.",
  "Risk Tolerance": "Investor's willingness to accept volatility. Higher tolerance → more equity, less bonds.",
  "Monte Carlo Simulation": "Random sampling of thousands of portfolio weights to map the risk-return landscape.",
  "Risk-Free Rate": "Return on a 'zero-risk' asset (T-bills). Baseline for measuring excess returns.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Portfolio Optimization Glossary</DialogTitle><DialogDescription>Key terms</DialogDescription></DialogHeader>
      <ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(glossaryItems).map(([t, d]) => (<div key={t} className="border-b pb-3"><h4 className="font-semibold">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div></ScrollArea>
    </DialogContent>
  </Dialog>
);


// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const PortfolioGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Portfolio Optimization Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div><h3 className="font-semibold text-primary mb-3">Optimization Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Define Assets', desc: 'Enter expected return, std dev, and current weight for each asset class.' },
                { step: '2', title: 'Set Correlations', desc: 'Define how assets move relative to each other (-1 to +1).' },
                { step: '3', title: 'Monte Carlo Simulation', desc: 'Generate thousands of random portfolios to map the risk-return landscape.' },
                { step: '4', title: 'Find Optimal Portfolios', desc: 'Max Sharpe (best risk-adjusted) and Min Variance (lowest risk) are identified.' },
                { step: '5', title: 'Set Risk Tolerance', desc: 'Slide to find the portfolio matching your risk appetite on the efficient frontier.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div><h3 className="font-semibold text-primary mb-3">Key Formulas</h3>
            <div className="space-y-3">
              {[
                { label: 'Portfolio Return', formula: 'Σ (wᵢ × rᵢ)' },
                { label: 'Portfolio Variance', formula: 'Σᵢ Σⱼ (wᵢ × wⱼ × σᵢ × σⱼ × ρᵢⱼ)' },
                { label: 'Sharpe Ratio', formula: '(Rp − Rf) ÷ σp' },
              ].map(({ label, formula }) => (
                <div key={label} className="p-2 rounded-lg border flex justify-between items-center"><span className="font-medium text-sm">{label}</span><span className="font-mono text-xs text-primary">{formula}</span></div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Key insight:</strong> Diversification works because of correlation. Two assets with 10% return each, but -0.5 correlation, produce a portfolio with ~10% return but significantly less risk.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE & CSV
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `Name,AssetClass,ExpectedReturn,StdDev,CurrentWeight
US Large Cap (S&P 500),equity,10.5,18.0,35
International Developed,equity,8.0,16.5,15
Emerging Markets,equity,11.0,24.0,10
US Aggregate Bond,bond,4.2,5.5,20
Real Estate (REITs),real_estate,7.5,17.0,8
Gold,commodity,5.0,16.0,5
Cash / Money Market,cash,4.5,0.5,7`;

function parsePortfolioCSV(rows: Record<string, any>[]): Asset[] | null {
  if (!rows || rows.length < 2) return null;
  const keys = Object.keys(rows[0]).map(k => k.toLowerCase().trim());
  if (!keys.some(k => k.includes('name')) || !keys.some(k => k.includes('return'))) return null;

  const get = (row: Record<string, any>, ...s: string[]): string => {
    for (const q of s) { const f = Object.entries(row).find(([k]) => k.toLowerCase().trim().includes(q)); if (f && f[1] != null) return String(f[1]); }
    return '';
  };
  const getN = (row: Record<string, any>, ...s: string[]): number => parseFloat(get(row, ...s)) || 0;
  const validClasses = ['equity', 'bond', 'real_estate', 'commodity', 'cash', 'alternative'];

  const assets: Asset[] = rows.map((row, i) => {
    const rawClass = get(row, 'class', 'assetclass', 'type').toLowerCase().replace(/\s+/g, '_');
    return {
      id: `imp${Date.now()}_${i}`,
      name: get(row, 'name') || `Asset ${i + 1}`,
      assetClass: (validClasses.includes(rawClass) ? rawClass : 'equity') as Asset['assetClass'],
      expectedReturn: getN(row, 'expectedreturn', 'return', 'exp'),
      stdDev: getN(row, 'stddev', 'std', 'volatility', 'risk'),
      currentWeight: getN(row, 'weight', 'currentweight', 'allocation'),
    };
  }).filter(a => a.expectedReturn > 0 || a.stdDev > 0);

  return assets.length >= 2 ? assets : null;
}

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownload = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'sample_portfolio.csv'; link.click();
    toast({ title: "Downloaded!" });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Portfolio Data Format</DialogTitle><DialogDescription>One row per asset</DialogDescription></DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Each row is an asset with return %, std dev %, and current allocation %.</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs font-mono"><thead><tr className="bg-muted/50"><th className="p-2 text-left">Name</th><th className="p-2">Class</th><th className="p-2 text-right">Return %</th><th className="p-2 text-right">StdDev %</th><th className="p-2 text-right">Weight %</th></tr></thead>
              <tbody>{[['S&P 500', 'equity', '10.5', '18.0', '35'], ['US Bonds', 'bond', '4.2', '5.5', '20'], ['Gold', 'commodity', '5.0', '16.0', '5']].map(([n, c, r, s, w], i) => (
                <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-2">{n}</td><td className="p-2">{c}</td><td className="p-2 text-right">{r}</td><td className="p-2 text-right">{s}</td><td className="p-2 text-right">{w}</td></tr>
              ))}</tbody></table>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'AssetClass', items: 'equity, bond, real_estate, commodity, cash, alternative' },
                { name: 'Values', items: 'All in %. Weights should sum to 100.' },
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
  const [fgOpen, setFgOpen] = useState(false);
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><PieChart className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Portfolio Optimization</CardTitle>
          <CardDescription className="text-base mt-2">Find the optimal asset allocation using Mean-Variance optimization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Crosshair, title: 'Efficient Frontier', desc: 'Monte Carlo simulation maps thousands of possible portfolios' },
              { icon: Trophy, title: 'Optimal Portfolios', desc: 'Max Sharpe and Min Variance automatically identified' },
              { icon: Gauge, title: 'Risk Tolerance', desc: 'Adjust risk appetite to find your ideal allocation' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-2"><CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent></Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className={`border-2 transition-all ${hasUploadedData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50'}`}>
              <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasUploadedData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div><div><CardTitle className="text-base">Upload Assets</CardTitle><CardDescription className="text-xs">CSV with returns & risk</CardDescription></div></div></CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Asset data detected</span></div><Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button></>
                ) : (
                  <><p className="text-sm text-muted-foreground">Upload asset names, expected returns, standard deviations, and current weights.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Asset | ExpReturn% | StdDev% | Weight%</p>
                      <p className="text-muted-foreground">e.g. US Large Cap, 10.5, 18.0, 35</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFgOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide</Button></>
                )}
              </CardContent>
            </Card>
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Settings2 className="w-5 h-5" /></div><div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">7 asset classes</CardDescription></div></div></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Pre-loaded: US/Intl Equities, Bonds, REITs, Gold, Cash with correlation matrix.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {['7 diversified assets', '8,000 Monte Carlo sims', 'Efficient frontier & Sharpe', 'Risk tolerance slider'].map(f => (
                    <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />{f}</div>
                  ))}
                </div>
                <Button variant="outline" onClick={onStart} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <FormatGuideModal isOpen={fgOpen} onClose={() => setFgOpen(false)} />
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function PortfolioOptimizationPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: PortfolioPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [settings, setSettings] = useState<PortfolioSettings>(DEFAULT_SETTINGS);
  const [assets, setAssets] = useState<Asset[]>(buildDefaultAssets);
  const [corr, setCorr] = useState<number[][]>(DEFAULT_CORR);
  const [showCorr, setShowCorr] = useState(false);

  // CSV upload
  const parsedUpload = useMemo(() => data?.length ? parsePortfolioCSV(data) : null, [data]);
  const applyUpload = useCallback(() => {
    if (parsedUpload) {
      setAssets(parsedUpload);
      // Reset correlation to identity-like for new assets
      const n = parsedUpload.length;
      setCorr(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0.3)));
    }
    setShowIntro(false);
  }, [parsedUpload]);

  const S = settings;
  const n = assets.length;

  // Sync correlation matrix size
  const syncCorr = useCallback((newLen: number) => {
    setCorr(prev => {
      const c: number[][] = Array.from({ length: newLen }, (_, i) =>
        Array.from({ length: newLen }, (_, j) => {
          if (i === j) return 1;
          if (prev[i] && prev[i][j] != null) return prev[i][j];
          return 0.3;
        })
      );
      return c;
    });
  }, []);

  // ── Current portfolio metrics ──
  const currentWeights = useMemo(() => assets.map(a => a.currentWeight / 100), [assets]);
  const totalWeight = useMemo(() => assets.reduce((s, a) => s + a.currentWeight, 0), [assets]);
  const currentReturn = useMemo(() => portfolioReturn(currentWeights, assets.map(a => a.expectedReturn)), [currentWeights, assets]);
  const currentRisk = useMemo(() => portfolioRisk(currentWeights, assets.map(a => a.stdDev), corr), [currentWeights, assets, corr]);
  const currentSharpe = useMemo(() => currentRisk > 0 ? (currentReturn - S.riskFreeRate) / currentRisk : 0, [currentReturn, currentRisk, S.riskFreeRate]);

  // ── Monte Carlo ──
  const mcResult = useMemo(() => runMonteCarlo(assets, corr, S.riskFreeRate, S.monteCarloRuns), [assets, corr, S.riskFreeRate, S.monteCarloRuns]);

  // ── Risk tolerance portfolio ──
  const riskTargetPortfolio = useMemo(() =>
    targetRiskPortfolio(assets, corr, S.riskFreeRate, S.riskTolerance, Math.min(S.monteCarloRuns, 5000)),
  [assets, corr, S.riskFreeRate, S.riskTolerance, S.monteCarloRuns]);

  // Scatter data (sampled for performance)
  const scatterData = useMemo(() => {
    const step = Math.max(1, Math.floor(mcResult.portfolios.length / 2000));
    return mcResult.portfolios.filter((_, i) => i % step === 0).map(p => ({ risk: parseFloat(p.risk.toFixed(2)), ret: parseFloat(p.ret.toFixed(2)), sharpe: parseFloat(p.sharpe.toFixed(3)) }));
  }, [mcResult.portfolios]);

  // ── CRUD ──
  const updateAsset = useCallback((id: string, u: Partial<Asset>) => { setAssets(p => p.map(a => a.id === id ? { ...a, ...u } : a)); }, []);
  const addAsset = useCallback((cls: Asset['assetClass']) => {
    setAssets(p => { const next = [...p, { id: `a${Date.now()}`, name: `New ${CLASS_LABELS[cls]}`, assetClass: cls, expectedReturn: 6, stdDev: 12, currentWeight: 0 }]; syncCorr(next.length); return next; });
  }, [syncCorr]);
  const removeAsset = useCallback((id: string) => {
    setAssets(p => { const next = p.filter(a => a.id !== id); syncCorr(next.length); return next; });
  }, [syncCorr]);

  const updateCorr = useCallback((i: number, j: number, val: number) => {
    setCorr(prev => {
      const c = prev.map(r => [...r]);
      c[i][j] = val;
      c[j][i] = val;
      return c;
    });
  }, []);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `Portfolio_Optimization.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, []);

  const handleDownloadCSV = useCallback(() => {
    let csv = `PORTFOLIO OPTIMIZATION — ${S.portfolioName}\n\n`;
    csv += `CURRENT: Return ${fmtP(currentReturn)}, Risk ${fmtP(currentRisk)}, Sharpe ${fmtR(currentSharpe)}\n`;
    csv += `MAX SHARPE: Return ${fmtP(mcResult.maxSharpe.ret)}, Risk ${fmtP(mcResult.maxSharpe.risk)}, Sharpe ${fmtR(mcResult.maxSharpe.sharpe)}\n`;
    csv += `MIN VARIANCE: Return ${fmtP(mcResult.minVar.ret)}, Risk ${fmtP(mcResult.minVar.risk)}\n\n`;
    csv += `ALLOCATIONS\n`;
    csv += Papa.unparse(assets.map((a, i) => ({
      Asset: a.name, Class: CLASS_LABELS[a.assetClass], 'Return %': a.expectedReturn, 'Risk %': a.stdDev,
      'Current %': a.currentWeight, 'Max Sharpe %': (mcResult.maxSharpe.weights[i] * 100).toFixed(1), 'Min Var %': (mcResult.minVar.weights[i] * 100).toFixed(1),
    }))) + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Portfolio_Optimization.csv`; link.click();
  }, [S, currentReturn, currentRisk, currentSharpe, mcResult, assets]);

  if (showIntro) return <IntroPage hasUploadedData={!!parsedUpload} onStartWithData={applyUpload} onStart={() => setShowIntro(false)} />;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Portfolio Optimization</h1><p className="text-muted-foreground mt-1">{S.portfolioName} — {n} assets | {S.monteCarloRuns.toLocaleString()} simulations</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button><Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button></div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <PortfolioGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div><div><CardTitle>Portfolio Settings</CardTitle><CardDescription>Risk-free rate and simulation parameters</CardDescription></div></div></CardHeader>
        <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Portfolio Name', key: 'portfolioName', type: 'text' },
            { label: 'Total Value ($K)', key: 'totalValue' },
            { label: 'Risk-Free Rate %', key: 'riskFreeRate', step: 0.25 },
            { label: 'Monte Carlo Runs', key: 'monteCarloRuns', step: 1000 },
          ].map(({ label, key, type, step }) => (
            <div key={key} className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type={type || 'number'} value={(S as any)[key]} onChange={e => setSettings(p => ({ ...p, [key]: type === 'text' ? e.target.value : parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" step={step} /></div>
          ))}
        </div></CardContent>
      </Card>

      {/* KPI */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Portfolio Comparison</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Current Portfolio', ret: currentReturn, risk: currentRisk, sharpe: currentSharpe, color: 'text-muted-foreground' },
                { label: '⭐ Max Sharpe', ret: mcResult.maxSharpe.ret, risk: mcResult.maxSharpe.risk, sharpe: mcResult.maxSharpe.sharpe, color: 'text-amber-600' },
                { label: '🛡 Min Variance', ret: mcResult.minVar.ret, risk: mcResult.minVar.risk, sharpe: mcResult.minVar.sharpe, color: 'text-green-600' },
              ].map(({ label, ret, risk, sharpe, color }) => (
                <div key={label} className="text-center p-3 rounded-lg border">
                  <p className={`text-xs font-semibold ${color}`}>{label}</p>
                  <p className="text-lg font-bold text-primary mt-1">{fmtP(ret)}</p><p className="text-[10px] text-muted-foreground">Return</p>
                  <p className="text-sm font-semibold mt-1">{fmtP(risk)}</p><p className="text-[10px] text-muted-foreground">Risk (σ)</p>
                  <p className="text-sm font-semibold mt-1">{fmtR(sharpe)}</p><p className="text-[10px] text-muted-foreground">Sharpe</p>
                </div>
              ))}
            </div>
            {totalWeight !== 100 && <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg"><AlertTriangle className="w-4 h-4 text-amber-600" /><p className="text-xs text-amber-700">Weights sum to {fmtP(totalWeight)} — should be 100%</p></div>}
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Layers className="w-5 h-5 text-primary" /></div><div><CardTitle>Asset Classes</CardTitle><CardDescription>Expected return, risk, and current allocation</CardDescription></div></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCorr(!showCorr)}><Shuffle className="w-4 h-4 mr-1" />{showCorr ? 'Hide' : 'Show'} Correlation</Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button></DropdownMenuTrigger><DropdownMenuContent>{(Object.entries(CLASS_LABELS) as [Asset['assetClass'], string][]).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => addAsset(k)}>{v}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
          </div>
        </div></CardHeader>
        <CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="min-w-[200px]">Asset</TableHead><TableHead className="text-center w-[80px]">Class</TableHead><TableHead className="text-right w-[90px]">Return %</TableHead><TableHead className="text-right w-[90px]">Risk %</TableHead><TableHead className="text-right w-[90px]">Current %</TableHead><TableHead className="text-right w-[90px]">Max Sharpe %</TableHead><TableHead className="text-right w-[90px]">Min Var %</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
          <TableBody>
            {assets.map((a, i) => (
              <TableRow key={a.id}>
                <TableCell><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /><Input value={a.name} onChange={e => updateAsset(a.id, { name: e.target.value })} className="h-7 text-xs border-0 bg-transparent p-0 font-medium w-full min-w-[160px]" /></div></TableCell>
                <TableCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 px-2"><Badge className={`text-[9px] ${CLASS_COLORS[a.assetClass]}`}>{CLASS_LABELS[a.assetClass]}</Badge></Button></DropdownMenuTrigger><DropdownMenuContent>{(Object.entries(CLASS_LABELS) as [Asset['assetClass'], string][]).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => updateAsset(a.id, { assetClass: k })}>{v}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></TableCell>
                <TableCell className="text-right"><Input type="number" value={a.expectedReturn} onChange={e => updateAsset(a.id, { expectedReturn: parseFloat(e.target.value) || 0 })} className="h-7 w-[70px] text-right text-xs font-mono ml-auto" step={0.5} /></TableCell>
                <TableCell className="text-right"><Input type="number" value={a.stdDev} onChange={e => updateAsset(a.id, { stdDev: parseFloat(e.target.value) || 0 })} className="h-7 w-[70px] text-right text-xs font-mono ml-auto" step={0.5} /></TableCell>
                <TableCell className="text-right"><Input type="number" value={a.currentWeight} onChange={e => updateAsset(a.id, { currentWeight: parseFloat(e.target.value) || 0 })} className="h-7 w-[70px] text-right text-xs font-mono ml-auto" step={1} /></TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-amber-600 pr-4">{(mcResult.maxSharpe.weights[i] * 100).toFixed(1)}%</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-green-600 pr-4">{(mcResult.minVar.weights[i] * 100).toFixed(1)}%</TableCell>
                <TableCell className="text-center"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAsset(a.id)}><X className="w-3 h-3" /></Button></TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 bg-primary/5"><TableCell className="font-bold text-primary">Total</TableCell><TableCell></TableCell><TableCell></TableCell><TableCell></TableCell><TableCell className={`text-right font-mono text-xs font-bold pr-4 ${Math.abs(totalWeight - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>{totalWeight.toFixed(1)}%</TableCell><TableCell className="text-right font-mono text-xs pr-4">100.0%</TableCell><TableCell className="text-right font-mono text-xs pr-4">100.0%</TableCell><TableCell></TableCell></TableRow>
          </TableBody></Table></div></CardContent>
      </Card>

      {/* Correlation Matrix */}
      {showCorr && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Shuffle className="w-5 h-5 text-primary" />Correlation Matrix</CardTitle><CardDescription>-1 (inverse) to +1 (perfect). Diagonal locked at 1.0.</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="text-xs font-mono border-collapse">
            <thead><tr><th className="p-2 text-left" style={{ minWidth: 120 }}></th>{assets.map((a, i) => <th key={i} className="p-2 text-center" style={{ minWidth: 96 }} title={a.name}><span className="block truncate" style={{ maxWidth: 96 }}>{shortName(a.name, 14)}</span></th>)}</tr></thead>
            <tbody>{assets.map((a, i) => (
              <tr key={i} className="border-t border-border/30"><td className="p-2 font-semibold text-left whitespace-nowrap">{shortName(a.name, 16)}</td>
                {assets.map((_, j) => (
                  <td key={j} className="p-1 text-center">{i === j ? <span className="block text-muted-foreground py-1">1.00</span> : (
                    <Input type="number" value={corr[i]?.[j] ?? 0.3} onChange={e => updateCorr(i, j, Math.max(-1, Math.min(1, parseFloat(e.target.value) || 0)))} className={`h-7 w-[76px] text-center text-xs font-mono mx-auto ${(corr[i]?.[j] ?? 0) < 0 ? 'text-green-600' : (corr[i]?.[j] ?? 0) > 0.7 ? 'text-red-600' : ''}`} step={0.05} min={-1} max={1} />
                  )}</td>
                ))}
              </tr>
            ))}</tbody>
          </table></div></CardContent>
        </Card>
      )}

      {/* Risk Tolerance */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5 text-primary" />Risk Tolerance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4"><Label className="text-xs w-24">Risk Level</Label><Slider value={[S.riskTolerance]} onValueChange={([v]) => setSettings(p => ({ ...p, riskTolerance: v }))} min={1} max={10} step={1} className="flex-1" /><span className="text-sm font-bold w-8">{S.riskTolerance}/10</span></div>
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Conservative</span><span>Moderate</span><span>Aggressive</span></div>
            {riskTargetPortfolio && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Target Return</p><p className="text-lg font-bold text-primary">{fmtP(riskTargetPortfolio.ret)}</p></div>
                <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Target Risk</p><p className="text-lg font-bold">{fmtP(riskTargetPortfolio.risk)}</p></div>
                <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Sharpe</p><p className="text-lg font-bold">{fmtR(riskTargetPortfolio.sharpe)}</p></div>
                <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Suggested</p><div className="flex flex-wrap gap-1 mt-1 justify-center">{riskTargetPortfolio.weights.map((w, i) => w > 0.03 ? <Badge key={i} className="text-[8px]" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '30', color: CHART_COLORS[i % CHART_COLORS.length] }}>{shortName(assets[i]?.name || '')} {(w * 100).toFixed(0)}%</Badge> : null)}</div></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report</h2>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">{S.portfolioName}</h2><p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {n} Assets | {S.monteCarloRuns.toLocaleString()} Simulations</p></div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Expected Return', value: fmtP(currentReturn), sub: 'Current portfolio', color: 'text-primary' },
            { label: 'Portfolio Risk', value: fmtP(currentRisk), sub: `${assets.length} assets`, color: currentRisk > 20 ? 'text-red-600' : currentRisk > 10 ? 'text-amber-600' : 'text-green-600' },
            { label: 'Sharpe Ratio', value: currentSharpe.toFixed(2), sub: `RF: ${fmtP(S.riskFreeRate)}`, color: currentSharpe >= 1.0 ? 'text-green-600' : currentSharpe >= 0.5 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Max Sharpe', value: mcResult.maxSharpe.sharpe.toFixed(2), sub: `${fmtP(mcResult.maxSharpe.ret)} ret / ${fmtP(mcResult.maxSharpe.risk)} risk`, color: mcResult.maxSharpe.sharpe > currentSharpe ? 'text-green-600' : 'text-primary' },
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

        {/* Asset Allocation Comparison Table */}
        <Card>
          <CardHeader><CardTitle>Asset Allocation — Current vs Optimal</CardTitle><CardDescription>Weight comparison with return, risk, and asset class</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Asset</th>
              <th className="p-2 text-left font-semibold">Class</th>
              <th className="p-2 text-right font-semibold">Current Wt</th>
              <th className="p-2 text-right font-semibold">Max Sharpe Wt</th>
              <th className="p-2 text-right font-semibold">Δ</th>
              <th className="p-2 text-right font-semibold">Exp Return</th>
              <th className="p-2 text-right font-semibold">Std Dev</th>
              <th className="p-2 text-right font-semibold">Return/Risk</th>
            </tr></thead>
            <tbody>{assets.map((a, i) => {
              const curW = currentWeights[i] * 100;
              const optW = mcResult.maxSharpe.weights[i] * 100;
              const delta = optW - curW;
              const rr = a.stdDev > 0 ? a.expectedReturn / a.stdDev : 0;
              return (
                <tr key={a.ticker} className="border-b">
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{a.ticker}</div></td>
                  <td className="p-2 text-muted-foreground">{a.assetClass}</td>
                  <td className="p-2 text-right font-mono">{curW.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{optW.toFixed(1)}%</td>
                  <td className={`p-2 text-right font-mono font-semibold ${delta > 1 ? 'text-green-600' : delta < -1 ? 'text-red-600' : 'text-muted-foreground'}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{fmtP(a.expectedReturn)}</td>
                  <td className={`p-2 text-right font-mono ${a.stdDev > 20 ? 'text-red-600' : a.stdDev > 10 ? 'text-amber-600' : 'text-green-600'}`}>{fmtP(a.stdDev)}</td>
                  <td className={`p-2 text-right font-mono ${rr >= 1.0 ? 'text-green-600' : rr >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>{rr.toFixed(2)}</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Portfolio</td>
              <td className="p-2">{[...new Set(assets.map(a => a.assetClass))].length} classes</td>
              <td className="p-2 text-right font-mono">100%</td>
              <td className="p-2 text-right font-mono">100%</td>
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{fmtP(currentReturn)}</td>
              <td className="p-2 text-right font-mono">{fmtP(currentRisk)}</td>
              <td className="p-2 text-right font-mono">{currentSharpe.toFixed(2)}</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Portfolio optimization highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Current portfolio: ${fmtP(currentReturn)} expected return, ${fmtP(currentRisk)} risk, Sharpe ratio ${currentSharpe.toFixed(2)} (risk-free rate ${fmtP(S.riskFreeRate)}).`);
                  items.push(`Max Sharpe portfolio: ${fmtP(mcResult.maxSharpe.ret)} return at ${fmtP(mcResult.maxSharpe.risk)} risk (Sharpe ${mcResult.maxSharpe.sharpe.toFixed(2)}).${mcResult.maxSharpe.sharpe > currentSharpe ? ` Improves Sharpe by ${((mcResult.maxSharpe.sharpe - currentSharpe) / currentSharpe * 100).toFixed(0)}%.` : ''}`);
                  items.push(`Min Variance portfolio: ${fmtP(mcResult.minVar.ret)} return at ${fmtP(mcResult.minVar.risk)} risk — lowest achievable volatility.`);
                  const sharpeGap = mcResult.maxSharpe.sharpe - currentSharpe;
                  if (sharpeGap > 0.1) items.push(`Optimization opportunity: current allocation is sub-optimal. Rebalancing could improve risk-adjusted returns significantly.`);
                  else items.push(`Current portfolio is well-positioned — close to the efficient frontier.`);
                  items.push(`${assets.length} assets across ${[...new Set(assets.map(a => a.assetClass))].length} asset classes. ${S.monteCarloRuns.toLocaleString()} Monte Carlo simulations run.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Efficient Frontier */}
        <Card>
          <CardHeader><CardTitle>Efficient Frontier</CardTitle><CardDescription>Each dot = a random portfolio. Key portfolios highlighted.</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, bottom: 45, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" dataKey="risk" name="Risk (σ)" unit="%" tick={{ fontSize: 10 }} label={{ value: 'Risk (Std Dev %)', position: 'insideBottom', offset: -30, fontSize: 12, fontWeight: 600 }} />
                  <YAxis type="number" dataKey="ret" name="Return" unit="%" tick={{ fontSize: 10 }} label={{ value: 'Return %', angle: -90, position: 'insideLeft', fontSize: 12, fontWeight: 600 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: any, name: string) => [typeof v === 'number' ? `${v.toFixed(2)}%` : v, name === 'sharpe' ? 'Sharpe' : name]} />
                  <Scatter name="Portfolios" data={scatterData} fill="#3b7cc0" fillOpacity={0.12}>
                    {scatterData.map((_, i) => <Cell key={i} r={3} />)}
                  </Scatter>
                  <Scatter name="● Current" data={[{ risk: parseFloat(currentRisk.toFixed(2)), ret: parseFloat(currentReturn.toFixed(2)), sharpe: parseFloat(currentSharpe.toFixed(3)) }]} fill="#e57373" legendType="circle"
                    shape={(props: any) => <circle cx={props.cx} cy={props.cy} r={12} fill="#e57373" stroke="#fff" strokeWidth={3} />} />
                  <Scatter name="★ Max Sharpe" data={[{ risk: parseFloat(mcResult.maxSharpe.risk.toFixed(2)), ret: parseFloat(mcResult.maxSharpe.ret.toFixed(2)), sharpe: parseFloat(mcResult.maxSharpe.sharpe.toFixed(3)) }]} fill="#1e3a5f" legendType="star"
                    shape={(props: any) => {
                      const cx = props.cx, cy = props.cy, s = 14;
                      const pts = Array.from({ length: 10 }, (_, i) => { const a = (Math.PI * 2 * i) / 10 - Math.PI / 2; const r = i % 2 === 0 ? s : s * 0.4; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');
                      return <polygon points={pts} fill="#1e3a5f" stroke="#fff" strokeWidth={2} />;
                    }} />
                  <Scatter name="▲ Min Variance" data={[{ risk: parseFloat(mcResult.minVar.risk.toFixed(2)), ret: parseFloat(mcResult.minVar.ret.toFixed(2)), sharpe: parseFloat(mcResult.minVar.sharpe.toFixed(3)) }]} fill="#0d9488" legendType="triangle"
                    shape={(props: any) => {
                      const cx = props.cx, cy = props.cy, s = 13;
                      return <polygon points={`${cx},${cy - s} ${cx - s * 0.87},${cy + s * 0.5} ${cx + s * 0.87},${cy + s * 0.5}`} fill="#0d9488" stroke="#fff" strokeWidth={2} />;
                    }} />
                  <Legend verticalAlign="top" height={36} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Allocation Comparison */}
        <Card>
          <CardHeader><CardTitle>Allocation Comparison — Current vs Max Sharpe vs Min Variance</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assets.map((a, i) => ({
                  name: a.name.length > 18 ? a.name.slice(0, 18) + '…' : a.name,
                  current: a.currentWeight,
                  maxSharpe: parseFloat((mcResult.maxSharpe.weights[i] * 100).toFixed(1)),
                  minVar: parseFloat((mcResult.minVar.weights[i] * 100).toFixed(1)),
                }))} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`, '']} />
                  <Legend verticalAlign="top" height={30} />
                  <Bar dataKey="current" name="Current" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="maxSharpe" name="Max Sharpe" fill="#1e3a5f" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="minVar" name="Min Variance" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Allocation Comparison Table */}
        <Card>
          <CardHeader><CardTitle>Allocation Comparison Table</CardTitle><CardDescription>Current vs Optimized — weight differences and rebalancing needed</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Asset Class</th>
              <th className="p-2 text-right font-semibold">Current %</th>
              <th className="p-2 text-right font-semibold text-amber-700">Max Sharpe %</th>
              <th className="p-2 text-right font-semibold text-green-700">Min Variance %</th>
              <th className="p-2 text-right font-semibold">Δ Sharpe</th>
              <th className="p-2 text-right font-semibold">Δ MinVar</th>
              <th className="p-2 text-left font-semibold">Action (Sharpe)</th>
            </tr></thead>
            <tbody>{assets.map((a, i) => {
              const cur = a.currentWeight;
              const ms = parseFloat((mcResult.maxSharpe.weights[i] * 100).toFixed(1));
              const mv = parseFloat((mcResult.minVar.weights[i] * 100).toFixed(1));
              const dS = ms - cur;
              const dV = mv - cur;
              return (<tr key={i} className={`border-b ${Math.abs(dS) >= 5 ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                <td className="p-2 font-medium">{a.name}</td>
                <td className="p-2 text-right font-mono">{cur.toFixed(1)}%</td>
                <td className="p-2 text-right font-mono font-semibold text-amber-700">{ms.toFixed(1)}%</td>
                <td className="p-2 text-right font-mono font-semibold text-green-700">{mv.toFixed(1)}%</td>
                <td className={`p-2 text-right font-mono font-bold ${dS > 0 ? 'text-green-600' : dS < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{dS > 0 ? '+' : ''}{dS.toFixed(1)}%</td>
                <td className={`p-2 text-right font-mono ${dV > 0 ? 'text-green-600' : dV < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{dV > 0 ? '+' : ''}{dV.toFixed(1)}%</td>
                <td className="p-2"><span className={`inline-block px-1.5 py-0.5 rounded text-xs ${Math.abs(dS) < 1 ? 'bg-gray-100 text-gray-600' : dS > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{Math.abs(dS) < 1 ? 'Hold' : dS > 0 ? `Buy +${dS.toFixed(1)}%` : `Sell ${dS.toFixed(1)}%`}</span></td>
              </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total</td>
              <td className="p-2 text-right font-mono">{assets.reduce((s, a) => s + a.currentWeight, 0).toFixed(1)}%</td>
              <td className="p-2 text-right font-mono text-amber-700">{(mcResult.maxSharpe.weights.reduce((s: number, w: number) => s + w, 0) * 100).toFixed(1)}%</td>
              <td className="p-2 text-right font-mono text-green-700">{(mcResult.minVar.weights.reduce((s: number, w: number) => s + w, 0) * 100).toFixed(1)}%</td>
              <td className="p-2" colSpan={3} />
            </tr></tfoot>
          </table></div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Buy (increase weight)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Sell (decrease weight)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" /> Hold (Δ {'<'} 1%)</span>
          </div></CardContent>
        </Card>

        {/* Risk-Return by Asset */}
        <Card>
          <CardHeader><CardTitle>Risk-Return by Asset</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" dataKey="risk" name="Risk" unit="%" label={{ value: 'Risk %', position: 'insideBottom', offset: -10, fontSize: 11 }} />
                  <YAxis type="number" dataKey="ret" name="Return" unit="%" label={{ value: 'Return %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <ZAxis type="number" dataKey="weight" range={[60, 400]} />
                  <Tooltip formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}${name === 'weight' ? '%' : '%'}`, name === 'weight' ? 'Weight' : name]} />
                  <Scatter name="Assets" data={assets.map((a, i) => ({ risk: a.stdDev, ret: a.expectedReturn, weight: a.currentWeight, name: a.name }))} fill="#1e3a5f">
                    {assets.map((a, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">{assets.map((a, i) => <Badge key={i} className="text-[9px]" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '20', color: CHART_COLORS[i % CHART_COLORS.length] }}>{shortName(a.name)}</Badge>)}</div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Optimization Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">{S.portfolioName} — Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The current portfolio ({n} assets) has an expected return of <strong>{fmtP(currentReturn)}</strong> with <strong>{fmtP(currentRisk)}</strong> risk and a Sharpe ratio of <strong>{fmtR(currentSharpe)}</strong>.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The <strong>Max Sharpe portfolio</strong> achieves {fmtP(mcResult.maxSharpe.ret)} return at {fmtP(mcResult.maxSharpe.risk)} risk (Sharpe {fmtR(mcResult.maxSharpe.sharpe)}). Top allocations: {mcResult.maxSharpe.weights.map((w, i) => ({ name: shortName(assets[i]?.name || '') || '', w })).filter(x => x.w > 0.08).sort((a, b) => b.w - a.w).map(x => `${x.name} ${(x.w * 100).toFixed(0)}%`).join(', ')}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The <strong>Min Variance portfolio</strong> reduces risk to {fmtP(mcResult.minVar.risk)} (return {fmtP(mcResult.minVar.ret)}). This favors: {mcResult.minVar.weights.map((w, i) => ({ name: shortName(assets[i]?.name || '') || '', w })).filter(x => x.w > 0.08).sort((a, b) => b.w - a.w).map(x => `${x.name} ${(x.w * 100).toFixed(0)}%`).join(', ')}.
                </p>
                {currentSharpe < mcResult.maxSharpe.sharpe && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong>Opportunity:</strong> Rebalancing from the current allocation to the Max Sharpe portfolio could improve risk-adjusted returns by {((mcResult.maxSharpe.sharpe - currentSharpe) / currentSharpe * 100).toFixed(0)}% (Sharpe {fmtR(currentSharpe)} → {fmtR(mcResult.maxSharpe.sharpe)}).
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
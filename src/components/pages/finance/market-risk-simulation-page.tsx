'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  BookOpen, Download, FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, Lightbulb, ChevronRight, Upload, CheckCircle2, AlertTriangle,
  Shield, Zap, Target, BarChart3, Eye, TrendingUp, TrendingDown, DollarSign,
  Activity, Settings2, RefreshCw
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
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
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '../../ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ComposedChart, Line, AreaChart, Area,
  ReferenceLine, ScatterChart, Scatter
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AssetRow {
  asset_id: string;
  asset_name: string;
  asset_class: string;
  weight: number;         // 0–1
  expected_return: number; // annual %
  volatility: number;     // annual % std dev
  current_value: number;  // $K
}

interface SimConfig {
  numSimulations: number;
  timeHorizonDays: number;
  confidenceLevel: number;   // 0.95 or 0.99
  stressVolMultiplier: number; // 1.5x, 2x
  portfolioValue: number;     // $K
}

interface SimResult {
  returns: number[];          // sorted array of simulated returns
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  mean: number;
  median: number;
  stdDev: number;
  maxLoss: number;
  maxGain: number;
  sharpe: number;
  histogram: { bin: string; count: number; isVar95: boolean; isVar99: boolean }[];
  pathData: { day: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
  stressReturns: number[];
  stressVar95: number;
  stressCvar95: number;
}

interface MarketRiskPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  primary: '#1e3a5f', secondary: '#0d9488', midNavy: '#2d5a8e',
  lightNavy: '#3b7cc0', softRed: '#e57373', skyBlue: '#5ba3cf',
  palette: ['#1e3a5f', '#0d9488', '#2d5a8e', '#3b7cc0', '#e57373', '#5ba3cf', '#7c9fc0', '#4db6ac'],
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  Math.abs(n) >= 1 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}K` :
  `$${n.toFixed(2)}K`;
const fmtPct = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtPctPlain = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(2)}%`;


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parseAssetData(rows: Record<string, any>[]): AssetRow[] | null {
  if (!rows || rows.length === 0) return null;

  const get = (row: Record<string, any>, ...searches: string[]): string => {
    for (const s of searches) {
      const found = Object.entries(row).find(([k]) => k.toLowerCase().replace(/[\s_-]/g, '').includes(s.replace(/[\s_-]/g, '')));
      if (found && found[1] != null && found[1] !== '') return String(found[1]).trim();
    }
    return '';
  };
  const getN = (row: Record<string, any>, ...searches: string[]): number => {
    const v = get(row, ...searches);
    return parseFloat(v.replace(/[$,%]/g, '')) || 0;
  };

  // Detect if returns/vol are 0-1 or percentage
  const rets = rows.map(r => getN(r, 'expected_return', 'return', 'exp_return', 'annual_return')).filter(r => r !== 0);
  const vols = rows.map(r => getN(r, 'volatility', 'vol', 'std_dev', 'risk', 'sigma')).filter(v => v !== 0);
  const isRetPct = rets.length > 0 && Math.max(...rets) > 1;
  const isVolPct = vols.length > 0 && Math.max(...vols) > 1;

  // Detect weight scale
  const weights = rows.map(r => getN(r, 'weight', 'allocation', 'pct'));
  const maxW = weights.length > 0 ? Math.max(...weights) : 0;
  const isWPct = maxW > 1;

  const items: AssetRow[] = rows.map((row, i) => {
    let w = getN(row, 'weight', 'allocation', 'pct');
    if (isWPct) w = w / 100;
    if (w <= 0) w = 1 / rows.length;

    let ret = getN(row, 'expected_return', 'return', 'exp_return', 'annual_return');
    if (isRetPct) ret = ret / 100;

    let vol = getN(row, 'volatility', 'vol', 'std_dev', 'risk', 'sigma');
    if (isVolPct) vol = vol / 100;

    return {
      asset_id: get(row, 'asset_id', 'id', 'ticker', 'symbol') || `A${String(i + 1).padStart(3, '0')}`,
      asset_name: get(row, 'asset_name', 'name', 'asset', 'security', 'holding') || `Asset ${i + 1}`,
      asset_class: get(row, 'asset_class', 'class', 'type', 'category') || 'Other',
      weight: w,
      expected_return: ret,
      volatility: vol,
      current_value: getN(row, 'current_value', 'value', 'market_value', 'amount') || 0,
    };
  }).filter(r => r.asset_name && (r.volatility > 0 || r.expected_return !== 0));

  // Normalize weights
  if (items.length > 0) {
    const totalW = items.reduce((s, a) => s + a.weight, 0);
    if (totalW > 0) items.forEach(a => a.weight = a.weight / totalW);
  }

  return items.length > 0 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function boxMullerRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function runSimulation(assets: AssetRow[], config: SimConfig, volMultiplier: number = 1): SimResult {
  const { numSimulations, timeHorizonDays, portfolioValue } = config;
  const dt = timeHorizonDays / 252; // fraction of year

  // Portfolio-level expected return and volatility (simplified — assumes no correlation)
  const portReturn = assets.reduce((s, a) => s + a.weight * a.expected_return, 0);
  const portVol = Math.sqrt(assets.reduce((s, a) => s + (a.weight * a.volatility * volMultiplier) ** 2, 0));

  const returns: number[] = [];
  const pathBuckets: number[][] = [];
  const pathDays = Math.min(timeHorizonDays, 252);
  const dayStep = Math.max(1, Math.floor(pathDays / 50));

  for (let i = 0; i < numSimulations; i++) {
    // Single-period return for VaR
    const z = boxMullerRandom();
    const r = portReturn * dt + portVol * Math.sqrt(dt) * z;
    returns.push(r);

    // Path simulation for percentile bands (sample subset)
    if (i < 500) {
      let cumReturn = 0;
      const path: number[] = [];
      for (let d = 0; d < pathDays; d++) {
        const zd = boxMullerRandom();
        cumReturn += (portReturn / 252) + (portVol * volMultiplier / Math.sqrt(252)) * zd;
        if (d % dayStep === 0 || d === pathDays - 1) path.push(cumReturn);
      }
      if (!pathBuckets.length) path.forEach(() => pathBuckets.push([]));
      path.forEach((v, j) => { if (pathBuckets[j]) pathBuckets[j].push(v); });
    }
  }

  returns.sort((a, b) => a - b);
  const n = returns.length;
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const idx95 = Math.floor(n * 0.05);
  const idx99 = Math.floor(n * 0.01);
  const var95 = -returns[idx95];
  const var99 = -returns[idx99];
  const cvar95 = -returns.slice(0, idx95 + 1).reduce((s, r) => s + r, 0) / (idx95 + 1);
  const cvar99 = -returns.slice(0, idx99 + 1).reduce((s, r) => s + r, 0) / (idx99 + 1);

  const riskFreeRate = 0.04;
  const sharpe = stdDev > 0 ? (portReturn - riskFreeRate) / (portVol * volMultiplier) : 0;

  // Histogram
  const minR = returns[0], maxR = returns[n - 1];
  const binCount = 40;
  const binWidth = (maxR - minR) / binCount;
  const hist: { bin: string; count: number; isVar95: boolean; isVar99: boolean }[] = [];
  for (let b = 0; b < binCount; b++) {
    const lo = minR + b * binWidth;
    const hi = lo + binWidth;
    const count = returns.filter(r => r >= lo && (b === binCount - 1 ? r <= hi : r < hi)).length;
    const mid = (lo + hi) / 2;
    hist.push({ bin: `${(mid * 100).toFixed(1)}%`, count, isVar95: mid <= -var95, isVar99: mid <= -var99 });
  }

  // Path percentiles
  const pathData = pathBuckets.map((bucket, j) => {
    bucket.sort((a, b) => a - b);
    const bn = bucket.length;
    return {
      day: j * dayStep,
      p5: (bucket[Math.floor(bn * 0.05)] || 0) * portfolioValue,
      p25: (bucket[Math.floor(bn * 0.25)] || 0) * portfolioValue,
      p50: (bucket[Math.floor(bn * 0.50)] || 0) * portfolioValue,
      p75: (bucket[Math.floor(bn * 0.75)] || 0) * portfolioValue,
      p95: (bucket[Math.floor(bn * 0.95)] || 0) * portfolioValue,
    };
  });

  return {
    returns, var95, var99, cvar95, cvar99, mean, median: returns[Math.floor(n / 2)],
    stdDev, maxLoss: -returns[0], maxGain: returns[n - 1], sharpe, histogram: hist, pathData,
    stressReturns: [], stressVar95: 0, stressCvar95: 0,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `asset_id,asset_name,asset_class,weight,expected_return,volatility,current_value
EQ1,US Large Cap Equity,Equity,30,10.5,16.0,3000
EQ2,International Developed,Equity,15,8.2,18.5,1500
EQ3,Emerging Markets,Equity,10,11.0,24.0,1000
FI1,US Investment Grade Bonds,Fixed Income,20,4.8,5.5,2000
FI2,High Yield Bonds,Fixed Income,5,6.5,10.0,500
RE1,US REITs,Real Estate,8,7.5,19.0,800
CM1,Gold,Commodities,5,3.0,17.0,500
CM2,Broad Commodities,Commodities,4,4.5,20.0,400
ALT1,Hedge Fund Index,Alternatives,3,6.0,8.5,300`;

function buildDefaultAssets(): AssetRow[] {
  const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true });
  return parseAssetData(result.data as Record<string, any>[]) || [];
}

const DEFAULT_CONFIG: SimConfig = {
  numSimulations: 10000,
  timeHorizonDays: 21,
  confidenceLevel: 0.95,
  stressVolMultiplier: 2.0,
  portfolioValue: 10000,
};


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Value at Risk (VaR)": "Maximum expected loss at a given confidence level over a specific time horizon. VaR 95% = 5% chance of losing more than this amount.",
  "Conditional VaR (CVaR / ES)": "Expected Shortfall — average loss in the worst X% of scenarios. Always ≥ VaR. Better captures tail risk.",
  "Monte Carlo Simulation": "Generate thousands of random scenarios using statistical properties (mean, volatility) to model possible outcomes.",
  "Volatility (σ)": "Standard deviation of returns. Higher = more uncertainty. Annualized and scaled to time horizon.",
  "Sharpe Ratio": "(Return − Risk-Free Rate) ÷ Volatility. Measures risk-adjusted return. Higher is better.",
  "Stress Test": "Increase volatility by a multiplier (e.g., 2×) to simulate crisis conditions.",
  "Time Horizon": "Period over which risk is measured. Common: 1-day (trading), 10-day (regulatory), 21-day (monthly).",
  "Confidence Level": "Probability that losses won't exceed VaR. 95% and 99% are standard.",
  "Portfolio Variance": "Sum of weighted squared volatilities (simplified, assumes zero correlation).",
  "Geometric Brownian Motion": "Model where returns follow dS/S = μdt + σdW, with drift and random walk components.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Market Risk Glossary</DialogTitle>
        <DialogDescription>Key terms</DialogDescription>
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

const MarketRiskGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Market Risk Simulation Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">
          <div>
            <h3 className="font-semibold text-primary mb-2">What is Market Risk Simulation?</h3>
            <p className="text-sm text-muted-foreground">Monte Carlo simulation generates thousands of possible portfolio outcomes based on each asset's expected return and volatility. It calculates Value at Risk (VaR), Conditional VaR, and visualizes the distribution of potential gains and losses under normal and stressed market conditions.</p>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Simulation Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Upload Portfolio', desc: 'Provide asset names, weights, expected returns, and volatilities.' },
                { step: '2', title: 'Configure Parameters', desc: 'Set # simulations (1K–50K), time horizon (1–252 days), confidence level (95%/99%).' },
                { step: '3', title: 'Run Monte Carlo', desc: 'Generate random scenarios using GBM: dS = μdt + σ√dt × Z.' },
                { step: '4', title: 'Compute VaR & CVaR', desc: 'Find the loss threshold at chosen confidence. CVaR = average of tail losses.' },
                { step: '5', title: 'Stress Test', desc: 'Re-run with amplified volatility (1.5–3×) to simulate market crises.' },
                { step: '6', title: 'Report', desc: 'Return distribution histogram, percentile paths, risk decomposition.' },
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
                <thead><tr className="bg-muted/50"><th className="p-2 text-left font-semibold">Metric</th><th className="p-2 text-left">Formula</th><th className="p-2 text-left">Interpretation</th></tr></thead>
                <tbody>
                  {[
                    ['VaR (95%)', 'Percentile(5%) of return distribution', 'Max loss in 95% of scenarios'],
                    ['CVaR / ES', 'Mean of returns below VaR', 'Avg loss when VaR is breached'],
                    ['Portfolio σ', '√Σ(wᵢσᵢ)²', 'Simplified portfolio volatility'],
                    ['Sharpe Ratio', '(μ − rf) ÷ σ', 'Return per unit of risk'],
                    ['GBM Return', 'μ·dt + σ·√dt·Z', 'Single-step simulated return'],
                    ['Scaling', 'VaR(T) = VaR(1) × √T', 'Time-scaling of risk'],
                  ].map(([m, f, h], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 border-r font-semibold">{m}</td>
                      <td className="p-2 border-r font-mono text-muted-foreground">{f}</td>
                      <td className="p-2 text-muted-foreground">{h}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• <strong>10,000 simulations</strong> is a good balance of accuracy and speed.</li>
              <li>• Returns and volatility can be 0–1 decimal or percentage — auto-detected.</li>
              <li>• Weights are auto-normalized to sum to 100%.</li>
              <li>• VaR is a threshold, not a worst case. <strong>CVaR captures tail severity.</strong></li>
              <li>• Stress multiply of <strong>2× volatility</strong> approximates a 2008-style crisis.</li>
              <li>• This simplified model assumes no correlation — actual portfolio risk may differ.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CSV Format Guide — Portfolio Assets</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Upload a CSV with portfolio holdings. Returns and volatility can be 0–1 (decimal) or 0–100 (percentage) — auto-detected.</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50"><th className="p-1.5 text-left">asset_name</th><th className="p-1.5 text-left">asset_class</th><th className="p-1.5 text-right">weight</th><th className="p-1.5 text-right">expected_return</th><th className="p-1.5 text-right">volatility</th><th className="p-1.5 text-right">current_value</th></tr></thead>
              <tbody>
                {[
                  ['US Large Cap', 'Equity', '30', '10.5', '16.0', '3000'],
                  ['IG Bonds', 'Fixed Income', '20', '4.8', '5.5', '2000'],
                  ['Gold', 'Commodities', '5', '3.0', '17.0', '500'],
                ].map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>{row.map((c, j) => <td key={j} className={`p-1.5 ${[2,3,4,5].includes(j) ? 'text-right font-mono' : ''}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Badge className="bg-primary text-primary-foreground text-xs">Required</Badge> Minimum Columns</h4>
            <div className="grid grid-cols-4 gap-2">
              {['asset_name', 'weight', 'expected_return', 'volatility'].map(col => (
                <div key={col} className="p-2 rounded border bg-primary/5 text-center"><span className="font-mono text-xs font-semibold">{col}</span></div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">All Columns</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: 'asset_name', desc: 'Holding name or ticker' },
                { name: 'asset_class', desc: 'Equity, Fixed Income, Real Estate, Commodities, Alternatives' },
                { name: 'weight', desc: 'Allocation 0–1 or 0–100% (auto-normalized)' },
                { name: 'expected_return', desc: 'Annual expected return (decimal or %)' },
                { name: 'volatility', desc: 'Annual std deviation (decimal or %)' },
                { name: 'current_value', desc: 'Current market value in $K' },
              ].map(({ name, desc }) => (
                <div key={name} className="p-2 rounded border bg-muted/20">
                  <span className="font-mono text-xs font-semibold">{name}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_portfolio_assets.csv'; a.click(); }}>
              <Download className="w-4 h-4 mr-2" />Download Sample CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({ onStartWithData, onStartSample, onUpload, onFormatGuide, uploadedCount, parseError }: {
  onStartWithData: () => void; onStartSample: () => void; onUpload: (f: File) => void; onFormatGuide: () => void; uploadedCount: number; parseError: string | null;
}) => {
  const hasData = uploadedCount > 0;
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Activity className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Market Risk Simulation</CardTitle>
          <CardDescription className="text-base mt-2">Simulate portfolio performance under various market volatility scenarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Target, title: 'VaR & CVaR', desc: 'Value at Risk and Expected Shortfall at 95% and 99% confidence' },
              { icon: Activity, title: 'Monte Carlo', desc: '10,000 simulated scenarios with return distribution histogram' },
              { icon: Zap, title: 'Stress Testing', desc: 'Amplified volatility scenarios to model market crises' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-2">
                <CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className={`border-2 transition-all ${hasData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`}
              onClick={() => { if (!hasData) document.getElementById('market-csv-upload')?.click(); }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Upload Portfolio</CardTitle><CardDescription className="text-xs">CSV with asset data</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Asset data detected</span></div>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('market-csv-reup')?.click()}>
                      Upload different file
                      <input id="market-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload CSV with asset weights, returns, and volatilities.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required:</p>
                      <p>asset_name | weight | expected_return | volatility</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); onFormatGuide(); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>
                    {parseError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p>
                      </div>
                    )}
                  </>
                )}
                <input id="market-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
              </CardContent>
            </Card>
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Sample Portfolio</CardTitle><CardDescription className="text-xs">9 assets, 5 classes</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Diversified multi-asset portfolio: equities, bonds, REITs, commodities, and alternatives.</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {['9 holdings', '5 asset classes', '$10M portfolio', 'Monte Carlo ready'].map(f => (
                    <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>
                  ))}
                </div>
                <Button onClick={onStartSample} className="w-full" size="lg"><Activity className="w-4 h-4 mr-2" />Load Sample Portfolio</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MarketRiskPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: MarketRiskPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [pendingAssets, setPendingAssets] = useState<AssetRow[]>(() => {
    if (data && data.length > 0) { const p = parseAssetData(data); if (p && p.length > 0) return p; }
    return [];
  });
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (data && data.length > 0) {
      const parsed = parseAssetData(data);
      if (parsed && parsed.length > 0) { setPendingAssets(parsed); setParseError(null); }
    }
  }, [data]);

  const handleFileUpload = useCallback((file: File) => {
    setParseError(null);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const parsed = parseAssetData(result.data as Record<string, any>[]);
        if (parsed && parsed.length > 0) {
          setPendingAssets(parsed); setParseError(null);
          toast({ title: 'Imported', description: `${parsed.length} assets detected.` });
        } else {
          const cols = Object.keys((result.data as any[])[0] || {}).join(', ');
          setParseError(`Could not parse. Columns: [${cols}]. Need asset_name + weight + volatility.`);
        }
      },
      error: () => setParseError('Failed to read CSV.'),
    });
  }, [toast]);

  const handleStartWithData = useCallback(() => {
    if (pendingAssets.length > 0) {
      setAssets(pendingAssets);
      const totalVal = pendingAssets.reduce((s, a) => s + a.current_value, 0);
      if (totalVal > 0) setConfig(c => ({ ...c, portfolioValue: totalVal }));
      setShowIntro(false);
    }
  }, [pendingAssets]);

  const handleLoadSample = useCallback(() => {
    setAssets(buildDefaultAssets());
    setConfig(DEFAULT_CONFIG);
    setShowIntro(false);
  }, []);

  // Run simulation
  const simResult = useMemo(() => {
    if (assets.length === 0) return null;
    const base = runSimulation(assets, config, 1);
    const stress = runSimulation(assets, config, config.stressVolMultiplier);
    return { ...base, stressReturns: stress.returns, stressVar95: stress.var95, stressCvar95: stress.cvar95 };
  }, [assets, config]);

  // Derived analytics
  const portReturn = useMemo(() => assets.reduce((s, a) => s + a.weight * a.expected_return, 0), [assets]);
  const portVol = useMemo(() => Math.sqrt(assets.reduce((s, a) => s + (a.weight * a.volatility) ** 2, 0)), [assets]);

  const classData = useMemo(() => {
    const map: Record<string, { weight: number; count: number }> = {};
    assets.forEach(a => {
      if (!map[a.asset_class]) map[a.asset_class] = { weight: 0, count: 0 };
      map[a.asset_class].weight += a.weight;
      map[a.asset_class].count++;
    });
    return Object.entries(map).map(([cls, d]) => ({ class: cls, weight: d.weight * 100, count: d.count })).sort((a, b) => b.weight - a.weight);
  }, [assets]);

  const riskContrib = useMemo(() => assets.map(a => ({
    name: a.asset_name,
    marginalRisk: (a.weight * a.volatility) ** 2,
    weight: a.weight * 100,
    vol: a.volatility * 100,
  })).sort((a, b) => b.marginalRisk - a.marginalRisk), [assets]);
  const totalMarginal = riskContrib.reduce((s, r) => s + r.marginalRisk, 0);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = 'Market_Risk_Report.png'; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, []);

  const handleDownloadCSV = useCallback(() => {
    if (!simResult) return;
    let csv = `MARKET RISK SIMULATION REPORT\n${new Date().toLocaleDateString()}\n${assets.length} Assets | ${config.numSimulations.toLocaleString()} Simulations | ${config.timeHorizonDays}-day horizon\n\n`;
    csv += `RISK METRICS\nVaR 95%,${fmtPct(-simResult.var95)}\nVaR 99%,${fmtPct(-simResult.var99)}\nCVaR 95%,${fmtPct(-simResult.cvar95)}\nCVaR 99%,${fmtPct(-simResult.cvar99)}\nSharpe,${simResult.sharpe.toFixed(2)}\n\nVaR 95% ($),${fmt(simResult.var95 * config.portfolioValue)}\nCVaR 95% ($),${fmt(simResult.cvar95 * config.portfolioValue)}\n\n`;
    csv += 'PORTFOLIO ASSETS\n';
    csv += Papa.unparse(assets.map(a => ({ Name: a.asset_name, Class: a.asset_class, Weight: fmtPctPlain(a.weight * 100), Return: fmtPctPlain(a.expected_return * 100), Vol: fmtPctPlain(a.volatility * 100), Value: a.current_value })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Market_Risk_Report.csv'; link.click();
  }, [simResult, assets, config]);

  if (showIntro) return (<><IntroPage onStartWithData={handleStartWithData} onStartSample={handleLoadSample} onUpload={handleFileUpload} onFormatGuide={() => setFormatGuideOpen(true)} uploadedCount={pendingAssets.length} parseError={parseError} /><FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} /></>);
  if (!simResult) return null;

  const pv = config.portfolioValue;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Market Risk Simulation</h1><p className="text-muted-foreground mt-1">{assets.length} assets | {config.numSimulations.toLocaleString()} simulations | {config.timeHorizonDays}-day horizon</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <MarketRiskGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />

      {/* Simulation Config */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Simulation Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">Simulations</Label>
              <Input type="number" value={config.numSimulations} onChange={e => setConfig(c => ({ ...c, numSimulations: Math.max(1000, Math.min(50000, parseInt(e.target.value) || 10000)) }))} className="h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Horizon (days)</Label>
              <Input type="number" value={config.timeHorizonDays} onChange={e => setConfig(c => ({ ...c, timeHorizonDays: Math.max(1, Math.min(252, parseInt(e.target.value) || 21)) }))} className="h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Portfolio Value ($K)</Label>
              <Input type="number" value={config.portfolioValue} onChange={e => setConfig(c => ({ ...c, portfolioValue: parseFloat(e.target.value) || 10000 }))} className="h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Stress Vol Multiplier</Label>
              <div className="flex items-center gap-2">
                <Slider value={[config.stressVolMultiplier]} onValueChange={([v]) => setConfig(c => ({ ...c, stressVolMultiplier: v }))} min={1} max={3} step={0.25} className="flex-1" />
                <span className="text-sm font-mono font-bold w-8">{config.stressVolMultiplier}×</span>
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setConfig(c => ({ ...c }))}><RefreshCw className="w-3 h-3 mr-1" />Re-run</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'VaR 95%', value: fmt(simResult.var95 * pv), sub: fmtPct(-simResult.var95 * 100), alert: true },
          { label: 'CVaR 95%', value: fmt(simResult.cvar95 * pv), sub: fmtPct(-simResult.cvar95 * 100), alert: true },
          { label: 'VaR 99%', value: fmt(simResult.var99 * pv), sub: fmtPct(-simResult.var99 * 100) },
          { label: 'Sharpe Ratio', value: simResult.sharpe.toFixed(2), sub: `Return ${fmtPctPlain(portReturn * 100)} | Vol ${fmtPctPlain(portVol * 100)}` },
        ].map(({ label, value, sub, alert }) => (
          <Card key={label} className={`border-0 shadow-lg ${alert ? 'ring-2 ring-red-500/20' : ''}`}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Portfolio Holdings</CardTitle><CardDescription>{assets.length} assets | {fmt(pv)} total</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('market-csv-reupload')?.click()}>
              <Upload className="w-4 h-4 mr-1" />Re-upload
              <input id="market-csv-reupload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Asset</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Return</TableHead><TableHead className="text-right">Volatility</TableHead><TableHead className="text-right">Risk Contrib</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {riskContrib.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{r.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{assets[assets.findIndex(a => a.asset_name === r.name)]?.asset_class}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtPctPlain(r.weight)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtPctPlain(assets.find(a => a.asset_name === r.name)?.expected_return! * 100)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtPctPlain(r.vol)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">{fmtPctPlain(totalMarginal > 0 ? (r.marginalRisk / totalMarginal) * 100 : 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report */}
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
          <h2 className="text-2xl font-bold">Market Risk Simulation Report</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {config.numSimulations.toLocaleString()} Simulations | {config.timeHorizonDays}-day Horizon</p>
        </div>

        {/* Summary Cards */}
        {simResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Portfolio Value', value: fmt(pv), sub: `${assets.length} assets`, color: 'text-primary' },
            { label: `VaR 95% (${config.timeHorizonDays}d)`, value: fmt(simResult.var95 * pv), sub: fmtPctPlain(simResult.var95 * 100), color: 'text-red-600' },
            { label: 'CVaR 95%', value: fmt(simResult.cvar95 * pv), sub: fmtPctPlain(simResult.cvar95 * 100), color: 'text-red-600' },
            { label: 'Sharpe Ratio', value: simResult.sharpe.toFixed(2), sub: `Vol ${fmtPctPlain(portVol * 100)}`, color: simResult.sharpe >= 1.0 ? 'text-green-600' : simResult.sharpe >= 0.5 ? 'text-amber-600' : 'text-red-600' },
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
        )}

        {/* Asset Risk Detail Table */}
        <Card>
          <CardHeader><CardTitle>Asset Risk Detail</CardTitle><CardDescription>Weight, return, volatility, and risk contribution by asset</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Asset</th>
              <th className="p-2 text-left font-semibold">Class</th>
              <th className="p-2 text-right font-semibold">Weight</th>
              <th className="p-2 text-right font-semibold">Exp Return</th>
              <th className="p-2 text-right font-semibold">Volatility</th>
              <th className="p-2 text-right font-semibold">Value</th>
              <th className="p-2 text-right font-semibold">Risk Contrib</th>
              <th className="p-2 text-right font-semibold">Return/Vol</th>
            </tr></thead>
            <tbody>{riskContrib.map((r, i) => {
              const a = assets.find(x => x.asset_name === r.name)!;
              const riskPct = totalMarginal > 0 ? (r.marginalRisk / totalMarginal * 100) : 0;
              const rv = a.volatility > 0 ? a.expected_return / a.volatility : 0;
              return (
                <tr key={r.name} className="border-b">
                  <td className="p-2 font-medium whitespace-nowrap"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.palette[i % COLORS.palette.length] }} />{r.name}</div></td>
                  <td className="p-2 text-muted-foreground">{a.asset_class}</td>
                  <td className="p-2 text-right font-mono">{r.weight.toFixed(1)}%</td>
                  <td className={`p-2 text-right font-mono ${a.expected_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtPctPlain(a.expected_return * 100)}</td>
                  <td className={`p-2 text-right font-mono ${a.volatility > 0.3 ? 'text-red-600' : a.volatility > 0.15 ? 'text-amber-600' : 'text-green-600'}`}>{fmtPctPlain(a.volatility * 100)}</td>
                  <td className="p-2 text-right font-mono">{fmt(pv * a.weight)}</td>
                  <td className="p-2 text-right"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${riskPct > 30 ? 'bg-red-100 text-red-700' : riskPct > 15 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{riskPct.toFixed(1)}%</span></td>
                  <td className={`p-2 text-right font-mono ${rv >= 1.0 ? 'text-green-600' : rv >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>{rv.toFixed(2)}</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Portfolio</td>
              <td className="p-2">{classData.length} classes</td>
              <td className="p-2 text-right font-mono">100%</td>
              <td className="p-2 text-right font-mono">{fmtPctPlain(portReturn * 100)}</td>
              <td className="p-2 text-right font-mono">{fmtPctPlain(portVol * 100)}</td>
              <td className="p-2 text-right font-mono">{fmt(pv)}</td>
              <td className="p-2 text-right font-mono">100%</td>
              <td className="p-2 text-right font-mono">{simResult ? simResult.sharpe.toFixed(2) : '—'}</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Monte Carlo risk insights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Portfolio: ${assets.length} assets, ${fmt(pv)} value. Expected annual return ${fmtPctPlain(portReturn * 100)}, volatility ${fmtPctPlain(portVol * 100)}, Sharpe ${simResult.sharpe.toFixed(2)}.`);
                  items.push(`VaR (${config.timeHorizonDays}-day, 95%): ${fmt(simResult.var95 * pv)} loss (${fmtPctPlain(simResult.var95 * 100)}). There is a 5% chance of losing more than this in ${config.timeHorizonDays} trading days.`);
                  items.push(`CVaR 95%: ${fmt(simResult.cvar95 * pv)} (${fmtPctPlain(simResult.cvar95 * 100)}). When VaR is breached, average tail loss is ${fmtPctPlain((simResult.cvar95 / simResult.var95 - 1) * 100)} worse than VaR.`);
                  items.push(`Stress test (${config.stressVolMultiplier}× volatility): VaR 95% rises to ${fmt(simResult.stressVar95 * pv)} (${fmtPctPlain(simResult.stressVar95 * 100)}). ${simResult.stressVar95 > simResult.var95 * 1.5 ? 'Significant stress sensitivity.' : 'Manageable under stress.'}`);
                  const topRisk = riskContrib[0];
                  if (topRisk && topRisk.marginalRisk / totalMarginal > 0.35) items.push(`Risk concentration: "${topRisk.name}" contributes ${fmtPctPlain(topRisk.marginalRisk / totalMarginal * 100)} of portfolio risk. Consider rebalancing.`);
                  const topClass = classData[0];
                  if (topClass && topClass.weight > 50) items.push(`Asset class concentration: ${topClass.class} is ${fmtPctPlain(topClass.weight)} of portfolio (${topClass.count} holdings).`);
                  items.push(`Simulation range: worst ${fmtPct(-simResult.maxLoss * 100)} to best ${fmtPct(simResult.maxGain * 100)}. Mean ${fmtPct(simResult.mean * 100)}, median ${fmtPct(simResult.median * 100)}.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Distribution Histogram */}
        <Card>
          <CardHeader><CardTitle>Return Distribution — {config.numSimulations.toLocaleString()} Simulations</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={simResult.histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bin" interval={4} tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine x={simResult.histogram.find(h => h.isVar95 && !simResult.histogram[simResult.histogram.indexOf(h) + 1]?.isVar95)?.bin} stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'VaR 95%', position: 'top', fontSize: 11, fill: '#dc2626' }} />
                  <Bar dataKey="count" name="Frequency">
                    {simResult.histogram.map((d, i) => (
                      <Cell key={i} fill={d.isVar99 ? '#dc2626' : d.isVar95 ? '#f59e0b' : COLORS.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#dc2626' }} />{'<'} VaR 99%</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />VaR 99–95%</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.primary }} />Normal</span>
            </div>
          </CardContent>
        </Card>

        {/* Percentile Path */}
        <Card>
          <CardHeader><CardTitle>Portfolio Value Paths — Percentile Bands</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simResult.pathData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" label={{ value: 'Trading Days', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={v => `${v >= 0 ? '+' : ''}${fmt(v)}`} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), '']} />
                  <Area dataKey="p5" name="5th %" stackId="" type="monotone" fill="#e57373" fillOpacity={0.15} stroke="#e57373" strokeWidth={1} strokeDasharray="4 2" />
                  <Area dataKey="p25" name="25th %" stackId="" type="monotone" fill="#f59e0b" fillOpacity={0.1} stroke="#f59e0b" strokeWidth={1} />
                  <Area dataKey="p50" name="Median" stackId="" type="monotone" fill={COLORS.primary} fillOpacity={0.1} stroke={COLORS.primary} strokeWidth={2} />
                  <Area dataKey="p75" name="75th %" stackId="" type="monotone" fill={COLORS.secondary} fillOpacity={0.1} stroke={COLORS.secondary} strokeWidth={1} />
                  <Area dataKey="p95" name="95th %" stackId="" type="monotone" fill="#0d9488" fillOpacity={0.15} stroke="#0d9488" strokeWidth={1} strokeDasharray="4 2" />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stress Comparison */}
        <Card>
          <CardHeader><CardTitle>Stress Test — VaR Comparison</CardTitle><CardDescription>Base vs {config.stressVolMultiplier}× volatility</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { metric: 'VaR 95%', base: simResult.var95 * pv, stress: simResult.stressVar95 * pv },
                  { metric: 'CVaR 95%', base: simResult.cvar95 * pv, stress: simResult.stressCvar95 * pv },
                  { metric: 'VaR 99%', base: simResult.var99 * pv, stress: simResult.stressVar95 * pv * (simResult.var99 / simResult.var95) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" />
                  <YAxis tickFormatter={v => fmt(v)} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), '']} />
                  <Legend />
                  <Bar dataKey="base" name="Base Case" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stress" name={`Stress (${config.stressVolMultiplier}×)`} fill="#e57373" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Asset Class + Risk Decomposition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Asset Class Allocation</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, '']} />
                    <Bar dataKey="weight" name="Allocation %" radius={[4, 4, 0, 0]}>
                      {classData.map((_, i) => <Cell key={i} fill={COLORS.palette[i % COLORS.palette.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Risk Contribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskContrib.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={v => `${v.toFixed(0)}%`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, '']} />
                    <Bar dataKey="marginalRisk" name="Risk %" radius={[0, 4, 4, 0]}>
                      {riskContrib.slice(0, 8).map((d, i) => {
                        const pct = totalMarginal > 0 ? d.marginalRisk / totalMarginal : 0;
                        return <Cell key={i} fill={pct > 0.25 ? '#dc2626' : pct > 0.15 ? '#f59e0b' : COLORS.palette[i % COLORS.palette.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Risk Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'VaR 95%', value: `${fmt(simResult.var95 * pv)} (${fmtPctPlain(simResult.var95 * 100)})` },
                  { label: 'VaR 99%', value: `${fmt(simResult.var99 * pv)} (${fmtPctPlain(simResult.var99 * 100)})` },
                  { label: 'CVaR 95%', value: `${fmt(simResult.cvar95 * pv)} (${fmtPctPlain(simResult.cvar95 * 100)})` },
                  { label: 'CVaR 99%', value: `${fmt(simResult.cvar99 * pv)} (${fmtPctPlain(simResult.cvar99 * 100)})` },
                  { label: 'Max Drawdown', value: `${fmt(simResult.maxLoss * pv)} (${fmtPctPlain(simResult.maxLoss * 100)})` },
                  { label: 'Sharpe Ratio', value: simResult.sharpe.toFixed(3) },
                  { label: 'Mean Return', value: fmtPct(simResult.mean * 100) },
                  { label: 'Std Dev', value: fmtPctPlain(simResult.stdDev * 100) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between p-2 rounded-lg bg-muted/20">
                    <span className="text-sm">{label}</span>
                    <span className="font-mono text-sm font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Stress Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Base VaR 95%', value: fmt(simResult.var95 * pv) },
                  { label: `Stress VaR 95% (${config.stressVolMultiplier}×)`, value: fmt(simResult.stressVar95 * pv), alert: true },
                  { label: 'Increase', value: `+${fmtPctPlain(((simResult.stressVar95 / simResult.var95) - 1) * 100)}`, alert: true },
                  { label: 'Base CVaR 95%', value: fmt(simResult.cvar95 * pv) },
                  { label: `Stress CVaR 95% (${config.stressVolMultiplier}×)`, value: fmt(simResult.stressCvar95 * pv), alert: true },
                  { label: 'Portfolio Vol (base)', value: fmtPctPlain(portVol * 100) },
                  { label: `Portfolio Vol (${config.stressVolMultiplier}×)`, value: fmtPctPlain(portVol * config.stressVolMultiplier * 100), alert: true },
                ].map(({ label, value, alert }) => (
                  <div key={label} className={`flex justify-between p-2 rounded-lg ${alert ? 'bg-red-50/50 dark:bg-red-950/10' : 'bg-muted/20'}`}>
                    <span className="text-sm">{label}</span>
                    <span className={`font-mono text-sm font-semibold ${alert ? 'text-red-600' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Market Risk Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Based on {config.numSimulations.toLocaleString()} Monte Carlo simulations over a <strong>{config.timeHorizonDays}-day</strong> horizon, the {fmt(pv)} portfolio has a 95% VaR of <strong>{fmt(simResult.var95 * pv)}</strong> ({fmtPctPlain(simResult.var95 * 100)}). The Expected Shortfall (CVaR 95%) is {fmt(simResult.cvar95 * pv)}, meaning average tail losses exceed VaR by {fmtPctPlain(((simResult.cvar95 / simResult.var95) - 1) * 100)}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Portfolio expected return is {fmtPctPlain(portReturn * 100)} annualized with {fmtPctPlain(portVol * 100)} volatility, yielding a Sharpe ratio of <strong>{simResult.sharpe.toFixed(2)}</strong>. {simResult.sharpe >= 1 ? 'Attractive risk-adjusted return.' : simResult.sharpe >= 0.5 ? 'Moderate risk-adjusted return.' : 'Low risk-adjusted return — consider rebalancing.'}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Under stress ({config.stressVolMultiplier}× volatility), VaR 95% increases to <strong>{fmt(simResult.stressVar95 * pv)}</strong> — a {fmtPctPlain(((simResult.stressVar95 / simResult.var95) - 1) * 100)} increase. {simResult.stressVar95 * pv > pv * 0.1 ? 'Significant stress exposure — ensure adequate capital buffers.' : 'Stress impact within manageable range.'}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Asset allocation: {classData.map(c => `${c.class} ${fmtPctPlain(c.weight)}`).join(', ')}. Top risk contributor: {riskContrib[0]?.name} ({fmtPctPlain(totalMarginal > 0 ? (riskContrib[0]?.marginalRisk / totalMarginal) * 100 : 0)}).
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
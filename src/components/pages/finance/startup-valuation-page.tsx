'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Target, Layers, BookOpen, Download,
  FileSpreadsheet, ImageIcon, Settings2, ChevronDown, FileText,
  Sparkles, Info, HelpCircle, AlertTriangle, Calculator, Percent,
  Building2, Lightbulb, ChevronRight, Users, Rocket, Shield,
  Zap, Globe, Award, BarChart3, Star, Briefcase, CheckCircle2,
  ArrowRight, PieChart, Flame, Package, TrendingDown
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
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BerkusInputs {
  soundIdea: number;        // 0 – 500 ($K)
  prototype: number;        // 0 – 500
  qualityTeam: number;      // 0 – 500
  strategicRelationships: number; // 0 – 500
  productRollout: number;   // 0 – 500
}

interface ScorecardInputs {
  regionAvgPreMoney: number; // $K — average pre-money for region/stage
  teamScore: number;         // 0 – 150 (%)
  marketSizeScore: number;
  productScore: number;
  competitiveScore: number;
  marketingScore: number;
  needForFundingScore: number;
  otherScore: number;
}

interface VCInputs {
  expectedExitValue: number;   // $M
  targetROI: number;           // x (e.g. 10x, 20x)
  investmentAmount: number;    // $M
  expectedExitYears: number;
  dilutionPct: number;         // % expected dilution through future rounds
}

interface StartupInfo {
  name: string;
  stage: string;
  sector: string;
}

interface ValuationResult {
  method: string;
  preMoney: number;   // $K for Berkus/Scorecard, $M for VC
  postMoney: number;
  unit: string;       // '$K' or '$M'
  preMoneyM: number;  // always in $M for comparison
  postMoneyM: number;
}

interface StartupPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BERKUS_FACTORS = [
  { key: 'soundIdea', label: 'Sound Idea', desc: 'Basic value of the business concept and IP', icon: Lightbulb },
  { key: 'prototype', label: 'Working Prototype', desc: 'Reduces technology / product risk', icon: Package },
  { key: 'qualityTeam', label: 'Quality Management Team', desc: 'Reduces execution risk', icon: Users },
  { key: 'strategicRelationships', label: 'Strategic Relationships', desc: 'Reduces market risk and access', icon: Globe },
  { key: 'productRollout', label: 'Product Rollout / Sales', desc: 'Reduces production and financial risk', icon: Rocket },
] as const;

const SCORECARD_FACTORS = [
  { key: 'teamScore', label: 'Management Team', weight: 0.30, desc: 'Experience, skills, coachability', icon: Users },
  { key: 'marketSizeScore', label: 'Market Size & Opportunity', weight: 0.25, desc: 'TAM, growth rate, timing', icon: Globe },
  { key: 'productScore', label: 'Product / Technology', weight: 0.15, desc: 'Differentiation, IP, stage', icon: Zap },
  { key: 'competitiveScore', label: 'Competitive Environment', weight: 0.10, desc: 'Barriers, moat, competition', icon: Shield },
  { key: 'marketingScore', label: 'Marketing & Sales', weight: 0.10, desc: 'Channels, partnerships, traction', icon: TrendingUp },
  { key: 'needForFundingScore', label: 'Need for Additional Funding', weight: 0.05, desc: 'Runway, capital efficiency', icon: DollarSign },
  { key: 'otherScore', label: 'Other Factors', weight: 0.05, desc: 'Regulatory, timing, other risks', icon: Star },
] as const;

const DEFAULT_BERKUS: BerkusInputs = {
  soundIdea: 300,
  prototype: 250,
  qualityTeam: 350,
  strategicRelationships: 200,
  productRollout: 150,
};

const DEFAULT_SCORECARD: ScorecardInputs = {
  regionAvgPreMoney: 2500,
  teamScore: 120,
  marketSizeScore: 110,
  productScore: 100,
  competitiveScore: 90,
  marketingScore: 100,
  needForFundingScore: 100,
  otherScore: 100,
};

const DEFAULT_VC: VCInputs = {
  expectedExitValue: 100,
  targetROI: 15,
  investmentAmount: 2,
  expectedExitYears: 5,
  dilutionPct: 25,
};

const DEFAULT_STARTUP: StartupInfo = {
  name: 'NovaTech AI',
  stage: 'Seed',
  sector: 'B2B SaaS / AI',
};

const COLORS = {
  primary: '#1e3a5f',
  secondary: '#0d9488',
  positive: '#22c55e',
  negative: '#ef4444',
  muted: '#94a3b8',
  berkus: '#1e3a5f',
  scorecard: '#0d9488',
  vc: '#2d5a8e',
  bars: ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0'],
};

const metricDefinitions: Record<string, string> = {
  "Berkus Method": "Pre-revenue valuation assigning up to $500K for each of 5 risk factors. Max pre-money = $2.5M. Best for pre-revenue / idea-stage startups.",
  "Scorecard Method": "Adjusts regional average pre-money valuation by weighted factors (team, market, product, etc.). Each factor scored as % of average. Best for seed-stage with some traction.",
  "VC Method": "Works backward from expected exit. Post-money = Exit Value ÷ Target ROI. Pre-money = Post-money − Investment. Accounts for dilution in future rounds.",
  "Pre-Money Valuation": "Company value before the investment round. Determines how much equity investors receive.",
  "Post-Money Valuation": "Pre-money + investment amount. The company's value immediately after the investment.",
  "Target ROI": "The return multiple VCs target at exit. Early-stage typically 10-30x; later-stage 3-5x.",
  "Dilution": "Percentage of equity expected to be given up in future funding rounds before exit.",
  "Control Premium": "Not applicable to startup valuations — these methods estimate minority stake value for early investors.",
  "Football Field": "Comparison of all three valuation methods showing the range of estimated pre-money values.",
};


// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function computeBerkus(inputs: BerkusInputs): ValuationResult {
  const total = inputs.soundIdea + inputs.prototype + inputs.qualityTeam
    + inputs.strategicRelationships + inputs.productRollout;
  return {
    method: 'Berkus',
    preMoney: total,
    postMoney: total, // Berkus doesn't define post-money
    unit: '$K',
    preMoneyM: total / 1000,
    postMoneyM: total / 1000,
  };
}

function computeScorecard(inputs: ScorecardInputs): ValuationResult {
  let compositeMultiplier = 0;
  for (const f of SCORECARD_FACTORS) {
    compositeMultiplier += (inputs[f.key] / 100) * f.weight;
  }
  const preMoney = inputs.regionAvgPreMoney * compositeMultiplier;
  return {
    method: 'Scorecard',
    preMoney,
    postMoney: preMoney,
    unit: '$K',
    preMoneyM: preMoney / 1000,
    postMoneyM: preMoney / 1000,
  };
}

function computeVC(inputs: VCInputs): ValuationResult {
  const adjustedExit = inputs.expectedExitValue * (1 - inputs.dilutionPct / 100);
  const postMoney = inputs.targetROI > 0 ? adjustedExit / inputs.targetROI : 0;
  const preMoney = postMoney - inputs.investmentAmount;
  return {
    method: 'VC Method',
    preMoney: Math.max(0, preMoney),
    postMoney: Math.max(0, postMoney),
    unit: '$M',
    preMoneyM: Math.max(0, preMoney),
    postMoneyM: Math.max(0, postMoney),
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtK = (n: number) => isNaN(n) || !isFinite(n) ? '—' : n >= 1000 ? `$${(n / 1000).toFixed(2)}M` : `$${n.toFixed(0)}K`;
const fmtM = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(2)}M`;
const fmtP = (n: number, d = 1) => `${n.toFixed(d)}%`;


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Startup Valuation Glossary</DialogTitle>
        <DialogDescription>Key startup valuation terms</DialogDescription>
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

const StartupGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Startup Valuation Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">

          {/* When to Use */}
          <div>
            <h3 className="font-semibold text-primary mb-3">When to Use Each Method</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { name: 'Berkus', stage: 'Pre-revenue / Idea', color: 'text-primary', desc: 'No revenue yet. Assigns $0-500K per risk factor. Max $2.5M.' },
                { name: 'Scorecard', stage: 'Seed / Pre-Series A', color: 'text-primary', desc: 'Some traction. Adjusts regional average by weighted quality factors.' },
                { name: 'VC Method', stage: 'Any stage with exit thesis', color: 'text-primary', desc: 'Works backward from projected exit value and target investor return.' },
              ].map(({ name, stage, color, desc }) => (
                <div key={name} className="p-4 rounded-lg border">
                  <p className={`font-semibold ${color}`}>{name}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{stage}</Badge>
                  <p className="text-xs text-muted-foreground mt-2">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── BERKUS FORMULA ── */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" />Berkus Method — Formula</h3>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="p-3 bg-background rounded-md font-mono text-sm text-center">
                Pre-Money = Σ (Risk Factor Score)<br/>
                <span className="text-xs text-muted-foreground">= Sound Idea + Prototype + Team + Relationships + Rollout</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Each factor is scored <strong>$0 – $500K</strong> based on risk reduction:</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b">
                    <th className="text-left p-1.5 font-semibold">Factor</th>
                    <th className="text-left p-1.5 font-semibold">Risk Addressed</th>
                    <th className="text-right p-1.5 font-semibold">Range</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Sound Idea', 'Is there a viable business concept / IP?', '$0 – $500K'],
                      ['Working Prototype', 'Technology / product risk reduced?', '$0 – $500K'],
                      ['Quality Team', 'Execution risk reduced?', '$0 – $500K'],
                      ['Strategic Relationships', 'Market access / distribution risk?', '$0 – $500K'],
                      ['Product Rollout / Sales', 'Financial / production risk?', '$0 – $500K'],
                    ].map(([f, risk, range], i) => (
                      <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-1.5">{f}</td><td className="p-1.5 text-muted-foreground">{risk}</td><td className="p-1.5 text-right font-mono">{range}</td></tr>
                    ))}
                    <tr className="border-t font-semibold"><td className="p-1.5">Maximum</td><td className="p-1.5"></td><td className="p-1.5 text-right font-mono text-primary">$2,500K</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-background rounded-md text-xs space-y-1">
                <p className="font-semibold">Example:</p>
                <p className="font-mono">Idea $300K + Prototype $250K + Team $400K + Relationships $200K + Sales $100K</p>
                <p className="font-mono text-primary font-semibold">= $1,250K ($1.25M) Pre-Money</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── SCORECARD FORMULA ── */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Award className="w-4 h-4" />Scorecard Method — Formula</h3>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="p-3 bg-background rounded-md font-mono text-sm text-center space-y-1">
                <p>Composite = Σ (Factor Score × Factor Weight)</p>
                <p className="text-primary font-semibold">Pre-Money = Regional Avg Pre-Money × Composite</p>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Each factor is scored as a <strong>percentage of average</strong> (100% = on par). Below 100% = below average, above = above.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b">
                    <th className="text-left p-1.5 font-semibold">Factor</th>
                    <th className="text-right p-1.5 font-semibold">Weight</th>
                    <th className="text-right p-1.5 font-semibold">Score Range</th>
                    <th className="text-right p-1.5 font-semibold">Example</th>
                    <th className="text-right p-1.5 font-semibold">Contribution</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Management Team', '30%', '50–150%', '120%', '36.0%'],
                      ['Market Size', '25%', '50–150%', '110%', '27.5%'],
                      ['Product / Technology', '15%', '50–150%', '100%', '15.0%'],
                      ['Competitive Environment', '10%', '50–150%', '90%', '9.0%'],
                      ['Marketing & Sales', '10%', '50–150%', '105%', '10.5%'],
                      ['Need for Funding', '5%', '50–150%', '100%', '5.0%'],
                      ['Other Factors', '5%', '50–150%', '100%', '5.0%'],
                    ].map(([f, w, range, ex, contrib], i) => (
                      <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-1.5">{f}</td><td className="p-1.5 text-right font-mono">{w}</td><td className="p-1.5 text-right font-mono">{range}</td><td className="p-1.5 text-right font-mono">{ex}</td><td className="p-1.5 text-right font-mono">{contrib}</td></tr>
                    ))}
                    <tr className="border-t font-semibold"><td className="p-1.5">Total</td><td className="p-1.5 text-right font-mono">100%</td><td className="p-1.5"></td><td className="p-1.5"></td><td className="p-1.5 text-right font-mono text-primary">108.0%</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-background rounded-md text-xs space-y-1">
                <p className="font-semibold">Example:</p>
                <p className="font-mono">Regional Avg Pre-Money = $2,500K</p>
                <p className="font-mono">Composite Multiplier = 108.0%</p>
                <p className="font-mono text-primary font-semibold">Pre-Money = $2,500K × 1.080 = $2,700K ($2.70M)</p>
              </div>
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <strong>Key insight:</strong> Composite &gt; 100% → startup is above average → higher valuation. Composite &lt; 100% → below average → discount.
              </div>
            </div>
          </div>

          <Separator />

          {/* ── VC METHOD FORMULA ── */}
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />VC Method — Formula</h3>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="p-3 bg-background rounded-md font-mono text-sm text-center space-y-2">
                <p><span className="text-muted-foreground">Step 1:</span> Adjusted Exit = Exit Value × (1 − Dilution%)</p>
                <p><span className="text-muted-foreground">Step 2:</span> Post-Money = Adjusted Exit ÷ Target ROI</p>
                <p className="text-primary font-semibold"><span className="text-muted-foreground">Step 3:</span> Pre-Money = Post-Money − Investment Amount</p>
              </div>
              <div className="p-3 bg-background rounded-md text-xs space-y-1.5">
                <p className="font-semibold">Example:</p>
                <div className="space-y-1 font-mono">
                  <p><span className="text-muted-foreground">Given:</span> Exit = $100M, ROI = 15x, Investment = $2M, Dilution = 25%</p>
                  <p><span className="text-muted-foreground">Step 1:</span> $100M × (1 − 0.25) = $75M <span className="text-muted-foreground">(dilution-adjusted exit)</span></p>
                  <p><span className="text-muted-foreground">Step 2:</span> $75M ÷ 15 = $5.00M <span className="text-muted-foreground">(post-money)</span></p>
                  <p className="text-primary font-semibold"><span className="text-muted-foreground">Step 3:</span> $5.00M − $2.00M = $3.00M <span className="text-muted-foreground">(pre-money)</span></p>
                </div>
              </div>
              <div className="p-3 bg-background rounded-md text-xs space-y-1.5">
                <p className="font-semibold">Derived Metrics:</p>
                <div className="space-y-1 font-mono">
                  <p>Investor Ownership = Investment ÷ Post-Money = $2M ÷ $5M = <strong>40.0%</strong></p>
                  <p>Implied IRR = (Target ROI)^(1/Years) − 1 = 15^(1/5) − 1 = <strong>71.9%</strong></p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b">
                    <th className="text-left p-1.5 font-semibold">Variable</th>
                    <th className="text-left p-1.5 font-semibold">Meaning</th>
                    <th className="text-right p-1.5 font-semibold">Typical Range</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Exit Value', 'Expected acquisition or IPO value', '$30M – $500M+'],
                      ['Target ROI', 'Return multiple investor targets', '10x – 30x (early), 3x – 5x (late)'],
                      ['Investment', 'Amount being raised this round', '$0.5M – $20M'],
                      ['Dilution', 'Future rounds before exit', '20% – 50%'],
                      ['Exit Timeline', 'Years to liquidity event', '3 – 7 years'],
                    ].map(([v, m, r], i) => (
                      <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}><td className="p-1.5 font-mono">{v}</td><td className="p-1.5 text-muted-foreground">{m}</td><td className="p-1.5 text-right font-mono">{r}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <strong>Key insight:</strong> Higher target ROI → lower valuation (investor demands more ownership). Higher dilution → lower valuation (future rounds erode returns).
              </div>
            </div>
          </div>

          <Separator />

          {/* Typical Ranges */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Typical Ranges by Stage</h3>
            <div className="space-y-2">
              {[
                ['Pre-Seed / Idea', '$250K – $1.5M', 'Berkus'],
                ['Seed', '$1M – $5M', 'Scorecard, VC'],
                ['Series A', '$5M – $20M', 'VC, DCF blend'],
                ['Series B+', '$20M+', 'VC, DCF, CCA'],
              ].map(([stage, range, methods]) => (
                <div key={stage as string} className="flex items-center gap-4 p-2 rounded-lg bg-muted/30">
                  <span className="font-medium text-sm w-32">{stage}</span>
                  <span className="font-mono text-sm text-primary w-36">{range}</span>
                  <span className="text-xs text-muted-foreground">{methods}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Comparison Summary */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Method Comparison at a Glance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b">
                  <th className="text-left p-2 font-semibold"></th>
                  <th className="text-center p-2 font-semibold text-primary">Berkus</th>
                  <th className="text-center p-2 font-semibold text-primary">Scorecard</th>
                  <th className="text-center p-2 font-semibold text-primary">VC Method</th>
                </tr></thead>
                <tbody>
                  {[
                    ['Approach', 'Bottom-up risk scoring', 'Relative to regional avg', 'Top-down from exit'],
                    ['Inputs', 'Qualitative assessment', 'Weighted factor scores', 'Exit value, ROI, dilution'],
                    ['Max / Range', 'Capped at $2.5M', 'No cap (depends on avg)', 'No cap'],
                    ['Accounts for Dilution?', 'No', 'No', 'Yes'],
                    ['Best Precision', 'Low (qualitative)', 'Medium (semi-quantitative)', 'High (quantitative)'],
                    ['Revenue Required?', 'No', 'No (but traction helps)', 'No'],
                  ].map(([label, b, s, v], i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2 font-medium">{label}</td>
                      <td className="p-2 text-center">{b}</td>
                      <td className="p-2 text-center">{s}</td>
                      <td className="p-2 text-center">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Use all three methods and compare. The overlap zone gives you the most defensible valuation range.</li>
              <li>• No single method is &quot;correct&quot; for early-stage companies. If methods diverge significantly, investigate which assumptions differ most.</li>
              <li>• Berkus is best for idea-stage with no revenue. Scorecard works when you have some traction to benchmark. VC Method is strongest when you have a credible exit thesis.</li>
              <li>• For VC Method, be realistic about dilution — most startups raise 2–4 rounds before exit, each diluting 15–25%.</li>
              <li>• Regional average pre-money varies widely: $2–3M in most US markets, $1–2M in emerging markets, $3–5M in SF/NYC.</li>
              <li>• Export the comparison chart for investor pitch decks — showing multiple methods builds credibility.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SLIDER ROW
// ═══════════════════════════════════════════════════════════════════════════════

const SliderRow = ({ label, value, onChange, min = 0, max = 500, step = 10, suffix = '', desc, icon: Icon, color }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string;
  desc?: string; icon?: React.ElementType; color?: string;
}) => (
  <div className="space-y-2 p-3 rounded-lg hover:bg-muted/30 transition-colors">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${color || 'text-primary'}`} />}
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 w-24 text-right text-sm font-mono"
          step={step}
        />
        {suffix && <span className="text-xs text-muted-foreground w-6">{suffix}</span>}
      </div>
    </div>
    {desc && <p className="text-xs text-muted-foreground ml-6">{desc}</p>}
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="ml-6" />
  </div>
);


// ═══════════════════════════════════════════════════════════════════════════════
// INTRO PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const IntroPage = ({ onStart }: { onStart: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Rocket className="w-8 h-8 text-primary" /></div></div>
        <CardTitle className="font-headline text-3xl">Startup Valuation</CardTitle>
        <CardDescription className="text-base mt-2">Early-stage company valuation using three proven methodologies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Lightbulb, title: 'Berkus Method', desc: 'Pre-revenue risk factor scoring. Up to $500K per factor.', color: 'text-primary', badge: 'Pre-Revenue' },
            { icon: Award, title: 'Scorecard Method', desc: 'Weighted quality factors vs regional average valuation.', color: 'text-primary', badge: 'Seed Stage' },
            { icon: TrendingUp, title: 'VC Method', desc: 'Exit value ÷ target ROI, adjusted for dilution.', color: 'text-primary', badge: 'Any Stage' },
          ].map(({ icon: Icon, title, desc, color, badge }) => (
            <Card key={title} className="border-2 relative">
              <Badge variant="outline" className="absolute top-3 right-3 text-[10px]">{badge}</Badge>
              <CardHeader><Icon className={`w-6 h-6 ${color} mb-2`} /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Info className="w-5 h-5" />How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2"><span className="font-bold text-primary">1.</span>Enter your startup&apos;s basic info</div>
            <div className="flex items-start gap-2"><span className="font-bold text-primary">2.</span>Adjust assumptions for each method using sliders</div>
            <div className="flex items-start gap-2"><span className="font-bold text-primary">3.</span>Compare all three valuations in the football field</div>
          </div>
          <p className="text-xs text-muted-foreground">No data upload needed — all inputs are adjustable parameters. Best used for pre-revenue through seed-stage companies.</p>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onStart} size="lg"><Rocket className="mr-2 h-5 w-5" />Start Valuation</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function StartupPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: StartupPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [startup, setStartup] = useState<StartupInfo>(DEFAULT_STARTUP);
  const [berkus, setBerkus] = useState<BerkusInputs>(DEFAULT_BERKUS);
  const [scorecard, setScorecard] = useState<ScorecardInputs>(DEFAULT_SCORECARD);
  const [vc, setVC] = useState<VCInputs>(DEFAULT_VC);

  // Compute
  const berkusResult = useMemo(() => computeBerkus(berkus), [berkus]);
  const scorecardResult = useMemo(() => computeScorecard(scorecard), [scorecard]);
  const vcResult = useMemo(() => computeVC(vc), [vc]);
  const allResults = useMemo(() => [berkusResult, scorecardResult, vcResult], [berkusResult, scorecardResult, vcResult]);

  const validResults = allResults.filter(r => r.preMoneyM > 0);
  const priceRange = validResults.length >= 2
    ? { low: Math.min(...validResults.map(r => r.preMoneyM)), high: Math.max(...validResults.map(r => r.preMoneyM)), mid: validResults.reduce((a, r) => a + r.preMoneyM, 0) / validResults.length }
    : validResults.length === 1
      ? { low: validResults[0].preMoneyM, high: validResults[0].preMoneyM, mid: validResults[0].preMoneyM }
      : null;

  // Scorecard composite
  const scorecardComposite = useMemo(() => {
    let total = 0;
    for (const f of SCORECARD_FACTORS) total += (scorecard[f.key] / 100) * f.weight;
    return total;
  }, [scorecard]);

  // Berkus radar data
  const berkusRadar = BERKUS_FACTORS.map(f => ({
    factor: f.label.split(' ').slice(0, 2).join(' '),
    value: berkus[f.key],
    fullMark: 500,
  }));

  // Football field
  const footballData = allResults.filter(r => r.preMoneyM > 0).map(r => ({
    name: r.method,
    value: r.preMoneyM,
  }));

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Startup_Val_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  const handleDownloadCSV = useCallback(() => {
    let csv = `STARTUP VALUATION — ${startup.name}\n`;
    csv += `Stage: ${startup.stage} | Sector: ${startup.sector}\n\n`;
    csv += "METHOD COMPARISON\n";
    csv += Papa.unparse(allResults.map(r => ({
      Method: r.method, 'Pre-Money': r.unit === '$K' ? `${r.preMoney}K` : `${r.preMoney.toFixed(2)}M`,
      'Pre-Money ($M)': r.preMoneyM.toFixed(3),
    }))) + "\n\n";
    csv += "BERKUS DETAIL\n";
    csv += Papa.unparse(BERKUS_FACTORS.map(f => ({ Factor: f.label, Value: `$${berkus[f.key]}K` }))) + "\n\n";
    csv += "SCORECARD DETAIL\n";
    csv += Papa.unparse(SCORECARD_FACTORS.map(f => ({ Factor: f.label, Weight: `${(f.weight * 100).toFixed(0)}%`, Score: `${scorecard[f.key]}%` })));
    csv += `\nRegion Avg Pre-Money,$${scorecard.regionAvgPreMoney}K\nComposite Multiplier,${scorecardComposite.toFixed(3)}\n\n`;
    csv += "VC METHOD DETAIL\n";
    csv += `Expected Exit Value,$${vc.expectedExitValue}M\nTarget ROI,${vc.targetROI}x\nInvestment,$${vc.investmentAmount}M\nDilution,${vc.dilutionPct}%\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Startup_Val_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [allResults, berkus, scorecard, scorecardComposite, vc, startup, toast]);

  if (showIntro) return <IntroPage onStart={() => setShowIntro(false)} />;

  const strongestBerkus = BERKUS_FACTORS.reduce((best, f) => berkus[f.key] > berkus[best.key] ? f : best, BERKUS_FACTORS[0]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Startup Valuation</h1><p className="text-muted-foreground mt-1">Berkus · Scorecard · VC Method</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <StartupGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Startup Info ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Rocket className="w-6 h-6 text-primary" /></div>
            <div><CardTitle>Company Overview</CardTitle><CardDescription>Basic information about the startup</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {([
              ['name', 'Company Name'],
              ['stage', 'Stage (e.g., Pre-Seed, Seed, Series A)'],
              ['sector', 'Sector / Industry'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium">{label}</Label>
                <Input value={startup[key]} onChange={e => setStartup(prev => ({ ...prev, [key]: e.target.value }))} className="h-9 text-sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══ Valuation Summary (top) ══ */}
      {priceRange && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Valuation Range — {startup.name}</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div><p className="text-xs text-muted-foreground">Low</p><p className="text-2xl font-bold">{fmtM(priceRange.low)}</p></div>
                <div className="border-x border-border px-4"><p className="text-xs text-muted-foreground">Midpoint</p><p className="text-3xl font-bold text-primary">{fmtM(priceRange.mid)}</p></div>
                <div><p className="text-xs text-muted-foreground">High</p><p className="text-2xl font-bold">{fmtM(priceRange.high)}</p></div>
              </div>
              <div className="flex items-center justify-center gap-6 pt-2">
                {allResults.map(r => (
                  <div key={r.method} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full inline-block ${r.method === 'Berkus' ? 'bg-[#1e3a5f]' : r.method === 'Scorecard' ? 'bg-[#0d9488]' : 'bg-[#3b7cc0]'}`} />
                    <span className="text-xs">{r.method}: <strong>{fmtM(r.preMoneyM)}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ Football Field ══ */}
      {footballData.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader><CardTitle>Pre-Money Valuation — Football Field</CardTitle><CardDescription>Comparison across all three methodologies</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={footballData} layout="vertical" margin={{ left: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `$${v}M`} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}M`, 'Pre-Money']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {footballData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === 'Berkus' ? COLORS.berkus : entry.name === 'Scorecard' ? COLORS.scorecard : COLORS.vc} />
                    ))}
                  </Bar>
                  {priceRange && <ReferenceLine x={priceRange.mid} stroke={COLORS.secondary} strokeDasharray="5 5" label={{ value: `Mid: ${fmtM(priceRange.mid)}`, position: 'top', fill: COLORS.secondary, fontSize: 11 }} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ 1. BERKUS METHOD ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div>
            <div>
              <CardTitle className="flex items-center gap-2">Berkus Method<Badge variant="outline" className="text-[10px]">Pre-Revenue</Badge></CardTitle>
              <CardDescription>Assign $0–$500K per risk factor. Max pre-money = $2.5M.</CardDescription>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Pre-Money</p>
              <p className="text-2xl font-bold text-primary">{fmtK(berkusResult.preMoney)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {BERKUS_FACTORS.map(f => (
            <SliderRow
              key={f.key}
              label={f.label}
              desc={f.desc}
              icon={f.icon}
              color="text-indigo-500"
              value={berkus[f.key]}
              onChange={v => setBerkus(prev => ({ ...prev, [f.key]: v }))}
              min={0} max={500} step={25}
              suffix="$K"
            />
          ))}
          <Separator className="my-3" />

          {/* Calculation Breakdown */}
          <div className="px-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calculation Breakdown</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-primary/5">
                  <TableHead>Risk Factor</TableHead><TableHead className="text-right">Score ($K)</TableHead><TableHead className="text-right">Max ($K)</TableHead><TableHead className="text-right">% of Max</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {BERKUS_FACTORS.map(f => (
                    <TableRow key={f.key}>
                      <TableCell className="text-sm">{f.label}</TableCell>
                      <TableCell className="text-right font-mono">${berkus[f.key]}K</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">$500K</TableCell>
                      <TableCell className="text-right font-mono">{((berkus[f.key] / 500) * 100).toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono text-primary">{fmtK(berkusResult.preMoney)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">$2,500K</TableCell>
                    <TableCell className="text-right font-mono">{((berkusResult.preMoney / 2500) * 100).toFixed(0)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-xs font-mono text-center space-y-1">
              <p className="text-muted-foreground">Formula</p>
              <p>Pre-Money = {BERKUS_FACTORS.map(f => `$${berkus[f.key]}K`).join(' + ')}</p>
              <p className="text-primary font-semibold">= {fmtK(berkusResult.preMoney)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded-lg">
            <span className="font-semibold text-sm">Total Pre-Money Valuation</span>
            <span className="font-bold text-lg text-primary">{fmtK(berkusResult.preMoney)}</span>
          </div>

          {/* Berkus Radar */}
          <div className="h-[250px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={berkusRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 500]} tick={{ fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke={COLORS.berkus} fill={COLORS.berkus} fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ══ 2. SCORECARD METHOD ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Award className="w-6 h-6 text-primary" /></div>
            <div>
              <CardTitle className="flex items-center gap-2">Scorecard Method<Badge variant="outline" className="text-[10px]">Seed Stage</Badge></CardTitle>
              <CardDescription>Score vs regional average. Composite: {(scorecardComposite * 100).toFixed(1)}%</CardDescription>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Pre-Money</p>
              <p className="text-2xl font-bold text-primary">{fmtK(scorecardResult.preMoney)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Region average */}
          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/30 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Regional Average Pre-Money</Label>
                <p className="text-xs text-muted-foreground">Typical pre-money for similar-stage startups in your region</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Input type="number" value={scorecard.regionAvgPreMoney} onChange={e => setScorecard(prev => ({ ...prev, regionAvgPreMoney: parseFloat(e.target.value) || 0 }))} className="h-8 w-28 text-right text-sm font-mono" step={100} />
                <span className="text-xs text-muted-foreground">$K</span>
              </div>
            </div>
          </div>

          {SCORECARD_FACTORS.map(f => (
            <SliderRow
              key={f.key}
              label={`${f.label} (${(f.weight * 100).toFixed(0)}%)`}
              desc={f.desc}
              icon={f.icon}
              color="text-amber-500"
              value={scorecard[f.key]}
              onChange={v => setScorecard(prev => ({ ...prev, [f.key]: v }))}
              min={50} max={150} step={5}
              suffix="%"
            />
          ))}
          <Separator className="my-3" />

          {/* Calculation Breakdown */}
          <div className="px-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calculation Breakdown</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-primary/5">
                  <TableHead>Factor</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Score</TableHead><TableHead className="text-right">Contribution</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {SCORECARD_FACTORS.map(f => {
                    const contribution = (scorecard[f.key] / 100) * f.weight;
                    return (
                      <TableRow key={f.key}>
                        <TableCell className="text-sm">{f.label}</TableCell>
                        <TableCell className="text-right font-mono">{(f.weight * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-right font-mono">{scorecard[f.key]}%</TableCell>
                        <TableCell className="text-right font-mono">{(contribution * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-primary/5 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">100%</TableCell>
                    <TableCell className="text-right font-mono"></TableCell>
                    <TableCell className="text-right font-mono text-primary">{(scorecardComposite * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-xs font-mono text-center space-y-1">
              <p className="text-muted-foreground">Formula</p>
              <p>Composite = {SCORECARD_FACTORS.map(f => `(${scorecard[f.key]}% × ${(f.weight * 100).toFixed(0)}%)`).join(' + ')}</p>
              <p>= {(scorecardComposite * 100).toFixed(1)}%</p>
              <p className="pt-1">Pre-Money = Regional Avg × Composite = {fmtK(scorecard.regionAvgPreMoney)} × {(scorecardComposite * 100).toFixed(1)}%</p>
              <p className="text-primary font-semibold">= {fmtK(scorecardResult.preMoney)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 bg-primary/5 rounded-lg px-3">
            <span className="font-semibold text-sm">Pre-Money Valuation</span>
            <span className="font-bold text-lg text-primary">{fmtK(scorecardResult.preMoney)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ══ 3. VC METHOD ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-primary" /></div>
            <div>
              <CardTitle className="flex items-center gap-2">VC Method<Badge variant="outline" className="text-[10px]">Exit-Based</Badge></CardTitle>
              <CardDescription>Work backward from expected exit value and target ROI</CardDescription>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Pre-Money</p>
              <p className="text-2xl font-bold text-primary">{fmtM(vcResult.preMoneyM)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <SliderRow label="Expected Exit Value" desc="Estimated acquisition or IPO value" icon={DollarSign} color="text-green-500"
            value={vc.expectedExitValue} onChange={v => setVC(prev => ({ ...prev, expectedExitValue: v }))} min={10} max={500} step={5} suffix="$M" />
          <SliderRow label="Target ROI Multiple" desc="Return multiple investors expect (e.g., 10x = 10)" icon={TrendingUp} color="text-green-500"
            value={vc.targetROI} onChange={v => setVC(prev => ({ ...prev, targetROI: v }))} min={1} max={50} step={1} suffix="x" />
          <SliderRow label="Investment Amount" desc="Amount being raised in this round" icon={Briefcase} color="text-green-500"
            value={vc.investmentAmount} onChange={v => setVC(prev => ({ ...prev, investmentAmount: v }))} min={0.1} max={20} step={0.1} suffix="$M" />
          <SliderRow label="Expected Exit Timeline" desc="Years until expected exit event" icon={Target} color="text-green-500"
            value={vc.expectedExitYears} onChange={v => setVC(prev => ({ ...prev, expectedExitYears: v }))} min={1} max={10} step={1} suffix="yr" />
          <SliderRow label="Expected Dilution" desc="Equity dilution through future rounds before exit" icon={PieChart} color="text-green-500"
            value={vc.dilutionPct} onChange={v => setVC(prev => ({ ...prev, dilutionPct: v }))} min={0} max={80} step={5} suffix="%" />

          <Separator className="my-3" />

          {/* Calculation Breakdown */}
          <div className="px-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calculation Breakdown</p>
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {[
                  { step: 1, label: 'Expected Exit Value', formula: '', value: fmtM(vc.expectedExitValue), color: '' },
                  { step: 2, label: 'Dilution Adjustment', formula: `${fmtM(vc.expectedExitValue)} × (1 − ${vc.dilutionPct}%)`, value: fmtM(vc.expectedExitValue * (1 - vc.dilutionPct / 100)), color: '' },
                  { step: 3, label: 'Post-Money Valuation', formula: `${fmtM(vc.expectedExitValue * (1 - vc.dilutionPct / 100))} ÷ ${vc.targetROI}x`, value: fmtM(vcResult.postMoneyM), color: '' },
                  { step: 4, label: 'Less: Investment', formula: '', value: `− ${fmtM(vc.investmentAmount)}`, color: 'text-red-500' },
                  { step: 5, label: 'Pre-Money Valuation', formula: `${fmtM(vcResult.postMoneyM)} − ${fmtM(vc.investmentAmount)}`, value: fmtM(vcResult.preMoneyM), color: 'text-primary font-bold' },
                ].map(({ step, label, formula, value, color }) => (
                  <div key={step} className={`flex items-center gap-4 p-3 ${step === 5 ? 'bg-primary/5' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{step}</div>
                    <div className="flex-1">
                      <p className={`text-sm ${step === 5 ? 'font-semibold' : ''}`}>{label}</p>
                      {formula && <p className="text-xs font-mono text-muted-foreground">{formula}</p>}
                    </div>
                    <span className={`font-mono text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-xs font-mono text-center space-y-1">
              <p className="text-muted-foreground">Formula</p>
              <p>Adjusted Exit = Exit Value × (1 − Dilution%) = {fmtM(vc.expectedExitValue)} × {((100 - vc.dilutionPct) / 100).toFixed(2)} = {fmtM(vc.expectedExitValue * (1 - vc.dilutionPct / 100))}</p>
              <p>Post-Money = Adjusted Exit ÷ Target ROI = {fmtM(vc.expectedExitValue * (1 - vc.dilutionPct / 100))} ÷ {vc.targetROI} = {fmtM(vcResult.postMoneyM)}</p>
              <p className="text-primary font-semibold">Pre-Money = Post-Money − Investment = {fmtM(vcResult.postMoneyM)} − {fmtM(vc.investmentAmount)} = {fmtM(vcResult.preMoneyM)}</p>
            </div>

            {/* Ownership check */}
            {vcResult.postMoneyM > 0 && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm space-y-1">
                <p className="font-medium text-primary dark:text-green-400">Investor Ownership Check</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Investor equity = Investment ÷ Post-Money = {fmtM(vc.investmentAmount)} ÷ {fmtM(vcResult.postMoneyM)} = <strong>{((vc.investmentAmount / vcResult.postMoneyM) * 100).toFixed(1)}%</strong>
                </p>
              </div>
            )}
          </div>

          <div className="px-3">
            <div className="flex items-center justify-between py-2 bg-primary/5 rounded-lg px-3">
              <span className="font-semibold text-sm">Pre-Money Valuation</span>
              <span className="font-bold text-lg text-primary">{fmtM(vcResult.preMoneyM)}</span>
            </div>
            {vcResult.preMoneyM <= 0 && (
              <Alert variant="destructive" className="mt-3"><AlertTriangle className="h-4 w-4" /><AlertTitle>Negative Pre-Money</AlertTitle><AlertDescription>Target ROI is too high relative to exit value. Lower the ROI or raise exit expectations.</AlertDescription></Alert>
            )}
          </div>
        </CardContent>
      </Card>

      

      {/* ══ Detailed Report ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Valuation Report</h2><p className="text-sm text-muted-foreground">Detailed comparison and summary</p></div>
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
          <h2 className="text-2xl font-bold">{startup.name} — Startup Valuation Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Stage: {startup.stage} | Sector: {startup.sector} | {new Date().toLocaleDateString()}</p>
        </div>

       

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Berkus', value: fmtK(berkusResult.preMoney), sub: `${BERKUS_FACTORS.length} risk factors`, color: 'text-primary', icon: Lightbulb },
            { label: 'Scorecard', value: fmtK(scorecardResult.preMoney), sub: `${(scorecardComposite * 100).toFixed(0)}% of ${fmtK(scorecard.regionAvgPreMoney)} avg`, color: 'text-primary', icon: Award },
            { label: 'VC Method', value: fmtM(vcResult.preMoneyM), sub: `${fmtM(vc.expectedExitValue)} exit ÷ ${vc.targetROI}x`, color: 'text-primary', icon: TrendingUp },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <Card key={label}><CardContent className="p-6"><div className="space-y-2">
              <div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className={`h-4 w-4 ${color}`} /></div>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div></CardContent></Card>
          ))}
        </div>

  {/* ══ Key Findings ══ */}
  <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
            <div><CardTitle>Key Findings</CardTitle><CardDescription>Startup valuation highlights</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
            <div className="space-y-3">
              {(() => {
                const items: string[] = [];
                if (priceRange) {
                  items.push(`Estimated pre-money valuation range: ${fmtM(priceRange.low)} – ${fmtM(priceRange.high)}, midpoint ${fmtM(priceRange.mid)}. ${priceRange.high / priceRange.low > 3 ? '⚠️ Wide dispersion — methods disagree significantly, investigate assumptions.' : 'Reasonably tight range — methods converge.'}`);
                }
                items.push(`Berkus: ${fmtK(berkusResult.preMoney)} pre-money. Strongest factor: ${strongestBerkus.label} ($${berkus[strongestBerkus.key]}K). ${berkusResult.preMoney >= 2000 ? 'Near maximum ($2.5M cap) — consider Scorecard/VC for higher precision.' : `${((berkusResult.preMoney / 2500) * 100).toFixed(0)}% of $2.5M cap.`}`);
                items.push(`Scorecard: ${fmtK(scorecardResult.preMoney)} pre-money. Composite ${(scorecardComposite * 100).toFixed(0)}% of ${fmtK(scorecard.regionAvgPreMoney)} regional average. ${scorecardComposite > 1.1 ? 'Above-average startup — premium justified.' : scorecardComposite < 0.9 ? 'Below-average scores — discount applied.' : 'Near-average quality profile.'}`);
                const investorOwn = vcResult.postMoneyM > 0 ? (vc.investmentAmount / vcResult.postMoneyM * 100) : 0;
                items.push(`VC Method: ${fmtM(vcResult.preMoneyM)} pre-money (post: ${fmtM(vcResult.postMoneyM)}). Investor gets ${investorOwn.toFixed(1)}% for ${fmtM(vc.investmentAmount)} at ${vc.targetROI}x target return.`);
                const weakestBerkus = BERKUS_FACTORS.reduce((w, f) => berkus[f.key] < berkus[w.key] ? f : w, BERKUS_FACTORS[0]);
                if (berkus[weakestBerkus.key] < 200) {
                  items.push(`⚠️ Weakest area: ${weakestBerkus.label} ($${berkus[weakestBerkus.key]}K). Strengthening this could add up to $${500 - berkus[weakestBerkus.key]}K to Berkus valuation.`);
                }
                return items.map((text, i) => (
                  <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                ));
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
      
        {/* Comparison table */}
        <Card>
          <CardHeader><CardTitle>Method Comparison</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead><TableHead className="text-right">Pre-Money</TableHead>
                  <TableHead className="text-right">Pre-Money ($M)</TableHead><TableHead>Best For</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { ...berkusResult, bestFor: 'Pre-revenue, idea-stage' },
                  { ...scorecardResult, bestFor: 'Seed with some traction' },
                  { ...vcResult, bestFor: 'Any stage with exit thesis' },
                ].map(r => (
                  <TableRow key={r.method}>
                    <TableCell className="font-medium">{r.method}</TableCell>
                    <TableCell className="text-right font-mono">{r.unit === '$K' ? fmtK(r.preMoney) : fmtM(r.preMoney)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmtM(r.preMoneyM)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.bestFor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Berkus Breakdown */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" />Berkus Method — Factor Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Risk Factor</TableHead><TableHead className="text-right">Score ($K)</TableHead><TableHead className="text-right">Max ($K)</TableHead><TableHead className="text-right">% of Max</TableHead></TableRow></TableHeader>
              <TableBody>
                {BERKUS_FACTORS.map(f => (
                  <TableRow key={f.key}>
                    <TableCell className="font-medium text-sm">{f.label}</TableCell>
                    <TableCell className="text-right font-mono">${berkus[f.key]}K</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">$500K</TableCell>
                    <TableCell className="text-right font-mono">{((berkus[f.key] / 500) * 100).toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total Pre-Money</TableCell>
                  <TableCell className="text-right font-mono">{fmtK(berkusResult.preMoney)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">$2,500K</TableCell>
                  <TableCell className="text-right font-mono">{((berkusResult.preMoney / 2500) * 100).toFixed(0)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Scorecard Breakdown */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Scorecard Method — Factor Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Score</TableHead><TableHead className="text-right">Contribution</TableHead></TableRow></TableHeader>
              <TableBody>
                {SCORECARD_FACTORS.map(f => (
                  <TableRow key={f.key}>
                    <TableCell className="font-medium text-sm">{f.label}</TableCell>
                    <TableCell className="text-right font-mono">{(f.weight * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono">{scorecard[f.key]}%</TableCell>
                    <TableCell className="text-right font-mono">{(f.weight * scorecard[f.key]).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Composite</TableCell>
                  <TableCell className="text-right font-mono">100%</TableCell>
                  <TableCell className="text-right font-mono"></TableCell>
                  <TableCell className="text-right font-mono">{(scorecardComposite * 100).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow className="font-semibold text-primary">
                  <TableCell>Pre-Money ({fmtK(scorecard.regionAvgPreMoney)} × {(scorecardComposite * 100).toFixed(0)}%)</TableCell>
                  <TableCell colSpan={3} className="text-right font-mono">{fmtK(scorecardResult.preMoney)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* VC Method Breakdown */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />VC Method — Calculation Detail</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Step</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
              <TableBody>
                {[
                  ['Expected Exit Value', fmtM(vc.expectedExitValue)],
                  [`(−) Dilution Adjustment (${vc.dilutionPct}%)`, fmtM(vc.expectedExitValue * (1 - vc.dilutionPct / 100))],
                  [`(÷) Target ROI (${vc.targetROI}x)`, ''],
                  ['= Post-Money Valuation', fmtM(vcResult.postMoneyM)],
                  [`(−) Investment Amount`, fmtM(vc.investmentAmount)],
                  ['= Pre-Money Valuation', fmtM(vcResult.preMoneyM)],
                ].map(([step, val], i) => (
                  <TableRow key={i} className={i >= 3 ? 'font-semibold' : ''}>
                    <TableCell className="text-sm">{step}</TableCell>
                    <TableCell className="text-right font-mono">{val}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell className="text-sm font-medium">Investor Ownership</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{vcResult.postMoneyM > 0 ? (vc.investmentAmount / vcResult.postMoneyM * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium">Implied IRR ({vc.expectedExitYears}yr)</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{vc.expectedExitYears > 0 ? ((Math.pow(vc.targetROI, 1 / vc.expectedExitYears) - 1) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/30">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Startup Valuation — {startup.name}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Three early-stage valuation methodologies were applied to {startup.name} ({startup.stage}, {startup.sector}) to estimate a pre-money valuation range.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Berkus Method:</strong> Scoring five risk factors (idea quality, prototype, team, strategic relationships, rollout) yields a pre-money of <strong>{fmtK(berkusResult.preMoney)}</strong>. The strongest factor is {strongestBerkus.label} (${berkus[strongestBerkus.key]}K).
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Scorecard Method:</strong> Against a regional average of {fmtK(scorecard.regionAvgPreMoney)}, the composite quality score of {(scorecardComposite * 100).toFixed(1)}% yields a pre-money of <strong>{fmtK(scorecardResult.preMoney)}</strong>. {scorecardComposite > 1 ? 'The startup scores above average overall.' : scorecardComposite < 1 ? 'The startup scores below regional average.' : 'The startup matches the regional average.'}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>VC Method:</strong> Assuming an exit value of {fmtM(vc.expectedExitValue)} in {vc.expectedExitYears} years, a {vc.targetROI}x target return, and {vc.dilutionPct}% dilution, the implied pre-money is <strong>{fmtM(vcResult.preMoneyM)}</strong> (post-money: {fmtM(vcResult.postMoneyM)}).
                </p>
                {priceRange && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Across all three methods, the <strong>estimated pre-money valuation range is {fmtM(priceRange.low)} – {fmtM(priceRange.high)}</strong>, with a midpoint of <strong>{fmtM(priceRange.mid)}</strong>.
                  </p>
                )}
                <p className="text-sm leading-relaxed text-amber-600">
                  <strong>Note:</strong> Early-stage valuations are inherently subjective. These methods provide a framework for negotiation, not a definitive answer. Final valuation depends on investor appetite, market conditions, and negotiation dynamics.
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
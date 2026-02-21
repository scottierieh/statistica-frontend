'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Info, Download, Loader2,
  FileSpreadsheet, ImageIcon, ChevronDown, Plus, Trash2,
  FileText, Eye, X, ShieldAlert, Activity, BarChart3,
} from 'lucide-react';
import type { AnalysisPageProps } from '@/components/finance-analytics-app';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Sector = 'manufacturing' | 'non-manufacturing' | 'emerging';

interface CompanyInput {
  id:              string;
  name:            string;
  enabled:         boolean;
  sector:          Sector;
  // Balance sheet
  totalAssets:     string;
  totalLiabilities:string;
  currentAssets:   string;
  currentLiabilities: string;
  retainedEarnings:string;
  ebit:            string;
  marketCapEquity: string;
  bookDebt:        string;
  revenue:         string;
  workingCapital:  string; // auto or manual
  // Extra solvency
  operatingCF:     string;
  interestExpense: string;
  totalDebt:       string;
  cash:            string;
  netIncome:       string;
}

interface SolvencyResult {
  name:      string;
  sector:    Sector;
  // Altman Z
  altmanZ:   number;
  altmanZone: 'safe' | 'grey' | 'distress';
  x1: number; x2: number; x3: number; x4: number; x5: number;
  // Altman Z' (private) and Z'' (non-mfg)
  altmanZprime:   number | null;
  altmanZprimeprime: number | null;
  // Springate
  springate:  number | null;
  springateZone: 'safe' | 'distress' | null;
  // Zmijewski
  zmijewski:  number | null;
  zmijewskiProb: number | null; // probability of bankruptcy
  zmijewskiZone: 'safe' | 'distress' | null;
  // Solvency ratios
  debtToEquity:   number | null;
  debtToAssets:   number | null;
  currentRatio:   number | null;
  quickRatio:     number | null;
  interestCoverage: number | null;
  debtServiceCoverage: number | null;
  // Risk score 0-100 (higher = more risk)
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  // radar chart data
  radarData: { metric: string; value: number; fullMark: number }[];
}

// ─────────────────────────────────────────────
// Detection helper — same as other pages
// ─────────────────────────────────────────────

function detectAndNormalize(nums: number[]): number[] {
  const isPercent = nums.some(n => Math.abs(n) > 1);
  return isPercent ? nums.map(n => n / 100) : nums;
}

function g(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return isFinite(v) ? v : 0;
}

function gn(s: string): number | null {
  const v = parseFloat(s.replace(/,/g, ''));
  return isFinite(v) && s.trim() !== '' ? v : null;
}

// ─────────────────────────────────────────────
// Core computations
// ─────────────────────────────────────────────

function computeAltman(c: CompanyInput): {
  z: number; zprime: number | null; zprimeprime: number | null;
  x1: number; x2: number; x3: number; x4: number; x5: number;
  zone: 'safe' | 'grey' | 'distress';
} {
  const ta = g(c.totalAssets);
  if (ta === 0) return { z: 0, zprime: null, zprimeprime: null, x1: 0, x2: 0, x3: 0, x4: 0, x5: 0, zone: 'distress' };

  const wc = g(c.workingCapital) || (g(c.currentAssets) - g(c.currentLiabilities));
  const re = g(c.retainedEarnings);
  const ebit = g(c.ebit);
  const mce = g(c.marketCapEquity);
  const bd  = g(c.bookDebt) || g(c.totalLiabilities);
  const rev = g(c.revenue);

  const x1 = wc  / ta;
  const x2 = re  / ta;
  const x3 = ebit / ta;
  const x4 = mce / (bd || 1);
  const x5 = rev / ta;

  // Original Z (manufacturing, public)
  const z = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
  const zone: 'safe' | 'grey' | 'distress' =
    z >= 2.99 ? 'safe' : z >= 1.81 ? 'grey' : 'distress';

  // Z' (private firm — book value equity for X4)
  const bve = gn(c.marketCapEquity) ?? (ta - bd);
  const x4p  = bve / (bd || 1);
  const zprime = c.sector === 'manufacturing'
    ? (0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.420 * x4p + 0.998 * x5)
    : null;

  // Z'' (non-manufacturing / emerging)
  const zprimeprime = c.sector !== 'manufacturing'
    ? (6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4p)
    : null;

  return { z, zprime, zprimeprime, x1, x2, x3, x4, x5, zone };
}

function computeSpringate(c: CompanyInput): { score: number; zone: 'safe' | 'distress' } | null {
  const ta  = g(c.totalAssets);
  if (ta === 0) return null;
  const wc  = g(c.workingCapital) || (g(c.currentAssets) - g(c.currentLiabilities));
  const ebit = g(c.ebit);
  const ebt  = ebit - (gn(c.interestExpense) ?? 0);
  const ocf  = gn(c.operatingCF);
  const cl   = g(c.currentLiabilities);
  const rev  = g(c.revenue);
  if (ocf === null) return null;

  // S = 1.03*A + 3.07*B + 0.66*C + 0.4*D
  const A = wc  / ta;
  const B = ebit / ta;
  const C = ebt  / cl;
  const D = rev / ta;
  const score = 1.03 * A + 3.07 * B + 0.66 * C + 0.4 * D;
  return { score, zone: score >= 0.862 ? 'safe' : 'distress' };
}

function computeZmijewski(c: CompanyInput): { score: number; prob: number; zone: 'safe' | 'distress' } | null {
  const ta   = g(c.totalAssets);
  const ni   = gn(c.netIncome);
  const td   = gn(c.totalDebt) ?? g(c.totalLiabilities);
  const cl   = g(c.currentLiabilities);
  const ca   = g(c.currentAssets);
  if (ta === 0 || ni === null) return null;

  // X-score = -4.336 - 4.513*(NI/TA) + 5.679*(TL/TA) + 0.004*(CA/CL)
  const roa  = ni / ta;
  const lev  = td / ta;
  const liq  = ca / (cl || 1);
  const score = -4.336 - 4.513 * roa + 5.679 * lev + 0.004 * liq;
  const prob  = 1 / (1 + Math.exp(-score));  // logistic
  return { score, prob, zone: prob >= 0.5 ? 'distress' : 'safe' };
}

function computeRatios(c: CompanyInput) {
  const ta  = g(c.totalAssets);
  const tl  = g(c.totalLiabilities);
  const ca  = g(c.currentAssets);
  const cl  = g(c.currentLiabilities);
  const cash = gn(c.cash) ?? 0;
  const td  = gn(c.totalDebt) ?? tl;
  const ebit = g(c.ebit);
  const ie  = gn(c.interestExpense);
  const ocf  = gn(c.operatingCF);
  const equity = ta - tl;

  return {
    debtToEquity:  equity > 0 ? td / equity : null,
    debtToAssets:  ta > 0    ? td / ta       : null,
    currentRatio:  cl > 0    ? ca / cl        : null,
    quickRatio:    cl > 0    ? (ca - cash) / cl : null,
    interestCoverage: (ie && ie > 0) ? ebit / ie : null,
    debtServiceCoverage: (ocf !== null && td > 0) ? ocf / td : null,
  };
}

function computeRiskScore(
  altZ: number, zone: 'safe' | 'grey' | 'distress',
  springate: ReturnType<typeof computeSpringate>,
  zmijewski: ReturnType<typeof computeZmijewski>,
  ratios: ReturnType<typeof computeRatios>,
): { score: number; level: SolvencyResult['riskLevel'] } {
  let score = 0;

  // Altman Z (40%)
  if (zone === 'distress') score += 40;
  else if (zone === 'grey') score += 20;

  // Springate (20%)
  if (springate?.zone === 'distress') score += 20;
  else if (springate) score += 0;
  else score += 10; // missing data penalty

  // Zmijewski (20%)
  if (zmijewski?.zone === 'distress') score += 20;
  else if (zmijewski) score += 0;
  else score += 10;

  // Ratios (20%)
  if (ratios.debtToEquity !== null && ratios.debtToEquity > 3) score += 5;
  if (ratios.currentRatio !== null && ratios.currentRatio < 1) score += 5;
  if (ratios.interestCoverage !== null && ratios.interestCoverage < 1.5) score += 5;
  if (ratios.debtToAssets !== null && ratios.debtToAssets > 0.7) score += 5;

  const level: SolvencyResult['riskLevel'] =
    score >= 70 ? 'critical' :
    score >= 50 ? 'high' :
    score >= 30 ? 'elevated' :
    score >= 15 ? 'moderate' : 'low';

  return { score: Math.min(100, score), level };
}

function computeResult(c: CompanyInput): SolvencyResult | null {
  const ta = g(c.totalAssets);
  if (ta === 0) return null;

  const altman   = computeAltman(c);
  const springate = computeSpringate(c);
  const zmijewski = computeZmijewski(c);
  const ratios   = computeRatios(c);
  const { score, level } = computeRiskScore(altman.z, altman.zone, springate, zmijewski, ratios);

  // Radar: normalize each ratio to 0-100 risk scale (higher = more risky)
  // Risk radar: piecewise linear scale — safe companies score 10-35, distress 60-95
  // Ensures the radar is always visually meaningful regardless of company quality
  const clamp = (v: number) => Math.max(5, Math.min(95, v));

  // Altman Z → risk: Safe(≥2.99)=10-30, Grey(1.81-2.99)=30-65, Distress(<1.81)=65-95
  const zRisk = altman.z >= 2.99
    ? clamp(30 - ((altman.z - 2.99) / 2) * 20)
    : altman.z >= 1.81
    ? clamp(30 + ((2.99 - altman.z) / (2.99 - 1.81)) * 35)
    : clamp(65 + ((1.81 - altman.z) / 1.81) * 30);

  // D/E: ≤0.5→15, 1→35, 2→60, 3→80, ≥5→95
  const deRisk = ratios.debtToEquity === null ? 50
    : clamp(ratios.debtToEquity <= 0.5 ? 15
    : ratios.debtToEquity <= 1   ? 15 + ((ratios.debtToEquity - 0.5) / 0.5) * 20
    : ratios.debtToEquity <= 2   ? 35 + ((ratios.debtToEquity - 1)   / 1)   * 25
    : ratios.debtToEquity <= 3   ? 60 + ((ratios.debtToEquity - 2)   / 1)   * 20
    :                              80 + ((ratios.debtToEquity - 3)   / 2)   * 15);

  // Liquidity (current ratio): ≥2→10, 1.5→25, 1→55, 0.5→80, ≤0→95
  const liqRisk = ratios.currentRatio === null ? 50
    : clamp(ratios.currentRatio >= 2   ? 10
    : ratios.currentRatio >= 1.5 ? 10  + ((2   - ratios.currentRatio) / 0.5) * 15
    : ratios.currentRatio >= 1   ? 25  + ((1.5 - ratios.currentRatio) / 0.5) * 30
    : ratios.currentRatio >= 0.5 ? 55  + ((1   - ratios.currentRatio) / 0.5) * 25
    :                              80  + (0.5 - Math.max(0, ratios.currentRatio)) * 30);

  // Interest coverage: ≥5→10, 3→30, 1.5→60, 1→80, ≤0→95
  const icRisk = ratios.interestCoverage === null ? 40
    : clamp(ratios.interestCoverage >= 5   ? 10
    : ratios.interestCoverage >= 3   ? 10  + ((5   - ratios.interestCoverage) / 2)   * 20
    : ratios.interestCoverage >= 1.5 ? 30  + ((3   - ratios.interestCoverage) / 1.5) * 30
    : ratios.interestCoverage >= 1   ? 60  + ((1.5 - ratios.interestCoverage) / 0.5) * 20
    :                                  80  + (1 - Math.max(0, ratios.interestCoverage)) * 15);

  // Leverage (D/A): ≤0.3→10, 0.5→30, 0.7→65, 0.85→85, ≥1→95
  const levRisk = ratios.debtToAssets === null ? 50
    : clamp(ratios.debtToAssets <= 0.3  ? 10
    : ratios.debtToAssets <= 0.5  ? 10 + ((ratios.debtToAssets - 0.3)  / 0.2) * 20
    : ratios.debtToAssets <= 0.7  ? 30 + ((ratios.debtToAssets - 0.5)  / 0.2) * 35
    : ratios.debtToAssets <= 0.85 ? 65 + ((ratios.debtToAssets - 0.7)  / 0.15) * 20
    :                               85 + ((ratios.debtToAssets - 0.85) / 0.15) * 10);

  // Springate S: ≥1.5→10, 0.862(thresh)→50, 0→75, ≤-0.5→90
  const spRisk = springate === null ? 50
    : clamp(springate.score >= 1.5   ? 10
    : springate.score >= 0.862 ? 10  + ((1.5   - springate.score) / (1.5 - 0.862)) * 40
    : springate.score >= 0     ? 50  + ((0.862 - springate.score) / 0.862)          * 25
    :                            75  + (Math.min(0.5, -springate.score) / 0.5)      * 15);

  const radarData = [
    { metric: 'Altman Z',     value: Math.round(zRisk),   fullMark: 100 },
    { metric: 'D/E Ratio',    value: Math.round(deRisk),  fullMark: 100 },
    { metric: 'Liquidity',    value: Math.round(liqRisk), fullMark: 100 },
    { metric: 'Int. Coverage',value: Math.round(icRisk),  fullMark: 100 },
    { metric: 'Leverage',     value: Math.round(levRisk), fullMark: 100 },
    { metric: 'Springate',    value: Math.round(spRisk),  fullMark: 100 },
  ];

  return {
    name: c.name,
    sector: c.sector,
    altmanZ: altman.z,
    altmanZone: altman.zone,
    x1: altman.x1, x2: altman.x2, x3: altman.x3,
    x4: altman.x4, x5: altman.x5,
    altmanZprime: altman.zprime,
    altmanZprimeprime: altman.zprimeprime,
    springate:     springate?.score ?? null,
    springateZone: springate?.zone ?? null,
    zmijewski:     zmijewski?.score ?? null,
    zmijewskiProb: zmijewski?.prob ?? null,
    zmijewskiZone: zmijewski?.zone ?? null,
    ...ratios,
    riskScore: score,
    riskLevel: level,
    radarData,
  };
}

// ─────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────

function fNum(n: number | null, d = 2): string {
  if (n === null) return '—';
  return n.toFixed(d);
}
function fPct(n: number | null, d = 1): string {
  if (n === null) return '—';
  return `${(n * 100).toFixed(d)}%`;
}

function riskColor(level: SolvencyResult['riskLevel']): string {
  if (level === 'critical')  return 'text-slate-800';
  if (level === 'high')      return 'text-slate-700';
  if (level === 'elevated')  return 'text-slate-600';
  if (level === 'moderate')  return 'text-slate-500';
  return 'text-slate-400';
}

function riskBadge(level: SolvencyResult['riskLevel']): string {
  if (level === 'critical')  return 'text-slate-800 font-bold';
  if (level === 'high')      return 'text-slate-700';
  if (level === 'elevated')  return 'text-slate-600';
  if (level === 'moderate')  return 'text-slate-500';
  return 'text-slate-400';
}

function zoneBadge(zone: 'safe' | 'grey' | 'distress' | null): string {
  if (zone === 'safe')     return 'text-primary';
  if (zone === 'grey')     return 'text-slate-500';
  if (zone === 'distress') return 'text-slate-700 font-semibold';
  return 'text-slate-400';
}

function zoneLabel(zone: 'safe' | 'grey' | 'distress' | null): string {
  if (zone === 'safe')     return 'Safe Zone';
  if (zone === 'grey')     return 'Grey Zone';
  if (zone === 'distress') return 'Distress Zone';
  return '—';
}

const PALETTE = ['#6C3AED','#10B981','#F59E0B','#3B82F6','#8B5CF6','#06B6D4','#EC4899','#84CC16'];

// ─────────────────────────────────────────────
// Default demo data
// ─────────────────────────────────────────────

function defaultCompanies(): CompanyInput[] {
  return [
    {
      id: '1', name: 'HealthyCorp', enabled: true, sector: 'manufacturing',
      totalAssets: '500000', totalLiabilities: '180000',
      currentAssets: '120000', currentLiabilities: '60000',
      retainedEarnings: '95000', ebit: '62000',
      marketCapEquity: '420000', bookDebt: '180000',
      revenue: '380000', workingCapital: '60000',
      operatingCF: '55000', interestExpense: '8000',
      totalDebt: '180000', cash: '35000', netIncome: '44000',
    },
    {
      id: '2', name: 'GreyCorp', enabled: true, sector: 'manufacturing',
      totalAssets: '320000', totalLiabilities: '240000',
      currentAssets: '70000', currentLiabilities: '65000',
      retainedEarnings: '12000', ebit: '18000',
      marketCapEquity: '95000', bookDebt: '240000',
      revenue: '210000', workingCapital: '5000',
      operatingCF: '14000', interestExpense: '22000',
      totalDebt: '240000', cash: '12000', netIncome: '4000',
    },
    {
      id: '3', name: 'DistressCorp', enabled: true, sector: 'non-manufacturing',
      totalAssets: '200000', totalLiabilities: '195000',
      currentAssets: '30000', currentLiabilities: '80000',
      retainedEarnings: '-45000', ebit: '-12000',
      marketCapEquity: '18000', bookDebt: '195000',
      revenue: '95000', workingCapital: '-50000',
      operatingCF: '-8000', interestExpense: '28000',
      totalDebt: '195000', cash: '5000', netIncome: '-22000',
    },
    {
      id: '4', name: 'GrowthCo', enabled: true, sector: 'non-manufacturing',
      totalAssets: '750000', totalLiabilities: '310000',
      currentAssets: '200000', currentLiabilities: '85000',
      retainedEarnings: '140000', ebit: '95000',
      marketCapEquity: '680000', bookDebt: '310000',
      revenue: '620000', workingCapital: '115000',
      operatingCF: '88000', interestExpense: '18000',
      totalDebt: '310000', cash: '70000', netIncome: '62000',
    },
  ];
}

function generateExampleCSV(): Record<string, any>[] {
  return defaultCompanies().map(c => ({
    company:           c.name,
    sector:            c.sector,
    total_assets:      c.totalAssets,
    total_liabilities: c.totalLiabilities,
    current_assets:    c.currentAssets,
    current_liabilities: c.currentLiabilities,
    retained_earnings: c.retainedEarnings,
    ebit:              c.ebit,
    market_cap_equity: c.marketCapEquity,
    book_debt:         c.bookDebt,
    revenue:           c.revenue,
    working_capital:   c.workingCapital,
    operating_cf:      c.operatingCF,
    interest_expense:  c.interestExpense,
    total_debt:        c.totalDebt,
    cash:              c.cash,
    net_income:        c.netIncome,
  }));
}

// ─────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[170px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-3">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const RadarTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{payload[0]?.payload?.metric}</p>
      <p className="text-slate-500">Risk index: <span className="font-mono font-semibold">{payload[0]?.value?.toFixed(1)}/100</span></p>
    </div>
  );
};

// ─────────────────────────────────────────────
// Intro Page
// ─────────────────────────────────────────────

const IntroPage = ({ onLoadExample, onManualEntry }: {
  onLoadExample: () => void;
  onManualEntry: () => void;
}) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Bankruptcy & Solvency Alert</CardTitle>
        <CardDescription className="text-base mt-2">
          Detect early distress signals using Altman Z-Score, Springate S-Score, and Zmijewski X-Score — with comprehensive solvency ratio analysis and a composite risk alert
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <ShieldAlert className="w-6 h-6 text-primary mb-2" />,
              title: 'Altman Z-Score',
              desc: 'The classic bankruptcy prediction model (1968). Z = 1.2X₁ + 1.4X₂ + 3.3X₃ + 0.6X₄ + 1.0X₅. Z < 1.81 = Distress, 1.81–2.99 = Grey, ≥ 2.99 = Safe. Also computes Z\' (private) and Z\'\' (non-mfg).',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Springate & Zmijewski',
              desc: 'Springate S-Score (1978): includes operating cash flow, threshold 0.862. Zmijewski X-Score (1984): logit model using ROA, leverage, and liquidity — outputs probability of bankruptcy.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />,
              title: 'Solvency Ratios',
              desc: 'D/E, D/A, Current Ratio, Quick Ratio, Interest Coverage, Debt Service Coverage — analyzed alongside the scoring models to triangulate financial distress risk.',
            },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Safe Zone',     cls: 'bg-emerald-100 text-emerald-700', desc: 'Z ≥ 2.99' },
            { label: 'Grey Zone',     cls: 'bg-amber-100 text-amber-700',     desc: '1.81 ≤ Z < 2.99' },
            { label: 'Distress Zone', cls: 'bg-slate-200 text-slate-700',     desc: 'Z < 1.81' },
            { label: 'Critical',      cls: 'bg-slate-800 text-white',         desc: 'Multiple model alerts' },
          ].map(({ label, cls, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
              <div className="text-xs text-muted-foreground mt-1.5 font-mono">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />Required Inputs</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {[
                'Total Assets, Total Liabilities',
                'Current Assets, Current Liabilities',
                'Retained Earnings, EBIT',
                'Market Cap (or Book) Equity',
                'Revenue / Net Sales',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {[
                'Operating Cash Flow (for Springate)',
                'Net Income (for Zmijewski)',
                'Interest Expense (for coverage ratios)',
                'Total Debt, Cash',
                'Sector: Manufacturing / Non-manufacturing',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onLoadExample} size="lg">
            <ShieldAlert className="mr-2 h-5 w-5" />Load Example Data
          </Button>
          <Button onClick={onManualEntry} size="lg" variant="outline">
            <Plus className="mr-2 h-5 w-5" />Manual Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ─────────────────────────────────────────────
// Input Row Component
// ─────────────────────────────────────────────

const FIELDS: { key: keyof CompanyInput; label: string; placeholder: string }[] = [
  { key: 'totalAssets',       label: 'Total Assets',        placeholder: '500000' },
  { key: 'totalLiabilities',  label: 'Total Liabilities',   placeholder: '180000' },
  { key: 'currentAssets',     label: 'Current Assets',      placeholder: '120000' },
  { key: 'currentLiabilities',label: 'Current Liab.',       placeholder: '60000'  },
  { key: 'retainedEarnings',  label: 'Retained Earnings',   placeholder: '95000'  },
  { key: 'ebit',              label: 'EBIT',                 placeholder: '62000'  },
  { key: 'marketCapEquity',   label: 'Mkt Cap / BV Equity', placeholder: '420000' },
  { key: 'revenue',           label: 'Revenue',             placeholder: '380000' },
  { key: 'operatingCF',       label: 'Operating CF',        placeholder: '55000'  },
  { key: 'interestExpense',   label: 'Interest Expense',    placeholder: '8000'   },
  { key: 'totalDebt',         label: 'Total Debt',          placeholder: '180000' },
  { key: 'cash',              label: 'Cash',                placeholder: '35000'  },
  { key: 'netIncome',         label: 'Net Income',          placeholder: '44000'  },
];

// ─────────────────────────────────────────────
// CSV column auto-map
// ─────────────────────────────────────────────

function autoMapCol(headers: string[], keywords: string[]): string {
  const hl = headers.map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
  const kl = keywords.map(k => k.toLowerCase().replace(/[\s_-]/g, ''));
  const idx = hl.findIndex(h => kl.some(k => h === k || h.includes(k)));
  return idx !== -1 ? headers[idx] : '';
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function BankruptcySolvencyPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,   setHasStarted]   = useState(false);
  const [inputMode,    setInputMode]    = useState<'manual' | 'csv'>('manual');
  const [companies,    setCompanies]    = useState<CompanyInput[]>(defaultCompanies());
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [isDownloading,setIsDownloading]= useState(false);
  const [activeIdx,    setActiveIdx]    = useState(0);

  // CSV column mapping
  const [colCompany,   setColCompany]   = useState('');
  const [colSector,    setColSector]    = useState('');
  const [colTA,        setColTA]        = useState('');
  const [colTL,        setColTL]        = useState('');
  const [colCA,        setColCA]        = useState('');
  const [colCL,        setColCL]        = useState('');
  const [colRE,        setColRE]        = useState('');
  const [colEBIT,      setColEBIT]      = useState('');
  const [colMCE,       setColMCE]       = useState('');
  const [colRev,       setColRev]       = useState('');
  const [colOCF,       setColOCF]       = useState('');
  const [colIE,        setColIE]        = useState('');
  const [colTD,        setColTD]        = useState('');
  const [colCash,      setColCash]      = useState('');
  const [colNI,        setColNI]        = useState('');

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_solvency.csv');
    setInputMode('csv');
    setHasStarted(true);
    setColCompany('company');   setColSector('sector');
    setColTA('total_assets');   setColTL('total_liabilities');
    setColCA('current_assets'); setColCL('current_liabilities');
    setColRE('retained_earnings'); setColEBIT('ebit');
    setColMCE('market_cap_equity'); setColRev('revenue');
    setColOCF('operating_cf');  setColIE('interest_expense');
    setColTD('total_debt');     setColCash('cash');
    setColNI('net_income');
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
    setActiveIdx(0);
    setColCompany(''); setColSector(''); setColTA(''); setColTL('');
    setColCA(''); setColCL(''); setColRE(''); setColEBIT('');
    setColMCE(''); setColRev(''); setColOCF(''); setColIE('');
    setColTD(''); setColCash(''); setColNI('');
  }, [onClearData]);

  // ── Auto-detect CSV columns ───────────────────────────────
  useMemo(() => {
    if (!hasData || colTA) return;
    setColCompany(autoMapCol(allHeaders, ['company','ticker','name','firm']));
    setColSector(autoMapCol(allHeaders,  ['sector','industry','type']));
    setColTA(autoMapCol(allHeaders,      ['totalassets','total_assets','assets']));
    setColTL(autoMapCol(allHeaders,      ['totalliabilities','total_liabilities','liabilities']));
    setColCA(autoMapCol(allHeaders,      ['currentassets','current_assets']));
    setColCL(autoMapCol(allHeaders,      ['currentliabilities','current_liabilities','currentliab']));
    setColRE(autoMapCol(allHeaders,      ['retainedearnings','retained_earnings','re']));
    setColEBIT(autoMapCol(allHeaders,    ['ebit']));
    setColMCE(autoMapCol(allHeaders,     ['marketcap','market_cap','market_cap_equity','equity','bvequity']));
    setColRev(autoMapCol(allHeaders,     ['revenue','sales','netsales']));
    setColOCF(autoMapCol(allHeaders,     ['operatingcf','operating_cf','operatingcashflow','ocf']));
    setColIE(autoMapCol(allHeaders,      ['interestexpense','interest_expense','interest']));
    setColTD(autoMapCol(allHeaders,      ['totaldebt','total_debt','debt']));
    setColCash(autoMapCol(allHeaders,    ['cash']));
    setColNI(autoMapCol(allHeaders,      ['netincome','net_income','ni']));
  }, [hasData, allHeaders, colTA]);

  // ── Build inputs from CSV ──────────────────────────────────
  const csvCompanies = useMemo((): CompanyInput[] => {
    if (!hasData || !colTA) return [];
    return data.map((r, i) => {
      const sv = (k: string) => k ? String(r[k] ?? '') : '';
      const sector = sv(colSector).toLowerCase().includes('non') ? 'non-manufacturing'
        : sv(colSector).toLowerCase().includes('emerg') ? 'emerging'
        : 'manufacturing';
      return {
        id:              String(i),
        name:            sv(colCompany) || `Company ${i + 1}`,
        enabled:         true,
        sector,
        totalAssets:     sv(colTA),
        totalLiabilities:sv(colTL),
        currentAssets:   sv(colCA),
        currentLiabilities: sv(colCL),
        retainedEarnings:sv(colRE),
        ebit:            sv(colEBIT),
        marketCapEquity: sv(colMCE),
        bookDebt:        sv(colTD) || sv(colTL),
        revenue:         sv(colRev),
        workingCapital:  '',
        operatingCF:     sv(colOCF),
        interestExpense: sv(colIE),
        totalDebt:       sv(colTD),
        cash:            sv(colCash),
        netIncome:       sv(colNI),
      };
    });
  }, [hasData, data, colTA, colTL, colCA, colCL, colRE, colEBIT,
      colMCE, colRev, colOCF, colIE, colTD, colCash, colNI, colCompany, colSector]);

  const activeInputs = inputMode === 'csv' ? csvCompanies : companies.filter(c => c.enabled);

  // ── Compute results ───────────────────────────────────────
  const results = useMemo<SolvencyResult[]>(() =>
    activeInputs.map(computeResult).filter((r): r is SolvencyResult => r !== null),
    [activeInputs]
  );

  const isConfigured = results.length > 0;
  const active       = results[Math.min(activeIdx, results.length - 1)] ?? null;
  const isExample    = (fileName ?? '').startsWith('example_');

  // Sorted by risk score descending
  const ranked = useMemo(() =>
    [...results].sort((a, b) => b.riskScore - a.riskScore),
    [results]
  );

  // Bar chart: Altman Z comparison
  const zBarData = useMemo(() =>
    [...results].sort((a, b) => a.altmanZ - b.altmanZ).map(r => ({
      name:    r.name,
      z:       parseFloat(r.altmanZ.toFixed(3)),
      idx:     results.indexOf(r),
    })),
    [results]
  );

  // Risk score bar
  const riskBarData = useMemo(() =>
    [...results].sort((a, b) => b.riskScore - a.riskScore).map(r => ({
      name:  r.name,
      score: r.riskScore,
      idx:   results.indexOf(r),
    })),
    [results]
  );

  // ── Manual handlers ───────────────────────────────────────
  const handleChange = useCallback((id: string, field: keyof CompanyInput, val: string) => {
    setCompanies(prev => prev.map(c => c.id !== id ? c : { ...c, [field]: val }));
  }, []);
  const handleAddCompany = useCallback(() => {
    setCompanies(prev => [...prev, {
      id: String(Date.now()), name: `Company ${prev.length + 1}`, enabled: true,
      sector: 'manufacturing',
      totalAssets: '', totalLiabilities: '', currentAssets: '', currentLiabilities: '',
      retainedEarnings: '', ebit: '', marketCapEquity: '', bookDebt: '',
      revenue: '', workingCapital: '', operatingCF: '', interestExpense: '',
      totalDebt: '', cash: '', netIncome: '',
    }]);
  }, []);
  const handleDeleteCompany = useCallback((id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    setActiveIdx(0);
  }, []);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = ranked.map(r => ({
      company:          r.name,
      risk_level:       r.riskLevel,
      risk_score:       r.riskScore,
      altman_z:         fNum(r.altmanZ),
      altman_zone:      r.altmanZone,
      springate:        fNum(r.springate),
      springate_zone:   r.springateZone ?? '—',
      zmijewski_prob:   fPct(r.zmijewskiProb),
      zmijewski_zone:   r.zmijewskiZone ?? '—',
      debt_to_equity:   fNum(r.debtToEquity),
      debt_to_assets:   fNum(r.debtToAssets),
      current_ratio:    fNum(r.currentRatio),
      interest_coverage:fNum(r.interestCoverage),
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Solvency_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, ranked, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image…' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Solvency_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Intro gate ────────────────────────────────────────────
  if (!hasData && !hasStarted) return (
    <IntroPage onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }} />
  );

  // CSV column selector rows
  const colPairs: { label: string; value: string; setter: (v: string) => void }[] = [
    { label: 'Company/Ticker', value: colCompany, setter: setColCompany },
    { label: 'Sector',         value: colSector,  setter: setColSector  },
    { label: 'Total Assets',   value: colTA,      setter: setColTA      },
    { label: 'Total Liab.',    value: colTL,      setter: setColTL      },
    { label: 'Current Assets', value: colCA,      setter: setColCA      },
    { label: 'Current Liab.',  value: colCL,      setter: setColCL      },
    { label: 'Retained Earnings',value: colRE,    setter: setColRE      },
    { label: 'EBIT',           value: colEBIT,    setter: setColEBIT    },
    { label: 'Mkt/BV Equity',  value: colMCE,     setter: setColMCE     },
    { label: 'Revenue',        value: colRev,     setter: setColRev     },
    { label: 'Operating CF',   value: colOCF,     setter: setColOCF     },
    { label: 'Interest Exp.',  value: colIE,      setter: setColIE      },
    { label: 'Total Debt',     value: colTD,      setter: setColTD      },
    { label: 'Cash',           value: colCash,    setter: setColCash    },
    { label: 'Net Income',     value: colNI,      setter: setColNI      },
  ];

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-4">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">
            {hasData ? (fileName || 'Uploaded file') : 'Manual Entry'}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {isConfigured
              ? `${results.length} compan${results.length !== 1 ? 'ies' : 'y'} analysed`
              : hasData ? `${data.length} rows` : `${companies.filter(c=>c.enabled).length} companies`}
          </span>
          {isExample && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
          )}
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' }));
                link.download = (fileName || 'data').replace(/\.csv$/, '') + '_raw.csv';
                link.click();
                toast({ title: 'Raw data downloaded' });
              }} title="Download raw CSV">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={handleClearAll}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {hasData && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" />{fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-auto flex-1 min-h-0 rounded-md border border-slate-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b">
                    {allHeaders.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50/50">
                      {allHeaders.map(h => <td key={h} className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">{String(row[h] ?? '-')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 4</span>
            <span className="text-xs text-muted-foreground">Risk Management</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />Bankruptcy & Solvency Alert
          </CardTitle>
          <CardDescription>
            Multi-model financial distress detection using Altman Z-Score (Z, Z', Z''), Springate S-Score, and Zmijewski X-Score with solvency ratio analysis and a composite risk alert.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Input ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription className="mt-0.5">
                {inputMode === 'csv' ? 'Map CSV columns to financial statement items.' : 'Enter balance sheet and income statement figures per company.'}
              </CardDescription>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant={inputMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setInputMode('manual')}>Manual</Button>
              {hasData
                ? <Button size="sm" variant={inputMode === 'csv' ? 'default' : 'outline'}
                    onClick={() => setInputMode('csv')}>CSV</Button>
                : <Button size="sm" variant="outline" onClick={handleLoadExample}>Load Example</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* CSV Mode */}
          {inputMode === 'csv' && hasData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {colPairs.map(({ label, value, setter }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <select className="w-full text-xs h-8 border border-slate-200 rounded px-2 bg-white"
                    value={value}
                    onChange={e => setter(e.target.value)}>
                    <option value="">— None —</option>
                    {allHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Manual Mode */}
          {inputMode === 'manual' && (
            <div className="space-y-4">
              {companies.filter(c => c.enabled || true).map(c => (
                <div key={c.id} className={`rounded-lg border p-4 space-y-3 ${!c.enabled ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input type="checkbox" checked={c.enabled}
                      onChange={e => setCompanies(prev => prev.map(x => x.id !== c.id ? x : { ...x, enabled: e.target.checked }))}
                      className="w-4 h-4 accent-primary" />
                    <Input className="h-7 text-xs font-semibold w-36"
                      value={c.name} onChange={e => handleChange(c.id, 'name', e.target.value)}
                      placeholder="Company name" />
                    <select className="text-xs h-7 border border-slate-200 rounded px-2 bg-white"
                      value={c.sector}
                      onChange={e => handleChange(c.id, 'sector', e.target.value as Sector)}>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="non-manufacturing">Non-manufacturing</option>
                      <option value="emerging">Emerging Market</option>
                    </select>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600 ml-auto"
                      onClick={() => handleDeleteCompany(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {FIELDS.map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground leading-tight">{label}</Label>
                        <Input className="h-7 text-xs font-mono"
                          value={c[key] as string}
                          onChange={e => handleChange(c.id, key, e.target.value)}
                          placeholder={placeholder} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddCompany}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Company
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Controls + Export ── */}
      {isConfigured && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          {results.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Detail view</Label>
              <select className="text-xs h-8 border border-slate-200 rounded px-2 bg-white min-w-[140px]"
                value={String(activeIdx)} onChange={e => setActiveIdx(Number(e.target.value))}>
                {results.map((r, i) => <option key={i} value={String(i)}>{r.name}</option>)}
              </select>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (All Metrics)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && active && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Altman Z-Score</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fNum(active.altmanZ)}</div>
            <div className="mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${zoneBadge(active.altmanZone)}`}>
                {zoneLabel(active.altmanZone)}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Composite Risk Score</div>
            <div className={`text-2xl font-bold font-mono ${riskColor(active.riskLevel)}`}>
              {active.riskScore}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <div className="mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold capitalize ${riskBadge(active.riskLevel)}`}>
                {active.riskLevel}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bankruptcy Probability</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.zmijewskiProb !== null ? fPct(active.zmijewskiProb) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">Zmijewski X-Score model</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Interest Coverage</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.interestCoverage !== null ? fNum(active.interestCoverage) : '—'}
              <span className="text-sm font-normal text-muted-foreground">×</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              D/E: {fNum(active.debtToEquity)} · D/A: {fNum(active.debtToAssets)}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Risk Ranking ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Composite Risk Score Ranking</CardTitle>
              <CardDescription>Higher score = higher distress risk · Ranked worst to best</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {riskBarData.map((d, i) => {
                  const r = results[d.idx];
                  const band = riskBadge(r.riskLevel);
                  return (
                    <div key={d.name} className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setActiveIdx(d.idx)}>
                      <div className="w-5 text-xs font-bold text-muted-foreground text-right shrink-0">#{i+1}</div>
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[d.idx % PALETTE.length] }} />
                        <span className="text-xs font-semibold text-slate-700 truncate">{d.name}</span>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full bg-slate-600 transition-all"
                          style={{ width: `${d.score}%`, backgroundColor: PALETTE[d.idx % PALETTE.length] }} />
                      </div>
                      <div className="w-8 text-right text-xs font-mono font-semibold text-slate-700">{d.score}</div>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize shrink-0 ${band}`}>
                        {r.riskLevel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Altman Z Comparison ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Altman Z-Score Comparison</CardTitle>
              <CardDescription>Distress &lt; 1.81 · Grey 1.81–2.99 · Safe ≥ 2.99</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, zBarData.length * 52)}>
                <BarChart data={zBarData} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.toFixed(1)} />
                  <YAxis type="category" dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<BarTip />} />
                  <ReferenceLine x={1.81} stroke="#F59E0B" strokeDasharray="4 2" strokeWidth={1.5}
                    label={{ value: '1.81', position: 'top', fontSize: 9, fill: '#F59E0B' }} />
                  <ReferenceLine x={2.99} stroke="#10B981" strokeDasharray="4 2" strokeWidth={1.5}
                    label={{ value: '2.99', position: 'top', fontSize: 9, fill: '#10B981' }} />
                  <Bar dataKey="z" name="Altman Z" maxBarSize={24} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="z" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => v.toFixed(2)} />
                    {zBarData.map((d) => (
                      <Cell key={d.name} fill={PALETTE[d.idx % PALETTE.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Detail: Radar + Z decomposition ── */}
        {isConfigured && active && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Radar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Risk Radar — {active.name}</CardTitle>
                <CardDescription>Higher = more risk on each dimension</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={active.radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]}
                      tick={{ fontSize: 8, fill: '#94A3B8' }} tickCount={4} />
                    <Tooltip content={<RadarTip />} />
                    <Radar dataKey="value" name="Risk Index"
                      stroke={PALETTE[activeIdx % PALETTE.length]}
                      fill={PALETTE[activeIdx % PALETTE.length]}
                      fillOpacity={0.18} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Altman X decomposition */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Altman Z Components — {active.name}</CardTitle>
                <CardDescription>X₁ WC/TA · X₂ RE/TA · X₃ EBIT/TA · X₄ MCE/BD · X₅ Rev/TA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5 mt-2">
                  {[
                    { label: 'X₁ Working Capital / Total Assets',        weight: 1.2,  value: active.x1 },
                    { label: 'X₂ Retained Earnings / Total Assets',      weight: 1.4,  value: active.x2 },
                    { label: 'X₃ EBIT / Total Assets',                   weight: 3.3,  value: active.x3 },
                    { label: 'X₄ Market Cap / Book Debt',                weight: 0.6,  value: active.x4 },
                    { label: 'X₅ Revenue / Total Assets',                weight: 1.0,  value: active.x5 },
                  ].map(({ label, weight, value }) => {
                    const contribution = weight * value;
                    const barW = Math.min(100, Math.max(0, (value + 1) / 3 * 100));
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <div className="flex gap-3 shrink-0 ml-2">
                            <span className="font-mono text-slate-600">{value.toFixed(3)}</span>
                            <span className="font-mono font-semibold text-slate-700 w-14 text-right">
                              ×{weight} = {contribution.toFixed(3)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${barW}%`, backgroundColor: PALETTE[activeIdx % PALETTE.length] }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-100 pt-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">Altman Z-Score</span>
                    <span className="font-mono text-slate-800 text-sm">{fNum(active.altmanZ)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Full Comparison Table ── */}
        {isConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Full Solvency Metrics
              </CardTitle>
              <CardDescription>All models and ratios · Click row to switch detail view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Company','Risk','Score','Altman Z','Zone','Springate','Spring. Zone',
                        'Zmijewski P','Zmij. Zone','D/E','D/A','Current','Int. Cov.'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r, i) => {
                      const ri = results.indexOf(r);
                      return (
                        <tr key={i}
                          className={`border-t hover:bg-slate-50/50 cursor-pointer ${ri === activeIdx ? 'bg-primary/5' : ''}`}
                          onClick={() => setActiveIdx(ri)}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[ri % PALETTE.length] }} />
                              <span className="font-semibold text-slate-700">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold capitalize ${riskBadge(r.riskLevel)}`}>{r.riskLevel}</span>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{r.riskScore}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fNum(r.altmanZ)}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${zoneBadge(r.altmanZone)}`}>{zoneLabel(r.altmanZone)}</span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.springate)}</td>
                          <td className="px-3 py-2">
                            {r.springateZone
                              ? <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${r.springateZone === 'safe' ? 'text-primary' : 'text-slate-600'}`}>
                                  {r.springateZone === 'safe' ? 'Safe' : 'Distress'}
                                </span>
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.zmijewskiProb)}</td>
                          <td className="px-3 py-2">
                            {r.zmijewskiZone
                              ? <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${r.zmijewskiZone === 'safe' ? 'text-primary' : 'text-slate-600'}`}>
                                  {r.zmijewskiZone === 'safe' ? 'Safe' : 'Distress'}
                                </span>
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.debtToEquity)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.debtToAssets)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.currentRatio)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fNum(r.interestCoverage)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && active && (() => {
          const modelsAgree = [
            active.altmanZone === 'distress',
            active.springateZone === 'distress',
            active.zmijewskiZone === 'distress',
          ].filter(Boolean).length;

          const criticalFlags: string[] = [];
          if (active.altmanZone === 'distress') criticalFlags.push('Altman Z in distress zone');
          if (active.springateZone === 'distress') criticalFlags.push('Springate S below 0.862');
          if (active.zmijewskiZone === 'distress') criticalFlags.push(`Zmijewski P(bankruptcy) = ${fPct(active.zmijewskiProb)}`);
          if (active.currentRatio !== null && active.currentRatio < 1) criticalFlags.push('Current ratio < 1.0');
          if (active.interestCoverage !== null && active.interestCoverage < 1.5) criticalFlags.push('Interest coverage < 1.5×');
          if (active.debtToAssets !== null && active.debtToAssets > 0.8) criticalFlags.push('Debt/Assets > 80%');

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>
                  Auto-generated solvency analysis · {active.name} · {active.sector}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Alert banner */}
                <div className={`rounded-lg border p-4 ${
                  active.riskLevel === 'critical' ? 'border-slate-400 bg-slate-100' :
                  active.riskLevel === 'high'     ? 'border-slate-300 bg-slate-50' :
                  active.riskLevel === 'elevated' ? 'border-amber-200 bg-amber-50' :
                  'border-emerald-200 bg-emerald-50/50'
                }`}>
                  <div className="flex items-start gap-3">
                    {active.riskLevel === 'critical' || active.riskLevel === 'high'
                      ? <AlertTriangle className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
                      : active.riskLevel === 'elevated'
                      ? <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      : <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">
                        {active.riskLevel === 'critical' ? '⚠ Critical — Multiple distress signals detected' :
                         active.riskLevel === 'high'     ? 'High Risk — Significant solvency concerns' :
                         active.riskLevel === 'elevated' ? 'Elevated Risk — Monitor closely' :
                         active.riskLevel === 'moderate' ? 'Moderate Risk — Some concerns present' :
                         'Low Risk — No significant distress signals'}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold">{active.name}</span> scores{' '}
                        <span className="font-semibold">{active.riskScore}/100</span> on the composite risk index.{' '}
                        {modelsAgree === 3
                          ? 'All three scoring models (Altman, Springate, Zmijewski) signal distress — high confidence bankruptcy risk.'
                          : modelsAgree === 2
                          ? 'Two of three models flag distress — the signal is meaningful and warrants immediate attention.'
                          : modelsAgree === 1
                          ? 'One model flags distress — risk is present but not confirmed across all methodologies.'
                          : 'No model flags active distress — the company appears financially stable under current conditions.'}
                      </p>
                      {criticalFlags.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {criticalFlags.map(f => (
                            <li key={f} className="text-xs text-slate-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Altman Z',     value: fNum(active.altmanZ),                 sub: zoneLabel(active.altmanZone) },
                    { label: 'Springate S',  value: fNum(active.springate),               sub: active.springateZone ? (active.springateZone === 'safe' ? 'Safe' : 'Distress') : '—' },
                    { label: 'P(Bankruptcy)',value: fPct(active.zmijewskiProb),            sub: 'Zmijewski model' },
                    { label: 'Current Ratio',value: fNum(active.currentRatio),            sub: active.currentRatio !== null && active.currentRatio < 1 ? '⚠ Below 1.0' : 'Adequate' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-base font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model Analysis</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Altman Z-Score ({fNum(active.altmanZ)})</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {active.altmanZone === 'safe'
                          ? `Z = ${fNum(active.altmanZ)} — well above the 2.99 safe threshold. The company demonstrates healthy working capital, profitability, and leverage relative to assets.`
                          : active.altmanZone === 'grey'
                          ? `Z = ${fNum(active.altmanZ)} — in the grey zone (1.81–2.99). The model cannot clearly classify the company as safe or distressed. Heightened monitoring is warranted.`
                          : `Z = ${fNum(active.altmanZ)} — below the 1.81 distress threshold. Altman's original research found ~72% accuracy for one-year bankruptcy prediction at this level.`}
                        {' '}The largest component contributor is{' '}
                        {Math.abs(active.x3 * 3.3) >= Math.abs(active.x1 * 1.2) &&
                         Math.abs(active.x3 * 3.3) >= Math.abs(active.x2 * 1.4)
                          ? `X₃ (EBIT/TA = ${active.x3.toFixed(3)}, weighted contribution ${(active.x3 * 3.3).toFixed(3)})`
                          : Math.abs(active.x4 * 0.6) >= Math.abs(active.x5 * 1.0)
                          ? `X₄ (Equity/Debt = ${active.x4.toFixed(3)})`
                          : `X₅ (Revenue/TA = ${active.x5.toFixed(3)})`}.
                      </p>
                    </div>
                  </div>

                  {active.zmijewskiProb !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Zmijewski Probability ({fPct(active.zmijewskiProb)})</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The Zmijewski logistic model estimates a{' '}
                          <span className="font-semibold">{fPct(active.zmijewskiProb)}</span> probability of bankruptcy.
                          {(active.zmijewskiProb ?? 0) >= 0.5
                            ? ' A probability above 50% is the distress threshold — the model classifies this company as likely to fail within the projection horizon.'
                            : (active.zmijewskiProb ?? 0) >= 0.25
                            ? ' While below the 50% distress threshold, the probability is elevated. ROA, leverage, or liquidity are under stress.'
                            : ' The low probability indicates the company is well below the distress threshold on ROA, leverage, and liquidity dimensions.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Solvency Ratios</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Debt-to-Assets of <span className="font-semibold">{fNum(active.debtToAssets)}</span>{' '}
                        {active.debtToAssets !== null
                          ? active.debtToAssets > 0.7
                            ? '(> 0.70 — highly leveraged; limited capacity to absorb losses)'
                            : active.debtToAssets > 0.5
                            ? '(0.50–0.70 — moderate leverage, manageable under stable conditions)'
                            : '(< 0.50 — conservative leverage; strong asset coverage)'
                          : ''}.
                        {active.interestCoverage !== null && (
                          <> Interest coverage of <span className="font-semibold">{fNum(active.interestCoverage)}×</span>{' '}
                          {active.interestCoverage < 1.5
                            ? '— critically low; EBIT barely covers interest obligations. A mild earnings decline could trigger default.'
                            : active.interestCoverage < 3
                            ? '— below the 3× comfort threshold but serviceable under current conditions.'
                            : '— healthy; EBIT comfortably covers interest expense.'}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Altman Z (1968): Z = 1.2X₁ + 1.4X₂ + 3.3X₃ + 0.6X₄ + 1.0X₅. Safe ≥ 2.99, Grey 1.81–2.99, Distress &lt; 1.81.
                  Z' (private): 0.717X₁ + 0.847X₂ + 3.107X₃ + 0.420X₄ + 0.998X₅.
                  Z'' (non-mfg): 6.56X₁ + 3.26X₂ + 6.72X₃ + 1.05X₄.
                  Springate (1978): S = 1.03A + 3.07B + 0.66C + 0.4D; distress &lt; 0.862.
                  Zmijewski (1984): logit model; P = 1/(1+e^−X); distress P ≥ 0.5.
                  Composite risk score is a weighted heuristic — not a standalone investment recommendation.
                  This analysis is auto-generated and does not constitute financial or legal advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
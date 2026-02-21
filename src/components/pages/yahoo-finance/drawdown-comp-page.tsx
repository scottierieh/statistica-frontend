'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ScatterChart, Scatter,
  ZAxis, AreaChart, Area, ReferenceLine,
} from 'recharts';
import {
  Info, Download, Loader2, FileSpreadsheet, ImageIcon, ChevronDown,
  RotateCcw, BarChart3, Activity, Plus, Trash2,
  CheckCircle, FileText, Eye, X, Clock, TrendingDown,
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

interface AssetInput {
  id:      string;
  name:    string;
  enabled: boolean;
  returns: string;
}

interface DrawdownCycle {
  rank:          number;
  peakIdx:       number;
  troughIdx:     number;
  recoveryIdx:   number | null;
  drawdown:      number;          // negative fraction
  declineDur:    number;          // peak → trough
  recoveryDur:   number | null;   // trough → recovery
  totalDur:      number | null;   // peak → recovery
  recovered:     boolean;
  severity:      string;
}

interface AssetAnalysis {
  name:          string;
  returns:       number[];
  cumulative:    number[];
  ddSeries:      number[];          // drawdown at each point
  peaks:         number[];
  cycles:        DrawdownCycle[];
  mdd:           number;
  avgDecline:    number;
  avgRecovery:   number | null;
  medianRecovery: number | null;
  recoveryRate:  number;           // fraction of cycles recovered
  maxDeclineDur: number;
  maxRecoveryDur: number | null;
  durabilityScore: number;         // 0–100 composite
  totalReturn:   number;
  chartData:     { idx: number; cumRet: number; dd: number; peak: number }[];
}

// ─────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────

function detectAndNormalize(nums: number[]): number[] {
  const isPercent = nums.some(n => Math.abs(n) > 1);
  return isPercent ? nums.map(n => n / 100) : nums;
}

function parseReturns(s: string): number[] {
  const nums = s.split(/[\s,;]+/).map(v => parseFloat(v)).filter(v => isFinite(v));
  return detectAndNormalize(nums);
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function severityLabel(dd: number): string {
  const a = Math.abs(dd);
  if (a < 0.05)  return 'Minor';
  if (a < 0.15)  return 'Moderate';
  if (a < 0.30)  return 'Significant';
  if (a < 0.50)  return 'Severe';
  return 'Catastrophic';
}

function analyze(name: string, rets: number[]): AssetAnalysis {
  const n     = rets.length;
  const cumul = new Array(n + 1).fill(1);
  for (let i = 0; i < n; i++) cumul[i + 1] = cumul[i] * (1 + rets[i]);

  const peakArr = new Array(n + 1).fill(1);
  const ddArr   = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    peakArr[i] = Math.max(peakArr[i - 1], cumul[i]);
    ddArr[i]   = (cumul[i] - peakArr[i]) / peakArr[i];
  }

  // Detect drawdown cycles (peak→trough→recovery)
  const cycles: DrawdownCycle[] = [];
  let inDD = false;
  let peakI = 0, peakV = cumul[0];
  let troughI = 0, troughV = cumul[0];

  for (let i = 1; i <= n; i++) {
    if (!inDD && cumul[i] < peakArr[i]) {
      // find actual peak start
      inDD = true;
      peakI = i - 1;
      for (let j = i - 1; j >= 0; j--) {
        if (cumul[j] >= peakArr[i]) { peakI = j; break; }
      }
      peakV   = cumul[peakI];
      troughI = i; troughV = cumul[i];
    }
    if (inDD) {
      if (cumul[i] < troughV) { troughV = cumul[i]; troughI = i; }
      if (cumul[i] >= peakV) {
        inDD = false;
        const dd  = (troughV - peakV) / peakV;
        cycles.push({
          rank:        0,
          peakIdx:     peakI,
          troughIdx:   troughI,
          recoveryIdx: i,
          drawdown:    dd,
          declineDur:  troughI - peakI,
          recoveryDur: i - troughI,
          totalDur:    i - peakI,
          recovered:   true,
          severity:    severityLabel(dd),
        });
      }
    }
  }
  // Ongoing
  if (inDD) {
    const dd = (troughV - peakV) / peakV;
    cycles.push({
      rank:        0,
      peakIdx:     peakI,
      troughIdx:   troughI,
      recoveryIdx: null,
      drawdown:    dd,
      declineDur:  troughI - peakI,
      recoveryDur: null,
      totalDur:    null,
      recovered:   false,
      severity:    severityLabel(dd),
    });
  }

  // Rank by severity (deepest = rank 1)
  const sorted = [...cycles].sort((a, b) => a.drawdown - b.drawdown);
  sorted.forEach((c, i) => { c.rank = i + 1; });

  const mdd          = ddArr.reduce((m, d) => Math.min(m, d), 0);
  const declines     = cycles.map(c => c.drawdown);
  const avgDecline   = declines.length ? declines.reduce((s, d) => s + d, 0) / declines.length : 0;
  const recDurs      = cycles.filter(c => c.recoveryDur !== null).map(c => c.recoveryDur!);
  const avgRecovery  = recDurs.length ? recDurs.reduce((s, d) => s + d, 0) / recDurs.length : null;
  const medianRec    = recDurs.length ? median(recDurs) : null;
  const recoveryRate = cycles.length ? cycles.filter(c => c.recovered).length / cycles.length : 1;
  const maxDecDur    = cycles.reduce((m, c) => Math.max(m, c.declineDur), 0);
  const maxRecDur    = recDurs.length ? Math.max(...recDurs) : null;

  // Durability Score 0–100 (higher = more durable)
  // Factors: recovery rate (40%), avg recovery speed (30%), MDD severity (30%)
  const rateScore  = recoveryRate * 40;
  const speedScore = avgRecovery !== null ? Math.max(0, 30 - (avgRecovery / n) * 300) : 0;
  const mddScore   = Math.max(0, 30 - Math.abs(mdd) * 100);
  const durScore   = Math.min(100, Math.round(rateScore + speedScore + mddScore));

  // Chart data (downsampled)
  const step = Math.max(1, Math.floor((n + 1) / 250));
  const chartData: AssetAnalysis['chartData'] = [];
  for (let i = 0; i <= n; i += step) {
    chartData.push({
      idx:    i,
      cumRet: parseFloat(((cumul[i] - 1) * 100).toFixed(2)),
      dd:     parseFloat((ddArr[i] * 100).toFixed(2)),
      peak:   parseFloat(((peakArr[i] - 1) * 100).toFixed(2)),
    });
  }

  return {
    name, returns: rets, cumulative: cumul, ddSeries: ddArr, peaks: peakArr,
    cycles: sorted, mdd, avgDecline, avgRecovery, medianRecovery: medianRec,
    recoveryRate, maxDeclineDur: maxDecDur, maxRecoveryDur: maxRecDur,
    durabilityScore: durScore,
    totalReturn: cumul[n] - 1,
    chartData,
  };
}

// ─────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────

function fPct(n: number, d = 2): string { return `${(n * 100).toFixed(d)}%`; }

function severityBadge(s: string): string {
  if (s === 'Minor')       return 'bg-emerald-100 text-emerald-700';
  if (s === 'Moderate')    return 'bg-green-100 text-green-700';
  if (s === 'Significant') return 'bg-amber-100 text-amber-700';
  if (s === 'Severe')      return 'bg-orange-100 text-orange-700';
  return 'bg-slate-200 text-slate-600';
}

function durabilityBand(score: number): { label: string; cls: string; bar: string } {
  if (score >= 75) return { label: 'High Durability',      cls: 'text-emerald-700', bar: 'bg-emerald-500' };
  if (score >= 50) return { label: 'Moderate Durability',  cls: 'text-green-700',   bar: 'bg-green-500' };
  if (score >= 30) return { label: 'Low Durability',       cls: 'text-amber-700',   bar: 'bg-amber-500' };
  return              { label: 'Fragile',                cls: 'text-orange-700',  bar: 'bg-orange-500' };
}

const PALETTE = ['#6C3AED', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

// ─────────────────────────────────────────────
// Default data — 4 tickers, 120 periods
// ─────────────────────────────────────────────

const DEMO: { name: string; rets: number[] }[] = [
  {
    name: 'AAPL',
    rets: [
       0.018,-0.009, 0.024, 0.007,-0.031, 0.015, 0.011,-0.006, 0.028,-0.014,
       0.009, 0.021,-0.018, 0.033,-0.007, 0.019,-0.011, 0.026,-0.052, 0.022,
      -0.013, 0.034,-0.009, 0.027, 0.008,-0.019, 0.031,-0.012, 0.041,-0.008,
       0.014,-0.027, 0.032, 0.005,-0.061, 0.048,-0.017, 0.025,-0.009, 0.036,
      -0.021, 0.029,-0.008, 0.021, 0.047,-0.031, 0.013,-0.038, 0.026, 0.011,
       0.016,-0.012, 0.031,-0.007, 0.022, 0.009,-0.025, 0.039,-0.015, 0.031,
       0.004,-0.018, 0.027,-0.011, 0.036,-0.024, 0.019,-0.009, 0.028, 0.014,
      -0.043, 0.033,-0.012, 0.026,-0.006, 0.021, 0.008,-0.033, 0.038,-0.017,
       0.024,-0.010, 0.031, 0.005,-0.055, 0.044,-0.015, 0.028,-0.008, 0.039,
      -0.025, 0.019, 0.013,-0.016, 0.032,-0.007, 0.026,-0.035, 0.018, 0.011,
       0.021,-0.009, 0.028,-0.013, 0.038,-0.019, 0.010,-0.029, 0.024, 0.017,
      -0.008, 0.034,-0.021, 0.027,-0.004, 0.018,-0.013, 0.032,-0.010, 0.025,
    ],
  },
  {
    name: 'TSLA',
    rets: [
       0.034,-0.028, 0.051, 0.012,-0.067, 0.042, 0.019,-0.031, 0.058,-0.024,
       0.011, 0.039,-0.033, 0.061,-0.017, 0.028,-0.019, 0.047,-0.089, 0.038,
      -0.022, 0.064,-0.018, 0.043, 0.014,-0.038, 0.056,-0.021, 0.073,-0.015,
       0.027,-0.049, 0.058, 0.008,-0.094, 0.081,-0.029, 0.042,-0.017, 0.063,
      -0.039, 0.051,-0.014, 0.037, 0.079,-0.057, 0.022,-0.068, 0.046, 0.019,
       0.028,-0.021, 0.057,-0.013, 0.039, 0.016,-0.044, 0.068,-0.027, 0.054,
       0.007,-0.033, 0.049,-0.019, 0.064,-0.041, 0.033,-0.017, 0.051, 0.024,
      -0.078, 0.059,-0.021, 0.047,-0.011, 0.038, 0.014,-0.059, 0.069,-0.031,
       0.043,-0.018, 0.057, 0.009,-0.098, 0.078,-0.027, 0.051,-0.014, 0.071,
      -0.045, 0.034, 0.023,-0.029, 0.058,-0.013, 0.047,-0.063, 0.033, 0.019,
       0.038,-0.016, 0.051,-0.024, 0.069,-0.034, 0.018,-0.052, 0.044, 0.031,
      -0.014, 0.063,-0.038, 0.049,-0.008, 0.033,-0.024, 0.058,-0.019, 0.045,
    ],
  },
  {
    name: 'BND',
    rets: [
       0.004,-0.002, 0.006, 0.002,-0.008, 0.005, 0.003,-0.002, 0.007,-0.004,
       0.002, 0.006,-0.005, 0.009,-0.002, 0.005,-0.003, 0.007,-0.012, 0.006,
      -0.004, 0.009,-0.003, 0.007, 0.002,-0.005, 0.008,-0.003, 0.011,-0.002,
       0.004,-0.007, 0.008, 0.001,-0.015, 0.013,-0.005, 0.007,-0.002, 0.009,
      -0.006, 0.008,-0.002, 0.005, 0.012,-0.008, 0.004,-0.010, 0.007, 0.003,
       0.005,-0.003, 0.008,-0.002, 0.006, 0.003,-0.007, 0.010,-0.004, 0.008,
       0.001,-0.005, 0.007,-0.003, 0.009,-0.006, 0.005,-0.002, 0.008, 0.004,
      -0.011, 0.009,-0.003, 0.007,-0.002, 0.006, 0.002,-0.009, 0.011,-0.005,
       0.007,-0.003, 0.009, 0.001,-0.014, 0.012,-0.004, 0.008,-0.002, 0.011,
      -0.007, 0.005, 0.003,-0.004, 0.009,-0.002, 0.007,-0.010, 0.005, 0.003,
       0.006,-0.003, 0.008,-0.004, 0.011,-0.005, 0.003,-0.008, 0.007, 0.005,
      -0.002, 0.010,-0.006, 0.008,-0.001, 0.005,-0.004, 0.009,-0.003, 0.007,
    ],
  },
  {
    name: 'SPY',
    rets: [
       0.012,-0.007, 0.018, 0.005,-0.022, 0.012, 0.008,-0.004, 0.021,-0.011,
       0.006, 0.016,-0.013, 0.025,-0.005, 0.014,-0.008, 0.019,-0.038, 0.016,
      -0.010, 0.025,-0.006, 0.019, 0.005,-0.014, 0.023,-0.009, 0.031,-0.006,
       0.010,-0.020, 0.024, 0.004,-0.044, 0.036,-0.013, 0.018,-0.006, 0.027,
      -0.016, 0.022,-0.006, 0.015, 0.035,-0.023, 0.009,-0.028, 0.019, 0.008,
       0.012,-0.009, 0.023,-0.005, 0.016, 0.006,-0.018, 0.029,-0.011, 0.023,
       0.003,-0.013, 0.020,-0.008, 0.027,-0.018, 0.014,-0.006, 0.021, 0.010,
      -0.032, 0.025,-0.009, 0.019,-0.004, 0.015, 0.006,-0.025, 0.028,-0.013,
       0.018,-0.008, 0.023, 0.004,-0.041, 0.033,-0.011, 0.021,-0.006, 0.029,
      -0.019, 0.014, 0.009,-0.012, 0.024,-0.005, 0.019,-0.026, 0.014, 0.008,
       0.016,-0.007, 0.021,-0.010, 0.029,-0.015, 0.007,-0.022, 0.018, 0.013,
      -0.006, 0.026,-0.016, 0.020,-0.003, 0.014,-0.010, 0.024,-0.008, 0.019,
    ],
  },
];

function defaultManual(): AssetInput[] {
  return DEMO.map((d, i) => ({
    id:      String(i + 1),
    name:    d.name,
    enabled: true,
    returns: d.rets.map(r => (r * 100).toFixed(2)).join(', '),
  }));
}

function generateExampleCSV(): Record<string, any>[] {
  return DEMO[0].rets.map((_, i) => {
    const row: Record<string, any> = { period: i + 1 };
    for (const d of DEMO) row[d.name] = (d.rets[i] * 100).toFixed(4);
    return row;
  });
}

// ─────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────

const CumTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1">Period {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
};

const DDTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-600 mb-1">Period {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
};

const ScatterTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[170px]">
      <p className="font-semibold text-slate-700 mb-1.5">Drawdown #{d.rank}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Decline</span>
          <span className="font-mono font-semibold">{Math.abs(d.x).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Recovery</span>
          <span className="font-mono font-semibold">{d.y !== null ? `${d.y}p` : 'Not recovered'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Severity</span>
          <span className="font-mono">{d.severity}</span>
        </div>
      </div>
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
            <RotateCcw className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">Drawdown Recovery Analysis</CardTitle>
        <CardDescription className="text-base mt-2">
          Compare drawdown cycles and recovery times across individual securities to assess risk durability — identify which assets recover fastest and which carry structural downside risk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <TrendingDown className="w-6 h-6 text-primary mb-2" />,
              title: 'Drawdown Cycles',
              desc: 'Detect every peak → trough → recovery cycle automatically. Rank by severity, measure decline duration and recovery time for each cycle independently.',
            },
            {
              icon: <Clock className="w-6 h-6 text-primary mb-2" />,
              title: 'Recovery Speed',
              desc: 'Compare average and median recovery times across assets. Fast recovery signals structural resilience; slow recovery indicates deeper structural or sentiment damage.',
            },
            {
              icon: <Activity className="w-6 h-6 text-primary mb-2" />,
              title: 'Durability Score',
              desc: 'Composite score (0–100) based on recovery rate, average recovery speed, and MDD severity. Higher = more risk-durable asset under historical conditions.',
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
            { label: 'Minor',        desc: '< 5% decline' },
            { label: 'Moderate',     desc: '5–15% decline' },
            { label: 'Significant',  desc: '15–30% decline' },
            { label: 'Severe',       desc: '30–50%+ decline' },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${severityBadge(label)}`}>{label}</span>
              <div className="text-xs text-muted-foreground mt-1.5">{desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />CSV Format</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Wide format — one column per ticker, one row per period. Returns in decimal or percent.
              </p>
              <div className="rounded-lg border bg-white p-3 font-mono text-xs text-slate-600 overflow-x-auto">
                <div>period, AAPL, TSLA, BND, SPY</div>
                <div>1, 1.8, 3.4, 0.4, 1.2</div>
                <div>2, -0.9, -2.8, -0.2, -0.7</div>
                <div>3, 2.4, 5.1, 0.6, 1.8</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                'One row per period (daily, weekly, monthly)',
                'Multiple tickers as separate columns',
                'Min 10 observations per ticker',
                'Returns auto-detected (decimal or %)',
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
            <RotateCcw className="mr-2 h-5 w-5" />Load Example Data
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
// Main Component
// ─────────────────────────────────────────────

export default function DrawdownRecoveryPage({
  data, allHeaders, numericHeaders, fileName, onClearData, onExampleLoaded,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  const [hasStarted,    setHasStarted]    = useState(false);
  const [inputMode,     setInputMode]     = useState<'manual' | 'csv'>('manual');
  const [manualAssets,  setManualAssets]  = useState<AssetInput[]>(defaultManual());
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [detailTab,     setDetailTab]     = useState<'cumulative' | 'drawdown' | 'cycles'>('cumulative');

  // CSV
  const [periodCol,  setPeriodCol]  = useState('');
  const [assetCols,  setAssetCols]  = useState<string[]>([]);

  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    onExampleLoaded?.(generateExampleCSV(), 'example_dd_recovery.csv');
    setInputMode('csv');
    setHasStarted(true);
    setPeriodCol('period');
    setAssetCols(DEMO.map(d => d.name));
  }, [onExampleLoaded]);

  const handleClearAll = useCallback(() => {
    setPeriodCol(''); setAssetCols([]);
    onClearData?.();
    setHasStarted(false);
    setInputMode('manual');
    setActiveIdx(0);
  }, [onClearData]);

  // ── Auto-detect CSV columns ───────────────────────────────
  useMemo(() => {
    if (!hasData || assetCols.length) return;
    const hl = allHeaders.map(h => h.toLowerCase());
    const pi = hl.findIndex(h => ['period','date','time','month'].some(k => h.includes(k)));
    if (pi !== -1) setPeriodCol(allHeaders[pi]);
    setAssetCols(numericHeaders.filter((_, i) => i !== pi).slice(0, 8));
  }, [hasData, allHeaders, numericHeaders, assetCols.length]);

  // ── Build inputs ──────────────────────────────────────────
  const rawInputs: { name: string; returns: number[] }[] = useMemo(() => {
    if (inputMode === 'csv' && hasData && assetCols.length) {
      return assetCols.map(col => ({
        name:    col,
        returns: detectAndNormalize(data.map(r => parseFloat(String(r[col] ?? ''))).filter(v => isFinite(v))),
      })).filter(a => a.returns.length >= 10);
    }
    if (inputMode === 'manual') {
      return manualAssets
        .filter(a => a.enabled && a.name.trim())
        .map(a => ({ name: a.name.trim(), returns: parseReturns(a.returns) }))
        .filter(a => a.returns.length >= 10);
    }
    return [];
  }, [inputMode, hasData, data, assetCols, manualAssets]);

  // ── Compute ───────────────────────────────────────────────
  const results: AssetAnalysis[] = useMemo(() =>
    rawInputs.map(a => analyze(a.name, a.returns)),
    [rawInputs]
  );

  const isConfigured = results.length > 0;
  const active       = results[Math.min(activeIdx, results.length - 1)] ?? null;
  const isExample    = (fileName ?? '').startsWith('example_');

  // ── Cross-asset comparison bar data ───────────────────────
  const recoveryBarData = useMemo(() =>
    [...results]
      .sort((a, b) => (a.avgRecovery ?? 999) - (b.avgRecovery ?? 999))
      .map(r => ({
        asset:        r.name,
        avgRecovery:  r.avgRecovery !== null ? parseFloat(r.avgRecovery.toFixed(1)) : null,
        medianRecov:  r.medianRecovery !== null ? parseFloat(r.medianRecovery.toFixed(1)) : null,
        mdd:          parseFloat((Math.abs(r.mdd) * 100).toFixed(2)),
      })),
    [results]
  );

  const durabilityData = useMemo(() =>
    [...results].sort((a, b) => b.durabilityScore - a.durabilityScore)
      .map(r => ({
        asset: r.name,
        score: r.durabilityScore,
        ...durabilityBand(r.durabilityScore),
      })),
    [results]
  );

  // ── Scatter: severity vs recovery ─────────────────────────
  const scatterData = useMemo(() => {
    if (!active) return [];
    return active.cycles
      .filter(c => c.recoveryDur !== null)
      .map(c => ({
        x:        parseFloat((Math.abs(c.drawdown) * 100).toFixed(2)),
        y:        c.recoveryDur,
        rank:     c.rank,
        severity: c.severity,
      }));
  }, [active]);

  // ── Manual handlers ───────────────────────────────────────
  const handleManualChange = useCallback((id: string, field: keyof AssetInput, val: string | boolean) => {
    setManualAssets(prev => prev.map(a => a.id !== id ? a : { ...a, [field]: val }));
  }, []);
  const handleAddAsset = useCallback(() => {
    setManualAssets(prev => [
      ...prev,
      { id: String(Date.now()), name: `Ticker ${prev.length + 1}`, enabled: true, returns: '' },
    ]);
  }, []);
  const handleDeleteAsset = useCallback((id: string) => {
    setManualAssets(prev => prev.filter(a => a.id !== id));
    setActiveIdx(0);
  }, []);
  const toggleCol = (col: string) =>
    setAssetCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    if (!isConfigured) return;
    const rows = results.map(r => ({
      asset:             r.name,
      observations:      r.returns.length,
      total_return:      fPct(r.totalReturn),
      mdd:               fPct(r.mdd),
      avg_decline:       fPct(r.avgDecline),
      num_cycles:        r.cycles.length,
      recovery_rate:     fPct(r.recoveryRate),
      avg_recovery_dur:  r.avgRecovery?.toFixed(1) ?? 'N/A',
      median_recovery:   r.medianRecovery?.toFixed(1) ?? 'N/A',
      max_decline_dur:   r.maxDeclineDur,
      max_recovery_dur:  r.maxRecoveryDur ?? 'N/A',
      durability_score:  r.durabilityScore,
    }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `DD_Recovery_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [isConfigured, results, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image…' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `DD_Recovery_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch { toast({ variant: 'destructive', title: 'Download failed' }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  // ── Intro gate ─────────────────────────────────────────────
  if (!hasData && !hasStarted) return (
    <IntroPage onLoadExample={handleLoadExample}
      onManualEntry={() => { setInputMode('manual'); setHasStarted(true); }} />
  );

  const activeDurBand = active ? durabilityBand(active.durabilityScore) : null;

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
              ? `${results.length} ticker${results.length !== 1 ? 's' : ''} · ${active?.returns.length ?? 0} periods`
              : hasData ? `${data.length} rows · ${allHeaders.length} cols` : `${manualAssets.length} assets`}
          </span>
          {isExample && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Example</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasData && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
              onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
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
                <FileText className="h-4 w-4 text-muted-foreground" />{fileName || 'Uploaded file'}
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
            <RotateCcw className="h-5 w-5" />Drawdown Recovery Analysis
          </CardTitle>
          <CardDescription>
            Compare drawdown cycles and recovery times across individual tickers. Identify which assets recover fastest, which cycles remain unresolved, and score risk durability with a composite metric.
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
                {inputMode === 'csv'
                  ? 'Select ticker columns from your uploaded return series.'
                  : 'Enter comma-separated return series per ticker (decimal or %).'}
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
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">PERIOD COLUMN (optional)</Label>
                <Select value={periodCol || '__none__'} onValueChange={v => setPeriodCol(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8 w-48"><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  TICKER COLUMNS — {assetCols.length} selected
                </Label>
                <div className="flex flex-wrap gap-2">
                  {numericHeaders.filter(h => h !== periodCol).map(h => (
                    <button key={h} onClick={() => toggleCol(h)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors ${
                        assetCols.includes(h)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                      }`}>{h}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual Mode */}
          {inputMode === 'manual' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['On', 'Ticker', 'Return Series (comma-sep, decimal or %)', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualAssets.map(a => (
                      <tr key={a.id} className={`border-t hover:bg-slate-50/50 ${!a.enabled ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-1.5">
                          <input type="checkbox" checked={a.enabled}
                            onChange={e => handleManualChange(a.id, 'enabled', e.target.checked)}
                            className="w-4 h-4 accent-primary cursor-pointer" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-20 font-mono font-semibold" value={a.name}
                            onChange={e => handleManualChange(a.id, 'name', e.target.value)} placeholder="AAPL" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs font-mono min-w-[400px]" value={a.returns}
                            onChange={e => handleManualChange(a.id, 'returns', e.target.value)}
                            placeholder="0.018, -0.009, 0.024, …" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-600"
                            onClick={() => handleDeleteAsset(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddAsset}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Ticker
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
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Detail view</Label>
              <Select value={String(activeIdx)} onValueChange={v => setActiveIdx(Number(v))}>
                <SelectTrigger className="text-xs h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {results.map((r, i) => (
                    <SelectItem key={i} value={String(i)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Summary)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && active && activeDurBand && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Durability Score</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{active.durabilityScore}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
            <div className="mt-2">
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                <div className={`h-1.5 rounded-full ${activeDurBand.bar}`} style={{ width: `${active.durabilityScore}%` }} />
              </div>
              <span className={`text-xs font-semibold ${activeDurBand.cls}`}>{activeDurBand.label}</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Drawdown Cycles</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{active.cycles.length}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {active.cycles.filter(c => c.recovered).length} recovered · {active.cycles.filter(c => !c.recovered).length} ongoing
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avg Recovery</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {active.avgRecovery !== null
                ? <>{active.avgRecovery.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">p</span></>
                : <span className="text-slate-400 text-lg">—</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Median: {active.medianRecovery !== null ? `${active.medianRecovery.toFixed(1)}p` : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recovery Rate</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{fPct(active.recoveryRate, 0)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Avg decline: {fPct(active.avgDecline)}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Cross-Asset Recovery Time Comparison ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Average Recovery Time by Ticker</CardTitle>
              <CardDescription>Periods from trough to high-water mark — sorted fastest to slowest</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, results.length * 52)}>
                <BarChart data={recoveryBarData} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}p`} />
                  <YAxis type="category" dataKey="asset"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(v: number, name: string) => [`${v?.toFixed(1)}p`, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="avgRecovery" name="Avg Recovery (periods)" maxBarSize={20} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="avgRecovery" position="right"
                      style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                      formatter={(v: number) => v ? `${v.toFixed(1)}p` : '—'} />
                    {recoveryBarData.map((d, i) => (
                      <Cell key={i}
                        fill={PALETTE[results.findIndex(r => r.name === d.asset) % PALETTE.length]}
                        fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="medianRecov" name="Median Recovery" maxBarSize={20} radius={[0, 4, 4, 0]}>
                    {recoveryBarData.map((d, i) => (
                      <Cell key={i}
                        fill={PALETTE[results.findIndex(r => r.name === d.asset) % PALETTE.length]}
                        fillOpacity={0.35} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary/80" />Avg Recovery</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary/30" />Median Recovery</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Durability Score Bar ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Durability Score Ranking</CardTitle>
              <CardDescription>
                Composite score (0–100) based on recovery rate (40%), recovery speed (30%), and MDD severity (30%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {durabilityData.map((d, i) => (
                  <div key={d.asset} className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setActiveIdx(results.findIndex(r => r.name === d.asset))}>
                    <div className="w-6 text-xs font-bold text-muted-foreground text-right shrink-0">#{i + 1}</div>
                    <div className="flex items-center gap-2 w-20 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PALETTE[results.findIndex(r => r.name === d.asset) % PALETTE.length] }} />
                      <span className="text-xs font-semibold text-slate-700 truncate">{d.asset}</span>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${d.bar}`} style={{ width: `${d.score}%` }} />
                    </div>
                    <div className="w-12 text-right text-xs font-mono font-semibold text-slate-700">{d.score}</div>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                      d.label === 'High Durability'     ? 'bg-emerald-100 text-emerald-700' :
                      d.label === 'Moderate Durability' ? 'bg-green-100 text-green-700' :
                      d.label === 'Low Durability'      ? 'bg-amber-100 text-amber-700' :
                                                          'bg-orange-100 text-orange-700'
                    }`}>{d.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Detail Charts for selected ticker ── */}
        {isConfigured && active && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">{active.name} — Detail Analysis</CardTitle>
                  <CardDescription>
                    {active.cycles.length} drawdown cycles · {active.returns.length} periods · Recovery rate {fPct(active.recoveryRate, 0)}
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {([
                    { key: 'cumulative', label: 'Cumulative' },
                    { key: 'drawdown',   label: 'Drawdown' },
                    { key: 'cycles',     label: 'Cycles' },
                  ] as const).map(t => (
                    <Button key={t.key} size="sm"
                      variant={detailTab === t.key ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setDetailTab(t.key)}>
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {detailTab === 'cumulative' && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={active.chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }}
                      tickLine={false} axisLine={{ stroke: '#E2E8F0' }}
                      interval={Math.floor(active.chartData.length / 6)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`} />
                    <Tooltip content={<CumTip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                    <Area type="monotone" dataKey="peak" name="Running Peak"
                      stroke="#CBD5E1" fill="none" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
                    <Area type="monotone" dataKey="cumRet" name="Cum. Return"
                      stroke={PALETTE[activeIdx % PALETTE.length]} fill="url(#gradC)"
                      strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {detailTab === 'drawdown' && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={active.chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="gradDD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={PALETTE[activeIdx % PALETTE.length]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94A3B8' }}
                      tickLine={false} axisLine={{ stroke: '#E2E8F0' }}
                      interval={Math.floor(active.chartData.length / 6)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v.toFixed(0)}%`} />
                    <Tooltip content={<DDTip />} />
                    <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                    <ReferenceLine y={parseFloat((active.mdd * 100).toFixed(2))}
                      stroke={PALETTE[activeIdx % PALETTE.length]} strokeDasharray="4 2" strokeWidth={1.5}
                      label={{ value: `MDD ${fPct(active.mdd)}`, position: 'insideBottomLeft', fontSize: 10, fill: PALETTE[activeIdx % PALETTE.length] }} />
                    <Area type="monotone" dataKey="dd" name="Drawdown %"
                      stroke={PALETTE[activeIdx % PALETTE.length]} fill="url(#gradDD)"
                      strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {detailTab === 'cycles' && scatterData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" dataKey="x" name="Drawdown Depth (%)"
                        tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        label={{ value: 'Drawdown Depth (%)', position: 'insideBottom', offset: -8, fontSize: 10, fill: '#94A3B8' }} />
                      <YAxis type="number" dataKey="y" name="Recovery Duration (periods)"
                        tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                        label={{ value: 'Recovery (periods)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#94A3B8' }} />
                      <ZAxis range={[60, 60]} />
                      <Tooltip content={<ScatterTip />} />
                      <Scatter data={scatterData} fill={PALETTE[activeIdx % PALETTE.length]} fillOpacity={0.75} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Each dot = one recovered drawdown cycle · Deeper drawdowns in the right → typically longer recovery
                  </p>
                </>
              )}

              {detailTab === 'cycles' && scatterData.length === 0 && (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  No fully recovered cycles to display.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Cross-asset Summary Table ── */}
        {isConfigured && results.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />Cross-Asset Recovery Summary
              </CardTitle>
              <CardDescription>Click row to switch detail view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Ticker', 'MDD', 'Avg Decline', 'Cycles', 'Rec. Rate', 'Avg Recovery', 'Median Recovery', 'Max Recovery', 'Durability'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => {
                      const db = durabilityBand(r.durabilityScore);
                      return (
                        <tr key={i}
                          className={`border-t hover:bg-slate-50/50 cursor-pointer transition-colors ${activeIdx === i ? 'bg-primary/5' : ''}`}
                          onClick={() => setActiveIdx(i)}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                              <span className="font-bold text-slate-700">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fPct(r.mdd)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.avgDecline)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.cycles.length}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{fPct(r.recoveryRate, 0)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {r.avgRecovery !== null ? `${r.avgRecovery.toFixed(1)}p` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {r.medianRecovery !== null ? `${r.medianRecovery.toFixed(1)}p` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {r.maxRecoveryDur !== null ? `${r.maxRecoveryDur}p` : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-slate-100 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${db.bar}`} style={{ width: `${r.durabilityScore}%` }} />
                              </div>
                              <span className="font-mono text-slate-700">{r.durabilityScore}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Cycle Detail Table ── */}
        {isConfigured && active && active.cycles.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Drawdown Cycles — {active.name}</CardTitle>
              <CardDescription>Ranked by severity · {active.cycles.length} total cycles detected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Rank', 'Drawdown', 'Peak Period', 'Trough Period', 'Recovery Period', 'Decline Dur.', 'Recovery Dur.', 'Total Dur.', 'Severity', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.cycles.map((c, i) => (
                      <tr key={i} className={`border-t hover:bg-slate-50/50 ${i === 0 ? 'bg-slate-50/60' : ''}`}>
                        <td className="px-3 py-2 font-mono font-bold text-slate-500">#{c.rank}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">{fPct(c.drawdown)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{c.peakIdx}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{c.troughIdx}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{c.recoveryIdx ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{c.declineDur}p</td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {c.recoveryDur !== null ? `${c.recoveryDur}p` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {c.totalDur !== null ? `${c.totalDur}p` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${severityBadge(c.severity)}`}>{c.severity}</span>
                        </td>
                        <td className="px-3 py-2">
                          {c.recovered
                            ? <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Recovered</span>
                            : <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">Ongoing</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && active && activeDurBand && (() => {
          const fastestRecovery = [...active.cycles].filter(c => c.recoveryDur !== null).sort((a, b) => a.recoveryDur! - b.recoveryDur!)[0];
          const slowestRecovery = [...active.cycles].filter(c => c.recoveryDur !== null).sort((a, b) => b.recoveryDur! - a.recoveryDur!)[0];
          const worstCycle      = active.cycles[0];
          const ongoingCycles   = active.cycles.filter(c => !c.recovered);
          const bestDurable     = results.length > 1 ? [...results].sort((a, b) => b.durabilityScore - a.durabilityScore)[0] : null;
          const fastestAsset    = results.length > 1
            ? [...results].filter(r => r.avgRecovery !== null).sort((a, b) => (a.avgRecovery ?? 999) - (b.avgRecovery ?? 999))[0]
            : null;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights & Interpretation
                </CardTitle>
                <CardDescription>
                  Auto-generated drawdown recovery analysis · {active.name} · {results.length} ticker{results.length !== 1 ? 's' : ''} compared
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Recovery Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    <span className="font-semibold">{active.name}</span> experienced{' '}
                    <span className="font-semibold">{active.cycles.length} drawdown cycle{active.cycles.length !== 1 ? 's' : ''}</span>{' '}
                    over {active.returns.length} periods, with a recovery rate of{' '}
                    <span className="font-semibold">{fPct(active.recoveryRate, 0)}</span>.
                    {active.avgRecovery !== null
                      ? <> Average recovery took <span className="font-semibold">{active.avgRecovery.toFixed(1)} periods</span> (median: {active.medianRecovery?.toFixed(1)}p).</>
                      : ' No drawdown cycles have been fully recovered yet.'}
                    {' '}Durability Score: <span className="font-semibold">{active.durabilityScore}/100</span>{' '}
                    — <span className={`font-semibold ${activeDurBand.cls}`}>{activeDurBand.label}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Durability',    value: `${active.durabilityScore}/100`,                                  sub: activeDurBand.label },
                    { label: 'Worst Cycle',   value: worstCycle ? fPct(worstCycle.drawdown) : '—',                    sub: worstCycle ? `${worstCycle.declineDur}p decline` : '' },
                    { label: 'Fastest Rec.',  value: fastestRecovery ? `${fastestRecovery.recoveryDur}p` : '—',       sub: fastestRecovery ? fPct(fastestRecovery.drawdown) : '' },
                    { label: 'Slowest Rec.',  value: slowestRecovery ? `${slowestRecovery.recoveryDur}p` : '—',       sub: slowestRecovery ? fPct(slowestRecovery.drawdown) : '' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-base font-bold font-mono text-slate-700">{value}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Observations</p>

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Drawdown Cycle Patterns</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {active.name} averaged {active.avgDecline ? fPct(active.avgDecline) : '—'} decline per cycle.
                        {fastestRecovery && slowestRecovery && fastestRecovery !== slowestRecovery
                          ? ` Recovery times ranged from ${fastestRecovery.recoveryDur}p (${fPct(fastestRecovery.drawdown)} drawdown) to ${slowestRecovery.recoveryDur}p (${fPct(slowestRecovery.drawdown)} drawdown), suggesting${
                              active.avgDecline && Math.abs(active.avgDecline) > 0.15
                                ? ' that deeper drawdowns do not always take proportionally longer to recover — other factors like momentum and sentiment also drive recovery speed.'
                                : ' recovery speed is broadly consistent regardless of drawdown depth.'
                            }`
                          : ''}
                        {ongoingCycles.length > 0
                          ? ` ${ongoingCycles.length} cycle${ongoingCycles.length !== 1 ? 's are' : ' is'} still ongoing — the portfolio has not yet recovered from its most recent drawdown.`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {results.length > 1 && (bestDurable || fastestAsset) && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Cross-Asset Comparison</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {bestDurable && <><span className="font-semibold">{bestDurable.name}</span> leads in overall durability (score: {bestDurable.durabilityScore}/100). </>}
                          {fastestAsset && fastestAsset.name !== bestDurable?.name
                            ? <><span className="font-semibold">{fastestAsset.name}</span> recovers fastest on average ({fastestAsset.avgRecovery?.toFixed(1)}p), indicating strong structural resilience to drawdowns.</>
                            : fastestAsset ? <><span className="font-semibold">{fastestAsset.name}</span> is both the most durable and the fastest-recovering asset in this comparison.</> : null}
                          {' '}Assets with low durability scores may warrant tighter position sizing or stop-loss discipline to limit tail exposure.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Durability Score Interpretation</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The score of <span className="font-semibold">{active.durabilityScore}/100</span> reflects three factors:{' '}
                        recovery rate (40% weight), recovery speed (30%), and MDD severity (30%).
                        {active.durabilityScore >= 70
                          ? ' A high durability score indicates the asset has historically recovered from most drawdowns quickly and without catastrophic peak-to-trough declines — consistent with a lower-volatility or mean-reverting profile.'
                          : active.durabilityScore >= 45
                          ? ' A moderate score indicates some recovery capability but with notable drawdown events or slower-than-average recovery times — suitable for investors with medium-term horizons.'
                          : ' A low durability score suggests the asset experiences deep drawdowns, slow recoveries, or unresolved cycles — investors should manage position sizing carefully and consider correlation effects with other holdings.'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ Drawdown = (current − peak) / peak at each period. Cycles detected as peak→trough→recovery segments where cumulative return drops below the prior high-water mark and subsequently recovers.
                  Durability Score = recovery rate×40 + speed score×30 + MDD score×30 (capped at 100).
                  "p" = periods (unit depends on input frequency). Ongoing cycles are excluded from recovery duration averages.
                  This analysis is auto-generated and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
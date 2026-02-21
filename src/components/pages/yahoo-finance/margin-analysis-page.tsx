'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  ComposedChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Info, Download, Loader2,
  FileSpreadsheet, ImageIcon, ChevronDown, CheckCircle,
  X, FileText, Eye, BarChart3, Activity,
  Link2, Layers, ArrowRight, AlertTriangle,
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
type DataSet = Record<string, any>[];

interface LinkedRow {
  period: string;
  // IS
  revenue:      number | null;
  grossProfit:  number | null;
  ebit:         number | null;
  netIncome:    number | null;
  interestExp:  number | null;
  da:           number | null;
  // BS
  totalAssets:  number | null;
  cash:         number | null;
  totalDebt:    number | null;
  totalEquity:  number | null;
  retainedEarnings: number | null;
  // CF
  operatingCF:  number | null;
  capex:        number | null;
  fcf:          number | null;
  financingCF:  number | null;
  // Derived linkage
  ocfVsNi:      number | null;   // OCF / NI — earnings quality
  capexVsDa:    number | null;   // Capex / D&A — growth vs maintenance
  netDebt:      number | null;   // Debt - Cash
  debtEquity:   number | null;   // Debt / Equity
  roae:         number | null;   // NI / Equity %
  roaa:         number | null;   // NI / Assets %
  niMargin:     number | null;   // NI / Revenue %
  cfConversion: number | null;   // OCF / EBIT %
  // Check flags
  bsBalances:   boolean | null;  // Assets ≈ Liabilities + Equity (if we can check)
  cfNiDelta:    number | null;   // OCF - NI (non-cash items proxy)
}

interface SheetMap {
  is: DataSet;
  bs: DataSet;
  cf: DataSet;
}

// ─────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────
const IS_COLOR  = '#6C3AED';   // violet  — income statement
const BS_COLOR  = '#3B82F6';   // blue    — balance sheet
const CF_COLOR  = '#10B981';   // green   — cash flow
const NEG_COLOR = '#EF4444';
const WARN_COLOR= '#F59E0B';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function p(r: Record<string, any>, col: string): number | null {
  if (!col) return null;
  const v = parseFloat(r[col]);
  return isFinite(v) ? v : null;
}

function autoUnit(rows: LinkedRow[]): string {
  const maxVal = Math.max(...rows.map(r =>
    Math.abs(r.revenue ?? r.totalAssets ?? r.operatingCF ?? 0)
  ));
  if (maxVal >= 1_000_000) return 'M';
  if (maxVal >= 1_000)     return 'K';
  return '';
}

function scaleVal(v: number | null, unit: string): number | null {
  if (v === null) return null;
  if (unit === 'M') return parseFloat((v / 1_000_000).toFixed(2));
  if (unit === 'K') return parseFloat((v / 1_000).toFixed(2));
  return parseFloat(v.toFixed(1));
}

function pct(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return parseFloat(((a / b) * 100).toFixed(2));
}

function ratio(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return parseFloat((a / b).toFixed(3));
}

// ─────────────────────────────────────────────
// Column selector: given a DataSet, pick a value column
// ─────────────────────────────────────────────
function getHeaders(ds: DataSet): string[] {
  if (!ds.length) return [];
  return Object.keys(ds[0]);
}

function getNumericHeaders(ds: DataSet): string[] {
  return getHeaders(ds).filter(h =>
    ds.some(r => isFinite(parseFloat(r[h])))
  );
}

// ─────────────────────────────────────────────
// Build linked rows from 3 datasets
// ─────────────────────────────────────────────
function buildLinkedRows(
  isData: DataSet, isPeriod: string,
  bsData: DataSet, bsPeriod: string,
  cfData: DataSet, cfPeriod: string,
  cols: Record<string, string>,
): LinkedRow[] {
  if (!isPeriod && !bsPeriod && !cfPeriod) return [];

  // Collect all unique periods
  const allPeriods = Array.from(new Set([
    ...isData.map(r => String(r[isPeriod] ?? '')),
    ...bsData.map(r => String(r[bsPeriod] ?? '')),
    ...cfData.map(r => String(r[cfPeriod] ?? '')),
  ])).filter(Boolean).sort();

  const isMap  = Object.fromEntries(isData.map(r => [String(r[isPeriod] ?? ''), r]));
  const bsMap  = Object.fromEntries(bsData.map(r => [String(r[bsPeriod] ?? ''), r]));
  const cfMap  = Object.fromEntries(cfData.map(r => [String(r[cfPeriod] ?? ''), r]));

  return allPeriods.map(period => {
    const isR = isMap[period] ?? {};
    const bsR = bsMap[period] ?? {};
    const cfR = cfMap[period] ?? {};

    const revenue     = p(isR, cols.revenue);
    const grossProfit = p(isR, cols.grossProfit);
    const ebit        = p(isR, cols.ebit);
    const netIncome   = p(isR, cols.netIncome);
    const interestExp = p(isR, cols.interestExp);
    const da          = p(isR, cols.da);

    const totalAssets = p(bsR, cols.totalAssets);
    const cash        = p(bsR, cols.cash);
    const totalDebt   = p(bsR, cols.totalDebt);
    const totalEquity = p(bsR, cols.totalEquity);
    const retained    = p(bsR, cols.retainedEarnings);

    const operatingCF = p(cfR, cols.operatingCF);
    const capex       = p(cfR, cols.capex);
    const financingCF = p(cfR, cols.financingCF);
    const fcf         = capex !== null && operatingCF !== null
      ? parseFloat((operatingCF - Math.abs(capex)).toFixed(2))
      : p(cfR, cols.fcf);

    const netDebt     = cash !== null && totalDebt !== null
      ? parseFloat((totalDebt - cash).toFixed(2)) : null;

    return {
      period,
      revenue, grossProfit, ebit, netIncome, interestExp, da,
      totalAssets, cash, totalDebt, totalEquity, retainedEarnings: retained,
      operatingCF, capex, fcf, financingCF,
      // Linkage metrics
      ocfVsNi:      ratio(operatingCF, netIncome),
      capexVsDa:    da && da > 0 && capex !== null
        ? parseFloat((Math.abs(capex) / da).toFixed(2)) : null,
      netDebt,
      debtEquity:   ratio(totalDebt, totalEquity),
      roae:         pct(netIncome, totalEquity),
      roaa:         pct(netIncome, totalAssets),
      niMargin:     pct(netIncome, revenue),
      cfConversion: pct(operatingCF, ebit),
      bsBalances:   null,  // can't verify without liabilities col
      cfNiDelta:    netIncome !== null && operatingCF !== null
        ? parseFloat((operatingCF - netIncome).toFixed(2)) : null,
    };
  });
}

// ─────────────────────────────────────────────
// Example data generator
// ─────────────────────────────────────────────
function generateExampleSheets(): { is: DataSet; bs: DataSet; cf: DataSet } {
  const years = ['2020', '2021', '2022', '2023', '2024'];
  let rev = 3000, ni = 300, assets = 8000, equity = 3200, debt = 2500, cash = 600;
  let ocf = 450, capex = 200, retained = 1800;

  const isRows: DataSet = [], bsRows: DataSet = [], cfRows: DataSet = [];

  for (const y of years) {
    rev     = parseFloat((rev     * (1 + 0.08 + (Math.random() - 0.4) * 0.06)).toFixed(1));
    ni      = parseFloat((ni      * (1 + 0.10 + (Math.random() - 0.4) * 0.08)).toFixed(1));
    assets  = parseFloat((assets  * (1 + 0.05 + (Math.random() - 0.4) * 0.04)).toFixed(1));
    equity  = parseFloat((equity  + ni * 0.6).toFixed(1));
    debt    = parseFloat((debt    * (1 + (Math.random() - 0.5) * 0.10)).toFixed(1));
    cash    = parseFloat((cash    + ni * 0.3).toFixed(1));
    ocf     = parseFloat((ni      * (1.3 + (Math.random() - 0.4) * 0.2)).toFixed(1));
    capex   = parseFloat((rev     * (0.05 + (Math.random() - 0.4) * 0.02)).toFixed(1));
    retained= parseFloat((retained + ni * 0.6).toFixed(1));
    const da        = parseFloat((assets * 0.05).toFixed(1));
    const gp        = parseFloat((rev * 0.52).toFixed(1));
    const ebit      = parseFloat((rev * 0.14).toFixed(1));
    const interest  = parseFloat((debt * 0.045).toFixed(1));

    isRows.push({ period: y, revenue: rev, gross_profit: gp, ebit, interest_expense: interest,
      net_income: ni, da });
    bsRows.push({ period: y, total_assets: assets, cash, total_debt: debt,
      total_equity: equity, retained_earnings: retained });
    cfRows.push({ period: y, operating_cf: ocf, capex: -capex,
      financing_cf: parseFloat((debt * (Math.random() - 0.5) * 0.1).toFixed(1)),
      investing_cf: parseFloat((-capex * 1.1).toFixed(1)) });
  }
  return { is: isRows, bs: bsRows, cf: cfRows };
}

// ─────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────
const GenTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? `${p.value.toFixed(2)}${unit}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Linkage Check Badge
// ─────────────────────────────────────────────
const CheckBadge = ({ ok, label }: { ok: boolean | null; label: string }) => {
  if (ok === null) return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />{label}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 border font-semibold
      ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────
// Intro Page
// ─────────────────────────────────────────────
// Example xlsx file (base64-encoded, IS + BS + CF sheets)
// ─────────────────────────────────────────────
const EXAMPLE_XLSX_B64 = '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';

function downloadExampleXlsx() {
  const byteChars = atob(EXAMPLE_XLSX_B64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'example_3statement.xlsx';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─────────────────────────────────────────────
const IntroPage = ({ onLoadExample }: { onLoadExample: () => void }) => (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Link2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="font-headline text-3xl">3-Statement Linkage</CardTitle>
        <CardDescription className="text-base mt-2">
          Analyze the organic linkage of Income Statement (IS) · Balance Sheet (BS) · Cash Flow (CF) —
          assess earnings quality, cash conversion, and capital efficiency at a glance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Linkage flow diagram */}
        <div className="flex items-center justify-center gap-2 flex-wrap py-2">
          {[
            { label: 'Income Statement', sub: 'Net Income', color: IS_COLOR },
            { label: '→', color: '#94A3B8', sub: '' },
            { label: 'Balance Sheet', sub: 'Retained Earnings + Equity', color: BS_COLOR },
            { label: '→', color: '#94A3B8', sub: '' },
            { label: 'Cash Flow', sub: 'OCF vs NI reconcile', color: CF_COLOR },
          ].map((item, i) => item.label === '→' ? (
            <ArrowRight key={i} className="h-5 w-5 text-slate-400 shrink-0" />
          ) : (
            <div key={i} className="rounded-lg border-2 p-3 text-center min-w-[140px]"
              style={{ borderColor: item.color }}>
              <div className="text-xs font-bold" style={{ color: item.color }}>{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Layers className="w-6 h-6 text-primary mb-2" />, title: 'Multi-Sheet Excel Support',
              desc: 'Upload an Excel file with IS · BS · CF each on a separate sheet tab. Sheet names are auto-detected by keyword.' },
            { icon: <Link2 className="w-6 h-6 text-primary mb-2" />, title: 'Statement Linkage Checks',
              desc: 'Verify that net income links to retained earnings, OCF reconciles with net income, and Capex signals growth vs maintenance relative to D&A.' },
            { icon: <BarChart3 className="w-6 h-6 text-primary mb-2" />, title: 'Earnings Quality Metrics',
              desc: 'Track OCF/NI ratio (cash earnings quality), CF Conversion (EBIT→OCF), Capex/D&A (growth vs maintenance), ROAE, and ROAA across periods.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader>{icon}<CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Upload guide */}
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />How to Upload Data
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Option ① — Multi-Sheet Excel (Recommended)
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Create 3 sheet tabs in a single <strong>.xlsx</strong> file:
              </p>
              <div className="flex gap-2 flex-wrap">
                {['IS (or Income Statement)', 'BS (or Balance Sheet)', 'CF (or Cash Flow)'].map(s => (
                  <span key={s} className="text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1 font-mono">{s}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sheet names containing IS/BS/CF keywords are auto-detected. The first column of each sheet must be the period (year/quarter).
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />Option ② — Single Wide CSV
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Include all IS · BS · CF items as columns in a single CSV:
              </p>
              <p className="text-xs font-mono bg-slate-50 border border-slate-100 rounded p-2 text-slate-600">
                period, revenue, net_income, total_assets, total_equity, operating_cf, capex ...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Manually assign each item in the column mapping section.
              </p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="font-semibold text-sm mb-2">Key Columns per Statement</h4>
            <div className="grid md:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div>
                <div className="font-bold mb-1" style={{ color: IS_COLOR }}>IS (Income Statement)</div>
                period, revenue, gross_profit, ebit, net_income, interest_expense, da
              </div>
              <div>
                <div className="font-bold mb-1" style={{ color: BS_COLOR }}>BS (Balance Sheet)</div>
                period, total_assets, cash, total_debt, total_equity, retained_earnings
              </div>
              <div>
                <div className="font-bold mb-1" style={{ color: CF_COLOR }}>CF (Cash Flow Statement)</div>
                period, operating_cf, capex, investing_cf, financing_cf
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2 flex-wrap">
          <Button variant="outline" onClick={downloadExampleXlsx} size="lg">
            <FileSpreadsheet className="mr-2 h-5 w-5" />Download Example xlsx
          </Button>
          <Button onClick={onLoadExample} size="lg">
            <Link2 className="mr-2 h-5 w-5" />Load Example Data
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ─────────────────────────────────────────────
// Column mapping section for one statement
// ─────────────────────────────────────────────
interface ColGroup {
  label: string; color: string;
  fields: { key: string; label: string; opt: boolean }[];
}

const ColMapper = ({
  group, dataset, values, onChange,
}: {
  group: ColGroup;
  dataset: DataSet;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) => {
  const allH = getHeaders(dataset);
  const numH = getNumericHeaders(dataset);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{group.label}</span>
        {!dataset.length && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            No sheet
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {group.fields.map(({ key, label, opt }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">{label}{opt ? '' : ' *'}</Label>
            <Select
              value={values[key] || '__none__'}
              onValueChange={v => onChange(key, v === '__none__' ? '' : v)}
              disabled={!dataset.length}>
              <SelectTrigger className="text-xs h-7"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {opt && <SelectItem value="__none__">— None —</SelectItem>}
                {(key === 'isPeriod' || key === 'bsPeriod' || key === 'cfPeriod'
                  ? allH : numH).map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ThreeStatementLinkagePage({
  data, allHeaders, numericHeaders, fileName,
  onClearData, onExampleLoaded, sheets,
}: AnalysisPageProps) {

  const hasData = data.length > 0;

  // ── Sheet assignment ──────────────────────────────────────
  // Auto-detect sheet names containing IS / BS / CF keywords
  const detectedSheets = useMemo(() => {
    if (!sheets) return { is: [] as DataSet, bs: [] as DataSet, cf: [] as DataSet };
    const names = Object.keys(sheets);
    const find = (kws: string[]) => {
      const match = names.find(n => kws.some(k => n.toUpperCase().includes(k)));
      return match ? sheets[match] : ([] as DataSet);
    };
    return {
      is: find(['IS', '손익', 'INCOME', 'P&L', 'PL']),
      bs: find(['BS', '재무상태', 'BALANCE', 'SHEET']),
      cf: find(['CF', '현금흐름', 'CASH', 'FLOW']),
    };
  }, [sheets]);

  // If no multi-sheet, use the single data as fallback for all 3
  const [isSheet, setIsSheet] = useState<DataSet | null>(null);
  const [bsSheet, setBsSheet] = useState<DataSet | null>(null);
  const [cfSheet, setCfSheet] = useState<DataSet | null>(null);

  // Sheet source selector (when multi-sheet is available)
  const [isSource, setIsSource] = useState('auto');
  const [bsSource, setBsSource] = useState('auto');
  const [cfSource, setCfSource] = useState('auto');

  const sheetNames = sheets ? Object.keys(sheets) : [];

  const resolveSheet = (source: string, autoDs: DataSet): DataSet => {
    if (source === 'auto') return autoDs.length ? autoDs : data;
    if (source === 'single') return data;
    return sheets?.[source] ?? data;
  };

  const isData = resolveSheet(isSource, detectedSheets.is);
  const bsData = resolveSheet(bsSource, detectedSheets.bs);
  const cfData = resolveSheet(cfSource, detectedSheets.cf);

  // ── Column mapping ────────────────────────────────────────
  const [cols, setCols] = useState<Record<string, string>>({
    isPeriod: '', revenue: '', grossProfit: '', ebit: '', netIncome: '', interestExp: '', da: '',
    bsPeriod: '', totalAssets: '', cash: '', totalDebt: '', totalEquity: '', retainedEarnings: '',
    cfPeriod: '', operatingCF: '', capex: '', financingCF: '', fcf: '',
  });

  const setCol = useCallback((key: string, val: string) => {
    setCols(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── Auto-detect columns ───────────────────────────────────
  useMemo(() => {
    if (!hasData) return;
    const detect = (ds: DataSet, kws: string[], colKey: string) => {
      if (cols[colKey]) return;
      const h = getHeaders(ds).map(s => s.toLowerCase());
      let idx = h.findIndex(c => kws.some(k => c === k));
      if (idx === -1) idx = h.findIndex(c => kws.some(k => k.length > 2 && c.includes(k)));
      if (idx !== -1) setCols(prev => ({ ...prev, [colKey]: getHeaders(ds)[idx] }));
    };
    const AUTO = [
      [isData, ['period','year','quarter','date','fiscal'], 'isPeriod'],
      [bsData, ['period','year','quarter','date','fiscal'], 'bsPeriod'],
      [cfData, ['period','year','quarter','date','fiscal'], 'cfPeriod'],
      [isData, ['revenue','sales','net_sales','total_revenue'], 'revenue'],
      [isData, ['gross_profit','grossprofit','gross_margin_abs'], 'grossProfit'],
      [isData, ['ebit','operating_income','operating_profit'], 'ebit'],
      [isData, ['net_income','net_profit','earnings','profit_after_tax'], 'netIncome'],
      [isData, ['interest_expense','interest_paid','interest_cost'], 'interestExp'],
      [isData, ['da','depreciation','d&a','depreciation_amortization'], 'da'],
      [bsData, ['total_assets','assets'], 'totalAssets'],
      [bsData, ['cash','cash_equivalents','cash_and_equivalents'], 'cash'],
      [bsData, ['total_debt','debt','total_borrowings'], 'totalDebt'],
      [bsData, ['total_equity','equity','shareholders_equity'], 'totalEquity'],
      [bsData, ['retained_earnings','retained_profit','accumulated_earnings'], 'retainedEarnings'],
      [cfData, ['operating_cf','cfo','cash_from_operations','operating_cash'], 'operatingCF'],
      [cfData, ['capex','capital_expenditure','purchase_ppe','capex_net'], 'capex'],
      [cfData, ['financing_cf','cff','cash_from_financing'], 'financingCF'],
    ] as [DataSet, string[], string][];

    AUTO.forEach(([ds, kws, key]) => detect(ds, kws, key));
  }, [hasData, isData, bsData, cfData]);

  // ── Build linked rows ─────────────────────────────────────
  const linkedRows = useMemo(() => {
    if (!cols.isPeriod && !cols.bsPeriod && !cols.cfPeriod) return [];
    return buildLinkedRows(
      isData, cols.isPeriod,
      bsData, cols.bsPeriod,
      cfData, cols.cfPeriod,
      cols,
    );
  }, [isData, bsData, cfData, cols]);

  const unit = useMemo(() => autoUnit(linkedRows), [linkedRows]);

  const chartRows = useMemo(() =>
    linkedRows.map(r => ({
      ...r,
      revenueS:    scaleVal(r.revenue, unit),
      netIncomeS:  scaleVal(r.netIncome, unit),
      ebitS:       scaleVal(r.ebit, unit),
      totalAssetsS:scaleVal(r.totalAssets, unit),
      cashS:       scaleVal(r.cash, unit),
      totalEquityS:scaleVal(r.totalEquity, unit),
      netDebtS:    scaleVal(r.netDebt, unit),
      operatingCFS:scaleVal(r.operatingCF, unit),
      capexS:      r.capex !== null ? scaleVal(Math.abs(r.capex), unit) : null,
      fcfS:        scaleVal(r.fcf, unit),
    })),
    [linkedRows, unit]
  );

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!linkedRows.length) return null;
    const last  = linkedRows[linkedRows.length - 1];
    const first = linkedRows[0];
    const avgOcfNi = linkedRows.map(r => r.ocfVsNi).filter((v): v is number => v !== null)
      .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;
    return { last, first, periods: linkedRows.length, avgOcfNi };
  }, [linkedRows]);

  // ── Load example ──────────────────────────────────────────
  const handleLoadExample = useCallback(() => {
    const ex = generateExampleSheets();
    // Flatten: use IS as primary data, set virtual sheets
    onExampleLoaded?.(ex.is, 'example_3statement.csv');
    setIsSource('auto'); setBsSource('auto'); setCfSource('auto');
    // Directly set override sheets for example
    setIsSheet(ex.is); setBsSheet(ex.bs); setCfSheet(ex.cf);
    // Set columns
    setCols({
      isPeriod: 'period', revenue: 'revenue', grossProfit: 'gross_profit',
      ebit: 'ebit', netIncome: 'net_income', interestExp: 'interest_expense', da: 'da',
      bsPeriod: 'period', totalAssets: 'total_assets', cash: 'cash',
      totalDebt: 'total_debt', totalEquity: 'total_equity', retainedEarnings: 'retained_earnings',
      cfPeriod: 'period', operatingCF: 'operating_cf', capex: 'capex',
      financingCF: 'financing_cf', fcf: '',
    });
  }, [onExampleLoaded]);

  // Example override
  const effIsData = isSheet ?? isData;
  const effBsData = bsSheet ?? bsData;
  const effCfData = cfSheet ?? cfData;

  // Re-build using effective data
  const effLinkedRows = useMemo(() => {
    if (!cols.isPeriod && !cols.bsPeriod && !cols.cfPeriod) return [];
    return buildLinkedRows(effIsData, cols.isPeriod, effBsData, cols.bsPeriod, effCfData, cols.cfPeriod, cols);
  }, [effIsData, effBsData, effCfData, cols]);

  const effUnit = useMemo(() => autoUnit(effLinkedRows), [effLinkedRows]);

  const effChartRows = useMemo(() =>
    effLinkedRows.map(r => ({
      ...r,
      revenueS:    scaleVal(r.revenue, effUnit),
      netIncomeS:  scaleVal(r.netIncome, effUnit),
      ebitS:       scaleVal(r.ebit, effUnit),
      totalAssetsS:scaleVal(r.totalAssets, effUnit),
      cashS:       scaleVal(r.cash, effUnit),
      totalEquityS:scaleVal(r.totalEquity, effUnit),
      netDebtS:    scaleVal(r.netDebt, effUnit),
      operatingCFS:scaleVal(r.operatingCF, effUnit),
      capexAbsS:   r.capex !== null ? scaleVal(Math.abs(r.capex), effUnit) : null,
      fcfS:        scaleVal(r.fcf, effUnit),
    })),
    [effLinkedRows, effUnit]
  );

  const effStats = useMemo(() => {
    if (!effLinkedRows.length) return null;
    const last  = effLinkedRows[effLinkedRows.length - 1];
    const first = effLinkedRows[0];
    const ocfNiVals = effLinkedRows.map(r => r.ocfVsNi).filter((v): v is number => v !== null);
    const avgOcfNi  = ocfNiVals.length ? ocfNiVals.reduce((a, b) => a + b, 0) / ocfNiVals.length : null;
    return { last, first, periods: effLinkedRows.length, avgOcfNi };
  }, [effLinkedRows]);

  const isConfigured = effLinkedRows.length > 0;
  const isExample    = (fileName ?? '').startsWith('example_');
  const displayFileName = fileName || 'Uploaded file';

  // ── UI state ──────────────────────────────────────────────
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast }  = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleClearAll = useCallback(() => {
    setIsSheet(null); setBsSheet(null); setCfSheet(null);
    setCols({ isPeriod:'',revenue:'',grossProfit:'',ebit:'',netIncome:'',interestExp:'',da:'',
      bsPeriod:'',totalAssets:'',cash:'',totalDebt:'',totalEquity:'',retainedEarnings:'',
      cfPeriod:'',operatingCF:'',capex:'',financingCF:'',fcf:'' });
    if (onClearData) onClearData();
  }, [onClearData]);

  const handleDownloadCSV = useCallback(() => {
    if (!effLinkedRows.length) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([Papa.unparse(effLinkedRows)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `3Statement_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'CSV Downloaded' });
  }, [effLinkedRows, toast]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: 'Generating image...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `3Statement_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: 'Download complete' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  if (!hasData && !isSheet) return <IntroPage onLoadExample={handleLoadExample} />;

  const colGroups: ColGroup[] = [
    { label: 'IS — Income Statement', color: IS_COLOR, fields: [
      { key: 'isPeriod',    label: 'PERIOD *',       opt: false },
      { key: 'revenue',     label: 'REVENUE',        opt: true  },
      { key: 'grossProfit', label: 'GROSS PROFIT',   opt: true  },
      { key: 'ebit',        label: 'EBIT',           opt: true  },
      { key: 'netIncome',   label: 'NET INCOME',     opt: true  },
      { key: 'interestExp', label: 'INTEREST EXP.',  opt: true  },
      { key: 'da',          label: 'D&A',            opt: true  },
    ]},
    { label: 'BS — Balance Sheet', color: BS_COLOR, fields: [
      { key: 'bsPeriod',        label: 'PERIOD *',         opt: false },
      { key: 'totalAssets',     label: 'TOTAL ASSETS',     opt: true  },
      { key: 'cash',            label: 'CASH',             opt: true  },
      { key: 'totalDebt',       label: 'TOTAL DEBT',       opt: true  },
      { key: 'totalEquity',     label: 'TOTAL EQUITY',     opt: true  },
      { key: 'retainedEarnings',label: 'RETAINED EARN.',   opt: true  },
    ]},
    { label: 'CF — Cash Flow', color: CF_COLOR, fields: [
      { key: 'cfPeriod',    label: 'PERIOD *',      opt: false },
      { key: 'operatingCF', label: 'OPERATING CF',  opt: true  },
      { key: 'capex',       label: 'CAPEX',         opt: true  },
      { key: 'financingCF', label: 'FINANCING CF',  opt: true  },
    ]},
  ];

  return (
    <div className="flex flex-col gap-4 flex-1 max-w-5xl mx-auto w-full px-4">

      {/* ── File Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{displayFileName}</span>
          {sheetNames.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {sheetNames.map(n => (
                <span key={n} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{n}</span>
              ))}
            </div>
          )}
          {isExample && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold whitespace-nowrap">Example</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => setPreviewOpen(true)} title="Preview data"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={() => {
              const csv = Papa.unparse(data);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = displayFileName.replace(/\.csv$/, '') + '_raw.csv';
              link.click();
              toast({ title: 'Raw data downloaded' });
            }} title="Download raw CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-700"
            onClick={handleClearAll} title="Close"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Data Preview Modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />{displayFileName}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0 rounded-md border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  {allHeaders.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    {allHeaders.map(h => (
                      <td key={h} className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">{String(row[h] ?? '-')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Phase 4</span>
            <span className="text-xs text-muted-foreground">Financial Analysis</span>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />3-Statement Linkage
          </CardTitle>
          <CardDescription>
            Organic linkage of IS · BS · CF — analyze earnings quality, cash conversion, and capital efficiency.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Configuration ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            {sheetNames.length > 1
              ? `${sheetNames.length} sheets detected (${sheetNames.join(', ')}) — assign each sheet to IS / BS / CF below.`
              : 'Map the period column and item columns for each statement. Upload a multi-sheet xlsx to auto-detect sheets.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Sheet source selectors (only when multi-sheet available) */}
          {sheetNames.length > 1 && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              {[
                { label: 'IS Sheet', value: isSource, setter: setIsSource, color: IS_COLOR },
                { label: 'BS Sheet', value: bsSource, setter: setBsSource, color: BS_COLOR },
                { label: 'CF Sheet', value: cfSource, setter: setCfSource, color: CF_COLOR },
              ].map(({ label, value, setter, color }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs font-bold" style={{ color }}>{label}</Label>
                  <Select value={value} onValueChange={setter}>
                    <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="single">Use single dataset</SelectItem>
                      {sheetNames.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Column mapping per statement */}
          {colGroups.map((group, gi) => (
            <div key={gi}>
              <ColMapper
                group={group}
                dataset={gi === 0 ? effIsData : gi === 1 ? effBsData : effCfData}
                values={cols}
                onChange={setCol}
              />
              {gi < colGroups.length - 1 && <div className="border-t border-slate-100 mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Export ── */}
      {isConfigured && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />CSV (Linked Table)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Summary Tiles ── */}
      {isConfigured && effStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">OCF / Net Income</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {effStats.last.ocfVsNi !== null ? `${effStats.last.ocfVsNi.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {effStats.last.ocfVsNi !== null
                ? effStats.last.ocfVsNi >= 1.2 ? 'Strong earnings quality'
                : effStats.last.ocfVsNi >= 0.8 ? 'Normal range'
                : 'Low cash vs earnings'
                : 'OCF or NI not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">CF Conversion</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {effStats.last.cfConversion !== null ? `${effStats.last.cfConversion.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {effStats.last.cfConversion !== null
                ? effStats.last.cfConversion >= 90 ? 'Strong EBIT→OCF conversion'
                : effStats.last.cfConversion >= 70 ? 'Moderate'
                : 'Low conversion — check working capital'
                : 'EBIT or OCF not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ROAE</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {effStats.last.roae !== null ? `${effStats.last.roae.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {effStats.last.roae !== null
                ? effStats.last.roae >= 15 ? 'Strong capital efficiency'
                : effStats.last.roae >= 8  ? 'Adequate'
                : 'Low return on equity'
                : 'NI or Equity not mapped'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Capex / D&A</div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {effStats.last.capexVsDa !== null ? `${effStats.last.capexVsDa.toFixed(2)}×` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {effStats.last.capexVsDa !== null
                ? effStats.last.capexVsDa >= 1.5 ? 'Active growth investment'
                : effStats.last.capexVsDa >= 1.0 ? 'Maintenance level'
                : 'Below depreciation level'
                : 'Capex or D&A not mapped'}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div ref={resultsRef} className="space-y-4 bg-background rounded-lg">

        {/* ── Chart 1: IS — Revenue / NI / EBIT ── */}
        {isConfigured && effChartRows.some(r => r.revenueS !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: IS_COLOR }} />
                Income Statement
              </CardTitle>
              <CardDescription>
                Violet = Revenue · Dashed = EBIT · Solid = Net Income{effUnit ? ` · Unit: ${effUnit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={effChartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${effUnit}`} />
                  <Tooltip content={<GenTooltip unit={effUnit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {effChartRows.some(r => r.revenueS !== null) && (
                    <Bar dataKey="revenueS" name="Revenue" fill={IS_COLOR} fillOpacity={0.75} maxBarSize={32} radius={[3,3,0,0]} />
                  )}
                  {effChartRows.some(r => r.ebitS !== null) && (
                    <Line dataKey="ebitS" name="EBIT" stroke={WARN_COLOR} strokeWidth={2}
                      strokeDasharray="5 3" dot={{ r: 3, fill: WARN_COLOR }} connectNulls />
                  )}
                  {effChartRows.some(r => r.netIncomeS !== null) && (
                    <Line dataKey="netIncomeS" name="Net Income" stroke="#1E293B" strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#1E293B' }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 2: BS — Assets / Equity / Net Debt ── */}
        {isConfigured && effChartRows.some(r => r.totalAssetsS !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: BS_COLOR }} />
                Balance Sheet
              </CardTitle>
              <CardDescription>
                Blue bars = Total Assets · Solid = Total Equity · Dashed = Net Debt (Debt − Cash){effUnit ? ` · Unit: ${effUnit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={effChartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${effUnit}`} />
                  <Tooltip content={<GenTooltip unit={effUnit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="totalAssetsS" name="Total Assets" fill={BS_COLOR} fillOpacity={0.75} maxBarSize={32} radius={[3,3,0,0]} />
                  {effChartRows.some(r => r.totalEquityS !== null) && (
                    <Line dataKey="totalEquityS" name="Total Equity" stroke="#1E293B" strokeWidth={2}
                      dot={{ r: 3, fill: '#1E293B' }} connectNulls />
                  )}
                  {effChartRows.some(r => r.netDebtS !== null) && (
                    <Line dataKey="netDebtS" name="Net Debt" stroke={NEG_COLOR} strokeWidth={2}
                      strokeDasharray="5 3" dot={{ r: 2.5, fill: NEG_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 3: CF — OCF / FCF / Capex ── */}
        {isConfigured && effChartRows.some(r => r.operatingCFS !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: CF_COLOR }} />
                Cash Flow
              </CardTitle>
              <CardDescription>
                Green bars = Operating CF · Solid = FCF (OCF − Capex) · Red bars = Capex (absolute){effUnit ? ` · Unit: ${effUnit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={effChartRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={56}
                    tickFormatter={v => `${v.toFixed(0)}${effUnit}`} />
                  <Tooltip content={<GenTooltip unit={effUnit} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Bar dataKey="operatingCFS" name="Operating CF" fill={CF_COLOR} fillOpacity={0.8} maxBarSize={28} radius={[3,3,0,0]} />
                  {effChartRows.some(r => r.capexAbsS !== null) && (
                    <Bar dataKey="capexAbsS" name="Capex (abs)" fill={NEG_COLOR} fillOpacity={0.6} maxBarSize={28} radius={[3,3,0,0]} />
                  )}
                  {effChartRows.some(r => r.fcfS !== null) && (
                    <Line dataKey="fcfS" name="FCF" stroke="#1E293B" strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#1E293B' }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Chart 4: Linkage Ratios ── */}
        {isConfigured && effChartRows.some(r => r.ocfVsNi !== null || r.cfConversion !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Linkage Quality Ratios</CardTitle>
              <CardDescription>
                Violet = OCF/NI (earnings quality, left axis) · Green = CF Conversion % (right axis) · 1× / 100% reference lines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={effChartRows} margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }} interval={0} />
                  <YAxis yAxisId="ratio" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false}
                    axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(1)}×`} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickLine={false} axisLine={false} width={40}
                    tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip content={<GenTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine yAxisId="ratio" y={1} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1}
                    label={{ value: '1×', position: 'insideLeft', fontSize: 9, fill: '#94A3B8' }} />
                  <ReferenceLine yAxisId="pct" y={100} stroke="#CBD5E1" strokeDasharray="3 4" strokeWidth={1}
                    label={{ value: '100%', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
                  {effChartRows.some(r => r.ocfVsNi !== null) && (
                    <Line yAxisId="ratio" dataKey="ocfVsNi" name="OCF/NI"
                      stroke={IS_COLOR} strokeWidth={2.5}
                      dot={{ r: 3.5, fill: IS_COLOR }} connectNulls />
                  )}
                  {effChartRows.some(r => r.cfConversion !== null) && (
                    <Line yAxisId="pct" dataKey="cfConversion" name="CF Conversion %"
                      stroke={CF_COLOR} strokeWidth={2} strokeDasharray="5 3"
                      dot={{ r: 3, fill: CF_COLOR }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Linkage Table ── */}
        {isConfigured && effLinkedRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />3-Statement Linkage Table
              </CardTitle>
              <CardDescription>Key linkage metrics by period — newest first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {['Period',
                        ...(effLinkedRows.some(r => r.niMargin !== null)     ? ['NI Margin'] : []),
                        ...(effLinkedRows.some(r => r.ocfVsNi !== null)      ? ['OCF/NI'] : []),
                        ...(effLinkedRows.some(r => r.cfConversion !== null) ? ['CF Conv.'] : []),
                        ...(effLinkedRows.some(r => r.capexVsDa !== null)    ? ['Capex/D&A'] : []),
                        ...(effLinkedRows.some(r => r.roae !== null)         ? ['ROAE'] : []),
                        ...(effLinkedRows.some(r => r.roaa !== null)         ? ['ROAA'] : []),
                        ...(effLinkedRows.some(r => r.debtEquity !== null)   ? ['D/E'] : []),
                        ...(effLinkedRows.some(r => r.netDebt !== null)      ? ['Net Debt'] : []),
                      ].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...effLinkedRows].reverse().map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.period}</td>
                        {effLinkedRows.some(p => p.niMargin !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.niMargin !== null ? `${r.niMargin.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        {effLinkedRows.some(p => p.ocfVsNi !== null) && (
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {r.ocfVsNi !== null ? `${r.ocfVsNi.toFixed(2)}×` : '—'}
                          </td>
                        )}
                        {effLinkedRows.some(p => p.cfConversion !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.cfConversion !== null ? `${r.cfConversion.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        {effLinkedRows.some(p => p.capexVsDa !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.capexVsDa !== null ? `${r.capexVsDa.toFixed(2)}×` : '—'}
                          </td>
                        )}
                        {effLinkedRows.some(p => p.roae !== null) && (
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {r.roae !== null ? `${r.roae.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        {effLinkedRows.some(p => p.roaa !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.roaa !== null ? `${r.roaa.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        {effLinkedRows.some(p => p.debtEquity !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.debtEquity !== null ? `${r.debtEquity.toFixed(2)}×` : '—'}
                          </td>
                        )}
                        {effLinkedRows.some(p => p.netDebt !== null) && (
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {r.netDebt !== null ? r.netDebt.toFixed(0) : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Insights ── */}
        {isConfigured && effStats && (() => {
          const { last, first, avgOcfNi } = effStats;

          const ocfNiTrend = (() => {
            const vals = effLinkedRows.map(r => r.ocfVsNi).filter((v): v is number => v !== null);
            return vals.length >= 2 ? vals[vals.length - 1] - vals[0] : null;
          })();

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />Insights — 3-Statement Linkage Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">3-Statement Overview</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    <span className="font-semibold">{first.period}</span> ~{' '}
                    <span className="font-semibold">{last.period}</span> ({effStats.periods} periods).
                    {last.ocfVsNi !== null && <> Latest OCF/NI: <span className="font-semibold">{last.ocfVsNi.toFixed(2)}×</span>.</>}
                    {last.cfConversion !== null && <> CF Conversion: <span className="font-semibold">{last.cfConversion.toFixed(1)}%</span>.</>}
                    {last.roae !== null && <> ROAE: <span className="font-semibold">{last.roae.toFixed(1)}%</span>.</>}
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detailed Analysis</p>

                  {last.ocfVsNi !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Earnings Quality — OCF/NI {last.ocfVsNi.toFixed(2)}×</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.ocfVsNi >= 1.5
                            ? `OCF is ${last.ocfVsNi.toFixed(2)}× net income — excellent earnings quality. More cash is generated from operations than reported profit, indicating conservative accounting and strong working capital management.`
                            : last.ocfVsNi >= 0.8
                            ? `OCF/NI of ${last.ocfVsNi.toFixed(2)}× is within normal range. Net income and cash flow are reasonably aligned.`
                            : last.ocfVsNi >= 0.5
                            ? `OCF/NI of ${last.ocfVsNi.toFixed(2)}× is somewhat low. Cash generation lags reported earnings — check for rising receivables or inventory build-up.`
                            : `OCF/NI of ${last.ocfVsNi.toFixed(2)}× is at a concerning level. Cash significantly trails earnings — there may be structural issues with earnings-to-cash conversion.`}
                          {ocfNiTrend !== null && (
                            <> The trend is {ocfNiTrend > 0.1 ? 'improving' : ocfNiTrend < -0.1 ? 'deteriorating' : 'stable'} ({ocfNiTrend >= 0 ? '+' : ''}{ocfNiTrend.toFixed(2)}×, {first.period}→{last.period}).</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {last.cfConversion !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">CF Conversion — {last.cfConversion.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.cfConversion >= 100
                            ? `OCF is ${last.cfConversion.toFixed(0)}% of EBIT — non-cash charges such as D&A boost cash flow above operating profit. The IS→CF linkage is healthy.`
                            : last.cfConversion >= 70
                            ? `CF Conversion of ${last.cfConversion.toFixed(0)}% is adequate. Most of EBIT is being converted to cash.`
                            : `CF Conversion of ${last.cfConversion.toFixed(0)}% is low. Working capital growth (receivables, inventory) or deferred revenue recognition may be absorbing cash.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {last.capexVsDa !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Capex / D&A — {last.capexVsDa.toFixed(2)}×</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.capexVsDa >= 2.0
                            ? `Capex is ${last.capexVsDa.toFixed(1)}× D&A — the company is investing actively for growth. New investment well above depreciation expands the future asset base but pressures near-term FCF.`
                            : last.capexVsDa >= 1.0
                            ? `Capex/D&A of ${last.capexVsDa.toFixed(2)}× is at a maintenance level — investment is roughly replacing existing assets.`
                            : `Capex is below D&A (${last.capexVsDa.toFixed(2)}×). The asset base may be aging — additional investment may be needed to sustain future capacity.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {last.roae !== null && (
                    <div className="flex gap-3 items-start">
                      <div className="w-0.5 min-h-[40px] rounded-full bg-primary/30 shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">Capital Efficiency — ROAE {last.roae.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {last.roae >= 20
                            ? `ROAE of ${last.roae.toFixed(1)}% is excellent — the IS (net income) and BS (equity) linkage is working efficiently.`
                            : last.roae >= 10
                            ? `ROAE of ${last.roae.toFixed(1)}% is healthy — generating adequate net income relative to equity capital.`
                            : last.roae >= 0
                            ? `ROAE of ${last.roae.toFixed(1)}% is low — capital utilization efficiency needs improvement.`
                            : `ROAE is negative — equity is being eroded by losses.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3 leading-relaxed">
                  ※ OCF/NI: Operating Cash Flow ÷ Net Income (cash earnings quality; ≥1× is healthy).
                  CF Conversion: OCF ÷ EBIT × 100% (EBIT-to-cash conversion rate).
                  Capex/D&amp;A: Capital Expenditure ÷ Depreciation &amp; Amortization (&gt;1× = growth investment).
                  ROAE: Net Income ÷ Equity × 100%. FCF = OCF − |Capex|.
                  This analysis is for reference only and does not constitute investment advice.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
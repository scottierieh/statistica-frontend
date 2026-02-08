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
  Shield, Zap, Target, BarChart3, Eye, TrendingUp, DollarSign, Users, Activity
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, Line,
  ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CreditRow {
  borrower_id: string;
  borrower_name: string;
  exposure: number;       // EAD in $K
  pd: number;             // probability of default 0–1
  lgd: number;            // loss given default 0–1
  expected_loss: number;  // PD × LGD × EAD
  rating: string;         // AAA, AA, A, BBB, BB, B, CCC, D
  sector: string;
  maturity: number;       // years
  collateral: number;     // $K
  status: string;         // Performing / Watch / Default
}

interface CreditPageProps {
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

const RATING_ORDER = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];
const RATING_COLORS: Record<string, string> = {
  AAA: 'bg-green-600 text-white', AA: 'bg-green-500 text-white', A: 'bg-green-100 text-green-800',
  BBB: 'bg-amber-100 text-amber-800', BB: 'bg-amber-200 text-amber-900',
  B: 'bg-red-100 text-red-800', CCC: 'bg-red-200 text-red-900', D: 'bg-red-600 text-white',
};
const STATUS_COLORS: Record<string, string> = {
  performing: 'bg-green-100 text-green-700', watch: 'bg-amber-100 text-amber-700',
  default: 'bg-red-100 text-red-700', restructured: 'bg-blue-100 text-blue-700',
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  Math.abs(n) >= 1 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}K` :
  n.toFixed(2);
const fmtP = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${(n * 100).toFixed(2)}%`;
const fmtPct = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parseCreditData(rows: Record<string, any>[]): CreditRow[] | null {
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

  // Detect PD scale: if max > 1, assume percentage
  const pds = rows.map(r => getN(r, 'pd', 'probability_of_default', 'prob_default', 'default_prob')).filter(p => p > 0);
  const maxPd = pds.length > 0 ? Math.max(...pds) : 0;
  const isPdPct = maxPd > 1;

  const lgds = rows.map(r => getN(r, 'lgd', 'loss_given_default', 'loss_rate')).filter(l => l > 0);
  const maxLgd = lgds.length > 0 ? Math.max(...lgds) : 0;
  const isLgdPct = maxLgd > 1;

  const items: CreditRow[] = rows.map((row, i) => {
    let pd = getN(row, 'pd', 'probability_of_default', 'prob_default', 'default_prob');
    if (isPdPct && pd > 0) pd = pd / 100;
    if (pd > 1) pd = 1;

    let lgd = getN(row, 'lgd', 'loss_given_default', 'loss_rate');
    if (isLgdPct && lgd > 0) lgd = lgd / 100;
    if (lgd > 1) lgd = 1;
    if (lgd === 0) lgd = 0.45; // Basel default

    const exposure = getN(row, 'exposure', 'ead', 'loan_amount', 'amount', 'balance', 'outstanding');
    const el = pd * lgd * exposure;

    const rawRating = get(row, 'rating', 'grade', 'credit_rating').toUpperCase();
    const rating = RATING_ORDER.includes(rawRating) ? rawRating : (pd >= 0.15 ? 'CCC' : pd >= 0.08 ? 'B' : pd >= 0.04 ? 'BB' : pd >= 0.02 ? 'BBB' : pd >= 0.005 ? 'A' : pd >= 0.001 ? 'AA' : 'AAA');

    const rawStatus = get(row, 'status', 'state', 'performance').toLowerCase();
    const status = ['performing', 'watch', 'default', 'restructured'].includes(rawStatus) ? rawStatus : (pd >= 0.15 ? 'default' : pd >= 0.05 ? 'watch' : 'performing');

    return {
      borrower_id: get(row, 'borrower_id', 'id', 'loan_id', 'account') || `B${String(i + 1).padStart(3, '0')}`,
      borrower_name: get(row, 'borrower_name', 'name', 'borrower', 'company', 'counterparty') || `Borrower ${i + 1}`,
      exposure,
      pd,
      lgd,
      expected_loss: el,
      rating,
      sector: get(row, 'sector', 'industry', 'segment') || 'Other',
      maturity: getN(row, 'maturity', 'term', 'tenor') || 3,
      collateral: getN(row, 'collateral', 'security', 'guarantee'),
      status,
    };
  }).filter(r => r.borrower_name && r.exposure > 0);

  return items.length > 0 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `borrower_id,borrower_name,sector,exposure,pd,lgd,rating,maturity,collateral,status
B001,Apex Manufacturing,Manufacturing,12500,0.012,0.45,A,5,8000,Performing
B002,Global Logistics Inc,Transportation,8200,0.025,0.40,BBB,3,3500,Performing
B003,TechVenture Labs,Technology,15000,0.035,0.55,BBB,4,2000,Performing
B004,Metro Retail Group,Retail,6800,0.048,0.50,BB,3,4200,Watch
B005,GreenEnergy Solutions,Energy,9500,0.015,0.35,A,7,7000,Performing
B006,Pacific Seafood Corp,Agriculture,3200,0.065,0.60,BB,2,1500,Watch
B007,Stellar Media Holdings,Media,7400,0.022,0.45,BBB,4,3000,Performing
B008,Atlas Construction,Construction,11000,0.040,0.50,BB,5,6500,Performing
B009,Premier Healthcare,Healthcare,18000,0.008,0.30,AA,6,12000,Performing
B010,Horizon Real Estate,Real Estate,22000,0.018,0.40,A,8,18000,Performing
B011,QuickServe Foods,Food & Beverage,4500,0.030,0.45,BBB,3,2000,Performing
B012,DataStream Analytics,Technology,5800,0.055,0.55,BB,2,1000,Watch
B013,Silverline Pharma,Healthcare,14000,0.010,0.35,A,5,9000,Performing
B014,NexGen Telecom,Telecommunications,8800,0.020,0.40,BBB,4,4500,Performing
B015,Pioneer Mining,Mining,6200,0.075,0.60,B,3,3800,Watch
B016,Coastal Shipping Ltd,Transportation,5500,0.032,0.45,BBB,3,2500,Performing
B017,UrbanDev Properties,Real Estate,16000,0.028,0.42,BBB,6,11000,Performing
B018,CrystalTech Solutions,Technology,3800,0.120,0.65,B,2,500,Watch
B019,Midwest Agri Corp,Agriculture,7200,0.042,0.50,BB,4,4000,Performing
B020,Summit Financial,Financial Services,25000,0.005,0.25,AA,5,20000,Performing`;

function buildDefaultCredits(): CreditRow[] {
  const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true });
  return parseCreditData(result.data as Record<string, any>[]) || [];
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "PD (Probability of Default)": "Likelihood a borrower will default within a given time horizon, expressed as 0–1 or percentage.",
  "LGD (Loss Given Default)": "Percentage of exposure lost if default occurs, after recovery (collateral, restructuring).",
  "EAD (Exposure at Default)": "Total amount owed at the time of default, in $K.",
  "Expected Loss (EL)": "PD × LGD × EAD — the statistically expected credit loss.",
  "Credit Rating": "Assessment of creditworthiness: AAA (lowest risk) to D (default). Maps to PD ranges.",
  "Collateral": "Assets pledged as security. Reduces LGD by providing recovery in default.",
  "Sector Concentration": "Over-exposure to a single industry increases portfolio correlation risk.",
  "Risk-Weighted Assets": "EAD adjusted by risk weight based on rating. Higher risk = more capital required.",
  "Provision Coverage": "Expected Loss ÷ Total Exposure. The % of portfolio that should be provisioned.",
  "Watch List": "Borrowers showing early warning signs but not yet in default.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Credit Risk Glossary</DialogTitle>
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

const CreditGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Credit Risk Modeling Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">
          <div>
            <h3 className="font-semibold text-primary mb-2">What is Credit Risk Modeling?</h3>
            <p className="text-sm text-muted-foreground">Quantitative assessment of the probability and magnitude of losses from borrower defaults. Upload your loan portfolio and the tool calculates Expected Loss (EL = PD × LGD × EAD), analyzes rating distributions, sector concentrations, and generates risk-weighted metrics aligned with Basel framework principles.</p>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Upload Portfolio', desc: 'Provide borrower data with exposure, PD, LGD. Rating and sector are optional (auto-derived if missing).' },
                { step: '2', title: 'Expected Loss Calculation', desc: 'EL = PD × LGD × EAD for each borrower. Portfolio EL = sum of individual ELs.' },
                { step: '3', title: 'Rating Distribution', desc: 'Analyze portfolio quality: investment grade (AAA–BBB) vs speculative (BB–D) concentration.' },
                { step: '4', title: 'Sector Concentration', desc: 'Identify over-exposure to specific industries. Diversification reduces correlated defaults.' },
                { step: '5', title: 'Risk Metrics & Report', desc: 'Provision coverage, weighted-average PD/LGD, top exposures, watch list, and exportable report.' },
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
                    ['Expected Loss', 'PD × LGD × EAD', 'Average loss per borrower'],
                    ['Portfolio EL', 'Σ(PD × LGD × EAD)', 'Total expected credit losses'],
                    ['Provision Coverage', 'Portfolio EL ÷ Total Exposure', 'Required provision rate'],
                    ['Weighted Avg PD', 'Σ(PD × EAD) ÷ Σ(EAD)', 'Portfolio-level default probability'],
                    ['Weighted Avg LGD', 'Σ(LGD × EAD) ÷ Σ(EAD)', 'Portfolio-level loss severity'],
                    ['Collateral Coverage', 'Σ(Collateral) ÷ Σ(Exposure)', 'Security coverage ratio'],
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
          <div>
            <h3 className="font-semibold text-primary mb-3">Rating Scale</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {RATING_ORDER.map(r => (
                <div key={r} className="text-center">
                  <Badge className={`text-xs ${RATING_COLORS[r] || ''}`}>{r}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{r === 'AAA' ? '<0.1%' : r === 'AA' ? '0.1–0.5%' : r === 'A' ? '0.5–2%' : r === 'BBB' ? '2–4%' : r === 'BB' ? '4–8%' : r === 'B' ? '8–15%' : r === 'CCC' ? '15–30%' : '>30%'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• PD can be 0–1 decimal or 0–100% — the parser auto-detects the scale.</li>
              <li>• If LGD is missing, <strong>Basel default of 45%</strong> is applied (senior unsecured).</li>
              <li>• Ratings are auto-derived from PD if not provided in the CSV.</li>
              <li>• Focus on <strong>top 10 exposures</strong> — concentration risk is often the biggest threat.</li>
              <li>• Sector diversification matters: correlated defaults amplify losses beyond EL.</li>
              <li>• Export for regulatory reporting, IFRS 9 provisioning, or board presentations.</li>
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
          <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CSV Format Guide — Credit Portfolio</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Upload a CSV with your loan/credit portfolio. Column names matched case-insensitively. Amounts in <strong>$K</strong>.</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50"><th className="p-1.5 text-left">borrower_id</th><th className="p-1.5 text-left">borrower_name</th><th className="p-1.5 text-left">sector</th><th className="p-1.5 text-right">exposure</th><th className="p-1.5 text-right">pd</th><th className="p-1.5 text-right">lgd</th><th className="p-1.5 text-left">rating</th><th className="p-1.5 text-right">collateral</th><th className="p-1.5 text-left">status</th></tr></thead>
              <tbody>
                {[
                  ['B001', 'Apex Mfg', 'Manufacturing', '12500', '0.012', '0.45', 'A', '8000', 'Performing'],
                  ['B002', 'Global Logistics', 'Transportation', '8200', '0.025', '0.40', 'BBB', '3500', 'Performing'],
                  ['B003', 'TechVenture', 'Technology', '15000', '0.035', '0.55', 'BBB', '2000', 'Watch'],
                ].map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>{row.map((c, j) => <td key={j} className={`p-1.5 ${[3,4,5,7].includes(j) ? 'text-right font-mono' : ''}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Badge className="bg-primary text-primary-foreground text-xs">Required</Badge> Minimum Columns</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {['borrower_name', 'exposure', 'pd', 'lgd'].map(col => (
                <div key={col} className="p-2 rounded border bg-primary/5 text-center"><span className="font-mono text-xs font-semibold">{col}</span></div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">All Columns</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: 'borrower_id', desc: 'Unique identifier' },
                { name: 'borrower_name', desc: 'Company/individual name' },
                { name: 'exposure', desc: 'Loan amount / EAD in $K' },
                { name: 'pd', desc: '0–1 decimal or 0–100% (auto-detected)' },
                { name: 'lgd', desc: '0–1 decimal (default 0.45 if missing)' },
                { name: 'rating', desc: 'AAA to D (auto-derived from PD if missing)' },
                { name: 'sector', desc: 'Industry / segment' },
                { name: 'maturity', desc: 'Loan term in years' },
                { name: 'collateral', desc: 'Pledged security in $K' },
                { name: 'status', desc: 'Performing / Watch / Default' },
              ].map(({ name, desc }) => (
                <div key={name} className="p-2 rounded border bg-muted/20">
                  <span className="font-mono text-xs font-semibold">{name}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_credit_portfolio.csv'; a.click(); }}>
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
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Shield className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Credit Risk Modeling</CardTitle>
          <CardDescription className="text-base mt-2">Evaluate the probability of default and potential credit losses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Target, title: 'Expected Loss', desc: 'PD × LGD × EAD calculation per borrower and portfolio-level' },
              { icon: BarChart3, title: 'Portfolio Analysis', desc: 'Rating distribution, sector concentration, risk metrics' },
              { icon: Eye, title: 'Watch List', desc: 'Identify high-risk exposures and concentration risks' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-2">
                <CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Upload */}
            <Card className={`border-2 transition-all ${hasData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`}
              onClick={() => { if (!hasData) document.getElementById('credit-csv-upload')?.click(); }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Upload Credit Portfolio</CardTitle><CardDescription className="text-xs">CSV with loan data</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Credit data detected</span></div>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('credit-csv-reup')?.click()}>
                      Upload different file
                      <input id="credit-csv-reup" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with borrower exposure, PD, and LGD data.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required:</p>
                      <p>borrower_name | exposure | pd | lgd</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); onFormatGuide(); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>
                    {parseError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p>
                      </div>
                    )}
                  </>
                )}
                <input id="credit-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
              </CardContent>
            </Card>
            {/* Sample */}
            <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                  <div><CardTitle className="text-base">Sample Portfolio</CardTitle><CardDescription className="text-xs">20 borrowers, 10 sectors</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Pre-loaded diversified portfolio with ratings from AA to B across 10 industry sectors.</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {['20 borrowers', '10 sectors', 'AAA–B ratings', 'EL calculation'].map(f => (
                    <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>
                  ))}
                </div>
                <Button onClick={onStartSample} className="w-full" size="lg"><Shield className="w-4 h-4 mr-2" />Load Sample Portfolio</Button>
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

export default function CreditRiskPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: CreditPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [pendingCredits, setPendingCredits] = useState<CreditRow[]>(() => {
    if (data && data.length > 0) {
      const parsed = parseCreditData(data);
      if (parsed && parsed.length > 0) return parsed;
    }
    return [];
  });
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (data && data.length > 0) {
      const parsed = parseCreditData(data);
      if (parsed && parsed.length > 0) { setPendingCredits(parsed); setParseError(null); }
    }
  }, [data]);

  const handleFileUpload = useCallback((file: File) => {
    setParseError(null);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as Record<string, any>[];
        const parsed = parseCreditData(rows);
        if (parsed && parsed.length > 0) {
          setPendingCredits(parsed); setParseError(null);
          toast({ title: 'Imported', description: `${parsed.length} borrowers detected.` });
        } else {
          const cols = Object.keys(rows[0] || {}).join(', ');
          setParseError(`Could not parse. Columns: [${cols}]. Need borrower_name + exposure.`);
        }
      },
      error: () => setParseError('Failed to read CSV.'),
    });
  }, [toast]);

  const handleStartWithData = useCallback(() => {
    if (pendingCredits.length > 0) { setCredits(pendingCredits); setShowIntro(false); }
  }, [pendingCredits]);
  const handleLoadSample = useCallback(() => { setCredits(buildDefaultCredits()); setShowIntro(false); }, []);

  // ── Analytics ──
  const n = credits.length;
  const totalExposure = useMemo(() => credits.reduce((s, c) => s + c.exposure, 0), [credits]);
  const totalEL = useMemo(() => credits.reduce((s, c) => s + c.expected_loss, 0), [credits]);
  const totalCollateral = useMemo(() => credits.reduce((s, c) => s + c.collateral, 0), [credits]);
  const provisionRate = totalExposure > 0 ? (totalEL / totalExposure) * 100 : 0;
  const waPD = useMemo(() => totalExposure > 0 ? credits.reduce((s, c) => s + c.pd * c.exposure, 0) / totalExposure : 0, [credits, totalExposure]);
  const waLGD = useMemo(() => totalExposure > 0 ? credits.reduce((s, c) => s + c.lgd * c.exposure, 0) / totalExposure : 0, [credits, totalExposure]);
  const collateralCoverage = totalExposure > 0 ? (totalCollateral / totalExposure) * 100 : 0;

  const sorted = useMemo(() => [...credits].sort((a, b) => b.expected_loss - a.expected_loss), [credits]);

  const ratingData = useMemo(() => RATING_ORDER.map(r => {
    const group = credits.filter(c => c.rating === r);
    return { rating: r, count: group.length, exposure: group.reduce((s, c) => s + c.exposure, 0), el: group.reduce((s, c) => s + c.expected_loss, 0) };
  }).filter(d => d.count > 0), [credits]);

  const sectorData = useMemo(() => {
    const map: Record<string, { count: number; exposure: number; el: number }> = {};
    credits.forEach(c => {
      if (!map[c.sector]) map[c.sector] = { count: 0, exposure: 0, el: 0 };
      map[c.sector].count++;
      map[c.sector].exposure += c.exposure;
      map[c.sector].el += c.expected_loss;
    });
    return Object.entries(map).map(([sector, d]) => ({ sector, ...d })).sort((a, b) => b.exposure - a.exposure);
  }, [credits]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    credits.forEach(cr => { const s = cr.status; c[s] = (c[s] || 0) + 1; });
    return c;
  }, [credits]);

  const investGrade = useMemo(() => credits.filter(c => ['AAA', 'AA', 'A', 'BBB'].includes(c.rating)), [credits]);
  const specGrade = useMemo(() => credits.filter(c => ['BB', 'B', 'CCC', 'D'].includes(c.rating)), [credits]);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = 'Credit_Risk_Report.png'; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, []);

  const handleDownloadCSV = useCallback(() => {
    const rows = sorted.map(c => ({ ID: c.borrower_id, Name: c.borrower_name, Sector: c.sector, 'Exposure($K)': c.exposure, PD: (c.pd * 100).toFixed(2) + '%', LGD: (c.lgd * 100).toFixed(1) + '%', 'EL($K)': c.expected_loss.toFixed(1), Rating: c.rating, Collateral: c.collateral, Status: c.status }));
    let csv = `CREDIT RISK REPORT\n${new Date().toLocaleDateString()}\n${n} Borrowers | Total Exposure ${fmt(totalExposure)} | Total EL ${fmt(totalEL)}\n\n`;
    csv += Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Credit_Risk_Report.csv'; link.click();
  }, [sorted, n, totalExposure, totalEL]);

  if (showIntro) return (<><IntroPage onStartWithData={handleStartWithData} onStartSample={handleLoadSample} onUpload={handleFileUpload} onFormatGuide={() => setFormatGuideOpen(true)} uploadedCount={pendingCredits.length} parseError={parseError} /><FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} /></>);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Credit Risk Modeling</h1><p className="text-muted-foreground mt-1">{n} borrowers | {fmt(totalExposure)} total exposure</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <CreditGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Exposure', value: fmt(totalExposure), sub: `${n} borrowers` },
          { label: 'Expected Loss', value: fmt(totalEL), sub: `Provision: ${fmtPct(provisionRate)}`, alert: provisionRate > 2 },
          { label: 'Wtd Avg PD', value: fmtP(waPD), sub: `LGD: ${fmtP(waLGD)}` },
          { label: 'Collateral Coverage', value: fmtPct(collateralCoverage), sub: `${fmt(totalCollateral)} pledged` },
        ].map(({ label, value, sub, alert }) => (
          <Card key={label} className={`border-0 shadow-lg ${alert ? 'ring-2 ring-red-500/30' : ''}`}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Credit Portfolio</CardTitle><CardDescription>Sorted by Expected Loss (highest first)</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('credit-csv-reupload')?.click()}>
              <Upload className="w-4 h-4 mr-1" />Re-upload
              <input id="credit-csv-reupload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Borrower</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Exposure</TableHead>
                  <TableHead className="text-right">PD</TableHead>
                  <TableHead className="text-right">LGD</TableHead>
                  <TableHead className="text-right">EL</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(c => (
                  <TableRow key={c.borrower_id}>
                    <TableCell className="font-medium text-sm">{c.borrower_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.sector}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(c.exposure)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtP(c.pd)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtP(c.lgd)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{fmt(c.expected_loss)}</TableCell>
                    <TableCell><Badge className={`text-xs ${RATING_COLORS[c.rating] || ''}`}>{c.rating}</Badge></TableCell>
                    <TableCell><Badge className={`text-xs capitalize ${STATUS_COLORS[c.status] || STATUS_COLORS.performing}`}>{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
          <h2 className="text-2xl font-bold">Credit Risk Report</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {n} Borrowers | {fmt(totalExposure)} Exposure</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Exposure', value: fmt(totalExposure), sub: `${n} borrowers`, color: 'text-primary' },
            { label: 'Expected Loss', value: fmt(totalEL), sub: `${fmtPct(provisionRate)} provision rate`, color: provisionRate <= 1 ? 'text-green-600' : provisionRate <= 3 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Wtd Avg PD', value: fmtP(waPD), sub: `${investGrade.length} IG / ${specGrade.length} Spec`, color: waPD <= 2 ? 'text-green-600' : waPD <= 5 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Collateral Coverage', value: `${collateralCoverage.toFixed(0)}%`, sub: fmt(totalCollateral), color: collateralCoverage >= 80 ? 'text-green-600' : collateralCoverage >= 50 ? 'text-amber-600' : 'text-red-600' },
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

        {/* Credit Portfolio Detail Table */}
        <Card>
          <CardHeader><CardTitle>Credit Portfolio Detail</CardTitle><CardDescription>Borrower-level exposure, risk parameters, and expected loss</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Borrower</th>
              <th className="p-2 text-left font-semibold">Sector</th>
              <th className="p-2 text-center font-semibold">Rating</th>
              <th className="p-2 text-right font-semibold">Exposure</th>
              <th className="p-2 text-right font-semibold">PD</th>
              <th className="p-2 text-right font-semibold">LGD</th>
              <th className="p-2 text-right font-semibold">EL</th>
              <th className="p-2 text-right font-semibold">Collateral</th>
              <th className="p-2 text-center font-semibold">Status</th>
              <th className="p-2 text-right font-semibold">% of Total</th>
            </tr></thead>
            <tbody>{sorted.slice(0, 15).map(c => {
              const pctOfTotal = totalExposure > 0 ? (c.exposure / totalExposure * 100) : 0;
              const isIG = ['AAA', 'AA', 'A', 'BBB'].includes(c.rating);
              return (
<tr key={c.borrower_id} className={`border-b ${c.status === 'default' ? 'bg-red-50/30 dark:bg-red-950/10' : c.status === 'watch' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>                  <td className="p-2 font-medium whitespace-nowrap">{c.borrower_name}</td>
                  <td className="p-2 text-muted-foreground">{c.sector}</td>
                  <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${isIG ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.rating}</span></td>
                  <td className="p-2 text-right font-mono font-semibold">{fmt(c.exposure)}</td>
                  <td className={`p-2 text-right font-mono ${c.pd <= 2 ? 'text-green-600' : c.pd <= 5 ? 'text-amber-600' : 'text-red-600'}`}>{fmtP(c.pd)}</td>
                  <td className="p-2 text-right font-mono">{fmtP(c.lgd)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${c.expected_loss / c.exposure > 0.03 ? 'text-red-600' : c.expected_loss / c.exposure > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>{fmt(c.expected_loss)}</td>
                  <td className="p-2 text-right font-mono">{fmt(c.collateral)}</td>
                  <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.status === 'performing' ? 'bg-green-100 text-green-700' : c.status === 'watch' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span></td>
                  <td className="p-2 text-right font-mono">{pctOfTotal.toFixed(1)}%</td>
                </tr>);
            })}{sorted.length > 15 && (
              <tr className="border-b"><td colSpan={10} className="p-2 text-center text-muted-foreground italic">+ {sorted.length - 15} more borrowers</td></tr>
            )}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total ({n})</td>
              <td className="p-2" />
              <td className="p-2" />
              <td className="p-2 text-right font-mono">{fmt(totalExposure)}</td>
              <td className="p-2 text-right font-mono">{fmtP(waPD)}</td>
              <td className="p-2 text-right font-mono">{fmtP(waLGD)}</td>
              <td className="p-2 text-right font-mono font-bold">{fmt(totalEL)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalCollateral)}</td>
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
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Credit risk insights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Portfolio: ${n} borrowers, ${fmt(totalExposure)} total exposure. Expected Loss: ${fmt(totalEL)} (provision rate ${fmtPct(provisionRate)}).`);
                  items.push(`Credit quality: Weighted-average PD ${fmtP(waPD)}, LGD ${fmtP(waLGD)}. ${investGrade.length} investment-grade (${Math.round(investGrade.reduce((s, c) => s + c.exposure, 0) / totalExposure * 100)}% of exposure), ${specGrade.length} speculative-grade.`);
                  const top3 = sorted.slice(0, 3);
                  items.push(`Top 3 EL contributors: ${top3.map(c => `${c.borrower_name} (${fmt(c.expected_loss)}, PD ${fmtP(c.pd)})`).join(', ')}. Together: ${fmtPct(top3.reduce((s, c) => s + c.expected_loss, 0) / totalEL * 100)} of total EL.`);
                  const topSector = sectorData[0];
                  if (topSector && topSector.exposure / totalExposure > 0.25) items.push(`Sector concentration: "${topSector.sector}" is ${fmtPct(topSector.exposure / totalExposure * 100)} of total exposure (${topSector.count} borrowers). Consider diversification.`);
                  const watchCount = statusCounts['watch'] || 0;
                  const defaultCount = statusCounts['default'] || 0;
                  if (watchCount > 0 || defaultCount > 0) items.push(`Watch list: ${watchCount} on watch, ${defaultCount} in default. Watch-list exposure: ${fmt(credits.filter(c => c.status === 'watch').reduce((s, c) => s + c.exposure, 0))}.`);
                  else items.push('All borrowers performing — no watch-list or default items.');
                  items.push(`Collateral: ${fmt(totalCollateral)} pledged (${fmtPct(collateralCoverage)} coverage). ${collateralCoverage < 50 ? 'Below 50% — high unsecured exposure.' : 'Adequate security.'}`);
                  const topBorrower = credits.reduce((max, c) => c.exposure > max.exposure ? c : max, credits[0]);
                  if (topBorrower && topBorrower.exposure / totalExposure > 0.15) items.push(`Single-name concentration: ${topBorrower.borrower_name} is ${fmtPct(topBorrower.exposure / totalExposure * 100)} of total exposure. Monitor closely.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader><CardTitle>Rating Distribution — Exposure</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <Bar dataKey="exposure" name="Exposure" radius={[4, 4, 0, 0]}>
                    {ratingData.map((d, i) => {
                      const idx = RATING_ORDER.indexOf(d.rating);
                      const fill = idx <= 1 ? '#0d9488' : idx <= 3 ? '#1e3a5f' : idx <= 5 ? '#f59e0b' : '#dc2626';
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                  <Bar dataKey="el" name="Expected Loss" radius={[4, 4, 0, 0]} fill="#e57373" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs">
              <span className="text-muted-foreground">Investment Grade: <strong className="text-primary">{investGrade.length}</strong> ({fmtPct(investGrade.reduce((s, c) => s + c.exposure, 0) / totalExposure * 100)})</span>
              <span className="text-muted-foreground">Speculative: <strong className="text-red-600">{specGrade.length}</strong> ({fmtPct(specGrade.reduce((s, c) => s + c.exposure, 0) / totalExposure * 100)})</span>
            </div>
          </CardContent>
        </Card>

        {/* Sector Concentration */}
        <Card>
          <CardHeader><CardTitle>Sector Concentration</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `$${v}K`} />
                  <YAxis type="category" dataKey="sector" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}K`, '']} />
                  <Legend />
                  <Bar dataKey="exposure" name="Exposure" radius={[0, 4, 4, 0]}>
                    {sectorData.map((d, i) => {
                      const pct = d.exposure / totalExposure;
                      const fill = pct >= 0.2 ? '#dc2626' : pct >= 0.12 ? '#f59e0b' : COLORS.palette[i % COLORS.palette.length];
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* PD vs Exposure Scatter */}
        <Card>
          <CardHeader><CardTitle>PD vs Exposure — Bubble Size = Expected Loss</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="exposure" name="Exposure" tickFormatter={v => `$${v}K`} type="number" />
                  <YAxis dataKey="pd" name="PD" tickFormatter={v => `${(v * 100).toFixed(1)}%`} type="number" />
                  <ZAxis dataKey="expected_loss" range={[40, 400]} name="EL" />
                  <Tooltip formatter={(v: any, name: string) => [name === 'PD' ? `${(Number(v) * 100).toFixed(2)}%` : `$${Number(v).toLocaleString()}K`, name]} />
                  <Scatter data={credits.map(c => ({ ...c, name: c.borrower_name }))} fill={COLORS.primary} fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 EL */}
        <Card>
          <CardHeader><CardTitle>Top 10 Expected Loss Contributors</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Borrower</TableHead><TableHead>Rating</TableHead><TableHead className="text-right">Exposure</TableHead><TableHead className="text-right">PD</TableHead><TableHead className="text-right">LGD</TableHead><TableHead className="text-right">EL</TableHead><TableHead className="text-right">% of Total EL</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.slice(0, 10).map(c => (
                    <TableRow key={c.borrower_id}>
                      <TableCell className="font-medium text-sm">{c.borrower_name}</TableCell>
                      <TableCell><Badge className={`text-xs ${RATING_COLORS[c.rating] || ''}`}>{c.rating}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(c.exposure)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtP(c.pd)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtP(c.lgd)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">{fmt(c.expected_loss)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtPct(c.expected_loss / totalEL * 100)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Status & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Portfolio Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <Badge className={`text-xs capitalize ${STATUS_COLORS[status] || STATUS_COLORS.performing}`}>{status}</Badge>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / n) * 100}%` }} />
                      </div>
                      <span className="font-mono text-xs font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Portfolio Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Total Exposure', value: fmt(totalExposure) },
                  { label: 'Total Expected Loss', value: fmt(totalEL) },
                  { label: 'Provision Rate', value: fmtPct(provisionRate) },
                  { label: 'Weighted Avg PD', value: fmtP(waPD) },
                  { label: 'Weighted Avg LGD', value: fmtP(waLGD) },
                  { label: 'Collateral Coverage', value: fmtPct(collateralCoverage) },
                  { label: 'Avg Maturity', value: `${(credits.reduce((s, c) => s + c.maturity, 0) / n).toFixed(1)} yrs` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between p-2 rounded-lg bg-muted/20">
                    <span className="text-sm">{label}</span>
                    <span className="font-mono text-sm font-semibold">{value}</span>
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
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Credit Risk Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The portfolio comprises <strong>{n} borrowers</strong> with total exposure of <strong>{fmt(totalExposure)}</strong>. Expected Loss is {fmt(totalEL)} (provision rate {fmtPct(provisionRate)}). Weighted-average PD is {fmtP(waPD)} and LGD is {fmtP(waLGD)}.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Credit quality:</strong> {investGrade.length} borrowers ({fmtPct(investGrade.reduce((s, c) => s + c.exposure, 0) / totalExposure * 100)} of exposure) are investment-grade, {specGrade.length} are speculative-grade. {specGrade.length === 0 ? 'No speculative exposure.' : `Speculative exposure: ${fmt(specGrade.reduce((s, c) => s + c.exposure, 0))}.`}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Concentration:</strong> Top sector is {sectorData[0]?.sector} ({fmtPct((sectorData[0]?.exposure || 0) / totalExposure * 100)} of exposure). {sectorData.length} sectors represented. {sectorData[0] && sectorData[0].exposure / totalExposure > 0.25 ? 'Single-sector concentration exceeds 25% — consider rebalancing.' : 'Sector diversification is adequate.'}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Collateral:</strong> {fmt(totalCollateral)} in security ({fmtPct(collateralCoverage)} of exposure). {collateralCoverage >= 60 ? 'Strong collateral position.' : collateralCoverage >= 40 ? 'Moderate collateral coverage.' : 'Low collateral coverage — increased provisioning may be warranted.'}
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
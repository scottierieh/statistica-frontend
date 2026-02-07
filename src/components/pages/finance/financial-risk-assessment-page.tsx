'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Target, BookOpen, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Sparkles, Info,
  HelpCircle, Lightbulb, ChevronRight, Upload,
  CheckCircle2, AlertTriangle, Shield, ShieldAlert,
  Zap, Flame, Globe, Users, Lock, Activity,
  BarChart3, Eye, ArrowUpRight, ArrowDownRight, Droplets
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
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, ScatterChart, Scatter, ZAxis
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RiskRow {
  risk_id: string;
  risk_name: string;
  risk_category: string;
  probability: number;       // 0–1 or 1–5 (auto-detected)
  impact: number;            // numeric ($ or score)
  risk_score: number;        // probability × impact (or provided)
  risk_level: string;        // Low / Medium / High / Critical
  mitigation_strategy: string;
  risk_owner: string;
  status: string;            // Open / Mitigated / Closed
}

interface RiskPageProps {
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

const LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  mitigated: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  'in progress': 'bg-amber-100 text-amber-700',
  monitoring: 'bg-blue-100 text-blue-700',
};

const CAT_ICONS: Record<string, React.ElementType> = {
  liquidity: Droplets, credit: Lock, market: Activity,
  operational: Zap, currency: Globe, concentration: Users,
  compliance: Shield, strategic: Target, technology: BarChart3,
  reputational: Eye, default: AlertTriangle,
};

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  Math.abs(n) >= 1 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}K` :
  n.toFixed(2);
const fmtP = (n: number) => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(1)}%`;
const fmtN = (n: number) => isNaN(n) || !isFinite(n) ? '—' : n.toFixed(2);


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parseRiskData(rows: Record<string, any>[]): RiskRow[] | null {
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

  // Detect if probability is 0-1 scale or 1-5 scale
  const probs = rows.map(r => getN(r, 'probability', 'prob', 'likelihood')).filter(p => p > 0);
  const maxProb = probs.length > 0 ? Math.max(...probs) : 5;
  const is01Scale = maxProb <= 1;

  const items: RiskRow[] = rows.map((row, i) => {
    let prob = getN(row, 'probability', 'prob', 'likelihood');
    if (is01Scale && prob > 0) prob = prob * 5; // normalize to 1-5
    if (prob > 5) prob = 5;
    if (prob < 0) prob = 0;

    const impact = getN(row, 'impact', 'severity', 'consequence');
    let score = getN(row, 'risk_score', 'riskscore', 'score');
    if (!score && prob > 0 && impact > 0) score = prob * impact;

    const rawLevel = get(row, 'risk_level', 'risklevel', 'level', 'rating').toLowerCase();
    let level = rawLevel;
    if (!level) {
      if (score >= 15) level = 'critical';
      else if (score >= 10) level = 'high';
      else if (score >= 5) level = 'medium';
      else level = 'low';
    }

    const rawStatus = get(row, 'status', 'state').toLowerCase();
    const status = rawStatus || 'open';

    return {
      risk_id: get(row, 'risk_id', 'riskid', 'id') || `R${String(i + 1).padStart(3, '0')}`,
      risk_name: get(row, 'risk_name', 'riskname', 'name', 'risk', 'description') || `Risk ${i + 1}`,
      risk_category: get(row, 'risk_category', 'riskcategory', 'category', 'type').toLowerCase() || 'operational',
      probability: prob,
      impact,
      risk_score: score,
      risk_level: level,
      mitigation_strategy: get(row, 'mitigation', 'strategy', 'response', 'action', 'control'),
      risk_owner: get(row, 'risk_owner', 'riskowner', 'owner', 'responsible'),
      status,
    };
  }).filter(r => r.risk_name && r.risk_name !== '');

  return items.length > 0 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `risk_id,risk_name,risk_category,probability,impact,risk_score,risk_level,mitigation_strategy,risk_owner,status
R001,Cash Runway Shortfall,liquidity,2,5,10,High,Maintain $5M revolving credit facility; 90-day cash forecast,CFO,Open
R002,Key Customer Default,credit,2,4,8,Medium,Quarterly credit reviews; diversify customer base,VP Sales,Mitigated
R003,Market Downturn / Recession,market,3,4,12,High,Scenario planning completed; cost reduction playbook ready,CEO,Open
R004,Platform Outage > 24hr,operational,2,5,10,High,Multi-region deployment; 99.9% SLA; DR tested quarterly,CTO,Mitigated
R005,FX Exposure (EUR/GBP),currency,3,3,9,Medium,Forward contracts on 50% of projected FX revenue,Treasury,Open
R006,Vendor Lock-In (AWS),concentration,3,3,9,Medium,Multi-cloud strategy in 2025 roadmap,CTO,Open
R007,Regulatory Non-Compliance,compliance,2,4,8,Medium,Annual SOC2 audit; dedicated compliance officer,Legal,Mitigated
R008,Key Talent Attrition,operational,3,3,9,Medium,Competitive comp benchmarking; retention bonuses,VP Eng,Open
R009,Interest Rate Risk,market,3,2,6,Medium,Rate cap agreement on 50% variable debt,CFO,Mitigated
R010,Cybersecurity Breach,technology,2,5,10,High,Pen testing quarterly; bug bounty program; SOC monitoring,CISO,Open
R011,Supply Chain Disruption,operational,2,3,6,Medium,Dual-source critical components; 30-day safety stock,COO,Mitigated
R012,Competitor Price War,market,3,3,9,Medium,Focus on differentiation; monitor pricing quarterly,CMO,Open`;

function buildDefaultRisks(): RiskRow[] {
  const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true });
  return parseRiskData(result.data as Record<string, any>[]) || [];
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Risk Score": "Probability × Impact. Range depends on scale. Higher = more urgent.",
  "Probability": "Likelihood of occurrence: 1 (Rare) to 5 (Almost Certain) or 0–1 decimal.",
  "Impact": "Severity if risk materializes: 1 (Negligible) to 5 (Catastrophic), or $ amount.",
  "Risk Level": "Classification: Low, Medium, High, Critical — derived from risk score.",
  "Mitigation Strategy": "Planned action to reduce probability or impact of the risk.",
  "Risk Owner": "Person or role responsible for monitoring and managing the risk.",
  "Status": "Current state: Open (active risk), Mitigated (controls in place), Closed (resolved).",
  "Risk Category": "Type of risk: Liquidity, Credit, Market, Operational, Currency, Concentration, etc.",
  "Expected Loss": "Risk Score summed across all risks, indicating portfolio-level exposure.",
  "Risk Matrix": "2D grid plotting Probability vs Impact to visualize risk concentration.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Risk Assessment Glossary</DialogTitle>
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

const RiskGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Financial Risk Assessment Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-8">
          <div>
            <h3 className="font-semibold text-primary mb-2">What is Financial Risk Assessment?</h3>
            <p className="text-sm text-muted-foreground">A structured process to identify, quantify, and manage financial risks. Upload your risk register (CSV) and this tool automatically generates a risk matrix, category analysis, score distribution, mitigation tracking, and actionable Key Findings.</p>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Assessment Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Upload Risk Register', desc: 'Provide a CSV with risk_id, risk_name, risk_category, probability, impact, and optionally risk_score, risk_level, mitigation, owner, status.' },
                { step: '2', title: 'Auto-Analysis', desc: 'The tool parses your data, auto-detects probability scale (0–1 or 1–5), computes risk scores, and classifies risk levels.' },
                { step: '3', title: 'Review Risk Matrix', desc: 'Visual Probability × Impact grid showing where your risks cluster. Focus on the top-right (high probability + high impact).' },
                { step: '4', title: 'Category & Owner Analysis', desc: 'Radar chart by category, exposure breakdown by owner, and status tracking (Open/Mitigated/Closed).' },
                { step: '5', title: 'Key Findings & Report', desc: 'Auto-generated insights: critical risks, unmitigated items, concentration warnings, and exportable report.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Risk Level Classification</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { level: 'Critical (15–25)', desc: 'Immediate board-level action. Existential risk.', color: 'bg-red-600 text-white' },
                { level: 'High (10–14)', desc: 'Urgent mitigation. C-suite ownership.', color: 'bg-red-100 text-red-800' },
                { level: 'Medium (5–9)', desc: 'Active management. Quarterly review.', color: 'bg-amber-100 text-amber-800' },
                { level: 'Low (1–4)', desc: 'Monitor periodically. Accept or transfer.', color: 'bg-green-100 text-green-800' },
              ].map(({ level, desc, color }) => (
                <div key={level} className="p-2.5 rounded-lg border bg-muted/20">
                  <Badge className={`text-xs mb-1.5 ${color}`}>{level}</Badge>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-3">Risk Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { cat: 'Liquidity', desc: 'Cash shortfall, inability to meet obligations' },
                { cat: 'Credit', desc: 'Customer default, counterparty failure' },
                { cat: 'Market', desc: 'Rate changes, market decline, commodity prices' },
                { cat: 'Operational', desc: 'System failures, talent loss, process breakdown' },
                { cat: 'Currency', desc: 'FX rate movements on revenue/costs' },
                { cat: 'Concentration', desc: 'Over-reliance on single customer/vendor' },
              ].map(({ cat, desc }) => (
                <div key={cat} className="p-2 rounded-lg border bg-muted/20">
                  <p className="font-semibold text-xs">{cat}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#1e3a5f]" />Tips</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Focus on <strong>Critical & High</strong> risks first — they represent the greatest threat.</li>
              <li>• Every High+ risk should have an <strong>assigned owner</strong> and active mitigation.</li>
              <li>• Probability can be 0–1 decimal or 1–5 integer — the parser auto-detects.</li>
              <li>• Review and update risk scores <strong>quarterly</strong> — risks are dynamic.</li>
              <li>• Export the report for board presentations or audit documentation.</li>
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
          <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">CSV Format Guide — Risk Register</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Upload a CSV with your risk register. Column names are matched case-insensitively.</p>

          {/* Sample table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50"><th className="p-1.5 text-left">risk_id</th><th className="p-1.5 text-left">risk_name</th><th className="p-1.5 text-left">risk_category</th><th className="p-1.5 text-right">probability</th><th className="p-1.5 text-right">impact</th><th className="p-1.5 text-right">risk_score</th><th className="p-1.5 text-left">risk_level</th><th className="p-1.5 text-left">mitigation_strategy</th><th className="p-1.5 text-left">risk_owner</th><th className="p-1.5 text-left">status</th></tr></thead>
              <tbody>
                {[
                  ['R001', 'Cash Runway', 'liquidity', '2', '5', '10', 'High', 'Revolving credit', 'CFO', 'Open'],
                  ['R002', 'Customer Default', 'credit', '2', '4', '8', 'Medium', 'Credit reviews', 'VP Sales', 'Mitigated'],
                  ['R003', 'Market Downturn', 'market', '3', '4', '12', 'High', 'Scenario plan', 'CEO', 'Open'],
                ].map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>{row.map((c, j) => <td key={j} className={`p-1.5 ${j >= 3 && j <= 5 ? 'text-right font-mono' : ''}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Required columns */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Badge className="bg-primary text-primary-foreground text-xs">Required</Badge> Minimum Columns</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {['risk_id', 'risk_name', 'risk_category', 'probability', 'impact', 'risk_score'].map(col => (
                <div key={col} className="p-2 rounded border bg-primary/5 text-center"><span className="font-mono text-xs font-semibold">{col}</span></div>
              ))}
            </div>
          </div>

          {/* Recommended columns */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Recommended Columns</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: 'risk_id', desc: 'Unique identifier (R001, R002...)' },
                { name: 'risk_name', desc: 'Short description of the risk' },
                { name: 'risk_category', desc: 'liquidity, credit, market, operational, currency, concentration, compliance, technology...' },
                { name: 'probability', desc: '0–1 decimal OR 1–5 integer (auto-detected)' },
                { name: 'impact', desc: 'Score (1–5) or dollar amount' },
                { name: 'risk_score', desc: 'probability × impact (auto-calculated if missing)' },
                { name: 'risk_level', desc: 'Low / Medium / High / Critical (auto-classified if missing)' },
                { name: 'mitigation_strategy', desc: 'Description of mitigation actions' },
                { name: 'risk_owner', desc: 'Responsible person or role' },
                { name: 'status', desc: 'Open / Mitigated / Closed' },
              ].map(({ name, desc }) => (
                <div key={name} className="p-2 rounded border bg-muted/20">
                  <span className="font-mono text-xs font-semibold">{name}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_risk_register.csv'; a.click(); }}>
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

const IntroPage = ({ onStartWithData, onStartSample, onUpload, onFormatGuide, uploadedCount, parseError }: { onStartWithData: () => void; onStartSample: () => void; onUpload: (f: File) => void; onFormatGuide: () => void; uploadedCount: number; parseError: string | null }) => {
  const hasData = uploadedCount > 0;
  return (
  <div className="flex flex-1 items-center justify-center p-6">
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Shield className="w-8 h-8 text-primary" /></div></div>
        <CardTitle className="font-headline text-3xl">Financial Risk Assessment</CardTitle>
        <CardDescription className="text-base mt-2">Upload your risk register for automated analysis, scoring, and reporting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: ShieldAlert, title: 'Risk Matrix', desc: 'Auto-generate probability × impact heat map from your data' },
            { icon: BarChart3, title: 'Category Analysis', desc: 'Radar chart, exposure breakdown, score distribution' },
            { icon: Eye, title: 'Status Tracking', desc: 'Open / Mitigated / Closed breakdown with owner analysis' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-2">
              <CardHeader><Icon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Upload CSV */}
          <Card className={`border-2 transition-all ${hasData ? 'border-primary bg-primary/5 shadow-md' : 'border-dashed hover:border-primary/50 cursor-pointer'}`}
            onClick={() => { if (!hasData) document.getElementById('risk-csv-upload')?.click(); }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Upload className="w-5 h-5" /></div>
                <div><CardTitle className="text-base">Upload Risk Register</CardTitle><CardDescription className="text-xs">CSV with risk data</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasData ? (
                <>
                  <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Risk data detected</span></div>
                  <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => document.getElementById('risk-csv-reupload2')?.click()}>
                    Upload different file
                    <input id="risk-csv-reupload2" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Upload a CSV with your risk register. Column names are matched automatically.</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                    <p className="text-muted-foreground mb-1">Required columns:</p>
                    <p>risk_id | risk_name | risk_category | probability | impact | risk_score</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                    <p className="text-muted-foreground mb-1">Recommended (optional):</p>
                    <p>risk_level | mitigation_strategy | risk_owner | status</p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={e => { e.stopPropagation(); onFormatGuide(); }}><FileSpreadsheet className="w-4 h-4 mr-2" />View Format Guide & Sample</Button>
                  <p className="text-xs text-muted-foreground text-center">Upload your CSV file to get started</p>
                  {parseError && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{parseError}</p>
                    </div>
                  )}
                </>
              )}
              <input id="risk-csv-upload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </CardContent>
          </Card>

          {/* Sample Data */}
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                <div><CardTitle className="text-base">Sample Data</CardTitle><CardDescription className="text-xs">Pre-loaded risk register</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Start with a sample risk register to explore the tool. 12 risks across 7 categories, fully analyzed.</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {['12 risk items scored', '7 risk categories', 'Mitigation tracking', 'Owner assignment'].map(f => (
                  <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />{f}</div>
                ))}
              </div>
              <Button onClick={onStartSample} className="w-full" size="lg"><Shield className="w-4 h-4 mr-2" />Load Sample Data</Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
          <Info className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">This tool provides a structured framework for identifying, scoring, and managing financial risks. It is not a substitute for professional risk management advice.</p>
        </div>
      </CardContent>
    </Card>
  </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function RiskAssessmentPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: RiskPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [pendingRisks, setPendingRisks] = useState<RiskRow[]>(() => {
    // Auto-detect from prop data (uploaded via main app)
    if (data && data.length > 0) {
      const parsed = parseRiskData(data);
      if (parsed && parsed.length > 0) return parsed;
    }
    return [];
  });
  const [parseError, setParseError] = useState<string | null>(null);

  // When data prop changes (user uploads via main app), auto-parse
  useEffect(() => {
    if (data && data.length > 0) {
      const parsed = parseRiskData(data);
      if (parsed && parsed.length > 0) {
        setPendingRisks(parsed);
        setParseError(null);
      }
    }
  }, [data]);

  // Upload handler — parse but don't navigate
  const handleFileUpload = useCallback((file: File) => {
    setParseError(null);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as Record<string, any>[];
        if (!rows || rows.length === 0) {
          setParseError('No data rows found in CSV.');
          return;
        }
        const parsed = parseRiskData(rows);
        if (parsed && parsed.length > 0) {
          setPendingRisks(parsed);
          setParseError(null);
          toast({ title: 'Imported', description: `${parsed.length} risks detected. Click "Start" to proceed.` });
        } else {
          const cols = Object.keys(rows[0] || {}).join(', ');
          setParseError(`Could not parse risk data. Detected columns: [${cols}]. Need at least a name/risk column.`);
          toast({ title: 'Parse Error', description: 'Column names not recognized. Check Format Guide.', variant: 'destructive' });
        }
      },
      error: () => { setParseError('Failed to read CSV file.'); toast({ title: 'Error', description: 'Failed to read file.', variant: 'destructive' }); },
    });
  }, [toast]);

  const handleStartWithData = useCallback(() => {
    if (pendingRisks.length > 0) { setRisks(pendingRisks); setShowIntro(false); }
  }, [pendingRisks]);

  const handleLoadSample = useCallback(() => {
    setRisks(buildDefaultRisks());
    setShowIntro(false);
  }, []);

  // ── Computed analytics ──
  const totalRisks = risks.length;
  const categories = useMemo(() => [...new Set(risks.map(r => r.risk_category))].sort(), [risks]);
  const avgScore = useMemo(() => totalRisks > 0 ? risks.reduce((s, r) => s + r.risk_score, 0) / totalRisks : 0, [risks, totalRisks]);
  const totalScore = useMemo(() => risks.reduce((s, r) => s + r.risk_score, 0), [risks]);

  const levelCounts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    risks.forEach(r => { const l = r.risk_level.toLowerCase(); if (c[l] !== undefined) c[l]++; else c.low++; });
    return c;
  }, [risks]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    risks.forEach(r => { const s = r.status.toLowerCase(); c[s] = (c[s] || 0) + 1; });
    return c;
  }, [risks]);

  const catData = useMemo(() => categories.map(cat => {
    const catRisks = risks.filter(r => r.risk_category === cat);
    const avgS = catRisks.reduce((s, r) => s + r.risk_score, 0) / catRisks.length;
    const maxS = Math.max(...catRisks.map(r => r.risk_score));
    return { category: cat.charAt(0).toUpperCase() + cat.slice(1), count: catRisks.length, avgScore: avgS, maxScore: maxS, totalScore: catRisks.reduce((s, r) => s + r.risk_score, 0) };
  }), [risks, categories]);

  const ownerData = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number }> = {};
    risks.forEach(r => {
      const o = r.risk_owner || 'Unassigned';
      if (!map[o]) map[o] = { count: 0, totalScore: 0 };
      map[o].count++;
      map[o].totalScore += r.risk_score;
    });
    return Object.entries(map).map(([owner, d]) => ({ owner, ...d })).sort((a, b) => b.totalScore - a.totalScore);
  }, [risks]);

  const risksSorted = useMemo(() => [...risks].sort((a, b) => b.risk_score - a.risk_score), [risks]);

  // Export
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return; setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `Risk_Assessment.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); } catch {} finally { setIsDownloading(false); }
  }, []);

  const handleDownloadCSV = useCallback(() => {
    const rows = risksSorted.map(r => ({ Risk_ID: r.risk_id, Risk_Name: r.risk_name, Category: r.risk_category, Probability: r.probability, Impact: r.impact, Risk_Score: r.risk_score, Risk_Level: r.risk_level, Mitigation: r.mitigation_strategy, Owner: r.risk_owner, Status: r.status }));
    let csv = `FINANCIAL RISK ASSESSMENT\n${new Date().toLocaleDateString()}\n${totalRisks} Risks | Avg Score ${avgScore.toFixed(1)}\n\n`;
    csv += Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Risk_Assessment.csv`; link.click();
  }, [risksSorted, totalRisks, avgScore]);

  if (showIntro) return (<><IntroPage onStartWithData={handleStartWithData} onStartSample={handleLoadSample} onUpload={handleFileUpload} onFormatGuide={() => setFormatGuideOpen(true)} uploadedCount={pendingRisks.length} parseError={parseError} /><FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} /></>);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Financial Risk Assessment</h1><p className="text-muted-foreground mt-1">{totalRisks} risks | {categories.length} categories | Avg score {avgScore.toFixed(1)}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <RiskGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <FormatGuideModal isOpen={formatGuideOpen} onClose={() => setFormatGuideOpen(false)} />

      {/* ══ Overview Cards ══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Risks', value: totalRisks, sub: `${categories.length} categories` },
          { label: 'Critical + High', value: levelCounts.critical + levelCounts.high, sub: `${levelCounts.critical} critical, ${levelCounts.high} high`, alert: levelCounts.critical > 0 },
          { label: 'Avg Risk Score', value: avgScore.toFixed(1), sub: `Total: ${totalScore.toFixed(0)}` },
          { label: 'Open Risks', value: statusCounts['open'] || 0, sub: `${statusCounts['mitigated'] || 0} mitigated, ${statusCounts['closed'] || 0} closed` },
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

      {/* ══ Risk Register Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Risk Register</CardTitle><CardDescription>All risks sorted by score (highest first)</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { document.getElementById('risk-csv-reupload')?.click(); }}>
              <Upload className="w-4 h-4 mr-1" />Re-upload
              <input id="risk-csv-reupload" type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead className="min-w-[180px]">Risk</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Prob</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risksSorted.map(r => (
                  <TableRow key={r.risk_id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.risk_id}</TableCell>
                    <TableCell className="font-medium text-sm">{r.risk_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{r.risk_category}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.probability.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.impact.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{r.risk_score.toFixed(1)}</TableCell>
                    <TableCell><Badge className={`text-xs ${LEVEL_COLORS[r.risk_level.toLowerCase()] || LEVEL_COLORS.low}`}>{r.risk_level}</Badge></TableCell>
                    <TableCell className="text-xs">{r.risk_owner || '—'}</TableCell>
                    <TableCell><Badge className={`text-xs ${STATUS_COLORS[r.status.toLowerCase()] || STATUS_COLORS.open}`}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
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
          <h2 className="text-2xl font-bold">Financial Risk Assessment Report</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {totalRisks} Risks | {categories.length} Categories</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Risks', value: `${totalRisks}`, sub: `${categories.length} categories`, color: 'text-primary' },
            { label: 'Critical / High', value: `${levelCounts.critical + levelCounts.high}`, sub: `${levelCounts.critical} critical, ${levelCounts.high} high`, color: (levelCounts.critical + levelCounts.high) > 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Avg Score', value: avgScore.toFixed(1), sub: `of 25 max`, color: avgScore >= 15 ? 'text-red-600' : avgScore >= 8 ? 'text-amber-600' : 'text-green-600' },
            { label: 'Mitigation', value: `${((statusCounts['mitigated'] || 0) + (statusCounts['closed'] || 0))}/${totalRisks}`, sub: `${totalRisks > 0 ? (((statusCounts['mitigated'] || 0) + (statusCounts['closed'] || 0)) / totalRisks * 100).toFixed(0) : 0}% covered`, color: ((statusCounts['mitigated'] || 0) + (statusCounts['closed'] || 0)) / totalRisks >= 0.5 ? 'text-green-600' : 'text-amber-600' },
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

        {/* Risk Register Table */}
        <Card>
          <CardHeader><CardTitle>Risk Register</CardTitle><CardDescription>All risks ranked by score — probability, impact, level, owner, and status</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Risk</th>
              <th className="p-2 text-left font-semibold">Category</th>
              <th className="p-2 text-right font-semibold">Prob</th>
              <th className="p-2 text-right font-semibold">Impact</th>
              <th className="p-2 text-right font-semibold">Score</th>
              <th className="p-2 text-center font-semibold">Level</th>
              <th className="p-2 text-left font-semibold">Owner</th>
              <th className="p-2 text-center font-semibold">Status</th>
            </tr></thead>
            <tbody>{[...risks].sort((a, b) => b.risk_score - a.risk_score).slice(0, 15).map(r => (
              <tr key={r.risk_id} className={`border-b ${r.risk_level.toLowerCase() === 'critical' ? 'bg-red-50/30 dark:bg-red-950/10' : r.risk_level.toLowerCase() === 'high' ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                <td className="p-2 font-medium">{r.risk_name}</td>
                <td className="p-2 text-muted-foreground">{r.risk_category}</td>
                <td className="p-2 text-right font-mono">{r.probability.toFixed(1)}</td>
                <td className="p-2 text-right font-mono">{r.impact.toFixed(1)}</td>
                <td className="p-2 text-right font-mono font-semibold">{r.risk_score.toFixed(1)}</td>
                <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${LEVEL_COLORS[r.risk_level.toLowerCase()] || LEVEL_COLORS.low}`}>{r.risk_level}</span></td>
                <td className="p-2">{r.risk_owner || '—'}</td>
                <td className="p-2 text-center"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[r.status.toLowerCase()] || STATUS_COLORS.open}`}>{r.status}</span></td>
              </tr>
            ))}{risks.length > 15 && (
              <tr className="border-b"><td colSpan={8} className="p-2 text-center text-muted-foreground italic">+ {risks.length - 15} more risks</td></tr>
            )}</tbody>
          </table></div></CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></div>
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Auto-generated risk insights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`${totalRisks} risks across ${categories.length} categories. Average score: ${avgScore.toFixed(1)}/25. Total cumulative risk score: ${totalScore.toFixed(0)}.`);
                  if (levelCounts.critical > 0) {
                    const critRisks = risks.filter(r => r.risk_level.toLowerCase() === 'critical');
                    items.push(`${levelCounts.critical} CRITICAL risk${levelCounts.critical > 1 ? 's' : ''}: ${critRisks.map(r => `${r.risk_name} (${r.risk_score.toFixed(0)})`).join(', ')}. Require immediate action.`);
                  } else items.push('No critical-level risks identified.');
                  if (levelCounts.high > 0) {
                    const highRisks = risks.filter(r => r.risk_level.toLowerCase() === 'high');
                    items.push(`${levelCounts.high} HIGH risk${levelCounts.high > 1 ? 's' : ''}: ${highRisks.map(r => r.risk_name).join(', ')}. Active mitigation needed.`);
                  }
                  const openRisks = risks.filter(r => r.status.toLowerCase() === 'open');
                  const openHigh = openRisks.filter(r => ['critical', 'high'].includes(r.risk_level.toLowerCase()));
                  if (openHigh.length > 0) items.push(`${openHigh.length} high/critical risk${openHigh.length > 1 ? 's' : ''} still OPEN: ${openHigh.map(r => r.risk_name).join(', ')}. Prioritize mitigation.`);
                  const noOwner = risks.filter(r => !r.risk_owner || r.risk_owner === '—');
                  if (noOwner.length > 0) items.push(`${noOwner.length} risk${noOwner.length > 1 ? 's' : ''} have no assigned owner. Every risk should have accountability.`);
                  const topCat = catData.sort((a, b) => b.count - a.count)[0];
                  if (topCat && topCat.count > totalRisks * 0.4) items.push(`Risk concentration: "${topCat.category}" has ${topCat.count} risks (${Math.round(topCat.count / totalRisks * 100)}% of total). Consider if other categories are under-monitored.`);
                  const mitigatedCount = statusCounts['mitigated'] || 0;
                  const closedCount = statusCounts['closed'] || 0;
                  const coverage = totalRisks > 0 ? ((mitigatedCount + closedCount) / totalRisks * 100) : 0;
                  items.push(`Mitigation coverage: ${(mitigatedCount + closedCount)}/${totalRisks} (${coverage.toFixed(0)}%) risks mitigated or closed. ${coverage < 50 ? 'Below 50% — accelerate mitigation efforts.' : 'Adequate coverage.'}`);
                  if (ownerData.length > 0 && ownerData[0].count > totalRisks * 0.3) items.push(`${ownerData[0].owner} owns ${ownerData[0].count} risks (${Math.round(ownerData[0].count / totalRisks * 100)}%). Consider distributing ownership.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Radar by Category */}
        <Card>
          <CardHeader><CardTitle>Risk Profile by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={catData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 25]} tick={{ fontSize: 9 }} />
                  <Radar name="Avg Score" dataKey="avgScore" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} strokeWidth={2} />
                  <Radar name="Max Score" dataKey="maxScore" stroke={COLORS.softRed} fill={COLORS.softRed} fillOpacity={0.1} strokeWidth={1} strokeDasharray="5 5" />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Matrix */}
        <Card>
          <CardHeader><CardTitle>Risk Matrix — Probability × Impact</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="flex">
                  <div className="w-14 flex flex-col items-center justify-center pr-1">
                    <span className="text-xs text-muted-foreground font-semibold -rotate-90 whitespace-nowrap">← Impact</span>
                  </div>
                  <div className="flex-1">
                    {/* Y-axis labels + grid rows */}
                    {[5, 4, 3, 2, 1].map(imp => (
                      <div key={imp} className="flex items-stretch gap-1 mb-1">
                        <div className="w-8 flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">{imp}</div>
                        {[1, 2, 3, 4, 5].map(prob => {
                          const cellRisks = risks.filter(r => Math.round(r.probability) === prob && Math.round(r.impact) === imp);
                          const score = prob * imp;
                          const bg = score >= 15 ? 'bg-red-500/80' : score >= 10 ? 'bg-red-200/70 dark:bg-red-900/40' : score >= 5 ? 'bg-amber-100/80 dark:bg-amber-900/30' : 'bg-green-100/70 dark:bg-green-900/20';
                          const textColor = score >= 15 ? 'text-white' : 'text-foreground';
                          return (
                            <div key={`${prob}-${imp}`} className={`flex-1 p-2 rounded-md min-h-[72px] ${bg} relative`}>
                              <span className={`text-xs font-mono font-bold absolute top-1 right-1.5 ${score >= 15 ? 'text-white/60' : 'text-muted-foreground/50'}`}>{score}</span>
                              <div className="space-y-1 mt-3">
                                {cellRisks.map(r => (
                                  <div key={r.risk_id} className={`text-xs leading-snug font-medium ${textColor}`} title={r.risk_name}>{r.risk_name.length > 20 ? r.risk_name.slice(0, 18) + '…' : r.risk_name}</div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {/* X-axis labels */}
                    <div className="flex gap-1 mt-1">
                      <div className="w-8 shrink-0" />
                      {['1 · Rare', '2 · Unlikely', '3 · Possible', '4 · Likely', '5 · Certain'].map(l => <div key={l} className="flex-1 text-center text-xs text-muted-foreground font-medium">{l}</div>)}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-1 font-medium">Probability →</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution by Category */}
        <Card>
          <CardHeader><CardTitle>Risk Score by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [Number(v).toFixed(1), '']} />
                  <Bar dataKey="totalScore" name="Total Score" radius={[0, 4, 4, 0]}>
                    {catData.map((d, i) => {
                      const maxTotal = Math.max(...catData.map(c => c.totalScore), 1);
                      const ratio = d.totalScore / maxTotal;
                      const fill = ratio >= 0.8 ? '#dc2626' : ratio >= 0.6 ? '#e57373' : ratio >= 0.4 ? '#f59e0b' : ratio >= 0.2 ? '#0d9488' : '#1e3a5f';
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Level Distribution */}
        <Card>
          <CardHeader><CardTitle>Risk Level Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { level: 'Critical', count: levelCounts.critical, color: 'text-red-600', bg: 'bg-red-600' },
                { level: 'High', count: levelCounts.high, color: 'text-red-500', bg: 'bg-red-400' },
                { level: 'Medium', count: levelCounts.medium, color: 'text-amber-600', bg: 'bg-amber-400' },
                { level: 'Low', count: levelCounts.low, color: 'text-green-600', bg: 'bg-green-500' },
              ].map(({ level, count, color, bg }) => (
                <div key={level} className="p-3 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground">{level}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{count}</p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${totalRisks > 0 ? (count / totalRisks) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              {[
                { count: levelCounts.critical, color: '#dc2626' },
                { count: levelCounts.high, color: '#f87171' },
                { count: levelCounts.medium, color: '#fbbf24' },
                { count: levelCounts.low, color: '#22c55e' },
              ].map(({ count, color }, i) => (
                <div key={i} className="h-full transition-all" style={{ width: `${totalRisks > 0 ? (count / totalRisks) * 100 : 0}%`, backgroundColor: color }} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status / Owner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <Badge className={`text-xs capitalize ${STATUS_COLORS[status] || STATUS_COLORS.open}`}>{status}</Badge>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / totalRisks) * 100}%` }} />
                      </div>
                      <span className="font-mono text-xs font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Risk by Owner</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ownerData.slice(0, 8).map(({ owner, count, totalScore: ts }) => (
                  <div key={owner} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <span className="text-sm font-medium">{owner}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{count} risks</span>
                      <span className="font-mono text-xs font-semibold">Score: {ts.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mitigation Gap */}
        <Card>
          <CardHeader><CardTitle>Mitigation Gap Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Risk</TableHead><TableHead>Score</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead>Mitigation</TableHead><TableHead>Owner</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {risksSorted.filter(r => r.status.toLowerCase() === 'open' && ['critical', 'high'].includes(r.risk_level.toLowerCase())).map(r => (
                    <TableRow key={r.risk_id}>
                      <TableCell className="font-medium text-sm">{r.risk_name}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{r.risk_score.toFixed(0)}</TableCell>
                      <TableCell><Badge className={`text-xs ${LEVEL_COLORS[r.risk_level.toLowerCase()] || LEVEL_COLORS.low}`}>{r.risk_level}</Badge></TableCell>
                      <TableCell><Badge className="text-xs bg-red-100 text-red-700">Open</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.mitigation_strategy || 'No strategy defined'}</TableCell>
                      <TableCell className="text-xs">{r.risk_owner || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {risksSorted.filter(r => r.status.toLowerCase() === 'open' && ['critical', 'high'].includes(r.risk_level.toLowerCase())).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">All high/critical risks have been mitigated or closed.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Risk Assessment Summary</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The risk register contains <strong>{totalRisks} identified risks</strong> across <strong>{categories.length} categories</strong>. The average risk score is <strong>{avgScore.toFixed(1)}</strong> out of 25 (cumulative: {totalScore.toFixed(0)}).
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Risk distribution:</strong> {levelCounts.critical} critical, {levelCounts.high} high, {levelCounts.medium} medium, {levelCounts.low} low.
                  {levelCounts.critical + levelCounts.high > 0 ? ` The ${levelCounts.critical + levelCounts.high} critical/high risks require priority attention.` : ' No critical or high-priority risks — the risk profile is manageable.'}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Mitigation status:</strong> {Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')}.
                  {(statusCounts['open'] || 0) > totalRisks * 0.5 ? ' Over half of risks remain open — accelerate mitigation efforts.' : ' Mitigation coverage is adequate.'}
                </p>
                {ownerData.length > 0 && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong>Top risk owners:</strong> {ownerData.slice(0, 3).map(o => `${o.owner} (${o.count} risks, score ${o.totalScore.toFixed(0)})`).join('; ')}.
                  </p>
                )}
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
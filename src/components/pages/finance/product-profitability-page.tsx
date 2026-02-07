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
  HelpCircle, Calculator, Percent, Building2,
  Lightbulb, ChevronRight, Upload, BarChart3, Plus, X,
  Settings2, CheckCircle2, Tag, Layers, Package,
  PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
  AlertTriangle, ShoppingBag, Box, Boxes, Zap
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
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Product {
  id: string;
  name: string;
  category: string;
  // Per-unit economics
  unitPrice: number;          // $ per unit
  unitDirectCost: number;     // $ per unit (materials + direct labor)
  // Volume — 12 months
  monthlyUnits: number[];     // units sold per month
  // Overheads
  directOverhead: number;     // $K — directly attributable overhead (e.g. dedicated equipment)
}

interface ProfitSettings {
  companyName: string;
  fiscalYear: number;
  currentMonth: number;       // 1-12
  totalIndirectOH: number;    // $K — company-wide indirect overhead to allocate
  ohAllocMethod: 'revenue' | 'units' | 'equal' | 'custom';
  customOHPcts: Record<string, number>; // product id -> % of indirect OH
}

interface ProductPageProps {
  data: Record<string, any>[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: any) => void;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = ['#1e3a5f', '#2d5a8e', '#3b7cc0', '#0d9488', '#14b8a6', '#5b9bd5', '#7fb3e0', '#1a4f6e', '#4a90b8', '#64748b'];

const seasonality = [0.85, 0.88, 0.95, 1.00, 1.05, 1.08, 1.12, 1.10, 1.05, 1.00, 0.95, 0.97];

function buildDefaultProducts(): Product[] {
  const mk = (id: string, name: string, cat: string, price: number, cost: number, baseUnits: number, oh: number): Product => ({
    id, name, category: cat, unitPrice: price, unitDirectCost: cost,
    monthlyUnits: seasonality.map(s => Math.round(baseUnits * s * (0.95 + Math.random() * 0.1))),
    directOverhead: oh,
  });
  return [
    mk('p1', 'Pro Software License', 'Software', 299, 45, 420, 85),
    mk('p2', 'Enterprise Suite', 'Software', 899, 120, 140, 120),
    mk('p3', 'Cloud Hosting (Monthly)', 'Services', 149, 68, 800, 200),
    mk('p4', 'Training Workshop', 'Services', 499, 180, 65, 30),
    mk('p5', 'Hardware Kit', 'Hardware', 1299, 780, 95, 150),
    mk('p6', 'Support Plan (Annual)', 'Services', 199, 42, 520, 60),
  ];
}

const DEFAULT_SETTINGS: ProfitSettings = {
  companyName: 'Acme Corp',
  fiscalYear: new Date().getFullYear(),
  currentMonth: 12,
  totalIndirectOH: 2400,
  ohAllocMethod: 'revenue',
  customOHPcts: {},
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) =>
  n == null || isNaN(n) || !isFinite(n) ? '—' :
  Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}M` :
  `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}K`;
const fmtU = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
const fmtP = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n.toFixed(1)}%`;
const fmtD = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const sum = (arr: number[], s: number, e: number) => arr.slice(s, e).reduce((a, v) => a + v, 0);


// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseProductCSV(csvText: string): Product[] | null {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length < 2) return null;
  const rows = parsed.data as Record<string, string>[];
  const items: Product[] = [];
  for (const row of rows) {
    const name = (row['Product'] || row['Name'] || row['Item'] || '').trim();
    if (!name) continue;
    const category = (row['Category'] || row['Type'] || 'General').trim();
    const unitPrice = parseFloat(row['UnitPrice'] || row['Price']) || 0;
    const unitDirectCost = parseFloat(row['UnitCost'] || row['DirectCost'] || row['COGS']) || 0;
    const directOverhead = parseFloat(row['DirectOH'] || row['Overhead']) || 0;
    const monthlyUnits: number[] = [];
    for (const m of MONTHS) {
      monthlyUnits.push(parseFloat(row[`Units_${m}`] || row[m]) || 0);
    }
    if (monthlyUnits.every(u => u === 0)) {
      const annual = parseFloat(row['AnnualUnits'] || row['Units']) || 1200;
      seasonality.forEach((s, i) => monthlyUnits[i] = Math.round((annual / 12) * s));
    }
    items.push({ id: `p${items.length}`, name, category, unitPrice, unitDirectCost, monthlyUnits, directOverhead });
  }
  return items.length >= 2 ? items : null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════

const glossaryItems: Record<string, string> = {
  "Revenue": "Total sales income = Units Sold × Unit Price.",
  "Direct Cost (COGS)": "Cost directly tied to producing/delivering each unit = Units × Unit Direct Cost.",
  "Gross Profit": "Revenue − Direct Cost. First-level profitability before overheads.",
  "Gross Margin %": "Gross Profit ÷ Revenue × 100. Higher = more efficient production.",
  "Direct Overhead": "Fixed costs attributable to a specific product (dedicated equipment, licenses, team).",
  "Contribution Margin": "Gross Profit − Direct Overhead. What each product contributes to covering company overhead.",
  "Contribution Margin %": "Contribution Margin ÷ Revenue × 100.",
  "Indirect Overhead": "Company-wide costs shared across products (rent, admin, G&A).",
  "Overhead Allocation": "Method for distributing indirect overhead: by Revenue share, Unit share, Equal split, or Custom %.",
  "Net Income": "Contribution Margin − Allocated Indirect Overhead. True bottom-line per product.",
  "Net Margin %": "Net Income ÷ Revenue × 100. The final profitability measure.",
  "Break-Even Units": "Direct Overhead ÷ (Unit Price − Unit Direct Cost). Minimum units to cover fixed costs.",
  "Revenue Mix": "Product's share of total company revenue.",
  "Profit Mix": "Product's share of total company net income.",
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Product Profitability Glossary</DialogTitle>
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

const ProductGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Product Profitability Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">

          <div>
            <h3 className="font-semibold text-primary mb-3">Analysis Process</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Define Products & Unit Economics', desc: 'Set unit price and direct cost per product. These drive gross margin.' },
                { step: '2', title: 'Input Volume (Monthly)', desc: 'Enter or upload monthly unit sales. Click a product row to expand monthly detail.' },
                { step: '3', title: 'Assign Direct Overhead', desc: 'Product-specific fixed costs (dedicated team, equipment, licenses).' },
                { step: '4', title: 'Allocate Indirect Overhead', desc: 'Distribute company-wide costs by Revenue share, Unit share, Equal, or Custom %.' },
                { step: '5', title: 'Analyze Profitability', desc: 'Compare Net Margin, Break-Even, Revenue Mix vs Profit Mix across products.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Key Formulas</h3>
            <div className="space-y-3">
              {[
                { label: 'Revenue', formula: 'Units × Price', example: '420 × $299 = $125.6K' },
                { label: 'Direct Cost', formula: 'Units × Unit Cost', example: '420 × $45 = $18.9K' },
                { label: 'Gross Profit', formula: 'Revenue − Direct Cost', example: '$125.6K − $18.9K = $106.7K' },
                { label: 'Contribution Margin', formula: 'Gross Profit − Direct Overhead', example: '$106.7K − $85K = $21.7K' },
                { label: 'Allocated OH', formula: 'Indirect OH × (Product Revenue ÷ Total Revenue)', example: '$2,400K × 12.5% = $300K' },
                { label: 'Net Income', formula: 'Contribution Margin − Allocated OH', example: '$21.7K − $300K = −$278.3K' },
                { label: 'Break-Even Units', formula: 'Direct OH ÷ (Price − Unit Cost)', example: '$85K ÷ ($299 − $45) = 335 units' },
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

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Overhead Allocation Methods</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { method: 'Revenue-Based', desc: 'Higher-revenue products absorb more overhead. Most common.' },
                { method: 'Unit-Based', desc: 'Allocate by volume. Fair when each unit consumes similar overhead.' },
                { method: 'Equal Split', desc: 'Each product gets equal share. Simple but rarely accurate.' },
                { method: 'Custom %', desc: 'Manually assign OH percentages. Most flexible.' },
              ].map(({ method, desc }) => (
                <div key={method} className="p-3 rounded-lg border">
                  <p className="font-medium text-sm">{method}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <p className="text-xs text-muted-foreground"><strong className="text-[#1e3a5f]">Tip:</strong> Compare Revenue Mix vs Profit Mix. If a product is 30% of revenue but only 5% of profit, it may be dragging margins. Consider pricing changes, cost reduction, or discontinuation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE CSV & FORMAT GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_PRODUCT_CSV = `Product,Category,UnitPrice,UnitCost,DirectOH,Units_Jan,Units_Feb,Units_Mar,Units_Apr,Units_May,Units_Jun,Units_Jul,Units_Aug,Units_Sep,Units_Oct,Units_Nov,Units_Dec
Pro Software License,Software,299,45,85,357,370,399,420,441,453,470,462,441,420,399,407
Enterprise Suite,Software,899,120,120,119,123,133,140,147,151,157,154,147,140,133,136
Cloud Hosting (Monthly),Services,149,68,200,680,704,760,800,840,864,896,880,840,800,760,776
Training Workshop,Services,499,180,30,55,57,62,65,68,70,73,72,68,65,62,63
Hardware Kit,Hardware,1299,780,150,81,84,90,95,100,103,106,105,100,95,90,92
Support Plan (Annual),Services,199,42,60,442,458,494,520,546,562,582,572,546,520,494,505`;

const FormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_PRODUCT_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_products.csv';
    link.click();
    toast({ title: "Downloaded!", description: "Sample CSV saved" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Required Data Format</DialogTitle>
          <DialogDescription>Prepare your product data in this format before uploading</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Structure</h4>
              <p className="text-sm text-muted-foreground mb-3">One row per product. Unit economics + 12 monthly unit volumes.</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="bg-muted/50">
                    <th className="p-2 text-left font-semibold border-r">Product</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-right">UnitPrice</th>
                    <th className="p-2 text-right">UnitCost</th>
                    <th className="p-2 text-right">DirectOH</th>
                    <th className="p-2 text-right border-l">Units_Jan</th>
                    <th className="p-2 text-right">...</th>
                    <th className="p-2 text-right">Units_Dec</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Pro License', 'Software', '299', '45', '85', '357', '...', '407'],
                      ['Cloud Hosting', 'Services', '149', '68', '200', '680', '...', '776'],
                      ['Hardware Kit', 'Hardware', '1299', '780', '150', '81', '...', '92'],
                    ].map(([item, ...vals], i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="p-2 font-semibold border-r">{item}</td>
                        {vals.map((v, j) => <td key={j} className={`p-2 text-right ${j === 4 ? 'border-l' : ''}`}>{v}</td>)}
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
                  { name: 'Product', required: true, desc: 'Product name' },
                  { name: 'Category', required: false, desc: 'Product category (Software, Services, Hardware)' },
                  { name: 'UnitPrice', required: true, desc: 'Selling price per unit ($)' },
                  { name: 'UnitCost', required: true, desc: 'Direct cost per unit ($)' },
                  { name: 'DirectOH', required: false, desc: 'Direct overhead ($K), default 0' },
                  { name: 'Units_Jan...Dec', required: true, desc: 'Monthly units sold' },
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
                <li>• UnitPrice and UnitCost are in <strong>dollars</strong> (not $K).</li>
                <li>• DirectOH is in <strong>$K</strong> (thousands).</li>
                <li>• If monthly columns are missing, provide AnnualUnits column instead.</li>
                <li>• At least 2 products required.</li>
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
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Package className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Product Profitability</CardTitle>
          <CardDescription className="text-base mt-2">Evaluate the net income and margin contribution of individual products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: DollarSign, title: 'Unit Economics', desc: 'Price, cost, and contribution margin per product' },
              { icon: PieChartIcon, title: 'Revenue vs Profit Mix', desc: 'Identify which products drive revenue vs profit' },
              { icon: Target, title: 'Break-Even Analysis', desc: 'Minimum units needed to cover fixed costs' },
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
                  <div><CardTitle className="text-base">Upload Product Data</CardTitle><CardDescription className="text-xs">Import products from CSV</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUploadedData ? (
                  <>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium text-primary">Data detected — ready to analyze</span></div>
                    <Button onClick={onStartWithData} className="w-full" size="lg"><Sparkles className="w-4 h-4 mr-2" />Start with Uploaded Data</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Upload a CSV with product unit economics and monthly volumes.</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                      <p className="text-muted-foreground mb-1">Required format:</p>
                      <p>Product | UnitPrice | UnitCost | Units_Jan..Dec</p>
                      <p className="text-muted-foreground">e.g. Widget Pro, 49.99, 18.50, 120, 135, ...</p>
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
                  <div><CardTitle className="text-base">Start from Template</CardTitle><CardDescription className="text-xs">Pre-loaded 6-product sample</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Start with a sample company that has 6 products across Software, Services, and Hardware with 12 months of volume data.</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />6 products with unit economics</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />12 months seasonal volume data</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Overhead allocation and break-even</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />Revenue vs Profit Mix analysis</div>
                </div>
                <Button variant="outline" onClick={onStartManual} className="w-full" size="lg"><Calculator className="w-4 h-4 mr-2" />Start with Defaults</Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <Info className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Both paths lead to the same analysis. Uploading data pre-fills all values — you can always edit, add, or remove products afterward.</p>
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

export default function ProductProfitPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: ProductPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const [settings, setSettings] = useState<ProfitSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>(buildDefaultProducts);

  // Parse uploaded CSV
  const parsedUpload = useMemo(() => {
    if (!data || data.length === 0) return null;
    try { const raw = Papa.unparse(data); return parseProductCSV(raw); } catch { return null; }
  }, [data]);

  const [parseError] = useState<string | null>(null);

  const applyUpload = useCallback(() => {
    if (parsedUpload) setProducts(parsedUpload);
    setShowIntro(false);
  }, [parsedUpload]);

  const cm = settings.currentMonth;

  // ── Product-level calculations ──
  const productMetrics = useMemo(() => products.map(p => {
    const units = sum(p.monthlyUnits, 0, cm);
    const revenue = units * p.unitPrice / 1000;           // $K
    const directCost = units * p.unitDirectCost / 1000;    // $K
    const grossProfit = revenue - directCost;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const contributionMargin = grossProfit - p.directOverhead;
    const contributionPct = revenue > 0 ? (contributionMargin / revenue) * 100 : 0;
    const breakEvenUnits = (p.unitPrice - p.unitDirectCost) > 0 ? Math.ceil((p.directOverhead * 1000) / (p.unitPrice - p.unitDirectCost)) : Infinity;
    const unitMargin = p.unitPrice - p.unitDirectCost;
    return { ...p, units, revenue, directCost, grossProfit, grossMarginPct, contributionMargin, contributionPct, breakEvenUnits, unitMargin };
  }), [products, cm]);

  // Totals
  const totalRevenue = useMemo(() => productMetrics.reduce((s, p) => s + p.revenue, 0), [productMetrics]);
  const totalUnits = useMemo(() => productMetrics.reduce((s, p) => s + p.units, 0), [productMetrics]);

  // OH allocation
  const allocatedOH = useMemo(() => {
    const oh = settings.totalIndirectOH;
    return productMetrics.map(p => {
      switch (settings.ohAllocMethod) {
        case 'revenue': return totalRevenue > 0 ? oh * (p.revenue / totalRevenue) : 0;
        case 'units': return totalUnits > 0 ? oh * (p.units / totalUnits) : 0;
        case 'equal': return oh / productMetrics.length;
        case 'custom': return oh * ((settings.customOHPcts[p.id] || 0) / 100);
        default: return 0;
      }
    });
  }, [productMetrics, settings, totalRevenue, totalUnits]);

  // Final P&L per product
  const productPnL = useMemo(() => productMetrics.map((p, i) => {
    const allocated = allocatedOH[i];
    const netIncome = p.contributionMargin - allocated;
    const netMarginPct = p.revenue > 0 ? (netIncome / p.revenue) * 100 : 0;
    return { ...p, allocatedOH: allocated, netIncome, netMarginPct };
  }), [productMetrics, allocatedOH]);

  // Company totals
  const totals = useMemo(() => {
    const revenue = productPnL.reduce((s, p) => s + p.revenue, 0);
    const directCost = productPnL.reduce((s, p) => s + p.directCost, 0);
    const grossProfit = revenue - directCost;
    const directOH = productPnL.reduce((s, p) => s + p.directOverhead, 0);
    const contributionMargin = grossProfit - directOH;
    const netIncome = productPnL.reduce((s, p) => s + p.netIncome, 0);
    return { revenue, directCost, grossProfit, directOH, contributionMargin, netIncome, gpPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0, niPct: revenue > 0 ? (netIncome / revenue) * 100 : 0 };
  }, [productPnL]);

  // Mix data for chart
  const mixData = useMemo(() => productPnL.map((p, i) => ({
    name: p.name,
    revMix: totals.revenue > 0 ? (p.revenue / totals.revenue) * 100 : 0,
    profitMix: totals.netIncome > 0 ? (Math.max(0, p.netIncome) / productPnL.filter(x => x.netIncome > 0).reduce((s, x) => s + x.netIncome, 0)) * 100 : 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })), [productPnL, totals]);

  // Monthly trend (total CM)
  const monthlyTrend = useMemo(() => MONTHS.slice(0, cm).map((m, mi) => {
    const row: Record<string, any> = { month: m };
    products.forEach((p, pi) => {
      const rev = p.monthlyUnits[mi] * p.unitPrice / 1000;
      const cost = p.monthlyUnits[mi] * p.unitDirectCost / 1000;
      row[p.name] = rev - cost;
    });
    row['total'] = products.reduce((s, p) => s + (p.monthlyUnits[mi] * (p.unitPrice - p.unitDirectCost) / 1000), 0);
    return row;
  }), [products, cm]);

  // ── CRUD ──
  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const updateMonthUnits = useCallback((id: string, mi: number, value: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const arr = [...p.monthlyUnits];
      arr[mi] = value;
      return { ...p, monthlyUnits: arr };
    }));
  }, []);

  const addProduct = useCallback(() => {
    setProducts(prev => [...prev, {
      id: `p${Date.now()}`, name: 'New Product', category: 'General',
      unitPrice: 100, unitDirectCost: 40, monthlyUnits: Array(12).fill(100), directOverhead: 0,
    }]);
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (expandedProduct === id) setExpandedProduct(null);
  }, [expandedProduct]);

  // ── Export ──
  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `ProductProfit_${settings.fiscalYear}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Downloaded" });
    } catch { toast({ variant: 'destructive', title: "Failed" }); }
    finally { setIsDownloading(false); }
  }, [settings.fiscalYear, toast]);

  const handleDownloadCSV = useCallback(() => {
    const rows = productPnL.map(p => ({
      Product: p.name, Category: p.category, Units: p.units, UnitPrice: `$${p.unitPrice}`, UnitCost: `$${p.unitDirectCost}`,
      'Revenue ($K)': p.revenue.toFixed(1), 'Direct Cost ($K)': p.directCost.toFixed(1), 'Gross Profit ($K)': p.grossProfit.toFixed(1),
      'Gross Margin %': `${p.grossMarginPct.toFixed(1)}%`, 'Direct OH ($K)': p.directOverhead,
      'Contrib Margin ($K)': p.contributionMargin.toFixed(1), 'Allocated OH ($K)': p.allocatedOH.toFixed(1),
      'Net Income ($K)': p.netIncome.toFixed(1), 'Net Margin %': `${p.netMarginPct.toFixed(1)}%`,
      'Break-Even Units': p.breakEvenUnits === Infinity ? 'N/A' : p.breakEvenUnits,
    }));
    let csv = `PRODUCT PROFITABILITY — ${settings.companyName} FY${settings.fiscalYear}\n`;
    csv += `Months: 1-${cm} | OH Method: ${settings.ohAllocMethod} | Indirect OH: $${settings.totalIndirectOH}K\n\n`;
    csv += Papa.unparse(rows) + '\n\n';
    csv += `Total Revenue,$${totals.revenue.toFixed(1)}K\nTotal Net Income,$${totals.netIncome.toFixed(1)}K\nNet Margin,${totals.niPct.toFixed(1)}%\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ProductProfit_${settings.fiscalYear}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Downloaded" });
  }, [productPnL, settings, cm, totals, toast]);

  // ── Intro ──
  if (showIntro) return (
    <IntroPage hasUploadedData={!!parsedUpload} parseError={parseError} onStartWithData={applyUpload} onStartManual={() => setShowIntro(false)} />
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Product Profitability</h1><p className="text-muted-foreground mt-1">{settings.companyName} — FY{settings.fiscalYear} | Months 1–{cm}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
          <Button variant="ghost" size="icon" onClick={() => setGlossaryOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
        </div>
      </div>
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <ProductGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ══ Settings ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Settings & Overhead</CardTitle><CardDescription>Company info, period, and indirect overhead allocation</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={settings.companyName} onChange={e => setSettings(p => ({ ...p, companyName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Fiscal Year</Label><Input type="number" value={settings.fiscalYear} onChange={e => setSettings(p => ({ ...p, fiscalYear: parseInt(e.target.value) || 2025 }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Months</Label>
              <div className="flex items-center gap-2">
                <Slider value={[settings.currentMonth]} onValueChange={([v]) => setSettings(p => ({ ...p, currentMonth: v }))} min={1} max={12} step={1} className="flex-1" />
                <span className="text-sm font-mono w-6">{cm}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Indirect OH ($K)</Label>
              <Input type="number" value={settings.totalIndirectOH} onChange={e => setSettings(p => ({ ...p, totalIndirectOH: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">OH Allocation</Label>
              <div className="grid grid-cols-2 gap-1">
                {(['revenue', 'units', 'equal', 'custom'] as const).map(m => (
                  <Button key={m} variant={settings.ohAllocMethod === m ? 'default' : 'outline'} size="sm" className="text-[10px] h-7 capitalize" onClick={() => setSettings(p => ({ ...p, ohAllocMethod: m }))}>{m}</Button>
                ))}
              </div>
            </div>
          </div>
          {settings.ohAllocMethod === 'custom' && (
            <div className="mt-4 p-3 rounded-lg border bg-muted/10">
              <Label className="text-xs font-semibold text-muted-foreground">Custom OH Allocation (%)</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
                {products.map(p => (
                  <div key={p.id} className="space-y-1">
                    <Label className="text-[10px] truncate block">{p.name}</Label>
                    <Input type="number" value={settings.customOHPcts[p.id] || 0} onChange={e => setSettings(prev => ({ ...prev, customOHPcts: { ...prev.customOHPcts, [p.id]: parseFloat(e.target.value) || 0 } }))} className="h-6 text-xs font-mono" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Total: {Object.values(settings.customOHPcts).reduce((s, v) => s + v, 0).toFixed(1)}% (should be 100%)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══ KPI Dashboard ══ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Portfolio Summary — {products.length} Products</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                { label: 'Total Revenue', value: fmt(totals.revenue) },
                { label: 'Total COGS', value: fmt(totals.directCost) },
                { label: 'Gross Profit', value: fmt(totals.grossProfit), sub: fmtP(totals.gpPct) },
                { label: 'Direct OH', value: fmt(totals.directOH) },
                { label: 'Indirect OH', value: fmt(settings.totalIndirectOH) },
                { label: 'Net Income', value: fmt(totals.netIncome), sub: fmtP(totals.niPct) },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold text-primary">{value}</p>
                  {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Product Table ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Boxes className="w-5 h-5 text-primary" /></div>
              <div><CardTitle>Product P&L</CardTitle><CardDescription>Per-product profitability — click row to expand monthly detail</CardDescription></div>
            </div>
            <Button variant="outline" size="sm" onClick={addProduct}><Plus className="w-4 h-4 mr-1" />Add Product</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[130px]">Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">GP</TableHead>
                  <TableHead className="text-right">GP %</TableHead>
                  <TableHead className="text-right">CM</TableHead>
                  <TableHead className="text-right">Alloc OH</TableHead>
                  <TableHead className="text-right">Net Inc</TableHead>
                  <TableHead className="text-right">NM %</TableHead>
                  <TableHead className="text-right">BE Units</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productPnL.map((p, i) => (
                  <React.Fragment key={p.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedProduct(prev => prev === p.id ? null : p.id)}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedProduct === p.id ? 'rotate-90' : ''}`} />
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <Input value={p.name} onChange={e => { e.stopPropagation(); updateProduct(p.id, { name: e.target.value }); }} onClick={e => e.stopPropagation()} className="h-6 text-xs font-medium border-0 bg-transparent p-0 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <Input type="number" value={p.unitPrice} onChange={e => updateProduct(p.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono p-0.5" />
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <Input type="number" value={p.unitDirectCost} onChange={e => updateProduct(p.id, { unitDirectCost: parseFloat(e.target.value) || 0 })} className="h-6 w-16 text-right text-xs font-mono p-0.5" />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtU(p.units)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(p.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(p.grossProfit)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtP(p.grossMarginPct)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(p.contributionMargin)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(p.allocatedOH)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-semibold ${p.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.netIncome)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs ${p.netMarginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtP(p.netMarginPct)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{p.breakEvenUnits === Infinity ? '∞' : fmtU(p.breakEvenUnits)}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeProduct(p.id)}><X className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                    {expandedProduct === p.id && (
                      <TableRow>
                        <TableCell colSpan={13} className="p-0">
                          <div className="bg-muted/10 border-y px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Detail — {p.name}</span>
                                <Badge variant="outline" className="text-[9px]">{p.category}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs" onClick={e => e.stopPropagation()}>
                                <Label className="text-[10px]">Direct OH ($K):</Label>
                                <Input type="number" value={p.directOverhead} onChange={e => updateProduct(p.id, { directOverhead: parseFloat(e.target.value) || 0 })} className="h-5 w-16 text-right text-xs font-mono p-0.5" />
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs font-mono">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="p-1.5 text-left font-medium w-16">Month</th>
                                    {MONTHS.slice(0, cm).map(m => <th key={m} className="p-1.5 text-center font-medium w-16">{m}</th>)}
                                    <th className="p-1.5 text-center font-semibold border-l">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="p-1.5 font-semibold text-muted-foreground">Units</td>
                                    {MONTHS.slice(0, cm).map((m, mi) => (
                                      <td key={m} className="p-1" onClick={e => e.stopPropagation()}>
                                        <Input type="number" value={p.monthlyUnits[mi]} onChange={e => updateMonthUnits(p.id, mi, parseInt(e.target.value) || 0)} className="h-5 w-full text-center text-[10px] font-mono p-0" />
                                      </td>
                                    ))}
                                    <td className="p-1.5 text-center font-semibold border-l">{fmtU(p.units)}</td>
                                  </tr>
                                  <tr className="text-muted-foreground">
                                    <td className="p-1.5 font-semibold">Revenue</td>
                                    {MONTHS.slice(0, cm).map((m, mi) => (
                                      <td key={m} className="p-1.5 text-center">${(p.monthlyUnits[mi] * p.unitPrice / 1000).toFixed(0)}K</td>
                                    ))}
                                    <td className="p-1.5 text-center font-semibold border-l">{fmt(p.revenue)}</td>
                                  </tr>
                                  <tr className="text-muted-foreground">
                                    <td className="p-1.5 font-semibold">GP</td>
                                    {MONTHS.slice(0, cm).map((m, mi) => {
                                      const gp = p.monthlyUnits[mi] * (p.unitPrice - p.unitDirectCost) / 1000;
                                      return <td key={m} className="p-1.5 text-center">${gp.toFixed(0)}K</td>;
                                    })}
                                    <td className="p-1.5 text-center font-semibold border-l">{fmt(p.grossProfit)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {/* Totals */}
                <TableRow className="border-t-2 bg-primary/5">
                  <TableCell className="font-bold text-primary">Total</TableCell>
                  <TableCell></TableCell><TableCell></TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtU(totalUnits)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmt(totals.revenue)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmt(totals.grossProfit)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtP(totals.gpPct)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmt(totals.contributionMargin)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(settings.totalIndirectOH)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs font-bold ${totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.netIncome)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs font-bold ${totals.niPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtP(totals.niPct)}</TableCell>
                  <TableCell></TableCell><TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Calculation Breakdown ══ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />P&L Waterfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {[
                  { label: 'Total Revenue', value: totals.revenue, sub: `${products.length} products × ${cm} months` },
                  { label: '(−) Total Direct Cost', value: -totals.directCost },
                  { label: 'Gross Profit', value: totals.grossProfit, bold: true, sub: `${fmtP(totals.gpPct)} margin` },
                  { label: '(−) Direct Overhead', value: -totals.directOH },
                  { label: 'Contribution Margin', value: totals.contributionMargin, bold: true },
                  { label: '(−) Indirect Overhead', value: -settings.totalIndirectOH, sub: `Allocated by ${settings.ohAllocMethod}` },
                  { label: 'Net Income', value: totals.netIncome, bold: true, final: true, sub: `${fmtP(totals.niPct)} margin` },
                ].map(({ label, value, sub, bold, final }, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 ${final ? 'bg-primary/5' : ''} ${bold ? 'border-t-2' : ''}`}>
                    <div>
                      <span className={`text-sm ${bold || final ? 'font-semibold' : ''}`}>{label}</span>
                      {sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}
                    </div>
                    <span className={`font-mono text-sm ${final ? 'text-primary font-bold' : bold ? 'font-semibold' : ''} ${value < 0 && !final ? 'text-muted-foreground' : ''}`}>{value >= 0 ? '' : '−'}{fmt(Math.abs(value))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Report ══ */}
      <div className="flex justify-between items-center">
        <div><h2 className="text-lg font-semibold">Profitability Report</h2><p className="text-sm text-muted-foreground">Charts, mix analysis, and summary</p></div>
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
          <h2 className="text-2xl font-bold">{settings.companyName} — FY{settings.fiscalYear} Product Profitability</h2>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()} | {products.length} Products | Months 1–{cm} | OH: {settings.ohAllocMethod}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(totals.revenue), sub: `${productPnL.length} products`, color: 'text-primary' },
            { label: 'Gross Margin', value: `${totals.gpPct.toFixed(1)}%`, sub: `GP: ${fmt(totals.grossProfit)}`, color: totals.gpPct >= 40 ? 'text-green-600' : totals.gpPct >= 20 ? 'text-amber-600' : 'text-red-600' },
            { label: 'Net Income', value: fmt(totals.netIncome), sub: `${totals.niPct.toFixed(1)}% net margin`, color: totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Unprofitable', value: `${productPnL.filter(p => p.netIncome < 0).length}`, sub: `of ${productPnL.length} products`, color: productPnL.some(p => p.netIncome < 0) ? 'text-red-600' : 'text-green-600' },
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
              <div><CardTitle>Key Findings</CardTitle><CardDescription>Product profitability highlights</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
              <div className="space-y-3">
                {(() => {
                  const items: string[] = [];
                  items.push(`Portfolio revenue: ${fmt(totals.revenue)} across ${productPnL.length} products. Gross margin: ${totals.gpPct.toFixed(1)}%. Net margin: ${totals.niPct.toFixed(1)}%.`);
                  const best = productPnL.reduce((a, b) => a.netMarginPct > b.netMarginPct ? a : b);
                  const worst = productPnL.reduce((a, b) => a.netMarginPct < b.netMarginPct ? a : b);
                  items.push(`Highest margin: ${best.name} at ${best.netMarginPct.toFixed(1)}% net margin (${fmt(best.netIncome)} profit on ${fmt(best.revenue)} revenue).`);
                  if (worst.netMarginPct < 0) items.push(`${worst.name} is unprofitable at ${worst.netMarginPct.toFixed(1)}% net margin — losing ${fmt(Math.abs(worst.netIncome))} on ${fmt(worst.revenue)} revenue.`);
                  else items.push(`Lowest margin: ${worst.name} at ${worst.netMarginPct.toFixed(1)}% — still profitable but below portfolio average.`);
                  const topByRev = productPnL.reduce((a, b) => a.revenue > b.revenue ? a : b);
                  const revMix = totals.revenue > 0 ? (topByRev.revenue / totals.revenue * 100) : 0;
                  const profitMix = totals.netIncome > 0 ? (Math.max(0, topByRev.netIncome) / productPnL.filter(x => x.netIncome > 0).reduce((s, x) => s + x.netIncome, 0) * 100) : 0;
                  items.push(`${topByRev.name} leads revenue at ${revMix.toFixed(0)}% mix but contributes ${profitMix.toFixed(0)}% of profit${Math.abs(revMix - profitMix) > 10 ? ' — significant mix gap.' : '.'}`);
                  const unprofitable = productPnL.filter(p => p.netIncome < 0);
                  if (unprofitable.length > 0) items.push(`${unprofitable.length} product${unprofitable.length > 1 ? 's' : ''} with negative net income totaling ${fmt(unprofitable.reduce((s, p) => s + p.netIncome, 0))}.`);
                  else items.push(`All ${productPnL.length} products are profitable — healthy portfolio.`);
                  return items.map((text, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{text}</p></div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Product P&L Summary Table */}
        <Card>
          <CardHeader><CardTitle>Product P&L Summary</CardTitle><CardDescription>Revenue through net income by product with margin analysis</CardDescription></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-semibold">Product</th>
              <th className="p-2 text-right font-semibold">Revenue</th>
              <th className="p-2 text-right font-semibold">Direct Cost</th>
              <th className="p-2 text-right font-semibold">Gross Profit</th>
              <th className="p-2 text-right font-semibold">GP %</th>
              <th className="p-2 text-right font-semibold">Direct OH</th>
              <th className="p-2 text-right font-semibold">Alloc OH</th>
              <th className="p-2 text-right font-semibold">Net Income</th>
              <th className="p-2 text-right font-semibold">Net %</th>
              <th className="p-2 text-right font-semibold">Rev Mix</th>
            </tr></thead>
            <tbody>{productPnL.map((p, i) => {
              const revMix = totals.revenue > 0 ? (p.revenue / totals.revenue * 100) : 0;
              return (
                <tr key={p.name} className={`border-b ${p.netIncome < 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                  <td className="p-2 font-medium"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{p.name}</div></td>
                  <td className="p-2 text-right font-mono">{fmt(p.revenue)}</td>
                  <td className="p-2 text-right font-mono">{fmt(p.directCost)}</td>
                  <td className="p-2 text-right font-mono">{fmt(p.grossProfit)}</td>
                  <td className={`p-2 text-right font-mono ${p.grossMarginPct >= 40 ? 'text-green-600' : p.grossMarginPct >= 20 ? 'text-amber-600' : 'text-red-600'}`}>{p.grossMarginPct.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{fmt(p.directOverhead)}</td>
                  <td className="p-2 text-right font-mono">{fmt(p.allocatedOH)}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${p.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.netIncome)}</td>
                  <td className={`p-2 text-right font-mono ${p.netMarginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{p.netMarginPct.toFixed(1)}%</td>
                  <td className="p-2 text-right font-mono">{revMix.toFixed(1)}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr className="border-t-2 font-semibold bg-muted/30">
              <td className="p-2">Total</td>
              <td className="p-2 text-right font-mono">{fmt(totals.revenue)}</td>
              <td className="p-2 text-right font-mono">{fmt(totals.directCost)}</td>
              <td className="p-2 text-right font-mono">{fmt(totals.grossProfit)}</td>
              <td className="p-2 text-right font-mono">{totals.gpPct.toFixed(1)}%</td>
              <td className="p-2 text-right font-mono">{fmt(totals.directOH)}</td>
              <td className="p-2 text-right font-mono">{fmt(totals.revenue - totals.directCost - totals.directOH - totals.netIncome > 0 ? totals.revenue - totals.directCost - totals.directOH - totals.netIncome : 0)}</td>
              <td className={`p-2 text-right font-mono font-bold ${totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.netIncome)}</td>
              <td className="p-2 text-right font-mono">{totals.niPct.toFixed(1)}%</td>
              <td className="p-2 text-right font-mono">100.0%</td>
            </tr></tfoot>
          </table></div></CardContent>
        </Card>

        

        {/* Net Margin by Product */}
        <Card>
          <CardHeader><CardTitle>Net Margin by Product</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPnL.map((p, i) => ({ name: p.name, netMargin: p.netMarginPct, fill: CHART_COLORS[i % CHART_COLORS.length] }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v.toFixed(1)}%`, 'Net Margin']} />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <Bar dataKey="netMargin" radius={[0, 4, 4, 0]}>
                    {productPnL.map((p, i) => <Cell key={i} fill={p.netMarginPct >= 0 ? CHART_COLORS[i % CHART_COLORS.length] : '#e57373'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Mix vs Profit Mix */}
        <Card>
          <CardHeader><CardTitle>Revenue Mix vs Profit Mix</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mixData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: any) => [`${v.toFixed(1)}%`, '']} />
                  <Legend />
                  <Bar dataKey="revMix" name="Revenue Mix %" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profitMix" name="Profit Mix %" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Gross Profit Trend */}
        <Card>
          <CardHeader><CardTitle>Monthly Gross Profit by Product</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${v}K`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}K`, '']} />
                  <Legend />
                  {products.map((p, i) => (
                    <Bar key={p.id} dataKey={p.name} stackId="gp" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                  <Line dataKey="total" name="Total" type="monotone" stroke="#000" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Break-Even Summary */}
        <Card>
          <CardHeader><CardTitle>Break-Even Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {productPnL.map((p, i) => {
                const pctOfBE = p.breakEvenUnits > 0 && p.breakEvenUnits !== Infinity ? (p.units / p.breakEvenUnits) * 100 : 0;
                const aboveBE = p.units >= p.breakEvenUnits;
                const surplus = p.units - p.breakEvenUnits;
                return (
                  <div key={p.id} className={`p-3 rounded-lg border ${aboveBE ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                    <div className="text-center mb-2">
                      <p className={`text-2xl font-bold ${aboveBE ? 'text-green-600' : 'text-red-600'}`}>{pctOfBE.toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">of break-even</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">BE threshold</span><span className="font-mono">{p.breakEvenUnits === Infinity ? '∞' : fmtU(p.breakEvenUnits)} units</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">YTD actual</span><span className="font-mono">{fmtU(p.units)} units</span></div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-muted-foreground">{aboveBE ? 'Surplus' : 'Deficit'}</span>
                        <span className={`font-mono font-semibold ${aboveBE ? 'text-green-600' : 'text-red-600'}`}>
                          {aboveBE ? '+' : ''}{surplus === Infinity || surplus === -Infinity ? '∞' : fmtU(Math.abs(surplus))} units
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Written Summary */}
        <Card>
          <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg p-6 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">FY{settings.fiscalYear} Product Profitability — {settings.companyName}</h3></div>
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Across {products.length} products over {cm} months, <strong>{settings.companyName}</strong> generated total revenue of <strong>{fmt(totals.revenue)}</strong> with a gross margin of {fmtP(totals.gpPct)} and net margin of <strong>{fmtP(totals.niPct)}</strong>.
                </p>
                {(() => {
                  const best = productPnL.reduce((max, p) => p.netMarginPct > max.netMarginPct ? p : max, productPnL[0]);
                  const worst = productPnL.reduce((min, p) => p.netMarginPct < min.netMarginPct ? p : min, productPnL[0]);
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      The highest-margin product is <strong>{best.name}</strong> at {fmtP(best.netMarginPct)} net margin ({fmt(best.netIncome)} net income). The lowest is <strong>{worst.name}</strong> at {fmtP(worst.netMarginPct)}{worst.netIncome < 0 ? ', which is operating at a loss' : ''}.
                    </p>
                  );
                })()}
                {(() => {
                  const profitable = productPnL.filter(p => p.netIncome > 0);
                  const unprofitable = productPnL.filter(p => p.netIncome <= 0);
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {profitable.length} product{profitable.length !== 1 ? 's are' : ' is'} profitable and {unprofitable.length} {unprofitable.length !== 1 ? 'are' : 'is'} at or below breakeven.
                      {unprofitable.length > 0 && ` Loss-making products: ${unprofitable.map(p => p.name).join(', ')}.`}
                    </p>
                  );
                })()}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Indirect overhead of {fmt(settings.totalIndirectOH)} is allocated by <strong>{settings.ohAllocMethod}</strong> method. Changing the allocation method may significantly shift individual product profitability — try different methods to stress-test results.
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
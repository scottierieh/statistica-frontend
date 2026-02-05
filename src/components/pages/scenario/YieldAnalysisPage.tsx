"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Bug, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Zap, Award, Percent,
  AlertTriangle, TrendingDown, PieChart, Layers, Factory,
  ListChecks, BarChart2, CircleDot, BookOpen, BookMarked
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface DefectCategory {
  category: string;
  count: number;
  percent: number;
  cumulative_percent: number;
  dpmo: number;
}

interface ProcessStep {
  step: string;
  input: number;
  output: number;
  defects: number;
  yield_percent: number;
  fty: number;
  dpu: number;
}

interface YieldDefectResult {
  success: boolean;
  results: {
    overall: {
      total_units: number;
      total_defects: number;
      total_defective_units: number;
      fty: number;
      rty: number;
      dpu: number;
      dpmo: number;
      sigma_level: number;
      yield_percent: number;
      defect_rate: number;
    };
    defect_categories: DefectCategory[];
    process_steps?: ProcessStep[];
    pareto: {
      vital_few: string[];
      trivial_many: string[];
      vital_few_percent: number;
    };
    trends?: {
      period: string;
      yield_percent: number;
      dpu: number;
      dpmo: number;
    }[];
    cost_analysis?: {
      defect_cost: number;
      inspection_cost: number;
      rework_cost: number;
      scrap_cost: number;
      total_coq: number;
      coq_percent_revenue: number;
    };
  };
  visualizations: {
    pareto_chart?: string;
    yield_trend?: string;
    defect_distribution?: string;
    process_yield?: string;
    dpmo_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    fty: number;
    rty: number;
    dpmo: number;
    sigma_level: number;
    top_defect: string;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const ANALYSIS_TYPES = [
  { value: "basic", label: "Basic Yield Analysis", desc: "Simple yield & defect rates", icon: Percent },
  { value: "pareto", label: "Pareto Analysis", desc: "Identify vital few defects", icon: BarChart3 },
  { value: "process", label: "Process Yield (RTY)", desc: "Multi-step rolled throughput", icon: Layers },
  { value: "dpmo", label: "DPMO & Sigma", desc: "Six Sigma metrics", icon: Target },
];

const COLORS = {
  yield: '#22c55e',
  defect: '#ef4444',
  pareto: '#3b82f6',
  cumulative: '#f59e0b',
  process: '#8b5cf6',
};

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const defectTypes = ['Scratch', 'Dent', 'Contamination', 'Dimensional', 'Color', 'Crack', 'Missing Part', 'Other'];
  const processSteps = ['Cutting', 'Forming', 'Welding', 'Painting', 'Assembly', 'Testing'];
  const data: DataRow[] = [];
  
  // Generate 500 inspection records
  for (let i = 1; i <= 500; i++) {
    const hasDefect = Math.random() < 0.12; // 12% defect rate
    const defectType = hasDefect ? defectTypes[Math.floor(Math.random() * defectTypes.length)] : null;
    const step = processSteps[Math.floor(Math.random() * processSteps.length)];
    const date = new Date(2024, Math.floor((i - 1) / 50), ((i - 1) % 28) + 1);
    
    // Weight defects: Scratch most common, Crack least common
    let weightedDefect = defectType;
    if (hasDefect) {
      const r = Math.random();
      if (r < 0.30) weightedDefect = 'Scratch';
      else if (r < 0.50) weightedDefect = 'Dent';
      else if (r < 0.65) weightedDefect = 'Contamination';
      else if (r < 0.78) weightedDefect = 'Dimensional';
      else if (r < 0.88) weightedDefect = 'Color';
      else if (r < 0.94) weightedDefect = 'Missing Part';
      else if (r < 0.98) weightedDefect = 'Crack';
      else weightedDefect = 'Other';
    }
    
    data.push({
      unit_id: `UNIT-${String(i).padStart(4, '0')}`,
      date: date.toISOString().slice(0, 10),
      process_step: step,
      is_defective: hasDefect ? 1 : 0,
      defect_type: weightedDefect,
      opportunities: 10, // 10 opportunities for defects per unit
      defect_count: hasDefect ? Math.floor(Math.random() * 2) + 1 : 0,
    });
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

const DetailParagraph: React.FC<{ title?: string; detail: string }> = ({ title, detail }) => (
  <div className="mt-6 p-4 rounded-lg border border-border bg-muted/10">
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{title || "Detailed Analysis"}</p>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail}</p>
  </div>
);

const DataPreview: React.FC<{ data: DataRow[]; columns: string[] }> = ({ data, columns }) => {
  const [expanded, setExpanded] = useState(false);
  
  const downloadCSV = () => {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'yield_defect_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} records</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}>
          <Download className="w-3 h-3" />Download
        </Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.slice(0, 7).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 15).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 7).map(col => (
                    <TableCell key={col} className="text-xs py-1.5">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 15 && (
            <p className="text-xs text-muted-foreground p-2 text-center">
              Showing first 15 of {data.length} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ 
  currentStep: number; 
  hasResults: boolean; 
  onStepClick: (step: number) => void 
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Config" },
    { num: 3, label: "Validation" },
    { num: 4, label: "Summary" },
    { num: 5, label: "Why" },
    { num: 6, label: "Report" },
  ];
  
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
        
        return (
          <React.Fragment key={step.num}>
            <button
              onClick={() => isAccessible && onStepClick(step.num)}
              disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-primary/10 text-primary"
                    : isAccessible
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}
            >
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const YieldGauge: React.FC<{ 
  value: number; 
  label: string;
}> = ({ value, label }) => {
  const getColor = (val: number) => {
    if (val >= 99) return '#22c55e';
    if (val >= 95) return '#84cc16';
    if (val >= 90) return '#f59e0b';
    return '#ef4444';
  };
  
  const color = getColor(value);
  
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-2xl font-bold" style={{ color }}>{value.toFixed(2)}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1 text-muted-foreground">
        <span>0%</span>
        <span className="text-amber-500">90%</span>
        <span className="text-green-500">99%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

const ParetoBar: React.FC<{ 
  category: DefectCategory; 
  maxCount: number;
  isVitalFew: boolean;
}> = ({ category, maxCount, isVitalFew }) => {
  const width = (category.count / maxCount) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{category.category}</span>
          {isVitalFew && <Badge variant="destructive" className="text-xs">Vital Few</Badge>}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>{category.count}</span>
          <span className="w-16 text-right">{category.percent.toFixed(1)}%</span>
          <span className="w-16 text-right text-amber-500">{category.cumulative_percent.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${width}%`, 
            backgroundColor: isVitalFew ? COLORS.defect : '#94a3b8' 
          }}
        />
      </div>
    </div>
  );
};

const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Yield & Defect Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Yield & Defect Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yield and defect analysis measures manufacturing quality by tracking the percentage of units that meet 
              specifications (yield) and analyzing defect patterns. It's fundamental to Six Sigma, Lean Manufacturing, 
              and continuous improvement initiatives. Pareto analysis helps identify the "vital few" defects that cause 
              most problems, enabling focused improvement efforts.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Key Yield Metrics
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">First Time Yield (FTY)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Percentage of units that pass inspection without rework or repair<br/>
                  <strong>Formula:</strong> FTY = (Good Units / Total Units) × 100%<br/>
                  <strong>Example:</strong> 950 good units out of 1,000 → FTY = 95%<br/>
                  <strong>Limitation:</strong> Doesn't account for hidden factory (rework that happens before final inspection)<br/>
                  <strong>Industry Target:</strong> Above 95% = good, Above 99% = excellent
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Rolled Throughput Yield (RTY)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Probability of a unit passing through ALL process steps without defect<br/>
                  <strong>Formula:</strong> RTY = FTY₁ × FTY₂ × FTY₃ × ... × FTYₙ<br/>
                  <strong>Example:</strong> 3 steps at 95% each → RTY = 0.95³ = 85.7%<br/>
                  <strong>Why important:</strong> Reveals true process capability by compounding yields<br/>
                  <strong>Key Insight:</strong> RTY is always lower than or equal to the lowest individual FTY
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Yield vs Defect Rate</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Relationship:</strong> Defect Rate = 100% - Yield%<br/>
                  <strong>Example:</strong> 95% yield = 5% defect rate<br/>
                  <strong>When to use each:</strong> Use yield % for positive framing, defect rate when focusing on problems<br/>
                  <strong>Note:</strong> Can have multiple defects per defective unit
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Defect Metrics
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">DPU (Defects Per Unit)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Average number of defects per unit inspected<br/>
                  <strong>Formula:</strong> DPU = Total Defects / Total Units<br/>
                  <strong>Example:</strong> 120 defects in 1,000 units → DPU = 0.12<br/>
                  <strong>Interpretation:</strong> On average, each unit has 0.12 defects<br/>
                  <strong>Range:</strong> 0 (perfect) to unlimited (can have multiple defects per unit)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">DPO (Defects Per Opportunity)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Probability of a defect at any opportunity<br/>
                  <strong>Formula:</strong> DPO = Total Defects / (Units × Opportunities per Unit)<br/>
                  <strong>Example:</strong> 120 defects, 1,000 units, 10 opportunities → DPO = 120/(1,000×10) = 0.012<br/>
                  <strong>Why use opportunities:</strong> Normalizes for complexity (10-step process vs 100-step process)<br/>
                  <strong>Opportunity definition:</strong> Any place where a defect could occur
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">DPMO (Defects Per Million Opportunities)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> DPO scaled to million opportunities (industry standard metric)<br/>
                  <strong>Formula:</strong> DPMO = DPO × 1,000,000<br/>
                  <strong>Example:</strong> DPO = 0.012 → DPMO = 12,000<br/>
                  <strong>Why million:</strong> Makes small probabilities easier to communicate<br/>
                  <strong>Benchmark:</strong> 6,210 DPMO = 4σ, 233 DPMO = 5σ, 3.4 DPMO = 6σ
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Sigma Level</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Standard deviation distance from mean to specification limit<br/>
                  <strong>From DPMO:</strong> Use conversion table (DPMO 66,807 = 3σ, 6,210 = 4σ, 233 = 5σ, 3.4 = 6σ)<br/>
                  <strong>Interpretation:</strong> Higher sigma = better quality = fewer defects<br/>
                  <strong>Industry standards:</strong> 3σ = average, 4σ = good, 6σ = world class<br/>
                  <strong>1.5σ shift:</strong> Real-world sigma includes 1.5σ shift for long-term variation
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Pareto Analysis (80/20 Rule)
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Pareto Principle</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Core Idea:</strong> 80% of problems come from 20% of causes<br/>
                  <strong>Application:</strong> Focus on "vital few" defects that cause most issues<br/>
                  <strong>Method:</strong> Sort defects by frequency, calculate cumulative %, identify categories contributing to 80%<br/>
                  <strong>Visual:</strong> Bar chart (frequency) + line chart (cumulative %)<br/>
                  <strong>Decision Rule:</strong> Prioritize improvement on vital few categories first
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Vital Few vs Trivial Many</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Vital Few:</strong> Small number of defect types causing majority of problems (usually 2-3 categories)<br/>
                  <strong>Trivial Many:</strong> Large number of defect types each contributing small amount<br/>
                  <strong>Strategy:</strong> Attack vital few with root cause analysis, monitor trivial many for shifts<br/>
                  <strong>Resource Allocation:</strong> 80% of improvement resources on vital few
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600">Common Mistake: Equal Effort on All Defects</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Problem:</strong> Spreading resources equally across all defect types<br/>
                  <strong>Reality:</strong> Fixing top 2-3 defects often eliminates 70-80% of total defects<br/>
                  <strong>Solution:</strong> Use Pareto analysis to focus efforts where they'll have maximum impact
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Process Yield Analysis
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Multi-Step Process Yield:</strong></p>
              <div className="p-3 rounded-lg border border-border bg-muted/10 mt-2">
                <p className="text-xs"><strong>Example Process:</strong></p>
                <div className="space-y-1 text-xs mt-2">
                  <p>Step 1 (Cutting): 98% yield → 98 good out of 100</p>
                  <p>Step 2 (Forming): 97% yield → 95 good (98 × 0.97)</p>
                  <p>Step 3 (Assembly): 99% yield → 94 good (95 × 0.99)</p>
                  <p className="font-medium text-primary mt-2">RTY = 0.98 × 0.97 × 0.99 = 94.1%</p>
                </div>
              </div>

              <p className="mt-3"><strong>Key Insights from RTY:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Compounding Effect:</strong> Each step multiplies defect probability</li>
                <li>• <strong>Weakest Link:</strong> Lowest-yield step has biggest impact on RTY</li>
                <li>• <strong>Hidden Factory:</strong> Difference between FTY and RTY reveals rework burden</li>
                <li>• <strong>Improvement Priority:</strong> Focus on steps with lowest yield first</li>
              </ul>

              <p className="mt-3"><strong>Calculating Step Yield:</strong></p>
              <div className="p-2 rounded-lg bg-muted/50 text-xs mt-1">
                Step Yield = Output / Input<br/>
                Where Input = Units entering step, Output = Good units after step
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Sigma Level Conversion Table
            </h3>
            <div className="space-y-2">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Sigma (σ)</TableHead>
                    <TableHead className="text-right">DPMO</TableHead>
                    <TableHead className="text-right">Yield %</TableHead>
                    <TableHead className="text-right">Defect %</TableHead>
                    <TableHead>Industry Standard</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-red-500/5">
                    <TableCell className="font-medium">2σ</TableCell>
                    <TableCell className="text-right">308,537</TableCell>
                    <TableCell className="text-right">69.15%</TableCell>
                    <TableCell className="text-right">30.85%</TableCell>
                    <TableCell className="text-red-600">Very Poor - Unacceptable</TableCell>
                  </TableRow>
                  <TableRow className="bg-amber-500/5">
                    <TableCell className="font-medium">3σ</TableCell>
                    <TableCell className="text-right">66,807</TableCell>
                    <TableCell className="text-right">93.32%</TableCell>
                    <TableCell className="text-right">6.68%</TableCell>
                    <TableCell className="text-amber-600">Average - Many companies</TableCell>
                  </TableRow>
                  <TableRow className="bg-yellow-500/5">
                    <TableCell className="font-medium">4σ</TableCell>
                    <TableCell className="text-right">6,210</TableCell>
                    <TableCell className="text-right">99.38%</TableCell>
                    <TableCell className="text-right">0.62%</TableCell>
                    <TableCell className="text-yellow-600">Good - Competitive</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-500/5">
                    <TableCell className="font-medium">5σ</TableCell>
                    <TableCell className="text-right">233</TableCell>
                    <TableCell className="text-right">99.977%</TableCell>
                    <TableCell className="text-right">0.023%</TableCell>
                    <TableCell className="text-green-600">Excellent - Industry leader</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-600/5">
                    <TableCell className="font-medium">6σ</TableCell>
                    <TableCell className="text-right">3.4</TableCell>
                    <TableCell className="text-right">99.99966%</TableCell>
                    <TableCell className="text-right">0.00034%</TableCell>
                    <TableCell className="text-green-700">World Class - Virtually perfect</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="p-3 rounded-lg border border-border bg-muted/10 mt-3">
                <p className="font-medium text-sm">Real-World Sigma Examples:</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Airline baggage handling:</strong> ~4σ (1 lost bag per 200 flights)</li>
                  <li>• <strong>Restaurant orders:</strong> ~3σ (6-7% wrong orders)</li>
                  <li>• <strong>Prescription drug manufacturing:</strong> 5-6σ required by FDA</li>
                  <li>• <strong>Semiconductor manufacturing:</strong> 6σ+ (defects measured in PPB)</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls & How to Avoid Them
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Confusing Defects with Defectives</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> One unit can have multiple defects<br/>
                  <strong>Example:</strong> 100 units, 150 defects → 100 defective units, NOT 150<br/>
                  <strong>Solution:</strong> Track both defects (count) and defectives (units)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Ignoring Opportunities</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Comparing DPMO across different complexity products<br/>
                  <strong>Example:</strong> Simple product (5 opportunities) vs complex (50 opportunities)<br/>
                  <strong>Solution:</strong> Always define opportunities consistently
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Using FTY Instead of RTY</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Final FTY hides rework in middle steps (hidden factory)<br/>
                  <strong>Impact:</strong> Underestimates true defect cost and capacity loss<br/>
                  <strong>Solution:</strong> Always calculate RTY for multi-step processes
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Not Updating Pareto Over Time</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Vital few changes as you fix top defects<br/>
                  <strong>Risk:</strong> Focusing on old problems while new ones emerge<br/>
                  <strong>Solution:</strong> Regenerate Pareto monthly, track shifts
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Collection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Collect real-time data at each process step</li>
                  <li>• Use consistent defect categories (standardized taxonomy)</li>
                  <li>• Require root cause for each defect</li>
                  <li>• Track inspector ID and timestamp</li>
                  <li>• Validate data quality weekly</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Analysis Frequency</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Daily: Review defect counts and trends</li>
                  <li>• Weekly: Update Pareto charts</li>
                  <li>• Monthly: Calculate RTY and sigma level</li>
                  <li>• Quarterly: Review defect taxonomy</li>
                  <li>• Annually: Benchmark against industry</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Improvement Methodology</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use DMAIC for vital few defects</li>
                  <li>• Apply 5 Whys for root cause analysis</li>
                  <li>• Implement poka-yoke (mistake-proofing)</li>
                  <li>• Track improvement impact on metrics</li>
                  <li>• Standardize solutions across similar processes</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Reporting & Communication</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Visual management boards at workstations</li>
                  <li>• Monthly quality scorecards to leadership</li>
                  <li>• Celebrate improvements (before/after Pareto)</li>
                  <li>• Share lessons learned across shifts</li>
                  <li>• Link defects to business impact ($)</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Improvement Strategies by Sigma Level
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600">Below 3σ (DPMO above 66,000)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Status:</strong> Crisis - Immediate action required<br/>
                  <strong>Focus:</strong> Basic process control and containment<br/>
                  <strong>Actions:</strong><br/>
                  • Form rapid response team<br/>
                  • Implement 100% inspection<br/>
                  • Conduct failure mode analysis<br/>
                  • Stabilize top 2 defects first<br/>
                  • Consider process redesign
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600">3σ to 4σ (DPMO 6,000-66,000)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Status:</strong> Average - Improvement needed<br/>
                  <strong>Focus:</strong> Systematic problem solving<br/>
                  <strong>Actions:</strong><br/>
                  • Apply DMAIC to vital few<br/>
                  • Implement Statistical Process Control<br/>
                  • Enhance operator training<br/>
                  • Target 50% defect reduction<br/>
                  • Root cause analysis on top defects
                </p>
              </div>

              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600">Above 4σ (DPMO below 6,000)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Status:</strong> Good - Maintain and optimize<br/>
                  <strong>Focus:</strong> Continuous improvement culture<br/>
                  <strong>Actions:</strong><br/>
                  • Maintain current controls<br/>
                  • Focus on process optimization<br/>
                  • Share best practices<br/>
                  • Target 5σ or 6σ<br/>
                  • Prevent regression
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> Yield and defect metrics are lagging indicators - they 
              tell you what happened. For real improvement, combine with leading indicators (process parameters, SPC charts) 
              and always follow the Pareto principle: focus 80% of your improvement resources on the vital few defects that 
              cause 80% of your problems. The goal isn't just to measure defects - it's to systematically eliminate them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  analysisType: string;
  setAnalysisType: (type: string) => void;
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ analysisType, setAnalysisType, onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Bug className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Yield & Defect Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze production yield, identify defect patterns, and calculate Six Sigma metrics.
          Pareto analysis to focus on vital few issues.
        </p>
      </div>
      
      {/* ❌ Analysis Type 선택 카드 삭제 */}
      
      {/* 3개 핵심 카드 추가 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Yield Analysis</p>
              <p className="text-xs text-muted-foreground">FTY & RTY metrics</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Pareto Analysis</p>
              <p className="text-xs text-muted-foreground">Vital few defects</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Six Sigma Metrics</p>
              <p className="text-xs text-muted-foreground">DPMO & Sigma level</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Yield & Defect Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "First Time Yield (FTY) & Rolled Throughput Yield (RTY)",
                  "Defects Per Unit (DPU) & DPMO",
                  "Sigma level from defect rate",
                  "Pareto analysis (vital few vs trivial many)",
                  "Process step yield breakdown",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Required Data</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Unit identifier column",
                  "Defective flag (0/1) or defect count",
                  "Defect type/category column",
                  "Process step column (for RTY)",
                  "Opportunities per unit (for DPMO)",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2">
              <Activity className="w-4 h-4" />
              Load Sample Data
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Your Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MAIN COMPONENT START ============
export default function YieldDefectAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<YieldDefectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  // 👈 이 줄 추가


  // Configuration
  const [analysisType, setAnalysisType] = useState<string>("pareto");
  const [unitCol, setUnitCol] = useState<string>("");
  const [defectiveCol, setDefectiveCol] = useState<string>("");
  const [defectTypeCol, setDefectTypeCol] = useState<string>("");
  const [defectCountCol, setDefectCountCol] = useState<string>("");
  const [processStepCol, setProcessStepCol] = useState<string>("");
  const [opportunitiesCol, setOpportunitiesCol] = useState<string>("");
  const [opportunitiesPerUnit, setOpportunitiesPerUnit] = useState<number>(10);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setUnitCol("unit_id");
    setDefectiveCol("is_defective");
    setDefectTypeCol("defect_type");
    setDefectCountCol("defect_count");
    setProcessStepCol("process_step");
    setOpportunitiesCol("opportunities");
    setOpportunitiesPerUnit(10);
    setCurrentStep(2);
    setResults(null);
    setError(null);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setData(result.data);
      setColumns(result.columns);
      setCurrentStep(2);
      setResults(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} records loaded` : "No data loaded"
      },
      {
        name: "Defect Indicator",
        passed: !!defectiveCol || !!defectCountCol,
        message: defectiveCol || defectCountCol ? `Using: ${defectiveCol || defectCountCol}` : "Select defective or defect count column"
      },
    ];
    
    if (analysisType === 'pareto') {
      checks.push({
        name: "Defect Type Column",
        passed: !!defectTypeCol,
        message: defectTypeCol ? `Using: ${defectTypeCol}` : "Required for Pareto analysis"
      });
    }
    
    if (analysisType === 'process') {
      checks.push({
        name: "Process Step Column",
        passed: !!processStepCol,
        message: processStepCol ? `Using: ${processStepCol}` : "Required for RTY analysis"
      });
    }
    
    if (analysisType === 'dpmo') {
      checks.push({
        name: "Opportunities",
        passed: !!opportunitiesCol || opportunitiesPerUnit > 0,
        message: opportunitiesCol ? `Using: ${opportunitiesCol}` : `Fixed: ${opportunitiesPerUnit} per unit`
      });
    }
    
    return checks;
  }, [data, defectiveCol, defectCountCol, defectTypeCol, processStepCol, opportunitiesCol, opportunitiesPerUnit, analysisType]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        unit_col: unitCol || null,
        defective_col: defectiveCol || null,
        defect_type_col: defectTypeCol || null,
        defect_count_col: defectCountCol || null,
        process_step_col: processStepCol || null,
        opportunities_col: opportunitiesCol || null,
        opportunities_per_unit: opportunitiesPerUnit,
        analysis_type: analysisType,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/yield-defect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: YieldDefectResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const { defect_categories } = results.results;
    
    const rows: string[] = ['Category,Count,Percent,Cumulative%,DPMO'];
    defect_categories.forEach(c => {
      rows.push(`${c.category},${c.count},${c.percent.toFixed(2)}%,${c.cumulative_percent.toFixed(2)}%,${c.dpmo.toFixed(0)}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'yield_defect_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `yield_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Yield & Defect Analysis
        </CardTitle>
        <CardDescription>Set up analysis parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Type 선택 */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Analysis Type
          </h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setAnalysisType(type.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  analysisType === type.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <type.icon className="w-5 h-5 text-primary" />
                  <p className="font-medium text-sm">{type.label}</p>
                  {type.value === 'pareto' && (
                    <Badge variant="secondary" className="text-xs">Popular</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* 👇 Required Columns - Defective Flag 추가 */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit ID Column</Label>
              <Select value={unitCol || "__none__"} onValueChange={v => setUnitCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Defective Flag (0/1) *</Label>
              <Select value={defectiveCol || "__none__"} onValueChange={v => setDefectiveCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Binary column: 1=defective, 0=good</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Defect Details */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" />
            Defect Details
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Defect Type/Category {analysisType === 'pareto' ? '*' : ''}</Label>
              <Select value={defectTypeCol || "__none__"} onValueChange={v => setDefectTypeCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              {analysisType === 'pareto' && (
                <p className="text-xs text-muted-foreground">Required for Pareto analysis</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Defect Count (per unit)</Label>
              <Select value={defectCountCol || "__none__"} onValueChange={v => setDefectCountCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None (use flag) --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Optional: number of defects per unit</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Process & DPMO Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Process & DPMO Settings
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Process Step {analysisType === 'process' ? '*' : ''}</Label>
              <Select value={processStepCol || "__none__"} onValueChange={v => setProcessStepCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              {analysisType === 'process' && (
                <p className="text-xs text-muted-foreground">Required for RTY analysis</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Opportunities Column</Label>
              <Select value={opportunitiesCol || "__none__"} onValueChange={v => setOpportunitiesCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Fixed value --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opportunities Per Unit</Label>
              <Input 
                type="number" 
                value={opportunitiesPerUnit} 
                onChange={(e) => setOpportunitiesPerUnit(Number(e.target.value))}
                min={1}
                disabled={!!opportunitiesCol}
              />
              <p className="text-xs text-muted-foreground">For DPMO calculation</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue to Validation
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ============ STEP 3: VALIDATION ============
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Data Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'
              }`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">
                  {check.passed ? "Pass" : "Required"}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration Summary</p>
                <p className="text-muted-foreground">
                  {`Type: ${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} • `}
                  {`${data.length} records • `}
                  {`${opportunitiesPerUnit} opportunities/unit`}
                </p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Config</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  // ============ STEP 4: SUMMARY ============
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    
    const finding = `First Time Yield: ${r.overall.fty.toFixed(2)}%. DPMO: ${r.overall.dpmo.toFixed(0)} (${summary.sigma_level.toFixed(2)}σ). Top defect: ${summary.top_defect} accounts for ${r.pareto.vital_few_percent.toFixed(1)}% of issues.`;

    const maxDefectCount = Math.max(...r.defect_categories.map(c => c.count));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Yield & Defect Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Main Yield Gauges */}
          <div className="grid md:grid-cols-2 gap-4">
            <YieldGauge value={r.overall.fty} label="First Time Yield (FTY)" />
            <YieldGauge value={r.overall.rty} label="Rolled Throughput Yield (RTY)" />
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={`${summary.sigma_level.toFixed(2)}σ`} 
              label="Sigma Level" 
              icon={Zap}
              highlight={summary.sigma_level >= 3}
            />
            <MetricCard 
              value={r.overall.dpmo.toLocaleString()} 
              label="DPMO" 
              icon={Target}
              negative={r.overall.dpmo > 66807}
            />
            <MetricCard 
              value={r.overall.dpu.toFixed(3)} 
              label="DPU" 
              icon={Bug}
            />
            <MetricCard 
              value={`${r.overall.defect_rate.toFixed(2)}%`} 
              label="Defect Rate" 
              icon={Percent}
              negative={r.overall.defect_rate > 5}
            />
          </div>
          
          {/* Overall Stats */}
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Overall Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{r.overall.total_units.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Units</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{r.overall.total_defects.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Defects</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-500">{r.overall.total_defective_units.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Defective Units</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-500">{r.overall.yield_percent.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">Yield</p>
              </div>
            </div>
          </div>
          
          {/* Pareto Analysis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Defect Pareto Analysis
              </h4>
              <div className="text-xs text-muted-foreground">
                <span className="text-red-500 font-medium">Vital Few:</span> {r.pareto.vital_few.join(', ')} ({r.pareto.vital_few_percent.toFixed(1)}%)
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
                <span>Category</span>
                <div className="flex items-center gap-3">
                  <span>Count</span>
                  <span className="w-16 text-right">%</span>
                  <span className="w-16 text-right">Cumul%</span>
                </div>
              </div>
              {r.defect_categories.map((cat, idx) => (
                <ParetoBar 
                  key={cat.category} 
                  category={cat} 
                  maxCount={maxDefectCount}
                  isVitalFew={r.pareto.vital_few.includes(cat.category)}
                />
              ))}
            </div>
          </div>
          
          {/* Process Steps */}
          {r.process_steps && r.process_steps.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Process Step Yield
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Defects</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead className="text-right">DPU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.process_steps.map((step) => (
                    <TableRow key={step.step}>
                      <TableCell className="font-medium">{step.step}</TableCell>
                      <TableCell className="text-right">{step.input}</TableCell>
                      <TableCell className="text-right">{step.output}</TableCell>
                      <TableCell className="text-right text-red-500">{step.defects}</TableCell>
                      <TableCell className={`text-right ${step.yield_percent >= 95 ? 'text-green-500' : 'text-amber-500'}`}>
                        {step.yield_percent.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">{step.dpu.toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Key Insights */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                insight.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                "border-border bg-muted/10"
              }`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> :
                 insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> :
                 <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div>
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <DetailParagraph
            title="Summary Interpretation"
            detail={`Yield and defect analysis for ${r.overall.total_units.toLocaleString()} units.

■ Yield Metrics

• First Time Yield (FTY): ${r.overall.fty.toFixed(2)}%
• Rolled Throughput Yield (RTY): ${r.overall.rty.toFixed(2)}%
• Overall Yield: ${r.overall.yield_percent.toFixed(2)}%

■ Defect Metrics

• Total Defects: ${r.overall.total_defects.toLocaleString()}
• Defective Units: ${r.overall.total_defective_units.toLocaleString()}
• DPU (Defects Per Unit): ${r.overall.dpu.toFixed(4)}
• DPMO: ${r.overall.dpmo.toLocaleString()}
• Sigma Level: ${summary.sigma_level.toFixed(2)}σ

■ Pareto Analysis

• Vital Few (80% of defects): ${r.pareto.vital_few.join(', ')}
• These ${r.pareto.vital_few.length} categories account for ${r.pareto.vital_few_percent.toFixed(1)}% of all defects
• Focus improvement efforts on these categories first

■ Recommendation

${summary.sigma_level >= 4 
  ? '✓ Process is performing at 4σ or better. Maintain current controls.'
  : summary.sigma_level >= 3
  ? '⚠️ Process at 3σ level. Target vital few defects to improve.'
  : '✗ Process below 3σ. Immediate improvement action required.'}`}
          />
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Understand Results
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: WHY ============
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r, summary } = results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding Yield & Defect Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Yield analysis measures process quality. Pareto principle (80/20 rule) helps prioritize improvement efforts on the vital few issues causing most defects." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Concepts</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "FTY (First Time Yield)", content: "Percentage of units that pass without rework. FTY = Good Units / Total Units. Simple but doesn't capture hidden factory." },
                { num: 2, title: "RTY (Rolled Throughput Yield)", content: "Probability of passing all process steps. RTY = FTY₁ × FTY₂ × ... × FTYₙ. Reveals true process capability." },
                { num: 3, title: "DPMO", content: "Defects Per Million Opportunities. DPMO = (Defects / Opportunities) × 1,000,000. Standard Six Sigma metric." },
                { num: 4, title: "Pareto Principle", content: "80% of defects come from 20% of causes (Vital Few). Focus on these for maximum improvement impact." },
              ].map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{exp.num}</div>
                    <div>
                      <p className="font-medium text-sm">{exp.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Sigma Level Reference */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Sigma Level Reference</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sigma</TableHead>
                  <TableHead className="text-right">DPMO</TableHead>
                  <TableHead className="text-right">Yield %</TableHead>
                  <TableHead>Assessment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { sigma: 2, dpmo: 308537, yield: 69.15, assessment: 'Very Poor' },
                  { sigma: 3, dpmo: 66807, yield: 93.32, assessment: 'Average' },
                  { sigma: 4, dpmo: 6210, yield: 99.38, assessment: 'Good' },
                  { sigma: 5, dpmo: 233, yield: 99.977, assessment: 'Excellent' },
                  { sigma: 6, dpmo: 3.4, yield: 99.99966, assessment: 'World Class' },
                ].map((row) => (
                  <TableRow key={row.sigma} className={summary.sigma_level >= row.sigma - 0.5 && summary.sigma_level < row.sigma + 0.5 ? 'bg-primary/10' : ''}>
                    <TableCell className="font-medium">{row.sigma}σ</TableCell>
                    <TableCell className="text-right">{row.dpmo.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.yield}%</TableCell>
                    <TableCell>{row.assessment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DetailParagraph
            title="Improvement Recommendations"
            detail={`Based on the yield and defect analysis:

■ Current Performance

• Sigma Level: ${summary.sigma_level.toFixed(2)}σ
• DPMO: ${r.overall.dpmo.toLocaleString()}
• FTY: ${r.overall.fty.toFixed(2)}%

■ Priority Actions (Vital Few)

${r.pareto.vital_few.map((vf, i) => {
  const cat = r.defect_categories.find(c => c.category === vf);
  return `${i + 1}. ${vf}: ${cat?.count || 0} defects (${cat?.percent.toFixed(1) || 0}%)`;
}).join('\n')}

■ Improvement Strategy

${summary.sigma_level < 3 
  ? `✗ CRITICAL: Below 3σ performance

1. Form cross-functional problem-solving team
2. Conduct root cause analysis on top defects
3. Implement immediate containment actions
4. Establish defect tracking system
5. Consider process redesign`
  : summary.sigma_level < 4
  ? `⚠️ IMPROVEMENT NEEDED: 3-4σ range

1. Apply DMAIC to vital few defects
2. Implement statistical process control
3. Enhance operator training
4. Review inspection procedures
5. Target 50% reduction in top defect`
  : `✓ GOOD PERFORMANCE: Above 4σ

1. Maintain current controls
2. Focus on continuous improvement
3. Share best practices
4. Monitor for regression
5. Target next sigma level`}

■ Expected Impact

Eliminating the vital few defects (${r.pareto.vital_few.join(', ')}) could:
• Reduce total defects by ~${r.pareto.vital_few_percent.toFixed(0)}%
• Improve yield to ~${Math.min(99.9, r.overall.fty * (1 + r.pareto.vital_few_percent / 200)).toFixed(1)}%
• Increase sigma level by ~0.5-1.0`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 6: REPORT ============
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Yield & Defect Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`${summary.fty.toFixed(1)}%`} label="FTY" highlight={summary.fty >= 95} />
              <MetricCard value={`${summary.rty.toFixed(1)}%`} label="RTY" />
              <MetricCard value={`${summary.sigma_level.toFixed(2)}σ`} label="Sigma" highlight={summary.sigma_level >= 4} />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Calc Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Analysis of {r.overall.total_units.toLocaleString()} units shows {summary.sigma_level.toFixed(2)}σ performance 
              with {r.overall.dpmo.toLocaleString()} DPMO. Top defect category "{summary.top_defect}" is a priority for improvement.
            </p>
          </CardContent>
        </Card>
        
        {/* Key Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                ins.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                "border-border bg-muted/10"
              }`}>
                {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> :
                 ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> :
                 <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}
                <div>
                  <p className="font-medium text-sm">{ins.title}</p>
                  <p className="text-sm text-muted-foreground">{ins.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Visualizations */}
        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visualizations</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.pareto_chart && <TabsTrigger value="pareto_chart" className="text-xs">Pareto</TabsTrigger>}
                  {visualizations.defect_distribution && <TabsTrigger value="defect_distribution" className="text-xs">Distribution</TabsTrigger>}
                  {visualizations.process_yield && <TabsTrigger value="process_yield" className="text-xs">Process Yield</TabsTrigger>}
                  {visualizations.dpmo_chart && <TabsTrigger value="dpmo_chart" className="text-xs">DPMO</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        {/* Defect Categories Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Defect Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Cumulative %</TableHead>
                  <TableHead className="text-right">DPMO</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.defect_categories.map((cat) => (
                  <TableRow key={cat.category}>
                    <TableCell className="font-medium">{cat.category}</TableCell>
                    <TableCell className="text-right">{cat.count}</TableCell>
                    <TableCell className="text-right">{cat.percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{cat.cumulative_percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{cat.dpmo.toLocaleString()}</TableCell>
                    <TableCell>
                      {r.pareto.vital_few.includes(cat.category) ? (
                        <Badge variant="destructive" className="text-xs">Vital Few</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Trivial Many</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This analysis is a decision-making support tool based on statistical models and historical data. 
              Results are probabilistic estimates and actual outcomes may vary due to data quality, market conditions, 
              and other external factors. This information does not guarantee specific results, and all decisions 
              based on this analysis remain the sole responsibility of the user.
            </p>
          </div>
        </CardContent>
      </Card>


        {/* Export */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                CSV (Defects)
              </Button>
              {Object.entries(visualizations || {}).map(([key, value]) => value && (
                <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                  <Download className="w-4 h-4" />
                  {key.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  };

  // ============ RENDER ============
 return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowGuide(true)}  // 👈 이 줄 수정
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />  {/* 👈 아이콘 변경 */}
            Guide  {/* 👈 텍스트 변경 */}
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} /> 
      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep > 1 && data.length > 0 && (
        <DataPreview data={data} columns={columns} />
      )}
      
      {currentStep === 1 && (
        <IntroPage 
          analysisType={analysisType}
          setAnalysisType={setAnalysisType}
          onLoadSample={handleLoadSample} 
          onFileUpload={handleFileUpload} 
        />
      )}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
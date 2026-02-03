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
  DollarSign, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  BarChart3, Users, Layers, Target, Play, Scale,
  Building, Briefcase, Award, TrendingDown, Equal, BookOpen, BookMarked
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface SalaryStats {
  count: number; mean: number; median: number; std: number;
  min: number; max: number; q25: number; q75: number; iqr: number; range: number; cv: number;
}

interface PayGap {
  group_1: string; group_2: string; mean_1: number; mean_2: number;
  gap_absolute: number; gap_percentage: number; t_statistic: number;
  p_value: number; cohens_d: number; significant: boolean;
}

interface LevelEquity {
  level: string; count: number; mean: number; median: number; std: number;
  cv: number; spread: number; outliers: number; equity_score: number; is_equitable: boolean;
}

interface GroupData {
  group: string; count: number; mean: number; median: number; std: number;
  min: number; max: number; q25: number; q75: number;
}

interface CompensationResult {
  success: boolean;
  results: {
    overall_statistics: SalaryStats;
    analysis: any;
    group_data: { by_department?: GroupData[]; by_level?: GroupData[]; };
    employee_count: number;
  };
  visualizations: { salary_distribution?: string; by_department?: string; by_level?: string; pay_gap?: string; equity?: string; compa_ratio?: string; };
  key_insights: KeyInsight[];
  summary: { analysis_type: string; employee_count: number; avg_salary: number; median_salary: number; salary_range: string; market_benchmark: number | null; analyze_time_ms: number; };
}

const ANALYSIS_TYPES = [
  { value: "equity", label: "Pay Equity", desc: "Internal pay fairness", icon: Scale },
  { value: "benchmark", label: "Market Benchmark", desc: "External competitiveness", icon: Target },
  { value: "pay_gap", label: "Pay Gap Analysis", desc: "Group comparisons", icon: Equal },
];

const generateSampleData = (): DataRow[] => {
  const departments = ["Engineering", "Sales", "Marketing", "Operations", "HR", "Finance"];
  const levels = ["Junior", "Mid", "Senior", "Lead", "Manager", "Director"];
  const genders = ["Male", "Female"];
  const data: DataRow[] = [];
  
  const baseSalaries: { [key: string]: number } = {
    "Junior": 55000, "Mid": 75000, "Senior": 95000, "Lead": 115000, "Manager": 130000, "Director": 160000
  };
  const deptMultipliers: { [key: string]: number } = {
    "Engineering": 1.15, "Sales": 1.05, "Marketing": 0.95, "Operations": 0.90, "HR": 0.85, "Finance": 1.00
  };
  
  for (let i = 0; i < 500; i++) {
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const tenure = Math.floor(Math.random() * 15) + 1;
    const performance = Math.floor(Math.random() * 5) + 1;
    
    let baseSalary = baseSalaries[level] * deptMultipliers[dept];
    baseSalary *= (1 + tenure * 0.015);
    baseSalary *= (1 + (performance - 3) * 0.05);
    baseSalary *= (0.9 + Math.random() * 0.2);
    
    // Small gender gap for demo
    if (gender === "Female") baseSalary *= 0.97;
    
    data.push({
      employee_id: `EMP${String(i + 1).padStart(4, '0')}`,
      department: dept,
      job_level: level,
      gender: gender,
      tenure_years: tenure,
      performance_rating: performance,
      annual_salary: Math.round(baseSalary / 100) * 100,
    });
  }
  return data;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const MetricCard: React.FC<{ value: string | number | React.ReactNode; label: string; negative?: boolean; highlight?: boolean; icon?: React.FC<{ className?: string }> }> = ({ value, label, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
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
    const rows = data.map(row => columns.map(col => { const val = row[col]; if (val === null || val === undefined) return ''; if (typeof val === 'string' && val.includes(',')) return `"${val}"`; return val; }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'compensation_data.csv'; a.click();
  };
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} employees</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}><Download className="w-3 h-3" />Download</Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table><TableHeader><TableRow>{columns.slice(0, 7).map(col => (<TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>))}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 10).map((row, i) => (<TableRow key={i}>{columns.slice(0, 7).map(col => (<TableCell key={col} className="text-xs py-1.5">{row[col] !== null && row[col] !== undefined ? (col.includes('salary') ? formatCurrency(Number(row[col])) : String(row[col])) : '-'}</TableCell>))}</TableRow>))}</TableBody>
          </Table>
          {data.length > 10 && <p className="text-xs text-muted-foreground p-2 text-center">Showing first 10 of {data.length} employees</p>}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [{ num: 1, label: "Intro" }, { num: 2, label: "Config" }, { num: 3, label: "Validation" }, { num: 4, label: "Summary" }, { num: 5, label: "Why" }, { num: 6, label: "Report" }];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep; const isCurrent = step.num === currentStep; const isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/10 text-primary" : isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"}`}>
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const GapIndicator: React.FC<{ gap: number; significant: boolean }> = ({ gap, significant }) => (
  <span className={`inline-flex items-center gap-1 ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-green-600' : 'text-gray-500'}`}>
    {gap > 0 ? <TrendingUp className="w-4 h-4" /> : gap < 0 ? <TrendingDown className="w-4 h-4" /> : null}
    {Math.abs(gap).toFixed(1)}%
    {significant && <span className="text-xs">*</span>}
  </span>
);

const GroupCard: React.FC<{ group: GroupData; rank: number }> = ({ group, rank }) => (
  <div className="p-4 rounded-lg border border-border bg-muted/10">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">{rank}</div>
        <div><p className="font-medium">{group.group}</p><p className="text-xs text-muted-foreground">{group.count} employees</p></div>
      </div>
      <div className="text-right"><p className="font-semibold text-primary">{formatCurrency(group.mean)}</p><p className="text-xs text-muted-foreground">avg salary</p></div>
    </div>
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div><p className="text-muted-foreground text-xs">Median</p><p className="font-medium">{formatCurrency(group.median)}</p></div>
      <div><p className="text-muted-foreground text-xs">Min</p><p className="font-medium">{formatCurrency(group.min)}</p></div>
      <div><p className="text-muted-foreground text-xs">Max</p><p className="font-medium">{formatCurrency(group.max)}</p></div>
    </div>
  </div>
);

const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Compensation Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              What is Compensation Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Compensation analysis is the systematic examination of employee pay to ensure fairness, competitiveness, 
              and compliance with regulations. It helps organizations make data-driven decisions about salary structures, 
              identify pay equity issues, benchmark against market standards, and maintain transparency in compensation 
              practices. This is critical for talent retention, legal compliance, and organizational reputation.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Types of Compensation Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">1. Pay Equity Analysis (Internal Fairness)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Purpose:</strong> Ensure employees in similar roles receive similar pay<br/>
                  <strong>Method:</strong> Compare pay within job levels using Coefficient of Variation (CV)<br/>
                  <strong>Key Metric:</strong> CV = (Standard Deviation / Mean) × 100%<br/>
                  <strong>Benchmark:</strong> CV below 15-20% indicates good equity<br/>
                  <strong>Use Case:</strong> Identifying unexplained pay differences for same job<br/>
                  <strong>Legal Context:</strong> Supports equal pay compliance (EPA, Title VII)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm mb-2">2. Market Benchmarking (External Competitiveness)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Purpose:</strong> Compare salaries against industry/market rates<br/>
                  <strong>Method:</strong> Calculate compa-ratios against market benchmark<br/>
                  <strong>Key Metric:</strong> Compa-Ratio = (Actual Salary / Market Rate) × 100%<br/>
                  <strong>Interpretation:</strong> 100% = at market, below 100% = below market, above 100% = above market<br/>
                  <strong>Target Range:</strong> 90-110% is typical competitive range<br/>
                  <strong>Use Case:</strong> Setting competitive salary ranges, retention strategy
                </p>
              </div>

              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <p className="font-medium text-sm mb-2">3. Pay Gap Analysis (Group Comparisons)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Purpose:</strong> Identify pay differences between demographic groups<br/>
                  <strong>Method:</strong> Statistical t-tests comparing group means<br/>
                  <strong>Key Metrics:</strong> Gap percentage, p-value (significance), Cohen's d (effect size)<br/>
                  <strong>Statistical Significance:</strong> p below 0.05 suggests real gap, not random chance<br/>
                  <strong>Common Comparisons:</strong> Gender, race/ethnicity, age groups<br/>
                  <strong>Legal Importance:</strong> Critical for equal pay and anti-discrimination compliance
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Key Statistical Measures
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Central Tendency Measures</p>
                <div className="space-y-2 mt-2 text-xs text-muted-foreground">
                  <p><strong>Mean (Average):</strong> Sum of all salaries divided by count. Sensitive to outliers 
                  (high earners pull mean up). Use for overall budget calculations.</p>
                  <p><strong>Median (50th Percentile):</strong> Middle value when salaries sorted. Not affected by 
                  outliers. Better representation of "typical" employee salary.</p>
                  <p><strong>When Mean {">"} Median:</strong> Right-skewed distribution, some high earners</p>
                  <p><strong>When Mean {"<"} Median:</strong> Left-skewed distribution, some low earners</p>
                  <p><strong>When Mean ≈ Median:</strong> Symmetric distribution, normal spread</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Dispersion Measures</p>
                <div className="space-y-2 mt-2 text-xs text-muted-foreground">
                  <p><strong>Standard Deviation (SD):</strong> Average distance from mean. Higher SD = more salary 
                  variation. In dollars (same units as salary).</p>
                  <p><strong>Coefficient of Variation (CV):</strong> SD as percentage of mean. CV = (SD/Mean) × 100%. 
                  Allows comparison across different salary levels.</p>
                  <p><strong>CV Interpretation:</strong><br/>
                  • CV below 15%: Low variation, high pay equity<br/>
                  • CV 15-25%: Moderate variation, typical for single job level<br/>
                  • CV above 25%: High variation, may indicate equity issues</p>
                  <p><strong>Range:</strong> Max - Min. Shows salary spread but sensitive to extreme outliers.</p>
                  <p><strong>Interquartile Range (IQR):</strong> 75th percentile - 25th percentile. Middle 50% of 
                  salaries. Robust to outliers.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Percentiles (Quartiles)</p>
                <div className="space-y-2 mt-2 text-xs text-muted-foreground">
                  <p><strong>25th Percentile (Q1):</strong> 25% of employees earn below this, 75% earn above. 
                  Entry-level benchmark.</p>
                  <p><strong>50th Percentile (Median/Q2):</strong> Middle value. Market midpoint.</p>
                  <p><strong>75th Percentile (Q3):</strong> 75% earn below, 25% earn above. High-performer benchmark.</p>
                  <p><strong>Use in Salary Structures:</strong><br/>
                  • Min of range: 80-90% of 25th percentile<br/>
                  • Midpoint: At 50th percentile (median)<br/>
                  • Max of range: 110-120% of 75th percentile</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Pay Equity Analysis: Step by Step
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Step 1: Define Job Levels/Grades</p>
                <p className="text-xs text-muted-foreground">
                  Group employees by job level (Junior, Mid, Senior, etc.) or pay grade. Comparison only makes sense 
                  within same level. Different levels should have different pay ranges.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Step 2: Calculate Statistics by Level</p>
                <p className="text-xs text-muted-foreground">
                  For each level, calculate: Mean, Median, Standard Deviation, CV, Min, Max, IQR.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Step 3: Assess Equity Using CV</p>
                <p className="text-xs text-muted-foreground">
                  CV = (Standard Deviation / Mean) × 100%<br/>
                  <strong>Example:</strong> Mean salary $80,000, SD $12,000 → CV = (12,000/80,000) × 100% = 15%<br/>
                  <strong>Assessment:</strong> 15% CV is borderline - acceptable if justified by performance/tenure<br/>
                  <strong>Red Flag:</strong> CV above 20% within same job level requires investigation
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Step 4: Identify Outliers</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Method:</strong> Values beyond 1.5 × IQR from Q1 or Q3<br/>
                  <strong>Action:</strong> Investigate outliers - are they justified by performance, tenure, or other 
                  legitimate factors?<br/>
                  <strong>Common Causes:</strong> Long tenure, exceptional performance, specialized skills, market adjustment lags
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Step 5: Control for Legitimate Factors</p>
                <p className="text-xs text-muted-foreground">
                  Adjust comparison for factors that legitimately affect pay:<br/>
                  • <strong>Tenure:</strong> Years of service (typical: 2-3% annual increase)<br/>
                  • <strong>Performance:</strong> Ratings should correlate with pay (high performers paid more)<br/>
                  • <strong>Education:</strong> Advanced degrees may warrant higher pay<br/>
                  • <strong>Location:</strong> Cost of living adjustments<br/>
                  After controlling these, remaining differences may indicate inequity
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Equal className="w-4 h-4" />
              Pay Gap Analysis: Statistical Testing
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Independent Samples t-Test</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Purpose:</strong> Test if mean salaries of two groups are significantly different<br/>
                  <strong>Null Hypothesis (H0):</strong> No difference in mean salaries between groups<br/>
                  <strong>Alternative Hypothesis (H1):</strong> Mean salaries are different<br/>
                  <strong>Formula:</strong> t = (Mean1 - Mean2) / √[(s1²/n1) + (s2²/n2)]<br/>
                  <strong>Assumptions:</strong> Independent samples, approximately normal distributions, similar variances
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Interpreting Results</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>p-value:</strong> Probability that observed difference is due to chance<br/>
                  • p below 0.05: Statistically significant (reject H0) - real gap exists<br/>
                  • p above 0.05: Not significant (fail to reject H0) - difference could be random<br/>
                  • p below 0.01: Highly significant<br/>
                  • p below 0.001: Very highly significant</p>
                  
                  <p><strong>Gap Percentage:</strong> (Mean1 - Mean2) / Mean2 × 100%<br/>
                  <strong>Example:</strong> Men: $85,000, Women: $78,000 → Gap = 8.97%<br/>
                  <strong>Interpretation:</strong> Men earn 8.97% more on average</p>
                  
                  <p><strong>Cohen's d (Effect Size):</strong> Measures practical significance<br/>
                  • d below 0.2: Small effect (trivial)<br/>
                  • d 0.2-0.5: Small to medium effect<br/>
                  • d 0.5-0.8: Medium effect (noticeable)<br/>
                  • d above 0.8: Large effect (substantial)<br/>
                  A significant p-value with small d means: real but small difference</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">⚠️ Statistical vs Practical Significance</p>
                <p className="text-xs text-muted-foreground">
                  With large samples, even tiny differences become statistically significant (p below 0.05) but may not be 
                  practically meaningful. Always consider both p-value AND effect size (gap %, Cohen's d).<br/>
                  <strong>Example:</strong> $85,000 vs $84,500 (0.6% gap) might be significant (p=0.03) with 1000 employees 
                  but is trivially small in practice.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Market Benchmarking & Compa-Ratios
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Compa-Ratio Calculation</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> Compa-Ratio = (Actual Salary / Market Rate) × 100%<br/>
                  <strong>Example:</strong> Employee earns $90,000, market rate is $85,000<br/>
                  Compa-Ratio = (90,000 / 85,000) × 100% = 105.9%<br/>
                  <strong>Interpretation:</strong> Employee paid 5.9% above market
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Compa-Ratio Ranges</p>
                <Table className="text-xs mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compa-Ratio</TableHead>
                      <TableHead>Meaning</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Below 80%</TableCell>
                      <TableCell>Significantly below market</TableCell>
                      <TableCell className="text-red-600">Urgent: High flight risk</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">80-90%</TableCell>
                      <TableCell>Below market, entry level</TableCell>
                      <TableCell className="text-amber-600">Review for adjustment</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">90-110%</TableCell>
                      <TableCell>Competitive range</TableCell>
                      <TableCell className="text-green-600">Good positioning</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">110-120%</TableCell>
                      <TableCell>Above market, experienced</TableCell>
                      <TableCell className="text-blue-600">OK if justified</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Above 120%</TableCell>
                      <TableCell>Premium pay</TableCell>
                      <TableCell className="text-purple-600">Verify justification</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Salary Range Positioning</p>
                <p className="text-xs text-muted-foreground">
                  Organizations typically structure salary ranges:<br/>
                  • <strong>Range Minimum:</strong> 80% of market (entry level, development needed)<br/>
                  • <strong>Range Midpoint:</strong> 100% of market (fully competent, meeting expectations)<br/>
                  • <strong>Range Maximum:</strong> 120% of market (expert, exceptional performance)<br/>
                  • <strong>Range Spread:</strong> 50% (Max/Min - 1), e.g., $80K-$120K is 50% spread<br/>
                  <strong>Penetration:</strong> (Actual - Min) / (Max - Min) shows position in range
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">Data Sources for Benchmarking</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Salary Surveys:</strong> Mercer, Willis Towers Watson, Radford (tech), Culpepper</li>
                  <li>• <strong>Government Data:</strong> Bureau of Labor Statistics (BLS) OES data</li>
                  <li>• <strong>Job Boards:</strong> Glassdoor, Payscale, Salary.com (use cautiously)</li>
                  <li>• <strong>Industry Groups:</strong> Trade associations, HR networks</li>
                  <li>• <strong>Best Practice:</strong> Use 2-3 sources, weight by reliability and recency</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Legal Compliance & Risk Management
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-2">Key U.S. Laws & Regulations</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Equal Pay Act (EPA, 1963):</strong> Requires equal pay for equal work regardless of sex. 
                  Violations: intentional pay gaps between men and women for substantially equal work.</p>
                  
                  <p><strong>Title VII (Civil Rights Act, 1964):</strong> Prohibits discrimination based on race, color, 
                  religion, sex, national origin. Covers compensation decisions.</p>
                  
                  <p><strong>Age Discrimination in Employment Act (ADEA):</strong> Protects workers 40+. Pay decisions 
                  cannot be based on age.</p>
                  
                  <p><strong>Americans with Disabilities Act (ADA):</strong> Prohibits pay discrimination based on disability.</p>
                  
                  <p><strong>State Pay Transparency Laws:</strong> CA, CO, NY, WA and others require salary range disclosure 
                  in job postings. Many states prohibit salary history questions.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Burden of Proof</p>
                <p className="text-xs text-muted-foreground">
                  If pay gap exists, employer must prove it's due to:<br/>
                  1. <strong>Seniority system</strong> (legitimate, consistently applied)<br/>
                  2. <strong>Merit system</strong> (objective performance-based)<br/>
                  3. <strong>Quantity/quality of production</strong> (measurable output)<br/>
                  4. <strong>Factor other than protected class</strong> (e.g., education, experience, market rates)<br/>
                  <strong>Key:</strong> Document the business justification for pay differences
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Documentation Best Practices</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Maintain written compensation philosophy and policies</li>
                  <li>• Document all pay decisions (rationale, approval chain)</li>
                  <li>• Keep performance reviews linked to pay increases</li>
                  <li>• Conduct annual pay equity audits</li>
                  <li>• Address identified gaps promptly with documented remediation plans</li>
                  <li>• Train managers on non-discriminatory pay practices</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Taking Action on Analysis Results
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-1">Red Flags Requiring Immediate Action</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Statistically significant pay gap (p below 0.05) between protected groups with no business justification</li>
                  <li>• CV above 25% within same job level with similar tenure/performance</li>
                  <li>• Compa-ratio below 80% for critical roles (flight risk)</li>
                  <li>• Compa-ratio above 120% without documented exceptional value</li>
                  <li>• Systematic pattern where one group consistently paid less</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">Yellow Flags for Investigation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Pay gap between 3-7% (not significant yet, but monitor)</li>
                  <li>• CV between 20-25% within job level</li>
                  <li>• Compa-ratio 80-85% or 115-120% (borderline competitive)</li>
                  <li>• Outliers (investigate case-by-case)</li>
                  <li>• Mean substantially different from median (skewed distribution)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600 mb-1">Remediation Strategies</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>1. Salary Adjustments:</strong><br/>
                  • Target: Bring underpaid employees to market or internal equity<br/>
                  • Phase: Large gaps may need multi-year correction (budget constraints)<br/>
                  • Document: Business justification for each adjustment</p>
                  
                  <p><strong>2. Policy Changes:</strong><br/>
                  • Implement structured salary ranges<br/>
                  • Standardize starting salary offers<br/>
                  • Create transparent promotion/raise criteria</p>
                  
                  <p><strong>3. Process Improvements:</strong><br/>
                  • Require pay equity review before all salary decisions<br/>
                  • Conduct annual pay audits<br/>
                  • Manager training on bias and equity</p>
                </div>
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
                <p className="font-medium text-sm text-primary mb-1">Analysis Frequency</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Annual:</strong> Comprehensive pay equity audit (required)</li>
                  <li>• <strong>Semi-annual:</strong> Market benchmarking update</li>
                  <li>• <strong>Quarterly:</strong> CV monitoring by job level</li>
                  <li>• <strong>Ongoing:</strong> Real-time check before any pay decision</li>
                  <li>• <strong>Trigger:</strong> After acquisitions, reorganizations, market shifts</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Quality</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Validate job level assignments (proper leveling)</li>
                  <li>• Clean data: remove interns, contractors, part-time (or analyze separately)</li>
                  <li>• Standardize pay to annual equivalent (FTE)</li>
                  <li>• Include all compensation components (base + bonus + equity)</li>
                  <li>• Segment by geography if multi-location</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Communication</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Transparency: Publish salary ranges (increasingly required by law)</li>
                  <li>• Explain: How pay decisions are made (criteria, process)</li>
                  <li>• Train: Managers on delivering pay conversations</li>
                  <li>• Listen: Employee surveys on pay satisfaction</li>
                  <li>• Report: Regular updates to leadership on pay equity metrics</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Stakeholder Involvement</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• HR: Lead the analysis, interpret results</li>
                  <li>• Legal: Review for compliance risk</li>
                  <li>• Finance: Budget for remediation</li>
                  <li>• Leadership: Approve strategy and adjustments</li>
                  <li>• Managers: Implement decisions, communicate to teams</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Compensation analysis is not just a compliance exercise 
              - it's a strategic tool for attracting and retaining talent. Regular analysis helps you stay competitive, 
              maintain fairness, and avoid costly legal issues. The goal is not perfect equality (legitimate factors like 
              performance and tenure should differentiate pay), but rather ensuring no unexplained gaps based on protected 
              characteristics. Document your process, be transparent with employees, and take prompt action on identified 
              issues. Pay equity is an ongoing commitment, not a one-time project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
// 👆 여기까지 추가

  

const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><DollarSign className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Compensation Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze salary data for pay equity, market competitiveness, and group comparisons. Identify pay gaps and ensure fair compensation practices.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {ANALYSIS_TYPES.map((type) => (
          <div key={type.value} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><type.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="font-medium">{type.label}</p><p className="text-xs text-muted-foreground">{type.desc}</p></div>
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use Compensation Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div><h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Salary data (numeric)", "Department/Team (optional)", "Job level/Grade (optional)", "Gender/Demographics (optional)", "At least 10 employee records"].map((req) => (<li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>))}
              </ul>
            </div>
            <div><h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Salary distribution statistics", "Pay equity analysis by level", "Gender/group pay gap analysis", "Market benchmark comparison"].map((res) => (<li key={res} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}</li>))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2"><Activity className="w-4 h-4" />Load Sample Data</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Upload Your Data</Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function CompensationAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CompensationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  // 👈 이 줄 추가

  const [employeeCol, setEmployeeCol] = useState<string>("");
  const [salaryCol, setSalaryCol] = useState<string>("");
  const [departmentCol, setDepartmentCol] = useState<string>("");
  const [levelCol, setLevelCol] = useState<string>("");
  const [tenureCol, setTenureCol] = useState<string>("");
  const [genderCol, setGenderCol] = useState<string>("");
  const [performanceCol, setPerformanceCol] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("equity");
  const [marketBenchmark, setMarketBenchmark] = useState<string>("");
  const [equityThreshold, setEquityThreshold] = useState<string>("5");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData); setColumns(Object.keys(sampleData[0]));
    setEmployeeCol("employee_id"); setSalaryCol("annual_salary"); setDepartmentCol("department");
    setLevelCol("job_level"); setTenureCol("tenure_years"); setGenderCol("gender"); setPerformanceCol("performance_rating");
    setMarketBenchmark("95000");
    setCurrentStep(2); setResults(null); setError(null);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append("file", file);
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setData(result.data); setColumns(result.columns); setCurrentStep(2); setResults(null); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setLoading(false); }
  }, []);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const numRecords = data.length;
    const hasSalary = !!salaryCol;
    const benchmark = parseFloat(marketBenchmark) || 0;
    const threshold = parseFloat(equityThreshold) || 5;
    
    const checks: ValidationCheck[] = [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${numRecords} employees loaded` : "No data loaded" },
      { name: "Salary Column", passed: hasSalary, message: hasSalary ? `Using: ${salaryCol}` : "Select salary column" },
      { name: "Sufficient Data", passed: numRecords >= 10, message: numRecords >= 10 ? `${numRecords} records (sufficient)` : `${numRecords} records (need 10+)` },
    ];
    
    if (analysisType === "pay_gap") {
      checks.push({ name: "Gender/Group Column", passed: !!genderCol, message: genderCol ? `Using: ${genderCol}` : "Select gender/group column for pay gap analysis" });
    }
    if (analysisType === "equity") {
      checks.push({ name: "Job Level Column", passed: !!levelCol, message: levelCol ? `Using: ${levelCol}` : "Select job level column for equity analysis" });
      checks.push({ name: "Equity Threshold", passed: threshold > 0 && threshold <= 50, message: `CV threshold: ${threshold}%` });
    }
    if (analysisType === "benchmark") {
      checks.push({ name: "Market Benchmark", passed: benchmark > 0, message: benchmark > 0 ? `Benchmark: ${formatCurrency(benchmark)}` : "Enter market benchmark salary" });
    }
    
    return checks;
  }, [data, salaryCol, genderCol, levelCol, analysisType, marketBenchmark, equityThreshold]);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload = { data, employee_col: employeeCol || null, salary_col: salaryCol, department_col: departmentCol || null, level_col: levelCol || null, tenure_col: tenureCol || null, gender_col: genderCol || null, performance_col: performanceCol || null, analysis_type: analysisType, market_benchmark: marketBenchmark ? parseFloat(marketBenchmark) : null, equity_threshold: parseFloat(equityThreshold) / 100 };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/compensation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.detail || "Analysis failed"); }
      const result: CompensationResult = await res.json();
      setResults(result); setCurrentStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const { overall_statistics, group_data } = results.results;
    const rows: string[] = ['Metric,Value'];
    rows.push(`Employee Count,${overall_statistics.count}`, `Mean Salary,${overall_statistics.mean.toFixed(2)}`, `Median Salary,${overall_statistics.median.toFixed(2)}`, `Std Dev,${overall_statistics.std.toFixed(2)}`, `Min,${overall_statistics.min}`, `Max,${overall_statistics.max}`);
    if (group_data.by_department) {
      rows.push('', 'Department,Count,Mean,Median');
      group_data.by_department.forEach(g => rows.push(`${g.group},${g.count},${g.mean.toFixed(2)},${g.median.toFixed(2)}`));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'compensation_analysis.csv'; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a'); a.href = `data:image/png;base64,${base64}`; a.download = `compensation_${chartKey}.png`; a.click();
  };

  const renderStep2Config = () => {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up compensation analysis parameters</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Analysis Type</h4>
            <div className="grid md:grid-cols-3 gap-3">
              {ANALYSIS_TYPES.map((type) => (
                <button key={type.value} onClick={() => setAnalysisType(type.value)} className={`p-4 rounded-lg border text-left transition-all ${analysisType === type.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <type.icon className="w-5 h-5 text-primary mb-2" /><p className="font-medium text-sm">{type.label}</p><p className="text-xs text-muted-foreground">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />Required Columns</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Salary Column *</Label>
                <Select value={salaryCol || "__none__"} onValueChange={v => setSalaryCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Select --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Employee ID Column</Label>
                <Select value={employeeCol || "__none__"} onValueChange={v => setEmployeeCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />Grouping Columns</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Department Column</Label>
                <Select value={departmentCol || "__none__"} onValueChange={v => setDepartmentCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Job Level Column {analysisType === "equity" && "*"}</Label>
                <Select value={levelCol || "__none__"} onValueChange={v => setLevelCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">{analysisType === "equity" ? "-- Select --" : "-- Optional --"}</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Gender/Group Column {analysisType === "pay_gap" && "*"}</Label>
                <Select value={genderCol || "__none__"} onValueChange={v => setGenderCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">{analysisType === "pay_gap" ? "-- Select --" : "-- Optional --"}</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Tenure Column</Label>
                <Select value={tenureCol || "__none__"} onValueChange={v => setTenureCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Analysis Parameters</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {analysisType === "benchmark" && (
                <div className="space-y-2"><Label>Market Benchmark Salary ($) *</Label><Input type="number" min="0" value={marketBenchmark} onChange={e => setMarketBenchmark(e.target.value)} placeholder="e.g., 95000" /></div>
              )}
              {analysisType === "equity" && (
                <div className="space-y-2"><Label>Equity Threshold (CV %)</Label><Input type="number" min="1" max="50" value={equityThreshold} onChange={e => setEquityThreshold(e.target.value)} /></div>
              )}
              <div className="space-y-2"><Label>Performance Column</Label>
                <Select value={performanceCol || "__none__"} onValueChange={v => setPerformanceCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(3)} className="gap-2">Continue to Validation<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep3Validation = () => {
    const checks = getValidationChecks(); const canRun = checks.every(c => c.passed);
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Data Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}<div><p className="font-medium text-sm">{check.name}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">{check.passed ? "Pass" : "Required"}</Badge>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2"><Info className="w-5 h-5 text-primary mt-0.5" /><div className="text-sm"><p className="font-medium">Configuration Summary</p><p className="text-muted-foreground">{`Analysis: ${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} • Salary: ${salaryCol} • Employees: ${data.length}`}</p></div></div>
          </div>
          {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><div className="flex items-start gap-2"><AlertCircle className="w-5 h-5 text-destructive mt-0.5" /><p className="text-sm text-destructive">{error}</p></div></div>}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Config</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">{loading ? (<><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</>) : (<><Play className="w-4 h-4" />Run Analysis</>)}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, results: r, key_insights } = results;
    const { overall_statistics, group_data, analysis } = r;
    
    const finding = `Analysis of ${summary.employee_count} employees shows an average salary of ${formatCurrency(summary.avg_salary)} (median: ${formatCurrency(summary.median_salary)}). Salary range: ${summary.salary_range}.`;
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Analysis Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={formatCurrency(summary.avg_salary)} label="Average Salary" icon={DollarSign} highlight />
            <MetricCard value={formatCurrency(summary.median_salary)} label="Median Salary" icon={BarChart3} />
            <MetricCard value={summary.employee_count} label="Employees" icon={Users} />
            <MetricCard value={`${(overall_statistics.cv * 100).toFixed(1)}%`} label="Coefficient of Variation" icon={Scale} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={formatCurrency(overall_statistics.min)} label="Minimum" />
            <MetricCard value={formatCurrency(overall_statistics.max)} label="Maximum" />
            <MetricCard value={formatCurrency(overall_statistics.q25)} label="25th Percentile" />
            <MetricCard value={formatCurrency(overall_statistics.q75)} label="75th Percentile" />
          </div>
          
          {group_data.by_department && group_data.by_department.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Building className="w-4 h-4 text-primary" />Salary by Department</h4>
              <div className="grid md:grid-cols-2 gap-3">{group_data.by_department.slice(0, 6).map((g, idx) => (<GroupCard key={g.group} group={g} rank={idx + 1} />))}</div>
            </div>
          )}
          
          {group_data.by_level && group_data.by_level.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />Salary by Level</h4>
              <div className="grid md:grid-cols-2 gap-3">{group_data.by_level.slice(0, 6).map((g, idx) => (<GroupCard key={g.group} group={g} rank={idx + 1} />))}</div>
            </div>
          )}
          
          {analysisType === "pay_gap" && analysis.pay_gaps && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Equal className="w-4 h-4 text-primary" />Pay Gap Analysis</h4>
              <div className="space-y-2">
                {analysis.pay_gaps.map((gap: PayGap, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border ${gap.significant ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{gap.group_1} vs {gap.group_2}</span>
                      <GapIndicator gap={gap.gap_percentage} significant={gap.significant} />
                    </div>
                    <p className="text-xs text-muted-foreground">{gap.group_1}: {formatCurrency(gap.mean_1)} | {gap.group_2}: {formatCurrency(gap.mean_2)} | Difference: {formatCurrency(Math.abs(gap.gap_absolute))} | p={gap.p_value.toFixed(4)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {analysisType === "benchmark" && analysis.compa_ratio && analysis.vs_benchmark && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Market Benchmark Comparison</h4>
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center"><p className="text-xs text-muted-foreground">Benchmark</p><p className="font-semibold text-lg">{formatCurrency(summary.market_benchmark || 0)}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Avg Compa-Ratio</p><p className="font-semibold text-lg text-primary">{(analysis.compa_ratio.mean * 100).toFixed(1)}%</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Below Market</p><p className="font-semibold text-lg text-red-600">{analysis.vs_benchmark.below}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Above Market</p><p className="font-semibold text-lg text-green-600">{analysis.vs_benchmark.above}</p></div>
                </div>
                <p className="text-xs text-muted-foreground text-center">{analysis.vs_benchmark.pct_above.toFixed(1)}% of employees are above market benchmark</p>
              </div>
            </div>
          )}
          
          {analysisType === "equity" && analysis.level_analysis && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Scale className="w-4 h-4 text-primary" />Pay Equity by Level</h4>
              <div className="space-y-2">
                {analysis.level_analysis.slice(0, 6).map((level: LevelEquity, idx: number) => (
                  <div key={idx} className={`p-3 rounded-lg border ${level.is_equitable ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{level.level}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{level.count} employees</span>
                        <Badge variant={level.is_equitable ? "default" : "secondary"}>{(level.equity_score * 100).toFixed(0)}%</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Mean: {formatCurrency(level.mean)} | CV: {(level.cv * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${insight.status === "positive" ? "border-primary/30 bg-primary/5" : insight.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div><p className="font-medium text-sm">{insight.title}</p><p className="text-sm text-muted-foreground">{insight.description}</p></div>
              </div>
            ))}
          </div>
          
          <DetailParagraph title="Summary Interpretation" detail={`This compensation analysis examined salary data for ${summary.employee_count} employees.

■ Compensation Analysis Overview

Compensation analysis evaluates pay practices to ensure fairness, competitiveness, and alignment with organizational goals.

• Key Metrics:
  - Mean vs Median: Large differences indicate skewed distribution
  - Coefficient of Variation (CV): Measures relative salary dispersion
  - Interquartile Range (IQR): Shows spread of middle 50%

■ Results Analysis

【Salary Distribution】
• Mean: ${formatCurrency(overall_statistics.mean)}
• Median: ${formatCurrency(overall_statistics.median)}
• Std Deviation: ${formatCurrency(overall_statistics.std)}
• Range: ${formatCurrency(overall_statistics.min)} - ${formatCurrency(overall_statistics.max)}
• IQR: ${formatCurrency(overall_statistics.iqr)}
• CV: ${(overall_statistics.cv * 100).toFixed(1)}%

【Distribution Shape】
${overall_statistics.mean > overall_statistics.median ? '• Right-skewed: Some high earners pull mean above median' : overall_statistics.mean < overall_statistics.median ? '• Left-skewed: Some low earners pull mean below median' : '• Symmetric: Mean and median are similar'}
${overall_statistics.cv > 0.3 ? '• High variation: Significant salary dispersion across employees' : overall_statistics.cv > 0.15 ? '• Moderate variation: Normal salary spread' : '• Low variation: Salaries are relatively consistent'}

■ Quality Assessment
${overall_statistics.cv < 0.25 ? '✓ Reasonable salary consistency' : '△ High salary variation may indicate equity issues'}
${overall_statistics.count >= 50 ? '✓ Adequate sample size for reliable analysis' : '△ Consider larger sample for robust conclusions'}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Results<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { results: r } = results;
    const { overall_statistics, group_data, analysis } = r;
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding the Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Compensation analysis helps organizations ensure fair pay practices, maintain market competitiveness, and identify potential pay equity issues. Understanding these metrics is crucial for HR strategy and compliance." />
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How Compensation Analysis Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Descriptive Statistics", content: "Calculate mean, median, percentiles, and spread measures. The relationship between mean and median reveals distribution shape." },
                { num: 2, title: "Equity Analysis", content: "Examine pay variation within job levels using CV (coefficient of variation). Lower CV indicates more equitable pay for similar roles." },
                { num: 3, title: "Gap Analysis", content: "Compare pay between demographic groups using t-tests. Significant differences may indicate potential discrimination." },
                { num: 4, title: "Benchmarking", content: "Compare salaries against market data using compa-ratios. Ratios <1 indicate below-market pay; >1 indicates above-market." },
              ].map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{exp.num}</div>
                    <div><p className="font-medium text-sm">{exp.title}</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.content}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          
          {analysisType === "pay_gap" && analysis.pay_gaps && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Pay Gap Interpretation</h4>
              <div className="space-y-4">
                {analysis.pay_gaps.map((gap: PayGap, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border ${gap.significant ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{gap.group_1} vs {gap.group_2}</span>
                      <Badge variant={gap.significant ? "destructive" : "secondary"}>{gap.significant ? 'Significant Gap' : 'No Significant Gap'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{gap.significant ? `A ${Math.abs(gap.gap_percentage).toFixed(1)}% pay gap exists. This warrants investigation.` : `The ${Math.abs(gap.gap_percentage).toFixed(1)}% difference is not statistically significant.`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {analysisType === "equity" && analysis.level_analysis && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Equity by Job Level</h4>
              <div className="space-y-4">
                {analysis.level_analysis.map((level: LevelEquity, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border ${level.is_equitable ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{level.level}</span>
                      <Badge variant={level.is_equitable ? "default" : "secondary"}>{level.is_equitable ? 'Equitable' : 'Review Needed'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{level.count} employees | Mean: {formatCurrency(level.mean)} | CV: {(level.cv * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {analysisType === "benchmark" && analysis.compa_ratio && analysis.vs_benchmark && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Market Benchmark Analysis</h4>
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-xs text-muted-foreground">Avg Compa-Ratio</p><p className="font-semibold text-lg">{(analysis.compa_ratio.mean * 100).toFixed(1)}%</p></div>
                  <div><p className="text-xs text-muted-foreground">Below Market</p><p className="font-semibold text-lg text-red-600">{analysis.vs_benchmark.below}</p></div>
                  <div><p className="text-xs text-muted-foreground">At Market</p><p className="font-semibold text-lg text-amber-600">{analysis.vs_benchmark.at}</p></div>
                  <div><p className="text-xs text-muted-foreground">Above Market</p><p className="font-semibold text-lg text-green-600">{analysis.vs_benchmark.above}</p></div>
                </div>
              </div>
            </div>
          )}
          
          <DetailParagraph title="Strategic Recommendations" detail={`Based on the compensation analysis, here are recommendations.

■ 1. Overall Compensation Health

【Distribution Analysis】
• Mean salary: ${formatCurrency(overall_statistics.mean)}
• Median salary: ${formatCurrency(overall_statistics.median)}
• CV of ${(overall_statistics.cv * 100).toFixed(1)}% indicates ${overall_statistics.cv < 0.2 ? 'healthy pay consistency' : 'variation requiring review'}

■ 2. Action Items

【Immediate Actions】
• Review any statistically significant pay gaps
• Address outliers in salary distribution
• Document findings for compliance records

【Long-term Strategy】
• Implement regular compensation reviews
• Establish transparent pay practices
• Align compensation with performance metrics`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, results: r, key_insights, visualizations } = results;
    const { overall_statistics, group_data } = r;
    
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border"><h1 className="text-xl font-semibold">Compensation Analysis Report</h1><p className="text-sm text-muted-foreground mt-1">{ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} | {new Date().toLocaleDateString()}</p></div>
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={formatCurrency(summary.avg_salary)} label="Average Salary" highlight />
              <MetricCard value={formatCurrency(summary.median_salary)} label="Median Salary" />
              <MetricCard value={summary.employee_count} label="Employees" />
              <MetricCard value={`${summary.analyze_time_ms}ms`} label="Analysis Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">Analyzed compensation for {summary.employee_count} employees. Average salary: {formatCurrency(summary.avg_salary)}. Range: {summary.salary_range}.</p>
          </CardContent>
        </Card>
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (<div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : ins.status === "positive" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/10"}`}>{ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> : ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> : <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}<div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div></div>))}
          </CardContent>
        </Card>
        
        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.salary_distribution && <TabsTrigger value="salary_distribution" className="text-xs">Distribution</TabsTrigger>}
                  {visualizations.by_department && <TabsTrigger value="by_department" className="text-xs">By Department</TabsTrigger>}
                  {visualizations.by_level && <TabsTrigger value="by_level" className="text-xs">By Level</TabsTrigger>}
                  {visualizations.pay_gap && <TabsTrigger value="pay_gap" className="text-xs">Pay Gap</TabsTrigger>}
                  {visualizations.equity && <TabsTrigger value="equity" className="text-xs">Equity</TabsTrigger>}
                  {visualizations.compa_ratio && <TabsTrigger value="compa_ratio" className="text-xs">Compa-Ratio</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (<TabsContent key={key} value={key}><div className="relative border border-border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${value}`} alt={key} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}><Download className="w-4 h-4" /></Button></div></TabsContent>))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Statistical Summary</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Employee Count</TableCell><TableCell className="text-right">{overall_statistics.count}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Mean Salary</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.mean)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Median Salary</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.median)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Standard Deviation</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.std)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Minimum</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.min)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Maximum</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.max)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">25th Percentile</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.q25)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">75th Percentile</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.q75)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">IQR</TableCell><TableCell className="text-right">{formatCurrency(overall_statistics.iqr)}</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Coefficient of Variation</TableCell><TableCell className="text-right">{(overall_statistics.cv * 100).toFixed(1)}%</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {group_data.by_department && group_data.by_department.length > 0 && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Salary by Department</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Department</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Min</TableHead><TableHead className="text-right">Max</TableHead></TableRow></TableHeader>
                <TableBody>
                  {group_data.by_department.map((g) => (<TableRow key={g.group}><TableCell className="font-medium">{g.group}</TableCell><TableCell className="text-right">{g.count}</TableCell><TableCell className="text-right">{formatCurrency(g.mean)}</TableCell><TableCell className="text-right">{formatCurrency(g.median)}</TableCell><TableCell className="text-right">{formatCurrency(g.min)}</TableCell><TableCell className="text-right">{formatCurrency(g.max)}</TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {group_data.by_level && group_data.by_level.length > 0 && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Salary by Job Level</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Level</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Min</TableHead><TableHead className="text-right">Max</TableHead></TableRow></TableHeader>
                <TableBody>
                  {group_data.by_level.map((g) => (<TableRow key={g.group}><TableCell className="font-medium">{g.group}</TableCell><TableCell className="text-right">{g.count}</TableCell><TableCell className="text-right">{formatCurrency(g.mean)}</TableCell><TableCell className="text-right">{formatCurrency(g.median)}</TableCell><TableCell className="text-right">{formatCurrency(g.min)}</TableCell><TableCell className="text-right">{formatCurrency(g.max)}</TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
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


        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV (Results)</Button>
              {Object.entries(visualizations || {}).map(([key, value]) => value && (<Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2"><Download className="w-4 h-4" />{key.replace(/_/g, ' ')}</Button>))}
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button><Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button></div>
      </div>
    );
  };

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
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />  {/* 👈 이 줄 추가 */}
      {currentStep > 1 && (<ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />)}
      {currentStep > 1 && data.length > 0 && (<DataPreview data={data} columns={columns} />)}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}


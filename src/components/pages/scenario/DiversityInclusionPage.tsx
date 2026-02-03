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
  Users, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Building2, Briefcase,
  UserCheck, TrendingDown, Percent, Scale,
  Heart, Globe, Accessibility, Award, GraduationCap,
  DollarSign, Clock, ArrowUpRight, ArrowDownRight,  
  PieChart, Equal, UserPlus, Crown,BookOpen, BookMarked
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface DemographicBreakdown {
  category: string;
  value: string;
  count: number;
  pct: number;
  benchmark?: number;
  gap?: number;
}

interface RepresentationByLevel {
  level: string;
  total: number;
  demographics: { [key: string]: number };
}

interface PayEquityAnalysis {
  group: string;
  avg_salary: number;
  median_salary: number;
  gap_to_reference: number;
  gap_pct: number;
  sample_size: number;
}

interface HiringFunnelStage {
  stage: string;
  total: number;
  demographics: { [key: string]: { count: number; rate: number } };
}

interface RetentionAnalysis {
  group: string;
  headcount: number;
  turnover_count: number;
  turnover_rate: number;
  avg_tenure: number;
}

interface InclusionMetric {
  metric: string;
  score: number;
  benchmark: number;
  gap: number;
  category: string;
}

interface DIResult {
  success: boolean;
  results: {
    summary: {
      total_employees: number;
      diversity_index: number;
      gender_ratio: number;
      minority_pct: number;
      pay_equity_score: number;
      inclusion_score: number;
    };
    gender_breakdown: DemographicBreakdown[];
    ethnicity_breakdown: DemographicBreakdown[];
    age_breakdown: DemographicBreakdown[];
    representation_by_level: RepresentationByLevel[];
    pay_equity: PayEquityAnalysis[];
    hiring_funnel: HiringFunnelStage[];
    retention: RetentionAnalysis[];
    inclusion_metrics: InclusionMetric[];
    recommendations: {
      priority: string;
      area: string;
      recommendation: string;
      impact: string;
    }[];
  };
  visualizations: {
    gender_distribution?: string;
    ethnicity_distribution?: string;
    level_representation?: string;
    pay_equity_chart?: string;
    diversity_index?: string;
    inclusion_radar?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    most_diverse_dept: string;
    key_gap_area: string;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const DIVERSITY_DIMENSIONS = [
  { id: "gender", label: "Gender", icon: Users, color: "#3b82f6" },
  { id: "ethnicity", label: "Ethnicity/Race", icon: Globe, color: "#8b5cf6" },
  { id: "age", label: "Age Groups", icon: Clock, color: "#f59e0b" },
  { id: "disability", label: "Disability", icon: Accessibility, color: "#22c55e" },
  { id: "veteran", label: "Veteran Status", icon: Award, color: "#ef4444" },
  { id: "education", label: "Education", icon: GraduationCap, color: "#06b6d4" },
];

const INDUSTRY_BENCHMARKS = {
  gender: { 'Female': 0.47, 'Male': 0.52, 'Non-binary': 0.01 },
  tech_gender: { 'Female': 0.29, 'Male': 0.70, 'Non-binary': 0.01 },
  leadership_female: 0.28,
  minority_pct: 0.40,
};

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Product', 'Customer Success'];
  const levels = ['Individual Contributor', 'Senior IC', 'Manager', 'Senior Manager', 'Director', 'VP', 'C-Suite'];
  const genders = ['Male', 'Female', 'Non-binary'];
  const ethnicities = ['White', 'Asian', 'Black', 'Hispanic', 'Two or More', 'Other'];
  const ageGroups = ['18-25', '26-35', '36-45', '46-55', '55+'];
  
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 500; i++) {
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    
    // Gender distribution with realistic bias
    let gender: string;
    if (dept === 'Engineering') {
      gender = Math.random() < 0.72 ? 'Male' : Math.random() < 0.97 ? 'Female' : 'Non-binary';
    } else if (dept === 'HR') {
      gender = Math.random() < 0.35 ? 'Male' : Math.random() < 0.98 ? 'Female' : 'Non-binary';
    } else {
      gender = Math.random() < 0.52 ? 'Male' : Math.random() < 0.98 ? 'Female' : 'Non-binary';
    }
    
    // Leadership gender gap
    if (['Director', 'VP', 'C-Suite'].includes(level) && gender === 'Female') {
      if (Math.random() < 0.3) gender = 'Male'; // Simulate glass ceiling
    }
    
    // Ethnicity distribution
    const ethnicityProbs = [0.55, 0.20, 0.12, 0.08, 0.03, 0.02];
    let cumProb = 0;
    let ethnicity = ethnicities[0];
    const rand = Math.random();
    for (let j = 0; j < ethnicities.length; j++) {
      cumProb += ethnicityProbs[j];
      if (rand < cumProb) {
        ethnicity = ethnicities[j];
        break;
      }
    }
    
    // Age distribution
    const ageProbs = [0.12, 0.38, 0.28, 0.15, 0.07];
    cumProb = 0;
    let ageGroup = ageGroups[0];
    const randAge = Math.random();
    for (let j = 0; j < ageGroups.length; j++) {
      cumProb += ageProbs[j];
      if (randAge < cumProb) {
        ageGroup = ageGroups[j];
        break;
      }
    }
    
    // Salary with pay gaps
    let baseSalary = 60000;
    if (level === 'Senior IC') baseSalary = 85000;
    else if (level === 'Manager') baseSalary = 100000;
    else if (level === 'Senior Manager') baseSalary = 120000;
    else if (level === 'Director') baseSalary = 150000;
    else if (level === 'VP') baseSalary = 200000;
    else if (level === 'C-Suite') baseSalary = 300000;
    
    // Add department premium
    if (dept === 'Engineering') baseSalary *= 1.15;
    if (dept === 'Sales') baseSalary *= 1.10;
    
    // Simulate pay gaps
    let salary = baseSalary * (0.9 + Math.random() * 0.2);
    if (gender === 'Female') salary *= 0.92; // Gender pay gap
    if (!['White', 'Asian'].includes(ethnicity)) salary *= 0.95; // Ethnicity pay gap
    
    // Tenure
    const tenure = Math.floor(Math.random() * 10) + 1;
    
    // Inclusion survey scores (1-5)
    const belonging = 3 + Math.random() * 2 - (gender === 'Female' ? 0.2 : 0) - (!['White', 'Asian'].includes(ethnicity) ? 0.3 : 0);
    const fairness = 3 + Math.random() * 2 - (gender === 'Female' ? 0.3 : 0);
    const voice = 3 + Math.random() * 2;
    
    data.push({
      employee_id: `EMP-${String(i).padStart(4, '0')}`,
      department: dept,
      level: level,
      gender: gender,
      ethnicity: ethnicity,
      age_group: ageGroup,
      salary: Math.round(salary),
      tenure_years: tenure,
      hire_year: 2024 - tenure,
      is_active: Math.random() < 0.92 ? 1 : 0, // 8% turnover
      belonging_score: parseFloat(belonging.toFixed(1)),
      fairness_score: parseFloat(fairness.toFixed(1)),
      voice_score: parseFloat(voice.toFixed(1)),
    });
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, sublabel, trend, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <div className="flex items-center justify-center gap-1">
      <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
      {trend && (
        trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> :
        trend === 'down' ? <ArrowDownRight className="w-4 h-4 text-red-500" /> : null
      )}
    </div>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
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

const ProgressBar: React.FC<{ 
  currentStep: number; 
  hasResults: boolean; 
  onStepClick: (step: number) => void 
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Config" },
    { num: 3, label: "Validation" },
    { num: 4, label: "Diversity" },
    { num: 5, label: "Equity" },
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
                isCurrent ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary/10 text-primary" :
                isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" :
                "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
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

const GapBadge: React.FC<{ gap: number }> = ({ gap }) => {
  const color = gap >= 0 ? 'bg-green-100 text-green-700' : 
                gap >= -5 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-red-100 text-red-700';
  
  return (
    <Badge className={`${color} text-xs`}>
      {gap >= 0 ? '+' : ''}{gap.toFixed(1)}%
    </Badge>
  );
};

const DiversityBar: React.FC<{ value: number; benchmark?: number; maxValue?: number }> = ({ value, benchmark, maxValue = 100 }) => {
  const pct = (value / maxValue) * 100;
  const benchPct = benchmark ? (benchmark / maxValue) * 100 : null;
  const color = benchmark ? (value >= benchmark * 0.9 ? '#22c55e' : value >= benchmark * 0.7 ? '#f59e0b' : '#ef4444') : '#3b82f6';
  
  return (
    <div className="relative w-full h-3 bg-muted rounded-full overflow-visible">
      <div 
        className="absolute left-0 top-0 h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
      {benchPct && (
        <div 
          className="absolute top-0 w-0.5 h-5 bg-slate-600 -translate-y-1"
          style={{ left: `${benchPct}%` }}
          title={`Benchmark: ${benchmark}%`}
        />
      )}
    </div>
  );
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatCurrency = (value: number): string => {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

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
    a.download = 'diversity_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} employees</Badge>
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

const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Diversity & Inclusion Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              What is Diversity & Inclusion (D&I)?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Diversity refers to the presence of differences within a given setting - including race, gender, ethnicity, 
              age, disability status, veteran status, sexual orientation, education, and more. Inclusion is the practice 
              of ensuring that people feel a sense of belonging and support from the organization. D&I analysis measures 
              both the composition of your workforce (diversity metrics) and the experience of employees from different 
              backgrounds (inclusion metrics). This is both a moral imperative and a business advantage - diverse, 
              inclusive companies consistently outperform their peers.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              The Diversity Index (Simpson's Diversity Index)
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Understanding Simpson's Index</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> D = 1 - Σ(p_i)²<br/>
                  Where p_i is the proportion of individuals in each group<br/><br/>
                  
                  <strong>Interpretation:</strong><br/>
                  • Range: 0 to 1 (technically approaches 1 as groups increase)<br/>
                  • 0 = No diversity (everyone in one group)<br/>
                  • 1 = Maximum diversity (everyone in different groups)<br/><br/>
                  
                  <strong>Example:</strong><br/>
                  Company with 50% Group A, 50% Group B:<br/>
                  D = 1 - (0.5² + 0.5²) = 1 - 0.5 = 0.50<br/><br/>
                  
                  Company with 40% A, 30% B, 20% C, 10% D:<br/>
                  D = 1 - (0.4² + 0.3² + 0.2² + 0.1²) = 1 - 0.30 = 0.70 (more diverse)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Benchmarks</p>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Diversity Index</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Typical Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">0.70+</TableCell>
                      <TableCell className="text-green-600">Excellent</TableCell>
                      <TableCell>Highly diverse, multiple groups well-represented</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">0.60-0.70</TableCell>
                      <TableCell className="text-green-500">Good</TableCell>
                      <TableCell>Above average diversity</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">0.40-0.60</TableCell>
                      <TableCell className="text-amber-600">Moderate</TableCell>
                      <TableCell>Some diversity but room for improvement</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Below 0.40</TableCell>
                      <TableCell className="text-red-600">Low</TableCell>
                      <TableCell>Homogeneous, limited diversity</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Gender Diversity Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Industry Benchmarks</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>General Workforce (U.S.):</strong><br/>
                  • Female: 47%<br/>
                  • Male: 52%<br/>
                  • Non-binary: ~1%</p>
                  
                  <p><strong>Technology Sector:</strong><br/>
                  • Female: 25-30% (overall)<br/>
                  • Female in technical roles: 15-20%<br/>
                  • Female in leadership: 20-25%</p>
                  
                  <p><strong>Finance Sector:</strong><br/>
                  • Female: 50-55% (overall)<br/>
                  • Female in senior roles: 25-30%</p>
                  
                  <p><strong>Healthcare:</strong><br/>
                  • Female: 70-75% (overall, nursing-heavy)<br/>
                  • Female physicians: 35-40%</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">The Glass Ceiling Effect</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Definition:</strong> Invisible barrier preventing women and minorities from advancing to 
                  senior leadership despite qualifications.<br/><br/>
                  
                  <strong>How to Measure:</strong><br/>
                  Compare representation at entry level vs. senior leadership.<br/>
                  • Entry level: 50% women → Senior leadership: 20% women = Glass ceiling exists<br/><br/>
                  
                  <strong>Action:</strong> Track promotion rates by gender at each level. If women/minorities have 
                  lower promotion rates despite equal performance, investigate barriers.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Pay Equity Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Controlled vs Uncontrolled Pay Gaps</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Uncontrolled Gap:</strong> Raw difference in average pay<br/>
                  • Example: All men average $100K, all women average $80K = 20% gap<br/>
                  • Problem: Doesn't account for job level, department, tenure, etc.<br/>
                  • Use: High-level screening, media reporting</p>
                  
                  <p><strong>Controlled Gap:</strong> Difference after accounting for legitimate factors<br/>
                  • Compare: Female Senior Engineer with 5 years vs Male Senior Engineer with 5 years<br/>
                  • Control for: Job level, department, tenure, location, performance<br/>
                  • Remaining gap is unexplained and potentially discriminatory<br/>
                  • Use: Legal compliance, remediation decisions</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Pay Equity Methodology</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Step 1: Group Employees</strong><br/>
                  Create cohorts of "substantially similar" work:<br/>
                  • Same job level or title<br/>
                  • Same department or function<br/>
                  • Similar tenure (±2 years)<br/>
                  • Same location (if location-adjusted pay)</p>
                  
                  <p><strong>Step 2: Calculate Reference Group</strong><br/>
                  Typically use the highest-paid demographic as reference:<br/>
                  • Often White males in most U.S. analyses<br/>
                  • Or create "expected salary" from regression model</p>
                  
                  <p><strong>Step 3: Measure Gaps</strong><br/>
                  Gap % = (Group Avg - Reference Avg) / Reference Avg × 100%<br/>
                  • Negative gap = group paid less than reference<br/>
                  • Example: Women avg $90K, Men avg $95K → -5.3% gap</p>
                  
                  <p><strong>Step 4: Assess Significance</strong><br/>
                  • Within ±3%: Generally acceptable statistical noise<br/>
                  • -3% to -5%: Yellow flag, monitor closely<br/>
                  • Beyond -5%: Red flag, immediate investigation<br/>
                  • Use t-tests to determine statistical significance</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-1">⚠️ Legal Implications</p>
                <p className="text-xs text-muted-foreground">
                  <strong>U.S. Equal Pay Act (1963):</strong> Requires equal pay for equal work regardless of sex. 
                  Substantial pay gaps without business justification can lead to class-action lawsuits.<br/><br/>
                  
                  <strong>State Laws:</strong> Many states (CA, MA, NY, etc.) require proactive pay equity audits 
                  and aggressive remediation.<br/><br/>
                  
                  <strong>Best Practice:</strong> Annual pay equity review, documented remediation for gaps above 3%, 
                  legal privilege protection by conducting under attorney supervision.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Inclusion Metrics & Measurement
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Key Inclusion Dimensions</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>1. Belonging (Psychological Safety)</strong><br/>
                  "I feel like I belong at this organization"<br/>
                  "I can be my authentic self at work"<br/>
                  "I am comfortable sharing my opinions"<br/>
                  <strong>Benchmark:</strong> 4.0+ out of 5.0</p>
                  
                  <p><strong>2. Fairness (Equity of Treatment)</strong><br/>
                  "I am treated fairly regardless of background"<br/>
                  "Promotion decisions are fair and transparent"<br/>
                  "I have equal access to opportunities"<br/>
                  <strong>Benchmark:</strong> 4.0+ out of 5.0</p>
                  
                  <p><strong>3. Voice (Empowerment)</strong><br/>
                  "My opinions are valued"<br/>
                  "I can speak up without fear of retaliation"<br/>
                  "I have influence over decisions affecting my work"<br/>
                  <strong>Benchmark:</strong> 3.8+ out of 5.0</p>
                  
                  <p><strong>4. Value (Contribution)</strong><br/>
                  "My contributions are recognized"<br/>
                  "I am valued for my unique perspective"<br/>
                  "My work makes a difference"<br/>
                  <strong>Benchmark:</strong> 4.0+ out of 5.0</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Calculating Inclusion Index</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Method 1: Average Across Dimensions</strong><br/>
                  Inclusion Index = (Belonging + Fairness + Voice + Value) / 4<br/>
                  Example: (4.2 + 3.9 + 3.7 + 4.1) / 4 = 3.98<br/><br/>
                  
                  <strong>Method 2: Favorable %</strong><br/>
                  % who score 4 or 5 (out of 5) on inclusion questions<br/>
                  Example: 68% favorable = 68% inclusion index<br/><br/>
                  
                  <strong>Segmentation:</strong> Calculate separately for different demographics<br/>
                  • If women score 3.5 but men score 4.2 → Inclusion gap of 0.7<br/>
                  • Gaps above 0.5 indicate differential experience requiring attention
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">Survey Best Practices</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Anonymity:</strong> Ensure responses cannot be traced to individuals</li>
                  <li>• <strong>Sample Size:</strong> Need 5+ responses per demographic group to report</li>
                  <li>• <strong>Frequency:</strong> Annually for comprehensive, quarterly pulse for tracking</li>
                  <li>• <strong>Action:</strong> Always share results and action plans with employees</li>
                  <li>• <strong>Trust:</strong> Past inaction kills future participation rates</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Leadership & Advancement Metrics
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Representation by Level</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Pipeline Analysis:</strong> Track representation at each career stage<br/><br/>
                  
                  <strong>Example Pipeline:</strong><br/>
                  • Entry Level: 48% women<br/>
                  • Mid Level: 42% women<br/>
                  • Senior IC: 35% women<br/>
                  • Manager: 32% women<br/>
                  • Director: 25% women<br/>
                  • VP: 18% women<br/>
                  • C-Suite: 12% women<br/><br/>
                  
                  <strong>Interpretation:</strong> Clear drop-off at each level = systemic barriers<br/>
                  <strong>Action:</strong> Investigate promotion rates, sponsorship programs, retention
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Promotion Rate Analysis</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> Promotion Rate = (# Promoted / # Eligible) × 100%<br/><br/>
                  
                  <strong>Example:</strong><br/>
                  • Men: 50 promoted / 200 eligible = 25% promotion rate<br/>
                  • Women: 30 promoted / 150 eligible = 20% promotion rate<br/>
                  • Gap: 5 percentage points<br/><br/>
                  
                  <strong>Statistical Test:</strong> Use chi-square test to determine if gap is significant<br/>
                  <strong>Action:</strong> If significant gap, audit promotion criteria and decision-making process
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">The "Broken Rung" Problem</p>
                <p className="text-xs text-muted-foreground">
                  <strong>McKinsey Research Finding:</strong> For every 100 men promoted to manager, only 72 women 
                  are promoted. This first step is the biggest barrier.<br/><br/>
                  
                  <strong>Why It Matters:</strong> Fewer women at manager level = fewer in pipeline for senior roles<br/><br/>
                  
                  <strong>Solution:</strong> Focus on first promotion to management. Set targets, track closely, 
                  hold leaders accountable.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Retention & Attrition Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Turnover Rate by Demographic</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> Turnover Rate = (# Exits / Average Headcount) × 100%<br/><br/>
                  
                  <strong>Example:</strong><br/>
                  • Overall turnover: 12%<br/>
                  • Women: 15% turnover<br/>
                  • Men: 10% turnover<br/>
                  • Underrepresented minorities: 18% turnover<br/><br/>
                  
                  <strong>Interpretation:</strong> Higher turnover = retention problem<br/>
                  <strong>Action:</strong> Exit interviews, stay interviews, targeted retention programs
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Regrettable vs Non-Regrettable Attrition</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Regrettable:</strong> High performers you wanted to keep<br/>
                  • If disproportionately from underrepresented groups → Major problem<br/>
                  • Investigate: Lack of belonging, unfair treatment, limited advancement<br/><br/>
                  
                  <strong>Non-Regrettable:</strong> Low performers, poor fit<br/>
                  • Track to ensure performance management is equitable<br/>
                  • Watch for bias in performance ratings
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">Tenure Analysis</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Average Tenure by Group:</strong><br/>
                  • Overall: 4.2 years<br/>
                  • Women: 3.5 years (shorter = faster exit)<br/>
                  • Men: 4.7 years<br/>
                  • URM: 3.1 years<br/><br/>
                  
                  <strong>Critical Periods:</strong><br/>
                  • 0-1 year: Onboarding issues<br/>
                  • 2-3 years: Career growth concerns<br/>
                  • 5+ years: Feeling stuck, lack of advancement
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Hiring & Recruitment Metrics
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Hiring Funnel Analysis</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Track Conversion Rates by Stage:</strong><br/><br/>
                  
                  1. <strong>Applicants:</strong> Who applies?<br/>
                  • 45% women apply for Engineering roles<br/><br/>
                  
                  2. <strong>Resume Screen:</strong> Who passes initial filter?<br/>
                  • 40% women advance (drop-off!)<br/><br/>
                  
                  3. <strong>Phone Screen:</strong> Who passes recruiter screen?<br/>
                  • 38% women advance<br/><br/>
                  
                  4. <strong>Onsite Interview:</strong> Who gets final round?<br/>
                  • 35% women advance<br/><br/>
                  
                  5. <strong>Offer:</strong> Who receives offers?<br/>
                  • 30% women (significant drop from 45% applicant pool!)<br/><br/>
                  
                  <strong>Analysis:</strong> Biggest drop at resume screen and offer stage<br/>
                  <strong>Action:</strong> Review screening criteria, interview training, offer decision process
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Sourcing & Pipeline Building</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Diverse Slate:</strong> Ensure qualified candidates from underrepresented groups</li>
                  <li>• <strong>Inclusive Job Descriptions:</strong> Remove gendered language, unnecessary requirements</li>
                  <li>• <strong>Diverse Interview Panels:</strong> Representation matters in evaluation</li>
                  <li>• <strong>Structured Interviews:</strong> Reduce bias via standardized questions/scoring</li>
                  <li>• <strong>Blind Resume Review:</strong> Remove names, schools to reduce unconscious bias</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-1">⚠️ Legal Risks in Hiring</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Disparate Impact:</strong> Hiring practice that disproportionately excludes protected groups, 
                  even if neutral on face. 80% Rule: If selection rate for one group is less than 80% of highest 
                  group, red flag for discrimination.<br/><br/>
                  
                  <strong>Example:</strong> 50% of male applicants hired, 30% of female applicants hired<br/>
                  30% / 50% = 60% (below 80% threshold) → Potential disparate impact
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Setting D&I Goals & Accountability
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">SMART D&I Goals</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Bad Goal:</strong> "Improve diversity"<br/>
                  Too vague, not measurable, no timeline</p>
                  
                  <p><strong>Good Goal:</strong> "Increase female representation in technical roles from 22% to 30% 
                  by end of 2025"<br/>
                  Specific, Measurable, Achievable (with effort), Relevant, Time-bound</p>
                  
                  <p><strong>Examples of SMART Goals:</strong><br/>
                  • Achieve pay equity (≤3% gaps) across all demographics by Q2 2025<br/>
                  • Increase underrepresented minority leadership (Director+) from 12% to 20% by 2026<br/>
                  • Improve inclusion scores for women from 3.6 to 4.0 by end of 2025<br/>
                  • Reduce turnover gap between URM and majority from 6% to 2% by 2026</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Accountability Mechanisms</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Executive Scorecards:</strong> D&I metrics in leadership performance reviews</li>
                  <li>• <strong>Compensation Link:</strong> Tie bonus to D&I goal achievement (10-20% weighting)</li>
                  <li>• <strong>Quarterly Reviews:</strong> Board-level reporting on D&I progress</li>
                  <li>• <strong>Public Commitments:</strong> Publish goals and progress (transparency drives action)</li>
                  <li>• <strong>Manager Training:</strong> Inclusive leadership required for all people managers</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600 mb-1">Quick Wins vs Long-Term Initiatives</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Quick Wins (0-6 months):</strong><br/>
                  • Pay equity audit and remediation<br/>
                  • Inclusive job description review<br/>
                  • Diverse interview panel requirement<br/>
                  • Pronoun options in HRIS<br/>
                  • D&I training for managers<br/><br/>
                  
                  <strong>Long-Term (6-24 months):</strong><br/>
                  • Leadership pipeline development for URMs<br/>
                  • Mentorship and sponsorship programs<br/>
                  • Hiring goal achievement (representation shifts)<br/>
                  • Culture transformation<br/>
                  • Supplier diversity program
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
                <p className="font-medium text-sm text-primary mb-1">Data & Measurement</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Collect demographic data consistently (voluntary self-ID)</li>
                  <li>• Calculate metrics quarterly minimum</li>
                  <li>• Segment all people metrics by demographics</li>
                  <li>• Use statistical tests for significance</li>
                  <li>• Track trends over time, not just point-in-time</li>
                  <li>• Protect privacy (no groups below 5 people)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Communication</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Transparency: Share D&I data with all employees</li>
                  <li>• Honesty: Acknowledge gaps, don't spin bad news</li>
                  <li>• Action-oriented: Always pair data with action plan</li>
                  <li>• Regular updates: Progress reports, not just annual</li>
                  <li>• Safe channels: Ways to report concerns anonymously</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Leadership</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Executive sponsorship: CEO must own D&I</li>
                  <li>• Dedicated resources: D&I team with budget</li>
                  <li>• Manager accountability: Goals in performance reviews</li>
                  <li>• Role modeling: Leaders visibly champion initiatives</li>
                  <li>• Sustained commitment: 3-5 year strategic horizon</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Common Pitfalls</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Diversity without inclusion (hire but don't retain)</li>
                  <li>• Checkbox compliance (meet quotas without culture change)</li>
                  <li>• Performative allyship (statements without action)</li>
                  <li>• Ignoring intersectionality (e.g., Black women's unique experience)</li>
                  <li>• Short-term focus (3-month initiative, then forget)</li>
                  <li>• Blaming candidates ("pipeline problem" excuse)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Diversity & inclusion is not HR's job alone - it's 
              a business imperative requiring leadership commitment, manager accountability, and employee participation. 
              Measure what matters: representation, pay equity, promotion rates, retention, and inclusion experience. 
              Set ambitious but achievable goals. Hold leaders accountable. Communicate transparently. Most importantly, 
              take action - data without action is worthless. Diverse, inclusive organizations consistently outperform 
              on innovation, employee satisfaction, and financial results. This is both the right thing to do and the 
              smart thing to do.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Heart className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Diversity & Inclusion Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze workforce diversity, pay equity, and inclusion metrics to identify gaps
          and build a more equitable workplace.
        </p>
      </div>
      
      {/* 3개 핵심 카드 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Diversity Metrics</p>
              <p className="text-xs text-muted-foreground">Representation analysis</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Pay Equity</p>
              <p className="text-xs text-muted-foreground">Compensation gaps</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Inclusion Index</p>
              <p className="text-xs text-muted-foreground">Belonging & fairness</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About D&I Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Diversity index & representation gaps",
                  "Pay equity across demographics",
                  "Leadership diversity metrics",
                  "Inclusion & belonging scores",
                  "Actionable recommendations",
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
                  "Employee ID & department",
                  "Job level or title",
                  "Gender & ethnicity (optional)",
                  "Salary for pay equity (optional)",
                  "Survey scores for inclusion (optional)",
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

// ============ MAIN COMPONENT ============
export default function DiversityInclusionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<DIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  
  
  // Configuration
  const [employeeCol, setEmployeeCol] = useState<string>("");
  const [deptCol, setDeptCol] = useState<string>("");
  const [levelCol, setLevelCol] = useState<string>("");
  const [genderCol, setGenderCol] = useState<string>("");
  const [ethnicityCol, setEthnicityCol] = useState<string>("");
  const [ageCol, setAgeCol] = useState<string>("");
  const [salaryCol, setSalaryCol] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    
    // Auto-configure
    setEmployeeCol("employee_id");
    setDeptCol("department");
    setLevelCol("level");
    setGenderCol("gender");
    setEthnicityCol("ethnicity");
    setAgeCol("age_group");
    setSalaryCol("salary");
    
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
    return [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} employees loaded` : "No data"
      },
      {
        name: "Employee ID Column",
        passed: !!employeeCol,
        message: employeeCol ? `Using: ${employeeCol}` : "Select employee ID column"
      },
      {
        name: "Department Column",
        passed: !!deptCol,
        message: deptCol ? `Using: ${deptCol}` : "Select department column"
      },
      {
        name: "Gender Column",
        passed: !!genderCol,
        message: genderCol ? `Using: ${genderCol}` : "Select gender column (recommended)"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 50,
        message: data.length >= 50 
          ? `${data.length} employees (sufficient)` 
          : `Need more data (min 50, current: ${data.length})`
      },
    ];
  }, [data, employeeCol, deptCol, genderCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        employee_col: employeeCol,
        dept_col: deptCol,
        level_col: levelCol || null,
        gender_col: genderCol || null,
        ethnicity_col: ethnicityCol || null,
        age_col: ageCol || null,
        salary_col: salaryCol || null,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/diversity-inclusion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: DIResult = await res.json();
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
    const rows: string[] = ['Category,Value,Count,Percentage,Benchmark,Gap'];
    results.results.gender_breakdown.forEach(g => {
      rows.push(`Gender,${g.value},${g.count},${(g.pct * 100).toFixed(1)}%,${g.benchmark ? (g.benchmark * 100).toFixed(1) : 'N/A'}%,${g.gap?.toFixed(1) || 'N/A'}%`);
    });
    results.results.ethnicity_breakdown.forEach(e => {
      rows.push(`Ethnicity,${e.value},${e.count},${(e.pct * 100).toFixed(1)}%,,,`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diversity_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `diversity_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Core Column Mapping
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee ID *</Label>
                <Select value={employeeCol || "__none__"} onValueChange={v => setEmployeeCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={deptCol || "__none__"} onValueChange={v => setDeptCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Level / Title</Label>
                <Select value={levelCol || "__none__"} onValueChange={v => setLevelCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Demographic Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Demographic Columns
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={genderCol || "__none__"} onValueChange={v => setGenderCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ethnicity / Race</Label>
                <Select value={ethnicityCol || "__none__"} onValueChange={v => setEthnicityCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Age Group</Label>
                <Select value={ageCol || "__none__"} onValueChange={v => setAgeCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Pay Equity */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Pay Equity Analysis
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salary Column</Label>
                <Select value={salaryCol || "__none__"} onValueChange={v => setSalaryCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
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
  };

  // ============ STEP 3: VALIDATION ============
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.slice(0, 3).every(c => c.passed);
    
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
  // ============ STEP 4: DIVERSITY RESULTS ============
  const renderStep4Diversity = () => {
    if (!results) return null;
    
    const { summary: s, results: r, key_insights } = results;
    
    const finding = `Workforce diversity index is ${r.summary.diversity_index.toFixed(2)} with ` +
      `${(r.summary.gender_ratio * 100).toFixed(0)}% female representation. ` +
      `${(r.summary.minority_pct * 100).toFixed(0)}% underrepresented groups. ` +
      `Key gap area: ${s.key_gap_area}.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChart className="w-5 h-5 text-primary" />
            Diversity Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={r.summary.diversity_index.toFixed(2)}
              label="Diversity Index" 
              sublabel="Simpson's Index"
              icon={Globe}
              highlight={r.summary.diversity_index >= 0.6}
            />
            <MetricCard 
              value={`${(r.summary.gender_ratio * 100).toFixed(0)}%`}
              label="Female Representation" 
              sublabel={r.summary.gender_ratio >= 0.4 ? "Near parity" : "Below target"}
              icon={Users}
              highlight={r.summary.gender_ratio >= 0.4}
              negative={r.summary.gender_ratio < 0.3}
            />
            <MetricCard 
              value={`${(r.summary.minority_pct * 100).toFixed(0)}%`}
              label="Underrepresented Groups" 
              icon={Heart}
            />
            <MetricCard 
              value={r.summary.total_employees.toLocaleString()}
              label="Total Employees" 
              icon={Briefcase}
            />
          </div>
          
          {/* Gender Breakdown */}
          {r.gender_breakdown.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Gender Distribution
              </h4>
              <div className="space-y-3">
                {r.gender_breakdown.map((g) => (
                  <div key={g.value} className="flex items-center gap-4">
                    <span className="text-sm w-24">{g.value}</span>
                    <div className="flex-1">
                      <DiversityBar value={g.pct * 100} benchmark={g.benchmark ? g.benchmark * 100 : undefined} />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{(g.pct * 100).toFixed(1)}%</span>
                    {g.gap !== undefined && <GapBadge gap={g.gap} />}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Vertical line indicates industry benchmark.</p>
            </div>
          )}
          
          {/* Ethnicity Breakdown */}
          {r.ethnicity_breakdown.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Ethnicity Distribution
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {r.ethnicity_breakdown.map((e) => (
                  <div key={e.value} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-sm">{e.value}</p>
                      <p className="text-xs text-muted-foreground">{e.count} employees</p>
                    </div>
                    <Badge variant="secondary" className="text-sm">{(e.pct * 100).toFixed(1)}%</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Representation by Level */}
          {r.representation_by_level.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                Representation by Level
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {r.gender_breakdown.map(g => (
                      <TableHead key={g.value} className="text-right">{g.value}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.representation_by_level.map((level) => (
                    <TableRow key={level.level}>
                      <TableCell className="font-medium">{level.level}</TableCell>
                      <TableCell className="text-right">{level.total}</TableCell>
                      {r.gender_breakdown.map(g => (
                        <TableCell key={g.value} className="text-right">
                          {level.demographics[g.value] 
                            ? `${((level.demographics[g.value] / level.total) * 100).toFixed(0)}%`
                            : '0%'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Key Insights */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.slice(0, 4).map((insight, idx) => (
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
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              View Pay Equity
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: PAY EQUITY ============
  const renderStep5Equity = () => {
    if (!results) return null;
    
    const { results: r } = results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="w-5 h-5 text-primary" />
            Pay Equity & Inclusion Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`Pay equity score: ${(r.summary.pay_equity_score * 100).toFixed(0)}%. ${r.summary.pay_equity_score >= 0.97 ? 'Within acceptable range.' : 'Gaps detected that require attention.'}`} />
          
          {/* Pay Equity Score */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard 
              value={`${(r.summary.pay_equity_score * 100).toFixed(0)}%`}
              label="Pay Equity Score" 
              sublabel={r.summary.pay_equity_score >= 0.97 ? "Good" : "Needs attention"}
              icon={Scale}
              highlight={r.summary.pay_equity_score >= 0.97}
              negative={r.summary.pay_equity_score < 0.95}
            />
            <MetricCard 
              value={r.summary.inclusion_score.toFixed(1)}
              label="Inclusion Score" 
              sublabel="/5.0"
              icon={Heart}
              highlight={r.summary.inclusion_score >= 4.0}
            />
          </div>
          
          {/* Pay Equity by Group */}
          {r.pay_equity.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Pay Equity by Demographic Group
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Avg Salary</TableHead>
                    <TableHead className="text-right">Median Salary</TableHead>
                    <TableHead className="text-right">Gap to Reference</TableHead>
                    <TableHead className="text-right">Sample Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.pay_equity.map((pe) => (
                    <TableRow key={pe.group}>
                      <TableCell className="font-medium">{pe.group}</TableCell>
                      <TableCell className="text-right">{formatCurrency(pe.avg_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(pe.median_salary)}</TableCell>
                      <TableCell className={`text-right ${pe.gap_pct < -3 ? 'text-destructive' : pe.gap_pct < 0 ? 'text-amber-500' : 'text-green-500'}`}>
                        {pe.gap_pct >= 0 ? '+' : ''}{pe.gap_pct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">{pe.sample_size}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Reference group is typically the highest-paid demographic. Gaps &gt; 3% require investigation.
              </p>
            </div>
          )}
          
          {/* Inclusion Metrics */}
          {r.inclusion_metrics.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Inclusion Index Breakdown
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {r.inclusion_metrics.map((metric) => (
                  <div key={metric.metric} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{metric.metric}</p>
                      <Badge variant={metric.score >= 4 ? "default" : metric.score >= 3.5 ? "secondary" : "destructive"} className="text-xs">
                        {metric.score.toFixed(1)}/5.0
                      </Badge>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${(metric.score / 5) * 100}%`,
                          backgroundColor: metric.score >= 4 ? '#22c55e' : metric.score >= 3.5 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Benchmark: {metric.benchmark.toFixed(1)} | Gap: {metric.gap >= 0 ? '+' : ''}{metric.gap.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recommendations */}
          {r.recommendations.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Recommended Actions
              </h4>
              <div className="space-y-3">
                {r.recommendations.map((rec, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${
                    rec.priority === 'High' ? 'border-destructive/30 bg-destructive/5' :
                    rec.priority === 'Medium' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-border bg-muted/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={rec.priority === 'High' ? 'destructive' : rec.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                        {rec.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{rec.area}</span>
                    </div>
                    <p className="font-medium text-sm">{rec.recommendation}</p>
                    <p className="text-xs text-muted-foreground mt-1">Impact: {rec.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DetailParagraph
            title="Understanding D&I Metrics"
            detail={`■ Diversity Index (Simpson's)

Measures the probability that two randomly selected employees belong to different groups. Range 0-1, higher is more diverse.
• 0.6+ = Good diversity
• 0.4-0.6 = Moderate diversity
• <0.4 = Low diversity

■ Pay Equity

Compare compensation across demographic groups, controlling for role and level.
• Within ±3% = Acceptable
• 3-5% gap = Monitor closely
• >5% gap = Immediate action needed

■ Inclusion Index

Survey-based metrics measuring employee experience:
• Belonging: Feeling valued and accepted
• Fairness: Equal treatment and opportunities
• Voice: Ability to speak up and be heard

■ Best Practices

1. Set measurable D&I goals
2. Conduct annual pay equity audits
3. Track promotion rates by demographic
4. Regular inclusion pulse surveys
5. Leadership accountability`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Diversity</Button>
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
    
    const { summary: s, results: r, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Diversity & Inclusion Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {r.summary.total_employees} Employees | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={r.summary.diversity_index.toFixed(2)} label="Diversity Index" />
              <MetricCard value={`${(r.summary.gender_ratio * 100).toFixed(0)}%`} label="Female %" />
              <MetricCard value={`${(r.summary.pay_equity_score * 100).toFixed(0)}%`} label="Pay Equity" />
              <MetricCard value={r.summary.inclusion_score.toFixed(1)} label="Inclusion Score" />
            </div>
            <p className="text-sm text-muted-foreground">
              Overall diversity index of {r.summary.diversity_index.toFixed(2)} with {(r.summary.gender_ratio * 100).toFixed(0)}% female representation.
              Pay equity score at {(r.summary.pay_equity_score * 100).toFixed(0)}%. Key focus area: {s.key_gap_area}.
            </p>
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
                  {visualizations.gender_distribution && <TabsTrigger value="gender_distribution" className="text-xs">Gender</TabsTrigger>}
                  {visualizations.ethnicity_distribution && <TabsTrigger value="ethnicity_distribution" className="text-xs">Ethnicity</TabsTrigger>}
                  {visualizations.level_representation && <TabsTrigger value="level_representation" className="text-xs">By Level</TabsTrigger>}
                  {visualizations.pay_equity_chart && <TabsTrigger value="pay_equity_chart" className="text-xs">Pay Equity</TabsTrigger>}
                  {visualizations.inclusion_radar && <TabsTrigger value="inclusion_radar" className="text-xs">Inclusion</TabsTrigger>}
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
        
        {/* Recommendations Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Priority Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {r.recommendations.slice(0, 5).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Badge variant={rec.priority === 'High' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                    {rec.priority}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{rec.recommendation}</p>
                    <p className="text-xs text-muted-foreground">{rec.area}</p>
                  </div>
                </div>
              ))}
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
                CSV (Demographics)
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
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {currentStep > 1 && (
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowGuide(true)}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
           Guide
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      
      {currentStep === 1 && (
        <IntroPage 
          onLoadSample={handleLoadSample} 
          onFileUpload={handleFileUpload} 
        />
      )}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Diversity()}
      {currentStep === 5 && renderStep5Equity()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
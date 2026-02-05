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
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, DollarSign, PieChart,
  Users, AlertTriangle, TrendingDown, Percent,
  Scale, Gauge, ShieldCheck, ShieldAlert, CircleDollarSign,
  BadgeCheck, BadgeAlert, UserCheck, UserX, Calculator, BookOpen, BookMarked 
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ScoreDistribution {
  bin: string;
  count: number;
  default_rate: number;
  cumulative_default_rate: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  coefficient: number;
  direction: string;
}

interface RiskSegment {
  segment: string;
  score_range: string;
  count: number;
  pct: number;
  default_rate: number;
  avg_score: number;
  recommendation: string;
}

interface ModelMetrics {
  auc_roc: number;
  gini: number;
  ks_statistic: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  log_loss: number;
}

interface CreditRiskResult {
  success: boolean;
  results: {
    summary: {
      total_records: number;
      default_rate: number;
      avg_score: number;
      median_score: number;
      score_std: number;
      approved_rate: number;
      rejected_rate: number;
    };
    model_metrics: ModelMetrics;
    feature_importance: FeatureImportance[];
    score_distribution: ScoreDistribution[];
    risk_segments: RiskSegment[];
    cutoff_analysis: {
      cutoff: number;
      approval_rate: number;
      default_rate_if_approved: number;
      expected_loss_reduction: number;
    }[];
  };
  visualizations: {
    score_distribution?: string;
    roc_curve?: string;
    feature_importance?: string;
    risk_segments?: string;
    ks_chart?: string;
    calibration_curve?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    model_type: string;
    auc_roc: number;
    gini: number;
    optimal_cutoff: number;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const MODEL_TYPES = [
  { value: "logistic", label: "Logistic Regression", desc: "Interpretable, industry standard", icon: Scale },
  { value: "xgboost", label: "XGBoost", desc: "High accuracy, handles non-linearity", icon: TrendingUp },
  { value: "random_forest", label: "Random Forest", desc: "Robust, handles missing values", icon: BarChart3 },
  { value: "lightgbm", label: "LightGBM", desc: "Fast training, good for large data", icon: Activity },
];

const RISK_COLORS: { [key: string]: string } = {
  'Very Low': '#22c55e',
  'Low': '#84cc16',
  'Medium': '#f59e0b',
  'High': '#f97316',
  'Very High': '#ef4444',
};

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 2000; i++) {
    // Customer attributes
    const age = Math.floor(Math.random() * 50) + 20; // 20-70
    const income = Math.floor(Math.random() * 150000) + 20000; // 20k-170k
    const employment_years = Math.floor(Math.random() * 30); // 0-30
    const credit_history_months = Math.floor(Math.random() * 240) + 12; // 12-252 months
    const num_credit_lines = Math.floor(Math.random() * 10) + 1; // 1-10
    const credit_utilization = Math.random() * 100; // 0-100%
    const num_late_payments = Math.floor(Math.random() * 5); // 0-4
    const debt_to_income = Math.random() * 60; // 0-60%
    const loan_amount = Math.floor(Math.random() * 50000) + 5000; // 5k-55k
    const loan_term = [12, 24, 36, 48, 60][Math.floor(Math.random() * 5)];
    const has_mortgage = Math.random() < 0.4 ? 1 : 0;
    const has_auto_loan = Math.random() < 0.3 ? 1 : 0;
    const num_inquiries = Math.floor(Math.random() * 8); // 0-7
    
    // Calculate default probability based on features
    let default_prob = 0.05; // base rate
    
    // Risk factors
    if (income < 40000) default_prob += 0.08;
    if (employment_years < 2) default_prob += 0.06;
    if (credit_history_months < 36) default_prob += 0.05;
    if (credit_utilization > 70) default_prob += 0.10;
    if (num_late_payments > 0) default_prob += num_late_payments * 0.08;
    if (debt_to_income > 40) default_prob += 0.07;
    if (num_inquiries > 4) default_prob += 0.04;
    if (age < 25) default_prob += 0.03;
    
    // Protective factors
    if (income > 100000) default_prob -= 0.04;
    if (employment_years > 10) default_prob -= 0.03;
    if (has_mortgage === 1) default_prob -= 0.02;
    if (credit_history_months > 120) default_prob -= 0.03;
    
    // Add noise
    default_prob += (Math.random() - 0.5) * 0.1;
    default_prob = Math.max(0.01, Math.min(0.95, default_prob));
    
    // Determine default
    const defaulted = Math.random() < default_prob ? 1 : 0;
    
    data.push({
      customer_id: `C-${String(i).padStart(6, '0')}`,
      age,
      annual_income: income,
      employment_years,
      credit_history_months,
      num_credit_lines,
      credit_utilization: parseFloat(credit_utilization.toFixed(1)),
      num_late_payments,
      debt_to_income_ratio: parseFloat(debt_to_income.toFixed(1)),
      loan_amount,
      loan_term_months: loan_term,
      has_mortgage,
      has_auto_loan,
      num_recent_inquiries: num_inquiries,
      defaulted,
    });
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  sublabel?: string;
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, sublabel, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
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
    a.download = 'credit_risk_data.csv';
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
                {columns.slice(0, 8).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 15).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 8).map(col => (
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

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const color = RISK_COLORS[risk] || '#6b7280';
  return (
    <Badge style={{ backgroundColor: color, color: 'white' }} className="text-xs">
      {risk}
    </Badge>
  );
};

const ScoreGauge: React.FC<{ score: number; maxScore?: number }> = ({ score, maxScore = 850 }) => {
  const pct = (score / maxScore) * 100;
  const color = score >= 700 ? '#22c55e' : score >= 600 ? '#f59e0b' : '#ef4444';
  
  return (
    <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
      <div 
        className="absolute left-0 top-0 h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {score}
      </div>
    </div>
  );
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatNumber = (value: number, decimals: number = 2): string => {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(decimals);
};


const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Credit Risk Scoring Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Credit Risk Scoring?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Credit risk scoring uses machine learning to predict the probability that a borrower will default 
              on a loan. It assigns a numerical score (typically 300-850) where higher scores indicate lower risk. 
              This is fundamental to lending decisions, pricing, and portfolio management.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Model Types Explained
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Logistic Regression (Recommended for Compliance)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Linear combination of features with sigmoid transformation to get probability<br/>
                  <strong>Formula:</strong> P(default) = 1 / (1 + e^-(β₀ + β₁x₁ + β₂x₂ + ...))<br/>
                  <strong>Pros:</strong> Fully interpretable, regulatory-friendly, shows exact feature contributions<br/>
                  <strong>Cons:</strong> Assumes linear relationships, may miss complex patterns<br/>
                  <strong>Best for:</strong> Regulatory environments, when explainability is critical, baseline models
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. XGBoost (Gradient Boosting)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Ensemble of decision trees, each correcting errors of previous trees<br/>
                  <strong>Complexity:</strong> Can capture non-linear relationships and interactions automatically<br/>
                  <strong>Pros:</strong> High accuracy, handles missing values, built-in feature importance<br/>
                  <strong>Cons:</strong> Black box, harder to explain to regulators, requires more data<br/>
                  <strong>Best for:</strong> When accuracy is paramount, large datasets (1000+ records), complex credit products
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Random Forest</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Ensemble of decision trees trained on random subsets<br/>
                  <strong>Approach:</strong> Each tree votes, final prediction is majority vote (or average probability)<br/>
                  <strong>Pros:</strong> Robust to outliers, handles missing data well, good feature importance<br/>
                  <strong>Cons:</strong> Can overfit, large model size, slower prediction<br/>
                  <strong>Best for:</strong> Noisy data, when you have many correlated features, need robustness
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">4. LightGBM</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Gradient boosting with histogram-based decision trees<br/>
                  <strong>Innovation:</strong> Grows trees leaf-wise (best-first) instead of level-wise<br/>
                  <strong>Pros:</strong> Very fast training, memory efficient, handles large datasets<br/>
                  <strong>Cons:</strong> Can overfit on small data, requires careful tuning<br/>
                  <strong>Best for:</strong> Large datasets (10,000+ records), when training speed matters
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Key Metrics Explained
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">AUC-ROC (Area Under ROC Curve)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Range:</strong> 0.5 (random) to 1.0 (perfect)<br/>
                  <strong>Meaning:</strong> Probability that model ranks a random defaulter higher than a random non-defaulter<br/>
                  <strong>Interpretation:</strong> 0.5-0.6 = poor, 0.6-0.7 = fair, 0.7-0.8 = good, 0.8-0.9 = excellent, 0.9+ = outstanding<br/>
                  <strong>Industry benchmark:</strong> Consumer credit aims for 0.70+, commercial credit 0.75+
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Gini Coefficient</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> Gini = 2 × AUC - 1<br/>
                  <strong>Range:</strong> 0 (random) to 1 (perfect)<br/>
                  <strong>Meaning:</strong> Measures concentration of risk - how well model separates good from bad<br/>
                  <strong>Interpretation:</strong> below 0.2 = poor, 0.2-0.4 = fair, 0.4-0.6 = good, above 0.6 = excellent<br/>
                  <strong>Why use it:</strong> Industry standard, easier to communicate than AUC (50% Gini sounds better than 75% AUC)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">KS Statistic (Kolmogorov-Smirnov)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Maximum separation between cumulative distribution of goods and bads<br/>
                  <strong>Range:</strong> 0 to 100 (percentage)<br/>
                  <strong>Interpretation:</strong> below 20 = poor, 20-30 = fair, 30-40 = good, 40-50 = very good, above 50 = excellent<br/>
                  <strong>Visual meaning:</strong> At optimal cutoff, KS shows largest gap between good and bad cumulative curves<br/>
                  <strong>Industry use:</strong> Widely used in credit card and mortgage lending
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Precision vs Recall</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Precision:</strong> Of predicted defaults, what % actually defaulted (minimize false alarms)<br/>
                  <strong>Recall:</strong> Of actual defaults, what % did we catch (minimize misses)<br/>
                  <strong>Trade-off:</strong> High precision = few false alarms but miss some defaults. High recall = catch most defaults but many false alarms<br/>
                  <strong>F1 Score:</strong> Harmonic mean of precision and recall - balances both
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Credit Score Ranges
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Standard FICO-style scoring (300-850):</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>300-579 (Very High Risk):</strong> Likely default, multiple delinquencies, reject or require substantial collateral</li>
                <li>• <strong>580-669 (High Risk):</strong> Subprime, higher rates, manual underwriting required</li>
                <li>• <strong>670-739 (Medium Risk):</strong> Near-prime, standard approval with moderate rates</li>
                <li>• <strong>740-799 (Low Risk):</strong> Prime, favorable terms, low default probability</li>
                <li>• <strong>800-850 (Very Low Risk):</strong> Super-prime, best rates, auto-approve eligible</li>
              </ul>
              
              <p className="mt-3"><strong>Default Rate by Score Range (typical):</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• 300-579: 25-40% default rate</li>
                <li>• 580-669: 10-20% default rate</li>
                <li>• 670-739: 3-8% default rate</li>
                <li>• 740-799: 1-3% default rate</li>
                <li>• 800-850: below 1% default rate</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Feature Importance & Risk Drivers
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Common Risk Drivers (increase default probability):</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Credit utilization above 70%:</strong> Indicates financial stress</li>
                <li>• <strong>Recent late payments:</strong> Strong predictor of future default</li>
                <li>• <strong>High debt-to-income ratio (above 40%):</strong> Limited capacity to repay</li>
                <li>• <strong>Multiple recent credit inquiries:</strong> Credit seeking behavior</li>
                <li>• <strong>Short credit history (below 3 years):</strong> Unproven track record</li>
                <li>• <strong>Recent bankruptcy or foreclosure:</strong> Past financial distress</li>
              </ul>
              
              <p className="mt-3"><strong>Protective Factors (decrease default probability):</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Long employment tenure (above 5 years):</strong> Income stability</li>
                <li>• <strong>High income (above $100K):</strong> Repayment capacity</li>
                <li>• <strong>Low credit utilization (below 30%):</strong> Financial prudence</li>
                <li>• <strong>Diverse credit mix:</strong> Experience managing different credit types</li>
                <li>• <strong>Homeownership:</strong> Stability and collateral</li>
                <li>• <strong>No derogatory marks:</strong> Clean payment history</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Setting Credit Cutoffs
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Optimal Cutoff Selection:</strong></p>
              <p>The cutoff score determines who gets approved. Consider:</p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Risk appetite:</strong> Conservative lenders use higher cutoffs (lower approval rate, lower default rate)</li>
                <li>• <strong>Business goals:</strong> Growth mode = lower cutoff, risk mitigation = higher cutoff</li>
                <li>• <strong>Economic conditions:</strong> Recession = raise cutoff, expansion = lower cutoff</li>
                <li>• <strong>Portfolio composition:</strong> Balance overall portfolio risk</li>
              </ul>
              
              <p className="mt-3"><strong>Cutoff Strategies:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Maximize F1:</strong> Balance precision and recall</li>
                <li>• <strong>Maximize profit:</strong> Account for revenue per approval and cost per default</li>
                <li>• <strong>Target approval rate:</strong> Set cutoff to achieve desired approval percentage</li>
                <li>• <strong>Target default rate:</strong> Set cutoff to keep defaults below threshold</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls & Solutions
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Class Imbalance</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Defaults are rare (typically 2-10%), model predicts everyone as non-default<br/>
                  <strong>Solutions:</strong> Use SMOTE/oversampling, adjust class weights, use stratified sampling, focus on AUC not accuracy
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Data Leakage</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Including features that wouldn't be known at prediction time<br/>
                  <strong>Solutions:</strong> Remove post-default features, use only data available at application time, careful train/test split by time
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Model Drift</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Model performance degrades over time as population changes<br/>
                  <strong>Solutions:</strong> Monitor PSI (Population Stability Index), retrain quarterly, track actual vs predicted default rates
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Regulatory Compliance</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Black box models hard to explain for adverse action notices<br/>
                  <strong>Solutions:</strong> Use logistic regression or provide SHAP values, document adverse action reasons, test for disparate impact
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
                <p className="font-medium text-sm text-primary mb-1">Model Development</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use at least 12 months of data</li>
                  <li>• Define default clearly (30, 60, or 90 days past due)</li>
                  <li>• Exclude indeterminate accounts (too new)</li>
                  <li>• Use stratified train/test split</li>
                  <li>• Cross-validate with time-based folds</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Feature Engineering</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Create utilization ratios (debt/limit)</li>
                  <li>• Bin continuous variables for stability</li>
                  <li>• Include payment behavior trends</li>
                  <li>• Add macroeconomic indicators if available</li>
                  <li>• Test interaction terms</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Out-of-time validation (test on future data)</li>
                  <li>• Monitor actual vs predicted rates monthly</li>
                  <li>• Calculate PSI for feature stability</li>
                  <li>• Perform stress tests (recession scenario)</li>
                  <li>• Document model limitations</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Deployment</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with shadow mode (score but don't act)</li>
                  <li>• Implement champion/challenger framework</li>
                  <li>• Set up automated monitoring dashboards</li>
                  <li>• Define model refresh triggers</li>
                  <li>• Maintain audit trail of decisions</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Regulatory Considerations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Fair Lending Laws:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Equal Credit Opportunity Act (ECOA):</strong> Cannot discriminate based on race, gender, age, etc.</li>
                <li>• <strong>Fair Credit Reporting Act (FCRA):</strong> Must provide adverse action notices with specific reasons</li>
                <li>• <strong>Disparate Impact:</strong> Even neutral factors may be illegal if they disproportionately affect protected classes</li>
              </ul>
              
              <p className="mt-3"><strong>Model Governance:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Document model development process</li>
                <li>• Perform annual model validation by independent party</li>
                <li>• Test for disparate impact across protected classes</li>
                <li>• Maintain override policies and documentation</li>
                <li>• Have explainability for all model decisions</li>
              </ul>
              
              <p className="mt-3"><strong>Adverse Action Reasons:</strong> Must provide specific, actionable reasons for denial:</p>
              <ul className="ml-4 space-y-1">
                <li>• "Too many recent credit inquiries" (not just "low score")</li>
                <li>• "High credit utilization ratio"</li>
                <li>• "Short credit history"</li>
                <li>• "Recent delinquency on credit account"</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Credit scoring is highly regulated. This tool is for 
              educational and analytical purposes. For production use, ensure compliance with FCRA, ECOA, and state laws. 
              Consult legal counsel and perform disparate impact testing. Always provide clear adverse action reasons and 
              maintain comprehensive model documentation for regulatory review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  model: string;
  setModel: (model: string) => void;
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ model, setModel, onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Credit Risk Scoring</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Build credit scoring models to predict default probability and segment customers by risk level.
          Supports Logistic Regression, XGBoost, Random Forest, and LightGBM.
        </p>
      </div>
      
      {/* ❌ Model Selection 카드 삭제 */}
      
      {/* 3개 핵심 카드 추가 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Credit Scoring</p>
              <p className="text-xs text-muted-foreground">300-850 score range</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Risk Segmentation</p>
              <p className="text-xs text-muted-foreground">5 risk levels</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Model Performance</p>
              <p className="text-xs text-muted-foreground">AUC, Gini, KS metrics</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Credit Risk Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Get</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Credit scores (300-850) per customer",
                  "Risk segmentation (Very Low to Very High)",
                  "Feature importance analysis",
                  "Model performance metrics (AUC, Gini, KS)",
                  "Optimal cutoff recommendations",
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
                  "Target column (0/1 default indicator)",
                  "Customer feature columns",
                  "At least 200 records",
                  "Minimum 3 features",
                  "Binary classification target",
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
export default function CreditRiskScoringPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CreditRiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  

  // Configuration
  const [model, setModel] = useState<string>("logistic");
  const [targetCol, setTargetCol] = useState<string>("");
  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [testSize, setTestSize] = useState<number>(0.2);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setTargetCol("defaulted");
    setFeatureCols([
      "age", "annual_income", "employment_years", "credit_history_months",
      "num_credit_lines", "credit_utilization", "num_late_payments",
      "debt_to_income_ratio", "loan_amount", "loan_term_months",
      "has_mortgage", "has_auto_loan", "num_recent_inquiries"
    ]);
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

  const toggleFeature = (col: string) => {
    setFeatureCols(prev => 
      prev.includes(col) 
        ? prev.filter(c => c !== col)
        : [...prev, col]
    );
  };

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const targetValues = new Set(data.map(d => d[targetCol]));
    const isBinary = targetValues.size === 2 && 
      (targetValues.has(0) || targetValues.has('0')) && 
      (targetValues.has(1) || targetValues.has('1'));
    
    return [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} records loaded` : "No data"
      },
      {
        name: "Target Column",
        passed: !!targetCol && isBinary,
        message: targetCol 
          ? (isBinary ? `Using: ${targetCol} (binary)` : "Target must be binary (0/1)")
          : "Select target column"
      },
      {
        name: "Feature Columns",
        passed: featureCols.length >= 3,
        message: featureCols.length >= 3 
          ? `${featureCols.length} features selected` 
          : `Min 3 features required (current: ${featureCols.length})`
      },
      {
        name: "Sample Size",
        passed: data.length >= 200,
        message: data.length >= 200 
          ? `Sufficient (${data.length})` 
          : `Insufficient (min 200 recommended, current: ${data.length})`
      },
      {
        name: "Default Rate",
        passed: true,
        message: (() => {
          if (!targetCol) return "Select target first";
          const defaults = data.filter(d => d[targetCol] === 1 || d[targetCol] === '1').length;
          const rate = defaults / data.length;
          return `${(rate * 100).toFixed(1)}% default rate (${defaults} defaults)`;
        })()
      },
    ];
  }, [data, targetCol, featureCols]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        target_col: targetCol,
        feature_cols: featureCols,
        model_type: model,
        test_size: testSize,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/credit-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: CreditRiskResult = await res.json();
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
    const { feature_importance, risk_segments } = results.results;
    
    const rows: string[] = ['Feature,Importance,Direction'];
    feature_importance.forEach(f => {
      rows.push(`${f.feature},${f.importance.toFixed(4)},${f.direction}`);
    });
    rows.push('');
    rows.push('Segment,Score Range,Count,Default Rate');
    risk_segments.forEach(s => {
      rows.push(`${s.segment},${s.score_range},${s.count},${(s.default_rate * 100).toFixed(1)}%`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'credit_risk_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `credit_risk_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => {
    const availableForFeatures = columns.filter(c => c !== targetCol && c !== 'customer_id');
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Model Configuration
          </CardTitle>
          <CardDescription>Configure credit scoring model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 👇 Model Type 선택 추가 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Model Type
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              {MODEL_TYPES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setModel(m.value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    model === m.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className="w-5 h-5 text-primary" />
                    <p className="font-medium text-sm">{m.label}</p>
                    {m.value === 'logistic' && (
                      <Badge variant="secondary" className="text-xs">Standard</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />
          
          {/* Feature Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Feature Selection (minimum 3)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableForFeatures.map(col => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`feature-${col}`}
                    checked={featureCols.includes(col)}
                    onCheckedChange={() => toggleFeature(col)}
                  />
                  <label htmlFor={`feature-${col}`} className="text-sm cursor-pointer truncate">{col}</label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {featureCols.length > 0 ? featureCols.join(', ') : 'None'}
            </p>
          </div>
          
          <Separator />
          
          
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
    const canRun = checks.slice(0, 4).every(c => c.passed);
    
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
                  {`Model: ${MODEL_TYPES.find(m => m.value === model)?.label} • `}
                  {`Features: ${featureCols.length} • `}
                  {`Test Size: ${(testSize * 100).toFixed(0)}%`}
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
                  Training Model...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Build Credit Model
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
    const metrics = r.model_metrics;
    
    const finding = `Model AUC-ROC: ${metrics.auc_roc.toFixed(3)} (Gini: ${metrics.gini.toFixed(3)}). ` +
      `Current default rate is ${formatPercent(r.summary.default_rate)}. ` +
      `Optimal cutoff at score ${summary.optimal_cutoff} balances approval rate and risk.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Credit Risk Model Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={metrics.auc_roc.toFixed(3)} 
              label="AUC-ROC" 
              sublabel={metrics.auc_roc >= 0.7 ? "Good" : "Fair"}
              icon={Target}
              highlight={metrics.auc_roc >= 0.7}
            />
            <MetricCard 
              value={metrics.gini.toFixed(3)} 
              label="Gini Coefficient" 
              sublabel={metrics.gini >= 0.4 ? "Good" : "Fair"}
              icon={Scale}
              highlight={metrics.gini >= 0.4}
            />
            <MetricCard 
              value={metrics.ks_statistic.toFixed(3)} 
              label="KS Statistic" 
              sublabel={metrics.ks_statistic >= 0.3 ? "Good" : "Fair"}
              icon={TrendingUp}
            />
            <MetricCard 
              value={formatPercent(r.summary.default_rate)} 
              label="Default Rate" 
              icon={AlertTriangle}
              negative={r.summary.default_rate > 0.15}
            />
          </div>
          
          {/* Model Performance */}
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Classification Metrics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold">{formatPercent(metrics.accuracy)}</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatPercent(metrics.precision)}</p>
                <p className="text-xs text-muted-foreground">Precision</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatPercent(metrics.recall)}</p>
                <p className="text-xs text-muted-foreground">Recall</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatPercent(metrics.f1_score)}</p>
                <p className="text-xs text-muted-foreground">F1 Score</p>
              </div>
            </div>
          </div>
          
          {/* Risk Segments */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Risk Segments
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead>Score Range</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                  <TableHead className="text-right">Default Rate</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.risk_segments.map((seg) => (
                  <TableRow key={seg.segment}>
                    <TableCell><RiskBadge risk={seg.segment} /></TableCell>
                    <TableCell className="font-mono text-sm">{seg.score_range}</TableCell>
                    <TableCell className="text-right">{seg.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatPercent(seg.pct)}</TableCell>
                    <TableCell className="text-right">
                      <span className={seg.default_rate > 0.15 ? 'text-destructive' : seg.default_rate > 0.08 ? 'text-amber-500' : 'text-green-500'}>
                        {formatPercent(seg.default_rate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{seg.recommendation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Feature Importance */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Top Feature Importance
            </h4>
            <div className="space-y-2">
              {r.feature_importance.slice(0, 8).map((f) => (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="text-sm w-40 truncate">{f.feature}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${f.direction === 'positive' ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${f.importance * 100}%` }}
                    />
                  </div>
                  <span className="text-xs w-16 text-right">{(f.importance * 100).toFixed(1)}%</span>
                  <Badge variant="outline" className={`text-xs ${f.direction === 'positive' ? 'text-red-500' : 'text-green-500'}`}>
                    {f.direction === 'positive' ? '↑ Risk' : '↓ Risk'}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Red = increases default risk, Green = decreases default risk
            </p>
          </div>
          
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
            title="Result Interpretation"
            detail={`Credit Risk Scoring Model Results using ${MODEL_TYPES.find(m => m.value === model)?.label}.

■ Model Performance

• AUC-ROC: ${metrics.auc_roc.toFixed(3)} ${metrics.auc_roc >= 0.7 ? '(Good discrimination)' : '(Fair discrimination)'}
• Gini: ${metrics.gini.toFixed(3)} ${metrics.gini >= 0.4 ? '(Good)' : '(Consider more features)'}
• KS Statistic: ${metrics.ks_statistic.toFixed(3)} - Maximum separation between good/bad customers

■ Portfolio Summary

• Total Records: ${r.summary.total_records.toLocaleString()}
• Default Rate: ${formatPercent(r.summary.default_rate)}
• Average Score: ${r.summary.avg_score.toFixed(0)}
• Score Std Dev: ${r.summary.score_std.toFixed(0)}

■ Decision Cutoff

• Optimal Cutoff: ${summary.optimal_cutoff}
• At this cutoff, you can balance approval rate with acceptable default risk

■ Recommendations

• Use feature importance to understand key risk drivers
• Consider segment-specific policies based on risk levels
• Monitor model performance over time for drift`}
          />
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Understanding Credit Scoring
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

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding Credit Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Credit scoring models predict the probability of default based on customer attributes. Scores typically range from 300-850, with higher scores indicating lower risk." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Core Concepts</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { 
                  title: "Credit Score", 
                  content: "A numerical representation of creditworthiness (300-850). Based on probability of default converted to a score scale.",
                  icon: Gauge
                },
                { 
                  title: "AUC-ROC", 
                  content: "Area Under the ROC Curve. Measures model's ability to distinguish defaulters from non-defaulters. 0.5 = random, 1.0 = perfect.",
                  icon: Target
                },
                { 
                  title: "Gini Coefficient", 
                  content: "2*AUC - 1. Measures concentration of defaults across score ranges. Higher = better separation. >0.4 is good.",
                  icon: Scale
                },
                { 
                  title: "KS Statistic", 
                  content: "Kolmogorov-Smirnov statistic. Maximum difference between cumulative distribution of goods and bads. >0.3 is good.",
                  icon: TrendingUp
                },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Score Interpretation */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Score Interpretation Guide</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Score Range</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Typical Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { range: "750-850", risk: "Very Low", action: "Auto-approve, best rates" },
                  { range: "700-749", risk: "Low", action: "Approve with standard rates" },
                  { range: "650-699", risk: "Medium", action: "Manual review, higher rates" },
                  { range: "550-649", risk: "High", action: "Decline or require collateral" },
                  { range: "300-549", risk: "Very High", action: "Decline" },
                ].map((row) => (
                  <TableRow key={row.range}>
                    <TableCell className="font-mono">{row.range}</TableCell>
                    <TableCell><RiskBadge risk={row.risk} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DetailParagraph
            title="Implementation Guide"
            detail={`■ Model Selection

• Logistic Regression: Interpretable, regulatory-friendly, good baseline
• XGBoost/LightGBM: Higher accuracy, handles non-linearity
• Random Forest: Robust to outliers, handles missing values

■ Feature Engineering Tips

• Create interaction terms (e.g., debt-to-income × utilization)
• Bin continuous variables for better interpretation
• Consider time-based features (tenure, account age)
• Handle missing values appropriately

■ Regulatory Considerations

• Ensure model is explainable (feature importance)
• Document adverse action reasons
• Monitor for discriminatory impact
• Validate model regularly

■ Monitoring

• Track Population Stability Index (PSI)
• Monitor actual vs predicted default rates
• Re-train periodically as data distribution shifts
• Alert on significant performance degradation`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Results</Button>
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
    const metrics = r.model_metrics;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Credit Risk Scoring Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {MODEL_TYPES.find(m => m.value === model)?.label} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={metrics.auc_roc.toFixed(3)} label="AUC-ROC" />
              <MetricCard value={metrics.gini.toFixed(3)} label="Gini" />
              <MetricCard value={formatPercent(r.summary.default_rate)} label="Default Rate" />
              <MetricCard value={summary.optimal_cutoff} label="Optimal Cutoff" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Model achieves AUC-ROC of {metrics.auc_roc.toFixed(3)} with Gini coefficient of {metrics.gini.toFixed(3)}.
              Portfolio has {formatPercent(r.summary.default_rate)} default rate across {r.summary.total_records.toLocaleString()} records.
              Recommended approval cutoff at score {summary.optimal_cutoff}.
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
                  {visualizations.score_distribution && <TabsTrigger value="score_distribution" className="text-xs">Score Distribution</TabsTrigger>}
                  {visualizations.roc_curve && <TabsTrigger value="roc_curve" className="text-xs">ROC Curve</TabsTrigger>}
                  {visualizations.feature_importance && <TabsTrigger value="feature_importance" className="text-xs">Feature Importance</TabsTrigger>}
                  {visualizations.ks_chart && <TabsTrigger value="ks_chart" className="text-xs">KS Chart</TabsTrigger>}
                  {visualizations.risk_segments && <TabsTrigger value="risk_segments" className="text-xs">Risk Segments</TabsTrigger>}
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
        
        {/* Risk Segments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk Segment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead>Score Range</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Default Rate</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.risk_segments.map((seg) => (
                  <TableRow key={seg.segment}>
                    <TableCell><RiskBadge risk={seg.segment} /></TableCell>
                    <TableCell className="font-mono text-sm">{seg.score_range}</TableCell>
                    <TableCell className="text-right">{seg.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatPercent(seg.default_rate)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{seg.recommendation}</TableCell>
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
                CSV (Model Results)
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
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />  {/* 👈 이 줄 추가 */}
      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep > 1 && data.length > 0 && (
        <DataPreview data={data} columns={columns} />
      )}
      
      {currentStep === 1 && (
        <IntroPage 
          model={model}
          setModel={setModel}
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

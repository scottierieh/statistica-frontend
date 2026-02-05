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
import { Slider } from "@/components/ui/slider";
import {
  Building2, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, Download,
  TrendingUp, Settings, Activity, AlertTriangle, ChevronRight, Target,
  BarChart3, Calendar, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Percent,
  Users, Heart, Home, Briefcase, GraduationCap, Scale, BookOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============================================================
// Statistical Terms Glossary for Welfare Policy Impact Analysis
// ============================================================
const welfarePolicyTermDefinitions: Record<string, string> = {
  "Causal Impact": "The true effect of a policy on outcomes, isolated from other factors. Unlike correlation, causal impact implies that the policy directly caused the change in outcomes.",
  "Treatment Group": "The group of individuals or units that received the policy intervention (e.g., welfare benefits). Comparing their outcomes to a control group helps estimate policy effects.",
  "Control Group": "The comparison group that did not receive the policy intervention. Ideally similar to the treatment group in all ways except policy exposure.",
  "Average Treatment Effect (ATE)": "The average difference in outcomes between treatment and control groups, representing the mean causal effect of the policy across all units.",
  "Difference-in-Differences (DiD)": "A method comparing outcome changes over time between treatment and control groups. Removes time-invariant confounders by differencing twice: (Treat_post - Treat_pre) - (Control_post - Control_pre).",
  "Propensity Score Matching (PSM)": "A method that matches treated and untreated units based on their probability of receiving treatment, creating comparable groups based on observed characteristics.",
  "Regression Discontinuity (RDD)": "An approach exploiting sharp eligibility cutoffs (e.g., income threshold) to estimate effects by comparing units just above and below the threshold.",
  "Instrumental Variables (IV)": "A technique using an external variable that affects treatment assignment but not outcomes directly, helping identify causal effects when selection bias exists.",
  "P-Value": "The probability of observing results at least as extreme as the actual results, assuming no true effect. P < 0.05 typically indicates statistical significance.",
  "Statistical Significance": "An effect is statistically significant (typically p < 0.05) if unlikely to have occurred by chance alone. Does not necessarily mean the effect is practically important.",
  "Confidence Interval (CI)": "A range of values likely to contain the true effect size. A 95% CI means if we repeated the study 100 times, ~95 intervals would contain the true value.",
  "Effect Size": "The magnitude of the policy impact, often expressed as percentage change or standardized units. Helps assess practical significance beyond statistical significance.",
  "Cost-Effectiveness": "The ratio of costs to outcomes, measuring how efficiently resources are used. Lower cost per unit of outcome improvement indicates better value.",
  "Benefit-Cost Ratio (BCR)": "Total benefits divided by total costs. BCR > 1 indicates benefits exceed costs; BCR < 1 suggests costs outweigh measurable benefits.",
  "Heterogeneous Effects": "When policy impacts vary across different subgroups (e.g., by age, region, income level). Understanding heterogeneity helps target policies effectively.",
  "Selection Bias": "Systematic differences between treatment and control groups that arise from non-random assignment. Can lead to biased effect estimates if not addressed.",
  "Parallel Trends Assumption": "A key assumption for DiD: treatment and control groups would have followed similar outcome trends in absence of the policy. Violations bias estimates.",
  "Counterfactual": "The hypothetical outcome for treated units had they not received treatment. Since we cannot observe counterfactuals directly, we estimate them using control groups.",
  "Spillover Effects": "When the policy affects not only direct beneficiaries but also non-beneficiaries nearby (e.g., through local economic effects or behavioral changes).",
  "Intent-to-Treat (ITT)": "Analysis comparing those assigned to treatment vs. control, regardless of actual compliance. Provides unbiased estimate of policy assignment effect.",
  "Covariate": "A variable that may influence both treatment assignment and outcomes. Controlling for covariates reduces confounding bias.",
  "Baseline Characteristics": "Pre-treatment attributes of study units. Balance in baseline characteristics between groups strengthens causal inference.",
  "External Validity": "Whether findings generalize beyond the study context to other populations, settings, or time periods. Limited by specific study conditions.",
  "Attrition": "Loss of study participants over time. Differential attrition between groups can bias effect estimates.",
  "Welfare Policy": "Government programs providing social assistance to individuals or families, including cash transfers, food assistance, housing support, healthcare, and employment services."
};

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface OutcomeMetric {
  baseline_mean: number;
  treatment_mean: number;
  effect_size: number;
  percent_change: number;
  p_value: number;
  ci_lower: number;
  ci_upper: number;
  significant: boolean;
}

interface SubgroupEffect {
  subgroup: string;
  n_control: number;
  n_treatment: number;
  effect_size: number;
  percent_change: number;
  p_value: number;
  significant: boolean;
}

interface CostEffectiveness {
  total_cost: number;
  total_beneficiaries: number;
  cost_per_beneficiary: number;
  outcome_improvement: number;
  cost_per_unit_improvement: number;
  benefit_cost_ratio: number;
}

interface WelfareResult {
  success: boolean;
  impact_analysis: {
    method: string;
    n_treatment: number;
    n_control: number;
    outcomes: { [key: string]: OutcomeMetric };
    overall_effect: number;
    model_quality: { r2: number; balance_score: number; };
  };
  subgroup_analysis: { [key: string]: SubgroupEffect[] };
  cost_effectiveness: CostEffectiveness;
  temporal_effects: {
    periods: string[];
    effects: number[];
    cumulative_effects: number[];
  };
  visualizations: {
    impact_chart?: string;
    subgroup_chart?: string;
    temporal_chart?: string;
    distribution_chart?: string;
    cost_benefit_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    policy_name: string;
    evaluation_method: string;
    n_total: number;
    n_treatment: number;
    n_control: number;
    primary_outcome: string;
    main_effect: number;
    main_effect_significant: boolean;
    cost_per_beneficiary: number;
    benefit_cost_ratio: number;
  };
}

const EVALUATION_METHODS = [
  { value: "did", label: "Difference-in-Differences", desc: "Compare changes over time between groups" },
  { value: "psm", label: "Propensity Score Matching", desc: "Match similar units across groups" },
  { value: "rdd", label: "Regression Discontinuity", desc: "Exploit eligibility cutoffs" },
  { value: "iv", label: "Instrumental Variables", desc: "Use exogenous variation" },
];

const POLICY_DOMAINS = [
  { value: "cash_transfer", label: "Cash Transfer", desc: "Direct monetary assistance" },
  { value: "employment", label: "Employment Program", desc: "Job training & placement" },
  { value: "housing", label: "Housing Assistance", desc: "Housing subsidies & support" },
  { value: "healthcare", label: "Healthcare Access", desc: "Medical coverage expansion" },
  { value: "education", label: "Education Support", desc: "Scholarships & training" },
  { value: "nutrition", label: "Nutrition Program", desc: "Food assistance & SNAP" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const regions = ["Region_A", "Region_B", "Region_C", "Region_D", "Region_E"];
  const ageGroups = ["18-25", "26-35", "36-45", "46-55", "56-65"];
  const educationLevels = ["high_school", "some_college", "bachelors", "graduate"];
  
  for (let i = 0; i < 2000; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const ageGroup = ageGroups[Math.floor(Math.random() * ageGroups.length)];
    const education = educationLevels[Math.floor(Math.random() * educationLevels.length)];
    
    // Treatment assignment (policy rollout)
    const treatmentProb = region === "Region_A" || region === "Region_B" ? 0.7 : 0.3;
    const treatment = Math.random() < treatmentProb ? 1 : 0;
    
    // Baseline characteristics
    const baseIncome = 25000 + Math.random() * 30000;
    const baseEmployment = Math.random() < 0.6 ? 1 : 0;
    const householdSize = Math.floor(1 + Math.random() * 5);
    const priorBenefits = Math.random() < 0.4 ? 1 : 0;
    
    // Pre-period outcomes
    const preIncome = baseIncome * (0.9 + Math.random() * 0.2);
    const preEmployment = baseEmployment;
    const preWellbeing = 40 + Math.random() * 30;
    
    // Treatment effects (heterogeneous)
    const incomeEffect = treatment * (3000 + Math.random() * 2000) * (education === "high_school" ? 1.2 : 1);
    const employmentEffect = treatment * (Math.random() < 0.15 ? 1 : 0);
    const wellbeingEffect = treatment * (5 + Math.random() * 10);
    
    // Post-period outcomes
    const postIncome = preIncome + incomeEffect + (Math.random() - 0.5) * 5000;
    const postEmployment = Math.min(1, preEmployment + employmentEffect);
    const postWellbeing = Math.min(100, preWellbeing + wellbeingEffect + (Math.random() - 0.5) * 10);
    
    // Time periods
    const periods = ["2022-Q1", "2022-Q2", "2022-Q3", "2022-Q4", "2023-Q1", "2023-Q2"];
    const period = periods[Math.floor(Math.random() * periods.length)];
    const postPolicy = ["2023-Q1", "2023-Q2"].includes(period) ? 1 : 0;
    
    data.push({
      id: i + 1,
      region,
      age_group: ageGroup,
      education,
      household_size: householdSize,
      treatment,
      period,
      post_policy: postPolicy,
      prior_benefits: priorBenefits,
      pre_income: Math.round(preIncome),
      post_income: Math.round(postIncome),
      pre_employment: preEmployment,
      post_employment: postEmployment,
      pre_wellbeing: parseFloat(preWellbeing.toFixed(1)),
      post_wellbeing: parseFloat(postWellbeing.toFixed(1)),
      benefit_amount: treatment ? Math.round(500 + Math.random() * 500) : 0,
    });
  }
  return data;
};

// ============================================================
// Reusable UI Components (Clean Design - Same as MMM)
// ============================================================

// Glossary Modal Component
const GlossaryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Welfare Policy Impact Analysis Glossary
          </DialogTitle>
          <DialogDescription>
            Definitions of statistical and policy evaluation terms
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {Object.entries(welfarePolicyTermDefinitions).map(([term, definition]) => (
              <div key={term} className="border-b pb-3">
                <h4 className="font-semibold">{term}</h4>
                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const MetricCard: React.FC<{ value: string | number; label: string; icon?: React.FC<{ className?: string }>; highlight?: boolean; warning?: boolean }> = ({ value, label, icon: Icon, highlight, warning }) => (
  <div className={`text-center p-4 rounded-lg border ${warning ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${warning ? 'text-destructive' : highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${warning ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string; status?: "positive" | "warning" | "neutral" }> = ({ finding, status = "neutral" }) => (
  <div className={`border rounded-lg p-4 mb-6 ${status === "positive" ? "bg-primary/5 border-primary/20" : status === "warning" ? "bg-destructive/5 border-destructive/20" : "bg-muted/10 border-border"}`}>
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
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} observations</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader><TableRow>{columns.slice(0, 8).map(col => <TableHead key={col} className="text-xs">{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 8).map((row, i) => <TableRow key={i}>{columns.slice(0, 8).map(col => <TableCell key={col} className="text-xs py-1.5">{row[col] !== null ? String(row[col]) : '-'}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
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
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
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

const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Building2 className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Welfare Policy Impact Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Evaluate the causal effects of welfare policies on beneficiary outcomes using rigorous quasi-experimental methods.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Scale, title: "Causal Impact", desc: "Estimate true policy effects" },
          { icon: Users, title: "Subgroup Analysis", desc: "Heterogeneous effects by demographics" },
          { icon: DollarSign, title: "Cost-Effectiveness", desc: "Benefit-cost ratio analysis" },
        ].map((item) => (
          <div key={item.title} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><item.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use This Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Treatment/control group indicator", "Pre and post outcome measures", "Demographic/subgroup variables", "At least 500 observations recommended"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Average treatment effect (ATE)", "Subgroup-specific effects", "Statistical significance & confidence intervals", "Cost-effectiveness metrics"].map((res) => (
                  <li key={res} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}</li>
                ))}
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

// ============================================================
// Main Component
// ============================================================

export default function WelfarePolicyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<WelfareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
  
  // Configuration state
  const [treatmentCol, setTreatmentCol] = useState<string>("");
  const [outcomePreCols, setOutcomePreCols] = useState<string[]>([]);
  const [outcomePostCols, setOutcomePostCols] = useState<string[]>([]);
  const [subgroupCols, setSubgroupCols] = useState<string[]>([]);
  const [covariateCols, setCovariateCols] = useState<string[]>([]);
  const [costCol, setCostCol] = useState<string>("");
  const [periodCol, setPeriodCol] = useState<string>("");
  const [evaluationMethod, setEvaluationMethod] = useState<string>("did");
  const [policyDomain, setPolicyDomain] = useState<string>("cash_transfer");
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);
  const [policyName, setPolicyName] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setTreatmentCol("treatment");
    setOutcomePreCols(["pre_income", "pre_employment", "pre_wellbeing"]);
    setOutcomePostCols(["post_income", "post_employment", "post_wellbeing"]);
    setSubgroupCols(["region", "age_group", "education"]);
    setCovariateCols(["household_size", "prior_benefits"]);
    setCostCol("benefit_amount");
    setPeriodCol("period");
    setPolicyName("Universal Basic Income Pilot");
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

  const toggleOutcomePre = (col: string) => setOutcomePreCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const toggleOutcomePost = (col: string) => setOutcomePostCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const toggleSubgroup = (col: string) => setSubgroupCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const toggleCovariate = (col: string) => setCovariateCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const numericColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === "number" || !isNaN(Number(sample));
  });

  const categoricalColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === "string" && isNaN(Number(sample));
  });

  const getValidationChecks = useCallback((): ValidationCheck[] => [
    { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} observations loaded` : "No data loaded" },
    { name: "Treatment Variable", passed: !!treatmentCol, message: treatmentCol ? `Using: ${treatmentCol}` : "Select treatment indicator" },
    { name: "Outcome Variables", passed: outcomePostCols.length >= 1, message: outcomePostCols.length >= 1 ? `${outcomePostCols.length} outcomes selected` : "Select at least 1 outcome" },
    { name: "Subgroup Variables", passed: subgroupCols.length >= 1, message: subgroupCols.length >= 1 ? `${subgroupCols.length} subgroups selected` : "Select at least 1 subgroup" },
    { name: "Sufficient Sample", passed: data.length >= 200, message: data.length >= 500 ? `${data.length} obs (excellent)` : data.length >= 200 ? `${data.length} obs (acceptable)` : `Only ${data.length} obs (need ≥200)` },
  ], [data, treatmentCol, outcomePostCols, subgroupCols]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data,
        treatment_col: treatmentCol,
        outcome_pre_cols: outcomePreCols.length > 0 ? outcomePreCols : null,
        outcome_post_cols: outcomePostCols,
        subgroup_cols: subgroupCols,
        covariate_cols: covariateCols.length > 0 ? covariateCols : null,
        cost_col: costCol || null,
        period_col: periodCol || null,
        evaluation_method: evaluationMethod,
        policy_domain: policyDomain,
        confidence_level: confidenceLevel,
        policy_name: policyName || "Welfare Policy",
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/welfare-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      const result: WelfareResult = await res.json();
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
    const outcomes = results.impact_analysis.outcomes;
    const headers = "Outcome,Baseline,Treatment,Effect,Percent Change,P-Value,Significant\n";
    const rows = Object.entries(outcomes).map(([name, m]) => 
      `${name},${m.baseline_mean.toFixed(2)},${m.treatment_mean.toFixed(2)},${m.effect_size.toFixed(2)},${m.percent_change.toFixed(1)}%,${m.p_value.toFixed(4)},${m.significant}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "welfare_policy_results.csv";
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `welfare_${chartKey}.png`;
    a.click();
  };

  // ============================================================
  // Step 2: Configuration
  // ============================================================
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle>
        <CardDescription>Set up welfare policy impact evaluation parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Policy Info */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />Policy Information</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Policy Name</Label>
              <Input value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="e.g., Universal Basic Income Pilot" />
            </div>
            <div className="space-y-2">
              <Label>Policy Domain</Label>
              <Select value={policyDomain} onValueChange={setPolicyDomain}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{POLICY_DOMAINS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Treatment Variable */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Treatment Variable *</h4>
          <div className="space-y-2">
            <Label>Treatment/Control Indicator (0/1)</Label>
            <Select value={treatmentCol} onValueChange={setTreatmentCol}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{numericColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator />
        
        {/* Outcome Variables */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Outcome Variables *</h4>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Pre-Policy Outcomes (Optional, for DiD)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {numericColumns.filter(c => c !== treatmentCol).map((col) => (
                  <div key={col} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${outcomePreCols.includes(col) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => toggleOutcomePre(col)}>
                    <Checkbox checked={outcomePreCols.includes(col)} />
                    <span className="text-sm font-medium truncate">{col}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Post-Policy Outcomes *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {numericColumns.filter(c => c !== treatmentCol && !outcomePreCols.includes(c)).map((col) => (
                  <div key={col} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${outcomePostCols.includes(col) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => toggleOutcomePost(col)}>
                    <Checkbox checked={outcomePostCols.includes(col)} />
                    <span className="text-sm font-medium truncate">{col}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Subgroup Variables */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Subgroup Variables *</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categoricalColumns.map((col) => (
              <div key={col} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${subgroupCols.includes(col) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => toggleSubgroup(col)}>
                <Checkbox checked={subgroupCols.includes(col)} />
                <span className="text-sm font-medium truncate">{col}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Covariates */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Control Variables (Optional)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {numericColumns.filter(c => c !== treatmentCol && !outcomePreCols.includes(c) && !outcomePostCols.includes(c)).map((col) => (
              <div key={col} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${covariateCols.includes(col) ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => toggleCovariate(col)}>
                <Checkbox checked={covariateCols.includes(col)} />
                <span className="text-sm truncate">{col}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Method Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Scale className="w-4 h-4 text-primary" />Evaluation Method</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Evaluation Method</Label>
                <Select value={evaluationMethod} onValueChange={setEvaluationMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVALUATION_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{EVALUATION_METHODS.find(m => m.value === evaluationMethod)?.desc}</p>
              </div>
              <div className="space-y-2">
                <Label>Cost Variable (for Cost-Effectiveness)</Label>
                <Select value={costCol} onValueChange={setCostCol}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{numericColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Confidence Level: {(confidenceLevel * 100).toFixed(0)}%</Label>
                <Slider value={[confidenceLevel]} onValueChange={([val]) => setConfidenceLevel(val)} min={0.9} max={0.99} step={0.01} />
              </div>
              <div className="space-y-2">
                <Label>Time Period Variable (Optional)</Label>
                <Select value={periodCol} onValueChange={setPeriodCol}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================
  // Step 3: Validation
  // ============================================================
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div><p className="font-medium text-sm">{check.name}</p><p className="text-xs text-muted-foreground">{check.message}</p></div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">{check.passed ? "Pass" : "Warning"}</Badge>
              </div>
            ))}
          </div>
          {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-sm text-destructive">{error}</p></div>}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================
  // Step 4: Summary
  // ============================================================
  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, impact_analysis, cost_effectiveness } = results;
    const mainOutcome = Object.entries(impact_analysis.outcomes)[0];
    const finding = `${summary.policy_name}: ${summary.main_effect_significant ? 'Significant' : 'No significant'} impact detected. ${mainOutcome?.[0]}: ${mainOutcome?.[1].percent_change > 0 ? '+' : ''}${mainOutcome?.[1].percent_change.toFixed(1)}% change.`;
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status={summary.main_effect_significant ? "positive" : "neutral"} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.n_treatment.toLocaleString()} label="Treatment Group" icon={Users} highlight />
            <MetricCard value={summary.n_control.toLocaleString()} label="Control Group" icon={Users} />
            <MetricCard value={`${summary.main_effect > 0 ? '+' : ''}${summary.main_effect.toFixed(1)}%`} label="Main Effect" icon={TrendingUp} highlight={summary.main_effect_significant} />
            <MetricCard value={`${summary.benefit_cost_ratio.toFixed(2)}x`} label="Benefit-Cost Ratio" icon={Scale} highlight={summary.benefit_cost_ratio > 1} />
          </div>
          
          {/* Outcome Effects */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Outcome Effects</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(impact_analysis.outcomes).map(([name, m]) => (
                <div key={name} className={`p-3 rounded-lg border ${m.significant ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                  <p className="text-xs truncate text-muted-foreground">{name}</p>
                  <p className="text-xl font-bold">{m.percent_change > 0 ? '+' : ''}{m.percent_change.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">p={m.p_value.toFixed(3)} {m.significant ? '✓' : ''}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Key Insights */}
          {results.key_insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
              <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
            </div>
          ))}
          
          <DetailParagraph title="Summary Interpretation" detail={`This welfare policy impact analysis evaluated "${summary.policy_name}" using ${EVALUATION_METHODS.find(m => m.value === summary.evaluation_method)?.label}.

■ Study Design
• Treatment Group: ${summary.n_treatment.toLocaleString()} beneficiaries
• Control Group: ${summary.n_control.toLocaleString()} non-beneficiaries
• Total Sample: ${summary.n_total.toLocaleString()} observations
• Primary Outcome: ${summary.primary_outcome}

■ Main Findings
• Effect Size: ${summary.main_effect > 0 ? '+' : ''}${summary.main_effect.toFixed(1)}% change
• Statistical Significance: ${summary.main_effect_significant ? 'Yes (p < 0.05)' : 'Not significant'}
• Model Quality: R² = ${(impact_analysis.model_quality.r2 * 100).toFixed(1)}%

■ Cost-Effectiveness
• Cost per Beneficiary: $${summary.cost_per_beneficiary.toLocaleString()}
• Benefit-Cost Ratio: ${summary.benefit_cost_ratio.toFixed(2)}x
• ${summary.benefit_cost_ratio >= 1 ? 'Policy benefits exceed costs' : 'Costs exceed measurable benefits'}`} />
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================
  // Step 5: Why (Methodology Explanation)
  // ============================================================
  const renderStep5Why = () => {
    if (!results) return null;
    const { summary, impact_analysis } = results;
    const methodInfo = EVALUATION_METHODS.find(m => m.value === summary.evaluation_method);
    
    const exps = [
      { n: 1, t: "Identification Strategy", c: `${methodInfo?.label}: ${methodInfo?.desc}. Isolates causal effect from selection bias.` },
      { n: 2, t: "Treatment Effect", c: `Average Treatment Effect (ATE) = ${summary.main_effect.toFixed(1)}%. Compares outcomes between groups.` },
      { n: 3, t: "Statistical Power", c: `N=${summary.n_total.toLocaleString()}, R²=${(impact_analysis.model_quality.r2*100).toFixed(1)}%. ${summary.n_total >= 1000 ? 'Adequate' : 'Limited'} power to detect effects.` },
      { n: 4, t: "Confidence Interval", c: `95% CI provides range of plausible effect sizes accounting for sampling uncertainty.` },
    ];
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding the Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {exps.map(e => (
              <div key={e.n} className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{e.n}</div>
                  <div><p className="font-medium text-sm">{e.t}</p><p className="text-xs text-muted-foreground mt-1">{e.c}</p></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Effect Size Interpretation Guide */}
          <div className="grid grid-cols-4 gap-3">
            {[{ r: ">20%", l: "Large" }, { r: "10-20%", l: "Moderate" }, { r: "5-10%", l: "Small" }, { r: "<5%", l: "Minimal" }].map(g => (
              <div key={g.r} className="p-3 border rounded-lg text-center">
                <p className="font-semibold text-sm">{g.r}</p>
                <p className="text-xs text-primary">{g.l}</p>
              </div>
            ))}
          </div>
          
          <DetailParagraph title="Policy Evaluation Methodology" detail={`■ How Impact Evaluation Works
Policy impact analysis uses quasi-experimental methods to estimate causal effects:

Effect = E[Y|T=1] - E[Y|T=0] (after adjusting for confounders)

Where:
• Y: Outcome variable (e.g., income, employment)
• T: Treatment indicator (1=received policy, 0=control)
• E[Y|T]: Expected outcome conditional on treatment status

■ ${methodInfo?.label}
${summary.evaluation_method === 'did' ? `Compares changes over time:
DiD = (Y_treat_post - Y_treat_pre) - (Y_control_post - Y_control_pre)
Assumes parallel trends in absence of treatment.` :
summary.evaluation_method === 'psm' ? `Matches treated/control units on observables:
Creates comparable groups using propensity scores.
Assumes selection on observables only.` :
summary.evaluation_method === 'rdd' ? `Exploits eligibility cutoffs:
Compares units just above/below threshold.
Assumes no manipulation of running variable.` :
`Uses exogenous variation in treatment:
Isolates causal effect through instrumental variable.
Requires valid and strong instrument.`}

■ Limitations
• Unobserved Confounders: ${summary.evaluation_method === 'psm' ? 'Cannot control for unobservables' : 'Partially addressed by design'}
• External Validity: Results may not generalize to other contexts
• Heterogeneous Effects: Average effects may mask variation across subgroups
• Measurement: Outcomes limited to available data`} />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================
  // Step 6: Full Report
  // ============================================================
  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, impact_analysis, subgroup_analysis, cost_effectiveness } = results;
    
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b">
          <h1 className="text-xl font-semibold">Welfare Policy Impact Report</h1>
          <p className="text-sm text-muted-foreground">{summary.policy_name} | {new Date().toLocaleDateString()}</p>
        </div>
        
        {/* Executive Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-blue-600" />Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              Policy impact analysis of <strong>{summary.policy_name}</strong> evaluated <strong>{summary.n_total.toLocaleString()} observations</strong> using {EVALUATION_METHODS.find(m => m.value === summary.evaluation_method)?.label}.
              The treatment group ({summary.n_treatment.toLocaleString()}) showed a <strong>{summary.main_effect > 0 ? '+' : ''}{summary.main_effect.toFixed(1)}%</strong> change in {summary.primary_outcome} compared to control ({summary.n_control.toLocaleString()}).
              This effect is <strong>{summary.main_effect_significant ? 'statistically significant' : 'not statistically significant'}</strong>.
              Cost-effectiveness analysis shows a benefit-cost ratio of <strong>{summary.benefit_cost_ratio.toFixed(2)}x</strong> with cost per beneficiary of <strong>${summary.cost_per_beneficiary.toLocaleString()}</strong>.
            </p>
          </CardContent>
        </Card>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={summary.n_total.toLocaleString()} label="Total N" icon={Users} highlight />
          <MetricCard value={`${summary.main_effect > 0 ? '+' : ''}${summary.main_effect.toFixed(1)}%`} label="Main Effect" icon={TrendingUp} highlight={summary.main_effect_significant} />
          <MetricCard value={`$${summary.cost_per_beneficiary.toLocaleString()}`} label="Cost/Person" icon={DollarSign} />
          <MetricCard value={`${summary.benefit_cost_ratio.toFixed(2)}x`} label="BCR" icon={Scale} highlight={summary.benefit_cost_ratio > 1} />
        </div>
        
        {/* Visualizations */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="impact">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                {["impact", "subgroup", "temporal", "distribution", "cost"].map(t => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}
              </TabsList>
              {[
                { k: "impact_chart", t: "impact" },
                { k: "subgroup_chart", t: "subgroup" },
                { k: "temporal_chart", t: "temporal" },
                { k: "distribution_chart", t: "distribution" },
                { k: "cost_benefit_chart", t: "cost" }
              ].map(({ k, t }) => (
                <TabsContent key={k} value={t}>
                  {results.visualizations[k as keyof typeof results.visualizations] && (
                    <div className="relative border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Outcome Effects Table */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Outcome Effects</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Control Mean</TableHead>
                  <TableHead className="text-right">Treatment Mean</TableHead>
                  <TableHead className="text-right">Effect</TableHead>
                  <TableHead className="text-right">P-Value</TableHead>
                  <TableHead>Significant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(impact_analysis.outcomes).map(([name, m]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right">{m.baseline_mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{m.treatment_mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={m.percent_change > 0 ? "default" : m.percent_change < 0 ? "destructive" : "secondary"} className="text-xs">
                        {m.percent_change > 0 ? '+' : ''}{m.percent_change.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.p_value.toFixed(4)}</TableCell>
                    <TableCell>
                      {m.significant ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DetailParagraph title="Outcome Interpretation" detail={`■ Key Metrics
• Control Mean: Average outcome for non-beneficiaries
• Treatment Mean: Average outcome for policy beneficiaries
• Effect: Percentage change attributable to policy
• P-Value: Probability of observing effect by chance (< 0.05 = significant)

■ Effect Assessment
${Object.entries(impact_analysis.outcomes).map(([name, m]) => `• ${name}: ${m.significant ? 'Significant' : 'Not significant'} ${Math.abs(m.percent_change) >= 20 ? 'large' : Math.abs(m.percent_change) >= 10 ? 'moderate' : 'small'} effect (${m.percent_change > 0 ? '+' : ''}${m.percent_change.toFixed(1)}%)`).join('\n')}

■ Confidence Intervals
95% CI provides range where true effect likely falls, accounting for sampling variability.`} />
          </CardContent>
        </Card>
        
        {/* Subgroup Analysis */}
        {Object.keys(subgroup_analysis).length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Subgroup Analysis</CardTitle></CardHeader>
            <CardContent>
              {Object.entries(subgroup_analysis).map(([variable, effects]) => (
                <div key={variable} className="mb-6 last:mb-0">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />{variable}
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subgroup</TableHead>
                        <TableHead className="text-right">N (Control)</TableHead>
                        <TableHead className="text-right">N (Treatment)</TableHead>
                        <TableHead className="text-right">Effect</TableHead>
                        <TableHead className="text-right">P-Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {effects.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.subgroup}</TableCell>
                          <TableCell className="text-right">{e.n_control.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{e.n_treatment.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <span className={e.significant ? 'text-primary font-medium' : ''}>
                              {e.percent_change > 0 ? '+' : ''}{e.percent_change.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{e.p_value.toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Cost-Effectiveness */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Cost-Effectiveness Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard value={`$${cost_effectiveness.total_cost.toLocaleString()}`} label="Total Cost" icon={DollarSign} />
              <MetricCard value={cost_effectiveness.total_beneficiaries.toLocaleString()} label="Beneficiaries" icon={Users} />
              <MetricCard value={`$${cost_effectiveness.cost_per_beneficiary.toLocaleString()}`} label="Cost/Person" icon={DollarSign} />
              <MetricCard value={`${cost_effectiveness.outcome_improvement.toFixed(1)}%`} label="Improvement" icon={TrendingUp} />
              <MetricCard value={`${cost_effectiveness.benefit_cost_ratio.toFixed(2)}x`} label="BCR" icon={Scale} highlight={cost_effectiveness.benefit_cost_ratio > 1} />
            </div>
            <DetailParagraph title="Cost-Effectiveness Interpretation" detail={`■ Cost Metrics
• Total Program Cost: $${cost_effectiveness.total_cost.toLocaleString()}
• Total Beneficiaries: ${cost_effectiveness.total_beneficiaries.toLocaleString()}
• Cost per Beneficiary: $${cost_effectiveness.cost_per_beneficiary.toLocaleString()}

■ Effectiveness Metrics
• Outcome Improvement: ${cost_effectiveness.outcome_improvement.toFixed(1)}%
• Cost per Unit Improvement: $${cost_effectiveness.cost_per_unit_improvement.toLocaleString()}
• Benefit-Cost Ratio: ${cost_effectiveness.benefit_cost_ratio.toFixed(2)}x

■ Assessment
${cost_effectiveness.benefit_cost_ratio >= 2 ? '• Highly cost-effective: Benefits substantially exceed costs' : cost_effectiveness.benefit_cost_ratio >= 1 ? '• Cost-effective: Benefits exceed costs' : '• Below break-even: Consider policy modifications'}
${cost_effectiveness.benefit_cost_ratio < 1 ? '• Recommendation: Review targeting criteria or delivery mechanisms' : ''}`} />
          </CardContent>
        </Card>
        
        {/* Export */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button>
              <Button variant="outline" onClick={() => handleDownloadPNG("impact_chart")} className="gap-2"><Download className="w-4 h-4" />Chart</Button>
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setGlossaryModalOpen(true)} className="gap-2">
            <BookOpen className="w-4 h-4" />Glossary
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-2">
            <HelpCircle className="w-4 h-4" />Help
          </Button>
        </div>
      )}
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep > 1 && data.length > 0 && <DataPreview data={data} columns={columns} />}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
      
      {/* Glossary Modal */}
      <GlossaryModal 
        isOpen={glossaryModalOpen}
        onClose={() => setGlossaryModalOpen(false)}
      />
    </div>
  );
}
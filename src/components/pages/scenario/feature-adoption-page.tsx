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
  Sparkles, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  BarChart3, Users, Layers, Target, Play, Zap, BookOpen,
  PieChart, GitBranch, CheckSquare, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface FeatureMetrics {
  total_users: number; adopted_users: number; adoption_rate: number;
  adoption_pct: number; ci_lower: number; ci_upper: number;
}

interface TestResult {
  observed_rate: number; target_rate: number; difference: number;
  z_statistic: number; p_value: number; meets_target: boolean; significant: boolean;
}

interface Comparison {
  feature_1: string; feature_2: string; rate_1: number; rate_2: number;
  difference: number; chi2_statistic: number; p_value: number; significant: boolean;
}

interface SegmentData {
  segment: string; feature: string; total_users: number;
  adopted_users: number; adoption_rate: number; adoption_pct: number;
}

interface AdoptionResult {
  success: boolean;
  results: {
    metrics: { [key: string]: FeatureMetrics };
    test_results: { [key: string]: TestResult };
    comparisons: Comparison[];
    segment_data: SegmentData[];
    totals: { total_users: number; total_adopted: number; overall_rate: number; overall_pct: number; num_features: number; };
  };
  visualizations: { adoption_rates?: string; adoption_distribution?: string; target_comparison?: string; feature_comparison?: string; segment_heatmap?: string; };
  key_insights: KeyInsight[];
  summary: { analysis_type: string; feature_column: string; num_features: number; total_users: number; overall_adoption_rate: number; target_rate: number; meets_target: boolean; analyze_time_ms: number; };
}

const ANALYSIS_TYPES = [
  { value: "adoption_rate", label: "Adoption Rate", desc: "Overall adoption metrics", icon: BarChart3 },
  { value: "time_to_adopt", label: "Time to Adopt", desc: "Adoption velocity analysis", icon: Zap },
  { value: "funnel", label: "Funnel Analysis", desc: "Stage-by-stage breakdown", icon: GitBranch },
];

const generateSampleData = (): DataRow[] => {
  const features = ["Dark Mode", "Push Notifications", "Two-Factor Auth", "Export to PDF", "Custom Dashboard"];
  const segments = ["Enterprise", "Pro", "Free", "Trial"];
  const data: DataRow[] = [];
  
  const adoptionRates: { [key: string]: { [key: string]: number } } = {
    "Dark Mode": { "Enterprise": 0.78, "Pro": 0.72, "Free": 0.65, "Trial": 0.45 },
    "Push Notifications": { "Enterprise": 0.85, "Pro": 0.68, "Free": 0.42, "Trial": 0.35 },
    "Two-Factor Auth": { "Enterprise": 0.92, "Pro": 0.55, "Free": 0.28, "Trial": 0.15 },
    "Export to PDF": { "Enterprise": 0.88, "Pro": 0.75, "Free": 0.38, "Trial": 0.22 },
    "Custom Dashboard": { "Enterprise": 0.72, "Pro": 0.48, "Free": 0.18, "Trial": 0.12 },
  };
  
  let userId = 1;
  for (const feature of features) {
    for (const segment of segments) {
      const usersInSegment = segment === "Enterprise" ? 150 : segment === "Pro" ? 300 : segment === "Free" ? 500 : 200;
      const rate = adoptionRates[feature][segment];
      
      for (let i = 0; i < usersInSegment; i++) {
        const adopted = Math.random() < rate ? 1 : 0;
        data.push({
          user_id: `user_${userId++}`,
          feature_name: feature,
          adopted: adopted,
          segment: segment,
          signup_date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          days_to_adopt: adopted ? Math.floor(Math.random() * 30) + 1 : null,
        });
      }
    }
  }
  return data;
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
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'adoption_data.csv'; a.click();
  };
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} records</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}><Download className="w-3 h-3" />Download</Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table><TableHeader><TableRow>{columns.slice(0, 6).map(col => (<TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>))}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 10).map((row, i) => (<TableRow key={i}>{columns.slice(0, 6).map(col => (<TableCell key={col} className="text-xs py-1.5">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</TableCell>))}</TableRow>))}</TableBody>
          </Table>
          {data.length > 10 && <p className="text-xs text-muted-foreground p-2 text-center">Showing first 10 of {data.length} records</p>}
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

const AdoptionBadge: React.FC<{ rate: number; target: number }> = ({ rate, target }) => {
  const meetsTarget = rate >= target;
  return (
    <Badge variant={meetsTarget ? "default" : "secondary"} className={`${meetsTarget ? 'bg-green-500' : 'bg-amber-500'}`}>
      {rate.toFixed(1)}%
      {meetsTarget ? <CheckCircle2 className="w-3 h-3 ml-1" /> : <AlertCircle className="w-3 h-3 ml-1" />}
    </Badge>
  );
};

const FeatureCard: React.FC<{ feature: string; metrics: FeatureMetrics; testResult: TestResult; target: number }> = ({ feature, metrics, testResult, target }) => (
  <div className={`p-4 rounded-lg border ${testResult.meets_target ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${testResult.meets_target ? 'bg-primary' : 'bg-amber-500'}`}>
          {testResult.meets_target ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </div>
        <div><p className="font-medium">{feature}</p><p className="text-xs text-muted-foreground">{metrics.total_users} users</p></div>
      </div>
      <AdoptionBadge rate={metrics.adoption_pct} target={target} />
    </div>
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div><p className="text-muted-foreground text-xs">Adopted</p><p className="font-medium">{metrics.adopted_users}</p></div>
      <div><p className="text-muted-foreground text-xs">Rate</p><p className="font-medium">{metrics.adoption_pct.toFixed(1)}%</p></div>
      <div><p className="text-muted-foreground text-xs">95% CI</p><p className="font-medium">{(metrics.ci_lower*100).toFixed(1)}-{(metrics.ci_upper*100).toFixed(1)}%</p></div>
    </div>
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">vs Target ({target}%)</span>
        <span className={`font-medium ${testResult.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {testResult.difference >= 0 ? '+' : ''}{(testResult.difference * 100).toFixed(1)}pp
        </span>
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-muted-foreground">p-value</span>
        <span className="font-medium">{testResult.p_value.toFixed(4)}</span>
      </div>
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
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Feature Adoption Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Feature Adoption Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Feature adoption analysis measures how successfully users engage with specific product features. 
              It helps product teams understand which features are being used, identify adoption barriers, and 
              prioritize improvements. This analysis is crucial for validating product decisions, optimizing 
              user onboarding, and maximizing the value users get from your product.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistical Methods Used
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Adoption Rate Calculation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Measure the percentage of users who have adopted each feature<br/>
                  <strong>Formula:</strong> Adoption Rate = (Users who adopted feature) / (Total users exposed to feature)<br/>
                  <strong>Range:</strong> 0% to 100%<br/>
                  <strong>Use:</strong> Primary metric for feature engagement and success
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Wilson Score Confidence Interval</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Provide reliable bounds on true adoption rate accounting for sample size<br/>
                  <strong>Method:</strong> Better than normal approximation for proportions, especially with small samples<br/>
                  <strong>Output:</strong> Lower and upper bounds for 95% confidence interval<br/>
                  <strong>Interpretation:</strong> True adoption rate likely falls within this range
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Proportion Z-Test</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Test if observed adoption rate differs significantly from target<br/>
                  <strong>Hypotheses:</strong> H₀: rate = target vs H₁: rate ≠ target<br/>
                  <strong>Test Statistic:</strong> z = (observed - target) / SE<br/>
                  <strong>Decision:</strong> p-value less than 0.05 indicates significant difference
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">4. Chi-Square Test (Feature Comparison)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Compare adoption rates between different features<br/>
                  <strong>Method:</strong> Tests independence of feature and adoption status<br/>
                  <strong>Use case:</strong> Identify which features have significantly different performance<br/>
                  <strong>Output:</strong> Chi-square statistic and p-value for significance
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
                <p className="font-medium text-sm">Adoption Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Percentage of users who have used or activated a feature<br/>
                  <strong>Benchmark:</strong> Varies by feature type (core vs. optional, new vs. established)<br/>
                  <strong>Excellent:</strong> 70%+ for core features, 40%+ for optional features<br/>
                  <strong>Good:</strong> 50-70% for core, 25-40% for optional<br/>
                  <strong>Needs Work:</strong> Below 50% for core, below 25% for optional
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Confidence Interval (95% CI)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Shows the range where true adoption rate likely falls<br/>
                  <strong>Interpretation:</strong> Wider intervals indicate more uncertainty (smaller sample size)<br/>
                  <strong>Example:</strong> 45-55% CI means true rate is very likely between 45% and 55%<br/>
                  <strong>Use:</strong> Assess reliability of adoption rate estimate
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Target Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Your goal or benchmark for feature adoption<br/>
                  <strong>Setting:</strong> Based on business objectives, competitor benchmarks, or historical data<br/>
                  <strong>Typical ranges:</strong> 30-50% for nice-to-have features, 60-80% for core features<br/>
                  <strong>Purpose:</strong> Provides context for evaluating feature performance
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">p-value (Statistical Significance)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Probability of observing results this extreme if null hypothesis is true<br/>
                  <strong>Threshold:</strong> p less than 0.05 typically considered significant<br/>
                  <strong>Interpretation:</strong> Low p-value means difference from target is real, not due to chance<br/>
                  <strong>Caution:</strong> Statistical significance ≠ practical significance
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Difference (pp = percentage points)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Observed rate minus target rate<br/>
                  <strong>Example:</strong> +5pp means 5 percentage points above target (e.g., 55% vs 50%)<br/>
                  <strong>Use:</strong> Quantifies magnitude of over/under-performance<br/>
                  <strong>Actionable:</strong> Differences above 10pp often warrant investigation
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpretation Guidelines
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>High Adoption + Meets Target:</strong> Feature is successful—maintain and monitor</p>
              <p><strong>High Adoption + Exceeds Target:</strong> Star feature—study for success patterns, consider raising target</p>
              <p><strong>Low Adoption + Below Target:</strong> Priority fix—improve discoverability, onboarding, or value</p>
              <p><strong>Narrow CI:</strong> Large sample, reliable estimate—confident in decisions</p>
              <p><strong>Wide CI:</strong> Small sample, uncertain estimate—collect more data before major decisions</p>
              <p><strong>Significant p-value:</strong> Real difference exists—not due to random variation</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Common Pitfalls & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Selection Bias:</strong> Only analyzing users who completed onboarding may inflate rates</p>
              <p>• <strong>Time Dependency:</strong> New features naturally have lower adoption—track over time</p>
              <p>• <strong>Feature Visibility:</strong> Hidden features will have low adoption regardless of value</p>
              <p>• <strong>Definition Issues:</strong> What counts as "adoption"? First use? Regular use? Define clearly</p>
              <p>• <strong>Sample Size:</strong> Need sufficient users per feature for reliable statistical testing</p>
              <p>• <strong>Multiple Comparisons:</strong> Testing many features increases false positive risk</p>
              <p>• <strong>Context Missing:</strong> Numbers don't explain WHY adoption is high or low</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Analysis Types
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Adoption Rate Analysis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>What it measures:</strong> Overall feature usage penetration<br/>
                  <strong>Best for:</strong> Quick health check, comparing features, setting benchmarks<br/>
                  <strong>Limitation:</strong> Doesn't capture depth or frequency of usage<br/>
                  <strong>Complement with:</strong> Engagement metrics, retention analysis
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Time to Adopt Analysis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>What it measures:</strong> How quickly users discover and use features<br/>
                  <strong>Best for:</strong> Evaluating onboarding effectiveness, feature discoverability<br/>
                  <strong>Metrics:</strong> Median days to adoption, adoption curve shape<br/>
                  <strong>Insight:</strong> Fast adoption suggests good UX, slow adoption indicates friction
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Funnel Analysis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>What it measures:</strong> Drop-off at each stage of feature adoption<br/>
                  <strong>Best for:</strong> Identifying specific barriers to adoption<br/>
                  <strong>Stages:</strong> Exposure → Discovery → Trial → Regular Use<br/>
                  <strong>Actionable:</strong> Pinpoints exactly where users abandon features
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Collection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Track feature exposure separately from adoption</li>
                  <li>• Use consistent user identifiers</li>
                  <li>• Record timestamps for time-based analysis</li>
                  <li>• Include user segments for deeper insights</li>
                  <li>• Ensure data quality and completeness</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Target Setting</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Set realistic targets based on feature type</li>
                  <li>• Use competitor benchmarks when available</li>
                  <li>• Adjust targets for feature maturity</li>
                  <li>• Different targets for different segments</li>
                  <li>• Review and update targets quarterly</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Analysis Approach</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Segment by user type, cohort, channel</li>
                  <li>• Track trends over time, not just snapshots</li>
                  <li>• Combine quantitative with qualitative data</li>
                  <li>• Look for correlations with other metrics</li>
                  <li>• Validate findings with user research</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Action Planning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Prioritize features with biggest impact</li>
                  <li>• Test hypotheses with A/B experiments</li>
                  <li>• Improve discoverability for low adoption</li>
                  <li>• Enhance onboarding for complex features</li>
                  <li>• Consider sunsetting unused features</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Benchmarks by Feature Type
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Core Features (required for main use case):</strong> Target 70-90% adoption</p>
              <p><strong>Enhanced Features (improve experience):</strong> Target 40-60% adoption</p>
              <p><strong>Power User Features (advanced capabilities):</strong> Target 15-30% adoption</p>
              <p><strong>Experimental Features (new/beta):</strong> Target 10-25% adoption</p>
              <p><strong>Premium Features (paid tier):</strong> Target 50-80% among paying users</p>
              <p><strong>Note:</strong> Actual benchmarks vary significantly by industry, product type, and user base</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Improving Low Adoption Features
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Discoverability Issues</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Symptoms:</strong> Feature exists but users don't know about it<br/>
                  <strong>Solutions:</strong> In-app tooltips, feature highlights, onboarding tours, email campaigns<br/>
                  <strong>Measure:</strong> Track views/clicks on feature entry points
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Value Proposition Unclear</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Symptoms:</strong> Users see feature but don't understand benefits<br/>
                  <strong>Solutions:</strong> Better messaging, use case examples, demo videos, quick wins<br/>
                  <strong>Measure:</strong> Survey users on perceived value before/after improvements
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Complexity Barrier</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Symptoms:</strong> Users try feature but abandon due to difficulty<br/>
                  <strong>Solutions:</strong> Simplify UX, progressive disclosure, contextual help, templates<br/>
                  <strong>Measure:</strong> Track completion rates for feature-specific actions
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Wrong Target Audience</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Symptoms:</strong> Consistently low adoption across all segments<br/>
                  <strong>Solutions:</strong> Validate need with user research, consider feature pivot or retirement<br/>
                  <strong>Measure:</strong> User feedback scores, feature request frequency
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Key Insight:</strong> Feature adoption analysis tells you WHAT is 
              happening but not always WHY. Combine quantitative adoption metrics with qualitative user research 
              (interviews, surveys, session recordings) to understand root causes and design effective interventions. 
              High adoption alone doesn't guarantee value—also measure engagement depth, retention, and business impact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Sparkles className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Feature Adoption Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze how users adopt your product features. Measure adoption rates, compare across segments, and identify opportunities to improve feature engagement.</p>
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
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use Adoption Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div><h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Feature identifier column", "Adoption status (0/1 or boolean)", "User identifier (optional)", "Segment column (optional)", "At least 50 users per feature"].map((req) => (<li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>))}
              </ul>
            </div>
            <div><h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Adoption rates with confidence intervals", "Statistical comparison vs target", "Feature-to-feature comparison", "Segment-level breakdown"].map((res) => (<li key={res} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}</li>))}
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

export default function AdoptionAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<AdoptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false); // 이 줄 추가


  const [userCol, setUserCol] = useState<string>("");
  const [featureCol, setFeatureCol] = useState<string>("");
  const [adoptedCol, setAdoptedCol] = useState<string>("");
  const [segmentCol, setSegmentCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("adoption_rate");
  const [targetRate, setTargetRate] = useState<string>("50");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData); setColumns(Object.keys(sampleData[0]));
    setUserCol("user_id"); setFeatureCol("feature_name"); setAdoptedCol("adopted"); setSegmentCol("segment"); setDateCol("signup_date");
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
    const hasFeature = !!featureCol;
    const hasAdopted = !!adoptedCol;
    const numFeatures = hasFeature ? [...new Set(data.map(d => d[featureCol]))].length : 0;
    const target = parseFloat(targetRate) || 50;
    
    return [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${numRecords} records loaded` : "No data loaded" },
      { name: "Feature Column", passed: hasFeature, message: hasFeature ? `Using: ${featureCol} (${numFeatures} features)` : "Select feature column" },
      { name: "Adopted Column", passed: hasAdopted, message: hasAdopted ? `Using: ${adoptedCol}` : "Select adoption status column" },
      { name: "Sufficient Data", passed: numRecords >= 50, message: numRecords >= 50 ? `${numRecords} records (sufficient)` : `${numRecords} records (need 50+)` },
      { name: "Target Rate", passed: target > 0 && target <= 100, message: target > 0 && target <= 100 ? `Target: ${target}%` : "Set valid target (1-100%)" },
    ];
  }, [data, featureCol, adoptedCol, targetRate]);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload = { data, user_col: userCol || null, feature_col: featureCol, adopted_col: adoptedCol, date_col: dateCol || null, segment_col: segmentCol || null, analysis_type: analysisType, target_rate: parseFloat(targetRate) / 100 };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/adoption`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.detail || "Analysis failed"); }
      const result: AdoptionResult = await res.json();
      setResults(result); setCurrentStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const { metrics, test_results } = results.results;
    const rows: string[] = ['Feature,Total Users,Adopted,Adoption Rate,Target,Meets Target,p-value'];
    Object.entries(metrics).forEach(([feature, m]) => {
      const t = test_results[feature];
      rows.push(`${feature},${m.total_users},${m.adopted_users},${m.adoption_pct.toFixed(2)}%,${(t.target_rate*100).toFixed(0)}%,${t.meets_target},${t.p_value.toFixed(6)}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'adoption_analysis.csv'; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a'); a.href = `data:image/png;base64,${base64}`; a.download = `adoption_${chartKey}.png`; a.click();
  };

  const renderStep2Config = () => {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up feature adoption analysis parameters</CardDescription></CardHeader>
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
            <h4 className="font-medium flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />Data Columns</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Feature Column *</Label>
                <Select value={featureCol || "__none__"} onValueChange={v => setFeatureCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Select --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Adopted Column *</Label>
                <Select value={adoptedCol || "__none__"} onValueChange={v => setAdoptedCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Select --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>User ID Column</Label>
                <Select value={userCol || "__none__"} onValueChange={v => setUserCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Segment Column</Label>
                <Select value={segmentCol || "__none__"} onValueChange={v => setSegmentCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Target Settings</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Target Adoption Rate (%)</Label><Input type="number" min="1" max="100" value={targetRate} onChange={e => setTargetRate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Date Column (optional)</Label>
                <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
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
            <div className="flex items-start gap-2"><Info className="w-5 h-5 text-primary mt-0.5" /><div className="text-sm"><p className="font-medium">Configuration Summary</p><p className="text-muted-foreground">{`Analysis: ${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} • Feature: ${featureCol} • Target: ${targetRate}%`}</p></div></div>
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
    const { metrics, test_results, totals } = r;
    const target = parseFloat(targetRate);
    
    const finding = `Overall feature adoption is ${totals.overall_pct.toFixed(1)}% across ${summary.num_features} features with ${totals.total_users.toLocaleString()} total users. ${summary.meets_target ? `This exceeds the ${target}% target.` : `This is below the ${target}% target by ${(target - totals.overall_pct).toFixed(1)}pp.`}`;
    
    const featuresAboveTarget = Object.values(test_results).filter(t => t.meets_target).length;
    const featuresBelowTarget = Object.values(test_results).length - featuresAboveTarget;
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Analysis Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${totals.overall_pct.toFixed(1)}%`} label="Overall Adoption" icon={BarChart3} highlight />
            <MetricCard value={totals.total_users.toLocaleString()} label="Total Users" icon={Users} />
            <MetricCard value={summary.num_features} label="Features Analyzed" icon={Sparkles} />
            <MetricCard value={`${target}%`} label="Target Rate" icon={Target} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={totals.total_adopted.toLocaleString()} label="Users Adopted" />
            <MetricCard value={featuresAboveTarget} label="Above Target" highlight={featuresAboveTarget > 0} />
            <MetricCard value={featuresBelowTarget} label="Below Target" negative={featuresBelowTarget > 0} />
            <MetricCard value={summary.meets_target ? "Yes" : "No"} label="Meets Overall Target" highlight={summary.meets_target} negative={!summary.meets_target} />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Feature Breakdown</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(metrics).map(([feature, m]) => (<FeatureCard key={feature} feature={feature} metrics={m} testResult={test_results[feature]} target={target} />))}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${insight.status === "positive" ? "border-primary/30 bg-primary/5" : insight.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div><p className="font-medium text-sm">{insight.title}</p><p className="text-sm text-muted-foreground">{insight.description}</p></div>
              </div>
            ))}
          </div>
          
          <DetailParagraph title="Summary Interpretation" detail={`This feature adoption analysis evaluated ${summary.num_features} features across ${totals.total_users.toLocaleString()} users against a ${target}% adoption target.

■ Adoption Analysis Overview

Feature adoption analysis measures how successfully users engage with specific product features, providing insights for product development and user experience optimization.

• Methodology:
  - Adoption Rate: Percentage of users who have activated/used each feature
  - Wilson Score Interval: Confidence interval that accounts for sample size
  - Proportion Z-test: Statistical test comparing observed rate against target
  - Chi-square Test: Comparing adoption rates between features

■ Results Analysis

【Overall Performance】
• Total Users: ${totals.total_users.toLocaleString()}
• Users Adopted (any feature): ${totals.total_adopted.toLocaleString()}
• Overall Adoption Rate: ${totals.overall_pct.toFixed(1)}%
• Target Rate: ${target}%
• Status: ${summary.meets_target ? 'Meeting Target ✓' : 'Below Target ✗'}

【Feature Performance】
• Features Above Target: ${featuresAboveTarget} of ${summary.num_features}
• Features Below Target: ${featuresBelowTarget} of ${summary.num_features}
• Best Performer: ${Object.entries(metrics).sort((a, b) => b[1].adoption_rate - a[1].adoption_rate)[0]?.[0] || 'N/A'} (${(Object.entries(metrics).sort((a, b) => b[1].adoption_rate - a[1].adoption_rate)[0]?.[1]?.adoption_pct || 0).toFixed(1)}%)
• Needs Improvement: ${Object.entries(metrics).sort((a, b) => a[1].adoption_rate - b[1].adoption_rate)[0]?.[0] || 'N/A'} (${(Object.entries(metrics).sort((a, b) => a[1].adoption_rate - b[1].adoption_rate)[0]?.[1]?.adoption_pct || 0).toFixed(1)}%)

■ Quality Assessment
${summary.meets_target ? '✓ Overall adoption meets target' : '△ Overall adoption below target'}
${featuresAboveTarget >= featuresBelowTarget ? '✓ Majority of features performing well' : '△ Multiple features need attention'}
${totals.total_users >= 500 ? '✓ Adequate sample size for reliable analysis' : '△ Consider collecting more data'}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Results<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { results: r, summary } = results;
    const { metrics, test_results, comparisons, segment_data } = r;
    const target = parseFloat(targetRate);
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding the Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Feature adoption analysis reveals how users interact with your product features. Understanding adoption patterns helps prioritize development efforts and identify features that may need better onboarding or promotion." />
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How Adoption Analysis Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Adoption Rate Calculation", content: "For each feature, we calculate the percentage of users who have adopted it. This simple metric shows feature popularity and usage penetration." },
                { num: 2, title: "Confidence Intervals", content: "Wilson score intervals account for sample size, giving reliable bounds on the true adoption rate even with smaller samples." },
                { num: 3, title: "Statistical Testing", content: "Z-tests compare each feature's adoption rate against your target. P-values below 0.05 indicate statistically significant differences." },
                { num: 4, title: "Feature Comparison", content: "Chi-square tests identify which features have significantly different adoption rates, revealing relative performance." },
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
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Feature-by-Feature Analysis</h4>
            <div className="space-y-4">
              {Object.entries(test_results).map(([feature, result], idx) => (
                <div key={feature} className={`p-4 rounded-lg border ${result.meets_target ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${result.meets_target ? 'bg-primary' : 'bg-amber-500'}`}>{idx + 1}</div>
                      <span className="font-medium">{feature}</span>
                    </div>
                    <AdoptionBadge rate={result.observed_rate * 100} target={target} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.meets_target 
                      ? `This feature exceeds the ${target}% target with ${(result.observed_rate * 100).toFixed(1)}% adoption. ${result.significant ? 'The difference is statistically significant.' : 'Continue monitoring to maintain performance.'}`
                      : `This feature is ${(((target/100) - result.observed_rate) * 100).toFixed(1)}pp below the ${target}% target. Consider improving discoverability, onboarding, or value proposition.`
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {comparisons.length > 0 && (<><Separator /><div className="space-y-3"><h4 className="font-medium text-sm">Feature Comparisons</h4><div className="space-y-3">{comparisons.slice(0, 5).map((comp, idx) => (<div key={idx} className={`p-4 rounded-lg border ${comp.significant ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/10'}`}><div className="flex items-center justify-between mb-2"><span className="font-medium text-sm">{comp.feature_1} vs {comp.feature_2}</span><Badge variant={comp.significant ? "default" : "secondary"}>{comp.significant ? 'Significant' : 'Not Significant'}</Badge></div><p className="text-xs text-muted-foreground">{`${comp.feature_1} has ${Math.abs(comp.difference * 100).toFixed(1)}pp ${comp.difference > 0 ? 'higher' : 'lower'} adoption than ${comp.feature_2}. `}{comp.significant ? `This difference is statistically significant (p=${comp.p_value.toFixed(4)}).` : 'This difference may be due to chance.'}</p></div>))}</div></div></>)}
          
          <DetailParagraph title="Strategic Recommendations" detail={`Based on the feature adoption analysis, here are recommendations for improving adoption rates.

■ 1. Performance Summary

${Object.values(test_results).filter(t => t.meets_target).length >= Object.values(test_results).length / 2 ? `【Strong Overall Performance】
${Object.values(test_results).filter(t => t.meets_target).length} of ${Object.values(test_results).length} features meet the ${target}% target.

Focus Areas:
• Study high-performing features for success patterns
• Apply learnings to underperforming features
• Consider raising targets for top performers` : `【Improvement Opportunity】
${Object.values(test_results).filter(t => !t.meets_target).length} features are below the ${target}% target.

Priority Actions:
• Audit feature discoverability and onboarding
• Gather user feedback on barriers to adoption
• Consider feature simplification or redesign`}

■ 2. Feature-Specific Recommendations

${Object.entries(test_results).map(([f, t]) => `【${f}】 ${t.meets_target ? '✓ Meeting Target' : '⚠ Below Target'}
• Observed: ${(t.observed_rate * 100).toFixed(1)}% | Target: ${target}%
• ${t.meets_target ? 'Maintain current strategy and monitor' : 'Prioritize UX review and promotion'}`).join('\n\n')}

■ 3. Segment Considerations

${segment_data.length > 0 ? `Analysis by segment reveals opportunities:
${segment_data.slice(0, 3).map(s => `• ${s.segment} - ${s.feature}: ${s.adoption_pct.toFixed(1)}%`).join('\n')}

Consider tailored approaches for underperforming segments.` : 'No segment data available. Consider adding segment analysis for deeper insights.'}

■ 4. Next Steps

【Immediate Actions】
• Share results with product and design teams
• Identify quick wins for underperforming features
• Set up adoption tracking dashboards

【Medium-term Planning】
• Conduct user research on low-adoption features
• A/B test onboarding improvements
• Develop feature-specific promotion strategies

【Long-term Strategy】
• Establish adoption benchmarks by feature type
• Build predictive models for adoption likelihood
• Create feedback loops for continuous improvement`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, results: r, key_insights, visualizations } = results;
    const { metrics, test_results, comparisons, segment_data, totals } = r;
    const target = parseFloat(targetRate);
    
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border"><h1 className="text-xl font-semibold">Feature Adoption Analysis Report</h1><p className="text-sm text-muted-foreground mt-1">{ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} | {new Date().toLocaleDateString()}</p></div>
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`${totals.overall_pct.toFixed(1)}%`} label="Overall Adoption" highlight />
              <MetricCard value={totals.total_users.toLocaleString()} label="Total Users" />
              <MetricCard value={summary.num_features} label="Features" />
              <MetricCard value={`${summary.analyze_time_ms}ms`} label="Analysis Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">Analyzed {summary.num_features} features across {totals.total_users.toLocaleString()} users. Overall adoption rate is {totals.overall_pct.toFixed(1)}%, which {summary.meets_target ? 'meets' : 'does not meet'} the {target}% target. {Object.values(test_results).filter(t => t.meets_target).length} features are above target.</p>
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
                  {visualizations.adoption_rates && <TabsTrigger value="adoption_rates" className="text-xs">Adoption Rates</TabsTrigger>}
                  {visualizations.adoption_distribution && <TabsTrigger value="adoption_distribution" className="text-xs">Distribution</TabsTrigger>}
                  {visualizations.target_comparison && <TabsTrigger value="target_comparison" className="text-xs">vs Target</TabsTrigger>}
                  {visualizations.feature_comparison && <TabsTrigger value="feature_comparison" className="text-xs">Comparison</TabsTrigger>}
                  {visualizations.segment_heatmap && <TabsTrigger value="segment_heatmap" className="text-xs">Segments</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (<TabsContent key={key} value={key}><div className="relative border border-border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${value}`} alt={key} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}><Download className="w-4 h-4" /></Button></div></TabsContent>))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Feature Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead className="text-right">Users</TableHead><TableHead className="text-right">Adopted</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">vs Target</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(metrics).map(([feature, m]) => {
                  const t = test_results[feature];
                  return (<TableRow key={feature}><TableCell className="font-medium">{feature}</TableCell><TableCell className="text-right">{m.total_users}</TableCell><TableCell className="text-right">{m.adopted_users}</TableCell><TableCell className="text-right">{m.adoption_pct.toFixed(1)}%</TableCell><TableCell className="text-right"><span className={t.difference >= 0 ? 'text-green-600' : 'text-red-600'}>{t.difference >= 0 ? '+' : ''}{(t.difference * 100).toFixed(1)}pp</span></TableCell><TableCell className="text-right"><Badge variant={t.meets_target ? "default" : "secondary"} className={`text-xs ${t.meets_target ? 'bg-green-500' : 'bg-amber-500'}`}>{t.meets_target ? "✓ Target" : "Below"}</Badge></TableCell></TableRow>);
                })}
                <TableRow className="bg-muted/20 font-medium"><TableCell>Total</TableCell><TableCell className="text-right">{totals.total_users}</TableCell><TableCell className="text-right">{totals.total_adopted}</TableCell><TableCell className="text-right">{totals.overall_pct.toFixed(1)}%</TableCell><TableCell className="text-right"><span className={summary.meets_target ? 'text-green-600' : 'text-red-600'}>{summary.meets_target ? '+' : ''}{(totals.overall_pct - target).toFixed(1)}pp</span></TableCell><TableCell className="text-right"><Badge variant={summary.meets_target ? "default" : "secondary"} className={`text-xs ${summary.meets_target ? 'bg-green-500' : 'bg-amber-500'}`}>{summary.meets_target ? "✓ Target" : "Below"}</Badge></TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {comparisons.length > 0 && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Feature Comparisons</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Comparison</TableHead><TableHead className="text-right">Rate 1</TableHead><TableHead className="text-right">Rate 2</TableHead><TableHead className="text-right">Difference</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">Significant</TableHead></TableRow></TableHeader>
                <TableBody>
                  {comparisons.slice(0, 10).map((comp, idx) => (<TableRow key={idx}><TableCell className="font-medium">{comp.feature_1} vs {comp.feature_2}</TableCell><TableCell className="text-right">{(comp.rate_1 * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{(comp.rate_2 * 100).toFixed(1)}%</TableCell><TableCell className="text-right"><span className={comp.difference >= 0 ? 'text-green-600' : 'text-red-600'}>{comp.difference >= 0 ? '+' : ''}{(comp.difference * 100).toFixed(1)}pp</span></TableCell><TableCell className="text-right">{comp.p_value.toFixed(4)}</TableCell><TableCell className="text-right"><Badge variant={comp.significant ? "default" : "secondary"} className="text-xs">{comp.significant ? "Yes" : "No"}</Badge></TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {segment_data.length > 0 && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Segment Analysis</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Segment</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Users</TableHead><TableHead className="text-right">Adopted</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
                <TableBody>
                  {segment_data.slice(0, 15).map((seg, idx) => (<TableRow key={idx}><TableCell className="font-medium">{seg.segment}</TableCell><TableCell>{seg.feature}</TableCell><TableCell className="text-right">{seg.total_users}</TableCell><TableCell className="text-right">{seg.adopted_users}</TableCell><TableCell className="text-right"><AdoptionBadge rate={seg.adoption_pct} target={target} /></TableCell></TableRow>))}
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
            onClick={() => setShowGuide(true)} 
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Guide
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

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
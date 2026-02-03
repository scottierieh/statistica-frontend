'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, GitCompare, CheckCircle, FileType, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, Users, Clock, FlaskConical, BarChart3, Shield, FileCode, Activity } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

const metricDefinitions: Record<string, string> = {
  did_estimate: "The Difference-in-Differences treatment effect estimate. Represents the causal impact of treatment on the outcome, calculated as (Treated_Post - Treated_Pre) - (Control_Post - Control_Pre).",
  treatment_effect: "The estimated causal impact of the intervention. Positive values indicate the treatment increased the outcome; negative values indicate a decrease.",
  parallel_trends: "The key assumption of DiD: without treatment, both groups would have followed the same trajectory over time. Cannot be proven, only supported by pre-treatment data.",
  standard_error: "A measure of uncertainty in the DiD estimate. Used to calculate confidence intervals and p-values.",
  p_value: "The probability of observing the estimated effect (or larger) if there were no true treatment effect. Values below 0.05 are typically considered statistically significant.",
  confidence_interval: "A range of plausible values for the true treatment effect. A 95% CI means we're 95% confident the true effect lies within this range.",
  treatment_group: "The group that received the intervention or policy change. Coded as 1 in the treatment indicator variable.",
  control_group: "The comparison group that did not receive the treatment. Used to estimate what would have happened to the treatment group without intervention.",
  pre_period: "The time period before the treatment or intervention was implemented. Used to establish baseline trends.",
  post_period: "The time period after the treatment was implemented. Compared to pre-period to measure changes.",
  interaction_term: "The Treatment × Post term in regression. Its coefficient IS the DiD estimate — the treatment effect.",
  r_squared: "The proportion of variance in the outcome explained by the model. Low R² is common in DiD since the goal is causal inference, not prediction.",
  clustered_se: "Standard errors that account for correlation within groups (e.g., same individuals over time). More conservative than regular SE.",
  covariates: "Control variables included in the regression to improve precision and account for observable differences between groups.",
  anticipation_effect: "When the treatment group changes behavior before the intervention (e.g., knowing a policy is coming). Can bias DiD results.",
  spillover_effect: "When the treatment indirectly affects the control group. Violates the stable unit treatment value assumption (SUTVA)."
};


interface ManualDiD { did_estimate: number; std_error: number; t_statistic: number | null; p_value: number | null; significant: boolean | null; ci_lower: number | null; ci_upper: number | null; means: { control_pre: number; control_post: number; treated_pre: number; treated_post: number; }; differences: { treated_diff: number; control_diff: number; }; sample_sizes: { control_pre: number; control_post: number; treated_pre: number; treated_post: number; }; }
interface Coefficient { term: string; estimate: number; std_error: number; t_value: number; p_value: number; ci_lower: number; ci_upper: number; significant: boolean; }
interface RegressionDiD { did_estimate: number; std_error: number; p_value: number; significant: boolean; coefficients: Coefficient[]; r_squared: number; adj_r_squared: number; f_statistic: number; f_pvalue: number; n_obs: number; aic: number; bic: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; effect_size: number; is_significant: boolean; recommendation: string; }
interface DescriptiveStats { n_total: number; n_treatment: number; n_control: number; outcome_mean: number; outcome_std: number; treatment_groups: string[]; time_periods: string[]; treated_pre_std: number | null; treated_post_std: number | null; control_pre_std: number | null; control_post_std: number | null; }
interface AnalysisResults { manual_did: ManualDiD; regression_did: RegressionDiD; descriptive_stats: DescriptiveStats; parallel_trends_plot: string | null; did_diagram: string | null; group_comparison: string | null; distribution_plot: string | null; interpretation: Interpretation; covariates_used: string[]; clustered_se: boolean; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const did = results.manual_did;
    const sig = did.significant;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">DiD Estimate</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${sig ? 'text-green-600' : ''}`}>{did.did_estimate?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{sig ? 'Significant effect' : 'Not significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">p-value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${(did.p_value || 1) < 0.05 ? 'text-green-600' : ''}`}>{(did.p_value || 0) < 0.001 ? '< .001' : did.p_value?.toFixed(4)}</p><p className="text-xs text-muted-foreground">SE: {did.std_error?.toFixed(3)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Treatment Δ</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${did.differences.treated_diff > 0 ? 'text-green-600' : 'text-red-600'}`}>{did.differences.treated_diff > 0 ? '+' : ''}{did.differences.treated_diff?.toFixed(2)}</p><p className="text-xs text-muted-foreground">Post - Pre</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Control Δ</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${did.differences.control_diff > 0 ? 'text-green-600' : 'text-red-600'}`}>{did.differences.control_diff > 0 ? '+' : ''}{did.differences.control_diff?.toFixed(2)}</p><p className="text-xs text-muted-foreground">Post - Pre</p></div></CardContent></Card>
        </div>
    );
};

const DiDGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Difference-in-Differences Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is DiD */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitCompare className="w-4 h-4" />
                What is Difference-in-Differences?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Difference-in-Differences (DiD) is a <strong>causal inference</strong> method that estimates 
                treatment effects by comparing the <strong>change over time</strong> in a treatment group 
                to the change in a control group.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The DiD Formula:</strong><br/>
                  <span className="text-muted-foreground text-xs font-mono">
                    DiD = (Y_treated,post - Y_treated,pre) - (Y_control,post - Y_control,pre)<br/><br/>
                    = (Treatment group change) - (Control group change)<br/><br/>
                    = Treatment effect (assuming parallel trends)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                When to Use DiD
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Ideal For</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Policy evaluations</li>
                    <li>• Natural experiments</li>
                    <li>• Program interventions</li>
                    <li>• Before/after studies with control</li>
                    <li>• When randomization isn't possible</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Requirements</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Two groups: treatment and control</li>
                    <li>• Two time periods: pre and post</li>
                    <li>• Continuous outcome variable</li>
                    <li>• Parallel trends assumption</li>
                    <li>• No spillover between groups</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* The Key Assumption */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                The Critical Assumption: Parallel Trends
              </h3>
              <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                  <strong>This is the most important assumption!</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Parallel trends</strong> assumes that without treatment, both groups would have 
                  followed the <strong>same trajectory</strong> over time.
                  <br/><br/>
                  <strong>If violated:</strong> The DiD estimate is biased and cannot be interpreted causally.
                  <br/><br/>
                  <strong>How to assess:</strong>
                  <br/>• Check pre-treatment trends (multiple periods if available)
                  <br/>• Groups should have similar slopes before intervention
                  <br/>• Cannot be proven, only supported by evidence
                </p>
              </div>
              
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Example of violation:</strong> If the treatment group was already improving faster 
                  than control before the intervention, DiD will overestimate the treatment effect.
                </p>
              </div>
            </div>

            <Separator />

            {/* Understanding Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Understanding DiD Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">DiD Estimate (Treatment Effect)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The estimated causal effect of the treatment.
                    <br/>• <strong>Positive:</strong> Treatment increased the outcome
                    <br/>• <strong>Negative:</strong> Treatment decreased the outcome
                    <br/>• Measured in units of the outcome variable
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Standard Error & p-value</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures precision and statistical significance.
                    <br/>• <strong>p &lt; 0.05:</strong> Statistically significant
                    <br/>• Consider clustered standard errors if data is grouped
                    <br/>• Large SE suggests imprecise estimate
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">95% Confidence Interval</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Range that likely contains the true effect.
                    <br/>• If CI excludes 0 → significant at α = 0.05
                    <br/>• Wider CI → more uncertainty
                    <br/>• Report CI alongside point estimate
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">R² (from Regression)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of variance explained.
                    <br/>• Low R² is normal in DiD (not the goal)
                    <br/>• DiD focuses on causal effect, not prediction
                    <br/>• Adding covariates may improve precision
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* The 2x2 Table */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                The DiD 2×2 Table
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2"></div>
                  <div className="p-2 font-semibold bg-blue-100 dark:bg-blue-900/30 rounded">Pre</div>
                  <div className="p-2 font-semibold bg-blue-100 dark:bg-blue-900/30 rounded">Post</div>
                  
                  <div className="p-2 font-semibold bg-muted rounded">Treatment</div>
                  <div className="p-2 bg-background rounded">Y₁₀</div>
                  <div className="p-2 bg-background rounded">Y₁₁</div>
                  
                  <div className="p-2 font-semibold bg-muted rounded">Control</div>
                  <div className="p-2 bg-background rounded">Y₀₀</div>
                  <div className="p-2 bg-background rounded">Y₀₁</div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground text-center">
                  <strong>DiD = (Y₁₁ - Y₁₀) - (Y₀₁ - Y₀₀)</strong>
                </div>
              </div>
            </div>

            <Separator />

            {/* Regression Specification */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                The DiD Regression
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm font-mono text-center mb-3">
                  Y = β₀ + β₁(Treatment) + β₂(Post) + <strong className="text-primary">β₃(Treatment × Post)</strong> + ε
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• <strong>β₀:</strong> Control group mean in pre-period</p>
                  <p>• <strong>β₁:</strong> Baseline difference between groups (pre-period)</p>
                  <p>• <strong>β₂:</strong> Time trend for control group</p>
                  <p>• <strong className="text-primary">β₃ (DiD):</strong> The treatment effect!</p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-xs text-primary">
                  <strong>Adding Covariates:</strong> Include control variables to improve precision 
                  and account for observable differences. The DiD coefficient should remain similar 
                  if parallel trends hold.
                </p>
              </div>
            </div>

            <Separator />

            {/* Common Pitfalls */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Pitfalls
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Anticipation Effects</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Treatment group changes behavior <strong>before</strong> the intervention 
                    (e.g., knowing policy is coming). Can bias results upward or downward.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Spillover Effects</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Treatment affects control group indirectly. Violates SUTVA 
                    (Stable Unit Treatment Value Assumption).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Differential Attrition</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Different dropout rates between groups over time. 
                    Check if sample composition changes.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Concurrent Events</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Other events happening at the same time as treatment. 
                    May confound the treatment effect.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Do</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Test parallel trends (if possible)</li>
                    <li>• Report 95% confidence intervals</li>
                    <li>• Use clustered standard errors</li>
                    <li>• Include relevant covariates</li>
                    <li>• Check for anticipation effects</li>
                    <li>• Visualize trends over time</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Assume parallel trends without checking</li>
                    <li>• Ignore clustering in data</li>
                    <li>• Over-control for post-treatment vars</li>
                    <li>• Forget about effect size interpretation</li>
                    <li>• Claim causality if assumptions fail</li>
                    <li>• Ignore outliers or data quality</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report DiD estimate, SE, p-value, CI</li>
                    <li>• Show group means table (2×2)</li>
                    <li>• Include parallel trends visualization</li>
                    <li>• Discuss assumption validity</li>
                    <li>• Report sample sizes per cell</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Extensions</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Event study (multiple time periods)</li>
                    <li>• Triple differences (DDD)</li>
                    <li>• Staggered treatment adoption</li>
                    <li>• Synthetic control method</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> DiD is a powerful method for causal 
                inference, but it relies heavily on the parallel trends assumption. Always visualize 
                pre-treatment trends, use appropriate standard errors (clustered if needed), and be 
                transparent about limitations. A significant DiD estimate only implies causation if 
                the assumptions are plausible.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const didExample = exampleDatasets.find(d => d.id === 'did-data' || d.id === 'causalInferenceData');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><GitCompare className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Difference-in-Differences</CardTitle>
                    <CardDescription className="text-base mt-2">Estimate causal effects by comparing groups before and after treatment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><FlaskConical className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Causal Inference</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Estimate treatment effects</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Users className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Control Group</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Compare treated vs untreated</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Clock className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Pre/Post Design</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Before and after comparison</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use DiD</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use DiD when you have panel data with treatment and control groups observed before and after an intervention. Ideal for policy evaluation and natural experiments.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Outcome:</strong> Numeric variable</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Treatment:</strong> Binary indicator (0/1)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Time:</strong> Two periods (pre/post)</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>DiD estimate:</strong> Causal effect</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Regression:</strong> With controls</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Confidence:</strong> 95% CI & p-value</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {didExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(didExample)} size="lg"><GitCompare className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Difference-in-Differences Glossary
                  </DialogTitle>
                  <DialogDescription>
                      Definitions of terms used in DiD causal inference analysis
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                      {Object.entries(metricDefinitions).map(([term, definition]) => (
                          <div key={term} className="border-b pb-3">
                              <h4 className="font-semibold capitalize">
                                  {term.replace(/_/g, ' ')}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                          </div>
                      ))}
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>
  );
};

interface DiDAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function DiDAnalysisPage({ data, allHeaders, onLoadExample }: DiDAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [outcomeCol, setOutcomeCol] = useState<string | undefined>();
    const [treatmentCol, setTreatmentCol] = useState<string | undefined>();
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [covariates, setCovariates] = useState<string[]>([]);
    const [clusterCol, setClusterCol] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length >= 8 && allHeaders.length >= 3, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const dataValidation = useMemo(() => {
        const treatmentUnique = treatmentCol ? [...new Set(data.map(r => r[treatmentCol]))].length : 0;
        const timeUnique = timeCol ? [...new Set(data.map(r => r[timeCol]))].length : 0;
        return [
            { label: 'Outcome variable selected', passed: !!outcomeCol, detail: outcomeCol || 'Select outcome' },
            { label: 'Treatment indicator (2 groups)', passed: !!treatmentCol && treatmentUnique === 2, detail: treatmentCol ? `${treatmentUnique} groups found` : 'Select treatment' },
            { label: 'Time period (2 periods)', passed: !!timeCol && timeUnique === 2, detail: timeCol ? `${timeUnique} periods found` : 'Select time' },
            { label: 'Sample size (n ≥ 8)', passed: data.length >= 8, detail: `n = ${data.length}` },
        ];
    }, [outcomeCol, treatmentCol, timeCol, data]);

    const allValidationsPassed = dataValidation.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setOutcomeCol(numericHeaders.find(h => h.toLowerCase().includes('outcome') || h.toLowerCase().includes('y') || h.toLowerCase().includes('score') || h.toLowerCase().includes('value')));
        setTreatmentCol(allHeaders.find(h => h.toLowerCase().includes('treat') || h.toLowerCase().includes('group') || h.toLowerCase().includes('intervention')));
        setTimeCol(allHeaders.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('period') || h.toLowerCase().includes('post') || h.toLowerCase().includes('pre')));
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `DiD_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const m = analysisResult.manual_did;
        const r = analysisResult.regression_did;
        let csv = `DIFFERENCE-IN-DIFFERENCES REPORT\nGenerated,${new Date().toISOString()}\n\nMANUAL DiD\nEstimate,${m.did_estimate?.toFixed(4)}\nSE,${m.std_error?.toFixed(4)}\np-value,${m.p_value?.toFixed(4)}\nSignificant,${m.significant}\n\n`;
        csv += `MEANS\nControl Pre,${m.means.control_pre?.toFixed(3)}\nControl Post,${m.means.control_post?.toFixed(3)}\nTreated Pre,${m.means.treated_pre?.toFixed(3)}\nTreated Post,${m.means.treated_post?.toFixed(3)}\n\n`;
        csv += `REGRESSION\n` + Papa.unparse(r.coefficients);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `DiD_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/did-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult,
                    outcomeCol,
                    treatmentCol,
                    timeCol,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `DiD_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, outcomeCol, treatmentCol, timeCol, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!outcomeCol || !treatmentCol || !timeCol) { toast({ variant: 'destructive', title: 'Error', description: 'Select required columns.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/difference-in-differences`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, outcome_col: outcomeCol, treatment_col: treatmentCol, time_col: timeCol, covariates: covariates.length > 0 ? covariates : null, cluster_col: clusterCol }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `DiD = ${result.manual_did.did_estimate?.toFixed(3)}` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, outcomeCol, treatmentCol, timeCol, covariates, clusterCol, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

    const ProgressBar = () => (
        <div className="mb-8"><div className="flex items-center justify-between w-full gap-2">
            {STEPS.map((step) => {
                const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                const isCurrent = currentStep === step.id;
                const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                return (
                    <button key={step.id} onClick={() => isAccessible && goToStep(step.id)} disabled={!isAccessible} className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                            {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                        </div>
                        <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                    </button>
                );
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <DiDGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />

            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Difference-in-Differences</h1>
                    <p className="text-muted-foreground mt-1">Causal effect estimation</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
                        <HelpCircle className="w-5 h-5" />
                    </Button>
                </div>
            </div>
            <ProgressBar />

            
            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose outcome, treatment, and time columns</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Outcome Variable (Y)</Label><Select value={outcomeCol} onValueChange={setOutcomeCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select outcome..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Treatment Group (0/1)</Label><Select value={treatmentCol} onValueChange={setTreatmentCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select treatment..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Time Period (pre/post)</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select time..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Observations: <strong>{data.length}</strong> | Treatment must have 2 groups, Time must have 2 periods</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!outcomeCol || !treatmentCol || !timeCol}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Optional covariates and clustering</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Control Variables (optional)</Label>
                                <ScrollArea className="h-32 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.filter(h => h !== outcomeCol).map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`cov-${h}`} checked={covariates.includes(h)} onCheckedChange={(c) => { if (c) setCovariates(prev => [...prev, h]); else setCovariates(prev => prev.filter(x => x !== h)); }} /><label htmlFor={`cov-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}
                                    </div>
                                </ScrollArea>
                            </div>
                            <div className="space-y-3"><Label>Cluster Variable (optional, for robust SE)</Label><Select value={clusterCol || '_none_'} onValueChange={v => setClusterCol(v === '_none_' ? undefined : v)}><SelectTrigger className="h-11"><SelectValue placeholder="Select cluster..." /></SelectTrigger><SelectContent><SelectItem value="_none_">None</SelectItem>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Regression model: Y = β₀ + β₁(Treatment) + β₂(Post) + <strong>β₃(Treatment×Post)</strong> + ε. The DiD effect is β₃.</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}<div><p className={`font-medium text-sm ${check.passed ? '' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></div>))}
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Outcome:</span> {outcomeCol}</div><div><span className="text-muted-foreground">Treatment:</span> {treatmentCol}</div><div><span className="text-muted-foreground">Time:</span> {timeCol}</div><div><span className="text-muted-foreground">Covariates:</span> {covariates.length || 'None'}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><GitCompare className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">DiD will estimate the causal effect by comparing treatment vs control group changes over time.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const did = results.manual_did;
                    const sig = did.significant;
                    const effectDirection = did.did_estimate > 0 ? 'positive' : 'negative';
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>DiD treatment effect estimate</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${sig ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${sig ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• DiD estimate: <strong>{did.did_estimate?.toFixed(3)}</strong> — the treatment {effectDirection === 'positive' ? 'increased' : 'decreased'} the outcome by {Math.abs(did.did_estimate).toFixed(3)} units.</p>
                                        <p className="text-sm">• Statistical significance: <strong>{sig ? 'Yes' : 'No'}</strong> (p = {(did.p_value || 0) < 0.001 ? '< .001' : did.p_value?.toFixed(4)}).</p>
                                        <p className="text-sm">• Treatment group changed by <strong>{did.differences.treated_diff > 0 ? '+' : ''}{did.differences.treated_diff?.toFixed(2)}</strong>, control group by <strong>{did.differences.control_diff > 0 ? '+' : ''}{did.differences.control_diff?.toFixed(2)}</strong>.</p>
                                        <p className="text-sm">• 95% CI: [{did.ci_lower?.toFixed(2)}, {did.ci_upper?.toFixed(2)}].</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${sig ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {sig ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{sig ? "Significant Treatment Effect!" : "No Significant Effect"}</p><p className="text-sm text-muted-foreground mt-1">{sig ? "The treatment had a statistically significant causal impact on the outcome, assuming parallel trends hold." : "Insufficient evidence for a causal effect. This could reflect a true null effect or limited statistical power."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• p-value: {(did.p_value || 0) < 0.001 ? '< .001' : did.p_value?.toFixed(4)} — {sig ? 'below 0.05 threshold' : 'above 0.05 threshold'}</p><p>• Effect size: {Math.abs(did.did_estimate).toFixed(3)} units — {Math.abs(did.did_estimate) > 1 ? 'substantial' : 'modest'} magnitude</p><p>• R²: {results.regression_did.r_squared?.toFixed(3)} — model explains {(results.regression_did.r_squared * 100).toFixed(1)}% of variance</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Confidence:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (sig && (did.p_value || 1) < 0.01 ? 5 : sig ? 4 : (did.p_value || 1) < 0.1 ? 3 : 2) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <Card className="bg-blue-50 dark:bg-blue-950/20"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Control Pre</p><p className="text-xl font-bold">{did.means.control_pre?.toFixed(2)}</p></CardContent></Card>
                                    <Card className="bg-blue-100 dark:bg-blue-900/20"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Control Post</p><p className="text-xl font-bold">{did.means.control_post?.toFixed(2)}</p></CardContent></Card>
                                    <Card className="bg-red-50 dark:bg-red-950/20"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Treated Pre</p><p className="text-xl font-bold">{did.means.treated_pre?.toFixed(2)}</p></CardContent></Card>
                                    <Card className="bg-red-100 dark:bg-red-900/20"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Treated Post</p><p className="text-xl font-bold">{did.means.treated_post?.toFixed(2)}</p></CardContent></Card>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const did = results.manual_did;
                    const sig = did.significant;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding DiD results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How DiD Works</h4><p className="text-sm text-muted-foreground">DiD compares the change in outcomes over time between a treatment group and a control group. By subtracting the control group's change from the treatment group's change, we remove common time trends and isolate the treatment effect.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">The DiD Calculation</h4><p className="text-sm text-muted-foreground">Treatment group: {did.means.treated_post?.toFixed(2)} - {did.means.treated_pre?.toFixed(2)} = <strong>{did.differences.treated_diff?.toFixed(2)}</strong><br/>Control group: {did.means.control_post?.toFixed(2)} - {did.means.control_pre?.toFixed(2)} = <strong>{did.differences.control_diff?.toFixed(2)}</strong><br/>DiD = {did.differences.treated_diff?.toFixed(2)} - {did.differences.control_diff?.toFixed(2)} = <strong>{did.did_estimate?.toFixed(3)}</strong></p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Statistical Inference</h4><p className="text-sm text-muted-foreground">The p-value of {(did.p_value || 0) < 0.001 ? '< .001' : did.p_value?.toFixed(4)} indicates the probability of observing this effect (or larger) if the true effect were zero. {sig ? 'Since p < 0.05, we reject the null hypothesis and conclude the treatment had a significant effect.' : 'Since p ≥ 0.05, we cannot reject the null hypothesis of no treatment effect.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Key Assumption: Parallel Trends</h4><p className="text-sm text-muted-foreground">DiD assumes that without treatment, both groups would have followed similar trends over time. This is unprovable but can be assessed by checking pre-treatment trends. Violations of this assumption can bias the estimate.</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${sig ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{sig ? <><CheckCircle2 className="w-5 h-5 text-primary" />Causal Interpretation</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Interpretation Caution</>}</h4><p className="text-sm text-muted-foreground">{sig ? `The treatment caused a ${did.did_estimate > 0 ? 'positive' : 'negative'} change of ${Math.abs(did.did_estimate).toFixed(3)} units in the outcome, controlling for time trends common to both groups.` : `We cannot conclude that the treatment had a causal effect. The observed DiD of ${did.did_estimate?.toFixed(3)} is not statistically distinguishable from zero.`}</p></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (() => {
                    const did = results.manual_did;
                    const sig = did.significant;
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator /><DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileCode className="mr-2 h-4 w-4" />Python<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Difference-in-Differences Report</h2><p className="text-sm text-muted-foreground mt-1">n = {results.descriptive_stats.n_total} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            {/* Detailed Analysis - APA Format */}
                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-semibold">Statistical Summary</h3>
                                        </div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A difference-in-differences (DiD) analysis was conducted to estimate the causal effect of treatment on <em>{outcomeCol}</em>. 
                                                The sample consisted of <em>N</em> = {results.descriptive_stats.n_total} observations, with {did.sample_sizes.treated_pre + did.sample_sizes.treated_post} in the treatment group and {did.sample_sizes.control_pre + did.sample_sizes.control_post} in the control group.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Before the intervention, the treatment group mean was <span className="font-mono">{did.means.treated_pre?.toFixed(2)}</span> and the control group mean was <span className="font-mono">{did.means.control_pre?.toFixed(2)}</span>. 
                                                After the intervention, the treatment group mean changed to <span className="font-mono">{did.means.treated_post?.toFixed(2)}</span> (Δ = {did.differences.treated_diff > 0 ? '+' : ''}{did.differences.treated_diff?.toFixed(2)}) and the control group mean changed to <span className="font-mono">{did.means.control_post?.toFixed(2)}</span> (Δ = {did.differences.control_diff > 0 ? '+' : ''}{did.differences.control_diff?.toFixed(2)}).
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The DiD estimate was <span className="font-mono">{did.did_estimate?.toFixed(3)}</span> (<em>SE</em> = <span className="font-mono">{did.std_error?.toFixed(3)}</span>), 
                                                indicating that the treatment {did.did_estimate > 0 ? 'increased' : 'decreased'} the outcome by {Math.abs(did.did_estimate).toFixed(3)} units relative to the control group. 
                                                This effect was {sig ? 'statistically significant' : 'not statistically significant'}, 
                                                <em>t</em> = <span className="font-mono">{did.t_statistic?.toFixed(2)}</span>, 
                                                <em>p</em> {(did.p_value || 0) < 0.001 ? '< .001' : `= ${did.p_value?.toFixed(3)}`}, 
                                                95% CI [<span className="font-mono">{did.ci_lower?.toFixed(2)}</span>, <span className="font-mono">{did.ci_upper?.toFixed(2)}</span>].
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The regression model explained {(results.regression_did.r_squared * 100)?.toFixed(1)}% of the variance in the outcome (<em>R</em>² = <span className="font-mono">{results.regression_did.r_squared?.toFixed(3)}</span>). 
                                                {sig ? ' These findings suggest that the treatment had a meaningful causal impact on the outcome, assuming the parallel trends assumption holds.' : ' The non-significant result suggests insufficient evidence for a causal effect of the treatment, though this may reflect limited statistical power or a true null effect.'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="diagram" className="w-full"><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="diagram">DiD Diagram</TabsTrigger><TabsTrigger value="trends">Parallel Trends</TabsTrigger><TabsTrigger value="comparison">Group Comparison</TabsTrigger><TabsTrigger value="distribution">Distribution</TabsTrigger></TabsList><TabsContent value="diagram" className="mt-4">{results.did_diagram ? <Image src={`data:image/png;base64,${results.did_diagram}`} alt="DiD Diagram" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="trends" className="mt-4">{results.parallel_trends_plot ? <Image src={`data:image/png;base64,${results.parallel_trends_plot}`} alt="Parallel Trends" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="comparison" className="mt-4">{results.group_comparison ? <Image src={`data:image/png;base64,${results.group_comparison}`} alt="Group Comparison" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="distribution" className="mt-4">{results.distribution_plot ? <Image src={`data:image/png;base64,${results.distribution_plot}`} alt="Distribution" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Regression Results</CardTitle><CardDescription>OLS regression with interaction term</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Term</TableHead><TableHead className="text-right">Estimate</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">t</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">95% CI</TableHead><TableHead>Sig</TableHead></TableRow></TableHeader><TableBody>{results.regression_did.coefficients?.map((c, i) => (<TableRow key={i} className={c.term.includes('DiD') ? 'bg-primary/5 font-semibold' : ''}><TableCell>{c.term}</TableCell><TableCell className="text-right font-mono">{c.estimate?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{c.std_error?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{c.t_value?.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{c.p_value < 0.001 ? '< .001' : c.p_value?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">[{c.ci_lower?.toFixed(2)}, {c.ci_upper?.toFixed(2)}]</TableCell><TableCell>{c.significant ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell></TableRow>))}</TableBody></Table><div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">{[{label: 'R²', value: results.regression_did.r_squared?.toFixed(3)}, {label: 'Adj. R²', value: results.regression_did.adj_r_squared?.toFixed(3)}, {label: 'F-stat', value: results.regression_did.f_statistic?.toFixed(2)}, {label: 'AIC', value: results.regression_did.aic?.toFixed(1)}].map((item, i) => (<div key={i} className="p-2 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">{item.label}</p><p className="font-semibold">{item.value}</p></div>))}</div></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Sample Sizes</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">{[{label: 'Control Pre', value: did.sample_sizes.control_pre}, {label: 'Control Post', value: did.sample_sizes.control_post}, {label: 'Treated Pre', value: did.sample_sizes.treated_pre}, {label: 'Treated Post', value: did.sample_sizes.treated_post}].map((item, i) => (<div key={i} className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-lg font-semibold">{item.value}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Group Means Summary</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Group</TableHead><TableHead className="text-right">Pre</TableHead><TableHead className="text-right">Post</TableHead><TableHead className="text-right">Difference</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">Treatment</TableCell><TableCell className="text-right font-mono">{did.means.treated_pre?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{did.means.treated_post?.toFixed(3)}</TableCell><TableCell className={`text-right font-mono font-semibold ${did.differences.treated_diff > 0 ? 'text-green-600' : 'text-red-600'}`}>{did.differences.treated_diff > 0 ? '+' : ''}{did.differences.treated_diff?.toFixed(3)}</TableCell></TableRow><TableRow><TableCell className="font-medium">Control</TableCell><TableCell className="text-right font-mono">{did.means.control_pre?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{did.means.control_post?.toFixed(3)}</TableCell><TableCell className={`text-right font-mono font-semibold ${did.differences.control_diff > 0 ? 'text-green-600' : 'text-red-600'}`}>{did.differences.control_diff > 0 ? '+' : ''}{did.differences.control_diff?.toFixed(3)}</TableCell></TableRow><TableRow className="bg-primary/5"><TableCell className="font-bold">DiD Effect</TableCell><TableCell></TableCell><TableCell></TableCell><TableCell className="text-right font-mono font-bold">{did.did_estimate?.toFixed(3)}</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running DiD analysis...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
        </div>
    );
}
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
import { Loader2, HelpCircle, Link2, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, Users, Scale, FlaskConical, Shuffle, Shield, FileCode, BarChart3, Activity } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

const metricDefinitions: Record<string, string> = {
  propensity_score: "The estimated probability of receiving treatment given observed covariates. Calculated via logistic regression. Ranges from 0 to 1.",
  att: "Average Treatment Effect on the Treated. The average causal effect of treatment for those who actually received it. E[Y(1) - Y(0) | T=1].",
  ate: "Average Treatment Effect. The average causal effect if treatment were randomly assigned to anyone in the population.",
  matching: "The process of pairing treated units with control units that have similar propensity scores, creating comparable groups.",
  nearest_neighbor: "A matching method that pairs each treated unit with the control unit having the closest propensity score.",
  caliper: "A maximum distance threshold for matching. Only allows matches within this distance (in SD of propensity scores). Prevents bad matches.",
  with_replacement: "Matching where control units can be used multiple times. Improves match quality but requires adjusted standard errors.",
  standardized_difference: "A measure of covariate balance between groups. |d| < 0.1 indicates good balance; > 0.25 indicates concerning imbalance.",
  covariate_balance: "The similarity of covariate distributions between treatment and control groups. The goal of PSM is to achieve balance.",
  common_support: "The region of propensity score values where both treatment and control units exist. Causal inference is only valid within this region.",
  overlap: "The degree to which treatment and control propensity score distributions overlap. Poor overlap limits valid causal inference.",
  selection_bias: "Systematic differences between treatment and control groups that confound the treatment effect. PSM aims to reduce this.",
  confounding: "When a variable affects both treatment assignment and the outcome, biasing the estimated treatment effect.",
  unmeasured_confounding: "Confounders not included in the propensity score model. PSM cannot adjust for these, potentially biasing results.",
  logistic_regression: "The statistical model used to estimate propensity scores. Predicts P(Treatment=1 | Covariates).",
  match_rate: "The percentage of treated units successfully matched to controls. Low rates indicate poor overlap or strict caliper."
};


interface BalanceStat { covariate: string; mean_treated_before: number; mean_control_before: number; std_diff_before: number; balance_before: boolean; mean_treated_after?: number; mean_control_after?: number; std_diff_after?: number; balance_after?: boolean; improvement?: number; }
interface TreatmentEffect { ate?: number; att?: number; treated_mean: number; control_mean: number; std_error?: number; ci_lower?: number; ci_upper?: number; t_statistic: number; p_value: number; significant: boolean; n_pairs?: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { propensity_score_model: { coefficients: Record<string, {coefficient: number; odds_ratio: number}>; intercept: number; accuracy: number; }; matching_results: { n_matched: number; match_rate: number; method: string; caliper: number | null; with_replacement: boolean; }; balance_statistics: BalanceStat[]; balance_summary: { before: number; after: number; }; treatment_effects: { naive_estimate: TreatmentEffect; matched_estimate: TreatmentEffect; }; descriptive_stats: { n_total: number; n_treated: number; n_control: number; ps_mean: number; ps_std: number; ps_min: number; ps_max: number; }; ps_distribution_plot: string | null; balance_plot: string | null; matching_plot: string | null; outcome_plot: string | null; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const att = results.treatment_effects.matched_estimate;
    const sig = att.significant;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">ATT (Matched)</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${sig ? 'text-green-600' : ''}`}>{att.att?.toFixed(3)}</p><p className="text-xs text-muted-foreground">SE: {att.std_error?.toFixed(3)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">p-value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${att.p_value < 0.05 ? 'text-green-600' : ''}`}>{att.p_value < 0.001 ? '< .001' : att.p_value?.toFixed(4)}</p><p className="text-xs text-muted-foreground">{sig ? 'Significant' : 'Not significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Matched Pairs</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold text-green-600">{results.matching_results.n_matched}</p><p className="text-xs text-muted-foreground">{results.matching_results.match_rate?.toFixed(0)}% rate</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Balance After</p><Scale className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold text-green-600">{results.balance_summary.after?.toFixed(0)}%</p><p className="text-xs text-muted-foreground">vs {results.balance_summary.before?.toFixed(0)}% before</p></div></CardContent></Card>
        </div>
    );
};

const PSMGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Propensity Score Matching Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is PSM */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                What is Propensity Score Matching?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Propensity Score Matching (PSM) is a <strong>causal inference</strong> technique that 
                reduces selection bias in observational studies by <strong>matching treated units</strong> 
                with similar control units based on their predicted probability of treatment.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Key Idea:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Estimate the probability of treatment (propensity score) for each unit<br/>
                    2. Match treated units with control units having similar scores<br/>
                    3. Compare outcomes between matched pairs<br/>
                    4. The difference = treatment effect (assuming no unmeasured confounding)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                When to Use PSM
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Ideal For</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Observational studies (no randomization)</li>
                    <li>• Treatment assignment based on observed factors</li>
                    <li>• Wanting to mimic RCT-like comparison</li>
                    <li>• When regression adjustment is insufficient</li>
                    <li>• Policy or program evaluation</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Requirements</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Binary treatment (0 or 1)</li>
                    <li>• Continuous outcome variable</li>
                    <li>• Covariates predicting treatment</li>
                    <li>• Overlap: Both groups at each PS level</li>
                    <li>• No unmeasured confounders (unverifiable)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* The Propensity Score */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Understanding Propensity Scores
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">What is a Propensity Score?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The propensity score is the <strong>probability of receiving treatment</strong> 
                    given observed covariates: <em>e(X) = P(T=1|X)</em>
                    <br/><br/>
                    • Estimated via logistic regression
                    <br/>• Ranges from 0 to 1
                    <br/>• Summarizes all covariates into a single number
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Why Match on Propensity Score?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Balancing property:</strong> At each PS value, the distribution of 
                    covariates is similar between treatment and control.
                    <br/><br/>
                    This reduces the "curse of dimensionality" — instead of matching on many 
                    covariates, match on a single score.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Overlap/Common Support</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For valid matching, both groups need units at similar PS values.
                    <br/><br/>
                    • Check PS distribution plots for overlap
                    <br/>• Discard units outside the common support region
                    <br/>• Poor overlap limits causal inference
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Matching Methods */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Matching Methods
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Nearest Neighbor Matching</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Match each treated unit to the control with closest PS.
                    <br/>• Most common method
                    <br/>• Simple and intuitive
                    <br/>• Can be with or without replacement
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Caliper Matching</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only allow matches within a maximum distance (caliper).
                    <br/>• Common caliper: 0.2 × SD of propensity scores
                    <br/>• Prevents bad matches (distant neighbors)
                    <br/>• May leave some treated units unmatched
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">With vs Without Replacement</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Without replacement:</strong> Each control used once
                    <br/>• Order of matching matters
                    <br/>• May lead to poor matches for later units
                    <br/><br/>
                    <strong>With replacement:</strong> Controls can be reused
                    <br/>• Better matches on average
                    <br/>• Need to account for repeated controls in SE
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Understanding PSM Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">ATT (Average Treatment Effect on Treated)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The average effect for those who <strong>actually received</strong> treatment.
                    <br/><br/>
                    <strong>ATT = E[Y(1) - Y(0) | T=1]</strong>
                    <br/><br/>
                    • Most common estimand in PSM
                    <br/>• Answers: "What was the effect on those treated?"
                    <br/>• Different from ATE (effect on random person)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Covariate Balance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measured by <strong>standardized difference</strong> (|d|):
                    <br/>• |d| &lt; 0.1 = balanced (good)
                    <br/>• |d| 0.1-0.25 = acceptable
                    <br/>• |d| &gt; 0.25 = imbalanced (concerning)
                    <br/><br/>
                    Goal: All covariates balanced after matching.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Match Rate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Percentage of treated units successfully matched.
                    <br/>• Low rate = poor overlap or strict caliper
                    <br/>• Losing many treated units affects generalizability
                    <br/>• Consider loosening caliper if rate is too low
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Naive vs Matched Estimate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Naive:</strong> Simple difference in means (biased)
                    <br/><strong>Matched:</strong> Difference after PSM (less biased)
                    <br/><br/>
                    Large difference between them indicates substantial selection bias 
                    that PSM corrected.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Assumption */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Assumption: No Unmeasured Confounding
              </h3>
              <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                  <strong>This cannot be tested!</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  PSM assumes that <strong>all confounders are observed</strong> and included in the model.
                  <br/><br/>
                  If there are unmeasured variables that affect both treatment assignment and outcome, 
                  the ATT estimate will be <strong>biased</strong>.
                  <br/><br/>
                  <strong>Mitigations:</strong>
                  <br/>• Include all plausible confounders
                  <br/>• Conduct sensitivity analysis
                  <br/>• Be transparent about limitations
                </p>
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
                    <li>• Include all known confounders</li>
                    <li>• Check PS overlap between groups</li>
                    <li>• Assess covariate balance after matching</li>
                    <li>• Report match rate and unmatched units</li>
                    <li>• Use caliper (e.g., 0.2 SD)</li>
                    <li>• Consider sensitivity analysis</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Include post-treatment variables</li>
                    <li>• Ignore poor overlap</li>
                    <li>• Skip balance checking</li>
                    <li>• Over-interpret with poor balance</li>
                    <li>• Assume PSM fixes all bias</li>
                    <li>• Forget about unmeasured confounding</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• PS model specification</li>
                    <li>• Matching method and caliper</li>
                    <li>• Match rate and sample sizes</li>
                    <li>• Balance table (before/after)</li>
                    <li>• ATT with SE, CI, p-value</li>
                    <li>• Discuss unmeasured confounding</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Alternatives</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• IPTW (Inverse Probability Weighting)</li>
                    <li>• Doubly Robust estimators</li>
                    <li>• Coarsened Exact Matching</li>
                    <li>• Regression with PS as covariate</li>
                    <li>• Instrumental Variables (if available)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Issues */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Issues
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Poor Overlap</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Treatment and control PS distributions don't overlap.
                    <br/>• Limits the region where causal inference is valid
                    <br/>• Solution: Restrict to common support, reconsider design
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Persistent Imbalance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Covariates still imbalanced after matching.
                    <br/>• May need different PS model or matching method
                    <br/>• Consider regression adjustment on residual imbalance
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Low Match Rate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Many treated units go unmatched.
                    <br/>• Widen caliper (with caution)
                    <br/>• Use matching with replacement
                    <br/>• ATT only applies to matched treated units
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> PSM is a powerful tool for reducing 
                selection bias, but it cannot eliminate bias from unmeasured confounders. Always check 
                overlap and balance, report your methods transparently, and discuss limitations. 
                The goal is comparable groups — if balance is poor, reconsider your approach. 
                PSM estimates ATT (effect on treated), not ATE (effect on everyone).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const psmExample = exampleDatasets.find(d => d.id === 'psmMarketing-data'|| d.id === 'causal');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Link2 className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Propensity Score Matching</CardTitle>
                    <CardDescription className="text-base mt-2">Match treatment and control units to estimate causal effects</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Scale className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Balance Covariates</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Reduce selection bias</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Shuffle className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Nearest Neighbor</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Match similar units</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><FlaskConical className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">ATT Estimation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Average treatment effect</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use PSM</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use PSM when you have observational data with treatment and control groups and want to reduce selection bias by matching on observed covariates.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Treatment:</strong> Binary (0/1)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Outcome:</strong> Numeric variable</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Covariates:</strong> 1+ matching variables</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>ATT:</strong> Treatment effect on treated</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Balance:</strong> Covariate improvement</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Confidence:</strong> 95% CI & p-value</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {psmExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(psmExample)} size="lg"><Link2 className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
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
                      Propensity Score Matching Glossary
                  </DialogTitle>
                  <DialogDescription>
                      Definitions of terms used in PSM causal inference analysis
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


interface PSMAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function PSMAnalysisPage({ data, allHeaders, onLoadExample }: PSMAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [treatmentCol, setTreatmentCol] = useState<string | undefined>();
    const [outcomeCol, setOutcomeCol] = useState<string | undefined>();
    const [covariates, setCovariates] = useState<string[]>([]);
    const [matchingMethod, setMatchingMethod] = useState('nearest');
    const [caliper, setCaliper] = useState(0.2);
    const [withReplacement, setWithReplacement] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length >= 20 && allHeaders.length >= 3, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const dataValidation = useMemo(() => {
        const treatmentVals = treatmentCol ? [...new Set(data.map(r => Number(r[treatmentCol])))] : [];
        const isBinary = treatmentVals.length === 2 && treatmentVals.every(v => v === 0 || v === 1);
        return [
            { label: 'Treatment variable (binary 0/1)', passed: !!treatmentCol && isBinary, detail: treatmentCol ? (isBinary ? 'Binary OK' : 'Must be 0/1') : 'Select treatment' },
            { label: 'Outcome variable selected', passed: !!outcomeCol, detail: outcomeCol || 'Select outcome' },
            { label: 'Covariates selected (≥1)', passed: covariates.length >= 1, detail: `${covariates.length} selected` },
            { label: 'Sample size (n ≥ 20)', passed: data.length >= 20, detail: `n = ${data.length}` },
        ];
    }, [treatmentCol, outcomeCol, covariates, data]);

    const allValidationsPassed = dataValidation.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setTreatmentCol(allHeaders.find(h => h.toLowerCase().includes('treat') || h.toLowerCase().includes('group') || h.toLowerCase() === 't'));
        setOutcomeCol(numericHeaders.find(h => h.toLowerCase().includes('outcome') || h.toLowerCase().includes('y') || h.toLowerCase().includes('result')));
        setCovariates(numericHeaders.filter(h => h.toLowerCase().includes('age') || h.toLowerCase().includes('income') || h.toLowerCase().includes('x')).slice(0, 5));
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `PSM_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const att = analysisResult.treatment_effects.matched_estimate;
        let csv = `PROPENSITY SCORE MATCHING REPORT\nGenerated,${new Date().toISOString()}\n\nMATCHING RESULTS\nMatched,${analysisResult.matching_results.n_matched}\nMatch Rate,${analysisResult.matching_results.match_rate?.toFixed(1)}%\n\nTREATMENT EFFECT (ATT)\nEstimate,${att.att?.toFixed(4)}\nSE,${att.std_error?.toFixed(4)}\np-value,${att.p_value?.toFixed(4)}\n\n`;
        csv += `BALANCE STATISTICS\n` + Papa.unparse(analysisResult.balance_statistics);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `PSM_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!treatmentCol || !outcomeCol || covariates.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select required variables.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/propensity-score-matching`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, treatment_col: treatmentCol, outcome_col: outcomeCol, covariates, matching_method: matchingMethod, caliper, with_replacement: withReplacement }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `${result.matching_results.n_matched} pairs matched` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, treatmentCol, outcomeCol, covariates, matchingMethod, caliper, withReplacement, toast]);

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
            <PSMGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />

            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Propensity Score Matching</h1>
                    <p className="text-muted-foreground mt-1">Causal inference via matching</p>
                </div>
                {/* 👇 버튼 수정 */}
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose treatment, outcome, and covariates</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Treatment (0/1)</Label><Select value={treatmentCol} onValueChange={setTreatmentCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select treatment..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-3"><Label className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Outcome (Y)</Label><Select value={outcomeCol} onValueChange={setOutcomeCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select outcome..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="space-y-3">
                                <Label>Covariates (X) - Variables to match on</Label>
                                <ScrollArea className="h-40 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.filter(h => h !== treatmentCol && h !== outcomeCol).map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`cov-${h}`} checked={covariates.includes(h)} onCheckedChange={(c) => { if (c) setCovariates(prev => [...prev, h]); else setCovariates(prev => prev.filter(x => x !== h)); }} /><label htmlFor={`cov-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">Selected: {covariates.length} covariates</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Observations: <strong>{data.length}</strong> | Select covariates that predict treatment assignment</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!treatmentCol || !outcomeCol || covariates.length < 1}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Matching Settings</CardTitle><CardDescription>Configure matching parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label>Matching Method</Label><Select value={matchingMethod} onValueChange={setMatchingMethod}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nearest">Nearest Neighbor</SelectItem><SelectItem value="caliper">Caliper Matching</SelectItem></SelectContent></Select></div>
                                <div className="space-y-3"><Label>Caliper Width (in SD)</Label><Input type="number" value={caliper} onChange={(e) => setCaliper(parseFloat(e.target.value) || 0.2)} min={0.01} max={1} step={0.05} className="h-11" /></div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"><div><Label>With Replacement</Label><p className="text-xs text-muted-foreground mt-1">Allow control units to be matched multiple times</p></div><Switch checked={withReplacement} onCheckedChange={setWithReplacement} /></div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>A caliper of 0.2 means matches must be within 0.2 standard deviations of the propensity score. Smaller = stricter matching, fewer matches.</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Treatment:</span> {treatmentCol}</div><div><span className="text-muted-foreground">Outcome:</span> {outcomeCol}</div><div><span className="text-muted-foreground">Covariates:</span> {covariates.length}</div><div><span className="text-muted-foreground">Caliper:</span> {caliper}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Link2 className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">PSM will estimate propensity scores and match treated units to similar control units.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Matching...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const att = results.treatment_effects.matched_estimate;
                    const naive = results.treatment_effects.naive_estimate;
                    const sig = att.significant;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{results.matching_results.n_matched} pairs matched</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${sig ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${sig ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• ATT (matched): <strong>{att.att?.toFixed(3)}</strong> — treatment {(att.att || 0) > 0 ? 'increased' : 'decreased'} outcome by {Math.abs(att.att || 0).toFixed(3)} units.</p>
                                        <p className="text-sm">• Statistical significance: <strong>{sig ? 'Yes' : 'No'}</strong> (p = {att.p_value < 0.001 ? '< .001' : att.p_value?.toFixed(4)}).</p>
                                        <p className="text-sm">• Matching: <strong>{results.matching_results.n_matched}</strong> pairs ({results.matching_results.match_rate?.toFixed(0)}% match rate).</p>
                                        <p className="text-sm">• Balance improved: <strong>{results.balance_summary.before?.toFixed(0)}%</strong> → <strong>{results.balance_summary.after?.toFixed(0)}%</strong> balanced.</p>
                                        <p className="text-sm">• 95% CI: [{att.ci_lower?.toFixed(2)}, {att.ci_upper?.toFixed(2)}].</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${sig ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {sig ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{sig ? "Significant Treatment Effect!" : "No Significant Effect"}</p><p className="text-sm text-muted-foreground mt-1">{sig ? "After matching on covariates, the treatment had a statistically significant effect on the outcome." : "After matching, insufficient evidence for a treatment effect. This could reflect a true null effect or limited statistical power."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Naive (unmatched) estimate: {naive.ate?.toFixed(3)}</p><p>• Matched estimate (ATT): {att.att?.toFixed(3)}</p><p>• Bias reduced: {Math.abs((naive.ate || 0) - (att.att || 0)).toFixed(3)}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Confidence:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (sig && att.p_value < 0.01 ? 5 : sig ? 4 : att.p_value < 0.1 ? 3 : 2) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Matched Pairs</p><p className="text-2xl font-bold text-green-600">{results.matching_results.n_matched}</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Match Rate</p><p className="text-2xl font-bold">{results.matching_results.match_rate?.toFixed(0)}%</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Balance Before</p><p className="text-2xl font-bold text-red-600">{results.balance_summary.before?.toFixed(0)}%</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Balance After</p><p className="text-2xl font-bold text-green-600">{results.balance_summary.after?.toFixed(0)}%</p></CardContent></Card>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const att = results.treatment_effects.matched_estimate;
                    const naive = results.treatment_effects.naive_estimate;
                    const sig = att.significant;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding PSM results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How PSM Works</h4><p className="text-sm text-muted-foreground">PSM estimates the probability (propensity score) of receiving treatment based on observed covariates. Units with similar scores are matched, creating comparable treatment and control groups that reduce selection bias.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Matching Results</h4><p className="text-sm text-muted-foreground">{results.matching_results.n_matched} of {results.descriptive_stats.n_treated} treated units were successfully matched ({results.matching_results.match_rate?.toFixed(1)}%). Caliper of {results.matching_results.caliper?.toFixed(3) || caliper} SD was used to ensure quality matches.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Covariate Balance</h4><p className="text-sm text-muted-foreground">Before matching, {results.balance_summary.before?.toFixed(0)}% of covariates were balanced (|d| &lt; 0.1). After matching, {results.balance_summary.after?.toFixed(0)}% are balanced. {results.balance_summary.after >= 80 ? 'This indicates good overlap between groups.' : 'Consider additional covariates or methods.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Treatment Effect Interpretation</h4><p className="text-sm text-muted-foreground">The ATT of {att.att?.toFixed(3)} represents the average effect on those who received treatment. The naive estimate was {naive.ate?.toFixed(3)}, showing {Math.abs((naive.ate || 0) - (att.att || 0)) > 0.1 ? 'substantial' : 'modest'} selection bias in the unmatched comparison.</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${sig ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{sig ? <><CheckCircle2 className="w-5 h-5 text-primary" />Causal Interpretation</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Interpretation Caution</>}</h4><p className="text-sm text-muted-foreground">{sig ? `The treatment caused a ${(att.att || 0) > 0 ? 'positive' : 'negative'} change of ${Math.abs(att.att || 0).toFixed(3)} units in the outcome for treated individuals, after controlling for observed confounders.` : `We cannot conclude that the treatment had a causal effect. The ATT of ${att.att?.toFixed(3)} is not statistically distinguishable from zero.`}</p></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (() => {
                    const att = results.treatment_effects.matched_estimate;
                    const naive = results.treatment_effects.naive_estimate;
                    const sig = att.significant;
                    const handleDownloadWord = () => {
                        const content = `Propensity Score Matching Report\nGenerated: ${new Date().toLocaleString()}\n\n` +
                            `SUMMARY\n${'='.repeat(50)}\nATT (Matched): ${att.att?.toFixed(3)}\nStandard Error: ${att.std_error?.toFixed(3)}\np-value: ${att.p_value < 0.001 ? '< .001' : att.p_value?.toFixed(4)}\n95% CI: [${att.ci_lower?.toFixed(2)}, ${att.ci_upper?.toFixed(2)}]\nNaive ATE: ${naive.ate?.toFixed(3)}\nResult: ${sig ? 'Significant treatment effect' : 'No significant effect'}\n\n` +
                            `MATCHING RESULTS\n${'='.repeat(50)}\nTotal Observations: ${results.descriptive_stats.n_total}\nTreated: ${results.descriptive_stats.n_treated}\nControl: ${results.descriptive_stats.n_control}\nMatched Pairs: ${results.matching_results.n_matched}\nMatch Rate: ${results.matching_results.match_rate?.toFixed(1)}%\n\n` +
                            `COVARIATE BALANCE\n${'='.repeat(50)}\nBalance Before: ${results.balance_summary.before?.toFixed(0)}%\nBalance After: ${results.balance_summary.after?.toFixed(0)}%\n\n` +
                            `APA SUMMARY\n${'='.repeat(50)}\nPropensity score matching was conducted with N = ${results.descriptive_stats.n_total} observations. The ATT was ${att.att?.toFixed(3)} (SE = ${att.std_error?.toFixed(3)}), p ${att.p_value < 0.001 ? '< .001' : `= ${att.p_value?.toFixed(3)}`}, 95% CI [${att.ci_lower?.toFixed(2)}, ${att.ci_upper?.toFixed(2)}]. ${results.matching_results.n_matched} pairs were matched (${results.matching_results.match_rate?.toFixed(1)}% match rate).`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'psm_report.doc'; a.click();
                        URL.revokeObjectURL(url);
                    };
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadWord}><FileText className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator /><DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileCode className="mr-2 h-4 w-4" />Python<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Propensity Score Matching Report</h2><p className="text-sm text-muted-foreground mt-1">n = {results.descriptive_stats.n_total} | {results.matching_results.n_matched} matched | {new Date().toLocaleDateString()}</p></div>
                            
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
                                                Propensity score matching (PSM) was conducted to estimate the average treatment effect on the treated (ATT) for <em>{outcomeCol}</em>. 
                                                The initial sample consisted of <em>N</em> = {results.descriptive_stats.n_total} observations, with {results.descriptive_stats.n_treated} in the treatment group and {results.descriptive_stats.n_control} in the control group.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Propensity scores were estimated using logistic regression with {Object.keys(results.propensity_score_model.coefficients).length} covariates. 
                                                The model achieved <span className="font-mono">{(results.propensity_score_model.accuracy * 100).toFixed(1)}%</span> classification accuracy. 
                                                Nearest-neighbor matching (caliper = <span className="font-mono">{results.matching_results.caliper?.toFixed(3) ?? caliper}</span>) successfully matched {results.matching_results.n_matched} treated units (<span className="font-mono">{results.matching_results.match_rate?.toFixed(1)}%</span> match rate).
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Covariate balance improved substantially after matching. Before matching, <span className="font-mono">{results.balance_summary.before?.toFixed(0)}%</span> of covariates met the balance criterion (|<em>d</em>| &lt; 0.1). 
                                                After matching, <span className="font-mono">{results.balance_summary.after?.toFixed(0)}%</span> of covariates were balanced, indicating {results.balance_summary.after >= 80 ? 'adequate' : 'partial'} overlap between groups.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The estimated ATT was <span className="font-mono">{att.att?.toFixed(3)}</span> (<em>SE</em> = <span className="font-mono">{att.std_error?.toFixed(3)}</span>), 
                                                95% CI [<span className="font-mono">{att.ci_lower?.toFixed(2)}</span>, <span className="font-mono">{att.ci_upper?.toFixed(2)}</span>], 
                                                which was {sig ? 'statistically significant' : 'not statistically significant'} (<em>p</em> {att.p_value < 0.001 ? '< .001' : `= ${att.p_value?.toFixed(3)}`}). 
                                                The naive (unmatched) estimate was <span className="font-mono">{naive.ate?.toFixed(3)}</span>, suggesting that selection bias {Math.abs((naive.ate || 0) - (att.att || 0)) > 0.1 ? 'substantially' : 'modestly'} affected the unadjusted comparison.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="distribution" className="w-full"><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="distribution">PS Distribution</TabsTrigger><TabsTrigger value="balance">Balance Plot</TabsTrigger><TabsTrigger value="matching">Matching</TabsTrigger><TabsTrigger value="outcome">Outcome</TabsTrigger></TabsList><TabsContent value="distribution" className="mt-4">{results.ps_distribution_plot ? <Image src={`data:image/png;base64,${results.ps_distribution_plot}`} alt="PS Distribution" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="balance" className="mt-4">{results.balance_plot ? <Image src={`data:image/png;base64,${results.balance_plot}`} alt="Balance Plot" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="matching" className="mt-4">{results.matching_plot ? <Image src={`data:image/png;base64,${results.matching_plot}`} alt="Matching" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="outcome" className="mt-4">{results.outcome_plot ? <Image src={`data:image/png;base64,${results.outcome_plot}`} alt="Outcome" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Covariate Balance</CardTitle><CardDescription>Standardized differences before and after matching</CardDescription></CardHeader><CardContent><ScrollArea className="h-[250px]"><Table><TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead className="text-right">Std Diff Before</TableHead><TableHead className="text-right">Std Diff After</TableHead><TableHead>Balance Before</TableHead><TableHead>Balance After</TableHead></TableRow></TableHeader><TableBody>{results.balance_statistics.map((b, i) => (<TableRow key={i}><TableCell className="font-medium">{b.covariate}</TableCell><TableCell className={`text-right font-mono ${Math.abs(b.std_diff_before) > 0.1 ? 'text-red-600' : 'text-green-600'}`}>{b.std_diff_before?.toFixed(3)}</TableCell><TableCell className={`text-right font-mono ${Math.abs(b.std_diff_after || 0) > 0.1 ? 'text-red-600' : 'text-green-600'}`}>{b.std_diff_after?.toFixed(3)}</TableCell><TableCell>{b.balance_before ? <Badge className="bg-green-600">Yes</Badge> : <Badge variant="destructive">No</Badge>}</TableCell><TableCell>{b.balance_after ? <Badge className="bg-green-600">Yes</Badge> : <Badge variant="destructive">No</Badge>}</TableCell></TableRow>))}</TableBody></Table></ScrollArea></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Propensity Score Model</CardTitle><CardDescription>Logistic regression coefficients</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead className="text-right">Coefficient</TableHead><TableHead className="text-right">Odds Ratio</TableHead></TableRow></TableHeader><TableBody>{Object.entries(results.propensity_score_model.coefficients).map(([cov, vals]) => (<TableRow key={cov}><TableCell className="font-medium">{cov}</TableCell><TableCell className="text-right font-mono">{vals.coefficient?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{vals.odds_ratio?.toFixed(3)}</TableCell></TableRow>))}</TableBody></Table><div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm"><div className="p-2 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Model Accuracy</p><p className="font-semibold">{(results.propensity_score_model.accuracy * 100).toFixed(1)}%</p></div><div className="p-2 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">PS Mean</p><p className="font-semibold">{results.descriptive_stats.ps_mean?.toFixed(3)}</p></div><div className="p-2 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">PS Range</p><p className="font-semibold">[{results.descriptive_stats.ps_min?.toFixed(2)}, {results.descriptive_stats.ps_max?.toFixed(2)}]</p></div></div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Treatment Effect Comparison</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Estimate</TableHead><TableHead className="text-right">Effect</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">95% CI</TableHead><TableHead>Significant</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">Naive (ATE)</TableCell><TableCell className="text-right font-mono">{naive.ate?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">—</TableCell><TableCell className="text-right font-mono">{naive.p_value?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">—</TableCell><TableCell>{naive.significant ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell></TableRow><TableRow className="bg-primary/5"><TableCell className="font-bold">Matched (ATT)</TableCell><TableCell className="text-right font-mono font-bold">{att.att?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{att.std_error?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{att.p_value < 0.001 ? '< .001' : att.p_value?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">[{att.ci_lower?.toFixed(2)}, {att.ci_upper?.toFixed(2)}]</TableCell><TableCell>{att.significant ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Estimating propensity scores and matching...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
        </div>
    );
}
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, Settings, FileSearch, BookOpen, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, Lightbulb, CheckCircle, ChevronDown, Plus, X, Layers, GitBranch, BarChart3, Target, Activity } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "hhttps://statistica-api-dm6treznqq-du.a.run.app";



const metricDefinitions: Record<string, string> = {
  cfa: "Confirmatory Factor Analysis. A theory-testing method that examines whether a hypothesized factor structure fits the observed data.",
  latent_factor: "An unobserved (hidden) construct that is measured indirectly through observed indicators. For example, 'Intelligence' measured by test scores.",
  indicator: "An observed variable that measures a latent factor. Also called a manifest variable or item.",
  factor_loading: "The strength of the relationship between an indicator and its factor. Higher loadings (≥0.7) indicate stronger measurement.",
  cfi: "Comparative Fit Index. Compares your model to a null model. Values ≥0.95 indicate excellent fit, ≥0.90 acceptable.",
  tli: "Tucker-Lewis Index. Similar to CFI but penalizes model complexity. Values ≥0.95 excellent, ≥0.90 acceptable.",
  rmsea: "Root Mean Square Error of Approximation. Measures misfit per degree of freedom. ≤0.05 close fit, ≤0.08 reasonable, >0.10 poor.",
  srmr: "Standardized Root Mean Square Residual. Average difference between observed and predicted correlations. ≤0.08 indicates good fit.",
  chi_square: "Tests exact model fit. Significant p-value suggests misfit, but very sensitive to sample size. Use χ²/df ratio instead (<3 acceptable).",
  composite_reliability: "CR. Internal consistency measure accounting for different factor loadings. ≥0.70 is acceptable, better than Cronbach's alpha for CFA.",
  ave: "Average Variance Extracted. The amount of variance captured by a factor relative to measurement error. ≥0.50 indicates adequate convergent validity.",
  convergent_validity: "Whether indicators of the same factor correlate highly with each other. Assessed via factor loadings (≥0.50) and AVE (≥0.50).",
  discriminant_validity: "Whether factors are distinct from each other. √AVE should exceed inter-factor correlations (Fornell-Larcker criterion).",
  factor_correlation: "The relationship between two latent factors. Correlations >0.85 suggest poor discriminant validity.",
  modification_indices: "Suggestions for model re-specification that would improve fit. Use with caution and theoretical justification.",
  estimator: "The method used to estimate model parameters. MLW (Maximum Likelihood) is robust and commonly used."
};



interface FactorDefinition { name: string; indicators: string[]; }
interface FitInterpretation { metric: string; value: string; status: string; interpretation: string; }
interface LoadingInfo { estimate: number; se: number | null; z: number | null; pvalue: number | null; }
interface LoadingRow { indicator: string; [factorName: string]: string | LoadingInfo | null; }
interface Reliability { composite_reliability: number; ave: number; n_indicators: number; }
interface Insight { type: 'warning' | 'info'; title: string; description: string; }

interface CfaResult {
    model_syntax: string;
    summary: { n_observations: number; n_factors: number; n_indicators: number; estimator: string; overall_fit: string; overall_message: string; };
    fit_indices: { chi_square: number | null; chi_square_df: number | null; chi_square_pvalue: number | null; CFI: number | null; TLI: number | null; RMSEA: number | null; SRMR: number | null; AIC: number | null; BIC: number | null; };
    fit_interpretation: FitInterpretation[];
    loadings: LoadingRow[];
    factor_correlations: { [f1: string]: { [f2: string]: number } };
    reliability: { [factor: string]: Reliability };
    insights: Insight[];
    plots: { loadings: string; factor_correlations: string; fit_indices: string; reliability: string; path_diagram: string; };
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [{ id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' }, { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }];


const CFAGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Confirmatory Factor Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is CFA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                What is Confirmatory Factor Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                CFA is a <strong>theory-testing</strong> technique that examines whether your 
                hypothesized factor structure fits the observed data. Unlike EFA which explores 
                patterns, CFA <strong>confirms</strong> a pre-specified model.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Core Question:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    "Does my theoretical factor structure match what I observe in the data?"
                    <br/><br/>
                    You specify which indicators load on which factors, then CFA tests if this 
                    model fits the correlations among observed variables.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* EFA vs CFA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                EFA vs CFA
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-1">Exploratory Factor Analysis (EFA)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Explores</strong> unknown structure</li>
                    <li>• Data-driven, no prior theory</li>
                    <li>• All variables can load on all factors</li>
                    <li>• Generates hypotheses</li>
                    <li>• Use first when developing scales</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Confirmatory Factor Analysis (CFA)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Confirms</strong> hypothesized structure</li>
                    <li>• Theory-driven, pre-specified model</li>
                    <li>• Each indicator loads on specified factor(s)</li>
                    <li>• Tests hypotheses</li>
                    <li>• Use to validate after EFA</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Typical workflow:</strong> EFA on Sample 1 → Develop theory → 
                  CFA on Sample 2 → Confirm structure
                </p>
              </div>
            </div>

            <Separator />

            {/* Model Fit Indices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Model Fit Indices
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">CFI & TLI (Comparative Fit)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare your model to a baseline (null) model.
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">≥ 0.95</p>
                      <p className="text-muted-foreground">Excellent</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">0.90-0.95</p>
                      <p className="text-muted-foreground">Acceptable</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">&lt; 0.90</p>
                      <p className="text-muted-foreground">Poor</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">RMSEA (Root Mean Square Error of Approximation)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures model misfit per degree of freedom. Lower is better.
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">≤ 0.05</p>
                      <p className="text-muted-foreground">Close fit</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">0.05-0.08</p>
                      <p className="text-muted-foreground">Good</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">0.08-0.10</p>
                      <p className="text-muted-foreground">Mediocre</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">&gt; 0.10</p>
                      <p className="text-muted-foreground">Poor</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">SRMR (Standardized Root Mean Square Residual)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average difference between observed and predicted correlations.
                    <br/>• <strong>≤ 0.08:</strong> Good fit
                    <br/>• <strong>&gt; 0.10:</strong> Poor fit
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Chi-Square (χ²)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests exact fit (p &gt; 0.05 = perfect fit). However:
                    <br/>• Very sensitive to sample size
                    <br/>• Almost always significant with n &gt; 200
                    <br/>• Use χ²/df ratio instead: &lt; 3 is acceptable
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Convergent & Discriminant Validity */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Validity Assessment
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Convergent Validity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Do indicators of the same factor correlate with each other?
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Factor Loadings:</strong> All ≥ 0.50 (ideally ≥ 0.70)</p>
                    <p><strong>AVE (Average Variance Extracted):</strong> ≥ 0.50</p>
                    <p><strong>CR (Composite Reliability):</strong> ≥ 0.70</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Discriminant Validity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Are factors distinct from each other?
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Fornell-Larcker Criterion:</strong> √AVE &gt; correlations with other factors</p>
                    <p><strong>Factor Correlations:</strong> Should be &lt; 0.85</p>
                    <p><strong>HTMT:</strong> &lt; 0.90 (or &lt; 0.85 for strict)</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Reliability */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Reliability Metrics
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Composite Reliability (CR)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Internal consistency accounting for different loadings.
                    <br/>• <strong>≥ 0.70:</strong> Acceptable
                    <br/>• <strong>≥ 0.80:</strong> Good
                    <br/>• Better than Cronbach's α for CFA
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Average Variance Extracted (AVE)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Variance captured by factor vs. measurement error.
                    <br/>• <strong>≥ 0.50:</strong> Adequate (factor explains &gt;50%)
                    <br/>• <strong>&lt; 0.50:</strong> Error dominates
                    <br/>• Used for convergent validity
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Factor Loadings */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting Factor Loadings
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-background text-center">
                    <p className="font-medium">≥ 0.70</p>
                    <p className="text-muted-foreground">Excellent</p>
                    <p className="text-muted-foreground">(50%+ variance)</p>
                  </div>
                  <div className="p-2 rounded bg-background text-center">
                    <p className="font-medium">0.60-0.70</p>
                    <p className="text-muted-foreground">Good</p>
                  </div>
                  <div className="p-2 rounded bg-background text-center">
                    <p className="font-medium">0.50-0.60</p>
                    <p className="text-muted-foreground">Acceptable</p>
                  </div>
                  <div className="p-2 rounded bg-background text-center">
                    <p className="font-medium">&lt; 0.50</p>
                    <p className="text-muted-foreground">Problematic</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Note:</strong> Low loadings suggest the indicator doesn't measure the 
                  construct well. Consider removing or reassigning.
                </p>
              </div>
            </div>

            <Separator />

            {/* Common Issues */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Issues & Solutions
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Poor Model Fit</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Causes:</strong> Wrong factor structure, missing factors, cross-loadings
                    <br/><strong>Solutions:</strong> Check modification indices, consider removing weak 
                    indicators, allow correlated errors (with theoretical justification)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Low AVE (&lt; 0.50)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Cause:</strong> Indicators don't converge well on the factor
                    <br/><strong>Solutions:</strong> Remove indicators with loadings &lt; 0.50, 
                    revise problematic items, check if factor is well-defined
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">High Factor Correlations (&gt; 0.85)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Cause:</strong> Factors may not be distinct (discriminant validity issue)
                    <br/><strong>Solutions:</strong> Merge factors, remove overlapping indicators, 
                    reconsider theoretical distinction
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Heywood Case (Loading &gt; 1 or Negative Variance)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Causes:</strong> Small sample, misspecified model, bad starting values
                    <br/><strong>Solutions:</strong> Increase sample size, fix model specification, 
                    try different estimator
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
                    <li>• Have at least 3 indicators per factor</li>
                    <li>• Use n ≥ 200 (or 5× variables minimum)</li>
                    <li>• Report multiple fit indices (CFI, RMSEA, SRMR)</li>
                    <li>• Assess convergent and discriminant validity</li>
                    <li>• Base model on theory, not data</li>
                    <li>• Use separate sample from EFA</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don&apos;t</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Modify model just to improve fit</li>
                    <li>• Ignore low loadings or high correlations</li>
                    <li>• Use CFA on same data used for EFA</li>
                    <li>• Rely only on χ² test</li>
                    <li>• Add correlated errors without justification</li>
                    <li>• Ignore modification indices completely</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Sample size and characteristics</li>
                    <li>• Estimation method (e.g., MLW)</li>
                    <li>• χ², df, p-value (with caution)</li>
                    <li>• CFI, TLI, RMSEA (with CI), SRMR</li>
                    <li>• Factor loadings and their significance</li>
                    <li>• CR, AVE, factor correlations</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Sample Size Guidelines</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Minimum:</strong> 5× number of parameters</li>
                    <li>• <strong>Rule of thumb:</strong> 10× indicators</li>
                    <li>• <strong>Ideal:</strong> 200+ observations</li>
                    <li>• Complex models need larger samples</li>
                    <li>• MLW is robust to non-normality</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> CFA is a <strong>confirmatory</strong> technique — 
                your model should be based on prior theory or EFA, not modified to fit the data. 
                A good-fitting model doesn't prove your theory is correct; it only shows the data 
                is <strong>consistent with</strong> your theory. Always assess convergent validity 
                (AVE ≥ 0.50), discriminant validity (√AVE &gt; inter-factor correlations), and 
                reliability (CR ≥ 0.70) alongside model fit.
              </p>
            </div>
          </div>
        </div>
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
                      Confirmatory Factor Analysis Glossary
                  </DialogTitle>
                  <DialogDescription>
                      Definitions of terms used in CFA and structural equation modeling
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                      {Object.entries(metricDefinitions).map(([term, definition]) => (
                          <div key={term} className="border-b pb-3">
                              <h4 className="font-semibold uppercase">
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


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.analysisTypes?.includes('well-being-survey') || d.analysisTypes?.includes('factor'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Confirmatory Factor Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test hypothesized factor structures with observed variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Model Fit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    CFI, TLI, RMSEA, SRMR indices
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Factor Loadings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Indicator-factor relationships
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Reliability</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Composite reliability and AVE
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            CFA tests whether your hypothesized factor structure fits the observed data. Use when you have theoretical expectations about which indicators measure which latent constructs.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 5× observations per variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Indicators:</strong> 3+ per factor recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Data type:</strong> Continuous numeric variables</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You'll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Model fit:</strong> CFI ≥ 0.95, RMSEA ≤ 0.06 ideal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Convergent validity:</strong> AVE ≥ 0.50</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Reliability:</strong> CR ≥ 0.70 for good consistency</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Layers className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


interface CfaPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function CfaPage({ data, numericHeaders, onLoadExample }: CfaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Factor definitions
    const [factors, setFactors] = useState<FactorDefinition[]>([{ name: 'Factor1', indicators: [] }]);
    const [estimator, setEstimator] = useState('MLW');
    
    const [analysisResult, setAnalysisResult] = useState<CfaResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);
    
    const allIndicators = useMemo(() => factors.flatMap(f => f.indicators), [factors]);
    const minObservations = allIndicators.length * 5;

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'At least one factor defined', passed: factors.length >= 1, message: `${factors.length} factor(s) defined` });
        checks.push({ label: 'Each factor has 3+ indicators', passed: factors.every(f => f.indicators.length >= 3), message: factors.map(f => `${f.name}: ${f.indicators.length}`).join(', ') });
        checks.push({ label: 'Sufficient observations', passed: data.length >= minObservations, message: `${data.length} obs (need ${minObservations}+)` });
        checks.push({ label: 'No duplicate indicators', passed: allIndicators.length === new Set(allIndicators).size, message: allIndicators.length === new Set(allIndicators).size ? 'All unique' : 'Duplicates found' });
        return checks;
    }, [factors, data.length, minObservations, allIndicators]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) runAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => { setFactors([{ name: 'Factor1', indicators: [] }]); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1); setView(canRun ? 'main' : 'intro'); }, [data, numericHeaders, canRun]);

    const addFactor = () => setFactors(prev => [...prev, { name: `Factor${prev.length + 1}`, indicators: [] }]);
    const removeFactor = (idx: number) => setFactors(prev => prev.filter((_, i) => i !== idx));
    const updateFactorName = (idx: number, name: string) => setFactors(prev => prev.map((f, i) => i === idx ? { ...f, name } : f));
    const toggleIndicator = (factorIdx: number, indicator: string) => {
        setFactors(prev => prev.map((f, i) => {
            if (i !== factorIdx) return f;
            const has = f.indicators.includes(indicator);
            return { ...f, indicators: has ? f.indicators.filter(ind => ind !== indicator) : [...f.indicators, indicator] };
        }));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `CFA_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png'); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const fi = analysisResult.fit_indices;
        const csvData = [
            ['Confirmatory Factor Analysis Results'], [''],
            ['Model Summary'],
            ['Observations', analysisResult.summary.n_observations],
            ['Factors', analysisResult.summary.n_factors],
            ['Indicators', analysisResult.summary.n_indicators],
            ['Overall Fit', analysisResult.summary.overall_fit],
            [''],
            ['Fit Indices'],
            ['Chi-Square', fi.chi_square?.toFixed(4) || 'N/A'],
            ['df', fi.chi_square_df || 'N/A'],
            ['p-value', fi.chi_square_pvalue?.toFixed(4) || 'N/A'],
            ['CFI', fi.CFI?.toFixed(4) || 'N/A'],
            ['TLI', fi.TLI?.toFixed(4) || 'N/A'],
            ['RMSEA', fi.RMSEA?.toFixed(4) || 'N/A'],
            ['SRMR', fi.SRMR?.toFixed(4) || 'N/A'],
            [''],
            ['Reliability'],
            ['Factor', 'CR', 'AVE'],
            ...Object.entries(analysisResult.reliability).map(([f, r]) => [f, r.composite_reliability.toFixed(4), r.ave.toFixed(4)])
        ];
        const csv = Papa.unparse(csvData);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `CFA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download started" });
    }, [analysisResult, toast]);

    const runAnalysis = useCallback(async () => {
        if (factors.length === 0 || factors.some(f => f.indicators.length < 3)) {
            toast({ variant: 'destructive', title: 'Configuration required', description: 'Each factor needs at least 3 indicators' });
            return;
        }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/cfa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, factors, estimator })
            });
            if (!response.ok) throw new Error((await response.json()).detail || 'Analysis failed');
            const result: CfaResult = await response.json();
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, factors, estimator, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult;
    const factorNames = factors.map(f => f.name);

    const getStatusColor = (status: string) => {
        if (status === 'excellent') return 'text-green-600 bg-green-50 dark:bg-green-900/20';
        if (status === 'acceptable') return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    };

    const getOverallStars = () => {
        if (!results) return 0;
        const fit = results.summary.overall_fit;
        if (fit === 'excellent') return 5;
        if (fit === 'good') return 4;
        if (fit === 'acceptable') return 3;
        return 2;
    };

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = step.id === currentStep;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button key={step.id} onClick={() => isAccessible && goToStep(step.id as Step)} disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <CFAGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />

            <div className="mb-6 flex justify-between items-center">
              <div>
                  <h1 className="text-2xl font-bold">Confirmatory Factor Analysis</h1>
                  <p className="text-muted-foreground mt-1">Test hypothesized factor structures</p>
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
                {/* Step 1: Define Factors */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Define Factors</CardTitle><CardDescription>Specify latent factors and their indicators</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            {factors.map((factor, fIdx) => (
                                <div key={fIdx} className="p-4 border rounded-lg space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Input value={factor.name} onChange={e => updateFactorName(fIdx, e.target.value)} className="w-40 font-semibold" placeholder="Factor name" />
                                            <Badge variant="outline">{factor.indicators.length} indicators</Badge>
                                        </div>
                                        {factors.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeFactor(fIdx)}><X className="w-4 h-4" /></Button>}
                                    </div>
                                    <ScrollArea className="h-32 border rounded-md p-2">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {numericHeaders.map(h => {
                                                const usedElsewhere = factors.some((f, i) => i !== fIdx && f.indicators.includes(h));
                                                const isSelected = factor.indicators.includes(h);
                                                return (
                                                    <div key={h} className={`flex items-center space-x-2 p-2 rounded ${usedElsewhere ? 'opacity-40' : ''}`}>
                                                        <Checkbox id={`${fIdx}-${h}`} checked={isSelected} disabled={usedElsewhere} onCheckedChange={() => !usedElsewhere && toggleIndicator(fIdx, h)} />
                                                        <label htmlFor={`${fIdx}-${h}`} className="text-sm truncate">{h}</label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addFactor} className="w-full"><Plus className="mr-2 w-4 h-4" />Add Factor</Button>
                            <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground"><strong>{data.length}</strong> observations, <strong>{allIndicators.length}</strong> indicators selected</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Configure estimation method</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Estimator</Label>
                                <Select value={estimator} onValueChange={setEstimator}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MLW">Maximum Likelihood (MLW)</SelectItem>
                                        <SelectItem value="GLS">Generalized Least Squares</SelectItem>
                                        <SelectItem value="ULS">Unweighted Least Squares</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">MLW is robust and most commonly used</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Model Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Factors:</strong> {factors.map(f => f.name).join(', ')}</p>
                                    <p>• <strong className="text-foreground">Total indicators:</strong> {allIndicators.length}</p>
                                    <p>• <strong className="text-foreground">Required observations:</strong> {minObservations}+ (have {data.length})</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Model Specification</h4>
                                <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">{factors.map(f => `${f.name} =~ ${f.indicators.join(' + ')}`).join('\n')}</pre>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking CFA requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {validationChecks.map((check, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${check.passed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                        <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}<div><p className="font-medium text-sm">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                                        <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? 'Pass' : 'Fail'}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fitting...</> : <><Layers className="mr-2 h-4 w-4" />Run CFA</>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>CFA Results Summary</CardTitle><CardDescription>{results.summary.n_factors} factors, {results.summary.n_indicators} indicators</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${results.summary.overall_fit === 'excellent' || results.summary.overall_fit === 'good' ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Overall model fit: <strong className={results.summary.overall_fit === 'excellent' ? 'text-green-600' : results.summary.overall_fit === 'good' ? 'text-blue-600' : results.summary.overall_fit === 'acceptable' ? 'text-amber-600' : 'text-red-600'}>{results.summary.overall_fit.toUpperCase()}</strong></p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{results.summary.overall_message}</p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">CFI = <strong>{results.fit_indices.CFI?.toFixed(3) || 'N/A'}</strong>, RMSEA = <strong>{results.fit_indices.RMSEA?.toFixed(3) || 'N/A'}</strong>, SRMR = <strong>{results.fit_indices.SRMR?.toFixed(3) || 'N/A'}</strong></p></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {results.fit_interpretation.map((fi, idx) => (
                                    <Card key={idx} className={getStatusColor(fi.status)}>
                                        <CardContent className="p-4 text-center">
                                            <p className="text-xs text-muted-foreground">{fi.metric}</p>
                                            <p className="text-xl font-bold">{fi.value}</p>
                                            <p className="text-xs">{fi.status}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(results.reliability).map(([factor, rel]) => (
                                    <Card key={factor}>
                                        <CardContent className="p-4">
                                            <h4 className="font-semibold mb-2">{factor}</h4>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className={`p-2 rounded ${rel.composite_reliability >= 0.7 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                                    <p className="text-xs text-muted-foreground">CR</p>
                                                    <p className="font-mono font-semibold">{rel.composite_reliability.toFixed(3)}</p>
                                                </div>
                                                <div className={`p-2 rounded ${rel.ave >= 0.5 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                                    <p className="text-xs text-muted-foreground">AVE</p>
                                                    <p className="font-mono font-semibold">{rel.ave.toFixed(3)}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Model Quality:</span>{[1,2,3,4,5].map(star => <span key={star} className={`text-lg ${star <= getOverallStars() ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>)}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Understanding CFA results</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">Model Fit Indices</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">CFI/TLI ≥ 0.95:</strong> Excellent, ≥ 0.90 Acceptable<br/><strong className="text-foreground">RMSEA ≤ 0.05:</strong> Close fit, ≤ 0.08 Reasonable<br/><strong className="text-foreground">SRMR ≤ 0.08:</strong> Good fit</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Factor Loadings</h4><p className="text-sm text-muted-foreground">Loadings show how strongly each indicator relates to its factor. <strong className="text-foreground">Loadings ≥ 0.7</strong> are ideal, ≥ 0.5 acceptable. Low loadings suggest weak indicators.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Convergent Validity (AVE)</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">AVE ≥ 0.5</strong> indicates adequate convergent validity. The factor explains more variance in its indicators than error does.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Composite Reliability (CR)</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">CR ≥ 0.7</strong> indicates good internal consistency. Similar to Cronbach's alpha but accounts for different loadings.</p></div></div></div>
                            {results.insights.length > 0 && (
                                <div className="rounded-xl p-5 border bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />Issues Found</h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">{results.insights.map((ins, i) => <li key={i}>• <strong>{ins.title}:</strong> {ins.description}</li>)}</ul>
                                </div>
                            )}
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4><p className="text-sm text-muted-foreground">{results.summary.overall_message} The model explains the relationships between {results.summary.n_indicators} observed variables using {results.summary.n_factors} latent factor(s).</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full CFA analysis</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Confirmatory Factor Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.summary.n_factors} factors | {results.summary.n_indicators} indicators | N={results.summary.n_observations} | {new Date().toLocaleDateString()}</p></div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">χ²</p><p className="text-lg font-bold font-mono">{results.fit_indices.chi_square?.toFixed(2) || 'N/A'}</p><p className="text-xs">df={results.fit_indices.chi_square_df || 'N/A'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">CFI</p><p className="text-lg font-bold font-mono">{results.fit_indices.CFI?.toFixed(3) || 'N/A'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">RMSEA</p><p className="text-lg font-bold font-mono">{results.fit_indices.RMSEA?.toFixed(3) || 'N/A'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">SRMR</p><p className="text-lg font-bold font-mono">{results.fit_indices.SRMR?.toFixed(3) || 'N/A'}</p></CardContent></Card>
                            </div>

                            <Tabs defaultValue="path">
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="path">Path Diagram</TabsTrigger>
                                    <TabsTrigger value="loadings">Loadings</TabsTrigger>
                                    <TabsTrigger value="correlations">Factor Corr</TabsTrigger>
                                    <TabsTrigger value="fit">Fit Indices</TabsTrigger>
                                    <TabsTrigger value="reliability">Reliability</TabsTrigger>
                                </TabsList>
                                <TabsContent value="path"><Card><CardContent className="pt-4"><Image src={results.plots.path_diagram} alt="Path Diagram" width={1400} height={1000} className="w-full rounded border" /></CardContent></Card></TabsContent>
                                <TabsContent value="loadings"><Card><CardContent className="pt-4"><Image src={results.plots.loadings} alt="Factor Loadings" width={1000} height={600} className="w-full rounded border" /></CardContent></Card></TabsContent>
                                <TabsContent value="correlations"><Card><CardContent className="pt-4"><Image src={results.plots.factor_correlations} alt="Factor Correlations" width={800} height={600} className="w-full rounded border" /></CardContent></Card></TabsContent>
                                <TabsContent value="fit"><Card><CardContent className="pt-4"><Image src={results.plots.fit_indices} alt="Fit Indices" width={1000} height={500} className="w-full rounded border" /></CardContent></Card></TabsContent>
                                <TabsContent value="reliability"><Card><CardContent className="pt-4"><Image src={results.plots.reliability} alt="Reliability" width={1200} height={500} className="w-full rounded border" /></CardContent></Card></TabsContent>
                            </Tabs>

                            <Card>
                                <CardHeader><CardTitle>Factor Loadings</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Indicator</TableHead>{factorNames.map(f => <TableHead key={f} className="text-center">{f}</TableHead>)}</TableRow></TableHeader>
                                        <TableBody>
                                            {results.loadings.map((row, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{row.indicator}</TableCell>
                                                    {factorNames.map(f => {
                                                        const loading = row[f] as LoadingInfo | null;
                                                        if (!loading) return <TableCell key={f} className="text-center text-muted-foreground">-</TableCell>;
                                                        const isLow = loading.estimate < 0.5;
                                                        return <TableCell key={f} className={`text-center font-mono ${isLow ? 'text-red-600' : ''}`}>{loading.estimate.toFixed(3)}{loading.pvalue !== null && loading.pvalue < 0.05 && '*'}</TableCell>;
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">* p &lt; 0.05. Red values indicate loadings &lt; 0.5</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Factor Correlations</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead></TableHead>{factorNames.map(f => <TableHead key={f} className="text-center">{f}</TableHead>)}</TableRow></TableHeader>
                                        <TableBody>
                                            {factorNames.map(f1 => (
                                                <TableRow key={f1}>
                                                    <TableCell className="font-medium">{f1}</TableCell>
                                                    {factorNames.map(f2 => {
                                                        const corr = results.factor_correlations[f1]?.[f2] ?? 0;
                                                        const isHigh = f1 !== f2 && Math.abs(corr) > 0.85;
                                                        return <TableCell key={f2} className={`text-center font-mono ${isHigh ? 'text-red-600 font-bold' : ''}`}>{corr.toFixed(3)}</TableCell>;
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">Red values indicate correlations &gt; 0.85 (discriminant validity concern)</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Reliability Measures</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead className="text-right">CR</TableHead><TableHead className="text-right">AVE</TableHead><TableHead className="text-right">√AVE</TableHead><TableHead className="text-right">Indicators</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.reliability).map(([factor, rel]) => (
                                                <TableRow key={factor}>
                                                    <TableCell className="font-medium">{factor}</TableCell>
                                                    <TableCell className={`text-right font-mono ${rel.composite_reliability < 0.7 ? 'text-red-600' : 'text-green-600'}`}>{rel.composite_reliability.toFixed(3)}</TableCell>
                                                    <TableCell className={`text-right font-mono ${rel.ave < 0.5 ? 'text-red-600' : 'text-green-600'}`}>{rel.ave.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{Math.sqrt(rel.ave).toFixed(3)}</TableCell>
                                                    <TableCell className="text-right">{rel.n_indicators}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">CR ≥ 0.70, AVE ≥ 0.50 recommended. √AVE used for discriminant validity (Fornell-Larcker)</p>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Fitting CFA model...</p><Skeleton className="h-96 w-full" /></CardContent></Card>)}
            </div>
        </div>
    );
}
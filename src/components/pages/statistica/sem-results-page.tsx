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
import { Loader2, HelpCircle, GitBranch, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, Activity, FileCode, FileType, TrendingUp, Users, BarChart3, Code } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';



const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============================================
// Type Definitions (matching backend response)
// ============================================

interface LoadingDetail {
    estimate: number | null;
    std_estimate: number | null;
    std_error: number | null;
    z_value: number | null;
    p_value: number | null;
    significant: boolean | null;
}

interface MeasurementModel {
    indicators: string[];
    loadings: Record<string, LoadingDetail>;
}

interface PathCoefficient {
    path: string;
    from: string;
    to: string;
    estimate: number | null;
    std_estimate: number | null;
    std_error: number | null;
    z_value: number | null;
    p_value: number | null;
    significant: boolean | null;
}

interface VarianceItem {
    variable?: string;
    indicator?: string;
    var1: string;
    var2: string;
    estimate: number | null;
    std_estimate: number | null;
    std_error: number | null;
    z_value: number | null;
    p_value: number | null;
}

interface VariancesCovariances {
    latent_variances: VarianceItem[];
    latent_covariances: VarianceItem[];
    error_variances: VarianceItem[];
}

interface DirectEffect {
    from: string;
    to: string;
    estimate: number | null;
    std_estimate: number | null;
}

interface IndirectEffect {
    from: string;
    through: string;
    to: string;
    path: string;
    estimate: number | null;
    std_estimate: number | null;
}

interface TotalEffect {
    from: string;
    to: string;
    direct_effect: number | null;
    direct_effect_std: number | null;
    indirect_effect: number | null;
    indirect_effect_std: number | null;
    total_effect: number | null;
    total_effect_std: number | null;
}

interface Effects {
    direct: DirectEffect[];
    indirect: IndirectEffect[];
    total: TotalEffect[];
}

interface FitIndices {
    chi2: number | null;
    DoF: number | null;
    chi2_pvalue: number | null;
    CFI: number | null;
    TLI: number | null;
    RMSEA: number | null;
    SRMR: number | null;
    AIC: number | null;
    BIC: number | null;
    GFI: number | null;
    AGFI: number | null;
    NFI: number | null;
}

interface KeyInsight {
    title: string;
    description: string;
}

interface Interpretation {
    key_insights: KeyInsight[];
    n_latent_vars: number;
    n_significant_paths: number;
    overall_assessment: string;
}

interface AnalysisResults {
    parsed_model: {
        latent_vars: Record<string, string[]>;
        regressions: Array<{ dv: string; ivs: string[] }>;
        covariances: Array<[string, string]>;
    };
    raw_estimates: Array<Record<string, any>>;
    measurement_model: Record<string, MeasurementModel>;
    structural_model: PathCoefficient[];
    variances_covariances: VariancesCovariances;
    r_squared: Record<string, number>;
    effects: Effects;
    fit_indices: FitIndices;
    path_diagram: string | null;
    loading_heatmap: string | null;
    correlation_matrix: string | null;
    interpretation: Interpretation;
    estimator: string;
    n_observations: number;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [
    { id: 1, label: 'Model' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const EXAMPLE_MODEL = `# Measurement Model (latent =~ indicators)
VisualAbility =~ x1 + x2 + x3
TextualAbility =~ x4 + x5 + x6
SpeedAbility =~ x7 + x8 + x9

# Structural Model (regression paths)
TextualAbility ~ VisualAbility
SpeedAbility ~ TextualAbility + VisualAbility`;

// ============================================
// Utility: Format p-value
// ============================================
const formatPValue = (p: number | null | undefined): string => {
    if (p === null || p === undefined) return '-';
    if (p < 0.001) return '< .001';
    return p.toFixed(3);
};

const formatNumber = (n: number | null | undefined, decimals: number = 3): string => {
    if (n === null || n === undefined) return '-';
    return n.toFixed(decimals);
};

// ============================================
// Intro Page
// ============================================

// ============================================
// SEM Analysis Guide Modal
// ============================================

const SEMGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Structural Equation Modeling Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is SEM */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                What is Structural Equation Modeling?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                SEM is a powerful multivariate technique that combines <strong>factor analysis</strong> 
                (measurement model) with <strong>path analysis</strong> (structural model) to test 
                complex theoretical models involving latent (unobserved) variables.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Two Components:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. <strong>Measurement Model:</strong> How observed indicators reflect latent constructs<br/>
                    2. <strong>Structural Model:</strong> Causal relationships between latent variables
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Model Syntax */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Model Syntax (lavaan-style)
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-2">Operators</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <code className="font-mono">=~</code>
                      <p className="text-muted-foreground mt-1">Latent definition</p>
                      <p className="text-muted-foreground">F =~ x1 + x2 + x3</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <code className="font-mono">~</code>
                      <p className="text-muted-foreground mt-1">Regression path</p>
                      <p className="text-muted-foreground">Y ~ X1 + X2</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <code className="font-mono">~~</code>
                      <p className="text-muted-foreground mt-1">Covariance</p>
                      <p className="text-muted-foreground">F1 ~~ F2</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">Example Model</p>
                  <pre className="text-xs bg-background p-3 rounded font-mono overflow-x-auto">
{`# Measurement Model
Visual =~ x1 + x2 + x3
Textual =~ x4 + x5 + x6
Speed =~ x7 + x8 + x9

# Structural Model
Textual ~ Visual
Speed ~ Textual + Visual`}
                  </pre>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fit Indices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Model Fit Indices
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Always report multiple fit indices. No single index tells the whole story.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-2">Absolute Fit</p>
                  <div className="grid md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">Chi-square (χ²)</p>
                      <p className="text-muted-foreground">p &gt; .05 desired (but sensitive to n)</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">SRMR</p>
                      <p className="text-muted-foreground">≤ .08 good | ≤ .05 excellent</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">RMSEA</p>
                      <p className="text-muted-foreground">≤ .05 excellent | ≤ .08 good | &gt; .10 poor</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">GFI / AGFI</p>
                      <p className="text-muted-foreground">≥ .90 acceptable (less used today)</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">Incremental Fit</p>
                  <div className="grid md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">CFI (Comparative Fit Index)</p>
                      <p className="text-muted-foreground">≥ .95 excellent | ≥ .90 acceptable</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">TLI (Tucker-Lewis Index)</p>
                      <p className="text-muted-foreground">≥ .95 excellent | ≥ .90 acceptable</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">NFI</p>
                      <p className="text-muted-foreground">≥ .90 acceptable (biased for small n)</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">IFI</p>
                      <p className="text-muted-foreground">≥ .90 acceptable</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">Information Criteria</p>
                  <div className="grid md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="font-medium">AIC / BIC</p>
                      <p className="text-muted-foreground">Lower is better (for model comparison)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Factor Loadings */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Interpreting Factor Loadings
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  Standardized loadings show how strongly each indicator reflects its latent factor.
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 text-center border border-green-200">
                    <p className="font-bold text-green-600">≥ .70</p>
                    <p className="text-muted-foreground">Excellent</p>
                    <p className="text-muted-foreground">50%+ variance</p>
                  </div>
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-center border border-blue-200">
                    <p className="font-bold text-blue-600">.60-.69</p>
                    <p className="text-muted-foreground">Good</p>
                    <p className="text-muted-foreground">36-48% variance</p>
                  </div>
                  <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-center border border-amber-200">
                    <p className="font-bold text-amber-600">.50-.59</p>
                    <p className="text-muted-foreground">Acceptable</p>
                    <p className="text-muted-foreground">25-35% variance</p>
                  </div>
                  <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-center border border-red-200">
                    <p className="font-bold text-red-600">&lt; .50</p>
                    <p className="text-muted-foreground">Problematic</p>
                    <p className="text-muted-foreground">Consider removing</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Note:</strong> All loadings should be statistically significant (p &lt; .05).
                </p>
              </div>
            </div>

            <Separator />

            {/* Effects */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Direct, Indirect & Total Effects
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Direct Effect</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The unmediated relationship: A → B directly.
                    <br/>Represented by the path coefficient between two variables.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Indirect Effect (Mediation)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The effect transmitted through mediators: A → M → B.
                    <br/>Calculated as the product of path coefficients along the indirect path.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Total Effect</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Total = Direct + Indirect</strong>
                    <br/>The complete effect of one variable on another, considering all pathways.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sample Size */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Sample Size Requirements
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-2">Rules of Thumb</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Minimum:</strong> n ≥ 100-150</li>
                    <li>• <strong>Ideal:</strong> n ≥ 200</li>
                    <li>• <strong>Complex models:</strong> n ≥ 300-500</li>
                    <li>• <strong>Ratio:</strong> 10-20 cases per parameter</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm mb-2 text-amber-700 dark:text-amber-400">Small Sample Issues</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Unstable parameter estimates</li>
                    <li>• Inflated χ² (rejects good models)</li>
                    <li>• Convergence problems</li>
                    <li>• Improper solutions (negative variances)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Estimators */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Choosing an Estimator
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-primary">ML / MLW (Maximum Likelihood)</p>
                  <p className="text-muted-foreground">Default. Assumes multivariate normality. MLW uses Wishart likelihood.</p>
                </div>
                <div className="p-2 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium">GLS (Generalized Least Squares)</p>
                  <p className="text-muted-foreground">More robust to non-normality than ML.</p>
                </div>
                <div className="p-2 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium">DWLS (Diagonally Weighted LS)</p>
                  <p className="text-muted-foreground">Best for ordinal/categorical indicators.</p>
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
                  <p className="font-medium text-sm text-primary mb-1">Model Specification</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Base model on theory, not data</li>
                    <li>• ≥ 3 indicators per latent variable</li>
                    <li>• Don't add paths just to improve fit</li>
                    <li>• Consider alternative models</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Sample size and estimator used</li>
                    <li>• Multiple fit indices (CFI, TLI, RMSEA, SRMR)</li>
                    <li>• All path coefficients (unstd & std)</li>
                    <li>• R² for endogenous variables</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check for missing data</li>
                    <li>• Assess multivariate normality</li>
                    <li>• Screen for outliers</li>
                    <li>• Examine correlations</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Issues</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Non-convergence:</strong> Check model specification</li>
                    <li>• <strong>Heywood case:</strong> Negative error variance</li>
                    <li>• <strong>High modification indices:</strong> Model misfit</li>
                    <li>• <strong>Poor fit:</strong> Review theory & indicators</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> SEM is a <strong>confirmatory</strong> 
                technique—start with a theory-based model. Good fit doesn't prove causation; 
                alternative models may fit equally well. Always report multiple fit indices 
                and interpret standardized coefficients for effect size comparisons.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};





const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const semExample = exampleDatasets.find(d => d.id === 'sem' || d.id === 'factor-analysis');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <GitBranch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Structural Equation Modeling</CardTitle>
                    <CardDescription className="text-base mt-2">Analyze complex relationships between latent and observed variables using Maximum Likelihood estimation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Latent Variables</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Model unobserved constructs from multiple indicators</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Path Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Test directional relationships and mediation effects</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Fit Indices</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Evaluate model fit with CFI, RMSEA, SRMR, TLI</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />Model Syntax (lavaan-style)
                        </h3>
                        <pre className="text-xs bg-background p-4 rounded-lg border overflow-x-auto">{`# Measurement Model
Factor1 =~ item1 + item2 + item3
Factor2 =~ item4 + item5 + item6

# Structural Model  
Factor2 ~ Factor1`}</pre>
                        <div className="grid md:grid-cols-2 gap-6 text-sm mt-4">
                            <div>
                                <h4 className="font-semibold mb-2">Operators</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li><code className="bg-muted px-1 rounded">=~</code> latent variable definition</li>
                                    <li><code className="bg-muted px-1 rounded">~</code> regression path</li>
                                    <li><code className="bg-muted px-1 rounded">~~</code> covariance</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Requirements</h4>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>3+ indicators per factor recommended</span></li>
                                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>Sample size ≥ 100 (≥200 ideal)</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {semExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(semExample)} size="lg">
                                <GitBranch className="mr-2 h-5 w-5" />Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// ============================================
// Main Component
// ============================================

interface SEMAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SEMAnalysisPage({ data, allHeaders, onLoadExample }: SEMAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [modelSpec, setModelSpec] = useState('');
    const [estimator, setEstimator] = useState('MLW');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가
    const [isImageUploading, setIsImageUploading] = useState(false);  // 👈 추가
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);


    const canRun = useMemo(() => data.length >= 50 && allHeaders.length >= 4, [data, allHeaders]);

    const parsedModelPreview = useMemo(() => {
        const lines = modelSpec.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
        const latentCount = lines.filter(l => l.includes('=~')).length;
        const pathCount = lines.filter(l => l.includes('~') && !l.includes('=~') && !l.includes('~~')).length;
        return { latentCount, pathCount, isValid: latentCount > 0 || pathCount > 0 };
    }, [modelSpec]);

    const validationChecks = useMemo(() => [
        {
            label: 'Model specification',
            passed: parsedModelPreview.isValid,
            message: parsedModelPreview.isValid
                ? `${parsedModelPreview.latentCount} latent variable(s), ${parsedModelPreview.pathCount} structural path(s)`
                : 'Enter valid model syntax'
        },
        {
            label: 'Sample size',
            passed: data.length >= 100,
            message: data.length >= 200
                ? `n = ${data.length} (excellent)`
                : data.length >= 100
                    ? `n = ${data.length} (acceptable)`
                    : `n = ${data.length} (need 100+)`
        },
        {
            label: 'Available variables',
            passed: allHeaders.length >= 4,
            message: `${allHeaders.length} columns available`
        },
    ], [parsedModelPreview, data.length, allHeaders.length]);

    const allChecksPassed = validationChecks.slice(0, 2).every(c => c.passed);

    const goToStep = (step: Step) => {
        setCurrentStep(step);
        if (step > maxReachedStep) setMaxReachedStep(step);
    };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [allHeaders, canRun]);

    // ============================================
    // Download Handlers
    // ============================================

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `SEM_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch {
            toast({ variant: 'destructive', title: "Download failed" });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const fit = analysisResult.fit_indices;

        let csv = `SEM ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nEstimator,${analysisResult.estimator}\nSample Size,${analysisResult.n_observations}\n\n`;

        // Fit Indices
        csv += `MODEL FIT INDICES\n`;
        csv += `Index,Value,Interpretation\n`;
        csv += `Chi-square,${fit.chi2?.toFixed(2) ?? 'N/A'},\n`;
        csv += `df,${fit.DoF ?? 'N/A'},\n`;
        csv += `p-value,${fit.chi2_pvalue?.toFixed(4) ?? 'N/A'},${(fit.chi2_pvalue ?? 0) > 0.05 ? 'Good (>.05)' : 'Significant'}\n`;
        csv += `CFI,${fit.CFI?.toFixed(3) ?? 'N/A'},${(fit.CFI ?? 0) >= 0.95 ? 'Excellent' : (fit.CFI ?? 0) >= 0.90 ? 'Good' : 'Poor'}\n`;
        csv += `TLI,${fit.TLI?.toFixed(3) ?? 'N/A'},${(fit.TLI ?? 0) >= 0.95 ? 'Excellent' : (fit.TLI ?? 0) >= 0.90 ? 'Good' : 'Poor'}\n`;
        csv += `RMSEA,${fit.RMSEA?.toFixed(3) ?? 'N/A'},${(fit.RMSEA ?? 1) <= 0.05 ? 'Excellent' : (fit.RMSEA ?? 1) <= 0.08 ? 'Good' : 'Poor'}\n`;
        csv += `SRMR,${fit.SRMR?.toFixed(3) ?? 'N/A'},${(fit.SRMR ?? 1) <= 0.08 ? 'Good' : 'Poor'}\n`;
        csv += `GFI,${fit.GFI?.toFixed(3) ?? 'N/A'},\n`;
        csv += `AGFI,${fit.AGFI?.toFixed(3) ?? 'N/A'},\n`;
        csv += `NFI,${fit.NFI?.toFixed(3) ?? 'N/A'},\n`;
        csv += `AIC,${fit.AIC?.toFixed(2) ?? 'N/A'},\n`;
        csv += `BIC,${fit.BIC?.toFixed(2) ?? 'N/A'},\n\n`;

        // Measurement Model
        csv += `MEASUREMENT MODEL (Factor Loadings)\n`;
        csv += `Latent,Indicator,Estimate,Std.Estimate,SE,z,p,Significant\n`;
        Object.entries(analysisResult.measurement_model).forEach(([latent, model]) => {
            Object.entries(model.loadings).forEach(([ind, load]) => {
                csv += `${latent},${ind},${formatNumber(load.estimate)},${formatNumber(load.std_estimate)},${formatNumber(load.std_error)},${formatNumber(load.z_value, 2)},${formatPValue(load.p_value)},${load.significant ? 'Yes' : 'No'}\n`;
            });
        });

        // Structural Model
        csv += `\nSTRUCTURAL MODEL (Path Coefficients)\n`;
        csv += `Path,Estimate,Std.Estimate,SE,z,p,Significant\n`;
        analysisResult.structural_model.forEach(p => {
            csv += `${p.path},${formatNumber(p.estimate)},${formatNumber(p.std_estimate)},${formatNumber(p.std_error)},${formatNumber(p.z_value, 2)},${formatPValue(p.p_value)},${p.significant ? 'Yes' : 'No'}\n`;
        });

        // R-squared
        if (Object.keys(analysisResult.r_squared).length > 0) {
            csv += `\nR-SQUARED (Explained Variance)\n`;
            csv += `Variable,R²,Percentage\n`;
            Object.entries(analysisResult.r_squared).forEach(([varName, r2]) => {
                csv += `${varName},${r2?.toFixed(3) ?? 'N/A'},${((r2 ?? 0) * 100).toFixed(1)}%\n`;
            });
        }

        // Effects
        if (analysisResult.effects.total.length > 0) {
            csv += `\nTOTAL EFFECTS (Standardized)\n`;
            csv += `From,To,Direct,Indirect,Total\n`;
            analysisResult.effects.total.forEach(e => {
                csv += `${e.from},${e.to},${formatNumber(e.direct_effect_std)},${formatNumber(e.indirect_effect_std)},${formatNumber(e.total_effect_std)}\n`;
            });
        }

        // Variances
        if (analysisResult.variances_covariances.latent_variances.length > 0) {
            csv += `\nLATENT VARIANCES\n`;
            csv += `Variable,Estimate,SE,z,p\n`;
            analysisResult.variances_covariances.latent_variances.forEach(v => {
                csv += `${v.variable || v.var1},${formatNumber(v.estimate)},${formatNumber(v.std_error)},${formatNumber(v.z_value, 2)},${formatPValue(v.p_value)}\n`;
            });
        }

        // Error Variances
        if (analysisResult.variances_covariances.error_variances.length > 0) {
            csv += `\nERROR VARIANCES\n`;
            csv += `Indicator,Estimate,Std.Estimate,SE,p\n`;
            analysisResult.variances_covariances.error_variances.forEach(v => {
                csv += `${v.indicator || v.var1},${formatNumber(v.estimate)},${formatNumber(v.std_estimate)},${formatNumber(v.std_error)},${formatPValue(v.p_value)}\n`;
            });
        }

        // Interpretation
        csv += `\nINTERPRETATION\n`;
        csv += `Overall Assessment,${analysisResult.interpretation.overall_assessment}\n`;
        csv += `\nKey Insights\n`;
        analysisResult.interpretation.key_insights.forEach(insight => {
            csv += `${insight.title},"${insight.description}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SEM_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    // ============================================
    // Analysis Handler
    // ============================================

    const handleAnalysis = useCallback(async () => {
        if (!modelSpec.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Enter model specification.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/sem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, model_spec: modelSpec, estimator })
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Analysis failed');
            }
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            goToStep(4);
            toast({
                title: 'Analysis Complete',
                description: `CFI = ${result.fit_indices.CFI?.toFixed(3) ?? 'N/A'}, RMSEA = ${result.fit_indices.RMSEA?.toFixed(3) ?? 'N/A'}`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, modelSpec, estimator, toast]);

    const loadExampleModel = () => {
        setModelSpec(EXAMPLE_MODEL);
        toast({ title: 'Example model loaded' });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsImageUploading(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            setUploadedImage(base64);
            
            const response = await fetch(`${FASTAPI_URL}/api/analysis/sem/parse-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64.split(',')[1] })
            });
            
            if (!response.ok) throw new Error('Failed to parse image');
            
            const result = await response.json();
            setModelSpec(result.model_spec);
            toast({ title: 'Model extracted from image', description: 'Please review and adjust if needed' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsImageUploading(false);
        }
    };
    
    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult;

    // ============================================
    // Progress Bar Component
    // ============================================
    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button
                            key={step.id}
                            onClick={() => isClickable && goToStep(step.id as Step)}
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 
                                ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' :
                                    isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' :
                                        'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // ============================================
    // Render
    // ============================================
    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 👇 Guide 컴포넌트 추가 */}
            <SEMGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Structural Equation Modeling</h1>
                    <p className="text-muted-foreground mt-1">Maximum Likelihood estimation with semopy</p>
                </div>
                {/* 👇 버튼 수정 */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                        <HelpCircle className="w-5 h-5" />
                    </Button>
                </div>
            </div>
    
            <ProgressBar />

            <div className="min-h-[500px]">
                {/* Step 1: Model Specification */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Code className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Model Specification</CardTitle>
                                    <CardDescription>Define your SEM model using lavaan-style syntax</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                        <div className="space-y-3">
    <div className="flex justify-between items-center">
        <Label>Model Syntax</Label>
        <div className="flex gap-2">
            {/* 이미지 업로드 버튼 */}
            <label htmlFor="image-upload">
                <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    disabled={isImageUploading}
                >
                    <span>
                        {isImageUploading ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Processing...</>
                        ) : (
                            <><ImageIcon className="w-4 h-4 mr-1" />Upload Image</>
                        )}
                    </span>
                </Button>
            </label>
            <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />
            
                <Button variant="outline" size="sm" onClick={loadExampleModel}>
                    <Lightbulb className="w-4 h-4 mr-1" />Load Example
                </Button>
            </div>
        </div>
        
        {/* 업로드된 이미지 미리보기 */}
        {uploadedImage && (
            <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Uploaded Image:</p>
                <img 
                    src={uploadedImage} 
                    alt="Uploaded model diagram" 
                    className="max-h-40 rounded border"
                />
            </div>
        )}
        
        <Textarea

                                    value={modelSpec}
                                    onChange={(e) => setModelSpec(e.target.value)}
                                    placeholder={`# Measurement Model\nF1 =~ x1 + x2 + x3\nF2 =~ x4 + x5 + x6\n\n# Structural Model\nF2 ~ F1`}
                                    className="font-mono text-sm h-48"
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/50 rounded-xl">
                                    <h4 className="font-medium text-sm mb-2">Available Columns</h4>
                                    <ScrollArea className="h-32">
                                        <div className="flex flex-wrap gap-1">
                                            {allHeaders.map(h => <Badge key={h} variant="outline" className="text-xs">{h}</Badge>)}
                                        </div>
                                    </ScrollArea>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-xl">
                                    <h4 className="font-medium text-sm mb-2">Model Preview</h4>
                                    <div className="space-y-1 text-sm">
                                        <p>Latent Variables: <span className="font-semibold">{parsedModelPreview.latentCount}</span></p>
                                        <p>Structural Paths: <span className="font-semibold">{parsedModelPreview.pathCount}</span></p>
                                        <p>Status: {parsedModelPreview.isValid ?
                                            <span className="text-green-600 font-medium">Valid</span> :
                                            <span className="text-amber-600">Incomplete</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg" disabled={!parsedModelPreview.isValid}>
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Estimation Settings</CardTitle>
                                    <CardDescription>Configure SEM estimation parameters</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3 max-w-xs">
                                <Label>Estimator</Label>
                                <Select value={estimator} onValueChange={setEstimator}>
                                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MLW">Maximum Likelihood - Wishart (MLW)</SelectItem>
                                        <SelectItem value="ML">Maximum Likelihood (ML)</SelectItem>
                                        <SelectItem value="GLS">Generalized Least Squares (GLS)</SelectItem>
                                        <SelectItem value="DWLS">Diagonally Weighted LS (DWLS)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Estimator:</strong> {estimator}</p>
                                    <p>• <strong className="text-foreground">Sample size:</strong> n = {data.length}</p>
                                    <p>• <strong className="text-foreground">Variables:</strong> {allHeaders.length} columns</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />Estimator Guide
                                </h4>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p><strong>MLW</strong> (default): Wishart-based ML, good for continuous normal data</p>
                                    <p><strong>ML</strong>: Standard maximum likelihood estimation</p>
                                    <p><strong>GLS</strong>: More robust to non-normality</p>
                                    <p><strong>DWLS</strong>: Best for ordinal/categorical indicators</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Pre-Analysis Validation</CardTitle>
                                    <CardDescription>Checking requirements before running SEM</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {validationChecks.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-amber-50/50 dark:bg-amber-950/20'}`}>
                                        {check.passed ?
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> :
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>
                                                {check.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-600" />Analysis Info
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    SEM will be estimated using <strong>{estimator}</strong> with semopy package.
                                    Results include standardized and unstandardized estimates, fit indices, and effect decomposition.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running SEM...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (() => {
                    const fit = results.fit_indices;
                    const cfi = fit.CFI ?? 0;
                    const tli = fit.TLI ?? 0;
                    const rmsea = fit.RMSEA ?? 1;
                    const srmr = fit.SRMR ?? 1;
                    const isGoodFit = cfi >= 0.90 && rmsea <= 0.08;
                    const isExcellentFit = cfi >= 0.95 && rmsea <= 0.05;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Analysis Summary</CardTitle>
                                        <CardDescription>
                                            SEM with {results.interpretation.n_latent_vars} latent variable(s), n = {results.n_observations}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isGoodFit ? 'text-primary' : 'text-amber-600'}`} />Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        {results.interpretation.key_insights.slice(0, 4).map((insight, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <span className={`font-bold ${isGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                                <p className="text-sm"><strong>{insight.title}:</strong> {insight.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Model Fit Status */}
                                <div className={`rounded-xl p-5 border ${isExcellentFit ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300' : isGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGoodFit ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">
                                                {isExcellentFit ? "Excellent Model Fit!" : isGoodFit ? "Good Model Fit" : "Model Fit Needs Improvement"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {results.interpretation.overall_assessment}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Fit Index Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className={cfi >= 0.95 ? 'border-green-300 bg-green-50/50' : cfi >= 0.90 ? 'border-blue-200' : 'border-amber-200'}>
                                        <CardContent className="p-4 text-center">
                                            <p className="text-xs text-muted-foreground">CFI</p>
                                            <p className={`text-xl font-bold ${cfi >= 0.95 ? 'text-green-600' : cfi >= 0.90 ? 'text-blue-600' : 'text-amber-600'}`}>
                                                {formatNumber(fit.CFI)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{cfi >= 0.95 ? 'Excellent' : cfi >= 0.90 ? 'Good' : 'Poor'}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className={rmsea <= 0.05 ? 'border-green-300 bg-green-50/50' : rmsea <= 0.08 ? 'border-blue-200' : 'border-amber-200'}>
                                        <CardContent className="p-4 text-center">
                                            <p className="text-xs text-muted-foreground">RMSEA</p>
                                            <p className={`text-xl font-bold ${rmsea <= 0.05 ? 'text-green-600' : rmsea <= 0.08 ? 'text-blue-600' : 'text-amber-600'}`}>
                                                {formatNumber(fit.RMSEA)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{rmsea <= 0.05 ? 'Excellent' : rmsea <= 0.08 ? 'Good' : 'Poor'}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className={tli >= 0.95 ? 'border-green-300 bg-green-50/50' : tli >= 0.90 ? 'border-blue-200' : ''}>
                                        <CardContent className="p-4 text-center">
                                            <p className="text-xs text-muted-foreground">TLI</p>
                                            <p className={`text-xl font-bold ${tli >= 0.95 ? 'text-green-600' : tli >= 0.90 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                                {formatNumber(fit.TLI)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{tli >= 0.95 ? 'Excellent' : tli >= 0.90 ? 'Good' : 'Poor'}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className={srmr <= 0.08 ? 'border-green-300 bg-green-50/50' : ''}>
                                        <CardContent className="p-4 text-center">
                                            <p className="text-xs text-muted-foreground">SRMR</p>
                                            <p className={`text-xl font-bold ${srmr <= 0.08 ? 'text-green-600' : 'text-amber-600'}`}>
                                                {formatNumber(fit.SRMR)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{srmr <= 0.08 ? 'Good' : 'Poor'}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* R-squared */}
                                {results.r_squared && Object.keys(results.r_squared).length > 0 && (
                                    <div className="p-4 bg-muted/30 rounded-xl">
                                        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />Explained Variance (R²)
                                        </h4>
                                        <div className="flex flex-wrap gap-3">
                                            {Object.entries(results.r_squared).map(([varName, r2]) => (
                                                <div key={varName} className="px-4 py-3 bg-background rounded-lg border">
                                                    <p className="text-xs text-muted-foreground">{varName}</p>
                                                    <p className="text-xl font-bold text-primary">{((r2 ?? 0) * 100).toFixed(1)}%</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Understanding the Results</CardTitle>
                                    <CardDescription>How to interpret SEM output</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Measurement Model (Factor Loadings)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Factor loadings show how well each indicator reflects its latent variable. 
                                            <strong> Standardized loadings ≥ 0.7</strong> are excellent, <strong>≥ 0.5</strong> are acceptable. 
                                            All loadings should be significant (p &lt; .05).
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Structural Model (Path Coefficients)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Path coefficients (β) show the strength and direction of relationships between latent variables.
                                            <strong> Significant paths</strong> (p &lt; .05) support your hypotheses.
                                            Standardized coefficients allow comparison across paths.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Model Fit Indices</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Fit indices assess how well the model reproduces the observed data.
                                            Use multiple indices: <strong>CFI/TLI ≥ .95</strong> (excellent), <strong>≥ .90</strong> (acceptable);
                                            <strong> RMSEA ≤ .05</strong> (excellent), <strong>≤ .08</strong> (acceptable);
                                            <strong> SRMR ≤ .08</strong> (good).
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Direct, Indirect & Total Effects</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <strong>Direct effect</strong>: A → B directly. 
                                            <strong> Indirect effect</strong>: A → M → B (mediation). 
                                            <strong> Total effect</strong> = Direct + Indirect.
                                            Indirect effects reveal mediation pathways in your model.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-5 border border-blue-200">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-blue-600" />Quick Reference: Fit Index Cutoffs
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div className="text-center p-3 bg-background rounded-lg border border-green-200">
                                        <p className="font-semibold text-green-600">CFI ≥ .95</p>
                                        <p className="text-muted-foreground">Excellent</p>
                                    </div>
                                    <div className="text-center p-3 bg-background rounded-lg border border-green-200">
                                        <p className="font-semibold text-green-600">RMSEA ≤ .05</p>
                                        <p className="text-muted-foreground">Excellent</p>
                                    </div>
                                    <div className="text-center p-3 bg-background rounded-lg border border-blue-200">
                                        <p className="font-semibold text-blue-600">TLI ≥ .90</p>
                                        <p className="text-muted-foreground">Acceptable</p>
                                    </div>
                                    <div className="text-center p-3 bg-background rounded-lg border border-blue-200">
                                        <p className="font-semibold text-blue-600">SRMR ≤ .08</p>
                                        <p className="text-muted-foreground">Good</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Complete Statistical Report</h2>
                                <p className="text-sm text-muted-foreground">
                                    {results.estimator} estimation | n = {results.n_observations}
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Report</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            {/* Report Header */}
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">SEM Analysis Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Generated: {new Date().toLocaleDateString()} | Estimator: {results.estimator} | n = {results.n_observations}
                                </p>
                            </div>

                            {/* Visualizations */}
                            <Card>
                                <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                                <CardContent>
                                    <Tabs defaultValue="path" className="w-full">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="path">Path Diagram</TabsTrigger>
                                            <TabsTrigger value="loadings">Factor Loadings</TabsTrigger>
                                            <TabsTrigger value="corr">Correlations</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="path" className="mt-4">
                                            {results.path_diagram ?
                                                <Image src={`data:image/png;base64,${results.path_diagram}`} alt="Path Diagram" width={800} height={600} className="w-full rounded-md border" /> :
                                                <p className="text-center text-muted-foreground py-8">No path diagram available</p>}
                                        </TabsContent>
                                        <TabsContent value="loadings" className="mt-4">
                                            {results.loading_heatmap ?
                                                <Image src={`data:image/png;base64,${results.loading_heatmap}`} alt="Loading Heatmap" width={800} height={500} className="w-full rounded-md border" /> :
                                                <p className="text-center text-muted-foreground py-8">No loading heatmap available</p>}
                                        </TabsContent>
                                        <TabsContent value="corr" className="mt-4">
                                            {results.correlation_matrix ?
                                                <Image src={`data:image/png;base64,${results.correlation_matrix}`} alt="Correlation Matrix" width={800} height={500} className="w-full rounded-md border" /> :
                                                <p className="text-center text-muted-foreground py-8">No correlation matrix available</p>}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>

                            {/* Fit Indices */}
                            <Card>
                                <CardHeader><CardTitle>Model Fit Indices</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                                        {[
                                            { label: 'χ²', value: formatNumber(results.fit_indices.chi2, 2), sub: `df = ${results.fit_indices.DoF ?? '-'}` },
                                            { label: 'p-value', value: formatPValue(results.fit_indices.chi2_pvalue), sub: (results.fit_indices.chi2_pvalue ?? 0) > 0.05 ? 'Good' : '' },
                                            { label: 'CFI', value: formatNumber(results.fit_indices.CFI), sub: (results.fit_indices.CFI ?? 0) >= 0.95 ? 'Excellent' : (results.fit_indices.CFI ?? 0) >= 0.90 ? 'Good' : 'Poor' },
                                            { label: 'TLI', value: formatNumber(results.fit_indices.TLI), sub: (results.fit_indices.TLI ?? 0) >= 0.95 ? 'Excellent' : (results.fit_indices.TLI ?? 0) >= 0.90 ? 'Good' : 'Poor' },
                                            { label: 'RMSEA', value: formatNumber(results.fit_indices.RMSEA), sub: (results.fit_indices.RMSEA ?? 1) <= 0.05 ? 'Excellent' : (results.fit_indices.RMSEA ?? 1) <= 0.08 ? 'Good' : 'Poor' },
                                            { label: 'SRMR', value: formatNumber(results.fit_indices.SRMR), sub: (results.fit_indices.SRMR ?? 1) <= 0.08 ? 'Good' : 'Poor' }
                                        ].map((item, i) => (
                                            <div key={i} className="p-3 bg-muted/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                                <p className="text-lg font-semibold">{item.value}</p>
                                                <p className="text-xs text-muted-foreground">{item.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center mt-4">
                                        {[
                                            { label: 'GFI', value: formatNumber(results.fit_indices.GFI) },
                                            { label: 'AGFI', value: formatNumber(results.fit_indices.AGFI) },
                                            { label: 'NFI', value: formatNumber(results.fit_indices.NFI) },
                                            { label: 'AIC', value: formatNumber(results.fit_indices.AIC, 2) },
                                            { label: 'BIC', value: formatNumber(results.fit_indices.BIC, 2) }
                                        ].map((item, i) => (
                                            <div key={i} className="p-3 bg-muted/30 rounded-lg">
                                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                                <p className="text-base font-semibold">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Measurement Model */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Measurement Model (Factor Loadings)</CardTitle>
                                    <CardDescription>Relationship between latent variables and their indicators</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[350px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Latent</TableHead>
                                                    <TableHead>Indicator</TableHead>
                                                    <TableHead className="text-right">Estimate</TableHead>
                                                    <TableHead className="text-right">Std.Est (β)</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                    <TableHead className="text-right">z</TableHead>
                                                    <TableHead className="text-right">p</TableHead>
                                                    <TableHead className="text-center">Sig.</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(results.measurement_model).map(([latent, model]) =>
                                                    Object.entries(model.loadings).map(([ind, load], i) => (
                                                        <TableRow key={`${latent}-${ind}`} className={load.significant ? 'bg-green-50/50 dark:bg-green-950/20' : ''}>
                                                            <TableCell className="font-medium">{i === 0 ? latent : ''}</TableCell>
                                                            <TableCell>{ind}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm">{formatNumber(load.estimate)}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm">
                                                                <span className={
                                                                    (load.std_estimate ?? 0) >= 0.7 ? 'text-green-600 font-semibold' :
                                                                        (load.std_estimate ?? 0) >= 0.5 ? 'text-blue-600' : 'text-amber-600'
                                                                }>
                                                                    {formatNumber(load.std_estimate)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-sm">{formatNumber(load.std_error)}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm">{formatNumber(load.z_value, 2)}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm">
                                                                <span className={load.significant ? 'text-green-600 font-semibold' : ''}>
                                                                    {formatPValue(load.p_value)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {load.significant ?
                                                                    <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge> :
                                                                    <Badge variant="outline" className="text-xs">No</Badge>}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Structural Model */}
                            {results.structural_model.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Structural Model (Path Coefficients)</CardTitle>
                                        <CardDescription>Relationships between latent variables</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Path</TableHead>
                                                    <TableHead className="text-right">Estimate</TableHead>
                                                    <TableHead className="text-right">Std.Est (β)</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                    <TableHead className="text-right">z</TableHead>
                                                    <TableHead className="text-right">p</TableHead>
                                                    <TableHead className="text-center">Sig.</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.structural_model.map((p, i) => (
                                                    <TableRow key={i} className={p.significant ? 'bg-green-50/50 dark:bg-green-950/20' : ''}>
                                                        <TableCell className="font-medium">{p.path}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatNumber(p.estimate)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm font-semibold">{formatNumber(p.std_estimate)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatNumber(p.std_error)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatNumber(p.z_value, 2)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">
                                                            <span className={p.significant ? 'text-green-600 font-semibold' : ''}>
                                                                {formatPValue(p.p_value)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {p.significant ?
                                                                <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge> :
                                                                <Badge variant="outline" className="text-xs">No</Badge>}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* R-squared */}
                            {results.r_squared && Object.keys(results.r_squared).length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>R² (Explained Variance)</CardTitle>
                                        <CardDescription>Proportion of variance explained by predictors</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {Object.entries(results.r_squared).map(([varName, r2]) => (
                                                <div key={varName} className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg text-center border">
                                                    <p className="text-sm text-muted-foreground font-medium">{varName}</p>
                                                    <p className="text-3xl font-bold text-primary">{((r2 ?? 0) * 100).toFixed(1)}%</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(r2 ?? 0) >= 0.50 ? 'Substantial' : (r2 ?? 0) >= 0.25 ? 'Moderate' : 'Weak'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Effects */}
                            {results.effects && results.effects.total && results.effects.total.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Direct, Indirect & Total Effects</CardTitle>
                                        <CardDescription>Effect decomposition (standardized)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Indirect Effects (Mediation) */}
                                        {results.effects.indirect && results.effects.indirect.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                                    <ArrowRight className="w-4 h-4 text-primary" />Indirect Effects (Mediation Pathways)
                                                </h4>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Mediation Path</TableHead>
                                                            <TableHead className="text-right">Estimate</TableHead>
                                                            <TableHead className="text-right">Std.Estimate</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.effects.indirect.map((e, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-mono text-sm">{e.path}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatNumber(e.estimate)}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm font-semibold">{formatNumber(e.std_estimate)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}

                                        {/* Total Effects Summary */}
                                        <div>
                                            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-primary" />Total Effects Summary
                                            </h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>From → To</TableHead>
                                                        <TableHead className="text-right">Direct (β)</TableHead>
                                                        <TableHead className="text-right">Indirect (β)</TableHead>
                                                        <TableHead className="text-right">Total (β)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {results.effects.total.map((e, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium">{e.from} → {e.to}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm">{formatNumber(e.direct_effect_std)}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm">{formatNumber(e.indirect_effect_std)}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm font-bold text-primary">{formatNumber(e.total_effect_std)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Variances & Covariances */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Variances & Covariances</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Tabs defaultValue="latent_var" className="w-full">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="latent_var">Latent Variances</TabsTrigger>
                                            <TabsTrigger value="latent_cov">Latent Covariances</TabsTrigger>
                                            <TabsTrigger value="error_var">Error Variances</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="latent_var" className="mt-4">
                                            {results.variances_covariances?.latent_variances?.length > 0 ? (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Variable</TableHead>
                                                            <TableHead className="text-right">Estimate</TableHead>
                                                            <TableHead className="text-right">SE</TableHead>
                                                            <TableHead className="text-right">z</TableHead>
                                                            <TableHead className="text-right">p</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.variances_covariances.latent_variances.map((v, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium">{v.variable || v.var1}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatNumber(v.estimate)}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatNumber(v.std_error)}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatNumber(v.z_value, 2)}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatPValue(v.p_value)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            ) : <p className="text-center text-muted-foreground py-6">No latent variances</p>}
                                        </TabsContent>

                                        <TabsContent value="latent_cov" className="mt-4">
                                            {results.variances_covariances?.latent_covariances?.length > 0 ? (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Var1</TableHead>
                                                            <TableHead>Var2</TableHead>
                                                            <TableHead className="text-right">Estimate</TableHead>
                                                            <TableHead className="text-right">Std.Est</TableHead>
                                                            <TableHead className="text-right">SE</TableHead>
                                                            <TableHead className="text-right">p</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.variances_covariances.latent_covariances.map((v, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium">{v.var1}</TableCell>
                                                                <TableCell className="font-medium">{v.var2}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatNumber(v.estimate)}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatNumber(v.std_estimate)}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatNumber(v.std_error)}</TableCell>
                                                                <TableCell className="text-right font-mono text-sm">{formatPValue(v.p_value)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            ) : <p className="text-center text-muted-foreground py-6">No latent covariances specified</p>}
                                        </TabsContent>

                                        <TabsContent value="error_var" className="mt-4">
                                            {results.variances_covariances?.error_variances?.length > 0 ? (
                                                <ScrollArea className="h-[280px]">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Indicator</TableHead>
                                                                <TableHead className="text-right">Estimate</TableHead>
                                                                <TableHead className="text-right">Std.Est</TableHead>
                                                                <TableHead className="text-right">SE</TableHead>
                                                                <TableHead className="text-right">p</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {results.variances_covariances.error_variances.map((v, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-medium">{v.indicator || v.var1}</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm">{formatNumber(v.estimate)}</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm">{formatNumber(v.std_estimate)}</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm">{formatNumber(v.std_error)}</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm">{formatPValue(v.p_value)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            ) : <p className="text-center text-muted-foreground py-6">No error variances</p>}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>

                            {/* Interpretation Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />Interpretation Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {results.interpretation.key_insights.map((insight, i) => (
                                            <div key={i} className="p-3 bg-muted/30 rounded-lg">
                                                <p className="font-medium text-sm">{insight.title}</p>
                                                <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                        <p className="font-semibold">Overall Assessment</p>
                                        <p className="text-sm text-muted-foreground mt-1">{results.interpretation.overall_assessment}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-4 flex justify-start">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                        </div>
                    </>
                )}

                {/* Loading State */}
                {isLoading && (
                    <Card>
                        <CardContent className="p-8 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            <div className="text-center">
                                <p className="font-medium">Running SEM Analysis...</p>
                                <p className="text-sm text-muted-foreground mt-1">Estimating model with semopy (Maximum Likelihood)</p>
                            </div>
                            <Skeleton className="h-[400px] w-full mt-4" />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

